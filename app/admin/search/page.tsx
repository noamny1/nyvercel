import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const query = ((await searchParams).q || "").trim();
  const id = Number(query);
  const screens = query
    ? await prisma.screen.findMany({
        where: {
          AND: [
            await screenWhere(session),
            {
              OR: [
                ...(Number.isInteger(id) && id > 0 ? [{ id }, { code: id }] : []),
                { street: { contains: query, mode: "insensitive" as const } },
                { number: { contains: query, mode: "insensitive" as const } },
                { city: { contains: query, mode: "insensitive" as const } },
                { floor: { contains: query, mode: "insensitive" as const } },
                { name: { contains: query, mode: "insensitive" as const } },
                { group: { name: { contains: query, mode: "insensitive" as const } } },
              ],
            },
          ],
        },
        orderBy: [{ city: "asc" }, { street: "asc" }, { number: "asc" }],
        include: { group: { select: { name: true, street: true, number: true, city: true } } },
        take: 40,
      })
    : [];

  return (
    <main className="admin">
      <AdminNav />
      <h1>חיפוש</h1>
      <form className="card search-jump" action="/admin/search">
        <label>
          כתובת
          <input name="q" defaultValue={query} placeholder="רחוב, מספר, עיר או מספר מסך" autoFocus />
        </label>
        <button type="submit">חיפוש</button>
      </form>
      {query ? (
        <div className="search-hits">
          {screens.length === 0 ? <p>אין כתובת שמתאימה.</p> : null}
          {screens.map((screen) => {
            const street = screen.street || screen.group?.street || "";
            const number = screen.number || screen.group?.number || "";
            const city = screen.city || screen.group?.city || "";
            const line = [street, number].filter(Boolean).join(" ") || screen.name || "בלי כתובת";
            return (
              <Link key={screen.id} href={`/admin/screens/${screen.id}`}>
                <strong>{line}</strong>
                <span>{[city, screen.floor || "לובי", screen.group?.name].filter(Boolean).join(" · ")}</span>
                <em>{screen.code || screen.id}</em>
              </Link>
            );
          })}
        </div>
      ) : null}
    </main>
  );
}
