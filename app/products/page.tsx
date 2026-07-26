import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { safeJsonLd } from "@/lib/json-ld";
import { readAllProducts } from "@/lib/product-store";
import { absoluteUrl, mediaUrl, siteConfig } from "@/lib/site-config";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Koleksi Streetwear",
  description: "Belanja koleksi ONEDAY: t-shirt oversized, hoodie, cargo pants, outerwear, dan aksesori streetwear premium.",
  alternates: {
    canonical: "/products",
  },
  openGraph: {
    title: "Koleksi Streetwear ONEDAY",
    description: "Temukan produk streetwear premium ONEDAY untuk daily outfit.",
    url: absoluteUrl("/products"),
    siteName: siteConfig.name,
    type: "website",
    images: [
      {
        url: absoluteUrl("/api/og"),
        width: 1200,
        height: 630,
        alt: "Koleksi streetwear ONEDAY",
      },
    ],
  },
};

export default async function ProductsPage() {
  const products = await readAllProducts();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Koleksi Streetwear ONEDAY",
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/products/${product.id}`),
      item: {
        "@type": "Product",
        name: product.name,
        image: mediaUrl(product.thumbnail),
        sku: product.sku,
        brand: {
          "@type": "Brand",
          name: siteConfig.name,
        },
        offers: {
          "@type": "Offer",
          priceCurrency: "IDR",
          price: product.discountPrice ?? product.price,
          availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: absoluteUrl(`/products/${product.id}`),
        },
      },
    })),
  };

  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <p className="font-black uppercase text-flame">Collection</p>
        <h1 className="font-display text-4xl leading-none sm:text-5xl">Semua Produk</h1>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>
    </>
  );
}
