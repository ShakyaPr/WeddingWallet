# Deploying WeddingWallet on Dokploy

WeddingWallet runs as **two services inside one Dokploy project**:

```
                    Dokploy server
 ┌────────────────────────────────────────────────────────────┐
 │  Traefik (ports 80/443, HTTPS)                              │
 │     │  wallet.example.com                                   │
 │     ▼                                                       │
 │  [Application] weddingwallet      ──DATABASE_URL──▶  [Database] weddingwallet-db
 │  Dockerfile → Node server :3000                      PostgreSQL :5432
 │  (serves the React SPA + /api)                       (NOT exposed to the internet)
 └────────────────────────────────────────────────────────────┘
```

- The **database** is its own Dokploy PostgreSQL service with its own volume and backups.
- The **app** is one Docker container built from the [`Dockerfile`](Dockerfile). It
  serves the React SPA and the `/api` from port **3000**, and reaches Postgres over
  Dokploy's internal Docker network through the `DATABASE_URL` environment variable.
- On every start the app runs [`db/schema.sql`](db/schema.sql), so you **never have to
  create tables by hand**. The file only uses `create … if not exists`, so this is safe.

> Dokploy's UI changes a little between versions. If a label below doesn't match
> yours exactly, look for the closest one.

---

## 0. Before you start

- [ ] Dokploy is installed on your server and you can log in to the dashboard.
- [ ] This repo, including the Dokploy changes, is **pushed to GitHub** (or another Git host).
- [ ] Dokploy can read the repo:
      **Settings → Git** → connect GitHub (needed for private repos).
      For a public repo you can also use the plain **Git** provider with the HTTPS URL.
- [ ] *(For HTTPS)* you have a domain or subdomain, e.g. `wallet.example.com`, with a
      DNS **A record** pointing to your server's public IP. Ports **80** and **443** must be
      open on the server firewall.

---

## Part 1 — Create the PostgreSQL service

1. **Projects → Create Project.** Name it `WeddingWallet`.
2. Open the project → **Create Service → Database → PostgreSQL**, and fill in:

   | Field | Value | Notes |
   |---|---|---|
   | Name | `weddingwallet-db` | Display name |
   | App Name | *(keep the generated one, e.g. `weddingwallet-db-a1b2c3`)* | This becomes the DB's **internal hostname** |
   | Database Name | `weddingwallet` | |
   | Database User | `weddingwallet` | |
   | Database Password | a long random password | Use **letters and digits only**. Characters like `@ : / # ? %` break the connection URL unless you URL-encode them. |
   | Docker Image | `postgres:17` | Any version **13 or newer** works. 17 also matches the Supabase import in Part 4. |

3. Click **Create**, open the new service, and click **Deploy**.
4. Open the **Logs** tab and wait for
   `database system is ready to accept connections`.
5. On the **General** tab, find **Internal Credentials** and copy the
   **Internal Connection URL**. It looks like this:

   ```
   postgresql://weddingwallet:YOUR_PASSWORD@weddingwallet-db-a1b2c3:5432/weddingwallet
   ```

   This is the app's `DATABASE_URL`. The host part (`weddingwallet-db-a1b2c3`) only
   resolves inside Dokploy's Docker network, which is what you want.

6. **Leave "External Port" empty.** That keeps the database unreachable from the
   internet. You only open it temporarily if you import data (Part 4).

### 1b. Turn on backups (strongly recommended)

This database will hold your only copy of the wedding finances.

1. **Settings → S3 Destinations** (sometimes labelled **Destinations**): add a bucket.
   AWS S3, Cloudflare R2 and Backblaze B2 all work.
2. Open `weddingwallet-db` → **Backups → Create Backup**:
   - **Destination:** the bucket you just added
   - **Database:** `weddingwallet`
   - **Schedule:** `0 2 * * *` (every night at 02:00)
   - **Prefix Destination:** `weddingwallet/`
   - **Keep the latest:** `14`
3. Click **Run Manual Backup** (the ▶ icon) once, then check that a file appeared in the bucket.

To restore later, use **Backups → Restore**: pick the bucket, search for the backup file,
then enter the database name.

---

## Part 2 — Create the WeddingWallet application

1. In the same project: **Create Service → Application**. Name it `weddingwallet`.
   It **must be on the same server** as the database so the internal hostname resolves.

2. **General tab → Provider**
   - **GitHub:** pick the repository and the `main` branch.
     *(or **Git:** paste the repo URL and branch `main`)*
   - Click **Save**.

