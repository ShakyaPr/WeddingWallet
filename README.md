# WeddingWallet 💍

A private wedding-expense tracker for **Piyumi & Shakya**. Track every payment,
manage budget items (with vendor + contact), see who paid how much, and get a
full spend summary — all in a phone-shaped web app.

- **Frontend:** React + TypeScript + Vite (single-page app)
- **Backend / API:** Node.js + Hono, which also serves the built SPA. The DB password stays server-side.
- **Database:** PostgreSQL
- **Hosting:** [Dokploy](https://dokploy.com): one Docker container for the app plus a separate Postgres service

```
Browser ──HTTPS──▶ Dokploy / Traefik ──▶ app container :3000 ──▶ Postgres service :5432
                                          ├─ /        React SPA (dist/)
                                          └─ /api/*   JSON API (server/)
```

The browser never sees a database credential. Postgres is only reachable on
Dokploy's internal network.

**Deploying? See [DEPLOYMENT.md](DEPLOYMENT.md)** for the step-by-step Dokploy
guide: database service, app service, domain, login protection and data import.

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

# 2. Env file. The defaults match the container above.
#    Set SEED_DATA=true to start with the sample budget.
cp .env.example .env

# Terminal A: the API on :3000 (auto-restarts on change, creates tables on start)
npm run dev:api

# Terminal B: the React app with hot reload (proxies /api → :3000)
npm run dev                          # open http://localhost:5173
```

> `.env` holds your local secrets and is git-ignored. Never commit it.

To run the production build exactly as Dokploy does:

```bash
docker build -t weddingwallet .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgresql://weddingwallet:weddingwallet@host.docker.internal:5432/weddingwallet \
  weddingwallet                       # open http://localhost:3000
```

---

## 2–4. Deploy, database, login

See **[DEPLOYMENT.md](DEPLOYMENT.md)**:

1. Create a **PostgreSQL** service in Dokploy.
2. Create an **Application** from this repo, using Build Type **Dockerfile**.
3. Set `DATABASE_URL` to the DB's *Internal Connection URL*. Add a domain on port **3000**.
4. Protect the site with **Basic Auth** (Dokploy → Advanced → Security) or **Cloudflare Access** (Google login).

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
  `payers` table in Postgres.

---

## Security summary

| Layer | Protection |
|------|-------------|
| Who can open the site | Dokploy Basic Auth, or Cloudflare Access (allow-listed Gmail addresses). See DEPLOYMENT.md, Part 3 |
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
