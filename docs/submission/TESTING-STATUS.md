# Testing status

| Area | Status | Evidence |
| --- | --- | --- |
| TypeScript build | Pass | `npm run build` |
| Automated verification | Pass | `npm test` — 37 checks passed |
| Postbell landing page | Pass locally | `http://localhost:4040/postbell.html` |
| Ask Postbell research flow | Pass locally | `POST /api/postbell/research` returns detect → connect → decide with evidence and uncertainty |
| Submission screenshots | Captured | `postbell-desktop.png`, `postbell-mobile.png` |
| Bitget public ticker | Pass in current environment | `rNVDAUSDT`, `rTSLAUSDT`, `rQQQUSDT` returned ticker data |
| Fallback behavior | Pass | Representative fixtures are used when the provider is unavailable |
| Primary-source evidence | Pending | Provider adapters are not wired yet |
| Public deployment | Pending | No public URL recorded |
| Public repository | Pending | No public repository URL recorded |
| Demo video | Pending | Video not recorded |
| Bitget registration | Pending | Complete Bitget's registration and record the UID |
| Bitget submission form | Pending | Submit the completed packet through the official Google Form |
| Production trade execution | Deliberately absent | Postbell MVP is research and decision support only |
