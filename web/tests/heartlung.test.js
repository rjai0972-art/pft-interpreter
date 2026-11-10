// v8.6: the heart–lung model (Kenny), in node — the thorax (bag, box, tube; the Campbell diagram), the circulation (Guyton)
// and their union across the scenarios, then the 2023 geometrical framework; the checks are qualitative, against the book
global.window = undefined;
const H = require('../src/heartlung.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const run = (id) => H.runScenario(id);

// ---- the thorax: recoils, FRC, compliances
{
  const p = H.RESP_DEFAULT, F = H.frc(p);
  ok(near(F, 1.6, 0.2), 'FRC near 1.6 L of the 4.5 L VC: ' + F.toFixed(2));
  ok(Math.abs(H.rsP(F, p)) < 1e-6, 'at FRC the respiratory system recoils to zero');
  ok(near(H.lungP(F, p), -H.cwP(F, p), 1e-6), 'at FRC the lung pulls in exactly as hard as the chest wall springs out');
  ok(H.lungP(F, p) > 0 && H.cwP(F, p) < 0, 'lung recoil positive (inwards), chest wall negative (outwards) at FRC');
  let mono = true; for (let v = 0.2; v < 4.4; v += 0.1) if (H.lungP(v + 0.1, p) <= H.lungP(v, p) || H.cwP(v + 0.1, p) <= H.cwP(v, p)) mono = false;
  ok(mono, 'both recoils rise monotonically with volume');
  const c = H.compliances(p, F);
  ok(c.cl > 0 && c.ccw > 0 && near(1 / c.crs, 1 / c.cl + 1 / c.ccw, 1e-9), 'elastances add: 1/Crs = 1/CL + 1/Ccw');
  ok(c.frac > 0.5 && c.frac < 0.7, 'the lung takes the larger share of the respiratory-system elastance at FRC: ' + c.frac.toFixed(2));
  ok(H.frc(p, 5) > F && H.frc(p, 10) > H.frc(p, 5), 'PEEP raises the end-expiratory volume');
  ok(H.frc(Object.assign({}, p, { cl: 0.4 })) < F, 'a stiff lung lowers FRC (fibrosis, ARDS)');
  ok(H.frc(Object.assign({}, p, { cl: 2.5 })) > F, 'a floppy lung raises FRC (emphysema)');
  ok(H.frc(Object.assign({}, p, { shift: 4 })) < F, 'an abdomen that pushes up (ascites, obesity) lowers FRC');
  const cv = H.curves(p, 30); ok(cv.lung.length >= 30 && cv.cw.length === cv.lung.length && cv.rs.length === cv.lung.length && near(cv.frc, F, 1e-9), 'curves() gives the three relaxation curves and the FRC');
}
// ---- transmission of airway pressure to the pleural space
{
  const t = H.transmission(20, 5, 1, 1), stiffLung = H.transmission(20, 5, 0.4, 1), stiffWall = H.transmission(20, 5, 1, 0.4);
  ok(near(t.frac, 0.5, 1e-9) && near(t.dPpl, 7.5, 1e-9) && near(t.ptp, 7.5, 1e-9), 'equal compliances: half the driving pressure reaches the pleura');
  ok(stiffLung.frac < t.frac && stiffLung.ptp > t.ptp, 'a stiff lung keeps the pressure in the lung (ARDSp: high transpulmonary, low pleural)');
  ok(stiffWall.frac > t.frac && stiffWall.ptp < t.ptp, 'a stiff chest wall passes it to the pleura (ARDSexp, obesity: high pleural, low transpulmonary)');
  ok(near(stiffLung.frac + stiffWall.frac, 1, 1e-9), 'the two fractions are complementary');
}
// ---- a breath: who breathes, where the pleural pressure goes, what it costs
{
  const q = run('quiet'), d = run('deep'), v = run('ippv'), pe = run('peep');
  ok(q.b.m.who === 'patient' && v.b.m.who === 'ventilator', 'quiet breathing is the patient; IPPV is the ventilator');
  ok(q.b.m.pplEI < q.b.m.pplEE, 'spontaneous inspiration lowers pleural pressure');
  ok(v.b.m.pplEI > v.b.m.pplEE, 'a positive-pressure breath raises it');
  ok(near(q.b.m.vt, 0.5, 0.05) && near(v.b.m.vt, H.scenario('ippv').resp.vt || H.RESP_DEFAULT.vt, 0.05), 'the tidal volume delivered is the one asked for');
  ok(q.b.m.autoPEEP < 0.2 && near(q.b.m.Vee, q.b.m.FRC, 0.05), 'quiet breathing: no trapping, end-expiration at FRC');
  ok(d.b.m.wob.perMin > 3 * q.b.m.wob.perMin, 'a deep breath costs several times the work: ' + d.b.m.wob.perMin.toFixed(1) + ' vs ' + q.b.m.wob.perMin.toFixed(1));
  ok(q.b.m.wob.elastic >= 0 && q.b.m.wob.resistive >= 0 && q.b.m.wob.threshold >= 0 && q.b.m.wob.total >= q.b.m.wob.elastic, 'work components are non-negative and add up');
  ok(pe.b.m.Vee > q.b.m.Vee && pe.b.m.pplEE > q.b.m.pplEE && pe.b.m.pplat > v.b.m.pplat, 'PEEP: higher end-expiratory volume, pleural pressure and plateau');
  ok(q.b.t.length === q.b.ppl.length && q.b.ppl.length === q.b.v.length && q.b.flow.length === q.b.v.length, 'the traces share one time base');
  ok(q.b.m.comp.crs > 0 && near(q.b.m.comp.crs, H.compliances(H.RESP_DEFAULT, q.b.m.FRC + 0.25).crs, 0.02), 'the measured compliance is the respiratory-system compliance over the breath');
}
// ---- obstruction: auto-PEEP, trapping, the threshold load
{
  const sp = run('copd_sp'), mv = run('copd_mv'), fx = run('copd_fix'), a = run('asthma');
  ok(sp.b.m.autoPEEP > 1 && sp.b.m.Vee > sp.b.m.FRC + 0.2, 'COPD exacerbation traps gas above FRC and makes auto-PEEP');
  ok(mv.b.m.autoPEEP > fx.b.m.autoPEEP + 2 && mv.b.m.Vee > fx.b.m.Vee, 'a fast rate with a short expiration stacks breaths; lengthening expiration lets them out');
  ok(mv.c.mean.co < fx.c.mean.co, 'the trapped gas costs cardiac output (auto-PEEP is PEEP to the heart)');
  ok(sp.b.m.wob.threshold > 0 && sp.b.m.wob.threshold > run('quiet').b.m.wob.threshold, 'auto-PEEP is a threshold load the patient must overcome before any air moves');
  ok(a.b.m.wob.perMin > sp.b.m.wob.perMin && a.b.m.pplEI < -8, 'asthma: enormous work and deep pleural swings');
}
// ---- the circulation: Guyton
{
  const o = H.operate(H.CV_DEFAULT);
  ok(near(o.co, 5.1, 0.5) && near(o.pra, 2, 1), 'the normal crossing: ~5 L/min at a right atrial pressure of ~2: ' + o.co.toFixed(1) + ', ' + o.pra.toFixed(1));
  ok(near(o.gradient, o.co * H.CV_DEFAULT.rvr, 1e-6), 'venous return = (Pms − Pra)/RVR at the crossing');
  const full = H.operate(Object.assign({}, H.CV_DEFAULT, { pms: 10 })), dry = H.operate(Object.assign({}, H.CV_DEFAULT, { pms: 4 }));
  ok(full.co > o.co && full.pra > o.pra && dry.co < o.co && dry.pra < o.pra, 'volume moves the venous-return curve along the cardiac curve');
  const strong = H.operate(Object.assign({}, H.CV_DEFAULT, { contr: 1.6 })), weak = H.operate(Object.assign({}, H.CV_DEFAULT, { contr: 0.5 }));
  ok(strong.co > o.co && strong.pra < o.pra && weak.co < o.co && weak.pra > o.pra, 'contractility moves the cardiac curve along the venous return (a strong heart empties the atrium)');
  const squeezed = H.operate(Object.assign({}, H.CV_DEFAULT, { p0: 2 })), sucked = H.operate(Object.assign({}, H.CV_DEFAULT, { p0: -8 }));
  ok(squeezed.co < o.co && squeezed.pra > o.pra && sucked.co > o.co && sucked.pra < o.pra, 'pressure around the heart shifts the cardiac curve along the pressure axis (a breath, a tamponade)');
  const loaded = H.operate(Object.assign({}, H.CV_DEFAULT, { aft: 1 })); ok(loaded.co < o.co && loaded.pra > o.pra, 'RV afterload flattens the cardiac curve');
  const lim = H.operate(Object.assign({}, H.CV_DEFAULT, { pms: 3, pcrit: 1 })); ok(lim.collapsed && near(lim.co, lim.vrMax, 1e-6), 'below the collapse pressure the veins flow-limit: maximal venous return');
  const cvs = H.cvCurves(H.CV_DEFAULT); ok(cvs.vr.length > 10 && cvs.cf.length > 10 && cvs.op && near(cvs.op.co, o.co, 1e-9), 'cvCurves() gives both curves and the crossing');
}
// ---- the union: scenarios against the book's figures
{
  const q = run('quiet'), m = run('mueller'), v = run('valsalva'), ippv = run('ippv');
  ok(q.c.mean.co > 4.5 && q.c.mean.co < 6 && q.c.swing.pct > 5, 'quiet breathing: a normal output that swings with the breath');
  ok(m.c.mean.pra < q.c.mean.pra && m.c.mean.ptm > q.c.mean.ptm, 'Müller: pleural pressure falls, measured Pra falls, transmural pressure rises');
  ok(v.c.mean.pra > q.c.mean.pra + 5 && v.c.mean.co < q.c.mean.co && v.c.mean.co > 2, 'Valsalva: a high Pra with a lower output — the measured pressure is the box, not the heart');
  ok(ippv.c.mean.co < q.c.mean.co && ippv.c.swing.pct < q.c.swing.pct, 'IPPV lowers the mean output a little and dampens the swing in the normal patient');
  const dry = run('peep_dry'), pe = run('peep'), wet = run('peep_wet');
  ok(dry.c.mean.co < pe.c.mean.co && pe.c.mean.co < wet.c.mean.co, 'PEEP hurts the empty patient, is tolerated by the full one');
  ok(dry.c.swing.pct > wet.c.swing.pct + 20, 'the empty patient swings with every breath (pulse-pressure variation); the full one hardly moves');
  ok(wet.c.mean.co > q.c.mean.co * 0.9, 'in the overfilled, failing circuit PEEP costs little or nothing');
  const ap = run('ards_p'), ae = run('ards_e');
  ok(near(ap.b.m.pplat, ae.b.m.pplat, 1.5), 'ARDSp and ARDSexp are set to the same plateau pressure');
  ok(ae.b.m.pplEI > ap.b.m.pplEI + 3 && ae.c.mean.ptm < ap.c.mean.ptm, 'the same plateau: the stiff chest wall puts it on the heart, the stiff lung keeps it in the lung');
  ok(ap.b.m.Vee < q.b.m.FRC + 0.1 && ae.b.m.FRC > ap.b.m.FRC, 'the ARDSp lung is small (baby lung); the ARDSexp FRC is set by the wall');
  const cs = run('cpe_sp'), cm = run('cpe_mv');
  ok(cs.c.mean.co < 2.5 && cs.c.mean.ptm > 12 && cs.b.m.wob.perMin > 8, 'cardiogenic oedema breathing spontaneously: low output, high transmural pressure, hard work');
  ok(cm.c.mean.co > cs.c.mean.co && cm.c.mean.ptm < cs.c.mean.ptm && cm.b.m.wob.perMin < cs.b.m.wob.perMin, 'positive pressure helps the failing left heart: output up, transmural pressure down, work taken over');
  const ci = run('cirr_sp'); ok(ci.b.m.Vee < q.b.m.FRC - 0.3 && ci.b.m.pplEE < q.b.m.pplEE, 'ascites: the FRC is pushed down and the chest wall must be pulled against');
  const w = run('wean'), wp = run('wean_ps');
  ok(w.c.mean.co < 2 && w.b.m.pplEI < -9 && w.c.mean.ptm > 12, 'a failed weaning trial: deep negative swings load the left heart, output falls');
  ok(wp.c.mean.co > w.c.mean.co && wp.b.m.pplEI > w.b.m.pplEI && wp.c.mean.ptm < w.c.mean.ptm, 'pressure support back on: the swing shrinks and the output recovers');
  ok(H.SCENARIOS.length === 20 && new Set(H.SCENARIOS.map(s => s.id)).size === 20 && H.SCENARIOS.every(s => s.id && s.group && s.name && s.resp && s.cv && s.hl && s.note), 'twenty complete scenarios with unique ids');
  ok(H.scenario('nonesuch').id === H.SCENARIOS[0].id, 'an unknown scenario falls back to the first');
  H.SCENARIOS.forEach(s => { const r = run(s.id); ok(isFinite(r.c.mean.co) && r.c.mean.co > 0.5 && r.c.mean.co < 12 && isFinite(r.b.m.wob.perMin) && r.b.m.wob.perMin >= 0, 'finite, plausible output in ' + s.id); });
}
// ---- the bedside: three patients, one CVP; the PVR illusion; strain and stress
{
  const cFull = H.fitContr({ pms: 10 }, 2), cDry = H.fitContr({ pms: 4.5 }, 2), cEu = H.fitContr({ pms: 7 }, 2);
  ok(cFull > cEu && cEu > cDry, 'the same CVP from three crossings: the full patient has the strong heart, the empty one the weak');
  [[10, cFull], [7, cEu], [4.5, cDry]].forEach(x => { const o = H.operate(Object.assign({}, H.CV_DEFAULT, { pms: x[0], contr: x[1] })); ok(near(o.pra, 2, 0.05), 'fitted Pra = 2 at Pms ' + x[0] + ': ' + o.pra.toFixed(2)); });
  const oFull = H.operate(Object.assign({}, H.CV_DEFAULT, { pms: 10, contr: cFull })), oDry = H.operate(Object.assign({}, H.CV_DEFAULT, { pms: 4.5, contr: cDry }));
  ok(oFull.co > oDry.co + 2, 'and their outputs differ by litres: ' + oFull.co.toFixed(1) + ' vs ' + oDry.co.toFixed(1));
  ok(H.pqFlow(0, 0) === 0 && H.pqFlow(5, 10) === 0 && H.pqFlow(12, 10) > 0, 'no flow below the closing pressure');
  let inc = true; for (let p = 0; p < 30; p += 1) if (H.pqFlow(p + 1, 0) <= H.pqFlow(p, 0)) inc = false; ok(inc, 'flow rises with the transmural driving pressure');
  ok(near(H.pqFlow(H.pqPressure(5, 0), 0), 5, 1e-6) && near(H.pqFlow(H.pqPressure(3, 10), 10), 3, 1e-6), 'pqPressure inverts pqFlow');
  const pvr = (q, pc) => H.pqPressure(q, pc) / q;
  ok(pvr(3, 0) > pvr(5, 0), 'the Valsalva illusion: the flow falls along the same curve and the calculated PVR rises');
  ok(pvr(5, 10) > pvr(5, 0), 'an embolus raises the closing pressure and the calculated PVR');
  ok(pvr(7, 10) < pvr(5, 10) && H.pqPressure(7, 10) > H.pqPressure(5, 10), 'norepinephrine after the embolus: more flow, a lower ratio, a higher pressure — the load is unchanged');
  const s = H.strainStress(400, 400, 2); ok(near(s.strain, 1, 1e-9) && near(s.stress, 12, 1e-9) && near(s.local, 24, 1e-9), '400 mL into a 400 mL baby lung: strain 1, stress 12, 24 at a stress raiser');
  ok(H.strainStress(400, 2000, 1).strain < 0.25 && H.strainStress(400, 2000, 1).local < 5, 'the same breath into a healthy FRC is a small strain');
}
// ---- the 2023 framework: two right triangles
{
  const d = H.geom({});
  ok(d.regime === 'unlimited' && near(d.q, (8 + 0.4) / 1.45, 1e-6) && near(d.pra, d.q * 0.45 - 0.4, 1e-6), 'default: Q = (Pms − Ppc)/(Rcardiac + RVR), Ppc = Ppl + Paw·Ecw/Ers');
  ok(near(d.ppc, -2.5 + 7 * 0.3, 1e-9) && near(d.ptm, d.pra - d.ppc, 1e-9), 'the pressure around the heart and the transmural preload');
  const up = H.geom({ pmsf: 12 }); ok(up.q > d.q && up.pra > d.pra, 'unlimited: a higher Pms raises both flow and Pra');
  const cl = H.geom({ praPlat: 2.5, rcard: 0.7 }); ok(cl.regime === 'cardiac-limited' && near(cl.q, (2.5 + 0.4) / 0.7, 1e-6), 'cardiac-limited: Q = (Praplat − Ppc)/Rcardiac');
  const cl2 = H.geom({ praPlat: 2.5, rcard: 0.7, pmsf: 12 }); ok(near(cl2.q, cl.q, 1e-9) && cl2.pra > cl.pra + 3, 'cardiac-limited: more Pms is all congestion, no flow');
  const vl = H.geom({ pcrit: 3, pmsf: 7 }); ok(vl.regime === 'venous-limited' && near(vl.q, (7 - 3) / 1, 1e-6), 'venous-limited: Q = (Pms − Pcrit)/RVR');
  const vl2 = H.geom({ pcrit: 3, pmsf: 7, rcard: 0.2 }); ok(near(vl2.q, vl.q, 1e-9) && vl2.pra < vl.pra, 'venous-limited: a stronger heart lowers the Pra but cannot raise the flow');
  const pawUp = H.geom({ paw: 15 }); ok(pawUp.ppc > d.ppc && pawUp.q < d.q, 'more airway pressure raises Ppc through the chest wall and lowers the flow');
  const stiffWall = H.geom({ paw: 15, ecw: 0.6 }); ok(stiffWall.ppc > pawUp.ppc && stiffWall.q < pawUp.q, 'a stiff chest wall passes more of it on');
  const prone = H.geom({ pmsf: 12, rvr: 1.3, rcard: 0.35, ecw: 0.5 }); ok(prone.q > d.q && prone.regime === 'unlimited', 'proning the responder: Pms up more than the resistances, flow rises');
  const proneCl = H.geom({ praPlat: 2.5, rcard: 0.6, pmsf: 12, rvr: 1.3, ecw: 0.5 }); ok(proneCl.regime === 'cardiac-limited' && proneCl.pra > cl.pra && proneCl.q <= cl.q + 1e-9, 'proning the cardiac-limited: Pra rises, the flow does not');
  const ratio = 1 / 0.45;
  ok(near(H.praVsPmsf(8, ratio, 4, true, -0.4), -0.4 + 8.4 / (ratio + 1), 1e-9), 'the letter: responsive Pra = Ppc + (Pms − Ppc)/(RVR/Rc + 1)');
  ok(near(H.praVsPmsf(16, ratio, 4, false, -0.4), 16 - ratio * 4.4, 1e-9), 'unresponsive Pra = Pms − (RVR/Rc)(Praplat − Ppc)');
  ok(near(H.praCurve(8, ratio, 4, -0.4), H.praVsPmsf(8, ratio, 4, true, -0.4), 1e-9), 'the curve follows the slope first');
  ok(near(H.praCurve(19, ratio, 4, -0.4) - H.praCurve(18, ratio, 4, -0.4), 1, 1e-9), 'and goes 1 : 1 past the plateau');
  ok(H.praCurve(12, ratio, 1.8, -0.4) > H.praCurve(12, ratio, 4, -0.4), 'the weak heart is congested first');
}
// ---- the topics
{
  const ids = Object.keys(H.topics);
  ok(ids.length === 14 && H.groups.reduce((n, g) => n + g.ids.length, 0) === 14, 'fourteen topics in six groups');
  ok(H.groups.every(g => g.ids.every(id => H.topics[id])), 'every grouped id is a topic');
  ok(ids.every(id => H.topics[id].title && H.topics[id].kicker && Array.isArray(H.topics[id].blocks) && H.topics[id].blocks.length >= 3), 'every topic has a title, a kicker and blocks');
  const widgets = ['hl_bag', 'hl_campbell', 'hl_ptrans', 'hl_guyton', 'hl_union', 'hl_pvr', 'hl_sickpick', 'hl_wean', 'hl_cvp3', 'hl_pvrillusion', 'hl_twostress', 'hl_strain', 'hl_geom'];
  const used = new Set(); ids.forEach(id => H.topics[id].blocks.forEach(b => { if (b.widget) used.add(b.widget); }));
  ok(widgets.every(w => used.has(w)) && [...used].every(w => widgets.indexOf(w) >= 0), 'thirteen widgets, all referenced, none unknown');
  ok(ids.every(id => H.topics[id].blocks.some(b => b.src)), 'every topic cites the book');
  ok(H.topics.hl_start.blocks.some(b => b.links && b.links.some(l => /heart-lung\.org\/lectures/.test(l[1]))), 'the lectures are linked');
}
console.log('heartlung ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
