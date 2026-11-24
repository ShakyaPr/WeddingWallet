# Deploying WeddingWallet on Dokploy

WeddingWallet runs as **three services inside one Dokploy project**:

```
                           Dokploy server
 ┌─────────────────────────────────────────────────────────────────────────┐
 │  Traefik (ports 80/443, HTTPS)                                          │
 │     │ wallet.example.com                    │ auth.example.com          │
 │     ▼                                       ▼                           │
 │  [Application] weddingwallet  ◀── OIDC ──▶  [Template] keycloak         │
 │  Dockerfile → Node server :3000             Keycloak :8080              │
 │  (serves the React SPA + /api)              (+ its own Postgres)        │
 │     │ DATABASE_URL                                                      │
 │     ▼                                                                   │
 │  [Database] weddingwallet-db   PostgreSQL :5432 (NOT exposed)           │
 └─────────────────────────────────────────────────────────────────────────┘
```

- The **database** is its own Dokploy PostgreSQL service with its own volume and backups.
- **Keycloak** handles sign-in. You create the users there; the app has no sign-up page.
- The **app** is one Docker container built from the [`Dockerfile`](Dockerfile). It
  serves the React SPA and the `/api` from port **3000**, and reaches Postgres over
  Dokploy's internal Docker network through the `DATABASE_URL` environment variable.
- On every start the app runs [`db/schema.sql`](db/schema.sql), so you **never have to
  create tables by hand**. The file only uses `create … if not exists`, so this is safe.

**How login works:** when you open the app, it sends you to Keycloak's login page. After
you sign in, Keycloak sends you back, and the app server keeps your session in Postgres.
Your browser only gets an HttpOnly session cookie, never any Keycloak tokens. The server
re-checks each session with Keycloak every few minutes (whenever Keycloak's access token
expires). So if you disable a user or remove their access in Keycloak, they are signed
out of the app within about 5 minutes.

> Dokploy's UI changes a little between versions. If a label below doesn't match
> yours exactly, look for the closest one.

---

## 0. Before you start

- [ ] Dokploy is installed on your server and you can log in to the dashboard.
- [ ] This repo, including the Dokploy changes, is **pushed to GitHub** (or another Git host).
- [ ] Dokploy can read the repo:
      **Settings → Git** → connect GitHub (needed for private repos).
      For a public repo you can also use the plain **Git** provider with the HTTPS URL.
- [ ] **Two subdomains with HTTPS**, each with a DNS **A record** pointing to your
      server's public IP:
      - `wallet.example.com` for the app
      - `auth.example.com` for Keycloak

      Ports **80** and **443** must be open on the server firewall.
      Login needs HTTPS: Keycloak's cookies are `Secure`, so the free HTTP-only
      `sslip.io` domains won't work for signing in.

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

## Part 2 — Set up Keycloak

> **Already have a Keycloak server?** Skip 2a and do 2b–2e in your existing Keycloak.
> You can use any realm, but a dedicated one keeps the family's accounts separate.

### 2a. Deploy Keycloak on Dokploy

1. In the same project: **Create Service → Template**, search for **Keycloak**, and
   create it. The template includes Keycloak 26 and its own Postgres database for
   Keycloak's data (users, settings).
2. Open the new service and edit its compose file:
   - Change `command: start-dev` to **`command: start`**. `start-dev` is Keycloak's
     development mode; `start` is production mode. The template already sets the
     options production mode needs: `KC_HTTP_ENABLED=true`, `KC_PROXY_HEADERS=xforwarded`
     and `KC_HOSTNAME`.
   - Make sure `KC_HOSTNAME` resolves to your Keycloak domain, e.g.
     `https://auth.example.com`. If the compose file uses a variable there, set that
     variable in the **Environment** tab.
3. **Domains tab:** set the domain for the `keycloak` service to:
   - Host: `auth.example.com`
   - Container Port: **`8080`** (Keycloak's port inside its container; it doesn't clash
     with anything on the server)
   - HTTPS **on**, Certificate **Let's Encrypt**
4. **Environment tab:** note the generated admin password (`KEYCLOAK_ADMIN_PASSWORD`, or
   similar), then click **Deploy**.
5. Open `https://auth.example.com/admin` and sign in as `admin` with that password.

Keycloak's own database lives inside this template's compose service, not in
`weddingwallet-db`. It holds your user accounts, so if you don't want to recreate users
after a server loss, back up its volume (Dokploy **Volume Backups**) or export the realm
from time to time.

### 2b. Create a realm

1. Open the realm dropdown at the top left → **Create realm**.
2. Set **Realm name** to `weddingwallet`, then click **Create**. The name is
   case-sensitive and becomes part of the issuer URL.
3. In **Realm settings**:
   - **Login** tab: keep **User registration** **off**, so only accounts you create
     can sign in. Optionally turn on **Remember me**.
   - **Security defenses → Brute force detection:** turn it **on**. This locks out
     password-guessing on the public login page.

### 2c. Create the client for WeddingWallet

