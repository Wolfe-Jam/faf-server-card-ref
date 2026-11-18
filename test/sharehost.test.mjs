// Shared host: with a PAGE service bound, the card keeps every path it owns
// and hands the rest to the repo-to-context page. Without it, nothing changes.
import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { CARD_PATH, CARD_PATH_LEGACY, CATALOG_PATH, rpc } from "./_helpers.mjs";

const seen = [];
const env = {
  PAGE: {
    fetch: async (req) => {
      seen.push(new URL(req.url).pathname);
      return new Response("page", { headers: { "x-from": "page" } });
    },
  },
};
const callBound = (path, init) =>
  worker.fetch(new Request(`https://context.faf.one${path}`, init), env, {});

test("Share · / and the page's routes go to the page", async () => {
  for (const p of ["/", "/email", "/api/context", "/anything-else"]) {
    const res = await callBound(p);
    assert.equal(res.headers.get("x-from"), "page", p);
  }
});

test("Share · the card's own paths never go to the page", async () => {
  seen.length = 0;
  for (const p of [CARD_PATH, CARD_PATH_LEGACY, CATALOG_PATH, "/.well-known/project.faf", "/project.faf", "/validate", "/card", "/card/version"]) {
    const res = await callBound(p);
    assert.notEqual(res.headers.get("x-from"), "page", p);
    assert.equal(res.status, 200, p);
  }
  const mcp = await callBound("/mcp", rpc("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "t", version: "0" } }));
  assert.notEqual(mcp.headers.get("x-from"), "page");
  const getMcp = await callBound("/mcp"); // GET /mcp stays the card's 404
  assert.equal(getMcp.status, 404);
  const unknownWellKnown = await callBound("/.well-known/nope");
  assert.equal(unknownWellKnown.status, 404);
  assert.deepEqual(seen, []);
});

test("Share · the explainer moves to /card", async () => {
  const res = await callBound("/card");
  assert.match(res.headers.get("content-type"), /text\/html/);
  assert.match(await res.text(), /\/mcp/);
});

test("Share · no binding = the card serves / as before", async () => {
  const res = await worker.fetch(new Request("https://context.faf.one/"), {}, {});
  assert.match(res.headers.get("content-type"), /text\/html/);
  const nf = await worker.fetch(new Request("https://context.faf.one/anything-else"), {}, {});
  assert.equal(nf.status, 404);
});

test("Share · /card/version names the live commit, null when not stamped", async () => {
  assert.deepEqual(await (await worker.fetch(new Request("https://context.faf.one/card/version"), { GIT_SHA: "abc123" }, {})).json(), { commit: "abc123" });
  assert.deepEqual(await (await callBound("/card/version")).json(), { commit: null });
});
