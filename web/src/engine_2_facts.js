/* ==========================================================================
   PFT Interpreter engine — part 2: measurement states, pattern classifiers
   and the normalized findings map F.
   Order of operations (PFT_Rules_and_Integration.txt §2–§13):
     1. read each measurement with its documented reliability;
     2. classify it against its own reference (LLN/ULN, z-score grading);
     3. combine reliable states into physiologic patterns;
     4. expose everything as exact-match facts for the phrase catalog.
   Unknown never becomes normal, absent, or negative.
   ========================================================================== */

/* ------------------------------------------------------------------ facts */
function blankIf(on, st, key) { return on[key] ? st[key] : blankModule(key); }

function parseDate(s) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (isNaN(d.getTime()) || d.getUTCMonth() !== (+m[2] - 1)) return null;
  return d;
}
function yearsBetween(a, b) { return (b.getTime() - a.getTime()) / (365.25 * 86400000); }

/* Reliability of one spirometric component from its ATS/ERS 2019 grade, the documented limitations and the loop artifact chosen. */
function gradeRel(g) { return g === 'F' ? 'invalid' : ((g === 'U' || g === 'C' || g === 'D' || g === 'E') ? 'limited' : 'ok'); }
function worse(a, b) { const r = { ok: 0, limited: 1, invalid: 2 }; return r[a] >= r[b] ? a : b; }

/* Enright & Sherrill 1998 reference 6MWD (Am J Respir Crit Care Med 1998;158:1384–7), as implemented by the MDCalc
   "6 Minute Walk Distance" calculator. Men: 7.57 × height(cm) − 5.02 × age − 1.76 × weight(kg) − 309; LLN = predicted − 153.
   Women: 2.11 × height − 2.29 × weight − 5.78 × age + 667; LLN = predicted − 139. Healthy adults aged 40–80. */
const ES_AGE = [40, 80];
function enrightSherrill(ctx) {
  const o = { ok: false, pred: NaN, lln: NaN, sub: NaN, missing: [], ageOut: false, sex: ctx.sex || '' };
  if (!has(ctx.age)) o.missing.push('age');
  if (ctx.sex !== 'M' && ctx.sex !== 'F') o.missing.push('sex');
  if (!has(ctx.ht)) o.missing.push('height');
  if (!has(ctx.wt)) o.missing.push('weight');
  if (o.missing.length) return o;
  const h_ = ctx.ht, a = ctx.age, w = ctx.wt;
  if (ctx.sex === 'M') { o.pred = 7.57 * h_ - 5.02 * a - 1.76 * w - 309; o.sub = 153; }
  else { o.pred = 2.11 * h_ - 2.29 * w - 5.78 * a + 667; o.sub = 139; }
  o.lln = o.pred - o.sub;
  o.ageOut = a < ES_AGE[0] || a > ES_AGE[1];
  o.ok = isFinite(o.pred) && o.pred > 0;
  return o;
}
/* 6MWD trend: saved walks (date + distance [+ nadir SpO2, oxygen]) plus today's walk from the 6MWT step. */
const MID_6MWD = 30;            // minimal important difference, ERS/ATS 2014 (25-33 m)
const IPF_DROP_6MWD = 50;       // du Bois 2011: > 50 m decline over 24 weeks predicts mortality in IPF
function isoDate(d) { return d.toISOString().slice(0, 10); }
function trendFacts(st, f) {
  const t = { any: false, n: 0, pts: [], multi: false, flags: [], skipped: 0, vsPrev: null, vsFirst: null, vsBest: null, best: null, slope: NaN, ipf: null, o2mix: false, nadir: null, dupDates: false, futureDate: false };
  if (!f.on.sixmw) return t;
  const rows = (st.trend6 && Array.isArray(st.trend6.list)) ? st.trend6.list : [];
  const pts = [];
  rows.forEach((r, i) => {
    const dist = num(r.dist), ds = (r.date || '').trim(), nadir = num(r.nadir);
    if (!has(dist) && !ds && !has(nadir)) return;                       // blank row
    const d = parseDate(ds);
    if (!has(dist) || dist <= 0 || !d) { t.skipped++; return; }
    pts.push({ date: d, ds: isoDate(d), dist: dist, nadir: (has(nadir) && nadir >= 50 && nadir <= 100) ? nadir : NaN, o2: r.o2 === 'o2', src: 'saved' });
  });
  t.curMissingDate = false;
  if (has(f.six.dist) && f.six.dist > 0) {
    if (f.ctx.date) {
      const cd = isoDate(f.ctx.date);
      const dup = pts.filter(p => p.ds === cd && Math.abs(p.dist - f.six.dist) < 0.5)[0];
      if (dup) { dup.src = 'current'; if (!has(dup.nadir) && has(f.six.sn)) dup.nadir = f.six.sn; if (f.six.o2 === 'o2') dup.o2 = true; }
      else pts.push({ date: f.ctx.date, ds: cd, dist: f.six.dist, nadir: has(f.six.sn) ? f.six.sn : NaN, o2: f.six.o2 === 'o2', src: 'current' });
    } else t.curMissingDate = true;
  }
  pts.sort((a, b) => a.date.getTime() - b.date.getTime());
  t.pts = pts; t.n = pts.length; t.any = pts.length > 0; t.multi = pts.length >= 2;
  const chg = (a, b) => {
    const days = (b.date.getTime() - a.date.getTime()) / 86400000, yrs = days / 365.25;
    const dAbs = b.dist - a.dist;
    return { from: a, to: b, dAbs: dAbs, dPct: a.dist > 0 ? dAbs / a.dist * 100 : NaN, days: days, years: yrs,
             perYear: (yrs >= 0.25) ? dAbs / yrs : NaN, cls: dAbs <= -MID_6MWD ? 'down' : (dAbs >= MID_6MWD ? 'up' : 'stable') };
  };
  if (t.multi) {
    const n = pts.length, last = pts[n - 1], prev = pts[n - 2], first = pts[0];
    t.best = pts.reduce((m, p) => (p.dist > m.dist ? p : m), pts[0]);
    t.vsPrev = chg(prev, last);
    if (n >= 3) t.vsFirst = chg(first, last);
    if (t.best !== last && t.best !== prev && t.best !== first) t.vsBest = chg(t.best, last);
    if (n >= 3) {
      const span = (last.date.getTime() - first.date.getTime()) / (365.25 * 86400000);
      if (span >= 0.5) {
        const xs = pts.map(p => (p.date.getTime() - first.date.getTime()) / (365.25 * 86400000)), ys = pts.map(p => p.dist);
        const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
        let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) * (x - mx); });
        if (sxx > 0) t.slope = sxy / sxx;
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const c = chg(pts[i], last);
      if (c.days >= 84 && c.days <= 210 && c.dAbs < -IPF_DROP_6MWD && (!t.ipf || c.dAbs < t.ipf.dAbs)) t.ipf = c;
    }
    t.o2mix = pts.some(p => p.o2) && pts.some(p => !p.o2);
    if (has(prev.nadir) && has(last.nadir)) t.nadir = { from: prev, to: last, d: last.nadir - prev.nadir };
    t.dupDates = pts.some((p, i) => i > 0 && p.ds === pts[i - 1].ds);
  }
  if (f.ctx.date && pts.some(p => p.date.getTime() > f.ctx.date.getTime())) t.futureDate = true;
  return t;
}

