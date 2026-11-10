import { connect } from 'node:net'
import { exec } from './exec.mjs'
import { getUsageSummary, startSampler } from './usage.mjs'

const MAX_CONNECTIONS = 500

export function parseConnections(output) {
  const connections = []

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const columns = trimmed.split(/\s+/)
    if (columns.length < 4) continue
    const proto = columns[0]
    if (!/^(TCP|TCPv6|UDP|UDPv6)$/i.test(proto)) continue

    const local = columns[1]
    const remote = columns[2]
    const hasState = columns.length >= 5
    const state = hasState ? columns[3] : null
    const pidText = hasState ? columns[4] : columns[3]
    const pid = Number.parseInt(pidText, 10)

    connections.push({
      protocol: proto.toUpperCase(),
      local,
      remote,
      state,
      pid: Number.isFinite(pid) ? pid : null
    })
    if (connections.length >= MAX_CONNECTIONS) break
  }
  return connections
}

export function summariseConnections(connections) {
  const byState = {}
  const byProtocol = {}
  for (const connection of connections) {
    const state = connection.state ?? 'STATELESS'
    byState[state] = (byState[state] ?? 0) + 1
    byProtocol[connection.protocol] = (byProtocol[connection.protocol] ?? 0) + 1
  }
  return { byState, byProtocol }
}

export async function readConnections() {
  const result = await exec('netstat', ['-ano'], { timeout: 20000, maxBuffer: 16 * 1024 * 1024 })
  const connections = parseConnections(result.output)
  return {
    connections,
    summary: summariseConnections(connections),
    total: connections.length,
    error:
      connections.length === 0 ? (result.error ?? 'No connections reported by netstat') : null,
    checkedAt: new Date().toISOString()
  }
}

export function readTraffic() {
  startSampler()
  const usage = getUsageSummary()
  return {
    rateRx: usage.rateRx,
    rateTx: usage.rateTx,
    today: usage.today,
    month: usage.month,
    sampledAt: usage.sampledAt,
    error: usage.error
  }
}

function tcpPing(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint()
    const socket = connect({ host, port })
    let settled = false

    const finish = (value) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(value)
    }

    socket.setTimeout(timeoutMs, () => finish(null))
    socket.once('connect', () => {
      const ms = Number(process.hrtime.bigint() - started) / 1e6
      finish(Number(ms.toFixed(2)))
    })
    socket.once('error', () => finish(null))
  })
}

export async function pingHost({ host, port, count }) {
  const samples = []
  for (let index = 0; index < count; index += 1) {
    const value = await tcpPing(host, port, 2000)
    if (value !== null) samples.push(value)
  }

  const avg = samples.length
    ? Number((samples.reduce((sum, value) => sum + value, 0) / samples.length).toFixed(2))
    : null

  return {
    host,
    port,
    attempts: count,
    received: samples.length,
    lossPercent: Number((((count - samples.length) / count) * 100).toFixed(1)),
    minMs: samples.length ? Math.min(...samples) : null,
    avgMs: avg,
    maxMs: samples.length ? Math.max(...samples) : null,
    samples
  }
}
