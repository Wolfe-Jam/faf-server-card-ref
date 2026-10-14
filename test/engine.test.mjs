/**
 * ENGINE — core correctness. Routes, JSON-RPC, negotiation, host derivation.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { call, rpc, card, init, catalog, PROTO, CARD_PATH, CARD_PATH_LEGACY, CATALOG_PATH, CARD_MEDIA, modern } from "./_helpers.mjs";

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
  assert.equal(e.identifier, "urn:air:faf.one:mcp:context"); // discovery.md urn:air:{publisher}:{ns}:{name}
  assert.equal(e.type, CARD_MEDIA); // ADR 0014: CatalogEntry field renamed mediaType -> type
  assert.equal(e.displayName, undefined); // #39: displayName dropped from Catalog entries
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

// ── 2026-07-28: per-request `_meta`, server/discover (streamable-http § Protocol Version Header,
//    § Server Validation; server/discover "Servers MUST implement it") ──────────────────────────
test("Engine · server/discover answers with versions, identity and the FAF context", async () => {
  const res = await call("/mcp", modern("server/discover"));
  assert.equal(res.status, 200);
  const { result } = await res.json();
  assert.equal(result.resultType, "complete");
  assert.deepEqual(result.supportedVersions, ["2026-07-28", "2025-11-25"]);
  assert.deepEqual(result.capabilities, {});
  const info = result._meta["io.modelcontextprotocol/serverInfo"];
  assert.equal(info.name, (await card()).name, "serverInfo.name equals the card's name");
  assert.equal(info.version, (await card()).version);
  assert.ok(result._meta["one.faf/context"], "same FAF context the card carries");
});

test("Engine · the card's versions don't contradict server/discover", async () => {
  const listed = (await card()).remotes[0].supportedProtocolVersions;
  const { result } = await call("/mcp", modern("server/discover")).then((r) => r.json());
  for (const v of listed) assert.ok(result.supportedVersions.includes(v), `card lists ${v}`);
});

test("Engine · 2026-07-28 ping returns a complete result", async () => {
  const r = await call("/mcp", modern("ping")).then((x) => x.json());
  assert.deepEqual(r.result, { resultType: "complete" });
});

test("Engine · missing MCP-Protocol-Version or Mcp-Method → 400 HeaderMismatch (-32020)", async () => {
  for (const drop of ["mcp-protocol-version", "mcp-method"]) {
    const init = modern("server/discover");
    delete init.headers[drop];
    const res = await call("/mcp", init);
    assert.equal(res.status, 400, drop);
    assert.equal((await res.json()).error.code, -32020, drop);
  }
});

test("Engine · header values that don't match the body → 400 HeaderMismatch (-32020)", async () => {
  const wrongVersion = await call("/mcp", modern("server/discover", "2026-07-28", { headers: { "mcp-protocol-version": "2025-11-25" } }));
  assert.equal(wrongVersion.status, 400);
  assert.equal((await wrongVersion.json()).error.code, -32020);
  const wrongMethod = await call("/mcp", modern("server/discover", "2026-07-28", { headers: { "mcp-method": "ping" } }));
  assert.equal(wrongMethod.status, 400);
  assert.equal((await wrongMethod.json()).error.code, -32020);
});

test("Engine · an unsupported version → 400 UnsupportedProtocolVersionError (-32022) listing ours", async () => {
  const res = await call("/mcp", modern("server/discover", "1900-01-01"));
  assert.equal(res.status, 400);
  const { error } = await res.json();
  assert.equal(error.code, -32022);
  assert.deepEqual(error.data, { supported: ["2026-07-28", "2025-11-25"], requested: "1900-01-01" });
});

test("Engine · an unknown 2026-07-28 method → 404 with -32601", async () => {
  const res = await call("/mcp", modern("tools/list"));
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, -32601);
});

test("Engine · the legacy initialize handshake is unchanged", async () => {
  const r = await call("/mcp", rpc("initialize", { protocolVersion: "2025-11-25" })).then((x) => x.json());
  assert.equal(r.result.protocolVersion, "2025-11-25");
  assert.equal(r.result.serverInfo.name, (await card()).name);
});

test("Engine · CORS lets browser clients send the 2026-07-28 headers", async () => {
  const res = await call("/mcp", { method: "OPTIONS", headers: { origin: "https://x.example", "access-control-request-method": "POST" } });
  const allowed = (res.headers.get("access-control-allow-headers") || "").toLowerCase();
  for (const h of ["mcp-protocol-version", "mcp-method", "mcp-name"]) assert.ok(allowed.includes(h), h);
});
