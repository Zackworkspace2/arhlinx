import { useEffect, useState } from 'react'
import { Database, Moon, Server, Sun, Trash2 } from 'lucide-react'
import { apiGet, apiPost } from '../lib/api'
import { APP_VERSION } from '../lib/version'
import type { Overview } from '@shared/types'

interface SettingsPageProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

type Scope = 'speed' | 'usage' | 'all'

const CLEAR_OPTIONS: { scope: Scope; label: string; description: string }[] = [
  { scope: 'speed', label: 'Speed test history', description: 'Every saved download/upload result.' },
  { scope: 'usage', label: 'Usage samples', description: 'Today, month and 14-day traffic totals.' },
  { scope: 'all', label: 'All local data', description: 'Speed history and usage samples together.' }
]

export function SettingsPage({ theme, onToggleTheme }: SettingsPageProps): React.JSX.Element {
  const [health, setHealth] = useState<{ ok: boolean; version: string } | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [pending, setPending] = useState<Scope | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const [healthResult, overviewResult] = await Promise.all([
          apiGet<{ ok: boolean; version: string }>('/api/health'),
          apiGet<Overview>('/api/overview')
        ])
        setHealth(healthResult)
        setOverview(overviewResult)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : String(loadError))
      }
    })()
  }, [])

  const clear = async (scope: Scope): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const result = await apiPost<{ cleared: { speed: number; usage: number } }>('/api/data/clear', {
        scope
      })
      const parts = []
      if (result.cleared.speed > 0) parts.push(`${result.cleared.speed} speed tests`)
      if (result.cleared.usage > 0) parts.push(`${result.cleared.usage} usage samples`)
      setMessage(parts.length > 0 ? `Deleted ${parts.join(' and ')}.` : 'Nothing to delete.')
      setPending(null)
      setOverview(await apiGet<Overview>('/api/overview'))
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : String(clearError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-6">
      <div>
        <h1 className="text-lg font-semibold">Application Settings</h1>
        <p className="mt-0.5 text-xs text-muted">Preferences, local data and runtime information</p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
          {error}
        </div>
      )}
      {message && (
        <div className="mt-4 rounded-xl border border-ok/40 bg-ok/10 p-3 text-xs text-ok">{message}</div>
      )}

      <section className="mt-4 rounded-xl border border-line bg-panel p-4">
        <h2 className="text-sm font-semibold">Appearance</h2>
        <p className="mt-0.5 text-[11px] text-muted">The choice is stored in this browser.</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (theme !== 'light') onToggleTheme()
            }}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
              theme === 'light'
                ? 'border-accent/50 bg-accent-soft text-accent-strong'
                : 'border-line text-muted hover:border-accent/30'
            }`}
          >
            <Sun size={14} />
            Light
          </button>
          <button
            type="button"
            onClick={() => {
              if (theme !== 'dark') onToggleTheme()
            }}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
              theme === 'dark'
                ? 'border-accent/50 bg-accent-soft text-accent-strong'
                : 'border-line text-muted hover:border-accent/30'
            }`}
          >
            <Moon size={14} />
            Dark
          </button>
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-line bg-panel p-4">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-muted" />
          <h2 className="text-sm font-semibold">Local data</h2>
        </div>
        <p className="mt-0.5 text-[11px] text-muted">
          Everything is stored on this PC in <code className="font-mono">data/arhlinx.db</code>. Nothing
          leaves the machine.
        </p>

        <div className="mt-3 space-y-2">
          {CLEAR_OPTIONS.map((option) => (
            <div
              key={option.scope}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium">{option.label}</p>
                <p className="text-[11px] text-muted">{option.description}</p>
              </div>

              {pending === option.scope ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void clear(option.scope)}
                    disabled={busy}
                    className="rounded-lg bg-danger px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-60"
                  >
                    {busy ? 'Deleting…' : 'Confirm delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPending(null)}
                    className="rounded-lg border border-line px-3 py-1.5 text-[11px] text-muted"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPending(option.scope)}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[11px] text-fg transition-colors hover:border-danger/40 hover:text-danger"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-line bg-panel p-4">
        <div className="flex items-center gap-2">
          <Server size={14} className="text-muted" />
          <h2 className="text-sm font-semibold">Runtime</h2>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">App</p>
            <p className="mt-0.5">{APP_VERSION}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Local API</p>
            <p className={`mt-0.5 ${health?.ok ? 'text-ok' : 'text-danger'}`}>
              {health?.ok ? 'connected' : 'unreachable'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Node</p>
            <p className="mt-0.5">{health?.version ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Host</p>
            <p className="mt-0.5 truncate">{overview?.hostname ?? '—'}</p>
          </div>
        </div>
      </section>

      <p className="mt-4 text-center text-[11px] text-muted">
        ArhLinx · Complete Network Control · read-only Windows telemetry, no cloud
      </p>
    </div>
  )
}
