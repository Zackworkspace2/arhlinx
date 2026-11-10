import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseAdapters, parseConnection, parseNetworks, parseProfiles } from './netsh.mjs'

const ADAPTERS = `
Admin State    State          Type             Interface Name
-------------------------------------------------------------------------
Enabled        Disconnected   Dedicated        Local Area Connection
Enabled        Connected      Dedicated        Wi-Fi
Enabled        Disconnected   Dedicated        Ethernet
`

const NETWORKS = `
Interface name : Wi-Fi
There are 2 networks currently visible.

SSID 1 : WAY2FLYX
    Network type            : Infrastructure
    Authentication          : WPA2-Personal
    Encryption              : CCMP
    BSSID 1                 : 0c:61:f9:64:eb:42
         Signal             : 94%
         Radio type         : 802.11ax
         Band               : 5 GHz
         Channel            : 149
         Basic rates (Mbps) : 6 9 12 18 24
         Other rates (Mbps) : 36 48 54

SSID 2 : Cafe Guest
    Network type            : Infrastructure
    Authentication          : Open
    Encryption              : None
    BSSID 1                 : 00:11:22:33:44:55
         Signal             : 31%
         Radio type         : 802.11n
         Band               : 2.4 GHz
         Channel            : 6
`

const PROFILES = `
Profiles on interface Wi-Fi:

Group policy profiles (read only)
---------------------------------
    <None>

User profiles
-------------
    All User Profile     : WAY2FLYX
    All User Profile     : Cafe Guest
`

const INTERFACES = `
There is 1 interface on the system:

    Name                   : Wi-Fi
    Description            : Intel(R) Dual Band Wireless-AC 8260
    GUID                   : 7e1f0000-0000-0000-0000-000000000000
    Physical address       : 0c:61:f9:64:eb:41
    Interface type         : Primary
    State                  : connected
    SSID                   : WAY2FLYX
    BSSID                  : 0c:61:f9:64:eb:42
    Network type           : Infrastructure
    Radio type             : 802.11ax
    Authentication         : WPA2-Personal
    Cipher                 : CCMP
    Connection mode        : Profile
    Channel                : 149
    Receive rate (Mbps)    : 866.7
    Transmit rate (Mbps)   : 780
    Signal                 : 94%
    Profile                : WAY2FLYX
`

test('parses adapters and finds the Wi-Fi state', () => {
  const adapters = parseAdapters(ADAPTERS)
  assert.equal(adapters.length, 3)
  const wifi = adapters.find((adapter) => adapter.name === 'Wi-Fi')
  assert.ok(wifi)
  assert.equal(wifi.state, 'Connected')
  assert.equal(wifi.adminState, 'Enabled')
})

test('parses visible networks, strongest BSSID and security', () => {
  const { interfaceName, networks } = parseNetworks(NETWORKS)
  assert.equal(interfaceName, 'Wi-Fi')
  assert.equal(networks.length, 2)

  const [wifi, guest] = networks
  assert.equal(wifi.ssid, 'WAY2FLYX')
  assert.equal(wifi.authentication, 'WPA2-Personal')
  assert.equal(wifi.encryption, 'CCMP')
  assert.equal(wifi.bestSignal, 94)
  assert.equal(wifi.open, false)
  assert.equal(wifi.hidden, false)
  assert.deepEqual(wifi.bssids[0], {
    bssid: '0c:61:f9:64:eb:42',
    signal: 94,
    radioType: '802.11ax',
    band: '5 GHz',
    channel: 149
  })

  assert.equal(guest.open, true)
  assert.equal(guest.bestSignal, 31)
  assert.equal(guest.bssids[0].band, '2.4 GHz')
  assert.equal(guest.bssids[0].channel, 6)
})

test('parses saved profiles and their scope', () => {
  const { interfaceName, profiles } = parseProfiles(PROFILES)
  assert.equal(interfaceName, 'Wi-Fi')
  assert.deepEqual(profiles, [
    { name: 'WAY2FLYX', groupPolicy: false },
    { name: 'Cafe Guest', groupPolicy: false }
  ])
})

test('parses the active connection', () => {
  const connection = parseConnection(INTERFACES)
  assert.ok(connection)
  assert.equal(connection.ssid, 'WAY2FLYX')
  assert.equal(connection.state, 'connected')
  assert.equal(connection.signal, 94)
  assert.equal(connection.channel, 149)
  assert.equal(connection.receiveRate, 866.7)
  assert.equal(connection.transmitRate, 780)
  assert.equal(connection.profile, 'WAY2FLYX')
  assert.equal(connection.authentication, 'WPA2-Personal')
})

test('returns null when the interface output has no fields', () => {
  assert.equal(parseConnection('Function WlanQueryInterface returns error 5:\n'), null)
})

test('keeps hidden networks distinct', () => {
  const hidden = `
Interface name : Wi-Fi
There are 1 networks currently visible.

SSID 1 :
    Network type            : Infrastructure
    Authentication          : WPA2-Personal
    Encryption              : CCMP
    BSSID 1                 : aa:bb:cc:dd:ee:ff
         Signal             : 55%
         Band               : 5 GHz
         Channel            : 36
`
  const { networks } = parseNetworks(hidden)
  assert.equal(networks.length, 1)
  assert.equal(networks[0].hidden, true)
  assert.equal(networks[0].bestSignal, 55)
})
