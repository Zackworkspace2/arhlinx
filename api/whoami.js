const ISP_CACHE = new Map()
const CACHE_MS = 10 * 60 * 1000

async function lookupNetwork(ip) {
  if (!ip) return {}
  const cached = ISP_CACHE.get(ip)
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value

  try {
    const response = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json`, {
      signal: AbortSignal.timeout(2500),
      headers: { accept: 'application/json' }
    })
    if (!response.ok) return {}
    const data = await response.json()
    const org = typeof data.org === 'string' ? data.org : null
    const value = {
      isp: org,
      asn: org ? (org.match(/^AS\d+/)?.[0] ?? null) : null,
      city: typeof data.city === 'string' ? data.city : null,
      country: typeof data.country === 'string' ? data.country : null
    }
    ISP_CACHE.set(ip, { at: Date.now(), value })
    return value
  } catch {
    return {}
  }
}

/** Vercel serverless function: what the network sees about this visitor. */
export default async function handler(request, response) {
  const headers = request.headers ?? {}

  const forwarded = headers['x-forwarded-for']
  const forwardedText = Array.isArray(forwarded) ? forwarded[0] : forwarded
  const ip =
    (forwardedText ?? '').split(',')[0].trim() ||
    headers['x-real-ip'] ||
    request.socket?.remoteAddress ||
    null

  const decode = (value) => {
    if (typeof value !== 'string' || value === '') return null
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }

  const latitude = Number.parseFloat(headers['x-vercel-ip-latitude'] ?? '')
  const longitude = Number.parseFloat(headers['x-vercel-ip-longitude'] ?? '')

  const lookup = await lookupNetwork(ip)

  response.setHeader('cache-control', 'no-store')
  response.status(200).json({
    ip,
    city: decode(headers['x-vercel-ip-city']) ?? lookup.city ?? null,
    region: decode(headers['x-vercel-ip-country-region']),
    country: decode(headers['x-vercel-ip-country']) ?? lookup.country ?? null,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    timezone: decode(headers['x-vercel-ip-timezone']),
    isp: lookup.isp ?? null,
    asn: lookup.asn ?? null,
    userAgent: headers['user-agent'] ?? null,
    source: 'vercel'
  })
}
