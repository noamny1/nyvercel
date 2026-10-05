import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("No database URL, skipping table setup");
  process.exit(0);
}

const env = { ...process.env, DATABASE_URL: url };
const sql = `
ALTER TABLE "Screen" ADD COLUMN IF NOT EXISTS "code" INTEGER;
ALTER TABLE "Screen" ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS "Screen_code_key" ON "Screen"("code");
CREATE TABLE IF NOT EXISTS "Heartbeat" (
  "screenId" INTEGER NOT NULL,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Heartbeat_pkey" PRIMARY KEY ("screenId")
);
DO $$ BEGIN
  ALTER TABLE "Heartbeat"
    ADD CONSTRAINT "Heartbeat_screenId_fkey"
    FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "Heartbeat_at_idx" ON "Heartbeat"("at");
`;
const file = join(tmpdir(), "nytv-schema.sql");
writeFileSync(file, sql);
const applied = spawnSync("npx", ["prisma", "db", "execute", "--file", file], { stdio: "inherit", env });
if (applied.status !== 0) process.exit(applied.status ?? 1);

function push(extra = []) {
  return spawnSync("npx", ["prisma", "db", "push", "--skip-generate", ...extra], { encoding: "utf8", env });
}

const first = push();
const output = `${first.stdout || ""}\n${first.stderr || ""}`;
if (output.trim()) console.log(output);
if (first.status === 0) process.exit(0);
if (/drop the |drop column|drop table|reset the database/i.test(output)) process.exit(first.status ?? 1);
const second = push(["--accept-data-loss"]);
const again = `${second.stdout || ""}\n${second.stderr || ""}`;
if (again.trim()) console.log(again);
process.exit(second.status ?? 1);
