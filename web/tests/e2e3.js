// The report column: the same text as the copy, the section being edited marked, a change flashes without leaving the
// page, the column stays on screen while the page scrolls, it is never printed, and it moves below the form on narrow screens.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = process.env.PFT_URL || ('file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
async function loadExample(page, i) {
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'examples' }));
  await page.waitForSelector('.learn-body[data-topic="examples"] .ex');
  await page.locator('.learn-body[data-topic="examples"] .ex').nth(i).click();
  await page.waitForSelector('#top');
}
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(FILE); await page.waitForSelector('#top');

  ok(await page.locator('#pv').isVisible(), 'report column visible on the first screen at 1360 px');
  ok(/as values are entered/.test(await page.locator('#pv').innerText()), 'empty state explains itself');

  // ---- every example: the column's sections and interpretation are exactly the copied text
  const names = await page.evaluate(() => window.PFT_EXAMPLES.EXAMPLES.map(e => e.name));
  let compared = 0;
  for (let ei = 0; ei < names.length; ei++) {
    await loadExample(page, ei);
    const onScreen = await page.evaluate(() => Array.from(document.querySelectorAll('#doc .sec')).map(s => s.querySelector('h3').textContent + ' ' + s.querySelector('p').textContent).concat(['INTERPRETATION: ' + Array.from(document.querySelectorAll('#doc .impr-s')).map(e => e.textContent.trim()).join(' ')]));
    const copy = await page.evaluate(() => window.__pft.result.text);
    const lines = copy.split('\n').filter(Boolean);
    const same = onScreen.length === lines.length && onScreen.every((l, i) => l.replace(/\s+/g, ' ').trim() === lines[i].replace(/\s+/g, ' ').trim());
    ok(same, 'column matches the copied text: ' + names[ei] + (same ? '' : '\n  screen: ' + onScreen.join(' | ').slice(0, 300) + '\n  copy:   ' + lines.join(' | ').slice(0, 300)));
    compared++;
  }
  ok(compared >= 6, 'compared ' + compared + ' examples');

  // ---- the section being edited is marked (follows focus)
  await loadExample(page, 0);
  for (const [sec, key] of [['spiro', 'spiro'], ['dlco', 'dlco'], ['vol', 'vol']]) {
    const el = page.locator('details.tsec[data-mod="' + sec + '"] input').first();
    if (!(await el.count())) continue;
    await el.focus();
    const cur = await page.locator('#pv .sec.cur').getAttribute('data-sec');
    ok(cur === key, 'current section marked for ' + sec + ' (got ' + cur + ')');
  }

  // ---- a click fills the column with a flash, without leaving the page
  await page.evaluate(() => { const b = document.getElementById('new-case'); b.click(); b.click(); });
  await page.waitForSelector('#top');
  await page.evaluate(() => { const S = window.__pft.state; S.tests.spiro = true; S.ctx.age = '60'; S.ctx.sex = 'M'; S.ctx.ht = '175'; window.__pft.goto('spiro'); });
  await page.waitForSelector('#pv .sec[data-sec="spiro"]');
  const before = await page.locator('#pv .sec[data-sec="spiro"]').innerText();
  ok(/Not entered yet/.test(before), 'spirometry section waits before any value: ' + before.replace(/\n/g, ' | '));
  await page.locator('[data-field="spiro.ratio"] .sg[data-v="low"]').click(); await page.waitForTimeout(80);
  const after = await page.locator('#pv .sec[data-sec="spiro"]').innerText();
  ok(after !== before && !/Not entered yet/.test(after), 'clicking a choice fills the column: ' + after.replace(/\n/g, ' | ').slice(0, 160));
  ok(await page.locator('#pv .sec.chg').count() >= 1, 'changed section flashes');
  ok(await page.locator('details.tsec[data-mod="spiro"]').isVisible(), 'still on the page');

  // ---- geometry: the column stays on screen at scroll 0 and after scrolling
  await page.evaluate(() => { const S = window.__pft.state; S.tests.vol = true; S.tests.dlco = true; S.tests.sixmw = true; S.tests.cpet = true; window.__pft.goto('spiro'); });
  for (const y of [0, 400, 1200]) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(120);
    const b = await page.locator('#pv').boundingBox(), vh = page.viewportSize().height;
    ok(b && b.y >= 0 && b.y + b.height <= vh + 1, 'column inside the viewport at scroll ' + y + ' (y=' + (b && Math.round(b.y)) + ', h=' + (b && Math.round(b.height)) + ')');
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'no horizontal overflow with five tests on the page');

  // ---- print never includes the column
  await page.emulateMedia({ media: 'print' });
  ok(await page.evaluate(() => getComputedStyle(document.getElementById('pv')).display) === 'none', 'column not printed');
  await page.emulateMedia({ media: 'screen' });

  // ---- breakpoint: two columns from 900 px, the column below the form on narrower screens
  for (const [w, side] of [[1119, true], [900, true], [899, false]]) {
    await page.setViewportSize({ width: w, height: 860 }); await page.waitForTimeout(100);
    ok(await page.locator('#pv').isVisible(), 'report present at ' + w + ' px');
    const pvB = await page.locator('#pv').boundingBox(), mainB = await page.locator('#main').boundingBox();
    const beside = pvB.x >= mainB.x + mainB.width - 2;
    ok(beside === side, 'report ' + (side ? 'beside' : 'below') + ' the form at ' + w + ' px');
  }
  await ctx.close();

  const m = await browser.newContext({ viewport: { width: 400, height: 800 }, colorScheme: 'dark', hasTouch: true, isMobile: true });
  const mp = await m.newPage(); await mp.goto(FILE); await mp.waitForSelector('#top');
  await loadExample(mp, 0);
  ok(await mp.locator('#pv').isVisible() && (await mp.locator('#pv').boundingBox()).y > (await mp.locator('#main').boundingBox()).y + 100, 'phone: report below the form');
  ok(await mp.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'phone: no horizontal scroll');
  await m.close();

  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await browser.close();
  console.log('e2e3 passed ' + pass + ' failed ' + fail);
  process.exit(fail ? 1 : 0);
})();
