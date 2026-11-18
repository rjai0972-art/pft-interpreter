// v8.10: the echo introduction made short, and the full study by the numbers, in the browser — where the new pages live, the
// introduction's cards, drawings and folded detail, chamber sizes placed as they are typed, the diastolic algorithm in its three
// routes, the six valve sheets with their criteria and calculators, the venous Doppler strips, nothing stored, phone width and
// the dark theme. Only failures print.
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
  const go = async (topic, sel) => { await page.evaluate((t) => window.__pft.setMode('learn', { topic: t }), topic); await page.waitForSelector(sel || '.learn-body[data-topic="' + topic + '"]'); await page.waitForTimeout(200); };
  const txt = async (sel) => page.$eval(sel, e => e.textContent);
  const count = (sel) => page.locator(sel).count();
  const fill = async (o) => { for (const k of Object.keys(o)) await page.fill('[data-ev="' + k + '"]', String(o[k])); await page.waitForTimeout(80); };
  const topic = () => page.getAttribute('.learn-body', 'data-topic');
  const noSideScroll = async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  const keysBefore = await (async () => { await home(); return page.evaluate(() => { try { return Object.keys(localStorage).sort().join('|'); } catch (e) { return ''; } }); })();

  // ================================================================ where the pages live
  ok(await count('[data-home-link="echo_valves"]') === 1 && await count('[data-home-link="echo_diastology"]') === 1 && await count('[data-home-link="echo_views"]') === 1 && await count('[data-home-link="echo_lab"]') === 1, 'the echo tile on the home page links the views, the lab, the valves and diastology');
  ok(await count('[data-home-lab="echo_values"]') === 1 && await count('[data-home-lab="echo_diastology"]') === 1 && await count('[data-home-lab="echo_valves"]') === 1 && await count('[data-home-lab="echo_veins"]') === 1, 'and the four tools are listed among the labs');
  await page.click('[data-home-lab="echo_valves"]'); await page.waitForSelector('[data-ev-valves]');
  ok(await topic() === 'echo_valves' && await page.locator('#learn-cat').inputValue() === 'echo', 'a chip opens its page in the echo area');
  ok(await count('.ln-btn[data-topic]') === 13, 'the echo area has thirteen pages');
  ok(await page.$$eval('#learn-nav .ln-group', a => a.map(g => g.querySelector('h3').textContent + ':' + g.querySelectorAll('.ln-btn[data-topic]').length).join('|')) === 'Start:3|Reading it:3|The full study:4|Practice:3' && await page.$$eval('#learn-nav .ln-group:nth-child(3) .ln-btn[data-topic]', a => a.map(x => x.getAttribute('data-topic')).join()) === 'echo_values,echo_diastology,echo_valves,echo_veins', 'the four new ones grouped as "The full study", between reading and practice');

  // ================================================================ the introduction
  await go('echo_intro', '[data-ev-start]');
  ok((await txt('.learn-body h2, .learn-body h1')).indexOf('Point-of-care echo: start here') >= 0, 'the introduction is titled "start here"');
  ok(await count('[data-ev-q]') === 6 && await count('[data-ev-move]') === 4 && await count('[data-ev-move] svg.ev-move-svg') === 4, 'six question cards and four drawn probe movements');
  ok(await page.$$eval('[data-ev-q]', a => a.every(b => b.querySelector('.ev-q-q').textContent.trim().endsWith('?') && b.querySelector('.ev-q-views').textContent.length > 2 && b.querySelector('.ev-q-n').textContent.length > 4)), 'each card: the views, a question, the sign and the number');
  ok(await count('.learn-body details.edu-fold') === 2 && await count('.learn-body details.edu-fold[open]') === 0, 'the set-up and the modes are folded away');
  const vis = await page.evaluate(() => { const b = document.querySelector('.learn-body'); const c = b.cloneNode(true); c.querySelectorAll('.srcs, details .edu-fold-body, .learn-foot, .learn-pager').forEach(x => x.remove()); document.body.appendChild(c); const words = c.innerText.split(/\s+/).filter(Boolean).length; c.remove(); return { tables: Array.from(b.querySelectorAll('table')).filter(t => !t.closest('details:not([open])')).length, words: words, bullets: Array.from(b.querySelectorAll('ul.edu-ul li')).filter(t => !t.closest('details:not([open])')).length }; });
  ok(vis.tables === 0 && vis.bullets === 0 && vis.words < 300, 'at rest the page shows no table and no bullet list, and under 300 words where it had 688 (' + vis.words + ')');
  await page.click('.learn-body details.edu-fold >> nth=0 >> summary'); await page.waitForTimeout(100);
  ok(await count('.learn-body details.edu-fold[open]') === 1 && await page.locator('.learn-body details.edu-fold[open] li').count() === 5 && /phased array/i.test(await txt('.learn-body details.edu-fold[open]')), 'a fold opens to its detail');
  await go('echo_views'); await go('echo_intro', '[data-ev-start]');
  ok(await count('.learn-body details.edu-fold[open]') === 1, 'and is still open on coming back');
  await page.click('.learn-body details.edu-fold >> nth=1 >> summary'); await page.waitForTimeout(100);
  ok(await page.locator('.learn-body details.edu-fold[open] table tbody tr').count() === 6, 'the modes are a six-row table inside the second');
  await page.click('[data-ev-q="lung"]'); await page.waitForTimeout(250);
  ok(await topic() === 'echo_lung', 'a card opens the page that answers it');
  await go('echo_intro', '[data-ev-start]'); await page.click('[data-ev-q="lv"]'); await page.waitForTimeout(250);
  ok(await topic() === 'echo_assess', 'the LV card opens the focused assessments');
  ok(await count('[data-go-topic="echo_valves"]') === 1 && await count('[data-go-topic="echo_diastology"]') === 1, 'which now point on to the valves and diastology');
  await go('echo_intro', '[data-ev-start]'); await page.click('[data-go-topic="echo_values"]'); await page.waitForSelector('[data-ev-chambers]');
  ok(await topic() === 'echo_values', 'and the introduction points on to the full study');
  await go('echo_anatomy');
  ok(/LVIDd 3\.8–5\.2 cm \(women\) \/ 4\.2–5\.8 \(men\)/.test(await txt('.learn-body')), 'the anatomy page quotes the same LV diameters as the cut-off tables');

  // ================================================================ chamber sizes
  await go('echo_values', '[data-ev-chambers]');
  ok(await count('[data-ev-empty]') === 1 && await count('[data-ev-row]') === 0 && await count('[data-ev]') === 14 && await count('[data-ev-geo-c]') === 4 && await count('[data-ev-geo-c].on') === 0, 'the chamber sheet opens empty: fourteen entries, the geometry grid with nothing placed');
  await page.click('[data-ev="lvidd"]'); await page.keyboard.type('5.9');
  ok(await page.evaluate(() => { const a = document.activeElement; return a && a.getAttribute('data-ev') === 'lvidd' && a.value === '5.9' && a.selectionStart === 3; }), 'typing keeps the caret where it is');
  ok(await count('[data-ev-row]') === 1 && await page.getAttribute('[data-ev-row="lvidd"]', 'data-grade') === '1' && /mildly abnormal/.test(await txt('[data-ev-row="lvidd"]')) && /Normal 4\.2–5\.8 · mild to 6\.3 · moderate to 6\.8 · severe above 6\.8/.test(await txt('[data-ev-row="lvidd"]')) && await count('[data-ev-row="lvidd"] .ev-bar-m') === 1, 'a man’s LVIDd of 5.9 cm: mildly abnormal, with its partitions and a bar');
  await page.click('[data-ev-sex="f"]'); await page.waitForSelector('[data-ev-chambers="f"]');
  ok(await page.getAttribute('[data-ev-row="lvidd"]', 'data-grade') === '2' && /moderately abnormal/.test(await txt('[data-ev-row="lvidd"]')) && /Normal 3\.8–5\.2/.test(await txt('[data-ev-row="lvidd"]')) && (await page.inputValue('[data-ev="lvidd"]')) === '5.9', 'the same number in a woman is moderately abnormal');
  await page.click('[data-ev-sex="m"]'); await page.waitForSelector('[data-ev-chambers="m"]');
  await fill({ lvidd: '59' });
  ok(await page.getAttribute('[data-ev-f="lvidd"]', 'data-state') === 'bad' && /outside 2–10: check the entry and its unit/.test(await txt('[data-ev-msg="lvidd"]')) && await count('[data-ev-row]') === 0 && await count('[data-ev-checks] li') === 1 && await page.getAttribute('[data-ev="lvidd"]', 'aria-invalid') === 'true', 'millimetres typed for centimetres: the entry is queried, not graded');
  await fill({ lvidd: '5.0', ivs: '1.0', pw: '1.0' });
  ok(await page.getAttribute('[data-ev-f="lvidd"]', 'data-state') === 'ok' && /0\.8 × 1\.04 × \(\(5 \+ 1 \+ 1\)³ − 5³\) \+ 0\.6 = 182 g/.test(await txt('[data-ev-row="lvmass"]')) && await count('[data-ev-row="lvmassI"]') === 0 && await count('[data-ev-geo-c].on') === 0 && /relative wall thickness 0\.40/.test(await txt('[data-ev-facts]')), 'walls and cavity give the LV mass with its arithmetic; no index or geometry without a body size');
  await fill({ ht: '175', wt: '80' });
  ok(await count('[data-ev-row="lvmassI"]') === 1 && await count('[data-ev-row="lviddI"]') === 1 && await page.getAttribute('[data-ev-geo]', 'data-ev-geo') === 'normal' && await count('[data-ev-geo-c="normal"].on') === 1 && /BSA 1\.97 m²/.test(await txt('[data-ev-facts]')), 'height and weight add the indexed rows and place the ventricle: normal geometry');
  await page.click('[data-ev-ex]'); await page.waitForTimeout(200);
  ok(await count('[data-ev-row]') >= 12 && await page.getAttribute('[data-ev-geo]', 'data-ev-geo') === 'ecc_hyp' && /Eccentric hypertrophy: relative wall thickness 0\.41, LV mass index 164 g\/m²/.test(await txt('[data-ev-geo-say]')) && await page.getAttribute('[data-ev-row="lavi"]', 'data-grade') === '2' && /above the upper limit/.test(await txt('[data-ev-row="aoSinus"]')) && /Indexed to BSA: 2\.1 cm\/m²/.test(await txt('[data-ev-row="aoSinus"]')), 'the example: a dozen rows, eccentric hypertrophy, a moderately enlarged atrium and a root above its limit');
  ok(await count('[data-ev-group]') === 4 && await page.$$eval('[data-ev-group] h5', a => a.map(x => x.textContent).join('|')) === 'Left ventricle|Atria|Right ventricle|Aorta', 'grouped by chamber');
  ok(await count('.learn-body > details.edu-fold') === 4 && await count('.learn-body > details.edu-fold[open]') === 0, 'the four full tables are folded below');
  await page.click('.learn-body > details.edu-fold >> nth=0 >> summary'); await page.waitForTimeout(80);
  ok(await page.locator('.learn-body > details.edu-fold[open] tbody tr').count() === 8 && /4\.2–5\.8 · 5\.9–6\.3 · 6\.4–6\.8 · > 6\.8/.test(await txt('.learn-body > details.edu-fold[open]')), 'the LV table: eight rows, the same partitions');
  await page.click('[data-ev-clear]'); await page.waitForTimeout(150);
  ok(await count('[data-ev-row]') === 0 && await count('[data-ev-empty]') === 1 && (await page.inputValue('[data-ev="lvidd"]')) === '', 'Clear empties the sheet');

  // ================================================================ diastolic function
  await go('echo_diastology', '[data-ev-diast]');
  ok(await page.getAttribute('[data-ev-diast]', 'data-ev-diast') === 'sinus' && await count('[data-ev-mode]') === 3 && await count('[data-ev]') === 10 && await count('[data-ev-age]') === 4 && await page.getAttribute('[data-ev-verdict]', 'data-ev-verdict') === '' && /Not enough to say yet/.test(await txt('[data-ev-verdict]')) && /an e′ velocity; the mitral E velocity/.test(await txt('[data-ev-verdict]')), 'the diastology sheet opens on sinus rhythm, saying what it needs');
  ok(await count('[data-ev-var]') === 3 && await page.$$eval('[data-ev-var]', a => a.every(x => x.getAttribute('data-abn') === 'null')), 'three variables, none entered');
  await page.click('[data-ev-ex]'); await page.waitForTimeout(200);
  ok(await page.getAttribute('[data-ev-verdict]', 'data-ev-verdict') === 'increased' && /Grade 2 diastolic dysfunction/.test(await txt('[data-ev-verdict]')) && await page.$$eval('[data-ev-var]', a => a.every(x => x.getAttribute('data-abn') === 'true')) && await page.locator('[data-ev-path] li').count() === 2 && /E\/A 1\.40 is under 2: grade 2/.test(await txt('[data-ev-path]')), 'the example: all three abnormal, grade 2, with the path it took');
  await fill({ A: '45' });
  ok(/Grade 3/.test(await txt('[data-ev-verdict]')), 'an E/A of 2 or more makes it grade 3');
  await fill({ A: '68', E: '60', tr: '2.3' });
  ok(await page.getAttribute('[data-ev-verdict]', 'data-ev-verdict') === 'indeterminate' && await page.getAttribute('[data-ev-var="ee"]', 'data-abn') === 'false' && /Second tier needed/.test(await txt('[data-ev-path]')) && await count('.ev-verdict.v1') === 1, 'reduced e′ alone with an E/A above 0.8: the second tier is asked for');
  await fill({ lavi: '40' });
  ok(await page.getAttribute('[data-ev-verdict]', 'data-ev-verdict') === 'increased' && await count('[data-ev-sec] .ev-chip.g3') === 1 && /LA volume index 40 mL\/m²: meets > 34/.test(await txt('[data-ev-sec]')), 'a large atrium settles it: increased pressure');
  await fill({ lavi: '30' });
  ok(await page.getAttribute('[data-ev-verdict]', 'data-ev-verdict') === 'normal' && /Grade 1/.test(await txt('[data-ev-verdict]')) && await count('[data-ev-sec] .ev-chip.g0') === 1, 'a normal one: grade 1 with a normal pressure');
  await fill({ tr: '', lavi: '' });
  ok(await page.getAttribute('[data-ev-verdict]', 'data-ev-verdict') === 'indeterminate' || await page.getAttribute('[data-ev-verdict]', 'data-ev-verdict') === 'depends', 'without the TR velocity it says so or gives both ways');
  await page.click('[data-ev-clear]'); await page.waitForTimeout(120); await fill({ es: '5', el: '7.5', E: '50', A: '72' });
  ok(await page.getAttribute('[data-ev-verdict]', 'data-ev-verdict') === 'depends' && /Under 2\.8 m\/s: normal LA pressure \(grade 1\)\. At 2\.8 m\/s or more: not determined without a second-tier marker/.test(await txt('[data-ev-verdict]')), 'when the missing TR velocity would change the answer, both answers are given');
  await page.click('[data-ev-clear]'); await page.waitForTimeout(120); await fill({ es: '6.5', el: '11', E: '70', A: '60', tr: '2.2' });
  ok(/Normal diastolic function/.test(await txt('[data-ev-verdict]')), 'e′ of 6.5 and 11 is normal by the fixed cut-offs');
  await page.click('[data-ev-age="y"]'); await page.waitForTimeout(150);
  ok(await page.getAttribute('[data-ev-var="e"]', 'data-abn') === 'true' && /20–39 years/.test(await txt('[data-ev-var="e"]')) && (await page.inputValue('[data-ev="es"]')) === '6.5', 'and reduced for a 30-year-old');
  await page.click('[data-ev-age=""]'); await page.waitForTimeout(100);
  await page.click('[data-ev-mode="af"]'); await page.waitForSelector('[data-ev-diast="af"]');
  ok(await count('[data-ev="dt"]') === 1 && await count('[data-ev="bmi"]') === 1 && await count('[data-ev="el"]') === 0 && await count('[data-ev="A"]') === 0 && await count('[data-ev-age]') === 0 && await count('[data-ev-var]') === 4 && (await page.inputValue('[data-ev="E"]')) === '70', 'atrial fibrillation: its own four variables, no A wave, and what was typed carries over');
  await page.click('[data-ev-ex]'); await page.waitForTimeout(200);
  ok(await page.getAttribute('[data-ev-verdict]', 'data-ev-verdict') === 'increased' && await page.$$eval('[data-ev-var]', a => a.filter(x => x.getAttribute('data-abn') === 'true').length) === 4 && /not graded/.test(await txt('.ev-notes')), 'four of four positive: a raised pressure, and no grade in this rhythm');
  await fill({ tr: '2.4', dt: '190' });
  ok(await page.getAttribute('[data-ev-verdict]', 'data-ev-verdict') === 'indeterminate', 'two of four: the second step is needed');
  await fill({ lars: '12', bmi: '34' });
  ok(await page.getAttribute('[data-ev-verdict]', 'data-ev-verdict') === 'increased' && await count('[data-ev-sec] .ev-chip') === 2, 'a low strain and a BMI above 30 decide it');
  await page.click('[data-ev-mode="mac"]'); await page.waitForSelector('[data-ev-diast="mac"]');
  ok(await count('[data-ev]') === 3 && await count('[data-ev="ivrt"]') === 1 && await count('[data-ev="es"]') === 0, 'a calcified annulus: E, A and the IVRT only');
  await page.click('[data-ev-clear]'); await page.waitForTimeout(120); await fill({ E: '100', A: '80' });
  ok(await page.getAttribute('[data-ev-verdict]', 'data-ev-verdict') === '' && /the IVRT \(E\/A 1\.25 lies between 0\.8 and 1\.8\)/.test(await txt('[data-ev-verdict]')) && /in between/.test(await txt('[data-ev-var="ea"]')), 'an E/A between 0.8 and 1.8 asks for the IVRT');
  await fill({ ivrt: '70' });
  ok(await page.getAttribute('[data-ev-verdict]', 'data-ev-verdict') === 'increased', 'under 80 ms: raised');
  await fill({ ivrt: '95' });
  ok(await page.getAttribute('[data-ev-verdict]', 'data-ev-verdict') === 'normal', '80 ms or more: normal');
  await page.click('[data-ev-mode="sinus"]'); await page.waitForSelector('[data-ev-diast="sinus"]');
  ok(await count('.learn-body > details.edu-fold') === 2 && /septal 6 cm\/s or less/.test(await txt('.learn-body')), 'the algorithm in words and its exceptions are folded below');

  // ================================================================ the valves
  await go('echo_valves', '[data-ev-valves]');
  ok(await count('[data-ev-valve]') === 6 && await page.$$eval('[data-ev-valve]', a => a.map(x => x.textContent).join()) === 'AS,AR,MS,MR,TR,PR' && await page.getAttribute('[data-ev-valves]', 'data-ev-valves') === 'as' && (await txt('[data-ev-vtitle]')) === 'Aortic stenosis' && /Nothing to grade yet/.test(await txt('[data-ev-verdict]')) && /the peak velocity or mean gradient/.test(await txt('[data-ev-verdict]')), 'six lesions; aortic stenosis first, saying what it needs');
  ok(await count('[data-fold="ev-as-table"][open]') === 1 && await page.locator('[data-fold="ev-as-table"] tbody tr').count() === 5 && await count('[data-fold="ev-as-cav"]') === 1 && await count('[data-fold="ev-as-cav"][open]') === 0, 'its grading table is open, its cautions folded');
  await page.click('[data-ev-ex]'); await page.waitForTimeout(200);
  ok(/Paradoxical low-flow, low-gradient stenosis: CT calcium score/.test(await txt('[data-ev-verdict]')) && await count('.ev-verdict.vi') === 1 && /0\.71/.test(await txt('[data-ev-out="ava"]')) && /3\.14 × 14 ÷ 62 = 0\.71/.test(await txt('[data-ev-out="ava"]')) && /low flow/.test(await txt('[data-ev-out="svi"]')) && await page.locator('[data-ev-steps] li').count() === 6 && /2,000 units or more in men and 1,200 in women/.test(await txt('[data-ev-steps]')), 'the example: a small area with a low gradient, low flow and a preserved EF leads to the calcium score, in six steps');
  await fill({ vmax: '4.4', mg: '48' });
  ok(/High-gradient/.test(await txt('[data-ev-verdict]')) && await count('.ev-verdict.v2') === 1 && await page.locator('[data-ev-steps] li').count() === 3, 'a peak of 4.4 m/s: high-gradient, severe');
  await fill({ ef: '30', vmax: '3.4', mg: '28' });
  ok(/dobutamine/i.test(await txt('[data-ev-verdict]')), 'the same valve with an EF of 30%: the dobutamine echo');
  await fill({ aoD: '2.6' });
  ok(await count('[data-ev-out="elco"]') === 1 && /pressure recovery/.test(await txt('[data-ev-out="elco"]')), 'a narrow aorta adds the energy-loss area');
  await fill({ vmax: '44' });
  ok(await page.getAttribute('[data-ev-f="vmax"]', 'data-state') === 'bad' && /outside 0\.5–8/.test(await txt('[data-ev-msg="vmax"]')), 'a velocity of 44 m/s is queried');
  await page.click('[data-fold="ev-as-cav"] summary'); await page.waitForTimeout(80);
  ok(await page.locator('[data-fold="ev-as-cav"][open] li').count() === 7, 'seven cautions for aortic stenosis');
  /* mitral regurgitation: criteria, then numbers */
  await page.click('[data-ev-valve="mr"]'); await page.waitForSelector('[data-ev-valves="mr"]');
  ok((await txt('[data-ev-vtitle]')) === 'Mitral regurgitation' && await count('[data-ev-ticks="mild"] input') === 6 && await count('[data-ev-ticks="severe"] input') === 6 && await count('[data-ev]') === 6, 'mitral regurgitation: six criteria for mild, six for severe, six entries');
  for (const i of [0, 1, 2]) await page.check('[data-ev-tick="severe' + i + '"]');
  ok(/Probably moderate: quantify/.test(await txt('[data-ev-verdict]')), 'three criteria: quantify');
  await page.check('[data-ev-tick="severe3"]'); await page.waitForTimeout(60);
  ok(/Definitely severe mitral regurgitation/.test(await txt('[data-ev-verdict]')) && await count('.ev-verdict.v2') === 1, 'four: definitely severe');
  for (const i of [0, 1, 2, 3]) await page.uncheck('[data-ev-tick="severe' + i + '"]');
  await page.click('[data-ev-ex]'); await page.waitForTimeout(200);
  ok(/Severe mitral regurgitation \(grade IV\)/.test(await txt('[data-ev-verdict]')) && /2π × 1² × 38 ÷ 500 = 0\.48/.test(await txt('[data-ev-out="eroa"]')) && /grade IV/.test(await txt('[data-ev-out="rf"]')) && await count('[data-ev-out="eroa"] .ev-chip.g3') === 1, 'the example: a 1 cm PISA radius, EROA 0.48 cm², grade IV on all three');
  await fill({ r: '0.9' });
  ok(/Moderate mitral regurgitation \(grade III\)/.test(await txt('[data-ev-verdict]')) && /Two of the three measures agree on grade III/.test(await txt('[data-ev-steps]')) && await count('[data-ev-out="eroa"] .ev-chip.g2') === 1, 'with 0.9 cm two measures read grade III and one grade IV: the grade follows the two');
  /* what was typed for one valve stays with it */
  await page.click('[data-ev-valve="as"]'); await page.waitForSelector('[data-ev-valves="as"]');
  ok((await page.inputValue('[data-ev="lvotVti"]')) === '14' && await count('[data-fold="ev-as-cav"][open]') === 1, 'going back to aortic stenosis: its entries and its open fold are as they were left');
  /* mitral stenosis and the Wilkins score */
  await page.click('[data-ev-valve="ms"]'); await page.waitForSelector('[data-ev-valves="ms"]'); await page.click('[data-ev-ex]'); await page.waitForTimeout(200);
  ok(/Moderate mitral stenosis by valve area \(half-time\)/.test(await txt('[data-ev-verdict]')) && /220 ÷ 180 = 1\.2/.test(await txt('[data-ev-out="mvaPht"]')) && /3\.14 × 20 ÷ 50 = 1\.3/.test(await txt('[data-ev-out="mvaCont"]')) && /ACC\/AHA/.test(await txt('[data-ev-notes]')), 'mitral stenosis: 220 ÷ half-time and continuity agree on moderate, with the ACC/AHA staging noted');
  await fill({ lvotVti: '29.4', mvVti: '40.5' });
  ok(/3\.14 × 29\.4 ÷ 40\.5 = 2\.3/.test(await txt('[data-ev-out="mvaCont"]')) && /different grades/.test(await txt('[data-ev-notes]')), 'the workbook’s own continuity numbers give 2.3 cm², and the disagreement with the half-time is pointed out');
  ok(await count('[data-ev-wil]') === 4 && !/Wilkins score \d/.test(await txt('[data-ev-vout]')), 'four Wilkins items, unscored');
  await page.selectOption('[data-ev-wil="mob"]', '2'); await page.selectOption('[data-ev-wil="thick"]', '2'); await page.selectOption('[data-ev-wil="calc"]', '1');
  ok(!/Wilkins score \d/.test(await txt('[data-ev-vout]')), 'three of four items give no score');
  await page.selectOption('[data-ev-wil="sub"]', '2'); await page.waitForTimeout(60);
  ok(/Wilkins score 7 of 16: 8 or less/.test(await txt('[data-ev-steps]')), 'all four: 7 of 16, a valve that suits the balloon');
  await page.selectOption('[data-ev-wil="calc"]', '4'); await page.waitForTimeout(60);
  ok(/Wilkins score 10 of 16/.test(await txt('[data-ev-steps]')), 'heavy calcification takes it to 10');
  /* the right-sided valves and aortic regurgitation */
  await page.click('[data-ev-valve="tr"]'); await page.waitForSelector('[data-ev-valves="tr"]'); await page.click('[data-ev-ex]'); await page.waitForTimeout(200);
  ok(/Severe tricuspid regurgitation/.test(await txt('[data-ev-verdict]')) && /4 × 2\.2² \+ 15 = 34/.test(await txt('[data-ev-out="rvsp"]')) && /one chamber/.test(await txt('[data-ev-notes]')) && await page.locator('[data-fold="ev-tr-table"] tbody tr').count() === 8, 'tricuspid: severe regurgitation with a slow jet, and the RV pressure flagged as under-read');
  await fill({ tsMg: '6', tsPht: '200' });
  ok(/stenosis/i.test(await txt('[data-ev-steps]')) && await count('[data-ev-out="tsArea"]') === 1, 'an inflow gradient of 6 mm Hg and a half-time of 200 ms: stenosis is named');
  await page.click('[data-ev-valve="pr"]'); await page.waitForSelector('[data-ev-valves="pr"]'); await page.click('[data-ev-ex]'); await page.waitForTimeout(200);
  ok(/Severe pulmonary regurgitation/.test(await txt('[data-ev-verdict]')) && /250 ÷ 450 = 0\.56/.test(await txt('[data-ev-out="pri"]')) && /\(148 − 63\) ÷ 148 = 57%/.test(await txt('[data-ev-out="rf"]')), 'pulmonary: the PR index and the fraction from two stroke volumes');
  await page.click('[data-ev-valve="ar"]'); await page.waitForSelector('[data-ev-valves="ar"]'); await page.click('[data-ev-ex]'); await page.waitForTimeout(200);
  ok(/Moderate aortic regurgitation \(grade III\)/.test(await txt('[data-ev-verdict]')) && await count('[data-ev-ticks="severe"] input') === 7 && await page.locator('[data-fold="ev-ar-table"] .ev-mech li').count() === 3, 'aortic regurgitation: grade III by the numbers, seven severe criteria, three mechanisms');
  for (const i of [0, 1, 4]) await page.check('[data-ev-tick="severe' + i + '"]');
  ok(/Severe aortic regurgitation \(grade III with three severe criteria\)/.test(await txt('[data-ev-verdict]')), 'grade III with three specific criteria becomes severe');
  await page.click('[data-ev-clear]'); await page.waitForTimeout(150);
  ok(/Nothing to grade yet/.test(await txt('[data-ev-verdict]')) && await count('[data-ev-tick]:checked') === 0 && (await page.inputValue('[data-ev="r"]')) === '', 'Clear empties the entries and the ticks');
  ok(await count('.learn-body > details.edu-fold') === 1 && /EROA = 2π × radius² × aliasing velocity ÷ peak jet velocity/.test(await txt('.learn-body > details.edu-fold')), 'the formulas are on one folded page');

  // ================================================================ venous Doppler
  await go('echo_veins', '[data-ev-veins]'); await page.waitForTimeout(250);
  const bright = () => page.$eval('canvas[data-ev-veincv]', cv => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0, g = 0; for (let i = 0; i < d.length; i += 16) { if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) n++; if (d[i + 1] > 180 && d[i] < 160 && d[i + 2] < 170) g++; } return { n: n, g: g, w: cv.width, h: cv.height }; });
  let px = await bright();
  ok(await page.getAttribute('[data-ev-veins]', 'data-ev-veins') === 'pv:normal' && await count('[data-ev-vein]') === 2 && await count('[data-ev-pat]') === 6 && px.n > 150 && px.g > 20 && px.w >= 600, 'the pulmonary vein strip is drawn under an ECG: six patterns (' + px.n + ' envelope and ' + px.g + ' ECG samples)');
  ok(/Pulmonary vein Doppler under the ECG, Normal adult/.test(await page.getAttribute('canvas[data-ev-veincv]', 'aria-label')) && parseFloat(await txt('[data-ev-tile="S/D"] b')) >= 1 && await count('.ev-tile.on') === 0 && await page.locator('[data-ev-text] p').count() === 3, 'normal: S/D of 1 or more, nothing flagged, with what to look for, why, and what to do');
  await page.click('[data-ev-pat="lap"]'); await page.waitForSelector('[data-ev-veins="pv:lap"]'); await page.waitForTimeout(150);
  ok(parseFloat(await txt('[data-ev-tile="S/D"] b')) <= 0.67 && await count('[data-ev-tile="S/D"].on') === 1 && await count('[data-ev-tile="Ar"].on') === 1 && await count('[data-ev-tile="Systolic fraction"].on') === 1, 'raised LA pressure: S/D 0.67 or less, a low systolic fraction and a tall Ar, each flagged');
  await page.click('[data-ev-pat="mr"]'); await page.waitForSelector('[data-ev-veins="pv:mr"]'); await page.waitForTimeout(150);
  ok(await count('[data-ev-tile="Systolic reversal"].on') === 1 && await count('[data-ev-tile="S/D"]') === 0, 'severe mitral regurgitation: systolic reversal');
  await page.click('[data-ev-pat="af"]'); await page.waitForSelector('[data-ev-veins="pv:af"]'); await page.waitForTimeout(150);
  ok((await txt('[data-ev-tile="Ar"] b')) === 'none', 'atrial fibrillation: no Ar');
  await page.click('[data-ev-vein="hv"]'); await page.waitForSelector('[data-ev-veins^="hv:"]'); await page.waitForTimeout(200);
  px = await bright();
  ok(await page.getAttribute('[data-ev-veins]', 'data-ev-veins') === 'hv:normal' && await count('[data-ev-pat]') === 7 && px.n > 150 && /Hepatic vein Doppler/.test(await page.getAttribute('canvas[data-ev-veincv]', 'aria-label')) && await count('[data-ev-tile="A reversal"]') === 1, 'the hepatic vein: seven patterns on its own strip');
  await page.click('[data-ev-pat="constr"]'); await page.waitForSelector('[data-ev-veins="hv:constr"]'); await page.waitForTimeout(200);
  ok(parseFloat(await txt('[data-ev-tile="Expiratory reversal ÷ forward"] b')) >= 0.8 && await count('[data-ev-tile="Expiratory reversal ÷ forward"].on') === 1 && /expiration/i.test(await txt('[data-ev-text]')), 'constriction: an expiratory diastolic reversal of 0.8 or more of the forward wave');
  const blue = await page.$eval('canvas[data-ev-veincv]', cv => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i + 2] > 220 && d[i] < 180 && d[i + 1] > 180) n++; return n; });
  ok(blue > 15, 'with the breath drawn above it (' + blue + ' samples)');
  await page.click('[data-ev-pat="tr"]'); await page.waitForSelector('[data-ev-veins="hv:tr"]'); await page.waitForTimeout(150);
  ok(await count('[data-ev-tile="Systolic reversal"].on') === 1, 'severe tricuspid regurgitation: systolic reversal');
  await page.click('[data-ev-vein="pv"]'); await page.waitForSelector('[data-ev-veins^="pv:"]');
  ok(await page.getAttribute('[data-ev-veins]', 'data-ev-veins') === 'pv:af', 'each vein remembers its pattern');
  ok(await count('.learn-body > details.edu-fold') === 1 && await count('[data-go-topic="echo_diastology"]') === 1, 'the cut-offs are folded below, with the way on to diastology');

  // ================================================================ nothing kept, no names
  const kept = await page.evaluate(() => { try { return Object.keys(localStorage).sort().map(k => [k, String(localStorage.getItem(k))]); } catch (e) { return []; } });
  ok(kept.filter(k => keysBefore.split('|').indexOf(k[0]) < 0).every(k => k[0] === 'pft.last.v1' && Object.keys(JSON.parse(k[1])).sort().join() === 'cat,title,topic') && kept.every(k => !/lvidd|lvot|29\.4|40\.5|wilkins/i.test(k[1])), 'nothing typed into the sheets was stored: only which page was open last');
  for (const t of [['echo_values', '[data-ev-chambers]'], ['echo_diastology', '[data-ev-diast]'], ['echo_valves', '[data-ev-valves]']]) { await go(t[0], t[1]); ok(await page.$$eval('.ev-fig label', a => a.every(l => !/name|MRN|date of birth|record/i.test(l.textContent))) && await page.$$eval('.ev-fig input[type=text]', a => a.every(i => i.getAttribute('inputmode') === 'decimal')), t[0] + ': every entry is a number, and none asks who the patient is'); }

  // ================================================================ phone width and the dark theme
  const phone = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 }); const pp = await phone.newPage(); const perr = []; pp.on('pageerror', e => perr.push(e.message));
  await pp.goto(FILE); await pp.waitForSelector('[data-home]');
  const pgo = async (topic, sel) => { await pp.evaluate((t) => window.__pft.setMode('learn', { topic: t }), topic); await pp.waitForSelector(sel); await pp.waitForTimeout(250); };
  const pfit = () => pp.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  await pgo('echo_intro', '[data-ev-start]');
  ok(await pfit() && await pp.$$eval('[data-ev-q]', a => a.every(b => b.getBoundingClientRect().width > 300)) && await pp.$$eval('[data-ev-move]', a => a[0].getBoundingClientRect().top === a[1].getBoundingClientRect().top && a[2].getBoundingClientRect().top > a[0].getBoundingClientRect().top), 'phone: the cards stack, the movements sit two by two, nothing scrolls sideways');
  await pgo('echo_values', '[data-ev-chambers]'); await pp.click('[data-ev-ex]'); await pp.waitForTimeout(200);
  ok(await pfit() && await pp.locator('[data-ev-row]').count() >= 12, 'phone: the chamber sheet with the example fits');
  await pgo('echo_diastology', '[data-ev-diast]'); await pp.click('[data-ev-ex]'); await pp.waitForTimeout(200);
  ok(await pfit() && /Grade 2/.test(await pp.$eval('[data-ev-verdict]', e => e.textContent)), 'phone: diastology fits');
  await pgo('echo_valves', '[data-ev-valves]'); await pp.click('[data-ev-valve="tr"]'); await pp.waitForSelector('[data-ev-valves="tr"]'); await pp.click('[data-ev-ex]'); await pp.waitForTimeout(200);
  ok(await pfit() && await pp.$eval('[data-fold="ev-tr-table"] .tbl-wrap', e => e.scrollWidth >= e.clientWidth), 'phone: the valve sheet fits, its table scrolling inside its own frame');
  await pgo('echo_veins', '[data-ev-veins]'); await pp.click('[data-ev-vein="hv"]'); await pp.waitForSelector('[data-ev-veins^="hv:"]'); await pp.waitForTimeout(250);
  ok(await pfit() && await pp.$eval('canvas[data-ev-veincv]', cv => cv.getBoundingClientRect().width <= 390 && cv.width >= 560 && cv.height / cv.width > 0.7), 'phone: the strip is redrawn for the narrow screen at twice the pixels, not shrunk');
  ok(perr.length === 0, 'phone: no page errors' + (perr.length ? ' — ' + perr[0] : ''));
  await phone.close();
  const dark = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' }); const dp = await dark.newPage();
  await dp.goto(FILE); await dp.waitForSelector('[data-home]'); await dp.evaluate(() => window.__pft.setMode('learn', { topic: 'echo_intro' })); await dp.waitForSelector('[data-ev-start]');
  const lum = (c) => { const m = c.match(/\d+(\.\d+)?/g).map(Number); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
  const dk = await dp.evaluate(() => { const q = document.querySelector('[data-ev-q]'), s = getComputedStyle(q), t = getComputedStyle(q.querySelector('.ev-q-q')), p = getComputedStyle(document.querySelector('.ev-probe rect')); return { bg: s.backgroundColor, fg: t.color, stroke: p.stroke }; });
  ok(lum(dk.bg) < 70 && lum(dk.fg) > 180 && lum(dk.stroke) > 120, 'dark theme: the cards and drawings take the dark palette');
  await dp.evaluate(() => window.__pft.setMode('learn', { topic: 'echo_valves' })); await dp.waitForSelector('[data-ev-valves]'); await dp.click('[data-ev-ex]'); await dp.waitForTimeout(200);
  const dv = await dp.evaluate(() => { const v = getComputedStyle(document.querySelector('.ev-verdict')), b = getComputedStyle(document.querySelector('.ev-verdict b')); return { bg: v.backgroundColor, fg: b.color }; });
  ok(lum(dv.fg) - lum(dv.bg) > 110, 'dark theme: the verdict stays readable');
  await dark.close();

  ok(errs.length === 0, 'no page errors' + (errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''));
  console.log((fails ? 'FAILED' : 'ok') + ' — e2e13: ' + passes + ' passed, ' + fails + ' failed');
  await browser.close(); process.exit(fails ? 1 : 0);
})();
