import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COLLECTION = "share_tokens";
const SINGLE_USER_ID = "default";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = await getDb();
  const res = await db.collection(COLLECTION).deleteOne({
    token,
    userId: SINGLE_USER_ID,
  });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
