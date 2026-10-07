import { prisma } from "@/lib/prisma";

export const THEMES = [
  { id: "modern", name: "מודרני", note: "התמה הרגילה של המסך" },
  { id: "luxury", name: "יוקרתי", note: "עמודה כהה, חדשות והודעות לסירוגין" },
  { id: "glass", name: "זכוכית", note: "תמונה על כל המסך, כרטיס שקוף והודעה מתחלפת" },
  { id: "cinema", name: "קולנוע", note: "שקף רחב, שעון והודעה בשורה למטה" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const DEFAULT_CLIENT_IDS: ThemeId[] = ["modern", "luxury"];

export function isThemeId(value: string): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export async function clientThemeIds() {
  const row = await prisma.systemFlag.findUnique({ where: { id: "clientThemes" } }).catch(() => null);
  if (!row) return DEFAULT_CLIENT_IDS;
  const picked = row.value.split(",").map((item) => item.trim()).filter(isThemeId);
  return picked.length > 0 ? picked : DEFAULT_CLIENT_IDS;
}

export async function clientThemes() {
  const ids = await clientThemeIds();
  return THEMES.filter((theme) => ids.includes(theme.id)).map(({ id, name }) => ({ id, name }));
}

export async function savedTheme(requested: string, current: string) {
  const ids = await clientThemeIds();
  if (isThemeId(requested) && ids.includes(requested)) return requested;
  if (isThemeId(requested) && requested === current) return current;
  if (isThemeId(current) && ids.includes(current)) return current;
  return ids[0] || "modern";
}
