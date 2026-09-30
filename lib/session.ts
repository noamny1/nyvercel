import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export function requireSession() {
  return getServerSession(authOptions);
}
