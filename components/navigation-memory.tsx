"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const currentKey = "oneday_current_path";
const previousKey = "oneday_previous_path";

export function NavigationMemory() {
  const pathname = usePathname();

  useEffect(() => {
    const currentPath = `${pathname}${window.location.search}`;
    const lastPath = window.sessionStorage.getItem(currentKey);

    if (lastPath && lastPath !== currentPath) {
      window.sessionStorage.setItem(previousKey, lastPath);
    }

    window.sessionStorage.setItem(currentKey, currentPath);
  }, [pathname]);

  return null;
}
