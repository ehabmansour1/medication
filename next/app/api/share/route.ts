import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { getDb } from "@/lib/mongodb";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COLLECTION = "share_tokens";
const SINGLE_USER_ID = "default";

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

async function requireAuth() {
  const c = await cookies();
  const userId = await verifySession(c.get(SESSION_COOKIE)?.value);
  return userId;
}

export async function GET() {
  const userId = await requireAuth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  const tokens = await db
    .collection(COLLECTION)
    .find({ userId: SINGLE_USER_ID })
    .sort({ createdAt: -1 })
    .toArray();

  const now = Date.now();
  return NextResponse.json({
    tokens: tokens.map((t) => ({
      token: t.token,
      label: t.label ?? null,
      expiresAt:
        t.expiresAt instanceof Date ? t.expiresAt.toISOString() : t.expiresAt ?? null,
      createdAt:
        t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
      expired:
        t.expiresAt instanceof Date ? t.expiresAt.getTime() < now : false,
    })),
  });
}

export async function POST(request: Request) {
  const userId = await requireAuth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    label?: unknown;
    expiresInDays?: unknown;
  };

  const label =
    typeof body.label === "string" && body.label.trim() !== "" ? body.label.trim() : null;

  let expiresAt: Date | null = null;
  if (typeof body.expiresInDays === "number" && body.expiresInDays > 0) {
    expiresAt = new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000);
  }

  const token = newToken();
  const db = await getDb();
  await db.collection(COLLECTION).insertOne({
    userId: SINGLE_USER_ID,
    token,
    label,
    expiresAt,
    createdAt: new Date(),
  });

  return NextResponse.json({
    token,
    label,
    expiresAt: expiresAt?.toISOString() ?? null,
  });
}
