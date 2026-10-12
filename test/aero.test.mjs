/**
 * AERO — polish. Headers, content-types, caching, CORS, the human page.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { call, rpc, CARD_PATH, CATALOG_PATH, CARD_MEDIA } from "./_helpers.mjs";

test("Aero · card is application/mcp-server-card+json", async () => {
  const res = await call(CARD_PATH);
  assert.match(res.headers.get("content-type") || "", new RegExp(CARD_MEDIA.replace("+", "\\+")));
});

test("Aero · catalog is application/json", async () => {
  const res = await call(CATALOG_PATH);
  assert.match(res.headers.get("content-type") || "", /application\/json/);
});

test("Aero · .faf served as application/vnd.faf+yaml", async () => {
  const res = await call("/.well-known/project.faf");
  assert.match(res.headers.get("content-type") || "", /application\/vnd\.faf\+yaml/);
});

test("Aero · card sets a cache-control (near-static)", async () => {
  const res = await call(CARD_PATH);
  assert.match(res.headers.get("cache-control") || "", /max-age=\d+/);
});

test("Aero · CORS allow-origin present on JSON responses", async () => {
  const res = await call(CARD_PATH);
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
});

test("Aero · error responses are still JSON + CORS", async () => {
  const res = await call("/mcp", rpc("nope", null, 9));
  assert.match(res.headers.get("content-type") || "", /application\/json/);
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
});

test("Aero · landing page is HTML and shows curl receipts", async () => {
  const res = await call("/");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") || "", /text\/html/);
  const html = await res.text();
  assert.match(html, /curl/);
  assert.match(html, /server-card/);
});

test("Aero · landing references the live /mcp endpoint", async () => {
  const html = await (await call("/")).text();
  assert.match(html, /\/mcp/);
});

test("Aero · card CORS: If-None-Match allowed in preflight, ETag exposed (discovery.md § CORS Requirements)", async () => {
  const pre = await call(CARD_PATH, { method: "OPTIONS", headers: { "Access-Control-Request-Headers": "if-none-match" } });
  assert.match(pre.headers.get("access-control-allow-methods") || "", /\bGET\b/);
  assert.match(pre.headers.get("access-control-allow-headers") || "", /if-none-match/i);
  assert.match(pre.headers.get("access-control-allow-headers") || "", /content-type/i);
  const res = await call(CARD_PATH);
  assert.match(res.headers.get("access-control-expose-headers") || "", /\betag\b/i);
});

test("Aero · card ETag is weak and stable across requests; If-None-Match gets 304 (§ Caching)", async () => {
  const a = await call(CARD_PATH);
  const b = await call(CARD_PATH);
  const etag = a.headers.get("etag") || "";
  assert.match(etag, /^W\/"[0-9a-f]{32}"$/);
  assert.equal(b.headers.get("etag"), etag); // generated_at differs, the validator doesn't
  const again = await call(CARD_PATH, { headers: { "If-None-Match": etag } });
  assert.equal(again.status, 304);
  assert.equal(again.headers.get("etag"), etag);
  const stale = await call(CARD_PATH, { headers: { "If-None-Match": 'W/"0000"' } });
  assert.equal(stale.status, 200);
});
