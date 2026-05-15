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

Add a `CRON_SECRET` env var with any random string. Vercel automatically sends `Authorization: Bearer ${CRON_SECRET}` on cron calls, and the `/api/cron/medication` route enforces it.

**Cron schedule:**

Already configured in `next/vercel.json` to fire at `0 6 * * *` UTC (≈ 9 AM Cairo). To change, edit the cron `schedule` and redeploy.

**Enabling on your phone/desktop:**

1. Open the app → **Settings → Reminders** → **Enable reminders**.
2. Grant the browser permission.
3. Tap **Send test** to confirm it works.

**iOS note:** On iOS 16.4+, web push only works after you **install the PWA to your home screen** (Share → Add to Home Screen). Until then, the toggle reports "unsupported".
