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
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-2.5 px-5">
          <img src="/icon.png" alt="" width={30} height={30} className="size-[30px]" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-none tracking-[-0.02em]">
              ArhLinx
            </p>
            <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
              Network diagnostics
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full border border-line px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted sm:inline">
              v{APP_VERSION}
            </span>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label="Toggle theme"
              className="grid size-9 place-items-center rounded-lg border border-line bg-panel text-muted transition-colors hover:border-accent/40 hover:text-fg"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Dashboard />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-5 py-4 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
          <span>ArhLinx · Complete Network Control</span>
          <span>Measured in your browser · nothing stored remotely</span>
        </div>
      </footer>
    </div>
  )
}