function buildFacts(st) {
  const band = num(st.settings && st.settings.band);
  CFG.band = has(band) ? Math.max(0, Math.min(1, band)) : 0.25;
  const on = st.tests;
  const c = st.ctx;
  const age = num(c.age), ht = num(c.ht), wt = num(c.wt);
  const bmi = (has(ht) && has(wt) && ht > 0) ? wt / Math.pow(ht / 100, 2) : NaN;
  const f = { on: on, st: st, review: st.review || {}, style: (st.settings && st.settings.style) || 'standard' };
  const indic = Array.isArray(c.indic) ? c.indic : [];
  const indicLabels = INDICATIONS.reduce((a, g) => a.concat(g.opts), []).filter(o => indic.indexOf(o[0]) >= 0).map(o => o[1]);
  f.ctx = { age: age, sex: c.sex || '', ht: ht, wt: wt, bmi: bmi, obese: has(bmi) && bmi >= 30, smoke: c.smoke || '',
            date: parseDate(c.date), indication: (c.indication || '').trim(), indic: indic, indicLabels: indicLabels,
            eq: { spiro: c.ref_spiro || 'global', vol: c.ref_vol || 'gli2021', dlco: c.ref_dlco || 'gli2017', hrmax: c.hrmax_eq || 'tanaka', aa: c.aa_eq || 'q4' } };
  f.ctx.hasInd = (k) => indic.indexOf(k) >= 0;
  f.ctx.hrMax = has(age) ? (f.ctx.eq.hrmax === 'fox' ? 220 - age : 208 - 0.7 * age) : NaN;

  /* ---------------- spirometry: reliability first, then states ---------------- */
  const sp = blankIf(on, st, 'spiro');
  const fv = blankIf(on, st, 'fvl');
  const lim = Array.isArray(sp.limits) ? sp.limits : [];
  const L = (k) => lim.indexOf(k) >= 0;
  const loop = fv.loop || '';
  const q1 = sp.qual_fev1 || '', q2 = sp.qual_fvc || '';
  let relF = gradeRel(q1), relV = gradeRel(q2);
  if (L('cough') || L('slow') || loop === 'cough' || loop === 'slow') relF = worse(relF, 'limited');
  if (L('early') || loop === 'early') relV = worse(relV, 'limited');
  if (L('insp') || L('leak') || L('glottic') || L('varef') || L('repeat') || loop === 'effort') { relF = worse(relF, 'limited'); relV = worse(relV, 'limited'); }
  const relR = worse(relF, relV);
  f.sp = {
    ratio: res(sp.ratio, 'ratio', relR), fev1: res(sp.fev1, 'grade', relF), fvc: res(sp.fvc, 'gradeH', relV), fef: res(sp.fef, 'both', relF),
    fev1L: num(sp.fev1_abs), fvcL: num(sp.fvc_abs), fev1pct: num(sp.fev1_pct), fvcpct: num(sp.fvc_pct),
    qual1: q1, qual2: q2, qual: (q1 && q2) ? (gradeRel(q1) === 'invalid' || gradeRel(q2) === 'invalid' ? 'F' : (q1 > q2 ? q1 : q2)) : (q1 || q2),
    limits: lim, relF: relF, relV: relV, relR: relR,
    fvcUnder: L('early') || loop === 'early',                 // early termination: FVC may be underestimated and the ratio inflated
    effort: sp.effort || (loop === 'weak' ? 'weak' : (loop === 'effort' ? 'poor' : '')), loop: loop, repro: !!fv.loop_repro
  };
  f.sp.ratioCalc = (has(f.sp.fev1L) && has(f.sp.fvcL) && f.sp.fvcL > 0) ? f.sp.fev1L / f.sp.fvcL : NaN;
  f.sp.any = f.sp.ratio.measured || f.sp.fev1.measured || f.sp.fvc.measured || has(f.sp.fev1L) || has(f.sp.fvcL);
  f.sp.anyQ = !!(q1 || q2 || lim.length || sp.effort);

  /* ---------------- bronchodilator ---------------- */
  const bd = blankIf(on, st, 'bd');
  const relB = bd.qc === 'inv' ? 'invalid' : (bd.qc === 'limited' ? 'limited' : 'ok');
  f.bd = {
    agent: (bd.agent || '').trim(), held: bd.held || '', qc: bd.qc || '', rel: relB,
    f1pre: num(bd.fev1_pre), f1post: num(bd.fev1_post), f1pred: num(bd.fev1_pred),
    vpre: num(bd.fvc_pre), vpost: num(bd.fvc_post), vpred: num(bd.fvc_pred),
    dF1pp: num(bd.dfev1_pp), dVpp: num(bd.dfvc_pp),
    postRatio: res(bd.post_ratio, 'ratio', relB), postFev1: res(bd.post_fev1, 'grade', relB), resp: bd.resp || ''
  };
  const b = f.bd;
  b.dF = has(b.dF1pp) ? b.dF1pp : ((has(b.f1pre) && has(b.f1post) && has(b.f1pred) && b.f1pred > 0) ? (b.f1post - b.f1pre) / b.f1pred * 100 : NaN);
  b.dV = has(b.dVpp) ? b.dVpp : ((has(b.vpre) && has(b.vpost) && has(b.vpred) && b.vpred > 0) ? (b.vpost - b.vpre) / b.vpred * 100 : NaN);
  b.dFmL = (has(b.f1pre) && has(b.f1post)) ? (b.f1post - b.f1pre) * 1000 : NaN;
  b.dVmL = (has(b.vpre) && has(b.vpost)) ? (b.vpost - b.vpre) * 1000 : NaN;
  b.dFbase = (has(b.f1pre) && has(b.f1post) && b.f1pre > 0) ? (b.f1post - b.f1pre) / b.f1pre * 100 : NaN;
  b.dVbase = (has(b.vpre) && has(b.vpost) && b.vpre > 0) ? (b.vpost - b.vpre) / b.vpre * 100 : NaN;
  b.any = has(b.dF) || has(b.dV) || b.postRatio.measured || b.postFev1.measured || has(b.f1pre) || has(b.f1post) || has(b.vpre) || has(b.vpost) || b.resp !== '' || has(b.dFmL) || has(b.dVmL);
  // a metric is "assessed" when its change is known from numbers, or the lab's verdict covered it
  b.assessedF = has(b.dF) || (b.resp !== '' && b.resp !== 'ind');
  b.assessedV = has(b.dV) || (b.resp !== '' && b.resp !== 'ind');
  // strictly greater than 10% of predicted (ERS/ATS 2022); the tolerance only absorbs floating-point noise from decimal inputs (0.3/3.0 = 10.000000000000002)
  const EPS = 1e-9;
  b.sigF = has(b.dF) ? b.dF > 10 + EPS : (b.resp === 'fev1' || b.resp === 'both');
  b.sigV = has(b.dV) ? b.dV > 10 + EPS : (b.resp === 'fvc' || b.resp === 'both');
  b.sig = (b.sigF || b.sigV) && relB !== 'invalid';
  b.drop = (has(b.dF) && b.dF < -10) || (has(b.dV) && b.dV < -10);
  b.anyDecrease = (has(b.dF) && b.dF < 0) || (has(b.dV) && b.dV < 0) || (has(b.dFmL) && b.dFmL < 0) || (has(b.dVmL) && b.dVmL < 0);
  b.subthreshold = !b.sig && ((has(b.dF) && b.dF > 0) || (has(b.dV) && b.dV > 0)) && b.assessedF && b.assessedV;
  b.currentComputable = has(b.dF) && has(b.dV) && relB !== 'invalid';
  if (relB === 'invalid' && b.any) b.response = 'indeterminate';
  else if (b.resp === 'ind') b.response = 'indeterminate';
  else if (b.sig) b.response = b.sigF && b.sigV ? 'both' : (b.sigF ? 'fev1' : 'fvc');
  else if (b.assessedF && b.assessedV) b.response = 'negative';
  else if (b.any) b.response = 'indeterminate';
  else b.response = 'not_performed';
  // legacy 2005 profile (≥ 12% of baseline and ≥ 200 mL), computed only when all four volumes are present; kept labelled, never merged with the current criterion
  b.legacyAvail = has(b.dFbase) && has(b.dVbase);
  b.legacyF = b.legacyAvail && b.dFbase >= 12 && b.dFmL >= 200;
  b.legacyV = b.legacyAvail && b.dVbase >= 12 && b.dVmL >= 200;
  b.legacy = b.legacyAvail ? (b.legacyF || b.legacyV) : null;
  b.discordant = b.legacyAvail && b.currentComputable && (b.legacy !== b.sig);
  b.obstructionStatus = 'unknown';
  if (f.sp.ratio.low && !f.sp.ratio.invalid && b.postRatio.measured && !b.postRatio.invalid) b.obstructionStatus = b.postRatio.low ? 'persistent' : 'normalized';
  else if (f.sp.ratio.measured && !f.sp.ratio.low && !f.sp.ratio.invalid && b.any) b.obstructionStatus = 'absent_at_baseline';

  /* ---------------- flow-volume loop ---------------- */
  f.fvl = {
    loop: loop, repro: !!fv.loop_repro,
    pef: res(fv.pef, 'lo', relF), pefL: num(fv.pef_lmin), fef50: num(fv.fef50), fif50: num(fv.fif50), fif50c: res(fv.fif50c, 'lo'),
    fevpefSel: fv.fevpef || '', fifSel: fv.fifratio || ''
  };
  f.fvl.fevPef = (has(f.sp.fev1L) && has(f.fvl.pefL) && f.fvl.pefL > 0) ? (f.sp.fev1L * 1000) / f.fvl.pefL : NaN;
  f.fvl.fifFef = (has(f.fvl.fif50) && has(f.fvl.fef50) && f.fvl.fef50 > 0) ? f.fvl.fif50 / f.fvl.fef50 : NaN;
  f.fvl.fevPefHi = has(f.fvl.fevPef) ? f.fvl.fevPef > 8 : (f.fvl.fevpefSel === 'hi' ? true : (f.fvl.fevpefSel === 'ok' ? false : null));
  f.fvl.fifCat = has(f.fvl.fifFef) ? (f.fvl.fifFef < 0.9 ? 'lt' : (f.fvl.fifFef > 1.1 ? 'gt' : 'eq')) : f.fvl.fifSel;
  f.fvl.any = f.fvl.pef.measured || f.fvl.fif50c.measured || has(f.fvl.pefL) || has(f.fvl.fef50) || has(f.fvl.fif50) || f.fvl.fevpefSel !== '' || f.fvl.fifSel !== '' || f.fvl.loop !== '';

  /* ---------------- lung volumes ---------------- */
  const vo = blankIf(on, st, 'vol');
  const relVol = vo.qc === 'inv' ? 'invalid' : (vo.qc === 'limited' ? 'limited' : 'ok');
  f.vol = {
    method: vo.method || '', qc: vo.qc || '', rel: relVol,
    tlc: res(vo.tlc, 'gradeH', relVol), rvtlc: res(vo.rvtlc, 'both', relVol), rv: res(vo.rv, 'both', relVol), frc: res(vo.frc, 'both', relVol), frctlc: res(vo.frctlc, 'both', relVol),
    svc: res(vo.svc, 'gradeH', relVol), erv: res(vo.erv, 'both', relVol), ic: res(vo.ic, 'both', relVol),
    tlcL: num(vo.tlc_abs), rvL: num(vo.rv_abs), frcL: num(vo.frc_abs), svcL: num(vo.svc_abs)
  };
  const v = f.vol;
  v.rvtlcCalc = (has(v.rvL) && has(v.tlcL) && v.tlcL > 0) ? v.rvL / v.tlcL * 100 : NaN;
  v.any = v.tlc.measured || v.rvtlc.measured || v.rv.measured || v.frc.measured || v.frctlc.measured || v.svc.measured || v.erv.measured || v.ic.measured || has(v.tlcL) || has(v.rvL);
  v.dilution = (v.method === 'n2' || v.method === 'he' || v.method === 'sb');

  /* ---------------- DLCO ---------------- */
  const dl = blankIf(on, st, 'dlco');
  const relD = dl.qc === 'inv' ? 'invalid' : ((dl.qc === 'limited' || dl.single === 'one') ? 'limited' : 'ok');
  f.dl = {
    dlco: res(dl.dlco, 'gradeH', relD), adj: res(dl.dlco_adj, 'gradeH', relD), va: res(dl.va, 'both', relD), kco: res(dl.kco, 'both', relD),
    basis: dl.basis || '', single: dl.single === 'one',
    hb: num(dl.hb), cohb: num(dl.cohb), abs: num(dl.dlco_abs), pct: num(dl.dlco_pct), vaL: num(dl.va_abs),
    vatlcSel: dl.vatlc || '', qc: dl.qc || '', rel: relD, hbcat: dl.hbcat || '', cohbcat: dl.cohbcat || ''
  };
  const d = f.dl;
  // the reported value is unadjusted unless the report says it is adjusted; a second, adjusted value may sit beside it
  d.reportedAdjusted = d.basis === 'adj';
  d.hasAdj = d.reportedAdjusted || d.adj.measured;
  d.adjRes = d.reportedAdjusted ? d.dlco : d.adj;                  // the hemoglobin-adjusted comparison, when one exists
  // the unadjusted comparison exists only when the report says the value is unadjusted, or prints an adjusted value beside it
  d.unadjRes = (d.basis === 'un' || (!d.reportedAdjusted && d.adj.measured)) ? d.dlco : res({ c: 'nm', z: '' }, 'gradeH');
  d.basisKnown = d.basis !== '' || d.adj.measured;
  d.vatlc = (has(d.vaL) && has(v.tlcL) && v.tlcL > 0) ? d.vaL / v.tlcL : NaN;
  d.vatlcLow = has(d.vatlc) ? d.vatlc < 0.85 : (d.vatlcSel === 'low');
  d.vatlcOk = has(d.vatlc) ? d.vatlc >= 0.85 : (d.vatlcSel === 'ok');
  d.hbRef = (f.ctx.sex === 'M' && (!has(age) || age > 15)) ? 14.6 : 13.4;
  d.hbKnownRef = f.ctx.sex !== '' || has(age);
  d.adjPct = (has(d.pct) && has(d.hb) && d.hb > 0 && !d.reportedAdjusted) ? d.pct * (0.7 * d.hbRef + d.hb) / (1.7 * d.hb) : NaN;
  d.hbKnown = has(d.hb) || d.hbcat !== '';
  d.anemic = has(d.hb) ? (f.ctx.sex === 'M' ? d.hb < 13.0 : d.hb < 12.0) : (d.hbcat === 'low' ? true : (d.hbcat !== '' ? false : null));
  d.cohbKnown = has(d.cohb) || d.cohbcat !== '';
  d.cohbHigh = has(d.cohb) ? d.cohb >= 2 : d.cohbcat === 'hi';
  d.any = d.dlco.measured || d.adj.measured || d.va.measured || d.kco.measured || d.hbKnown || has(d.pct) || has(d.abs) || d.cohbKnown;

  /* ---------------- resistance, oscillometry ---------------- */
  const rw = blankIf(on, st, 'raw');
  f.raw = { raw: res(rw.raw, 'hi'), sraw: res(rw.sraw, 'hi'), sgaw: res(rw.sgaw, 'lo'), bd: rw.bd || '' };
  f.raw.any = f.raw.raw.measured || f.raw.sraw.measured || f.raw.sgaw.measured;
  const os = blankIf(on, st, 'osc');
  f.osc = { r5: res(os.r5, 'hi'), r520: res(os.r520, 'hi'), x5: res(os.x5, 'lo'), ax: res(os.ax, 'hi'), fres: res(os.fres, 'hi'), bdr: os.bdr || '' };
  f.osc.any = f.osc.r5.measured || f.osc.r520.measured || f.osc.x5.measured || f.osc.ax.measured || f.osc.fres.measured;

  /* ---------------- respiratory muscle ---------------- */
  const mp = blankIf(on, st, 'mip');
  const relM = mp.effort === 'inv' ? 'invalid' : ((mp.effort === 'poor' || mp.effort === 'bulbar') ? 'limited' : 'ok');
  f.mp = {
    mipV: num(mp.mip_v), mepV: num(mp.mep_v), snipV: num(mp.snip_v), mipC: res(mp.mip, 'lo', relM), mepC: res(mp.mep, 'lo', relM), snipC: res(mp.snip, 'lo', relM),
    mipLLN: num(mp.mip_lln), mepLLN: num(mp.mep_lln), snipLLN: num(mp.snip_lln),
    p01: mp.p01 || '', cpf: num(mp.cpf), mvv: num(mp.mvv), effort: mp.effort || '', rel: relM, cpfSel: mp.cpfcat || ''
  };
  const m = f.mp, sex = f.ctx.sex;
  m.mipV = has(m.mipV) ? Math.abs(m.mipV) : NaN; m.mepV = has(m.mepV) ? Math.abs(m.mepV) : NaN; m.snipV = has(m.snipV) ? Math.abs(m.snipV) : NaN;
  // screening thresholds (commonly cited; Kaminsky 2018) are used only when the lab's own lower limit is not entered, and are named as such in the report
  m.screen = { mip: sex === 'M' ? 75 : (sex === 'F' ? 50 : NaN), mep: sex === 'M' ? 100 : (sex === 'F' ? 80 : NaN), snip: 40 };
  m.thr = { mip: has(m.mipLLN) ? m.mipLLN : m.screen.mip, mep: has(m.mepLLN) ? m.mepLLN : m.screen.mep, snip: has(m.snipLLN) ? m.snipLLN : m.screen.snip };
  m.thrSrc = { mip: has(m.mipLLN) ? 'lab' : 'screen', mep: has(m.mepLLN) ? 'lab' : 'screen', snip: has(m.snipLLN) ? 'lab' : 'screen' };
  function muscle(val, thr, catRes) {
    if (catRes.measured) return catRes.invalid ? 'invalid' : (catRes.low ? 'low' : 'normal');
    if (has(val) && relM === 'invalid') return 'invalid';
    if (has(val) && has(thr)) return val < thr ? 'low' : 'normal';
    return has(val) ? 'unknown' : 'not_measured';
  }
  m.mip = muscle(m.mipV, m.thr.mip, m.mipC);
  m.mep = muscle(m.mepV, m.thr.mep, m.mepC);
  m.snip = muscle(m.snipV, m.thr.snip, m.snipC);
  m.cpfCat = has(m.cpf) ? (m.cpf <= 160 ? 'vlow' : (m.cpf < 270 ? 'low' : 'ok')) : m.cpfSel;
  m.any = m.mip !== 'not_measured' || m.mep !== 'not_measured' || m.snip !== 'not_measured' || m.p01 !== '' || has(m.cpf) || has(m.mvv) || m.cpfCat !== '';

  /* ---------------- posture ---------------- */
  const ps = blankIf(on, st, 'post');
  f.post = {
    which: ps.which || 'fvc', up: num(ps.up), sup: num(ps.sup), limited: !!ps.limited,
    spo2s: num(ps.spo2_sup), spo2u: num(ps.spo2_up), pao2s: num(ps.pao2_sup), pao2u: num(ps.pao2_up),
    orthop: !!ps.orthop, platyp: !!ps.platyp, fallSel: ps.fall || '', orthSel: ps.orthodeox || ''
  };
  const p = f.post;
  p.drop = (has(p.up) && has(p.sup) && p.up > 0) ? (p.up - p.sup) / p.up * 100 : NaN;
  p.dropComputable = has(p.drop) && p.sup <= p.up && !p.limited;
  p.supineHigher = has(p.drop) && p.sup > p.up;
  p.dSpO2 = (has(p.spo2s) && has(p.spo2u)) ? p.spo2s - p.spo2u : NaN;     // positive = lower upright
  p.dPaO2 = (has(p.pao2s) && has(p.pao2u)) ? p.pao2s - p.pao2u : NaN;
  p.band = has(p.drop) ? (p.drop >= 30 ? 'ge30' : (p.drop >= 20 ? 'b20_30' : (p.drop >= 10 ? 'b10_20' : (p.drop >= 0 ? 'lt10' : 'neg')))) : p.fallSel;
  p.ge20 = !p.limited && (p.band === 'b20_30' || p.band === 'ge30');
  p.ge15 = !p.limited && (has(p.drop) ? p.drop >= 15 : p.ge20);
  p.orthodeox = (has(p.dSpO2) && p.dSpO2 >= 5) || (has(p.dPaO2) && p.dPaO2 > 4) || p.orthSel === 'yes';
  p.any = has(p.drop) || has(p.dSpO2) || has(p.dPaO2) || p.orthop || p.platyp || p.fallSel !== '' || p.orthSel !== '' || p.limited;

  /* ---------------- FeNO ---------------- */
  const fe = blankIf(on, st, 'feno');
  f.feno = { v: num(fe.val), ics: fe.ics || '', confound: !!fe.confound, bandSel: fe.band || '' };
  f.feno.child = has(age) && age < 12;
  f.feno.any = has(f.feno.v) || f.feno.bandSel !== '';

  /* ---------------- bronchoprovocation ---------------- */
  const br = blankIf(on, st, 'bronch');
  f.br = {
    type: br.type || 'mch', basePct: num(br.base_pct), baseL: num(br.base_L), ics: br.ics || '', rev: br.rev || '', held: br.held || '',
    unit: br.unit || 'pc20', protocol: br.protocol || '', mchVal: num(br.mch_val), mchNeg: !!br.mch_neg, mchMax: num(br.mch_max), mchFall: num(br.mch_fall), recPct: num(br.rec_pct),
    complete: br.complete || '', diluent: !!br.diluent, indet: !!br.indet,
    manFall: num(br.man_fall), manDose: num(br.man_dose), manIncr: !!br.man_incr,
    exFall: num(br.ex_fall), exConsec: !!br.ex_consec,
    mchCat: br.mch_cat || '', manRes: br.man_res || '', exRes: br.ex_res || '', baseOk: br.base_ok || ''
  };
  const q = f.br;
  q.any = (q.type === 'mch' && (has(q.mchVal) || q.mchNeg || has(q.mchFall) || q.mchCat !== '' || q.complete !== '' || q.diluent || q.indet)) ||
          (q.type === 'man' && (has(q.manFall) || q.manIncr || q.manRes !== '')) ||
          ((q.type === 'ex' || q.type === 'evh') && (has(q.exFall) || q.exConsec || q.exRes !== ''));
  q.mch = methacholineFacts(q);

  /* ---------------- 6MWT ---------------- */
  const sx = blankIf(on, st, 'sixmw');
  f.six = {
    dist: num(sx.dist), pred: num(sx.pred), lln: num(sx.lln), pct: num(sx.pct), eq: (sx.eq || '').trim(),
    s0: num(sx.spo2_base), sn: num(sx.spo2_nadir), se: num(sx.spo2_end), h0: num(sx.hr_base), hp: num(sx.hr_peak), h1: num(sx.hr_1min),
    b0: num(sx.borg_base), b1: num(sx.borg_end), o2: sx.o2 || '', o2flow: num(sx.o2_flow), o2desc: (sx.o2_desc || '').trim(), stop: sx.stop || '', stopWhy: (sx.stop_why || '').trim(), timeMin: num(sx.time_min),
    distCat: sx.dist_cat || '', desatSel: sx.desat || '', hrrSel: sx.hrr || ''
  };
  const x = f.six;
  // Enright & Sherrill 1998 predicted 6MWD (the MDCalc "6 Minute Walk Distance" calculator): used when the laboratory
  // did not report a predicted value; a reported predicted value always takes precedence. LLN = predicted − 153 m (men)
  // or − 139 m (women). Derived in healthy adults aged 40–80 (n = 290), explaining about 40% of the variance.
  x.es = enrightSherrill(f.ctx);
  x.predSrc = has(x.pred) ? 'lab' : (x.es.ok ? 'calc' : '');
  x.predUse = has(x.pred) ? x.pred : (x.es.ok ? x.es.pred : NaN);
  x.eqUse = x.eq || (x.predSrc === 'calc' ? 'Enright & Sherrill 1998' : '');
  x.llnSrc = has(x.lln) ? 'lab' : (x.predSrc === 'calc' ? 'calc' : ((has(x.pred) && x.eq === 'Enright & Sherrill 1998' && x.es.sub) ? 'derived' : ''));
  x.llnUse = has(x.lln) ? x.lln : (x.llnSrc === 'calc' ? x.es.lln : (x.llnSrc === 'derived' ? x.pred - x.es.sub : NaN));
  x.pctCalc = has(x.pct) ? x.pct : ((has(x.dist) && has(x.predUse) && x.predUse > 0) ? x.dist / x.predUse * 100 : NaN);
  x.predDiff = (x.predSrc === 'lab' && x.es.ok && x.eq === 'Enright & Sherrill 1998' && x.pred > 0) ? (x.pred - x.es.pred) / x.es.pred * 100 : NaN;
  x.drop = (has(x.s0) && has(x.sn)) ? x.s0 - x.sn : NaN;
  x.dsp = (has(x.dist) && has(x.sn)) ? x.dist * x.sn / 100 : NaN;
  x.hrr1 = (has(x.hp) && has(x.h1)) ? x.hp - x.h1 : NaN;
  x.hrPct = (has(x.hp) && has(f.ctx.hrMax) && f.ctx.hrMax > 0) ? x.hp / f.ctx.hrMax * 100 : NaN;
  x.lowDist = (has(x.dist) && has(x.llnUse)) ? x.dist < x.llnUse : x.distCat === 'low';
  x.wnlDist = (has(x.dist) && has(x.llnUse)) ? x.dist >= x.llnUse : x.distCat === 'wnl';
  x.desat88 = (has(x.sn) && x.sn <= 88) || x.desatSel === 'le88';
  x.desat = x.desat88 || (has(x.drop) && x.drop >= 4) || x.desatSel === 'fall';
  x.noDesat = !x.desat && ((has(x.sn) && (has(x.drop) ? x.drop < 4 : x.sn > 88)) || x.desatSel === 'none');
  x.hrrAbn = has(x.hrr1) ? x.hrr1 <= 18 : x.hrrSel === 'abn';
  x.onO2 = x.o2 === 'o2';
  x.o2text = x.o2desc || (has(x.o2flow) ? 'supplemental oxygen at ' + fmt(x.o2flow, 1) + ' L/min' : (x.onO2 ? 'supplemental oxygen (device and setting not recorded)' : ''));
  x.any = has(x.dist) || has(x.sn) || has(x.s0) || has(x.hp) || x.distCat !== '' || x.desatSel !== '' || x.hrrSel !== '';
  f.trend6 = trendFacts(st, f);

  /* ---------------- CPET ---------------- */
  const cp = blankIf(on, st, 'cpet');
  f.cp = {
    mode: cp.mode || '', vo2pct: num(cp.vo2_pct), vo2: num(cp.vo2_abs), lt: num(cp.lt_pct), stop: cp.stop || '',
    hrp: num(cp.hr_peak), hrpct: num(cp.hr_pct), o2p: num(cp.o2p), hrr1: num(cp.hrr1),
    vemvv: num(cp.ve_mvv), slope: num(cp.vevco2), nadir: num(cp.vevco2_nadir), petco2: num(cp.petco2), vtic: num(cp.vtic),
    s0: num(cp.spo2_rest), sp: num(cp.spo2_peak), rer: num(cp.rer), bd: num(cp.borg_d), bl: num(cp.borg_l), lac: num(cp.lactate),
    effort: cp.effort || '', vo2c: cp.vo2_c || '', ltc: cp.lt_c || '', rerc: cp.rer_c || '', hrc: cp.hr_c || '', o2pc: cp.o2p_c || '', hrrc: cp.hrr_c || '',
    ventc: cp.vent_c || '', slopec: cp.slope_c || '', petco2c: cp.petco2_c || '', desatc: cp.desat_c || ''
  };
  const k = f.cp;
  if (!has(k.hrpct) && has(k.hrp) && has(f.ctx.hrMax) && f.ctx.hrMax > 0) k.hrpct = k.hrp / f.ctx.hrMax * 100;
  k.anyCat = [k.effort, k.vo2c, k.ltc, k.rerc, k.hrc, k.o2pc, k.hrrc, k.ventc, k.slopec, k.petco2c, k.desatc].some(x => x !== '');
  k.any = has(k.vo2pct) || has(k.vo2) || has(k.lt) || has(k.hrp) || has(k.o2p) || has(k.vemvv) || has(k.slope) || has(k.nadir) || has(k.sp) || has(k.rer) || k.anyCat;

  /* ---------------- blood gas ---------------- */
  const ga = blankIf(on, st, 'gas');
  f.gas = { ph: num(ga.ph), pco2: num(ga.paco2), po2: num(ga.pao2), hco3: num(ga.hco3), sao2: num(ga.sao2), fio2: num(ga.fio2), patm: num(ga.patm), cohb: num(ga.cohb),
            phC: ga.ph_c || '', co2C: ga.co2_c || '', hco3C: ga.hco3_c || '', o2C: ga.o2_c || '', fioC: ga.fio2_c || '', aaC: ga.aa_c || '' };
  const g = f.gas;
  g.fi = has(g.fio2) ? g.fio2 : 0.21; g.pb = has(g.patm) ? g.patm : 760;
  g.onO2 = has(g.fio2) ? g.fio2 > 0.21 : g.fioC === 'o2';
  g.aa = (has(g.po2) && has(g.pco2) && !(g.fioC === 'o2' && !has(g.fio2))) ? (g.fi * (g.pb - 47) - g.pco2 / 0.8) - g.po2 : NaN;
  g.aaMax = has(age) ? (f.ctx.eq.aa === 'p10' ? (age + 10) / 4 : age / 4 + 4) : NaN;
  g.phCat = has(g.ph) ? (g.ph < 7.35 ? 'acid' : (g.ph > 7.45 ? 'alk' : 'nl')) : g.phC;
  g.co2Cat = has(g.pco2) ? (g.pco2 > 45 ? 'hyper' : (g.pco2 < 35 ? 'hypo' : 'nl')) : g.co2C;
  g.hco3Cat = has(g.hco3) ? (g.hco3 > 26 ? 'hi' : (g.hco3 < 22 ? 'lo' : 'nl')) : g.hco3C;
  g.o2Cat = has(g.po2) ? (g.po2 < 60 ? 'hyp' : (g.po2 < 80 ? 'mild' : 'nl')) : g.o2C;
  g.hypoxC = g.o2Cat === 'hyp' && !g.onO2;
  g.hyperC = g.co2Cat === 'hyper';
  g.any = has(g.ph) || has(g.pco2) || has(g.po2) || has(g.hco3) || has(g.sao2) || g.phC !== '' || g.co2C !== '' || g.hco3C !== '' || g.o2C !== '' || g.aaC !== '';

  f.priors = [];
  if (on.prior) f.priors = priorFacts(st, f);
  f.prior = { any: f.priors.some(p => p.metrics.length > 0) };

  // derived booleans used by several modules
  f.obstruct = f.sp.ratio.low;
  f.hasTLC = f.vol.tlc.measured && !f.vol.tlc.invalid;
  f.hasVolInfo = f.vol.tlc.measured || f.vol.rvtlc.measured || f.vol.rv.measured || f.vol.frctlc.measured;
  f.poorEffort = (f.sp.effort === 'poor' || f.sp.effort === 'weak');
  f.sp.pat = spiroPattern(f);
  f.vol.pat = volPattern(f);
  f.dl.pat = dlcoPattern(f);
  f.F = deriveFacts(f);
  f.suggest = suggestions(f);
  return f;
}

