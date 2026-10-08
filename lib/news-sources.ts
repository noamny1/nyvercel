export const NEWS_SOURCES = [
  { id: "ynet", name: "ynet" },
  { id: "walla", name: "וואלה" },
  { id: "channel14", name: "חדשות 14" },
  { id: "0404", name: "חדשות 0404" },
  { id: "one", name: "ספורט ONE" },
  { id: "globes", name: "כלכלה גלובס" },
  { id: "bhol", name: "בחדרי חרדים" },
];

export function chipLabel(name: string) {
  if (name === "חדשות 14") return "14";
  if (name === "חדשות 0404") return "0404";
  if (name === "ספורט ONE") return "ONE";
  if (name === "כלכלה גלובס") return "גלובס";
  return name;
}
