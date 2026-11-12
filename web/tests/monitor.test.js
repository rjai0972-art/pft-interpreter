// Bedside monitoring: the content and the models behind the labs, in node
const M = require('../src/monitor.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
// ---- content
const ids = Object.keys(M.topics);
ok(ids.length === 13 && M.groups.length === 4 && M.groups.reduce((n, g) => n + g.ids.length, 0) === 13, 'thirteen topics in four groups');
ok(ids.every(id => M.topics[id].blocks.length > 0 && M.topics[id].title), 'every topic has blocks and a title');
['mon_art', 'mon_capno', 'mon_cvp', 'mon_icp', 'mon_screen'].forEach(id => ok(M.topics[id].blocks.some(b => b.widget === id), id + ' carries its widget'));
const txt = JSON.stringify(M.topics);
ok(/fast-flush/.test(txt) && /phlebostatic/.test(txt) && /HemoSphere/.test(txt) && /FloTrac/.test(txt) && /PiCCO/.test(txt) && /GEDV/.test(txt) && /EVLW/.test(txt) && /shark fin/i.test(txt) && /curare cleft/i.test(txt) && /Lundberg/.test(txt) && /P2/.test(txt) && /carboxyhaemoglobin/i.test(txt) && /tidal-volume challenge/.test(txt) && /HYPE/.test(txt) && /Kussmaul/.test(txt), 'the key terms are in the text');
ok(/Sjoding/.test(txt) && /Marik/.test(txt) && /Michard/.test(txt) && /EPVent/.test(txt) && /Brain Trauma Foundation|Carney/.test(txt), 'the sources are cited');
['mon_art', 'mon_cvp', 'mon_pulse', 'mon_capno', 'mon_spo2', 'mon_icp'].forEach(id => { const t = JSON.stringify(M.topics[id]); ok(/Setting it up|set-up|Set-up/i.test(t) && /wrong|pitfall/i.test(t) && /Troubleshoot|troubleshoot/.test(t), id + ': set-up, pitfalls and troubleshooting are all there'); });
// ---- the arterial line
const p = { sbp: 120, dbp: 70, hr: 80 };
const tr = [0, 0.1, 0.2, 0.3, 0.5, 0.74].map(t => M.artTrue(t, p));
ok(Math.abs(tr[0] - 70) < 0.5 && tr[1] > 110 && tr[5] < 80 && Math.max.apply(null, tr) <= 120.01, 'the true waveform runs from the diastolic to the systolic pressure');
const stats = (k) => { const f = M.ART_FAULTS[k]; const sig = M.artMeasured(Object.assign({}, p, { zeta: f.zeta, fn: f.fn }), { dur: 4 }); return M.artStats(sig, 1.5, 3.75); };
const ideal = stats('stiffshort'), bubble = stats('bubble'), whip = stats('whip'), tube = stats('longtube');
ok(Math.abs(ideal.sbp - 120) < 1.5 && Math.abs(ideal.dbp - 70) < 1 && Math.abs(ideal.map - 88.5) < 2.5, 'an optimal line reproduces 120/70 with a mean a little over a third of the way up (' + ideal.sbp.toFixed(0) + '/' + ideal.dbp.toFixed(0) + ')');
ok(bubble.sbp < 112 && bubble.dbp > 72 && Math.abs(bubble.map - ideal.map) < 1.5, 'an air bubble lowers the systolic, raises the diastolic and spares the mean');
ok(whip.sbp > 132 && tube.sbp > 130 && Math.abs(whip.map - ideal.map) < 1.5, 'an underdamped line overshoots the systolic and spares the mean');
ok(M.artVerdict(0.62, 28) === 'optimal' && M.artVerdict(1.6, 4.5) === 'overdamped' && M.artVerdict(0.18, 11) === 'underdamped' && M.artVerdict(0.6, 10) === 'overdamped', 'the verdict follows damping first, then the natural frequency');
const fl = M.artMeasured(p, { dur: 4, flushAt: 2, flushDur: 0.5 });
ok(Math.max.apply(null, Array.from(fl.y.slice(2100, 2400))) > 250 && fl.y[Math.round(3.5 / fl.dt)] < 140, 'the fast flush drives the trace to 300 and it returns');
const fa = M.flushAnalysis(0.62, 28), fb = M.flushAnalysis(1.6, 4.5), fc = M.flushAnalysis(0.12, 14);
ok(fa.oscillations <= 2 && fa.ratio > 0.05 && fa.ratio < 0.15 && fb.oscillations === 0 && fc.oscillations >= 4 && fc.ratio > 0.5, 'the flush analysis: 1–2 oscillations when optimal, none when overdamped, ringing when underdamped');
// ---- capnography
const n = M.CAPNO_SHAPES.normal;
const breath = [];
for (let t = 0; t < 60 / n.rr; t += 0.02) breath.push(M.capno(t, n));
ok(Math.min.apply(null, breath) === 0 && Math.abs(Math.max.apply(null, breath) - n.et) < 2, 'a normal breath runs from zero to the EtCO2');
ok(Object.keys(M.CAPNO_SHAPES).length === 12 && Object.keys(M.CAPNO_SHAPES).every(k => M.CAPNO_SHAPES[k].note.length > 40), 'twelve capnogram patterns with notes');
ok(M.capno(1.5, M.CAPNO_SHAPES.rebreath) >= 8 - 0.01 && M.capno(5, M.CAPNO_SHAPES.disconnect) === 0 && M.capno(2.2, M.CAPNO_SHAPES.disconnect) > 0, 'rebreathing lifts the baseline; a disconnection drops the trace to zero');
ok(M.capno(3.0, M.CAPNO_SHAPES.oesoph) > 0 && M.capno(3.0, M.CAPNO_SHAPES.oesoph) < M.capno(3.0, n) * 0.6 && M.capno(14, M.CAPNO_SHAPES.oesoph) === 0, 'oesophageal intubation: a few falling waves then nothing');
const sf = []; for (let t = 1.3; t < 3.7; t += 0.05) sf.push(M.capno(t, M.CAPNO_SHAPES.sharkfin));
ok(Math.max.apply(null, sf) > 40, 'the shark fin reaches its EtCO2');
// ---- the CVP trace
const c = M.CVP_SHAPES;
const beat = (s) => { const v = []; for (let ph = 0; ph < 1; ph += 0.01) v.push([ph, M.cvp(ph * 0.8, s, { hr: 75, rr: 1e-6 })]); return v; };
const nb = beat(c.normal), peakA = nb.filter(x => x[0] > 0.05 && x[0] < 0.18).reduce((m, x) => Math.max(m, x[1]), 0), peakV = nb.filter(x => x[0] > 0.42 && x[0] < 0.62).reduce((m, x) => Math.max(m, x[1]), 0);
ok(peakA > peakV && peakA > c.normal.base + 2, 'normal: the a wave is taller than the v');
const tb = beat(c.tr), trV = tb.filter(x => x[0] > 0.3 && x[0] < 0.6).reduce((m, x) => Math.max(m, x[1]), 0);
ok(trV > 20 && M.CVP_SHAPES.tamp.y > -1 && Math.abs(M.CVP_SHAPES.constr.y) >= 5, 'TR gives a huge v wave; tamponade loses the y descent; constriction has a steep y');
ok(Math.abs(M.ecgAt(0.21) - 1) < 0.05 && M.ecgAt(0.04) > 0.1 && M.ecgAt(0.47) > 0.25, 'the ECG has a P, a QRS and a T where the waves expect them');
// ---- ICP
const i = M.ICP_SHAPES;
const ib = (s) => { const v = []; for (let ph = 0; ph < 1; ph += 0.01) v.push(M.icp(ph * 60 / 70, s)); return v; };
ok(Math.abs(ib(i.normal).reduce((a, b) => a + b, 0) / 100 - i.normal.mean) < 1.5 && i.lowcomp.p2 > i.lowcomp.p1 && i.normal.p1 > i.normal.p2, 'the mean ICP is right; P2 > P1 only with lost compliance');
ok(M.icpTrend(15, i.plateau) > 55 && M.icpTrend(2, i.plateau) < 25 && Math.abs(M.icpTrend(0.3, i.bwaves) - M.icpTrend(0.9, i.bwaves)) > 8, 'a plateau wave sits at 60 for minutes; B waves oscillate');
const open = ib(i.open); ok(Math.max.apply(null, open) - Math.min.apply(null, open) < 3, 'an open EVD gives a nearly flat trace');
// ---- the pulse-contour screen
ok(M.PC_SCENARIOS.length === 7 && M.PC_SCENARIOS.every(s => s.opts.length === 4 && s.opts.filter(o => o[2] === 'best').length === 1 && s.opts.every(o => o[3].length > 40)), 'seven scenarios, four options each, one best, each explained');
const by = {}; M.PC_SCENARIOS.forEach(s => { by[s.id] = s; });
const m1 = M.pcModel(by.sep_early, {}), m7 = M.pcModel(by.flat, {}), m5 = M.pcModel(by.rv, {}), m6 = M.pcModel(by.tone, {});
ok(m1.svv > 13 && m7.svv < 9 && m5.svv > 13 && m5.cvp === 18, 'early sepsis reads a high SVV, the resuscitated patient a low one, RV failure a high one with a high CVP');
ok(M.pcTest(by.sep_early, 'plr').dSV >= 10 && M.pcTest(by.flat, 'plr').dSV < 10 && M.pcTest(by.rv, 'bolus').dSV < 0 && M.pcTest(by.af, 'plr').dSV < 10, 'the PLR separates responders from non-responders; a bolus harms the failing RV');
ok(M.pcTest(by.lowvt, 'vtc').dSVV >= 3.5 && M.pcTest(by.flat, 'vtc').dSVV < 3.5, 'the tidal-volume challenge unmasks the responder on 6 mL/kg');
ok(m6.shownCi < m6.ci * 0.8 && Math.abs(m6.ci - 3.4) < 0.2, 'the uncalibrated device under-reads after the pressor change');
ok(M.pcValidity(by.af).length === 1 && /irregular/.test(M.pcValidity(by.af)[0]) && M.pcValidity(by.spont).some(x => /spontaneous/.test(x)) && M.pcValidity(by.lowvt).some(x => /tidal/.test(x)) && M.pcValidity(by.sep_early).length === 0, 'the validity conditions are named');
console.log('monitor ' + pass + ' passed, ' + fail + ' failed');
