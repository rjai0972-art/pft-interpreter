/* ==========================================================================
   PFT Interpreter engine — part 3: prior comparison + section writers
   Each writer returns { key, title, lines[], codes[], impr[], empty }.
   Sections report facts (measurement states with their numbers, documented
   quality, documented observations); the synthesis is written in part 4.
   Wording comes from the phrase catalog at the chosen level, with the
   z-score added in parentheses when it is known.
   ========================================================================== */

function hyperCtx(f) { const vp = f.vol.pat; return !!(vp.hyperinflation || (f.sp.ratio.low && vp.airTrapping)); }
function newSec(key, title) { return { key: key, title: title, lines: [], codes: [], impr: [], empty: false }; }
function put(sec, s) { const t = sentence(s); if (t) sec.lines.push(t); }
function pctTxt(x) { return has(x) ? Math.round(x) + '% predicted' : ''; }
function uniq(a) { const o = []; a.forEach(x => { if (x && o.indexOf(x) < 0) o.push(x); }); return o; }
const SEV_ADV = { mild: 'mildly', moderate: 'moderately', severe: 'severely' };

/* Placeholder values the catalog templates may ask for. Only what was entered or computed from entries; nothing is estimated here. */
function placeholderValues(f) {
  const s = f.sp, v = f.vol, d = f.dl, b = f.bd, m = f.mp, x = f.six, q = f.br, V = {};
  const set = (k, val, dec) => { if (has(val)) V[k] = fmt(val, dec); };
  const setZ = (k, r) => { if (r && r.z !== null) V[k] = fz(r.z); };
  set('fev1_L', s.fev1L, 2); set('fvc_L', s.fvcL, 2); set('fev1_pct_pred', s.fev1pct, 0); set('fvc_pct_pred', s.fvcpct, 0);
  setZ('fev1_z', s.fev1); setZ('fvc_z', s.fvc); setZ('ratio_z', s.ratio);
  if (has(s.ratioCalc)) V.ratio_percent = fmt(s.ratioCalc * 100, 0);
  set('svc_L', v.svcL, 2); setZ('svc_z', v.svc);
  set('tlc_L', v.tlcL, 2); setZ('tlc_z', v.tlc); set('rv_L', v.rvL, 2); setZ('rv_z', v.rv); set('frc_L', v.frcL, 2); setZ('frc_z', v.frc);
  setZ('erv_z', v.erv); setZ('ic_z', v.ic); setZ('rv_tlc_z', v.rvtlc); setZ('frc_tlc_z', v.frctlc);
  if (has(v.rvtlcCalc)) V.rv_tlc_percent = fmt(v.rvtlcCalc, 0);
  set('dlco_value', d.abs, 1); if (has(d.abs)) V.dlco_units = 'mL/min/mmHg'; set('dlco_pct_pred', d.pct, 0); setZ('dlco_z', d.dlco);
  set('va_value', d.vaL, 2); if (has(d.vaL)) V.va_units = 'L'; setZ('va_z', d.va); setZ('kco_z', d.kco);
  if (has(d.vatlc)) V.va_tlc_percent = fmt(d.vatlc * 100, 0);
  set('bd_fev1_delta_mL', b.dFmL, 0); set('bd_fvc_delta_mL', b.dVmL, 0);
  if (has(b.dF)) V.bd_fev1_pred_pct = pctPrecise(b.dF); if (has(b.dV)) V.bd_fvc_pred_pct = pctPrecise(b.dV);
  set('bd_fev1_baseline_pct', b.dFbase, 1); set('bd_fvc_baseline_pct', b.dVbase, 1);
  set('pre_fev1_L', b.f1pre, 2); set('post_fev1_L', b.f1post, 2); set('pre_fvc_L', b.vpre, 2); set('post_fvc_L', b.vpost, 2);
  if (b.discordant) { V.bd_met_profile = b.sig ? 'the current (> 10% of predicted)' : 'the legacy (≥ 12% and ≥ 200 mL from baseline)'; V.bd_unmet_profile = b.sig ? 'the legacy (≥ 12% and ≥ 200 mL from baseline)' : 'the current (> 10% of predicted)'; }
  if (f.sp.qual1 && f.sp.qual2) { V.fev1_grade = f.sp.qual1; V.fvc_grade = f.sp.qual2; }
  set('mip_display_cmH2O', m.mipV, 0); set('mep_display_cmH2O', m.mepV, 0); set('snip_display_cmH2O', m.snipV, 0);
  set('mip_magnitude_lln_cmH2O', m.thr.mip, 0); set('mep_magnitude_lln_cmH2O', m.thr.mep, 0); set('snip_magnitude_lln_cmH2O', m.thr.snip, 0);
  set('pcf_L_min', m.cpf, 0);
  if (f.post.dropComputable) { V.supine_vc_drop_pct = fmt(f.post.drop, 1); set('upright_vc_L', f.post.up, 2); set('supine_vc_L', f.post.sup, 2); }
  if (q.type === 'mch' && q.mch) {
    if (q.mch.pd20 !== null && has(q.mch.pd20)) { V.pd20_value = fmt(q.mch.pd20, q.mch.pd20 < 10 ? 1 : 0); V.pd20_unit = 'µg'; }
    if (q.mch.pc20 !== null && has(q.mch.pc20)) V.pc20_mg_mL = fmt(q.mch.pc20, q.mch.pc20 < 1 ? 2 : 1);
    if (q.protocol === 'wright2') V.methacholine_protocol = 'the English Wright two-minute tidal-breathing protocol';
    if (q.mch.exceeds !== null && has(q.mch.exceeds)) { if (q.unit === 'pd20') { V.max_pd_value = fmt(q.mch.exceeds, 0); V.max_pd_unit = 'µg'; } else V.max_pc20_mg_mL = fmt(q.mch.exceeds, q.mch.exceeds < 1 ? 2 : 0); }
    set('recovery_pct_baseline', q.recPct, 0);
  }
  if (q.type === 'ex' || q.type === 'evh') set('exercise_fev1_fall_pct', q.exFall, 1);
  if (q.type === 'man') set('mannitol_pd15_mg', q.manDose, 0);
  set('feno_ppb', f.feno.v, 0);
  set('walk_distance_m', x.dist, 0); set('walk_baseline_spo2', x.s0, 0); set('walk_nadir_spo2', x.sn, 0); set('walk_duration_min', x.timeMin, 1);
  if (x.o2text) V.walk_oxygen_description = x.o2text; if (x.stopWhy) V.walk_limiting_symptom = x.stopWhy;
  return V;
}
/* A bronchodilator change near the 10% threshold keeps enough precision that the printed number agrees with the decision. */
function pctPrecise(x) { const r1_ = fmt(x, 1); return (r1_ === '10.0' && x !== 10) ? fmt(x, 2) : r1_; }

/* Metric sentence from the catalog: the severity phrase for a graded low value, otherwise the state phrase; z-score appended. */
function withZ(text, r) {
  if (!text || !r || r.z === null) return text;
  const t = text.replace(/\.$/, '');
  return /z-score [-+\u2212]?\d/.test(t) ? t + '.' : t + ' (' + r.zTxt + ').';
}
/* "." before a parenthetical note: "FVC is reduced (reduced confidence)." */
function note(text, extra) { if (!text) return text; if (!extra) return text; return text.replace(/\.$/, '') + ' (' + extra + ').'; }
const METRIC_STYLE = { concise: 'concise', standard: 'concise', expanded: 'expanded', numeric: 'numeric' };
function metricLine(f, base, r, name) {
  if (!r || !r.measured) return '';
  if (r.invalid) return name + ' is not interpretable (the maneuver did not meet quality criteria)' + (r.zTxt ? ' (' + r.zTxt + ')' : '') + '.';
  const V = f.vals, style = METRIC_STYLE[f.style] || 'concise';
  let id = null;
  if (r.low && r.sev && catPhrase(base + '.' + r.sev)) id = base + '.' + r.sev;
  else if (r.low) id = base + '.low';
  else if (r.high) id = base + '.high';
  else id = base + '.normal';
  let t = ptext(id, style, V);
  if (!t) t = describe(name, r);
  else t = withZ(t, r);
  if (r.bl) t = t.replace(/\.$/, '') + ', near the LLN (a review flag, not a separate category).';
  if (r.limited) t = note(t, 'reduced confidence: see quality');
  return t;
}

/* One composed sentence for the metrics of a section instead of one sentence per metric: metrics in the same state are
   grouped ("FEV1, FVC and FEV1/FVC are all within reference limits"; "FEV1/FVC is reduced (z = −2.3) and FEV1 is
   moderately reduced (z = −3.1); FVC is within reference limits"). Abnormal groups lead, in the reasoning order the
   items were given; the normal group closes the sentence. A metric that failed quality keeps its own sentence. The
   detailed level adds the catalog's caveat for each metric; the numeric level prints the measured values. */
