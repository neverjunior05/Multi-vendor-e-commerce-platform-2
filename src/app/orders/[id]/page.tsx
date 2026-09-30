import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getOrderDetail } from "@/lib/queries";
import { StatusPill } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const auth = await getAuth();
  const order = await getOrderDetail(Number(id));

  if (!order) notFound();
  // Route protection on the server: only the buyer or an admin may read an order.
  if (!auth) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="text-lg font-bold">Sign in to view this order</p>
        <Link href="/login" className="mt-3 inline-block font-semibold text-accent-deep hover:underline">
          Go to sign in →
        </Link>
      </div>
    );
  }
  if (auth.user.role !== "admin" && order.userId !== auth.user.id) notFound();

  const vendors = [...new Set(order.items.map((item) => item.vendorId))];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {query.placed ? (
        <div className="animate-rise rounded-2xl border border-success/30 bg-success-soft px-5 py-4">
          <p className="font-display text-lg font-bold text-emerald-800">Payment approved 🎉</p>
          <p className="text-sm text-emerald-900/80">
            Sandbox charge of {formatMoney(order.totalCents)} captured with reference{" "}
            <span className="font-mono">{order.paymentRef}</span>.
          </p>
        </div>
      ) : null}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-accent uppercase">Order</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold">#{order.id}</h1>
          <p className="mt-1 text-sm text-ink-soft">Placed {formatDate(order.createdAt)}</p>
        </div>
        <StatusPill status={order.status} />
      </header>

      <section className="card divide-y divide-line">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 p-4">
            <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-canvas">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.title} className="size-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{item.title}</p>
              <p className="text-xs text-ink-soft">
                ×{item.quantity} · {formatMoney(item.unitPriceCents)} each
              </p>
            </div>
            <p className="font-display font-bold">{formatMoney(item.unitPriceCents * item.quantity)}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card space-y-2 p-5 text-sm">
          <h2 className="font-display text-lg font-bold">Shipping to</h2>
          <p className="font-semibold">{order.shipName}</p>
          <p className="text-ink-soft">{order.shipLine1}</p>
          <p className="text-ink-soft">
            {order.shipCity} {order.shipPostal}, {order.shipCountry}
          </p>
          {order.shipPhone ? <p className="text-ink-soft">{order.shipPhone}</p> : null}
          {order.note ? (
            <p className="rounded-xl bg-accent-soft px-3 py-2 text-xs text-accent-ink">“{order.note}”</p>
          ) : null}
        </section>

        <section className="card space-y-2 p-5 text-sm">
          <h2 className="font-display text-lg font-bold">Payment</h2>
          <div className="flex justify-between">
            <span className="text-ink-soft">Subtotal</span>
            <span className="font-semibold">{formatMoney(order.subtotalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-soft">Shipping</span>
            <span className="font-semibold">{order.shippingCents === 0 ? "Free" : formatMoney(order.shippingCents)}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-2">
            <span className="font-bold">Total</span>
            <span className="font-display text-lg font-extrabold">{formatMoney(order.totalCents)}</span>
          </div>
          <p className="pt-1 font-mono text-xs text-ink-soft">
            {order.paymentBrand} · {order.paymentRef}
          </p>
          <p className="text-xs text-ink-soft">{vendors.length} vendor{vendors.length === 1 ? "" : "s"} fulfilled this order.</p>
        </section>
      </div>

      <div className="flex gap-3">
        <Link href="/orders" className="rounded-full border border-line px-5 py-3 text-sm font-semibold hover:border-accent">
          ← All orders
        </Link>
        <Link href="/products" className="rounded-full bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent-deep">
          Keep shopping
        </Link>
      </div>
    </div>
  );
}
