# SM_BtechSyllabus - Supabase setup (run in the Supabase SQL editor)

Paste the whole script below into **SQL Editor** (`supabase.com/dashboard` → your project → SQL Editor → New query → Run).
Then copy API keys into `.env.local` (see `.env.example`).

```sql
-- ============================================================
-- 1. Extensions
-- ============================================================
create extension if not exists pgcrypto;

-- ============================================================
-- 2. Tables
-- ============================================================

-- Landing-page modules (Python Lab, DBMS, COA, ...)
create table if not exists public.modules (
  id          text primary key,                    -- 'python', 'dbms', 'coa', ...
  name        text not null,
  status      text not null default 'soon'
              check (status in ('ready', 'soon')),
  sort_order  int not null default 0,
  tagline     text,                                -- short description on the card
  meta        jsonb not null default '{}'::jsonb,  -- { "stats": [...], "features": [...] }
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Master login (PIN is stored only as a bcrypt hash)
create table if not exists public.admins (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  pin_hash   text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row per week (= one weekly lab report)
create table if not exists public.weeks (
  id              uuid primary key default gen_random_uuid(),
  module_id       text not null references public.modules(id) on delete cascade,
  week_number     int not null check (week_number >= 1),
  title           text not null,
  done_on         date,                              -- the day the lab was performed
  links           jsonb not null default '[]'::jsonb, -- [{title, url}] external links
  print_pages     int[] not null default '{}',
  handwrite_pages int[] not null default '{}',
  total_pages     int,
  has_plan        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (module_id, week_number)
);

-- Cloudinary asset metadata per week
create table if not exists public.files (
  id                   uuid primary key default gen_random_uuid(),
  week_id              uuid not null references public.weeks(id) on delete cascade,
  kind                 text not null
    check (kind in ('full_pdf', 'docx', 'page_print', 'page_handwrite')),
  page_no              int,
  cloudinary_public_id text not null unique,
  url                  text not null,
  original_name        text,
  size_bytes           bigint,
  uploaded_at          timestamptz not null default now(),
  unique (week_id, kind, page_no)
);

create index if not exists idx_weeks_module on public.weeks (module_id, week_number);
create index if not exists idx_files_week on public.files (week_id, kind, page_no);

-- ============================================================
-- 3. Row Level Security
--    Public pages read content tables anonymously (SELECT only).
--    Everything else (insert/update/delete + admins) is blocked
--    for anon and only the service-role server can write.
-- ============================================================
alter table public.modules enable row level security;
alter table public.weeks   enable row level security;
alter table public.files   enable row level security;
alter table public.admins  enable row level security;

drop policy if exists "public read modules" on public.modules;
create policy "public read modules" on public.modules for select using (true);

drop policy if exists "public read weeks" on public.weeks;
create policy "public read weeks" on public.weeks for select using (true);

drop policy if exists "public read files" on public.files;
create policy "public read files" on public.files for select using (true);

-- admins gets NO policy -> not readable by the browser at all.

-- ============================================================
-- 4. Login check RPC (bcrypt via pgcrypto, never plaintext)
-- ============================================================
create or replace function public.check_admin(candidate text, pin text)
returns boolean
language sql
security definer
set search_path = extensions, public, pg_catalog
as $$
  select exists (
    select 1 from public.admins
    where lower(name) = lower(candidate)
      and active
      and pin_hash = crypt(pin, pin_hash)
  );
$$;

-- ============================================================
-- 5. Seeds
-- ============================================================

-- Modules (edit stats/features later from the dashboard)
insert into public.modules (id, name, status, sort_order, tagline, meta) values
('python', 'Python Lab', 'ready', 1,
 'Weekly Reports - Print Plan. Page-by-page print/handwrite breakdown for the final report.',
 '{"stats":["4 Weekly Reports","30 Pages","Print · Handwrite"],
   "features":[
     "Page chips - open any page PDF in a new tab",
     "Open Full PDF link per report",
     "Merge print pages into a single PDF download",
     "Access all files as DOCX"]}'),
('dbms', 'DBMS', 'soon', 2, 'Coming soon.', '{"stats":[],"features":[]}'),
('coa',  'COA',  'soon', 3, 'Coming soon.', '{"stats":[],"features":[]}')
on conflict (id) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  meta = excluded.meta;

-- Master admin (change the PIN inside crypt() before running, if you want)
insert into public.admins (name, pin_hash) values
('sayantan', crypt('17071999bwubts25503', gen_salt('bf')))
on conflict (name) do nothing;

-- ============================================================
-- 6. Verify
-- ============================================================
-- select * from public.modules;
-- select public.check_admin('sayantan', '17071999bwubts25503');  -- should return true
```

## After running

If you already ran the script before these fixes (you get the “page files not saving” / `unique (week_id, kind)` issue), run this migration **once**:

```sql
alter table public.files drop constraint if exists files_week_id_kind_key;
alter table public.weeks add column if not exists done_on date;
alter table public.weeks add column if not exists links jsonb not null default '[]'::jsonb;
```

Then Re-split the affected weeks from the dashboard.

1. Grab keys: **Project Settings → API** - copy `URL`, `anon public`, `service_role`. Service role is a write key: only ever put it in your server env, never expose it.
2. Create `.env.local` from `.env.example` and fill everything in.
3. On Vercel, add the same variables in **Settings → Environment Variables**.
4. Deploy, then log in with `sayantan` + your PIN at `/admin` and upload your Week PDFs - the dashboard validates filenames and auto-splits the pages.
5. **Cloudinary**: your account must allow PDF delivery (free plans block it by default). Go to Cloudinary → **Settings → Security → “PDF and ZIP files delivery” → Allow delivery of PDF and ZIP files → Save**. Otherwise every `.pdf` URL returns 401 and PDFs won’t open.