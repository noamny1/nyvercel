import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { ScreenEditor } from "@/components/admin/ScreenEditor";
import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function line(screen: { street: string; number: string; city: string; name: string; group: { street: string; number: string; city: string } | null }) {
  const place = [screen.street || screen.group?.street || "", screen.number || screen.group?.number || ""].filter(Boolean).join(" ");
  return [place, screen.city || screen.group?.city || ""].filter(Boolean).join(", ") || screen.name;
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
    },
  });
  if (!screen) notFound();

  return (
    <main className="admin">
      <AdminNav />
      <p><Link href="/admin/buildings">כל הבניינים</Link></p>
      <h1>{line(screen)}</h1>
      <p>כתובת למכשיר: nytv.app/s/{screen.code || screen.id}</p>
      <ScreenEditor screen={screen} slides={screen.slides} notices={screen.notices} lockAddress={!isSystemAdmin(session)} />
    </main>
  );
}
