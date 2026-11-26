export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { CrmApp, type CrmRow } from "@/modules/crm/CrmApp";
import { CrmWork } from "@/modules/crm/CrmWork";

export default async function CrmPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) redirect("/admin/login");
  const params = await searchParams;
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
  if (params.view === "classic") return <CrmApp rows={rows} />;
  return <CrmWork rows={rows} />;
}
