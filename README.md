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
- **Environment Variables:** `MONGODB_URI`, `MONGODB_DB` (Production + Preview + Development)

In MongoDB Atlas → Network Access, allow `0.0.0.0/0` (or Vercel's egress IPs).
