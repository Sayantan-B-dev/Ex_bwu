import path from "path";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";

const ROOT = path.join(process.cwd(), "3rdSemProjects");

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  if (
    segments.length === 0 ||
    segments.some((s) => s === ".." || s === "." || s.startsWith(".") || s.includes("\\") || s.includes("/"))
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const filePath = path.resolve(path.join(ROOT, ...segments));
  if (!filePath.startsWith(ROOT + path.sep)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".pdf" && ext !== ".docx") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let data: Buffer;
  try {
    data = await readFile(filePath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const disposition =
    ext === ".pdf" ? "inline" : "attachment";
  const headers = new Headers();
  headers.set("Content-Type", MIME[ext]);
  headers.set(
    "Content-Disposition",
    `${disposition}; filename*=UTF-8''${encodeURIComponent(path.basename(filePath))}`
  );
  headers.set("Cache-Control", "public, max-age=3600");
  return new NextResponse(new Uint8Array(data), { status: 200, headers });
}
