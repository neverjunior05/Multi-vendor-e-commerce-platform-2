/**
 * AUTHENTICATION + ROLE-BASED ACCESS CONTROL
 * ==========================================
 * This file is the security core of Bazaario. Everything else (products, carts,
 * orders, admin panel) calls the helpers below.
 *
 * The flow, end to end:
 *
 *   1. SIGNUP  -> plaintext password -> bcrypt.hash (10 salt rounds) -> stored hash
 *   2. LOGIN   -> bcrypt.compare(plaintext, hash) -> if true, sign a JWT that
 *                 embeds { sub: userId, role, email } and expires in 7 days.
 *   3. REQUEST -> the JWT is sent either as an `Authorization: Bearer <token>`
 *                 header (typical SPA/axios client) or as an httpOnly cookie
 *                 (survives a page refresh without extra JS).
 *   4. GUARD   -> `requireAuth(req, ["vendor", "admin"])` verifies the signature
 *                 + expiry, loads the *current* user row from the DB, and checks
 *                 the role against the allow-list for that endpoint.
 *
 * Why re-read the user from the database instead of trusting the token payload?
 * A JWT is only signed, never revoked: if an admin blocks a vendor, the old
 * token is still perfectly valid for 7 days. Re-validating against the DB means
 * `isBlocked` takes effect immediately. Role comes from the token for speed, but
 * is cross-checked against the live row so a demoted/blocked user loses access
 * on their very next request.
 */
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, vendors, type User, type Vendor } from "@/db/schema";

const JWT_SECRET: string = process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me";
const JWT_EXPIRES_IN = "7d";
export const AUTH_COOKIE = "bazaario_token";

export type Role = "customer" | "vendor" | "admin";

export type AuthUser = Pick<User, "id" | "name" | "email" | "role" | "isBlocked" | "createdAt">;

export type AuthContext = {
  user: AuthUser;
  /** Populated when the user owns a vendor store (vendors + admins can read it). */
  vendor: Vendor | null;
};

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/* ----------------------------- passwords ----------------------------- */

export async function hashPassword(plain: string): Promise<string> {
  // 10 rounds is the bcrypt default and a sane cost/security trade-off.
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/* ------------------------------- tokens ------------------------------- */

export function signToken(user: Pick<User, "id" | "email" | "role">): string {
  const payload = { sub: String(user.id), email: user.email, role: user.role };
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  // The role lives INSIDE the signed payload, so a client can never forge it —
  // tampering invalidates the signature and `jwt.verify` throws.
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): { userId: number; role: Role } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { role?: Role };
    const id = Number(decoded.sub);
    if (!Number.isFinite(id) || !decoded.role) return null;
    return { userId: id, role: decoded.role };
  } catch {
    // Expired, malformed, or signature mismatch.
    return null;
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(AUTH_COOKIE, token, {
    httpOnly: true, // JS (and therefore XSS) cannot read it
    sameSite: "lax", // blocks most CSRF while keeping normal links working
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAuthCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
}

/* ------------------------------ guards ------------------------------ */

function readToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Resolve the caller. Returns null when there is no valid token — use this for
 * endpoints that are *better* when logged in but still work for guests.
 */
export async function getAuth(req?: Request): Promise<AuthContext | null> {
  const token = req ? readToken(req) : (await cookies()).get(AUTH_COOKIE)?.value ?? null;
  if (!token) return null;

  const claims = verifyToken(token);
  if (!claims) return null;

  const [row] = await db.select().from(users).where(eq(users.id, claims.userId)).limit(1);
  if (!row || row.isBlocked) return null;

  // Keep the token role and the database role in sync.
  const role: Role = row.role as Role;
  const [vendor] = await db.select().from(vendors).where(eq(vendors.userId, row.id)).limit(1);

  return {
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      role,
      isBlocked: row.isBlocked,
      createdAt: row.createdAt,
    },
    vendor: vendor ?? null,
  };
}

/**
 * THE ROLE MIDDLEWARE.
 * Usage inside a route handler:
 *
 *   const auth = await requireAuth(req, ["vendor", "admin"]); // throws 401/403
 *
 * 401 UNAUTHENTICATED -> no token / bad token / blocked user: "who are you?"
 * 403 FORBIDDEN       -> valid identity but role not in the allow-list: "I know
 *                        who you are and you still can't do this."
 */
export async function requireAuth(req: Request, roles: Role[] = []): Promise<AuthContext> {
  const auth = await getAuth(req);
  if (!auth) throw new HttpError(401, "You must be signed in to do that.");
  if (roles.length > 0 && !roles.includes(auth.user.role)) {
    throw new HttpError(403, `This action requires the ${roles.join(" or ")} role.`);
  }
  return auth;
}

/**
 * Vendor-only guard that ALSO requires an approved store. Used by
 * `POST /api/products`: a pending vendor may reach their dashboard but cannot
 * publish a listing until an admin approves the application.
 */
export async function requireApprovedVendor(req: Request): Promise<AuthContext & { vendor: Vendor }> {
  const auth = await requireAuth(req, ["vendor", "admin"]);
  if (!auth.vendor) throw new HttpError(403, "Create a vendor store first.");
  if (auth.vendor.status !== "approved" && auth.user.role !== "admin") {
    throw new HttpError(403, "Your vendor application is still awaiting admin approval.");
  }
  return auth as AuthContext & { vendor: Vendor };
}

/**
 * Ensures a vendor only ever mutates their own rows. Without this check any
 * vendor could `PUT /api/products/42` and edit a competitor's listing.
 */
export function assertOwnership(vendorId: number, vendor: Vendor | null, role: Role): void {
  if (role === "admin") return;
  if (!vendor || vendor.id !== vendorId) {
    throw new HttpError(403, "You can only modify resources that belong to your store.");
  }
}
