"""Pipeline offline de indicadores Sentinel-2 L2A para sitios de residuos en Jujuy.

Lee solo ventanas chicas de los COG de Earth Search (requests HTTP por rango),
enmascara con SCL, calcula NDVI/BSI/NBR/dNBR y escribe src/shared/sentinelZones.json
y miniaturas PNG en public/sentinel/. Ver scripts/sentinel/README.md.
"""
from __future__ import annotations

import argparse
import json
import math
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image, ImageDraw
from pystac_client import Client
from rasterio.enums import Resampling
from rasterio.features import rasterize
from rasterio.transform import from_origin
from rasterio.warp import transform_geom
from rasterio.windows import from_bounds
from shapely.geometry import mapping, shape

ROOT = Path(__file__).resolve().parents[2]
AOI_PATH = ROOT / "data/sentinel/aoi.geojson"
CACHE_DIR = ROOT / "data/sentinel/cache"
OUT_JSON = ROOT / "src/shared/sentinelZones.json"
THUMB_DIR = ROOT / "public/sentinel"

STAC_URL = "https://earth-search.aws.element84.com/v1"
COLLECTION = "sentinel-2-c1-l2a"
START = "2018-01-01"
MAX_SCENE_CLOUD = 40  # eo:cloud_cover (%) de toda la escena, filtro previo barato
MAX_MASKED_FRACTION = 0.20  # descartar escena si >20 % del AOI (predio + anillo) queda enmascarado
SCL_VALID = {4, 5, 6}  # vegetación, suelo/no vegetado, agua
RING_M = 500
RING_GAP_M = 20  # separación entre predio y anillo para no mezclar píxeles de borde
PIXEL_M = 10
PIXEL_HA = PIXEL_M * PIXEL_M / 10_000

# Umbrales calibrados mirando las escenas (ver README): píxel perturbado si BSI > T_BSI y NDVI < T_NDVI.
T_BSI = 0.10
T_NDVI = 0.25
# Solo se comparan escenas de la temporada húmeda (dic-abr): en invierno seco el pasto y los campos
# arados también dan BSI alto y NDVI bajo, y taparían la señal del predio.
SEASON_MONTHS = {12, 1, 2, 3, 4}
# Quema posible entre escenas mensuales consecutivas (<= MAX_BURN_GAP_DAYS), en predio + anillo:
# dNBR por encima de la mediana del AOI (descuenta fenología y cosechas) > T_DNBR,
# NBR posterior < BURN_MAX_POST_NBR y NIR posterior < BURN_MAX_POST_NIR (superficie oscura, carbonizada),
# en al menos MIN_BURN_HA.
T_DNBR = 0.27
BURN_MAX_POST_NBR = 0.0
BURN_MAX_POST_NIR = 0.15
MIN_BURN_HA = 1.0
MAX_BURN_GAP_DAYS = 45

BANDS_10 = ["blue", "green", "red", "nir"]
BANDS_20 = ["swir16", "swir22", "scl"]
THUMB_MAX_PX = 400

os.environ.setdefault("AWS_NO_SIGN_REQUEST", "YES")
GDAL_ENV = dict(
    GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
    CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
    GDAL_HTTP_MULTIRANGE="YES",
    GDAL_HTTP_MERGE_CONSECUTIVE_RANGES="YES",
    GDAL_HTTP_MAX_RETRY="4",
    GDAL_HTTP_RETRY_DELAY="2",
)


def load_sites() -> tuple[list[dict], list[dict]]:
    fc = json.loads(AOI_PATH.read_text(encoding="utf-8"))
    active = [f for f in fc["features"] if f["properties"]["status"] == "activo"]
    discarded = [f for f in fc["features"] if f["properties"]["status"] != "activo"]
    return active, discarded


