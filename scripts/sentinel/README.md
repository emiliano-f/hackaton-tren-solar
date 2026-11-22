# Pipeline Sentinel-2: indicadores satelitales de sitios de residuos

> **Limitación central.** Sentinel-2 (10 m) no detecta residuos directamente. Medimos señales indirectas:
> superficie de suelo desnudo/removido, pérdida de vegetación alrededor y quemas. Los resultados son un
> **indicador satelital estimado**, no una detección de basura.

El pipeline corre **offline** y sus salidas se commitean. La app no consulta ninguna API satelital en runtime.

## Cómo ejecutarlo

```bash
python3.11 -m venv .venv-sentinel
.venv-sentinel/bin/pip install -r scripts/sentinel/requirements.txt
.venv-sentinel/bin/python scripts/sentinel/run.py
```

Probado con Python 3.11. La primera corrida baja solo ventanas chicas de cada banda (unos 2 minutos con buena
conexión) y las guarda en `data/sentinel/cache/` (ignorado por git); las siguientes corridas usan la caché.

Entradas y salidas:

| Archivo | Qué es |
| --- | --- |
| `data/sentinel/aoi.geojson` | Polígonos de los sitios, fuente de la ubicación, nivel de confianza y sitios descartados |
| `src/shared/sentinelZones.json` | Indicadores por sitio que consume la app (el script falla si pesa más de 50 KB) |
| `public/sentinel/*.png` | Miniaturas antes/ahora y máscara de superficie perturbada (≤ 400 px, < 150 KB) |

## Fuente de datos

- STAC: [Earth Search](https://earth-search.aws.element84.com/v1) (Element 84), colección `sentinel-2-c1-l2a`
  (Sentinel-2 L2A Collection 1, reprocesada por ESA). No hizo falta el STAC de Copernicus Data Space.
- Escenas filtradas por `grid:code` (una sola tesela MGRS por sitio, para no mezclar geometrías de visión) y
  `eo:cloud_cover < 40`.
- Los COG se leen con `rasterio` por requests HTTP de rango: solo la ventana del sitio + anillo, nunca la escena.
- Assets usados (nombres reales en Earth Search): `blue`, `green`, `red`, `nir` (10 m), `swir16`, `swir22` y
  `scl` (20 m, remuestreados por vecino más cercano a la grilla de 10 m, alineada a múltiplos de 20 m).
- Reflectancia = `DN × scale + offset`. El script lee `scale` y `offset` del `raster:bands` de cada asset; en
  esta colección son `0.0001` y `-0.1` para todas las bandas de reflectancia. `DN = 0` es nodata.

## Método

1. **Máscara SCL.** Son válidos los píxeles SCL 4 (vegetación), 5 (no vegetado) y 6 (agua). Nubes, sombras,
   cirros, nieve, saturados y áreas oscuras quedan fuera. Si más del 20 % del área (predio + anillo) queda
   enmascarada, la escena se descarta y se prueba la siguiente del mes, ordenadas por `eo:cloud_cover`.
2. **Una escena por mes**, desde 2018. En 2022 la colección casi no tiene escenas (solo diciembre en estos
   sitios); el hueco queda visible en la serie.
3. **Índices por píxel:**
   - `NDVI = (nir − red) / (nir + red)`
   - `BSI = ((swir16 + red) − (nir + blue)) / ((swir16 + red) + (nir + blue))`
   - `NBR = (nir − swir22) / (nir + swir22)`
4. **Superficie perturbada estimada (ha)** = píxeles de 10 m dentro del polígono con `BSI > 0.10` y
   `NDVI < 0.25`, × 0,01 ha. Se reporta también la misma superficie en el anillo (`ringValue`) y el NDVI medio
   del anillo (`ringNdvi`), para ver si se pierde vegetación alrededor.
5. **Temporada húmeda.** La serie y la comparación antes → ahora usan solo escenas de diciembre a abril. En el
   invierno seco el pasto y los campos arados también dan BSI alto y NDVI bajo y tapan la señal del predio.
   "Antes" es la escena de temporada húmeda del año de referencia del sitio (`referenceYear` en el GeoJSON) con
   menos área enmascarada; "ahora" es la última escena de temporada húmeda disponible.
6. **Posibles quemas** (`burnEvents`), con todas las escenas mensuales separadas por ≤ 45 días, en predio +
   anillo: `dNBR = NBR(t−1) − NBR(t)`; se le resta la mediana del dNBR de toda el área (descuenta fenología y
   cosechas) y se marca el píxel si ese exceso es > 0.27, el NBR posterior es < 0 y el NIR posterior < 0.15
   (superficie oscura). Se reporta el evento si suma ≥ 1 ha (`ha` total y `polygonHa` dentro del predio).

### Calibración de umbrales

No se usaron umbrales de literatura sin verificar. Se miraron compuestos color natural y mapas de NDVI/BSI de
escenas de ambos sitios y se ajustó a ojo:

- En el ex basural de San Pedro, escena 2022-12-23 (antes del cierre), el suelo removido tiene BSI ≈ 0,15–0,21
  y NDVI ≈ 0,10–0,29, y la selva alrededor BSI < 0,15 con NDVI > 0,30. Con `BSI > 0.10` y `NDVI < 0.25` la
  máscara coincide con el claro y el camino de acceso visibles en el color natural.
- En El Pongo la misma máscara marca las celdas y la playa de maniobras; en el anillo también marca campos
  arados, por eso el indicador principal se mide dentro del polígono.
- Con un umbral de dNBR fijo (0,20) casi todos los meses secos daban "quema" por senescencia y cosecha. El
  umbral relativo + NBR y NIR bajos redujo los falsos positivos, pero en El Pongo siguen apareciendo eventos en
  campos del anillo que pueden ser quema de rastrojo o cosecha: **son posibles quemas a verificar**, no
  incendios confirmados.

## Sitios

Ver `data/sentinel/aoi.geojson` (fuente y confianza de cada uno).

- **Centro Ambiental Jujuy (El Pongo, Perico)**: ubicado con el nodo OSM 13519796351 y confirmado en
  color natural. OSM no tiene el contorno del predio: el polígono se digitalizó sobre una escena de 2026 y no es
  un límite catastral.
- **Ex basural municipal de San Pedro de Jujuy** (contraste): way OSM 636502526, ampliado para cubrir todo el
  suelo removido visible en 2022. Cierre definitivo anunciado para el 2023-01-31 por la Municipalidad.
- **Abra Pampa (Puna)**: descartado. No hay ubicación verificable del basural, así que no se puede saber si
  mide más de 3–4 píxeles de 10 m por lado.

## Limitaciones

- Un píxel mide 10 × 10 m: los bordes, caminos y techos mezclan señales. Objetos de menos de ~30 m de lado no
  son medibles con confianza.
- Suelo desnudo no es lo mismo que residuos: una cantera, un campo arado o una obra dan la misma firma.
- La superficie se cuenta solo sobre píxeles válidos; si una escena tiene parte enmascarada (≤ 20 %), el valor
  puede quedar por debajo del real.
- La fenología (lluvias, sequías) cambia NDVI y BSI de un año a otro aunque el sitio no cambie.
- Los polígonos son digitalizaciones propias, no límites oficiales.

## Atribución

Contiene datos modificados de Copernicus Sentinel 2018–2026, procesados por ESA, distribuidos vía Earth
Search (Element 84) en AWS Open Data. Ubicaciones de referencia: © colaboradores de OpenStreetMap (ODbL).
