/**
 * ENGINE — core correctness. Routes, JSON-RPC, negotiation, host derivation.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  call, rpc, card, init, catalog,
  PROTO, CARD_PATH, CARD_PATH_LEGACY, CATALOG_PATH, CARD_MEDIA,
} from "./_helpers.mjs";

test("Engine · GET card at reserved /mcp/server-card → 200 + correct name", async () => {
  const res = await call(CARD_PATH);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).name, "one.faf/context");
});

test("Engine · card served as application/mcp-server-card+json (#22 media type)", async () => {
  const res = await call(CARD_PATH);
  assert.match(res.headers.get("content-type") || "", new RegExp(CARD_MEDIA.replace("+", "\\+")));
});

test("Engine · legacy /.well-known/mcp/server-card still serves (back-compat)", async () => {
  const res = await call(CARD_PATH_LEGACY);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).name, "one.faf/context");
});

test("Engine · GET /.well-known/project.faf → 200, the .faf context", async () => {
  const res = await call("/.well-known/project.faf");
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /^faf_version:/);
  assert.match(body, /app_type: server-card/);
});

test("Engine · /project.faf short path also serves", async () => {
  assert.equal((await call("/project.faf")).status, 200);
});

test("Engine · Catalog at /.well-known/mcp/catalog.json → entry points at the card", async () => {
  const c = await catalog("tenant.example.dev");
  assert.equal(c.specVersion, "draft");
  const e = c.entries[0];
  assert.equal(e.identifier, "urn:mcp:server:one.faf/context");
  assert.equal(e.mediaType, CARD_MEDIA);
  assert.equal(e.url, "https://tenant.example.dev/mcp/server-card");
});

test("Engine · POST /validate — conformant card → conformant:true, no errors", async () => {
  const c = await card();
  const j = await call("/validate", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(c),
  }).then((r) => r.json());
  assert.equal(j.conformant, true);
  assert.deepEqual(j.errors, []);
});

test("Engine · POST /validate — non-conformant card → conformant:false + errors", async () => {
  const j = await call("/validate", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "no-slash" }),
  }).then((r) => r.json());
  assert.equal(j.conformant, false);
  assert.ok(j.errors.length > 0);
});

test("Engine · GET /validate (no input) → usage hint", async () => {
  const j = await call("/validate").then((r) => r.json());
  assert.match(j.usage || "", /url=/);
});

test("Engine · initialize → serverInfo + capabilities + protocolVersion", async () => {
  const r = await init({ protocolVersion: PROTO });
  assert.equal(r.jsonrpc, "2.0");
  assert.equal(r.id, 1);
  assert.equal(r.result.serverInfo.name, "one.faf/context");
  assert.deepEqual(r.result.capabilities, {});
  assert.equal(r.result.protocolVersion, PROTO);
});

test("Engine · initialize with unknown version → falls back to supported", async () => {
  const r = await init({ protocolVersion: "1999-01-01" });
  assert.equal(r.result.protocolVersion, PROTO);
});

test("Engine · initialize with no params → still negotiates", async () => {
  const r = await call("/mcp", rpc("initialize")).then((x) => x.json());
  assert.equal(r.result.protocolVersion, PROTO);
});

test("Engine · ping → empty result", async () => {
  const r = await call("/mcp", rpc("ping", null, 2)).then((x) => x.json());
  assert.deepEqual(r.result, {});
  assert.equal(r.id, 2);
});

test("Engine · notifications/initialized → 202, no body", async () => {
  const res = await call("/mcp", rpc("notifications/initialized"));
  assert.equal(res.status, 202);
});

test("Engine · unknown method → -32601 with name in message", async () => {
  const r = await call("/mcp", rpc("tools/list", null, 3)).then((x) => x.json());
  assert.equal(r.error.code, -32601);
  assert.match(r.error.message, /tools\/list/);
});

test("Engine · remote URL is derived from the request host", async () => {
  const c = await card("tenant.example.dev");
  assert.equal(c.remotes[0].url, "https://tenant.example.dev/mcp");
});

test("Engine · OPTIONS preflight → CORS, no body", async () => {
  const res = await call("/mcp", { method: "OPTIONS" });
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
  assert.match(res.headers.get("access-control-allow-methods") || "", /POST/);
});

test("Engine · GET /mcp (wrong method) → not served as RPC", async () => {
  const res = await call("/mcp", { method: "GET" });
  assert.equal(res.status, 404); // only POST handled; falls through
});

test("Engine · unknown path → 404 JSON", async () => {
  const res = await call("/nope");
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, "not found");
});
