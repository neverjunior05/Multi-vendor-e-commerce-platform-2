/**
 * GET    /api/products/:id   -> public detail (any status visible to owner/admin)
 * PUT    /api/products/:id   -> VENDOR owning the product, or ADMIN
 * DELETE /api/products/:id   -> VENDOR owning the product (soft delete), or ADMIN
 *
 * `assertOwnership` is the line that stops vendor A editing vendor B's listing.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { assertOwnership, HttpError, requireAuth } from "@/lib/auth";
import { handle, json, ok, readJson } from "@/lib/http";
import { getProduct } from "@/lib/queries";

type Params = { params: Promise<{ id: string }> };

async function loadProduct(id: string) {
  const numeric = Number(id);
  const [row] = await db
    .select()
    .from(products)
    .where(Number.isFinite(numeric) ? eq(products.id, numeric) : eq(products.slug, id))
    .limit(1);
  if (!row) throw new HttpError(404, "Product not found.");
  return row;
}

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const product = await getProduct(id);
    if (!product) throw new HttpError(404, "Product not found.");
    return json({ product });
  });
}

export async function PUT(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const auth = await requireAuth(req, ["vendor", "admin"]);
    const existing = await loadProduct(id);
    assertOwnership(existing.vendorId, auth.vendor, auth.user.role);

    const body = await readJson<{
      title?: string;
      description?: string;
      price?: number;
      compareAt?: number | null;
      stock?: number;
      categorySlug?: string;
      images?: string[];
      attributes?: Record<string, string | number | boolean>;
      status?: "active" | "draft" | "removed";
    }>(req);

    let categoryId = existing.categoryId;
    if (body.categorySlug !== undefined) {
      const [category] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, body.categorySlug))
        .limit(1);
      categoryId = category?.id ?? null;
    }

    const [row] = await db
      .update(products)
      .set({
        title: body.title?.trim() ?? existing.title,
        description: body.description?.trim() ?? existing.description,
        priceCents:
          body.price !== undefined && Number.isFinite(Number(body.price))
            ? Math.round(Number(body.price) * 100)
            : existing.priceCents,
        compareAtCents:
          body.compareAt === null
            ? null
            : body.compareAt
              ? Math.round(Number(body.compareAt) * 100)
              : existing.compareAtCents,
        stock: body.stock !== undefined ? Math.max(Number(body.stock) || 0, 0) : existing.stock,
        images: Array.isArray(body.images) ? body.images.filter(Boolean).slice(0, 6) : existing.images,
        attributes: body.attributes ?? existing.attributes,
        status: body.status ?? existing.status,
        categoryId,
      })
      .where(eq(products.id, existing.id))
      .returning();

    return ok({ product: row });
  });
}

export async function DELETE(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const auth = await requireAuth(req, ["vendor", "admin"]);
    const existing = await loadProduct(id);
    assertOwnership(existing.vendorId, auth.vendor, auth.user.role);

    // Soft delete: order history keeps referencing the row via order_items.
    await db.update(products).set({ status: "removed" }).where(eq(products.id, existing.id));
    return json({ success: true, id: existing.id });
  });
}
