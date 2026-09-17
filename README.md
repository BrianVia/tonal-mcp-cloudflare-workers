# tonal-mcp-cloudflare-workers

A remote [Model Context Protocol](https://modelcontextprotocol.io/) server for one Tonal account, hosted on Cloudflare Workers. It reads workout history (including per-set weights), muscle readiness, strength scores, and lifetime stats through Tonal’s unofficial Auth0 + REST APIs.

One Worker serves a bearer-protected, stateless `/mcp` endpoint. A Durable Object owns Auth0 tokens (password grant + refresh), the user id, and a cached movement catalog.

## Setup

```sh
npm install
npx wrangler login
cp wrangler.jsonc wrangler.local.jsonc
```

In `wrangler.local.jsonc`, replace `tonal.example.com` with a hostname on a Cloudflare zone you manage. Deploy using that local config:

```sh
WRANGLER_CONFIG=wrangler.local.jsonc npm run deploy
npx wrangler secret put TONAL_USERNAME --config wrangler.local.jsonc
npx wrangler secret put TONAL_PASSWORD --config wrangler.local.jsonc
openssl rand -hex 32 | tee /dev/stderr | npx wrangler secret put MCP_BEARER --config wrangler.local.jsonc
```

The custom-domain route creates its DNS record on first deploy.

## Tools

| Tool | Description |
|---|---|
| `get_recent_workouts` | Recent completed workouts (name, volume, reps, duration, target area) |
| `list_workout_activities` | Paginated workout activities (API oldest-first; page re-sorted newest-first) |
| `get_workout_activity_details` | One workout with every set: movement name, reps, avg weight (lbs), 1RM, volume |
| `get_workout_summary` | Tonal formatted summary (coach, target area, per-movement volume) |
| `get_user_stats` | Lifetime statistics + current streak |
| `get_muscle_readiness` | Current muscle-group readiness percentages |
| `get_strength_scores` | Current strength scores by body region |
| `search_movements` | Search the movement catalog by name / muscle / region |

Read-only. Volumes are pounds.

## Raw HTTP

The endpoint uses stateless Streamable HTTP and returns SSE-framed MCP responses.

```sh
curl -s https://tonal.example.com/mcp -X POST \
  -H 'Authorization: Bearer <MCP_BEARER>' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

`GET /` identifies the MCP endpoint. `GET /health` is public and reports whether the Durable Object has tokens without making a network request.

## Local development

```sh
cp .dev.vars.example .dev.vars
npm run check
npx wrangler dev
```

## Notes

- Authentication uses Tonal’s public Auth0 client and password grant. The API expects the Auth0 **id_token** as `Authorization: Bearer`. This is unofficial and may break if Tonal changes that flow.
- No browser authorization is needed.
- Credentials are Worker secrets and are sent only to Tonal’s Auth0 token endpoint and `api.tonal.com`.
- `/mcp` requires `MCP_BEARER`; `/` and `/health` are public.
- The Node `@dlwiest/ts-tonal-client` package is intentionally **not** used (it depends on `fs`/`os`/`path`/`Buffer`); the Worker ports the Auth0 + REST calls directly.

## License

MIT. See [LICENSE](LICENSE).
