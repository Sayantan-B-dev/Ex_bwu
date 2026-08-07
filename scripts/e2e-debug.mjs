import puppeteer from "puppeteer-core";
const BASE = "http://localhost:3000";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
page.on("console", (m) => console.log("[console]", m.type(), m.text().slice(0, 300)));
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
page.on("response", (r) => {
  if (r.request().method() === "POST") console.log("[POST]", r.status(), r.url());
});
page.on("framenavigated", (f) => console.log("[nav]", f.url()));

await page.goto(BASE + "/admin", { waitUntil: "networkidle2" });
console.log("URL after redirect:", page.url());
await page.click('input[name="name"]', { clickCount: 3 });
await page.type('input[name="name"]', "sayantan");
await page.click('input[name="pin"]', { clickCount: 3 });
await page.type('input[name="pin"]', "17071999bwubts25503");
await page.click('button[type="submit"]');
await new Promise((r) => setTimeout(r, 8000));
console.log("URL after submit:", page.url());
const cookies = await page.cookies();
console.log("cookies:", cookies.map((c) => c.name + "=" + (c.value.slice(0, 30) + "…")));
const text = await page.evaluate(() => document.body.innerText.slice(0, 400));
console.log("BODY:", JSON.stringify(text));
await browser.close();