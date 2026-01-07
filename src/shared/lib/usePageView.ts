"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pageview } from "./analytics";

export function usePageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      pageview(pathname);
    }
  }, [pathname]);
}

