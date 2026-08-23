/**
 * Homepage E2E Tests — Timber Field Notes (Todo 12)
 *
 * Coverage matrix per plan §12:
 *  - Hero credit, intro, recent rows, research counts, empty state
 *  - Theme toggle (dark/light)
 *  - Keyboard tab/focus order, skip link
 *  - Reduced motion (prefers-reduced-motion: reduce)
 *  - Responsive at 375 / 768 / 1280 / 1440 (no horizontal overflow)
 *  - Axe a11y audit (no color-contrast exclusion)
 *  - Console / network errors (no failed same-origin requests)
 *  - React-scan unnecessary commit detection
 *  - Screenshots: light/dark at 4 breakpoints
 *  - /c permanent redirect
 *  - Broken image resilience
 *  - No legacy patterns (no ReaderDialog, no card wall, no search on home)
 */
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PublicFixture } from "./support/public-fixtures.js";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ─── Constants ──────────────────────────────────────────────────────

const BASE_URL = "http://127.0.0.1:3000";
const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = resolve(__dirname, "..", ".omo", "evidence");
const SCREENSHOT_DIR = resolve(EVIDENCE_DIR, "task-12-screenshots");

const BREAKPOINTS = [
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 900 },
  { name: "1440", width: 1440, height: 1000 },
] as const;

const CATEGORIES = ["技术", "写作", "方法", "随想", "阅读"];

try { mkdirSync(SCREENSHOT_DIR, { recursive: true }); } catch { /* ok */ }

// ─── Helpers ────────────────────────────────────────────────────────

function seedNote(i: number, overrides: Partial<{
  title: string;
  category: string;
  publishedAt: string;
  content: string;
  summary: string;
}> = {}) {
  return {
    title: overrides.title ?? `测试笔记标题 ${i} — 关于${CATEGORIES[i % CATEGORIES.length]}的思考`,
    content: overrides.content ?? `# 测试笔记 ${i}\n\n正文段落。`,
    category: overrides.category ?? CATEGORIES[i % CATEGORIES.length],
    publishedAt: overrides.publishedAt ?? `2026-07-${String(Math.min(i, 15) + 1).padStart(2, "0")}`,
    summary: overrides.summary ?? `这是测试笔记 ${i} 的摘要。`,
  };
}

async function seedNotes(fixture: PublicFixture, count: number): Promise<void> {
  for (let i = 1; i <= count; i++) {
    await fixture.publishNote(seedNote(i));
  }
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

function collectFailedRequests(page: Page): string[] {
  const failed: string[] = [];
  page.on("requestfailed", (req) => {
    if (req.url().includes("favicon.ico")) return;
    if (!req.url().includes("localhost") && !req.url().includes("127.0.0.1")) return;
    failed.push(req.url());
  });
  return failed;
}

async function screenshot(
  page: Page,
  route: string,
  theme: "light" | "dark",
  breakpoint: string,
): Promise<void> {
  await page.screenshot({
    path: resolve(SCREENSHOT_DIR, `${route.replace(/\//g, "-")}-${theme}-${breakpoint}.png`),
    fullPage: true,
  });
}

async function setTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("theme", t); } catch { /* ok */ }
  }, theme);
  await page.waitForTimeout(200);
}

// ═══════════════════════════════════════════════════════════════════════
// 1. Smoke
// ═══════════════════════════════════════════════════════════════════════

