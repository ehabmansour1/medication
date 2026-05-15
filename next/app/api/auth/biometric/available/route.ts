import { NextResponse } from "next/server";
import { listCredentials } from "@/lib/webauthn";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const expectedUser = process.env.AUTH_USERNAME ?? "";
  if (!expectedUser) {
    return NextResponse.json({ available: false });
  }
  const creds = await listCredentials(expectedUser);
  return NextResponse.json({ available: creds.length > 0 });
}
