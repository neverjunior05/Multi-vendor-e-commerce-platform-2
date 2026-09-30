/**
 * GET /api/cart           -> the caller's cart (creates one lazily)
 * POST /api/cart          -> add item  { productId, quantity }
 * PATCH /api/cart         -> set quantity { productId, quantity } (0 = remove)
 * DELETE /api/cart        -> clear the cart
 *
 * Every branch requires an authenticated caller of ANY role — carts are
 * per-user rows in Postgres, which is what makes the cart persist across
 * devices and survive a logged-out/login cycle.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, products } from "@/db/schema";
import { HttpError, requireAuth } from "@/lib/auth";
import { created, handle, json, ok, readJson } from "@/lib/http";
import { getCart } from "@/lib/queries";

async function cartIdFor(userId: number) {
  const cart = await getCart(userId);
  return cart.id;
}

export async function GET(req: Request) {
  return handle(async () => {
    const auth = await requireAuth(req);
    return json({ cart: await getCart(auth.user.id) });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const auth = await requireAuth(req);
    const body = await readJson<{ productId?: number; quantity?: number; merge?: { productId: number; quantity: number }[] }>(req);
    const cartId = await cartIdFor(auth.user.id);

    // `merge` is used when a guest with a localStorage cart logs in.
    const incoming = body.merge ?? [{ productId: Number(body.productId), quantity: Number(body.quantity ?? 1) }];

    for (const line of incoming) {
      const productId = Number(line.productId);
      const quantity = Math.max(Math.min(Number(line.quantity) || 1, 20), 1);
      const [product] = await db
        .select({ id: products.id, stock: products.stock, status: products.status })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);
      if (!product || product.status !== "active") throw new HttpError(404, "That product is no longer available.");
      if (product.stock < 1) throw new HttpError(409, "That product is out of stock.");

      const [existing] = await db
        .select()
        .from(cartItems)
        .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
        .limit(1);

      if (existing) {
        const next = Math.min(existing.quantity + quantity, product.stock, 20);
        await db.update(cartItems).set({ quantity: next }).where(eq(cartItems.id, existing.id));
      } else {
        await db.insert(cartItems).values({ cartId, productId, quantity: Math.min(quantity, product.stock, 20) });
      }
    }

    return created({ cart: await getCart(auth.user.id) });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const auth = await requireAuth(req);
    const body = await readJson<{ productId?: number; quantity?: number }>(req);
    const cartId = await cartIdFor(auth.user.id);
    const productId = Number(body.productId);
    const quantity = Number(body.quantity);

    if (!Number.isFinite(productId)) throw new HttpError(400, "productId is required.");

    if (!Number.isFinite(quantity) || quantity <= 0) {
      await db.delete(cartItems).where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)));
    } else {
      await db
        .update(cartItems)
        .set({ quantity: Math.min(Math.round(quantity), 20) })
        .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)));
    }
    return ok({ cart: await getCart(auth.user.id) });
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const auth = await requireAuth(req);
    const url = new URL(req.url);
    const productId = Number(url.searchParams.get("productId"));
    const cartId = await cartIdFor(auth.user.id);

    if (Number.isFinite(productId) && productId > 0) {
      await db.delete(cartItems).where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)));
    } else {
      await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
    }
    return ok({ cart: await getCart(auth.user.id) });
  });
}
