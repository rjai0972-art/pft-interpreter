// v8.9: the hemos calculator. The chart's seven formulas reproduced exactly, the fuller set, the checks on entries, the
// guards (no division by zero, no negative resistance, no NaN anywhere), the sensitivity bands, the limits attached to every
// number, the reading, the note, the comparison of two sets and the example patients. Only failures print.
global.window = global;
require('../src/physio.js');
require('../src/waves.js');
const H = require('../src/hemo.js');
const C = require('../src/hemocalc.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, t) => Math.abs(a - b) <= (t === undefined ? 1e-9 : t);
const BASE = { wt: '82', ht: '178', hb: '11.4', sao2: '96', svo2: '58', cvp: '14', map: '72', pas: '48', pad: '24', pcwp: '22' };
const withRaw = (o) => Object.assign({}, BASE, o || {});
const kinds = (r) => r.checks.map(c => c.level + ':' + c.k);

/* ---- the chart's formulas, written here independently of the engine ---- */
{
  let worst = 0, n = 0;
  for (const wt of [48, 70, 82, 115]) for (const ht of [152, 170, 188]) for (const hb of [7.2, 11.4, 15]) for (const sv of [42, 58, 71]) for (const cvp of [3, 9, 18]) for (const pcwp of [8, 16, 24]) {
    const sa = 95, map = 68, pas = 52, pad = 27;
    const r = C.compute({ wt, ht, hb, sao2: sa, svo2: sv, cvp, map, pas, pad, pcwp });
    const co = (3.5 * wt) / ((1.34 * hb * 10) * ((sa - sv) / 100)), bsa = Math.sqrt(ht * wt / 3600);
    const exp = { co: co, ci: co / bsa, bsa: bsa, svr: ((map - cvp) / co) * 80, papi: (pas - pad) / cvp, cpo: map * co / 451, pvr: ((pas + 2 * pad) / 3 - pcwp) / co };
    Object.keys(exp).forEach(k => { if (r.by[k].value !== null) { worst = Math.max(worst, Math.abs(r.by[k].value - exp[k])); n++; } });
  }
  ok(worst < 1e-9 && n > 2000, 'the seven chart results equal the chart formulas across ' + n + ' values (worst ' + worst + ')');
}
{
  const r = C.compute(BASE);
  ok(r.by.co.text === '4.9' && r.by.ci.text === '2.5' && r.by.bsa.text === '2.01' && r.by.svr.text === '938' && r.by.papi.text === '1.71' && r.by.cpo.text === '0.79' && r.by.pvr.text === '2.0', 'a worked set: CO 4.9, CI 2.5, BSA 2.01, SVR 938, PAPi 1.71, CPO 0.79, PVR 2.0');
  ok(r.rows.slice(0, 7).map(x => x.id).join() === 'co,ci,bsa,svr,papi,cpo,pvr' && r.rows.length === 26 && C.ORDER.length === 26, 'the first seven rows are the chart’s, in its order; twenty-six numbers in all');
  ok(/287 ÷ \(1\.34 × 11\.4 × 10 × \(96 − 58\) ÷ 100\) = 287 ÷ 58\.0 = 4\.9/.test(r.by.co.worked) && /\(\(48 \+ 2 × 24\) ÷ 3 − 22\) ÷ 4\.9/.test(r.by.pvr.worked) && /72 × 4\.9 ÷ 451 = 0\.79/.test(r.by.cpo.worked), 'each result shows its arithmetic with the patient’s numbers');
  ok(r.by.svr.sub === '11.7 Wood units' && r.by.pvr.sub === '162 dyn·s/cm⁵' && /3\.5 mL\/kg\/min · 143 mL\/min\/m²/.test(r.by.vo2.sub), 'the second unit beside SVR, PVR and VO2');
  ok(r.checks.length === 0 && r.read.complete && r.read.filled === 10, 'a clean set raises nothing');
  ok(near(r.by.avd.value, 1.34 * 11.4 * 38 / 100) && near(r.by.o2er.value, 38 / 96 * 100) && near(r.by.cao2.value, 1.34 * 11.4 * 0.96) && near(r.by.do2.value, r.by.co.value * r.by.cao2.value * 10) && near(r.by.mpap.value, 32) && near(r.by.tpg.value, 10) && near(r.by.dpg.value, 2) && near(r.by.rapcwp.value, 14 / 22), 'the ingredients and the gradients');
  ok(near(r.by.do2.value, r.by.vo2.value / (r.by.o2er.value / 100), 1e-6), 'oxygen delivery is the assumed VO2 over the extraction ratio (the stated limit is true of the arithmetic)');
  ok(near(r.by.cpoRap.value, (72 - 14) * r.by.co.value / 451) && near(r.by.cpi.value, 72 * r.by.ci.value / 451) && near(r.by.svri.value, (72 - 14) / r.by.ci.value * 80), 'RAP-corrected power, the power index and the SVR index');
  ok(r.by.sv.value === null && /Heart rate/.test(r.by.sv.need.join()) && r.by.api.value === null && /Systolic BP/.test(r.by.api.need.join()), 'the per-beat numbers and the pulse indices wait for the heart rate and the blood pressure');
}
{
  const r = C.compute(withRaw({ hr: '98', sbp: '98', dbp: '60' })), sv = r.by.co.value * 1000 / 98, svi = sv / r.by.bsa.value;
  ok(near(r.by.sv.value, sv) && near(r.by.svi.value, svi) && near(r.by.lvswi.value, svi * (72 - 22) * 0.0136) && near(r.by.rvswi.value, svi * (32 - 14) * 0.0136) && near(r.by.pac.value, sv / 24) && near(r.by.ppp.value, 38 / 98 * 100) && near(r.by.api.value, 38 / 22), 'stroke volume, the work indices, PA compliance, proportional pulse pressure and the aortic pulsatility index');
  ok(r.rows.every(x => x.value !== null), 'with heart rate and blood pressure every number is calculated');
}

/* ---- entries ---- */
ok(C.check('hb', '').state === 'empty' && C.check('hb', '11.4').state === 'ok' && C.check('hb', '11,4').v === 11.4 && C.check('hb', '5.1').state === 'warn' && C.check('hb', 'abc').state === 'bad' && C.check('hb', '1e3').state === 'bad', 'an entry is empty, good, unusual or rejected');
ok(/110 g\/L is 11\.0/.test(C.check('hb', '110').msg) && C.check('hb', '110').v === undefined && /dropped digit/.test(C.check('hb', '1.7').msg), 'haemoglobin: g/L and a dropped digit are named');
ok(/1\.78 m is 178/.test(C.check('ht', '1.78').msg) && /70 in is 178 cm/.test(C.check('ht', '70').msg) && /0\.58 is 58/.test(C.check('svo2', '0.58').msg) && /400 lb is 181 kg/.test(C.check('wt', '400').msg) && /above 100/.test(C.check('sao2', '104').msg), 'height in metres or inches, a fraction for a percentage, pounds, a saturation over 100');
ok(C.FIELDS.filter(F => F.set === 'chart').map(F => F.k).join() === 'wt,ht,hb,sao2,svo2,cvp,map,pas,pad,pcwp', 'the ten inputs in the chart’s order');
ok(C.FIELDS.every(F => F.hard[0] < F.soft[0] + 1e-9 && F.soft[1] <= F.hard[1] && F.eg >= F.soft[0] && F.eg <= F.soft[1] && F.unit && F.label), 'every field has a rejected span, a queried span and an example inside both');
ok(C.FIELDS.every(F => !/name|room|bed|mrn|ssn|dob|birth|note|id$/i.test(F.k + ' ' + F.label)), 'there is nowhere to type a name, a bed or a record number');

/* ---- guards: the pitfalls a spreadsheet divides straight through ---- */
{
  const r = C.compute(withRaw({ svo2: '96' }));
  ok(r.by.co.value === null && r.by.co.text === '—' && /not below the arterial/.test(r.by.co.err) && kinds(r).indexOf('bad:no-gap') >= 0 && r.by.ci.value === null && r.by.svr.value === null && r.by.cpo.value === null && r.by.pvr.value === null, 'equal saturations: no output, and the reason, instead of a division by zero');
  ok(r.by.papi.value !== null && r.by.bsa.value !== null && r.by.mpap.value !== null, 'what does not need the Fick is still calculated');
  ok(C.compute(withRaw({ svo2: '98', sao2: '94' })).by.co.value === null, 'a venous saturation above the arterial gives no negative output');
}
{
  const r = C.compute(withRaw({ cvp: '0' }));
  ok(r.by.papi.value === null && /cannot be divided by/.test(r.by.papi.err) && r.by.rapcwp.value === null && r.by.svr.value !== null, 'a CVP of zero: no PAPi and no ratio, SVR unaffected');
  const lowCvp = C.compute(withRaw({ cvp: '3' }));
  ok(lowCvp.by.papi.st === 'na' && /not interpretable/.test(lowCvp.by.papi.say) && /not interpretable at a filling pressure this low/.test(lowCvp.by.papi.here.join(' ')) && near(lowCvp.by.papi.value, 8), 'a CVP of 3: the PAPi is shown and marked as not interpretable');
}
{
  const r = C.compute(withRaw({ pcwp: '34' }));
  ok(r.by.pvr.value === null && /measurement error, not a negative resistance/.test(r.by.pvr.err) && r.by.tpg.value === null && kinds(r).indexOf('bad:wedge-high') >= 0, 'a wedge above the mean PA pressure: no negative PVR');
  const r2 = C.compute(withRaw({ pcwp: '27' }));
  ok(r2.by.pvr.value > 0 && r2.by.dpg.value === -3 && r2.by.dpg.st === 'na' && kinds(r2).indexOf('warn:dpg-neg') >= 0, 'a wedge above the PA diastolic: a negative DPG is called a measurement error');
}
{
  const r = C.compute(withRaw({ pas: '20', pad: '24' }));
  ok(kinds(r).indexOf('bad:pa-order') >= 0 && r.by.papi.value === null && r.by.mpap.value === null && r.by.pvr.value === null && r.by.dpg.value === null && r.by.co.value !== null && r.by.svr.value !== null, 'PA diastolic above systolic: nothing built on the PA pressures, the rest intact');
  const m = C.compute(withRaw({ map: '12', cvp: '14' }));
  ok(m.fields.map.state === 'bad' && m.by.svr.value === null, 'an impossible MAP is rejected');
  const m2 = C.compute(withRaw({ map: '26', cvp: '30' }));
  ok(kinds(m2).indexOf('bad:map-cvp') >= 0 && m2.by.svr.value === null && m2.by.cpoRap.value === null && m2.by.cpo.value !== null, 'a CVP above the MAP: no SVR');
}
{
  const r = C.compute(withRaw({ hb: '3.4' }));
  ok(r.by.co.value > 15 && kinds(r).indexOf('bad:co-range') >= 0 && !r.read.complete, 'an output no resting adult can have is flagged before anything is read');
  const hi = C.compute(withRaw({ hb: '7.5', svo2: '74' })), lo = C.compute(withRaw({ wt: '45', ht: '150', hb: '16', svo2: '30', sao2: '99' }));
  ok(hi.by.co.value > 11 && hi.by.co.value < 15 && kinds(hi).indexOf('warn:co-edge') >= 0 && kinds(hi).indexOf('bad:co-range') < 0 && hi.read.complete && lo.by.co.value < 1.8 && kinds(lo).indexOf('warn:co-edge') >= 0, 'a very high or very low Fick that can still be real is queried, not rejected');
  const big = C.compute(withRaw({ wt: '200', ht: '175' })), thin = C.compute(withRaw({ wt: '40', ht: '178' }));
  ok(big.by.bsa.value !== null && big.checks.some(c => c.k === 'bmi-high' && /BMI 65/.test(c.t) && /check the weight and the height/.test(c.t)) && kinds(big).indexOf('bad:bmi') < 0 && kinds(thin).indexOf('warn:bmi-low') >= 0 && thin.by.bsa.value !== null, 'a BMI of 65 or of 13 is a real patient: queried and calculated');
  const sw = C.compute(withRaw({ wt: '178', ht: '82' }));
  ok(sw.fields.ht.state === 'bad' && /swapped/.test(sw.fields.ht.msg) && sw.by.bsa.value === null && sw.by.ci.value === null, 'height and weight swapped: caught at the height');
  const bm = C.compute(withRaw({ wt: '300', ht: '150' }));
  ok(kinds(bm).indexOf('bad:bmi') >= 0 && bm.by.bsa.value === null && bm.by.co.value === null && bm.by.papi.value !== null, 'a weight and height that do not fit each other: nothing built on body size');
  const ob = C.compute(withRaw({ wt: '129', ht: '175' }));
  ok(kinds(ob).indexOf('warn:bmi-high') >= 0 && /probably overestimates/.test(ob.by.vo2.here.join(' ')) && /disagree by/.test(ob.by.co.here.join(' ')), 'a BMI of 42: the per-kilogram assumption is queried');
  const ng = C.compute(withRaw({ svo2: '88' }));
  ok(kinds(ng).indexOf('warn:narrow-gap') >= 0 && /13%/.test(ng.checks.filter(c => c.k === 'narrow-gap')[0].t), 'a narrow saturation gap: each point is 13% of the answer');
}
/* never a NaN, an Infinity or an error token, whatever is typed */
{
  let seed = 7, bad = 0, n = 0;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const junk = ['', '0', '-3', '0.5', '1', '7', '18', '60', '97', '100', '101', '250', '999', 'x', '1.', '.5', '12,5', ' 40 '];
  for (let i = 0; i < 1500; i++) {
    const raw = {}; C.FIELDS.forEach(F => { const q = rnd(); raw[F.k] = q < 0.25 ? junk[Math.floor(rnd() * junk.length)] : q < 0.35 ? '' : String(Math.round((F.hard[0] + rnd() * (F.hard[1] - F.hard[0])) * 10) / 10); });
    const opt = { vo2: ['kg', 'bsa', 'lafarge', 'measured'][i % 4], sex: ['', 'm', 'f'][i % 3], venous: i % 2 ? 'cv' : 'mv', co: i % 5 ? 'fick' : 'td', ctx: { ecmo: i % 7 === 0, ppv: i % 3 === 0, pressor: i % 2 === 0, tr: i % 11 === 0, shunt: i % 13 === 0, mcs: i % 17 === 0, hifio2: i % 4 === 0, af: i % 9 === 0 } };
    const r = C.compute(raw, opt), all = JSON.stringify(r.rows) + JSON.stringify(r.checks) + JSON.stringify(r.read) + C.note(r);
    n++;
    if (/NaN|Infinity|undefined|#DIV|null,null\]/.test(all.replace(/"value":null/g, '').replace(/"range":null/g, '').replace(/"gauge":null/g, '').replace(/,null,/g, ',0,'))) { bad++; if (bad < 3) console.log('   e.g.', JSON.stringify(raw), all.match(/.{40}(NaN|Infinity|undefined|#DIV).{40}/)); }
    r.rows.forEach(x => { if (x.value !== null && (!isFinite(x.value) || x.text === '—')) bad++; if (x.value === null && x.text !== '—') bad++; if (x.value !== null && x.need.length) bad++; if (x.range && !(x.range.lo <= x.value && x.value <= x.range.hi)) bad++; });
    if (r.by.pvr.value !== null && r.by.pvr.value <= 0) bad++;
    if (r.by.co.value !== null && r.by.co.value <= 0) bad++;
  }
  ok(bad === 0, 'fifteen hundred random and junk-filled sheets: no NaN, no Infinity, no negative output or resistance, every band contains its value (' + bad + ' faults in ' + n + ')');
}
/* ---- it fills in as you type ---- */
{
  const e = C.compute({});
  ok(e.rows.every(x => x.value === null && x.text === '—' && (x.need.length > 0)) && e.checks.length === 0 && e.read.lines.length === 0 && e.read.filled === 0, 'an empty sheet: every row says what it needs, nothing is flagged');
  ok(e.by.bsa.need.join() === 'Weight,Height' && e.by.papi.need.join() === 'PA systolic,PA diastolic,CVP' && /Weight/.test(e.by.co.need.join()) && /Haemoglobin/.test(e.by.co.need.join()), 'what each row is waiting for');
  const a = C.compute({ wt: '82', ht: '178' });
  ok(a.by.bsa.value !== null && a.by.vo2.value === 287 && a.by.co.value === null && a.by.co.need.join() === 'Haemoglobin,Arterial O2 saturation,ScvO2 or SvO2', 'weight and height alone give BSA and the assumed VO2');
  const b = C.compute({ pas: '48', pad: '24', cvp: '14' });
  ok(b.by.papi.value !== null && b.by.mpap.value === 32 && b.by.pvr.value === null, 'three pressures alone give PAPi and the mean PA');
  const c = C.compute({ wt: '82', hb: '11.4', sao2: '96', svo2: '58' });
  ok(c.by.co.text === '4.9' && c.by.ci.value === null && c.by.ci.need.join() === 'Height', 'the output needs no height; the index does');
}
/* ---- oxygen consumption ---- */
{
  const k = C.compute(BASE), b = C.compute(BASE, { vo2: 'bsa' });
  ok(near(b.by.vo2.value, 125 * k.by.bsa.value) && near(b.by.co.value, 125 * k.by.bsa.value / (k.by.avd.value * 10)) && /125 mL\/min\/m² × BSA/.test(b.by.co.formula) && k.by.co.alts.some(a => /125 mL\/min\/m²/.test(a.label) && a.text === b.by.co.text + ' L/min'), 'the 125 mL/min/m² assumption, and each method shown beside the other');
  const lm = C.compute(withRaw({ age: '64', hr: '98' }), { vo2: 'lafarge', sex: 'm' }), lf = C.compute(withRaw({ age: '64', hr: '98' }), { vo2: 'lafarge', sex: 'f' });
  ok(near(lm.by.vo2.value, k.by.bsa.value * (138.1 - 11.49 * Math.log(64) + 0.378 * 98)) && near(lf.by.vo2.value, k.by.bsa.value * (138.1 - 17.04 * Math.log(64) + 0.378 * 98)) && lf.by.vo2.value < lm.by.vo2.value, 'LaFarge for men and women');
  const ln = C.compute(BASE, { vo2: 'lafarge' });
  ok(ln.by.vo2.value === null && /Age/.test(ln.by.vo2.need.join()) && /Heart rate/.test(ln.by.vo2.need.join()) && /Sex/.test(ln.by.vo2.need.join()) && ln.by.co.value === null, 'LaFarge without age, sex and heart rate: says what it needs');
  const m = C.compute(withRaw({ vo2m: '210' }), { vo2: 'measured' });
  ok(m.by.vo2.value === 210 && near(m.by.co.value, 210 / (k.by.avd.value * 10)) && m.by.co.range === null && m.by.co.sub === 'direct Fick' && /Measured: the Fick is now direct/.test(m.by.vo2.limit) && !m.assumed, 'a measured VO2 makes a direct Fick, with no assumption band');
  ok(C.VO2_METHODS.map(q => q[0]).join() === 'kg,bsa,lafarge,measured', 'four ways to an oxygen consumption');
}
/* ---- what the limits mean for these numbers ---- */
{
  const r = C.compute(BASE);
  ok(near(r.by.co.range.lo, r.by.co.value * 0.75) && near(r.by.co.range.hi, r.by.co.value * 1.25) && near(r.by.svr.range.lo, r.by.svr.value / 1.25) && near(r.by.svr.range.hi, r.by.svr.value / 0.75) && near(r.by.pvr.range.hi, r.by.pvr.value / 0.75) && r.by.papi.range === null && r.by.mpap.range === null && r.by.o2er.range === null, 'the VO2 band: ± 25% on the numbers that rise with the output, the inverse on the resistances, none where the output is not involved');
  ok(Object.keys(C.ON_CO).every(id => r.by[id].range || r.by[id].value === null) && r.rows.filter(x => x.range).length === 9, 'every calculated number that contains the output carries the band');
  ok(/gap of 38 points/.test(r.by.co.here[0]) && /by 3%/.test(r.by.co.here[0]) && /5 points lower, the Fick is 4\.4 rather than 4\.9/.test(r.by.co.here.join(' ')) && /index 2\.2 rather than 2\.5/.test(r.by.co.here.join(' ')), 'the saturation gap and the central venous sample, in this patient’s numbers');
  const mv = C.compute(BASE, { venous: 'mv' });
  ok(!/central venous sample/.test(mv.by.co.here.join(' ')) && /right sample for a Fick/.test(mv.by.avd.here.join(' ')) && /PA catheter is in/.test(r.by.avd.here.join(' ')), 'a mixed venous sample drops the central-line caveat; a central sample with PA pressures typed points to the distal port');
  ok(/between 1\.50 and 2\.00/.test(r.by.papi.here.join(' ')) && /between 1\.4 and 2\.6 Wood units/.test(r.by.pvr.here.join(' ')) && /crosses a decision line/.test(r.by.pvr.here.join(' ')) && /CVP of 14 subtracted.*0\.64 W/.test(r.by.cpo.here.join(' ')), 'two mm Hg on the CVP, three on the wedge, and the CVP under the cardiac power');
  ok(/crosses 2\.2/.test(r.by.ci.here.join(' ')) && r.read.perf === 'unsure' && r.read.lines[0].cross && /cannot place this patient/.test(r.read.lines[0].t), 'an index whose band crosses 2.2 is called undecided');
  const p = C.compute(withRaw({ pao2: '380' }));
  ok(/dissolved oxygen the formula leaves out is worth \d+%/.test(p.by.co.here.join(' ')) && p.by.co.value === r.by.co.value && near(p.by.cao2.value, r.by.cao2.value + 0.003 * 380) && /0\.003 × PaO2/.test(p.by.cao2.formula), 'a PaO2 of 380: the chart value is unchanged and the cost of leaving out dissolved oxygen is stated');
  const d = +p.by.co.here.join(' ').match(/worth (\d+)%/)[1];
  ok(d >= 10 && d <= 25, 'dissolved oxygen at a PaO2 of 380 is worth ' + d + '% here (the limit says 10–25%)');
  ok(C.po2At(75) > 37 && C.po2At(75) < 43 && C.po2At(50) > 25 && C.po2At(50) < 29 && C.po2At(97) > C.po2At(90), 'the standard curve: 75% near 40 mm Hg, 50% near 27');
}
/* ---- circumstances ---- */
{
  const r = C.compute(withRaw({ hr: '98' }), { ctx: { ecmo: true, pressor: true, ppv: true, tr: true, shunt: true, mcs: true, hifio2: true, af: true } });
  ok(/VA ECMO this is not the heart’s output/.test(r.by.co.here.join(' ')) && /Impella or an LVAD/.test(r.by.co.here.join(' ')) && /shunt/.test(r.by.co.here.join(' ')) && /high FiO2/.test(r.by.co.here.join(' ')), 'the output on ECMO, on a pump, with a shunt, on a high FiO2');
  ok(/partly the dose/.test(r.by.svr.here.join(' ')) && /total systemic flow/.test(r.by.svr.here.join(' ')) && /airway pressure/.test(r.by.papi.here.join(' ')) && /tricuspid/.test(r.by.papi.here.join(' ')) && /zone 3/.test(r.by.pvr.here.join(' ')) && /the drug’s/.test(r.by.cpo.here.join(' ')) && /no beat actually has/.test(r.by.sv.here.join(' ')), 'each circumstance lands on the numbers it affects');
  const plain = C.compute(withRaw({ hr: '98' }));
  ok(plain.by.svr.here.length === 0 && plain.by.sv.here.length === 0 && C.CONTEXT.length === 8, 'and on none when nothing is ticked');
}
/* ---- a second measurement ---- */
{
  const r = C.compute(withRaw({ tdco: '3.4' }));
  ok(kinds(r).indexOf('warn:fick-td') >= 0 && /cannot both be right/.test(r.checks.filter(c => c.k === 'fick-td')[0].t) && r.by.co.text === '4.9' && r.by.co.alts.some(a => /Thermodilution/.test(a.label) && a.text === '3.4 L/min'), 'Fick 4.9 against thermodilution 3.4: flagged, both shown');
  const t = C.compute(withRaw({ tdco: '3.4' }), { co: 'td' });
  ok(t.by.co.value === 3.4 && t.by.co.sub === 'thermodilution' && t.by.co.range === null && near(t.by.svr.value, (72 - 14) / 3.4 * 80) && near(t.by.pvr.value, 10 / 3.4) && /three injections/.test(t.by.co.limit) && t.by.co.alts.some(a => /^Fick/.test(a.label)) && /thermodilution CO/.test(C.note(t)), 'the derived numbers can run on the thermodilution value instead');
  ok(C.compute(BASE, { co: 'td' }).by.co.text === '4.9', 'asking for thermodilution without typing one falls back to the Fick');
  ok(kinds(C.compute(withRaw({ tdco: '4.6' }))).indexOf('warn:fick-td') < 0, 'within 20% they are left alone');
  const nf = C.compute(withRaw({ svo2: '', tdco: '3.4' }));
  ok(nf.by.co.value === null && /thermodilution value of 3\.4 L\/min is typed/.test(nf.by.co.hint) && C.compute(withRaw({ svo2: '', tdco: '3.4' }), { co: 'td' }).by.svr.value > 0 && C.compute(BASE).by.co.hint === '', 'no Fick but a thermodilution value typed: the row says how to use it');
  const en = C.compute(withRaw({ hb: '110', svo2: '0.58' }));
  ok(en.checks.some(c => c.t === 'Haemoglobin is in g/dL here: 110 g/L is 11.0.') && en.checks.some(c => c.t === 'ScvO2 or SvO2: enter a percentage: 0.58 is 58.'), 'a rejected entry is named once');
}
/* ---- blood pressure and a measured mean ---- */
{
  const r = C.compute(Object.assign({}, BASE, { map: '', sbp: '96', dbp: '60' }));
  ok(r.mapCalc && near(r.x.map, 72) && kinds(r).indexOf('note:map-calc') >= 0 && r.by.svr.value !== null && /worked out from 96\/60/.test(r.by.svr.here.join(' ')), 'no MAP typed: one is worked out from the blood pressure and said to be');
  ok(kinds(C.compute(withRaw({ sbp: '150', dbp: '90' }))).indexOf('warn:map-fit') >= 0 && kinds(C.compute(withRaw({ sbp: '60', dbp: '70' }))).indexOf('bad:bp-order') >= 0, 'a MAP that does not fit the blood pressure; a diastolic above the systolic');
  const m = C.compute(withRaw({ mpapm: '36' }));
  ok(m.by.mpap.value === 36 && near(m.by.pvr.value, 14 / m.by.co.value) && /measured/.test(m.by.pvr.formula) && m.by.mpap.alts.some(a => /Worked out from 48\/24/.test(a.label)) && /mPAP 36,/.test(C.note(m)) && /mPAP 32 \(calc\)/.test(C.note(C.compute(BASE))), 'a measured mean PA replaces the calculated one and the note says which');
  ok(kinds(C.compute(withRaw({ mpapm: '50' }))).indexOf('bad:mpap-order') >= 0 && C.compute(withRaw({ mpapm: '50' })).by.mpap.value === 32, 'a measured mean outside systolic and diastolic is not used');
}
/* ---- thresholds are read from the number as displayed ---- */
{
  const at = (o, id) => { const r = C.compute(withRaw(o)); return r.by[id]; };
  ok(at({ svo2: '45' }, 'ci').st === 'low' && at({ svo2: '45' }, 'ci').sev === 2 && at({ svo2: '70' }, 'ci').st === 'ok' && at({ svo2: '80' }, 'ci').st === 'high', 'the index: low, normal, high');
  ok(at({ map: '110', cvp: '4', svo2: '40' }, 'svr').sev === 2 && at({ map: '55', svo2: '72' }, 'svr').st === 'low', 'SVR above 1,600 and below 800');
  ok(at({ pas: '30', pad: '22', cvp: '16' }, 'papi').sev === 2 && at({ pas: '60', pad: '20', cvp: '10' }, 'papi').st === 'ok', 'PAPi below 0.9 and above 1.85');
  ok(at({ map: '58', svo2: '40' }, 'cpo').st === 'low' && at({ pcwp: '8', svo2: '40' }, 'pvr').sev === 2 && at({ pcwp: '20' }, 'pvr').st === 'high', 'cardiac power below 0.6; PVR above 2 and above 3');
  ok(Object.keys(C.DEF).every(id => { const D = C.DEF[id]; return !D.gauge || (D.gauge[0] < D.gauge[3] && (D.gauge[1] === null || D.gauge[1] >= D.gauge[0]) && (D.gauge[2] === null || D.gauge[2] <= D.gauge[3])); }), 'every bar has a sensible axis and band');
  const edge = C.compute(withRaw({ svo2: '53.2' }));
  ok(edge.by.ci.text === '2.2' ? edge.by.ci.say !== 'below 2.2' : true, 'a value that displays as 2.2 is not called below 2.2');
}
/* ---- the reading ---- */
{
  const q = (o, opt) => C.compute(withRaw(o), Object.assign({ vo2: 'measured' }, opt || {})).read;
  ok(q({ vo2m: '160', pcwp: '26', cvp: '16' }).forrester === 'IV' && q({ vo2m: '160', pcwp: '12', cvp: '5' }).forrester === 'III' && q({ vo2m: '330', pcwp: '26' }).forrester === 'II' && q({ vo2m: '330', pcwp: '12', cvp: '5' }).forrester === 'I', 'the four Forrester quadrants');
  ok(q({ vo2m: '160', pcwp: '26', cvp: '16' }).cong === 'both' && q({ vo2m: '250', pcwp: '26', cvp: '8' }).cong === 'left' && q({ vo2m: '250', pcwp: '10', cvp: '16', pas: '50', pad: '22' }).cong === 'right' && q({ vo2m: '250', pcwp: '10', cvp: '6' }).cong === 'none', 'congestion on neither, either or both sides (18 and 12)');
  ok(q({ vo2m: '250', pas: '26', pad: '10', pcwp: '9', cvp: '5' }).ph === 'none' && q({ vo2m: '250', pas: '70', pad: '34', pcwp: '10', cvp: '8' }).ph === 'pre' && q({ vo2m: '300', pas: '50', pad: '28', pcwp: '26', cvp: '10' }).ph === 'ipc' && q({ vo2m: '200', pas: '70', pad: '38', pcwp: '24', cvp: '10' }).ph === 'cpc' && q({ vo2m: '420', hb: '8', pas: '34', pad: '16', pcwp: '12', cvp: '5', svo2: '70' }).ph === 'unclassified', 'the pulmonary hypertension classes by the 2022 numbers');
  const rv = C.compute(withRaw({ pas: '32', pad: '22', cvp: '18', pcwp: '14' }));
  ok(rv.read.lines.some(l => l.k === 'rv' && l.sev === 2) && rv.read.cong === 'right', 'a right-ventricular pattern is read out');
  ok(C.compute(BASE, { venous: 'mv' }).read.lines.every(l => typeof l.t === 'string' && l.t.length > 20 && /[.]$/.test(l.t)), 'every line of the reading is a sentence');
}
/* ---- the limits ---- */
ok(Object.keys(C.DEF).length === 26 && Object.keys(C.DEF).every(id => C.LIM[id] && C.LIM[id].head.length > 30 && /[.]$/.test(C.LIM[id].head) && C.LIM[id].list.length >= 1 && C.LIM[id].list.every(t => t.length > 30 && /[.)]$/.test(t))) && Object.keys(C.LIM).every(id => C.DEF[id]), 'every one of the twenty-six numbers has a headline limit and a list');
ok(C.ORDER.slice().sort().join() === Object.keys(C.DEF).sort().join() && C.GROUPS.length === 5 && Object.keys(C.DEF).every(id => C.GROUPS.some(g => g.id === C.DEF[id].group)), 'every number is in the order and in a group');
{
  const r = C.compute(BASE);
  ok(r.rows.every(x => x.limit === C.LIM[x.id].head && x.limits === C.LIM[x.id].list && x.formula && x.name && x.abbr), 'each row carries its formula and its limits');
  ok(/12,000/.test(C.LIM.co.list.join(' ')) && /38%/.test(C.LIM.co.list.join(' ')) && /2\.6 mL\/kg\/min/.test(C.LIM.vo2.list.join(' ')) && /17–25%/.test(C.LIM.vo2.list.join(' ')) && /5 points above/.test(C.LIM.avd.list.join(' ')) && /0\.53 W/.test(C.LIM.cpo.list.join(' ')) && /541/.test(C.LIM.cpo.list.join(' ')) && /0\.9/.test(C.LIM.papi.list.join(' ')) && /1\.85/.test(C.LIM.papi.list.join(' ')), 'the limits quote the studies’ own figures');
  ok(C.SOURCES.length >= 12 && /Opotowsky/.test(C.SOURCES.join(' ')) && /Narang/.test(C.SOURCES.join(' ')) && /Byrne/.test(C.SOURCES.join(' ')) && /Fincke/.test(C.SOURCES.join(' ')) && /Humbert/.test(C.SOURCES.join(' ')), 'and the sources are listed');
}
/* ---- the pages ---- */
{
  const T = H.topics;
  ok(T.hemo_calc && T.hemo_limits && T.hemo_calc.blocks.some(b => b.widget === 'hemocalc') && T.hemo_calc.blocks.some(b => b.src) && Object.keys(T).length === 12, 'two pages join the haemodynamics area: twelve topics');
  ok(H.groups.filter(g => g.title === 'The numbers')[0].ids.join() === 'hemo_numbers,hemo_calc,hemo_limits,hemo_pulm', 'beside the derived numbers');
  const rowsN = T.hemo_limits.blocks.filter(b => b.table).reduce((n, b) => n + b.table.rows.length, 0);
  ok(rowsN === 26 && T.hemo_limits.blocks.filter(b => b.table).every(b => b.table.head.length === 4 && b.table.rows.every(r => r.length === 4 && r.every(c => c.length > 0))), 'the reading page tabulates all twenty-six with formula, normal range and main limit');
  ok(T.hemo_limits.blocks.filter(b => b.ul).length >= 14 && T.hemo_limits.blocks.some(b => b.h === 'Before the arithmetic') && T.hemo_limits.blocks.some(b => b.go && b.go[0][0] === 'hemo_calc') && T.hemo_calc.blocks.some(b => b.go && b.go.some(g => g[0] === 'hemo_limits')) && T.hemo_numbers.blocks.some(b => b.go && b.go[0][0] === 'hemo_calc'), 'with the full lists, the bedside checks, and ways between the calculator, this page and the derived numbers');
  ok(C.normalFull('co') === '4–8 L/min' && C.normalFull('pvr') === '2 Wood units or less' && C.normalFull('o2er') === '22–30%' && C.normalFull('cpo') === '0.6 W or more (about 1 at rest)' && C.normalFull('papi') === 'above 2 (usually 3–8)' && C.normalFull('dpg') === 'under 7 mm Hg' && C.normalFull('bsa') === '' && C.normalFull('ppp') === '25% or more', 'normal ranges read with their units');
  ok(/33–47 mL\/m²/.test(JSON.stringify(T.hemo_numbers.blocks)) && /'5–10'|"5–10"/.test(JSON.stringify(T.hemo_numbers.blocks)) && C.DEF.svi.normal === '33–47' && C.DEF.rvswi.normal === '5–10', 'the derived-numbers page and the calculator quote the same normal ranges');
  ok(/nowhere to type a name/.test(JSON.stringify(T.hemo_calc.blocks)) && /not a medical device/.test(JSON.stringify(T.hemo_calc.blocks)), 'the calculator page says what it is and is not');
}
/* ---- the note ---- */
{
  const s = C.note(C.compute(BASE));
  ok(/^Hemos \(estimated Fick, VO2 287 mL\/min by 3\.5 mL\/kg\/min; venous sample ScvO2\): CO 4\.9 L\/min, CI 2\.5 L\/min\/m² \(BSA 2\.01 m²\), SVR 938 dyn·s\/cm⁵, PAPi 1\.71, CPO 0\.79 W, PVR 2\.0 WU\./.test(s) && /CI 1\.8–3\.1 if the VO2 is 25% off\./.test(s), 'the note: the method, the seven in the chart’s order, and the band');
  ok(/—/.test(C.note(C.compute({}))) && /Entries to check: 1/.test(C.note(C.compute(withRaw({ hb: '110' })))) && /SvO2\)/.test(C.note(C.compute(BASE, { venous: 'mv' }))) && /direct Fick, measured VO2 210/.test(C.note(C.compute(withRaw({ vo2m: '210' }), { vo2: 'measured' }))), 'the note with gaps, with a rejected entry, with a mixed venous sample, with a measured VO2');
}
/* ---- two sets ---- */
{
  const a = C.compute(BASE), b = C.compute(withRaw({ svo2: '61', cvp: '10', pcwp: '16', map: '76' })), d = C.diff(a, b);
  ok(d.co && d.co.from === '4.9' && d.co.to === '5.4' && d.co.pct > 0 && d.co.noise && !d.papi.noise && d.papi.pct > 0 && d.bsa.same && d.pvr.to !== d.pvr.from, 'an earlier and a later set: what moved, and an output change under 15% marked as within the method’s noise');
  const c = C.compute(withRaw({ svo2: '70' })), d2 = C.diff(a, c);
  ok(!d2.co.noise && d2.co.pct > 15 && d2.svr.pct < 0 && !d2.svr.noise, 'a real change is not called noise');
  ok(Object.keys(C.diff(a, C.compute({}))).length === 0, 'nothing to compare against an empty sheet');
}
/* ---- the examples ---- */
{
  const ex = {}; C.EXAMPLES.forEach(E => { const L = C.example(E.id); ex[E.id] = { L: L, r: C.compute(L.raw, { venous: L.venous, ctx: L.ctx }) }; });
  ok(C.EXAMPLES.length === 10 && C.EXAMPLES.every(E => ex[E.id].r.checks.filter(c => c.level === 'bad').length === 0 && ex[E.id].r.by.co.value > 0 && ex[E.id].L.truth.co > 0 && ex[E.id].L.say.length > 20), 'ten example patients from the lab, each a clean sheet with the model’s truth beside it');
  const sheetCi = (id) => ex[id].r.by.ci.value, trueCi = (id) => ex[id].L.truth.co / ex[id].L.truth.bsa;
  ok(Math.abs(sheetCi('normal') - trueCi('normal')) / trueCi('normal') < 0.15 && Math.abs(sheetCi('lv') - trueCi('lv')) / trueCi('lv') < 0.15, 'where the assumption holds the sheet is within 15% of the truth');
  ok(trueCi('lvsed') < 2.2 && sheetCi('lvsed') >= 2.5 && ex.lvsed.r.read.forrester === 'II' && ex.lv.r.read.forrester === 'IV', 'sedated and paralysed: the true index is under 2.2 and the sheet reads 2.5 or more, moving the patient from cold to warm');
  ok(sheetCi('lvcv') > sheetCi('lv') * 1.15 && ex.lvcv.L.venous === 'cv' && +ex.lvcv.L.raw.svo2 === ex.lvcv.L.truth.svo2 + 7, 'a central venous sample 7 points above the mixed venous one: the sheet reads 15% or more higher');
  ok(sheetCi('obese') > trueCi('obese') * 1.3 && ex.obese.r.checks.some(c => c.k === 'bmi-high'), 'at 129 kg the per-kilogram assumption overestimates by a third or more, and is queried');
  ok(sheetCi('sepsis') < trueCi('sepsis') * 0.9, 'febrile sepsis: the sheet under-reads a high output');
  ok(ex.ecmodist.L.ctx.ecmo === true && ex.ecmodist.L.truth.pump > 3 && /VA ECMO/.test(ex.ecmodist.r.by.co.here.join(' ')) && ex.lvsed.L.ctx.ppv === true && !ex.normal.L.ctx.ecmo, 'the ECMO example arrives with its circumstance ticked');
  ok(ex.pah.r.read.ph === 'pre' && ex.hfpef.r.read.ph === 'ipc' && ex.pah.r.by.pvr.value > 10, 'the pulmonary hypertension examples classify as intended');
  ok(C.example('nope') === null, 'an unknown example is nothing');
}
/* ---- formatting ---- */
ok(C.fmt(1234.4, 0) === '1,234' && C.fmt(938.2, 0) === '938' && C.fmt(-0.02, 1) === '0.0' && C.fmt(null) === '—' && C.fmt(NaN) === '—' && C.fmt(1 / 0) === '—' && C.fmt(12345.67, 1) === '12,345.7' && C.fmt(2.049, 1) === '2.0', 'numbers are grouped in thousands; nothing prints as −0, NaN or Infinity');

console.log('hemocalc ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
