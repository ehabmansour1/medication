import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const COLLECTION = "doses";
const SINGLE_USER_ID = "default";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({ userId: SINGLE_USER_ID })
    .project({ _id: 0, date: 1 })
    .toArray();

  return NextResponse.json({ taken: docs.map((d) => d.date) });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { date?: unknown } | null;
  const date = body?.date;

  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date (expected YYYY-MM-DD)" }, { status: 400 });
  }

  const db = await getDb();
  await db
    .collection(COLLECTION)
    .updateOne(
      { userId: SINGLE_USER_ID, date },
      { $set: { userId: SINGLE_USER_ID, date, takenAt: new Date() } },
      { upsert: true }
    );

  return NextResponse.json({ ok: true, date });
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as { date?: unknown } | null;
  const date = body?.date;

  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date (expected YYYY-MM-DD)" }, { status: 400 });
  }

  const db = await getDb();
  await db.collection(COLLECTION).deleteOne({ userId: SINGLE_USER_ID, date });

  return NextResponse.json({ ok: true, date });
}
