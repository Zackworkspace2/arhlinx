import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Play, RotateCw, Timer, Trash2, Waves } from 'lucide-react'
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

function Metric({
  icon,
  label,
  value,
  unit
}: {
  icon: React.JSX.Element
  label: string
  value: string
  unit: string
}): React.JSX.Element {
  return (
    <div className="px-4 py-5 text-center">
      <div className="flex items-center justify-center gap-1.5 text-muted">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="mt-2 text-[32px] font-semibold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted">{unit}</p>
    </div>
  )
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
        running: update.phase !== 'ping' || update.mbps > 0
      }
    }
    return {
      value: latest?.downloadMbps ?? 0,
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
        if (candidate > max * 0.92) {
          const bigger = MAX_STEPS.find((step) => step > candidate)
          if (bigger) setMax(bigger)
        }
      })
      onResult(result)
      setUpdate({
        phase: 'done',
        mbps: result.downloadMbps ?? 0,
        pingMs: result.pingMs,
        jitterMs: null,
        downloadMbps: result.downloadMbps,
        uploadMbps: result.uploadMbps
      })
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
    <div className="space-y-5">
      <section className="rounded-[28px] border border-line bg-panel px-5 pb-8 pt-9 shadow-[0_24px_60px_-40px_rgba(11,18,32,0.35)] sm:px-10 sm:pb-10 sm:pt-12">
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-accent">Speed test</p>
          <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px]">
            How fast is your connection?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted">
            Download, upload and latency measured live from this browser.
          </p>
        </div>

        <div className="mt-7">
          <Gauge value={display.value} max={max} unit={display.unit} phase={display.phase} running={display.running} />
        </div>

        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => void run()}
            disabled={running}
            aria-label={running ? 'Test in progress' : 'Start speed test'}
            className="group grid size-[88px] place-items-center rounded-full bg-accent text-white shadow-[0_18px_40px_-12px_rgba(11,92,255,0.65)] transition-transform duration-200 hover:scale-[1.03] hover:bg-accent-strong disabled:scale-100 disabled:opacity-70"
          >
            <span className="flex flex-col items-center gap-1">
              {running ? (
                <RotateCw size={22} className="animate-spin" />
              ) : (
                <Play size={22} className="ml-0.5 fill-current" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-[0.16em]">
                {running ? 'Busy' : 'Go'}
              </span>
            </span>
          </button>
        </div>

        {error && <p className="mt-4 text-center text-[11px] text-warn">{error}</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
          <Metric icon={<ArrowDown size={13} />} label="Download" value={readable(download)} unit="Mbps" />
          <Metric icon={<ArrowUp size={13} />} label="Upload" value={readable(upload)} unit="Mbps" />
          <Metric icon={<Timer size={13} />} label="Ping" value={readable(ping, 0)} unit="ms" />
          <Metric icon={<Waves size={13} />} label="Jitter" value={readable(jitter, 1)} unit="ms" />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Recent runs</h3>
            <p className="mt-0.5 text-[11px] text-muted">Stored locally in this browser</p>
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
          <p className="mt-4 text-xs text-muted">No runs yet — start a test above.</p>
        ) : (
          <div className="mt-4 space-y-2.5">
            {history.slice(0, 8).map((item) => (
              <div key={item.at} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-[10px] text-muted">
                  {new Date(item.at).toLocaleTimeString()}
                </span>
                <div className="h-1.5 flex-1 rounded-full bg-panel-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-cyan-400"
                    style={{ width: `${Math.round(((item.downloadMbps ?? 0) / historyMax) * 100)}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-[11px] font-medium tabular-nums">
                  {readable(item.downloadMbps)} <span className="text-muted">↓</span>
                </span>
                <span className="w-20 shrink-0 text-right text-[11px] text-muted tabular-nums">
                  {readable(item.uploadMbps)} <span>↑</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
