import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: week, error } = await supabase
    .from("weeks")
    .select("id, week_number, title")
    .eq("id", id)
    .maybeSingle();
  if (error || !week) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: pages } = await supabase
    .from("files")
    .select("url, page_no")
    .eq("week_id", id)
    .eq("kind", "page_print")
    .order("page_no", { ascending: true });
  if (!pages || pages.length === 0) {
    return NextResponse.json({ error: "No print pages for this week." }, { status: 404 });
  }

  const merged = await PDFDocument.create();
  for (const page of pages) {
    try {
      const resp = await fetch(page.url);
      if (!resp.ok) continue;
      const src = await PDFDocument.load(await resp.arrayBuffer());
      const copied = await merged.copyPages(src, src.getPageIndices());
      copied.forEach((cp) => merged.addPage(cp));
    } catch {
      // skip a page that fails to load
    }
  }
  if (merged.getPageCount() === 0) {
    return NextResponse.json({ error: "Could not merge the print pages." }, { status: 500 });
  }

  const bytes = await merged.save();
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const name = `Week${week.week_number}_${week.title.replace(/\s+/g, "_")}_Print_Pages.pdf`;
  const fallback = name.replace(/[^\w.\- ]/g, "_");
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  });
}