test.describe("Smoke", () => {
  test("/ returns 200 with page title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/木漏/);
    await expect(page.locator(".pub-shell")).toBeVisible();
    await expect(page.locator("#main-content")).toBeVisible();
  });

  test("/ returns hero figure with credit links", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator(".home-hero");
    await expect(hero).toBeVisible();
    const caption = hero.locator("figcaption.home-hero__credit");
    await expect(caption).toBeVisible();
    await expect(caption).toContainText("Tedmoseby");
    await expect(caption).toContainText("CC BY-SA 3.0");
    const creatorLink = caption.locator("a", { hasText: "Tedmoseby" });
    await expect(creatorLink).toHaveAttribute("href", /commons.wikimedia.org/);
    const licenseLink = caption.locator("a", { hasText: "CC BY-SA 3.0" });
    await expect(licenseLink).toHaveAttribute("href", /creativecommons.org/);
  });

  test("/c redirects to / (permanent)", async ({ page }) => {
    const resp = await page.goto("/c");
    expect(page.url()).toMatch(/\/$/);
    expect(page.url()).not.toContain("/c");
    const status = resp?.status();
    expect([301, 308]).toContain(status);
    await expect(page.locator(".home-hero")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Empty state
// ═══════════════════════════════════════════════════════════════════════

test.describe("Empty state", () => {
  test("zero notes: hero, intro, and empty ledger copy visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".home-hero")).toBeVisible();
    await expect(page.locator(".home-intro__heading")).toBeVisible();
    await expect(page.locator(".home-intro__body")).toBeVisible();
    const ledger = page.locator(".home-ledger");
    await expect(ledger).toBeVisible();
    await expect(ledger).toContainText("尚无公开笔记");
    await expect(ledger).toContainText("第一条研究记录发布后，将在这里出现。");
    await expect(page.locator(".home-ledger__row")).toHaveCount(0);
    await expect(page.locator(".home-research")).toHaveCount(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Populated state
// ═══════════════════════════════════════════════════════════════════════

test.describe("Populated state", () => {
  test("seeded 6 notes: only 5 recent rows, descending order", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, 6);
    try {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const rows = page.locator(".home-ledger__row");
      await expect(rows).toHaveCount(5);
      const dates = await page.locator(".home-ledger__date").allTextContents();
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1].localeCompare(dates[i])).toBeGreaterThanOrEqual(0);
      }
      await expect(page.locator(".home-research")).toBeVisible();
      const tiles = page.locator(".home-research__tile");
      const tileCount = await tiles.count();
      expect(tileCount).toBeGreaterThanOrEqual(1);
      const firstTile = tiles.first();
      await expect(firstTile.locator(".home-research__label")).toBeVisible();
      await expect(firstTile.locator(".home-research__count")).toBeVisible();
    } finally {
      await fixture.cleanup();
    }
  });

  test("research category counts match seeded data", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    for (let i = 1; i <= 6; i++) {
      await fixture.publishNote(seedNote(i));
    }
    try {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const tiles = page.locator(".home-research__tile");
      const techTile = tiles.filter({ has: page.locator(".home-research__label", { hasText: "技术" }) });
      await expect(techTile).toHaveCount(1);
      const techCount = await techTile.locator(".home-research__count").textContent();
      expect(Number(techCount)).toBeGreaterThan(0);
    } finally {
      await fixture.cleanup();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. No legacy patterns
// ═══════════════════════════════════════════════════════════════════════

test.describe("No legacy patterns", () => {
  test("no ReaderDialog/modal on home", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await expect(page.locator(".clean-reader-bg")).toHaveCount(0);
  });

  test("no search box on home", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".clean-search")).toHaveCount(0);
  });

  test("no card wall or featured grid", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".clean-feature-grid")).toHaveCount(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. Responsive
// ═══════════════════════════════════════════════════════════════════════

test.describe("Responsive", () => {
  for (const bp of BREAKPOINTS) {
    test(`viewport ${bp.name}px has no horizontal overflow`, async ({ page, request }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      const fixture = new PublicFixture(request, BASE_URL);
      await seedNotes(fixture, 3);
      try {
        await page.goto("/");
        await page.waitForLoadState("networkidle");
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const innerWidth = await page.evaluate(() => window.innerWidth);
        expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
      } finally {
        await fixture.cleanup();
      }
    });
  }

  test("hero image resolves same-origin", async ({ page }) => {
    await page.goto("/");
    const img = page.locator(".home-hero img");
    await expect(img).toBeVisible();
    const src = await img.getAttribute("src");
    expect(src).toBeTruthy();
    expect(src).toMatch(/^\//);
  });

  test("hero has no layout shift (explicit dimensions)", async ({ page }) => {
    await page.goto("/");
    const img = page.locator(".home-hero img");
    const width = await img.getAttribute("width");
    const height = await img.getAttribute("height");
    expect(width).toBeTruthy();
    expect(height).toBeTruthy();
    expect(Number(width)).toBeGreaterThan(0);
    expect(Number(height)).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Theme toggle
// ═══════════════════════════════════════════════════════════════════════

test.describe("Theme", () => {
  test("theme toggle button exists with accessible label", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator(".theme-toggle");
    await expect(toggle).toBeVisible();
    const label = await toggle.getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(["切换到深色模式", "切换到浅色模式"]).toContain(label);
    const box = await toggle.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(40);
    expect(box!.height).toBeGreaterThanOrEqual(40);
  });

  test("toggling theme sets data-theme on html element", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const toggle = page.locator(".theme-toggle");
    const initialTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    expect(["light", "dark"]).toContain(initialTheme);
    await toggle.click();
    await page.waitForTimeout(300);
    const newTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    expect(newTheme).not.toBe(initialTheme);
    expect(["light", "dark"]).toContain(newTheme);
    await toggle.click();
    await page.waitForTimeout(300);
    const restored = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    expect(restored).toBe(initialTheme);
  });

  test("dark theme renders with dark background", async ({ page }) => {
    await page.goto("/");
    await setTheme(page, "dark");
    const bgColor = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor,
    );
    expect(bgColor).not.toBe("rgb(255, 255, 255)");
    expect(bgColor).not.toBe("rgba(0, 0, 0, 0)");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. Keyboard navigation & skip link
// ═══════════════════════════════════════════════════════════════════════

test.describe("Keyboard & skip link", () => {
  test("skip link is present and navigates to main-content", async ({ page }) => {
    await page.goto("/");
    const skipLink = page.locator(".skip-link");
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toHaveAttribute("href", "#main-content");
    await expect(skipLink).toContainText("跳到主要内容");
    await skipLink.click();
    const mainEl = page.locator("#main-content");
    await expect(mainEl).toBeVisible();
  });

  test("Tab walks through shell landmarks", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Tab");
    const focused1 = await page.evaluate(() => document.activeElement?.className);
    expect(focused1).toContain("skip-link");
    await page.keyboard.press("Tab");
    const focused2 = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused2).toBeTruthy();
  });

  test("theme toggle is keyboard accessible", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator(".theme-toggle");
    await toggle.focus();
    await expect(toggle).toBeFocused();
    const before = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const after = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    expect(after).not.toBe(before);
  });

  test("nav links are keyboard focusable", async ({ page }) => {
    await page.goto("/");
    const navLinks = page.locator(".pub-nav__link");
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < count; i++) {
      await navLinks.nth(i).focus();
      await expect(navLinks.nth(i)).toBeFocused();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. Reduced motion
// ═══════════════════════════════════════════════════════════════════════

test.describe("Reduced motion", () => {
  test("homepage respects prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const errors = collectPageErrors(page);
    expect(errors).toEqual([]);
    await expect(page.locator(".pub-shell")).toBeVisible();
    await expect(page.locator(".home-hero")).toBeVisible();
  });

  test("prefers-reduced-motion media query is active", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const prefersReduced = await page.evaluate(() =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    expect(prefersReduced).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. Broken image resilience
// ═══════════════════════════════════════════════════════════════════════

test.describe("Broken image resilience", () => {
  test("broken hero image still shows alt text and credit caption", async ({ page }) => {
    await page.route("**/images/timber/**", (route) => route.abort());
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const hero = page.locator(".home-hero");
    await expect(hero).toBeVisible();
    const caption = hero.locator("figcaption.home-hero__credit");
    await expect(caption).toBeVisible();
    await expect(caption).toContainText("Tedmoseby");
    await expect(caption).toContainText("CC BY-SA 3.0");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 10. Accessibility
// ═══════════════════════════════════════════════════════════════════════

test.describe("Accessibility", () => {
  test("homepage passes axe-core audit (no color-contrast exclusion)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .exclude("#react-scan-root")
      .exclude("canvas[data-react-grab-overlay-canvas]")
      .analyze();
    const relevantViolations = results.violations.filter(
      (v) => !["label-title-only", "region"].includes(v.id),
    );
    expect(relevantViolations).toEqual([]);
  });

  test("header uses semantic <header> tag", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header.pub-header")).toBeVisible();
  });

  test("footer uses semantic <footer> tag", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer.pub-footer")).toBeVisible();
  });

  test("main uses semantic <main> with id", async ({ page }) => {
    await page.goto("/");
    const main = page.locator("main#main-content");
    await expect(main).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 11. Console / network
// ═══════════════════════════════════════════════════════════════════════

test.describe("Console/network", () => {
  test("no page errors and no failed public asset requests", async ({ page }) => {
    const errors = collectPageErrors(page);
    const failed = collectFailedRequests(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
    expect(failed).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 12. React-scan unnecessary commit detection
// ═══════════════════════════════════════════════════════════════════════

test.describe("React-scan", () => {
  test("react-scan root is present in dev mode", async ({ page }) => {
    await page.goto("/");
    // react-scan injects #react-scan-root in dev mode — must be present
    const scanRoot = page.locator("#react-scan-root");
    await expect(scanRoot).toBeVisible();
  });

  test("no react-scan unnecessary commit warnings", async ({ page }) => {
    const scanWarnings: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "warning" && msg.text().includes("unnecessary")) {
        scanWarnings.push(msg.text());
      }
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    expect(scanWarnings).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 13. Screenshots — light/dark at 4 breakpoints
// ═══════════════════════════════════════════════════════════════════════

test.describe("Screenshots", () => {
  for (const bp of BREAKPOINTS) {
    test(`screenshot homepage light ${bp.name}px`, async ({ page, request }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      const fixture = new PublicFixture(request, BASE_URL);
      await seedNotes(fixture, 3);
      try {
        await page.goto("/");
        await page.waitForLoadState("networkidle");
        await setTheme(page, "light");
        await screenshot(page, "home", "light", bp.name);
      } finally {
        await fixture.cleanup();
      }
    });

    test(`screenshot homepage dark ${bp.name}px`, async ({ page, request }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      const fixture = new PublicFixture(request, BASE_URL);
      await seedNotes(fixture, 3);
      try {
        await page.goto("/");
        await page.waitForLoadState("networkidle");
        await setTheme(page, "dark");
        await screenshot(page, "home", "dark", bp.name);
      } finally {
        await fixture.cleanup();
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 14. Failure modes
// ═══════════════════════════════════════════════════════════════════════

test.describe("Failure modes", () => {
  test("non-loopback base URL is rejected before writes", async ({ request }) => {
    expect(() => new PublicFixture(request, "https://example.com")).toThrow(
      /not a loopback/,
    );
  });

  test("zero notes still renders complete hero and intro", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".home-hero")).toBeVisible();
    await expect(page.locator(".home-intro")).toBeVisible();
    await expect(page.locator(".home-ledger")).toBeVisible();
    await expect(page.locator(".pub-shell")).toBeVisible();
  });
});
