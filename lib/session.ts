import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export function requireSession() {
  return getServerSession(authOptions);
}

export function isSystemAdmin(session: { user?: { email?: string | null; name?: string | null } } | null) {
  if (session?.user?.name === "owner") return true;
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return false;
  const owner = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return email === "noam6683@gmail.com" || email === owner;
}

