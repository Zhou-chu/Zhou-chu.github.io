import { listPublishedNotes } from "../../../db/notes";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await listPublishedNotes();
    return Response.json({ notes: result.results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "无法读取笔记" }, { status: 500 });
  }
}
