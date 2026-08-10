import { getAdminUser } from "../../../chatgpt-auth";
import { createNote, deleteNote, ensureNoteSourcePath, listAdminNotes, TitleConflictError, updateNote } from "../../../../db/notes";
import { syncNoteToGitHub } from "../../../lib/github-content-sync";
import { checkBodySize, validateNoteInput } from "../validation";

export const dynamic = "force-dynamic";

async function authenticatedEmail() {
  const user = await getAdminUser();
  return user?.email || null;
}

export async function GET() {
  const user = await getAdminUser();
  if (!user) return Response.json({ error: "无权访问写作后台" }, { status: 403 });
  try {
    const result = await listAdminNotes();
    return Response.json({ notes: result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "无法读取笔记" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const email = await authenticatedEmail();
  if (!email) return Response.json({ error: "无权访问写作后台" }, { status: 403 });
  const sizeCheck = checkBodySize(request, 1_000_000);
  if (!sizeCheck.ok) return Response.json({ error: sizeCheck.error }, { status: sizeCheck.status });
  const raw = await request.json();
  const validation = validateNoteInput(raw);
  if (!validation.valid) return Response.json({ error: validation.error }, { status: validation.status });
  try {
    // POST is upsert: same title ⇒ overwrite the old note in place.
    const { note, overwritten } = await createNote(validation.data, email);
    const sourcePath = note.sourcePath || `blog/${note.slug}.md`;
    const storedNote = note.sourcePath ? note : await ensureNoteSourcePath(note.id, sourcePath, email);
    const githubSync = storedNote && (storedNote.status === "published" || overwritten)
      ? await syncNoteToGitHub(storedNote)
      : { ok: true, configured: Boolean(process.env.GITHUB_CONTENT_TOKEN), action: "skipped" as const };
    return Response.json({ note: storedNote || note, overwritten, githubSync }, { status: 201 });
  } catch (error) {
    if (error instanceof TitleConflictError) return Response.json({ error: error.message }, { status: 409 });
    return Response.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const email = await authenticatedEmail();
  if (!email) return Response.json({ error: "无权访问写作后台" }, { status: 403 });
  const sizeCheck = checkBodySize(request, 1_000_000);
  if (!sizeCheck.ok) return Response.json({ error: sizeCheck.error }, { status: sizeCheck.status });
  const raw = await request.json() as Record<string, unknown> & { id?: number };
  if (!raw.id) return Response.json({ error: "笔记信息不完整" }, { status: 400 });
  const validation = validateNoteInput(raw);
  if (!validation.valid) return Response.json({ error: validation.error }, { status: validation.status });
  try {
    const note = await updateNote(raw.id, validation.data, email);
    if (!note) return Response.json({ error: "未找到笔记" }, { status: 404 });
    const sourcePath = note.sourcePath || `blog/${note.slug}.md`;
    const storedNote = note.sourcePath ? note : await ensureNoteSourcePath(note.id, sourcePath, email);
    const githubSync = await syncNoteToGitHub(storedNote || note);
    return Response.json({ note: storedNote || note, githubSync });
  } catch (error) {
    if (error instanceof TitleConflictError) return Response.json({ error: error.message }, { status: 409 });
    return Response.json({ error: error instanceof Error ? error.message : "更新失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const email = await authenticatedEmail();
  if (!email) return Response.json({ error: "无权访问写作后台" }, { status: 403 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return Response.json({ error: "缺少笔记编号" }, { status: 400 });
  try {
    const deleted = await deleteNote(id, email);
    if (!deleted) return Response.json({ error: "未找到笔记" }, { status: 404 });
    const githubSync = await syncNoteToGitHub({ ...deleted, status: "draft" });
    return Response.json({ ok: true, githubSync });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "删除失败" }, { status: 500 });
  }
}
