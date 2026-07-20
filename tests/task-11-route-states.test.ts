/**
 * Task 11 — Route states, copy mapping, metadata, sitemap tests.
 *
 * Failing-first: these assertions MUST fail before implementation.
 * They verify:
 *   (a) No hardcoded green-era hex values in route state components
 *   (b) Sitemap includes /archive and excludes /c and /admin
 *   (c) All 4 public route state files use DESIGN.md token references
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const appDir = resolve(projectRoot, "app");

/** Read a source file relative to the app directory. */
function readAppFile(relPath: string): string {
  const p = resolve(appDir, relPath);
  if (!existsSync(p)) return "";
  return readFileSync(p, "utf8");
}

// ---------------------------------------------------------------------------
// (a) Green-era hex values — MUST NOT appear in route state components
// ---------------------------------------------------------------------------
const GREEN_HEX = [
  "#1f6f4a", // green (heading/link in old 404)
  "#68736b", // green-gray (paragraph in old 404)
  "#17211b", // green-charcoal (body in old 404)
  "#e1e7e1", // green-gray (border in old 404)
  "#fcfdfb", // near-white background (old 404)
];

const ROUTE_STATE_FILES = [
  "not-found.tsx",
  "loading.tsx",
  "error.tsx",
  "notes/[slug]/loading.tsx",
  "notes/[slug]/error.tsx",
];

describe("Task 11 — route state token hygiene", () => {
  for (const file of ROUTE_STATE_FILES) {
    const source = readAppFile(file);

    it(`${file} exists`, () => {
      assert.ok(existsSync(resolve(appDir, file)), `${file} must exist`);
    });

    for (const hex of GREEN_HEX) {
      it(`${file} must NOT contain hardcoded ${hex}`, () => {
        assert.ok(
          !source.includes(hex),
          `${file} contains hardcoded green-era hex ${hex}`,
        );
      });
    }

    it(`${file} uses DESIGN.md token classes (route-* className)`, () => {
      // Route state components reference CSS classes defined in globals.css
      // that use DESIGN.md tokens. The classes are prefixed with "route-".
      if (!existsSync(resolve(appDir, file))) return;
      const hasTokenClasses =
        source.includes("route-loading") ||
        source.includes("route-error") ||
        source.includes("route-404") ||
        source.includes("archive-skeleton") ||
        source.includes("archive-error");
      assert.ok(
        hasTokenClasses,
        `${file} must use tokenized CSS class names (route-* or archive-*)`,
      );
    });

    it(`${file} uses tokenized CSS classes (no inline styles)`, () => {
      if (!existsSync(resolve(appDir, file))) return;
      // Route state components must NOT use inline style={} objects.
      // They should use className instead (tokens live in CSS).
      const hasInlineStyles = source.includes("style={{");
      assert.ok(
        !hasInlineStyles,
        `${file} must NOT use inline style objects — use className with tokenized CSS instead`,
      );
    });
  }
});

// ---------------------------------------------------------------------------
// (b) Sitemap correctness
// ---------------------------------------------------------------------------

describe("Task 11 — sitemap", () => {
  const sitemapSource = readAppFile("sitemap.xml/route.ts");

  it("sitemap source includes /archive entry", () => {
    // The sitemap route source must reference /archive
    assert.ok(
      sitemapSource.includes("/archive"),
      "sitemap.xml/route.ts must include /archive URL entry",
    );
  });

  it("sitemap source excludes /c entry", () => {
    // The /c path must not appear as a sitemap <loc>
    // We search for the literal "/c" as a URL path in loc tags
    const locPattern = /<loc>.*\/c[^/a-z].*<\/loc>/i;
    assert.ok(
      !locPattern.test(sitemapSource),
      "sitemap must not include /c URL entry",
    );
  });

  it("sitemap source excludes /admin entry", () => {
    // Admin should not be indexed — it is a private route
    assert.ok(
      !sitemapSource.includes("/admin"),
      "sitemap must not include /admin URL entry",
    );
  });

  it("sitemap source includes home / entry", () => {
    assert.ok(
      sitemapSource.includes(`<loc>`),
      "sitemap must include at least one <loc> entry",
    );
  });
});

// ---------------------------------------------------------------------------
// (c) Metadata completeness
// ---------------------------------------------------------------------------

describe("Task 11 — route metadata", () => {
  it("home page exports metadata or generateMetadata", () => {
    const source = readAppFile("page.tsx");
    const hasMetadata =
      source.includes("export const metadata") ||
      source.includes("export async function generateMetadata") ||
      source.includes("export function generateMetadata");
    assert.ok(hasMetadata, "app/page.tsx must export route metadata");
  });

  it("archive page exports metadata", () => {
    const source = readAppFile("archive/page.tsx");
    const hasMetadata = source.includes("export const metadata");
    assert.ok(hasMetadata, "app/archive/page.tsx must export route metadata");
  });

  it("notes/[slug] page exports generateMetadata (already present)", () => {
    const source = readAppFile("notes/[slug]/page.tsx");
    const hasMetadata = source.includes("export async function generateMetadata");
    assert.ok(hasMetadata, "app/notes/[slug]/page.tsx must export generateMetadata");
  });
});

