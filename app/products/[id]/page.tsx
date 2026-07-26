import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { SiteHeader } from "@/components/site-header";
import { getProductById } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Produk",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <ProductDetail product={product} />
    </>
  );
}
