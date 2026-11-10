import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Globe, Radio, RefreshCw } from 'lucide-react'
import { apiGet } from '../lib/api'
import type { Coverage, NetworkAdapter, NetworkConfig, WifiStatus } from '@shared/types'

interface NetworkPageProps {
  focus: 'internet' | 'wifi-advanced'
}

function Field({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm text-fg" title={value}>
        {value}
      </p>
    </div>
  )
}

function usable(adapter: NetworkAdapter): boolean {
  return adapter.ipv4.length > 0 || !/disconnected/i.test(adapter.mediaState ?? '')
}

export function NetworkPage({ focus }: NetworkPageProps): React.JSX.Element {
  const [config, setConfig] = useState<NetworkConfig | null>(null)
  const [wifi, setWifi] = useState<WifiStatus | null>(null)
  const [coverage, setCoverage] = useState<Coverage | null>(null)
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    const [configResult, wifiResult, coverageResult] = await Promise.allSettled([
      apiGet<NetworkConfig>('/api/network'),
      apiGet<WifiStatus>('/api/wifi/status'),
      focus === 'wifi-advanced' ? apiGet<Coverage>('/api/coverage') : Promise.resolve(null)
    ])

    if (configResult.status === 'fulfilled') {
      setConfig(configResult.value)
      const adapters = configResult.value.adapters
      const preferred = adapters.findIndex((adapter) => adapter.ipv4.length > 0)
      setSelected(preferred >= 0 ? preferred : 0)
    }
    setWifi(wifiResult.status === 'fulfilled' ? wifiResult.value : null)
    setCoverage(coverageResult.status === 'fulfilled' ? coverageResult.value : null)

    const failure = configResult.status === 'rejected' ? configResult.reason : null
    setError(failure instanceof Error ? failure.message : failure ? String(failure) : null)
    setLoading(false)
  }, [focus])

  useEffect(() => {
    void load()
  }, [load])

  const adapters = config?.adapters ?? []
  const adapter = adapters[selected] ?? adapters[0] ?? null
  const connection = wifi?.connection ?? null
  const isWifi = focus === 'wifi-advanced'
  const bands = coverage?.bands ?? {}

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">
            {isWifi ? 'Advanced Wi-Fi' : 'Internet Settings'}
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            {isWifi
              ? 'Adapter, radio, channel and band detail'
              : 'DNS, IPv4, IPv6 and routing on this PC'}
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

      {adapters.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {adapters.map((candidate, index) => (
            <button
              key={`${candidate.name}-${index}`}
              type="button"
              onClick={() => setSelected(index)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                index === selected
                  ? 'border-accent/50 bg-accent-soft text-accent-strong'
                  : 'border-line bg-panel text-muted hover:border-accent/30'
              }`}
            >
              {candidate.name}
              {usable(candidate) ? '' : ' (down)'}
            </button>
          ))}
        </div>
      )}

      {!adapter && !loading && (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-panel/50 p-8 text-center text-xs text-muted">
          No network adapters reported by Windows.
        </div>
      )}

      {adapter && (
        <>
          <div className="mt-4 rounded-xl border border-line bg-panel p-4">
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-accent-soft text-accent-strong">
                {isWifi ? <Radio size={19} /> : <Globe size={19} />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{adapter.name}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted">
                  {adapter.description ?? 'No description'}
                  {adapter.mediaState ? ` · ${adapter.mediaState}` : ''}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="IPv4" value={adapter.ipv4[0] ?? '—'} />
              <Field label="Subnet mask" value={adapter.subnetMasks[0] ?? '—'} />
              <Field label="Gateway" value={adapter.gateways[0] ?? '—'} />
              <Field
                label="DHCP"
                value={
                  adapter.dhcpEnabled === null
                    ? '—'
                    : adapter.dhcpEnabled
                      ? `Enabled${adapter.dhcpServer ? ` (${adapter.dhcpServer})` : ''}`
                      : 'Static'
                }
              />
              <Field label="IPv6" value={adapter.ipv6[0] ?? '—'} />
              <Field label="MAC" value={adapter.mac ?? '—'} />
              <Field label="DNS suffix" value={adapter.connectionSuffix ?? '—'} />
              <Field label="Hostname" value={config?.hostname ?? '—'} />
            </div>

            {adapter.dns.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted">DNS servers</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {adapter.dns.map((server) => (
                    <span key={server} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-fg">
                      {server}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isWifi && (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-line bg-panel p-4">
                <h2 className="text-sm font-semibold">Radio</h2>
                {connection ? (
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <Field label="SSID" value={connection.ssid ?? '—'} />
                    <Field label="Radio type" value={connection.radioType ?? '—'} />
                    <Field label="Channel" value={connection.channel === null ? '—' : String(connection.channel)} />
                    <Field label="Signal" value={connection.signal === null ? '—' : `${connection.signal}%`} />
                    <Field
                      label="Receive rate"
                      value={connection.receiveRate === null ? '—' : `${connection.receiveRate} Mbps`}
                    />
                    <Field
                      label="Transmit rate"
                      value={connection.transmitRate === null ? '—' : `${connection.transmitRate} Mbps`}
                    />
                    <Field label="Cipher" value={connection.cipher ?? '—'} />
                    <Field label="BSSID" value={connection.bssid ?? '—'} />
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted">
                    {wifi?.detailError ?? 'No active wireless connection reported.'}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-line bg-panel p-4">
                <h2 className="text-sm font-semibold">Scanned bands</h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  {coverage ? `${coverage.apCount} access points in range` : 'Scanning…'}
                </p>
                <div className="mt-3 space-y-2">
                  {Object.keys(bands).length === 0 && (
                    <p className="text-xs text-muted">{coverage?.scanError ?? 'No scan data.'}</p>
                  )}
                  {Object.entries(bands).map(([band, count]) => {
                    const total = Object.values(bands).reduce((sum, value) => sum + value, 0) || 1
                    return (
                      <div key={band}>
                        <div className="flex items-center justify-between text-[11px] text-muted">
                          <span>{band}</span>
                          <span>{count}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-panel-2">
                          <div
                            className="h-full rounded-full bg-accent/70"
                            style={{ width: `${Math.round((count / total) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {isWifi && wifi?.detailError && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>{wifi.detailError}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
