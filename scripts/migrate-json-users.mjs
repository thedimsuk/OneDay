import { PrismaClient } from "@prisma/client";
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes, scrypt as callback } from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const scrypt = promisify(callback);
const file = new URL("../data/registered-users.json", import.meta.url);
let users = [];
try { users = JSON.parse(await readFile(file, "utf8")); } catch { process.exit(0); }

for (const legacy of users) {
  if (!legacy.email || !legacy.password) continue;
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(String(legacy.password), salt, 64);
  const passwordHash = `scrypt$${salt}$${hash.toString("hex")}`;
  const verifiedAt = legacy.verified ? new Date(legacy.verifiedAt || Date.now()) : null;
  await prisma.user.upsert({
    where: { email: String(legacy.email).trim().toLowerCase() },
    update: { name: legacy.name || undefined, passwordHash, emailVerified: verifiedAt },
    create: {
      email: String(legacy.email).trim().toLowerCase(), name: legacy.name || null,
      passwordHash, emailVerified: verifiedAt,
    },
  });
}
if (users.length) await writeFile(file, "[]\n", "utf8");
console.log(`${users.length} akun legacy dimigrasikan; file plaintext sudah dibersihkan.`);
await prisma.$disconnect();
