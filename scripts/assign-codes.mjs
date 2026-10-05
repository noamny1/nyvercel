import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("No database URL, skipping screen codes");
  process.exit(0);
}

process.env.DATABASE_URL = url;
const prisma = new PrismaClient();

function candidate() {
  return 100000 + Math.floor(Math.random() * 900000);
}

const missing = await prisma.screen.findMany({ where: { code: null }, select: { id: true } });
for (const screen of missing) {
  let code = 0;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const next = candidate();
    const taken = await prisma.screen.findUnique({ where: { code: next }, select: { id: true } });
    if (!taken) {
      code = next;
      break;
    }
  }
  if (code) await prisma.screen.update({ where: { id: screen.id }, data: { code } });
}

await prisma.$disconnect();
console.log(`Assigned codes to ${missing.length} screens`);
