/**
 * FAF Server Card — single source of truth.
 *
 * Builds an MCP Server Card (SEP-2127 / experimental-ext-server-card) that
 * carries FAF context in the reverse-DNS `_meta` slot. The card validates
 * against MCP's OWN published schema (see the WJTTC suite in test/) — conformance
 * is proven, not asserted.
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

import { FAF_GENERATED } from "./projectfaf.js"; // deterministic provenance stamp (single source)

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
 *   generated     PROVENANCE — when the .faf context was authored/built. Deterministic,
 *                 sourced from the served .faf (FAF_GENERATED), so the card never
 *                 contradicts the artifact it points to.
 *   generated_at  FRESHNESS — when THIS card response was generated (request time).
 *                 The declarable liveness signal floated in SEP-2127 (#2127): the card
 *                 is served live, not a stale committed blob. Provenance ≠ freshness.
 */
export function fafContext(host, nowISO) {
  return {
    // Self-hosted: the same origin serves this .faf (see /.well-known/project.faf).
    faf: `https://${host}/.well-known/project.faf`,
    mediaType: "application/vnd.faf+yaml",
    iana: "https://www.iana.org/assignments/media-types/application/vnd.faf+yaml",
    deterministic: true,
    scoreEndpoint: "https://faf.one",
    generated: FAF_GENERATED, // deterministic provenance — matches the served .faf
    generated_at: nowISO, // freshness — when this response was served (liveness)
  };
}

export const SERVER_NAME = "one.faf/context"; // reverse-DNS name + _meta key
export const SERVER_TITLE = "FAF Context Endpoint";
export const CARD_MEDIA_TYPE = "application/mcp-server-card+json";

export const AI_CATALOG_MEDIA_TYPE = "application/ai-catalog+json";

/**
 * Build the AI Catalog (discovery entrypoint), AI Catalog v0.9.0. Served at
 * `/.well-known/ai-catalog.json` (the well-known path discovery.md names) and,
 * unchanged, at `/.well-known/mcp/catalog.json` (post experimental-ext-server-card#22).
 * The Catalog is the entrypoint; each entry points at where the card lives.
 * @param {string} host
 */
export function buildCatalog(host) {
  // AI Catalog v0.9 reads urn:air:{publisher}:{name}[:{kind}] (ADR-0030); the drafts
  // before it read the same shape as {namespace}:{name} (ADR-0015). One segment after
  // the publisher, {name}-{kind}, can't be read the wrong way round: v0.9 reads it as a
  // name with no kind. publisher = the forward-DNS
  // of the card name's reverse-DNS prefix; name = the segment after "/".
  const [rev, suffix] = SERVER_NAME.split("/"); // "one.faf", "context"
  const publisher = rev.split(".").reverse().join("."); // "faf.one"
  return {
    specVersion: "0.9",
    entries: [
      {
        identifier: `urn:air:${publisher}:${suffix}-mcp`, // urn:air:faf.one:context-mcp
        // ADR 0014 (experimental-ext-server-card#32, merged 2026-07-13): CatalogEntry
        // field renamed mediaType -> type. #39 (same day) dropped displayName.
        type: CARD_MEDIA_TYPE,
        // Reserved default location: <streamable-http-url>/server-card.
        url: `https://${host}/mcp/server-card`,
        // The id published before v0.9, kept in a namespaced extension. The spec defines
        // no migration mechanism; this borrows the pattern § Catalog Projection gives
        // operators for replaced source identifiers (no meaning of equivalence).
        // Both ids this card had: mcp:context here, mcp:context-server in faf.one's catalog.
        extensions: { [`${rev}.former-identifiers`]: [`urn:air:${publisher}:mcp:${suffix}`, `urn:air:${publisher}:mcp:${suffix}-server`] },
      },
    ],
  };
}

/**
 * Build a conformant MCP Server Card for the FAF context endpoint.
 * @param {string} host  the host the card is served from
 * @param {string} nowISO ISO-8601 timestamp
 */
export function buildServerCard(host, nowISO) {
  const base = `https://${host}`;
  return {
    $schema:
      "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
    name: SERVER_NAME,
    version: "1.0.0",
    description:
      "Reference MCP Server Card carrying FAF context in _meta - the C in MCP, with receipts.",
    title: SERVER_TITLE,
    websiteUrl: "https://faf.one",
    repository: {
      url: "https://github.com/Wolfe-Jam/faf-cli",
      source: "github",
    },
    // Optional sized icons — experimental-ext-server-card#36 ("fill the card out completely").
    // PNG only: the MIME type every conformant client MUST support. All three resolve live.
    icons: [
      { src: "https://faf.one/favicon.png", mimeType: "image/png" },
      { src: "https://faf.one/apple-touch-icon.png", mimeType: "image/png" },
      { src: "https://faf.one/faf-logo.png", mimeType: "image/png" },
    ],
    remotes: [
      {
        type: "streamable-http",
        url: `${base}/mcp`,
        supportedProtocolVersions: ["2025-11-25", "2026-07-28"],
      },
    ],
    // Reverse-DNS namespaced extension — FAF is a good citizen of MCP's _meta,
    // not a competing format. The shape conforms; the substance is invariant.
    _meta: {
      "one.faf/context": fafContext(host, nowISO),
    },
  };
}
