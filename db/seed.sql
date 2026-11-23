-- ============================================================================
--  WeddingWallet — starter data (from the Google Sheet + design).
--
--  Applied only when the server starts with SEED_DATA=true AND all three
--  tables are empty (see server/db.ts), so it can never duplicate rows.
--  Leave SEED_DATA unset to start with an empty database, or when you are
--  importing your existing data from Supabase instead (see DEPLOYMENT.md).
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
