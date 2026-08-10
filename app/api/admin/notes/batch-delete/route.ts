import { getAdminUser } from "../../../../chatgpt-auth";
import { batchDeleteNotes, getAllNotesForGitHub } from "../../../../../db/notes";
import { syncManyNotesToGitHub } from "../../../../lib/github-content-sync";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getAdminUser();
  if (!user) return Response.json({ error: "无权访问写作后台" }, { status: 403 });

  try {
    const publishedNotes = (await getAllNotesForGitHub()).filter((note) => note.status === "published");
    const count = await batchDeleteNotes();
    const githubSync = await syncManyNotesToGitHub(publishedNotes.map((note) => ({ ...note, status: "draft" as const })));
    return Response.json({ deleted: count, githubSync });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 }
    );
  }
}
