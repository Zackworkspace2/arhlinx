// Renders the built app in happy-dom and visits every route.
// Catches runtime crashes that typecheck/build cannot see.
// Usage: npm run build && npm run smoke
import { readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { Window } from 'happy-dom'

const window = new Window({ url: 'http://localhost:5173/' })

function define(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
}

define('window', window)
for (const key of [
  'document',
  'navigator',
  'location',
  'localStorage',
  'sessionStorage',
  'HTMLElement',
  'Node',
  'Event',
  'CustomEvent',
  'MessageChannel',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame'
]) {
  const value = typeof window[key] === 'function' ? window[key].bind(window) : window[key]
  define(key, value)
}
define('matchMedia', (query) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {}
}))

const now = new Date().toISOString()
const day = now.slice(0, 10)

const fixtures = {
  '/api/health': { ok: true, platform: 'win32', version: '22.14.0', time: now },
  '/api/overview': {
    wifi: { adapterState: 'Connected', ssid: 'WAY2FLYX', signal: 94, detailError: null },
    usage: { today: { rx: 1_200_000, tx: 400_000 }, month: { rx: 8_000_000, tx: 2_000_000 }, rateRx: 12_000, rateTx: 4_000 },
    lastSpeed: {
      id: 1,
      at: now,
      downloadMbps: 15.85,
      uploadMbps: 12.52,
      pingMs: 146.76,
      jitterMs: 7.84,
      target: 'speed.cloudflare.com'
    },
    firewall: { on: 3, off: 0, total: 3 },
    hostname: 'DESKTOP-ABC',
    generatedAt: now
  },
  '/api/wifi/status': {
    adapter: { name: 'Wi-Fi', adminState: 'Enabled', state: 'Connected', type: 'Dedicated' },
    adapters: [],
    connection: {
      name: 'Wi-Fi',
      description: 'Intel(R) Dual Band Wireless-AC 8260',
      state: 'connected',
      ssid: 'WAY2FLYX',
      bssid: '0c:61:f9:64:eb:42',
      networkType: 'Infrastructure',
      radioType: '802.11ax',
      authentication: 'WPA2-Personal',
      cipher: 'CCMP',
      channel: 149,
      receiveRate: 866.7,
      transmitRate: 780,
      signal: 94,
      profile: 'WAY2FLYX'
    },
    detailError: null,
    detailReason: null,
    adapterError: null,
    checkedAt: now
  },
  '/api/wifi/networks': {
    interfaceName: 'Wi-Fi',
    networks: [
      {
        ssid: 'WAY2FLYX',
        hidden: false,
        networkType: 'Infrastructure',
        authentication: 'WPA2-Personal',
        encryption: 'CCMP',
        bssids: [{ bssid: '0c:61:f9:64:eb:42', signal: 94, radioType: '802.11ax', band: '5 GHz', channel: 149 }],
        bestSignal: 94,
        open: false
      }
    ],
    error: null
  },
  '/api/wifi/profiles': {
    interfaceName: 'Wi-Fi',
    profiles: [{ name: 'WAY2FLYX', groupPolicy: false }],
    error: null
  },
  '/api/speed/history': {
    results: [
      {
        id: 1,
        at: now,
        downloadMbps: 15.85,
        uploadMbps: 12.52,
        pingMs: 146.76,
        jitterMs: 7.84,
        target: 'speed.cloudflare.com'
      }
    ]
  },
  '/api/usage/summary': {
    sampledAt: now,
    startedAt: now,
    running: true,
    source: 'netstat -e',
    error: null,
    rateRx: 12000,
    rateTx: 4000,
    today: { rx: 1_200_000, tx: 400_000 },
    month: { rx: 8_000_000, tx: 2_000_000 },
    days: [{ date: day, rx: 1_200_000, tx: 400_000 }],
    limitGb: 5,
    alertPercent: 80
  },
  '/api/firewall': {
    profiles: [
      { profile: 'Domain', state: 'ON', policy: 'BlockInbound,AllowOutbound', localRules: null, inbound: null, outbound: null, logging: null, allowLocalFirewallRules: null },
      { profile: 'Private', state: 'ON', policy: 'BlockInbound,AllowOutbound', localRules: null, inbound: null, outbound: null, logging: null, allowLocalFirewallRules: null },
      { profile: 'Public', state: 'ON', policy: 'BlockInbound,AllowOutbound', localRules: null, inbound: null, outbound: null, logging: null, allowLocalFirewallRules: null }
    ],
    rules: [
      { name: 'Core Networking - DNS (UDP-Out)', enabled: 'Yes', direction: 'Out', profiles: 'Domain,Private,Public', protocol: 'UDP', localPort: '53', remotePort: 'Any', action: 'Allow', grouping: 'Core Networking' }
    ],
    ruleCount: 1,
    enabledRuleCount: 1,
    error: null,
    rulesError: null,
    elevationRequired: false,
    checkedAt: now
  },
  '/api/network': {
    adapters: [
      {
        name: 'Wi-Fi',
        description: 'Intel(R) Dual Band Wireless-AC 8260',
        mac: '0C-61-F9-64-EB-41',
        dhcpEnabled: true,
        dhcpServer: '192.168.1.1',
        leaseObtained: '10 November 2026 07:12:33',
        leaseExpires: '11 November 2026 07:12:32',
        ipv4: ['192.168.1.24'],
        subnetMasks: ['255.255.255.0'],
        ipv6: ['2a02:8109:1234::24'],
        gateways: ['192.168.1.1'],
        dns: ['192.168.1.1', '8.8.8.8'],
        connectionSuffix: 'lan',
        mediaState: null
      }
    ],
    hostname: 'DESKTOP-ABC',
    error: null,
    elevationHint: null,
    checkedAt: now
  },
  '/api/coverage': {
    networkCount: 4,
    apCount: 5,
    bands: { '5 GHz': 3, '2.4 GHz': 2 },
    channels: [
      { band: '5 GHz', channel: 149, aps: 2, maxSignal: 94 },
      { band: '2.4 GHz', channel: 6, aps: 2, maxSignal: 45 }
    ],
    signalBuckets: [
      { label: 'Excellent 80%+', count: 1 },
      { label: 'Good 60-79%', count: 1 },
      { label: 'Fair 40-59%', count: 1 },
      { label: 'Weak <40%', count: 1 }
    ],
    avgSignal: 60,
    strongest: { ssid: 'WAY2FLYX', signal: 94 },
    weakest: { ssid: 'Cafe Guest', signal: 31 },
    openCount: 1,
    recommendations: ['Use 5 GHz when possible: 3 access points there versus 2 on 2.4 GHz.'],
    interfaceName: 'Wi-Fi',
    scanError: null,
    scannedAt: now
  },
  '/api/monitor/connections': {
    connections: [
      { protocol: 'TCP', local: '192.168.1.24:50432', remote: '142.250.185.78:443', state: 'ESTABLISHED', pid: 8124 }
    ],
    summary: { byState: { ESTABLISHED: 1, LISTENING: 4 }, byProtocol: { TCP: 5 } },
    total: 5,
    error: null,
    checkedAt: now
  },
  '/api/monitor/traffic': {
    rateRx: 12000,
    rateTx: 4000,
    today: { rx: 1_200_000, tx: 400_000 },
    month: { rx: 8_000_000, tx: 2_000_000 },
    sampledAt: now,
    error: null
  },
  '/api/monitor/ping': {
    host: '1.1.1.1',
    port: 443,
    attempts: 6,
    received: 6,
    lossPercent: 0,
    minMs: 12,
    avgMs: 15,
    maxMs: 20,
    samples: [12, 14, 15, 16, 18, 20]
  },
  '/api/devices': {
    adapter: { name: 'Wi-Fi', ip: '192.168.1.24', mask: '255.255.255.0', description: 'Intel Wireless-AC 8260' },
    subnet: '192.168.1.24/24',
    hostsInSubnet: 254,
    devices: [
      { ip: '192.168.1.24', mac: '0C:61:F9:64:EB:41', name: 'DESKTOP-ABC', online: true, type: 'dynamic', self: true, gateway: false },
      { ip: '192.168.1.1', mac: '0C:61:F9:64:EB:42', name: 'router.lan', online: true, type: 'dynamic', self: false, gateway: true },
      { ip: '192.168.1.77', mac: null, name: 'phone', online: true, type: 'unknown', self: false, gateway: false }
    ],
    onlineCount: 3,
    durationMs: 2400,
    error: null,
    scannedAt: now
  }
}

