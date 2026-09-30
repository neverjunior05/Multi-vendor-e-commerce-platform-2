"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Alert, Button, Field, Input, Spinner } from "@/components/ui";

function SignupForm() {
  const { signup } = useAuth();
  const { reload } = useCart();
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<"customer" | "vendor">(
    params.get("role") === "vendor" ? "vendor" : "customer",
  );
  const [form, setForm] = useState({ name: "", email: "", password: "", storeName: "", tagline: "", city: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await signup({ ...form, role });
      await reload();
      router.push(user.role === "vendor" ? "/vendor" : "/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <form onSubmit={submit} className="card space-y-4 p-6 sm:p-8">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-accent uppercase">Join Bazaario</p>
          <h1 className="mt-1 text-3xl font-extrabold">Create your account</h1>
        </div>

        {/* Role picker — this value is embedded in the signed JWT on the server. */}
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { value: "customer", icon: "🛍️", title: "Shop", copy: "Buy from every vendor" },
              { value: "vendor", icon: "🧑‍🏭", title: "Sell", copy: "Open a workshop store" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRole(option.value)}
              className={`rounded-2xl border p-4 text-left transition ${
                role === option.value ? "border-accent bg-accent-soft" : "border-line hover:border-accent/60"
              }`}
            >
              <span className="text-xl">{option.icon}</span>
              <p className="mt-1 font-display font-bold">{option.title}</p>
              <p className="text-xs text-ink-soft">{option.copy}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
        </div>
        <Field label="Password" hint="At least 8 characters — hashed with bcrypt before storage.">
          <Input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>

        {role === "vendor" ? (
          <div className="animate-rise space-y-4 rounded-2xl border border-line bg-canvas p-4">
            <p className="text-sm font-bold">Store application</p>
            <Field label="Store name">
              <Input required value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} placeholder="Kiln & Ember" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tagline">
                <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Wheel-thrown stoneware" />
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Lisbon" />
              </Field>
            </div>
            <Alert tone="warn">
              New stores start as <strong>Pending</strong>. An admin must approve your application before you can publish
              products.
            </Alert>
          </div>
        ) : null}

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Spinner /> : null} {busy ? "Creating account…" : role === "vendor" ? "Submit application" : "Create account"}
        </Button>

        <p className="text-center text-sm text-ink-soft">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-accent-deep hover:underline">
            Sign in
          </Link>
        </p>
      </form>

      <aside className="card h-fit space-y-4 p-6">
        <h2 className="font-display text-lg font-bold">How the roles work</h2>
        <ol className="space-y-3 text-sm text-ink-soft">
          <li className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">1</span>
            <span>Your password is hashed with bcrypt (10 rounds) — the plaintext is never stored.</span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">2</span>
            <span>Signing in returns a JWT with <code className="rounded bg-canvas px-1">{`{ sub, role }`}</code> inside, kept in an httpOnly cookie.</span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">3</span>
            <span>Every protected route calls <code className="rounded bg-canvas px-1">requireAuth(req, [roles])</code> which verifies the signature and re-reads your user row.</span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">4</span>
            <span>Vendors additionally need an approved store before <code className="rounded bg-canvas px-1">POST /api/products</code> succeeds.</span>
          </li>
        </ol>
      </aside>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="card grid place-items-center py-24"><Spinner className="size-6 text-accent" /></div>}>
      <SignupForm />
    </Suspense>
  );
}
