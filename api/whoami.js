/** Vercel serverless function: returns what the network sees about this visitor. */
export default function handler(request, response) {
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

  response.setHeader('cache-control', 'no-store')
  response.status(200).json({
    ip,
    city: decode(headers['x-vercel-ip-city']),
    region: decode(headers['x-vercel-ip-country-region']),
    country: decode(headers['x-vercel-ip-country']),
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    timezone: decode(headers['x-vercel-ip-timezone']),
    userAgent: headers['user-agent'] ?? null,
    source: 'vercel'
  })
}
