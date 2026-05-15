export const SESSION_COOKIE = "app_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365 * 10; // ~10 years

function b64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(payload: string): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return b64UrlEncode(sig);
}

export async function createSession(userId: string): Promise<string> {
  const sig = await sign(userId);
  return `${userId}.${sig}`;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function verifySession(value: string | undefined | null): Promise<string | null> {
  if (!value) return null;
  const idx = value.lastIndexOf(".");
  if (idx <= 0 || idx === value.length - 1) return null;
  const userId = value.slice(0, idx);
  const got = value.slice(idx + 1);
  try {
    const expected = await sign(userId);
    return constantTimeEqual(got, expected) ? userId : null;
  } catch {
    return null;
  }
}
