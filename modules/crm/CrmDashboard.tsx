"use client";

type Client = { id: number; name: string; city: string | null; status: string | null };
type Employee = { id: number; name: string };
type Task = { id: number; title: string; status: string; client: Client | null; employee: Employee | null };
type Stats = { clients: number; employees: number; openTasks: number; doneTasks: number };

export function CrmDashboard({ clients, employees, tasks, stats }: {
  clients: Client[];
  employees: Employee[];
  tasks: Task[];
  stats: Stats;
}) {
  return (
    <div className="crm" dir="rtl">
      <header className="crm-header">
        <h1>NYmedia CRM</h1>
      </header>
      <div className="crm-layout">
        <aside className="crm-sidebar">
          <nav>
            <a href="/admin/crm" className="active">דשבורד</a>
            <a href="/admin/crm/clients">לקוחות</a>
            <a href="/admin/crm/employees">עובדים</a>
            <a href="/admin/crm/tasks">משימות</a>
          </nav>
        </aside>
        <main className="crm-main">
          <div className="crm-stats">
            <div className="stat-card">
              <span>לקוחות</span>
              <strong>{stats.clients}</strong>
            </div>
            <div className="stat-card">
              <span>עובדים</span>
              <strong>{stats.employees}</strong>
            </div>
            <div className="stat-card">
              <span>משימות פתוחות</span>
              <strong>{stats.openTasks}</strong>
            </div>
            <div className="stat-card">
              <span>הושלמו</span>
              <strong>{stats.doneTasks}</strong>
            </div>
          </div>
          <div className="crm-table">
            <h2>לקוחות אחרונים</h2>
            <table>
              <thead>
                <tr><th>שם</th><th>עיר</th><th>סטטוס</th></tr>
              </thead>
              <tbody>
                {clients.slice(0, 10).map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.city || "—"}</td>
                    <td className={`status-${c.status}`}>{c.status || "—"}</td>
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
