"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Alert, Button, Field, Input, Spinner } from "@/components/ui";

const DEMO = [
  { role: "Admin", email: "admin@bazaario.dev" },
  { role: "Vendor", email: "maya@bazaario.dev" },
  { role: "Customer", email: "customer@bazaario.dev" },
];

function LoginForm() {
  const { login } = useAuth();
  const { reload } = useCart();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      await reload();
      if (user.role === "admin") router.push("/admin");
      else if (user.role === "vendor") router.push("/vendor");
      else router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_0.9fr]">
      <form onSubmit={submit} className="card space-y-4 p-6 sm:p-8">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-accent uppercase">Welcome back</p>
          <h1 className="mt-1 text-3xl font-extrabold">Sign in</h1>
          <p className="mt-2 text-sm text-ink-soft">One account, three roles — the JWT decides what you can do.</p>
        </div>

        <Field label="Email">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Spinner /> : null} {busy ? "Signing in…" : "Sign in"}
        </Button>

        <p className="text-center text-sm text-ink-soft">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-accent-deep hover:underline">
            Create an account
          </Link>
        </p>
      </form>

      <aside className="card h-fit space-y-3 p-6">
        <h2 className="font-display text-lg font-bold">Demo accounts</h2>
        <p className="text-sm text-ink-soft">
          Password for all of them: <code className="rounded bg-canvas px-1.5 py-0.5 font-semibold">Password123!</code>
        </p>
        <ul className="space-y-2">
          {DEMO.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword("Password123!");
                }}
                className="w-full rounded-xl border border-line px-3 py-2 text-left text-sm transition hover:border-accent"
              >
                <span className="block font-bold">{account.role}</span>
                <span className="text-xs text-ink-soft">{account.email}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-soft">Tap one to prefill the form, then press sign in.</p>
      </aside>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card grid place-items-center py-24"><Spinner className="size-6 text-accent" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
