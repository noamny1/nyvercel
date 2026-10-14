import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const ONLINE_MS = 8 * 60 * 1000;

function fresh(at: Date | null | undefined, now: number) {
  return !!at && now - at.getTime() <= ONLINE_MS;
}

function stateOf(screen: { active: boolean; heartbeat: { at: Date } | null; remoteDesk?: { keeperAt: Date | null } | null; deviceStatus?: { at: Date } | null }, now: number) {
  if (!screen.active) return "inactive";
  if (fresh(screen.heartbeat?.at, now) || fresh(screen.remoteDesk?.keeperAt, now) || fresh(screen.deviceStatus?.at, now)) return "online";
  return "offline";
}

export default async function ControlPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  if (!isSystemAdmin(session)) redirect("/admin/buildings");
  const { status } = await searchParams;
  const filter = status || "all";
  const now = Date.now();
  const where = await screenWhere(session);
  const cutoff = new Date(now - ONLINE_MS);
  const alive = {
    active: true,
    OR: [
      { heartbeat: { is: { at: { gte: cutoff } } } },
      { remoteDesk: { is: { keeperAt: { gte: cutoff } } } },
      { deviceStatus: { is: { at: { gte: cutoff } } } },
    ],
  };
  const quiet = {
    active: true,
    AND: [
      { OR: [{ heartbeat: { is: null } }, { heartbeat: { is: { at: { lt: cutoff } } } }] },
      { OR: [{ remoteDesk: { is: null } }, { remoteDesk: { is: { OR: [{ keeperAt: null }, { keeperAt: { lt: cutoff } }] } } }] },
      { OR: [{ deviceStatus: { is: null } }, { deviceStatus: { is: { at: { lt: cutoff } } } }] },
    ],
  };
  const statusWhere =
    filter === "online"
      ? alive
      : filter === "inactive"
        ? { active: false }
        : filter === "offline"
          ? quiet
          : {};
  const [total, inactive, online, screens] = await Promise.all([
    prisma.screen.count({ where }),
    prisma.screen.count({ where: { AND: [where, { active: false }] } }),
    prisma.screen.count({ where: { AND: [where, alive] } }),
    prisma.screen.findMany({
      where: { AND: [where, statusWhere] },
      orderBy: { id: "desc" },
      ...(filter === "all" ? { take: 40 } : {}),
      include: { heartbeat: true, deviceStatus: true, remoteDesk: { select: { keeperAt: true } }, group: { include: { building: true } } },
    }),
  ]);
  const rows = screens.map((screen) => ({ screen, state: stateOf(screen, now) }));
  const counts = { total, inactive, online, offline: Math.max(0, total - inactive - online) };
  const visible = rows;

  return (
    <main className="admin">
      <AdminNav />
      <h1>לוח בקרה</h1>
      <p>מסך תקין אם שלח אות ב-8 הדקות האחרונות. המסך שואל כל 3 דקות אם משהו השתנה, ורק אז נטען מחדש.</p>
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
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <i
                className="dot"
                style={{
                  width: 14,
                  height: 14,
                  margin: 0,
                  background: screen.remoteDesk?.keeperAt && now - screen.remoteDesk.keeperAt.getTime() < 12000 ? "#1faa4a" : "#d12626",
                  boxShadow: `0 0 8px ${screen.remoteDesk?.keeperAt && now - screen.remoteDesk.keeperAt.getTime() < 12000 ? "#1faa4a" : "#d12626"}`,
                }}
              />
              {screen.remoteDesk?.keeperAt && now - screen.remoteDesk.keeperAt.getTime() < 12000 ? "גישה פעילה" : "אין גישה"}
            </span>
            <span>
              {screen.group?.building?.name || screen.group?.name || "בלי קבוצה"}
              {" · "}
              {screen.heartbeat ? screen.heartbeat.at.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }) : "אין אות"}
              {" · "}
              <a href={`/s/${screen.code || screen.id}`} target="_blank">/s/{screen.code || screen.id}</a>
            </span>
            <span>
              {screen.deviceStatus
                ? `${screen.deviceStatus.version || "—"} · ${screen.deviceStatus.resolution || "—"} · ${screen.deviceStatus.ip || "—"} · ${screen.deviceStatus.freeMb}MB פנוי · עלה ${screen.deviceStatus.bootedAt ? screen.deviceStatus.bootedAt.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }) : "—"}`
                : "אין דיווח מהאפליקציה"}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
