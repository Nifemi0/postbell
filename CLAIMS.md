# Claims and evidence

| Claim | Evidence | Status |
| --- | --- | --- |
| Postbell reads Bitget rToken ticker data | `src/engine/postbellData.ts`; `/api/postbell/brief` | Verified locally |
| rToken symbols use the `r` prefix and USDT pair | Bitget Reality Trading Guide | Official documentation |
| The UI labels live versus representative data | `src/public/postbell.js`; `dataMode` in API responses | Verified locally |
| Every demo signal includes timestamped events and source metadata | `/api/postbell/night-tape`; `/api/postbell/analysis` | Verified locally |
| Postbell has a verified regular-session premium and historical volume baseline | None yet | Do not claim |
| Postbell has a connected external LLM analyst | None yet | Do not claim |
| Postbell is publicly deployed | None yet | Do not claim |
