import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const c = await cookies();
  const userId = await verifySession(c.get(SESSION_COOKIE)?.value);
  if (!userId) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user: { username: userId } });
}