1. **Clients → Create client**
   - **General settings:** Client type **OpenID Connect**, Client ID **`weddingwallet`**.
     Click **Next**.
   - **Capability config:** **Client authentication: On**. Under *Authentication flow*,
     tick **Standard flow** and untick **Direct access grants**. If a **PKCE Method**
     field is shown, choose `S256`. Click **Next**.
   - **Login settings:**

     | Field | Value |
     |---|---|
     | Root URL | `https://wallet.example.com` |
     | Home URL | `https://wallet.example.com` |
     | Valid redirect URIs | `https://wallet.example.com/auth/callback` |
     | Valid post logout redirect URIs | `https://wallet.example.com/*` |
     | Web origins | *(leave empty)* |

     Click **Save**.
2. Open the client's **Credentials** tab and copy the **Client Secret**. The app needs it
   as `OIDC_CLIENT_SECRET`.

### 2d. Create the access role (recommended)

**Realm roles → Create role**, set **Role name** to `weddingwallet-user`, then click
**Save**. The app only lets in users who have this role (`OIDC_REQUIRED_ROLE`), so a
Keycloak account alone isn't enough to see the finances.

### 2e. Create the users

For each family member:

1. **Users → Add user**
   - **Username:** e.g. `piyumi`
   - **Email:** their email, with **Email verified: On**
   - **First name / Last name:** these are shown in the app's account menu
   - Click **Create**.
2. **Credentials** tab → **Set password**. Enter a password and leave **Temporary**
   **on**, so they must choose their own password at first login. Click **Save**.
3. **Role mapping** tab → **Assign role** → **Filter by realm roles** → tick
   `weddingwallet-user` → **Assign**.

---

## Part 3 — Create the WeddingWallet application

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

4. **Environment tab.** Paste the following, using your values from Parts 1 and 2:

   ```env
   DATABASE_URL=postgresql://weddingwallet:YOUR_PASSWORD@weddingwallet-db-a1b2c3:5432/weddingwallet
   PORT=3000
   # true = load the starter budget/payments, but only if the DB is completely empty.
   # Use false if you are importing your Supabase data (Part 4).
   SEED_DATA=true

   # Login with Keycloak
   APP_URL=https://wallet.example.com
   OIDC_ISSUER=https://auth.example.com/realms/weddingwallet
   OIDC_CLIENT_ID=weddingwallet
   OIDC_CLIENT_SECRET=paste-the-client-secret-from-2c
   OIDC_REQUIRED_ROLE=weddingwallet-user
   ```

   Click **Save**. These are **runtime** variables, so leave **Build Time Arguments** and
   **Build-time Secrets** empty. The build doesn't need any secrets.

   - `APP_URL` must be exactly the app's public address: `https`, and no trailing
     slash. It's used to build the redirect URI you registered in 2c.
   - `OIDC_ISSUER` is your Keycloak URL + `/realms/` + the realm name.
   - The app **refuses to start** if any of the login variables are missing. That's
     deliberate: it can never run without a login by accident.

   > Tip: rather than pasting the password twice, you can define it once as a project-level
   > variable and reference it as `${{project.DB_PASSWORD}}`.

5. **Domains tab → Create Domain**
   - Host: `wallet.example.com`
   - Path: `/`
   - Container Port: **`3000`**. This is the port inside the app's container. It doesn't
     clash with Dokploy's own dashboard on the server's port 3000.
   - HTTPS: **on**
   - Certificate: **Let's Encrypt**
   - Click **Create**.

6. Click **Deploy**. In **Deployments → (latest) → logs** you should see the Docker
   build finish. Then the app's **Logs** tab should show:

   ```
   Database was empty — loaded db/seed.sql        ← only with SEED_DATA=true, first time
   Database schema is up to date
   Keycloak login: ON (issuer https://auth.example.com/realms/weddingwallet, client weddingwallet)
   WeddingWallet listening on http://0.0.0.0:3000
   ```

7. Open `https://wallet.example.com`. You'll be sent to the Keycloak login page. Sign in
   as one of the users from 2e (and set a new password if it was temporary). You land
   back on the dashboard. Tap the round avatar at the top right to see who is signed in
   and to **Sign out**.

8. *(Optional)* If you used `SEED_DATA=true`, set it back to `false` in **Environment**.
   It never duplicates data, but turning it off makes the intent clear.

> **Upgrading from the earlier Basic Auth setup?** Remove it under **Advanced → Security**.
> Otherwise people have to log in twice.

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

### Managing who can sign in (all in Keycloak)

| To… | In Keycloak (realm `weddingwallet`) |
|---|---|
| Add a person | Create the user, set a password, assign `weddingwallet-user` (Part 2e) |
| Reset a password | **Users →** the user **→ Credentials → Reset password** |
| Block someone | **Users →** the user → turn **Enabled** off. They're signed out of the app within ~5 min. |
| Remove access but keep the account | **Role mapping** → unassign `weddingwallet-user`. Also takes effect within ~5 min. |
| Sign someone out now | **Users →** the user **→ Sessions → Sign out** |

