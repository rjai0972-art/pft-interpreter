/* Round-2 features: (i) pop-ups, Learn, 6MWD trend, look-for tips, case bank, mobile. */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = process.env.PFT_URL || ('file://' + path.join(__dirname, '..', 'dist', 'PFT_Interpreter_standalone.html'));
const SHOTS = path.join(__dirname, '..', 'shots2');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL:', m); } };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(FILE);
  await page.waitForSelector('.tgrid');

  /* ---------------- (i) pop-ups ---------------- */
  const pop = page.locator('#pop');
  ok(await pop.isHidden(), 'pop-up hidden at start');
  const ibTest = page.locator('.ttw .ib').first();
  await ibTest.hover(); await page.waitForTimeout(350);
  ok(await pop.isVisible(), 'hover opens the pop-up');
  ok(/Spirometry/.test(await pop.innerText()), 'pop-up has the test name');
  await page.mouse.move(5, 400); await page.waitForTimeout(450);
  ok(await pop.isHidden(), 'moving away closes an unpinned pop-up');
  await ibTest.hover(); await page.waitForTimeout(300);
  const ibBox = await ibTest.boundingBox();
  await page.mouse.move(ibBox.x + 8, ibBox.y + 40); await page.mouse.move(ibBox.x + 40, ibBox.y + 70); // across the gap into the pop-up
  await page.waitForTimeout(350);
  ok(await pop.isVisible(), 'pointer can move into the pop-up without closing it');
  await page.mouse.move(5, 600); await page.waitForTimeout(450);
  await ibTest.click(); await page.waitForTimeout(150);
  ok(await pop.evaluate(e => e.classList.contains('pinned')), 'click pins');
  ok(await ibTest.getAttribute('aria-expanded') === 'true', 'aria-expanded true when open');
  await page.mouse.move(5, 700); await page.waitForTimeout(450);
  ok(await pop.isVisible(), 'a pinned pop-up stays when the pointer leaves');
  await page.keyboard.press('Escape');
  ok(await pop.isHidden(), 'Esc closes');
  await ibTest.click(); await page.waitForTimeout(100);
  await page.locator('h1').click();
  ok(await pop.isHidden(), 'outside click closes');
  // keyboard: focus previews, Enter pins and moves focus into the pop-up
  await ibTest.focus(); await page.waitForTimeout(150);
  ok(await pop.isVisible(), 'keyboard focus previews');
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  ok(await pop.evaluate(e => e.classList.contains('pinned') && document.activeElement === e), 'Enter pins and focuses the pop-up');
  await page.keyboard.press('Tab');
  ok(await page.evaluate(() => document.activeElement.classList.contains('pop-more')), 'Tab reaches Learn more');
  await page.keyboard.press('Escape');
  ok(await pop.isHidden() && await page.evaluate(() => document.activeElement.classList.contains('ib')), 'Esc returns focus to the (i) button');
  // inside the viewport
  const inView = async (label) => {
    const b = await pop.boundingBox(), vp = page.viewportSize();
    ok(b && b.x >= 0 && b.y >= 0 && b.x + b.width <= vp.width + 0.5 && b.y + b.height <= vp.height + 0.5, 'pop-up inside the viewport: ' + label + ' ' + JSON.stringify(b));
  };
  await page.locator('.side-card h3 .ib').first().click(); await page.waitForTimeout(100); await inView('z-key'); await page.keyboard.press('Escape');

  // every (i) on every step maps to a glossary entry
  await page.getByRole('button', { name: 'Full PFT', exact: true }).click();
  const boxes = page.locator('.tt input');
  for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check();
  const pills = await page.locator('.steps .pill').allInnerTexts();
  let totalIb = 0, perStep = {};
  for (let k = 0; k < pills.length; k++) {
    await page.locator('.steps .pill').nth(k).click();
    const bad = await page.evaluate(() => Array.from(document.querySelectorAll('[data-gloss]')).filter(e => !window.PFT_GLOSS.terms[e.getAttribute('data-gloss')]).length);
    const n = await page.locator('main .ib').count();
    perStep[pills[k]] = n; totalIb += n;
    ok(bad === 0, 'all (i) keys exist on step ' + pills[k]);
  }
  ok(totalIb > 120, 'many (i) buttons across the steps: ' + totalIb);
  for (const nm of ['Spirometry', 'Flow–volume loop', 'Lung volumes', 'DLCO', '6MWT', 'CPET', 'MIP / MEP']) ok(perStep[nm] >= 3, 'step has (i) buttons: ' + nm + ' = ' + perStep[nm]);

  // Learn more goes to the right topic and term
  await page.locator('.steps .pill', { hasText: 'Lung volumes' }).click();
  await page.locator('[data-field="vol.tlc"] .ib').first().click();
  await page.locator('.pop-more').click(); await page.waitForTimeout(300);
  ok(await page.locator('.learn-body').getAttribute('data-topic') === 'vol', 'Learn more opens the lung-volumes topic');
  ok(await page.locator('#term-tlc').evaluate(e => e.open), 'the term is opened');
  ok(await pop.isHidden(), 'pop-up closed after navigating');

  /* ---------------- Learn ---------------- */
  const topics = await page.evaluate(() => Object.keys(window.PFT_EDU.topics));
  ok(topics.length === 20, '20 topics: ' + topics.length);
  for (const id of topics) {
    await page.locator('.ln-btn[data-topic="' + id + '"]').click();
    const t = await page.locator('.learn-body').innerText();
    ok(t.length > 400 && !/undefined|NaN|\[object/.test(t), 'topic renders: ' + id + ' (' + t.length + ' chars)');
  }
  await page.locator('.ln-btn[data-topic="loops"]').click();
  ok(await page.locator('.learn-loops figure').count() === 14, 'loop gallery in Learn has 14 pictures');
  await page.locator('.ln-btn[data-topic="equations"]').click();
  ok(/Enright & Sherrill/.test(await page.locator('.learn-body').innerText()), 'equations topic lists 6MWD equations');
  await page.locator('.ln-btn[data-topic="sixmw"]').click();
  ok(await page.locator('.learn-go').count() === 1, 'a topic for a selected test offers a jump back to it');
  await page.locator('.vw[data-view="case"]').click();
  ok(await page.locator('.steps').isVisible(), 'back to the case: steps visible');

  /* ---------------- 6MWD trend ---------------- */
  await page.locator('.ex').count();
  await page.locator('.steps .pill', { hasText: '6MWT' }).click();
  ok(await page.locator('.tr-block').count() === 1, 'trend block on the 6MWT step');
  ok(await page.locator('.tr-empty').count() === 1, 'empty-state message before two walks');
  const rows = () => page.locator('.tr-row:not(.today)');
  const addWalk = async (i, date, dist, nadir) => {
    if (i > 0) await page.locator('#tr-add').click();
    await rows().nth(i).locator('input[type=date]').fill(date);
    await rows().nth(i).locator('input.num').first().fill(dist);
    if (nadir) await rows().nth(i).locator('input.num').nth(1).fill(nadir);
  };
  await page.locator('.steps .pill', { hasText: 'Details' }).click();
  await page.getByLabel('Date of study').fill('2026-03-01');
  await page.locator('.steps .pill', { hasText: '6MWT' }).click();
  await addWalk(0, '2025-03-01', '430');
  await addWalk(1, '2025-09-01', '410', '92');
  await page.locator('.tr-row.today input.num').first().fill('360');
  await page.locator('.tr-row.today input.num').nth(1).fill('86');
  ok(await page.locator('.tr-svg').count() === 1, 'chart drawn');
  ok(await page.locator('.tr-svg .tr-pt').count() === 3, 'three markers: ' + await page.locator('.tr-svg .tr-pt').count());
  ok(await page.locator('.tr-svg .tr-cur').count() === 1, 'this study is ringed');
  ok(await page.locator('.tr-svg .tr-band').count() === 1, 'MID band drawn');
  ok(/−50 m/.test(await page.locator('.tr-main').first().innerText()) && /beyond/.test(await page.locator('.tr-main').first().innerText()), 'change chip reports −50 m beyond the MID: ' + await page.locator('.tr-main').first().innerText());
  await page.locator('.tr-svg').scrollIntoViewIfNeeded();
  const svgBox = await page.locator('.tr-svg').boundingBox();
  await page.mouse.move(svgBox.x + svgBox.width * 0.95, svgBox.y + svgBox.height * 0.5); await page.waitForTimeout(200);
  ok(await page.locator('.tr-tip').isVisible() && /360 m/.test(await page.locator('.tr-tip').innerText()), 'tooltip names the nearest walk: ' + (await page.locator('.tr-tip').innerText()).replace(/\n/g, ' / '));
  await page.mouse.move(5, 5);
  await page.locator('.tr-svg').focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100);
  ok(/430 m/.test(await page.locator('.tr-tip').innerText()), 'arrow keys step through the walks');
  await page.locator('#tr-table').click();
  ok(await page.locator('.tr-tbl tbody tr').count() === 3, 'table view has 3 rows');
  // inputs in the trend card share state with the 6MWT fields
  ok((await page.evaluate(() => window.__pft.state.sixmw.dist)) === '360' && (await page.evaluate(() => window.__pft.state.sixmw.spo2_nadir)) === '86', 'today row writes the 6MWT fields');
  await page.locator('details.optgrp', { hasText: 'Measured values' }).locator('summary').click();
  ok(await page.getByLabel('6MWD', { exact: true }).first().inputValue() === '360', 'the typed 6MWD field shows the same value');
  // quick date chip
  await page.locator('#tr-add').click();
  await rows().nth(2).locator('.qdates .cp', { hasText: '2 yr' }).click();
  ok((await rows().nth(2).locator('input[type=date]').inputValue()) === '2024-03-01', 'quick chip sets date two years before the study date');
  await rows().nth(2).getByRole('button', { name: /Remove walk 3/ }).click();
  ok(await rows().count() === 2, 'row removed');
  // report text
  await page.locator('.steps .pill', { hasText: 'Report' }).click();
  const six = await page.locator('[data-sec="six"] p').innerText();
  ok(/6MWD trend over 3 walks/.test(six) && /Latest versus previous walk: -50 m/.test(six), 'report carries the trend: ' + six.slice(0, 160));
  ok(/minimal important difference/.test(await page.locator('.interp').innerText()), 'interpretation mentions the MID');

  /* ---------------- tips with pictures ---------------- */
  await page.locator('.vw[data-view="case"]').click();
  await page.locator('.steps .pill', { hasText: 'Tests' }).click();
  await page.locator('.ex').nth(2).click(); // low FVC no lung volumes
  const tip1 = page.locator('.hu-item[data-id="TIP1"]');
  ok(await tip1.count() === 1, 'restriction tip present on the low-FVC example');
  ok(await tip1.locator('.look-fig svg').count() === 2, 'tip shows two loop pictures');
  ok(/steep expiratory limb/.test(await tip1.innerText()), 'tip caption text');
  ok(await page.locator('.hu-item[data-lvl="tip"] .chip.tip').first().innerText() === 'Look for', 'tip chip label');
  const order = await page.locator('.hu-item').evaluateAll(els => els.map(e => e.getAttribute('data-lvl')));
  ok(order.lastIndexOf('tip') < order.indexOf('note') || order.indexOf('note') < 0, 'tips are listed before notes: ' + order.join());
  await page.locator('.hu-item[data-lvl="tip"]').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: SHOTS + '/e_tip.png' });
  // upper airway tip
  await page.locator('.steps .pill', { hasText: 'Tests' }).click();
  await page.locator('.ex').nth(5).click();
  const ids = await page.locator('.hu-item').evaluateAll(els => els.map(e => e.getAttribute('data-id')));
  ok(ids.indexOf('TIP4') >= 0, 'upper-airway tip on the upper-airway example: ' + ids.join());
  ok(await page.locator('.hu-item[data-id="TIP4"] .look-fig').count() === 3, 'upper-airway tip shows the three loop pictures');
  await page.locator('.ex').count();
  await page.locator('.steps .pill', { hasText: 'Tests' }).click();
  await page.locator('.ex').nth(6).click();

  // ratings tune notes/tips only
  const item = page.locator('.hu-item[data-lvl="note"]').first();
  const nid = await item.getAttribute('data-id');
  await item.locator('.rt[data-rate="n"]').click();
  ok(await item.locator('.rt[data-rate="n"]').getAttribute('aria-pressed') === 'true', 'rating pressed');
  await item.locator('.rt[data-rate="n"]').click();
  ok(await item.locator('.rt[data-rate="n"]').getAttribute('aria-pressed') === 'false', 'rating toggles off');
  await page.evaluate((id) => { localStorage.setItem('pft.feedback.v1', JSON.stringify((() => { const o = {}; o[id] = { title: 't', by: { a: 'n', b: 'n', c: 'n' } }; o['__alert'] = { title: 'x', by: { a: 'n', b: 'n', c: 'n', d: 'n' } }; return o; })())); }, nid);
  await page.reload(); await page.waitForSelector('.tgrid');
  await page.locator('.ex').nth(6).click();
  ok(await page.locator('#headsup > .hu-item[data-id="' + nid + '"]').count() === 0, 'a note rated not useful three times moves out of the main list');
  ok(await page.locator('.hu-quiet .hu-item[data-id="' + nid + '"]').count() === 1, 'it is kept in the quieter list');
  ok(await page.locator('.hu-item[data-lvl="alert"], .hu-item[data-lvl="caution"]').count() >= 1, 'alerts and cautions stay visible');
  await page.evaluate(() => localStorage.removeItem('pft.feedback.v1'));

  /* ---------------- code chips ---------------- */
  await page.locator('.steps .pill', { hasText: 'Tests' }).click();
  await page.locator('.ex').nth(0).click();
  const cc = page.locator('.codes-row .code-btn').first();
  ok(await cc.count() === 1, 'code chips on the interpretation');
  await cc.click(); await page.waitForTimeout(100);
  ok(/Annals|obstructive|Mild|Moderate|Severe|Hyper|air|Low|Mixed|restriction/i.test(await pop.innerText()), 'code chip opens its meaning: ' + (await pop.innerText()).slice(0, 80).replace(/\n/g, ' '));
  await page.keyboard.press('Escape');
  ok(await page.locator('#doc .sec .code').count() === 0, 'section blocks carry no codes');

  /* ---------------- case bank ---------------- */
  ok(await page.locator('#bank-n').isHidden(), 'bank badge hidden while empty');
  await page.locator('#save-bank').click();
  ok(await page.locator('#bank-save').isVisible(), 'save panel opens');
  await page.locator('#bank-label').fill('COPD A');
  await page.locator('#bank-save-go').click();
  ok(await page.locator('#bank-n').innerText() === '1', 'badge shows 1');
  const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('pft.bank.v1'))[0]);
  ok(rec.label === 'COPD A' && rec.codes.length >= 2 && Object.keys(rec.sig).length > 3 && rec.state.v >= 2, 'saved record has label, codes, signature, state');
  // free text is dropped by default
  await page.locator('.steps .pill', { hasText: 'Details' }).click();
  await page.getByLabel('Other indication (type only if not listed above)').fill('patient John Q');
  await page.locator('.steps .pill', { hasText: 'Report' }).click();
  await page.locator('#save-bank').click(); await page.locator('#bank-label').fill('with text'); await page.locator('#bank-save-go').click();
  const rec2 = await page.evaluate(() => JSON.parse(localStorage.getItem('pft.bank.v1'))[0]);
  ok(rec2.state.ctx.indication === '', 'free text left out of the saved case by default');
  await page.locator('#save-bank').click(); await page.locator('#bank-drop').uncheck(); await page.locator('#bank-label').fill('keeps text'); await page.locator('#bank-save-go').click();
  const rec3 = await page.evaluate(() => JSON.parse(localStorage.getItem('pft.bank.v1'))[0]);
  ok(rec3.state.ctx.indication === 'patient John Q', 'free text kept when the box is unticked');
  // review flow
  await page.locator('.vw[data-view="bank"]').click();
  ok(await page.locator('.bank-case').count() === 3, 'three cases listed');
  const first = () => page.locator('.bank-case').first();
  await first().locator('[data-review="edit"]').click();
  await first().locator('[data-part="vol"]').click();
  await first().locator('[data-part="interp"]').click();
  await first().locator('textarea').fill('Should call mixed disease');
  await first().locator('textarea').blur();
  ok((await page.locator('.stat .sv').allInnerTexts()).join() === '3,1,0,1', 'stats update: ' + (await page.locator('.stat .sv').allInnerTexts()).join());
  await page.locator('.bank-case').nth(1).locator('[data-review="agree"]').click();
  ok((await page.locator('.stat .sv').allInnerTexts()).join() === '3,2,1,1', 'stats after an agreement: ' + (await page.locator('.stat .sv').allInnerTexts()).join());
  ok(await page.locator('.bars .bar-row').count() >= 2, 'correction bars drawn');
  const rv = await page.evaluate(() => JSON.parse(localStorage.getItem('pft.bank.v1'))[0].review);
  ok(rv.status === 'edit' && rv.sections.join() === 'vol,interp' && rv.note === 'Should call mixed disease', 'review persisted: ' + JSON.stringify(rv));
  await page.locator('.cp[data-filter="edit"]').click();
  ok(await page.locator('.bank-case').count() === 1, 'filter: needs changes');
  await page.locator('.cp[data-filter="todo"]').click();
  ok(await page.locator('.bank-case').count() === 1, 'filter: not reviewed');
  await page.locator('.cp[data-filter="all"]').click();
  await page.screenshot({ path: SHOTS + '/e_bank.png', fullPage: true });
  // export / import
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#bank-export').click()]);
  ok(dl.suggestedFilename() === 'pft-case-bank.json', 'bank export file name');
  const dlp = await dl.path(); const exported = require('fs').readFileSync(dlp, 'utf8');
  const parsed = JSON.parse(exported);
  ok(parsed.format === 'pft-case-bank' && parsed.cases.length === 3, 'export holds the cases');
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.locator('#bank-log').click()]);
  const csv = require('fs').readFileSync(await dl2.path(), 'utf8').split('\n');
  ok(csv.length === 4 && /edit/.test(csv[1]) && /vol interp/.test(csv[1]), 'review log CSV rows: ' + csv[1].slice(0, 100));
  // delete one (two clicks), then import the export: duplicates skipped, deleted one comes back
  await page.locator('.bank-case').last().locator('[data-act="delete"]').click();
  ok(await page.locator('.bank-case').count() === 3, 'first click only arms delete');
  await page.locator('.bank-case').last().locator('[data-act="delete"]').click();
  ok(await page.locator('.bank-case').count() === 2, 'second click deletes');
  await page.fill('#bank-import', exported); await page.locator('#bank-import-go').click();
  ok(await page.locator('.bank-case').count() === 3, 'import restores the deleted case and skips duplicates');
  await page.fill('#bank-import', 'not json'); await page.locator('#bank-import-go').click();
  ok(/not valid JSON/.test(await page.locator('.toast').textContent()), 'bad import is rejected politely');
  await page.fill('#bank-import', JSON.stringify({ cases: [{ id: 'x', state: { tests: { spiro: true }, spiro: { ratio: { c: 'low', z: '' } } } }, { nope: 1 }] }));
  await page.locator('#bank-import-go').click();
  ok(await page.locator('.bank-case').count() === 4, 'a minimal case imports and is normalised');
  // similar cases
  await page.locator('.vw[data-view="case"]').click();
  await page.locator('.steps .pill', { hasText: 'Tests' }).click();
  await page.locator('.ex').nth(0).click();
  await page.locator('.steps .pill', { hasText: 'Flow–volume loop' }).click();
  await page.locator('[data-field="fvl.loop"] .lp-tile[data-loop="concave"]').click();   // now differs from the saved COPD case
  await page.locator('.steps .pill', { hasText: 'Report' }).click();
  ok(await page.locator('#similar').count() === 1, 'similar-case card appears for a related saved case');
  const simTxt = await page.locator('#similar').innerText();
  ok(/needing changes|agreed|not been reviewed/.test(simTxt) && /match/.test(simTxt), 'similar card message: ' + simTxt.slice(0, 200).replace(/\n/g, ' / '));
  await page.locator('#similar .sim-item .btn').first().click();
  ok(await page.locator('#doc').count() === 1, 'a similar case opens in the report');
  await page.screenshot({ path: SHOTS + '/e_similar.png', fullPage: true });

  ok(errs.length === 0, 'no page errors: ' + errs.join(' || '));

  /* ---------------- mobile, dark ---------------- */
  const m = await browser.newContext({ viewport: { width: 400, height: 800 }, colorScheme: 'dark', hasTouch: true, isMobile: true });
  const mp = await m.newPage();
  const merrs = []; mp.on('pageerror', e => merrs.push(e.message));
  await mp.goto(FILE); await mp.waitForSelector('.tgrid');
  const ov = async (label) => { const o = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth })); ok(o.sw <= o.iw + 1, 'no horizontal overflow at 400px: ' + label + ' (' + o.sw + ' vs ' + o.iw + ')'); };
  await ov('tests');
  await mp.locator('.ttw .ib').first().tap(); await mp.waitForTimeout(200);
  const pb = await mp.locator('#pop').boundingBox();
  ok(pb && pb.x >= 0 && pb.x + pb.width <= 400.5, 'pop-up fits at 400px: ' + JSON.stringify(pb));
  await mp.screenshot({ path: SHOTS + '/m_pop.png' });
  await mp.locator('h1').tap();
  ok(await mp.locator('#pop').isHidden(), 'tapping elsewhere closes the pop-up');
  await mp.locator('.vw[data-view="learn"]').tap(); await mp.waitForSelector('.learn-body');
  await ov('learn'); ok(await mp.locator('#learn-nav').isHidden(), 'topic list is collapsed on a phone');
  await mp.locator('.learn-toggle').tap(); ok(await mp.locator('#learn-nav').isVisible(), 'topics toggle opens the list');
  await mp.locator('.ln-btn[data-topic="loops"]').tap(); await mp.waitForSelector('.learn-body[data-topic="loops"]');
  await ov('learn loops'); await mp.screenshot({ path: SHOTS + '/m_learn_loops.png', fullPage: true });
  await mp.locator('.ln-btn, .learn-toggle').first().count();
  await mp.locator('.learn-toggle').tap(); await mp.locator('.ln-btn[data-topic="equations"]').tap(); await mp.waitForSelector('.learn-body[data-topic="equations"]'); await ov('learn equations');
  await mp.locator('.vw[data-view="case"]').tap();
  await mp.locator('.ex').nth(1).tap();
  await mp.locator('.steps .pill', { hasText: '6MWT' }).tap();
  await ov('6MWT step'); await mp.screenshot({ path: SHOTS + '/m_six.png', fullPage: true });
  await mp.locator('.steps .pill', { hasText: 'Report' }).tap(); await ov('report with tips'); await mp.screenshot({ path: SHOTS + '/m_report.png', fullPage: true });
  await mp.locator('.vw[data-view="bank"]').tap(); await ov('bank');
  ok(merrs.length === 0, 'no mobile errors ' + merrs.join('|'));

  console.log('e2e2 passed', passes, 'failed', fails);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('E2E2 CRASH', e); process.exit(2); });
