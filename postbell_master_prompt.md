# Postbell master build prompt

## Context

Postbell is the Bitget AI Base Camp build for overnight intelligence on tokenized US stocks. The product focuses on rTokens such as rNVDA, rTSLA, and rQQQ, which trade outside the traditional US session. The current working deadline is September 21, based on the Bitget AI announcement supplied by the participant; official Devpost registration and rules still need confirmation.

## Thesis

Postbell turns an overnight rToken move into a source-linked morning brief before the cash market opens.

## Co-primary features

1. **Morning Brief:** rank unusual tokenized-stock movement using Bitget price, reference, volume, and cross-asset context.
2. **Night Tape:** connect the move to timestamped market events, sources, uncertainty, and hypothetical scenarios.

## Why this fits the sponsor

The concept directly uses Bitget's rToken market and its 24/7 trading behavior. It demonstrates an AI-agent workflow around a sponsor-native market surface rather than presenting a generic crypto dashboard.

## Acceptance criteria

- A judge can identify what moved, why it was ranked, and what evidence is missing within one minute.
- Live and representative data are visibly distinguished.
- Every displayed conclusion has a source or an explicit uncertainty label.
- The demo survives provider failure through deterministic fixtures.
- No production trade can be executed from the MVP.

## Current boundary

The Bitget public ticker path is connected. A verified regular-session close, historical volume baseline, primary-source adapters, public deployment, and official Devpost registration remain open before final submission.
