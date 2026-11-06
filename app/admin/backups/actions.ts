"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { listBackups, restoreScreen, saveBackup } from "@/modules/backup/store";

async function owner() {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) redirect("/admin/buildings");
  return session;
}

export async function saveBackupNow() {
  await owner();
  try {
    await saveBackup();
  } catch {
    redirect("/admin/backups?done=fail");
  }
  revalidatePath("/admin/backups");
  redirect("/admin/backups?done=saved");
}

export async function restoreScreenBackup(formData: FormData) {
  await owner();
  const code = Number(String(formData.get("code") || "").replace(/\D/g, ""));
  const url = String(formData.get("backup") || "");
  const known = await listBackups();
  const pick = known.find((item) => item.url === url);
  if (!code || !pick) redirect("/admin/backups?done=bad");
  const result = await restoreScreen(code, pick.url, formData.get("users") === "1");
  revalidatePath("/admin/backups");
  if ("error" in result && result.error) redirect(`/admin/backups?done=miss&note=${encodeURIComponent(result.error)}`);
  redirect(`/admin/backups?done=restored&slides=${result.slides || 0}`);
}
