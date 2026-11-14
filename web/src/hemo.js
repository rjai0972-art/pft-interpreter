/* ------------------------------------------------------------------ haemodynamics: pressures, flows, gradients, the catheter, shock and the right heart
   Content for the Learn area and a teaching model of the circulation: a closed loop with a venous return curve (Guyton),
   two ventricles described by their end-diastolic (exponential) and end-systolic (linear) pressure–volume relations,
   a pericardium, two regurgitant valves, a systemic and a pulmonary resistance and the compliances that make the pulses.
   The pulmonary artery catheter reads what the loop settles to; the derived numbers (SVR, PVR, TPG, DPG, PAPi, CPO,
   Fick) are computed from the same state, the waveforms drawn from it, and the interventions move the inputs the way the
   drugs and devices do. Textbook shapes and orders of magnitude; the point is which way the numbers move. Pure functions. */
(function (root) {
  'use strict';
  const PH = root.PFT_PHYS;
  const T = {};
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ================================================================== the model ================================================================== */
  const PATIENT = { hr: 75, pms: 9, rvr: 1.0, lvContr: 1, rvContr: 1, lvStiff: 1, rvStiff: 1, svr: 16, pvr: 1.2, mr: 0, tr: 0, pperi: 0, constrict: 0, hb: 13, vo2: 250, sao2: 0.97, bsa: 1.9, vent: 'spont', peep: 0, impella: 0, iabp: 0, ecmo: 0 };
  /* the ventricles */
  function edv(P, A, B) { return P <= 0 ? 0 : Math.log(P / A + 1) / B; }                       // end-diastolic volume from the transmural pressure
  function lvState(p, edpTm, pes) {
    const fail = Math.max(0, 1 - p.lvContr), dil = 1 + 0.15 * fail;   // a failing ventricle dilates a little: its curves shift to larger volumes
    const A = 0.55 * p.lvStiff * (1 + 1.6 * p.constrict), B = 0.023 * (1 + 0.8 * p.constrict) / dil, Ees = 3.0 * p.lvContr, V0 = 10 + 30 * fail;
    const EDV = edv(Math.max(0.3, edpTm), A, B), ESV = V0 + pes / Ees;
    const SV = Math.max(0, EDV - ESV);
    return { edv: EDV, esv: Math.min(EDV, ESV), sv: SV, ef: EDV > 0 ? SV / EDV : 0, ees: Ees };
  }
  function rvState(p, edpTm, pes) {
    const fail = Math.max(0, 1 - p.rvContr), dil = 1 + 0.3 * fail;
    const A = 0.35 * p.rvStiff * (1 + 1.6 * p.constrict), B = 0.0165 * (1 + 0.8 * p.constrict) / dil, Ees = 0.45 * p.rvContr, V0 = 15 + 30 * fail;
    const EDV = edv(Math.max(0.3, edpTm), A, B), ESV = V0 + pes / Ees;
    const SV = Math.max(0, EDV - ESV);
    return { edv: EDV, esv: Math.min(EDV, ESV), sv: SV, ef: EDV > 0 ? SV / EDV : 0, ees: Ees };
  }
  function paCompliance(p) { return clamp(5.5 / Math.pow(Math.max(0.3, p.pvr) / 1.2, 0.6), 0.8, 8); }
  /* given RAP and LVEDP, what the two ventricles put out (L/min) and the pressures around them */
  function loop(p, rap, lvedp) {
    const hr = p.hr, trF = 1 - 0.15 * p.tr;
    const mrAt = (map) => Math.min(0.75, 0.2 * p.mr * Math.pow(Math.max(20, map) / 90, 0.8));   // the regurgitant fraction grows with the pressure the ventricle ejects against
    // the LV against the arterial pressure it makes: the MAP at which the arteries carry what the left heart (and a circuit) deliver
    const lvAt = (map) => {
      const pes = Math.max(5, map * 1.08 - (p.iabp ? 9 : 0));
      const mrF = 1 - mrAt(map);
      const lv = lvState(p, lvedp - p.pperi, pes);
      const imp = Math.min(p.impella, hr * lv.edv / 1000 * 0.9);  // the pump cannot draw more than the ventricle holds
      const qlv = hr * lv.sv * mrF / 1000 + imp;                   // what the left heart passes forward
      return { lv: lv, qlv: qlv, qsys: qlv + p.ecmo, mrF: mrF };
    };
    let lo = 1, hi = 300, L = null;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; L = lvAt(m); if (rap + L.qsys * p.svr > m) lo = m; else hi = m; }
    const map = (lo + hi) / 2; L = lvAt(map);
    const lap = lvedp + 15 * mrAt(map);                            // regurgitation lifts the atrium above the ventricle
    const paop = lap;
    // the RV against the pulmonary artery: the PA systolic at which the artery carries what the right heart sends
    const cpa = paCompliance(p);
    const rvAt = (pas) => {
      const rv = rvState(p, rap - p.pperi, Math.max(4, pas));
      const qrv = hr * rv.sv * trF / 1000;
      const mpap0 = paop + qrv * p.pvr, pp = (rv.sv * trF) / cpa;
      const pasNew = mpap0 + 0.62 * pp, pad = Math.max(paop + 0.5, mpap0 - 0.38 * pp);
      return { rv: rv, qrv: qrv, pas: pasNew, pad: pad, mpap: (pasNew + 2 * pad) / 3 };
    };
    lo = 2; hi = 200; let Rv = null;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; Rv = rvAt(m); if (Rv.pas > m) lo = m; else hi = m; }
    const pas = (lo + hi) / 2; Rv = rvAt(pas);
    return { lv: L.lv, rv: Rv.rv, qlv: L.qlv, qrv: Rv.qrv, qsys: L.qsys, mrF: L.mrF, map: map, lap: lap, paop: paop, pas: pas, pad: Rv.pad, mpap: Rv.mpap, cpa: cpa };
  }
  function run(p0) {
    const p = Object.assign({}, PATIENT, p0 || {});
    // outer: the right atrial pressure that balances the venous return against what the right heart (and a circuit) take
    let lo = 0.5, hi = 40, st = null, rap = 5;
    for (let i = 0; i < 36; i++) {
      rap = (lo + hi) / 2;
      // inner: the left-ventricular end-diastolic pressure at which the left heart passes what the right heart sends
      let l2 = 0.5, h2 = 55;
      for (let j = 0; j < 36; j++) { const m = (l2 + h2) / 2; st = loop(p, rap, m); if (st.qlv < st.qrv) l2 = m; else h2 = m; }
      st = loop(p, rap, (l2 + h2) / 2); st.lvedp = (l2 + h2) / 2;
      const vr = (p.pms - rap - (p.vent === 'ppv' ? 0.2 * p.peep : 0)) / p.rvr;   // positive pressure raises the pressure the veins drain into
      if (vr > st.qrv + p.ecmo) lo = rap; else hi = rap;
    }
    st.rap = rap;
    const o = st;
    const co = o.qsys, ci = co / p.bsa, hr = p.hr;
    const svFwd = o.lv.sv * o.mrF;
    const ca = 1.34 * p.hb * p.sao2 + 0.003 * 90, cv = Math.max(3.5, ca - p.vo2 / (10 * Math.max(0.3, co)));
    const svo2 = PH.sat(Math.max(1, po2From(p.hb, cv)), 26.8);
    const pp = p.ecmo > 3.5 && svFwd < 10 ? 2 : clamp(svFwd / 1.4, 2, 90), sbp = o.map + 0.62 * pp, dbp = o.map - 0.38 * pp;
    const peepTx = p.vent === 'ppv' ? 0.35 * p.peep : 0;         // the share of PEEP the catheter reads
    const padM = o.pad + peepTx, pasM = Math.max(o.pas, o.pad + 1) + peepTx, rapM = o.rap + peepTx, paopM = o.paop + peepTx, mpapM = Math.max(o.mpap, (pasM + 2 * padM) / 3 - peepTx) + peepTx;
    const svr = (o.map - o.rap) / Math.max(0.3, co), pvr = (o.mpap - o.paop) / Math.max(0.3, o.qrv);
    const tpg = o.mpap - o.paop, dpg = o.pad - o.paop, papi = Math.max(0, pasM - padM) / Math.max(1, rapM), cpo = o.map * co / 451;
    const rvef = o.rv.ef, tapse = clamp(6 + 36 * rvef, 4, 30);
    const rvlv = (o.rv.edv / Math.max(30, o.lv.edv)) / 1.08 * 0.65;   // echo basal diameter ratio, normal ≈ 0.65
    const ea = Math.max(1, o.map * 1.08) / Math.max(5, o.lv.sv), coupling = ea / o.lv.ees;
    const eaRv = Math.max(1, o.pas) / Math.max(3, o.rv.sv), couplingRv = eaRv / o.rv.ees;
    const lvotVti = svFwd / 3.2;
    const lactate = ci < 1.6 ? 'rising fast' : (ci < 2.0 ? 'rising' : (ci < 2.2 ? 'borderline' : (svo2 < 0.6 ? 'borderline' : 'normal')));
    const out = { p: p, rap: rapM, rapTm: o.rap, rvsys: o.pas + 2, rvedp: rapM, pas: pasM, pad: padM, mpap: mpapM, paop: paopM, paopV: paopM + 2 + 30 * (1 - o.mrF), lvedp: o.lvedp + peepTx, lap: o.lap + peepTx,
      map: o.map, sbp: sbp, dbp: dbp, pp: pp, hr: hr, co: co, ci: ci, sv: svFwd, svi: svFwd / p.bsa, qpulm: o.qrv, svr: svr, svrDyn: svr * 80, pvr: pvr, pvrDyn: pvr * 80, tpg: tpg, dpg: dpg, papi: papi, cpo: cpo, raPaop: o.rap / Math.max(1, o.paop),
      svo2: svo2, cv: cv, ca: ca, do2: co * ca * 10, do2vo2: co * ca * 10 / p.vo2, lactate: lactate,
      lvedv: o.lv.edv, lvesv: o.lv.esv, lvef: o.lv.ef, rvedv: o.rv.edv, rvesv: o.rv.esv, rvef: rvef, tapse: tapse, rvlv: rvlv, tapsePasp: tapse / Math.max(5, pasM), ea: ea, ees: o.lv.ees, coupling: coupling, couplingRv: couplingRv, lvotVti: lvotVti, cpa: o.cpa,
      regurgMr: o.lv.sv * (1 - o.mrF), peepTx: peepTx };
    out.flags = flags(out); out.signature = signature(out); out.forrester = forrester(out); out.ph = phClass(out);
    return out;
  }
  function po2From(hb, c) { let lo = 0, hi = 700; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (PH.o2content(hb, PH.sat(m, 26.8), m) < c) lo = m; else hi = m; } return (lo + hi) / 2; }

  /* what the numbers say */
  function flags(o) {
    const f = [];
    if (o.ci < 2.2) f.push({ k: 'ci', t: 'Cardiac index ' + o.ci.toFixed(1) + ' (< 2.2): low output' });
    if (o.cpo < 0.6) f.push({ k: 'cpo', t: 'Cardiac power output ' + o.cpo.toFixed(2) + ' W (< 0.6): the strongest predictor of death in cardiogenic shock' });
    if (o.paop > 18) f.push({ k: 'paop', t: 'PAOP ' + o.paop.toFixed(0) + ' (> 18): congested left heart' });
    else if (o.paop < 8 && o.ci < 2.5) f.push({ k: 'paop', t: 'PAOP ' + o.paop.toFixed(0) + ' with a low output: underfilled left heart' });
    if (o.rap > 12) f.push({ k: 'rap', t: 'RAP ' + o.rap.toFixed(0) + ' (> 12): right-sided congestion' });
    if (o.raPaop > 0.86 && o.rap > 8) f.push({ k: 'ratio', t: 'RAP:PAOP ' + o.raPaop.toFixed(2) + ' (> 0.86): RV failure pattern' });
    if (o.papi < 0.9 && o.rap > 8) f.push({ k: 'papi', t: 'PAPi ' + o.papi.toFixed(2) + ' (< 0.9): the RV is not generating a pulse against its filling pressure' });
    if (o.svr < 9) f.push({ k: 'svr', t: 'SVR ' + Math.round(o.svrDyn) + ' dyn·s/cm⁵ (< 700–800): vasoplegia' });
    if (o.svr > 20) f.push({ k: 'svr', t: 'SVR ' + Math.round(o.svrDyn) + ' (> 1,600): vasoconstricted — compensating' });
    if (o.mpap > 20 && o.pvr > 2 && o.paop <= 15) f.push({ k: 'ph', t: 'Pre-capillary pulmonary hypertension: mPAP ' + o.mpap.toFixed(0) + ', PVR ' + o.pvr.toFixed(1) + ' WU, PAOP ' + o.paop.toFixed(0) });
    if (o.mpap > 20 && o.paop > 15) f.push({ k: 'ph', t: (o.pvr > 2 ? 'Combined pre- and post-capillary' : 'Isolated post-capillary') + ' pulmonary hypertension: PAOP ' + o.paop.toFixed(0) + ', PVR ' + o.pvr.toFixed(1) });
    if (o.dpg >= 7 && o.paop > 15) f.push({ k: 'dpg', t: 'DPG ' + o.dpg.toFixed(0) + ' (≥ 7): a pre-capillary component on top of the left heart' });
    if (o.tapse < 17) f.push({ k: 'tapse', t: 'TAPSE ' + o.tapse.toFixed(0) + ' mm (< 17): RV systolic dysfunction' });
    if (o.tapsePasp < 0.31 && o.pas > 30) f.push({ k: 'coupling', t: 'TAPSE/PASP ' + o.tapsePasp.toFixed(2) + ' (< 0.31): RV–PA uncoupling' });
    if (o.rvlv > 1) f.push({ k: 'rvlv', t: 'RV:LV ' + o.rvlv.toFixed(2) + ' (> 1): a dilated right ventricle' });
    if (o.paopV - o.paop > 10) f.push({ k: 'vwave', t: 'v wave ' + o.paopV.toFixed(0) + ' on a mean of ' + o.paop.toFixed(0) + ': mitral regurgitation (or a very stiff atrium)' });
    if (Math.abs(o.rap - o.paop) < 5 && Math.abs(o.rap - o.pad) < 5 && o.rap > 12) f.push({ k: 'equal', t: 'Equalised diastolic pressures (RA ≈ PAd ≈ PAOP ≈ ' + o.rap.toFixed(0) + '): tamponade or constriction' });
    if (o.svo2 < 0.6) f.push({ k: 'svo2', t: 'SvO2 ' + Math.round(o.svo2 * 100) + '% (< 60): the tissues are extracting more' });
    if (o.svo2 > 0.8) f.push({ k: 'svo2', t: 'SvO2 ' + Math.round(o.svo2 * 100) + '% (> 80): the tissues are not extracting — shunting, sepsis, cyanide, or a very high output' });
    if (o.map < 65) f.push({ k: 'map', t: 'MAP ' + o.map.toFixed(0) + ' (< 65)' });
    if (o.pp < 10 && o.p.ecmo > 0) f.push({ k: 'pp', t: 'Pulse pressure ' + o.pp.toFixed(0) + ' on VA ECMO: the aortic valve is not opening — LV distension' });
    return f;
  }
  function forrester(o) { const wet = o.paop > 18, cold = o.ci < 2.2; return { wet: wet, cold: cold, quadrant: cold ? (wet ? 'IV: cold and wet' : 'III: cold and dry') : (wet ? 'II: warm and wet' : 'I: warm and dry') }; }
  function phClass(o) {
    if (o.mpap <= 20) return 'no pulmonary hypertension';
    if (o.paop <= 15) return o.pvr > 2 ? 'pre-capillary PH' : 'unclassified PH (mPAP > 20 with PVR ≤ 2 and PAOP ≤ 15)';
    return o.pvr > 2 ? 'combined pre- and post-capillary PH' : 'isolated post-capillary PH';
  }
  function signature(o) {
    const low = o.ci < 2.2, lowish = o.ci < 2.3;
    const equal = Math.abs(o.rap - o.paop) < 5 && Math.abs(o.rap - o.pad) < 5 && o.rap > 12;
    if (equal && low) return { id: 'tamponade', t: 'Obstructive — pericardial pattern', why: 'Low output with equalised right- and left-sided diastolic pressures: the ventricles are filling against the same constraint. Tamponade (no y descent) or constriction (deep y, dip-and-plateau) — the waveform and the echo decide.' };
    if (low && o.paop <= 15 && o.pvr > 3 && o.mpap > 25 && o.rap >= 6) return { id: 'obstructive', t: 'Obstructive / pre-capillary — the RV against a closed pulmonary bed', why: 'Low output, a high right atrial pressure, a raised PA pressure with a normal or low wedge and a high PVR: the right ventricle cannot push flow through the lung. Massive PE, decompensated pulmonary hypertension, or a ventilator and a hypoxic, acidotic bed.' };
    if (o.svr < 11.5 && o.lvef < 0.4 && o.ci < 3.2) return { id: 'mixed', t: 'Mixed — vasoplegia with a failing pump', why: 'A low resistance and a poorly contracting ventricle together: sepsis with septic cardiomyopathy, or cardiogenic shock after days of inflammation. Each component needs its own treatment.' };
    if (low && o.rap >= 8 && o.raPaop > 0.86 && o.paop <= 18) return { id: 'rv', t: 'Cardiogenic — RV-dominant', why: 'Low output with a right atrial pressure that rivals or exceeds the wedge (RAP:PAOP > 0.86) and a low PAPi: the right ventricle is failing to fill the left. RV infarct, RV failure after cardiac surgery or an LVAD, sepsis on a strained RV.' };
    if (low && o.paop > 18) return { id: 'lv', t: 'Cardiogenic — LV-dominant (cold and wet)', why: 'Low output with a congested left heart: the left ventricle cannot move its preload forward. Infarction, myocarditis, decompensated cardiomyopathy, valve failure. Forrester IV.' };
    if (lowish && o.paop < 10 && o.rap < 7 && o.svr > 14) return { id: 'hypo', t: 'Hypovolaemic', why: 'Low output with empty ventricles on both sides and a high resistance: the circulation is short of volume. Haemorrhage, dehydration, capillary leak, over-diuresis.' };
    if (o.svr < 9 && o.ci >= 2.5) return { id: 'distributive', t: 'Distributive (vasoplegic, high output)', why: 'A high or normal output with a low resistance and a normal or high mixed venous saturation: the vessels are open and the tissues bypassed. Sepsis, anaphylaxis, post-bypass vasoplegia, adrenal crisis, neurogenic — or the high-output state of anaemia, cirrhosis and thyrotoxicosis.' };
    if (o.svr < 10 && low) return { id: 'mixed', t: 'Mixed — vasoplegia with a low output', why: 'A low resistance and a low output together: look for the failing pump, the empty circulation, or the obstruction behind the vasoplegia.' };
    if (o.p.ecmo > 0 && o.pp < 10 && o.paop > 18) return { id: 'ecmodist', t: 'LV distension on VA ECMO', why: 'The circuit restores the pressure and the aortic valve no longer opens: a flat arterial trace, a rising wedge, a ventricle that is stretched, not emptied. Vent it (Impella, septostomy, IABP, a pigtail) or the lungs flood and the cavity clots.' };
    if (o.mpap > 20 && o.paop > 15 && o.ci >= 2.2) return { id: 'postcap', t: 'Congested, perfusing — post-capillary pulmonary hypertension', why: 'Output preserved, left-sided filling pressure high, PA pressure raised in proportion: the lung is wet because the left heart is full. HFpEF or HFrEF, mitral disease. Forrester II.' };
    if (o.mpap > 20 && o.paop <= 15 && o.pvr > 2 && o.ci >= 2.2) return { id: 'precap', t: 'Compensated pre-capillary pulmonary hypertension', why: 'A high PA pressure with a normal wedge and a raised PVR while the output holds: the RV has adapted. PAH, CTEPH, lung disease.' };
    if (o.ci >= 2.2 && o.map >= 65) return { id: 'ok', t: 'Perfusing', why: 'Output and pressure adequate; the filling pressures say how much reserve there is.' };
    return { id: 'low', t: 'Low output, undifferentiated', why: 'Output low without a clean signature: look at the trend, the echo, and each number’s pair.' };
  }

  /* ---------- the waveforms: pressure at a phase of the cardiac cycle (0 at the R wave), per position ---------- */
  /* v8.8: drawn by the waveform engine (waves.js), in which every landmark has a time in milliseconds after the R wave: the pulmonary artery
     and arterial beats no longer fall to the diastolic pressure at the end of systole, the right ventricle fills from near zero, and the atrial
     waves keep their distance from the ECG at any heart rate (the wedge 140 ms later than the right atrium). */
  const WV = root.PFT_WAVES || (typeof require === 'function' ? require('./waves.js') : null);
  const bump = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));
  const trc = { key: null, c: null };
  function traceCtx(o) {
    const p = o.p, hr = Math.round(clamp(p.hr || 75, 30, 180)), tam = p.pperi > 8, con = p.constrict > 0, trg = p.tr || 0, mrg = p.mr || 0;
    const key = [hr, o.rap, o.paop, o.pas, o.pad, o.rvsys, o.rvedp, o.sbp, o.dbp, o.mpap, trg, mrg, p.rvStiff, p.lvStiff, tam, con, p.iabp].map(x => typeof x === 'number' ? x.toFixed(2) : String(x)).join('|');
    if (trc.key === key) return trc.c;
    const tm = WV.timing(hr), B = WV.beats({ hr: hr, rhythm: 'sinus' }, 4 * tm.T + 2), R0 = B.v.filter(b => b.tR >= tm.T)[0].tR;
    const ra = { a: 2.2 + 1.6 * ((p.rvStiff || 1) - 1) + 0.08 * Math.max(0, o.mpap - 20), c: 1.2, x: trg > 0.5 ? -1.6 * trg : 1.8 + (con ? 2.2 : 0) + (tam ? 1.6 : 0), v: 2 + 4 * trg + (tam ? -1 : 0) + (con ? 1 : 0), y: tam ? 0.3 : (con ? 6 : 2.2 + 3 * trg), plateau: con ? 1 : 0 };
    const wd = { a: 1.6 + 1.8 * Math.max(0, (p.lvStiff || 1) - 1), c: 0, x: mrg > 0.4 ? -1.2 * mrg : 1.5, v: 2 + 6 * mrg, y: 1.6 + 5 * mrg };
    const mean = (sh, lag) => { let m = 0; for (let i = 0; i < 160; i++) m += WV.atrial(B, tm, R0 + i / 160 * tm.T, sh, lag); return m / 160; };
    const art = { hr: hr, sbp: o.sbp, dbp: o.dbp, site: 'radial' };
    trc.key = key; trc.c = { tm: tm, B: B, R0: R0, ra: ra, wd: wd, raOff: o.rap - mean(ra, 0), wdOff: o.paop - mean(wd, 0.14), pc: WV.paCtx(tm, tm.T, {}), art: art, ac: WV.artCtx(art), con: con };
    return trc.c;
  }
  function trace(o, pos, t) {
    const p = o.p; t = ((t % 1) + 1) % 1;
    const c = traceCtx(o), T = c.tm.T, d = t * T;
    if (pos === 'ecg') return 10 * WV.ecgAt(c.B, c.tm, c.R0 + d, { rhythm: 'sinus' });
    if (pos === 'ra') return Math.max(-2, c.raOff + WV.atrial(c.B, c.tm, c.R0 + d, c.ra, 0));
    if (pos === 'rv') return WV.rvBeat(d, T, c.tm, { rvedp: o.rvedp, pas: o.rvsys, pad: Math.min(o.pad, o.rvsys - 2), plateau: c.con });
    if (pos === 'pa') { let tau = d - (c.tm.pep - 0.005); if (tau < 0) tau += T; return o.pad + (o.pas - o.pad) * WV.artBeat(c.pc, tau, 1, 0); }
    if (pos === 'paop') return Math.max(-2, c.wdOff + WV.atrial(c.B, c.tm, c.R0 + d, c.wd, 0.14));
    if (pos === 'art') {
      let tau = d - c.tm.pep - c.ac.delay; if (tau < 0) tau += T;
      const aug = p.iabp ? (o.sbp - o.dbp) * 0.95 * bump(tau, c.ac.tn + 0.13, 0.085) * (tau > c.ac.tn - 0.02 ? 1 : 0) : 0;
      return o.dbp + (o.sbp - o.dbp) * WV.artBeat(c.ac, tau, 1, 0) + aug;
    }
    return 0;
  }
  /* the breath: the pleural swing the catheter sees (mm Hg), spontaneous breathing pulls, the ventilator pushes */
  function breath(p, phase) { const s = Math.sin(2 * Math.PI * phase); return p.vent === 'ppv' ? 2.5 * Math.max(0, s) + 0.2 * p.peep * 0.35 : -3.5 * Math.max(0, s); }

  /* ---------- interventions ---------- */
  const INTERVENTIONS = [
    ['fluid', 'Crystalloid 500 mL', (p) => Object.assign({}, p, { pms: p.pms + 1.6, hb: Math.max(6, p.hb - 0.3) }), 'Raises the mean systemic pressure: more venous return if the ventricles can take it, more congestion if they cannot'],
    ['blood', 'Transfuse 1 unit', (p) => Object.assign({}, p, { pms: p.pms + 1.2, hb: Math.min(16, p.hb + 1) }), 'Volume and oxygen content'],
    ['diurese', 'Furosemide (−1 L)', (p) => Object.assign({}, p, { pms: Math.max(1, p.pms - 2) }), 'Lowers the mean systemic pressure and the filling pressures'],
    ['norepi', 'Norepinephrine', (p) => Object.assign({}, p, { svr: p.svr + 3, pms: p.pms + 1.2, lvContr: p.lvContr + 0.05, rvContr: p.rvContr + 0.04, hr: p.hr + 2 }), 'α-constriction (SVR and venous tone → Pms) with some β1'],
    ['vaso', 'Vasopressin', (p) => Object.assign({}, p, { svr: p.svr + 2.5, pms: p.pms + 0.8 }), 'Pure vasoconstriction, spares the pulmonary bed'],
    ['dobut', 'Dobutamine', (p) => Object.assign({}, p, { lvContr: p.lvContr * 1.5 + 0.08, rvContr: p.rvContr * 1.4 + 0.06, svr: Math.max(4, p.svr - 2), hr: p.hr + 12 }), 'β1 inotropy with β2 vasodilation and chronotropy'],
    ['milrinone', 'Milrinone', (p) => Object.assign({}, p, { lvContr: p.lvContr * 1.4 + 0.07, rvContr: p.rvContr * 1.35 + 0.06, svr: Math.max(4, p.svr - 3), pvr: Math.max(0.3, p.pvr * 0.75), hr: p.hr + 5 }), 'Inodilator: contractility up, SVR and PVR down (hypotension in the vasoplegic)'],
    ['epi', 'Epinephrine', (p) => Object.assign({}, p, { lvContr: p.lvContr * 1.7 + 0.1, rvContr: p.rvContr * 1.5 + 0.08, svr: p.svr + 1.5, pms: p.pms + 1, hr: p.hr + 20 }), 'β1 + β2 + α: contractility, rate, some constriction; lactate rises on its own'],
    ['ino', 'Inhaled NO / prostacyclin', (p) => Object.assign({}, p, { pvr: Math.max(0.3, p.pvr * 0.6) }), 'Selective pulmonary vasodilation: PVR down, SVR untouched'],
    ['ntg', 'Nitroglycerin', (p) => Object.assign({}, p, { pms: Math.max(1, p.pms - 2), svr: Math.max(4, p.svr - 2) }), 'Venodilator: lowers the filling pressures first'],
    ['nitro', 'Nitroprusside', (p) => Object.assign({}, p, { svr: Math.max(4, p.svr - 4), pms: Math.max(1, p.pms - 0.6) }), 'Arteriolar dilation: afterload down, forward flow up if the ventricle is full'],
    ['iabp', 'IABP', (p) => Object.assign({}, p, { iabp: p.iabp ? 0 : 1 }), 'Diastolic augmentation, systolic unloading: afterload down 10–15%, coronary flow up'],
    ['impella', 'Impella 3 L/min', (p) => Object.assign({}, p, { impella: p.impella ? 0 : 3, ecmo: p.ecmo > 0 && !p.impella ? Math.max(2, p.ecmo - 1.5) : p.ecmo }), 'Unloads the LV directly into the aorta (and lets the ECMO flow come down)'],
    ['ecmo', 'VA ECMO 4 L/min', (p) => Object.assign({}, p, { ecmo: p.ecmo ? 0 : 4 }), 'Drains the right atrium, returns to the artery: perfusion restored, the LV loaded'],
    ['ecmoup', 'ECMO flow +1 L/min', (p) => Object.assign({}, p, { ecmo: p.ecmo > 0 ? Math.min(7, p.ecmo + 1) : 0 }), 'More circuit flow: more pressure, more afterload on the left ventricle, the aortic valve shut more firmly'],
    ['ecmodown', 'ECMO flow −1 L/min', (p) => Object.assign({}, p, { ecmo: p.ecmo > 0 ? Math.max(1.5, p.ecmo - 1) : 0 }), 'Less circuit flow: less afterload, the ventricle ejects again if it can — at the cost of perfusion'],
    ['lysis', 'Thrombolysis / embolectomy', (p) => Object.assign({}, p, { pvr: Math.max(0.6, p.pvr * 0.4) }), 'Opens the pulmonary bed'],
    ['tap', 'Pericardiocentesis', (p) => Object.assign({}, p, { pperi: 0, pms: Math.max(4, p.pms - 8), svr: Math.max(6, p.svr - 7), hr: Math.max(60, p.hr - 30) }), 'Removes the constraint; the sympathetic drive stands down'],
    ['ppv', 'Intubate (PPV, PEEP 8)', (p) => Object.assign({}, p, { vent: 'ppv', peep: 8, pms: Math.max(1, p.pms - 1.2), svr: Math.max(4, p.svr - 2), pvr: p.pvr * (p.pvr > 3 ? 1.15 : 1) }), 'Positive pressure: venous return down, LV afterload down, RV afterload up — and the induction drugs'],
    ['pace', 'Pace / rate up to 90', (p) => Object.assign({}, p, { hr: Math.max(p.hr, 90) }), 'Rate is a determinant of output when the stroke volume is fixed'],
    ['rate', 'Rate control to 80', (p) => Object.assign({}, p, { hr: Math.min(p.hr, 80), lvContr: p.lvContr + 0.05 }), 'More time to fill when the ventricle is stiff']
  ];
  function apply(p, id) { const it = INTERVENTIONS.filter(x => x[0] === id)[0]; return it ? it[2](Object.assign({}, PATIENT, p)) : Object.assign({}, p); }

  /* ---------- presets ---------- */
  const PRESETS = [
    { id: 'normal', title: 'Normal', p: {}, note: 'RA 3, PA 23/10, PAOP 8, CI 3.0, SVR about 1,300: the baseline the others deviate from.' },
    { id: 'hypo', title: 'Hypovolaemic shock', p: { pms: 4.6, hr: 118, svr: 24, hb: 8, vo2: 170, rvr: 1.4 }, note: 'Haemorrhage: empty on both sides, output low, resistance high, the mixed venous saturation low.' },
    { id: 'sepsis', title: 'Septic shock, warm', p: { svr: 5.5, pms: 10, rvr: 0.6, hr: 115, lvContr: 1.1, hb: 10.5, vo2: 280 }, note: 'Vasoplegia with capillary leak: a high output that still does not meet the demand, a low resistance, a venous saturation that is normal or high because the tissues cannot extract.' },
    { id: 'septiccm', title: 'Septic cardiomyopathy', p: { svr: 11, pms: 12, rvr: 1.1, hr: 122, lvContr: 0.18, rvContr: 0.4, lvStiff: 1.2, hb: 10, vo2: 300 }, note: 'The vessels are open and the pump is failing: a low output despite the low resistance; norepinephrine alone leaves the output low.' },
    { id: 'lv', title: 'Cardiogenic shock, LV', p: { lvContr: 0.21, rvContr: 0.6, lvStiff: 1.0, svr: 18, hr: 108, pms: 10.5, rvr: 1.4 }, note: 'Anterior infarction: cold and wet — low output, a high wedge, a high resistance, a low SvO2.' },
    { id: 'rvmi', title: 'RV infarction', p: { rvContr: 0.25, rvStiff: 1.3, lvContr: 0.9, pms: 12, svr: 17, hr: 58, rvr: 1.2 }, note: 'Inferior infarction with RV involvement: the right atrial pressure rivals the wedge, the wedge is low, PAPi collapses, the lungs are clear.' },
    { id: 'pe', title: 'Massive pulmonary embolism', p: { pvr: 6.5, rvContr: 0.55, rvStiff: 1.2, pms: 12, hr: 122, svr: 16, rvr: 1.2 }, note: 'An acute obstruction the unprepared RV cannot overcome: RA up, PA up but not very (an RV that has never trained cannot make 60), wedge normal, output down.' },
    { id: 'tamponade', title: 'Tamponade', p: { pperi: 15, pms: 19.5, hr: 126, svr: 21, rvr: 1.3 }, note: 'The ventricles fill against the pericardial pressure: RA ≈ PAd ≈ PAOP, no y descent, output down, pulsus paradoxus.' },
    { id: 'constrict', title: 'Constrictive pericarditis', p: { constrict: 1, pperi: 0, pms: 17, hr: 90, svr: 19, rvr: 1.1, lvContr: 1.1, rvContr: 1.1 }, note: 'The late-diastolic constraint: equalised pressures, a deep y descent (the W), dip-and-plateau in the ventricle, Kussmaul’s sign.' },
    { id: 'pah', title: 'Decompensated PAH', p: { pvr: 18, rvContr: 1.4, rvStiff: 2.2, lvStiff: 2.4, pms: 17, hr: 104, svr: 17, hb: 12, rvr: 1.3 }, note: 'A trained but exhausted RV: PA pressure very high, RA high, wedge normal, output falling, TAPSE down, the septum flattened.' },
    { id: 'hfpef', title: 'HFpEF with post-capillary PH', p: { lvStiff: 3.2, lvContr: 1.05, pvr: 2.0, rvStiff: 1.3, pms: 12, hr: 82, svr: 20, bsa: 2.0 }, note: 'A stiff left ventricle: a high wedge with a preserved output; the PA pressure follows the wedge (TPG and DPG normal).' },
    { id: 'mr', title: 'Acute severe mitral regurgitation', p: { mr: 3, lvContr: 0.3, rvContr: 0.8, pms: 10.5, hr: 116, svr: 16, rvr: 1.3 }, note: 'Papillary muscle rupture: giant v waves on the wedge, pulmonary oedema, forward output low although the ventricle contracts well.' },
    { id: 'tr', title: 'Severe tricuspid regurgitation', p: { tr: 3, rvContr: 0.55, rvStiff: 1.8, pms: 15, hr: 90, rvr: 1.1, svr: 17 }, note: 'Ventricularised right atrial trace (a big v wave, the x descent lost), a congested liver, a thermodilution that cannot be trusted.' },
    { id: 'ecmodist', title: 'LV distension on VA ECMO', p: { lvContr: 0.2, lvStiff: 1.2, rvContr: 0.5, ecmo: 4.5, svr: 18, pms: 8.5, hr: 100 }, note: 'The circuit restores the pressure and loads the ventricle: wedge rising, pulse pressure gone, the valve shut.' },
    { id: 'hyper', title: 'Hyperdynamic (anaemia, fever, cirrhosis)', p: { svr: 8.5, hr: 105, lvContr: 1.2, hb: 7.5, pms: 9, vo2: 300 }, note: 'High output, low resistance, normal filling: the circulation of a low oxygen content or an arteriovenous shunt.' }
  ];
  function preset(id) { const pr = PRESETS.filter(x => x.id === id)[0]; return pr ? { p: Object.assign({}, PATIENT, pr.p), title: pr.title, note: pr.note } : null; }

  /* ================================================================== the scenarios ================================================================== */
  /* each: the story, the preset behind the numbers, the two questions (the diagnosis, the first move) with verdicts, and the numbers recomputed after the move */
  const SCENARIOS = [
    { id: 'stemi', title: 'Cold, wet and quiet', preset: 'lv',
      who: '64-year-old, 6 hours of chest pain, anterior ST elevation, now in the lab after PCI of a proximal LAD. BP 86/62, HR 108, cool mottled legs, confused; crackles to the mid-zones; lactate 4.6; urine 10 mL/h. Echo: LVEF 20%, dilated LV, no effusion, RV moving.',
      q1: 'Which shock?', a1: [['lv', 'Cardiogenic, LV-dominant (cold and wet)', 'best', 'Low output with a congested left heart: a wedge above 18 and an index below 2.2 is Forrester IV — exactly what the cool legs, the crackles and the lactate describe.'], ['rv', 'Cardiogenic, RV-dominant', 'wrong', 'The RV moves on echo, the lungs are wet (a failing RV leaves them dry), and the wedge is high — this is the left ventricle.'], ['hypo', 'Hypovolaemic', 'wrong', 'Crackles and a wedge in the twenties are the opposite of empty.'], ['distributive', 'Distributive', 'wrong', 'The legs are cold and the resistance is high: the vessels are clamped down, not open.']],
      q2: 'First move after revascularisation?', a2: [['norepi', 'best', 'The perfusion pressure first: norepinephrine to a MAP ≥ 65 (coronary and renal perfusion), then build the output with an inotrope. Dopamine lost to norepinephrine in SOAP II; epinephrine makes more lactate and arrhythmia.'], ['dobut', 'reasonable', 'An inotrope is coming, but at a systolic of 86 dobutamine’s β2 vasodilation can drop the pressure further; pair it with norepinephrine or start the pressor first.'], ['fluid', 'wrong', 'A wedge of 27 with crackles: more preload goes into the lungs, not forward. Fluids in LV shock are for the empty ventricle, which this is not.'], ['iabp', 'poor', 'IABP-SHOCK II showed no mortality benefit from routine balloon pumping; it is a reasonable adjunct for mechanical complications or as a bridge, not the first move. If escalation is needed, Impella (DanGer Shock) or VA ECMO with a plan.']] },
    { id: 'rvmi', title: 'Clear lungs, full neck veins', preset: 'rvmi',
      who: '58-year-old, inferior ST elevation with ST elevation in V4R. BP 86/48, HR 58, JVP to the angle of the jaw, lungs clear, no oedema. Nitroglycerin in the ambulance dropped the pressure to 60. Echo: dilated hypokinetic RV, small underfilled LV, septum flat in diastole.',
      q1: 'Which shock?', a1: [['rv', 'Cardiogenic, RV-dominant', 'best', 'High right atrial pressure with a low or normal wedge, lungs clear, a flat septum, output low: the right ventricle cannot fill the left. RAP:PAOP > 0.86 and PAPi < 0.9 are the catheter’s version.'], ['lv', 'Cardiogenic, LV-dominant', 'wrong', 'The lungs are clear and the LV is small and empty: the left ventricle is starved, not failing.'], ['tamponade', 'Tamponade', 'poor', 'Full neck veins with a low output do raise it — but the echo shows no effusion and the pressures are not equalised; the wedge is low.'], ['hypo', 'Hypovolaemic', 'wrong', 'A JVP at the jaw is not hypovolaemia — though the left heart is underfilled, which is why fluids help here.']],
      q2: 'First move?', a2: [['fluid', 'best', 'Preload for the failing RV: cautious boluses (250–500 mL) watching the RAP (aim 10–14) and the output; stop when the RAP climbs without the pressure. Then rhythm (AV sequential pacing for the heart block that often comes with it), reperfusion, and an inotrope (dobutamine) if the output stays low. No nitrates, no diuretics.'], ['dobut', 'reasonable', 'Dobutamine helps a failing RV — after it has been filled. At an RAP of 8 with a wedge of 4 the first litre does more.'], ['ntg', 'wrong', 'Venodilators empty the already starved left heart: that is what the ambulance just showed.'], ['norepi', 'reasonable', 'A perfusion pressure is needed for the RV’s own coronary flow and norepinephrine is the pressor of choice for RV failure; it does not replace the volume and the rate.']] },
    { id: 'sepsis', title: 'Warm, bounding, and still in shock', preset: 'sepsis',
      who: '71-year-old, urosepsis. Temperature 39.4, HR 118, BP 92/36 after 2 L of crystalloid, warm flushed limbs, brisk capillary refill, lactate 3.8; ScvO2 from the central line 78%. Echo: hyperdynamic LV, small IVC that collapses.',
      q1: 'Which shock?', a1: [['distributive', 'Distributive (vasoplegic)', 'best', 'High output, low resistance, a high venous saturation (the tissues cannot extract through shunted and dysfunctional microcirculation): the vessels are open. The low diastolic pressure is the resistance talking.'], ['hypo', 'Hypovolaemic', 'poor', 'Leak makes these patients relatively empty — the collapsing IVC says so — but after 2 L the dominant physiology is vasoplegia: resuscitate and constrict together.'], ['lv', 'Cardiogenic', 'wrong', 'A hyperdynamic ventricle and an index above 3 is not pump failure (yet: watch for septic cardiomyopathy at 24–48 h).'], ['rv', 'RV-dominant', 'wrong', 'No congestion, no RV failure.']],
      q2: 'First move?', a2: [['norepi', 'best', 'Norepinephrine now, through a peripheral line if the central one is not in, to a MAP of 65, alongside the fluid that the leak still needs (30 mL/kg early, then by response); vasopressin as the second agent; antibiotics and source control within the hour.'], ['fluid', 'reasonable', 'More volume is part of it (the IVC collapses), but a diastolic of 36 after 2 L needs a constrictor too; fluid alone is how the lungs fill.'], ['dobut', 'wrong', 'There is nothing wrong with the contractility and dobutamine dilates: the pressure falls further.'], ['vaso', 'reasonable', 'Vasopressin is the usual second pressor (VASST, VANISH), catecholamine-sparing; as a lone first agent it is less titratable.']] },
    { id: 'pe', title: 'Sudden collapse with a clear chest film', preset: 'pe',
      who: '49-year-old, day 5 after a knee replacement, sudden syncope. BP 84/60, HR 122, SpO2 86% on 15 L, JVP raised, lungs clear, chest film clear. Echo: dilated RV larger than the LV, McConnell sign, TAPSE 11, septal flattening; CT confirms saddle emboli.',
      q1: 'Which shock?', a1: [['obstructive', 'Obstructive (acute RV failure against an obstructed bed)', 'best', 'A sudden pulmonary vascular obstruction the untrained RV cannot overcome: RA high, PA moderately high (an acute RV cannot generate more than ~ 40–50 systolic), wedge normal, output down, hypoxaemia from V/Q mismatch and a patent foramen.'], ['rv', 'Cardiogenic, RV-dominant (primary)', 'reasonable', 'The right ventricle is indeed the failing chamber, but the cause is the afterload: calling it obstructive points to the treatment (open the bed), not inotropes alone.'], ['hypo', 'Hypovolaemic', 'wrong', 'The RV is dilated and the JVP is up: there is too much volume behind the obstruction, not too little.'], ['lv', 'LV-dominant', 'wrong', 'The left ventricle is small and underfilled: it has nothing to pump.']],
      q2: 'First move?', a2: [['lysis', 'best', 'High-risk PE: systemic thrombolysis (or catheter-directed therapy / surgical embolectomy where available and where lysis is contraindicated) to open the bed; norepinephrine to hold the perfusion pressure meanwhile; VA ECMO as the bridge in collapse.'], ['fluid', 'wrong', 'Volume distends an already dilated RV, pushes the septum further into the LV and lowers the output (ventricular interdependence): a cautious 250 mL at most if the RV is small, never litres.'], ['norepi', 'reasonable', 'Norepinephrine is the right pressor (RV coronary perfusion, some inotropy) and buys the time; it does not remove the clot.'], ['ppv', 'poor', 'Intubation here is dangerous: induction drops the preload and the sympathetic tone, positive pressure raises the RV afterload — arrests happen at intubation. Avoid or prepare (pressor running, awake if possible).']] },
    { id: 'tamponade', title: 'Equal on every port', preset: 'tamponade',
      who: '66-year-old, day 2 after CABG, chest drains stopped draining overnight. BP 82/66 with a pulsus paradoxus of 18 mm Hg, HR 126, JVP high, urine falling. The catheter left in from theatre: RA 16, PA 22/18, PAOP 16, CI 1.4. Echo through a difficult window: a posterior collection, the RA collapsing in systole.',
      q1: 'What is this?', a1: [['tamponade', 'Tamponade (obstructive — pericardial)', 'best', 'Equalisation of the diastolic pressures (RA ≈ PAd ≈ PAOP ≈ 16–18), a low output, pulsus paradoxus, a collection on echo after cardiac surgery with drains that stopped: the chambers are filling against the pericardial pressure. On the RA trace the y descent is gone.'], ['rv', 'RV failure', 'poor', 'Post-cardiotomy RV failure is real and also raises the RA — but it does not equalise the wedge with it, and the echo shows the cause.'], ['hypo', 'Hypovolaemia', 'wrong', 'The filling pressures are high; the ventricles are small because they cannot fill, not because there is nothing to fill them.'], ['lv', 'LV failure', 'wrong', 'The wedge equals the RA; LV failure raises it above.']],
      q2: 'First move?', a2: [['tap', 'best', 'Relieve the pericardium: re-exploration (or a drain under echo for a drainable collection) — tamponade is a surgical diagnosis after surgery. Volume and a pressor only while the team assembles.'], ['fluid', 'reasonable', 'Volume raises the filling pressure above the pericardial pressure and buys minutes; it is a bridge, not a treatment.'], ['diurese', 'wrong', 'Diuresis lowers the preload the chambers are fighting to keep: the output collapses.'], ['ppv', 'wrong', 'Positive pressure on a tamponaded heart drops the venous return and can arrest the patient; if intubation is unavoidable, have the drain or the surgeon ready first.']] },
    { id: 'bleed', title: 'Pale and empty', preset: 'hypo',
      who: '45-year-old with a variceal bleed. BP 80/52, HR 118, cool periphery, flat neck veins, Hb 6.8, lactate 5. Catheter from the ICU admission: RA 1, PA 8/3, PAOP 2, CI 1.5, SVR 1,900, SvO2 44%.',
      q1: 'Which shock?', a1: [['hypo', 'Hypovolaemic (haemorrhagic)', 'best', 'Empty on both sides (RA 1, wedge 2), a low output, a resistance that is maximally compensating, a low mixed venous saturation because the tissues are extracting everything: the textbook Swan of haemorrhage.'], ['distributive', 'Distributive', 'wrong', 'Cirrhosis makes a low baseline SVR, but this one is 1,900: the vessels are clamped, not open.'], ['lv', 'Cardiogenic', 'wrong', 'The ventricles are empty, not failing: fill them and they pump.'], ['rv', 'RV-dominant', 'wrong', 'RA 1 is the opposite of RV failure.']],
      q2: 'First move?', a2: [['blood', 'best', 'Blood — balanced transfusion with the massive-transfusion protocol, calcium, warmth — and stop the bleeding (octreotide, endoscopy, balloon or TIPS); permissive hypotension until control; antibiotics in cirrhosis.'], ['fluid', 'reasonable', 'Crystalloid restores the pressure for minutes and dilutes what is left; it is what one gives while the blood arrives, not instead of it.'], ['norepi', 'poor', 'A pressor on an empty circulation squeezes an empty tank: the pressure number improves, the perfusion does not. It has a place during a massive transfusion to hold the pressure, never alone.'], ['dobut', 'wrong', 'The heart is fine; it has nothing to pump.']] },
    { id: 'mixed', title: 'Open vessels, failing pump', preset: 'septiccm',
      who: 'Day 3 of pneumococcal septic shock on norepinephrine 0.6 µg/kg/min and vasopressin. MAP 54, HR 122, cool periphery now, lactate climbing again to 5, ScvO2 46%, urine stopped. Echo: LVEF has fallen from 60% to 25%, RV sluggish, IVC full.',
      q1: 'What is happening?', a1: [['mixed', 'Mixed: vasoplegia with septic cardiomyopathy', 'best', 'The resistance is still low (sepsis) but the output has fallen (a low ScvO2, cool limbs, a full IVC): septic cardiomyopathy at 24–72 h. Each component needs its own agent; the pressor alone leaves the output low and the lactate rising.'], ['distributive', 'Still just distributive', 'wrong', 'A ScvO2 of 46% and cold limbs say the output is now low: the extraction has climbed.'], ['hypo', 'Hypovolaemic', 'wrong', 'The IVC is full and the wedge is high; more fluid goes into the lungs.'], ['lv', 'Pure cardiogenic', 'poor', 'The pump is failing, but the resistance is still low: stopping the pressor would be a mistake.']],
      q2: 'First move?', a2: [['dobut', 'best', 'Add an inotrope to the pressor (dobutamine 2.5–5 µg/kg/min and titrate; milrinone needs the pressure), reassess the output (ScvO2, lactate, VTI) in an hour; no more fluid; consider temporary mechanical support if it fails and the sepsis is treatable.'], ['fluid', 'wrong', 'A full IVC and a wedge of 20: the lungs will fill.'], ['norepi', 'poor', 'More α-constriction raises the pressure number and the afterload on a ventricle that is already failing; the output falls further.'], ['milrinone', 'reasonable', 'An inodilator helps the output and the RV; at a MAP in the fifties on two pressors its vasodilation is the risk — dobutamine first, or milrinone with the pressors ready.']] },
    { id: 'mr', title: 'Giant v waves', preset: 'mr',
      who: '70-year-old, day 4 after an inferior infarction, sudden pulmonary oedema and a new loud pansystolic murmur. BP 88/62, HR 116, SpO2 88% on a non-rebreather, pink froth. Catheter: RA 5, PA 43/37, PAOP mean 34 with v waves to 51, CI 2.2. Echo: flail posterior leaflet, hyperdynamic LV.',
      q1: 'What is this?', a1: [['mr', 'Acute severe mitral regurgitation (papillary muscle rupture)', 'best', 'A giant v wave on the wedge trace (the atrium receives the ventricle’s stroke volume in systole), pulmonary oedema, a low forward output although the ventricle contracts well: acute MR. The PA trace may show the v wave too (a “bifid” PA tracing).'], ['lv', 'Pump failure after the infarct', 'wrong', 'The ventricle is hyperdynamic: it is pumping, backwards.'], ['distributive', 'Sepsis', 'wrong', 'The resistance is high, the froth is pink, and the v waves are diagnostic.'], ['rv', 'RV failure', 'wrong', 'RA 5 against a wedge of 34: the left side is the problem.']],
      q2: 'First move?', a2: [['nitro', 'best', 'Reduce the afterload so the ventricle ejects forward rather than backward (nitroprusside if the pressure allows, otherwise IABP — the one setting where the balloon still earns its keep), non-invasive or invasive ventilation for the oedema, and the surgeon tonight: this is a surgical lesion.'], ['iabp', 'reasonable', 'The balloon pump lowers the afterload and the regurgitant fraction and supports the pressure: a very reasonable first move at a systolic of 88, bridging to surgery.'], ['norepi', 'poor', 'A pure constrictor raises the afterload and the regurgitant fraction: more blood goes backwards into the lungs. If the pressure must be held, a small dose with the IABP.'], ['fluid', 'wrong', 'A wedge of 34 with froth: the left atrium is already full.']] },
    { id: 'pah', title: 'The trained ventricle gives out', preset: 'pah',
      who: '38-year-old with idiopathic PAH on triple therapy, admitted with a week of oedema, abdominal distension and syncope. BP 82/58, HR 104, JVP to the ear with a prominent v wave, pulsatile liver, SpO2 91%. Catheter: RA 13, PA 81/52, PAOP 5, CI 1.7, PVR 18 WU. Echo: huge RV, TAPSE 10, pericardial effusion, D-shaped LV.',
      q1: 'What is this?', a1: [['obstructive', 'Decompensated pre-capillary PH with RV failure', 'best', 'A very high PA pressure (only a chronically trained RV can make 80) with a normal wedge and a huge PVR: the right ventricle has finally run out against its afterload. RA 13 and CI 1.7 are the failure; the effusion and the syncope are the danger signs.'], ['rv', 'RV infarction', 'wrong', 'No infarct; the RV is thick and trained, and the PA pressure says why it failed.'], ['lv', 'LV failure', 'wrong', 'PAOP 5: the left heart is underfilled, not failing.'], ['tamponade', 'Tamponade', 'poor', 'There is an effusion, but the pressures are not equalised (RA 13, PAOP 5) — pericardial effusion in PAH is a marker of RV failure, and draining it can be fatal.']],
      q2: 'First move?', a2: [['ino', 'best', 'Lower the afterload the RV faces: inhaled NO or inhaled prostacyclin, intravenous prostacyclin uptitration, correct hypoxia and acidosis; cautious diuresis for the congestion (the RV is overfilled, RAP 13), norepinephrine for the perfusion pressure, dobutamine or milrinone for the output; the transplant or expert centre on the phone. Avoid intubation and tachyarrhythmia.'], ['fluid', 'wrong', 'RAP 13 with a D-shaped LV: more volume dilates the RV further and starves the LV.'], ['diurese', 'reasonable', 'Decongestion is part of the plan (the RV works better at RAP 8–10 than 13), gently and with the pressure watched; it does not address the afterload.'], ['ppv', 'wrong', 'Intubation of a decompensated PAH patient is the commonest way they arrest: induction hypotension and positive pressure on the RV.']] },
    { id: 'hfpef', title: 'Breathless with a normal ejection fraction', preset: 'hfpef',
      who: '76-year-old woman, hypertensive, obese, admitted with dyspnoea and oedema. BP 138/92, HR 82, SpO2 90%. Echo: LVEF 62%, LA dilated, E/e′ 18, RVSP 44, TAPSE 19. Catheter: RA 7, PA 41/25 (mean 30), PAOP 21, CI 2.6, PVR 1.9 WU, DPG 4.',
      q1: 'How do you classify the haemodynamics?', a1: [['postcap', 'Post-capillary pulmonary hypertension (HFpEF)', 'best', 'A high wedge (21) with a PA pressure raised in proportion (mPAP 30), a modest PVR and a DPG of 4: the lung is wet because the stiff left ventricle fills at a high pressure. Combined pre- and post-capillary only when the PVR climbs above 2 with a DPG ≥ 7 or a TPG > 12.'], ['precap', 'Pre-capillary PH (PAH)', 'wrong', 'PAOP 21 excludes group 1 by definition; PAH therapy in HFpEF (RELAX, MELODY) causes harm.'], ['lv', 'Cardiogenic shock', 'wrong', 'The output and the pressure are fine; this is congestion, not shock — Forrester II.'], ['hypo', 'Volume depletion', 'wrong', 'The wedge is 21.']],
      q2: 'First move?', a2: [['diurese', 'best', 'Decongest: loop diuretic to a wedge in the teens, blood pressure control, treat the triggers (AF, ischaemia, salt); SGLT2 inhibitor and GLP-1 agonist for the long run (EMPEROR-Preserved, STEP-HFpEF). Reassess the PVR once dry — most of it will have gone.'], ['ino', 'wrong', 'Pulmonary vasodilators in post-capillary PH flood the lungs and have failed in trials.'], ['fluid', 'wrong', 'The problem is too much.'], ['nitro', 'reasonable', 'Vasodilation helps the hypertensive, congested patient acutely (nitrates), but the diuretic does the decongesting.']] },
    { id: 'ecmodist', title: 'A perfect pressure and a silent ventricle', preset: 'ecmodist',
      who: 'Hour 8 of peripheral VA ECMO at 4.5 L/min for fulminant myocarditis. MAP 85 on no pressors, lactate clearing. The arterial trace is flat: pulse pressure 2. Catheter: RA 4, PA 33/32, PAOP 32. Echo: LV dilated, EF < 10%, the aortic valve does not open, smoke in the cavity; new frothy secretions.',
      q1: 'What is this?', a1: [['lv', 'LV distension on VA ECMO', 'best', 'The circuit’s retrograde flow has shut the aortic valve; bronchial, Thebesian and residual flow fill a ventricle that cannot eject: the wedge climbs past 30, the pulse pressure vanishes, the lung floods and the blood stagnates. The MAP is the pump’s, not the heart’s.'], ['distributive', 'Vasoplegia', 'wrong', 'MAP 85 with no pressor is not vasoplegia; the numbers that matter are the wedge and the pulse pressure.'], ['rv', 'RV failure', 'wrong', 'The RA is 4 and the circuit drains the right heart; the problem is on the left.'], ['hypo', 'Hypovolaemia', 'wrong', 'A wedge of 32 is not hypovolaemia; the small pulse pressure here is a closed valve, not an empty ventricle.']],
      q2: 'First move?', a2: [['impella', 'best', 'Vent the ventricle: Impella (ECPELLA) if there is no LV thrombus, otherwise an atrial septostomy or a surgical vent; meanwhile reduce the circuit flow to the lowest that perfuses, afterload reduction and an inotrope to get the valve opening, PEEP for the oedema, no volume, full anticoagulation.'], ['iabp', 'reasonable', 'A balloon pump adds pulsatility and lowers the afterload: a modest vent, often the first step while the Impella is arranged.'], ['fluid', 'wrong', 'The ventricle is distended; volume makes it worse.'], ['ecmoup', 'poor', 'More flow raises the aortic pressure and holds the valve shut; the wedge may even dip as the circuit drains more of the venous return, but the ventricle still does not eject and the blood in it still stagnates — a better-looking number, not a vented heart. Reducing the flow, if the perfusion allows, is the direction.']] }
  ];

  /* ================================================================== the content ================================================================== */
  T.hemo_intro = { title: 'Pressure, flow and resistance', kicker: 'The circulation as a pump, a circuit and the numbers that describe them', blocks: [
    { p: 'The circulation is two pumps in series, each pushing blood through a circuit with a resistance, and the whole thing is closed: what the right heart sends, the left heart must pass. Three laws explain almost every number on a haemodynamic sheet. Ohm’s law for flow — pressure difference = flow × resistance — written twice: MAP − RAP = CO × SVR for the body, mPAP − PAOP = CO × PVR for the lung. Starling’s law for the pump — the stroke volume rises with the filling (the end-diastolic volume) until it does not — and Guyton’s for the return: venous return = (mean systemic pressure − right atrial pressure) / venous resistance, so the pump can only move what the veins bring, and a high right atrial pressure is a tax on the return. Everything the catheter measures is a pressure; everything that matters is a flow; resistance is the translation between them.' },
    { h: 'Normal values (adult, supine, at rest)', table: { head: ['Site', 'Pressure (mm Hg)', 'What the number is'], rows: [
      ['Right atrium (RA, CVP)', 'mean 2–6 (a wave 2–7, v wave 2–7)', 'The RV’s filling pressure; the back-pressure on the venous return'],
      ['Right ventricle (RV)', '15–30 systolic / 2–8 end-diastolic', 'Systolic = PA systolic (no pulmonary stenosis); end-diastolic = RA mean'],
      ['Pulmonary artery (PA)', '15–30 / 6–12, mean 10–20', 'Diastolic ≈ PAOP when the PVR is normal (the DPG)'],
      ['Pulmonary artery occlusion (PAOP, “wedge”)', 'mean 6–12 (a 3–15, v 3–15)', 'Left atrial pressure ≈ LVEDP when the mitral valve is open and normal'],
      ['Left ventricle (LV)', '90–140 / 5–12', 'Only at catheterisation'],
      ['Aorta / systemic artery', '90–140 / 60–90, MAP 70–105', 'MAP = DBP + (SBP − DBP)/3'],
      ['Cardiac output / index', '4–8 L/min; 2.5–4 L/min/m²', 'Thermodilution or Fick'],
      ['Stroke volume / index', '60–100 mL; 35–55 mL/m²', 'CO / HR'],
      ['SVR', '800–1,200 dyn·s/cm⁵ (10–15 Wood units)', '(MAP − RAP) / CO × 80'],
      ['PVR', '20–130 dyn·s/cm⁵ (0.25–1.6 WU)', '(mPAP − PAOP) / CO × 80'],
      ['Mixed venous saturation (SvO2)', '65–75%', 'What is left after the tissues have taken what they need']] } },
    { h: 'The cardiac cycle on the catheter', ul: [
      'Atrial systole (after the P wave) makes the a wave on the RA and the wedge; ventricular systole lifts the RV and PA traces; the atrium fills against a closed AV valve and makes the v wave; the AV valve opens and the atrium empties — the y descent; the x descent follows atrial relaxation and the pull of the descending AV ring.',
      'The RV end-diastolic pressure equals the RA mean (tricuspid open); the PA diastolic approaches the wedge (the pulmonary bed is a low-resistance conduit) — a gap between them is the lung’s own resistance.',
      'Read every pressure at end-expiration, when the pleural pressure is nearest zero: the spontaneously breathing patient pulls the baseline down with each inspiration, the ventilated patient pushes it up. The number is the one just before the next breath begins.',
      'Timing: the a wave precedes the carotid upstroke, the v wave follows it; on the wedge both are delayed by about 80–120 ms (the wave travels back through the pulmonary veins and capillaries).'] },
    { h: 'What a single pressure can and cannot say', ul: [
      'A pressure is not a volume: the same end-diastolic pressure fills a compliant ventricle generously and a stiff one barely. The wedge in HFpEF or ischaemia overstates the preload; the RAP in a dilated RV understates it.',
      'A pressure is not a flow: a normal MAP with a low output (high resistance) perfuses badly; a low MAP with a high output (sepsis) may perfuse well enough. Measure or estimate the flow.',
      'A pressure is relative to the pleura: the catheter measures intravascular pressure against atmosphere; what fills the ventricle is the transmural pressure (intravascular − pericardial/pleural). Tamponade, a high PEEP, abdominal hypertension and dynamic hyperinflation all inflate the number without filling the chamber.',
      'Trends beat values: the response to a bolus, a pressor or a vent setting is the diagnosis.'] },
    { src: ['Klabunde RE. Cardiovascular Physiology Concepts, 3rd ed. (2021).', 'Guyton AC. Determination of cardiac output by equating venous return curves with cardiac response curves. Physiol Rev 1955;35:123–9.', 'Kovacs G, et al. Pulmonary arterial pressure during rest and exercise in healthy subjects: a systematic review. Eur Respir J 2009;34:888–94.', 'Magder S. Understanding central venous pressure: not a preload index? Curr Opin Crit Care 2015;21:369–75.'] }
  ] };

  T.hemo_swan = { title: 'The pulmonary artery catheter', kicker: 'Ports, balloon, the waveforms on the way in, and what the wedge really measures', blocks: [
    { p: 'A balloon-tipped, flow-directed catheter (Swan and Ganz, 1970) passed through a central vein — right internal jugular is the straightest road — floated through the right atrium and ventricle into a pulmonary artery, and wedged in a branch by inflating the balloon. It reads four pressures (RA from the proximal port, RV on the way through, PA from the tip, the wedge with the balloon up), a temperature for thermodilution, and a mixed venous saturation (a blood sample from the tip, or a fibre-optic model). Its numbers are the only direct way to separate the left heart from the right, the pre-capillary from the post-capillary, and the empty from the failing. Its evidence is a story of using it badly (ESCAPE, PAC-Man: no benefit in unselected patients) and, lately, of using it well (registries: lower mortality in cardiogenic shock with a complete profile before mechanical support).' },
    { widget: 'hemoswan' },
    { h: 'The ports', table: { head: ['Lumen', 'Where it opens', 'What it does'], rows: [
      ['Distal (yellow)', 'The tip', 'PA pressure; PAOP with the balloon up; mixed venous blood sample (balloon down, slowly)'],
      ['Proximal (blue)', '30 cm from the tip, in the RA', 'RA/CVP pressure; the injectate port for thermodilution; infusions'],
      ['Balloon (red)', 'Just behind the tip', '1.5 mL of air for flotation and the wedge; never fluid; inflate slowly and stop when the trace wedges; deflate as soon as read'],
      ['Thermistor', '4 cm from the tip', 'Blood temperature; the thermodilution curve'],
      ['Extra lumen / pacing', '19–31 cm', 'A second infusion, pacing wires, or a heater coil (continuous CO)']] } },
    { h: 'Floating it: the sequence of waveforms', table: { head: ['Position', 'Depth from the right IJ', 'The trace', 'Pressures'], rows: [
      ['Right atrium', '15–20 cm', 'Low, with a, c and v waves; respiratory swing', 'mean 2–6'],
      ['Right ventricle', '30–35 cm', 'Systolic peak with a low diastolic that climbs to the end-diastolic pressure; no dicrotic notch; ectopy here', '15–30 / 2–8'],
      ['Pulmonary artery', '40–45 cm', 'Same systolic as the RV, but the diastolic steps up and a dicrotic notch appears; the diastolic falls slowly', '15–30 / 6–12'],
      ['Wedge', '45–55 cm', 'The pulsatile PA trace damps to an atrial trace with a and v waves, lower than PA diastolic', 'mean 6–12']] } },
    { h: 'What the wedge measures', ul: [
      'With the balloon up, flow stops in that segment and the column of blood from the tip to the pulmonary veins and the left atrium becomes static: the tip reads the left atrial pressure, which equals the LVEDP when the mitral valve is normal and open at end-diastole.',
      'It is only true in West zone 3 (the tip below the left atrium, pulmonary venous pressure > alveolar pressure): a zone 1–2 wedge (high PEEP, hypovolaemia, an upper-lobe tip) reads the alveolar pressure. Suspect it when the wedge exceeds the PA diastolic, varies with PEEP by more than half the change, or the tip sits above the LA on the film.',
      'Over-reads the LVEDP: mitral stenosis, large v waves (MR, VSD), tachycardia, a stiff LA, pulmonary veno-occlusive disease, high PEEP (subtract roughly half the PEEP above 10 in a compliant lung, less in a stiff one). Under-reads: aortic regurgitation, a very stiff LV (the atrium relaxes before the a wave reaches the ventricle’s true end-diastolic pressure), a premature mitral closure.',
      'Read the mean at end-expiration; report the a wave (end-diastole) when the v waves are large; never leave the balloon up (infarction, rupture).'] },
    { h: 'The waves and their diseases', table: { head: ['Finding', 'Where', 'Means'], rows: [
      ['Large a wave', 'RA', 'The atrium contracting against a stiff or hypertensive ventricle: pulmonary hypertension, RVH, tricuspid stenosis'],
      ['Cannon a waves', 'RA (intermittent)', 'The atrium contracting against a closed tricuspid valve: AV dissociation, VT, complete heart block'],
      ['Absent a wave', 'RA, wedge', 'Atrial fibrillation or flutter'],
      ['Large v wave', 'RA', 'Tricuspid regurgitation (the trace “ventricularises”), RV failure'],
      ['Large v wave', 'Wedge', 'Mitral regurgitation, VSD (left-to-right shunt into the RV), a stiff non-compliant LA, mitral stenosis (a prominent a)'],
      ['Blunted y descent', 'RA', 'Tamponade: the chambers cannot fill early; also RV failure, tricuspid stenosis'],
      ['Steep, deep y descent (M or W)', 'RA', 'Constrictive pericarditis, restrictive cardiomyopathy, severe TR'],
      ['Kussmaul’s sign (RAP rising with inspiration)', 'RA', 'Constriction, RV infarction, restrictive disease, massive PE'],
      ['Dip and plateau (square root)', 'RV, LV', 'Constriction (also restriction): early filling abrupt, then nothing'],
      ['Equalised diastolic pressures (RA ≈ RVEDP ≈ PAd ≈ PAOP, within 5)', 'All', 'Tamponade, constriction'],
      ['PA diastolic ≫ wedge', 'PA vs wedge', 'A pre-capillary component: PE, PAH, lung disease, ARDS'],
      ['Oxygen step-up (≥ 7% saturation between the SVC/RA and the PA)', 'Samples', 'A left-to-right shunt: VSD (post-infarct), ASD, PDA'],
      ['Pulsus paradoxus > 10 mm Hg', 'Arterial', 'Tamponade; severe airflow obstruction; massive PE']] } },
    { h: 'Thermodilution and Fick', ul: [
      'Thermodilution: 10 mL of cold or room-temperature saline through the proximal port, the thermistor records the temperature curve, CO = the Stewart–Hamilton integral; average three within 10%; wrong with tricuspid regurgitation (underestimates — the indicator recirculates), intracardiac shunts and very low outputs; continuous-CO catheters heat the blood instead.',
      'Fick: CO = VO2 / (CaO2 − CvO2) × 10; VO2 assumed (125 mL/min/m², or 3.5 mL/kg/min) or measured; CaO2 − CvO2 = 1.34 × Hb × (SaO2 − SvO2). The assumed Fick is wrong whenever the metabolism is (sepsis, fever, sedation, hypothermia); the measured Fick is the reference in the cath lab.',
      'SvO2 (true mixed venous, from the PA) < 60% with a normal SaO2 and Hb means the output is short of the demand; ScvO2 from a central line runs 5–7% higher in shock and tracks it loosely.'] },
    { h: 'Risks and evidence', ul: [
      'Arrhythmia on passage (RBBB in 3%, so pacing backup in LBBB), knotting, pulmonary infarction (balloon left up), PA rupture (0.03–0.2%, lethal in half — the elderly, pulmonary hypertension, over-inflation), infection and thrombosis with duration, balloon rupture with air embolism.',
      'ESCAPE (2005, decompensated HF) and PAC-Man (2005, ICU): no mortality benefit from routine PAC-guided care; FACTT and others the same in ARDS. Registries since (e.g. Garan 2020, Osman 2021): a complete haemodynamic profile before temporary mechanical support is associated with lower mortality in cardiogenic shock; the 2022 AHA/ACC HF guideline and the SCAI shock statement support its use in cardiogenic shock, especially when escalating.',
      'The catheter is a measurement, not a treatment: it helps when the number changes a decision (which shock, how much volume, when to escalate or withdraw) and the team knows how to read it.'] },
    { src: ['Swan HJ, Ganz W, et al. Catheterization of the heart in man with use of a flow-directed balloon-tipped catheter. N Engl J Med 1970;283:447–51.', 'Binanay C, et al. ESCAPE. JAMA 2005;294:1625–33.', 'Harvey S, et al. PAC-Man. Lancet 2005;366:472–7.', 'Garan AR, et al. Complete hemodynamic profiling with pulmonary artery catheters in cardiogenic shock is associated with lower in-hospital mortality. JACC Heart Fail 2020;8:903–13.', 'Heidenreich PA, et al. 2022 AHA/ACC/HFSA heart failure guideline. Circulation 2022;145:e895–e1032.', 'Kelly CR, Rabbani LE. Pulmonary artery catheterization. N Engl J Med 2013;369:e35.'] }
  ] };

  T.hemo_determinants = { title: 'Preload, afterload, contractility, rate', kicker: 'The four knobs, the two curves, and the pressure–volume loop', blocks: [
    { h: 'The pressure–volume loop', p: 'Plot the ventricle’s pressure against its volume through one beat and you get a loop: filling along the diastolic curve (the end-diastolic pressure–volume relation, EDPVR, which is exponential — the ventricle gets stiffer as it fills), isovolumic contraction up the right side, ejection along the top until the end-systolic point (which lies on the end-systolic relation, ESPVR, a line whose slope — Ees — is the contractility), isovolumic relaxation down the left side. The loop’s width is the stroke volume; its area is the stroke work. Preload moves the right edge along the EDPVR; afterload (the arterial elastance, Ea = end-systolic pressure / SV) sets the slope of the line from the end-diastolic volume to the end-systolic point; contractility rotates the ESPVR; a stiffer ventricle lifts the EDPVR. The lab’s ventricles are built from these two relations.' },
    { h: 'Preload', ul: [
      'The end-diastolic volume (not pressure): the sarcomere length before contraction. Starling: more preload, more stroke volume — along a curve that flattens (the failing ventricle’s flattens early and low).',
      'Set by the venous return (volume, venous tone, intrathoracic and intra-abdominal pressure), the filling time (heart rate, AV conduction) and the ventricle’s compliance (and the pericardium, and the other ventricle).',
      'Measured poorly by any single pressure (CVP, PAOP); better by the response to a change: passive leg raise, a mini-bolus, the stroke-volume or pulse-pressure variation in a ventilated patient without effort or arrhythmia (> 12–13% = responsive), the IVC on ultrasound, the LVOT VTI before and after.',
      'The question is never “is the CVP low?” but “will the stroke volume rise if I give volume, and what will it cost the lungs and the RV?”'] },
    { h: 'Afterload', ul: [
      'The load the ventricle must overcome to eject: for the LV, approximately the aortic pressure (more exactly, wall stress = pressure × radius / 2 × wall thickness — a dilated thin ventricle faces more afterload at the same pressure); for the RV, the PA pressure and the pulmonary impedance (resistance, compliance and wave reflection).',
      'The failing ventricle is afterload-sensitive: its stroke volume falls steeply as the pressure rises (a flat ESPVR). Vasodilators raise the output of a failing LV and barely change a normal one.',
      'The RV is afterload-intolerant by design: thin-walled, it doubles its PA pressure only over months of training; an acute PVR rise (PE, ARDS, a ventilator, hypoxia, acidosis) collapses its output.',
      'Positive-pressure ventilation lowers LV afterload (the heart sits in a positive pressure box) and raises RV afterload (alveolar vessels compressed at high lung volumes; PEEP).'] },
    { h: 'Contractility and rate', ul: [
      'Contractility: the force at a given preload and afterload — the slope of the ESPVR, the ejection fraction (crudely), dP/dt. Raised by catecholamines, calcium, milrinone/levosimendan; lowered by ischaemia, sepsis, acidosis, β-blockers, hypocalcaemia.',
      'Diastolic function: the shape of the EDPVR and the rate of relaxation (lusitropy); a stiff ventricle needs a high pressure to fill, which the lungs pay for.',
      'Rate: output = SV × HR until diastole is too short to fill (above ~ 150–180, or sooner in a stiff ventricle) or too long to sustain the pressure (bradycardia with a fixed stroke volume). Atrial contraction contributes 20–30% of filling, more in the stiff ventricle: AF or AV dissociation costs the HFpEF or RV-infarct patient their output.'] },
    { h: 'Ventricular interdependence and the pericardium', ul: [
      'The two ventricles share a septum and a pericardium: a dilated RV shifts the septum left (the D sign), lowers the LV’s compliance and its filling. That is why volume in RV failure or PE lowers the output, and why the inspiratory RV filling of tamponade empties the LV (pulsus paradoxus).',
      'The pericardium limits acute dilation: the acute effusion of 200 mL tamponades; the chronic one of 2 L does not. Constriction turns the pericardium into a rigid box: filling is abrupt and early (the y descent), then stops (the plateau), and the chambers equalise.',
      'The venous return curve (Guyton) meets the cardiac function curve (Starling) at the operating point: the lab’s heart–lung page draws the two curves; this page’s model solves them with a pulmonary circuit in between.'] },
    { src: ['Suga H, Sagawa K. Instantaneous pressure–volume relationships and their ratio in the excised, supported canine left ventricle. Circ Res 1974;35:117–26.', 'Burkhoff D, et al. Assessment of systolic and diastolic ventricular properties via pressure–volume analysis. Am J Physiol Heart Circ Physiol 2005;289:H501–12.', 'Pinsky MR. Cardiopulmonary interactions: physiologic basis and clinical applications. Ann Am Thorac Soc 2018;15 Suppl 1:S45–8.', 'Monnet X, Teboul JL. Assessment of fluid responsiveness: recent advances. Curr Opin Crit Care 2018;24:190–5.'] }
  ] };

  T.hemo_numbers = { title: 'The derived numbers', kicker: 'SVR, PVR, TPG, DPG, PAPi, CPO, the ratios — formulas, thresholds, what each one is for', blocks: [
    { p: 'Every derived number is a pressure, a flow and a resistance rearranged. Know what it isolates: the resistance of a bed (SVR, PVR), the gradient across the lung (TPG, DPG), the right ventricle’s performance (PAPi, RA:PAOP), the left ventricle’s power (CPO), the match of delivery and demand (SvO2, DO2). The lab computes all of them from the same state and flags the thresholds.' },
    { go: [['hemo_calc', 'The hemos calculator', 'your chart’s inputs, these numbers worked out'], ['hemo_limits', 'What each number cannot tell you', 'the limits of every calculation']] },
    { h: 'Flow and resistance', table: { head: ['Number', 'Formula', 'Normal', 'Threshold and meaning'], rows: [
      ['Cardiac index (CI)', 'CO / BSA', '2.5–4 L/min/m²', '< 2.2 with hypoperfusion = shock; < 1.8 without support = severe'],
      ['Stroke volume index (SVI)', 'CI / HR × 1000', '33–47 mL/m²', 'Separates a low index from tachycardia; < 25 after cardiac surgery predicts RV failure'],
      ['SVR', '(MAP − RAP) / CO × 80', '800–1,200 dyn·s/cm⁵ (10–15 WU)', '< 700–800 vasoplegia; > 1,600 constricted (compensated cardiogenic or hypovolaemic)'],
      ['PVR', '(mPAP − PAOP) / CO × 80', '20–130 dyn (0.25–1.6 WU)', '> 2 WU (160 dyn) abnormal (ESC/ERS 2022); > 3 contraindicates heart transplant without reversibility testing; > 5 for CTEPH surgery risk'],
      ['Cardiac power output (CPO)', 'MAP × CO / 451 (W)', '≥ 1 W', '< 0.6 W: the strongest haemodynamic predictor of death in cardiogenic shock (SHOCK trial); a pump’s power is pressure × flow'],
      ['Fick CO', 'VO2 / [13.4 × Hb × (SaO2 − SvO2)]', '', 'VO2 assumed (125 mL/min/m² or 3.5 mL/kg/min) or measured. The assumption is commonly 25% out; thermodilution fails in TR and shunts'],
      ['DO2 / VO2', 'CO × CaO2 × 10; CO × (CaO2 − CvO2) × 10', 'DO2 ~ 1,000; VO2 ~ 250 mL/min; ratio 4–5', 'Ratio < 2–2.5: supply-dependent, lactate rises']] } },
    { h: 'The gradients across the lung', table: { head: ['Number', 'Formula', 'Normal', 'Threshold and meaning'], rows: [
      ['Transpulmonary gradient (TPG)', 'mPAP − PAOP', '≤ 12 mm Hg', '> 12: a pre-capillary component (in a patient with a high wedge: combined post- and pre-capillary); it rises with flow and with a high wedge even without disease, hence the DPG'],
      ['Diastolic pulmonary gradient (DPG)', 'PAd − PAOP', '0–5 (< 7)', '≥ 7: pulmonary vascular remodelling on top of left heart disease (less flow-dependent than the TPG; worse prognosis in HF); a negative DPG is a measurement error or a wedge that over-reads'],
      ['PVR in Wood units', 'TPG / CO', '≤ 2', 'ESC/ERS 2022 uses PVR > 2 WU as the pre-capillary criterion (with mPAP > 20 and PAOP ≤ 15)'],
      ['Pulmonary arterial compliance', 'SV / PA pulse pressure', '> 2–3 mL/mm Hg', 'Falls early in PH; RC time (PVR × compliance) ≈ 0.7 s is nearly constant, so the pulse pressure rises with the PVR'],
      ['mPAP from systolic', 'mPAP ≈ 0.61 × PASP + 2', '', 'The echo estimate (Chemla); PASP from TR velocity: 4v² + RAP']] } },
    { h: 'The right ventricle’s numbers', table: { head: ['Number', 'Formula', 'Normal', 'Threshold and meaning'], rows: [
      ['PAPi (pulmonary artery pulsatility index)', '(PAs − PAd) / RAP', '> 2 (usually 3–8)', '< 0.9 predicts RV failure and death in RV infarction (Korabathina); < 1.85 predicts RV failure after LVAD (Morine); the RV’s pulse against its own filling pressure'],
      ['RA : PAOP', 'RAP / PAOP', '< 0.5–0.6', '> 0.63 (post-LVAD) or > 0.86 (SCAI shock): RV-dominant failure — the right side is as congested as the left or more'],
      ['RV stroke work index', 'SVI × (mPAP − RAP) × 0.0136 g·m/m²', '5–10', '< 300 mm Hg·mL/m² (≈ 4 g·m/m²) predicts RV failure after LVAD'],
      ['TAPSE', 'Tricuspid annular plane systolic excursion (M-mode)', '≥ 17 mm (≥ 20 well)', '< 17 abnormal; < 16 in PE and ARDS predicts death; load-dependent, falls with afterload'],
      ['TAPSE / PASP', 'mm per mm Hg', '≥ 0.31 (normal ~ 0.6–1)', '< 0.31: RV–PA uncoupling (a non-invasive Ees/Ea); prognostic in HF, PH, COVID ARDS'],
      ['RV S′', 'Tissue-Doppler systolic velocity of the lateral annulus', '≥ 9.5 cm/s', '< 9.5 abnormal'],
      ['RV fractional area change', '(EDA − ESA) / EDA', '≥ 35%', '< 35% abnormal; the 2D ejection fraction surrogate'],
      ['RV : LV basal diameter', 'Apical four-chamber, end-diastole', '< 0.6–0.7', '> 1: a dilated RV (PE, ARDS, PH); with McConnell’s sign (free-wall akinesia, apex spared) in acute PE'],
      ['RVSP ≈ PASP', '4 × (TR Vmax)² + RAP', '< 35', 'RAP from the IVC: ≤ 2.1 cm and > 50% collapse = 3; > 2.1 cm and < 50% = 15; otherwise 8']] } },
    { h: 'Oxygen', table: { head: ['Number', 'Formula', 'Normal', 'Meaning'], rows: [
      ['CaO2', '1.34 × Hb × SaO2 + 0.003 × PaO2', '18–20 mL/dL', 'Content, not tension: anaemia halves the delivery at a perfect PaO2'],
      ['SvO2 (PA)', 'Measured', '65–75%', '< 60: delivery short of demand (low CO, anaemia, hypoxaemia, high VO2); > 80: not extracting (sepsis, shunts, cyanide, cirrhosis, hypothermia, a very high output)'],
      ['ScvO2 (SVC)', 'Measured', '70–80%', 'Runs above the SvO2 in shock (the coronary sinus and the gut drain below); a trend, not a target (ProCESS/ARISE/ProMISe)'],
      ['O2 extraction ratio', '(SaO2 − SvO2) / SaO2', '25–30%', '> 50%: the limit of compensation'],
      ['Shunt step-up', 'SpO2 PA − SpO2 SVC/RA', '< 5–7%', '≥ 7% = left-to-right shunt (post-infarct VSD); Qp:Qs = (SaO2 − SmvO2) / (SpvO2 − SpaO2)']] } },
    { h: 'Units and conversions', ul: ['1 Wood unit = 1 mm Hg·min/L = 80 dyn·s/cm⁵.', 'MAP = DBP + PP/3 (at normal rates); at 120/min the mean sits nearer the middle.', 'BSA (Mosteller) = √(height cm × weight kg / 3600).', 'CO (thermodilution) is in L/min at body temperature; index per m².'] },
    { src: ['Humbert M, et al. 2022 ESC/ERS guidelines for the diagnosis and treatment of pulmonary hypertension. Eur Heart J 2022;43:3618–731.', 'Fincke R, et al. Cardiac power is the strongest hemodynamic correlate of mortality in cardiogenic shock (SHOCK trial registry). J Am Coll Cardiol 2004;44:340–8.', 'Korabathina R, et al. The pulmonary artery pulsatility index identifies severe right ventricular dysfunction in acute inferior myocardial infarction. Catheter Cardiovasc Interv 2012;80:593–600.', 'Morine KJ, et al. Pulmonary artery pulsatility index is associated with right ventricular failure after left ventricular assist device surgery. J Card Fail 2016;22:110–6.', 'Lang RM, et al. Recommendations for cardiac chamber quantification by echocardiography in adults (ASE/EACVI). J Am Soc Echocardiogr 2015;28:1–39.', 'Tello K, et al. Validation of the TAPSE/PASP ratio as a surrogate of RV–PA coupling in PH. Circ Cardiovasc Imaging 2019;12:e009047.', 'Naeije R, et al. The transpulmonary pressure gradient for the diagnosis of pulmonary vascular disease. Eur Respir J 2013;41:217–23.'] }
  ] };

  T.hemo_pulm = { title: 'The pulmonary circulation', kicker: 'Pre-capillary, post-capillary, combined: the 2022 definitions and what the RV makes of them', blocks: [
    { p: 'The lung is a low-pressure, high-compliance, high-flow circuit: the whole cardiac output through a bed whose resistance is one tenth of the body’s. It distends and recruits with flow (so the PVR falls on exercise in health), constricts with hypoxia, acidosis and hypercapnia, and is compressed by the alveolar pressure at high lung volumes and stretched open at low ones (the PVR is lowest at FRC). Pulmonary hypertension is a pressure; the question the catheter answers is where the resistance sits — before the capillaries (the arteries: PAH, thromboembolism, lung disease), after them (the left heart), or both.' },
    { h: 'Haemodynamic definitions (ESC/ERS 2022)', table: { head: ['Class', 'mPAP', 'PAOP', 'PVR', 'Groups'], rows: [
      ['Pulmonary hypertension', '> 20 mm Hg', '', '', 'Any'],
      ['Pre-capillary PH', '> 20', '≤ 15', '> 2 WU', 'Group 1 PAH, 3 (lung disease/hypoxia), 4 (CTEPH), 5 (unclear/multifactorial)'],
      ['Isolated post-capillary PH (IpcPH)', '> 20', '> 15', '≤ 2 WU', 'Group 2 (left heart disease)'],
      ['Combined pre- and post-capillary (CpcPH)', '> 20', '> 15', '> 2 WU', 'Group 2 with remodelling (DPG ≥ 7, TPG > 12 support it)'],
      ['Unclassified', '> 20', '≤ 15', '≤ 2 WU', 'High flow (shunts, cirrhosis, anaemia, hyperthyroid): a pressure without a resistance'],
      ['Exercise PH', 'mPAP/CO slope > 3 mm Hg/L/min between rest and exercise', '', '', 'Early disease; the old 30 mm Hg cut-off abandoned']] } },
    { h: 'Reading the three numbers together', ul: [
      'PAOP ≤ 15 with a high PVR: the problem is the vessels (or clot). PAOP > 15 with a normal PVR: the problem is the left heart and the vessels are innocent — treat the heart, not the pressure. PAOP > 15 with a high PVR and a DPG ≥ 7: both — the lung has remodelled behind a chronically full atrium (mitral disease, HFpEF of long standing).',
      'A borderline wedge (13–18) is the commonest trap: fluid challenge (500 mL, repeat the wedge: > 18 unmasks HFpEF), exercise, or a left ventricular end-diastolic pressure at catheterisation decides.',
      'Vasoreactivity (inhaled NO 10–20 ppm): a fall in mPAP by ≥ 10 to below 40 with an unchanged or higher CO marks the 10% of idiopathic PAH who respond to calcium-channel blockers; not for group 2–3.',
      'Acute rises in PVR are reversible by treating the cause (hypoxia, acidosis, hypercapnia, hypothermia, high lung volumes, sympathetic surge); chronic rises need the vessel treated (PAH therapy, endarterectomy, balloon angioplasty).'] },
    { h: 'RV–PA coupling', ul: [
      'The RV adapts to a chronic afterload by hypertrophy (increasing Ees) and keeps its stroke volume while Ees/Ea stays above ~ 0.8; when the afterload outruns the adaptation the ventricle dilates, the stroke volume falls, the RA pressure rises and the septum shifts: uncoupling, the onset of RV failure.',
      'Bedside surrogates: TAPSE/PASP < 0.31 mm/mm Hg; RV stroke work; the RA pressure trend; the pericardial effusion in PAH (a marker, not a target).',
      'Acute afterload (PE, ARDS): the untrained RV cannot generate a PA systolic much above 40–50 — a modestly raised PA pressure with a failing RV is worse than a very high pressure with a trained one.',
      'Supporting the RV: lower the afterload (oxygen, pH, CO2, inhaled vasodilators, lung-protective ventilation at FRC, low PEEP), keep the perfusion pressure (norepinephrine, vasopressin — the RV’s coronary flow depends on the aortic-to-RV pressure gradient), inotropy (dobutamine, milrinone), rhythm and AV synchrony, volume only to an RAP of 10–14 and never into a D-shaped LV; mechanical support (Impella RP, ProtekDuo, VA ECMO) when it fails.'] },
    { src: ['Humbert M, et al. 2022 ESC/ERS PH guidelines. Eur Heart J 2022.', 'Vonk Noordegraaf A, et al. Pathophysiology of the right ventricle and of the pulmonary circulation in PH: an update. Eur Respir J 2019;53:1801900.', 'Naeije R, Badagliacca R. The overloaded right heart and ventricular interdependence. Cardiovasc Res 2017;113:1474–85.', 'Lahm T, et al. Assessment of right ventricular function in the research setting: ATS research statement. Am J Respir Crit Care Med 2018;198:e15–43.'] }
  ] };

  T.hemo_shock = { title: 'Shock, by the numbers', kicker: 'Four kinds, their signatures, the quadrants and the stages, and what each drug does to them', blocks: [
    { p: 'Shock is inadequate tissue perfusion — oxygen delivery short of demand, or demand not met because the tissues cannot use what arrives — and the pressure is only its most visible sign. The four mechanisms (an empty circulation, a failing pump, an obstructed path, open vessels) each leave a signature in the filling pressures, the output and the resistance; the catheter reads them, the echo sees them, the exam suspects them. Mixed pictures are the rule in the ICU.' },
    { h: 'The signatures', table: { head: ['Shock', 'RAP / CVP', 'PAOP', 'CO / CI', 'SVR', 'SvO2', 'Clues'], rows: [
      ['Hypovolaemic', '↓', '↓', '↓', '↑', '↓', 'Flat neck veins, collapsing IVC, small hyperdynamic ventricles, haemorrhage or losses'],
      ['Cardiogenic — LV', '↑ or normal', '↑ (> 18)', '↓ (< 2.2)', '↑', '↓', 'Cold and wet; crackles, S3, a dilated poorly contracting LV; CPO < 0.6'],
      ['Cardiogenic — RV', '↑↑', 'normal or ↓', '↓', '↑', '↓', 'Clear lungs, full neck veins, Kussmaul; RA:PAOP > 0.86, PAPi < 0.9; inferior infarct, post-cardiotomy, LVAD'],
      ['Obstructive — tamponade', '↑ (= PAOP = PAd)', '↑ (equalised)', '↓', '↑', '↓', 'Pulsus paradoxus, no y descent, effusion with chamber collapse'],
      ['Obstructive — PE / acute PH', '↑', 'normal or ↓', '↓', '↑', '↓', 'PA ↑ with a normal wedge (TPG, DPG high), dilated RV, McConnell'],
      ['Obstructive — tension pneumothorax, auto-PEEP', '↑', 'normal', '↓', '↑', '↓', 'The ventilator; needle or disconnect'],
      ['Distributive — sepsis', '↓ or normal', '↓ or normal', '↑ (after fluid)', '↓ (< 800)', 'normal or ↑', 'Warm, bounding, wide pulse pressure; low diastolic; lactate from dysoxia and from adrenergic drive'],
      ['Distributive — anaphylaxis, neurogenic, adrenal', '↓', '↓', 'variable', '↓', 'variable', 'The history; bradycardia in neurogenic'],
      ['Mixed — septic cardiomyopathy', 'normal or ↑', '↑', '↓', '↓', '↓', 'Low resistance and a low output together: pressor plus inotrope']] } },
    { h: 'The quadrants (Forrester / Stevenson)', table: { head: ['', 'Dry (PAOP ≤ 18)', 'Wet (PAOP > 18)'], rows: [
      ['Warm (CI > 2.2)', 'I: compensated — observe, treat the cause', 'II: congested — diuretics, vasodilators'],
      ['Cold (CI ≤ 2.2)', 'III: underfilled — cautious volume (then inotrope if the wedge rises without the output)', 'IV: cardiogenic shock — inotrope ± pressor, afterload reduction if the pressure allows, mechanical support if it fails']] } },
    { h: 'The SCAI stages of cardiogenic shock', table: { head: ['Stage', '', 'Looks like', 'Numbers'], rows: [
      ['A', 'At risk', 'A large infarct or decompensated HF with normal perfusion', 'Normal lactate, CI ≥ 2.5'],
      ['B', 'Beginning', 'Hypotension or tachycardia without hypoperfusion', 'SBP < 90 or MAP < 60, lactate < 2, CI ≥ 2.2'],
      ['C', 'Classic', 'Hypoperfusion needing an intervention (drug or device)', 'Lactate ≥ 2, CI < 2.2, PAOP > 15, CPO < 0.6'],
      ['D', 'Deteriorating', 'Not responding: escalating doses or devices', 'Lactate rising, > 2 drugs or a device'],
      ['E', 'Extremis', 'Refractory, arresting, on ECPR', 'Lactate > 8, pH < 7.2, CPR'],
      ['Modifiers', '', 'A = cardiac arrest; the phenotype (LV, RV, biventricular); the aetiology', '']] } },
    { h: 'What each drug does', table: { head: ['Agent', 'Receptors', 'Preload', 'Afterload (SVR)', 'Contractility', 'Rate', 'PVR', 'Use'], rows: [
      ['Norepinephrine', 'α1 ≫ β1', '↑ (venous tone)', '↑↑', '↑', '→', '↑ (slight)', 'First pressor in every shock; RV failure (coronary perfusion)'],
      ['Vasopressin', 'V1', '↑', '↑↑', '→', '→', '→ (spares the lung)', 'Second pressor in sepsis; catecholamine-sparing; RV failure'],
      ['Epinephrine', 'β1 β2 α1', '↑', '↑ (high dose)', '↑↑', '↑↑', '↑', 'Anaphylaxis; post-cardiotomy; arrest; lactate rises on its own'],
      ['Phenylephrine', 'α1', '↑', '↑↑', '→', '↓ (reflex)', '↑', 'Tachyarrhythmia with vasoplegia; HOCM; avoid in a failing LV'],
      ['Dopamine', 'D, β1, α (by dose)', '', '↑ (high)', '↑', '↑↑', '', 'Lost to norepinephrine (SOAP II: more arrhythmia, higher mortality in cardiogenic shock)'],
      ['Dobutamine', 'β1 > β2', '↓', '↓', '↑↑', '↑', '↓ (slight)', 'Low output with an adequate pressure; RV failure; hypotension at the start'],
      ['Milrinone', 'PDE3', '↓', '↓↓', '↑↑', '↑ (slight)', '↓↓', 'Inodilator; RV failure and PH; β-blocked patients; renal clearance; hypotension'],
      ['Levosimendan', 'Calcium sensitiser, K-ATP', '↓', '↓', '↑', '↑', '↓', 'Europe; long half-life; no weaning benefit on VA ECMO (LEVOECMO)'],
      ['Nitroglycerin', 'NO (venous)', '↓↓', '↓ (high dose)', '→', '↑', '↓', 'Congestion with a pressure to spare; acute MR'],
      ['Nitroprusside', 'NO (arteriolar)', '↓', '↓↓', '→', '↑', '↓', 'Hypertensive heart failure, acute MR/AR; cyanide with duration'],
      ['Inhaled NO / epoprostenol', 'Pulmonary cGMP / cAMP', '→', '→', '→', '→', '↓↓', 'RV failure, PH, hypoxaemia; rebound on withdrawal; platelet effect (prostacyclin)'],
      ['IABP', 'Counterpulsation', '→', '↓ (10–15%)', '→ (coronary ↑)', '→', '→', 'Mechanical MR/VSD, bridge; no routine benefit (IABP-SHOCK II)'],
      ['Impella', 'Transaortic pump 2.5–5.5 L/min', '↓↓ (unloads the LV)', '↑ (MAP)', '', '', '', 'LV shock after infarct (DanGer Shock: lower mortality, more complications); LV venting on ECMO'],
      ['VA ECMO', 'Pump + oxygenator', '↓ (RA drained)', '↑↑ (LV loaded)', '', '', '', 'Biventricular or refractory shock, arrest, PE; the LV must be watched or vented']] } },
    { h: 'The order of operations in cardiogenic shock', ol: [
      'Recognise it: hypoperfusion, not a pressure — lactate, mentation, urine, cool limbs; a quick echo (LV, RV, effusion, valves, IVC).',
      'Reverse the reversible: revascularise the infarct, treat the arrhythmia, drain the tamponade, open the pulmonary bed, decompress the chest.',
      'Perfusion pressure first (norepinephrine to a MAP of 65), then output (dobutamine or milrinone), then volume only where the ventricle is empty — the catheter decides which chambers are full.',
      'Escalate early rather than late: a complete haemodynamic profile (PAC) before mechanical support; choose the device by the phenotype (LV → Impella; RV → Impella RP / ProtekDuo; both or arrest → VA ECMO ± vent); set the exit (recovery, durable device, transplant) and the stopping rule when you start.',
      'Every hour: the trend in lactate, CPO, PAPi, urine; wean the drugs that are not needed; the shock team.'] },
    { src: ['Naidu SS, et al. SCAI SHOCK stage classification expert consensus update (2022). J Am Coll Cardiol 2022;79:933–46.', 'De Backer D, et al. Comparison of dopamine and norepinephrine in the treatment of shock (SOAP II). N Engl J Med 2010;362:779–89.', 'Thiele H, et al. Intraaortic balloon support for myocardial infarction with cardiogenic shock (IABP-SHOCK II). N Engl J Med 2012;367:1287–96.', 'Møller JE, et al. Microaxial flow pump or standard care in infarct-related cardiogenic shock (DanGer Shock). N Engl J Med 2024;390:1382–93.', 'Vincent JL, De Backer D. Circulatory shock. N Engl J Med 2013;369:1726–34.', 'Forrester JS, et al. Medical therapy of acute myocardial infarction by application of hemodynamic subsets. N Engl J Med 1976;295:1356–62.'] }
  ] };

  T.hemo_rv = { title: 'The right ventricle', kicker: 'A flow pump that hates afterload: how it fails, how to measure it, how to help it', blocks: [
    { p: 'The right ventricle is thin, crescentic and compliant: a volume pump built for a low-pressure circuit, wrapped around the left ventricle and sharing its septum and pericardium. It tolerates volume (a chronic ASD) and resents pressure: an acute doubling of its afterload halves its output, while the left ventricle shrugs. It is perfused in systole and diastole (its wall pressure is low), so its coronary flow falls when the aortic pressure falls and the RV pressure rises — the spiral of RV failure: afterload up → RV dilates → septum shifts, TR appears, LV underfills → output and MAP fall → RV ischaemia → more failure.' },
    { h: 'Why it fails', table: { head: ['Cause', 'Mechanism', 'Clue'], rows: [
      ['RV infarction', 'Proximal RCA: loss of contractility', 'Inferior STEMI, V4R elevation, clear lungs, hypotension with nitrates'],
      ['Acute PE', 'Sudden afterload', 'RV dilated, TAPSE < 16, McConnell, troponin and BNP up; a PA systolic that cannot exceed ~ 50'],
      ['ARDS and the ventilator', 'Hypoxic vasoconstriction, acidosis, high plateau and PEEP, microthrombi (acute cor pulmonale in 20–25%)', 'Septal flattening in systole, RV:LV > 0.6–1; driving pressure ≥ 18, PaCO2 ≥ 48, P/F < 150 are the risk factors'],
      ['Chronic PH (groups 1–5)', 'Trained then exhausted', 'Hypertrophy, PA systolic 60–100+, RA ↑, pericardial effusion'],
      ['After cardiac surgery / LVAD', 'Ischaemia, bypass, a suddenly unloaded LV that pulls the septum', 'PAPi < 1.85, RA:PAOP > 0.63, SVI < 25; the LVAD flows poorly and the RA climbs'],
      ['Sepsis', 'Depression plus a strained bed', 'RV dysfunction in 30–50%'],
      ['Left heart disease', 'Post-capillary PH, then combined', 'The commonest cause overall']] } },
    { h: 'Measuring it', table: { head: ['Measure', 'Abnormal', 'Notes'], rows: [
      ['TAPSE', '< 17 mm', 'Longitudinal shortening of the annulus; simple and robust; load-dependent; falsely normal with severe TR, falsely low after cardiac surgery (pericardiotomy)'],
      ['S′ (tissue Doppler)', '< 9.5 cm/s', 'The same motion as a velocity'],
      ['Fractional area change', '< 35%', 'Needs the whole RV in the four-chamber view'],
      ['RV : LV basal diameter', '> 0.6 dilated; > 1 severe', 'With the septal position (D sign in diastole = volume, in systole = pressure)'],
      ['TAPSE / PASP', '< 0.31 mm/mm Hg', 'Coupling: how much motion per unit of afterload'],
      ['RV free-wall strain', '> −20% (less negative)', 'Sensitive, needs software'],
      ['3D RVEF / cardiac MRI', '< 45%', 'The reference'],
      ['Catheter', 'RAP > 12–15, RA:PAOP > 0.86, PAPi < 0.9 (MI) / < 1.85 (LVAD), RVSWI low, SVI < 25', 'The only measure of the pressures the RV faces and makes'],
      ['Inferior vena cava', '> 2.1 cm with < 50% collapse', 'RAP ≈ 15; a full IVC is RV failure, tamponade or volume overload — the rest of the echo decides']] } },
    { h: 'Treating it', table: { head: ['Lever', 'How', 'Caveat'], rows: [
      ['Afterload', 'Oxygen (PaO2 > 60), pH > 7.25, PaCO2 normal, lung volumes at FRC (Vt 6, PEEP the minimum that oxygenates, avoid auto-PEEP), inhaled NO 10–40 ppm or inhaled epoprostenol, treat the PE, sildenafil for chronic PH', 'Systemic vasodilators drop the perfusion pressure; intubation is a crisis — pressor running, ketamine/etomidate, no bolus propofol'],
      ['Preload', 'If RAP < 8–10: 250 mL at a time, watching the RAP and the output; if RAP > 12–15 with a D-shaped LV: diurese or ultrafiltrate', 'The RV that is full gets worse with volume (interdependence); the test is the response'],
      ['Perfusion pressure', 'Norepinephrine to a MAP ≥ 65 (the RV coronary gradient); vasopressin spares the PVR', 'Phenylephrine raises the PVR'],
      ['Contractility', 'Dobutamine 2–10 µg/kg/min; milrinone 0.125–0.5 µg/kg/min (also drops the PVR; hypotension, renal clearance); levosimendan', 'Both need a pressure; both make arrhythmia'],
      ['Rhythm', 'Sinus and AV synchrony: cardiovert the new AF, AV-sequential pacing in heart block, treat the rate', 'The stiff or failing RV depends on the atrial kick'],
      ['Mechanical', 'Impella RP (RA → PA pump), ProtekDuo (RA → PA with or without an oxygenator), VA ECMO (bypasses the RV and the lung), RVAD', 'Pulmonary flow devices do not help an obstructed PA (PE: use VA ECMO); exit strategy first'],
      ['The ventilator', 'Lowest driving pressure and PEEP compatible with the oxygenation; prone position in ARDS lowers the RV afterload (and the cor pulmonale rate)', 'Hypercapnia raises the PVR: the permissive limit is the RV’s']] } },
    { src: ['Haddad F, et al. Right ventricular function in cardiovascular disease, parts I and II. Circulation 2008;117:1436–48 and 1717–31.', 'Mekontso Dessap A, et al. Acute cor pulmonale during protective ventilation for ARDS: prevalence, predictors, and clinical impact. Intensive Care Med 2016;42:862–70.', 'Konstam MA, et al. Evaluation and management of right-sided heart failure: AHA scientific statement. Circulation 2018;137:e578–622.', 'Vieillard-Baron A, et al. Diagnostic workup, etiologies and management of acute right ventricle failure. Intensive Care Med 2018;44:774–90.'] }
  ] };

  T.hemo_echo = { title: 'Echo as the haemodynamic monitor', kicker: 'The six views that answer the Swan’s questions non-invasively', blocks: [
    { p: 'Point-of-care echo answers the first question — which shock — in minutes and most of the catheter’s questions approximately: the stroke volume (LVOT VTI), the filling pressure (E/e′, the IVC), the RV (TAPSE, size, the septum), the pericardium, the valves. The catheter adds the numbers that the echo estimates (the wedge, the PVR, the mixed venous saturation) and the trend hour by hour. Use both.' },
    { h: 'The measures', table: { head: ['Question', 'Measure', 'Normal', 'Abnormal and meaning'], rows: [
      ['Stroke volume / output', 'LVOT VTI (PW Doppler, apical 5-chamber) × LVOT area (π(d/2)², d ≈ 2 cm → 3.1 cm²)', 'VTI 18–22 cm; SV 60–100 mL', 'VTI < 15: low output (or AF, aortic stenosis); the change after a leg raise ≥ 12% = fluid responsive'],
      ['Left-sided filling pressure', 'E/e′ (mitral inflow E over the annular e′)', '< 8', '> 14: PAOP > 15 likely (less reliable in AF, mitral disease, HFpEF with a normal E/e′); the LA size and the pulmonary vein flow help'],
      ['Right atrial pressure', 'IVC diameter and collapse (subcostal, sniff)', '≤ 2.1 cm and > 50% collapse → 3 mm Hg', '> 2.1 cm and < 50% → 15; in between → 8; useless on the ventilator (a full IVC is PPV, not volume)'],
      ['PA pressure', 'TR jet Vmax: RVSP = 4v² + RAP; mPAP ≈ 0.61 × RVSP + 2; or from the PR jet', 'RVSP < 35', '> 35–40 PH likely; the acute RV cannot generate > 50–60'],
      ['RV function', 'TAPSE, S′, FAC, RV:LV, septal shape', 'TAPSE ≥ 17, S′ ≥ 9.5, FAC ≥ 35%, RV:LV < 0.6', 'D-shaped septum: diastolic = volume overload, systolic = pressure overload; McConnell’s sign in PE'],
      ['Pericardium', 'Effusion size; RA systolic collapse, RV diastolic collapse; IVC plethora; mitral inflow variation > 30% / tricuspid > 60%', 'None', 'Tamponade is a clinical diagnosis the echo supports; a localised post-surgical collection may tamponade a single chamber'],
      ['LV function', 'Visual EF, fractional shortening; the hyperdynamic underfilled LV (kissing walls) vs the dilated hypocontractile one', 'EF 55–70%', 'Kissing walls: hypovolaemia or vasoplegia; dilated and poor: cardiogenic'],
      ['Valves', 'Colour and spectral Doppler', '', 'Acute MR (flail, giant v waves), aortic stenosis (fixed output), AR (a wedge that under-reads)'],
      ['Fluid responsiveness', 'IVC distensibility (ventilated, no effort) > 18%; VTI change with passive leg raise; SVV/PPV from the arterial line > 12–13%', '', 'Responsive ≠ needs fluid: ask what it will cost the lungs and the RV']] } },
    { src: ['Vieillard-Baron A, et al. A decade of progress in critical care echocardiography: a narrative review. Intensive Care Med 2019;45:770–88.', 'Rudski LG, et al. Guidelines for the echocardiographic assessment of the right heart in adults (ASE). J Am Soc Echocardiogr 2010;23:685–713.', 'Nagueh SF, et al. Recommendations for the evaluation of LV diastolic function by echocardiography. J Am Soc Echocardiogr 2016;29:277–314.', 'Monnet X, et al. Prediction of fluid responsiveness: an update. Ann Intensive Care 2016;6:111.'] }
  ] };

  T.hemo_lab = { title: 'The Swan–Ganz lab', kicker: 'A catheterised heart: set the patient, read every port, watch the numbers move', blocks: [
    { p: 'A model of the circulation with a pulmonary artery catheter in it. The heart on the left is drawn with the catheter from the jugular vein through the right atrium and ventricle into the pulmonary artery; click a position (or step the catheter in) to see that port’s waveform on the monitor, with the ECG for timing and the breath moving the baseline. The sliders set the patient — volume, each ventricle’s contractility and stiffness, the two resistances, the valves, the pericardium, the rate, the blood — and the treatments apply what a drug or a device does. The panel on the right computes everything the sheet would: the pressures, the output, SVR and PVR, TPG, DPG, PAPi, CPO, the ratios, the Fick saturation, the echo surrogates (TAPSE, RV:LV, LVOT VTI, coupling), and names the signature.' },
    { widget: 'hemolab' },
    { h: 'How the model works', ul: [
      'Each ventricle is two curves: an exponential end-diastolic pressure–volume relation (its stiffness) and a linear end-systolic one (its contractility, Ees). The volume it holds at its transmural end-diastolic pressure (intracavitary − pericardial) minus the volume it is left with at its end-systolic pressure (≈ the arterial pressure it ejects into, lower with an IABP) is its stroke volume; a regurgitant valve sends a share backward and lifts the atrium.',
      'The body: MAP = RAP + (forward LV output + device flow) × SVR; the arterial pulse pressure is the stroke volume over the arterial compliance. The lung: mPAP = PAOP + pulmonary flow × PVR; the PA pulse follows the RV stroke volume and a compliance that falls as the PVR rises (the RC time); PA diastolic sits just above the wedge when the bed is normal.',
      'The loop closes with Guyton: venous return = (mean systemic pressure − RAP) / venous resistance. The solver finds the right atrial pressure at which the return equals what the RV (and a VA circuit) take, and the left-ventricular end-diastolic pressure at which the left heart passes what the right heart sends — two nested bisections, the same way the real circulation settles in a few beats.',
      'The catheter reads intracavitary pressures plus whatever PEEP transmits (a third, on the ventilator); the waveforms are shaped from the computed numbers (a, c, v waves; dicrotic notches; the big v of MR or TR; the lost y descent of tamponade; the dip-and-plateau of constriction) and are not a simulation of the fluid dynamics.',
      'The echo surrogates are mapped from the model’s ventricles (TAPSE from the RV ejection fraction, RV:LV from the volumes, LVOT VTI from the stroke volume); they move the right way and sit near the right thresholds. A teaching fiction with the right directions.'] }
  ] };

  T.hemo_cases = { title: 'Shock at the bedside', kicker: 'Eleven patients: name the shock, choose the first move, see what the numbers do', blocks: [
    { p: 'Each case gives the story, the exam and the echo; you name the type of shock, then the Swan numbers are revealed and you choose the first intervention; the model recomputes the haemodynamics after your choice and after the best one, so the consequence is visible — the wedge that rises with the bolus, the output that climbs with the inotrope, the pressure that falls with the dilator. “Show in the lab” opens the patient in the Swan–Ganz lab to keep working.' },
    { widget: 'hemocases' },
    { note: 'The verdicts follow the SCAI, AHA/ACC, ESC and ESICM guidance cited on the other pages; the numbers come from the same model as the lab, so they are internally consistent rather than taken from a chart. Your centre’s protocol and the patient in front of you decide.' }
  ] };

  const GROUPS = [
    { title: 'Start', ids: ['hemo_intro', 'hemo_swan', 'hemo_determinants'] },
    { title: 'The numbers', ids: ['hemo_numbers', 'hemo_pulm'] },
    { title: 'The patient', ids: ['hemo_shock', 'hemo_rv', 'hemo_echo'] },
    { title: 'Practice', ids: ['hemo_lab', 'hemo_cases'] }
  ];
  root.PFT_HEMO = { topics: T, groups: GROUPS, PATIENT: PATIENT, run: run, trace: trace, breath: breath, INTERVENTIONS: INTERVENTIONS, apply: apply, PRESETS: PRESETS, preset: preset, SCENARIOS: SCENARIOS, flags: flags, signature: signature, lvState: lvState, rvState: rvState };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PFT_HEMO;
})(typeof window !== 'undefined' ? window : globalThis);
