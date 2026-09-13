# Postbell three-phase implementation plan

## Plan contract

- Build mode: autonomous implementation with review after each phase
- Verification: required at every phase gate
- Git: commit after each phase gate
- Source of truth: `docs/PRODUCT.md`, `docs/DESIGN_SYSTEM.md`, and the existing Express/TypeScript app
- Demo boundary: research and decision support; no production trade execution

## Phase 1 — Make the signal real

Goal: connect the current landing and demo to a reliable market-data foundation for one tokenized stock.

- [x] **1. Define the tokenized-stock universe and data contract**
  Spec ref: `docs/PRODUCT.md > Core workflow > Detect`
  What to build: Define symbols, source fields, freshness metadata, and the normalized ticker/candle shape for Bitget.
  Acceptance: One documented contract supports rNVDA, rTSLA, and rQQQ and labels representative versus live data.
  Verify: Review the contract against the existing engine types and run `npm run build`.

- [x] **2. Implement the Bitget market-data adapter**
  Spec ref: `docs/BUILD_PLAN.md > Build sequence > live market-data adapter`
  What to build: Add a provider module that fetches tokenized-stock prices, volume, candles, and timestamps with timeout and fallback handling.
  Acceptance: The API returns normalized data or a clear representative fallback without taking down the page. The default uses Bitget's public ticker endpoint; `POSTBELL_BITGET_URL` can route through a read-only proxy.
  Verify: Exercise the adapter through the existing REST endpoint and run the build.

- [x] **3. Calculate the overnight signal metrics**
  Spec ref: `docs/PRODUCT.md > Core workflow > Detect`
  What to build: Calculate reference close, token premium, volume ratio, cross-asset confirmation, and a ranked divergence score.
  Acceptance: The Morning Brief can explain why a symbol is ranked and shows the freshness of every value.
  Verify: Run deterministic fixtures for positive, negative, flat, and stale-market cases.

### Phase 1 gate

The demo shows one live or explicitly labeled fixture signal with source, timestamp, premium, volume ratio, and a safe fallback state.

**Status:** Passed locally with representative fixtures; the read-only provider path is ready behind `POSTBELL_BITGET_URL`.

## Phase 2 — Build the evidence workflow

Goal: turn a price move into the source-linked Night Tape that makes Postbell distinct.

- [x] **4. Create the Night Tape event model**
  Spec ref: `docs/PRODUCT.md > Core workflow > Connect`
  What to build: Store timestamped price events, cross-asset confirmations, source scans, and unresolved evidence.
  Acceptance: Each event has a type, timestamp, summary, source, confidence, and linkable detail.
  Verify: Render a fixture Night Tape containing at least three event types.

- [ ] **5. Add primary-source and market evidence providers**
  Spec ref: `docs/DESIGN_SYSTEM.md > Principles > Link conclusions visibly to their sources`
  What to build: Add adapters for available company/filing/news sources and preserve source metadata in the normalized evidence object.
  Acceptance: Missing or delayed sources are visible and never silently presented as confirmed catalysts.
  Verify: Run fixtures for confirmed catalyst, supporting context, and no-catalyst cases.

- [ ] **6. Generate the sourced analysis and scenarios**
  Spec ref: `docs/PRODUCT.md > Core workflow > Explain`
  What to build: Produce supported thesis, bull/base/bear alternatives, uncertainty, invalidation, and citations from the evidence set.
  Acceptance: Every claim is cited or explicitly marked uncertain; scenarios are clearly hypothetical.
  Verify: Inspect a generated analysis and trace every claim back to its event or source.

### Phase 2 gate

The judge can follow one move from chart to timestamped evidence to a sourced thesis without leaving the product.

**Status:** In progress. The event and scenario model is wired; primary-source adapters remain.

## Phase 3 — Turn it into a submission-ready product

Goal: make the experience resilient, legible, and easy to demonstrate.

- [x] **7. Connect the landing demo to the Morning Brief API**
  Spec ref: `docs/PRODUCT.md > MVP`
  What to build: Replace fixture-only values where available, keep representative labels where not, and connect ticker selection to the brief.
  Acceptance: The first viewport explains the product and the demo path reaches a clearly labeled representative signal or a configured live signal.
  Verify: Run the browser flow at desktop and mobile widths.

- [ ] **8. Add resilience and observability states**
  Spec ref: `docs/BUILD_PLAN.md > Verification checkpoints`
  What to build: Handle provider timeout, stale data, empty evidence, malformed responses, and WebSocket disconnect states.
  Acceptance: The user sees what is unavailable and what time the last valid data arrived.
  Verify: Force each failure fixture and confirm the page remains usable.

- [ ] **9. Prepare the end-to-end demo and proof**
  Spec ref: `docs/PRODUCT.md > Success test`
  What to build: Script the one-minute judge path, capture screenshots, record architecture and source-link proof, and update README links.
  Acceptance: A reviewer can run the demo from the repository with no hidden setup and understand the wow moment within one minute.
  Verify: Fresh-folder run, browser walkthrough, and screenshot review.

- [ ] **10. Prepare the hackathon handoff**
  Spec ref: `docs/PRODUCT.md > Success test`
  What to build: Gather project story, demo URL, repository URL, screenshots, video outline, sponsor integration explanation, and final rules checklist.
  Acceptance: All submission fields have an owner and a verified source before submission.
  Verify: Review the Notion hackathon record and confirm registration/rules status before publishing.

### Phase 3 gate

The local build is resilient, the demo is reproducible, the evidence chain is visible, and the submission packet can be assembled without inventing missing facts.
