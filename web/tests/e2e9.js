// v8.6: the heart–lung interaction area (Kenny) — every diagram renders, moves with its controls, and reads the model;
// the home tile and the learn index reach it; the old compact lab in the physiology area is still there. Only failures print.
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
  const boot = async (topic, sel) => { await page.goto(FILE); await page.waitForSelector('[data-home]'); await page.evaluate((t) => window.__pft.setMode('learn', { topic: t }), topic); await page.waitForSelector(sel); await page.waitForTimeout(300); };
  const setSlider = async (scope, key, v) => { await page.locator(scope + ' [data-hk-sl="' + key + '"]').first().evaluate((e, val) => { e.value = String(val); e.dispatchEvent(new Event('input', { bubbles: true })); }, v); await page.waitForTimeout(150); };
  const text = async (sel) => page.$eval(sel, e => e.textContent);

  // ---- the bag, the box and the tube
  await boot('hl_bag', '[data-hkbag]');
  ok(await page.$$eval('[data-hkbag] svg', s => s.length) >= 4, 'the scene and the three strips');
  const eq0 = await text('[data-hk-eq]');
  ok(/Equation of motion/.test(eq0) && /elastic/.test(eq0) && /resistive/.test(eq0), 'the equation of motion reads out');
  const read0 = await text('[data-hk-bagread]');
  ok(/pleural pressure -?\d/.test(read0) && /transpulmonary/.test(read0), 'the breath reads out its pleural and transpulmonary pressures');
  await page.click('[data-hk-bagmode="passive"]'); await page.waitForTimeout(400);
  ok(/ventilator/.test(await text('[data-hk-eq]')), 'a ventilator breath: the ventilator’s pressure drives the equation');
  await page.click('[data-hk-bagmode="peep"]'); await setSlider('[data-hkbag]', 'peep', 10); await page.waitForTimeout(300);
  const r1 = await text('[data-hk-bagread]'); ok(r1 !== read0, 'the readout changes with the mode and PEEP');
  await page.click('[data-hk-play]'); ok(await text('[data-hk-play]') === '▶', 'pause toggles');

  // ---- the Campbell diagram
  await boot('hl_campbell', '[data-hkcampbell]');
  ok(await page.$$eval('[data-hkcampbell] .hk-loop', s => s.length) >= 1 && await page.$$eval('[data-hkcampbell] .hk-curve', s => s.length) >= 2, 'the loop and the curves');
  const camRead = async () => page.$eval('[data-hk-camread]', e => Array.from(e.querySelectorAll('div')).map(d => d.textContent).join(' | '));
  const c0 = await camRead(); ok(/FRC/.test(c0) && /Work/.test(c0), 'the reading: FRC and work');
  const wob = async () => page.$eval('[data-hk-camread]', e => { const d = Array.from(e.querySelectorAll('div')).filter(x => /Work of breathing/.test(x.textContent))[0]; const m = d && /(\d+\.\d) J\/min/.exec(d.querySelector('dd').textContent); return m ? parseFloat(m[1]) : NaN; });
  const w0 = await wob();
  await page.selectOption('[data-hk-campreset]', 'asthma'); await page.waitForTimeout(300);
  const w1 = await wob(); ok(w1 > w0 * 2, 'asthma multiplies the work of breathing: ' + w0 + ' → ' + w1);
  ok(await page.$$eval('[data-hkcampbell] .hk-area.threshold', s => s.length) >= 1, 'auto-PEEP draws the threshold area');
  await page.selectOption('[data-hk-campreset]', 'vent'); await page.waitForTimeout(300);
  ok(await page.locator('[data-hk-view]').isVisible(), 'a ventilator breath offers the Rahn view');
  await page.click('[data-hk-camview="rahn"]'); await page.waitForTimeout(300);
  ok(await page.$$eval('[data-hkcampbell] .hk-loop', s => s.length) >= 1, 'the Rahn view draws');
  await page.selectOption('[data-hk-campreset]', 'normal'); await page.selectOption('[data-hk-cammode]', 'spont'); await page.waitForTimeout(200);
  ok(await page.locator('[data-hk-view]').isHidden(), 'a spontaneous breath hides the view switch');
  await setSlider('[data-hkcampbell]', 'cl', 0.4); const w2 = await wob(); ok(w2 > w0, 'a stiff lung costs more work');

  // ---- transmission
  await page.evaluate(() => window.__pft.setMode('learn', { topic: 'hl_campbell' })); await page.waitForSelector('[data-hkptrans]');
  const t0 = await text('[data-hk-tread]');
  await page.click('[data-hk-tpre="ardse"]'); await page.waitForTimeout(200);
  const t1 = await text('[data-hk-tread]'); ok(t1 !== t0 && /pleura|pleural/i.test(t1), 'the extrapulmonary ARDS preset moves the bar to the pleura');
  ok(await page.$$eval('[data-hk-tbar] .hk-tseg', s => s.length) === 2, 'two segments: lung and pleura');

  // ---- the Guyton diagram
  await boot('hl_guyton', '[data-hkguyton]');
  const op = async () => page.$eval('[data-hk-guyread]', e => { const rows = Array.from(e.querySelectorAll('div')).map(d => d.textContent); const co = rows.filter(r => /output/i.test(r))[0], pra = rows.filter(r => /atrial/i.test(r))[0]; return { co: parseFloat((co || '').replace(/.*?(-?\d+\.\d).*/, '$1')), pra: parseFloat((pra || '').replace(/.*?(-?\d+\.\d).*/, '$1')) }; });
  const g0 = await op(); ok(g0.co > 4.5 && g0.co < 6 && g0.pra > 0.5 && g0.pra < 3.5, 'the normal crossing ' + JSON.stringify(g0));
  await setSlider('[data-hkguyton]', 'pms', 12); const g1 = await op(); ok(g1.co > g0.co && g1.pra > g0.pra, 'more stressed volume: more output, higher Pra');
  await page.check('[data-hk-ghost]'); await page.waitForTimeout(200);
  ok(await page.$$eval('[data-hkguyton] .hk-curve.ghost', s => s.length) >= 2, 'the ghost shows the normal curves');
  await page.selectOption('[data-hk-guypreset]', await page.$$eval('[data-hk-guypreset] option', o => o.map(x => x.value).filter(v => /tamp|peep|vent|squeeze|pressure/i.test(v))[0] || o[1].value)); await page.waitForTimeout(200);
  const g2 = await op(); ok(isFinite(g2.co) && (g2.co !== g1.co || g2.pra !== g1.pra), 'a preset moves the crossing');
  await setSlider('[data-hkguyton]', 'contr', 1.6); const g3 = await op(); ok(g3.co > g2.co && g3.pra < g2.pra, 'and the sliders still work after a preset (a stronger heart empties the atrium)');

  // ---- the union, animated
  await boot('hl_union', '[data-hkunion="main"]');
  ok(await page.$$eval('[data-hk-union]', s => s.length) === 1 && await page.$$eval('[data-hkunion="main"] .hk-tr', s => s.length) >= 4, 'the oblique diagram and the strips');
  const uniRead = async () => page.$eval('[data-hk-uniread]', e => e.textContent);
  const u0 = await uniRead(); ok(/output/i.test(u0), 'the union reads out');
  await page.selectOption('[data-hk-uniscen]', 'peep_dry'); await page.waitForTimeout(500);
  const u1 = await uniRead(); ok(u1 !== u0 && /dry|empty|PEEP/i.test(await text('[data-hk-uninote]')), 'PEEP in the empty patient: a new note and readout');
  await page.click('[data-hk-uniplay]'); ok(await text('[data-hk-uniplay]') === '▶', 'the union pauses');
  await page.click('[data-hk-unispeed="2"]'); ok(await page.$eval('[data-hk-unispeed="2"]', e => e.classList.contains('on')), 'speed 2×');
  const frameOk = await page.evaluate(() => { const f = document.querySelector('[data-hkunion="main"]'); f.hk.frame(0.25); const a = f.querySelector('[data-hk-uop]'); const p1 = a && (a.getAttribute('cx') + ',' + a.getAttribute('cy')); f.hk.frame(0.75); const b = f.querySelector('[data-hk-uop]'); const p2 = b && (b.getAttribute('cx') + ',' + b.getAttribute('cy')); return !!p1 && !!p2 && p1 !== p2; });
  ok(frameOk, 'the operating point moves through the breath');
  await page.click('[data-hkunion="main"] .hk-knobs summary'); await setSlider('[data-hkunion="main"]', 'pms', 14);
  ok((await uniRead()) !== u1, 'a knob changes the run');

  // ---- in sickness and in weaning: the pickers
  await boot('hl_sick', '[data-hkunion="sick"]');
  const sickOpts = await page.$$eval('[data-hkunion="sick"] [data-hk-uniscen] option', o => o.map(x => x.value));
  ok(sickOpts.indexOf('copd_sp') >= 0 && sickOpts.indexOf('ards_e') >= 0 && sickOpts.indexOf('quiet') < 0, 'the sickness picker lists the diseases, not health');
  await page.selectOption('[data-hkunion="sick"] [data-hk-uniscen]', 'ards_e'); await page.waitForTimeout(400);
  ok(/chest wall|extrapulmonary/i.test(await page.$eval('[data-hkunion="sick"] [data-hk-uninote]', e => e.textContent)), 'ARDSexp note');
  await boot('hl_wean', '[data-hkunion="wean"]');
  const weanOpts = await page.$$eval('[data-hkunion="wean"] [data-hk-uniscen] option', o => o.map(x => x.value));
  ok(weanOpts[0] === 'wean' || weanOpts.indexOf('wean') >= 0, 'the weaning picker starts with the failed trial');
  ok(await page.$$eval('[data-hkunion="wean"] [data-hk-uniscen] optgroup', g => g.length) >= 1, 'grouped');

  // ---- the PVR–volume curve
  await boot('hl_health', '[data-hkpvr]');
  ok(await page.$$eval('[data-hkpvr] svg', s => s.length) >= 1 && /FRC/.test(await text('[data-hk-pvrread]')), 'the U-shaped curve with its reading');

  // ---- the same CVP, three patients
  await boot('hl_cvp', '[data-hkcvp3]');
  const cvp = async () => page.$eval('[data-hk-cvp3read]', e => e.textContent);
  const v0 = await cvp(); ok(/2\.0 mmHg/.test(v0) && /Cardiac output/.test(v0), 'the CVP is 2 and the output is read');
  await page.click('[data-hk-cvp3="dry"]'); await page.waitForTimeout(200); const v1 = await cvp();
  await page.click('[data-hk-cvp3="full"]'); await page.waitForTimeout(200); const v2 = await cvp();
  const coOf = (s) => parseFloat(s.replace(/.*Cardiac output(-?\d+\.\d).*/, '$1'));
  ok(/2\.0 mmHg/.test(v1) && /2\.0 mmHg/.test(v2) && coOf(v2) > coOf(v1) + 1.5, 'the same CVP, outputs litres apart: ' + coOf(v1) + ' vs ' + coOf(v2));
  ok(/responsive/.test(v1), 'and a verdict on a bolus');

  // ---- the PVR illusion
  await boot('hl_pac', '[data-hkpq]');
  const pvr = async () => parseFloat((await text('[data-hk-pqread]')).replace(/.*Calculated PVR (\d+).*/, '$1'));
  const p0 = await pvr(); ok(p0 > 100 && p0 < 200, 'baseline PVR ' + p0);
  await page.click('[data-hk-pq="valsalva"]'); await page.waitForTimeout(200); const p1 = await pvr(); ok(p1 > p0, 'Valsalva: the PVR "rises" ' + p0 + ' → ' + p1);
  await page.click('[data-hk-pq="pe"]'); await page.waitForTimeout(200); const p2 = await pvr(); ok(p2 > p0, 'embolism: it rises');
  await page.click('[data-hk-pq="ne"]'); await page.waitForTimeout(200); const p3 = await pvr(); ok(p3 < p2 && /closing pressure 10/.test(await text('[data-hk-pqread]')), 'norepinephrine: it falls while the closing pressure stays');
  await page.click('[data-hk-pq="lysis"]'); await page.waitForTimeout(200); const p4 = await pvr(); ok(p4 < p2 && p4 > p0 - 1, 'lysis: back towards baseline');
  ok(await page.$$eval('[data-hk-pqop]', s => s.length) === 1, 'the operating point');

  // ---- two stresses, one diagram
  await boot('hl_dynamic', '[data-hktwostress]');
  const dco = async () => parseFloat((await text('[data-hk-tsread]')).replace(/.*\(([-+]?\d+) %\).*/, '$1'));
  await page.selectOption('[data-hk-tsstress]', 'breath'); await page.waitForTimeout(200);
  const b1 = await dco(); ok(Math.abs(b1) >= 8, 'a mechanical breath moves the responder’s output: ' + b1 + ' %');
  await page.selectOption('[data-hk-tspat]', 'nonresp'); await page.waitForTimeout(200);
  const b2 = await dco(); ok(Math.abs(b2) < Math.abs(b1), 'but not the patient on the plateau: ' + b2 + ' %');
  await page.selectOption('[data-hk-tsstress]', 'plr'); await page.waitForTimeout(200);
  const b3 = await dco(); ok(Math.abs(b3) < 10 && /plateau/.test(await text('[data-hk-tsread]')), 'a leg raise on the plateau: little (' + b3 + ' %)');
  await page.selectOption('[data-hk-tspat]', 'resp'); await page.waitForTimeout(200);
  const b4 = await dco(); ok(b4 >= 10 && /responder/.test(await text('[data-hk-tsread]')), 'a leg raise on the slope: a responder (' + b4 + ' %)');
  await page.selectOption('[data-hk-tspat]', 'rvload'); await page.selectOption('[data-hk-tsstress]', 'breath'); await page.waitForTimeout(200);
  ok(/false positive/.test(await text('[data-hk-tsread]')), 'RV afterload: the false positive');
  ok(await page.$$eval('[data-hktwostress] .hk-curve.ghost', s => s.length) >= 2, 'the ghost curves of the patient at rest');

  // ---- strain and stress
  await boot('hl_resp9', '[data-hkstrain]');
  ok(/strain of 1\.00/.test(await text('[data-hk-strainread]')), '400 into 400 is a strain of 1');
  await setSlider('[data-hkstrain]', 'baby', 200); ok(/strain of 2\.00/.test(await text('[data-hk-strainread]')) && /beyond TLC|collagen/.test(await text('[data-hk-strainread]')), 'a smaller baby lung doubles it');
  await setSlider('[data-hkstrain]', 'raiser', 3); ok(/72 cm H2O/.test(await text('[data-hk-strainread]')), 'a stress raiser multiplies the local stress');

  // ---- the geometrical framework
  await boot('hl_frame', '[data-hkgeom]');
  const regime = async () => page.$eval('[data-hk-geomread]', e => Array.from(e.querySelectorAll('div')).filter(d => /Regime/.test(d.textContent))[0].querySelector('dd').textContent);
  const qOf = async () => page.$eval('[data-hk-geomread]', e => parseFloat(Array.from(e.querySelectorAll('div')).filter(d => /Q circulatory/.test(d.textContent))[0].querySelector('dd').textContent));
  ok(await regime() === 'unlimited', 'the default is unlimited');
  const q0 = await qOf();
  await page.check('[data-hk-prone]'); await page.waitForTimeout(200);
  ok(await qOf() > q0 && await page.$$eval('[data-hkgeom] .hk-curve.ghost', s => s.length) >= 2, 'prone: the responder’s flow rises; the supine triangles ghost');
  await page.uncheck('[data-hk-prone]');
  await page.selectOption('[data-hk-geompat]', 'nonresp'); await page.waitForTimeout(200);
  ok(await regime() === 'cardiac-limited', 'the unresponsive patient is cardiac-limited');
  const q1 = await qOf(); await setSlider('[data-hkgeom]', 'pmsf', 14); ok(Math.abs(await qOf() - q1) < 0.05, 'more Pms changes nothing but the Pra on the plateau');
  await page.selectOption('[data-hk-geompat]', 'venous'); await page.waitForTimeout(200);
  ok(await regime() === 'venous-limited', 'the collapsing veins are venous-limited');
  await setSlider('[data-hkgeom]', 'pcrit', -4); ok(await regime() === 'unlimited', 'lowering the collapse pressure after the preset frees the veins');
  ok(await page.$$eval('[data-hk-geom2] svg', s => s.length) === 1 && /1 : 1/.test(await text('[data-hk-geom2read]')), 'the 2025 letter panel');

  // ---- the index, the home and the old lab
  await page.goto(FILE); await page.waitForSelector('[data-home]');
  ok(await page.$$eval('[data-home-tile="hl"]', s => s.length) === 1, 'the home tile');
  ok(await page.$$eval('[data-home] button', els => els.some(e => /Campbell/.test(e.textContent))), 'the home links to the Campbell diagram');
  await page.click('[data-home-tile="hl"]'); await page.waitForTimeout(400);
  ok(await page.$$eval('.learn-nav', s => s.length) === 1 && await page.$eval('#learn-cat', e => e.value) === 'hl', 'the tile opens the area');
  await boot('heartlung', '[data-hl-reads]');
  ok(await page.$$eval('[data-hl-preset]', s => s.length) === 1 && await page.$$eval('[data-hl-mode]', s => s.length) === 2, 'the compact lab in the physiology area still renders');

  // ---- phone width: nothing overflows
  await page.setViewportSize({ width: 400, height: 800 });
  for (const [topic, sel] of [['hl_bag', '[data-hkbag]'], ['hl_campbell', '[data-hkcampbell]'], ['hl_union', '[data-hkunion="main"]'], ['hl_frame', '[data-hkgeom]']]) {
    await boot(topic, sel);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(over <= 1, topic + ' at 400 px: no horizontal overflow (' + over + ')');
  }

  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  console.log('e2e9 passed', passes, 'failed', fails);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('E2E CRASH', e); process.exit(2); });
