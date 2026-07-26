"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/products";

type ProductFilter = "all" | "new" | "popular" | "discount";

const filters: Array<{ id: ProductFilter; label: string }> = [
  { id: "all", label: "Semua" },
  { id: "new", label: "Terbaru" },
  { id: "popular", label: "Populer" },
  { id: "discount", label: "Diskon" },
];

export function HomeProductShowcase({ products }: { products: Product[] }) {
  const [activeFilter, setActiveFilter] = useState<ProductFilter>("all");
  const shownProducts = useMemo(
    () => (activeFilter === "all" ? products : products.filter((product) => product.tag === activeFilter)),
    [activeFilter, products],
  );

  useEffect(() => {
    const applyHashFilter = () => {
      const hash = window.location.hash.replace("#", "");
      if (filters.some((filter) => filter.id === hash)) {
        setActiveFilter(hash as ProductFilter);
      }
    };

    applyHashFilter();
    window.addEventListener("hashchange", applyHashFilter);
    return () => window.removeEventListener("hashchange", applyHashFilter);
  }, []);

  const selectFilter = (filter: ProductFilter) => {
    setActiveFilter(filter);
    window.history.replaceState(null, "", filter === "all" ? "#products" : `#${filter}`);
  };

  return (
    <section id="products" className="scroll-mt-20 py-8 sm:py-10 md:py-12">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="-mx-4 mb-7 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
          <div className="flex min-w-max gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => selectFilter(filter.id)}
                aria-pressed={activeFilter === filter.id}
                className={`h-11 rounded-full border-2 border-ink px-5 text-sm font-black transition ${
                  activeFilter === filter.id ? "bg-acid shadow-hard" : "bg-paper hover:bg-bone"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {shownProducts.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {shownProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-ink bg-paper p-6 font-bold shadow-soft">
            Belum ada produk untuk kategori ini.
          </div>
        )}
      </div>
    </section>
  );
}
