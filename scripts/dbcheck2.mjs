import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
const env = {};
for (const line of readFileSync("C:/Users/Virus404/Desktop/bwu/.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data: week, error } = await s.from("weeks").select("id, module_id, week_number, done_on").limit(1);
console.log("with done_on:", error ? "ERR " + error.message : JSON.stringify(week));

const { data: w2, error: e2 } = await s.from("weeks").select("id").limit(1);
console.log("without done_on:", e2 ? "ERR " + e2.message : "ok rows=" + (w2 ?? []).length);