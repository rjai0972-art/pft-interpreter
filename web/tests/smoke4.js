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
  await page.locator('.vw[data-view="learn"]').click();
  await page.waitForSelector('.learn-body');
  await page.screenshot({ path: OUT + '/c1_learn_basics.png', fullPage: true });
  for (const id of ['loops', 'equations', 'sixmw', 'vol']) {
    await page.locator('.ln-btn[data-topic="' + id + '"]').click();
    await page.waitForSelector('.learn-body[data-topic="' + id + '"]');
    await page.screenshot({ path: OUT + '/c_learn_' + id + '.png', fullPage: true });
  }
  // Learn more from a popover on the case screen
  await page.locator('.vw[data-view="case"]').click();
  await page.locator('.ex').nth(1).click();
  await page.locator('.pill', { hasText: 'Lung volumes' }).click();
  const ib = page.locator('[data-field="vol.tlc"] .ib').first();
  await ib.click();
  await page.waitForTimeout(200);
  console.log('pinned', await page.locator('#pop.pinned').count());
  await page.screenshot({ path: OUT + '/c2_pop_tlc.png' });
  await page.locator('.pop-more').click();
  await page.waitForTimeout(400);
  console.log('after learn more: topic', await page.locator('.learn-body').getAttribute('data-topic'), 'flash', await page.locator('#term-tlc.flash').count(), 'open', await page.locator('#term-tlc').evaluate(e => e.open));
  await page.screenshot({ path: OUT + '/c3_learn_tlc.png' });
  // bank flow
  await page.locator('.vw[data-view="case"]').click();
  await page.locator('.pill', { hasText: 'Report' }).click();
  await page.locator('#save-bank').click();
  await page.locator('#bank-label').fill('ILD follow-up demo');
  await page.locator('#bank-save-go').click();
  await page.waitForTimeout(200);
  console.log('bank badge', await page.locator('#bank-n').innerText());
  // second case: COPD example, then save, then check similar cards
  await page.locator('.vw[data-view="case"]').click();
  await page.locator('.pill', { hasText: 'Tests' }).click();
  await page.locator('.ex').nth(0).click();
  await page.locator('#save-bank').click();
  await page.locator('#bank-label').fill('COPD demo');
  await page.locator('#bank-save-go').click();
  await page.locator('.vw[data-view="bank"]').click();
  await page.waitForSelector('.bank-case');
  console.log('cases', await page.locator('.bank-case').count());
  await page.locator('.bank-case').first().locator('[data-review="edit"]').click();
  await page.locator('.bank-case').first().locator('[data-part="vol"]').click();
  await page.locator('.bank-case').first().locator('textarea').fill('TLC should read low');
  await page.locator('.bank-case').first().locator('textarea').blur();
  await page.locator('.bank-case').nth(1).locator('[data-review="agree"]').click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + '/d1_bank.png', fullPage: true });
  // similar-case lookup: load ILD example again
  await page.locator('.vw[data-view="case"]').click();
  await page.locator('.pill', { hasText: 'Tests' }).click();
  await page.locator('.ex').nth(1).click();
  console.log('similar card', await page.locator('#similar').count());
  if (await page.locator('#similar').count()) console.log((await page.locator('#similar').innerText()).slice(0, 400));
  // rate a heads-up
  await page.locator('.hu-item .rt[data-rate="n"]').first().click();
  console.log('pressed', await page.locator('.hu-item .rt[aria-pressed="true"]').count());
  await page.screenshot({ path: OUT + '/d2_similar.png', fullPage: true });
  // export
  const stored = await page.evaluate(() => localStorage.getItem('pft.bank.v1').length);
  console.log('stored bytes', stored);
  console.log('errors', errs);
  await browser.close();
})();