/* ---------------------------------------------------------- spirometry pattern
   Returns the Annals ATS 2025 code plus the catalog pattern flags. Every flag needs the reliable measurements it names. */
function spiroPattern(f) {
  const s = f.sp, R = s.ratio, A = s.fev1, B = s.fvc, T = f.vol.tlc;
  const P_ = { code: null, codes: [], kind: 'none', lowFVC: false, lowFEV1: false, obstruct: false, noVolSuggest: false,
               normal: false, obstruction: false, preservedFev1: false, lowFvcUnconfirmed: false, nonspecific: false, mixed: false,
               obstLowFvcUnconfirmed: false, obstLowFvcNoRestr: false, restrictionSuggested: false, highTlcReview: false, indeterminate: false, reason: '' };
  if (!(R.measured || A.measured || B.measured)) return P_;
  const tlcKnown = T.measured && !T.invalid, tlcLow = tlcKnown && T.low, tlcNormal = tlcKnown && T.wnl, tlcHigh = tlcKnown && T.high;
  P_.lowFEV1 = A.low; P_.lowFVC = B.low;
  const anyInvalid = R.invalid || A.invalid || B.invalid;

  if (!R.measured) { P_.kind = 'noratio'; P_.reason = 'FEV1/FVC was not entered'; return P_; }
  if (R.invalid) { P_.kind = 'indeterminate'; P_.indeterminate = true; P_.reason = 'FEV1/FVC is not interpretable'; return P_; }

  if (R.low) {
    P_.obstruct = true; P_.obstruction = true; P_.kind = 'obstruction';
    if (A.measured && !A.invalid && A.wnl) P_.preservedFev1 = true;
    if (B.low && !B.invalid) {
      if (f.poorEffort) { P_.code = 'S33'; P_.kind = 'effort'; }
      else {
        P_.code = 'S32'; P_.kind = 'obstruction-lowFVC';
        if (tlcLow) { P_.mixed = true; }
        else if (tlcNormal || tlcHigh) { P_.obstLowFvcNoRestr = true; }
        else { P_.obstLowFvcUnconfirmed = true; P_.noVolSuggest = !tlcKnown; }
      }
    } else if ((B.high || A.high) && !B.invalid && !A.invalid) {
      P_.code = 'S34'; P_.kind = 'dysanapsis';
      if (tlcLow) P_.mixed = true;
    } else if (A.measured && !A.invalid) {
      P_.code = A.cat === 'sev' ? 'S23' : (A.cat === 'mod' ? 'S22' : 'S21');
      if (tlcLow) P_.mixed = true;
    } else {
      P_.code = 'S2';   // ratio low, FEV1 not usable: obstruction without a grade
      if (tlcLow) P_.mixed = true;
    }
    return P_;
  }

  // ratio preserved (normal or high)
  P_.kind = 'noobstruct';
  if (s.fvcUnder && !tlcLow) {
    // early termination can underestimate FVC and artificially preserve the ratio: no normal / nonspecific / restriction-suggestive conclusion
    P_.kind = 'indeterminate'; P_.indeterminate = true; P_.reason = 'early termination may have underestimated FVC and raised FEV1/FVC';
    if (A.low || B.low) P_.noVolSuggest = false;
    return P_;
  }
  if (anyInvalid) { P_.kind = 'indeterminate'; P_.indeterminate = true; P_.reason = (A.invalid ? 'FEV1' : 'FVC') + ' is not interpretable'; return P_; }
  if (A.low && B.low) {
    if (f.poorEffort) { P_.code = 'S33'; P_.kind = 'effort'; }
    else {
      P_.code = 'S31';
      if (tlcLow) { P_.kind = 'restriction'; P_.restrictionSuggested = true; }
      else if (tlcNormal) { P_.kind = 'nonspecific'; P_.nonspecific = true; }
      else if (tlcHigh) { P_.kind = 'highTlcReview'; P_.highTlcReview = true; }
      else { P_.kind = 'lowFvcUnconfirmed'; P_.lowFvcUnconfirmed = true; P_.restrictionSuggested = true; P_.noVolSuggest = true; }
    }
  } else if (A.low) {
    P_.code = 'S41'; P_.kind = 'isolatedFEV1';
    if (tlcNormal) P_.nonspecific = true;
    else if (tlcLow) P_.restrictionSuggested = true;
  } else if (B.low) {
    P_.code = 'S42';
    if (tlcLow) { P_.kind = 'restriction'; P_.restrictionSuggested = true; }
    else if (tlcNormal) { P_.kind = 'nonspecific'; P_.nonspecific = true; }
    else if (tlcHigh) { P_.kind = 'highTlcReview'; P_.highTlcReview = true; }
    else { P_.kind = 'isolatedFVC'; P_.lowFvcUnconfirmed = true; P_.restrictionSuggested = true; P_.noVolSuggest = true; }
  } else if (A.measured && B.measured && A.wnl && B.wnl) {
    const bl = R.bl || A.bl || B.bl;
    const concave = s.loop === 'concave';
    P_.normal = true;
    if (bl) { P_.code = 'S11'; P_.kind = 'borderline'; if (concave) P_.codes.push('S10'); }
    else if (concave) { P_.code = 'S10'; P_.kind = 'concave'; }
    else { P_.code = 'S1'; P_.kind = 'normal'; }
  } else {
    P_.kind = 'partial';   // one index missing, or FVC/FEV1 above the ULN with a preserved ratio
  }
  return P_;
}

