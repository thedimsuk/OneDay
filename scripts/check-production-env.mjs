import { readFileSync } from "node:fs";

function loadDotenvFile() {
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

loadDotenvFile();

const required = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "AUTH_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "QRIS_WEBHOOK_SECRET",
  "NEXT_PUBLIC_QRIS_IMAGE_URL",
];

const missing = required.filter((key) => !process.env[key]?.trim());
const weak = [];

if ((process.env.AUTH_SECRET ?? "").length < 32) weak.push("AUTH_SECRET minimal 32 karakter.");
if ((process.env.ADMIN_PASSWORD ?? "").length < 12) weak.push("ADMIN_PASSWORD minimal 12 karakter.");
if (/127\.0\.0\.1|localhost/.test(process.env.NEXT_PUBLIC_SITE_URL ?? "")) {
  weak.push("NEXT_PUBLIC_SITE_URL harus memakai domain production, bukan localhost.");
}
if (/127\.0\.0\.1|localhost/.test(process.env.AUTH_URL ?? "")) {
  weak.push("AUTH_URL production harus memakai domain production jika diset.");
}
if (/127\.0\.0\.1|localhost/.test(process.env.NEXTAUTH_URL ?? "")) {
  weak.push("NEXTAUTH_URL production harus memakai domain production jika diset.");
}

if (missing.length || weak.length) {
  console.error("Environment production belum siap.");
  for (const key of missing) console.error(`- ${key} wajib diisi.`);
  for (const item of weak) console.error(`- ${item}`);
  process.exit(1);
}

console.log("Environment production terlihat siap.");
