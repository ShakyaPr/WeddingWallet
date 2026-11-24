# WeddingWallet 💍

A private wedding-expense tracker for **Piyumi & Shakya**. Track every payment,
manage budget items (with vendor + contact), see who paid how much, and get a
full spend summary — all in a phone-shaped web app.

- **Frontend:** React + TypeScript + Vite (single-page app)
- **Backend / API:** Node.js + Hono, which also serves the built SPA. The DB password stays server-side.
- **Database:** PostgreSQL
- **Login:** [Keycloak](https://www.keycloak.org) (OpenID Connect). Users are created in Keycloak; the app has no sign-up page.
- **Hosting:** [Dokploy](https://dokploy.com): one Docker container for the app, plus separate Postgres and Keycloak services

```
Browser ──HTTPS──▶ Dokploy / Traefik ──▶ app container :3000 ──▶ Postgres service :5432
   │                                      ├─ /        React SPA (dist/)
   │                                      ├─ /api/*   JSON API (server/), signed-in users only
   │                                      └─ /auth/*  login / callback / logout
   └──── sign in ────▶ Keycloak (auth.example.com) ◀──── code → tokens (server-side) ──┘
```

The browser never sees a database credential or a Keycloak token. It only gets an
HttpOnly session cookie. Postgres is only reachable on Dokploy's internal network.

**Deploying? See [DEPLOYMENT.md](DEPLOYMENT.md)** for the step-by-step Dokploy
guide: database service, Keycloak (realm, client, users), app service, domain and data import.

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
├── server/                   # Node API (Hono) + static file server
│   ├── index.ts              # entry: env, DB migrate, start HTTP server
│   ├── app.ts                # /api routes + SPA serving
│   ├── db.ts                 # pg pool, applies db/schema.sql on start
│   ├── auth.ts               # Keycloak login (OIDC code flow + PKCE), sessions
│   └── access.ts             # optional Cloudflare Access JWT check
├── db/schema.sql             # tables (idempotent, applied automatically)
├── db/seed.sql               # starter data (loaded only if SEED_DATA=true and DB empty)
├── Dockerfile                # production image used by Dokploy
├── DEPLOYMENT.md             # Dokploy guide
└── design/                   # original Claude design mock (reference only)
```

---

## 1. Local development

You need Node 22+, plus Docker for a local Postgres.

```bash
npm install

# 1. A local Postgres (data persists in the "weddingwallet-db" volume)
docker run -d --name weddingwallet-db -p 5432:5432 \
  -e POSTGRES_USER=weddingwallet -e POSTGRES_PASSWORD=weddingwallet \
  -e POSTGRES_DB=weddingwallet \
  -v weddingwallet-db:/var/lib/postgresql/data postgres:17

# 2. Env file. The defaults match the container above and have
#    AUTH_DISABLED=true (no login locally). Set SEED_DATA=true for the sample budget.
cp .env.example .env

# Terminal A: the API on :3000 (auto-restarts on change, creates tables on start)
npm run dev:api

# Terminal B: the React app with hot reload (proxies /api → :3000)
npm run dev                          # open http://localhost:5173
```

> `.env` holds your local secrets and is git-ignored. Never commit it.

### Testing the Keycloak login locally (optional)

```bash
docker run -d --name keycloak -p 8180:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:26.3.5 start-dev
```

Open http://localhost:8180/admin (admin / admin) and follow DEPLOYMENT.md Parts 2b–2e,
using `http://localhost:5173` in place of `https://wallet.example.com`
(redirect URI `http://localhost:5173/auth/callback`). Then, in `.env`: set
`AUTH_DISABLED=false`, paste the client secret into `OIDC_CLIENT_SECRET`, and restart
`npm run dev:api`. Plain `http` is fine on `localhost` only.

To build the production image exactly as Dokploy does (it needs the Keycloak
variables too; see DEPLOYMENT.md, Part 3):

```bash
docker build -t weddingwallet .
```

---

## 2–4. Deploy, database, login

See **[DEPLOYMENT.md](DEPLOYMENT.md)**:

1. Create a **PostgreSQL** service in Dokploy.
2. Set up **Keycloak**: realm, the `weddingwallet` client, the `weddingwallet-user` role, and users.
3. Create an **Application** from this repo, using Build Type **Dockerfile**.
4. Set `DATABASE_URL` and the `APP_URL` / `OIDC_*` variables. Add a domain on port **3000**.

---

## 5. Using the app

- **Home** — dashboard with Overview, Progress, and Insights, plus explicit missing-quote counts and a provisional projected total.
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
  `payers` table in Postgres. (These are the people who *pay*. App *logins* are
  Keycloak users; see DEPLOYMENT.md, Part 5.)
- **Account / sign out:** tap the round avatar at the top right.

---

## Budget certainty, corrections, and records

- A blank or zero quote means **Awaiting quote**. Use the Budget filter to find these items. The projected total uses each recorded quote, falling back to the planned budget for unquoted items, and never drops below money already paid. Known balances exclude unquoted items and do not offset one vendor's balance with another vendor's overpayment.
- Edit a payment using its pencil button in Payments or in a budget item's payment history. The amount, date, description, payer, and category can all be corrected without replacing its identity.
- **Export data** on Home, Budget, Payments, or the account sheet downloads budget, payment, and full change-history CSV files. Exports include all records, irrespective of filters, and preserve cents. Missing quotes and balances remain blank and are marked explicitly.
- **Change history** shows who added, edited, deleted, or restored records, with timestamps and expandable before/after details. It starts with changes made through the app after this version is deployed; earlier changes and direct database edits are not reconstructed.
- After deleting a payment or a budget item, **Undo** restores it with its original identity. Restoring a budget item also restores its payments. History remains intact.
- The new `activity_log` table is added automatically on server startup. Existing category and payment data are preserved. API details are in [docs/API.md](docs/API.md).

### Regression checks

`npm test` checks budget calculations and CSV handling, then exercises the real HTTP API against an isolated temporary PostgreSQL cluster. It requires PostgreSQL's `pg_config`, `initdb`, and `pg_ctl` locally (or set `PG_BINDIR` to their directory). It never reads the app's `DATABASE_URL`; the temporary database accepts socket connections only and is removed after testing.

## Security summary

| Layer | Protection |
|------|-------------|
| Who can open the site | Keycloak login. Only users you create in Keycloak who have the `weddingwallet-user` role. Self-registration is off. |
| Sessions | Random HttpOnly, `Secure`, `SameSite=Lax` cookie. Only its SHA-256 hash is stored in Postgres. Re-checked with Keycloak every ~5 min, so a disabled user is signed out quickly. |
| Tokens | Keycloak tokens stay on the server (authorization-code flow + PKCE, confidential client). The browser never receives them. |
| CSRF | Same-site cookies plus an origin check on non-JSON form posts (including logout) |
| Database credentials | Only in Dokploy's environment variables and your local `.env`, never in the browser |
| Direct DB access | Blocked: the Postgres service has no external port, so only the app can reach it |
| API (optional) | Verifies the Cloudflare Access JWT per request when `CF_ACCESS_*` are set |

## Handy scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | React app with hot reload (needs `dev:api` running for data) |
| `npm run dev:api` | Node API on `:3000` with auto-reload (reads `.env`) |
| `npm run build` | Typecheck + build the SPA to `dist/` and the server to `dist-server/` |
| `npm start` | Run the built server (SPA + API) on `:3000` |
| `npm run typecheck` | Type-check only |
