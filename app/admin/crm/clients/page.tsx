export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { ClientsTable, type CrmRow } from "@/modules/crm/ClientsTable";

export default async function ClientsPage() {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) redirect("/admin/login");

  const clients = await prisma.crmClient.findMany({ orderBy: { name: "asc" } });
  const rows: CrmRow[] = clients.map((client) => ({
    id: client.id,
    name: client.name,
    city: client.city,
    status: client.status,
    workContent: client.workContent,
    notes: client.notes,
    oneTimeCharge: client.oneTimeCharge,
    monthlyPay: client.monthlyPay,
    monthlyPay2: client.monthlyPay2,
    internetCost: client.internetCost,
    clientType: client.clientType,
    infrastructure: client.infrastructure,
    paymentMethod: client.paymentMethod,
    theme: client.theme,
    installDate: client.installDate ? client.installDate.toISOString().slice(0, 10) : null,
    hotLine: client.hotLine,
    ipDns: client.ipDns,
    loginUser: client.loginUser,
    loginPass: client.loginPass,
    modemData: client.modemData,
    subscriberId: client.subscriberId,
    modemPass: client.modemPass,
    dvrType: client.dvrType,
    dvrIp: client.dvrIp,
    dvrPorts: client.dvrPorts,
    dvrUser: client.dvrUser,
    dvrPass: client.dvrPass,
    screenCount: client.screenCount,
    addressCount: client.addressCount,
    bank: client.bank,
    branch: client.branch,
    account: client.account,
    files: client.files,
    paidUntil: client.paidUntil,
    mondayId: client.mondayId,
  }));

  return (
    <div className="crm" dir="rtl">
      <header className="crm-header"><h1>לקוחות</h1></header>
      <div className="crm-layout">
        <aside className="crm-sidebar">
          <nav>
            <a href="/admin/crm">דשבורד</a>
            <a href="/admin/crm/clients" className="active">לקוחות</a>
            <a href="/admin/crm/employees">עובדים</a>
            <a href="/admin/crm/tasks">משימות</a>
          </nav>
        </aside>
        <main className="crm-main">
          <ClientsTable rows={rows} />
        </main>
      </div>
    </div>
  );
}
