import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);
const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const IGNORED_DIRECTORIES = new Set([".git", ".obsidian", ".trash", "node_modules"]);

export function normalizePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

export function isSafeRelativePath(value) {
  const normalized = normalizePath(value);
  return normalized.length > 0
    && !normalized.startsWith("/")
    && !/^[a-z]:\//i.test(normalized)
    && !normalized.split("/").includes("..");
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      return JSON.parse(trimmed.replaceAll("'", '"'));
    } catch {
      return trimmed.slice(1, -1).split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    if (trimmed.startsWith('"')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed.slice(1, -1);
      }
    }
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  return trimmed;
}

export function parseFrontmatter(raw) {
  const normalized = raw.replaceAll("\r\n", "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { attributes: {}, body: normalized };

  const attributes = {};
  const lines = match[1].split("\n");
  let listKey = null;
  for (const line of lines) {
    const listItem = listKey ? line.match(/^\s*-\s+(.+)$/) : null;
    if (listItem) {
      attributes[listKey].push(parseScalar(listItem[1]));
      continue;
    }
    listKey = null;
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!value) {
      attributes[key] = [];
      listKey = key;
      continue;
    }
    attributes[key] = parseScalar(value);
  }
  return { attributes, body: match[2] };
}

function stringValue(value, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

function booleanValue(value) {
  if (typeof value === "boolean") return value;
  return typeof value === "string" && value.toLowerCase() === "true";
}

function tagsValue(value) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,，、]/) : [];
  return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))].slice(0, 50);
}

