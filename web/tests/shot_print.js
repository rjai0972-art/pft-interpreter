const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = 'file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html');
const OUT = path.join(__dirname, '..', 'shots3');
(async () => {
  const browser = await chromium.launch();
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 }, colorScheme: scheme });
    const page = await ctx.newPage();
    await page.goto(FILE); await page.waitForSelector('.tgrid');
    const names = await page.evaluate(() => window.PFT_EXAMPLES.EXAMPLES.map(e => e.name));
    await page.locator('.ex').first().click();
    await page.waitForSelector('#doc');
    await page.emulateMedia({ media: 'print', colorScheme: scheme });
    const vis = await page.evaluate(() => ({ top: getComputedStyle(document.querySelector('.top')).display, steps: getComputedStyle(document.querySelector('.steps')).display,
      hu: getComputedStyle(document.querySelector('#headsup')).display, doc: getComputedStyle(document.querySelector('#doc')).display, bg: getComputedStyle(document.body).backgroundColor, ink: getComputedStyle(document.querySelector('.doc .sec p')).color }));
    console.log(scheme, JSON.stringify(vis), names.length + ' examples');
    await page.pdf({ path: OUT + '/report_' + scheme + '.pdf', printBackground: true, preferCSSPageSize: true });
    // learn page print
    await page.emulateMedia({ media: 'screen' });
    await page.click('.vw[data-view="learn"]'); await page.waitForSelector('.learn-body');
    await page.emulateMedia({ media: 'print', colorScheme: scheme });
    const lv = await page.evaluate(() => ({ side: getComputedStyle(document.querySelector('.learn-side')).display, nav: getComputedStyle(document.querySelector('.learn-body .nav')).display }));
    console.log(' learn print', JSON.stringify(lv));
    await page.pdf({ path: OUT + '/learn_' + scheme + '.pdf', printBackground: true, preferCSSPageSize: true });
    await ctx.close();
  }
  await browser.close();
})();