def site_grid(feature: dict, crs: str) -> dict:
    poly = shape(transform_geom("EPSG:4326", crs, feature["geometry"]))
    outer = poly.buffer(RING_M)
    ring = outer.difference(poly.buffer(RING_GAP_M))
    minx, miny, maxx, maxy = outer.bounds
    snap = 2 * PIXEL_M  # alineado a la grilla de 20 m (y por lo tanto a la de 10 m)
    minx, miny = math.floor(minx / snap) * snap - snap, math.floor(miny / snap) * snap - snap
    maxx, maxy = math.ceil(maxx / snap) * snap + snap, math.ceil(maxy / snap) * snap + snap
    width, height = int((maxx - minx) / PIXEL_M), int((maxy - miny) / PIXEL_M)
    transform = from_origin(minx, maxy, PIXEL_M, PIXEL_M)
    shape_hw = (height, width)
    burn = lambda g: rasterize([(mapping(g), 1)], out_shape=shape_hw, transform=transform, dtype="uint8").astype(bool)
    return dict(crs=crs, bounds=(minx, miny, maxx, maxy), transform=transform, shape=shape_hw,
                poly=poly, outer=outer, in_poly=burn(poly), in_ring=burn(ring))


def search_items(feature: dict) -> list:
    props = feature["properties"]
    centroid = shape(feature["geometry"]).centroid
    client = Client.open(STAC_URL)
    search = client.search(
        collections=[COLLECTION],
        intersects={"type": "Point", "coordinates": [centroid.x, centroid.y]},
        datetime=f"{START}/{date.today().isoformat()}",
        query={"eo:cloud_cover": {"lt": MAX_SCENE_CLOUD}, "grid:code": {"eq": props["mgrsTile"]}},
    )
    items = list(search.items())
    items.sort(key=lambda i: i.datetime)
    return items


def band_scale_offset(item, band: str) -> tuple[float, float]:
    rb = item.assets[band].extra_fields.get("raster:bands", [{}])[0]
    return float(rb.get("scale", 1.0)), float(rb.get("offset", 0.0))


def read_band(item, band: str, grid: dict) -> np.ndarray:
    with rasterio.Env(**GDAL_ENV), rasterio.open(item.assets[band].href) as src:
        if str(src.crs) != grid["crs"]:
            raise ValueError(f"{item.id}: CRS {src.crs} != {grid['crs']}")
        win = from_bounds(*grid["bounds"], transform=src.transform)
        return src.read(1, window=win, out_shape=grid["shape"], boundless=True, fill_value=0,
                        resampling=Resampling.nearest)


def load_scene(item, grid: dict, site_id: str) -> dict | None:
    """Devuelve reflectancias + máscara válida, o None si el AOI está >20 % enmascarado."""
    cache = CACHE_DIR / site_id / f"{item.id}.npz"
    if cache.exists():
        data = dict(np.load(cache))
        if "rejected" in data:
            return None
    else:
        scl = read_band(item, "scl", grid)
        aoi = grid["in_poly"] | grid["in_ring"]
        masked = 1 - np.isin(scl[aoi], list(SCL_VALID)).mean()
        cache.parent.mkdir(parents=True, exist_ok=True)
        if masked > MAX_MASKED_FRACTION:
            np.savez_compressed(cache, rejected=np.array(masked))
            return None
        bands = [b for b in BANDS_10 + BANDS_20 if b != "scl"]
        with ThreadPoolExecutor(max_workers=len(bands)) as pool:
            arrays = dict(zip(bands, pool.map(lambda b: read_band(item, b, grid), bands)))
        data = dict(scl=scl, **arrays)
        np.savez_compressed(cache, **data)
    valid = np.isin(data["scl"], list(SCL_VALID))
    refl = {}
    for b in BANDS_10 + BANDS_20:
        if b == "scl":
            continue
        scale, offset = band_scale_offset(item, b)
        dn = data[b].astype("float32")
        valid &= dn > 0
        refl[b] = dn * scale + offset
    return dict(item=item, refl=refl, valid=valid)


