import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
]);
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB to stay under Vercel's serverless body limit

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Blob storage is not configured (set BLOB_READ_WRITE_TOKEN)" },
      { status: 500 }
    );
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported type: ${file.type || "unknown"}` },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = await put(`lab-results/${Date.now()}-${safeName}`, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url });
}
