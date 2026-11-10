import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, Gauge, Timer, Waves } from 'lucide-react'
import { apiGet } from '../lib/api'
import type { SpeedHistory, SpeedPhase, SpeedTestResult } from '@shared/types'

const PHASES: { id: SpeedPhase; label: string }[] = [
  { id: 'ping', label: 'Ping' },
  { id: 'download', label: 'Download' },
  { id: 'upload', label: 'Upload' }
]

function value(value: number | null, digits = 1): string {
  return value === null || !Number.isFinite(value) ? '—' : value.toFixed(digits)
}

function ResultCard({
  icon,
  label,
  value: resultValue,
  unit,
  accent
}: {
  icon: React.JSX.Element
  label: string
  value: string
  unit: string
  accent?: string
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-[11px] font-medium font-mono uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-2 flex items-baseline gap-1">
        <span className={`text-3xl font-semibold tabular-nums ${accent ?? 'text-fg'}`}>{resultValue}</span>
        <span className="text-xs text-muted">{unit}</span>
      </p>
    </div>
  )
}

export function SpeedPage(): React.JSX.Element {
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<SpeedPhase | null>(null)
  const [result, setResult] = useState<SpeedTestResult | null>(null)
  const [history, setHistory] = useState<SpeedTestResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const sourceRef = useRef<EventSource | null>(null)

  const loadHistory = useCallback(async (): Promise<void> => {
    try {
      const data = await apiGet<SpeedHistory>('/api/speed/history?limit=15')
      setHistory(data.results)
      setResult((current) => current ?? data.results[0] ?? null)
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : String(historyError))
    }
  }, [])

  useEffect(() => {
    void loadHistory()
    return () => {
      sourceRef.current?.close()
    }
  }, [loadHistory])

  const start = (): void => {
    if (running) return
    setError(null)
    setRunning(true)
    setPhase('ping')

    const source = new EventSource('/api/speed/stream')
    sourceRef.current = source

    source.addEventListener('phase', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent<string>).data) as { phase: SpeedPhase }
        setPhase(data.phase)
      } catch {
        // ignore malformed frame
      }
    })

    source.addEventListener('result', (event) => {
      try {
        setResult(JSON.parse((event as MessageEvent<string>).data) as SpeedTestResult)
      } catch {
        setError('The speed test returned an unreadable result.')
      }
      source.close()
      sourceRef.current = null
      setRunning(false)
      setPhase(null)
      void loadHistory()
    })

    source.addEventListener('failure', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent<string>).data) as { message: string }
        setError(data.message)
      } catch {
        setError('The speed test failed.')
      }
      source.close()
      sourceRef.current = null
      setRunning(false)
      setPhase(null)
    })

    source.onerror = () => {
      if (sourceRef.current !== source) return
      setError('Lost connection to the local service during the test.')
      source.close()
      sourceRef.current = null
      setRunning(false)
      setPhase(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Internet Speed Test</h1>
          <p className="mt-0.5 text-xs text-muted">
            Measured from this PC with {result?.target ?? 'speed.cloudflare.com'}
          </p>
        </div>
        <button
          type="button"
          onClick={start}
          disabled={running}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          <Gauge size={15} className={running ? 'animate-pulse' : ''} />
          {running ? 'Testing…' : 'Start test'}
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResultCard
          icon={<ArrowDown size={14} />}
          label="Download"
          value={value(result?.downloadMbps ?? null)}
          unit="Mbps"
          accent="text-ok"
        />
        <ResultCard
          icon={<ArrowUp size={14} />}
          label="Upload"
          value={value(result?.uploadMbps ?? null)}
          unit="Mbps"
          accent="text-accent-strong"
        />
        <ResultCard icon={<Timer size={14} />} label="Ping" value={value(result?.pingMs ?? null, 0)} unit="ms" />
        <ResultCard
          icon={<Waves size={14} />}
          label="Jitter"
          value={value(result?.jitterMs ?? null, 1)}
          unit="ms"
        />
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-3">
        <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted">Progress</span>
        <div className="flex flex-1 items-center gap-2">
          {PHASES.map((item, index) => {
            const active = phase === item.id
            const done =
              !running &&
              result !== null &&
              PHASES.findIndex((candidate) => candidate.id === phase) === -1
            const reached =
              done ||
              (phase !== null && index <= PHASES.findIndex((candidate) => candidate.id === phase))
            return (
              <div key={item.id} className="flex flex-1 items-center gap-2">
                <div
                  className={`h-1 flex-1 rounded-full ${
                    active ? 'bg-accent' : reached ? 'bg-ok/60' : 'bg-line'
                  }`}
                />
                <span
                  className={`text-[10px] ${active ? 'text-accent' : reached ? 'text-ok' : 'text-muted'}`}
                >
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold">History</h2>
            <p className="mt-0.5 text-xs text-muted">Saved on this PC, newest first</p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-line bg-panel/50 p-8 text-center text-xs text-muted">
            No tests yet. Run one to start the history.
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border border-line bg-panel">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line text-[10px] font-mono uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 text-right font-medium">Down</th>
                  <th className="px-4 py-2 text-right font-medium">Up</th>
                  <th className="px-4 py-2 text-right font-medium">Ping</th>
                  <th className="px-4 py-2 text-right font-medium">Jitter</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-2 text-muted">{new Date(entry.at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{entry.downloadMbps.toFixed(1)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{entry.uploadMbps.toFixed(1)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{entry.pingMs.toFixed(0)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{entry.jitterMs.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
