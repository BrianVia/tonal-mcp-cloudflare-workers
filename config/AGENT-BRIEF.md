# Tonal — agent briefing

Brian’s Tonal strength data is available over MCP at `https://tonal.brianvia.com/mcp`.
Read-only: workout history, per-set weights, readiness, strength scores, stats.

## Auth

Static bearer. **Not in this file.** Get it from:

- Claude Code on via-halo: the `tonal` MCP server is registered at user scope — just use it.
- Other agents on via-halo: `node -e 'process.stdout.write(require(process.env.HOME+"/.config/tonal-mcp/setup-secrets.json").MCP_BEARER)'`
- Anywhere else: ask Brian for `MCP_BEARER`. Never paste it into chat, logs, or Notion.

Header: `Authorization: Bearer <MCP_BEARER>`. Missing/wrong → 401.
`GET https://tonal.brianvia.com/health` (no auth) → `{"ok":true,"authorized":…,"expiresAt":…,"userId":…}`.

## Tools (8)

| Tool | Args | Use |
|---|---|---|
| `get_recent_workouts` | `limit?` | **Start here.** Recent completed workouts with volume/reps/duration. |
| `list_workout_activities` | `offset?`, `limit?` | Paginate older history (API offset 0 = oldest). |
| `get_workout_activity_details` | `activity_id` | Per-set movement names + weights (lbs) + reps. |
| `get_workout_summary` | `activity_id` | Formatted summary with coach / movement breakdown. |
| `get_user_stats` | — | Lifetime stats + streak. |
| `get_muscle_readiness` | — | Muscle-group readiness %. |
| `get_strength_scores` | — | Current strength scores by region. |
| `search_movements` | `query`, `limit?` | Catalog lookup. |

## Gotchas

- Volumes are pounds.
- `list_workout_activities` API pages are oldest-first; the tool re-sorts within a page.
- Prefer `get_recent_workouts` for “what did I do lately?”
- Auth uses Tonal’s unofficial Auth0 password grant; tokens live in a Durable Object.

## Raw HTTP (no MCP client)

```sh
curl -s https://tonal.brianvia.com/mcp -X POST -H "Authorization: Bearer $MCP_BEARER" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_recent_workouts","arguments":{"limit":5}}}'
```
Response is SSE-framed: strip `data: `, parse JSON, read `result.content[0].text`. Text starting with `Error:` means the tool failed.

## Register in a client

- Claude Code: `claude mcp add -s user --transport http tonal https://tonal.brianvia.com/mcp --header "Authorization: Bearer $MCP_BEARER"`
- Any other MCP client: HTTP transport, same URL, same header.

Source: `~/Development/Personal/tonal-mcp-cloudflare-workers` · https://github.com/BrianVia/tonal-mcp-cloudflare-workers
