import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { SystemAgent } from "@/components/admin/SystemAgent";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  if (!isSystemAdmin(session)) redirect("/admin/buildings");

  return (
    <main className="admin">
      <AdminNav />
      <h1>סוכן</h1>
      <SystemAgent />
    </main>
  );
}
