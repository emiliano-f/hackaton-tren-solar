import type { ComponentType } from 'react'
import type { ReportCategory } from '../../shared/types'

type IconProps = { className?: string }
const base = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
}

export function FireIcon({ className = 'h-5 w-5' }: IconProps) {
  return <svg {...base} className={className}><path d="M12 21.5c-3.9 0-6.5-2.8-6.5-6.3 0-2.6 1.4-4.4 2.9-6.1.3 1.6 1 2.6 2 3.1-.2-3.5 1.4-6.4 4.1-8.7.2 3 1.6 4.6 2.9 6.2 1.1 1.4 1.6 2.9 1.6 4.8 0 4-2.9 7-7 7Z" /><path d="M12 21.5c-1.7 0-2.8-1.2-2.8-2.8 0-1.9 1.6-2.8 2.4-4.6 1.6 1.2 3.2 2.6 3.2 4.6 0 1.6-1.1 2.8-2.8 2.8Z" /></svg>
}
export function WasteIcon({ className = 'h-5 w-5' }: IconProps) {
  return <svg {...base} className={className}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" /></svg>
}
export function WaterIcon({ className = 'h-5 w-5' }: IconProps) {
  return <svg {...base} className={className}><path d="M12 3.5s6 6.4 6 10.7a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5Z" /></svg>
}
export function TreeIcon({ className = 'h-5 w-5' }: IconProps) {
  return <svg {...base} className={className}><path d="M12 3.5 6 12h3l-3.5 5h13L15 12h3l-6-8.5ZM12 17v3.5" /></svg>
}
export function AlertIcon({ className = 'h-5 w-5' }: IconProps) {
  return <svg {...base} className={className}><path d="M12 4 2.8 19.5h18.4L12 4ZM12 10v4.5M12 17.2v.3" /></svg>
}
export function LocateIcon({ className = 'h-5 w-5' }: IconProps) {
  return <svg {...base} className={className}><circle cx="12" cy="12" r="6.5" /><circle cx="12" cy="12" r="2" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" /></svg>
}
export function CameraIcon({ className = 'h-5 w-5' }: IconProps) {
  return <svg {...base} className={className}><path d="M4 8h3l1.5-2.5h7L17 8h3v11H4V8Z" /><circle cx="12" cy="13.5" r="3.5" /></svg>
}
export function SendIcon({ className = 'h-5 w-5' }: IconProps) {
  return <svg {...base} className={className}><path d="M4 12 20 4l-6 16-2.5-6.5L4 12ZM11.5 13.5 20 4" /></svg>
}
export function CheckCircleIcon({ className = 'h-5 w-5' }: IconProps) {
  return <svg {...base} className={className}><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.2 2.3 2.3 4.7-4.8" /></svg>
}
export function CloseIcon({ className = 'h-5 w-5' }: IconProps) {
  return <svg {...base} className={className}><path d="M6 6l12 12M18 6 6 18" /></svg>
}
export function PinIcon({ className = 'h-4 w-4' }: IconProps) {
  return <svg {...base} className={className}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></svg>
}

export const CATEGORY_ICONS: Record<ReportCategory, ComponentType<IconProps>> = {
  fire: FireIcon, waste: WasteIcon, water: WaterIcon, deforestation: TreeIcon, other: AlertIcon,
}
