export interface DeviceProfile {
  browser: string
  os: string
  platform: string
  language: string
  timezone: string
  screen: string
  viewport: string
  pixelRatio: number
  cores: number | null
  memoryGb: number | null
  touch: boolean
  online: boolean
}

export interface ConnectionHint {
  effectiveType: string | null
  downlinkMbps: number | null
  rttMs: number | null
  saveData: boolean
}

export interface ClientSpeedResult {
  pingMs: number | null
  downloadMbps: number | null
  uploadMbps: number | null
  at: string
}

export interface LatencyResult {
  samples: number[]
  minMs: number
  avgMs: number
  maxMs: number
  jitterMs: number
  lossPercent: number
  at: string
}

export interface Reachability {
  name: string
  host: string
  ms: number | null
  ok: boolean
}

export interface Capabilities {
  webgl: string | null
  wasm: boolean
  storage: boolean
  serviceWorker: boolean
  cookies: boolean
  webrtc: boolean
  online: boolean
}

export function parseUserAgent(userAgent: string): { browser: string; os: string } {
  const ua = userAgent

  let browser = 'Browser'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/OPR\//.test(ua)) browser = 'Opera'
  else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Safari\//.test(ua)) browser = 'Safari'

  let os = 'Unknown OS'
  if (/Windows NT 10/.test(ua)) os = 'Windows 10/11'
  else if (/Windows NT 6\.3/.test(ua)) os = 'Windows 8.1'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS'
  else if (/Mac OS X/.test(ua)) os = 'macOS'
  else if (/CrOS/.test(ua)) os = 'ChromeOS'
  else if (/Linux/.test(ua)) os = 'Linux'

  return { browser, os }
}

export function describeDevice(): DeviceProfile {
  const ua = navigator.userAgent
  const { browser, os } = parseUserAgent(ua)
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null

  return {
    browser,
    os,
    platform: navigator.platform || 'unknown',
    language: navigator.language || 'unknown',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'unknown',
    screen: `${window.screen.width}×${window.screen.height}`,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio || 1,
    cores: navigator.hardwareConcurrency || null,
    memoryGb: memory,
    touch: navigator.maxTouchPoints > 0,
    online: navigator.onLine
  }
}

export function readConnectionHints(): ConnectionHint {
  const connection = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean }
    }
  ).connection

  return {
    effectiveType: connection?.effectiveType ?? null,
    downlinkMbps: typeof connection?.downlink === 'number' ? connection.downlink : null,
    rttMs: typeof connection?.rtt === 'number' ? connection.rtt : null,
    saveData: connection?.saveData === true
  }
}

/** Composite 0-100 score from measured latency, jitter and throughput. */
export function qualityScore(input: {
  rttMs?: number | null
  jitterMs?: number | null
  downloadMbps?: number | null
}): { score: number; label: string } {
  const rtt = input.rttMs ?? null
  const jitter = input.jitterMs ?? null
  const down = input.downloadMbps ?? null

  let score = 0
  let weight = 0

  if (rtt !== null) {
    score += Math.max(0, 100 - Math.min(100, rtt * 1.6)) * 0.45
    weight += 0.45
  }
  if (jitter !== null) {
    score += Math.max(0, 100 - Math.min(100, jitter * 8)) * 0.25
    weight += 0.25
  }
  if (down !== null) {
    score += Math.min(100, (down / 100) * 100) * 0.3
    weight += 0.3
  }

  const final = weight > 0 ? Math.round(score / weight) : 0
  const label = final >= 85 ? 'Excellent' : final >= 65 ? 'Good' : final >= 40 ? 'Fair' : 'Weak'
  return { score: final, label }
}

async function timedFetch(url: string, init?: RequestInit): Promise<number> {
  const started = performance.now()
  await fetch(url, { cache: 'no-store', ...init })
  return Number((performance.now() - started).toFixed(1))
}

export async function measureLatency(samples = 8): Promise<LatencyResult> {
  const times: number[] = []
  let failures = 0

  for (let index = 0; index < samples; index += 1) {
    try {
      times.push(await timedFetch(`/api/whoami?probe=${index}-${Date.now()}`))
    } catch {
      failures += 1
    }
  }

  if (times.length === 0) {
    return { samples: [], minMs: 0, avgMs: 0, maxMs: 0, jitterMs: 0, lossPercent: 100, at: new Date().toISOString() }
  }

  let jitter = 0
  for (let index = 1; index < times.length; index += 1) {
    jitter += Math.abs(times[index] - times[index - 1])
  }

  return {
    samples: times,
    minMs: Math.min(...times),
    avgMs: Number((times.reduce((sum, value) => sum + value, 0) / times.length).toFixed(1)),
    maxMs: Math.max(...times),
    jitterMs: Number((jitter / Math.max(1, times.length - 1)).toFixed(1)),
    lossPercent: Number(((failures / samples) * 100).toFixed(0)),
    at: new Date().toISOString()
  }
}

