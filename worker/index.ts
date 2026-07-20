/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { migrate } from "drizzle-orm/d1/migrator";
import { getDb } from "../db/index";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
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
    const db = getDb(); // uses env.DB

    await env.DB.exec("CREATE TABLE IF NOT EXISTS __drizzle_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at INTEGER)");
    await env.DB.exec("INSERT OR IGNORE INTO __drizzle_migrations (hash, created_at) VALUES ('baseline-0000', unixepoch() * 1000), ('baseline-0001', unixepoch() * 1000)");

    await migrate(db, { migrationsFolder: "./drizzle" });
  } catch (e) {
    console.error("Migration error (non-fatal):", e);
  }

  // FALLBACK: create core tables with raw SQL if migration didn't work (local dev)
  try {
    await env.DB.exec("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT '随想', status TEXT NOT NULL DEFAULT 'draft', featured INTEGER NOT NULL DEFAULT 0, author_email TEXT NOT NULL, published_at TEXT, source_path TEXT, links_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
    await env.DB.exec("CREATE TABLE IF NOT EXISTS site_settings (id INTEGER PRIMARY KEY, copy_json TEXT NOT NULL DEFAULT '{}', updated_by TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
    await env.DB.exec("CREATE UNIQUE INDEX IF NOT EXISTS notes_slug_idx ON notes(slug)");
    await env.DB.exec("CREATE INDEX IF NOT EXISTS notes_status_published_idx ON notes(status, published_at)");
    await env.DB.exec("CREATE INDEX IF NOT EXISTS notes_author_idx ON notes(author_email)");
  } catch (e2) {
    console.error("Fallback table creation error (non-fatal):", e2);
  }

  migrationsReady = true;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    await runMigrations(env);
    const url = new URL(request.url);

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
