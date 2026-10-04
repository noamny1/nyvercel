import { prisma } from "@/lib/prisma";
import { isSystemAdmin } from "@/lib/session";

type Session = { user?: { email?: string | null; name?: string | null } } | null;

export async function screenWhere(session: Session) {
  if (isSystemAdmin(session)) return {};
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return { id: -1 };
  return { users: { some: { email } } };
}

export async function groupWhere(session: Session) {
  if (isSystemAdmin(session)) return {};
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return { id: -1 };
  return { screens: { some: { users: { some: { email } } } } };
}
