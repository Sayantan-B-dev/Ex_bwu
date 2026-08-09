# SM_BtechSyllabus · 3rd Semester Modules

Next.js (App Router, TypeScript) modules site with an admin dashboard. Same neumorphic dark UI.

## Stack

- **Frontend** - Next.js on Vercel (server components + server actions)
- **Data** - Supabase (Postgres: modules, weeks, files, admins) with RLS (public read-only)
- **Files** - Cloudinary (raw PDF/DOCX) - full PDFs, DOCX, single page-PDFs
- **Admin** - tiny name+PIN login (`/admin`), session cookie signed with `ADMIN_SESSION_SECRET`
- **Upload** - Direct browser-to-Cloudinary upload (bypasses Next.js 10MB body limit)

## Setup

1. Run the SQL in `supabase.md` (Supabase SQL editor) - tables, RLS, `check_admin` RPC, seeds.
2. Copy `.env.example` → `.env.local` and fill: Supabase URL/anon/service-role keys, Cloudinary credentials, `ADMIN_SESSION_SECRET`.
3. `npm run dev` → http://localhost:3000

## Using the dashboard

Login at `/admin` (link in the footer - "Master Login") with the admin seeded in `supabase.md` (default: `sayantan` + your PIN).

**Uploading a week** (per module):
- Filename must be `Week5_(print 1,3,5,7 pages)_Your_Title.pdf` - the numbers in brackets are the pages to print. If nothing is printed: `Week5_(print no pages)_Your_Title.pdf`.
- "Upload & Auto-Split" uploads the PDF directly to Cloudinary from your browser (no file size limit from Next.js), then the server creates the week record, saves metadata, and splits every page into its own PDF (print/handwrite folders) - all automatically.
- **Cloudinary free plan limit:** raw file uploads are capped at 10MB per file. Files larger than 10MB require a paid Cloudinary plan.
- DOCX is uploaded separately per week (download-only on the public page).

## Public pages

- `/` - module cards (ready/soon, editable from the dashboard)
- `/modules/[module]` - weekly print plans: page chips, Open Full PDF (proxied with correct filename at `/api/weeks/[id]/full-pdf`), Download Printing Pages (server-side merge at `/api/weeks/[id]/print-merge`), DOCX downloads

All pages show loading spinners during route transitions. All admin buttons show inline spinners while processing. Toast notifications confirm every action.