const REAL = process.env.SMOKE_REAL === '1'

if (REAL) {
  const realFetch = globalThis.fetch
  const base = `http://127.0.0.1:${process.env.SMOKE_PORT ?? 8787}`
  globalThis.fetch = (input, init) => {
    const url = typeof input === 'string' && input.startsWith('/') ? `${base}${input}` : input
    return realFetch(url, init)
  }
} else {
  globalThis.fetch = async (input) => {
    const raw = typeof input === 'string' ? input : input.url
    const path = raw.replace(/^https?:\/\/[^/]+/, '').split('?')[0]
    const body = fixtures[path] ?? {}
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
  }
}

document.body.innerHTML = '<div id="root"></div>'

const bundle = readdirSync('dist/assets').find((file) => file.endsWith('.js'))
if (!bundle) throw new Error('dist/assets has no JS bundle; run npm run build first')

const errors = []
window.addEventListener('error', (event) => errors.push(String(event.message)))
window.console.error = (...args) => errors.push(args.map(String).join(' '))

await import(pathToFileURL(`dist/assets/${bundle}`).href)
await new Promise((resolve) => setTimeout(resolve, 150))

const routes = [
  ['', 'Dashboard'],
  ['#/wifi', 'Wi-Fi Settings'],
  ['#/speed-test', 'Internet Speed Test'],
  ['#/data-manager', 'Data Manager'],
  ['#/firewall', 'Firewall'],
  ['#/wifi-advanced', 'Advanced Wi-Fi'],
  ['#/internet', 'Internet Settings'],
  ['#/dhcp', 'DHCP Manager'],
  ['#/devices', 'Devices'],
  ['#/coverage', 'Placement'],
  ['#/monitor', 'Network Monitor'],
  ['#/settings', 'Application Settings']
]

let failures = 0
for (const [hash, expected] of routes) {
  window.location.hash = hash
  window.dispatchEvent(new window.Event('hashchange'))
  await new Promise((resolve) => setTimeout(resolve, 120))

  const text = document.body.textContent ?? ''
  const ok = text.includes(expected)
  if (!ok) failures += 1
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${hash || '#/'} -> ${expected}${ok ? '' : ` | got: ${text.slice(0, 120)}`}`)
}

const rootChildren = document.getElementById('root')?.children.length ?? 0
console.log(`root children: ${rootChildren}`)
if (rootChildren === 0) {
  failures += 1
  console.log('FAIL root is empty')
}

if (errors.length > 0) {
  console.log(`console errors: ${errors.length}`)
  for (const message of errors.slice(0, 5)) console.log(`  ${message}`)
}

console.log(failures === 0 ? 'smoke: PASS' : `smoke: FAIL (${failures})`)
process.exit(failures === 0 ? 0 : 1)
