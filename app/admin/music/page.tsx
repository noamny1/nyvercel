import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { setMusic } from "@/app/admin/actions";
import { PLAYLISTS, tracksFor } from "@/lib/music-catalog";
import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function place(screen: { street: string; number: string; city: string; name: string }) {
  const line = [screen.street, screen.number].filter(Boolean).join(" ");
  return [line, screen.city].filter(Boolean).join(", ") || screen.name;
}

export default async function MusicPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  if (!isSystemAdmin(session)) redirect("/admin/buildings");
  const { q } = await searchParams;
  const query = (q || "").trim();
  const code = Number(query);
  const where = await screenWhere(session);
  const screens = await prisma.screen.findMany({
    where: {
      AND: [
        where,
        ...(query
          ? [{
              OR: [
                { street: { contains: query, mode: "insensitive" as const } },
                { city: { contains: query, mode: "insensitive" as const } },
                { name: { contains: query, mode: "insensitive" as const } },
                ...(Number.isInteger(code) && code > 0 ? [{ code }] : []),
              ],
            }]
          : []),
      ],
    },
    orderBy: { id: "desc" },
    take: 40,
    include: { group: { select: { musicUrl: true } } },
  });

  return (
    <main className="admin">
      <AdminNav />
      <h1>מוזיקה</h1>
      <p>חמש רשימות נגינה בלי מילים, כולל טרקלין. מותר להשמיע אותן במסך, והקרדיט ליוצר נשמר. מוזיקה מסחרית לא נכללת.</p>
      <div className="stats">
        {PLAYLISTS.map((playlist) => (
          <div className="stat" key={playlist.id}>
            <span>{playlist.name}</span>
            <b>{tracksFor(playlist.id).length}</b>
            <small>{playlist.text}</small>
          </div>
        ))}
      </div>
      <form className="card row" action="/admin/music">
        <input name="q" defaultValue={query} placeholder="חיפוש לפי רחוב, עיר או מספר מסך" />
        <button type="submit">חיפוש</button>
      </form>
      <form className="card row" action={setMusic}>
        {screens.map((screen) => <input key={screen.id} type="hidden" name="screenId" value={screen.id} />)}
        <strong>כל הבניינים שמוצגים</strong>
        <select name="playlist" defaultValue="spa" aria-label="רשימה לכל הבניינים">
          <option value="off">כבוי</option>
          {PLAYLISTS.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}
        </select>
        <button type="submit">החלה על כולם</button>
      </form>
      {screens.map((screen) => (
        <form className="card row" action={setMusic} key={screen.id}>
          <input type="hidden" name="screenId" value={screen.id} />
          <strong>{place(screen)}</strong>
          <select name="playlist" defaultValue={screen.musicPlaylist || ""} aria-label="רשימת השמעה">
            {!screen.musicPlaylist && screen.group?.musicUrl ? <option value="">קישור ישן</option> : null}
            <option value="off">כבוי</option>
            {PLAYLISTS.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}
          </select>
          <button type="submit">שמירה</button>
        </form>
      ))}
      {screens.length === 0 ? <p>אין בניינים להצגה.</p> : null}
    </main>
  );
}
