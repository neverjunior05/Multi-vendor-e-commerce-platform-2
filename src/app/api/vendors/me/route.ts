/**
 * GET /api/vendors/me -> the signed-in vendor's store, stats and orders.
 * Used by the vendor dashboard on load.
 */
import { HttpError, requireAuth } from "@/lib/auth";
import { handle, json } from "@/lib/http";
import { getVendorOrders, getVendorStats, listVendorProducts } from "@/lib/queries";

export async function GET(req: Request) {
  return handle(async () => {
    const auth = await requireAuth(req, ["vendor", "admin"]);
    if (!auth.vendor) throw new HttpError(403, "You have not applied for a store yet.");

    const [products, stats, orders] = await Promise.all([
      listVendorProducts(auth.vendor.id),
      getVendorStats(auth.vendor.id),
      getVendorOrders(auth.vendor.id),
    ]);

    return json({
      vendor: auth.vendor,
      role: auth.user.role,
      stats,
      products,
      orders,
    });
  });
}