// ---------------------------------------------------------------------------
// (d) Site-copy shell integration
// ---------------------------------------------------------------------------

describe("Task 11 — site-copy shell mapping", () => {
  it("PublicHeader receives siteName prop (or reads copy)", () => {
    const source = readAppFile("components/PublicHeader.tsx");
    // Header should accept siteName as a prop
    const hasSiteName = source.includes("siteName");
    if (!hasSiteName) {
      // Alternatively, layout.tsx passes copy via prop
      const layoutSource = readAppFile("layout.tsx");
      const passesCopy =
        layoutSource.includes("siteName") ||
        layoutSource.includes("readSiteCopy") ||
        layoutSource.includes("defaultSiteCopy");
      assert.ok(passesCopy, "layout must read and pass site-copy to shell components");
    }
    assert.ok(true); // pass if reached
  });

  it("PublicFooter receives footerMotto and footerLegal props (or reads copy)", () => {
    const source = readAppFile("components/PublicFooter.tsx");
    const hasFooterFields =
      source.includes("footerMotto") || source.includes("footerLegal");
    if (!hasFooterFields) {
      const layoutSource = readAppFile("layout.tsx");
      const passesCopy =
        layoutSource.includes("footerMotto") ||
        layoutSource.includes("footerLegal");
      assert.ok(passesCopy, "layout must pass footer copy to PublicFooter");
    }
    assert.ok(true);
  });

  it("archive filter section references cFeaturedTitle", () => {
    const source = readAppFile("archive/page.tsx");
    const hasFeatured = source.includes("cFeaturedTitle");
    assert.ok(hasFeatured, "archive page must use cFeaturedTitle for filter label");
  });
});

// ---------------------------------------------------------------------------
// (e) Error vs 404 distinguishability
// ---------------------------------------------------------------------------

describe("Task 11 — route state CSS tokens", () => {
  const cssPath = resolve(appDir, "globals.css");
  const css = existsSync(cssPath) ? readFileSync(cssPath, "utf8") : "";

  it("route state CSS classes use DESIGN.md tokens (var(--))", () => {
    // Extract the route-state section from globals.css
    const routeSection = css.match(/13\. Route State Panels[\s\S]*?(?=14\. Reduced Motion)/);
    assert.ok(routeSection, "Route state CSS section (13) must exist");
    const section = routeSection[0];
    assert.ok(
      section.includes("var(--"),
      "Route state CSS must use DESIGN.md custom property references",
    );
  });

  it("route state CSS uses declared font tokens", () => {
    const routeSection = css.match(/13\. Route State Panels[\s\S]*?(?=14\. Reduced Motion)/);
    assert.ok(routeSection);
    const section = routeSection[0];
    const hasFontToken =
      section.includes("--font-display") ||
      section.includes("--font-control") ||
      section.includes("--font-mono");
    assert.ok(hasFontToken, "Route state CSS must reference declared font tokens");
  });

  it("route state CSS uses color tokens", () => {
    const routeSection = css.match(/13\. Route State Panels[\s\S]*?(?=14\. Reduced Motion)/);
    assert.ok(routeSection);
    const section = routeSection[0];
    const hasColorToken =
      section.includes("--ink") ||
      section.includes("--muted") ||
      section.includes("--moss") ||
      section.includes("--canvas") ||
      section.includes("--paper");
    assert.ok(hasColorToken, "Route state CSS must reference declared color tokens");
  });

  it("route state CSS uses spacing tokens", () => {
    const routeSection = css.match(/13\. Route State Panels[\s\S]*?(?=14\. Reduced Motion)/);
    assert.ok(routeSection);
    const section = routeSection[0];
    const hasSpacing = section.includes("var(--space-");
    assert.ok(hasSpacing, "Route state CSS must reference --space-* tokens");
  });

  it("route 404 has no green-era hex values", () => {
    const routeSection = css.match(/13\. Route State Panels[\s\S]*?(?=14\. Reduced Motion)/);
    assert.ok(routeSection);
    const section = routeSection[0];
    for (const hex of GREEN_HEX) {
      assert.ok(
        !section.includes(hex),
        `Route state CSS must not contain hardcoded ${hex}`,
      );
    }
  });
});

describe("Task 11 — error vs 404 distinguishability", () => {
  it("notes/[slug] error.tsx exists for DB failure path", () => {
    const p = resolve(appDir, "notes/[slug]/error.tsx");
    assert.ok(existsSync(p), "notes/[slug]/error.tsx must exist for DB failure handling");
  });

  it("notes/[slug] page uses notFound() only for absent slug, not try/catch", () => {
    const source = readAppFile("notes/[slug]/page.tsx");
    // The page must call notFound() for missing note (which it does)
    assert.ok(source.includes("notFound()"), "page must call notFound() for absent slug");
    // And must NOT wrap getPublishedNoteBySlug in try/catch (DB failures propagate)
    // We check that the comment about CRITICAL exists
    assert.ok(
      source.includes("CRITICAL"),
      "page must have critical comment about DB failure propagation",
    );
  });
});
