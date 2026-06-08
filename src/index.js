/**
 * faf-server-card-ref — a Cloudflare Worker that is, in one file, BOTH:
 *   1. a conformant MCP Server Card served at /.well-known/mcp/server-card, and
 *   2. a live minimal MCP endpoint at /mcp
 * — both carrying FAF context in the reverse-DNS `_meta` slot.
 *
 * This is a reference artifact ("show the flow, don't pitch"): it demonstrates,
 * with receipts you can curl, that FAF context rides MCP's discovery + protocol
 * layers as a well-behaved `_meta` extension. The card is validated against
 * MCP's own published schema in CI (npm run validate).
 */

import { buildServerCard, fafContext } from "./card.js";

const SUPPORTED = ["2025-11-25"]; // only what /mcp genuinely answers (honest-first)
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, mcp-protocol-version",
};

function json(body, init = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: { ...JSON_HEADERS, ...cors, ...(init.headers || {}) },
  });
}

function rpcResult(id, result) {
  return json({ jsonrpc: "2.0", id, result });
}
function rpcError(id, code, message) {
  return json({ jsonrpc: "2.0", id, error: { code, message } });
}

export default {
  async fetch(request, _env, _ctx) {
    const url = new URL(request.url);
    const nowISO = new Date().toISOString();

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    // 1. The Server Card (discovery layer)
    if (url.pathname === "/.well-known/mcp/server-card") {
      const card = buildServerCard(url.host, nowISO);
      return json(card, {
        headers: {
          // Cache modestly; the card is near-static (only `generated` moves).
          "cache-control": "public, max-age=300",
        },
      });
    }

    // 2. Minimal live MCP endpoint (protocol layer) — keeps the card truthful.
    if (url.pathname === "/mcp" && request.method === "POST") {
      let msg;
      try {
        msg = await request.json();
      } catch {
        return rpcError(null, -32700, "Parse error");
      }
      const { id, method, params } = msg || {};

      switch (method) {
        case "initialize": {
          const asked = params?.protocolVersion;
          const protocolVersion = SUPPORTED.includes(asked)
            ? asked
            : SUPPORTED[0];
          return rpcResult(id, {
            protocolVersion,
            capabilities: {}, // a card/context server advertises no tools yet
            serverInfo: {
              name: "one.faf/context",
              version: "1.0.0",
              title: "FAF Context Endpoint",
            },
            // The same FAF context the card carries — discovery and protocol agree.
            _meta: { "one.faf/context": fafContext(nowISO) },
          });
        }
        case "ping":
          return rpcResult(id, {});
        case "notifications/initialized":
          return new Response(null, { status: 202, headers: cors });
        default:
          return rpcError(id ?? null, -32601, `Method not found: ${method}`);
      }
    }

    // 3. Human-readable explainer (show the flow)
    if (url.pathname === "/") {
      const base = `https://${url.host}`;
      return new Response(landing(base), {
        headers: { "content-type": "text/html; charset=utf-8", ...cors },
      });
    }

    return json({ error: "not found" }, { status: 404 });
  },
};

function landing(base) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FAF Server Card — reference</title>
<style>
  body{font:16px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;max-width:760px;
       margin:6vh auto;padding:0 5vw;color:#0b0b0b;background:#fafafa}
  h1{font-size:1.4rem} code,pre{background:#eef2f2;border-radius:6px}
  pre{padding:1rem;overflow:auto} a{color:#0a7d7d} .c{color:#00D4D4}
  .r{color:#666;font-size:.85rem}
</style></head><body>
<h1>FAF Server Card — reference artifact</h1>
<p>A conformant <a href="https://github.com/modelcontextprotocol/experimental-ext-server-card">MCP Server Card</a>
that carries <strong>FAF context</strong> in the reverse-DNS <code>_meta</code> slot — and a live
minimal MCP endpoint that says the same thing. Discovery and protocol agree (SEP-2127 #23).</p>
<p>The card validates against MCP's own published schema (JSON Schema 2020-12). Conformance is proven, not asserted.</p>
<h2>Receipts</h2>
<pre># The Server Card (discovery)
curl ${base}/.well-known/mcp/server-card

# The live MCP endpoint (protocol) — same FAF context in _meta
curl -s ${base}/mcp -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25"}}'</pre>
<p class="r">FAF is the <span class="c">C</span> in MCP. This isn't a pitch — it's a running example you can curl.
The context layer, registered and live.</p>
</body></html>`;
}
