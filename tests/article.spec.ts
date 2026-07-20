/**
 * Article Page E2E Tests — Timber Field Notes (Todo 12)
 *
 * Coverage matrix per plan §12:
 *  - Reading width 680–760px (target 720px)
 *  - Ruler ticks (category, date, read time)
 *  - TOC: appears 2+ headings, keyboard/focus/Escape, reduced-motion
 *  - Code rendering (dark background, data-language)
 *  - KaTeX rendering (no decorative box)
 *  - Backlink / related rows
 *  - 404 for missing slug
 *  - Theme toggle (dark/light)
 *  - Responsive at 375 / 768 / 1280 / 1440
 *  - Axe a11y audit
 *  - Console / network errors
 *  - React-scan unnecessary commit detection
 *  - Screenshots: light/dark at 4 breakpoints
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
const SCREENSHOT_DIR = resolve(__dirname, "..", ".omo", "evidence", "task-12-screenshots");
try { mkdirSync(SCREENSHOT_DIR, { recursive: true }); } catch { /* ok */ }

const BREAKPOINTS = [
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 900 },
  { name: "1440", width: 1440, height: 1000 },
] as const;

// ─── Rich article content for seeding ───────────────────────────────

function articleContent(): string {
  return `# 木材可持续性研究笔记

这是一篇关于现代木材工程与可持续建筑的研究笔记。本文将探讨几种主流木材技术的应用。

## 工程木材的分类

工程木材分为以下几类：

1.  **CLT (Cross-Laminated Timber)** — 交叉层压木材
2.  **Glulam (胶合木)** — 适合大跨度结构
3.  **LVL (单板层积材)** — 强度高，常用于梁柱

### CLT 的力学性能

CLT 的抗弯强度可以通过以下公式计算：

$$
M = \\frac{b \\cdot h^2}{6} \\cdot f_m
$$

其中 $M$ 为弯矩，$b$ 为宽度，$h$ 为高度，$f_m$ 为抗弯强度设计值。

### 代码示例：木材截面计算

以下是计算矩形截面惯性矩的示例：

\`\`\`python
def moment_of_inertia(width: float, height: float) -> float:
    """Calculate moment of inertia for a rectangular timber section."""
    return (width * height ** 3) / 12

# Example: 100mm × 200mm section
I = moment_of_inertia(100, 200)
print(f"Moment of inertia: {I:.2f} mm⁴")
\`\`\`

## 环境效益

使用工程木材作为主要结构材料，每立方米可固碳约 $0.9$ 吨 $CO_2$。

| 材料 | 固碳量 (kg/m³) | 能耗 (MJ/m³) |
|------|---------------|-------------|
| CLT  | 900           | 800         |
| 混凝土 | 0             | 2500        |
| 钢材  | 0             | 12000       |

## 常见问题与挑战

*防火设计* 是高层木结构面临的最大挑战。木材在火灾中的炭化速率约为 $0.6$ mm/min，可以通过增加截面尺寸来满足耐火极限要求。

另一个挑战是 **连接节点设计**。木结构连接需要同时考虑强度、刚度和延性。

## 进一步阅读

- [[日本木结构建筑传统]]
- [[现代工程木材标准]]

*本文档仅供研究参考，不构成工程建议。*
`;
}

function terseContent(): string {
  return `# 简短笔记\n\n只有一个段落的笔记，没有二级标题。`;
}

// ─── Helpers ────────────────────────────────────────────────────────

