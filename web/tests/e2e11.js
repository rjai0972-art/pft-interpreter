// v8.8: lines and waveforms — the arterial, venous and pulmonary artery galleries drawn by the waveform engine; real recordings with the model
// laid over them; the troubleshooting lab end to end; real ultrasound frames, the drawn scanner and the needle; the insertion protocols; the
// older labs on the new engine; the home tile; phone width. Only failures print.
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
  const go = async (topic, sel) => { await page.evaluate((t) => window.__pft.setMode('learn', { topic: t }), topic); await page.waitForSelector(sel); await page.waitForTimeout(350); };
  const txt = async (sel) => page.$eval(sel, e => e.textContent);
  const attr = async (sel, a) => page.getAttribute(sel, a);
  const tile = async (k) => page.$eval('[data-ln-tile="' + k + '"] .vsc-v', e => e.textContent);
  const tileU = async (k) => page.$eval('[data-ln-tile="' + k + '"] .vsc-u', e => e.textContent);
  const painted = async (sel) => page.$eval(sel, c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lit = 0, n = 0; const seen = {}; for (let i = 0; i < d.length; i += 40) { n++; if (d[i] + d[i + 1] + d[i + 2] > 240) lit++; seen[(d[i] >> 5) + ',' + (d[i + 1] >> 5) + ',' + (d[i + 2] >> 5)] = 1; } return { lit: lit / n, colours: Object.keys(seen).length }; });
  const noSideScroll = async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  const setRange = async (sel, v) => { await page.$eval(sel, (e, val) => { e.value = String(val); e.dispatchEvent(new Event('input', { bubbles: true })); }, v); await page.waitForTimeout(450); };

  // ================================================================ the monitoring area has grown
  await home();
  await go('ln_art_patterns', '[data-ln-art]');
  ok(await page.locator('.ln-btn[data-topic]').count() === 21 && await page.locator('.ln-btn[data-topic^="ln_"]').count() === 8, 'the monitoring area: twenty-one topics, eight of them new');
  ok(/Waveforms: read and fix/.test(await txt('#main')) && /Lines: putting them in/.test(await txt('#main')), 'in two new groups');

  // ================================================================ the arterial gallery
  ok(await page.locator('[data-ln-artsel] option').count() === 16 && await page.locator('[data-ln-artsel] optgroup').count() >= 6, 'sixteen arterial patterns in groups');
  const p0 = await painted('[data-ln-artcv]');
  ok(p0.lit > 0.004 && p0.colours >= 5, 'the strip is drawn (ECG and pressure on the monitor ground)');
  ok(/^12[0-4]\/(69|7[01])$/.test(await tile('Pressure')) && +(await tile('Heart rate')) === 72, 'the normal radial trace reads about 122/70 at 72 (' + await tile('Pressure') + ')');
  await page.$eval('[data-ln-artcv]', c => c.lnRead(2.0));
  ok(/ms after R/.test(await attr('[data-ln-artcv]', 'data-ln-read')) && /ART \d+ mm Hg/.test(await attr('[data-ln-artcv]', 'data-ln-read')), 'the cursor reads the time after the R wave and the pressure (' + await attr('[data-ln-artcv]', 'data-ln-read') + ')');
  await page.selectOption('[data-ln-artsel]', 'sites'); await page.waitForSelector('[data-ln-sites]');
  const rows = await page.$$eval('[data-ln-sites] tbody tr', r => r.map(x => Array.from(x.children).map(c => c.textContent)));
  ok(rows.length === 5 && new Set(rows.map(r => r[2])).size <= 2 && +rows[0][1].split('/')[0] < +rows[3][1].split('/')[0] && +rows[3][1].split('/')[0] < +rows[4][1].split('/')[0] && rows[0][3] === '90 ms' && rows[3][3] === '175 ms', 'five sites: one mean, a systolic that climbs outwards, an upstroke 90 ms after R at the root and 175 ms at the wrist');
  await page.selectOption('[data-ln-artsel]', 'iabp'); await page.waitForSelector('[data-ln-var]');
  ok(await page.locator('[data-ln-var]').count() === 5 && await page.locator('[data-ln-varnote]').count() === 0, 'the balloon pump: five timings');
  await page.click('[data-ln-var="ld"]'); await page.waitForSelector('[data-ln-varnote]');
  ok(/most harmful/.test(await txt('[data-ln-varnote]')), 'late deflation is named as the harmful one');
  await page.selectOption('[data-ln-artsel]', 'under'); await page.waitForSelector('[data-ln-tile="Flush test"]');
  const dsp = await tile('Displayed'), tru = await tile('True');
  ok(+dsp.split('/')[0] > +tru.split('/')[0] + 12 && +dsp.split('/')[1] <= +tru.split('/')[1] && /underdamped/.test(await tileU('Flush test')) && /oscillations/.test(await tile('Flush test')), 'an underdamped line: displayed ' + dsp + ' against a true ' + tru + ', and a flush test that rings');
  await page.selectOption('[data-ln-artsel]', 'over'); await page.waitForTimeout(300);
  ok(+(await tile('Displayed')).split('/')[0] < +(await tile('True')).split('/')[0] - 10 && /no bounce/.test(await tile('Flush test')), 'an overdamped line: the systolic low, no bounce');
  await page.selectOption('[data-ln-artsel]', 'ppv'); await page.waitForSelector('[data-ln-tile="PP variation"]');
  ok(+(await tile('PP variation')) >= 14 && +(await tile('PP variation')) <= 32 && /validity|passive on the ventilator/.test(await txt('[data-ln-art] [data-ln-text]')), 'pulse-pressure variation is measured off the strip (' + await tile('PP variation') + '%) with its conditions');
  await page.selectOption('[data-ln-artsel]', 'paradoxus'); await page.waitForSelector('[data-ln-tile="Paradox"]');
  ok(+(await tile('Paradox')) > 12, 'pulsus paradoxus measured (' + await tile('Paradox') + ' mm Hg)');
  await page.click('[data-ln-art-next]'); await page.waitForTimeout(300);
  ok(await attr('[data-ln-art]', 'data-ln-art') === 'ppv', 'the arrows step through the patterns');
  await page.selectOption('[data-ln-artsel]', 'hocm'); await page.waitForSelector('[data-ln-alt]'); await page.check('[data-ln-alt]'); await page.waitForTimeout(300);
  ok(/Brockenbrough/.test(await txt('[data-ln-art] [data-ln-text]')) && await page.locator('[data-ln-alt]').isChecked(), 'obstructive cardiomyopathy: with ectopics on request');

  // ================================================================ the venous gallery
  await go('ln_cvp_patterns', '[data-ln-cvp]');
  ok(await page.locator('[data-ln-cvpsel] option').count() === 12 && (await painted('[data-ln-cvpcv]')).colours >= 5, 'twelve venous patterns, drawn');
  ok(await tile('With inspiration') === 'falls' && +(await tile('At end-expiration')) >= 5 && +(await tile('At end-expiration')) <= 9, 'normal, breathing alone: falls with inspiration; about 6–8 at end-expiration');
  await page.click('[data-ln-vent="ppv"]'); await page.waitForTimeout(300);
  ok(await tile('With inspiration') === 'rises', 'on the ventilator it rises');
  await page.click('[data-ln-vent="spont"]'); await page.selectOption('[data-ln-cvpsel]', 'constriction'); await page.waitForTimeout(300);
  ok(await tile('With inspiration') === 'rises' && /Kussmaul/.test(await tileU('With inspiration')) && /M or W/.test(await txt('[data-ln-cvp] [data-ln-text]')), 'constriction: Kussmaul’s sign and the M or W');
  await page.selectOption('[data-ln-cvpsel]', 'tamponade'); await page.waitForTimeout(300);
  ok(/one dip per beat/.test(await txt('[data-ln-cvp] [data-ln-text]')) && +(await tile('At end-expiration')) > 13, 'tamponade: one dip per beat on a high pressure');
  await page.selectOption('[data-ln-cvpsel]', 'chb'); await page.waitForTimeout(300);
  ok(/cannon/.test(await txt('[data-ln-cvp] [data-ln-text]')) && await tile('Rhythm') === 'complete block', 'complete heart block: cannon waves');

  // ================================================================ floating the catheter
  await go('ln_pa_patterns', '[data-ln-pa]');
  ok(await attr('[data-ln-pa]', 'data-ln-pa') === 'float' && (await painted('[data-ln-pacv]')).colours >= 5 && /One strip, four chambers/.test(await txt('[data-ln-pa] [data-ln-text]')), 'the insertion strip: four chambers on one trace');
  ok(/^2[4-6]\/(9|1[01])$/.test(await tile('Pulmonary artery')) && +(await tile('Wedge (mean)')) <= 10, 'normal numbers: PA ' + await tile('Pulmonary artery') + ', wedge ' + await tile('Wedge (mean)'));
  await page.click('[data-ln-pos="rv"]'); await page.waitForTimeout(300);
  ok(/Diastole begins near zero and climbs/.test(await txt('[data-ln-pa] [data-ln-text]')), 'the right ventricle is told by its diastole');
  await page.selectOption('[data-ln-wedgesel]', 'mr'); await page.waitForTimeout(350);
  ok(await attr('[data-ln-pa]', 'data-ln-pa') === 'wedge' && /giant v wave/.test(await txt('[data-ln-pa] [data-ln-text]')) && +(await tile('Pulmonary artery')).split('/')[0] > 45, 'choosing mitral regurgitation shows the wedge with its giant v wave');

  // ================================================================ real recordings
  await go('ln_real', '[data-ln-real]');
  ok(await page.locator('[data-ln-realsel] option').count() === 5 && (await painted('[data-ln-realcv]')).colours >= 5 && /WFDB/.test(await txt('[data-ln-real] figcaption')) && /zeroed/.test(await txt('[data-ln-real] [data-ln-text]')), 'five real strips, credited; the first is a line being zeroed and flushed');
  await page.selectOption('[data-ln-realsel]', 'radial'); await page.waitForSelector('[data-ln-cmptable]');
  const cmp = await page.$$eval('[data-ln-cmptable] tbody tr', r => r.map(x => Array.from(x.children).map(c => parseFloat(c.textContent))));
  ok(cmp.length === 4 && Math.abs(cmp[0][1] - cmp[0][2]) <= 50 && Math.abs(cmp[1][1] - cmp[1][2]) <= 40 && Math.abs(cmp[2][1] - cmp[2][2]) <= 0.08 && Math.abs(cmp[3][1] - cmp[3][2]) <= 0.07, 'the model’s beat is held against the real one: upstroke ' + cmp[0][1] + ' vs ' + cmp[0][2] + ' ms, notch ' + cmp[1][1] + ' vs ' + cmp[1][2] + ' ms');
  ok((await painted('[data-ln-beatcv]')).colours >= 4, 'and the two beats are drawn over each other');
  await page.selectOption('[data-ln-realsel]', 'pa'); await page.waitForSelector('[data-ln-cmp="pa"]');
  ok(/90 ms after the R wave/.test(await txt('[data-ln-real] [data-ln-text]')), 'the real pulmonary artery strip with its delays');
  await page.selectOption('[data-ln-realsel]', 'zero'); await page.waitForTimeout(300);
  ok(/stopcock/.test(await txt('[data-ln-real] [data-ln-text]')) && await page.locator('[data-ln-cmp]').count() === 0, 'the trace that falls to zero while the ECG carries on');

  // ================================================================ the troubleshooting lab
  await go('ln_fix', '[data-ln-fix]');
  ok(await page.locator('[data-ln-fixsel] option').count() === 9 && await attr('[data-ln-fix]', 'data-ln-fix') === 'bubble' && await tile('ART') === '101/69' && await attr('[data-ln-fixscore]', 'data-ln-fixscore') === '0', 'nine cases; the first displays 101/69');
  await page.click('[data-ln-act="pressor"]'); await page.waitForSelector('[data-ln-found="pressor"]');
  ok(await page.locator('[data-ln-found="pressor"].bad').count() === 1 && await page.locator('[data-ln-solved]').count() === 0 && await tile('ART') === '101/69', 'treating the screen is logged and fixes nothing');
  await page.click('[data-ln-act="patient"]'); await page.waitForSelector('[data-ln-tile="Cuff"]');
  ok(await tile('Cuff') === '124/64', 'the cuff disagrees');
  await page.click('[data-ln-act="flush"]'); await page.waitForSelector('[data-ln-found="flush"]');
  ok(/overdamped/.test(await txt('[data-ln-found="flush"]')), 'the flush test says overdamped');
  await page.click('[data-ln-act="zero"]'); await page.waitForTimeout(250);
  ok(await page.locator('[data-ln-solved]').count() === 0, 're-zeroing does not help');
  await page.click('[data-ln-act="bubble"]'); await page.waitForSelector('[data-ln-solved]');
  ok(/^12[2-4]\/6[1-3]$/.test(await tile('ART')) && /treated once/.test(await txt('[data-ln-solved]')) && /bubble or a clot/.test(await txt('[data-ln-solved]')) && await attr('[data-ln-fixscore]', 'data-ln-fixscore') === '1', 'clearing the bubble restores ' + await tile('ART') + '; the lesson and the score follow, with the pressor counted against');
  await page.click('[data-ln-fixnext]'); await page.waitForSelector('[data-ln-fix="whip"]');
  ok(+(await tile('ART')).split('/')[0] > 185, 'next: a systolic of ' + (await tile('ART')).split('/')[0]);
  await page.click('[data-ln-act="tubing"]'); await page.waitForSelector('[data-ln-solved]');
  ok(Math.abs(+(await tile('ART')).split('/')[0] - 153) <= 3, 'simplifying the tubing brings it to ' + await tile('ART'));
  await page.selectOption('[data-ln-fixsel]', 'level'); await page.waitForSelector('[data-ln-fix="level"]');
  const lv0 = await tile('ART'); await page.click('[data-ln-act="zero"]'); await page.waitForTimeout(250);
  ok(lv0 === '148/87' && await tile('ART') === '148/87' && await page.locator('[data-ln-solved]').count() === 0, 'a low transducer: zeroing changes nothing');
  await page.click('[data-ln-act="level"]'); await page.waitForSelector('[data-ln-solved]');
  ok(await tile('ART') === '133/72', 're-levelling takes 15 mm Hg off everything');
  await page.selectOption('[data-ln-fixsel]', 'softbag'); await page.waitForSelector('[data-ln-fix="softbag"]');
  await page.click('[data-ln-act="bag"]'); await page.waitForTimeout(250);
  ok(await page.locator('[data-ln-solved]').count() === 0, 'a soft bag: the new bag alone is not enough');
  await page.click('[data-ln-act="aspirate"]'); await page.waitForSelector('[data-ln-solved]');
  ok(/Aspirate a clot out/.test(await txt('[data-ln-solved]')), 'the clot has to come out as well');
  await page.selectOption('[data-ln-fixsel]', 'gradient'); await page.waitForSelector('[data-ln-fix="gradient"]');
  await page.click('[data-ln-act="flush"]'); await page.click('[data-ln-act="site"]'); await page.waitForSelector('[data-ln-tile="Femoral"]');
  ok(+(await tile('Femoral')).split('/')[0] > +(await tile('ART')).split('/')[0] + 20 && await page.locator('[data-ln-solved]').count() === 1, 'the faithful radial line that under-reads: the femoral pressure settles it');
  await page.selectOption('[data-ln-fixsel]', 'cvpexp'); await page.waitForSelector('[data-ln-fix="cvpexp"]');
  await page.click('[data-ln-act="endexp"]'); await page.waitForSelector('[data-ln-tile="End-expiration"]');
  ok(+(await tile('End-expiration')) <= 9 && +(await tile('CVP (monitor)')) > +(await tile('End-expiration')), 'the forced expiration: ' + await tile('End-expiration') + ' at end-expiration against a monitor mean of ' + await tile('CVP (monitor)'));
  await page.selectOption('[data-ln-fixsel]', 'overwedge'); await page.waitForSelector('[data-ln-fix="overwedge"]');
  const w0 = +(await tile('PA')).split('/')[0]; await page.click('[data-ln-act="balloon"]'); await page.waitForSelector('[data-ln-solved]');
  ok(w0 < 25 && +(await tile('PA')).split('/')[0] > 33 && await tile('Balloon') === 'down', 'the forgotten balloon: deflating it brings the pulmonary artery trace back');
  ok(+(await attr('[data-ln-fixscore]', 'data-ln-fixscore')) === 7 && /^✓/.test(await txt('[data-ln-fixsel] option[value="bubble"]')), 'seven fixed and ticked');
  await page.click('[data-ln-fixrestart]'); await page.waitForTimeout(250);
  ok(await page.locator('[data-ln-solved]').count() === 0 && await page.locator('[data-ln-log]').count() === 0, 'a case can be started again');

  // ================================================================ ultrasound: real frames, the drawn scanner, the needle
  await go('ln_us', '[data-ln-usreal]');
  ok(await page.locator('[data-ln-uspick]').count() === 5 && await page.$eval('[data-ln-usimg]', i => i.complete && i.naturalWidth === 520) && await page.locator('[data-ln-uslist] li').count() === 5 && await page.locator('.ln-usdot').count() === 5, 'five real frames; the first is loaded with five numbered labels');
  ok(await page.$eval('.ln-usmarks', s => getComputedStyle(s).backgroundColor === 'rgba(0, 0, 0, 0)'), 'the labels sit over the picture, not on top of it');
  await page.uncheck('[data-ln-uslabels]'); await page.waitForTimeout(250);
  ok(await page.locator('.ln-usdot').count() === 0 && await page.locator('[data-ln-uslist]').count() === 0, 'labels off');
  await page.check('[data-ln-uslabels]'); await page.click('[data-ln-uspick="doppler"]'); await page.waitForSelector('[data-ln-usreal="doppler"]');
  ok(/aliasing/i.test(await txt('[data-ln-usreal] [data-ln-text]')) && /MIT licence/.test(await txt('[data-ln-usreal] figcaption')), 'the colour frame explains its mosaic; the scans are credited');
  ok(await page.locator('[data-ln-scene]').count() === 4 && await attr('[data-ln-ussim]', 'data-ln-ussim') === 'femoral', 'the drawn scanner: four sites');
  await page.waitForFunction(() => +document.querySelector('[data-ln-simcv]').getAttribute('data-ln-frame') > 3);
  ok((await painted('[data-ln-simcv]')).colours >= 6 && await attr('[data-ln-simcv]', 'data-ln-ok') === '1' && /femoral head/.test(await txt('[data-ln-zone]')), 'the groin at the working level: the common femoral artery over the femoral head');
  await setRange('[data-ln-sim="s"]', 0.92);
  ok(await attr('[data-ln-simcv]', 'data-ln-ok') === '0' && /Too low/.test(await txt('[data-ln-zone]')), 'too far down the thigh: the vein is behind the artery');
  await page.check('[data-ln-simopt]'); await page.waitForTimeout(450);
  ok(/moved the vein partly clear/.test(await txt('[data-ln-zone]')), 'turning the leg out uncovers it');
  await setRange('[data-ln-sim="s"]', 0.02);
  ok(/retroperitoneum/.test(await txt('[data-ln-zone]')), 'above the ligament: the warning about the retroperitoneum');
  await setRange('[data-ln-sim="s"]', 0.3); await setRange('[data-ln-sim="c"]', 0.8);
  ok(/vein is flat/.test(await txt('[data-ln-zone]')), 'pressing flattens the vein');
  await page.check('[data-ln-simcolour]'); await page.waitForTimeout(500);
  const colr = await page.waitForFunction(() => { const c = document.querySelector('[data-ln-simcv]'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let red = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > d[i + 2] + 60 && d[i] > 90) red++; return red > 300; }, null, { timeout: 6000, polling: 120 }).then(() => true).catch(() => false);
  ok(colr, 'colour fills the artery with each beat');
  await page.click('[data-ln-scene="axillary"]'); await page.waitForSelector('[data-ln-ussim="axillary"]'); await page.waitForTimeout(500);
  ok(/pleura/.test(await txt('[data-ln-zone]')) && await page.locator('[data-ln-own="axillary"]').count() === 1, 'below the clavicle: the pleura is in the story; a slot for your own scan');
  await page.click('[data-ln-scene="neck"]'); await page.waitForSelector('[data-ln-ussim="neck"]'); await page.check('[data-ln-simopt]'); await page.waitForTimeout(500);
  ok(/on top of the artery/.test(await txt('[data-ln-zone]')), 'the neck: turning the head rolls the vein over the carotid');
  await setRange('[data-ln-nd="adv"]', 1.0);
  ok(await attr('[data-ln-ndcv]', 'data-ln-ndstate') === 'short' && /Nothing on the screen/.test(await txt('[data-ln-ndsay]')), 'the needle short of the beam: nothing to see');
  await setRange('[data-ln-nd="adv"]', 2.13);
  ok(await attr('[data-ln-ndcv]', 'data-ln-ndstate') === 'tip' && /target sign/.test(await txt('[data-ln-ndsay]')), 'the tip in the lumen: the target sign');
  await setRange('[data-ln-nd="adv"]', 3.3);
  ok(await attr('[data-ln-ndcv]', 'data-ln-ndstate') === 'shaft' && /it is the shaft/.test(await txt('[data-ln-ndsay]')) && await page.locator('[data-ln-ndside] svg .ln-cross').count() === 1, 'the same dot from the shaft, with the tip through the back wall');
  ok(/PERSEUS/.test(await txt('#main')) && await page.locator('.edu-links a').count() >= 3, 'the guidelines are linked');

  // ================================================================ the protocols
  await go('ln_artline', '.edu-table, table');
  const artTxt = await txt('#main');
  ok(/Radial artery/.test(artTxt) && /Femoral artery/.test(artTxt) && /Axillary artery/.test(artTxt) && /over the femoral head/.test(artTxt) && /retroperitoneal/.test(artTxt) && /left side/.test(artTxt) && /Allen/.test(artTxt) && /Saugel/.test(artTxt), 'the arterial line: three sites with their landmarks and hazards');
  await go('ln_cvc', '.edu-table, table');
  const cvcTxt = await txt('#main');
  ok(/Internal jugular vein/.test(cvcTxt) && /Subclavian \/ axillary vein/.test(cvcTxt) && /Femoral vein/.test(cvcTxt) && /prove the wire is in the vein/.test(cvcTxt) && /Leave it in place/.test(cvcTxt) && /height ÷ 10/.test(cvcTxt) && /airtight dressing/.test(cvcTxt) && /3SITES/.test(cvcTxt), 'the central line: three sites, the wire check, the arterial-dilation rule, depth and removal');

  // ================================================================ the older labs on the new engine
  await go('mon_art', '[data-monart]');
  ok(await page.$eval('[data-ms-tile="ABP"] .vsc-v', e => e.textContent) === '120/70', 'the arterial line lab still reads 120/70 when ideal');
  await page.click('[data-ma-fault="whip"]'); await page.waitForSelector('[data-ma-verdict="underdamped"]');
  ok(+(await page.$eval('[data-ms-tile="ABP"] .vsc-v', e => e.textContent)).split('/')[0] > 132, 'and overshoots when underdamped');
  await go('mon_cvp', '[data-moncvp]'); await page.waitForTimeout(600);
  ok((await painted('[data-moncvp] canvas')).colours >= 4, 'the CVP screen draws from the engine');
  await go('hemo_lab', '[data-hemolab]'); await page.waitForTimeout(500);
  ok(await page.$$eval('[data-hemolab] path', ps => ps.length > 3 && ps.every(p => !/NaN/.test(p.getAttribute('d') || ''))), 'the Swan–Ganz lab draws its traces without a hole');

  // ================================================================ home, phone, dark
  await home();
  ok(/Fix the line/.test(await txt('[data-home-tile="monitor"]')) && /Line insertion/.test(await txt('[data-home-tile="monitor"]')), 'the monitoring tile points at the new topics');
  await page.locator('[data-home-tile="monitor"] [data-home-link]', { hasText: 'Fix the line' }).click(); await page.waitForSelector('[data-ln-fix]');
  ok(true, 'and its link opens the lab');
  await page.setViewportSize({ width: 400, height: 800 });
  for (const [t, sel, name] of [['ln_art_patterns', '[data-ln-art]', 'the arterial gallery'], ['ln_cvp_patterns', '[data-ln-cvp]', 'the venous gallery'], ['ln_real', '[data-ln-real]', 'the real recordings'], ['ln_fix', '[data-ln-fix]', 'the troubleshooting lab'], ['ln_us', '[data-ln-ussim]', 'the ultrasound page'], ['ln_cvc', 'table', 'the central line protocol']]) {
    await go(t, sel); await page.waitForTimeout(300);
    ok(await noSideScroll(), 'phone: ' + name + ' does not scroll sideways');
  }
  await page.setViewportSize({ width: 1380, height: 1000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await go('ln_us', '[data-ln-zone]'); await page.waitForTimeout(400);
  const lum = async (sel, prop) => page.$eval(sel, (e, p) => { const m = /rgba?\((\d+), (\d+), (\d+)/.exec(getComputedStyle(e)[p]); return m ? (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) : -1; }, prop);
  ok(await lum('[data-ln-zone]', 'backgroundColor') < 90 && await lum('[data-ln-zone]', 'color') > 150, 'dark: the level note reads');

  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 3).join(' | '));
  console.log('e2e11 passed', passes, 'failed', fails);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('CRASH', e.message.split('\n').slice(0, 6).join('\n')); process.exit(2); });
