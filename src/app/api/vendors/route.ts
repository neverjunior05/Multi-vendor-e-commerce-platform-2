/**
 * GET  /api/vendors            -> public list (approved only unless admin)
 * POST /api/vendors            -> CUSTOMER applies to become a vendor (pending)
 * PATCH /api/vendors/:id       -> ADMIN approves / rejects an application
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, vendors } from "@/db/schema";
import { HttpError, requireAuth } from "@/lib/auth";
import { created, handle, json, ok, readJson, requireFields } from "@/lib/http";
import { listVendors } from "@/lib/queries";

export async function GET(req: Request) {
  return handle(async () => {
    const auth = await requireAuth(req);
    const wantsAll = new URL(req.url).searchParams.get("all") === "1";
    const rows = await listVendors(wantsAll && auth.user.role === "admin" ? "all" : "approved");
    return json({ items: rows });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const auth = await requireAuth(req, ["customer", "vendor", "admin"]);
    const body = await readJson<{ storeName?: string; tagline?: string; city?: string; description?: string }>(req);
    requireFields(body, ["storeName"]);

    if (auth.vendor) {
      return json({ vendor: auth.vendor, message: "You already have a store application." });
    }

    const storeName = String(body.storeName).trim();
    const slug = `${storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${auth.user.id}`;

    const [vendor] = await db
      .insert(vendors)
      .values({
        userId: auth.user.id,
        storeName,
        slug,
        tagline: body.tagline?.trim() ?? null,
        city: body.city?.trim() ?? null,
        description: body.description?.trim() ?? null,
        status: "pending",
      })
      .returning();

    // Promote the account so the vendor dashboard unlocks immediately.
    if (auth.user.role === "customer") {
      await db.update(users).set({ role: "vendor" }).where(eq(users.id, auth.user.id));
    }

    return created({ vendor, message: "Application submitted — an admin will review it shortly." });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const auth = await requireAuth(req, ["admin"]);
    const body = await readJson<{ vendorId?: number; status?: "approved" | "rejected" | "pending" }>(req);
    requireFields(body, ["vendorId", "status"]);
    const vendorId = Number(body.vendorId);

    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
    if (!vendor) throw new HttpError(404, "Vendor application not found.");

    const [updated] = await db
      .update(vendors)
      .set({ status: body.status, reviewedAt: new Date() })
      .where(eq(vendors.id, vendorId))
      .returning();

    // Rejecting an application demotes the account back to customer so they
    // lose vendor-only endpoints on the next request.
    if (body.status === "rejected") {
      await db.update(users).set({ role: "customer" }).where(eq(users.id, vendor.userId));
    } else if (body.status === "approved") {
      await db.update(users).set({ role: "vendor" }).where(eq(users.id, vendor.userId));
    }

    void auth;
    return ok({ vendor: updated });
  });
}
