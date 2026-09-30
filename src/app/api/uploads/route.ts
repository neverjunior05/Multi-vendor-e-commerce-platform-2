/**
 * POST /api/uploads -> VENDOR only (multer-equivalent).
 * Accepts `multipart/form-data` with a `file` field, validates the MIME type and
 * size (4MB cap — the same limit you'd set in `multer({ limits })`), then writes
 * the bytes into `public/uploads` and returns the public URL.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { HttpError, requireApprovedVendor } from "@/lib/auth";
import { created, handle } from "@/lib/http";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

export async function POST(req: Request) {
  return handle(async () => {
    await requireApprovedVendor(req); // role gate: only vendors upload product media

    const form = await req.formData().catch(() => null);
    if (!form) throw new HttpError(400, "Expected multipart/form-data with a `file` field.");

    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "No file received.");
    if (!ALLOWED.includes(file.type)) throw new HttpError(415, "Only JPG, PNG, WEBP, AVIF or GIF images are allowed.");
    if (file.size > MAX_BYTES) throw new HttpError(413, "Images must be 4MB or smaller.");

    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1]?.replace("svg+xml", "svg");
    const safeName = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, safeName), Buffer.from(await file.arrayBuffer()));

    return created({ url: `/uploads/${safeName}`, size: file.size, type: file.type });
  });
}
