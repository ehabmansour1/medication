# medication

Medication tracker built with Next.js (App Router + TypeScript), MongoDB Atlas, deployed on Vercel.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your MongoDB Atlas connection string.
3. `npm run dev`

## Deploy on Vercel

1. Push to GitHub.
2. Import the repo in Vercel.
3. Add the `MONGODB_URI` and `MONGODB_DB` environment variables in the Vercel project settings.
4. In MongoDB Atlas, allow access from `0.0.0.0/0` (or Vercel's IPs) for the cluster's network access list.