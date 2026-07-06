# WeddingWallet 💍

A private wedding-expense tracker for **Piyumi & Shakya**. Track every payment,
manage budget items (with vendor + contact), see who paid how much, and get a
full spend summary — all in a phone-shaped web app.

- **Frontend:** React + TypeScript + Vite (single-page app)
- **Backend / API:** Cloudflare Pages Functions (Workers) — keeps the DB secret server-side
- **Database:** Supabase Postgres
- **Hosting:** Cloudflare Pages
- **Login:** Cloudflare Access (Google federated) — only allow-listed Gmail addresses get in

```
Browser ─(Google login via Cloudflare Access)─▶ Cloudflare Pages
   │  React SPA                                      │  /api/* → Pages Functions (holds Supabase secret)
   └──── fetch /api/* ───────────────────────────────▶│──▶ Supabase Postgres (RLS: service-role only)
```

The browser never sees a database key. Supabase is locked down with Row Level
Security so it can only be reached through the Access-protected API.

---

## Project structure

```
├── index.html               # SPA entry
├── src/                      # React app (the UI from your design)
│   ├── App.tsx               # shell: tabs, FAB, modal, data loading
│   ├── screens/              # Dashboard, Budget, Payments, Vendors, People
│   ├── components/           # Modal + forms + category detail
│   ├── lib/                  # format.ts, compute.ts (rollups), api.ts (fetch)
│   └── types.ts
├── functions/api/[[path]].ts # server API (Hono) — CRUD to Supabase
├── functions/_lib/           # Supabase client + optional Access JWT check
├── supabase/schema.sql       # tables, RLS, and your seed data
└── design/                   # original Claude design mock (reference only)
```

---

## 1. Local development

You need two terminals (the SPA and the API run as separate dev servers).

```bash
npm install

# Terminal A — the API (Cloudflare Functions via Wrangler).
# First copy the env template and fill in your Supabase values:
cp .dev.vars.example .dev.vars      # then edit .dev.vars
npm run dev:api                      # builds once, serves API on :8788

# Terminal B — the React app with hot reload (proxies /api → :8788)
npm run dev                          # open http://localhost:5173
```

> `.dev.vars` holds your local secrets and is git-ignored. Never commit it.

---

## 2. Supabase setup (database)

1. Create a free account at **[supabase.com](https://supabase.com)** → **New project**.
   Pick a strong DB password and a region close to you.
2. In the project, open **SQL Editor → New query**, paste the entire contents of
   [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates
   the `categories`, `payments`, and `payers` tables, enables RLS, and seeds your
   data from the Google Sheet. *(Delete the seed block at the bottom first if you
   want to start empty.)*
3. Grab your credentials from **Project Settings → API**:
   - **Project URL** → `SUPABASE_URL` (e.g. `https://abcd1234.supabase.co`)
   - **`service_role` secret** → `SUPABASE_SERVICE_ROLE_KEY`
     ⚠️ This key bypasses all security. It goes **only** into Cloudflare's
     environment variables and your local `.dev.vars` — never into the frontend
     or git.

Put those two values in your `.dev.vars` for local dev.

---

## 3. Deploy to Cloudflare Pages

**Option A — connect your Git repo (recommended):**

1. Push this project to GitHub/GitLab.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Pick the repo and set the build config:
   - **Framework preset:** `None` (or Vite)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Settings → Environment variables** → add for **Production** (and Preview):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`  → mark it as **Secret / Encrypt**
5. **Settings → Functions → Compatibility flags** → add `nodejs_compat`
   (needed by the Supabase client). Save and **Retry deployment**.

**Option B — deploy from your machine with Wrangler:**

```bash
npm run build
npx wrangler pages deploy dist --compatibility-flags nodejs_compat
# then set the two env vars in the Pages dashboard as in Option A
```

After deploying you'll get a URL like `https://weddingwallet.pages.dev`.
(You can add a custom domain later under **Custom domains**.)

---

## 4. Lock it down with Cloudflare Access (Google login)

This makes only *your* Gmail addresses able to open the site.

1. Cloudflare dashboard → **Zero Trust** (free plan is fine; pick a team name
   the first time, e.g. `piyumi-shakya` → your team domain becomes
   `piyumi-shakya.cloudflareaccess.com`).
2. **Settings → Authentication → Login methods → Add new → Google.** Follow the
   steps to create a Google OAuth client and paste the Client ID + Secret.
   *(For "Sign in with Google" you can also use the built-in Google option.)*
3. **Access → Applications → Add an application → Self-hosted.**
   - **Application domain:** your Pages URL, e.g. `weddingwallet.pages.dev`
     (add the custom domain too if you set one).
   - **Identity providers:** enable **Google**.
4. **Add a policy:**
   - Name: `Allowed family`
   - Action: **Allow**
   - Include → **Emails** → add each allowed address
     (e.g. `lahiru9725@gmail.com`, Piyumi's Gmail, `p.saus.ranasinghe@gmail.com`).
     *(Or use "Emails ending in" for a shared domain.)*
5. Save. Now visiting the site forces Google login, and only the listed emails
   pass. Everyone else is blocked at Cloudflare's edge — before the app or the
   API is ever reached.

### Optional extra hardening (verify the login inside the API too)

The API is already behind Access, but you can make it *also* verify the Access
JWT itself (defense-in-depth). In the Access application you'll find an
**Application Audience (AUD) tag**. Add these env vars in Pages and redeploy:

- `CF_ACCESS_TEAM_DOMAIN` = `your-team.cloudflareaccess.com`
- `CF_ACCESS_AUD` = the AUD tag

When both are set, the API rejects any request without a valid Access token
(see [`functions/_lib/access.ts`](functions/_lib/access.ts)). Leave them blank
to rely on edge protection only.

---

## 5. Using the app

- **Home** — dashboard with 3 views: Overview cards, Progress bars, Charts (donuts).
- **Budget** — every item with budget / quoted / paid / balance; tap a card to see
  its payments, add a payment, or delete it. **+ Add** creates a new item.
- **Log** — every transaction, newest first. The **+** button records a payment.
- **Vendors** — auto-built from budget items that have a real vendor; tap Call/Message.
- **People** — how much each person contributed, with a share breakdown.

### Customising

- **Couple name / initials:** edit `COUPLE` in [`src/App.tsx`](src/App.tsx) and the
  avatar in the top bar (and the `<title>` in [`index.html`](index.html)).
- **Currency** is Sri Lankan Rupees (`Rs`). To change it, edit `fmt` / `fmtShort`
  in [`src/lib/format.ts`](src/lib/format.ts).
- **Add people** from the People tab (**+ Person**) or by inserting into the
  `payers` table in Supabase.

---

## Security summary

| Layer | Protection |
|------|-------------|
| Who can open the site | Cloudflare Access — allow-listed Gmail addresses only |
| Database key | `service_role` key lives only in Cloudflare env / `.dev.vars`, never in the browser |
| Direct DB access | Blocked — RLS is on with no public policies, so only the API (service role) can read/write |
| API (optional) | Can verify the Cloudflare Access JWT per request |

## Handy scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | React app with hot reload (needs `dev:api` running for data) |
| `npm run dev:api` | Build + serve the Functions API locally on `:8788` |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run cf:preview` | Build + run the whole thing (SPA + Functions) via Wrangler |
| `npm run typecheck` | Type-check only |
