"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Alert, Button, EmptyState, LinkButton, Spinner } from "@/components/ui";
import { formatMoney } from "@/lib/format";

export default function CartPage() {
  const { user, ready } = useAuth();
  const { items, subtotalCents, shippingCents, totalCents, vendorCount, loading, setQuantity, remove, clear, reload } =
    useCart();

  // Signed-in users may land here with a stale cart after the merge effect.
  useEffect(() => {
    if (ready && user) void reload();
  }, [ready, user, reload]);

  if (!ready) {
    return <div className="card grid place-items-center py-24 text-ink-soft"><Spinner className="size-6 text-accent" /></div>;
  }

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    acc[item.vendorName] = [...(acc[item.vendorName] ?? []), item];
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-accent uppercase">Your cart</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">
            {items.length > 0 ? `${items.length} item${items.length === 1 ? "" : "s"} from ${vendorCount} vendor${vendorCount === 1 ? "" : "s"}` : "Your cart"}
          </h1>
        </div>
        {items.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => void clear()}>
            Empty cart
          </Button>
        ) : null}
      </header>

      {!user ? (
        <Alert tone="warn">
          You&apos;re browsing as a guest — the cart is stored in this browser.{" "}
          <Link href="/login?next=/cart" className="font-bold underline">
            Sign in
          </Link>{" "}
          to save it to your account.
        </Alert>
      ) : null}
      {loading ? <Alert tone="success">Syncing your cart…</Alert> : null}

      {items.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="Nothing in here yet"
          description="Browse the marketplace and add something handmade."
          action={<LinkButton href="/products" size="lg">Browse products</LinkButton>}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          <div className="space-y-5">
            {Object.entries(grouped).map(([vendorName, lines]) => (
              <section key={vendorName} className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-line bg-canvas px-5 py-3">
                  <p className="text-sm font-bold">{vendorName}</p>
                  <Link href={`/vendors/${lines[0].vendorSlug}`} className="text-xs font-semibold text-accent-deep hover:underline">
                    Visit store →
                  </Link>
                </div>
                <ul className="divide-y divide-line">
                  {lines.map((item) => (
                    <li key={item.id} className="flex gap-4 p-4">
                      <Link href={`/products/${item.productId}`} className="size-20 shrink-0 overflow-hidden rounded-xl bg-canvas">
                        {item.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.images[0]} alt={item.title} className="size-full object-cover" />
                        ) : null}
                      </Link>
                      <div className="flex flex-1 flex-col gap-1">
                        <Link href={`/products/${item.productId}`} className="font-semibold hover:text-accent-deep">
                          {item.title}
                        </Link>
                        <p className="text-sm text-ink-soft">{formatMoney(item.priceCents)} each</p>
                        {item.quantity >= item.stock ? (
                          <p className="text-xs font-semibold text-warn">Only {item.stock} in stock</p>
                        ) : null}
                        <div className="mt-auto flex items-center gap-3">
                          <div className="flex items-center rounded-full border border-line">
                            <button
                              onClick={() => void setQuantity(item.productId, item.quantity - 1)}
                              className="grid size-9 place-items-center rounded-l-full hover:bg-accent-soft"
                              aria-label="Decrease"
                            >
                              −
                            </button>
                            <span className="w-9 text-center font-display text-sm font-bold">{item.quantity}</span>
                            <button
                              onClick={() => void setQuantity(item.productId, Math.min(item.quantity + 1, item.stock))}
                              className="grid size-9 place-items-center rounded-r-full hover:bg-accent-soft"
                              aria-label="Increase"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => void remove(item.productId)}
                            className="text-xs font-semibold text-danger hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <p className="font-display font-bold">{formatMoney(item.priceCents * item.quantity)}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24">
            <h2 className="font-display text-lg font-bold">Order summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="font-semibold">{formatMoney(subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Shipping</dt>
                <dd className="font-semibold">{shippingCents === 0 ? "Free" : formatMoney(shippingCents)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-base">
                <dt className="font-bold">Total</dt>
                <dd className="font-display text-xl font-extrabold">{formatMoney(totalCents)}</dd>
              </div>
            </dl>
            {shippingCents > 0 ? (
              <p className="rounded-xl bg-accent-soft px-3 py-2 text-xs font-semibold text-accent-ink">
                Add {formatMoney(10000 - subtotalCents)} more for free shipping.
              </p>
            ) : null}
            <LinkButton href={user ? "/checkout" : "/login?next=/checkout"} size="lg" className="w-full">
              {user ? "Checkout →" : "Sign in to checkout →"}
            </LinkButton>
            <p className="text-center text-xs text-ink-soft">Sandbox payment — test card 4242 4242 4242 4242</p>
          </aside>
        </div>
      )}
    </div>
  );
}
