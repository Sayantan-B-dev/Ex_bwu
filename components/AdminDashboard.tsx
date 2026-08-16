"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import NeumorphicDatePicker from "@/components/NeumorphicDatePicker";
import ConfirmModal, { confirmAsync } from "@/components/ConfirmModal";
import { useToast } from "@/components/ToastProvider";
import { signAndUpload } from "@/lib/cloudinary-client";
import {
  resplitWeek,
  deleteWeek,
  updateWeekTitle,
  updateModuleStatus,
  updateModuleMeta,
  updateWeekDate,
  updateWeekLinks,
  logout,
} from "@/lib/actions";
import type { AdminModule, WeekLink, WeekRow } from "@/lib/types";

function FileField({
  name,
  label,
  accept,
  id,
}: {
  name: string;
  label: string;
  accept: string;
  id: string;
}) {
  const [fileName, setFileName] = useState("");
  return (
    <div className="admin-field">
      <input
        className="file-hidden"
        id={id}
        name={name}
        type="file"
        accept={accept}
        required
        onChange={(e) => {
          setFileName(e.currentTarget.files?.[0]?.name ?? "");
        }}
      />
      <label className="file-btn" htmlFor={id}>
        {label}
        {fileName && <span className="file-name">{fileName}</span>}
      </label>
    </div>
  );
}

