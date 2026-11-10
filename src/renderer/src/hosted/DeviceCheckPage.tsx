import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Cpu,
  Globe,
  MapPin,
  Monitor,
  RefreshCw,
  Smartphone,
  Timer,
  Wifi
} from 'lucide-react'
import { apiGet } from '../lib/api'
import type { WhoAmI } from '@shared/types'
import {
  describeDevice,
  readConnectionHints,
  runClientSpeedTest,
  type ClientSpeedResult,
  type ConnectionHint,
  type DeviceProfile
} from './device'

function Card({
  icon,
  label,
  value,
  hint
}: {
  icon: React.JSX.Element
  label: string
  value: string
  hint?: string | undefined
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-2 truncate text-lg font-semibold text-fg">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-muted">{hint}</p>}
    </div>
  )
}

export function DeviceCheckPage(): React.JSX.Element {
  const [profile, setProfile] = useState<DeviceProfile | null>(null)
  const [hints, setHints] = useState<ConnectionHint | null>(null)
  const [whoami, setWhoami] = useState<WhoAmI | null>(null)
  const [whoamiError, setWhoamiError] = useState<string | null>(null)
  const [speed, setSpeed] = useState<ClientSpeedResult | null>(null)
  const [phase, setPhase] = useState<'ping' | 'download' | 'upload' | null>(null)
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  const loadWhoami = useCallback(async (): Promise<void> => {
    try {
      setWhoami(await apiGet<WhoAmI>('/api/whoami?probe=1'))
      setWhoamiError(null)
    } catch (error) {
      setWhoamiError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  useEffect(() => {
    setProfile(describeDevice())
    setHints(readConnectionHints())
    void loadWhoami()
  }, [loadWhoami])

  const runTest = async (): Promise<void> => {
    setTesting(true)
    setTestError(null)
    try {
      const result = await runClientSpeedTest(setPhase)
      setSpeed(result)
      if (result.downloadMbps === null && result.uploadMbps === null) {
        setTestError('Speed endpoints were unreachable from this network.')
      }
    } catch (error) {
      setTestError(error instanceof Error ? error.message : String(error))
    } finally {
      setTesting(false)
      setPhase(null)
    }
  }

  const location = [whoami?.city, whoami?.region, whoami?.country].filter(Boolean).join(', ')

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">This device</h1>
          <p className="mt-1 text-xs text-muted">
            Everything below is measured from your browser and your connection — nothing from
            another machine.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setProfile(describeDevice())
            setHints(readConnectionHints())
            void loadWhoami()
          }}
          className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-fg transition-colors hover:border-accent/40"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {whoamiError && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>IP lookup unavailable: {whoamiError}</span>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          icon={<Smartphone size={14} />}
          label="Device"
          value={profile ? `${profile.browser}` : '—'}
          hint={profile ? `${profile.os} · ${profile.platform}` : undefined}
        />
        <Card
          icon={<Monitor size={14} />}
          label="Screen"
          value={profile ? profile.screen : '—'}
          hint={profile ? `${profile.pixelRatio}× pixel ratio${profile.touch ? ' · touch' : ''}` : undefined}
        />
        <Card
          icon={<Cpu size={14} />}
          label="Hardware"
          value={profile?.cores ? `${profile.cores} cores` : '—'}
          hint={profile?.memoryGb ? `${profile.memoryGb} GB memory` : 'memory not exposed'}
        />
        <Card
          icon={<Globe size={14} />}
          label="Public IP"
          value={whoami?.ip ?? '—'}
          hint={whoami?.source === 'vercel' ? 'seen by the hosted service' : 'local service'}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          icon={<MapPin size={14} />}
          label="Location"
          value={location || '—'}
          hint={whoami?.timezone ?? profile?.timezone ?? 'unknown'}
        />
        <Card
          icon={<Wifi size={14} />}
          label="Connection"
          value={hints?.effectiveType ? hints.effectiveType.toUpperCase() : profile?.online ? 'online' : 'offline'}
          hint={
            hints?.downlinkMbps !== null && hints?.downlinkMbps !== undefined
              ? `~${hints.downlinkMbps} Mbps · ${hints.rttMs ?? '—'} ms RTT`
              : 'browser hides link details'
          }
        />
        <Card
          icon={<Timer size={14} />}
          label="Timezone"
          value={profile?.timezone ?? '—'}
          hint={profile ? `${profile.language} · ${profile.screen}` : undefined}
        />
        <Card
          icon={<Globe size={14} />}
          label="Data saver"
          value={hints?.saveData ? 'On' : 'Off'}
          hint="browser connection preference"
        />
      </div>

      <div className="mt-6 rounded-xl border border-line bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Speed test</h2>
            <p className="mt-0.5 text-[11px] text-muted">
              Download and upload run in your browser against Cloudflare.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runTest()}
            disabled={testing}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
          >
            {testing ? `Testing ${phase ?? '…'}` : 'Run test'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-line p-3">
            <div className="flex items-center gap-2 text-muted">
              <ArrowDown size={13} />
              <span className="text-[10px] uppercase tracking-[0.12em]">Download</span>
            </div>
            <p className="mt-1 text-xl font-semibold text-ok">
              {speed?.downloadMbps !== null && speed?.downloadMbps !== undefined
                ? `${speed.downloadMbps.toFixed(1)} Mbps`
                : '—'}
            </p>
          </div>
          <div className="rounded-lg border border-line p-3">
            <div className="flex items-center gap-2 text-muted">
              <ArrowUp size={13} />
              <span className="text-[10px] uppercase tracking-[0.12em]">Upload</span>
            </div>
            <p className="mt-1 text-xl font-semibold text-accent-strong">
              {speed?.uploadMbps !== null && speed?.uploadMbps !== undefined
                ? `${speed.uploadMbps.toFixed(1)} Mbps`
                : '—'}
            </p>
          </div>
          <div className="rounded-lg border border-line p-3">
            <div className="flex items-center gap-2 text-muted">
              <Timer size={13} />
              <span className="text-[10px] uppercase tracking-[0.12em]">Latency</span>
            </div>
            <p className="mt-1 text-xl font-semibold">
              {speed?.pingMs !== null && speed?.pingMs !== undefined ? `${speed.pingMs} ms` : '—'}
            </p>
          </div>
        </div>

        {testError && (
          <p className="mt-3 text-[11px] text-warn">
            {testError} Some networks block third-party speed endpoints.
          </p>
        )}
      </div>

      <p className="mt-5 text-[11px] leading-relaxed text-muted">
        Browsers cannot read Wi-Fi SSID, signal, firewall rules, DHCP leases or other devices on
        your LAN. Those modules need the desktop agent running on the machine you want to manage.
      </p>
    </div>
  )
}
