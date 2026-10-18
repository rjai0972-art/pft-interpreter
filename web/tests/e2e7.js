// v7: the Learn areas (PFT interpretation · Anatomy & bronchoscopy), the bronchial-tree navigator and its drill, the nodal
// station map and quiz, the V/Q sandbox, the lidocaine running total, and the simplified prior-study columns.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = process.env.PFT_URL || ('file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const uniqN = (a) => a.filter((x, i) => a.indexOf(x) === i).length;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(FILE); await page.waitForSelector('#top');
  const txt = async (sel) => (await page.locator(sel).first().textContent()) || '';

  // ---- areas
  await page.locator('.vw[data-view="learn"]').click(); await page.waitForSelector('.learn-body');
  ok(await page.locator('#learn-cat option').count() === 4, 'Learn offers four areas');
  ok(await page.locator('.learn-body').getAttribute('data-cat') === 'pft', 'PFT interpretation is the default area');
  const nPft = await page.locator('.ln-btn').count();
  ok(nPft >= 20, 'the PFT area keeps its topics (' + nPft + ')');
  await page.selectOption('#learn-cat', 'airway'); await page.waitForSelector('.learn-body[data-cat="airway"]');
  const anatTopics = await page.locator('.ln-btn').evaluateAll(els => els.map(e => e.getAttribute('data-topic')));
  ok(anatTopics.join() === 'airway,tree,ct,stations,vq,bronch_basics,bronch_prep,sedation,antithrombotic,bal,sampling,icu,ebus', 'anatomy area lists its topics in order: ' + anatTopics.join());
  ok(await page.locator('.learn-body[data-topic="airway"] .an-lobes').count() === 1, 'the first anatomy topic shows the lobes figure');
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
  ok(await page.locator('#learn-cat').inputValue() === 'cancer' && await page.locator('#learn-cat option').count() === 4, 'a fourth Learn area: lung nodules & cancer screening');
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
