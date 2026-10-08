const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = 'file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html');
const OUT = path.join(__dirname, '..', 'shots2');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(FILE);
  await page.waitForSelector('.tgrid');
  await page.screenshot({ path: OUT + '/a1_tests.png' });
  // info button on a test
  await page.locator('.ttw .ib').first().hover();
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + '/a2_pop_hover.png' });
  console.log('pop visible', await page.locator('#pop').isVisible(), (await page.locator('#pop').innerText()).slice(0, 120).replace(/\n/g, ' | '));
  // load example and go to report
  await page.locator('.ex').nth(1).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/a3_report.png', fullPage: true });
  console.log('errors', errs);
  await browser.close();
})();
