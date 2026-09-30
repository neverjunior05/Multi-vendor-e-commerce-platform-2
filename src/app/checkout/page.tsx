"use client";

/**
 * Checkout: address form -> order summary -> SANDBOX card payment.
 * Posts to POST /api/orders which charges the card and writes the order inside
 * a single database transaction.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Alert, Button, EmptyState, Field, Input, LinkButton, Spinner, Textarea } from "@/components/ui";
import { api, apiErrorMessage } from "@/lib/api-client";
import { formatMoney } from "@/lib/format";

const TEST_CARDS = [
  { label: "Approve", number: "4242 4242 4242 4242", tone: "text-success" },
  { label: "Decline", number: "4000 0000 0000 0002", tone: "text-danger" },
];

export default function CheckoutPage() {
  const { user, ready } = useAuth();
  const { items, subtotalCents, shippingCents, totalCents, reload } = useCart();
  const router = useRouter();
  const [form, setForm] = useState({
    shipName: "",
    shipPhone: "",
    shipLine1: "",
    shipCity: "",
    shipPostal: "",
    shipCountry: "",
    note: "",
    cardNumber: "4242 4242 4242 4242",
    expiry: "12 / 30",
    cvc: "123",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) {
      void reload();
      setForm((current) => ({ ...current, shipName: current.shipName || user.name }));
    }
  }, [ready, user, reload]);

  if (!ready) {
    return <div className="card grid place-items-center py-24"><Spinner className="size-6 text-accent" /></div>;
  }

  if (!user) {
    return (
      <EmptyState
        icon="🔐"
        title="Sign in to check out"
        description="Carts and orders are tied to an account so your history follows you across devices."
        action={<LinkButton href="/login?next=/checkout" size="lg">Sign in</LinkButton>}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="🧺"
        title="Your cart is empty"
        description="Add a few handmade pieces before checking out."
        action={<LinkButton href="/products" size="lg">Browse products</LinkButton>}
      />
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const [expMonth, expYear] = form.expiry.split("/").map((part) => Number(part.trim()));
    try {
      const { data } = await api.post<{ order: { id: number } }>("/orders", {
        shipName: form.shipName,
        shipPhone: form.shipPhone,
        shipLine1: form.shipLine1,
        shipCity: form.shipCity,
        shipPostal: form.shipPostal,
        shipCountry: form.shipCountry,
        note: form.note,
        cardNumber: form.cardNumber,
        expMonth,
        expYear,
        cvc: form.cvc,
      });
      router.push(`/orders/${data.order.id}?placed=1`);
    } catch (err) {
      setError(apiErrorMessage(err, "Payment failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <header>
        <p className="text-xs font-bold tracking-[0.18em] text-accent uppercase">Checkout</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Shipping &amp; payment</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {items.length} item{items.length === 1 ? "" : "s"} · {formatMoney(totalCents)} · sandbox payment
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-5">
          <section className="card space-y-4 p-5">
            <h2 className="font-display text-lg font-bold">1 · Delivery address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <Input required value={form.shipName} onChange={(e) => setForm({ ...form, shipName: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input value={form.shipPhone} onChange={(e) => setForm({ ...form, shipPhone: e.target.value })} placeholder="+1 555 0100" />
              </Field>
            </div>
            <Field label="Address line">
              <Input required value={form.shipLine1} onChange={(e) => setForm({ ...form, shipLine1: e.target.value })} placeholder="24 Rua das Flores, Apt 3" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City">
                <Input required value={form.shipCity} onChange={(e) => setForm({ ...form, shipCity: e.target.value })} />
              </Field>
              <Field label="Postal code">
                <Input required value={form.shipPostal} onChange={(e) => setForm({ ...form, shipPostal: e.target.value })} />
              </Field>
              <Field label="Country">
                <Input required value={form.shipCountry} onChange={(e) => setForm({ ...form, shipCountry: e.target.value })} />
              </Field>
            </div>
            <Field label="Delivery note (optional)">
              <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Leave with the neighbour if I'm out." />
            </Field>
          </section>

          <section className="card space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold">2 · Payment</h2>
              <span className="rounded-full bg-warn-soft px-2.5 py-1 text-[11px] font-bold tracking-wide text-amber-800 uppercase">
                Sandbox mode
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TEST_CARDS.map((card) => (
                <button
                  key={card.number}
                  type="button"
                  onClick={() => setForm({ ...form, cardNumber: card.number })}
                  className="rounded-xl border border-line px-3 py-2 text-left text-xs transition hover:border-accent"
                >
                  <span className={`block font-bold ${card.tone}`}>{card.label}</span>
                  <span className="text-ink-soft">{card.number}</span>
                </button>
              ))}
            </div>
            <Field label="Card number">
              <Input required value={form.cardNumber} onChange={(e) => setForm({ ...form, cardNumber: e.target.value })} inputMode="numeric" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Expiry (MM / YY)">
                <Input required value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} />
              </Field>
              <Field label="CVC">
                <Input required value={form.cvc} onChange={(e) => setForm({ ...form, cvc: e.target.value })} />
              </Field>
            </div>
            <p className="text-xs text-ink-soft">
              No real charge is made. Set <code className="rounded bg-canvas px-1">STRIPE_SECRET_KEY</code> to route the
              same flow through Stripe test mode.
            </p>
          </section>
        </div>

        <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold">Order summary</h2>
          <ul className="max-h-72 space-y-3 overflow-auto pr-1">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3">
                <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-canvas">
                  {item.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.images[0]} alt={item.title} className="size-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-ink-soft">
                    {item.vendorName} · ×{item.quantity}
                  </p>
                </div>
                <p className="text-sm font-bold">{formatMoney(item.priceCents * item.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-line pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Subtotal</dt>
              <dd className="font-semibold">{formatMoney(subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Shipping</dt>
              <dd className="font-semibold">{shippingCents === 0 ? "Free" : formatMoney(shippingCents)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3">
              <dt className="font-bold">Total due</dt>
              <dd className="font-display text-xl font-extrabold">{formatMoney(totalCents)}</dd>
            </div>
          </dl>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Spinner /> : null}
            {busy ? "Processing payment…" : `Pay ${formatMoney(totalCents)}`}
          </Button>
          <Link href="/cart" className="block text-center text-xs font-semibold text-ink-soft hover:text-accent-deep">
            ← Back to cart
          </Link>
        </aside>
      </div>
    </form>
  );
}