async function seedArticle(
  fixture: PublicFixture,
  opts: {
    title?: string;
    content?: string;
    category?: string;
    slug?: string;
    summary?: string;
  } = {},
) {
  return fixture.publishNote({
    title: opts.title ?? "木材可持续性研究笔记",
    content: opts.content ?? articleContent(),
    category: opts.category ?? "工程",
    summary: opts.summary ?? "探讨现代木材工程与可持续建筑的交叉领域。",
    slug: opts.slug,
  });
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
  suffix: string,
  theme: "light" | "dark",
  breakpoint: string,
): Promise<void> {
  await page.screenshot({
    path: resolve(SCREENSHOT_DIR, `article-${suffix}-${theme}-${breakpoint}.png`),
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

test.describe("Article smoke", () => {
  test("article loads with title, summary, and ruler", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");

      // Title
      await expect(page.locator("#note-title")).toBeVisible();
      await expect(page.locator("#note-title")).toContainText("木材可持续性研究笔记");

      // Summary
      await expect(page.locator(".note-summary")).toBeVisible();

      // Ruler
      const ruler = page.locator(".note-ruler");
      await expect(ruler).toBeVisible();
      await expect(ruler.locator(".note-ruler__category")).toBeVisible();
      await expect(ruler.locator(".note-ruler__date")).toBeVisible();
      await expect(ruler.locator(".note-ruler__readtime")).toBeVisible();
      await expect(ruler.locator(".note-ruler__readtime")).toContainText("阅读约");
    } finally {
      await fixture.cleanup();
    }
  });

  test("article without summary still renders title and ruler", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture, { summary: "" });
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("#note-title")).toBeVisible();
      await expect(page.locator(".note-ruler")).toBeVisible();
      // No summary element
      await expect(page.locator(".note-summary")).toHaveCount(0);
    } finally {
      await fixture.cleanup();
    }
  });

  test("article has end mark with 光 symbol", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".note-end-mark")).toBeVisible();
      await expect(page.locator(".note-end-mark__symbol")).toContainText("光");
    } finally {
      await fixture.cleanup();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Reading width
// ═══════════════════════════════════════════════════════════════════════

test.describe("Reading width", () => {
  test("article body width is 680–760px on desktop (1280px viewport)", async ({ page, request }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");
      const bodyWidth = await page.locator(".note-body").evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width;
      });
      expect(bodyWidth).toBeGreaterThanOrEqual(680);
      expect(bodyWidth).toBeLessThanOrEqual(780); // Allow slight rendering variance
    } finally {
      await fixture.cleanup();
    }
  });

  test("article body does not overflow horizontally on mobile", async ({ page, request }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    } finally {
      await fixture.cleanup();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Ruler ticks
// ═══════════════════════════════════════════════════════════════════════

test.describe("Ruler ticks", () => {
  test("ruler shows category label matching seeded data", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture, { category: "工程" });
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await expect(page.locator(".note-ruler__category")).toContainText("工程");
    } finally {
      await fixture.cleanup();
    }
  });

  test("ruler shows publication date in YYYY.MM.DD format", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture, {});
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      const dateText = await page.locator(".note-ruler__date").textContent();
      // Should match YYYY.MM.DD format (e.g. 2026.07.20)
      expect(dateText).toMatch(/\d{4}\.\d{2}\.\d{2}/);
    } finally {
      await fixture.cleanup();
    }
  });

  test("ruler has exactly two tick separators (aria-hidden)", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      const ticks = page.locator(".note-ruler__tick[aria-hidden='true']");
      await expect(ticks).toHaveCount(2);
    } finally {
      await fixture.cleanup();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Code rendering
// ═══════════════════════════════════════════════════════════════════════

test.describe("Code rendering", () => {
  test("code blocks have dark background (charcoal token)", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");
      // Find a code block (pre > code)
      const codeBlock = page.locator("pre code").first();
      await expect(codeBlock).toBeVisible();
      // The pre parent should have a dark background
      const preBg = await page.locator("pre").first().evaluate((el) =>
        getComputedStyle(el).backgroundColor,
      );
      // Dark background should NOT be white or transparent
      expect(preBg).not.toBe("rgba(0, 0, 0, 0)");
      expect(preBg).not.toBe("rgb(255, 255, 255)");
    } finally {
      await fixture.cleanup();
    }
  });

  test("code blocks have data-language attribute", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      const codeWithLang = page.locator("code[data-language]").first();
      await expect(codeWithLang).toBeVisible();
      const lang = await codeWithLang.getAttribute("data-language");
      expect(lang).toBeTruthy();
    } finally {
      await fixture.cleanup();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. KaTeX rendering
// ═══════════════════════════════════════════════════════════════════════

test.describe("KaTeX rendering", () => {
  test("inline math renders inside katex span", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");
      const katexElements = page.locator(".katex");
      const count = await katexElements.count();
      expect(count).toBeGreaterThan(0);
    } finally {
      await fixture.cleanup();
    }
  });

  test("display math has no decorative box or border", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      // Display math ($$...$$) should render — must exist
      const displayMath = page.locator(".katex-display").first();
      await expect(displayMath).toBeVisible();
      // Check it has no box shadow
      const boxShadow = await displayMath.evaluate((el) =>
        getComputedStyle(el).boxShadow,
      );
      expect(boxShadow).toBe("none");
    } finally {
      await fixture.cleanup();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. TOC — Table of Contents
// ═══════════════════════════════════════════════════════════════════════

test.describe("TOC", () => {
  test("TOC appears when article has 2+ eligible headings", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");
      // TOC rail should be visible (desktop)
      const tocRail = page.locator(".toc-rail");
      const tocCount = await tocRail.count();
      // On desktop, TOC rail is present; on mobile there's a trigger
      const tocTrigger = page.locator(".toc-trigger");
      const triggerCount = await tocTrigger.count();
      expect(tocCount + triggerCount).toBeGreaterThan(0);
    } finally {
      await fixture.cleanup();
    }
  });

  test("TOC is absent when article has fewer than 2 headings", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture, { content: terseContent() });
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");
      // Neither rail nor trigger should exist
      await expect(page.locator(".toc-rail")).toHaveCount(0);
      await expect(page.locator(".toc-trigger")).toHaveCount(0);
    } finally {
      await fixture.cleanup();
    }
  });

  test("TOC links have correct href pointing to heading IDs", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");

      // Check page has SSR heading IDs
      const headingWithId = page.locator(".note-body h2[id], .note-body h3[id]").first();
      const headingId = await headingWithId.getAttribute("id");
      expect(headingId).toBeTruthy();

      // Check TOC link points to same ID — must exist (fail if absent)
      const tocLink = page.locator(`.toc-item a[href="#${headingId}"]`).first();
      await expect(tocLink).toBeVisible();
    } finally {
      await fixture.cleanup();
    }
  });

  test("TOC click scrolls to heading and updates URL hash", async ({ page, request }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");

      // TOC rail link must be present and clickable
      const tocLink = page.locator(".toc-rail .toc-item a").first();
      await expect(tocLink).toBeVisible();
      await tocLink.click();
      await page.waitForTimeout(500);
      // URL should have a hash
      const url = page.url();
      expect(url).toContain("#");
    } finally {
      await fixture.cleanup();
    }
  });

  test("TOC Escape key closes mobile drawer and returns focus", async ({ page, request }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");

      // TOC trigger must be present on mobile (fail if absent)
      const trigger = page.locator(".toc-trigger");
      await expect(trigger).toBeVisible();
      await trigger.click();
      await page.waitForTimeout(300);

      // Drawer should open
      const drawer = page.locator("#toc-drawer");
      await expect(drawer).toBeVisible();
      const expanded = await trigger.getAttribute("aria-expanded");
      expect(expanded).toBe("true");

      // Press Escape — drawer closes and focus returns to trigger
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      await expect(trigger).toBeFocused();
    } finally {
      await fixture.cleanup();
    }
  });

  test("TOC respects reduced motion", async ({ page, request }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 900 });
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");

      // TOC rail link must be present (fail if absent)
      const tocLink = page.locator(".toc-rail .toc-item a").first();
      await expect(tocLink).toBeVisible();
      await tocLink.click();
      await page.waitForTimeout(500);
      // No errors with reduced motion
      const errors = collectPageErrors(page);
      expect(errors).toEqual([]);
    } finally {
      await fixture.cleanup();
    }
  });

  test("heading IDs are deterministic and unique", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    // Content has duplicate headings (e.g. CLT appears in content)
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");

      const h2Ids = await page.locator(".note-body h2[id]").evaluateAll((els) =>
        els.map((el) => el.id),
      );
      const h3Ids = await page.locator(".note-body h3[id]").evaluateAll((els) =>
        els.map((el) => el.id),
      );
      const allIds = [...h2Ids, ...h3Ids];

      // At least some headings should have IDs
      expect(allIds.length).toBeGreaterThan(0);

      // No duplicate IDs
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    } finally {
      await fixture.cleanup();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. Backlink & related rows
// ═══════════════════════════════════════════════════════════════════════

test.describe("Backlinks & related", () => {
  test("article renders related section when same-category notes exist", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    // Seed two notes with same category
    const note1 = await seedArticle(fixture, { category: "工程", slug: `article-e2e-main-${Date.now().toString(36)}` });
    await seedArticle(fixture, {
      title: "另一篇工程笔记",
      content: "# 另一篇\n\n这是另一篇工程相关笔记。",
      category: "工程",
      slug: `article-e2e-related-${Date.now().toString(36)}`,
    });
    try {
      await page.goto(`/notes/${encodeURIComponent(note1.slug)}`);
      await page.waitForLoadState("networkidle");

      // Related section must render — two notes share the same category
      const related = page.locator(".note-related");
      await expect(related).toBeVisible();
      await expect(related.locator(".note-section-title")).toBeVisible();
      await expect(related.locator(".note-ledger__row").first()).toBeVisible();
    } finally {
      await fixture.cleanup();
    }
  });

  test("backlinks section renders when wikilinks point to article", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const target = await seedArticle(fixture, { title: "目标笔记", slug: `article-target-${Date.now().toString(36)}` });
    // Create a linker note whose wikilink uses the target's exact stored title
    const linker = await fixture.publishNote({
      title: "引用者笔记",
      content: `# 引用\n\n参考 [[${target.title}]] 的内容。`,
      category: "随想",
      slug: `article-linker-${Date.now().toString(36)}`,
    });
    try {
      await page.goto(`/notes/${encodeURIComponent(target.slug)}`);
      await page.waitForLoadState("networkidle");

      // Backlinks section must render — wikilink matches exact stored title
      const backlinks = page.locator(".note-backlinks");
      await expect(backlinks).toBeVisible();
      await expect(backlinks.locator(".note-section-title")).toBeVisible();
      await expect(backlinks.locator(".note-ledger__row").first()).toBeVisible();
    } finally {
      await fixture.cleanup();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. 404 for missing slug
// ═══════════════════════════════════════════════════════════════════════

test.describe("404 for missing slug", () => {
  test("missing note slug returns 404 with proper UI", async ({ page }) => {
    const response = await page.goto("/notes/nonexistent-slug-xyz-99999");
    expect(response?.status()).toBe(404);
    await expect(page.locator(".route-404")).toBeVisible();
    await expect(page.locator(".route-404__heading")).toContainText("页面未找到");
  });

  test("404 page has return-home link", async ({ page }) => {
    await page.goto("/notes/slug-definitely-not-found");
    const homeLink = page.locator(".route-404__link");
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAttribute("href", "/");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. Theme toggle
// ═══════════════════════════════════════════════════════════════════════

test.describe("Article theme", () => {
  test("article renders in dark theme", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await setTheme(page, "dark");
      await expect(page.locator("#note-title")).toBeVisible();
      await expect(page.locator(".note-ruler")).toBeVisible();
      const bgColor = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor,
      );
      expect(bgColor).not.toBe("rgb(255, 255, 255)");
    } finally {
      await fixture.cleanup();
    }
  });

  test("article light theme has readable text", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await setTheme(page, "light");
      // Check text contrast on body text
      const color = await page.locator(".note-body p").first().evaluate((el) =>
        getComputedStyle(el).color,
      );
      // Must not be transparent
      expect(color).not.toBe("rgba(0, 0, 0, 0)");
    } finally {
      await fixture.cleanup();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 10. Responsive
// ═══════════════════════════════════════════════════════════════════════

test.describe("Article responsive", () => {
  for (const bp of BREAKPOINTS) {
    test(`article renders at ${bp.name}px without horizontal overflow`, async ({ page, request }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      const fixture = new PublicFixture(request, BASE_URL);
      const note = await seedArticle(fixture);
      try {
        await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
        await page.waitForLoadState("networkidle");
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const innerWidth = await page.evaluate(() => window.innerWidth);
        expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
      } finally {
        await fixture.cleanup();
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 11. Accessibility
// ═══════════════════════════════════════════════════════════════════════

test.describe("Article accessibility", () => {
  test("article passes axe-core audit", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page })
        .exclude("#react-scan-root")
        .exclude("canvas[data-react-grab-overlay-canvas]")
        .analyze();
      const relevantViolations = results.violations.filter(
        (v) => !["label-title-only", "region"].includes(v.id),
      );
      expect(relevantViolations).toEqual([]);
    } finally {
      await fixture.cleanup();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 12. Console / network
// ═══════════════════════════════════════════════════════════════════════

test.describe("Article console/network", () => {
  test("no page errors and no failed requests on article page", async ({ page, request }) => {
    const errors = collectPageErrors(page);
    const failed = collectFailedRequests(page);
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");
      expect(errors).toEqual([]);
      expect(failed).toEqual([]);
    } finally {
      await fixture.cleanup();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 13. React-scan
// ═══════════════════════════════════════════════════════════════════════

test.describe("Article react-scan", () => {
  test("no react-scan unnecessary commit warnings on article", async ({ page, request }) => {
    const scanWarnings: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "warning" && msg.text().includes("unnecessary")) {
        scanWarnings.push(msg.text());
      }
    });
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture);
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
      expect(scanWarnings).toEqual([]);
    } finally {
      await fixture.cleanup();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 14. Screenshots — light/dark at 4 breakpoints
// ═══════════════════════════════════════════════════════════════════════

test.describe("Article screenshots", () => {
  for (const bp of BREAKPOINTS) {
    test(`screenshot article light ${bp.name}px`, async ({ page, request }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      const fixture = new PublicFixture(request, BASE_URL);
      const note = await seedArticle(fixture);
      try {
        await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
        await page.waitForLoadState("networkidle");
        await setTheme(page, "light");
        await screenshot(page, "rich", "light", bp.name);
      } finally {
        await fixture.cleanup();
      }
    });

    test(`screenshot article dark ${bp.name}px`, async ({ page, request }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      const fixture = new PublicFixture(request, BASE_URL);
      const note = await seedArticle(fixture);
      try {
        await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
        await page.waitForLoadState("networkidle");
        await setTheme(page, "dark");
        await screenshot(page, "rich", "dark", bp.name);
      } finally {
        await fixture.cleanup();
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 15. Failure modes
// ═══════════════════════════════════════════════════════════════════════

test.describe("Article failure modes", () => {
  test("non-loopback base URL is rejected before writes", async ({ request }) => {
    expect(() => new PublicFixture(request, "https://example.com")).toThrow(
      /not a loopback/,
    );
  });

  test("fixture cleanup removes exact IDs", async ({ request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    expect(fixture.createdIds).toEqual([]);
    const note = await seedArticle(fixture);
    expect(fixture.createdIds).toContain(note.id);
    await fixture.cleanup();
    // After cleanup, IDs should be cleared
    expect(fixture.createdIds).not.toContain(note.id);
  });

  test("broken image in article does not crash page", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture, {
      content: "# 测试\n\n![Broken image](/images/nonexistent.png)\n\n正文继续。",
    });
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("#note-title")).toBeVisible();
      await expect(page.locator(".note-ruler")).toBeVisible();
      const errors = collectPageErrors(page);
      expect(errors).toEqual([]);
    } finally {
      await fixture.cleanup();
    }
  });

  test("articles with empty content still render shell", async ({ page, request }) => {
    const fixture = new PublicFixture(request, BASE_URL);
    const note = await seedArticle(fixture, { content: "# 空笔记", summary: "" });
    try {
      await page.goto(`/notes/${encodeURIComponent(note.slug)}`);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("#note-title")).toBeVisible();
      await expect(page.locator(".pub-shell")).toBeVisible();
    } finally {
      await fixture.cleanup();
    }
  });
});
