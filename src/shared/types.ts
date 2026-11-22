export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type ReportStatus = 'new' | 'reviewing' | 'in_progress' | 'resolved'
export type ReportCategory = 'fire' | 'waste' | 'water' | 'deforestation' | 'other'

export interface Location { lat: number; lng: number; label?: string }
export interface EnvironmentalReport {
  id: string
  title: string
  description: string
  category: ReportCategory
  location: Location
  priority: Priority
  status: ReportStatus
  photoDataUrl?: string
  createdAt: string
}
export interface MonitoredZone {
  id: string
  name: string
  location: Location
  indicator: string
  currentValue: number
  previousValue: number
  unit: string
  observedAt: string
  simulated: boolean
  previousDate?: string
  polygon?: number[][]
  ring?: number[][]
  series?: ZoneObservation[]
  burnEvents?: BurnEvent[]
  thumbnails?: { before: string; after: string; afterDisturbed?: string }
  source?: string
  method?: string
  confidence?: string
  locationSource?: string
  closureDate?: string
}

export interface ZoneObservation {
  date: string
  value: number
  ndvi: number
  bsi: number
  ringNdvi?: number
  ringValue?: number
}

export interface BurnEvent {
  date: string
  previousDate?: string
  dnbr: number
  ha?: number
  polygonHa?: number
}
export interface Intervention { id: string; reportId: string; action: string; notes?: string; createdAt: string }
