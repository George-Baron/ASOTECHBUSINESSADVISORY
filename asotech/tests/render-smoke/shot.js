const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch(); 
  for (const [f, w, h] of [["dashboard", 1366, 900], ["dashboard", 390, 900], ["login", 1366, 700]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto("file://" + process.cwd() + `/${f}.html`);
    await p.screenshot({ path: `${f}-${w}.png`, fullPage: true });
    const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(f, w, "horizontal overflow:", over);
  }
  await b.close();
})();
