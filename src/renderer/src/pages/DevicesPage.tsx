import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Laptop, RefreshCw, Router, Smartphone } from 'lucide-react'
import { apiGet } from '../lib/api'
import type { DeviceScan } from '@shared/types'

function deviceIcon(device: { self: boolean; gateway: boolean }): React.JSX.Element {
  if (device.gateway) return <Router size={15} />
  if (device.self) return <Laptop size={15} />
  return <Smartphone size={15} />
}

export function DevicesPage(): React.JSX.Element {
  const [scan, setScan] = useState<DeviceScan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (force = false): Promise<void> => {
    setLoading(true)
    try {
      const query = force ? '?refresh=1' : ''
      setScan(await apiGet<DeviceScan>(`/api/devices${query}`, 45000))
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

  const devices = scan?.devices ?? []
  const online = devices.filter((device) => device.online).length

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Devices</h1>
          <p className="mt-0.5 text-xs text-muted">
            Hosts found on {scan?.subnet ?? 'this subnet'} by ARP and a ping sweep
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
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
      {scan?.error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{scan.error}</span>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Subnet</p>
          <p className="mt-2 text-lg font-semibold">{scan?.subnet ?? '—'}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted">
            {scan?.adapter ? scan.adapter.name : 'no IPv4 adapter'}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Devices seen</p>
          <p className="mt-2 text-lg font-semibold">{scan ? devices.length : '—'}</p>
          <p className="mt-0.5 text-[11px] text-muted">
            {scan ? `${scan.hostsInSubnet} addresses probed` : 'scanning'}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Online</p>
          <p className="mt-2 text-lg font-semibold text-ok">{scan ? online : '—'}</p>
          <p className="mt-0.5 text-[11px] text-muted">answered ping</p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Scan time</p>
          <p className="mt-2 text-lg font-semibold">
            {scan ? `${(scan.durationMs / 1000).toFixed(1)} s` : '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {scan ? new Date(scan.scannedAt).toLocaleTimeString() : '—'}
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="border-b border-line text-[10px] uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Address</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">MAC</th>
              <th className="px-4 py-2 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.ip} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-2">
                  <span className="flex items-center gap-2">
                    <span
                      className={`size-1.5 rounded-full ${device.online ? 'bg-ok' : 'bg-line'}`}
                      title={device.online ? 'online' : 'seen earlier'}
                    />
                    <span className={device.online ? 'text-ok' : 'text-muted'}>
                      {device.online ? 'online' : 'offline'}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-2 font-mono">{device.ip}</td>
                <td className="max-w-[220px] truncate px-4 py-2" title={device.name ?? ''}>
                  {device.name ?? '—'}
                </td>
                <td className="px-4 py-2 font-mono text-muted">{device.mac ?? '—'}</td>
                <td className="px-4 py-2">
                  <span className="flex items-center gap-1.5 text-muted">
                    {deviceIcon(device)}
                    {device.self ? 'This PC' : device.gateway ? 'Gateway' : 'Client'}
                  </span>
                </td>
              </tr>
            ))}
            {devices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  {loading ? 'Sweeping the subnet…' : 'No devices found. Try Rescan.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Presence, address and MAC come from this PC. Per-device byte counts need your router's API
        or an agent on each device — the browser cannot read another machine's traffic.
      </p>
    </div>
  )
}
