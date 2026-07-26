import { prisma } from "@/lib/prisma";
import { createToken, hashPassword, hashToken, isStrongPassword, verifyPassword } from "@/lib/passwords";

export type RegisteredEmailAccount = {
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  verified: boolean;
  createdAt: string;
  verifiedAt?: string;
  verifyExpiresAt?: string;
  resetExpiresAt?: string;
};

const verificationTtlMs = 30 * 60 * 1000;
const resetTtlMs = 30 * 60 * 1000;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export { isStrongPassword };

function nameFromEmail(email: string) {
  const localPart = email.split("@")[0] || "ONEDAY User";
  return localPart.split(/[._-]+/).filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ") || "ONEDAY User";
}

function publicAccount(user: {
  email: string; name: string | null; role: "USER" | "ADMIN"; emailVerified: Date | null;
  createdAt: Date; verificationExpiresAt: Date | null; resetExpiresAt: Date | null;
}): RegisteredEmailAccount {
  return {
    email: user.email,
    name: user.name ?? nameFromEmail(user.email),
    role: user.role,
    verified: Boolean(user.emailVerified),
    createdAt: user.createdAt.toISOString(),
    verifiedAt: user.emailVerified?.toISOString(),
    verifyExpiresAt: user.verificationExpiresAt?.toISOString(),
    resetExpiresAt: user.resetExpiresAt?.toISOString(),
  };
}

export function getVerificationExpiry(account: RegisteredEmailAccount) {
  return account.verifyExpiresAt ?? new Date(0).toISOString();
}

export function isVerificationExpired(account: RegisteredEmailAccount, now = new Date()) {
  return !account.verified && (!account.verifyExpiresAt || now > new Date(account.verifyExpiresAt));
}

export async function findRegisteredAccount(email: string) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  return user ? publicAccount(user) : null;
}

export async function authenticateEmailAccount(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) return null;
  return publicAccount(user);
}

export async function registerEmailAccount({ email, password }: { email: string; password: string }) {
  if (!isValidEmail(email) || !isStrongPassword(password)) throw new Error("INVALID_CREDENTIALS");
  const normalized = normalizeEmail(email);
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing?.emailVerified) return { account: publicAccount(existing), alreadyVerified: true, token: undefined };

  const token = createToken();
  const expiresAt = new Date(Date.now() + verificationTtlMs);
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email: normalized },
    update: { passwordHash, verificationTokenHash: hashToken(token), verificationExpiresAt: expiresAt },
    create: {
      email: normalized, name: nameFromEmail(normalized), passwordHash,
      verificationTokenHash: hashToken(token), verificationExpiresAt: expiresAt,
    },
  });
  return { account: publicAccount(user), alreadyVerified: false, token };
}

export async function refreshEmailVerificationInvitation(email: string) {
  const normalized = normalizeEmail(email);
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (!existing || existing.emailVerified) return existing ? { account: publicAccount(existing), token: undefined } : null;
  const token = createToken();
  const user = await prisma.user.update({
    where: { email: normalized },
    data: { verificationTokenHash: hashToken(token), verificationExpiresAt: new Date(Date.now() + verificationTtlMs) },
  });
  return { account: publicAccount(user), token };
}

export async function verifyEmailAccount(email: string, token: string) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user?.verificationTokenHash || !user.verificationExpiresAt || user.verificationExpiresAt < new Date()) return null;
  if (hashToken(token) !== user.verificationTokenHash || user.emailVerified) return null;
  const verified = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), verificationTokenHash: null, verificationExpiresAt: null },
  });
  return publicAccount(verified);
}

export async function createPasswordResetInvitation(email: string) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user?.emailVerified || !user.passwordHash) return null;
  const token = createToken();
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { resetTokenHash: hashToken(token), resetExpiresAt: new Date(Date.now() + resetTtlMs) },
  });
  return { account: publicAccount(updated), token };
}

export async function resetEmailAccountPassword({ email, token, password }: { email: string; token: string; password: string }) {
  if (!isStrongPassword(password)) return null;
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user?.resetTokenHash || !user.resetExpiresAt || user.resetExpiresAt < new Date()) return null;
  if (hashToken(token) !== user.resetTokenHash) return null;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), resetTokenHash: null, resetExpiresAt: null },
  });
  return publicAccount(updated);
}
