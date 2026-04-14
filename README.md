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

Node.js + Express. No build step. All labs run locally on port 3000.
