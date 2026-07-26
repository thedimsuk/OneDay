import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, ".deploy");
const outFile = path.join(outDir, "oneday-deploy.tar.gz");

await mkdir(outDir, { recursive: true });

const excludes = [
  ".deploy",
  ".db-backups",
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  ".env*.local",
  ".git",
  ".localdb",
  ".next",
  ".next-*",
  ".tools",
  "debug.log",
  "node_modules",
  "data/registered-users.json",
];

const args = [
  "-czf",
  outFile,
  ...excludes.flatMap((item) => [`--exclude=${item}`]),
  ".",
];

const tar = spawn("tar", args, { cwd: root, stdio: "inherit" });

tar.on("exit", (code) => {
  if (code) {
    process.exit(code);
  }
  console.log(`Deploy package dibuat: ${outFile}`);
});
