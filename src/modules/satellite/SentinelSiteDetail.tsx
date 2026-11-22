import type { MonitoredZone } from '../../shared/types'
import { SentinelBadge } from './SentinelBadge'
import { SentinelSeriesChart } from './SentinelSeriesChart'
import { assetUrl } from './sentinelAssets'
import { formatDate, formatDelta, formatValue, getZoneChange } from './zoneTrend'

const MAX_BURN_EVENTS = 5

function Thumbnail({ src, title, caption }: { src: string; title: string; caption: string }) {
  return (
    <figure className="min-w-0">
      <img src={assetUrl(src)} alt={`${title}: ${caption}`} loading="lazy" className="aspect-[4/3] w-full rounded-md border border-slate-200 bg-slate-100 object-cover [image-rendering:pixelated]" />
      <figcaption className="mt-1 text-xs text-slate-600"><span className="font-semibold">{title}</span> · {caption}</figcaption>
    </figure>
  )
}

interface Props {
  zone: MonitoredZone
  selected: boolean
  onSelect: (id: string) => void
}

export function SentinelSiteDetail({ zone, selected, onSelect }: Props) {
  const change = getZoneChange(zone)
  const burns = zone.burnEvents ?? []
  const recentBurns = [...burns].reverse().slice(0, MAX_BURN_EVENTS)
  return (
    <article
      id={`sentinel-${zone.id}`}
      className={`space-y-4 rounded-lg border bg-white p-4 shadow-sm ${selected ? 'border-sky-700 ring-1 ring-sky-700' : 'border-slate-200'}`}
      aria-labelledby={`sentinel-title-${zone.id}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={`sentinel-title-${zone.id}`} className="font-semibold">{zone.name}</h3>
          <p className="text-xs text-slate-500">{zone.indicator} (indicador satelital estimado) · Confianza de ubicación: {zone.confidence}</p>
        </div>
        <div className="flex items-center gap-2">
          <SentinelBadge />
          {!selected && (
            <button type="button" onClick={() => onSelect(zone.id)} className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:border-slate-500">
              Ver en el mapa
            </button>
          )}
        </div>
      </header>

      <p className="text-sm">
        <span className="tabular-nums">{formatValue(zone.previousValue, zone.unit)}</span> ({zone.previousDate ? formatDate(zone.previousDate) : 'sin fecha'})
        {' → '}
        <span className="font-semibold tabular-nums">{formatValue(zone.currentValue, zone.unit)}</span> ({formatDate(zone.observedAt)})
        <span className="text-slate-600"> · Variación: <span className="tabular-nums">{formatDelta(change, zone.unit)}</span></span>
      </p>

      {zone.thumbnails && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Thumbnail src={zone.thumbnails.before} title="Antes" caption={zone.previousDate ? formatDate(zone.previousDate) : ''} />
          <Thumbnail src={zone.thumbnails.after} title="Ahora" caption={formatDate(zone.observedAt)} />
          {zone.thumbnails.afterDisturbed && (
            <Thumbnail src={zone.thumbnails.afterDisturbed} title="Ahora" caption="en rosa, superficie perturbada estimada" />
          )}
        </div>
      )}
      <p className="text-xs text-slate-500">Color natural Sentinel-2. Contorno amarillo: predio analizado. Contorno celeste: anillo de comparación de 500 m.</p>

      {zone.series && zone.series.length > 1 && (
        <div>
          <p className="text-xs font-medium text-slate-600">Superficie perturbada estimada por escena (temporada húmeda, dic-abr)</p>
          <SentinelSeriesChart series={zone.series} closureDate={zone.closureDate} />
        </div>
      )}

      <div className="text-sm">
        <p className="font-medium">Posibles quemas (a verificar): {burns.length}</p>
        {recentBurns.length > 0 ? (
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
            {recentBurns.map(event => (
              <li key={event.date}>
                {formatDate(`${event.date}T12:00:00Z`)}: {formatValue(event.ha ?? 0, 'ha')} con caída de NBR
                {event.polygonHa !== undefined && ` (${formatValue(event.polygonHa, 'ha')} dentro del predio)`}
              </li>
            ))}
            {burns.length > MAX_BURN_EVENTS && <li>y {burns.length - MAX_BURN_EVENTS} anteriores.</li>}
          </ul>
        ) : (
          <p className="text-xs text-slate-600">No se marcaron caídas de NBR compatibles con quemas.</p>
        )}
      </div>

      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" role="note">
        <strong>Limitación:</strong> Sentinel-2 (10 m) no detecta residuos directamente. Medimos señales indirectas: superficie de suelo desnudo/removido, pérdida de vegetación alrededor y quemas. Un campo arado o una obra pueden dar la misma señal.
      </p>

      <dl className="grid gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-[auto_1fr]">
        <dt className="font-semibold">Fuente</dt><dd>{zone.source}</dd>
        <dt className="font-semibold">Método</dt><dd>{zone.method}</dd>
        <dt className="font-semibold">Ubicación</dt><dd>{zone.locationSource}</dd>
        {zone.closureDate && (<><dt className="font-semibold">Cierre</dt><dd>{formatDate(`${zone.closureDate}T12:00:00Z`)}</dd></>)}
        <dt className="font-semibold">Atribución</dt><dd>Contiene datos modificados de Copernicus Sentinel 2018–2026.</dd>
      </dl>
    </article>
  )
}
