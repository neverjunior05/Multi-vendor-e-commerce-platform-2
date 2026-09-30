/**
 * GET /api/categories -> public list with live product counts.
 */
import { handle, json } from "@/lib/http";
import { listCategories } from "@/lib/queries";

export async function GET() {
  return handle(async () => json({ items: await listCategories() }));
}
