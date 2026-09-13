# Postbell build plan

## Current milestone

Build a convincing end-to-end Morning Brief demo for one tokenized stock, then widen coverage.

## Build sequence

- [x] Confirm hackathon and deadline
- [x] Choose Postbell concept
- [x] Approve visual direction
- [x] Implement responsive landing page locally
- [ ] Define Bitget tokenized-stock symbol universe
- [ ] Add live market-data adapter
- [ ] Calculate overnight reference price, premium, volume ratio, and divergence score
- [ ] Build Night Tape event schema
- [ ] Add primary-source evidence adapters
- [ ] Generate source-linked bull, base, and bear cases
- [ ] Connect the Morning Brief UI to live API responses
- [ ] Add demo fixtures for upstream outages
- [ ] Verify the complete judge flow
- [ ] Prepare architecture diagram, screenshots, video, and submission copy

## Verification checkpoints

1. The landing page works at desktop and mobile widths.
2. Every displayed live value includes source and freshness metadata.
3. Every AI claim cites evidence or states that evidence is missing.
4. The demo remains usable when an upstream API fails.
5. No production trade can be executed from the MVP.
