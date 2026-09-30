import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    await ensureSeeded();
    return Response.json({ status: "ok", database: "connected", seeded: true });
  } catch (error) {
    return Response.json(
      { status: "degraded", error: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
