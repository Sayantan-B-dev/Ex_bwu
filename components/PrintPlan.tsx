"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import type { Week } from "@/lib/paths";
import { pageUrl, fullPdfUrl, docxUrl } from "@/lib/paths";

interface PrintPlanProps {
  weeks: Week[];
}

export default function PrintPlan({ weeks }: PrintPlanProps) {
  const [open, setOpen] = useState(false);
  const [loadingKey, setLoadingKey] = useState<number | null>(null);

  useEffect(() => {
    const closeDocx = () => setOpen(false);
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDocx();
    };
    document.addEventListener("click", closeDocx);
    document.addEventListener("keydown", onKeydown);
    return () => {
      document.removeEventListener("click", closeDocx);
      document.removeEventListener("keydown", onKeydown);
    };
  }, []);

  async function mergePrintPages(w: Week) {
    try {
      const merged = await PDFDocument.create();
      for (const p of w.print) {
        const resp = await fetch(pageUrl(w, "print", p));
        if (!resp.ok) throw new Error(`Failed to load page ${p}`);
        const src = await PDFDocument.load(await resp.arrayBuffer());
        const copied = await merged.copyPages(src, src.getPageIndices());
        copied.forEach(cp => merged.addPage(cp));
      }
      const bytes = await merged.save();
      const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([buf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Week${w.n}_${w.title.replace(/\s+/g, "_")}_Print_Pages.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Merge failed: " + (e as Error).message);
    }
  }

  async function downloadDocx(w: Week) {
    const url = docxUrl(w);
    if (!url) return;
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to load DOCX (${resp.status})`);
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = w.docxName ?? `Week${w.n}_report.docx`;
      a.click();
      URL.revokeObjectURL(objUrl);
    } catch (e) {
      alert("Download failed: " + (e as Error).message);
    }
  }

  async function handleDownload(w: Week) {
    if (loadingKey === w.n) return;
    if (!w.print || !w.print.length) return;
    // eslint-disable-next-line react-hooks/purity -- event handler, Date.now is intentional (2s min spinner)
    const started = Date.now();
    setLoadingKey(w.n);
    await mergePrintPages(w);
    // eslint-disable-next-line react-hooks/purity -- event handler, Date.now is intentional (2s min spinner)
    const elapsed = Date.now() - started;
    if (elapsed < 2000) await new Promise(r => setTimeout(r, 2000 - elapsed));
    setLoadingKey(null);
  }

  return (
    <>
      <header>
        <div className="kicker">
          <Link className="back-home" href="/">← All Modules</Link> · BTech 3rd Semester · Python Lab
        </div>
        <h1>Weekly Reports - Print Plan</h1>
        <p>Pages to print for the final report, and pages left blank for handwritten work. Click any page to open the PDF in a new tab.</p>
        <div className="header-actions">
          <div className={open ? "docx-wrap open" : "docx-wrap"}>
            <button
              className="access-docx docx-toggle"
              type="button"
              aria-expanded={open}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(o => !o);
              }}
            >
              Access All Files as DOCX
              <svg className="docx-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            <div className="docx-menu">
              {weeks.map(w => {
                const url = docxUrl(w);
                if (!url) return null;
                return (
                  <button key={w.n} className="docx-row" type="button" onClick={() => downloadDocx(w)}>
                    <span className="docx-name">Week {w.n} · {w.title}</span>
                    <span className="docx-dl">Download</span>
                  </button>
                );
              })}
            </div>
            <a className="access-docx see-code" href="https://github.com/Sayantan-B-dev/SM_BtechSyllabus/tree/main/3rdSem/PROJECTS/PYTHON/py" target="_blank" rel="noopener noreferrer">See Code</a>
          </div>
        </div>
      </header>

      <main className="grid">
        {weeks.length === 0 ? (
          <p className="no-data">weeks data not found. Run <code>node split.js</code> in the pdf folder to generate it.</p>
        ) : (
          weeks.map(w => (
            <article className="card" key={w.n}>
              <header className="card-head">
                <h2>Week {w.n} <span className="card-sub">· {w.title}</span></h2>
                <span className="pages-badge">{w.total ? `${w.total} pages` : "Plan pending"}</span>
              </header>
              {w.hasPlan ? (
                <div className="rows">
                  <div className="row print">
                    <div className="row-label">Print Pages</div>
                    <div className="chips">
                      {w.print.map(p => (
                        <button key={p} className="page-chip" title={`Page ${p}`} onClick={() => window.open(pageUrl(w, "print", p), "_blank", "noopener")}>{p}</button>
                      ))}
                    </div>
                    <button
                      className={loadingKey === w.n ? "download-print loading" : "download-print"}
                      disabled={loadingKey === w.n}
                      onClick={() => handleDownload(w)}
                    >
                      <svg className="dl-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      <svg className="dl-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      <span className="dl-label">{loadingKey === w.n ? "Merging Pages…" : "Download Printing Pages"}</span>
                    </button>
                  </div>
                  <div className="row handwrite">
                    <div className="row-label">Handwrite Only</div>
                    <div className="chips">
                      {w.handwrite.map(p => (
                        <button key={p} className="page-chip" title={`Page ${p}`} onClick={() => window.open(pageUrl(w, "handwrite", p), "_blank", "noopener")}>{p}</button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rows">
                  <div className="row">
                    <div className="row-label">Print plan</div>
                    <p className="plan-note">New PDF detected on GitHub — run <code>node split.js</code> in the pdf folder to generate the print plan.</p>
                  </div>
                </div>
              )}
              <button className="open-full" onClick={() => { const url = fullPdfUrl(w); if (url) window.open(url, "_blank", "noopener"); }}>Open Full PDF</button>
              <div className="row-footer">
                {w.hasPlan ? (
                  <span>Print: <b>{w.print.join(", ")}</b> · Handwrite: <b>{w.handwrite.join(", ")}</b></span>
                ) : (
                  <span className="muted">Auto-detected — plan not generated yet.</span>
                )}
              </div>
            </article>
          ))
        )}
      </main>
    </>
  );
}
