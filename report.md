# BWU - Report

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16.3.0 (App Router, Turbopack) |
| UI | React 19.2.8, TypeScript 5 |
| Backend | Supabase (PostgreSQL + RPC) |
| Storage | Cloudinary (PDF + DOCX) |
| Auth | jose JWT, PIN-based admin login |
| PDF | pdf-lib 1.17.1 (split + merge) |
| Styling | Neumorphic dark UI, pure CSS |

---

## Features

### Public Pages

| # | Feature | Status |
|---|---------|--------|
| F01 | Module listing (neumorphic cards from DB) | Done |
| F02 | Week cards with print/handwrite chips | Done |
| F03 | Page chip viewer (open PDF in new tab) | Done |
| F04 | Download Printing Pages (merged PDF, proper filename) | Done |
| F05 | DOCX dropdown per week | Done |
| F06 | Week date read-only chip | Done |

### Admin Dashboard

| # | Feature | Status |
|---|---------|--------|
| F07 | PIN-based admin login (Supabase RPC + JWT) | Done |
| F08 | Dashboard with module tabs + week list | Done |
| F09 | Upload & Auto-Split (filename parser + Cloudinary) | Done |
| F10 | Re-split Pages (idempotent, no duplicates) | Done |
| F11 | DOCX upload/replace (old file cleaned up) | Done |
| F12 | Title editing (inline form) | Done |
| F13 | Date picker (custom neumorphic calendar) | Done |
| F14 | Delete week (Cloudinary + DB cleanup) | Done |
| F15 | Module status toggle (ready/soon) | Done |

### UX

| # | Feature | Status |
|---|---------|--------|
| F16 | Loading spinners on all buttons | Done |
| F17 | Toast notifications (success/error, auto-dismiss) | Done |
| F18 | Admin session middleware (proxy.ts) | Done |
| F19 | DOCX proxy + print-merge API (Cloudinary fix) | Done |
| F20 | Filename parser (WeekN_(print pages)_Title) | Done |
| F21 | Idempotent re-split (clearPageFiles first) | Done |

---

## Database Schema

```
modules
  id          uuid PK
  name        text
  slug        text unique
  description text
  status      text default 'soon'
  created_at  timestamptz

weeks
  id              uuid PK
  module_id       uuid FK -> modules
  week_number     int
  title           text
  print_pages     int[]
  total_pages     int
  handwrite_pages int[]
  has_plan        boolean default false
  done_on         date
  created_at      timestamptz
  UNIQUE(module_id, week_number)

files
  id                    uuid PK
  week_id               uuid FK -> weeks
  kind                  text (full_pdf | page_print | page_handwrite | docx)
  page_no               int
  cloudinary_public_id  text
  url                   text
  original_name         text
  size_bytes            bigint
  created_at            timestamptz
  -- No unique constraint on (week_id, kind)

admins
  id            uuid PK
  name          text unique
  password_hash text
  created_at    timestamptz
```

RPC: `check_admin(candidate, pin) -> boolean` (search_path: extensions, public, pgcryptogc)

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/weeks/[id]/print-merge` | GET | Merge print pages into single PDF |
| `/api/weeks/[id]/docx` | GET | Proxy DOCX download with correct filename |

---

## File Structure

```
app/
  layout.tsx              # Root layout + ToastProvider
  page.tsx                # Module listing
  globals.css             # Full stylesheet (1300+ lines)
  modules/[module]/
    page.tsx              # Week cards
  admin/
    page.tsx              # Dashboard
    login/page.tsx        # Login form
  api/weeks/[id]/
    print-merge/route.ts  # PDF merge endpoint
    docx/route.ts         # DOCX proxy

components/
  PrintPlan.tsx           # Public week cards
  AdminDashboard.tsx      # Admin panel
  NeumorphicDatePicker.tsx # Calendar picker
  ToastProvider.tsx       # Toast context + renderer

lib/
  types.ts               # TypeScript types
  actions.ts             # All server actions (366 lines)
  weeks.ts               # DB queries
  weekname.ts            # Filename parser
  session.ts             # JWT session
  cloudinary.ts          # Upload/delete
  supabase/server.ts     # Admin client
  supabase/client.ts     # Browser client

