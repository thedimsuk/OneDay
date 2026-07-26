"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const previousKey = "oneday_previous_path";

export function MobileBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const isRoot = pathname === "/";
  const isAdmin = pathname.startsWith("/admin");

  if (isRoot || isAdmin) {
    return null;
  }

  function goBack() {
    const previousPath = window.sessionStorage.getItem(previousKey);

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    router.push(previousPath || "/products");
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Kembali ke halaman sebelumnya"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-paper transition hover:bg-acid md:hidden"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
