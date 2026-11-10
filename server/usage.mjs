import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import {
  getSetting,
  insertUsageSample,
  localStamp,
  setSetting,
  usageDays,
  usageTotals
} from './db.mjs'

const run = promisify(execFile)
const SAMPLE_MS = 5000
const LIMIT_KEY = 'usageLimitGb'
const ALERT_KEY = 'usageAlertPercent'
const SOURCE = 'netstat -e'

export function parseNetstatE(output) {
  const match = output.match(/^\s*Bytes\s+(\d+)\s+(\d+)\s*$/m)
  if (!match) return null
  return { rx: Number(match[1]), tx: Number(match[2]) }
}

async function readCounters() {
  try {
    const { stdout } = await run('netstat', ['-e'], {
      windowsHide: true,
      timeout: 8000,
      encoding: 'utf8'
    })
    const counters = parseNetstatE(stdout)
    return counters ? { ok: true, counters } : { ok: false, error: 'Unreadable netstat -e output' }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

let timer = null
let previous = null
let rate = { rx: 0, tx: 0 }
let lastError = null
let startedAt = null

async function tick() {
  const { ok, counters, error } = await readCounters()
  if (!ok || !counters) {
    lastError = error ?? 'Counter read failed'
    return
  }
  lastError = null

  const now = Date.now()
  if (previous) {
    let deltaRx = counters.rx - previous.rx
    let deltaTx = counters.tx - previous.tx
    if (deltaRx < 0) deltaRx = 0
    if (deltaTx < 0) deltaTx = 0

    const seconds = (now - previous.at) / 1000
    if (deltaRx > 0 || deltaTx > 0) {
      insertUsageSample(localStamp(new Date(now)), deltaRx, deltaTx)
    }
    rate =
      seconds > 0
        ? { rx: Math.round(deltaRx / seconds), tx: Math.round(deltaTx / seconds) }
        : { rx: 0, tx: 0 }
  }
  previous = { rx: counters.rx, tx: counters.tx, at: now }
}

export function startSampler() {
  if (timer) return
  startedAt = new Date().toISOString()
  void tick()
  timer = setInterval(() => void tick(), SAMPLE_MS)
  if (typeof timer.unref === 'function') timer.unref()
}

export function getUsageSummary() {
  const limitGb = getSetting(LIMIT_KEY, null)
  const alertPercent = getSetting(ALERT_KEY, 80)

  return {
    sampledAt: new Date().toISOString(),
    startedAt,
    running: timer !== null,
    source: SOURCE,
    error: lastError,
    rateRx: rate.rx,
    rateTx: rate.tx,
    today: usageTotals("substr(at, 1, 10) = date('now', 'localtime')"),
    month: usageTotals("substr(at, 1, 7) = strftime('%Y-%m', 'now', 'localtime')"),
    days: usageDays(14),
    limitGb: typeof limitGb === 'number' ? limitGb : null,
    alertPercent: typeof alertPercent === 'number' ? alertPercent : 80
  }
}

export function saveUsageLimit({ limitGb, alertPercent }) {
  if (limitGb !== null) setSetting(LIMIT_KEY, limitGb)
  else setSetting(LIMIT_KEY, null)
  if (typeof alertPercent === 'number') setSetting(ALERT_KEY, alertPercent)
  return getUsageSummary()
}
