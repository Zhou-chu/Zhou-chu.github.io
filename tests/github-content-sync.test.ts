import assert from "node:assert/strict";
import test from "node:test";
import { publicSourcePath, serializePublicNote, syncNoteToGitHub } from "../app/lib/github-content-sync.ts";

const note = {
  slug: "hello-world",
  title: "Hello World",
  summary: "Summary",
  content: "# Hello\n\nBody",
  category: "技术",
  status: "published" as const,
  featured: true,
  publishedAt: "2026-08-10",
  sourcePath: "blog/hello.md",
  linksJson: '["another-note"]',
  tagsJson: '["React"]',
};

test("serializes the same public frontmatter contract used by Obsidian snapshots", () => {
  const markdown = serializePublicNote(note);
  assert.match(markdown, /^---\nblog: true/);
  assert.match(markdown, /tags:\n  - "React"/);
  assert.match(markdown, /outgoing:\n  - "another-note"/);
  assert.match(markdown, /# Hello\n\nBody\n$/);
});

test("uses sourcePath and rejects path traversal", () => {
  assert.equal(publicSourcePath(note), "blog/hello.md");
  assert.throws(() => publicSourcePath({ sourcePath: "../secret.md", slug: "secret" }), /不安全/);
});

test("creates a published Markdown file through the GitHub Contents API", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.GITHUB_CONTENT_TOKEN;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  process.env.GITHUB_CONTENT_TOKEN = "test-token";
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (init?.method === "GET") return new Response("{}", { status: 404 });
    return Response.json({ content: { sha: "new-sha" } }, { status: 201 });
  }) as typeof fetch;
  try {
    const result = await syncNoteToGitHub(note);
    assert.equal(result.action, "created");
    assert.equal(calls.length, 2);
    assert.match(calls[1].url, /content\/notes\/blog\/hello\.md$/);
    const body = JSON.parse(String(calls[1].init?.body));
    assert.equal(body.branch, "main");
    assert.match(Buffer.from(body.content, "base64").toString("utf8"), /title: "Hello World"/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.GITHUB_CONTENT_TOKEN;
    else process.env.GITHUB_CONTENT_TOKEN = originalToken;
  }
});