proxy.ts                 # Admin session middleware
supabase.md              # SQL schema + migration
report.json              # Machine-readable report
report.md                # This file
```

---

## Changelog

### Phase 1 - Foundation (2025-07-14)
- Next.js 16 scaffold with App Router + TypeScript
- Supabase + Cloudinary + jose setup
- DB schema (modules, weeks, files, admins)
- Public pages (module listing, week cards)
- Admin (login, dashboard, upload/split, re-split, DOCX, title, date, delete, status toggle)
- APIs (print-merge, docx proxy)
- Neumorphic dark UI

### Phase 2 - DB Fixes + Cloudinary (2025-07-15)
- Fixed check_admin RPC search_path
- Dropped unique (week_id, kind) constraint
- Added done_on column to weeks
- Cloudinary PDF delivery enabled
- E2E re-split verified for 3 weeks

### Phase 3 - UI Polish (2025-07-16)
- DOCX dropdown click fix
- Admin action-rows restructured
- Responsive CSS
- Public date chip
- FileField component
- README + .gitignore cleanup

### Phase 4 - Loading + Toasts (2026-08-07)
- Loading spinners on all buttons
- Toast notification system
- Idempotent re-split (no duplicates)
- Fixed download filename (Week{N}_{Title}_Printing.pdf)
- Removed full-page spinner overlay

---

## Commit Plan

All work is uncommitted. Recommended commit sequence:

### Commit 1: Foundation
```
feat: Next.js 16 app with Supabase + Cloudinary backend

- App Router, TypeScript, Turbopack
- Supabase PostgreSQL schema (modules, weeks, files, admins)
- Cloudinary PDF/DOCX storage
- Admin auth (jose JWT, PIN login via RPC)
- Public module listing + week cards
- Admin dashboard with upload/split/re-split/DOCX/title/date/delete
- PDF merge + DOCX proxy API routes
- Neumorphic dark UI
```
**Files:** `app/`, `components/`, `lib/`, `proxy.ts`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `package.json`, `supabase.md`, `.env.example`, `.gitignore`

### Commit 2: DB fixes + Cloudinary setup
```
fix: Supabase RPC search_path + drop files constraint

- check_admin: set search_path to extensions, public, pgcryptogc
- Drop unique (week_id, kind) on files table
- Add done_on date column to weeks
- SQL migration in supabase.md
```
**Files:** `supabase.md`

### Commit 3: UI polish
```
fix: admin action-rows, DOCX dropdown, responsive CSS

- Restructured admin week actions into meta-row/danger-row
- Fixed DOCX dropdown close behavior (.closest)
- Added responsive breakpoints for action rows
- Public date read-only chip
- FileField component for styled file inputs
```
**Files:** `components/AdminDashboard.tsx`, `components/PrintPlan.tsx`, `app/globals.css`

### Commit 4: Loading + Toasts
```
feat: loading spinners + toast notifications

- Inline loading spinners on all action buttons
- ToastProvider context with auto-dismiss
- Toast wired to all actions (download, split, upload, docx, title, date, delete)
- Idempotent re-split (clearPageFiles in splitWeekCore)
- Fixed print-merge filename: Week{N}_{Title}_Printing.pdf
```
**Files:** `components/ToastProvider.tsx`, `components/AdminDashboard.tsx`, `components/PrintPlan.tsx`, `app/layout.tsx`, `app/globals.css`

### Commit 5: Cleanup (optional)
```
chore: remove unused files + test scripts

- Delete components/WeekDatePicker.tsx (unused)
- Clean up scripts/ directory
```
**Files:** `components/WeekDatePicker.tsx`, `scripts/*`

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CLOUDINARY_CLOUD_NAME=dhw3ttwaz
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ADMIN_SESSION_SECRET=your-random-secret-here
```

## Cloudinary

- **Cloud:** dhw3ttwaz
- **Folder:** `bwu/{moduleId}/Week{N}/`
- **Assets:** full PDF, page splits (print-XX, handwrite-XX), DOCX
- **Note:** Free plan requires enabling PDF/ZIP delivery in Settings > Security

## Admin

- **Name:** sayantan
- **PIN:** (bcrypt hash in admins table, see supabase.md for seed)
