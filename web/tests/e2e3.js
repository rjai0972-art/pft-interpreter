// Live report preview (right-hand panel): matches the Report step, follows the current step, updates on each click,
// stays inside the viewport, and steps aside on narrow screens, in Learn and Case bank, and in print.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = process.env.PFT_URL || ('file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
async function loadExample(page, i) {
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'examples' }));
  await page.waitForSelector('.learn-body[data-topic="examples"] .ex');
  await page.locator('.learn-body[data-topic="examples"] .ex').nth(i).click();
  await page.waitForSelector('#doc');
}

const readDoc = (sel) => `(() => { const d = document.querySelector(${JSON.stringify(sel)}); if (!d) return null;
  return { meta: [...d.querySelectorAll('.meta span')].map(x => x.textContent),
    secs: [...d.querySelectorAll('.sec')].map(s => ({ key: s.getAttribute('data-sec'), title: s.querySelector('h3').textContent, text: (s.querySelector('p:not(.pv-empty)') || {textContent: ''}).textContent, empty: !!s.querySelector('.pv-empty') })),
    impr: [...d.querySelectorAll('.interp .impr-s')].map(x => x.textContent), codes: [...d.querySelectorAll('.codes-row .code')].map(x => x.textContent) }; })()`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(FILE); await page.waitForSelector('.tgrid');

  // ---- first screen: panel present, empty-state wording
  ok(await page.locator('#pv').isVisible(), 'preview visible on the first screen at 1360 px');
  ok(/as values are entered/.test(await page.locator('#pv').innerText()), 'empty state explains itself');
  ok(!(await page.locator('.live').first().isVisible().catch(() => false)), 'per-step findings box hidden while the preview is shown');

  // ---- every example, every step: preview == Report step
  const names = await page.evaluate(() => window.PFT_EXAMPLES.EXAMPLES.map(e => e.name));
  ok(names.length >= 6, 'examples available: ' + names.length);
  let compared = 0;
  for (let ei = 0; ei < names.length; ei++) {
    const name = names[ei];
    await loadExample(page, ei);
    const rep = await page.evaluate(readDoc('#doc'));
    const steps = await page.locator('.pill').evaluateAll(els => els.map(e => e.getAttribute('data-step')));
    for (const st of steps) {
      if (st === 'report') continue;
      await page.evaluate((s) => window.__pft.goto(s), st);
      await page.waitForSelector('#pv:not([hidden]) .pv-doc');
      const pv = await page.evaluate(readDoc('#pv .pv-doc'));
      let same = pv && JSON.stringify(pv.meta) === JSON.stringify(rep.meta) && JSON.stringify(pv.impr) === JSON.stringify(rep.impr) && JSON.stringify(pv.codes) === JSON.stringify(rep.codes) && pv.secs.length === rep.secs.length;
      if (same) rep.secs.forEach((s, i) => { const q = pv.secs[i]; if (q.title !== s.title || q.key !== s.key) same = false; if (s.text !== '' && q.text !== s.text) same = false; if (s.text === '' && !q.empty) same = false; });
      ok(same, 'preview matches report: ' + name + ' @ ' + st);
      compared++;
    }
  }
  ok(compared > 40, 'compared ' + compared + ' example/step pairs');

  // ---- current step is marked, and the marked section is the step's own
  await loadExample(page, 0);
  for (const [st, key] of [['spiro', 'spiro'], ['dlco', 'dlco'], ['vol', 'vol']]) {
    const has = await page.locator('.pill[data-step="' + st + '"]').count();
    if (!has) continue;
    await page.evaluate((s) => window.__pft.goto(s), st);
    const cur = await page.locator('#pv .sec.cur').getAttribute('data-sec');
    ok(cur === key, 'current section marked for ' + st + ' (got ' + cur + ')');
  }

  // ---- panel is brought to the current section
  await page.evaluate(() => window.__pft.goto('dlco')); await page.waitForTimeout(100);
  const st1 = await page.evaluate(() => document.querySelector('#pv .pv-doc').scrollTop);
  await page.evaluate(() => window.__pft.goto('spiro')); await page.waitForTimeout(100);
  const st2 = await page.evaluate(() => document.querySelector('#pv .pv-doc').scrollTop);
  ok(st1 > st2, 'panel scrolls to the current section (dlco ' + st1 + ' > spiro ' + st2 + ')');

  // ---- live update from a click, with flash, without leaving the step
  await page.evaluate(() => { window.__pft.setMode('case'); window.__pft.goto('tests'); });
  await page.click('[data-test="spiro"], .tile[data-key="spiro"], button:has-text("Spirometry")').catch(() => {});
  // use a clean case, build it by clicks on the real form
  await page.evaluate(() => { const b = document.getElementById('new-case'); b.click(); b.click(); });
  await page.waitForSelector('.tgrid');
  await page.evaluate(() => { const S = window.__pft.state; S.tests.spiro = true; S.ctx.age = '60'; S.ctx.sex = 'M'; S.ctx.ht = '175'; window.__pft.goto('spiro'); });
  await page.waitForSelector('#pv .sec[data-sec="spiro"]');
  const before = await page.locator('#pv .sec[data-sec="spiro"]').innerText();
  ok(/Not entered yet|Waiting/.test(before), 'spirometry section waits before any value: ' + before.replace(/\n/g, ' | '));
  const optBtn = page.locator('#main [data-field="spiro.ratio"] .sg[data-v="low"]').first();
  const nBtns = await optBtn.count();
  ok(nBtns > 0, 'found a severity choice button on the spirometry form');
  if (nBtns) {
    await optBtn.click();
    await page.waitForTimeout(80);
    const after = await page.locator('#pv .sec[data-sec="spiro"]').innerText();
    ok(after !== before && !/Waiting for values/.test(after), 'clicking a choice fills the preview without navigating: ' + after.replace(/\n/g, ' | ').slice(0, 160));
    ok(await page.locator('#pv .sec.chg').count() >= 1, 'changed section flashes');
    ok(await page.evaluate(() => document.querySelector('.pill[aria-current="step"]').getAttribute('data-step')) === 'spiro', 'still on the spirometry step');
  }

  // ---- geometry: the panel stays on screen at scroll 0 and after scrolling
  for (const y of [0, 400, 1200]) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(120);
    const b = await page.locator('#pv').boundingBox(), vh = page.viewportSize().height;
    ok(b && b.y >= 0 && b.y + b.height <= vh + 1, 'preview inside the viewport at scroll ' + y + ' (y=' + (b && Math.round(b.y)) + ', h=' + (b && Math.round(b.height)) + ')');
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  ok(noOverflow, 'no horizontal page scroll with the panel');

  // ---- buttons
  await loadExample(page, 0); await page.evaluate(() => window.__pft.goto('spiro'));
  await page.click('#pv-copy'); await page.waitForTimeout(150);
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  const want = await page.evaluate(() => window.__pft.result.text);
  ok(clip === want && want.length > 100, 'Copy puts the report text on the clipboard');
  await page.click('#pv-open'); await page.waitForSelector('#doc');
  ok(await page.locator('#pv').isHidden(), 'preview hidden on the Report step');

  // ---- modes
  await page.click('.vw[data-view="learn"]'); await page.waitForSelector('.learn-body');
  ok(await page.locator('#pv').isHidden(), 'hidden in Learn');
  ok(await page.evaluate(() => document.querySelector('.learn-body').getBoundingClientRect().width) > 600, 'Learn content has room');
  await page.click('.vw[data-view="bank"]'); await page.waitForSelector('.card');
  ok(await page.locator('#pv').isHidden(), 'hidden in Case bank');
  await page.click('.vw[data-view="case"]'); await page.evaluate(() => window.__pft.goto('spiro')); await page.waitForSelector('#pv:not([hidden])');
  ok(true, 'back to Interpret shows the panel again');

  // ---- print never includes the panel
  await page.evaluate(() => window.__pft.goto('dlco'));
  await page.emulateMedia({ media: 'print' });
  ok(await page.evaluate(() => getComputedStyle(document.getElementById('pv')).display) === 'none', 'panel not printed');
  await page.emulateMedia({ media: 'screen' });

  // ---- breakpoint: two columns from 900 px, the running report below the form on narrower screens
  for (const [w, side] of [[1119, true], [1120, true], [900, true], [899, false]]) {
    await page.setViewportSize({ width: w, height: 860 }); await page.waitForTimeout(100);
    const vis = await page.locator('#pv').isVisible();
    ok(vis, 'running report present at ' + w + ' px');
    const pvB = await page.locator('#pv').boundingBox(), mainB = await page.locator('#main').boundingBox();
    const beside = pvB.x >= mainB.x + mainB.width - 2;
    ok(beside === side, 'running report ' + (side ? 'beside' : 'below') + ' the form at ' + w + ' px');
    ok(await page.locator('.live').count() === 0, 'no findings box at ' + w + ' px');
  }
  await ctx.close();

  const m = await browser.newContext({ viewport: { width: 400, height: 800 }, colorScheme: 'dark', hasTouch: true, isMobile: true });
  const mp = await m.newPage(); await mp.goto(FILE); await mp.waitForSelector('.tgrid');
  await loadExample(mp, 0); await mp.evaluate(() => window.__pft.goto('vol'));
  ok(await mp.locator('#pv').isVisible() && (await mp.locator('#pv').boundingBox()).y > (await mp.locator('#main').boundingBox()).y + 100, 'phone: running report below the form');
  ok(await mp.locator('.live').count() === 0, 'phone: no findings box');
  ok(await mp.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'phone: no horizontal scroll');
  await m.close();

  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await browser.close();
  console.log('e2e3 passed ' + pass + ' failed ' + fail);
  process.exit(fail ? 1 : 0);
})();
