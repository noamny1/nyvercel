import { prisma } from "@/lib/prisma";
import { BOARDS } from "@/modules/crm/boards";

export const TASKS = ["משימות נירית", "משימות נועם", "משימות יובל"];
export const HISTORY = "היסטורית משימות";
export const CHOICE_FIELDS = ["עיר", "סטטוס", "סוג לקוח", "תימה", "אמצעי תשלום", "תשתית"];

function isClosed(fields: Record<string, string>) {
  return fields["סטטוס משימה"] === "נסגרה";
}

function fieldsOf(value: unknown, name: string) {
  const fields: Record<string, string> = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item == null || item === "") continue;
      fields[key] = String(item);
    }
  }
  if (!fields.Name) fields.Name = name;
  return fields;
}

export async function loadBoard(board: string) {
  const rows = await prisma.crmClient.findMany({
    where: board === HISTORY ? { board: { in: [...TASKS, HISTORY] } } : { board },
    select: { id: true, name: true, board: true, createdAt: true, fields: true },
  });
  return rows
    .map((client) => ({
      id: client.id,
      board: client.board || "כתובות פעילות",
      name: client.name,
      createdAt: client.createdAt.toISOString(),
      fields: fieldsOf(client.fields, client.name),
    }))
    .filter((row) => {
      if (board === HISTORY) return row.board === HISTORY || (TASKS.includes(row.board) && isClosed(row.fields));
      if (TASKS.includes(board)) return !isClosed(row.fields);
      return true;
    });
}

export async function loadCounts() {
  const [grouped, taskRows] = await Promise.all([
    prisma.crmClient.groupBy({ by: ["board"], _count: { _all: true } }),
    prisma.crmClient.findMany({ where: { board: { in: TASKS } }, select: { board: true, fields: true } }),
  ]);
  const counts: Record<string, number> = Object.fromEntries([...BOARDS, HISTORY].map((name) => [name, 0]));
  for (const row of grouped) counts[row.board] = (counts[row.board] || 0) + row._count._all;
  for (const row of taskRows) {
    if (!isClosed(fieldsOf(row.fields, ""))) continue;
    counts[row.board] = Math.max(0, (counts[row.board] || 0) - 1);
    counts[HISTORY] += 1;
  }
  return counts;
}

export async function loadChoices() {
  const entries = await Promise.all(CHOICE_FIELDS.map(async (key) => {
    const rows = await prisma.$queryRaw<{ value: string }[]>`
      SELECT DISTINCT fields->>${key} AS value
      FROM "CrmClient"
      WHERE COALESCE(fields->>${key}, '') <> ''
    `;
    return [key, rows.map((row) => row.value).filter(Boolean)] as const;
  }));
  return Object.fromEntries(entries) as Record<string, string[]>;
}
