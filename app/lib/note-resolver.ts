import { getDb } from "../../db/index";
import { notes } from "../../db/schema";
import { eq } from "drizzle-orm";

type ResolverResult = { slug: string; title: string };

export async function createNoteResolver(): Promise<
  (title: string) => ResolverResult | null
> {
  const db = getDb();
  const allNotes = await db
    .select({ slug: notes.slug, title: notes.title })
    .from(notes)
    .where(eq(notes.status, "published"))
    .all();

  // Build map: normalized title → {slug, title}
  const byTitle = new Map<string, ResolverResult>();
  const bySlug = new Map<string, ResolverResult>();

  for (const note of allNotes) {
    const key = normalize(note.title);
    if (!byTitle.has(key)) {
      byTitle.set(key, { slug: note.slug, title: note.title });
    }
    bySlug.set(note.slug, { slug: note.slug, title: note.title });
  }

  return (title: string): ResolverResult | null => {
    const normalized = normalize(title);
    // Try exact slug match first
    if (bySlug.has(normalized)) return bySlug.get(normalized)!;
    // Then title match
    return byTitle.get(normalized) ?? null;
  };
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}
