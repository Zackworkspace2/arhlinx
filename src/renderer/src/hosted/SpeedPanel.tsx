import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Play, RotateCw, Timer, Trash2, Waves } from 'lucide-react'
import { runSpeedTestLive, type ClientSpeedResult, type LiveUpdate } from './device'

interface SpeedPanelProps {
  history: ClientSpeedResult[]
  onResult: (result: ClientSpeedResult) => void
  onClear: () => void
}

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
        <span className="font-mono text-[10px] uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-2 text-[30px] font-semibold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{unit}</p>
    </div>
  )
}

export function SpeedPanel({ history, onResult, onClear }: SpeedPanelProps): React.JSX.Element {
  const [running, setRunning] = useState(false)
  const [update, setUpdate] = useState<LiveUpdate | null>(null)
  const [error, setError] = useState<string | null>(null)

  const latest = history[0] ?? null

  const readout = useMemo(() => {
    if (update && update.phase !== 'done') {
      return {
        value: update.mbps,
        phase: update.phase === 'ping' ? 'Latency' : update.phase === 'download' ? 'Download' : 'Upload',
        unit: update.phase === 'ping' ? 'ms' : 'Mbps',
        live: true
      }
    }
    return {
      value: latest?.downloadMbps ?? 0,
      phase: 'Download',
      unit: 'Mbps',
      live: false
    }
  }, [update, latest])

  const run = async (): Promise<void> => {
    setRunning(true)
    setError(null)
    try {
      const result = await runSpeedTestLive(setUpdate)
      onResult(result)
      setUpdate({
        phase: 'done',
        mbps: result.downloadMbps ?? 0,
        pingMs: result.pingMs,
        jitterMs: null,
        downloadMbps: result.downloadMbps,
        uploadMbps: result.uploadMbps
      })
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
      <section className="rounded border border-line bg-panel px-5 py-12 text-center sm:py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          {running ? readout.phase : 'Connection speed'}
        </p>

        <p
          data-testid="speed-readout"
          className="mt-4 text-[92px] font-semibold leading-none tracking-[-0.03em] tabular-nums sm:text-[120px]"
        >
          {readout.value > 0 ? readout.value.toFixed(readout.value >= 100 ? 0 : 1) : '—'}
        </p>

        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {readout.unit}
        </p>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => void run()}
            disabled={running}
            className="flex items-center gap-2 rounded bg-accent px-9 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
          >
            {running ? <RotateCw size={16} className="animate-spin" /> : <Play size={16} className="fill-current" />}
            {running ? 'Testing…' : latest ? 'Test again' : 'Start test'}
          </button>
        </div>

        {error && <p className="mt-4 font-mono text-[11px] text-warn">{error}</p>}
      </section>

      <section className="overflow-hidden rounded border border-line bg-panel">
        <div className="grid grid-cols-2 sm:grid-cols-4 sm:divide-x sm:divide-line">
          <Metric icon={<ArrowDown size={13} />} label="Download" value={readable(download)} unit="Mbps" />
          <Metric icon={<ArrowUp size={13} />} label="Upload" value={readable(upload)} unit="Mbps" />
          <Metric icon={<Timer size={13} />} label="Ping" value={readable(ping, 0)} unit="ms" />
          <Metric icon={<Waves size={13} />} label="Jitter" value={readable(jitter, 1)} unit="ms" />
        </div>
      </section>

      <section className="rounded border border-line bg-panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Recent runs</h3>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Stored locally
            </p>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1.5 rounded border border-line px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-danger/40 hover:text-danger"
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
                <span className="w-24 shrink-0 font-mono text-[10px] text-muted">
                  {new Date(item.at).toLocaleTimeString()}
                </span>
                <div className="h-1.5 flex-1 rounded-sm bg-panel-2">
                  <div
                    className="h-full rounded-sm bg-accent"
                    style={{ width: `${Math.round(((item.downloadMbps ?? 0) / historyMax) * 100)}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-[11px] font-medium tabular-nums">
                  {readable(item.downloadMbps)} <span className="text-muted">↓</span>
                </span>
                <span className="w-20 shrink-0 text-right font-mono text-[11px] text-muted tabular-nums">
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
