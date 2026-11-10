import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createRateLimiter,
  isAllowedHost,
  isAllowedOrigin,
  isCrossSiteRequest,
  isPrivateHostname,
  rateLimitFor,
  sanitizeMessage
} from './security.mjs'

test('accepts loopback host headers with and without ports', () => {
  assert.equal(isAllowedHost('localhost:5173'), true)
  assert.equal(isAllowedHost('127.0.0.1:8787'), true)
  assert.equal(isAllowedHost('[::1]:8787'), true)
  assert.equal(isAllowedHost('LOCALHOST'), true)
})

test('rejects rebinding hosts', () => {
  assert.equal(isAllowedHost('evil.example.com'), false)
  assert.equal(isAllowedHost('192.168.1.5:8787'), false)
  assert.equal(isAllowedHost('localhost.evil.com'), false)
  assert.equal(isAllowedHost(''), false)
  assert.equal(isAllowedHost(undefined), false)
})

test('accepts local origins and rejects remote ones', () => {
  assert.equal(isAllowedOrigin(undefined), true)
  assert.equal(isAllowedOrigin('http://localhost:5173'), true)
  assert.equal(isAllowedOrigin('http://127.0.0.1:8787'), true)
  assert.equal(isAllowedOrigin('http://[::1]:8787'), true)
  assert.equal(isAllowedOrigin('http://evil.example.com'), false)
  assert.equal(isAllowedOrigin('null'), false)
})

test('flags cross-site fetches', () => {
  assert.equal(isCrossSiteRequest('cross-site'), true)
  assert.equal(isCrossSiteRequest('same-origin'), false)
  assert.equal(isCrossSiteRequest(undefined), false)
})

test('LAN mode accepts private hosts and still blocks public ones', () => {
  assert.equal(isPrivateHostname('192.168.1.24'), true)
  assert.equal(isPrivateHostname('10.0.0.5'), true)
  assert.equal(isPrivateHostname('172.20.1.1'), true)
  assert.equal(isPrivateHostname('8.8.8.8'), false)
  assert.equal(isPrivateHostname('evil.example.com'), false)

  assert.equal(isAllowedHost('192.168.1.24:8787', true), true)
  assert.equal(isAllowedHost('10.0.0.5:8787', true), true)
  assert.equal(isAllowedHost('192.168.1.24:8787', false), false)
  assert.equal(isAllowedHost('8.8.8.8:8787', true), false)
  assert.equal(isAllowedHost('evil.example.com', true), false)
})

test('LAN mode accepts private origins only when enabled', () => {
  assert.equal(isAllowedOrigin('http://192.168.1.24:8787', true), true)
  assert.equal(isAllowedOrigin('http://192.168.1.24:8787', false), false)
  assert.equal(isAllowedOrigin('http://evil.example.com', true), false)
})

test('strips absolute paths from error text', () => {
  const message = sanitizeMessage("ENOENT: no such file, open 'C:\\Users\\hp\\secret\\file.db'")
  assert.equal(message.includes('C:\\'), false)
  assert.ok(message.includes('<path>'))
  assert.equal(sanitizeMessage(undefined), 'Request failed')
  assert.ok(sanitizeMessage('x'.repeat(500)).length <= 201)
})

test('rate limiter enforces the minimum interval', async () => {
  const allow = createRateLimiter()
  assert.equal(allow('a', 100), true)
  assert.equal(allow('a', 100), false)
  await new Promise((resolve) => setTimeout(resolve, 120))
  assert.equal(allow('a', 100), true)
  assert.equal(allow('b', 100), true)
})

test('maps paths to limits', () => {
  assert.ok(rateLimitFor('/api/speed/stream') > rateLimitFor('/api/wifi/status'))
  assert.equal(rateLimitFor('/api/unknown'), 0)
})
