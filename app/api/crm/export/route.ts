import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { crmWorkbook, type WorkRow } from "@/modules/crm/workbook";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function fieldsOf(value: unknown, name: string) {
  const fields: Record<string, string> = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, item] of Object.entries(value)) fields[key] = item == null ? "" : String(item);
  }
  if (!fields.Name) fields.Name = name;
  return fields;
}

export async function GET() {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const clients = await prisma.crmClient.findMany({ orderBy: [{ board: "asc" }, { name: "asc" }] });
  const rows: WorkRow[] = clients.map((client) => ({
    id: client.id,
    board: client.board || "כתובות פעילות",
    name: client.name,
    updatedAt: client.updatedAt,
    fields: fieldsOf(client.fields, client.name),
  }));
  const book = crmWorkbook(rows);
  return new NextResponse(book.xml, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${book.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
