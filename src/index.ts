import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono } from "hono";
import { env, setEnv, type Env } from "./env.js";
import { createMcpServer } from "./mcp.js";
import { TonalSession } from "./session.js";

const app = new Hono<{ Bindings: Env }>();
const same = async (actual: string | undefined, expected: string): Promise<boolean> => {
  if (actual === undefined) return false;
  const encoder = new TextEncoder(), a = encoder.encode(actual), b = encoder.encode(expected);
  const subtle = crypto.subtle as SubtleCrypto & { timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): boolean };
  return a.byteLength === b.byteLength && subtle.timingSafeEqual(a, b);
};
const bearer = (header: string | undefined) => header?.startsWith("Bearer ") ? header.slice(7) : undefined;

app.get("/", (c) => c.text("tonal-mcp — MCP endpoint: /mcp"));
app.get("/health", async (c) => {
  setEnv(c.env);
  return c.json({ ok: true, ...await env().TONAL_SESSION.getByName("owner").status() });
});
app.all("/mcp", async (c) => {
  setEnv(c.env);
  if (!await same(bearer(c.req.header("Authorization")), c.env.MCP_BEARER)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = await createMcpServer();
  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});

export { TonalSession };
export default app;
