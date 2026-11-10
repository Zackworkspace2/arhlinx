import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const TIMEOUT_MS = 15000

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Run netsh and keep stdout even on failure: netsh reports most errors there.
 */
async function netsh(args) {
  try {
    const { stdout } = await run('netsh', args, {
      windowsHide: true,
      timeout: TIMEOUT_MS,
      maxBuffer: 8 * 1024 * 1024,
      encoding: 'utf8'
    })
    return { ok: true, output: stdout, error: null }
  } catch (error) {
    const stdout = typeof error.stdout === 'string' ? error.stdout : ''
    const stderr = typeof error.stderr === 'string' ? error.stderr.trim() : ''
    const fallback = stderr || stdout.trim() || error.message || 'netsh failed'
    const friendly =
      error.code === 'EPERM' || /spawn EPERM/i.test(fallback)
        ? 'Windows blocked the netsh call in this environment (spawn EPERM).'
        : fallback
    return { ok: false, output: stdout, error: friendly }
  }
}

export function parseAdapters(output) {
  const adapters = []
  const pattern = /^\s*(Enabled|Disabled)\s+(Connected|Disconnected)\s+(\S+)\s+(.+?)\s*$/gm
  let match
  while ((match = pattern.exec(output)) !== null) {
    adapters.push({
      name: clean(match[4]),
      adminState: match[1],
      state: match[2],
      type: clean(match[3])
    })
  }
  return adapters
}

export function parseConnection(output) {
  const fields = new Map()
  const pattern = /^\s{2,}([A-Za-z][A-Za-z0-9 ()/%.+-]*?)\s*:\s*(.*)$/gm
  let match
  while ((match = pattern.exec(output)) !== null) {
    fields.set(match[1].trim().toLowerCase(), clean(match[2]))
  }
  if (fields.size === 0) return null

  const number = (key) => {
    const raw = fields.get(key)
    if (!raw) return null
    const parsed = Number.parseFloat(raw)
    return Number.isFinite(parsed) ? parsed : null
  }

  return {
    name: fields.get('name') ?? null,
    description: fields.get('description') ?? null,
    state: fields.get('state') ?? null,
    ssid: fields.get('ssid') ?? null,
    bssid: fields.get('bssid') ?? null,
    networkType: fields.get('network type') ?? null,
    radioType: fields.get('radio type') ?? null,
    authentication: fields.get('authentication') ?? null,
    cipher: fields.get('cipher') ?? null,
    channel: number('channel'),
    receiveRate: number('receive rate (mbps)'),
    transmitRate: number('transmit rate (mbps)'),
    signal: number('signal'),
    profile: fields.get('profile') ?? null
  }
}

export function parseNetworks(output) {
  const interfaceMatch = output.match(/Interface name\s*:\s*(.+)/i)
  const networks = []
  let current = null
  let currentBssid = null

  const pushNetwork = () => {
    if (!current) return
    current.bestSignal = current.bssids.reduce((max, bssid) => Math.max(max, bssid.signal ?? 0), 0)
    current.open = /open/i.test(current.authentication) || /none/i.test(current.authentication)
    networks.push(current)
    current = null
    currentBssid = null
  }

  for (const line of output.split(/\r?\n/)) {
    const ssidMatch = line.match(/^\s*SSID\s+\d+\s*:\s*(.*)$/i)
    if (ssidMatch) {
      pushNetwork()
      const ssid = clean(ssidMatch[1])
      current = {
        ssid,
        hidden: ssid === '',
        networkType: '',
        authentication: '',
        encryption: '',
        bssids: [],
        bestSignal: 0,
        open: false
      }
      continue
    }
    if (!current) continue

    const networkType = line.match(/^\s*Network type\s*:\s*(.+)$/i)
    if (networkType) {
      current.networkType = clean(networkType[1])
      continue
    }
    const authentication = line.match(/^\s*Authentication\s*:\s*(.+)$/i)
    if (authentication) {
      current.authentication = clean(authentication[1])
      continue
    }
    const encryption = line.match(/^\s*Encryption\s*:\s*(.+)$/i)
    if (encryption) {
      current.encryption = clean(encryption[1])
      continue
    }
    const bssidMatch = line.match(/^\s*BSSID\s+\d+\s*:\s*(\S+)/i)
    if (bssidMatch) {
      currentBssid = {
        bssid: clean(bssidMatch[1]),
        signal: null,
        radioType: '',
        band: '',
        channel: null
      }
      current.bssids.push(currentBssid)
      continue
    }
    if (!currentBssid) continue

    const signal = line.match(/^\s*Signal\s*:\s*(\d+)\s*%/i)
    if (signal) {
      currentBssid.signal = Number.parseInt(signal[1], 10)
      continue
    }
    const radioType = line.match(/^\s*Radio type\s*:\s*(.+)$/i)
    if (radioType) {
      currentBssid.radioType = clean(radioType[1])
      continue
    }
    const band = line.match(/^\s*Band\s*:\s*(.+)$/i)
    if (band) {
      currentBssid.band = clean(band[1])
      continue
    }
    const channel = line.match(/^\s*Channel\s*:\s*(\d+)/i)
    if (channel) currentBssid.channel = Number.parseInt(channel[1], 10)
  }
  pushNetwork()

  return {
    interfaceName: interfaceMatch ? clean(interfaceMatch[1]) : null,
    networks
  }
}

