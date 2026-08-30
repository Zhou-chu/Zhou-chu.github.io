import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  bootstrapVault,
  createSnapshot,
  pullSnapshotToVault,
  writeSyncState,
  writeManifest,
} from "./lib/obsidian-sync.mjs";

const projectRoot = path.resolve(import.meta.dirname, "..");

function parseArgs(argv) {
  const args = { command: argv[0] || "check", force: false, prune: false, yes: false };
  for (let index = 1; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--force") args.force = true;
    if (value === "--prune") args.prune = true;
    if (value === "--yes" || value === "-y") args.yes = true;
    if (value === "--vault") args.vaultPath = argv[++index];
    if (value === "--site") args.siteUrl = argv[++index];
    if (value === "--only") args.only = argv[++index];
  }
  return args;
}

/** 按 --only 过滤笔记（支持完整相对路径或文件名后缀匹配），用于单篇上传/发布。 */
function selectNotes(notes, only) {
  if (!only) return notes;
  const key = String(only).replaceAll("\\", "/").toLowerCase();
  const picked = notes.filter((note) => {
    const p = note.relativePath.toLowerCase();
    return p === key || p.endsWith(`/${key}`) || p.endsWith(key);
  });
  if (!picked.length) throw new Error(`--only 未匹配到任何公开笔记：${only}`);
  return picked;
}

function run(command, args, options = {}) {
  // Windows 下 npm/npx 是 .cmd 批处理垫片，execFileSync 无法直接拉起（EINVAL），须经 cmd.exe 转发。
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(command)) {
    const cmdline = `${command} ${args.join(" ")}`;
    return execFileSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", cmdline], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: options.capture ? "pipe" : "inherit",
      ...options,
    });
  }
  return execFileSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    ...options,
  });
}

/**
 * 全自动解析管理员密码：环境变量优先，否则回退读取 Obsidian 插件已保存的密码。
 * 这样「发布 / 上传」无需每次手动设置 BLOG_ADMIN_PASSWORD 即可一键上线。
 */
async function resolveAdminPassword(vaultPath) {
  const fromEnv = process.env.BLOG_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (fromEnv) return fromEnv;
  const pluginData = path.join(vaultPath, ".obsidian", "plugins", "komorebi-blog-sync", "data.json");
  try {
    if (existsSync(pluginData)) {
      const parsed = JSON.parse(await readFile(pluginData, "utf8"));
      const stored = parsed && parsed.adminPassword;
      if (typeof stored === "string" && stored.trim()) return stored.trim();
    }
  } catch {
    // 读取失败视为未配置，由 upload 阶段报出可读错误
  }
  return "";
}

async function loadConfig(args) {
  const raw = await readFile(path.join(projectRoot, "obsidian-sync.config.json"), "utf8");
  const config = JSON.parse(raw);
  config.vaultPath = path.resolve(args.vaultPath || process.env.OBSIDIAN_VAULT_PATH || config.vaultPath);
  config.siteUrl = args.siteUrl || config.siteUrl;
  config.snapshotDirectory = path.resolve(projectRoot, config.snapshotDirectory);
  config.assetDirectory = path.resolve(projectRoot, config.assetDirectory);
  config.adminPassword = await resolveAdminPassword(config.vaultPath);
  return config;
}

async function fetchAllLiveNotes(siteUrl) {
  const notes = [];
  let cursor = null;
  do {
    const url = new URL("/api/notes", siteUrl);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("after", String(cursor));
    const response = await fetch(url);
    if (!response.ok) throw new Error(`读取线上博客失败：HTTP ${response.status}`);
    const data = await response.json();
    notes.push(...(data.notes || []));
    cursor = data.nextCursor || null;
  } while (cursor);
  return notes;
}

async function bootstrap(config, args) {
  const liveNotes = await fetchAllLiveNotes(config.siteUrl);
  const snapshotIndex = JSON.parse(await readFile(path.join(projectRoot, "app/lib/obsidian-index.json"), "utf8"));
  const result = await bootstrapVault({
    vaultPath: config.vaultPath,
    liveNotes,
    snapshotIndex,
    assetSourceDirectory: config.assetDirectory,
    force: args.force,
  });
  console.log(`首次同步完成：${result.noteCount} 篇线上笔记、${result.assetCount} 个引用附件已写入 ${config.vaultPath}`);
}

