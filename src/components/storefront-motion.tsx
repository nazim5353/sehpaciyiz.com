"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
export function StorefrontMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = `/design/init.js?route=${encodeURIComponent(pathname)}&visit=${Date.now()}`;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [pathname]);
  return null;
}
