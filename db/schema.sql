-- ============================================================================
--  WeddingWallet — Postgres schema
--
--  The API server applies this file automatically every time it starts
--  (see server/db.ts), so it MUST stay idempotent: only `create ... if not
--  exists`, never `drop`. To change a column later, add an `alter table ...`
--  statement that is safe to re-run (e.g. `add column if not exists`).
--
--  Needs Postgres 13+ (gen_random_uuid() is built in from 13 onwards).
-- ============================================================================

-- People who pay ------------------------------------------------------------
create table if not exists payers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,          -- stored on each payment as `paid_by`
  short_name text not null,
  color      text not null default '#8FA1B3',
  tint       text not null default '#EEF1F4',
  created_at timestamptz not null default now()
);

-- Budget items / categories -------------------------------------------------
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  vendor     text not null default 'To be decided',
  contact    text not null default '',
  budget     numeric(14,2) not null default 0,   -- what you planned to spend
  quote      numeric(14,2) not null default 0,   -- vendor's quoted / committed price
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

-- Individual payments / transactions ---------------------------------------
create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  date        date not null default current_date,
  item        text not null default 'Payment',   -- e.g. "Advance", "Settlement"
  paid_by     text not null,                      -- payer name
  amount      numeric(14,2) not null check (amount > 0),
  created_at  timestamptz not null default now()
);

create index if not exists payments_category_id_idx on payments(category_id);
create index if not exists payments_date_idx on payments(date);

-- Login sessions (Keycloak) ---------------------------------------------------
-- One row per signed-in browser. The browser's cookie holds a random token;
-- only its SHA-256 hash is stored here, so a leaked DB dump can't be used to
-- hijack sessions. Users themselves live in Keycloak, not in this database.
create table if not exists sessions (
  id                text primary key,             -- sha256(cookie token)
  sub               text not null,                -- Keycloak user id
  username          text not null default '',
  email             text not null default '',
  name              text not null default '',
  id_token          text not null default '',     -- used as id_token_hint on logout
  refresh_token     text,                         -- used to re-check the user with Keycloak
  access_expires_at timestamptz not null,         -- re-check with Keycloak after this
  expires_at        timestamptz not null,         -- hard end (Keycloak's refresh token lifetime)
  created_at        timestamptz not null default now()
);

create index if not exists sessions_expires_at_idx on sessions(expires_at);

-- App changes are saved atomically with their records. No FK to live records:
-- a deleted item must remain readable in history and available for undo.
create table if not exists activity_log (
  id           bigserial primary key,
  entity_type  text not null check (entity_type in ('category', 'payment', 'person')),
  entity_id    uuid not null,
  entity_label text not null,
  action       text not null check (action in ('created', 'updated', 'deleted', 'restored')),
  actor_id     text not null,
  actor_name   text not null,
  before_data  jsonb,
  after_data   jsonb,
  restores_id  bigint unique references activity_log(id),
  created_at   timestamptz not null default clock_timestamp()
);
