import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { listCredentials, rpInfoFromRequest } from "@/lib/webauthn";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CHALLENGE_COOKIE = "webauthn_auth_challenge";

export async function POST(request: Request) {
  const expectedUser = process.env.AUTH_USERNAME ?? "";
  if (!expectedUser) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  const { rpID } = rpInfoFromRequest(request);
  const creds = await listCredentials(expectedUser);
  if (creds.length === 0) {
    return NextResponse.json({ error: "No biometric registered" }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: creds.map((c) => ({
      id: c.credentialID,
      transports: c.transports,
    })),
    userVerification: "preferred",
  });

  const c = await cookies();
  c.set(CHALLENGE_COOKIE, options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });

  return NextResponse.json(options);
}
