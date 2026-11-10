import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, Database, HardDrive, Save } from 'lucide-react'
import { apiGet, apiPost } from '../lib/api'
import type { UsageSummary } from '@shared/types'

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(value >= 10 ? 1 : 2)} ${units[exponent]}`
}

function formatRate(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`
}

function shortDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${day}/${month}`
}

export function UsagePage(): React.JSX.Element {
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [limitInput, setLimitInput] = useState('')
  const [alertInput, setAlertInput] = useState('80')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const initialized = useRef(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const data = await apiGet<UsageSummary>('/api/usage/summary')
      setSummary(data)
      if (!initialized.current) {
        setLimitInput(data.limitGb === null ? '' : String(data.limitGb))
        setAlertInput(String(data.alertPercent))
        initialized.current = true
      }
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError))
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), 5000)
    return () => clearInterval(timer)
  }, [load])

  const save = async (): Promise<void> => {
    const parsedLimit = limitInput.trim() === '' ? null : Number(limitInput)
    const parsedAlert = Number(alertInput)

    if (parsedLimit !== null && (!Number.isFinite(parsedLimit) || parsedLimit < 0)) {
      setError('Limit must be a positive number of GB, or empty for no limit.')
      return
    }
    if (!Number.isFinite(parsedAlert) || parsedAlert < 1 || parsedAlert > 100) {
      setError('Alert threshold must be between 1 and 100 percent.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const data = await apiPost<UsageSummary>('/api/usage/limit', {
        limitGb: parsedLimit,
        alertPercent: Math.round(parsedAlert)
      })
      setSummary(data)
      setNotice(`Saved. Alerts at ${data.alertPercent}% of the monthly limit.`)
      setTimeout(() => setNotice(null), 4000)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError))
    } finally {
      setSaving(false)
    }
  }

  const days = summary?.days ?? []
  const today = summary?.today ?? { rx: 0, tx: 0 }
  const month = summary?.month ?? { rx: 0, tx: 0 }
  const monthBytes = month.rx + month.tx
  const limitBytes = summary?.limitGb !== null && summary?.limitGb !== undefined ? summary.limitGb * 1024 ** 3 : null
  const usedRatio = limitBytes && limitBytes > 0 ? monthBytes / limitBytes : 0
  const alertRatio = (summary?.alertPercent ?? 80) / 100
  const overLimit = limitBytes !== null && usedRatio >= 1
  const nearLimit = limitBytes !== null && !overLimit && usedRatio >= alertRatio
  const maxDay = Math.max(1, ...days.map((day) => day.rx + day.tx))

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Data Manager</h1>
          <p className="mt-0.5 text-xs text-muted">
            Counted from {summary?.source ?? 'netstat -e'} every 5s while ArhLinx runs
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] ${
            summary?.running ? 'border-ok/40 text-ok' : 'border-line text-muted'
          }`}
        >
          {summary?.running ? 'Sampling' : 'Idle'}
        </span>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="mt-4 rounded-xl border border-ok/40 bg-ok/10 p-3 text-xs text-ok">{notice}</div>
      )}

      {overLimit && (
        <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
          Monthly limit reached: {formatBytes(monthBytes)} of {formatBytes(limitBytes ?? 0)} used.
        </div>
      )}
      {nearLimit && (
        <div className="mt-4 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
          {Math.round(usedRatio * 100)}% of the monthly limit used ({formatBytes(monthBytes)} of{' '}
          {formatBytes(limitBytes ?? 0)}).
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="flex items-center gap-2 text-muted">
            <Database size={14} />
            <span className="text-[11px] font-medium uppercase tracking-[0.12em]">Today</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {summary ? formatBytes(today.rx + today.tx) : '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {summary ? `${formatBytes(today.rx)} down · ${formatBytes(today.tx)} up` : 'waiting for samples'}
          </p>
        </div>

        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="flex items-center gap-2 text-muted">
            <HardDrive size={14} />
            <span className="text-[11px] font-medium uppercase tracking-[0.12em]">This month</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {summary ? formatBytes(monthBytes) : '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {summary ? `${formatBytes(month.rx)} down · ${formatBytes(month.tx)} up` : 'waiting for samples'}
          </p>
        </div>

        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="flex items-center gap-2 text-muted">
            <ArrowDown size={14} />
            <span className="text-[11px] font-medium uppercase tracking-[0.12em]">Live down</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-ok">
            {summary ? formatRate(summary.rateRx) : '—'}
          </p>
        </div>

        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="flex items-center gap-2 text-muted">
            <ArrowUp size={14} />
            <span className="text-[11px] font-medium uppercase tracking-[0.12em]">Live up</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-accent-strong">
            {summary ? formatRate(summary.rateTx) : '—'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-panel p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Last 14 days</h2>
            <span className="text-[11px] text-muted">down + up</span>
          </div>
          <div className="mt-4 flex h-40 items-end gap-1.5">
            {days.length === 0 && (
              <p className="w-full text-center text-xs text-muted">No samples yet. Leave the app running.</p>
            )}
            {days.map((day) => {
              const total = day.rx + day.tx
              const height = Math.max(3, Math.round((total / maxDay) * 100))
              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm bg-accent/70"
                    style={{ height: `${height}%` }}
                    title={`${day.date}: ${formatBytes(day.rx)} down, ${formatBytes(day.tx)} up`}
                  />
                  <span className="text-[9px] text-muted">{shortDate(day.date)}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-panel p-4">
          <h2 className="text-sm font-semibold">Monthly limit</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            {limitBytes === null
              ? 'No limit set'
              : `${Math.min(100, Math.round(usedRatio * 100))}% of ${formatBytes(limitBytes)}`}
          </p>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-panel-2">
            <div
              className={`h-full rounded-full transition-all ${
                overLimit ? 'bg-danger' : nearLimit ? 'bg-warn' : 'bg-ok'
              }`}
              style={{ width: `${Math.min(100, Math.round(usedRatio * 100))}%` }}
            />
          </div>

          <div className="mt-4 flex items-end gap-2">
            <label className="flex-1 text-[11px] text-muted">
              Limit (GB)
              <input
                value={limitInput}
                onChange={(event) => setLimitInput(event.target.value)}
                inputMode="decimal"
                placeholder="unlimited"
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-2 py-1.5 text-xs text-fg outline-none focus:border-accent/50"
              />
            </label>
            <label className="w-20 text-[11px] text-muted">
              Alert %
              <input
                value={alertInput}
                onChange={(event) => setAlertInput(event.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-2 py-1.5 text-xs text-fg outline-none focus:border-accent/50"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
          >
            <Save size={13} />
            {saving ? 'Saving…' : 'Save limit'}
          </button>

          <p className="mt-3 text-[10px] leading-relaxed text-muted">
            Counters reset when ArhLinx stops, so totals cover time the app was open.
          </p>
        </div>
      </div>
    </div>
  )
}
