// ECMO: the circuit model, the presets, the scenarios and the content, in node
require('../src/physio.js'); const E = require('../src/ecmo.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, t) => Math.abs(a - b) <= t;
const P = (id) => E.preset(id);
const runP = (id, ps, ss) => { const q = P(id); return E.run(Object.assign({}, q.p, ps || {}), Object.assign({}, q.s, ss || {})); };
// ---- content
ok(Object.keys(E.topics).length === 11 && E.groups.length === 4 && E.groups.reduce((n, g) => n + g.ids.length, 0) === 11, 'eleven topics in four groups');
ok(['ecmo_intro', 'ecmo_circuit', 'ecmo_cannulation', 'ecmo_vv', 'ecmo_va', 'ecmo_select', 'ecmo_daily', 'ecmo_complications', 'ecmo_wean', 'ecmo_lab', 'ecmo_cases'].every(id => E.topics[id] && E.topics[id].blocks.length > 0), 'every topic has blocks');
ok(E.topics.ecmo_circuit.blocks.some(b => b.widget === 'ecmocircuit') && E.topics.ecmo_cannulation.blocks.some(b => b.widget === 'ecmoconfigs') && E.topics.ecmo_lab.blocks.some(b => b.widget === 'ecmolab') && E.topics.ecmo_cases.blocks.some(b => b.widget === 'ecmocases'), 'the four widgets sit in their topics');
ok(E.PRESETS.length === 12 && E.PRESETS.every(pr => P(pr.id) && P(pr.id).p && P(pr.id).s && pr.note) && E.PRESETS.filter(pr => pr.mode === 'va').length === 6, 'twelve presets, six of each mode, each with a note');
ok(E.SCENARIOS.length === 14 && E.SCENARIOS.every(sc => sc.options.length === 4 && sc.options.filter(o => o[2] === 'best').length === 1 && sc.fix.length >= 4 && sc.who && sc.q), 'fourteen scenarios, each with four options, exactly one best, and a sequence');
ok(E.SCENARIOS.every(sc => (!sc.before || E.PRESETS.some(p => p.id === sc.before)) && (!sc.after || E.PRESETS.some(p => p.id === sc.after))), 'every scenario’s lab preset exists');
ok(E.SCENARIOS.every(sc => sc.options.every(o => ['best', 'reasonable', 'poor', 'wrong'].indexOf(o[2]) >= 0 && o[3].length > 40)), 'every option has a verdict and a reason');
const txt = JSON.stringify(E.topics);
ok(/EOLIA/.test(txt) && /ECLS-SHOCK/.test(txt) && /CESAR/.test(txt) && /Harlequin/.test(txt) && /ECPELLA|Impella/.test(txt) && /Anti-Xa 0\.3–0\.7/.test(txt) && /Aissaoui/.test(txt) && /RATE 2026/.test(txt), 'the trials, the anticoagulation targets and the weaning criteria are in the text');
// ---- the oxygen helpers
ok(near(E.satOf(E.po2Of(0.9)), 0.9, 0.001) && near(E.po2FromContent(10, E.content(10, 60)), 60, 0.2) && E.satOf(27) > 0.49 && E.satOf(27) < 0.51, 'saturation, PO2 and content invert each other; P50 near 27');
// ---- the pump
const pm = E.pump({ cvp: 8 }, { rpm: 3400, drain: 25, ret: 21, oxy: 1, mode: 'vv', kink: false });
ok(near(pm.flow, 4.56, 0.05) && !pm.chatter && pm.pDrain < -40 && pm.pDrain > -80 && pm.dP > 20 && pm.dP < 40 && pm.pPre > pm.pPost, 'at 3,400 rpm a 25 Fr cannula gives about 4.6 L/min with a drainage pressure near −55 and a membrane ΔP in the 20s');
const pmDry = E.pump({ cvp: 3 }, { rpm: 3800, drain: 25, ret: 21, oxy: 1, mode: 'vv', kink: false });
ok(pmDry.chatter && pmDry.flow < pmDry.demand && pmDry.pDrain < pm.pDrain, 'an empty cava at high speed: suck-down, flow below the demand, a deeper drainage pressure');
const pmKink = E.pump({ cvp: 8 }, { rpm: 3400, drain: 25, ret: 21, oxy: 1, mode: 'vv', kink: true });
ok(pmKink.chatter && pmKink.flow < pm.flow, 'a kinked drainage halves the ceiling and chatters');
const pmClot = E.pump({ cvp: 8 }, { rpm: 3400, drain: 25, ret: 21, oxy: 0.3, mode: 'vv', kink: false });
ok(pmClot.dP > 80 && near(pmClot.flow, pm.flow, 0.01), 'a clotting membrane raises the ΔP at the same flow');
ok(E.pump({ cvp: 8 }, { rpm: 3400, drain: 29, ret: 21, oxy: 1, mode: 'vv' }).flow > pm.flow - 0.01 && E.pump({ cvp: 8 }, { rpm: 4400, drain: 29, ret: 21, oxy: 1, mode: 'vv' }).flow > E.pump({ cvp: 8 }, { rpm: 4400, drain: 23, ret: 21, oxy: 1, mode: 'vv' }).flow, 'a bigger drainage cannula gives more flow at high speed');
// ---- the membrane
const m1 = E.membrane({ hb: 10 }, { flow: 4.6, sweep: 3, fdo2: 1, oxy: 1 }, 35, 45), m0 = E.membrane({ hb: 10 }, { flow: 4.6, sweep: 3, fdo2: 1, oxy: 0.3 }, 35, 45);
ok(m1.postO2 > 400 && m1.postSat > 0.99 && m1.postCO2 < 45 * 0.85 && m1.transfer > 200, 'a new membrane on 100% oxygen returns blood at a PO2 above 400 and clears CO2');
ok(m0.postO2 < 200 && m0.postCO2 > m1.postCO2 && m0.transfer < m1.transfer, 'a failing membrane: post-membrane PO2 below 200, less CO2 cleared');
ok(E.membrane({ hb: 10 }, { flow: 4.6, sweep: 0, fdo2: 1, oxy: 1 }, 35, 45).postO2 === 35, 'with the sweep off the blood leaves as it came');
// ---- VV
const vv = runP('vv_run');
ok(vv.mode === 'vv' && vv.spo2 >= 88 && vv.spo2 <= 97 && vv.paco2 > 30 && vv.paco2 < 45 && vv.flowRatio > 0.55 && vv.preSat > 0.6 && vv.preSat < 0.8 && vv.postO2 > 400, 'the default VV run: SaO2 in the 90s, PaCO2 in the 30s, effective flow about 60% of the output, drainage saturation in the 60s–70s');
const sw = [1, 2, 4, 8].map(x => runP('vv_run', {}, { sweep: x }).paco2);
ok(sw[0] > sw[1] && sw[1] > sw[2] && sw[2] > sw[3] && sw[0] > 55 && sw[3] < 25 && near(runP('vv_run', {}, { sweep: 8 }).spo2, vv.spo2, 2), 'sweep sets the PaCO2 and not the saturation');
const rp = [2200, 3000, 3800].map(x => runP('vv_run', {}, { rpm: x }));
ok(rp[0].spo2 < rp[1].spo2 && rp[1].spo2 < rp[2].spo2 && rp[0].flowRatio < 0.4 && rp[0].spo2 < 85, 'pump speed → flow → the fraction of the output oxygenated → the saturation');
const rc = runP('vv_recirc');
ok(rc.preSat > 0.75 && rc.spo2 < vv.spo2 - 4 && rc.qeff < vv.qeff && near(rc.flow, vv.flow, 0.05) && E.alarms(rc, P('vv_recirc').s).some(a => a.k === 'recirc'), 'recirculation: the drainage saturation climbs, the effective flow and the patient’s saturation fall at the same pump flow, and the console says so');
const hc = runP('vv_highco');
ok(hc.spo2 < vv.spo2 - 4 && hc.flowRatio < 0.5 && hc.postO2 > 400, 'a cardiac output of 10 with the same circuit: lower saturation with a perfect membrane');
const hb = [7, 10, 13].map(x => runP('vv_run', { hb: x }).do2vo2);
ok(hb[0] < hb[1] && hb[1] < hb[2] && hb[0] < 2.5, 'haemoglobin carries the delivery: at 7 g/dL the DO2:VO2 is supply-limited');
const of = runP('vv_oxyfail');
ok(of.postO2 < 200 && of.pump.dP > 60 && of.spo2 < vv.spo2 && of.paco2 > vv.paco2 + 8 && E.alarms(of, P('vv_oxyfail').s).filter(a => a.k === 'oxy').length >= 2, 'a failing membrane: low post-membrane PO2, rising ΔP, the patient hypoxaemic and hypercapnic, two membrane alarms');
const ch = runP('vv_chatter');
ok(ch.pump.chatter && ch.flow < 3.5 && ch.spo2 < vv.spo2 && E.alarms(ch, P('vv_chatter').s).some(a => a.k === 'drain'), 'chatter after diuresis: flow falls and the drainage alarm fires');
const wn = runP('vv_wean');
ok(near(wn.postO2, wn.preO2, 0.5) && wn.paco2 > 33 && wn.paco2 < 48 && wn.spo2 >= 94, 'sweep off with a recovered lung: the membrane exchanges nothing and the gases are the lung’s own');
ok(runP('vv_wean', { va: 1.5, shunt: 0.6 }).paco2 > 60, 'sweep off with the lung still sick: the PaCO2 climbs');
ok(runP('vv_run', { hco3: 14 }).ph < runP('vv_run').ph - 0.15, 'the bicarbonate is the metabolic side of the pH');
// ---- VA
const va = runP('va_shock');
ok(va.mode === 'va' && va.map >= 65 && va.map <= 95 && va.qn > 0.4 && va.qn < 1.5 && va.pp >= 10 && va.femO2 > 300 && va.rrO2 > 60 && va.corO2 < va.femO2 && !va.harlequin && va.mixing > 1 && va.mixing < 3, 'the default VA run: MAP restored, a little native ejection, the femoral gas is circuit blood, the coronaries native blood');
const hq = runP('va_harlequin');
ok(hq.harlequin && hq.rrO2 < 60 && hq.femO2 > 150 && hq.corO2 < 60 && hq.mixing > 3 && E.alarms(hq, P('va_harlequin').s).some(a => /Differential/.test(a.t)), 'Harlequin: a recovering heart and wet lungs give a hypoxaemic right arm and a hyperoxic leg');
ok(!runP('va_harlequin', {}, { config: 'ce' }).harlequin && near(runP('va_harlequin', {}, { config: 'ce' }).rrO2, runP('va_harlequin', {}, { config: 'ce' }).femO2, 1), 'central return: the branches share one blend and the Harlequin is gone');
ok(runP('va_harlequin', { shunt: 0.1 }).rrO2 > 80, 'with the lungs better the right arm is pink again');
const ds = runP('va_distension');
ok(ds.distension && !ds.avOpens && ds.pp < 10 && ds.lvedp > 20 && ds.oedema && E.alarms(ds, P('va_distension').s).some(a => a.k === 'lv'), 'a non-ejecting ventricle at full flow: closed valve, no pulse pressure, high LVEDP, oedema, the LV alarm');
const un = runP('va_unloaded');
ok(!un.distension && un.lvedp < ds.lvedp - 6 && un.qnTot > un.qn + 2, 'an Impella empties the ventricle and adds forward flow');
ok(runP('va_distension', {}, { rpm: 2600 }).lvedp < ds.lvedp && runP('va_distension', { contr: 0.5 }).avOpens, 'less flow or more contractility opens the valve');
const wv = runP('va_wean');
ok(wv.flow < 2.2 && wv.qn > 2 && wv.map >= 60 && wv.pp > 20 && wv.avOpens && !wv.distension, 'the flow-down trial on a recovered heart: MAP held by the native ejection at 1–2 L/min of support');
ok(runP('va_shock', { svr: 10 }).map < va.map && runP('va_shock', { svr: 24 }).map > va.map, 'MAP follows the SVR: vasoplegia needs a pressor, not more flow');
ok(runP('va_shock', {}, { dpc: false }).limbRisk !== 'low' && va.limbRisk === 'low', 'no distal perfusion catheter: the leg is at risk');
ok(runP('va_shock', {}, { sweep: 1 }).paco2Fem > runP('va_shock', {}, { sweep: 4 }).paco2Fem && runP('va_harlequin', {}, { sweep: 1 }).paco2RR - runP('va_harlequin', {}, { sweep: 1 }).paco2Fem < runP('va_harlequin', { va: 0.8 }, { sweep: 4 }).paco2RR - runP('va_harlequin', { va: 0.8 }, { sweep: 4 }).paco2Fem, 'on VA the sweep rules the femoral PaCO2 and the native lung the right radial');
ok(E.alarms(runP('va_shock'), P('va_shock').s).some(a => /Hyperoxia/.test(a.t)) && !E.alarms(runP('va_shock', {}, { fdo2: 0.5 }), Object.assign({}, P('va_shock').s, { fdo2: 0.5 })).some(a => /Hyperoxia/.test(a.t)), 'FdO2 1.0 on VA makes a hyperoxic femoral gas; weaning the FdO2 clears the alarm');
// ---- the guided lab cases: every move is a real change to the dials and the best moves improve the patient
ok(E.LABCASES.length === 10 && E.LABCASES.filter(c => c.mode === 'vv').length === 6 && E.LABCASES.every(c => c.who.length > 120 && c.look && c.done && c.steps.length >= 1 && c.steps.every(st => st.options.length === 4 && st.options.filter(o => o[2] === 'best').length === 1 && st.options.every(o => typeof o[4] === 'function' && o[3].length > 40))), 'ten guided cases, six VV and four VA, each step with four moves, one best, every move a function');
const walk = (c) => { let p = Object.assign({}, E.PATIENT, c.p), s = Object.assign({}, E.SETTINGS[c.mode], c.s); p.vco2 = Math.round(p.vo2 * 0.82); const outs = [E.run(p, s)]; c.steps.forEach(st => { const best = st.options.filter(o => o[2] === 'best')[0]; p = Object.assign({}, p); s = Object.assign({}, s); best[4](p, s); p.vco2 = Math.round(p.vo2 * 0.82); outs.push(E.run(p, s)); }); return outs; };
const L = {}; E.LABCASES.forEach(c => { L[c.id] = walk(c); });
ok(L.lab_recirc[0].recirc > 0.4 && L.lab_recirc[0].spo2 < 90 && L.lab_recirc[1].spo2 >= 94 && L.lab_recirc[1].paco2 > 48 && L.lab_recirc[2].paco2 < 42 && L.lab_recirc[2].spo2 >= 94, 'recirculation: repositioning restores the saturation, the sweep then clears the CO2');
ok(L.lab_chatter[0].pump.chatter && L.lab_chatter[0].pump.pDrain < -75 && !L.lab_chatter[1].pump.chatter && L.lab_chatter[2].flow > 4.5 && L.lab_chatter[2].spo2 >= 95, 'chatter: speed down quiets the line, volume then restores the flow');
ok(L.lab_highco[0].flowRatio < 0.55 && L.lab_highco[1].flowRatio >= 0.58 && L.lab_highco[1].spo2 > L.lab_highco[0].spo2 + 3 && L.lab_highco[2].svo2 > L.lab_highco[1].svo2 + 0.04, 'high output: more drainage lifts the ratio and the saturation, haemoglobin lifts the SvO2');
ok(L.lab_oxyfail[0].postO2 < 150 && L.lab_oxyfail[0].pump.dP > 60 && L.lab_oxyfail[1].postO2 > 400 && L.lab_oxyfail[1].spo2 > L.lab_oxyfail[0].spo2 + 3, 'the failing membrane: a change restores the post-membrane PO2');
ok(L.lab_co2[0].paco2 > 70 && L.lab_co2[0].ph < 7.2 && L.lab_co2[1].paco2 < 45 && L.lab_co2[1].paco2 > 34 && Math.abs(L.lab_co2[1].pao2 - L.lab_co2[0].pao2) < 10, 'CO2: the sweep clears it without overshooting, the PaO2 does not move');
ok(L.lab_harlequin[0].harlequin && L.lab_harlequin[0].rrO2 < 60 && !L.lab_harlequin[1].harlequin && L.lab_harlequin[1].rrO2 > 100 && Math.abs(L.lab_harlequin[1].rrO2 - L.lab_harlequin[1].femO2) < 2, 'Harlequin: an axillary return gives the arch circuit blood');
ok(L.lab_distension[0].distension && L.lab_distension[0].pp < 5 && !L.lab_distension[1].distension && L.lab_distension[1].lvedp < L.lab_distension[0].lvedp - 8 && L.lab_distension[2].flow < L.lab_distension[1].flow - 0.5 && L.lab_distension[2].lvedp <= L.lab_distension[1].lvedp, 'distension: the Impella vents, the flow then comes down');
ok(L.lab_limb[0].limbRisk === 'high' && L.lab_limb[1].limbRisk === 'low' && Math.abs(L.lab_limb[1].map - L.lab_limb[0].map) < 1, 'the leg: a distal perfusion catheter, nothing else changes');
ok(L.lab_vawean[0].flow > 4 && L.lab_vawean[1].flow < 2.2 && L.lab_vawean[1].map >= 65 && L.lab_vawean[1].pp > 25 && L.lab_vawean[1].avOpens && L.lab_vawean[1].lactate !== 'rising fast', 'VA weaning: the flow-down trial holds the pressure');
ok(L.lab_vvwean[0].spo2 >= 97 && L.lab_vvwean[1].postO2 < 60 && L.lab_vvwean[1].pao2 > 80 && L.lab_vvwean[1].paco2 < 50 && L.lab_vvwean[1].flow > 3.5, 'VV weaning: with the sweep off the circuit is a bystander and the lung carries the gas');
E.LABCASES.forEach(c => c.steps.forEach((st, i) => st.options.forEach(o => { let p = Object.assign({}, E.PATIENT, c.p), s = Object.assign({}, E.SETTINGS[c.mode], c.s); o[4](p, s); p.vco2 = Math.round(p.vo2 * 0.82); const r = E.run(p, s); ok(isFinite(r.flow) && isFinite(r.svo2) && (r.mode === 'vv' ? isFinite(r.pao2) : isFinite(r.rrO2)), c.id + ' step ' + (i + 1) + ' option ' + o[0] + ' runs'); })));
console.log('ecmo ' + pass + ' passed, ' + fail + ' failed');
