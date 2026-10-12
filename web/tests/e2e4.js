// New controls: separate quality grades and limitation chips, DLCO hemoglobin basis, challenge completion, wording level,
// suggested additions (review-only wording), prior-study comparability flags, and the phrase catalog in Learn.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = process.env.PFT_URL || ('file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html'));
let fails = 0, passes = 0;
const openCard = (page, id) => page.evaluate((id) => { const el = document.getElementById(id); if (el && !el.open) el.open = true; }, id);
async function loadExample(page, i) {
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'examples' }));
  await page.waitForSelector('.learn-body[data-topic="examples"] .ex');
  await page.locator('.learn-body[data-topic="examples"] .ex').nth(i).click();
  await page.waitForSelector('#doc');
}
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
  await loadExample(page, 0);
  ok(await page.locator('[data-field="settings.style"] .ch').count() === 3, 'three wording levels');
  await openCard(page, 'suggest');
  const sug = page.locator('#suggest .sug');
  const nSug = await sug.count();
  ok(nSug >= 2, 'suggested additions offered for the COPD case: ' + nSug);
  const emph = page.locator('#suggest .sug[data-sug="impression.emphysema_context"]');
  ok(await emph.count() === 1, 'emphysema context is offered (obstruction + hyperinflation + low DLCO)');
  const before = await page.locator('#doc .interp').innerText();
  ok(!/compatible with emphysema/i.test(before), 'catalog phrase absent before tapping');
  await emph.click();
  await page.waitForTimeout(100);
  const after = await page.locator('#doc .interp').innerText();
  ok(/compatible with emphysema/i.test(after), 'tapped suggestion joins the interpretation');
  ok(await emph.getAttribute('aria-pressed') === 'true', 'chip shows included');
  ok((await page.evaluate(() => JSON.stringify(window.__pft.state.review))) === '{"impression.emphysema_context":true}', 'selection stored by phrase id');
  await emph.click(); await page.waitForTimeout(80);
  ok(!/compatible with emphysema/i.test(await page.locator('#doc .interp').innerText()), 'tap again removes it');
  // wording level changes the section text, not the facts
  const std = await page.locator('#doc .sec[data-sec="spiro"] p').innerText();
  ok(/1\.55 L \(z -3\.1\)/.test(std), 'standard level prints the measured FEV1 with its z-score: ' + std.slice(0, 120));
  await page.locator('[data-field="settings.style"] .ch[data-v="concise"]').click(); await page.waitForTimeout(80);
  const conTxt = await page.locator('#doc .sec[data-sec="spiro"] p').innerText();
  ok(!/1\.55 L \(z/.test(conTxt) && /Moderate obstructive impairment present \(FEV1\/FVC z -3\.4, below the LLN; FEV1 z -3\.1\)/.test(conTxt), 'concise level drops the numbers line: ' + conTxt.slice(0, 120));
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
  ok(/End of test criteria was not met limiting accuracy of interpretation/.test(pvTxt), 'limitation chip appears in the INTERPRETABILITY section: ' + pvTxt.slice(0, 160));
  await page.locator('[data-field="spiro.limits"] .cp[data-v="early"]').click(); await page.waitForTimeout(80);
  await page.screenshot({ path: 'shots/42_spiro_quality.png', fullPage: true });

  // DLCO basis
  await page.evaluate(() => window.__pft.goto('dlco'));
  await page.waitForSelector('[data-field="dlco.basis"]');
  ok(await page.locator('[data-field="dlco.basis"] .ch').count() === 2, 'basis: unadjusted / adjusted taps (blank = report does not say)');
  await page.locator('[data-field="dlco.basis"] .ch[data-v="adj"]').click(); await page.waitForTimeout(80);
  ok(/\(hemoglobin-adjusted value\)/.test(await page.locator('#pv .sec[data-sec="dlco"]').innerText()), 'adjusted basis labels the DLCO line');
  ok(await page.locator('#hu-chip').innerText().then(t => /alert|caution/i.test(t)), 'two adjusted values flagged in the heads-up chip');
  await page.locator('[data-field="dlco.basis"] .ch[data-v="un"]').click(); await page.waitForTimeout(80);

  // prior comparability flags live with the prior block on each test step
  await page.evaluate(() => window.__pft.goto('dlco'));
  await page.waitForSelector('[data-prior-block="dlco"]');
  await page.locator('[data-prior-block="dlco"] input[type=checkbox]').first().check();
  await page.locator('[data-prior-block="dlco"] .pr-row').nth(2).locator('input').nth(0).fill('14.2');
  await page.locator('[data-prior-block="dlco"] .pr-row').nth(2).locator('input').nth(1).fill('17.0');
  ok(/DLCO has changed by -16% & -2\.8 mL\/min\/mmHg \(17\.0 → 14\.2\)\. This change is likely to be significant given testing margin of error of ~10%/.test(await page.locator('#pv .sec[data-sec="prior"]').innerText()), 'DLCO comparison with its 10% threshold: ' + await page.locator('#pv .sec[data-sec="prior"]').innerText());
  const cmp = page.locator('[data-prior-block="dlco"] [data-group="cmp"]');
  ok(await cmp.locator('input[type=checkbox]').count() === 2, 'the DLCO step offers the two comparability flags that matter for DLCO');
  await cmp.locator('summary').click();
  await cmp.locator('input[type=checkbox]').first().check(); await page.waitForTimeout(80);
  ok(/not directly comparable \(different hemoglobin-adjustment basis\)/.test(await page.locator('#pv .sec[data-sec="prior"]').innerText()), 'hemoglobin-basis flag caveats the DLCO comparison: ' + await page.locator('#pv .sec[data-sec="prior"]').innerText());
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

  // differentials and additional studies: offered per finding, included only when tapped
  await page.evaluate(() => { const S = window.PFT.defaultState(); Object.keys(S.tests).forEach(k => { S.tests[k] = false; }); S.tests.spiro = true; S.tests.vol = true; S.tests.dlco = true;
    S.spiro.ratio = { c: 'wnl', z: '' }; S.spiro.fev1 = { c: 'wnl', z: '' }; S.spiro.fvc = { c: 'wnl', z: '' }; S.vol.tlc = { c: 'wnl', z: '' }; S.vol.rvtlc = { c: 'wnl', z: '' };
    S.dlco.dlco = { c: 'nm', z: '-2.4' }; S.dlco.va = { c: 'wnl', z: '' }; S.dlco.kco = { c: 'mild', z: '' }; window.__pft.load(S, 'report'); });
  await page.waitForSelector('#differentials');
  ok(await page.locator('#differentials').evaluate(e => !e.open), 'differentials card starts collapsed when nothing is selected');
  await openCard(page, 'differentials');
  ok(await page.locator('#differentials .dx-group').count() === 2 && await page.locator('#differentials .dx-group[data-dx-group="dlco_isolated"]').count() === 1 && await page.locator('#differentials .dx-group[data-dx-group="general"]').count() === 1, 'isolated low DLCO offers its own group plus the general suggestions');
  ok(await page.locator('#differentials .dx-group h3').first().innerText() === 'For the isolated reduction in DLCO', 'group is titled by the finding');
  const G = page.locator('#differentials .dx-group[data-dx-group="dlco_isolated"]');
  ok(await G.locator('.dx[data-dx^="dx."]').count() === 6 && await G.locator('.dx[data-dx^="study."]').count() === 6, 'six differentials and six studies offered for the finding');
  ok(await page.locator('#differentials .dx-group[data-dx-group="general"] .dx').count() >= 3, 'general suggestions (repeat PFTs, clinic consultation, e-consult) offered');
  const nSug0 = (await page.locator('#doc .interp').innerText().then(t => t.match(/Suggest /g) || [])).length;
  ok(await page.locator('#differentials .dx.on').count() === 0 && !/Differential considerations/.test(await page.locator('#doc').innerText()) && nSug0 === 1, 'nothing included by default (only the template\'s own hemoglobin suggestion)');
  ok(await page.locator('#suggest .sug[data-sug="dlco.isolated_differential"]').count() === 1 && await page.locator('#suggest .sug[data-sug="followup.hb"]').count() === 1, 'the generic catalog wording is offered while nothing itemized overlaps it');
  ok(await page.locator('#suggest .sug[data-sug="local.attest"]').count() === 1 && await page.locator('#suggest .sug[data-sug="local.no_prior"]').count() === 1, 'reading-room template sentences (attestation, no prior studies) are offered as taps');
  await page.locator('#differentials .dx[data-dx="dx.dlco_isolated.ild_early"]').click(); await page.waitForTimeout(100);
  await page.locator('#differentials .dx[data-dx="dx.dlco_isolated.cohb"]').click(); await page.waitForTimeout(100);
  const interp = await page.locator('#doc .interp').innerText();
  ok(/Differential considerations for the isolated reduction in DLCO include early interstitial lung disease \(gas transfer can fall before FVC or TLC\) and recent smoking or elevated carboxyhemoglobin before the test\./.test(interp), 'two tapped differentials make one sentence: ' + interp.slice(-220));
  ok(await page.locator('#differentials .dx[data-dx="dx.dlco_isolated.ild_early"]').getAttribute('aria-pressed') === 'true', 'tapped differential shows included');
  await page.locator('#differentials .dx[data-dx="study.hb"]').click(); await page.waitForTimeout(100);
  await page.locator('#differentials .dx[data-dx="study.hrct"]').click(); await page.waitForTimeout(100);
  const stTxt = await page.locator('#doc .interp').innerText();
  ok(/Suggest hemoglobin \(to adjust the DLCO\) and carboxyhemoglobin\. Suggest high-resolution CT of the chest\./.test(stTxt), 'tapped studies appear as Suggest sentences in the conclusion: ' + stTxt.slice(-200));
  const plainDx = await page.evaluate(() => document.getElementById('plain').textContent);
  ok(/CONCLUSION: [^\n]*Differential considerations for the isolated reduction in DLCO include[^\n]*Suggest hemoglobin/.test(plainDx) && !/ADDITIONAL STUDIES/.test(plainDx), 'copy-ready text carries the differential sentence and the suggestions inside the conclusion');
  ok(await page.locator('#suggest .sug[data-sug="dlco.isolated_differential"]').count() === 0 && await page.locator('#suggest .sug[data-sug="followup.hb"]').count() === 0, 'the generic catalog chips are withdrawn once an itemized differential or the hemoglobin study covers them');
  ok(await page.locator('#differentials .chip').innerText().then(t => /2 differentials, 2 studies included/.test(t)), 'summary chip counts both kinds: ' + await page.locator('#differentials .chip').innerText());
  await page.locator('#differentials [data-dx-none="dlco_isolated:dx"]').click(); await page.waitForTimeout(100);
  ok(await page.locator('#differentials .dx[data-dx^="dx."].on').count() === 0 && !/Differential considerations/.test(await page.locator('#doc .interp').innerText()), '"None" clears the differentials and the sentence leaves');
  await page.locator('#differentials [data-dx-all="dlco_isolated:study"]').click(); await page.waitForTimeout(100);
  ok(await G.locator('.dx[data-dx^="study."].on').count() === 6, '"All" selects every study of the finding');
  const stAll = await page.locator('#doc .interp').innerText();
  ok((stAll.match(/Suggest /g) || []).length === 6, 'six studies listed once each as Suggest sentences (the template\'s hemoglobin line yields to the tapped one): ' + stAll.slice(-300));
  ok(JSON.stringify(await page.evaluate(() => Object.keys(window.__pft.state.review).sort())) === JSON.stringify(['study.cpet', 'study.dlco_repeat', 'study.echo', 'study.hb', 'study.hrct', 'study.sixmwt']), 'selection is stored by id in the case state');
  // the attestation line closes the report when tapped
  await openCard(page, 'suggest');
  await page.locator('#suggest .sug[data-sug="local.attest"]').click(); await page.waitForTimeout(100);
  ok(/PFT interpretation was reviewed with the attending Pulmonologist identified as an additional signer to this note\.$/.test(await page.locator('#doc .interp .impr-p').innerText().then(t => t.trim())), 'attestation sentence closes the conclusion');
  await page.locator('#suggest .sug[data-sug="local.attest"]').click(); await page.waitForTimeout(100);
  // the live preview on an entry step notes the offer
  await page.evaluate(() => window.__pft.goto('dlco'));
  await page.waitForSelector('#pv .pv-sug');
  ok(/differentials and additional studies for 2 findings/.test(await page.locator('#pv .pv-sug').innerText()), 'preview points to the differentials on the Report step');
  await page.evaluate(() => { window.__pft.state.review = {}; window.__pft.goto('report'); });
  await page.waitForSelector('#differentials');
  await openCard(page, 'differentials');
  await page.screenshot({ path: 'shots/44_differentials.png', fullPage: true });

  // predicted 6MWD calculator on the 6MWT step (Enright & Sherrill 1998, as on MDCalc)
  await page.evaluate(() => { const S = window.PFT.defaultState(); Object.keys(S.tests).forEach(k => { S.tests[k] = false; }); S.tests.sixmw = true; S.sixmw.dist = '420'; window.__pft.load(S, 'sixmw'); });
  await page.waitForSelector('[data-es]');
  ok(await page.locator('[data-es]').getAttribute('data-es-state') === 'missing' && /Needs age, sex, height, weight/.test(await page.locator('[data-es] .es-body').innerText()), 'calculator names the missing demographics');
  await page.locator('[data-es-go]').click();
  await page.waitForSelector('[data-field="settings.band"]', { state: 'attached' });
  ok(await page.locator('#main label', { hasText: /^Height/ }).count() === 1, 'the link leads to the Details step');
  await page.evaluate(() => { const S = window.__pft.state; S.ctx.age = '65'; S.ctx.sex = 'M'; S.ctx.ht = '175'; S.ctx.wt = '80'; window.__pft.goto('sixmw'); });
  await page.waitForSelector('[data-es][data-es-state="calc"]');
  const esTiles = await page.locator('[data-es] .stat .sv').allInnerTexts();
  ok(esTiles.join('|') === '549 m|396 m|77%', 'predicted, LLN and % predicted tiles: ' + esTiles.join('|'));
  ok(/7\.57 × height/.test(await page.locator('[data-es] .es-body').innerText()) && /used in the report because no laboratory predicted value/.test(await page.locator('[data-es] .es-body').innerText()), 'equation and precedence note shown');
  ok(/Walked 420 m \(77% predicted; LLN 396 m\)\. Total distance within predicted normal range given sex, age, height and weight\./.test(await page.locator('#pv .sec[data-sec="six"]').innerText()), 'the preview reports the calculated reference');
  await page.screenshot({ path: 'shots/46_sixmw_calculator.png', fullPage: true });
  await page.evaluate(() => { const S = window.__pft.state; S.sixmw.pred = '500'; S.sixmw.eq = 'Enright & Sherrill 1998'; window.__pft.goto('sixmw'); });
  await page.waitForSelector('[data-es][data-es-state="lab"]');
  ok(/laboratory-reported predicted value entered below is used/.test(await page.locator('[data-es] .es-body').innerText()), 'a reported predicted value takes precedence');

  // composed section sentences
  await page.evaluate(() => { const S = window.PFT.defaultState(); Object.keys(S.tests).forEach(k => { S.tests[k] = false; }); S.tests.spiro = true; S.spiro.ratio = { c: 'wnl', z: '' }; S.spiro.fev1 = { c: 'wnl', z: '' }; S.spiro.fvc = { c: 'wnl', z: '' }; window.__pft.load(S, 'report'); });
  await page.waitForSelector('#doc');
  ok(await page.locator('#doc .sec[data-sec="spiro"] p').innerText() === 'Normal FVC, FEV1, and ratio.', 'normal spirometry in the template words');

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
