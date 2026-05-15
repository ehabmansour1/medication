import { getDb } from "@/lib/mongodb";

export const WEBAUTHN_COLLECTION = "webauthn_credentials";

export function rpInfoFromRequest(request: Request) {
  const url = new URL(request.url);
  return {
    rpID: url.hostname,
    origin: url.origin,
  };
}

export type StoredCredential = {
  userId: string;
  credentialID: string; // base64url
  publicKey: string; // base64url
  counter: number;
  transports?: AuthenticatorTransport[];
  createdAt: Date;
};

export async function listCredentials(userId: string): Promise<StoredCredential[]> {
  const db = await getDb();
  const docs = await db
    .collection(WEBAUTHN_COLLECTION)
    .find({ userId })
    .toArray();
  return docs.map((d) => ({
    userId: d.userId,
    credentialID: d.credentialID,
    publicKey: d.publicKey,
    counter: typeof d.counter === "number" ? d.counter : 0,
    transports: Array.isArray(d.transports) ? d.transports : undefined,
    createdAt: d.createdAt instanceof Date ? d.createdAt : new Date(),
  }));
}

export async function findCredential(
  credentialID: string
): Promise<StoredCredential | null> {
  const db = await getDb();
  const d = await db
    .collection(WEBAUTHN_COLLECTION)
    .findOne({ credentialID });
  if (!d) return null;
  return {
    userId: d.userId,
    credentialID: d.credentialID,
    publicKey: d.publicKey,
    counter: typeof d.counter === "number" ? d.counter : 0,
    transports: Array.isArray(d.transports) ? d.transports : undefined,
    createdAt: d.createdAt instanceof Date ? d.createdAt : new Date(),
  };
}

export async function saveCredential(input: {
  userId: string;
  credentialID: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransport[];
}) {
  const db = await getDb();
  await db.collection(WEBAUTHN_COLLECTION).insertOne({
    ...input,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function updateCounter(credentialID: string, counter: number) {
  const db = await getDb();
  await db
    .collection(WEBAUTHN_COLLECTION)
    .updateOne(
      { credentialID },
      { $set: { counter, updatedAt: new Date() } }
    );
}

export async function deleteCredential(credentialID: string, userId: string) {
  const db = await getDb();
  return db
    .collection(WEBAUTHN_COLLECTION)
    .deleteOne({ credentialID, userId });
}
