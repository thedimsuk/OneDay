import type { Metadata } from "next";
import { NavigationMemory } from "@/components/navigation-memory";
import { absoluteUrl, siteConfig } from "@/lib/site-config";
import { safeJsonLd } from "@/lib/json-ld";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: "ONEDAY" }],
  creator: "ONEDAY",
  publisher: "ONEDAY",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: absoluteUrl("/api/og"),
        width: 1200,
        height: 630,
        alt: "ONEDAY premium streetwear",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [absoluteUrl("/api/og")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["Organization", "OnlineStore"],
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl("/favicon.ico"),
    description: siteConfig.description,
    areaServed: "ID",
    brand: {
      "@type": "Brand",
      name: siteConfig.name,
    },
    sameAs: [],
  };

  return (
    <html lang="id">
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
        <NavigationMemory />
        {children}
      </body>
    </html>
  );
}
