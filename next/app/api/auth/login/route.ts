import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { username?: unknown; password?: unknown }
    | null;
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const expectedUser = process.env.AUTH_USERNAME ?? "";
  const expectedPass = process.env.AUTH_PASSWORD ?? "";
  if (!expectedUser || !expectedPass) {
    return NextResponse.json(
      { error: "Auth not configured on server" },
      { status: 500 }
    );
  }

  const ok =
    constantTimeEqual(username, expectedUser) &&
    constantTimeEqual(password, expectedPass);

  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await createSession(expectedUser);
  const c = await cookies();
  c.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return NextResponse.json({ ok: true, username: expectedUser });
}
