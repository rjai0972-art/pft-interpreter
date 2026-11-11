// v8.7: the gas rounds of the ECMO lab, the hover terms, and what the echo model gained (valve timing, the arch vessels, the branch
// pulmonary arteries, the closure under the chest wall, the 3-D decor and leaflets) — in node
global.window = global;
require('../src/physio.js'); const E = require('../src/ecmo.js'); const EH = require('../src/echo.js'); const TM = require('../src/terms.js');
['education.js', 'anatomy.js', 'vent.js', 'hemo.js', 'drips.js', 'monitor.js', 'ecg.js', 'conduction.js', 'leads.js', 'nodules.js', 'heartlung.js'].forEach(f => require('../src/' + f));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

// ================================================================ gas rounds
ok(E.ROUNDS.length === 10 && new Set(E.ROUNDS.map(c => c.id)).size === 10 && E.ROUNDS.filter(c => c.mode === 'va').length === 3, 'ten cases, three of them VA');
ok(E.ROUNDS.every(c => c.title && c.who.length > 80 && c.targets.length >= 3 && c.expert.length >= 1 && c.expert.length === c.par && c.teach.length >= 2 && c.level >= 1 && c.level <= 4), 'each case: a story, targets, an expert sequence as long as its par, teaching points');
ok(E.ROUNDS.every(c => c.targets.every(t => typeof t[0] === 'string' && typeof t[1] === 'function' && typeof t[2] === 'function') && c.expert.every(e => typeof e[0] === 'string' && typeof e[1] === 'function' && e[2].length > 60)), 'targets and expert steps are well formed');
E.ROUNDS.forEach(c => {
  const st = E.roundStart(c.id), h0 = [E.roundDraw(st.p, st.s)], c0 = E.roundCheck(c, h0);
  ok(st.c === c && st.s.mode === c.mode && h0[0].out.mode === c.mode, c.id + ': starts in its own mode');
  ok(c0.some(t => !t.ok), c.id + ': not solved on arrival');
  ok(c0.every(t => typeof t.now === 'string' && t.now.length > 0), c.id + ': every target reports where it stands');
  const ex = E.roundExpert(c.id), end = E.roundCheck(c, ex);
  ok(ex.length === c.expert.length + 1 && end.every(t => t.ok), c.id + ': the expert sequence meets every target (' + end.filter(t => !t.ok).map(t => t.label + ' ' + t.now).join('; ') + ')');
  let hz = 0; for (let i = 1; i < ex.length; i++) hz += E.roundHazards(c, ex[i - 1], ex[i]).length;
  ok(hz === 0, c.id + ': the expert sequence trips no hazard');
  for (let i = 1; i < ex.length; i++) ok(E.roundOrders(ex[i - 1], ex[i]).length >= 1 && E.roundOrders(ex[i - 1], ex[i]).every(o => o.label && o.why.length > 30 && o.from !== o.to), c.id + ' step ' + i + ': the orders are named with their reasons');
  ok(E.roundRows(c.mode).filter(r => r[1]).every(r => typeof r[1](ex[0]) === 'string' && typeof r[2](ex[0]) === 'boolean'), c.id + ': every flowsheet row prints and flags');
});
ok(E.round('nonesuch') === null && E.roundStart('nonesuch') === null && E.roundExpert('nonesuch').length === 0, 'an unknown case is refused');
{ // the pace of the CO2
  const st = E.roundStart('r_co2'), a = E.roundDraw(st.p, st.s), fast = E.roundDraw(st.p, Object.assign({}, st.s, { sweep: 4 })), slow = E.roundDraw(st.p, Object.assign({}, st.s, { sweep: 1.5 }));
  ok(a.out.paco2 > 70 && a.out.ph < 7.25, 'the hypercapnia case arrives with a PaCO2 over 70 and a pH under 7.25');
  ok(E.roundHazards(E.round('r_co2'), a, fast).some(x => /fell/.test(x)) && E.roundHazards(E.round('r_co2'), a, fast).some(x => /alkalosis/.test(x)), 'sweep 1 → 4 in one step: the fall is flagged, and the alkalosis');
  ok(E.roundHazards(E.round('r_co2'), a, slow).length === 0, 'sweep 1 → 1.5: no hazard');
  ok(!E.roundCheck(E.round('r_co2'), [a, fast]).filter(t => /never/.test(t.label))[0].ok && E.roundCheck(E.round('r_co2'), [a, slow]).filter(t => /never/.test(t.label))[0].ok, 'the pace target remembers a fall of more than 20');
  const ord = E.roundOrders(a, fast); ok(ord.length === 1 && ord[0].k === 'sweep' && ord[0].from === '1' && ord[0].to === '4' && /CO2/.test(ord[0].why), 'one order: the sweep, with the reason');
}
{ // hazards
  const st = E.roundStart('r_fdo2'), a = E.roundDraw(st.p, st.s);
  ok(E.roundHazards(E.round('r_fdo2'), null, a).some(x => /hyperoxia/i.test(x)) && E.roundHazards(E.round('r_fdo2'), null, a).some(x => /alkalosis/.test(x)), 'fresh on VA: hyperoxia and alkalosis are both there to be found');
  const off = E.roundDraw(st.p, Object.assign({}, st.s, { sweep: 0 }));
  ok(E.roundHazards(E.round('r_fdo2'), a, off).some(x => /Never zero on VA/.test(x)), 'the sweep turned off on VA is called out');
  const ch = E.roundStart('r_chatter'), c0 = E.roundDraw(ch.p, ch.s), up = E.roundDraw(ch.p, Object.assign({}, ch.s, { rpm: 4300 }));
  ok(E.roundHazards(E.round('r_chatter'), c0, up).length >= 1 && up.out.flow <= c0.out.flow + 0.3, 'more speed against a collapsing vein: flagged, and no more flow');
  const w = E.roundStart('r_wean'), w0 = E.roundDraw(w.p, w.s), early = E.roundDraw(w.p, Object.assign({}, w.s, { sweep: 0 }));
  ok(early.out.ph < 7.2 && E.roundHazards(E.round('r_wean'), w0, early).some(x => /not being cleared/.test(x)), 'the sweep off before the ventilator carries the CO2: a pH under 7.2, flagged');
  const d = E.roundStart('r_demand'), d0 = E.roundDraw(d.p, d.s), tx = E.roundDraw(Object.assign({}, d.p, { hb: 11.5 }), d.s);
  ok(E.roundHazards(E.round('r_demand'), d0, tx).some(x => /transfusion beyond/.test(x)) && tx.out.do2vo2 > d0.out.do2vo2, 'transfusing past 10 g/dL raises delivery and is questioned');
}
{ // the actions
  ok(E.R_ACTIONS.length === 3 && E.R_ACTIONS.every(a => a.label && a.tip && a.why && a.nothing && a.modes.length >= 1), 'three actions with their words');
  const r = E.roundStart('r_recirc'), act = E.R_ACTIONS.filter(a => a.id === 'reposition')[0];
  ok(act.applies(r.p, r.s), 'repositioning applies when the tips recirculate');
  const p2 = Object.assign({}, r.p), s2 = Object.assign({}, r.s); act.apply(p2, s2);
  const b = E.roundDraw(r.p, r.s), a = E.roundDraw(p2, s2);
  ok(a.out.spo2 > b.out.spo2 + 5 && a.out.preSat < b.out.preSat - 0.05 && E.roundOrders(b, a).some(o => o.k === 'reposition'), 'and it lowers the pre-membrane saturation while the patient’s rises');
  ok(!act.applies(p2, s2) && !E.R_ACTIONS[1].applies(r.p, r.s) && !E.R_ACTIONS[2].applies(r.p, r.s), 'an action with nothing to act on says so');
  const mm = E.roundStart('r_membrane'), m0 = E.roundDraw(mm.p, mm.s), s3 = Object.assign({}, mm.s); E.R_ACTIONS[1].apply(mm.p, s3); const m1 = E.roundDraw(mm.p, s3);
  ok(m0.out.postO2 < 100 && m0.out.pump.dP > 60 && m1.out.postO2 > 400 && m1.out.pump.dP < 40 && E.roundOrders(m0, m1).some(o => o.k === 'membrane'), 'a new membrane: post-membrane PO2 back over 400, ΔP back to baseline');
}
{ // the membrane and the FdO2 (the model fix that the titration cases rest on)
  const run = (fd) => E.run(Object.assign({}, E.PATIENT, { svr: 11 }), Object.assign({}, E.SETTINGS.vv, { fdo2: fd }));
  const a = run(1), b = run(0.6), c = run(0.3);
  ok(a.postO2 > 450 && b.postO2 > 250 && b.postO2 < 320 && c.postO2 > 120 && c.postO2 < 170, 'the post-membrane PO2 follows the FdO2: ' + [a, b, c].map(x => x.postO2.toFixed(0)).join(', '));
  ok(a.spo2 - b.spo2 <= 3 && b.postSat > 0.99, 'and the patient’s saturation barely moves while the blood leaving the membrane is saturated');
}

