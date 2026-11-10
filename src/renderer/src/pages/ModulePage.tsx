import { ArrowLeft } from 'lucide-react'
import { ROUTE_META, type RouteId } from '../navigation'

interface ModulePageProps {
  route: RouteId
  onNavigate: (id: RouteId) => void
}

export function ModulePage({ route, onNavigate }: ModulePageProps): React.JSX.Element {
  const meta = ROUTE_META[route]
  const Icon = meta.icon

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-20 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-strong">
        <Icon size={26} />
      </div>
      <h2 className="mt-5 text-lg font-semibold">{meta.label}</h2>
      <p className="mt-2 max-w-md text-sm text-muted">{meta.description}</p>

      <div className="mt-6 rounded-lg border border-line bg-panel px-4 py-3 text-xs text-muted">
        Planned for Phase {meta.phase}. This module is not built yet.
      </div>

      <button
        type="button"
        onClick={() => onNavigate('dashboard')}
        className="mt-6 flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-fg transition-colors hover:border-accent/40"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </button>
    </div>
  )
}