3. **General tab → Build Type**
   - Build Type: **Dockerfile**
   - Dockerfile Path: `Dockerfile`
   - Docker Context Path: `.`
   - Docker Build Stage: *(leave empty, so the final `runtime` stage is used)*
   - Click **Save**.

4. **Environment tab.** Paste the following, using the URL you copied in Part 1:

   ```env
   DATABASE_URL=postgresql://weddingwallet:YOUR_PASSWORD@weddingwallet-db-a1b2c3:5432/weddingwallet
   PORT=3000
   # true = load the starter budget/payments, but only if the DB is completely empty.
   # Use false if you are importing your Supabase data (Part 4).
   SEED_DATA=true
   ```

   Click **Save**. These are **runtime** variables, so leave **Build Time Arguments** and
   **Build-time Secrets** empty. The build doesn't need any secrets.

   > Tip: rather than pasting the password twice, you can define it once as a project-level
   > variable and reference it as `${{project.DB_PASSWORD}}`.

5. Click **Deploy**. In **Deployments → (latest) → logs** you should see the Docker
   build finish. Then the app's **Logs** tab should show:

   ```
   Database was empty — loaded db/seed.sql        ← only with SEED_DATA=true, first time
   Database schema is up to date
   WeddingWallet listening on http://0.0.0.0:3000
   ```

6. **Domains tab → Create Domain**

   **Quick test (HTTP only):** click the **dice icon** next to *Host* to generate a free
   `*.sslip.io` domain. Then set:
   - Path: `/`
   - Container Port: `3000`
   - HTTPS: **off**
   - Click **Create**.

   **Real domain (HTTPS):** make sure the DNS A record already points at the server. Then set:
   - Host: `wallet.example.com`
   - Path: `/`
   - Container Port: **`3000`**
   - HTTPS: **on**
   - Certificate: **Let's Encrypt**
   - Click **Create**.

   You don't need to redeploy after adding a domain on an application.

7. Open the domain. You should see the dashboard with your data.
   `https://wallet.example.com/api/health` should return `{"ok":true,"db":"up"}`.

8. *(Optional)* If you used `SEED_DATA=true`, set it back to `false` in **Environment**.
   It never duplicates data, but turning it off makes the intent clear.

---

## Part 3 — Lock the site down (do not skip)

The app has **no login screen of its own**. On Cloudflare Pages, Cloudflare Access did
that job. On Dokploy, anyone who finds the URL can see and edit everything until you
add one of the options below.

### Option A — Dokploy Basic Auth (simplest)

1. Open the `weddingwallet` application → **Advanced → Security** → add a
   **Username** and **Password**.
2. Save, then **Redeploy** if Dokploy asks you to.
3. Share the username and password with family. The browser asks for them once and
   remembers them.

This works with the free `sslip.io` domain too, but only use it over **HTTPS**:
over plain HTTP the password is sent unencrypted.
The container's health check isn't affected, because it runs inside the container
and doesn't pass through Traefik.

### Option B — Keep Google login with Cloudflare Access

Use this if you want the same "only these Gmail addresses" behaviour as before. Your
domain's DNS must be on Cloudflare.

1. In Cloudflare DNS, create the A record for `wallet.example.com` as **DNS only**
   (grey cloud). In Dokploy, add the domain with HTTPS and Let's Encrypt as in Part 2,
   then wait until the certificate works.
2. Switch the record to **Proxied** (orange cloud). Set **SSL/TLS → Overview** to
   **Full (strict)**.
3. **Zero Trust → Access → Applications → Add an application → Self-hosted**:
   - Application domain: `wallet.example.com`
   - Identity provider: Google
   - Policy: **Allow**, Include → Emails → your allowed Gmail addresses
4. Copy the application's **Application Audience (AUD) Tag**. In Dokploy, add these to
   the app's **Environment** tab, then click **Deploy**:

   ```env
   CF_ACCESS_TEAM_DOMAIN=your-team.cloudflareaccess.com
   CF_ACCESS_AUD=the-aud-tag
   ```

   The app log should now say `Cloudflare Access JWT check: ON`.
   **This step is required, not optional.** Anyone who knows your server's IP could
   otherwise go around Cloudflare. With these set, the API rejects any request that
   doesn't carry a valid Cloudflare login token.

---

## Part 4 — (Optional) Move your existing data from Supabase

Skip this if you're starting fresh or are happy with the seed data.

The import only copies **data**. The app has already created the tables.

1. Make sure the app has been deployed at least once, so the tables exist. Ideally use
   **`SEED_DATA=false`** so they are also empty. If you already loaded the starter data,
   step 5 shows how to clear it first.

