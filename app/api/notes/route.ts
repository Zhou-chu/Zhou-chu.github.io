import { listPublishedNotesPage } from "../../../db/notes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const after = url.searchParams.get("after");
    const limit = url.searchParams.get("limit");
    const cursor = after && Number.isInteger(Number(after)) && Number(after) > 0 ? Number(after) : undefined;
    const requested = limit ? Math.floor(Number(limit)) : 20;
    const limitNum = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 500) : 20;

    const result = await listPublishedNotesPage(cursor, limitNum);
    const notesList = result as Array<Record<string, unknown>>;
    const nextCursor = notesList.length === limitNum ? notesList[notesList.length - 1].id : undefined;

    return Response.json({ notes: notesList, nextCursor });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "无法读取笔记" }, { status: 500 });
  }
}
