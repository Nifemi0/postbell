# Postbell Admin

The private admin dashboard is available at `/postbell-admin.html`. It reports anonymous product activity:

- unique browsers and sessions
- people active in the last 15 minutes
- page views and top pages
- AI research runs, completion rate, and average response time
- model-provider activity
- recent product events

Postbell does not send research questions, model API keys, saved research, watch settings, email addresses, positions, or account data to analytics. A random browser identifier is stored locally so repeat page views can be counted as one anonymous visitor. It is not an authenticated user account.

## Production configuration

Set `POSTBELL_ADMIN_KEY` in the deployment environment. The dashboard sends it as a bearer credential and keeps it in the current browser tab only.

For durable analytics, connect an Upstash Redis store and provide either of these environment-variable pairs:

- `KV_REST_API_URL` and `KV_REST_API_TOKEN`
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

Without Redis, analytics remain available only within the active server process and can reset when the deployment runtime restarts.

## Retention and access

Daily aggregates expire after 35 days. The dashboard displays a seven-day trend and the 30 most recent non-heartbeat events. Rotate the admin key by replacing `POSTBELL_ADMIN_KEY` and redeploying.