export default function AdminDashboard({ modules }: { modules: AdminModule[] }) {
  const router = useRouter();
  const [active, setActive] = useState(modules[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const { toast } = useToast();

  const mod = modules.find((m) => m.id === active) ?? modules[0];

  async function run(fn: Promise<{ ok: boolean; error?: string }>, key?: string, label?: string) {
    if (key) setLoadingKey(key);
    try {
      const res = await fn;
      if (res.ok) {
        toast(label ?? "Done");
      } else {
        toast(res.error ?? "Failed", false);
      }
    } catch {
      toast("Something went wrong", false);
    } finally {
      if (key) setLoadingKey(null);
    }
    startTransition(() => router.refresh());
  }

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="wrap admin-wrap">
      <ConfirmModal />
      <header>
        <div className="kicker">Administration</div>
        <h1>Module Dashboard</h1>
        <p>Upload weekly PDFs, generate print plans, and manage modules. Filename: <code>Week1_(print 1,3,5,7 pages)_Title.pdf</code> - the numbers in brackets are the pages to print. If nothing is printed, write <code>Week1_(print no pages)_Title.pdf</code>.</p>
      </header>

      <div className="admin-top">
        <div className="admin-tabs">
          {modules.map((m) => (
            <button
              key={m.id}
              type="button"
              className={m.id === mod?.id ? "admin-tab active" : "admin-tab"}
              onClick={() => setActive(m.id)}
            >
              {m.name} · {m.weekCount}
            </button>
          ))}
        </div>
        <form action={() => run(updateModuleStatus(mod?.id ?? "", mod?.status === "ready" ? "soon" : "ready"))}>
          <button className="admin-btn" type="submit" disabled={pending}>
            {mod?.status === "ready" ? "Mark as Soon" : "Mark as Ready"}
          </button>
        </form>
        <form action={() => handleLogout()}>
          <button className="admin-btn danger" type="submit">Log Out</button>
        </form>
      </div>

      {mod && (
        <div className="admin-panel">
          <div className="admin-module-head">
            <h2>{mod.name} · {mod.status === "ready" ? "Ready" : "Soon"}</h2>
            <span className="pages-badge">{mod.weekCount} weeks</span>
          </div>

          <ModuleMetaForm module={mod} />

          <AddWeekForm moduleId={mod.id} />

          {mod.weeks.length === 0 ? (
            <p className="admin-empty">No weeks uploaded yet.</p>
          ) : (
            <div className="admin-weeklist">
              {mod.weeks.map((w) => {
                const hasDocx = w.files.some((f) => f.kind === "docx");
                return (
                  <div className="admin-week" key={w.id}>
                    <div className="admin-week-head">
                      <span className="admin-week-title">Week {w.n} · {w.title}</span>
                      <span className="pages-badge">{w.total ? `${w.total} pages` : "Plan pending"}</span>
                    </div>

                    {w.hasPlan && (
                      <div className="admin-pages">
                        {w.print.map((p) => <span key={p} className="admin-page">{p}</span>)}
                        {w.handwrite.map((p) => <span key={p} className="admin-page hw">{p}</span>)}
                      </div>
                    )}

                    <div className="admin-week-actions">
                      <div className="action-row">
                        <ResplitForm week={w} />
                      </div>

                      <div className="action-row">
                        <DocxForm week={w} hasDocx={hasDocx} />
                      </div>

                      <div className="action-row">
                        <LinkEditor week={w} />
                      </div>

                      <div className="action-row meta-row">
                        <TitleForm week={w} onDone={(r) => run(Promise.resolve(r))} />
                        <WeekDateForm week={w} />
                      </div>

                      <div className="action-row danger-row">
                        <button className={loadingKey === `del-${w.id}` ? "admin-btn danger loading" : "admin-btn danger"} type="button" disabled={pending || loadingKey !== null} onClick={async () => { if (await confirmAsync(`Delete Week ${w.n}?`)) run(deleteWeek(w.id), `del-${w.id}`, `Week ${w.n} deleted`); }}>
                          Delete Week
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddWeekForm({ moduleId }: { moduleId: string }) {
  const [nonce, setNonce] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]');
    const file = fileInput?.files?.[0];
    if (!file) { toast("Choose a PDF file.", false); return; }

    setLoading(true);
    try {
      const folder = `bwu/${moduleId}`;
      const publicId = `report_${Date.now()}`;
      const upload = await signAndUpload({ folder, publicId, format: "pdf", file });
      if (!upload.ok || !upload.publicId || !upload.url) {
        toast(upload.error ?? "Upload failed", false);
        setLoading(false);
        return;
      }

      const resp = await fetch("/api/admin/upload-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          fileName: file.name,
          fileUrl: upload.url,
          cloudinaryPublicId: upload.publicId,
          sizeBytes: file.size,
        }),
      });
      const res = await resp.json();
      if (res.ok) {
        toast("Week uploaded & split");
        form.reset();
        setNonce((n) => n + 1);
      } else {
        toast(res.error ?? "Upload failed", false);
      }
    } catch {
      toast("Upload failed", false);
    }
    setLoading(false);
  }
  return (
    <form className="admin-form" onSubmit={handle}>
      <div className="admin-field">
        <label htmlFor={`pdf-${moduleId}`}>Weekly PDF (required)</label>
        <FileField key={nonce} name="pdf" label="Choose Weekly PDF" accept="application/pdf,.pdf" id={`pdf-${moduleId}`} />
      </div>
      <button className={loading ? "admin-btn solid loading" : "admin-btn solid"} type="submit" disabled={loading}>{loading ? "Uploading to Cloudinary..." : "Upload & Auto-Split"}</button>
    </form>
  );
}

function DocxForm({ week, hasDocx }: { week: WeekRow; hasDocx: boolean }) {
  const [nonce, setNonce] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]');
    const file = fileInput?.files?.[0];
    if (!file) { toast("Choose a DOCX file.", false); return; }

    setLoading(true);
    try {
      const folder = `bwu/${week.moduleId}/Week${week.n}`;
      const publicId = `report_docx_${Date.now()}`;
      const upload = await signAndUpload({ folder, publicId, format: "docx", file });
      if (!upload.ok || !upload.publicId || !upload.url) {
        toast(upload.error ?? "Upload failed", false);
        setLoading(false);
        return;
      }

      const resp = await fetch(`/api/admin/upload-docx/${week.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cloudinaryPublicId: upload.publicId,
          cloudinaryUrl: upload.url,
          originalName: file.name,
          sizeBytes: file.size,
        }),
      });
      const res = await resp.json();
      if (res.ok) {
        toast("DOCX uploaded");
        form.reset();
        setNonce((n) => n + 1);
      } else {
        toast(res.error ?? "Upload failed", false);
      }
    } catch {
      toast("Upload failed", false);
    }
    setLoading(false);
  }
  return (
    <form className="admin-form" onSubmit={handle}>
      <FileField key={nonce} name="docx" label="Choose DOCX file" accept=".docx" id={`docx-${week.id}`} />
      <button className={loading ? "admin-btn loading" : "admin-btn"} type="submit" disabled={loading}>{loading ? "Uploading to Cloudinary..." : hasDocx ? "Replace DOCX" : "Upload DOCX"}</button>
    </form>
  );
}

function ResplitForm({ week }: { week: WeekRow }) {
  const [nonce, setNonce] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]');
    const file = fileInput?.files?.[0];
    if (!file) { toast("Choose a PDF file.", false); return; }

    setLoading(true);
    try {
      const folder = `bwu/${week.moduleId}/Week${week.n}`;
      const publicId = `report_${Date.now()}`;
      const upload = await signAndUpload({ folder, publicId, format: "pdf", file });
      if (!upload.ok || !upload.publicId || !upload.url) {
        toast(upload.error ?? "Upload failed", false);
        setLoading(false);
        return;
      }

      const res = await resplitWeek(week.id, upload.url, file.name, upload.publicId, file.size);
      if (res.ok) {
        toast("Week re-uploaded & re-split");
        form.reset();
        setNonce((n) => n + 1);
      } else {
        toast(res.error ?? "Re-split failed", false);
      }
    } catch {
      toast("Re-split failed", false);
    }
    setLoading(false);
  }
  return (
    <form className="admin-form" onSubmit={handle}>
      <FileField key={nonce} name="resplit" label="New PDF (replaces current)" accept="application/pdf,.pdf" id={`resplit-${week.id}`} />
      <button className={loading ? "admin-btn solid loading" : "admin-btn solid"} type="submit" disabled={loading}>{loading ? "Uploading to Cloudinary..." : "Re-upload & Re-split"}</button>
    </form>
  );
}

function WeekDateForm({ week }: { week: WeekRow }) {
  const router = useRouter();
  const [date, setDate] = useState<string | null>(week.doneOn ?? null);
  const { toast } = useToast();
  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await updateWeekDate(week.id, new FormData(e.currentTarget).get("done") as string | null);
    if (res.ok) {
      toast("Date saved");
      router.refresh();
    } else {
      toast(res.error ?? "Save failed", false);
    }
  }
  return (
    <form className="admin-form" onSubmit={handle}>
      <input type="hidden" name="done" value={date ?? ""} />
      <NeumorphicDatePicker value={date} onChange={setDate} />
      <button className="admin-btn" type="submit">Save Date</button>
    </form>
  );
}

function TitleForm({ week, onDone }: { week: WeekRow; onDone: (r: { ok: boolean; error?: string }) => void }) {
  const [title, setTitle] = useState(week.title);
  const { toast } = useToast();
  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await updateWeekTitle(week.id, title);
    if (res.ok) {
      toast("Title updated");
    } else {
      toast(res.error ?? "Save failed", false);
    }
    onDone(res);
  }
  return (
    <form className="admin-form" onSubmit={handle}>
      <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label={`Week ${week.n} title`} />
      <button className="admin-btn" type="submit">Save Title</button>
    </form>
  );
}

function ModuleMetaForm({ module: mod }: { module: AdminModule }) {
  const [open, setOpen] = useState(false);
  const [tagline, setTagline] = useState(mod.tagline ?? "");
  const [stats, setStats] = useState(mod.meta.stats.join(", "));
  const [features, setFeatures] = useState(mod.meta.features.join("\n"));
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const statsArr = stats.split(",").map((s) => s.trim()).filter(Boolean);
    const featuresArr = features.split("\n").map((f) => f.trim()).filter(Boolean);
    const res = await updateModuleMeta(mod.id, tagline, statsArr, featuresArr);
    if (res.ok) {
      toast("Module info updated");
    } else {
      toast(res.error ?? "Save failed", false);
    }
    setLoading(false);
  }

  return (
    <div className="admin-meta-wrap">
      <button className="admin-btn" type="button" onClick={() => setOpen((o) => !o)}>
        {open ? "Close Editor" : "Edit Module Info"}
      </button>
      {open && (
        <form className="admin-meta-form" onSubmit={handle}>
          <div className="admin-field">
            <label>Tagline (shown on landing page)</label>
            <input className="admin-input" style={{ maxWidth: "100%" }} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Short description of this module" />
          </div>
          <div className="admin-field">
            <label>Stats (comma-separated, shown as chips)</label>
            <input className="admin-input" style={{ maxWidth: "100%" }} value={stats} onChange={(e) => setStats(e.target.value)} placeholder="4 Weekly Reports, 30 Pages, Print · Handwrite" />
          </div>
          <div className="admin-field">
            <label>Features (one per line, shown as list)</label>
            <textarea className="admin-input admin-textarea" value={features} onChange={(e) => setFeatures(e.target.value)} rows={4} placeholder={"Page chips - open any page PDF in a new tab\nOpen Full PDF link per report\nMerge print pages into a single PDF download"} />
          </div>
          <button className={loading ? "admin-btn solid loading" : "admin-btn solid"} type="submit" disabled={loading}>Save Module Info</button>
        </form>
      )}
    </div>
  );
}

function LinkEditor({ week }: { week: WeekRow }) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<WeekLink[]>(week.links ?? []);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  function addLink() {
    setLinks((prev) => [...prev, { title: "", url: "" }]);
  }

  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateLink(i: number, field: "title" | "url", value: string) {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await updateWeekLinks(week.id, links);
    if (res.ok) {
      toast("Links updated");
    } else {
      toast(res.error ?? "Save failed", false);
    }
    setLoading(false);
  }

  const linkCount = (week.links ?? []).length;

  return (
    <div className="admin-meta-wrap">
      <button className="admin-btn" type="button" onClick={() => setOpen((o) => !o)}>
        {open ? "Close Links" : `Add Link${linkCount > 0 ? ` (${linkCount})` : ""}`}
      </button>
      {open && (
        <form className="admin-meta-form" onSubmit={handle}>
          {links.map((l, i) => (
            <div className="link-row" key={i}>
              <input className="admin-input" value={l.title} onChange={(e) => updateLink(i, "title", e.target.value)} placeholder="Link title (e.g. GitHub Repo)" />
              <input className="admin-input" value={l.url} onChange={(e) => updateLink(i, "url", e.target.value)} placeholder="https://github.com/..." />
              <button className="admin-btn danger" type="button" onClick={() => removeLink(i)}>Remove</button>
            </div>
          ))}
          <div className="link-actions">
            <button className="admin-btn" type="button" onClick={addLink}>+ Add Link</button>
            <button className={loading ? "admin-btn solid loading" : "admin-btn solid"} type="submit" disabled={loading}>Save Links</button>
          </div>
        </form>
      )}
    </div>
  );
}