const REACHABILITY_TARGETS = [
  { name: 'Cloudflare', host: 'cloudflare.com', url: 'https://cloudflare.com/cdn-cgi/trace' },
  { name: 'Google', host: 'google.com', url: 'https://www.google.com/generate_204' },
  { name: 'GitHub', host: 'github.com', url: 'https://github.com/favicon.ico' }
]

export async function checkReachability(): Promise<Reachability[]> {
  const results: Reachability[] = []
  for (const target of REACHABILITY_TARGETS) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 6000)
      const ms = await timedFetch(target.url, { mode: 'no-cors', signal: controller.signal })
      clearTimeout(timer)
      results.push({ name: target.name, host: target.host, ms, ok: true })
    } catch {
      results.push({ name: target.name, host: target.host, ms: null, ok: false })
    }
  }
  return results
}

export async function detectCapabilities(): Promise<Capabilities> {
  let webgl: string | null = null
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl') as WebGLRenderingContext | null
    if (context) {
      const info = context.getExtension('WEBGL_debug_renderer_info')
      webgl = info ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'WebGL'
    }
  } catch {
    webgl = null
  }

  let storage = false
  try {
    localStorage.setItem('arhlinx.probe', '1')
    localStorage.removeItem('arhlinx.probe')
    storage = true
  } catch {
    storage = false
  }

  return {
    webgl,
    wasm: typeof WebAssembly === 'object',
    storage,
    serviceWorker: 'serviceWorker' in navigator,
    cookies: navigator.cookieEnabled,
    webrtc: 'RTCPeerConnection' in window,
    online: navigator.onLine
  }
}

/** Host ICE candidates are the only local addresses a browser still exposes. */
export async function collectLocalAddresses(timeoutMs = 1500): Promise<string[]> {
  const Peer = window.RTCPeerConnection
  if (!Peer) return []

  const addresses = new Set<string>()
  const peer = new Peer({ iceServers: [] })

  return new Promise((resolve) => {
    const finish = () => {
      peer.close()
      resolve([...addresses])
    }

    const timer = setTimeout(finish, timeoutMs)

    peer.onicecandidate = (event) => {
      if (!event.candidate) {
        clearTimeout(timer)
        finish()
        return
      }
      const match = /(?:ipv4|ipv6) (\S+) \d+ typ/.exec(event.candidate.candidate)
      const value = match?.[1]
      if (value && value !== '0.0.0.0') addresses.add(value)
    }

    try {
      peer.createDataChannel('probe')
      void peer.createOffer().then((offer) => peer.setLocalDescription(offer))
    } catch {
      clearTimeout(timer)
      finish()
    }
  })
}

export async function runClientSpeedTest(
  onPhase?: (phase: 'ping' | 'download' | 'upload') => void
): Promise<ClientSpeedResult> {
  onPhase?.('ping')
  let pingMs: number | null = null
  try {
    const times: number[] = []
    for (let index = 0; index < 3; index += 1) {
      times.push(await timedFetch(`/api/whoami?probe=ping-${index}`))
    }
    pingMs = Number((times.reduce((sum, value) => sum + value, 0) / times.length).toFixed(1))
  } catch {
    pingMs = null
  }

  onPhase?.('download')
  let downloadMbps: number | null = null
  try {
    const started = performance.now()
    const response = await fetch('https://speed.cloudflare.com/__down?bytes=25000000', {
      cache: 'no-store'
    })
    if (response.ok) {
      const buffer = await response.arrayBuffer()
      const seconds = (performance.now() - started) / 1000
      if (seconds > 0 && buffer.byteLength > 0) {
        downloadMbps = Number(((buffer.byteLength * 8) / seconds / 1e6).toFixed(2))
      }
    }
  } catch {
    downloadMbps = null
  }

  onPhase?.('upload')
  let uploadMbps: number | null = null
  try {
    const payload = new Uint8Array(1_000_000)
    const started = performance.now()
    const response = await fetch('https://speed.cloudflare.com/__up', {
      method: 'POST',
      body: payload
    })
    if (response.ok) {
      await response.arrayBuffer()
      const seconds = (performance.now() - started) / 1000
      if (seconds > 0) uploadMbps = Number(((payload.byteLength * 8) / seconds / 1e6).toFixed(2))
    }
  } catch {
    uploadMbps = null
  }

  return { pingMs, downloadMbps, uploadMbps, at: new Date().toISOString() }
}
