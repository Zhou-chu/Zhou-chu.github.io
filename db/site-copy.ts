import { env } from "cloudflare:workers";

const schemaSql = `CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY,
  copy_json TEXT NOT NULL DEFAULT '{}',
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

function d1() {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

export async function ensureSiteCopySchema() {
  await d1().prepare(schemaSql).run();
}

export async function readSiteCopy() {
  await ensureSiteCopySchema();
  return d1().prepare("SELECT copy_json AS copyJson, updated_at AS updatedAt FROM site_settings WHERE id = 1").first<{ copyJson: string; updatedAt: string }>();
}

export async function writeSiteCopy(copyJson: string, email: string) {
  await ensureSiteCopySchema();
  return d1().prepare(`INSERT INTO site_settings (id, copy_json, updated_by, updated_at)
    VALUES (1, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET copy_json = excluded.copy_json, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP
    RETURNING updated_at AS updatedAt`).bind(copyJson, email).first();
}
