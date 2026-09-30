"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Alert, Button, Field, LinkButton, Price, Select, Stars, Textarea } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { api, apiErrorMessage } from "@/lib/api-client";

export function BuyBox({
  productId,
  priceCents,
  compareAtCents,
  stock,
}: {
  productId: number;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
}) {
  const { add } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const soldOut = stock <= 0;

  const handleAdd = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await add(productId, quantity);
      setMessage("Added to your cart.");
    } catch (error) {
      setMessage(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-end justify-between gap-3">
        <Price cents={priceCents} compareAt={compareAtCents} />
        {stock > 0 ? (
          <span className="text-xs font-semibold text-success">{stock} in stock</span>
        ) : (
          <span className="text-xs font-semibold text-danger">Sold out</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-line">
          <button
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            className="grid size-10 place-items-center rounded-l-full text-lg hover:bg-accent-soft"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center font-display font-bold">{quantity}</span>
          <button
            onClick={() => setQuantity((value) => Math.min(stock || 1, value + 1))}
            className="grid size-10 place-items-center rounded-r-full text-lg hover:bg-accent-soft"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <p className="text-xs text-ink-soft">
          Subtotal <span className="font-semibold text-ink">{formatMoney(priceCents * quantity)}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleAdd} disabled={soldOut || busy} size="lg">
          {busy ? "Adding…" : soldOut ? "Sold out" : "Add to cart"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          disabled={soldOut}
          onClick={async () => {
            await handleAdd();
            router.push(user ? "/checkout" : "/login?next=/checkout");
          }}
        >
          Buy now
        </Button>
      </div>

      {!user ? (
        <p className="text-xs text-ink-soft">
          Shopping as a guest — your cart is kept in this browser and merged when you{" "}
          <Link href="/login?next=/cart" className="font-semibold text-accent-deep hover:underline">
            sign in
          </Link>
          .
        </p>
      ) : null}
      {message ? <Alert tone={message.includes("Added") ? "success" : "danger"}>{message}</Alert> : null}

      <ul className="space-y-1.5 border-t border-line pt-3 text-xs text-ink-soft">
        <li>🚚 Free shipping on carts over {formatMoney(10000)}</li>
        <li>💳 Sandbox payments only — no real money moves</li>
        <li>🧾 Order appears instantly in your history</li>
      </ul>
    </div>
  );
}

type ReviewRow = {
  id: number;
  rating: number;
  comment: string;
  createdAt: string | Date;
  userName: string;
};

export function ReviewSection({
  productId,
  reviews,
  rating,
  reviewCount,
}: {
  productId: number;
  reviews: ReviewRow[];
  rating: number | null;
  reviewCount: number;
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<ReviewRow[]>(reviews);
  const [form, setForm] = useState({ rating: "5", comment: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ review: ReviewRow }>("/reviews", {
        productId,
        rating: Number(form.rating),
        comment: form.comment,
      });
      setRows((current) => [
        { ...data.review, userName: user?.name ?? "You" },
        ...current.filter((row) => row.userName !== (user?.name ?? "You")),
      ]);
      setForm({ rating: "5", comment: "" });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-5">
        <h2 className="font-display text-2xl font-bold">Reviews</h2>
        <div className="card p-5">
          <p className="font-display text-4xl font-extrabold">{rating ? rating.toFixed(1) : "—"}</p>
          <Stars rating={rating} size={18} />
          <p className="mt-2 text-sm text-ink-soft">
            {reviewCount > 0 ? `${reviewCount} verified review${reviewCount === 1 ? "" : "s"}` : "No reviews yet — be the first."}
          </p>
        </div>

        {user ? (
          <form onSubmit={submit} className="card space-y-3 p-5">
            <p className="font-display font-bold">Write a review</p>
            <Field label="Rating">
              <Select value={form.rating} onChange={(event) => setForm({ ...form, rating: event.target.value })}>
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} star{value === 1 ? "" : "s"}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Your thoughts">
              <Textarea
                value={form.comment}
                onChange={(event) => setForm({ ...form, comment: event.target.value })}
                placeholder="How is the finish, the weight, the packaging?"
              />
            </Field>
            {error ? <Alert tone="danger">{error}</Alert> : null}
            <Button type="submit" disabled={busy}>
              {busy ? "Posting…" : "Post review"}
            </Button>
          </form>
        ) : (
          <div className="card space-y-3 p-5">
            <p className="text-sm text-ink-soft">Sign in to leave a review.</p>
            <LinkButton href="/login" variant="outline" size="sm">
              Sign in
            </LinkButton>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="card px-6 py-12 text-center text-sm text-ink-soft">
            No reviews yet. Buyers can post one after purchase.
          </div>
        ) : (
          rows.map((review) => (
            <article key={review.id} className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{review.userName}</p>
                <span className="text-xs text-ink-soft">{formatDate(review.createdAt)}</span>
              </div>
              <Stars rating={review.rating} />
              {review.comment ? <p className="mt-2 text-sm text-ink-soft">{review.comment}</p> : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
