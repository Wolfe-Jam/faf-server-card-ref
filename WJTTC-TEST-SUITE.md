# 🏎️ WJTTC Test Suite — faf-server-card-ref

**Project:** `faf-server-card-ref` — MCP Server Card + live MCP endpoint carrying the canonical FAF context block in `_meta`
**Tester:** WJTTC (Wolfe James Tests The Code)
**Date:** 2026-06-08
**Runner:** Node native test runner (`node:test`) — zero extra deps
**Result:** **27 pass · 0 fail · 3 grey-skip (Tyres) → 100% of gated tests · 🏆 Championship**

---

## Run it

```bash
npm test            # Brake + Engine + Aero + Tyres (Tyres grey-skip if no target)
npm run test:brake  # must-never-fail
npm run test:engine # correctness
npm run test:aero   # polish
WJTTC_TARGET=https://context.faf.one npm run test:tyres   # live probes
```

No deploy needed for Brake / Engine / Aero — they drive the Worker's `fetch` handler directly with web-standard `Request`/`Response` (the same primitives the Workers runtime provides).

---

## Tier system

| Tier | Meaning | Failure = | Tests |
|------|---------|-----------|-------|
| **Brake** | must-never-fail; if red, the artifact *lies* | catastrophic (false claims) | 10 |
| **Engine** | core correctness | wrong behaviour | 11 |
| **Aero** | polish | minor inconvenience | 6 |
| **Tyres** | live probes vs a deployed instance | (grey-skip when not deployed) | 3 |

---

## Brake — must-never-fail

| # | Test | Guards |
|---|------|--------|
| B1 | static card conforms to MCP's own schema (2020-12) | conformance |
| B2 | served card conforms (live handler output) | conformance at runtime |
| B3 | card↔runtime `_meta` parity | **SEP-2127 #23** — card must not contradict the server |
| B4 | every advertised protocol is actually answered | honest-first |
| B5 | no baked score/tier; computation is linked | **FAF don't lie** |
| B6 | IANA media type is exact (`application/vnd.faf+yaml`) | truthful provenance |
| B7 | identity fields static — never reflect request input | injection surface = none |
| B8 | malformed JSON → `-32700`, never 500 | robustness |
| B9 | empty body → parse error, not a crash | robustness |
| B10 | unicode/emoji protocolVersion → safe fallback | Layer-2 expert edge |

## Engine — correctness

Routes (card / initialize / ping / `notifications/initialized` / unknown method `-32601` / 404), version negotiation + fallback, host-derived remote URL, OPTIONS/CORS preflight, wrong-method handling. **11 tests.**

## Aero — polish

Content-types (JSON card, HTML landing), `cache-control`, CORS headers on success *and* error responses, landing page shows `curl` receipts + the `/mcp` endpoint. **6 tests.**

## Tyres — live probes

Against `WJTTC_TARGET`: live card conforms, live `initialize` negotiates + carries context, live remote URL matches deployed host. **Grey-skip when no target** — a missing deploy is not a code defect.

---

## Signal Integrity

**Red means real.** No absolute-time perf assertions, no network calls in the gated tiers (Brake/Engine/Aero are fully offline against the handler), live network confined to Tyres which grey-skips rather than flakes. Target Signal Integrity = **100%** — every red corresponds to an actual defect.

## Championship certification

| Pass rate (gated) | Tier | Badge |
|---|---|---|
| **100%** | **Championship** | **🏆** |

27/27 gated tests pass. Tyres ready to certify the moment `WJTTC_TARGET` is set against a deployment.

*We break things so others never have to know they were broken. 🏎️*
