import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COLLECTION = "push_subscriptions";
const SINGLE_USER_ID = "default";

type SubscriptionBody = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SubscriptionBody | null;
  if (!isValidSub(body)) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const db = await getDb();
  await db.collection(COLLECTION).updateOne(
    { endpoint: body.endpoint },
    {
      $set: {
        userId: SINGLE_USER_ID,
        endpoint: body.endpoint,
        keys: body.keys,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
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
