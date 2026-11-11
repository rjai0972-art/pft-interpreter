// v8.7: the unifying pass — the home page is one even grid; words and dials carry their definitions on hover; long leads and captions
// are held short; the ECMO lab is a bar, a picture and a deck, and its gas rounds run end to end (gases, orders, gases again, the
// flowsheet, pace hazards, the expert's orders); the echo atlas is a picker and the lab a bar, a screen and a deck; the 3-D heart
// has leaflets, coronaries and ribs; nothing scrolls sideways at phone width. Only failures print.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'dist', 'PulmCritDaddy_standalone.html');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL:', m); } };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1380, height: 1000 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const home = async () => { await page.goto(FILE); await page.waitForSelector('[data-home]'); };
  const boot = async (topic, sel) => { await home(); await page.evaluate((t) => window.__pft.setMode('learn', { topic: t }), topic); await page.waitForSelector(sel); await page.waitForTimeout(250); };
  const go = async (topic, sel) => { await page.evaluate((t) => window.__pft.setMode('learn', { topic: t }), topic); await page.waitForSelector(sel); await page.waitForTimeout(250); };
  const txt = async (sel) => page.$eval(sel, e => e.textContent);
  const attr = async (sel, a) => page.getAttribute(sel, a);
  const boxes = async (sel) => page.$$eval(sel, els => els.map(e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }));
  const rows = (bs) => { const m = {}; bs.forEach(b => { (m[b.y] = m[b.y] || []).push(b); }); return Object.keys(m).map(k => m[k]); };
  const even = (bs, tol) => bs.every(b => Math.abs(b.w - bs[0].w) <= (tol || 2));
  const noSideScroll = async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  const popOpen = async () => page.evaluate(() => { const p = document.getElementById('pop'); return !!p && !p.hidden; });
  const popText = async () => page.evaluate(() => { const p = document.getElementById('pop'); return p && !p.hidden ? p.textContent : ''; });
  const waitPop = async () => { await page.waitForFunction(() => { const p = document.getElementById('pop'); return !!p && !p.hidden; }, null, { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(120); };
  const away = async () => { await page.mouse.move(2, 2); await page.keyboard.press('Escape'); await page.waitForTimeout(350); };
  const setEc = async (key, v) => { await page.locator('[data-ec-deck] [data-ec="' + key + '"]').evaluate((e, val) => { e.value = String(val); e.dispatchEvent(new Event('input', { bubbles: true })); }, v); await page.waitForTimeout(120); };

  // ================================================================ the home page: one even grid
  await home();
  const tiles = await boxes('[data-home-grid] > [data-home-tile]');
  const tr = rows(tiles);
  ok(tiles.length === 12 && tr.length === 3 && tr.every(r => r.length === 4), 'twelve tiles in three rows of four (' + tr.map(r => r.length).join('/') + ')');
  ok(even(tiles, 1) && tr.every(r => r.every(b => b.h === r[0].h)), 'every tile the same width, every row one height');
  ok(tiles.every(b => b.h < 260), 'the tiles are compact (tallest ' + Math.max.apply(null, tiles.map(b => b.h)) + ' px)');
  const rec = await boxes('[data-home-record] > [data-home-tile]');
  ok(rec.length === 3 && rows(rec).length === 1 && even(rec, 1), 'the record row: three even tiles');
  ok(await page.$$eval('[data-home-tile]', t => t.every(x => x.querySelectorAll('.ht-link').length <= 4 && !!x.querySelector('.ht-sub'))), 'each tile: a two-line summary and at most four links');
  ok(await page.evaluate(() => document.documentElement.scrollHeight) < 1500, 'the whole home page is under a screen and a half');
  await page.hover('[data-home-tile="ecmo"] .ht-sub'); await waitPop();
  ok(await popOpen() && (await popText()).length > 40 && await page.evaluate(() => document.getElementById('pop').classList.contains('tip')), 'hovering a tile’s summary shows the whole of it');
  await away(); ok(!(await popOpen()), 'and it goes when the pointer leaves');
  await page.focus('[data-home-prog="nbe"]'); await waitPop();
  ok(/26 January 2027/.test(await popText()), 'the exam chip explains itself on focus');
  await away();
  await page.locator('[data-home-tile="ecmo"] [data-home-link]').first().click(); await page.waitForSelector('.learn-body, article');
  ok(await page.evaluate(() => /ecmo/.test(location.hash) || !!document.querySelector('[data-ecmolab], .step-head')), 'a tile’s link opens its topic');

  // ================================================================ definitions on hover
  await boot('ecmo_intro', '.gt');
  const gts = await page.$$eval('.gt', g => g.map(x => x.getAttribute('data-gloss')));
  ok(gts.length >= 8 && new Set(gts).size === gts.length, 'the topic’s terms are marked, each at its first mention only (' + gts.length + ')');
  ok(await page.$$eval('.gt', g => g.every(x => !x.closest('figure, button, a, label, h1, h2, h3'))), 'never inside a figure, a heading or a control');
  await page.hover('.gt[data-gloss="t.sweep"]'); await waitPop();
  const sw = await popText();
  ok(await popOpen() && /sweep/i.test(sw) && /CO2/.test(sw) && !(await page.evaluate(() => document.getElementById('pop').classList.contains('tip'))), 'hovering “sweep” defines it');
  ok(await page.locator('#pop .pop-more').count() === 1, 'with a way to the topic that teaches it');
  await away();
  await page.focus('.gt[data-gloss="t.fdo2"]'); await page.keyboard.press('Enter'); await waitPop();
  ok(await page.evaluate(() => { const p = document.getElementById('pop'); return !p.hidden && p.classList.contains('pinned'); }) && /FdO2/.test(await popText()), 'the keyboard reaches it: Enter pins the definition');
  await page.keyboard.press('Escape'); await page.waitForTimeout(250); ok(!(await popOpen()), 'Escape closes it');
  await go('hemo_intro', '.gt');
  ok(await page.locator('.gt[data-gloss="t.svr"]').count() === 1 && await page.locator('.gt[data-gloss="t.paop"]').count() === 1, 'the haemodynamics page marks SVR and the wedge');
  await go('pft_intro', '.step-head').catch(() => {});
  await page.evaluate(() => window.__pft.setMode('learn', {})); await page.waitForTimeout(400);

  // ---- long leads and captions are held short
  await boot('ecmo_circuit', '[data-lead-more]');
  const lead = async () => page.$eval('.edu-lead', e => ({ clamp: e.classList.contains('clamp') && !e.classList.contains('open'), h: e.getBoundingClientRect().height }));
  const l0 = await lead();
  await page.click('[data-lead-more]'); await page.waitForTimeout(250);
  const l1 = await lead();
  ok(l0.clamp && !l1.clamp && l1.h > l0.h && await attr('[data-lead-more]', 'aria-expanded') === 'true', 'the lead is two lines until “More about this” (' + Math.round(l0.h) + ' → ' + Math.round(l1.h) + ' px)');
  await page.click('[data-lead-more]'); await page.waitForTimeout(250);
  ok((await lead()).clamp, 'and folds again');
  const cap = await page.$eval('.cap-clamp', e => ({ tip: e.getAttribute('data-tip'), full: e.textContent, one: e.getBoundingClientRect().height < 40, cut: e.scrollWidth > e.clientWidth }));
  ok(cap.tip === cap.full && cap.full.length >= 150 && cap.one && cap.cut, 'a long caption is one line, with the whole of it in its tip');
  await page.hover('.cap-clamp'); await waitPop();
  ok(/About this figure/.test(await popText()), 'hovering the caption reads it out');
  await away();

  // ================================================================ the ECMO lab: a bar, a picture and a deck
  await boot('ecmo_lab', '[data-ecmolab]');
  const cols = await boxes('[data-ec-deck] > .ec-col');
  ok(cols.length === 3 && rows(cols).length === 1 && even(cols, 2), 'the dials sit in three even columns under the picture');
  ok(await page.locator('.ec-bar [data-ec-mode]').count() === 2 && await page.locator('.ec-bar [data-ec-scenario] optgroup').count() === 3 && await page.locator('.ec-bar [data-ec-reset]').count() === 1, 'one bar: the mode, one list of scenarios, reset');
  ok(await page.locator('[data-ec-gas]').count() === 3, 'VV: gases at three sites');
  const figH = await page.$eval('[data-ecmolab]', e => e.getBoundingClientRect().height);
  ok(figH < 1300, 'the whole lab is about one screen (' + Math.round(figH) + ' px)');
  await page.hover('[data-ec-row="sweep"] .nod-l'); await waitPop();
  ok(await popOpen() && /CO2/.test(await popText()), 'every dial says what it does on hover');
  await away();
  const ph0 = await txt('[data-ec-gas="pt"] [data-ec-cell="pH"] b').catch(() => '');
  await setEc('sweep', 8); await page.waitForTimeout(250);
  const ph1 = await txt('[data-ec-gas="pt"] [data-ec-cell="pH"] b').catch(() => '');
  ok(ph0 && ph1 && +ph1 > +ph0, 'free play still answers at once: more sweep, higher pH (' + ph0 + ' → ' + ph1 + ')');
  await page.click('[data-ec-mode="va"]'); await page.waitForSelector('[data-ec-gas="fem"]');
  ok(await page.locator('[data-ec-gas]').count() === 4, 'VA: a fourth site, the femoral side');
  await page.click('[data-ec-mode="vv"]'); await page.waitForTimeout(200);

  // ---- gas rounds: hypercapnia, and how fast to correct it
  await page.selectOption('[data-ec-scenario]', 'r_co2'); await page.waitForSelector('[data-ec-round-panel="r_co2"]');
  ok(await attr('[data-ec-targets]', 'data-ec-targets') === '2/3' && await page.locator('[data-ec-target].no').count() === 1, 'the case arrives unsolved: two of three targets');
  ok(await attr('[data-ec-sheet-table]', 'data-ec-sheet-table') === '1' && /7\.21/.test(await txt('[data-ec-sheet-table]')), 'the first gases are on the flowsheet (pH 7.21)');
  ok(await page.locator('[data-ec-send]').isDisabled() && await attr('[data-ec-pending]', 'data-ec-pending') === '0', 'nothing to send until an order is written');
  ok(await page.locator('[data-ec-deck].orders').count() === 1 && await page.locator('[data-ec-config]').count() === 0 && await page.locator('[data-ec-deck] [data-ec="shunt"]').count() === 0 && await page.locator('[data-ec-action]').count() === 3, 'the deck holds orders only: no disease dials, three bedside actions');
  await setEc('sweep', 3);
  ok(await attr('[data-ec-pending]', 'data-ec-pending') === '1' && /Sweep gas 1 → 3 L\/min/.test(await txt('[data-ec-order="sweep"]')), 'turning the sweep writes the order');
  ok(await attr('[data-ec-sheet-table]', 'data-ec-sheet-table') === '1' && /7\.21/.test(await txt('[data-ec-sheet-table]')), 'the gases do not move until they are sent again');
  await page.click('[data-ec-undo]'); await page.waitForTimeout(200);
  ok(await attr('[data-ec-pending]', 'data-ec-pending') === '0' && await page.$eval('[data-ec-deck] [data-ec="sweep"]', e => +e.value) === 1, 'undo takes the order back');
  await setEc('sweep', 3); await page.click('[data-ec-send]'); await page.waitForSelector('[data-ec-sheet-table="2"]');
  const hz = await page.$$eval('[data-ec-hazard]', x => x.map(e => e.textContent).join(' | '));
  ok(/PaCO2 fell 43 mm Hg/.test(hz) && /alkalosis/.test(hz), 'a sweep of 3 at once: the fall of 43 and the alkalosis are flagged');
  ok(await page.locator('[data-ec-broken]').count() === 1 && await attr('[data-ec-targets]', 'data-ec-targets') === '1/3', 'the pace target is broken for the run');
  ok(await page.locator('[data-ec-sheet-table] thead th').count() === 3 && await page.locator('td[data-ec-sheet="pH"]').count() === 2 && await page.locator('td.hm-moved').count() >= 3, 'the flowsheet gains a column, with what moved marked');
  await page.click('[data-ec-rrestart]'); await page.waitForSelector('[data-ec-sheet-table="1"]');
  await setEc('sweep', 1.5); await page.click('[data-ec-send]'); await page.waitForSelector('[data-ec-sheet-table="2"]');
  ok(await page.locator('[data-ec-hazard]').count() === 0 && await page.locator('[data-ec-solved]').count() === 0, 'a step of 0.5: no hazard, not yet solved');
  await setEc('sweep', 2); await page.click('[data-ec-send]'); await page.waitForSelector('[data-ec-solved]');
  ok(await attr('[data-ec-solved]', 'data-ec-solved') === '2' && await attr('[data-ec-targets]', 'data-ec-targets') === '3/3' && await attr('[data-ec-fb]', 'data-ec-fb') === '2', 'two steps solve it: three of three, in two sets of gases');
  ok(/pH/.test(await txt('[data-ec-solved]')), 'the teaching points close the case');
  await page.selectOption('[data-ec-scenario]', ''); await page.waitForSelector('[data-ec-guide-panel="free"]');
  ok(await attr('[data-ec-guide-panel="free"]', 'data-ec-rscore') === '1' && /^✓/.test(await txt('[data-ec-scenario] option[value="r_co2"]')), 'the score and the tick are kept');

  // ---- the bedside actions, the expert’s orders, the next case
  await page.selectOption('[data-ec-scenario]', 'r_recirc'); await page.waitForSelector('[data-ec-round-panel="r_recirc"]');
  await page.click('[data-ec-action="membrane"]'); await page.waitForTimeout(250);
  ok(await attr('[data-ec-pending]', 'data-ec-pending') === '0', 'an action that does not apply writes no order');
  await page.click('[data-ec-action="reposition"]'); await page.waitForTimeout(250);
  ok(/recirculation → 10%/.test(await txt('[data-ec-pending]')), 'repositioning the cannulas is an order like any other');
  await page.click('[data-ec-send]'); await page.waitForSelector('[data-ec-sheet-table="2"]');
  ok(+(await attr('[data-ec-targets]', 'data-ec-targets')).split('/')[0] >= 2, 'and the gases answer it');
  await page.selectOption('[data-ec-scenario]', 'r_membrane'); await page.waitForSelector('[data-ec-round-panel="r_membrane"]');
  await page.click('[data-ec-rreveal]'); await page.waitForSelector('[data-ec-solved="revealed"]');
  ok(await attr('[data-ec-sheet-table]', 'data-ec-sheet-table') === '3' && await page.locator('[data-ec-fb] .ec-fb-say').count() === 2 && /Bridge: sweep to 5/.test(await txt('[data-ec-fb="1"]')) && /Change the membrane lung/.test(await txt('[data-ec-fb="2"]')), 'the expert’s orders play out on the flowsheet, every step with its reason');
  ok(await attr('[data-ec-guide-panel="free"]', 'data-ec-rscore').catch(() => null) === null, 'a revealed case is not scored as solved');
  await page.click('[data-ec-rnext]'); await page.waitForSelector('[data-ec-round-panel="r_chatter"]');
  ok(/shakes/.test(await txt('[data-ec-round-panel]')), 'next case: the line shakes');
  await page.selectOption('[data-ec-scenario]', 'r_harlequin'); await page.waitForSelector('[data-ec-round-panel="r_harlequin"]');
  ok(await page.locator('[data-ec-mode="va"][aria-checked="true"]').count() === 1 && await page.locator('[data-ec-sheet-table] tbody tr').count() >= 12, 'a VA case switches the lab to VA with its own flowsheet rows');
  const main = await boxes('[data-ecmolab] .ec-main > *');
  ok(main.length === 2 && main[0].y === main[1].y, 'in rounds the picture and the flowsheet sit side by side');

  // ================================================================ the echo atlas: a picker
  await boot('echo_views', '[data-echoatlas]');
  ok(await page.locator('[data-eh-pick]').count() === 11 && await page.locator('.eh-card').count() === 1 && await page.locator('[data-eh-text]').count() === 1, 'eleven views to pick, one on show');
  const atlasH = await page.$eval('[data-echoatlas]', e => e.getBoundingClientRect().height);
  ok(atlasH < 1300, 'the atlas is about one screen (' + Math.round(atlasH) + ' px, was eleven)');
  ok(await page.$eval('[data-eh-more]', d => !d.open), 'real loops and your own image are folded away');
  const grid = await boxes('.eh-atlas-grid > *');
  ok(grid.length === 2 && grid[0].y === grid[1].y, 'the 3-D heart and the picture side by side');
  await page.waitForFunction(() => { const p = document.querySelector('[data-h3-atlas] .h3-panel'); return p && p.inst && p.inst.build && p.inst.build.done >= 1 && p.inst.meshes.lv && Object.keys(p.inst.decor || {}).length > 8; }, null, { timeout: 180000 });
  const paint = async (sel) => page.$eval(sel, c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0, s2 = 0, n = 0, lit = 0; for (let i = 0; i < d.length; i += 16) { s += d[i]; s2 += d[i] * d[i]; n++; if (d[i] > 60) lit++; } const m = s / n; return { w: c.width, h: c.height, mean: m, sd: Math.sqrt(s2 / n - m * m), lit: lit / n }; });
  const seen = {};
  for (const id of await page.$$eval('[data-eh-pick]', b => b.map(x => x.getAttribute('data-eh-pick')))) {
    await page.click('[data-eh-pick="' + id + '"]'); await page.waitForSelector('.eh-card[data-eh-view="' + id + '"]'); await page.waitForTimeout(350);
    const p = await paint('.eh-card[data-eh-view="' + id + '"] canvas.eh-atlascv');
    seen[id] = Math.abs(p.w / p.h - 320 / 260) < 0.02 && p.sd > 12 && p.lit > 0.04 && p.lit < 0.7 && await page.locator('[data-eh-text="' + id + '"]').count() === 1;
    if (!seen[id]) console.log('  view', id, JSON.stringify(p));
  }
  ok(Object.keys(seen).length === 11 && Object.keys(seen).every(k => seen[k]), 'every view paints a picture with structure in it, in the 320 : 260 frame, with its own text');
  await page.click('[data-eh-pick="a4c"]'); await page.waitForSelector('[data-eh-text="a4c"]');
  await page.click('[data-eh-next]'); await page.waitForTimeout(300);
  const nx = await attr('.eh-card', 'data-eh-view');
  await page.click('[data-eh-prev]'); await page.waitForTimeout(300);
  ok(nx !== 'a4c' && await attr('.eh-card', 'data-eh-view') === 'a4c', 'next and back walk the views in order');
  const h3 = await page.evaluate(() => { const i = document.querySelector('[data-h3-atlas] .h3-panel').inst; return { valves: Object.keys(i.valves || {}), decor: Object.keys(i.decor || {}), chest: i.chest ? i.chest.children.length : 0, tris: i.meshes.lv.mesh.geometry.index.count / 3, win: i.params.win }; });
  ok(['mv', 'tv', 'av0', 'av1', 'av2'].every(k => h3.valves.indexOf(k) >= 0), 'the 3-D heart has mitral, tricuspid and three aortic leaflets');
  ok(['lad', 'rca', 'lcx', 'pda', 'rpa', 'lpa', 'innominate', 'laa'].every(k => h3.decor.indexOf(k) >= 0), 'the coronaries, the branch pulmonary arteries, the arch vessels and the appendage are on it (' + h3.decor.length + ' vessels)');
  ok(h3.chest > 20 && h3.tris > 1000 && h3.win === 'apical', 'the ribs and sternum frame it; the plane is at the apex for A4C');
  const optKeys = await page.$$eval('[data-h3-atlas] [data-h3-opt]', o => o.map(x => x.getAttribute('data-h3-opt')));
  ok(['cut', 'chest', 'beating', 'labels'].every(k => optKeys.indexOf(k) >= 0), 'the options: cut away, ribs, beating, labels (' + optKeys.join(', ') + ')');
  await page.locator('[data-h3-atlas] [data-h3-opt="chest"]').uncheck(); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !document.querySelector('[data-h3-atlas] .h3-panel').inst.chest.visible), 'the ribs come off');
  await page.locator('[data-h3-atlas] [data-h3-opt="chest"]').check();
  const mvOpen = await page.evaluate(() => { const E = window.PFT_ECHO; return [E.avOpen(0.3), E.avOpen(0.72)]; });
  ok(mvOpen[0] < 0.1 && mvOpen[1] > 0.9, 'the mitral valve is shut in systole and open in early filling (' + mvOpen.map(x => x.toFixed(2)).join(', ') + ')');

  // ================================================================ the echo lab: a bar, a screen and a deck
  await page.click('[data-eh-open="a4c"]'); await page.waitForSelector('[data-echolab]');
  ok(await page.locator('[data-echolab] .eh-toolbar [data-eh-target]').count() === 1 && await page.locator('[data-echolab] .eh-toolbar [data-eh-path]').count() === 1, 'one bar: the window, the target view, the heart');
  await page.waitForTimeout(900);
  const em = await boxes('[data-echolab] .eh-main > *');
  ok(em.length === 2 && em[0].y === em[1].y && Math.abs(em[0].h - em[1].h) <= 3 && Math.abs(em[0].w - em[1].w) <= 2, 'the screen and the 3-D heart side by side, the same size (' + em.map(b => b.w + '×' + b.h).join(', ') + ')');
  ok(await page.locator('[data-echolab] .eh-deck [data-eh]').count() >= 4 && await page.locator('[data-echolab] [data-eh-scoreslot]').count() === 1, 'the probe’s dials and the score in the deck below');
  const labH = await page.$eval('[data-echolab]', e => e.getBoundingClientRect().height);
  ok(labH < 1200, 'the lab is about one screen (' + Math.round(labH) + ' px)');
  const lp = await paint('[data-echolab] canvas.eh-canvas:not(.ehr-canvas)');
  ok(Math.abs(lp.w / lp.h - 320 / 260) < 0.02 && lp.sd > 12, 'the screen paints in the 320 : 260 frame');
  await page.hover('[data-echolab] .eh-deck .odc-sl .nod-l'); await waitPop();
  ok(await popOpen(), 'the probe’s dials explain themselves on hover');
  await away();

  // ================================================================ the haemodynamics lab keeps the same pattern
  await boot('hemo_lab', '[data-hemolab]');
  ok(await page.locator('[data-hemolab] .hm-controls.deck').count() === 1, 'its dials are a deck too');
  ok(await noSideScroll(), 'no sideways scroll at desktop width');

  // ================================================================ phone width: nothing scrolls sideways
  await page.setViewportSize({ width: 400, height: 800 });
  await home();
  const pt = await boxes('[data-home-grid] > [data-home-tile]');
  ok(await noSideScroll() && pt.every(b => b.x === pt[0].x && b.w === pt[0].w), 'phone: the home grid is one even column');
  for (const [topic, sel, name] of [['ecmo_lab', '[data-ecmolab]', 'the ECMO lab'], ['echo_views', '[data-echoatlas]', 'the echo atlas'], ['echo_lab', '[data-echolab]', 'the echo lab'], ['hemo_lab', '[data-hemolab]', 'the haemodynamics lab'], ['ecmo_intro', '.gt', 'a reading page']]) {
    await go(topic, sel); await page.waitForTimeout(400);
    ok(await noSideScroll(), 'phone: ' + name + ' does not scroll sideways');
  }
  await go('ecmo_lab', '[data-ecmolab]');
  await page.selectOption('[data-ec-scenario]', 'r_alk'); await page.waitForSelector('[data-ec-round-panel="r_alk"]'); await page.waitForTimeout(300);
  ok(await noSideScroll(), 'phone: a gas round does not scroll sideways');
  ok(await page.$eval('.ec-sheet-wrap', e => getComputedStyle(e).overflowX === 'auto' || getComputedStyle(e).overflowX === 'scroll'), 'the flowsheet scrolls inside its own frame');
  await page.locator('.gt').first().tap().catch(() => {});

  // ================================================================ dark theme: the new pieces take their colours from the tokens
  await page.setViewportSize({ width: 1380, height: 1000 });
  await home();
  const lum = async (sel, prop) => page.$eval(sel, (e, p) => { const m = /rgba?\((\d+), (\d+), (\d+)/.exec(getComputedStyle(e)[p]); return m ? (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) : -1; }, prop);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await page.waitForTimeout(200);
  const bgL = await lum('[data-home-tile]', 'backgroundColor'), fgL = await lum('[data-home-tile] .ht-sub', 'color');
  ok(bgL >= 0 && bgL < 70 && fgL > 120, 'dark: tiles are dark with light text (' + Math.round(bgL) + ' / ' + Math.round(fgL) + ')');
  await go('ecmo_lab', '[data-ecmolab]');
  await page.selectOption('[data-ec-scenario]', 'r_co2'); await page.waitForSelector('[data-ec-round-panel]');
  const rb = await lum('.ec-pending', 'backgroundColor'), rf = await lum('.ec-pending', 'color');
  ok(rb < 90 && rf > 120, 'dark: the orders bar reads (' + Math.round(rb) + ' / ' + Math.round(rf) + ')');

  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 3).join(' | '));
  console.log('e2e10 passed', passes, 'failed', fails);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('CRASH', e.message.split('\n').slice(0, 6).join('\n')); process.exit(2); });
