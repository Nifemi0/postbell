# Postbell — Bitget AI Genesis Season 2 submission draft

Postbell is being prepared for Bitget's AI Genesis Season 2. The submission route is Bitget's own activity page and Google Form; this project is not being submitted through Devpost.

## Official event links

- Activity page: https://www.bitget.com/activity-hub/hackathon
- Submission form: https://forms.gle/GyWZCMCPocgJdJon6
- Developer handbook: https://bitget-ai.gitbook.io/hackathon
- Official announcement: https://telegram.me/s/Bitget_Announcements?before=17783

The canonical submission cutoff is **September 21, 2026 (UTC+8)**. The landing page and handbook timeline show public voting on September 22–28 and winners on October 8. Some handbook prize text describes judge review through October 7; that is an evaluation-window detail, not a later submission deadline.

## Recommended track

**AI Trading Desk → Information Extraction & Signal Generation.** Postbell is a research desk for tokenized US stocks. It watches the overnight tape, extracts the signal from market context and events, and gives the trader a decision-ready morning brief. The product presents analysis and scenarios; it does not place trades.

This is the strongest fit because the handbook defines AI Trading Desk as a human-in-the-loop research workbench, and this sub-theme asks how AI processes unstructured information into signals. The adjacent Decision Stress Testing theme is a useful secondary feature, but the form should use one primary sub-theme for this entry.

## Project description

Postbell turns thin overnight markets into a sourced morning brief. It combines Bitget rToken ticker data, an event timeline, market context, and explicit scenarios for instruments such as rNVDA, rTSLA, and rQQQ. The interface is designed for the first five minutes of a trading day: what moved, what likely caused it, what is confirmed, and what would invalidate the read.

## Current proof

- Local demo: http://localhost:4040/postbell.html
- API brief: http://localhost:4040/api/postbell/brief
- Market endpoint: http://localhost:4040/api/postbell/market?symbol=rNVDA
- Night Tape endpoint: http://localhost:4040/api/postbell/night-tape?symbol=rNVDA
- Analysis endpoint: http://localhost:4040/api/postbell/analysis?symbol=rNVDA
- Desktop screenshot: `docs/submission/postbell-desktop.png` (confirm before upload)
- Mobile screenshot: `docs/submission/postbell-mobile.png` (confirm before upload)
- Repository: https://github.com/Nifemi0/postbell
- Public demo: https://nexustrader-mcp.vercel.app/
- Demo video: `postbell-demo-premium.mp4` (58 seconds; final upload asset)

## What the handbook requires for this track

- An accessible demo.
- One complete research task shown end to end: a question, the evidence and tool flow, and an actionable insight.
- A project description that covers thesis, target user/value, validation data and metrics, progress, deliverables, and the project's view of AI trading.
- A separate explanation of what the LLM actually does and which models were used.
- A submission materials link containing the demo plus any code, screenshots, logs, or recording.
- A compliant X promotional post that includes `#BitgetHackathon`, mentions `@Bitget_AI`, and introduces Postbell: https://x.com/Love_Light_11/status/2099267855581589715

The AI Trading Desk track is judged subjectively on feature depth, data/skill integration and effectiveness, research quality, natural-language interface fluency, and the strength of the personalized thesis. This means the demo story and evidence quality matter more for Postbell than pretending it is an autonomous trading agent.

## Submission checklist

### Hard requirements

- [ ] Register with a Bitget account and record the exact UID used for registration.
- [ ] Choose **AI Trading Desk** and the primary sub-theme **Information insights and signal generation**.
- [ ] Publish a public GitHub repository with a complete README and no login requirement.
- [ ] Provide a publicly accessible demo link, or provide reproducible local-run instructions in the README.
- [ ] State the product thesis clearly: Postbell turns overnight rToken movement into an evidence-linked morning decision brief.
- [ ] Show one complete, reproducible research task from question to evidence to decision.
- [ ] Include the Bitget data integration, AI model role, validation data, metrics, deliverables, and current limitations in the description.

### Strongly recommended proof

- [ ] Attach the desktop and mobile screenshots in `docs/submission/`.
- [ ] Capture a short demo video, maximum three minutes, covering the full research flow.
- [ ] Include a usage record or API log with timestamps showing the brief and AI response running.
- [x] Publish a qualifying X post that tags `@Bitget_AI` and `#BitgetHackathon`: https://x.com/Love_Light_11/status/2099267855581589715
- [ ] Keep the local `data/` folder, API keys, `.env` files, and personal runtime state out of the public repository.

### Final form pass

- [ ] Replace the repository and demo placeholders with public URLs.
- [ ] Add the Bitget UID and team/member details exactly as registered.
- [ ] Add the final X post URL and demo video URL, if used.
- [ ] Submit through the official Bitget form before **September 21, 2026 (UTC+8)**.

## Accuracy notes

- The live adapter reads Bitget's public ticker and 1-hour candlestick endpoints for `rNVDAUSDT`, `rTSLAUSDT`, and `rQQQUSDT`.
- Connected DeepSeek performs the final natural-language research synthesis. Postbell passes only the normalized market observations and evidence statuses to the model.
- Research fails clearly when no model is connected; it does not present deterministic synthesis as an AI answer.
- The current regular-session reference is labeled as a **Bitget 24h open proxy**. It is not presented as a verified exchange close.
- If Bitget is unavailable, the API returns explicitly labeled representative fixture data so the demo remains inspectable.
- A general news feed and options-specific analytics are not included; claims stay limited to Bitget observations and SEC filing status.

## What remains before submission

The product, public repository, public demo, demo video, and qualifying X post are ready. The remaining submission actions are account and form items: record the Bitget UID and paste the final links and team details into the official form.

## Simple demo recording plan (90 seconds)

1. Start on the landing page and say: “Postbell watches Bitget tokenized stocks overnight and prepares an evidence-linked brief before the US open.”
2. Open **Morning Brief** and point to the live Bitget timestamp, rNVDA chart, and peer watchlist.
3. Ask: “What moved in the overnight rToken tape, and what should I watch at the open?”
4. Show the AI response, then scroll through Detect, Connect, Decide, and the evidence links.
5. Open **Night Tape** to show the timestamped event sequence.
6. End on the sentence: “Postbell keeps the catalyst separate from the market signal, so the trader knows what is confirmed and what still needs proof.”

Record this in one take with the browser at a readable zoom. No intro animation, voice-over editing, or music is required.
