/* The pressure waveforms of invasive monitoring (v8.8): one engine for the arterial line, the CVP, the right ventricle, the pulmonary artery and the
   wedge, with the ECG that times them. Everything is laid out in seconds, not in fractions of the cycle, so that systole keeps its length when the
   heart rate changes and diastole takes the difference:
     · electromechanical delay (R wave to the opening of the semilunar valves, the pre-ejection period) about 90 ms;
     · ejection time from Weissler's regression, LVET = 413 − 1.7·HR ms; the right ventricle ejects a little longer;
     · the pulse reaches the femoral artery about 45 ms, the radial about 85 ms and the dorsalis pedis about 150 ms after the aortic root;
     · going distally the upstroke steepens, the systolic peak rises, the notch comes later and lower, and the mean pressure barely changes;
     · atrial events: the a wave about 100 ms after the start of the P wave, c at the end of the QRS, x in mid-systole, v at the end of the
       T wave, y after it; in the wedge the same left atrial events arrive about 140 ms late.
   The numbers were checked against real recordings (wave_real.js; tests/waves.test.js): a radial trace at 68 /min has an upstroke of about
   160 ms, its notch about 370 ms after the foot at about 0.42 of the pulse pressure, and (mean − diastolic)/pulse pressure about 0.40; a
   pulmonary artery trace has a slower, rounder upstroke (about 210 ms) and a high notch (about 0.6); in one patient the pulmonary artery
   upstroke follows the R wave by about 90 ms and the radial one by about 175 ms.
   Sources: Weissler AM, et al. Circulation 1968;37:149. O'Rourke MF, Pauca A, Jiang XJ. Br J Clin Pharmacol 2001;51:507. Mark JB. Atlas of
   Cardiovascular Monitoring, 1998. Pittman JAL, Ping JS, Mark JB. Int Anesthesiol Clin 2004;42:13. Magder S. Crit Care Med 2006;34:2224.
   Gardner RM. Anesthesiology 1981;54:227. Trost JC, Hillis LD. Am J Cardiol 2006;97:1391 (balloon pump). */
