import Link from "next/link";
import { CartLink } from "@/components/cart-link";
import { MobileBackButton } from "@/components/mobile-back-button";
import { ProfileLink } from "@/components/profile-link";

export function SiteHeader({ mode = "user" }: { mode?: "user" | "admin" }) {
  const isAdmin = mode === "admin";

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b-2 border-ink bg-paper/92 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <MobileBackButton />
          <Link href={isAdmin ? "/admin" : "/"} className="min-w-0 font-display text-2xl font-black tracking-normal">
            ONEDAY
          </Link>
        </div>
        {isAdmin ? null : (
          <div className="flex shrink-0 items-center gap-2">
            <CartLink />
            <ProfileLink />
          </div>
        )}
      </div>
    </header>
  );
}
