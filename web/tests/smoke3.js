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
  // 6MWT trend: select 6MWT only
  await page.getByRole('button', { name: 'Exercise: 6MWT + CPET' }).click();
  await page.locator('input[data-test="cpet"]').uncheck();
  await page.getByRole('button', { name: 'Continue →' }).click();
  await page.getByLabel('Age', { exact: true }).fill('64');
  await page.locator('.pill', { hasText: '6MWT' }).click();
  await page.waitForSelector('.tr-block');
  await page.screenshot({ path: OUT + '/b1_six_empty.png', fullPage: true });
  // add earlier walks
  const rows = () => page.locator('.tr-row:not(.today)');
  await rows().first().locator('input[type=date]').fill('2024-04-10');
  await rows().first().locator('input.num').first().fill('455');
  await page.locator('#tr-add').click();
  await rows().nth(1).locator('input[type=date]').fill('2024-10-12');
  await rows().nth(1).locator('input.num').first().fill('440');
  await page.locator('#tr-add').click();
  await rows().nth(2).locator('input[type=date]').fill('2025-04-15');
  await rows().nth(2).locator('input.num').first().fill('418');
  await rows().nth(2).locator('input.num').nth(1).fill('90');
  await page.locator('#tr-add').click();
  await rows().nth(3).locator('input[type=date]').fill('2025-10-02');
  await rows().nth(3).locator('input.num').first().fill('392');
  await rows().nth(3).locator('[class~=cp]').first().click(); // on oxygen
  // today's walk
  const today = page.locator('.tr-row.today');
  await today.locator('input.num').first().fill('350');
  await today.locator('input.num').nth(1).fill('86');
  await page.locator('.tr-chartwrap svg').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/b2_six_chart.png', fullPage: true });
  // hover tooltip
  const box = await page.locator('.tr-chartwrap svg').boundingBox();
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
  await page.waitForTimeout(250);
  console.log('tip visible', await page.locator('.tr-tip').isVisible(), await page.locator('.tr-tip').innerText());
  await page.screenshot({ path: OUT + '/b3_six_hover.png', clip: { x: box.x - 10, y: box.y - 120, width: box.width + 20, height: box.height + 260 } });
  console.log('summary', (await page.locator('.tr-sum').innerText()).replace(/\n/g, ' | '));
  await page.locator('#tr-table').click();
  await page.waitForTimeout(150);
  console.log('table rows', await page.locator('.tr-tbl tbody tr').count());
  // Report
  await page.locator('.pill', { hasText: 'Report' }).click();
  console.log('report six:', (await page.locator('[data-sec="six"] p').innerText()).slice(0, 700));
  console.log('errors', errs);
  await browser.close();
})();
