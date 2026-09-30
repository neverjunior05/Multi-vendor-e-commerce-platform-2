/**
 * POST /api/reviews -> CUSTOMER (any signed-in user) reviews a product.
 * One review per user per product (upsert on the unique constraint).
 */
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { HttpError, requireAuth } from "@/lib/auth";
import { created, handle, readJson, requireFields } from "@/lib/http";

export async function POST(req: Request) {
  return handle(async () => {
    const auth = await requireAuth(req);
    const body = await readJson<{ productId?: number; rating?: number; comment?: string }>(req);
    requireFields(body, ["productId", "rating"]);

    const productId = Number(body.productId);
    const rating = Math.min(Math.max(Math.round(Number(body.rating)), 1), 5);
    if (!Number.isFinite(productId)) throw new HttpError(400, "productId is required.");

    const [row] = await db
      .insert(reviews)
      .values({ productId, userId: auth.user.id, rating, comment: body.comment?.trim() ?? "" })
      .onConflictDoUpdate({
        target: [reviews.productId, reviews.userId],
        set: { rating, comment: body.comment?.trim() ?? "" },
      })
      .returning();

    return created({ review: row });
  });
}
