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
  ok(await page.locator('.tt input').count() === 14, '14 test toggles (prior comparison is inline on the test steps)');
  ok(await page.locator('.ex').count() === 0 && await page.locator('.zkey').count() === 0, 'no worked examples or z-key on the first screen');
  ok(await page.locator('.steps .pill').count() === 3, 'initial 3 pills: nothing preselected');
  ok(await page.locator('.tt input:checked').count() === 0, 'no test ticked by default');
  ok(await page.getByRole('button', { name: 'Continue →' }).isDisabled(), 'continue disabled until a test is ticked');
  await page.screenshot({ path: 'shots/01_tests.png', fullPage: true });

  // presets and ticks
  await page.getByRole('button', { name: 'Full PFT', exact: true }).click();
  ok(await page.locator('.steps .pill').count() === 7, 'Full PFT -> 7 pills');
  await page.locator('input[data-test="bd"]').check();
  ok(await page.locator('.steps .pill').count() === 8, '8 pills after +bd');
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
  const sex = page.locator('[data-field="ctx.sex"]');
  ok(await sex.locator('.ch').count() === 2, 'sex has two tap buttons (blank option hidden)');
  await sex.getByRole('radio', { name: 'Male', exact: true }).click();
  ok(await sex.locator('.ch[aria-checked="true"]').innerText() === 'Male', 'Male pressed');
  await sex.getByRole('radio', { name: 'Male', exact: true }).click();
  ok(await sex.locator('.ch[aria-checked="true"]').count() === 0, 'tapping Male again clears it');
  await sex.getByRole('radio', { name: 'Male', exact: true }).click();
  const hw = page.locator('details.optgrp', { hasText: 'Height and weight' });
  ok(await hw.evaluate(e => e.open) === false, 'height/weight collapsed');
  await hw.locator('summary').click();
  await page.getByLabel('Height').fill('176');
  ok((await hw.locator('.tag').innerText()) === '1 entered', 'collapsed panel counts entries');
  await page.getByLabel('Date of study').fill('2025-03-05');
  const live = await page.locator('.live p').allInnerTexts();
  ok(live[0].indexOf('68-year-old, male') === 0, 'live ctx text: ' + live[0]);
  ok(/Indication: Dyspnea; Asthma; recurrent pneumonia/.test(live.join(' ')), 'live indication text: ' + live.join(' | '));
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
  const ratio = page.locator('[data-field="spiro.ratio"]');
  ok(await ratio.locator('.sg').count() === 4 && await ratio.locator('.sg', { hasText: 'Not measured' }).count() === 0, 'no "Not measured" chip; nothing pressed means not entered');
  ok(await ratio.locator('.sg[aria-pressed="true"]').count() === 0, 'nothing pressed by default');
  ok(await ratio.locator('input').isHidden(), 'z-score box is hidden until asked for');
  await ratio.getByRole('button', { name: 'Below LLN ↓' }).click();
  ok(await ratio.locator('.sg[aria-pressed="true"]').innerText() === 'Below LLN ↓', 'ratio pressed');
  await ratio.getByRole('button', { name: 'Below LLN ↓' }).click();
  ok(await ratio.locator('.sg[aria-pressed="true"]').count() === 0 && (await page.evaluate(() => window.__pft.state.spiro.ratio.c)) === 'nm', 'tapping again clears to not measured');
  await ratio.getByRole('button', { name: 'Below LLN ↓' }).click();
  const fev1 = page.locator('[data-field="spiro.fev1"]');
  await fev1.locator('.zlink').click();
  await fev1.locator('input').fill('-3.1');
  ok(await fev1.locator('.sg[aria-pressed="true"]').innerText() === 'Moderate ↓', 'z -3.1 -> Moderate pressed');
  await fev1.getByRole('button', { name: 'Mild ↓' }).click();
  ok(await fev1.locator('input').inputValue() === '', 'button click clears z');
  await fev1.locator('input').fill('-3.1');
  const fvc = page.locator('[data-field="spiro.fvc"]');
  await fvc.getByRole('button', { name: 'WNL' }).click();
  const liveTxt = await page.locator('.live p').first().innerText();
  ok(/Moderate obstructive impairment present \(FEV1\/FVC below the LLN; FEV1 z -3\.1\)\. FVC is normal\./.test(liveTxt) && !/COPD|ventilatory defect/.test(liveTxt), 'live panel carries the template statement, not the conclusion: ' + liveTxt);
  // effort: nothing preselected
  const eff = page.locator('[data-field="spiro.effort"]');
  ok(await eff.locator('.ch').count() === 2 && await eff.locator('.ch[aria-checked="true"]').count() === 0, 'effort has no preselected "Adequate"');
  // quality group is folded
  const qg = page.locator('details.optgrp.fold', { hasText: 'Quality' });
  ok(await qg.evaluate(e => e.open) === false, 'quality group collapsed');
  await qg.locator('summary').click();
  const qual = page.locator('[data-field="spiro.qual_fev1"]'), qual2 = page.locator('[data-field="spiro.qual_fvc"]');
  ok(await qual.locator('.ch').count() === 7 && await qual2.locator('.ch').count() === 7, 'quality grades A-F and U as 7 buttons, separately for FEV1 and FVC');
  await qual.getByRole('radio', { name: 'B', exact: true }).click();
  await qual2.getByRole('radio', { name: 'B', exact: true }).click();
  ok((await page.evaluate(() => window.__pft.state.spiro.qual_fev1 + window.__pft.state.spiro.qual_fvc)) === 'BB', 'quality grades by tap');
  ok(/Spirometry testing was technically acceptable for interpretation \(grade B\)\./.test(await page.locator('#pv .sec[data-sec="qual"]').innerText()), 'interpretability line in the preview');
  // prior study inline
  const pb = page.locator('[data-prior-block="spiro"]');
  ok(await pb.count() === 1 && await pb.locator('.prior-body').isHidden(), 'prior comparison is a checkbox on the spirometry step, closed by default');
  await pb.locator('input[type=checkbox]').first().check();
  ok(await pb.locator('.pr-row').count() === 6, 'date row and four value rows');
  await pb.locator('.qd .lnk', { hasText: '1 yr' }).click();
  ok((await page.evaluate(() => window.__pft.state.prior.list[0].date)) === '2024-03-05', 'one-year chip sets the prior date');
  const rows = pb.locator('.pr-row');
  await rows.nth(2).locator('input').nth(0).fill('1.55');
  await rows.nth(2).locator('input').nth(1).fill('1.85');
  ok((await page.evaluate(() => [window.__pft.state.spiro.fev1_abs, window.__pft.state.prior.list[0].fev1, window.__pft.state.tests.prior])).join() === '1.55,1.85,false', 'current value feeds the spirometry entry, prior value the prior study; no test toggle touched');
  const liveP = await page.locator('.live p').first().innerText();
  const prTxt = await page.locator('#pv .sec[data-sec="prior"]').innerText();
  ok(/Since last testing \(3\/5\/2024, 1 year earlier\)\. FEV1 has changed by -16% & -300 mL \(1\.85 → 1\.55 L\)\. This change is likely to be significant given testing margin of error of ~15%\./.test(prTxt), 'comparison with percent change and significance appears in the PAST TESTING COMPARISON section: ' + prTxt);
  await pb.locator('.pr-cmp summary').click();
  await pb.locator('.pr-cmp input[type=checkbox]').nth(1).check();
  ok(/not directly comparable \(different bronchodilator state\)/.test(await page.locator('#pv .sec[data-sec="prior"]').innerText()), 'comparability flag caveats the comparison');
  await pb.locator('.pr-cmp input[type=checkbox]').nth(1).uncheck();
  await pb.locator('input[type=checkbox]').first().uncheck();
  ok((await page.evaluate(() => window.__pft.state.prior.list[0].fev1)) === '' && await page.locator('#pv .sec[data-sec="prior"]').count() === 0, 'unticking clears the prior values and the comparison section');
  // loop gallery (its own step)
  await page.locator('.pill[data-step="fvl"]').click();
  ok(await page.locator('.step-head h2').innerText() === 'Flow–volume loop', 'loop has its own step');
  const gal = page.locator('[data-field="fvl.loop"]');
  ok(await gal.locator('.lp-tile').count() === 14, '14 loop tiles');
  await gal.locator('.lp-tile[data-loop="concave"]').click();
  ok((await page.evaluate(() => window.__pft.state.fvl.loop)) === 'concave', 'loop state concave');
  ok(/^The flow-volume curve is curvilinear and suggests an obstructive ventilatory defect\./.test(await page.locator('.live p').first().innerText()), 'live text describes the curve in the template words');
  await gal.locator('.lp-tile[data-loop="concave"]').click();
  ok((await page.evaluate(() => window.__pft.state.fvl.loop)) === '', 'tile tap again clears');
  await gal.locator('.lp-tile[data-loop="sevobs"]').click();
  await page.locator('.pill[data-step="spiro"]').click();
  const meas = page.locator('details.optgrp', { hasText: 'Measured values' });
  ok(await meas.evaluate(e => e.open) === true, 'measured values panel opens because a value was typed from the prior block');
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
  ok(/PULMONARY FUNCTION TEST REPORT/.test(clip) && !/HEADS-UP/.test(clip) && /CONCLUSION: /.test(clip) && /INTERPRETABILITY: /.test(clip) && !/Tests performed/.test(clip), 'clipboard report in the template form');
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
  ok(await page.evaluate(() => window.__pft.state.ctx.date) === today, 'new case resets the date to today');
  ok(await page.locator('.steps .pill').count() === 3, 'cleared pills');
  await loadExample(page, 0);
  await page.locator('details.plain summary', { hasText: 'Save or load' }).click();
  await page.fill('#case-box', code);
  await page.locator('#load-case').click();
  const st = await page.evaluate(() => window.__pft.state);
  ok(st.ctx.age === '68' && st.spiro.fev1.z === '-3.1' && st.ctx.indic.join() === 'dyspnea,asthma' && st.fvl.loop === 'sevobs', 'state restored from case code (incl. indications and loop)');
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
  const pb2 = page.locator('[data-prior-block="spiro"]');
  ok(await pb2.locator('input[type=checkbox]').first().isChecked() && await pb2.locator('.prior-body').isVisible(), 'a case with a prior opens the comparison block');
  ok(await pb2.locator('.pr-row').nth(2).locator('input').nth(1).inputValue() === '1.85', 'prior FEV1 shown');
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
  ok(allPills.length === 17, 'all tests -> 17 pills: ' + allPills.length);
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
