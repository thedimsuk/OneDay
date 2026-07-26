"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, QrCode, RefreshCw } from "lucide-react";
import type { OrderRecord } from "@/lib/orders";
import { money } from "@/lib/utils";

type OrdersResponse = {
  orders?: { id: string; paymentStatus?: string }[];
};

export function QrisPaymentPanel({ order }: { order: OrderRecord }) {
  const router = useRouter();
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus ?? "Menunggu Pembayaran QRIS");
  const [message, setMessage] = useState("Scan QRIS dan bayar sesuai total. Status akan dicek otomatis.");
  const [redirecting, setRedirecting] = useState(false);
  const paymentMode = process.env.NEXT_PUBLIC_PAYMENT_MODE === "sandbox" ? "sandbox" : "production";
  const qrisImage = process.env.NEXT_PUBLIC_QRIS_IMAGE_URL;
  const paid = paymentStatus === "Sudah Dibayar";
  const sandbox = paymentMode === "sandbox";

  async function refreshPaymentStatus() {
    const response = await fetch(`/api/orders?ts=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });

    if (!response.ok) {
      setMessage("Belum bisa cek status pembayaran. Coba lagi sebentar.");
      return;
    }

    const data = (await response.json()) as OrdersResponse;
    const freshOrder = data.orders?.find((item) => item.id === order.id);
    const nextStatus = freshOrder?.paymentStatus ?? paymentStatus;

    setPaymentStatus(nextStatus);

    if (nextStatus === "Sudah Dibayar") {
      setMessage("Pembayaran berhasil. Kamu akan diarahkan ke menu pesanan.");
      setRedirecting(true);
      window.setTimeout(() => router.replace("/profile?tab=orders"), 1400);
      return;
    }

    setMessage("Pembayaran belum terkonfirmasi. Jika sudah bayar, tunggu callback provider masuk.");
  }

  useEffect(() => {
    if (paid) {
      setRedirecting(true);
      const timeout = window.setTimeout(() => router.replace("/profile?tab=orders"), 1200);
      return () => window.clearTimeout(timeout);
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshPaymentStatus();
      }
    }, 3000);

    return () => window.clearInterval(interval);
    // Keep polling bound to this order page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, paid, router]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
      <section className="rounded-lg border-2 border-ink bg-paper p-5 shadow-hard md:p-6">
        <div className="mb-5 flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-acid">
            {paid ? <CheckCircle2 className="h-7 w-7" /> : <QrCode className="h-7 w-7" />}
          </span>
          <div>
            <p className="text-sm font-black uppercase text-flame">
              {paid ? "Pembayaran sukses" : sandbox ? "Pembayaran QRIS Sandbox" : "Pembayaran QRIS"}
            </p>
            <h1 className="font-display text-4xl leading-none md:text-6xl">Pembayaran QRIS GoPay</h1>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-[300px_1fr]">
          <div className={`rounded-lg border-2 border-ink p-3 ${paid ? "bg-acid" : "bg-bone"}`}>
            <div className="grid aspect-square place-items-center overflow-hidden rounded-md border-2 border-ink bg-paper">
              {paid ? (
                <div className="grid h-full w-full place-items-center p-5 text-center">
                  <div>
                    <CheckCircle2 className="mx-auto h-20 w-20 text-cobalt" />
                    <p className="mt-4 font-black">SUDAH DIBAYAR</p>
                    <p className="mt-1 text-xs font-bold text-ink/55">Mengalihkan ke pesanan...</p>
                  </div>
                </div>
              ) : qrisImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrisImage} alt="QRIS GoPay ONEDAY" className="h-full w-full object-contain" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-bone p-5 text-center">
                  <div>
                    <QrCode className="mx-auto h-16 w-16 text-cobalt" />
                    <p className="mt-3 text-sm font-black">QRIS BELUM DIPASANG</p>
                    <p className="mt-1 text-xs font-bold text-ink/55">Isi NEXT_PUBLIC_QRIS_IMAGE_URL nanti.</p>
                  </div>
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-xs font-black text-ink/55">
              {sandbox ? "QRIS Sandbox Midtrans ONEDAY" : "QRIS GoPay ONEDAY"}
            </p>
          </div>

          <div>
            {sandbox ? (
              <div className="mb-4 rounded-md border-2 border-ink bg-acid p-3 text-sm font-black text-ink" role="alert">
                Mode sandbox lokal aktif. QR ini hanya untuk test pembayaran, bukan transaksi production.
              </div>
            ) : null}
            <p className="text-sm font-black uppercase text-flame">Order {order.id}</p>
            <h2 className="mt-1 font-display text-5xl leading-none">{money(order.total)}</h2>
            <p className="mt-4 text-sm font-bold leading-6 text-ink/65">
              Scan QRIS dan bayar sesuai total. Setelah uang benar-benar masuk dan payment provider mengirim callback,
              status otomatis berubah menjadi Sudah Dibayar.
            </p>
            <div
              role="alert"
              className={`mt-5 rounded-md border-2 border-ink p-4 text-sm font-black ${
                paid ? "bg-acid text-ink" : "bg-flame/10 text-flame"
              }`}
            >
              {paid
                ? "Pembayaran sudah selesai. Pesanan akan dilanjutkan ke proses admin."
                : "Pembayaran belum selesai. Selesaikan pembayaran QRIS agar pesanan bisa dilanjutkan."}
            </div>
            <div className={`mt-5 rounded-md border-2 border-ink p-4 text-sm font-black ${paid ? "bg-acid" : "bg-acid/30"}`}>
              {message}
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                onClick={refreshPaymentStatus}
                disabled={paid || redirecting}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border-2 border-ink bg-ink px-4 font-black text-paper shadow-hard disabled:opacity-55"
              >
                <RefreshCw className="h-4 w-4 text-acid" />
                Cek Status Bayar
              </button>
              <Link
                href="/profile?tab=orders"
                className="inline-flex h-12 items-center justify-center rounded-md border-2 border-ink bg-paper px-4 font-black"
              >
                Lihat Pesanan
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
