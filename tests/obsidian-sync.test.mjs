import assert from "node:assert/strict";
import test from "node:test";
import {
  isSafeRelativePath,
  parseFrontmatter,
  serializeSnapshotNote,
} from "../scripts/lib/obsidian-sync.mjs";

test("parses Obsidian frontmatter scalars and tag lists", () => {
  const parsed = parseFrontmatter(`---
blog: true
title: "测试：笔记"
tags:
  - React
  - "Cloudflare Workers"
featured: false
---
# 正文
`);
  assert.equal(parsed.attributes.blog, true);
  assert.equal(parsed.attributes.title, "测试：笔记");
  assert.deepEqual(parsed.attributes.tags, ["React", "Cloudflare Workers"]);
  assert.match(parsed.body, /# 正文/);
});

test("rejects paths that can escape the configured vault or snapshot", () => {
  assert.equal(isSafeRelativePath("projects/note.md"), true);
  assert.equal(isSafeRelativePath("../private.md"), false);
  assert.equal(isSafeRelativePath("D:/private.md"), false);
  assert.equal(isSafeRelativePath("/private.md"), false);
});

test("serializes a reproducible public Markdown snapshot", () => {
  const markdown = serializeSnapshotNote({
    title: "标题",
    slug: "title-12345678",
    summary: "摘要",
    publishedAt: "2026-08-10",
    category: "技术",
    featured: true,
    tags: ["React"],
    content: "# 标题\n\n正文",
  });
  assert.match(markdown, /^---\nblog: true/);
  assert.match(markdown, /slug: "title-12345678"/);
  assert.match(markdown, /  - "React"/);
  assert.match(markdown, /# 标题\n\n正文\n$/);
});
