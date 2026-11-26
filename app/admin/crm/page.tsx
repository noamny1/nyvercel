export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { ensureCurrentPayMonth } from "@/modules/crm/ensure-pay-month";
import { loadBoard, loadChoices, loadCounts } from "@/modules/crm/query";
import { CrmApp, type CrmRow } from "@/modules/crm/CrmApp";

export default async function CrmPage() {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) redirect("/admin/login");
  await ensureCurrentPayMonth();
  const [counts, rows, choiceValues] = await Promise.all([loadCounts(), loadBoard("משימות יובל"), loadChoices()]);
  return <CrmApp rows={rows as CrmRow[]} counts={counts} choiceValues={choiceValues} />;
}
