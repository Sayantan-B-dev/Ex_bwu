import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3000";
const CHROME = "/c/Program Files/Google/Chrome/Application/chrome.exe".replace(/^\/c\//, "C:/");

const failures = [];
const ok = (m) => console.log("  PASS", m);
const fail = (m) => { failures.push(m); console.log("  FAIL", m); };

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function writeValue(sel, val) {
  await page.click(sel, { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.type(sel, val);
}

// 1. Homepage
await page.goto(BASE + "/", { waitUntil: "networkidle2" });
const body = await page.evaluate(() => document.body.innerText);
if (body.includes("Python Lab") && body.includes("COA")) ok("homepage shows modules from Supabase");
else fail("homepage modules missing");

// 2. Module page
await page.goto(BASE + "/modules/python", { waitUntil: "networkidle2" });
await sleep(1000);
let mbody = await page.evaluate(() => document.body.innerText);
if (mbody.includes("PYTHON LAB") && mbody.includes("Weekly Reports")) ok("module page renders from DB");
else fail("module page missing: " + JSON.stringify(mbody.slice(0, 120)));

// 3. Admin unauthenticated -> redirected to login
await page.goto(BASE + "/admin", { waitUntil: "networkidle2" });
if (page.url().includes("/admin/login")) ok("unauthenticated /admin redirects to login");
else fail("no redirect to login: " + page.url());

// 4. Wrong PIN rejected
await writeValue('input[name="name"]', "sayantan");
await writeValue('input[name="pin"]', "wrong-pin");
await page.click('button[type="submit"]');
await new Promise(r => setTimeout(r, 2500));
let err = await page.evaluate(() => document.body.innerText);
if (err.includes("Invalid name or PIN")) ok("wrong PIN rejected with message");
else fail("wrong PIN: " + err.replace(/\n/g, " ").slice(0, 120));

// 5. Correct login
await writeValue('input[name="name"]', "sayantan");
await writeValue('input[name="pin"]', "17071999bwubts25503");
await page.click('button[type="submit"]');
await page.waitForFunction(() => location.pathname === "/admin", { timeout: 15000 });
ok("valid login lands on /admin");
await page.waitForTimeout(1500);

// 6. Dashboard shows module tabs + AddWeek form
let abody = await page.evaluate(() => document.body.innerText);
if (abody.includes("Upload & Auto-Split")) ok("dashboard renders with upload form");
else fail("dashboard content missing");

console.log(failures.length ? `\n${failures.length} FAILURES` : "\nALL E2E CHECKS PASSED");
await browser.close();
process.exit(failures.length ? 1 : 0);