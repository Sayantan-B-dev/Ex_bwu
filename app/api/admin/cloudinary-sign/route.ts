import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { createHash } from "crypto";

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Missing Cloudinary env vars.");
  return { cloudName, apiKey, apiSecret };
}

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

export async function POST(req: NextRequest) {
  if (!(await checkAdmin(req))) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }

  try {
    const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
    const body = await req.json();
    const { folder, publicId, format } = body as {
      folder: string;
      publicId: string;
      format: string;
    };

    if (!folder || !publicId || !format) {
      return NextResponse.json({ ok: false, error: "Missing folder, publicId, or format." }, { status: 400 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign: Record<string, string | number> = {
      folder,
      public_id: publicId,
      timestamp,
      overwrite: "1",
    };

    const sorted = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join("&");

    const signature = createHash("sha256").update(sorted + apiSecret).digest("hex");

    return NextResponse.json({
      ok: true,
      timestamp,
      signature,
      apiKey,
      cloudName,
      folder,
      publicId,
      format,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
