# SARATHI AI — Business Copilot

A runnable React + Vite frontend and Node.js + Express API prototype based on `docs/Innovators7375.pdf` (HackFront India / Innovators submission).

## Features in this build

- Dashboard KPIs, revenue/profit trend, recommendations and competitor snapshot.
- Business profile and settings persisted to `backend/data/db.json`.
- Market intelligence workspace with competitor-gap prototype view and a TinyFish-compatible web research adapter.
- Business feasibility scoring, break-even estimate, SWOT and risk-oriented recommendations.
- Government scheme shortlist (PMFME, MUDRA, Stand-Up India and MSME support) with official portal links. Eligibility is illustrative; verify rules with the official provider.
- Loan repayment calculator (monthly EMI, total interest and total repayment).
- AI advisor chat with stored conversation history, English/Hinglish fallback responses, browser speech-to-text and optional Groq integration.
- Business snapshot reports with print/save support.
- Health endpoint and stable database path regardless of where commands are run.

## Requirements

- Node.js 20+ recommended.
- npm.

## Run locally (macOS/Linux)

```bash
unzip sarathi-ai-fullstack-v2.zip
cd sarathi-ai
npm run install:all
cp backend/.env.example backend/.env
npm run dev
```

Open <http://localhost:5173>. API health check: <http://localhost:5000/api/health>.

If dependencies are already installed, `npm run dev` is enough. If port 5000 is busy, stop the other backend process first.

## Demo login (important)

`DEMO_AUTH=true` is intentionally permissive for local hackathon demos: any non-empty email/username and password will sign in; a new identity is created on first use. Existing demo accounts also accept any non-empty password. This is **not secure authentication** and must not be used on a public deployment.

For password verification, set `DEMO_AUTH=false` and set a strong `JWT_SECRET` in `backend/.env`. For production, also replace the simple SHA-256 password hashing with Argon2id/bcrypt, add rate limiting, secure cookie/token handling, input validation and a real database.

## Optional integrations

### Groq chat
Set `GROQ_API_KEY` in `backend/.env`. Without it, the app uses an offline rule-based advisor so the project still runs without API keys.

### TinyFish / live web research
Set `TINYFISH_API_URL` and, if required, `TINYFISH_API_KEY`. The adapter sends `{ query, profile }` as JSON. Without configuration, the Market page returns an explicit demo/configuration response; it does not claim to have fetched live market data.

### Maps and external datasets
The market map in this prototype is illustrative. For actual competitor coordinates and live maps, integrate OpenStreetMap/Overpass or a licensed maps provider and display source/freshness information. Never treat sample competitors as verified businesses.

## API overview

- `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/me`, `PUT /api/profile`
- `GET /api/dashboard`
- `GET /api/schemes`, `GET /api/schemes/all`
- `POST /api/analyze`
- `POST /api/loan-calculator`
- `POST /api/market-search`
- `GET/POST /api/chat`
- `POST /api/tinyfish`
- `GET/POST /api/reports`

## Data and limitations

The local JSON database is suitable for a demo, not multi-user production traffic. Scheme matching, competitor examples, financial scores and risk statements are decision-support estimates, not legal, financial or lending guarantees. Scheme and loan eligibility should be checked with official sources. Do not enter sensitive customer or financial data into a public demo.

## Dashboard / authentication stability patch

This patched build includes:
- Dashboard as the default `/` route and a persistent sidebar across routes.
- Startup validation of a saved session using `/api/me`; invalid/expired tokens return to sign-in instead of leaving a broken page.
- Consistent bearer-token handling for protected API calls.
- Async-safe React effects with cleanup and caught request errors in Chat, Schemes, Reports and Settings.
- Chat send failures displayed in the conversation instead of producing unhandled promise rejections.
- A page-level error boundary so a component error does not remove the navigation shell.
- A local SVG favicon to avoid the missing favicon 404.

Run from this folder:
1. `npm run install:all`
2. `cp backend/.env.example backend/.env` (only if you do not already have your own `.env`)
3. `npm run dev`

The demo login is for local development only. For production, disable demo authentication and use a strong stable `JWT_SECRET`.
