const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = 'file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html');
const OUT = path.join(__dirname, '..', 'shots3');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, colorScheme: 'light' });
  const page = await ctx.newPage(); await page.goto(FILE); await page.waitForSelector('.tgrid');
  await page.screenshot({ path: OUT + '/pv_first.png' });
  await page.evaluate(() => { const S = window.__pft.state; S.tests.spiro = true; S.tests.vol = true; S.ctx.age = '64'; S.ctx.sex = 'F'; S.ctx.ht = '163'; window.__pft.goto('spiro'); });
  await page.locator('#main .seg button').filter({ hasText: /Below LLN/ }).first().click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: OUT + '/pv_spiro.png' });
  const m = await browser.newContext({ viewport: { width: 400, height: 800 }, colorScheme: 'light' });
  const mp = await m.newPage(); await mp.goto(FILE); await mp.waitForSelector('.tgrid');
  await mp.evaluate(() => { const S = window.__pft.state; S.tests.spiro = true; window.__pft.goto('spiro'); });
  await mp.screenshot({ path: OUT + '/pv_phone.png' });
  await browser.close();
})();
