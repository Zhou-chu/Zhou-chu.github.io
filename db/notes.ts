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
};

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

export async function createNote(input: NoteInput, email: string) {
  const slug = `${cleanSlug(input.slug, input.title)}-${Date.now().toString(36)}`;
  const publishedAt = input.status === "published" ? (input.publishedAt || new Date().toISOString().slice(0, 10)) : null;
  return getDb().insert(notes).values({
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
  }).returning().get();
}

export async function updateNote(id: number, input: NoteInput, email: string) {
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
    updatedAt: sql`CURRENT_TIMESTAMP`,
  }).where(and(eq(notes.id, id), eq(notes.authorEmail, email)))
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
