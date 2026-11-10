import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { handleApi } from './api.mjs'
import { isAllowedHost } from './security.mjs'

const PORT = Number(process.env.PORT ?? 8787)
const DIST = resolve('dist')
const ALLOW_REMOTE = process.env.ARHLINX_ALLOW_REMOTE === '1'
const HOST = process.env.HOST ?? (ALLOW_REMOTE ? '0.0.0.0' : '127.0.0.1')
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

if (!LOOPBACK.has(HOST) && !ALLOW_REMOTE) {
  console.error(
    `Refusing to bind ${HOST}: this app exposes network scanning and firewall data.\n` +
      'Set ARHLINX_ALLOW_REMOTE=1 only if you understand the risk.'
  )
  process.exit(1)
}

function lanAddresses() {
  const found = []
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address)) {
        found.push(entry.address)
      }
    }
  }
  return found
}

const SECURITY_HEADERS = {
  'content-security-policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'geolocation=(), camera=(), microphone=(), usb=()',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin'
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2'
}

function sendFile(req, res, filePath) {
  const stream = createReadStream(filePath)
  res.writeHead(200, {
    'content-type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600'
  })
  if (req.method === 'HEAD') {
    stream.destroy()
    res.end()
    return
  }
  stream.pipe(res)
  stream.on('error', () => res.destroy())
}

function resolveStaticPath(urlPath) {
  let decoded
  try {
    decoded = decodeURIComponent(urlPath)
  } catch {
    return { error: 'Malformed path' }
  }
  if (decoded.includes('\0')) return { error: 'Malformed path' }

  // Reject traversal attempts outright instead of collapsing them into a SPA route.
  if (decoded.split(/[\\/]/).includes('..')) return { error: 'Not found' }

  const relative = normalize(decoded).replace(/^([/\\])+/, '')
  const segments = relative.split(/[\\/]/)
  if (segments.some((segment) => segment.startsWith('.') || segment === 'node_modules')) {
    return { error: 'Not found' }
  }

  const candidate = join(DIST, relative)
  if (relative !== '' && !candidate.startsWith(DIST + sep)) return { error: 'Not found' }
  return { candidate, relative }
}

const server = createServer(async (req, res) => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value)

  if (!isAllowedHost(req.headers.host, ALLOW_REMOTE)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Host not allowed')
    return
  }

  if (await handleApi(req, res)) return

  // The WHATWG URL parser collapses dot segments, so check the raw target first.
  const rawPath = (req.url ?? '/').split('?')[0]
  if (/%2e|\.\./i.test(rawPath)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Not found')
    return
  }

  if (!existsSync(join(DIST, 'index.html'))) {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('dist/ is missing. Run: npm run build')
    return
  }

  const urlPath = new URL(req.url ?? '/', 'http://localhost').pathname
  const resolved = resolveStaticPath(urlPath)
  if (resolved.error) {
    res.writeHead(resolved.error === 'Malformed path' ? 400 : 404, {
      'content-type': 'text/plain; charset=utf-8'
    })
    res.end(resolved.error)
    return
  }

  const { candidate, relative } = resolved
  if (relative !== '' && existsSync(candidate) && statSync(candidate).isFile()) {
    sendFile(req, res, candidate)
    return
  }

  sendFile(req, res, join(DIST, 'index.html'))
})

server.headersTimeout = 10000
server.requestTimeout = 20000
server.keepAliveTimeout = 5000

server.listen(PORT, HOST, () => {
  console.log(`ArhLinx on http://${HOST}:${PORT}`)
  if (ALLOW_REMOTE) {
    console.log('LAN mode is ON — no authentication. Use only on a network you trust.')
    for (const address of lanAddresses()) console.log(`  phone: http://${address}:${PORT}`)
  } else {
    console.log('loopback only (set ARHLINX_ALLOW_REMOTE=1 for phone/LAN access)')
  }
})
