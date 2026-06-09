/**
 * TYRES — live probes against a deployed instance.
 *
 * Signal-Integrity discipline: these GREY-SKIP when no target is set. A missing
 * deploy is not a code defect, so it must never go red (dead-signal prevention).
 * Run live:  WJTTC_TARGET=https://context.faf.one npm run test:tyres
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { serverCardValidator, MEDIA_TYPE, PROTO, CARD_PATH } from "./_helpers.mjs";

const TARGET = process.env.WJTTC_TARGET?.replace(/\/$/, "");
const skip = TARGET ? false : "set WJTTC_TARGET=https://<host> to run live probes";
const validate = serverCardValidator();

test("Tyres · live card responds + conforms to MCP schema", { skip }, async () => {
  const res = await fetch(`${TARGET}${CARD_PATH}`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(validate(body), JSON.stringify(validate.errors));
  assert.equal(body._meta["one.faf/context"].mediaType, MEDIA_TYPE);
});

test("Tyres · live /mcp initialize negotiates + carries context", { skip }, async () => {
  const res = await fetch(`${TARGET}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: PROTO },
    }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.result.protocolVersion, PROTO);
  assert.equal(body.result._meta["one.faf/context"].mediaType, MEDIA_TYPE);
});

test("Tyres · live /validate (POST the live card) → conformant", { skip }, async () => {
  // POST the card (not ?url=self — a worker fetching its own custom domain loops/522).
  const liveCard = await (await fetch(`${TARGET}${CARD_PATH}`)).json();
  const r = await fetch(`${TARGET}/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(liveCard),
  });
  const j = await r.json();
  assert.equal(j.conformant, true);
  assert.deepEqual(j.errors, []);
});

test("Tyres · live remote URL matches the deployed host", { skip }, async () => {
  const host = new URL(TARGET).host;
  const body = await (await fetch(`${TARGET}${CARD_PATH}`)).json();
  assert.equal(body.remotes[0].url, `https://${host}/mcp`);
});
