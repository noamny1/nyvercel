"use server";

import { isSystemAdmin, requireSession } from "@/lib/session";
import { runSystemAgent, type AgentReport } from "@/lib/system-agent";

export async function runSystemAgentAction(): Promise<AgentReport> {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) throw new Error("רק מנהל המערכת יכול להפעיל את הסוכן.");
  return runSystemAgent();
}
