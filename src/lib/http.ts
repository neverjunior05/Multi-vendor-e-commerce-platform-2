/**
 * Tiny Express-style helpers for Next.js route handlers.
 * `handle()` wraps a handler so thrown HttpErrors turn into clean JSON
 * responses instead of 500 stack traces.
 */
import { HttpError } from "@/lib/auth";

export function json(data: unknown, init?: number | ResponseInit): Response {
  return Response.json(data, typeof init === "number" ? { status: init } : init);
}

export const ok = (data: unknown) => json(data, 200);
export const created = (data: unknown) => json(data, 201);

export function fail(status: number, message: string, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, status);
}

export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, error.message);
    console.error("[api]", error);
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return fail(500, message);
  }
}

/** Required-field validation without pulling in a schema library. */
export function requireFields<T extends Record<string, unknown>>(body: T, fields: (keyof T)[]) {
  const missing = fields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || value === "";
  });
  if (missing.length > 0) {
    throw new HttpError(400, `Missing required field(s): ${missing.map(String).join(", ")}`);
  }
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}
