"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import type { WeekRow } from "@/lib/types";

interface PrintPlanProps {
  weeks: WeekRow[];
  moduleName: string;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

function pageUrl(w: WeekRow, kind: "page_print" | "page_handwrite", p: number): string | undefined {
  return w.files.find((f) => f.kind === kind && f.pageNo === p)?.url;
}

function fullPdfUrl(w: WeekRow): string | undefined {
  const f = w.files.find((f) => f.kind === "full_pdf");
  if (!f) return undefined;
  return `/api/weeks/${w.id}/full-pdf`;
}

function docxAsset(w: WeekRow): { url: string; name: string } | null {
  const f = w.files.find((f) => f.kind === "docx");
  if (!f) return null;
  return { url: `/api/weeks/${w.id}/docx`, name: f.originalName ?? `Week${w.n}.docx` };
}

export default function PrintPlan({ weeks, moduleName }: PrintPlanProps) {
  const [open, setOpen] = useState(false);
  const [loadingWeekId, setLoadingWeekId] = useState<string | null>(null);
  const { toast } = useToast();

  async function handlePrintDownload(weekId: string, weekN: number, weekTitle: string) {
    setLoadingWeekId(weekId);
    try {
      const res = await fetch(`/api/weeks/${weekId}/print-merge`);
      if (!res.ok) throw new Error("merge failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Week${weekN}_${weekTitle.replace(/\s+/g, "_")}_Printing.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Printing pages downloaded");
    } catch {
      toast("Download failed", false);
      window.open(`/api/weeks/${weekId}/print-merge`, "_blank", "noopener");
    } finally {
      setLoadingWeekId(null);
    }
  }

  useEffect(() => {
    const closeDocx = () => setOpen(false);
    const onDocClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".docx-wrap")) setOpen(false);
    };
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDocx();
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeydown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <>
      <header>
        <div className="kicker">
          BTech 3rd Semester · {moduleName}
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
                const asset = docxAsset(w);
                if (!asset) return null;
                return (
                  <a key={w.id} className="docx-row" href={asset.url} download={asset.name}>
                    <span className="docx-name">Week {w.n} · {w.title}</span>
                    <span className="docx-dl">Download</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="grid">
        {weeks.length === 0 ? (
          <p className="no-data">No weeks uploaded yet for this module.</p>
        ) : (
          weeks.map(w => (
            <article className="card" key={w.id}>
              <header className="card-head">
                <h2>Week {w.n} <span className="card-sub">· {w.title}</span></h2>
                <span className="week-date">{w.doneOn ? formatDate(w.doneOn) : "No date set"}</span>
                <span className="pages-badge">{w.total ? `${w.total} pages` : "Plan pending"}</span>
              </header>

              {w.hasPlan ? (
                <div className="rows">
                  {w.print.length > 0 && (
                    <div className="row print">
                      <div className="row-label">Print Pages</div>
                      <div className="chips">
                        {w.print.map(p => {
                          const url = pageUrl(w, "page_print", p);
                          return (
                            <button key={p} className="page-chip" title={`Page ${p}`} disabled={!url} onClick={() => url && window.open(url, "_blank", "noopener")}>{p}</button>
                          );
                        })}
                      </div>
                      {w.print.length > 0 && (
                        <button
                          className={loadingWeekId === w.id ? "download-print loading" : "download-print"}
                          type="button"
                          disabled={loadingWeekId !== null}
                          onClick={() => handlePrintDownload(w.id, w.n, w.title)}
                        >
                          <svg className="dl-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          <svg className="dl-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                          <span className="dl-label">{loadingWeekId === w.id ? "Merging..." : "Download Printing Pages"}</span>
                        </button>
                      )}
                    </div>
                  )}
                  {w.handwrite.length > 0 && (
                    <div className="row handwrite">
                      <div className="row-label">Handwrite Only</div>
                      <div className="chips">
                        {w.handwrite.map(p => {
                          const url = pageUrl(w, "page_handwrite", p);
                          return (
                            <button key={p} className="page-chip" title={`Page ${p}`} disabled={!url} onClick={() => url && window.open(url, "_blank", "noopener")}>{p}</button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rows">
                  <div className="row">
                    <div className="row-label">Print plan</div>
                    <p className="plan-note">Plan pending - run <code>Split &amp; Save</code> from the dashboard to generate the print plan.</p>
                  </div>
                </div>
              )}

              {fullPdfUrl(w) && (
                <button className="open-full" onClick={() => { const url = fullPdfUrl(w); if (url) window.open(url, "_blank", "noopener"); }}>Open Full PDF</button>
              )}

              <div className="row-footer">
                {w.hasPlan ? (
                  <span>Print: <b>{w.print.length ? w.print.join(", ") : "-"}</b> · Handwrite: <b>{w.handwrite.length ? w.handwrite.join(", ") : "-"}</b></span>
                ) : (
                  <span className="muted">Plan not generated yet.</span>
                )}
              </div>

              {w.links && w.links.length > 0 && (
                <div className="card-links">
                  {w.links.map((l, i) => (
                    <a key={i} className="card-link" href={l.url} target="_blank" rel="noopener noreferrer">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      {l.title}
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </main>
    </>
  );
}