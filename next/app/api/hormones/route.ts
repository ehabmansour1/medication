import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const COLLECTION = "hormones";
const SINGLE_USER_ID = "default";

type HormoneInput = {
  name?: unknown;
  unit?: unknown;
  normalRange?: unknown;
};

function sanitizeHormone(body: HormoneInput) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const unit = typeof body.unit === "string" ? body.unit.trim() : "";
  const normalRange = typeof body.normalRange === "string" ? body.normalRange.trim() : "";
  if (!name) return null;
  return { name, unit, normalRange };
}

export async function GET() {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({ userId: SINGLE_USER_ID })
    .sort({ createdAt: 1 })
    .toArray();

  return NextResponse.json({
    hormones: docs.map((d) => ({
      _id: d._id.toString(),
      name: d.name,
      unit: d.unit ?? "",
      normalRange: d.normalRange ?? "",
      createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as HormoneInput | null;
  const data = body ? sanitizeHormone(body) : null;
  if (!data) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const db = await getDb();
  const now = new Date();
  const result = await db.collection(COLLECTION).insertOne({
    userId: SINGLE_USER_ID,
    ...data,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({
    hormone: {
      _id: result.insertedId.toString(),
      ...data,
      createdAt: now.toISOString(),
    },
  });
}
