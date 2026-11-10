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

let failures = 0

function check(condition, label) {
  if (!condition) failures += 1
  console.log(`${condition ? 'ok  ' : 'FAIL'} ${label}`)
}

const text = () => document.body.textContent ?? ''

check(text().includes('How fast is your connection?'), 'speed hero heading')
check(text().includes('Speed test'), 'speed tab label')
check(text().includes('Go'), 'go button')
check(text().includes('Download'), 'download metric')
check(text().includes('Recent runs'), 'history section')
check(document.querySelectorAll('svg path').length >= 2, 'gauge svg rendered')

const tab = (label) =>
  [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === label)

tab('Overview')?.click()
await new Promise((resolve) => setTimeout(resolve, 150))
check(text().includes('Network path'), 'network path section')
check(text().includes('MTN Nigeria'), 'operator from lookup')
check(text().includes('203.0.113.42'), 'public IP')
check(text().includes('Lagos'), 'location')
check(text().includes('Estimated signal'), 'signal estimate')

tab('Diagnostics')?.click()
await new Promise((resolve) => setTimeout(resolve, 150))
check(text().includes('Latency & jitter'), 'latency card')
check(text().includes('Reachability'), 'reachability card')
check(text().includes('Capabilities'), 'capabilities card')

if (text().includes('Firewall')) {
  failures += 1
  console.log('FAIL local-only modules leaked into hosted build')
}

if (errors.length > 0) {
  failures += 1
  console.log(`console errors: ${errors.length}`)
  for (const message of errors.slice(0, 3)) console.log(`  ${message}`)
}

console.log(failures === 0 ? 'hosted smoke: PASS' : `hosted smoke: FAIL (${failures})`)
process.exit(failures === 0 ? 0 : 1)
