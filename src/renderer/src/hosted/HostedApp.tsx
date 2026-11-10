import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Dashboard } from './Dashboard'
import { applyTheme, readTheme, type UiTheme } from '../lib/theme'
import { APP_VERSION } from '../lib/version'

export default function HostedApp(): React.JSX.Element {
  const [theme, setTheme] = useState<UiTheme>(readTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <div className="flex h-full flex-col bg-canvas text-fg">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-canvas/85 px-5 backdrop-blur">
        <img
          src="/icon.png"
          alt="ArhLinx"
          width={36}
          height={36}
          className="size-9 rounded-lg shadow-lg shadow-accent/20"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">ArhLinx</p>
          <p className="truncate text-[11px] leading-tight text-muted">Complete Network Control</p>
        </div>
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label="Toggle theme"
          className="ml-auto grid size-9 place-items-center rounded-lg border border-line bg-panel text-muted transition-colors hover:border-accent/40 hover:text-fg"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Dashboard />
      </main>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-[11px] text-muted">
        <span>ArhLinx v{APP_VERSION}</span>
        <span>Private by design — readings stay in your browser</span>
      </footer>
    </div>
  )
}
