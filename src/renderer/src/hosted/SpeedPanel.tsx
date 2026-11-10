import { useState } from 'react'
import { ArrowDown, ArrowUp, Gauge, Timer, Trash2 } from 'lucide-react'
import { runClientSpeedTest, type ClientSpeedResult } from './device'

interface SpeedPanelProps {
  history: ClientSpeedResult[]
  onResult: (result: ClientSpeedResult) => void
  onClear: () => void
}

function metric(value: number | null, unit: string, digits = 1): string {
  return value === null || !Number.isFinite(value) ? '—' : `${value.toFixed(digits)} ${unit}`
}

export function SpeedPanel({ history, onResult, onClear }: SpeedPanelProps): React.JSX.Element {
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<'ping' | 'download' | 'upload' | null>(null)
  const [latest, setLatest] = useState<ClientSpeedResult | null>(history[0] ?? null)
  const [error, setError] = useState<string | null>(null)

  const run = async (): Promise<void> => {
    setRunning(true)
    setError(null)
    try {
      const result = await runClientSpeedTest(setPhase)
      setLatest(result)
      onResult(result)
      if (result.downloadMbps === null && result.uploadMbps === null) {
        setError('The speed endpoints could not be reached from this network.')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setRunning(false)
      setPhase(null)
    }
  }

  const max = Math.max(1, ...history.map((item) => item.downloadMbps ?? 0))

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Speed test</h2>
            <p className="mt-0.5 text-xs text-muted">
              Download, upload and latency measured from this browser.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void run()}
            disabled={running}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
          >
            <Gauge size={14} className={running ? 'animate-pulse' : ''} />
            {running ? `Testing ${phase ?? '…'}` : 'Start test'}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line p-4">
            <div className="flex items-center gap-2 text-muted">
              <ArrowDown size={13} />
              <span className="text-[10px] uppercase tracking-[0.14em]">Download</span>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-ok">
              {metric(latest?.downloadMbps ?? null, 'Mbps')}
            </p>
          </div>
          <div className="rounded-xl border border-line p-4">
            <div className="flex items-center gap-2 text-muted">
              <ArrowUp size={13} />
              <span className="text-[10px] uppercase tracking-[0.14em]">Upload</span>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-accent-strong">
              {metric(latest?.uploadMbps ?? null, 'Mbps')}
            </p>
          </div>
          <div className="rounded-xl border border-line p-4">
            <div className="flex items-center gap-2 text-muted">
              <Timer size={13} />
              <span className="text-[10px] uppercase tracking-[0.14em]">Latency</span>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {metric(latest?.pingMs ?? null, 'ms', 0)}
            </p>
          </div>
        </div>

        {error && <p className="mt-3 text-[11px] text-warn">{error}</p>}
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">History</h3>
            <p className="mt-0.5 text-[11px] text-muted">Stored in this browser only</p>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:border-danger/40 hover:text-danger"
            >
              <Trash2 size={12} />
              Clear
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="mt-4 text-xs text-muted">No runs yet. Your results will appear here.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {history.slice(0, 8).map((item) => (
              <div key={item.at} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-[10px] text-muted">
                  {new Date(item.at).toLocaleTimeString()}
                </span>
                <div className="h-2 flex-1 rounded-full bg-panel-2">
                  <div
                    className="h-full rounded-full bg-accent/70"
                    style={{ width: `${Math.round(((item.downloadMbps ?? 0) / max) * 100)}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-[11px] tabular-nums">
                  {metric(item.downloadMbps, 'Mbps')}
                </span>
                <span className="w-20 shrink-0 text-right text-[11px] text-muted tabular-nums">
                  {metric(item.uploadMbps, 'Mbps')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
