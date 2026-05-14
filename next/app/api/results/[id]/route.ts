import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const COLLECTION = "lab_results";
const SINGLE_USER_ID = "default";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

type ResultPatch = {
  date?: unknown;
  value?: unknown;
  notes?: unknown;
  imageUrls?: unknown;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const objectId = parseId(id);
  if (!objectId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = (await request.json().catch(() => null)) as ResultPatch | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const update: Record<string, unknown> = {};

  if (typeof body.date === "string") {
    if (!DATE_RE.test(body.date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    update.date = body.date;
  }

  if (body.value !== undefined) {
    if (body.value === null || body.value === "") {
      update.value = null;
    } else if (typeof body.value === "number" && Number.isFinite(body.value)) {
      update.value = body.value;
    } else if (typeof body.value === "string") {
      const parsed = Number(body.value);
      update.value = Number.isFinite(parsed) ? parsed : null;
    }
  }

  if (body.notes !== undefined) {
    update.notes =
      typeof body.notes === "string" && body.notes.trim() !== "" ? body.notes.trim() : null;
  }

  if (Array.isArray(body.imageUrls)) {
    update.imageUrls = body.imageUrls.filter(
      (u): u is string => typeof u === "string" && u.length > 0
    );
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }

  const db = await getDb();
  const res = await db
    .collection(COLLECTION)
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
    .collection(COLLECTION)
    .deleteOne({ _id: objectId, userId: SINGLE_USER_ID });

  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
