import { useCallback, useEffect, useState } from 'react'
import { Check, ClipboardCopy } from 'lucide-react'
import type { WhoAmI } from '@shared/types'
import { apiGet } from '../lib/api'
import {
  describeDevice,
  readConnectionHints,
  type ClientSpeedResult,
  type ConnectionHint,
  type DeviceProfile,
  type LatencyResult
} from './device'
import { useHistory } from './history'
import { OverviewPanel } from './OverviewPanel'
import { SpeedPanel } from './SpeedPanel'
import { DiagnosticsPanel } from './DiagnosticsPanel'

type Tab = 'speed' | 'overview' | 'diagnostics'

const TABS: { id: Tab; label: string }[] = [
  { id: 'speed', label: 'Speed test' },
  { id: 'overview', label: 'Overview' },
  { id: 'diagnostics', label: 'Diagnostics' }
]

export function Dashboard(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('speed')
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
    <div className="mx-auto w-full max-w-5xl px-5 pb-12 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line">
        <nav className="flex items-center gap-7">
          {TABS.map((item) => {
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative pb-3 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                  active ? 'text-fg' : 'text-muted hover:text-fg'
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-accent" />
                )}
              </button>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={() => void copyReport()}
          className="mb-2 flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-[11px] font-medium text-fg transition-colors hover:border-accent/40"
        >
          {copied ? <Check size={13} className="text-ok" /> : <ClipboardCopy size={13} />}
          {copied ? 'Copied' : 'Copy report'}
        </button>
      </div>

      <div className="mt-6">
        {tab === 'speed' && (
          <SpeedPanel
            history={speedHistory.items}
            onResult={speedHistory.add}
            onClear={speedHistory.clear}
          />
        )}

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

        {tab === 'diagnostics' && <DiagnosticsPanel onLatency={setLatency} />}
      </div>
    </div>
  )
}
