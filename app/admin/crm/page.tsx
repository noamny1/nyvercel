export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { CrmDashboard } from "@/modules/crm/CrmDashboard";

export default async function CrmPage() {
  const [clients, employees, tasks] = await Promise.all([
    prisma.crmClient.findMany({ orderBy: { name: "asc" }, take: 100 }),
    prisma.crmEmployee.findMany({ where: { active: true } }),
    prisma.crmTask.findMany({ 
      include: { client: true, employee: true },
      orderBy: { createdAt: "desc" },
      take: 50 
    }),
  ]);

  const stats = {
    clients: await prisma.crmClient.count(),
    employees: employees.length,
    openTasks: await prisma.crmTask.count({ where: { status: "open" } }),
    doneTasks: await prisma.crmTask.count({ where: { status: "done" } }),
  };

  return <CrmDashboard clients={clients} employees={employees} tasks={tasks} stats={stats} />;
}
