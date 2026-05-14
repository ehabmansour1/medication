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
