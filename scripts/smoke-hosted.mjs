// Renders the hosted (Vercel) bundle in happy-dom with a mocked /api/whoami.
// Usage: npm run verify:hosted
import { readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { Window } from 'happy-dom'

const BUNDLE_DIR = 'dist-hosted'

const window = new Window({ url: 'https://example.vercel.app/' })
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

globalThis.fetch = async (input) => {
  const raw = typeof input === 'string' ? input : input.url
  const path = raw.replace(/^https?:\/\/[^/]+/, '').split('?')[0]
  if (path === '/api/whoami') {
    return new Response(
      JSON.stringify({
        ip: '203.0.113.42',
        city: 'Lagos',
        region: 'Lagos',
        country: 'NG',
        latitude: 6.45,
        longitude: 3.39,
        timezone: 'Africa/Lagos',
        isp: 'AS29465 MTN Nigeria',
        asn: 'AS29465',
        userAgent: 'test',
        source: 'vercel'
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )
  }
  return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
}

document.body.innerHTML = '<div id="root"></div>'

const bundle = readdirSync(`${BUNDLE_DIR}/assets`).find((file) => file.endsWith('.js'))
if (!bundle) throw new Error('no bundle in dist-hosted; run npm run verify:hosted')

const errors = []
window.addEventListener('error', (event) => errors.push(String(event.message)))
window.console.error = (...args) => errors.push(args.map(String).join(' '))

await import(pathToFileURL(`${BUNDLE_DIR}/assets/${bundle}`).href)
await new Promise((resolve) => setTimeout(resolve, 200))

const text = document.body.textContent ?? ''
const checks = [
  ['Device & connection', 'dashboard heading'],
  ['Overview', 'overview tab'],
  ['Speed', 'speed tab'],
  ['Diagnostics', 'diagnostics tab'],
  ['Copy report', 'report action'],
  ['203.0.113.42', 'IP from whoami'],
  ['Lagos', 'location from whoami'],
  ['Network path', 'network path section'],
  ['MTN Nigeria', 'operator from lookup'],
  ['connection quality', 'quality score']
]

let failures = 0
for (const [needle, label] of checks) {
  const ok = text.includes(needle)
  if (!ok) failures += 1
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`)
}

if (text.includes('Firewall')) {
  failures += 1
  console.log('FAIL local-only modules leaked into hosted build')
}

const tabButton = (label) =>
  [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === label)

tabButton('Speed')?.click()
await new Promise((resolve) => setTimeout(resolve, 150))
const speedText = document.body.textContent ?? ''
for (const [needle, label] of [
  ['Download', 'speed tab download metric'],
  ['Go', 'speed tab start button'],
  ['Recent runs', 'speed history section']
]) {
  const ok = speedText.includes(needle)
  if (!ok) failures += 1
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`)
}
const gaugePresent = document.querySelectorAll('svg path').length >= 2
if (!gaugePresent) failures += 1
console.log(`${gaugePresent ? 'ok  ' : 'FAIL'} gauge svg rendered`)

tabButton('Diagnostics')?.click()
await new Promise((resolve) => setTimeout(resolve, 150))
const diagnosticsText = document.body.textContent ?? ''
for (const [needle, label] of [
  ['Latency & jitter', 'diagnostics latency card'],
  ['Reachability', 'diagnostics reachability card'],
  ['Capabilities', 'diagnostics capabilities card']
]) {
  const ok = diagnosticsText.includes(needle)
  if (!ok) failures += 1
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`)
}

if (errors.length > 0) {
  failures += 1
  console.log(`console errors: ${errors.length}`)
  for (const message of errors.slice(0, 3)) console.log(`  ${message}`)
}

console.log(failures === 0 ? 'hosted smoke: PASS' : `hosted smoke: FAIL (${failures})`)
process.exit(failures === 0 ? 0 : 1)
