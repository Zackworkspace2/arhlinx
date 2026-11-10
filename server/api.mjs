import { z } from 'zod'
import { readFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { readStatus, readNetworks, readProfiles } from './netsh.mjs'
import { runSpeedTest } from './speedtest.mjs'
import { insertSpeedTest, listSpeedTests, clearSpeedTests, clearUsage } from './db.mjs'
import { getUsageSummary, saveUsageLimit, startSampler } from './usage.mjs'
import { readFirewall } from './firewall.mjs'
import { readNetworkConfig } from './network.mjs'
import { readCoverage } from './coverage.mjs'
import { pingHost, readConnections, readTraffic } from './monitor.mjs'
import { scanDevices } from './devices.mjs'
import {
  createRateLimiter,
  isAllowedHost,
  isAllowedOrigin,
  isCrossSiteRequest,
  rateLimitFor,
  sanitizeMessage
} from './security.mjs'

const APP_VERSION = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
).version

const allowRequest = createRateLimiter()
const ALLOW_REMOTE = process.env.ARHLINX_ALLOW_REMOTE === '1'
const cache = new Map()

async function cached(key, ttlMs, loader) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ttlMs) return hit.value
  const value = await loader()
  cache.set(key, { at: Date.now(), value })
  return value
}

function json(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload)
  })
  res.end(payload)
}

function httpError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function readJson(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    let rejected = false
    const chunks = []
    req.on('data', (chunk) => {
      if (rejected) return
      size += chunk.length
      if (size > limit) {
        rejected = true
        chunks.length = 0
        reject(httpError('Request body too large', 413))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8').trim()
      if (text === '') {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(text))
      } catch {
        reject(httpError('Request body is not valid JSON', 400))
      }
    })
    req.on('error', reject)
  })
}

let speedTestRunning = false

async function handleSpeedStream(res) {
  if (speedTestRunning) {
    json(res, 409, { error: 'A speed test is already running.' })
    return
  }
  speedTestRunning = true

  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no'
  })

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  try {
    const result = await runSpeedTest((phase) => send('phase', { phase }))
    const saved = insertSpeedTest(result)
    send('result', saved)
  } catch (error) {
    send('failure', { message: error instanceof Error ? error.message : String(error) })
  } finally {
    speedTestRunning = false
    res.end()
  }
}

const limitSchema = z.object({
  limitGb: z.number().finite().min(0).max(1_000_000).nullable(),
  alertPercent: z.number().int().min(1).max(100).optional()
})

const pingSchema = z.object({
  host: z
    .string()
    .min(1)
    .max(253)
    .regex(/^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$/, 'Host must be a hostname or IP address'),
  port: z.number().int().min(1).max(65535),
  count: z.number().int().min(1).max(10)
})

const clearSchema = z.object({
  scope: z.enum(['speed', 'usage', 'all'])
})

const getRoutes = {
  '/api/health': async () => ({
    ok: true,
    appVersion: APP_VERSION,
    platform: process.platform,
    version: process.versions.node,
    time: new Date().toISOString()
  }),
  '/api/wifi/status': () => cached('status', 1500, readStatus),
  '/api/wifi/networks': () => cached('networks', 2500, readNetworks),
  '/api/wifi/profiles': () => cached('profiles', 5000, readProfiles),
  '/api/speed/history': async (url) => {
    const requested = Number.parseInt(url.searchParams.get('limit') ?? '20', 10)
    const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 100) : 20
    return { results: listSpeedTests(limit) }
  },
  '/api/usage/summary': async () => {
    startSampler()
    return getUsageSummary()
  },
  '/api/firewall': () => cached('firewall', 5000, readFirewall),
  '/api/network': () => cached('network', 5000, readNetworkConfig),
  '/api/coverage': () => cached('coverage', 3000, readCoverage),
  '/api/monitor/connections': () => cached('connections', 2000, readConnections),
  '/api/monitor/traffic': () => readTraffic(),
  '/api/monitor/ping': async (url) => {
    const host = url.searchParams.get('host') ?? '1.1.1.1'
    const port = Number.parseInt(url.searchParams.get('port') ?? '443', 10)
    const count = Number.parseInt(url.searchParams.get('count') ?? '6', 10)
    const input = pingSchema.parse({ host, port, count })
    return pingHost(input)
  },
  '/api/devices': async (url) => scanDevices({ force: url.searchParams.get('refresh') === '1' }),
  '/api/whoami': async (_url, req) => whoami(req),
  '/api/overview': () => cached('overview', 2000, readOverview)
}

