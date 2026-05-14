import webpush, { type PushSubscription } from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const contact = process.env.VAPID_CONTACT || "mailto:noreply@example.com";

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(contact, publicKey, privateKey);
  configured = true;
  return true;
}

export type NotificationPayload = {
  title: string;
  body: string;
  url?: string;
};

export type SendResult =
  | { ok: true }
  | { ok: false; gone: boolean; statusCode?: number; message: string };

export async function sendPush(
  subscription: PushSubscription,
  payload: NotificationPayload
): Promise<SendResult> {
  if (!ensureConfigured()) {
    return { ok: false, gone: false, message: "VAPID keys not configured" };
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : undefined;
    return {
      ok: false,
      gone: statusCode === 404 || statusCode === 410,
      statusCode,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export function isWebPushConfigured() {
  return Boolean(publicKey && privateKey);
}
