import { listPublishedNotes } from "../../../db/notes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const after = url.searchParams.get("after");
    const limit = url.searchParams.get("limit");
    const cursor = after ? Number(after) : undefined;
    const limitNum = limit ? Math.min(Number(limit), 100) : 20;

    const result = await listPublishedNotes(cursor, limitNum);
    const notesList = result as Array<Record<string, unknown>>;
    const nextCursor = notesList.length === limitNum ? notesList[notesList.length - 1].id : undefined;

    return Response.json({ notes: notesList, nextCursor });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "无法读取笔记" }, { status: 500 });
  }
}
