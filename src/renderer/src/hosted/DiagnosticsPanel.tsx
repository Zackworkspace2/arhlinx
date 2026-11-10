import { useEffect, useState } from 'react'
import { Activity, CheckCircle2, Globe2, Network, RadioTower, XCircle } from 'lucide-react'
import {
  checkReachability,
  collectLocalAddresses,
  detectCapabilities,
  measureLatency,
  type Capabilities,
  type LatencyResult,
  type Reachability
} from './device'

interface DiagnosticsPanelProps {
  onLatency: (result: LatencyResult) => void
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/60 py-2 last:border-0">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="truncate text-xs">{value}</span>
    </div>
  )
}

export function DiagnosticsPanel({ onLatency }: DiagnosticsPanelProps): React.JSX.Element {
  const [latency, setLatency] = useState<LatencyResult | null>(null)
  const [reachability, setReachability] = useState<Reachability[] | null>(null)
  const [addresses, setAddresses] = useState<string[] | null>(null)
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    void detectCapabilities().then(setCapabilities)
  }, [])

  const runLatency = async (): Promise<void> => {
    setBusy('latency')
    const result = await measureLatency(10)
    setLatency(result)
    onLatency(result)
    setBusy(null)
  }

  const runReachability = async (): Promise<void> => {
    setBusy('reach')
    setReachability(await checkReachability())
    setBusy(null)
  }

  const runAddresses = async (): Promise<void> => {
    setBusy('addresses')
    setAddresses(await collectLocalAddresses())
    setBusy(null)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-muted" />
            <h2 className="text-sm font-semibold">Latency &amp; jitter</h2>
          </div>
          <button
            type="button"
            onClick={() => void runLatency()}
            disabled={busy !== null}
            className="rounded-lg border border-line px-3 py-1.5 text-[11px] transition-colors hover:border-accent/40 disabled:opacity-50"
          >
            {busy === 'latency' ? 'Measuring…' : 'Measure'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Average</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {latency ? `${latency.avgMs} ms` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Jitter</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {latency ? `${latency.jitterMs} ms` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Min / max</p>
            <p className="mt-1 text-xs tabular-nums">
              {latency ? `${latency.minMs} / ${latency.maxMs} ms` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Loss</p>
            <p className={`mt-1 text-xs tabular-nums ${latency && latency.lossPercent > 0 ? 'text-warn' : ''}`}>
              {latency ? `${latency.lossPercent}%` : '—'}
            </p>
          </div>
        </div>

        {latency && latency.samples.length > 0 && (
          <div className="mt-4 flex h-16 items-end gap-1">
            {latency.samples.map((sample, index) => (
              <div
                key={`${sample}-${index}`}
                className="flex-1 rounded-sm bg-accent/60"
                style={{ height: `${Math.max(8, Math.min(100, (sample / Math.max(...latency.samples)) * 100))}%` }}
                title={`${sample} ms`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe2 size={15} className="text-muted" />
            <h2 className="text-sm font-semibold">Reachability</h2>
          </div>
          <button
            type="button"
            onClick={() => void runReachability()}
            disabled={busy !== null}
            className="rounded-lg border border-line px-3 py-1.5 text-[11px] transition-colors hover:border-accent/40 disabled:opacity-50"
          >
            {busy === 'reach' ? 'Checking…' : 'Check'}
          </button>
        </div>

        <div className="mt-3">
          {reachability === null ? (
            <p className="text-xs text-muted">Test access to common services.</p>
          ) : (
            reachability.map((target) => (
              <div
                key={target.name}
                className="flex items-center justify-between border-b border-line/60 py-2 last:border-0"
              >
                <span className="flex items-center gap-2 text-xs">
                  {target.ok ? (
                    <CheckCircle2 size={13} className="text-ok" />
                  ) : (
                    <XCircle size={13} className="text-danger" />
                  )}
                  {target.name}
                </span>
                <span className="text-[11px] text-muted tabular-nums">
                  {target.ok ? `${target.ms} ms` : 'unreachable'}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network size={15} className="text-muted" />
            <h2 className="text-sm font-semibold">Local addresses</h2>
          </div>
          <button
            type="button"
            onClick={() => void runAddresses()}
            disabled={busy !== null}
            className="rounded-lg border border-line px-3 py-1.5 text-[11px] transition-colors hover:border-accent/40 disabled:opacity-50"
          >
            {busy === 'addresses' ? 'Scanning…' : 'Scan'}
          </button>
        </div>
        <div className="mt-3">
          {addresses === null ? (
            <p className="text-xs text-muted">Show addresses this browser exposes to the page.</p>
          ) : addresses.length === 0 ? (
            <p className="text-xs text-muted">No host candidates shared — modern browsers mask them.</p>
          ) : (
            addresses.map((address) => (
              <Row key={address} label="Candidate" value={address} />
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-center gap-2">
          <RadioTower size={15} className="text-muted" />
          <h2 className="text-sm font-semibold">Capabilities</h2>
        </div>
        <div className="mt-3">
          <Row label="WebGL" value={capabilities?.webgl ?? '—'} />
          <Row label="WebAssembly" value={capabilities?.wasm ? 'supported' : 'no'} />
          <Row label="Local storage" value={capabilities?.storage ? 'available' : 'blocked'} />
          <Row label="Service worker" value={capabilities?.serviceWorker ? 'available' : 'no'} />
          <Row label="Cookies" value={capabilities?.cookies ? 'enabled' : 'disabled'} />
          <Row label="WebRTC" value={capabilities?.webrtc ? 'available' : 'no'} />
        </div>
      </section>
    </div>
  )
}
