/**
 * faf-server-card-ref — a Cloudflare Worker that is, in one file:
 *   1. an MCP Catalog (discovery entrypoint) at /.well-known/mcp/catalog.json
 *   2. a conformant MCP Server Card at /mcp/server-card (the reserved default,
 *      post experimental-ext-server-card#22) + /.well-known/mcp/server-card (back-compat)
 *   3. a live minimal MCP endpoint at /mcp
 * — the card + the runtime both carry FAF context in the reverse-DNS `_meta` slot.
 *
 * A reference artifact ("show the flow, don't pitch"): with receipts you can curl,
 * FAF context rides MCP's discovery + protocol layers as a well-behaved `_meta`
 * extension. The card is validated against MCP's own published schema (npm test).
 */

import {
  buildServerCard,
  buildCatalog,
  fafContext,
  SERVER_NAME,
  SERVER_TITLE,
  CARD_MEDIA_TYPE,
} from "./card.js";
import { PROJECT_FAF } from "./projectfaf.js";

const FAF_MEDIA_TYPE = "application/vnd.faf+yaml";

const SUPPORTED = ["2025-11-25"]; // only what /mcp genuinely answers (honest-first)
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, mcp-protocol-version, accept",
};

function json(body, init = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: { ...JSON_HEADERS, ...cors, ...(init.headers || {}) },
  });
}

/** Server Card response — served with the `application/mcp-server-card+json`
 *  media type the spec reserves, echoed in Content-Type per content negotiation. */
function cardResponse(host, nowISO) {
  return new Response(JSON.stringify(buildServerCard(host, nowISO), null, 2), {
    headers: {
      "content-type": `${CARD_MEDIA_TYPE}; charset=utf-8`,
      "cache-control": "public, max-age=300",
      ...cors,
    },
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

    // 1. The Catalog — discovery entrypoint (#22). Points at the card's URL.
    if (url.pathname === "/.well-known/mcp/catalog.json") {
      return json(buildCatalog(url.host), {
        headers: { "cache-control": "public, max-age=300" },
      });
    }

    // 1b. The .faf context artifact the card's `_meta.faf` points to (self-hosted).
    if (
      url.pathname === "/.well-known/project.faf" ||
      url.pathname === "/project.faf"
    ) {
      return new Response(PROJECT_FAF, {
        headers: {
          "content-type": `${FAF_MEDIA_TYPE}; charset=utf-8`,
          "cache-control": "public, max-age=300",
          ...cors,
        },
      });
    }

    // 2. The Server Card — reserved default `<mcp-url>/server-card`, plus the
    //    legacy `.well-known` path for back-compat (#22 moved it off .well-known).
    if (
      url.pathname === "/mcp/server-card" ||
      url.pathname === "/.well-known/mcp/server-card"
    ) {
      return cardResponse(url.host, nowISO);
    }

    // 3. Minimal live MCP endpoint (protocol layer) — keeps the card truthful.
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
            capabilities: {},
            serverInfo: { name: SERVER_NAME, version: "1.0.0", title: SERVER_TITLE },
            // Same FAF context the card carries — discovery and protocol agree (#23).
            _meta: { [SERVER_NAME]: fafContext(url.host, nowISO) },
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

    // 4. Human-readable explainer (show the flow)
    if (url.pathname === "/") {
      return new Response(landing(`https://${url.host}`), {
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
<p>An MCP <a href="https://github.com/modelcontextprotocol/experimental-ext-server-card">Catalog + Server Card</a>
that carries <strong>FAF context</strong> in the reverse-DNS <code>_meta</code> slot — and a live
minimal MCP endpoint that says the same thing. Discovery and protocol agree (#23).</p>
<p>The card validates against MCP's own published schema (JSON Schema 2020-12). Conformance is proven, not asserted.</p>
<h2>Receipts</h2>
<pre># Catalog (discovery entrypoint)
curl ${base}/.well-known/mcp/catalog.json

# Server Card — reserved default location (#22), application/mcp-server-card+json
curl -H 'accept: application/mcp-server-card+json' ${base}/mcp/server-card

# The FAF context the card points to (_meta.faf, self-hosted)
curl ${base}/.well-known/project.faf

# Live MCP endpoint — same FAF context in _meta (#23)
curl -s ${base}/mcp -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25"}}'</pre>
<p class="r">FAF is the <span class="c">C</span> in MCP. Not a pitch — a running example you can curl.
The context layer, registered and live.</p>
</body></html>`;
}
