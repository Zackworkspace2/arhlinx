import { exec } from './exec.mjs'
import { readNetworkConfig } from './network.mjs'

const MAX_HOSTS = 254
const CONCURRENCY = 32
const SCAN_CACHE_MS = 30000

export function maskToPrefix(mask) {
  const parts = String(mask).split('.').map((part) => Number.parseInt(part, 10))
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part < 0 || part > 255)) {
    return null
  }
  let bits = 0
  for (const part of parts) {
    for (let index = 7; index >= 0; index -= 1) {
      if ((part >> index) & 1) bits += 1
      else return bits
    }
  }
  return bits
}

function ipToInt(ip) {
  const parts = String(ip).split('.').map((part) => Number.parseInt(part, 10))
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part < 0 || part > 255)) {
    return null
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function intToIp(value) {
  const number = value >>> 0
  return [number >>> 24, (number >>> 16) & 255, (number >>> 8) & 255, number & 255].join('.')
}

/** Hosts inside the subnet, capped at a /24 so a scan stays fast. */
export function hostRange(ip, mask) {
  const prefix = maskToPrefix(mask)
  const address = ipToInt(ip)
  if (prefix === null || address === null || prefix >= 31) return []

  const size = 2 ** (32 - prefix)
  const usable = Math.min(size - 2, MAX_HOSTS)
  const networkMask = (0xffffffff << (32 - prefix)) >>> 0
  const network = (address & networkMask) >>> 0
  const hosts = []
  for (let offset = 1; offset <= usable; offset += 1) {
    const candidate = network + offset
    if (candidate === address) continue
    hosts.push(intToIp(candidate))
  }
  return hosts
}

export function parseArp(output) {
  const entries = new Map()
  const pattern = /^\s*(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-f]{2}(?:-[0-9a-f]{2}){5})\s+(\S+)/gim
  let match
  while ((match = pattern.exec(output)) !== null) {
    entries.set(match[1], {
      mac: match[2].toUpperCase().replace(/-/g, ':'),
      type: match[3].toLowerCase()
    })
  }
  return entries
}

export function parsePingResult(output) {
  const text = String(output)
  const hasTtl = /TTL=\d+/i.test(text)
  const failed = /unreachable|100%\s*loss|Request timed out|could not find host|Destination net/i.test(
    text
  )
  const nameMatch = text.match(/Pinging\s+(\S+)\s+\[/i)
  return {
    reachable: hasTtl && !failed,
    hostname: nameMatch ? nameMatch[1] : null
  }
}

export function buildDevices({ arp, pings, ip, gateways = [] }) {
  const devices = []
  const seen = new Set()

  for (const [address, entry] of arp.entries()) {
    seen.add(address)
    const ping = pings.get(address)
    devices.push({
      ip: address,
      mac: entry.mac,
      name: ping?.hostname ?? null,
      online: Boolean(ping?.reachable),
      type: entry.type,
      self: address === ip,
      gateway: gateways.includes(address)
    })
  }

  for (const [address, ping] of pings.entries()) {
    if (seen.has(address) || !ping.reachable) continue
    devices.push({
      ip: address,
      mac: null,
      name: ping.hostname,
      online: true,
      type: 'unknown',
      self: address === ip,
      gateway: gateways.includes(address)
    })
  }

  return devices.sort((a, b) => {
    if (a.self !== b.self) return a.self ? -1 : 1
    if (a.gateway !== b.gateway) return a.gateway ? -1 : 1
    const left = ipToInt(a.ip) ?? 0
    const right = ipToInt(b.ip) ?? 0
    return left - right
  })
}

async function pool(items, worker, concurrency = CONCURRENCY) {
  const results = new Map()
  let index = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const current = index
      index += 1
      if (current >= items.length) return
      const item = items[current]
      results.set(item, await worker(item))
    }
  })
  await Promise.all(runners)
  return results
}

async function pingHost(address) {
  const result = await exec('ping', ['-a', '-n', '1', '-w', '300', address], { timeout: 5000 })
  return parsePingResult(result.output)
}

let pendingScan = null
let cachedScan = null

async function runScan() {
  const started = Date.now()
  const config = await readNetworkConfig()
  const adapter = (config.adapters ?? []).find(
    (candidate) => candidate.ipv4.length > 0 && candidate.subnetMasks.length > 0
  )

  if (!adapter) {
    return {
      adapter: null,
      subnet: null,
      hostsInSubnet: 0,
      devices: [],
      onlineCount: 0,
      durationMs: Date.now() - started,
      error: config.error ?? 'No IPv4 adapter with a subnet mask was reported.',
      scannedAt: new Date().toISOString()
    }
  }

  const ip = adapter.ipv4[0]
  const mask = adapter.subnetMasks[0]
  const hosts = hostRange(ip, mask)

  const before = await exec('arp', ['-a'], { timeout: 8000 })
  const arp = parseArp(before.output)

  const pings = await pool(hosts, pingHost, CONCURRENCY)

  const after = await exec('arp', ['-a'], { timeout: 8000 })
  const arpAfter = parseArp(after.output)
  for (const [address, entry] of arpAfter.entries()) {
    if (!arp.has(address)) arp.set(address, entry)
  }

  const devices = buildDevices({ arp, pings, ip, gateways: adapter.gateways })

  return {
    adapter: {
      name: adapter.name,
      ip,
      mask,
      description: adapter.description
    },
    subnet: `${ip}/${maskToPrefix(mask)}`,
    hostsInSubnet: hosts.length + 1,
    devices,
    onlineCount: devices.filter((device) => device.online).length,
    durationMs: Date.now() - started,
    error: devices.length === 0 ? (before.error ?? 'No devices found on this subnet.') : null,
    scannedAt: new Date().toISOString()
  }
}

/** Cached scan; concurrent callers share one sweep. */
export async function scanDevices({ force = false } = {}) {
  if (!force && cachedScan && Date.now() - cachedScan.at < SCAN_CACHE_MS) {
    return cachedScan.value
  }
  if (pendingScan) return pendingScan

  pendingScan = runScan()
    .then((value) => {
      cachedScan = { at: Date.now(), value }
      return value
    })
    .finally(() => {
      pendingScan = null
    })

  return pendingScan
}
