import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: week } = await supabase
    .from("weeks")
    .select("week_number, title")
    .eq("id", id)
    .maybeSingle();
  if (!week) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: file } = await supabase
    .from("files")
    .select("url, original_name")
    .eq("week_id", id)
    .eq("kind", "full_pdf")
    .maybeSingle();
  if (!file) {
    return NextResponse.json({ error: "No full PDF for this week." }, { status: 404 });
  }

  const resp = await fetch(file.url);
  if (!resp.ok) {
    return NextResponse.json({ error: "Could not download the PDF." }, { status: 502 });
  }
  const buf = await resp.arrayBuffer();

  const name = file.original_name ?? `Week${week.week_number}_${week.title.replace(/\s+/g, "_")}.pdf`;
  const fallback = name.replace(/[^\w.\- ]/g, "_");
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  });
}
