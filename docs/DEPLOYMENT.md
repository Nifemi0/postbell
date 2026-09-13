# Postbell deployment

## Local run

```text
npm install
npm run build
npm start
```

Open `http://localhost:4040/postbell.html`.

## Environment

Postbell uses Bitget public market endpoints by default. Optional variables:

- `PORT` — HTTP port, default `4040`
- `POSTBELL_BITGET_URL` — read-only Bitget proxy endpoint
- `POSTBELL_LLM_BASE_URL`, `POSTBELL_LLM_MODEL`, `POSTBELL_LLM_API_KEY`, `POSTBELL_LLM_PROVIDER` — server-managed AI provider configuration

Never commit `.env` files or the `data/` directory. The data directory contains local watch state and connection state for a local workspace.

## Vercel note

The current app is an Express server with a local JSON runtime store. A Vercel deployment can serve the UI and read-only routes, but persistent multi-user connections require a database and encrypted secret storage. For the hackathon demo, use a public read-only deployment with provider credentials configured as Vercel environment variables, or keep AI provider keys in the local Model Settings flow.