// ================================================================ the hover terms
{
  const keys = Object.keys(TM.terms), topics = {};
  [global.PFT_EDU, global.PFT_PHYS, global.PFT_ANAT, global.PFT_VENT, global.PFT_ECMO, global.PFT_HEMO, global.PFT_DRIPS, global.PFT_ECHO, global.PFT_MONITOR, global.PFT_ECG, global.PFT_COND, global.PFT_LEADS, global.PFT_NOD, global.PFT_HL].forEach(c => { if (c && c.topics) Object.keys(c.topics).forEach(id => { topics[id] = 1; }); });
  ok(keys.length >= 115, 'over a hundred terms: ' + keys.length);
  ok(keys.every(k => TM.terms[k].n && TM.terms[k].w && TM.terms[k].w.length >= 60 && TM.terms[k].w.length <= 420), 'each has a name and one or two sentences');
  ok(keys.every(k => topics[TM.terms[k].t]), 'each points at a topic that exists: ' + keys.filter(k => !topics[TM.terms[k].t]).join(','));
  ok(keys.every(k => Array.isArray(TM.terms[k].m) && TM.terms[k].m.length >= 1 && TM.terms[k].m.every(x => x.length >= 2)), 'each has at least one spelling to recognise');
  const all = []; keys.forEach(k => TM.terms[k].m.forEach(x => all.push(x.toLowerCase())));
  ok(new Set(all).size === all.length, 'no spelling belongs to two terms: ' + all.filter((x, i) => all.indexOf(x) !== i).join(','));
  ok(keys.every(k => !TM.terms[k].c || TM.terms[k].c.every(c => ['airway', 'vent', 'ecmo', 'hemo', 'hl', 'drips', 'echo', 'monitor', 'pft', 'ecg', 'cancer'].indexOf(c) >= 0)) && TM.ICU.length === 8, 'the areas a term is confined to are real areas');
  ok(TM.terms.sweep.c.join() === 'ecmo' && /CO2 dial/.test(TM.terms.sweep.w) && /Never zero on VA/.test(TM.terms.sweep.w), 'the sweep is the CO2 dial, in the ECMO area only');
  ok(/1\.34/.test(TM.terms.cao2.f) && /451/.test(TM.terms.cpo.w) && /13%/.test(TM.terms.ppv.w) && /17 mm/.test(TM.terms.tapse.w), 'the numbers that matter are in the definitions');
}

