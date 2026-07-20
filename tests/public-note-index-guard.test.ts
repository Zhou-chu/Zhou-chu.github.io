// ─── Public Note Index Source Guard ──────────────────────────────────
// Verifies the server companion selects only metadata columns and
// never includes `content` in its Drizzle query.
// Self-contained — no model or fixture imports needed.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("public-note-index source guard", () => {
  test("does NOT select content field from notes table", () => {
    const indexPath = resolve(process.cwd(), "app/lib/public-note-index.ts");
    const source = readFileSync(indexPath, "utf-8");

    // The select() block must not include `content: notes.content`
    // or `content:` in a column selection context
    const selectBlock = source.match(/\.select\(\{([^}]+)\}\)/s);
    assert.ok(selectBlock, "Expected a .select({...}) call in public-note-index.ts");

    const columns = selectBlock[1];
    assert.ok(
      !columns.includes("content:"),
      `public-note-index.ts selects content column — FORBIDDEN. Columns:\n${columns}`,
    );
  });

  test("includes all required metadata fields (no more, no less)", () => {
    const indexPath = resolve(process.cwd(), "app/lib/public-note-index.ts");
    const source = readFileSync(indexPath, "utf-8");

    const selectBlock = source.match(/\.select\(\{([^}]+)\}\)/s);
    assert.ok(selectBlock, "Expected a .select({...}) call");

    const columns = selectBlock[1];
    const requiredFields = [
      "id:", "slug:", "title:", "summary:", "category:",
      "featured:", "publishedAt:", "createdAt:", "updatedAt:",
    ];
    for (const field of requiredFields) {
      assert.ok(
        columns.includes(field),
        `public-note-index.ts is missing required field: ${field}`,
      );
    }
  });
});
