/**
 * Shared WJTTC harness. Not a test file itself (no test() calls).
 * Drives the Worker's fetch handler with web-standard primitives — the same
 * Request/Response/URL the Workers runtime provides — so no deploy is needed
 * for Brake / Engine / Aero tiers.
 */
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import worker from "../src/index.js";

export { buildServerCard, fafContext } from "../src/card.js";

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, "..");
export const SCHEMA_ID =
  "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json";
export const MEDIA_TYPE = "application/vnd.faf+yaml"; // the FAF context artifact
export const CARD_MEDIA = "application/mcp-server-card+json"; // the card's own media type
export const PROTO = "2025-11-25";
export const CARD_PATH = "/mcp/server-card"; // reserved default (post #22)
export const CARD_PATH_LEGACY = "/.well-known/mcp/server-card"; // back-compat
export const CATALOG_PATH = "/.well-known/mcp/catalog.json";

/** Compile a validator bound to MCP's own ServerCard definition. */
export function serverCardValidator() {
  const schema = JSON.parse(
    readFileSync(join(ROOT, "schema/server-card.schema.json"), "utf8"),
  );
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  ajv.addSchema(schema, SCHEMA_ID);
  const v = ajv.getSchema(`${SCHEMA_ID}#/$defs/ServerCard`);
  if (!v) throw new Error("could not resolve #/$defs/ServerCard");
  return v;
}

/** Call the worker. host is configurable to test host-derivation. */
export function call(path, init, host = "card.faf.one") {
  return worker.fetch(new Request(`https://${host}${path}`, init), {}, {});
}

/** Build a JSON-RPC POST init object. */
export function rpc(method, params, id = 1) {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      ...(params ? { params } : {}),
    }),
  };
}

export const card = (host) => call(CARD_PATH, undefined, host).then((r) => r.json());
export const catalog = (host) => call(CATALOG_PATH, undefined, host).then((r) => r.json());
export const init = (params, host) =>
  call("/mcp", rpc("initialize", params), host).then((r) => r.json());
