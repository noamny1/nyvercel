import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const ONLINE_MS = 18 * 60 * 1000;

function stateOf(screen: { active: boolean; heartbeat: { at: Date } | null }, now: number) {
  if (!screen.active) return "inactive";
  if (screen.heartbeat && now - screen.heartbeat.at.getTime() <= ONLINE_MS) return "online";
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
  const statusWhere =
    filter === "online"
      ? { active: true, heartbeat: { is: { at: { gte: cutoff } } } }
      : filter === "inactive"
        ? { active: false }
        : filter === "offline"
          ? {
              active: true,
              OR: [{ heartbeat: { is: null } }, { heartbeat: { is: { at: { lt: cutoff } } } }],
            }
          : {};
  const [total, inactive, online, screens] = await Promise.all([
    prisma.screen.count({ where }),
    prisma.screen.count({ where: { AND: [where, { active: false }] } }),
    prisma.screen.count({ where: { AND: [where, { active: true, heartbeat: { is: { at: { gte: cutoff } } } }] } }),
    prisma.screen.findMany({
      where: { AND: [where, statusWhere] },
      orderBy: { id: "desc" },
      include: { heartbeat: true, deviceStatus: true, remoteDesk: { select: { keeperAt: true, keeper2At: true, k2Beat: true, nykAt: true, nykBeat: true } }, group: { include: { building: true } } },
    }),
  ]);
  const rows = screens.map((screen) => ({ screen, state: stateOf(screen, now) }));
  const counts = { total, inactive, online, offline: Math.max(0, total - inactive - online) };
  const visible = rows;

  return (
    <main className="admin">
      <AdminNav />
      <h1>לוח בקרה</h1>
      <p>מסך תקין אם שלח אות ב-18 הדקות האחרונות. התימה שולחת אות כל 5 דקות, אז אות אחד שנכשל לא מסמן תקלה.</p>
      <div className="stats">
        <Link className={filter === "all" ? "stat on" : "stat"} href="/admin/control"><span>סה״כ</span><b>{counts.total}</b></Link>
        <Link className={filter === "online" ? "stat on" : "stat"} href="/admin/control?status=online"><span>תקין</span><b>{counts.online}</b></Link>
        <Link className={filter === "offline" ? "stat on" : "stat"} href="/admin/control?status=offline"><span>לא תקין</span><b>{counts.offline}</b></Link>
        <Link className={filter === "inactive" ? "stat on" : "stat"} href="/admin/control?status=inactive"><span>כבוי</span><b>{counts.inactive}</b></Link>
      </div>
      <div className="screens">
        {visible.map(({ screen, state }) => {
          const nyk = !!screen.remoteDesk?.nykAt && now - screen.remoteDesk.nykAt.getTime() < 75000
            || !!screen.remoteDesk?.nykBeat && now - screen.remoteDesk.nykBeat.getTime() < 16 * 60 * 1000;
          const keeper2 = !nyk && (!!screen.remoteDesk?.keeper2At && now - screen.remoteDesk.keeper2At.getTime() < 75000
            || !!screen.remoteDesk?.k2Beat && now - screen.remoteDesk.k2Beat.getTime() < 16 * 60 * 1000);
          return (
          <div key={screen.id} className={state}>
            <span>
              <span className={`status ${state === "online" ? "online" : "offline"}`} title={state === "online" ? "תקין" : state === "offline" ? "לא תקין" : "כבוי"} aria-label={state === "online" ? "תקין" : state === "offline" ? "לא תקין" : "כבוי"}><i /></span>
              {" "}{state === "online" ? "תקין" : state === "offline" ? "לא תקין" : "כבוי"} · {screen.name} · {screen.floor || "לובי"}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <i
                className="dot"
                style={{
                  width: 14,
                  height: 14,
                  margin: 0,
                  background: screen.remoteDesk?.keeperAt && now - screen.remoteDesk.keeperAt.getTime() < 75000 ? "#1faa4a" : "#d12626",
                  boxShadow: `0 0 8px ${screen.remoteDesk?.keeperAt && now - screen.remoteDesk.keeperAt.getTime() < 75000 ? "#1faa4a" : "#d12626"}`,
                }}
              />
              {screen.remoteDesk?.keeperAt && now - screen.remoteDesk.keeperAt.getTime() < 75000 ? "גישה פעילה" : "אין גישה"}
              {" · "}
              <i
                className="dot"
                style={{
                  width: 14,
                  height: 14,
                  margin: 0,
                  background: keeper2 ? "#1faa4a" : "#d12626",
                  boxShadow: `0 0 8px ${keeper2 ? "#1faa4a" : "#d12626"}`,
                }}
              />
              {keeper2 ? "NYKEEPER2" : "בלי NYKEEPER2"}
              {" · "}
              <i
                className="dot"
                style={{
                  width: 14,
                  height: 14,
                  margin: 0,
                  background: nyk ? "#1faa4a" : "#d12626",
                  boxShadow: `0 0 8px ${nyk ? "#1faa4a" : "#d12626"}`,
                }}
              />
              {nyk ? "NYK" : "בלי NYK"}
            </span>
            <span>
              {screen.group?.building?.name || screen.group?.name || "בלי קבוצה"}
              {" · "}
              {screen.heartbeat ? screen.heartbeat.at.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }) : "אין אות"}
              {" · "}
              <a href={`/s/${screen.code || screen.id}`} target="_blank">/s/{screen.code || screen.id}</a>
            </span>
            {screen.deviceStatus ? (
              <span>
                {`${screen.deviceStatus.version || "—"} · ${screen.deviceStatus.resolution || "—"} · ${screen.deviceStatus.ip || "—"} · ${screen.deviceStatus.freeMb}MB פנוי · עלה ${screen.deviceStatus.bootedAt ? screen.deviceStatus.bootedAt.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }) : "—"}`}
              </span>
            ) : null}
          </div>
          );
        })}
      </div>
    </main>
  );
}
