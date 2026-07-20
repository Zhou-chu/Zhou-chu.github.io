import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import { getTestEnv } from "./support/cloudflare-workers-stub.mjs";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    getTestEnv({
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    }),
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

// ─── SSR Smoke ──────────────────────────────────────────────────────

describe("server-rendered homepage", () => {
  test("returns 200 with text/html content-type", async () => {
    const response = await render();
    assert.equal(response.status, 200);
    const ct = response.headers.get("content-type") ?? "";
    assert.match(ct, /^text\/html\b/i);
  });

  test("produces well-formed HTML with a document element", async () => {
    const response = await render();
    const html = await response.text();
    // Must contain something resembling a valid HTML document root.
    assert.match(html, /<html[\s>]/i);
    assert.match(html, /<head[\s>]/i);
    assert.match(html, /<body[\s>]/i);
  });

  test("contains a non-empty title", async () => {
    const response = await render();
    const html = await response.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    assert.ok(titleMatch, "HTML must contain a <title> element");
    assert.ok(titleMatch[1].trim().length > 0, "Title must not be empty");
  });

  test("does not contain fatal error markers", async () => {
    const response = await render();
    const html = await response.text();
    assert.doesNotMatch(html, /Internal Server Error/i);
    assert.doesNotMatch(html, /Cannot GET/i);
    assert.doesNotMatch(html, /Unexpected Application Error/i);
  });
});

// ─── Build output ───────────────────────────────────────────────────

describe("build output", () => {
  test("dist/server/index.js exists after build", async () => {
    const indexFile = new URL("../dist/server/index.js", import.meta.url);
    const stat = await readFile(indexFile, "utf8");
    assert.ok(stat.length > 0, "dist/server/index.js must be non-empty");
  });

  test("dist/server/index.js contains a default export (worker entry)", async () => {
    const source = await readFile(
      new URL("../dist/server/index.js", import.meta.url),
      "utf8",
    );
    assert.match(source, /export\s*\{/);
  });
});

// ─── /c redirect ────────────────────────────────────────────────────

describe("/c permanent redirect", () => {
  test("GET /c returns 301/308 redirect to /", async () => {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-c`);
    const { default: worker } = await import(workerUrl.href);

    const response = await worker.fetch(
      new Request("http://localhost/c", {
        headers: { accept: "text/html" },
      }),
      getTestEnv({
        ASSETS: {
          fetch: async () => new Response("Not found", { status: 404 }),
        },
      }),
      {
        waitUntil() {},
        passThroughOnException() {},
      },
    );
    // Status must be a permanent redirect
    assert.ok(
      response.status === 301 || response.status === 308,
      `Expected 301 or 308, got ${response.status}`,
    );
    // Location header must point to /
    const location = response.headers.get("location") ?? "";
    assert.ok(
      location.endsWith("/") && !location.includes("/c"),
      `Expected redirect to /, got ${location}`,
    );
  });
});

// ─── Scaffold-free — no starter leftovers ───────────────────────────

describe("no starter scaffolding", () => {
  test("HTML does not reference react-loading-skeleton", async () => {
    const response = await render();
    const html = await response.text();
    assert.doesNotMatch(html, /react-loading-skeleton/i);
  });

  test("HTML does not contain codex-preview development meta", async () => {
    const response = await render();
    const html = await response.text();
    assert.doesNotMatch(html, /codex-preview/i);
  });

  test("app/layout.tsx does not reference _sites-preview", async () => {
    const layoutSource = await readFile(
      new URL("../app/layout.tsx", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(layoutSource, /_sites-preview/i);
  });

  test("app/page.tsx does not reference SkeletonPreview", async () => {
    const pageSource = await readFile(
      new URL("../app/page.tsx", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(pageSource, /SkeletonPreview/i);
  });

  test("no _sites-preview directory exists in app/", async () => {
    // The _sites-preview directory from the starter must not exist.
    // Access will throw ENOENT if the directory is missing.
    await assert.rejects(
      () => readFile(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)),
      /ENOENT/,
    );
  });
});
