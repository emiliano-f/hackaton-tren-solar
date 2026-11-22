/** Íconos de navegación (SVG propios, trazo de 1.8 px, heredan el color del texto). */
type IconProps = { className?: string }

const base = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
}

export function DashboardIcon({ className = 'h-6 w-6' }: IconProps) {
  return <svg {...base} className={className}><rect x="3.5" y="3.5" width="7" height="8" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="5" rx="1.5" /><rect x="13.5" y="11.5" width="7" height="9" rx="1.5" /><rect x="3.5" y="14.5" width="7" height="6" rx="1.5" /></svg>
}

export function MapIcon({ className = 'h-6 w-6' }: IconProps) {
  return <svg {...base} className={className}><path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2-6-2Z" /><path d="M9 4.5v13M15 6.5v13" /></svg>
}

export function ReportIcon({ className = 'h-6 w-6' }: IconProps) {
  return <svg {...base} className={className}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><path d="M12 7v6M9 10h6" /></svg>
}

export function ManagementIcon({ className = 'h-6 w-6' }: IconProps) {
  return <svg {...base} className={className}><path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6l-7-2.5Z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>
}

export function BrandMark({ className = 'h-6 w-6' }: IconProps) {
  // Cerros de la Quebrada con el sol: marca simple, sin texto.
  return <svg {...base} className={className}><path d="M2.5 19.5 8.5 10l3.5 5 2.5-3.5 7 8" /><circle cx="17" cy="6.5" r="2.5" /></svg>
}