/* ----------------------------------------------------------- volume pattern
   ERS/ATS 2022 Table 7 / Figure 10 and the catalog volume_patterns.* facts. "Fraction high" means RV/TLC above the ULN;
   "resting volume high" accepts FRC/TLC above the ULN or an FRC above its ULN (the Annals/ERS tables name both). */
function volPattern(f) {
  const v = f.vol, R = f.sp.ratio, ob = R.low && !R.invalid;
  const P_ = { code: null, codes: [], kind: 'none', sev: null, trap: false, hyper: false, lowRV: false, obstruct: ob,
               restriction: false, simple: false, complex: false, mixed: false, airTrapping: false, hyperinflation: false, hyperTlc: false, largeLungs: false,
               lowTlcHighRatio: false, rvHighFractionNormal: false, normal: false, unavailable: false, unclassified: false, fractionsMissing: false };
  if (!v.any) { P_.unavailable = true; return P_; }
  const T_ = v.tlc;
  if (T_.invalid) { P_.kind = 'invalid'; return P_; }
  const rvtlcHigh = v.rvtlc.measured && v.rvtlc.high, rvtlcNormal = v.rvtlc.measured && !v.rvtlc.high && !v.rvtlc.invalid;
  const restHigh = (v.frctlc.measured && v.frctlc.high) || (v.frc.measured && v.frc.high);
  const restNormal = (v.frctlc.measured && v.frctlc.wnl) || (!v.frctlc.measured && v.frc.measured && !v.frc.high && !v.frc.invalid);
  const restKnown = v.frctlc.measured || v.frc.measured;
  P_.trap = rvtlcHigh;
  P_.hyper = rvtlcHigh && restHigh;

  if (!T_.measured) {
    P_.unavailable = true; P_.kind = 'noTLC';
    if (rvtlcHigh) P_.kind = 'trapNoTLC';
    if (v.rv.low) P_.lowRVflag = true;
    return P_;
  }
  if (T_.low) {
    P_.restriction = true;
    P_.sev = T_.cat === 'sev' ? 'severe' : (T_.cat === 'mod' ? 'moderate' : 'mild');
    const i = T_.cat === 'sev' ? 2 : (T_.cat === 'mod' ? 1 : 0);
    if (ob) { P_.kind = 'mixed'; P_.mixed = true; P_.code = ['V13', 'V16', 'V19'][i]; }
    else if (rvtlcHigh) { P_.kind = 'complex'; P_.complex = true; P_.lowTlcHighRatio = true; P_.code = ['V12', 'V15', 'V18'][i]; }
    else if (rvtlcNormal && (restNormal || !restKnown)) { P_.kind = 'restriction'; P_.simple = true; P_.code = ['V11', 'V14', 'V17'][i]; P_.fractionsMissing = !restKnown; }
    else { P_.kind = 'restriction'; P_.code = ['V11', 'V14', 'V17'][i]; P_.fractionsMissing = !v.rvtlc.measured; }
    if (rvtlcHigh && ob) P_.lowTlcHighRatio = true;
    return P_;
  }
  if (T_.bl && !rvtlcHigh) { P_.kind = 'borderline'; P_.code = 'V10'; P_.normal = rvtlcNormal || !v.rvtlc.measured; return P_; }
  if (T_.high) {
    // an increased TLC with an increased RV/TLC is hyperinflation with air trapping (ERS/ATS 2022 Figure 10: the rise in TLC indicates loss of recoil);
    // only a known-normal resting volume demotes it to air trapping with a large TLC
    if (rvtlcHigh && (restHigh || !restKnown)) { P_.kind = 'hyperTlc'; P_.hyperTlc = true; P_.hyperinflation = true; P_.code = 'V20'; }
    else if (rvtlcHigh) { P_.kind = 'airtrapHighTlc'; P_.airTrapping = true; P_.code = 'V20'; }
    else if (rvtlcNormal && restNormal) { P_.kind = 'large'; P_.largeLungs = true; }
    else { P_.kind = 'highTlcUnclassified'; P_.unclassified = true; P_.fractionsMissing = true; }
    return P_;
  }
  // TLC within reference limits
  if (rvtlcHigh && restHigh) { P_.kind = 'hyper'; P_.hyperinflation = true; P_.code = 'V20'; }
  else if (rvtlcHigh) { P_.kind = 'airtrap'; P_.airTrapping = true; P_.code = 'V20'; }
  else if (!rvtlcNormal && v.rv.high) { P_.kind = 'rvHighNoFraction'; P_.fractionsMissing = true; }
  else if (rvtlcNormal && v.rv.high) { P_.kind = 'rvHighFractionNormal'; P_.rvHighFractionNormal = true; }
  else if (restHigh && rvtlcNormal) { P_.kind = 'frcHigh'; }
  else if (v.rv.low && !f.sp.ratio.low && !f.sp.fvc.low) { P_.kind = 'lowRV'; P_.lowRV = true; }
  else if (rvtlcNormal || (!v.rvtlc.measured && !v.rv.high)) { P_.kind = 'normal'; P_.normal = true; P_.code = 'V1'; P_.fractionsMissing = !v.rvtlc.measured; }
  else { P_.kind = 'partial'; }
  if (v.rv.low && !P_.lowRV) P_.lowRVflag = true;
  return P_;
}

