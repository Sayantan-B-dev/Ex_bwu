import "server-only";
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}