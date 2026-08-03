/**
 * Node.js stub for `cloudflare:workers` module.
 *
 * Creates a FRESH IN-MEMORY SQLite database per test process using
 * `node:sqlite` DatabaseSync(':memory:'). Never reads, writes, or
 * references any persistent filesystem path.
 *
 * Initializes the full D1 schema (notes, site_settings, indexes) so
 * that vinext's built-in runMigrations pass-through is a no-op.
 *
 * Exports:
 *   env        — module-level env with { DB: D1DatabaseWrapper }
 *   getTestEnv — returns a fetch-handler env object with DB + optional extras
 *   testDb     — the raw DatabaseSync instance (for regression tests)
 */
import { DatabaseSync } from "node:sqlite";

// ─── Schema (must match db/schema.ts exactly) ───────────────────────

const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
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
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS notes_slug_idx ON notes(slug)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS notes_title_author_idx ON notes(title, author_email)`,
  `CREATE INDEX IF NOT EXISTS notes_status_published_idx ON notes(status, published_at)`,
  `CREATE INDEX IF NOT EXISTS notes_author_idx ON notes(author_email)`,
  `CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY,
    copy_json TEXT NOT NULL DEFAULT '{}',
    updated_by TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

// ─── D1Database-compatible wrapper ──────────────────────────────────

class D1PreparedStatement {
  /** @type {DatabaseSync} */
  #db;
  /** @type {string} */
  #sql;
  /** @type {unknown[]} */
  #params;

  /**
   * @param {DatabaseSync} db
   * @param {string} sql
   */
  constructor(db, sql) {
    this.#db = db;
    this.#sql = sql;
    this.#params = [];
  }

  /**
   * @param {...unknown} params
   * @returns {this}
   */
  bind(...params) {
    this.#params = params;
    return this;
  }

  /** @returns {{ results: unknown[], success: boolean }} */
  all() {
    const stmt = this.#db.prepare(this.#sql);
    const rows = stmt.all(...this.#params);
    return { results: /** @type {unknown[]} */ (rows), success: true };
  }

  /** @returns {unknown | null} */
  first() {
    const stmt = this.#db.prepare(this.#sql);
    return /** @type {unknown} */ (stmt.get(...this.#params)) ?? null;
  }

  /** @returns {{ results: unknown[], success: boolean, meta: Record<string, unknown> }} */
  run() {
    const stmt = this.#db.prepare(this.#sql);
    const info = stmt.run(...this.#params);
    return {
      results: [],
      success: true,
      meta: {
        last_row_id: Number(info.lastInsertRowid),
        changes: info.changes,
        duration: 0,
      },
    };
  }

  /** @returns {unknown[][]} */
  raw() {
    const stmt = this.#db.prepare(this.#sql);
    stmt.setReturnArrays(true);
    const rows = stmt.all(...this.#params);
    return /** @type {unknown[][]} */ (rows);
  }
}

class D1DatabaseWrapper {
  /** @type {DatabaseSync} */
  #db;

  /** @param {DatabaseSync} db */
  constructor(db) {
    this.#db = db;
  }

  /** @param {string} sql @returns {D1PreparedStatement} */
  prepare(sql) {
    return new D1PreparedStatement(this.#db, sql);
  }

  /** @param {D1PreparedStatement[]} statements @returns {{ results: unknown[], success: boolean }[]} */
  batch(statements) {
    return statements.map((s) => s.all());
  }

  /** @param {string} sql @returns {{ results: unknown[], success: boolean }} */
  exec(sql) {
    try {
      this.#db.exec(sql);
    } catch {
      // Expected for "table already exists" during migration pass-through.
    }
    return { results: [], success: true };
  }
}

// ─── Create the isolated in-memory database ─────────────────────────

const testDb = new DatabaseSync(":memory:");

// Initialize the full D1 schema so migrations are no-ops.
testDb.exec("PRAGMA journal_mode=WAL");
for (const sql of SCHEMA_SQL) {
  try { testDb.exec(sql); } catch { /* IF NOT EXISTS handles this */ }
}

const d1Wrapper = new D1DatabaseWrapper(testDb);

/** Module-level env (used by `import { env } from "cloudflare:workers"`) */
export const env = Object.assign(Object.create(null), { DB: d1Wrapper });

/**
 * Returns a fetch-handler env object including DB.
 * Merge any extra bindings the test needs (e.g. ASSETS).
 * @param {Record<string, unknown>} [extra]
 * @returns {Record<string, unknown>}
 */
export function getTestEnv(extra) {
  return Object.assign(Object.create(null), extra || {}, { DB: d1Wrapper });
}

/** Raw DatabaseSync instance for regression tests. */
export { testDb };
