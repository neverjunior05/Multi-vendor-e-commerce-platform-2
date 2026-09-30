/**
 * POST /api/auth/login -> { token, user }
 * bcrypt.compare against the stored hash, then issue a JWT with the role inside.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { setAuthCookie, signToken, verifyPassword } from "@/lib/auth";
import { fail, handle, json, readJson, requireFields } from "@/lib/http";

export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson<{ email?: string; password?: string }>(req);
    requireFields(body, ["email", "password"]);

    const email = String(body.email).trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return fail(401, "Incorrect email or password.");
    if (user.isBlocked) return fail(403, "This account has been suspended by an administrator.");

    const valid = await verifyPassword(String(body.password), user.passwordHash);
    if (!valid) return fail(401, "Incorrect email or password.");

    const token = signToken(user);
    await setAuthCookie(token);

    return json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  });
}
