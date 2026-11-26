import { prisma } from "@/lib/prisma";

export default async function ClientsPage() {
  const clients = await prisma.crmClient.findMany({ orderBy: { name: "asc" } });
  
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
          <div className="crm-table">
            <h2>כל הלקוחות ({clients.length})</h2>
            <table>
              <thead>
                <tr><th>שם</th><th>עיר</th><th>סטטוס</th><th>תשלום חודשי</th></tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.city || "—"}</td>
                    <td>{c.status || "—"}</td>
                    <td>{c.monthlyPay ? `₪${c.monthlyPay}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
