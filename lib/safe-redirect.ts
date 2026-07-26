export function safeUserRedirect(value: unknown, fallback = "/profile") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (value === "/admin" || value.startsWith("/admin/")) return fallback;
  return value;
}

export function safeDevelopmentUrl(value: unknown, siteUrl: string) {
  if (process.env.NODE_ENV === "production" || typeof value !== "string") return "";
  try {
    const target = new URL(value);
    if (target.origin !== new URL(siteUrl).origin) return "";
    return `${target.pathname}${target.search}`;
  } catch {
    return "";
  }
}
