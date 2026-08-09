"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PDFDocument } from "pdf-lib";
import { createSession, destroySession, requireAdmin } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { uploadBuffer, deleteByPublicId } from "@/lib/cloudinary";

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

export async function updateModuleMeta(
  moduleId: string,
  tagline: string,
  stats: string[],
  features: string[]
): Promise<ActionResult> {
  if (!(await ensureAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("modules")
      .update({ tagline: tagline.trim() || null, meta: { stats, features } })
      .eq("id", moduleId);
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