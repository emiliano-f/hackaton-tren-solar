import { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { getInterventions, getReports, getZones } from '../../shared/repository'
import type { EnvironmentalReport, Intervention, MonitoredZone, Priority, ReportStatus } from '../../shared/types'

const priorityLabels: Record<Priority, string> = {
  low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica',
}
const statusLabels: Record<ReportStatus, string> = {
  new: 'Nuevo', reviewing: 'En revisión', in_progress: 'En curso', resolved: 'Resuelto',
}
const categoryLabels: Record<EnvironmentalReport['category'], string> = {
  fire: 'Incendio', waste: 'Residuos', water: 'Agua', deforestation: 'Deforestación', other: 'Otro',
}
const priorityStyles: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-orange-50 text-orange-700',
  critical: 'bg-rose-50 text-rose-700',
}
const statusStyles: Record<ReportStatus, string> = {
  new: 'bg-sky-50 text-sky-700',
  reviewing: 'bg-violet-50 text-violet-700',
  in_progress: 'bg-amber-50 text-amber-700',
  resolved: 'bg-emerald-50 text-emerald-700',
}
const priorityOrder: Record<Priority, number> = { low: 0, medium: 1, high: 2, critical: 3 }

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date)
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div>
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p>
    <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{title}</h2>
    {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
  </div>
}

