import { useCallback, useEffect, useState } from 'react'
import { Check, ClipboardCopy, Gauge, LayoutDashboard, Stethoscope, Timer } from 'lucide-react'
import type { WhoAmI } from '@shared/types'
import { apiGet } from '../lib/api'
import { describeDevice, readConnectionHints, type ClientSpeedResult, type ConnectionHint, type DeviceProfile, type LatencyResult } from './device'
import { useHistory } from './history'
import { OverviewPanel } from './OverviewPanel'
import { SpeedPanel } from './SpeedPanel'
import { DiagnosticsPanel } from './DiagnosticsPanel'

type Tab = 'overview' | 'speed' | 'diagnostics'

const TABS: { id: Tab; label: string; icon: React.JSX.Element }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={14} /> },
  { id: 'speed', label: 'Speed', icon: <Gauge size={14} /> },
  { id: 'diagnostics', label: 'Diagnostics', icon: <Stethoscope size={14} /> }
]

export function Dashboard(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('overview')
  const [profile, setProfile] = useState<DeviceProfile | null>(null)
  const [hints, setHints] = useState<ConnectionHint | null>(null)
  const [whoami, setWhoami] = useState<WhoAmI | null>(null)
  const [latency, setLatency] = useState<LatencyResult | null>(null)
  const [copied, setCopied] = useState(false)
  const speedHistory = useHistory<ClientSpeedResult>('arhlinx.speed', 12)

  const loadWhoami = useCallback(async (): Promise<void> => {
    try {
      setWhoami(await apiGet<WhoAmI>('/api/whoami'))
    } catch {
      setWhoami(null)
    }
  }, [])

  useEffect(() => {
    setProfile(describeDevice())
    setHints(readConnectionHints())
    void loadWhoami()
  }, [loadWhoami])

  const latestSpeed = speedHistory.items[0] ?? null

  const copyReport = async (): Promise<void> => {
    const report = {
      generatedAt: new Date().toISOString(),
      device: profile,
      connection: hints,
      network: whoami,
      lastSpeedTest: latestSpeed,
      latency
    }
    const text = JSON.stringify(report, null, 2)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const area = document.createElement('textarea')
      area.value = text
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Device &amp; connection</h1>
          <p className="mt-0.5 text-xs text-muted">
            Live readings for this browser, its network path and its capabilities.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void copyReport()}
          className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-fg transition-colors hover:border-accent/40"
        >
          {copied ? <Check size={14} className="text-ok" /> : <ClipboardCopy size={14} />}
          {copied ? 'Copied' : 'Copy report'}
        </button>
      </div>

      <nav className="mt-5 flex gap-1 overflow-x-auto rounded-xl border border-line bg-panel p-1">
        {TABS.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs transition-colors ${
                active
                  ? 'bg-accent-soft font-medium text-accent-strong'
                  : 'text-muted hover:bg-panel-2 hover:text-fg'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-4">
        {tab === 'overview' && (
          <OverviewPanel
            profile={profile}
            whoami={whoami}
            hints={hints}
            latestSpeed={latestSpeed}
            latencyJitter={latency?.jitterMs ?? null}
            onOpenSpeed={() => setTab('speed')}
            onOpenDiagnostics={() => setTab('diagnostics')}
          />
        )}

        {tab === 'speed' && (
          <SpeedPanel
            history={speedHistory.items}
            onResult={speedHistory.add}
            onClear={speedHistory.clear}
          />
        )}

        {tab === 'diagnostics' && <DiagnosticsPanel onLatency={setLatency} />}
      </div>

      {latency && (
        <p className="mt-4 flex items-center gap-2 text-[11px] text-muted">
          <Timer size={12} />
          Last latency check: {latency.avgMs} ms average, {latency.jitterMs} ms jitter
        </p>
      )}
    </div>
  )
}
