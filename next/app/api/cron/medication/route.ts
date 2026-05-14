import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { sendPush } from "@/lib/webpush";
import { isMedicationDay, toDateString } from "@/lib/medication";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SINGLE_USER_ID = "default";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // No secret configured → allow (local dev)
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  if (!isMedicationDay(today)) {
    return NextResponse.json({ ok: true, skipped: "not a medication day" });
  }

  const db = await getDb();
  const dateString = toDateString(today);

  const existingDose = await db
    .collection("doses")
    .findOne({ userId: SINGLE_USER_ID, date: dateString });

  if (existingDose) {
    return NextResponse.json({ ok: true, skipped: "already taken today" });
  }

  const subs = await db.collection("push_subscriptions").find({}).toArray();
  if (subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: "no subscriptions" });
  }

  let sent = 0;
  let cleaned = 0;
  let failed = 0;

  for (const sub of subs) {
    const result = await sendPush(
      { endpoint: sub.endpoint, keys: sub.keys },
      {
        title: "Time to take your medication",
        body: "Today is a medication day. Tap to mark it taken.",
        url: "/",
      }
    );
    if (result.ok) {
      sent++;
    } else if (result.gone) {
      await db.collection("push_subscriptions").deleteOne({ _id: sub._id });
      cleaned++;
    } else {
      failed++;
      console.error("[cron] push failed:", result.message);
    }
  }

  return NextResponse.json({ ok: true, sent, cleaned, failed });
}
