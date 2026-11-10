import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { DeviceCheckPage } from './DeviceCheckPage'
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
        <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-accent to-indigo-500 text-sm font-bold text-white shadow-lg shadow-accent/30">
          A
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">ArhLinx</p>
          <p className="truncate text-[11px] leading-tight text-muted">Device check</p>
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
        <DeviceCheckPage />
      </main>

      <footer className="flex shrink-0 items-center justify-between border-t border-line px-5 py-3 text-[11px] text-muted">
        <span>ArhLinx v{APP_VERSION}</span>
        <span>no cookies · no tracking · data stays in your browser</span>
      </footer>
    </div>
  )
}
