import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { sendPush } from "@/lib/webpush";
import { isMedicationDayString, localDateString, localHour } from "@/lib/medication";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SINGLE_USER_ID = "default";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const db = await getDb();
  const subs = await db.collection("push_subscriptions").find({}).toArray();

  if (subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: "no subscriptions" });
  }

  let sent = 0;
  let cleaned = 0;
  let failed = 0;
  let skipped = 0;

  for (const sub of subs) {
    const tz = typeof sub.timezone === "string" ? sub.timezone : "UTC";
    const preferred = typeof sub.preferredHour === "number" ? sub.preferredHour : 9;
    const evening = typeof sub.eveningHour === "number" ? sub.eveningHour : null;

    const dateStr = localDateString(now, tz);
    if (!isMedicationDayString(dateStr)) {
      skipped++;
      continue;
    }

    const hour = localHour(now, tz);
    const isMorning = hour === preferred;
    const isEvening = evening !== null && hour === evening;
    if (!isMorning && !isEvening) {
      skipped++;
      continue;
    }

    const dose = await db
      .collection("doses")
      .findOne({ userId: SINGLE_USER_ID, date: dateStr });
    if (dose) {
      skipped++;
      continue;
    }

    const payload = isEvening
      ? {
          title: "Still time to take it",
          body: "You haven't marked today's dose yet — tap to log it.",
          url: "/",
        }
      : {
          title: "Time to take your medication",
          body: "Today is a medication day. Tap to mark it taken.",
          url: "/",
        };

    const result = await sendPush(
      { endpoint: sub.endpoint, keys: sub.keys },
      payload
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

  return NextResponse.json({ ok: true, sent, cleaned, failed, skipped });
}
