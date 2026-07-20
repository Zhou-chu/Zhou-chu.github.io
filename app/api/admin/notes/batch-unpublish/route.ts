import { getChatGPTUser } from "../../../../chatgpt-auth";
import { batchUnpublishNotes } from "../../../../../db/notes";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

  try {
    const count = await batchUnpublishNotes();
    return Response.json({ unpublished: count });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 }
    );
  }
}
