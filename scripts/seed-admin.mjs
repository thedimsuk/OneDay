import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as callback } from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const scrypt = promisify(callback);
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";
const name = process.env.ADMIN_NAME?.trim() || "ONEDAY Admin";

if (!email || password.length < 12) {
  console.log("Admin tidak dibuat: isi ADMIN_EMAIL dan ADMIN_PASSWORD (minimal 12 karakter).");
  await prisma.$disconnect();
  process.exit(0);
}

const salt = randomBytes(16).toString("hex");
const hash = await scrypt(password, salt, 64);
const passwordHash = `scrypt$${salt}$${hash.toString("hex")}`;
await prisma.user.upsert({
  where: { email },
  update: { name, role: "ADMIN", passwordHash, emailVerified: new Date() },
  create: { email, name, role: "ADMIN", passwordHash, emailVerified: new Date() },
});
console.log(`Admin siap: ${email}`);
await prisma.$disconnect();
