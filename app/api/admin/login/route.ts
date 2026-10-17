import { signSessionCookie, verifyAdminPassword } from "../../../chatgpt-auth";

export async function POST(request: Request) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return Response.json(
      { error: "未配置管理员密码（ADMIN_PASSWORD）" },
      { status: 500 },
    );
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return Response.json({ error: "请求格式错误" }, { status: 400 });
  }

  if (typeof body.password !== "string" || !(await verifyAdminPassword(body.password))) {
    return Response.json({ error: "密码错误" }, { status: 401 });
  }

  await signSessionCookie();

  return Response.json({ ok: true });
}
