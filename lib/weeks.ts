import path from "path";
import { readdir } from "fs/promises";
import type { Week } from "./paths";

const ROOT = path.join(process.cwd(), "3rdSemProjects", "PYTHON");

function deriveTitle(name: string): string {
  let t = name.replace(/\.(pdf|docx)$/i, "");
  t = t.replace(/^Week\d+_/, "");
  t = t.replace(/_?\(print\s+[\d,\s]+\s+pages?\)/i, "");
  t = t.replace(/_Report$/i, "");
  return t.split("_").filter(Boolean).join(" ");
}

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

async function pageNumbers(dir: string): Promise<number[]> {
  const files = await safeReaddir(dir);
  return files
    .map((f) => /^page-(\d+)\.pdf$/.exec(f)?.[1])
    .filter((m): m is string => m !== undefined)
    .map((m) => parseInt(m, 10))
    .sort((a, b) => a - b);
}

export async function getWeeks(): Promise<Week[]> {
  const pdfsDir = path.join(ROOT, "pdfs");
  const pdfNames = (await safeReaddir(pdfsDir)).filter((f) => /^Week(\d+)_.*\.pdf$/i.test(f));

  const docxDir = path.join(ROOT, "docx", "weekly");
  const docxByName = new Map<number, string>();
  for (const f of await safeReaddir(docxDir)) {
    const m = /^Week(\d+)_.*\.docx$/i.exec(f);
    if (m) docxByName.set(parseInt(m[1], 10), f);
  }

  const weeks: Week[] = [];
  for (const pdfName of pdfNames) {
    const n = parseInt(/^Week(\d+)/i.exec(pdfName)![1], 10);
    const splitRoot = path.join(pdfsDir, "split", `Week${n}`);
    const print = await pageNumbers(path.join(splitRoot, "print"));
    const handwrite = await pageNumbers(path.join(splitRoot, "handwrite"));
    const hasPlan = print.length + handwrite.length > 0;
    weeks.push({
      n,
      title: deriveTitle(pdfName),
      total: hasPlan ? print.length + handwrite.length : null,
      print,
      handwrite,
      pdfName,
      docxName: docxByName.get(n) ?? null,
      hasPlan,
    });
  }
  weeks.sort((a, b) => a.n - b.n);
  return weeks;
}
