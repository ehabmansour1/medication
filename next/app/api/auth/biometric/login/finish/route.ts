import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { findCredential, rpInfoFromRequest, updateCounter } from "@/lib/webauthn";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CHALLENGE_COOKIE = "webauthn_auth_challenge";

function b64UrlToBuf(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export async function POST(request: Request) {
  const c = await cookies();
  const challenge = c.get(CHALLENGE_COOKIE)?.value;
  if (!challenge) {
    return NextResponse.json({ error: "No active challenge" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const stored = await findCredential(body.id);
  if (!stored) {
    return NextResponse.json({ error: "Unknown credential" }, { status: 404 });
  }

  const { rpID, origin } = rpInfoFromRequest(request);

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: stored.credentialID,
        publicKey: b64UrlToBuf(stored.publicKey),
        counter: stored.counter,
        transports: stored.transports,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 400 }
    );
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Not verified" }, { status: 401 });
  }

  await updateCounter(stored.credentialID, verification.authenticationInfo.newCounter);

  const session = await createSession(stored.userId);
  c.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  c.set(CHALLENGE_COOKIE, "", { path: "/", maxAge: 0 });

  return NextResponse.json({ ok: true });
}
