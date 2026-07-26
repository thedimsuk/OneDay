import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const roots = ["app", "components", "lib", "prisma", "scripts"];
const findings = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.(ts|tsx|mjs|prisma)$/.test(entry.name)) {
      const source = await readFile(file, "utf8");
      for (const [label, regex] of [
        ["credential hard-coded", /password\s*:\s*["'][^"']{8,}["']/i],
        ["unsafe JSON-LD", /dangerouslySetInnerHTML[^\n]+JSON\.stringify/],
        ["weak random ID", /id\s*:\s*`[^`]*\$\{Date\.now\(\)\}/],
      ]) if (regex.test(source)) findings.push(`${file}: ${label}`);
    }
  }
}
for (const root of roots) await walk(root);
if (findings.length) {
  console.error(findings.join("\n"));
  process.exitCode = 1;
} else console.log("Security heuristic check: OK");
