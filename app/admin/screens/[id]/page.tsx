import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ScreenEditor } from "@/components/admin/ScreenEditor";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ScreenPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const { id } = await params;
  const screen = await prisma.screen.findUnique({
    where: { id: Number(id) },
    include: { slides: { orderBy: { sort: "asc" } }, notices: { orderBy: { id: "desc" } } },
  });
  if (!screen) notFound();

  return (
    <main className="admin">
      <p><Link href="/admin">כל המסכים</Link> · <a href={`/s/${screen.id}`} target="_blank">תצוגה /s/{screen.id}</a></p>
      <h1>{screen.name}</h1>
      <ScreenEditor screen={screen} slides={screen.slides} notices={screen.notices} />
    </main>
  );
}
