import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDevices, hostRange, maskToPrefix, parseArp, parsePingResult } from './devices.mjs'

const ARP = `
Interface: 192.168.1.24 --- 0x8
  Internet Address      Physical Address      Type
  192.168.1.1           0c-61-f9-64-eb-42     dynamic
  192.168.1.24          0c-61-f9-64-eb-41     dynamic
  192.168.1.50          00-11-22-33-44-55     dynamic
  192.168.1.255         ff-ff-ff-ff-ff-ff     static
`

test('converts subnet masks to prefixes', () => {
  assert.equal(maskToPrefix('255.255.255.0'), 24)
  assert.equal(maskToPrefix('255.255.255.240'), 28)
  assert.equal(maskToPrefix('255.255.0.0'), 16)
  assert.equal(maskToPrefix('255.255.255.255'), 32)
  assert.equal(maskToPrefix('nonsense'), null)
})

test('lists hosts inside a /24, capped and excluding self', () => {
  const hosts = hostRange('192.168.1.24', '255.255.255.0')
  assert.equal(hosts.length, 253)
  assert.ok(hosts.includes('192.168.1.1'))
  assert.ok(!hosts.includes('192.168.1.24'))
  assert.ok(!hosts.includes('192.168.1.255'))
  assert.equal(hosts[0], '192.168.1.1')
})

test('honours smaller subnets', () => {
  const hosts = hostRange('192.168.1.18', '255.255.255.240')
  assert.deepEqual(hosts, [
    '192.168.1.17',
    '192.168.1.19',
    '192.168.1.20',
    '192.168.1.21',
    '192.168.1.22',
    '192.168.1.23',
    '192.168.1.24',
    '192.168.1.25',
    '192.168.1.26',
    '192.168.1.27',
    '192.168.1.28',
    '192.168.1.29',
    '192.168.1.30'
  ])
})

test('parses the ARP table', () => {
  const arp = parseArp(ARP)
  assert.equal(arp.size, 4)
  assert.deepEqual(arp.get('192.168.1.1'), { mac: '0C:61:F9:64:EB:42', type: 'dynamic' })
  assert.equal(arp.get('192.168.1.255')?.type, 'static')
})

test('detects reachable pings and resolved names', () => {
  const ok = parsePingResult(
    'Pinging DESKTOP-ABC [192.168.1.50] with 32 bytes of data:\nReply from 192.168.1.50: bytes=32 time<1ms TTL=128'
  )
  assert.equal(ok.reachable, true)
  assert.equal(ok.hostname, 'DESKTOP-ABC')

  const unreachable = parsePingResult(
    'Reply from 192.168.1.1: Destination host unreachable.\nRequest timed out.'
  )
  assert.equal(unreachable.reachable, false)

  const timeout = parsePingResult('Request timed out.\n100% loss')
  assert.equal(timeout.reachable, false)
})

test('merges ARP and ping results, self first and gateway next', () => {
  const arp = parseArp(ARP)
  const pings = new Map([
    ['192.168.1.1', { reachable: true, hostname: 'router.lan' }],
    ['192.168.1.50', { reachable: true, hostname: 'DESKTOP-ABC' }],
    ['192.168.1.77', { reachable: true, hostname: 'phone' }]
  ])

  const devices = buildDevices({ arp, pings, ip: '192.168.1.24', gateways: ['192.168.1.1'] })
  assert.equal(devices.length, 5)
  assert.equal(devices[0].ip, '192.168.1.24')
  assert.equal(devices[0].self, true)
  assert.equal(devices[0].online, false)
  assert.equal(devices[1].ip, '192.168.1.1')
  assert.equal(devices[1].gateway, true)

  const phone = devices.find((device) => device.ip === '192.168.1.77')
  assert.equal(phone?.online, true)
  assert.equal(phone?.name, 'phone')
  assert.equal(phone?.mac, null)
})
