export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";

export default async function TasksPage() {
  const tasks = await prisma.crmTask.findMany({ 
    include: { client: true, employee: true },
    orderBy: { createdAt: "desc" }
  });
  
  return (
    <div className="crm" dir="rtl">
      <header className="crm-header"><h1>משימות</h1></header>
      <div className="crm-layout">
        <aside className="crm-sidebar">
          <nav>
            <a href="/admin/crm">דשבורד</a>
            <a href="/admin/crm/clients">לקוחות</a>
            <a href="/admin/crm/employees">עובדים</a>
            <a href="/admin/crm/tasks" className="active">משימות</a>
          </nav>
        </aside>
        <main className="crm-main">
          <div className="crm-table">
            <h2>משימות ({tasks.length})</h2>
            <table>
              <thead>
                <tr><th>משימה</th><th>לקוח</th><th>עובד</th><th>סטטוס</th></tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td>{t.client?.name || "—"}</td>
                    <td>{t.employee?.name || "—"}</td>
                    <td>{t.status}</td>
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
