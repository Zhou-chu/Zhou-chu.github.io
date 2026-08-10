import { requireAdminUser } from "../chatgpt-auth";
import { AdminStudio } from "./AdminStudio";
import { listAdminNotes } from "../../db/notes";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAdminUser("/admin");
  const initialNotes = await listAdminNotes();
  return <AdminStudio user={{ displayName: user.displayName, email: user.email }} initialNotes={initialNotes} />;
}
