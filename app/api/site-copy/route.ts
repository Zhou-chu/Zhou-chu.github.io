import { readSiteCopy } from "../../../db/site-copy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const row = await readSiteCopy();
    return Response.json({ copy: row?.copyJson ? JSON.parse(row.copyJson) : null, updatedAt: row?.updatedAt || null });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "无法读取站点文案" }, { status: 500 });
  }
}
