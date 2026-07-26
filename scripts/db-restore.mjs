import { existsSync, createReadStream } from "node:fs";
import { spawn } from "node:child_process";
import { databaseCliArgs, findDatabaseCommand, readDatabaseUrl } from "./db-utils.mjs";

const backupFile = process.argv[2] || process.env.DB_RESTORE_FILE;
if (!backupFile) {
  console.error("Pakai: npm run db:restore -- path/backup.sql");
  process.exit(1);
}

if (!existsSync(backupFile)) {
  console.error(`File backup tidak ditemukan: ${backupFile}`);
  process.exit(1);
}

if (process.env.DB_RESTORE_CONFIRM !== "YES") {
  console.error("Restore dibatalkan. Set DB_RESTORE_CONFIRM=YES untuk menimpa database target.");
  process.exit(1);
}

const config = readDatabaseUrl();
const command = findDatabaseCommand("client");
const args = [...databaseCliArgs(config), config.database];

const child = spawn(command, args, {
  env: { ...process.env, MYSQL_PWD: config.password },
  stdio: ["pipe", "inherit", "inherit"],
});

createReadStream(backupFile).pipe(child.stdin);

child.on("exit", (code) => {
  if (code) process.exit(code);
  console.log(`Restore database selesai dari: ${backupFile}`);
});
