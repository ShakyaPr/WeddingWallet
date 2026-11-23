-- ============================================================================
--  WeddingWallet — Supabase schema
--  Run this in the Supabase dashboard → SQL Editor → New query → Run.
--  Safe to re-run: it drops and recreates the tables.
-- ============================================================================

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto";  -- for gen_random_uuid()

-- Clean slate ---------------------------------------------------------------
drop table if exists payments cascade;
drop table if exists categories cascade;
drop table if exists payers cascade;

-- People who pay ------------------------------------------------------------
create table payers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,          -- stored on each payment as `paid_by`
  short_name text not null,
  color      text not null default '#8FA1B3',
  tint       text not null default '#EEF1F4',
  created_at timestamptz not null default now()
);

-- Budget items / categories -------------------------------------------------
create table categories (
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
create table payments (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  date        date not null default current_date,
  item        text not null default 'Payment',   -- e.g. "Advance", "Settlement"
  paid_by     text not null,                      -- payer name
  amount      numeric(14,2) not null check (amount > 0),
  created_at  timestamptz not null default now()
);

create index payments_category_id_idx on payments(category_id);
create index payments_date_idx on payments(date);

-- ============================================================================
--  Row Level Security
--  RLS is ENABLED with NO policies, so the public `anon` and `authenticated`
--  roles are fully denied. Only the `service_role` key (used server-side by
--  the Cloudflare Pages Function) bypasses RLS. The database is therefore
--  never reachable from a browser — access is only via the Access-protected API.
-- ============================================================================
alter table payers     enable row level security;
alter table categories enable row level security;
alter table payments   enable row level security;

-- ============================================================================
--  Seed data (from your Google Sheet + design). Delete this block if you'd
--  rather start empty — the app lets you add everything from the UI.
-- ============================================================================
insert into payers (name, short_name, color, tint) values
  ('Piyumi Home',                  'Piyumi',  '#A05C6A', '#F6E7EA'),
  ('Shakya Rathnaweera',           'Shakya',  '#7E4451', '#F1E4E6'),
  ('p.saus.ranasinghe@gmail.com',  'Pasindu', '#C9A15B', '#F7EFDD');

insert into categories (name, vendor, contact, budget, quote, sort_order) values
  ('Decoration',        'Grooms Art',    '0112 828 298 / 077 230 9474', 450000,  500000,  1),
  ('Wedding Hall',      'Pasindu',       '076 800 1412',                120000,  100000,  2),
  ('Cake',              'Dilanthi Cake', '071 624 8127',                  8000,    5000,  3),
  ('Gold & Jewellery',  'Raja Jewelers', '',                           1800000, 1859000,  4),
  ('Photography',       'To be decided', '',                            150000,       0,  5),
  ('Music & Band',      'To be decided', '',                             90000,       0,  6);

-- Payments reference categories by name via a lookup so the UUIDs match.
insert into payments (category_id, date, item, paid_by, amount)
select c.id, v.date::date, v.item, v.paid_by, v.amount
from (values
  ('Decoration',       '2026-06-14', 'Advance',      'Shakya Rathnaweera',           5000),
  ('Wedding Hall',     '2026-06-14', 'Booking',      'p.saus.ranasinghe@gmail.com', 100000),
  ('Cake',             '2026-06-14', 'Booking',      'p.saus.ranasinghe@gmail.com',   5000),
  ('Gold & Jewellery', '2026-07-04', 'Part payment', 'Shakya Rathnaweera',          200000),
  ('Gold & Jewellery', '2026-07-04', 'Settlement',   'Piyumi Home',                1659000)
) as v(cat, date, item, paid_by, amount)
join categories c on c.name = v.cat;