function gitChangedFiles() {
  return run("git", ["status", "--porcelain=v1"], { capture: true })
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^"|"$/g, ""));
}

function assertPublishWorktree(changedFiles, allowedRoots) {
  const unrelated = changedFiles.filter((file) => !allowedRoots.some((root) => file === root || file.startsWith(`${root}/`) || file.startsWith(`${root}\\`)));
  if (unrelated.length) throw new Error(`检测到同步范围之外的未提交修改，已停止自动发布：\n- ${unrelated.join("\n- ")}`);
}

function assertRemoteCurrent() {
  run("git", ["fetch", "origin", "main"]);
  const behind = Number(run("git", ["rev-list", "--count", "HEAD..origin/main"], { capture: true }).trim() || "0");
  if (behind > 0) throw new Error(`GitHub 上有 ${behind} 个后台更新尚未拉取；请先运行 npm run obsidian:pull`);
}

async function buildSnapshot(config, args, write) {
  if (!existsSync(config.vaultPath)) throw new Error(`找不到 Obsidian Vault：${config.vaultPath}`);
  const result = await createSnapshot({
    vaultPath: config.vaultPath,
    snapshotDirectory: config.snapshotDirectory,
    assetDirectory: config.assetDirectory,
    defaultCategory: config.defaultCategory,
    write,
  });
  if (write) {
    await writeManifest(path.join(projectRoot, "content/obsidian-manifest.json"), result.manifest);
  }
  console.log(`同步预览：${result.notes.length} 篇公开笔记，${result.assets.length} 个本地附件${args.prune ? "；缺失文章将下架" : "；不会删除或下架线上文章"}`);
  return result;
}

