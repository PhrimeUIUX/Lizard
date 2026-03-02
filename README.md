# Lizard Tap Arena (React + TypeScript + Supabase)

A fun mobile-first single-button game:
- Giant lizard button with SFX on every valid press
- Public global press count (guests and users)
- Account signup/login for ranked leaderboard
- Top 3 podium (gold/silver/bronze)
- DB-enforced `0.3s` press limit per identifier

## 1. Supabase setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql).
3. Optional: run [`supabase/maintenance.sql`](./supabase/maintenance.sql) for cleanup helper function.
4. Optional: run [`supabase/verify.sql`](./supabase/verify.sql) to validate RPC and leaderboard behavior.
3. In Supabase Auth settings:
   - Enable Email provider
   - Configure email confirmation preference as desired

## 2. App setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env`:
   ```bash
   cp .env.example .env
   ```
3. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.
4. Start:
   ```bash
   npm run dev
   ```

## 3. Troubleshooting `npm run dev`

If you see `vite: command not found`, dependencies were not installed yet.

Run:
```bash
npm install
```

If install hangs/fails due to network, configure npm registry and retry:
```bash
npm config set registry https://registry.npmjs.org/
npm install
```

## Notes

- Guests can always press; their presses increase public total only.
- Logged-in users also increase their personal score.
- Rate limiting is enforced in SQL function `press_lizard` using a 300ms window.
- For stronger anti-abuse, place this behind a server/edge function with IP + CAPTCHA.