2. **Get the Supabase connection string:** Supabase dashboard → **Connect** →
   **Session pooler** (port **5432**; works over IPv4). It looks like this:
   `postgresql://postgres.abcd1234:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`

3. **Temporarily expose the Dokploy DB:** `weddingwallet-db` → **External Credentials** →
   **External Port** = `5433` → Save. Copy the generated external connection URL
   (it uses your server IP and port 5433). If the server has a firewall, allow 5433
   from your IP only.

4. **Export the data from Supabase.** This uses Docker's `postgres:17` image, because
   `pg_dump` must be at least as new as the Supabase server:

   ```bash
   docker run --rm -v "$PWD":/work postgres:17-alpine \
     pg_dump "postgresql://postgres.abcd1234:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres" \
       --data-only --no-owner --no-privileges --disable-triggers \
       --table=public.payers --table=public.categories --table=public.payments \
       --file=/work/weddingwallet-data.sql
   ```

5. **Import it into Dokploy.** If the tables already contain starter data, clear them
   first by adding `-c "truncate payments, categories, payers"` as a separate run of the
   same `psql` command, without the `-f` part:

   ```bash
   docker run --rm -v "$PWD":/work postgres:17-alpine \
     psql "postgresql://weddingwallet:YOUR_PASSWORD@YOUR_SERVER_IP:5433/weddingwallet" \
       --single-transaction -v ON_ERROR_STOP=1 -f /work/weddingwallet-data.sql
   ```

6. Reload the app and check that your categories, payments and people are all there.

7. **Close the port again:** clear **External Port** and save. Delete
   `weddingwallet-data.sql` from your machine.

*Without opening a port:* copy the file to the server, then run
`docker exec -i $(docker ps -qf name=weddingwallet-db) psql -U weddingwallet weddingwallet < weddingwallet-data.sql`
over SSH.

---

## Part 5 — Day-to-day

- **Deploy updates:** push to `main`. If **Auto Deploy** is on (General tab, GitHub
  provider), Dokploy rebuilds automatically. Otherwise click **Deploy**.
- **Database changes:** add *re-runnable* SQL to [`db/schema.sql`](db/schema.sql)
  (e.g. `alter table categories add column if not exists notes text not null default '';`).
  It is applied on the next start.
- **Zero-downtime redeploys:** the image has a Docker `HEALTHCHECK` on `/api/health`, so
  Swarm waits for the new container to be healthy. To set it in Dokploy explicitly,
  go to **Advanced → Cluster Settings → Swarm Settings → Health Check** and enter:

  ```json
  {
    "Test": ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/api/health"],
    "Interval": 30000000000,
    "Timeout": 10000000000,
    "StartPeriod": 60000000000,
    "Retries": 3
  }
  ```

  The times are in nanoseconds. Use `wget`, not `curl`: the Alpine image has no `curl`.

---

## Environment variables

| Variable | Required | Example | What it does |
|---|---|---|---|
| `DATABASE_URL` | **yes** | `postgresql://weddingwallet:pw@weddingwallet-db-a1b2c3:5432/weddingwallet` | Postgres connection. In Dokploy, use the DB's **Internal Connection URL**. |
| `PORT` | no | `3000` | Port the server listens on. Must match the domain's **Container Port**. |
| `SEED_DATA` | no | `true` | Loads [`db/seed.sql`](db/seed.sql) on start, but only into a completely empty DB. |
| `CF_ACCESS_TEAM_DOMAIN` | no | `team.cloudflareaccess.com` | With `CF_ACCESS_AUD`, enables Cloudflare Access JWT checks (Part 3, Option B). |
| `CF_ACCESS_AUD` | no | `4f3c…` | Cloudflare Access Application Audience tag. |

## Troubleshooting

| Symptom (app **Logs** tab) | Fix |
|---|---|
| `Waiting for Postgres … ENOTFOUND weddingwallet-db-…` | The host in `DATABASE_URL` is wrong, the DB service isn't deployed, or the DB is on a different server. Copy the **Internal Connection URL** again. |
| `password authentication failed` | The password in `DATABASE_URL` doesn't match. If it contains special characters, URL-encode them (`@` → `%40`, `#` → `%23`, …). |
| `DATABASE_URL is not set` | Add it in **Environment**, click **Save**, then **Deploy**. |
| `Could not prepare the database` | The app retried for about 60 s and gave up. Check the DB service's logs. Swarm restarts the app automatically. |
| Domain shows **404 / Bad Gateway** | The domain's **Container Port** must be `3000`. |
| Let's Encrypt certificate never appears | The DNS record isn't pointing at the server yet, or ports 80/443 are closed. With Cloudflare, the record must be **DNS only** while the certificate is issued. |
