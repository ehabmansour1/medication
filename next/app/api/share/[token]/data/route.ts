import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKENS = "share_tokens";
const HORMONES = "hormones";
const RESULTS = "lab_results";
const DOSES = "doses";
const SINGLE_USER_ID = "default";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const db = await getDb();
  const t = await db.collection(TOKENS).findOne({ token });
  if (!t) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (t.expiresAt instanceof Date && t.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  const [hormones, results, doses] = await Promise.all([
    db.collection(HORMONES).find({ userId: SINGLE_USER_ID }).sort({ createdAt: 1 }).toArray(),
    db.collection(RESULTS).find({ userId: SINGLE_USER_ID }).sort({ date: -1 }).toArray(),
    db
      .collection(DOSES)
      .find({ userId: SINGLE_USER_ID })
      .project({ _id: 0, date: 1 })
      .toArray(),
  ]);

  return NextResponse.json({
    sharedAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : null,
    expiresAt: t.expiresAt instanceof Date ? t.expiresAt.toISOString() : null,
    label: t.label ?? null,
    hormones: hormones.map((h) => ({
      _id: h._id.toString(),
      name: h.name,
      unit: h.unit ?? "",
      normalRange: h.normalRange ?? "",
    })),
    results: results.map((r) => ({
      _id: r._id.toString(),
      hormoneId: r.hormoneId,
      date: r.date,
      value: typeof r.value === "number" ? r.value : null,
      notes: typeof r.notes === "string" ? r.notes : null,
      imageUrls: Array.isArray(r.imageUrls) ? r.imageUrls : [],
    })),
    taken: doses.map((d) => d.date as string),
  });
}
