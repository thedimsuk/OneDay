import Link from "next/link";
import type { Metadata } from "next";
import { Clock, PackageCheck, ReceiptText } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { requireUserPage } from "@/lib/auth-guard";
import { readOrders } from "@/lib/orders";
import { money } from "@/lib/utils";

const historyRetentionMs = 7 * 24 * 60 * 60 * 1000;

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "History Pesanan",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function HistoryPage() {
  const session = await requireUserPage("/history");
  const orders = await readOrders();
  const historyOrders = orders
    .filter((order) => session.role === "ADMIN" || order.buyer.email.toLowerCase() === session.email.toLowerCase())
    .filter((order) => order.status === "Selesai" && order.completedAt)
    .sort((a, b) => new Date(b.completedAt ?? b.createdAt).getTime() - new Date(a.completedAt ?? a.createdAt).getTime());

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-black uppercase text-flame">History pesanan</p>
            <h1 className="font-display text-5xl leading-none md:text-7xl">Bukti transaksi.</h1>
            <p className="mt-3 max-w-2xl text-ink/62">
              Pesanan selesai disimpan sementara selama 7 hari. Setelah waktu habis, histori akan terhapus seluruhnya dari sistem ini.
            </p>
          </div>
          {historyOrders.length > 0 ? (
            <span className="inline-flex h-11 items-center justify-center rounded-full border-2 border-ink bg-flame px-4 font-black text-white shadow-hard">
              {historyOrders.length} histori aktif
            </span>
          ) : null}
        </div>

        <section className="mt-8">
          {historyOrders.length ? (
            <div className="grid gap-5">
              {historyOrders.map((order) => (
                <article key={order.id} className="rounded-lg border-2 border-ink bg-paper p-5 shadow-soft">
                  <div className="flex flex-col justify-between gap-4 border-b-2 border-ink pb-4 md:flex-row md:items-start">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-acid px-3 py-1 text-xs font-black uppercase">
                        <ReceiptText className="h-4 w-4" />
                        Bukti transaksi
                      </div>
                      <h2 className="mt-3 font-display text-3xl">{order.id}</h2>
                      <p className="text-sm text-ink/58">
                        Selesai: {order.completedAt ? new Date(order.completedAt).toLocaleString("id-ID") : "-"}
                      </p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="font-display text-3xl">{money(order.total)}</p>
                      <HistoryBadge completedAt={order.completedAt} />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <Info title="Produk">
                      <p className="font-black">{order.product.name}</p>
                      <p>SKU: {order.product.sku}</p>
                      <p>Size: {order.product.size}</p>
                      <p>Jumlah: {order.product.quantity}</p>
                    </Info>
                    <Info title="Pembayaran">
                      <p>Status: {order.paymentStatus ?? "Sudah Dibayar"}</p>
                      <p>Voucher: {order.voucherCode || "-"}</p>
                      <p>Total: {money(order.total)}</p>
                    </Info>
                    <Info title="Pengiriman">
                      <p>Kurir: {order.courier || "-"}</p>
                      <p>Resi: {order.trackingNumber || "-"}</p>
                      <p>Catatan: {order.adminNote || "-"}</p>
                    </Info>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-ink bg-paper p-7 shadow-soft">
              <PackageCheck className="h-9 w-9 text-cobalt" />
              <h2 className="mt-4 font-display text-4xl">Belum ada history</h2>
              <p className="mt-2 text-ink/62">Pesanan yang sudah sampai dan selesai akan muncul di sini selama 7 hari.</p>
              <Link href="/profile?tab=orders" className="mt-5 inline-flex h-11 items-center rounded-md border-2 border-ink bg-acid px-4 font-black shadow-hard">
                Lihat Pesanan
              </Link>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function HistoryBadge({ completedAt }: { completedAt?: string }) {
  const remaining = getRemainingHistoryTime(completedAt);

  return (
    <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-flame px-3 py-1 text-xs font-black text-white">
      <Clock className="h-4 w-4" />
      {remaining}
    </span>
  );
}

function getRemainingHistoryTime(completedAt?: string) {
  if (!completedAt) {
    return "Menunggu waktu selesai";
  }

  const remainingMs = Math.max(0, new Date(completedAt).getTime() + historyRetentionMs - Date.now());
  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hours = Math.ceil((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) {
    return `Tersisa ${days} hari ${hours} jam`;
  }

  return `Tersisa ${hours} jam`;
}

function Info({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border-2 border-ink bg-bone p-4 text-sm leading-6">
      <p className="mb-2 font-black uppercase text-flame">{title}</p>
      {children}
    </div>
  );
}
