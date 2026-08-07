import { requireAdmin } from "@/lib/session";
import { redirect } from "next/navigation";
import { getAdminData } from "@/lib/weeks";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await requireAdmin())) redirect("/admin/login");
  const modules = await getAdminData();
  return <AdminDashboard modules={modules} />;
}