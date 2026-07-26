import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Pembayaran",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutPaymentPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Pembayaran</h1>
        <p className="mt-2 text-sm text-gray-600">Halaman pembayaran sedang dipersiapkan.</p>
      </main>
    </>
  );
}
