"use client";

/**
 * VENDOR DASHBOARD (client)
 * Loads everything it needs from GET /api/vendors/me, then talks to
 * POST/PUT/DELETE /api/products for CRUD and PATCH /api/orders?id=&status=
 * for fulfilment. Images are uploaded through POST /api/uploads (vendor-only).
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Alert, Button, Card, Chip, EmptyState, Field, Input, LinkButton, Select, Spinner, Stat, StatusPill, Textarea } from "@/components/ui";
import { api, apiErrorMessage } from "@/lib/api-client";
import { formatDate, formatMoney } from "@/lib/format";
import type { ApiProduct, Role, VendorProfile } from "@/lib/types";

type Stats = {
  orderCount: number;
  unitsSold: number;
  revenueCents: number;
  productCount: number;
  activeCount: number;
  lowStock: number;
};

type VendorOrderRow = {
  orderItemId: number;
  quantity: number;
  unitPriceCents: number;
  title: string;
  orderId: number;
  status: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  shipCity: string;
  shipCountry: string;
};

type Category = { id: number; name: string; slug: string; emoji: string };

type Draft = {
  id?: number;
  title: string;
  description: string;
  price: string;
  compareAt: string;
  stock: string;
  categorySlug: string;
  status: "active" | "draft";
  images: string[];
};

const EMPTY_DRAFT: Draft = {
  title: "",
  description: "",
  price: "",
  compareAt: "",
  stock: "10",
  categorySlug: "",
  status: "active",
  images: [],
};

export function VendorDashboard() {
  const { user, ready, vendor, refresh } = useAuth();
  const [tab, setTab] = useState<"overview" | "products" | "orders">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [orders, setOrders] = useState<VendorOrderRow[]>([]);
  const [store, setStore] = useState<VendorProfile | null>(null);
  const [role, setRole] = useState<Role>("customer");
  const [categories, setCategories] = useState<Category[]>([]);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [application, setApplication] = useState({ storeName: "", tagline: "", city: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{
        vendor: VendorProfile | null;
        role: Role;
        stats: Stats;
        products: ApiProduct[];
        orders: VendorOrderRow[];
      }>("/vendors/me");
      setStore(data.vendor);
      setRole(data.role);
      setStats(data.stats);
      setProducts(data.products);
      setOrders(data.orders);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err));
      setStore(null);
      setStats(null);
      setProducts([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (user && (user.role === "vendor" || user.role === "admin")) void load();
    else setLoading(false);
    api.get<{ items: Category[] }>("/categories").then(({ data }) => setCategories(data.items)).catch(() => null);
  }, [ready, user, load]);

  const startCreate = () => setDraft({ ...EMPTY_DRAFT, categorySlug: categories[0]?.slug ?? "" });
  const startEdit = (product: ApiProduct) =>
    setDraft({
      id: product.id,
      title: product.title,
      description: product.description ?? "",
      price: (product.priceCents / 100).toFixed(2),
      compareAt: product.compareAtCents ? (product.compareAtCents / 100).toFixed(2) : "",
      stock: String(product.stock),
      categorySlug: product.categorySlug ?? "",
      status: product.status === "draft" ? "draft" : "active",
      images: product.images ?? [],
    });

  const saveDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError(null);
    const payload = {
      title: draft.title,
      description: draft.description,
      price: Number(draft.price),
      compareAt: draft.compareAt ? Number(draft.compareAt) : null,
      stock: Number(draft.stock),
      categorySlug: draft.categorySlug || undefined,
      images: draft.images,
      status: draft.status,
    };
    try {
      if (draft.id) await api.put(`/products/${draft.id}`, payload);
      else await api.post("/products", payload);
      setDraft(null);
      setNotice(draft.id ? "Product updated." : "Product published.");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await api.post<{ url: string }>("/uploads", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDraft((current) => (current ? { ...current, images: [...current.images, data.url].slice(0, 6) } : current));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const advance = async (orderId: number, status: string) => {
    try {
      await api.patch(`/orders?id=${orderId}&status=${status}`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const applyForStore = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/vendors", application);
      await refresh();
      await load();
      setNotice("Application submitted — an admin will review it.");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const revenuePerOrder = useMemo(() => {
    if (!stats || stats.orderCount === 0) return 0;
    return Math.round(stats.revenueCents / stats.orderCount);
  }, [stats]);

  if (!ready) return <div className="card grid place-items-center py-24"><Spinner className="size-6 text-accent" /></div>;

  if (!user) {
    return (
      <EmptyState icon="🔐" title="Sign in as a vendor" description="Vendor tools are behind the vendor role check."
        action={<LinkButton href="/login?next=/vendor" size="lg">Sign in</LinkButton>} />
    );
  }

  if (user.role === "customer" || !store) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-3xl font-extrabold">Open your store</h1>
        <p className="text-sm text-ink-soft">
          Submit an application. An admin reviews it in the admin panel; until it&apos;s approved, the product API will
          reject writes with a 403.
        </p>
        <form onSubmit={applyForStore} className="card space-y-4 p-5">
          <Field label="Store name">
            <Input required value={application.storeName} onChange={(e) => setApplication({ ...application, storeName: e.target.value })} />
          </Field>
          <Field label="Tagline">
            <Input value={application.tagline} onChange={(e) => setApplication({ ...application, tagline: e.target.value })} />
          </Field>
          <Field label="City">
            <Input value={application.city} onChange={(e) => setApplication({ ...application, city: e.target.value })} />
          </Field>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Button type="submit" disabled={saving}>{saving ? "Submitting…" : "Submit application"}</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-accent uppercase">Vendor dashboard</p>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 text-3xl font-extrabold">
            {store.storeName} <StatusPill status={store.status} />
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {store.tagline} · signed in as {user.email} ({role})
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/vendors/${store.slug}`} variant="outline" size="sm">View storefront</LinkButton>
          <Button onClick={startCreate} size="sm">+ New product</Button>
        </div>
      </header>

      {store.status !== "approved" ? (
        <Alert tone="warn">
          Your application is <strong>{store.status}</strong>. You can browse the dashboard, but{" "}
          <code>POST /api/products</code> will return 403 until an admin approves the store.
        </Alert>
      ) : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="flex gap-2">
        {(["overview", "products", "orders"] as const).map((value) => (
          <Chip key={value} active={tab === value} onClick={() => setTab(value)}>
            {value === "overview" ? "Sales overview" : value === "products" ? `Products (${products.length})` : `Orders (${orders.length})`}
          </Chip>
        ))}
      </div>

      {loading ? (
        <Card className="grid place-items-center py-20"><Spinner className="size-6 text-accent" /></Card>
      ) : tab === "overview" && stats ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Revenue" value={formatMoney(stats.revenueCents)} sub={`${stats.orderCount} orders`} />
            <Stat label="Units sold" value={String(stats.unitsSold)} sub={`avg ${formatMoney(revenuePerOrder)} / order`} tone="success" />
            <Stat label="Listings" value={String(stats.productCount)} sub={`${stats.activeCount} active`} />
            <Stat label="Low stock" value={String(stats.lowStock)} sub="5 or fewer units" tone={stats.lowStock > 0 ? "warn" : "accent"} />
          </div>
          <Card className="p-5">
            <h2 className="font-display text-lg font-bold">Recent orders containing your products</h2>
            <ul className="mt-3 divide-y divide-line text-sm">
              {orders.slice(0, 6).map((order) => (
                <li key={order.orderItemId} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="font-semibold">#{order.orderId} · {order.title}</span>
                  <span className="text-ink-soft">{order.customerName} · {order.shipCity}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-display font-bold">{formatMoney(order.unitPriceCents * order.quantity)}</span>
                    <StatusPill status={order.status} />
                  </span>
                </li>
              ))}
              {orders.length === 0 ? <li className="py-6 text-center text-ink-soft">No orders yet.</li> : null}
            </ul>
          </Card>
        </div>
      ) : tab === "products" ? (
        <div className="space-y-4">
          {draft ? (
            <form onSubmit={saveDraft} className="card animate-rise space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">{draft.id ? `Edit product #${draft.id}` : "New product"}</h2>
                <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(null)}>Cancel</Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title">
                  <Input required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                </Field>
                <Field label="Category">
                  <Select value={draft.categorySlug} onChange={(e) => setDraft({ ...draft, categorySlug: e.target.value })}>
                    <option value="">Uncategorised</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.slug}>{category.emoji} {category.name}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Description">
                <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-4">
                <Field label="Price (USD)">
                  <Input required type="number" step="0.01" min="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
                </Field>
                <Field label="Compare at">
                  <Input type="number" step="0.01" min="0" value={draft.compareAt} onChange={(e) => setDraft({ ...draft, compareAt: e.target.value })} />
                </Field>
                <Field label="Stock">
                  <Input required type="number" min="0" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
                </Field>
                <Field label="Status">
                  <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as "active" | "draft" })}>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                  </Select>
                </Field>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Images</p>
                <div className="flex flex-wrap items-center gap-3">
                  {draft.images.map((image) => (
                    <div key={image} className="relative size-20 overflow-hidden rounded-xl border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt="" className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, images: draft.images.filter((value) => value !== image) })}
                        className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-danger text-[10px] font-bold text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <label className="grid size-20 cursor-pointer place-items-center rounded-xl border border-dashed border-line text-xs text-ink-soft hover:border-accent hover:text-accent-deep">
                    {uploading ? <Spinner /> : "+ Upload"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void upload(file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-ink-soft">JPG/PNG/WEBP up to 4MB · first image is the cover.</p>
              </div>

              <Button type="submit" disabled={saving}>{saving ? "Saving…" : draft.id ? "Save changes" : "Publish product"}</Button>
            </form>
          ) : null}

          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-canvas text-left text-xs tracking-wide text-ink-soft uppercase">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-canvas">
                          {product.images?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.images[0]} alt="" className="size-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{product.title}</p>
                          <p className="text-xs text-ink-soft">{product.categoryName ?? "Uncategorised"} · {formatDate(product.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatMoney(product.priceCents)}</td>
                    <td className={`px-4 py-3 font-semibold ${product.stock <= 5 ? "text-warn" : ""}`}>{product.stock}</td>
                    <td className="px-4 py-3"><StatusPill status={product.status} /></td>
                    <td className="px-4 py-3 text-ink-soft">{product.rating ? `${product.rating.toFixed(1)} ★` : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEdit(product)}>Edit</Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={async () => {
                            await api.delete(`/products/${product.id}`).catch(() => null);
                            await load();
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-ink-soft">
                      No listings yet — create your first product.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Card>
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas text-left text-xs tracking-wide text-ink-soft uppercase">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.orderItemId}>
                  <td className="px-4 py-3">
                    <Link href={`/orders/${order.orderId}`} className="font-semibold hover:text-accent-deep">#{order.orderId}</Link>
                    <p className="text-xs text-ink-soft">{formatDate(order.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{order.customerName}</p>
                    <p className="text-xs text-ink-soft">{order.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{order.title}</p>
                    <p className="text-xs text-ink-soft">×{order.quantity}</p>
                  </td>
                  <td className="px-4 py-3 font-display font-bold">{formatMoney(order.unitPriceCents * order.quantity)}</td>
                  <td className="px-4 py-3"><StatusPill status={order.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {order.status === "paid" ? (
                        <Button size="sm" onClick={() => void advance(order.orderId, "shipped")}>Mark shipped</Button>
                      ) : null}
                      {order.status === "shipped" ? (
                        <Button size="sm" variant="success" onClick={() => void advance(order.orderId, "delivered")}>Mark delivered</Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-soft">No orders containing your products yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
