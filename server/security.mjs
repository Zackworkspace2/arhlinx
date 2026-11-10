const LOCAL_HOSTNAMES = new Set(['localhost', 'localhost.', '127.0.0.1', '::1', '[::1]'])

const PRIVATE_ADDRESS =
  /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3}|f[cd][0-9a-f]{2}:|fe80:)/i

export function isPrivateHostname(name) {
  return PRIVATE_ADDRESS.test(String(name).toLowerCase())
}

/**
 * Host header allow-list: blocks DNS-rebinding tricks that point a public name at
 * this machine. LAN mode additionally accepts private addresses so phones can reach it.
 */
export function isAllowedHost(hostHeader, allowRemote = false) {
  if (!hostHeader) return false
  const host = String(hostHeader).trim().toLowerCase()
  const isIpv6 = host.startsWith('[')
  const name = isIpv6 ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0]
  if (LOCAL_HOSTNAMES.has(name)) return true
  return allowRemote && isPrivateHostname(name.replace(/^\[|\]$/g, ''))
}

/** Browsers send Origin on cross-origin and POST requests; anything non-local is rejected. */
export function isAllowedOrigin(origin, allowRemote = false) {
  if (!origin) return true
  try {
    const url = new URL(origin)
    const hostname = url.hostname.toLowerCase()
    if (LOCAL_HOSTNAMES.has(hostname)) return true
    return allowRemote && isPrivateHostname(hostname.replace(/^\[|\]$/g, ''))
  } catch {
    return false
  }
}

/** Sec-Fetch-Site is set by Chromium; "cross-site" means another website is calling us. */
export function isCrossSiteRequest(secFetchSite) {
  return typeof secFetchSite === 'string' && secFetchSite.toLowerCase() === 'cross-site'
}

/** Prevent local filesystem paths and stack details from leaking in API errors. */
export function sanitizeMessage(message, maxLength = 200) {
  if (typeof message !== 'string') return 'Request failed'
  const cleaned = message
    .replace(/[A-Za-z]:\\[^\s'"]+/g, '<path>')
    .replace(/\\\\[^\s'"]+/g, '<path>')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}…` : cleaned || 'Request failed'
}

export function createRateLimiter() {
  const lastHit = new Map()
  return function allow(key, minIntervalMs) {
    const now = Date.now()
    const previous = lastHit.get(key) ?? 0
    if (now - previous < minIntervalMs) return false
    lastHit.set(key, now)
    return true
  }
}

/**
 * Per-endpoint minimum interval. Browsers poll a few of these every 5-15s, so the
 * limits are generous for legitimate use and still stop request floods.
 */
export const RATE_LIMITS = [
  { prefix: '/api/speed/stream', minIntervalMs: 5000 },
  { prefix: '/api/data/clear', minIntervalMs: 1500 },
  { prefix: '/api/monitor/ping', minIntervalMs: 1500 },
  { prefix: '/api/devices', minIntervalMs: 3000 },
  { prefix: '/api/firewall', minIntervalMs: 2000 },
  { prefix: '/api/coverage', minIntervalMs: 1500 },
  { prefix: '/api/network', minIntervalMs: 1500 },
  { prefix: '/api/overview', minIntervalMs: 900 },
  { prefix: '/api/usage', minIntervalMs: 900 },
  { prefix: '/api/monitor', minIntervalMs: 900 },
  { prefix: '/api/wifi', minIntervalMs: 900 }
]

export function rateLimitFor(pathname) {
  const match = RATE_LIMITS.find((entry) => pathname.startsWith(entry.prefix))
  return match ? match.minIntervalMs : 0
}
