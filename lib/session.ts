import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "admin_session";

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) {
    throw new Error("Missing ADMIN_SESSION_SECRET env var.");
  }
  return new TextEncoder().encode(value);
}

export async function createSession(name: string): Promise<void> {
  const token = await new SignJWT({ name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function requireAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}