How quickly these take effect depends on Keycloak's **Access Token Lifespan**
(**Realm settings → Tokens**, default 5 minutes). The app re-checks each session with
Keycloak whenever that token expires.

### How long people stay signed in

This is controlled by Keycloak, under **Realm settings → Sessions**. The defaults are
**SSO Session Idle** 30 minutes and **SSO Session Max** 10 hours: after 30 minutes
without using the app, or 10 hours in total, people enter their password again. For a
family app you might set Idle to `7 days` and Max to `30 days`. Alternatively, turn on
**Remember me** (Realm settings → Login) and set the *Remember Me* versions of those two
values.

### Deploying and maintenance

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
  `/api/health` is the only URL that works without signing in.

---

## Environment variables

| Variable | Required | Example | What it does |
|---|---|---|---|
| `DATABASE_URL` | **yes** | `postgresql://weddingwallet:pw@weddingwallet-db-a1b2c3:5432/weddingwallet` | Postgres connection. In Dokploy, use the DB's **Internal Connection URL**. |
| `APP_URL` | **yes** | `https://wallet.example.com` | The app's public URL. Used for the login redirect and cookie security. |
| `OIDC_ISSUER` | **yes** | `https://auth.example.com/realms/weddingwallet` | Keycloak realm URL. |
| `OIDC_CLIENT_ID` | **yes** | `weddingwallet` | Keycloak client ID (Part 2c). |
| `OIDC_CLIENT_SECRET` | **yes** | `aBcD…` | Keycloak client secret (client → **Credentials**). |
| `OIDC_REQUIRED_ROLE` | no | `weddingwallet-user` | Only users with this realm or client role can sign in. Leave empty to allow every user in the realm. |
| `PORT` | no | `3000` | Port the server listens on. Must match the domain's **Container Port**. |
| `SEED_DATA` | no | `true` | Loads [`db/seed.sql`](db/seed.sql) on start, but only into a completely empty DB. |
| `AUTH_DISABLED` | no | `true` | **Local development only.** Skips login. The Docker image refuses to start with it. |
| `CF_ACCESS_TEAM_DOMAIN` / `CF_ACCESS_AUD` | no | | Optional extra layer if the site is *also* behind Cloudflare Access: the API then checks the Access JWT too (see [`server/access.ts`](server/access.ts)). |

## Troubleshooting

| Symptom | Fix |
|---|---|
| Log: `Waiting for Postgres … ENOTFOUND weddingwallet-db-…` | The host in `DATABASE_URL` is wrong, the DB service isn't deployed, or the DB is on a different server. Copy the **Internal Connection URL** again. |
| Log: `password authentication failed` | The password in `DATABASE_URL` doesn't match. If it contains special characters, URL-encode them (`@` → `%40`, `#` → `%23`, …). |
| Log: `DATABASE_URL is not set` | Add it in **Environment**, click **Save**, then **Deploy**. |
| Log: `Could not prepare the database` | The app retried for about 60 s and gave up. Check the DB service's logs. Swarm restarts the app automatically. |
| Log: `Keycloak login is not configured. Missing: …` | Add the listed variables in **Environment**, then **Deploy**. |
| Log: `Keycloak login: cannot reach https://auth…` | Check `OIDC_ISSUER`: the realm name is case-sensitive, and there's no trailing `/`. Is Keycloak running, and does `https://auth.example.com/realms/weddingwallet` open in a browser? The app server must also be able to reach that public URL itself. |
| Log: `… issuer does not match the expected issuer` | `OIDC_ISSUER` must be Keycloak's **public** URL (the one in `KC_HOSTNAME`), e.g. `https://auth.example.com/realms/weddingwallet`, not an internal Docker hostname. |
| Keycloak page: **Invalid parameter: redirect_uri** | **Valid redirect URIs** in the Keycloak client must be exactly `APP_URL` + `/auth/callback`, e.g. `https://wallet.example.com/auth/callback`. |
| App page: **Sign-in failed** | Look for `Code exchange failed:` in the app log. `invalid_client` / `unauthorized_client` means `OIDC_CLIENT_SECRET` is wrong, or **Client authentication** is off in the client. |
| App page: **No access** | The user is missing the `weddingwallet-user` role (Part 2e). Use **Sign in as someone else** to switch accounts. |
| After **Sign out**, Keycloak shows an error about the redirect URI | Add `https://wallet.example.com/*` to **Valid post logout redirect URIs**. |
| Keycloak login loops or says **Cookie not found** | Both the app and Keycloak must use **HTTPS** with real domains (Part 0). |
| People get signed out too often | Increase **SSO Session Idle / Max** (Part 5). |
| `http://SERVER_IP:3000` shows the Dokploy dashboard | That's expected: the app isn't published on the server's port 3000. Open it through its domain. |
| Domain shows **404 / Bad Gateway** | The domain's **Container Port** must be `3000` for the app, or `8080` for Keycloak. |
| Let's Encrypt certificate never appears | The DNS record isn't pointing at the server yet, or ports 80/443 are closed. With Cloudflare, the record must be **DNS only** while the certificate is issued. |