/* -------------------------------------------------------------- DLCO pattern */
function dlcoPattern(f) {
  const d = f.dl;
  const P_ = { codes: [], kind: 'none', mech: '', hb: '' };
  if (!d.any) return P_;
  const D = d.dlco, ADJ = d.adjRes, UN = d.unadjRes;
  if (D.invalid) { P_.kind = 'invalid'; return P_; }
  if (D.measured) {
    if (D.low) { P_.codes.push(D.cat === 'sev' ? 'D23' : (D.cat === 'mod' ? 'D22' : 'D21')); P_.kind = 'low'; }
    else if (D.high) P_.kind = 'high';
    else if (D.bl) { P_.codes.push('D10'); P_.kind = 'bl'; }
    else { P_.codes.push('D1'); P_.kind = 'normal'; }
  }
  // hemoglobin basis (D3x / D6x): assessed on the unadjusted value when one is established; an unknown basis is stated, never assumed
  if (d.reportedAdjusted) { if (D.low) P_.hb = 'adjustedLow'; else if (D.high) P_.hb = 'adjustedHigh'; }
  else if (UN.measured && UN.low) {
    if (d.adj.measured && !d.adj.invalid) { P_.codes.push(d.adj.low ? 'D33' : 'D32'); P_.hb = d.adj.low ? 'partial' : 'full'; }
    else if (!d.hbKnown) { P_.codes.push('D31'); P_.hb = 'none'; }
    else P_.hb = 'noadj';
  } else if (UN.measured && UN.high) {
    if (d.adj.measured) { P_.codes.push(d.adj.high ? 'D63' : 'D62'); P_.hb = d.adj.high ? 'unexplained' : 'explained'; }
    else { P_.codes.push('D61'); P_.hb = 'none'; }
  } else if (D.measured && (D.low || D.high) && !d.basisKnown) { P_.hb = 'unknownBasis'; if (!d.hbKnown) P_.codes.push(D.low ? 'D31' : 'D61'); }
  const low = D.measured && D.low;
  const VA = d.va, K = d.kco;
  if (low) {
    if (VA.low && K.high) { P_.codes.push('D41'); P_.mech = 'lowVA_highKCO'; }
    else if (VA.low && K.wnl) { P_.codes.push('D42'); P_.mech = 'lowVA_normalKCO'; }
    else if (VA.low && K.low) { P_.codes.push('D42'); P_.mech = 'lowVA_lowKCO'; }
    else if (VA.low && !K.measured) P_.mech = 'vaOnly';
    else if ((VA.wnl || VA.high) && K.low) P_.mech = 'normalVA_lowKCO';
    else if ((VA.wnl || VA.high) && K.wnl) P_.mech = 'allNormalExceptDLCO';
    else if ((VA.wnl || VA.high) && K.high) P_.mech = 'discordantK';
    else if (!VA.measured && K.measured) P_.mech = 'kOnly';
  } else if (D.wnl && VA.low && K.high) P_.mech = 'incompleteWNL';
  if (d.vatlcLow) P_.codes.push('D51');
  return P_;
}

