import { Fragment, useEffect } from 'react'
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { MonitoredZone } from '../../shared/types'
import { SENTINEL_COLOR } from './sentinelAssets'
import { formatDate, formatDelta, formatValue, getZoneChange, trendColor, trendLabel, trendSymbol } from './zoneTrend'

const JUJUY_CENTER: [number, number] = [-23.3, -65.4]
const JUJUY_ZOOM = 7
const FOCUS_ZOOM = 8

interface Props {
  zones: MonitoredZone[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function FlyToSelected({ zone }: { zone: MonitoredZone | undefined }) {
  const map = useMap()
  const lat = zone?.location.lat
  const lng = zone?.location.lng
  useEffect(() => {
    if (lat === undefined || lng === undefined) return
    map.flyTo([lat, lng], Math.max(map.getZoom(), FOCUS_ZOOM), { duration: 0.6 })
  }, [map, lat, lng])
  return null
}

export function SatelliteMap({ zones, selectedId, onSelect }: Props) {
  const selected = zones.find(zone => zone.id === selectedId)
  return (
    <MapContainer
      center={JUJUY_CENTER}
      zoom={JUJUY_ZOOM}
      scrollWheelZoom
      className="h-[420px] w-full rounded-lg"
      aria-label="Mapa de zonas monitoreadas en Jujuy"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {zones.map(zone => {
        const change = getZoneChange(zone)
        const color = zone.simulated ? trendColor[change.trend] : SENTINEL_COLOR
        const isSelected = zone.id === selectedId
        return (
          <Fragment key={zone.id}>
          {zone.polygon && (
            <Polygon
              positions={zone.polygon.map(([lat, lng]) => [lat, lng] as [number, number])}
              pathOptions={{ color: '#ca8a04', weight: 2, fillOpacity: 0.15 }}
              eventHandlers={{ click: () => onSelect(zone.id) }}
            />
          )}
          <CircleMarker
            center={[zone.location.lat, zone.location.lng]}
            radius={isSelected ? 14 : 10}
            pathOptions={{
              color: isSelected ? '#0f172a' : zone.simulated ? color : '#ffffff',
              fillColor: color,
              fillOpacity: isSelected ? 0.85 : zone.simulated ? 0.6 : 0.9,
              weight: isSelected ? 4 : zone.simulated ? 2 : 3,
              dashArray: zone.simulated ? '4 3' : undefined,
            }}
            eventHandlers={{ click: () => onSelect(zone.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>{zone.name}</Tooltip>
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{zone.name}</p>
                <p className="text-slate-600">{zone.indicator}</p>
                <p>Anterior: <span className="tabular-nums">{formatValue(zone.previousValue, zone.unit)}</span></p>
                <p>Actual: <span className="tabular-nums">{formatValue(zone.currentValue, zone.unit)}</span></p>
                <p style={{ color }}>
                  {trendSymbol[change.trend]} {trendLabel[change.trend]}: <span className="tabular-nums">{formatDelta(change, zone.unit)}</span>
                </p>
                <p className="text-xs text-slate-500">Observado el {formatDate(zone.observedAt)}</p>
                {zone.simulated
                  ? <p className="text-xs font-semibold uppercase text-amber-700">Dato simulado</p>
                  : <p className="text-xs font-semibold uppercase text-sky-700">Sentinel-2 · estimado</p>}
              </div>
            </Popup>
          </CircleMarker>
          </Fragment>
        )
      })}
      <FlyToSelected zone={selected} />
    </MapContainer>
  )
}
