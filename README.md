# ArhLinx

Complete Network Control — Windows network manager, built as a web app.

## Phase status

- **Phase 1 — Foundation:** complete (Vite + React + TS, Tailwind v4, typecheck, tests)
- **Phase 2 — UI Foundation:** complete (tokens, shell, sidebar, navigation, dashboard)
- **Phase 3 — Wi-Fi Management:** complete (adapter state, live scan, signal/band/channel, saved profiles)
- **Phase 4 — Speed Test:** complete (download, upload, ping, jitter, history)
- **Phase 5 — Data Manager:** complete (live counters, daily/monthly totals, 14-day chart, monthly limit + alerts)
- **Phase 6 — Firewall:** complete (profile states, rule inventory, filter; read-only)
- **Phase 7 — Advanced Network Settings:** complete (adapters, IPv4/IPv6, DNS, gateway, radio/channel)
- **Phase 8 — DHCP Manager:** complete (client DHCP state, server, lease times; router leases not available)
- **Phase 9 — Placement & Coverage:** complete (signal buckets, channel congestion, band split, advice)
- **Phase 10 — Network Monitor:** complete (live rates, connection table, TCP latency + loss)
- **Phase 11 — Integration & Testing:** complete (live dashboard, settings, data clearing, validation, tests)
- **Phase 12 — LAN Devices:** complete (ARP + ping sweep, names, online status)

## Commands

```bash
npm install
npm run dev        # http://localhost:5173  (UI + Wi-Fi API in one process)
npm run build      # production build into dist/
npm start          # build output + API on http://127.0.0.1:8787
npm run preview    # static preview of dist/ only (no API)
npm run typecheck  # tsc
npm test           # netsh/ipconfig/netstat parser tests + DB tests (node, no deps)
npm run smoke      # render every route in happy-dom against fixtures (needs build)
npm run build:hosted    # per-visitor build for Vercel
npm run verify:hosted   # build + render the hosted bundle
npm run dev:hosted      # hosted UI against the local API (for testing)
```

## Wi-Fi module

The browser cannot read adapters, so a small Node service (`server/`) shells out to
`netsh` and serves JSON. In dev, Vite mounts it at `/api/*`; in production the same
handler is served by `server/index.mjs` next to `dist/`.

| Endpoint | Source | Needs admin |
| --- | --- | --- |
| `GET /api/wifi/status` | `netsh interface show interface` + `netsh wlan show interfaces` | detail only |
| `GET /api/wifi/networks` | `netsh wlan show networks mode=bssid` | no |
| `GET /api/wifi/profiles` | `netsh wlan show profiles` | no |

Windows only returns SSID, signal, cipher and link rates to an elevated process
(`WlanQueryInterface` → error 5). The UI shows the adapter state and the visible
networks regardless, and explains what needs elevation. Run `npm run dev` from an
elevated terminal for the full connection card.

Connecting to a network is not implemented yet: it changes system state and needs a
confirmation flow (Phase 3 follow-up).

## Speed test module

Real measurements from the local service, roughly 17 seconds per run:

- **Ping / jitter** — TCP connect RTT to `1.1.1.1:443`, 12 samples, jitter = mean absolute
  difference between samples.
- **Download** — repeated 25 MB HTTP GETs from `speed.cloudflare.com`, byte-counted for 7 s.
- **Upload** — repeated 1 MB POSTs to `speed.cloudflare.com/__up` for 7 s.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/speed/stream` | SSE: `phase` (ping/download/upload), then `result` or `failure` |
| `GET /api/speed/history?limit=20` | saved runs, newest first |

History is stored in `data/arhlinx.db` (SQLite via `node:sqlite`; Node 22+ prints an
experimental warning on startup). Delete `data/` to reset it.

## Data Manager module

Byte counters come from `netstat -e` (no admin needed), sampled every 5 seconds while the
app runs. Totals therefore cover time ArhLinx was open, not system uptime.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/usage/summary` | today/month totals, live rates, last 14 days, limit settings |
| `POST /api/usage/limit` | `{ "limitGb": number or null, "alertPercent": 1-100 }` |

The UI polls the summary every 5s, charts the last 14 days, and warns at the configured
percentage of the monthly limit (80% by default).

## Firewall, network, DHCP, coverage, monitor

| Endpoint | Source | Notes |
| --- | --- | --- |
| `GET /api/firewall` | `netsh advfirewall show allprofiles` + `... show rule name=all` | read-only, first 300 rules |
| `GET /api/network` | `ipconfig /all` (+ `hostname`) | IPv4/IPv6, DNS, gateway, DHCP, MAC |
| `GET /api/coverage` | Wi-Fi scan + computed statistics | bands, channel congestion, advice |
| `GET /api/monitor/connections` | `netstat -ano` | protocol, endpoints, state, PID |
| `GET /api/monitor/traffic` | usage sampler | live rates + totals |
| `GET /api/monitor/ping?host=&port=&count=` | TCP handshake | latency, min/avg/max, loss |
| `GET /api/devices?refresh=1` | `arp -a` + `ping -a` sweep | IP, MAC, name, online, self/gateway |

Firewall changes, DNS/IP edits and DHCP operations are not offered: they need elevation and
an explicit confirmation flow. The modules report what Windows exposes and say when a read
needs an elevated process.

Parsers are covered by `npm test` (46 checks) against captured Windows output formats.

## Integration (Phase 11)

- **Dashboard** is wired to `/api/overview`: live Wi-Fi state, today's bytes, last speed test and
  firewall profile count. It refreshes every 10s and falls back to `—` when a module is unavailable.
