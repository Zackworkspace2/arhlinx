import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Lock, RefreshCw, ShieldCheck, Wifi } from 'lucide-react'
import { apiGet } from '../lib/api'
import type { WifiProfiles, WifiScan, WifiStatus } from '@shared/types'

function SignalBars({ signal }: { signal: number | null }): React.JSX.Element {
  const value = signal ?? 0
  const filled = Math.max(0, Math.min(4, Math.ceil(value / 25)))
  return (
    <div className="flex items-end gap-0.5" title={signal === null ? 'unknown' : `${signal}%`}>
      {[1, 2, 3, 4].map((level) => (
        <span
          key={level}
          className={`w-1 rounded-sm ${level <= filled ? 'bg-ok' : 'bg-line'}`}
          style={{ height: `${4 + level * 3}px` }}
        />
      ))}
    </div>
  )
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString()
}

function Stat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-fg">{value}</p>
    </div>
  )
}

export function WifiPage(): React.JSX.Element {
  const [status, setStatus] = useState<WifiStatus | null>(null)
  const [scan, setScan] = useState<WifiScan | null>(null)
  const [profiles, setProfiles] = useState<WifiProfiles | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scannedAt, setScannedAt] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    const [statusResult, scanResult, profilesResult] = await Promise.allSettled([
      apiGet<WifiStatus>('/api/wifi/status'),
      apiGet<WifiScan>('/api/wifi/networks'),
      apiGet<WifiProfiles>('/api/wifi/profiles')
    ])

    setStatus(statusResult.status === 'fulfilled' ? statusResult.value : null)
    setScan(scanResult.status === 'fulfilled' ? scanResult.value : null)
    setProfiles(profilesResult.status === 'fulfilled' ? profilesResult.value : null)

    const failure = [statusResult, scanResult, profilesResult].find(
      (result) => result.status === 'rejected'
    )
    setError(
      failure && failure.status === 'rejected'
        ? failure.reason instanceof Error
          ? failure.reason.message
          : String(failure.reason)
        : null
    )
    if (statusResult.status === 'fulfilled' || scanResult.status === 'fulfilled') {
      setScannedAt(new Date().toISOString())
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const connection = status?.connection ?? null
  const adapter = status?.adapter ?? null
  const networks = [...(scan?.networks ?? [])].sort((a, b) => b.bestSignal - a.bestSignal)
  const saved = profiles?.profiles ?? []

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Wi-Fi Settings</h1>
          <p className="mt-0.5 text-xs text-muted">
            {scan?.interfaceName ? `Interface ${scan.interfaceName}` : 'Wireless adapter'} · scanned{' '}
            {formatTime(scannedAt)}
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

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-panel p-4 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`grid size-10 place-items-center rounded-lg ${
                  connection ? 'bg-ok/10 text-ok' : 'bg-panel-2 text-muted'
                }`}
              >
                <Wifi size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {!status
                    ? 'Reading…'
                    : !adapter
                      ? 'No wireless adapter'
                      : (connection?.ssid ??
                        (adapter.state === 'Connected' ? 'Connected (details need elevation)' : 'Not connected'))}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {connection?.description ?? adapter?.name ?? (status ? 'Windows reported no Wi-Fi adapter' : 'querying Windows')}
                </p>
              </div>
            </div>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] ${
                adapter?.state === 'Connected'
                  ? 'border-ok/40 bg-ok/10 text-ok'
                  : 'border-line text-muted'
              }`}
            >
              {adapter ? adapter.state : 'unknown'}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <Stat label="Signal" value={connection?.signal !== null && connection?.signal !== undefined ? `${connection.signal}%` : '—'} />
            <Stat
              label="Band / channel"
              value={
                connection?.channel === null || connection?.channel === undefined
                  ? '—'
                  : `${connection.radioType ?? 'radio'} · ch ${connection.channel}`
              }
            />
            <Stat
              label="Link rate"
              value={
                connection?.receiveRate === null || connection?.receiveRate === undefined
                  ? '—'
                  : `${connection.receiveRate} / ${connection.transmitRate ?? '—'} Mbps`
              }
            />
            <Stat label="Security" value={connection?.authentication ?? '—'} />
          </div>

          {connection && (
            <div className="mt-4 flex items-center gap-4 border-t border-line pt-3 text-[11px] text-muted">
              <span className="flex items-center gap-1">
                <SignalBars signal={connection.signal} />
                {connection.signal ?? '—'}%
              </span>
              <span>BSSID {connection.bssid ?? '—'}</span>
              <span>Cipher {connection.cipher ?? '—'}</span>
              <span>Profile {connection.profile ?? '—'}</span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="flex items-center gap-2 text-muted">
            <ShieldCheck size={14} />
            <span className="text-[11px] font-medium font-mono uppercase tracking-[0.12em]">Saved networks</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{saved.length}</p>
          <p className="mt-0.5 text-[11px] text-muted">
            {saved.length === 0 ? 'No wireless profiles on this PC' : 'Windows wireless profiles'}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {saved.slice(0, 6).map((profile) => (
              <span
                key={profile.name}
                className="max-w-full truncate rounded-full border border-line px-2 py-0.5 text-[10px] text-muted"
                title={profile.name}
              >
                {profile.name}
              </span>
            ))}
            {saved.length > 6 && (
              <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">
                +{saved.length - 6}
              </span>
            )}
          </div>
        </div>
      </div>

      {status?.detailError && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <div>
            <p>{status.detailError}</p>
            {status.detailReason === 'elevation' && (
              <p className="mt-1 text-[11px] opacity-80">
                Visible networks below still update. Restart the app from an elevated terminal for
                full link details.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold">Visible networks</h2>
            <p className="mt-0.5 text-xs text-muted">
              {networks.length === 0 ? 'Nothing in range right now' : `${networks.length} in range`}
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {networks.map((network) => (
            <div key={network.ssid || `hidden-${network.bssids[0]?.bssid ?? 'x'}`} className="rounded-xl border border-line bg-panel p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {network.hidden ? 'Hidden network' : network.ssid}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {network.authentication || 'Unknown'} · {network.encryption || '—'}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                    network.open ? 'border-warn/40 text-warn' : 'border-line text-muted'
                  }`}
                >
                  {network.open ? 'Open' : 'Secured'}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
                <span className="flex items-center gap-2">
                  <SignalBars signal={network.bestSignal} />
                  {network.bestSignal}%
                </span>
                <span>
                  {network.bssids[0]?.band || '—'} · ch {network.bssids[0]?.channel ?? '—'}
                </span>
                <span className="flex items-center gap-1">
                  <Lock size={11} />
                  {network.bssids.length}
                </span>
              </div>
            </div>
          ))}
        </div>

        {networks.length === 0 && !loading && (
          <div className="mt-3 rounded-xl border border-dashed border-line bg-panel/50 p-8 text-center text-xs text-muted">
            No networks were reported by Windows. Move closer to an access point and rescan.
          </div>
        )}
      </div>
    </div>
  )
}
