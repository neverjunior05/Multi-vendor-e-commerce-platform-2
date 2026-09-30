import { clearAuthCookie } from "@/lib/auth";
import { handle, ok } from "@/lib/http";

export async function POST() {
  return handle(async () => {
    await clearAuthCookie();
    return ok({ success: true });
  });
}
