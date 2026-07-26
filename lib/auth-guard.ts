import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { privateNoStoreHeaders } from "@/lib/http-cache";
import { getAdminSession, getAppSession, getUserSession } from "@/lib/session";

export async function requireAdminPage(nextPath: string) {
  const session = await getAdminSession();

  if (!session || session.role !== "ADMIN") {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return session;
}

export async function requireUserPage(nextPath: string) {
  const session = await getUserSession();

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return session;
}

export async function requireAdminApi() {
  const session = await getAdminSession();

  if (!session || session.role !== "ADMIN") {
    return {
      session: null,
      response: NextResponse.json({ ok: false, message: "Admin only" }, { status: 403, headers: privateNoStoreHeaders }),
    };
  }

  return { session, response: null };
}

export async function requireSessionApi() {
  const session = await getAppSession();

  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ ok: false, message: "Login required" }, { status: 401, headers: privateNoStoreHeaders }),
    };
  }

  return { session, response: null };
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  
  // In development without origin header, only allow if explicitly configured
  if (!origin) {
    // Production: must have origin header
    if (process.env.NODE_ENV === "production") {
      return false;
    }
    // Development: check if NEXTAUTH_URL is configured (means it's a real request, not direct fetch)
    return !!process.env.NEXTAUTH_URL;
  }

  try {
    const originHost = new URL(origin).host.toLowerCase();
    return trustedRequestHosts(request).some((host) => hostsMatch(originHost, host));
  } catch {
    return false;
  }
}

function trustedRequestHosts(request: Request) {
  return [
    new URL(request.url).host,
    request.headers.get("host"),
    request.headers.get("x-forwarded-host")?.split(",")[0],
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]
    .map(hostFromValue)
    .filter((host): host is string => Boolean(host));
}

function hostFromValue(value?: string | null) {
  if (!value) return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).host.toLowerCase();
  } catch {
    return "";
  }
}

function hostsMatch(originHost: string, trustedHost: string) {
  if (originHost === trustedHost) return true;

  const origin = splitHost(originHost);
  const trusted = splitHost(trustedHost);
  if (!origin || !trusted) return false;

  const sameLocalHost =
    (origin.hostname === "localhost" || origin.hostname === "127.0.0.1") &&
    (trusted.hostname === "localhost" || trusted.hostname === "127.0.0.1");

  return sameLocalHost && origin.port === trusted.port;
}

function splitHost(host: string) {
  try {
    const url = new URL(`http://${host}`);
    return {
      hostname: url.hostname.toLowerCase(),
      port: url.port,
    };
  } catch {
    return null;
  }
}
