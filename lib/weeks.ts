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
    .select("id, name, status, sort_order, tagline, meta")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);

  const { data: weeks } = await supabase.from("weeks").select("module_id");
  const counts = new Map<string, number>();
  for (const w of weeks ?? []) {
    const c = counts.get(w.module_id as string) ?? 0;
    counts.set(w.module_id as string, c + 1);
  }

  return (modules as ModuleRowRaw[] | null ?? []).map((m) =>
    mapModule(m, counts.get(m.id) ?? 0)
  );
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