import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createSnapshot,
  decidePullAction,
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

test("decides safe manual pull behavior from the last synchronized fingerprint", () => {
  assert.equal(decidePullAction(null, "remote", null), "apply_remote");
  assert.equal(decidePullAction("same", "same", "old"), "unchanged");
  assert.equal(decidePullAction("base", "remote", "base"), "apply_remote");
  assert.equal(decidePullAction("local", "base", "base"), "keep_local");
  assert.equal(decidePullAction("local", "remote", "base"), "conflict");
});

test("hashes and copies a local Obsidian attachment into the public snapshot", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gm2-obsidian-sync-"));
  try {
    const vault = path.join(root, "vault");
    const snapshot = path.join(root, "snapshot");
    const assets = path.join(root, "assets");
    await mkdir(path.join(vault, "attachments"), { recursive: true });
    await writeFile(path.join(vault, "attachments", "image.png"), Buffer.from("fake-png"));
    await writeFile(path.join(vault, "note.md"), "---\nblog: true\ntitle: Test\n---\n![[attachments/image.png]]\n");
    const result = await createSnapshot({ vaultPath: vault, snapshotDirectory: snapshot, assetDirectory: assets, defaultCategory: "随想", write: true });
    assert.equal(result.notes.length, 1);
    assert.equal(result.assets.length, 1);
    const markdown = await readFile(path.join(snapshot, "note.md"), "utf8");
    assert.match(markdown, /!\[\]\(\/obsidian-assets\/[a-f0-9]{16}\.png\)/);
    assert.equal((await readFile(path.join(assets, result.assets[0]))).toString(), "fake-png");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
