import { prisma } from "@/modules/data/prisma";

export const THEMES = [
  { id: "modern", name: "מודרני", note: "התמה הרגילה של המסך" },
  { id: "luxury", name: "יוקרתי", note: "עמודה כהה, חדשות והודעות לסירוגין" },
  { id: "luxury720", name: "יוקרתי720", note: "אותה תמה יוקרתית, למסך 1280×720" },
  { id: "glass", name: "זכוכית", note: "תמונה על כל המסך, כרטיס שקוף והודעה מתחלפת" },
  { id: "cinema", name: "קולנוע", note: "שקף רחב, שעון והודעה בשורה למטה" },
  { id: "fault-column", name: "התקלה בעמוד החדשות", note: "ברקוד בתחתית העמודה, למטה רק ברכה ולוגו" },
  { id: "fault-bar", name: "פס תחתון אחד", note: "ברכה ופתיחת תקלה על רקע בורדו, בשורה אחת" },
  { id: "fault-logo", name: "התקלה ליד הלוגו", note: "ברקוד בעמודת הלוגו, ברכה בורדו למטה" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const DEFAULT_CLIENT_IDS: ThemeId[] = ["modern", "luxury"];

export function isThemeId(value: string): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export function isFaultTheme(value: string): value is ThemeId {
  return value.startsWith("fault-") && isThemeId(value);
}

export async function clientThemeIds(): Promise<ThemeId[]> {
  const row = await prisma.systemFlag.findUnique({ where: { id: "clientThemes" } }).catch(() => null);
  if (!row) return DEFAULT_CLIENT_IDS;
  const picked = row.value.split(",").map((item) => item.trim()).filter((id): id is ThemeId => isThemeId(id) && id !== "luxury720");
  return picked.length > 0 ? picked : DEFAULT_CLIENT_IDS;
}

export async function clientThemes() {
  const ids = await clientThemeIds();
  return THEMES.filter((theme) => ids.includes(theme.id)).map(({ id, name }) => ({ id, name }));
}

export async function editorThemes(owner: boolean) {
  const shown = await clientThemes();
  if (!owner) return shown;
  const extra = THEMES.filter((theme) => isFaultTheme(theme.id) && !shown.some((item) => item.id === theme.id));
  return [...shown, ...extra.map(({ id, name }) => ({ id, name }))];
}

export async function savedTheme(requested: string, current: string, owner = false) {
  if (requested === "fault-card" || requested === "fault-night") return "luxury";
  if (owner && (requested === "luxury" || requested === "luxury720" || isFaultTheme(requested))) return requested;
  if (!owner && requested === "luxury" && current === "luxury720") return "luxury720";
  const ids = await clientThemeIds();
  if (isThemeId(requested) && requested !== "luxury720" && ids.includes(requested)) return requested;
  if (isThemeId(current) && (current === "luxury720" || ids.includes(current))) return current;
  return ids.find((id) => id !== "luxury720") || "modern";
}
