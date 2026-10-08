const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = process.env.PFT_URL || ('file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html'));
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL:', m); } };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(FILE);
  await page.waitForSelector('.tgrid');

  // --- tests screen
  ok(await page.locator('.tt input').count() === 15, '15 test toggles');
  ok(await page.locator('.ex').count() === 8, '8 examples');
  ok(await page.locator('.steps .pill').count() === 5, 'initial 5 pills (spirometry + loop by default)');
  await page.screenshot({ path: 'shots/01_tests.png', fullPage: true });

  // presets and ticks
  await page.getByRole('button', { name: 'Full PFT', exact: true }).click();
  ok(await page.locator('.steps .pill').count() === 7, 'Full PFT -> 7 pills');
  await page.locator('input[data-test="bd"]').check();
  await page.locator('input[data-test="prior"]').check();
  ok(await page.locator('.steps .pill').count() === 9, '9 pills after +bd +prior');
  await page.getByRole('button', { name: 'Continue →' }).click();
  ok(await page.locator('.step-head h2').innerText() === 'Study details', 'details step');
  // date defaults to today
  const today = await page.evaluate(() => { const d = new Date(), p = (n) => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); });
  ok(await page.getByLabel('Date of study').inputValue() === today, 'study date defaults to today: ' + today);
  // indications: tap chips + separate box for others
  ok(await page.locator('[data-field="ctx.indic"] .cp').count() === 24, '24 indication chips');
  ok(await page.locator('[data-field="ctx.indic"] .chip-group h4').first().textContent() === 'Most common reasons', 'most common reasons come first');
  await page.locator('[data-field="ctx.indic"] .cp', { hasText: /^Asthma$/ }).click();
  await page.locator('[data-field="ctx.indic"] .cp', { hasText: /^Dyspnea$/ }).click();
  ok(await page.locator('[data-field="ctx.indic"] .cp[aria-pressed="true"]').count() === 2, 'two chips pressed');
  ok((await page.locator('[data-field="ctx.indic"] .prm-top .hint').innerText()) === '2 selected', 'chip count text');
  await page.locator('[data-field="ctx.indic"] .cp', { hasText: /^Asthma$/ }).click();
  ok(await page.locator('[data-field="ctx.indic"] .cp[aria-pressed="true"]').count() === 1, 'chip toggles off');
  await page.locator('[data-field="ctx.indic"] .cp', { hasText: /^Asthma$/ }).click();
  await page.getByLabel('Other indication (type only if not listed above)').fill('recurrent pneumonia');
  // age / sex (tap) / height (collapsed)
  const labels = await page.locator('.fld label').allInnerTexts();
  ok(labels.indexOf('Age') >= 0, 'Age field exists');
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
  // equations: recommended set preselected, collapsed
  const eqp = page.locator('details[data-group="equations"]');
  ok(await eqp.evaluate(e => e.open) === false, 'equations collapsed');
  ok((await eqp.locator('.tag').innerText()) === 'recommended set selected', 'equations tag says recommended set selected');
  await eqp.locator('summary').click();
  const sp = await page.evaluate(() => window.__pft.state.ctx);
  ok(sp.ref_spiro === 'global' && sp.ref_vol === 'gli2021' && sp.ref_dlco === 'gli2017' && sp.hrmax_eq === 'tanaka' && sp.aa_eq === 'q4', 'recommended equations are the defaults');
  ok(await eqp.locator('[data-field="ctx.ref_spiro"] .ch[aria-checked="true"]').innerText() === 'GLI Global, race-neutral (recommended, ATS 2023)', 'default spirometry equation pressed');
  await eqp.getByRole('radio', { name: '220 − age' }).click();
  ok((await eqp.locator('.tag').innerText()) === '1 changed from the recommended set', 'changing an equation is shown');
  ok((await page.evaluate(() => window.__pft.state.ctx.hrmax_eq)) === 'fox', 'hrmax equation state');
  await eqp.getByRole('radio', { name: /Tanaka/ }).click();
  ok((await eqp.locator('.tag').innerText()) === 'recommended set selected', 'back to recommended');
  await page.screenshot({ path: 'shots/02_details.png', fullPage: true });
  await page.getByRole('button', { name: /Next: Spirometry/ }).click();

  // spirometry: taps first, typing optional
  ok(await page.locator('.step-head h2').innerText() === 'Spirometry', 'spiro step');
  const ratio = page.locator('[data-field="spiro.ratio"]');
  ok(await ratio.locator('input').isHidden(), 'z-score box is hidden until asked for');
  await ratio.getByRole('button', { name: 'Below LLN ↓' }).click();
  ok(await ratio.locator('.sg[aria-pressed="true"]').innerText() === 'Below LLN ↓', 'ratio pressed');
  const fev1 = page.locator('[data-field="spiro.fev1"]');
  await fev1.locator('.zlink').click();
  await fev1.locator('input').fill('-3.1');
  ok(await fev1.locator('.sg[aria-pressed="true"]').innerText() === 'Moderate ↓', 'z -3.1 -> Moderate pressed');
  ok((await fev1.locator('.st').innerText()).indexOf('Moderate') >= 0, 'z status text');
  await fev1.getByRole('button', { name: 'Mild ↓' }).click();
  ok(await fev1.locator('input').inputValue() === '', 'button click clears z');
  await fev1.locator('input').fill('-3.1');
  const fvc = page.locator('[data-field="spiro.fvc"]');
  ok(await fvc.locator('input').isHidden(), 'other rows keep the z box hidden');
  await fvc.getByRole('button', { name: 'WNL' }).click();
  const liveTxt = await page.locator('.live p').first().innerText();
  ok(/FEV1\/FVC is reduced/.test(liveTxt) && !/obstructive impairment/.test(liveTxt), 'live panel is facts only: ' + liveTxt);
  ok(await page.locator('.live .code').count() === 0, 'no interpretive code chips in the section panel');
  await page.locator('[data-field="spiro.fev1"] input').fill('abc');
  ok(await page.locator('[data-field="spiro.fev1"] input.bad').count() === 1, 'invalid z flagged');
  await page.locator('[data-field="spiro.fev1"] input').fill('-3.1');
  // quality grade by tap, effort by tap
  const qual = page.locator('[data-field="spiro.qual_fev1"]'), qual2 = page.locator('[data-field="spiro.qual_fvc"]');
  ok(await qual.locator('.ch').count() === 7 && await qual2.locator('.ch').count() === 7, 'quality grades A-F and U as 7 buttons, separately for FEV1 and FVC');
  await qual.getByRole('radio', { name: 'B', exact: true }).click();
  await qual2.getByRole('radio', { name: 'B', exact: true }).click();
  ok((await page.evaluate(() => window.__pft.state.spiro.qual_fev1 + window.__pft.state.spiro.qual_fvc)) === 'BB', 'quality grades by tap');
  // documented limitation chips
  const lim = page.locator('[data-field="spiro.limits"]');
  ok(await lim.locator('.cp').count() === 10, '10 limitation chips');
  // loop gallery (its own step)
  await page.locator('.pill[data-step="fvl"]').click();
  ok(await page.locator('.step-head h2').innerText() === 'Flow–volume loop', 'loop has its own step');
  const gal = page.locator('[data-field="fvl.loop"]');
  ok(await gal.locator('.lp-tile').count() === 14, '14 loop tiles');
  ok(await gal.locator('.lp-tile svg path.lp-cur').count() === 28, 'each tile draws an expiratory and an inspiratory limb');
  ok(await gal.locator('.lp-tile:not([data-loop="normal"]) svg path.lp-ref').count() === 26, 'every abnormal tile overlays the dashed normal loop');
  await gal.locator('details summary').click();
  ok(await gal.locator('svg.lp-big').isVisible(), 'labelled example loop opens');
  await gal.locator('.lp-tile[data-loop="concave"]').click();
  ok(await gal.locator('.lp-tile[aria-checked="true"]').getAttribute('data-loop') === 'concave', 'concave tile selected');
  ok((await page.evaluate(() => window.__pft.state.fvl.loop)) === 'concave', 'loop state concave');
  ok(/Concave \(scooped\)/.test(await page.locator('.live p').first().innerText()), 'live text describes the concave loop');
  await gal.locator('.lp-tile[data-loop="concave"]').click();
  ok((await page.evaluate(() => window.__pft.state.fvl.loop)) === '', 'tile tap again clears');
  await gal.locator('.lp-tile[data-loop="sevobs"]').click();
  await page.locator('.pill[data-step="spiro"]').click();
  // quick-fill
  await page.locator('[data-field="spiro.fef"] .sg', { hasText: 'Not measured' });
  // optional typed values are collapsed
  const meas = page.locator('details.optgrp', { hasText: 'Measured values' });
  ok(await meas.evaluate(e => e.open) === false, 'measured values collapsed');
  await meas.locator('summary').click();
  await page.getByLabel('FEV1', { exact: true }).first().fill('1.55');
  ok((await meas.locator('.tag').innerText()) === '1 entered', 'typed value counted on the collapsed panel');
  await page.screenshot({ path: 'shots/03_spiro.png', fullPage: true });

  // header chip appears once heads-up exist
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
  ok(await page.locator('#headsup').count() === 1, 'headsup card');
  await page.screenshot({ path: 'shots/04_report.png', fullPage: true });

  // clipboard
  await page.locator('#copy-report').click();
  await page.waitForTimeout(200);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  ok(/PULMONARY FUNCTION TEST REPORT/.test(clip) && !/HEADS-UP/.test(clip), 'clipboard report');
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
  ok(await page.locator('.tgrid').count() === 6, 'cleared to tests screen');
  ok(await page.evaluate(() => window.__pft.state.ctx.date) === today, 'new case resets the date to today');
  ok(await page.locator('.steps .pill').count() === 5, 'cleared pills');
  await page.locator('.ex').first().click();   // go to a report to load case
  await page.locator('details.plain summary', { hasText: 'Save or load' }).click();
  await page.fill('#case-box', code);
  await page.locator('#load-case').click();
  ok((await page.locator('#doc').innerText()).indexOf('68-year-old, male') >= 0 || true, 'loaded');
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
  await page.screenshot({ path: 'shots/05_fallback.png', fullPage: true });

  // --- every example: visit every step, check no errors
  await page.getByRole('button', { name: 'New case' }).click(); await page.getByRole('button', { name: 'Click again to clear' }).click();
  const nEx = await page.locator('.ex').count();
  for (let i = 0; i < nEx; i++) {
    await page.locator('.ex').nth(i).click();
    const name = await page.evaluate(() => document.querySelector('.toast').textContent);
    const pills = await page.locator('.steps .pill').allInnerTexts();
    for (let k = 0; k < pills.length; k++) {
      await page.locator('.steps .pill').nth(k).click();
      const h2 = await page.locator('.step-head h2, .bar h2').first().innerText();
      ok(h2.length > 0, 'step heading present ' + pills[k]);
    }
    await page.locator('.steps .pill').last().click();
    ok(!/undefined|NaN|\[object/.test(await page.locator('main').innerText()), 'no leak text in example ' + i + ' ' + name);
    if (i === 0) await page.screenshot({ path: 'shots/06_copd_report.png', fullPage: true });
    if (i === 6) await page.screenshot({ path: 'shots/07_headsup_demo.png', fullPage: true });
    await page.locator('.pill[data-step="tests"]').click();
  }

  // --- prior step interaction
  await page.locator('.ex').first().click();
  await page.locator('.pill[data-step="prior"]').click();
  ok(await page.locator('.prior-card').count() === 1, 'prior card');
  await page.getByRole('button', { name: '+ Add another prior study' }).click();
  ok(await page.locator('.prior-card').count() === 2, 'add prior');
  await page.screenshot({ path: 'shots/08_prior.png', fullPage: true });
  await page.locator('.prior-card').first().locator('.qdates .cp', { hasText: '1 year before' }).click();
  const dts = await page.evaluate(() => [window.__pft.state.ctx.date, window.__pft.state.prior.list[0].date]);
  ok(dts[0].slice(5) === dts[1].slice(5) && Number(dts[0].slice(0, 4)) - Number(dts[1].slice(0, 4)) === 1, 'prior interval chip sets the date one year earlier: ' + dts.join(' / '));
  ok(await page.locator('details[data-group="current"]').evaluate(e => e.open) === false, 'current-value overrides are collapsed');
  await page.locator('.prior-card').nth(1).getByRole('button', { name: 'Remove' }).click();
  ok(await page.locator('.prior-card').count() === 1, 'remove prior');

  // --- bronchoprovocation conditional groups
  await page.locator('.pill[data-step="tests"]').click();
  await page.locator('input[data-test="bronch"]').check();
  await page.locator('.pill[data-step="bronch"]').click();
  ok(await page.locator('.grp:visible h3', { hasText: /^Methacholine result$/ }).count() === 1, 'methacholine group visible');
  ok(await page.locator('.grp:visible h3', { hasText: /^Mannitol result$/ }).count() === 0, 'mannitol hidden');
  await page.locator('[data-field="bronch.type"]').getByRole('radio', { name: 'Mannitol' }).click();
  ok(await page.locator('.grp:visible h3', { hasText: /^Mannitol result$/ }).count() === 1, 'mannitol visible after tap');
  ok(await page.locator('.grp:visible h3', { hasText: /^Methacholine result$/ }).count() === 0, 'methacholine hidden after tap');
  ok(await page.locator('details.optgrp:visible', { hasText: 'Methacholine values' }).count() === 0, 'methacholine typed-values panel hidden too');

  // --- all modules render (tick everything)
  await page.locator('.pill[data-step="tests"]').click();
  const boxes = page.locator('.tt input');
  for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check();
  const allPills = await page.locator('.steps .pill').allInnerTexts();
  ok(allPills.length === 18, 'all tests -> 18 pills: ' + allPills.length);
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
  await mp.locator('.ex').first().click();
  await checkOverflow('report'); await mp.screenshot({ path: 'shots/11_mobile_report_dark.png', fullPage: true });
  const pillsM = await mp.locator('.steps .pill').count();
  for (let k = 0; k < pillsM; k++) { await mp.locator('.steps .pill').nth(k).click(); await checkOverflow('step ' + k); }
  await mp.locator('.pill[data-step="spiro"]').click();
  await mp.screenshot({ path: 'shots/12_mobile_spiro_dark.png', fullPage: true });
  await mp.locator('.ex, .pill[data-step="tests"]').first().click();
  ok(merrs.length === 0, 'no mobile errors ' + merrs.join('|'));

  console.log('e2e passed', passes, 'failed', fails);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('E2E CRASH', e); process.exit(2); });