function cleanText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[.*?\]\(.*?\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, alias) => alias || target)
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromBody(body, relativePath) {
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading;
  return path.basename(relativePath, path.extname(relativePath));
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function stableSlug(title, relativePath) {
  const base = slugify(title) || "note";
  const suffix = createHash("sha256").update(normalizePath(relativePath)).digest("hex").slice(0, 8);
  return `${base}-${suffix}`;
}

function isoDate(value, fallbackDate) {
  const text = stringValue(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (fallbackDate instanceof Date && !Number.isNaN(fallbackDate.getTime())) return fallbackDate.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

async function walkFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(root, absolute));
    if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function resolvePublishFlag(attributes) {
  return booleanValue(attributes.blog) || booleanValue(attributes.publish) || booleanValue(attributes.published);
}

export async function readPublishedNotes(vaultPath, options = {}) {
  const files = await walkFiles(vaultPath);
  const markdownFiles = files.filter((file) => MARKDOWN_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const assetFiles = files.filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const assetsByName = new Map();
  for (const file of assetFiles) {
    const key = path.basename(file).toLowerCase();
    const matches = assetsByName.get(key) || [];
    matches.push(file);
    assetsByName.set(key, matches);
  }

  const notes = [];
  for (const absolutePath of markdownFiles) {
    const raw = await readFile(absolutePath, "utf8");
    const parsed = parseFrontmatter(raw);
    if (!resolvePublishFlag(parsed.attributes)) continue;
    const relativePath = normalizePath(path.relative(vaultPath, absolutePath));
    if (!isSafeRelativePath(relativePath)) throw new Error(`不安全的笔记路径：${relativePath}`);
    const fileStats = await stat(absolutePath);
    const title = stringValue(parsed.attributes.title) || titleFromBody(parsed.body, relativePath);
    const slug = stringValue(parsed.attributes.slug) || stableSlug(title, relativePath);
    const summary = stringValue(parsed.attributes.summary)
      || stringValue(parsed.attributes.description)
      || cleanText(parsed.body).slice(0, 220);
    notes.push({
      absolutePath,
      relativePath,
      title,
      slug,
      summary,
      content: parsed.body.trim(),
      category: stringValue(parsed.attributes.category, options.defaultCategory || "随想"),
      publishedAt: isoDate(parsed.attributes.date || parsed.attributes.publishedAt, fileStats.mtime),
      featured: booleanValue(parsed.attributes.featured),
      tags: tagsValue(parsed.attributes.tags),
      assetsByName,
    });
  }

  const duplicatePaths = new Set();
  const duplicateSlugs = new Set();
  const seenPaths = new Set();
  const seenSlugs = new Set();
  for (const note of notes) {
    const pathKey = note.relativePath.toLowerCase();
    const slugKey = note.slug.toLowerCase();
    if (seenPaths.has(pathKey)) duplicatePaths.add(note.relativePath);
    if (seenSlugs.has(slugKey)) duplicateSlugs.add(note.slug);
    seenPaths.add(pathKey);
    seenSlugs.add(slugKey);
  }
  if (duplicatePaths.size || duplicateSlugs.size) {
    throw new Error(`发现重复路径或 slug：${[...duplicatePaths, ...duplicateSlugs].join("、")}`);
  }
  return notes.sort((left, right) => left.relativePath.localeCompare(right.relativePath, "zh-CN"));
}

async function resolveAsset(note, target) {
  const decoded = decodeURIComponent(target.split("#")[0]).replace(/^<|>$/g, "");
  if (!decoded || /^(?:https?:|data:|\/obsidian-assets\/)/i.test(decoded)) return null;
  const relativeCandidate = path.resolve(path.dirname(note.absolutePath), decoded);
  try {
    const candidateStats = await stat(relativeCandidate);
    if (candidateStats.isFile() && IMAGE_EXTENSIONS.has(path.extname(relativeCandidate).toLowerCase())) return relativeCandidate;
  } catch {
    // Fall through to Obsidian's filename-based attachment lookup.
  }
  const matches = note.assetsByName.get(path.basename(decoded).toLowerCase()) || [];
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw new Error(`附件名称不唯一：${target}（来自 ${note.relativePath}）`);
  // Keep unresolved embeds unchanged. This preserves notes imported from the
  // live site even when their original local attachment was never archived.
  return null;
}

async function assetFilename(sourcePath) {
  const bytes = await readFile(sourcePath);
  const extension = path.extname(sourcePath).toLowerCase();
  return `${createHash("sha256").update(bytes).digest("hex").slice(0, 16)}${extension}`;
}

async function copyAsset(sourcePath, assetDirectory) {
  const filename = await assetFilename(sourcePath);
  const destination = path.join(assetDirectory, filename);
  await mkdir(assetDirectory, { recursive: true });
  try {
    await stat(destination);
  } catch {
    await writeFile(destination, bytes);
  }
  return filename;
}

export async function transformAssets(note, assetDirectory, writeAssets) {
  let content = note.content;
  const copied = [];
  const wikiPattern = /!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  for (const match of [...content.matchAll(wikiPattern)]) {
    const source = await resolveAsset(note, match[1]);
    if (!source) continue;
    const filename = writeAssets ? await copyAsset(source, assetDirectory) : await assetFilename(source);
    copied.push(filename);
    content = content.replace(match[0], `![](/obsidian-assets/${filename})`);
  }

  const markdownPattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  for (const match of [...content.matchAll(markdownPattern)]) {
    const rawTarget = match[2].trim().replace(/\s+["'].*["']$/, "");
    const source = await resolveAsset(note, rawTarget);
    if (!source) continue;
    const filename = writeAssets ? await copyAsset(source, assetDirectory) : await assetFilename(source);
    copied.push(filename);
    content = content.replace(match[0], `![${match[1]}](/obsidian-assets/${filename})`);
  }
  return { content, assets: [...new Set(copied)] };
}

function collectOutgoingSlugs(content, titleToSlug) {
  const slugs = [];
  for (const match of content.matchAll(/(?<!!)\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)) {
    const target = match[1].trim().toLowerCase();
    const slug = titleToSlug.get(target) || titleToSlug.get(path.basename(target).toLowerCase());
    if (slug) slugs.push(slug);
  }
  return [...new Set(slugs)];
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

export function serializeSnapshotNote(note) {
  const lines = [
    "---",
    "blog: true",
    `title: ${yamlString(note.title)}`,
    `slug: ${yamlString(note.slug)}`,
    `summary: ${yamlString(note.summary)}`,
    `date: ${note.publishedAt}`,
    `category: ${yamlString(note.category)}`,
    `featured: ${note.featured ? "true" : "false"}`,
  ];
  if (note.tags.length) {
    lines.push("tags:");
    for (const tag of note.tags) lines.push(`  - ${yamlString(tag)}`);
  }
  lines.push("---", "", note.content.trim(), "");
  return lines.join("\n");
}

export async function createSnapshot({ vaultPath, snapshotDirectory, assetDirectory, defaultCategory, write = true }) {
  const sourceNotes = await readPublishedNotes(vaultPath, { defaultCategory });
  const titleToSlug = new Map();
  for (const note of sourceNotes) {
    titleToSlug.set(note.title.toLowerCase(), note.slug);
    titleToSlug.set(path.basename(note.relativePath, path.extname(note.relativePath)).toLowerCase(), note.slug);
    titleToSlug.set(note.relativePath.replace(/\.(?:md|markdown)$/i, "").toLowerCase(), note.slug);
  }

  const notes = [];
  const assets = new Set();
  for (const sourceNote of sourceNotes) {
    const transformed = await transformAssets(sourceNote, assetDirectory, write);
    for (const filename of transformed.assets) assets.add(filename);
    notes.push({
      ...sourceNote,
      content: transformed.content,
      outgoing: collectOutgoingSlugs(sourceNote.content, titleToSlug),
    });
  }

  if (write) {
    const resolvedSnapshot = path.resolve(snapshotDirectory);
    if (path.parse(resolvedSnapshot).root === resolvedSnapshot) throw new Error("拒绝清理文件系统根目录");
    await rm(resolvedSnapshot, { recursive: true, force: true });
    await mkdir(resolvedSnapshot, { recursive: true });
    for (const note of notes) {
      const destination = path.resolve(resolvedSnapshot, note.relativePath);
      if (!destination.startsWith(`${resolvedSnapshot}${path.sep}`)) throw new Error(`快照路径越界：${note.relativePath}`);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, serializeSnapshotNote(note), "utf8");
    }
  }

  const manifest = {
    version: 1,
    source: "Obsidian",
    noteCount: notes.length,
    assetCount: assets.size,
    notes: notes.map((note) => ({
      sourcePath: note.relativePath,
      slug: note.slug,
      title: note.title,
      publishedAt: note.publishedAt,
      hash: createHash("sha256").update(note.content).digest("hex"),
    })),
  };
  return { notes, assets: [...assets].sort(), manifest };
}

export async function writeManifest(manifestPath, manifest) {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function safeBootstrapPath(relativePath, slug) {
  const normalized = normalizePath(relativePath || "");
  if (isSafeRelativePath(normalized) && MARKDOWN_EXTENSIONS.has(path.extname(normalized).toLowerCase())) return normalized;
  return `blog/${slug}.md`;
}

function rewriteWebAssetsForVault(content) {
  return content.replace(/!\[([^\]]*)\]\(\/obsidian-assets\/([^)]+)\)/g, (_match, _alt, filename) => `![[attachments/${filename}]]`);
}

export async function bootstrapVault({ vaultPath, liveNotes, snapshotIndex, assetSourceDirectory, force = false }) {
  await mkdir(vaultPath, { recursive: true });
  const existingMarkdown = (await walkFiles(vaultPath)).filter((file) => MARKDOWN_EXTENSIONS.has(path.extname(file).toLowerCase()));
  if (existingMarkdown.length && !force) throw new Error(`Vault 中已有 ${existingMarkdown.length} 篇 Markdown；如需覆盖请显式使用 --force`);

  const sourcePathByTitle = new Map(snapshotIndex.map((note) => [String(note.title).toLowerCase(), note.sourcePath]));
  const referencedAssets = new Set();
  for (const liveNote of liveNotes) {
    const relativePath = safeBootstrapPath(sourcePathByTitle.get(String(liveNote.title).toLowerCase()), liveNote.slug);
    const body = rewriteWebAssetsForVault(String(liveNote.content || ""));
    for (const match of body.matchAll(/!\[\[attachments\/([^\]]+)\]\]/g)) referencedAssets.add(match[1]);
    const note = {
      title: String(liveNote.title),
      slug: String(liveNote.slug),
      summary: String(liveNote.summary || ""),
      content: body,
      category: String(liveNote.category || "随想"),
      publishedAt: String(liveNote.publishedAt || new Date().toISOString().slice(0, 10)),
      featured: Boolean(liveNote.featured),
      tags: [],
    };
    const destination = path.resolve(vaultPath, relativePath);
    const resolvedVault = path.resolve(vaultPath);
    if (!destination.startsWith(`${resolvedVault}${path.sep}`)) throw new Error(`Vault 路径越界：${relativePath}`);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, serializeSnapshotNote(note), "utf8");
  }

  const attachments = path.join(vaultPath, "attachments");
  await mkdir(attachments, { recursive: true });
  for (const filename of referencedAssets) {
    const source = path.join(assetSourceDirectory, filename);
    const destination = path.join(attachments, filename);
    await cp(source, destination, { force: true });
  }
  await mkdir(path.join(vaultPath, ".obsidian"), { recursive: true });
  await writeFile(path.join(vaultPath, ".obsidian", "app.json"), `${JSON.stringify({ attachmentFolderPath: "attachments" }, null, 2)}\n`, "utf8");
  await writeFile(path.join(vaultPath, "同步说明.md"), "# 博客同步说明\n\n只有 frontmatter 中 `blog: true`、`publish: true` 或 `published: true` 的笔记会发布。\n\n在博客项目目录运行 `npm run obsidian:check` 预览，运行 `npm run obsidian:publish` 发布。\n", "utf8");
  return { noteCount: liveNotes.length, assetCount: referencedAssets.size };
}
