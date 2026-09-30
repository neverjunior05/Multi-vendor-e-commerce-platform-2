"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Alert, EmptyState, LinkButton, Spinner, StatusPill } from "@/components/ui";
import { api, apiErrorMessage } from "@/lib/api-client";
import { formatDate, formatMoney } from "@/lib/format";
import type { ApiOrder } from "@/lib/types";

export default function OrdersPage() {
  const { user, ready } = useAuth();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) {
      setLoading(false);
      return;
    }
    api
      .get<{ items: ApiOrder[] }>("/orders")
      .then(({ data }) => setOrders(data.items))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [ready, user]);

  if (!ready || loading) {
    return <div className="card grid place-items-center py-24"><Spinner className="size-6 text-accent" /></div>;
  }

  if (!user) {
    return (
      <EmptyState
        icon="🔐"
        title="Sign in to see your orders"
        action={<LinkButton href="/login?next=/orders" size="lg">Sign in</LinkButton>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold tracking-[0.18em] text-accent uppercase">Account</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Order history</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {orders.length} order{orders.length === 1 ? "" : "s"} · lifetime spend{" "}
          {formatMoney(orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.totalCents, 0))}
        </p>
      </header>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No orders yet"
          description="Your first order will show up here with a sandbox payment reference."
          action={<LinkButton href="/products" size="lg">Start shopping</LinkButton>}
        />
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas px-5 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-display font-bold">#{order.id}</span>
                  <StatusPill status={order.status} />
                  <span className="text-xs text-ink-soft">{formatDate(order.createdAt)}</span>
                  <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-ink-soft">
                    {order.paymentBrand} · {order.paymentRef.slice(0, 18)}
                  </span>
                </div>
                <span className="font-display font-bold">{formatMoney(order.totalCents)}</span>
              </div>
              <ul className="divide-y divide-line">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-canvas">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.title} className="size-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-ink-soft">
                        ×{item.quantity} · {formatMoney(item.unitPriceCents)} each
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <p className="text-xs text-ink-soft">
                  Ships to {order.shipName}, {order.shipLine1}, {order.shipCity} {order.shipPostal}, {order.shipCountry}
                </p>
                <Link href={`/orders/${order.id}`} className="text-sm font-semibold text-accent-deep hover:underline">
                  View details →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
