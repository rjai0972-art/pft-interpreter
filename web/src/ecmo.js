/* ------------------------------------------------------------------ extracorporeal membrane oxygenation: VV and VA, the circuit, the physiology, the troubles
   Content for the Learn area (what ECMO is and is not, the circuit and its numbers, the cannulation configurations, the
   physiology of VV and of VA support, selection, daily management, complications and liberation — after the ELSO
   guidelines and the trials) and a teaching model of a patient on the circuit: pump speed → flow against what the drainage
   gives; the membrane lung → the post-oxygenator gas; the ratio of circuit flow to cardiac output and the recirculation →
   the arterial saturation on VV; sweep gas → the PaCO2; on VA the retrograde flow meets the native ejection in the aorta,
   so the right arm and the legs can breathe different blood, and the left ventricle pays for the afterload. Textbook
   numbers and shapes; the point is which way things move and why. Pure functions: usable in node for the tests. */
(function (root) {
  'use strict';
  const PH = root.PFT_PHYS;
  const T = {};

  /* ================================================================== the model ================================================================== */
  const P50 = 26.8;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function satOf(po2) { return PH.sat(Math.max(0, po2), P50); }
  function po2Of(s) { s = clamp(s, 0.0005, 0.9995); return P50 * Math.pow(s / (1 - s), 1 / 2.7); }
  function content(hb, po2) { return PH.o2content(hb, satOf(po2), po2); }
  function po2FromContent(hb, c) {
    if (c <= 0) return 0;
    let lo = 0, hi = 760;
    for (let i = 0; i < 48; i++) { const m = (lo + hi) / 2; if (content(hb, m) < c) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  const CO2_SLOPE = 0.45;   // mL CO2 per dL per mm Hg, the dissociation curve in the physiological range (at a fixed saturation)
  const CO2_K = 0.4;        // how fast the post-membrane PCO2 falls with the sweep-to-flow ratio

  /* cannulas: the flow a drainage cannula can give with a normal venous reservoir, and the return pressure a return cannula costs */
  const DRAIN = { 21: 4.0, 23: 5.0, 25: 6.0, 27: 6.6, 29: 7.2, 31: 7.6 };
  const RETURN = { 15: 70, 17: 50, 19: 36, 21: 28, 23: 22 };   // mm Hg per L/min of flow, roughly
  const CONFIGS = {
    vv: [['fj', 'Femoro-jugular (two sites)', 'Drainage from the IVC through the femoral vein, return to the right atrium through the right internal jugular. The workhorse: large drainage, low recirculation if the tips sit 10–15 cm apart.'],
      ['dl', 'Bicaval dual-lumen (one site)', 'One cannula in the right internal jugular drains the SVC and IVC and returns through a port that must face the tricuspid valve. Mobilises well; placement needs fluoroscopy or echo; flow limited by the lumens; rotation sends the jet into the drainage port.'],
      ['ff', 'Femoro-femoral', 'Both cannulas from the groins, drainage tip in the IVC and return tip in the right atrium. Quick in an emergency; the tips are close, so recirculation runs higher.']],
    va: [['pf', 'Peripheral femoro-femoral', 'Drainage from the femoral vein (tip in the RA), return retrograde up the femoral artery with a distal perfusion catheter for the leg. The default in shock and in ECPR; brings the mixing-zone problem and the afterload.'],
      ['ax', 'Femoral drainage, axillary return', 'Return through a graft on the right axillary artery: antegrade flow into the arch, so the brain and the coronaries receive circuit blood; permits mobilisation; hyperperfusion of the arm.'],
      ['ce', 'Central (RA → ascending aorta)', 'After cardiotomy, through the open chest: antegrade flow from the aortic root, full flows, no limb at risk, no Harlequin — at the cost of an open sternum, bleeding and infection.']]
  };

  /* membrane lung: post-oxygenator PO2 and PCO2 from the pre-oxygenator blood, the sweep, the FdO2 and the condition of the membrane (1 new, 0 clotted) */
  function membrane(p, s, preO2, preCO2) {
    const Q = Math.max(0.1, s.flow), fn = clamp(s.oxy, 0, 1), fd = clamp(s.fdo2, 0.21, 1);
    const rated = 7;                                                   // L/min of blood the membrane is rated for
    const eff = fn * Math.pow(Math.min(1, rated / Q), 0.6);            // transfer efficiency falls past the rated flow
    const target = fd * 673 * 0.72;                                    // a new membrane brings PO2 near 480 on 100% oxygen
    let postO2 = s.sweep <= 0 ? preO2 : preO2 + eff * (target - preO2);
    let cPre = content(p.hb, preO2), cPost = content(p.hb, postO2);
    const grad = Math.pow(clamp((1 - satOf(preO2)) / 0.35, 0.5, 2.2), 0.7);     // a more desaturated inlet gives the membrane a bigger gradient to work with
    const cap = (65 * Math.min(Q, rated)) * grad * (0.25 + 0.75 * fn) * (0.8 + 0.2 * fd);   // mL O2/min the membrane can hand over (adult PMP: ~450 at 7 L/min, inlet 65%); the FdO2 acts mainly through the PO2 it can reach
    let transfer = Q * 10 * (cPost - cPre);
    if (transfer > cap) { transfer = cap; cPost = cPre + cap / (10 * Q); postO2 = po2FromContent(p.hb, cPost); }
    // CO2 follows the sweep-to-blood-flow ratio; a clotted membrane clears less
    const k = CO2_K * (0.25 + 0.75 * fn);
    const postCO2 = s.sweep <= 0 ? preCO2 : preCO2 * Math.exp(-k * s.sweep / Q);
    const vco2Removed = Q * 10 * CO2_SLOPE * (preCO2 - postCO2);
    return { postO2: postO2, postSat: satOf(postO2), cPost: cPost, cPre: cPre, transfer: Math.max(0, transfer), postCO2: postCO2, vco2Removed: vco2Removed, cap: cap };
  }

  /* the pump: what the speed asks for, what the drainage can give, and the pressures that result */
  function pump(p, s) {
    const demand = Math.max(0, 1.9 * (s.rpm - 1000) / 1000);          // L/min the pump would move with free drainage
    const cap0 = DRAIN[s.drain] || 6;
    const volK = clamp(0.35 + 0.08 * p.cvp, 0.35, 1.15);               // the venous reservoir
    const obstruct = s.kink ? 0.5 : 1;
    const cap = cap0 * volK * obstruct;
    const excess = Math.max(0, (demand - cap) / Math.max(0.5, cap));
    const flow = demand <= cap ? demand : cap * Math.max(0.55, 1 - 0.4 * excess);   // suck-down: the vessel collapses and the flow falls
    const chatter = excess > 0.03;
    const pDrain = -(6 + 11 * flow + 90 * Math.min(1.5, excess) * (1 + 0.5 * (s.kink ? 1 : 0)));
    const retK = RETURN[s.ret] || 36;
    const dP = (6 + 5 * flow) * (1 + 4 * (1 - clamp(s.oxy, 0, 1)));   // the membrane's pressure drop, up with clot
    const pPost = 20 + retK * flow + (s.mode === 'va' ? 50 : 0);       // return pressure: the cannula plus, on VA, the arterial pressure
    const pPre = pPost + dP;
    return { demand: demand, cap: cap, flow: flow, chatter: chatter, pDrain: Math.max(-300, pDrain), pPre: pPre, pPost: pPost, dP: dP, excess: excess };
  }

  /* the CO2 balance: the body makes VCO2; the membrane and the native lung remove it; find the venous PCO2 that balances */
  function co2Balance(p, s, Q, Qeff, R, co) {
    const fn = clamp(s.oxy, 0, 1), k = CO2_K * (0.25 + 0.75 * fn), ratio = Q > 0 ? s.sweep / Q : 0;
    const e = s.sweep <= 0 || Q <= 0 ? 1 : Math.exp(-k * ratio);
    const va = Math.max(0, p.va);                                      // native alveolar ventilation, L/min
    const solve = (pv) => {
      const pre = (1 - R) * pv / Math.max(0.05, 1 - R * e);            // recirculated post-membrane blood dilutes the drainage
      const post = pre * e;
      const removedM = Q * 10 * CO2_SLOPE * (pre - post);
      const ppa = co > 0 ? (Qeff * post + Math.max(0, co - Qeff) * pv) / co : pv;   // what reaches the pulmonary artery
      const pa = ppa / (1 + va / (0.863 * 10 * CO2_SLOPE * Math.max(0.3, co)));
      const removedL = va * pa / 0.863;
      return { pre: pre, post: post, removedM: removedM, ppa: ppa, pa: pa, removedL: removedL, total: removedM + removedL };
    };
    let lo = 5, hi = 250, r = null;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; r = solve(m); if (r.total < p.vco2) lo = m; else hi = m; }
    r = solve((lo + hi) / 2); r.pv = (lo + hi) / 2;
    return r;
  }
  function phOf(hco3, pco2) { return 6.1 + Math.log10(hco3 / (0.03 * Math.max(5, pco2))); }
  function lactateWord(ratio, fx) {
    const w = ratio < 2 ? 'rising fast' : (ratio < 2.5 ? 'rising' : (ratio < 3.5 ? 'stable' : 'clearing'));
    return fx && fx.lactate > 0.3 ? w + ' (β-agonist lactate confounds it)' : w;
  }

  /* ================================================================== vasoactive drips (v8.4) ==================================================================
     Each drug acts through its receptors with an Emax dose–response ([Emax, ED50, Hill]) on the systemic resistance (constrictors multiply it,
     dilators divide it), the contractility, the heart rate, the venous tone (as mm Hg of CVP) and the pulmonary resistance; epinephrine
     and dopamine also make lactate and arrhythmia. The effects are combined and then applied to the patient before the circuit runs. */
  const DRIPS = [
    { id: 'ne', name: 'Norepinephrine', unit: 'mcg/kg/min', max: 1, step: 0.02, rec: 'α1 ≫ β1', fx: { svr: [0.9, 0.25, 1.2], contr: [0.25, 0.15, 1], hr: [8, 0.3, 1], ven: [2.5, 0.3, 1], pvr: [0.3, 0.3, 1] }, lact: 0.25, arr: 0.2, nee: 1 },
    { id: 'vp', name: 'Vasopressin', unit: 'U/min', max: 0.06, step: 0.01, rec: 'V1', fx: { svr: [0.7, 0.025, 1.5], hr: [-3, 0.02, 1], ven: [1, 0.02, 1] }, lact: 0, arr: 0, nee: 2.5 },
    { id: 'epi', name: 'Epinephrine', unit: 'mcg/kg/min', max: 0.5, step: 0.02, rec: 'β1 = β2 ≥ α1', fx: { contr: [0.7, 0.08, 1], hr: [35, 0.12, 1], dil: [0.12, 0.04, 1.5], svr: [0.8, 0.3, 1.6], pvr: [0.2, 0.3, 1], ven: [1.5, 0.2, 1] }, lact: 1, arr: 0.7, nee: 1 },
    { id: 'phe', name: 'Phenylephrine', unit: 'mcg/kg/min', max: 3, step: 0.1, rec: 'α1', fx: { svr: [0.8, 1.0, 1.2], hr: [-10, 1.0, 1], pvr: [0.25, 1.0, 1], ven: [2, 1.0, 1] }, lact: 0, arr: 0, nee: 0.1 },
    { id: 'dopa', name: 'Dopamine', unit: 'mcg/kg/min', max: 20, step: 1, rec: 'D1 → β1 → α1 with the dose', fx: { contr: [0.4, 6, 1.2], hr: [25, 7, 1.2], svr: [0.6, 13, 2.2], ven: [1.5, 10, 1] }, lact: 0.3, arr: 0.8, nee: 0.01 },
    { id: 'dobu', name: 'Dobutamine', unit: 'mcg/kg/min', max: 20, step: 0.5, rec: 'β1 > β2', fx: { contr: [0.8, 6, 1], hr: [18, 7, 1], dil: [0.22, 6, 1], pvr: [-0.15, 6, 1] }, lact: 0.2, arr: 0.4, nee: 0 },
    { id: 'mil', name: 'Milrinone', unit: 'mcg/kg/min', max: 0.75, step: 0.125, rec: 'PDE-3 inhibitor (inodilator)', fx: { contr: [0.5, 0.3, 1], hr: [6, 0.3, 1], dil: [0.32, 0.3, 1], pvr: [-0.4, 0.25, 1] }, lact: 0, arr: 0.3, nee: 0 },
    { id: 'ang', name: 'Angiotensin II', unit: 'ng/kg/min', max: 80, step: 5, rec: 'AT1', fx: { svr: [0.8, 30, 1.3], hr: [-2, 30, 1] }, lact: 0, arr: 0, nee: 0.01 },
    { id: 'ino', name: 'Inhaled nitric oxide', unit: 'ppm', max: 40, step: 5, rec: 'pulmonary vasodilator', fx: { pvr: [-0.45, 10, 1.2] }, lact: 0, arr: 0, nee: 0 },
    { id: 'nip', name: 'Nitroprusside', unit: 'mcg/kg/min', max: 5, step: 0.25, rec: 'NO donor (arterial and venous)', fx: { dil: [0.45, 1.5, 1], hr: [10, 1.5, 1], pvr: [-0.2, 1.5, 1], ven: [-2.5, 1.5, 1] }, lact: 0, arr: 0, nee: 0 }
  ];
  const emax = (d, k) => { if (!k || d <= 0) return 0; const n = k[2] || 1, x = Math.pow(d, n); return k[0] * x / (Math.pow(k[1], n) + x); };
  function vasoactive(drugs) {
    drugs = drugs || {};
    const out = { svr: 1, contr: 1, hr: 0, cvp: 0, pvr: 1, lactate: 0, arr: 0, nee: 0, active: [] };
    let con = 1, dil = 1, inot = 0, pvrUp = 1, pvrDown = 1;
    DRIPS.forEach(D => {
      const d = +drugs[D.id] || 0; if (d <= 0) return;
      out.active.push(D.id);
      con *= 1 + emax(d, D.fx.svr); dil *= 1 - emax(d, D.fx.dil);
      inot += emax(d, D.fx.contr); out.hr += emax(d, D.fx.hr); out.cvp += emax(d, D.fx.ven);
      const pv = emax(d, D.fx.pvr); if (pv > 0) pvrUp *= 1 + pv; else pvrDown *= 1 + pv;
      out.lactate += D.lact * Math.min(1, d / (D.max * 0.5)); out.arr += D.arr * Math.min(1, d / (D.max * 0.6));
      out.nee += D.nee * d;
    });
    out.svr = con * dil;
    out.contr = 1 + 1.4 * Math.tanh(inot / 1.4);     // β-agonists and PDE inhibitors add, with a ceiling
    out.pvr = pvrUp * pvrDown;
    out.lactate = Math.min(1, out.lactate); out.arr = Math.min(1, out.arr);
    return out;
  }
  /* the patient the circuit sees once the drips have acted: SVR, contractility, heart rate, venous filling and PVR */
  function applyDrugs(p, s) {
    const fx = vasoactive(s.drugs), hr0 = p.hr || 95;
    const q = Object.assign({}, p);
    q.svr = (p.svr || 16) * fx.svr;
    q.contr = Math.min(1.3, (p.contr === undefined ? 0.25 : p.contr) * fx.contr);
    q.hr = Math.round(hr0 + fx.hr);
    q.cvp = clamp(p.cvp + fx.cvp, 0, 30);
    q.pvr = Math.max(0.3, (p.pvr || 1) * fx.pvr);
    // the native output on VV: what the heart does with its contractility, rate, afterload and the right ventricle's load
    const hrF = clamp(Math.pow(q.hr / hr0, 0.3), 0.8, 1.25), contrF = Math.pow(fx.contr, 0.55), afterF = Math.pow(fx.svr, -0.2), rvF = 1 / (1 + 0.45 * Math.pow(Math.max(0, q.pvr - 1), 1.3));
    q.coEff = (p.co || 6.5) * hrF * contrF * afterF * rvF;
    q.fx = fx;
    return q;
  }

  /* ---------------- VV ---------------- */
  function runVV(p0, s) {
    const p = applyDrugs(p0, s);
    const pm = pump(p, s), Q = pm.flow;
    const sS = Object.assign({}, s, { flow: Q });
    const R = clamp(s.recirc, 0, 0.9), co = Math.max(0.5, p.coEff), Qeff = Math.min(Q * (1 - R), co * 0.98);
    const c = co2Balance(p, sS, Q, Qeff, R, co);
    const paco2 = c.pa;
    const pAO2 = Math.max(0, PH.pao2(p.fio2, 760, paco2, 0.8));
    const cCap = content(p.hb, pAO2);
    let ca = content(p.hb, 60), m = null, cv = 0, cpre = 0, pvO2 = 40, preO2 = 40;
    for (let i = 0; i < 40; i++) {
      cv = Math.max(0.5, ca - p.vo2 / (10 * co));
      pvO2 = po2FromContent(p.hb, cv);
      // the drainage sees venous blood plus whatever recirculates
      const postGuess = m ? m.cPost : content(p.hb, 400);
      cpre = (1 - R) * cv + R * postGuess;
      preO2 = po2FromContent(p.hb, cpre);
      m = membrane(p, sS, preO2, c.pre);
      const cpa = co > 0 ? (Qeff * m.cPost + Math.max(0, co - Qeff) * cv) / co : cv;
      // the native lung lifts the pulmonary-arterial blood to what its alveoli allow, except the shunt
      const caLung = (1 - p.shunt) * Math.max(cpa, cCap) + p.shunt * cpa;
      ca = 0.5 * ca + 0.5 * caLung;
    }
    const pao2 = po2FromContent(p.hb, ca), sao2 = satOf(pao2), svo2 = satOf(pvO2), spre = satOf(preO2);
    const do2 = co * ca * 10, ratio = do2 / p.vo2;
    const pH = phOf(p.hco3, paco2);
    const flowRatio = Qeff / co;
    const lactate = lactateWord(ratio, p.fx);
    const map = Math.round(co * p.svr * Math.pow(5.5 / Math.max(1, co), 0.45) * 0.9);
    return { mode: 'vv', pump: pm, flow: Q, qeff: Qeff, recirc: R, flowRatio: flowRatio, co: co, coSet: p0.co, map: map, hr: p.hr, pvr: p.pvr, svr: p.svr, cvp: p.cvp, fx: p.fx,
      preO2: preO2, preSat: spre, preCO2: c.pre, postO2: m.postO2, postSat: m.postSat, postCO2: c.post, transfer: m.transfer, vco2Membrane: c.removedM, vco2Lung: c.removedL,
      pao2: pao2, sao2: sao2, spo2: Math.round(sao2 * 100), paco2: paco2, ph: pH, pvO2: pvO2, svo2: svo2, cv: cv, ca: ca, do2: do2, do2vo2: ratio, lactate: lactate,
      pvco2: c.pv, cCap: cCap, pAO2: pAO2 };
  }

  /* ---------------- VA ---------------- */
  const BRANCH = [['coronary', 0.05], ['innominate', 0.12], ['lcarotid', 0.08], ['lsubclavian', 0.07], ['descending', 0.68]];
  function runVA(p0, s) {
    const p = applyDrugs(p0, s);
    const pm = pump(p, s), Q = pm.flow;
    const sS = Object.assign({}, s, { flow: Q });
    const svr = p.svr || 16;
    const hrF = clamp(Math.pow(p.hr / (p0.hr || 95), 0.3), 0.8, 1.25);
    // the native ejection: what the ventricle has, minus what the afterload of the retrograde flow takes; a device adds its own forward flow
    let qn = 0, map = 70, dev = 0;
    for (let i = 0; i < 30; i++) {
      const qn0 = p.contr * 5.0 * hrF;
      const after = Math.max(0, 1 - 0.011 * (map - 60));
      dev = s.unload === 'impella' ? 2.8 : 0;
      qn = Math.max(0, qn0 * after) + (s.unload === 'iabp' ? 0.25 * p.contr : 0);
      const qt = Q + qn + dev;
      map = 0.5 * map + 0.5 * (qt * svr * Math.pow(5.5 / Math.max(1, qt), 0.45));   // the resistance yields a little to a high flow
    }
    const qt = Q + qn + dev, qnTot = qn + dev;                          // blood that goes through the native lung
    const central = s.config === 'ce' || s.config === 'ax';
    // the ventricle's filling: what it cannot eject stays behind
    const lvedp = clamp(5 + 14 * (1 - p.contr) + 2.5 * Math.max(0, Q - 2.5) * (1 - p.contr) - (s.unload === 'impella' ? 11 : 0) - (s.unload === 'iabp' ? 2.5 : 0) - (s.unload === 'septostomy' ? 8 : 0) + 0.6 * Math.max(0, p.cvp - 8), 3, 40);
    const avOpens = qn > 0.4;
    const pp = avOpens ? Math.round(4 + 11 * qn) : (s.unload === 'iabp' ? 8 : (s.unload === 'impella' ? 5 : 2));
    const vented = s.unload === 'impella' || s.unload === 'septostomy';
    const distension = lvedp > 18 && !avOpens && !vented;
    const oedema = lvedp > 22;
    const shunt = clamp(p.shunt + (oedema ? 0.12 : 0), 0, 0.9);
    // CO2: the circuit's return carries the sweep's PCO2; the native lung carries its own
    const c = co2Balance(p, sS, Q, Q, 0, Math.max(0.3, qt));
    const paco2Native = c.pa, paco2Circuit = c.post;
    const pAO2 = Math.max(0, PH.pao2(p.fio2, 760, paco2Native, 0.8));
    const cCap = content(p.hb, pAO2);
    // oxygen: iterate the venous content
    let caMix = content(p.hb, 70), cv = 0, m = null, cn = 0, terr = null, pvO2 = 40;
    for (let i = 0; i < 40; i++) {
      cv = Math.max(0.5, caMix - p.vo2 / (10 * Math.max(0.5, qt)));
      pvO2 = po2FromContent(p.hb, cv);
      m = membrane(p, sS, pvO2, c.pre);
      cn = (1 - shunt) * Math.max(cv, cCap) + shunt * cv;              // what the native lung makes of its share
      // the aorta: native blood takes the branches nearest the root, the circuit's blood comes up from the groin
      terr = {}; let cum = 0, wsum = 0;
      BRANCH.forEach(b => {
        const demand = b[1] * qt;
        let fn;
        if (central) fn = qnTot / qt;                                   // antegrade return mixes at the root: every branch gets the same blend
        else { const avail = qnTot - cum; fn = clamp((avail + 0.25 * demand) / (1.5 * demand), 0, 1); }   // a soft mixing zone
        terr[b[0]] = { fn: fn, c: fn * cn + (1 - fn) * m.cPost, flow: demand };
        wsum += demand * terr[b[0]].c; cum += demand;
      });
      caMix = 0.5 * caMix + 0.5 * (wsum / qt);
    }
    const po2At = (k) => po2FromContent(p.hb, terr[k].c);
    const rr = po2At('innominate'), fem = po2At('descending'), cor = po2At('coronary'), lc = po2At('lcarotid');
    const mixing = central ? null : (() => { let cum = 0; for (let i = 0; i < BRANCH.length; i++) { const d = BRANCH[i][1] * qt; if (qnTot < cum + d) return i + clamp((qnTot - cum) / d, 0, 1); cum += d; } return BRANCH.length; })();
    const harlequin = !central && rr < 60 && fem > 100;
    const do2 = qt * caMix * 10, ratio = do2 / p.vo2;
    const paco2RR = terr.innominate.fn * paco2Native + (1 - terr.innominate.fn) * paco2Circuit;
    const paco2Fem = terr.descending.fn * paco2Native + (1 - terr.descending.fn) * paco2Circuit;
    const limbRisk = s.config === 'pf' && !s.dpc ? (s.ret >= 17 ? 'high' : 'moderate') : 'low';
    const lactate = lactateWord(ratio, p.fx);
    return { mode: 'va', pump: pm, flow: Q, qn: qn, qnTot: qnTot, qt: qt, map: Math.round(map), pp: pp, avOpens: avOpens, lvedp: Math.round(lvedp), distension: distension, oedema: oedema, shunt: shunt, hr: p.hr, svr: p.svr, contrEff: p.contr, fx: p.fx,
      preO2: pvO2, preSat: satOf(pvO2), preCO2: c.pre, postO2: m.postO2, postSat: m.postSat, postCO2: c.post, transfer: m.transfer,
      rrO2: rr, rrSat: satOf(rr), femO2: fem, femSat: satOf(fem), corO2: cor, corSat: satOf(cor), lcO2: lc, lcSat: satOf(lc), mixing: mixing, harlequin: harlequin, central: central,
      paco2RR: paco2RR, paco2Fem: paco2Fem, phRR: phOf(p.hco3, paco2RR), phFem: phOf(p.hco3, paco2Fem), svo2: satOf(pvO2), pvO2: pvO2, do2: do2, do2vo2: ratio, lactate: lactate, limbRisk: limbRisk, terr: terr, cn: cn, nativePaO2: po2FromContent(p.hb, cn) };
  }
  function run(p, s) { return s.mode === 'va' ? runVA(p, s) : runVV(p, s); }

  /* the defaults and the presets (a patient and the circuit) */
  const PATIENT = { hb: 10, vo2: 290, vco2: 240, co: 6.5, shunt: 0.6, fio2: 0.4, va: 1.5, cvp: 8, hco3: 24, contr: 0.25, svr: 16, hr: 95, pvr: 1 };
  const VV_PATIENT = { svr: 11 };
  const SETTINGS = { vv: { mode: 'vv', config: 'fj', rpm: 3400, sweep: 2.5, fdo2: 1, oxy: 1, drain: 25, ret: 21, recirc: 0.15, kink: false, unload: 'none', dpc: true, drugs: {} },
    va: { mode: 'va', config: 'pf', rpm: 3300, sweep: 2.5, fdo2: 1, oxy: 1, drain: 25, ret: 17, recirc: 0, kink: false, unload: 'none', dpc: true, drugs: {} } };
  const PRESETS = [
    { id: 'vv_run', title: 'VV: a good run', mode: 'vv', p: {}, s: {}, note: 'Severe ARDS, circuit 4.6 L/min against a cardiac output of 6.5, sweep 2.5, lung at rest. SaO2 in the high 80s–low 90s is what VV buys; it is enough.' },
    { id: 'vv_recirc', title: 'VV: recirculation', mode: 'vv', p: {}, s: { config: 'ff', recirc: 0.45 }, note: 'Femoro-femoral tips too close (or a dual-lumen cannula rotated): the drainage draws back the bright blood it just returned — recirculation. Pre-oxygenator saturation climbs toward the post; the patient falls.' },
    { id: 'vv_highco', title: 'VV: septic, febrile, cardiac output 10', mode: 'vv', p: { co: 10, vo2: 400, vco2: 330 }, s: {}, note: 'The circuit is unchanged but now processes under half the venous return: the saturation falls although the membrane works perfectly. Treat the demand, not the sweep.' },
    { id: 'vv_oxyfail', title: 'VV: a failing membrane', mode: 'vv', p: {}, s: { oxy: 0.3 }, note: 'Day 12: post-oxygenator PO2 150 on 100% sweep oxygen, ΔP climbing, plasma free haemoglobin up. Plan the exchange before it fails at 3 a.m.' },
    { id: 'vv_chatter', title: 'VV: chatter after diuresis', mode: 'vv', p: { cvp: 3 }, s: { rpm: 3800 }, note: 'Pump speed asks for more than the emptied cava can give: the line shakes, the flow swings, the drainage pressure dives past −100. Turn the speed down first; then ask why.' },
    { id: 'vv_wean', title: 'VV: sweep-off trial', mode: 'vv', p: { shunt: 0.15, va: 4.5, fio2: 0.4, vo2: 250, vco2: 200 }, s: { sweep: 0 }, note: 'The lung has recovered: shunt 15%, ventilator at acceptable settings. Gas off, blood flow kept — the membrane is now a bystander and the gas is the lung’s own.' },
    { id: 'va_shock', title: 'VA: cardiogenic shock, day 1', mode: 'va', p: { contr: 0.2, shunt: 0.25, cvp: 12 }, s: {}, note: 'Peripheral VA 4.4 L/min, native ejection small. MAP restored, the lactate clears; the ventricle works against the retrograde column — watch the pulse pressure and the aortic valve.' },
    { id: 'va_harlequin', title: 'VA: Harlequin (North–South)', mode: 'va', p: { contr: 0.6, shunt: 0.55, fio2: 0.5 }, s: {}, note: 'The heart recovers while the lungs are still full: the ventricle pushes dark blood into the arch and the circuit’s red blood only reaches the diaphragm. The right hand is blue, the femoral gas is perfect.' },
    { id: 'va_distension', title: 'VA: a distended, silent ventricle', mode: 'va', p: { contr: 0.08, cvp: 12, shunt: 0.3 }, s: { rpm: 3700 }, note: 'Full flow, MAP 80, pulse pressure nil, the aortic valve never opens: blood keeps arriving in the left heart (bronchial, Thebesian, whatever the RV sends) and has nowhere to go. Smoke, oedema, thrombus. Vent it.' },
    { id: 'va_unloaded', title: 'VA + Impella (ECPELLA)', mode: 'va', p: { contr: 0.08, cvp: 10, shunt: 0.2 }, s: { rpm: 3400, unload: 'impella' }, note: 'The same ventricle with a microaxial pump emptying it into the aorta: the end-diastolic pressure falls, the lungs dry out, the aortic root is washed.' },
    { id: 'va_wean', title: 'VA: flow-down trial', mode: 'va', p: { contr: 0.7, shunt: 0.15, fio2: 0.4, vo2: 230, vco2: 190 }, s: { rpm: 2000, sweep: 2 }, note: 'Recovered contractility: flow turned down toward 1–1.5 L/min with the sweep kept on. If the MAP holds, the VTI is above 10 cm and the ventricle does not dilate, the pump has become optional.' },
    { id: 'va_central', title: 'VA: central cannulation', mode: 'va', p: { contr: 0.6, shunt: 0.55, fio2: 0.5 }, s: { config: 'ce', rpm: 3300 }, note: 'Return into the ascending aorta: every branch receives the same mixture. The same sick lungs that made a Harlequin on peripheral VA are harmless here.' },
    { id: 'va_pressor', title: 'VA: norepinephrine 0.4 and a valve that stops opening', mode: 'va', p: { contr: 0.18, svr: 10, cvp: 12, shunt: 0.3 }, s: { drugs: { ne: 0.4 } }, note: 'A pressor on VA buys pressure by resistance, and the resistance is the ventricle’s afterload: MAP 75, pulse pressure nil, LVEDP climbing. Turn the norepinephrine down, add an inotrope or a vasodilator, and watch the valve.' },
    { id: 'va_inodilator', title: 'VA: dobutamine and nitroprusside open the valve', mode: 'va', p: { contr: 0.12, cvp: 12, shunt: 0.3 }, s: { rpm: 3400, drugs: { dobu: 7.5, nip: 1 } }, note: 'The distended ventricle of the earlier preset with an inodilator and an arterial vasodilator: contractility up, afterload down, the valve opens every beat, the LVEDP falls — at the price of a lower MAP. The flow is turned down to what perfuses.' },
    { id: 'va_vasoplegia', title: 'VA: vasoplegia at full flow — vasopressin', mode: 'va', p: { contr: 0.3, svr: 6, shunt: 0.3 }, s: { rpm: 3600, drugs: { ne: 0.5, vp: 0.03 } }, note: 'Six litres a minute and a MAP in the 50s: the resistance has gone (sepsis, post-bypass, the inflammatory circuit). More flow is not the answer to a resistance problem; norepinephrine and a second, non-catecholamine agent are. Compare with the vasopressin off.' },
    { id: 'vv_dobu', title: 'VV: dobutamine lifts the output and the saturation falls', mode: 'vv', p: {}, s: { drugs: { dobu: 10 } }, note: 'The circuit is unchanged; the heart now pumps 8–9 L/min, so the circuit’s 4.6 is a smaller fraction of the venous return and the SaO2 falls — while the DO2 rises. On VV the saturation is not the patient.' },
    { id: 'vv_rv', title: 'VV: the right ventricle fails against a high PVR', mode: 'vv', p: { pvr: 3, cvp: 14, co: 5.5 }, s: {}, note: 'ARDS lungs and a hypoxic, acidotic pulmonary circulation: the right ventricle cannot push 5.5 L/min through a resistance three times normal; the output falls, the CVP climbs, the DO2 falls. Try inhaled nitric oxide and milrinone from the drips panel, then correct the CO2 with the sweep.' },
    { id: 'vv_rv_ino', title: 'VV: RV failure — iNO and milrinone', mode: 'vv', p: { pvr: 3, cvp: 14, co: 5.5 }, s: { sweep: 4, drugs: { ino: 20, mil: 0.375 } }, note: 'The same patient with the pulmonary resistance brought down: the right ventricle recovers its output, the CVP falls — and milrinone costs some systemic pressure, which may need a little norepinephrine.' }
  ];
  function preset(id) {
    const pr = PRESETS.filter(x => x.id === id)[0]; if (!pr) return null;
    return { p: Object.assign({}, PATIENT, pr.mode === 'vv' ? VV_PATIENT : {}, pr.p), s: Object.assign({}, SETTINGS[pr.mode], { drugs: {} }, pr.s, { drugs: Object.assign({}, pr.s.drugs || {}) }), note: pr.note, title: pr.title };
  }

  /* what the monitors would be shouting */
  function alarms(o, s) {
    const a = [];
    if (o.pump.chatter) a.push({ k: 'drain', t: 'Drainage insufficiency — line chatter, flow unstable' });
    if (o.pump.pDrain < -100) a.push({ k: 'drain', t: 'Drainage pressure ' + o.pump.pDrain.toFixed(0) + ' mm Hg (keep above −100)' });
    if (o.pump.dP > 60) a.push({ k: 'oxy', t: 'Membrane ΔP ' + o.pump.dP.toFixed(0) + ' mm Hg — rising resistance (clot?)' });
    if (s.sweep > 0 && s.fdo2 >= 0.9 && o.postO2 < 200) a.push({ k: 'oxy', t: 'Post-oxygenator PO2 ' + o.postO2.toFixed(0) + ' on FdO2 ' + s.fdo2.toFixed(2) + ' — membrane failing' });
    if (o.pump.pPost > 300) a.push({ k: 'ret', t: 'Return pressure ' + o.pump.pPost.toFixed(0) + ' mm Hg (keep below 300)' });
    if (o.mode === 'vv') {
      if (o.preSat > 0.75 && o.recirc > 0.2) a.push({ k: 'recirc', t: 'Pre-oxygenator saturation ' + Math.round(o.preSat * 100) + '% with a falling patient — recirculation' });
      if (o.sao2 < 0.85) a.push({ k: 'pt', t: 'SaO2 ' + o.spo2 + '%' });
      if (o.flowRatio < 0.55) a.push({ k: 'pt', t: 'Effective flow is ' + Math.round(o.flowRatio * 100) + '% of the cardiac output (needs about 60%)' });
    } else {
      if (o.harlequin) a.push({ k: 'pt', t: 'Differential hypoxaemia: right radial PaO2 ' + o.rrO2.toFixed(0) + ', femoral ' + o.femO2.toFixed(0) });
      if (o.distension) a.push({ k: 'lv', t: 'LV distension: aortic valve closed, LVEDP ' + o.lvedp });
      else if (o.pp < 10) a.push({ k: 'lv', t: 'Pulse pressure ' + o.pp + ' mm Hg — little native ejection' });
      if (o.map < 60) a.push({ k: 'pt', t: 'MAP ' + o.map });
      if (o.femO2 > 300 || o.rrO2 > 300) a.push({ k: 'pt', t: 'Hyperoxia: arterial PaO2 ' + Math.max(o.femO2, o.rrO2).toFixed(0) + ' — wean the FdO2 (keep below 300)' });
      if (o.limbRisk !== 'low') a.push({ k: 'limb', t: 'No distal perfusion catheter with a ' + s.ret + ' Fr femoral cannula — leg at risk' });
    }
    if (o.do2vo2 < 2.5) a.push({ k: 'pt', t: 'DO2:VO2 ' + o.do2vo2.toFixed(1) + ' — supply-limited, lactate ' + o.lactate });
    if (o.hr > 130) a.push({ k: 'pt', t: 'Heart rate ' + o.hr + (o.fx && o.fx.hr > 10 ? ' — chronotropy from the drips' : '') });
    if (o.fx && o.fx.arr > 0.5) a.push({ k: 'pt', t: 'Arrhythmia risk from the catecholamine load' });
    if (o.mode === 'vv' && o.map < 60) a.push({ k: 'pt', t: 'MAP ' + o.map });
    if (o.fx && o.fx.nee > 0.5) a.push({ k: 'pt', t: 'Norepinephrine-equivalent ' + o.fx.nee.toFixed(2) + ' mcg/kg/min — ask why (source, steroids, calcium, the circuit)' });
    return a;
  }

  /* ================================================================== the scenarios ================================================================== */
  /* each: the story, the numbers, the question, the options with a verdict and a reason, the fix in order, and a lab preset before and after */
  const SCENARIOS = [
    { id: 'chatter', title: 'The line is shaking', mode: 'vv', tags: ['drainage', 'volume'],
      who: 'Day 3 of VV ECMO for influenza ARDS, femoro-jugular. Net −3 L over 24 h on a furosemide infusion. The nurse calls: the drainage line is jumping, the flow swings between 4.5 and 2.8 L/min, the console alarms “low flow”. Pump 3,800 rpm; drainage pressure −140 mm Hg (was −65); ΔP 22; SpO2 88 → 83%. CVP 3. The patient coughs with every swing.',
      q: 'What first?',
      options: [
        ['rpm', 'Turn the pump speed down until the line settles, then look for the cause', 'best', 'Chatter is the cannula sucking against a collapsing vessel: the pump is asking for more than the cava can give. Lower the demand first (100 rpm at a time), which paradoxically steadies and often improves the flow; then decide between volume (CVP 3 after diuresis: likely), a kink or a migrated tip, cough and straining, a tamponade or pneumothorax, abdominal pressure.'],
        ['fluid', 'Give a litre of crystalloid', 'reasonable', 'This patient is probably dry (CVP 3 after −3 L), so volume is part of the answer — but not before the speed comes down, and not as the reflex for every chatter: a litre into ARDS lungs on a wet day is a day lost.'],
        ['up', 'Increase the pump speed to recover the flow', 'wrong', 'More suction on a collapsed vessel gives less flow, more haemolysis and endothelial injury. The flow–rpm curve has turned over; the only way up is down.'],
        ['sweep', 'Turn the sweep up for the desaturation', 'wrong', 'The saturation fell because effective flow fell. Sweep clears CO2; it does nothing for oxygen at a flow the drainage cannot sustain.']],
      fix: ['Reduce rpm until the chatter stops', 'Assess volume: CVP, echo (IVC collapse), ultrasound the cannula and the cava', 'Chest X-ray for the tip position; feel the line for kinks; check the abdomen', 'Replace volume if truly depleted; treat cough and agitation', 'Return the speed slowly; if the flow ceiling is now below what the patient needs, add a second drainage cannula'],
      before: 'vv_chatter', after: 'vv_run', afterNote: 'CVP 8 and 3,400 rpm: the drainage pressure back near −60, the flow steady at 4.6 L/min.' },
    { id: 'recirc', title: 'Bright blood in the drainage line', mode: 'vv', tags: ['recirculation', 'cannula'],
      who: 'Day 2, dual-lumen cannula in the right internal jugular. Flow 5.0 L/min, post-oxygenator PO2 420. The patient was turned for a chest X-ray; since then SpO2 has fallen from 93 to 84%. The drainage line looks as red as the return line; the circuit’s venous saturation reads 86%. ΔP unchanged, sweep unchanged. Echo through the ribs: the return jet sprays toward the atrial wall rather than the tricuspid valve.',
      q: 'What is happening and what do you do?',
      options: [
        ['reposition', 'Recirculation from a rotated cannula: image it and have the ECMO team reposition under echo or fluoroscopy', 'best', 'The circuit returns bright blood that the drainage ports draw straight back; it goes round and round while the patient’s venous return bypasses the membrane. A pre-oxygenator saturation above 75–80% with a falling SpO2 — or paradoxical improvement when the flow is turned down — is the signature. The fix is the cannula, not the gas.'],
        ['flowdown', 'Reduce the flow a little and see whether the SpO2 rises', 'reasonable', 'A fair bedside test (5–10% less flow, less recirculation) and a temporising measure, but it confirms rather than fixes: the cannula still needs repositioning.'],
        ['flowup', 'Increase the pump speed to deliver more oxygenated blood', 'wrong', 'With the ports facing each other, more flow is more recirculation; the fraction rises with the flow, and the patient gets no more.'],
        ['oxy', 'Exchange the oxygenator', 'wrong', 'The membrane is working: post-oxygenator PO2 420 and an unchanged ΔP. Membrane failure gives a low post-oxygenator PO2, not a high pre-oxygenator saturation.']],
      fix: ['Confirm: drainage saturation vs patient saturation, response to a small flow reduction, imaging of the tip and the jet', 'ECMO team repositions (rotation, depth) under echo/fluoroscopy; secure the cannula', 'With two-site cannulation keep the tips 10–15 cm apart; consider converting a close femoro-femoral pair', 'Meanwhile optimise the rest: Hb, demand, native lung'],
      before: 'vv_recirc', after: 'vv_run', afterNote: 'Jet toward the tricuspid valve, recirculation 10%: the pre-oxygenator saturation falls back to the 60s and the patient’s rises.' },
    { id: 'highco', title: 'Everything on the circuit is perfect, the patient is blue', mode: 'vv', tags: ['flow:CO', 'demand'],
      who: 'Day 5, bacterial superinfection. Temperature 39.6, heart rate 128, cardiac output by echo about 10 L/min, shivering. Flow 5.0 L/min at 3,900 rpm (the cannula’s ceiling), post-oxygenator PO2 450, pre-oxygenator saturation 58%, ΔP 25, no chatter. SpO2 80%, lactate 3.1. Hb 7.8.',
      q: 'Why, and what helps?',
      options: [
        ['ratio', 'The circuit is now a minority of the cardiac output: cut the demand (fever, shivering, sedation ± paralysis, treat the sepsis), raise the Hb toward 10, and consider a second drainage cannula', 'best', 'VV arterial saturation is the flow-weighted average of what the circuit returns and what bypasses it. At 5 L of a 10 L output half the venous blood never meets the membrane; the lung is not helping. Lower the output and the oxygen consumption, raise the content per litre (Hb), and if the ceiling is the drainage, add drainage (VV-V).'],
        ['sweep', 'Increase the sweep gas', 'wrong', 'The membrane already fully saturates every millilitre it sees (PO2 450). The problem is the millilitres it does not see.'],
        ['beta', 'Beta-block the patient to bring the cardiac output down to the circuit', 'poor', 'It raises the displayed saturation by lowering the output — the arithmetic of oxygen delivery (CO × content) may get worse, not better. Not a routine move; treat the cause of the high output first.'],
        ['oxyx', 'Exchange the oxygenator', 'wrong', 'Post-oxygenator PO2 450 and a normal ΔP: the membrane is fine.']],
      fix: ['Antipyretics, cooling, treat the sepsis; sedation and, if shivering, paralysis', 'Transfuse toward Hb 9–10: content per litre matters as much as saturation', 'Accept SaO2 85–88% if lactate and organs are fine — delivery, not the number', 'If drainage-limited: second drainage cannula (VV-V) to reach 6–7 L/min; check recirculation after'],
      before: 'vv_highco', after: 'vv_run', afterNote: 'Output back to 6 L/min and the same 4.6 L/min circuit: SaO2 back above 88%.' },
    { id: 'oxyfail', title: 'The membrane is dying', mode: 'vv', tags: ['oxygenator', 'thrombosis'],
      who: 'Day 12 of VV ECMO. Over 48 h: post-oxygenator PO2 480 → 160 on FdO2 1.0, ΔP 20 → 75 mm Hg at the same 4.5 L/min, sweep raised from 4 to 8 to hold the PaCO2, plasma free Hb 35 → 95 mg/dL, platelets 110 → 55, fibrinogen 320 → 150, D-dimer 4 → 22. Dark streaks on the inlet face of the oxygenator.',
      q: 'What is this and when do you act?',
      options: [
        ['exchange', 'Consumptive membrane thrombosis with failing gas transfer: plan an elective circuit (or oxygenator) exchange now, with the team, daytime, rescue ventilator settings ready', 'best', 'Three converging lines — falling O2 transfer at full FdO2 (post-membrane PO2 < 200), rising resistance at constant flow, and a consumptive/haemolytic picture — mean the membrane is clotting. An elective, prepared exchange beats an emergency one when it fails at night.'],
        ['fdo2', 'Check the gas supply and the blender first', 'reasonable', 'Always — a disconnected sweep line or an empty oxygen line gives a low post-oxygenator PO2 with a normal ΔP. Here the ΔP and the labs say membrane; checking the gas takes thirty seconds and should precede everything.'],
        ['heparin', 'Increase the heparin to dissolve the clot', 'wrong', 'Anticoagulation does not clear an established membrane clot and the patient is already consuming platelets and fibrinogen; more heparin is more bleeding, not more membrane.'],
        ['sweep', 'Keep raising the sweep', 'poor', 'It buys hours for the CO2 but not for the oxygen; a membrane that needs 8 L/min of sweep to do what 4 did is telling you something.']],
      fix: ['Confirm gas supply, FdO2 at the blender, sweep line attached', 'Pre- and post-membrane gases; ΔP at a known flow; plasma free Hb, LDH, D-dimer, fibrinogen, platelets', 'Elective exchange: prime a new circuit, rescue ventilator settings, volume ready, team at the bedside; ~60 s off support', 'After: recheck transfer and ΔP as the new baseline'],
      before: 'vv_oxyfail', after: 'vv_run', afterNote: 'A new membrane: post-oxygenator PO2 back near 480, ΔP 25, sweep back to 4.' },
    { id: 'air', title: 'Air in the drainage line', mode: 'vv', tags: ['emergency', 'air'],
      who: 'A stopcock on the pre-pump limb is opened for a blood sample. A string of bubbles runs toward the pump; the flow display drops to 0.8 L/min, the pump whines, the bubble detector alarms.',
      q: 'In what order?',
      options: [
        ['clamp', 'Clamp the return line close to the patient, then the drainage line, stop the pump, call the ECMO team; emergency ventilator settings (FiO2 1.0, PEEP, rate); head down', 'best', 'The pre-pump limb is under negative pressure: an open port entrains air. Air past the pump reaches the patient. Return line first (nothing goes in), then drainage, pump off; the patient is now on the ventilator alone, so give the lungs everything. De-airing or replacing the circuit is the perfusionist’s job, not an improvisation.'],
        ['rpm', 'Increase the speed to push the air through the oxygenator', 'wrong', 'The air lock stalls a centrifugal pump; more speed cavitates and, if anything, drives bubbles onward. The oxygenator traps some air, not all.'],
        ['close', 'Close the stopcock and carry on', 'poor', 'Closing the source is right, but the air already in the circuit is the emergency; the circuit must be isolated and de-aired.'],
        ['wait', 'Watch the bubble trap', 'wrong', 'Modern circuits rarely have a trap; the “trap” is the patient.']],
      fix: ['Close the source; clamp return → drainage; pump to zero; Trendelenburg', 'Emergency ventilator settings; vasopressors if VA', 'Perfusionist de-airs (two-syringe technique at the oxygenator) or replaces the circuit', 'Restart in order: unclamp drainage, speed up, unclamp return', 'Afterwards: who opened what, and the circuit’s sampling policy'],
      before: null, after: null },
    { id: 'harlequin', title: 'Blue hand, pink foot', mode: 'va', tags: ['VA', 'differential hypoxaemia'],
      who: 'Day 4 of peripheral VA ECMO after fulminant myocarditis. LVEF has climbed from 10 to 35%, pulse pressure 30. The ventilator is at FiO2 0.5, PEEP 8; the chest X-ray shows bilateral oedema. Right radial ABG: PaO2 48, PaCO2 52, SpO2 on the right hand 82%. Femoral ABG from the arterial cannula side: PaO2 320. Post-oxygenator PO2 450. Lactate normal.',
      q: 'What is this?',
      options: [
        ['harlequin', 'North–South (Harlequin) syndrome: the recovering heart ejects lung-deoxygenated blood into the arch while the circuit’s blood only reaches the lower body — treat the lungs (PEEP, FiO2, diuresis), reduce the mixing problem, and if it persists add a venous return limb (V-AV) or move the return to the axillary artery', 'best', 'Three ingredients: peripheral femoral return, a native heart good enough to push blood to the arch, and lungs bad enough that that blood is dark. The coronaries and the brain are the first branches off the root — the territory at risk is the one you cannot see on a femoral gas. The right radial line is the sentinel.'],
        ['sweep', 'Increase the sweep: the PaCO2 is 52', 'wrong', 'The right radial PaCO2 is the native lung’s; the circuit-perfused lower body is probably already hypocapnic. More sweep blows off the legs’ CO2 and does nothing for the arch.'],
        ['flowup', 'Increase the ECMO flow to push the mixing point higher', 'poor', 'It can move the mixing zone proximally, temporarily — at the price of more afterload on a ventricle that is trying to recover, and more pulmonary congestion. A bridge to a better plan, not the plan.'],
        ['decannulate', 'The heart has recovered: decannulate', 'poor', 'The heart may be nearly ready, but the lungs are not: conversion to VV (or V-AV) is the move that matches the organ that still fails.']],
      fix: ['Right radial arterial line and right-hand oximetry from the first hour on peripheral VA', 'Treat the lungs: PEEP, FiO2, diuresis, pulmonary toilet; look for oedema from LV distension', 'If persistent: add a jugular return cannula (V-AV) so oxygenated blood reaches the right heart, or axillary/central return', 'If the heart is recovered: convert to VV'],
      before: 'va_harlequin', after: 'va_central', afterNote: 'Antegrade return (central or axillary): the whole aorta gets the same blend; the right radial PaO2 comes up to the femoral.' },
    { id: 'distension', title: 'Perfect pressure, a dying ventricle', mode: 'va', tags: ['VA', 'LV distension'],
      who: 'Hour 10 of peripheral VA for an anterior STEMI with cardiogenic shock, 4.5 L/min. MAP 82 on no pressors. The arterial trace is a flat line: pulse pressure 3 mm Hg. Echo: LV dilated, EF < 10%, the aortic valve does not open, spontaneous echo contrast swirls in the LV, the LA is tense. New frothy pink secretions from the tube; chest X-ray white. Lactate 1.9.',
      q: 'What is the problem and the sequence?',
      options: [
        ['unload', 'LV distension: the retrograde column has shut the aortic valve while the left heart keeps filling — reduce flow to the lowest that perfuses, afterload reduction and an inotrope, and arrange mechanical venting (Impella, IABP, atrial septostomy or a surgical vent) urgently', 'best', 'An adequate MAP from the pump says nothing about the ventricle. Bronchial, Thebesian and residual RV flow fill a left heart that cannot eject against the circuit’s pressure: wall stress, subendocardial ischaemia, pulmonary oedema and haemorrhage, stasis and thrombus. A pulse pressure under 10 and a valve that does not open at least every few beats are the signs; the chest X-ray is the consequence.'],
        ['fluid', 'Give volume for the low pulse pressure', 'wrong', 'A small pulse pressure can mean an underfilled ventricle — but this one is dilated with smoke and oedema. Volume is the one thing that makes it worse.'],
        ['peep', 'Increase PEEP', 'reasonable', 'A real but minor help: PEEP lowers LV transmural pressure and treats the oedema. It does not open the valve.'],
        ['flowup', 'Increase the ECMO flow to drain the heart more', 'wrong', 'More flow drains the right heart more, but what reaches the left heart still has no exit — and the aortic pressure climbs, closing the valve more firmly.']],
      fix: ['Echo: AV opening, LV size, smoke, MR; pulse pressure trend; CXR', 'Lowest flow that keeps MAP ≥ 65 and the lactate down; vasodilator for afterload; dobutamine/milrinone', 'Vent: Impella (ECPELLA) if no LV thrombus; IABP adds pulsatility; atrial septostomy; surgical LV/LA vent', 'Full anticoagulation (stasis)'],
      before: 'va_distension', after: 'va_unloaded', afterNote: 'With an Impella emptying the ventricle: LVEDP down, the oedema drains, the root is washed.' },
    { id: 'limb', title: 'The cold leg', mode: 'va', tags: ['VA', 'limb'],
      who: 'Six hours after femoral VA cannulation (17 Fr arterial, no distal perfusion catheter yet — “too unstable”). The cannulated leg is pale and cool from the knee, no Doppler signal at the dorsalis pedis, calf NIRS 38% vs 71% on the other side. Lactate drifting up.',
      q: 'What now?',
      options: [
        ['dpc', 'Acute limb ischaemia from the cannula: place a distal perfusion catheter now (6–8 Fr into the SFA), vascular surgery, and watch for compartment syndrome', 'best', 'A 15–19 Fr cannula in a 7 mm artery leaves little round it. The DPC should go in at cannulation; the longer the leg is ischaemic the more reperfusion will cost (CK, potassium, fasciotomy). NIRS < 50% or a 15–20 point gap between the legs is the warning.'],
        ['wait', 'Re-examine in 2 hours', 'wrong', 'Six hours of ischaemia is already a muscle at risk; waiting trades a catheter for a fasciotomy or an amputation.'],
        ['heparin', 'Increase the anticoagulation', 'poor', 'If a thrombus is the cause it matters, but the cannula occludes the artery mechanically; heparin does not perfuse the leg.'],
        ['flow', 'Reduce the ECMO flow to lower the pressure in the artery', 'wrong', 'The leg is starved of flow past the cannula, not injured by pressure; and the patient needs the flow.']],
      fix: ['Place the DPC (antegrade SFA, 6–8 Fr); confirm flow in it', 'Hourly limb checks; calf NIRS both sides; CK, potassium, creatinine', 'Vascular surgery for persistent ischaemia: thrombectomy, cannula change, fasciotomy', 'If the artery is too small: axillary or central return'],
      before: null, after: null },
    { id: 'vawean', title: 'Is the heart ready?', mode: 'va', tags: ['VA', 'weaning'],
      who: 'Day 6 of VA ECMO for myocarditis, now 3.5 L/min. Pressors off, lactate normal, urine good. Echo at full flow: LVEF 35%, LVOT VTI 12 cm, aortic valve opens every beat, pulse pressure 35. Lungs clear on FiO2 0.4.',
      q: 'How do you test it?',
      options: [
        ['flowdown', 'A supervised flow-down trial: drop the flow in 0.5 L/min steps to 1–1.5 L/min (after a heparin bolus) with echo at the low flow — pass if MAP ≥ 60–65 without new pressors, LVEF > 20–25%, LVOT VTI ≥ 10 cm, lateral mitral TDSa ≥ 6 cm/s, no dilation, no rise in filling pressures over 30–60 min; then decannulate the same day', 'best', 'VA weaning tests circulation by taking the circulation away a little at a time, with the gas exchange kept on. The echo criteria at minimal flow (Aissaoui) predict successful separation. Do not linger at 1 L/min: it clots.'],
        ['sweepoff', 'Turn the sweep off and see whether the gases hold', 'wrong', 'That is the VV test. On VA, blood that bypasses the lungs returns to the artery: sweep off is a right-to-left shunt of the whole circuit flow.'],
        ['clamp', 'Clamp the circuit for an hour', 'poor', 'A brief clamp (minutes) is part of some protocols, with a heparin bolus and a bridge; an hour of stagnant blood in the circuit is a thrombus.'],
        ['stay', 'Give it another week to be safe', 'poor', 'Every day on VA is bleeding, infection, limb, stroke. Readiness criteria met are the moment to test.']],
      fix: ['Readiness: pressors low/off, lactate normal, no tamponade, lungs acceptable, rhythm stable', 'Heparin bolus; flow 0.5 L/min every 5–10 min to 1–1.5 L/min; echo and haemodynamics at each step', 'Pass → decannulate promptly (surgical arterial repair or closure device; venous compression)', 'Fail → back to the last tolerated flow; consider a durable device or transplant pathway if no recovery by 5–7 days'],
      before: 'va_shock', after: 'va_wean', afterNote: 'At 1.9 L/min the recovered ventricle keeps MAP and ejects every beat.' },
    { id: 'vvwean', title: 'Is the lung ready?', mode: 'vv', tags: ['VV', 'weaning'],
      who: 'Day 16 of VV ECMO. The chest X-ray has cleared, compliance 40 mL/cm H2O, on VC 6 mL/kg, PEEP 10, FiO2 0.4, rate 16, plateau 24. Sweep already down to 1.5 L/min with PaCO2 42; FdO2 weaned to 0.4 with PaO2 78. Flow 3 L/min.',
      q: 'How do you test it?',
      options: [
        ['sweepoff', 'A sweep-off trial: gas flow to zero (cap the line), blood flow kept at ≥ 2–3 L/min, ventilator at acceptable settings; ABG at 1–2 h and clinically for 2–3 h or longer — pass with PaO2 ≥ 70 on FiO2 ≤ 0.6, pH ≥ 7.3 at RR ≤ 28, Vt ≤ 6 mL/kg, plateau ≤ 28 and no distress; then hold heparin an hour and decannulate', 'best', 'With the gas off the membrane exchanges nothing: the blood goes round warmed but unchanged, so the gases are the lung’s own while the cannulas stay in as the safety net. ELSO watches 2–3 hours or longer; a 30-minute gas is a screen, not a pass.'],
        ['flowdown', 'Turn the blood flow down to 1 L/min and see', 'wrong', 'That tests nothing about the lung (the membrane still works at 1 L/min) and clots the circuit. VV weaning is the sweep, not the flow.'],
        ['extubate', 'Extubate first, then decannulate', 'poor', 'Not required and often the wrong order; many come off ECMO still on the ventilator. The sweep-off trial on a sustainable ventilator strategy is the test.'],
        ['stay', 'Wait for the compliance to normalise', 'poor', 'Readiness is a sustainable, non-injurious ventilator strategy, not a normal lung.']],
      fix: ['FdO2 down first (21% if tolerated), then sweep by 0.5–1 L/min steps to ≤ 2; keep flow > 2–3 L/min', 'Sweep off 2–3 h+ with gases and the work of breathing watched', 'Decannulate: heparin off ≥ 1 h, compression/purse-string for the venous cannulas, head-down for the jugular', 'DVT ultrasound of the cannulated veins after 24 h'],
      before: 'vv_run', after: 'vv_wean', afterNote: 'Sweep 0 with a recovered lung: the post-oxygenator gas equals the pre, and the PaO2 is what the lung makes.' },
    { id: 'bleed', title: 'Bleeding on the circuit', mode: 'vv', tags: ['anticoagulation', 'bleeding'],
      who: 'Day 8, VV ECMO. A chest drain placed this morning for a pneumothorax has drained 900 mL of blood in 4 h. Hb 9.2 → 6.8. Anti-Xa 0.55, platelets 48, fibrinogen 1.1 g/L, INR 1.6. Flow 4.5 L/min.',
      q: 'What do you do, and what do you not do?',
      options: [
        ['hold', 'Hold the heparin (4–6 h, longer if needed), transfuse to Hb > 7–8, platelets > 50–100, fibrinogen > 1.5, source control (surgical review of the drain site), keep the flow up (≥ 3 L/min) to protect the circuit, and watch the membrane', 'best', 'Bleeding is the commonest complication; the circuit tolerates a pause in anticoagulation far better than the patient tolerates exsanguination, especially at full flow with a coated circuit. Thresholds move up while bleeding; antifibrinolytics are for the life-threatening case.'],
        ['stop', 'Stop the ECMO to let the bleeding stop', 'wrong', 'The patient still needs the gas exchange; decannulation does not stop a chest-wall bleed.'],
        ['flowdown', 'Reduce the flow so there is less circuit to anticoagulate', 'wrong', 'Low flow is stasis and clot — the opposite of what an unanticoagulated circuit needs.'],
        ['txa', 'Tranexamic acid now', 'reasonable', 'Part of the answer for significant bleeding after surgery or when uncontrolled; it raises the circuit’s thrombosis risk, so with the ECMO team and preferably viscoelastic testing.']],
      fix: ['Hold UFH; recheck anti-Xa/aPTT, platelets, fibrinogen; type and screen', 'Transfuse to the bleeding thresholds; calcium', 'Surgical/interventional source control', 'Keep the flow ≥ 3 L/min; inspect the circuit for clot; restart when safe at a lower target'],
      before: null, after: null },
    { id: 'pumpstop', title: 'The pump stops', mode: 'va', tags: ['emergency', 'VA'],
      who: 'Peripheral VA, 4 L/min. The console goes dark during a bed transfer — the power cord came out and the battery had not been charging. The flow reads 0 and then negative.',
      q: 'The first three moves?',
      options: [
        ['clamp', 'Clamp the circuit (return first), hand-crank or switch to the backup console, and support the patient: emergency ventilator settings and vasopressors', 'best', 'On VA a stopped pump is an arteriovenous fistula: blood runs backward from the femoral artery through the circuit into the vein. Clamp to stop the retrograde flow, then restore flow by hand or on the spare console, then call for help and a new power source. On VV a stopped pump just stops; the patient is on the ventilator alone.'],
        ['wait', 'Plug it back in and wait for it to restart', 'poor', 'Plug it in, yes — but a centrifugal pump that restarts after a stop may need its speed brought back up (3,000 rpm) deliberately, and the seconds of backflow matter.'],
        ['cpr', 'Start chest compressions', 'poor', 'Only if there is no pulse once the circuit is clamped and the heart has nothing to give; compressions with cannulas in the groin are a last resort.'],
        ['unclamp', 'Leave the lines open so blood can still flow', 'wrong', 'It does flow — the wrong way: from the artery, through the stopped pump, into the vein.']],
      fix: ['Clamp return then drainage; rpm to zero', 'Hand crank / backup console; restore rpm to the previous setting', 'Vent to full support; pressors; call the ECMO team', 'Afterwards: battery, cords, the transfer checklist'],
      before: null, after: null },
    { id: 'hemolysis', title: 'Dark urine', mode: 'vv', tags: ['haemolysis', 'pump'],
      who: 'Day 4, VV at 5.5 L/min and 4,300 rpm after the flow was pushed up for hypoxaemia. Drainage pressure −160 mm Hg with intermittent chatter. Plasma free Hb 140 mg/dL (was 20), LDH 2,400, potassium 5.6, urine tea-coloured, creatinine rising. ΔP 30, post-oxygenator PO2 400.',
      q: 'Cause and plan?',
      options: [
        ['suction', 'Shear haemolysis from excessive suction at high speed: lower the rpm, accept a lower flow (and fix the oxygenation another way — Hb, demand, a second drainage cannula), check the pump head for thrombus', 'best', 'Plasma free Hb > 50 mg/dL is haemolysis worth a cause; > 100 needs action now. The usual culprits are a drainage pressure past −100 mm Hg, a very high speed, a kinked line, a clotted pump head (listen; look; ΔP across the head) or oxygenator. Haemolysis also blunts the anti-Xa assay and poisons the kidney.'],
        ['transfuse', 'Transfuse and continue', 'poor', 'Transfusion treats the anaemia; the destruction continues at the same speed.'],
        ['oxy', 'Exchange the oxygenator', 'poor', 'The membrane looks fine (ΔP 30, PO2 400); the pump head and the suction are the suspects. If the head is clotted, exchange the pump head (or the circuit).'],
        ['dialysis', 'Start CRRT for the potassium', 'reasonable', 'Perhaps needed for the pigment nephropathy and the potassium, but it does not address the source.']],
      fix: ['Reduce rpm until the drainage pressure is above −100 and the chatter stops', 'Inspect the pump head (noise, visible clot, heat) and the circuit; change what is clotted', 'Plasma free Hb daily; LDH, haptoglobin, potassium, creatinine; urine', 'Oxygenation by other means: Hb, demand, second drainage cannula'],
      before: null, after: null },
    { id: 'referral', title: 'Should this patient be referred?', mode: 'vv', tags: ['selection', 'EOLIA'],
      who: '52-year-old, 3 days of ventilation for pneumococcal ARDS. VC 6 mL/kg PBW, PEEP 16, FiO2 1.0, plateau 31, driving pressure 17, proned twice. PaO2 58 (P/F 58) for the last 5 hours, PaCO2 62, pH 7.22. Norepinephrine 0.1 µg/kg/min, lactate 2.4. No other organ failure; no bleeding.',
      q: 'What is the right call?',
      options: [
        ['refer', 'Call the ECMO centre now: this meets the EOLIA/ELSO severity criteria (P/F < 80 for > 6 h, or < 50 for > 3 h, or pH < 7.25 with PaCO2 ≥ 60 for > 6 h despite optimised ventilation and proning), is early (day 3), and the physiology is VV (the pressor is for sepsis, not a failing pump)', 'best', 'The criteria are referral triggers, not waiting rules: a patient collapsing on 100% oxygen is called before the clock. Reversible disease, short ventilation, no contraindication, a single failing organ — the ideal candidate. VA would be the wrong mode: the circulation is adequate.'],
        ['hfov', 'Try inhaled nitric oxide and HFOV first', 'poor', 'Adjuncts may buy an hour on the way to the phone; they are not prerequisites, and oscillation is not standard ARDS care.'],
        ['va', 'Refer for VA ECMO because of the pressor', 'wrong', 'A vasopressor dose does not make a VA indication; VA for a working heart adds afterload and the mixing problem for nothing.'],
        ['wait', 'Wait until day 7 to be sure it is refractory', 'wrong', 'More than 7 days of injurious ventilation (plateau > 30, FiO2 > 0.9) is a relative contraindication: waiting is how candidates become non-candidates.']],
      fix: ['Document: P/F with FiO2 and PEEP, duration, plateau and driving pressure, proning, pH/PaCO2', 'Call early; optimise while waiting: deep sedation ± paralysis, PEEP titration, fluids out, treat the infection', 'The retrieval team cannulates and transports on ECMO', 'Day 1 on ECMO: lung rest (plateau < 25, PEEP ≥ 10, rate 4–15, FiO2 ≤ 0.5)'],
      before: null, after: 'vv_run', afterNote: 'On the circuit: the lung rested, the gases from the membrane.' }
  ];

  /* ================================================================== the content ================================================================== */
  T.ecmo_intro = { title: 'What ECMO is — and is not', kicker: 'A membrane lung and a pump outside the body: time, not treatment', blocks: [
    { p: 'Extracorporeal membrane oxygenation drains venous blood through a large cannula, pumps it across a membrane lung where oxygen is added and carbon dioxide removed, and returns it to the patient — into a vein (VV: gas exchange only, the native heart does the pumping) or into an artery (VA: gas exchange plus the circulation). It replaces the function of the lungs or the heart for days to weeks while the underlying disease is treated or a destination is arranged (recovery, transplant, a durable device, or an agreed decision). It treats nothing by itself: ECMO buys time, and time is only worth buying if there is a realistic way off.' },
    { h: 'A short history', ul: [
      '1953 Gibbon: the first open-heart operation on cardiopulmonary bypass. 1971 Hill: the first adult to survive prolonged extracorporeal support (post-traumatic ARDS, three days). 1975 Bartlett: the first neonate (Esperanza) — neonatal ECMO became standard in the 1980s.',
      '1979 Zapol’s NIH trial: 90% mortality in both arms with the roller-pump, silicone-membrane, high-anticoagulation circuits of the day; adult ECMO went quiet for a generation.',
      '2009: CESAR (referral to an ECMO centre improved disability-free survival, 63 vs 47%) and the H1N1 pandemic (Australia–New Zealand series, survival ~75%) with the modern circuit: centrifugal pump, polymethylpentene membrane, heparin-bonded tubing, percutaneous cannulas.',
      '2018 EOLIA: early VV ECMO in very severe ARDS, 60-day mortality 35 vs 46% (RR 0.76, CI 0.55–1.04, P = 0.09) with 28% of controls crossing over; a Bayesian re-analysis and the guidelines (ESICM 2023, ATS 2024) read it as a probable benefit in expert centres. 2020–23: ECMO through COVID-19; ECLS-SHOCK (routine VA in infarct shock: no benefit, more bleeding); ARREST and INCEPTION for ECPR.'] },
    { h: 'The vocabulary', table: { head: ['Term', 'Meaning'], rows: [
      ['ECLS / ECMO', 'Extracorporeal life support; ECMO is the gas-exchange variety (the oxygenator is the point). ELSO (the Extracorporeal Life Support Organization) is the registry and guideline body.'],
      ['Configuration notation', 'Letters before the hyphen are the drainage sites, after it the return: V-V (venous to venous), V-A, VV-A (two drainage cannulas, arterial return), V-AV (one drainage, return split between an artery and a vein), V-PA (right atrium to pulmonary artery: an RV bypass).'],
      ['Blood flow', 'What the pump moves through the membrane (L/min) — the oxygen variable. Not the rpm: the same speed gives different flows depending on what the drainage can supply and what the return resists.'],
      ['Sweep gas', 'The gas flowing through the membrane’s fibres (L/min) — the CO2 variable. FdO2 is its oxygen fraction (distinct from the ventilator’s FiO2).'],
      ['Membrane lung / oxygenator', 'Hollow polymethylpentene fibres: blood outside, gas inside; diffusion across the wall. Rated flow: the blood flow at which it raises 75%-saturated blood to 95%.'],
      ['ECCO2R', 'Extracorporeal CO2 removal: low blood flows (0.4–1.5 L/min) through a small membrane; removes CO2 well (it is the sweep that matters) and oxygenates little. Defined by intent; no survival benefit shown in ARDS (REST) or COPD.'],
      ['ECPR', 'VA ECMO started during cardiopulmonary resuscitation for refractory arrest.'],
      ['Recirculation', 'On VV: returned oxygenated blood drawn straight back into the drainage cannula; it circles the circuit and never reaches the patient.'],
      ['Differential hypoxaemia', 'On peripheral VA: North–South or Harlequin syndrome — the upper body perfused by the native heart through sick lungs, the lower body by the circuit.']] } },
    { h: 'What each mode does', table: { head: ['', 'VV', 'VA'], rows: [
      ['Supports', 'Oxygenation and CO2 removal', 'Circulation and gas exchange'],
      ['Needs', 'A working heart (the patient’s own output carries the oxygenated blood)', 'Nothing of the heart; a lung that can oxygenate whatever the heart still ejects'],
      ['Return', 'Right atrium (venous)', 'Femoral artery retrograde (peripheral), or ascending aorta / axillary artery (antegrade)'],
      ['Arterial saturation', 'Set by the ratio of circuit flow to cardiac output and by recirculation; 85–92% is typical and enough', 'Set by where the blood came from: circuit blood below the mixing point, native blood above'],
      ['Characteristic troubles', 'Recirculation; flow-limited oxygenation in high-output states; the native lung at rest', 'LV distension and afterload; Harlequin; limb ischaemia; a stopped pump runs backward'],
      ['Weaning test', 'Sweep off, flow kept', 'Flow down to 1–1.5 L/min, sweep kept'],
      ['Typical indication', 'Severe ARDS, bridge to lung transplant, status asthmaticus, airway surgery', 'Cardiogenic shock (myocarditis, infarct, post-cardiotomy, PE, intoxication), ECPR, hypothermic arrest']] } },
    { h: 'Where the evidence stands', table: { head: ['Trial', 'What it tested', 'What it found', 'How to read it'], rows: [
      ['CESAR 2009 (n = 180)', 'Referral to one ECMO centre vs conventional care in severe respiratory failure (Murray ≥ 3 or pH < 7.2)', 'Survival without severe disability at 6 months 63 vs 47%', 'A referral strategy: a quarter of the ECMO arm never received ECMO; control ventilation was not protocolised'],
      ['EOLIA 2018 (n = 249)', 'Immediate VV ECMO vs conventional care (with crossover rescue) in very severe ARDS', '60-day mortality 35 vs 46%, RR 0.76 (0.55–1.04), P = 0.09; 28% of controls crossed over', 'Stopped early for futility of the primary comparison; the as-treated and Bayesian readings favour ECMO in expert hands'],
      ['PRONECMO 2023 (n = 170)', 'Routine early proning on VV ECMO', 'Successful weaning by day 60: 44 vs 44%', 'Proning before ECMO remains core; routine proning on ECMO does not add'],
      ['REST 2021 (n = 412)', 'ECCO2R-facilitated ultra-low Vt in hypoxaemic respiratory failure', 'No mortality difference; more serious adverse events; stopped early', 'ESICM 2023 recommends against ECCO2R outside trials'],
      ['ECLS-SHOCK 2023 (n = 420)', 'Routine early VA ECMO in infarct-related cardiogenic shock', '30-day mortality 47.8 vs 49.0%; more bleeding and vascular complications', 'Not a verdict on rescue VA, myocarditis, intoxication or RV failure'],
      ['ARREST 2020 (n = 30) / INCEPTION 2023 (n = 160)', 'ECPR vs conventional CPR in refractory out-of-hospital arrest', 'ARREST: survival to discharge 43 vs 7% (single centre, VF only); INCEPTION: good neurological survival 20 vs 16%, NS', 'A system, not a device: time to flow and selection decide'],
      ['LEVOECMO 2025', 'Levosimendan to facilitate VA weaning', 'Successful weaning 68 vs 68%; more ventricular arrhythmia', 'No routine role'],
      ['RATE 2026 (n = 330)', 'Standard UFH vs lower-dose UFH vs therapeutic LMWH on ECMO', '6-month composite (severe bleeding, thromboembolism, death) 81 / 72 / 75%: non-inferiority met for both alternatives', 'Lower intensity is defensible; not a licence for no anticoagulation']] } },
    { h: 'The guidelines', ul: [
      'ELSO: adult VV (Tonna 2021), adult VA interim (Lorusso 2021), anticoagulation (McMichael 2021/22), ECPR (Richardson 2021), neurological monitoring (2024), accidental hypothermia (2025); the general guidelines and the Red Book for circuit practice.',
      'ESICM 2023 ARDS guideline: VV ECMO in an experienced centre for severe ARDS meeting EOLIA-type criteria (moderate certainty); against ECCO2R outside trials. ATS 2024: conditional suggestion for VV ECMO in selected severe ARDS (low certainty).',
      '2026 multisociety PE guideline (AHA/ACC/CHEST and others): VA ECMO reasonable for refractory PE-related cardiogenic shock where available.',
      'Everything that follows is for understanding at the bedside; the ECMO team and the local protocol run the circuit.'] },
    { src: ['Tonna JE, et al. Management of adult patients supported with venovenous ECMO: ELSO guideline. ASAIO J 2021;67:601–10.', 'Lorusso R, et al. ELSO interim guidelines for VA ECMO in adult cardiac patients. ASAIO J 2021;67:827–44.', 'Combes A, et al. EOLIA. N Engl J Med 2018;378:1965–75.', 'Peek GJ, et al. CESAR. Lancet 2009;374:1351–63.', 'Thiele H, et al. ECLS-SHOCK. N Engl J Med 2023;389:1286–97.', 'Grasselli G, et al. ESICM guidelines on ARDS. Intensive Care Med 2023;49:727–59.', 'Qadir N, et al. ATS clinical practice guideline: update on management of adult ARDS. Am J Respir Crit Care Med 2024;209:24–36.', 'Brogan TV, et al. (eds). Extracorporeal Life Support: The ELSO Red Book, 6th ed.'] }
  ] };

  T.ecmo_circuit = { title: 'The circuit, part by part', kicker: 'Drainage → pump → membrane lung → return, and the numbers on the console', blocks: [
    { p: 'Follow the blood. It leaves through the drainage cannula under suction (the pre-pump limb is the only part of the circuit at negative pressure: a loose connection here entrains air, not blood), is thrown outward by a spinning centrifugal pump head (flow depends on the speed and on what the drainage supplies and the return resists — a centrifugal pump is preload- and afterload-sensitive, unlike the old roller pumps), passes through the membrane lung (blood outside thousands of hollow polymethylpentene fibres, sweep gas inside them; a heat exchanger in the same housing warms or cools), and comes back through the return cannula under positive pressure (a breach here bleeds). Three pressures and one gradient tell you how each part is doing.' },
    { widget: 'ecmocircuit' },
    { h: 'The parts', table: { head: ['Part', 'What it is', 'What to know'], rows: [
      ['Drainage cannula', 'Multi-stage wire-reinforced venous cannula, 21–29 Fr (31 Fr exists), tip in the IVC near the cavo-atrial junction (femoral) or in the SVC/RA', 'Determines the maximal flow: 25 Fr gives about 5–6 L/min, 29 Fr more. The side holes sit in the IVC; if the tip is withdrawn into the iliac vein or the cava collapses around the holes the circuit chatters.'],
      ['Return cannula', 'VV: 19–23 Fr venous, tip in the RA (or the SVC). VA: 15–19 Fr arterial (femoral), 17–21 for large patients or sepsis; plus a 6–8 Fr distal perfusion catheter', 'Resistance of the return limb sets the post-pump pressure; a small arterial cannula limits VA flow and occludes the leg.'],
      ['Tubing', '3/8-inch heparin- or phosphorylcholine-coated PVC, as short as possible', 'Coatings reduce but do not abolish thrombosis. Sampling pigtails and the bridge are clot nests.'],
      ['Pump', 'Centrifugal, magnetically levitated or bearing-mounted impeller, 1,500–5,000 rpm', 'Speed is what you set; flow is what you get (an ultrasonic flow probe on the return line). Flow rises with speed only while the drainage keeps up; past that point more speed is more suction, chatter and haemolysis. A stopped pump on VA lets blood run backward.'],
      ['Membrane lung', 'PMP hollow fibres, surface 1.8–2.5 m², priming volume 250 mL, rated flow 7 L/min; integrated heat exchanger', 'Oxygen transfer up to ~400 mL/min; CO2 clearance set by the sweep. Life: 2–4 weeks typically; it dies by clotting (rising ΔP) or by plasma leakage/failing transfer.'],
      ['Blender and sweep', 'Air–oxygen blender → flowmeter → the gas port of the membrane; exhaust open to air', 'FdO2 (0.21–1.0) and sweep (0–15 L/min). A disconnected sweep line is the first thing to check for a sudden desaturation.'],
      ['Monitors', 'Pressure transducers (drainage, pre- and post-membrane), flow probe, bubble detector, venous saturation probe on the drainage line, temperature', 'The drainage saturation (SvO2 of the circuit) is both the patient’s mixed venous saturation and the recirculation alarm.'],
      ['Console', 'Speed, flow, pressures, alarms, battery; hand crank', 'Battery life 60–90 min; know where the crank is.']] } },
    { h: 'The pressures', table: { head: ['Pressure', 'Where', 'Typical', 'What it means when it moves'], rows: [
      ['Drainage (P1, venous, inlet)', 'Between the drainage cannula and the pump', '−20 to −80 mm Hg; keep above −100', 'More negative: the pump is asking more than the cava gives — hypovolaemia, a kinked or migrated cannula, cough, tamponade, pneumothorax, abdominal pressure, too much speed. Past −100: haemolysis and vessel collapse (suck-down).'],
      ['Pre-membrane (P2, internal)', 'Between the pump and the oxygenator', '100–250 mm Hg; below 300', 'Rises with flow and with the resistance downstream: a clotting membrane or a narrow return.'],
      ['Post-membrane (P3, return, arterial)', 'After the oxygenator', '< 300 mm Hg', 'High: the return cannula (too small, kinked, clotted) or, on VA, the arterial pressure.'],
      ['ΔP (transmembrane)', 'P2 − P3', '10–40 mm Hg at 4–5 L/min; it rises with flow, so compare at the same flow', 'A rising ΔP at the same flow is clot in the fibres; > 60 and rising, or > 100, is a membrane that needs changing — with the gas transfer and the haemolysis markers, not alone.']] } },
    { h: 'The two dials and what they do', ul: [
      'Blood flow is the oxygen dial. Oxygen transfer = flow × (post − pre content) × 10; with a working membrane every millilitre that passes leaves fully saturated, so the patient’s oxygenation is decided by how much of the venous return passes (VV) or by where the blood goes (VA). Targets: 60–80 mL/kg/min, or 3 L/min/m² (VV: about 60% of the cardiac output or more; VA: enough for the perfusion — CI > 2.2, SvO2 > 65%, lactate falling).',
      'Sweep gas is the CO2 dial. CO2 crosses the membrane some 20 times more easily than oxygen, so the clearance depends on the gas that carries it away: start at about half the blood flow (1:1 for VA aiming at normocapnia) and titrate to the PaCO2. New sweep ≈ current sweep × (current PaCO2 / target PaCO2). A sweep change takes 30–50 min to show fully in the arterial gas.',
      'FdO2 is for the post-membrane PO2, usually 1.0 to start; on VA (and after arrest) wean it so the arterial PaO2 stays below 300 — hyperoxia harms the reperfused brain and heart.',
      'Correct hypercapnia slowly: no more than about half of the excess in the first few hours, longer after chronic retention — a rapid fall in PaCO2 on cannulation is the setting of intracranial haemorrhage (ELSO neurological guidance: avoid rapid changes in the first 24 h).'] },
    { h: 'Is the membrane working? The oxygenator check', ul: [
      'Post-membrane gas on FdO2 1.0: PO2 > 250–300 on a new membrane; < 200 is failing (< 150 is failed). PCO2 should be well below the pre-membrane value (a difference < 10 mm Hg with adequate sweep = CO2 transfer failure).',
      'Oxygen transfer: 13.4 × flow (L/min) × Hb × (post − pre saturation) in mL/min; < 100–150 mL/min at full flow is a dying membrane.',
      'ΔP at a known flow, trended; visible clot on the inlet face; rising plasma free Hb, LDH, D-dimer, falling platelets and fibrinogen (consumption).',
      'Plasma leak (yellow fluid from the gas exhaust) and gas-side water: the membrane is wet; a brief increase of sweep clears condensation (a “sigh”).',
      'A sudden desaturation with a normal ΔP: look at the gas line and the blender before the membrane.'] },
    { note: 'Pressure labels (P1/P2/P3, Pven/Pint/Part) differ between consoles: document the anatomical site (drainage, pre-membrane, post-membrane), the flow at which it was read, and the trend.' },
    { src: ['ELSO General Guidelines for all ECLS cases, v1.4 (2017) and the ELSO Red Book, 6th ed.', 'Tonna JE, et al. ELSO adult VV guideline. ASAIO J 2021.', 'Farkas J. ECMO. The Internet Book of Critical Care (EMCrit), 2023.', 'Lequier L, et al. ELSO anticoagulation guideline (circuit thrombosis surveillance).'] }
  ] };

  T.ecmo_cannulation = { title: 'Cannulation configurations', kicker: 'Where the blood is taken from and where it is given back', blocks: [
    { p: 'The configuration is the physiology. Two questions decide it: does the heart need help (arterial return) or only the lungs (venous return), and where do the cannulas fit (vessel size, mobility, bleeding, the surgeon’s access). Ultrasound-guided percutaneous Seldinger cannulation of the femoral vessels is the default; the tip positions are confirmed by echo (TEE/TTE), fluoroscopy or chest X-ray, and documented with the external depth marking so migration can be seen.' },
    { widget: 'ecmoconfigs' },
    { h: 'Venovenous', table: { head: ['Configuration', 'Drainage', 'Return', 'For', 'Against'], rows: [
      ['Femoro-jugular (two-site)', 'Femoral vein, multi-stage 23–29 Fr, tip in the IVC near the cavo-atrial junction', 'Right IJ, 19–23 Fr, tip in the RA/SVC', 'Fast, big drainage, lowest recirculation when the tips are 10–15 cm apart', 'Two sites; the neck cannula limits mobilisation less than you would think'],
      ['Bicaval dual-lumen (Avalon-type)', 'SVC and IVC ports of one 27–31 Fr cannula in the right IJ', 'Middle port jetting at the tricuspid valve', 'One site, ambulation, bridge to transplant', 'Fluoroscopy/echo placement; flows limited (≤ 4–5 L/min); rotation or migration → recirculation, RV perforation, hepatic-vein malposition'],
      ['Femoro-femoral', 'One femoral vein, tip in the IVC', 'The other femoral vein, tip in the RA', 'Emergency access, no neck line', 'Tips close → recirculation; competing cannulas in the IVC'],
      ['VV-V', 'Two drainage cannulas (both femorals, or femoral + IJ)', 'One venous return', 'When drainage limits the flow (large patients, high output)', 'More recirculation to watch, more access']] } },
    { h: 'Venoarterial', table: { head: ['Configuration', 'Drainage', 'Return', 'For', 'Against'], rows: [
      ['Peripheral femoro-femoral', 'Femoral vein, tip in the RA (or the IVC)', 'Common femoral artery 15–19 Fr, retrograde, plus a 6–8 Fr distal perfusion catheter into the SFA (ideally at cannulation, within 4 h)', 'Percutaneous, at the bedside, during CPR', 'Afterload and LV distension; the mixing zone (Harlequin); limb ischaemia (5%); flows up to 4–5 L/min'],
      ['Femoral drainage, axillary/subclavian return', 'Femoral vein', 'Right axillary artery via an end-to-side graft, 8 mm', 'Antegrade arch flow (no Harlequin), mobilisation, peripheral vascular disease', 'Surgical graft; arm hyperperfusion; bleeding'],
      ['Central', 'Right atrium (or via the femoral vein)', 'Ascending aorta (cannula or graft)', 'Post-cardiotomy, high flows, no limb at risk, antegrade', 'Open chest; bleeding, infection, no mobilisation'],
      ['V-AV (hybrid)', 'Femoral vein', 'Femoral artery and the right IJ (the venous limb through a Y with a flow clamp)', 'Harlequin on VA; cardiac failure on VV', 'Two return limbs to balance and measure'],
      ['V-PA (RA → PA)', 'RA via a dual-lumen cannula (ProtekDuo) or a jugular cannula', 'Pulmonary artery', 'Isolated RV failure, with an oxygenator (“oxy-RVAD”)', 'Does not bypass the pulmonary vascular bed: useless against an obstructed PA; needs an LV that can take the flow']] } },
    { h: 'Sizes and flows: the arithmetic', ul: [
      'Poiseuille: flow goes with the fourth power of the radius and inversely with the length. The drainage cannula is the bottleneck of every circuit; the return cannula sets the return pressure.',
      'Adult VV drainage 23–29 Fr → 4–7 L/min; return 19–23 Fr. VA arterial 15–17 Fr gives > 4 L/min; 19–21 Fr for large patients or septic vasoplegia. ECPR: 19–25 Fr multistage venous, 15–17 Fr arterial.',
      'Initial flow target: VV about 60–80 mL/kg/min (3 L/min/m²; an 80 kg adult ~4–5 L/min); VA 2.2–2.4 L/min/m² (~4 L/min), 3–4 L/min in ECPR, then to the perfusion.',
      'Below 2–2.5 L/min the circuit clots; above 6–7 L/min it haemolyses.'] },
    { h: 'Positions worth knowing by heart', ul: [
      'Femoral drainage tip: IVC at or just below the cavo-atrial junction (the side holes along the hepatic IVC). Too deep into the RA with a jugular return: recirculation. Too shallow (iliac): poor flow and suck-down.',
      'Dual-lumen bicaval: the return port faces the tricuspid valve; the distal tip rests in the IVC below the hepatic veins. Rotation of the cannula is the commonest cause of a new recirculation after a turn.',
      'VA femoral arterial cannula: tip in the external/common iliac; the cannula occludes the femoral artery, hence the distal perfusion catheter (confirm its flow, not just its presence).',
      'Central: aortic cannula in the ascending aorta; drainage through the RA appendage.',
      'Check daily: external markings, the dressing, the chest X-ray for migration, the flow at the same speed.'] },
    { src: ['Tonna JE, et al. ELSO adult VV guideline, Table 2. ASAIO J 2021.', 'Lorusso R, et al. ELSO interim VA guideline. ASAIO J 2021.', 'Richardson AS, et al. ECPR in adults: ELSO interim guideline consensus statement. ASAIO J 2021;67:221–8.', 'Banfi C, et al. Veno-venous ECMO: cannulation techniques. J Thorac Dis 2016;8:3762–73.'] }
  ] };

  T.ecmo_vv = { title: 'VV physiology: what sets the saturation', kicker: 'The circuit is a fraction of the venous return; the rest bypasses it', blocks: [
    { p: 'On VV the membrane oxygenates every millilitre that passes through it, and the patient’s heart mixes that blood with the venous return that did not. The arterial saturation is therefore a weighted average: circuit blood (SO2 ~ 100%) in proportion to the effective circuit flow, venous blood (SvO2 ~ 60–70%) in proportion to the rest, and then whatever the native lung adds (little, in the ARDS that put the patient here). It follows that the saturation falls when the cardiac output rises (sepsis, fever, agitation) with the circuit unchanged; rises with Hb (content per litre), with a lower oxygen consumption, and with a lower recirculation. An effective circuit flow of 60% or more of the cardiac output usually gives an SaO2 near 90%; at 50% it is in the 80s, and that is often accepted.' },
    { h: 'The equations', ul: [
      'CaO2 = 1.34 × Hb × SaO2 + 0.003 × PaO2 (mL/dL); DO2 = CO × CaO2 × 10 (mL/min); VO2 = CO × (CaO2 − CvO2) × 10. Target DO2:VO2 ≥ 3–5; below 2 the tissues are supply-dependent and the lactate rises.',
      'Membrane oxygen transfer = Q × (Cpost − Cpre) × 10 ≈ 13.4 × Q × Hb × (Spost − Spre). It is largest when the drainage blood is desaturated: a pre-membrane saturation of 85% means either recirculation or a patient who is not extracting.',
      'Effective flow = pump flow × (1 − recirculation fraction). Recirculation R ≈ (Spre − Sv) / (Spost − Sv), where Sv is the true mixed venous saturation (e.g. from a PA catheter) — in practice: a drainage saturation above 75–80% with a falling SpO2, bright blood in the drainage line, and a paradoxical rise in SpO2 when the flow is turned down.',
      'Arterial saturation (no native lung contribution) ≈ [Qeff × Spost + (CO − Qeff) × Sv] / CO.'] },
    { h: 'Why the patient is hypoxaemic on VV — the algorithm', ol: [
      'Is it real? Co-oximetry on an arterial sample; perfusion, lactate, Hb.',
      'The gas: oxygen supply, blender, sweep line attached, FdO2 1.0. (Thirty seconds; the commonest reversible cause.)',
      'The membrane: post-membrane PO2 at FdO2 1.0 (> 200), ΔP trend at this flow, visible clot, consumption and haemolysis labs.',
      'The flow: actual flow versus cardiac output (echo), drainage pressure, chatter; can it go up without suck-down?',
      'Recirculation: drainage saturation, cannula positions on X-ray/echo, response to a small flow reduction.',
      'The patient: fever, shivering, agitation, pain, seizures (VO2); anaemia; sepsis and a high output; new lung pathology (pneumothorax, effusion, oedema, mucus plug); the native lung’s FiO2 and PEEP.',
      'Then act in order of cost: treat demand, transfuse to Hb 9–10, deepen sedation ± paralysis, cool, optimise the native lung modestly (FiO2 up to 0.6, PEEP, inhaled vasodilator), more flow if drainage allows, a second drainage cannula (VV-V), reposition for recirculation; a β-blocker only as an expert, delivery-measured last resort. Accept SaO2 85–88% with normal lactate and organs; it is delivery that counts.'] },
    { h: 'CO2 on VV', ul: [
      'PaCO2 is almost entirely the sweep’s: start at about half the blood flow (2 L/min sweep for 4 L/min blood in a hypercapnic patient), aim to bring the PaCO2 down by no more than half in the first hours, and titrate 0.5–1 L/min at a time with a gas 30–60 min later.',
      'Sweep has no effect on oxygenation once the membrane is working (the post-membrane blood is already saturated); turning it up for hypoxaemia only causes alkalosis.',
      'The native ventilator at rest contributes little alveolar ventilation; the kidney has adapted the bicarbonate of the chronic retainer — do not normalise their PaCO2.'] },
    { h: 'The lungs at rest (ELSO 2021)', table: { head: ['Setting', 'Recommended', 'Acceptable', 'Why'], rows: [
      ['Plateau', '< 25 cm H2O (lower if possible)', '≤ 30', 'The reason for ECMO in ARDS is to stop the ventilator injuring the lung'],
      ['PEEP', '≥ 10 cm H2O', '10–24', 'Keep the lung open without stretching it; higher if it recruits'],
      ['Rate', '4–15/min', '4–30', 'Less strain per minute; the sweep does the CO2'],
      ['FiO2', 'As low as the saturation allows', '0.3–0.5', 'Oxygen toxicity and absorption atelectasis'],
      ['Tidal volume', 'Whatever the pressures allow — often 2–4 mL/kg', '≤ 6 mL/kg', 'Driving pressure ≤ 15 as a pragmatic ceiling'],
      ['Effort', 'Light sedation if the drive is gentle; deep sedation ± paralysis if the patient fights or pulls big breaths', '', 'Patient self-inflicted lung injury: a high drive despite a good gas is still a strain']] } },
    { h: 'Targets on VV', table: { head: ['Variable', 'Target'], rows: [
      ['SaO2 / SpO2', '≥ 85–88% (PaO2 55–80) with normal lactate and organs; check SpO2 against co-oximetry'],
      ['Pre-membrane (drainage) saturation', '60–75%; > 80% = recirculation or low extraction'],
      ['Post-membrane PO2 on FdO2 1.0', '> 250–300 new; < 200 failing'],
      ['PaCO2 / pH', 'Patient’s baseline; pH 7.35–7.45; slow correction'],
      ['Hb', '≥ 7–9 g/dL (the Red Book’s 12–14 is history; higher if delivery is short)'],
      ['Flow', '60–80 mL/kg/min; ≥ 60% of the cardiac output; never below 2–2.5 L/min'],
      ['Fluids', 'Negative balance once resuscitated; a dry lung recovers']] } },
    { src: ['Tonna JE, et al. ELSO adult VV guideline. ASAIO J 2021.', 'Schmidt M, et al. Blood oxygenation and decarboxylation determinants during VV ECMO for respiratory failure in adults. Intensive Care Med 2013;39:838–46.', 'Abrams D, et al. Recirculation in venovenous ECMO. ASAIO J 2015;61:115–21.', 'Montisci A, et al. Management of refractory hypoxemia during VV ECMO for ARDS. ASAIO J 2015;61:227–36.'] }
  ] };

  T.ecmo_va = { title: 'VA physiology: the circuit versus the heart', kicker: 'Retrograde flow, the mixing zone, and the ventricle that cannot open its valve', blocks: [
    { p: 'On VA the pump takes venous blood before the heart and pushes it, oxygenated, into the arterial tree. Whatever the heart still ejects passes through the lungs and enters the aorta at the root; the circuit’s blood enters at the groin (peripheral) and runs up the aorta against it. The two streams meet at a mixing zone whose position depends on their relative flows: with a stunned heart the circuit reaches the arch and everything is circuit blood; as the heart recovers it pushes the zone down the aorta. Three consequences follow and they are the whole of VA trouble: the ventricle ejects against the pump’s pressure (afterload), the brain and the coronaries receive native blood that passed through whatever the lungs are like (Harlequin), and a ventricle that cannot open its valve still fills (distension).' },
    { h: 'Haemodynamics', ul: [
      'Total systemic flow = circuit flow + native ejection. MAP = total flow × SVR: the pump makes a pressure, and a vasoplegic patient still needs a vasopressor; a vasoconstricted one a vasodilator. Target MAP 65–80 (≥ 60 during weaning), the lowest that perfuses — every mm Hg above is afterload.',
      'Flow target: cardiac index > 2.2 L/min/m², SvO2 > 65%, lactate clearing, urine; usually 3–4.5 L/min; “partial support” (60–80% of the output) leaves the heart some work and keeps the valve opening.',
      'Pulse pressure is the ventricle’s voice. ≥ 10–15 mm Hg means the valve opens and the LV ejects; < 10 (< 15 ≈ native output < 1 L/min) means a silent ventricle — distended, or empty (RV failure, hypovolaemia, tamponade): the echo decides which.',
      'The right heart is unloaded (the drainage takes its venous return); the left heart is loaded. A dilated RV on VA is tamponade, PE or a cannula problem until proven otherwise.',
      'Pulmonary blood flow is only what the RV still pumps: the native lung sees a fraction of the output, so end-tidal CO2 falls with native flow (ETCO2 < 15 ≈ native output < 1 L/min).'] },
    { h: 'LV distension', table: { head: ['', ''], rows: [
      ['Why', 'The LV must generate a pressure above the aortic pressure to eject; with a weak LV and a high circuit flow the valve stays shut, while bronchial and Thebesian flow, residual RV output and any aortic regurgitation keep filling the left heart. LVEDP and LA pressure climb; wall stress and subendocardial ischaemia prevent recovery; the lung floods (oedema, haemorrhage); stasis makes thrombus in the LV and the aortic root.'],
      ['Signs', 'Pulse pressure < 10, aortic valve opening less than every 3 beats or not at all, LV dilating, spontaneous echo contrast, functional MR, rising PAOP/PA diastolic, pulmonary oedema or pink froth, ventricular arrhythmia.'],
      ['First measures', 'Reduce the flow to the lowest that perfuses; afterload reduction; an inotrope (dobutamine, milrinone) to open the valve; PEEP for the oedema; avoid volume; full anticoagulation for the stasis.'],
      ['Venting', 'Impella (transaortic microaxial pump; “ECPELLA”) drains the LV directly — not with LV thrombus or a mechanical aortic valve; IABP lowers afterload and adds pulsatility (indirect, modest); percutaneous atrial septostomy / LA cannula; surgical LV apical or pulmonary venous vent; central cannulation with a vent. No single strategy is proven prophylactic; most centres vent when signs appear or early in a non-ejecting ventricle.']] } },
    { h: 'Differential hypoxaemia (North–South, Harlequin)', table: { head: ['', ''], rows: [
      ['Three ingredients', 'Peripheral (femoral) arterial return; a native heart good enough to eject toward the arch; lungs bad enough that what it ejects is desaturated. Typical at day 2–5 as the myocarditis or infarct recovers while the lungs are wet.'],
      ['Who suffers', 'The first branches from the root: the coronaries, the innominate (right arm, right brain), then the left carotid. The legs are pink. A femoral gas is a lie about the brain.'],
      ['Detection', 'Right radial arterial line and a right-hand pulse oximeter from the first hour; cerebral NIRS; compare right radial with the post-membrane gas. The right radial PaCO2 is the native lung’s, the post-membrane PCO2 is the sweep’s: adjust sweep to the territory that matters and do not chase one sample.'],
      ['Treatment', 'Treat the lungs (PEEP, FiO2, diuresis, secretions; distension causing the oedema?); more circuit flow pushes the zone proximally but adds afterload; add a venous return limb (V-AV: a jugular return cannula on a Y) so oxygenated blood enters the right heart and the native ejection is red; or move the arterial return to the axillary artery or central; if the heart is recovered, convert to VV.']] } },
    { h: 'The first hour on VA', ul: [
      'Flow up over 20–30 s to 3–4 L/min; MAP ≥ 60–65; vasopressors to that and no more; FdO2 1.0 at first, then wean to keep PaO2 < 300 (after arrest: SaO2 92–97%).',
      'Right radial line; post-membrane gas after every change (aim normocapnia, PO2 ~150); lactate, free Hb, D-dimer; echo for LV ejection, the aortic valve, the RV, pericardial fluid, cannula positions.',
      'Distal perfusion catheter on the arterial side; limb checks hourly (temperature, Doppler, calf NIRS > 50% and < 20 points asymmetry).',
      'Ventilator for the lungs that still perfuse the brain: Vt 6–8 mL/kg, PEEP ≥ 10 (helps the LV too), FiO2 for the right radial PaO2.',
      'Temperature 33–36 °C for 24 h after ECPR; then normothermia; fever prevented.',
      'Anticoagulation from cannulation (bolus 50–100 U/kg UFH, then infusion) unless bleeding forbids; VA without anticoagulation is possible but thrombogenic.'] },
    { h: 'Targets on VA', table: { head: ['Variable', 'Target'], rows: [
      ['MAP', '65–80 mm Hg (≥ 60 when weaning; > 70 for neuroprotection)'],
      ['Flow', 'CI > 2.2; SvO2 > 65%; usually 3–4.5 L/min; partial support preferred'],
      ['Pulse pressure', '≥ 10–15 mm Hg; aortic valve opening'],
      ['Right radial PaO2', '70–150 (< 300); SaO2 92–97% after arrest'],
      ['Post-membrane PaO2 / PCO2', '~150 / normocapnic'],
      ['Lactate', 'Falling; cleared by 12–24 h'],
      ['Limb', 'Doppler signals, NIRS > 50% and symmetric'],
      ['LV', 'Ejecting, not dilating, no smoke, lungs not filling']] } },
    { src: ['Lorusso R, et al. ELSO interim guidelines for VA ECMO in adult cardiac patients. ASAIO J 2021.', 'Rao P, et al. Venoarterial ECMO for cardiogenic shock and cardiac arrest. Circ Heart Fail 2018;11:e004905.', 'Donker DW, et al. Left ventricular unloading during VA ECMO: an engineering perspective. Perfusion 2019;34:453–9.', 'Cove ME. Disrupting differential hypoxia in peripheral veno-arterial ECMO. Crit Care 2015;19:280.', 'ELSO consensus guidelines on neurological monitoring and management for adult ECMO patients. ASAIO J 2024.'] }
  ] };

  T.ecmo_select = { title: 'Who, when, and when not', kicker: 'Indications, contraindications and the exit strategy', blocks: [
    { p: 'The candidate has a failing organ that is likely to recover or to be replaced, has not yet been injured beyond recovery by the treatment, and has a destination. Everything else is detail — but the detail is where the decisions are made.' },
    { h: 'VV: severe respiratory failure', table: { head: ['Criterion', 'Threshold', 'Source'], rows: [
      ['Hypoxaemia', 'PaO2/FiO2 < 80 for > 6 h, or < 50 for > 3 h, despite FiO2 ≥ 0.8, PEEP ≥ 10, Vt 6 mL/kg and proning where possible', 'EOLIA / ELSO 2021'],
      ['Hypercapnia', 'pH < 7.25 with PaCO2 ≥ 60 for > 6 h despite rate 35 and plateau ≤ 30–32', 'EOLIA (≤ 32) / ELSO (≤ 30)'],
      ['Severity scores', 'Murray lung injury score ≥ 3 (CESAR); RESP score for prognosis (not selection)', 'CESAR; Schmidt 2014'],
      ['Other', 'Bridge to lung transplant; air leak; status asthmaticus with injurious ventilation; airway surgery; DAH; severe primary graft dysfunction', 'ELSO'],
      ['Call early', 'The durations are trial enrolment windows, not waiting times: a patient on 100% oxygen and 30 cm H2O getting worse is called now', 'ELSO']] } },
    { h: 'VV: contraindications and risks', ul: [
      'Absolute: no realistic recovery or destination (irreversible lung disease without transplant candidacy, devastating brain injury, terminal illness, irreversible multi-organ failure).',
      'Relative: mechanical ventilation > 7 days with plateau > 30 and FiO2 > 0.9 (injury may be irreversible; day 8 is not a rule); age (no threshold; risk rises); immunosuppression and malignancy; severe bleeding or contraindication to anticoagulation (VV can run with little or none); obesity (access, flow, mobility — not an exclusion); frailty; prolonged high-dose vasopressors (sort out the circulation first).',
      'HIT contraindicates heparin, not ECMO (bivalirudin or argatroban).',
      'RESP score (age, immunocompromise, days ventilated, diagnosis, CNS dysfunction, infection, neuromuscular blockade, nitric oxide, bicarbonate, arrest, PaCO2, peak pressure): 5 classes, survival 92% → 18%. A prognostic conversation, not a gate.'] },
    { h: 'VA: cardiogenic shock and arrest', table: { head: ['Setting', 'Criteria and notes'], rows: [
      ['Refractory cardiogenic shock', 'SBP < 90 (or vasopressors), CI < 2.2 with PCWP > 15, lactate > 2, SvO2 < 60%, oliguria, altered mentation despite optimal treatment for hours — SCAI stage C–E. Consider within 6 h of refractoriness, before the second organ fails.'],
      ['Aetiologies that recover', 'Fulminant myocarditis, infarct (after revascularisation — ECLS-SHOCK says routine early VA does not help), post-cardiotomy, peripartum cardiomyopathy, intoxication (β-blocker, calcium-channel blocker, TCA), hypothermia, massive PE (2026 PE guideline: reasonable rescue), RV failure, refractory arrhythmia storm, primary graft failure.'],
      ['ECPR', 'Witnessed arrest, bystander CPR (no-flow < 5 min), shockable rhythm or PEA, age < 70, ETCO2 > 10 during CPR, arrest-to-flow < 60 min, a presumed reversible cause, signs of life; cannulate after 10–20 min of failed resuscitation. ELSO registry survival 29%.'],
      ['Accidental hypothermia', 'Arrest with core < 30 °C: ECLS rewarming if HOPE-predicted survival ≥ 10% (age, sex, temperature, potassium, CPR duration, asphyxia); normothermic exclusions do not apply.'],
      ['Contraindications', 'Severe aortic regurgitation; aortic dissection; no recovery and no transplant/LVAD path; severe peripheral vascular disease (use the axillary or central route); unwitnessed or prolonged arrest; devastating brain injury; Child–Pugh B/C cirrhosis; a contraindication to anticoagulation is relative.'],
      ['SAVE score', 'Diagnosis, age, weight, organ failures, pre-ECMO arrest, diastolic pressure, pulse pressure, bicarbonate, duration of ventilation, peak pressure: survival 75% (class I) → 18% (class V).']] } },
    { h: 'Before the cannula: the minimum', ul: [
      'Define the disease and the trajectory: ABG with FiO2 and PEEP, plateau and driving pressure, days ventilated, response to proning; echo (LV, RV, valves, tamponade); lactate, urine, mental state.',
      'Reversibility and destination: recovery, intervention, transplant or durable device, or a time-limited trial with explicit stopping rules — written down.',
      'Bleeding risk: platelets, coagulation, recent surgery, intracranial pathology; a CT head when neurology is uncertain and the patient can be moved.',
      'Access: ultrasound of the femoral and jugular vessels; the surgical team if the arteries are small.',
      'Consent and the conversation about what the circuit can and cannot do.'] },
    { src: ['Tonna JE, et al. ELSO adult VV guideline. ASAIO J 2021.', 'Lorusso R, et al. ELSO interim VA guideline. ASAIO J 2021.', 'Richardson AS, et al. ELSO ECPR consensus. ASAIO J 2021.', 'Schmidt M, et al. The RESP score. Am J Respir Crit Care Med 2014;189:1374–82.', 'Schmidt M, et al. The SAVE score. Eur Heart J 2015;36:2246–56.', 'ELSO narrative guideline on ECMO for accidental hypothermia, 2025.'] }
  ] };

  T.ecmo_daily = { title: 'Daily management', kicker: 'Anticoagulation, the labs, the ventilator, the fluids, the checklist', blocks: [
    { h: 'Anticoagulation', table: { head: ['', 'Practice'], rows: [
      ['Drug', 'Unfractionated heparin: 50–100 U/kg bolus at cannulation, then 10–20 U/kg/h titrated. Bivalirudin (renal clearance) or argatroban (hepatic) in HIT or heparin resistance.'],
      ['Targets (UFH)', 'Anti-Xa 0.3–0.7 IU/mL (0.3–0.5 for VV at many centres; EOLIA used 0.2–0.3); aPTT 1.5–2.5 × baseline or ~60–80 s (reagent-dependent: do not transfer seconds between hospitals); ACT 180–220 at the bedside. RATE 2026: lower-dose UFH (aPTT 1.5–2×) non-inferior.'],
      ['Monitoring', 'ACT q1–2 h early; anti-Xa/aPTT q6–12 h; platelets q6–12 h; fibrinogen, INR, CBC q12–24 h; plasma free Hb daily; D-dimer; antithrombin if heparin-resistant (> 50–80%); TEG/ROTEM when bleeding or clotting.'],
      ['Anti-Xa pitfalls', 'Falsely low with plasma free Hb > 50 mg/dL, bilirubin > 6, triglycerides > 500; discordant aPTT (high) with anti-Xa (low) = factor deficiency, not more heparin.'],
      ['Thresholds', 'Not bleeding: platelets ≥ 50 (some 30–50), fibrinogen > 1.0–1.5 g/L, INR < 3, Hb ≥ 7. Bleeding or procedure: platelets ≥ 100, fibrinogen > 1.5–2, INR < 1.5, Hb 7–9.'],
      ['Holding', 'For bleeding: hold 4–6 h (up to 12 h or longer), keep the flow ≥ 3 L/min, inspect the circuit; VA needs it back sooner than VV. ICH on VV: hold > 2 days. Decannulation: hold ≥ 1 h.'],
      ['HIT', 'Thrombocytopenia on ECMO is usually not HIT (consumption, sepsis, drugs): 4T score and PF4/serotonin release; if HIT, stop all heparin including the coating if possible and use a DTI.']] } },
    { h: 'Daily labs and what they tell you', table: { head: ['Test', 'Frequency', 'Meaning'], rows: [
      ['Pre- and post-membrane gas', 'Daily and after changes', 'Transfer, membrane function, recirculation (pre-membrane saturation)'],
      ['Plasma free Hb', 'Daily', '< 10 normal; 50–100 moderate (find the cause); > 100 severe (act: speed, pump head, clot)'],
      ['LDH, haptoglobin, bilirubin, potassium', 'Daily', 'Haemolysis corroboration; renal risk'],
      ['Platelets, fibrinogen, D-dimer', 'q12–24 h', 'Consumption in the circuit; rising D-dimer predicts membrane failure'],
      ['ΔP at a stated flow', 'Every shift', 'Clot in the membrane'],
      ['Lactate, SvO2', 'q6–12 h', 'Delivery versus demand'],
      ['Chest X-ray', 'Daily early', 'Cannula position, lung recovery, pneumothorax, oedema'],
      ['Echo', 'Daily on VA; as needed on VV', 'LV ejection and distension, RV, tamponade, cannula positions, recirculation jet'],
      ['Neurological check', 'Every shift; pupillometry; NIRS on VA', 'Stroke and haemorrhage are the deaths on ECMO; sedation holidays when safe'],
      ['Limb check (VA)', 'Hourly', 'DPC flow, Doppler, NIRS, compartments']] } },
    { h: 'The rest of the patient', ul: [
      'Ventilator at rest (VV): plateau < 25, PEEP ≥ 10, rate 4–15, FiO2 ≤ 0.5; tolerate low tidal volumes; proning on ECMO is individual, not routine (PRONECMO). VA: Vt 6–8 mL/kg, PEEP ≥ 10 for the LV, FiO2 for the right radial.',
      'Sedation: lightest safe; analgesia first; hydromorphone over fentanyl (sequestered in the circuit), propofol and benzodiazepines need more; awake ECMO and extubation in selected patients (bridge to transplant).',
      'Fluids: after resuscitation, negative to dry weight; CRRT via a separate catheter or a validated circuit connection (return limb inflow, drainage limb outflow), never an improvised pigtail.',
      'Nutrition: enteral, 25 kcal/kg estimated (no indirect calorimetry on ECMO); avoid lipid-heavy TPN (fouls the membrane).',
      'Infection: cannula sites daily; the heat exchanger hides fever; no circuit cultures; treat through most bacteraemias, change the circuit for persistent ones; no routine prophylaxis beyond peri-procedural.',
      'Pharmacology: lipophilic, protein-bound drugs sequester (fentanyl, propofol, voriconazole); hydrophilic ones are diluted by the prime; levels where available.',
      'Mobility: physiotherapy from day 1, with the cannulas secured; walking on a dual-lumen cannula or an axillary graft.',
      'Transfusion: restrictive (Hb 7) when stable; 9–10 when delivery is marginal or bleeding.'] },
    { h: 'The rounds checklist (six questions)', ol: [
      'Purpose: what is the disease, what is the bridge, what changed today?',
      'Support: mode and sites; flow at what rpm; sweep and FdO2; drainage and membrane pressures and their trend; ventilator settings and the native contribution.',
      'Delivery: arterial (right radial on VA) and post-membrane gases, Hb, lactate, SvO2, urine, perfusion, echo.',
      'Safety: cannula depths and dressings; ΔP and transfer; bleeding, clot, haemolysis; neurology; limbs; anticoagulant and assay.',
      'Recovery: fluid balance, sedation and effort, nutrition, infection, mobility, organ trajectory.',
      'Exit: readiness for a weaning trial (VV sweep-off; VA flow-down), the next decision point, the family.'] },
    { src: ['McMichael ABV, et al. 2021 ELSO adult and pediatric anticoagulation guidelines. ASAIO J 2022;68:303–10.', 'van Minnen O, et al. RATE trial. Lancet 2026;408:357–66.', 'Tonna JE, et al. ELSO adult VV guideline. ASAIO J 2021.', 'ELSO neurological monitoring consensus. ASAIO J 2024.', 'Coz Yataco A, et al. CHEST guideline on red cell transfusion in critically ill adults. Chest 2025;167:477–89.'] }
  ] };

  T.ecmo_complications = { title: 'Complications and emergencies', kicker: 'Bleeding, clot, the leg, the brain, the air, the pump', blocks: [
    { p: 'Bleeding is the commonest complication and intracranial haemorrhage the most lethal; thrombosis is the circuit’s revenge for treating the bleeding. Everything else is mechanical and foreseeable: the leg below a femoral arterial cannula, the ventricle behind a closed valve, air in a line under suction, a pump without power. The emergencies are rehearsed, not improvised.' },
    { h: 'By frequency (ELSO registry, adults)', table: { head: ['Complication', 'VV', 'VA', 'Notes'], rows: [
      ['Any bleeding', '30–40%', '40–50%', 'Cannula site, surgical site, GI, pulmonary; ICH 2–5% (higher after ECPR)'],
      ['Circuit clot / oxygenator change', '10–15%', '~10%', 'Membrane thrombosis > 10%, pump head < 4%'],
      ['Haemolysis (free Hb > 50)', '3–10%', '3–5%', 'More on VA; suction, speed, pump-head clot'],
      ['Acute kidney injury needing RRT', '30–40%', '30–45%', 'Haemolysis, shock, nephrotoxins'],
      ['Infection', '10–15%', '8–15%', 'Cannula sites; risk with duration'],
      ['Limb ischaemia', '~1%', '5–10% (amputation 0.7%)', 'Distal perfusion catheter'],
      ['Stroke (ischaemic)', '2–4%', '4–8%', 'Thrombus from the circuit or a stagnant LV'],
      ['DVT at the cannulation site', '~50%', '', 'Ultrasound after decannulation'],
      ['Cannula dislodgement / air', '< 1%', '< 1%', 'Catastrophic; securement and checklists'],
      ['Tamponade', '', '2–5%', 'RV cannula injury; loss of pulsatility, rising CVP; echo']] } },
    { h: 'The emergencies', table: { head: ['Event', 'Recognise', 'Do'], rows: [
      ['Air in the circuit', 'Bubbles in the line, bubble-detector alarm, sudden flow loss, pump cavitating; the source is a pre-pump port, a cracked connector, a cannula pulled back', 'Clamp return → clamp drainage → pump to zero; head down (left lateral if possible); FiO2 1.0 and emergency ventilator settings; pressors on VA; perfusionist de-airs (two-syringe) or changes the circuit; restart drainage-unclamp, speed, return-unclamp'],
      ['Pump failure / power loss', 'Console dark, flow 0; on VA the flow reverses (arterio-venous fistula)', 'Clamp (VA), hand crank, backup console, restore rpm; support the patient; charge/replace'],
      ['Accidental decannulation', 'Bleeding from the site, air, loss of flow', 'Clamp, pump off, direct pressure (the vein bleeds less than you fear, the artery more), rescue ventilation and pressors, recannulate if still needed'],
      ['Suck-down / drainage insufficiency', 'Chatter, flow swings, drainage pressure < −100, alarms', 'Speed down 100 rpm at a time until stable; then volume status, kink, position (X-ray/echo), cough, tamponade, pneumothorax, abdomen'],
      ['Oxygenator failure', 'Post-membrane PO2 < 200 on FdO2 1.0, PCO2 clearance lost, ΔP rising at constant flow, plasma leak, consumption/haemolysis', 'Check the gas line first; elective exchange prepared (prime, rescue settings, team) before it fails'],
      ['Pump-head thrombosis', 'Noise, heat, sudden haemolysis, flow falling at the same rpm, ΔP across the head', 'Change the pump head (or circuit)'],
      ['Massive haemolysis', 'Free Hb > 100, dark urine, hyperkalaemia, AKI', 'Reduce suction and speed; find the clot or kink; change the component; protect the kidney'],
      ['Tamponade on VA', 'Loss of pulsatility, rising CVP, falling flow with chatter, echo', 'Pericardiocentesis or the surgeon'],
      ['Intracranial haemorrhage', 'New deficit, seizure, pupil change, failure to wake; CT', 'Hold anticoagulation (> 2 days on VV), platelets > 100, neurosurgery; the circuit can run unanticoagulated at full flow'],
      ['Limb ischaemia', 'Cold, pale, no Doppler, NIRS < 50% or > 15–20 points asymmetric; later tense compartments, CK, potassium', 'Distal perfusion catheter; vascular surgery; fasciotomy'],
      ['Pneumothorax on VV', 'Desaturation, chatter (pleural pressure), flow loss', 'Ultrasound/X-ray; drain carefully (anticoagulated); small-bore'],
      ['Sweep disconnection', 'Sudden desaturation and hypercapnia with a normal ΔP; the exhaust silent', 'Reconnect; it is the first check']] } },
    { h: 'Bleeding: the approach', ul: [
      'Where: cannula sites (most), surgery, airway and lung, GI, retroperitoneum, intracranial. Hb trend, platelets, fibrinogen, INR, anti-Xa/aPTT; TEG/ROTEM.',
      'Reduce or hold anticoagulation (4–6 h, longer if needed); correct: platelets ≥ 100, fibrinogen > 1.5–2 g/L, INR < 1.5, calcium; keep the flow ≥ 3 L/min; antifibrinolytics for life-threatening bleeding; DDAVP for acquired von Willebrand syndrome (shear destroys the large multimers on every circuit); source control (surgery, endoscopy, embolisation).',
      'Tracheostomy, chest drains and bronchoscopy are elective bleeding: plan the anticoagulation around them.',
      'Do not stop the circuit for bleeding; do stop the heparin.'] },
    { h: 'Neurology', ul: [
      'ICH 2–5% (VV), more after ECPR; ischaemic stroke 4–8% on VA; hypoxic-ischaemic injury after arrest. Risk factors: rapid PaCO2 fall at cannulation, thrombocytopenia, renal failure, pre-ECMO hypoxia, female sex, the arterial circuit.',
      'ELSO 2024: serial gases in the first 24 h, avoid PaO2 < 70 and > 300, avoid rapid PaCO2 change, MAP > 70, fever prevented; pupillometry, NIRS (VA), EEG when comatose; early CT for the at-risk; multimodal prognostication, never a single test, never under sedation.',
      'IV thrombolysis is contraindicated on ECMO; thrombectomy is not.'] },
    { src: ['Lorusso R, et al. ELSO interim VA guideline (registry complication rates). ASAIO J 2021.', 'ELSO neurological monitoring consensus. ASAIO J 2024.', 'Zangrillo A, et al. A meta-analysis of complications and mortality of ECMO. Crit Care Resusc 2013;15:172–8.', 'Farkas J. ECMO. The Internet Book of Critical Care, 2023 (the emergency checklists).'] }
  ] };

  T.ecmo_wean = { title: 'Liberation', kicker: 'VV: take the gas away. VA: take the flow away. Never the other way round', blocks: [
    { h: 'VV: the sweep-off trial', table: { head: ['Step', 'What'], rows: [
      ['Readiness', 'The lung is recovering (X-ray, compliance, PaO2/FiO2 at a lower FdO2), haemodynamics stable, secretions manageable, drive acceptable. ELSO: FiO2 ≤ 0.6, PEEP ≤ 10, PaO2 ≥ 70; Vt ≤ 6 mL/kg, plateau ≤ 28, RR ≤ 28 on the ventilator.'],
      ['Wean the gas', 'FdO2 from 1.0 toward 0.21 in steps of ~0.2 keeping SpO2 > 92% / PaO2 ≥ 70; then sweep by 0.5–1 L/min steps toward 1 L/min with a gas at each step; tolerating sweep < 2 L/min is the gate. Keep blood flow > 2–3 L/min (> 1 L/min per cannula) throughout.'],
      ['The trial', 'Sweep to zero, gas line capped; the blood still circulates. Ventilator at the acceptable settings (not escalated to pass). ABG at 1–2 h and clinically for 2–3 h or longer (a 30-min gas is a screen; ELSO watches hours). Pass: PaO2 ≥ 70 on FiO2 ≤ 0.6, pH ≥ 7.3, PaCO2 acceptable, RR ≤ 28, plateau ≤ 28, no distress, haemodynamics unchanged.'],
      ['Fail', 'Sweep back on; find why (fluid, secretions, effort, infection); retry in a day.'],
      ['Decannulate', 'Heparin off ≥ 1 h; the venous cannulas come out with manual compression or a purse-string, head down for the jugular (air), positive-pressure breath-hold or brief paralysis; compression 20–30 min; ultrasound the veins after 24 h for DVT (half have one).'],
      ['After', 'The lung is still convalescent: lung-protective ventilation continues; most patients are extubated after decannulation, not before.']] } },
    { h: 'VA: the flow-down trial', table: { head: ['Step', 'What'], rows: [
      ['Readiness', 'Cause treated or recovering; pressors off or low (norepinephrine ≤ 0.06–0.1 µg/kg/min, no high-dose inotrope); lactate normal; pulsatile trace with pulse pressure > 20–30; echo at full flow improving; lungs adequate on the ventilator (the native lung must oxygenate once the circuit goes); no tamponade; rhythm stable; LVEF ≥ 20–25% and rising. Usually day 3–7.'],
      ['The trial', 'Heparin bolus (or ACT > 200). Reduce flow in 0.5 L/min steps every 5–10 min (sweep kept on; FdO2 up if needed) to 1–1.5 L/min (never lower for long: thrombosis); echo and haemodynamics at each step; hold 30–60 min at minimal flow. Some centres add a 3–5-min clamp with the bridge open, or a pump-controlled retrograde trial (flow reversed 1 L/min through the circuit with the sweep off, which mimics decannulation).'],
      ['Pass (Aissaoui criteria at minimal flow)', 'MAP ≥ 60–65 without new vasopressors; LVOT VTI ≥ 10 cm (≥ 12 per ELSO); LVEF > 20–25%; lateral mitral annular TDSa ≥ 6 cm/s; no LV dilation or rising filling pressures (CVP ≤ 10); SvO2 > 65%; no arrhythmia, no desaturation; lactate stable.'],
      ['Fail', 'Back to the last tolerated flow; address the cause (volume, ischaemia, rhythm, valve); if no recovery by 5–7 days, the next device (temporary LVAD, durable LVAD, transplant listing) or the limit of the trial.'],
      ['Decannulate', 'Promptly after a pass (the circuit at 1 L/min is a clot waiting). Arterial: surgical repair, or percutaneous closure devices; DPC out; venous as for VV. Watch the leg and the groin (pseudoaneurysm, AV fistula, retroperitoneal bleed).'],
      ['Heart recovered, lungs not', 'Convert VA → VV (swap the arterial return for a jugular venous return) rather than forcing full decannulation.']] } },
    { h: 'The two mistakes', ul: [
      'Sweep off on VA: with the gas off the circuit returns venous blood straight into the artery — a right-to-left shunt of the whole flow. VA weaning never turns the sweep off while blood goes to an artery (the retrograde trial is the deliberate exception, at 1 L/min, for minutes).',
      'Flow down on VV: the membrane still works at 1 L/min and the circuit clots; it tests nothing about the lung. VV weaning is the sweep.'] },
    { src: ['Tonna JE, et al. ELSO adult VV guideline, Tables 5–7. ASAIO J 2021.', 'Lorusso R, et al. ELSO interim VA guideline (weaning). ASAIO J 2021.', 'Aissaoui N, et al. Predictors of successful VA ECMO weaning after assistance for refractory cardiogenic shock. Intensive Care Med 2011;37:1738–45.', 'Ling L, Chan KM. Weaning from VA ECMO: how I approach it. Crit Care 2020;24:280.', 'Grant AA, et al. Levosimendan for weaning from VA ECMO (LEVOECMO). JAMA 2025.'] }
  ] };

  T.ecmo_lab = { title: 'The circuit lab', kicker: 'A patient on the pump: turn the dials and watch the gases at every port', blocks: [
    { p: 'A model of an adult on VV or VA ECMO. The circuit on the left is the one from the circuit page, with the blood coloured by its saturation; the console shows the flow the pump actually achieves against the drainage, the three pressures and the membrane’s gradient; the gas panels show the blood at the drainage, after the membrane, and in the patient — on VA at the right radial artery and at the femoral artery, because they differ. Change the pump speed, the sweep, the FdO2, the membrane’s condition, the cannulas; change the patient — heart, lungs, haemoglobin, demand, volume — and see which number moves. The presets set up the troubles from the scenarios page. The guided scenarios at the top of the lab go the other way: a patient’s presentation, the gases the lab computes from it, and the question of the next best step — the move you choose turns the dials, the circuit and the gases answer, and a before/after table keeps the score; a wrong turn can be undone and the best move applied instead.' },
    { widget: 'ecmolab' },
    { h: 'The rules the lab plays by', ul: [
      'Pump: the speed asks for a flow (about 1.9 L/min per 1,000 rpm above 1,000); the drainage gives what the cannula and the venous reservoir allow (a 25 Fr cannula about 6 L/min at a CVP of 8); past that the vessel collapses, the flow falls and swings (chatter) and the drainage pressure dives. Return pressure is the return cannula’s resistance × flow (plus the arterial pressure on VA); the membrane’s ΔP rises with flow and with clot.',
      'Membrane: a new membrane on 100% oxygen returns blood at a PO2 near 480, falling as it clots or as the flow passes the rated 7 L/min; its oxygen transfer is capped near 65 mL/min per litre of flow (about 450 mL/min at the rated flow). CO2 leaves in proportion to the sweep-to-flow ratio (post-membrane PCO2 ≈ pre × e^(−0.4 × sweep/flow)).',
      'VV: effective flow = flow × (1 − recirculation); the drainage blood is venous blood plus the recirculated fraction; the pulmonary-arterial blood is the flow-weighted mix of circuit and venous blood; the native lung lifts the non-shunted part to its alveolar PO2 (FiO2 and the PaCO2); the venous content follows Fick from the arterial content, the output and the VO2 — iterated to a steady state. PaCO2 balances the body’s VCO2 against what the membrane and the native alveolar ventilation remove; pH from the bicarbonate.',
      'VA: the native ejection is the contractility’s 5 L/min minus what the afterload of the circuit’s pressure takes (and plus what an Impella pumps); MAP = (circuit + native) × SVR; LVEDP rises as the ventricle fails to eject and as the flow and the venous pressure rise, falls with a vent; above 20 with a closed valve the ventricle is distended and the lung floods (shunt rises). In the aorta the native blood takes the branches nearest the root in order — coronaries, innominate, left carotid, left subclavian, then the descending aorta — and the circuit’s blood supplies whatever is left, with a soft mixing zone; central or axillary return mixes at the root instead.',
      'Drips (v8.4): each vasoactive acts through its receptors with a dose–response on the systemic resistance, the contractility, the heart rate, the venous tone and the pulmonary resistance; the combined effect is applied to the patient before the circuit runs. On VA, resistance is pressure but also the ventricle’s afterload (the valve, the pulse pressure, the LVEDP); on VV a higher native output means a smaller circuit fraction (the SaO2 falls while the DO2 rises), and a right ventricle failing against a high PVR answers to iNO and milrinone, not to the sweep.',
      'A model, not a patient: the directions and the orders of magnitude are right; the exact numbers are a teaching fiction.'] },
    { h: 'Pressors and inotropes on the circuit', ul: [
      'VA: the circuit gives flow; the pressure comes from flow × resistance. A pure vasoconstrictor (norepinephrine, vasopressin, phenylephrine, angiotensin II) raises the MAP at the same flow — and raises the afterload of a ventricle already working against the retrograde column: the pulse pressure narrows, the valve stays shut, the LVEDP climbs. Keep the MAP target modest (65–70), and when the ventricle is the problem reach for an inodilator (dobutamine, milrinone) or an arterial vasodilator, a vent, or less flow.',
      'VA: vasoplegia (sepsis, post-cardiotomy, the inflammatory response to the circuit) is a resistance problem; more flow buys little. Norepinephrine first, vasopressin as the catecholamine-sparing second agent, angiotensin II or methylene blue as rescue; look for the cause.',
      'VV: the heart does the pumping. Inotropes raise the output and therefore lower the fraction of the venous return the circuit sees — the saturation falls although nothing on the circuit changed. Read the DO2 and the lactate, not the SpO2. A pressor raises the MAP without touching the gas exchange.',
      'VV: the right ventricle fails against the pulmonary resistance of ARDS (hypoxia, hypercapnia, acidosis, PEEP). Fix the gas (sweep, FiO2), then lower the PVR (inhaled nitric oxide, milrinone) and support the contractility (dobutamine, epinephrine); vasopressin keeps the systemic pressure without raising the PVR. The drainage improves as the CVP rises, which is not good news.',
      'Dosing: the norepinephrine-equivalent dose adds the agents on one scale (norepinephrine 1:1, epinephrine 1:1, phenylephrine ÷10, dopamine ÷100, vasopressin × 2.5 per U/min, angiotensin II ÷100); above 0.5 mcg/kg/min ask why rather than how much more. Epinephrine and dopamine make lactate and arrhythmia; dobutamine and milrinone drop the pressure; milrinone accumulates in renal failure.'] }
  ] };

  T.ecmo_cases = { title: 'Troubleshooting at the bedside', kicker: 'Fourteen calls from the nurse, the perfusionist or the monitor', blocks: [
    { p: 'Each scenario is a real pattern: the numbers on the console and in the patient, a question, and four things one might do. Choose; the verdict explains the physiology; the fix is the sequence the ECMO team would follow. “Show in the lab” loads the circuit lab with the problem, and then with the fix.' },
    { widget: 'ecmocases' },
    { note: 'The verdicts follow the ELSO guidelines and the sources on the other pages; the sequences at a given centre are its own protocol’s, and the ECMO specialist at the bedside outranks any card.' }
  ] };

  const GROUPS = [
    { title: 'Start', ids: ['ecmo_intro', 'ecmo_circuit', 'ecmo_cannulation'] },
    { title: 'Physiology', ids: ['ecmo_vv', 'ecmo_va'] },
    { title: 'The patient', ids: ['ecmo_select', 'ecmo_daily', 'ecmo_complications', 'ecmo_wean'] },
    { title: 'Practice', ids: ['ecmo_lab', 'ecmo_cases'] }
  ];
  /* ================================================================== the guided lab cases ================================================================== */
  /* a presentation and the gases the lab computes from the state; each step asks for the next best move and the chosen move actually turns the dials */
  const LABCASES = [
    { id: 'lab_recirc', title: 'Hypoxaemic on full flow', mode: 'vv', s: { config: 'ff', recirc: 0.45, rpm: 3500, sweep: 1.5 }, p: { shunt: 0.6 },
      who: 'Day 1 of VV ECMO for bacterial ARDS, cannulated femoro-femoral in the emergency department at 03:00. Flow 4.8 L/min on 3,500 rpm, sweep 1.5, FdO2 1.0. SpO2 has drifted from 92% to 86% over the morning; the drainage line is bright red. Ventilator at rest settings, PEEP 12.',
      look: 'Read the three gases: the drainage (pre-membrane) saturation is high for a hypoxaemic patient, the post-membrane PO2 is fine, the effective flow is well under 60% of the cardiac output.',
      steps: [
        { q: 'Next best step?', options: [
          ['reposition', 'Reposition the cannulas: pull the drainage tip back towards the IVC–RA junction, or convert the return to the internal jugular (femoro-jugular)', 'best', 'A bright drainage line with a high pre-membrane saturation and a desaturating patient is recirculation: the return jet is being drawn straight back into the drainage. Separate the tips (10–15 cm) or change the geometry; the effective flow — not the console flow — is what oxygenates.', (p, s) => { s.config = 'fj'; s.recirc = 0.15; }],
          ['rpm', 'Increase the pump speed to 4,000 rpm', 'poor', 'More flow with the tips where they are mostly recirculates — the fraction rises with the flow when the tips are close — and the drainage pressure falls; the patient gains little.', (p, s) => { s.rpm = 4000; s.recirc = Math.min(0.7, s.recirc + 0.1); }],
          ['sweep', 'Increase the sweep to 6 L/min', 'wrong', 'Sweep governs CO2, not oxygenation: the post-membrane blood is already fully saturated. The PaCO2 falls, the PaO2 does not move.', (p, s) => { s.sweep = 6; }],
          ['fdo2', 'Turn the FdO2 up', 'wrong', 'It is already 1.0: the membrane is doing its job (post-membrane PO2 near 480). The oxygen is leaving the circuit and coming straight back in.', (p, s) => { s.fdo2 = 1; }]] },
        { q: 'The tips are apart; the drainage line is dark again and the SpO2 is 96%. The PaCO2 is 52 with a pH of 7.29 on rest settings. Next?', options: [
          ['sweep2', 'Increase the sweep to 2.5–3 L/min', 'best', 'CO2 removal is the sweep’s job: a modest rise clears the PaCO2 to the low 40s without changing the ventilator, which stays at rest settings — the whole point of the run.', (p, s) => { s.sweep = 2.6; }],
          ['vent', 'Increase the ventilator rate and tidal volume', 'wrong', 'The lung is on ECMO to rest; driving it harder to clear CO2 undoes that. The membrane removes CO2 at the turn of a dial.', (p, s) => { p.va = p.va + 1.5; }],
          ['rpm2', 'Increase the pump speed', 'poor', 'Flow helps oxygenation; CO2 clearance follows the sweep-to-flow ratio, so more flow at the same sweep clears little more CO2 and costs drainage pressure.', (p, s) => { s.rpm = s.rpm + 300; }],
          ['bicarb', 'Give bicarbonate', 'wrong', 'The acidosis is respiratory; bicarbonate makes more CO2 and treats a number, not the cause.', (p, s) => { p.hco3 = p.hco3 + 3; }]] }
      ], done: 'Two dials, two problems: the geometry for the oxygen, the sweep for the CO2. The console flow never told you about the recirculation — the drainage colour and the pre-membrane saturation did.' },

    { id: 'lab_chatter', title: 'The line that shakes', mode: 'vv', s: { rpm: 3800 }, p: { cvp: 3 },
      who: 'Day 3 of VV ECMO for influenza ARDS, femoro-jugular. Net −3 L over 24 h on a furosemide infusion to dry the lungs. The drainage line jumps with every cough; the flow swings between 4.5 and 2.8 L/min and the console alarms “low flow”. 3,800 rpm; drainage pressure −140 mm Hg; SpO2 88 → 83%; CVP 3.',
      look: 'Watch the console: the drainage pressure is far past −100 and the flow the pump achieves is below what the speed asks for; the drainage line is drawn shaking.',
      steps: [
        { q: 'First move?', options: [
          ['down', 'Turn the speed down, 100 rpm at a time, until the line settles', 'best', 'Chatter is the cannula sucking against a collapsing cava: the pump demands more than the vein can give. Lower the demand first — the flow often improves as the swings stop — then find the cause.', (p, s) => { s.rpm = 2700; }],
          ['fluid', 'Give a litre of crystalloid', 'reasonable', 'This patient is probably dry (CVP 3 after −3 L) and volume is part of the answer — but not before the speed comes down, and not as the reflex for every chatter: a litre into ARDS lungs on a drying day is a day lost.', (p, s) => { p.cvp = 8; }],
          ['up', 'Turn the speed up to recover the flow', 'wrong', 'More suction on a collapsed vein: the chatter worsens, the drainage pressure dives further, the flow falls, and the red cells shear.', (p, s) => { s.rpm = 4200; }],
          ['clamp', 'Clamp and check the circuit for air', 'poor', 'Air in the drainage line is a different emergency (an open connector, a cracked pigtail); a rhythmic swing with coughing, a deep negative pressure and a low CVP is the cava, not air.', (p, s) => {}]] },
        { q: 'At 2,700 rpm the line is quiet, the drainage pressure −45, the flow steady at 3.2 L/min — but the SpO2 is 88% and the patient needs the flow. Next?', options: [
          ['fluid2', '500 mL of crystalloid, then bring the speed back up slowly', 'best', 'The vessel needs filling before the pump can draw more: a measured bolus restores the reservoir, and the speed goes back up only as far as the line stays quiet. Then the reason for the chatter (the diuresis) is corrected in the fluid plan.', (p, s) => { p.cvp = 8; s.rpm = 3600; }],
          ['bigger', 'Exchange for a larger drainage cannula', 'poor', 'The limit here is the venous reservoir, not the cannula: a bigger cannula sucks the same empty vein, and an exchange is a bleed and a risk for a problem a bolus fixes.', (p, s) => { s.drain = 29; }],
          ['sweep', 'Increase the sweep', 'wrong', 'Sweep is for CO2; the problem is flow and oxygenation.', (p, s) => { s.sweep = s.sweep + 2; }],
          ['fio2', 'Turn the ventilator FiO2 to 1.0', 'poor', 'The native lung is shunting; FiO2 helps little and costs oxygen toxicity. The oxygenation lives in the circuit flow.', (p, s) => { p.fio2 = 1; }]] }
      ], done: 'Speed down, then fill, then speed up: the order matters because the pump cannot create venous return, only take it.' },

    { id: 'lab_highco', title: 'Septic, hyperdynamic, still blue', mode: 'vv', s: { rpm: 3600, sweep: 4 }, p: { co: 9, vo2: 400, vco2: 330, hb: 8.5, shunt: 0.65 },
      who: 'Day 5 of VV ECMO for ARDS, now with a new ventilator-associated pneumonia and septic shock. Temperature 39.6, HR 130, cardiac output 9 L/min by echo. Circuit flow 4.9 L/min on 3,600 rpm, sweep 4, FdO2 1.0, post-membrane PO2 480. SpO2 87%, Hb 8.5, lactate 4.',
      look: 'The membrane is working (post-membrane blood fully saturated) but the flow is less than half the cardiac output: most of the venous blood bypasses the circuit and goes through a shunting lung.',
      steps: [
        { q: 'Next best step?', options: [
          ['flow', 'More circuit flow: upsize or add a second drainage cannula and run 6 L/min', 'best', 'On VV the arterial saturation is set by the ratio of circuit flow to cardiac output (≥ 60% keeps the SpO2 above 88–90%). With the output at 9 L/min the circuit must deliver 5.5–6; one 25 Fr drainage cannula cannot, so a second drainage or a 29–31 Fr is the physiological answer.', (p, s) => { s.drain = 31; s.rpm = 4400; }],
          ['hb', 'Transfuse to a haemoglobin of 10', 'reasonable', 'Each gram carries oxygen: at a fixed saturation the delivery rises with the haemoglobin, and the mixed venous saturation improves. It helps the delivery, not the saturation — the number the team is staring at.', (p, s) => { p.hb = 10; }],
          ['cool', 'Treat the fever and the agitation: paracetamol, cooling, deeper sedation, a β-blocker if tolerated', 'reasonable', 'Lowering VO2 and the cardiac output raises the circuit’s share of the venous return and the SpO2; part of the answer in every hyperdynamic patient on VV, and the sepsis is treated regardless. It cannot deliver what a second cannula can.', (p, s) => { p.co = 7.5; p.vo2 = 320; p.vco2 = 260; }],
          ['sweep', 'Increase the sweep to 8', 'wrong', 'The post-membrane PO2 is already 480: the limit is how much blood reaches the membrane, not what the membrane does to it.', (p, s) => { s.sweep = 8; }]] },
        { q: 'A second drainage cannula is in; the flow is 6.5 L/min and the SpO2 94%. Lactate still 4, SvO2 at the drainage 57%. Next?', options: [
          ['hb2', 'Transfuse to a haemoglobin of 10 and treat the sepsis (source, antibiotics, pressors)', 'best', 'The saturation is acceptable; the delivery is still short for a septic patient consuming 400 mL/min. Content is haemoglobin × saturation: with the flow maximal, the haemoglobin is the lever left — and the sepsis is the disease.', (p, s) => { p.hb = 10; }],
          ['flow2', 'Push the flow to 7.5 L/min', 'poor', 'Past the rated flow the membrane’s transfer falls, the drainage pressure rises and haemolysis begins; the gain in saturation is small.', (p, s) => { s.rpm = 5000; }],
          ['fio2', 'Ventilator FiO2 to 1.0', 'poor', 'A shunting lung lifts the PaO2 a little; it does not fix delivery.', (p, s) => { p.fio2 = 1; }],
          ['wean', 'Begin weaning the sweep', 'wrong', 'The patient is septic and hypoxaemic; the circuit is carrying the oxygenation. This is not a weaning day.', (p, s) => { s.sweep = 1; }]] }
      ], done: 'Flow-to-output ratio, then content: the two numbers that decide delivery on VV. A membrane with blood coming out at 480 was never the problem.' },

    { id: 'lab_oxyfail', title: 'A membrane giving up', mode: 'vv', s: { oxy: 0.6 }, p: {},
      who: 'Day 12 of VV ECMO. Over 48 h the SpO2 has fallen from 95% to 90% on unchanged settings and the PaCO2 has crept up to 47; the perfusionist reports the ΔP across the membrane has climbed from 27 to 75 mm Hg, the post-membrane PO2 has fallen from 480 to under 100, and there is a fibrin sheen on the inlet. Platelets 60, D-dimer rising, plasma free haemoglobin 80 mg/dL.',
      look: 'Read the post-membrane gas and the console: a post-membrane PO2 under 200 on an FdO2 of 1.0 with a rising ΔP is the membrane, not the patient; the membrane is drawn with clot in the fibres.',
      steps: [
        { q: 'Next best step?', options: [
          ['change', 'Change the oxygenator (circuit change or membrane swap), with the team and the primed spare at the bedside', 'best', 'A failing membrane does not recover: the PO2 falls, the ΔP rises, the consumptive coagulopathy and the haemolysis follow. Planned exchange within hours, while the patient can still tolerate a minute off support, beats an emergency change at 3 a.m.', (p, s) => { s.oxy = 1; }],
          ['fdo2', 'Increase the FdO2', 'wrong', 'It is already 1.0. The membrane surface is what is lost; more oxygen in the gas phase cannot reach the blood across clot.', (p, s) => { s.fdo2 = 1; }],
          ['rpm', 'Increase the flow', 'poor', 'More blood through a clotted membrane: the ΔP climbs further, the haemolysis worsens, the transfer barely improves.', (p, s) => { s.rpm = s.rpm + 400; }],
          ['heparin', 'Increase the heparin', 'poor', 'Anticoagulation prevents the next clot; it does not clear this one, and the platelets are already 60. The membrane is the answer.', (p, s) => {}]] }
      ], done: 'The membrane’s own gas tells you when it is failing: post-membrane PO2 under 200–300 on an FdO2 of 1.0, a rising ΔP, a rising plasma free haemoglobin. Change it on your terms.' },

    { id: 'lab_co2', title: 'Acidotic on a quiet lung', mode: 'vv', s: { sweep: 1, rpm: 3400 }, p: { vco2: 330, vo2: 290, va: 1.0 },
      who: 'Hour 6 of VV ECMO for ARDS with a plateau pressure of 34 before cannulation. The ventilator is now at rest settings: tidal volume 3 mL/kg, rate 10, PEEP 14, driving pressure 10. Gas: pH 7.11, PaCO2 78, PaO2 78, SpO2 95%. The circuit: flow 4.6 L/min, sweep 1, FdO2 1.0.',
      look: 'The patient gas shows a respiratory acidosis with an acceptable PaO2: the oxygenation is fine at this flow, the CO2 is not — look at the sweep-to-flow ratio.',
      steps: [
        { q: 'Next best step?', options: [
          ['sweep', 'Increase the sweep to 2.5 L/min and recheck the gas in 20 minutes, then step again if needed', 'best', 'CO2 clearance is the sweep’s: the post-membrane PCO2 falls as e^(−0.4 × sweep/flow), so going from 1 to 2.5 L/min on a flow of 4.6 clears most of the load. Raise it in steps — a fall in PaCO2 of more than 20 mm Hg in the first hour is a cerebral risk.', (p, s) => { s.sweep = 2.5; }],
          ['vent', 'Raise the ventilator rate to 24 and the tidal volume to 6 mL/kg', 'wrong', 'That is the ventilation the ECMO was started to avoid: driving pressure and mechanical power go back up in a lung that is already injured.', (p, s) => { p.va = 3.5; }],
          ['rpm', 'Increase the pump speed', 'poor', 'More flow at the same sweep changes the ratio the wrong way; CO2 clearance barely moves and the drainage pressure falls.', (p, s) => { s.rpm = 3900; }],
          ['bicarb', 'Bicarbonate 100 mmol', 'wrong', 'The acidosis is respiratory; bicarbonate is CO2 in disguise and the pH will not hold.', (p, s) => { p.hco3 = 28; }]] }
      ], done: 'Oxygen is the flow’s, CO2 is the sweep’s — the two are independent dials, and the ventilator stays at rest.' },

    { id: 'lab_harlequin', title: 'Blue on the right, pink on the left', mode: 'va', s: {}, p: { contr: 0.6, shunt: 0.55, fio2: 0.5 },
      who: 'Day 4 of peripheral VA ECMO for post-infarction cardiogenic shock. The heart is recovering — pulse pressure 35, LVEF 35% — but the lungs have flooded: FiO2 0.5, PEEP 8, bilateral infiltrates. The right radial line reads a PaO2 of 48 with a saturation of 84%; the femoral line downstream of the return cannula reads 310. The right hand is dusky; NIRS over the right forehead has fallen.',
      look: 'Two patient gases: right radial (the brain and the coronaries) and femoral; the mixing zone is drawn on the aorta — the recovering heart is pushing hypoxaemic blood from the lungs into the arch while the circuit perfuses the lower body.',
      steps: [
        { q: 'Next best step?', options: [
          ['vent', 'Treat the lung: FiO2 up, PEEP up, diurese, treat the pneumonia — and watch the right radial gas', 'reasonable', 'Right in principle: the hypoxaemic blood comes from the native lung, so improving the lung improves the arch. It is slow, and often insufficient when the heart keeps recovering faster than the lung.', (p, s) => { p.fio2 = 0.8; p.shunt = 0.45; }],
          ['config', 'Change the configuration: add a venous return limb (V-AV) or move the arterial return to the axillary artery or central', 'best', 'Harlequin (north–south) syndrome: the only cure is to oxygenate the blood the heart ejects or to deliver circuit blood to the arch. V-AV sends oxygenated blood into the right atrium so the lungs’ output is oxygenated; an axillary or central return puts the mixing zone proximal to the brain.', (p, s) => { s.config = 'ax'; }],
          ['up', 'Increase the circuit flow', 'poor', 'More retrograde flow pushes the mixing zone a little higher, but the heart is recovering and the lungs are the problem; raising the flow also loads the ventricle and shuts the valve you want open.', (p, s) => { s.rpm = s.rpm + 400; }],
          ['down', 'Reduce the circuit flow to let the heart take over', 'wrong', 'The heart ejects hypoxaemic blood: less circuit flow moves the mixing zone down and makes the whole body as blue as the arm.', (p, s) => { s.rpm = s.rpm - 500; }]] }
      ], done: 'On peripheral VA the right radial artery is the only gas that counts for the brain. Harlequin is diagnosed by where you sample, and cured by where you return.' },

    { id: 'lab_distension', title: 'A perfect pressure, a silent ventricle', mode: 'va', s: { rpm: 3700 }, p: { contr: 0.08, cvp: 12, shunt: 0.3 },
      who: 'Hour 10 of peripheral VA ECMO for fulminant myocarditis, 4.9 L/min on 3,700 rpm. MAP 80 on no pressors, lactate clearing. The arterial trace is flat — pulse pressure 2 mm Hg. Echo: a dilated LV with no ejection, the aortic valve motionless, smoke in the cavity; pink frothy secretions from the tube; the chest film is whiting out.',
      look: 'The console says all is well; the patient gas is fine. Look at the ventricle in the drawing (swollen with its filling pressure) and the pulse pressure: the LVEDP is above 20 and the valve is closed.',
      steps: [
        { q: 'Next best step?', options: [
          ['impella', 'Vent the ventricle: Impella (ECPELLA), or an atrial septostomy or surgical vent where that is the local option', 'best', 'The circuit has restored the pressure and shut the valve: blood arriving in the left heart has nowhere to go, the LVEDP climbs, the lungs flood, the cavity clots. A microaxial pump empties the ventricle into the aorta; the pulse returns, the oedema clears.', (p, s) => { s.unload = 'impella'; s.rpm = 3400; }],
          ['iabp', 'Insert an IABP', 'reasonable', 'A balloon pump adds some pulsatility and lowers the afterload — a modest vent, a reasonable first step while the Impella is arranged, rarely enough on its own for a ventricle this silent.', (p, s) => { s.unload = 'iabp'; }],
          ['ino', 'Start dobutamine to get the valve opening', 'reasonable', 'An inotrope can open the valve when the ventricle has some reserve; with an EF under 10% it buys little and costs arrhythmia and oxygen demand. Part of the plan, together with a lower flow, not the whole of it.', (p, s) => { p.contr = 0.2; }],
          ['rpm', 'Increase the flow for the oedema', 'wrong', 'More flow raises the aortic pressure and closes the valve more firmly; the oedema is from the ventricle that cannot empty, not from the perfusion.', (p, s) => { s.rpm = 4100; }]] },
        { q: 'The Impella is in at P6; the aortic valve opens again and the LVEDP has fallen from 26 to 14. The circuit flow is still 4.6 L/min. Next?', options: [
          ['flowdown', 'Reduce the circuit flow to the lowest that perfuses (lactate, SvO2, MAP) and keep the Impella working', 'best', 'ECPELLA is a partnership: the circuit for the perfusion, the microaxial pump for the ventricle. Lower circuit flow means lower afterload and more native ejection — the direction of recovery — while the Impella keeps the ventricle empty.', (p, s) => { s.rpm = 2900; }],
          ['flowup', 'Keep the flow high for safety', 'poor', 'The high flow is what loaded the ventricle; now that it is vented, the flow should come down to what the perfusion needs.', (p, s) => {}],
          ['stopimp', 'Remove the Impella now that the ventricle is empty', 'wrong', 'The ventricle is empty because of the Impella; remove it and the distension returns.', (p, s) => { s.unload = 'none'; }],
          ['fluid', 'Give volume for the lower LVEDP', 'wrong', 'The LVEDP was the problem. A low filling pressure on ECPELLA is the goal, not a deficit.', (p, s) => { p.cvp = p.cvp + 4; }]] }
      ], done: 'On VA, a good pressure and a clear lactate can hide a dying ventricle. The pulse pressure and the echo — not the console — tell you.' },

    { id: 'lab_limb', title: 'A cold white foot', mode: 'va', s: { dpc: false, ret: 19 }, p: { contr: 0.2, shunt: 0.25, cvp: 12 },
      who: 'Hour 3 of peripheral VA ECMO after ECPR, 19 Fr arterial cannula in the right femoral artery placed in a hurry, no distal perfusion catheter. The right foot is white and cold, no Doppler signal at the dorsalis pedis, the calf is soft. Flow 4.4 L/min, MAP 75.',
      look: 'The console shows nothing wrong — the circuit does not know about the leg. The drawing shows the cannula filling the femoral artery with no distal perfusion catheter; the limb-risk line in the gases panel is the only number that moves.',
      steps: [
        { q: 'Next best step?', options: [
          ['dpc', 'Place a distal perfusion catheter (6–8 Fr antegrade into the superficial femoral artery) from the circuit’s arterial limb — now', 'best', 'The arterial cannula occludes the femoral artery; without a distal perfusion catheter the leg is ischaemic from the first minute. An antegrade DPC placed within hours prevents the compartment syndrome, the fasciotomy and the amputation; many centres place it at cannulation.', (p, s) => { s.dpc = true; }],
          ['down', 'Reduce the circuit flow', 'poor', 'Less flow does not reopen an occluded artery; it reduces the perfusion the circuit exists to provide.', (p, s) => { s.rpm = s.rpm - 400; }],
          ['heparin', 'Increase the anticoagulation', 'wrong', 'The leg is ischaemic from obstruction, not thrombosis; heparin does not perfuse a limb past a cannula.', (p, s) => {}],
          ['downsize', 'Exchange for a 15 Fr arterial cannula', 'reasonable', 'A smaller cannula leaves more lumen around it and is the right size for a small artery — but the exchange is a bleed and a delay, and a 15 Fr cannula costs return pressure at this flow; the DPC is the direct answer and can be added to any cannula.', (p, s) => { s.ret = 15; s.dpc = true; }]] }
      ], done: 'Check the leg every hour (Doppler, NIRS); a DPC at cannulation is the policy that prevents the question.' },

    { id: 'lab_vawean', title: 'Is the heart ready?', mode: 'va', s: { rpm: 3300 }, p: { contr: 0.7, shunt: 0.15, fio2: 0.4, vo2: 230, vco2: 190 },
      who: 'Day 6 of VA ECMO for myocarditis. Pulse pressure 45, LVEF 40% on echo, LVOT VTI 14 cm at full flow, lactate normal, no pressors, lungs clear on FiO2 0.4. The team asks whether the circuit can come out.',
      look: 'A recovering heart on a circuit still running full flow: the pulse pressure is wide and the native ejection is drawn. The question is what happens when the circuit stops helping.',
      steps: [
        { q: 'Next best step?', options: [
          ['trial', 'A flow-down trial: reduce the circuit flow stepwise to 1–1.5 L/min over 30–60 minutes with echo at each step (LVOT VTI > 10–12 cm, LVEF > 20–25%, TDSa > 6 cm/s, MAP held, lactate stable)', 'best', 'Readiness on VA is tested by withdrawing the support, not by numbers at full flow: at minimal flow the heart carries the circulation or it does not. Anticoagulation is kept up during the low-flow period; the sweep stays on.', (p, s) => { s.rpm = 2000; }],
          ['sweepoff', 'Turn the sweep off and watch', 'wrong', 'That is the VV test. On VA, blood with the sweep off returns to the artery unoxygenated — the patient desaturates — and it says nothing about the heart.', (p, s) => { s.sweep = 0; }],
          ['decan', 'Decannulate now on the echo', 'wrong', 'The echo at full flow is the echo of an unloaded heart; the trial exists because that picture flatters.', (p, s) => { s.rpm = 1200; }],
          ['ino', 'Start milrinone first', 'reasonable', 'Low-dose inodilator support for the trial and the first days off is common practice; it is a companion to the trial, not a substitute.', (p, s) => { p.contr = 0.8; }]] },
        { q: 'At 1.5 L/min: MAP 72, pulse pressure 48, VTI 16 cm, lactate 1.1, SvO2 66%. Next?', options: [
          ['decan2', 'Decannulate in the operating room or with vascular repair of the arteriotomy; low-dose inotrope and close observation for 48 h', 'best', 'The heart has carried the circulation at minimal support: the trial is passed. The arterial cannula comes out with the artery repaired (or closed with a device), the venous cannula with pressure; the leg and the pressure are watched. (The lab keeps the trial flow: it has no “off”.)', (p, s) => {}],
          ['back', 'Return to full flow and repeat tomorrow', 'poor', 'Every day on the circuit is bleeding, infection and limb risk; a passed trial is a decision, not a rehearsal.', (p, s) => { s.rpm = 3300; }],
          ['hold', 'Stay at 1.5 L/min overnight', 'wrong', 'Low flow for hours clots the circuit and the cannula; a trial is minutes, then a decision.', (p, s) => {}],
          ['sweep', 'Stop the sweep and leave the flow', 'wrong', 'Unoxygenated circuit blood into the artery; still the VV test, still wrong on VA.', (p, s) => { s.sweep = 0; }]] }
      ], done: 'VA weaning is a flow trial under echo; VV weaning is a sweep-off trial. The two tests are not interchangeable.' },

    { id: 'lab_vvwean', title: 'Is the lung ready?', mode: 'vv', s: { rpm: 3200, sweep: 1 }, p: { shunt: 0.15, va: 3.8, fio2: 0.4, vo2: 250, vco2: 200 },
      who: 'Day 9 of VV ECMO for ARDS. Chest film clearing, compliance 45 mL/cm H2O, FiO2 0.4 and PEEP 10 on the ventilator with a driving pressure of 11; PaO2 186 and PaCO2 32 on a sweep of 1 and a flow of 4 L/min. The team asks whether the lung can carry itself.',
      look: 'The native lung is doing more of the work (the ventilator’s share of the CO2 and the oxygen is larger); the circuit flow is still 4 L/min with a low sweep.',
      steps: [
        { q: 'Next best step?', options: [
          ['sweepoff', 'A sweep-off trial: turn the sweep to zero with the flow kept, and watch the gas and the work of breathing for 1–4 hours on acceptable ventilator settings', 'best', 'On VV the circuit contributes oxygen and CO2 removal through the sweep; with the sweep off the circuit is a bystander and the gas is the lung’s alone. If the PaO2 and the PaCO2 hold on lung-protective settings (FiO2 ≤ 0.5–0.6, PEEP ≤ 10–12, driving pressure under 15) the patient is ready.', (p, s) => { s.sweep = 0; }],
          ['flowdown', 'Reduce the flow to 1.5 L/min', 'wrong', 'That is the VA trial. On VV, low flow clots the circuit and the oxygenation falls before you learn anything about the lung; the flow stays, the sweep goes.', (p, s) => { s.rpm = 1800; }],
          ['decan', 'Decannulate on the chest film', 'wrong', 'The film does not breathe. Take the circuit out of the gas exchange first, then decide.', (p, s) => { s.sweep = 0; s.rpm = 1500; }],
          ['fdo2', 'Reduce the FdO2 to 0.5', 'poor', 'A partial step that leaves the CO2 removal in place; a clean sweep-off trial answers the question in one move.', (p, s) => { s.fdo2 = 0.5; }]] },
        { q: 'Four hours with the sweep off: PaO2 103, PaCO2 47, pH 7.34, respiratory rate 22, no distress, driving pressure 11. Next?', options: [
          ['decan2', 'Decannulate at the bedside (venous cannulas, pressure and a purse-string), stop the heparin an hour before, watch for bleeding and air', 'best', 'The trial is passed on protective settings: the lung carries the gas exchange. Venous decannulation is a bedside procedure; the sites are compressed and the patient watched. (The lab keeps the sweep-off state: it has no “off”.)', (p, s) => {}],
          ['back', 'Sweep back to 1 and repeat tomorrow', 'poor', 'A passed trial is the decision; another day on the circuit is another day of bleeding and infection risk.', (p, s) => { s.sweep = 1; }],
          ['hold', 'Leave the sweep off for another day', 'poor', 'A circuit running with no gas exchange is a clotting risk for no information; the trial is hours, not days.', (p, s) => {}],
          ['vent', 'Increase the PEEP to be safe before decannulation', 'wrong', 'The trial was passed at these settings; raising them hides the answer you just got.', (p, s) => { p.va = p.va + 1; }]] }
      ], done: 'The sweep-off trial: the circuit stays, its gas exchange stops, the lung shows what it can do. Then the cannulas come out.' }
  ];

  /* ================================================================== gas rounds (v8.7) ==================================================================
     The third way to use the lab: a patient and a set of gases arrive; the reader writes orders on the dials that can be ordered
     (the circuit's speed, sweep and FdO2; the ventilator; a transfusion, volume, sedation; the drips; a device or a procedure),
     sends the gases again and reads what the orders did, until the targets are met. Each case carries its targets, the pace it must
     respect, and an expert's sequence with the reasons. */
  const R_ORDERS = [
    ['rpm', 'Pump speed', 'rpm', 'Speed buys flow only while the drainage can supply it: watch the drainage pressure. On VV more flow means a larger share of the venous return is oxygenated; on VA it means more support and more afterload for the ventricle.'],
    ['sweep', 'Sweep gas', 'L/min', 'CO2 leaves across the membrane in proportion to the sweep: it moves the PaCO2 and the pH and almost nothing else.'],
    ['fdo2', 'FdO2', '', 'The FdO2 sets the PO2 of the blood leaving the membrane. Once that blood is saturated, more FdO2 adds dissolved oxygen only: the patient’s saturation follows the flow and the haemoglobin, not the blender.'],
    ['hb', 'Haemoglobin (transfuse)', 'g/dL', 'Each gram of haemoglobin carries 1.34 mL of oxygen per decilitre through the membrane: the same flow delivers more.'],
    ['vo2', 'Oxygen demand (sedate, cool, paralyse)', 'mL/min', 'A lower consumption raises the venous saturation, and on VV a brighter venous admixture raises the arterial saturation.'],
    ['fio2', 'Ventilator FiO2', '', 'Ventilator oxygen reaches only the blood that passes ventilated alveoli: it helps in proportion to the lung that is left.'],
    ['va', 'Ventilator: alveolar ventilation', 'L/min', 'Native alveolar ventilation shares the CO2 load with the membrane: it must be able to carry all of it before the sweep can come off.'],
    ['cvp', 'Volume (CVP)', 'mm Hg', 'Volume refills the veins the drainage cannula sits in: the drainage pressure rises toward zero and the line stops chattering. Diuresis does the reverse.']
  ];
  const R_ACTIONS = [
    { id: 'reposition', modes: ['vv'], label: 'Reposition the cannulas', tip: 'Under echo or fluoroscopy, pull the tips apart (or turn a dual-lumen cannula so its return port faces the tricuspid valve).', why: 'With the tips apart the drainage takes venous blood instead of the blood just returned: the pre-membrane saturation falls and the patient’s rises.', nothing: 'Imaged: the tips are already well apart — recirculation is not the problem here.', applies: (p, s) => s.recirc > 0.12, apply: (p, s) => { s.recirc = Math.min(s.recirc, 0.1); if (s.config === 'ff') s.config = 'fj'; } },
    { id: 'membrane', modes: ['vv', 'va'], label: 'Change the membrane lung', tip: 'A planned exchange with a primed circuit and the team at the bedside: a minute off support.', why: 'A new membrane restores the transfer: post-membrane PO2 back above 400 on an FdO2 of 1.0, ΔP back to baseline.', nothing: 'The membrane is transferring well (post-membrane PO2 high on pure oxygen, ΔP at baseline): an exchange would add risk for nothing.', applies: (p, s) => s.oxy < 0.95, apply: (p, s) => { s.oxy = 1; } },
    { id: 'kink', modes: ['vv', 'va'], label: 'Check and free the drainage line', tip: 'Walk the circuit from the cannula to the pump: a kink under the patient, a clamp left on, a tip against the vein wall.', why: 'An unobstructed line lets the same speed pull the flow without the suction.', nothing: 'Walked the circuit: the line is free from the cannula to the pump.', applies: (p, s) => !!s.kink, apply: (p, s) => { s.kink = false; } }
  ];
  const inR = (x, a, b) => x >= a && x <= b;
  const pct = (x) => Math.round(x * 100);
  const ROUNDS = [
    { id: 'r_alk', mode: 'vv', level: 1, title: 'Over-swept', who: 'Day 2 of VV ECMO for influenza ARDS, 70 kg. The night team turned the sweep up for a PaCO2 of 52. He is now sedated, ventilated at rest settings, flow 4.6 L/min — and these are the morning gases.',
      p: {}, s: { sweep: 5 }, par: 1,
      targets: [['pH 7.35–7.45', (o) => inR(o.ph, 7.345, 7.455), (o) => o.ph.toFixed(2)], ['PaCO2 35–45', (o) => inR(o.paco2, 34.5, 45.5), (o) => o.paco2.toFixed(0)], ['SaO2 ≥ 88%', (o) => o.spo2 >= 88, (o) => o.spo2 + '%']],
      expert: [['Sweep down from 5 to 2.5 L/min', (p, s) => { s.sweep = 2.5; }, 'A respiratory alkalosis made by the circuit: the only dial that needs to move is the sweep. An alkalosis this deep shifts the dissociation curve left, lowers ionised calcium and constricts the cerebral vessels.']],
      teach: ['The sweep is the CO2 dial; blood flow and FdO2 are the oxygen dials.', 'Halving the sweep roughly doubles the PaCO2 when the native lung is at rest and contributes little.'] },
    { id: 'r_co2', mode: 'vv', level: 2, title: 'Hypercapnia, and how fast to correct it', who: 'Just cannulated for status asthmaticus with a pH of 7.05 on the ventilator. Flow 4.6 L/min; the perfusionist started the sweep at 1 L/min. Bicarbonate 30 (two days of retention). First gases on the circuit:',
      p: { hco3: 30, va: 1.0 }, s: { sweep: 1 }, par: 2, pace: 20,
      targets: [['pH 7.35–7.45', (o) => inR(o.ph, 7.345, 7.455), (o) => o.ph.toFixed(2)], ['PaCO2 never falling more than 20 mm Hg between gases', (o, p, s, hist) => hist.every((h, i) => i === 0 || hist[i - 1].out.paco2 - h.out.paco2 <= 20.5), (o, p, s, hist) => hist.length > 1 ? 'largest fall ' + Math.max.apply(null, hist.map((h, i) => i === 0 ? 0 : hist[i - 1].out.paco2 - h.out.paco2)).toFixed(0) : '—'], ['SaO2 ≥ 88%', (o) => o.spo2 >= 88, (o) => o.spo2 + '%']],
      expert: [['Sweep from 1 to 1.5 L/min; gases in 30 minutes', (p, s) => { s.sweep = 1.5; }, 'A PaCO2 of 79 is brought down in steps. A fall of more than about half in the first day — and large falls within hours — is associated with intracranial haemorrhage and other neurological injury: the cerebral vessels constrict as fast as the CO2 leaves.'],
        ['Sweep to 2 L/min', (p, s) => { s.sweep = 2; }, 'With a bicarbonate of 30 the pH is normal at a PaCO2 near 50: titrate to the pH, not to 40. The kidney will give the bicarbonate back over days.']],
      teach: ['Titrate the sweep to the pH, in steps, with a gas after each.', 'A chronically retained bicarbonate means the target PaCO2 is not 40.'] },
    { id: 'r_fdo2', mode: 'va', level: 2, title: 'Fresh on VA: too much of everything', who: 'Peripheral VA ECMO two hours ago for cardiogenic shock after an anterior infarct. Flow 4.4 L/min, MAP 84, sweep 5 L/min and FdO2 1.0 as set at cannulation. Right radial and post-membrane gases:',
      p: { contr: 0.2, shunt: 0.25, cvp: 12 }, s: { sweep: 5, fdo2: 1 }, par: 1,
      targets: [['Right radial pH 7.35–7.45', (o) => inR(o.phRR, 7.345, 7.465), (o) => o.phRR.toFixed(2)], ['No arterial PaO2 above 300', (o) => Math.max(o.femO2, o.rrO2) <= 300, (o) => Math.max(o.femO2, o.rrO2).toFixed(0)], ['Right radial SaO2 ≥ 92%', (o) => o.rrSat >= 0.915, (o) => pct(o.rrSat) + '%'], ['MAP ≥ 65', (o) => o.map >= 65, (o) => String(o.map)]],
      expert: [['FdO2 from 1.0 to 0.6 and sweep from 5 to 2 L/min', (p, s) => { s.fdo2 = 0.6; s.sweep = 2; }, 'Blood leaving a new membrane on pure oxygen has a PO2 near 500, and on femoral VA it perfuses the lower body, and often the brain, directly. Hyperoxia after cardiac arrest and in shock is associated with worse outcomes; hypocapnia constricts the cerebral circulation. Blend the FdO2 down to a post-membrane PO2 under 300 and bring the sweep to a normal PaCO2.']],
      teach: ['On VA the FdO2 is titrated like a ventilator’s: to an arterial PaO2, not left at 1.0.', 'The sweep is never turned off on VA: unoxygenated blood would be pumped into the aorta.'] },
    { id: 'r_demand', mode: 'vv', level: 3, title: 'The saturation falls and the circuit has not changed', who: 'Day 6 of VV ECMO, pneumococcal ARDS. Overnight: temperature 39.4 °C, heart rate 128, new chest-tube bleeding with a haemoglobin of 7.5. Cardiac output by echo about 9.5 L/min. Circuit flow 4.2 L/min at 3,200 rpm, FdO2 1.0, membrane two days old.',
      p: { co: 9.5, vo2: 380, hb: 7.5 }, s: { rpm: 3200 }, par: 2,
      targets: [['SaO2 ≥ 88%', (o) => o.spo2 >= 88, (o) => o.spo2 + '%'], ['DO2 : VO2 ≥ 3', (o) => o.do2vo2 >= 2.95, (o) => o.do2vo2.toFixed(1)], ['Drainage pressure above −100', (o) => o.pump.pDrain > -100 && !o.pump.chatter, (o) => o.pump.pDrain.toFixed(0)]],
      expert: [['Lower the demand (antipyretic, deeper sedation: VO2 to 300) and transfuse to a haemoglobin of 9.5', (p, s) => { p.vo2 = 300; p.hb = 9.5; }, 'The membrane works: post-membrane PO2 485. The circuit processes 4.2 of a 9.5 L/min venous return, so more than half the blood reaches the aorta unoxygenated — and that blood is darker than yesterday because the consumption is up and the haemoglobin down. Treat the demand and the carrying capacity first.'],
        ['Then pump speed to 3,700 rpm', (p, s) => { s.rpm = 3700; }, 'More flow raises the share of the venous return the membrane sees. It is worth having only while the drainage pressure stays above −100 mm Hg.']],
      teach: ['On VV the arterial saturation is set by the ratio of circuit flow to cardiac output, the haemoglobin and the consumption — when the membrane is healthy.', 'The sweep and the FdO2 cannot fix this: the blood leaving the membrane is already saturated.'] },
    { id: 'r_recirc', mode: 'vv', level: 3, title: 'Bright drainage, dark patient', who: 'Femoro-femoral VV ECMO placed in the emergency department six hours ago. Flow 4.6 L/min, FdO2 1.0. The SpO2 has drifted from 94% to 86% since he was turned; the drainage limb looks nearly as red as the return.',
      p: {}, s: { config: 'ff', recirc: 0.45 }, par: 1,
      targets: [['SaO2 ≥ 90%', (o) => o.spo2 >= 90, (o) => o.spo2 + '%'], ['Pre-membrane saturation ≤ 75%', (o) => o.preSat <= 0.755, (o) => pct(o.preSat) + '%'], ['Drainage pressure above −100', (o) => o.pump.pDrain > -100, (o) => o.pump.pDrain.toFixed(0)]],
      expert: [['Reposition the cannulas (image the tips, pull them apart)', (p, s) => { s.recirc = 0.1; s.config = 'fj'; }, 'A pre-membrane saturation of 79% with a patient at 86% is recirculation: the drainage is taking back the blood just returned. More speed raises the recirculated fraction with the flow; the fix is the distance between the tips.']],
      teach: ['Recirculation: the pre-membrane saturation rises while the patient’s falls.', 'Suspect it after a turn, a cough, a change in volume status or a change in flow.'] },
    { id: 'r_membrane', mode: 'vv', level: 3, title: 'Day 14: the gases drift', who: 'Day 14 on the same circuit. Over two days the sweep has gone from 2.5 to 4 L/min for the same PaCO2, the ΔP from 30 to 90 mm Hg at an unchanged flow, the D-dimer has tripled. This morning the sweep is back at 2.5 after a nursing change and the gases are:',
      p: {}, s: { oxy: 0.45 }, par: 2,
      targets: [['Post-membrane PO2 > 300 on FdO2 1.0', (o, p, s) => o.postO2 > 300 || s.fdo2 < 0.95 && o.postSat > 0.99, (o) => o.postO2.toFixed(0)], ['SaO2 ≥ 88%', (o) => o.spo2 >= 88, (o) => o.spo2 + '%'], ['pH 7.35–7.45', (o) => inR(o.ph, 7.345, 7.455), (o) => o.ph.toFixed(2)]],
      expert: [['Bridge: sweep to 5 L/min and ventilator FiO2 to 0.8 while the new circuit is primed', (p, s) => { s.sweep = 5; p.fio2 = 0.8; }, 'A post-membrane PO2 of 61 on pure oxygen with a rising ΔP is a failing membrane. CO2 still crosses with more sweep, and the native lung can lend some oxygen for the hour it takes to prepare the exchange.'],
        ['Change the membrane lung; sweep back to 2.5, FiO2 to 0.4', (p, s) => { s.oxy = 1; s.sweep = 2.5; p.fio2 = 0.4; }, 'The new membrane transfers again: the post-membrane PO2 is back near 485 and the same sweep clears the CO2.']],
      teach: ['Judge a membrane by its post-membrane PO2 on an FdO2 of 1.0, its ΔP at a given flow, and the sweep it needs.', 'Plan the exchange in daylight.'] },
    { id: 'r_chatter', mode: 'vv', level: 2, title: 'The line shakes', who: 'Day 4. Net 3 litres negative since yesterday with furosemide; an hour ago the pump speed was raised from 3,400 to 3,800 rpm for an SpO2 of 88%. The drainage line is now swinging against the bed rail and the flow reads 2.8 L/min.',
      p: { cvp: 3 }, s: { rpm: 3800 }, par: 2,
      targets: [['A quiet line: no chatter', (o) => !o.pump.chatter, (o) => o.pump.chatter ? 'chatter' : 'quiet'], ['Flow ≥ 4 L/min', (o) => o.flow >= 3.95, (o) => o.flow.toFixed(1)], ['SaO2 ≥ 88%', (o) => o.spo2 >= 88, (o) => o.spo2 + '%']],
      expert: [['Pump speed down to 3,000 rpm', (p, s) => { s.rpm = 3000; }, 'The pump is asking for more than the emptied vena cava can give: the vein collapses on the cannula and reopens. More speed makes it worse and haemolyses; turning down stops the suction, and the flow often rises.'],
        ['Volume (CVP back to 8) and speed back to 3,400 rpm', (p, s) => { p.cvp = 8; s.rpm = 3400; }, 'With the veins refilled the same speed gives 4.6 L/min at a drainage pressure near −55. Then ask why the patient emptied.']],
      teach: ['Chatter is a drainage problem: turn the speed down first, then give back what is missing.', 'Flow that falls as the speed rises is suction, not support.'] },
    { id: 'r_wean', mode: 'vv', level: 4, title: 'Ready for the sweep-off trial?', who: 'Day 11. The chest film has cleared, compliance is 38 mL/cm H2O, he triggers the ventilator comfortably. Circuit flow 4.6 L/min, sweep 2, FdO2 0.6; the ventilator is still on rest settings (FiO2 0.4, alveolar ventilation about 1.5 L/min).',
      p: { shunt: 0.15, va: 1.5, fio2: 0.4, vo2: 250 }, s: { sweep: 2, fdo2: 0.6 }, par: 2,
      targets: [['Sweep gas off', (o, p, s) => s.sweep === 0, (o, p, s) => s.sweep + ' L/min'], ['pH 7.35–7.45', (o) => inR(o.ph, 7.345, 7.455), (o) => o.ph.toFixed(2)], ['SaO2 ≥ 92%', (o) => o.spo2 >= 92, (o) => o.spo2 + '%'], ['Ventilator FiO2 ≤ 0.5', (o, p) => p.fio2 <= 0.505, (o, p) => p.fio2.toFixed(2)]],
      expert: [['Ventilator to trial settings: alveolar ventilation 4.5 L/min, FiO2 0.5; sweep down to 0.5', (p, s) => { p.va = 4.5; p.fio2 = 0.5; s.sweep = 0.5; }, 'Before the gas comes off, the lung has to be given the work: settings a patient could be extubated from within a few days (plateau under 25–28, rate under 25–30, FiO2 0.5 or less).'],
        ['Sweep off; blood flow unchanged', (p, s) => { s.sweep = 0; }, 'With no sweep the membrane exchanges nothing: the blood leaves it as it entered, and the arterial gas is the native lung’s own. Hours of stable gases and work of breathing mean the cannulas can come out.']],
      teach: ['The VV trial takes the gas away and keeps the blood flow: nothing to clot, nothing to reverse.', 'Turn the sweep off only when the ventilator is already carrying the CO2.'] },
    { id: 'r_harlequin', mode: 'va', level: 4, title: 'A blue right hand', who: 'Day 5 of femoral VA ECMO for myocarditis with pulmonary oedema. The ventricle is recovering (pulse pressure 34 on dobutamine 5); the lungs are not. FdO2 0.6, ventilator FiO2 0.5. The saturation probe on the right hand reads 83%; the left foot reads 100%.',
      p: { contr: 0.6, shunt: 0.55, fio2: 0.5 }, s: { fdo2: 0.6, drugs: { dobu: 5 } }, par: 2,
      targets: [['Right radial SaO2 ≥ 90%', (o) => o.rrSat >= 0.895, (o) => pct(o.rrSat) + '%'], ['MAP ≥ 65', (o) => o.map >= 65, (o) => String(o.map)], ['No arterial PaO2 above 300', (o) => Math.max(o.femO2, o.rrO2) <= 300, (o) => Math.max(o.femO2, o.rrO2).toFixed(0)]],
      expert: [['Ventilator FiO2 to 1.0 (with PEEP and recruitment)', (p, s) => { p.fio2 = 1; }, 'The blood in the right arm, the coronaries and the brain is the heart’s own, and it passed through lungs that did not oxygenate it. Treat the lung first: it is the only oxygenator that blood will see.'],
        ['Pump speed to 4,000 rpm', (p, s) => { s.rpm = 4000; }, 'More circuit flow pushes the mixing zone back toward the arch and raises the venous saturation the native lung starts from. If the right hand stays blue: a return limb to the jugular vein (V-AV), or a change to VV if the heart has recovered.']],
      teach: ['Differential hypoxaemia needs three things: femoral VA, a recovering heart and failing lungs.', 'Sample and monitor on the right arm: it is the furthest from the circuit.'] },
    { id: 'r_distension', mode: 'va', level: 4, title: 'No pulse on the arterial line', who: 'Six hours after VA cannulation at 3,700 rpm for a massive anterior infarct. MAP 87 with a flat arterial trace, pink froth in the endotracheal tube, the echo shows a dilated left ventricle full of smoke and an aortic valve that does not open.',
      p: { contr: 0.08, cvp: 12, shunt: 0.3 }, s: { rpm: 3700, fdo2: 0.6 }, par: 1,
      targets: [['LVEDP ≤ 18 mm Hg', (o) => o.lvedp <= 18, (o) => String(o.lvedp)], ['Ventricle not distended', (o) => !o.distension, (o) => o.distension ? 'distended' : 'decompressed'], ['MAP ≥ 65', (o) => o.map >= 65, (o) => String(o.map)]],
      expert: [['Unload the ventricle: Impella (ECPELLA); pump speed down to 3,300 rpm', (p, s) => { s.unload = 'impella'; s.rpm = 3300; }, 'Retrograde flow is afterload a ventricle this weak cannot overcome: it fills from the bronchial and Thebesian return, cannot empty, and the pressure backs into the lung. A microaxial pump empties it across the valve; an inotrope and a lower circuit flow help a ventricle that is nearly opening its valve, a septostomy or surgical vent one that is not.']],
      teach: ['A pulse pressure under 10 mm Hg on VA: look at the valve and the ventricle today.', 'More circuit flow and more vasopressor both raise the afterload that caused it.'] }
  ];
  function round(id) { return ROUNDS.filter(c => c.id === id)[0] || null; }
  /* the patient and the circuit a case starts from */
  function roundStart(id) {
    const c = round(id); if (!c) return null;
    const p = Object.assign({}, PATIENT, c.mode === 'vv' ? VV_PATIENT : {}, c.p), s = Object.assign({}, SETTINGS[c.mode], c.s, { drugs: Object.assign({}, c.s.drugs || {}) });
    p.vco2 = Math.round(p.vo2 * 0.82);
    return { c: c, p: p, s: s };
  }
  /* one set of gases: the state it was drawn in and what the model returns */
  function roundDraw(p, s) { const pp = Object.assign({}, p, { vco2: Math.round(p.vo2 * 0.82) }), ss = Object.assign({}, s, { drugs: Object.assign({}, s.drugs || {}) }); return { p: pp, s: ss, out: run(pp, ss) }; }
  /* targets against the latest gases (hist = every draw so far, oldest first) */
  function roundCheck(c, hist) {
    const h = hist[hist.length - 1];
    return c.targets.map(t => ({ label: t[0], ok: !!t[1](h.out, h.p, h.s, hist), now: t[2](h.out, h.p, h.s, hist) }));
  }
  /* what the orders between two draws were */
  function roundOrders(a, b) {
    const out = [], f = (k, v) => k === 'fdo2' || k === 'fio2' ? (+v).toFixed(2) : String(+(+v).toFixed(2));
    R_ORDERS.forEach(r => { const src = (x) => (r[0] === 'rpm' || r[0] === 'sweep' || r[0] === 'fdo2') ? x.s[r[0]] : x.p[r[0]]; if (src(a) !== src(b)) out.push({ k: r[0], label: r[1].split(' (')[0], from: f(r[0], src(a)), to: f(r[0], src(b)), unit: r[2], why: r[3] }); });
    DRIPS.forEach(D => { const x = (a.s.drugs || {})[D.id] || 0, y = (b.s.drugs || {})[D.id] || 0; if (x !== y) out.push({ k: 'drip', label: D.name, from: x ? String(x) : 'off', to: y ? String(y) : 'off', unit: D.unit, why: 'Vasoactive drugs change the heart and the vessels, not the membrane: on VV a higher output makes the circuit a smaller share of it; on VA more ejection moves the mixing zone and opens the valve, more resistance closes it.' }); });
    if (a.s.unload !== b.s.unload) out.push({ k: 'unload', label: 'LV unloading', from: a.s.unload, to: b.s.unload, unit: '', why: 'Unloading empties the left ventricle: the end-diastolic pressure falls and the lung dries.' });
    if (!!a.s.dpc !== !!b.s.dpc) out.push({ k: 'dpc', label: 'Distal perfusion catheter', from: a.s.dpc ? 'in' : 'none', to: b.s.dpc ? 'in' : 'none', unit: '', why: 'The leg below a femoral arterial cannula needs its own antegrade flow.' });
    if (a.s.recirc - b.s.recirc > 0.05) out.push({ k: 'reposition', label: 'Cannulas repositioned', from: pct(a.s.recirc) + '% recirculation', to: pct(b.s.recirc) + '%', unit: '', why: R_ACTIONS[0].why });
    if (b.s.oxy - a.s.oxy > 0.05) out.push({ k: 'membrane', label: 'Membrane lung changed', from: 'failing', to: 'new', unit: '', why: R_ACTIONS[1].why });
    if (a.s.kink && !b.s.kink) out.push({ k: 'kink', label: 'Drainage line freed', from: 'kinked', to: 'free', unit: '', why: R_ACTIONS[2].why });
    return out;
  }
  /* what a draw should make the reader stop at: the pace of the CO2, an alkalosis, suction, hyperoxia, a sweep turned off on VA */
  function roundHazards(c, prev, cur) {
    const o = cur.out, a = [], vv = o.mode === 'vv', pa = vv ? o.paco2 : o.paco2RR, ph = vv ? o.ph : o.phRR;
    if (prev) { const p0 = prev.out.mode === 'vv' ? prev.out.paco2 : prev.out.paco2RR; if (p0 - pa > 20.5 && p0 > 50) a.push('PaCO2 fell ' + (p0 - pa).toFixed(0) + ' mm Hg between two gases (' + p0.toFixed(0) + ' → ' + pa.toFixed(0) + '). Rapid correction of hypercapnia on ECMO is associated with intracranial bleeding and neurological injury: step the sweep, with a gas after each step.'); }
    if (ph > 7.5) a.push('pH ' + ph.toFixed(2) + ': a respiratory alkalosis made by the sweep. Turn it down.');
    if (ph < 7.2) a.push('pH ' + ph.toFixed(2) + ': the CO2 is not being cleared — by the membrane or by the lung.');
    if (!vv && cur.s.sweep <= 0) a.push('The sweep is off on VA ECMO: the pump is now sending venous blood into the aorta. Never zero on VA — wean the flow instead.');
    if (o.pump.pDrain < -100) a.push('Drainage pressure ' + o.pump.pDrain.toFixed(0) + ' mm Hg: suction beyond −100 haemolyses and cavitates. The speed is asking for more than the drainage can give.');
    else if (o.pump.chatter && prev && cur.s.rpm > prev.s.rpm) a.push('More speed against a collapsing vein: the line still chatters and the flow has not risen.');
    if (!vv && Math.max(o.femO2, o.rrO2) > 300) a.push('Arterial PaO2 ' + Math.max(o.femO2, o.rrO2).toFixed(0) + ' mm Hg: hyperoxia. Blend the FdO2 down.');
    if (vv && o.spo2 < 80) a.push('SaO2 ' + o.spo2 + '%: below what the tissues will tolerate for long — look at the DO2 : VO2 and the lactate.');
    if (!vv && o.rrSat < 0.8) a.push('Right radial saturation ' + pct(o.rrSat) + '%: the brain and the coronaries are receiving this blood.');
    if (o.map < 55) a.push('MAP ' + o.map + ' mm Hg.');
    if (prev && cur.p.hb > 10.05 && cur.p.hb > prev.p.hb) a.push('Haemoglobin ' + cur.p.hb + ' g/dL: transfusion beyond about 10 buys little delivery for its risks.');
    return a;
  }
  /* the flowsheet: what a set of gases shows, row by row; flag = out of range */
  function roundRows(mode) {
    const f0 = (x) => x.toFixed(0), f1 = (x) => x.toFixed(1), f2 = (x) => x.toFixed(2);
    return mode === 'vv' ? [
      ['Arterial', null],
      ['pH', (h) => f2(h.out.ph), (h) => h.out.ph < 7.345 || h.out.ph > 7.455], ['PaCO2', (h) => f0(h.out.paco2), (h) => h.out.paco2 < 34.5 || h.out.paco2 > 50.5], ['PaO2', (h) => f0(h.out.pao2), (h) => h.out.pao2 < 55], ['SaO2', (h) => h.out.spo2 + '%', (h) => h.out.spo2 < 88],
      ['Circuit', null],
      ['Pre-membrane SO2', (h) => pct(h.out.preSat) + '%', (h) => h.out.preSat > 0.755 && h.out.recirc > 0.2], ['Post-membrane PO2', (h) => f0(h.out.postO2), (h) => h.s.sweep > 0 && h.s.fdo2 >= 0.9 && h.out.postO2 < 200], ['Flow, L/min', (h) => f1(h.out.flow), (h) => h.out.pump.chatter], ['Drainage pressure', (h) => f0(h.out.pump.pDrain), (h) => h.out.pump.pDrain < -100], ['ΔP membrane', (h) => f0(h.out.pump.dP), (h) => h.out.pump.dP > 60],
      ['Delivery', null],
      ['SvO2', (h) => pct(h.out.svo2) + '%', (h) => h.out.svo2 < 0.55], ['DO2 : VO2', (h) => f1(h.out.do2vo2), (h) => h.out.do2vo2 < 2.5], ['Lactate', (h) => h.out.lactate, (h) => h.out.lactate === 'rising'], ['MAP', (h) => String(h.out.map), (h) => h.out.map < 60]
    ] : [
      ['Right radial', null],
      ['pH', (h) => f2(h.out.phRR), (h) => h.out.phRR < 7.345 || h.out.phRR > 7.465], ['PaCO2', (h) => f0(h.out.paco2RR), (h) => h.out.paco2RR < 34.5 || h.out.paco2RR > 50.5], ['PaO2', (h) => f0(h.out.rrO2), (h) => h.out.rrO2 < 60 || h.out.rrO2 > 300], ['SaO2', (h) => pct(h.out.rrSat) + '%', (h) => h.out.rrSat < 0.895],
      ['Circuit', null],
      ['Femoral PaO2', (h) => f0(h.out.femO2), (h) => h.out.femO2 > 300], ['Post-membrane PO2', (h) => f0(h.out.postO2), (h) => h.s.sweep > 0 && h.s.fdo2 >= 0.9 && h.out.postO2 < 200], ['Flow, L/min', (h) => f1(h.out.flow), (h) => h.out.pump.chatter], ['Drainage pressure', (h) => f0(h.out.pump.pDrain), (h) => h.out.pump.pDrain < -100],
      ['Heart and delivery', null],
      ['MAP', (h) => String(h.out.map), (h) => h.out.map < 60], ['Pulse pressure', (h) => String(h.out.pp), (h) => h.out.pp < 10], ['LVEDP', (h) => String(h.out.lvedp), (h) => h.out.lvedp > 18], ['Aortic valve', (h) => h.out.avOpens ? 'opens' : 'closed', (h) => !h.out.avOpens], ['SvO2', (h) => pct(h.out.svo2) + '%', (h) => h.out.svo2 < 0.55], ['Lactate', (h) => h.out.lactate, (h) => h.out.lactate === 'rising']
    ];
  }
  /* an expert's whole sequence, as draws (for the reveal and for the tests) */
  function roundExpert(id) {
    const st = roundStart(id); if (!st) return [];
    const hist = [roundDraw(st.p, st.s)];
    st.c.expert.forEach(e => { const last = hist[hist.length - 1], p = Object.assign({}, last.p), s = Object.assign({}, last.s, { drugs: Object.assign({}, last.s.drugs) }); e[1](p, s); hist.push(roundDraw(p, s)); });
    return hist;
  }

  root.PFT_ECMO = { topics: T, groups: GROUPS, CONFIGS: CONFIGS, DRAIN: DRAIN, RETURN: RETURN, PATIENT: PATIENT, SETTINGS: SETTINGS, PRESETS: PRESETS, preset: preset, DRIPS: DRIPS, vasoactive: vasoactive, applyDrugs: applyDrugs, SCENARIOS: SCENARIOS, LABCASES: LABCASES, run: run, runVV: runVV, runVA: runVA, pump: pump, membrane: membrane, alarms: alarms, ROUNDS: ROUNDS, R_ORDERS: R_ORDERS, R_ACTIONS: R_ACTIONS, round: round, roundStart: roundStart, roundDraw: roundDraw, roundCheck: roundCheck, roundOrders: roundOrders, roundHazards: roundHazards, roundRows: roundRows, roundExpert: roundExpert, satOf: satOf, po2Of: po2Of, content: content, po2FromContent: po2FromContent, BRANCH: BRANCH };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PFT_ECMO;
})(typeof window !== 'undefined' ? window : globalThis);