export function parseProfiles(output) {
  const interfaceMatch = output.match(/Profiles on interface\s+(.+?):/i)
  const profilePrefix = /(?:All User Profile|All User-Profile|当前用户配置文件)\s*:\s*(.+)$/i
  const profiles = []
  let scope = 'user'

  for (const line of output.split(/\r?\n/)) {
    if (/Group policy profiles/i.test(line)) {
      scope = 'group-policy'
      continue
    }
    if (/^User profiles/i.test(line)) {
      scope = 'user'
      continue
    }
    const match = line.match(profilePrefix)
    if (match) {
      const name = clean(match[1])
      if (name && name !== '<None>') profiles.push({ name, groupPolicy: scope === 'group-policy' })
    }
  }

  return {
    interfaceName: interfaceMatch ? clean(interfaceMatch[1]) : null,
    profiles
  }
}

export async function readAdapters() {
  const { ok, output, error } = await netsh(['interface', 'show', 'interface'])
  const adapters = parseAdapters(output)
  return {
    adapters,
    error: adapters.length === 0 ? (error ?? 'No network interfaces found') : null
  }
}

export async function readConnection() {
  const { ok, output, error } = await netsh(['wlan', 'show', 'interfaces'])
  const text = clean(error).toLowerCase()

  if (!ok && text.includes('no wireless interface')) {
    return { connection: null, error: 'No wireless interface on this system.', reason: 'no-adapter' }
  }
  if (!ok && (text.includes('error 5') || text.includes('elevation') || text.includes('administrator'))) {
    return {
      connection: null,
      error: 'Windows needs administrator rights to read the active SSID, signal and link rates.',
      reason: 'elevation'
    }
  }
  if (!ok && parseConnection(output) === null) {
    return {
      connection: null,
      error: error ?? 'Unable to query the wireless interface.',
      reason: 'error'
    }
  }

  const connection = parseConnection(output)
  if (!connection) {
    return { connection: null, error: 'No wireless interface on this system.', reason: 'no-adapter' }
  }
  return { connection, error: null, reason: null }
}

export async function readNetworks() {
  const { ok, output, error } = await netsh(['wlan', 'show', 'networks', 'mode=bssid'])
  const parsed = parseNetworks(output)
  return {
    interfaceName: parsed.interfaceName,
    networks: parsed.networks,
    error: !ok && parsed.networks.length === 0 ? (error ?? 'Scan failed') : null
  }
}

export async function readProfiles() {
  const { ok, output, error } = await netsh(['wlan', 'show', 'profiles'])
  const parsed = parseProfiles(output)
  return {
    interfaceName: parsed.interfaceName,
    profiles: parsed.profiles,
    error: !ok && parsed.profiles.length === 0 ? (error ?? 'Unable to read profiles') : null
  }
}

export async function readStatus() {
  const [adapters, connection] = await Promise.all([readAdapters(), readConnection()])
  const wifiAdapter =
    adapters.adapters.find((adapter) => /wi-?fi|wireless/i.test(adapter.name)) ?? null

  return {
    adapter: wifiAdapter,
    adapters: adapters.adapters,
    connection: connection.connection,
    detailError: connection.error,
    detailReason: connection.reason,
    adapterError: adapters.error,
    checkedAt: new Date().toISOString()
  }
}
