/**
 * POST /api/auth/signup
 * Roles: public. Optionally creates a `pending` vendor store when role=vendor.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, vendors } from "@/db/schema";
import { hashPassword, setAuthCookie, signToken } from "@/lib/auth";
import { created, fail, handle, readJson, requireFields } from "@/lib/http";

type Body = {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  storeName?: string;
  tagline?: string;
  city?: string;
};

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson<Body>(req);
    requireFields(body, ["name", "email", "password", "role"]);

    const email = String(body.email).trim().toLowerCase();
    const password = String(body.password);
    const role = body.role === "vendor" ? "vendor" : "customer";
    const storeName = body.storeName?.trim();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, "Enter a valid email address.");
    if (password.length < 8) return fail(400, "Password must be at least 8 characters.");
    if (role === "vendor" && !storeName) return fail(400, "Vendors must provide a store name.");

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return fail(409, "An account with that email already exists.");

    const [user] = await db
      .insert(users)
      .values({ name: String(body.name).trim(), email, passwordHash: await hashPassword(password), role })
      .returning();

    // A vendor signup opens an application that starts in `pending` — an admin
    // must approve it before the vendor can publish products.
    if (role === "vendor" && storeName) {
      await db.insert(vendors).values({
        userId: user.id,
        storeName,
        slug: `${slugify(storeName)}-${user.id}`,
        tagline: body.tagline?.trim() ?? null,
        city: body.city?.trim() ?? null,
        description: `${storeName} is a new Bazaario workshop.`,
        status: "pending",
      });
    }

    const token = signToken(user);
    await setAuthCookie(token);

    return created({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      storeCreated: role === "vendor",
    });
  });
}
