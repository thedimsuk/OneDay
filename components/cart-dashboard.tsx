"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import {
  type CartItem,
  countCartItems,
  readCartItems,
  writeCartItems,
} from "@/lib/cart-storage";
import type { Product } from "@/lib/products";
import { money } from "@/lib/utils";

export function CartDashboard({ products }: { products: Product[] }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const cartLoadedRef = useRef(false);
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const cartRows = items
    .map((item) => ({ item, product: productById.get(item.productId) }))
    .filter((row): row is { item: CartItem; product: Product } => Boolean(row.product));
  const selectedRows = cartRows.filter(({ item }) => selectedKeys.includes(getCartItemKey(item)));
  const subtotal = selectedRows.reduce((sum, row) => sum + (row.product.discountPrice ?? row.product.price) * row.item.quantity, 0);
  const original = selectedRows.reduce((sum, row) => sum + row.product.price * row.item.quantity, 0);
  const shipping = selectedRows.length ? 18000 : 0;
  const total = subtotal + shipping;
  const checkoutItems = selectedRows.map(({ item }) => ({
    productId: item.productId,
    size: item.size,
    quantity: item.quantity,
  }));
  const checkoutHref = checkoutItems.length
    ? `/checkout?items=${encodeURIComponent(JSON.stringify(checkoutItems))}`
    : "/cart";

  useEffect(() => {
    function refreshCartItems() {
      const savedItems = readCartItems();
      const savedKeys = savedItems.map(getCartItemKey);
      setItems(savedItems);
      setSelectedKeys((keys) => {
        if (!cartLoadedRef.current) {
          return savedKeys;
        }

        return keys.filter((key) => savedKeys.includes(key));
      });
      cartLoadedRef.current = true;
    }

    refreshCartItems();
    window.addEventListener("pageshow", refreshCartItems);
    window.addEventListener("focus", refreshCartItems);

    return () => {
      window.removeEventListener("pageshow", refreshCartItems);
      window.removeEventListener("focus", refreshCartItems);
    };
  }, []);

  function updateItems(nextItems: CartItem[]) {
    setItems(nextItems);
    setSelectedKeys((keys) => keys.filter((key) => nextItems.some((item) => getCartItemKey(item) === key)));
    writeCartItems(nextItems);
  }

  function updateQuantity(item: CartItem, quantity: number) {
    const product = productById.get(item.productId);
    const safeQuantity = Math.max(1, Math.min(product?.stock ?? 1, quantity));
    updateItems(
      items.map((cartItem) =>
        cartItem.productId === item.productId && cartItem.size === item.size
          ? { ...cartItem, quantity: safeQuantity }
          : cartItem,
      ),
    );
  }

  function removeItem(item: CartItem) {
    updateItems(items.filter((cartItem) => cartItem.productId !== item.productId || cartItem.size !== item.size));
  }

  function toggleItem(item: CartItem) {
    const key = getCartItemKey(item);
    setSelectedKeys((keys) => (keys.includes(key) ? keys.filter((itemKey) => itemKey !== key) : [...keys, key]));
  }

  function toggleAll() {
    if (selectedKeys.length === cartRows.length) {
      setSelectedKeys([]);
      return;
    }

    setSelectedKeys(cartRows.map(({ item }) => getCartItemKey(item)));
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1fr_360px] md:px-6">
      <section>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="font-black uppercase text-flame">Cart</p>
            <h1 className="font-display text-5xl leading-none">Keranjang</h1>
          </div>
          {countCartItems(items) > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={toggleAll}
                className="inline-flex h-10 items-center rounded-full border-2 border-ink bg-paper px-4 font-black shadow-soft"
              >
                {selectedKeys.length === cartRows.length ? "Hapus centang" : "Centang semua"}
              </button>
              <span className="inline-flex h-10 items-center rounded-full border-2 border-ink bg-acid px-4 font-black">
                {selectedRows.length} dipilih
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-6 space-y-4">
          {cartRows.length ? (
            cartRows.map(({ item, product }) => {
              const checkoutParams = new URLSearchParams({
                product: product.id,
                size: item.size,
                qty: String(item.quantity),
              });

              return (
                <article key={`${product.id}-${item.size}`} className="rounded-lg border-2 border-ink bg-paper p-4 shadow-soft">
                  <div className="flex flex-col gap-4 min-[420px]:flex-row">
                    <button
                      type="button"
                      onClick={() => toggleItem(item)}
                      aria-label={`Pilih ${product.name}`}
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border-2 border-ink ${
                        selectedKeys.includes(getCartItemKey(item)) ? "bg-acid" : "bg-paper"
                      }`}
                    >
                      {selectedKeys.includes(getCartItemKey(item)) ? <Check className="h-4 w-4" /> : null}
                    </button>
                    <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md border-2 border-ink bg-bone">
                      <Image src={product.thumbnail} alt={product.name} fill sizes="80px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-xl leading-tight">{product.name}</h2>
                      <p className="text-sm text-ink/55">Size {item.size} | SKU {product.sku}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item, item.quantity - 1)}
                          className="grid h-9 w-9 place-items-center rounded-md border-2 border-ink"
                          aria-label="Kurangi jumlah"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="grid h-9 w-10 place-items-center font-black">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item, item.quantity + 1)}
                          className="grid h-9 w-9 place-items-center rounded-md border-2 border-ink"
                          aria-label="Tambah jumlah"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeItem(item)}
                          className="ml-auto grid h-9 w-9 place-items-center rounded-md border-2 border-ink text-flame"
                          aria-label="Hapus produk"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-4 text-xs font-bold text-ink/50">
                        Centang produk ini lalu gunakan Checkout Sekarang di ringkasan.
                      </p>
                    </div>
                    <div className="shrink-0 text-left min-[420px]:text-right">
                      {product.discountPrice ? <p className="text-xs text-ink/40 line-through">{money(product.price)}</p> : null}
                      <p className="break-words font-black">{money(product.discountPrice ?? product.price)}</p>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-lg border-2 border-dashed border-ink bg-paper p-7 shadow-soft">
              <ShoppingBag className="h-9 w-9 text-flame" />
              <h2 className="mt-4 font-display text-4xl">Keranjang kosong</h2>
              <p className="mt-2 text-ink/62">Produk yang kamu masukkan ke keranjang akan muncul di sini.</p>
              <Link href="/" className="mt-5 inline-flex h-11 items-center rounded-md border-2 border-ink bg-acid px-4 font-black shadow-hard">
                Lihat produk lain
              </Link>
            </div>
          )}
        </div>
      </section>

      <aside className="h-fit rounded-lg border-2 border-ink bg-ink p-5 text-paper shadow-hard">
        <h2 className="font-display text-3xl">Ringkasan</h2>
        <Line label="Harga asli" value={money(original)} />
        <Line label="Diskon produk" value={`-${money(original - subtotal)}`} />
        <Line label="Ongkir" value={money(shipping)} />
        <div className="mt-5 border-t border-paper/20 pt-5">
          <Line label="Total dipilih" value={money(total)} strong />
        </div>
        <Link
          href={checkoutHref}
          aria-disabled={!selectedRows.length}
          className={`mt-6 inline-flex h-12 w-full items-center justify-center rounded-md font-black text-ink ${
            selectedRows.length ? "bg-acid shadow-hard" : "pointer-events-none bg-paper/20 text-paper/35"
          }`}
        >
          Checkout Sekarang
        </Link>
        <p className="mt-4 text-xs leading-5 text-paper/55">
          Checkout akan memproses semua produk yang dicentang dalam satu pesanan.
        </p>
      </aside>
    </main>
  );
}

function getCartItemKey(item: CartItem) {
  return `${item.productId}:${item.size}`;
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`mt-4 flex justify-between gap-3 ${strong ? "text-xl font-black" : "text-sm text-paper/75"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
