import { getChatGPTUser } from "../../../chatgpt-auth";
import { readSiteCopy, writeSiteCopy } from "../../../../db/site-copy";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  const row = await readSiteCopy();
  return Response.json({ copy: row?.copyJson ? JSON.parse(row.copyJson) : null, updatedAt: row?.updatedAt || null });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  const payload = await request.json() as { copy?: Record<string, unknown> };
  if (!payload.copy || typeof payload.copy !== "object") return Response.json({ error: "文案格式无效" }, { status: 400 });
  const safeCopy = Object.fromEntries(Object.entries(payload.copy).filter(([, value]) => typeof value === "string"));
  const result = await writeSiteCopy(JSON.stringify(safeCopy), user.email);
  return Response.json({ copy: safeCopy, updatedAt: result?.updatedAt });
}