// ================================================================ echo: what the model gained
{
  const m = EH.build('normal'), S = EH.S;
  // the atrioventricular valves: open in diastole (E, diastasis, A), shut through systole
  ok(EH.avOpen(0.72) === 1 && EH.avOpen(0.3) === 0 && EH.avOpen(0.5) === 0 && EH.avOpen(0.82) < 0.8 && EH.avOpen(0.82) > 0.4 && EH.avOpen(0.93) > EH.avOpen(0.86) && EH.avOpen(0.999) < 0.5, 'E wave, diastasis, A wave, and shut from the R wave to the end of relaxation');
  const valveAt = (t, u, rho) => { const p = m.h2b(u, rho, 0); return EH.classify(m, p[0], p[1], p[2], t) === S.VALVE; };
  let acrossSys = 0, acrossDia = 0, alongDia = 0; for (let rho = 0.1; rho <= 1.2; rho += 0.1) { if ([-3.4, -3.3, -3.2, -3.1, -3.0].some(u => valveAt(0.3, u, rho))) acrossSys++; if ([-3.4, -3.3, -3.2, -3.1, -3.0].some(u => valveAt(0.72, u, rho))) acrossDia++; }
  for (let u = -3.2; u <= -1.6; u += 0.1) if ([1.0, 1.1, 1.2, 1.3, 1.4].some(rho => valveAt(0.72, u, rho))) alongDia++;
  ok(acrossSys >= 9 && acrossDia <= 4 && alongDia >= 10, 'the mitral leaflets meet across the orifice in systole and lie along the inflow in diastole (' + [acrossSys, acrossDia, alongDia].join(', ') + ')');
  // the leaflets as surfaces
  const vd = EH.valves3d(m, 0.72), vs = EH.valves3d(m, 0.3);
  ok(vd.length === 5 && vd.map(v => v.id).join() === 'mv,tv,av0,av1,av2' && vd.every(v => v.pos.length === 2 * v.n * 3 && Array.from(v.pos).every(isFinite)), 'five grids: mitral, tricuspid and three aortic cusps');
  const tipRho = (v) => { let s = 0; for (let i = 0; i < v.n; i++) { const o = (v.n + i) * 3, h = i * 3; s += Math.hypot(v.pos[o] - v.pos[h], v.pos[o + 1] - v.pos[h + 1], v.pos[o + 2] - v.pos[h + 2]); } return s / v.n; };
  const centroid = (v, row) => { const c = [0, 0, 0]; for (let i = 0; i < v.n; i++) for (let k = 0; k < 3; k++) c[k] += v.pos[(row * v.n + i) * 3 + k] / v.n; return c; };
  const spread = (v) => { const c = centroid(v, 1); let s = 0; for (let i = 0; i < v.n; i++) { const o = (v.n + i) * 3; s += Math.hypot(v.pos[o] - c[0], v.pos[o + 1] - c[1], v.pos[o + 2] - c[2]); } return s / v.n; };
  ok(vd[0].open === 1 && vs[0].open === 0 && spread(vd[0]) > spread(vs[0]) + 0.6 && tipRho(vd[0]) > 1.4, 'the mitral free edges stand apart in diastole and come together in systole');
  ok(vs[2].open > 0.9 && vd[2].open === 0 && spread(vs[2]) > 0, 'the aortic cusps open in systole');
  // the arch vessels and the branch pulmonary arteries
  ok(m.archBranches.length === 3 && m.archBranches.every(b => b.path.length === 3 && b.path[2][2] > b.path[0][2] + 3) && m.paBranches.length === 2, 'three arch vessels rising from the arch, two branch pulmonary arteries');
  const mid = (b) => b.path[1];
  ok(EH.classify(m, mid(m.archBranches[0])[0], mid(m.archBranches[0])[1], mid(m.archBranches[0])[2], 0.72) === S.AOB && EH.classify(m, mid(m.paBranches[0])[0], mid(m.paBranches[0])[1], mid(m.paBranches[0])[2], 0.72) === S.PAB, 'the beam finds blood in the innominate artery and in the right pulmonary artery');
  ok(m.paPath[2][2] < m.aortaPath[5][2] - 1.5, 'the pulmonary bifurcation sits under the arch');
  const ssn = EH.render(Object.assign({ model: m }, EH.viewParams('ssn')), 320, 260, 0.72, {}), sr = EH.regions(ssn, 320, 260);
  ok(sr.some(r => r.name === 'Ao' && r.frac > 0.1) && sr.some(r => r.name === 'PA' && r.frac > 0.003) && sr.some(r => r.name === 'LA'), 'the suprasternal view: the arch, the right pulmonary artery beneath it, the left atrium below');
  const plax = EH.render(Object.assign({ model: m }, EH.viewParams('plax')), 320, 260, 0.72, {}), pr = EH.regions(plax, 320, 260);
  ok(['LV', 'Ao', 'LA', 'RV'].every(n => pr.some(r => r.name === n && r.frac > 0.015)) && !pr.some(r => r.name === 'SVC' && r.frac > 0.008), 'the parasternal long axis keeps its four structures and loses the stray vena cava');
  // under the chest wall every chamber keeps its wall
  let bare = 0, n = 0; for (let x = -2; x <= 10; x += 0.5) for (let z = -7; z <= 4; z += 0.5) { const y = EH.skinY(x) + 1.3 + 0.2, c = EH.classify(m, x, y, z, 0.72); n++; if (c >= 12 && c <= 15) bare++; }
  ok(bare === 0 && n > 400, 'no cavity touches the inner chest wall: a free wall lies between');
  // the picture: brighter where the beam meets an interface, smooth, fading at the sector's edge
  const raw = EH.render(Object.assign({ model: m }, EH.viewParams('a4c')), 320, 260, 0.72, { polish: false }), pol = EH.render(Object.assign({ model: m }, EH.viewParams('a4c')), 320, 260, 0.72, {});
  let rough0 = 0, rough1 = 0; for (let i = 321; i < 320 * 259; i++) { rough0 += Math.abs(raw.img[i] - raw.img[i - 1]); rough1 += Math.abs(pol.img[i] - pol.img[i - 1]); }
  ok(rough1 < rough0 * 0.75 && pol.img.some(v => v > 200) && Array.from(pol.ids).join() === Array.from(raw.ids).join(), 'the polished picture is smoother, still has bright interfaces, and classifies the same');
  ok(pol.sector.up.length === 320 * 260 && pol.sector.edge.length === 320 * 260 && pol.sector.ri.length === 320 * 260, 'the sector carries its beam-wise neighbours and its polar grain');
  // the 3-D decor
  const F = EH.fields(m, 0, { zMin: -12 }), ids = F.decor.map(d => d.id);
  ok(['lad', 'rca', 'lcx', 'pda', 'd1', 'd2', 'om', 'am', 'innominate', 'lcca', 'lsca', 'rpa', 'lpa', 'rupv', 'rlpv', 'lupv', 'llpv', 'laa', 'raa'].every(x => ids.indexOf(x) >= 0), 'the coronaries, the arch vessels, the branch arteries, four pulmonary veins and two appendages');
  ok(F.decor.every(d => d.path.length >= 3 && d.r > 0.05 && d.path.every(p => p.length === 3 && p.every(isFinite) && p[1] >= EH.skinY(p[0]) + 1.3)), 'every tube is finite and inside the chest');
  const lad = F.decor.filter(d => d.id === 'lad')[0]; let maxStep = 0; for (let i = 1; i < lad.path.length; i++) maxStep = Math.max(maxStep, Math.hypot(lad.path[i][0] - lad.path[i - 1][0], lad.path[i][1] - lad.path[i - 1][1], lad.path[i][2] - lad.path[i - 1][2]));
  ok(lad.path.length >= 14 && maxStep < 1.4 && Math.hypot(lad.path[lad.path.length - 1][0] - m.apex[0], lad.path[lad.path.length - 1][1] - m.apex[1], lad.path[lad.path.length - 1][2] - m.apex[2]) < 3.5, 'the LAD runs unbroken down the anterior groove to the apex (largest step ' + maxStep.toFixed(2) + ' cm)');
  const onWall = (pt) => { const f = Math.min(F.parts[0].f(pt[0], pt[1], pt[2]), F.parts[1].f(pt[0], pt[1], pt[2])); return f > -0.05 && f < 0.6; };
  ok(lad.path.filter(onWall).length >= lad.path.length - 2, 'and it lies on the surface, not in the wall or in the air');
  ['dcm', 'rv', 'eff', 'tamp', 'hypo', 'lvh'].forEach(id => { const F2 = EH.fields(EH.build(id), 0.3, { zMin: -12 }); ok(F2.decor.length >= 15 && F2.decor.every(d => d.path.every(p => p.every(isFinite))), id + ': the decor follows the heart'); });
  ok(F.parts.map(p => p.id).join(',') === 'lv,rv,la,ra,ao,pa,cavae,liver' && F.rings.length === 3, 'the meshed parts are the same eight');
}
console.log('v87 ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
