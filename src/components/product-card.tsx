"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Price, Stars } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import type { ProductCardData } from "@/lib/types";

export function ProductCard({ product }: { product: ProductCardData }) {
  const { add } = useCart();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const soldOut = product.stock <= 0;

  const handleAdd = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setBusy(true);
    try {
      await add(product.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
    } catch {
      /* surfaced by the cart badge / toast */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Link
      href={`/products/${product.id}`}
      className="card group flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg hover:shadow-ink/5"
    >
      <div className="relative aspect-square overflow-hidden bg-canvas">
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.title}
            className="size-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid size-full place-items-center text-4xl">🧺</div>
        )}
        {product.compareAtCents && product.compareAtCents > product.priceCents ? (
          <span className="absolute top-3 left-3 rounded-full bg-danger px-2.5 py-1 text-[11px] font-bold text-white uppercase">
            Sale
          </span>
        ) : null}
        {soldOut ? (
          <span className="absolute inset-0 grid place-items-center bg-ink/50 text-sm font-bold tracking-wide text-white uppercase">
            Sold out
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-bold tracking-[0.12em] text-accent uppercase">
            {product.vendorName}
          </span>
          {product.categoryName ? (
            <span className="shrink-0 text-[11px] text-ink-soft">{product.categoryName}</span>
          ) : null}
        </div>
        <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold">{product.title}</h3>
        <div className="flex items-center gap-1.5 text-xs text-ink-soft">
          <Stars rating={product.rating} />
          <span>{product.reviewCount > 0 ? `${product.reviewCount} review${product.reviewCount === 1 ? "" : "s"}` : "No reviews yet"}</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <Price cents={product.priceCents} compareAt={product.compareAtCents} className="text-lg" />
          <button
            onClick={handleAdd}
            disabled={soldOut || busy}
            className="rounded-full bg-accent-soft px-3 py-2 text-xs font-bold text-accent-ink transition hover:bg-accent hover:text-white disabled:opacity-40"
          >
            {added ? "Added ✓" : busy ? "…" : "Add"}
          </button>
        </div>
        {product.stock > 0 && product.stock <= 5 ? (
          <p className="text-[11px] font-semibold text-warn">Only {product.stock} left</p>
        ) : null}
      </div>
    </Link>
  );
}

export function ProductGrid({
  products,
  emptyLabel = "No products matched those filters.",
}: {
  products: ProductCardData[];
  emptyLabel?: string;
}) {
  if (products.length === 0) {
    return (
      <div className="card p-12 text-center text-sm text-ink-soft">{emptyLabel}</div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export function CartLineTotal({ priceCents, quantity }: { priceCents: number; quantity: number }) {
  return <span className="font-display font-bold">{formatMoney(priceCents * quantity)}</span>;
}
