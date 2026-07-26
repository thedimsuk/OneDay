function resolveSiteUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicitUrl) return explicitUrl;

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://127.0.0.1:3001";
}

export const siteConfig = {
  name: "ONEDAY",
  title: "ONEDAY - Premium Streetwear Indonesia",
  description:
    "ONEDAY adalah brand streetwear Indonesia untuk daily outfit: kaos oversized, hoodie, cargo pants, outerwear, dan aksesori dengan tampilan clean dan bold.",
  keywords: [
    "ONEDAY",
    "ONEDAY streetwear",
    "streetwear Indonesia",
    "baju streetwear",
    "kaos oversized",
    "hoodie premium",
    "cargo pants",
    "brand fashion lokal",
    "kaos",
    "kaos murah",
    "kaos polos",
    "kaos distro",
    "kaos keren",
    "kaos pria",
    "kaos wanita",
  ],
  url: resolveSiteUrl(),
  locale: "id_ID",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6280000000000",
};

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

export function mediaUrl(pathOrUrl: string) {
  try {
    return new URL(pathOrUrl).toString();
  } catch {
    return absoluteUrl(pathOrUrl);
  }
}
