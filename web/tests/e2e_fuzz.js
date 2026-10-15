const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = process.env.PFT_URL || ('file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html'));
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = (a) => a[Math.floor(rnd() * a.length)];
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(FILE); await page.waitForSelector('#top');
  let leaks = 0, rounds = 3;
  for (let r = 0; r < rounds; r++) {
    for (const k of await page.locator('.tchip[aria-pressed="false"]').evaluateAll(els => els.map(e => e.getAttribute('data-test')))) await page.locator('.tchip[data-test="' + k + '"]').click();
    const ids = await page.locator('details.tsec').evaluateAll(els => els.map(e => e.getAttribute('data-mod')));
    if (r === 0 && rnd() < 0.5) { await page.locator('[data-prior-add]').first().click(); }
    // open every collapsed panel so typed inputs are exercised too
    const dets = page.locator('#main details.optgrp, #main details.tsec');
    for (let i = 0; i < await dets.count(); i++) { const d = dets.nth(i); if (await d.isVisible() && !(await d.evaluate(e => e.open))) await d.locator('summary').first().click(); }
    // tap rows: param categories, choices, chips, loop tiles
    const rows = page.locator('#main .ix, #main .prm, #main .ps-cell');
    for (let i = 0; i < await rows.count(); i++) {
      const row = rows.nth(i);
      if (!(await row.isVisible())) continue;
      for (const sel of ['.sg', '.ch:not(:disabled)', '.cp', '.lp-tile']) {
        const b = row.locator(sel); const n = await b.count();
        if (n && rnd() < 0.7) { const k = rnd() < 0.5 && sel === '.cp' ? 3 : 1; for (let j = 0; j < k; j++) await b.nth(Math.floor(rnd() * n)).click(); }
      }
      const z = row.locator('.zc input');
      if (await z.count() && await z.first().isVisible() && rnd() < 0.3) await z.first().fill(String((rnd() * 10 - 6).toFixed(1)));
      const qd = row.locator('.qdates .cp'); if (await qd.count() && rnd() < 0.5) await qd.nth(Math.floor(rnd() * await qd.count())).click();
    }
    const ub = page.locator('#main .ubtn');
    for (let i = 0; i < await ub.count(); i++) if (rnd() < 0.3 && await ub.nth(i).isVisible()) await ub.nth(i).click();
    const more = page.locator('#main .more-btn');
    for (let i = 0; i < await more.count(); i++) if (rnd() < 0.5 && await more.nth(i).isVisible()) await more.nth(i).click();
    // numeric & text inputs
    const inputs = page.locator('#main input[type=text]:not(.zc input), #main input[type=date]');
    const cnt = await inputs.count();
    for (let i = 0; i < cnt; i++) {
      const el = inputs.nth(i); const t = await el.getAttribute('type');
      if (!(await el.isVisible())) continue;
      if (t === 'date') { await el.fill(pick(['2025-03-05','2024-01-10','2023-06-01','2026-01-01'])); continue; }
      const v = rnd() < 0.1 ? 'x' : (rnd() < 0.15 ? '' : String((rnd() * 150).toFixed(rnd() < 0.5 ? 0 : 2)));
      await el.fill(v);
    }
    const cks = page.locator('#main .chkrow input');
    for (let i = 0; i < await cks.count(); i++) { if (rnd() < 0.5 && await cks.nth(i).isVisible()) await cks.nth(i).click(); }
    const t = await page.locator('main').innerText() + '\n' + await page.locator('#pv').innerText();
    if (/undefined|NaN|\[object|Infinity/.test(t)) { leaks++; console.log('LEAK round', r, (t.match(/.{40}(undefined|NaN|\[object|Infinity).{40}/) || [t.slice(0,80)])[0]); }
    ok: for (const id of ids) { await page.evaluate((s) => window.__pft.goto(s), id); }
  }
  console.log('rounds', rounds, 'leaks', leaks, 'pageerrors', errs.length, errs.slice(0, 3));
  await browser.close(); process.exit(leaks || errs.length ? 1 : 0);
})().catch(e => { console.error('CRASH', e.message.split('\n')[0]); process.exit(2); });
