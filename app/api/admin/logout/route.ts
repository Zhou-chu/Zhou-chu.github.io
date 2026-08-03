import { clearSessionCookie } from "../../../chatgpt-auth";
import { redirect } from "next/navigation";

export async function POST() {
  await clearSessionCookie();
  redirect("/");
}
