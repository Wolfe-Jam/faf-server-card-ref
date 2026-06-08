/**
 * FAF Server Card — single source of truth.
 *
 * Builds an MCP Server Card (SEP-2127 / experimental-ext-server-card) that
 * carries FAF context in the reverse-DNS `_meta` slot. The card validates
 * against MCP's OWN published schema (see test/validate.mjs) — conformance is
 * proven, not asserted.
 *
 * Design notes (deliberate, per FAF doctrine):
 *  - We do NOT bake a score number into the card. The score is deterministic
 *    and falsifiable; the card POINTS to where it is computed rather than
 *    asserting a value that could go stale. "FAF don't lie."
 *  - We advertise ONLY protocol 2025-11-25 (the current stable), which the
 *    minimal /mcp endpoint genuinely answers. We do not claim RC support we
 *    don't implement. "Honest-first." (Add 2026-07-28 when /mcp truly speaks it.)
 *  - remotes[].url is derived from the request host at runtime, so the card is
 *    truthful wherever it is deployed (SEP-2127 issue #23: a Server Card MUST
 *    NOT contradict the server's actual runtime behavior).
 */

/**
 * THE CANONICAL FAF CONTEXT BLOCK.
 *
 * The same object rides every door: the MCP Server Card's `_meta` slot here,
 * and the `.fafa` Agent Card's `provenance` block (see faf-agent/AGENT-FORMAT.md).
 * Identical fields, identical names — "one context, every door" is literal.
 *
 *   faf           pointer to the .faf context (the corpus this header points to)
 *   mediaType     IANA-registered media type for .faf (verified in faf-cli source)
 *   iana          the IANA assignment record
 *   deterministic the .faf score is mechanical + reproducible
 *   scoreEndpoint where the live score is computed (we link it, never bake a number)
 *   generated     metastamp timestamp
 */
export function fafContext(nowISO) {
  return {
    faf: "https://faf.one/.well-known/project.faf",
    mediaType: "application/vnd.faf+yaml",
    iana: "https://www.iana.org/assignments/media-types/application/vnd.faf+yaml",
    deterministic: true,
    scoreEndpoint: "https://faf.one",
    generated: nowISO,
  };
}

/**
 * Build a conformant MCP Server Card for the FAF context endpoint.
 * @param {string} host  the host the card is served from (e.g. "card.faf.one")
 * @param {string} nowISO ISO-8601 timestamp
 */
export function buildServerCard(host, nowISO) {
  const base = `https://${host}`;
  return {
    $schema:
      "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
    name: "one.faf/context",
    version: "1.0.0",
    description:
      "Reference MCP Server Card carrying FAF context in _meta - the C in MCP, with receipts.",
    title: "FAF Context Endpoint",
    websiteUrl: "https://faf.one",
    repository: {
      url: "https://github.com/Wolfe-Jam/faf-cli",
      source: "github",
    },
    remotes: [
      {
        type: "streamable-http",
        url: `${base}/mcp`,
        supportedProtocolVersions: ["2025-11-25"],
      },
    ],
    // Reverse-DNS namespaced extension — FAF is a good citizen of MCP's _meta,
    // not a competing format. The shape conforms; the substance is invariant.
    _meta: {
      "one.faf/context": fafContext(nowISO),
    },
  };
}
