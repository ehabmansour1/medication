import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { rpInfoFromRequest, saveCredential } from "@/lib/webauthn";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CHALLENGE_COOKIE = "webauthn_reg_challenge";

function bufToB64Url(buf: Uint8Array): string {
  let bin = "";
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function POST(request: Request) {
  const c = await cookies();
  const userId = await verifySession(c.get(SESSION_COOKIE)?.value);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const challenge = c.get(CHALLENGE_COOKIE)?.value;
  if (!challenge) {
    return NextResponse.json({ error: "No active challenge" }, { status: 400 });
  }

  const { rpID, origin } = rpInfoFromRequest(request);
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 400 }
    );
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Not verified" }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;
  await saveCredential({
    userId,
    credentialID: credential.id,
    publicKey: bufToB64Url(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports as AuthenticatorTransport[] | undefined,
  });

  // clear the challenge cookie
  c.set(CHALLENGE_COOKIE, "", { path: "/", maxAge: 0 });

  return NextResponse.json({ ok: true });
}
