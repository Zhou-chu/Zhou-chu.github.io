import { and, eq, sql } from "drizzle-orm";
import { getAdminUser } from "../../../../chatgpt-auth";
import { getDb } from "../../../../../db";
import { notes } from "../../../../../db/schema";
import { normalizeTags } from "../../validation";
import { getNotesForGitHub } from "../../../../../db/notes";
import { syncManyNotesToGitHub } from "../../../../lib/github-content-sync";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/notes/tags
 * Apply one set of tags to many notes in a single call — the "一键打标签"
 * endpoint behind batch markdown import.
 *
 * Body: { ids: number[], tags: string[] | string }
 */
export async function PATCH(request: Request) {
  const user = await getAdminUser();
  if (!user) return Response.json({ error: "无权访问写作后台" }, { status: 403 });
  const email = user.email;

  const raw = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!raw) return Response.json({ error: "请求体无效" }, { status: 400 });

  const ids = Array.isArray(raw.ids)
    ? raw.ids.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  if (!ids.length || ids.length > 200) {
    return Response.json({ error: "需提供 1-200 个笔记编号" }, { status: 400 });
  }

  const normalized = normalizeTags(raw.tags);
  if (!normalized.ok) return Response.json({ error: normalized.error }, { status: 400 });
  const tagsJson = normalized.json;

  const db = getDb();
  let updated = 0;
  for (const id of ids) {
    const result = await db.update(notes)
      .set({ tagsJson, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(notes.id, id), eq(notes.authorEmail, email)))
      .returning({ id: notes.id });
    if (result.length > 0) updated++;
  }

  const githubSync = await syncManyNotesToGitHub((await getNotesForGitHub(ids)).filter((note) => note.status === "published"));
  return Response.json({ updated, githubSync });
}
