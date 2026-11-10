import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseConnections, summariseConnections } from './monitor.mjs'

const NETSTAT = `
Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1004
  TCP    192.168.1.24:50432     142.250.185.78:443     ESTABLISHED     8124
  TCP    192.168.1.24:50433     142.250.185.78:443     TIME_WAIT       0
  TCP    [::]:445               [::]:0                 LISTENING       4
  UDP    0.0.0.0:5353           *:*                                    2312
  UDP    [::1]:1900             *:*                                    6004
`

test('parses TCP and UDP rows including stateless UDP', () => {
  const connections = parseConnections(NETSTAT)
  assert.equal(connections.length, 6)

  assert.deepEqual(connections[0], {
    protocol: 'TCP',
    local: '0.0.0.0:135',
    remote: '0.0.0.0:0',
    state: 'LISTENING',
    pid: 1004
  })

  const udp = connections.find((connection) => connection.protocol === 'UDP')
  assert.ok(udp)
  assert.equal(udp.state, null)
  assert.equal(udp.pid, 2312)
})

test('summarises by state and protocol', () => {
  const { byState, byProtocol } = summariseConnections(parseConnections(NETSTAT))
  assert.equal(byState.LISTENING, 2)
  assert.equal(byState.ESTABLISHED, 1)
  assert.equal(byState.TIME_WAIT, 1)
  assert.equal(byState.STATELESS, 2)
  assert.equal(byProtocol.TCP, 4)
  assert.equal(byProtocol.UDP, 2)
})

test('ignores header and malformed lines', () => {
  assert.deepEqual(parseConnections('Active Connections\n\n  Proto  Local\n  TCP  short'), [])
})
