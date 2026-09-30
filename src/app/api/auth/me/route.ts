/**
 * GET /api/auth/me
 * Reads the JWT from the Authorization header or the httpOnly cookie and returns
 * the live user + vendor profile. Returns `{ user: null }` (never a 401) so the
 * React Context can hydrate guests without console noise.
 */
import { getAuth } from "@/lib/auth";
import { handle, ok } from "@/lib/http";

export async function GET(req: Request) {
  return handle(async () => {
    const auth = await getAuth(req);
    if (!auth) return ok({ user: null, vendor: null });
    return ok({ user: auth.user, vendor: auth.vendor });
  });
}
