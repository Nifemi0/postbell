# Archived Devpost draft

> This file is retained as an earlier planning artifact. Bitget AI Genesis Season 2 is not being submitted through Devpost. Use [bitget-submission.md](bitget-submission.md) and Bitget's official form instead.

# Title

Postbell

## One-line Summary

Postbell turns overnight Bitget rToken movement into a source-linked morning brief before the US market opens.

## Problem

Bitget rTokens trade beyond traditional US market hours, but the context around an overnight move is fragmented. A trader can see price movement without knowing whether the move is broad, thin, supported by related assets, or connected to a verified company source.

## Solution

Postbell watches the overnight rToken session, ranks material moves, records timestamped events, and explains what the available evidence supports. The demo focuses on rNVDA, rTSLA, and rQQQ and shows live Bitget ticker data when the public endpoint responds, with clearly labeled representative fixtures when it does not.

## Why This Matters

The product gives an overnight move a decision context: what changed, what confirms it, what is missing, and what deserves attention at the cash open. The interface keeps uncertainty visible instead of hiding it behind an unexplained AI score.

## How We Used AI

The current demo uses a typed analysis layer that ranks signals, assembles Night Tape events, and produces explicit bull, base, and bear scenarios from the normalized market and evidence objects. This keeps every displayed claim inspectable. The Postbell-specific UI is currently deterministic; an external LLM provider has not been connected to the production path yet.

## How We Used Codex

Codex was used to research the Bitget rToken API, shape the product and design direction, build the responsive landing page, generate original visual assets, add the TypeScript market contract and fallback adapter, wire the REST endpoints, update the Notion project record, and run the verification loop. The build journal records the rejected generic dashboard directions, the approved Quartr-inspired language, and the implementation decisions.

## Key Features

- Morning Brief for rNVDA, rTSLA, and rQQQ.
- Official Bitget public ticker integration using rToken/USDT symbols.
- Explicit live versus representative data labeling.
- Premium/reference and volume metrics with source and freshness metadata.
- Timestamped Night Tape events.
- Source-linked analysis objects and hypothetical bull, base, and bear scenarios.
- Responsive cream-and-black product-led landing page with original imagery.
- No production trade execution in the Postbell MVP.

## Architecture

The Express/TypeScript server serves the static Postbell UI and exposes four read-only endpoints:

- `/api/postbell/brief`
- `/api/postbell/market?symbol=rNVDA`
- `/api/postbell/night-tape?symbol=rNVDA`
- `/api/postbell/analysis?symbol=rNVDA`

`src/engine/postbellData.ts` normalizes Bitget ticker responses, computes metrics, and falls back to representative fixtures. `src/public/postbell.js` binds the Morning Brief and ticker selection to the API. The existing NexusTrader MCP and crypto engine remain separate from the Postbell research surface.

## Testing Instructions

```text
npm install
npm run build
npm test
npm start
```

Open `http://localhost:4040/postbell.html`. The latest verification run passes 37 checks across market data, indicators, backtesting, risk management, MCP tools, and the Postbell data layer.

## Public Demo Link

TODO: Publish the app and replace this line with the public URL.

Local fallback: `http://localhost:4040/postbell.html`

## Public Repository Link

TODO: Create or confirm the public repository URL before submission.

## Demo Video

TODO: Record a 90–120 second walkthrough.

Suggested outline:

1. Show the problem: an rToken moved overnight and the trader lacks context.
2. Open Morning Brief and select rNVDA.
3. Show the live Bitget price, reference label, timestamped Night Tape events, and evidence links.
4. Switch to rTSLA or rQQQ to show the same normalized workflow across assets.
5. Show the representative fallback behavior and explain the no-trading-execution boundary.
6. Close on the thesis: wake up to the market already understood.

## Screenshot Shot List

1. Hero and product mockup showing the Postbell visual direction.
2. Morning Brief with live data label and rNVDA signal.
3. Night Tape/evidence area showing timestamped events and sources.
4. Mobile-width landing page showing responsive layout.
5. Terminal/API proof showing the Postbell endpoint response and test summary.

Captured local assets: `docs/submission/postbell-desktop.png` and `docs/submission/postbell-mobile.png`.

## Submission Readiness Notes

The local product surface and reproducible test path are ready for review. The Bitget ticker path is live in the current environment, but the reference value is the Bitget 24-hour open proxy rather than a verified regular-session close, and the current volume baseline falls back to the current 24-hour volume. Primary-source adapters are still pending. Do not describe the current demo as a fully sourced AI analyst until those gaps are closed.

## Known Limitations

- Bitget Reality order books and fills may require whitelist access.
- A true regular-session close and historical overnight volume median are not yet connected.
- Primary-source company filings and news adapters are not yet wired.
- The Postbell UI uses deterministic analysis fixtures; no external LLM call is in the Postbell request path.
- No public deployment, repository URL, video URL, or confirmed Devpost registration is recorded yet.

## TODO Official Form Fields

- Confirm the exact hackathon title, slug, rules, judging criteria, and submission fields through the official Devpost record.
- Confirm registration/team status for the Bitget event.
- Add public repository URL.
- Add public demo URL.
- Add demo video URL.
- Add any required sponsor, track, or custom-answer fields once the official form is available.
