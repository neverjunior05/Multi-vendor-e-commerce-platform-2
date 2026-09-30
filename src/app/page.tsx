import Link from "next/link";
import { ensureSeeded } from "@/db/seed";
import { listCategories, listProducts, listVendors } from "@/lib/queries";
import { LinkButton, SectionHeading } from "@/components/ui";
import { ProductGrid } from "@/components/product-card";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSeeded();

  const [{ items: newest }, cats, vendorRows] = await Promise.all([
    listProducts({ limit: 8, sort: "newest" }),
    listCategories(),
    listVendors("approved"),
  ]);
  const deals = [...newest].sort((a, b) => (b.compareAtCents ? b.compareAtCents - b.priceCents : 0) - (a.compareAtCents ? a.compareAtCents - a.priceCents : 0)).slice(0, 4);
  const topVendors = vendorRows.slice(0, 4);

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,var(--color-accent-soft),transparent_45%),radial-gradient(circle_at_88%_12%,#e7f8f1,transparent_40%)]" />
        <div className="relative grid gap-10 px-6 py-14 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1.5 text-xs font-bold tracking-wide text-accent-ink uppercase">
              🏷️ {newest.length ? "Fresh drops every week" : "Now open"} · {vendorRows.length} workshops
            </span>
            <h1 className="mt-5 text-4xl leading-[1.05] font-extrabold sm:text-5xl lg:text-6xl">
              Many makers.
              <br />
              <span className="text-accent">One marketplace.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-ink-soft sm:text-lg">
              Bazaario puts independent ceramics, plant, leather, candle and textile workshops side by side — so you can
              fill your home from a single cart without a single shipping fee over $100.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <LinkButton href="/products" size="lg">
                Start shopping →
              </LinkButton>
              <LinkButton href="/signup" variant="outline" size="lg">
                Open a vendor store
              </LinkButton>
            </div>
            <dl className="mt-9 grid max-w-lg grid-cols-3 gap-4">
              {[
                { label: "Vendors", value: String(vendorRows.length) },
                { label: "Categories", value: String(cats.length) },
                {
                  label: "Free shipping",
                  value: "Over $100",
                },
              ].map((stat) => (
                <div key={stat.label} className="card px-4 py-3">
                  <dt className="text-[11px] font-bold tracking-[0.14em] text-ink-soft uppercase">{stat.label}</dt>
                  <dd className="font-display text-xl font-bold">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative grid grid-cols-2 gap-3 self-center">
            {newest.slice(0, 4).map((product, index) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className={`card group overflow-hidden ${index % 3 === 0 ? "translate-y-4" : ""}`}
              >
                <div className="aspect-square overflow-hidden bg-canvas">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="size-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <p className="truncate text-[11px] font-bold tracking-wide text-accent uppercase">{product.vendorName}</p>
                  <p className="truncate text-sm font-semibold">{product.title}</p>
                  <p className="font-display text-sm font-bold">{formatMoney(product.priceCents)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section>
        <SectionHeading
          eyebrow="Browse"
          title="Shop by category"
          description="Every category is stocked by multiple independent vendors — mix and match in one cart."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cats.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.slug}`}
              className="card group flex flex-col items-center gap-2 px-4 py-6 text-center transition hover:-translate-y-1 hover:border-accent/60"
            >
              <span className="text-3xl transition group-hover:scale-110">{category.emoji}</span>
              <span className="text-sm font-bold">{category.name}</span>
              <span className="text-xs text-ink-soft">{category.count} items</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Newest */}
      <section>
        <SectionHeading
          eyebrow="Just listed"
          title="New from the workshops"
          action={<LinkButton href="/products" variant="outline" size="sm">See all products</LinkButton>}
        />
        <ProductGrid products={newest} />
      </section>

      {/* Vendors */}
      <section>
        <SectionHeading
          eyebrow="The makers"
          title="Featured vendors"
          description="Each store is approved by a Bazaario admin before it can list a single product."
          action={<LinkButton href="/vendors" variant="outline" size="sm">All vendors</LinkButton>}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {topVendors.map((vendor) => (
            <Link key={vendor.id} href={`/vendors/${vendor.slug}`} className="card group overflow-hidden transition hover:-translate-y-1 hover:border-accent/60">
              <div className="aspect-16/9 overflow-hidden bg-canvas">
                {vendor.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={vendor.logoUrl} alt={vendor.storeName} className="size-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="grid size-full place-items-center text-3xl">🏪</div>
                )}
              </div>
              <div className="p-4">
                <p className="font-display font-bold">{vendor.storeName}</p>
                <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{vendor.tagline}</p>
                <p className="mt-3 text-xs font-semibold text-accent">{vendor.productCount} products · {vendor.city}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Deals */}
      <section>
        <SectionHeading eyebrow="On sale" title="Marked down this week" />
        <ProductGrid products={deals} />
      </section>

      {/* Role explainer */}
      <section className="rounded-3xl border border-line bg-surface p-8 sm:p-10">
        <SectionHeading
          eyebrow="Under the hood"
          title="Three roles, one JWT"
          description="Every API request carries a signed token with the role embedded. The middleware verifies it against the live database before anything happens."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: "🛍️", title: "Customer", points: ["Browse & filter across vendors", "Persistent cart per user", "Checkout + order history"] },
            { icon: "🧑‍🏭", title: "Vendor", points: ["Product CRUD with image upload", "Orders for their own products only", "Revenue + units sold overview"] },
            { icon: "🛡️", title: "Admin", points: ["Approve or reject vendor applications", "Moderate any product or listing", "Platform-wide GMV + user control"] },
          ].map((role) => (
            <div key={role.title} className="card p-5">
              <span className="text-2xl">{role.icon}</span>
              <p className="mt-2 font-display text-lg font-bold">{role.title}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                {role.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="text-accent">▸</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
