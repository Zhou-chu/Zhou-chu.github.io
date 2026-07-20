/**
 * Task 6 characterization test — old public selectors in globals.css.
 *
 * Phase 1 (pre-rewrite): All old selectors MUST exist — test PASSES.
 * Phase 2 (post-rewrite): All old selectors are removed — test FAILS
 *   (expected failure; proves the rewrite correctly stripped green-era CSS).
 *
 * Run: node --test --experimental-strip-types tests/task-6-baseline.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const cssPath = resolve(projectRoot, "app", "globals.css");

function loadCss(): string {
  return readFileSync(cssPath, "utf8");
}

// ---------------------------------------------------------------------------
// Old public selectors that EXIST today (characterization) and MUST be
// removed by the rewrite. After the rewrite this test WILL FAIL — expected.
// ---------------------------------------------------------------------------
const REMOVED_SELECTORS: Array<{ name: string; pattern: RegExp }> = [
  { name: ".site-header", pattern: /\.site-header\b/ },
  { name: ".hero", pattern: /\.hero\b/ },
  { name: ".featured-grid", pattern: /\.featured-grid\b/ },
  { name: ".notes-layout", pattern: /\.notes-layout\b/ },
  { name: ".note-row", pattern: /\.note-row\b/ },
  { name: ".sidebar", pattern: /\.sidebar\b/ },
  { name: ".reader-backdrop", pattern: /\.reader-backdrop\b/ },
  { name: ".reader (core)", pattern: /\.reader\b/ },
  { name: ".reader-close", pattern: /\.reader-close\b/ },
  { name: ".reader-meta", pattern: /\.reader-meta\b/ },
  { name: ".reader-content", pattern: /\.reader-content\b/ },
  { name: ".reader-end", pattern: /\.reader-end\b/ },
  { name: "body::before grain", pattern: /body::before/ },
];

// ---------------------------------------------------------------------------
// Admin legacy aliases that MUST survive the rewrite.
// ---------------------------------------------------------------------------
const PRESERVED_ADMIN_TOKENS = [
  "--paper",
  "--ink",
  "--muted",
  "--line",
  "--vermillion",
  "--paper-deep",
  "--soft-shadow",
  "--olive",
  "--green",
];

// ---------------------------------------------------------------------------
// PHASE 1: Characterization (old selectors exist — PASSES now, FAILS after rewrite)
// ---------------------------------------------------------------------------
describe("task-6 characterization — old selectors present (pre-rewrite)", () => {
  const css = loadCss();

  for (const { name, pattern } of REMOVED_SELECTORS) {
    it(`${name} exists in globals.css (characterization — will fail after rewrite)`, () => {
      assert.ok(
        pattern.test(css),
        `${name} was NOT found in globals.css — it should exist before the rewrite`,
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Admin preservation (should PASS both before and after rewrite)
// ---------------------------------------------------------------------------
describe("task-6 — admin legacy aliases preserved", () => {
  const css = loadCss();

  for (const tokenName of PRESERVED_ADMIN_TOKENS) {
    it(`admin token ${tokenName} must exist in globals.css`, () => {
      const re = new RegExp(`${tokenName.replace(/-/g, "\\-")}\\s*:`);
      assert.ok(
        re.test(css),
        `Admin token ${tokenName} was not found — it must be preserved`,
      );
    });
  }
});
