import {
  ArrowRight,
  Cpu,
  Globe,
  MapPin,
  Monitor,
  RadioTower,
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
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-center gap-2 text-muted">
        <span className="grid size-6 place-items-center rounded-md bg-panel-2">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-2.5 truncate text-lg font-semibold tracking-tight">{value}</p>
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
  const operator = whoami?.isp ? whoami.isp.replace(/^AS\d+\s*/, '') : null
  const bars = Math.max(1, Math.min(5, Math.round(score.score / 20)))

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-line bg-panel shadow-[0_24px_60px_-40px_rgba(11,18,32,0.35)]">
        <div className="flex flex-col gap-8 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-9">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
              This device
            </p>
            <h2 className="mt-2 truncate text-[26px] font-semibold tracking-[-0.02em] sm:text-[30px]">
              {profile ? `${profile.browser} on ${profile.os}` : 'Reading device…'}
            </h2>
            <p className="mt-1.5 text-xs text-muted">
              {whoami?.ip ? `Public IP ${whoami.ip}` : 'Resolving public IP…'}
              {location ? ` · ${location}` : ''}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenSpeed}
                className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-accent/25 transition-colors hover:bg-accent-strong"
              >
                Run speed test
                <ArrowRight size={13} />
              </button>
              <button
                type="button"
                onClick={onOpenDiagnostics}
                className="rounded-full border border-line bg-panel px-5 py-2.5 text-xs font-semibold text-fg transition-colors hover:border-accent/40"
              >
                Open diagnostics
              </button>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <div
              className="grid size-24 place-items-center rounded-full"
              style={{
                background: `conic-gradient(var(--accent) ${score.score * 3.6}deg, var(--panel-2) 0deg)`
              }}
            >
              <div className="grid size-[78px] place-items-center rounded-full bg-panel text-center">
                <div>
                  <p className="text-xl font-semibold leading-none tabular-nums">{score.score}</p>
                  <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.18em] text-muted">
                    score
                  </p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">{score.label}</p>
              <p className="mt-0.5 text-[11px] text-muted">connection quality</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          icon={<Smartphone size={13} />}
          label="Device"
          value={profile?.browser ?? '—'}
          hint={profile ? `${profile.os} · ${profile.platform}` : undefined}
        />
        <Tile
          icon={<Monitor size={13} />}
          label="Display"
          value={profile?.screen ?? '—'}
          hint={profile ? `${profile.viewport} viewport · ${profile.pixelRatio}×` : undefined}
        />
        <Tile
          icon={<Cpu size={13} />}
          label="Hardware"
          value={profile?.cores ? `${profile.cores} cores` : '—'}
          hint={profile?.memoryGb ? `${profile.memoryGb} GB memory` : 'memory not exposed'}
        />
        <Tile
          icon={<Globe size={13} />}
          label="Public IP"
          value={whoami?.ip ?? '—'}
          hint={whoami?.timezone ?? profile?.timezone ?? 'unknown'}
        />
        <Tile
          icon={<MapPin size={13} />}
          label="Location"
          value={location || '—'}
          hint={whoami?.country ?? 'geo lookup unavailable'}
        />
        <Tile
          icon={<Wifi size={13} />}
          label="Network"
          value={
            hints?.effectiveType ? hints.effectiveType.toUpperCase() : profile?.online ? 'Online' : 'Offline'
          }
          hint={
            hints?.downlinkMbps != null
              ? `~${hints.downlinkMbps} Mbps · ${hints.rttMs ?? '—'} ms RTT`
              : 'browser link estimate'
          }
        />
        <Tile icon={<Signal size={13} />} label="Language" value={profile?.language ?? '—'} hint={profile?.timezone ?? 'timezone'} />
        <Tile
          icon={<Timer size={13} />}
          label="Data saver"
          value={hints?.saveData ? 'On' : 'Off'}
          hint="preference reported by browser"
        />
      </div>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <RadioTower size={15} className="text-muted" />
              <h3 className="text-sm font-semibold tracking-tight">Network path</h3>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">
              The operator and route your traffic takes to the internet.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Operator</p>
                <p className="mt-1 truncate text-sm font-medium">{operator ?? '—'}</p>
                <p className="text-[10px] text-muted">{whoami?.asn ?? 'ASN unavailable'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Network type</p>
                <p className="mt-1 text-sm font-medium">
                  {hints?.effectiveType ? hints.effectiveType.toUpperCase() : '—'}
                </p>
                <p className="text-[10px] text-muted">reported by the browser</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Location</p>
                <p className="mt-1 truncate text-sm font-medium">{location || '—'}</p>
                <p className="text-[10px] text-muted">
                  {whoami?.latitude != null && whoami?.longitude != null
                    ? `${whoami.latitude.toFixed(2)}, ${whoami.longitude.toFixed(2)}`
                    : 'geo coordinates unavailable'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Estimated signal
            </p>
            <div className="mt-2 flex items-end gap-1.5" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((level) => (
                <span
                  key={level}
                  className={`w-2 rounded-sm ${
                    level <= bars ? 'bg-gradient-to-t from-accent to-cyan-400' : 'bg-line'
                  }`}
                  style={{ height: `${8 + level * 6}px` }}
                />
              ))}
            </div>
            <p className="mt-2 text-xs font-semibold">{score.label}</p>
            <p className="text-[10px] text-muted">from live measurements</p>
          </div>
        </div>
      </section>
    </div>
  )
}
