"use client";

/**
 * ADMIN PANEL (client)
 * Reads GET /api/admin/overview (admin-only route) and performs moderation:
 *  - PATCH /api/vendors   -> approve / reject vendor applications
 *  - DELETE /api/products/:id -> remove any listing
 *  - PATCH /api/admin/users   -> block / unblock accounts
 *  - PATCH /api/orders?id=&status=cancelled -> cancel + restock
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Alert, Button, Card, Chip, EmptyState, LinkButton, Spinner, Stat, StatusPill } from "@/components/ui";
import { api, apiErrorMessage } from "@/lib/api-client";
import { formatDate, formatMoney } from "@/lib/format";
import type { Role } from "@/lib/types";

type Overview = {
  stats: {
    users: number;
    vendors: { total: number; pending: number; approved: number; rejected: number };
    products: { total: number; removed: number };
    orders: { total: number; gmvCents: number; cancelled: number };
  };
  vendors: {
    id: number;
    storeName: string;
    slug: string;
    status: string;
    city: string | null;
    tagline: string | null;
    ownerName: string;
    ownerEmail: string;
    productCount: number;
    createdAt: string;
  }[];
  products: {
    id: number;
    title: string;
    priceCents: number;
    stock: number;
    status: string;
    images: string[];
    vendorName: string;
    createdAt: string;
  }[];
  orders: {
    id: number;
    totalCents: number;
    status: string;
    createdAt: string;
    paymentRef: string;
    customerName: string;
    customerEmail: string;
  }[];
  users: { id: number; name: string; email: string; role: Role; isBlocked: boolean; createdAt: string }[];
};

export function AdminPanel() {
  const { user, ready } = useAuth();
  const [tab, setTab] = useState<"vendors" | "products" | "orders" | "users">("vendors");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<Overview>("/admin/overview");
      setData(response.data);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (user?.role === "admin") void load();
    else setLoading(false);
  }, [ready, user, load]);

  const reviewVendor = async (vendorId: number, status: "approved" | "rejected") => {
    try {
      await api.patch("/vendors", { vendorId, status });
      setNotice(`Vendor ${status}.`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      await api.delete(`/products/${productId}`);
      setNotice("Listing removed from the catalogue.");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const cancelOrder = async (orderId: number) => {
    try {
      await api.patch(`/orders?id=${orderId}&status=cancelled`);
      setNotice(`Order #${orderId} cancelled and stock restored.`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const toggleBlock = async (userId: number, isBlocked: boolean) => {
    try {
      await api.patch("/admin/users", { userId, isBlocked });
      setNotice(isBlocked ? "Account suspended." : "Account reinstated.");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  if (!ready) return <div className="card grid place-items-center py-24"><Spinner className="size-6 text-accent" /></div>;

  if (!user || user.role !== "admin") {
    return (
      <EmptyState
        icon="🛡️"
        title="Admins only"
        description="This panel is protected by requireAuth(req, ['admin']). Sign in with admin@bazaario.dev to explore it."
        action={<LinkButton href="/login?next=/admin" size="lg">Sign in as admin</LinkButton>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold tracking-[0.18em] text-accent uppercase">Admin panel</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Platform moderation</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Signed in as {user.email}. Every action here hits a route guarded with{" "}
          <code className="rounded bg-canvas px-1">requireAuth(req, [&quot;admin&quot;])</code>.
        </p>
      </header>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {loading || !data ? (
        <Card className="grid place-items-center py-20"><Spinner className="size-6 text-accent" /></Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Platform GMV" value={formatMoney(data.stats.orders.gmvCents)} sub={`${data.stats.orders.total} orders`} />
            <Stat
              label="Vendor applications"
              value={`${data.stats.vendors.approved}/${data.stats.vendors.total}`}
              sub={`${data.stats.vendors.pending} pending · ${data.stats.vendors.rejected} rejected`}
              tone={data.stats.vendors.pending > 0 ? "warn" : "success"}
            />
            <Stat label="Listings" value={String(data.stats.products.total)} sub={`${data.stats.products.removed} removed`} />
            <Stat label="Accounts" value={String(data.stats.users)} sub={`${data.stats.orders.cancelled} cancelled orders`} tone="danger" />
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              ["vendors", `Vendors (${data.vendors.length})`],
              ["products", `Products (${data.products.length})`],
              ["orders", `Orders (${data.orders.length})`],
              ["users", `Users (${data.users.length})`],
            ] as const).map(([value, label]) => (
              <Chip key={value} active={tab === value} onClick={() => setTab(value)}>
                {label}
              </Chip>
            ))}
          </div>

          {tab === "vendors" ? (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-canvas text-left text-xs tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th className="px-4 py-3">Store</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Listings</th>
                    <th className="px-4 py-3">Applied</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.vendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td className="px-4 py-3">
                        <Link href={`/vendors/${vendor.slug}`} className="font-semibold hover:text-accent-deep">{vendor.storeName}</Link>
                        <p className="text-xs text-ink-soft">{vendor.city ?? "—"} · {vendor.tagline}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{vendor.ownerName}</p>
                        <p className="text-xs text-ink-soft">{vendor.ownerEmail}</p>
                      </td>
                      <td className="px-4 py-3">{vendor.productCount}</td>
                      <td className="px-4 py-3 text-ink-soft">{formatDate(vendor.createdAt)}</td>
                      <td className="px-4 py-3"><StatusPill status={vendor.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {vendor.status !== "approved" ? (
                            <Button size="sm" variant="success" onClick={() => void reviewVendor(vendor.id, "approved")}>Approve</Button>
                          ) : null}
                          {vendor.status !== "rejected" ? (
                            <Button size="sm" variant="danger" onClick={() => void reviewVendor(vendor.id, "rejected")}>Reject</Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : tab === "products" ? (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-canvas text-left text-xs tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-canvas">
                            {product.images?.[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={product.images[0]} alt="" className="size-full object-cover" />
                            ) : null}
                          </div>
                          <Link href={`/products/${product.id}`} className="font-semibold hover:text-accent-deep">{product.title}</Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{product.vendorName}</td>
                      <td className="px-4 py-3 font-semibold">{formatMoney(product.priceCents)}</td>
                      <td className="px-4 py-3">{product.stock}</td>
                      <td className="px-4 py-3"><StatusPill status={product.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          {product.status !== "removed" ? (
                            <Button size="sm" variant="danger" onClick={() => void removeProduct(product.id)}>Remove</Button>
                          ) : (
                            <span className="text-xs text-ink-soft">Removed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : tab === "orders" ? (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-canvas text-left text-xs tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Payment ref</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3">
                        <Link href={`/orders/${order.id}`} className="font-semibold hover:text-accent-deep">#{order.id}</Link>
                        <p className="text-xs text-ink-soft">{formatDate(order.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{order.customerName}</p>
                        <p className="text-xs text-ink-soft">{order.customerEmail}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-soft">{order.paymentRef}</td>
                      <td className="px-4 py-3 font-display font-bold">{formatMoney(order.totalCents)}</td>
                      <td className="px-4 py-3"><StatusPill status={order.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {order.status !== "cancelled" ? (
                          <Button size="sm" variant="danger" onClick={() => void cancelOrder(order.id)}>Cancel</Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-canvas text-left text-xs tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.users.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{row.name}</p>
                        <p className="text-xs text-ink-soft">{row.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent-ink uppercase">{row.role}</span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        {row.isBlocked ? <StatusPill status="cancelled" /> : <StatusPill status="active" />}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.id === user.id ? (
                          <span className="text-xs text-ink-soft">That&apos;s you</span>
                        ) : (
                          <Button size="sm" variant={row.isBlocked ? "success" : "outline"} onClick={() => void toggleBlock(row.id, !row.isBlocked)}>
                            {row.isBlocked ? "Unblock" : "Block"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
