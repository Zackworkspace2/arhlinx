import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseFirewallProfiles, parseFirewallRules } from './firewall.mjs'

const PROFILES = `Domain Profile Settings:
----------------------------------------------------------------------
State                                 ON
Firewall Policy                       BlockInbound,AllowOutbound
LocalFirewallRules                    N/A (GPO-store only)
InboundUserNotification               Enable
OutboundConnections                   Allow
LogConnections                        NotConfigured

Private Profile Settings:
----------------------------------------------------------------------
State                                 ON
Firewall Policy                       BlockInbound,AllowOutbound

Public Profile Settings:
----------------------------------------------------------------------
State                                 OFF
Firewall Policy                       BlockInbound
`

const RULES = `Rule Name:                            Core Networking - DNS (UDP-Out)
----------------------------------------------------------------------
Enabled:                              Yes
Direction:                            Out
Profiles:                             Domain,Private,Public
Grouping:                             Core Networking
LocalIP:                              Any
RemoteIP:                             Any
Protocol:                             UDP
LocalPort:                            53
RemotePort:                           Any
Action:                               Allow

Rule Name:                            Block SMB
----------------------------------------------------------------------
Enabled:                              No
Direction:                            In
Profiles:                             Public
Protocol:                             TCP
LocalPort:                            445
Action:                               Block
`

test('parses firewall profile states', () => {
  const profiles = parseFirewallProfiles(PROFILES)
  assert.equal(profiles.length, 3)
  assert.equal(profiles[0].profile, 'Domain')
  assert.equal(profiles[0].state, 'ON')
  assert.equal(profiles[1].profile, 'Private')
  assert.equal(profiles[2].profile, 'Public')
  assert.equal(profiles[2].state, 'OFF')
})

test('parses firewall rules with direction, protocol and action', () => {
  const rules = parseFirewallRules(RULES)
  assert.equal(rules.length, 2)
  assert.equal(rules[0].name, 'Core Networking - DNS (UDP-Out)')
  assert.equal(rules[0].enabled, 'Yes')
  assert.equal(rules[0].direction, 'Out')
  assert.equal(rules[0].protocol, 'UDP')
  assert.equal(rules[0].localPort, '53')
  assert.equal(rules[0].action, 'Allow')

  assert.equal(rules[1].name, 'Block SMB')
  assert.equal(rules[1].enabled, 'No')
  assert.equal(rules[1].action, 'Block')
})

test('handles empty firewall output', () => {
  assert.deepEqual(parseFirewallProfiles(''), [])
  assert.deepEqual(parseFirewallRules(''), [])
})
