import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { notes } from "../../../../db/schema";
import obsidianIndex from "../../../lib/obsidian-index.json";
import obsidianContent from "../../../lib/obsidian-content.json";

export const dynamic = "force-dynamic";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ObsidianNote {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  publishedAt: string;
  featured: boolean;
  readMinutes: number;
  sourcePath: string;
  outgoing: string[];
  backlinks: string[];
}

// ─── GET /api/admin/seed ─────────────────────────────────────────────────────

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

  const db = getDb();

  // Use statically imported JSON data
  const indexNotes = obsidianIndex as ObsidianNote[];
  const contentNotes = obsidianContent as ObsidianNote[];

  // Build content lookup by slug
  const contentBySlug = new Map<string, string>();
  for (const n of contentNotes) {
    contentBySlug.set(n.slug, n.content);
  }

  // Merge & insert (idempotent via ON CONFLICT DO NOTHING)
  let imported = 0;
  let skipped = 0;

  for (const note of indexNotes) {
    const fullContent = contentBySlug.get(note.slug) ?? "";

    try {
      const result = await db
        .insert(notes)
        .values({
          slug: note.slug,
          title: note.title,
          summary: note.summary,
          content: fullContent,
          category: note.category,
          status: "published",
          featured: note.featured,
          authorEmail: "obsidian-import@local",
          publishedAt: note.publishedAt,
          sourcePath: note.sourcePath,
          linksJson: JSON.stringify(note.outgoing),
        })
        .onConflictDoNothing()
        .returning({ id: notes.id });

      if (result.length > 0) {
        imported++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`[seed] Failed to insert "${note.slug}":`, err);
    }
  }

  return Response.json({ imported, skipped });
}
