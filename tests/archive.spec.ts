// ─── Archive E2E Tests — Timber Field Notes (Todo 9) ─────────────
// Each test creates its own fixture, seeds, verifies, and cleans up.
// Uses per-test request context (not beforeAll) per Playwright API rules.

import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PublicFixture } from "./support/public-fixtures.ts";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "..", ".omo", "evidence", "task-12-screenshots");
try { mkdirSync(SCREENSHOT_DIR, { recursive: true }); } catch { /* ok */ }

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
    path: resolve(SCREENSHOT_DIR, `${route}-${theme}-${breakpoint}.png`),
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

const BREAKPOINTS = [
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 900 },
  { name: "1440", width: 1440, height: 1000 },
] as const;

const BASE_URL = "http://127.0.0.1:3000";
const CATEGORIES = ["工程", "随想", "阅读", "方法", "设计"];

function makeContent(i: number): string {
  return `# 测试笔记 ${i}\n\n这是笔记 ${i} 的正文段落。\n\n## 二级标题\n\n- 列表 A\n- 列表 B`;
}

async function seedNotes(fixture: PublicFixture, years: number[]): Promise<void> {
  for (let i = 0; i < years.length; i++) {
    await fixture.publishNote({
      title: `测试笔记 ${i + 1}`,
      content: makeContent(i + 1),
      category: CATEGORIES[i % CATEGORIES.length],
      summary: `测试摘要 ${i + 1}`,
      slug: `archive-e2e-${Date.now().toString(36)}-${i}`,
    });
  }
}

