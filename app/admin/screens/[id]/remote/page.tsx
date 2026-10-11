import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { RemoteDesk } from "@/components/admin/RemoteDesk";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RemotePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  if (!isSystemAdmin(session)) redirect("/admin/buildings");
  const { id } = await params;
  const screen = await prisma.screen.findUnique({ where: { id: Number(id) } });
  if (!screen) notFound();
  const title = screen.name || `מסך ${screen.code || screen.id}`;

  return (
    <main className="admin">
      <AdminNav />
      <p><Link href={`/admin/screens/${screen.id}`}>חזרה למסך</Link></p>
      <h1>שליטה מרחוק · {title}</h1>
      <RemoteDesk screenId={screen.id} title={title} />
    </main>
  );
}
