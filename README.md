# EduAI MVP

Next.js + TypeScript + Tailwind + Supabase/PostgreSQL + server-side AI API.

## Run
`npm install` → copy `.env.example` to `.env.local` → add `OPENAI_API_KEY` → `npm run dev`. For persistence, create Supabase project and execute `supabase/schema.sql`.

The AI key is server-only in `/app/api/ai/chat`. Demo UI is included; auth forms currently use demo navigation until Supabase Auth is wired in.
