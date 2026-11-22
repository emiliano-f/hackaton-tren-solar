import { useEffect, useState, type ComponentType } from 'react'
import Dashboard from '../modules/dashboard/Dashboard'
import { SatelliteModule } from '../modules/satellite'
import { CitizenReportModule } from '../modules/citizen'
import { ManagementModule } from '../modules/management'

type ViewId = 'dashboard' | 'mapa' | 'reportes' | 'gestion'

interface ViewDefinition {
  id: ViewId
  label: string
  component: ComponentType
}

const views: ViewDefinition[] = [
  { id: 'dashboard', label: 'Dashboard', component: Dashboard },
  { id: 'mapa', label: 'Mapa', component: SatelliteModule },
  { id: 'reportes', label: 'Reportes', component: CitizenReportModule },
  { id: 'gestion', label: 'Gestión', component: ManagementModule },
]

function viewFromHash(): ViewId {
  const id = window.location.hash.replace('#', '')
  return views.some(view => view.id === id) ? (id as ViewId) : 'dashboard'
}

export default function App() {
  const [active, setActive] = useState<ViewId>(viewFromHash)

  useEffect(() => {
    const onHashChange = () => setActive(viewFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const View = (views.find(view => view.id === active) ?? views[0]).component

  return (
    <div className="app-shell">
      <div className="demo-banner" role="status">
        <strong>Datos demostrativos.</strong> Las zonas demo y los reportes precargados son simulados. Los sitios Sentinel-2 son indicadores satelitales estimados.
      </div>
      <header className="app-header">
        <div className="app-header-inner">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Inteligencia ambiental · Jujuy</h1>
            <p className="text-sm text-slate-500">Hackatón Tren Solar 2026</p>
          </div>
          <nav aria-label="Secciones" className="app-nav">
            {views.map(view => (
              <a
                key={view.id}
                href={`#${view.id}`}
                className="nav-tab"
                aria-current={view.id === active ? 'page' : undefined}
              >
                {view.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <div className="app-main">
        {active === 'dashboard' ? <View /> : <main><View /></main>}
      </div>
      <footer className="app-footer">Prototipo con datos demostrativos · Jujuy, Argentina</footer>
    </div>
  )
}
