/**
 * GET  /api/products            -> public catalogue with filters
 *      ?q=&category=&vendor=&min=&max=&sort=&page=&limit=
 * POST /api/products            -> VENDOR (approved store) or ADMIN only
 *
 * The role check is `requireApprovedVendor`: it rejects guests with 401 and
 * customers with 403, and additionally blocks vendors whose application has not
 * been approved by an admin yet.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, vendors } from "@/db/schema";
import { HttpError, getAuth, requireApprovedVendor } from "@/lib/auth";
import { created, handle, json, readJson } from "@/lib/http";
import { listProducts } from "@/lib/queries";

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const auth = await getAuth(req);
    const mine = url.searchParams.get("mine") === "1";

    // `?mine=1` returns every status for the signed-in vendor (dashboard view).
    if (mine) {
      if (!auth) throw new HttpError(401, "Sign in to view your products.");
      if (!auth.vendor) throw new HttpError(403, "You do not have a vendor store.");
      const rows = await db
        .select()
        .from(products)
        .where(
          auth.user.role === "admin" && url.searchParams.get("all") === "1"
            ? undefined
            : eq(products.vendorId, auth.vendor.id),
        )
        .orderBy(products.createdAt);
      return json({ items: rows });
    }

    const num = (key: string) => {
      const raw = url.searchParams.get(key);
      if (raw === null || raw === "") return undefined;
      const value = Number(raw);
      return Number.isFinite(value) ? value : undefined;
    };

    const result = await listProducts({
      q: url.searchParams.get("q") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      vendor: url.searchParams.get("vendor") ?? undefined,
      minCents: num("min"),
      maxCents: num("max"),
      sort: (url.searchParams.get("sort") as "newest" | undefined) ?? "newest",
      page: num("page"),
      limit: num("limit"),
    });
    return json(result);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const auth = await requireApprovedVendor(req);
    const body = await readJson<{
      title?: string;
      description?: string;
      price?: number;
      compareAt?: number | null;
      stock?: number;
      categorySlug?: string;
      images?: string[];
      attributes?: Record<string, string | number | boolean>;
      status?: "active" | "draft";
    }>(req);

    const title = body.title?.trim();
    const price = Number(body.price);
    if (!title) throw new HttpError(400, "Product title is required.");
    if (!Number.isFinite(price) || price <= 0) throw new HttpError(400, "Price must be greater than zero.");
    if (title.length > 180) throw new HttpError(400, "Title is too long.");

    let categoryId: number | null = null;
    if (body.categorySlug) {
      const [category] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, body.categorySlug))
        .limit(1);
      categoryId = category?.id ?? null;
    }

    const vendorId = auth.vendor.id;
    const [row] = await db
      .insert(products)
      .values({
        vendorId,
        categoryId,
        title,
        slug: `${slugify(title)}-${Date.now().toString(36)}`,
        description: body.description?.trim() ?? "",
        priceCents: Math.round(price * 100),
        compareAtCents: body.compareAt ? Math.round(Number(body.compareAt) * 100) : null,
        stock: Number.isFinite(Number(body.stock)) ? Math.max(Number(body.stock), 0) : 0,
        images: Array.isArray(body.images) ? body.images.filter(Boolean).slice(0, 6) : [],
        attributes: body.attributes ?? {},
        status: body.status === "draft" ? "draft" : "active",
      })
      .returning();

    // Touch the vendor row so `updated` semantics stay simple for admins.
    await db.update(vendors).set({ slug: auth.vendor.slug }).where(and(eq(vendors.id, vendorId)));

    return created({ product: row });
  });
}
