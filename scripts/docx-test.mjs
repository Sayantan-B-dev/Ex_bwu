import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
page.on("console", (m) => {
  const t = m.text();
  if (t.includes("Hydration") || t.includes("error") || t.includes("Error")) console.log("[console]", m.type(), t.slice(0, 500));
});
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));

let popups = 0;
page.on("popup", () => (popups += 1));

await page.goto("http://localhost:3000/modules/python", { waitUntil: "networkidle2" });
await sleep(1000);

console.log("page-chip count:", await page.$$eval(".page-chip", (els) => els.length));
await page.click(".page-chip");
await sleep(600);
console.log("window.open popups after chip click:", popups);

console.log("Open Full PDF buttons:", await page.$$eval(".open-full", (els) => els.length));
await page.click(".open-full");
await sleep(600);
console.log("popups after open-full click:", popups);

await browser.close();