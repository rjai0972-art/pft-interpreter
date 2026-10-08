const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = process.env.PFT_URL || ('file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html'));
const OUT = path.join(__dirname, '..', 'shots3');
(async () => {
  const browser = await chromium.launch();
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, colorScheme: scheme });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.goto(FILE); await page.waitForSelector('.tgrid');
    await page.locator('.ex').first().click(); await page.waitForSelector('#doc');
    await page.evaluate(() => window.__pft.goto('dlco'));
    await page.waitForSelector('#pv:not([hidden]) .pv-doc');
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT + '/pv_dlco_' + scheme + '.png' });
    console.log(scheme, 'errors', errs.length, 'pv sections', await page.locator('#pv .sec').count(), 'current:', await page.locator('#pv .sec.cur h3').allInnerTexts());
    await ctx.close();
  }
  await browser.close();
})();