function localIPv4() {
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) return entry.address
    }
  }
  return null
}

function whoami(req) {
  const forwarded = req.headers['x-forwarded-for']
  const forwardedText = Array.isArray(forwarded) ? forwarded[0] : forwarded
  const ip =
    (forwardedText ?? '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    localIPv4()

  return {
    ip,
    city: null,
    region: null,
    country: null,
    latitude: null,
    longitude: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    userAgent: req.headers['user-agent'] ?? null,
    source: 'local'
  }
}

async function readOverview() {
  const settle = async (loader) => {
    try {
      return await loader()
    } catch {
      return null
    }
  }

  const [wifi, usage, lastSpeed, firewall, network] = await Promise.all([
    settle(readStatus),
    settle(async () => {
      startSampler()
      return getUsageSummary()
    }),
    settle(async () => listSpeedTests(1)[0] ?? null),
    settle(readFirewall),
    settle(readNetworkConfig)
  ])

  return {
    wifi: wifi
      ? {
          adapterState: wifi.adapter?.state ?? null,
          ssid: wifi.connection?.ssid ?? null,
          signal: wifi.connection?.signal ?? null,
          detailError: wifi.detailError
        }
      : null,
    usage: usage
      ? {
          today: usage.today,
          month: usage.month,
          rateRx: usage.rateRx,
          rateTx: usage.rateTx
        }
      : null,
    lastSpeed: lastSpeed ?? null,
    firewall: firewall
      ? {
          on: firewall.profiles.filter((profile) => /^on$/i.test(profile.state ?? '')).length,
          off: firewall.profiles.filter((profile) => /^off$/i.test(profile.state ?? '')).length,
          total: firewall.profiles.length
        }
      : null,
    hostname: network?.hostname ?? null,
    generatedAt: new Date().toISOString()
  }
}

const postRoutes = {
  '/api/usage/limit': async (req) => {
    const body = await readJson(req)
    const input = limitSchema.parse(body)
    startSampler()
    return saveUsageLimit(input)
  },
  '/api/data/clear': async (req) => {
    const body = await readJson(req)
    const { scope } = clearSchema.parse(body)
    const cleared = {
      speed: scope === 'speed' || scope === 'all' ? clearSpeedTests() : 0,
      usage: scope === 'usage' || scope === 'all' ? clearUsage() : 0
    }
    return { scope, cleared }
  }
}

/**
 * Handles /api/* requests. Returns true when the request was handled.
 */
export async function handleApi(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (!url.pathname.startsWith('/api/')) return false

  if (!isAllowedHost(req.headers.host, ALLOW_REMOTE)) {
    json(res, 403, { error: 'Host header not allowed' })
    return true
  }

  if (
    isCrossSiteRequest(req.headers['sec-fetch-site']) ||
    !isAllowedOrigin(req.headers.origin, ALLOW_REMOTE)
  ) {
    json(res, 403, { error: 'Cross-site requests are not allowed' })
    return true
  }

  const method = req.method ?? 'GET'

  if (method === 'POST') {
    const contentType = String(req.headers['content-type'] ?? '')
    if (!contentType.toLowerCase().includes('application/json')) {
      json(res, 415, { error: 'Content-Type must be application/json' })
      return true
    }
  }

  const minInterval = rateLimitFor(url.pathname)
  if (minInterval > 0 && !allowRequest(url.pathname, minInterval)) {
    res.setHeader('retry-after', String(Math.max(1, Math.ceil(minInterval / 1000))))
    json(res, 429, { error: 'Too many requests, slow down.' })
    return true
  }

  if (url.pathname === '/api/speed/stream') {
    if (method !== 'GET') {
      json(res, 405, { error: 'Method not allowed' })
      return true
    }
    await handleSpeedStream(res)
    return true
  }

  const table = method === 'GET' ? getRoutes : method === 'POST' ? postRoutes : null
  if (!table) {
    json(res, 405, { error: 'Method not allowed' })
    return true
  }

  const route = table[url.pathname]
  if (!route) {
    json(res, 404, { error: `Unknown endpoint ${url.pathname}` })
    return true
  }

  try {
    const result = method === 'POST' ? await route(req) : await route(url, req)
    json(res, 200, result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      json(res, 400, { error: error.issues[0]?.message ?? 'Invalid request' })
      return true
    }
    const statusCode =
      error && typeof error.statusCode === 'number' ? error.statusCode : 500
    json(res, statusCode, {
      error: sanitizeMessage(error instanceof Error ? error.message : String(error))
    })
  }
  return true
}
