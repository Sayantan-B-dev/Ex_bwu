import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { deleteByPublicId } from "@/lib/cloudinary";
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin(req))) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }

  try {
    const { id: weekId } = await params;
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { cloudinaryPublicId, cloudinaryUrl, originalName, sizeBytes } = body as {
      cloudinaryPublicId: string;
      cloudinaryUrl: string;
      originalName: string;
      sizeBytes: number;
    };

    if (!cloudinaryPublicId || !cloudinaryUrl || !originalName) {
      return NextResponse.json({ ok: false, error: "Missing upload metadata." });
    }

    const { data: week, error: weekError } = await supabase
      .from("weeks")
      .select("id, module_id, week_number")
      .eq("id", weekId)
      .single();
    if (weekError || !week) {
      return NextResponse.json({ ok: false, error: "Week not found." }, { status: 404 });
    }

    const parsed = parseWeekName(originalName);
    if (!parsed) {
      return NextResponse.json({ ok: false, error: WEEK_NAME_HINT });
    }
    if (parsed.n !== week.week_number) {
      return NextResponse.json({
        ok: false,
        error: `DOCX is for Week ${parsed.n}, but this week is Week ${week.week_number}.`,
      });
    }

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
      cloudinary_public_id: cloudinaryPublicId,
      url: cloudinaryUrl,
      original_name: originalName,
      size_bytes: sizeBytes,
    });

    revalidatePath(`/modules/${week.module_id}`);
    revalidatePath("/admin");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
