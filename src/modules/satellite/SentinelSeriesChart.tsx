import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ZoneObservation } from '../../shared/types'
import { SENTINEL_COLOR } from './sentinelAssets'

const numberFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })
const monthFormat = new Intl.DateTimeFormat('es-AR', { month: 'short', year: 'numeric', timeZone: 'UTC' })

function formatMonth(date: string): string {
  return monthFormat.format(new Date(`${date}T12:00:00Z`))
}

interface Props {
  series: ZoneObservation[]
  closureDate?: string
}

export function SentinelSeriesChart({ series, closureDate }: Props) {
  const closure = closureDate ? series.find(point => point.date >= closureDate)?.date : undefined
  const yearTicks = series.filter((point, index) => index === 0 || point.date.slice(0, 4) !== series[index - 1].date.slice(0, 4)).map(point => point.date)
  return (
    <div className="h-48 w-full" role="img" aria-label="Serie de superficie perturbada estimada por escena">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} ticks={yearTicks} tickFormatter={date => String(date).slice(0, 4)} interval="preserveStartEnd" minTickGap={8} />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} width={48} unit=" ha" />
          <Tooltip
            labelFormatter={label => formatMonth(String(label))}
            formatter={(value: number, _name, item) => {
              const point = item.payload as ZoneObservation
              return [`${numberFormat.format(value)} ha · NDVI ${numberFormat.format(point.ndvi)} · BSI ${numberFormat.format(point.bsi)}`, 'Superficie perturbada']
            }}
          />
          {closure && <ReferenceLine x={closure} stroke="#64748b" strokeDasharray="4 3" label={{ value: 'Cierre', fontSize: 10, fill: '#475569', position: 'insideTopRight' }} />}
          <Line type="monotone" dataKey="value" stroke={SENTINEL_COLOR} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
