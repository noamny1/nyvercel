import { prisma } from "@/lib/prisma";
import { recentPayMonths, UNPAID } from "@/modules/crm/pay-months";

export async function ensureCurrentPayMonth() {
  const current = recentPayMonths().at(-1) || "";
  if (!current) return { ok: false as const };
  const flag = await prisma.systemFlag.findUnique({ where: { id: "crm-pay-month" } });
  if (flag?.value === current) return { ok: true as const, skipped: true, month: current };
  const rows = await prisma.crmClient.findMany({ where: { board: "הוראות קבע וועד" } });
  let updated = 0;
  for (const row of rows) {
    const fields = row.fields && typeof row.fields === "object" && !Array.isArray(row.fields) ? { ...(row.fields as Record<string, string>) } : {};
    if (String(fields[current] || "").trim()) continue;
    fields[current] = UNPAID;
    await prisma.crmClient.update({ where: { id: row.id }, data: { fields } });
    updated += 1;
  }
  await prisma.systemFlag.upsert({
    where: { id: "crm-pay-month" },
    update: { value: current },
    create: { id: "crm-pay-month", value: current },
  });
  return { ok: true as const, month: current, updated };
}
