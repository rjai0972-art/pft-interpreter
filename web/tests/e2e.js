const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = process.env.PFT_URL || ('file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html'));
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL:', m); } };
/* Examples live in Learn now: open the topic and tap one (it loads the case and lands on the report). */
async function loadExample(page, i) {
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'examples' }));
  await page.waitForSelector('.learn-body[data-topic="examples"] .ex');
  await page.locator('.learn-body[data-topic="examples"] .ex').nth(i).click();
  await page.waitForSelector('#doc');
}
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(FILE);
  await page.waitForSelector('.tgrid');

  // --- tests screen: one column, nothing preselected, no examples, no prior toggle
  ok(await page.locator('.tt input').count() === 13, '13 test toggles (bronchodilator lives inside spirometry; prior comparison inline on the test steps)');
  ok(await page.locator('input[data-test="bd"]').count() === 0, 'no bronchodilator tile on the first screen');
  // quick sets: none picks the flow-volume loop; editable
  const qs = await page.locator('[data-quicksets] .qs').allInnerTexts();
  ok(qs.length === 10 && qs[0] === 'Full PFT', 'ten built-in quick sets');
  await page.locator('[data-quicksets] .qs', { hasText: /^Full PFT$/ }).click();
  ok(!(await page.locator('input[data-test="fvl"]').isChecked()), 'Full PFT does not tick the flow-volume loop');
  await page.locator('[data-qs-edit]').click();
  ok(await page.locator('.qs-row').count() === 12, 'edit mode lists the sets with a new-set row');
  await page.locator('input[data-test="fvl"]').check();
  await page.locator('.qs-new input').fill('My set');
  await page.locator('[data-qs-add]').click();
  ok(await page.locator('.qs-row').count() === 13, 'a quick set saved from the current selection');
  await page.locator('.qs-row').first().locator('.btn', { hasText: 'Delete' }).click();
  await page.locator('[data-qs-edit]').click();
  const qs2 = await page.locator('[data-quicksets] .qs').allInnerTexts();
  ok(qs2.length === 10 && qs2.indexOf('My set') === 9 && qs2.indexOf('Full PFT') < 0, 'edited list persists: ' + qs2.join(', '));
  await page.locator('[data-quicksets] .qs', { hasText: /^My set$/ }).click();
  ok(await page.locator('input[data-test="fvl"]').isChecked() && await page.locator('input[data-test="dlco"]').isChecked(), 'the saved set restores its tests');
  await page.locator('[data-qs-edit]').click(); await page.locator('[data-qs-reset]').click(); await page.locator('[data-qs-edit]').click();
  ok((await page.locator('[data-quicksets] .qs').allInnerTexts())[0] === 'Full PFT', 'built-in sets restored');
  await page.getByRole('button', { name: 'New case' }).click(); await page.getByRole('button', { name: 'Click again to clear' }).click();
  ok(await page.locator('.ex').count() === 0 && await page.locator('.zkey').count() === 0, 'no worked examples or z-key on the first screen');
  ok(await page.locator('.steps .pill').count() === 3, 'initial 3 pills: nothing preselected');
  ok(await page.locator('.tt input:checked').count() === 0, 'no test ticked by default');
  ok(await page.getByRole('button', { name: 'Continue →' }).isDisabled(), 'continue disabled until a test is ticked');
  await page.screenshot({ path: 'shots/01_tests.png', fullPage: true });

  // presets and ticks
  await page.getByRole('button', { name: 'Full PFT', exact: true }).click();
  ok(await page.locator('.steps .pill').count() === 6, 'Full PFT -> 6 pills (no loop)');
  await page.locator('input[data-test="fvl"]').check();
  ok(await page.locator('.steps .pill').count() === 7, '7 pills after +loop');
  await page.getByRole('button', { name: 'Continue →' }).click();
  ok(await page.locator('.step-head h2').innerText() === 'Study details', 'details step');
  ok(await page.locator('.step-head .intro').count() === 0 && await page.locator('.step-head .src').count() === 0, 'no intro paragraph or basis line on the step');
  // date defaults to today
  const today = await page.evaluate(() => { const d = new Date(), p = (n) => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); });
  ok(await page.getByLabel('Date of study').inputValue() === today, 'study date defaults to today: ' + today);
  // indications: tap chips + separate box for others
  ok(await page.locator('[data-field="ctx.indic"] .cp').count() === 24, '24 indication chips');
  await page.locator('[data-field="ctx.indic"] .cp', { hasText: /^Asthma$/ }).click();
  await page.locator('[data-field="ctx.indic"] .cp', { hasText: /^Dyspnea$/ }).click();
  ok(await page.locator('[data-field="ctx.indic"] .cp[aria-pressed="true"]').count() === 2, 'two chips pressed');
  await page.locator('[data-field="ctx.indic"] .cp', { hasText: /^Asthma$/ }).click();
  ok(await page.locator('[data-field="ctx.indic"] .cp[aria-pressed="true"]').count() === 1, 'chip toggles off');
  await page.locator('[data-field="ctx.indic"] .cp', { hasText: /^Asthma$/ }).click();
  await page.getByLabel('Other indication (type only if not listed above)').fill('recurrent pneumonia');
  await page.getByLabel('Age', { exact: true }).fill('68');
  ok(await page.locator('select').count() === 0, 'no dropdowns on the details step');
  // patient block first, indications below it
  const h3s = await page.locator('.card h3').evaluateAll(els => els.map(e => e.textContent));
  ok(h3s[0] === 'Patient' && h3s.indexOf('Study') === 1, 'demographics above the indications: ' + h3s.slice(0, 2).join(' > '));
  const sex = page.locator('[data-field="ctx.sex"]');
  ok(await sex.locator('.ch').count() === 2, 'sex has two tap buttons (blank option hidden)');
  await sex.getByRole('radio', { name: 'Male', exact: true }).click();
  ok(await sex.locator('.ch[aria-checked="true"]').innerText() === 'Male', 'Male pressed');
  await sex.getByRole('radio', { name: 'Male', exact: true }).click();
  ok(await sex.locator('.ch[aria-checked="true"]').count() === 0, 'tapping Male again clears it');
  await sex.getByRole('radio', { name: 'Male', exact: true }).click();
  await page.getByLabel('Height', { exact: true }).fill('176');
  await page.getByLabel('Weight', { exact: true }).fill('180');
  // units: tap the unit beside the box; one choice per quantity, remembered for the next case
  ok(await page.locator('[data-unit="len"]').innerText() === 'cm' && await page.locator('[data-unit="wt"]').innerText() === 'kg', 'metric units by default');
  await page.locator('[data-unit="wt"]').click();
  ok(await page.locator('[data-unit="wt"]').innerText() === 'lb' && (await page.evaluate(() => window.__pft.state.units.wt)) === 'lb', 'weight unit switches to pounds');
  ok(/BMI 26\.4/.test(await page.locator('[data-field="ctx.wt"] .note').innerText()), 'BMI from 176 cm and 180 lb: ' + await page.locator('[data-field="ctx.wt"] .note').innerText());
  await page.locator('[data-unit="wt"]').click();
  await page.getByLabel('Weight', { exact: true }).fill('');
  ok(await page.locator('.live').count() === 0, 'no "findings as entered" box: the running report is beside the form');
  await page.getByLabel('Date of study').fill('2025-03-05');
  ok(await page.locator('#pv').isVisible() && /SPIROMETRY:/.test(await page.locator('#pv').innerText()), 'running report on the right with colons after the headings');
  ok(!/68-year-old/.test(await page.locator('#pv').innerText()), 'lean report: no demographics line');
  await page.locator('details[data-group="settings"]').evaluate(e => { e.open = true; });
  await page.locator('[data-field="settings.copy"] .ch[data-v="full"]').click();
  ok(/68-year-old, male/.test(await page.locator('#pv .meta').innerText()) && /Reason for PFT: Dyspnea; Asthma; recurrent pneumonia/.test(await page.locator('#pv .meta').innerText()), 'full copy shows the header line in the running report: ' + await page.locator('#pv .meta').innerText());
  await page.locator('[data-field="settings.copy"] .ch[data-v="lean"]').click();
  await page.locator('details[data-group="settings"]').evaluate(e => { e.open = false; });
  const eqp = page.locator('details[data-group="equations"]');
  ok(await eqp.evaluate(e => e.open) === false, 'equations collapsed');
  ok(await page.locator('details[data-group="settings"]').evaluate(e => e.open) === false, 'settings collapsed');
  const sp = await page.evaluate(() => window.__pft.state.ctx);
  ok(sp.ref_spiro === 'global' && sp.ref_vol === 'gli2021' && sp.ref_dlco === 'gli2017' && sp.hrmax_eq === 'tanaka' && sp.aa_eq === 'q4', 'recommended equations are the defaults');
  await page.screenshot({ path: 'shots/02_details.png', fullPage: true });
  await page.getByRole('button', { name: /Next: Spirometry/ }).click();

  // spirometry: taps first, nothing pressed by default, re-tap clears
  ok(await page.locator('.step-head h2').innerText() === 'Spirometry', 'spiro step');
  ok(await page.locator('.tapnote').count() === 0 && await page.locator('.prm:not(.multi) .hint').count() === 0, 'no tap note or per-field hints');
  // essentials only: ratio, FEV1, FVC visible; FEF under "+ More"
  ok(await page.locator('[data-grid="spiro"] .ix:visible:not(.ix-head)').count() === 3 && await page.locator('[data-field="spiro.fef"]').isHidden(), 'only FEV1/FVC, FEV1 and FVC visible');
  await page.locator('[data-more="spiro"]').click();
  ok(await page.locator('[data-field="spiro.fef"]').isVisible(), 'FEF25-75% appears under More');
  await page.locator('[data-more="spiro"]').click();
  const ratio = page.locator('[data-field="spiro.ratio"]');
  ok(await ratio.locator('.sg').count() === 4 && await ratio.locator('.sg', { hasText: 'Not measured' }).count() === 0, 'no "Not measured" chip; nothing pressed means not entered');
  ok(await ratio.locator('.sg[aria-pressed="true"]').count() === 0, 'nothing pressed by default');
  ok(await ratio.locator('[data-cell="spiro.ratio.z"] input').isVisible() && await ratio.locator('[data-cell="spiro.ratio_abs"] input').isVisible(), 'z-score and value boxes sit on the row');
  await ratio.getByRole('button', { name: 'Below LLN ↓' }).click();
  ok(await ratio.locator('.sg[aria-pressed="true"]').innerText() === 'Low', 'ratio pressed (short label)');
  await ratio.getByRole('button', { name: 'Below LLN ↓' }).click();
  ok(await ratio.locator('.sg[aria-pressed="true"]').count() === 0 && (await page.evaluate(() => window.__pft.state.spiro.ratio.c)) === 'nm', 'tapping again clears to not measured');
  await ratio.getByRole('button', { name: 'Below LLN ↓' }).click();
  await ratio.locator('[data-cell="spiro.ratio_abs"] input').fill('0.48');
  const fev1 = page.locator('[data-field="spiro.fev1"]');
  await fev1.locator('[data-cell="spiro.fev1.z"] input').fill('-3.1');
  ok(await fev1.locator('.sg[aria-pressed="true"]').innerText() === 'Moderate', 'z -3.1 -> Moderate pressed');
  await fev1.getByRole('button', { name: 'Mild ↓' }).click();
  ok(await fev1.locator('[data-cell="spiro.fev1.z"] input').inputValue() === '', 'button click clears z');
  await fev1.locator('[data-cell="spiro.fev1.z"] input').fill('-3.1');
  const fvc = page.locator('[data-field="spiro.fvc"]');
  await fvc.getByRole('button', { name: 'WNL' }).click();
  const liveTxt = await page.locator('#pv .sec[data-sec="spiro"]').innerText();
  ok(/FEV1\/FVC 0\.48 \(z -2\.3\)|Moderate obstructive impairment present/.test(liveTxt) && !/COPD|ventilatory defect/.test(liveTxt), 'running report carries the template statement, not the conclusion: ' + liveTxt);
  // bronchodilator inside the step: a checkbox adds post-BD boxes beside the pre values
  ok(await page.locator('input[data-bd-toggle]').count() === 1 && !(await page.locator('input[data-bd-toggle]').isChecked()) && await page.locator('[data-cell="bd.fev1_post"]').count() === 0, 'bronchodilator off: no post boxes');
  await page.locator('input[data-bd-toggle]').check();
  ok(await page.locator('[data-cell="bd.fev1_post"] input').isVisible() && await page.locator('[data-cell="bd.fvc_post"] input').isVisible() && await page.locator('[data-cell="bd.post_ratio_abs"] input').isVisible(), 'post-BD boxes on the FEV1, FVC and ratio rows');
  await page.locator('[data-cell="spiro.fev1_abs"] input').fill('1.55');
  await page.locator('[data-cell="spiro.fev1_pct"] input').fill('48');
  await page.locator('[data-cell="bd.fev1_post"] input').fill('1.95');
  ok(/\+12\.4% pred/.test(await fev1.locator('.delta').innerText()), 'change as % of predicted beside the post value: ' + await fev1.locator('.delta').innerText());
  ok(/After bronchodilator: FEV1 1\.55 → 1\.95 L \(60% predicted\), a change of \+400 mL \(\+12\.4% of predicted\)\. Spirometry significantly improved/.test(await page.locator('#pv .sec[data-sec="spiro"]').innerText()), 'bronchodilator reported inside SPIROMETRY');
  ok(await page.locator('#pv .sec[data-sec="bd"]').count() === 0 && await page.locator('.pill[data-step="bd"]').count() === 0, 'no separate bronchodilator section or step');
  await page.locator('input[data-bd-toggle]').uncheck();
  ok((await page.evaluate(() => window.__pft.state.bd.fev1_post)) === '' && await page.locator('[data-cell="bd.fev1_post"]').count() === 0, 'unticking clears the post values');
  // effort: nothing preselected
  const eff = page.locator('[data-field="spiro.effort"]');
  ok(await eff.locator('.ch').count() === 2 && await eff.locator('.ch[aria-checked="true"]').count() === 0, 'effort has no preselected "Adequate"');
  // quality group is folded
  const qg = page.locator('details.optgrp.fold', { hasText: 'Test quality' });
  ok(await qg.evaluate(e => e.open) === false, 'quality group collapsed');
  ok((await qg.boundingBox()).y > (await page.locator('[data-grid="spiro"]').boundingBox()).y, 'test quality sits below the indices');
  await qg.locator('summary').click();
  const qual = page.locator('[data-field="spiro.qual_fev1"]'), qual2 = page.locator('[data-field="spiro.qual_fvc"]');
  ok(await qual.locator('.ch').count() === 7 && await qual2.locator('.ch').count() === 7, 'quality grades A-F and U as 7 buttons, separately for FEV1 and FVC');
  await qual.getByRole('radio', { name: 'B', exact: true }).click();
  await qual2.getByRole('radio', { name: 'B', exact: true }).click();
  ok((await page.evaluate(() => window.__pft.state.spiro.qual_fev1 + window.__pft.state.spiro.qual_fvc)) === 'BB', 'quality grades by tap');
  ok(await page.locator('#pv .sec[data-sec="qual"]').count() === 0, 'interpretability is not in the lean running report');
  ok(/Spirometry testing was technically acceptable for interpretation \(grade B\)\./.test(await page.evaluate(() => window.__pft.result.textFull)), 'interpretability line in the full text');
  // prior study inline
  const pb = page.locator('[data-prior-block="spiro"]');
  ok(await pb.count() === 1 && await pb.locator('.pr-dates').count() === 0 && await page.locator('[data-cell="prior.fev1"]').count() === 0, 'prior comparison is a checkbox at the top of the step, closed by default');
  ok((await pb.boundingBox()).y < (await page.locator('[data-grid="spiro"]').boundingBox()).y, 'the prior checkbox sits above the indices');
  await page.locator('input[data-prior-toggle="spiro"]').check();
  ok(await page.locator('[data-cell="prior.fev1"]').count() === 1 && await page.locator('[data-cell="prior.fvc_pct"]').count() === 1, 'prior boxes appear in columns beside the values');
  await page.locator('[data-prior-block="spiro"] .qd .lnk', { hasText: '1 yr' }).click();
  ok((await page.evaluate(() => window.__pft.state.prior.list[0].date)) === '2024-03-05', 'one-year chip sets the prior date');
  await page.locator('[data-cell="prior.fev1"] input').fill('1.85');
  ok((await page.evaluate(() => [window.__pft.state.spiro.fev1_abs, window.__pft.state.prior.list[0].fev1, window.__pft.state.tests.prior])).join() === '1.55,1.85,false', 'this study\'s value on the spirometry row, the prior value in the prior column; no test toggle touched');
  const prTxt = await page.locator('#pv .sec[data-sec="prior"]').innerText();
  ok(/Since last testing \(3\/5\/2024, 1 year earlier\)\. FEV1 has changed by -16% & -300 mL \(1\.85 → 1\.55 L\)\. This change is likely to be significant given testing margin of error of ~15%\./.test(prTxt), 'comparison with percent change and significance appears in the PAST TESTING COMPARISON section: ' + prTxt);
  await page.locator('.pr-cmp summary').click();
  await page.locator('.pr-cmp input[type=checkbox]').nth(1).check();
  ok(/not directly comparable \(different bronchodilator state\)/.test(await page.locator('#pv .sec[data-sec="prior"]').innerText()), 'comparability flag caveats the comparison');
  await page.locator('.pr-cmp input[type=checkbox]').nth(1).uncheck();
  await page.locator('input[data-prior-toggle="spiro"]').uncheck();
  ok((await page.evaluate(() => window.__pft.state.prior.list[0].fev1)) === '' && await page.locator('#pv .sec[data-sec="prior"]').count() === 0, 'unticking clears the prior values and the comparison section');
  // loop gallery (its own step)
  await page.locator('.pill[data-step="fvl"]').click();
  ok(await page.locator('.step-head h2').innerText() === 'Flow–volume loop', 'loop has its own step');
  const gal = page.locator('[data-field="fvl.loop"]');
  ok(await gal.locator('.lp-tile').count() === 14, '14 loop tiles');
  await gal.locator('.lp-tile[data-loop="concave"]').click();
  ok((await page.evaluate(() => window.__pft.state.fvl.loop)) === 'concave', 'loop state concave');
  ok(/^The flow-volume curve is curvilinear and suggests an obstructive ventilatory defect\./.test(await page.locator('#pv .sec[data-sec="fvl"] p').innerText()), 'running report describes the curve in the template words');
  await gal.locator('.lp-tile[data-loop="concave"]').click();
  ok((await page.evaluate(() => window.__pft.state.fvl.loop)) === '', 'tile tap again clears');
  await gal.locator('.lp-tile[data-loop="sevobs"]').click();
  await page.locator('.pill[data-step="spiro"]').click();
  ok(await page.locator('[data-cell="spiro.fev1_abs"] input').inputValue() === '1.55', 'the typed value stays on the spirometry row');
  await page.screenshot({ path: 'shots/03_spiro.png', fullPage: true });

  // go through all module steps via Next
  const seen = [];
  for (let i = 0; i < 10; i++) {
    const nxt = page.locator('.nav .btn.primary');
    if (!(await nxt.count())) break;
    const t = await nxt.innerText();
    seen.push(t);
    if (/View report/.test(t)) { await nxt.click(); break; }
    await nxt.click();
  }
  ok(seen.some(s => /View report/.test(s)), 'reached report via Next: ' + seen.join(' | '));
  ok(await page.locator('#doc').count() === 1, 'report doc rendered');
  const rep = await page.locator('#doc').innerText();
  ok(/SPIROMETRY/i.test(rep) && /INTERPRETATION/i.test(rep), 'report has sections');
  ok(await page.locator('#doc .impr-p').count() === 1 && await page.locator('#doc ol').count() === 0, 'interpretation is a paragraph');
  ok(await page.locator('#headsup').count() === 1, 'headsup card');
  ok(await page.locator('#headsup .hu-item').first().evaluate(e => e.tagName === 'DETAILS'), 'heads-up items are collapsible rows');
  await page.screenshot({ path: 'shots/04_report.png', fullPage: true });

  // clipboard
  await page.locator('#copy-report').click();
  await page.waitForTimeout(200);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  ok(!/PULMONARY FUNCTION TEST REPORT/.test(clip) && !/HEADS-UP/.test(clip) && /INTERPRETATION: /.test(clip) && !/CONCLUSION/.test(clip) && !/INTERPRETABILITY: /.test(clip) && !/Reference values|BMI|Date:/.test(clip) && /^(SPIROMETRY|FLOW-VOLUME CURVE): /.test(clip), 'clipboard: lean report (sections + INTERPRETATION, no header or interpretability): ' + clip.slice(0, 80));
  await page.locator('[data-field="settings.copy"] .ch[data-v="full"]').first().click();
  await page.locator('#copy-report').click(); await page.waitForTimeout(200);
  const clipF = await page.evaluate(() => navigator.clipboard.readText());
  ok(/^PULMONARY FUNCTION TEST REPORT/.test(clipF) && /INTERPRETABILITY: /.test(clipF) && /Reference values/.test(clipF) && /INTERPRETATION: /.test(clipF), 'clipboard: full report on request');
  await page.locator('[data-field="settings.copy"] .ch[data-v="lean"]').first().click();
  await page.locator('#copy-all').click(); await page.waitForTimeout(200);
  const clip2 = await page.evaluate(() => navigator.clipboard.readText());
  ok(/HEADS-UP/.test(clip2) || (await page.locator('.hu-item').count()) === 0, 'clipboard with heads-up');
  ok(await page.locator('#toast.show, .toast.show').count() === 1, 'toast shows');

  // case code round trip
  await page.locator('details.plain summary', { hasText: 'Save or load' }).click();
  await page.locator('#copy-case').click(); await page.waitForTimeout(150);
  const code = await page.evaluate(() => navigator.clipboard.readText());
  ok(/^PFT1:/.test(code), 'case code copied');
  await page.getByRole('button', { name: 'New case' }).click();
  ok(await page.getByRole('button', { name: 'Click again to clear' }).count() === 1, 'two-click new case armed');
  await page.getByRole('button', { name: 'Click again to clear' }).click();
  ok(await page.locator('.tgrid').count() === 5, 'cleared to tests screen');
  ok((await page.evaluate(() => window.__pft.state.units.wt)) === 'kg', 'unit choice from the previous case carried over (kg kept)');
  ok(await page.evaluate(() => window.__pft.state.ctx.date) === today, 'new case resets the date to today');
  ok(await page.locator('.steps .pill').count() === 3, 'cleared pills');
  await loadExample(page, 0);
  await page.locator('details.plain summary', { hasText: 'Save or load' }).click();
  await page.fill('#case-box', code);
  await page.locator('#load-case').click();
  const st = await page.evaluate(() => window.__pft.state);
  ok(st.ctx.age === '68' && st.spiro.fev1.z === '-3.1' && st.ctx.indic.join() === 'dyspnea,asthma' && st.fvl.loop === 'sevobs' && st.spiro.ratio_abs === '0.48', 'state restored from case code (incl. indications, loop and the typed ratio)');
  await page.locator('details.plain summary', { hasText: 'Save or load' }).click();
  await page.fill('#case-box', 'garbage');
  await page.locator('#load-case').click();
  ok(/not a valid/.test(await page.locator('.toast').textContent()), 'invalid code toast');

  // fallback when clipboard blocked
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) }, configurable: true }); document.execCommand = () => false; });
  await page.locator('#copy-report').click(); await page.waitForTimeout(200);
  ok(await page.locator('#fallback textarea').count() === 1, 'fallback textarea shown');

  // --- every example: visit every step, check no errors
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'examples' }));
  await page.waitForSelector('.learn-body[data-topic="examples"] .ex');
  const nEx = await page.locator('.learn-body[data-topic="examples"] .ex').count();
  ok(nEx === 8, '8 worked examples under Learn');
  for (let i = 0; i < nEx; i++) {
    await loadExample(page, i);
    const name = await page.evaluate(() => document.querySelector('.toast').textContent);
    const pills = await page.locator('.steps .pill').allInnerTexts();
    ok(pills.indexOf('Prior PFTs') < 0, 'no separate prior step in example ' + i);
    for (let k = 0; k < pills.length; k++) {
      await page.locator('.steps .pill').nth(k).click();
      const h2 = await page.locator('.step-head h2, .bar h2').first().innerText();
      ok(h2.length > 0, 'step heading present ' + pills[k]);
    }
    await page.locator('.steps .pill').last().click();
    ok(!/undefined|NaN|\[object/.test(await page.locator('main').innerText()), 'no leak text in example ' + i + ' ' + name);
    if (i === 0) await page.screenshot({ path: 'shots/06_copd_report.png', fullPage: true });
    if (i === 6) await page.screenshot({ path: 'shots/07_headsup_demo.png', fullPage: true });
  }
  // the COPD example's prior shows up inline on the spirometry step
  await loadExample(page, 0);
  await page.locator('.pill[data-step="spiro"]').click();
  ok(await page.locator('input[data-prior-toggle="spiro"]').isChecked() && await page.locator('[data-prior-block="spiro"] .pr-dates').isVisible(), 'a case with a prior opens the comparison block');
  ok(await page.locator('[data-cell="prior.fev1"] input').inputValue() === '1.85', 'prior FEV1 shown in its column');
  await page.screenshot({ path: 'shots/08_prior.png', fullPage: true });

  // --- bronchoprovocation conditional groups
  await page.locator('.pill[data-step="tests"]').click();
  await page.locator('input[data-test="bronch"]').check();
  await page.locator('.pill[data-step="bronch"]').click();
  ok(await page.locator('.grp:visible h3', { hasText: /^Methacholine result$/ }).count() === 1, 'methacholine group visible');
  ok(await page.locator('.grp:visible h3', { hasText: /^Mannitol result$/ }).count() === 0, 'mannitol hidden');
  await page.locator('[data-field="bronch.type"]').getByRole('radio', { name: 'Mannitol' }).click();
  ok(await page.locator('.grp:visible h3', { hasText: /^Mannitol result$/ }).count() === 1, 'mannitol visible after tap');
  ok(await page.locator('.grp:visible h3', { hasText: /^Methacholine result$/ }).count() === 0, 'methacholine hidden after tap');

  // --- all modules render (tick everything)
  await page.locator('.pill[data-step="tests"]').click();
  const boxes = page.locator('.tt input');
  for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check();
  const allPills = await page.locator('.steps .pill').allInnerTexts();
  ok(allPills.length === 16, 'all tests -> 16 pills: ' + allPills.length);
  for (let k = 0; k < allPills.length; k++) { await page.locator('.steps .pill').nth(k).click(); }
  await page.locator('.pill[data-step="cpet"]').click();
  await page.screenshot({ path: 'shots/09_cpet.png', fullPage: true });

  ok(errs.length === 0, 'no page errors: ' + errs.join(' || '));

  // --- mobile
  const m = await browser.newContext({ viewport: { width: 400, height: 800 }, colorScheme: 'dark' });
  const mp = await m.newPage();
  const merrs = []; mp.on('pageerror', e => merrs.push(e.message));
  await mp.goto(FILE); await mp.waitForSelector('.tgrid');
  const checkOverflow = async (label) => {
    const o = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    ok(o.sw <= o.iw + 1, 'no horizontal overflow at 400px on ' + label + ' (' + o.sw + ' > ' + o.iw + ')');
  };
  await checkOverflow('tests');
  await mp.screenshot({ path: 'shots/10_mobile_tests_dark.png', fullPage: true });
  await loadExample(mp, 0);
  await checkOverflow('report'); await mp.screenshot({ path: 'shots/11_mobile_report_dark.png', fullPage: true });
  const pillsM = await mp.locator('.steps .pill').count();
  for (let k = 0; k < pillsM; k++) { await mp.locator('.steps .pill').nth(k).click(); await checkOverflow('step ' + k); }
  await mp.locator('.pill[data-step="spiro"]').click();
  await mp.screenshot({ path: 'shots/12_mobile_spiro_dark.png', fullPage: true });
  ok(merrs.length === 0, 'no mobile errors ' + merrs.join('|'));

  console.log('e2e passed', passes, 'failed', fails);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('E2E CRASH', e); process.exit(2); });
