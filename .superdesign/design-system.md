# Postbell design system

## Product

Postbell is a human-controlled AI trading desk for Bitget tokenized US equities. It helps a trader answer: what moved after the US closing bell, what evidence explains it, what could happen next, and what risk would a hypothetical trade carry. The interface must make source evidence and uncertainty more prominent than AI confidence or technical infrastructure.

Primary surface: desktop research dashboard with a responsive single-column mobile view.

## Visual thesis

**A precision market bulletin, laid out like a Swiss information system.** One calm canvas, strong typographic hierarchy, strict alignment, and a single high-energy signal color. Avoid crypto-terminal neon, glass, gradients, decorative glow, card mosaics, and excessive status badges.

Use the high-contrast Swiss prompt as the primary style influence, adapted for a working data product rather than a landing page. The application should feel authored, disciplined, and immediately scannable.

## Palette

- Canvas: `#F2F3F0`
- Primary surface: `#FFFFFF`
- Ink: `#101114`
- Muted ink: `#656970`
- Structural rule: `#D8DAD6`
- Soft field: `#E9EAE6`
- Signal blue: `#315CFF`
- Positive: `#07885D`
- Negative/risk: `#D83A2E`
- Warning: `#A56800`

Use color only for live state and consequence. Large areas remain neutral. Never place green and red together unless directly comparing outcomes.

## Typography

- Display and section headings: `Space Grotesk`, bold, tight tracking.
- Interface, narrative, and labels: `Inter`, regular or semibold.
- Prices, percentages, timestamps, and tickers: `IBM Plex Mono`.
- Use sentence case for controls and labels. Uppercase only for ticker symbols and short market-state codes.
- Key price: 44–56px. Page/asset heading: 28–36px. Section heading: 18–24px. Body: 15–16px. Metadata: 12–13px.

## Layout

- Desktop uses one top header and a two-column workspace: a fluid primary research canvas and a 360–400px analysis rail.
- The watchlist is a horizontal market strip below the header, not a full left column.
- The main chart is the visual anchor and receives at least half of the first viewport height.
- Evidence appears as a single ordered feed below the chart, not three competing cards.
- The analysis rail contains one thesis, one scenario switcher, one risk table, and one clear next action.
- Use an 8px spacing unit with 16, 24, 32, and 48px primary gaps.
- Use 1px dividers to establish structure. Avoid nested bordered boxes.

## Components

- Header: compact wordmark, live-session state, Desk/Review navigation, account control.
- Market strip: five equal ticker cells; selected ticker is indicated by a blue top rule and stronger text.
- Chart: white plotting surface, fine gray grid, black primary line/candles, blue after-hours overlay, subtle regular/after-hours session blocks.
- Evidence feed: numbered chronological rows with source, fact, implication, and confidence text.
- Analysis rail: ink-black surface with white type; blue is used for the active scenario and primary action.
- Buttons: rectangular, 2–4px radius, 44px minimum height, direct labels.
- Status: plain text plus a small dot. Avoid pills unless the value is a selectable filter.
- Icons: restrained line icons; no emoji.

## Motion

- 120–180ms direct state transitions.
- New evidence rows fade and slide up by no more than 6px.
- Price updates flash once, then settle.
- No looping animation, glow, floating elements, or decorative parallax.
- Reduced motion removes movement while preserving state through color and border changes.

## Responsive behavior

- Below 960px, the analysis rail moves below the chart and the market strip scrolls horizontally.
- Below 640px, all content becomes one column; chart controls wrap; evidence source and confidence stack beneath the fact.
- Keep primary body text at 16px and all interactive targets at least 44px.

## Required first-screen content

- Postbell wordmark and tokenized-session status.
- Horizontal rNVDA, rTSLA, rQQQ, rAAPL, and rCOIN watchlist.
- Selected rNVDA summary with price, after-hours change, underlying close, token premium, and data age.
- Large session-aware price chart showing the traditional close and tokenized session continuation.
- Ordered evidence feed: token premium widened, semiconductor basket moved together, no confirmed company catalyst.
- Right analysis rail: “Momentum is real. The premium may not be.”
- Bull/base/bear scenario control with base selected.
- Hypothetical entry, invalidation, objective, risk/reward, and maximum portfolio risk.
- Primary action “Save to watchlist”; secondary action “Reject thesis.”
- Explicit boundary: Postbell prepares evidence and scenarios; the user decides.

## Prohibitions

- No three-column dashboard shell.
- No neon cyan or purple.
- No gradients, glassmorphism, glowing borders, or cyberpunk styling.
- No scattered cards with equal visual weight.
- No oversized marketing hero.
- No MCP, JSON-RPC, or implementation language in the primary interface.
- No decorative slash-number section labels.
- Do not introduce any fonts, colors, or component styles outside this system.

