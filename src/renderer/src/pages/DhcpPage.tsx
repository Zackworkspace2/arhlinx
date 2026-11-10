import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, Timer } from 'lucide-react'
import { apiGet } from '../lib/api'
import type { NetworkConfig } from '@shared/types'

function leaseRemaining(expires: string | null): string {
  if (!expires) return '—'
  const end = Date.parse(expires)
  if (Number.isNaN(end)) return expires
  const minutes = Math.round((end - Date.now()) / 60000)
  if (minutes < 0) return 'expired'
  if (minutes < 60) return `${minutes} min left`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${minutes % 60} min left`
}

export function DhcpPage(): React.JSX.Element {
  const [config, setConfig] = useState<NetworkConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      setConfig(await apiGet<NetworkConfig>('/api/network'))
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

  const adapters = (config?.adapters ?? []).filter(
    (adapter) => adapter.dhcpEnabled !== null || adapter.ipv4.length > 0
  )

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">DHCP Manager</h1>
          <p className="mt-0.5 text-xs text-muted">
            Client lease information from this PC. Router-side leases need router access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-fg transition-colors hover:border-accent/40 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Reading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {adapters.length === 0 && !loading && (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-panel/50 p-8 text-center text-xs text-muted">
          No DHCP-capable adapters reported.
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {adapters.map((adapter) => (
          <div key={adapter.name} className="rounded-xl border border-line bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{adapter.name}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted">
                  {adapter.description ?? 'No description'}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                  adapter.dhcpEnabled ? 'border-ok/40 text-ok' : 'border-line text-muted'
                }`}
              >
                {adapter.dhcpEnabled === null ? 'unknown' : adapter.dhcpEnabled ? 'DHCP' : 'Static'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Address</p>
                <p className="mt-0.5">{adapter.ipv4[0] ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">DHCP server</p>
                <p className="mt-0.5">{adapter.dhcpServer ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Lease obtained</p>
                <p className="mt-0.5">{adapter.leaseObtained ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Lease expires</p>
                <p className="mt-0.5">{adapter.leaseExpires ?? '—'}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[11px] text-muted">
              <Timer size={13} />
              {adapter.dhcpEnabled ? leaseRemaining(adapter.leaseExpires) : 'Static configuration'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
