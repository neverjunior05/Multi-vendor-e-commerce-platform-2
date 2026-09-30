import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureSeeded } from "@/db/seed";
import { getProduct, listProducts } from "@/lib/queries";
import { ProductGrid } from "@/components/product-card";
import { BuyBox, ReviewSection } from "./detail-client";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureSeeded();
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const related = await listProducts({ category: product.categorySlug ?? undefined, limit: 8 });
  const others = related.items.filter((item) => item.id !== product.id).slice(0, 4);

  return (
    <div className="space-y-14">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
        <Link href="/products" className="hover:text-accent-deep">Shop</Link>
        {product.categorySlug ? (
          <>
            <span>/</span>
            <Link href={`/products?category=${product.categorySlug}`} className="hover:text-accent-deep">
              {product.categoryName}
            </Link>
          </>
        ) : null}
        <span>/</span>
        <span className="font-semibold text-ink">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3">
          <div className="card aspect-square overflow-hidden bg-canvas">
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0]} alt={product.title} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-6xl">🧺</div>
            )}
          </div>
          {product.images.length > 1 ? (
            <div className="grid grid-cols-4 gap-3">
              {product.images.slice(1, 5).map((image) => (
                <div key={image} className="card aspect-square overflow-hidden bg-canvas">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt={product.title} className="size-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div>
            <Link
              href={`/vendors/${product.vendorSlug}`}
              className="text-xs font-bold tracking-[0.16em] text-accent uppercase hover:underline"
            >
              {product.vendorName}
            </Link>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{product.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{product.description}</p>
          </div>

          <BuyBox productId={product.id} priceCents={product.priceCents} compareAtCents={product.compareAtCents} stock={product.stock} />

          <div className="card divide-y divide-line">
            <p className="px-5 py-3 text-xs font-bold tracking-[0.16em] text-ink-soft uppercase">Specifications</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 text-sm">
              <div>
                <dt className="text-xs text-ink-soft">Category</dt>
                <dd className="font-semibold">{product.categoryName ?? "Uncategorised"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Vendor</dt>
                <dd className="font-semibold">{product.vendorName}</dd>
              </div>
              {Object.entries(product.attributes ?? {}).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs text-ink-soft">{key}</dt>
                  <dd className="font-semibold">
                    {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <ReviewSection productId={product.id} reviews={product.reviews} rating={product.rating} reviewCount={product.reviewCount} />

      {others.length > 0 ? (
        <section>
          <h2 className="mb-5 font-display text-2xl font-bold">More in {product.categoryName ?? "the marketplace"}</h2>
          <ProductGrid products={others} />
        </section>
      ) : null}
    </div>
  );
}
