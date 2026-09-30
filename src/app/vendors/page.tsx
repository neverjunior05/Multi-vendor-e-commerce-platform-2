import Link from "next/link";
import { ensureSeeded } from "@/db/seed";
import { listVendors } from "@/lib/queries";
import { SectionHeading, StatusPill } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "All vendors · Bazaario" };

export default async function VendorsPage() {
  await ensureSeeded();
  const vendors = await listVendors("approved");

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-bold tracking-[0.18em] text-accent uppercase">The makers</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Approved vendor storefronts</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Every store below passed an admin review. Applications start as <StatusPill status="pending" /> and must be
          approved before they can list a product.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vendors.map((vendor) => (
          <Link
            key={vendor.id}
            href={`/vendors/${vendor.slug}`}
            className="card group overflow-hidden transition hover:-translate-y-1 hover:border-accent/60"
          >
            <div className="aspect-16/9 overflow-hidden bg-canvas">
              {vendor.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vendor.logoUrl} alt={vendor.storeName} className="size-full object-cover transition duration-500 group-hover:scale-105" />
              ) : (
                <div className="grid size-full place-items-center text-4xl">🏪</div>
              )}
            </div>
            <div className="space-y-1.5 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold">{vendor.storeName}</h2>
                <StatusPill status={vendor.status} />
              </div>
              <p className="line-clamp-2 text-sm text-ink-soft">{vendor.tagline}</p>
              <p className="pt-2 text-xs font-semibold text-accent">
                {vendor.productCount} products · {vendor.city ?? "Worldwide"}
              </p>
              <p className="text-xs text-ink-soft">Run by {vendor.ownerName}</p>
            </div>
          </Link>
        ))}
      </div>

      <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <SectionHeading title="Want to sell here?" />
          <p className="-mt-4 text-sm text-ink-soft">
            Register as a vendor, and an admin reviews your application — usually within a day.
          </p>
        </div>
        <Link
          href="/signup?role=vendor"
          className="rounded-full bg-accent px-6 py-3 text-sm font-bold text-white transition hover:bg-accent-deep"
        >
          Apply as a vendor →
        </Link>
      </section>
    </div>
  );
}
