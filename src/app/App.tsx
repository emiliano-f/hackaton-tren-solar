import { useEffect, useState, type ComponentType } from 'react'
import Dashboard from '../modules/dashboard/Dashboard'
import { SatelliteModule } from '../modules/satellite'
import { CitizenReportModule } from '../modules/citizen'
import { ManagementModule } from '../modules/management'
import { BrandMark, DashboardIcon, ManagementIcon, MapIcon, ReportIcon } from './NavIcons'

type ViewId = 'dashboard' | 'mapa' | 'reportes' | 'gestion'

interface ViewDefinition {
  id: ViewId
  label: string
  component: ComponentType
  icon: ComponentType<{ className?: string }>
}

const views: ViewDefinition[] = [
  { id: 'dashboard', label: 'Dashboard', component: Dashboard, icon: DashboardIcon },
  { id: 'mapa', label: 'Mapa', component: SatelliteModule, icon: MapIcon },
  { id: 'reportes', label: 'Reportar', component: CitizenReportModule, icon: ReportIcon },
  { id: 'gestion', label: 'Gestión', component: ManagementModule, icon: ManagementIcon },
]

function viewFromHash(): ViewId {
  const id = window.location.hash.replace('#', '')
  return views.some(view => view.id === id) ? (id as ViewId) : 'dashboard'
}

export default function App() {
  const [active, setActive] = useState<ViewId>(viewFromHash)

  useEffect(() => {
    const onHashChange = () => {
      setActive(viewFromHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const View = (views.find(view => view.id === active) ?? views[0]).component

  return (
    <div className="app-shell">
      <div className="demo-banner" role="status">
        <strong>Datos demostrativos:</strong> las zonas y los reportes precargados son simulados.
      </div>
      <header className="app-header">
        <div className="app-header-inner">
          <a href="#dashboard" className="app-brand rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
            <span className="app-brand-mark"><BrandMark /></span>
            <span className="min-w-0">
              <span className="block text-base font-bold leading-5 text-slate-900 sm:text-lg">Inteligencia ambiental · Jujuy</span>
              <span className="block text-xs text-slate-500">Hackatón Tren Solar 2026</span>
            </span>
          </a>
          <nav aria-label="Secciones" className="app-nav">
            {views.map(({ id, label, icon: Icon }) => (
              <a key={id} href={`#${id}`} className="nav-tab" aria-current={id === active ? 'page' : undefined}>
                <Icon className="h-[18px] w-[18px]" />{label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <div className="app-main">
        {active === 'dashboard' ? <View /> : <main><View /></main>}
      </div>
      <footer className="app-footer">Prototipo con datos demostrativos · Jujuy, Argentina</footer>
      <nav aria-label="Secciones" className="bottom-nav">
        {views.map(({ id, label, icon: Icon }) => (
          <a key={id} href={`#${id}`} className="bottom-tab" aria-current={id === active ? 'page' : undefined}>
            <Icon />{label}
          </a>
        ))}
      </nav>
    </div>
  )
}
