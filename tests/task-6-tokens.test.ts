/**
 * Task 6 token verification — new Timber Field tokens must match DESIGN.md
 * exact values for both light and dark modes.
 *
 * Also verifies typography, spacing, easing, and container tokens are present
 * with the values specified in DESIGN.md Sections 2–4 and 7.
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

/** Extract all `--token: value;` declarations from the CSS source. */
function extractTokens(css: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /--([\w-]+)\s*:\s*([^;]+)\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    map.set(m[1], m[2].trim());
  }
  return map;
}

/**
 * Extract tokens from the FIRST `:root { ... }` block only (light Timber Field
 * tokens). Ignores later `:root` overrides (admin legacy) and `:root[data-
 * theme="dark"]` blocks.
 */
function extractFirstRootBlockTokens(css: string): Map<string, string> {
  const firstBlock = css.match(/:root\s*\{([^}]*)\}/);
  if (!firstBlock) return new Map();
  return extractTokens(firstBlock[1]);
}

// ---------------------------------------------------------------------------
// DESIGN.md Section 2.4 — Light token exact values
// ---------------------------------------------------------------------------
const LIGHT_TOKENS: Record<string, string> = {
  canvas: "#f3f1e9",
  paper: "#fbfaf6",
  "code-surface": "#1b1f1c",
  ink: "#20211d",
  muted: "#66675e",
  faint: "#77786f",
  moss: "#4f5d42",
  timber: "#76543f",
  error: "#9a433a",
  success: "#4e6545",
  line: "#c8c5ba",
};

// DESIGN.md Section 2.3 — Dark token exact values
const DARK_TOKENS: Record<string, string> = {
  canvas: "#171a17",
  paper: "#1d211d",
  "code-surface": "#111411",
  ink: "#eeece5",
  muted: "#b3b5aa",
  faint: "#858980",
  moss: "#9baa8a",
  timber: "#c29271",
  error: "#e18b80",
  success: "#9bb18e",
  line: "#3b4139",
};

// ---------------------------------------------------------------------------
// DESIGN.md Section 3.3 — Typography tokens
// ---------------------------------------------------------------------------
const TYPOGRAPHY_TOKENS: Record<string, string> = {
  "font-display":
    '"Noto Serif SC", "Songti SC", "STSong", "Times New Roman", serif',
  "font-control":
    '"PingFang SC", "Microsoft YaHei", system-ui, -apple-system, sans-serif',
  "font-mono":
    '"Cascadia Code", "Fira Code", "Consolas", "SF Mono", monospace',
  "text-xs": "0.75rem",
  "text-sm": "0.875rem",
  "text-base": "1rem",
  "text-md": "1.125rem",
  "text-lg": "1.25rem",
  "text-xl": "1.5rem",
  "text-2xl": "1.875rem",
  "text-3xl": "2.375rem",
  "text-4xl": "3rem",
  "leading-body": "1.75",
  "leading-heading": "1.3",
  "leading-control": "1.5",
  "tracking-heading": "-0.011em",
};

// ---------------------------------------------------------------------------
// DESIGN.md Section 4.3 — Spacing & container tokens
// ---------------------------------------------------------------------------
const SPACING_TOKENS: Record<string, string> = {
  "space-1": "0.25rem",
  "space-2": "0.5rem",
  "space-3": "0.75rem",
  "space-4": "1rem",
  "space-5": "1.25rem",
  "space-6": "1.5rem",
  "space-8": "2rem",
  "space-10": "2.5rem",
  "space-12": "3rem",
  "space-16": "4rem",
  "space-20": "5rem",
  "space-24": "6rem",
  "container-max": "1240px",
  "container-reader": "720px",
  "grid-gap": "var(--space-6)",
};

// ---------------------------------------------------------------------------
// DESIGN.md Section 7.2 — Easing tokens
// ---------------------------------------------------------------------------
const EASING_TOKENS: Record<string, string> = {
  "ease-out": "cubic-bezier(0.16, 1, 0.3, 1)",
  "ease-in": "cubic-bezier(0.4, 0, 1, 1)",
  "ease-standard": "cubic-bezier(0.4, 0, 0.2, 1)",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("task-6 tokens — Timber Field light values", () => {
  const css = loadCss();

  for (const [name, expected] of Object.entries(LIGHT_TOKENS)) {
    it(`--${name} light value must be ${expected}`, () => {
      // Extract from the FIRST :root block only — that's the Timber Field
      // light tokens. Later :root blocks contain admin legacy aliases.
      const tokens = extractFirstRootBlockTokens(css);
      const actual = tokens.get(name);
      assert.ok(
        actual !== undefined,
        `--${name} not found in first :root block of globals.css`,
      );
      assert.equal(
        actual,
        expected,
        `--${name}: expected ${expected}, got ${actual}`,
      );
    });
  }
});

describe("task-6 tokens — Timber Field dark values", () => {
  it("dark token set exists via :root[data-theme=\"dark\"]", () => {
    const css = loadCss();
    assert.ok(
      css.includes('[data-theme="dark"]'),
      'expected :root[data-theme="dark"] block in globals.css',
    );
  });

  for (const [name, expected] of Object.entries(DARK_TOKENS)) {
    it(`--${name} must have dark value ${expected}`, () => {
      const css = loadCss();

      // Naively extract from the dark block: find the dark block and check
      // that the token has the right value inside it.
      const darkBlockMatch = css.match(
        /:root\[data-theme="dark"\]\s*\{([^}]*)\}/s,
      );
      assert.ok(darkBlockMatch, "could not find dark theme block");

      const darkBlock = darkBlockMatch[1];
      const tokenRe = new RegExp(
        `--${name.replace(/-/g, "\\-")}\\s*:\\s*([^;]+)\\s*;`,
      );
      const m = darkBlock.match(tokenRe);
      assert.ok(m, `--${name} not declared in dark theme block`);
      assert.equal(
        m[1].trim(),
        expected,
        `--${name} dark: expected ${expected}, got ${m[1].trim()}`,
      );
    });
  }
});

describe("task-6 tokens — typography scale", () => {
  const css = loadCss();
  const tokens = extractTokens(css);

  for (const [name, expected] of Object.entries(TYPOGRAPHY_TOKENS)) {
    it(`--${name} must be declared with exact value`, () => {
      const actual = tokens.get(name);
      assert.ok(
        actual !== undefined,
        `--${name} not found in globals.css`,
      );
      assert.equal(actual, expected, `--${name}: expected ${expected}, got ${actual}`);
    });
  }
});

describe("task-6 tokens — spacing scale", () => {
  const css = loadCss();
  const tokens = extractTokens(css);

  for (const [name, expected] of Object.entries(SPACING_TOKENS)) {
    it(`--${name} must be declared`, () => {
      const actual = tokens.get(name);
      assert.ok(actual !== undefined, `--${name} not found in globals.css`);
      assert.equal(actual, expected, `--${name} mismatch`);
    });
  }
});

describe("task-6 tokens — easing", () => {
  const css = loadCss();
  const tokens = extractTokens(css);

  for (const [name, expected] of Object.entries(EASING_TOKENS)) {
    it(`--${name} must be declared`, () => {
      const actual = tokens.get(name);
      assert.ok(actual !== undefined, `--${name} not found`);
      assert.equal(actual, expected, `--${name} mismatch`);
    });
  }
});
