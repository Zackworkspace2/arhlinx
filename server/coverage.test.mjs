import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeCoverage } from './coverage.mjs'

const NETWORKS = [
  {
    ssid: 'WAY2FLYX',
    hidden: false,
    open: false,
    bestSignal: 94,
    authentication: 'WPA2-Personal',
    bssids: [{ bssid: 'aa', signal: 94, band: '5 GHz', channel: 149, radioType: '802.11ax' }]
  },
  {
    ssid: 'Neighbour 5G',
    hidden: false,
    open: false,
    bestSignal: 70,
    authentication: 'WPA2-Personal',
    bssids: [
      { bssid: 'bb', signal: 70, band: '5 GHz', channel: 149, radioType: '802.11ac' },
      { bssid: 'cc', signal: 55, band: '5 GHz', channel: 36, radioType: '802.11ac' }
    ]
  },
  {
    ssid: 'Cafe Guest',
    hidden: false,
    open: true,
    bestSignal: 31,
    authentication: 'Open',
    bssids: [{ bssid: 'dd', signal: 31, band: '2.4 GHz', channel: 6, radioType: '802.11n' }]
  },
  {
    ssid: '',
    hidden: true,
    open: false,
    bestSignal: 45,
    authentication: 'WPA2-Personal',
    bssids: [{ bssid: 'ee', signal: 45, band: '2.4 GHz', channel: 6, radioType: '802.11n' }]
  }
]

test('counts networks, APs and band split', () => {
  const result = computeCoverage(NETWORKS)
  assert.equal(result.networkCount, 4)
  assert.equal(result.apCount, 5)
  assert.equal(result.bands['5 GHz'], 3)
  assert.equal(result.bands['2.4 GHz'], 2)
  assert.equal(result.openCount, 1)
})

test('aggregates channel congestion and keeps the strongest signal', () => {
  const result = computeCoverage(NETWORKS)
  const channel149 = result.channels.find((channel) => channel.channel === 149)
  assert.ok(channel149)
  assert.equal(channel149.aps, 2)
  assert.equal(channel149.maxSignal, 94)

  const channel6 = result.channels.find((channel) => channel.band === '2.4 GHz' && channel.channel === 6)
  assert.equal(channel6?.aps, 2)
})

test('buckets signals and reports strongest and weakest', () => {
  const result = computeCoverage(NETWORKS)
  assert.equal(result.avgSignal, 60)
  assert.equal(result.strongest?.signal, 94)
  assert.equal(result.weakest?.signal, 31)
  assert.equal(result.signalBuckets[0].count, 1)
  assert.equal(result.signalBuckets[3].count, 1)
})

test('produces placement advice', () => {
  const result = computeCoverage(NETWORKS)
  assert.ok(result.recommendations.length >= 2)
  assert.ok(result.recommendations.some((line) => line.includes('5 GHz')))
  assert.ok(result.recommendations.some((line) => line.toLowerCase().includes('open')))
})

test('handles an empty scan', () => {
  const result = computeCoverage([])
  assert.equal(result.networkCount, 0)
  assert.equal(result.avgSignal, null)
  assert.deepEqual(result.recommendations, [])
})
