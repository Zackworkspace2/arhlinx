import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseIpconfig } from './network.mjs'

const IPCONFIG = `
Windows IP Configuration

   Host Name . . . . . . . . . . . . : DESKTOP-ABC
   Primary Dns Suffix  . . . . . . . :

Ethernet adapter Ethernet:

   Media State . . . . . . . . . . . : Media disconnected
   Description . . . . . . . . . . . : Realtek PCIe GbE Family Controller

Wireless LAN adapter Wi-Fi:

   Connection-specific DNS Suffix  . : lan
   Description . . . . . . . . . . . : Intel(R) Dual Band Wireless-AC 8260
   Physical Address. . . . . . . . . : 0C-61-F9-64-EB-41
   DHCP Enabled. . . . . . . . . . . : Yes
   IPv6 Address. . . . . . . . . . . : 2a02:8109:1234::24(Preferred)
   IPv4 Address. . . . . . . . . . . : 192.168.1.24(Preferred)
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Lease Obtained. . . . . . . . . . : 10 November 2026 07:12:33
   Lease Expires . . . . . . . . . . : 11 November 2026 07:12:32
   Default Gateway . . . . . . . . . : 192.168.1.1
                                        fe80::1
   DHCP Server . . . . . . . . . . . : 192.168.1.1
   DNS Servers . . . . . . . . . . . : 192.168.1.1
                                       8.8.8.8
   NetBIOS over Tcpip. . . . . . . . : Enabled
`

test('parses every adapter block', () => {
  const adapters = parseIpconfig(IPCONFIG)
  assert.equal(adapters.length, 2)
  assert.equal(adapters[0].name, 'Ethernet')
  assert.equal(adapters[0].mediaState, 'Media disconnected')
  assert.equal(adapters[1].name, 'Wi-Fi')
})

test('parses addresses, gateway continuation and DNS list', () => {
  const [, wifi] = parseIpconfig(IPCONFIG)
  assert.equal(wifi.description, 'Intel(R) Dual Band Wireless-AC 8260')
  assert.equal(wifi.mac, '0C-61-F9-64-EB-41')
  assert.equal(wifi.dhcpEnabled, true)
  assert.deepEqual(wifi.ipv4, ['192.168.1.24'])
  assert.deepEqual(wifi.subnetMasks, ['255.255.255.0'])
  assert.deepEqual(wifi.gateways, ['192.168.1.1', 'fe80::1'])
  assert.deepEqual(wifi.dns, ['192.168.1.1', '8.8.8.8'])
  assert.deepEqual(wifi.ipv6, ['2a02:8109:1234::24'])
  assert.equal(wifi.dhcpServer, '192.168.1.1')
  assert.equal(wifi.leaseObtained, '10 November 2026 07:12:33')
  assert.equal(wifi.leaseExpires, '11 November 2026 07:12:32')
})

test('returns nothing for unrelated output', () => {
  assert.deepEqual(parseIpconfig('Windows IP Configuration\n'), [])
})
