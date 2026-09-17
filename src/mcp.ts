import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { env } from "./env.js";
import {
  detailActivity,
  filterMovements,
  summarizeActivities,
  summarizeActivityList,
  summarizeFormattedWorkout,
} from "./tonal.js";

const output = (value: unknown, isError = false) => ({
  isError,
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const run = async (op: () => Promise<unknown>) => {
  try { return output(await op()); }
  catch (error) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
    };
  }
};

const session = () => env().TONAL_SESSION.getByName("owner");

export async function createMcpServer(): Promise<McpServer> {
  const server = new McpServer({ name: "tonal-mcp", version: "0.1.0" }, {
    instructions:
      "Unofficial read-only Tonal fitness MCP for one account. Prefer get_recent_workouts, then get_workout_activity_details for per-set weights/reps. Volumes are pounds.",
  });

  server.tool(
    "get_recent_workouts",
    "List recent completed workouts with name, volume, reps, duration, and target area (newest first).",
    { limit: z.number().int().min(1).max(100).optional().describe("Max workouts to return (default 10)") },
    ({ limit }) => run(async () => {
      const s = session();
      const userId = await s.getUserId();
      const raw = await s.api(`/users/${userId}/activity-summaries`) as unknown[];
      const all = summarizeActivities(Array.isArray(raw) ? raw : []);
      all.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
      return all.slice(0, limit ?? 10);
    }),
  );

  server.tool(
    "list_workout_activities",
    "Page through completed workout activities (API is oldest-first; this tool re-sorts each page newest-first). Prefer get_recent_workouts for recent history.",
    {
      offset: z.number().int().min(0).optional().describe("API offset (default 0 = oldest page)"),
      limit: z.number().int().min(1).max(100).optional().describe("Page size (default 20, max 100)"),
    },
    ({ offset, limit }) => run(async () => {
      const s = session();
      const userId = await s.getUserId();
      const off = offset ?? 0;
      const lim = limit ?? 20;
      const raw = await s.api(`/users/${userId}/workout-activities`, {
        headers: { "pg-offset": String(off), "pg-limit": String(lim) },
      }) as unknown[];
      const page = summarizeActivityList(Array.isArray(raw) ? raw : []);
      page.sort((a, b) => Date.parse(b.beginTime) - Date.parse(a.beginTime));
      return {
        offset: off,
        limit: lim,
        count: page.length,
        nextOffset: page.length === lim ? off + lim : null,
        activities: page,
      };
    }),
  );

  server.tool(
    "get_workout_activity_details",
    "Get one completed workout with every performed set: movement name, reps, average weight (lbs), and volume. Use activity id from get_recent_workouts or list_workout_activities.",
    { activity_id: z.string().min(1).describe("Workout activity id") },
    ({ activity_id }) => run(async () => {
      const s = session();
      const [userId, movements] = await Promise.all([s.getUserId(), s.getMovements()]);
      const names = new Map(movements.map((m) => [m.id, m.name]));
      const raw = await s.api(
        `/users/${userId}/workout-activities/${encodeURIComponent(activity_id)}`,
      ) as Record<string, unknown>;
      return detailActivity(raw ?? {}, names);
    }),
  );

  server.tool(
    "get_workout_summary",
    "Get Tonal's formatted workout summary (coach, target area, per-movement volume).",
    { activity_id: z.string().min(1).describe("Workout activity id") },
    ({ activity_id }) => run(async () => {
      const s = session();
      const userId = await s.getUserId();
      const raw = await s.api(
        `/users/${userId}/workout-summaries/${encodeURIComponent(activity_id)}`,
      ) as Record<string, unknown>;
      return summarizeFormattedWorkout(raw ?? {});
    }),
  );

  server.tool(
    "get_user_stats",
    "Lifetime volume/workout statistics plus current streak.",
    {},
    () => run(async () => {
      const s = session();
      const userId = await s.getUserId();
      const statistics = await s.api(`/users/${userId}/statistics`);
      let streak: unknown = null;
      try { streak = await s.api(`/users/${userId}/streaks/current`); } catch { /* optional */ }
      return { statistics, streak };
    }),
  );

  server.tool(
    "get_muscle_readiness",
    "Current muscle-group readiness percentages (0–100) for recovery planning.",
    {},
    () => run(async () => {
      const s = session();
      const userId = await s.getUserId();
      return s.api(`/users/${userId}/muscle-readiness/current`);
    }),
  );

  server.tool(
    "get_strength_scores",
    "Current strength scores by body region (Overall / Upper / Lower / Core).",
    {},
    () => run(async () => {
      const s = session();
      const userId = await s.getUserId();
      return s.api(`/users/${userId}/strength-scores/current`);
    }),
  );

  server.tool(
    "search_movements",
    "Search the Tonal movement catalog by name, muscle group, or body region.",
    {
      query: z.string().min(1).describe("Substring to match against movement name/muscles"),
      limit: z.number().int().min(1).max(100).optional().describe("Max results (default 25)"),
    },
    ({ query, limit }) => run(async () => filterMovements(await session().getMovements(), query, limit ?? 25)),
  );

  return server;
}
