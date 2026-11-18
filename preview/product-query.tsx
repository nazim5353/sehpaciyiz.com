"use client";
import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { ProductDetail } from "@/components/product-detail";

export function OnlineProductDetail(props: ComponentProps<typeof ProductDetail>) {
  const color = useSearchParams().get("renk") ?? undefined;
  return <ProductDetail {...props} key={`${props.product.id}-${color ?? "default"}`} initialVariantId={color} />;
}
