"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { cartChangedEvent, countCartItems, readCartItems } from "@/lib/cart-storage";

export function CartLink() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    function refreshCartCount() {
      setCartCount(countCartItems(readCartItems()));
    }

    refreshCartCount();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshCartCount();
      }
    }, 10000);

    window.addEventListener(cartChangedEvent, refreshCartCount);
    window.addEventListener("storage", refreshCartCount);
    window.addEventListener("focus", refreshCartCount);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(cartChangedEvent, refreshCartCount);
      window.removeEventListener("storage", refreshCartCount);
      window.removeEventListener("focus", refreshCartCount);
    };
  }, []);

  return (
    <Link
      href="/cart"
      aria-label="Keranjang"
      className="relative inline-flex h-10 items-center justify-center rounded-full border-2 border-ink bg-paper px-3 font-black transition hover:bg-acid"
    >
      <ShoppingBag className="h-5 w-5" />
      {cartCount > 0 ? (
        <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full border-2 border-paper bg-flame px-1 text-[10px] font-black leading-none text-white">
          {cartCount}
        </span>
      ) : null}
    </Link>
  );
}
