import { useMemo, useState } from 'react'
import { getZones } from '../../shared/repository'
import { SatelliteMap } from './SatelliteMap'
import { SentinelBadge } from './SentinelBadge'
import { SentinelSiteDetail } from './SentinelSiteDetail'
import { SimulatedBadge } from './SimulatedBadge'
import { ZoneComparison } from './ZoneComparison'

export function SatelliteModule() {
  const zones = useMemo(() => getZones(), [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const sentinelZones = zones.filter(zone => !zone.simulated)

  return (
    <section className="space-y-4" aria-labelledby="satellite-title">
      <header className="flex flex-wrap items-center gap-3">
        <h2 id="satellite-title" className="text-2xl font-bold">Monitoreo satelital</h2>
        <SimulatedBadge />
        {sentinelZones.length > 0 && <SentinelBadge />}
      </header>
      <p className="text-sm text-slate-600">
        Comparación entre la observación anterior y la actual de cada zona. Las zonas marcadas como simuladas son demostrativas.
        {sentinelZones.length > 0 && ' Los sitios Sentinel-2 muestran un indicador satelital estimado, calculado offline con imágenes reales; no es una detección de residuos.'}
      </p>
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <SatelliteMap zones={zones} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <ZoneComparison zones={zones} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      {sentinelZones.length > 0 && (
        <section className="space-y-3" aria-labelledby="sentinel-sites-title">
          <h3 id="sentinel-sites-title" className="text-lg font-semibold">Sitios con datos Sentinel-2</h3>
          <div className="grid gap-4 xl:grid-cols-2">
            {sentinelZones.map(zone => (
              <SentinelSiteDetail key={zone.id} zone={zone} selected={zone.id === selectedId} onSelect={setSelectedId} />
            ))}
          </div>
        </section>
      )}
    </section>
  )
}
