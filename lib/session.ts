import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { auth } from "@/auth";

type AppRole = "USER" | "ADMIN";

export type AppSession = {
  role: AppRole;
  name: string;
  email: string;
};

export const sessionCookieNames = {
  user: "oneday_user_session",
  admin: "oneday_admin_session",
  legacy: "oneday_session",
} as const;

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET wajib diisi.");
  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function createAppSessionCookieValue(session: AppSession) {
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function parseAppSessionCookie(raw: string): AppSession | null {
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as AppSession;
    if ((parsed.role === "USER" || parsed.role === "ADMIN") && parsed.email && parsed.name) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

async function getCookieSession(name: string, role?: AppRole): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(name)?.value;

  if (raw) {
    const session = parseAppSessionCookie(raw);
    if (session && (!role || session.role === role)) {
      return session;
    }
  }

  return null;
}

async function getAuthSession(role?: AppRole): Promise<AppSession | null> {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  const sessionRole = (session.user.role ?? "USER") as AppRole;
  if (role && sessionRole !== role) {
    return null;
  }

  return {
    role: sessionRole,
    name: session.user.name ?? "ONEDAY User",
    email: session.user.email,
  };
}

export async function getUserSession(): Promise<AppSession | null> {
  return (await getCookieSession(sessionCookieNames.user, "USER")) ?? (await getAuthSession("USER"));
}

export async function getAdminSession(): Promise<AppSession | null> {
  return (await getCookieSession(sessionCookieNames.admin, "ADMIN")) ?? (await getAuthSession("ADMIN"));
}

export async function getAppSession(): Promise<AppSession | null> {
  // Try both user and admin session, prefer whichever exists
  // But they should NOT be called in sequence if one fails
  const [userSession, adminSession] = await Promise.all([
    getUserSession(),
    getAdminSession(),
  ]);

  // Prioritize based on role - Admin takes precedence for security
  return adminSession ?? userSession;
}
                                                                                                                                             
