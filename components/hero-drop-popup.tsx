"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";

export function HeroDropPopup() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/55 px-4 py-4 backdrop-blur-sm sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-label="ONEDAY DROP 01"
    >
      <div className="flex min-h-full items-start justify-center sm:items-center">
      <div className="relative grid w-full max-w-5xl gap-6 rounded-lg border-2 border-ink bg-paper p-4 shadow-hard sm:p-6 md:grid-cols-[1fr_0.82fr] md:items-center">
        <button
          type="button"
          aria-label="Tutup popup"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-md border-2 border-ink bg-paper text-ink shadow-hard transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-acid"
        >
          <X className="h-6 w-6 stroke-[3]" />
        </button>

        <div className="pr-12 sm:pr-14 md:pr-0">
          <p className="mb-4 inline-flex rounded-full border-2 border-ink bg-acid px-3 py-1 text-xs font-black uppercase sm:px-4 sm:text-sm">
            Streetwear Minimalism
          </p>
          <h1 className="font-display text-5xl font-black leading-[0.78] tracking-normal sm:text-7xl md:text-8xl">
            ONEDAY
          </h1>
          <h2 className="mt-4 font-display text-3xl leading-none sm:text-5xl">
            KEEP <span className="marker">MOVING.</span>
          </h2>
          <p className="mt-5 max-w-xl text-base text-ink/68 sm:text-lg">
            Streetwear untuk mereka yang terus berjalan meski belum sampai tujuan.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#new"
              onClick={() => setOpen(false)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border-2 border-ink bg-ink px-6 font-black text-paper shadow-hard transition hover:-translate-y-0.5"
            >
              Shop Now <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#popular"
              onClick={() => setOpen(false)}
              className="inline-flex h-12 items-center justify-center rounded-md border-2 border-ink bg-paper px-6 font-black shadow-hard transition hover:-translate-y-0.5"
            >
              Explore Collection
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm md:max-w-none">
          <div className="rotate-1 rounded-lg border-2 border-ink bg-paper p-3 shadow-hard">
            <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-bone">
              <Image
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1100&q=80"
                alt="ONEDAY Drop 01 streetwear look"
                fill
                priority
                sizes="(max-width: 768px) 80vw, 360px"
                className="object-cover"
              />
            </div>
          </div>
          <div className="absolute -bottom-4 left-4 rounded-md border-2 border-ink bg-flame px-4 py-3 font-display text-xl text-white shadow-hard sm:text-2xl">
            DROP 01
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
