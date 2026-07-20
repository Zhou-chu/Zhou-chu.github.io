// ─── Public Note Index (server-only) ─────────────────────────────────
// Queries published note metadata without ever selecting `content`.
// This module imports Drizzle/D1 — keep it out of client bundles.

import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/index";
import { notes } from "../../db/schema";
import type { PublicNoteIndexEntry } from "./public-note-model";

/**
 * Returns every published note's metadata in canonical display order.
 *
 * Selection: ONLY the nine metadata columns listed below.
 * `content` is NEVER selected — this is the metadata-only contract.
 *
 * Order:  `COALESCE(publishedAt, createdAt)` DESC, then `id` DESC.
 * Filter: `status = 'published'`.
 */
export async function listPublicNoteIndex(): Promise<
  readonly PublicNoteIndexEntry[]
> {
  const results = await getDb()
    .select({
      id: notes.id,
      slug: notes.slug,
      title: notes.title,
      summary: notes.summary,
      category: notes.category,
      featured: notes.featured,
      publishedAt: notes.publishedAt,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(eq(notes.status, "published"))
    .orderBy(
      desc(sql`COALESCE(${notes.publishedAt}, ${notes.createdAt})`),
      desc(notes.id),
    )
    .all();

  return results;
}
