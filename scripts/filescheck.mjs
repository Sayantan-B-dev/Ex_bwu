import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
const env = {};
for (const line of readFileSync("C:/Users/Virus404/Desktop/bwu/.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: files } = await s.from("files").select("week_id, kind, page_no");
const byWeek = {};
for (const f of files ?? []) (byWeek[f.week_id] ??= []).push(`${f.kind}:${f.page_no ?? "-"}`);
for (const [w, kinds] of Object.entries(byWeek)) console.log(w.slice(0, 8), kinds.join(", "));
