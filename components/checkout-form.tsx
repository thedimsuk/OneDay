"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, MapPin, PackageCheck, TicketCheck } from "lucide-react";
import { removeCartItems } from "@/lib/cart-storage";
import type { OrderRecord } from "@/lib/orders";
import { Product, Size } from "@/lib/products";
import { money } from "@/lib/utils";

const vouchers = [
  { code: "NEW20", label: "New User", percent: 20, description: "Khusus pesanan pertama akun ini", conditional: true },
  { code: "LOYAL30", label: "Loyalty", percent: 30, description: "Butuh minimal 3 transaksi selesai", conditional: true },
  { code: "ONEDAY25", label: "Admin Drop", percent: 25, description: "Voucher promo pilihan admin", conditional: false },
];

const steps = ["Produk", "Alamat", "Voucher", "Bayar"];

type CheckoutAddress = {
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

type CheckoutLineItem = {
  product: Product;
  size: Size;
  quantity: number;
};

type VoucherEligibility = {
  code: string;
  available: boolean;
  reason: string;
  percent: number;
};

const emptyCheckoutAddress = {
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

export function CheckoutForm({
  product,
  initialSize,
  initialQuantity,
  accountEmail,
  resumedOrder,
  checkoutItems,
}: {
  product: Product;
  initialSize: Size;
  initialQuantity: number;
  accountEmail?: string;
  resumedOrder?: OrderRecord;
  checkoutItems?: CheckoutLineItem[];
}) {
  const router = useRouter();
  const [voucherCode, setVoucherCode] = useState(resumedOrder?.voucherCode ?? "");
  const [savedAddresses, setSavedAddresses] = useState<CheckoutAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [manualAddressOpen, setManualAddressOpen] = useState(false);
  const [address, setAddress] = useState(resumedOrder?.address ?? emptyCheckoutAddress);
  const [voucherEligibility, setVoucherEligibility] = useState<VoucherEligibility[]>([]);
  const [voucherLoading, setVoucherLoading] = useState(!resumedOrder);
  const [paymentMessage, setPaymentMessage] = useState(
    resumedOrder
      ? "Pembayaran lama ditemukan. Klik lanjutkan pembayaran untuk membuka halaman QRIS."
      : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const unitPrice = product.discountPrice ?? product.price;
  const lineItems = useMemo(
    () =>
      resumedOrder?.items?.length
        ? resumedOrder.items.map((item) => ({
            product: {
              ...product,
              id: item.id,
              name: item.name,
              sku: item.sku,
              thumbnail: item.thumbnail,
              price: item.unitPrice,
              discountPrice: undefined,
            },
            size: item.size as Size,
            quantity: item.quantity,
          }))
        : checkoutItems?.length
          ? checkoutItems
          : [{ product, size: initialSize, quantity: initialQuantity }],
    [checkoutItems, initialQuantity, initialSize, product, resumedOrder],
  );
  const selectedSavedAddress = savedAddresses.find((item) => item.id === selectedAddressId);

  const voucherStatusByCode = useMemo(
    () => new Map(voucherEligibility.map((voucher) => [voucher.code, voucher])),
    [voucherEligibility],
  );

  useEffect(() => {
    if (resumedOrder) {
      setManualAddressOpen(false);
      return;
    }

    void fetch("/api/addresses", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Alamat gagal dimuat");
      const { addresses } = await response.json() as { addresses: CheckoutAddress[] };
      const defaultAddress = addresses.find((item) => item.isDefault) ?? addresses[0];
      setSavedAddresses(addresses);
      if (defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
      setAddress({
        recipient: defaultAddress.recipient,
        phone: defaultAddress.phone,
        province: defaultAddress.province,
        city: defaultAddress.city,
        district: defaultAddress.district,
        village: defaultAddress.village,
        rt: defaultAddress.rt,
        rw: defaultAddress.rw,
        postalCode: defaultAddress.postalCode,
        note: defaultAddress.note,
      });
      setManualAddressOpen(false);
      } else setManualAddressOpen(true);
    }).catch(() => setManualAddressOpen(true));
  }, [accountEmail, resumedOrder]);

  useEffect(() => {
    if (resumedOrder) {
      return;
    }

    const controller = new AbortController();
    const items = lineItems.map((item) => ({
      productId: item.product.id,
      size: item.size,
      quantity: item.quantity,
    }));

    setVoucherLoading(true);
    void fetch("/api/vouchers/eligibility", {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({ items }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Voucher gagal dicek");
        }

        const data = (await response.json()) as { vouchers?: VoucherEligibility[] };
        setVoucherEligibility(Array.isArray(data.vouchers) ? data.vouchers : []);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setVoucherEligibility([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setVoucherLoading(false);
        }
      });

    return () => controller.abort();
  }, [lineItems, resumedOrder]);

  useEffect(() => {
    if (!voucherCode || voucherLoading || resumedOrder) {
      return;
    }

    const selectedVoucher = voucherStatusByCode.get(voucherCode);
    if (!selectedVoucher?.available) {
      setVoucherCode("");
      setPaymentMessage(selectedVoucher?.reason ?? "Voucher belum bisa dipakai untuk akun ini.");
    }
  }, [resumedOrder, voucherCode, voucherLoading, voucherStatusByCode]);

  function selectSavedAddress(savedAddress: CheckoutAddress) {
    setSelectedAddressId(savedAddress.id);
    setAddress({
      recipient: savedAddress.recipient,
      phone: savedAddress.phone,
      province: savedAddress.province,
      city: savedAddress.city,
      district: savedAddress.district,
      village: savedAddress.village,
      rt: savedAddress.rt,
      rw: savedAddress.rw,
      postalCode: savedAddress.postalCode,
      note: savedAddress.note,
    });
    setAddressPickerOpen(false);
    setManualAddressOpen(false);
  }

  const totals = useMemo(() => {
    if (resumedOrder) {
      return {
        subtotal: resumedOrder.subtotal,
        voucherDiscount: resumedOrder.voucherDiscount,
        shipping: resumedOrder.shipping,
        total: resumedOrder.total,
      };
    }

    const subtotal = lineItems.reduce(
      (sum, item) => sum + (item.product.discountPrice ?? item.product.price) * item.quantity,
      0,
    );
    const selectedVoucher = vouchers.find((voucher) => voucher.code === voucherCode);
    const selectedVoucherStatus = voucherCode ? voucherStatusByCode.get(voucherCode) : null;
    const voucherDiscount = selectedVoucher && selectedVoucherStatus?.available && !selectedVoucher.conditional
      ? Math.floor(subtotal * (selectedVoucher.percent / 100))
      : 0;
    const shipping = 18000;
    return {
      subtotal,
      voucherDiscount,
      shipping,
      total: subtotal - voucherDiscount + shipping,
    };
  }, [lineItems, resumedOrder, voucherCode, voucherStatusByCode]);

  async function submitOrder() {
    if (submitting) {
      return;
    }

    if (resumedOrder) {
      router.push(`/checkout/payment?order=${encodeURIComponent(resumedOrder.id)}`);
      return;
    }

    setSubmitting(true);
    setPaymentMessage("");
    const orderItems = lineItems.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      sku: item.product.sku,
      size: item.size,
      quantity: item.quantity,
      unitPrice: item.product.discountPrice ?? item.product.price,
      thumbnail: item.product.thumbnail,
    }));
    const order = {
      items: orderItems.map((item) => ({ productId: item.id, size: item.size, quantity: item.quantity })),
      buyer: {
        name: address.recipient,
        phone: address.phone,
        note: address.note,
      },
      address,
      addressId: selectedAddressId || undefined,
      voucherCode,
    };

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });

    setSubmitting(false);

    if (!response.ok) {
      const failure = (await response.json().catch(() => null)) as { message?: string } | null;
      setPaymentMessage(failure?.message ?? "Order gagal dibuat. Cek alamat dan koneksi lalu coba lagi.");
      return;
    }

    const data = (await response.json()) as { order?: { id: string } };
    if (data.order) {
      if (checkoutItems?.length) {
        removeCartItems(
          checkoutItems.map((item) => ({
            productId: item.product.id,
            size: item.size,
          })),
        );
      }
      router.push(`/checkout/payment?order=${encodeURIComponent(data.order.id)}`);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <div className="mb-7">
        <p className="text-sm font-black uppercase text-flame">Checkout</p>
        <h1 className="font-display text-5xl leading-none md:text-7xl">Selesaikan pesanan.</h1>
      </div>

      <div className="mb-8 grid grid-cols-4 gap-2">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`rounded-md border-2 border-ink px-2 py-3 text-center text-xs font-black ${
              index <= 3 ? "bg-acid" : "bg-paper"
            }`}
          >
            {step}
          </div>
        ))}
      </div>

      <div className="grid gap-7 lg:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          <Panel icon={PackageCheck} title="Produk dipilih">
            <div className="grid gap-4">
              {lineItems.map((item) => (
                <div key={`${item.product.id}-${item.size}`} className="flex gap-4 rounded-md border-2 border-ink bg-bone p-3">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md border-2 border-ink bg-paper">
                    <Image src={item.product.thumbnail} alt={item.product.name} fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-2xl leading-tight">{item.product.name}</h2>
                    <p className="mt-1 text-sm text-ink/60">SKU {item.product.sku}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm font-black">
                      <span className="rounded-full border-2 border-ink bg-acid px-3 py-1">Size {item.size}</span>
                      <span className="rounded-full border-2 border-ink bg-paper px-3 py-1">Jumlah {item.quantity}</span>
                      <span className="rounded-full border-2 border-ink bg-paper px-3 py-1">
                        {money((item.product.discountPrice ?? item.product.price) * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel icon={MapPin} title="Alamat lengkap">
            {selectedSavedAddress && !manualAddressOpen ? (
              <div className="rounded-lg border-2 border-ink bg-acid p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-ink/55">Dipakai otomatis dari profile</p>
                    <h3 className="mt-1 font-display text-3xl">{selectedSavedAddress.label}</h3>
                    <AddressSummary address={selectedSavedAddress} />
                  </div>
                  <span className="h-fit rounded-full border-2 border-ink bg-paper px-3 py-1 text-xs font-black">
                    {selectedSavedAddress.isDefault ? "Default" : "Alamat Terpilih"}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {savedAddresses.length ? (
                <button
                  onClick={() => setAddressPickerOpen((open) => !open)}
                  className="inline-flex h-10 items-center gap-2 rounded-md border-2 border-ink bg-paper px-4 font-black"
                >
                  <MapPin className="h-4 w-4 text-cobalt" />
                  Pilih alamat lain
                </button>
              ) : null}
              <button
                onClick={() => setManualAddressOpen((open) => !open)}
                className="inline-flex h-10 items-center gap-2 rounded-md border-2 border-ink bg-paper px-4 font-black"
              >
                <MapPin className="h-4 w-4 text-cobalt" />
                {selectedSavedAddress ? "Ubah alamat checkout" : "Isi alamat checkout"}
              </button>
            </div>

            {addressPickerOpen ? (
              <div className="mt-4 grid gap-3">
                {savedAddresses.map((savedAddress) => (
                  <button
                    key={savedAddress.id}
                    onClick={() => selectSavedAddress(savedAddress)}
                    className={`rounded-lg border-2 border-ink p-4 text-left ${
                      selectedAddressId === savedAddress.id ? "bg-acid shadow-hard" : "bg-bone hover:bg-paper"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-2xl">{savedAddress.label}</p>
                      {savedAddress.isDefault ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-black">Default</span> : null}
                    </div>
                    <AddressSummary address={savedAddress} />
                  </button>
                ))}
              </div>
            ) : null}

            {manualAddressOpen ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Nama penerima" value={address.recipient} onChange={(value) => setAddress((data) => ({ ...data, recipient: value }))} />
                <Field label="Nomor HP penerima" value={address.phone} onChange={(value) => setAddress((data) => ({ ...data, phone: value }))} />
                <Field label="Provinsi" value={address.province} onChange={(value) => setAddress((data) => ({ ...data, province: value }))} />
                <Field label="Kabupaten/Kota" value={address.city} onChange={(value) => setAddress((data) => ({ ...data, city: value }))} />
                <Field label="Kecamatan" value={address.district} onChange={(value) => setAddress((data) => ({ ...data, district: value }))} />
                <Field label="Desa/Kelurahan" value={address.village} onChange={(value) => setAddress((data) => ({ ...data, village: value }))} />
                <Field label="RT" value={address.rt} onChange={(value) => setAddress((data) => ({ ...data, rt: value }))} />
                <Field label="RW" value={address.rw} onChange={(value) => setAddress((data) => ({ ...data, rw: value }))} />
                <Field label="Kode Pos" value={address.postalCode} onChange={(value) => setAddress((data) => ({ ...data, postalCode: value }))} />
                <Field label="Catatan alamat" value={address.note} onChange={(value) => setAddress((data) => ({ ...data, note: value }))} />
              </div>
            ) : null}
          </Panel>

          <Panel icon={TicketCheck} title="Voucher tersedia">
            <div className="grid gap-3 md:grid-cols-3">
              {vouchers.map((voucher) => {
                const status = voucherStatusByCode.get(voucher.code);
                const unavailable = !resumedOrder && (voucherLoading || !status?.available);
                const statusText = voucherLoading
                  ? "Mengecek akun..."
                  : status?.available
                    ? voucher.conditional
                      ? "Bisa dipakai, final dicek server"
                      : `Estimasi -${voucher.percent}%`
                    : status?.reason ?? "Belum didapatkan";

                return (
                  <button
                    key={voucher.code}
                    type="button"
                    disabled={unavailable}
                    onClick={() => setVoucherCode(voucher.code)}
                    className={`rounded-lg border-2 border-ink p-4 text-left transition disabled:cursor-not-allowed ${
                      voucherCode === voucher.code
                        ? "bg-acid shadow-hard"
                        : unavailable
                          ? "border-ink/30 bg-zinc-200 text-ink/35 grayscale"
                          : "bg-bone hover:bg-paper"
                    }`}
                    aria-disabled={unavailable}
                  >
                    <p className={`text-xs font-black uppercase ${unavailable ? "text-ink/35" : "text-flame"}`}>{voucher.label}</p>
                    <p className="font-display text-3xl">{voucher.code}</p>
                    <p className={`mt-1 text-sm ${unavailable ? "text-ink/35" : "text-ink/60"}`}>{voucher.description}</p>
                    <p className={`mt-3 text-xs font-black uppercase ${unavailable ? "text-ink/40" : "text-ink/45"}`}>
                      {statusText}
                    </p>
                  </button>
                );
              })}
            </div>
            {voucherCode ? (
              <p className="mt-4 rounded-md border-2 border-ink bg-bone p-3 text-sm font-bold text-ink/65">
                Voucher akan dicek ulang oleh server saat checkout. Jika syarat tidak terpenuhi, order tidak dibuat dan pesan error akan muncul.
              </p>
            ) : null}
          </Panel>
        </section>

        <aside className="h-fit rounded-lg border-2 border-ink bg-ink p-5 text-paper shadow-hard">
          <CreditCard className="h-7 w-7 text-acid" />
          <h2 className="mt-3 font-display text-4xl">Ringkasan</h2>
          <SummaryLine label="Subtotal" value={money(totals.subtotal)} />
          <SummaryLine
            label={voucherCode ? `Voucher ${voucherCode}` : "Voucher"}
            value={voucherCode && totals.voucherDiscount === 0 ? "Dicek server" : `-${money(totals.voucherDiscount)}`}
          />
          <SummaryLine label="Ongkir" value={money(totals.shipping)} />
          <div className="mt-5 border-t border-paper/20 pt-5">
            <SummaryLine label="Total bayar" value={money(totals.total)} strong />
          </div>
          <button
            onClick={submitOrder}
            disabled={submitting}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-acid font-black text-ink"
          >
            <CheckCircle2 className="h-5 w-5" />
            {submitting ? "Membuat Order..." : resumedOrder ? "Lanjutkan Pembayaran QRIS" : "Checkout Sekarang"}
          </button>
          {paymentMessage ? (
            <p className="mt-4 rounded-md border-2 border-paper/30 bg-paper/10 p-3 text-sm font-bold leading-5 text-paper/75">
              {paymentMessage}
            </p>
          ) : null}
          <p className="mt-4 text-xs leading-5 text-paper/50">
            Setelah checkout, halaman berikutnya akan menampilkan QRIS untuk discan.
          </p>
        </aside>
      </div>
    </main>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof PackageCheck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border-2 border-ink bg-paper p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-acid">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="font-display text-3xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-ink/50">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-md border-2 border-ink bg-paper px-3 font-bold outline-none transition focus:bg-acid/20"
      />
    </label>
  );
}

function AddressSummary({ address }: { address: CheckoutAddress }) {
  return (
    <div className="mt-3 text-sm font-bold leading-6 text-ink/70">
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

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`mt-4 flex justify-between gap-3 ${strong ? "text-xl font-black" : "text-sm text-paper/75"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
