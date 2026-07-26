"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { UserRound } from "lucide-react";

type OrdersResponse = {
  orders?: { status?: string }[];
};

export function ProfileLink() {
  const [orderCount, setOrderCount] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState("");
  const pollingDisabled = useRef(false);

  useEffect(() => {
    function loadProfilePhoto() {
      const email = window.localStorage.getItem("oneday_profile_photo_current_email");
      const photo = email ? window.localStorage.getItem(`oneday_profile_photo:${email}`) : "";
      setProfilePhoto(photo ?? "");
    }

    async function refreshOrderCount() {
      if (pollingDisabled.current) {
        return;
      }

      try {
        const response = await fetch(`/api/orders?ts=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (response.status === 401 || response.status === 403) {
          pollingDisabled.current = true;
          setOrderCount(0);
          setProfilePhoto("");
          return;
        }
        if (!response.ok) {
          return;
        }
        loadProfilePhoto();
        const data = (await response.json()) as OrdersResponse;
        const activeOrders = data.orders?.filter((order) => order.status !== "Selesai") ?? [];
        setOrderCount(activeOrders.length);
      } catch {
        // Keep the last badge count if the local dev server is restarting.
      }
    }

    void refreshOrderCount();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshOrderCount();
      }
    }, 10000);

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void refreshOrderCount();
      }
    }

    window.addEventListener("focus", refreshOrderCount);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("oneday-profile-photo-updated", loadProfilePhoto);
    window.addEventListener("storage", loadProfilePhoto);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOrderCount);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("oneday-profile-photo-updated", loadProfilePhoto);
      window.removeEventListener("storage", loadProfilePhoto);
    };
  }, []);

  return (
    <Link
      href="/profile?tab=orders"
      aria-label={profilePhoto ? "Buka profil" : "Profile"}
      className={`relative inline-flex h-10 items-center justify-center rounded-full border-2 border-ink bg-paper font-black transition hover:bg-acid ${
        profilePhoto ? "w-10 overflow-hidden p-0" : "gap-2 px-3"
      }`}
    >
      <span className="relative">
        {profilePhoto ? (
          <span className="block h-10 w-10 overflow-hidden rounded-full bg-bone">
            {/* Data URL WebP sudah diproses lokal oleh profile dashboard. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profilePhoto} alt="" className="h-full w-full object-cover" />
          </span>
        ) : (
          <UserRound className="h-5 w-5" />
        )}
        {orderCount > 0 ? (
          <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full border-2 border-paper bg-flame px-1 text-[10px] font-black leading-none text-white">
            {orderCount}
          </span>
        ) : null}
      </span>
      {profilePhoto ? null : <span className="hidden text-sm md:inline">Profile</span>}
    </Link>
  );
}
