export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";

export default async function EmployeesPage() {
  const employees = await prisma.crmEmployee.findMany({ where: { active: true } });
  
  return (
    <div className="crm" dir="rtl">
      <header className="crm-header"><h1>עובדים</h1></header>
      <div className="crm-layout">
        <aside className="crm-sidebar">
          <nav>
            <a href="/admin/crm">דשבורד</a>
            <a href="/admin/crm/clients">לקוחות</a>
            <a href="/admin/crm/employees" className="active">עובדים</a>
            <a href="/admin/crm/tasks">משימות</a>
          </nav>
        </aside>
        <main className="crm-main">
          <div className="crm-table">
            <h2>עובדים ({employees.length})</h2>
            <table>
              <thead>
                <tr><th>שם</th><th>אימייל</th><th>טלפון</th><th>תפקיד</th></tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id}>
                    <td>{e.name}</td>
                    <td>{e.email || "—"}</td>
                    <td>{e.phone || "—"}</td>
                    <td>{e.role}</td>
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
