/**
 * PATCH /api/admin/users  -> ADMIN: block or unblock an account (JWT is checked
 * against the DB on every request, so blocking takes effect immediately).
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { HttpError, requireAuth } from "@/lib/auth";
import { handle, ok, readJson, requireFields } from "@/lib/http";

export async function PATCH(req: Request) {
  return handle(async () => {
    const auth = await requireAuth(req, ["admin"]);
    const body = await readJson<{ userId?: number; isBlocked?: boolean }>(req);
    requireFields(body, ["userId"]);
    const userId = Number(body.userId);
    if (userId === auth.user.id) throw new HttpError(400, "You cannot block your own account.");

    const [row] = await db
      .update(users)
      .set({ isBlocked: Boolean(body.isBlocked) })
      .where(eq(users.id, userId))
      .returning({ id: users.id, name: users.name, isBlocked: users.isBlocked });
    if (!row) throw new HttpError(404, "User not found.");
    return ok({ user: row });
  });
}
