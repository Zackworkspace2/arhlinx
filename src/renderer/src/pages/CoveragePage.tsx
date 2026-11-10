import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Lightbulb, Radar, RefreshCw } from 'lucide-react'
import { apiGet } from '../lib/api'
import type { Coverage } from '@shared/types'

export function CoveragePage(): React.JSX.Element {
  const [data, setData] = useState<Coverage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      setData(await apiGet<Coverage>('/api/coverage'))
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const buckets = data?.signalBuckets ?? []
  const maxBucket = Math.max(1, ...buckets.map((bucket) => bucket.count))
  const channels = (data?.channels ?? []).slice(0, 12)
  const maxAps = Math.max(1, ...channels.map((channel) => channel.aps))

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Placement &amp; Coverage</h1>
          <p className="mt-0.5 text-xs text-muted">
            Signal distribution, channel congestion and placement advice from live scans
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-fg transition-colors hover:border-accent/40 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Scanning…' : 'Rescan'}
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {data?.scanError && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{data.scanError}</span>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Networks</p>
          <p className="mt-2 text-2xl font-semibold">{data ? data.networkCount : '—'}</p>
          <p className="mt-0.5 text-[11px] text-muted">
            {data ? `${data.apCount} access points` : 'scanning'}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Average signal</p>
          <p className="mt-2 text-2xl font-semibold">{data?.avgSignal === null || data?.avgSignal === undefined ? '—' : `${data.avgSignal}%`}</p>
          <p className="mt-0.5 text-[11px] text-muted">across visible networks</p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Strongest</p>
          <p className="mt-2 truncate text-sm font-semibold" title={data?.strongest?.ssid ?? ''}>
            {data?.strongest?.ssid ?? '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {data?.strongest ? `${data.strongest.signal}%` : 'no data'}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Open networks</p>
          <p className="mt-2 text-2xl font-semibold">{data ? data.openCount : '—'}</p>
          <p className="mt-0.5 text-[11px] text-muted">avoid for sensitive traffic</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="flex items-center gap-2">
            <Radar size={14} className="text-muted" />
            <h2 className="text-sm font-semibold">Signal distribution</h2>
          </div>
          <div className="mt-4 space-y-3">
            {buckets.map((bucket) => (
              <div key={bucket.label}>
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>{bucket.label}</span>
                  <span>{bucket.count}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-panel-2">
                  <div
                    className="h-full rounded-full bg-accent/70"
                    style={{ width: `${Math.round((bucket.count / maxBucket) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-panel p-4">
          <h2 className="text-sm font-semibold">Channel congestion</h2>
          <p className="mt-0.5 text-[11px] text-muted">Access points sharing each channel</p>
          <div className="mt-3 space-y-2">
            {channels.length === 0 && <p className="text-xs text-muted">No channel data.</p>}
            {channels.map((channel) => (
              <div key={`${channel.band}-${channel.channel}`}>
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>
                    {channel.band} · ch {channel.channel}
                  </span>
                  <span>
                    {channel.aps} AP{channel.aps === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-panel-2">
                  <div
                    className={`h-full rounded-full ${channel.aps > 2 ? 'bg-warn' : 'bg-ok/70'}`}
                    style={{ width: `${Math.round((channel.aps / maxAps) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-panel p-4">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-muted" />
          <h2 className="text-sm font-semibold">Placement advice</h2>
        </div>
        <ul className="mt-3 space-y-2 text-xs text-fg">
          {(data?.recommendations ?? []).map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" />
              <span>{line}</span>
            </li>
          ))}
          {(data?.recommendations ?? []).length === 0 && (
            <li className="text-muted">Scan to get recommendations.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
