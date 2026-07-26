"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { addCartItem } from "@/lib/cart-storage";
import { Product, Size } from "@/lib/products";
import { money } from "@/lib/utils";

const sizes: Size[] = ["S", "M", "L", "XL", "XXL"];

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState<Size>("M");
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState(product.thumbnail);
  const sale = product.discountPrice && product.discountPrice < product.price;
  const unitPrice = product.discountPrice ?? product.price;
  const alternateImage = product.gallery[0] ?? product.thumbnail;
  const swapImage = mainImage === product.thumbnail ? alternateImage : product.thumbnail;
  const swapLabel = mainImage === product.thumbnail ? "Lihat tampak belakang" : "Lihat tampak depan";

  const checkoutUrl = useMemo(() => {
    const params = new URLSearchParams({
      product: product.id,
      size: selectedSize,
      qty: String(quantity),
    });
    return `/checkout?${params.toString()}`;
  }, [product.id, quantity, selectedSize]);

  function addToCart() {
    addCartItem({
      productId: product.id,
      size: selectedSize,
      quantity,
    });
    router.push("/cart");
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:px-6 md:py-10">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="grid gap-4">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg border-2 border-ink bg-bone shadow-hard">
            <Image src={mainImage} alt={product.name} fill priority sizes="(max-width: 1024px) 100vw, 48vw" className="object-cover" />
            {sale ? (
              <div className="absolute left-4 top-4 rounded-full bg-flame px-4 py-2 text-sm font-black uppercase text-white">
                Sale
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setMainImage(swapImage)}
            className="grid grid-cols-[72px_1fr] items-center gap-3 rounded-lg border-2 border-ink bg-paper p-2 text-left shadow-soft transition hover:bg-acid/30 sm:grid-cols-[88px_1fr]"
          >
            <span className="relative aspect-[4/5] overflow-hidden rounded-md border-2 border-ink bg-bone">
              <Image src={swapImage} alt={swapLabel} fill sizes="88px" className="object-cover" />
            </span>
            <span>
              <span className="block text-xs font-black uppercase text-flame">{swapLabel}</span>
              <span className="mt-1 block text-xs font-bold text-ink/62 sm:text-sm">
                Klik thumbnail untuk menukar foto utama.
              </span>
            </span>
          </button>
        </section>

        <section className="min-w-0">
          <p className="text-sm font-black uppercase text-flame">{product.category}</p>
          <h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl md:text-7xl">{product.name}</h1>
          <p className="mt-4 max-w-2xl text-ink/66">{product.description}</p>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            {sale ? <p className="text-lg font-bold text-ink/38 line-through">{money(product.price)}</p> : null}
            <p className="font-display text-3xl sm:text-4xl">{money(unitPrice)}</p>
            <span className="rounded-full border-2 border-ink bg-acid px-3 py-1 text-xs font-black uppercase">
              Stok {product.stock}
            </span>
          </div>

          <div className="mt-7 rounded-lg border-2 border-ink bg-paper p-4 shadow-soft sm:p-5 md:mt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-2xl">Pilih ukuran</p>
                <p className="text-sm text-ink/55">Template ukuran ONEDAY untuk produk ini.</p>
              </div>
              <p className="rounded-full bg-bone px-3 py-1 text-sm font-black">{selectedSize}</p>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`h-12 rounded-md border-2 border-ink font-black transition ${
                    selectedSize === size ? "bg-acid shadow-hard" : "bg-paper hover:bg-bone"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-lg border-2 border-ink bg-paper p-4 shadow-soft sm:p-5">
            <p className="font-display text-2xl">Jumlah produk</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="grid h-11 w-11 place-items-center rounded-md border-2 border-ink bg-paper"
                aria-label="Kurangi jumlah"
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="grid h-11 w-16 place-items-center rounded-md border-2 border-ink bg-bone font-display text-2xl">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}
                className="grid h-11 w-11 place-items-center rounded-md border-2 border-ink bg-paper"
                aria-label="Tambah jumlah"
              >
                <Plus className="h-5 w-5" />
              </button>
              <p className="w-full font-black sm:ml-auto sm:w-auto">Subtotal {money(unitPrice * quantity)}</p>
            </div>
          </div>

          <div className="mt-6 hidden gap-3 sm:grid sm:grid-cols-2">
            <Link
              href={checkoutUrl}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border-2 border-ink bg-ink px-5 font-black text-paper shadow-hard transition hover:-translate-y-0.5"
            >
              <Zap className="h-5 w-5 text-acid" />
              Langsung Checkout
            </Link>
            <button
              type="button"
              onClick={addToCart}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border-2 border-ink bg-acid px-5 font-black shadow-hard transition hover:-translate-y-0.5"
            >
              <ShoppingBag className="h-5 w-5" />
              Masukkan Keranjang
            </button>
          </div>
        </section>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper/95 p-3 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_auto] items-center gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-black uppercase text-ink/48">Subtotal</p>
            <p className="truncate font-display text-xl">{money(unitPrice * quantity)}</p>
          </div>
          <button
            type="button"
            onClick={addToCart}
            aria-label="Masukkan keranjang"
            className="grid h-12 w-12 place-items-center rounded-md border-2 border-ink bg-acid shadow-hard"
          >
            <ShoppingBag className="h-5 w-5" />
          </button>
          <Link
            href={checkoutUrl}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md border-2 border-ink bg-ink px-4 font-black text-paper shadow-hard"
          >
            <Zap className="h-5 w-5 text-acid" />
            Beli
          </Link>
        </div>
      </div>
    </main>
  );
}
