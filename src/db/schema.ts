/**
 * Bazaario database schema (PostgreSQL + Drizzle ORM)
 * ---------------------------------------------------
 * Models: User, Vendor, Category, Product, Review, Cart, CartItem, Order, OrderItem
 *
 * Money is always stored as integer cents to avoid floating point rounding bugs.
 * Product `attributes` is a JSONB column so each vendor can attach completely
 * different specs (ceramics -> "material", plants -> "light needs", etc.)
 * without a migration — the "flexible schema" requirement.
 */
import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["customer", "vendor", "admin"]);
export const vendorStatusEnum = pgEnum("vendor_status", ["pending", "approved", "rejected"]);
export const productStatusEnum = pgEnum("product_status", ["active", "draft", "removed"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
]);

export type ProductAttributes = Record<string, string | number | boolean | null>;

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 180 }).notNull().unique(),
    // bcrypt hash — the plaintext password is never stored anywhere.
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("customer"),
    phone: varchar("phone", { length: 40 }),
    isBlocked: boolean("is_blocked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("users_role_idx").on(table.role)],
);

export const vendors = pgTable(
  "vendors",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storeName: varchar("store_name", { length: 140 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    tagline: varchar("tagline", { length: 200 }),
    description: text("description"),
    city: varchar("city", { length: 120 }),
    logoUrl: text("logo_url"),
    // Admin moderation gate: only `approved` vendors may publish products.
    status: vendorStatusEnum("status").notNull().default("pending"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("vendors_user_id_unique").on(table.userId)],
);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  emoji: varchar("emoji", { length: 12 }).notNull().default("🛍️"),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    title: varchar("title", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    compareAtCents: integer("compare_at_cents"),
    stock: integer("stock").notNull().default(0),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    attributes: jsonb("attributes").$type<ProductAttributes>().notNull().default({}),
    status: productStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("products_vendor_idx").on(table.vendorId),
    index("products_category_idx").on(table.categoryId),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("reviews_product_user_unique").on(table.productId, table.userId)],
);

export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    cartId: integer("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("cart_items_cart_product_unique").on(table.cartId, table.productId)],
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: orderStatusEnum("status").notNull().default("paid"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    // Shipping address snapshot (an order must not change if the user edits their profile).
    shipName: varchar("ship_name", { length: 140 }).notNull(),
    shipPhone: varchar("ship_phone", { length: 40 }).notNull().default(""),
    shipLine1: varchar("ship_line1", { length: 200 }).notNull(),
    shipCity: varchar("ship_city", { length: 120 }).notNull(),
    shipPostal: varchar("ship_postal", { length: 40 }).notNull(),
    shipCountry: varchar("ship_country", { length: 120 }).notNull(),
    note: text("note"),
    // Sandbox payment reference (looks like `pi_sandbox_...`).
    paymentRef: varchar("payment_ref", { length: 80 }).notNull(),
    paymentBrand: varchar("payment_brand", { length: 40 }).notNull().default("visa"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("orders_user_idx").on(table.userId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    // Denormalised vendorId makes "orders for MY products" a single indexed query.
    vendorId: integer("vendor_id").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    image: text("image"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    index("order_items_order_idx").on(table.orderId),
    index("order_items_vendor_idx").on(table.vendorId),
  ],
);

/* ------------------------------ relations ------------------------------ */

export const usersRelations = relations(users, ({ one, many }) => ({
  vendor: one(vendors, { fields: [users.id], references: [vendors.userId] }),
  orders: many(orders),
  reviews: many(reviews),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  user: one(users, { fields: [vendors.userId], references: [users.id] }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  vendor: one(vendors, { fields: [products.vendorId], references: [vendors.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  reviews: many(reviews),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export type User = typeof users.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Review = typeof reviews.$inferSelect;
