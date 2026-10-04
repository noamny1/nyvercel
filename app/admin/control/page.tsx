import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { prisma } from "@/lib/prisma";
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
  const screens = await prisma.screen.findMany({
    orderBy: { id: "asc" },
    include: { group: { include: { building: true } } },
  });
  const rows = screens.map((screen) => ({ screen, state: stateOf(screen, now) }));
  const counts = {
    total: screens.length,
    inactive: rows.filter((row) => row.state === "inactive").length,
    online: rows.filter((row) => row.state === "online").length,
    offline: rows.filter((row) => row.state === "offline").length,
  };
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
