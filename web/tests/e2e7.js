// v7: the Learn areas (PFT interpretation · Anatomy & bronchoscopy), the bronchial-tree navigator and its drill, the nodal
// station map and quiz, the V/Q sandbox, the lidocaine running total, and the simplified prior-study columns.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = process.env.PFT_URL || ('file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(FILE); await page.waitForSelector('#top');
  const txt = async (sel) => (await page.locator(sel).first().textContent()) || '';

  // ---- areas
  await page.locator('.vw[data-view="learn"]').click(); await page.waitForSelector('.learn-body');
  ok(await page.locator('#learn-cat option').count() === 2, 'Learn offers two areas');
  ok(await page.locator('.learn-body').getAttribute('data-cat') === 'pft', 'PFT interpretation is the default area');
  const nPft = await page.locator('.ln-btn').count();
  ok(nPft >= 20, 'the PFT area keeps its topics (' + nPft + ')');
  await page.selectOption('#learn-cat', 'airway'); await page.waitForSelector('.learn-body[data-cat="airway"]');
  const anatTopics = await page.locator('.ln-btn').evaluateAll(els => els.map(e => e.getAttribute('data-topic')));
  ok(anatTopics.join() === 'airway,tree,stations,vq,bronch_basics,bronch_prep,sedation,antithrombotic,bal,sampling,icu,ebus', 'anatomy area lists its topics in order: ' + anatTopics.join());
  ok(await page.locator('.learn-body[data-topic="airway"] .an-lobes').count() === 1, 'the first anatomy topic shows the lobes figure');
  ok(/B7\+8 anteromedial basal/.test(await txt('.learn-body')), 'segment table present');
  // a learn link from a test (the Interpret page) still lands in the PFT area
  await page.evaluate(() => window.__pft.openLearn('loops'));
  await page.waitForSelector('.learn-body[data-topic="loops"]');
  ok(await page.locator('.learn-body').getAttribute('data-cat') === 'pft' && await page.locator('#learn-cat').inputValue() === 'pft', 'openLearn picks the area of the topic');

  // ---- bronchial tree navigator
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'tree' })); await page.waitForSelector('.an-tree');
  ok(await page.locator('.an-tree').getAttribute('data-at') === 'trachea', 'starts in the trachea');
  ok(await page.locator('.an-scope [data-open]').count() === 2, 'from the trachea the scope sees two openings');
  ok(/anterior/i.test(await txt('.an-scope')) && /posterior/i.test(await txt('.an-scope')), 'compass on the scope view');
  await page.locator('.an-scope [data-open="rmb"]').click(); await page.waitForSelector('.an-tree[data-at="rmb"]');
  ok(/Right main bronchus/.test(await txt('.an-notes .an-name')) && /tracheal bronchus/i.test(await txt('.an-notes')), 'right main bronchus notes with its pitfall');
  await page.locator('.an-scope [data-open="bi"]').click(); await page.waitForSelector('.an-tree[data-at="bi"]');
  ok(await page.locator('.an-crumbs b').textContent() === 'Bronchus intermedius' && await page.locator('.an-crumbs [data-crumb]').count() === 3, 'breadcrumb shows the path');
  await page.locator('[data-tree-go="rml"]').click(); await page.waitForSelector('.an-tree[data-at="rml"]');
  ok(/RML/.test(await txt('.an-notes .an-name')) && await page.locator('.an-scope [data-open]').count() === 2, 'middle lobe: two segmental openings');
  await page.locator('[data-tree-back]').click(); await page.waitForSelector('.an-tree[data-at="bi"]');
  await page.locator('.an-map [data-node="lb10"]').click(); await page.waitForSelector('.an-tree[data-at="lb10"]');
  ok(await page.locator('.an-scope [data-open]').count() === 0 && /subsegmental/.test(await txt('.an-scope')), 'a segment is the end of the navigable tree');
  ok(await page.locator('.an-map .an-node.on').count() === 5, 'the path larynx → trachea → LMB → LLL → B10 is highlighted on the map');
  await page.locator('[data-crumb="trachea"]').click(); await page.waitForSelector('.an-tree[data-at="trachea"]');
  const before = await page.locator('.an-scope [data-open="rmb"] ellipse').first().getAttribute('cx');
  await page.locator('[data-mirror]').check(); await page.waitForTimeout(60);
  const after = await page.locator('.an-scope [data-open="rmb"] ellipse').first().getAttribute('cx');
  ok(Math.abs((+before) + (+after) - 200) < 0.5 && (+before) > 100 && (+after) < 100, 'mirror flips the right main bronchus to the other side (' + before + ' → ' + after + ')');
  await page.locator('[data-mirror]').uncheck();
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('pft.anat.mirror.v1'))) === false, 'mirror preference stored');
  // the drill: labels hidden, moves counted, shortest route recognised
  await page.locator('[data-drill-start]').click(); await page.waitForSelector('.an-drill[data-drill="on"]');
  ok(await page.locator('.an-tree').getAttribute('data-at') === 'trachea' && await page.locator('.an-scope .an-ol').count() === 0 && await page.locator('.an-map .an-bl').count() === 0, 'drill starts at the trachea with the labels hidden');
  const target = await page.evaluate(() => { const t = document.querySelector('.an-drill b').textContent; return Object.keys(window.PFT_ANAT.TREE).filter(k => t.indexOf(window.PFT_ANAT.TREE[k].name) === 0)[0]; });
  const route = await page.evaluate((t) => { const T = window.PFT_ANAT.TREE, out = []; let k = t; while (k && k !== 'trachea') { out.unshift(k); k = T[k].parent; } return out; }, target);
  ok(!!target && route.length >= 2, 'drill names a target below the main bronchi: ' + target + ' via ' + route.join(' > '));
  for (const k of route) { await page.locator('[data-tree-go="' + k + '"]').click(); await page.waitForSelector('.an-tree[data-at="' + k + '"]'); }
  ok(await page.locator('.an-drill[data-drill="done"]').count() === 1 && /shortest route/.test(await txt('.an-found')), 'reaching the target by the shortest route is recognised: ' + await txt('.an-found'));
  await page.locator('[data-drill-stop]').click(); await page.waitForTimeout(60);
  ok(await page.locator('.an-scope .an-ol').count() >= 1, 'labels return when the drill stops');

  // ---- nodal stations
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'stations' })); await page.waitForSelector('.an-stations');
  ok(await page.locator('.an-smap .an-st').count() >= 19, 'the map draws every station marker (' + await page.locator('.an-smap .an-st').count() + ')');
  await page.locator('.an-smap [data-station="7"]').click(); await page.waitForSelector('[data-station-card="7"]');
  const card = await txt('.an-stcard');
  ok(/Station 7 — Subcarinal/.test(card) && /bronchus intermedius on the right/.test(card) && /✓ EBUS-TBNA/.test(card) && /✓ EUS/.test(card), 'station 7 card: borders and reach');
  await page.locator('.an-smap [data-station="5"]').click(); await page.waitForSelector('[data-station-card="5"]');
  ok(/✗ EBUS-TBNA/.test(await txt('.an-stcard')) && /Chamberlain/.test(await txt('.an-stcard')), 'station 5 is out of EBUS reach, Chamberlain or VATS');
  ok(/N2a/.test(await txt('.learn-body')) && /N3 → N2 → N1/.test(await txt('.learn-body')), 'N staging and the sampling order are taught');
  await page.locator('[data-stq-start]').click(); await page.waitForSelector('.an-drill[data-stq="on"]');
  const q = await page.evaluate(() => { const t = document.querySelector('.an-drill b').textContent; return window.PFT_ANAT.STATIONS.filter(s => t.indexOf(s.name) === 0)[0].id; });
  const wrong = q === '7' ? '4R' : '7';
  await page.locator('.an-smap [data-station="' + wrong + '"]').first().click(); await page.waitForTimeout(60);
  ok(/That is station/.test(await txt('.an-drill')), 'a wrong tap is named');
  await page.locator('.an-smap [data-station="' + q + '"]').first().click(); await page.waitForSelector('.an-drill[data-stq="done"]');
  ok(/Correct — station/.test(await txt('.an-found')) && /score 1/.test(await txt('.an-drill')), 'the right station scores');

  // ---- V/Q sandbox
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'vq' })); await page.waitForSelector('.an-vq');
  const setVQ = async (v) => { await page.locator('[data-vq]').evaluate((el, vv) => { el.value = String(vv); el.dispatchEvent(new Event('input', { bubbles: true })); }, v); await page.waitForTimeout(40); };
  await setVQ(0);
  ok(/shunt/.test(await txt('[data-vq-r]')) && /^40 mm Hg/.test(await txt('[data-vq-po2]')), 'V/Q 0 is shunt with mixed-venous gas');
  await page.locator('[data-fio2="1"]').click(); await page.waitForTimeout(40);
  ok(/^40 mm Hg/.test(await txt('[data-vq-po2]')) && /cannot reach it/.test(await txt('.an-verdict')), 'a shunt does not respond to 100% oxygen');
  await setVQ(20);
  const lowO2 = parseInt(await txt('[data-vq-po2]'), 10);
  await page.locator('[data-fio2="0.21"]').click(); await page.waitForTimeout(40);
  const lowAir = parseInt(await txt('[data-vq-po2]'), 10);
  ok(lowAir < 70 && lowO2 > 300, 'a low-V/Q unit is hypoxic on air (' + lowAir + ') and corrects on oxygen (' + lowO2 + ')');
  await setVQ(100);
  ok(/dead space/.test(await txt('[data-vq-r]')) && /^150 mm Hg/.test(await txt('[data-vq-po2]')), 'V/Q ∞ is dead space at inspired gas');
  await setVQ(50);
  const mid = parseInt(await txt('[data-vq-po2]'), 10);
  ok(mid >= 95 && mid <= 112, 'V/Q ≈ 1 gives the familiar alveolar PO2 (' + mid + ')');
  ok(await page.locator('.an-zones').count() === 1 && /Zone 2/.test(await txt('.an-zones')), 'West zones figure');

  // ---- lidocaine running total
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'sedation' })); await page.waitForSelector('.an-lido');
  await page.locator('[data-lido-wt]').fill('70');
  await page.locator('[data-lido-add="2"]').click(); await page.locator('[data-lido-add="3"]').click();
  for (let i = 0; i < 4; i++) await page.locator('[data-lido-add="1"]').click();
  ok(await txt('[data-lido-total]') === '380 mg' && await txt('[data-lido-perkg]') === '5.4 mg/kg' && await page.locator('.an-lbar.ok').count() === 1, 'gargle + atomiser + four syringes = 380 mg, 5.4 mg/kg');
  for (let i = 0; i < 6; i++) await page.locator('[data-lido-add="0"]').click();
  ok(await txt('[data-lido-total]') === '500 mg' && await page.locator('.an-lbar.warn').count() === 1, 'past 7 mg/kg the bar warns (' + await txt('[data-lido-perkg]') + ')');
  ok(/= 490 mg/.test(await txt('.an-lims')) && /= 560 mg/.test(await txt('.an-lims')), 'the limits are shown in milligrams for this weight');
  ok(/25 µg fentanyl with 1 mg midazolam/.test(await txt('.learn-body')) && /Flumazenil/.test(await txt('.learn-body')), 'sedation doses and reversal present');

  // ---- bronchoscopy text topics carry their key numbers
  for (const [t, re] of [['antithrombotic', /clopidogrel.*7 days|Stop 5 days before/i], ['bal', /30 mL of saline three or four times/], ['bronch_basics', /1–6%/], ['icu', /blind catheter aspirate/], ['ebus', /N3 first, then N2, then N1/], ['sampling', /five or six transbronchial/]]) {
    await page.evaluate((tt) => window.__pft.setMode('learn', { topic: tt }), t); await page.waitForSelector('.learn-body[data-topic="' + t + '"]');
    ok(re.test(await txt('.learn-body')), 'topic ' + t + ' present with its content');
  }

  // ---- prior columns: one box per earlier study, dates as chips, clean with four priors
  await page.evaluate(() => { const b = document.getElementById('new-case'); b.click(); b.click(); }); await page.waitForSelector('#top');
  await page.selectOption('#qs', { label: 'Full PFT' });
  await page.locator('[data-field="ctx.date"] input').fill('2025-03-05');
  await page.locator('[data-cell="spiro.fev1_abs"] input').fill('1.55');
  await page.locator('[data-prior-add="spiro"]').click();
  ok(await page.locator('[data-cell="prior.fev1"]').count() === 1 && await page.locator('[data-cell="prior.fev1_pct"]').count() === 0 && await page.locator('[data-cell="prior.dlco_pct"]').count() === 0, 'one value box per prior study, no % predicted boxes');
  ok(await page.locator('[data-prior-hd="1"]').count() >= 1 && /no date/.test(await txt('[data-prior-hd="1"]')), 'the column header carries the date slot');
  await page.locator('[data-prior-dates="spiro"] .qd .lnk', { hasText: '1 yr' }).first().click();
  ok(/3\/5\/2024/.test(await txt('[data-prior-hd="1"]')), 'the date appears in the column header');
  await page.locator('[data-cell="prior.fev1"] input').first().fill('1.85');
  for (let i = 0; i < 3; i++) await page.locator('[data-prior-add="spiro"]').click();
  ok(await page.locator('[data-cell="prior.fev1"]').count() === 4 && await page.locator('[data-prior-dates="spiro"] .pr-head').count() === 5, 'four prior columns');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'no horizontal overflow with four priors');
  const chipsTop = await page.locator('[data-prior-dates="spiro"] .pr-head').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)));
  ok(chipsTop.every(t => t === chipsTop[0]), 'the five date chips sit on one line at 1360 px');
  ok(/Since the prior study \(Mar 2024\), significant decline in FEV1 \(-16%\)/.test(await page.evaluate(() => window.__pft.result.text)), 'percent change and significance from the two absolute values, inside SPIROMETRY at the minimal level: ' + await page.evaluate(() => window.__pft.result.text));

  // ---- minimal wording (the default): findings only, serial change inside the section, no numbers line
  await page.locator('[data-field="spiro.ratio"] .sg[data-v="low"]').click();
  await page.locator('[data-field="spiro.fev1"] .sg[data-v="mod"]').click(); await page.locator('[data-field="spiro.fvc"] .sg[data-v="mod"]').click();
  await page.locator('[data-cell="spiro.fvc_abs"] input').fill('2.00');
  await page.locator('input[data-bd-toggle]').check(); await page.locator('[data-cell="bd.fev1_post"] input').fill('2.00'); await page.locator('[data-cell="bd.fvc_post"] input').fill('2.20');
  await page.locator('[data-cell="spiro.fev1_pct"] input').fill('70'); await page.locator('[data-cell="spiro.fvc_pct"] input').fill('70');
  await page.locator('[data-field="vol.tlc"] .sg[data-v="high"]').click(); await page.locator('[data-field="vol.rvtlc"] .sg[data-v="high"]').click();
  await page.locator('[data-field="dlco.dlco"] .sg[data-v="mod"]').click(); await page.locator('[data-field="dlco.basis"] .ch[data-v="un"]').click();
  await page.waitForTimeout(80);
  const minText = await page.evaluate(() => window.__pft.result.text);
  ok(/^SPIROMETRY: FEV1\/FVC below the LLN with moderate reduction in FEV1 and FVC\. (FEV1\/FVC below the LLN although above 0\.70\. )?Significant bronchodilator response in FEV1 \(\+\d+% of predicted; ERS\/ATS 2022\)\. Since the prior study \(Mar 2024\), significant decline in FEV1 \(-16%\)/.test(minText), 'minimal spirometry: pattern, bronchodilator verdict, change since the prior study: ' + minText.split('\n')[0]);
  ok(/LUNG VOLUMES: Hyperinflation \(TLC above the ULN\) with air trapping \(RV\/TLC above the ULN\)\./.test(minText) && /DIFFUSING CAPACITY: Moderately reduced \(not corrected for hemoglobin\)\./.test(minText), 'minimal volumes and DLCO sections');
  ok(!/PAST TESTING COMPARISON/.test(minText) && !/1\.55 L, 70%/.test(minText) && !/→/.test(minText), 'no past-testing section, no numbers line, no arrows');
  ok(/INTERPRETATION: Moderate obstructive defect with hyperinflation and air trapping and a significant bronchodilator response\. Diffusing capacity moderately impaired, which can be seen in emphysema, pulmonary vascular disease, anemia, or smoking before the study\.$/.test(minText), 'minimal interpretation: ' + minText.split('INTERPRETATION: ')[1]);
  ok(await page.locator('#pv .sec').count() === 3 && await page.locator('#pv .sec[data-sec="prior"]').count() === 0, 'the report column shows the minimal sections');
  // the wording toggle: standard brings the numbers line and the past-testing section back; the choice is remembered
  await page.locator('details[data-group="settings"]').evaluate(e => { e.open = true; });
  ok(await page.locator('[data-field="settings.wording"] .ch[aria-checked="true"]').getAttribute('data-v') === 'min', 'minimal is the default wording');
  await page.locator('[data-field="settings.wording"] .ch[data-v="std"]').click(); await page.waitForTimeout(80);
  const stdText = await page.evaluate(() => window.__pft.result.text);
  ok(/SPIROMETRY: FEV1 1\.55 L, 70% predicted/.test(stdText) && /PAST TESTING COMPARISON: Since last testing \(3\/5\/2024, 1 year earlier\): FEV1 -16% \(-300 mL, 1\.85 to 1\.55 L\)/.test(stdText) && /After bronchodilator: FEV1 1\.55 to 2\.00 L/.test(stdText), 'standard wording: numbers, "to" instead of arrows, past testing in its own section: ' + stdText.slice(0, 200));
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('pft.wording.v1'))) === 'std', 'the wording choice is remembered');
  await page.locator('[data-field="settings.wording"] .ch[data-v="full"]').click(); await page.waitForTimeout(80);
  ok(/^PULMONARY FUNCTION TEST REPORT/.test(await page.evaluate(() => window.__pft.result.text)), 'detailed wording adds the header');
  await page.locator('[data-field="settings.wording"] .ch[data-v="min"]').click(); await page.waitForTimeout(80);
  ok((await page.evaluate(() => window.__pft.result.text)) === minText, 'back to minimal');
  // the study date sits above the age box, top left
  const dateB = await page.locator('[data-field="ctx.date"]').boundingBox(), ageB = await page.locator('[data-field="ctx.age"]').boundingBox();
  ok(dateB.y + dateB.height <= ageB.y + 1 && Math.abs(dateB.x - ageB.x) < 2, 'the study date is above the age box, aligned left');

  // ---- phone: the widgets fit
  await ctx.close();
  const m = await browser.newContext({ viewport: { width: 400, height: 800 }, hasTouch: true, isMobile: true });
  const mp = await m.newPage(); await mp.goto(FILE); await mp.waitForSelector('#top');
  for (const t of ['tree', 'stations', 'vq', 'sedation', 'airway']) {
    await mp.evaluate((tt) => window.__pft.setMode('learn', { topic: tt }), t); await mp.waitForSelector('.learn-body[data-topic="' + t + '"]');
    ok(await mp.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'phone: no horizontal overflow on ' + t);
  }
  ok(await mp.locator('#learn-cat').isVisible(), 'phone: the area dropdown stays visible');
  await m.close();

  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await browser.close();
  console.log('e2e7 passed ' + pass + ' failed ' + fail);
  process.exit(fail ? 1 : 0);
})();
