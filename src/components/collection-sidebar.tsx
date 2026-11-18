"use client";
import { useId, useState, type ReactNode } from "react";
import { SlidersHorizontal, CaretDown } from "@phosphor-icons/react";

export function CollectionSidebar({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return (
    <aside className="collection-sidebar" aria-label="Koleksiyon filtreleri">
      <button
        className="filter-toggle"
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
      >
        <SlidersHorizontal size={19} /> Kategori ve fiyat filtreleri{" "}
        <CaretDown size={18} />
      </button>
      <div
        id={id}
        className="collection-filter-content"
        data-expanded={expanded}
      >
        {children}
      </div>
    </aside>
  );
}
