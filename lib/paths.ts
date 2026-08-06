export interface Week {
  n: number;
  title: string;
  total: number | null;
  print: number[];
  handwrite: number[];
  pdfName: string | null;
  docxName: string | null;
  hasPlan: boolean;
}

const pad = (p: number) => String(p).padStart(2, "0");

export function pageUrl(week: Week, kind: "print" | "handwrite", page: number): string {
  return `/api/files/PYTHON/pdfs/split/Week${week.n}/${kind}/page-${pad(page)}.pdf`;
}

export function fullPdfUrl(week: Week): string | null {
  return week.pdfName ? `/api/files/PYTHON/pdfs/${encodeURIComponent(week.pdfName)}` : null;
}

export function docxUrl(week: Week): string | null {
  return week.docxName ? `/api/files/PYTHON/docx/weekly/${encodeURIComponent(week.docxName)}` : null;
}
