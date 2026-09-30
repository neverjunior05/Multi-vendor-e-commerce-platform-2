/**
 * GET /api/admin/overview -> ADMIN only.
 * Platform-wide metrics plus every user, vendor, product and order.
 * `requireAuth(req, ["admin"])` is the entire authorisation model here.
 */
import { requireAuth } from "@/lib/auth";
import { handle, json } from "@/lib/http";
import { getAdminOverview } from "@/lib/queries";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAuth(req, ["admin"]);
    return json(await getAdminOverview());
  });
}