async function adminCookie(siteUrl, password) {
  if (!password) return "";
  const response = await fetch(new URL("/api/admin/login", siteUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw new Error(`博客管理员登录失败：HTTP ${response.status}`);
  const setCookie = response.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";", 1)[0];
  if (!cookie) throw new Error("博客登录成功但没有返回会话 Cookie");
  return cookie;
}

async function uploadNotes(siteUrl, notes, prune, password) {
  const cookie = await adminCookie(siteUrl, password);
  let uploaded = 0;
  for (const note of notes) {
    const response = await fetch(new URL("/api/admin/notes", siteUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({
        title: note.title,
        slug: note.slug,
        summary: note.summary,
        content: note.content,
        category: note.category,
        status: "published",
        featured: note.featured,
        publishedAt: note.publishedAt,
        tags: note.tags,
        links_json: JSON.stringify(note.outgoing),
        sourcePath: note.relativePath,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const hint = response.status === 403 && !cookie ? "；请设置 BLOG_ADMIN_PASSWORD 环境变量或确认插件已保存管理员密码" : "";
      throw new Error(`上传《${note.title}》失败：${data.error || `HTTP ${response.status}`}${hint}`);
    }
    uploaded += 1;
  }
  if (prune) {
    const response = await fetch(new URL("/api/admin/notes/prune", siteUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({ activeSourcePaths: notes.map((note) => note.relativePath) }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(`下架已移除文章失败：${data.error || `HTTP ${response.status}`}`);
    }
  }
  return uploaded;
}

async function sync(config, args) {
  await buildSnapshot(config, args, true);
  console.log("Git 内容快照已更新；尚未推送 GitHub，也未修改线上博客。");
}

async function upload(config, args) {
  const result = await buildSnapshot(config, args, false);
  const uploaded = await uploadNotes(config.siteUrl, selectNotes(result.notes, args.only), args.prune, config.adminPassword);
  const scope = args.only ? `（仅 ${args.only}）` : "";

  // 新增了本地图片时：备份到 Git 并重新部署，让 /obsidian-assets/* 真正可访问。
  const assetChanged = gitChangedFiles().some((file) => file.replaceAll("\\", "/").startsWith("public/obsidian-assets/"));
  if (assetChanged) {
    try {
      run("git", ["add", "--", "content", "public/obsidian-assets"]);
      const staged = run("git", ["diff", "--cached", "--name-only"], { capture: true }).trim();
      if (staged) run("git", ["commit", "-m", `content: sync obsidian assets${args.only ? ` (${args.only})` : ""}`]);
      run("git", ["push", "origin", "HEAD:main"]);
    } catch (error) {
      console.log(`⚠ Git 备份失败（不影响本次上线）：${error.message}`);
    }
    console.log("检测到新增图片，正在构建并部署静态资源（约 1 分钟）……");
    run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);
    run(process.platform === "win32" ? "npx.cmd" : "npx", ["wrangler", "deploy"]);
    console.log("✅ 图片资源已部署上线。");
  }

  await writeSyncState(config.vaultPath, result.notes);
  console.log(`内容上传完成：${uploaded} 篇笔记${scope}${assetChanged ? "（含图片部署）" : ""}。`);
}

async function pull(config, args) {
  const changed = gitChangedFiles();
  if (changed.length) throw new Error("博客项目中存在未提交修改，已停止拉取；请先提交或处理这些修改");
  run("git", ["pull", "--ff-only", "origin", "main"]);
  const result = await pullSnapshotToVault({
    vaultPath: config.vaultPath,
    snapshotDirectory: config.snapshotDirectory,
    assetDirectory: config.assetDirectory,
    defaultCategory: config.defaultCategory,
    prune: args.prune,
  });
  console.log(`本地拉取完成：更新 ${result.applied} 篇、未变化 ${result.unchanged} 篇、保留本地修改 ${result.keptLocal} 篇。`);
  if (result.pendingRemovals.length) console.log(`有 ${result.pendingRemovals.length} 篇已从 GitHub 移除；如需移入本地回收站，请附加 --prune。`);
  if (result.conflicts.length) {
    throw new Error(`发现 ${result.conflicts.length} 个双向修改冲突，未覆盖本地文件：\n- ${result.conflicts.join("\n- ")}`);
  }
}

async function publish(config, args) {
  assertRemoteCurrent();
  const result = await buildSnapshot(config, args, true);
  const allowedRoots = ["content", "public/obsidian-assets"];
  const changedBeforeCommit = gitChangedFiles();
  assertPublishWorktree(changedBeforeCommit, allowedRoots);
  const assetChanged = changedBeforeCommit.some((file) => file.replaceAll("\\", "/").startsWith("public/obsidian-assets/"));

  run("git", ["add", "--", "content", "public/obsidian-assets"]);
  const staged = run("git", ["diff", "--cached", "--name-only"], { capture: true }).trim();
  if (staged) run("git", ["commit", "-m", `content: sync ${result.notes.length} Obsidian notes`]);
  try {
    run("git", ["push", "origin", "HEAD:main"]);
  } catch {
    throw new Error(
      "Git 推送 GitHub 失败（通常是尚未登录或凭据已过期，本机无法弹出授权窗口时尤为常见）。" +
        "修复方法：在任意终端进入博客项目目录，手动执行一次 git push origin main 并完成浏览器授权；" +
        "授权会记住凭据，之后发布即可自动推送。若暂时不想动 GitHub，可改用「仅上传」命令直接同步线上博客。"
    );
  }

  const uploaded = await uploadNotes(config.siteUrl, selectNotes(result.notes, args.only), args.prune, config.adminPassword);
  await writeSyncState(config.vaultPath, result.notes);
  if (assetChanged) {
    const wrangler = process.platform === "win32" ? "npx.cmd" : "npx";
    run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);
    run(wrangler, ["wrangler", "deploy"]);
  }
  console.log(`发布完成：GitHub 与线上博客已同步 ${uploaded} 篇笔记。`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = await loadConfig(args);
  if (args.command === "bootstrap") return bootstrap(config, args);
  if (args.command === "check") return buildSnapshot(config, args, false);
  if (args.command === "sync") return sync(config, args);
  if (args.command === "upload") return upload(config, args);
  if (args.command === "pull") return pull(config, args);
  if (args.command === "publish") return publish(config, args);
  throw new Error(`未知命令：${args.command}`);
}

main()
  .then(() => {
    // 显式退出：避免 HTTP keep-alive 等悬挂句柄让进程迟迟不退出，
    // 导致 Obsidian 插件端一直显示「运行中」。
    process.exit(process.exitCode || 0);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
