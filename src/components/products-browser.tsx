"use client";

/**
 * Customer catalogue: search + category + price filters, driven by the
 * `GET /api/products` REST endpoint with URL state so filters are shareable.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, apiErrorMessage } from "@/lib/api-client";
import { Chip, Input, Select, Spinner, Alert, buttonClass } from "@/components/ui";
import { ProductGrid } from "@/components/product-card";
import { formatMoney } from "@/lib/format";
import type { ApiProduct } from "@/lib/types";

type Category = { id: number; name: string; slug: string; emoji: string; count: number };

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

const PRICE_BANDS = [
  { label: "Any price", min: "", max: "" },
  { label: "Under $25", min: "", max: "2500" },
  { label: "$25 – $60", min: "2500", max: "6000" },
  { label: "$60 – $120", min: "6000", max: "12000" },
  { label: "$120+", min: "12000", max: "" },
];

export function ProductsBrowser() {
  const router = useRouter();
  const params = useSearchParams();

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      q: params.get("q") ?? "",
      category: params.get("category") ?? "",
      min: params.get("min") ?? "",
      max: params.get("max") ?? "",
      sort: params.get("sort") ?? "newest",
      page: Number(params.get("page") ?? 1),
    }),
    [params],
  );

  const setParams = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      next.delete("page");
      router.push(`/products?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  const setParam = useCallback((key: string, value: string) => setParams({ [key]: value }), [setParams]);

  useEffect(() => {
    api
      .get<{ items: Category[] }>("/categories")
      .then(({ data }) => setCategories(data.items))
      .catch(() => null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const search = new URLSearchParams();
    if (query.q) search.set("q", query.q);
    if (query.category) search.set("category", query.category);
    if (query.min) search.set("min", query.min);
    if (query.max) search.set("max", query.max);
    search.set("sort", query.sort);
    search.set("page", String(query.page));
    search.set("limit", "12");

    api
      .get<{ items: ApiProduct[]; total: number; pages: number }>(`/products?${search.toString()}`)
      .then(({ data }) => {
        if (cancelled) return;
        setProducts(data.items);
        setTotal(data.total);
        setPages(data.pages);
        setPage(query.page);
        setError(null);
      })
      .catch((err) => !cancelled && setError(apiErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [query]);

  const activeCategory = categories.find((category) => category.slug === query.category);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-bold tracking-[0.18em] text-accent uppercase">Catalogue</p>
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          {query.q ? `“${query.q}”` : activeCategory ? activeCategory.name : "Every product on Bazaario"}
        </h1>
        <p className="text-sm text-ink-soft">
          {loading ? "Loading…" : `${total} product${total === 1 ? "" : "s"} from independent, admin-approved vendors.`}
        </p>
      </header>

      <div className="card space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={!query.category} onClick={() => setParam("category", "")}>
            All
          </Chip>
          {categories.map((category) => (
            <Chip
              key={category.id}
              active={query.category === category.slug}
              onClick={() => setParam("category", category.slug)}
            >
              {category.emoji} {category.name}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {PRICE_BANDS.map((band) => {
            const active = query.min === band.min && query.max === band.max;
            return (
              <Chip
                key={band.label}
                active={active}
                onClick={() => setParams({ min: band.min, max: band.max })}
              >
                {band.label}
              </Chip>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <Input
              type="number"
              min={0}
              placeholder="Min $"
              defaultValue={query.min ? Number(query.min) / 100 : ""}
              onBlur={(event) =>
                setParams({
                  min: event.target.value ? String(Math.round(Number(event.target.value) * 100)) : "",
                })
              }
              className="h-9 w-24"
            />
            <Input
              type="number"
              min={0}
              placeholder="Max $"
              defaultValue={query.max ? Number(query.max) / 100 : ""}
              onBlur={(event) =>
                setParams({
                  max: event.target.value ? String(Math.round(Number(event.target.value) * 100)) : "",
                })
              }
              className="h-9 w-24"
            />
            <Select value={query.sort} onChange={(event) => setParam("sort", event.target.value)} className="h-9 w-48">
              {SORTS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {loading ? (
        <div className="card grid place-items-center py-20 text-ink-soft">
          <Spinner className="size-6 text-accent" />
        </div>
      ) : (
        <>
          <ProductGrid products={products} emptyLabel="Nothing here yet — try widening the price range or clearing the search." />

          {pages > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                disabled={page <= 1}
                onClick={() => setParam("page", String(page - 1))}
                className={buttonClass("outline", "sm")}
              >
                ← Previous
              </button>
              <span className="px-3 text-sm font-semibold text-ink-soft">
                Page {page} of {pages}
              </span>
              <button
                disabled={page >= pages}
                onClick={() => setParam("page", String(page + 1))}
                className={buttonClass("outline", "sm")}
              >
                Next →
              </button>
            </div>
          ) : null}
        </>
      )}

      <p className="text-center text-xs text-ink-soft">
        Prices shown in USD · free shipping over {formatMoney(10000)}
      </p>
    </div>
  );
}
