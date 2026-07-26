import type { Metadata } from "next";
import { Flame, Hand, MailCheck, ShieldCheck, Smile, TriangleAlert, Truck } from "lucide-react";
import { FooterWhatsAppBox } from "@/components/footer-whatsapp-box";
import { HeroDropPopup } from "@/components/hero-drop-popup";
import { HomeProductShowcase } from "@/components/home-product-showcase";
import { SiteHeader } from "@/components/site-header";
import { readAllProducts } from "@/lib/product-store";
import { safeJsonLd } from "@/lib/json-ld";
import { absoluteUrl, siteConfig } from "@/lib/site-config";

export const revalidate = 60;
export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    type: "website",
    images: [
      {
        url: absoluteUrl("/api/og"),
        width: 1200,
        height: 630,
        alt: "ONEDAY premium streetwear Indonesia",
      },
    ],
  },
};

export default async function Home() {
  const products = await readAllProducts();

  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: siteConfig.name,
            url: siteConfig.url,
            inLanguage: "id-ID",
            potentialAction: {
              "@type": "SearchAction",
              target: `${absoluteUrl("/products")}?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <main>
        <HeroDropPopup />
        <HomeProductShowcase products={products} />
      </main>
      <Footer />
    </>
  );
}

function FeatureStrip() {
  const items = [
    { icon: Truck, label: "Checkout cepat", text: "Cukup 5 langkah saja" },
    { icon: ShieldCheck, label: "Aman", text: "Aman dan terpercaya" },
    { icon: Flame, label: "Voucher", text: "Voucher diskon 20% gratis untuk pengguna baru" },
  ];

  return (
    <section className="border-b-2 border-ink bg-ink py-5 text-paper">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 md:grid-cols-3 md:px-6">
        {items.map(({ icon: Icon, label, text }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-acid text-ink">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-black">{label}</p>
              <p className="text-sm text-paper/60">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  const contactLinks = [
    {
      icon: Hand,
      label: "Keluhan konsumen",
      text: "Respon pesanan, pembayaran, dan pengiriman.",
      message: "Halo ONEDAY, saya ingin menyampaikan keluhan konsumen.",
    },
    {
      icon: TriangleAlert,
      label: "Report masalah",
      text: "Laporkan bug, produk bermasalah, atau kendala checkout.",
      message: "Halo ONEDAY, saya ingin melaporkan masalah di website.",
    },
    {
      icon: MailCheck,
      label: "Chat WhatsApp",
      text: "Hubungi admin ONEDAY langsung.",
      message: "Halo ONEDAY, saya butuh bantuan.",
    },
  ];

  return (
    <footer className="border-t-2 border-ink bg-paper">
      <FeatureStrip />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.05fr_1fr_1.05fr] md:px-6">
        <div>
          <p className="font-display text-4xl">ONEDAY</p>
          <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-ink/62">
            Kualitas premium untuk kenyamanan harian. Kami menjaga proses belanja tetap jelas, cepat, dan mudah dihubungi.
          </p>
          <div className="mt-5 rounded-md border-2 border-ink bg-bone p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-acid text-ink">
                <Smile className="h-5 w-5" />
              </span>
              <div>
                <p className="font-black">About ONEDAY</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-ink/60">
                  Brand streetwear lokal untuk outfit clean dan bold, dengan dukungan pelanggan yang bisa dihubungi langsung.
                </p>
              </div>
            </div>
          </div>
        </div>

        <nav aria-label="Bantuan footer" className="grid content-start gap-3">
          <p className="text-sm font-black uppercase text-ink/55">Bantuan</p>
          {contactLinks.map(({ icon: Icon, label, text, message }) => (
            <a
              key={label}
              href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-3 py-2 transition hover:text-flame"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-paper">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block font-black">{label}</span>
                <span className="mt-1 block text-sm font-semibold leading-5 text-ink/58">{text}</span>
              </span>
            </a>
          ))}
        </nav>

        <div className="rounded-md border-2 border-ink bg-bone p-4 shadow-soft">
          <FooterWhatsAppBox phoneNumber={siteConfig.whatsappNumber} />
        </div>
      </div>
      <div className="border-t-2 border-ink/10 px-4 py-5 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm font-bold text-ink/55 sm:flex-row sm:items-center sm:justify-between">
          <p>KEEP MOVING.</p>
          <p>ONEDAY Customer Care via WhatsApp</p>
        </div>
      </div>
    </footer>
  );
}