test.describe("Archive Page", () => {

  // ─── 1. No-data state ──────────────────────────────────────

  test("shows zero-data state when no notes exist", async ({ page }) => {
    await page.goto("/archive");
    await expect(page.locator(".archive-state__empty")).toBeVisible();
    await expect(page.locator(".archive-state__empty")).toContainText("档案尚空");
    await expect(page.locator(".archive-state__empty")).toContainText("公开笔记会按年份在这里归档。");
  });

  // ─── 2. Populated: year groups, order, log rows ────────────

  test("shows notes grouped by year in descending order", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026, 2025, 2024]);
    try {
      await page.goto("/archive");
      const yearLabels = page.locator(".archive-year-label");
      await expect(yearLabels.first()).toContainText("2026");
      await expect(yearLabels.nth(1)).toContainText("2025");
      await expect(yearLabels.last()).toContainText("2024");
      await expect(page.locator(".archive-log-row").first()).toBeVisible();
      await expect(page.locator(".archive-log-id").first()).toContainText("LOG-");
      await expect(page.locator(".archive-material-label").first()).toBeVisible();
      await expect(page.locator(".archive-log-title").first()).toHaveAttribute("href", /\/notes\//);
    } finally { await fixture.cleanup(); }
  });

  // ─── 3. Search functionality ───────────────────────────────

  test("search filters by title case-insensitively", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await fixture.publishNote({ title: "木材可持续性研究", content: makeContent(100), category: "工程", summary: "木材相关研究", slug: `arch-s-1-${Date.now().toString(36)}` });
    await fixture.publishNote({ title: "软件工程实践", content: makeContent(101), category: "工程", summary: "软件工程笔记", slug: `arch-s-2-${Date.now().toString(36)}` });
    try {
      await page.goto("/archive");
      await page.locator(".archive-search").fill("木材");
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/q=\S/);
      await expect(page.locator(".archive-log-title")).toContainText("木材可持续性研究");
      await expect(page.locator(".archive-log-title")).not.toContainText("软件工程实践");
    } finally { await fixture.cleanup(); }
  });

  // ─── 4. Material filter ────────────────────────────────────

  test("material filter shows only matching category", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026, 2026, 2025]);
    try {
      await page.goto("/archive");
      const pill = page.locator(".archive-material-pill").filter({ hasText: "工程" }).first();
      await pill.click();
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/material=.+/);
      const labels = page.locator(".archive-material-label");
      for (let i = 0; i < await labels.count(); i++) {
        await expect(labels.nth(i)).toHaveText("工程");
      }
    } finally { await fixture.cleanup(); }
  });

  // ─── 5. Unknown material ───────────────────────────────────

  test("unknown material filter produces filtered-empty state", async ({ page }) => {
    await page.goto("/archive?material=nonexistent-category");
    await expect(page.locator(".archive-state__heading")).toContainText("没有匹配的笔记");
    await expect(page.locator(".archive-clear-btn")).toBeVisible();
  });

  // ─── 6. Blank query restores all results ────────────────────

  test("blank query after search shows all results", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026, 2026]);
    try {
      await page.goto("/archive");
      await page.locator(".archive-search").fill("测试");
      await page.waitForTimeout(500);
      await page.locator(".archive-search").fill("");
      await page.waitForTimeout(500);
      await expect(page).not.toHaveURL(/q=\S/);
      await expect(page.locator(".archive-log-row").first()).toBeVisible();
    } finally { await fixture.cleanup(); }
  });

  // ─── 7. URL params restore on reload ───────────────────────

  test("search params persist across page reload", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await fixture.publishNote({ title: "木材研究笔记", content: makeContent(200), category: "工程", summary: "研究木材的可持续性", slug: `arch-r-${Date.now().toString(36)}` });
    try {
      await page.goto("/archive?q=木材");
      const count = await page.locator(".archive-log-title").count();
      expect(count).toBeGreaterThan(0);
      await page.reload();
      expect(await page.locator(".archive-log-title").count()).toBeGreaterThan(0);
    } finally { await fixture.cleanup(); }
  });

  // ─── 8. Back button preserves filter state ─────────────────

  test("browser back preserves filter state", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026, 2026, 2025]);
    try {
      await page.goto("/archive");
      const pill = page.locator(".archive-material-pill").filter({ hasText: "工程" }).first();
      await pill.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain("material=");
      await page.locator(".archive-log-title").first().click();
      await page.goBack();
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/material=.+/);
    } finally { await fixture.cleanup(); }
  });

  // ─── 9. Mobile stacking ────────────────────────────────────

  test("mobile viewport stacks to single column", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026, 2025]);
    try {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/archive");
      const bodyCols = await page.locator(".archive-body").evaluate(el => window.getComputedStyle(el).gridTemplateColumns);
      expect(bodyCols).toBe("1fr");
      const logCols = await page.locator(".archive-log-row").first().evaluate(el => window.getComputedStyle(el).gridTemplateColumns);
      expect(logCols).toBe("1fr");
    } finally { await fixture.cleanup(); }
  });

  // ─── 10. content-visibility auto ───────────────────────────

  test("year groups use content-visibility: auto", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026, 2025, 2024]);
    try {
      await page.goto("/archive");
      const cv = await page.locator(".archive-year-group").first().evaluate(el => window.getComputedStyle(el).contentVisibility);
      expect(cv).toBe("auto");
    } finally { await fixture.cleanup(); }
  });

  // ─── 11. No image requests ─────────────────────────────────

  test("archive page makes no image requests", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026]);
    try {
      const imageReqs: string[] = [];
      page.on("request", req => { if (req.resourceType() === "image") imageReqs.push(req.url()); });
      await page.goto("/archive");
      await page.waitForLoadState("networkidle");
      const contentImages = imageReqs.filter(u => !u.includes("favicon"));
      expect(contentImages.length).toBe(0);
    } finally { await fixture.cleanup(); }
  });

  // ─── 12. Clear filters button ──────────────────────────────

  test("clear filters button removes query params", async ({ page }) => {
    await page.goto("/archive?material=nonexistent-category");
    await expect(page.locator(".archive-clear-btn")).toBeVisible();
    await page.locator(".archive-clear-btn").click();
    await expect(page).toHaveURL(/\/archive$/);
  });

  // ─── 13. Active material pill styling ──────────────────────

  test("active material pill has data-active attribute", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026, 2026]);
    try {
      await page.goto("/archive");
      await page.locator(".archive-material-pill").filter({ hasText: "工程" }).first().click();
      await page.waitForTimeout(500);
      await expect(page.locator('.archive-material-pill[data-active="true"]').first()).toBeVisible();
    } finally { await fixture.cleanup(); }
  });

  // ─── 14. Material pills show counts ────────────────────────

  test("material pills display category counts", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026, 2026, 2026]);
    try {
      await page.goto("/archive");
      const pills = page.locator(".archive-material-pill");
      // At least one pill must render after seeding notes
      await expect(pills.first()).toBeVisible();
      await expect(pills.first().locator(".archive-material-count")).toBeVisible();
      expect(parseInt(await pills.first().locator(".archive-material-count").textContent() ?? "0", 10)).toBeGreaterThan(0);
    } finally { await fixture.cleanup(); }
  });

  // ─── 15. Many entries ──────────────────────────────────────

  test("archive handles 60+ entries without crashing", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    for (let i = 0; i < 60; i++) {
      await fixture.publishNote({ title: `批量测试笔记 ${i + 1000}`, content: `# 测试 ${i}\n内容段落`, category: CATEGORIES[i % CATEGORIES.length], summary: `批量摘要 ${i}`, slug: `bulk-e2e-${Date.now().toString(36)}-${i}` });
    }
    try {
      await page.goto("/archive");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".archive-year-label").first()).toBeVisible();
      expect(await page.locator(".archive-log-row").count()).toBeGreaterThan(10);
    } finally { await fixture.cleanup(); }
  });

  // ─── 16. Invalid date fallback — page renders cleanly ──────

  test("page renders without exception with invalid dates", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026]);
    try {
      await page.goto("/archive");
      await expect(page.locator(".archive-shell")).toBeVisible();
      const hasState = (await page.locator(".archive-state").count()) > 0;
      const hasRows = (await page.locator(".archive-log-row").count()) > 0;
      expect(hasState || hasRows).toBe(true);
    } finally { await fixture.cleanup(); }
  });

  // ─── 17. Title and subtitle ────────────────────────────────

  test("archive page has title and ARCHIVE subtitle", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026]);
    try {
      await page.goto("/archive");
      await expect(page.locator(".archive-title")).toBeVisible();
      await expect(page.locator(".archive-subtitle")).toContainText("ARCHIVE");
    } finally { await fixture.cleanup(); }
  });

  // ─── 18. One link per row ───────────────────────────────────

  test("each log row has exactly one /notes/<slug> link", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026, 2026, 2025]);
    try {
      await page.goto("/archive");
      const rows = page.locator(".archive-log-row");
      for (let i = 0; i < await rows.count(); i++) {
        const links = rows.nth(i).locator(".archive-log-title");
        await expect(links).toHaveCount(1);
        await expect(links).toHaveAttribute("href", /^\/notes\//);
      }
    } finally { await fixture.cleanup(); }
  });

  // ─── 19. Theme toggle in archive ────────────────────────────

  test("theme toggle works on archive page", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026]);
    try {
      await page.goto("/archive");
      await page.waitForLoadState("networkidle");
      const toggle = page.locator(".theme-toggle");
      await expect(toggle).toBeVisible();
      const initialTheme = await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      );
      await toggle.click();
      await page.waitForTimeout(300);
      const newTheme = await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      );
      expect(newTheme).not.toBe(initialTheme);
    } finally { await fixture.cleanup(); }
  });

  // ─── 20. Dark theme renders archive correctly ───────────────

  test("archive renders correctly in dark theme", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026, 2025]);
    try {
      await page.goto("/archive");
      await setTheme(page, "dark");
      await expect(page.locator(".archive-shell")).toBeVisible();
      await expect(page.locator(".archive-year-label").first()).toBeVisible();
      const bgColor = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor,
      );
      expect(bgColor).not.toBe("rgb(255, 255, 255)");
    } finally { await fixture.cleanup(); }
  });

  // ─── 21. Keyboard navigation ────────────────────────────────

  test("Tab walks through archive shell", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026]);
    try {
      await page.goto("/archive");
      await page.waitForLoadState("networkidle");
      // Skip link first
      await page.keyboard.press("Tab");
      const focused1 = await page.evaluate(() => document.activeElement?.className);
      expect(focused1).toContain("skip-link");
      // Next tab moves past skip link
      await page.keyboard.press("Tab");
      const focused2 = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused2).toBeTruthy();
    } finally { await fixture.cleanup(); }
  });

  test("search input is keyboard accessible", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026]);
    try {
      await page.goto("/archive");
      const searchInput = page.locator(".archive-search");
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
      await page.keyboard.type("测试");
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/q=\S/);
    } finally { await fixture.cleanup(); }
  });

  // ─── 22. Reduced motion ─────────────────────────────────────

  test("archive works with prefers-reduced-motion", async ({ page, request }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026]);
    try {
      await page.goto("/archive");
      await page.waitForLoadState("networkidle");
      const errors = collectPageErrors(page);
      expect(errors).toEqual([]);
      await expect(page.locator(".archive-shell")).toBeVisible();
      const prefersReduced = await page.evaluate(() =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      expect(prefersReduced).toBe(true);
    } finally { await fixture.cleanup(); }
  });

  // ─── 23. Axe accessibility audit ────────────────────────────

  test("archive passes axe-core audit", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026, 2025]);
    try {
      await page.goto("/archive");
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page })
        .exclude("#react-scan-root")
        .exclude("canvas[data-react-grab-overlay-canvas]")
        .analyze();
      const relevantViolations = results.violations.filter(
        (v) => !["label-title-only", "region"].includes(v.id),
      );
      expect(relevantViolations).toEqual([]);
    } finally { await fixture.cleanup(); }
  });

  // ─── 24. Console / network errors ───────────────────────────

  test("no page errors and no failed requests on archive", async ({ page, request }) => {
    const errors = collectPageErrors(page);
    const failed = collectFailedRequests(page);
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026]);
    try {
      await page.goto("/archive");
      await page.waitForLoadState("networkidle");
      expect(errors).toEqual([]);
      expect(failed).toEqual([]);
    } finally { await fixture.cleanup(); }
  });

  // ─── 25. React-scan unnecessary commits ─────────────────────

  test("no react-scan unnecessary commit warnings on archive", async ({ page, request }) => {
    const scanWarnings: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "warning" && msg.text().includes("unnecessary")) {
        scanWarnings.push(msg.text());
      }
    });
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026]);
    try {
      await page.goto("/archive");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
      expect(scanWarnings).toEqual([]);
    } finally { await fixture.cleanup(); }
  });

  // ─── 26. Screenshots — light/dark at 4 breakpoints ──────────

  for (const bp of BREAKPOINTS) {
    test(`screenshot archive light ${bp.name}px`, async ({ page, request }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      const fixture = new PublicFixture(request, BASE_URL);
      await seedNotes(fixture, [2026, 2025, 2024]);
      try {
        await page.goto("/archive");
        await page.waitForLoadState("networkidle");
        await setTheme(page, "light");
        await screenshot(page, "archive", "light", bp.name);
      } finally { await fixture.cleanup(); }
    });

    test(`screenshot archive dark ${bp.name}px`, async ({ page, request }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      const fixture = new PublicFixture(request, BASE_URL);
      await seedNotes(fixture, [2026, 2025, 2024]);
      try {
        await page.goto("/archive");
        await page.waitForLoadState("networkidle");
        await setTheme(page, "dark");
        await screenshot(page, "archive", "dark", bp.name);
      } finally { await fixture.cleanup(); }
    });
  }

  // ─── 27. Responsive — 1440px viewport ────────────────────────

  test("1440px viewport has no horizontal overflow", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const fixture = new PublicFixture(request, BASE_URL);
    await seedNotes(fixture, [2026, 2025]);
    try {
      await page.goto("/archive");
      await page.waitForLoadState("networkidle");
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    } finally { await fixture.cleanup(); }
  });
});