/* ------------------------------------------------------ methacholine states
   PD20/PC20 categories (ERS 2017) share printed endpoints; a value sitting exactly on one is not auto-assigned. */
const MCH_BANDS = { pd20: [[400, 'normal'], [100, 'borderline'], [25, 'mild'], [6, 'moderate']], pc20: [[16, 'normal'], [4, 'borderline'], [1, 'mild'], [0.25, 'moderate']] };
function mchAutoCategory(unit, v) {
  const bands = MCH_BANDS[unit === 'pd20' ? 'pd20' : 'pc20'];
  for (let i = 0; i < bands.length; i++) { if (v === bands[i][0]) return { cat: null, boundary: bands[i][0], between: [bands[i][1], i + 1 < bands.length ? bands[i + 1][1] : 'marked'] }; if (v > bands[i][0]) return { cat: bands[i][1] }; }
  return { cat: 'marked' };
}
function methacholineFacts(q) {
  const o = { state: 'unknown', cat: null, catSrc: '', boundary: null, pd20: null, pc20: null, exceeds: null, reached: false };
  if (q.type !== 'mch' || !q.any) return o;
  const labCat = ({ neg: 'normal', bl: 'borderline', mild: 'mild', mod: 'moderate', marked: 'marked' })[q.mchCat] || null;
  const reachedByValue = has(q.mchVal) && !q.mchNeg;
  const reachedByFall = has(q.mchFall) && q.mchFall >= 20;
  const reached = reachedByValue || reachedByFall || (labCat && labCat !== 'normal');
  o.reached = reached;
  const aboveRange = reachedByValue && mchAutoCategory(q.unit, q.mchVal).cat === 'normal' && !labCat;   // a 20% fall only above the range that defines hyperresponsiveness
  if (q.indet) o.state = 'indeterminate';
  else if (q.diluent) o.state = 'diluent_response';
  else if (reached && !aboveRange) o.state = 'positive';
  else if (aboveRange) o.state = q.complete === 'n' ? 'incomplete' : 'negative';
  else if (q.mchNeg || labCat === 'normal' || (has(q.mchFall) && q.mchFall < 20 && q.complete === 'y')) o.state = q.complete === 'n' ? 'incomplete' : 'negative';
  else if (q.complete === 'n') o.state = 'incomplete';
  if (reachedByValue) {
    if (q.unit === 'pd20') o.pd20 = q.mchVal; else o.pc20 = q.mchVal;
    const a = mchAutoCategory(q.unit, q.mchVal);
    if (labCat) { o.cat = labCat; o.catSrc = 'lab'; }
    else if (a.cat) { o.cat = a.cat; o.catSrc = 'auto'; }
    else { o.boundary = a; }
  } else if (labCat) { o.cat = labCat; o.catSrc = 'lab'; }
  if (q.mchNeg && has(q.mchMax)) o.exceeds = q.mchMax;
  return o;
}

/* ------------------------------------------------------ the findings map F
   Exact keys of the phrase catalog. Only facts that are established are written; a missing key fails every match. */
