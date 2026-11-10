import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, RotateCw, Timer, Trash2, Waves } from 'lucide-react'
import { runSpeedTestLive, type ClientSpeedResult, type LiveUpdate } from './device'
import { Gauge } from './Gauge'

interface SpeedPanelProps {
  history: ClientSpeedResult[]
  onResult: (result: ClientSpeedResult) => void
  onClear: () => void
}

const MAX_STEPS = [100, 250, 500, 1000]

function readable(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : value.toFixed(digits)
}

export function SpeedPanel({ history, onResult, onClear }: SpeedPanelProps): React.JSX.Element {
  const [running, setRunning] = useState(false)
  const [update, setUpdate] = useState<LiveUpdate | null>(null)
  const [max, setMax] = useState(100)
  const [error, setError] = useState<string | null>(null)

  const latest = history[0] ?? null

  const display = useMemo(() => {
    if (update && update.phase !== 'done') {
      return {
        value: update.mbps,
        phase: update.phase === 'ping' ? 'Ping' : update.phase === 'download' ? 'Download' : 'Upload',
        unit: update.phase === 'ping' ? 'ms' : 'Mbps',
        running: true
      }
    }
    const value = latest?.downloadMbps ?? null
    return {
      value: value ?? 0,
      phase: 'Download',
      unit: 'Mbps',
      running: false
    }
  }, [update, latest])

  const run = async (): Promise<void> => {
    setRunning(true)
    setError(null)
    setMax(100)

    try {
      const result = await runSpeedTestLive((next) => {
        setUpdate(next)
        const candidate = next.phase === 'upload' ? (next.uploadMbps ?? next.mbps) : next.mbps
        if (candidate > max) {
          const bigger = MAX_STEPS.find((step) => step > candidate)
          if (bigger) setMax(bigger)
        }
      })
      onResult(result)
      setUpdate({ phase: 'done', mbps: result.downloadMbps ?? 0, pingMs: result.pingMs, jitterMs: null, downloadMbps: result.downloadMbps, uploadMbps: result.uploadMbps })
      setMax(MAX_STEPS.find((step) => step >= (result.downloadMbps ?? 0) * 1.05) ?? 1000)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setRunning(false)
    }
  }

  const ping = update?.pingMs ?? null
  const jitter = update?.jitterMs ?? null
  const download = update?.downloadMbps ?? latest?.downloadMbps ?? null
  const upload = update?.uploadMbps ?? latest?.uploadMbps ?? null
  const historyMax = Math.max(1, ...history.map((item) => item.downloadMbps ?? 0))

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex-1">
            <Gauge value={display.value} max={max} unit={display.unit} phase={display.phase} running={display.running} />

            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={() => void run()}
                disabled={running}
                className="flex items-center gap-2 rounded bg-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
              >
                {running ? <RotateCw size={16} className="animate-spin" /> : <RotateCw size={16} />}
                {running ? 'Testing…' : latest ? 'Test again' : 'Go'}
              </button>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-3">
            <div className="rounded-xl border border-line p-4">
              <div className="flex items-center gap-2 text-muted">
                <ArrowDown size={13} />
                <span className="text-[10px] font-mono uppercase tracking-[0.14em]">Download</span>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-ok">
                {readable(download)} <span className="text-xs font-normal text-muted">Mbps</span>
              </p>
            </div>
            <div className="rounded-xl border border-line p-4">
              <div className="flex items-center gap-2 text-muted">
                <ArrowUp size={13} />
                <span className="text-[10px] font-mono uppercase tracking-[0.14em]">Upload</span>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-accent-strong">
                {readable(upload)} <span className="text-xs font-normal text-muted">Mbps</span>
              </p>
            </div>
            <div className="rounded-xl border border-line p-4">
              <div className="flex items-center gap-2 text-muted">
                <Timer size={13} />
                <span className="text-[10px] font-mono uppercase tracking-[0.14em]">Ping</span>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {readable(ping, 0)} <span className="text-xs font-normal text-muted">ms</span>
              </p>
            </div>
            <div className="rounded-xl border border-line p-4">
              <div className="flex items-center gap-2 text-muted">
                <Waves size={13} />
                <span className="text-[10px] font-mono uppercase tracking-[0.14em]">Jitter</span>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {readable(jitter, 1)} <span className="text-xs font-normal text-muted">ms</span>
              </p>
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-[11px] text-warn">{error}</p>}
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Recent runs</h3>
            <p className="mt-0.5 text-[11px] text-muted">Kept in this browser</p>
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
          <p className="mt-4 text-xs text-muted">Nothing recorded yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {history.slice(0, 8).map((item) => (
              <div key={item.at} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-[10px] text-muted">
                  {new Date(item.at).toLocaleTimeString()}
                </span>
                <div className="h-2 flex-1 rounded-full bg-panel-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-[#e8c06a]"
                    style={{ width: `${Math.round(((item.downloadMbps ?? 0) / historyMax) * 100)}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-[11px] tabular-nums">
                  {readable(item.downloadMbps)} Mbps
                </span>
                <span className="w-20 shrink-0 text-right text-[11px] text-muted tabular-nums">
                  {readable(item.uploadMbps)} Mbps
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
