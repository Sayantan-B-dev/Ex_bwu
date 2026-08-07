import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.log(m);

async function writeValue(sel, val) {
  await page.click(sel, { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.type(sel, val);
}

await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle2" });
await writeValue('input[name="name"]', "sayantan");
await writeValue('input[name="pin"]', "17071999bwubts25503");
await page.click('button[type="submit"]');
await page.waitForFunction(() => location.pathname === "/admin", { timeout: 20000 });
await sleep(1500);

// snapshot card titles + week numbers
const cards = await page.$$eval(".admin-week", (els) =>
  els.map((el) => ({ title: (el.querySelector(".admin-week-title")?.textContent || "").trim() }))
);
console.log("cards found:", JSON.stringify(cards));

// For robustness we re-evaluate per round: find the FIRST card whose header does NOT yet
// show all print pages, i.e., has a "Re-split Pages" button AND (optionally) fewer page chips.
for (let round = 0; round < 8; round++) {
  const btnInfo = await page.$$eval(".admin-week", (els) =>
    els.map((el) => {
      const btns = Array.from(el.querySelectorAll("button"));
      const resplit = btns.find((b) => (b.textContent || "").trim() === "Re-split Pages");
      return { title: (el.querySelector(".admin-week-title")?.textContent || "").trim(),
               hasResplit: !!resplit, disabled: resplit ? resplit.disabled : true,
               chips: el.querySelectorAll(".admin-page").length };
    })
  );
  log(JSON.stringify(btnInfo));
  const target = btnInfo.find((c) => c.hasResplit && !c.disabled && c.chips < 20);
  if (!target) {
    log("no target left");
    break;
  }
  const idx = btnInfo.indexOf(target);
  const btn = await page.$$eval(".admin-week .admin-page "+'.admin-week button', () => 0); // noop
  const tot = await page.$$(".admin-week");
  const card = tot[idx];
  const btns = await card.$$("button");
  let clickedIdx = -1;
  for (let i = 0; i < btns.length; i++) {
    if ((await btns[i].evaluate((el) => el.textContent || "")).trim() === "Re-split Pages") { clickedIdx = i; break; }
  }
  if (clickedIdx === -1) break;
  await btns[clickedIdx].click();
  log("re-split clicked for card index", idx, "- waiting 16s");
  await sleep(16000);
  await page.reload({ waitUntil: "networkidle2" });
  await sleep(1200);
}
await browser.close();