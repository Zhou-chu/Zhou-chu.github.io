import { and, eq, isNotNull, notInArray, sql } from "drizzle-orm";
import { getAdminUser } from "../../../../chatgpt-auth";
import { getDb } from "../../../../../db";
import { notes } from "../../../../../db/schema";
import { checkBodySize } from "../../validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return Response.json({ error: "无权访问写作后台" }, { status: 403 });
  const sizeCheck = checkBodySize(request, 100_000);
  if (!sizeCheck.ok) return Response.json({ error: sizeCheck.error }, { status: sizeCheck.status });

  const body = await request.json() as { activeSourcePaths?: unknown };
  if (!Array.isArray(body.activeSourcePaths) || body.activeSourcePaths.some((value) => typeof value !== "string")) {
    return Response.json({ error: "公开来源路径清单无效" }, { status: 400 });
  }
  const activeSourcePaths = [...new Set(body.activeSourcePaths as string[])];
  const ownership = and(eq(notes.authorEmail, user.email), isNotNull(notes.sourcePath));
  const predicate = activeSourcePaths.length
    ? and(ownership, notInArray(notes.sourcePath, activeSourcePaths))
    : ownership;
  const result = await getDb()
    .update(notes)
    .set({ status: "draft", publishedAt: null, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(predicate)
    .returning({ id: notes.id })
    .all();
  return Response.json({ unpublished: result.length });
}
