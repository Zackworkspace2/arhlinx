import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, ArrowDown, ArrowUp, RefreshCw, Send } from 'lucide-react'
import { apiGet } from '../lib/api'
import type { ConnectionsResult, PingResult, Traffic } from '@shared/types'

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`
}

export function MonitorPage(): React.JSX.Element {
  const [traffic, setTraffic] = useState<Traffic | null>(null)
  const [connections, setConnections] = useState<ConnectionsResult | null>(null)
  const [ping, setPing] = useState<PingResult | null>(null)
  const [host, setHost] = useState('1.1.1.1')
  const [port, setPort] = useState('443')
  const [pinging, setPinging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const loadConnections = useCallback(async (): Promise<void> => {
    try {
      setConnections(await apiGet<ConnectionsResult>('/api/monitor/connections'))
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError))
    }
  }, [])

  useEffect(() => {
    let active = true
    const tick = async (): Promise<void> => {
      try {
        const data = await apiGet<Traffic>('/api/monitor/traffic')
        if (active) setTraffic(data)
      } catch (trafficError) {
        if (active) setError(trafficError instanceof Error ? trafficError.message : String(trafficError))
      }
    }
    void tick()
    void loadConnections()
    const timer = setInterval(() => void tick(), 5000)
    const connectionTimer = setInterval(() => void loadConnections(), 15000)
    return () => {
      active = false
      clearInterval(timer)
      clearInterval(connectionTimer)
    }
  }, [loadConnections])

  const runPing = async (): Promise<void> => {
    const parsedPort = Number.parseInt(port, 10)
    if (!Number.isFinite(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      setError('Port must be between 1 and 65535.')
      return
    }
    setPinging(true)
    setError(null)
    try {
      setPing(
        await apiGet<PingResult>(
          `/api/monitor/ping?host=${encodeURIComponent(host)}&port=${parsedPort}&count=6`
        )
      )
    } catch (pingError) {
      setError(pingError instanceof Error ? pingError.message : String(pingError))
    } finally {
      setPinging(false)
    }
  }

  const rows = connections?.connections ?? []
  const needle = filter.trim().toLowerCase()
  const visible = (needle
    ? rows.filter((row) =>
        [row.local, row.remote, row.state, row.protocol].some((value) =>
          String(value).toLowerCase().includes(needle)
        )
      )
    : rows
  ).slice(0, 200)

  const states = connections?.summary.byState ?? {}

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Network Monitor</h1>
          <p className="mt-0.5 text-xs text-muted">Live traffic, active connections and diagnostics</p>
        </div>
        <button
          type="button"
          onClick={() => void loadConnections()}
          className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-fg transition-colors hover:border-accent/40"
        >
          <RefreshCw size={14} />
          Refresh connections
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="flex items-center gap-2 text-muted">
            <ArrowDown size={14} />
            <span className="text-[11px] font-mono uppercase tracking-[0.12em]">Down now</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-ok">
            {traffic ? `${formatBytes(traffic.rateRx)}/s` : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="flex items-center gap-2 text-muted">
            <ArrowUp size={14} />
            <span className="text-[11px] font-mono uppercase tracking-[0.12em]">Up now</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-accent-strong">
            {traffic ? `${formatBytes(traffic.rateTx)}/s` : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="flex items-center gap-2 text-muted">
            <Activity size={14} />
            <span className="text-[11px] font-mono uppercase tracking-[0.12em]">Connections</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{connections ? connections.total : '—'}</p>
          <p className="mt-0.5 text-[11px] text-muted">
            {states.ESTABLISHED ?? 0} established · {states.LISTENING ?? 0} listening
          </p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="flex items-center gap-2 text-muted">
            <Activity size={14} />
            <span className="text-[11px] font-mono uppercase tracking-[0.12em]">Today</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">
            {traffic ? formatBytes(traffic.today.rx + traffic.today.tx) : '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {traffic
              ? `${formatBytes(traffic.today.rx)} down · ${formatBytes(traffic.today.tx)} up`
              : 'waiting for samples'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-panel p-4">
          <h2 className="text-sm font-semibold">Diagnostics</h2>
          <p className="mt-0.5 text-[11px] text-muted">TCP handshake latency, no ICMP needed</p>
          <div className="mt-3 flex gap-2">
            <input
              value={host}
              onChange={(event) => setHost(event.target.value)}
              placeholder="host"
              className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-2 py-1.5 text-xs text-fg outline-none focus:border-accent/50"
            />
            <input
              value={port}
              onChange={(event) => setPort(event.target.value)}
              placeholder="port"
              className="w-16 rounded-lg border border-line bg-canvas px-2 py-1.5 text-xs text-fg outline-none focus:border-accent/50"
            />
            <button
              type="button"
              onClick={() => void runPing()}
              disabled={pinging}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-strong disabled:opacity-60"
            >
              <Send size={12} />
              {pinging ? '…' : 'Test'}
            </button>
          </div>

          {ping && (
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Avg</p>
                <p className="mt-0.5">{ping.avgMs === null ? '—' : `${ping.avgMs} ms`}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Loss</p>
                <p className={`mt-0.5 ${ping.lossPercent > 0 ? 'text-warn' : 'text-ok'}`}>
                  {ping.lossPercent}%
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Min</p>
                <p className="mt-0.5">{ping.minMs === null ? '—' : `${ping.minMs} ms`}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Max</p>
                <p className="mt-0.5">{ping.maxMs === null ? '—' : `${ping.maxMs} ms`}</p>
              </div>
              <p className="col-span-2 text-[10px] text-muted">
                {ping.received}/{ping.attempts} replies from {ping.host}:{ping.port}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-line bg-panel p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Connection states</h2>
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter"
              className="rounded-lg border border-line bg-canvas px-2 py-1 text-[11px] text-fg outline-none focus:border-accent/50"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(states).map(([state, count]) => (
              <span key={state} className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">
                {state} {count}
              </span>
            ))}
            {Object.keys(states).length === 0 && (
              <span className="text-[11px] text-muted">No data yet.</span>
            )}
          </div>

          <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-line">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-panel text-[10px] font-mono uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Proto</th>
                  <th className="px-2 py-1.5 font-medium">Local</th>
                  <th className="px-2 py-1.5 font-medium">Remote</th>
                  <th className="px-2 py-1.5 font-medium">State</th>
                  <th className="px-2 py-1.5 text-right font-medium">PID</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row, index) => (
                  <tr key={`${row.local}-${row.remote}-${index}`} className="border-t border-line/60">
                    <td className="px-2 py-1 text-muted">{row.protocol}</td>
                    <td className="px-2 py-1 font-mono">{row.local}</td>
                    <td className="px-2 py-1 font-mono">{row.remote}</td>
                    <td className="px-2 py-1 text-muted">{row.state ?? '—'}</td>
                    <td className="px-2 py-1 text-right text-muted">{row.pid ?? '—'}</td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2 py-6 text-center text-muted">
                      {connections?.error ?? 'No connections reported.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