function deriveFacts(f) {
  const F = {};
  const put = (k, v) => { if (v !== null && v !== undefined) F[k] = v; };
  const s = f.sp, R = s.ratio, A = s.fev1, B = s.fvc, sp = s.pat, v = f.vol, vp = v.pat, d = f.dl, dp = d.pat, b = f.bd, m = f.mp;
  const spOn = f.on.spiro, volOn = f.on.vol, dlOn = f.on.dlco;

  /* quality observations (documented only) */
  const lim = s.limits || [];
  const gradeOk = (g) => g === 'A' || g === 'B';
  if (spOn && s.qual1 && s.qual2 && gradeOk(s.qual1) && gradeOk(s.qual2) && !lim.length) put('observations.quality.acceptable', true);
  if (spOn && s.qual1 && s.qual2) put('observations.quality.grade', true);
  if (spOn && (s.qual1 === 'F' || s.qual2 === 'F')) put('observations.quality.invalid', true);
  if (spOn && [s.qual1, s.qual2].some(g => g === 'U' || g === 'C' || g === 'D' || g === 'E')) put('observations.quality.usable', true);
  const limMap = { repeat: 'limited_repeatability', early: 'early_termination', cough: 'cough_first_second', insp: 'incomplete_inspiration', slow: 'slow_start', leak: 'leak', glottic: 'glottic_closure', varef: 'variable_effort', fatigue: 'fatigue', symptom: 'symptoms' };
  if (spOn) lim.forEach(k => { if (limMap[k]) put('observations.quality.' + limMap[k], true); });
  if (spOn && s.loop === 'early' && lim.indexOf('early') < 0) put('observations.quality.early_termination', true);
  if (spOn && s.loop === 'cough' && lim.indexOf('cough') < 0) put('observations.quality.cough_first_second', true);
  if (spOn && s.loop === 'slow' && lim.indexOf('slow') < 0) put('observations.quality.slow_start', true);
  if (volOn && v.qc === 'limited') put('observations.quality.volume_limited', true);
  if (dlOn && d.qc === 'limited') put('observations.quality.dlco_limited', true);
  if (dlOn && d.single) put('observations.quality.dlco_single', true);
  if (f.on.mip && (m.effort === 'poor' || m.effort === 'bulbar')) put('observations.quality.pressure_limited', true);
  if (f.on.mip && m.effort === 'bulbar') put('observations.bulbar_pressure_limitation', true);

  /* spirometry states */
  if (spOn) {
    put('spirometry.fev1_state', A.state); put('spirometry.fvc_state', B.state); put('spirometry.ratio_state', R.state);
    put('spirometry.fev1_severity', A.sevState); put('spirometry.fvc_severity', B.sevState);
    if (R.measured && !R.invalid) put('spirometry.ratio_near_lln', !!R.bl);
    if (has(s.ratioCalc) && R.measured && !R.invalid) {
      const fixed = s.ratioCalc < 0.70;
      put('spirometry.fixed_ratio_discordance', fixed && !R.low ? 'fixed_only' : (!fixed && R.low ? 'lln_only' : 'none'));
    }
    if (s.fef.measured && !s.fef.invalid) {
      put('observations.flow.fef_low', s.fef.low); put('observations.flow.fef_normal', s.fef.wnl || s.fef.high);
      put('observations.flow.fef_isolated', s.fef.low && sp.normal);
    }
  }
  if (volOn && v.svc.measured) put('spirometry.svc_state', v.svc.state);
  if (volOn && spOn && has(v.svcL) && has(s.fvcL) && (v.svcL - s.fvcL) * 1000 > 100) put('observations.svc_exceeds_fvc', true);

  /* patterns */
  if (spOn && s.any) {
    put('patterns.normal', sp.normal && !sp.indeterminate);
    put('patterns.obstruction', sp.obstruction);
    put('patterns.obstruction_preserved_fev1', sp.obstruction && sp.preservedFev1);
    put('patterns.low_fvc_unconfirmed', sp.lowFvcUnconfirmed);
    put('patterns.nonspecific', sp.nonspecific);
    put('patterns.mixed', sp.mixed);
    put('patterns.obstruction_low_fvc_unconfirmed', sp.obstLowFvcUnconfirmed);
    put('patterns.obstruction_low_fvc_no_restriction', sp.obstLowFvcNoRestr);
    if (sp.obstruction) put('patterns.obstruction_severity', A.measured && !A.invalid ? (A.sev || 'preserved') : 'unknown');
  }
  if (volOn && v.any) {
    put('patterns.restriction', vp.restriction);
    put('patterns.simple_restriction', vp.simple);
    put('patterns.complex_restriction', vp.complex);
    if (!sp.mixed) put('patterns.mixed', vp.mixed || sp.mixed);
  }

  /* bronchodilator */
  if (f.on.bd && b.any) {
    put('bronchodilator.response', b.response);
    put('bronchodilator.current_computable', b.currentComputable);
    put('bronchodilator.obstruction_status', b.obstructionStatus);
    put('patterns.normal_baseline_bd_positive', sp.normal && b.sig);
    if (b.held === 'n') put('observations.bd_medication_not_withheld', true);
    if (b.legacyAvail) put('observations.bd_legacy_profile_selected', true);
    if (b.discordant) put('observations.bd_criteria_discordant', true);
    if (b.anyDecrease) put('observations.bd_decrease', true);
    if (b.subthreshold) put('observations.bd_subthreshold_increase', true);
  } else if (spOn && s.any && f.on.bd) put('bronchodilator.response', 'not_performed');

  /* lung volumes */
  if (volOn && v.any) {
    put('volumes.tlc_state', v.tlc.state); put('volumes.rv_state', v.rv.state); put('volumes.frc_state', v.frc.state);
    put('volumes.erv_state', v.erv.state); put('volumes.ic_state', v.ic.state);
    if (v.rvtlc.measured) put('volumes.rv_tlc_state', v.rvtlc.invalid ? 'invalid' : (v.rvtlc.high ? 'high' : 'normal'));
    if (v.frctlc.measured) put('volumes.frc_tlc_state', v.frctlc.invalid ? 'invalid' : (v.frctlc.high ? 'high' : 'normal'));
    put('volume_patterns.normal', vp.normal);
    put('volume_patterns.air_trapping', vp.airTrapping);
    put('volume_patterns.hyperinflation', vp.hyperinflation && !vp.hyperTlc);
    put('volume_patterns.hyperinflation_tlc', vp.hyperTlc);
    put('volume_patterns.large_lungs', vp.largeLungs);
    put('volume_patterns.low_tlc_high_ratio', vp.lowTlcHighRatio);
    put('volume_patterns.rv_high_fraction_normal', vp.rvHighFractionNormal);
    put('volume_patterns.unavailable', false);
  } else if (spOn && s.any) put('volume_patterns.unavailable', true);

  /* diffusion */
  if (dlOn && d.any) {
    put('diffusion.dlco_state', d.dlco.state);
    put('diffusion.dlco_severity', d.dlco.sevState);
    if (d.va.measured) put('diffusion.va_state', d.va.state);
    if (d.kco.measured) put('diffusion.kco_state', d.kco.state);
    const low = d.dlco.low, VA = d.va, K = d.kco, known = (r) => r.measured && !r.invalid;
    put('diffusion_patterns.low_dlco_normal_va_low_kco', low && known(VA) && known(K) && VA.wnl && K.low);
    put('diffusion_patterns.low_dlco_low_va_low_kco', low && known(VA) && known(K) && VA.low && K.low);
    put('diffusion_patterns.low_dlco_low_va_normal_kco', low && known(VA) && known(K) && VA.low && K.wnl);
    put('diffusion_patterns.low_dlco_low_va_high_kco', low && known(VA) && known(K) && VA.low && K.high);
    if (d.vatlcLow) put('diffusion_patterns.low_va_tlc', true);
    if (d.vatlcOk) put('diffusion_patterns.preserved_va_tlc', true);
    if (d.dlco.measured) {
      if (d.hasAdj) put('observations.dlco.hb_adjusted', true);
      else if (d.basis === 'un') put('observations.dlco.hb_unadjusted', true);
      else put('observations.dlco.hb_unknown', true);
      if (d.unadjRes.measured && d.unadjRes.low && d.basis === 'un' && !d.adj.measured && d.anemic === true) put('observations.dlco.anemia', true);
      if (d.unadjRes.measured && d.unadjRes.low && d.adj.measured && d.adj.wnl) put('observations.dlco.normalized_with_hb', true);
      if ((d.unadjRes.measured && d.unadjRes.low && d.adj.measured && d.adj.low) || (d.reportedAdjusted && d.dlco.low)) put('observations.dlco.low_despite_hb', true);
      if (d.cohbHigh || (f.ctx.smoke === 'current' && d.dlco.low)) put('observations.dlco.smoking_cohb', true);
    }
    const spiroNormal = spOn && s.any && sp.normal && !sp.indeterminate;
    const volNormal = volOn && v.any && vp.normal;
    put('patterns.isolated_low_dlco', low && spiroNormal && volNormal);
  } else if (spOn && s.any && f.on.dlco) put('diffusion.dlco_state', 'not_measured');

  /* respiratory muscle */
  if (f.on.mip && m.any) {
    put('muscle.mip_state', m.mip); put('muscle.mep_state', m.mep); put('muscle.snip_state', m.snip);
    const known = (x) => x === 'low' || x === 'normal';
    put('muscle_patterns.both_low', known(m.mip) && known(m.mep) && m.mip === 'low' && m.mep === 'low');
    put('muscle_patterns.both_normal', known(m.mip) && known(m.mep) && m.mip === 'normal' && m.mep === 'normal');
    put('muscle_patterns.mip_low_mep_preserved', known(m.mip) && known(m.mep) && m.mip === 'low' && m.mep === 'normal');
    put('muscle_patterns.mep_low_mip_preserved', known(m.mip) && known(m.mep) && m.mep === 'low' && m.mip === 'normal');
    if (has(m.cpf)) put('observations.pcf_measured', true);
    if (m.cpfCat === 'vlow' || m.cpfCat === 'low') put('observations.pcf_below_context_threshold', true);
  }
  if (f.on.post && f.post.any) {
    put('muscle.supine_drop_computable', f.post.dropComputable);
    if (f.post.limited) put('observations.supine_vc_limited', true);
  }

  /* challenge */
  if (f.on.bronch && f.br.any) {
    const q = f.br;
    if (q.type === 'mch') {
      const mc = q.mch;
      put('challenge.methacholine_state', mc.state);
      put('challenge.pd20_reportable', mc.pd20 !== null && has(mc.pd20));
      put('challenge.pc20_reportable', mc.pc20 !== null && has(mc.pc20));
      put('challenge.pd20_exceeds_max', q.unit === 'pd20' && mc.exceeds !== null && has(mc.exceeds));
      put('challenge.pc20_exceeds_max', q.unit !== 'pd20' && mc.exceeds !== null && has(mc.exceeds));
      if (mc.cat && mc.cat !== 'normal') put('observations.methacholine_ahr_category', mc.cat);
      if (q.held === 'n') put('observations.challenge_medication_limit', true);
      if (has(q.recPct) || q.rev === 'y') put('observations.challenge_recovery_documented', true);
    } else {
      const st_ = exerciseState(q);
      if (q.type === 'man') { put('challenge.mannitol_state', st_.state); put('challenge.mannitol_pd15_reportable', st_.state === 'positive' && has(q.manDose) && has(q.manFall) && q.manFall >= 15); }
      else if (q.type === 'evh') put('challenge.evh_state', st_.state);
      else { put('challenge.exercise_state', st_.state); put('challenge.exercise_fall_reportable', has(q.exFall)); }
    }
  }

  /* FeNO (adult ATS 2011 categories; children use the separate paediatric cut-points and are not given an adult category) */
  if (f.on.feno && f.feno.any) {
    const fb = fenoBand(f);
    if (!f.feno.child) put('feno.adult_category', fb.cat);
    if (f.feno.ics === 'y' && fb.cat === 'low') put('observations.feno_ics_context', true);
    if (f.feno.ics === 'y' && fb.cat === 'high') put('observations.feno_high_on_ics', true);
    if (f.feno.confound) put('observations.feno_quality_limit', true);
  }

  /* resistance, oscillometry */
  if (f.on.raw && f.raw.any) {
    const rw = f.raw;
    if (rw.raw.measured || rw.sraw.measured) { put('observations.resistance.raw_high', rw.raw.high || rw.sraw.high); put('observations.resistance.raw_normal', !(rw.raw.high || rw.sraw.high)); }
    if (rw.sgaw.measured) { put('observations.resistance.sgaw_low', rw.sgaw.low); put('observations.resistance.sgaw_normal', !rw.sgaw.low); }
    if (rw.bd === 'imp') put('observations.resistance.response', true);
  }
  if (f.on.osc && f.osc.any) {
    const o = f.osc;
    const abn = o.r5.high || o.r520.high || o.x5.low || o.ax.high || o.fres.high;
    put('observations.oscillometry.normal', !abn);
    if (o.r5.high) put('observations.oscillometry.r5_high', true);
    if (o.r520.high) put('observations.oscillometry.frequency_dependence', true);
    if (o.x5.low) put('observations.oscillometry.x5_low', true);
    if (o.ax.high) put('observations.oscillometry.ax_high', true);
    if (o.fres.high) put('observations.oscillometry.fres_high', true);
    if (o.bdr === 'pos') put('observations.oscillometry.bd_response', true);
  }

  /* walk test */
  if (f.on.sixmw && f.six.any) {
    const x = f.six;
    if (has(x.dist)) put('observations.walk.distance', true);
    if (x.lowDist) put('observations.walk.distance_low', true);
    if (x.desat) put('observations.walk.desaturation', true);
    if (x.noDesat) put('observations.walk.no_desaturation', true);
    if (x.onO2) put('observations.walk.oxygen', true);
    if (x.stop === 'early') put('observations.walk.stopped', true);
  }

  /* serial comparison: observations only when the two studies are comparable for that measure */
  if (f.on.prior) {
    if (!f.prior.any) put('observations.serial.no_prior', true);
    f.priors.forEach(p => {
      if (!p.metrics.length) return;
      if (p.cmp.ref) put('observations.serial.reference_changed', true);
      if (p.cmp.bd) put('observations.serial.bd_state_changed', true);
      if (p.cmp.method) put('observations.serial.method_changed', true);
      if (p.cmp.hb) put('observations.serial.hb_changed', true);
      if (p.cmp.qual) put('observations.serial.quality_changed', true);
      p.metrics.forEach(mm => {
        if (!mm.comparable) return;
        if (mm.k === 'fev1') put('observations.serial.fev1_' + (mm.dAbs < 0 ? 'down' : 'up'), mm.dAbs !== 0 ? true : undefined);
        if (mm.k === 'fvc') put('observations.serial.fvc_' + (mm.dAbs < 0 ? 'down' : 'up'), mm.dAbs !== 0 ? true : undefined);
        if (mm.k === 'tlc' && mm.dAbs < 0) put('observations.serial.tlc_down', true);
        if (mm.k === 'dlco') put('observations.serial.dlco_' + (mm.dAbs < 0 ? 'down' : 'up'), mm.dAbs !== 0 ? true : undefined);
        if (mm.pp) { put('observations.serial.absolute_pp', true); if (has(mm.relOfPct)) put('observations.serial.relative', true); }
        else if (has(mm.dPct)) put('observations.serial.relative', true);
      });
      if (p.newObstruction) put('observations.serial.new_obstruction', true);
      if (p.newRestriction) put('observations.serial.new_restriction', true);
    });
  }

  /* integrated impressions: conjunctions of verified facts across the routine domains */
  const spiroNormal = spOn && s.any && sp.normal && !sp.indeterminate;
  const volNormal = volOn && v.any && vp.normal;
  const dlcoKnown = dlOn && d.any && d.dlco.measured && !d.dlco.invalid;
  const dlcoNormal = dlcoKnown && d.dlco.wnl, dlcoLow = dlcoKnown && d.dlco.low;
  const obstruction = spOn && sp.obstruction, restriction = volOn && vp.restriction && !sp.obstruction, mixed = (sp.mixed || vp.mixed);
  put('integrated.all_normal', spiroNormal && volNormal && dlcoNormal);
  put('integrated.spiro_only_normal', spiroNormal && !volOn && !dlOn);
  put('integrated.obstruction_normal_dlco', obstruction && !mixed && dlcoNormal);
  put('integrated.obstruction_low_dlco', obstruction && !mixed && dlcoLow);
  put('integrated.obstruction_trapping', obstruction && !mixed && volOn && vp.airTrapping);
  put('integrated.obstruction_hyperinflation', obstruction && !mixed && volOn && vp.hyperinflation);
  put('integrated.restriction_normal_dlco', restriction && dlcoNormal);
  put('integrated.restriction_low_dlco', restriction && dlcoLow);
  put('integrated.mixed_low_dlco', mixed && dlcoLow);
  put('integrated.nonspecific_low_dlco', spOn && sp.nonspecific && dlcoLow);
  put('integrated.isolated_diffusion', dlcoLow && spiroNormal && volNormal);

  /* review facts: written only when the clinician has tapped the suggestion (never from a number) */
  const rv = f.review || {};
  REVIEW_PHRASES.forEach(r => { if (rv[r.id]) { const cp = catPhrase(r.id); if (cp) put(cp.fact, cp.value); } });
  return F;
}

