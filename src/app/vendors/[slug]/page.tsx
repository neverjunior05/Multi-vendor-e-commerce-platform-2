import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureSeeded } from "@/db/seed";
import { getVendorBySlug, listProducts } from "@/lib/queries";
import { ProductGrid } from "@/components/product-card";
import { StatusPill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function VendorStorePage({ params }: { params: Promise<{ slug: string }> }) {
  await ensureSeeded();
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) notFound();

  const catalogue = await listProducts({ vendor: slug, limit: 48 });

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,var(--color-accent-soft),transparent_45%)]" />
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="size-24 shrink-0 overflow-hidden rounded-2xl border border-line bg-canvas">
            {vendor.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vendor.logoUrl} alt={vendor.storeName} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-3xl">🏪</div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold">{vendor.storeName}</h1>
              <StatusPill status={vendor.status} />
            </div>
            {vendor.tagline ? <p className="text-base font-semibold text-accent-ink">{vendor.tagline}</p> : null}
            <p className="max-w-2xl text-sm text-ink-soft">{vendor.description}</p>
            <p className="text-xs font-semibold text-ink-soft">
              {vendor.city ?? "Worldwide"} · {catalogue.total} products · Run by {vendor.ownerName}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">Everything from {vendor.storeName}</h2>
          <Link href="/vendors" className="text-sm font-semibold text-accent-deep hover:underline">
            ← All vendors
          </Link>
        </div>
        <ProductGrid products={catalogue.items} emptyLabel="This vendor has no live listings yet." />
      </section>
    </div>
  );
}
