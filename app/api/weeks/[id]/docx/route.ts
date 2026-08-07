import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: file } = await supabase
    .from("files")
    .select("url, original_name")
    .eq("week_id", id)
    .eq("kind", "docx")
    .maybeSingle();
  if (!file) {
    return NextResponse.json({ error: "No DOCX for this week." }, { status: 404 });
  }

  const resp = await fetch(file.url + "?fl_attachment=true");
  if (!resp.ok) {
    return NextResponse.json({ error: "Could not download the DOCX." }, { status: 502 });
  }
  const buf = await resp.arrayBuffer();

  const name = file.original_name ?? `Week${id.slice(0, 4)}.docx`;
  const fallback = name.replace(/[^\w.\- ]/g, "_");
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  });
}