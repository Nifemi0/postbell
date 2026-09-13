# Postbell build notes

## 2026-09-12 — Plan locked

- The first dashboard concepts were rejected as generic AI dashboard styling.
- The approved visual direction is Quartr-inspired: warm cream canvas, black typography, compact navigation, restrained rules, product-led hero imagery, and source-first content.
- Postbell is the working name and the core promise is: “Wake up to the market already understood.”
- The local landing page is implemented at `src/public/postbell.html` with original stone and overnight-office assets.
- Notion project and Bitget hackathon records were created and linked from the Hackathon Command Center.
- The three implementation phases are: make the signal real, build the evidence workflow, and turn it into a submission-ready product.

## 2026-09-12 — Local MVP wiring

- Added a normalized Postbell market contract and deterministic metrics for premium, volume multiple, direction, and divergence score.
- Added a configurable read-only Bitget adapter at `POSTBELL_BITGET_URL`; the default remains a clearly labeled representative fixture.
- Added `/api/postbell/brief`, `/api/postbell/market`, `/api/postbell/night-tape`, and `/api/postbell/analysis`.
- Connected the landing-page Morning Brief and ticker selection to those endpoints, including source, freshness, and representative/live labeling.
- Added timestamped Night Tape events plus explicitly hypothetical bull, base, and bear scenarios.
- Verification: `npm run build` and `npm test` pass with 37 checks.

## Open decisions

- Confirmed Bitget rToken symbols and public ticker coverage; Reality order book/fills remain whitelist-gated.
- Confirm registration status and capture the complete official hackathon rules.
- Choose the first live source set for primary-source evidence.

## Phase review protocol

At each phase gate, verify the user-facing flow, run the relevant fixtures/build checks, record the result here, and commit the completed phase before moving on.