const STATE_PRED = { normal: 'within reference limits', bl: 'within reference limits but near the LLN (a review flag, not a separate category)', low: 'reduced', mild: 'mildly reduced', moderate: 'moderately reduced', severe: 'severely reduced', high: 'increased' };
function joinNames(a) { return a.length <= 2 ? a.join(' and ') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
function metricState(r) { return r.low ? (r.sev || 'low') : (r.high ? 'high' : (r.bl ? 'bl' : 'normal')); }
function metricItem(name, r, base, num, lead) { return { name: name, r: r, base: base, num: num || null, lead: !!lead }; }
function metricGroup(f, items) {
  const style = f.style, V = f.vals, out = [];
  const live = items.filter(it => it.r && it.r.measured);
  const inv = live.filter(it => it.r.invalid);
  if (inv.length) out.push(joinNames(inv.map(it => it.name)) + (inv.length > 1 ? ' are' : ' is') + ' not interpretable (the maneuver did not meet quality criteria' + (inv.some(it => it.r.zTxt) ? '; ' + inv.filter(it => it.r.zTxt).map(it => (inv.length > 1 ? it.name + ' ' : '') + it.r.zTxt).join(', ') : '') + ').');
  const ok = live.filter(it => !it.r.invalid);
  if (!ok.length) return out;
  const groups = [], idx = {};
  ok.forEach(it => { let k = metricState(it.r); if (k === 'bl') k = 'normal'; if (idx[k] === undefined) { idx[k] = groups.length; groups.push({ k: k, items: [] }); } groups[idx[k]].items.push(it); });
  // the defining measurement (FEV1/FVC) leads when it is abnormal; otherwise groups keep the order the items were given
  const abn = groups.filter(g => g.k !== 'normal').sort((a, b) => (b.items.some(it => it.lead) ? 1 : 0) - (a.items.some(it => it.lead) ? 1 : 0));
  const nl = groups.filter(g => g.k === 'normal');
  const near = ok.filter(it => it.r.bl);
  const single = groups.length === 1;
  groups.forEach(g => { if (g.k !== 'normal') g.items.sort((a, b) => (b.lead ? 1 : 0) - (a.lead ? 1 : 0)); });
  const clause = (g, noVerb) => {
    const n = g.items.length, verb = noVerb ? ' ' : (n > 1 ? ' are ' : ' is ');
    const all = single ? (n >= 3 ? 'all ' : (n === 2 ? 'both ' : '')) : '';
    const allLimited = g.items.every(it => it.r.limited), someLimited = g.items.some(it => it.r.limited);
    const pred = STATE_PRED[g.k];
    const tail = allLimited ? ' (reduced confidence: see quality)' : '';
    const perItem = style === 'numeric' || (someLimited && !allLimited);
    if (perItem) {
      const parts = g.items.map(it => {
        const d = [];
        if (style === 'numeric' && it.num) { const t = it.num(V); if (t) d.push(t); }
        if (it.r.zTxt) d.push(it.r.zTxt);
        if (it.r.limited && !allLimited) d.push('reduced confidence: see quality');
        return it.name + (d.length ? ' (' + d.join('; ') + ')' : '');
      });
      return joinNames(parts) + verb + all + pred + tail;
    }
    const zs = g.items.map(it => it.r.zTxt).filter(Boolean);
    let t = joinNames(g.items.map(it => it.name)) + verb + all + pred;
    if (zs.length === 1) t += ' (' + zs[0] + ')';
    else if (zs.length > 1) t += ' (z = ' + joinNames(zs.map(z => z.replace(/^z = /, ''))) + ')';
    return t + tail;
  };
  // "FEV1/FVC is reduced (z = −2.3), with FEV1 moderately reduced (z = −3.1)": the defining measurement carries the others
  const leadFirst = abn.length > 1 && abn[0].items.some(it => it.lead);
  const abnTxt = leadFirst ? clause(abn[0]) + ', with ' + abn.slice(1).map(g => clause(g, true)).join(' and ') : abn.map(g => clause(g)).join(abn.length === 2 ? ' and ' : '; ');
  const nlCount = nl.reduce((a, g) => a + g.items.length, 0);
  const nearAll = near.length > 0 && near.length === nlCount;
  const nlTxt = nl.map(clause).join('; ') + (nearAll ? (nlCount > 1 ? ', all' : ',') + ' near the LLN (a review flag, not a separate category)' : '');
  const nearTxt = near.length && !nearAll ? joinNames(near.map(it => it.name)) + (near.length > 1 ? ' are' : ' is') + ' near the LLN (a review flag, not a separate category)' : '';
  out.push(cap([abnTxt, nlTxt, nearTxt].filter(Boolean).join('; ')) + '.');
  if (style === 'expanded') {
    const seen = {};
    ok.forEach(it => {
      const k = metricState(it.r), id = it.base + '.' + (k === 'bl' ? 'normal' : k);
      const full = ptext(id, 'expanded', V) || (k !== 'normal' && k !== 'high' ? ptext(it.base + '.low', 'expanded', V) : '');
      if (!full) return;
      const m = /^[^.;]+[.;]\s+(.+)$/.exec(full.trim());
      // a two-part template contributes its caveat (the part after the finding); a one-sentence template is kept whole
      // unless it only restates the grade
      const tail = m ? cap(m[1].trim()).replace(/\.?$/, '.') : (/grading scheme/.test(full) ? '' : full.trim());
      if (tail && tail.length > 40 && !seen[tail] && !/^Its\b/.test(tail)) { seen[tail] = 1; out.push(tail); }
    });
  }
  return out;
}

/* ------------------------------------------------------------- prior facts */
function priorFacts(st, f) {
  const out = [];
  const cur = st.prior.cur || {};
  const curVal = (id, alt) => { const v = num(cur[id]); return has(v) ? v : alt; };
  const cv = {
    fev1: curVal('fev1', f.sp.fev1L), fvc: curVal('fvc', f.sp.fvcL),
    fev1_pct: curVal('fev1_pct', f.sp.fev1pct), fvc_pct: curVal('fvc_pct', f.sp.fvcpct),
    tlc: curVal('tlc', f.vol.tlcL), dlco: curVal('dlco', f.dl.abs),
    dlco_pct: curVal('dlco_pct', has(f.dl.adjPct) ? f.dl.adjPct : f.dl.pct),
    six: curVal('six', f.six.dist), feno: curVal('feno', f.feno.v),
    fev1_z: f.sp.fev1.z
  };
  const curDate = f.ctx.date;
  (st.prior.list || []).forEach((p, idx) => {
    const pd = parseDate(p.date);
    const yrs = (pd && curDate) ? yearsBetween(pd, curDate) : NaN;
    const o = { idx: idx + 1, date: p.date || '', dateOk: !!pd, years: yrs, metrics: [], notes: [], flags: [],
                cmp: { ref: !!p.ref_diff, bd: !!p.bd_diff, method: !!p.method_diff, hb: !!p.hb_diff, qual: !!p.qual_diff } };
    o.anyCmp = o.cmp.ref || o.cmp.bd || o.cmp.method || o.cmp.hb || o.cmp.qual;
    if (has(yrs) && yrs <= 0) o.flags.push({ lvl: 'alert', t: 'Prior study #' + o.idx + ' is dated on or after the current study; check the dates.' });
    const defs = [
      { k: 'fev1', name: 'FEV1', unit: 'L', d: 2, abs: true },
      { k: 'fvc', name: 'FVC', unit: 'L', d: 2, abs: true },
      { k: 'tlc', name: 'TLC', unit: 'L', d: 2, abs: true },
      { k: 'dlco', name: 'DLCO', unit: 'mL/min/mmHg', d: 1, abs: true },
      { k: 'six', name: '6MWD', unit: 'm', d: 0, abs: true },
      { k: 'feno', name: 'FeNO', unit: 'ppb', d: 0, abs: true },
      { k: 'fev1_pct', name: 'FEV1', unit: '% predicted', d: 0, pp: true },
      { k: 'fvc_pct', name: 'FVC', unit: '% predicted', d: 0, pp: true },
      { k: 'dlco_pct', name: 'DLCO', unit: '% predicted', d: 0, pp: true }
    ];
    defs.forEach(df => {
      const a = num(p[df.k]), bb = cv[df.k];
      if (!has(a) || !has(bb)) return;
      const m = { k: df.k, name: df.name, unit: df.unit, d: df.d, prior: a, cur: bb, dAbs: bb - a, pp: !!df.pp };
      m.dPct = (!df.pp && a !== 0) ? (bb - a) / a * 100 : NaN;          // relative change from the prior measured value
      m.relOfPct = (df.pp && a !== 0) ? (bb - a) / a * 100 : NaN;       // relative change of the percent-predicted number (named as such)
      m.perYear = (has(yrs) && yrs >= 0.25) ? m.dAbs / yrs : NaN;
      m.pctPerYear = (has(m.dPct) && has(yrs) && yrs >= 0.25) ? m.dPct / yrs : NaN;
      // a percent-predicted change is only comparable on the same reference; a DLCO change needs the same adjustment basis; BD state must match for spirometry
      m.comparable = !((df.pp && o.cmp.ref) || ((df.k === 'dlco' || df.k === 'dlco_pct') && o.cmp.hb) || ((df.k === 'fev1' || df.k === 'fvc' || df.k === 'fev1_pct' || df.k === 'fvc_pct') && o.cmp.bd) || o.cmp.qual);
      o.metrics.push(m);
    });
    const fm = o.metrics.filter(m => m.k === 'fev1')[0];
    if (fm && f.ctx.sex) { const den = f.ctx.sex === 'M' ? 0.5 : 0.4; fm.q0 = fm.prior / den; fm.q1 = fm.cur / den; }
    if (has(num(p.fev1_z)) && has(cv.fev1_z) && has(yrs) && yrs > 0 && has(f.ctx.age) && f.ctx.age < 18) {
      const t1 = Math.max(0, f.ctx.age - yrs);
      const r = 0.642 - 0.04 * yrs + 0.020 * t1;
      if (Math.abs(r) < 1) { o.ccs = (cv.fev1_z - r * num(p.fev1_z)) / Math.sqrt(1 - r * r); o.ccsR = r; }
    }
    out.push(o);
  });
  return out;
}

/* ------------------------------------------------------------ spirometry */
function gradeWord(g) {
  if (g === 'A' || g === 'B') return 'good (grade ' + g + ')';
  if (g === 'C' || g === 'D' || g === 'E') return 'acceptable and usable with reduced confidence (grade ' + g + ')';
  if (g === 'U') return 'usable only (grade U: no fully acceptable maneuver)';
  if (g === 'F') return 'not usable (grade F)';
  return '';
}
function qualLines(f) {
  const s = f.sp, out = [], V = f.vals, st = f.style;
  if (s.qual1 && s.qual2) {
    if (s.qual1 === s.qual2) out.push('Spirometry quality for FEV1 and FVC is ' + gradeWord(s.qual1));
    else out.push('Spirometry quality is graded separately: FEV1 ' + gradeWord(s.qual1) + '; FVC ' + gradeWord(s.qual2));
  } else if (s.qual1) out.push('FEV1 quality is ' + gradeWord(s.qual1) + '; the FVC grade was not entered');
  else if (s.qual2) out.push('FVC quality is ' + gradeWord(s.qual2) + '; the FEV1 grade was not entered');
  if (s.relF === 'invalid' && s.relV !== 'invalid') out.push('FEV1 is not interpretable; FVC remains usable');
  if (s.relV === 'invalid' && s.relF !== 'invalid') out.push('FVC is not interpretable; FEV1 remains usable');
  const ids = { repeat: 'quality.limited_repeatability', early: 'quality.early_termination', cough: 'quality.cough_first_second', insp: 'quality.incomplete_inspiration', slow: 'quality.slow_start', leak: 'quality.leak', glottic: 'quality.glottic_closure', varef: 'quality.variable_effort', fatigue: 'quality.fatigue', symptom: 'quality.symptoms' };
  const seen = {};
  s.limits.forEach(k => { if (ids[k] && !seen[k]) { seen[k] = 1; const t = ptext(ids[k], st === 'numeric' ? 'standard' : st, V); if (t) out.push(t); } });
  if (s.loop === 'early' && !seen.early) out.push(note(ptext('quality.early_termination', 'standard', V), 'early termination seen on the loop'));
  if (s.loop === 'cough' && !seen.cough) out.push(note(ptext('quality.cough_first_second', 'standard', V), 'cough artifact seen on the loop'));
  if (s.loop === 'slow' && !seen.slow) out.push(note(ptext('quality.slow_start', 'standard', V), 'hesitant start seen on the loop'));
  if (f.poorEffort) out.push(s.effort === 'weak' ? 'Effort: muscle weakness suspected from the maneuver (no sharp peak flow)' : 'Effort: submaximal effort or cooperation concern noted');
  return out;
}
function inlineNum(f, r) { return f.style === 'numeric' && r && r.measured && !r.invalid; }
function measuredLine(f) {
  const s = f.sp, a = [];
  if (!inlineNum(f, s.fev1)) {
    if (has(s.fev1L)) a.push('FEV1 ' + fmt(s.fev1L, 2) + ' L' + (has(s.fev1pct) ? ' (' + Math.round(s.fev1pct) + '% predicted)' : ''));
    else if (has(s.fev1pct)) a.push('FEV1 ' + Math.round(s.fev1pct) + '% predicted');
  }
  if (!inlineNum(f, s.fvc)) {
    if (has(s.fvcL)) a.push('FVC ' + fmt(s.fvcL, 2) + ' L' + (has(s.fvcpct) ? ' (' + Math.round(s.fvcpct) + '% predicted)' : ''));
    else if (has(s.fvcpct)) a.push('FVC ' + Math.round(s.fvcpct) + '% predicted');
  }
  if (has(s.ratioCalc) && !inlineNum(f, s.ratio)) a.push('FEV1/FVC ' + fmt(s.ratioCalc, 2));
  return a.length ? 'Measured: ' + a.join('; ') : '';
}

function secSpiro(f) {
  const sec = newSec('spiro', 'SPIROMETRY'), s = f.sp, pat = s.pat;
  if (!s.any && !s.anyQ) { sec.empty = true; sec.lines.push('No spirometry values entered.'); return sec; }
  qualLines(f).forEach(l => put(sec, l));
  put(sec, measuredLine(f));
  const nv = (L, pct) => (V) => [has(L) ? fmt(L, 2) + ' L' : '', has(pct) ? Math.round(pct) + '% predicted' : ''].filter(Boolean).join(', ');
  metricGroup(f, [
    metricItem('FEV1', s.fev1, 'metric.fev1', nv(s.fev1L, s.fev1pct)),
    metricItem('FVC', s.fvc, 'metric.fvc', nv(s.fvcL, s.fvcpct)),
    metricItem('FEV1/FVC', s.ratio, 'metric.ratio', () => has(s.ratioCalc) ? fmt(s.ratioCalc, 2) : '', true)
  ]).forEach(l => put(sec, l));
  const fx = f.F['spirometry.fixed_ratio_discordance'];
  if (fx === 'fixed_only') put(sec, ptext('metric.ratio.fixed_only', 'standard', f.vals));
  else if (fx === 'lln_only') put(sec, ptext('metric.ratio.lln_only', 'standard', f.vals));
  if (s.fef.measured && !s.fef.invalid) put(sec, note(s.fef.low ? ptext('flow.fef_low', 'concise') : ptext('flow.fef_normal', 'concise'), 'informational; not used to define obstruction or severity'));
  if (pat.code) sec.codes.push(pat.code);
  pat.codes.forEach(c => sec.codes.push(c));
  sec.codes = uniq(sec.codes);
  return sec;
}

/* -------------------------------------------------------------------- BD */
function secBD(f) {
  const sec = newSec('bd', 'BRONCHODILATOR RESPONSE'), b = f.bd, V = f.vals;
  if (!b.any) { sec.empty = true; sec.lines.push('No bronchodilator data entered.'); return sec; }
  if (b.agent) put(sec, 'Bronchodilator given: ' + b.agent);
  if (b.held === 'y') put(sec, 'Home bronchodilators were withheld before testing');
  else if (b.held === 'n') put(sec, ptext('bd.medication', 'standard'));
  if (b.qc === 'limited') put(sec, 'Technical factors reduce confidence in the post-bronchodilator maneuvers');
  if (b.qc === 'inv') put(sec, 'The post-bronchodilator maneuvers are not interpretable');
  const line = (name, pre, post, dpp) => {
    if (has(pre) && has(post)) {
      const dm = (post - pre) * 1000, dr = pre > 0 ? (post - pre) / pre * 100 : NaN;
      let t = name + ' changed from ' + fmt(pre, 2) + ' L to ' + fmt(post, 2) + ' L (' + fsign(dm, 0) + ' mL';
      if (has(dr)) t += ', ' + fsign(dr, 1) + '% of baseline';
      if (has(dpp)) t += ', ' + fsign(dpp, 1) + '% of predicted';
      put(sec, t + ')');
    } else if (has(dpp)) put(sec, name + ' changed by ' + fsign(dpp, 1) + '% of predicted');
  };
  if (f.style === 'numeric' && b.currentComputable && ptext('bd.current_numeric', 'numeric', V)) put(sec, ptext('bd.current_numeric', 'numeric', V));
  else { line('FEV1', b.f1pre, b.f1post, b.dF); line('FVC', b.vpre, b.vpost, b.dV); }
  const resp = f.F['bronchodilator.response'];
  if (resp === 'both' || resp === 'fev1' || resp === 'fvc') { sec.codes.push('S62'); put(sec, note(ptext('bd.' + resp, 'standard', V), 'increase of more than 10% of the predicted value')); }
  else if (resp === 'negative') { sec.codes.push('S61'); put(sec, note(ptext('bd.negative', 'standard', V), 'both FEV1 and FVC assessed; neither increased by more than 10% of predicted')); }
  else if (resp === 'indeterminate') {
    let why = '';
    if (b.rel === 'invalid') why = 'the post-bronchodilator maneuvers are not interpretable';
    else if (b.resp === 'ind') why = 'reported as not assessable';
    else if (!(b.assessedF && b.assessedV)) why = 'only ' + (b.assessedF ? 'FEV1' : (b.assessedV ? 'FVC' : 'incomplete data')) + ' could be assessed, so a negative response cannot be established';
    put(sec, note(ptext('bd.indeterminate', 'standard', V), why));
  }
  if (b.legacyAvail) put(sec, 'By the legacy 2005 profile (increase of at least 12% from baseline and at least 200 mL), ' + (b.legacyF && b.legacyV ? 'both FEV1 and FVC qualify' : (b.legacyF ? 'FEV1 qualifies' : (b.legacyV ? 'FVC qualifies' : 'neither FEV1 nor FVC qualifies'))) + (b.discordant ? '; the two definitions disagree for this study' : ''));
  if (b.drop) put(sec, 'FEV1 or FVC decreased by more than 10% of predicted after bronchodilator');
  if (b.postRatio.measured) put(sec, metricLine(f, 'metric.ratio', b.postRatio, 'Post-bronchodilator FEV1/FVC').replace(/^FEV1\/FVC/, 'Post-bronchodilator FEV1/FVC'));
  if (b.postFev1.measured) put(sec, metricLine(f, 'metric.fev1', b.postFev1, 'Post-bronchodilator FEV1').replace(/^FEV1/, 'Post-bronchodilator FEV1'));
  return sec;
}

/* -------------------------------------------------------- flow-volume loop */
function loopInfo(key) { return LOOPS.filter(l => l[0] === key)[0] || null; }
function secFvl(f) {
  const sec = newSec('fvl', 'FLOW-VOLUME LOOP'), v = f.fvl;
  if (!v.any) { sec.empty = true; sec.lines.push('No flow-volume loop or flow-index values entered.'); return sec; }
  const L = v.loop, info = loopInfo(L), flat = (L === 'expflat' || L === 'inspflat' || L === 'bothflat');
  if (info) {
    put(sec, 'Loop shape: ' + info[3]);
    if (flat) put(sec, v.repro ? 'The flattening is reproducible on repeat maneuvers' : 'The flattening is not reproducible on repeat maneuvers');
    if (flat && v.repro) sec.codes.push(L === 'expflat' ? 'S51' : (L === 'inspflat' ? 'S52' : 'S53'));
  }
  if (v.pef.measured) put(sec, v.pef.low ? ptext('flow.pef_low', 'standard') : ptext('flow.pef_normal', 'standard'));
  if (has(v.pefL)) put(sec, 'PEF ' + fmt(v.pefL, 0) + ' L/min');
  if (has(v.fevPef)) put(sec, 'FEV1/PEF is ' + fmt(v.fevPef, 1) + ' mL/L/min' + (v.fevPef > 8 ? ' (above 8)' : ' (not above 8)'));
  else if (v.fevPefHi === true) put(sec, 'FEV1/PEF is above 8 mL/L/min');
  else if (v.fevPefHi === false) put(sec, 'FEV1/PEF is not above 8 mL/L/min');
  put(sec, describe('FIF50%', v.fif50c));
  if (has(v.fef50)) put(sec, 'FEF50% is ' + fmt(v.fef50, 2) + ' L/s');
  if (has(v.fif50)) put(sec, 'FIF50% is ' + fmt(v.fif50, 2) + ' L/s');
  if (v.fifCat) put(sec, 'FIF50/FEF50 is ' + (has(v.fifFef) ? fmt(v.fifFef, 2) : ({ lt: 'below 1', eq: 'about 1', gt: 'above 1' })[v.fifCat]));
  loopLines(f).forEach(l => sec.impr.push(l));
  sec.codes = uniq(sec.codes);
  return sec;
}
/* Meaning of the loop and the flow indices (goes to the INTERPRETATION). Shapes are reviewed observations; the physiology they suggest is hedged. */
function loopLines(f) {
  const v = f.fvl, L = v.loop, R = f.sp.ratio, T = f.vol.tlc, out = [];
  const flat = (L === 'expflat' || L === 'inspflat' || L === 'bothflat');
  if (L === 'concave') out.push(R.low ? 'The concave expiratory limb of the flow-volume loop is concordant with the airflow obstruction.' : 'Expiratory concavity supports airflow limitation at low lung volumes or loss of elastic recoil, but is not specific for a particular airway disorder.');
  else if (L === 'sevobs') out.push('The loop shape (low early peak, marked scooping, long low-flow tail) is the contour seen with severe airflow obstruction and air trapping.');
  else if (L === 'convex') out.push('The small loop with preserved contour is compatible with a reduced vital capacity' + (T.low ? ', concordant with the reduced TLC.' : (T.measured && T.wnl ? ', but the shape is not specific and TLC is within reference limits.' : '; restriction requires confirmation with TLC.')));
  else if (L === 'effort') out.push('The blunted or late peak with an irregular curve suggests submaximal effort; FEV1 and FVC may be underestimated.');
  else if (L === 'weak') out.push('The low rounded peak flow with a reduced inspiratory limb is a contour seen with respiratory-muscle weakness; it does not establish weakness on its own.');
  else if (L === 'slow') out.push('The slow rise to the peak suggests a hesitant start; FEV1 and PEF may be underestimated unless the back-extrapolated volume was acceptable (under 5% of FVC or 0.100 L).');
  else if (L === 'cough') out.push('The early cough artifact can lower the FEV1 falsely.');
  else if (L === 'early') out.push('Early termination of exhalation makes FVC and FEV1/FVC unreliable and can artificially preserve the ratio.');
  else if (L === 'saw') out.push(ptext('loop.sawtooth', 'expanded'));
  else if (L === 'unilat') out.push(ptext('loop.biphasic', 'expanded'));
  else if (flat) {
    if (v.repro) out.push(L === 'bothflat' ? ptext('loop.both_flattened', 'expanded') : (L === 'inspflat' ? ptext('loop.inspiratory_flattening', 'expanded') : ptext('loop.expiratory_flattening', 'expanded')));
    else out.push(ptext('loop.nonreproducible_flattening', 'expanded'));
  }
  if (v.fevPefHi === true) out.push('FEV1/PEF above 8 mL/L/min raises the question of central or upper-airway obstruction (poor initial effort can also raise this ratio); inspiratory and expiratory flow-volume loops are advised.');
  if (v.fifCat) {
    const reduced = v.pef.low || v.fif50c.low || flat;
    if (reduced) out.push('With reduced flows, FIF50/FEF50 ' + (v.fifCat === 'lt' ? 'below 1 fits a variable extrathoracic pattern' : (v.fifCat === 'gt' ? 'above 1 fits a variable intrathoracic pattern' : 'of about 1 fits a fixed obstruction pattern')) + '.');
  }
  return out;
}

/* ------------------------------------------------------------- lung volumes */
function secVol(f) {
  const sec = newSec('vol', 'LUNG VOLUMES'), v = f.vol, vp = v.pat;
  if (!v.any) { sec.empty = true; sec.lines.push('No lung-volume values entered.'); return sec; }
  const mth = { pleth: 'body plethysmography', n2: 'nitrogen washout', he: 'helium dilution', sb: 'single-breath dilution' }[v.method];
  if (mth) put(sec, 'Lung volumes were measured by ' + mth);
  if (v.qc === 'limited') put(sec, ptext('quality.volume_limited', 'standard'));
  if (v.qc === 'inv') put(sec, 'The lung-volume measurements are not interpretable');
  const vals = [], inl = (r) => inlineNum(f, r) && v.qc !== 'inv';
  if (has(v.tlcL) && !inl(v.tlc)) vals.push('TLC ' + fmt(v.tlcL, 2) + ' L');
  if (has(v.rvL) && !inl(v.rv)) vals.push('RV ' + fmt(v.rvL, 2) + ' L');
  if (has(v.rvtlcCalc) && !inl(v.rvtlc)) vals.push('RV/TLC ' + fmt(v.rvtlcCalc, 0) + '%');
  if (has(v.frcL) && !inl(v.frc)) vals.push('FRC ' + fmt(v.frcL, 2) + ' L');
  if (has(v.svcL) && !inl(v.svc)) vals.push('SVC ' + fmt(v.svcL, 2) + ' L');
  if (vals.length) put(sec, 'Measured: ' + vals.join('; '));
  if (v.qc !== 'inv') {
    const L_ = (x) => () => has(x) ? fmt(x, 2) + ' L' : '';
    metricGroup(f, [
      metricItem('TLC', v.tlc, 'volume.tlc', L_(v.tlcL)),
      metricItem('RV', v.rv, 'volume.rv', L_(v.rvL)),
      metricItem('RV/TLC', v.rvtlc, 'volume.rv_tlc', () => has(v.rvtlcCalc) ? fmt(v.rvtlcCalc, 0) + '%' : ''),
      metricItem('FRC', v.frc, 'volume.frc', L_(v.frcL)),
      metricItem('FRC/TLC', v.frctlc, 'volume.frc_tlc'),
      metricItem('SVC', v.svc, 'metric.svc', L_(v.svcL)),
      metricItem('ERV', v.erv, 'volume.erv'),
      metricItem('IC', v.ic, 'volume.ic')
    ]).forEach(l => put(sec, l));
  }
  if (vp.code) sec.codes.push(vp.code);
  if (has(f.sp.fvcL) && has(v.svcL)) {
    const dd = (v.svcL - f.sp.fvcL) * 1000;
    if (dd > 100) { put(sec, 'SVC exceeds FVC by ' + fmt(dd, 0) + ' mL'); }
  }
  return sec;
}

/* -------------------------------------------------------------------- DLCO */
function dlcoLabel(f) { const d = f.dl; return d.reportedAdjusted ? 'Hemoglobin-adjusted DLCO' : (d.basis === 'un' ? 'DLCO (not adjusted for hemoglobin)' : 'DLCO'); }
function secDlco(f) {
  const sec = newSec('dlco', 'DLCO'), d = f.dl, pat = d.pat, V = f.vals;
  if (!d.any) { sec.empty = true; sec.lines.push('No diffusing-capacity values entered.'); return sec; }
  if (d.qc === 'limited') put(sec, ptext('quality.dlco_limited', 'standard'));
  if (d.qc === 'inv') put(sec, ptext('dlco.invalid', 'standard'));
  if (d.single) put(sec, ptext('quality.dlco_single', 'standard'));
  const vals = [], inlD = inlineNum(f, d.dlco) && d.qc !== 'inv';
  if (!inlD) {
    if (has(d.abs)) vals.push('DLCO ' + fmt(d.abs, 1) + ' mL/min/mmHg' + (has(d.pct) ? ' (' + Math.round(d.pct) + '% predicted' + (d.reportedAdjusted ? ', Hb-adjusted' : (d.basis === 'un' ? ', not Hb-adjusted' : '')) + ')' : ''));
    else if (has(d.pct)) vals.push('DLCO ' + Math.round(d.pct) + '% predicted' + (d.reportedAdjusted ? ' (Hb-adjusted)' : (d.basis === 'un' ? ' (not Hb-adjusted)' : '')));
  }
  if (has(d.vaL) && !(inlineNum(f, d.va) && d.qc !== 'inv')) vals.push('VA ' + fmt(d.vaL, 2) + ' L');
  if (has(d.vatlc)) vals.push('VA/TLC ' + fmt(d.vatlc, 2));
  if (vals.length) put(sec, 'Measured: ' + vals.join('; '));
  if (d.qc !== 'inv') {
    const lab = dlcoLabel(f);
    const items = [metricItem(lab, d.dlco, 'dlco', () => [has(d.abs) ? fmt(d.abs, 1) + ' mL/min/mmHg' : '', has(d.pct) ? Math.round(d.pct) + '% predicted' : ''].filter(Boolean).join(', '))];
    if (d.adj.measured && !d.reportedAdjusted) items.push(metricItem('hemoglobin-adjusted DLCO', d.adj, 'dlco', () => has(d.adjPct) ? Math.round(d.adjPct) + '% predicted' : ''));
    items.push(metricItem('VA', d.va, 'diffusion.va', () => has(d.vaL) ? fmt(d.vaL, 2) + ' L' : ''));
    items.push(metricItem('KCO', d.kco, 'diffusion.kco'));
    metricGroup(f, items).forEach(l => put(sec, l));
    // basis sentence: only when the line above has not already said it
    if (d.dlco.measured && d.reportedAdjusted) put(sec, ptext('dlco.hb_adjusted', 'standard', V));
    else if (d.dlco.measured && !d.adj.measured && f.F['observations.dlco.hb_unadjusted']) put(sec, ptext('dlco.hb_unadjusted', 'concise', V));
    else if (d.dlco.measured && !d.adj.measured && f.F['observations.dlco.hb_unknown']) put(sec, ptext('dlco.hb_unknown', 'standard', V));
  }
  if (has(d.hb)) {
    put(sec, 'Hemoglobin is ' + fmt(d.hb, 1) + ' g/dL' + (d.anemic ? ' (below the usual lower limit)' : ''));
    if (has(d.adjPct) && !d.hasAdj) put(sec, 'Hemoglobin-adjusted DLCO would be approximately ' + Math.round(d.adjPct) + '% predicted (estimate from the ERS/ATS 2017 equation with reference Hb ' + d.hbRef + ' g/dL; the laboratory adjustment is preferred)');
  } else if (d.hbcat) put(sec, 'Hemoglobin is ' + ({ low: 'low (anemia)', nl: 'normal', high: 'high' })[d.hbcat] + ' per the report');
  if (has(d.cohb)) put(sec, 'Carboxyhemoglobin is ' + fmt(d.cohb, 1) + '%');
  else if (d.cohbcat === 'hi') put(sec, 'Carboxyhemoglobin is 2% or higher');
  if (d.qc === 'inv') metricGroup(f, [metricItem('VA', d.va, 'diffusion.va'), metricItem('KCO', d.kco, 'diffusion.kco')]).forEach(l => put(sec, l));
  if (has(d.vatlc)) put(sec, 'VA/TLC is ' + fmt(d.vatlc, 2) + (d.vatlc < 0.85 ? ' (below the 0.85 convention)' : ''));
  else if (d.vatlcSel === 'low') put(sec, 'VA/TLC is below 0.85');
  pat.codes.forEach(c => sec.codes.push(c));
  sec.codes = uniq(sec.codes);
  return sec;
}

/* ----------------------------------------------------------- airway resistance */
function secRaw(f) {
  const sec = newSec('raw', 'AIRWAY RESISTANCE'), r = f.raw;
  if (!r.any) { sec.empty = true; sec.lines.push('No airway-resistance values entered.'); return sec; }
  put(sec, describe('Raw', r.raw)); put(sec, describe('sRaw', r.sraw)); put(sec, describe('sGaw', r.sgaw));
  if (r.bd === 'imp') put(sec, ptext('resistance.response', 'standard')); else if (r.bd === 'none') put(sec, 'No meaningful change in resistance after bronchodilator');
  if (r.raw.high || r.sraw.high || r.sgaw.low) sec.impr.push('Airway resistance is increased (or specific conductance reduced), indicating altered airway mechanics' + (f.sp.ratio.low ? ', concordant with the airflow obstruction on spirometry.' : (f.sp.any ? ' without spirometric obstruction; resistance can add information when spirometry is nonspecific or normal, but is not an independent diagnostic criterion.' : '.')));
  else if (r.raw.wnl || r.sraw.wnl || r.sgaw.wnl) sec.impr.push('Airway resistance is within reference limits, which does not exclude airway disease.');
  return sec;
}

/* ------------------------------------------------------------- oscillometry */
function secOsc(f) {
  const sec = newSec('osc', 'OSCILLOMETRY'), o = f.osc;
  if (!o.any) { sec.empty = true; sec.lines.push('No oscillometry values entered.'); return sec; }
  put(sec, describe('R5', o.r5)); put(sec, describe('R5-R20', o.r520)); put(sec, describe('X5 (reactance)', o.x5).replace('below the LLN', 'more negative than its lower reference limit'));
  put(sec, describe('AX', o.ax)); put(sec, describe('Fres', o.fres));
  if (o.bdr === 'pos') put(sec, ptext('oscillometry.bd_response', 'standard'));
  else if (o.bdr === 'neg') put(sec, 'Oscillometric bronchodilator response is not significant per laboratory criteria');
  const abn = o.r5.high || o.r520.high || o.x5.low || o.ax.high || o.fres.high;
  if (abn) sec.impr.push('Oscillometry shows abnormal respiratory-system mechanics' + ((o.r520.high || o.x5.low || o.ax.high) ? ', with increased frequency dependence or reactance abnormality that is compatible with heterogeneous airway mechanics (not a direct measure of peripheral-airway resistance)' : '') + (!f.sp.ratio.low && f.sp.any ? '; oscillometry can detect altered mechanics when FEV1/FVC is normal.' : '.'));
  else sec.impr.push('Oscillometry is within the configured reference limits.');
  return sec;
}

/* ----------------------------------------------------- respiratory muscle tests */
function secMip(f) {
  const sec = newSec('mip', 'RESPIRATORY MUSCLE STRENGTH'), m = f.mp;
  if (!m.any) { sec.empty = true; sec.lines.push('No respiratory-muscle values entered.'); return sec; }
  if (m.effort === 'poor') put(sec, ptext('quality.pressure_limited', 'standard'));
  if (m.effort === 'bulbar') put(sec, ptext('muscle.bulbar_limit', 'standard'));
  if (m.effort === 'inv') put(sec, 'The pressure measurements are not interpretable');
  const one = (name, val, st_, thr, src, sexNeeded) => {
    if (st_ === 'not_measured') return;
    const vs = has(val) ? fmt(val, 0) + ' cmH2O' : '';
    const ref = has(thr) ? (src === 'lab' ? 'lab lower limit ' + fmt(thr, 0) + ' cmH2O' : 'screening threshold ' + fmt(thr, 0) + ' cmH2O') : '';
    if (st_ === 'invalid') put(sec, name + ' is not interpretable' + (vs ? ' (' + vs + ')' : ''));
    else if (st_ === 'low') put(sec, name + ' magnitude is below its reference limit' + (vs || ref ? ' (' + [vs, ref].filter(Boolean).join('; ') + ')' : ''));
    else if (st_ === 'normal') put(sec, name + ' magnitude is within its reference range' + (vs || ref ? ' (' + [vs, ref].filter(Boolean).join('; ') + ')' : ''));
    else put(sec, name + ' is ' + vs + (sexNeeded ? '; sex (or the lab lower limit) is needed to compare it with a reference' : ''));
  };
  one('MIP', m.mipV, m.mip, m.thr.mip, m.thrSrc.mip, true);
  one('MEP', m.mepV, m.mep, m.thr.mep, m.thrSrc.mep, true);
  one('SNIP', m.snipV, m.snip, m.thr.snip, m.thrSrc.snip, false);
  if ((m.mip === 'low' || m.mep === 'low' || m.snip === 'low' || m.mip === 'normal' || m.mep === 'normal') && [m.thrSrc.mip, m.thrSrc.mep].some(x => x === 'screen') && (has(m.mipV) || has(m.mepV)) && !(m.mipC.measured && m.mepC.measured))
    put(sec, 'Screening thresholds are the commonly cited values (MIP 75/50 and MEP 100/80 cmH2O for men/women, SNIP 40 cmH2O), not a validated lower limit of normal; the laboratory reference takes precedence when available');
  if (m.p01 === 'low') put(sec, 'P0.1 is low'); else if (m.p01 === 'high') put(sec, 'P0.1 is elevated'); else if (m.p01 === 'wnl') put(sec, 'P0.1 is within normal limits');
  if (has(m.cpf)) put(sec, 'Peak cough flow is ' + fmt(m.cpf, 0) + ' L/min');
  else if (m.cpfCat === 'vlow') put(sec, 'Peak cough flow is 160 L/min or less');
  else if (m.cpfCat === 'low') put(sec, 'Peak cough flow is below 270 L/min');
  else if (m.cpfCat === 'ok') put(sec, 'Peak cough flow is 270 L/min or more');
  if (has(m.mvv)) {
    let t = 'MVV is ' + fmt(m.mvv, 0) + ' L/min';
    if (has(f.sp.fev1L)) t += '; the range estimated from FEV1 (35–40 × FEV1) is ' + fmt(f.sp.fev1L * 35, 0) + '–' + fmt(f.sp.fev1L * 40, 0) + ' L/min';
    put(sec, t);
  }
  const lowI = m.mip === 'low' || m.snip === 'low', lowE = m.mep === 'low';
  const hy = hyperCtx(f) ? ' Hyperinflation can lower volitional pressures and may contribute.' : '';
  const pair = (id) => ptext(id, 'concise').replace(/\.$/, '') + '; ' + ptext(id, 'expanded').charAt(0).toLowerCase() + ptext(id, 'expanded').slice(1);
  if (m.mip === 'low' && m.mep === 'low') sec.impr.push(pair('muscle.pattern.both_low') + hy);
  else if (m.mip === 'low' && m.mep === 'normal') sec.impr.push(pair('muscle.pattern.mip_low_mep_preserved') + hy);
  else if (m.mep === 'low' && m.mip === 'normal') sec.impr.push(pair('muscle.pattern.mep_low_mip_preserved') + hy);
  else if (lowI || lowE) sec.impr.push((lowI ? 'Inspiratory' : 'Expiratory') + ' pressure magnitude is below its reference limit; this may reflect muscle weakness, submaximal effort or technique.' + hy);
  else if (m.mip === 'normal' && m.mep === 'normal') sec.impr.push(ptext('muscle.pattern.both_normal', 'expanded'));
  else if (m.mip === 'normal' || m.mep === 'normal' || m.snip === 'normal') sec.impr.push('The measured respiratory pressure is within its reference range on this effort-dependent test.');
  if (has(m.cpf) ? m.cpf <= 160 : m.cpfCat === 'vlow') sec.impr.push('Peak cough flow is 160 L/min or less, the range associated with ineffective cough in neuromuscular disease guidance (a disease-specific threshold, not a healthy-adult reference limit).');
  else if (has(m.cpf) ? m.cpf < 270 : m.cpfCat === 'low') sec.impr.push('Peak cough flow is below 270 L/min, the threshold used for reduced airway-clearance reserve in neuromuscular disease guidance (not a healthy-adult reference limit).');
  if (m.p01 === 'low') sec.impr.push('Low P0.1 suggests blunted respiratory drive.'); else if (m.p01 === 'high') sec.impr.push('Elevated P0.1 indicates increased respiratory drive.');
  return sec;
}

/* ----------------------------------------------------------------- postural */
function secPost(f) {
  const sec = newSec('post', 'UPRIGHT VS. SUPINE'), p = f.post, V = f.vals;
  if (!p.any) { sec.empty = true; sec.lines.push('No postural values entered.'); return sec; }
  const nm = (p.which === 'svc') ? 'SVC' : 'FVC';
  if (p.limited) put(sec, ptext('muscle.supine_limited', 'standard'));
  if (p.dropComputable) {
    put(sec, nm + ' fell from ' + fmt(p.up, 2) + ' L upright to ' + fmt(p.sup, 2) + ' L supine, a ' + fmt(p.drop, 1) + '% decrease');
    if (p.drop >= 30) sec.impr.push('The postural fall in vital capacity (' + fmt(p.drop, 0) + '%) is well above the 15% screening clue (ERS 2019) and in the range cited for bilateral diaphragm weakness (30% or more); this supports possible diaphragmatic dysfunction but does not prove it.');
    else if (p.drop >= 20) sec.impr.push('The postural fall in vital capacity (' + fmt(p.drop, 0) + '%) exceeds the 15% screening clue (ERS 2019) and the 20% threshold cited for diaphragm weakness; this supports possible diaphragmatic dysfunction but does not prove it.');
    else if (p.drop >= 15) sec.impr.push('The postural fall in vital capacity (' + fmt(p.drop, 0) + '%) reaches the 15% screening clue discussed in the ERS 2019 statement; baseline mechanics and the clinical question determine its importance.');
    else if (p.drop >= 10) sec.impr.push('The postural fall in vital capacity (' + fmt(p.drop, 0) + '%) is above the change expected in health (under 10%) but below the 15% screening clue.');
    else sec.impr.push('No excessive postural fall in vital capacity (' + fmt(p.drop, 0) + '%; under 10% is expected in health).');
  } else if (p.supineHigher) {
    put(sec, nm + ' was ' + fmt(p.up, 2) + ' L upright and ' + fmt(p.sup, 2) + ' L supine (higher supine, an increase of ' + fmt(-p.drop, 1) + '%)');
    sec.impr.push('Vital capacity increased when supine; this is not a postural decrease and should prompt a check of the maneuvers and the entries.');
  } else if (p.fallSel && !p.limited) {
    const band = { ge30: '30% or more', b20_30: '20–29%', b10_20: '10–19%', lt10: 'under 10%' }[p.band];
    if (band) put(sec, 'The supine fall in ' + nm + ' is ' + band);
    if (p.band === 'ge30') sec.impr.push('A postural fall in vital capacity of 30% or more is in the range cited for bilateral diaphragm weakness; this supports possible diaphragmatic dysfunction but does not prove it.');
    else if (p.band === 'b20_30') sec.impr.push('A postural fall in vital capacity of 20–29% exceeds the 15% screening clue (ERS 2019) and the 20% threshold cited for diaphragm weakness; this supports possible diaphragmatic dysfunction but does not prove it.');
    else if (p.band === 'b10_20') sec.impr.push('A postural fall in vital capacity of 10–19% is above the change expected in health; whether it is excessive depends on the exact value (15% is the screening clue) and the clinical question.');
    else if (p.band === 'lt10') sec.impr.push('No excessive postural fall in vital capacity.');
  }
  if (!has(p.dSpO2) && !has(p.dPaO2) && p.orthSel === 'yes') { put(sec, 'Orthodeoxia is reported'); sec.impr.push('Orthodeoxia reported (oxygen saturation falls by 5 points or more on standing).'); }
  else if (!has(p.dSpO2) && !has(p.dPaO2) && p.orthSel === 'no') put(sec, 'No orthodeoxia on standing');
  if (has(p.dSpO2)) {
    put(sec, 'SpO2 was ' + fmt(p.spo2s, 0) + '% supine and ' + fmt(p.spo2u, 0) + '% upright (change ' + fsign(-p.dSpO2, 0) + ' points on standing)');
    if (p.dSpO2 >= 5) sec.impr.push('Orthodeoxia by SpO2 (fall of at least 5 points from supine to upright).');
  }
  if (has(p.dPaO2)) {
    put(sec, 'PaO2 was ' + fmt(p.pao2s, 0) + ' mmHg supine and ' + fmt(p.pao2u, 0) + ' mmHg upright (change ' + fsign(-p.dPaO2, 0) + ' mmHg on standing)');
    if (p.dPaO2 > 4) sec.impr.push('Orthodeoxia by PaO2 (fall of more than 4 mmHg from supine to upright).');
  }
  if (p.orthop) put(sec, 'Orthopnea is reported'); if (p.platyp) put(sec, 'Platypnea is reported');
  return sec;
}

/* --------------------------------------------------------------------- FeNO */
function secFeno(f) {
  const sec = newSec('feno', 'FeNO'), n = f.feno, V = f.vals;
  if (!n.any) { sec.empty = true; sec.lines.push('No FeNO value entered.'); return sec; }
  const b = fenoBand(f);
  put(sec, 'FeNO is ' + (has(n.v) ? fmt(n.v, 0) + ' ppb, which is ' : '') + b.cat + ' by the ' + (n.child ? 'ATS 2011 pediatric (under 12 years)' : 'ATS 2011 adult') + ' cut-points (low below ' + b.lo + ', high above ' + b.hi + ' ppb)');
  if (n.ics === 'y') put(sec, 'The patient is taking inhaled corticosteroids');
  if (f.ctx.smoke === 'current') put(sec, 'The patient is a current smoker');
  if (n.confound) put(sec, ptext('feno.uninterpretable', 'standard') + ' (recent exercise, spirometry, nitrate-rich food or viral infection recorded)');
  if (!has(f.ctx.age)) put(sec, 'Age was not entered; adult cut-points were used');
  const id = n.child ? null : ('feno.' + b.cat);
  if (id && !n.confound) sec.impr.push(ptext(id, 'expanded'));
  else if (!n.confound) sec.impr.push('FeNO is ' + b.cat + ' by the pediatric cut-points; ' + (b.cat === 'high' ? 'this supports eosinophilic airway inflammation in the appropriate setting but does not independently diagnose asthma.' : (b.cat === 'low' ? 'substantial eosinophilic airway inflammation is less likely, although treatment and smoking affect the value.' : 'interpret with symptoms, atopy and treatment.')));
  else sec.impr.push('FeNO requires caution because a confounder was recorded; no category-based implication is drawn.');
  if (n.ics === 'y' && b.cat === 'low') sec.impr.push(ptext('feno.on_ics', 'expanded'));
  if (n.ics === 'y' && b.cat === 'high') sec.impr.push(ptext('feno.high_on_ics', 'expanded'));
  return sec;
}

/* ----------------------------------------------------------- bronchoprovocation */
function mchCategory(q) { const mc = q.mch || methacholineFacts(q); return mc.cat ? { cat: mc.cat === 'normal' ? 'negative' : mc.cat } : (mc.state === 'negative' ? { cat: 'negative' } : null); }
function secBronch(f) {
  const sec = newSec('bronch', 'BRONCHOPROVOCATION'), q = f.br, V = f.vals, F = f.F;
  if (!q.any) { sec.empty = true; sec.lines.push('No challenge data entered.'); return sec; }
  if (has(q.basePct) || has(q.baseL)) put(sec, 'Baseline FEV1 was ' + [has(q.baseL) ? fmt(q.baseL, 2) + ' L' : '', has(q.basePct) ? Math.round(q.basePct) + '% predicted' : ''].filter(Boolean).join(', '));
  if (q.type === 'mch') {
    const mc = q.mch;
    if (q.held === 'n') put(sec, ptext('methacholine.medications', 'standard'));
    if (F['challenge.pd20_reportable']) put(sec, ptext('methacholine.pd20', 'standard', V));
    if (F['challenge.pc20_reportable']) put(sec, ptext('methacholine.pc20', 'standard', V) || ptext('methacholine.pc20', 'concise', V));
    if (F['challenge.pd20_exceeds_max']) put(sec, ptext('methacholine.pd20_not_reached', 'standard', V));
    else if (F['challenge.pc20_exceeds_max']) put(sec, ptext('methacholine.pc20_not_reached', 'standard', V));
    else if (q.mchNeg) put(sec, 'No 20% fall in FEV1 occurred at the highest dose or concentration delivered' + (q.complete === 'y' ? ' (protocol completed)' : ''));
    if (has(q.mchFall)) put(sec, 'The largest fall in FEV1 was ' + fmt(q.mchFall, 1) + '%');
    if (q.complete === 'n') put(sec, 'The protocol was stopped before the planned maximum');
    const st_ = mc.state;
    if (st_ === 'positive') put(sec, ptext('methacholine.positive', 'standard'));
    else if (st_ === 'negative') put(sec, ptext('methacholine.negative', 'standard'));
    else if (st_ === 'incomplete') put(sec, ptext('methacholine.incomplete', 'standard'));
    else if (st_ === 'indeterminate') put(sec, ptext('methacholine.indeterminate', 'standard'));
    else if (st_ === 'diluent_response') put(sec, ptext('methacholine.diluent_response', 'standard'));
    if (mc.cat && mc.cat !== 'normal') put(sec, ptext('methacholine.ahr.' + mc.cat, 'standard') + (mc.catSrc === 'lab' ? ' (laboratory category)' : ' (ERS 2017 ranges)'));
    else if (mc.boundary) put(sec, 'The value sits exactly on the printed boundary between the ' + mc.boundary.between[0] + ' and ' + mc.boundary.between[1] + ' ranges; the laboratory category policy decides');
    if (has(q.recPct)) put(sec, ptext('methacholine.recovery', 'standard', V));
    // interpretation
    if (st_ === 'positive') sec.impr.push(ptext('methacholine.positive', 'expanded') + (mc.cat && mc.cat !== 'normal' ? ' The response is in the ' + mc.cat + ' range, which describes airway responsiveness, not asthma severity.' : ''));
    else if (st_ === 'negative') sec.impr.push(ptext('methacholine.negative', 'expanded'));
    else if (st_ === 'incomplete') sec.impr.push(ptext('methacholine.incomplete', 'expanded'));
    else if (st_ === 'indeterminate') sec.impr.push(ptext('methacholine.indeterminate', 'expanded'));
    else if (st_ === 'diluent_response') sec.impr.push(ptext('methacholine.diluent_response', 'expanded'));
    if (q.ics === 'y') { put(sec, 'The patient is taking inhaled corticosteroids'); sec.impr.push('Inhaled corticosteroids can lower the sensitivity of a direct challenge (by about 1.2 doubling doses).'); }
  } else if (q.type === 'man') {
    const st_ = exerciseState(q).state;
    let txt;
    if (has(q.manFall) && q.manFall >= 15 && has(q.manDose) && q.manDose > 635) txt = 'The 15% fall is recorded above the 635 mg cumulative dose; check the entries';
    else if (has(q.manFall) && q.manFall >= 15) txt = 'Mannitol challenge: FEV1 fell by ' + fmt(q.manFall, 1) + '%' + (has(q.manDose) ? ' at a cumulative dose of ' + fmt(q.manDose, 0) + ' mg (PD15)' : '') + ', meeting the 15% criterion';
    else if (q.manIncr) txt = 'Mannitol challenge: an incremental fall of at least 10% between consecutive doses meets the positive criterion';
    else if (q.manRes === 'pos') txt = 'Mannitol challenge: reported positive (15% fall from baseline by a cumulative 635 mg, or a 10% fall between consecutive doses)';
    else if (q.manRes === 'neg') txt = 'Mannitol challenge: reported negative at the completed protocol';
    else txt = 'Mannitol challenge: the largest fall in FEV1 was ' + (has(q.manFall) ? fmt(q.manFall, 1) + '%' : 'not entered') + (st_ === 'negative' ? ', below the 15% criterion at the full 635 mg' : '; whether the full 635 mg was delivered is not recorded, so a negative result is not established');
    put(sec, txt);
    if (st_ === 'positive') sec.impr.push('Mannitol challenge positive (indirect airway hyperresponsiveness); this supports but does not independently establish asthma.');
    else if (st_ === 'negative') sec.impr.push('Mannitol challenge negative at the completed protocol; mannitol is less sensitive than methacholine, so a negative result does not exclude asthma.');
    else sec.impr.push('Mannitol challenge result is not established (protocol completion not recorded).');
  } else {
    const nm = q.type === 'evh' ? 'Eucapnic voluntary hyperpnea' : 'Exercise challenge';
    const st_ = exerciseState(q).state;
    if (has(q.exFall)) {
      let sevt = '';
      if (q.exFall >= 10) sevt = q.exFall >= 50 ? 'severe' : (q.exFall >= 25 ? 'moderate' : 'mild');
      put(sec, nm + ': the largest fall in FEV1 was ' + fmt(q.exFall, 1) + '%' + (q.exFall >= 10 && !q.exConsec ? ' (not confirmed at two consecutive time points)' : ''));
      if (st_ === 'positive') sec.impr.push(nm + ' positive (fall of at least 10% at two consecutive time points): ' + sevt + ' bronchoconstriction by the ATS 2013 grades (mild 10–24%, moderate 25–49%, severe 50% or more); symptoms alone do not establish exercise-induced bronchoconstriction.');
      else if (st_ === 'incomplete') sec.impr.push(nm + ' incomplete: the criterion requires a fall of at least 10% at two consecutive time points, which was not confirmed.');
      else sec.impr.push(nm + ' negative (fall less than 10%) under the completed test conditions; an inadequate stimulus or medication effect must be considered when relevant.');
    } else if (q.exConsec) { put(sec, nm + ': fall of at least 10% at two consecutive time points'); sec.impr.push(nm + ' positive.'); }
    else if (q.exRes === 'neg') { put(sec, nm + ': reported negative (fall less than 10%)'); sec.impr.push(nm + ' negative under the completed test conditions.'); }
    else if (q.exRes === 'ind') { put(sec, nm + ': reported with a single time point only'); sec.impr.push(nm + ' incomplete: the criterion requires a fall of at least 10% at two consecutive time points.'); }
    else if (q.exRes === 'mild' || q.exRes === 'mod' || q.exRes === 'sev') {
      const w = ({ mild: 'mild (10–24%)', mod: 'moderate (25–49%)', sev: 'severe (50% or more)' })[q.exRes];
      put(sec, nm + ': reported positive with a ' + w + ' fall in FEV1');
      sec.impr.push(nm + ' positive: ' + w.replace(/ \(.*$/, '') + ' bronchoconstriction by the ATS 2013 grades.');
    }
  }
  if (q.rev === 'y') put(sec, 'FEV1 reversed with bronchodilator after the challenge'); else if (q.rev === 'n') put(sec, 'FEV1 did not reverse fully with bronchodilator after the challenge');
  return sec;
}

/* ------------------------------------------------------------------- 6MWT */
function secSix(f) {
  const sec = newSec('six', '6-MINUTE WALK TEST'), x = f.six, tr = f.trend6;
  if (!x.any && !tr.multi) { sec.empty = true; sec.lines.push('No 6-minute walk values entered.'); return sec; }
  const early = x.stop === 'early';
  if (has(x.dist)) {
    let t = (early ? 'Distance walked before stopping' : '6MWD') + ' was ' + fmt(x.dist, 0) + ' m' + (early && has(x.timeMin) ? ' in ' + fmt(x.timeMin, 1) + ' minutes' : '');
    if (!early && has(x.pctCalc)) {
      t += ' (' + Math.round(x.pctCalc) + '% of ' + (has(x.predUse) ? 'the predicted ' + fmt(x.predUse, 0) + ' m' : 'predicted');
      if (x.predSrc === 'calc') t += ' by ' + x.eqUse + ', calculated from age, sex, height and weight';
      else if (x.eqUse) t += ', ' + x.eqUse;
      t += ')';
    }
    if (!early && has(x.llnUse)) t += '; the LLN is ' + fmt(x.llnUse, 0) + ' m' + (x.llnSrc === 'calc' || x.llnSrc === 'derived' ? ' (predicted − ' + x.es.sub + ' m for ' + (x.es.sex === 'M' ? 'men' : 'women') + ')' : '') + ', so the distance is ' + (x.dist < x.llnUse ? 'below' : 'at or above') + ' the LLN';
    put(sec, t);
    if (!x.eqUse && has(x.pctCalc)) put(sec, 'The reference equation is not named');
  }
  if (!has(x.dist) && x.distCat) put(sec, 'The walk distance is ' + (x.distCat === 'low' ? 'below the LLN' : 'within normal limits') + ' per the report');
  if (x.onO2) put(sec, 'The walk was performed on ' + x.o2text + '; saturations below are on oxygen');
  if (has(x.s0) || has(x.sn)) {
    let t = has(x.s0) ? 'SpO2 was ' + fmt(x.s0, 0) + '% at baseline' + (has(x.sn) ? ' with a nadir of ' + fmt(x.sn, 0) + '%' : '') + (has(x.se) ? ' and ' + fmt(x.se, 0) + '% at the end' : '')
      : 'The SpO2 nadir was ' + fmt(x.sn, 0) + '%' + (has(x.se) ? ' and ' + fmt(x.se, 0) + '% at the end' : '');
    put(sec, t);
    if (has(x.drop) && x.drop > 0) put(sec, 'SpO2 fell by ' + fmt(x.drop, 0) + ' points');
    if (has(x.dsp)) put(sec, 'The distance–saturation product (distance × nadir SpO2 as a fraction) is ' + fmt(x.dsp, 0) + ' m%');
  }
  if (!has(x.s0) && !has(x.sn) && x.desatSel) {
    if (x.desatSel === 'none') put(sec, 'There was no qualifying exertional desaturation per the report');
    else if (x.desatSel === 'fall') put(sec, 'SpO2 fell by 4 points or more, with a nadir above 88%, per the report');
    else put(sec, 'The SpO2 nadir was 88% or lower per the report');
  }
  if (has(x.hp)) put(sec, 'Peak HR was ' + fmt(x.hp, 0) + ' bpm' + (has(x.hrPct) ? ' (' + Math.round(x.hrPct) + '% of age-predicted maximum, ' + (f.ctx.eq.hrmax === 'fox' ? '220 − age' : 'Tanaka 208 − 0.7 × age') + ')' : ''));
  if (has(x.hrr1)) put(sec, 'Heart-rate recovery at 1 minute was ' + fmt(x.hrr1, 0) + ' bpm');
  else if (x.hrrSel === 'abn') put(sec, 'Heart-rate recovery at 1 minute is abnormal per the report (13–18 bpm or less)');
  else if (x.hrrSel === 'nl') put(sec, 'Heart-rate recovery at 1 minute is normal per the report');
  if (has(x.b0) || has(x.b1)) put(sec, 'Borg dyspnea was ' + (has(x.b0) ? fmt(x.b0, 1) : '?') + ' at baseline and ' + (has(x.b1) ? fmt(x.b1, 1) : '?') + ' at the end');
  if (early) put(sec, 'The test was stopped early' + (x.stopWhy ? ' because of ' + x.stopWhy : '') + '; the achieved time and distance are reported rather than a completed six-minute result');
  const bits = [];
  if (has(x.dist)) bits.push((early ? 'walked ' + fmt(x.dist, 0) + ' m before stopping early' : '6MWD ' + fmt(x.dist, 0) + ' m' + (has(x.pctCalc) ? ' (' + Math.round(x.pctCalc) + '% predicted)' : '') + (x.lowDist ? ', below the LLN' : '')));
  else if (x.distCat) bits.push('walk distance ' + (x.lowDist ? 'below the LLN' : 'within normal limits'));
  const o2note = x.onO2 ? ' on ' + x.o2text : '';
  if (has(x.sn)) bits.push(x.desat ? 'exertional desaturation to ' + fmt(x.sn, 0) + '%' + o2note + (x.sn <= 88 && !x.onO2 ? ' (at or below 88%, the threshold commonly used in the United States for ambulatory oxygen qualification)' : '') : 'no qualifying desaturation (nadir ' + fmt(x.sn, 0) + '%' + o2note + ')' + (x.onO2 ? ', which does not establish room-air oxygenation' : ''));
  else if (x.desatSel) bits.push(x.desatSel === 'none' ? 'no qualifying desaturation' + o2note + (x.onO2 ? ' (room-air oxygenation not established)' : '') : (x.desatSel === 'fall' ? 'exertional desaturation (fall of 4 points or more)' + o2note : 'exertional desaturation to 88% or lower' + o2note + (!x.onO2 ? ' (the threshold commonly used in the United States for ambulatory oxygen qualification)' : '')));
  if (has(x.dsp) && x.dsp < 200) bits.push('distance–saturation product below 200 m%, which predicted 12-month mortality in idiopathic pulmonary fibrosis (Lettieri 2006)');
  if (has(x.hrr1) ? x.hrr1 <= 18 : x.hrrSel === 'abn') bits.push(has(x.hrr1) && x.hrr1 > 13 ? 'borderline heart-rate recovery (abnormal definitions range up to 18 bpm)' : 'abnormal heart-rate recovery');
  if (tr.multi) {
    const c = tr.vsPrev, dir = c.cls === 'down' ? 'lower' : 'higher';
    bits.push('6MWD ' + (c.cls === 'stable' ? 'is similar to' : fmt(Math.abs(c.dAbs), 0) + ' m ' + dir + ' than') + ' the previous walk (' + c.from.ds + ', ' + fmt(c.from.dist, 0) + ' m)' +
      (c.cls === 'stable' ? ' (change ' + fsign(c.dAbs, 0) + ' m, within the 30 m minimal important difference)' : ', beyond the 30 m minimal important difference'));
    sec.trend = trendLines(tr);
    sec.trend.forEach(l => put(sec, l));
  }
  if (bits.length) sec.impr.push(cap(bits.join('; ')) + (x.lowDist ? '. A reduced distance reflects functional limitation and is not specific for a pulmonary mechanism.' : '.'));
  return sec;
}

function spanTxt(days) {
  if (days < 60) return Math.round(days) + ' days';
  if (days < 730) return fmt(days / 30.4375, 1) + ' months';
  return fmt(days / 365.25, 1) + ' years';
}
function trendLines(tr) {
  const out = [], pts = tr.pts, n = pts.length;
  const shown = pts.slice(-8);
  out.push('6MWD trend over ' + n + ' walks: ' + (n > shown.length ? '… ' : '') + shown.map(p => fmt(p.dist, 0) + ' m (' + p.ds + ')').join(', '));
  const c = tr.vsPrev;
  out.push('Latest versus previous walk: ' + fsign(c.dAbs, 0) + ' m (' + fsign(c.dPct, 1) + '%) over ' + spanTxt(c.days) + (has(c.perYear) ? '; annualised ' + fsign(c.perYear, 0) + ' m/yr' : ''));
  if (tr.vsFirst) out.push('Latest versus first walk: ' + fsign(tr.vsFirst.dAbs, 0) + ' m (' + fsign(tr.vsFirst.dPct, 1) + '%) over ' + spanTxt(tr.vsFirst.days));
  if (tr.vsBest) out.push('The best walk was ' + fmt(tr.best.dist, 0) + ' m on ' + tr.best.ds + '; the latest walk is ' + fsign(tr.vsBest.dAbs, 0) + ' m (' + fsign(tr.vsBest.dPct, 1) + '%) from it');
  if (has(tr.slope)) out.push('Linear trend across all walks: ' + fsign(tr.slope, 0) + ' m/yr');
  if (tr.nadir && Math.abs(tr.nadir.d) >= 4) out.push('Nadir SpO2 changed from ' + fmt(tr.nadir.from.nadir, 0) + '% to ' + fmt(tr.nadir.to.nadir, 0) + '% between the last two walks');
  return out;
}

/* ------------------------------------------------------------------- CPET */
const CPET_AGES = [20, 40, 60, 80];
function cpetCut(tbl, age) {
  if (!has(age) || !tbl) return NaN;
  if (age <= 20) return tbl[0]; if (age >= 80) return tbl[3];
  for (let i = 0; i < 3; i++) if (age >= CPET_AGES[i] && age <= CPET_AGES[i + 1]) return tbl[i] + (tbl[i + 1] - tbl[i]) * (age - CPET_AGES[i]) / 20;
  return NaN;
}
const CPET = {
  lt:      { M: [35, 40, 45, 55],       F: [40, 40, 50, 60] },
  hr:      { M: [175, 160, 150, 130],   F: [170, 155, 145, 125] },
  o2p:     { M: [12, 10, 9, 7],         F: [10, 8, 7, 6] },
  slope:   { M: [26, 28, 30, 32],       F: [28, 30, 32, 32] },
  nadir:   { M: [30, 32, 32, 34],       F: [32, 34, 34, 34] },
  petco2:  { M: [43, 41, 39, 37],       F: [41, 40, 39, 37] }
};
function cpetEval(f) {
  const k = f.cp, age = f.ctx.age, sx = f.ctx.sex, o = { any: false, ready: !!sx && has(age), abn: [], ok: [], notes: [], eff: [], pattern: [] };
  if (!k.any) return o;
  o.any = true;
  const t = (tbl) => (sx ? cpetCut(tbl[sx], age) : NaN);
  const chk = (label, val, cut, dir, fmtd, unit) => {
    if (!has(val)) return;
    if (!has(cut)) { o.notes.push(label + ' ' + fmt(val, fmtd) + unit + ' (age and sex are needed for the cut-off)'); return; }
    const bad = dir === '>' ? val <= cut : val >= cut;
    const s = label + ' ' + fmt(val, fmtd) + unit + ' (' + (dir === '>' ? 'normal > ' : 'normal < ') + fmt(cut, fmtd) + ')';
    (bad ? o.abn : o.ok).push({ label: label, text: s, bad: bad });
  };
  chk('Peak VO2', k.vo2pct, 83, '>', 0, '% predicted');
  chk('VO2 at lactate threshold', k.lt, t(CPET.lt), '>', 0, '% of predicted peak');
  chk('Peak HR', k.hrp, t(CPET.hr), '>', 0, ' bpm');
  chk('Peak O2 pulse', k.o2p, t(CPET.o2p), '>', 1, ' mL/beat');
  chk('Peak VE/MVV', k.vemvv, sx === 'M' ? 0.80 : (sx === 'F' ? 0.75 : NaN), '<', 2, '');
  chk('VE/VCO2 slope', k.slope, t(CPET.slope), '<', 1, '');
  chk('VE/VCO2 nadir', k.nadir, t(CPET.nadir), '<', 1, '');
  chk('PETCO2 at LT', k.petco2, t(CPET.petco2), '>', 1, ' mmHg');
  chk('Peak VT/IC', k.vtic, sx === 'M' ? 0.70 : (sx === 'F' ? 0.75 : NaN), '<', 2, '');
  if (has(k.sp)) { const bad = k.sp <= 93; (bad ? o.abn : o.ok).push({ label: 'Peak SpO2', text: 'Peak/nadir SpO2 ' + fmt(k.sp, 0) + '% (normal > 93%)', bad: bad }); }
  if (has(k.s0) && has(k.sp)) { const drop = k.s0 - k.sp, bad = drop >= 5; (bad ? o.abn : o.ok).push({ label: 'SpO2 fall', text: 'SpO2 fell by ' + fmt(drop, 0) + ' points (normal < 5)', bad: bad }); }
  const have = (lab) => o.abn.concat(o.ok).some(a => a.label === lab);
  const catChk = (label, c, badVal, okTxt, badTxt) => {
    if (c === '' || have(label)) return;
    const isBad = (c === badVal);
    (isBad ? o.abn : o.ok).push({ label: label, text: isBad ? badTxt : okTxt, bad: isBad, cat: true });
  };
  catChk('Peak VO2', k.vo2c, 'low', 'Peak VO2 is above 83% of predicted', 'Peak VO2 is reduced (83% of predicted or less)');
  catChk('VO2 at lactate threshold', k.ltc, 'low', 'VO2 at the lactate threshold is normal', 'VO2 at the lactate threshold is low');
  catChk('Peak HR', k.hrc, 'low', 'Peak HR reached 85% of predicted or more', 'Peak HR is below 85% of predicted');
  catChk('Peak O2 pulse', k.o2pc, 'low', 'Peak O2 pulse is normal', 'Peak O2 pulse is low');
  catChk('Peak VE/MVV', k.ventc, 'low', 'Ventilatory reserve is preserved', 'Ventilatory reserve is exhausted (VE/MVV above the sex-specific cut-off)');
  catChk('VE/VCO2 slope', k.slopec, 'high', 'VE/VCO2 is normal', 'VE/VCO2 is elevated');
  catChk('PETCO2 at LT', k.petco2c, 'low', 'PETCO2 at the lactate threshold is normal', 'PETCO2 at the lactate threshold is low');
  catChk('Peak SpO2', k.desatc, 'abn', 'There is no significant desaturation', 'There is desaturation (fall of 5 points or more, or below 93%)');
  const bad = (name) => o.abn.some(a => a.label === name);
  if (has(k.hrpct) && k.hrpct < 85) o.eff.push('peak HR ' + Math.round(k.hrpct) + '% of predicted');
  if (has(k.vemvv) && k.vemvv < 0.6) o.eff.push('peak VE/MVV ' + fmt(k.vemvv, 2));
  if (has(k.rer) && k.rer < 1) o.eff.push('peak RER ' + fmt(k.rer, 2));
  if (has(k.lac) && k.lac < 4) o.eff.push('peak lactate ' + fmt(k.lac, 1) + ' mEq/L');
  if (has(k.bd) && has(k.bl) && k.bd <= 3 && k.bl <= 3) o.eff.push('peak Borg ratings ≤ 3');
  if (!has(k.hrpct) && k.hrc === 'low') o.eff.push('peak HR below 85% of predicted');
  if (!has(k.rer) && k.rerc === 'lo') o.eff.push('peak RER below 1.0');
  if (k.effort === 'sub') o.eff.push('effort judged submaximal by the testing team');
  o.submax = o.eff.length >= 2 || k.effort === 'sub';
  o.lowVO2 = bad('Peak VO2');
  o.vo2ok = o.ok.some(a => a.label === 'Peak VO2');
  o.vent = bad('Peak VE/MVV') || bad('Peak VT/IC');
  o.circ = bad('Peak O2 pulse') || bad('VO2 at lactate threshold') || (has(k.hrr1) && k.hrr1 <= 12) || k.hrrc === 'abn';
  o.gx = bad('VE/VCO2 slope') || bad('VE/VCO2 nadir') || bad('Peak SpO2') || bad('SpO2 fall');
  o.hyperv = (has(k.rer) && k.rer > 1.15 && has(k.petco2) && bad('PETCO2 at LT') && !o.vent) || (bad('PETCO2 at LT') && (bad('VE/VCO2 slope') || bad('VE/VCO2 nadir')) && !bad('Peak SpO2') && !bad('SpO2 fall') && !o.vent);
  if (o.lowVO2) {
    if (o.vent) o.pattern.push('mechanical-ventilatory limitation (reduced ventilatory reserve and/or inspiratory constraint)');
    if (o.circ) o.pattern.push('impaired O2 delivery or utilisation (cardiocirculatory or peripheral muscle)');
    if (o.gx && !o.hyperv) o.pattern.push('pulmonary gas-exchange abnormality (high ventilatory requirement and/or desaturation)');
    if (o.hyperv) o.pattern.push('hyperventilation / dysfunctional breathing (high VE/VCO2 with low PETCO2)');
    if (f.ctx.obese) o.pattern.push('obesity (increased metabolic cost of work) may contribute');
  } else if (o.gx || o.hyperv) {
    if (o.hyperv) o.pattern.push('hyperventilation with an elevated ventilatory equivalent and low PETCO2 despite preserved exercise capacity');
    else if (o.gx) o.pattern.push('an abnormal ventilatory or gas-exchange response despite preserved peak VO2');
  }
  return o;
}
function secCpet(f) {
  const sec = newSec('cpet', 'CARDIOPULMONARY EXERCISE TEST'), e = cpetEval(f);
  if (!e.any) { sec.empty = true; sec.lines.push('No CPET values entered.'); return sec; }
  if (f.cp.mode) put(sec, 'Exercise mode: ' + (f.cp.mode === 'cycle' ? 'cycle ergometer' : 'treadmill'));
  if (f.cp.stop) put(sec, 'Reason for stopping: ' + { dysp: 'dyspnea', leg: 'leg fatigue', both: 'dyspnea and leg fatigue', cp: 'chest pain', ecg: 'ECG changes or arrhythmia', bp: 'blood-pressure response', other: 'other' }[f.cp.stop]);
  if (has(f.cp.vo2)) put(sec, 'Peak VO2 is ' + fmt(f.cp.vo2, 1) + ' mL/kg/min');
  e.abn.forEach(a => put(sec, a.cat ? a.text : a.text + ' — abnormal'));
  e.ok.forEach(a => put(sec, a.cat ? a.text : a.text + ' — within normal limits'));
  e.notes.forEach(n => put(sec, n));
  if (has(f.cp.hrr1)) put(sec, '1-minute heart-rate recovery is ' + fmt(f.cp.hrr1, 0) + ' bpm');
  else if (f.cp.hrrc === 'abn') put(sec, '1-minute heart-rate recovery is abnormal');
  else if (f.cp.hrrc === 'nl') put(sec, '1-minute heart-rate recovery is normal');
  if (!has(f.cp.rer) && f.cp.rerc) put(sec, 'Peak RER is ' + (f.cp.rerc === 'lo' ? 'below 1.00' : '1.00 or higher'));
  if (has(f.cp.rer)) put(sec, 'Peak RER is ' + fmt(f.cp.rer, 2));
  if (e.eff.length) put(sec, 'Possible submaximal-effort markers: ' + e.eff.join(', '));
  if (e.submax && e.lowVO2) sec.impr.push('Reduced peak VO2 with several markers of submaximal effort (' + e.eff.join(', ') + '); interpret with caution.');
  else if (e.lowVO2) sec.impr.push('Reduced peak VO2' + (has(f.cp.vo2pct) ? ' (' + fmt(f.cp.vo2pct, 0) + '% predicted)' : '') + (e.pattern.length ? ' with findings that suggest: ' + e.pattern.join('; ') + '.' : '; no single dominant mechanism is identified from the values entered (peripheral limitation or deconditioning may contribute).'));
  else if (e.vo2ok) sec.impr.push('Preserved exercise capacity' + (has(f.cp.vo2pct) ? ' (peak VO2 ' + fmt(f.cp.vo2pct, 0) + '% predicted)' : '') + (e.pattern.length ? ' with ' + e.pattern.join('; ') + '.' : '.'));
  else if (e.pattern.length) sec.impr.push('CPET findings suggest: ' + e.pattern.join('; ') + '.');
  return sec;
}

/* ----------------------------------------------------------------- blood gas */
function abgEval(f) {
  const g = f.gas, o = { lines: [], impr: [] };
  if (has(g.ph)) o.lines.push('Arterial pH ' + fmt(g.ph, 2) + (g.ph < 7.35 ? ' (acidemia)' : (g.ph > 7.45 ? ' (alkalemia)' : ' (normal)')));
  else if (g.phC) o.lines.push('Arterial pH is ' + ({ acid: 'acidemic', nl: 'normal', alk: 'alkalemic' })[g.phC] + ' per the report');
  if (has(g.pco2)) o.lines.push('PaCO2 ' + fmt(g.pco2, 0) + ' mmHg' + (g.pco2 > 45 ? ' (hypercapnia)' : (g.pco2 < 35 ? ' (hypocapnia)' : ' (normal)')));
  else if (g.co2C) o.lines.push('PaCO2 is ' + ({ hypo: 'low (hypocapnia)', nl: 'normal', hyper: 'high (hypercapnia)' })[g.co2C] + ' per the report');
  if (has(g.hco3)) o.lines.push('HCO3 ' + fmt(g.hco3, 0) + ' mEq/L' + (g.hco3 > 26 ? ' (elevated)' : (g.hco3 < 22 ? ' (low)' : ' (normal)')));
  else if (g.hco3C) o.lines.push('HCO3 is ' + ({ lo: 'low', nl: 'normal', hi: 'elevated' })[g.hco3C] + ' per the report');
  if (has(g.po2)) o.lines.push('PaO2 ' + fmt(g.po2, 0) + ' mmHg' + (g.onO2 ? ' on FiO2 ' + (has(g.fio2) ? fmt(g.fio2, 2) : 'above 0.21') : '') + (!g.onO2 ? (g.po2 < 60 ? ' (hypoxemia)' : '') : ''));
  else if (g.o2C) o.lines.push('PaO2 is ' + ({ nl: 'normal', mild: 'mildly low', hyp: 'low (hypoxemia)' })[g.o2C] + (g.onO2 ? ' on supplemental oxygen' : ' on room air') + ' per the report');
  o.hypox = g.hypoxC;
  if (has(g.sao2)) o.lines.push('SaO2 ' + fmt(g.sao2, 0) + '%');
  if (has(g.cohb) && g.cohb >= 3) o.lines.push('COHb ' + fmt(g.cohb, 1) + '% (elevated)');
  if (has(g.ph) && has(g.pco2)) {
    const hco3 = g.hco3;
    if (g.ph < 7.35 && g.pco2 > 45) {
      let t = 'Respiratory acidosis';
      if (has(hco3)) {
        const acute = 24 + 0.1 * (g.pco2 - 40), chronic = 24 + 0.35 * (g.pco2 - 40);
        if (hco3 <= acute + 2) t += ' (HCO3 fits an acute process)'; else if (hco3 >= chronic - 2) t += ' (HCO3 fits chronic compensation)'; else t += ' (HCO3 between acute and chronic expectations; consider acute on chronic)';
      }
      o.impr.push(t);
    } else if (g.ph > 7.45 && g.pco2 < 35) {
      let t = 'Respiratory alkalosis';
      if (has(hco3)) {
        const acute = 24 - 0.2 * (40 - g.pco2), chronic = 24 - 0.5 * (40 - g.pco2);
        if (hco3 >= acute - 2) t += ' (HCO3 fits an acute process)'; else if (hco3 <= chronic + 2) t += ' (HCO3 fits chronic compensation)'; else t += ' (partially compensated)';
      }
      o.impr.push(t);
    } else if (g.ph < 7.35 && has(hco3) && hco3 < 22) {
      const exp = 1.5 * hco3 + 8; let t = 'Metabolic acidosis (expected PaCO2 ' + fmt(exp - 2, 0) + '–' + fmt(exp + 2, 0) + ' mmHg)';
      if (g.pco2 > exp + 2) t += ' with an additional respiratory acidosis'; else if (g.pco2 < exp - 2) t += ' with an additional respiratory alkalosis';
      o.impr.push(t);
    } else if (g.ph > 7.45 && has(hco3) && hco3 > 26) {
      const exp = 40 + 0.7 * (hco3 - 24); let t = 'Metabolic alkalosis (expected PaCO2 about ' + fmt(exp, 0) + ' mmHg)';
      if (g.pco2 > exp + 5) t += ' with hypoventilation beyond compensation'; o.impr.push(t);
    } else if (g.ph >= 7.35 && g.ph <= 7.45 && g.pco2 > 45 && has(hco3) && hco3 > 26) {
      o.impr.push('Compensated hypercapnia (normal pH with raised PaCO2 and HCO3), consistent with chronic respiratory acidosis');
    } else if (g.ph >= 7.35 && g.ph <= 7.45 && g.pco2 >= 35 && g.pco2 <= 45) o.impr.push('No acid–base disturbance by pH and PaCO2.');
  } else if (g.phCat && g.co2Cat) {
    const C_ = g.co2Cat, H_ = g.hco3Cat, acid = g.phCat === 'acid', alk = g.phCat === 'alk';
    let t = null;
    if (acid && C_ === 'hyper') { t = 'Respiratory acidosis'; if (H_ === 'lo') t = 'Mixed respiratory and metabolic acidosis'; else if (H_ === 'hi') t += ' (HCO3 is raised, which fits chronic compensation)'; else if (H_ === 'nl') t += ' (HCO3 is normal, which fits an acute process)'; }
    else if (alk && C_ === 'hypo') { t = 'Respiratory alkalosis'; if (H_ === 'hi') t = 'Mixed respiratory and metabolic alkalosis'; else if (H_ === 'lo') t += ' (HCO3 is low, which fits chronic compensation)'; else if (H_ === 'nl') t += ' (HCO3 is normal, which fits an acute process)'; }
    else if (acid && H_ === 'lo') t = 'Metabolic acidosis' + (C_ === 'hypo' ? ' with respiratory compensation' : '');
    else if (alk && H_ === 'hi') t = 'Metabolic alkalosis' + (C_ === 'hyper' ? ' with respiratory compensation' : '');
    else if (g.phCat === 'nl' && C_ === 'hyper' && H_ === 'hi') t = 'Compensated hypercapnia (normal pH with raised PaCO2 and HCO3), consistent with chronic respiratory acidosis';
    else if (g.phCat === 'nl' && C_ === 'nl' && (H_ === '' || H_ === 'nl')) o.impr.push('No acid–base disturbance by pH and PaCO2.');
    if (t) o.impr.push(t);
  }
  if (has(g.aa)) {
    let t = 'A–a gradient is ' + fmt(g.aa, 0) + ' mmHg';
    if (!g.onO2 && has(g.aaMax)) t += ' (expected upper limit about ' + fmt(g.aaMax, 0) + ' mmHg for age ' + fmt(f.ctx.age, 0) + ')';
    else if (g.onO2) t += ' on FiO2 ' + fmt(g.fi, 2) + ' (age-based limit applies to room air only)';
    o.lines.push(t);
    o.aaHigh = !g.onO2 && has(g.aaMax) && g.aa > g.aaMax;
    if (o.aaHigh) o.impr.push('Widened A–a gradient, indicating a gas-exchange abnormality (V/Q mismatch, shunt or diffusion limitation).');
    else if (!g.onO2 && has(g.aaMax) && has(g.po2) && g.po2 < 60) o.impr.push('Hypoxemia with a normal A–a gradient, which points to hypoventilation or low inspired oxygen.');
  } else if (g.aaC) {
    o.aaHigh = g.aaC === 'wide';
    o.lines.push('A–a gradient is ' + (o.aaHigh ? 'widened' : 'normal for age') + ' per the report');
    if (o.aaHigh) o.impr.push('Widened A–a gradient, indicating a gas-exchange abnormality (V/Q mismatch, shunt or diffusion limitation).');
    else if (o.hypox) o.impr.push('Hypoxemia with a normal A–a gradient, which points to hypoventilation or low inspired oxygen.');
  }
  if (g.fi > 0.21 && has(g.po2)) { const pf = g.po2 / g.fi; o.lines.push('PaO2/FiO2 is ' + fmt(pf, 0) + (pf < 300 ? ' (impaired oxygenation, < 300)' : '')); }
  if (o.hypox && !(has(g.aa) && has(g.aaMax)) && !g.aaC) o.impr.push('Hypoxemia on room air' + (has(g.po2) ? ' (PaO2 ' + fmt(g.po2, 0) + ' mmHg)' : '') + '.');
  return o;
}
function secGas(f) {
  const sec = newSec('gas', 'ARTERIAL BLOOD GAS');
  if (!f.gas.any) { sec.empty = true; sec.lines.push('No blood-gas values entered.'); return sec; }
  const e = abgEval(f); e.lines.forEach(l => put(sec, l));
  sec.impr = e.impr.slice();
  return sec;
}

/* ---------------------------------------------------------------- comparison */
function secPrior(f) {
  const sec = newSec('prior', 'COMPARISON WITH PRIOR STUDIES');
  if (!f.prior.any) { sec.empty = true; sec.lines.push(f.priors.length ? 'No matching prior and current values were entered.' : 'No prior study entered.'); return sec; }
  f.priors.forEach(p => {
    if (!p.metrics.length) return;
    const head = 'Compared with prior study #' + p.idx + (p.dateOk ? ' (' + p.date + ')' : '') + (has(p.years) && p.years > 0 ? ', ' + fmt(p.years, 2) + ' years earlier' : '');
    put(sec, head);
    const lim = [];
    if (p.cmp.ref) lim.push('different reference equations (percent-predicted changes are not comparable)');
    if (p.cmp.bd) lim.push('different bronchodilator state');
    if (p.cmp.method) lim.push('different equipment or lung-volume method');
    if (p.cmp.hb) lim.push('different hemoglobin-adjustment basis for DLCO');
    if (p.cmp.qual) lim.push('different test quality');
    if (lim.length) put(sec, 'Comparability is limited: ' + lim.join('; '));
    p.metrics.forEach(m => {
      const dd = m.d;
      let t = m.name + ' ' + fmt(m.prior, dd) + ' → ' + fmt(m.cur, dd) + ' ' + m.unit + ' (' + fsign(m.dAbs, dd) + (m.pp ? ' percentage points' : '');
      if (has(m.dPct)) t += ', ' + fsign(m.dPct, 1) + '% of the prior value';
      if (has(m.relOfPct)) t += ', ' + fsign(m.relOfPct, 1) + '% relative change of the percent-predicted number';
      t += ')';
      if (has(m.pctPerYear)) t += '; annualised ' + fsign(m.pctPerYear, 1) + '%/yr';
      if (m.k === 'fev1' && has(m.perYear)) t += ' (' + fsign(m.perYear * 1000, 0) + ' mL/yr)';
      put(sec, t);
      if (m.k === 'fev1' && has(m.q0)) put(sec, 'FEV1Q (FEV1 divided by ' + (f.ctx.sex === 'M' ? '0.5' : '0.4') + ' L) changed from ' + fmt(m.q0, 2) + ' to ' + fmt(m.q1, 2));
    });
    if (has(p.ccs)) put(sec, 'Conditional change score for FEV1 is ' + fz(p.ccs) + ' (r = ' + fmt(p.ccsR, 3) + ')');

    // interpretation: one sentence per measure, the basis of each number named, thresholds labelled with their framework
    const within1y = !has(p.years) || p.years <= 1.1;
    const ild = f.ctx.hasInd('ild') || f.ctx.hasInd('ctd') || f.ctx.hasInd('sarc');
    const dir = (m) => m.dAbs < 0 ? 'decreased' : (m.dAbs > 0 ? 'increased' : 'is unchanged');
    const where = ' since prior study #' + p.idx;
    const caveat = (m) => m.comparable ? '' : ' (comparison limited: ' + (p.cmp.ref && m.pp ? 'different reference equations' : (p.cmp.bd && /fev1|fvc/.test(m.k) ? 'different bronchodilator state' : (p.cmp.hb && /dlco/.test(m.k) ? 'different hemoglobin-adjustment basis' : 'different test quality'))) + ')';
    p.metrics.forEach(m => {
      if (m.k === 'fev1' || m.k === 'fvc') {
        const th = [];
        if (m.comparable && Math.abs(m.dPct) >= 15) th.push('beyond the 15% change that ERS/ATS 2022 describes as exceeding expected variability');
        if (m.comparable && has(m.pctPerYear) && m.pctPerYear <= -8) th.push('meets the 8%/yr rapid-decline marker');
        let t = m.name + ' ' + dir(m) + ' by ' + fmt(Math.abs(m.dPct), 1) + '% of the prior value (' + fsign(m.dAbs * 1000, 0) + ' mL)' + where + (has(m.pctPerYear) ? ' (' + fsign(m.pctPerYear, 1) + '%/yr)' : '');
        t += th.length ? ', ' + th.join(' and ') : (m.comparable && m.dAbs < 0 ? ', below both the 15% and the 8%/yr markers' : '');
        t += caveat(m);
        if (m.k === 'fev1' && has(m.q0)) t += '. FEV1Q ' + (m.q1 < m.q0 ? 'fell' : 'rose') + ' by ' + fmt(Math.abs(m.q0 - m.q1), 2) + ' units; healthy adults lose about 1 unit every 18 years';
        sec.impr.push(sentence(t));
      } else if (m.k === 'fev1_pct') {
        sec.impr.push('FEV1 changed by ' + fsign(m.dAbs, 0) + ' percentage points of predicted' + where + caveat(m) + '.');
      } else if (m.k === 'fvc_pct') {
        const ppf = m.comparable && m.dAbs <= -5 && within1y && ild;
        sec.impr.push('FVC changed by ' + fsign(m.dAbs, 0) + ' percentage points of predicted' + where + caveat(m) + (ppf ? '; in a non-IPF fibrotic interstitial lung disease this meets the FVC component of the physiologic criterion for progressive pulmonary fibrosis (absolute decline of at least 5 points within a year; ATS/ERS/JRS/ALAT 2022), which is one domain only and requires the symptom or radiologic domain and exclusion of other causes' : (m.comparable && m.dAbs <= -5 && within1y ? '; a decline of 5 points or more within a year is the FVC component of the progressive-pulmonary-fibrosis physiologic criterion when the setting is a fibrotic interstitial lung disease' : '')) + '.');
      } else if (m.k === 'dlco_pct') {
        const ppf = m.comparable && m.dAbs <= -10 && within1y && ild;
        sec.impr.push('DLCO (' + (f.dl.hasAdj ? 'hemoglobin-adjusted' : 'adjustment basis as entered') + ') changed by ' + fsign(m.dAbs, 0) + ' percentage points of predicted' + where + caveat(m) + (ppf ? '; in a non-IPF fibrotic interstitial lung disease this meets the DLCO component of the physiologic criterion for progressive pulmonary fibrosis (absolute decline of at least 10 points within a year; ATS/ERS/JRS/ALAT 2022), the same physiologic domain as the FVC criterion' : '') + '.');
      } else if (m.k === 'six') {
        if (!f.trend6.multi) sec.impr.push('6MWD ' + dir(m) + ' by ' + fmt(Math.abs(m.dAbs), 0) + ' m (' + fmt(Math.abs(m.dPct), 1) + '%)' + where + ', ' + (Math.abs(m.dAbs) >= 30 ? 'meeting or exceeding' : 'below') + ' the 30 m minimal important difference.');
      } else if (m.k === 'feno') {
        const sig = m.prior > 50 ? Math.abs(m.dAbs) / m.prior * 100 > 20 : Math.abs(m.dAbs) > 10;
        sec.impr.push('FeNO ' + dir(m) + ' by ' + fmt(Math.abs(m.dAbs), 0) + ' ppb' + where + '; the change is ' + (sig ? 'beyond' : 'within') + ' the ATS 2011 change thresholds (more than 20% when the prior value is above 50 ppb, or more than 10 ppb when it is 50 ppb or below).');
      } else if (m.k === 'tlc') {
        sec.impr.push('TLC ' + dir(m) + ' by ' + fmt(Math.abs(m.dPct), 1) + '% of the prior value' + where + caveat(m) + '; no validated longitudinal threshold exists for TLC, so method and variability determine its importance.');
      } else {
        sec.impr.push(m.name + ' ' + dir(m) + ' by ' + (has(m.dPct) ? fmt(Math.abs(m.dPct), 1) + '% of the prior value' : fmt(Math.abs(m.dAbs), m.d) + ' ' + m.unit) + where + caveat(m) + '.');
      }
    });
    if (has(p.ccs)) sec.impr.push('The conditional change score for FEV1 (' + fz(p.ccs) + ') is ' + (Math.abs(p.ccs) > 1.96 ? 'outside' : 'within') + ' the ±1.96 range expected in healthy children and young people.');
  });
  return sec;
}
