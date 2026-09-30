import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("No database URL, skipping table setup");
  process.exit(0);
}

const result = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url },
});

process.exit(result.status ?? 1);
