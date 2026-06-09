/**
 * Precompile MCP's server-card.schema.json into a standalone validator module
 * (`src/validator.js`) — ajv "standalone" emits a self-contained function with
 * NO runtime code generation, so it runs inside a Cloudflare Worker (which
 * bans eval/new Function). Re-run after the vendored schema changes:
 *   npm run build:validator
 */
import Ajv2020 from "ajv/dist/2020.js";
import standaloneCode from "ajv/dist/standalone/index.js";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_ID =
  "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json";
const schema = JSON.parse(
  readFileSync(join(root, "schema/server-card.schema.json"), "utf8"),
);

// strict:false → unknown "format" keywords (uri) are pass-through (no
// ajv-formats dep in the bundle); structure, required, types, patterns,
// enums are all validated. allErrors → report every problem, not just first.
const ajv = new Ajv2020({
  code: { source: true }, // CommonJS output — exports at end, no TDZ (esm:true is buggy)
  strict: false,
  allErrors: true,
});
ajv.addSchema(schema, SCHEMA_ID);
const validate = ajv.getSchema(`${SCHEMA_ID}#/$defs/ServerCard`);
if (!validate) throw new Error("could not resolve #/$defs/ServerCard");

writeFileSync(join(root, "src/validator.cjs"), standaloneCode(ajv, validate));
console.log("✅ src/validator.cjs generated (ajv standalone, CJS, no runtime eval)");
