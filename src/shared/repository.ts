import { demoReports, demoZones } from './demoData'
import sentinelZones from './sentinelZones.json'
import type { EnvironmentalReport, Intervention, MonitoredZone } from './types'

const REPORTS_KEY = 'jujuy-environment-reports-v1'
const INTERVENTIONS_KEY = 'jujuy-environment-interventions-v1'

function read<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw) as T }
  catch { return fallback }
}
function write<T>(key: string, value: T): void { localStorage.setItem(key, JSON.stringify(value)) }

export function getReports(): EnvironmentalReport[] { return read(REPORTS_KEY, demoReports) }
export function createReport(input: Omit<EnvironmentalReport, 'id' | 'createdAt'>): EnvironmentalReport {
  const report = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  write(REPORTS_KEY, [...getReports(), report]); return report
}
export function updateReport(id: string, changes: Partial<Pick<EnvironmentalReport, 'priority' | 'status'>>): EnvironmentalReport | undefined {
  const reports = getReports(); const index = reports.findIndex(report => report.id === id)
  if (index < 0) return undefined
  reports[index] = { ...reports[index], ...changes }; write(REPORTS_KEY, reports); return reports[index]
}
export function getZones(): MonitoredZone[] { return [...demoZones, ...(sentinelZones as MonitoredZone[])] }
export function getInterventions(): Intervention[] { return read(INTERVENTIONS_KEY, []) }
export function createIntervention(input: Omit<Intervention, 'id' | 'createdAt'>): Intervention {
  const intervention = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  write(INTERVENTIONS_KEY, [...getInterventions(), intervention]); return intervention
}
