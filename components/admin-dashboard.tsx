"use client";

import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Banknote,
  Boxes,
  ClipboardList,
  CreditCard,
  Download,
  Edit3,
  PackageCheck,
  Plus,
  TicketPercent,
  Clock,
  Trash2,
  Save,
  Volume2,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import type { AppSession } from "@/lib/session";
import { type Product } from "@/lib/products";
import { money } from "@/lib/utils";

type AdminProduct = Product & {
  editablePrice: number;
  editableDiscountPrice: number;
  editableStock: number;
};

type StoredOrderProduct = {
  id: string;
  name: string;
  sku: string;
  size: string;
  quantity: number;
  unitPrice: number;
  thumbnail: string;
};

type StoredOrder = {
  id: string;
  createdAt: string;
  status: string;
  updatedAt?: string;
  notificationAt?: string;
  product: StoredOrderProduct;
  items?: StoredOrderProduct[];
  buyer: {
    name: string;
    phone: string;
    email: string;
    note: string;
  };
  address: {
    recipient: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    village: string;
    rt: string;
    rw: string;
    postalCode: string;
    note: string;
  };
  voucherCode: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentStatus?: string;
  paymentVerifiedAt?: string;
  paidAt?: string;
  completedAt?: string;
  courier?: string;
  trackingNumber?: string;
  adminNote?: string;
  subtotal: number;
  voucherDiscount: number;
  shipping: number;
  total: number;
};

type FinanceEntry = {
  id: string;
  orderId: string;
  type: "Pemasukan" | "Pengeluaran";
  categoryCode: string;
  category: string;
  description: string;
  amount: number;
  recordedAt: string;
};

type FinanceCategorySummary = {
  code: string;
  name: string;
  type: "Pemasukan" | "Pengeluaran";
  total: number;
  count: number;
};

type FinanceSummary = {
  income: number;
  expense: number;
  profit: number;
  categories: FinanceCategorySummary[];
};

type BrowserWindowWithAudioFallback = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

const orderStatuses = ["Pesanan Masuk", "Diproses", "Dikemas", "Dikirim", "Selesai"];
const archiveAfterMs = 24 * 60 * 60 * 1000;
const historyRetentionMs = 7 * 24 * 60 * 60 * 1000;

function isCanceledOrder(order: StoredOrder) {
  return order.status === "Dibatalkan" || order.paymentStatus === "Dibatalkan" || order.paymentStatus === "Kedaluwarsa";
}

function isArchivedOrder(order: StoredOrder) {
  if (order.status !== "Selesai" || !order.completedAt) {
    return false;
  }

  return Date.now() - new Date(order.completedAt).getTime() >= archiveAfterMs;
}

