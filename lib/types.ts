export type ModuleStatus = "ready" | "soon";
export type FileKind = "full_pdf" | "docx" | "page_print" | "page_handwrite";

export interface ModuleMeta {
  stats: string[];
  features: string[];
}

export interface ModuleRow {
  id: string;
  name: string;
  status: ModuleStatus;
  sortOrder: number;
  tagline: string | null;
  meta: ModuleMeta;
  weekCount: number;
}

export interface WeekFile {
  id: string;
  kind: FileKind;
  pageNo: number | null;
  url: string;
  originalName: string | null;
  sizeBytes: number | null;
}

export interface WeekRow {
  id: string;
  moduleId: string;
  n: number;
  title: string;
  doneOn: string | null;
  print: number[];
  handwrite: number[];
  total: number | null;
  hasPlan: boolean;
  files: WeekFile[];
  updatedAt: string;
}

export interface AdminModule extends ModuleRow {
  weeks: WeekRow[];
}