- **Application Settings** (`#/settings`): light/dark theme, local data clearing with a confirm
  step, and runtime info (app version, local API status, Node version, hostname).
- **Data clearing** deletes speed history, usage samples, or both, through
  `POST /api/data/clear { "scope": "speed" | "usage" | "all" }`.
- **Validation**: every POST body is parsed with zod; `/api/monitor/ping` accepts a hostname/IP
  and port 1-65535 only; unknown endpoints return JSON 404 errors.
- **Exposure**: the server binds `127.0.0.1` only, serves the API and the SPA from one origin, and
  the renderer never gets filesystem or process access — it only calls the local API.

Still missing by design: any operation that changes the machine (connect Wi-Fi, toggle firewall,
edit DNS, enable DHCP reservations). Those need elevation plus a confirmation flow.

## Devices module

`GET /api/devices` sweeps the local subnet: `arp -a` before and after a bounded ping sweep
(`ping -a`, 32 at a time, 300 ms timeout, max 254 hosts). Results are cached for 30 s and
`?refresh=1` forces a new sweep.

Returns IP, MAC, reverse-resolved name, online state, and `self` / `gateway` flags. Presence is
real data from the host PC. **Per-device byte counts are not possible** this way — the browser
cannot read another machine's traffic, and the PC only sees its own counters. That needs a
router API (UniFi, OpenWrt, pfSense, Asus...) or an agent on each device.

## Phone / LAN access

The server is loopback-only by default. To open it on your phone:

```bash
npm run build
# PowerShell
$env:ARHLINX_ALLOW_REMOTE="1"; npm start
# cmd.exe
set ARHLINX_ALLOW_REMOTE=1 && npm start
```

The console prints `phone: http://<your-ip>:8787`. Open that on a phone on the same Wi-Fi. If it
does not load, allow the port once (admin):

```powershell
New-NetFirewallRule -DisplayName "ArhLinx LAN" -Direction Inbound -Protocol TCP -LocalPort 8787 -Action Allow -Profile Private
```

LAN mode accepts private Host/Origin values only, still rejects public hosts and cross-site
requests, but has **no login** — anyone on that network can read the data. Use trusted networks
only, never port-forward it.

## Hosting on Vercel (per-visitor)

The repo ships two builds from the same code:

| Build | Command | What it does |
| --- | --- | --- |
| Local (Windows) | `npm start` | netsh/ipconfig/netstat modules for the machine running it |
| Hosted (Vercel) | `npm run build:hosted` | "This device" view; every visitor sees their own browser, IP, location and connection |

`vercel.json` sets the hosted build and `api/whoami.js` is a serverless function that returns the
visitor's IP, city, region, country, coordinates and timezone from Vercel's geo headers (it never
stores them).

Deploy:

```bash
npx vercel        # or import the repo in the Vercel dashboard
```

No environment variables or database are required. Each visitor gets their own reading:

- device: browser, OS, platform, screen, pixel ratio, cores, memory, language, timezone
- network: public IP, city/region/country, Vercel timezone, connection hints where the browser
  exposes them (`effectiveType`, downlink, RTT, data saver)
- speed test: download/upload against Cloudflare and latency to `/api/whoami`, measured in the
  visitor's browser

The hosted build deliberately hides Wi-Fi, firewall, DHCP, LAN devices and settings: a browser
cannot read them and a Vercel function cannot reach the visitor's network. Those stay in the
desktop build.

## Security

The API exposes adapter details, firewall rules, network scanning and TCP probes, so it is
locked to the local machine:

- **Loopback only** — binds `127.0.0.1`. A non-loopback `HOST` refuses to start unless
  `ARHLINX_ALLOW_REMOTE=1` is set explicitly.
- **Host allow-list** — only `localhost`, `127.0.0.1` and `::1` are accepted, which blocks
  DNS-rebinding attacks that point a public hostname at `127.0.0.1`.
- **Origin / Sec-Fetch-Site checks** — cross-site requests get `403`, so a malicious page in
  the same browser cannot drive the API.
- **Headers** — CSP (`default-src 'self'`, `frame-ancestors 'none'`), `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`,
  COOP/CORP.
- **Input handling** — POST requires `application/json`, bodies are capped at 64 KB, every
  payload is validated with zod, malformed JSON returns `400`, oversized bodies `413`.
- **Rate limits** — per-endpoint minimum intervals (e.g. one speed test every 5 s) return `429`.
- **Path handling** — traversal (`..`, `%2e`), malformed encoding and dotfiles return `400/404`;
  only `dist/` is served.
- **Error hygiene** — API errors are stripped of filesystem paths before being returned.
- `npm audit` reports 0 vulnerabilities.

Do **not** expose this app to a LAN or the internet as-is: there is no authentication, and the
API can enumerate networks and probe hosts. For remote access use a VPN or an SSH tunnel that
terminates on this machine, and keep the bind address on loopback.

## Why no Electron

Electron 45.2.3 crashes during Chromium init on this machine (Windows 11 22H2, build
22621): `exit 0x80000003`, no log, even for a minimal app. Electron 44.7.0 runs, but a
normal web app is simpler to run and test.

`--configLoader native` is required: the default config bundler fails on the Tailwind
native module here (`stream did not contain valid UTF-8`).

## Layout

```
api/                Vercel serverless function (whoami)
src/renderer/       React UI (Vite root)
src/renderer/src/   components, pages, lib
src/renderer/src/hosted/  per-visitor hosted UI
src/shared/         shared types
server/             Wi-Fi API: netsh runner, parsers, tests, static server
dist/               production build
```
