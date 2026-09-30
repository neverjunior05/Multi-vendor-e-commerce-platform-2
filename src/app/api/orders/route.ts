/**
 * POST /api/orders          -> CUSTOMER: checkout (address + sandbox payment)
 * GET  /api/orders?scope=vendor -> VENDOR: order lines containing MY products
 * GET  /api/orders          -> CUSTOMER: my order history
 *
 * The whole checkout runs inside a transaction: stock is decremented, the order
 * and its line items are inserted, and the cart is emptied. If any step fails
 * (e.g. someone else bought the last item first) nothing is written.
 */
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, carts, orderItems, orders, products } from "@/db/schema";
import { HttpError, requireAuth } from "@/lib/auth";
import { created, handle, json, readJson, requireFields } from "@/lib/http";
import { chargeCard } from "@/lib/payments";
import { getCart, getOrderDetail, getUserOrders, getVendorOrders } from "@/lib/queries";

type CheckoutBody = {
  shipName?: string;
  shipPhone?: string;
  shipLine1?: string;
  shipCity?: string;
  shipPostal?: string;
  shipCountry?: string;
  note?: string;
  cardNumber?: string;
  expMonth?: number;
  expYear?: number;
  cvc?: string;
};

export async function POST(req: Request) {
  return handle(async () => {
    const auth = await requireAuth(req, ["customer", "vendor", "admin"]);
    const body = await readJson<CheckoutBody>(req);
    requireFields(body, ["shipName", "shipLine1", "shipCity", "shipPostal", "shipCountry", "cardNumber"]);

    const cart = await getCart(auth.user.id);
    if (cart.items.length === 0) throw new HttpError(400, "Your cart is empty.");

    // Re-check stock at the moment of purchase (never trust the client cart).
    const stockRows = await db
      .select({ id: products.id, stock: products.stock, status: products.status, title: products.title })
      .from(products)
      .where(inArray(products.id, cart.items.map((item) => item.productId)));
    for (const item of cart.items) {
      const row = stockRows.find((candidate) => candidate.id === item.productId);
      if (!row || row.status !== "active") throw new HttpError(409, `${item.title} is no longer available.`);
      if (row.stock < item.quantity) throw new HttpError(409, `Only ${row.stock} left of ${item.title}.`);
    }

    // --- SANDBOX PAYMENT (test mode, no real money ever moves) ---
    const payment = await chargeCard({
      amountCents: cart.totalCents,
      cardNumber: String(body.cardNumber),
      expMonth: body.expMonth,
      expYear: body.expYear,
      cvc: body.cvc,
      name: body.shipName,
    });
    if (!payment.ok) throw new HttpError(402, payment.error);

    const order = await db.transaction(async (tx) => {
      const [createdOrder] = await tx
        .insert(orders)
        .values({
          userId: auth.user.id,
          status: "paid",
          subtotalCents: cart.subtotalCents,
          shippingCents: cart.shippingCents,
          totalCents: cart.totalCents,
          shipName: String(body.shipName),
          shipPhone: body.shipPhone ? String(body.shipPhone) : "",
          shipLine1: String(body.shipLine1),
          shipCity: String(body.shipCity),
          shipPostal: String(body.shipPostal),
          shipCountry: String(body.shipCountry),
          note: body.note ? String(body.note) : null,
          paymentRef: payment.reference,
          paymentBrand: payment.brand,
          paidAt: new Date(),
        })
        .returning();

      for (const item of cart.items) {
        await tx.insert(orderItems).values({
          orderId: createdOrder.id,
          productId: item.productId,
          vendorId: item.vendorId,
          title: item.title,
          image: item.images[0] ?? null,
          unitPriceCents: item.priceCents,
          quantity: item.quantity,
        });
        await tx
          .update(products)
          .set({ stock: sql`greatest(${products.stock} - ${item.quantity}, 0)` })
          .where(eq(products.id, item.productId));
      }

      const [cartRow] = await tx.select().from(carts).where(eq(carts.userId, auth.user.id)).limit(1);
      if (cartRow) await tx.delete(cartItems).where(eq(cartItems.cartId, cartRow.id));

      return createdOrder;
    });

    const detail = await getOrderDetail(order.id);
    return created({ order: detail, paymentProvider: payment.provider });
  });
}

export async function GET(req: Request) {
  return handle(async () => {
    const auth = await requireAuth(req);
    const scope = new URL(req.url).searchParams.get("scope");

    // Vendors see only the order lines that contain their own products.
    if (scope === "vendor") {
      if (auth.user.role !== "vendor" && auth.user.role !== "admin") {
        throw new HttpError(403, "Only vendors can view the seller order feed.");
      }
      if (!auth.vendor) return json({ items: [] });
      return json({ items: await getVendorOrders(auth.vendor.id) });
    }

    return json({ items: await getUserOrders(auth.user.id) });
  });
}

/**
 * PATCH /api/orders?id=1&status=shipped
 * Vendors advance fulfilment for orders containing their products.
 * Admins may cancel any order. Nobody else can touch an order.
 */
export async function PATCH(req: Request) {
  return handle(async () => {
    const auth = await requireAuth(req, ["vendor", "admin"]);
    const url = new URL(req.url);
    const orderId = Number(url.searchParams.get("id"));
    const status = url.searchParams.get("status") as "shipped" | "delivered" | "cancelled" | undefined;
    if (!Number.isFinite(orderId) || !status) throw new HttpError(400, "id and status are required.");
    if (status === "cancelled" && auth.user.role !== "admin") {
      throw new HttpError(403, "Only an administrator can cancel an order.");
    }

    const lines = await db
      .select({ vendorId: orderItems.vendorId })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    if (lines.length === 0) throw new HttpError(404, "Order not found.");

    if (auth.user.role !== "admin") {
      const ownsLine = auth.vendor ? lines.some((line) => line.vendorId === auth.vendor!.id) : false;
      if (!ownsLine) throw new HttpError(403, "That order does not contain your products.");
    }

    await db.update(orders).set({ status }).where(eq(orders.id, orderId));

    // Restock when an admin cancels.
    if (status === "cancelled") {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const item of items) {
        if (item.productId) {
          await db
            .update(products)
            .set({ stock: sql`${products.stock} + ${item.quantity}` })
            .where(and(eq(products.id, item.productId), ne(products.status, "removed")));
        }
      }
    }

    return json({ order: await getOrderDetail(orderId) });
  });
}
