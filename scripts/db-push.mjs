import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("No database URL, skipping table setup");
  process.exit(0);
}
process.env.DATABASE_URL = url;

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const statements = [
  `ALTER TABLE "Screen" ADD COLUMN IF NOT EXISTS "code" INTEGER`,
  `ALTER TABLE "Screen" ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 1`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Screen_code_key" ON "Screen"("code")`,
  `CREATE TABLE IF NOT EXISTS "Heartbeat" (
    "screenId" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Heartbeat_pkey" PRIMARY KEY ("screenId")
  )`,
  `DO $$ BEGIN
    ALTER TABLE "Heartbeat"
      ADD CONSTRAINT "Heartbeat_screenId_fkey"
      FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$`,
  `CREATE INDEX IF NOT EXISTS "Heartbeat_at_idx" ON "Heartbeat"("at")`,
  `ALTER TABLE "Screen" ADD COLUMN IF NOT EXISTS "newsTicker" TEXT NOT NULL DEFAULT 'on'`,
  `ALTER TABLE "Slide" ADD COLUMN IF NOT EXISTS "startsOn" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Slide" ADD COLUMN IF NOT EXISTS "endsOn" TEXT NOT NULL DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS "SystemFlag" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "SystemFlag_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM "SchemaNote" WHERE "id" = 'slide-weekdays-v1') THEN
      UPDATE "Slide" SET "weekdays" = '56' WHERE "weekdays" = '0123456' AND ("templateId" IN ('greet-shabbat', 'weekly-parasha') OR "title" LIKE '%שבת%' OR "title" LIKE '%פרש%');
      UPDATE "Slide" SET "weekdays" = '01234' WHERE "weekdays" = '0123456' AND COALESCE("templateId", '') NOT IN ('greet-shabbat', 'weekly-parasha') AND "title" NOT LIKE '%שבת%' AND "title" NOT LIKE '%פרש%';
      INSERT INTO "SchemaNote" ("id") VALUES ('slide-weekdays-v1');
    END IF;
  END $$`,
];

try {
  for (const sql of statements) await prisma.$executeRawUnsafe(sql);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}

const push = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], {
  encoding: "utf8",
  env: process.env,
});
const output = `${push.stdout || ""}\n${push.stderr || ""}`;
if (output.trim()) console.log(output);
if (push.status !== 0) {
  console.log("Schema push was skipped after the columns were added. Existing tables were not dropped.");
}
process.exit(0);
