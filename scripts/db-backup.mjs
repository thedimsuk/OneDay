import { mkdirSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { databaseCliArgs, findDatabaseCommand, readDatabaseUrl } from "./db-utils.mjs";

const config = readDatabaseUrl();
const outDir = path.join(process.cwd(), ".db-backups");
mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = process.env.DB_BACKUP_FILE || path.join(outDir, `oneday-${stamp}.sql`);
const command = findDatabaseCommand("dump");

const args = [
  ...databaseCliArgs(config),
  "--single-transaction",
  "--quick",
  "--routines",
  "--triggers",
  "--events",
  "--add-drop-table",
  config.database,
  `--result-file=${outFile}`,
];

const child = spawn(command, args, {
  env: { ...process.env, MYSQL_PWD: config.password },
  stdio: ["ignore", "inherit", "inherit"],
});

child.on("exit", (code) => {
  if (code) process.exit(code);
  console.log(`Backup database dibuat: ${outFile}`);
});
