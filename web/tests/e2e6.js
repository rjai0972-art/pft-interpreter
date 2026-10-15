// v6: one page. Patient strip, indications dropdown, quick-set dropdown and test chips at the top; every ticked test a
// collapsible section beneath; prior columns with their dates in the grid header; the bronchodilator inside spirometry;
// the whole report in the right-hand column. Also units, auto categories, prompts, DLCO wording, themes, copy, case codes.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = process.env.PFT_URL || ('file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html'));
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL:', m); } };
async function loadExample(page, i) {
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'examples' }));
  await page.waitForSelector('.learn-body[data-topic="examples"] .ex');
  await page.locator('.learn-body[data-topic="examples"] .ex').nth(i).click();
  await page.waitForSelector('#top');
}
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1380, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(() => { try { localStorage.setItem('pft.wording.v1', JSON.stringify('std')); } catch (e) {} });   // these checks read the standard wording
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(FILE); await page.waitForSelector('#top');
  const pv = (key) => page.locator('#pv .sec[data-sec="' + key + '"]').innerText();
  const state = () => page.evaluate(() => window.__pft.state);
  const today = await page.evaluate(() => { const d = new Date(), p = (n) => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); });

  // ---- one page: no stepper, patient strip first, tests as chips, report column present and empty
  ok(await page.locator('.steps, .pill').count() === 0, 'no step tabs');
  ok(await page.locator('#top .pstrip').count() === 1 && (await page.locator('#top .pstrip').boundingBox()).y < (await page.locator('details.ind').boundingBox()).y, 'patient details at the very top, indications below as a dropdown');
  ok(await page.locator('details.ind').evaluate(e => !e.open) && /none selected/.test(await page.locator('details.ind summary').innerText()), 'indications folded with a summary');
  ok(await page.locator('.tchip').count() === 13 && await page.locator('.tchip[aria-pressed="true"]').count() === 0, '13 test chips, none pressed');
  ok(await page.locator('#qs option').count() === 12 && (await page.locator('#qs option').nth(1).innerText()) === 'Full PFT', 'quick sets as a dropdown: 10 built-in sets plus the editor entry');
  ok(await page.locator('details.tsec').count() === 0 && await page.locator('.empty-page').count() === 1, 'no test sections before a test is tapped');
  ok(await page.locator('#pv').isVisible() && /INTERPRETATION:/.test(await page.locator('#pv').innerText()), 'the report column is there from the start');
  ok(await page.locator('#pv .sec h3').count() === 0, 'nothing to report yet');
  ok(await page.locator('.ex').count() === 0 && await page.locator('.zkey').count() === 0, 'no worked examples or z-key on the page');
  ok(await page.locator('[data-field="ctx.date"] input').inputValue() === today, 'study date defaults to today');
  await page.screenshot({ path: 'shots/61_empty.png', fullPage: true });

  // ---- quick sets: dropdown applies a set; none picks the loop; editor
  await page.selectOption('#qs', { label: 'Full PFT' });
  ok((await page.locator('.tchip[aria-pressed="true"]').allInnerTexts()).join() === 'Spirometry,Lung volumes,DLCO', 'Full PFT ticks spirometry, volumes and DLCO (not the loop)');
  ok(await page.locator('details.tsec').count() === 3 && (await page.locator('details.tsec').evaluateAll(els => els.map(e => e.getAttribute('data-mod')))).join() === 'spiro,vol,dlco', 'three sections on the page in test order');
  ok(await page.locator('#qs').inputValue() === '', 'the dropdown resets after applying');
  await page.selectOption('#qs', '__edit');
  ok(await page.locator('.qs-row').count() === 12, 'editor lists the sets with a new-set row');
  await page.locator('.tchip[data-test="fvl"]').click();
  await page.locator('.qs-new input').fill('My set');
  await page.locator('[data-qs-add]').click();
  ok(await page.locator('.qs-row').count() === 13, 'a quick set saved from the current selection');
  await page.locator('.qs-row').first().locator('.btn', { hasText: 'Delete' }).click();
  await page.locator('[data-qs-done]').click();
  const opts = await page.locator('#qs option').allInnerTexts();
  ok(opts.indexOf('My set') === 10 && opts.indexOf('Full PFT') < 0, 'edited list persists in the dropdown: ' + opts.join(', '));
  await page.locator('.tchip[data-test="fvl"]').click();
  await page.selectOption('#qs', { label: 'My set' });
  ok(await page.locator('.tchip[data-test="fvl"][aria-pressed="true"]').count() === 1 && await page.locator('details.tsec[data-mod="fvl"]').count() === 1, 'the saved set restores its tests');
  await page.selectOption('#qs', '__edit'); await page.locator('[data-qs-reset]').click(); await page.locator('[data-qs-done]').click();
  ok((await page.locator('#qs option').allInnerTexts())[1] === 'Full PFT', 'built-in sets restored');
  await page.locator('.tchip[data-test="fvl"]').click();
  ok(await page.locator('details.tsec[data-mod="fvl"]').count() === 0, 'tapping a pressed chip removes its section');
  await page.locator('details.tsec[data-mod="dlco"] [data-remove="dlco"]').click();
  ok(await page.locator('.tchip[data-test="dlco"][aria-pressed="true"]').count() === 0 && await page.locator('details.tsec').count() === 2, '"remove" on a section unticks the test');
  await page.locator('.tchip[data-test="dlco"]').click();

  // ---- patient strip: units, BMI; indications dropdown
  await page.locator('[data-field="ctx.age"] input').fill('68');
  await page.locator('[data-field="ctx.sex"] .ch[data-v="M"]').click();
  await page.locator('[data-field="ctx.sex"] .ch[data-v="M"]').click();
  ok(await page.locator('[data-field="ctx.sex"] .ch[aria-checked="true"]').count() === 0, 'tapping Male again clears it');
  await page.locator('[data-field="ctx.sex"] .ch[data-v="M"]').click();
  await page.locator('[data-field="ctx.ht"] input').fill('176');
  await page.locator('[data-field="ctx.wt"] input').fill('180');
  ok(await page.locator('[data-unit="len"]').innerText() === 'cm' && await page.locator('[data-unit="wt"]').innerText() === 'kg', 'metric units by default');
  await page.locator('[data-unit="wt"]').click();
  ok(await page.locator('[data-unit="wt"]').innerText() === 'lb' && (await state()).units.wt === 'lb', 'weight unit switches to pounds');
  ok(/BMI 26\.4/.test(await page.locator('[data-field="ctx.wt"] .note').innerText()), 'BMI from 176 cm and 180 lb: ' + await page.locator('[data-field="ctx.wt"] .note').innerText());
  await page.locator('[data-unit="wt"]').click();
  await page.locator('[data-field="ctx.wt"] input').fill('');
  await page.locator('[data-field="ctx.date"] input').fill('2025-03-05');
  await page.locator('details.ind summary').click();
  ok(await page.locator('[data-field="ctx.indic"] .cp').count() === 24, '24 indication chips inside the dropdown');
  await page.locator('[data-field="ctx.indic"] .cp', { hasText: /^Asthma$/ }).click();
  await page.locator('[data-field="ctx.indic"] .cp', { hasText: /^Dyspnea$/ }).click();
  await page.getByLabel('Other indication (type only if not listed above)').fill('recurrent pneumonia');
  ok(/Dyspnea, Asthma, recurrent pneumonia/.test(await page.locator('details.ind summary').innerText()), 'the dropdown summary lists what was tapped: ' + await page.locator('details.ind summary').innerText());
  await page.locator('details.ind summary').click();
  ok(await page.locator('select').count() === 1, 'the quick-set dropdown is the only select');

  // ---- spirometry section: essentials, boxes, BD inside, prior columns from the header
  const sp = page.locator('details.tsec[data-mod="spiro"]');
  ok(await sp.locator('.tsec-h h2').innerText() === 'Spirometry' && await sp.evaluate(e => e.open), 'spirometry section open');
  ok(await sp.locator('[data-grid="spiro"] .ix:visible:not(.ix-head)').count() === 3 && await sp.locator('[data-field="spiro.fef"]').isHidden(), 'only FEV1/FVC, FEV1 and FVC visible');
  ok(await sp.locator('.btn.quick').count() === 0, 'no "unselected = normal" button');
  ok(await sp.locator('input[data-prior-toggle="spiro"]').count() === 1 && await sp.locator('[data-prior-add="spiro"]').count() === 0 && await sp.locator('input[data-bd-toggle]').count() === 1, 'the prior-study and bronchodilator toggles sit in the grid header');
  const ratio = sp.locator('[data-field="spiro.ratio"]');
  await ratio.getByRole('button', { name: 'Below LLN ↓' }).click();
  ok(await ratio.locator('.sg[aria-pressed="true"]').innerText() === 'Low', 'ratio pressed');
  await ratio.locator('[data-cell="spiro.ratio_abs"] input').fill('0.48');
  const fev1 = sp.locator('[data-field="spiro.fev1"]');
  await fev1.locator('[data-cell="spiro.fev1.z"] input').fill('-3.1');
  ok(await fev1.locator('.sg[aria-pressed="true"]').innerText() === 'Moderate', 'z -3.1 -> Moderate pressed');
  await fev1.locator('[data-cell="spiro.fev1_abs"] input').fill('1.55');
  await fev1.locator('[data-cell="spiro.fev1_pct"] input').fill('48');
  await sp.locator('[data-field="spiro.fvc"]').getByRole('button', { name: 'WNL' }).click();
  ok(/Moderate obstructive impairment present/.test(await pv('spiro')) && /FEV1\/FVC 0\.48/.test(await pv('spiro')), 'running report: the template statement with the typed ratio: ' + await pv('spiro'));
  ok(await page.locator('#pv .sec.cur[data-sec="spiro"]').count() === 1, 'the section being edited is marked in the report');
  // bronchodilator inside the section, one sentence in the report
  await sp.locator('input[data-bd-toggle]').check();
  await sp.locator('[data-cell="bd.fev1_post"] input').fill('1.95');
  ok(/\+12\.4% pred/.test(await fev1.locator('.delta').innerText()), 'change beside the post value');
  ok(/After bronchodilator: FEV1 1\.55 to 1\.95 L \(\+400 mL, \+12\.4% of predicted\)\.$/.test(await pv('spiro')) && (await pv('spiro')).split('bronchodilator').length === 2, 'one bronchodilator sentence inside SPIROMETRY: ' + await pv('spiro'));
  ok(/Pattern is consistent with asthma\. Significant reversal of airways obstruction after bronchodilator \(FEV1 \+12% of predicted\)\./.test(await page.locator('#pv .interp').innerText()) && !/significantly improved/.test(await pv('spiro')), 'verdict once, in the interpretation: ' + await page.locator('#pv .interp').innerText());
  // prior column from the header, its date in the column header
  await sp.locator('[data-prior-toggle="spiro"]').check();
  ok(await page.locator('[data-prior-dates="spiro"] .pr-head').count() === 2 && await page.locator('[data-cell="prior.fev1"]').count() === 1, 'a prior column with a date header appears beside this study');
  ok(await page.locator('details.tsec[data-mod="vol"] [data-prior-dates="vol"]').count() === 1 && await page.locator('[data-cell="prior.tlc"]').count() === 1, 'the same prior column appears on lung volumes');
  await page.locator('[data-prior-dates="spiro"] .qd .lnk', { hasText: '1 yr' }).click();
  ok((await state()).prior.list[0].date === '2024-03-05', 'one-year chip sets the prior date in the header');
  await page.locator('[data-cell="prior.fev1"] input').fill('1.85');
  await page.locator('[data-cell="prior.fvc"] input').fill('3.25');
  await sp.locator('[data-cell="spiro.fvc_abs"] input').fill('3.20');
  ok(/Since last testing \(3\/5\/2024, 1 year earlier\): FEV1 -16% \(-300 mL, 1\.85 to 1\.55 L\), a significant decline; FVC without significant change \(-2%\)\.$/.test(await pv('prior')), 'past testing in one sentence: ' + await pv('prior'));
  ok(await sp.locator('[data-grid="spiro"] .ix-head .ix-c.hd').count() >= 5, 'the column headers cover this study, the prior and the post-bronchodilator boxes');
  const xs = await sp.locator('[data-grid="spiro"] .ix:visible [data-cell$=".z"] input').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().x)));
  ok(xs.length === 3 && xs.every(x => x === xs[0]), 'z boxes aligned in one column: ' + xs.join(','));
  await page.locator('[data-prior-add="spiro"]').click();
  ok(await page.locator('[data-cell="prior.fev1"]').count() === 2 && await page.locator('[data-prior-dates="spiro"] .pr-head').count() === 3, '"+ older study" adds a second prior column');
  await page.locator('[data-prior-remove="2"]').first().click();
  ok(await page.locator('[data-cell="prior.fev1"]').count() === 1, 'a prior column can be removed from its header');
  await page.locator('.pr-cmp summary').first().click();
  await page.locator('.pr-cmp input[type=checkbox]').nth(1).check();
  ok(/not directly comparable \(different bronchodilator state\)/.test(await pv('prior')), 'comparability flag caveats the comparison');
  await page.locator('.pr-cmp input[type=checkbox]').nth(1).uncheck();
  // quality as one folded line under the title, above the indices
  const qg = sp.locator('details.qfold', { hasText: 'Test quality' });
  ok(await qg.evaluate(e => !e.open) && (await qg.boundingBox()).y < (await sp.locator('[data-grid="spiro"]').boundingBox()).y && await sp.locator('details.optgrp.fold', { hasText: 'Test quality' }).count() === 0, 'test quality folded under the title');

  // ---- lung volumes and DLCO sections: essentials, prompts, correction wording
  const vol = page.locator('details.tsec[data-mod="vol"]');
  ok((await vol.locator('[data-grid="vol"] .ix:visible:not(.ix-head) .prm-l').allInnerTexts()).join() === 'TLC,RV,RV/TLC', 'volumes show TLC, RV, RV/TLC only');
  await vol.locator('[data-field="vol.tlc"] .sg[data-v="mod"]').click();
  await vol.locator('[data-cell="vol.rvtlc_pct"] input').fill('34');
  await vol.locator('[data-field="vol.rvtlc"] .sg[data-v="wnl"]').click();
  const dl = page.locator('details.tsec[data-mod="dlco"]');
  await dl.locator('[data-field="dlco.dlco"] .sg[data-v="wnl"]').click();
  ok(/Mixed obstructive and restrictive/.test(await pv('spiro')), 'mixed pattern stated in SPIROMETRY');
  ok(/mixed obstructive and restrictive ventilatory defect \(moderate obstruction, moderate restriction\) with a normal diffusing capacity/.test(await page.locator('#pv .interp').innerText()), 'pattern and DLCO in one sentence: ' + await page.locator('#pv .interp').innerText());
  await sp.locator('[data-field="spiro.ratio"] .sg[data-v="wnl"]').click();
  const pr = vol.locator('[data-prompts="vol"] .prompt');
  ok(await pr.count() === 1 && /Restrictive pattern with a normal DLCO: enter the ERV/.test(await pr.innerText()), 'restriction + normal DLCO prompts for the ERV');
  ok(await vol.locator('[data-field="vol.erv"]').isHidden(), 'ERV hidden under More until asked for');
  await pr.locator('.btn').click();
  ok(await vol.locator('[data-field="vol.erv"]').isVisible(), 'the prompt reveals the ERV row');
  await vol.locator('[data-field="vol.erv"] .sg[data-v="low"]').click();
  ok(/restrictive ventilatory defect without airflow obstruction, with a normal diffusing capacity, which favors an extrapulmonary cause[^.]*; the reduced ERV points to body habitus/.test(await page.locator('#pv .interp').innerText()), 'restriction + normal DLCO + low ERV in one sentence: ' + await page.locator('#pv .interp').innerText());
  await dl.locator('[data-field="dlco.dlco"] .sg[data-v="mod"]').click();
  ok(/with a moderately reduced diffusing capacity; the combination suggests a parenchymal \(interstitial\) process/.test(await page.locator('#pv .interp').innerText()), 'restriction + low DLCO combined');
  ok(/Whether the value is corrected for hemoglobin is not stated/.test(await pv('dlco')), 'unknown basis stated');
  await dl.locator('[data-field="dlco.basis"] .ch[data-v="adj"]').click();
  ok(/Moderately reduced; the value is corrected for hemoglobin\./.test(await pv('dlco')) && !/anemia|Anemia/.test(await page.locator('#pv .interp').innerText()), 'corrected: no anemia wording');
  await dl.locator('[data-field="dlco.basis"] .ch[data-v="un"]').click();
  await dl.locator('[data-cell="dlco.hb"] input').fill('9.8');
  await dl.locator('[data-cell="dlco.dlco_pct"] input').fill('50');
  ok(await dl.locator('[data-field="dlco.hbcat"] .ch[aria-checked="true"]').innerText() === 'Low (anemia)', 'typed hemoglobin sets the category');
  ok(/Corrected for the anemia the DLCO is [56]\d% predicted/.test(await pv('dlco')) && /Part of the reduction reflects the anemia \([56]\d% predicted after correction/.test(await page.locator('#pv .interp').innerText()), 'correction stated once in each place');
  await dl.locator('[data-unit="dlco"]').first().click();
  await dl.locator('[data-cell="dlco.dlco_abs"] input').fill('5.0');
  ok(/DLCO 14\.9 mL\/min\/mmHg/.test(await pv('dlco')), 'SI DLCO converted');
  await dl.locator('[data-unit="dlco"]').first().click(); await dl.locator('[data-cell="dlco.dlco_abs"] input').fill('');

  // ---- 6MWT: feet, auto categories, folded calculator and trend
  await page.locator('.tchip[data-test="sixmw"]').click();
  await page.locator('[data-field="ctx.wt"] input').fill('82');
  const six = page.locator('details.tsec[data-mod="sixmw"]');
  ok(await six.locator('[data-group="calc"]').evaluate(e => !e.open) && await six.locator('[data-group="trend"]').evaluate(e => !e.open), 'calculator and trend folded');
  await six.locator('[data-unit="walk"]').first().click();
  await six.locator('[data-cell="sixmw.dist"] input').fill('1000');
  ok(await six.locator('[data-field="sixmw.dist_cat"] .ch[aria-checked="true"]').innerText() === 'Below the LLN', 'distance in feet classified against the calculated LLN');
  ok(/Walked 305 m \(1000 ft\)/.test(await pv('six')), 'feet beside metres: ' + await pv('six'));
  await six.locator('[data-cell="sixmw.spo2_base"] input').fill('97');
  await six.locator('[data-cell="sixmw.spo2_nadir"] input').fill('91');
  ok(await six.locator('[data-field="sixmw.desat"] .ch[aria-checked="true"]').innerText() === 'Fall of 4 points or more, nadir above 88%', 'desaturation from the typed values');
  await six.locator('[data-unit="walk"]').first().click();

  // ---- report column: lean copy, INTERPRETATION heading, prompts card, heads-up, case code, bank save
  ok(await page.locator('#pv .interp h3').innerText() === 'INTERPRETATION:' && (await page.locator('#pv .sec h3').allInnerTexts()).every(t => /:$/.test(t)), 'headings with colons');
  await page.locator('#copy-report').click(); await page.waitForTimeout(200);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  ok(/^SPIROMETRY: /.test(clip) && /\nINTERPRETATION: /.test(clip) && !/INTERPRETABILITY|Reference values|BMI|Date:/.test(clip), 'lean copy: ' + clip.slice(0, 60));
  await page.locator('details[data-group="settings"]').evaluate(e => { e.open = true; });
  await page.locator('[data-field="settings.wording"] .ch[data-v="full"]').click();
  ok(/68-year-old, male/.test(await page.locator('#pv .meta').innerText()) && /Reason for PFT: Dyspnea; Asthma; recurrent pneumonia/.test(await page.locator('#pv .meta').innerText()), 'full copy shows the header');
  await page.locator('#copy-report').click(); await page.waitForTimeout(200);
  ok(/^PULMONARY FUNCTION TEST REPORT/.test(await page.evaluate(() => navigator.clipboard.readText())), 'full report on request');
  await page.locator('[data-field="settings.wording"] .ch[data-v="std"]').click();
  await page.locator('details[data-group="settings"]').evaluate(e => { e.open = false; });
  ok(await page.locator('#prompts').count() === 1 && /VA and KCO/.test(await page.locator('#prompts').evaluate(e => e.textContent)), 'the report column lists the values that would help');
  await page.locator('#prompts').evaluate(e => { e.open = true; });
  await page.locator('#prompts .btn').first().click(); await page.waitForTimeout(150);
  ok(await page.locator('[data-field="dlco.va"].flash').count() === 1, 'the prompt jumps to the field on the page');
  ok(await page.locator('#headsup').count() === 1 && await page.locator('#headsup .hu-item').first().evaluate(e => e.tagName === 'DETAILS'), 'heads-up list in the column');
  await page.locator('#hu-chip button').click();
  ok(await page.locator('#headsup').evaluate(e => e.open), 'header chip opens the heads-up list');
  await page.locator('#copy-all').click(); await page.waitForTimeout(200);
  ok(/HEADS-UP/.test(await page.evaluate(() => navigator.clipboard.readText())), 'copy with heads-up');
  await page.locator('details.plain', { hasText: 'Save or load a case code' }).locator('summary').click();
  await page.locator('#copy-case').click(); await page.waitForTimeout(150);
  const code = await page.evaluate(() => navigator.clipboard.readText());
  ok(/^PFT1:/.test(code), 'case code copied');
  await page.getByRole('button', { name: 'New case' }).click();
  await page.getByRole('button', { name: 'Click again to clear' }).click();
  ok(await page.locator('details.tsec').count() === 0 && (await state()).ctx.date === today && (await state()).units.wt === 'kg', 'new case clears the page, resets the date, keeps the unit choice');
  await page.locator('details.plain', { hasText: 'Save or load a case code' }).locator('summary').click();
  await page.fill('#case-box', code);
  await page.locator('#load-case').click();
  const st = await state();
  ok(st.ctx.age === '68' && st.spiro.fev1.z === '-3.1' && st.ctx.indic.join() === 'dyspnea,asthma' && st.spiro.ratio_abs === '0.48' && st.prior.list[0].fev1 === '1.85', 'state restored from the case code: ' + JSON.stringify([st.ctx.age, st.spiro.fev1.z, st.ctx.indic, st.spiro.ratio_abs, st.prior.list[0].fev1]));
  ok(await page.locator('[data-cell="prior.fev1"]').count() === 1, 'a loaded case with a prior shows the prior column');
  await page.locator('details.plain', { hasText: 'Save or load a case code' }).locator('summary').click();
  await page.fill('#case-box', 'garbage'); await page.locator('#load-case').click();
  ok(/not a valid/.test(await page.locator('.toast').textContent()), 'invalid code toast');
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) }, configurable: true }); document.execCommand = () => false; });
  await page.locator('#copy-report').click(); await page.waitForTimeout(200);
  ok(await page.locator('#fallback textarea').count() === 1, 'fallback textarea when the clipboard is blocked');

  // ---- theme: two selectable themes, remembered
  ok(await page.locator('#theme').innerText() === 'Dark theme', 'theme button offers the dark theme on a light system');
  await page.locator('#theme').click();
  ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'dark', 'dark theme applied');
  ok(/rgb\(31, 30, 27\)/.test(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)), 'charcoal background');
  await page.reload(); await page.waitForSelector('#top');
  ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'dark', 'theme remembered');
  await page.locator('#theme').click();
  ok(/rgb\(243, 240, 234\)/.test(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)), 'linen background');

  // ---- every example: all sections render, no leaks
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'examples' }));
  await page.waitForSelector('.learn-body[data-topic="examples"] .ex');
  const nEx = await page.locator('.learn-body[data-topic="examples"] .ex').count();
  ok(nEx === 8, '8 worked examples under Learn');
  for (let i = 0; i < nEx; i++) {
    await loadExample(page, i);
    const txt = await page.locator('main').innerText() + await page.locator('#pv').innerText();
    ok(!/undefined|NaN|\[object/.test(txt), 'no leak text in example ' + i);
    ok(await page.locator('details.tsec').count() >= 1, 'sections rendered for example ' + i);
  }
  // ---- bronchoprovocation conditional groups, then every test on one page
  await page.evaluate(() => { window.__pft.goto('bronch'); });
  const br = page.locator('details.tsec[data-mod="bronch"]');
  ok(await br.locator('.grp:visible h3', { hasText: /^Methacholine result$/ }).count() === 1 && await br.locator('.grp:visible h3', { hasText: /^Mannitol result$/ }).count() === 0, 'methacholine group visible, mannitol hidden');
  await br.locator('[data-field="bronch.type"]').getByRole('radio', { name: 'Mannitol' }).click();
  ok(await br.locator('.grp:visible h3', { hasText: /^Mannitol result$/ }).count() === 1, 'mannitol visible after tap');
  for (const k of await page.locator('.tchip[aria-pressed="false"]').evaluateAll(els => els.map(e => e.getAttribute('data-test')))) await page.locator('.tchip[data-test="' + k + '"]').click();
  ok(await page.locator('details.tsec').count() === 13, 'all 13 tests on one page: ' + await page.locator('details.tsec').count());
  await page.locator('details.tsec[data-mod="spiro"] > summary').click();
  ok(await page.locator('details.tsec[data-mod="spiro"]').evaluate(e => !e.open), 'a section folds from its header');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' || '));
  await page.screenshot({ path: 'shots/62_all_tests.png', fullPage: true });

  // ---- phone
  const m = await browser.newContext({ viewport: { width: 400, height: 800 }, colorScheme: 'dark' });
  await m.addInitScript(() => { try { localStorage.setItem('pft.wording.v1', JSON.stringify('std')); } catch (e) {} });
  const mp = await m.newPage();
  const merrs = []; mp.on('pageerror', e => merrs.push(e.message));
  await mp.goto(FILE); await mp.waitForSelector('#top');
  const checkOverflow = async (label) => { const o = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth })); ok(o.sw <= o.iw + 1, 'no horizontal overflow at 400px: ' + label); };
  await checkOverflow('empty');
  await loadExample(mp, 0);
  await checkOverflow('example');
  ok((await mp.locator('#pv').boundingBox()).y > (await mp.locator('#main').boundingBox()).y + 100, 'phone: report below the form');
  await mp.evaluate(() => { const S = window.__pft.state; S.tests.bd = true; window.__pft.goto('spiro'); });
  await mp.locator('[data-prior-toggle="spiro"]').check();
  await checkOverflow('prior and post columns');
  ok(merrs.length === 0, 'no mobile errors ' + merrs.join('|'));
  await m.close();

  console.log('e2e6 passed', passes, 'failed', fails);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('E2E CRASH', e); process.exit(2); });
