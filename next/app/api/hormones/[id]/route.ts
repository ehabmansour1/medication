import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const HORMONES = "hormones";
const RESULTS = "lab_results";
const SINGLE_USER_ID = "default";

function parseId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

type HormonePatch = {
  name?: unknown;
  unit?: unknown;
  normalRange?: unknown;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const objectId = parseId(id);
  if (!objectId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = (await request.json().catch(() => null)) as HormonePatch | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const update: Record<string, string> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.unit === "string") update.unit = body.unit.trim();
  if (typeof body.normalRange === "string") update.normalRange = body.normalRange.trim();

  if (update.name === "") {
    return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }

  const db = await getDb();
  const res = await db
    .collection(HORMONES)
    .updateOne(
      { _id: objectId, userId: SINGLE_USER_ID },
      { $set: { ...update, updatedAt: new Date() } }
    );

  if (res.matchedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const objectId = parseId(id);
  if (!objectId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = await getDb();
  const res = await db
    .collection(HORMONES)
    .deleteOne({ _id: objectId, userId: SINGLE_USER_ID });

  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // cascade-delete results for this hormone
  await db.collection(RESULTS).deleteMany({ hormoneId: id, userId: SINGLE_USER_ID });

  return NextResponse.json({ ok: true });
}
