import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COLLECTION = "user_preferences";
const SINGLE_USER_ID = "default";

const DEFAULT_GOAL = 80;

type PrefsPatch = {
  goal?: unknown;
  celebratedMilestones?: unknown;
};

function sanitizeMilestones(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const out: number[] = [];
  for (const v of value) {
    if (typeof v === "number" && Number.isInteger(v) && v > 0 && v < 100000) {
      if (!out.includes(v)) out.push(v);
    }
  }
  return out;
}

export async function GET() {
  const db = await getDb();
  const doc = await db
    .collection(COLLECTION)
    .findOne({ userId: SINGLE_USER_ID });

  const goal =
    typeof doc?.goal === "number" && doc.goal >= 0 && doc.goal <= 100
      ? doc.goal
      : DEFAULT_GOAL;
  const celebratedMilestones = Array.isArray(doc?.celebratedMilestones)
    ? doc.celebratedMilestones.filter((v): v is number => typeof v === "number")
    : [];

  return NextResponse.json({ goal, celebratedMilestones });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as PrefsPatch | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (body.goal !== undefined) {
    const n = typeof body.goal === "number" ? body.goal : Number(body.goal);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json({ error: "goal must be 0-100" }, { status: 400 });
    }
    update.goal = Math.round(n);
  }

  if (body.celebratedMilestones !== undefined) {
    const m = sanitizeMilestones(body.celebratedMilestones);
    if (m === null) {
      return NextResponse.json(
        { error: "celebratedMilestones must be an array of positive integers" },
        { status: 400 }
      );
    }
    update.celebratedMilestones = m;
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }

  const db = await getDb();
  await db.collection(COLLECTION).updateOne(
    { userId: SINGLE_USER_ID },
    {
      $set: update,
      $setOnInsert: { userId: SINGLE_USER_ID, createdAt: new Date() },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}
