/**
 * SINGLE-SOURCE PARITY — the `one.faf/context` block card-ref serves must stay
 * byte-identical to faf-cli's emitter (the Truth). faf-cli 6.12.0 ships
 * `fafContextBlock` / `registryMeta` / `registryName`; this test imports the
 * published emitter (devDep faf-cli@^6.12.0) and asserts card-ref's block is a
 * byte-for-byte match. If faf-cli's canonical shape ever moves, THIS goes red and
 * card-ref must follow — hand-authored, but drift is now impossible by construction.
 *
 * (Bridge to the full compose: when faf-cli exposes a Worker-safe pure emitter,
 *  card-ref imports `fafContextBlock` directly and the block is emitted, not authored.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fafContextBlock } from "faf-cli";
import { fafContext } from "../src/card.js";
import { FAF_GENERATED } from "../src/projectfaf.js";

const HOST = "context.faf.one";
const NOW = "2026-06-15T00:00:00.000Z";

test("card-ref _meta block is byte-parity with the faf-cli 6.12.0 emitter", () => {
  // card-ref's served block, minus the liveness-only field (generated_at is
  // request-time freshness, deliberately NOT part of the deterministic emitter).
  const { generated_at, ...cardBlock } = fafContext(HOST, NOW);

  // the SAME block, emitted by faf-cli — the single source.
  const emitted = fafContextBlock(
    { generated: FAF_GENERATED },
    {
      fafPointer: `https://${HOST}/.well-known/project.faf`,
      scoreEndpoint: "https://faf.one",
    },
  );

  // deep equality AND byte-identity (field order matters — deterministic projection).
  assert.deepEqual(cardBlock, emitted);
  assert.equal(JSON.stringify(cardBlock), JSON.stringify(emitted));
});

test("generated_at stays card-ref's own — the liveness signal the emitter omits", () => {
  const block = fafContext(HOST, NOW);
  assert.equal(block.generated_at, NOW); // freshness: when THIS response was served
  // the deterministic emitter must NOT carry a request-time field.
  assert.ok(!("generated_at" in fafContextBlock({ generated: FAF_GENERATED }, {})));
});
