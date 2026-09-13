# Postbell

Postbell is an AI overnight-intelligence product for tokenized US stocks. It monitors markets after the US session closes, detects unusual movement, connects each move to evidence, and prepares a sourced brief before morning.

## Product promise

Wake up to the market already understood.

## Primary user

An active trader who follows tokenized US stocks on Bitget but cannot continuously monitor overnight price, volume, premium, cross-asset movement, filings, and company announcements.

## Core workflow

1. **Detect:** rank abnormal overnight moves using price, volume, premium, and cross-asset behavior.
2. **Connect:** build a timestamped Night Tape from market data and verified sources.
3. **Explain:** produce a supported thesis, alternatives, uncertainty, and invalidation level.
4. **Brief:** deliver the few moves that deserve attention before the US open.

## Normalized market contract

The Postbell adapter normalizes each tokenized-stock quote to `symbol`, `tokenPrice`, `referenceClose`, `volume24h`, `volumeMedian`, `observedAt`, `source`, `referenceCloseSource`, and `dataMode`. It reads Bitget's public ticker endpoint for `rNVDAUSDT`, `rTSLAUSDT`, and `rQQQUSDT`; if that endpoint is unavailable or whitelist-gated, the UI labels the response `representative`. The initial symbol universe is `rNVDA`, `rTSLA`, and `rQQQ`.

The derived metrics are `premiumPct` (token price versus the reference close), `volumeMultiple` (current volume versus the overnight median), `divergenceScore` (bounded 0–100 ranking), and `direction`. These values are exposed at `/api/postbell/market` and are always returned with source and timestamp metadata.

## MVP

- Morning Brief with ranked tokenized-stock signals
- Night Tape connecting movement to timestamped evidence
- Source-linked Postbell analysis
- Bull, base, and bear cases with visible confidence
- Bitget market-data integration
- Responsive public landing page and demo
- Dedicated Postbell workspace with top navigation, live watchlist, Ask Postbell research, evidence trail, and saved local briefs
- Ask Postbell research task that returns a question, live/representative market observation, source evidence, uncertainty, and a watchpoint

Trading execution is outside the first demo. Representative data must be labeled until a live source is connected.

## Bitget references

- [Reality Trading Guide](https://www.bitget.com/docs/uta/reality-trading-guide) — rToken symbols, ticker/candlestick coverage, and whitelist notes.
- [Bitget Market Data API](https://www.bitget.com/docs/catalog/market/market-data) — public spot ticker endpoint and response fields.

## Success test

A judge should understand within one minute what moved overnight, why Postbell considers it material, which evidence supports that conclusion, what remains uncertain, and what the user should watch next.
