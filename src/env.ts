import type { TonalSession } from "./session.js";

export interface Env {
  TONAL_USERNAME: string;
  TONAL_PASSWORD: string;
  MCP_BEARER: string;
  TONAL_SESSION: DurableObjectNamespace<TonalSession>;
}

let current: Env;
export const setEnv = (value: Env) => { current = value; };
export const env = () => current;
