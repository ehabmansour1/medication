import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { listCredentials, rpInfoFromRequest } from "@/lib/webauthn";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CHALLENGE_COOKIE = "webauthn_reg_challenge";

export async function POST(request: Request) {
  const c = await cookies();
  const userId = await verifySession(c.get(SESSION_COOKIE)?.value);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rpID } = rpInfoFromRequest(request);
  const existing = await listCredentials(userId);

  const options = await generateRegistrationOptions({
    rpName: "Medication Tracker",
    rpID,
    userID: new TextEncoder().encode(userId),
    userName: userId,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.credentialID,
      transports: c.transports,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
  });

  c.set(CHALLENGE_COOKIE, options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });

  return NextResponse.json(options);
}
