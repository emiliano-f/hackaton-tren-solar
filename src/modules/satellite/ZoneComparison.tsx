import type { MonitoredZone } from '../../shared/types'
import { SENTINEL_COLOR } from './sentinelAssets'
import { SentinelBadge } from './SentinelBadge'
import { SimulatedBadge } from './SimulatedBadge'
import { formatDate, formatDelta, formatValue, getZoneChange, trendColor, trendLabel, trendSymbol } from './zoneTrend'

interface Props {
  zones: MonitoredZone[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function Bar({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const width = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 shrink-0 text-slate-500">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-slate-200" role="presentation">
        <div className="h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
      <span className="w-14 shrink-0 text-right tabular-nums">{formatValue(value, unit)}</span>
    </div>
  )
}

export function ZoneComparison({ zones, selectedId, onSelect }: Props) {
  if (zones.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
        No hay zonas monitoreadas para mostrar.
      </p>
    )
  }
  return (
    <ul className="space-y-3" aria-label="Comparación temporal por zona">
      {zones.map(zone => {
        const change = getZoneChange(zone)
        const max = Math.max(zone.previousValue, zone.currentValue, zone.unit === '%' ? 100 : 0)
        const isSelected = zone.id === selectedId
        const color = zone.simulated ? trendColor[change.trend] : SENTINEL_COLOR
        return (
          <li key={zone.id}>
            <button
              type="button"
              onClick={() => onSelect(zone.id)}
              aria-pressed={isSelected}
              className={`w-full rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-slate-400 ${isSelected ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{zone.name}</p>
                  <p className="text-xs text-slate-500">{zone.indicator}</p>
                  <div className="mt-1">{zone.simulated ? <SimulatedBadge /> : <SentinelBadge />}</div>
                </div>
                <span className="whitespace-nowrap text-sm font-semibold" style={{ color }}>
                  {trendSymbol[change.trend]} {trendLabel[change.trend]}
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                <Bar label="Anterior" value={zone.previousValue} max={max} unit={zone.unit} color="#94a3b8" />
                <Bar label="Actual" value={zone.currentValue} max={max} unit={zone.unit} color={color} />
              </div>
              <p className="mt-2 text-xs text-slate-600">
                Variación: <span className="font-medium tabular-nums">{formatDelta(change, zone.unit)}</span> · Observado el {formatDate(zone.observedAt)}
              </p>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
