import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function loadDotenvFile() {
  try {
    const source = readFileSync(".env", "utf8");
    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const rawValue = trimmed.slice(index + 1).trim();
      if (!key || process.env[key] !== undefined) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  } catch {
    // Environment variables may already be injected by the host.
  }
}

export function readDatabaseUrl() {
  loadDotenvFile();
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL belum diset.");
  const url = new URL(raw);
  if (!url.protocol.startsWith("mysql")) throw new Error("DATABASE_URL harus MySQL/MariaDB.");
  const database = url.pathname.replace(/^\//, "");
  if (!database) throw new Error("DATABASE_URL harus menyertakan nama database.");
  return {
    database,
    host: url.hostname || "127.0.0.1",
    password: decodeURIComponent(url.password),
    port: url.port || "3306",
    user: decodeURIComponent(url.username || "root"),
  };
}

function commandWorks(command) {
  const result = spawnSync(command, ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

export function findDatabaseCommand(kind) {
  const explicit = kind === "dump" ? process.env.MYSQL_DUMP_BIN : process.env.MYSQL_BIN;
  const localBase = path.join(os.homedir(), ".local/share/oneday-mariadb/root/usr/bin");
  const candidates = [
    explicit,
    kind === "dump" ? "mariadb-dump" : "mariadb",
    kind === "dump" ? "mysqldump" : "mysql",
    path.join(localBase, kind === "dump" ? "mariadb-dump" : "mariadb"),
    path.join(localBase, kind === "dump" ? "mysqldump" : "mysql"),
  ].filter(Boolean);

  for (const command of candidates) {
    if ((command.includes("/") && existsSync(command)) || commandWorks(command)) return command;
  }

  throw new Error(kind === "dump"
    ? "mariadb-dump/mysqldump tidak ditemukan."
    : "mariadb/mysql client tidak ditemukan.");
}

export function databaseCliArgs(config) {
  return [
    `--host=${config.host}`,
    `--port=${config.port}`,
    `--user=${config.user}`,
    "--protocol=tcp",
    "--default-character-set=utf8mb4",
  ];
}
