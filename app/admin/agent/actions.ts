"use server";

import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { runSystemAgent, type AgentReport } from "@/lib/system-agent";

async function admin() {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) throw new Error("רק מנהל המערכת יכול להפעיל את הסוכן.");
}

export async function runSystemAgentAction(): Promise<AgentReport> {
  await admin();
  return runSystemAgent();
}

export type OpenLink = { id: number; label: string };

export async function listOpenLinks(): Promise<OpenLink[]> {
  await admin();
  const since = new Date(Date.now() - 25000);
  const rows = await prisma.remoteDesk.findMany({
    where: { watchedAt: { gt: since } },
    select: {
      screenId: true,
      screen: { select: { code: true, name: true, street: true, number: true, city: true, floor: true } },
    },
    orderBy: { watchedAt: "desc" },
  });
  return rows.map((row) => {
    const screen = row.screen;
    const line = [screen.street, screen.number].filter(Boolean).join(" ");
    const city = [line, screen.city].filter(Boolean).join(", ");
    const label = [city || screen.name, screen.floor || "לובי", screen.code ? `מסך ${screen.code}` : ""].filter(Boolean).join(" · ");
    return { id: row.screenId, label };
  });
}

export async function closeOpenLink(screenId: number) {
  await admin();
  if (!screenId) return;
  await prisma.remoteDesk.update({
    where: { screenId },
    data: { watchedAt: new Date(0) },
  }).catch(() => undefined);
  await prisma.remoteCommand.create({
    data: { screenId, op: "frames", text: "0" },
  });
}
