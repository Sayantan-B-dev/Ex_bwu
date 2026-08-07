import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error("Missing ADMIN_SESSION_SECRET env var.");
  return new TextEncoder().encode(value);
}

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();
  const token = req.cookies.get("admin_session")?.value;
  if (token) {
    try {
      await jwtVerify(token, secret());
      return NextResponse.next();
    } catch {
      // invalid/expired -> fall through to login
    }
  }
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = {
  matcher: ["/admin/:path*"],
};