/**
 * 🌀 AERO — polish. Headers, content-types, caching, CORS, the human page.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { call, rpc, CARD_PATH } from "./_helpers.mjs";

test("🌀 card is application/json", async () => {
  const res = await call(CARD_PATH);
  assert.match(res.headers.get("content-type") || "", /application\/json/);
});

test("🌀 card sets a cache-control (near-static)", async () => {
  const res = await call(CARD_PATH);
  assert.match(res.headers.get("cache-control") || "", /max-age=\d+/);
});

test("🌀 CORS allow-origin present on JSON responses", async () => {
  const res = await call(CARD_PATH);
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
});

test("🌀 error responses are still JSON + CORS", async () => {
  const res = await call("/mcp", rpc("nope", null, 9));
  assert.match(res.headers.get("content-type") || "", /application\/json/);
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
});

test("🌀 landing page is HTML and shows curl receipts", async () => {
  const res = await call("/");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") || "", /text\/html/);
  const html = await res.text();
  assert.match(html, /curl/);
  assert.match(html, /server-card/);
});

test("🌀 landing references the live /mcp endpoint", async () => {
  const html = await (await call("/")).text();
  assert.match(html, /\/mcp/);
});
