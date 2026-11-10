import { exec, isElevationError } from './exec.mjs'

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normaliseLabel(label) {
  return clean(label.replace(/[.\s]+$/, '')).toLowerCase()
}

/**
 * Parses `ipconfig /all`. Continuation lines (DNS servers, gateways) belong to
 * the previous key, so they are appended rather than ignored.
 */
export function parseIpconfig(output) {
  const adapters = []
  let current = null
  let lastKey = null

  const push = () => {
    if (current) adapters.push(current)
    current = null
  }

  for (const rawLine of output.split(/\r?\n/)) {
    const header = rawLine.match(/^([A-Za-z][A-Za-z0-9 .()_\/-]*? adapter [^:]+):\s*$/)
    if (header) {
      push()
      const name = clean(header[1].split(/ adapter /i).slice(1).join(' adapter '))
      current = {
        name,
        description: null,
        mac: null,
        dhcpEnabled: null,
        dhcpServer: null,
        leaseObtained: null,
        leaseExpires: null,
        ipv4: [],
        subnetMasks: [],
        ipv6: [],
        gateways: [],
        dns: [],
        connectionSuffix: null,
        mediaState: null
      }
      lastKey = null
      continue
    }

    if (!current) continue

    // ipconfig pads labels with dot leaders ("IPv4 Address. . . . . : x").
    // Continuation values (extra DNS servers, IPv6 gateways) have no leader.
    const pair =
      rawLine.match(/^\s{2,}([A-Za-z][A-Za-z0-9 ()./_\/-]*?)(?:\s*\.\s*){2,}:\s*(.*)$/) ??
      rawLine.match(/^\s{2,}([A-Za-z][A-Za-z0-9 ()./_\/-]*?)\s{3,}:\s*(.*)$/)
    if (pair) {
      const label = normaliseLabel(pair[1])
      const value = clean(pair[2])
      lastKey = { label, value }
      applyValue(current, label, value, true)
      continue
    }

    const continuation = rawLine.match(/^\s{6,}(\S.*)$/)
    if (continuation && lastKey) {
      applyValue(current, lastKey.label, clean(continuation[1]), false)
    }
  }
  push()

  return adapters
}

function applyValue(adapter, label, value, first) {
  if (!value) return

  switch (label) {
    case 'description':
      adapter.description = value
      break
    case 'physical address':
      adapter.mac = value
      break
    case 'dhcp enabled':
      adapter.dhcpEnabled = /^yes$/i.test(value)
      break
    case 'dhcp server':
      adapter.dhcpServer = value
      break
    case 'lease obtained':
      adapter.leaseObtained = value
      break
    case 'lease expires':
      adapter.leaseExpires = value
      break
    case 'connection-specific dns suffix':
      adapter.connectionSuffix = value
      break
    case 'media state':
      adapter.mediaState = value
      break
    case 'ipv4 address':
      if (first) adapter.ipv4.push(value.replace(/\(.*\)$/, ''))
      break
    case 'subnet mask':
      if (first) adapter.subnetMasks.push(value)
      break
    case 'ipv6 address':
      if (first) adapter.ipv6.push(value.replace(/\(.*\)$/, ''))
      break
    case 'default gateway':
      adapter.gateways.push(value)
      break
    case 'dns servers':
      adapter.dns.push(value)
      break
    default:
      break
  }
}

export async function readNetworkConfig() {
  const result = await exec('ipconfig', ['/all'], { timeout: 20000 })
  const adapters = parseIpconfig(result.output).filter(
    (adapter) => adapter.description !== null || adapter.ipv4.length > 0 || adapter.mac !== null
  )

  const hostnameResult = await exec('hostname', [], { timeout: 5000 })

  return {
    adapters,
    hostname: clean(hostnameResult.output) || null,
    error: adapters.length === 0 ? (result.error ?? 'No adapters reported by ipconfig') : null,
    elevationHint: isElevationError(result.error) ? result.error : null,
    checkedAt: new Date().toISOString()
  }
}
