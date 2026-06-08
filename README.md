# faf-server-card-ref

**A reference [MCP Server Card](https://github.com/modelcontextprotocol/experimental-ext-server-card) that carries FAF context in `_meta` — proven conformant, served live.**

One Cloudflare Worker is, simultaneously:

1. **A conformant MCP Server Card** at `/.well-known/mcp/server-card` (the discovery layer), and
2. **A live minimal MCP endpoint** at `/mcp` (the protocol layer),

— both carrying FAF context in the reverse-DNS `_meta` slot (`one.faf/context`). Discovery and protocol say the same thing, so the card never contradicts the running server ([SEP-2127 issue #23](https://github.com/modelcontextprotocol/experimental-ext-server-card/issues/23)).

This is a **show-the-flow** artifact, not a pitch. It demonstrates — with receipts you can `curl` — that FAF is a well-behaved citizen of MCP's own `_meta` extension mechanism: the context layer, registered and live.

## Cast-iron: conformance is proven, not asserted

```bash
npm install
npm run validate
```

`test/validate.mjs` validates the card against **MCP's own published schema** (`schema/server-card.schema.json`, JSON Schema 2020-12, vendored from `experimental-ext-server-card`). Green = it is a conformant Server Card. It also writes a fresh `examples/server-card.json` snapshot so the committed example never drifts.

## Receipts (after `npm run deploy`)

```bash
# Discovery
curl https://card.faf.one/.well-known/mcp/server-card

# Protocol — same FAF context in _meta
curl -s https://card.faf.one/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25"}}'
```

## The `_meta` shape

```jsonc
"_meta": {
  "one.faf/context": {
    "faf": "https://faf.one/.well-known/project.faf",   // pointer to the IANA-registered artifact
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
src/card.js          single source of truth for the card + FAF context
src/index.js         the Worker (card + minimal MCP + landing page)
schema/              MCP's own server-card.schema.json (vendored)
test/validate.mjs    validates the card against that schema
examples/            generated conformant snapshot
```

## Why this exists

FAF is the **C in MCP** — Model (any) · Context (FAF) · Protocol (any). MCP's discovery layer (Server Cards) deliberately carries identity + transport and excludes deeper context. That exclusion is exactly the slot FAF fills. This repo is the running proof that it fits — as a good citizen of MCP's own conventions, not a competing format.
