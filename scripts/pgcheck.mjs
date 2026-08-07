import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
const env = {};
for (const line of readFileSync("C:/Users/Virus404/Desktop/bwu/.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: files } = await s.from("files").select("url, kind, page_no");
for (const f of files ?? []) {
  if (f.kind === "full_pdf" || f.kind === "docx") continue;
  const r = await fetch(f.url);
  console.log(`${r.status} ${f.kind} p${f.page_no} ${f.url.slice(-30)}`);
}