(function (root) {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const g = (x, c, w) => { const u = (x - c) / w; return Math.exp(-u * u); };
  const ag = (x, c, wl, wr) => g(x, c, x < c ? wl : wr);

  /* a monotone cubic through points [[x, y], …] (Fritsch–Carlson); the slope at either end can be given */
  function pchip(pts, m0, m1) {
    const n = pts.length, x = pts.map(p => p[0]), y = pts.map(p => p[1]), h = [], d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) { h.push(x[i + 1] - x[i]); d.push((y[i + 1] - y[i]) / h[i]); }
    m[0] = m0 === undefined ? d[0] : m0; m[n - 1] = m1 === undefined ? d[n - 2] : m1;
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
    }
    return function (q) {
      if (q <= x[0]) return y[0]; if (q >= x[n - 1]) return y[n - 1];
      let i = 0; while (i < n - 2 && q > x[i + 1]) i++;
      const t = (q - x[i]) / h[i], t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * y[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * y[i + 1] + (t3 - t2) * h[i] * m[i + 1];
    };
  }

  /* ---------------------------------------------------------------- timing */
  function timing(hr, o) {
    o = o || {}; const T = 60 / hr;
    const lvet = clamp((0.413 - 0.0017 * hr) * (o.lvetK || 1), 0.15, Math.min(0.40, T - 0.2));
    return { T: T, hr: hr, pep: o.pep || 0.09, lvet: lvet, rvet: lvet + 0.05, qt: clamp(0.39 * Math.sqrt(T), 0.24, 0.5), pr: o.pr || 0.16 };
  }

  /* ---------------------------------------------------------------- the arterial tree */
  /* delay: after the aortic root (s); up: foot to peak (s); amp: pulse pressure relative to the radial; lag: how much later than the end of
     ejection the notch arrives; hn: the notch as a fraction of the pulse pressure; dw: the dicrotic wave; nw: how sharp the notch is (s) */
  const SITES = {
    aorta: { label: 'Aortic root', short: 'Aorta', delay: 0, up: 0.125, amp: 0.80, lag: 0, hn: 0.64, dw: 0.03, nw: 0.014 },
    axillary: { label: 'Axillary artery', short: 'Axillary', delay: 0.03, up: 0.12, amp: 0.88, lag: 0.012, hn: 0.56, dw: 0.045, nw: 0.02 },
    femoral: { label: 'Femoral artery', short: 'Femoral', delay: 0.045, up: 0.12, amp: 0.92, lag: 0.018, hn: 0.52, dw: 0.05, nw: 0.022 },
    radial: { label: 'Radial artery', short: 'Radial', delay: 0.085, up: 0.14, amp: 1, lag: 0.04, hn: 0.44, dw: 0.075, nw: 0.028 },
    dp: { label: 'Dorsalis pedis', short: 'Foot', delay: 0.15, up: 0.11, amp: 1.1, lag: 0.065, hn: 0.3, dw: 0.1, nw: 0.034 }
  };

  /* the shapes: how systole is drawn between the foot and the notch ([fraction of foot→notch, height]), and how diastole runs off */
  const SHAPES = {
    normal: {},
    stiff: { sys: [[0.3, 0.86], [0.58, 1], [0.8, 0.86]], hnK: 1.3, dwK: 0.4, k: 1.2, upK: 1 },                       // an early shoulder, then the reflected wave makes the peak
    vasodilated: { upK: 0.85, hnK: 0.42, dwK: 1.7, k: 2.6, sys: [[0.3, 1], [0.6, 0.62], [0.85, 0.3]] },                 // sepsis: a narrow spike, a low notch, a big dicrotic wave
    lowsv: { upK: 1.15, hnK: 0.8, dwK: 1.5, k: 1.5, sys: [[0.36, 1], [0.7, 0.66]] },                                    // a small, narrow pulse with a dicrotic wave
    as: { sys: [[0.2, 0.42], [0.3, 0.47], [0.72, 1], [0.92, 0.9]], hnK: 1.7, dwK: 0.15, k: 1.3 },                        // anacrotic shoulder, slow late peak
    ar: { upK: 0.7, sys: [[0.24, 1], [0.42, 0.84], [0.6, 0.97], [0.86, 0.5]], hnK: 0.4, dwK: 0.3, k: 3.2 },             // bisferiens, a collapsing run-off
    hocm: { upK: 0.6, sys: [[0.2, 1], [0.44, 0.58], [0.7, 0.76], [0.9, 0.6]], hnK: 0.9, dwK: 0.8, k: 1.6 }               // spike and dome
  };

  function artCtx(cfg) {
    const site = SITES[cfg.site || 'radial'] || SITES.radial, ref = SITES[cfg.refSite || 'radial'] || SITES.radial, sh = SHAPES[cfg.shape || 'normal'] || SHAPES.normal;
    const tm = timing(cfg.hr || 80, cfg), T = tm.T;
    const tn = Math.min(tm.lvet + site.lag, T - 0.1), hn = clamp(site.hn * (sh.hnK || 1), 0.06, 0.9), dw = clamp(site.dw * (sh.dwK === undefined ? 1 : sh.dwK), 0, 0.3);
    const hd = hn + dw, k = sh.k || 1.9, tau = (T - tn) / k, cinf = hd / (Math.exp(k) - 1), tu = Math.min(site.up * (sh.upK || 1), tn * 0.6);
    let pts;
    if (sh.sys) pts = [[0, 0], [0.22 * sh.sys[0][0] * tn, 0.1 * sh.sys[0][1]], [0.6 * sh.sys[0][0] * tn, 0.62 * sh.sys[0][1]]].concat(sh.sys.map(p => [p[0] * tn, p[1]]), [[tn, hn]]);
    else { const d = tn - tu; pts = [[0, 0], [0.22 * tu, 0.1], [0.55 * tu, 0.6], [0.85 * tu, 0.94], [tu, 1], [tu + 0.3 * d, 1 - 0.2 * (1 - hn)], [tu + 0.65 * d, 1 - 0.62 * (1 - hn)], [tn, hn]]; }
    const slopeEnd = -(hd + cinf) / tau, sys = pchip(pts, 0, slopeEnd);
    /* the form factor of the nominal beat, for the conversion between sites at one mean pressure */
    return { site: site, ref: ref, tm: tm, T: T, tn: tn, tu: pts.reduce((b, p) => p[1] > b[1] ? p : b, [0, 0])[0], hn: hn, dw: dw, hd: hd, k: k, tau: tau, cinf: cinf, sys: sys, nw: site.nw, delay: site.delay };
  }
  /* one beat, normalised: 0 at the foot, 1 at the peak; tauS = seconds since the foot. foot0 lets a beat start above or below the usual
     diastolic level (irregular rhythms); amp scales the pulse. Returns the pressure in units of the nominal pulse pressure above diastolic. */
  function artBeat(c, tauS, amp, foot0) {
    amp = amp === undefined ? 1 : amp; foot0 = foot0 || 0;
    if (tauS <= c.tn) return foot0 + amp * c.sys(tauS);
    const e = Math.exp(-(tauS - c.tn) / c.tau);
    return -c.cinf + (foot0 + c.hd * amp + c.cinf) * e - c.dw * amp * g(tauS, c.tn, c.nw);
  }
  function formFactor(c) { let s = 0; const n = 400; for (let i = 0; i < n; i++) s += artBeat(c, (i + 0.5) * c.T / n); return s / n; }
  const ffCache = {};
  /* the systolic and diastolic pressure at a site, given them at the reference site (the mean is kept; the pulse pressure is scaled) */
  function siteNumbers(cfg) {
    const key = [cfg.site || 'radial', cfg.refSite || 'radial', cfg.shape || 'normal', cfg.hr || 80, cfg.lvetK || 1].join('|');
    let f = ffCache[key];
    if (!f) { const c = artCtx(cfg), cr = artCtx(Object.assign({}, cfg, { site: cfg.refSite || 'radial' })); f = ffCache[key] = { ff: formFactor(c), ffRef: formFactor(cr), ratio: c.site.amp / cr.site.amp }; }
    const ppRef = cfg.sbp - cfg.dbp, map = cfg.dbp + f.ffRef * ppRef - (cfg.mapDrop || 0), pp = ppRef * f.ratio, dbp = map - f.ff * pp;
    return { sbp: dbp + pp, dbp: dbp, map: map, pp: pp };
  }

  /* ---------------------------------------------------------------- the breath */
  /* 0 at end-expiration, 1 at end-inspiration: inspiration is a third of the breath */
  function respAt(t, rr) { const Tb = 60 / (rr || 16); let ph = (t / Tb) % 1; if (ph < 0) ph += 1; const ti = 0.36; return ph < ti ? 0.5 - 0.5 * Math.cos(Math.PI * ph / ti) : Math.exp(-(ph - ti) / 0.16) * (1 - (ph - ti) / (1 - ti) * 0.12) * (ph > 0.97 ? (1 - ph) / 0.03 : 1); }

  /* ---------------------------------------------------------------- rhythm: the beats of a strip */
  function rng(seed) { let s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  /* returns { v: [{ tR, rr (to the next), wide, scale, pr (or null) }], a: [times of P-wave onset] } covering [-2, dur + 2] */
  function beats(cfg, dur) {
    const hr = cfg.hr || 80, T = 60 / hr, rh = cfg.rhythm || 'sinus', pr = cfg.pr || 0.16, v = [], a = [], r = rng(cfg.seed || 7);
    const t0 = -3 * T + 0.3 * T, end = dur + 3;
    if (rh === 'af') { let t = t0; while (t < end) { const rr = T * (0.55 + 0.9 * r()); v.push({ tR: t, rr: rr }); t += rr; } }
    else if (rh === 'pvc' || rh === 'bigeminy') {
      const every = rh === 'bigeminy' ? 2 : (cfg.every || 4); let t = t0, i = 0;
      while (t < end) {
        if (i % every === every - 1) { const tp = t - T + (cfg.coupling || 0.55) * T; v.push({ tR: tp, wide: true, pvc: true, pr: null }); a.push(t - pr); }   // the sinus P still fires, on a closed valve
        else { v.push({ tR: t, pr: pr }); a.push(t - pr); }
        t += T; i++;
      }
      v.sort((p, q) => p.tR - q.tR);
    }
    else if (rh === 'chb') { const Tv = 60 / (cfg.vr || 38), Ta = 60 / (cfg.ar || 84); for (let t = t0; t < end; t += Tv) v.push({ tR: t, wide: true, pr: null }); for (let t = t0 + 0.11; t < end; t += Ta) a.push(t); }
    else if (rh === 'junctional') { for (let t = t0; t < end; t += T) { v.push({ tR: t, pr: null, retro: true }); a.push(t + 0.02); } }
    else { for (let t = t0; t < end; t += T) { v.push({ tR: t, pr: pr }); a.push(t - pr); } }
    for (let i = 0; i < v.length; i++) v[i].rr = i < v.length - 1 ? v[i + 1].tR - v[i].tR : T;
    /* the size of each pulse: filling time and restitution; an early beat ejects little, the beat after the pause ejects more */
    for (let i = 0; i < v.length; i++) {
      const prev = i ? v[i - 1].rr : T; let s = 1;
      if (rh === 'af') s = clamp(0.3 + 0.7 * Math.pow(prev / T, 1.1), 0.25, 1.3);
      if (v[i].pvc) s = clamp(0.1 + 0.9 * (prev / T - 0.35), 0.08, 0.5);
      else if (i && v[i - 1].pvc) s = cfg.brock ? 0.72 : 1.16;
      if (cfg.alternans) s *= i % 2 ? 1 - cfg.alternans : 1;
      v[i].scale = s;
    }
    return { v: v, a: a };
  }

  /* ---------------------------------------------------------------- the ECG */
  function ecgSeries(B, tm, t, cfg) {
    let y = 0;
    for (let i = 0; i < B.v.length; i++) {
      const b = B.v[i], d = t - b.tR; if (d < -0.2 || d > 0.7) continue;
      const qt = clamp(0.39 * Math.sqrt(clamp(b.rr, 0.4, 1.6)), 0.26, 0.5);
      if (b.wide) y += 1.1 * g(d, 0.01, 0.03) - 0.5 * g(d, 0.075, 0.035) - 0.42 * ag(d, 0.3, 0.09, 0.07);
      else y += -0.07 * g(d, -0.028, 0.008) + 1.0 * g(d, 0, 0.0105) - 0.2 * g(d, 0.03, 0.009) + 0.27 * ag(d, qt - 0.11, 0.065, 0.04);
      if (b.retro) y += -0.1 * g(d, 0.1, 0.022);
    }
    if (cfg.rhythm === 'af') y += 0.035 * Math.sin(2 * Math.PI * 6.1 * t) + 0.025 * Math.sin(2 * Math.PI * 8.3 * t + 1.1);
    else if (cfg.rhythm !== 'junctional') for (let i = 0; i < B.a.length; i++) { const d = t - B.a[i]; if (d > -0.1 && d < 0.2) y += 0.13 * g(d, 0.045, 0.028); }
    return y;
  }

  /* ---------------------------------------------------------------- the venous and right-sided shapes */
  const CVP = {
    normal: { label: 'Normal', base: 6, a: 3.2, c: 1.2, x: 2.6, v: 2.6, y: 2.2 },
    af: { label: 'Atrial fibrillation', base: 9, a: 0, c: 1.6, x: 1, v: 3.6, y: 3, rhythm: 'af' },
    chb: { label: 'Complete heart block: cannon a waves', base: 8, a: 3.2, c: 1.2, x: 2.4, v: 2.8, y: 2.2, rhythm: 'chb' },
    junctional: { label: 'Junctional rhythm: a cannon wave every beat', base: 9, a: 3.2, c: 0.8, x: 2, v: 2.6, y: 2.2, rhythm: 'junctional', hr: 58 },
    pvc: { label: 'Ventricular ectopics', base: 7, a: 3.2, c: 1.2, x: 2.6, v: 2.6, y: 2.2, rhythm: 'pvc' },
    gianta: { label: 'Giant a waves: a stiff or pressure-loaded right ventricle', base: 11, a: 9, c: 1.2, x: 3.5, v: 3, y: 2 },
    firstdeg: { label: 'First-degree block: a long before c', base: 6, a: 3.2, c: 1.6, x: 2.6, v: 2.6, y: 2.2, pr: 0.32 },
    tr: { label: 'Severe tricuspid regurgitation', base: 13, a: 2.5, c: 1, x: -7, v: 9, y: 11, sysPlateau: 1 },
    tamponade: { label: 'Tamponade', base: 17, a: 3, c: 1, x: 4.5, v: 1.2, y: 0.3, hr: 112 },
    constriction: { label: 'Constrictive pericarditis', base: 18, a: 3.5, c: 1, x: 5, v: 3.5, y: 8, kussmaul: 1, plateau: 1 },
    rvmi: { label: 'Right ventricular infarction', base: 15, a: 5, c: 1, x: 3.2, v: 3, y: 5.5, kussmaul: 1 },
    hypovol: { label: 'Hypovolaemia, breathing hard', base: 1.5, a: 1.6, c: 0.6, x: 1.2, v: 1.3, y: 1, swing: 7, hr: 118 }
  };
  const WEDGE = {
    normal: { label: 'Normal wedge', base: 9, a: 3, c: 0, x: 2, v: 3.4, y: 2.4 },
    mr: { label: 'Acute mitral regurgitation: giant v waves', base: 20, a: 3, c: 0, x: -3, v: 22, y: 20 },
    stiff: { label: 'A stiff left ventricle: tall a waves', base: 20, a: 9, c: 0, x: 4, v: 4, y: 3 },
    af: { label: 'Atrial fibrillation: no a wave', base: 14, a: 0, c: 0, x: 0.6, v: 5, y: 4, rhythm: 'af' },
    ms: { label: 'Mitral stenosis: a slow y descent', base: 22, a: 7, c: 0, x: 3, v: 6, y: 2.5, slowY: 1 }
  };
  /* an atrial pressure at time t from the beats: the a wave rides on atrial systole; a P wave that falls while the AV valve is shut is a cannon wave */
  function atrial(B, tm, t, s, lag) {
    lag = lag || 0; let y = 0;
    for (let i = 0; i < B.v.length; i++) {
      const b = B.v[i], d = t - lag - b.tR; if (d < -0.5 || d > 1.6) continue;
      const lvet = clamp((0.413 - 0.0017 * 60 / clamp(b.rr, 0.4, 1.5)), 0.17, 0.36), tV = tm.pep + lvet + 0.05, sc = b.pvc ? 0.6 : 1;
      y += s.c * g(d, 0.07, 0.026);
      if (s.sysPlateau || s.x < 0) y += -s.x * sc * (0.5 + 0.5 * Math.tanh((d - 0.11) / 0.04)) * (0.5 - 0.5 * Math.tanh((d - tV - 0.02) / 0.03));   // a systolic regurgitant wave fills in the x descent
      else y -= s.x * ag(d, 0.2, 0.075, 0.09);
      y += s.v * sc * ag(d, tV, s.x < 0 ? 0.07 : 0.11, 0.05);
      y -= s.y * sc * ag(d, tV + (s.slowY ? 0.2 : 0.115), 0.05, s.slowY ? 0.22 : (s.plateau ? 0.05 : 0.1));
      if (s.plateau) y += 0.55 * s.y * (0.5 + 0.5 * Math.tanh((d - tV - 0.2) / 0.03)) * (d < b.rr - 0.05 ? 1 : 0) * 0.0;   // the dip is followed by a plateau: the y bump is narrow, so the trace is already back
    }
    for (let i = 0; i < B.a.length; i++) {
      const tp = B.a[i], d = t - lag - tp; if (d < -0.2 || d > 0.4 || !s.a) continue;
      let amp = s.a;
      /* is the AV valve shut at the peak of atrial systole? (from the R wave to the end of ejection) */
      const pk = tp + 0.1;
      for (let j = 0; j < B.v.length; j++) { const b = B.v[j], lv = clamp((0.413 - 0.0017 * 60 / clamp(b.rr, 0.4, 1.5)), 0.17, 0.36); if (pk > b.tR + 0.03 && pk < b.tR + tm.pep + lv) { amp = Math.max(amp * 3.6, 11); break; } }
      y += amp * ag(d, 0.1, 0.04, 0.05);
    }
    return y;
  }
  /* the right ventricle and the pulmonary artery for one beat (d = seconds after the R wave) */
  function rvBeat(d, T, tm, o) {
    const edp = o.rvedp, pk = o.pas, pad = o.pad, e = tm.pep - 0.005, rv = tm.rvet, mn = o.rvmin === undefined ? Math.max(0, Math.min(edp - 3, 0.35 * edp)) : o.rvmin;
    const tmin = Math.min(e + rv + 0.1, T - 0.14), pts = [[0, edp], [0.028, edp + 0.8], [e, Math.max(pad, edp + 1)], [e + 0.35 * rv, pad + 0.9 * (pk - pad)], [e + 0.55 * rv, pk], [e + 0.92 * rv, pad + 0.72 * (pk - pad)], [e + rv + 0.045, 0.3 * pk + 0.7 * mn], [tmin, mn]];
    if (o.plateau) pts.push([tmin + 0.07, edp - 0.3], [T - 0.12, edp - 0.1], [T - 0.05, edp + 0.5], [T, edp]);        // dip and plateau: the square-root sign
    else pts.push([tmin + 0.4 * (T - tmin), mn + 0.45 * (edp - mn)], [T - 0.13, edp - 1.3], [T - 0.05, edp + 0.5], [T, edp]);
    return pchip(pts)(clamp(d, 0, T));
  }
  function paCtx(tm, T, o) {
    const tn = Math.min(tm.rvet, T - 0.12), tu = Math.min(0.22, tn * 0.68), hn = o.hn === undefined ? 0.7 : o.hn, dw = 0.05, hd = hn + dw, k = o.k || 1.0, tau = (T - tn) / k, cinf = hd / (Math.exp(k) - 1);
    const d = tn - tu, pts = [[0, 0], [0.25 * tu, 0.14], [0.6 * tu, 0.66], [0.88 * tu, 0.95], [tu, 1], [tu + 0.4 * d, 1 - 0.3 * (1 - hn)], [tu + 0.75 * d, 1 - 0.75 * (1 - hn)], [tn, hn]];
    return { tn: tn, tu: tu, hn: hn, dw: dw, hd: hd, k: k, tau: tau, cinf: cinf, sys: pchip(pts, 0, -(hd + cinf) / tau), nw: 0.02, T: T };
  }

  /* ---------------------------------------------------------------- a strip: every channel, sampled */
  /* cfg: hr, rhythm, pr, sbp, dbp (at refSite), site, shape, rr, vent ('ppv' | 'spont'), ppv (% variation of the pulse pressure), paradox (mm Hg),
     alternans, cvp (a CVP pattern id or object), wedge (id or object), pas, pad, rvedp, iabp ({ ratio, inflate, deflate } in seconds from the usual),
     swing (mm Hg of pleural swing seen by the central pressures) */
  function series(cfg, dur, fs) {
    cfg = Object.assign({ hr: 80, sbp: 120, dbp: 70, rr: 16, vent: 'ppv', site: 'radial' }, cfg); dur = dur || 8; fs = fs || 250;
    const cv = typeof cfg.cvp === 'string' ? CVP[cfg.cvp] : (cfg.cvp || CVP.normal), wd = typeof cfg.wedge === 'string' ? WEDGE[cfg.wedge] : (cfg.wedge || WEDGE.normal);
    const B = beats(cfg, dur), c = artCtx(cfg), tm = c.tm, nums = siteNumbers(cfg), n = Math.round(dur * fs);
    const o = { t: new Float32Array(n), ecg: new Float32Array(n), art: new Float32Array(n), cvp: new Float32Array(n), rv: new Float32Array(n), pa: new Float32Array(n), paop: new Float32Array(n), resp: new Float32Array(n), fs: fs, dur: dur, beats: B, tm: tm, marks: [], nums: nums, cfg: cfg };
    const spont = cfg.vent === 'spont', swing = cfg.swing === undefined ? (cv.swing || (spont ? 3.5 : 2.5)) : cfg.swing;
    const pas = cfg.pas || 25, pad = cfg.pad || 10, pc = paCtx(tm, tm.T, cfg), rvo = { rvedp: cfg.rvedp === undefined ? Math.max(2, cv.base - 1) : cfg.rvedp, pas: pas, pad: pad, plateau: cv.plateau || cfg.plateau };
    /* the arterial beats: each starts where the last one ended */
    const feet = []; let foot = 0;
    for (let i = 0; i < B.v.length; i++) {
      const b = B.v[i], tF = b.tR + tm.pep + c.delay, rN = respAt(tF - 0.9, cfg.rr);   // the left heart sees the breath about a beat late
      let amp = b.scale;
      if (cfg.ppv) amp *= 1 + (cfg.ppv / 100) * (spont ? -1 : 1) * (rN - 0.42);
      if (cfg.paradox) amp *= 1 - (cfg.paradox * 0.62 / nums.pp) * respAt(tF - 0.25, cfg.rr);
      let iab = null;
      if (cfg.iabp) { const ratio = cfg.iabp.ratio || 2; if (i % ratio === 0) iab = cfg.iabp; }
      feet.push({ tF: tF, amp: amp, foot: foot, i: i, iab: iab });
      const dT = (i < B.v.length - 1 ? B.v[i + 1].tR - b.tR : tm.T);
      foot = artBeat(c, dT, amp, foot);
      if (iab) { const lateD = (iab.deflate || 0) > 0.03, earlyD = (iab.deflate || 0) < -0.08; foot += lateD ? 0.1 : (earlyD ? 0 : -0.17); }      // the assisted end-diastolic pressure
      foot = clamp(foot, -0.45, 0.6);
    }
    for (let i = 0; i < feet.length; i++) { const f = feet[i]; if (f.tF >= 0 && f.tF < dur) o.marks.push({ foot: f.tF, peak: f.tF + c.tu, notch: f.tF + c.tn, amp: f.amp, assisted: !!f.iab, tR: B.v[f.i].tR, pvc: !!B.v[f.i].pvc }); }
    /* the pulmonary artery beats, chained the same way */
    const pfeet = []; let pfoot = 0;
    for (let i = 0; i < B.v.length; i++) {
      const b = B.v[i], amp = b.pvc ? 0.45 : clamp(b.scale, 0.4, 1.25); pfeet.push({ tF: b.tR + tm.pep - 0.005, amp: amp, foot: pfoot });
      pfoot = clamp(artBeat(pc, i < B.v.length - 1 ? B.v[i + 1].tR - b.tR : tm.T, amp, pfoot), -0.4, 0.6);
    }
    let fi = 0, vi = 0, pi = 0;
    for (let i = 0; i < n; i++) {
      const t = i / fs; o.t[i] = t;
      const r = respAt(t, cfg.rr), ppl = (spont ? -1 : 1) * swing * r; o.resp[i] = r;
      o.ecg[i] = ecgSeries(B, tm, t, cfg);
      while (fi < feet.length - 1 && feet[fi + 1].tF <= t) fi++;
      const f = feet[fi], tau = t - f.tF; let u = artBeat(c, tau, f.amp, f.foot);
      if (f.iab) {   // the balloon: inflate at the notch, deflate just before the next upstroke
        const nxt = fi < feet.length - 1 ? feet[fi + 1].tF - f.tF : tm.T, ti = c.tn + (f.iab.inflate || 0), td = nxt - 0.045 + (f.iab.deflate || 0), aug = (f.iab.aug || 0.72), df = f.iab.deflate || 0;
        if (tau > ti) { const up = 1 - Math.exp(-(tau - ti) / 0.035), hold = Math.exp(-Math.max(0, tau - ti - 0.1) / 0.55), off = 0.5 + 0.5 * Math.tanh((tau - td) / 0.022); u += aug * up * hold * (1 - off) - (df > 0.03 ? 0 : 0.17 * (df < -0.08 ? Math.exp(-Math.max(0, tau - td) / 0.07) : 1)) * off; }
      }
      o.art[i] = nums.dbp + nums.pp * u + (cfg.paradox ? -cfg.paradox * 0.38 * respAt(t - 0.25, cfg.rr) : (spont ? -0.25 : 0.3) * ppl);
      /* the right heart and the wedge */
      while (vi < B.v.length - 1 && B.v[vi + 1].tR <= t) vi++;
      const b = B.v[vi], d = t - b.tR, Tb = Math.max(0.3, b.rr);
      let kuss = 0; if (cv.kussmaul && spont) kuss = swing * 1.5 * r;
      o.cvp[i] = Math.max(-4, cv.base + atrial(B, tm, t, cv, 0) + ppl + kuss);
      o.rv[i] = rvBeat(d, Tb, tm, Object.assign({}, rvo, { pas: pad + (pas - pad) * (b.scale || 1) })) + ppl;
      while (pi < pfeet.length - 1 && pfeet[pi + 1].tF <= t) pi++;
      const pf = pfeet[pi];
      o.pa[i] = pad + (pas - pad) * artBeat(pc, t - pf.tF, pf.amp, pf.foot) + ppl + (cfg.paV ? cfg.paV * ag(d, tm.pep + tm.lvet + 0.19, 0.07, 0.06) : 0);
      o.paop[i] = Math.max(-2, wd.base + atrial(B, tm, t, wd, 0.14) + ppl * (cfg.zone12 ? 2.2 : 1));
    }
    return o;
  }
  /* a point evaluator for a regular sinus rhythm (the arterial line lab integrates this through its transducer model) */
  const regCache = {};
  function artAt(t, cfg) {
    const key = [cfg.site || 'radial', cfg.refSite || 'radial', cfg.shape || 'normal', cfg.hr || 80].join('|'); let c = regCache[key];
    if (!c) c = regCache[key] = artCtx(cfg);
    const nums = siteNumbers(cfg), T = c.T; let tau = (t - c.tm.pep - c.delay) % T; if (tau < 0) tau += T;
    let amp = 1; if (cfg.ppv) amp = 1 + (cfg.ppv / 100) * (respAt(t - tau - 0.9, cfg.rr || 16) - 0.42);
    return nums.dbp + nums.pp * artBeat(c, tau, amp, 0);
  }

  /* ---------------------------------------------------------------- the catheter, the tubing and the transducer */
  /* a second-order system (natural frequency fn in Hz, damping coefficient zeta) driven by the pressure x sampled at fs; a fast flush pegs the
     input at 300 mm Hg; offset is added afterwards (a levelling or zeroing error). Returns the displayed pressure. */
  function measure(x, fs, sys) {
    sys = sys || {}; const fn = sys.fn || 25, z = sys.zeta === undefined ? 0.6 : sys.zeta, wn = 2 * Math.PI * fn, sub = Math.max(1, Math.ceil(2000 / fs)), dt = 1 / (fs * sub), n = x.length, out = new Float32Array(n);
    let y = x[0], v = 0;
    for (let i = 0; i < n; i++) {
      const t = i / fs; let xi = x[i];
      if (sys.flushAt !== undefined && t >= sys.flushAt && t < sys.flushAt + (sys.flushDur || 0.7)) xi = 300;
      if (sys.kink) xi = sys.kinkMean + (xi - sys.kinkMean) * (1 - sys.kink);
      const x1 = i < n - 1 ? x[i + 1] : xi;
      for (let k = 0; k < sub; k++) { const xx = (sys.flushAt !== undefined && t >= sys.flushAt && t < sys.flushAt + (sys.flushDur || 0.7)) ? 300 : xi + (x1 - xi) * (k / sub) * (sys.kink ? 0 : 1); const a = wn * wn * (xx - y) - 2 * z * wn * v; v += a * dt; y += v * dt; }
      out[i] = y + (sys.offset || 0);
    }
    return out;
  }
  /* what the monitor would print: systolic, diastolic and mean over [from, to] seconds */
  function stats(y, fs, from, to) {
    const i0 = Math.max(0, Math.round((from || 0) * fs)), i1 = Math.min(y.length, to === undefined ? y.length : Math.round(to * fs)); let mx = -1e9, mn = 1e9, s = 0;
    for (let i = i0; i < i1; i++) { const v = y[i]; if (v > mx) mx = v; if (v < mn) mn = v; s += v; }
    return { sbp: mx, dbp: mn, map: s / Math.max(1, i1 - i0) };
  }
  /* the fast-flush test read as at the bedside: the natural frequency from the period of the oscillation, the damping coefficient from the ratio of
     two successive peaks (Gardner). Given a system, returns what you would measure on the strip. */
  function flushRead(fn, zeta) {
    if (zeta >= 1) return { oscillations: 0, ratio: 0, period: null, fn: fn, zeta: zeta, verdict: 'overdamped' };
    const fd = fn * Math.sqrt(1 - zeta * zeta), ratio = Math.exp(-Math.PI * zeta / Math.sqrt(1 - zeta * zeta));
    let n = 0, a = 1; while (a * ratio > 0.04 && n < 12) { a *= ratio; n++; }
    return { oscillations: n, ratio: ratio, period: 1 / fd, fn: fn, zeta: zeta, verdict: verdict(fn, zeta) };
  }
  /* adequate: the Gardner wedge, simplified: the higher the natural frequency, the wider the range of damping that is tolerated */
  function verdict(fn, zeta) {
    if (zeta >= 0.9 || (fn < 7 && zeta > 0.6)) return 'overdamped';
    const lo = fn >= 24 ? 0.2 : fn >= 15 ? 0.35 : 0.5;
    if (zeta < lo) return 'underdamped';
    if (fn < 7.5) return 'overdamped';
    return 'adequate';
  }
  /* the damping coefficient from an amplitude ratio of successive peaks */
  function zetaFromRatio(r) { if (r <= 0) return 1; const l = Math.log(r); return -l / Math.sqrt(Math.PI * Math.PI + l * l); }

  /* ---------------------------------------------------------------- features of a sampled beat (used on the model and on real strips) */
  function features(y, fs) {
    const n = y.length, d = new Float32Array(n); for (let i = 1; i < n - 1; i++) d[i] = (y[i + 1] - y[i - 1]) * fs / 2;
    let dmax = 0; for (let i = 0; i < n; i++) if (d[i] > dmax) dmax = d[i];
    const ups = []; let last = -1e9;
    for (let i = 2; i < n - 2; i++) if (d[i] > 0.45 * dmax && d[i] >= d[i - 1] && d[i] >= d[i + 1] && i - last > 0.3 * fs) { ups.push(i); last = i; }
    const out = [];
    for (let k = 0; k < ups.length - 1; k++) {
      const p = ups[k], nx = ups[k + 1], T = (nx - p) / fs; let foot = p; for (let i = p; i > Math.max(0, p - Math.round(0.14 * fs)); i--) if (y[i] < y[foot]) foot = i;
      let peak = foot; for (let i = foot; i < Math.min(n, foot + Math.round(0.36 * fs)); i++) if (y[i] > y[peak]) peak = i;
      let notch = -1; const s0 = peak + Math.round(0.05 * fs), s1 = Math.min(nx - 2, foot + Math.round(Math.min(0.62 * T, 0.52) * fs));
      for (let i = s0 + 1; i < s1; i++) if (d[i - 1] < 0 && d[i] >= 0) { notch = i; break; }
      if (notch < 0) { let best = s0; for (let i = s0; i < s1; i++) if (d[i] > d[best]) best = i; notch = best; }
      let s = 0; for (let i = foot; i < foot + (nx - p); i++) s += y[Math.min(n - 1, i)];
      const sbp = y[peak], dbp = y[foot], pp = sbp - dbp, map = s / (nx - p);
      out.push({ foot: foot / fs, T: T, up: (peak - foot) / fs, tn: (notch - foot) / fs, hn: (y[notch] - dbp) / pp, sbp: sbp, dbp: dbp, pp: pp, map: map, ff: (map - dbp) / pp });
    }
    return out;
  }
  function median(a) { const b = a.slice().sort((p, q) => p - q); return b.length ? b[Math.floor(b.length / 2)] : NaN; }
  function featureSummary(y, fs) { const f = features(y, fs), m = k => median(f.map(q => q[k])); return { n: f.length, hr: 60 / m('T'), up: m('up'), tn: m('tn'), hn: m('hn'), ff: m('ff'), sbp: m('sbp'), dbp: m('dbp'), map: m('map') }; }

  root.PFT_WAVES = { timing: timing, SITES: SITES, SHAPES: SHAPES, CVP: CVP, WEDGE: WEDGE, artCtx: artCtx, artBeat: artBeat, siteNumbers: siteNumbers, respAt: respAt, beats: beats, series: series, artAt: artAt,
    ecgAt: ecgSeries, measure: measure, stats: stats, flushRead: flushRead, verdict: verdict, zetaFromRatio: zetaFromRatio, features: features, featureSummary: featureSummary, pchip: pchip, rvBeat: rvBeat, paCtx: paCtx, atrial: atrial };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PFT_WAVES;
})(typeof window !== 'undefined' ? window : globalThis);
