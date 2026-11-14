// v7: the Learn areas (PFT interpretation · Anatomy & bronchoscopy), the bronchial-tree navigator and its drill, the nodal
// station map and quiz, the V/Q sandbox, the lidocaine running total, and the simplified prior-study columns.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = process.env.PFT_URL || ('file://' + path.join(__dirname, '..', 'dist', 'PulmCritDaddy_standalone.html'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const uniqN = (a) => a.filter((x, i) => a.indexOf(x) === i).length;
const near = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(FILE); await page.waitForSelector('[data-home]'); await page.evaluate(() => window.__pft.setMode('case')); await page.waitForSelector('#top');
  const txt = async (sel) => (await page.locator(sel).first().textContent()) || '';

  // ---- areas
  await page.locator('.vw[data-view="learn"]').click(); await page.waitForSelector('.learn-body');
  ok(await page.locator('#learn-cat option').count() === 11, 'Learn offers eleven areas');
  ok(await page.locator('.learn-body').getAttribute('data-cat') === 'pft', 'PFT interpretation is the default area');
  const nPft = await page.locator('.ln-btn').count();
  ok(nPft >= 20, 'the PFT area keeps its topics (' + nPft + ')');
  await page.selectOption('#learn-cat', 'airway'); await page.waitForSelector('.learn-body[data-cat="airway"]');
  const anatTopics = await page.locator('.ln-btn').evaluateAll(els => els.map(e => e.getAttribute('data-topic')));
  ok(anatTopics.join() === 'start,lunganat,histo,airway,tree,ct,stations,mechanics,airflow,ventilation,diffusion,vq,transport,control,heartlung,bronch_basics,bronch_prep,sedation,antithrombotic,bal,sampling,icu,ebus', 'the area runs anatomy → physiology → bronchoscopy, with a start page: ' + anatTopics.join());
  ok((await page.locator('#learn-cat option').allInnerTexts()).some(t => /Anatomy, physiology & bronchoscopy/.test(t)) && (await page.locator('#learn-nav').innerText()).indexOf('PHYSIOLOGY') > 0, 'the area is named for its three parts and the navigation shows the groups');
  // ---- the start page: a syllabus of the area; its links open the topics
  ok(await page.locator('.learn-body[data-topic="start"] [data-syllabus]').count() === 1 && await page.locator('[data-syllabus] [data-syl]').count() === 22, 'the start page lists every topic of the area as a link (' + await page.locator('[data-syllabus] [data-syl]').count() + ')');
  await page.locator('[data-syl="histo"]').click(); await page.waitForSelector('.learn-body[data-topic="histo"]');
  // ---- the airway wall ladder: seven levels, cells on hover, labels that hide, a quiz
  const ldNames = async () => page.locator('.an-ladder .ld-name').evaluateAll(els => els.map(e => e.textContent));
  ok(await page.locator('.an-ladder .ld-row').count() === 7 && (await ldNames()).join('|') === 'Trachea|Main, lobar and segmental bronchi|Bronchioles|Terminal bronchioles|Respiratory bronchioles|Alveolar ducts and sacs|Alveoli', 'the ladder: seven levels from the trachea to the alveoli: ' + (await ldNames()).join('|'));
  ok(await page.locator('.an-ladder .ld-row.cond').count() === 4 && await page.locator('.an-ladder .ld-row.resp').count() === 3 && await page.locator('.an-ladder .ld-cart').count() >= 8 && await page.locator('.an-ladder .ld-cell.goblet').count() === 4 && await page.locator('.an-ladder .ld-cell.club').count() >= 6 && await page.locator('.an-ladder .ld-cell.t2').count() >= 3, 'four conducting and three respiratory levels; cartilage in the first two, goblet cells there only, club cells from the bronchioles, type II cells at the alveoli');
  await page.locator('.an-ladder .ld-row[data-level="bronchioles"]').click(); await page.waitForSelector('[data-level-detail="bronchioles"]');
  ok(/club \(Clara\) cell/i.test(await txt('[data-level-detail]')) && /No cartilage, no glands/.test(await txt('[data-level-detail]')) && /cytochrome P-450/.test(await txt('[data-level-detail]')), 'tapping the bronchioles names the club cell, the missing cartilage, the P-450');
  ok(/Kartagener/.test(await txt('.learn-body')) && /Reid index/.test(await txt('.learn-body')) && /mucociliary escalator/.test(await txt('.learn-body')), 'the cell table carries the pearls');
  await page.locator('[data-ladder-labels]').uncheck(); await page.waitForTimeout(80);
  ok((await ldNames()).every(t => t === '?'), 'labels off: the names are hidden');
  await page.locator('[data-ladder-labels]').check(); await page.waitForTimeout(80);
  await page.locator('[data-ldq-start]').click(); await page.waitForSelector('[data-ldq="on"]');
  const ldQ = await page.evaluate(() => document.querySelector('.an-drill b').textContent);
  const ldAns = await page.evaluate((q) => { const L = [['cartilage in its wall', 'bronchi'], ['goblet cells and glands', 'bronchi'], ['first level with club', 'bronchioles'], ['end of the conducting zone', 'terminal'], ['first level where gas', 'respiratory'], ['cilia stop', 'respiratory'], ['most of the resistance', 'bronchi'], ['type II', 'alveoli'], ['simple cuboidal', 'terminal'], ['C-shaped', 'trachea'], ['Centrilobular', 'respiratory'], ['Corridors', 'ducts']]; return (L.filter(x => q.indexOf(x[0]) >= 0)[0] || [])[1]; }, ldQ);
  ok(!!ldAns, 'the ladder quiz asks a question with a known level: ' + ldQ);
  const ldWrong = ldAns === 'trachea' ? 'alveoli' : 'trachea';
  await page.locator('.an-ladder .ld-row[data-level="' + ldWrong + '"]').click(); await page.waitForTimeout(80);
  ok(/Try again/.test(await txt('.an-drill')), 'a wrong level is named');
  await page.locator('.an-ladder .ld-row[data-level="' + ldAns + '"]').click(); await page.waitForSelector('[data-ldq="done"]');
  ok(/Correct/.test(await txt('.an-found')), 'the right level scores');
  await page.locator('[data-ldq-stop]').click(); await page.waitForTimeout(60);
  // ---- gross anatomy, mechanics, airflow, ventilation, diffusion, transport, control: the figures and a pearl from each
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'lunganat' })); await page.waitForSelector('.learn-body[data-topic="lunganat"]');
  ok(await page.locator('.learn-body .an-lobes').count() === 1 && /RALS/.test(await txt('.learn-body')) && /caval hiatus at T8/.test(await txt('.learn-body')) && /Bronchial circulation/.test(await txt('.learn-body')), 'gross anatomy: the lobe map, RALS, the diaphragm openings, the two circulations');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'mechanics' })); await page.waitForSelector('.learn-body[data-topic="mechanics"]');
  ok(await page.locator('[data-cycle] .ph-tr').count() === 4 && /Laplace/.test(await txt('.learn-body')) && /ΔPpl ≈ Paw × CL\/\(CL \+ Ccw\)/.test(await txt('.learn-body')), 'mechanics: the four traces of a breath, Laplace, the share of airway pressure reaching the pleura');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'airflow' })); await page.waitForSelector('.learn-body[data-topic="airflow"]');
  ok(/equal pressure point/.test(await txt('.learn-body')) && /heliox/.test(await txt('.learn-body')) && /time constant/.test(await txt('.learn-body')), 'airflow: the equal pressure point, heliox, time constants');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'ventilation' })); await page.waitForSelector('.learn-body[data-topic="ventilation"]');
  ok(await page.locator('[data-spiro] [data-vol]').count() === 8, 'the spirogram carries the four volumes and the four capacities');
  await page.locator('[data-spiro] [data-vol="FRC"]').hover(); await page.waitForTimeout(60);
  ok(/Functional residual capacity = ERV \+ RV/.test(await txt('[data-spiro-note]')), 'hovering FRC explains it');
  await page.locator('[data-aa="paco2"]').fill('80'); await page.locator('[data-aa="pao2"]').fill('45'); await page.waitForTimeout(60);
  ok(/A–a.*5 mm Hg/.test(await txt('[data-aa-out]')) && /normal gradient: hypoventilation/.test(await txt('[data-aa-read]')), 'the A–a calculator: PaCO2 80 with PaO2 45 is hypoventilation with a normal gradient: ' + await txt('[data-aa-val]'));
  await page.locator('[data-aa="paco2"]').fill('30'); await page.locator('[data-aa="pao2"]').fill('55'); await page.waitForTimeout(60);
  ok(/wide gradient/.test(await txt('[data-aa-read]')) && /A–a.*5[5-9] mm Hg/.test(await txt('[data-aa-out]')), 'PaCO2 30 with PaO2 55: a wide gradient, the lung is the problem: ' + await txt('[data-aa-val]'));
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'diffusion' })); await page.waitForSelector('.learn-body[data-topic="diffusion"]');
  ok(/perfusion-limited/.test(await txt('.learn-body')) && /KCO = DLCO\/VA/.test(await txt('.learn-body')), 'diffusion: perfusion- and diffusion-limited gases, the KCO');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'transport' })); await page.waitForSelector('.learn-body[data-topic="transport"]');
  ok(/26\.8 mm Hg/.test(await txt('[data-odc-p50]')) && /96\.\d%/.test(await txt('[data-odc-sa]')) && /19\.\d mL\/dL/.test(await txt('[data-odc-ca]')), 'the dissociation curve lab starts normal: P50 26.8, SaO2 97%, content 20 mL/dL: ' + await txt('[data-odc-read]'));
  await page.locator('[data-odc="ph"]').fill('7.2'); await page.waitForTimeout(60);
  ok(/3[0-9]\.\d mm Hg/.test(await txt('[data-odc-p50]')) && /right shift/.test(await txt('[data-odc-read]')), 'acidosis shifts the curve right (Bohr): ' + await txt('[data-odc-p50]'));
  await page.locator('[data-odc="ph"]').fill('7.4'); await page.locator('[data-odc="cohb"]').fill('40'); await page.waitForTimeout(60);
  ok(/left shift/.test(await txt('[data-odc-read]')) && /1[0-2]\.\d mL\/dL/.test(await txt('[data-odc-ca]')) && /40% of the haemoglobin carries CO/.test(await txt('[data-odc-read]')), 'carbon monoxide: a left shift and a content cut like anaemia: ' + await txt('[data-odc-ca]'));
  await page.locator('[data-odc-reset]').click(); await page.waitForTimeout(100);
  ok(/26\.8/.test(await txt('[data-odc-p50]')) && /Haldane/.test(await txt('.learn-body')) && /chloride shift/.test(await txt('.learn-body')), 'reset restores the curve; CO2 transport is taught with the Haldane effect');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'control' })); await page.waitForSelector('.learn-body[data-topic="control"]');
  ok(/pre-Bötzinger/.test(await txt('.learn-body')) && /Carotid bodies/.test(await txt('.learn-body')) && /Cheyne–Stokes/.test(await txt('.learn-body')), 'control: the generator, the carotid bodies, the patterns');
  // ---- the heart–lung lab: the Campbell and Guyton diagrams joined, presets, the ventilator
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'heartlung' })); await page.waitForSelector('[data-hl]');
  await page.waitForTimeout(400);
  ok(await page.locator('.hl-camp .hl-lung').count() === 1 && await page.locator('.hl-camp .hl-cw').count() === 1 && await page.locator('.hl-camp .hl-loop').count() >= 1 && await page.locator('.hl-guy .hl-vr:not(.ghost)').count() === 1 && await page.locator('.hl-guy .hl-cf:not(.ghost)').count() === 1 && await page.locator('.hl-guy .hl-op').count() === 1, 'the two diagrams: lung and chest wall curves with the loop; venous return and cardiac function with the operating point');
  const reads = async () => (await txt('[data-hl-reads]')).replace(/\n/g, ' ');
  ok(/FRC\s*3[5-9]% VC/.test(await reads()) && /Auto-PEEP\s*0\.\d cm H2O/.test(await reads()) && /Cardiac output\s*[45]\.\d+ → 5\.\d+ L\/min/.test(await reads()), 'at rest: FRC in the high thirties, no auto-PEEP, output about 5 L/min: ' + (await reads()).slice(0, 160));
  await page.locator('[data-hl-play]').click(); await page.waitForTimeout(100);
  ok(/Play/.test(await txt('[data-hl-play]')), 'the breath can be paused');
  await page.selectOption('[data-hl-preset]', 'copd'); await page.waitForSelector('[data-hl] .hl-vee:not([hidden])', { state: 'attached' });
  ok(/Auto-PEEP\s*[1-4]\.\d cm H2O/.test(await reads()) && /hyperinflated by \d+ mL/.test(await reads()) && await page.locator('[data-hl="raw"]').inputValue() === '14', 'COPD preset: resistance 14, dynamic hyperinflation with auto-PEEP: ' + (await reads()).slice(0, 220));
  await page.selectOption('[data-hl-preset]', 'ards'); await page.waitForSelector('[data-hl-mode="vent"][aria-checked="true"]'); await page.waitForTimeout(150);
  ok(await page.locator('.hl-camp .hl-rs:not([hidden])').count() === 1 && await page.locator('.hl-camp .hl-loop.aw:not([hidden])').count() === 1 && /Plateau pressure\s*1[5-9]\.\d cm H2O/.test(await reads()) && /held above FRC by \d+ mL \(PEEP\)/.test(await reads()), 'ARDS on the ventilator: the respiratory-system curve and the airway loop appear, a plateau in the high teens, PEEP holds the lung above FRC: ' + (await reads()).slice(0, 260));
  await page.locator('[data-hl="peep"]').fill('16'); await page.waitForTimeout(100);
  ok(/Right atrial pressure, end-expiration → end-inspiration\s*[4-9]\.\d → /.test(await reads()), 'more PEEP raises the right atrial pressure: ' + (await reads()).match(/Right atrial pressure[^|]*?mm Hg/)[0]);
  await page.locator('[data-hl-mode="spont"]').click(); await page.waitForSelector('[data-hl-mode="spont"][aria-checked="true"]');
  await page.selectOption('[data-hl-preset]', 'hypo'); await page.waitForTimeout(150);
  ok(/Mean systemic pressure \/ collapse pressure\s*5\.[5-9]/.test(await reads()) && /Cardiac output\s*[34]\.\d+ → /.test(await reads()), 'hypovolaemia: a low mean systemic pressure and a low output: ' + (await reads()).match(/Cardiac output[^|]*/)[0].slice(0, 80));
  await page.selectOption('[data-hl-preset]', 'normal'); await page.waitForTimeout(100);
  ok(/Pulmonary hypertension/.test(await txt('.learn-body')) && /Starling resistor/.test(await txt('.learn-body')) && /Kenny JE/.test(await txt('.learn-body')), 'the lab is explained and credited');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'airway' })); await page.waitForSelector('.learn-body[data-topic="airway"]');
  ok(await page.locator('.learn-body[data-topic="airway"] .an-lobes').count() === 1, 'the lobes topic keeps its figure');
  ok(/B7\+8 anteromedial basal/.test(await txt('.learn-body')), 'segment table present');
  // a learn link from a test (the Interpret page) still lands in the PFT area
  await page.evaluate(() => window.__pft.openLearn('loops'));
  await page.waitForSelector('.learn-body[data-topic="loops"]');
  ok(await page.locator('.learn-body').getAttribute('data-cat') === 'pft' && await page.locator('#learn-cat').inputValue() === 'pft', 'openLearn picks the area of the topic');

  // ---- the category chips: one size, aligned in columns across the rows of a section
  await page.evaluate(() => window.__pft.setMode('interpret')); await page.waitForSelector('details.tsec[data-mod="spiro"]');
  const chips = await page.locator('details.tsec[data-mod="spiro"] [data-grid="spiro"] .ix:visible .sg').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return { v: e.getAttribute('data-v'), x: Math.round(r.x), w: Math.round(r.width), row: e.closest('.ix').getAttribute('data-field') }; }));
  const widths = chips.map(c => c.w);
  ok(chips.length === 15 && Math.max.apply(null, widths) - Math.min.apply(null, widths) <= 1, 'every category chip of spirometry has the same width: ' + widths.join(','));
  const xs = (v) => chips.filter(c => c.v === v).map(c => c.x);
  ok(xs('wnl').length === 3 && xs('wnl').every(x => x === xs('wnl')[0]) && xs('high').length === 2 && xs('high').every(x => x === xs('high')[0]) && xs('low')[0] === xs('mild')[0], 'WNL under WNL, Low under Mild, High under High: the columns line up across FEV1/FVC, FEV1 and FVC');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'tree' }));

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
  // the ring of structures around the airway: on by default, flips with the mirror, two levels in the trachea
  ok(await page.locator('[data-landmarks]').isChecked() && await page.locator('.an-ring-fold[open] .an-scope .an-land[data-land="trachea_upper"]').count() === 1, 'landmarks around the airway are shown by default, in the atlas ring under the simulator; at the top of the trachea it is the upper ring');
  await page.locator('[data-level="lower"]').click(); await page.waitForTimeout(60);
  ok(await page.locator('.an-land[data-land="trachea"]').count() === 1 && /9\.5 cm into the trachea/.test(await txt('[data-3d-depth]')), 'the lower level takes the scope down to just above the carina: ' + await txt('[data-3d-depth]'));
  const lm = await page.locator('.an-land .an-lm').evaluateAll(els => els.map(e => e.getAttribute('data-lm')));
  ok(['SVC', 'azygos arch', 'aortic arch', 'oesophagus', '4R', '4L', '7'].every(x => lm.indexOf(x) >= 0), 'lower trachea: SVC, azygos, aortic arch, oesophagus, 4R, 4L and 7 around the lumen: ' + lm.join(', '));
  ok(await page.locator('.an-land .an-lm.a').count() >= 3 && await page.locator('.an-land .an-lm.v').count() >= 2 && await page.locator('.an-land .an-lm.n').count() >= 4 && await page.locator('[data-land-legend]').count() === 1, 'arteries, veins and nodes are drawn in their own colours with a legend');
  const svcX = async () => +(await page.locator('.an-land [data-lm="SVC"] ellipse').first().getAttribute('cx'));
  const s1 = await svcX(); await page.locator('[data-mirror]').check(); await page.waitForTimeout(60); const s2 = await svcX(); await page.locator('[data-mirror]').uncheck(); await page.waitForTimeout(60);
  ok(s1 > 100 && s2 < 100 && Math.abs(s1 + s2 - 200) < 0.5, 'the SVC sits on the patient\'s right and flips with the mirror (' + s1 + ' → ' + s2 + ')');
  ok(/4R.*anterior-right wall/i.test(await page.locator('.an-land [data-lm="4R"] title').textContent()), 'each structure carries a note');
  await page.locator('[data-level="upper"]').click(); await page.waitForTimeout(60);
  const up = await page.locator('.an-land .an-lm').evaluateAll(els => els.map(e => e.getAttribute('data-lm')));
  ok(await page.locator('.an-land[data-land="trachea_upper"]').count() === 1 && ['brachiocephalic a.', 'L brachiocephalic v.', 'L subclavian a.', '2R', '2L'].every(x => up.indexOf(x) >= 0) && up.indexOf('4R') < 0 && /3\.0 cm into the trachea/.test(await txt('[data-3d-depth]')), 'upper trachea: arch vessels, 2R and 2L; the scope moves up: ' + up.join(', '));
  await page.locator('[data-level="lower"]').click(); await page.waitForTimeout(60);
  const vb0 = await page.locator('.an-scope').getAttribute('viewBox');
  await page.locator('[data-landmarks]').uncheck(); await page.waitForTimeout(60);
  ok(await page.locator('.an-land').count() === 0 && await page.locator('.an-scope').getAttribute('viewBox') === '0 0 200 200' && vb0 !== '0 0 200 200' && await page.evaluate(() => JSON.parse(localStorage.getItem('pft.anat.land.v1'))) === false, 'landmarks switch off (the picture closes back in); preference stored');
  await page.locator('[data-landmarks]').check(); await page.waitForTimeout(60);
  await page.locator('.an-scope [data-open="rmb"]').click(); await page.waitForSelector('.an-tree[data-at="rmb"]');
  const rm = await page.locator('.an-land .an-lm').evaluateAll(els => els.map(e => e.getAttribute('data-lm')));
  ok(['SVC', 'azygos arch', 'right PA', '10R', '4R', '7', '11Rs'].every(x => rm.indexOf(x) >= 0), 'right main bronchus: SVC, azygos, right PA, 10R, 4R, 7, 11Rs: ' + rm.join(', '));
  ok(await page.locator('.an-scope').evaluate(e => { const b = e.querySelectorAll('.an-lmt'); const vb = e.getAttribute('viewBox').split(' ').map(Number); return Array.from(b).every(t => { const r = t.getBBox(); return r.x >= vb[0] && r.y >= vb[1] && r.x + r.width <= vb[0] + vb[2] + 0.5 && r.y + r.height <= vb[1] + vb[3] + 0.5; }); }), 'every label of the ring lies inside the picture');
  await page.locator('[data-tree-go="bi"]').click(); await page.waitForSelector('.an-tree[data-at="bi"]');
  await page.locator('[data-tree-go="rml"]').click(); await page.waitForSelector('.an-tree[data-at="rml"]');
  ok(/A4, A5/.test((await page.locator('.an-land .an-lm').evaluateAll(els => els.map(e => e.getAttribute('data-lm')))).join()), 'middle lobe: the segmental arteries A4 and A5');
  await page.locator('[data-crumb="trachea"]').click(); await page.waitForSelector('.an-tree[data-at="trachea"]');
  // the tree map carries the vessels and the stations as layers; hovering a station lights it up everywhere
  await page.locator('[data-level="lower"]').click(); await page.waitForTimeout(60);
  ok(await page.locator('[data-map-vessels]').isChecked() && await page.locator('[data-map-nodes]').isChecked() && await page.locator('.an-map .an-mapv .an-mv').count() >= 7 && await page.locator('.an-map .an-maps .an-st').count() >= 19, 'the tree map shows the great vessels and every station by default');
  await page.evaluate(() => { document.querySelector('.an-land [data-station="4R"]').dispatchEvent(new Event('mouseenter')); });
  ok(await page.locator('.an-maps [data-station="4R"].hl').count() === 1 && await page.locator('.an-land [data-station="4R"].hl').count() === 1, 'hovering 4R on the ring highlights 4R on the tree map (and in the 3D mediastinum)');
  await page.evaluate(() => { document.querySelector('.an-land [data-station="4R"]').dispatchEvent(new Event('mouseleave')); });
  ok(await page.locator('.hl').count() === 0, 'leaving clears the highlight');
  await page.evaluate(() => { document.querySelector('.an-land [data-med="svc"]').dispatchEvent(new Event('mouseenter')); });
  ok(await page.locator('.an-mapv [data-med="svc"].hl').count() === 1, 'hovering the SVC on the ring highlights the SVC on the map');
  await page.evaluate(() => { document.querySelector('.an-land [data-med="svc"]').dispatchEvent(new Event('mouseleave')); });
  await page.locator('[data-map-vessels]').uncheck(); await page.waitForTimeout(60);
  ok(await page.locator('.an-map .an-mapv').count() === 0 && await page.locator('.an-map .an-maps').count() === 1 && (await page.evaluate(() => JSON.parse(localStorage.getItem('pft.anat.map.v1')))).vessels === false, 'the vessel layer switches off on its own and is remembered');
  await page.locator('[data-map-vessels]').check(); await page.waitForTimeout(60);
  // ---- the EBUS card: a pop-up from a station on the map, a node on the ring, a node in the simulator
  await page.locator('.an-maps [data-station="7"]').click(); await page.waitForSelector('[data-ebus-pop="7"]');
  ok(/Station 7 — Subcarinal/.test(await txt('[data-ebus-pop]')) && /Subcarinal zone/.test(await txt('.pop-head')) && /N2 \(either side\)/.test(await txt('.pop-head')), 'tapping a station on the tree map opens its EBUS card with the zone and the N category');
  ok(await page.locator('[data-ebus-pop="7"] .an-sono-fig[data-sono="7"]').count() === 1 && await page.locator('[data-sono="7"] .an-sono-v').count() === 0 && /node alone/.test(await txt('[data-sono="7"] figcaption')) && await page.locator('[data-sono="7"] .an-sono-node').count() === 1, 'station 7 as on the poster: the node alone under the wall, no vessel in the picture');
  ok(await page.locator('[data-ebus-pop] .pop-pearls li').count() === 4 && /N3 → N2 → N1/.test(await txt('[data-ebus-pop] .pop-pearls')) && /left atrium/.test(await txt('[data-ebus-pop] .pop-pearls')), 'four pearls for station 7: the sampling order, what lies deep to the node');
  ok(await page.locator('[data-ebus-pop] .an-probe .an-land[data-land="rmb"]').count() === 1 && await page.locator('[data-ebus-pop] [data-probe="7"]').count() === 1 && await page.locator('[data-ebus-pop] .an-probe .an-lm.n.mark[data-station="7"]').count() === 1 && /right main bronchus/.test(await txt('[data-ebus-pop] .pop-side figcaption')), 'the card shows where the probe sits on the wall of the right main bronchus (yellow) with the node lit');
  ok(await page.locator('[data-ebus-pop] .pop-x:focus').count() === 1, 'focus moves into the card');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  ok(await page.locator('[data-ebus-pop]').count() === 0 && await page.locator('body.has-pop').count() === 0, 'Escape closes the card');
  await page.locator('.an-maps [data-station="4R"]').click(); await page.waitForSelector('[data-ebus-pop="4R"]');
  ok(await page.locator('[data-sono="4R"] .an-sono-v.v').count() === 1 && /SVC/.test(await txt('[data-sono="4R"] figcaption')) && await page.locator('[data-sono="4R"] .an-sono-fig, [data-sono="4R"].an-sono-fig:not(.doppler)').count() === 1 && await page.locator('[data-sono="4R"] .an-sono-flow').evaluate(e => getComputedStyle(e).display) === 'none', '4R as on the poster: the SVC deep to the node; grey scale by default (no colour in the vessel)');
  await page.locator('[data-sono-doppler]').check(); await page.waitForTimeout(60);
  ok(await page.locator('[data-sono="4R"].doppler').count() === 1 && await page.locator('[data-sono="4R"] .an-sono-flow').evaluate(e => getComputedStyle(e).display) !== 'none', 'colour Doppler fills the vessel');
  await page.locator('[data-sono-doppler]').uncheck();
  ok(await page.locator('[data-ebus-pop] [data-probe="4R"]').count() === 1 && /lower trachea|trachea/.test(await txt('[data-ebus-pop] .pop-side figcaption')) && /SVC deep and lateral/.test(await txt('[data-ebus-pop] .pop-pearls')) && /azygos arch crosses/.test(await txt('[data-ebus-pop] .pop-pearls')), '4R: probe on the trachea ring, pearls on the SVC and the azygos boundary');
  await page.locator('[data-pop-map="4R"]').click(); await page.waitForSelector('[data-station-card="4R"]');
  ok(/Station 4R — Lower paratracheal/.test(await txt('.an-stcard')) && await page.locator('[data-ebus-pop]').count() === 0, 'the card can open the station on the station map');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'tree' })); await page.waitForSelector('.an-tree');
  await page.locator('.an-maps [data-station="11R"]').first().click(); await page.waitForSelector('[data-ebus-pop="11R"]');
  ok(await page.locator('[data-ebus-pop] [data-sono="11Rs"]').count() === 1 && await page.locator('[data-ebus-pop] [data-sono="11Ri"]').count() === 1 && await page.locator('[data-sono="11Rs"] .an-sono-v.a').count() === 2 && await page.locator('[data-sono="11Ri"] .an-sono-v.a').count() === 1, '11R from the map: both pictures, 11s with the artery on both sides and 11i with the artery beneath');
  await page.locator('[data-pop-go="bi"]').click(); await page.waitForSelector('.an-tree[data-at="bi"]');
  ok(await page.locator('[data-ebus-pop]').count() === 0 && await txt('.an-hud-name') === 'Bronchus intermedius', '“Go there in the simulator” takes the scope to the bronchus intermedius');
  await page.locator('.an-ring-fig .an-lm.n[data-station="11Rs"]').first().click({ force: true }); await page.waitForSelector('[data-ebus-pop="11R"]');
  ok(await page.locator('[data-ebus-pop] [data-sono="11Rs"]').count() === 1 && await page.locator('[data-ebus-pop] [data-sono="11Ri"]').count() === 0 && await page.locator('[data-ebus-pop] [data-probe="11Rs"]').count() === 1 && await page.locator('[data-ebus-pop] .an-probe .an-land[data-land="bi"]').count() === 1, 'a node on the ring opens its own picture (11Rs alone) with the probe on this ring');
  await page.locator('.pop-bg').click({ position: { x: 5, y: 5 } }); await page.waitForTimeout(100);
  ok(await page.locator('[data-ebus-pop]').count() === 0, 'tapping outside closes the card');
  await page.locator('.an-map [data-node="rul"]').click(); await page.waitForSelector('.an-tree[data-at="rul"]');
  await page.locator('.an-ring-fig .an-lm.n[data-station="12R"]').first().click({ force: true }); await page.waitForSelector('[data-ebus-pop="12–14"]');
  ok(/Station 12–14/.test(await txt('.pop-head')) && await page.locator('[data-sono="12–14"] .an-sono-v').count() === 0 && /radial probe/.test(await txt('[data-ebus-pop] .pop-pearls')), 'a lobar node opens the 12–14 card: node alone, the radial probe for 13 and 14');
  await page.locator('[data-pop-close]').click(); await page.waitForTimeout(60);
  await page.locator('[data-crumb="trachea"]').click(); await page.waitForSelector('.an-tree[data-at="trachea"]');
  ok(await page.evaluate(() => { const S = window.PFT_ANAT.SONO; return Object.keys(S).length === 11 && S['2R'].near.length === 3 && S['2R'].near.map(v => v[2]).join() === 'DR,DDL,DDR' && S['10R'].near.map(v => v[0]).join() === 'azygos v.,right PA,SVC' && S['4L'].near.map(v => v[2]).join() === 'L,DDR' && S['10L'].near[0][2] === 'D' && S['11L'].near[0][2] === 'DL' && Object.keys(S).every(k => (S[k].pearls || []).length >= 2); }), 'every EBUS station has its poster layout (2R: BCA deep-right, the two brachiocephalic veins deeper; 10R: azygos, PA, SVC; 4L: PA beside, ascending aorta deep) and at least two pearls');
  // a photo of your own pinned to a view: kept in this browser only
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAD0lEQVQIW2P4z8DwHwAFAAH/ij1KbwAAAABJRU5ErkJggg==', 'base64');
  await page.locator('[data-pic-add="tree:trachea"]').setInputFiles({ name: 'my atlas page.png', mimeType: 'image/png', buffer: png }); await page.waitForTimeout(500);
  ok(await page.locator('[data-pics="tree:trachea"] .an-pic img').count() === 1 && /my atlas page/.test(await txt('[data-pics="tree:trachea"]')), 'a photo of your own is pinned to the view');
  ok((await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('pft.anat.pics.v1'))))).join() === 'tree:trachea', 'the photo is kept in this browser (localStorage)');
  await page.locator('.an-scope [data-open="rmb"]').click(); await page.waitForSelector('.an-tree[data-at="rmb"]');
  ok(await page.locator('[data-pics="tree:rmb"] .an-pic').count() === 0 && /copyrighted/.test(await txt('[data-pics="tree:rmb"]')), 'another view has no photo; the note says why none are built in');
  await page.locator('[data-crumb="trachea"]').click(); await page.waitForSelector('.an-tree[data-at="trachea"]');
  await page.locator('[data-pics="tree:trachea"] [data-pic-remove="0"]').click(); await page.waitForTimeout(80);
  ok(await page.locator('[data-pics="tree:trachea"] .an-pic').count() === 0 && await page.evaluate(() => localStorage.getItem('pft.anat.pics.v1')) === '{}', 'the photo can be removed');
  // the drill: labels hidden, moves counted, shortest route recognised
  await page.locator('[data-drill-start]').click(); await page.waitForSelector('.an-drill[data-drill="on"]');
  ok(await page.locator('.an-tree').getAttribute('data-at') === 'trachea' && await page.locator('.an-scope .an-ol').count() === 0 && await page.locator('.an-map .an-bl').count() === 0 && await page.locator('.an-land').count() === 0, 'drill starts at the trachea with the labels and the landmark ring hidden');
  const target = await page.evaluate(() => { const t = document.querySelector('.an-drill b').textContent; return Object.keys(window.PFT_ANAT.TREE).filter(k => t.indexOf(window.PFT_ANAT.TREE[k].name) === 0)[0]; });
  const route = await page.evaluate((t) => { const T = window.PFT_ANAT.TREE, out = []; let k = t; while (k && k !== 'trachea') { out.unshift(k); k = T[k].parent; } return out; }, target);
  ok(!!target && route.length >= 2, 'drill names a target below the main bronchi: ' + target + ' via ' + route.join(' > '));
  for (const k of route) { await page.locator('[data-tree-go="' + k + '"]').click(); await page.waitForSelector('.an-tree[data-at="' + k + '"]'); }
  ok(await page.locator('.an-drill[data-drill="done"]').count() === 1 && /shortest route/.test(await txt('.an-found')), 'reaching the target by the shortest route is recognised: ' + await txt('.an-found'));
  await page.locator('[data-drill-stop]').click(); await page.waitForTimeout(60);
  ok(await page.locator('.an-scope .an-ol').count() >= 1, 'labels return when the drill stops');
  await page.locator('[data-crumb="trachea"]').click(); await page.waitForSelector('.an-tree[data-at="trachea"]');
  ok(await page.locator('.an-land').count() === 1, 'the landmark ring returns after the drill');

  // ---- the 3D airway: outside and inside views share the navigator's position
  ok(await page.locator('.an-fig-3d').count() === 2 && await page.locator('canvas.an-3d').count() === 2 && await page.locator('.an-pics > figure:nth-child(2)[data-sim]').count() === 1 && await page.locator('.an-pics > figure:nth-child(2) canvas.an-3d-scope').count() === 1, 'two WebGL canvases: the scope simulator sits beside the tree map in the navigator, the orbit model below');
  ok(await page.evaluate(() => typeof THREE !== 'undefined' && THREE.REVISION === '147'), 'three.js r147 is inlined');
  ok(await page.locator('[data-3d-mode]').count() === 2 && (await page.locator('[data-3d-mode]').allInnerTexts()).join() === 'Outside,Mediastinum' && await page.locator('[data-3d-stl]').count() === 1, 'the lower model offers the outside and the mediastinum, and the STL download for printing');
  ok(await txt('.an-hud-name') === 'Trachea' && (await page.locator('.an-tree').boundingBox()).y < (await page.locator('.an-fig-3d:not(.an-sim)').boundingBox()).y, 'the simulator starts in the trachea, above the orbit model');
  await page.locator('.an-scope [data-open="rmb"]').click(); await page.waitForTimeout(700);
  ok(await txt('.an-hud-name') === 'Right main bronchus', 'the inside view follows the navigator');
  ok(await page.evaluate(() => { const c = document.querySelector('canvas.an-3d-scope'); return c.width > 100 && c.height > 100; }), 'the canvas has a size');
  await page.locator('canvas.an-3d-scope').focus(); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(500);
  ok(await page.locator('.an-tree').getAttribute('data-at') === 'trachea', '↓ on the canvas withdraws (out of the mouth of the bronchus into the trachea)');
  await page.waitForTimeout(100); await page.keyboard.press('2'); await page.waitForTimeout(500);
  ok(await page.locator('.an-tree').getAttribute('data-at') === 'lmb', 'key 2 advances into the second opening (focus kept on the canvas)');
  // the scope's position at real lengths: a centimetre at a time, with the distance readout
  await page.evaluate(() => { document.querySelector('.an-node[data-node="trachea"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await page.waitForTimeout(400);
  ok(/0\.4 cm into the trachea \(11\.0 cm long\) · 10\.6 cm to the carina · 0\.4 cm from the vocal cords/.test(await txt('[data-3d-depth]')), 'the readout gives the depth, the length and the distance to the carina: ' + await txt('[data-3d-depth]'));
  await page.locator('[data-3d-fwd]').click(); await page.waitForTimeout(60);
  ok(/0\.9 cm into the trachea/.test(await txt('[data-3d-depth]')), 'one press moves 5 mm: ' + await txt('[data-3d-depth]'));
  ok(await page.locator('.an-map .an-tip').count() === 1 && await page.locator('[data-3d-pad]').count() === 1 && await page.locator('.an-3d-wrap.scope').count() === 1, 'the simulator: the scope tip on the tree map, the steering pad, the vignette');
  const dotY = async () => +(/translate\([-\d.]+ ([-\d.]+)\)/.exec(await page.locator('.an-map .an-tip').getAttribute('transform'))[1]);
  const y1 = await dotY();
  for (let i = 0; i < 17; i++) await page.locator('[data-3d-fwd]').click();
  await page.waitForTimeout(100);
  ok(/9\.4 cm into the trachea/.test(await txt('[data-3d-depth]')) && /1\.6 cm to the carina/.test(await txt('[data-3d-depth]')), 'eighteen presses on: 9.4 cm in, 1.6 cm to the carina');
  ok((await dotY()) > y1 + 60, 'the dot on the map has moved down the trachea (' + y1 + ' → ' + await dotY() + ')');
  // the see-through overlay: vessels and nodes against the wall, fading with distance; the labels on the openings
  ok(await page.locator('[data-3d-overlay]').isChecked() && await page.evaluate(() => { const T = window.__pft; return !!document.querySelector('[data-3d-overlay]'); }), 'the overlay of vessels and nodes is on by default');
  await page.waitForTimeout(300);
  ok(await page.locator('.an-vlabel:not([hidden])').count() === 2 && (await page.locator('.an-vlabel:not([hidden])').allInnerTexts()).join() === 'R main,L main', 'the two main bronchi are labelled on the picture at the carina: ' + (await page.locator('.an-vlabel:not([hidden])').allInnerTexts()).join());
  ok(await page.locator('[data-level="lower"]').getAttribute('aria-checked') === 'true', 'deep in the trachea the scope view shows the lower ring');
  for (let i = 0; i < 3; i++) await page.locator('[data-3d-fwd]').click();
  await page.waitForTimeout(100);
  ok(/10\.0 cm into the trachea/.test(await txt('[data-3d-depth]')) && /tip held back/.test(await txt('[data-3d-depth]')) && await page.locator('.an-tree').getAttribute('data-at') === 'trachea', 'the tip stops a centimetre short of the carina to see both openings');
  await page.locator('canvas.an-3d-scope').focus(); await page.keyboard.press('1'); await page.waitForTimeout(400);
  ok(await page.locator('.an-tree').getAttribute('data-at') === 'rmb' && /0\.4 cm into the right main bronchus \(2\.4 cm long\)/.test(await txt('[data-3d-depth]')), 'key 1 enters the right main bronchus (2.4 cm long): ' + await txt('[data-3d-depth]'));
  ok(/11\.4 cm from the vocal cords/.test(await txt('[data-3d-depth]')), 'the running distance from the cords carries across the carina');
  await page.locator('[data-3d-back]').click(); await page.waitForTimeout(400);
  ok(await page.locator('.an-tree').getAttribute('data-at') === 'trachea' && /9\.6 cm into the trachea/.test(await txt('[data-3d-depth]')), 'pulling back from the mouth of a bronchus returns to the parent just above its carina: ' + await txt('[data-3d-depth]'));
  for (let i = 0; i < 16; i++) await page.locator('[data-3d-back]').click();
  await page.waitForTimeout(100);
  ok(await page.locator('[data-level="upper"]').getAttribute('aria-checked') === 'true' && /1\.6 cm into the trachea/.test(await txt('[data-3d-depth]')), 'back in the upper trachea the scope view shows the upper ring: ' + await txt('[data-3d-depth]'));
  await page.locator('[data-level="lower"]').click(); await page.waitForTimeout(200);
  ok(/9\.5 cm into the trachea/.test(await txt('[data-3d-depth]')), 'the level buttons move the scope too');
  // drive like a scope: at the carina, advancing without aiming does nothing but hint; aim right and advance enters the right main bronchus
  await page.locator('[data-3d-fwd]').click(); await page.waitForTimeout(100);
  await page.locator('[data-3d-fwd]').click(); await page.waitForTimeout(100);
  ok(await page.locator('.an-tree').getAttribute('data-at') === 'trachea' && /Steer into an opening/.test(await page.locator('[data-3d-hint]').evaluate(e => e.textContent)), 'at the carina the scope must be aimed at an opening: ' + await page.locator('[data-3d-hint]').evaluate(e => e.textContent));
  await page.locator('canvas.an-3d-scope').focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(700);
  ok(await page.locator('.an-tree').getAttribute('data-at') === 'rmb', 'aimed to the right (patient’s right) and advanced: into the right main bronchus');
  await page.keyboard.press('Home'); await page.waitForTimeout(500);
  ok(await page.locator('.an-tree').getAttribute('data-at') === 'trachea' && /0\.4 cm into the trachea/.test(await txt('[data-3d-depth]')), 'Home restarts at the top of the trachea');
  await page.locator('[data-3d-restart]').click(); await page.waitForTimeout(300);
  // the mediastinum: the tree with the vessels, nodes and the section marker, rotatable
  await page.locator('[data-3d-mode="med"]').click(); await page.waitForTimeout(600);
  ok(await page.locator('[data-3d-mode="med"]').getAttribute('aria-checked') === 'true' && /Mediastinum: the tree with the great vessels/.test(await txt('.an-fig-3d:not(.an-sim) figcaption')) && await page.locator('[data-3d-labels]').isChecked(), 'the mediastinum view with its labels');
  ok(await page.locator('[data-3d-depth]').count() === 1 && await page.locator('[data-3d-fwd]').count() === 1, 'the position readout and the centimetre buttons stay in the mediastinum view');
  ok(await page.evaluate(() => { const M = window.PFT_ANAT.MEDIASTINUM; return M.vessels.length >= 18 && M.nodes.length >= 18 && M.vessels.some(v => v.l === 'azygos v.') && M.vessels.some(v => v.l === 'left PA') && M.nodes.some(n => n.id === '4R'); }), 'vessels (SVC, azygos, aorta, PAs, pulmonary veins, oesophagus, spine) and every station are modelled');
  await page.locator('[data-3d-labels]').uncheck(); await page.waitForTimeout(150); await page.locator('[data-3d-labels]').check();
  await page.locator('[data-3d-mode="out"]').click(); await page.waitForTimeout(300);
  ok(/Outside: drag to orbit/.test(await txt('.an-fig-3d:not(.an-sim) figcaption')), 'back to the outside view');
  ok(await page.locator('.edu-links a[href*="utoronto"]').count() === 1 && await page.locator('.edu-links a[target="_blank"]').count() === 5, 'external models and the virtual bronchoscopy simulator are linked');
  if (await page.locator('[data-crumb="trachea"]').count()) { await page.locator('[data-crumb="trachea"]').click(); await page.waitForSelector('.an-tree[data-at="trachea"]'); }

  // ---- nodal stations
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'stations' })); await page.waitForSelector('.an-stations');
  ok(await page.locator('.an-smap .an-st').count() >= 19, 'the map draws every station marker (' + await page.locator('.an-smap .an-st').count() + ')');
  await page.locator('.an-smap [data-station="7"]').click(); await page.waitForSelector('[data-station-card="7"]');
  const card = await txt('.an-stcard');
  ok(/Station 7 — Subcarinal/.test(card) && /bronchus intermedius on the right/.test(card) && /✓ EBUS-TBNA/.test(card) && /✓ EUS/.test(card), 'station 7 card: borders and reach');
  ok(await page.locator('[data-station-card="7"] .an-sono-fig[data-sono="7"]').count() === 1 && await page.locator('[data-sono="7"] .an-sono-v').count() === 0 && /node alone/.test(await txt('[data-sono="7"] figcaption')) && /not a photograph/.test(await txt('[data-sono="7"] figcaption')), 'station 7 card draws the schematic EBUS picture too');
  ok(await page.locator('[data-station-card="7"] [data-pic-add="station:7"]').count() === 1, 'a photo of your own can be pinned to a station');
  await page.locator('.an-smap [data-station="4L"]').click(); await page.waitForSelector('[data-station-card="4L"]');
  ok(await page.locator('[data-sono="4L"] .an-sono-v.a').count() === 2 && /Doppler/.test(await txt('[data-sono="4L"] figcaption')), '4L: the arch and the left PA, Doppler before the pass');
  await page.locator('.an-smap [data-station="5"]').click(); await page.waitForSelector('[data-station-card="5"]');
  ok(/✗ EBUS-TBNA/.test(await txt('.an-stcard')) && /Chamberlain/.test(await txt('.an-stcard')) && await page.locator('[data-station-card="5"] [data-sono="none"]').count() === 1 && await page.locator('[data-station-card="5"] .an-sono-fig').count() === 0, 'station 5 is out of EBUS reach, Chamberlain or VATS; no EBUS picture');
  ok(/N2a/.test(await txt('.learn-body')) && /N3 → N2 → N1/.test(await txt('.learn-body')), 'N staging and the sampling order are taught');
  await page.locator('[data-stq-start]').click(); await page.waitForSelector('.an-drill[data-stq="on"]');
  const q = await page.evaluate(() => { const t = document.querySelector('.an-drill b').textContent; return window.PFT_ANAT.STATIONS.filter(s => t.indexOf(s.name) === 0)[0].id; });
  const wrong = q === '7' ? '4R' : '7';
  await page.locator('.an-smap [data-station="' + wrong + '"]').first().click(); await page.waitForTimeout(60);
  ok(/That is station/.test(await txt('.an-drill')), 'a wrong tap is named');
  await page.locator('.an-smap [data-station="' + q + '"]').first().click(); await page.waitForSelector('.an-drill[data-stq="done"]');
  ok(/Correct — station/.test(await txt('.an-found')) && /score 1/.test(await txt('.an-drill')), 'the right station scores');

  // ---- the CT lab: axial sections from the same model, labels, windows, the quiz, the plane on the 3D model
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'ct' })); await page.waitForSelector('[data-ct]'); await page.waitForTimeout(400);
  ok(await page.locator('#learn-cat').inputValue() === 'airway' && (await page.locator('#learn-nav').innerText()).indexOf('CT anatomy') >= 0, 'CT anatomy is an Anatomy topic of the airway area');
  ok(await page.locator('.ct-canvas').count() === 1 && await page.locator('.ct-lab canvas.an-3d').count() === 1 && await page.evaluate(() => { const c = document.querySelector('.ct-canvas'); return c.width >= 1000 && c.height >= 560; }), 'a CT canvas and the 3D mediastinum beside it');
  ok(/Aortopulmonary window · \+20 mm/.test(await txt('[data-ct-level]')) && await page.locator('[data-ct-win="med"]').getAttribute('aria-checked') === 'true' && await page.locator('[data-ct-labels]').isChecked(), 'starts at the aortopulmonary window in the mediastinal window with labels on: ' + await txt('[data-ct-level]'));
  const names = async () => (await page.locator('[data-ct-list] li').allInnerTexts());
  let nm = await names();
  ok(['Trachea', 'SVC', 'aortic arch', 'ascending aorta', 'azygos v.', 'oesophagus', 'Vertebral body', 'Right upper lobe', 'Left lower lobe'].every(x => nm.indexOf(x) >= 0) && nm.indexOf('Heart (pericardium and myocardium)') < 0 && nm.indexOf('Station 4R node') < 0, 'at +20 mm: trachea, SVC, arch, ascending aorta, azygos, oesophagus, the lobes; no heart, nodes only on request: ' + nm.join(', '));
  await page.locator('[data-ct-nodes]').check(); await page.waitForTimeout(80); nm = await names();
  ok(nm.indexOf('Station 4R node') >= 0 && nm.indexOf('Station 5 node') >= 0 && nm.indexOf('Station 7 node') < 0, 'with the nodal layer on, 4R and 5 are labelled at the aortopulmonary window (7 lies lower): ' + nm.filter(x => /Station/.test(x)).join(', '));
  await page.locator('[data-ct-nodes]').uncheck();
  // the picture is drawn: a dark lumen in the trachea, bright contrast in the SVC, black lung in the mediastinal window
  const px = (x, y) => page.evaluate(([x, y]) => { const c = document.querySelector('.ct-canvas'), k = c.width / 1000, S = 1.6; const d = c.getContext('2d').getImageData(Math.round((500 + x * S) * k), Math.round((280 - (y - 10) * S) * k), 1, 1).data; return d[0]; }, [x, y]);
  ok((await px(4, 4)) < 40 && (await px(-26, 4)) > 200 && (await px(-100, -30)) < 60, 'above the carina the tracheal lumen is black, the SVC white with contrast, the lung black in the mediastinal window: ' + [await px(4, 4), await px(-26, 4), await px(-100, -30)].join('/'));
  await page.locator('[data-ct-win="lung"]').click(); await page.waitForTimeout(80);
  ok((await px(-100, -30)) > 60 && (await px(-100, -30)) < 190 && (await px(-26, 4)) > 240, 'in the lung window the lung is grey and the mediastinum white: ' + [await px(-100, -30), await px(-26, 4)].join('/'));
  await page.locator('[data-ct-win="med"]').click();
  // scrolling: presets, the slider, the keys; the plane on the model follows
  await page.locator('[data-ct-preset="-44"]').click(); await page.waitForTimeout(120); nm = await names();
  ok(/Left atrium · −44 mm/.test(await txt('[data-ct-level]')) && nm.indexOf('Left atrium') >= 0 && nm.indexOf('Bronchus intermedius') >= 0 && nm.indexOf('Right middle lobe') >= 0 && nm.indexOf('Trachea') < 0, 'the left atrium level: the atrium, the bronchus intermedius, the middle lobe; no trachea: ' + nm.join(', '));
  ok(await page.evaluate(() => window.__pft.t3CtZ()) === -44, 'the slice plane on the 3D model moved to −44 mm');
  await page.locator('[data-ct-preset="105"]').click(); await page.waitForTimeout(120); nm = await names();
  ok(nm.indexOf('Thyroid') >= 0 && nm.indexOf('Clavicle (right)') >= 0 && nm.indexOf('L brachiocephalic v.') >= 0 && nm.indexOf('Right lung') < 0, 'the thoracic inlet: thyroid, clavicles, brachiocephalic veins, no lung yet: ' + nm.join(', '));
  await page.locator('[data-ct-preset="-120"]').click(); await page.waitForTimeout(120); nm = await names();
  ok(nm.indexOf('Liver (right hemidiaphragm)') >= 0 && nm.indexOf('Spleen') >= 0 && nm.indexOf('Stomach') >= 0 && nm.indexOf('Left ventricle') >= 0, 'the bases: liver, spleen, stomach under the domes, the ventricles still in the picture: ' + nm.join(', '));
  await page.locator('[data-ct-preset="-8"]').click(); await page.waitForTimeout(120); nm = await names();
  ok(nm.indexOf('Right main bronchus') >= 0 && nm.indexOf('Left main bronchus') >= 0 && nm.indexOf('right PA') >= 0 && nm.indexOf('main PA') >= 0 && nm.indexOf('Trachea') < 0 && nm.indexOf('Right upper lobe bronchus') < 0, 'the carina: both main bronchi and the pulmonary arteries; segmental bronchi stay off the list unless asked: ' + nm.join(', '));
  await page.locator('[data-ct-seg]').check(); await page.waitForTimeout(80); nm = await names();
  ok(nm.some(x => /RB1\)/.test(x)) && nm.some(x => /LB1\+2\)/.test(x)), 'the segmental layer names the apical segments at the carina level');
  await page.locator('[data-ct-seg]').uncheck();
  await page.locator('.ct-canvas').focus(); await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(80);
  ok(/−0 mm|\+0 mm/.test(await txt('[data-ct-level]')) && await page.locator('[data-ct-z]').inputValue() === '0', '↑ moves 4 mm a press and the slider follows: ' + await txt('[data-ct-level]'));
  await page.locator('[data-ct-z]').fill('44'); await page.waitForTimeout(80);
  ok(/Aortic arch · \+44 mm/.test(await txt('[data-ct-level]')) && (await names()).indexOf('aortic arch') >= 0 && (await names()).indexOf('brachiocephalic a.') >= 0, 'the slider: the arch with the arch vessels: ' + (await names()).join(', '));
  // hover names a structure and lights it on the model
  const cb = await page.locator('.ct-canvas').boundingBox();
  const at = (x, y) => [cb.x + cb.width * (500 + x * 1.6) / 1000, cb.y + cb.height * (280 - (y - 10) * 1.6) / 560];
  await page.locator('[data-ct-preset="20"]').click(); await page.waitForTimeout(120);
  let p = at(-26, 8); await page.mouse.move(p[0], p[1]); await page.waitForTimeout(80);
  ok(await txt('[data-ct-hover]') === 'SVC' && await page.locator('[data-ct-item="svc"].hl').count() === 1 && await page.evaluate(() => window.__pft.anatHl().vessel) === 'svc', 'hovering the SVC names it, marks it in the list and lights it on the 3D model');
  p = at(0, 0); await page.mouse.move(p[0], p[1]); await page.waitForTimeout(80);
  ok(await txt('[data-ct-hover]') === 'Trachea', 'the trachea under the pointer: ' + await txt('[data-ct-hover]'));
  await page.mouse.move(10, 10); await page.waitForTimeout(80);
  ok(await txt('[data-ct-hover]') === '' && await page.evaluate(() => window.__pft.anatHl().vessel) === '', 'leaving clears it');
  // labels off, then the quiz
  await page.locator('[data-ct-labels]').uncheck(); await page.waitForTimeout(80);
  ok(/Labels hidden/.test(await txt('[data-ct-list]')), 'labels can be hidden to test yourself');
  await page.locator('[data-ct-labels]').check();
  await page.locator('[data-ctq-start]').click(); await page.waitForSelector('[data-ctq="on"]');
  const ctTarget = await page.evaluate(() => { const t = document.querySelector('.an-drill b').textContent; return t; });
  const tsh = await page.evaluate((t) => { const s = window.__pft.ctShapes().filter(x => x.name === t)[0]; return s ? [s.x, s.y, s.id] : null; }, ctTarget);
  ok(!!tsh && await page.locator('[data-ct-list] li').count() === 0, 'the quiz asks for a structure on this level and hides the list: ' + ctTarget);
  const wrongS = await page.evaluate((id) => { const s = window.__pft.ctShapes().filter(x => x.id !== id && !x.lobe && x.rx < 30)[0]; return [s.x, s.y, s.name]; }, tsh[2]);
  p = at(wrongS[0], wrongS[1]); await page.mouse.click(p[0], p[1]); await page.waitForTimeout(80);
  const wrongTxt = await txt('.an-drill');
  p = at(tsh[0], tsh[1]); await page.mouse.click(p[0], p[1]); await page.waitForTimeout(80);
  ok(await page.locator('[data-ctq="done"]').count() === 1 && /Correct/.test(await txt('.an-found')), 'tapping the structure scores (after a wrong tap: ' + wrongTxt.replace(/\n/g, ' ') + ')');
  await page.locator('[data-ctq-stop]').click(); await page.waitForTimeout(80);
  ok(await page.locator('[data-ct-list] li').count() > 10, 'stopping the quiz brings the labels back');
  // a station on the CT opens its EBUS card
  await page.locator('[data-ct-nodes]').check(); await page.waitForTimeout(80);
  const st4r = await page.evaluate(() => { const s = window.__pft.ctShapes().filter(x => x.station === '4R')[0]; return [s.x, s.y]; });
  p = at(st4r[0], st4r[1]); await page.mouse.click(p[0], p[1]); await page.waitForSelector('[data-ebus-pop="4R"]');
  ok(true, 'tapping station 4R on the section opens its EBUS card');
  await page.keyboard.press('Escape'); await page.waitForTimeout(80);

  // ---- mechanical ventilation: the modes, the settings, the waveforms, the simulator
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'vent_basics' })); await page.waitForSelector('.learn-body[data-topic="vent_basics"]');
  const ventTopics = await page.locator('.ln-btn').evaluateAll(els => els.map(e => e.getAttribute('data-topic')));
  ok(await page.locator('#learn-cat').inputValue() === 'vent' && ventTopics.join() === 'vent_basics,vent_settings,vent_niv,vent_waves,vent_sim', 'a fifth Learn area, mechanical ventilation, in order: ' + ventTopics.join());
  ok(await page.locator('[data-ventmodes] [data-mode-row]').count() === 9 && /Paw \+ Pmus = V\/Crs \+ Flow × Raw \+ PEEPtotal/.test(await txt('.learn-body')) && /DOPES/.test(await txt('.learn-body')) === false, 'nine modes in the trigger / target / cycle matrix and the equation of motion');
  await page.locator('[data-mode-row="psv"]').click(); await page.waitForSelector('[data-mode-card="psv"]');
  ok(/Flow \(at a percentage of peak flow/.test(await txt('[data-mode-row="psv"]')) && /spontaneous breathing trials/.test(await txt('[data-mode-card]')), 'tapping pressure support shows its cycle and its uses');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'vent_settings' })); await page.waitForSelector('[data-ventsettings]');
  ok(await page.locator('[data-settings-list] [data-setting]').count() >= 26, 'the glossary lists every setting');
  await page.locator('[data-settings-q]').fill('cycle'); await page.waitForTimeout(80);
  ok(await page.locator('[data-settings-list] [data-setting="cycle"]').count() === 1 && await page.locator('[data-settings-list] [data-setting]').count() <= 6 && /40–60% in COPD/.test(await txt('[data-setting="cycle"]')), 'searching “cycle” finds the cycle-off setting with its typical values');
  await page.locator('[data-settings-q]').fill(''); await page.locator('[data-settings-cat="Non-invasive"]').click(); await page.waitForTimeout(80);
  ok(await page.locator('[data-settings-list] [data-setting="ipap"]').count() === 1 && await page.locator('[data-settings-list] [data-setting="vt"]').count() === 0, 'the category chips filter: IPAP/EPAP under non-invasive, tidal volume not');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'vent_niv' })); await page.waitForSelector('.learn-body[data-topic="vent_niv"]');
  ok(/pH < 7\.35, PaCO2 > 45/.test(await txt('.learn-body')) && /ROX/.test(await txt('.learn-body')) && /HACOR/.test(await txt('.learn-body')) && /FLORALI/.test(await txt('.learn-body')), 'non-invasive: the indications table, the failure scores, the evidence');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'vent_waves' })); await page.waitForSelector('[data-ventwaves]');
  ok(await page.locator('[data-wave]').count() === 14 && await page.locator('.vw-svg .vw-tr').count() === 3 && /Volume control, constant flow/.test(await txt('[data-wave-note]')), 'fourteen patterns; three traces; volume control first');
  await page.locator('[data-wave="autopeep"]').click(); await page.waitForSelector('[data-wave-note="autopeep"]');
  ok(/Expiratory flow has not returned to zero/.test(await txt('[data-wave-note]')) && /80% of the auto-PEEP/.test(await txt('[data-wave-note]')), 'auto-PEEP: what you see and what to do');
  await page.locator('[data-wave="double"]').click(); await page.waitForSelector('[data-wave-note="double"]');
  ok(/stacked/.test(await txt('[data-wave-note]')), 'double triggering is drawn and explained');
  // the simulator: COPD → NIV (best) → the screen and the gases; the ventilator with a wrong rate; a day later
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'vent_sim' })); await page.waitForSelector('[data-ventsim]');
  ok(await page.locator('[data-case]').count() === 8 && await page.locator('[data-case-present="copd"]').count() === 1 && /Predicted body weight 70 kg/.test(await txt('[data-case-present]')), 'eight cases; COPD first with its predicted body weight');
  ok(await page.locator('.vent-screen.off').count() === 1 && await page.locator('[data-tile]').count() === 0, 'before a level of support is chosen the screen is dark');
  await page.locator('[data-triage="o2"]').click(); await page.waitForSelector('[data-triage-verdict="wrong"]');
  ok(/Haldane/.test(await txt('.vs-verdict')), 'oxygen alone for the drowsy retainer is wrong, with the physiology');
  await page.locator('[data-triage="niv"]').click(); await page.waitForSelector('[data-triage-verdict="best"]');
  await page.locator('[data-triage-go]').click(); await page.waitForSelector('[data-plan="niv"][aria-checked="true"]');
  ok(await page.locator('[data-vs="ipap"]').inputValue() === '14' && await page.locator('[data-vs="epap"]').inputValue() === '5', 'proceeding with NIV loads BiPAP 14/5');
  await page.waitForSelector('[data-vs-abg]');
  const gasVal = (card, label) => page.evaluate(([c, l]) => { const cell = Array.from(document.querySelectorAll(c + ' .vs-cell')).filter(x => x.querySelector('.lbl').textContent === l)[0]; return cell ? parseFloat(cell.querySelector('b').textContent) : NaN; }, [card, label]);
  const mechVal = (label) => page.evaluate((l) => { const r = Array.from(document.querySelectorAll('[data-vs-mech] .hl-r')).filter(x => x.querySelector('.lbl').textContent === l)[0]; return r ? r.querySelector('b').textContent : ''; }, label);
  const tile = (name) => page.evaluate((n) => { const t = document.querySelector('[data-tile="' + n + '"]'); return t ? { v: parseFloat(t.querySelector('.vsc-v').textContent), text: t.querySelector('.vsc-v').textContent, alarm: t.classList.contains('alarm') } : null; }, name);
  const phA = await gasVal('[data-vs-abg]', 'pH'), pco2A = await gasVal('[data-vs-abg]', 'PaCO2'), bicA = await gasVal('[data-vs-abg]', 'HCO3');
  ok(phA >= 7.3 && phA <= 7.49 && pco2A >= 45 && pco2A <= 65 && bicA === 32, 'on BiPAP an hour later the pH is up and the PaCO2 near his baseline: pH ' + phA + ', PaCO2 ' + pco2A);
  const phV = await gasVal('[data-vs-vbg]', 'pH'), pco2V = await gasVal('[data-vs-vbg]', 'PvCO2');
  ok(pco2V > pco2A + 3 && pco2V < pco2A + 14 && phV < phA, 'the venous gas sits a few mm Hg above and a few hundredths below the arterial: ' + pco2V + ' / ' + phV);
  ok(/compensated respiratory acidosis/.test(await txt('[data-vs-read]')) && await page.locator('[data-target="ok"]').count() >= 4, 'the reading names the compensated retainer and most targets are met');
  // the screen: the tiles agree with the settings and the mechanics; the traces are drawn; the lungs breathe
  ok(await page.locator('[data-vs-screen]:not(.off)').count() === 1 && await page.locator('[data-tile]').count() === 12 && /BiPAP 14\/5/.test(await txt('[data-vs-screenmode]')), 'the ventilator screen lights up with twelve tiles and the settings in its header');
  ok((await tile('Ppeak')).v === 14 && (await tile('Pplat')).v < 14 && /^5 \(\+/.test((await tile('PEEP')).text) && (await tile('SpO2')).v === Math.round(await gasVal('[data-vs-abg]', 'SaO2')), 'on BiPAP the peak is the IPAP, the plateau below it, the PEEP tile shows the auto-PEEP and the SpO2 matches the gas');
  const drawn = await page.evaluate(() => { const cv = document.querySelector('.vsc-canvas'); const ctx = cv.getContext('2d'); const d = ctx.getImageData(0, 0, cv.width, cv.height).data; let yellow = 0, green = 0, blue = 0; for (let i = 0; i < d.length; i += 16) { const r = d[i], g = d[i + 1], b = d[i + 2]; if (r > 200 && g > 160 && b < 120) yellow++; else if (g > 180 && r < 160 && b < 160) green++; else if (b > 200 && r < 140) blue++; } return { w: cv.width, yellow, green, blue }; });
  ok(drawn.w > 300 && drawn.yellow > 15 && drawn.green > 15 && drawn.blue > 15, 'the canvas carries a yellow pressure, a green flow and a blue volume trace: ' + JSON.stringify(drawn));
  const lungA = await page.locator('[data-lung-pair]').getAttribute('transform'); await page.waitForTimeout(700); const lungB = await page.locator('[data-lung-pair]').getAttribute('transform');
  ok(lungA !== lungB && /scale\(1\.\d+\)/.test(lungA) && await page.locator('.lg-mask').count() === 1, 'the lungs are breathing under a mask: ' + lungA + ' → ' + lungB);
  ok(await page.locator('.pv-breath[data-pv-over="0"]').count() === 1 && await page.locator('.lg-hatch').count() === 0 && await page.locator('.lg-cons').count() === 0, 'the breath sits on the steep part of the P–V curve; soft lungs without consolidation');
  await page.locator('[data-vs-record]').click(); await page.waitForTimeout(100);
  await page.locator('[data-plan="tube"]').click(); await page.waitForSelector('[data-vs="vt"]');
  ok(await page.locator('.lg-tube').count() === 1 && (await tile('Ppeak')).v > (await tile('Pplat')).v + 10, 'the ventilator: a tube on the lungs; in volume control the peak sits well above the plateau (the resistance)');
  await page.locator('[data-vs="rr"]').fill('26'); await page.locator('[data-vs="vt"]').fill('650'); await page.locator('[data-vs="flow"]').fill('40');
  await page.waitForTimeout(250);
  const phB = await gasVal('[data-vs-abg]', 'pH'), pco2B = await gasVal('[data-vs-abg]', 'PaCO2');
  ok(phB > 7.6 && pco2B < 30 && /post-hypercapnic/.test(await txt('[data-vs-read]')) && await page.locator('[data-target="no"]').count() >= 2, 'VC-AC 650 × 26 over-ventilates the retainer live, without an apply: alkalaemia, auto-PEEP, targets lost: pH ' + phB + ', PaCO2 ' + pco2B);
  ok(/^5 \+ [3-9]\.\d = /.test(await mechVal('PEEP set + auto')) && (await tile('PEEP')).alarm && /Auto-PEEP/.test(await txt('.vsc-alarms')) && /VC-AC VT 650 × 26/.test(await txt('[data-vs-screenmode]')), 'the mechanics card and the screen both show the auto-PEEP, with an alarm: ' + await txt('.vsc-alarms'));
  await page.locator('[data-vs-record]').click(); await page.locator('[data-vs-when="1"]').click(); await page.waitForTimeout(200); await page.locator('[data-vs-record]').click(); await page.waitForTimeout(100);
  ok((await gasVal('[data-vs-abg]', 'HCO3')) < 26 && await page.locator('[data-vs-log] tbody tr').count() === 3 && /a day later/.test(await txt('[data-vs-log] tbody tr:last-child')), 'a day later the kidney has let the bicarbonate go; the chart keeps the three gases recorded: HCO3 ' + await gasVal('[data-vs-abg]', 'HCO3'));
  // the patient's lungs: stiffen them, add shunt, reset
  await page.locator('[data-vs-when="0"]').click(); await page.locator('[data-vs="rr"]').fill('12'); await page.locator('[data-vs="vt"]').fill('480'); await page.locator('[data-vs="flow"]').fill('70'); await page.waitForTimeout(200);
  const pplat0 = (await tile('Pplat')).v, pao20 = await gasVal('[data-vs-abg]', 'PaO2');
  await page.locator('[data-vp="crs"]').fill('20'); await page.waitForTimeout(250);
  ok((await tile('Pplat')).v > pplat0 + 10 && (await tile('Cstat')).v === 20 && await page.locator('.lg-hatch').count() > 0 && await page.locator('.pv-breath[data-pv-over="1"]').count() === 1 && parseFloat(await mechVal('Driving pressure')) >= 24, 'compliance 20: the plateau climbs, the lungs hatch, the breath runs past the upper inflection, the driving pressure is 24: ' + (await tile('Pplat')).v);
  await page.locator('[data-vp="shunt"]').fill('0.4'); await page.waitForTimeout(250);
  const pao2Sh = await gasVal('[data-vs-abg]', 'PaO2');
  ok(pao2Sh < pao20 - 30 && await page.locator('.lg-cons').count() >= 8 && (await tile('SpO2')).alarm, 'a 40% shunt: the PaO2 collapses whatever the FiO2, the lungs consolidate, the SpO2 alarms: ' + pao2Sh);
  await page.locator('[data-vs="fio2"]').fill('1'); await page.waitForTimeout(250);
  ok((await gasVal('[data-vs-abg]', 'PaO2')) < 70, 'and 100% oxygen does not fix a shunt: PaO2 ' + await gasVal('[data-vs-abg]', 'PaO2'));
  await page.locator('[data-vp-reset]').click(); await page.waitForTimeout(250);
  ok(await page.locator('.lg-hatch').count() === 0 && await page.locator('.lg-cons').count() === 0 && (await tile('Cstat')).v === 70 && await page.locator('[data-vp="crs"]').inputValue() === '70', 'reset: the case’s own lungs are back');
  // DKA: observation is best; a slow ventilator rate collapses the pH
  await page.locator('[data-case="dka"]').click(); await page.waitForSelector('[data-case-present="dka"]');
  await page.locator('[data-triage="o2"]').click(); await page.waitForSelector('[data-triage-verdict="best"]');
  await page.locator('[data-triage-go]').click(); await page.waitForSelector('.vent-screen.monitor');
  ok(await page.locator('[data-tile]').count() === 8 && (await tile('RR')).v > 25 && await page.locator('.lg-tube, .lg-mask').count() === 0, 'on oxygen alone the screen is a bedside monitor: eight tiles, Kussmaul breathing, nothing on the airway');
  await page.locator('[data-triage="tube"]').click(); await page.waitForSelector('[data-triage-verdict="poor"]');
  await page.locator('[data-triage-go]').click(); await page.waitForSelector('[data-vs="vt"]');
  await page.locator('[data-vs="rr"]').fill('12'); await page.selectOption('[data-vs="sed"]', 'deep'); await page.waitForTimeout(250);
  ok(await page.locator('[data-vs-verdict="dead"]').count() === 1 && /Peri-arrest/.test(await txt('.vs-sum')) && /mixed respiratory and metabolic acidosis/.test(await txt('[data-vs-read]')), 'DKA on 12 a minute, deeply sedated: peri-arrest with a pH in the sixes: ' + await gasVal('[data-vs-abg]', 'pH') + ' / ' + await txt('.vs-sum'));
  await page.locator('[data-vs="rr"]').fill('30'); await page.locator('[data-vs="vt"]').fill('520'); await page.selectOption('[data-vs="sed"]', 'light'); await page.waitForTimeout(250);
  ok(await page.locator('[data-vs-verdict="all"]').count() === 1 || await page.locator('[data-target="no"]').count() <= 1, 'at 30 × 520 the compensation is restored: targets met');
  // ARDS: the tube is best; 6 mL/kg with PEEP
  await page.locator('[data-case="ards"]').click(); await page.waitForSelector('[data-case-present="ards"]');
  await page.locator('[data-triage="tube"]').click(); await page.waitForSelector('[data-triage-verdict="best"]');
  await page.locator('[data-triage-go]').click(); await page.waitForSelector('[data-vs="vt"]');
  ok(await page.locator('[data-vs="vt"]').inputValue() === '340' && await page.locator('[data-vs="peep"]').inputValue() === '12', 'ARDS loads 340 mL (6 mL/kg of 57 kg) with PEEP 12');
  ok(await page.locator('.lg-hatch').count() > 0 && await page.locator('.lg-cons').count() >= 4 && (await tile('Pplat')).v <= 30 && await page.locator('.pv-breath[data-pv-over="0"]').count() === 1, 'ARDS lungs: stiff and consolidated; the protective breath stays below the upper inflection');
  await page.locator('[data-vs="vt"]').fill('650'); await page.waitForTimeout(250);
  ok(parseFloat(await mechVal('Driving pressure')) > 15 && parseFloat((await mechVal('Peak / plateau')).split('/')[1]) > 30 && await page.locator('[data-target="no"]').count() >= 3 && (await tile('Pplat')).alarm && await page.locator('.pv-breath[data-pv-over="1"]').count() === 1, 'a 650 mL breath: a driving pressure over 15, a plateau over 30 with its alarm, overdistension on the curve, targets lost: ' + await mechVal('Driving pressure') + ' · ' + await mechVal('Peak / plateau'));
  // leaving the page stops the animation
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'vent_waves' })); await page.waitForTimeout(300);
  ok(await page.locator('[data-vs-screen]').count() === 0, 'leaving the simulator takes the screen away (the frame loop stops with it)');

  // ---- ECMO: the pages, the circuit lab and the scenarios
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'ecmo_intro' })); await page.waitForSelector('.learn-body[data-topic="ecmo_intro"]');
  ok(await page.locator('#learn-cat').inputValue() === 'ecmo' && await page.locator('.ln-btn[data-topic]').count() === 11 && /ECLS-SHOCK/.test(await txt('.learn-body')), 'the ECMO area: eleven topics, the trials on the first page');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'ecmo_circuit' })); await page.waitForSelector('[data-ecmocircuit]');
  ok(await page.locator('[data-ecmocircuit] .ec-num').count() === 6 && await page.locator('[data-ecmocircuit] .ec-flow').count() >= 3 && await page.locator('[data-ecmocircuit] .ec-tag').count() >= 5, 'the circuit page: six numbered parts, animated flow on the tubing, the pressures tagged');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'ecmo_cannulation' })); await page.waitForSelector('[data-ecmoconfigs]');
  ok(await page.locator('[data-cfg]').count() === 8 && await page.locator('[data-cfg="vpa"] .ec-cfgline').count() >= 2, 'eight cannulation configurations drawn');
  // the lab: VV
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'ecmo_lab' })); await page.waitForSelector('[data-ecmolab]');
  const ecCell = (label) => page.evaluate((l) => { const c = Array.from(document.querySelectorAll('[data-ecmolab] [data-ec-cell]')).filter(x => x.getAttribute('data-ec-cell') === l)[0]; return c ? parseFloat(c.querySelector('b').textContent) : NaN; }, label);
  const ecTile = (n) => page.evaluate((n) => { const t = document.querySelector('[data-ecmolab] [data-tile="' + n + '"]'); return t ? { v: parseFloat(t.querySelector('.vsc-v').textContent), alarm: t.classList.contains('alarm') } : null; }, n);
  const postPO2 = () => page.evaluate(() => parseFloat(document.querySelector('[data-ec-gas="post"] [data-ec-cell="PO2"] b').textContent));
  ok(await page.locator('[data-ec-mode="vv"][aria-checked="true"]').count() === 1 && (await ecTile('Flow')).v > 4 && (await ecCell('SaO2')) >= 88 && (await ecCell('PaCO2')) > 30 && (await ecCell('PaCO2')) < 45 && (await postPO2()) > 400 && await page.locator('[data-ec-alarms="0"]').count() === 1, 'the lab opens on a good VV run: flow 4.6, SaO2 in the 90s, PaCO2 in the 30s, post-membrane PO2 above 400, no alarms');
  const sa0 = await ecCell('SaO2'), pc0 = await ecCell('PaCO2');
  await page.locator('[data-ec="sweep"]').fill('6'); await page.waitForTimeout(150);
  ok((await ecCell('PaCO2')) < pc0 - 10 && Math.abs((await ecCell('SaO2')) - sa0) <= 2, 'more sweep: the PaCO2 falls and the saturation does not move');
  await page.locator('[data-ec="rpm"]').fill('2200'); await page.waitForTimeout(150);
  ok((await ecTile('Flow')).v < 2.6 && (await ecCell('SaO2')) < sa0 - 8 && (await ecTile('Qeff / CO')).alarm, 'less speed: less flow, a smaller share of the output, the saturation falls and the ratio alarms');
  await page.selectOption('[data-ec-preset]', 'vv_recirc'); await page.waitForTimeout(250);
  ok((await ecTile('SvO2 (drainage)')).v >= 75 && (await ecTile('SvO2 (drainage)')).alarm && (await ecCell('SaO2')) < sa0 - 4 && /Recirculation|recirculation/.test(await txt('[data-ec-note]')) && await page.locator('[data-ec-config] option:checked').evaluate(e => e.value) === 'ff', 'the recirculation preset: femoro-femoral, bright drainage blood with a falling patient');
  await page.selectOption('[data-ec-preset]', 'vv_chatter'); await page.waitForTimeout(250);
  ok(await page.locator('[data-ecmolab] .ec-chatter').count() === 1 && (await ecTile('P drain')).v < -70 && (await ecTile('Flow')).alarm && /Drainage insufficiency/.test(await txt('[data-ec-alarms]')), 'the chatter preset: the drainage line shakes, the pressure dives, the console alarms');
  await page.locator('[data-ec="cvp"]').fill('12'); await page.waitForTimeout(150);
  ok(await page.locator('[data-ecmolab] .ec-chatter').count() === 0 && (await ecTile('Flow')).v > 4, 'volume restores the drainage');
  await page.selectOption('[data-ec-preset]', 'vv_oxyfail'); await page.waitForTimeout(250);
  ok((await postPO2()) < 200 && (await ecTile('ΔP')).alarm && await page.locator('[data-ecmolab] .ec-clot').count() >= 3 && /membrane failing/.test(await txt('[data-ec-alarms]')), 'the failing membrane: post-membrane PO2 under 200, ΔP alarm, clots drawn in the fibres');
  // the lab: VA
  await page.locator('[data-ec-mode="va"]').click(); await page.waitForSelector('[data-ec-mode="va"][aria-checked="true"]');
  ok(await page.locator('[data-ec-unload]').count() === 1 && await page.locator('[data-ec="contr"]').count() === 1 && await page.locator('[data-ec="co"]').count() === 0 && await page.locator('[data-ecmolab] .ec-dpc').count() === 1 && await page.locator('[data-ecmolab] [data-mix]').count() === 1, 'VA: contractility and unloading controls, a distal perfusion catheter and the mixing zone drawn');
  ok((await ecCell('Femoral PaO2')) > 300 && (await ecCell('Right radial PaO2')) > 60 && (await ecCell('Right radial PaO2')) < (await ecCell('Femoral PaO2')) && (await ecCell('MAP')) >= 65 && (await ecCell('Pulse pressure')) >= 10, 'cardiogenic shock on peripheral VA: the femoral gas is circuit blood, the right radial a native mixture, MAP restored');
  await page.selectOption('[data-ec-preset]', 'va_harlequin'); await page.waitForTimeout(250);
  const rr = await ecCell('Right radial PaO2'), fem = await ecCell('Femoral PaO2');
  ok(rr < 60 && fem > 150 && /Differential hypoxaemia/.test(await txt('[data-ec-alarms]')) && parseFloat(await page.locator('[data-ecmolab] [data-mix]').getAttribute('data-mix')) > 3, 'Harlequin: right radial PaO2 ' + rr + ', femoral ' + fem + ', the mixing zone in the arch');
  await page.selectOption('[data-ec-config]', 'ce'); await page.waitForSelector('[data-ec-config] option[value="ce"]:checked', { state: 'attached' }); await page.waitForTimeout(250);
  ok(Math.abs((await ecCell('Right radial PaO2')) - (await ecCell('Femoral PaO2'))) < 2 && await page.locator('[data-ecmolab] [data-mix]').count() === 0, 'central return: one blend for the whole aorta, no mixing zone');
  await page.selectOption('[data-ec-preset]', 'va_distension'); await page.waitForTimeout(250);
  ok((await ecCell('LVEDP')) > 20 && (await ecCell('Pulse pressure')) < 10 && /closed/.test(await page.locator('[data-ec-cell="Aortic valve"] b').innerText()) && /LV distension/.test(await txt('[data-ec-alarms]')) && await page.locator('[data-ecmolab] .ec-oedema').count() >= 3, 'the distended ventricle: LVEDP over 20, no pulse pressure, a closed valve, oedema drawn in the lungs');
  const lvedp0 = await ecCell('LVEDP');
  await page.selectOption('[data-ec-unload]', 'impella'); await page.waitForTimeout(250);
  ok((await ecCell('LVEDP')) < lvedp0 - 6 && await page.locator('[data-ecmolab] .ec-impella').count() === 1 && !/LV distension/.test(await txt('[data-ec-alarms]')), 'an Impella empties it: LVEDP down, the device drawn through the valve, the alarm gone');
  await page.selectOption('[data-ec-preset]', 'va_wean'); await page.waitForTimeout(250);
  ok((await ecTile('Flow')).v < 2.2 && (await ecCell('MAP')) >= 60 && (await ecCell('Pulse pressure')) > 20 && (await ecCell('Native output')) > 2, 'the flow-down trial: 1.9 L/min of support, the native heart holds the pressure');
  // the scenarios
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'ecmo_cases' })); await page.waitForSelector('[data-ecmocases]');
  ok(await page.locator('[data-ec-case]').count() === 14 && await page.locator('[data-ec-opt]').count() === 4 && await page.locator('[data-ec-open="chatter"]').count() === 1, 'fourteen scenarios; the first open with four options');
  await page.locator('[data-ec-opt="up"]').click(); await page.waitForSelector('[data-ec-verdict="wrong"]');
  ok(await page.locator('.ec-best').count() === 1 && await page.locator('.ec-opt.isbest').count() === 1 && await page.locator('.ec-fix li').count() === 5 && await page.locator('[data-ec-score="0/1"]').count() === 1, 'a wrong answer: the verdict, the best move shown, the sequence, the score');
  await page.locator('[data-ec-case="recirc"]').click(); await page.waitForSelector('[data-ec-open="recirc"]');
  await page.locator('[data-ec-opt="reposition"]').click(); await page.waitForSelector('[data-ec-verdict="best"]');
  ok(await page.locator('[data-ec-score="1/2"]').count() === 1 && await page.locator('[data-ec-case="recirc"].ec-done.best').count() === 1 && await page.locator('[data-ec-case="chatter"].ec-done.wrong').count() === 1, 'the tabs remember the verdicts');
  await page.locator('[data-ec-showlab="vv_recirc"]').click(); await page.waitForSelector('[data-ecmolab]');
  ok((await ecTile('SvO2 (drainage)')).v >= 75 && await page.locator('[data-ec-config] option:checked').evaluate(e => e.value) === 'ff', '“Show in the lab” opens the lab with the scenario’s circuit');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'ecmo_cases' })); await page.waitForSelector('[data-ecmocases]');
  ok(await page.locator('[data-ec-score="1/2"]').count() === 1, 'the answers survive leaving and returning');
  // the guided scenarios inside the lab
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'ecmo_lab' })); await page.waitForSelector('[data-ecmolab] [data-ec-guide]');
  ok(await page.locator('[data-ec-guide] option').count() === 39 && await page.locator('[data-ec-guide] optgroup').count() === 3 && await page.locator('[data-ec-guide-panel="free"]').count() === 1 && await page.locator('[data-ec-gopt]').count() === 0, 'the lab opens in free play; one list offers ten gas rounds, ten next-best-step cases and eighteen presets');
  await page.selectOption('[data-ec-guide]', 'lab_recirc'); await page.waitForSelector('[data-ec-guide-panel="lab_recirc"]');
  ok(await page.locator('[data-ec-gopt]').count() === 4 && (await ecCell('SO2')) >= 75 && await page.locator('[data-ec-config] option:checked').evaluate(e => e.value) === 'ff' && /Recirculation|recirculation/.test(await txt('[data-ec-alarms]')) && (await ecTile('Flow')).v > 4, 'the recirculation case loads its circuit: femoro-femoral, a bright drainage, the alarm, four moves');
  const spo2Before = await ecCell('SaO2');
  await page.locator('[data-ec-gopt="rpm"]').click(); await page.waitForSelector('[data-ec-gverdict="poor"]');
  ok((await ecTile('Speed')).v === 4000 && await page.locator('[data-ec-gafter="poor"] td.hm-moved').count() >= 2 && await page.locator('[data-ec-gbest]').count() === 1 && await page.locator('[data-ec-gopt]').count() === 0, 'a poor move turns the speed to 4,000 on the console, tabulates what moved, and offers the best move instead');
  await page.locator('[data-ec-gbest]').click(); await page.waitForSelector('[data-ec-gstep="1"]:not(.done)');
  ok(await page.locator('[data-ec-config] option:checked').evaluate(e => e.value) === 'fj' && (await ecTile('Speed')).v === 3500 && (await ecCell('SaO2')) > spo2Before + 5 && await page.locator('[data-ec-gafter="best"]').count() === 1 && await page.locator('[data-ec-gopt]').count() === 4, 'undone and the best move applied: femoro-jugular, the speed back, the saturation up, the second step open');
  await page.locator('[data-ec-gopt="sweep2"]').click(); await page.waitForSelector('[data-ec-gdone]');
  ok((await ecTile('Sweep')).v > 2.5 && (await ecCell('PaCO2')) < 42 && await page.locator('[data-ec-gscore="0/1"]').count() === 1 && await page.locator('[data-ec-gnext]').count() === 1, 'the sweep clears the CO2, the case is done, the score counts it');
  await page.locator('[data-ec-gnext]').click(); await page.waitForSelector('[data-ec-guide-panel="lab_chatter"]');
  ok(await page.locator('[data-ecmolab] .ec-chatter').count() === 1 && (await ecTile('P drain')).v < -75, 'the next scenario: the chattering line');
  await page.locator('[data-ec-gopt="down"]').click(); await page.waitForSelector('[data-ec-gverdict="best"]');
  ok(await page.locator('[data-ecmolab] .ec-chatter').count() === 0 && (await ecTile('Speed')).v === 2700, 'speed down: the line is quiet on the drawing');
  await page.selectOption('[data-ec-guide]', 'lab_distension'); await page.waitForSelector('[data-ec-guide-panel="lab_distension"]');
  ok(await page.locator('[data-ec-mode="va"][aria-checked="true"]').count() === 1 && (await ecCell('Pulse pressure')) < 5 && /LV distension/.test(await txt('[data-ec-alarms]')), 'a VA case switches the lab to VA: the distended ventricle');
  await page.locator('[data-ec-gopt="impella"]').click(); await page.waitForSelector('[data-ec-gverdict="best"]');
  ok(await page.locator('[data-ecmolab] .ec-impella').count() === 1 && !/LV distension/.test(await txt('[data-ec-alarms]')) && await page.locator('[data-ec-unload] option:checked').evaluate(e => e.value) === 'impella', 'the Impella move draws the device and clears the alarm');
  await page.selectOption('[data-ec-guide]', ''); await page.waitForSelector('[data-ec-guide-panel="free"]');
  ok(await page.locator('[data-ecmolab] .ec-impella').count() === 1, 'back to free play with the dials where the scenario left them');

  // ---- haemodynamics: the catheterised heart, the monitor, the lab, the scenarios
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'hemo_intro' })); await page.waitForSelector('.learn-body[data-topic="hemo_intro"]');
  ok(await page.locator('#learn-cat').inputValue() === 'hemo' && await page.locator('.ln-btn[data-topic]').count() === 12 && /Guyton/.test(await txt('.learn-body')), 'the haemodynamics area: twelve topics, venous return on the first page');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'hemo_swan' })); await page.waitForSelector('[data-hemoswan]');
  ok(await page.locator('[data-hemoswan] .hm-heart').count() === 1 && await page.locator('[data-hemoswan] .hm-cath').count() === 1 && await page.locator('[data-hemoswan] .hm-tag').count() === 7 && await page.locator('[data-hemoswan] .hm-trace').count() === 4 && await page.locator('[data-hemoswan] .hm-wave').count() >= 12, 'the catheter page: the heart with the catheter, seven pressure tags, four traces with their waves labelled');
  ok(/PA 23\/10 \(14\)/.test(await txt('[data-hemoswan] .hm-tag[data-tag="pa"]')) && /PAOP 8/.test(await txt('[data-hemoswan] .hm-tag[data-tag="paop"]')), 'normal numbers on the tags');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'hemo_lab' })); await page.waitForSelector('[data-hemolab]');
  const hmCell = (label) => page.evaluate((l) => { const c = Array.from(document.querySelectorAll('[data-hemolab] [data-hm-cell]')).filter(x => x.getAttribute('data-hm-cell') === l)[0]; return c ? parseFloat(c.querySelector('b').textContent) : NaN; }, label);
  ok(await page.locator('[data-hemolab] [data-hm]').count() === 15 && await page.locator('[data-hemolab] [data-hm-tx]').count() === 18 && await page.locator('[data-hemolab] [data-hm-device]').count() === 3 && await page.locator('[data-hemolab] [data-hm-pos]').count() === 5 && await page.locator('[data-hemolab] canvas').count() === 1, 'the lab: fifteen sliders (PEEP hidden while breathing), eighteen treatments, three devices, five ports, the monitor');
  ok(near(await hmCell('CI'), 3.0, 0.4) && near(await hmCell('PAOP'), 8, 3) && near(await hmCell('TPG'), 6, 3) && near(await hmCell('TAPSE'), 25, 4) && await page.locator('[data-hemolab] [data-hm-sig="ok"]').count() === 1 && await page.locator('[data-hemolab] [data-hm-pos="pa"][aria-selected="true"]').count() === 1, 'the normal patient: CI 3, wedge 8, TPG 6, TAPSE 25, the tip in the PA');
  await page.selectOption('[data-hm-preset]', 'lv'); await page.waitForSelector('[data-hemolab] [data-hm-sig="lv"]');
  ok((await hmCell('CI')) < 2.2 && (await hmCell('PAOP')) > 18 && await page.locator('[data-hemolab] [data-hm-cell="PAOP"].bad').count() === 1 && await page.locator('[data-hemolab] [data-hm-flag="cpo"]').count() === 1 && /IV: cold and wet/.test(await txt('[data-hemolab] .hm-sig-q')), 'LV shock: low index, high wedge in red, the CPO flag, Forrester IV');
  await page.locator('[data-hemolab] [data-hm-pos="paop"]').click(); await page.waitForSelector('[data-hemolab] [data-hm-pos="paop"][aria-selected="true"]');
  ok(await page.locator('[data-hemolab] .hm-balloon.up').count() === 1 && await page.locator('[data-hemolab] .hm-tag.on[data-tag="paop"]').count() === 1, 'wedged: the balloon up, the wedge tag lit');
  await page.locator('[data-hemolab] .hm-tag[data-tag="ra"]').click(); await page.waitForSelector('[data-hemolab] [data-hm-pos="ra"][aria-selected="true"]');
  ok(await page.locator('[data-hemolab] .hm-balloon.up').count() === 0, 'a click on the RA tag moves the catheter back');
  const w0 = await hmCell('PAOP'), ci0 = await hmCell('CI');
  await page.locator('[data-hemolab] [data-hm-tx="dobut"]').click(); await page.waitForSelector('[data-hemolab] [data-hm-note]');
  ok((await hmCell('CI')) > ci0 + 0.3 && (await hmCell('PAOP')) < w0 - 3 && /Dobutamine/.test(await txt('[data-hm-note]')), 'dobutamine in LV shock: the index up, the wedge down, the note says what it did');
  await page.locator('[data-hemolab] [data-hm-device="iabp"]').click(); await page.waitForSelector('[data-hemolab] [data-hm-device="iabp"][aria-pressed="true"]');
  ok(await page.locator('[data-hemolab] .hm-iabp').count() === 1, 'the balloon pump drawn in the aorta');
  await page.selectOption('[data-hm-preset]', 'tamponade'); await page.waitForSelector('[data-hemolab] [data-hm-sig="tamponade"]');
  ok(await page.locator('[data-hemolab] .hm-peri.tamp').count() === 1 && await page.locator('[data-hemolab] [data-hm-flag="equal"]').count() === 1 && Math.abs((await hmCell('RA')) - (await hmCell('PAOP'))) < 5, 'tamponade: the pericardium drawn full, the equalisation flag');
  await page.locator('[data-hemolab] [data-hm-tx="tap"]').click(); await page.waitForSelector('[data-hemolab] [data-hm-sig="ok"]');
  ok((await hmCell('CI')) > 2.5 && await page.locator('[data-hemolab] .hm-peri.tamp').count() === 0, 'the tap: output restored, the pericardium drawn empty');
  await page.selectOption('[data-hm-preset]', 'ecmodist'); await page.waitForSelector('[data-hemolab] [data-hm-sig="ecmodist"]');
  ok(await page.locator('[data-hemolab] .hm-ecmo-ret').count() === 1 && await page.locator('[data-hemolab] .hm-valve.shut').count() === 1 && (await hmCell('Pulse pressure')) < 10, 'VA ECMO drawn, the aortic valve marked shut, no pulse pressure');
  await page.locator('[data-hemolab] [data-hm-vent="ppv"]').click(); await page.waitForSelector('[data-hemolab] [data-hm="peep"]');
  ok(await page.locator('[data-hemolab] [data-hm]').count() === 16, 'ventilated: the PEEP slider appears');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'hemo_cases' })); await page.waitForSelector('[data-hemocases]');
  ok(await page.locator('[data-hm-case]').count() === 11 && await page.locator('[data-hm-a1]').count() === 4 && await page.locator('[data-hm-a2]').count() === 0 && await page.locator('[data-hm-reveal]').count() === 0, 'eleven patients; the first open with four diagnoses and the catheter still hidden');
  await page.locator('[data-hm-a1="hypo"]').click(); await page.waitForSelector('[data-hm-v1="wrong"]');
  ok(await page.locator('[data-hm-reveal]').count() === 1 && await page.locator('[data-hm-rev]').count() === 13 && await page.locator('[data-hm-a2]').count() === 4 && await page.locator('.ec-opt.isbest').count() === 1, 'a wrong diagnosis: the verdict, the catheter numbers revealed, the move question opens');
  await page.locator('[data-hm-a2="fluid"]').click(); await page.waitForSelector('[data-hm-v2="wrong"]');
  ok(await page.locator('[data-hm-after]').count() === 1 && await page.locator('[data-hm-after] th').count() >= 12 && await page.locator('[data-hm-after] td.hm-moved').count() >= 6 && await page.locator('.ec-best').count() === 1 && await page.locator('[data-hm-score="0/1"]').count() === 1 && await page.locator('[data-hm-showlab="lv"]').count() === 1, 'the move: the before/after/best table with the moved numbers marked, the best move explained, the score');
  await page.locator('[data-hm-case="pe"]').click(); await page.waitForSelector('[data-hm-open="pe"]');
  await page.locator('[data-hm-a1="obstructive"]').click(); await page.waitForSelector('[data-hm-v1="best"]');
  await page.locator('[data-hm-a2="lysis"]').click(); await page.waitForSelector('[data-hm-v2="best"]');
  ok(await page.locator('[data-hm-score="1/2"]').count() === 1 && await page.locator('[data-hm-case="pe"].ec-done.best').count() === 1 && await page.locator('[data-hm-after] th').count() >= 12 && await page.locator('[data-hm-after] thead th').count() === 3, 'the best move: two columns only, the tab marked');
  await page.locator('[data-hm-showlab="pe"]').click(); await page.waitForSelector('[data-hemolab] [data-hm-sig="obstructive"]');
  ok((await hmCell('PVR')) > 5 && /Sudden collapse/.test(await txt('[data-hm-note]')), '“Open in the lab” loads the scenario’s patient');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'hemo_cases' })); await page.waitForSelector('[data-hemocases]');
  ok(await page.locator('[data-hm-score="1/2"]').count() === 1, 'the answers survive leaving and returning');

  // ---- ICU infusions
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'drips_vaso' })); await page.waitForSelector('[data-dripref="vaso"]');
  ok(await page.locator('#learn-cat').inputValue() === 'drips' && await page.locator('.ln-btn[data-topic]').count() === 10 && await page.locator('[data-dr-card]').count() === 7 && await page.locator('[data-dr-card="norepi"].open').count() === 1 && await page.locator('[data-dr-card="vaso"].open').count() === 0, 'the infusions area: ten topics; seven vasopressor cards with norepinephrine open');
  ok(/SOAP II/.test(await txt('[data-dr-card="norepi"]')) && /0\.05 mcg\/kg\/min/.test(await txt('[data-dr-card="norepi"] [data-dr-cell="Start"]')) && /1 mcg\/kg\/min/.test(await txt('[data-dr-card="norepi"] [data-dr-cell="Max"]')), 'the norepinephrine card: start 0.05, max 1, SOAP II');
  await page.locator('[data-dr-toggle="vaso"]').click(); await page.waitForSelector('[data-dr-card="vaso"].open');
  ok(/VASST/.test(await txt('[data-dr-card="vaso"]')) && /0\.03/.test(await txt('[data-dr-card="vaso"] [data-dr-cell="Start"]')) && /fixed/i.test(await txt('[data-dr-card="vaso"] [data-dr-cell="Titrate"]')), 'vasopressin opens: a fixed 0.03 U/min, VASST');
  await page.locator('[data-dr-all]').click(); await page.waitForTimeout(100);
  ok(await page.locator('[data-dr-card].open').count() === 7, 'open all');
  await page.locator('[data-dr-card="angio"] [data-dr-calc]').click(); await page.waitForSelector('[data-dripcalc="angio"]');
  ok(/ng\/kg\/min/.test(await txt('[data-dr-pump]')) && /20/.test(await txt('[data-dr-pump] [data-dr-dose]')), '“Open in the calculator” loads angiotensin II at 20 ng/kg/min');
  await page.selectOption('[data-dr-drug]', 'norepi'); await page.waitForSelector('[data-dripcalc="norepi"]');
  await page.locator('[data-dr-kg]').fill('80'); await page.locator('[data-dr-kg]').dispatchEvent('change'); await page.waitForTimeout(100);
  await page.locator('[data-dr-dosein]').fill('0.1'); await page.locator('[data-dr-dosein]').dispatchEvent('change'); await page.waitForTimeout(100);
  ok(/^30/.test(await txt('[data-dr-pump] [data-dr-rate]')) && /0\.1 × 80 kg × 60 min ÷ 16/.test(await txt('[data-dr-formula]')), 'norepinephrine 0.1 mcg/kg/min at 80 kg and 16 mcg/mL = 30 mL/h, with the arithmetic shown');
  await page.locator('[data-dr-ratein]').fill('60'); await page.locator('[data-dr-ratein]').dispatchEvent('change'); await page.waitForTimeout(100);
  ok(/^0\.2/.test(await txt('[data-dr-pump] [data-dr-dose]')) && await page.locator('[data-dr-ladder] tr.dr-now').count() === 1, 'rate to dose: 60 mL/h = 0.2 mcg/kg/min; the ladder marks the step');
  await page.locator('[data-dr-dosein]').fill('2'); await page.locator('[data-dr-dosein]').dispatchEvent('change'); await page.waitForTimeout(100);
  ok(/ABOVE MAX/.test(await txt('[data-dr-pump]')), 'a dose above the ceiling alarms on the pump');
  await page.locator('[data-dr-vis="vaso"]').fill('0.04'); await page.locator('[data-dr-vis="vaso"]').dispatchEvent('change'); await page.waitForTimeout(100);
  ok(/NEE 0\.40/.test(await txt('[data-dr-nee]')), 'the vasopressor load: norepinephrine 0.3 + vasopressin 0.04 = NEE 0.40');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'drips_cases' })); await page.waitForSelector('[data-dripcases]');
  ok(await page.locator('[data-dr-case]').count() === 11 && await page.locator('[data-dr-opt]').count() === 4, 'eleven drip scenarios, four options');
  await page.locator('[data-dr-opt="dopa"]').click(); await page.waitForSelector('[data-dr-verdict="wrong"]');
  ok(await page.locator('.ec-opt.isbest').count() === 1 && /What happened/.test(await txt('[data-dr-verdict]')) && await page.locator('[data-dr-score="0/1"]').count() === 1, 'a wrong answer: the best move and the outcome shown, the score kept');
  await page.locator('[data-dr-case="ards"]').click(); await page.waitForSelector('[data-dr-open="ards"]');
  await page.locator('[data-dr-opt="cis"]').click(); await page.waitForSelector('[data-dr-verdict="best"]');
  ok(await page.locator('[data-dr-score="1/2"]').count() === 1, 'the paralytic for the fighting ARDS is best');

  // ---- echo & POCUS
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'echo_views' })); await page.waitForSelector('[data-echoatlas="11"]');
  await page.waitForTimeout(800);
  ok(await page.locator('#learn-cat').inputValue() === 'echo' && await page.locator('.ln-btn[data-topic]').count() === 9 && await page.locator('[data-eh-pick]').count() === 11 && await page.locator('[data-eh-view] canvas.eh-atlascv').count() === 1 && await page.locator('[data-eh-file]').count() === 1, 'the echo area: nine topics; eleven view cards, each rendered with a slot for your own image');
  ok(await page.evaluate(() => { const c = document.querySelector('[data-eh-view="plax"] canvas'); const ctx = c.getContext('2d'); const d = ctx.getImageData(0, 0, c.width, c.height).data; let bright = 0; for (let i = 0; i < d.length; i += 16) if (d[i] > 150) bright++; return bright > 200; }), 'the PLAX card is painted (bright walls on a black sector)');
  await page.locator('[data-eh-pick="a4c"]').click(); await page.waitForSelector('[data-eh-view="a4c"]');
  await page.locator('[data-eh-open="a4c"]').click(); await page.waitForSelector('[data-echolab]');
  ok(await page.locator('[data-eh-target] option:checked').evaluate(e => e.value) === 'a4c' && await page.locator('[data-eh-win="apical"][aria-checked="true"]').count() === 1 && await page.locator('[data-eh-got="false"]').count() === 1 && await page.locator('[data-eh-hint]').count() >= 1, '“Obtain it in the lab” opens the lab at the apical window, off-axis, with hints');
  await page.locator('[data-eh-snap]').click(); await page.waitForSelector('[data-eh-got="true"]');
  await page.waitForTimeout(500);
  ok(/LV/.test(await txt('[data-eh-seen]')) && /RV/.test(await txt('[data-eh-seen]')) && /LA/.test(await txt('[data-eh-seen]')) && await page.locator('[data-eh-score="100"]').count() === 1, 'the target obtained: all four chambers on the screen, score 100');
  await page.locator('[data-eh="rot"]').fill('40'); await page.locator('[data-eh="rot"]').dispatchEvent('input'); await page.waitForTimeout(300);
  ok(await page.locator('[data-eh-got="false"]').count() === 1 && /Rotate the marker 40° clockwise/.test(await txt('[data-eh-hint]')), 'rotating 40° loses the view and the hint says to rotate back clockwise');
  await page.locator('[data-eh="rot"]').fill('0'); await page.locator('[data-eh="rot"]').dispatchEvent('input'); await page.waitForTimeout(200);
  await page.locator('[data-eh="tilt"]').fill('20'); await page.locator('[data-eh="tilt"]').dispatchEvent('input'); await page.waitForTimeout(300);
  ok(/Tilt/.test(await txt('[data-eh-hint]')), 'a tilt error gives a tilt hint');
  await page.locator('[data-eh-win="subcostal"]').click(); await page.waitForSelector('[data-eh-win="subcostal"][aria-checked="true"]');
  await page.waitForTimeout(400);
  ok(/liver/i.test(await txt('[data-eh-seen]')) && /subcostal window/i.test(await txt('[data-eh-hint]')) === false && await page.locator('[data-eh-probe]').count() === 1, 'the subcostal window: the liver appears; the probe is drawn on the torso');
  await page.selectOption('[data-eh-path]', 'eff'); await page.waitForSelector('[data-eh-pathnote]');
  await page.waitForTimeout(500);
  ok(/effusion/i.test(await txt('[data-eh-seen]')) && /echo-free band/.test(await txt('[data-eh-pathnote]')), 'the effusion heart: an effusion on the screen and the note');
  await page.locator('[data-eh-labels]').click(); await page.waitForTimeout(300);
  await page.locator('[data-eh-beat]').click(); await page.waitForTimeout(300);
  ok(await page.locator('[data-eh-labels]').isChecked() === false && await page.locator('[data-eh-beat]').isChecked() === false, 'labels and the beat can be switched off');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'echo_quiz' })); await page.waitForSelector('[data-echoquiz]');
  await page.waitForTimeout(400);
  ok(await page.locator('[data-eh-q="0"] [data-eh-opt]').count() === 4 && await page.locator('[data-eh-q="1"]').count() === 0, 'the quiz: four views offered, the structure question waits');
  const right = await page.evaluate(() => { const o = Array.from(document.querySelectorAll('[data-eh-q="0"] [data-eh-opt]')); return o.length; });
  await page.locator('[data-eh-q="0"] [data-eh-opt]').first().click(); await page.waitForSelector('[data-eh-q="0"] [data-eh-verdict]');
  ok(right === 4 && (await page.locator('[data-eh-q="1"] [data-eh-opt]').count() === 4 || await page.locator('[data-eh-q="2"] [data-eh-opt]').count() === 4), 'answering opens the next question');
  for (let i = 1; i < 3; i++) { if (await page.locator('[data-eh-q="' + i + '"] [data-eh-opt]').count()) { await page.locator('[data-eh-q="' + i + '"] [data-eh-opt]').first().click(); await page.waitForTimeout(250); } }
  ok(await page.locator('[data-eh-next]').count() === 1 && /of \d right/.test(await txt('[data-eh-qscore]')), 'a round completes with the score and a next picture');

  // ---- v8.2: the real CT stack inside the CT topic
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'ct' })); await page.waitForSelector('[data-ctreal]');
  await page.waitForTimeout(900);
  ok(await page.locator('[data-cr-series]').count() === 4 && await page.locator('[data-cr-series="chest"][aria-selected="true"]').count() === 1 && /Carina/.test(await txt('[data-cr-level]')) && await page.locator('[data-cr-preset]').count() >= 11, 'the real CT: four series, opens on the carina of the chest stack with eleven labelled levels');
  ok(await page.locator('[data-cr-item]').count() >= 10 && (await page.locator('[data-cr-item]').allInnerTexts()).some(t => /Ascending aorta/.test(t)), 'the carina level lists its labels');
  await page.locator('.cr-canvas').scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  const crBox = await page.locator('.cr-canvas').boundingBox();
  await page.mouse.move(crBox.x + (150 + 222) * crBox.width / 748, crBox.y + 122 * crBox.height / 326); await page.waitForTimeout(250);
  ok(await txt('[data-cr-hover]') === 'Ascending aorta', 'hovering the ascending aorta on the real slice names it');
  await page.locator('[data-cr-win="lung"]').click(); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const c = document.querySelector('.cr-canvas'); const d = c.getContext('2d').getImageData(200, 150, 120, 100).data; let mid = 0, n = 0; for (let i = 0; i < d.length; i += 16) { n++; if (d[i] > 40 && d[i] < 140) mid++; } return mid / n; }) > 0.5, 'the lung window turns the right lung from black to textured grey on the real pixels');
  await page.locator('[data-cr-series="cta"]').click(); await page.waitForSelector('[data-cr-series="cta"][aria-selected="true"]');
  await page.waitForTimeout(600);
  ok(/four chambers/.test(await txt('[data-cr-level]')) && await page.locator('[data-cr-preset]').count() >= 7, 'the cardiac CTA opens on its four-chamber level');
  await page.locator('[data-crq-start]').click(); await page.waitForSelector('[data-crq="on"]');
  ok(/Tap:/.test(await txt('[data-crq]')), 'the quiz on the real slices asks for a structure');
  await page.locator('[data-crq-stop]').click(); await page.waitForTimeout(100);
  await page.locator('[data-cr-series="sag"]').click(); await page.waitForTimeout(500);
  ok(/Sagittal/.test(await txt('[data-cr-level]')) && await page.locator('[data-cr-preset]').count() === 2, 'the sagittal reformats carry two labelled planes');

  // ---- v8.2: the real echo volume in the atlas and the real lab
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'echo_views' })); await page.waitForSelector('[data-echoatlas]');
  let realN = 0, noneN = 0;
  for (const id of await page.$$eval('[data-eh-pick]', b => b.map(x => x.getAttribute('data-eh-pick')))) { await page.click('[data-eh-pick="' + id + '"]'); await page.waitForSelector('[data-eh-more="' + id + '"]'); realN += await page.locator('[data-ehr-slot]').count(); noneN += await page.locator('[data-ehr-none]').count(); }
  await page.click('[data-eh-pick="a4c"]'); await page.waitForSelector('[data-eh-more="a4c"]'); await page.$eval('[data-eh-more="a4c"]', d => { if (!d.open) d.querySelector('summary').click(); });
  await page.waitForFunction(() => !!document.querySelector('[data-ehr-slot="a4c"] canvas'), null, { timeout: 60000 });
  await page.waitForTimeout(3500);
  ok(realN === 6 && noneN === 5, 'six atlas views carry a real loop; the other five say why not (' + realN + '/' + noneN + ')');
  ok(await page.evaluate(() => { const c = document.querySelector('[data-ehr-slot="a4c"] canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let bright = 0; for (let i = 0; i < d.length; i += 16) if (d[i] > 120) bright++; return bright > 200; }), 'the real four-chamber loop has drawn');
  await page.locator('[data-ehr-slot="a4c"] [data-ehr-play]').click(); await page.waitForTimeout(200);
  ok(await txt('[data-ehr-slot="a4c"] [data-ehr-play]') === '▶', 'the loop pauses');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'echo_lab' })); await page.waitForSelector('[data-echoreal]');
  await page.waitForTimeout(1200);
  ok(await page.locator('[data-ehr-target] option').count() === 7 && await page.locator('[data-ehr-got="false"]').count() === 1 && /Rotate/.test(await txt('[data-ehr-hint]')), 'the real lab: seven targets, starts off-axis with a rotation hint');
  await page.locator('[data-ehr-snap]').click(); await page.waitForSelector('[data-ehr-got="true"]');
  ok(/Obtained: Apical four-chamber/.test(await txt('[data-ehr-score]')), 'snapping to the target obtains the real four-chamber');
  await page.selectOption('[data-ehr-target]', 'sax_pm'); await page.waitForTimeout(200);
  ok(/across the beam/.test(await txt('[data-ehr-hint]')), 'a short-axis target asks for the C-plane');
  await page.locator('[data-ehr-mode="c"]').click(); await page.locator('[data-ehr="c"]').fill('72'); await page.locator('[data-ehr="c"]').dispatchEvent('input'); await page.waitForTimeout(400);
  ok(await page.locator('[data-ehr-got="true"]').count() === 1 && /Plane across the beam at 72 mm/.test(await txt('[data-ehr-readout]')), 'the papillary C-plane at 72 mm is obtained');

  // ---- v8.3: the heart in 3-D — the atlas panel follows the card, the lab's follows the sliders, the real lab paints the real picture
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'echo_views' })); await page.waitForSelector('[data-h3-atlas]');
  await page.locator('[data-eh-pick="plax"]').click();   // the atlas remembers the last view picked
  await page.waitForTimeout(2500);
  ok(await page.locator('[data-h3-atlas] .h3-canvas').count() === 1 && /1\. Parasternal long axis/.test(await txt('[data-h3-title]')) && await page.locator('[data-h3-atlas][data-h3-current="plax"]').count() === 1 && await page.locator('[data-eh-3d]').count() === 11 && await page.locator('[data-eh-atlaslink]').count() === 1, 'the atlas opens with the 3-D heart on the first view; every view is one press away, and the card links the POCUS Atlas');
  ok(await page.evaluate(() => { const i = document.querySelector('[data-h3-atlas] .h3-panel').inst; return i && i.build.done >= 1 && i.meshes.lv.mesh.geometry.index.count > 3000 && i.meshes.rv && i.meshes.ao && i.rings.mv && i.plane.visible && i.hasImage && i.valves.mv && i.valves.av0 && Object.keys(i.decor).indexOf('lad') >= 0 && i.chest.children.length > 20; }), 'the model is meshed (LV wall > 1000 triangles), the valves have leaflets, the coronaries and the ribs are there, and the picture is on the plane');
  await page.locator('[data-eh-3d="a4c"]').click(); await page.waitForTimeout(900);
  ok(/5\. Apical four-chamber/.test(await txt('[data-h3-title]')) && await page.locator('[data-h3-atlas][data-h3-current="a4c"]').count() === 1 && await page.locator('.eh-card[data-eh-view="a4c"]').count() === 1 && await page.locator('[data-eh-pick="a4c"][aria-checked="true"]').count() === 1 && await page.evaluate(() => { const i = document.querySelector('[data-h3-atlas] .h3-panel').inst; return i.params.win === 'apical' && i.target.fan === 45; }), 'picking a view moves the plane to the apical window and shows its card');
  await page.locator('[data-eh-next]').click(); await page.locator('[data-eh-pick="sc4"]').click(); await page.waitForTimeout(1200);
  ok(await page.locator('[data-h3-atlas][data-h3-current="sc4"]').count() === 1 && /Subcostal/.test(await txt('[data-h3-title]')) && await page.locator('[data-eh-text="sc4"]').count() === 1, 'the next button and the picker both move the plane and the text');
  await page.locator('[data-h3-atlas] [data-h3-opt="cut"]').click(); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const i = document.querySelector('[data-h3-atlas] .h3-panel').inst; return !i.opts.cut && !i.meshes.lv.mat.transparent && i.meshes.lv.mat.clippingPlanes.length === 0 && !i.meshes.lv.cap.visible && i.plane.material.depthTest === false; }), 'turning the cut-away off shows the whole heart, drops the caps and lets the picture show through it');
  await page.locator('[data-h3-atlas] [data-h3-opt="cut"]').click(); await page.locator('[data-h3-atlas] [data-h3-opt="screen"]').click(); await page.waitForTimeout(1200);
  ok(await page.evaluate(() => { const i = document.querySelector('[data-h3-atlas] .h3-panel').inst; return i.opts.cut && !i.opts.screen && i.meshes.lv.mat.clippingPlanes.length === 1 && i.camera.up.y > 0.99; }), 'cut-away back on; head-up re-aims the camera with the head up');
  // a clip of your own on a card, with its credit
  const gif = Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
  await page.locator('[data-eh-pick="plax"]').click(); await page.waitForSelector('[data-eh-more="plax"]'); await page.$eval('[data-eh-more="plax"]', d => { if (!d.open) d.querySelector('summary').click(); });
  await page.locator('[data-eh-file="plax"]').setInputFiles({ name: 'atlas-plax.gif', mimeType: 'image/gif', buffer: gif }); await page.waitForSelector('[data-eh-own="plax"] .eh-ownimg');
  await page.locator('[data-eh-credit="plax"]').fill('The POCUS Atlas (CC BY-NC 4.0)'); await page.locator('[data-eh-credit="plax"]').dispatchEvent('change'); await page.waitForSelector('[data-eh-creditline="plax"]');
  ok(/POCUS Atlas/.test(await txt('[data-eh-creditline="plax"]')) && await page.locator('[data-eh-own="plax"] img.eh-ownimg').count() === 1 && await page.locator('[data-eh-clear="plax"]').count() === 1, 'a GIF added to the PLAX card is shown with its credit line');
  await page.locator('[data-eh-clear="plax"]').click(); await page.waitForTimeout(400);
  ok(await page.locator('[data-eh-own="plax"] .eh-ownimg').count() === 0, 'and can be removed');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'echo_lab' })); await page.waitForSelector('[data-eh-3d] .h3-canvas');
  await page.waitForTimeout(1500);
  await page.locator('[data-eh="tilt"]').fill('20'); await page.locator('[data-eh="tilt"]').dispatchEvent('input'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const i = document.querySelector('[data-eh-3d] .h3-panel').inst; return i.params.tilt === 20 && i.hasImage && i.extT !== null && i.target.title.length > 3 && i.target.fan === 45; }), 'the lab’s 3-D heart takes the sliders and the live picture');
  await page.locator('[data-echoreal]').scrollIntoViewIfNeeded(); await page.waitForSelector('[data-ehr-3d] .h3-canvas');
  await page.locator('[data-ehr-mode="b"]').click(); await page.waitForTimeout(2500);
  ok(await page.evaluate(() => { const i = document.querySelector('[data-ehr-3d] .h3-panel').inst; return i.target && i.target.fan === 36 && i.hasImage; }), 'the real lab paints the real plane on the model heart');
  await page.locator('[data-ehr-mode="c"]').click(); await page.waitForTimeout(600);
  ok(await page.evaluate(() => { const i = document.querySelector('[data-ehr-3d] .h3-panel').inst; return i.target.square === true && i.target.fan === 0; }), 'a short axis becomes a square plane across the beam');

  // ---- v8.4: the conduction bench — every element a dial, the leads as sums, the reading from the traces
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'conduction' })); await page.waitForSelector('[data-condlab]');
  await page.waitForTimeout(400);
  ok(await page.locator('[data-cd-presetsel] option').count() === 29 && await page.locator('[data-cd-el] option').count() === 20 && /Sinus rhythm 72/.test(await txt('[data-cd-line="Rhythm"]')) && /narrow/.test(await txt('[data-cd-line="QRS"]')) && await page.locator('[data-cd-part="sep"]').count() === 1 && await page.locator('[data-cd-sum="V1"]').count() === 1, 'the bench opens normal: 29 presets, 20 elements, a reading, and lead V1 drawn as the sum of its parts');
  await page.selectOption('[data-cd-presetsel]', 'lbbb'); await page.waitForTimeout(500);
  ok(/left bundle branch block pattern/.test(await txt('[data-cd-line="QRS"]')) && +(await page.getAttribute('[data-cd-reads] [data-cd-qrs]', 'data-cd-qrs')) >= 120 && await page.locator('.ecg-path.blocked[data-path="lbb"]').count() === 1 && await page.locator('[data-block="lbb"]:visible').count() === 1, 'LBBB preset: the reading finds the pattern from the traces, the left bundle is crossed on the heart');
  await page.selectOption('[data-cd-presetsel]', 'normal'); await page.waitForTimeout(300);
  await page.$eval('[data-cd-pick="rbb"]', e => e.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await page.waitForTimeout(300);
  ok(await page.locator('[data-cd-panel="rbb"]').count() === 1 && await page.locator('[data-cd-el]').inputValue() === 'rbb', 'clicking the right bundle on the heart selects it');
  await page.$eval('[data-cd-panel="rbb"] input[type=range]', (e) => { e.value = '1'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await page.waitForTimeout(500);
  ok(/right bundle branch block pattern/.test(await txt('[data-cd-line="QRS"]')) && +(await page.getAttribute('[data-cd-reads] [data-cd-qrs]', 'data-cd-qrs')) >= 120 && /Your own settings/.test(await txt('[data-cd-note]')), 'blocking it writes an RBBB that the reading recognises');
  await page.$eval('[data-cd-panel="rbb"] input[type=range]', (e) => { e.value = '0.5'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await page.waitForTimeout(500);
  ok(/incomplete right bundle/.test(await txt('[data-cd-line="QRS"]')) && await page.locator('.ecg-path.delayed[data-path="rbb"]').count() === 1, 'half a block is an incomplete RBBB and a dashed path');
  await page.selectOption('[data-cd-lead]', 'V6'); await page.waitForTimeout(400);
  ok(await page.locator('[data-cd-sum="V6"]').count() === 1 && await page.locator('[data-cd-part="rv"]').count() === 1, 'the parts panel follows the lead');
  await page.selectOption('[data-cd-presetsel]', 'normal'); await page.selectOption('[data-cd-el]', 'lvi'); await page.waitForTimeout(300);
  await page.$eval('[data-cd-panel="lvi"] [data-cd-row="injury"] input', (e) => { e.value = '0.8'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await page.waitForTimeout(500);
  ok(/II, III, aVF/.test(await txt('[data-cd-line="ST elevation"]')) && /inferior/.test(await txt('[data-cd-line="ST elevation"]')) && await page.locator('.ecg-reg.injured[data-region="lvi"]').count() === 1, 'injuring the inferior wall lifts the ST in II, III, aVF');
  await page.selectOption('[data-cd-el]', 'av'); await page.waitForTimeout(200); await page.selectOption('[data-cd-avmode]', 'complete'); await page.waitForTimeout(500);
  ok(/complete heart block/.test(await txt('[data-cd-line="Rhythm"]')) && /junctional escape/.test(await txt('[data-cd-line="Rhythm"]')), 'complete block at the node: a junctional escape and dissociated P waves');
  await page.selectOption('[data-cd-presetsel]', 'vt'); await page.waitForTimeout(500);
  ok(/ventricular tachycardia/.test(await txt('[data-cd-line="Rhythm"]')) && /ventricular origin/.test(await txt('[data-cd-line="QRS"]')), 'VT: wide complexes of ventricular origin with AV dissociation');
  // ---- v8.4: drips on the circuit
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'ecmo_lab' })); await page.waitForSelector('[data-ecmolab]'); await page.waitForTimeout(300);
  ok(await page.locator('[data-ec-drip]').count() === 10 && await page.locator('[data-ec-preset] optgroup:last-of-type option').count() === 18, 'ten drips with dials and eighteen presets');
  await page.selectOption('[data-ec-preset]', 'va_pressor'); await page.waitForTimeout(500);
  const qn0 = parseFloat(await txt('[data-ec-cell="Native output"] b'));
  ok(/norepinephrine-equivalent 0\.40/.test(await txt('[data-ec-dripread]')) && /SVR ×1\.[4-7]/.test(await txt('[data-ec-dripread]')) && await page.locator('[data-ec-drip="ne"].on').count() === 1 && /MAP/.test(await txt('[data-tile="MAP"]')), 'the pressor preset: norepinephrine 0.4 shows its effects and the MAP on the console');
  await page.$eval('[data-ec-dose="dobu"]', (e) => { e.value = '10'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await page.waitForTimeout(500);
  ok(parseFloat(await txt('[data-ec-cell="Native output"] b')) > qn0 + 0.3 && /contractility ×1\.[5-9]/.test(await txt('[data-ec-dripread]')), 'dobutamine on top raises the native ejection');
  await page.locator('[data-ec-dripsoff]').click(); await page.waitForSelector('[data-ecmolab]'); await page.waitForTimeout(300);
  ok(/norepinephrine-equivalent 0\.00/.test(await txt('[data-ec-dripread]')) && await page.locator('[data-ec-drip].on').count() === 0, 'all drips off');
  await page.selectOption('[data-ec-preset]', 'vv_rv'); await page.waitForTimeout(500);
  const coRv = parseFloat(await txt('[data-ec-cell="Cardiac output"] b'));
  await page.$eval('[data-ec-dose="ino"]', (e) => { e.value = '20'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await page.waitForTimeout(500);
  ok(coRv < 3.5 && parseFloat(await txt('[data-ec-cell="Cardiac output"] b')) > coRv + 0.8 && /PVR ×0\.[4-7]/.test(await txt('[data-ec-dripread]')), 'VV RV failure: inhaled NO lowers the PVR and the output recovers');
  // ---- v8.4: the home as the fellow's guide
  await page.evaluate(() => window.__pft.setMode('home')); await page.waitForSelector('[data-home-grid]');
  ok(await page.locator('[data-home-grid] > [data-home-tile]').count() === 12 && await page.locator('[data-home-record] > [data-home-tile]').count() === 3 && await page.locator('[data-home-tile][data-home-setting="icu"]').count() === 7 && await page.locator('[data-home-prog="nbe"]').count() === 1 && await page.locator('[data-home-tile="boards"]').count() === 1 && await page.locator('[data-home-tile="log"]').count() === 1 && await page.locator('[data-home-lab="conduction"]').count() === 1 && /fellow’s guide/.test(await txt('.home-hero .kicker')), 'the home page is the guide: twelve tiles in one grid, the record (the boards, the logbook), the bench');

  // ---- v8.2: the echo logbook
  await page.evaluate(() => { try { localStorage.removeItem('pcd.echolog.v1'); } catch (e) {} window.__pft.setMode('learn', { topic: 'echo_log' }); }); await page.waitForSelector('[data-el-form]');
  ok(await page.locator('[data-el-count]').count() === 5 && /0 \/ 150/.test(await txt('[data-el-count="tte"]')) && await page.locator('[data-el-m]').count() === 21, 'the logbook: five counters, twenty-one measurement fields');
  await page.locator('[data-el="indication"]').fill('Shock — fluid responsive?');
  for (const kv of [['lvotD', '2.0'], ['lvotVti', '20'], ['hr', '80'], ['trv', '3'], ['rap', '8']]) { await page.locator('[data-el-m="' + kv[0] + '"]').fill(kv[1]); }
  await page.waitForTimeout(200);
  ok(/62\.8 mL/.test(await txt('[data-el-der="sv"]')) && /5 L\/min/.test(await txt('[data-el-der="co"]')) && /44 mmHg/.test(await txt('[data-el-der="rvsp"]')) && /will count toward the TTE/.test(await txt('[data-el-qual]')), 'the derived numbers appear as you type: SV 62.8 mL, CO 5 L/min, RVSP 44');
  await page.locator('[data-el="synthetic"]').check(); await page.waitForTimeout(100);
  ok(/Will not count: practice/.test(await txt('[data-el-qual]')), 'a practice study is flagged as not counting');
  await page.locator('[data-el="synthetic"]').uncheck();
  await page.locator('[data-el-save]').click(); await page.waitForSelector('[data-el-table="1"]');
  ok(/Saved EC-/.test(await txt('[data-el-msg]')) && /1 \/ 150/.test(await txt('[data-el-count="tte"]')) && await txt('[data-el-count="all"] .el-v') === '1', 'saving moves to the log and counts the study');
  const code = await page.locator('[data-el-row]').first().getAttribute('data-el-row');
  await page.locator('[data-el-open="' + code + '"]').click(); await page.waitForSelector('[data-el-view]');
  ok(/Counts toward the TTE target/.test(await txt('[data-el-view]')) && /SV 62\.8 mL/.test(await txt('[data-el-view]')), 'the study card shows the derived numbers');
  await page.locator('[data-el-close]').click(); await page.locator('[data-el-delete="' + code + '"]').click(); await page.waitForTimeout(200);
  ok(await page.locator('[data-el-table="0"]').count() === 1 && await txt('[data-el-count="all"] .el-v') === '0', 'a soft delete hides the study and uncounts it');
  await page.locator('[data-el-fdeleted]').check(); await page.waitForTimeout(200); await page.locator('[data-el-restore="' + code + '"]').click(); await page.waitForTimeout(200);
  ok(await txt('[data-el-count="all"] .el-v') === '1', 'restore brings it back');
  await page.locator('[data-el-tab="export"]').click(); await page.waitForSelector('[data-el-csv]');
  ok(await page.locator('[data-el-nbe]').count() === 2 && await page.locator('[data-el-backup]').count() === 1 && /26 January 2027/.test(await txt('.el-cert')), 'the export tab: CSV, the NBE lists, the packet, backup and restore, the certification dates');
  await page.evaluate(() => { try { localStorage.removeItem('pcd.echolog.v1'); } catch (e) {} });

  // ---- v8.2: bedside monitoring
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'mon_art' })); await page.waitForSelector('[data-monart]');
  ok(await page.locator('#learn-cat').inputValue() === 'monitor' && await page.locator('.ln-btn[data-topic]').count() === 21 && await page.locator('[data-ma-fault]').count() === 7, 'the monitoring area: twenty-one topics; the arterial lab offers seven states of the line');
  ok(await page.locator('[data-ma-verdict="optimal"]').count() === 1 && await txt('[data-ms-tile="ABP"] .vsc-v') === '120/70', 'the ideal line shows 120/70');
  await page.locator('[data-ma-fault="bubble"]').click(); await page.waitForSelector('[data-ma-verdict="overdamped"]');
  const abp = await txt('[data-ms-tile="ABP"] .vsc-v');
  ok(+abp.split('/')[0] < 112 && +abp.split('/')[1] > 72 && /slurred/.test(await txt('.mon-analysis')), 'an air bubble: overdamped, systolic low, diastolic high');
  await page.locator('[data-ma-flush]').click(); await page.waitForTimeout(100);
  ok(/fast-flush test running/.test(await txt('.vsc-mode')), 'the fast-flush test runs');
  await page.locator('[data-ma-quiz]').click(); await page.waitForSelector('[data-ma-ans]');
  await page.locator('[data-ma-ans="optimal"]').click(); await page.waitForSelector('[data-ma-result]');
  ok(/Right|No —/.test(await txt('[data-ma-result]')), 'the line quiz gives a verdict');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'mon_capno' })); await page.waitForSelector('[data-moncapno]');
  ok(await page.locator('[data-mc-shape]').count() === 12, 'twelve capnogram shapes');
  await page.locator('[data-mc-shape="rebreath"]').click(); await page.waitForSelector('[data-mc-note="rebreath"]');
  ok(/baseline never reaches zero/.test(await txt('[data-mc-note]')) && await page.locator('[data-ms-tile="FiCO2"].alarm').count() === 1, 'rebreathing: the note and the inspired CO2 alarm');
  await page.locator('[data-mc-quiz]').click(); await page.waitForSelector('[data-mc-opt]');
  ok(await page.locator('[data-mc-opt]').count() === 4 && await page.locator('[data-mc-shape]').count() === 0, 'the capnography quiz hides the shape names');
  await page.locator('[data-mc-opt]').first().click(); await page.waitForSelector('[data-mc-verdict]');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'mon_cvp' })); await page.waitForSelector('[data-moncvp]');
  await page.locator('[data-mv-shape="tamp"]').click(); await page.waitForSelector('[data-mv-note="tamp"]');
  ok(/absent y descent/.test(await txt('[data-mv-note]')) && await txt('[data-ms-tile="y descent"] .vsc-v') === 'absent', 'tamponade: the y descent is absent');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'mon_icp' })); await page.waitForSelector('[data-monicp]');
  await page.locator('[data-mi-shape="lowcomp"]').click(); await page.waitForSelector('[data-mi-note="lowcomp"]');
  ok(/P2 towers over P1/.test(await txt('[data-mi-note]')) && /compliance lost/.test(await txt('[data-ms-tile="P2 : P1"]')), 'reduced compliance: P2 > P1 named');
  await page.locator('[data-mi-map]').fill('60'); await page.locator('[data-mi-map]').dispatchEvent('input'); await page.waitForTimeout(100);
  ok(await txt('[data-ms-tile="CPP"] .vsc-v') === '42', 'the CPP tile follows the MAP slider (60 − 18 = 42)');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'mon_screen' })); await page.waitForSelector('[data-monscreen]');
  ok(await page.locator('[data-ms-case]').count() === 7 && await page.locator('[data-ms-valid="true"]').count() === 1 && /conditions met/.test(await txt('[data-ms-cond]')), 'seven screen scenarios; the first meets the conditions');
  await page.locator('[data-ms-case="af"]').click(); await page.waitForSelector('[data-ms-open="af"]');
  ok(await page.locator('[data-ms-valid="false"]').count() === 1 && /irregular rhythm/.test(await txt('[data-ms-cond]')) && await page.locator('[data-ms-tile="SVV"].alarm').count() === 1, 'atrial fibrillation: the SVV tile alarms and the condition is named');
  await page.locator('[data-ms-test="plr"]').click(); await page.waitForSelector('[data-ms-result="plr"]');
  ok(/Not preload-responsive/.test(await txt('[data-ms-result]')), 'the PLR in AF is negative');
  await page.locator('[data-ms-opt="plr"]').click(); await page.waitForSelector('[data-ms-verdict="best"]');
  ok(/1\/1/.test(await page.locator('[data-ms-score]').getAttribute('data-ms-score')), 'the best move scores');
  await page.locator('[data-ms-case="rv"]').click(); await page.waitForSelector('[data-ms-open="rv"]');
  await page.locator('[data-ms-test="bolus"]').click(); await page.waitForSelector('[data-ms-result="bolus"]');
  ok(/descending limb/.test(await txt('[data-ms-result]')) && /−|-\d/.test(await txt('[data-ms-result]')), 'a bolus to the failing RV lowers the stroke volume');
  await page.evaluate(() => window.__pft.setMode('home')); await page.waitForSelector('[data-home]');
  ok(await page.locator('[data-home-tile="monitor"]').count() === 1 && await page.locator('[data-home-lab="mon_screen"]').count() === 1, 'the home page has the monitoring tile and its lab chip');

  // ---- conduction and the ECG
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'ecglab' })); await page.waitForSelector('.ecg-lab[data-ecg="normal"]');
  ok(await page.locator('#learn-cat').inputValue() === 'ecg' && (await page.locator('#learn-cat option').allInnerTexts()).some(t => /Cardiac conduction/.test(t)), 'a third Learn area: cardiac conduction & ECG');
  ok(await page.locator('.ecg-paper .ecg-tr').count() === 13 && await page.locator('.ecg-paper .ecg-ll').count() === 13, 'twelve leads and a rhythm strip on paper');
  ok(/PR 160 ms/.test(await txt('.ecg-reads')) && /QRS 76 ms/.test(await txt('.ecg-reads')) && /Axis 41°/.test(await txt('.ecg-reads')), 'normal conduction: PR 160, QRS 76 ms, axis +41°: ' + await txt('.ecg-reads'));
  ok(await page.locator('.ecg-heart .ecg-reg').count() === 10 && await page.locator('.ecg-heart .ecg-path').count() === 10 && await page.locator('.ecg-block:visible').count() === 0, 'the heart drawing has its regions and conduction paths, nothing blocked');
  const M = (fn) => page.evaluate(fn);
  ok(await M(() => { const E = window.PFT_ECG, s = E.sequence(E.SCENARIOS[0], 0), b = [{ p: 0, q: 200 }]; let v1 = -9, v6q = 9; for (let t = 200; t < 300; t += 2) { v1 = Math.max(v1, E.voltageAt('V1', s, b, t)); } for (let t = 200; t < 220; t += 2) v6q = Math.min(v6q, E.voltageAt('V6', s, b, t)); return v1 > 0.2 && v6q < -0.1; }), 'normal: a small r in V1 and a septal q in V6');
  // scrub into the first QRS: regions light up
  await page.locator('[data-ecg-t]').fill('300'); await page.waitForTimeout(150);
  ok(await page.locator('.ecg-heart .ecg-reg.front').count() >= 1, 'at the cursor inside the QRS the depolarising regions are marked');
  // RBBB: wide QRS, rSR′ in V1, blocked right bundle on the drawing; the slider makes it incomplete
  await page.selectOption('#ecg-scn', 'rbbb'); await page.waitForSelector('.ecg-lab[data-ecg="rbbb"]');
  ok(/QRS 15\d ms/.test(await txt('.ecg-reads')) && await page.locator('[data-block="rbb"]:visible').count() === 1 && await page.locator('.ecg-path.blocked[data-path="rbb"]').count() === 1, 'complete RBBB: QRS about 150 ms, the right bundle crossed out');
  ok(await M(() => { const E = window.PFT_ECG, scn = E.SCENARIOS.filter(x => x.id === 'rbbb')[0], s = E.sequence(scn, 1), b = [{ p: 0, q: 200 }]; let late = -9, early = 9; for (let t = 280; t < 340; t += 2) late = Math.max(late, E.voltageAt('V1', s, b, t)); for (let t = 230; t < 260; t += 2) early = Math.min(early, E.voltageAt('V1', s, b, t)); let s6 = 9; for (let t = 280; t < 340; t += 2) s6 = Math.min(s6, E.voltageAt('V6', s, b, t)); let t1 = 9; for (let t = 500; t < 640; t += 4) t1 = Math.min(t1, E.voltageAt('V1', s, b, t)); return late > 0.5 && early < -0.8 && s6 < -0.2 && t1 < -0.2; }), 'RBBB: rSR′ in V1 (late R′), broad S in V6, inverted T in V1');
  await page.locator('[data-ecg-deg]').fill('0.5'); await page.locator('[data-ecg-deg]').dispatchEvent('change'); await page.waitForSelector('.ecg-lab[data-ecg="rbbb"]');
  ok(/incomplete block/.test(await txt('.ecg-degv')) && /QRS (10\d|11\d) ms/.test(await txt('.ecg-reads')), 'half the block: incomplete RBBB with a QRS of 100–119 ms: ' + await txt('.ecg-reads'));
  // LBBB, fascicular blocks, WPW, AV blocks
  await page.selectOption('#ecg-scn', 'lbbb'); await page.waitForSelector('.ecg-lab[data-ecg="lbbb"]');
  ok(/QRS 1[4-7]\d ms/.test(await txt('.ecg-reads')) && await M(() => { const E = window.PFT_ECG, scn = E.SCENARIOS.filter(x => x.id === 'lbbb')[0], s = E.sequence(scn, 1), b = [{ p: 0, q: 200 }]; let q6 = 9, r6 = -9, t6 = 9, t1 = -9; for (let t = 200; t < 226; t += 2) q6 = Math.min(q6, E.voltageAt('V6', s, b, t)); for (let t = 200; t < 380; t += 2) r6 = Math.max(r6, E.voltageAt('V6', s, b, t)); for (let t = 520; t < 680; t += 4) { t6 = Math.min(t6, E.voltageAt('V6', s, b, t)); t1 = Math.max(t1, E.voltageAt('V1', s, b, t)); } return q6 > -0.1 && r6 > 1.2 && t6 < -0.2 && t1 > 0.15; }), 'LBBB: no septal q, broad R in V6, discordant T waves');
  await page.selectOption('#ecg-scn', 'lafb'); await page.waitForSelector('.ecg-lab[data-ecg="lafb"]');
  ok(/Axis -[3-9]\d°/.test(await txt('.ecg-reads')) && /QRS (9\d|1[01]\d) ms/.test(await txt('.ecg-reads')) && await page.locator('[data-block="laf"]:visible').count() === 1, 'LAFB: left axis with a narrow-ish QRS: ' + await txt('.ecg-reads'));
  await page.selectOption('#ecg-scn', 'lpfb'); await page.waitForSelector('.ecg-lab[data-ecg="lpfb"]');
  ok(/Axis (9\d|1[0-7]\d)°/.test(await txt('.ecg-reads')), 'LPFB: right axis: ' + await txt('.ecg-reads'));
  await page.selectOption('#ecg-scn', 'wpw'); await page.waitForSelector('.ecg-lab[data-ecg="wpw"]');
  ok(/PR (9\d|1[01]\d) ms/.test(await txt('.ecg-reads')) && await page.locator('.ecg-path[data-path="ap"]:visible').count() === 1, 'WPW: short PR, the accessory pathway drawn: ' + await txt('.ecg-reads'));
  await page.selectOption('#ecg-scn', 'avb1'); await page.waitForSelector('.ecg-lab[data-ecg="avb1"]');
  await page.locator('[data-ecg-deg]').fill('300'); await page.locator('[data-ecg-deg]').dispatchEvent('change'); await page.waitForSelector('.ecg-lab[data-ecg="avb1"]');
  ok(/PR 300 ms/.test(await txt('.ecg-reads')) && /QRS 76 ms/.test(await txt('.ecg-reads')), 'first-degree block: the slider sets the PR, the QRS is unchanged');
  ok(await M(() => { const E = window.PFT_ECG, scn = E.SCENARIOS.filter(x => x.id === 'mobitz1')[0], s = E.sequence(scn, 0), b = E.beats(scn, s, 10); const prs = b.slice(0, 4).map(x => x.q === null ? null : Math.round(x.q - x.p)); return prs[0] === 160 && prs[1] === 240 && prs[2] === 300 && prs[3] === null; }), 'Wenckebach: PR 160, 240, 300 then a dropped beat');
  ok(await M(() => { const E = window.PFT_ECG, scn = E.SCENARIOS.filter(x => x.id === 'chb')[0], s = E.sequence(scn, 0), b = E.beats(scn, s, 10); const ps = b.filter(x => x.p !== null).length, qs = b.filter(x => x.q !== null).length; return ps >= 11 && qs >= 5 && qs < ps && b.every(x => x.p === null || x.q === null); }), 'complete block: more P waves than QRS complexes and no P conducted');
  await page.selectOption('#ecg-scn', 'chb'); await page.waitForSelector('.ecg-lab[data-ecg="chb"]');
  ok(/atrial 72, ventricular 34/.test(await txt('.ecg-reads')), 'complete block readout names both rates');
  // play moves the cursor
  await page.selectOption('#ecg-scn', 'normal'); await page.waitForSelector('.ecg-lab[data-ecg="normal"]');
  const cx0 = +(await page.locator('[data-ecg-cursor]').getAttribute('x1'));
  await page.locator('[data-ecg-play]').click(); await page.waitForTimeout(500);
  const cx1 = +(await page.locator('[data-ecg-cursor]').getAttribute('x1'));
  await page.locator('[data-ecg-play]').click(); await page.waitForTimeout(100);
  const cx2 = +(await page.locator('[data-ecg-cursor]').getAttribute('x1')); await page.waitForTimeout(200);
  ok(cx1 > cx0 + 2 && Math.abs((+(await page.locator('[data-ecg-cursor]').getAttribute('x1'))) - cx2) < 1, 'play sweeps the cursor, pause holds it (' + cx0 + ' → ' + cx1 + ')');

  // ---- lung nodules and screening
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'nodules' })); await page.waitForSelector('[data-nod-risk]');
  ok(await page.locator('#learn-cat').inputValue() === 'cancer' && await page.locator('#learn-cat option').count() === 11, 'a fourth Learn area: lung nodules & cancer screening');
  ok(/Fleischner/.test(await txt('.learn-body')) && /Lung-RADS/.test(await txt('.learn-body')) && /Brock/.test(await txt('.learn-body')) && await page.locator('.learn-body table').count() >= 4, 'the nodule page carries the Fleischner, Lung-RADS and model tables');
  ok(await page.locator('[data-nod-risk] [data-model]').count() === 3 && /17%/.test(await txt('[data-nod-risk] [data-model="mayo"]')), 'three probability models computed for the default case (Mayo 17%): ' + await txt('[data-nod-risk-out]'));
  await page.locator('[data-nod-risk] [data-nod="size"]').fill('20'); await page.locator('[data-nod-risk] [data-nod="spic"]').check(); await page.waitForTimeout(80);
  ok(await page.evaluate(() => { const N = window.PFT_NOD; return Math.abs(N.mayo({ age: 65, smoker: 1, cancer: 0, size: 12, spic: 1, upper: 1 }) - 0.465) < 0.01 && Math.abs(N.brock({ age: 62, female: 0, famhx: 0, emph: 0, size: 8, type: 'solid', upper: 1, count: 1, spic: 0 }) - 0.0326) < 0.002 && Math.abs(N.va({ age: 65, smoker: 1, size: 12, quitYears: 5 }) - 0.445) < 0.01; }), 'the published equations: Mayo 46.5%, Brock 3.3%, VA 44.5% for the reference cases');
  ok(/high \(> 65%\)/.test(await txt('[data-nod-risk-out]')) || /intermediate/.test(await txt('[data-nod-risk-out]')), 'a 20-mm spiculated nodule moves the CHEST band up: ' + await txt('[data-nod-risk-out] .nod-band'));
  await page.locator('[data-nod-vdt] [data-nod="d2"]').fill('9'); await page.waitForTimeout(80);
  ok(/VDT 10\d days/.test(await txt('[data-nod-vdt-out]')) && /solid lung cancer/.test(await txt('[data-nod-vdt-out]')), '6 to 9 mm in 180 days: VDT about 103 days, in the cancer range: ' + await txt('[data-nod-vdt-out]'));
  ok(/CT at 6–12 months, then CT at 18–24 months/.test(await txt('[data-nod-adv-out]')), 'advisor: a 7-mm solid incidental nodule in a high-risk patient — Fleischner CT at 6–12 then 18–24 months');
  await page.selectOption('[data-nod="risk"]', 'low'); await page.waitForTimeout(60);
  ok(/then consider CT at 18–24 months/.test(await txt('[data-nod-adv-out]')), 'low risk: the second CT is optional');
  await page.selectOption('[data-nod="advtype"]', 'part'); await page.locator('[data-nod="advsize"]').fill('10'); await page.locator('[data-nod="advsolid"]').fill('7'); await page.waitForTimeout(60);
  ok(/Highly suspicious/.test(await txt('[data-nod-adv-out]')), 'a part-solid nodule with a 7-mm solid component is highly suspicious');
  await page.selectOption('[data-nod="setting"]', 'screen'); await page.waitForTimeout(60);
  ok(/Lung-RADS 4A/.test(await txt('[data-nod-adv-out]')) && /3-month LDCT/.test(await txt('[data-nod-adv-out]')), 'the same nodule on a screening CT: Lung-RADS 4A, 3-month LDCT');
  await page.selectOption('[data-nod="advtype"]', 'solid'); await page.locator('[data-nod="advsize"]').fill('16'); await page.waitForTimeout(60);
  ok(/Lung-RADS 4B/.test(await txt('[data-nod-adv-out]')) && /Diagnostic chest CT/.test(await txt('[data-nod-adv-out]')), 'a 16-mm solid nodule at baseline: 4B');
  await page.selectOption('[data-nod="status"]', 'new'); await page.locator('[data-nod="advsize"]').fill('5'); await page.waitForTimeout(60);
  ok(/Lung-RADS 3/.test(await txt('[data-nod-adv-out]')), 'a new 5-mm solid nodule: 3');
  await page.locator('[data-nod="benign"]').check(); await page.waitForTimeout(60);
  ok(/Lung-RADS 1/.test(await txt('[data-nod-adv-out]')), 'benign calcification: 1');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'screening' })); await page.waitForSelector('.learn-body[data-topic="screening"]');
  ok(/USPSTF 2021/.test(await txt('.learn-body')) && /20 pack-years/.test(await txt('.learn-body')) && /Veterans Health Administration/.test(await txt('.learn-body')) && /NELSON/.test(await txt('.learn-body')), 'the screening page: USPSTF, the trials and the VA programme');
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'incidentals' })); await page.waitForSelector('.learn-body[data-topic="incidentals"]');
  ok(/Interstitial lung abnormalities/.test(await txt('.learn-body')) && /Coronary artery calcification/.test(await txt('.learn-body')), 'the incidental-findings page');

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

  // ---- the comparison table: chips are the entry; the table opens with "Prior study" (or "Bronchodilator"), one value box
  // per earlier study, the date in the column header
  await page.evaluate(() => { const b = document.getElementById('new-case'); b.click(); b.click(); }); await page.waitForSelector('#top');
  ok(await page.locator('.tchip[aria-pressed="true"]').count() === 3 && await page.locator('details.tsec').count() === 3, 'a new case starts with the three default tests on the page');
  ok(await page.locator('[data-grid="spiro"] .ix .ix-vals').count() === 0 && await page.locator('[data-grid="spiro"] table.ct').count() === 0, 'no value boxes until a comparison is asked for');
  await page.locator('[data-field="ctx.date"] input').fill('2025-03-05');
  await page.locator('[data-prior-toggle="spiro"]').check();
  ok(await page.locator('[data-grid="spiro"] table.ct').count() === 1 && await page.locator('[data-cell="prior.fev1"]').count() === 1 && await page.locator('[data-cell="prior.fev1_pct"]').count() === 0, 'the table shows one value box per prior study, no % predicted for priors');
  ok(await page.locator('[data-cell="spiro.fev1_abs"]').count() === 1 && await page.locator('[data-cell="spiro.fev1.z"]').count() === 1, 'this study has its z, value and % boxes in the table');
  await page.locator('[data-cell="spiro.fev1_abs"] input').fill('1.55');
  await page.locator('[data-prior-date="1"]').first().fill('2024-03-05');
  await page.locator('[data-cell="prior.fev1"] input').first().fill('1.85');
  for (let i = 0; i < 3; i++) await page.locator('[data-prior-add="spiro"]').click();
  ok(await page.locator('[data-cell="prior.fev1"]').count() === 4 && await page.locator('[data-prior-dates="spiro"] [data-prior-hd]').count() === 4, 'four prior columns');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'no horizontal overflow with four priors (the table scrolls on its own)');
  ok(/Since the prior study \(Mar 2024\), significant decline in FEV1 \(-16%\)/.test(await page.evaluate(() => window.__pft.result.text)), 'percent change and significance from the two absolute values, inside SPIROMETRY at the minimal level: ' + await page.evaluate(() => window.__pft.result.text));
  // additional studies: tick a test on, make it a default
  await page.locator('details.more-tests').evaluate(e => { e.open = true; });
  await page.locator('[data-test-on="sixmw"]').check(); await page.waitForTimeout(80);
  ok(await page.locator('details.tsec[data-mod="sixmw"]').count() === 1 && await page.locator('.tchip[data-test="sixmw"]').count() === 1, 'a ticked additional study appears as a section and a chip');
  await page.locator('details.more-tests').evaluate(e => { e.open = true; });
  await page.locator('[data-test-default="feno"]').check(); await page.waitForTimeout(80);
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('pft.defaults.v1')))).join() === 'spiro,vol,dlco,feno' && await page.locator('.tchip[data-test="feno"]').count() === 1, 'a default test is remembered and shown as a chip');
  await page.evaluate(() => { const b = document.getElementById('new-case'); b.click(); b.click(); }); await page.waitForSelector('#top');
  ok(await page.locator('.tchip[aria-pressed="true"]').count() === 4, 'the next new case starts with the four defaults');
  await page.locator('details.more-tests').evaluate(e => { e.open = true; });
  await page.locator('[data-test-default="feno"]').uncheck(); await page.waitForTimeout(80);
  await page.evaluate(() => { const b = document.getElementById('new-case'); b.click(); b.click(); }); await page.waitForSelector('#top');
  await page.locator('[data-field="ctx.date"] input').fill('2025-03-05');
  await page.locator('[data-prior-toggle="spiro"]').check();
  await page.locator('[data-cell="spiro.fev1_abs"] input').fill('1.55'); await page.locator('[data-prior-date="1"]').first().fill('2024-03-05'); await page.locator('[data-cell="prior.fev1"] input').first().fill('1.85');

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
  const dateB = await page.locator('[data-field="ctx.date"]').boundingBox(), ageB = await page.locator('[data-field="ctx.age"]').boundingBox(), stripB = await page.locator('.pstrip').boundingBox();
  ok(dateB.x < ageB.x && Math.abs(dateB.x - stripB.x) < 2 && Math.abs(dateB.y - ageB.y) < 4, 'the study date is the first cell of the patient row, top left');

  // ---- phone: the widgets fit
  await ctx.close();
  const m = await browser.newContext({ viewport: { width: 400, height: 800 }, hasTouch: true, isMobile: true });
  const mp = await m.newPage(); await mp.goto(FILE); await mp.waitForSelector('[data-home]'); await mp.evaluate(() => window.__pft.setMode('case')); await mp.waitForSelector('#top');
  for (const t of ['tree', 'stations', 'vq', 'sedation', 'airway', 'mon_art', 'mon_screen', 'echo_log']) {
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
