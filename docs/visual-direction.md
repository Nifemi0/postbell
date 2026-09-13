# Postbell visual direction

## Product perception

Postbell should feel like an overnight equities research desk: calm under pressure, precise about evidence, and clearly controlled by the trader. The interface should drive one behavior: inspect an unusual move, understand the evidence, stress-test a position, then make an informed decision.

Desired perception: **measured, alert, editorial, trustworthy, nocturnal**.

The current interface has a credible amount of information, but every panel has similar weight. Cyan borders, all-caps monospace labels, badges, and neon highlights produce a familiar crypto-terminal look. The copilot, chart, backtester, MCP inspector, and derivatives telemetry compete for attention. The redesign needs a clear reading path and should make data provenance visible without exposing implementation language as the main product story.

## Naming territory

### Selected working name: Postbell

**Meaning:** the market intelligence that arrives after the traditional closing bell, while tokenized equities continue trading.

**Positioning line:** The market after the market.

**Product description:** Postbell watches tokenized US equities after hours, explains unusual moves, and helps a trader test the risk before acting.

The name is compact, pronounceable, and does not restrict the product to autonomous execution. A preliminary web collision check did not find an obvious active finance product using this exact name. This is not a trademark clearance.

Names removed from consideration after collision checks:

- AfterBell — existing AI stock briefing product.
- OpenBell — multiple active AI trading products.
- Late Tape — active market-monitoring product and an established market term.
- Nightglass — active options-flow research terminal.

Backup candidates:

- **Third Session** — emphasizes the new session after pre-market and regular trading; distinctive but less immediately clear.
- **Bellshift** — conveys the shift into continuous markets; energetic but slightly more operational.

## Explored directions

### After-hours newsroom — selected

**Thesis:** Treat each market anomaly like a developing story, with the chart as evidence and the AI as an analyst writing the brief.

Signature moves:

- A wide evidence canvas with a narrow, persistent decision rail.
- Serif display headlines for the market narrative; neutral sans-serif for controls and tables; monospace only for prices, timestamps, and raw identifiers.
- Deep ink surfaces with warm paper panels for reports and scenario cards.
- Session shading on charts that distinguishes regular US hours from tokenized after-hours trading.
- One cobalt signal color, with green and vermilion reserved for outcomes and risk.
- A timestamped evidence trail that opens inline rather than in a developer inspector.

Reference principles:

