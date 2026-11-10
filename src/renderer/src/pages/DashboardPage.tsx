import { useCallback, useEffect, useState } from 'react'
import { Activity, ArrowUpRight, Cpu, Database, Gauge, ShieldCheck, Wifi } from 'lucide-react'
import { ROUTE_META, type RouteId } from '../navigation'
import { apiGet } from '../lib/api'
import type { Overview, SystemInfo } from '@shared/types'

interface DashboardPageProps {
  info: SystemInfo | null
  onNavigate: (id: RouteId) => void
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`
}

function Stat({
  icon,
  label,
  value,
  hint
}: {
  icon: React.JSX.Element
  label: string
  value: string
  hint: string
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-[11px] font-medium font-mono uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-2 truncate text-lg font-semibold text-fg">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-muted">{hint}</p>
    </div>
  )
}

export function DashboardPage({ info, onNavigate }: DashboardPageProps): React.JSX.Element {
  const [overview, setOverview] = useState<Overview | null>(null)
  const modules = (Object.keys(ROUTE_META) as RouteId[]).filter((id) => id !== 'dashboard')

  const load = useCallback(async (): Promise<void> => {
    try {
      setOverview(await apiGet<Overview>('/api/overview'))
    } catch {
      setOverview(null)
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), 10000)
    return () => clearInterval(timer)
  }, [load])

  const wifi = overview?.wifi
  const usage = overview?.usage
  const speed = overview?.lastSpeed
  const firewall = overview?.firewall

  const wifiValue = wifi
    ? (wifi.ssid ?? (wifi.adapterState === 'Connected' ? 'Connected' : 'Not connected'))
    : '—'
  const wifiHint = wifi
    ? (wifi.ssid
        ? `${wifi.signal ?? '—'}% signal`
        : wifi.detailError ?? wifi.adapterState ?? 'no wireless adapter')
    : 'no data'

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<Wifi size={15} />}
          label="Wi-Fi"
          value={wifiValue}
          hint={wifiHint}
        />
        <Stat
          icon={<Database size={15} />}
          label="Today"
          value={usage ? formatBytes(usage.today.rx + usage.today.tx) : '—'}
          hint={usage ? `${formatBytes(usage.rateRx)}/s down · ${formatBytes(usage.rateTx)}/s up` : 'sampler idle'}
        />
        <Stat
          icon={<Gauge size={15} />}
          label="Last speed test"
          value={speed ? `${speed.downloadMbps.toFixed(1)} Mbps` : '—'}
          hint={speed ? `${speed.uploadMbps.toFixed(1)} up · ${speed.pingMs.toFixed(0)} ms` : 'no test yet'}
        />
        <Stat
          icon={<ShieldCheck size={15} />}
          label="Firewall"
          value={firewall ? `${firewall.on}/${firewall.total} profiles on` : '—'}
          hint={
            firewall
              ? firewall.off
                ? `${firewall.off} profile${firewall.off === 1 ? '' : 's'} off`
                : 'all reported profiles on'
              : 'no data'
          }
        />
      </div>

      <div className="mt-7">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold">Modules</h2>
            <p className="mt-0.5 text-xs text-muted">
              {overview?.hostname ? `${overview.hostname} · ` : ''}
              every module talks to the local service
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((id) => {
            const meta = ROUTE_META[id]
            const Icon = meta.icon
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className="group rounded-xl border border-line bg-panel p-4 text-left transition-colors hover:border-accent/40 hover:bg-panel-2"
              >
                <div className="flex items-start justify-between">
                  <div className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent-strong">
                    <Icon size={17} />
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${
                      meta.status === 'live' ? 'border-ok/40 text-ok' : 'border-line text-muted'
                    }`}
                  >
                    {meta.status === 'live' ? 'Live' : `Phase ${meta.phase}`}
                  </span>
                </div>
                <p className="mt-3 flex items-center gap-1 text-sm font-medium text-fg">
                  {meta.label}
                  <ArrowUpRight
                    size={14}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </p>
                <p className="mt-0.5 text-xs text-muted">{meta.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-7 rounded-xl border border-line bg-panel p-4">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-muted" />
          <h2 className="text-sm font-semibold">Last test</h2>
          {speed && (
            <span className="text-[11px] text-muted">{new Date(speed.at).toLocaleString()}</span>
          )}
        </div>

        {speed ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Download</p>
              <p className="mt-0.5 text-sm font-medium">{speed.downloadMbps.toFixed(2)} Mbps</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Upload</p>
              <p className="mt-0.5 text-sm font-medium">{speed.uploadMbps.toFixed(2)} Mbps</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Ping</p>
              <p className="mt-0.5 text-sm font-medium">{speed.pingMs.toFixed(1)} ms</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Jitter</p>
              <p className="mt-0.5 text-sm font-medium">{speed.jitterMs.toFixed(1)} ms</p>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-dashed border-line px-3 py-4">
            <p className="text-xs text-muted">No speed test recorded yet.</p>
            <button
              type="button"
              onClick={() => onNavigate('speed-test')}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-strong"
            >
              Run test
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
        <Cpu size={13} />
        {info ? `${info.browser} on ${info.platform} · app ${info.appVersion}` : 'reading runtime info'}
      </div>
    </div>
  )
}
