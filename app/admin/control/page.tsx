import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const ONLINE_MS = 8 * 60 * 1000;

function stateOf(screen: { active: boolean; lastPing: Date | null }, now: number) {
  if (!screen.active) return "inactive";
  if (screen.lastPing && now - screen.lastPing.getTime() <= ONLINE_MS) return "online";
  return "offline";
}

export default async function ControlPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const { status } = await searchParams;
  const filter = status || "all";
  const now = Date.now();
  const where = await screenWhere(session);
  const cutoff = new Date(now - ONLINE_MS);
  const [total, inactive, online, screens] = await Promise.all([
    prisma.screen.count({ where }),
    prisma.screen.count({ where: { AND: [where, { active: false }] } }),
    prisma.screen.count({ where: { AND: [where, { active: true, lastPing: { gte: cutoff } }] } }),
    prisma.screen.findMany({
      where,
      orderBy: { lastPing: "desc" },
      take: 40,
      include: { group: { include: { building: true } } },
    }),
  ]);
  const rows = screens.map((screen) => ({ screen, state: stateOf(screen, now) }));
  const counts = { total, inactive, online, offline: Math.max(0, total - inactive - online) };
  const visible = filter === "all" ? rows : rows.filter((row) => row.state === filter);

  return (
    <main className="admin">
      <AdminNav />
      <h1>לוח בקרה</h1>
      <p>מסך תקין אם שלח אות ב-8 הדקות האחרונות. מסך שפתוח על הטלוויזיה שולח אות כל 4 דקות.</p>
      <div className="stats">
        <Link className={filter === "all" ? "stat on" : "stat"} href="/admin/control"><span>סה״כ</span><b>{counts.total}</b></Link>
        <Link className={filter === "online" ? "stat on" : "stat"} href="/admin/control?status=online"><span>תקין</span><b>{counts.online}</b></Link>
        <Link className={filter === "offline" ? "stat on" : "stat"} href="/admin/control?status=offline"><span>לא תקין</span><b>{counts.offline}</b></Link>
        <Link className={filter === "inactive" ? "stat on" : "stat"} href="/admin/control?status=inactive"><span>כבוי</span><b>{counts.inactive}</b></Link>
      </div>
      <div className="screens">
        {visible.map(({ screen, state }) => (
          <div key={screen.id} className={state}>
            <span><i className="dot" />{state === "online" ? "תקין" : state === "offline" ? "לא תקין" : "כבוי"} · {screen.name}</span>
            <span>
              {screen.group?.building?.name || screen.group?.name || "בלי קבוצה"}
              {" · "}
              {screen.lastPing ? screen.lastPing.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }) : "אין אות"}
              {" · "}
              <a href={`/s/${screen.id}`} target="_blank">/s/{screen.id}</a>
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