- [GM Markets](https://gm.markets/) — tokenized-equity context and a chart-first workspace.
- [Nightglass](https://nightglass.trade/) — evidence explained in a reading sequence; reference only, with no naming, copy, or layout reuse.
- [Praxis Prime](https://edwson.com/project-praxis-prime.html) — institutional hierarchy and operational status clarity.

Risk: editorial typography can reduce scan speed if used inside dense tables. Keep it to narrative surfaces and major headings.

### Observation deck

**Thesis:** Present the market as a continuously monitored system with live session boundaries, event pulses, and linked assets.

Signature moves:

- Full-width dark chart with luminous time bands and a thin global session ribbon.
- Small market nodes connecting the underlying equity, rToken, sector ETF, and crypto hedge.
- Sparse glass overlays over a flat graphite shell.
- Motion only when new evidence arrives: a pulse travels from the source to the affected asset.

Potential Spline use: a single restrained globe or 24-hour session ring on the landing page, with a static SVG fallback. It adds little to the working terminal and should not be loaded there.

Risk: the spatial idea can become spectacle and consume the short build window without improving decisions.

### Risk ledger

**Thesis:** Make the product feel like a disciplined analyst's marked-up ledger, where every conclusion is tied to a source and every trade has an invalidation.

Signature moves:

- Warm off-white canvas, black rules, tabular numerals, and red pencil-style risk annotations.
- Compact row-based research rather than floating cards.
- Scenario comparison presented like an investment committee memo.
- Approval controls treated as signatures with a visible audit trail.

Risk: highly distinctive, but a bright interface is less comfortable for overnight monitoring and may feel removed from live trading.

## Selected system

The **after-hours newsroom** direction best connects the hackathon theme, human-controlled AI Trading Desk track, and existing dashboard mechanics. It is more memorable than another cyberpunk terminal while remaining feasible in the current HTML/CSS/JavaScript stack.

### Color tokens

| Role | Token | Value |
|---|---|---|
| App background | Ink | `#0B0D10` |
| Raised surface | Graphite | `#14171C` |
| Report surface | Paper | `#F1EEE7` |
| Primary text on dark | Chalk | `#F5F2EB` |
| Secondary text | Slate | `#9299A4` |
| Primary signal | Cobalt | `#5B7CFA` |
| Positive | Gain | `#37C98B` |
| Risk | Vermilion | `#FF665A` |
| Caution | Amber | `#E8B44F` |
| Divider | Rule | `#2A2F37` |

Color is concentrated in live state, chart marks, and decisions. Decorative cyan glow is removed.

### Typography

- Display and narrative: **Newsreader** or a system-safe editorial serif fallback.
- Interface and tables: **Inter** or the system sans stack.
- Numbers and machine evidence: **IBM Plex Mono** or a system monospace fallback.
- Large market thesis: 40–56 px desktop, 32–40 px mobile.
- Body copy: 15–17 px with a 65-character maximum line length.
- Labels use sentence case. All caps is reserved for tickers and genuinely terse status codes.

### Geometry and surface

- 2 px to 6 px radii; avoid pill-shaped containers except status filters.
- Thin rules organize information; cards are used only when an item has a distinct state or action.
- Desktop content width is fluid, with a 320–380 px decision rail.
- Mobile becomes one reading column: event summary, chart, evidence, scenarios, decision.

### Motion

- 140 ms for hover/focus, 220 ms for panel transitions, 360 ms for new-evidence reveals.
- Price changes flash once and settle; charts do not constantly glow or pulse.
- Reduced-motion mode removes movement and uses a border/color state change.

### Interaction signatures

1. **Session lens:** dragging across the chart shows the underlying market state, rToken divergence, volume, and relevant events at the same moment.
2. **Evidence-to-decision trail:** selecting a signal highlights its source, updates the scenario card, and visibly changes position risk without placing an order.

## Product translation

### Landing

- Headline: “The market after the market.”
- One sentence explaining tokenized US equities and the human-controlled decision workflow.
- A real anomaly example shown as a compact evidence-to-decision sequence.
- Primary action: Open the desk.

### Desk

- Left: watchlist ranked by unusual after-hours movement.
- Center: selected asset, session-aware chart, and evidence timeline.
- Right: analyst brief, bull/base/bear scenarios, risk card, and decision controls.
- Bottom drawer: backtest and decision history. The raw MCP inspector moves to a developer/debug view.

### Documentation and submission

- Use the same editorial headings, evidence rules, and scenario colors at lower density.
- Diagrams should show data provenance and decision boundaries, not generic AI-node imagery.

### States

- Loading: skeleton aligned to the final content, with source being contacted.
- Empty: explain what action creates a result.
- Error: name the unavailable source and stop dependent conclusions.
- Stale data: amber timestamp and explicit stale label.
- Success: describe the completed analysis or saved decision; do not imply a trade executed.
- Disabled: state the missing prerequisite next to the control.

## Build references

- [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/) — Apache 2.0, maintained, approximately 35 KB, suitable for session shading and streaming updates. Attribution requirements must be retained.
- [Lucide](https://lucide.dev/) — ISC licensed icons; use a small selected SVG set instead of emoji symbols.
- Spline is optional for the landing-page session ring only. The working product should remain flat and fast.

## First local build slice

Rebuild the app shell and one complete selected-asset flow with static representative data:

1. Postbell navigation, session status, and ranked watchlist.
2. One rToken chart with regular/after-hours bands.
3. One evidence-led analyst brief with source labels.
4. Bull, base, and bear scenarios.
5. A risk card with a human decision control.

Review this slice at desktop and mobile widths before wiring the full data layer. The review should test whether a new user can answer three questions within ten seconds: what moved, why it may have moved, and what decision is being requested.

