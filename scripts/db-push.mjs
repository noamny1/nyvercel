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
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpPending" TEXT NOT NULL DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS "RemoteDesk" (
    "screenId" INTEGER NOT NULL,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "frame" BYTEA,
    "frameAt" TIMESTAMP(3),
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "apps" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "shellOut" TEXT NOT NULL DEFAULT '',
    "shellUntil" TIMESTAMP(3),
    "logOut" TEXT NOT NULL DEFAULT '',
    "seenAt" TIMESTAMP(3),
    CONSTRAINT "RemoteDesk_pkey" PRIMARY KEY ("screenId")
  )`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "frame" BYTEA`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "frameAt" TIMESTAMP(3)`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "width" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "height" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "apps" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "note" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "shellOut" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "shellUntil" TIMESTAMP(3)`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "logOut" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "seenAt" TIMESTAMP(3)`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "upgradeUrl" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "lastApk" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "keeperAt" TIMESTAMP(3)`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "keeper2At" TIMESTAMP(3)`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "mediaPausedUntil" TIMESTAMP(3)`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "wakeUntil" TIMESTAMP(3)`,
  `ALTER TABLE "RemoteDesk" ADD COLUMN IF NOT EXISTS "revivedAt" TIMESTAMP(3)`,
  `CREATE TABLE IF NOT EXISTS "RemoteCommand" (
    "id" SERIAL NOT NULL,
    "screenId" INTEGER NOT NULL,
    "op" TEXT NOT NULL,
    "x" INTEGER NOT NULL DEFAULT 0,
    "y" INTEGER NOT NULL DEFAULT 0,
    "x2" INTEGER NOT NULL DEFAULT 0,
    "y2" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RemoteCommand_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "RemoteCommand_screenId_id_idx" ON "RemoteCommand"("screenId", "id")`,
  `CREATE TABLE IF NOT EXISTS "DeviceStatus" (
    "screenId" INTEGER NOT NULL,
    "version" TEXT NOT NULL DEFAULT '',
    "resolution" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "freeMb" INTEGER NOT NULL DEFAULT 0,
    "bootedAt" TIMESTAMP(3),
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeviceStatus_pkey" PRIMARY KEY ("screenId")
  )`,
  `CREATE TABLE IF NOT EXISTS "ShellAudit" (
    "id" SERIAL NOT NULL,
    "screenId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShellAudit_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "Screen" ADD COLUMN IF NOT EXISTS "floor" TEXT NOT NULL DEFAULT 'לובי'`,
  `ALTER TABLE "ScreenGroup" ADD COLUMN IF NOT EXISTS "promoUrl" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "ScreenGroup" ADD COLUMN IF NOT EXISTS "promoSeconds" INTEGER NOT NULL DEFAULT 20`,
  `ALTER TABLE "Screen" ADD COLUMN IF NOT EXISTS "listSort" INTEGER NOT NULL DEFAULT 0`,
  `UPDATE "Screen" SET "listSort" = "id" WHERE "listSort" = 0`,
  `ALTER TABLE "Screen" ADD COLUMN IF NOT EXISTS "newsTicker" TEXT NOT NULL DEFAULT 'on'`,
  `ALTER TABLE "Screen" ADD COLUMN IF NOT EXISTS "feedMode" TEXT NOT NULL DEFAULT 'both'`,
  `ALTER TABLE "Slide" ADD COLUMN IF NOT EXISTS "startsOn" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Slide" ADD COLUMN IF NOT EXISTS "endsOn" TEXT NOT NULL DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS "SchemaNote" ("id" TEXT PRIMARY KEY)`,
  `CREATE TABLE IF NOT EXISTS "GroupManager" (
    "groupId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "GroupManager_pkey" PRIMARY KEY ("groupId", "userId")
  )`,
  `CREATE INDEX IF NOT EXISTS "GroupManager_userId_idx" ON "GroupManager"("userId")`,
  `DO $$ BEGIN
    ALTER TABLE "GroupManager"
      ADD CONSTRAINT "GroupManager_groupId_fkey"
      FOREIGN KEY ("groupId") REFERENCES "ScreenGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    ALTER TABLE "GroupManager"
      ADD CONSTRAINT "GroupManager_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$`,
  `CREATE TABLE IF NOT EXISTS "SystemFlag" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "SystemFlag_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "FileLink" (
    "token" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "mime" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileLink_pkey" PRIMARY KEY ("token")
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
