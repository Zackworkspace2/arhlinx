import { Moon, Sun } from 'lucide-react'
import { ROUTE_META, type RouteId } from '../navigation'
import type { UiTheme } from '../lib/theme'

interface TopBarProps {
  route: RouteId
  theme: UiTheme
  onToggleTheme: () => void
}

export function TopBar({ route, theme, onToggleTheme }: TopBarProps): React.JSX.Element {
  const meta = ROUTE_META[route]

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-canvas/85 px-6 backdrop-blur">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-sm font-semibold">{meta.label}</h1>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
              meta.status === 'live'
                ? 'border-ok/30 bg-ok/10 text-ok'
                : 'border-accent/30 bg-accent-soft text-accent-strong'
            }`}
          >
            {meta.status === 'live' ? 'Live' : `Phase ${meta.phase}`}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">{meta.description}</p>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label="Toggle theme"
          className="grid size-9 place-items-center rounded-lg border border-line bg-panel text-muted transition-colors hover:border-accent/40 hover:text-fg"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  )
}
