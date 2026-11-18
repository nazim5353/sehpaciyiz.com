"use client";
import type { ReactNode } from "react";
import products from "@/data/catalog.json";
import { StoreProvider } from "@/components/store-provider";

// Share the versioned catalogue in one cached JS chunk instead of serializing
// all products again in every route's HTML and React Server Component payload.
export function OnlineStoreProvider({ children, shipping }: {
  children: ReactNode;
  shipping: { flatRate: number; freeThreshold: number };
}) {
  return <StoreProvider products={products} shipping={shipping}>{children}</StoreProvider>;
}
