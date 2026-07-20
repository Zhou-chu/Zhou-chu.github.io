import { getAdminUser } from "../../../../chatgpt-auth";
import { batchUnpublishNotes } from "../../../../../db/notes";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getAdminUser();
  if (!user) return Response.json({ error: "无权访问写作后台" }, { status: 403 });

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
