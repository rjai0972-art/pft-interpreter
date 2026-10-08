const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = 'file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html');
const OUT = path.join(__dirname, '..', 'shots2');
(async () => {
  const browser = await chromium.launch();
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 }, colorScheme: scheme });
    const page = await ctx.newPage();
    await page.goto(FILE); await page.waitForSelector('.tgrid');
    await page.evaluate(() => {
      const st = window.__pft.state;
      st.tests.sixmw = true; st.ctx.date = '2026-10-05'; st.ctx.age = '63'; st.ctx.sex = 'F';
      st.sixmw.dist = '338'; st.sixmw.spo2_nadir = '86'; st.sixmw.lln = '395';
      st.trend6.list = [
        { date: '2023-10-03', dist: '452', nadir: '95', o2: '' }, { date: '2024-04-09', dist: '441', nadir: '94', o2: '' },
        { date: '2024-10-15', dist: '436', nadir: '92', o2: '' }, { date: '2025-04-08', dist: '421', nadir: '91', o2: '' },
        { date: '2025-07-01', dist: '409', nadir: '89', o2: '' }, { date: '2026-01-13', dist: '382', nadir: '88', o2: 'o2' },
        { date: '2026-04-14', dist: '395', nadir: '93', o2: 'o2' }];
      window.__pft.goto('sixmw');
    });
    await page.waitForSelector('.tr-svg');
    await page.locator('.tr-block').scrollIntoViewIfNeeded();
    const svg = page.locator('.tr-svg'); const b = await svg.boundingBox();
    await page.mouse.move(b.x + b.width * 0.62, b.y + b.height * 0.5); await page.waitForTimeout(250);
    await page.locator('.tr-chartwrap').screenshot({ path: OUT + '/chart_' + scheme + '.png' });
    await page.locator('.tr-sum').screenshot({ path: OUT + '/chartsum_' + scheme + '.png' });
    await ctx.close();
  }
  await browser.close();
})();
