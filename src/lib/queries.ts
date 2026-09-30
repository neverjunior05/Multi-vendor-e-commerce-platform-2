/**
 * Data-access layer shared by REST route handlers AND React server components.
 * Keeping queries here means the API and the SSR pages can never drift apart.
 */
import { and, asc, desc, eq, gte, ilike, inArray, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  cartItems,
  carts,
  categories,
  orderItems,
  orders,
  products,
  reviews,
  users,
  vendors,
} from "@/db/schema";

export type ProductListItem = {
  id: number;
  title: string;
  slug: string;
  priceCents: number;
  compareAtCents: number | null;
  images: string[];
  stock: number;
  attributes: Record<string, string | number | boolean | null>;
  vendorId: number;
  vendorName: string;
  vendorSlug: string;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  rating: number | null;
  reviewCount: number;
};

export type ProductFilters = {
  q?: string;
  category?: string;
  vendor?: string;
  minCents?: number;
  maxCents?: number;
  sort?: "newest" | "price-asc" | "price-desc" | "rating";
  page?: number;
  limit?: number;
};

async function ratingsFor(productIds: number[]) {
  const empty: Record<number, { rating: number | null; reviewCount: number }> = {};
  if (productIds.length === 0) return empty;
  const rows = await db
    .select({
      productId: reviews.productId,
      avg: sql<string>`avg(${reviews.rating})`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(inArray(reviews.productId, productIds))
    .groupBy(reviews.productId);
  const map = { ...empty };
  for (const row of rows) {
    map[row.productId] = { rating: Number(row.avg), reviewCount: row.count };
  }
  return map;
}

const productSelection = {
  id: products.id,
  title: products.title,
  slug: products.slug,
  description: products.description,
  priceCents: products.priceCents,
  compareAtCents: products.compareAtCents,
  images: products.images,
  stock: products.stock,
  attributes: products.attributes,
  createdAt: products.createdAt,
  vendorId: vendors.id,
  vendorName: vendors.storeName,
  vendorSlug: vendors.slug,
  categoryId: categories.id,
  categoryName: categories.name,
  categorySlug: categories.slug,
};

/** Public catalogue: only ACTIVE products from APPROVED vendors. */
export async function listProducts(filters: ProductFilters = {}) {
  const limit = Math.min(Math.max(filters.limit ?? 12, 1), 48);
  const page = Math.max(filters.page ?? 1, 1);
  const conditions: SQL[] = [eq(products.status, "active"), eq(vendors.status, "approved")];

  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(
      or(ilike(products.title, pattern), ilike(products.description, pattern), ilike(vendors.storeName, pattern))!,
    );
  }
  if (filters.category) conditions.push(eq(categories.slug, filters.category));
  if (filters.vendor) conditions.push(eq(vendors.slug, filters.vendor));
  if (typeof filters.minCents === "number") conditions.push(gte(products.priceCents, filters.minCents));
  if (typeof filters.maxCents === "number") conditions.push(lte(products.priceCents, filters.maxCents));

  const where = and(...conditions);
  const orderBy =
    filters.sort === "price-asc"
      ? asc(products.priceCents)
      : filters.sort === "price-desc"
        ? desc(products.priceCents)
        : desc(products.createdAt);

  const rows = await db
    .select(productSelection)
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(where);

  const ratings = await ratingsFor(rows.map((row) => row.id));
  const items: ProductListItem[] = rows.map((row) => ({
    ...row,
    rating: ratings[row.id]?.rating ?? null,
    reviewCount: ratings[row.id]?.reviewCount ?? 0,
  }));

  return { items, total: count, page, limit, pages: Math.max(Math.ceil(count / limit), 1) };
}

export async function getProduct(idOrSlug: string) {
  const numeric = Number(idOrSlug);
  const condition = Number.isFinite(numeric)
    ? eq(products.id, numeric)
    : eq(products.slug, idOrSlug);

  const [row] = await db
    .select(productSelection)
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(condition)
    .limit(1);

  if (!row) return null;

  const [ratings] = await db
    .select({ avg: sql<string>`avg(${reviews.rating})`, count: sql<number>`count(*)::int` })
    .from(reviews)
    .where(eq(reviews.productId, row.id));

  const productReviews = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      userName: users.name,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.productId, row.id))
    .orderBy(desc(reviews.createdAt));

  return {
    ...row,
    rating: ratings?.count ? Number(ratings.avg) : null,
    reviewCount: ratings?.count ?? 0,
    reviews: productReviews,
  };
}

export async function listCategories() {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      emoji: categories.emoji,
      count: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(
      products,
      and(eq(products.categoryId, categories.id), eq(products.status, "active")),
    )
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
  return rows;
}

export async function listVendors(status: "approved" | "all" = "approved") {
  const conditions: SQL[] = status === "approved" ? [eq(vendors.status, "approved")] : [];
  const rows = await db
    .select({
      id: vendors.id,
      storeName: vendors.storeName,
      slug: vendors.slug,
      tagline: vendors.tagline,
      city: vendors.city,
      logoUrl: vendors.logoUrl,
      status: vendors.status,
      createdAt: vendors.createdAt,
      ownerName: users.name,
      ownerEmail: users.email,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(vendors)
    .innerJoin(users, eq(vendors.userId, users.id))
    .leftJoin(products, and(eq(products.vendorId, vendors.id), ne(products.status, "removed")))
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(vendors.id, users.name, users.email)
    .orderBy(desc(vendors.createdAt));
  return rows;
}

export async function getVendorBySlug(slug: string) {
  const [vendor] = await db
    .select({
      id: vendors.id,
      storeName: vendors.storeName,
      slug: vendors.slug,
      tagline: vendors.tagline,
      description: vendors.description,
      city: vendors.city,
      logoUrl: vendors.logoUrl,
      status: vendors.status,
      ownerName: users.name,
    })
    .from(vendors)
    .innerJoin(users, eq(vendors.userId, users.id))
    .where(eq(vendors.slug, slug))
    .limit(1);
  return vendor ?? null;
}

export async function listVendorProducts(vendorId: number) {
  const rows = await db
    .select(productSelection)
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.vendorId, vendorId))
    .orderBy(desc(products.createdAt));
  const ratings = await ratingsFor(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    rating: ratings[row.id]?.rating ?? null,
    reviewCount: ratings[row.id]?.reviewCount ?? 0,
  }));
}

