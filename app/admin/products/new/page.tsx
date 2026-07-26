import type { Metadata } from "next";
import { NewProductForm } from "@/components/new-product-form";
import { SiteHeader } from "@/components/site-header";
import { requireAdminPage } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Tambah Produk",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewProductPage() {
  await requireAdminPage("/admin/products/new");

  return (
    <>
      <SiteHeader mode="admin" />
      <NewProductForm />
    </>
  );
}
