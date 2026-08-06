# SM_BtechSyllabus · 3rd Semester Modules

Next.js (App Router, TypeScript) version of the static modules site — same neumorphic dark UI, same features.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
```

## Content: drop files, the app manages the rest

The app auto-discovers weeks from `3rdSemProjects/PYTHON/` on every request — no data files to edit.

| You drop in | App shows |
|---|---|
| `3rdSemProjects/PYTHON/pdfs/Week5_*.pdf` | New week card + Open Full PDF |
| `3rdSemProjects/PYTHON/pdfs/split/Week5/print/page-01.pdf` (+ `handwrite/`) | Page chips + Download Printing Pages |
| `3rdSemProjects/PYTHON/docx/weekly/Week5_*.docx` | DOCX download menu |

Generate the split pages with the existing script:

```bash
cd 3rdSemProjects/PYTHON/pdfs && node split.js
```

## Routes

- `/` — module landing page
- `/modules/python` — weekly reports print plan
- `/api/files/[...path]` — streams PDF/DOCX from `3rdSemProjects/` (inline for PDF, attachment for DOCX)
