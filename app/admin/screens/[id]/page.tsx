import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { ScreenEditor } from "@/components/admin/ScreenEditor";
import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { editorThemes } from "@/lib/themes";
import { CITIES } from "@/lib/cities";
import { setScreenService } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

function line(screen: { street: string; number: string; city: string; name: string; floor?: string; group: { street: string; number: string; city: string } | null }) {
  const place = [screen.street || screen.group?.street || "", screen.number || screen.group?.number || ""].filter(Boolean).join(" ");
  const address = [place, screen.city || screen.group?.city || ""].filter(Boolean).join(", ") || screen.name;
  return `${address} · ${screen.floor || "לובי"}`;
}

function placeCity(screen: { city: string; name: string; street: string; group: { city: string; name: string; street: string } | null }) {
  const saved = (screen.city || screen.group?.city || "").trim();
  if (saved) return saved;
  const text = [screen.name, screen.street, screen.group?.name, screen.group?.street].filter(Boolean).join(" ");
  return CITIES.find((city) => text.includes(city)) || "";
}

export default async function ScreenPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const { id } = await params;
  const where = await screenWhere(session);
  const screen = await prisma.screen.findFirst({
    where: { id: Number(id), ...where },
    include: {
      group: true,
      slides: { orderBy: { sort: "asc" } },
      notices: { orderBy: { id: "desc" } },
      floors: { include: { rooms: { orderBy: { id: "asc" } } }, orderBy: { id: "asc" } },
    },
  });
  if (!screen) notFound();
  const musicPeers = await prisma.screen.count({
    where: isSystemAdmin(session)
      ? { users: { some: { screens: { some: { id: screen.id } } } } }
      : where,
  });

  return (
    <main className="admin">
      <AdminNav />
      <p><Link href="/admin/buildings">כל הבניינים</Link></p>
      <h1>{line(screen)}</h1>
      <p>כתובת למכשיר: nytv.app/s/{screen.code || screen.id}</p>
      {isSystemAdmin(session) ? <p><Link href={`/admin/screens/${screen.id}/remote`}>שליטה מרחוק על ה-Smart TV</Link></p> : null}
      {isSystemAdmin(session) ? (
        <form className="card" action={setScreenService}>
          <input type="hidden" name="id" value={screen.id} />
          <input type="hidden" name="service" value={screen.serviceOn ? "off" : "on"} />
          <h2>שירות לכתובת</h2>
          <p>{screen.serviceOn ? "השירות פעיל בכתובת הזו." : "השירות מושבת בכתובת הזו. המסך לא מציג תוכן ולא מנגן. ההגדרות נשמרות."}</p>
          {screen.group && screen.group.serviceOn === false ? <p>הקבוצה מושבתת, ולכן המסך נשאר כבוי גם אם מפעילים אותו כאן.</p> : null}
          <button type="submit">{screen.serviceOn ? "השבתת שירות" : "הפעלת שירות"}</button>
        </form>
      ) : null}
      <ScreenEditor screen={{ ...screen, city: placeCity(screen) }} slides={screen.slides} notices={screen.notices} floors={screen.floors} lockAddress={!isSystemAdmin(session)} musicPeers={musicPeers} newsTuning={isSystemAdmin(session)} canTheme={isSystemAdmin(session)} themes={await editorThemes(isSystemAdmin(session))} />
    </main>
  );
}
