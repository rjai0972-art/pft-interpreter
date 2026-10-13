// v5 interface: units on every value box, value boxes beside the category buttons, prior columns at the top of the
// step, bronchodilator inside spirometry, essentials-only rows, pattern prompts, DLCO correction wording, themes.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = process.env.PFT_URL || ('file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html'));
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL:', m); } };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1380, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(FILE); await page.waitForSelector('.tgrid');
  const pv = (key) => page.locator('#pv .sec[data-sec="' + key + '"]').innerText();
  const state = () => page.evaluate(() => window.__pft.state);

  // ---- running report beside the form on every step, headings with colons, INTERPRETATION
  ok(await page.locator('#pv').isVisible(), 'running report present on the first screen');
  await page.getByRole('button', { name: 'ILD work-up', exact: true }).click();
  ok(await page.locator('.steps .pill').allInnerTexts().then(a => a.join()) === 'Tests,Details,Spirometry,Lung volumes,DLCO,6MWT,Report', 'ILD quick set: no loop, no bronchodilator step');
  await page.evaluate(() => window.__pft.goto('ctx'));
  await page.getByLabel('Age', { exact: true }).fill('58');
  await page.locator('[data-field="ctx.sex"] .ch[data-v="F"]').click();
  await page.getByLabel('Height', { exact: true }).fill('64');
  await page.locator('[data-unit="len"]').click();
  ok(await page.locator('[data-unit="len"]').innerText() === 'in' && Math.abs((await page.evaluate(() => window.__pft.result.facts.ctx.ht)) - 162.6) < 0.1, 'height in inches converted to cm for the equations');
  await page.getByLabel('Weight', { exact: true }).fill('95');
  ok(/BMI 35\.9/.test(await page.locator('[data-field="ctx.wt"] .note').innerText()), 'BMI shown beside the weight: ' + await page.locator('[data-field="ctx.wt"] .note').innerText());
  const heads = await page.locator('#pv .sec h3').allInnerTexts();
  ok(heads.every(t => /:$/.test(t)) && await page.locator('#pv .interp h3').innerText() === 'INTERPRETATION:', 'every heading ends with a colon; INTERPRETATION heading: ' + heads.join(' '));

  // ---- lung volumes: essentials only, rows with value boxes, RV/TLC typed as %
  await page.evaluate(() => window.__pft.goto('vol'));
  const visVol = await page.locator('[data-grid="vol"] .ix:visible:not(.ix-head) .prm-l').allInnerTexts();
  ok(visVol.join() === 'TLC,RV,RV/TLC', 'volumes show TLC, RV and RV/TLC only: ' + visVol.join());
  ok(/FRC, FRC\/TLC, SVC, ERV, IC/.test(await page.locator('[data-more="vol"]').innerText()), 'the rest sits under More: ' + await page.locator('[data-more="vol"]').innerText());
  await page.locator('[data-field="vol.tlc"] .sg[data-v="mod"]').click();
  await page.locator('[data-cell="vol.tlc_abs"] input').fill('3.1');
  await page.locator('[data-cell="vol.tlc_pct"] input').fill('61');
  await page.locator('[data-field="vol.rvtlc"] .sg[data-v="wnl"]').click();
  await page.locator('[data-cell="vol.rvtlc_pct"] input').fill('34');
  ok(/TLC 3\.10 L, 61% predicted; RV\/TLC 34%\. Reduced Total Lung Capacity \(TLC\) is consistent with moderate restrictive impairment/.test(await pv('vol')), 'volumes numbers line from the row boxes: ' + await pv('vol'));
  ok(await page.locator('[data-prompts="vol"]').isHidden(), 'no ERV prompt before the DLCO is known');

  // ---- DLCO: reported as corrected vs not; prompts for the basis and the Hb; ERV prompt on restriction with a normal DLCO
  await page.evaluate(() => window.__pft.goto('dlco'));
  await page.locator('[data-field="dlco.dlco"] .sg[data-v="wnl"]').click();
  ok(await page.locator('[data-prompts="dlco"]').isHidden(), 'a normal DLCO prompts for nothing');
  await page.evaluate(() => window.__pft.goto('vol'));
  const pr = page.locator('[data-prompts="vol"] .prompt');
  ok(await pr.count() === 1 && /Restrictive pattern with a normal DLCO: enter the ERV/.test(await pr.innerText()), 'restriction + normal DLCO prompts for the ERV: ' + await pr.innerText());
  ok(await page.locator('.pill[data-step="vol"] .ask').count() === 1, 'the step tab carries a prompt marker');
  ok(await page.locator('[data-field="vol.erv"]').isHidden(), 'ERV hidden under More until asked for');
  await pr.locator('.btn').click();
  ok(await page.locator('[data-field="vol.erv"]').isVisible(), 'the prompt reveals the ERV row');
  await page.locator('[data-field="vol.erv"] .sg[data-v="low"]').click();
  ok(await pr.count() === 0, 'prompt gone once the ERV is entered');
  ok(/The expiratory reserve volume is decreased/.test(await pv('vol')), 'ERV reported');
  await page.evaluate(() => window.__pft.goto('dlco'));
  await page.locator('[data-field="dlco.dlco"] .sg[data-v="mod"]').click();
  const dp = await page.locator('[data-prompts="dlco"]').innerText();
  ok(/corrected for hemoglobin/.test(dp) && /enter the hemoglobin/.test(dp) && /VA and KCO/.test(dp), 'low DLCO prompts for the basis, the Hb and VA/KCO: ' + dp.replace(/\n/g, ' | '));
  ok(/Whether the value is corrected for hemoglobin is not stated/.test(await pv('dlco')), 'unknown basis is stated, not assumed');
  await page.locator('[data-field="dlco.basis"] .ch[data-v="adj"]').click();
  ok(/Moderately reduced; the value is corrected for hemoglobin\./.test(await pv('dlco')), 'corrected: ' + await pv('dlco'));
  ok(!/anemia|Anemia/.test(await page.locator('#pv .interp').innerText()), 'no anemia wording for a corrected value');
  await page.locator('[data-field="dlco.basis"] .ch[data-v="un"]').click();
  await page.locator('[data-cell="dlco.hb"] input').fill('9.8');
  ok(await page.locator('[data-field="dlco.hbcat"] .ch[aria-checked="true"]').innerText() === 'Low (anemia)' && await page.locator('[data-field="dlco.hbcat"] .auto-tag').isVisible(), 'typed hemoglobin sets the category (from the values)');
  ok(/not corrected for hemoglobin \(Hgb 9\.8 g\/dL, low\)\. Correction for the low hemoglobin would raise the value; enter the uncorrected % predicted/.test(await pv('dlco')), 'uncorrected with anemia, no % predicted: ' + await pv('dlco'));
  await page.locator('[data-cell="dlco.dlco_pct"] input').fill('50');
  ok(/Corrected for the anemia the DLCO is [56]\d% predicted/.test(await pv('dlco')), 'corrected % predicted calculated: ' + await pv('dlco'));
  ok(/Anemia may reduce the diffusing capacity/.test(await page.locator('#pv .interp').innerText()), 'anemia wording for an uncorrected value');
  await page.locator('[data-unit="dlco"]').first().click();
  ok(await page.locator('[data-unit="dlco"]').first().innerText() === 'SI', 'DLCO unit switches to SI');
  await page.locator('[data-cell="dlco.dlco_abs"] input').fill('5.0');
  ok(/DLCO 14\.9 mL\/min\/mmHg, 50% predicted/.test(await pv('dlco')), 'SI value converted to mL/min/mmHg in the report: ' + await pv('dlco'));
  await page.locator('[data-unit="dlco"]').first().click();
  await page.locator('[data-cell="dlco.dlco_abs"] input').fill('');

  // ---- 6MWT: distance typed in feet, classified against the calculated LLN
  await page.evaluate(() => window.__pft.goto('sixmw'));
  await page.locator('[data-unit="walk"]').first().click();
  ok(await page.locator('[data-unit="walk"]').first().innerText() === 'ft', 'walk unit switches to feet');
  await page.locator('[data-cell="sixmw.dist"] input').fill('1000');
  const dcat = page.locator('[data-field="sixmw.dist_cat"]');
  ok(await dcat.locator('.ch[aria-checked="true"]').innerText() === 'Below the LLN' && await dcat.locator('.ch:disabled').count() === 2, 'distance below the Enright & Sherrill LLN set from the typed feet');
  ok(/Walked 305 m \(1000 ft\)/.test(await pv('six')) && /LLN \d+ m \/ \d+ ft/.test(await pv('six')), 'feet shown beside metres: ' + await pv('six'));
  ok(/\(\d+ ft\)/.test(await page.locator('[data-es] .stat').first().innerText()), 'calculator shows feet too');
  ok(await page.locator('.tr-row.today .unit').first().innerText() === 'ft', 'trend rows follow the unit');
  await page.locator('[data-cell="sixmw.spo2_base"] input').fill('97');
  await page.locator('[data-cell="sixmw.spo2_nadir"] input').fill('91');
  ok(await page.locator('[data-field="sixmw.desat"] .ch[aria-checked="true"]').innerText() === 'Fall of 4 points or more, nadir above 88%', 'desaturation from the typed values');
  await page.locator('[data-cell="sixmw.hr_peak"] input').fill('130');
  await page.locator('[data-cell="sixmw.hr_1min"] input').fill('118');
  ok(await page.locator('[data-field="sixmw.hrr"] .ch[aria-checked="true"]').innerText() === 'Abnormal (13–18 bpm or less)', 'heart-rate recovery from the typed values');
  await page.locator('[data-unit="walk"]').first().click();
  ok(await page.locator('[data-cell="sixmw.dist"] input').inputValue() === '1000' && /Walked 1000 m/.test(await pv('six')), 'switching the unit re-reads the typed number in the new unit');
  await page.locator('[data-unit="walk"]').first().click();

  // ---- report: prompts card, lean copy, no interpretability
  await page.evaluate(() => window.__pft.goto('report'));
  ok(await page.locator('#prompts').count() === 1 && /VA and KCO/.test(await page.locator('#prompts').innerText()), 'the report lists the values that would still help');
  const plain = await page.evaluate(() => window.__pft.result.text);
  ok(!/INTERPRETABILITY|PULMONARY FUNCTION TEST REPORT|Reference values|BMI/.test(plain) && /^SPIROMETRY: /.test(plain) && /\nINTERPRETATION: /.test(plain), 'lean copy');
  ok(!/\(hemoglobin-adjusted value\)|Conclusion/.test(await page.locator('#doc').innerText()) && await page.locator('#doc .interp h3').innerText() === 'INTERPRETATION:', 'on-screen report uses INTERPRETATION:');
  await page.locator('#prompts .btn').first().click(); await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.querySelector('.pill[aria-current="step"]').getAttribute('data-step')) === 'dlco' && await page.locator('[data-field="dlco.va"].flash').count() === 1, 'the prompt card jumps to the field');

  // ---- theme: two selectable themes, remembered
  ok(await page.locator('#theme').innerText() === 'Dark theme', 'theme button offers the dark theme on a light system');
  await page.locator('#theme').click();
  ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'dark' && await page.locator('#theme').innerText() === 'Light theme', 'dark theme applied');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok(/rgb\(20, 22, 24\)/.test(bg), 'dark background: ' + bg);
  await page.reload(); await page.waitForSelector('.tgrid');
  ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'dark', 'theme remembered across reloads');
  await page.locator('#theme').click();
  ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'light', 'back to light');
  ok((await state()).units.walk === 'ft' && (await state()).units.len === 'in', 'unit choices remembered for the next case');

  // ---- spirometry with prior + bronchodilator: boxes stack under the buttons, columns aligned; phone: no overflow
  await page.evaluate(() => { const S = window.__pft.state; S.tests.spiro = true; S.tests.bd = true; window.__pft.goto('spiro'); });
  await page.locator('input[data-prior-toggle="spiro"]').check();
  ok(await page.locator('[data-grid="spiro"].stack').count() === 1, 'many boxes: the value line stacks under the buttons');
  const xs = await page.locator('[data-grid="spiro"] .ix:visible [data-cell$=".z"] input').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().x)));
  ok(xs.length === 3 && xs.every(x => x === xs[0]), 'z boxes aligned in one column: ' + xs.join(','));
  const xv = await page.locator('[data-cell="spiro.ratio_abs"] input, [data-cell="spiro.fev1_abs"] input, [data-cell="spiro.fvc_abs"] input').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().x)));
  ok(xv.every(x => x === xv[0]), 'value boxes aligned in one column: ' + xv.join(','));
  await page.locator('[data-prior-add]').click();
  ok(await page.locator('[data-cell="prior.fev1"]').count() === 2, 'a second prior study adds its own columns');
  await page.locator('[data-more="bd"]').click();
  ok(await page.locator('[data-field="bd.post_ratio"]').isVisible() && await page.locator('[data-field="bd.resp"]').isVisible(), 'post-BD categories and the lab verdict under More');
  await page.setViewportSize({ width: 400, height: 800 }); await page.waitForTimeout(100);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'phone: no horizontal overflow with prior and post-BD boxes');
  ok(await page.locator('.ix-head').isHidden(), 'phone: the column header row is dropped');

  ok(errs.length === 0, 'no page errors: ' + errs.join(' || '));
  console.log('e2e5 passed', passes, 'failed', fails);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('E2E CRASH', e); process.exit(2); });
