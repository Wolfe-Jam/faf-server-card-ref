# faf-server-card-ref

**A reference [MCP Server Card](https://github.com/modelcontextprotocol/experimental-ext-server-card) that carries FAF context in `_meta` — proven conformant, served live.**

One Cloudflare Worker is, simultaneously:

1. **An MCP Catalog** (discovery entrypoint) at `/.well-known/mcp/catalog.json`,
2. **A conformant MCP Server Card** at `/mcp/server-card` — the reserved default location ([#22](https://github.com/modelcontextprotocol/experimental-ext-server-card/pull/22)), served as `application/mcp-server-card+json`; `/.well-known/mcp/server-card` kept for back-compat, and
3. **A live minimal MCP endpoint** at `/mcp` (the protocol layer),

— the card and the runtime both carry FAF context in the reverse-DNS `_meta` slot (`one.faf/context`). Discovery and protocol say the same thing, so the card never contradicts the running server ([#23](https://github.com/modelcontextprotocol/experimental-ext-server-card/issues/23)).

This is a **show-the-flow** artifact, not a pitch. It demonstrates — with receipts you can `curl` — that FAF is a well-behaved citizen of MCP's own `_meta` extension mechanism: the context layer, registered and live.

## Cast-iron: conformance is proven, not asserted

```bash
npm install
npm test          # WJTTC: Brake · Engine · Aero · Tyres
```

The suite validates the card against **MCP's own published schema** (`schema/server-card.schema.json`, JSON Schema 2020-12, vendored from `experimental-ext-server-card`) and drives the Worker's `fetch` handler directly. Green = a conformant Server Card. Tyres (live probes) grey-skip unless `WJTTC_TARGET` is set.

## Receipts (after `npm run deploy`)

```bash
# Discovery — the Catalog entrypoint
curl https://context.faf.one/.well-known/mcp/catalog.json

# The Server Card — reserved default location, application/mcp-server-card+json
curl -H 'accept: application/mcp-server-card+json' https://context.faf.one/mcp/server-card

# The FAF context the card's _meta.faf points to (self-hosted, application/vnd.faf+yaml)
curl https://context.faf.one/.well-known/project.faf

# Protocol — same FAF context in _meta (#23)
curl -s https://context.faf.one/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25"}}'
```

## The `_meta` shape

```jsonc
"_meta": {
  "one.faf/context": {
    "faf": "https://context.faf.one/.well-known/project.faf",  // self-hosted pointer to the .faf context (host-derived)
    "mediaType": "application/vnd.faf+yaml",             // IANA-registered media type
    "iana": "https://www.iana.org/assignments/media-types/application/vnd.faf+yaml",
    "deterministic": true,                               // the score is mechanical + reproducible
    "scoreEndpoint": "https://faf.one",                  // where the live score is computed (we don't bake a number)
    "generated": "<ISO-8601>"
  }
}
```

## Deliberate honesty (FAF doctrine)

- **No baked score.** The card points to where the deterministic score is computed rather than asserting a value that could go stale. *FAF don't lie.*
- **Only advertises protocol `2025-11-25`** — what `/mcp` genuinely answers. No claimed RC support we don't implement. *Honest-first.* (Add `2026-07-28` when `/mcp` truly speaks it.)
- **`remotes[].url` is derived from the request host**, so the card is truthful wherever it's deployed.

## Layout

```
src/card.js          card + catalog + the FAF context block (source of truth)
src/index.js         the Worker (catalog + card + minimal MCP + landing)
src/projectfaf.js    the served project.faf string (drift-guarded vs ./project.faf)
project.faf          the repo's own FAF context (app_type: server-card, TROPHY 100%)
schema/              MCP's own server-card.schema.json (vendored)
test/                WJTTC suite — Brake / Engine / Aero / Tyres
examples/            generated conformant snapshot
```

## Why this exists

FAF is the **C in MCP** — Model (any) · Context (FAF) · Protocol (any). MCP's discovery layer (Server Cards) deliberately carries identity + transport and excludes deeper context. That exclusion is exactly the slot FAF fills. This repo is the running proof that it fits — as a good citizen of MCP's own conventions, not a competing format.
