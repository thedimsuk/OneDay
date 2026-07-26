"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Home,
  LogOut,
  MapPin,
  PackageCheck,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  TicketPercent,
  Trash2,
  Truck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import type { AppSession } from "@/lib/session";
import { money } from "@/lib/utils";

type ProfileSection = "account" | "addresses" | "vouchers" | "orders" | "settings";

type ProfileAddress = {
  id: string;
  label: string;
  isDefault: boolean;
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

type StoredOrder = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
  product: {
    lineId?: string;
    id: string;
    name: string;
    sku: string;
    size: string;
    quantity: number;
    unitPrice: number;
    thumbnail?: string;
    canceledQuantity?: number;
    refundedQuantity?: number;
    refundTotal?: number;
    refundStatus?: string;
  };
  items?: StoredOrderProduct[];
  buyer: {
    email: string;
  };
  voucherCode: string;
  paymentReference?: string;
  paymentStatus?: string;
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

type StoredOrderProduct = {
  lineId?: string;
  id: string;
  name: string;
  sku: string;
  size: string;
  quantity: number;
  unitPrice: number;
  thumbnail?: string;
  canceledQuantity?: number;
  refundedQuantity?: number;
  refundTotal?: number;
  refundStatus?: string;
};

const menuItems: { id: ProfileSection; label: string; icon: typeof UserRound }[] = [
  { id: "account", label: "Akun", icon: UserRound },
  { id: "addresses", label: "Alamat", icon: MapPin },
  { id: "vouchers", label: "Voucher", icon: TicketPercent },
  { id: "orders", label: "Pesanan", icon: PackageCheck },
  { id: "settings", label: "Pengaturan", icon: Settings },
];

const vouchers = [
  { code: "NEW20", label: "User Baru", value: "20%", status: "Dicek saat checkout", expires: "Khusus pesanan pertama" },
  { code: "LOYAL30", label: "Loyalty", value: "30%", status: "Dicek saat checkout", expires: "Butuh minimal 3 transaksi selesai" },
  { code: "ONEDAY25", label: "Admin Drop", value: "25%", status: "Dicek saat checkout", expires: "Promo aktif jika tersedia di checkout" },
];

const completedOrderProfileRetentionMs = 48 * 60 * 60 * 1000;

function isVisibleProfileOrder(order: StoredOrder) {
  if (order.status === "Dibatalkan" || order.paymentStatus === "Kedaluwarsa") {
    return false;
  }

  if (order.status !== "Selesai") {
    return true;
  }

  if (!order.completedAt) {
    return true;
  }

  return Date.now() - new Date(order.completedAt).getTime() < completedOrderProfileRetentionMs;
}

async function cropUpperBodyToWebp(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = objectUrl;
    });

    const outputSize = 512;
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas tidak tersedia.");
    }

    const upperBodyHeight = image.height * 0.9;
    const cropSize = Math.min(image.width, upperBodyHeight);
    const cropX = Math.max(0, (image.width - cropSize) / 2);
    const upperBodyExtra = Math.max(0, upperBodyHeight - cropSize);
    const cropY = Math.max(0, upperBodyExtra * 0.12);

    context.drawImage(image, cropX, cropY, cropSize, cropSize, 0, 0, outputSize, outputSize);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.82);
    });

    if (!blob) {
      throw new Error("WebP gagal dibuat.");
    }

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function ProfileDashboard({
  account,
  initialSection,
}: {
  account: AppSession;
  initialSection?: string;
}) {
  const safeInitialSection = menuItems.some((item) => item.id === initialSection)
    ? (initialSection as ProfileSection)
    : "account";
  const [active, setActive] = useState<ProfileSection>(safeInitialSection);
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [ordersSyncedAt, setOrdersSyncedAt] = useState("");
  const [addressComposerOpen, setAddressComposerOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [profilePhotoMessage, setProfilePhotoMessage] = useState("");
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const activeTitle = useMemo(() => menuItems.find((item) => item.id === active)?.label ?? "Akun", [active]);
  const isAdmin = account.role === "ADMIN";
  const profilePhotoStorageKey = useMemo(() => `oneday_profile_photo:${account.email.toLowerCase()}`, [account.email]);
  const userOrders = useMemo(
    () =>
      orders
        .filter(isVisibleProfileOrder)
        .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()),
    [orders],
  );
  const activeOrderCount = useMemo(
    () => userOrders.filter((order) => order.status !== "Selesai").length,
    [userOrders],
  );

  const refreshOrders = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders?ts=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { orders: StoredOrder[]; syncedAt?: string };
      setOrders(data.orders);
      setOrdersSyncedAt(data.syncedAt ?? new Date().toISOString());
    } catch {
      // Keep the last visible order state if the server is briefly refreshing.
    }
  }, []);

  useEffect(() => {
    void refreshOrders();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshOrders();
      }
    }, 4000);

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void refreshOrders();
      }
    }

    window.addEventListener("focus", refreshOrders);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOrders);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshOrders]);

  useEffect(() => {
    window.localStorage.setItem("oneday_profile_photo_current_email", account.email.toLowerCase());
    setProfilePhoto(window.localStorage.getItem(profilePhotoStorageKey) ?? "");
    window.dispatchEvent(new Event("oneday-profile-photo-updated"));
  }, [account.email, profilePhotoStorageKey]);

  async function chooseProfilePhoto(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setProfilePhotoMessage("Pilih file gambar yang valid.");
      return;
    }

    try {
      const webpPhoto = await cropUpperBodyToWebp(file);
      window.localStorage.setItem(profilePhotoStorageKey, webpPhoto);
      window.localStorage.setItem("oneday_profile_photo_current_email", account.email.toLowerCase());
      setProfilePhoto(webpPhoto);
      setProfilePhotoMessage("Foto profil tersimpan di browser ini.");
      window.dispatchEvent(new Event("oneday-profile-photo-updated"));
    } catch {
      setProfilePhotoMessage("Foto gagal diproses. Coba gambar lain.");
    } finally {
      if (profilePhotoInputRef.current) {
        profilePhotoInputRef.current.value = "";
      }
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <section className="relative overflow-hidden rounded-lg border-2 border-ink bg-ink p-5 text-paper shadow-hard md:p-7">
        <div className="absolute right-8 top-7 h-14 w-32 -rotate-6 rounded-[50%] border-2 border-acid/70" aria-hidden />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => profilePhotoInputRef.current?.click()}
              className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-paper bg-acid text-ink transition hover:border-acid"
              aria-label="Pilih foto profil"
            >
              {profilePhoto ? (
                // Data URL WebP diproses di browser, jadi img biasa lebih sederhana daripada next/image.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profilePhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-8 w-8" />
              )}
            </button>
            <input
              ref={profilePhotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void chooseProfilePhoto(event.target.files?.[0] ?? null)}
            />
            <div>
              <p className="text-sm font-black uppercase text-acid">{isAdmin ? "ONEDAY Admin" : "ONEDAY Member"}</p>
              <h1 className="font-display text-4xl leading-none md:text-6xl">{account.name}</h1>
              <p className="mt-2 text-sm text-paper/60">{account.email}</p>
              <p className="mt-2 text-xs font-bold text-paper/45">
                {profilePhotoMessage || "Klik foto untuk mengganti profil."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => profilePhotoInputRef.current?.click()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-paper/20 px-4 font-black transition hover:border-acid hover:text-acid"
          >
            <Save className="h-4 w-4" />
            Ganti Foto
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Transaksi" value={String(userOrders.length)} icon={PackageCheck} />
        <Stat label="Voucher Aktif" value="1" icon={TicketPercent} />
        <Stat label="Total Belanja" value={money(userOrders.reduce((sum, order) => sum + order.total, 0))} icon={WalletCards} />
        <Stat label="Status Akun" value={isAdmin ? "Admin" : "Basic"} icon={ShieldCheck} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-lg border-2 border-ink bg-paper p-3 shadow-soft">
          <div className="grid gap-2">
            {menuItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`flex h-12 items-center justify-between rounded-md px-3 text-left font-black transition ${
                  active === id ? "bg-acid text-ink" : "hover:bg-bone"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  {label}
                  {id === "orders" && activeOrderCount > 0 ? (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-flame px-1 text-[10px] font-black leading-none text-white">
                      {activeOrderCount}
                    </span>
                  ) : null}
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ))}
          </div>
        </aside>

        <section className="min-h-[520px] rounded-lg border-2 border-ink bg-paper p-5 shadow-soft md:p-6">
          <div className="flex flex-col justify-between gap-3 border-b-2 border-ink pb-5 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black uppercase text-flame">Profile Center</p>
              <h2 className="font-display text-4xl">{activeTitle}</h2>
            </div>
            <ContextAction active={active} />
          </div>
          <div className="pt-6">
            {active === "account" ? <AccountPanel account={account} /> : null}
            {active === "addresses" ? (
              <AddressPanel
                accountEmail={account.email}
                composerOpen={addressComposerOpen}
                setComposerOpen={setAddressComposerOpen}
              />
            ) : null}
            {active === "vouchers" ? <VoucherPanel /> : null}
            {active === "orders" ? <OrderPanel orders={userOrders} syncedAt={ordersSyncedAt} onRefresh={refreshOrders} /> : null}
            {active === "settings" ? <SettingsPanel /> : null}
          </div>
        </section>
      </section>
    </main>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof UserRound }) {
  return (
    <div className="rounded-lg border-2 border-ink bg-paper p-4 shadow-soft">
      <Icon className="h-6 w-6 text-cobalt" />
      <p className="mt-3 text-xs font-black uppercase text-ink/48">{label}</p>
      <p className="font-display text-3xl">{value}</p>
    </div>
  );
}

function ContextAction({ active }: { active: ProfileSection }) {
  if (active === "addresses" || active === "orders") {
    return null;
  }

  const labels: Record<ProfileSection, { text: string; icon: typeof Save }> = {
    account: { text: "Simpan Profil", icon: Save },
    addresses: { text: "Tambah Alamat", icon: Plus },
    vouchers: { text: "Pakai Voucher", icon: TicketPercent },
    orders: { text: "Lacak Pesanan", icon: PackageCheck },
    settings: { text: "Simpan Setting", icon: Save },
  };
  const { text, icon: Icon } = labels[active];

  return (
    <button
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border-2 border-ink bg-acid px-4 font-black shadow-hard transition hover:-translate-y-0.5"
    >
      <Icon className="h-4 w-4" />
      {text}
    </button>
  );
}

function AccountPanel({ account }: { account: AppSession }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Field label="Nama Lengkap" value={account.name} />
      <Field label="Email" value={account.email} />
      <Field label="Nomor HP" />
      <Field label="Tanggal Lahir" />
      <div className="rounded-lg border-2 border-ink bg-bone p-4 md:col-span-2">
        <p className="font-black">Fungsi akun</p>
        <p className="mt-1 text-sm text-ink/62">
          Bagian ini menampilkan akun yang sedang login. Role akun ini adalah {account.role}.
        </p>
      </div>
    </div>
  );
}

const emptyAddress: Omit<ProfileAddress, "id" | "isDefault"> = {
  label: "Rumah",
  recipient: "",
  phone: "",
  province: "",
  city: "",
  district: "",
  village: "",
  rt: "",
  rw: "",
  postalCode: "",
  note: "",
};

function AddressPanel({
  accountEmail,
  composerOpen,
  setComposerOpen,
}: {
  accountEmail: string;
  composerOpen: boolean;
  setComposerOpen: (open: boolean) => void;
}) {
  const [addresses, setAddresses] = useState<ProfileAddress[]>([]);
  const [draft, setDraft] = useState(emptyAddress);
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];

  useEffect(() => {
    void fetch("/api/addresses", { cache: "no-store" }).then(async (response) => {
      if (response.ok) setAddresses(((await response.json()) as { addresses: ProfileAddress[] }).addresses);
    });
  }, [accountEmail]);

  function updateDraft(field: keyof typeof emptyAddress, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveAddress() {
    const response = await fetch("/api/addresses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    if (!response.ok) return;
    setAddresses(((await response.json()) as { addresses: ProfileAddress[] }).addresses);
    setDraft(emptyAddress);
    setComposerOpen(false);
  }

  async function setDefaultAddress(addressId: string) {
    const response = await fetch("/api/addresses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: addressId, isDefault: true }) });
    if (response.ok) setAddresses(((await response.json()) as { addresses: ProfileAddress[] }).addresses);
  }

  async function deleteAddress(addressId: string) {
    const response = await fetch(`/api/addresses?id=${encodeURIComponent(addressId)}`, { method: "DELETE" });
    if (response.ok) setAddresses(((await response.json()) as { addresses: ProfileAddress[] }).addresses);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <div className="space-y-4">
        {defaultAddress ? (
          <div className="rounded-lg border-2 border-ink bg-acid p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-ink/55">Alamat Default</p>
                <h3 className="mt-1 font-display text-3xl">{defaultAddress.label}</h3>
              </div>
              <Home className="h-7 w-7" />
            </div>
            <AddressSummary address={defaultAddress} />
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-ink bg-bone p-6">
            <MapPin className="h-8 w-8 text-flame" />
            <p className="mt-4 font-display text-2xl">Belum ada alamat</p>
            <p className="mt-1 text-sm text-ink/62">
              Tambahkan alamat pengiriman pertama agar checkout berikutnya otomatis memakai alamat default.
            </p>
          </div>
        )}

        {addresses.length ? (
          <div className="grid gap-3">
            {addresses.map((address) => (
              <article key={address.id} className="rounded-lg border-2 border-ink bg-paper p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-2xl">{address.label}</h3>
                      {address.isDefault ? (
                        <span className="rounded-full bg-acid px-3 py-1 text-xs font-black">Default</span>
                      ) : null}
                    </div>
                    <AddressSummary address={address} compact />
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setDefaultAddress(address.id)}
                      disabled={address.isDefault}
                      className="h-10 rounded-md border-2 border-ink bg-paper px-3 text-sm font-black disabled:opacity-40"
                    >
                      Set Default
                    </button>
                    <button
                      onClick={() => deleteAddress(address.id)}
                      className="h-10 rounded-md border-2 border-ink bg-paper px-3 text-sm font-black text-flame"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        <button
          onClick={() => setComposerOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-md border-2 border-ink bg-acid px-4 font-black shadow-hard"
        >
          <Plus className="h-4 w-4" />
          Tambah Alamat
        </button>
      </div>

      <div className="rounded-lg border-2 border-ink bg-bone p-4">
        <Home className="h-7 w-7 text-cobalt" />
        <p className="mt-4 font-black">Fungsi alamat</p>
        <p className="mt-1 text-sm text-ink/62">
          Alamat default akan otomatis dipakai saat checkout. Jika ingin memakai alamat lain, pilih dari halaman checkout.
        </p>

        {composerOpen ? (
          <div className="mt-5 grid gap-3">
            <AddressField label="Label alamat" value={draft.label} onChange={(value) => updateDraft("label", value)} />
            <AddressField label="Nama penerima" value={draft.recipient} onChange={(value) => updateDraft("recipient", value)} />
            <AddressField label="Nomor HP penerima" value={draft.phone} onChange={(value) => updateDraft("phone", value)} />
            <AddressField label="Provinsi" value={draft.province} onChange={(value) => updateDraft("province", value)} />
            <AddressField label="Kabupaten/Kota" value={draft.city} onChange={(value) => updateDraft("city", value)} />
            <AddressField label="Kecamatan" value={draft.district} onChange={(value) => updateDraft("district", value)} />
            <AddressField label="Desa/Kelurahan" value={draft.village} onChange={(value) => updateDraft("village", value)} />
            <div className="grid grid-cols-2 gap-3">
              <AddressField label="RT" value={draft.rt} onChange={(value) => updateDraft("rt", value)} />
              <AddressField label="RW" value={draft.rw} onChange={(value) => updateDraft("rw", value)} />
            </div>
            <AddressField label="Kode Pos" value={draft.postalCode} onChange={(value) => updateDraft("postalCode", value)} />
            <AddressField label="Catatan alamat" value={draft.note} onChange={(value) => updateDraft("note", value)} />
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={saveAddress}
                className="h-11 rounded-md border-2 border-ink bg-acid font-black shadow-hard"
              >
                Simpan Alamat
              </button>
              <button
                onClick={() => setComposerOpen(false)}
                className="h-11 rounded-md border-2 border-ink bg-paper font-black"
              >
                Batal
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AddressSummary({ address, compact = false }: { address: ProfileAddress; compact?: boolean }) {
  return (
    <div className={compact ? "mt-2 text-sm text-ink/62" : "mt-4 text-sm font-bold leading-6 text-ink/75"}>
      <p>{address.recipient || "-"} | {address.phone || "-"}</p>
      <p>
        {[address.village, address.district, address.city, address.province, address.postalCode]
          .filter(Boolean)
          .join(", ") || "-"}
      </p>
      <p>RT/RW: {address.rt || "-"}/{address.rw || "-"}</p>
      {address.note ? <p>Catatan: {address.note}</p> : null}
    </div>
  );
}

function VoucherPanel() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {vouchers.map((voucher) => (
        <article key={voucher.code} className="rounded-lg border-2 border-ink bg-bone p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-flame">{voucher.label}</p>
              <h3 className="font-display text-3xl">{voucher.code}</h3>
            </div>
            <span className="font-display text-3xl">{voucher.value}</span>
          </div>
          <p className="mt-4 text-sm font-black">{voucher.status}</p>
          <p className="text-sm text-ink/58">{voucher.expires}</p>
          <Link href="/products" className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-md border-2 border-ink bg-paper font-black">
            Belanja
          </Link>
        </article>
      ))}
    </div>
  );
}

function OrderPanel({ orders, syncedAt, onRefresh }: { orders: StoredOrder[]; syncedAt: string; onRefresh: () => Promise<void> }) {
  const [trackingAlert, setTrackingAlert] = useState("");
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancelingItem, setCancelingItem] = useState("");
  const [cancelPreview, setCancelPreview] = useState<{ order: StoredOrder; item: StoredOrderProduct } | null>(null);

  async function cancelOneItem(order: StoredOrder, item: StoredOrderProduct) {
    const orderItemId = item.lineId;
    if (!orderItemId || cancelingItem) {
      return;
    }

    const key = `${order.id}:${orderItemId}`;
    setCancelingItem(key);
    setCancelMessage("");

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/cancel-item`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({ orderItemId }),
      });
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(result?.message ?? "Pembatalan item gagal.");
      }

      setCancelMessage(result?.message ?? "Item berhasil dibatalkan.");
      setCancelPreview(null);
      await onRefresh();
    } catch (error) {
      setCancelMessage(error instanceof Error ? error.message : "Pembatalan item gagal.");
    } finally {
      setCancelingItem("");
      window.setTimeout(() => setCancelMessage(""), 5000);
    }
  }

  async function trackOrder(order: StoredOrder) {
    if (!order.trackingNumber) {
      setTrackingAlert("Resi belum tersedia. Tunggu admin mengisi nomor resi.");
      window.setTimeout(() => setTrackingAlert(""), 3500);
      return;
    }

    try {
      await navigator.clipboard.writeText(order.trackingNumber);
      setTrackingAlert(`Resi ${order.trackingNumber} sudah dicopy. Paste di halaman tracking JNE.`);
    } catch {
      setTrackingAlert(`Buka JNE lalu paste manual resi: ${order.trackingNumber}`);
    }

    window.open("https://jne.co.id/tracking-package", "_blank", "noopener,noreferrer");
    window.setTimeout(() => setTrackingAlert(""), 5000);
  }

  if (orders.length) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <p className="text-sm font-bold text-ink/55">
            Update terakhir: {syncedAt ? new Date(syncedAt).toLocaleTimeString("id-ID") : "menunggu sinkron"}
          </p>
          <Link href="/history" className="inline-flex h-10 items-center rounded-md border-2 border-ink bg-paper px-4 font-black shadow-hard">
            Lihat History
          </Link>
        </div>
        {trackingAlert ? (
          <div className="rounded-lg border-2 border-ink bg-acid p-4 text-sm font-black shadow-soft">
            {trackingAlert}
          </div>
        ) : null}
        {cancelMessage ? (
          <div className="rounded-lg border-2 border-ink bg-paper p-4 text-sm font-black shadow-soft">
            {cancelMessage}
          </div>
        ) : null}
        {orders.map((order) => (
          <article key={order.id} className="rounded-lg border-2 border-ink bg-bone p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <p className="font-display text-2xl">{order.id}</p>
                <div className="mt-3 grid gap-2">
                  {(order.items?.length ? order.items : [order.product]).map((item) => {
                    const canceledQuantity = item.canceledQuantity ?? 0;
                    const activeQuantity = Math.max(0, item.quantity - canceledQuantity);
                    const canCancel =
                      activeQuantity > 0 &&
                      Boolean(item.lineId) &&
                      ["Menunggu Pembayaran", "Pesanan Masuk", "Diproses"].includes(order.status);
                    const key = `${order.id}:${item.lineId ?? `${item.id}-${item.size}`}`;

                    return (
                      <div key={key} className="rounded-md border-2 border-ink bg-paper p-3">
                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                          <div className="flex min-w-0 gap-3">
                            <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md border-2 border-ink bg-bone">
                              {item.thumbnail ? (
                                // Thumbnail order bisa berupa URL upload/local yang sudah tersimpan di database.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="grid h-full place-items-center text-[10px] font-black text-ink/35">NO IMG</div>
                              )}
                            </div>
                            <div className="min-w-0 text-sm">
                              <p className="font-black text-ink">{item.name}</p>
                              <p className="mt-1 text-ink/58">
                                Size {item.size} | Aktif {activeQuantity} dari {item.quantity} pcs
                                {canceledQuantity ? ` | Dibatalkan ${canceledQuantity} pcs` : ""}
                              </p>
                              <p className="mt-1 text-xs font-black text-ink/45">Refund per 1 item dihitung otomatis oleh server.</p>
                              {item.refundStatus ? (
                                <p className="mt-1 text-xs font-black uppercase text-cobalt">
                                  {item.refundStatus} {item.refundTotal ? `- ${money(item.refundTotal)}` : ""}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={!canCancel || cancelingItem === key}
                            onClick={() => setCancelPreview({ order, item })}
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border-2 border-ink bg-paper px-3 text-xs font-black transition hover:bg-acid disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <Trash2 className="h-4 w-4 text-flame" />
                            {cancelingItem === key ? "Memproses..." : "Cancel"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs font-bold text-ink/45">
                  Diperbarui admin: {new Date(order.updatedAt ?? order.createdAt).toLocaleString("id-ID")}
                </p>
              </div>
              <div className="text-left md:text-right">
                <p className="font-black">{money(order.total)}</p>
                <p className="text-sm font-black text-cobalt">{order.status}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <PaymentStatusAlert order={order} />
              <StatusBox icon={CreditCard} label="Pembayaran" value={order.paymentStatus ?? "Belum Dibayar"} />
              <StatusBox icon={Truck} label="Kurir / Resi" value={order.trackingNumber ? `${order.courier || "Kurir"} - ${order.trackingNumber}` : "Belum ada resi"} />
              <StatusBox icon={Bell} label="Info Admin" value={order.adminNote || "Menunggu update admin"} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {order.paymentStatus === "Menunggu Pembayaran QRIS" ? (
                <Link
                  href={`/checkout/payment?order=${encodeURIComponent(order.id)}`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border-2 border-ink bg-acid px-4 font-black shadow-hard transition hover:-translate-y-0.5"
                >
                  <CreditCard className="h-4 w-4" />
                  Lanjutkan Pembayaran
                </Link>
              ) : null}
              <button
                onClick={() => trackOrder(order)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border-2 border-ink bg-paper px-4 font-black shadow-hard transition hover:bg-acid disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Truck className="h-4 w-4 text-cobalt" />
                Lacak JNE
              </button>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-5">
              {["Pesanan Masuk", "Diproses", "Dikemas", "Dikirim", "Selesai"].map((step) => (
                <div
                  key={step}
                  className={`rounded-md border-2 border-ink px-3 py-2 text-center text-xs font-black ${
                    step === order.status ? "bg-acid" : "bg-paper"
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          </article>
        ))}
        {cancelPreview ? (
          <CancelItemDialog
            order={cancelPreview.order}
            item={cancelPreview.item}
            processing={cancelingItem === `${cancelPreview.order.id}:${cancelPreview.item.lineId ?? ""}`}
            onClose={() => setCancelPreview(null)}
            onConfirm={() => void cancelOneItem(cancelPreview.order, cancelPreview.item)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-ink bg-bone p-6">
      <PackageCheck className="h-8 w-8 text-cobalt" />
      <p className="mt-4 font-display text-2xl">Belum ada pesanan</p>
      <p className="mt-1 text-sm text-ink/62">
        Setelah pembelian pertama berhasil, status pesanan akan tampil di sini.
      </p>
      <Link href="/history" className="mt-5 inline-flex h-10 items-center rounded-md border-2 border-ink bg-paper px-4 font-black">
        Lihat History
      </Link>
    </div>
  );
}

function PaymentStatusAlert({ order }: { order: StoredOrder }) {
  const paid = order.paymentStatus === "Sudah Dibayar" || Boolean(order.paidAt);

  return (
    <div
      role="alert"
      className={`rounded-md border-2 border-ink p-3 text-sm font-black md:col-span-3 ${
        paid ? "bg-acid text-ink" : "bg-flame/10 text-flame"
      }`}
    >
      {paid
        ? "Pembayaran sudah selesai. Pesanan akan dilanjutkan ke proses admin."
        : "Pembayaran belum selesai. Selesaikan pembayaran agar pesanan bisa dilanjutkan."}
    </div>
  );
}

function CancelItemDialog({
  order,
  item,
  processing,
  onClose,
  onConfirm,
}: {
  order: StoredOrder;
  item: StoredOrderProduct;
  processing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const canceledQuantity = item.canceledQuantity ?? 0;
  const activeQuantity = Math.max(0, item.quantity - canceledQuantity);
  const activeUnitsBefore = (order.items?.length ? order.items : [order.product]).reduce(
    (sum, current) => sum + Math.max(0, current.quantity - (current.canceledQuantity ?? 0)),
    0,
  );
  const isLastActiveUnit = activeUnitsBefore <= 1;
  const discountShare = order.subtotal > 0
    ? Math.min(item.unitPrice, Math.floor((item.unitPrice * order.voucherDiscount) / order.subtotal))
    : 0;
  const estimatedRefund = Math.max(0, item.unitPrice - discountShare) + (isLastActiveUnit ? order.shipping : 0);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4" role="dialog" aria-modal="true" aria-label="Konfirmasi pembatalan item">
      <div className="w-full max-w-lg rounded-lg border-2 border-ink bg-paper p-5 shadow-hard">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-flame">Preview item cancel</p>
            <h3 className="mt-1 font-display text-3xl leading-none">Batalkan 1 item?</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border-2 border-ink px-3 py-1 text-sm font-black">
            Tutup
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[150px_1fr]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg border-2 border-ink bg-bone">
            {item.thumbnail ? (
              // Thumbnail order bisa berupa URL upload/local yang sudah tersimpan di database.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-sm font-black text-ink/35">NO IMAGE</div>
            )}
          </div>
          <div>
            <p className="font-display text-3xl leading-none">{item.name}</p>
            <p className="mt-2 text-sm font-bold text-ink/60">Order {order.id}</p>
            <div className="mt-4 grid gap-2 text-sm font-black">
              <p>Size: {item.size}</p>
              <p>SKU: {item.sku}</p>
              <p>Unit aktif: {activeQuantity} dari {item.quantity}</p>
              <p>Estimasi refund: {money(estimatedRefund)}</p>
            </div>
          </div>
        </div>

        <p className="mt-4 rounded-md border-2 border-ink bg-bone p-3 text-sm font-bold text-ink/65">
          Sistem akan membatalkan tepat 1 unit item ini, mengembalikan stok 1 unit, dan mencatat refund berhasil otomatis di database. Jika ini item terakhir, order ikut dibatalkan penuh.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="h-11 rounded-md border-2 border-ink bg-paper font-black disabled:opacity-50"
          >
            Jangan Batalkan
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={processing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border-2 border-ink bg-acid font-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4 text-flame" />
            {processing ? "Memproses..." : "Ya, Batalkan 1 Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBox({ icon: Icon, label, value }: { icon: typeof CreditCard; label: string; value: string }) {
  return (
    <div className="rounded-md border-2 border-ink bg-paper p-3">
      <Icon className="h-5 w-5 text-flame" />
      <p className="mt-2 text-xs font-black uppercase text-ink/45">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function SettingsPanel() {
  const toggles = ["Notifikasi pesanan", "Update promo", "Rekomendasi ukuran", "Login alert"];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {toggles.map((toggle, index) => (
        <label key={toggle} className="flex items-center justify-between rounded-lg border-2 border-ink bg-bone p-4 font-black">
          <span className="flex items-center gap-3">
            {index === 0 ? <Bell className="h-5 w-5 text-flame" /> : <CheckCircle2 className="h-5 w-5 text-cobalt" />}
            {toggle}
          </span>
          <input type="checkbox" defaultChecked={index !== 1} className="h-5 w-5 accent-ink" />
        </label>
      ))}
      <form action={logoutAction} className="md:col-span-2">
        <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border-2 border-ink bg-paper font-black text-flame">
        <LogOut className="h-4 w-4" />
        Keluar Akun
        </button>
      </form>
    </div>
  );
}

function Field({ label, value = "" }: { label: string; value?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-ink/50">{label}</span>
      <input
        defaultValue={value}
        className="mt-2 h-12 w-full rounded-md border-2 border-ink bg-paper px-3 font-bold outline-none transition focus:bg-acid/20"
      />
    </label>
  );
}

function AddressField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-ink/50">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border-2 border-ink bg-paper px-3 font-bold outline-none transition focus:bg-acid/20"
      />
    </label>
  );
}
