/* ------------------------------------------------------------------ the Campbell / Guyton model (heart–lung interaction)
   A teaching model, after Kenny JE, An Approach to Mechanical Heart-Lung Interaction (2020, CC): the Campbell diagram
   (lung volume against pleural pressure: the static lung and chest wall curves, the dynamic loop of a breath, the work
   of breathing) joined to the Guyton diagram (venous return against cardiac function) through the one variable they
   share, the pressure around the heart. Numbers are typical adult ones and the shapes are the textbook ones; the point
   is the direction things move, not a patient's values. Pure functions: usable in node for the tests. */
(function (root) {
  'use strict';
  const CMH2O = 0.7355;   // mm Hg per cm H2O
  /* default parameters */
  const DEF = {
    mode: 'spont',       // 'spont' (muscles drive the breath) or 'vent' (a passive, volume-targeted breath)
    cl: 1,               // lung compliance, multiple of normal (200 mL/cm H2O at FRC)
    ccw: 1,              // chest wall compliance, multiple of normal (150 mL/cm H2O)
    cwShift: 0,          // cm H2O the chest wall curve is pushed rightward (obesity, ascites: more pleural pressure at any volume)
    raw: 2,              // airway resistance, cm H2O/(L/s) (normal 1–3; 10–25 in an exacerbation)
    vt: 12,              // tidal volume, % of vital capacity (12% of 4.5 L ≈ 540 mL)
    rr: 14,              // breaths/min
    peep: 0,             // set PEEP (ventilator) or CPAP (spontaneous), cm H2O
    pms: 8,              // mean systemic filling pressure, mm Hg (volume status)
    contr: 1,            // contractility, multiple of normal
    pvr: 1,              // pulmonary vascular tone, multiple of normal (hypoxia, embolism, pulmonary hypertension)
    vc: 4.5              // vital capacity, L (to turn % VC into litres)
  };
  /* ---- static curves (volume in % VC above RV; pressures in cm H2O) ---- */
  // transpulmonary pressure the lung needs to hold a volume: V = 100·(1 − e^(−Ptp/τ)), τ = 11.6 at normal compliance
  function ptpOf(V, p) { const tau = 11.6 / p.cl; const f = Math.min(0.995, Math.max(0.0005, V / 100)); return -tau * Math.log(1 - f); }
  function lungPpl(V, p) { return -ptpOf(V, p); }   // the static lung curve on the Campbell diagram (Palv = 0)
  // the passive chest wall: zero at its own equilibrium (about 60% VC), sigmoid about it
  function cwPpl(V, p) { const d = V - 60; return (0.2 * d * (1 + (d / 45) * (d / 45))) / p.ccw + p.cwShift; }
  // the respiratory system as the ventilator sees it (Rahn): Paw = Ptp + Pcw
  function rsPaw(V, p) { return ptpOf(V, p) + cwPpl(V, p); }
  function solve(f, lo, hi) { let a = lo, b = hi, fa = f(a); for (let i = 0; i < 48; i++) { const m = (a + b) / 2, fm = f(m); if ((fm < 0) === (fa < 0)) { a = m; fa = fm; } else b = m; } return (a + b) / 2; }
  function frcOf(p) { return solve(V => cwPpl(V, p) - lungPpl(V, p), 0.5, 99); }
  // compliances at a volume (mL/cm H2O), for the readouts
  function clAt(V, p) { const h = 0.5; return (h * 2) / (ptpOf(V + h, p) - ptpOf(V - h, p)) * p.vc * 10; }
  function ccwAt(V, p) { const h = 0.5; return (h * 2) / (cwPpl(V + h, p) - cwPpl(V - h, p)) * p.vc * 10; }
  function crsAt(V, p) { const h = 0.5; return (h * 2) / (rsPaw(V + h, p) - rsPaw(V - h, p)) * p.vc * 10; }
  /* ---- the breath: end-expiratory volume, auto-PEEP, the loop ---- */
  function breath(p) {
    const frc = frcOf(p), T = 60 / p.rr, ti = T / 3, te = T - ti;
    const vtL = p.vt / 100 * p.vc;
    // passive emptying follows a time constant τ = R·Crs; with a short expiratory time the lung does not get back to its rest volume
    const crs = crsAt(frc + p.vt / 2, p) / 1000;   // L/cm H2O
    const tau = p.raw * crs;
    // the resting volume the set PEEP (or CPAP) holds the system at
    const rest = p.peep > 0 ? solve(V => rsPaw(V, p) - p.peep, frc, 99.5) : frc;
    const e = Math.exp(-te / tau), trapped = e > 1e-6 ? Math.min(60, (p.vt * e) / (1 - e)) : 0;
    const vee = Math.min(96, rest + trapped);                     // end-expiratory volume, % VC
    const autoPeep = Math.max(0, rsPaw(vee, p) - p.peep);        // alveolar pressure left at end-expiration, above the set PEEP
    const vei = Math.min(99, vee + p.vt);
    const pts = [];
    const N = 60;
    for (let i = 0; i <= N; i++) {   // inspiration: a half-sine flow profile
      const u = i / N, V = vee + p.vt * (1 - Math.cos(Math.PI * u)) / 2, flow = (vtL * Math.PI / (2 * ti)) * Math.sin(Math.PI * u);
      pts.push(point(V, flow, u * ti, 'in', p, u, autoPeep));
    }
    for (let i = 1; i <= N; i++) {   // expiration: exponential emptying toward the rest volume, cut off by the next breath
      const t = i / N * te, V = rest + (vei - rest) * Math.exp(-t / tau), flow = -((vei - rest) / 100 * p.vc) / tau * Math.exp(-t / tau);
      pts.push(point(V, flow, ti + t, 'ex', p, i / N, autoPeep));
    }
    // work per breath (J): the loop against the static curves. elastic = area between the lung and chest wall curves over the tidal range
    const dv = (vei - vee) / 40, lPerPct = p.vc / 100;
    let wEl = 0, wRes = 0;
    for (let k = 0; k < 40; k++) {
      const V = vee + dv * (k + 0.5);
      wEl += Math.max(0, cwPpl(V, p) - lungPpl(V, p) - (p.mode === 'spont' ? p.peep : 0)) * dv * lPerPct;   // cm H2O · L (CPAP carries part of the elastic load)
    }
    for (let i = 1; i <= N; i++) { const a = pts[i - 1], b = pts[i]; wRes += Math.abs(a.pres) * (b.V - a.V) * lPerPct; }   // the resistive part of the inspiratory limb
    const J = 0.0981;   // 1 cm H2O · L = 0.0981 J
    const pmus = p.mode === 'spont' ? Math.max(0, cwPpl(vei, p) - lungPpl(vei, p) + autoPeep - p.peep) : 0;
    return { frc: frc, rest: rest, vee: vee, vei: vei, autoPeep: autoPeep, tau: tau, ti: ti, te: te, T: T, pts: pts, wEl: wEl * J, wRes: wRes * J, pmus: pmus, cl: clAt(vee + p.vt / 2, p), ccw: ccwAt(vee + p.vt / 2, p), crs: crs * 1000, trapped: trapped };
  }
  /* one instant of the breath: where the pleural (and airway) pressure sits */
  function point(V, flow, t, phase, p, u, ap) {
    const pres = p.raw * flow;                     // resistive pressure, cm H2O (positive on inspiration)
    let ppl, paw, palv;
    if (p.mode === 'spont') {
      paw = p.peep;                                // CPAP at the mouth lifts the whole picture
      if (phase === 'in') {
        // the muscles pull the pleural pressure below the static lung curve by the resistive pressure; any auto-PEEP must be
        // pulled down first (a threshold load, spent over the first part of inspiration)
        palv = -pres + p.peep + ap * Math.max(0, 1 - 4 * u); ppl = palv - ptpOf(V, p);
      } else {
        // expiration: the inspiratory muscles let go over the first part of it (post-inspiratory braking), then the chest is passive
        // and the pleural pressure sits on the chest wall curve; the recoil of the system drives the flow
        const f = 0.45 + 0.55 * Math.min(1, u * 1.6);
        const lungSide = -ptpOf(V, p) + p.peep, cwSide = cwPpl(V, p);
        ppl = lungSide + f * (cwSide - lungSide); palv = ptpOf(V, p) + ppl;
      }
    } else {
      // passive: the pleural pressure follows the chest wall; the ventilator supplies the transpulmonary and the resistive pressure
      ppl = cwPpl(V, p);
      palv = ptpOf(V, p) + ppl;
      paw = palv + pres;
    }
    return { V: V, flow: flow, t: t, phase: phase, ppl: ppl, palv: palv, paw: paw, pres: pres };
  }
  /* ---- the circulation (mm Hg, L/min) ---- */
  function circ(V, ppl, p, br) {
    const pplMm = ppl * CMH2O;
    // the pressure around the heart is the pleural pressure; the heart fills by Pra − Ppl (transmural)
    const frc = br ? br.frc : frcOf(p);
    // pulmonary vascular resistance is lowest at FRC and rises either side of it (alveolar vessels squeezed at high volume, extra-alveolar at low)
    const d = (V - frc) / 40, fpvr = p.pvr * (1 + 0.6 * d * d);
    // mean systemic pressure: volume status, lifted a little by the diaphragm pressing on the abdomen and by any pressure the ventilator leaves in the chest
    const pms = p.pms + 0.012 * Math.max(0, V - frc) + Math.max(0, (p.mode === 'vent' ? pplMm - (-5 * CMH2O) : 0)) * 0.8;
    const pcrit = 0 + 0.03 * Math.max(0, V - frc) * CMH2O + Math.max(0, (p.mode === 'vent' ? pplMm - (-5 * CMH2O) : 0)) * 0.8;   // the great veins collapse when Pra falls below the pressure around them
    const rvr = 1.2;
    const vr = (pra) => (Math.max(pcrit, pra) >= pms ? 0 : (pms - Math.max(pcrit, pra)) / rvr);
    const k = 4 * Math.sqrt(fpvr), coMax = 6.4 * p.contr / Math.sqrt(fpvr);
    const cf = (pra) => { const ptm = pra - pplMm; return ptm <= 0 ? 0 : coMax * (1 - Math.exp(-ptm / k)); };
    // the operating point: where what returns equals what the heart puts out
    const pra = solve(x => cf(x) - vr(x), pplMm - 0.001, Math.max(pplMm + 0.01, pms));
    const co = cf(pra);
    return { pplMm: pplMm, pms: pms, pcrit: pcrit, rvr: rvr, fpvr: fpvr, k: k, coMax: coMax, pra: pra, co: co, ptm: pra - pplMm, vr: vr, cf: cf };
  }
  /* the whole cycle: the loop with the circulation at every point */
  function run(opts) {
    const p = Object.assign({}, DEF, opts || {});
    const br = breath(p);
    const cyc = br.pts.map(pt => { const c = circ(pt.V, pt.ppl, p, br); return Object.assign({}, pt, { pra: c.pra, co: c.co, ptm: c.ptm, pms: c.pms, pcrit: c.pcrit }); });
    const cos = cyc.map(x => x.co), coMax = Math.max.apply(null, cos), coMin = Math.min.apply(null, cos);
    const atRest = circ(br.vee, cyc[0].ppl, p, br), atTop = circ(br.vei, cyc[60].ppl, p, br);
    return { p: p, br: br, cyc: cyc, rest: atRest, top: atTop, coMean: cos.reduce((a, b) => a + b, 0) / cos.length, coVar: coMax > 0 ? (coMax - coMin) / ((coMax + coMin) / 2) : 0 };
  }
  const PRESETS = [
    { id: 'normal', name: 'Normal', set: {} },
    { id: 'copd', name: 'COPD exacerbation (hyperinflation, auto-PEEP)', set: { cl: 1.6, raw: 14, rr: 24, vt: 10 } },
    { id: 'asthma', name: 'Acute asthma', set: { raw: 20, rr: 26, vt: 10 } },
    { id: 'oedema', name: 'Cardiogenic pulmonary oedema', set: { cl: 0.45, raw: 5, rr: 28, vt: 8, pms: 12, contr: 0.55 } },
    { id: 'ards', name: 'ARDS, ventilated with PEEP 10', set: { mode: 'vent', cl: 0.4, raw: 4, peep: 10, vt: 9, rr: 24 } },
    { id: 'obese', name: 'Obesity / tense ascites', set: { ccw: 0.55, cwShift: 5, vt: 9, rr: 20 } },
    { id: 'hypo', name: 'Hypovolaemia', set: { pms: 5.5 } },
    { id: 'rvf', name: 'Pulmonary hypertension / RV strain', set: { pvr: 2.4, contr: 0.8 } },
    { id: 'ventnorm', name: 'Ventilated, normal lungs, PEEP 5', set: { mode: 'vent', peep: 5, vt: 10, rr: 14 } }
  ];
  root.PFT_HL = { DEF: DEF, PRESETS: PRESETS, CMH2O: CMH2O, ptpOf: ptpOf, lungPpl: lungPpl, cwPpl: cwPpl, rsPaw: rsPaw, frcOf: frcOf, breath: breath, circ: circ, run: run, clAt: clAt, ccwAt: ccwAt, crsAt: crsAt };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PFT_HL;
})(typeof window !== 'undefined' ? window : globalThis);
