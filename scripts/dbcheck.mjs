import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = {};
for (const line of readFileSync("C:/Users/Virus404/Desktop/bwu/.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data: modules, error: me } = await admin.from("modules").select("*");
console.log("modules:", me ? "ERR " + me.message : JSON.stringify(modules));

const { data: weeks, error: we } = await admin.from("weeks").select("*");
console.log("weeks:", we ? "ERR " + we.message : JSON.stringify(weeks));

const { data: ok, error: rpcErr } = await admin.rpc("check_admin", { candidate: "sayantan", pin: "17071999bwubts25503" });
console.log("check_admin ok:", rpcErr ? "ERR " + rpcErr.message : ok);

const { data: bad, error: badErr } = await admin.rpc("check_admin", { candidate: "sayantan", pin: "wrong" });
console.log("check_admin bad pin:", badErr ? "ERR " + badErr.message : bad);

const { data: hacked, error: hak } = await admin.from("admins").select("*");
console.log("anon read admins (should be blocked):", hak ? "BLOCKED (" + hak.message + ")" : JSON.stringify(hacked));