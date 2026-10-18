/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { migrate } from "drizzle-orm/d1/migrator";
import { getDb } from "../db/index";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

let migrationsReady = false;

async function runMigrations(env: Env) {
  if (migrationsReady) return;
  try {
    // File-based migration — works in local dev (Miniflare has fs),
    // but will fail silently in production Workers (no Node.js fs).
    // Production schema changes are handled by reconcileSchema below.
    const db = getDb();
    await migrate(db, { migrationsFolder: "./drizzle" });
  } catch (e) {
    console.error("Migration error (non-fatal):", e);
  }

  // FALLBACK: create core tables with raw SQL if they don't exist yet.
  // Uses the full current schema so fresh databases start correctly.
  try {
    // prepare().run() rather than exec(): exec() splits on newlines, so the
    // multi-line CREATE TABLE failed on fresh databases (e.g. local dev).
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '随想',
      status TEXT NOT NULL DEFAULT 'draft',
      featured INTEGER NOT NULL DEFAULT 0,
      author_email TEXT NOT NULL,
      published_at TEXT,
      source_path TEXT,
      links_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS site_settings (id INTEGER PRIMARY KEY, copy_json TEXT NOT NULL DEFAULT '{}', updated_by TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
    await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS notes_slug_idx ON notes(slug)").run();
    await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS notes_title_author_idx ON notes(title, author_email)").run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS notes_status_published_idx ON notes(status, published_at)").run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS notes_author_idx ON notes(author_email)").run();
  } catch (e2) {
    console.error("Fallback table creation error (non-fatal):", e2);
  }

  // SCHEMA RECONCILIATION: add columns that may be missing from existing
  // tables when a previous deploy created the table without them. Each
  // statement is wrapped in try/catch so it's safe to run on every deploy.
  const reconcileStatements = [
    "ALTER TABLE notes ADD COLUMN tags_json text DEFAULT '[]' NOT NULL",
    "CREATE UNIQUE INDEX IF NOT EXISTS notes_title_author_idx ON notes(title, author_email)",
  ];
  for (const sql of reconcileStatements) {
    try {
      await env.DB.exec(sql);
    } catch {
      // Column already exists or index already present — safe to ignore.
    }
  }

  migrationsReady = true;
}

const NOTE_DOCUMENT_PATH = /^\/notes\/([^/]+)$/;

function isDocumentRequest(request: Request): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (request.headers.get("rsc")) return false;
  return !(request.headers.get("accept") || "").includes("text/x-component");
}

async function publishedSlugExists(env: Env, slug: string): Promise<boolean> {
  const row = await env.DB.prepare("SELECT 1 FROM notes WHERE slug = ? AND status = 'published' LIMIT 1").bind(slug).first();
  return Boolean(row);
}

/**
 * 根 app/loading.tsx 会让页面以流式输出，响应头在查库前就以 200 发出，
 * 导致不存在的文章是「软 404」、旧 slug 的 permanentRedirect 只能在客户端跳转。
 * 对整页文档请求在这里先查一次 slug：旧链接（带 -<8 位时间戳> 后缀或含大写）
 * 直接 308，到不了的文章把状态码改成 404。RSC 导航请求不受影响。
 */
async function resolveNoteDocument(request: Request, env: Env, url: URL): Promise<Response | "missing" | null> {
  const match = url.pathname.match(NOTE_DOCUMENT_PATH);
  if (!match || !isDocumentRequest(request)) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(match[1]);
  } catch {
    return "missing";
  }
  if (await publishedSlugExists(env, slug)) return null;

  const candidates = new Set<string>();
  const lower = slug.toLowerCase();
  if (lower !== slug) candidates.add(lower);
  const legacy = lower.match(/^(.+)-[0-9a-z]{8}$/);
  if (legacy) candidates.add(legacy[1]);
  for (const candidate of candidates) {
    if (await publishedSlugExists(env, candidate)) {
      const target = new URL(`/notes/${encodeURIComponent(candidate)}${url.search}`, url);
      return Response.redirect(target.toString(), 308);
    }
  }
  return "missing";
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    await runMigrations(env);
    const url = new URL(request.url);

    let noteMissing = false;
    try {
      const resolved = await resolveNoteDocument(request, env, url);
      if (resolved instanceof Response) return resolved;
      noteMissing = resolved === "missing";
    } catch (error) {
      // Pre-check is best-effort; the page itself still handles lookups.
      console.error("Note pre-check failed (non-fatal):", error);
    }
    if (noteMissing) {
      const response = await handler.fetch(request, env, ctx);
      return new Response(response.body, { status: 404, statusText: "Not Found", headers: response.headers });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
