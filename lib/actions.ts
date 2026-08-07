"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PDFDocument } from "pdf-lib";
import { createSession, destroySession, requireAdmin } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { uploadBuffer, deleteByPublicId } from "@/lib/cloudinary";
import { parseWeekName, WEEK_NAME_HINT } from "@/lib/weekname";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function ensureAdmin(): Promise<boolean> {
  return requireAdmin();
}

function ensureEnv() {
  getSupabaseAdmin();
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error("Missing Cloudinary env vars.");
  }
}

export async function login(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "");
  if (!name || !pin) return { ok: false, error: "Enter your name and PIN." };

  const supabase = getSupabaseAdmin();
  const { data: valid, error } = await supabase.rpc("check_admin", {
    candidate: name,
    pin,
  });
  if (error || !valid) return { ok: false, error: "Invalid name or PIN." };

  await createSession(name);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

export async function addWeek(formData: FormData): Promise<ActionResult> {
  if (!(await ensureAdmin())) return { ok: false, error: "Not authorized." };
  try {
    ensureEnv();
    const supabase = getSupabaseAdmin();

    const moduleId = String(formData.get("moduleId") ?? "");
    const file = formData.get("pdf") as File | null;
    if (!moduleId || !file) return { ok: false, error: "Missing module or PDF file." };
    if (file.size === 0) return { ok: false, error: "The PDF file is empty." };

    const parsed = parseWeekName(file.name);
    if (!parsed) return { ok: false, error: WEEK_NAME_HINT };

    const { data: existing } = await supabase
      .from("weeks")
      .select("id")
      .eq("module_id", moduleId)
      .eq("week_number", parsed.n)
      .maybeSingle();
    if (existing) {
      return { ok: false, error: `Week ${parsed.n} already exists for this module. Delete it first or use another week number.` };
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const { data: week, error: insertError } = await supabase
      .from("weeks")
      .insert({
        module_id: moduleId,
        week_number: parsed.n,
        title: parsed.title,
        print_pages: parsed.printPages,
      })
      .select("id, module_id, week_number")
      .single();
    if (insertError || !week) return { ok: false, error: insertError?.message ?? "Could not save the week." };

    const folder = `bwu/${moduleId}/Week${parsed.n}`;
    const pdf = await uploadBuffer(buffer, folder, "report", "pdf");
    await supabase.from("files").insert({
      week_id: week.id,
      kind: "full_pdf",
      page_no: null,
      cloudinary_public_id: pdf.publicId,
      url: pdf.url,
      original_name: file.name,
      size_bytes: file.size,
    });

    await splitWeekCore(week.id, buffer, parsed.printPages);

    revalidatePath("/");
    revalidatePath(`/modules/${moduleId}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function splitWeek(weekId: string): Promise<ActionResult> {
  if (!(await ensureAdmin())) return { ok: false, error: "Not authorized." };
  try {
    ensureEnv();
    const supabase = getSupabaseAdmin();

    const { data: week, error: weekError } = await supabase
      .from("weeks")
      .select("id, module_id, week_number, print_pages")
      .eq("id", weekId)
      .single();
    if (weekError || !week) return { ok: false, error: "Week not found." };

    const { data: fullPdf } = await supabase
      .from("files")
      .select("url")
      .eq("week_id", weekId)
      .eq("kind", "full_pdf")
      .maybeSingle();
    if (!fullPdf) return { ok: false, error: "Full PDF missing for this week." };

    const resp = await fetch(fullPdf.url);
    if (!resp.ok) return { ok: false, error: "Could not download the full PDF from Cloudinary." };
    const buffer = new Uint8Array(await resp.arrayBuffer());

    await clearPageFiles(weekId);

    await splitWeekCore(weekId, buffer, week.print_pages ?? []);

    revalidatePath(`/modules/${week.module_id}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function uploadDocx(weekId: string, formData: FormData): Promise<ActionResult> {
  if (!(await ensureAdmin())) return { ok: false, error: "Not authorized." };
  try {
    ensureEnv();
    const supabase = getSupabaseAdmin();

    const { data: week, error: weekError } = await supabase
      .from("weeks")
      .select("id, module_id, week_number")
      .eq("id", weekId)
      .single();
    if (weekError || !week) return { ok: false, error: "Week not found." };

    const file = formData.get("docx") as File | null;
    if (!file || file.size === 0) return { ok: false, error: "Choose a DOCX file." };

    const parsed = parseWeekName(file.name);
    if (!parsed) return { ok: false, error: WEEK_NAME_HINT };
    if (parsed.n !== week.week_number) {
      return { ok: false, error: `DOCX is for Week ${parsed.n}, but this week is Week ${week.week_number}.` };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = `bwu/${week.module_id}/Week${week.week_number}`;
    const docx = await uploadBuffer(buffer, folder, "report_docx", "docx");

    const { data: oldDocx } = await supabase
      .from("files")
      .select("cloudinary_public_id")
      .eq("week_id", weekId)
      .eq("kind", "docx")
      .maybeSingle();
    if (oldDocx) {
      await deleteByPublicId(oldDocx.cloudinary_public_id);
      await supabase.from("files").delete().eq("week_id", weekId).eq("kind", "docx");
    }

    await supabase.from("files").insert({
      week_id: weekId,
      kind: "docx",
      page_no: null,
      cloudinary_public_id: docx.publicId,
      url: docx.url,
      original_name: file.name,
      size_bytes: file.size,
    });

    revalidatePath(`/modules/${week.module_id}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteWeek(weekId: string): Promise<ActionResult> {
  if (!(await ensureAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const supabase = getSupabaseAdmin();
    const { data: week, error: weekError } = await supabase
      .from("weeks")
      .select("id, module_id")
      .eq("id", weekId)
      .single();
    if (weekError || !week) return { ok: false, error: "Week not found." };

    const { data: files } = await supabase
      .from("files")
      .select("cloudinary_public_id")
      .eq("week_id", weekId);
    for (const f of files ?? []) {
      await deleteByPublicId(f.cloudinary_public_id);
    }

    await supabase.from("weeks").delete().eq("id", weekId);

    revalidatePath("/");
    revalidatePath(`/modules/${week.module_id}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateWeekTitle(weekId: string, title: string): Promise<ActionResult> {
  if (!(await ensureAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const supabase = getSupabaseAdmin();
    const cleaned = title.trim();
    if (!cleaned) return { ok: false, error: "Title cannot be empty." };
    const { error } = await supabase.from("weeks").update({ title: cleaned }).eq("id", weekId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateModuleStatus(moduleId: string, status: "ready" | "soon"): Promise<ActionResult> {
  if (!(await ensureAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("modules").update({ status }).eq("id", moduleId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/");
    revalidatePath(`/modules/${moduleId}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateWeekDate(weekId: string, date: string | null): Promise<ActionResult> {
  if (!(await ensureAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const supabase = getSupabaseAdmin();
    const value = date && date.trim() ? date.trim() : null;
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, error: "Invalid date." };
    const { data: week } = await supabase
      .from("weeks")
      .select("id, module_id")
      .eq("id", weekId)
      .single();
    if (!week) return { ok: false, error: "Week not found." };
    const { error } = await supabase.from("weeks").update({ done_on: value }).eq("id", weekId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/modules/${week.module_id}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function clearPageFiles(weekId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: pages } = await supabase
    .from("files")
    .select("cloudinary_public_id")
    .eq("week_id", weekId)
    .in("kind", ["page_print", "page_handwrite"]);
  for (const f of pages ?? []) {
    await deleteByPublicId(f.cloudinary_public_id);
  }
  await supabase
    .from("files")
    .delete()
    .eq("week_id", weekId)
    .in("kind", ["page_print", "page_handwrite"]);
}

async function splitWeekCore(
  weekId: string,
  pdfBuffer: Uint8Array,
  printPages: number[]
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: week } = await supabase
    .from("weeks")
    .select("id, module_id, week_number")
    .eq("id", weekId)
    .single();
  if (!week) throw new Error("Week not found.");

  await clearPageFiles(weekId);

  const doc = await PDFDocument.load(pdfBuffer);
  const total = doc.getPageCount();
  const print = printPages.filter((p) => p >= 1 && p <= total);
  const handwrite: number[] = [];
  for (let p = 1; p <= total; p++) {
    if (!print.includes(p)) handwrite.push(p);
  }

  const folder = `bwu/${week.module_id}/Week${week.week_number}`;
  for (const p of print) {
    const out = await PDFDocument.create();
    const [copied] = await out.copyPages(doc, [p - 1]);
    out.addPage(copied);
    const buf = await out.save();
    const name = `pages/print-${String(p).padStart(2, "0")}`;
    const asset = await uploadBuffer(buf, folder, name, "pdf");
    const { error } = await supabase.from("files").insert({
      week_id: weekId,
      kind: "page_print",
      page_no: p,
      cloudinary_public_id: asset.publicId,
      url: asset.url,
      original_name: `page-${String(p).padStart(2, "0")}.pdf`,
      size_bytes: buf.byteLength,
    });
    if (error) throw new Error(`Failed to save page ${p}: ${error.message}`);
  }

  for (const p of handwrite) {
    const out = await PDFDocument.create();
    const [copied] = await out.copyPages(doc, [p - 1]);
    out.addPage(copied);
    const buf = await out.save();
    const name = `pages/handwrite-${String(p).padStart(2, "0")}`;
    const asset = await uploadBuffer(buf, folder, name, "pdf");
    const { error } = await supabase.from("files").insert({
      week_id: weekId,
      kind: "page_handwrite",
      page_no: p,
      cloudinary_public_id: asset.publicId,
      url: asset.url,
      original_name: `page-${String(p).padStart(2, "0")}.pdf`,
      size_bytes: buf.byteLength,
    });
    if (error) throw new Error(`Failed to save page ${p}: ${error.message}`);
  }

  const { error: finErr } = await supabase
    .from("weeks")
    .update({ total_pages: total, handwrite_pages: handwrite, has_plan: true })
    .eq("id", weekId);
  if (finErr) throw new Error(finErr.message);
}