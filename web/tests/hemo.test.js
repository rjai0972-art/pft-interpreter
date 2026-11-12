// Haemodynamics: the circulation model, the presets, the interventions, the waveforms and the scenarios, in node
require('../src/physio.js'); const H = require('../src/hemo.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, t) => Math.abs(a - b) <= t;
const P = (id) => H.preset(id);
const run = (id, over) => H.run(Object.assign({}, P(id).p, over || {}));
const after = (id, tx) => H.run(H.apply(P(id).p, tx));
// ---- content
ok(Object.keys(H.topics).length === 10 && H.groups.length === 4 && H.groups.reduce((n, g) => n + g.ids.length, 0) === 10, 'ten topics in four groups');
ok(['hemo_intro', 'hemo_swan', 'hemo_determinants', 'hemo_numbers', 'hemo_pulm', 'hemo_shock', 'hemo_rv', 'hemo_echo', 'hemo_lab', 'hemo_cases'].every(id => H.topics[id] && H.topics[id].blocks.length > 0), 'every topic has blocks');
ok(H.topics.hemo_swan.blocks.some(b => b.widget === 'hemoswan') && H.topics.hemo_lab.blocks.some(b => b.widget === 'hemolab') && H.topics.hemo_cases.blocks.some(b => b.widget === 'hemocases'), 'the three widgets sit in their topics');
const txt = JSON.stringify(H.topics);
ok(/TPG/.test(txt) && /DPG/.test(txt) && /PAPi/.test(txt) && /TAPSE/.test(txt) && /Cardiac power/.test(txt) && /SCAI/.test(txt) && /Forrester/.test(txt) && /ESCAPE/.test(txt) && /Guyton/.test(txt) && /Ees/.test(txt), 'the gradients, the indices, the staging and the physiology are in the text');
ok(H.PRESETS.length === 15 && H.PRESETS.every(pr => P(pr.id) && pr.note && pr.title), 'fifteen presets, each with a note');
ok(H.SCENARIOS.length === 11 && H.SCENARIOS.every(sc => H.PRESETS.some(p => p.id === sc.preset) && sc.who.length > 80 && sc.a1.length === 4 && sc.a2.length === 4 && sc.a1.filter(a => a[2] === 'best').length === 1 && sc.a2.filter(a => a[1] === 'best').length === 1), 'eleven scenarios on existing presets, four options each, exactly one best');
ok(H.SCENARIOS.every(sc => sc.a2.every(a => H.INTERVENTIONS.some(it => it[0] === a[0]) && a[2].length > 20) && sc.a1.every(a => a[3].length > 15)), 'every move is a real intervention with a reason');
// ---- the normal circulation
const n = run('normal');
ok(near(n.rap, 3, 2) && near(n.pas, 23, 4) && near(n.pad, 10, 3) && near(n.paop, 8, 3) && near(n.map, 94, 8) && near(n.ci, 3.0, 0.4) && near(n.svrDyn, 1280, 250) && n.pvr < 2 && near(n.svo2, 0.73, 0.05) && n.lvef > 0.55 && n.tapse > 20, 'normal: RA 3, PA 23/10, wedge 8, MAP 94, CI 3, SVR ~1,300, SvO2 73%, EF > 55%, TAPSE > 20');
ok(n.signature.id === 'ok' && n.forrester.quadrant.indexOf('I:') === 0 && /no pulmonary hypertension/.test(n.ph) && n.flags.length === 0, 'normal: perfusing, Forrester I, no PH, no flags');
ok(near(n.tpg, n.mpap - n.paop, 0.01) && near(n.dpg, n.pad - n.paop, 0.01) && near(n.papi, (n.pas - n.pad) / n.rap, 0.05) && near(n.cpo, n.map * n.co / 451, 0.01) && near(n.svrDyn, n.svr * 80, 0.01), 'TPG, DPG, PAPi, CPO and the unit conversion are computed as defined');
ok(near(n.do2, n.co * (1.34 * 13 * 0.97 + 0.27) * 10, 2) && n.do2vo2 > 3.5, 'DO2 by Fick, DO2:VO2 about 4 at rest');
// ---- the determinants move the right way
ok(run('normal', { pms: 13 }).co > n.co && run('normal', { pms: 13 }).paop > n.paop && run('normal', { pms: 5 }).co < n.co, 'volume (Pms) raises the output and the wedge; less lowers both');
ok(run('normal', { lvContr: 0.5 }).ci < n.ci && run('normal', { lvContr: 0.5 }).paop > n.paop && run('normal', { lvContr: 0.5 }).lvef < n.lvef, 'less LV contractility: output down, wedge up, EF down');
ok(run('normal', { svr: 28 }).map > n.map && run('normal', { svr: 28 }).co < n.co && run('normal', { svr: 8 }).map < n.map, 'afterload: more resistance, more pressure, less flow');
ok(run('normal', { pvr: 6 }).mpap > n.mpap + 8 && run('normal', { pvr: 6 }).rap > n.rap && run('normal', { pvr: 6 }).paop <= n.paop + 1 && run('normal', { pvr: 6 }).tpg > 12, 'a high PVR: PA pressure and RA up, wedge not, TPG above 12');
ok(run('normal', { lvStiff: 3 }).paop > n.paop + 6 && run('normal', { lvStiff: 3 }).lvef >= n.lvef - 0.1, 'a stiff LV: a higher wedge with a kept ejection fraction');
ok(run('normal', { hr: 120 }).co > n.co && run('normal', { hr: 45 }).co < n.co, 'rate is a determinant of output');
ok(run('normal', { hb: 7 }).svo2 < n.svo2 && run('normal', { vo2: 400 }).svo2 < n.svo2 && run('normal', { sao2: 0.8 }).svo2 < n.svo2, 'SvO2 falls with anaemia, demand and hypoxaemia');
ok(run('normal', { vent: 'ppv', peep: 10 }).paop > n.paop && run('normal', { vent: 'ppv', peep: 10 }).co < n.co, 'PEEP: the catheter reads a share of it, the venous return falls');
ok(run('normal', { mr: 3 }).paopV - run('normal', { mr: 3 }).paop > 10 && run('normal', { mr: 3 }).regurgMr > 10, 'mitral regurgitation: a big v wave and a regurgitant volume');
ok(run('normal', { pperi: 12, pms: 16 }).rap > 10 && Math.abs(run('normal', { pperi: 12, pms: 16 }).rap - run('normal', { pperi: 12, pms: 16 }).paop) < 5 && run('normal', { pperi: 12, pms: 16 }).ci < n.ci - 0.8, 'pericardial pressure: the diastolic pressures equalise and the output falls');
// ---- the presets carry their signatures
const sig = {}; H.PRESETS.forEach(pr => { sig[pr.id] = run(pr.id).signature.id; });
ok(sig.hypo === 'hypo' && sig.sepsis === 'distributive' && sig.septiccm === 'mixed' && sig.lv === 'lv' && sig.rvmi === 'rv' && sig.pe === 'obstructive' && sig.tamponade === 'tamponade' && sig.constrict === 'tamponade' && sig.pah === 'obstructive' && sig.hfpef === 'postcap' && sig.mr === 'lv' && sig.ecmodist === 'ecmodist' && sig.hyper === 'distributive', 'each shock preset is named for what it is: ' + JSON.stringify(sig));
const lv = run('lv'), rv = run('rvmi'), pe = run('pe'), tm = run('tamponade'), hy = run('hypo'), se = run('sepsis'), ph = run('pah'), hf = run('hfpef'), mr = run('mr'), ed = run('ecmodist');
ok(lv.ci < 2.2 && lv.paop > 18 && lv.cpo <= 0.65 && /IV/.test(lv.forrester.quadrant) && lv.lvef < 0.25, 'LV shock: cold and wet, CPO ≤ 0.65, EF under 25%');
ok(rv.rap >= 8 && rv.paop < 8 && rv.raPaop > 0.86 && rv.papi < 1.5 && rv.rvlv > 1 && rv.tapse < 17 && rv.ci < 2.2, 'RV infarct: RA rivals the wedge, PAPi low, a dilated RV, TAPSE down');
ok(pe.pvr > 5 && pe.paop < 8 && pe.mpap > 20 && pe.pas < 50 && pe.rap >= 6 && pe.tapse < 17 && pe.rvlv > 1 && pe.tapsePasp < 0.4, 'PE: pre-capillary, the untrained RV cannot make more than ~ 40–50 systolic, uncoupled');
ok(tm.rap > 12 && Math.abs(tm.rap - tm.paop) < 5 && Math.abs(tm.rap - tm.pad) < 5 && tm.ci < 2.0 && tm.pp < 20, 'tamponade: equalised at ~ 16, a low output, a narrow pulse');
ok(hy.rap <= 2 && hy.paop <= 4 && hy.ci < 2.0 && hy.svrDyn > 1600 && hy.svo2 < 0.5, 'haemorrhage: empty, low output, clamped, extracting');
ok(se.ci > 4 && se.svrDyn < 600 && se.svo2 > 0.7 && se.map < 65 && se.pp > 40, 'warm sepsis: high output, vasoplegia, high SvO2, wide pulse pressure');
ok(ph.pas > 70 && ph.pvr > 12 && ph.paop < 10 && ph.rap > 10 && ph.ci < 2.0 && /pre-capillary/.test(ph.ph), 'decompensated PAH: a very high PA pressure only a trained RV can make, a normal wedge');
ok(hf.paop > 18 && hf.ci >= 2.2 && hf.lvef > 0.5 && hf.mpap > 20 && hf.dpg < 7 && /post-capillary/.test(hf.ph), 'HFpEF: high wedge, kept output and EF, post-capillary PH, DPG under 7');
ok(mr.paopV - mr.paop > 10 && mr.paop > 25 && mr.rap < mr.paop / 2, 'acute MR: giant v waves, the right side spared');
ok(ed.pp < 10 && ed.paop > 25 && ed.lvef < 0.05 && ed.flags.some(f => f.k === 'pp'), 'LV distension on VA ECMO: no pulse pressure, a high wedge, the flag');
// ---- the flags fire at the thresholds
const fk = (o) => o.flags.map(f => f.k);
ok(fk(lv).indexOf('ci') >= 0 && fk(lv).indexOf('paop') >= 0 && fk(rv).indexOf('ratio') >= 0 && fk(rv).indexOf('tapse') >= 0 && fk(pe).indexOf('ph') >= 0 && fk(tm).indexOf('equal') >= 0 && fk(se).indexOf('svr') >= 0 && fk(mr).indexOf('vwave') >= 0, 'the threshold flags: CI, PAOP, RAP:PAOP, TAPSE, PH, equalisation, SVR, v wave');
// ---- the interventions move the numbers the way the pages say
ok(after('lv', 'fluid').paop > lv.paop && after('lv', 'fluid').ci <= lv.ci + 0.15, 'LV shock + fluid: the wedge rises, the output barely moves');
ok(after('lv', 'dobut').ci > lv.ci + 0.4 && after('lv', 'dobut').paop < lv.paop - 5, 'LV shock + dobutamine: output up, wedge down');
ok(after('lv', 'norepi').map > lv.map + 8 && after('lv', 'norepi').cpo > lv.cpo, 'LV shock + norepinephrine: pressure and power up');
ok(after('lv', 'nitro').paop < lv.paop && after('lv', 'nitro').map < lv.map, 'LV shock + nitroprusside: wedge and pressure down');
ok(after('rvmi', 'fluid').rap > rv.rap && after('rvmi', 'fluid').ci >= rv.ci && after('rvmi', 'ntg').map < rv.map - 8, 'RV infarct: fluid fills it, nitrates empty it');
ok(after('pe', 'lysis').pvr < pe.pvr / 2 && after('pe', 'lysis').ci > pe.ci + 0.5 && after('pe', 'ppv').ci < pe.ci && after('pe', 'fluid').rap > pe.rap, 'PE: lysis opens the bed; positive pressure and volume hurt');
ok(after('tamponade', 'tap').ci > tm.ci + 1.5 && after('tamponade', 'tap').rap < 8 && after('tamponade', 'ppv').ci < tm.ci && after('tamponade', 'diurese').ci < tm.ci, 'tamponade: the tap restores the output; PPV and diuresis collapse it');
ok(after('hypo', 'blood').ci > hy.ci + 0.3 && after('hypo', 'blood').svo2 > hy.svo2 + 0.1 && after('hypo', 'dobut').ci < after('hypo', 'blood').ci, 'haemorrhage: blood beats an inotrope');
ok(after('sepsis', 'norepi').map > 65 && after('sepsis', 'dobut').map < se.map, 'sepsis: norepinephrine makes the pressure, dobutamine drops it');
ok(after('septiccm', 'dobut').ci > run('septiccm').ci + 0.8 && after('septiccm', 'fluid').paop > run('septiccm').paop, 'septic cardiomyopathy: the inotrope, not more fluid');
ok(after('mr', 'nitro').paop < mr.paop - 5 && after('mr', 'nitro').regurgMr < mr.regurgMr && after('mr', 'norepi').paop > mr.paop + 3, 'acute MR: afterload reduction lowers the wedge and the regurgitation; a constrictor raises both');
ok(after('pah', 'ino').pvr < ph.pvr && after('pah', 'ino').ci > ph.ci && after('pah', 'fluid').rap > ph.rap && after('pah', 'ppv').ci < ph.ci, 'PAH: pulmonary vasodilation helps; volume and positive pressure do not');
ok(after('hfpef', 'diurese').paop < hf.paop - 3 && after('hfpef', 'diurese').ci > 2.2, 'HFpEF: diuresis lowers the wedge with the output kept');
ok(after('ecmodist', 'impella').paop < ed.paop - 15 && after('ecmodist', 'impella').p.ecmo < 4.5 && after('ecmodist', 'ecmodown').pp > ed.pp && after('ecmodist', 'fluid').paop > ed.paop, 'the distended ventricle: the Impella vents it, less flow lets it eject, volume makes it worse');
ok(after('normal', 'iabp').p.iabp === 1 && after('normal', 'ecmo').p.ecmo === 4 && H.apply(H.apply(P('normal').p, 'ecmo'), 'ecmo').ecmo === 0, 'the devices toggle');
ok(H.apply(P('normal').p, 'nothing').hr === 75, 'an unknown intervention is a no-op');
// ---- the waveforms
const tr = (o, pos) => { const v = []; for (let i = 0; i < 100; i++) v.push(H.trace(o, pos, i / 100)); return v; };
const mx = (v) => Math.max.apply(null, v), mn = (v) => Math.min.apply(null, v);
ok(near(mx(tr(n, 'rv')), n.rvsys, 1.5) && mn(tr(n, 'rv')) < 4 && near(mx(tr(n, 'pa')), n.pas, 1.5) && near(mn(tr(n, 'pa')), n.pad, 1.5) && near(mx(tr(n, 'art')), n.sbp, 1.5) && near(mn(tr(n, 'art')), n.dbp, 1.5), 'RV, PA and arterial traces peak and trough at the reported numbers');
ok(near(tr(n, 'ra').reduce((a, b) => a + b, 0) / 100, n.rap, 1.5) && near(tr(n, 'paop').reduce((a, b) => a + b, 0) / 100, n.paop, 1.5), 'the RA and wedge traces average to their means');
ok(mx(tr(mr, 'paop')) > mr.paop + 12 && mx(tr(run('normal', { tr: 3 }), 'ra')) > n.rap + 8, 'big v waves on the wedge in MR and on the RA in TR');
const WVt = require('../src/waves.js');
const yDepth = (o) => { const v = tr(o, 'ra'), tmg = WVt.timing(Math.round(o.p.hr)), iV = Math.round((tmg.pep + tmg.lvet + 0.05) / tmg.T * 100), n2 = Math.round(0.2 / tmg.T * 100); let lo = 1e9; for (let i = iV; i <= iV + n2; i++) lo = Math.min(lo, v[i % 100]); return v[iV % 100] - lo; };
ok(yDepth(tm) < 1.2 && yDepth(run('constrict')) > 6 && yDepth(n) > 1.5 && yDepth(n) < 6 && yDepth(run('constrict')) > yDepth(n) + 3, 'no y descent in tamponade (' + yDepth(tm).toFixed(1) + '), a deep one in constriction (' + yDepth(run('constrict')).toFixed(1) + '), an ordinary one normally (' + yDepth(n).toFixed(1) + ')');
{ const pa = tr(n, 'pa'), rv = tr(n, 'rv'), art = tr(n, 'art'), iPk = pa.indexOf(mx(pa)), iMn = pa.indexOf(mn(pa)); let jump = 0; for (let i = 1; i < 100; i++) jump = Math.max(jump, Math.abs(pa[i] - pa[i - 1]), Math.abs(art[i] - art[i - 1]) / 4);
  ok(jump < (n.pas - n.pad) * 0.3 && pa[(iPk + 30) % 100] > n.pad + 0.25 * (n.pas - n.pad) && rv[70] < rv[95] && pa[70] > pa[95], 'v8.8: the pulmonary artery beat has no cliff at the end of systole; its diastole falls while the right ventricle’s rises'); }
ok(mx(tr(n, 'ecg')) > 8 && mx(tr(n, 'ecg').slice(80, 90)) > 0.5 && mx(tr(n, 'ecg').slice(80, 90)) < 3, 'the ECG has a QRS and a P wave');
ok(mx(tr(run('normal', { iabp: 1 }), 'art').slice(50, 75)) > n.sbp - 5, 'the balloon pump augments diastole');
ok(H.breath(n.p, 0.25) < 0 && H.breath(Object.assign({}, n.p, { vent: 'ppv', peep: 5 }), 0.25) > 0, 'a spontaneous breath pulls the baseline down, a ventilator pushes it up');
// ---- the scenarios' best moves improve the patient
H.SCENARIOS.forEach(sc => {
  const o0 = H.run(P(sc.preset).p), best = sc.a2.filter(a => a[1] === 'best')[0], o1 = H.run(H.apply(P(sc.preset).p, best[0]));
  const better = o1.cpo > o0.cpo - 0.02 || o1.paop < o0.paop - 2 || o1.pvr < o0.pvr - 1 || o1.svo2 > o0.svo2;
  ok(better, sc.id + ': the best move (' + best[0] + ') improves something: CPO ' + o0.cpo.toFixed(2) + '→' + o1.cpo.toFixed(2) + ', W ' + o0.paop.toFixed(0) + '→' + o1.paop.toFixed(0));
});
console.log('hemo ' + pass + ' passed, ' + fail + ' failed');
