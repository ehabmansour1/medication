import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { sendPush } from "@/lib/webpush";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (!body || typeof body.endpoint !== "string") {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }

  const db = await getDb();
  const sub = await db
    .collection("push_subscriptions")
    .findOne({ endpoint: body.endpoint });
  if (!sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  const result = await sendPush(
    { endpoint: sub.endpoint, keys: sub.keys },
    {
      title: "Test notification",
      body: "Push notifications are working ✓",
      url: "/",
    }
  );

  if (!result.ok) {
    if (result.gone) {
      await db.collection("push_subscriptions").deleteOne({ endpoint: body.endpoint });
    }
    return NextResponse.json(
      { error: result.message, statusCode: result.statusCode },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