def nd(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    with np.errstate(divide="ignore", invalid="ignore"):
        return np.where((a + b) != 0, (a - b) / (a + b), np.nan)


def indices(refl: dict) -> dict:
    r, g, b, n, s1, s2 = (refl[k] for k in ["red", "green", "blue", "nir", "swir16", "swir22"])
    return dict(ndvi=nd(n, r), bsi=nd(s1 + r, n + b), nbr=nd(n, s2))


def month_key(item) -> str:
    return item.datetime.strftime("%Y-%m")


def best_per_month(items: list, grid: dict, site_id: str) -> list[dict]:
    by_month: dict[str, list] = {}
    for it in items:
        by_month.setdefault(month_key(it), []).append(it)
    scenes = []
    for month in sorted(by_month):
        for it in sorted(by_month[month], key=lambda i: i.properties["eo:cloud_cover"]):
            scene = load_scene(it, grid, site_id)
            if scene is not None:
                scenes.append(scene)
                break
        print(f"  {site_id} {month}: {'ok ' + scenes[-1]['item'].id if scenes and month_key(scenes[-1]['item']) == month else 'sin escena válida'}")
    return scenes


def r2(x: float) -> float:
    return round(float(x), 2)


def r3(x: float) -> float:
    return round(float(x), 3)


def summarize(scene: dict, grid: dict) -> dict:
    idx = indices(scene["refl"])
    valid = scene["valid"]
    disturbed = (idx["bsi"] > T_BSI) & (idx["ndvi"] < T_NDVI) & valid
    p, ring = grid["in_poly"] & valid, grid["in_ring"] & valid
    scene.update(idx=idx, disturbed=disturbed)
    return dict(
        date=scene["item"].datetime.date().isoformat(),
        value=r2(disturbed[grid["in_poly"]].sum() * PIXEL_HA),
        ndvi=r3(np.nanmean(idx["ndvi"][p])),
        bsi=r3(np.nanmean(idx["bsi"][p])),
        ringNdvi=r3(np.nanmean(idx["ndvi"][ring])),
        ringValue=r2(disturbed[grid["in_ring"]].sum() * PIXEL_HA),
    )


def burn_events(scenes: list[dict], grid: dict) -> list[dict]:
    events = []
    aoi = grid["in_poly"] | grid["in_ring"]
    for prev, cur in zip(scenes, scenes[1:]):
        gap = (cur["item"].datetime - prev["item"].datetime).days
        if gap > MAX_BURN_GAP_DAYS:
            continue
        both = prev["valid"] & cur["valid"] & aoi
        dnbr = prev["idx"]["nbr"] - cur["idx"]["nbr"]
        rel = dnbr - np.nanmedian(dnbr[both])
        burned = (both & (rel > T_DNBR) & (cur["idx"]["nbr"] < BURN_MAX_POST_NBR)
                  & (cur["refl"]["nir"] < BURN_MAX_POST_NIR))
        ha = burned.sum() * PIXEL_HA
        if ha >= MIN_BURN_HA:
            events.append(dict(date=cur["item"].datetime.date().isoformat(),
                               previousDate=prev["item"].datetime.date().isoformat(),
                               dnbr=r3(np.nanmean(rel[burned])), ha=r2(ha),
                               polygonHa=r2((burned & grid["in_poly"]).sum() * PIXEL_HA)))
    return events


def rgb_image(scene: dict, grid: dict, overlay_mask: np.ndarray | None = None) -> Image.Image:
    refl = scene["refl"]
    rgb = np.dstack([refl["red"], refl["green"], refl["blue"]])
    rgb = np.clip(rgb / 0.30, 0, 1) ** (1 / 1.6)  # estiramiento fijo para comparar fechas
    rgb = (rgb * 255).astype("uint8")
    if overlay_mask is not None:
        rgb[overlay_mask] = (0.45 * rgb[overlay_mask] + 0.55 * np.array([236, 72, 153])).astype("uint8")
    h, w = grid["shape"]
    k = THUMB_MAX_PX / max(h, w)
    img = Image.fromarray(rgb).resize((round(w * k), round(h * k)), Image.NEAREST)
    draw = ImageDraw.Draw(img)
    minx, _, _, maxy = grid["bounds"]
    to_px = lambda xy: ((xy[0] - minx) / PIXEL_M * k, (maxy - xy[1]) / PIXEL_M * k)
    draw.line([to_px(c) for c in grid["poly"].exterior.coords], fill=(250, 204, 21), width=2)
    draw.line([to_px(c) for c in grid["outer"].exterior.coords], fill=(56, 189, 248), width=1)
    return img


def save_thumb(img: Image.Image, name: str) -> str:
    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    path = THUMB_DIR / name
    img.quantize(colors=128, method=Image.Quantize.MEDIANCUT).save(path, optimize=True)
    size = path.stat().st_size
    assert size < 150_000, f"{name} pesa {size} bytes"
    return f"sentinel/{name}"


def masked_pct(scene: dict, grid: dict) -> int:
    aoi = grid["in_poly"] | grid["in_ring"]
    return round(100 * (1 - scene["valid"][aoi].mean()))


def pick_reference(season_scenes: list[dict], grid: dict, year: int) -> dict:
    """Escena 'antes': la de temporada húmeda del año de referencia con menos área enmascarada."""
    candidates = [s for s in season_scenes if s["item"].datetime.year == year]
    if not candidates:
        raise RuntimeError(f"Sin escenas válidas en {year}")
    return min(candidates, key=lambda s: (masked_pct(s, grid), s["item"].datetime))


def process_site(feature: dict) -> dict:
    props = feature["properties"]
    print(f"== {props['id']}")
    items = search_items(feature)
    print(f"  {len(items)} escenas con eo:cloud_cover < {MAX_SCENE_CLOUD} en {props['mgrsTile']}")
    with rasterio.Env(**GDAL_ENV), rasterio.open(items[-1].assets["scl"].href) as src:
        crs = str(src.crs)
    grid = site_grid(feature, crs)
    scenes = best_per_month(items, grid, props["id"])
    all_series = [summarize(s, grid) for s in scenes]
    season = [i for i, s in enumerate(scenes) if s["item"].datetime.month in SEASON_MONTHS]
    series = [all_series[i] for i in season]
    season_scenes = [scenes[i] for i in season]
    current = season_scenes[-1]
    reference = pick_reference(season_scenes, grid, props["referenceYear"])
    cur_s, ref_s = all_series[scenes.index(current)], all_series[scenes.index(reference)]
    sid = props["id"].removeprefix("s2-")
    thumbs = dict(
        before=save_thumb(rgb_image(reference, grid), f"{sid}-antes.png"),
        after=save_thumb(rgb_image(current, grid), f"{sid}-ahora.png"),
        afterDisturbed=save_thumb(rgb_image(current, grid, current["disturbed"] & (grid["in_poly"] | grid["in_ring"])),
                                  f"{sid}-ahora-perturbado.png"),
    )
    centroid = shape(feature["geometry"]).centroid
    outer_ll = shape(transform_geom(crs, "EPSG:4326", mapping(grid["outer"])))
    zone = dict(
        id=props["id"],
        name=props["name"],
        location=dict(lat=round(centroid.y, 5), lng=round(centroid.x, 5)),
        polygon=[[round(y, 5), round(x, 5)] for x, y in feature["geometry"]["coordinates"][0]],
        ring=[[round(y, 5), round(x, 5)] for x, y in outer_ll.simplify(0.0002).exterior.coords],
        indicator="Superficie perturbada estimada",
        unit="ha",
        previousValue=ref_s["value"],
        currentValue=cur_s["value"],
        previousDate=reference["item"].datetime.strftime("%Y-%m-%dT%H:%M:%SZ"),
        observedAt=current["item"].datetime.strftime("%Y-%m-%dT%H:%M:%SZ"),
        polygonHa=r2(grid["poly"].area / 10_000),
        series=series,
        burnEvents=burn_events(scenes, grid),
        thumbnails=thumbs,
        scenes=dict(previous=reference["item"].id, current=current["item"].id),
        source="Sentinel-2 L2A, Copernicus/ESA vía Earth Search",
        method=(f"Píxeles de 10 m con BSI > {T_BSI} y NDVI < {T_NDVI} dentro del polígono, "
                f"en la mejor escena de cada mes de temporada húmeda (dic-abr) con ≤ {MAX_MASKED_FRACTION:.0%} "
                f"del área enmascarada por SCL. Posible quema si el dNBR supera en {T_DNBR} a la mediana del área, "
                f"con NBR < {BURN_MAX_POST_NBR} y NIR < {BURN_MAX_POST_NIR} después, en ≥ {MIN_BURN_HA} ha."),
        confidence=props["confidence"],
        locationSource=props["locationSource"],
        simulated=False,
    )
    if "closureDate" in props:
        zone["closureDate"] = props["closureDate"]
    return zone


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    sites, discarded = load_sites()
    zones = [process_site(f) for f in sites]
    OUT_JSON.write_text(json.dumps(zones, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    size = OUT_JSON.stat().st_size
    assert size <= 50_000, f"sentinelZones.json pesa {size} bytes"
    print(f"Escrito {OUT_JSON.relative_to(ROOT)} ({size} bytes, {len(zones)} sitios)")
    for f in discarded:
        print(f"Descartado: {f['properties']['name']} — {f['properties']['notes']}")


if __name__ == "__main__":
    main()
