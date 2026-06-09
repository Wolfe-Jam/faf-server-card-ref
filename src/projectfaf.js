/**
 * The project's own .faf context — served by the worker at
 * /.well-known/project.faf (and /project.faf), and pointed to by the card's
 * `_meta["one.faf/context"].faf`. Self-hosting closes the loop: the card links
 * a context artifact that the same origin actually serves.
 *
 * SINGLE SOURCE = the repo's `project.faf` file (TROPHY 100%, app_type:
 * server-card). This string is kept byte-identical to it; test/brake guards
 * against drift. If you edit project.faf, update this string too.
 */
export const PROJECT_FAF = `faf_version: 2.5.0
app_type: server-card
generated: 2026-06-08T22:00:00.000Z
project:
  name: faf-server-card-ref
  goal: Reference MCP Server Card carrying FAF context in _meta — proven conformant, served live at context.faf.one.
  main_language: JavaScript
  type: server-card
stack:
  frontend: slotignored
  css_framework: slotignored
  ui_library: slotignored
  state_management: slotignored
  backend: slotignored
  api_type: slotignored
  runtime: slotignored
  database: slotignored
  connection: slotignored
  hosting: Cloudflare Workers
  build: wrangler
  cicd: GitHub Actions
  monorepo_tool: slotignored
  package_manager: slotignored
  workspaces: slotignored
  admin: slotignored
  cache: slotignored
  search: slotignored
  storage: slotignored
human_context:
  who: MCP server-card / discovery-layer maintainers and AI-context implementers
  what: A conformant MCP Server Card plus a live minimal MCP endpoint, both carrying FAF context in the reverse-DNS _meta slot, validated against MCP's own schema.
  why: Show — with curl-able receipts — that FAF context rides MCP's discovery layer as a well-behaved _meta extension, not a competing format.
  where: Cloudflare Workers (context.faf.one) and GitHub (Wolfe-Jam/faf-server-card-ref)
  when: 2026-06, aligned to experimental-ext-server-card #22 (reserved /server-card location)
  how: npm test runs the WJTTC suite (schema-validated); npm run deploy ships via wrangler
monorepo:
  packages_count: slotignored
  build_orchestrator: slotignored
  versioning_strategy: slotignored
  shared_configs: slotignored
  remote_cache: slotignored
tech_stack:
  - JavaScript
  - Cloudflare Workers
  - JSON Schema 2020-12
key_files:
  - src/index.js
  - src/card.js
  - schema/server-card.schema.json
  - WJTTC-TEST-SUITE.md
commands:
  test: npm test
  dev: npm run dev
  deploy: npm run deploy
`;

/**
 * The deterministic content-provenance stamp — parsed from PROJECT_FAF's own
 * `generated:` line, so it can NEVER drift from the served .faf (single source).
 * This is PROVENANCE (when the context was authored + built), and it is what the
 * card's `_meta` block reports as `generated`. It is distinct from the card's
 * `generated_at` freshness signal (when a given card response was served).
 */
export const FAF_GENERATED = PROJECT_FAF.match(/^generated:\s*(.+)$/m)[1].trim();
