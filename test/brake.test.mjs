/**
 * 🛡️ BRAKE — must-never-fail. If any of these go red, the artifact lies.
 * Schema conformance · card↔runtime parity · honest-first · don't-lie · IANA exactness.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  serverCardValidator,
  call,
  rpc,
  card,
  init,
  buildServerCard,
  MEDIA_TYPE,
  PROTO,
  CARD_PATH,
} from "./_helpers.mjs";

const validate = serverCardValidator();

test("🛡️ static card conforms to MCP's own schema (2020-12)", () => {
  const c = buildServerCard("card.faf.one", "2026-06-08T00:00:00Z");
  assert.ok(validate(c), JSON.stringify(validate.errors, null, 2));
});

test("🛡️ served card conforms (live handler output)", async () => {
  assert.ok(validate(await card()), JSON.stringify(validate.errors, null, 2));
});

test("🛡️ card↔runtime _meta parity (SEP-2127 #23)", async () => {
  const fromCard = (await card())._meta["one.faf/context"];
  const fromRuntime = (await init({ protocolVersion: PROTO })).result._meta[
    "one.faf/context"
  ];
  const strip = ({ generated, ...rest }) => rest; // timestamp is per-request
  assert.deepEqual(
    strip(fromCard),
    strip(fromRuntime),
    "the card must not contradict the running server",
  );
});

test("🛡️ honest-first: every advertised protocol is actually answered", async () => {
  const advertised = (await card()).remotes[0].supportedProtocolVersions;
  assert.ok(advertised.length > 0);
  for (const v of advertised) {
    const r = await init({ protocolVersion: v });
    assert.equal(r.result.protocolVersion, v, `advertised ${v} must be answered`);
  }
});

test("🛡️ FAF don't lie: no baked score or tier, computation is linked", async () => {
  const ctx = (await card())._meta["one.faf/context"];
  assert.equal(ctx.score, undefined, "must not bake a score number");
  assert.equal(ctx.tier, undefined, "must not bake a tier");
  assert.equal(ctx.deterministic, true);
  assert.equal(typeof ctx.scoreEndpoint, "string");
});

test("🛡️ IANA media type is exact", async () => {
  const ctx = (await card())._meta["one.faf/context"];
  assert.equal(ctx.mediaType, MEDIA_TYPE);
});

test("🛡️ identity fields are static — never reflect request input", async () => {
  const a = await card("a.example");
  const b = await card("b.example");
  assert.equal(a.name, b.name, "name must be constant");
  assert.equal(a.description, b.description, "description must be constant");
  assert.notEqual(a.remotes[0].url, b.remotes[0].url, "only host-derived bits change");
});

// Layer 2 expert edges — break it on purpose
test("🛡️ malformed JSON → -32700, never a 500", async () => {
  const res = await call("/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{ not json",
  });
  const body = await res.json();
  assert.equal(body.error.code, -32700);
});

test("🛡️ empty body → parse error, not a crash", async () => {
  const res = await call("/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "",
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).error.code, -32700);
});

test("🛡️ unicode/emoji protocolVersion → safe fallback, no throw", async () => {
  const r = await init({ protocolVersion: "🏎️-not-a-version" });
  assert.equal(r.result.protocolVersion, PROTO);
});
