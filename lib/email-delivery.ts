import { siteConfig, absoluteUrl } from "@/lib/site-config";

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") throw new Error("Email provider is not configured");
    return false;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`Email delivery failed (${response.status})`);
  return true;
}

export async function sendVerificationEmail(email: string, token: string, next = "") {
  const url = absoluteUrl(`/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  return { delivered: await sendEmail(email, `Verifikasi akun ${siteConfig.name}`, `<p>Verifikasi akun Anda:</p><p><a href="${url}">Verifikasi email</a></p><p>Tautan berlaku 30 menit.</p>`), url };
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = absoluteUrl(`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
  return { delivered: await sendEmail(email, `Reset password ${siteConfig.name}`, `<p>Atur ulang password Anda:</p><p><a href="${url}">Reset password</a></p><p>Tautan berlaku 30 menit.</p>`), url };
}