export async function getVendorStats(vendorId: number) {
  const [totals] = await db
    .select({
      orderCount: sql<number>`count(distinct ${orderItems.orderId})::int`,
      unitsSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
      revenueCents: sql<number>`coalesce(sum(${orderItems.unitPriceCents} * ${orderItems.quantity}), 0)::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(eq(orderItems.vendorId, vendorId), ne(orders.status, "cancelled")));

  const [counts] = await db
    .select({
      productCount: sql<number>`count(*)::int`,
      activeCount: sql<number>`count(*) filter (where ${products.status} = 'active')::int`,
      lowStock: sql<number>`count(*) filter (where ${products.stock} <= 5)::int`,
    })
    .from(products)
    .where(eq(products.vendorId, vendorId));

  return {
    orderCount: totals?.orderCount ?? 0,
    unitsSold: totals?.unitsSold ?? 0,
    revenueCents: totals?.revenueCents ?? 0,
    productCount: counts?.productCount ?? 0,
    activeCount: counts?.activeCount ?? 0,
    lowStock: counts?.lowStock ?? 0,
  };
}

export async function getVendorOrders(vendorId: number) {
  const rows = await db
    .select({
      orderItemId: orderItems.id,
      quantity: orderItems.quantity,
      unitPriceCents: orderItems.unitPriceCents,
      title: orderItems.title,
      orderId: orders.id,
      status: orders.status,
      createdAt: orders.createdAt,
      customerName: users.name,
      customerEmail: users.email,
      shipCity: orders.shipCity,
      shipCountry: orders.shipCountry,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(users, eq(orders.userId, users.id))
    .where(eq(orderItems.vendorId, vendorId))
    .orderBy(desc(orders.createdAt));
  return rows;
}

export async function getUserOrders(userId: number) {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
  if (orderRows.length === 0) return [];
  const items = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderRows.map((order) => order.id)));
  return orderRows.map((order) => ({
    ...order,
    items: items.filter((item) => item.orderId === order.id),
  }));
}

export async function getOrderDetail(orderId: number) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return { ...order, items };
}

export async function getCart(userId: number) {
  let [cart] = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
  if (!cart) {
    [cart] = await db.insert(carts).values({ userId }).returning();
  }
  const rows = await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      productId: products.id,
      title: products.title,
      priceCents: products.priceCents,
      stock: products.stock,
      images: products.images,
      vendorId: vendors.id,
      vendorName: vendors.storeName,
      vendorSlug: vendors.slug,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(eq(cartItems.cartId, cart.id))
    .orderBy(asc(cartItems.createdAt));

  const subtotalCents = rows.reduce((sum, row) => sum + row.priceCents * row.quantity, 0);
  const shippingCents = rows.length === 0 || subtotalCents >= 10_000 ? 0 : 690;
  return {
    id: cart.id,
    items: rows,
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    vendorCount: new Set(rows.map((row) => row.vendorId)).size,
  };
}

export type CartView = Awaited<ReturnType<typeof getCart>>;

export async function getAdminOverview() {
  const [[userStats], [vendorStats], [productStats], [orderStats]] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(users),
    db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${vendors.status} = 'pending')::int`,
        approved: sql<number>`count(*) filter (where ${vendors.status} = 'approved')::int`,
        rejected: sql<number>`count(*) filter (where ${vendors.status} = 'rejected')::int`,
      })
      .from(vendors),
    db
      .select({
        total: sql<number>`count(*)::int`,
        removed: sql<number>`count(*) filter (where ${products.status} = 'removed')::int`,
      })
      .from(products),
    db
      .select({
        total: sql<number>`count(*)::int`,
        gmvCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
        cancelled: sql<number>`count(*) filter (where ${orders.status} = 'cancelled')::int`,
      })
      .from(orders),
  ]);

  const [vendorRows, productRows, orderRows, userRows] = await Promise.all([
    listVendors("all"),
    db
      .select({
        id: products.id,
        title: products.title,
        priceCents: products.priceCents,
        stock: products.stock,
        status: products.status,
        images: products.images,
        vendorName: vendors.storeName,
        createdAt: products.createdAt,
      })
      .from(products)
      .innerJoin(vendors, eq(products.vendorId, vendors.id))
      .orderBy(desc(products.createdAt))
      .limit(60),
    db
      .select({
        id: orders.id,
        totalCents: orders.totalCents,
        status: orders.status,
        createdAt: orders.createdAt,
        paymentRef: orders.paymentRef,
        customerName: users.name,
        customerEmail: users.email,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt))
      .limit(40),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isBlocked: users.isBlocked,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(60),
  ]);

  return {
    stats: {
      users: userStats?.total ?? 0,
      vendors: vendorStats ?? { total: 0, pending: 0, approved: 0, rejected: 0 },
      products: productStats ?? { total: 0, removed: 0 },
      orders: orderStats ?? { total: 0, gmvCents: 0, cancelled: 0 },
    },
    vendors: vendorRows,
    products: productRows,
    orders: orderRows,
    users: userRows,
  };
}
