import {
  Cpu,
  Globe,
  MapPin,
  Monitor,
  Signal,
  Smartphone,
  Timer,
  Wifi
} from 'lucide-react'
import type { WhoAmI } from '@shared/types'
import { qualityScore, type ConnectionHint, type DeviceProfile } from './device'

interface OverviewProps {
  profile: DeviceProfile | null
  whoami: WhoAmI | null
  hints: ConnectionHint | null
  latestSpeed: { downloadMbps: number | null; pingMs: number | null } | null
  latencyJitter: number | null
  onOpenSpeed: () => void
  onOpenDiagnostics: () => void
}

function Tile({
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
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2 truncate text-base font-semibold text-fg">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-muted">{hint}</p>}
    </div>
  )
}

export function OverviewPanel({
  profile,
  whoami,
  hints,
  latestSpeed,
  latencyJitter,
  onOpenSpeed,
  onOpenDiagnostics
}: OverviewProps): React.JSX.Element {
  const score = qualityScore({
    rttMs: hints?.rttMs ?? null,
    jitterMs: latencyJitter,
    downloadMbps: latestSpeed?.downloadMbps ?? null
  })

  const location = [whoami?.city, whoami?.region, whoami?.country].filter(Boolean).join(', ')

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-accent-strong">Your connection</p>
            <h2 className="mt-1 truncate text-2xl font-semibold">
              {profile ? `${profile.browser} on ${profile.os}` : 'Reading device…'}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {whoami?.ip ? `Public IP ${whoami.ip}` : 'Resolving public IP…'}
              {location ? ` · ${location}` : ''}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenSpeed}
                className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-strong"
              >
                Run speed test
              </button>
              <button
                type="button"
                onClick={onOpenDiagnostics}
                className="rounded-lg border border-line bg-panel px-4 py-2 text-xs font-medium text-fg transition-colors hover:border-accent/40"
              >
                Open diagnostics
              </button>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <div
              className="grid size-28 place-items-center rounded-full"
              style={{
                background: `conic-gradient(var(--accent) ${score.score * 3.6}deg, var(--panel-2) 0deg)`
              }}
            >
              <div className="grid size-[92px] place-items-center rounded-full bg-panel text-center">
                <div>
                  <p className="text-2xl font-semibold leading-none">{score.score}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted">score</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">{score.label}</p>
              <p className="mt-0.5 text-[11px] text-muted">connection quality</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          icon={<Smartphone size={14} />}
          label="Device"
          value={profile?.browser ?? '—'}
          hint={profile ? `${profile.os} · ${profile.platform}` : undefined}
        />
        <Tile
          icon={<Monitor size={14} />}
          label="Display"
          value={profile?.screen ?? '—'}
          hint={profile ? `${profile.viewport} viewport · ${profile.pixelRatio}×` : undefined}
        />
        <Tile
          icon={<Cpu size={14} />}
          label="Hardware"
          value={profile?.cores ? `${profile.cores} cores` : '—'}
          hint={profile?.memoryGb ? `${profile.memoryGb} GB memory` : 'memory not exposed'}
        />
        <Tile
          icon={<Globe size={14} />}
          label="Public IP"
          value={whoami?.ip ?? '—'}
          hint={whoami?.timezone ?? profile?.timezone ?? 'unknown'}
        />
        <Tile
          icon={<MapPin size={14} />}
          label="Location"
          value={location || '—'}
          hint={whoami?.country ?? 'geo lookup unavailable'}
        />
        <Tile
          icon={<Wifi size={14} />}
          label="Connection"
          value={hints?.effectiveType ? hints.effectiveType.toUpperCase() : profile?.online ? 'Online' : 'Offline'}
          hint={
            hints?.downlinkMbps != null
              ? `~${hints.downlinkMbps} Mbps · ${hints.rttMs ?? '—'} ms RTT`
              : 'browser link estimate'
          }
        />
        <Tile
          icon={<Signal size={14} />}
          label="Language"
          value={profile?.language ?? '—'}
          hint={profile?.timezone ?? 'timezone'}
        />
        <Tile
          icon={<Timer size={14} />}
          label="Data saver"
          value={hints?.saveData ? 'On' : 'Off'}
          hint="preference reported by browser"
        />
      </div>
    </div>
  )
}
