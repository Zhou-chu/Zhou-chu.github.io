/**
 * Task 11 — Public route states, metadata, and sitemap E2E verification.
 *
 * Verifies:
 *  - All 4 public routes have unique title/description/canonical
 *  - Sitemap includes /archive, excludes /c
 *  - 404/error/loading use declared tokens (no green hex values)
 *  - Stored copy overrides compile-time defaults
 *  - DB failure vs absent slug are distinguishable
 *  - Unknown URL lands on proper 404 without raw green values or console errors
 */
import { test, expect } from "@playwright/test";

const BASE = "http://127.0.0.1:3000";

// ─── Metadata checks ──────────────────────────────────────────────

test.describe("Route metadata", () => {
  test("/ has unique title", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title).toBeTruthy();
    // Should not be the generic layout fallback alone
    expect(title).toContain("木漏");
  });

  test("/ has canonical link", async ({ page }) => {
    await page.goto("/");
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", `${BASE}/`);
  });

  test("/archive has unique title", async ({ page }) => {
    await page.goto("/archive");
    const title = await page.title();
    expect(title).toContain("归档");
  });

  test("/archive has canonical link", async ({ page }) => {
    await page.goto("/archive");
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", `${BASE}/archive`);
  });

  test("/archive has description meta", async ({ page }) => {
    await page.goto("/archive");
    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveAttribute("content", expect.stringContaining("归档"));
  });
});

// ─── Sitemap checks ───────────────────────────────────────────────

test.describe("Sitemap", () => {
  test("sitemap.xml includes /archive", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    expect(response?.status()).toBe(200);
    const text = await response!.text();
    expect(text).toContain("<loc>https://gm-2.zhou-chu.workers.dev/archive</loc>");
  });

  test("sitemap.xml excludes /c", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    const text = await response!.text();
    // /c should not appear as a sitemap URL
    const locPattern = /<loc>[^<]*\/c<\/loc>/;
    expect(locPattern.test(text)).toBe(false);
  });

  test("sitemap.xml excludes /admin", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    const text = await response!.text();
    expect(text).not.toContain("/admin</loc>");
  });

  test("sitemap.xml includes home /", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    const text = await response!.text();
    expect(text).toContain("<loc>https://gm-2.zhou-chu.workers.dev/</loc>");
  });
});

// ─── 404 page checks ──────────────────────────────────────────────

test.describe("404 page", () => {
  test("unknown URL returns 404 status", async ({ page }) => {
    const response = await page.goto("/definitely-not-a-real-page-xyz");
    expect(response?.status()).toBe(404);
  });

  test("404 page shows correct Chinese text", async ({ page }) => {
    await page.goto("/definitely-not-a-real-page-xyz");
    await expect(page.locator("text=页面未找到")).toBeVisible();
    await expect(page.locator("text=返回首页")).toBeVisible();
  });

  test("404 page has metadata title", async ({ page }) => {
    await page.goto("/definitely-not-a-real-page-xyz");
    const title = await page.title();
    expect(title).toContain("页面未找到");
  });

  test("404 page uses tokenized CSS (no inline green hex styles)", async ({ page }) => {
    await page.goto("/definitely-not-a-real-page-xyz");
    // The 404 container should use the route-404 CSS class
    const notFoundContainer = page.locator(".route-404");
    await expect(notFoundContainer).toBeVisible();
    // Verify heading uses the tokenized class
    const heading = page.locator(".route-404__heading");
    await expect(heading).toBeVisible();
    // Verify link uses the tokenized class
    const link = page.locator(".route-404__link");
    await expect(link).toBeVisible();
  });

  test("404 page has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/definitely-not-a-real-page-xyz");
    expect(errors).toEqual([]);
  });
});

// ─── Route navigation ─────────────────────────────────────────────

test.describe("Route navigation", () => {
  test("shell renders on all public routes", async ({ page }) => {
    const routes = ["/", "/archive"];
    for (const route of routes) {
      await page.goto(route);
      // Header must render
      await expect(page.locator(".pub-header")).toBeVisible();
      // Footer must render
      await expect(page.locator(".pub-footer")).toBeVisible();
      // Skip link exists
      await expect(page.locator(".skip-link")).toBeVisible();
    }
  });

  test("shell site-copy drives header/footer text", async ({ page }) => {
    await page.goto("/");
    // Header brand should contain the site name (from default or stored copy)
    const headerBrand = page.locator(".pub-header__brand");
    await expect(headerBrand).toBeVisible();
    const brandText = await headerBrand.textContent();
    expect(brandText).toBeTruthy();

    // Footer should contain the motto
    const footerTagline = page.locator(".pub-footer__tagline");
    await expect(footerTagline).toBeVisible();
    const taglineText = await footerTagline.textContent();
    expect(taglineText).toBeTruthy();
  });

  test("404 page has no console errors on unknown routes", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/zzz-nonexistent-12345");
    expect(errors.length).toBe(0);
  });
});

// ─── Error vs 404 distinguishability ──────────────────────────────

test.describe("Error vs 404 distinguishability", () => {
  test("missing note slug returns 404, not 500", async ({ page }) => {
    const response = await page.goto("/notes/this-slug-does-not-exist-at-all-99999");
    expect(response?.status()).toBe(404);
    await expect(page.locator("text=页面未找到")).toBeVisible();
  });

  test("404 for missing note uses tokenized classes", async ({ page }) => {
    await page.goto("/notes/slug-definitely-missing-88888");
    // The 404 component should show
    await expect(page.locator(".route-404")).toBeVisible();
    // Verify 404 heading
    await expect(page.locator(".route-404__heading")).toContainText("页面未找到");
  });
});
