export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { ensureCurrentPayMonth } from "@/modules/crm/ensure-pay-month";
import { CrmApp, type CrmRow } from "@/modules/crm/CrmApp";

export default async function CrmPage() {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) redirect("/admin/login");
  await ensureCurrentPayMonth();
  const clients = await prisma.crmClient.findMany({ orderBy: { name: "asc" } });
  const rows: CrmRow[] = clients.map((client) => {
    const raw = client.fields;
    const fields: Record<string, string> = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [key, value] of Object.entries(raw)) fields[key] = value == null ? "" : String(value);
    }
    if (!fields.Name) fields.Name = client.name;
    return { id: client.id, board: client.board || "כתובות פעילות", name: client.name, fields };
  });
  return <CrmApp rows={rows} />;
}
