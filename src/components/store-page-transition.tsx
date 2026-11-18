"use client";

import { ViewTransition, type ReactNode } from "react";

/** Content changes while the storefront header and footer stay in place. */
export function StorePageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition default="none" enter="form-page-in" exit="form-page-out">
      {children}
    </ViewTransition>
  );
}
