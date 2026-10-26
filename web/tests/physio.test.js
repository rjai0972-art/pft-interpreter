// the foundations: the heart–lung model and the physiology helpers, in node
const H = require('../src/heartlung.js'), P = require('../src/physio.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
// ---- static mechanics
const n = H.run({});
ok(near(n.br.frc, 37, 4), 'FRC about 35–40% VC: ' + n.br.frc.toFixed(1));
ok(near(n.br.cl, 200, 40) && near(n.br.ccw, 160, 40) && near(n.br.crs, 90, 20), 'compliances near 200 / 160 / 90 mL/cm H2O: ' + [n.br.cl, n.br.ccw, n.br.crs].map(x => x.toFixed(0)).join('/'));
ok(near(H.lungPpl(n.br.frc, n.p), H.cwPpl(n.br.frc, n.p), 0.05) && near(H.lungPpl(n.br.frc, n.p), -5, 1.5), 'the curves cross at FRC with a pleural pressure near −5: ' + H.lungPpl(n.br.frc, n.p).toFixed(1));
ok(H.ptpOf(99, n.p) > 28 && H.ptpOf(99, n.p) < 60, 'TLC needs a transpulmonary pressure of 30-odd cm H2O: ' + H.ptpOf(99, n.p).toFixed(0));
ok(near(H.rsPaw(n.br.frc, n.p), 0, 0.1), 'the respiratory system is at atmospheric pressure at FRC');
ok(n.br.autoPeep < 0.2 && near(n.br.vee, n.br.frc, 0.5), 'normal breathing returns to FRC with no auto-PEEP');
ok(n.br.pts[0].ppl < -4 && n.br.pts[60].ppl < n.br.pts[0].ppl - 1.5, 'a spontaneous breath lowers the pleural pressure: ' + n.br.pts[0].ppl.toFixed(1) + ' → ' + n.br.pts[60].ppl.toFixed(1));
ok(near(n.br.pts[60].palv, 0, 0.2), 'alveolar pressure is back to zero at end-inspiration');
ok(n.br.wEl > 0.1 && n.br.wEl < 0.3 && n.br.wRes > 0.02 && n.br.wRes < 0.12, 'a quiet breath costs about 0.2 J, mostly elastic: ' + n.br.wEl.toFixed(2) + ' + ' + n.br.wRes.toFixed(2));
// ---- the circulation at rest
ok(near(n.rest.co, 5, 0.6) && near(n.rest.pra, 2, 1.5), 'resting output near 5 L/min at a right atrial pressure near 2: ' + n.rest.co.toFixed(2) + ' / ' + n.rest.pra.toFixed(1));
ok(n.top.co > n.rest.co && n.top.pra < n.rest.pra && n.top.ptm > n.rest.ptm, 'spontaneous inspiration raises venous return and the transmural pressure and lowers the right atrial pressure');
ok(n.coVar < 0.15, 'the swing of output over a quiet breath is modest: ' + (n.coVar * 100).toFixed(0) + '%');
// ---- disease
const copd = H.run(H.PRESETS.filter(x => x.id === 'copd')[0].set);
ok(copd.br.frc > n.br.frc + 3 && copd.br.vee > copd.br.frc + 3 && copd.br.autoPeep > 1 && copd.br.tau > 1, 'COPD: a higher FRC, dynamic hyperinflation, auto-PEEP, a long time constant: ' + copd.br.vee.toFixed(0) + '% / ' + copd.br.autoPeep.toFixed(1) + ' / ' + copd.br.tau.toFixed(1) + ' s');
ok(copd.br.wRes > 4 * n.br.wRes && copd.br.pmus > n.br.pmus, 'COPD: much more resistive work and muscle pressure');
ok(copd.br.pts[0].ppl > copd.br.pts[15].ppl + 5, 'COPD: the threshold load — the pleural pressure must fall a long way before flow');
const oed = H.run(H.PRESETS.filter(x => x.id === 'oedema')[0].set);
ok(oed.br.frc < n.br.frc - 4 && oed.br.cl < 130 && oed.br.pts[60].ppl < -10, 'oedema: a low FRC, a stiff lung, a deep pleural swing: ' + oed.br.pts[60].ppl.toFixed(1));
ok(oed.rest.pra > 6 && oed.rest.co < 4, 'oedema: a high right atrial pressure with a low output');
const hypo = H.run({ pms: 6 }), hypoDeep = H.run({ pms: 4.5 });
ok(hypo.rest.co < n.rest.co - 0.3 && hypo.coVar > n.coVar, 'mild hypovolaemia: less output and a larger swing with the breath (the steep part of the cardiac curve): ' + (hypo.coVar * 100).toFixed(0) + '%');
ok(hypoDeep.rest.co < hypo.rest.co && hypoDeep.rest.pra < hypoDeep.rest.pcrit + 0.3 && hypoDeep.coVar < 0.06, 'severe hypovolaemia: the operating point sits on the collapse plateau — flow-limited, and the breath no longer moves it');
const deepHypo = H.run({ pms: 5, vt: 30 });
ok(deepHypo.top.pra < deepHypo.top.pcrit + 0.5, 'a deep breath in hypovolaemia pulls the right atrial pressure down to the collapse pressure');
const rvf = H.run({ pvr: 2.4, contr: 0.8 });
ok(rvf.rest.co < 3.5 && rvf.rest.pra > 4, 'pulmonary hypertension: a flat cardiac curve, a high right atrial pressure, a low output');
// ---- the ventilator
const v0 = H.run({ mode: 'vent' }), v5 = H.run({ mode: 'vent', peep: 5 }), v15 = H.run({ mode: 'vent', peep: 15 });
ok(v0.br.pts[60].ppl > v0.br.pts[0].ppl + 2, 'a passive breath raises the pleural pressure');
ok(v0.top.pra > v0.rest.pra && v0.top.co < v0.rest.co, 'a passive breath raises the right atrial pressure and lowers output');
ok(v5.br.vee > v0.br.vee + 5 && v5.br.pts[0].ppl > v0.br.pts[0].ppl + 1.5 && v5.br.pts[0].ppl < v0.br.pts[0].ppl + 4.5, 'PEEP 5 lifts the lung volume and raises the pleural pressure by part of the PEEP: ' + (v5.br.pts[0].ppl - v0.br.pts[0].ppl).toFixed(1));
ok(v15.rest.co < v5.rest.co && v15.rest.pra > v5.rest.pra && v15.rest.pms > v5.rest.pms, 'PEEP 15: a higher right atrial pressure, a higher mean systemic pressure, a lower output');
const ards = H.run(H.PRESETS.filter(x => x.id === 'ards')[0].set), ardsStiffWall = H.run(Object.assign({}, H.PRESETS.filter(x => x.id === 'ards')[0].set, { ccw: 0.5 }));
ok(H.rsPaw(ards.br.vei, ards.p) > 15 && ards.br.pts[60].ppl < 0, 'ARDS on PEEP 10: a high plateau while the pleural pressure stays below zero');
ok((ardsStiffWall.br.pts[60].ppl - ardsStiffWall.br.pts[0].ppl) > (ards.br.pts[60].ppl - ards.br.pts[0].ppl) + 1, 'a stiff chest wall makes the same breath swing the pleural pressure further');
const loaded = H.run(Object.assign({}, H.PRESETS.filter(x => x.id === 'ards')[0].set, { cwShift: 6 }));
ok(loaded.br.pts[0].ppl > ards.br.pts[0].ppl + 2.5 && loaded.rest.pra > ards.rest.pra + 1.5 && loaded.br.vee < ards.br.vee - 4, 'a loaded chest wall (ascites, obesity) takes part of the PEEP for itself: less lung volume, a higher pleural and right atrial pressure');
ok(near(H.rsPaw(60, n.p), H.ptpOf(60, n.p) + H.cwPpl(60, n.p), 1e-9), 'Rahn: the airway pressure is the transpulmonary plus the chest wall pressure');
// ---- the physiology helpers
ok(near(P.p50({}), 26.8, 0.1) && P.p50({ ph: 7.2 }) > 30 && P.p50({ ph: 7.6 }) < 24 && P.p50({ temp: 40 }) > 29 && P.p50({ dpg: 0.3 }) < 23, 'P50 shifts with pH, temperature and 2,3-DPG');
ok(near(P.sat(100, 26.8), 0.97, 0.01) && near(P.sat(40, 26.8), 0.75, 0.02) && near(P.sat(26.8, 26.8), 0.5, 0.001), 'saturation 97% at 100, 75% at 40, 50% at the P50');
ok(near(P.o2content(15, 0.97, 100), 19.8, 0.3), 'arterial content about 20 mL/dL');
ok(near(P.pao2(0.21, 760, 40), 100, 1) && near(P.pao2(1, 760, 40), 663, 1) && near(P.aaNormal(40), 10.9, 0.1), 'alveolar gas equation and the age-normal gradient');
ok(P.LEVELS.length === 7 && P.LEVELS[0].id === 'trachea' && P.LEVELS[6].id === 'alveoli' && P.LEVELS.filter(l => /club/i.test(l.cells.join())).length >= 3, 'seven levels from trachea to alveoli; club cells in the bronchioles and beyond');
ok(Object.keys(P.topics).length === 10 && P.groups.length === 4 && P.groups[2].ids.length === 8, 'ten foundation topics in four groups');
console.log('physio ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
