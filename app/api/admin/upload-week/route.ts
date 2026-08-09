import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { PDFDocument } from "pdf-lib";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { uploadBuffer, deleteByPublicId } from "@/lib/cloudinary";
import { parseWeekName, WEEK_NAME_HINT } from "@/lib/weekname";

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error("Missing ADMIN_SESSION_SECRET env var.");
  return new TextEncoder().encode(value);
}

async function checkAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

async function clearPageFiles(supabase: ReturnType<typeof getSupabaseAdmin>, weekId: string): Promise<void> {
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
  supabase: ReturnType<typeof getSupabaseAdmin>,
  weekId: string,
  pdfBuffer: Uint8Array,
  printPages: number[]
): Promise<void> {
  const { data: week } = await supabase
    .from("weeks")
    .select("id, module_id, week_number")
    .eq("id", weekId)
    .single();
  if (!week) throw new Error("Week not found.");

  await clearPageFiles(supabase, weekId);

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

export async function POST(req: NextRequest) {
  if (!(await checkAdmin(req))) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { moduleId, fileName, fileUrl, cloudinaryPublicId, sizeBytes } = body as {
      moduleId: string;
      fileName: string;
      fileUrl: string;
      cloudinaryPublicId: string;
      sizeBytes: number;
    };

    if (!moduleId || !fileName || !fileUrl) {
      return NextResponse.json({ ok: false, error: "Missing module, file name, or file URL." });
    }

    const parsed = parseWeekName(fileName);
    if (!parsed) {
      return NextResponse.json({ ok: false, error: WEEK_NAME_HINT });
    }

    const { data: existing } = await supabase
      .from("weeks")
      .select("id")
      .eq("module_id", moduleId)
      .eq("week_number", parsed.n)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        ok: false,
        error: `Week ${parsed.n} already exists for this module. Delete it first or use another week number.`,
      });
    }

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
    if (insertError || !week) {
      return NextResponse.json({ ok: false, error: insertError?.message ?? "Could not save the week." });
    }

    await supabase.from("files").insert({
      week_id: week.id,
      kind: "full_pdf",
      page_no: null,
      cloudinary_public_id: cloudinaryPublicId,
      url: fileUrl,
      original_name: fileName,
      size_bytes: sizeBytes,
    });

    const resp = await fetch(fileUrl);
    if (!resp.ok) return NextResponse.json({ ok: false, error: "Could not download PDF from Cloudinary for splitting." });
    const pdfBuffer = new Uint8Array(await resp.arrayBuffer());

    await splitWeekCore(supabase, week.id, pdfBuffer, parsed.printPages);

    revalidatePath("/");
    revalidatePath(`/modules/${moduleId}`);
    revalidatePath("/admin");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
