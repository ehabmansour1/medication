# medication


Repository contains two versions of the medication tracker:

- **`/` (root)** — the original static HTML/CSS/JS PWA.
- **`next/`** — Next.js (App Router + TypeScript) version backed by MongoDB Atlas, deployed on Vercel.

## Local dev (Next.js version)

```
cd next
npm install
cp .env.example .env.local   # then fill in your MongoDB URI
npm run dev
```


## Vercel deployment

Import this repo into Vercel and set:

- **Root Directory:** `next`
- **Environment Variables:** `MONGODB_URI`, `MONGODB_DB`, `BLOB_READ_WRITE_TOKEN` (Production + Preview + Development)

In MongoDB Atlas → Network Access, allow `0.0.0.0/0` (or Vercel's egress IPs).

### Vercel Blob (for lab result images)

The Labs page uploads test result images to **Vercel Blob**.

1. In your Vercel project → **Storage** → **Create** → **Blob**.
2. Connect it to the project. Vercel auto-injects `BLOB_READ_WRITE_TOKEN`.
3. For local dev, copy that token into `next/.env.local`.

### Web Push reminders + Vercel Cron

The app can send a push notification on every medication day if you haven't marked it taken yet.

**One-time VAPID key setup:**

```
npx web-push generate-vapid-keys
```

Copy the two keys it prints into your Vercel project env vars (Production + Preview + Development) **and** into `next/.env.local`:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — public key (the browser reads this).
- `VAPID_PRIVATE_KEY` — private key.
- `VAPID_CONTACT` — `mailto:you@example.com` (shown to push providers if anything goes wrong).

**Cron secret:**

Add a `CRON_SECRET` env var with any random string. Vercel automatically sends `Authorization: Bearer ${CRON_SECRET}` on cron calls, and the cron routes enforce it.

**Cron schedule (Hobby-plan friendly):**

`next/vercel.json` has **two daily crons** (the Hobby tier allows up to 2 jobs at daily granularity):

- `/api/cron/medication/morning` at `0 6 * * *` UTC (≈ 8–9 AM Cairo) — primary reminder.
- `/api/cron/medication/evening` at `0 17 * * *` UTC (≈ 7–8 PM Cairo) — only fires for subscribers who opt in via the "Send an evening nudge" toggle.

Both crons skip subscribers whose dose for today is already marked.

**Enabling on your phone/desktop:**

1. Open the app → **Settings → Reminders** → **Enable reminders**.
2. Grant the browser permission.
3. Tap **Send test** to confirm it works.

**iOS note:** On iOS 16.4+, web push only works after you **install the PWA to your home screen** (Share → Add to Home Screen). Until then, the toggle reports "unsupported".

### Authentication

The whole app (except `/share/<token>` doctor links and `/api/cron/*`) is gated behind a server-side login. One user, hardcoded via env vars.

**Env vars (set in Vercel + `next/.env.local`):**

```
AUTH_USERNAME=ahmed
AUTH_PASSWORD=9745
AUTH_SECRET=<random>     # node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**How it works:**
- `POST /api/auth/login` checks username + password (constant-time compare), then sets an HMAC-signed httpOnly cookie (`app_session`) with a 10-year `Max-Age`.
- `middleware.ts` verifies the cookie on every request. Unauthenticated users are redirected to `/login`. Authenticated users hitting `/login` bounce back home (or to the original `?redirect=` path).
- The session **never expires** until you log out (Settings → Security → Log out).

**Biometric (WebAuthn) sign-in:**

Real WebAuthn via `@simplewebauthn`. Once signed in, go to **Settings → Security → Add this device** to enroll a passkey (Face ID / fingerprint / Windows Hello). Next time you visit `/login`, tap "Sign in with biometric".

Registered credentials are stored in the `webauthn_credentials` Mongo collection and can be removed from Settings.
