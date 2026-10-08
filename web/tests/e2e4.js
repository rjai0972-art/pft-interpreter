// New controls: separate quality grades and limitation chips, DLCO hemoglobin basis, challenge completion, wording level,
// suggested additions (review-only wording), prior-study comparability flags, and the phrase catalog in Learn.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = process.env.PFT_URL || ('file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html'));
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL:', m); } };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(FILE);
  await page.waitForSelector('.tgrid');

  // COPD example: suggestions and wording level
  await page.locator('.ex').first().click();
  await page.evaluate(() => window.__pft.goto('report'));
  await page.waitForSelector('#doc');
  ok(await page.locator('[data-field="settings.style"] .ch').count() === 4, 'four wording levels');
  const sug = page.locator('#suggest .sug');
  const nSug = await sug.count();
  ok(nSug >= 2, 'suggested additions offered for the COPD case: ' + nSug);
  const emph = page.locator('#suggest .sug[data-sug="impression.emphysema_context"]');
  ok(await emph.count() === 1, 'emphysema context is offered (obstruction + hyperinflation + low DLCO)');
  const before = await page.locator('#doc .interp').innerText();
  ok(!/emphysema/i.test(before), 'disease name absent before tapping');
  await emph.click();
  await page.waitForTimeout(100);
  const after = await page.locator('#doc .interp').innerText();
  ok(/compatible with emphysema/i.test(after), 'tapped suggestion joins the interpretation');
  ok(await emph.getAttribute('aria-pressed') === 'true', 'chip shows included');
  ok((await page.evaluate(() => JSON.stringify(window.__pft.state.review))) === '{"impression.emphysema_context":true}', 'selection stored by phrase id');
  await emph.click(); await page.waitForTimeout(80);
  ok(!/emphysema/i.test(await page.locator('#doc .interp').innerText()), 'tap again removes it');
  // wording level changes the section text, not the facts
  const std = await page.locator('#doc .sec[data-sec="spiro"] p').innerText();
  await page.locator('[data-field="settings.style"] .ch[data-v="numeric"]').click(); await page.waitForTimeout(80);
  const numTxt = await page.locator('#doc .sec[data-sec="spiro"] p').innerText();
  ok(/1\.55 L/.test(numTxt) && numTxt !== std, 'numeric level prints the measured FEV1: ' + numTxt.slice(0, 120));
  await page.locator('[data-field="settings.style"] .ch[data-v="expanded"]').click(); await page.waitForTimeout(80);
  const expTxt = await page.locator('#doc .sec[data-sec="spiro"] p').innerText();
  ok(expTxt.length > std.length, 'detailed level is longer');
  await page.locator('[data-field="settings.style"] .ch[data-v="standard"]').click(); await page.waitForTimeout(80);
  ok(!/\{[a-z_]+\}/.test(await page.locator('#doc').innerText()), 'no placeholder in the report');
  await page.screenshot({ path: 'shots/41_report_suggestions.png', fullPage: true });

  // spirometry step: separate grades, limitation chips feed the interpretation
  await page.evaluate(() => window.__pft.goto('spiro'));
  await page.waitForSelector('[data-field="spiro.limits"]');
  await page.locator('[data-field="spiro.limits"] .cp[data-v="early"]').click(); await page.waitForTimeout(80);
  const pvTxt = await page.locator('#pv').innerText();
  ok(/Premature termination may underestimate FVC/.test(pvTxt), 'limitation chip appears in the preview section');
  await page.locator('[data-field="spiro.limits"] .cp[data-v="early"]').click(); await page.waitForTimeout(80);
  await page.screenshot({ path: 'shots/42_spiro_quality.png', fullPage: true });

  // DLCO basis
  await page.evaluate(() => window.__pft.goto('dlco'));
  await page.waitForSelector('[data-field="dlco.basis"]');
  ok(await page.locator('[data-field="dlco.basis"] .ch').count() === 2, 'basis: unadjusted / adjusted taps (blank = report does not say)');
  await page.locator('[data-field="dlco.basis"] .ch[data-v="adj"]').click(); await page.waitForTimeout(80);
  ok(/Hemoglobin-adjusted DLCO is/.test(await page.locator('#pv .sec[data-sec="dlco"]').innerText()), 'adjusted basis labels the DLCO line');
  ok(await page.locator('#hu-chip').innerText().then(t => /alert|caution/i.test(t)), 'two adjusted values flagged in the heads-up chip');
  await page.locator('[data-field="dlco.basis"] .ch[data-v="un"]').click(); await page.waitForTimeout(80);

  // prior comparability flags
  await page.evaluate(() => window.__pft.goto('prior'));
  await page.waitForSelector('[data-prior="1"]');
  const cmp = page.locator('[data-prior="1"] [data-group="cmp"]');
  ok(await cmp.locator('input[type=checkbox]').count() === 5, 'five comparability flags per prior');
  await cmp.locator('summary').click();
  await cmp.locator('input[type=checkbox]').first().check(); await page.waitForTimeout(80);
  ok(/Comparability is limited: different reference equations/.test(await page.locator('#pv .sec[data-sec="prior"]').innerText()), 'reference-equation flag reported');
  await cmp.locator('input[type=checkbox]').first().uncheck(); await page.waitForTimeout(80);

  // challenge: completion and censored maximum
  await page.evaluate(() => { const S = window.__pft.state; S.tests.bronch = true; S.bronch.type = 'mch'; S.bronch.mch_neg = true; S.bronch.unit = 'pd20'; S.bronch.mch_max = '400'; window.__pft.goto('bronch'); });
  await page.waitForSelector('[data-field="bronch.complete"]');
  await page.locator('[data-field="bronch.complete"] .ch[data-v="n"]').click(); await page.waitForTimeout(80);
  const brTxt = await page.locator('#pv .sec[data-sec="bronch"]').innerText();
  ok(/stopped before the planned maximum/.test(brTxt) && /PD20|400 µg/.test(brTxt) && !/is negative at the tested limit/.test(brTxt), 'incomplete challenge is not negative; censored maximum printed: ' + brTxt.slice(0, 160));

  // Learn: phrase catalog
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'phrases' }));
  await page.waitForSelector('.learn-body[data-topic="phrases"]');
  ok(await page.locator('.cat-sec').count() === 20, '20 catalog sections in Learn');
  await page.locator('.cat-sec[data-sec="patterns"] > summary').click();
  ok(await page.locator('.cat-sec[data-sec="patterns"] .cat-ph').count() === 19, '19 pattern phrases');
  ok(await page.locator('.srcs li').count() === 16, '16 primary sources listed');
  await page.screenshot({ path: 'shots/43_learn_catalog.png', fullPage: true });

  // report text never carries source keys
  await page.evaluate(() => { window.__pft.setMode('case'); window.__pft.goto('report'); });
  await page.waitForSelector('#plain', { state: 'attached' });
  const plain = await page.evaluate(() => document.getElementById('plain').textContent);
  ok(!/\b(I22|S19|L23|D17|R17|M19|M02|B17|B18|E13|F11|O20|W14|P22|RN23|I05)\b/.test(plain), 'no source keys in the copy-ready report');

  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  console.log('e2e4 passed ' + passes + ' failed ' + fails);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('E2E CRASH', e.message); process.exit(1); });
