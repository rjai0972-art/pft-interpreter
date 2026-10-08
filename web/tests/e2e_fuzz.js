const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = process.env.PFT_URL || ('file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html'));
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = (a) => a[Math.floor(rnd() * a.length)];
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(FILE); await page.waitForSelector('.tgrid');
  let leaks = 0, rounds = 8;
  for (let r = 0; r < rounds; r++) {
    await page.locator('.pill[data-step="tests"]').click();
    const boxes = page.locator('.tt input');
    for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check();
    const ids = await page.locator('.steps .pill').evaluateAll(els => els.map(e => e.getAttribute('data-step')));
    for (const id of ids) {
      if (id === 'tests' || id === 'report') continue;
      await page.locator('.pill[data-step="' + id + '"]').click();
      // open every collapsed panel so typed inputs are exercised too
      const dets = page.locator('#main details.optgrp');
      for (let i = 0; i < await dets.count(); i++) { const d = dets.nth(i); if (await d.isVisible() && !(await d.evaluate(e => e.open))) await d.locator('summary').first().click(); }
      // tap rows: param categories, choices, chips, loop tiles
      const rows = page.locator('#main .prm');
      for (let i = 0; i < await rows.count(); i++) {
        const row = rows.nth(i);
        if (!(await row.isVisible())) continue;
        for (const sel of ['.sg', '.ch', '.cp', '.lp-tile']) {
          const b = row.locator(sel); const n = await b.count();
          if (n && rnd() < 0.7) { const k = rnd() < 0.5 && sel === '.cp' ? 3 : 1; for (let j = 0; j < k; j++) await b.nth(Math.floor(rnd() * n)).click(); }
        }
        const zl = row.locator('.zlink');
        if (await zl.count() && await zl.isVisible() && rnd() < 0.3) { await zl.click(); await row.locator('.zbox input').fill(String((rnd() * 10 - 6).toFixed(1))); }
        const qd = row.locator('.qdates .cp'); if (await qd.count() && rnd() < 0.5) await qd.nth(Math.floor(rnd() * await qd.count())).click();
      }
      const qb = page.locator('#main .quick');
      for (let i = 0; i < await qb.count(); i++) if (rnd() < 0.5) await qb.nth(i).click();
      // numeric & text inputs
      const inputs = page.locator('#main input[type=text]:not(.zbox input), #main input[type=date], .prior-card input:not([type=checkbox])');
      const cnt = await inputs.count();
      for (let i = 0; i < cnt; i++) {
        const el = inputs.nth(i); const t = await el.getAttribute('type');
        if (!(await el.isVisible())) continue;
        if (await el.evaluate(e => !!e.closest('.zbox'))) continue;
        if (t === 'date') { await el.fill(pick(['2025-03-05','2024-01-10','2023-06-01','2026-01-01'])); continue; }
        const v = rnd() < 0.1 ? 'x' : (rnd() < 0.15 ? '' : String((rnd() * 150).toFixed(rnd() < 0.5 ? 0 : 2)));
        await el.fill(v);
      }
      const cks = page.locator('#main .chkrow input');
      for (let i = 0; i < await cks.count(); i++) { if (rnd() < 0.5 && await cks.nth(i).isVisible()) await cks.nth(i).click(); }
    }
    await page.locator('.pill[data-step="report"]').click();
    const t = await page.locator('main').innerText();
    if (/undefined|NaN|\[object|Infinity/.test(t)) { leaks++; console.log('LEAK round', r, (t.match(/.{40}(undefined|NaN|\[object|Infinity).{40}/) || [t.slice(0,80)])[0]); }
    // each step still renders
    for (const id of ids) { await page.locator('.pill[data-step="' + id + '"]').click(); }
  }
  console.log('rounds', rounds, 'leaks', leaks, 'pageerrors', errs.length, errs.slice(0, 3));
  await browser.close(); process.exit(leaks || errs.length ? 1 : 0);
})().catch(e => { console.error('CRASH', e.message.split('\n')[0]); process.exit(2); });
