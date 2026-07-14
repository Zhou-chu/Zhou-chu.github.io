import { env } from "cloudflare:workers";

export type NoteInput = {
  title: string;
  slug?: string;
  summary?: string;
  content: string;
  category?: string;
  status?: "draft" | "published";
  featured?: boolean;
  publishedAt?: string | null;
};

const schemaSql = `CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '随想',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  featured INTEGER NOT NULL DEFAULT 0,
  author_email TEXT NOT NULL,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

function d1() {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

export async function ensureNotesSchema() {
  const db = d1();
  await db.batch([
    db.prepare(schemaSql),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS notes_slug_idx ON notes(slug)"),
    db.prepare("CREATE INDEX IF NOT EXISTS notes_status_published_idx ON notes(status, published_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS notes_author_idx ON notes(author_email)"),
  ]);
}

export async function listPublishedNotes() {
  await ensureNotesSchema();
  return d1().prepare(`SELECT id, slug, title, summary, content, category, featured,
    published_at AS publishedAt, created_at AS createdAt, updated_at AS updatedAt
    FROM notes WHERE status = 'published'
    ORDER BY COALESCE(published_at, created_at) DESC, id DESC`).all();
}

export async function getPublishedNoteBySlug(slug: string) {
  await ensureNotesSchema();
  return d1().prepare(`SELECT id, slug, title, summary, content, category, featured,
    published_at AS publishedAt, created_at AS createdAt, updated_at AS updatedAt
    FROM notes WHERE status = 'published' AND slug = ? LIMIT 1`).bind(slug).first();
}

export async function listAdminNotes(email: string) {
  await ensureNotesSchema();
  return d1().prepare(`SELECT id, slug, title, summary, content, category, status, featured,
    published_at AS publishedAt, created_at AS createdAt, updated_at AS updatedAt
    FROM notes WHERE author_email = ? ORDER BY updated_at DESC, id DESC`).bind(email).all();
}

function cleanSlug(value: string | undefined, title: string) {
  const source = (value || title).toLowerCase().trim();
  const slug = source.replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || `note-${Date.now()}`;
}

export async function createNote(input: NoteInput, email: string) {
  await ensureNotesSchema();
  const slug = `${cleanSlug(input.slug, input.title)}-${Date.now().toString(36)}`;
  const publishedAt = input.status === "published" ? (input.publishedAt || new Date().toISOString().slice(0, 10)) : null;
  return d1().prepare(`INSERT INTO notes
    (slug, title, summary, content, category, status, featured, author_email, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`)
    .bind(slug, input.title, input.summary || "", input.content, input.category || "随想", input.status || "draft", input.featured ? 1 : 0, email, publishedAt).first();
}

export async function updateNote(id: number, input: NoteInput, email: string) {
  await ensureNotesSchema();
  const publishedAt = input.status === "published" ? (input.publishedAt || new Date().toISOString().slice(0, 10)) : null;
  return d1().prepare(`UPDATE notes SET title = ?, summary = ?, content = ?, category = ?,
    status = ?, featured = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND author_email = ? RETURNING *`)
    .bind(input.title, input.summary || "", input.content, input.category || "随想", input.status || "draft", input.featured ? 1 : 0, publishedAt, id, email).first();
}

export async function deleteNote(id: number, email: string) {
  await ensureNotesSchema();
  return d1().prepare("DELETE FROM notes WHERE id = ? AND author_email = ? RETURNING id").bind(id, email).first();
}
