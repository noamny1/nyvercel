import { BOARDS } from "@/modules/crm/boards";

const HISTORY = "היסטורית משימות";

export type WorkRow = {
  id: number;
  board: string;
  name: string;
  updatedAt?: Date | string | null;
  fields: Record<string, string>;
};

function xml(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
}

function sheetName(name: string, used: Set<string>) {
  const clean = name.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31) || "גיליון";
  let next = clean;
  let index = 2;
  while (used.has(next)) {
    const suffix = ` ${index}`;
    next = `${clean.slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }
  used.add(next);
  return next;
}

function columns(rows: WorkRow[], withBoard: boolean) {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row.fields)) {
      if (key && key !== "Name") keys.add(key);
    }
  }
  const ordered = ["שם", ...(withBoard ? ["לשונית"] : []), "מזהה", ...Array.from(keys).sort((a, b) => a.localeCompare(b, "he")), "עודכן"];
  return ordered;
}

function cell(row: WorkRow, key: string) {
  if (key === "שם") return row.name || row.fields.Name || "";
  if (key === "לשונית") return row.board;
  if (key === "מזהה") return String(row.id);
  if (key === "עודכן") return row.updatedAt ? new Date(row.updatedAt).toLocaleString("sv-SE", { timeZone: "Asia/Jerusalem" }).slice(0, 16) : "";
  return row.fields[key] || "";
}

function sheet(name: string, rows: WorkRow[], withBoard: boolean) {
  const heads = columns(rows, withBoard);
  const head = `<Row>${heads.map((key) => `<Cell><Data ss:Type="String">${xml(key)}</Data></Cell>`).join("")}</Row>`;
  const body = rows
    .map((row) => `<Row>${heads.map((key) => `<Cell><Data ss:Type="String">${xml(cell(row, key))}</Data></Cell>`).join("")}</Row>`)
    .join("");
  return `<Worksheet ss:Name="${xml(name)}"><Table>${head}${body}</Table></Worksheet>`;
}

export function crmWorkbook(rows: WorkRow[]) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  const used = new Set<string>();
  const boards = [...BOARDS, HISTORY, ...Array.from(new Set(rows.map((row) => row.board))).filter((name) => !BOARDS.includes(name as (typeof BOARDS)[number]) && name !== HISTORY)];
  const sheets = [
    sheet(sheetName("הכל", used), rows, true),
    ...boards.map((board) => sheet(sheetName(board, used), rows.filter((row) => row.board === board), false)),
  ];
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${sheets.join("\n")}
</Workbook>`;
  return { filename: `crm-${day}.xls`, xml: xmlBody, count: rows.length };
}
