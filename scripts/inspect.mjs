import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = {};
for (const line of readFileSync("C:/Users/Virus404/Desktop/bwu/.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data: weeks } = await admin.from("weeks").select("*");
console.log("WEEKS:", JSON.stringify(weeks, null, 1));

for (const w of weeks ?? []) {
  const { data: files } = await admin.from("files").select("kind, page_no, url, original_name").eq("week_id", w.id);
  console.log(`\nweek=${w.week_number} (${w.title}) files (${files.length}):`);
  for (const f of files ?? []) console.log(`  - ${f.kind}${f.page_no ? " p" + f.page_no : ""} | ${f.original_name} | ${f.url.slice(0, 90)}`);
}