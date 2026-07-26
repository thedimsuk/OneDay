import type { Metadata } from "next";
import { CartDashboard } from "@/components/cart-dashboard";
import { SiteHeader } from "@/components/site-header";
import { readAllProducts } from "@/lib/product-store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Keranjang",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CartPage() {
  const products = await readAllProducts();

  return (
    <>
      <SiteHeader />
      <CartDashboard products={products} />
    </>
  );
}
