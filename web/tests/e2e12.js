// v8.9: the hemos calculator in the browser — the chart's inputs and its seven results, results arriving as the numbers do, the caret
// staying put, entries that cannot be right, the guards, the bars and bands, each row's arithmetic and limits, the options and
// circumstances, an earlier set, the note, the example patients with the model's truth, the lab's way in, the reading page,
// nothing stored, phone width, the dark theme. Only failures print.
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
  const go = async (topic, sel) => { await page.evaluate((t) => window.__pft.setMode('learn', { topic: t }), topic); await page.waitForSelector(sel); await page.waitForTimeout(200); };
  const txt = async (sel) => page.$eval(sel, e => e.textContent);
  const val = async (id) => txt('[data-hc-v="' + id + '"]');
  const count = (sel) => page.locator(sel).count();
  const fill = async (o) => { for (const k of Object.keys(o)) await page.fill('[data-hc="' + k + '"]', String(o[k])); await page.waitForTimeout(80); };
  const clear = async () => { await page.click('[data-hc-clear]'); await page.waitForSelector('[data-hemocalc][data-hc-filled="0"]'); };
  const noSideScroll = async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  const SET = { wt: 82, ht: 178, hb: 11.4, sao2: 96, svo2: 58, cvp: 14, map: 72, pas: 48, pad: 24, pcwp: 22 };

  // ================================================================ where it lives
  await home();
  ok(await count('[data-home-link="hemo_calc"]') === 1 && (await txt('[data-home-link="hemo_calc"]')) === 'Hemos calculator' && await count('[data-home-link="hemo_lab"]') === 1 && await count('[data-home-link="hemo_cases"]') === 1, 'the haemodynamics tile on the home page links to the hemos calculator, beside the lab and the scenarios');
  ok(await count('[data-home-lab="hemo_calc"]') === 1, 'and lists it among the labs');
  await page.click('[data-home-lab="hemo_calc"]'); await page.waitForSelector('[data-hemocalc]');
  ok(await page.getAttribute('.learn-body', 'data-topic') === 'hemo_calc' && await page.locator('#learn-cat').inputValue() === 'hemo', 'the chip opens it in the haemodynamics area');
  ok(await count('.ln-btn[data-topic]') === 12 && await count('.ln-btn[data-topic="hemo_calc"]') === 1 && await count('.ln-btn[data-topic="hemo_limits"]') === 1, 'the area has twelve topics, two of them new');
  ok(/chart’s own formulas/.test(await txt('.learn-body')) && /not a medical device/.test(await txt('.learn-body')) && /Sources/.test(await txt('.learn-body')), 'the page says what the sheet does, what it is not, and where the limits come from');

  // ================================================================ an empty sheet
  ok(await count('[data-hc-row]') === 26 && await count('[data-hc-row].empty') === 26 && await count('[data-hc-need]') === 26 && await count('[data-hc-limit]') === 26, 'empty: twenty-six rows, each saying what it needs and what it cannot tell you');
  ok(await count('[data-hc-group]') === 5 && (await page.$$eval('[data-hc-group="chart"] [data-hc-row]', a => a.map(e => e.getAttribute('data-hc-row')).join())) === 'co,ci,bsa,svr,papi,cpo,pvr', 'five groups; the chart’s seven first, in the chart’s order');
  ok(await count('[data-hc-empty]') === 1 && await count('[data-hc-checks]') === 0 && await count('[data-hc-lines]') === 0 && await count('[data-hc-gauge]') === 0, 'nothing is flagged or read on an empty sheet');
  ok(await page.isDisabled('[data-hc-copy]') && await page.isDisabled('[data-hc-keep]'), 'nothing to copy or keep yet');
  ok((await page.$$eval('[data-hc-in] > .hc-fields [data-hc]', a => a.map(e => e.getAttribute('data-hc')).join())) === 'wt,ht,hb,sao2,svo2,cvp,map,pas,pad,pcwp', 'the ten inputs in the chart’s order');
  ok(await page.$$eval('[data-hc-in] [data-hc]', a => a.every(e => e.type === 'text' && e.getAttribute('inputmode') === 'decimal' && /^e\.g\. /.test(e.placeholder) && e.labels.length === 1 && e.value === '')), 'every input is labelled, takes decimals and shows an example');
  ok(/needs?/i.test(await txt('[data-hc-need="bsa"]')) && /weight, height/.test(await txt('[data-hc-need="bsa"]')) && /PA systolic, PA diastolic, CVP/.test(await txt('[data-hc-need="papi"]')), 'what BSA and PAPi are waiting for');

  // ================================================================ results arrive as the numbers do, and the caret stays
  await page.click('[data-hc="wt"]'); await page.keyboard.type('82');
  ok(await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-hc')) === 'wt' && await page.inputValue('[data-hc="wt"]') === '82', 'typing does not move the caret out of the field');
  ok(await val('vo2') === '287' && await val('bsa') === '—' && /height/.test(await txt('[data-hc-need="bsa"]')), 'weight alone: the assumed VO2; BSA still waits for the height');
  await page.keyboard.press('Tab');
  ok(await page.evaluate(() => document.activeElement.getAttribute('data-hc')) === 'ht', 'Tab moves down the chart');
  await page.keyboard.type('178');
  ok(await val('bsa') === '2.01' && await val('co') === '—' && await count('[data-hc-row="bsa"]:not(.empty)') === 1, 'height: BSA appears');
  await fill({ pas: 48, pad: 24, cvp: 14 });
  ok(await val('papi') === '1.71' && await val('mpap') === '32' && await val('pvr') === '—', 'three pressures: PAPi and the mean PA');
  await fill({ hb: 11.4, sao2: 96, svo2: 58, map: 72, pcwp: 22 });
  ok(await val('co') === '4.9' && await val('ci') === '2.5' && await val('bsa') === '2.01' && await val('svr') === '938' && await val('papi') === '1.71' && await val('cpo') === '0.79' && await val('pvr') === '2.0', 'all ten: CO 4.9, CI 2.5, BSA 2.01, SVR 938, PAPi 1.71, CPO 0.79, PVR 2.0 — the chart’s formulas');
  ok(await page.getAttribute('[data-hemocalc]', 'data-hc-filled') === '10' && await count('[data-hc-empty]') === 0 && !(await page.isDisabled('[data-hc-copy]')), 'the sheet knows it is full');
  ok(await val('sv') === '—' && /heart rate/.test(await txt('[data-hc-need="sv"]')) && await val('avd') === '5.8' && await val('o2er') === '40' && await val('tpg') === '10' && await val('dpg') === '2' && await val('rapcwp') === '0.64', 'the rest of what ten numbers hold; the per-beat rows wait for a heart rate');
  ok(!/NaN|Infinity|undefined|#DIV/.test(await txt('[data-hemocalc]')), 'no NaN, Infinity or error token anywhere');

  // ================================================================ bars, bands and chips
  ok(await count('[data-hc-gauge]') >= 14 && await count('[data-hc-gauge="co"] .hc-band') === 1 && await count('[data-hc-gauge="co"] .hc-mark') === 1 && await count('[data-hc-rng="co"]') === 1, 'each result with a normal range has a bar: band, mark, and the VO2 band where the output is involved');
  ok(await count('[data-hc-rng]') === 9 && await count('[data-hc-rng="papi"]') === 0 && await count('[data-hc-rng="mpap"]') === 0 && await count('[data-hc-rng="o2er"]') === 0, 'the VO2 band only where the output is in the number: nine of them, not PAPi, the mean PA or the extraction');
  ok(await page.$$eval('[data-hc-gauge] > span', a => a.every(e => { const l = parseFloat(e.style.left), w = e.style.width ? parseFloat(e.style.width) : 0; return l >= 0 && l <= 100 && l + w <= 100.5; })), 'everything on a bar stays on the bar');
  { const g = await page.$eval('[data-hc-gauge="co"]', e => ({ mark: parseFloat(e.querySelector('.hc-mark').style.left), rl: parseFloat(e.querySelector('.hc-rng').style.left), rw: parseFloat(e.querySelector('.hc-rng').style.width), label: e.getAttribute('aria-label') }));
    ok(Math.abs(g.mark - 4.944 / 12 * 100) < 0.2 && g.rl < g.mark && g.rl + g.rw > g.mark && /Cardiac output 4\.9 L\/min; normal 4–8; 3\.7–6\.2 if the true VO2/.test(g.label), 'the output’s mark at 4.9 of 12, inside its band, and described for a screen reader'); }
  ok(/3\.7–6\.2 if the true VO2 is 25% below or above/.test(await txt('[data-hc-range="co"]')) && /751–1,251/.test(await txt('[data-hc-range="svr"]')), 'the band in words beside the bar');
  ok((await txt('[data-hc-chip="co"]')) === 'in range' && (await txt('[data-hc-chip="papi"]')) === 'below 1.85' && (await txt('[data-hc-chip="o2er"]')) === 'above 30' && await page.getAttribute('[data-hc-row="papi"]', 'data-sev') === '1', 'a chip says where each sits, in words');
  ok(/11\.7 Wood units/.test(await txt('[data-hc-sub="svr"]')) && /162 dyn/.test(await txt('[data-hc-sub="pvr"]')) && /Normal 2 Wood units or less/.test(await txt('[data-hc-row="pvr"]')) && /Normal 22–30%/.test(await txt('[data-hc-row="o2er"]')), 'the second unit, and normal ranges with their units');

  // ================================================================ a row opened
  await page.click('[data-hc-toggle="co"]');
  ok(await page.getAttribute('[data-hc-toggle="co"]', 'aria-expanded') === 'true' && await count('[data-hc-detail="co"]') === 1 && await page.evaluate(() => document.activeElement.getAttribute('data-hc-toggle')) === 'co', 'a row opens and keeps the focus');
  ok(/287 ÷ \(1\.34 × 11\.4 × 10 × \(96 − 58\) ÷ 100\) = 287 ÷ 58\.0 = 4\.9/.test(await txt('[data-hc-worked="co"]')), 'its arithmetic with the patient’s numbers');
  ok(/gap of 38 points/.test(await txt('[data-hc-here="co"]')) && /4\.4 rather than 4\.9/.test(await txt('[data-hc-here="co"]')) && /125 mL\/min\/m²/.test(await txt('[data-hc-alts="co"]')) && /VA CART/.test(await txt('[data-hc-always="co"]')) && await count('[data-hc-always="co"] li') === 5, 'what the limits mean for these numbers, another way to the answer, and what is always true');
  await page.keyboard.press('Enter');
  ok(await page.getAttribute('[data-hc-toggle="co"]', 'aria-expanded') === 'false' && await count('[data-hc-detail]') === 0, 'Enter closes it again');
  await page.check('[data-hc-all]');
  ok(await count('[data-hc-detail]') === 26 && await count('[data-hc-always]') === 26, '“Open every row” opens all twenty-six');
  ok(/between 1\.50 and 2\.00/.test(await txt('[data-hc-here="papi"]')) && /between 1\.4 and 2\.6 Wood units/.test(await txt('[data-hc-here="pvr"]')) && /0\.64 W/.test(await txt('[data-hc-here="cpo"]')) && /crosses 2\.2/.test(await txt('[data-hc-here="ci"]')), 'two mm Hg on the CVP, three on the wedge, the CVP under the power, an index that cannot be placed');
  await page.uncheck('[data-hc-all]');
  ok(await count('[data-hc-detail]') === 0, 'and closes them');

  // ================================================================ the reading
  ok(await count('[data-hc-lines] li') === 6 && /cannot place this patient on either side of 2\.2/.test(await txt('[data-hc-line="perf"]')) && /congested on both sides/.test(await txt('[data-hc-line="cong"]')) && /Forrester II/.test(await txt('[data-hc-line="forrester"]')) && /isolated post-capillary/.test(await txt('[data-hc-line="ph"]')), 'what the numbers say: an undecided index, congestion on both sides, the quadrant, the PH class');
  ok(await page.getAttribute('[data-hc-method]', 'data-hc-method') === 'estimated Fick' && /commonly a quarter out/.test(await txt('[data-hc-method]')), 'and by what method');
  ok(await page.evaluate(() => { const g = document.querySelector('[data-hc-group="chart"]'), s = document.querySelector('[data-hc-read]'); return !!(g.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING); }), 'the reading follows the chart’s seven');

  // ================================================================ entries that cannot be right
  await fill({ hb: 110 });
  ok(await page.getAttribute('[data-hc-f="hb"]', 'data-state') === 'bad' && /110 g\/L is 11\.0/.test(await txt('[data-hc-msg="hb"]')) && await page.getAttribute('[data-hc="hb"]', 'aria-invalid') === 'true' && await count('[data-hc-check="entry-hb"]') === 1, 'haemoglobin in g/L: marked at the field and listed, with the conversion');
  ok(await val('co') === '—' && /haemoglobin \(check the entry\)/.test(await txt('[data-hc-need="co"]')) && await val('papi') === '1.71' && await val('bsa') === '2.01', 'the rows that need it wait; the others stand');
  await fill({ hb: 11.4 });
  ok(await page.getAttribute('[data-hc-f="hb"]', 'data-state') === 'ok' && (await txt('[data-hc-msg="hb"]')) === '' && await page.getAttribute('[data-hc="hb"]', 'aria-invalid') === null && await val('co') === '4.9' && await count('[data-hc-checks]') === 0, 'corrected: everything returns');
  await fill({ svo2: '0.58' });
  ok(/0\.58 is 58/.test(await txt('[data-hc-msg="svo2"]')) && await val('co') === '—', 'a fraction typed for a percentage');
  await fill({ svo2: 96 });
  ok(/not below the arterial/.test(await txt('[data-hc-err="co"]')) && await count('[data-hc-check="no-gap"]') === 1 && await val('svr') === '—' && await val('pvr') === '—', 'equal saturations: a reason, not a division by zero');
  await fill({ svo2: 58, cvp: 0 });
  ok(/cannot be divided by/.test(await txt('[data-hc-err="papi"]')) && await val('papi') === '—' && await val('svr') !== '—', 'a CVP of zero: no PAPi, SVR intact');
  await fill({ cvp: 3 });
  ok(await val('papi') === '8.00' && (await txt('[data-hc-chip="papi"]')) === 'CVP under 5: not interpretable' && await page.getAttribute('[data-hc-row="papi"]', 'data-st') === 'na', 'a CVP of 3: the PAPi is shown as not interpretable');
  await fill({ cvp: 14, pcwp: 34 });
  ok(/measurement error, not a negative resistance/.test(await txt('[data-hc-err="pvr"]')) && await count('[data-hc-check="wedge-high"]') === 1 && await val('pvr') === '—' && await val('tpg') === '—', 'a wedge above the mean PA pressure: no negative PVR');
  await fill({ pcwp: 22, pas: 20 });
  ok(await count('[data-hc-check="pa-order"]') === 1 && await val('papi') === '—' && await val('mpap') === '—' && await val('co') === '4.9', 'PA diastolic above systolic: caught');
  await fill({ pas: 48, hb: 'abc' });
  ok(await page.getAttribute('[data-hc-f="hb"]', 'data-state') === 'bad' && /Not a number/.test(await txt('[data-hc-msg="hb"]')), 'letters are not a number');
  await fill({ hb: '11,4' });
  ok(await val('co') === '4.9', 'a decimal comma is accepted');
  await fill({ hb: 11.4, wt: 129 });
  ok(await page.getAttribute('[data-hc-f="wt"]', 'data-state') === 'ok' && await count('[data-hc-check="bmi-high"]') === 1 && /BMI 41/.test(await txt('[data-hc-check="bmi-high"]')), 'a BMI of 41: the per-kilogram assumption is queried');
  await fill({ wt: 82 });
  ok(await count('[data-hc-checks]') === 0 && !/NaN|Infinity|undefined/.test(await txt('[data-hemocalc]')), 'clean again, and never a NaN along the way');

  // ================================================================ the options
  await page.click('[data-hc-venous="mv"]'); await page.waitForSelector('[data-hc-venous="mv"][aria-checked="true"]');
  await page.click('[data-hc-toggle="co"]');
  ok(!/central venous sample/.test(await txt('[data-hc-here="co"]')) && await val('co') === '4.9' && await page.inputValue('[data-hc="wt"]') === '82', 'a mixed venous sample: the central-line caveat goes, the numbers stay');
  await page.click('[data-hc-venous="cv"]'); await page.waitForSelector('[data-hc-venous="cv"][aria-checked="true"]');
  await page.click('[data-hc-vo2="bsa"]'); await page.waitForSelector('[data-hc-vo2="bsa"][aria-checked="true"]');
  ok(await val('co') === '4.3' && await val('vo2') === '252' && /125 mL\/min\/m² × BSA/.test(await txt('[data-hc-detail="co"]')), '125 mL/min/m²: output 4.3 on a VO2 of 252');
  await page.click('[data-hc-vo2="lafarge"]'); await page.waitForSelector('[data-hc-vo2="lafarge"][aria-checked="true"]');
  ok(await val('co') === '—' && /age, heart rate, sex/.test(await txt('[data-hc-need="vo2"]')) && await page.$eval('[data-hc-more]', e => e.open), 'LaFarge: says what it needs and opens the extra inputs');
  await fill({ age: 64, hr: 98 }); await page.click('[data-hc-sex="m"]'); await page.waitForSelector('[data-hc-sex="m"][aria-checked="true"]');
  ok(await val('vo2') === '256' && await val('co') === '4.4' && await val('sv') === '45', 'LaFarge for a man of 64 at 98/min: VO2 256, output 4.4; the heart rate opens the stroke volume');
  await page.click('[data-hc-vo2="measured"]'); await page.waitForSelector('[data-hc-vo2="measured"][aria-checked="true"]');
  await fill({ vo2m: 210 });
  ok(await val('co') === '3.6' && await count('[data-hc-rng]') === 0 && await page.getAttribute('[data-hc-method]', 'data-hc-method') === 'direct Fick' && /Measured: the Fick is now direct/.test(await txt('[data-hc-limit="vo2"]')), 'a measured VO2: a direct Fick, and the assumption band is gone');
  await page.click('[data-hc-vo2="kg"]'); await page.waitForSelector('[data-hc-vo2="kg"][aria-checked="true"]');
  await fill({ sbp: 98, dbp: 60 });
  ok(await val('ppp') === '39' && await val('api') === '1.73' && await count('[data-hc-row].empty') === 0, 'a blood pressure opens the pulse indices: every row now has a value');
  await fill({ tdco: 3.4 });
  ok(await count('[data-hc-check="fick-td"]') === 1 && /cannot both be right/.test(await txt('[data-hc-check="fick-td"]')) && await val('co') === '4.9', 'thermodilution 3.4 against a Fick of 4.9: flagged');
  await page.click('[data-hc-co="td"]'); await page.waitForSelector('[data-hc-co="td"][aria-checked="true"]');
  ok(await val('co') === '3.4' && /thermodilution/.test(await txt('[data-hc-sub="co"]')) && await val('pvr') === '2.9' && await count('[data-hc-rng]') === 0, 'the sheet can run on the thermodilution value: PVR 2.9');
  await page.click('[data-hc-co="fick"]'); await page.waitForSelector('[data-hc-co="fick"][aria-checked="true"]');
  await fill({ tdco: '' });

  // ================================================================ circumstances
  await page.click('[data-hc-ctx="ecmo"]'); await page.waitForSelector('[data-hc-ctx="ecmo"][aria-checked="true"]');
  await page.click('[data-hc-ctx="pressor"]'); await page.waitForSelector('[data-hc-ctx="pressor"][aria-checked="true"]');
  await page.check('[data-hc-all]');
  ok(/VA ECMO this is not the heart’s output/.test(await txt('[data-hc-here="co"]')) && /partly the dose/.test(await txt('[data-hc-here="svr"]')) && /total systemic flow/.test(await txt('[data-hc-here="svr"]')) && /the drug’s/.test(await txt('[data-hc-here="cpo"]')), 'ticking ECMO and vasoactive drugs lands on the numbers they affect');
  ok(await count('[data-hc-ctx]') === 8 && await page.inputValue('[data-hc="svo2"]') === '58', 'eight circumstances; the entries are untouched');
  await page.uncheck('[data-hc-all]');
  await page.click('[data-hc-ctx="ecmo"]'); await page.waitForSelector('[data-hc-ctx="ecmo"][aria-checked="false"]');
  await page.click('[data-hc-ctx="pressor"]'); await page.waitForSelector('[data-hc-ctx="pressor"][aria-checked="false"]');

  // ================================================================ the note
  await page.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { window.__copied = t; return Promise.resolve(); } } }); });
  await page.click('[data-hc-copy]'); await page.waitForFunction(() => window.__copied !== null);
  { const s = await page.evaluate(() => window.__copied);
    ok(/^Hemos \(estimated Fick, VO2 287 mL\/min by 3\.5 mL\/kg\/min; venous sample ScvO2\): CO 4\.9 L\/min, CI 2\.5 L\/min\/m² \(BSA 2\.01 m²\), SVR 938 dyn·s\/cm⁵, PAPi 1\.71, CPO 0\.79 W, PVR 2\.0 WU\./.test(s) && /CI 1\.8–3\.1 if the VO2 is 25% off/.test(s), 'the note: the method, the seven in the chart’s order, the band'); }

  // ================================================================ an earlier set
  await page.click('[data-hc-keep]'); await page.waitForSelector('[data-hc-held]');
  ok(/Replace the earlier set/.test(await txt('[data-hc-keep]')) && await count('[data-hc-drop]') === 1 && await count('[data-hc-was]') === 0 && await page.inputValue('[data-hc="map"]') === '72', 'a set is held; nothing has moved yet');
  await fill({ svo2: 61, cvp: 10, pcwp: 16 });
  ok(/4\.9 → 5\.4 \(\+9%\)/.test(await txt('[data-hc-was="co"]')) && /within what the method can resolve/.test(await txt('[data-hc-was="co"]')) && /1\.71 → 2\.40/.test(await txt('[data-hc-was="papi"]')) && !/within what/.test(await txt('[data-hc-was="papi"]')) && await count('[data-hc-was="bsa"]') === 0, 'the next set: what moved, an output change under 15% marked as unresolvable, a PAPi change taken at face value');
  await page.click('[data-hc-drop]'); await page.waitForSelector('[data-hc-held]', { state: 'detached' });
  ok(await count('[data-hc-was]') === 0 && await val('co') === '5.4', 'dropped');

  // ================================================================ nothing is stored
  { const stored = await page.evaluate(() => { let s = ''; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); s += k + '=' + localStorage.getItem(k) + ';'; } for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); s += k + '=' + sessionStorage.getItem(k) + ';'; } } catch (e) { s = ''; } return s; });
    ok(!/hemocalc|"svo2"|"pcwp"|"hb":"11\.4"/.test(stored), 'nothing typed on the sheet is written to the browser’s storage'); }
  ok(await count('[data-hemocalc] input[type="text"]:not([data-hc])') === 0 && await count('[data-hemocalc] textarea') === 0, 'there is nowhere to type a name or a note');
  await home(); await go('hemo_calc', '[data-hemocalc]');
  ok(await page.inputValue('[data-hc="wt"]') === '' && await page.getAttribute('[data-hemocalc]', 'data-hc-filled') === '0', 'after a reload the sheet is empty');

  // ================================================================ the example patients
  ok(await count('[data-hc-example] option') === 11, 'ten example patients');
  await page.selectOption('[data-hc-example]', 'lv'); await page.waitForSelector('[data-hc-truth="lv"]');
  ok(await page.inputValue('[data-hc="pcwp"]') === '27' && await page.getAttribute('[data-hc-venous="mv"]', 'aria-checked') === 'true' && /real output is 3\.7 L\/min \(index 1\.9\)/.test(await txt('[data-hc-truth]')) && /close\./.test(await txt('[data-hc-truth]')) && /Forrester IV/.test(await txt('[data-hc-line="forrester"]')), 'cardiogenic shock from the lab: the sheet lands close to the model’s truth, cold and wet');
  await page.selectOption('[data-hc-example]', 'lvsed'); await page.waitForSelector('[data-hc-truth="lvsed"]');
  ok(await val('ci') === '2.8' && /oxygen consumption of 185 mL\/min/.test(await txt('[data-hc-truth]')) && /45% high/.test(await txt('[data-hc-truth]')) && /Forrester II/.test(await txt('[data-hc-line="forrester"]')) && await page.getAttribute('[data-hc-ctx="ppv"]', 'aria-checked') === 'true', 'the same patient sedated and paralysed: the sheet reads 45% high and calls a cold patient warm');
  await page.selectOption('[data-hc-example]', 'lvcv'); await page.waitForSelector('[data-hc-truth="lvcv"]');
  ok(await page.getAttribute('[data-hc-venous="cv"]', 'aria-checked') === 'true' && /% high/.test(await txt('[data-hc-truth]')) && +(await val('ci')) >= 2.4, 'the same patient sampled from the central line: high again');
  await page.selectOption('[data-hc-example]', 'obese'); await page.waitForSelector('[data-hc-truth="obese"]');
  ok(await page.inputValue('[data-hc="wt"]') === '129' && await count('[data-hc-check="bmi-high"]') === 1 && +(await page.getAttribute('[data-hc-off]', 'data-hc-off')) > 30, 'at 129 kg: more than 30% high, and the weight is queried');
  await page.selectOption('[data-hc-example]', 'sepsis'); await page.waitForSelector('[data-hc-truth="sepsis"]');
  ok(+(await page.getAttribute('[data-hc-off]', 'data-hc-off')) < -10 && /low\./.test(await txt('[data-hc-truth]')), 'febrile sepsis: the sheet under-reads');
  await page.selectOption('[data-hc-example]', 'ecmodist'); await page.waitForSelector('[data-hc-truth="ecmodist"]');
  ok(await page.getAttribute('[data-hc-ctx="ecmo"]', 'aria-checked') === 'true' && /pump carries 4\.5/.test(await txt('[data-hc-truth]')) && /total flow/.test(await txt('[data-hc-truth]')), 'on VA ECMO: the circumstance arrives ticked and the truth names the pump');
  await fill({ map: 80 });
  ok(await count('[data-hc-truth]') === 0 && await page.inputValue('[data-hc-example]') === '', 'changing a number makes it your own patient: the model’s truth is withdrawn');
  for (const id of ['normal', 'rvmi', 'pah', 'hfpef']) { await page.selectOption('[data-hc-example]', id); await page.waitForSelector('[data-hc-truth="' + id + '"]'); ok(await count('[data-hc-check].bad, [data-hc-checks] li.bad') === 0 && await val('co') !== '—' && !/NaN|Infinity|undefined/.test(await txt('[data-hemocalc]')), 'example ' + id + ': a clean sheet'); }
  await page.selectOption('[data-hc-example]', 'pah'); await page.waitForSelector('[data-hc-truth="pah"]');
  ok(/pre-capillary pulmonary hypertension/.test(await txt('[data-hc-line="ph"]')) && (await txt('[data-hc-chip="pvr"]')) === 'above 5', 'decompensated PAH: pre-capillary, PVR above 5');
  await clear();
  ok(await count('[data-hc-truth]') === 0 && await page.inputValue('[data-hc="wt"]') === '' && await count('[data-hc-ctx][aria-checked="true"]') === 0, 'Clear empties everything');

  // ================================================================ from the Swan–Ganz lab
  await go('hemo_lab', '[data-hemolab]');
  await page.selectOption('[data-hm-preset]', 'rvmi'); await page.waitForSelector('[data-hemolab] [data-hm-sig="rv"]');
  ok(await count('[data-hm-tocalc]') === 1, 'the lab has a way to the sheet');
  await page.click('[data-hm-tocalc]'); await page.waitForSelector('[data-hc-truth="lab"]');
  ok(await page.getAttribute('.learn-body', 'data-topic') === 'hemo_calc' && /RV infarction \(from the Swan–Ganz lab\)/.test(await txt('[data-hc-truth]')) && await page.inputValue('[data-hc="cvp"]') === '8' && await val('co') !== '—' && await page.inputValue('[data-hc-example]') === 'lab', 'the lab’s patient arrives typed in, with the model’s truth beside the estimate');

  // ================================================================ the reading pages
  await go('hemo_limits', '.learn-body[data-topic="hemo_limits"]');
  ok(await count('.learn-body table') === 4 && await count('.learn-body table tbody tr') === 26 && /What each number cannot tell you/.test(await txt('.learn-body')) && /Before the arithmetic/.test(await txt('.learn-body')), 'the limits page: four tables, twenty-six numbers, the bedside checks');
  ok(/4–8 L\/min/.test(await txt('.learn-body')) && /2 Wood units or less/.test(await txt('.learn-body')) && /VA CART/.test(await txt('.learn-body')) && /2\.6 mL\/kg\/min/.test(await txt('.learn-body')), 'with units and the studies’ figures');
  await page.click('[data-go-topic="hemo_calc"]'); await page.waitForSelector('[data-hemocalc]');
  ok(await page.getAttribute('.learn-body', 'data-topic') === 'hemo_calc', 'and a button back to the calculator');
  ok(await count('[data-go-topic="hemo_limits"]') === 1 && await count('[data-go-topic="hemo_lab"]') === 1, 'the calculator links to the limits page and the lab');
  await go('hemo_numbers', '.learn-body[data-topic="hemo_numbers"]');
  ok(await count('[data-go-topic="hemo_calc"]') === 1 && /33–47 mL\/m²/.test(await txt('.learn-body')), 'the derived-numbers page points to both and quotes the same ranges');

  // ================================================================ phone width
  await page.setViewportSize({ width: 390, height: 800 });
  await go('hemo_calc', '[data-hemocalc]'); await clear(); await fill(SET);
  ok(await noSideScroll(), 'phone: no sideways scroll');
  ok(await page.evaluate(() => { const a = document.querySelector('[data-hc-in]').getBoundingClientRect(), b = document.querySelector('[data-hc-out]').getBoundingClientRect(); return b.top >= a.bottom - 1 && a.width > 300 && b.width > 300; }), 'phone: the inputs sit above the results, each at full width');
  ok(await page.evaluate(() => { const f = [...document.querySelectorAll('[data-hc-in] > .hc-fields [data-hc-f]')].map(e => e.getBoundingClientRect()); return Math.abs(f[0].top - f[1].top) < 3 && f[2].top > f[0].bottom - 1 && f.every(r => r.width > 120); }), 'phone: the fields run two to a row');
  ok(await page.$$eval('[data-hc-row]', a => a.every(e => e.scrollWidth <= e.clientWidth + 1)) && await val('co') === '4.9', 'phone: no row overflows');
  await page.check('[data-hc-all]');
  ok(await noSideScroll() && await page.$$eval('[data-hc-detail]', a => a.every(e => e.scrollWidth <= e.clientWidth + 1)), 'phone: with every row open, still no overflow');
  await page.uncheck('[data-hc-all]');
  await go('hemo_limits', '.learn-body[data-topic="hemo_limits"]');
  ok(await noSideScroll(), 'phone: the limits page keeps its tables inside their own scrollers');
  await page.setViewportSize({ width: 1380, height: 1000 });

  // ================================================================ wide: the inputs stay in view
  await go('hemo_calc', '[data-hemocalc]');
  ok(await page.evaluate(() => { const a = document.querySelector('[data-hc-in]').getBoundingClientRect(), b = document.querySelector('[data-hc-out]').getBoundingClientRect(); return b.left >= a.right - 1 && getComputedStyle(document.querySelector('[data-hc-in]')).position === 'sticky'; }), 'wide: inputs on the left, staying in view while the results scroll');

  // ================================================================ dark
  await page.emulateMedia({ colorScheme: 'dark' });
  await fill({ hb: 110 });
  const lum = async (sel, prop) => page.$eval(sel, (e, p) => { const m = /rgba?\((\d+), (\d+), (\d+)/.exec(getComputedStyle(e)[p]); return m ? (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) : -1; }, prop);
  ok(await lum('[data-hc-msg="hb"]', 'color') > 120 && await lum('[data-hc="hb"]', 'backgroundColor') < 90 && await lum('[data-hc-v="bsa"]', 'color') > 180 && await lum('[data-hc-group="chart"]', 'backgroundColor') < 60, 'dark: the fields, the messages and the results read');
  await fill({ hb: 11.4 });
  ok(await lum('[data-hc-chip="papi"]', 'color') > 120 && await lum('[data-hc-gauge="co"] .hc-mark', 'backgroundColor') > 180, 'dark: the chips and the marks read');
  await page.emulateMedia({ colorScheme: 'light' });

  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 3).join(' | '));
  console.log('e2e12 passed', passes, 'failed', fails);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('CRASH', e.message.split('\n').slice(0, 8).join('\n')); process.exit(2); });
