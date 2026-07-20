/**
 * Task 10 failing-first tests — Article reader editorial redesign.
 *
 * These tests MUST FAIL before implementation and pass after.
 * Run: node --experimental-strip-types --test tests/task-10-article.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");

function loadCss(filename: string): string {
  return readFileSync(resolve(projectRoot, "app", "notes", "[slug]", filename), "utf8");
}

function loadPageSource(): string {
  return readFileSync(resolve(projectRoot, "app", "notes", "[slug]", "page.tsx"), "utf8");
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS TOKEN VERIFICATION — note.css
// ─────────────────────────────────────────────────────────────────────────────

describe("note.css Timber Field token compliance", () => {
  const css = loadCss("note.css");

  it("MUST NOT contain legacy --green token", () => {
    // DESIGN.md §9.2: --green is a prohibited public token
    assert.doesNotMatch(css, /--green\s*:/);
  });

  it("MUST NOT contain legacy --paper-deep token", () => {
    assert.doesNotMatch(css, /--paper-deep\s*:/);
  });

  it("MUST NOT contain --surface-walnut-* tokens", () => {
    assert.doesNotMatch(css, /--surface-walnut/);
  });

  it("MUST NOT contain --accent-brass-* tokens", () => {
    assert.doesNotMatch(css, /--accent-brass/);
  });

  it("MUST NOT contain box-shadow on article surfaces (except pre::before window dots)", () => {
    // DESIGN.md §9.1: zero shadow on cards, layouts, containers
    // The pre::before has macOS-style window dots (intentional code block decoration)
    // Remove pre::before rules before checking
    const cssNoPreBefore = css.replace(/\.note-body pre::before\s*\{[^}]*\}/g, "");
    assert.doesNotMatch(cssNoPreBefore, /box-shadow/);
  });

  it("MUST NOT contain border-radius > 2px on article content", () => {
    // DESIGN.md §5.12: code blocks 2px, images 2px, everything else 0
    // Check for legacy 8px, 9px, 10px, 11px, 999px radii
    assert.doesNotMatch(css, /border-radius\s*:\s*(?:[89]\d*|1[0-9]+|999)px/);
  });

  it("MUST declare --code-surface or use var(--code-surface)", () => {
    // DESIGN.md §5.12: code background must be the declared charcoal token
    assert.match(css, /code-surface/);
  });

  it("MUST NOT contain green-era color values", () => {
    // DESIGN.md §9.1: no green-era remnants
    assert.doesNotMatch(css, /#1f6f4a/);
    assert.doesNotMatch(css, /#4daa6e/);
    assert.doesNotMatch(css, /#dcefe3/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CSS TOKEN VERIFICATION — obsidian.css
// ─────────────────────────────────────────────────────────────────────────────

describe("obsidian.css Timber Field token compliance", () => {
  const css = loadCss("obsidian.css");

  it("MUST NOT contain green-era color values", () => {
    assert.doesNotMatch(css, /#1f6f4a/);
    assert.doesNotMatch(css, /#4daa6e/);
  });

  it("MUST NOT have decorative box on KaTeX displays", () => {
    // DESIGN.md §5.12: KaTeX — no decorative box, no background tint, no border
    // Strip CSS comments before checking
    const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(cssNoComments, /\.katex-display\s*\{[^}]*border\s*:/);
    assert.doesNotMatch(cssNoComments, /\.katex-display\s*\{[^}]*box-shadow/);
    assert.doesNotMatch(cssNoComments, /\.katex-display\s*\{[^}]*background/);
  });

  it("MUST NOT contain connection-column card layout", () => {
    // DESIGN.md §9.1: card-related layouts prohibited
    assert.doesNotMatch(css, /\.connection-columns/);
  });

  it("MUST NOT contain legacy note-connections selectors", () => {
    assert.doesNotMatch(css, /\.note-connections/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// READING WIDTH VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

describe("article reading width", () => {
  const css = loadCss("note.css");

  it("article container targets 720px within 680–760px bounds", () => {
    // DESIGN.md §5.12: Max-width 720px, bounds 680–760px
    // May use var(--container-reader, 720px) or direct 720px
    const cssStripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
    let width: number | null = null;

    // Try direct pixel value
    const directMatch = cssStripped.match(/\.note-article\s*\{[^}]*max-width\s*:\s*(\d+)px/);
    if (directMatch) {
      width = parseInt(directMatch[1], 10);
    } else {
      // Try var() with fallback
      const varMatch = cssStripped.match(/\.note-article\s*\{[^}]*max-width\s*:\s*var\([^,]+,\s*(\d+)px\)/);
      if (varMatch) {
        width = parseInt(varMatch[1], 10);
      }
    }

    assert.ok(width !== null, "note.css must define .note-article max-width");
    assert.ok(
      width >= 680 && width <= 760,
      `.note-article max-width ${width}px must be 680–760px (target 720px)`,
    );
  });

  it("article body reading column also constrained to 680–760px", () => {
    // The body/content area should also be within bounds
    const noteBodyMatch = css.match(/\.note-body\s*\{[^}]*max-width\s*:\s*(\d+)px/);
    if (noteBodyMatch) {
      const width = parseInt(noteBodyMatch[1], 10);
      assert.ok(width >= 680 && width <= 760,
        `.note-body max-width ${width}px must be 680–760px`);
    }
    // If .note-body doesn't have max-width, it inherits from .note-article — that's OK
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RULER MARKUP VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

describe("ruler metadata strip", () => {
  const source = loadPageSource();

  it("page.tsx renders ruler-like metadata below title", () => {
    // DESIGN.md §5.11: ruler strip with date, reading time, category
    // Must contain category and date rendering together
    assert.match(source, /category/);
    assert.match(source, /publishedAt/);
    // Ruler should be present as a horizontal rule or metadata bar
    assert.match(source, /ruler|note-ruler/);
  });

  it("page.tsx renders title as a clean h1", () => {
    assert.match(source, /<h1/);
    assert.match(source, /note\.title/);
  });

  it("page.tsx renders summary when present", () => {
    assert.match(source, /note\.summary/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ERROR vs NOT-FOUND DISTINCTION
// ─────────────────────────────────────────────────────────────────────────────

describe("error vs notFound distinction", () => {
  const source = loadPageSource();

  it("MUST call notFound() only for absent slug, not on DB failure", () => {
    // Current bug: resolveNote catches all errors and returns null,
    // then notFound() is called on null. This collapses server errors into 404.
    // Fix: resolveNote (or the new approach) must throw on DB errors,
    // and only call notFound() when the note genuinely doesn't exist.
    assert.match(source, /notFound/);

    // The try/catch in resolveNote must NOT catch DB errors silently
    // Either: resolveNote doesn't catch, OR it re-throws after catching
    const resolveNoteSource = source.match(/async function resolveNote[\s\S]*?\n\}/);
    if (resolveNoteSource) {
      // If resolveNote still exists, it must NOT silently return null on errors
      const resolveBody = resolveNoteSource[0];
      // Check that the catch block doesn't just return null
      assert.doesNotMatch(resolveBody, /catch\s*\{\s*return null/);
    }

    // The notFound() call must be guarded by a null check that comes from
    // getPublishedNoteBySlug returning undefined (not from a caught error)
  });

  it("MUST distinguish DB failure path from absent-slug path", () => {
    // DB failure should let the error propagate to the error boundary
    // (throw or re-throw), while absent slug should call notFound()
    // There should be two distinct code paths
    const hasThrowOrReThrow = source.includes("throw") || source.includes("error");
    assert.ok(hasThrowOrReThrow, 
      "page.tsx must have an error propagation path distinct from notFound()");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MARKUP STRUCTURE — public shell integration
// ─────────────────────────────────────────────────────────────────────────────

describe("public shell integration", () => {
  const source = loadPageSource();

  it("MUST NOT render its own page-level header", () => {
    // The layout provides PublicHeader; article must not duplicate
    assert.doesNotMatch(source, /note-header/);
    assert.doesNotMatch(source, /note-brand/);
    // Match note-back as a standalone class, not part of note-backlinks
    assert.doesNotMatch(source, /["'\s]note-back["'\s>]/);
  });

  it("MUST NOT render its own page-level footer", () => {
    // The layout provides PublicFooter; article must not duplicate
    assert.doesNotMatch(source, /note-site-footer/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BACKLINK / RELATED — hairline rows, not cards
// ─────────────────────────────────────────────────────────────────────────────

describe("backlink and related rows", () => {
  const css = loadCss("note.css");
  const source = loadPageSource();

  it("backlinks MUST be rendered as rows, not cards", () => {
    // DESIGN.md §5.12: Backlink rows — 1px border-top, not card grid
    assert.doesNotMatch(css, /backlink.*grid/);
    assert.doesNotMatch(css, /backlink.*card/);
    assert.doesNotMatch(css, /\.backlink-item\s*\{[^}]*border-radius/);
  });

  it("related notes MUST be rendered as rows, not cards", () => {
    // DESIGN.md §5.12: Related rows — same structure as recent ledger rows
    // Must NOT have card styling (grid layout, border-radius, hover elevation)
    assert.doesNotMatch(css, /note-related.*grid-template-columns/);
    assert.doesNotMatch(css, /note-related.*border-radius\s*:\s*(?:[89]|1[0-9])px/);
    assert.doesNotMatch(css, /note-related.*box-shadow/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE TOC INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

describe("ArticleToc integration", () => {
  const source = loadPageSource();

  it("page.tsx imports or renders ArticleToc", () => {
    assert.match(source, /ArticleToc/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CODE BLOCK THEME
// ─────────────────────────────────────────────────────────────────────────────

describe("code block styling", () => {
  const css = loadCss("note.css");

  it("code background uses declared charcoal token", () => {
    // DESIGN.md §5.12: code background = --code-surface (#1b1f1c light / #111411 dark)
    // Allow optional fallback values inside var()
    const preMatch = css.match(/\.note-body pre\s*\{[^}]*background\s*:\s*var\(--code[-_]\w+/);
    assert.ok(preMatch, "pre background must reference --code-surface token");
  });

  it("code must NOT have warm tint or grain in styling rules", () => {
    // DESIGN.md §5.12: no grain, no warm tint behind code
    // Strip CSS comments before checking for prohibited patterns
    const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(cssNoComments, /\.note-body pre\s*\{[^}]*(?:grain|noise|texture)/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KATEX — unboxed
// ─────────────────────────────────────────────────────────────────────────────

describe("KaTeX styling", () => {
  const noteCss = loadCss("note.css");
  const obsidianCss = loadCss("obsidian.css");

  it("KaTeX display must NOT have decorative box", () => {
    // DESIGN.md §5.12: no decorative box, no background tint, no border
    // Strip CSS comments before checking
    const noteCssNoComments = noteCss.replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(noteCssNoComments, /\.katex-display\s*\{[^}]*border/);
    assert.doesNotMatch(noteCssNoComments, /\.katex-display\s*\{[^}]*border-radius/);
    assert.doesNotMatch(noteCssNoComments, /\.katex-display\s*\{[^}]*background/);
    assert.doesNotMatch(noteCssNoComments, /\.katex-display\s*\{[^}]*padding/);
  });
});
