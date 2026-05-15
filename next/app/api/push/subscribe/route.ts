import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COLLECTION = "push_subscriptions";
const SINGLE_USER_ID = "default";

type SubscriptionBody = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
  preferredHour?: unknown;
  eveningHour?: unknown;
  timezone?: unknown;
};

function isValidSub(b: SubscriptionBody | null): b is {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  return (
    b !== null &&
    typeof b.endpoint === "string" &&
    !!b.keys &&
    typeof b.keys.p256dh === "string" &&
    typeof b.keys.auth === "string"
  );
}

function sanitizeHour(v: unknown): number | null {
  if (v === null) return null;
  if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 23) return v;
  return null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SubscriptionBody | null;
  if (!isValidSub(body)) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const preferredHour = sanitizeHour(body.preferredHour) ?? 9;
  const eveningHour = body.eveningHour === undefined ? null : sanitizeHour(body.eveningHour);
  const timezone =
    typeof body.timezone === "string" && body.timezone.length > 0 ? body.timezone : "UTC";

  const db = await getDb();
  await db.collection(COLLECTION).updateOne(
    { endpoint: body.endpoint },
    {
      $set: {
        userId: SINGLE_USER_ID,
        endpoint: body.endpoint,
        keys: body.keys,
        preferredHour,
        eveningHour,
        timezone,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
  return NextResponse.json({ ok: true, preferredHour, eveningHour, timezone });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as SubscriptionBody | null;
  if (!body || typeof body.endpoint !== "string") {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.preferredHour !== undefined) {
    const h = sanitizeHour(body.preferredHour);
    if (h === null) {
      return NextResponse.json({ error: "Invalid preferredHour" }, { status: 400 });
    }
    update.preferredHour = h;
  }
  if (body.eveningHour !== undefined) {
    update.eveningHour = body.eveningHour === null ? null : sanitizeHour(body.eveningHour);
  }
  if (body.timezone !== undefined && typeof body.timezone === "string") {
    update.timezone = body.timezone;
  }

  const db = await getDb();
  const res = await db
    .collection(COLLECTION)
    .updateOne({ endpoint: body.endpoint }, { $set: update });
  if (res.matchedCount === 0) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (!body || typeof body.endpoint !== "string") {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }
  const db = await getDb();
  await db.collection(COLLECTION).deleteOne({ endpoint: body.endpoint });
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }
  const db = await getDb();
  const sub = await db
    .collection(COLLECTION)
    .findOne(
      { endpoint },
      { projection: { _id: 0, preferredHour: 1, eveningHour: 1, timezone: 1 } }
    );
  if (!sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(sub);
}
