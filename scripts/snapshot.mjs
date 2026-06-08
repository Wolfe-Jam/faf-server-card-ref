/**
 * Regenerate examples/server-card.json from the single source of truth.
 * Not a test (tests must have no side effects). Run: npm run snapshot
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildServerCard, ROOT } from "../test/_helpers.mjs";

const card = buildServerCard("card.faf.one", "2026-06-08T00:00:00Z");
mkdirSync(join(ROOT, "examples"), { recursive: true });
writeFileSync(
  join(ROOT, "examples/server-card.json"),
  JSON.stringify(card, null, 2) + "\n",
);
console.log("✅ examples/server-card.json regenerated");
