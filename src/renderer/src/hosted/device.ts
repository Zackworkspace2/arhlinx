export interface DeviceProfile {
  browser: string
  os: string
  platform: string
  language: string
  timezone: string
  screen: string
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
      connection?: {
        effectiveType?: string
        downlink?: number
        rtt?: number
        saveData?: boolean
      }
    }
  ).connection

  return {
    effectiveType: connection?.effectiveType ?? null,
    downlinkMbps: typeof connection?.downlink === 'number' ? connection.downlink : null,
    rttMs: typeof connection?.rtt === 'number' ? connection.rtt : null,
    saveData: connection?.saveData === true
  }
}

export interface ClientSpeedResult {
  pingMs: number | null
  downloadMbps: number | null
  uploadMbps: number | null
}

async function measurePing(samples = 5): Promise<number | null> {
  const times: number[] = []
  for (let index = 0; index < samples; index += 1) {
    const started = performance.now()
    try {
      await fetch(`/api/whoami?probe=${Date.now()}`, { cache: 'no-store' })
      times.push(performance.now() - started)
    } catch {
      return null
    }
  }
  if (times.length === 0) return null
  return Number((times.reduce((sum, value) => sum + value, 0) / times.length).toFixed(1))
}

async function measureDownload(bytes = 10_000_000): Promise<number | null> {
  const started = performance.now()
  try {
    const response = await fetch(`https://speed.cloudflare.com/__down?bytes=${bytes}`, {
      cache: 'no-store'
    })
    if (!response.ok) return null
    const buffer = await response.arrayBuffer()
    const seconds = (performance.now() - started) / 1000
    if (seconds <= 0 || buffer.byteLength === 0) return null
    return Number(((buffer.byteLength * 8) / seconds / 1e6).toFixed(2))
  } catch {
    return null
  }
}

async function measureUpload(bytes = 1_000_000): Promise<number | null> {
  const payload = new Uint8Array(bytes)
  const started = performance.now()
  try {
    const response = await fetch('https://speed.cloudflare.com/__up', {
      method: 'POST',
      body: payload
    })
    if (!response.ok) return null
    await response.arrayBuffer()
    const seconds = (performance.now() - started) / 1000
    if (seconds <= 0) return null
    return Number(((bytes * 8) / seconds / 1e6).toFixed(2))
  } catch {
    return null
  }
}

export async function runClientSpeedTest(
  onPhase?: (phase: 'ping' | 'download' | 'upload') => void
): Promise<ClientSpeedResult> {
  onPhase?.('ping')
  const pingMs = await measurePing()
  onPhase?.('download')
  const downloadMbps = await measureDownload()
  onPhase?.('upload')
  const uploadMbps = await measureUpload()
  return { pingMs, downloadMbps, uploadMbps }
}
