import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { deleteCredential, listCredentials } from "@/lib/webauthn";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const c = await cookies();
  const userId = await verifySession(c.get(SESSION_COOKIE)?.value);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const creds = await listCredentials(userId);
  return NextResponse.json({
    credentials: creds.map((cr) => ({
      credentialID: cr.credentialID,
      createdAt: cr.createdAt.toISOString(),
    })),
  });
}

export async function DELETE(request: Request) {
  const c = await cookies();
  const userId = await verifySession(c.get(SESSION_COOKIE)?.value);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { credentialID?: unknown } | null;
  if (!body || typeof body.credentialID !== "string") {
    return NextResponse.json({ error: "credentialID required" }, { status: 400 });
  }
  await deleteCredential(body.credentialID, userId);
  return NextResponse.json({ ok: true });
}
