// v8.5: the real echo loop's clinical display and zoom, the scanning lab's "turn the probe" previews, the lead-placement
// lab (drag, swap, fall off, the reading), and the real nodules (measure, call, check; the hunt). Only failures print.
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
  const boot = async (topic, sel) => { await page.goto(FILE); await page.waitForSelector('[data-home]'); await page.evaluate((t) => window.__pft.setMode('learn', { topic: t }), topic); await page.waitForSelector(sel); };

  // ---- the real echo loop: display controls, grey map, zoom, the phase bar
  await boot('echo_views', '[data-echoatlas]');
  await page.waitForFunction(() => !!document.querySelector('[data-ehr-slot="a4c"] canvas'), null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  const loop = page.locator('[data-ehr-slot="a4c"] .ehr-loop');
  await loop.scrollIntoViewIfNeeded(); await page.evaluate(() => { const st = document.querySelector('[data-h3-atlas]'); if (st) st.style.display = 'none'; }); await page.waitForTimeout(300);
  ok(await loop.locator('[data-ehr-more]').isHidden(), 'display controls start folded');
  await loop.locator('[data-ehr-moretoggle]').click();
  ok(await loop.locator('[data-ehr-more]').isVisible() && await loop.locator('[data-ehr-gain]').count() === 1 && await loop.locator('[data-ehr-dr]').count() === 1 && await loop.locator('[data-ehr-map]').count() === 1, 'gain, dynamic range and grey map controls');
  await loop.locator('[data-ehr-map]').selectOption('sepia');
  ok(await page.evaluate(() => window.__pft.EHR.map === 'sepia'), 'grey map set');
  await loop.locator('[data-ehr-gain]').evaluate(e => { e.value = '1.4'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  ok(await page.evaluate(() => Math.abs(window.__pft.EHR.gain - 1.4) < 1e-9), 'gain set');
  await loop.locator('[data-ehr-map]').selectOption('clinical'); await loop.locator('[data-ehr-gain]').evaluate(e => { e.value = '1'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  const cvb = await loop.locator('canvas').boundingBox();
  ok(cvb.height > cvb.width, 'the loop canvas carries the image and the phase bar');
  await page.mouse.click(cvb.x + cvb.width * 0.5, cvb.y + cvb.height * 0.4); await page.waitForTimeout(300);
  const z = await loop.evaluate(e => e.ehr.state.zoom);
  ok(z && z.k === 2 && z.d > 20 && z.d < 140, 'click zooms ×2 on the point (' + JSON.stringify(z) + ')');
  await page.mouse.click(cvb.x + cvb.width * 0.5, cvb.y + cvb.height * 0.4); await page.waitForTimeout(200);
  ok(await loop.evaluate(e => e.ehr.state.zoom) === null, 'click again zooms out');
  const draw = await loop.evaluate(e => { const t = performance.now(); for (let i = 0; i < 4; i++) e.ehr.draw(); return (performance.now() - t) / 4; });
  ok(draw < 120, 'a frame draws in under 120 ms (' + draw.toFixed(0) + ')');

  // ---- the scanning lab: the probe previews, the three-column layout, the slider ends
  await boot('echo_lab', '[data-echoreal]');
  await page.waitForFunction(() => document.querySelectorAll('[data-ehr-moves] .ehr-move').length > 0, null, { timeout: 60000 });
  const moves = await page.$$eval('[data-ehr-moves] .ehr-move', els => els.map(e => e.getAttribute('data-ehr-move')));
  ok(moves.join() === 'phi-,phi+,tau-,tau+,mode', 'five moves along the beam: ' + moves.join());
  const before = await page.$eval('[data-ehr-readout]', e => e.textContent);
  await page.click('[data-ehr-move="tau+"]'); await page.waitForTimeout(400);
  const after = await page.$eval('[data-ehr-readout]', e => e.textContent);
  ok(/tilt 10°/.test(after) && before !== after, 'a preview applies its move: ' + after);
  await page.click('[data-ehr-move="mode"]'); await page.waitForTimeout(500);
  const moves2 = await page.$$eval('[data-ehr-moves] .ehr-move', els => els.map(e => e.getAttribute('data-ehr-move')));
  ok(moves2.join() === 'c-,c+,mode', 'across the beam: shallower, deeper, back');
  ok(await page.$eval('[data-ehr-row="phi"]', e => e.hidden) && !(await page.$eval('[data-ehr-row="c"]', e => e.hidden)), 'the depth slider shows across the beam, the rotation hides');
  ok(await page.$$eval('.ehr-ends', els => els.length >= 3 && els.every(e => e.textContent.length > 10)), 'slider ends name the manoeuvre');
  const g3 = await page.$eval('.ehr-grid3', e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
  ok(g3 === 3, 'three columns at 1380 px: loop, 3-D, controls (' + g3 + ')');
  ok(await page.$$eval('.ehr-thumb', els => els.every(c => c.width >= 200)), 'thumbnails rendered at 2× pixels');

  // ---- the lead-placement lab
  await boot('leads', '[data-leadslab]');
  ok(await page.$$eval('[data-ld-el]', els => els.length === 10), 'ten electrodes on the torso');
  ok(await page.$$eval('[data-ld-mishap] option', els => els.length >= 18), 'the mishap list');
  ok(/none/.test(await page.$eval('[data-ld-flag]', e => e.getAttribute('data-ld-flag'))), 'correct placement reads clean');
  for (const [id, flag] of [['ra_la', 'p_avr'], ['ra_rl', 'flat_ii'], ['la_ll', 'p_i_ii'], ['off_rl', 'hum_all'], ['off_v3', 'off_chest'], ['v1_v2', 'v1v2'], ['v12_high', 'v12_high'], ['dextro', 'p_avr']]) {
    await page.selectOption('[data-ld-mishap]', id); await page.waitForTimeout(250);
    const f = await page.$$eval('[data-ld-flag]', els => els.map(e => e.getAttribute('data-ld-flag')));
    ok(f.indexOf(flag) >= 0, id + ' read as ' + flag + ' (' + f.join() + ')');
  }
  await page.selectOption('[data-ld-mishap]', 'ra_la'); await page.waitForTimeout(250);
  ok(await page.$$eval('[data-ld-chip]', els => els.filter(e => /inv/.test(e.className)).map(e => e.getAttribute('data-ld-chip')).join()) === 'I,aVR,aVL', 'RA/LA comparison: I, aVR, aVL inverted');
  ok(await page.$$eval('.ld-cable', els => els.length === 2), 'the swapped electrodes carry their cable tag');
  ok(/commonest error/.test(await page.$eval('[data-ld-teach]', e => e.textContent)), 'the teaching note for the mishap');
  // drag V4 down: a custom set-up
  await page.selectOption('[data-ld-mishap]', 'ok'); await page.waitForTimeout(200);
  const v4 = await page.$('[data-ld-el="V4"]'); const bb = await v4.boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2 + 30, { steps: 6 }); await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2 + 60, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(400);
  ok(await page.$eval('[data-leadslab]', e => e.getAttribute('data-ld-state')) === 'custom', 'dragging makes it your own set-up');
  ok(await page.$$eval('[data-ld-chip]', els => els.some(e => e.getAttribute('data-ld-chip') === 'V4' && /chg/.test(e.className))), 'V4 moved: its chip changed');
  // click RA: the panel, the highlighted leads; let it fall off; swap with LA
  const ra = await page.$('[data-ld-el="RA"]'); const rb = await ra.boundingBox(); await page.mouse.click(rb.x + rb.width / 2, rb.y + rb.height / 2); await page.waitForTimeout(300);
  ok(/Right arm/.test(await page.$eval('[data-ld-elpanel] h5', e => e.textContent)) && /anywhere on the limb/.test(await page.$eval('.ld-where', e => e.textContent)), 'the electrode panel says where it goes');
  const hi = await page.$$eval('.ecg-tr.ld-hi', els => Array.from(new Set(els.map(e => e.getAttribute('data-lead')))));
  ok(hi.length === 11 && hi.indexOf('III') < 0, 'RA feeds eleven leads, not III');
  await page.click('[data-ld-off]'); await page.waitForTimeout(350);
  ok(await page.$$eval('[data-ld-flag]', els => els.map(e => e.getAttribute('data-ld-flag')).join()) === 'off_limb', 'RA off read from the noise');
  ok(await page.$eval('[data-ld-el="RA"]', e => e.classList.contains('off')), 'the electrode is drawn detached');
  await page.click('[data-ld-off]'); await page.waitForTimeout(300);
  await page.click('[data-ld-swap]'); await page.waitForTimeout(200);
  const la = await page.$('[data-ld-el="LA"]'); const lb = await la.boundingBox(); await page.mouse.click(lb.x + lb.width / 2, lb.y + lb.height / 2); await page.waitForTimeout(350);
  ok(await page.$$eval('[data-ld-flag]', els => els.map(e => e.getAttribute('data-ld-flag')).indexOf('p_avr') >= 0), 'swapping RA and LA by clicking reads as the reversal');
  await page.click('[data-ld-reset]'); await page.waitForTimeout(300);
  ok(await page.$eval('[data-leadslab]', e => e.getAttribute('data-ld-state')) === 'ok' && await page.$$eval('.ld-cable', els => els.length === 0), 'back to the correct placement');
  await page.selectOption('[data-ld-src]', 'stemi_inf_rv'); await page.waitForTimeout(400);
  await page.selectOption('[data-ld-mishap]', 'right'); await page.waitForTimeout(400);
  ok(await page.$$eval('[data-ld-chip]', els => els.length === 12), 'another heart through right-sided leads renders');

  // ---- the real nodules: measure, call, check; the hunt
  await boot('nodules', '[data-nodreal]');
  await page.waitForTimeout(1200);
  await (await page.$('[data-nodreal]')).scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  ok(await page.$$eval('[data-nr-case]', els => els.length === 6), 'six cases');
  ok(/slice 0/.test(await page.evaluate(() => { const c = document.querySelector('.nr-canvas'); return c.getContext('2d').canvas.width > 0 ? 'slice 0' : ''; })) && await page.$eval('[data-nr-k]', e => +e.value === 8), 'opens on the index slice');
  const cv = await page.$('.nr-canvas'); await cv.scrollIntoViewIfNeeded(); const cb = await cv.boundingBox(); const k = cb.width / 96;
  const drag = async (x0, y0, x1, y1) => { await page.mouse.move(cb.x + x0 * k, cb.y + y0 * k); await page.mouse.down(); await page.mouse.move(cb.x + x1 * k, cb.y + y1 * k, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(150); };
  await drag(41.5, 48, 54.5, 48); await drag(48, 42.5, 48, 53.5);
  const meas = await page.$eval('[data-nr-measure]', e => e.textContent);
  ok(/Long 9\.9 × short 8\.4 mm · mean 9\.1/.test(meas) || /mean (8|9)\.\d mm/.test(meas), 'calipers measure in mm: ' + meas);
  ok(await page.$eval('[data-nr-size]', e => +e.value > 8 && +e.value < 10), 'the mean fills the size field');
  ok(/Single solid > 8 mm/.test(await page.$eval('[data-nr-plan]', e => e.textContent)), 'the plan follows from the size');
  await page.click('[data-nr-checkbtn]'); await page.waitForTimeout(200);
  ok(await page.$$eval('.nr-verdict', els => els.length === 0), 'check waits for the call');
  await page.click('[data-nr-what="nodule"]'); await page.click('[data-nr-checkbtn]'); await page.waitForTimeout(300);
  ok(await page.$$eval('.nr-verdict.good', els => els.length === 1) && /Left upper lobe nodule/.test(await page.$eval('.nr-truth', e => e.textContent)) && /within the 1.5 mm/.test(await page.$eval('.nr-verdict', e => e.textContent)), 'the verdict: right call, measurement within error');
  ok(/multiple-nodule rows/.test(await page.$eval('.nr-verdict', e => e.textContent)), 'the plan from the reference uses the multiple-nodule rows');
  // the probe: hover shows HU
  await page.mouse.move(cb.x + 48 * k, cb.y + 48 * k); await page.waitForTimeout(150);
  ok(await page.evaluate(() => { const c = document.querySelector('.nr-canvas'); return !!c; }), 'probe hover does not throw');
  // scrolling: wheel moves the slice
  await page.mouse.wheel(0, 120); await page.waitForTimeout(150);
  ok(await page.$eval('[data-nr-k]', e => +e.value === 9), 'wheel scrolls a slice');
  await page.click('[data-nr-win="med"]'); await page.waitForTimeout(100);
  ok(await page.$eval('[data-nr-win="med"]', e => e.getAttribute('aria-checked') === 'true'), 'mediastinal window');
  // case 5 is a vessel
  await page.click('[data-nr-case="4"]'); await page.waitForTimeout(500);
  await page.click('[data-nr-what="vessel"]'); await page.click('[data-nr-checkbtn]'); await page.waitForTimeout(300);
  ok(await page.$$eval('.nr-verdict.good', els => els.length === 1) && /vessel/i.test(await page.$eval('.nr-truth', e => e.textContent)), 'the vessel called a vessel');
  ok(/2 of 2 called right/.test(await page.$eval('[data-nr-score]', e => e.textContent)), 'the score');
  await page.click('[data-nr-case="2"]'); await page.waitForTimeout(400);
  await page.click('[data-nr-what="vessel"]'); await page.click('[data-nr-checkbtn]'); await page.waitForTimeout(300);
  ok(await page.$$eval('.nr-verdict:not(.good)', els => els.length === 1), 'the nodule called a vessel is wrong');
  // the hunt
  const hunt = await page.$('[data-nodhunt]'); await hunt.scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
  ok(/0 of 4 found/.test(await page.$eval('[data-nh-status]', e => e.textContent)), 'the hunt starts at nought');
  await page.click('[data-nh-hint]'); await page.waitForTimeout(600);
  const t = await page.evaluate(() => PFT_NODREAL.cases.filter(c => c.kind === 'nodule')[0].hunt);
  const hc = await page.$('.nh-canvas'); const hb = await hc.boundingBox();
  await page.mouse.click(hb.x + t.x / 448 * hb.width, hb.y + t.y / 326 * hb.height); await page.waitForTimeout(300);
  ok(/1 of 4 found/.test(await page.$eval('[data-nh-status]', e => e.textContent)), 'clicking the nodule finds it');
  await page.mouse.click(hb.x + 40 / 448 * hb.width, hb.y + 40 / 326 * hb.height); await page.waitForTimeout(300);
  ok(/1 of 4 found · 2 marks/.test(await page.$eval('[data-nh-status]', e => e.textContent)), 'a miss is a mark, not a find');
  await page.click('[data-nh-reset]'); await page.waitForTimeout(200);
  ok(/0 of 4 found/.test(await page.$eval('[data-nh-status]', e => e.textContent)), 'start again');
  // the home links to the lead lab
  await page.goto(FILE); await page.waitForSelector('[data-home]');
  ok(await page.$$eval('[data-home] a, [data-home] button', els => els.some(e => /Lead placement/.test(e.textContent))), 'home links to the lead placement');

  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  console.log('e2e8 passed', passes, 'failed', fails);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('E2E CRASH', e); process.exit(2); });
