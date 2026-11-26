import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as fs from "fs";

const prisma = new PrismaClient();

async function importClients() {
  const wb = XLSX.readFile("crm_data/boards/1044647351_NYMedia.xlsx");
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  
  // Headers are in row 3 (index 2)
  const headers = data[2];
  const rows = data.slice(3);
  
  let imported = 0;
  for (const row of rows) {
    const name = row[0];
    if (!name || typeof name !== "string") continue;
    
    await prisma.crmClient.upsert({
      where: { mondayId: String(row[34] || name) },
      update: {},
      create: {
        name: name.trim(),
        city: row[2] || null,
        status: row[3] || null,
        workContent: row[4] || null,
        notes: row[5] || null,
        oneTimeCharge: parseFloat(row[6]) || null,
        monthlyPay: parseFloat(row[7]) || null,
        clientType: row[10] || null,
        infrastructure: row[11] || null,
        paymentMethod: row[12] || null,
        theme: row[13] || null,
        screenCount: parseInt(row[27]) || null,
        mondayId: String(row[34] || name),
      },
    });
    imported++;
  }
  console.log(`Imported ${imported} clients`);
}

importClients().finally(() => prisma.$disconnect());