export default function Dashboard() {
  const [reports, setReports] = useState<EnvironmentalReport[]>(getReports)
  const [zones, setZones] = useState<MonitoredZone[]>(getZones)
  const [interventions, setInterventions] = useState<Intervention[]>(getInterventions)
  const [selectedIndicator, setSelectedIndicator] = useState('')

  function refresh() {
    setReports(getReports())
    setZones(getZones())
    setInterventions(getInterventions())
  }

  useEffect(() => {
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])

  const sortedReports = useMemo(() => [...reports].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  ), [reports])
  const alerts = useMemo(() => reports.filter(report =>
    report.status !== 'resolved' && (report.priority === 'high' || report.priority === 'critical'),
  ).sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority] ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  ), [reports])
  const indicatorGroups = useMemo(() => Array.from(new Set(zones.map(zone => `${zone.indicator} · ${zone.unit}`))), [zones])
  const activeIndicator = indicatorGroups.includes(selectedIndicator) ? selectedIndicator : indicatorGroups[0]
  const chartZones = zones.filter(zone => `${zone.indicator} · ${zone.unit}` === activeIndicator)
  const chartData = chartZones.map(zone => ({
    name: zone.name, anterior: zone.previousValue, actual: zone.currentValue,
  }))
  const openReports = reports.filter(report => report.status !== 'resolved').length

  return <main className="min-h-screen bg-slate-50 pb-16 text-slate-900">
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <header className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white sm:px-10 sm:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-36 h-80 w-80 rounded-full border-[50px] border-emerald-400/10 sm:right-8" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Inteligencia ambiental · Jujuy</p>
            <h1 className="mt-5 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">Panorama ambiental</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Seguimiento de reportes ciudadanos, alertas e indicadores por zona en un solo lugar.</p>
          </div>
          <button type="button" onClick={refresh} className="self-start rounded-xl border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 sm:self-auto">Actualizar datos</button>
        </div>
      </header>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900" role="note">
        <span aria-hidden="true" className="mt-0.5 font-bold">ⓘ</span>
        <p><strong>Prototipo demostrativo.</strong> Los indicadores de las zonas demo son simulados; los sitios Sentinel-2 son indicadores satelitales estimados, no detecciones de residuos. Los reportes precargados son ejemplos. Los reportes nuevos y las intervenciones se guardan en este navegador.</p>
      </div>

      <section aria-label="Indicadores generales" className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        {[
          { label: 'Zonas monitoreadas', value: zones.length, detail: zones.some(zone => !zone.simulated) ? 'Simulados + Sentinel-2 estimados' : 'Indicadores simulados', color: 'text-emerald-700' },
          { label: 'Reportes totales', value: reports.length, detail: 'Incluye ejemplos', color: 'text-slate-900' },
          { label: 'Reportes abiertos', value: openReports, detail: 'Pendientes de resolución', color: 'text-sky-700' },
          { label: 'Alertas prioritarias', value: alerts.length, detail: 'Altas o críticas sin resolver', color: 'text-rose-700' },
        ].map(card => <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">{card.label}</p>
          <p className={`mt-3 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl ${card.color}`}>{card.value}</p>
          <p className="mt-2 text-xs text-slate-500">{card.detail}</p>
        </div>)}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
        <section aria-labelledby="zones-title" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div id="zones-title"><SectionHeading eyebrow="Observación" title="Comparación temporal por zona" description="Valores anterior y actual de los indicadores demostrativos." /></div>
            {indicatorGroups.length > 1 && <label className="text-xs font-semibold text-slate-600">Indicador
              <select value={activeIndicator} onChange={event => setSelectedIndicator(event.target.value)} className="mt-1 block max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800">{indicatorGroups.map(group => <option key={group} value={group}>{group}</option>)}</select>
            </label>}
          </div>
          {chartData.length > 0 ? <>
            <p className="mt-6 text-xs font-medium text-slate-500">{activeIndicator} · {chartZones.every(zone => zone.simulated) ? 'datos simulados' : 'indicador satelital estimado (Sentinel-2)'}</p>
            <div className="mt-3 h-64 w-full sm:h-72" role="img" aria-label={`Comparación de valores anteriores y actuales para ${chartZones.map(zone => zone.name).join(', ')}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 8 }} barGap={4}>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} interval={0} tickLine={false} axisLine={false} tickFormatter={name => name.length > 17 ? `${name.slice(0, 16)}…` : name} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip formatter={(value: number) => [`${value} ${chartZones[0]?.unit ?? ''}`]} labelFormatter={label => String(label)} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} formatter={value => value === 'anterior' ? 'Anterior' : 'Actual'} />
                  <Bar dataKey="anterior" fill="#94a3b8" radius={[5, 5, 0, 0]} maxBarSize={38} />
                  <Bar dataKey="actual" fill="#059669" radius={[5, 5, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </> : <p className="mt-8 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Todavía no hay zonas para comparar.</p>}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {zones.map(zone => <article key={zone.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2"><h3 className="font-semibold text-slate-900">{zone.name}</h3>{zone.simulated ? <Badge className="bg-emerald-100 text-emerald-800">Simulado</Badge> : <Badge className="bg-sky-100 text-sky-800">Sentinel-2 · estimado</Badge>}</div>
              <p className="mt-1 text-xs text-slate-500">{zone.indicator}</p>
              <p className="mt-3 text-lg font-bold tabular-nums">{zone.currentValue} <span className="text-sm font-normal text-slate-500">{zone.unit} actual · {zone.previousValue} {zone.unit} anterior</span></p>
              <p className="mt-1 text-xs text-slate-500">Observado: {formatDate(zone.observedAt)}</p>
            </article>)}
          </div>
        </section>

        <section aria-labelledby="alerts-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div id="alerts-title"><SectionHeading eyebrow="Atención" title="Alertas prioritarias" description="Reportes de prioridad alta o crítica sin resolver." /></div>
          {alerts.length ? <ul className="mt-6 space-y-3">{alerts.map(report => <li key={report.id} className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
            <div className="flex flex-wrap gap-2"><Badge className={priorityStyles[report.priority]}>{priorityLabels[report.priority]}</Badge><Badge className={statusStyles[report.status]}>{statusLabels[report.status]}</Badge></div>
            <p className="mt-3 font-semibold text-slate-900">{report.title}</p>
            <p className="mt-1 text-xs text-slate-500">{report.location.label || 'Ubicación sin nombre'} · {formatDate(report.createdAt)}{report.id.startsWith('demo-') && ' · Ejemplo'}</p>
          </li>)}</ul> : <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-5"><p className="font-semibold text-emerald-800">Sin alertas prioritarias</p><p className="mt-1 text-sm text-emerald-700">No hay reportes abiertos de prioridad alta o crítica.</p></div>}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-sm font-semibold text-slate-800">Intervenciones registradas <span className="ml-2 text-lg font-bold text-emerald-700">{interventions.length}</span></p>
            <p className="mt-1 text-xs text-slate-500">Acciones almacenadas en este navegador.</p>
          </div>
        </section>
      </div>

      <section aria-labelledby="reports-title" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div id="reports-title"><SectionHeading eyebrow="Actividad" title="Reportes recientes" description="Últimos registros ordenados por fecha de creación." /></div>
        {sortedReports.length ? <ul className="mt-6 divide-y divide-slate-100">{sortedReports.slice(0, 6).map(report => <li key={report.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><p className="font-semibold text-slate-900">{report.title} {report.id.startsWith('demo-') && <span className="ml-1 text-xs font-medium text-amber-700">Ejemplo</span>}</p><p className="mt-1 text-xs text-slate-500">{categoryLabels[report.category]} · {report.location.label || 'Ubicación sin nombre'} · {formatDate(report.createdAt)}</p></div>
          <div className="flex shrink-0 flex-wrap gap-2"><Badge className={priorityStyles[report.priority]}>{priorityLabels[report.priority]}</Badge><Badge className={statusStyles[report.status]}>{statusLabels[report.status]}</Badge></div>
        </li>)}</ul> : <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Aún no hay reportes registrados.</p>}
      </section>
    </div>
  </main>
}
