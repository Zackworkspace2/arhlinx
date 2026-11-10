import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, Search, ShieldCheck, ShieldOff } from 'lucide-react'
import { apiGet } from '../lib/api'
import type { FirewallStatus } from '@shared/types'

export function FirewallPage(): React.JSX.Element {
  const [data, setData] = useState<FirewallStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      setData(await apiGet<FirewallStatus>('/api/firewall'))
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

  const rules = data?.rules ?? []
  const needle = filter.trim().toLowerCase()
  const visible = needle
    ? rules.filter((rule) =>
        [rule.name, rule.direction, rule.action, rule.protocol, rule.localPort]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle))
      )
    : rules

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Firewall &amp; Security</h1>
          <p className="mt-0.5 text-xs text-muted">
            Windows Defender Firewall profiles and rules, read-only
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

      {data?.elevationRequired && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>Windows needs an elevated process to report some firewall details.</span>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data?.profiles.map((profile) => {
          const on = /^on$/i.test(profile.state ?? '')
          return (
            <div key={profile.profile} className="rounded-xl border border-line bg-panel p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium font-mono uppercase tracking-[0.12em] text-muted">
                  {profile.profile}
                </span>
                {on ? <ShieldCheck size={15} className="text-ok" /> : <ShieldOff size={15} className="text-danger" />}
              </div>
              <p className={`mt-2 text-lg font-semibold ${on ? 'text-ok' : 'text-danger'}`}>
                {profile.state ?? 'unknown'}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted" title={profile.policy ?? ''}>
                {profile.policy ?? 'no policy reported'}
              </p>
            </div>
          )
        })}

        <div className="rounded-xl border border-line bg-panel p-4">
          <span className="text-[11px] font-medium font-mono uppercase tracking-[0.12em] text-muted">Rules</span>
          <p className="mt-2 text-lg font-semibold">
            {data ? data.ruleCount : '—'}
            <span className="ml-1 text-xs font-normal text-muted">total</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {data ? `${data.enabledRuleCount} enabled` : 'reading'}
          </p>
        </div>
      </div>

      {data?.rulesError && (
        <div className="mt-4 rounded-xl border border-line bg-panel p-3 text-xs text-muted">
          {data.rulesError}
        </div>
      )}

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Firewall rules</h2>
            <p className="mt-0.5 text-xs text-muted">
              Showing {visible.length} of {rules.length}
              {needle ? ` (filtered from ${data?.ruleCount ?? 0})` : ''}
            </p>
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-1.5">
            <Search size={13} className="text-muted" />
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter rules"
              className="w-40 bg-transparent text-xs text-fg outline-none placeholder:text-muted"
            />
          </label>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-line text-[10px] font-mono uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Rule</th>
                <th className="px-3 py-2 font-medium">Dir</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Protocol</th>
                <th className="px-3 py-2 font-medium">Port</th>
                <th className="px-3 py-2 font-medium">Profiles</th>
                <th className="px-3 py-2 font-medium">Enabled</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((rule) => (
                <tr key={`${rule.name}-${rule.localPort ?? ''}`} className="border-b border-line/60 last:border-0">
                  <td className="max-w-[260px] truncate px-3 py-2" title={rule.name}>
                    {rule.name}
                  </td>
                  <td className="px-3 py-2 text-muted">{rule.direction ?? '—'}</td>
                  <td className={`px-3 py-2 ${/block/i.test(rule.action ?? '') ? 'text-danger' : 'text-ok'}`}>
                    {rule.action ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-muted">{rule.protocol ?? '—'}</td>
                  <td className="px-3 py-2 text-muted">{rule.localPort ?? '—'}</td>
                  <td className="max-w-[160px] truncate px-3 py-2 text-muted" title={rule.profiles ?? ''}>
                    {rule.profiles ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-muted">{rule.enabled ?? '—'}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted">
                    {loading ? 'Reading firewall rules…' : 'No rules matched.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
