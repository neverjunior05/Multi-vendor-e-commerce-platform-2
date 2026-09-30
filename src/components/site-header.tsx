"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { buttonClass } from "@/components/ui";
import { initials } from "@/lib/format";

const NAV = [
  { href: "/products", label: "Shop all" },
  { href: "/vendors", label: "Vendors" },
  { href: "/orders", label: "Orders" },
];

export function SiteHeader() {
  const { user, vendor, logout } = useAuth();
  const { count } = useCart();
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    router.push(term.trim() ? `/products?q=${encodeURIComponent(term.trim())}` : "/products");
  };

  const dashboardHref = user?.role === "admin" ? "/admin" : user?.role === "vendor" ? "/vendor" : "/orders";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-accent font-display text-lg font-black text-white">
            B
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">Bazaario</span>
        </Link>

        <form onSubmit={submitSearch} className="ml-2 hidden flex-1 items-center md:flex">
          <div className="relative w-full max-w-md">
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search ceramics, plants, leather…"
              className="h-10 w-full rounded-full border border-line bg-canvas pr-4 pl-10 text-sm outline-none transition focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15"
            />
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft">⌕</span>
          </div>
        </form>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-accent-soft hover:text-accent-ink"
            >
              {item.label}
            </Link>
          ))}
          {user?.role === "vendor" || user?.role === "admin" ? (
            <Link
              href={dashboardHref}
              className="rounded-full px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-accent-soft hover:text-accent-ink"
            >
              {user.role === "admin" ? "Admin" : "Dashboard"}
            </Link>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Link
            href="/cart"
            className="relative grid size-10 place-items-center rounded-full border border-line transition hover:border-accent"
            aria-label="Cart"
          >
            <span className="text-lg">🛒</span>
            {count > 0 ? (
              <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">
                {count}
              </span>
            ) : null}
          </Link>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1 transition hover:border-accent"
              >
                <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent-ink">
                  {initials(user.name)}
                </span>
                <span className="hidden text-sm font-semibold sm:block">{user.name.split(" ")[0]}</span>
              </button>
              {menuOpen ? (
                <div
                  className="card absolute right-0 mt-2 w-60 overflow-hidden p-1.5 shadow-xl shadow-ink/10"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-bold">{user.name}</p>
                    <p className="truncate text-xs text-ink-soft">{user.email}</p>
                    <p className="mt-1.5 inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent-ink uppercase">
                      {vendor ? `${user.role} · ${vendor.status}` : user.role}
                    </p>
                  </div>
                  <div className="my-1 h-px bg-line" />
                  <Link href={dashboardHref} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent-soft">
                    {user.role === "admin" ? "Admin panel" : user.role === "vendor" ? "Vendor dashboard" : "My orders"}
                  </Link>
                  <Link href="/products" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent-soft">
                    Continue shopping
                  </Link>
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      await logout();
                      router.push("/");
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-danger hover:bg-danger-soft"
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className={buttonClass("ghost", "sm")}>
                Sign in
              </Link>
              <Link href="/signup" className={buttonClass("primary", "sm")}>
                Sell on Bazaario
              </Link>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={submitSearch} className="border-t border-line px-4 py-2 md:hidden">
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search products & vendors…"
          className="h-10 w-full rounded-full border border-line bg-canvas px-4 text-sm outline-none focus:border-accent"
        />
      </form>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-accent font-display text-sm font-black text-white">B</span>
            <span className="font-display font-extrabold">Bazaario</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-ink-soft">
            A multi-vendor marketplace where independent workshops sell side by side. Demo project — payments run in sandbox mode only.
          </p>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold tracking-[0.16em] text-ink-soft uppercase">Shop</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/products" className="hover:text-accent-deep">All products</Link></li>
            <li><Link href="/vendors" className="hover:text-accent-deep">All vendors</Link></li>
            <li><Link href="/cart" className="hover:text-accent-deep">Your cart</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold tracking-[0.16em] text-ink-soft uppercase">Accounts</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/signup" className="hover:text-accent-deep">Create account</Link></li>
            <li><Link href="/vendor" className="hover:text-accent-deep">Vendor dashboard</Link></li>
            <li><Link href="/admin" className="hover:text-accent-deep">Admin panel</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold tracking-[0.16em] text-ink-soft uppercase">Demo logins</p>
          <ul className="space-y-1.5 text-xs text-ink-soft">
            <li>admin@bazaario.dev</li>
            <li>maya@bazaario.dev (vendor)</li>
            <li>customer@bazaario.dev</li>
            <li className="font-semibold text-ink">Password123!</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-ink-soft">
        © {new Date().getFullYear()} Bazaario · React · Next.js REST API · PostgreSQL + Drizzle · JWT auth
      </div>
    </footer>
  );
}
