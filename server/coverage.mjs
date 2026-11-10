import { readNetworks } from './netsh.mjs'

const BUCKETS = [
  { label: 'Excellent 80%+', min: 80 },
  { label: 'Good 60-79%', min: 60 },
  { label: 'Fair 40-59%', min: 40 },
  { label: 'Weak <40%', min: 0 }
]

function bandOf(band) {
  if (!band) return 'Unknown'
  if (/2\.4/i.test(band)) return '2.4 GHz'
  if (/6/i.test(band)) return '6 GHz'
  if (/5/i.test(band)) return '5 GHz'
  return band
}

/**
 * Pure computation over scanned networks: band split, channel congestion,
 * signal distribution and placement advice.
 */
export function computeCoverage(networks) {
  const bands = {}
  const channels = new Map()
  const buckets = BUCKETS.map((bucket) => ({ label: bucket.label, count: 0 }))
  let apCount = 0
  let signalSum = 0
  let signalCount = 0
  let strongest = null
  let weakest = null
  let openCount = 0

  for (const network of networks) {
    apCount += network.bssids.length
    if (network.open) openCount += 1
    if (network.bestSignal > 0) {
      signalSum += network.bestSignal
      signalCount += 1
      if (!strongest || network.bestSignal > strongest.signal) {
        strongest = { ssid: network.ssid || '(hidden)', signal: network.bestSignal }
      }
      if (!weakest || network.bestSignal < weakest.signal) {
        weakest = { ssid: network.ssid || '(hidden)', signal: network.bestSignal }
      }
      const bucket =
        buckets.find((candidate, index) => network.bestSignal >= BUCKETS[index].min) ?? buckets[3]
      bucket.count += 1
    }

    for (const bssid of network.bssids) {
      const band = bandOf(bssid.band)
      bands[band] = (bands[band] ?? 0) + 1
      if (bssid.channel === null) continue
      const key = `${band}|${bssid.channel}`
      const entry = channels.get(key) ?? { band, channel: bssid.channel, aps: 0, maxSignal: 0 }
      entry.aps += 1
      entry.maxSignal = Math.max(entry.maxSignal, bssid.signal ?? 0)
      channels.set(key, entry)
    }
  }

  const channelList = [...channels.values()].sort((a, b) => b.aps - a.aps || a.channel - b.channel)
  const busiest24 = channelList.find((entry) => entry.band === '2.4 GHz') ?? null

  const recommendations = []
  if (bands['5 GHz'] && bands['2.4 GHz']) {
    recommendations.push(
      `Use 5 GHz when possible: ${bands['5 GHz']} access points there versus ${bands['2.4 GHz']} on 2.4 GHz.`
    )
  }
  if (busiest24 && busiest24.aps >= 3) {
    recommendations.push(
      `2.4 GHz channel ${busiest24.channel} carries ${busiest24.aps} access points. Prefer channels 1, 6 or 11.`
    )
  }
  const weak = networks.filter((network) => network.bestSignal > 0 && network.bestSignal < 50).length
  if (weak > 0) {
    recommendations.push(
      `${weak} nearby network${weak === 1 ? '' : 's'} below 50% signal. Move closer or add an access point.`
    )
  }
  if (openCount > 0) {
    recommendations.push(
      `${openCount} open network${openCount === 1 ? '' : 's'} in range. Avoid them for sensitive traffic.`
    )
  }
  if (recommendations.length === 0 && networks.length > 0) {
    recommendations.push('Signal distribution looks healthy. Keep the router central and elevated.')
  }

  return {
    networkCount: networks.length,
    apCount,
    bands,
    channels: channelList,
    signalBuckets: buckets,
    avgSignal: signalCount ? Number((signalSum / signalCount).toFixed(1)) : null,
    strongest,
    weakest,
    openCount,
    recommendations
  }
}

export async function readCoverage() {
  const scan = await readNetworks()
  return {
    ...computeCoverage(scan.networks),
    interfaceName: scan.interfaceName,
    scanError: scan.error,
    scannedAt: new Date().toISOString()
  }
}
