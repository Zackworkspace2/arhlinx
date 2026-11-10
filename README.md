# ArhLinx

<p align="center"><img src="src/renderer/public/logo.png" width="340" alt="ArhLinx"></p>

<p align="center"><strong>Complete Network Control</strong><br>
Device, connection and local network diagnostics — in the browser and on Windows.</p>

---

## What it does

ArhLinx gives you a clear, measured picture of a device and the network it sits on. It runs in two
editions from one codebase:

**Browser edition** — for any visitor, on any device:

- Device profile: browser, operating system, display, pixel ratio, cores, memory, language, timezone
- Connection identity: public IP, city, region, country, timezone, network type and RTT estimates
- Speed test: download, upload and latency measured in the browser, with local history
- Latency and jitter analysis with per-sample distribution
- Reachability checks across major services
- WebRTC exposure review: which local addresses a browser still reveals
- Capability audit: WebGL renderer, WebAssembly, storage, service worker, cookies, WebRTC
- Connection quality score derived from measured RTT, jitter and throughput
- One-click report export for support tickets and comparisons

**Desktop edition** — a full network console for the Windows machine it runs on:

- Wi-Fi scanning with signal, band, channel and saved profiles
- Firewall profile status and rule inventory with search
- Adapter, IPv4/IPv6, DNS, gateway and DHCP lease details
- Data usage tracking with daily and monthly totals, limits and alerts
- Channel congestion and placement recommendations
- LAN device discovery: address, MAC, name and online state
- Live traffic rates, active connections and TCP latency tests

Both editions share the same design system, typography and theme.

## Getting started

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # production build
npm start              # desktop API + app on http://127.0.0.1:8787
```

Hosted edition:

```bash
npm run build:hosted   # per-visitor build
npm run verify:hosted  # build + render check
vercel --prod          # deploy
```

Remote access to the desktop edition (phone on the same network):

```powershell
$env:ARHLINX_ALLOW_REMOTE="1"; npm start
```

The console prints the address to open. The service stays loopback-only unless this flag is set.

## Architecture

```
api/                    serverless function for visitor identity and geo
src/renderer/           React application (Vite root)
src/renderer/src/       local console: pages, components, design system
src/renderer/src/hosted/ browser edition: dashboard, panels, measurements
server/                 Windows service: netsh/ipconfig/netstat readers, API, storage
src/shared/             shared types
```

- React 19, TypeScript, Vite 8, Tailwind CSS 4
- Windows instrumentation through `netsh`, `ipconfig`, `netstat`, `arp` and TCP probes
- SQLite for speed history, usage samples and preferences
- Zod validation on every request; JSON API over loopback

## Deployment

`vercel.json` builds the browser edition and mounts `api/whoami.js`. No environment variables or
database are required. Every push to `main` can deploy automatically once the repository is
connected in Vercel.

## Security

The desktop service binds to `127.0.0.1`, validates Host and Origin, rejects cross-site requests,
sets a strict Content Security Policy, rate-limits expensive endpoints and serves only the built
application. Requests are validated with Zod, bodies are size-limited and errors never expose
filesystem paths.

The browser edition performs all measurements client-side and stores history in local storage.
No account, telemetry or third-party tracking is used.

## Development checks

```bash
npm run typecheck
npm test
npm run smoke
```

## License

Private project. All rights reserved.
