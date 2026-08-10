import { and, desc, eq, lt, sql } from "drizzle-orm";
import { getDb } from "./index";
import { notes } from "./schema";

export type NoteInput = {
  title: string;
  slug?: string;
  summary?: string;
  content: string;
  category?: string;
  status?: "draft" | "published";
  featured?: boolean;
  publishedAt?: string | null;
  linksJson?: string;
  tagsJson?: string;
  sourcePath?: string;
};

/** Thrown when a PATCH would rename a note to another note's existing title. */
export class TitleConflictError extends Error {
  constructor(title: string) {
    super(`文章标题《${title}》已存在，请更换标题`);
    this.name = "TitleConflictError";
  }
}

export async function listPublishedNotes(after?: number, limit = 20) {
  let query = getDb().select({
    id: notes.id,
    slug: notes.slug,
    title: notes.title,
    summary: notes.summary,
    content: notes.content,
    category: notes.category,
    featured: notes.featured,
    publishedAt: notes.publishedAt,
    createdAt: notes.createdAt,
    updatedAt: notes.updatedAt,
  }).from(notes)
    .where(eq(notes.status, "published"));
  if (after) {
    query = query.where(lt(notes.id, after));
  }
  const results = await query
    .orderBy(desc(sql`COALESCE(${notes.publishedAt}, ${notes.createdAt})`), desc(notes.id))
    .limit(limit)
    .all();
  return results;
}

export async function getPublishedNoteBySlug(slug: string) {
  return getDb().select({
    id: notes.id,
    slug: notes.slug,
    title: notes.title,
    summary: notes.summary,
    content: notes.content,
    category: notes.category,
    featured: notes.featured,
    publishedAt: notes.publishedAt,
    createdAt: notes.createdAt,
    updatedAt: notes.updatedAt,
  }).from(notes)
    .where(and(eq(notes.status, "published"), eq(notes.slug, slug)))
    .limit(1)
    .get();
}

export async function listAdminNotes(email?: string | null) {
  let query = getDb().select({
    id: notes.id,
    slug: notes.slug,
    title: notes.title,
    summary: notes.summary,
    content: notes.content,
    category: notes.category,
    status: notes.status,
    featured: notes.featured,
    publishedAt: notes.publishedAt,
    createdAt: notes.createdAt,
    updatedAt: notes.updatedAt,
    tagsJson: notes.tagsJson,
  }).from(notes);
  if (email) {
    query = query.where(eq(notes.authorEmail, email));
  }
  const results = await query.orderBy(desc(notes.updatedAt), desc(notes.id)).all();
  return results;
}

function cleanSlug(value: string | undefined, title: string) {
  const source = (value || title).toLowerCase().trim();
  const slug = source.replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || `note-${Date.now()}`;
}

/**
 * Upsert semantics: when a note with the same title (case-insensitive)
 * already exists for this author, the old note is OVERWRITTEN in place —
 * its id and slug are preserved so existing URLs keep working.
 * Returns `overwritten: true` when an existing note was replaced.
 *
 * Race-safe: if two requests upload the same title concurrently (e.g.
 * within one batch import), the loser's insert hits the unique index and
 * falls back to updating the winner's note instead of failing.
 */
export async function createNote(input: NoteInput, email: string) {
  const existingBySource = input.sourcePath ? await findNoteBySourcePath(input.sourcePath) : null;
  const existingByOwner = await findNoteByTitle(input.title, email);
  const existingByTitle = input.sourcePath && !existingByOwner ? await findNoteByTitleAnyAuthor(input.title) : null;
  const existing = existingBySource || existingByOwner || existingByTitle;
  if (existing) {
    const claimForObsidian = Boolean(input.sourcePath && existing.authorEmail !== email);
    const note = await updateNote(existing.id, input, email, claimForObsidian);
    return { note, overwritten: true };
  }

  const slug = `${cleanSlug(input.slug, input.title)}-${Date.now().toString(36)}`;
  const publishedAt = input.status === "published" ? (input.publishedAt || new Date().toISOString().slice(0, 10)) : null;
  try {
    const note = await getDb().insert(notes).values({
      slug,
      title: input.title,
      summary: input.summary || "",
      content: input.content,
      category: input.category || "随想",
      status: input.status || "draft",
      featured: input.featured ?? false,
      authorEmail: email,
      publishedAt,
      linksJson: input.linksJson ?? "[]",
      tagsJson: input.tagsJson ?? "[]",
      sourcePath: input.sourcePath,
    }).returning().get();
    return { note, overwritten: false };
  } catch (error) {
    // Unique-index race: the same title was inserted between our lookup
    // and this insert. Resolve by overwriting the concurrent note.
    const raced = await findNoteByTitle(input.title, email);
    if (raced) {
      const note = await updateNote(raced.id, input, email);
      return { note, overwritten: true };
    }
    throw error;
  }
}

async function findNoteByTitle(title: string, email: string) {
  return getDb()
    .select({ id: notes.id, authorEmail: notes.authorEmail })
    .from(notes)
    .where(and(eq(notes.authorEmail, email), sql`LOWER(${notes.title}) = LOWER(${title})`))
    .limit(1)
    .get();
}

async function findNoteByTitleAnyAuthor(title: string) {
  return getDb()
    .select({ id: notes.id, authorEmail: notes.authorEmail })
    .from(notes)
    .where(sql`LOWER(${notes.title}) = LOWER(${title})`)
    .orderBy(desc(notes.updatedAt), desc(notes.id))
    .limit(1)
    .get();
}

async function findNoteBySourcePath(sourcePath: string) {
  return getDb()
    .select({ id: notes.id, authorEmail: notes.authorEmail })
    .from(notes)
    .where(eq(notes.sourcePath, sourcePath))
    .limit(1)
    .get();
}

export async function updateNote(id: number, input: NoteInput, email: string, claimForObsidian = false) {
  // Reject renaming a note onto another note's existing title — the
  // "one title per note" invariant must hold for every note, not just
  // uploaded ones. (Re-uploading the SAME title is handled by createNote.)
  const conflict = await getDb()
    .select({ id: notes.id })
    .from(notes)
    .where(and(
      eq(notes.authorEmail, email),
      sql`LOWER(${notes.title}) = LOWER(${input.title})`,
      sql`${notes.id} != ${id}`,
    ))
    .limit(1)
    .get();
  if (conflict) throw new TitleConflictError(input.title);

  const publishedAt = input.status === "published" ? (input.publishedAt || new Date().toISOString().slice(0, 10)) : null;
  return getDb().update(notes).set({
    title: input.title,
    summary: input.summary || "",
    content: input.content,
    category: input.category || "随想",
    status: input.status || "draft",
    featured: input.featured ?? false,
    publishedAt,
    linksJson: input.linksJson ?? "[]",
    tagsJson: input.tagsJson ?? "[]",
    sourcePath: input.sourcePath,
    authorEmail: claimForObsidian ? email : undefined,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  }).where(claimForObsidian ? eq(notes.id, id) : and(eq(notes.id, id), eq(notes.authorEmail, email)))
    .returning()
    .get();
}

export async function deleteNote(id: number, email: string) {
  return getDb().delete(notes)
    .where(and(eq(notes.id, id), eq(notes.authorEmail, email)))
    .returning({ id: notes.id })
    .get();
}

export async function batchUnpublishNotes() {
  const result = await getDb().update(notes)
    .set({ status: "draft" as const })
    .where(eq(notes.status, "published"))
    .returning({ id: notes.id });
  return result.length;
}

export async function batchDeleteNotes() {
  const results = await getDb().delete(notes).returning({ id: notes.id }).all();
  return results.length;
}
