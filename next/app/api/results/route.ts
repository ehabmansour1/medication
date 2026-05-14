import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const COLLECTION = "lab_results";
const SINGLE_USER_ID = "default";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type ResultInput = {
  hormoneId?: unknown;
  date?: unknown;
  value?: unknown;
  notes?: unknown;
  imageUrls?: unknown;
};

function sanitizeResult(body: ResultInput) {
  const hormoneId = typeof body.hormoneId === "string" ? body.hormoneId : "";
  const date = typeof body.date === "string" ? body.date : "";
  if (!ObjectId.isValid(hormoneId)) return { error: "Invalid hormoneId" };
  if (!DATE_RE.test(date)) return { error: "Invalid date (expected YYYY-MM-DD)" };

  let value: number | null = null;
  if (typeof body.value === "number" && Number.isFinite(body.value)) {
    value = body.value;
  } else if (typeof body.value === "string" && body.value.trim() !== "") {
    const parsed = Number(body.value);
    if (Number.isFinite(parsed)) value = parsed;
  }

  const notes =
    typeof body.notes === "string" && body.notes.trim() !== "" ? body.notes.trim() : null;

  const imageUrls = Array.isArray(body.imageUrls)
    ? body.imageUrls.filter((u): u is string => typeof u === "string" && u.length > 0)
    : [];

  return { data: { hormoneId, date, value, notes, imageUrls } };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hormoneId = searchParams.get("hormoneId");
  const filter: Record<string, unknown> = { userId: SINGLE_USER_ID };
  if (hormoneId) {
    if (!ObjectId.isValid(hormoneId)) {
      return NextResponse.json({ error: "Invalid hormoneId" }, { status: 400 });
    }
    filter.hormoneId = hormoneId;
  }

  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find(filter)
    .sort({ date: -1, createdAt: -1 })
    .toArray();

  return NextResponse.json({
    results: docs.map((d) => ({
      _id: d._id.toString(),
      hormoneId: d.hormoneId,
      date: d.date,
      value: typeof d.value === "number" ? d.value : null,
      notes: typeof d.notes === "string" ? d.notes : null,
      imageUrls: Array.isArray(d.imageUrls) ? d.imageUrls : [],
      createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ResultInput | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const parsed = sanitizeResult(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const db = await getDb();
  const now = new Date();
  const insert = await db.collection(COLLECTION).insertOne({
    userId: SINGLE_USER_ID,
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({
    result: {
      _id: insert.insertedId.toString(),
      ...parsed.data,
      createdAt: now.toISOString(),
    },
  });
}
