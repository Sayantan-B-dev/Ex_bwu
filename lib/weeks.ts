import "server-only";
import { getSupabaseAnon } from "@/lib/supabase/client";
import type { AdminModule, WeekRow } from "@/lib/types";

interface ModuleRowRaw {
  id: string;
  name: string;
  status: "ready" | "soon";
  sort_order: number;
  tagline: string | null;
  meta: { stats?: string[]; features?: string[] };
}

interface WeekRowRaw {
  id: string;
  module_id: string;
  week_number: number;
  title: string;
  print_pages: number[];
  handwrite_pages: number[];
  total_pages: number | null;
  has_plan: boolean;
  done_on: string | null;
  updated_at: string;
  files: FileRowRaw[];
}

interface FileRowRaw {
  id: string;
  kind: "full_pdf" | "docx" | "page_print" | "page_handwrite";
  page_no: number | null;
  url: string;
  original_name: string | null;
  size_bytes: number | null;
}

function mapModule(row: ModuleRowRaw, weekCount: number): AdminModule {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    sortOrder: row.sort_order,
    tagline: row.tagline,
    meta: { stats: row.meta?.stats ?? [], features: row.meta?.features ?? [] },
    weekCount,
    weeks: [],
  };
}

function mapWeek(row: WeekRowRaw): WeekRow {
  return {
    id: row.id,
    moduleId: row.module_id,
    n: row.week_number,
    title: row.title,
    print: row.print_pages ?? [],
    handwrite: row.handwrite_pages ?? [],
    total: row.total_pages,
    hasPlan: row.has_plan,
    doneOn: row.done_on ?? null,
    files: (row.files ?? []).map((f) => ({
      id: f.id,
      kind: f.kind,
      pageNo: f.page_no,
      url: f.url,
      originalName: f.original_name,
      sizeBytes: f.size_bytes,
    })),
    updatedAt: row.updated_at,
  };
}

export async function getModules(): Promise<AdminModule[]> {
  const supabase = getSupabaseAnon();
  const { data: modules, error } = await supabase
    .from("modules")
    .select(
      "id, name, status, sort_order, tagline, meta, " +
        "weeks(id, total_pages, has_plan, files(kind))"
    )
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);

  return (modules as unknown as (ModuleRowRaw & { weeks: { id: string; total_pages: number | null; has_plan: boolean; files: { kind: string }[] }[] })[] ?? []).map((m) => {
    const weekCount = m.weeks?.length ?? 0;
    const totalPages = (m.weeks ?? []).reduce((sum, w) => sum + (w.total_pages ?? 0), 0);
    const hasDocx = (m.weeks ?? []).some((w) => w.files?.some((f) => f.kind === "docx"));
    const hasPlan = (m.weeks ?? []).some((w) => w.has_plan);

    const stats: string[] = [];
    if (weekCount > 0) stats.push(`${weekCount} Weekly Report${weekCount > 1 ? "s" : ""}`);
    if (totalPages > 0) stats.push(`${totalPages} Pages`);
    if (hasPlan) stats.push("Print · Handwrite");

    const features: string[] = [];
    if (hasPlan) {
      features.push("Page chips - open any page PDF in a new tab");
      features.push("Open Full PDF link per report");
      features.push("Merge print pages into a single PDF download");
    }
    if (hasDocx) features.push("Access all files as DOCX");

    return {
      id: m.id,
      name: m.name,
      status: m.status,
      sortOrder: m.sort_order,
      tagline: m.tagline,
      meta: {
        stats: stats.length > 0 ? stats : (m.meta?.stats ?? []),
        features: features.length > 0 ? features : (m.meta?.features ?? []),
      },
      weekCount,
      weeks: [],
    };
  });
}

export async function getModule(id: string): Promise<AdminModule | null> {
  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from("modules")
    .select("id, name, status, sort_order, tagline, meta")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const { data: weeks } = await supabase
    .from("weeks")
    .select("module_id")
    .eq("module_id", id);
  return mapModule(data as ModuleRowRaw, (weeks ?? []).length);
}

export async function getModuleWeeks(moduleId: string): Promise<WeekRow[]> {
  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from("weeks")
    .select(
      "id, module_id, week_number, title, print_pages, handwrite_pages, total_pages, has_plan, done_on, updated_at, " +
        "files(id, kind, page_no, url, original_name, size_bytes)"
    )
    .eq("module_id", moduleId)
    .order("week_number", { ascending: true });
  if (error) return [];
  const rows = (data as unknown as WeekRowRaw[]) ?? [];
  return rows.map(mapWeek);
}

export async function getAdminData(): Promise<AdminModule[]> {
  const modules = await getModules();
  for (const mod of modules) {
    const weeks = await getModuleWeeks(mod.id);
    mod.weeks = weeks;
  }
  return modules;
}