function exerciseState(q) {
  if (q.type === 'man') {
    if ((has(q.manFall) && q.manFall >= 15 && !(has(q.manDose) && q.manDose > 635)) || q.manIncr || q.manRes === 'pos') return { state: 'positive' };
    if (q.manRes === 'neg' || (has(q.manFall) && q.manFall < 15 && has(q.manDose) && q.manDose >= 635)) return { state: 'negative' };
    return { state: 'unknown' };
  }
  if (has(q.exFall)) {
    if (q.exFall >= 10 && q.exConsec) return { state: 'positive' };
    if (q.exFall >= 10) return { state: 'incomplete' };
    return { state: 'negative' };
  }
  if (q.exConsec) return { state: 'positive' };
  if (q.exRes === 'neg') return { state: 'negative' };
  if (q.exRes === 'ind') return { state: 'incomplete' };
  if (q.exRes === 'mild' || q.exRes === 'mod' || q.exRes === 'sev') return { state: 'positive' };
  return { state: 'unknown' };
}

/* FeNO cut-points (ATS 2011): adults < 25 / 25–50 / > 50 ppb inclusive of both endpoints in the intermediate band; children under 12: 20 / 35. */
function fenoBand(f) {
  const v = f.feno.v, child = f.feno.child;
  const lo = child ? 20 : 25, hi = child ? 35 : 50;
  if (!has(v)) return { lo: lo, hi: hi, cat: ({ low: 'low', int: 'intermediate', high: 'high' })[f.feno.bandSel] || 'intermediate', fromSel: true };
  return { lo: lo, hi: hi, cat: v < lo ? 'low' : (v > hi ? 'high' : 'intermediate'), fromSel: false };
}

/* ---------------------------------------------------- review-only suggestions
   Catalog phrases in "review" mode are never inserted automatically. When the facts make one relevant it is offered on
   the Report step; tapping it records the clinician's selection, which is what the catalog fact then stands for. */
const REVIEW_PHRASES = [
  { id: 'pattern.dysanapsis', when: (f) => f.sp.pat.kind === 'dysanapsis' || (f.sp.ratio.low && f.sp.fev1.wnl && f.sp.fvc.high) },
  { id: 'pattern.prism', when: (f) => f.sp.pat.lowFvcUnconfirmed && f.sp.fev1.low && (f.ctx.smoke === 'current' || f.ctx.smoke === 'former') },
  { id: 'impression.emphysema_context', when: (f) => f.sp.pat.obstruction && f.on.vol && (f.vol.pat.hyperinflation || f.vol.pat.airTrapping) && f.on.dlco && f.dl.dlco.low },
  { id: 'impression.extrapulmonary_context', when: (f) => f.on.vol && f.vol.pat.restriction && !f.sp.pat.obstruction && f.on.dlco && (f.dl.dlco.wnl || f.dl.kco.high) },
  { id: 'impression.parenchymal_context', when: (f) => f.on.vol && f.vol.pat.restriction && !f.sp.pat.obstruction && f.on.dlco && f.dl.dlco.low && (f.dl.kco.low || f.dl.kco.wnl || !f.dl.kco.measured) },
  { id: 'dlco.isolated_differential', when: (f) => f.F && f.F['patterns.isolated_low_dlco'] === true },
  { id: 'dlco.elevated_context', when: (f) => f.on.dlco && f.dl.dlco.high },
  { id: 'volume.low_erv_context', when: (f) => f.on.vol && f.vol.erv.low && f.vol.tlc.wnl },
  { id: 'muscle.low_pressures_restriction', when: (f) => f.on.mip && (f.mp.mip === 'low' || f.mp.mep === 'low') && f.on.vol && f.vol.pat.restriction },
  { id: 'muscle.supine_concerning', when: (f) => f.on.post && f.post.ge15 },
  { id: 'muscle.supine_no_excess', when: (f) => f.on.post && f.post.dropComputable && f.post.drop < 15 },
  { id: 'bd.fvc_only_mechanism', when: (f) => f.on.bd && f.bd.response === 'fvc' },
  { id: 'bd.subthreshold', when: (f) => f.on.bd && f.bd.subthreshold },
  { id: 'bd.decrease', when: (f) => f.on.bd && f.bd.anyDecrease },
  { id: 'methacholine.negative_context', when: (f) => f.on.bronch && f.br.type === 'mch' && f.br.mch.state === 'negative' },
  { id: 'diffusion.va_expansion_context', when: (f) => f.on.dlco && f.dl.va.low && (f.dl.kco.high || f.dl.kco.wnl) },
  { id: 'serial.stable_reviewed', when: (f) => f.on.prior && f.prior.any && !f.priors.some(p => p.metrics.some(m => m.comparable && ((/^(fev1|fvc)$/.test(m.k) && Math.abs(m.dPct) >= 15) || (m.pp && Math.abs(m.dAbs) >= 5) || (m.k === 'six' && Math.abs(m.dAbs) >= 30)))) },
  { id: 'followup.volumes', when: (f) => f.sp.pat.lowFvcUnconfirmed || f.sp.pat.obstLowFvcUnconfirmed },
  { id: 'followup.repeat_quality', when: (f) => f.sp.relF !== 'ok' || f.sp.relV !== 'ok' || f.poorEffort },
  { id: 'followup.hb', when: (f) => f.on.dlco && f.dl.dlco.low && !f.dl.hasAdj },
  { id: 'followup.airway', when: (f) => f.on.fvl && (f.fvl.loop === 'expflat' || f.fvl.loop === 'inspflat' || f.fvl.loop === 'bothflat') && f.fvl.repro },
  { id: 'followup.muscle', when: (f) => f.on.mip && (f.mp.mip === 'low' || f.mp.mep === 'low' || f.mp.snip === 'low') },
  { id: 'followup.challenge', when: (f) => f.sp.pat.normal && (f.ctx.hasInd('asthma') || f.ctx.hasInd('wheeze') || f.ctx.hasInd('cough')) && !f.on.bronch },
  { id: 'followup.correlate', when: (f) => f.sp.any || f.vol.any || f.dl.any }
];
function suggestions(f) {
  const out = [];
  REVIEW_PHRASES.forEach(r => {
    const cp = catPhrase(r.id); if (!cp) return;
    let rel = false; try { rel = !!r.when(f); } catch (e) { rel = false; }
    const on = !!(f.review && f.review[r.id]);
    if (rel || on) out.push({ id: r.id, label: cp.label, section: cp.sec, on: on, relevant: rel, text: ptext(r.id, 'standard', {}) || ptext(r.id, 'concise', {}) });
  });
  return out;
}
