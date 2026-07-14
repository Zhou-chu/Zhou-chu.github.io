import { getChatGPTUser } from "../../../chatgpt-auth";
import { createNote, deleteNote, listAdminNotes, updateNote, type NoteInput } from "../../../../db/notes";

export const dynamic = "force-dynamic";

async function authenticatedEmail() {
  const user = await getChatGPTUser();
  return user?.email || null;
}

export async function GET() {
  const email = await authenticatedEmail();
  if (!email) return Response.json({ error: "请先登录" }, { status: 401 });
  try {
    const result = await listAdminNotes(email);
    return Response.json({ notes: result.results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "无法读取笔记" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const email = await authenticatedEmail();
  if (!email) return Response.json({ error: "请先登录" }, { status: 401 });
  const input = await request.json() as NoteInput;
  if (!input.title?.trim() || !input.content?.trim()) return Response.json({ error: "标题和正文不能为空" }, { status: 400 });
  try {
    return Response.json({ note: await createNote(input, email) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const email = await authenticatedEmail();
  if (!email) return Response.json({ error: "请先登录" }, { status: 401 });
  const payload = await request.json() as NoteInput & { id?: number };
  if (!payload.id || !payload.title?.trim() || !payload.content?.trim()) return Response.json({ error: "笔记信息不完整" }, { status: 400 });
  try {
    const note = await updateNote(payload.id, payload, email);
    return note ? Response.json({ note }) : Response.json({ error: "未找到笔记" }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "更新失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const email = await authenticatedEmail();
  if (!email) return Response.json({ error: "请先登录" }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return Response.json({ error: "缺少笔记编号" }, { status: 400 });
  try {
    const deleted = await deleteNote(id, email);
    return deleted ? Response.json({ ok: true }) : Response.json({ error: "未找到笔记" }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "删除失败" }, { status: 500 });
  }
}
