"use server";

import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import {
  createPasswordResetInvitation,
  authenticateEmailAccount,
  findRegisteredAccount,
  isValidEmail,
  isStrongPassword,
  refreshEmailVerificationInvitation,
  registerEmailAccount,
  resetEmailAccountPassword,
  verifyEmailAccount,
} from "@/lib/email-accounts";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email-delivery";
import { createAppSessionCookieValue, sessionCookieNames } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { safeUserRedirect } from "@/lib/safe-redirect";

async function allowAuthAttempt(action: string, email: string) {
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return rateLimit(`${action}:${ip}:${email}`, 8, 15 * 60 * 1000);
}

export async function emailAccessAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const requestedNext = String(formData.get("next") ?? "");
  const next = safeUserRedirect(requestedNext, "");

  if (!(await allowAuthAttempt("login", email))) redirect("/login?error=rate-limit");

  if (!isValidEmail(email) || !password.trim()) {
    redirect(`/login?error=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  const registered = await findRegisteredAccount(email);

  if (!registered) {
    if (!isStrongPassword(password)) redirect(`/login?error=weak-password${next ? `&next=${encodeURIComponent(next)}` : ""}`);
    const { account, token } = await registerEmailAccount({ email, password });
    const delivery = token ? await sendVerificationEmail(account.email, token, next) : null;
    const devUrl = delivery && !delivery.delivered && process.env.NODE_ENV !== "production" ? `&devUrl=${encodeURIComponent(delivery.url)}` : "";
    redirect(`/email-invitation?email=${encodeURIComponent(account.email)}${next ? `&next=${encodeURIComponent(next)}` : ""}${devUrl}`);
  }

  const authenticated = await authenticateEmailAccount(email, password);
  if (!authenticated) {
    redirect(`/login?error=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  if (!authenticated.verified) {
    redirect(`/email-invitation?email=${encodeURIComponent(email)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  await setLoginCookie({
    role: authenticated.role,
    name: authenticated.name,
    email: authenticated.email,
  });
  if (authenticated.role === "ADMIN") redirect("/admin");
  redirect(next || "/profile");
}

export async function verifyEmailAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "");
  const next = safeUserRedirect(String(formData.get("next") ?? ""), "");
  const account = await verifyEmailAccount(email, token);

  if (!account) {
    const registered = isValidEmail(email) ? await findRegisteredAccount(email) : null;
    if (registered?.verified) {
      redirect("/login?error=already-verified");
    }

    redirect(`/email-invitation?email=${encodeURIComponent(email)}&expired=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  await setLoginCookie({
    role: account.role,
    name: account.name,
    email: account.email,
  });

  if (account.role === "ADMIN") redirect("/admin");
  redirect(next || "/profile");
}

export async function resendVerificationInvitationAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeUserRedirect(String(formData.get("next") ?? ""), "");
  if (!(await allowAuthAttempt("verify", email))) redirect("/login?error=rate-limit");

  if (!isValidEmail(email)) {
    redirect("/login?error=verify");
  }

  const account = await refreshEmailVerificationInvitation(email);

  if (!account) {
    redirect("/login?error=verify");
  }

  if (account.account.verified) {
    redirect("/login?error=already-verified");
  }

  const delivery = account.token ? await sendVerificationEmail(account.account.email, account.token, next) : null;
  const devUrl = delivery && !delivery.delivered && process.env.NODE_ENV !== "production" ? `&devUrl=${encodeURIComponent(delivery.url)}` : "";
  redirect(`/email-invitation?email=${encodeURIComponent(account.account.email)}&resent=1${next ? `&next=${encodeURIComponent(next)}` : ""}${devUrl}`);
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!(await allowAuthAttempt("reset", email))) redirect("/forgot-password?sent=1");

  if (!isValidEmail(email)) {
    redirect("/forgot-password?sent=1");
  }

  const account = await createPasswordResetInvitation(email);

  if (!account) {
    redirect("/forgot-password?sent=1");
  }

  const delivery = await sendPasswordResetEmail(account.account.email, account.token);
  if (delivery.delivered || process.env.NODE_ENV === "production") redirect("/forgot-password?sent=1");
  redirect(`/reset-invitation?email=${encodeURIComponent(account.account.email)}&devUrl=${encodeURIComponent(delivery.url)}`);
}

export async function resetPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!isValidEmail(email) || !token || !isStrongPassword(password)) {
    redirect("/login?error=reset");
  }

  const account = await resetEmailAccountPassword({ email, token, password });

  if (!account) {
    redirect("/login?error=reset");
  }

  await setLoginCookie({
    role: account.role,
    name: account.name,
    email: account.email,
  });

  redirect(account.role === "ADMIN" ? "/admin" : "/profile");
}

async function setLoginCookie(session: { role: "USER" | "ADMIN"; name: string; email: string }) {
  const cookieStore = await cookies();
  const cookieName = session.role === "ADMIN" ? sessionCookieNames.admin : sessionCookieNames.user;

  cookieStore.delete(sessionCookieNames.legacy);
  cookieStore.set(cookieName, createAppSessionCookieValue(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieNames.user);
  cookieStore.delete(sessionCookieNames.admin);
  cookieStore.delete(sessionCookieNames.legacy);
  await signOut({ redirectTo: "/login" });
}

export async function googleLoginAction(formData: FormData) {
  const next = safeUserRedirect(String(formData.get("next") ?? ""), "");
  await signIn("google", {
    redirectTo: next || "/profile",
  });
}