function getHistoryRemaining(completedAt?: string) {
  if (!completedAt) {
    return "Menunggu waktu selesai";
  }

  const remainingMs = Math.max(0, new Date(completedAt).getTime() + historyRetentionMs - Date.now());
  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hours = Math.ceil((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) {
    return `${days} hari ${hours} jam`;
  }

  return `${hours} jam`;
}

function getOrderNotificationKey(order: StoredOrder) {
  const shouldNotify = order.paymentStatus === "Sudah Dibayar" || order.paymentStatus === "Perlu Dicek";

  if (!shouldNotify || isArchivedOrder(order)) {
    return null;
  }

  return `${order.id}:${order.paymentStatus}:${order.notificationAt ?? order.paymentVerifiedAt ?? order.updatedAt ?? order.createdAt}`;
}

export function AdminDashboard({ account }: { account: AppSession }) {
  const [active, setActive] = useState<"orders" | "history" | "products" | "finance" | "vouchers">("orders");
  const [productEditMode, setProductEditMode] = useState(false);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary>({ income: 0, expense: 0, profit: 0, categories: [] });
  const [soundReady, setSoundReady] = useState(false);
  const [soundStatus, setSoundStatus] = useState<"idle" | "ready" | "fallback" | "blocked">("idle");
  const knownOrderSignalsRef = useRef<Set<string>>(new Set());
  const ordersLoadedRef = useRef(false);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const savedProducts = window.localStorage.getItem("oneday_admin_products");
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts) as AdminProduct[]);
    }

    void refreshOrders();
    void refreshProducts();
    void refreshFinance();
    const ordersInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshOrders();
      }
    }, 4000);
    const productsInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshProducts();
      }
    }, 15000);
    const financeInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshFinance();
      }
    }, 15000);

    return () => {
      window.clearInterval(ordersInterval);
      window.clearInterval(productsInterval);
      window.clearInterval(financeInterval);
    };
    // Polling helpers are function declarations in this component; keep the interval setup mounted once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      void enableOrderSound(false);
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
    // Audio unlock should be registered once; enableOrderSound uses current refs/state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.localStorage.setItem("oneday_admin_products", JSON.stringify(products));
  }, [products]);

  const activeOrders = useMemo(() => orders.filter((order) => !isCanceledOrder(order) && !isArchivedOrder(order)), [orders]);
  const historyOrders = useMemo(
    () => orders.filter((order) => !isCanceledOrder(order) && (order.status === "Selesai" || isArchivedOrder(order))),
    [orders],
  );

  const stats = useMemo(
    () => [
      { label: "Penjualan Aktif", value: money(activeOrders.reduce((sum, order) => sum + order.total, 0)), icon: ClipboardList },
      { label: "Pesanan Aktif", value: String(activeOrders.length), icon: Boxes },
      { label: "Dalam Proses", value: String(activeOrders.filter((order) => order.status !== "Selesai").length), icon: Bell },
      { label: "Kas Tercatat", value: money(financeSummary.profit), icon: Banknote },
    ],
    [activeOrders, financeSummary.profit],
  );

  function updateProduct(id: string, field: "editablePrice" | "editableDiscountPrice" | "editableStock", value: number) {
    setProducts((items) => items.map((item) => (item.id === id ? { ...item, [field]: Math.max(0, value) } : item)));
  }

  async function saveProduct(product: AdminProduct) {
    await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: product.editablePrice,
        discountPrice: product.editableDiscountPrice > 0 ? product.editableDiscountPrice : undefined,
        stock: product.editableStock,
      }),
    });
    await refreshProducts();
  }

  async function deleteProduct(product: AdminProduct) {
    if (product.editableStock > 0) {
      return;
    }

    await fetch(`/api/products/${product.id}`, {
      method: "DELETE",
    });
    await refreshProducts();
  }

  async function refreshOrders() {
    const response = await fetch(`/api/orders?ts=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { orders: StoredOrder[] };
    const incomingSignals = data.orders
      .map((order) => getOrderNotificationKey(order))
      .filter((key): key is string => Boolean(key));
    const hasNewIncomingOrder = incomingSignals.some((key) => !knownOrderSignalsRef.current.has(key));

    if (ordersLoadedRef.current && hasNewIncomingOrder) {
      playOrderNotification();
    }

    knownOrderSignalsRef.current = new Set(incomingSignals);
    ordersLoadedRef.current = true;
    setOrders(data.orders);
  }

  async function enableOrderSound(showFeedback = true) {
    try {
      notificationAudioRef.current ??= new Audio("/admin-notifications/order.mp3");
      notificationAudioRef.current.preload = "auto";
      notificationAudioRef.current.volume = 1;
      notificationAudioRef.current.currentTime = 0;
      await notificationAudioRef.current.play();
      notificationAudioRef.current.pause();
      notificationAudioRef.current.currentTime = 0;
      setSoundReady(true);
      setSoundStatus("ready");
    } catch {
      const fallbackReady = await playFallbackTone(0.04);
      if (fallbackReady) {
        setSoundReady(true);
        setSoundStatus("fallback");
        return;
      }
      setSoundReady(false);
      if (showFeedback) {
        setSoundStatus("blocked");
      }
    }
  }

  function playOrderNotification() {
    try {
      notificationAudioRef.current ??= new Audio("/admin-notifications/order.mp3");
      notificationAudioRef.current.volume = 1;
      notificationAudioRef.current.currentTime = 0;
      void notificationAudioRef.current.play().then(() => {
        setSoundReady(true);
        setSoundStatus("ready");
      }).catch(async () => {
        if (await playFallbackTone()) {
          setSoundReady(true);
          setSoundStatus("fallback");
          return;
        }
        setSoundReady(false);
        setSoundStatus("blocked");
      });
    } catch {
      void playFallbackTone().then((played) => {
        setSoundReady(played);
        setSoundStatus(played ? "fallback" : "blocked");
      });
    }
  }

  async function playFallbackTone(durationSeconds = 0.18) {
    try {
      const browserWindow = window as BrowserWindowWithAudioFallback;
      const AudioContextConstructor = browserWindow.AudioContext || browserWindow.webkitAudioContext;
      if (!AudioContextConstructor) {
        return false;
      }
      const context = audioContextRef.current ?? new AudioContextConstructor();
      audioContextRef.current = context;
      if (context.state === "suspended") {
        await context.resume();
      }
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + durationSeconds);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + durationSeconds);
      return true;
    } catch {
      return false;
    }
  }

  async function refreshProducts() {
    const response = await fetch("/api/products", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { products: Product[] };
    setProducts((current) => {
      const localById = new Map(current.map((item) => [item.id, item]));
      return data.products.map((product) => {
        const local = localById.get(product.id);
        return {
          ...product,
          editablePrice: local?.editablePrice ?? product.price,
          editableDiscountPrice: local?.editableDiscountPrice ?? product.discountPrice ?? 0,
          editableStock: local?.editableStock ?? product.stock,
        };
      });
    });
  }

  async function refreshFinance() {
    const response = await fetch("/api/finance", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { entries: FinanceEntry[]; summary: FinanceSummary };
    setFinanceEntries(data.entries);
    setFinanceSummary(data.summary);
  }

  async function updateOrder(orderId: string, update: Partial<StoredOrder>) {
    setOrders((items) => items.map((item) => (item.id === orderId ? { ...item, ...update } : item)));
    const response = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    if (response.ok) {
      const data = (await response.json()) as { orders?: StoredOrder[] };
      if (data.orders) {
        setOrders(data.orders);
        await refreshFinance();
        return;
      }
    }
    await refreshOrders();
    await refreshFinance();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="font-black uppercase text-flame">ONEDAY Admin</p>
          <h1 className="font-display text-5xl leading-none md:text-7xl">Dashboard Admin</h1>
          <p className="mt-3 max-w-2xl text-ink/62">
            Login sebagai {account.name} ({account.email}). Kelola stok, harga, pesanan masuk, notifikasi pembeli, dan data pengiriman.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void enableOrderSound()}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border-2 border-ink px-4 font-black shadow-hard ${
              soundReady ? "bg-acid" : "bg-paper"
            }`}
          >
            <Volume2 className="h-4 w-4" />
            {soundStatus === "fallback" ? "Beep Aktif" : soundReady ? "Suara Aktif" : "Aktifkan Suara"}
          </button>
          <form action={logoutAction}>
            <button className="h-11 rounded-md border-2 border-ink bg-paper px-4 font-black shadow-hard">Logout Admin</button>
          </form>
        </div>
      </div>

      {soundStatus === "blocked" ? (
        <div className="mt-5 rounded-lg border-2 border-flame bg-paper p-4 text-sm font-bold text-flame shadow-soft">
          Browser memblokir suara otomatis. Klik tombol Aktifkan Suara sekali, lalu biarkan dashboard admin tetap terbuka.
        </div>
      ) : null}
      {soundStatus === "fallback" ? (
        <div className="mt-5 rounded-lg border-2 border-ink bg-bone p-4 text-sm font-bold text-ink/70 shadow-soft">
          File suara notifikasi belum tersedia, jadi dashboard memakai beep bawaan browser. Tambahkan `public/admin-notifications/order.mp3` untuk suara custom.
        </div>
      ) : null}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border-2 border-ink bg-paper p-5 shadow-soft">
            <Icon className="h-6 w-6 text-cobalt" />
            <p className="mt-4 text-sm font-black uppercase text-ink/50">{label}</p>
            <p className="mt-1 font-display text-3xl">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-7 grid gap-3 md:grid-cols-5">
        <TabButton active={active === "orders"} onClick={() => setActive("orders")} icon={Bell} label="Pesanan Aktif" />
        <TabButton active={active === "history"} onClick={() => setActive("history")} icon={ClipboardList} label="Histori 7 Hari" />
        <TabButton active={active === "products"} onClick={() => setActive("products")} icon={PackageCheck} label="Stok & Harga" />
        <TabButton active={active === "finance"} onClick={() => setActive("finance")} icon={Banknote} label="Keuangan" />
        <TabButton active={active === "vouchers"} onClick={() => setActive("vouchers")} icon={TicketPercent} label="Voucher" />
      </section>

      <section className="mt-7">
        {active === "orders" ? (
          <OrdersPanel
            orders={activeOrders}
            setOrders={setOrders}
            updateOrder={updateOrder}
          />
        ) : null}
        {active === "history" ? <HistoryPanel orders={historyOrders} /> : null}
        {active === "finance" ? <FinancePanel entries={financeEntries} summary={financeSummary} /> : null}
        {active === "products" ? (
          <ProductsPanel
            editMode={productEditMode}
            products={products}
            saveProduct={saveProduct}
            deleteProduct={deleteProduct}
            toggleEditMode={() => setProductEditMode((value) => !value)}
            updateProduct={updateProduct}
          />
        ) : null}
        {active === "vouchers" ? <VouchersPanel /> : null}
      </section>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Bell;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-md border-2 border-ink px-4 font-black transition ${
        active ? "bg-acid shadow-hard" : "bg-paper hover:bg-bone"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function OrdersPanel({
  orders,
  setOrders,
  updateOrder,
}: {
  orders: StoredOrder[];
  setOrders: Dispatch<SetStateAction<StoredOrder[]>>;
  updateOrder: (orderId: string, update: Partial<StoredOrder>) => void;
}) {
  function updateOrderDraft(orderId: string, update: Partial<StoredOrder>) {
    setOrders((items) => items.map((item) => (item.id === orderId ? { ...item, ...update } : item)));
  }

  if (!orders.length) {
    return (
      <div className="rounded-lg border-2 border-dashed border-ink bg-paper p-7 shadow-soft">
        <Bell className="h-9 w-9 text-flame" />
        <h2 className="mt-4 font-display text-4xl">Belum ada pesanan masuk</h2>
        <p className="mt-2 text-ink/62">
          Saat pembeli menekan tombol Beli Sekarang di checkout, pesanan dan data pemesan akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {orders.map((order) => (
        <article key={order.id} className="rounded-lg border-2 border-ink bg-paper p-5 shadow-soft">
          <div className="flex flex-col justify-between gap-4 border-b-2 border-ink pb-4 lg:flex-row lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-acid px-3 py-1 text-xs font-black uppercase">
                <Bell className="h-4 w-4" />
                Notifikasi Pemesan
              </div>
              <h2 className="mt-3 font-display text-3xl">{order.id}</h2>
              <p className="text-sm text-ink/58">{new Date(order.createdAt).toLocaleString("id-ID")}</p>
            </div>
            <div className="text-left lg:text-right">
              <p className="font-display text-3xl">{money(order.total)}</p>
              <p className="text-sm font-black text-cobalt">{order.status}</p>
              <p className="text-sm font-black text-flame">{order.paymentStatus ?? "Belum Dibayar"}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <InfoBlock title="Produk">
              {(order.items?.length ? order.items : [order.product]).map((item) => (
                <div key={`${item.id}-${item.size}`} className="mb-3 last:mb-0">
                  <p className="font-black">{item.name}</p>
                  <p>SKU: {item.sku}</p>
                  <p>Size: {item.size}</p>
                  <p>Jumlah: {item.quantity}</p>
                </div>
              ))}
            </InfoBlock>
            <InfoBlock title="Data Pemesan">
              <p>Nama: {order.buyer.name || "-"}</p>
              <p>HP: {order.buyer.phone || "-"}</p>
              <p>Email: {order.buyer.email || "-"}</p>
              <p>Catatan: {order.buyer.note || "-"}</p>
            </InfoBlock>
            <InfoBlock title="Alamat Pengiriman">
              <p>Penerima: {order.address.recipient || "-"}</p>
              <p>HP: {order.address.phone || "-"}</p>
              <p>
                {[
                  order.address.village,
                  order.address.district,
                  order.address.city,
                  order.address.province,
                  order.address.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </p>
              <p>RT/RW: {order.address.rt || "-"}/{order.address.rw || "-"}</p>
              <p>Catatan: {order.address.note || "-"}</p>
            </InfoBlock>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <InfoBlock title="Pembayaran">
              <p>Status: {order.paymentStatus ?? "Belum Dibayar"}</p>
              <p>Metode: {order.paymentMethod === "QRIS_GOPAY" ? "QRIS GoPay" : order.paymentMethod || "-"}</p>
              <p>Ref: {order.paymentReference || "-"}</p>
              <p>Auto confirm: {order.paymentVerifiedAt ? new Date(order.paymentVerifiedAt).toLocaleString("id-ID") : "-"}</p>
              <p>Dibayar: {order.paidAt ? new Date(order.paidAt).toLocaleString("id-ID") : "-"}</p>
              <p>Voucher: {order.voucherCode || "-"}</p>
            </InfoBlock>
            <InfoBlock title="Tracking Paket">
              <label className="block">
                <span className="text-xs font-black uppercase text-ink/45">Kurir</span>
                <input
                  value={order.courier ?? ""}
                  onChange={(event) => updateOrderDraft(order.id, { courier: event.target.value })}
                  onBlur={(event) => updateOrder(order.id, { courier: event.target.value })}
                  className="mt-1 h-10 w-full rounded-md border-2 border-ink bg-paper px-2 font-bold outline-none"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-black uppercase text-ink/45">Nomor resi</span>
                <input
                  value={order.trackingNumber ?? ""}
                  onChange={(event) => updateOrderDraft(order.id, { trackingNumber: event.target.value })}
                  onBlur={(event) => updateOrder(order.id, { trackingNumber: event.target.value })}
                  className="mt-1 h-10 w-full rounded-md border-2 border-ink bg-paper px-2 font-bold outline-none"
                />
              </label>
            </InfoBlock>
            <InfoBlock title="Info Untuk User">
              <textarea
                value={order.adminNote ?? ""}
                onChange={(event) => updateOrderDraft(order.id, { adminNote: event.target.value })}
                onBlur={(event) => updateOrder(order.id, { adminNote: event.target.value })}
                className="min-h-24 w-full rounded-md border-2 border-ink bg-paper p-2 font-bold outline-none"
              />
            </InfoBlock>
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-5">
            {orderStatuses.map((status) => (
              <button
                key={status}
                onClick={() => updateOrder(order.id, { status })}
                className={`h-10 rounded-md border-2 border-ink text-sm font-black ${
                  order.status === status ? "bg-acid" : "bg-bone"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {["Menunggu Pembayaran QRIS", "Perlu Dicek", "Sudah Dibayar", "Refund"].map((paymentStatus) => (
              <button
                key={paymentStatus}
                onClick={() =>
                  updateOrder(order.id, {
                    paymentStatus,
                    paidAt: paymentStatus === "Sudah Dibayar" ? new Date().toISOString() : order.paidAt,
                    adminNote:
                      paymentStatus === "Sudah Dibayar"
                        ? "Pembayaran QRIS sudah divalidasi admin. Pesanan akan diproses."
                        : order.adminNote,
                  })
                }
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border-2 border-ink text-sm font-black ${
                  order.paymentStatus === paymentStatus ? "bg-acid" : "bg-paper"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                {paymentStatus}
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function HistoryPanel({ orders }: { orders: StoredOrder[] }) {
  if (!orders.length) {
    return (
      <div className="rounded-lg border-2 border-dashed border-ink bg-paper p-7 shadow-soft">
        <ClipboardList className="h-9 w-9 text-cobalt" />
        <h2 className="mt-4 font-display text-4xl">Histori masih kosong</h2>
        <p className="mt-2 text-ink/62">Pesanan yang selesai akan masuk ke sini sebagai bukti transaksi.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-ink bg-paper p-5 shadow-soft">
      <h2 className="font-display text-4xl">Histori Transaksi</h2>
      <p className="mt-1 text-sm text-ink/58">
        Pesanan selesai menjadi bukti transaksi sementara. Setelah 24 jam keluar dari dashboard aktif, lalu terhapus total setelah 7 hari.
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b-2 border-ink">
              <th className="py-3">Order</th>
              <th>Pembeli</th>
              <th>Produk</th>
              <th>Total</th>
              <th>Selesai</th>
              <th>Sisa Simpan</th>
              <th>Dashboard</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-ink/10">
                <td className="py-3 font-black">{order.id}</td>
                <td>{order.buyer.name || "-"}</td>
                <td>{order.product.name}</td>
                <td>{money(order.total)}</td>
                <td>{order.completedAt ? new Date(order.completedAt).toLocaleString("id-ID") : "-"}</td>
                <td>
                  <span className="inline-flex items-center gap-1 rounded-full bg-flame px-2 py-1 text-xs font-black text-white">
                    <Clock className="h-3 w-3" />
                    {getHistoryRemaining(order.completedAt)}
                  </span>
                </td>
                <td>{isArchivedOrder(order) ? "Bersih dari aktif" : "Masih dihitung 24 jam"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinancePanel({ entries, summary }: { entries: FinanceEntry[]; summary: FinanceSummary }) {
  return (
    <div className="rounded-lg border-2 border-ink bg-paper p-5 shadow-soft">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 className="font-display text-4xl">Pencatatan Keuangan</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink/58">
            Pembayaran valid otomatis masuk ke catatan keuangan. Kategori dibuat baku agar penjualan terkumpul dengan penjualan dan ongkir terkumpul dengan ongkir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/finance/export/excel"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border-2 border-ink bg-acid px-4 font-black shadow-hard"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </a>
          <a
            href="/api/finance/export"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border-2 border-ink bg-paper px-4 font-black shadow-hard"
          >
            <Download className="h-4 w-4" />
            CSV Polos
          </a>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <FinanceSummaryCard label="Pemasukan" value={summary.income} tone="bg-acid" />
        <FinanceSummaryCard label="Pengeluaran" value={summary.expense} tone="bg-flame text-white" />
        <FinanceSummaryCard label="Saldo / Laba" value={summary.profit} tone="bg-cobalt text-white" />
      </div>

      <div className="mt-5 rounded-lg border-2 border-ink bg-bone p-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-cobalt" />
          <h3 className="font-display text-3xl">Ringkasan Kategori</h3>
        </div>
        {summary.categories.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {summary.categories.map((category) => (
              <div key={category.code} className="rounded-md border-2 border-ink bg-paper p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-ink/45">{category.code}</p>
                    <p className="mt-1 font-black">{category.name}</p>
                    <p className="text-sm text-ink/58">{category.count} transaksi</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${category.type === "Pemasukan" ? "bg-acid" : "bg-flame text-white"}`}>
                    {category.type}
                  </span>
                </div>
                <p className="mt-3 font-display text-3xl">{money(category.total)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/62">Belum ada kategori aktif.</p>
        )}
      </div>

      {entries.length ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="py-3">Tanggal Catat</th>
                <th>Tipe</th>
                <th>Kode</th>
                <th>Kategori</th>
                <th>Order</th>
                <th>Deskripsi</th>
                <th>Nominal</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-ink/10">
                  <td className="py-3">{new Date(entry.recordedAt).toLocaleString("id-ID")}</td>
                  <td>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${entry.type === "Pemasukan" ? "bg-acid" : "bg-flame text-white"}`}>
                      {entry.type}
                    </span>
                  </td>
                  <td className="font-black text-ink/60">{entry.categoryCode}</td>
                  <td>{entry.category}</td>
                  <td className="font-black">{entry.orderId}</td>
                  <td>{entry.description}</td>
                  <td className="font-black">{money(entry.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border-2 border-dashed border-ink bg-bone p-6">
          <Banknote className="h-9 w-9 text-cobalt" />
          <h3 className="mt-4 font-display text-3xl">Belum ada kas tercatat</h3>
          <p className="mt-1 text-sm text-ink/62">Selesaikan pesanan dulu. Setelah lewat 24 jam, pencatatan akan masuk otomatis.</p>
        </div>
      )}
    </div>
  );
}

function FinanceSummaryCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-lg border-2 border-ink p-4 shadow-soft ${tone}`}>
      <p className="text-xs font-black uppercase opacity-75">{label}</p>
      <p className="mt-1 font-display text-3xl">{money(value)}</p>
    </div>
  );
}

function ProductsPanel({
  editMode,
  products,
  updateProduct,
  saveProduct,
  deleteProduct,
  toggleEditMode,
}: {
  editMode: boolean;
  products: AdminProduct[];
  updateProduct: (id: string, field: "editablePrice" | "editableDiscountPrice" | "editableStock", value: number) => void;
  saveProduct: (product: AdminProduct) => void;
  deleteProduct: (product: AdminProduct) => void;
  toggleEditMode: () => void;
}) {
  return (
    <div className="rounded-lg border-2 border-ink bg-paper p-5 shadow-soft">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-4xl">Stok & Harga Produk</h2>
          <p className="mt-1 text-sm text-ink/58">Perubahan tersimpan lokal di browser untuk admin.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleEditMode}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border-2 border-ink px-4 font-black shadow-hard ${
              editMode ? "bg-ink text-paper" : "bg-paper"
            }`}
          >
            <Edit3 className="h-4 w-4" />
            Edit Produk
          </button>
          <Link href="/admin/products/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border-2 border-ink bg-acid px-4 font-black shadow-hard">
            <Plus className="h-4 w-4" />
            Tambah Produk
          </Link>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b-2 border-ink">
              <th className="py-3">Produk</th>
              <th>SKU</th>
              <th>Harga</th>
              <th>Harga Diskon</th>
              <th>Stok</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-ink/10">
                <td className="py-3 font-black">{product.name}</td>
                <td>{product.sku}</td>
                <td>
                  <AdminInput disabled={!editMode} value={product.editablePrice} onChange={(value) => updateProduct(product.id, "editablePrice", value)} />
                </td>
                <td>
                  <AdminInput
                    disabled={!editMode}
                    value={product.editableDiscountPrice}
                    onChange={(value) => updateProduct(product.id, "editableDiscountPrice", value)}
                  />
                </td>
                <td>
                  <AdminInput disabled={!editMode} value={product.editableStock} onChange={(value) => updateProduct(product.id, "editableStock", value)} />
                </td>
                <td>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${product.editableStock > 0 ? "bg-acid" : "bg-flame text-white"}`}>
                    {product.editableStock > 0 ? "Aktif" : "Habis"}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      disabled={!editMode}
                      onClick={() => saveProduct(product)}
                      className="grid h-10 w-10 place-items-center rounded-md border-2 border-ink bg-paper disabled:opacity-35"
                      aria-label={`Simpan ${product.name}`}
                    >
                      <Save className="h-4 w-4" />
                    </button>
                    <button
                      disabled={!editMode || product.editableStock > 0}
                      onClick={() => deleteProduct(product)}
                      className="grid h-10 w-10 place-items-center rounded-md border-2 border-ink bg-paper text-flame disabled:opacity-35"
                      aria-label={`Hapus ${product.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VouchersPanel() {
  return (
    <div className="rounded-lg border-2 border-ink bg-paper p-5 shadow-soft">
      <h2 className="font-display text-4xl">Voucher Admin</h2>
      <p className="mt-1 text-sm text-ink/58">Pilih nominal voucher admin, kuota, masa berlaku, dan cakupan produk.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[10, 15, 20, 25, 30, 40, 50].map((value) => (
          <button key={value} className="rounded-lg border-2 border-ink bg-bone p-5 text-left transition hover:bg-acid">
            <TicketPercent className="h-6 w-6 text-flame" />
            <p className="mt-3 font-display text-4xl">{value}%</p>
            <p className="text-sm text-ink/58">Buat voucher {value}%</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-ink bg-bone p-4 text-sm leading-6">
      <p className="mb-2 font-black uppercase text-flame">{title}</p>
      {children}
    </div>
  );
}

function AdminInput({ disabled, value, onChange }: { disabled: boolean; value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-10 w-28 rounded-md border-2 border-ink bg-paper px-2 font-bold outline-none focus:bg-acid/20 disabled:bg-bone disabled:text-ink/45"
      />
      <Edit3 className="h-4 w-4 text-ink/42" />
    </div>
  );
}
