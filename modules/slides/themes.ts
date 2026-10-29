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
  { id: "azorim", name: "אזורים", note: "רק לקבוצה שמנהל המערכת משייך. רקע אזורים, שקף כמו ביוקרתי" },
  { id: "luxury-light", name: "יוקרתי בהיר", note: "יוקרתי על רקע בהיר. רק מנהל המערכת משייך" },
  { id: "floors", name: "קומות", note: "מסך עומד, מספרים וחדשות. רק מנהל המערכת משייך" },
  { id: "floors-glass", name: "קומות זכוכית לילה", note: "מגדל כהה ותגי קומה בהירים. רק מנהל המערכת משייך" },
  { id: "floors-cream", name: "קומות בורדו ושמנת", note: "רקע בורדו וכרטיסי שמנת. רק מנהל המערכת משייך" },
  { id: "floors-lobby", name: "קומות לובי בהיר", note: "לובי בהיר כמעט בלי מסגרות. רק מנהל המערכת משייך" },
  { id: "floors-rail", name: "קומות עמודה", note: "לוגו, שעון ומזג אוויר בעמודה כהה. רק מנהל המערכת משייך" },
  { id: "floors-board", name: "קומות לוח", note: "לוח כהה בשורות. רק מנהל המערכת משייך" },
  { id: "floors-sunset", name: "קומות שקיעה", note: "גווני שקיעה חמים. רק מנהל המערכת משייך" },
  { id: "floors-forest", name: "קומות יער", note: "ירוק יער כהה ותגים מרווה. רק מנהל המערכת משייך" },
  { id: "floors-light", name: "קומות כרטיס בהיר", note: "כרטיסים בהירים על המגדל. רק מנהל המערכת משייך" },
  { id: "floors-hotel", name: "קומות מלון", note: "לוח מלון על רקע שמנת. רק מנהל המערכת משייך" },
  { id: "floors-spine", name: "קומות פס צבע", note: "רקע שחור ופס צבע לכל קומה. רק מנהל המערכת משייך" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const DEFAULT_CLIENT_IDS: ThemeId[] = ["modern", "luxury"];

export function isThemeId(value: string): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export function isFloorsTheme(value: string) {
  return value === "floors" || value.startsWith("floors-");
}

export function isFaultTheme(value: string): value is ThemeId {
  return value.startsWith("fault-") && isThemeId(value);
}

export function floorPace(value: unknown) {
  const pace = Number(value);
  return pace === 16 || pace === 46 ? pace : 28;
}

export function floorCaption(value: unknown) {
  return value === "address" ? "address" : "name";
}

export async function clientThemeIds(): Promise<ThemeId[]> {
  const row = await prisma.systemFlag.findUnique({ where: { id: "clientThemes" } }).catch(() => null);
  if (!row) return DEFAULT_CLIENT_IDS;
  const picked = row.value.split(",").map((item) => item.trim()).filter((id): id is ThemeId => isThemeId(id) && id !== "luxury720" && id !== "azorim" && id !== "luxury-light" && !isFloorsTheme(id));
  return picked.length > 0 ? picked : DEFAULT_CLIENT_IDS;
}

export async function clientThemes() {
  const ids = await clientThemeIds();
  return THEMES.filter((theme) => ids.includes(theme.id)).map(({ id, name }) => ({ id, name }));
}

export async function editorThemes(owner: boolean) {
  const shown = await clientThemes();
  if (!owner) return shown;
  const extra = THEMES.filter((theme) => (isFaultTheme(theme.id) || theme.id === "azorim" || theme.id === "luxury-light" || isFloorsTheme(theme.id)) && !shown.some((item) => item.id === theme.id));
  return [...shown, ...extra.map(({ id, name }) => ({ id, name }))];
}

export async function savedTheme(requested: string, current: string, owner = false) {
  if (requested === "fault-card" || requested === "fault-night") return "luxury";
  if (requested === "azorim") return owner || current === "azorim" ? "azorim" : current;
  if (requested === "luxury-light") return owner || current === "luxury-light" ? "luxury-light" : current;
  if (isFloorsTheme(requested)) return owner || current === requested ? requested : current;
  if (owner && (requested === "luxury" || requested === "luxury720" || isFaultTheme(requested))) return requested;
  if (!owner && requested === "luxury" && current === "luxury720") return "luxury720";
  const ids = await clientThemeIds();
  if (isThemeId(requested) && requested !== "luxury720" && ids.includes(requested)) return requested;
  if (isThemeId(current) && (current === "luxury720" || ids.includes(current))) return current;
  return ids.find((id) => id !== "luxury720") || "modern";
}
