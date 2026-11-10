import { connect } from 'node:net'

const PING_HOST = '1.1.1.1'
const PING_PORT = 443
const PING_SAMPLES = 12
const DOWNLOAD_URL = 'https://speed.cloudflare.com/__down?bytes=25000000'
const UPLOAD_URL = 'https://speed.cloudflare.com/__up'
const PHASE_MS = 7000
const TARGET = 'speed.cloudflare.com'

export function computeMbps(bytes, seconds) {
  if (!Number.isFinite(bytes) || !Number.isFinite(seconds) || bytes <= 0 || seconds <= 0) return 0
  return Number(((bytes * 8) / seconds / 1e6).toFixed(2))
}

export function computeJitter(samples) {
  if (samples.length < 2) return 0
  let total = 0
  for (let index = 1; index < samples.length; index += 1) {
    total += Math.abs(samples[index] - samples[index - 1])
  }
  return Number((total / (samples.length - 1)).toFixed(2))
}

export function average(samples) {
  if (samples.length === 0) return 0
  return Number((samples.reduce((sum, value) => sum + value, 0) / samples.length).toFixed(2))
}

function pingOnce(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint()
    const socket = connect({ host: PING_HOST, port: PING_PORT })
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

export async function measurePing(count = PING_SAMPLES) {
  const samples = []
  for (let index = 0; index < count; index += 1) {
    const value = await pingOnce()
    if (value !== null) samples.push(value)
    await new Promise((resolve) => setTimeout(resolve, 40))
  }
  if (samples.length === 0) throw new Error('Ping failed: no replies from 1.1.1.1')
  return { pingMs: average(samples), jitterMs: computeJitter(samples), samples }
}

export async function measureDownload(maxMs = PHASE_MS) {
  const deadline = performance.now() + maxMs
  let bytes = 0
  let firstByteAt = null
  let lastByteAt = null
  let requests = 0

  while (performance.now() < deadline) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), Math.max(deadline - performance.now(), 0))
    try {
      const response = await fetch(DOWNLOAD_URL, { signal: controller.signal, cache: 'no-store' })
      if (!response.ok || !response.body) throw new Error(`Download failed (${response.status})`)
      requests += 1
      const reader = response.body.getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          if (firstByteAt === null) firstByteAt = performance.now()
          lastByteAt = performance.now()
          bytes += value.byteLength
        }
      }
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError'
      if (!aborted) throw error
      break
    } finally {
      clearTimeout(timer)
    }
  }

  const elapsed = firstByteAt !== null && lastByteAt !== null ? (lastByteAt - firstByteAt) / 1000 : 0
  if (bytes === 0 || elapsed <= 0) throw new Error('Download failed: no data received')
  return {
    mbps: computeMbps(bytes, elapsed),
    bytes,
    seconds: Number(elapsed.toFixed(2)),
    requests
  }
}

export async function measureUpload(maxMs = PHASE_MS) {
  const chunk = Buffer.alloc(1_000_000, 0x61)
  const started = performance.now()
  let bytes = 0
  let firstDoneAt = null
  let lastDoneAt = null

  while (performance.now() - started < maxMs) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), maxMs)
    try {
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: chunk,
        signal: controller.signal
      })
      if (!response.ok) throw new Error(`Upload failed (${response.status})`)
      await response.arrayBuffer()
      bytes += chunk.byteLength
      if (firstDoneAt === null) firstDoneAt = performance.now()
      lastDoneAt = performance.now()
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError'
      if (!aborted) throw error
      break
    } finally {
      clearTimeout(timer)
    }
  }

  const elapsed = firstDoneAt !== null && lastDoneAt !== null ? (lastDoneAt - firstDoneAt) / 1000 : 0
  if (bytes === 0 || elapsed <= 0) throw new Error('Upload failed: no data sent')
  return { mbps: computeMbps(bytes, elapsed), bytes, seconds: Number(elapsed.toFixed(2)) }
}

/**
 * Runs ping, download and upload in order. `onPhase` is called before each
 * measurement so the UI can show real progress.
 */
export async function runSpeedTest(onPhase = () => {}) {
  onPhase('ping')
  const ping = await measurePing()

  onPhase('download')
  const download = await measureDownload()

  onPhase('upload')
  const upload = await measureUpload()

  return {
    id: 0,
    at: new Date().toISOString(),
    downloadMbps: download.mbps,
    uploadMbps: upload.mbps,
    pingMs: ping.pingMs,
    jitterMs: ping.jitterMs,
    target: TARGET
  }
}
