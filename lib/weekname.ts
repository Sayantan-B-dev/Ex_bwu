export interface ParsedWeekName {
  n: number;
  printPages: number[];
  title: string;
}

const NAME_RE = /^Week(\d+)_\(print\s+(no|[\d,\s]+)\s+pages?\)_(.+)\.(pdf|docx)$/i;

export function parseWeekName(filename: string): ParsedWeekName | null {
  const m = filename.match(NAME_RE);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1) return null;
  const printRaw = m[2].toLowerCase();
  const printPages =
    printRaw === "no" ? [] : printRaw.split(/\s*,\s*/).map((s) => parseInt(s, 10)).filter((x) => !Number.isNaN(x));
  let title = m[3].replace(/_Report$/i, "");
  title = title.split("_").filter(Boolean).join(" ");
  return { n, printPages, title: title || `Week ${n}` };
}

export const WEEK_NAME_HINT =
  'Filename must be: "Week5_(print 1,3,5,7 pages)_Your_Title.pdf" (or "Week5_(print no pages)_Your_Title.pdf" when nothing is printed).';