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

The current app is an Express server deployed through a Vercel function. Model connection profiles stay in each user's browser and are sent only with the provider requests that user starts. Postbell does not write provider credentials to its filesystem or database. A server-managed shared provider can still be configured through Vercel environment variables when required.
