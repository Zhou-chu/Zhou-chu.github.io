import { requireChatGPTUser } from "../chatgpt-auth";
import { AdminStudio } from "./AdminStudio";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  return <AdminStudio user={{ displayName: user.displayName, email: user.email }} />;
}
