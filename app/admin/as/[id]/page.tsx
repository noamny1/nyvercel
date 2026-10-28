import { notFound, redirect } from "next/navigation";
import { ClientScreens } from "@/components/admin/ClientScreens";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { editorThemes } from "@/lib/themes";

export const dynamic = "force-dynamic";

export default async function ViewAsClient({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  if (!isSystemAdmin(session)) redirect("/admin/buildings");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user || user.role !== "client") notFound();
  const [screens, manager] = await Promise.all([
    prisma.screen.findMany({
      where: { users: { some: { id: user.id } } },
      include: {
        group: true,
        users: { select: { name: true, email: true, role: true }, orderBy: { email: "asc" } },
        slides: { orderBy: { sort: "asc" } },
        notices: { orderBy: { id: "desc" } },
      },
    }),
    prisma.groupManager.findFirst({ where: { userId: user.id }, select: { groupId: true } }),
  ]);
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const back = `/admin/as/${user.id}`;
  return (
    <main className="admin">
      <p className="view-as">צופה כלקוח: {user.email}</p>
      <h1>המסכים שלי</h1>
      <ClientScreens
        manager={Boolean(manager)}
        musicPeers={screens.length}
        themes={await editorThemes(false)}
        returnTo={back}
        rows={[...screens].sort((a, b) => (a.groupId || 0) - (b.groupId || 0) || a.listSort - b.listSort || a.id - b.id).map((screen) => ({
          id: screen.id,
          code: screen.code,
          name: screen.name,
          street: screen.street || screen.group?.street || "",
          number: screen.number || screen.group?.number || "",
          city: screen.city || screen.group?.city || "",
          floor: screen.floor || "לובי",
          theme: screen.theme,
          logoUrl: screen.logoUrl,
          faultPhone: screen.faultPhone,
          faultLink: screen.faultLink,
          faultQrUrl: screen.faultQrUrl,
          newsSource: screen.newsSource,
          newsCount: screen.newsCount,
          tickerSeconds: screen.tickerSeconds,
          newsTicker: screen.newsTicker,
          feedMode: screen.feedMode,
          musicPlaylist: screen.musicPlaylist,
          musicDays: screen.musicDays,
          musicFrom: screen.musicFrom,
          musicUntil: screen.musicUntil,
          people: screen.users
            .filter((person) => {
              const email = person.email.trim().toLowerCase();
              return person.role !== "owner" && email !== "noam6683@gmail.com" && email !== admin;
            })
            .map((person) => person.email),
          slides: screen.slides,
          notices: screen.notices,
        }))}
      />
    </main>
  );
}
