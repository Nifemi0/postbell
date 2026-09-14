# Postbell

Postbell is an AI Trading Desk for overnight Bitget tokenized-stock markets. It turns live rToken movement, peer context, event timelines, and source checks into a decision-ready morning brief.

It is designed for the first few minutes of a trading day: what moved, what may explain it, what is confirmed, and what would invalidate the read. Postbell presents research and scenarios; it does not place trades.

## Links

- **Live demo:** https://nexustrader-mcp.vercel.app/
- **Demo video:** https://youtu.be/_BAzTV5-uMc
- **Repository:** https://github.com/Nifemi0/postbell
- **Hackathon post:** https://x.com/Love_Light_11/status/2099267855581589715
- **Bitget AI Genesis Season 2:** https://www.bitget.com/activity-hub/hackathon

## What the product does

- **Morning Brief:** asks a research question and produces a natural-language Detect → Connect → Decide analysis.
- **Night Tape:** shows the overnight sequence and timestamped market context.
- **Evidence checks:** separates live Bitget observations, source status, and inference so an unconfirmed catalyst is not presented as fact.
- **Cross-asset context:** compares instruments such as rNVDA, rTSLA, and rQQQ to distinguish broad beta from an isolated move.
- **Saved research:** keeps useful briefs available for later review.
- **Model settings:** lets each workspace connect its own compatible provider, including DeepSeek.

## Data and AI

The live adapter reads Bitget's public ticker and one-hour candlestick endpoints for `rNVDAUSDT`, `rTSLAUSDT`, and `rQQQUSDT`. The interface shows timestamps and labels fallback representative data when a public endpoint is unavailable.

When a model is connected, Postbell sends normalized market observations and evidence statuses to the provider. The model writes the explanation and scenarios; it does not invent ticker values or place orders. If the model is not connected or a request fails, the UI reports the failure instead of presenting a deterministic response as AI output.

API keys are stored locally in the browser workspace and are not committed to the repository. No trading credentials or order execution are required.

## Run locally

Requirements: Node.js 18 or newer.

```bash
npm install
npm start
```

Then open `http://localhost:4040/postbell.html`.

The main routes are:

- `http://localhost:4040/postbell.html` — landing page
- `http://localhost:4040/postbell-app.html` — Morning Brief
- `http://localhost:4040/postbell-tape.html` — Night Tape
- `http://localhost:4040/postbell-saved.html` — Saved Research
- `http://localhost:4040/postbell-settings.html` — model and workspace settings

## API routes

- `GET /api/postbell/brief`
- `GET /api/postbell/market?symbol=rNVDA`
- `GET /api/postbell/night-tape?symbol=rNVDA`
- `GET /api/postbell/analysis?symbol=rNVDA`
- `POST /api/postbell/research` with `{ "question": "What moved in the overnight rToken tape?", "symbol": "rNVDA" }`
- `GET /api/postbell/watch`

## Project documentation

- [Product brief](docs/PRODUCT.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Testing status](docs/submission/TESTING-STATUS.md)
- [Deployment notes](docs/DEPLOYMENT.md)
- [Submission checklist](docs/SUBMISSION_CHECKLIST.md)
- [Claims ledger](CLAIMS.md)
- [Bitget submission draft](bitget-submission.md)

## Hackathon fit

Postbell is submitted under **AI Trading Desk → Information Extraction & Signal Generation** for Bitget AI Genesis Season 2. The core research task is reproducible: ask what moved overnight, inspect the Bitget evidence and peer context, then receive an actionable open plan with uncertainty and invalidation conditions.

## License

MIT

