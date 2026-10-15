
/* ========================================================================== Minimal wording
   The shortest reading that still says everything the clinician needs: one or two sentences per section, no numbers
   line (the lab report carries the numbers), the bronchodilator verdict and the change since the prior study folded
   into the section of the index they belong to, and an INTERPRETATION of a sentence or two. Chosen with
   settings.wording = 'min' (the default in the interface); 'std' and 'full' keep the fuller sections. */
const MIN_SEV = { mild: 'mild', moderate: 'moderate', severe: 'severe' };
function minSevRed(r, what) { const sv = r && r.sev; return (sv ? MIN_SEV[sv] + ' reduction in ' : 'reduction in ') + what; }
function minState(r) { return r.low ? (r.sev ? MIN_SEV[r.sev] + 'ly reduced' : 'reduced') : (r.high ? 'increased' : 'within normal limits'); }
function minWhen(p) { return p.dateOk ? monthWords(p.date) : 'the prior study'; }
/* the change of one index since a prior study: "FEV1 +30%" with the verdict grouped by the caller */
function minChange(m, th) {
  if (m.pp) return m.name + ' ' + fsign(m.dAbs, 0) + ' points of predicted';
  if (m.k === 'six') return '6MWD ' + fsign(m.dAbs, 0) + ' m';
  if (m.k === 'feno') return 'FeNO ' + fsign(m.dAbs, 0) + ' ppb';
  return m.name + ' ' + (has(m.dPct) ? relTxt(m.dPct, th) : fsign(m.dAbs, m.d) + ' ' + m.unit);
}
/* "Since the prior study (Jul 2026), significant increase in FEV1 (+30%) and FVC (+33%)." for the metrics named in keys */
function minSerial(f, keys, lead, opts) {
  opts = opts || {};
  const out = [], th = serialThresholds(f);
  const thOf = (m) => /dlco/.test(m.k) ? th.dlco : (/fev1|fvc/.test(m.k) ? th.spiro : NaN);
  f.priors.forEach((p, i) => {
    const ms = p.metrics.filter(m => keys.indexOf(m.k) >= 0);
    if (!ms.length) return;
    const up = [], down = [], same = [], na = [], plain = [];
    ms.forEach(m => {
      const v = serialVerdict(f, m, p);
      if (v.why) { na.push({ m: m, why: v.why }); return; }
      if (v.sig === null) { plain.push(m); return; }
      (v.sig ? (m.dAbs < 0 ? down : up) : same).push(m);
    });
    const bits = [];
    const list = (arr) => joinNames(arr.map(m => m.name + (m.pp ? ' % predicted' : '') + ' (' + (m.pp ? fsign(m.dAbs, 0) + ' points' : (has(m.dPct) ? relTxt(m.dPct, thOf(m)) : fsign(m.dAbs, m.d) + ' ' + m.unit)) + ')'));
    if (up.length) bits.push('significant increase in ' + list(up));
    if (down.length) bits.push('significant decline in ' + list(down));
    if (same.length) bits.push('no significant change in ' + list(same));
    if (plain.length) bits.push(plain.map(m => minChange(m)).join(', '));
    if (na.length) bits.push(joinNames(na.map(x => x.m.name)) + ' not directly comparable (' + uniq(na.map(x => x.why)).join('; ') + ')');
    let t = (i === 0 ? (lead || 'Since the prior study') + ' (' + minWhen(p) + '), ' : 'Since ' + minWhen(p) + ', ') + bits.join('; ');
    if (i === 0 && !opts.noPpf) {
      const ppf = ms.map(m => ({ m: m, v: serialVerdict(f, m, p) })).filter(x => x.v.ppf);
      if (ppf.length) t += '; ' + (ppf.every(x => x.v.ppf === 'meets') ? 'meets' : 'would meet') + ' the physiologic criterion for progressive pulmonary fibrosis (ATS/ERS 2022)';
    }
    out.push(t);
  });
  return out;
}
/* the bronchodilator verdict in one clause: "significant bronchodilator response in FEV1 (+38% of predicted; ERS/ATS 2022)" */
function minBd(f) {
  const b = f.bd;
  if (!(f.on.bd && b.any)) return '';
  const resp = f.F['bronchodilator.response'];
  const pp = (x) => has(x) ? fsign(x, 0) + '%' : '';
  const tail = b.obstructionStatus === 'normalized' ? '; FEV1/FVC normalizes after bronchodilator' : '';
  const held = b.held === 'n' ? ' (bronchodilators taken before testing)' : '';
  if (resp === 'both') return 'significant bronchodilator response in FEV1 and FVC (' + [pp(b.dF), pp(b.dV)].filter(Boolean).join(', ') + ' of predicted; ERS/ATS 2022)' + tail + held;
  if (resp === 'fev1' || resp === 'fvc') { const x = resp === 'fev1' ? b.dF : b.dV; return 'significant bronchodilator response in ' + (resp === 'fev1' ? 'FEV1' : 'FVC') + (pp(x) ? ' (' + pp(x) + ' of predicted; ERS/ATS 2022)' : ' (ERS/ATS 2022)') + tail + held; }
  if (resp === 'negative') { const n = [pp(b.dF) ? 'FEV1 ' + pp(b.dF) : '', pp(b.dV) ? 'FVC ' + pp(b.dV) : ''].filter(Boolean).join(', '); return 'no significant bronchodilator response' + (n ? ' (' + n + ' of predicted)' : '') + (b.obstructionStatus === 'persistent' ? '; obstruction persists' : '') + held; }
  if (resp === 'indeterminate') return 'bronchodilator response not assessable' + (b.rel === 'invalid' ? ' (post-bronchodilator maneuvers not interpretable)' : (b.needPred ? ' (predicted value needed)' : ''));
  return '';
}

function minSpiro(f) {
  const sec = newSec('spiro', 'SPIROMETRY'), s = f.sp, sp = s.pat, R = s.ratio, A = s.fev1, B = s.fvc, v = f.vol, vp = v.pat, T = v.tlc;
  if (!s.any) {
    const bd = minBd(f);
    if (bd) { put(sec, bd); return sec; }
    sec.empty = true; sec.lines.push('No spirometry values entered.'); return sec;
  }
  const tlcKnown = f.on.vol && v.any && v.qc !== 'inv' && T.measured && !T.invalid;
  if (s.relF === 'invalid' && s.relV === 'invalid') put(sec, 'Not interpretable (no usable FEV1 or FVC)');
  else if (s.relF === 'invalid') put(sec, 'FEV1 not interpretable');
  else if (s.relV === 'invalid') put(sec, 'FVC not interpretable');
  const both = () => (A.low && B.low ? ((A.sev === B.sev) ? minSevRed(A, 'FEV1 and FVC') : minSevRed(A, 'FEV1') + ' and ' + minSevRed(B, 'FVC')) : (A.low ? minSevRed(A, 'FEV1') + (B.measured && !B.invalid ? ' and a normal FVC' : '') : (B.low ? minSevRed(B, 'FVC') + (A.measured && !A.invalid ? ' and a normal FEV1' : '') : '')));
  let t = '';
  if (sp.indeterminate) t = s.fvcUnder && R.measured && !R.low ? 'Early termination may have underestimated the FVC; the pattern cannot be classified reliably' : 'The pattern cannot be classified because ' + sp.reason;
  else if (sp.kind === 'noratio') t = 'FEV1/FVC not entered; obstruction cannot be assessed' + (both() ? ' (' + both() + ')' : '');
  else if (R.low) {
    const red = both();
    if (sp.kind === 'effort' && !T.low) t = 'Reduced FEV1/FVC and FVC, most likely submaximal effort';
    else if (sp.preservedFev1 && !B.low) t = 'FEV1/FVC below the LLN with FEV1 and FVC within normal limits';
    else t = 'FEV1/FVC below the LLN' + (red ? ' with ' + red : (A.measured ? '' : '; FEV1 not entered'));
    if (sp.mixed) t += '; TLC is reduced (mixed defect)';
  } else if (sp.kind === 'effort') t = 'Reduced FEV1 and FVC with a normal FEV1/FVC, most likely submaximal effort';
  else if (sp.normal) t = 'FEV1/FVC, FEV1 and FVC within normal limits' + (sp.kind === 'borderline' ? ' (some values close to the LLN)' : (sp.kind === 'concave' ? '; the curvilinear flow–volume curve raises the question of mild airflow limitation' : ''));
  else if (vp.restriction && tlcKnown) t = 'FEV1/FVC normal with ' + (both() || 'reduced volumes') + '; TLC confirms restriction';
  else if (sp.nonspecific) t = 'FEV1/FVC normal with ' + both() + ' and a normal TLC (nonspecific pattern)';
  else if (sp.highTlcReview) t = 'FEV1/FVC normal with ' + both() + ' but an increased TLC; review effort and the lung-volume method';
  else if (sp.lowFvcUnconfirmed) t = 'FEV1/FVC normal with ' + both() + ', suggestive of restriction; lung volumes needed to confirm';
  else if (sp.kind === 'isolatedFEV1') t = 'Isolated ' + minSevRed(A, 'FEV1') + ' with a normal FEV1/FVC and FVC';
  else if (R.high) t = 'FEV1/FVC above the ULN' + (both() ? ' with ' + both() : '; FEV1 and FVC within normal limits');
  else t = 'No obstruction' + (A.measured && A.wnl && !B.measured ? '; FVC not entered' : (B.measured && B.wnl && !A.measured ? '; FEV1 not entered' : ((B.high || A.high) ? '; ' + (B.high ? 'FVC' : 'FEV1') + ' above the ULN (can be a normal variant)' : '')));
  if (t) put(sec, t);
  const fx = f.F['spirometry.fixed_ratio_discordance'];
  if (fx === 'fixed_only') put(sec, 'FEV1/FVC below 0.70 but above the LLN (no obstruction by the LLN criterion)');
  else if (fx === 'lln_only') put(sec, 'FEV1/FVC below the LLN although above 0.70');
  const bd = minBd(f);
  if (bd) put(sec, bd);
  if (f.bd && f.bd.drop && f.on.bd) put(sec, 'FEV1 or FVC fell after bronchodilator; check effort and timing');
  minSerial(f, ['fev1', 'fvc', 'fev1_pct', 'fvc_pct']).forEach(l => put(sec, l));
  if (sp.code) sec.codes.push(sp.code);
  sp.codes.forEach(c => sec.codes.push(c));
  const resp = f.F['bronchodilator.response'];
  if (resp === 'both' || resp === 'fev1' || resp === 'fvc') sec.codes.push('S62'); else if (resp === 'negative') sec.codes.push('S61');
  sec.codes = uniq(sec.codes);
  return sec;
}

function minVol(f) {
  const v = f.vol, vp = v.pat, T = v.tlc;
  const sec = newSec('vol', 'LUNG VOLUMES');
  if (!f.on.vol) { sec.lines.push('Not performed.'); return sec; }
  if (!v.any) { sec.empty = true; sec.lines.push('No lung-volume values entered.'); return sec; }
  if (v.qc === 'inv') { put(sec, 'Not interpretable'); return sec; }
  let t = '';
  if (T.measured && T.invalid) t = 'TLC not interpretable';
  else if (vp.restriction) t = cap((vp.sev ? MIN_SEV[vp.sev] + ' ' : '') + 'restriction (TLC below the LLN)') + (vp.complex ? ' with an elevated RV/TLC (complex restriction)' : (vp.simple && v.rvtlc.measured ? '; RV/TLC normal' : ''));
  else if (vp.hyperTlc) t = 'Hyperinflation (TLC above the ULN) with air trapping (RV/TLC above the ULN)';
  else if (vp.hyperinflation) t = 'Hyperinflation (elevated FRC and RV/TLC with a normal TLC)';
  else if (vp.airTrapping) t = 'Air trapping (RV/TLC above the ULN) with a normal TLC';
  else if (vp.largeLungs) t = 'Increased TLC with normal RV/TLC and FRC/TLC (large lungs rather than hyperinflation)';
  else if (vp.unclassified) t = 'Increased TLC; RV/TLC not entered, so large lungs and hyperinflation cannot be told apart';
  else if (vp.lowRV) t = 'RV reduced with a normal TLC';
  else if (vp.rvHighFractionNormal) t = 'RV increased with a normal RV/TLC and TLC (air trapping not established)';
  else if (vp.kind === 'rvHighNoFraction') t = 'RV increased; RV/TLC not entered';
  else if (vp.kind === 'trapNoTLC') t = 'RV/TLC elevated; TLC not entered';
  else if (!T.measured) t = 'TLC not entered';
  else if (vp.kind === 'borderline') t = 'TLC normal but close to the LLN';
  else t = 'TLC' + (v.rvtlc.measured && !v.rvtlc.invalid ? ' and RV/TLC' : '') + ' within normal limits' + (v.rvtlc.bl ? ' (RV/TLC close to the ULN)' : '');
  const extras = [];
  if (v.erv.measured && !v.erv.invalid && v.erv.low) extras.push('ERV reduced');
  if (v.dilution && f.sp.ratio.low) extras.push('gas dilution may underestimate TLC with obstruction');
  if (extras.length) t += '; ' + extras.join('; ');
  put(sec, t);
  if (v.qc === 'limited') put(sec, 'Technical factors reduce confidence in the measurements');
  minSerial(f, ['tlc']).forEach(l => put(sec, l));
  if (vp.code) sec.codes.push(vp.code);
  return sec;
}

function minDlco(f) {
  const sec = newSec('dlco', 'DIFFUSING CAPACITY'), d = f.dl, pat = d.pat, D = d.dlco;
  if (!f.on.dlco) { sec.lines.push('Not performed.'); return sec; }
  if (!d.any) { sec.empty = true; sec.lines.push('No diffusing-capacity values entered.'); return sec; }
  if (d.qc === 'inv') { put(sec, 'Not interpretable'); return sec; }
  const hbTxt = has(d.hb) ? 'Hgb ' + fmt(d.hb, 1) + (d.anemic ? ', low' : (d.hbHigh ? ', high' : '')) : (d.hbcat ? 'hemoglobin ' + ({ low: 'low', nl: 'normal', high: 'high' })[d.hbcat] : '');
  const paired = D.measured && d.adj.measured && !d.reportedAdjusted && !D.invalid && !d.adj.invalid;
  let t = '';
  if (D.measured && D.invalid) t = 'Not interpretable';
  else if (pat.hb === 'full') t = 'Reduced uncorrected but normal after correction for the anemia' + (hbTxt ? ' (' + hbTxt + ')' : '');
  else if (paired) t = (minState(D) === minState(d.adj) ? cap(minState(D)) + ', uncorrected and after correction for hemoglobin' : cap(minState(D)) + ' uncorrected, ' + minState(d.adj) + ' after correction for hemoglobin') + (hbTxt ? ' (' + hbTxt + ')' : '');
  else if (D.measured) {
    t = cap(minState(D)) + (D.bl ? ' (close to the LLN)' : '');
    if (d.reportedAdjusted) t += ' (corrected for hemoglobin' + (hbTxt ? ', ' + hbTxt : '') + ')';
    else if (d.basis === 'un') {
      if (has(d.adjPct) && (D.low || d.anemic === true || d.hbHigh)) t += ' (not corrected for hemoglobin; ' + Math.round(d.adjPct) + '% predicted after correction for ' + (d.anemic ? 'the anemia' : 'hemoglobin') + (hbTxt ? ', ' + hbTxt : '') + ')';
      else t += ' (not corrected for hemoglobin' + (hbTxt ? ', ' + hbTxt : '') + (d.corrDir === 'up' && !has(d.adjPct) ? '; correction would raise it' : (d.corrDir === 'down' && !has(d.adjPct) ? '; correction would lower it' : '')) + ')';
    } else if ((D.low || D.high) && !d.basisKnown) t += ' (hemoglobin basis not stated' + (hbTxt ? '; ' + hbTxt : '') + ')';
  } else t = 'DLCO not entered';
  const va = d.va, kco = d.kco, vk = [];
  if (va.measured && !va.invalid) vk.push('VA ' + minState(va));
  if (kco.measured && !kco.invalid) vk.push('KCO ' + minState(kco));
  if (vk.length) t += '; ' + vk.join(', ');
  if (d.cohbHigh) t += '; carboxyhemoglobin elevated';
  put(sec, t);
  if (d.qc === 'limited') put(sec, 'Technical factors reduce confidence in the measurement');
  if (has(f.sp.fvcL) && f.sp.fvcL < 1.5) put(sec, 'Below an FVC of about 1.5 L the DLCO is less reliable');
  // the progressive-fibrosis criterion is stated once: with the FVC when the FVC decline meets it
  const fvcPpf = f.priors.length && f.priors[0].metrics.some(m => m.k === 'fvc_pct' && serialVerdict(f, m, f.priors[0]).ppf);
  minSerial(f, ['dlco', 'dlco_pct'], null, { noPpf: !!fvcPpf }).forEach(l => put(sec, l));
  pat.codes.forEach(c => sec.codes.push(c));
  sec.codes = uniq(sec.codes);
  return sec;
}

/* the walk in one or two sentences: distance against its reference, desaturation, heart rate, the trend */
function minSix(f, std) {
  const sec = newSec('six', '6 MINUTE WALK TEST (6MWT)'), x = f.six, tr = f.trend6;
  if (!x.any && !tr.multi) { sec.empty = true; sec.lines.push('No 6-minute walk values entered.'); return sec; }
  const early = x.stop === 'early', o2 = x.onO2 ? ' on ' + x.o2text : '';
  const parts = [];
  if (has(x.dist)) {
    if (early) parts.push('stopped' + (has(x.timeMin) ? ' at ' + fmt(x.timeMin, 1) + ' min' : ' early') + ' after ' + distTxt(f, x.dist) + (x.stopWhy ? ' (' + x.stopWhy + ')' : ''));
    else parts.push(distTxt(f, x.dist) + (has(x.pctCalc) ? ' (' + Math.round(x.pctCalc) + '% predicted' + (has(x.llnUse) ? (x.dist >= x.llnUse ? ', within normal limits' : ', below the LLN of ' + distTxt(f, x.llnUse, true)) : '') + ')' : (has(x.llnUse) ? (x.dist >= x.llnUse ? ' (within normal limits)' : ' (below the LLN of ' + distTxt(f, x.llnUse, true) + ')') : '')));
  } else if (x.distCat) parts.push(x.distCat === 'low' ? 'reduced distance' : 'distance within normal limits');
  const sat = [];
  if (has(x.s0)) sat.push('SpO2 ' + fmt(x.s0, 0) + '%' + o2 + ' at rest');
  if (has(x.sn)) sat.push((x.desat ? 'desaturation to ' : 'nadir ') + fmt(x.sn, 0) + '%' + (x.desat ? '' : ' (no exertional hypoxemia)') + (early && x.sn < 85 ? '; stopped for SpO2 below 85%' : ''));
  else if (x.desatSel) sat.push(x.desatSel === 'none' ? 'no exertional hypoxemia' : (x.desatSel === 'fall' ? 'exertional hypoxemia (fall of more than 4–6 points)' : 'exertional hypoxemia (SpO2 88% or lower)'));
  if (sat.length) parts.push(sat.join(', '));
  const hr = [];
  if (has(x.hp)) hr.push('peak HR ' + fmt(x.hp, 0) + (has(x.hrPct) ? ' (' + Math.round(x.hrPct) + '% of maximum)' : ''));
  if (has(x.hrr1)) hr.push('1-min HR recovery ' + fmt(x.hrr1, 0) + ' bpm' + (x.hrr1 <= 18 ? (x.hrr1 > 13 ? ' (borderline)' : ' (abnormal)') : ''));
  else if (x.hrrSel) hr.push('HR recovery ' + (x.hrrSel === 'abn' ? 'abnormal' : 'normal'));
  if (hr.length) parts.push(hr.join(', '));
  if (has(x.b1)) parts.push('Borg dyspnea ' + (has(x.b0) ? fmt(x.b0, 1) + ' to ' : '') + fmt(x.b1, 1));
  if (parts.length) put(sec, (has(x.dist) ? 'Walked ' : cap('')) + parts.join('; '));
  if (has(x.dsp) && x.dsp < 200) put(sec, 'Distance–saturation product below 200 m% (associated with 12-month mortality in IPF)');
  if (tr.multi) { const c = tr.vsPrev; put(sec, '6MWD ' + (c.cls === 'stable' ? 'similar to' : fmt(Math.abs(c.dAbs), 0) + ' m ' + (c.cls === 'down' ? 'lower' : 'higher') + ' than') + ' the previous walk (' + fmt(c.from.dist, 0) + ' m, ' + monthWords(c.from.ds) + ')' + (c.cls === 'stable' ? ', within the 30 m minimal important difference' : '')); sec.trend = std.trend; }
  minSerial(f, ['six']).forEach(l => put(sec, l));
  sec.impr = std.impr.slice();
  return sec;
}
/* the sections at the minimal level: spirometry, volumes and DLCO rewritten; quality and past-testing folded away;
   the other tests keep their (already short) sections, with any serial change of theirs appended */
function minimalSections(f, secs) {
  const out = [];
  secs.forEach(s => {
    if (s.key === 'qual' || s.key === 'prior') return;
    if (s.key === 'spiro') out.push(minSpiro(f));
    else if (s.key === 'vol') out.push(minVol(f));
    else if (s.key === 'dlco') out.push(minDlco(f));
    else if (s.key === 'six') out.push(minSix(f, s));
    else {
      const c = { key: s.key, title: s.title, lines: s.lines.slice(), codes: s.codes.slice(), impr: s.impr.slice(), empty: s.empty };
      if (s.key === 'feno') minSerial(f, ['feno']).forEach(l => { const t = sentence(l); if (t) c.lines.push(t); });
      out.push(c);
    }
  });
  return out;
}

/* the DLCO sentence of the minimal interpretation: the grade, then the causes that fit the rest of the study */
function minDlcoImpr(f, context) {
  const d = f.dl, D = d.dlco, pat = d.pat;
  if (!(f.on.dlco && d.any && D.measured) || D.invalid) return '';
  if (pat.hb === 'full') return 'DLCO normal after correction for the anemia.';
  const corrected = d.reportedAdjusted || (d.adj.measured && !d.adj.invalid);
  if (D.high) return 'DLCO increased, as in left ventricular failure, asthma, pulmonary hemorrhage or obesity.';
  if (!D.low) {
    if (context === 'obstruction') return 'DLCO normal, which argues against emphysema.';
    if (context === 'restriction' || context === 'lowfvc') return 'DLCO normal, favoring an extrapulmonary cause (chest wall, obesity, neuromuscular)' + (context === 'lowfvc' ? ' if restriction is confirmed' : '') + '.';
    return '';
  }
  const grade = D.sev ? SEV_ADV[D.sev] + ' impaired' : 'impaired';
  const adj = (has(d.adjPct) && !corrected && d.basis === 'un' && d.anemic === true) ? ' (' + Math.round(d.adjPct) + '% predicted after correction for the anemia)' : '';
  const anemia = corrected ? '' : 'anemia, ';
  let causes;
  if (context === 'obstruction') causes = 'emphysema, pulmonary vascular disease, ' + anemia + 'or smoking before the study';
  else if (context === 'mixed') causes = 'combined fibrosis and emphysema, pulmonary vascular disease, ' + anemia + 'or smoking before the study';
  else if (context === 'restriction' || context === 'lowfvc') causes = 'interstitial lung disease, pulmonary vascular disease, ' + anemia + 'or smoking before the study';
  else causes = 'restrictive lung disease before FVC falls, pulmonary arterial disease (PE, PH), ' + anemia + 'or smoking before the study';
  let t = 'Diffusing capacity ' + grade + adj + ', which can be seen in ' + causes + (corrected ? ' (value corrected for hemoglobin)' : '') + '.';
  const mech = { lowVA_highKCO: ' Largely explained by the reduced alveolar volume (KCO elevated).', normalVA_lowKCO: ' KCO reduced with a normal VA: a true gas-transfer defect.', discordantK: ' Low DLCO with a high KCO and normal VA is unusual; check the maneuver.' }[pat.mech];
  if (mech) t += mech;
  if (pat.mech !== 'lowVA_highKCO' && !corrected && d.anemic === true && !adj) t += ' Part of the reduction reflects the anemia.';
  if (f.ctx.smoke === 'current') t += ' Current smoking lowers the measured DLCO.';
  return t;
}
function minimalImpression(f, secs) {
  const out = [], add = (s) => { if (s) out.push(s); };
  const by = {}; secs.forEach(s => { by[s.key] = s; });
  const s = f.sp, sp = s.pat, R = s.ratio, A = s.fev1, B = s.fvc, v = f.vol, vp = v.pat, T = v.tlc, cx = diseaseContext(f);
  const haveSp = f.on.spiro && s.any, haveVol = f.on.vol && v.any && v.qc !== 'inv', haveDl = f.on.dlco && f.dl.any && f.dl.dlco.measured && !f.dl.dlco.invalid;
  const tlcKnown = haveVol && T.measured && !T.invalid;
  if (haveSp) {
    if (s.relF === 'invalid' && s.relV === 'invalid') add('Spirometry not interpretable.');
    else if (s.relF === 'limited' || s.relV === 'limited') add('Technical factors limit the interpretation.');
  }
  const volPhrase = () => !tlcKnown ? '' : (vp.hyperTlc ? ' with hyperinflation and air trapping' : (vp.hyperinflation ? ' with hyperinflation' : (vp.airTrapping ? ' with air trapping' : (!T.low && !vp.restriction ? ' with normal lung volumes' : ''))));
  const bdClause = () => {
    const resp = f.F['bronchodilator.response'];
    if (!(f.on.bd && f.bd.any)) return '';
    if (resp === 'both' || resp === 'fev1' || resp === 'fvc') return ' and a significant bronchodilator response';
    if (resp === 'negative') return ', without a significant bronchodilator response';
    return '';
  };
  let context = '';
  if (haveSp && sp.indeterminate) add('The spirometric pattern cannot be classified' + (T.low ? '; TLC is reduced, which establishes restriction' : '') + '.');
  else if (haveSp && sp.kind === 'noratio') add('Obstruction cannot be assessed without FEV1/FVC' + (haveVol && vp.restriction ? '; lung volumes show restriction' : '') + '.');
  else if (haveSp && R.low) {
    const sevA = A.sev ? MIN_SEV[A.sev] : '';
    if (sp.mixed) { context = 'mixed'; add('Mixed obstructive' + (sevA ? ' (' + sevA + ')' : '') + ' and restrictive' + (vp.sev ? ' (' + MIN_SEV[vp.sev] + ')' : '') + ' defect' + bdClause() + '.'); }
    else if (sp.kind === 'effort' && !T.low) add('Reduced FEV1/FVC and FVC, most likely submaximal effort; repeat if it would change management.');
    else {
      context = 'obstruction';
      const lead = sp.preservedFev1 ? 'Obstructive defect with a preserved FEV1' : (sevA ? cap(sevA) + ' obstructive defect' : 'Obstructive defect (severity not graded: FEV1 ' + (A.invalid ? 'not interpretable' : 'not entered') + ')');
      add(lead + volPhrase() + bdClause() + '.');
      if (B.low && !B.invalid && !tlcKnown) add('Lung volumes would clarify whether the reduced FVC is air trapping or restriction.');
      if (cx.copd && !cx.asthma) add('Consistent with ' + (sevA ? sevA + ' ' : '') + 'COPD.');
      else if (cx.asthma && !cx.copd) add('Consistent with asthma.');
      else if (cx.copd && cx.asthma) add('Consistent with COPD and/or asthma.');
      else if (cx.smoker) add('Consistent with ' + (sevA ? sevA + ' ' : '') + 'COPD in a ' + f.ctx.smoke + ' smoker.');
    }
  } else if (haveSp && sp.kind === 'effort' && !vp.restriction) add('Reduced FEV1 and FVC with a normal ratio, most likely submaximal effort; repeat if it would change management.');
  else if ((haveSp || haveVol) && vp.restriction && tlcKnown) {
    context = 'restriction';
    const nm = cx.nmd || (f.on.mip && (f.mp.mip === 'low' || f.mp.snip === 'low'));
    add(cap((vp.sev ? MIN_SEV[vp.sev] + ' ' : '') + 'restrictive defect') + (haveSp ? ' without obstruction' : (!R.measured ? ' (FEV1/FVC not entered)' : '')) + (vp.complex ? ', with an elevated RV/TLC (complex restriction)' : '') + (haveSp ? bdClause() : '') + (nm ? '; reduced respiratory pressures point to a neuromuscular cause' : (cx.obese && !haveDl ? '; obesity is a common cause' + (has(f.ctx.bmi) ? ' (BMI ' + fmt(f.ctx.bmi, 1) + ')' : '') : '')) + '.');
  } else if (haveSp && sp.nonspecific) { context = 'nonspecific'; add('Nonspecific pattern (reduced ' + (A.low && B.low ? 'FEV1 and FVC' : (A.low ? 'FEV1' : 'FVC')) + ' with a normal ratio and TLC), as with ' + (vp.airTrapping ? 'air trapping' : 'poor effort, air trapping' + (cx.obese ? ' or obesity' : '')) + bdClause() + '.'); }
  else if (haveSp && sp.highTlcReview) add('Reduced FEV1 and/or FVC with a normal ratio but an increased TLC: review effort and the lung-volume method.');
  else if (haveSp && sp.lowFvcUnconfirmed) { context = 'lowfvc'; add((A.low && B.low ? cap(minSevRed(A, 'FEV1 and FVC')) : cap(minSevRed(B, 'FVC'))) + ' with a normal FEV1/FVC, suggestive of restriction; lung volumes needed to confirm' + (A.low && B.low ? ' (mild obstruction with air trapping is the alternative)' : '') + bdClause() + '.'); }
  else if (haveSp && sp.kind === 'isolatedFEV1') { context = 'isolated'; add('Isolated ' + minSevRed(A, 'FEV1') + ' with a normal ratio and FVC, possibly early airway disease' + bdClause() + '.'); }
  else if (haveSp && sp.normal) {
    context = 'normal';
    const parts = ['spirometry'];
    if (tlcKnown && vp.normal) parts.push('lung volumes');
    if (haveDl && !f.dl.dlco.low && !f.dl.dlco.high) parts.push('diffusing capacity');
    let t = 'Normal ' + joinNames(parts);
    if (tlcKnown && !vp.normal) {
      if (vp.airTrapping) t += '; air trapping on lung volumes (elevated RV/TLC), which can be an early sign of small airway disease';
      else if (vp.hyperinflation || vp.hyperTlc) t += '; hyperinflation on lung volumes';
      else if (vp.largeLungs) t += '; increased TLC with normal fractions (large lungs)';
      else if (vp.lowRV) t += '; isolated low RV';
    }
    if (f.F['bronchodilator.response'] === 'both' || f.F['bronchodilator.response'] === 'fev1' || f.F['bronchodilator.response'] === 'fvc') t += '; a significant bronchodilator response with normal baseline spirometry indicates variable airway physiology';
    add(t + '.');
    if (cx.asthma || f.ctx.hasInd('wheeze') || f.ctx.hasInd('cough')) add('Normal results do not exclude asthma' + (!f.on.bronch ? '; suggest methacholine challenge if clinically indicated' : '') + '.');
  } else if (haveSp) {
    let t = 'No obstruction';
    if (A.measured && A.wnl && !B.measured) t += '; restriction not assessable without FVC';
    else if (B.high || A.high) t += '; ' + (B.high ? 'FVC' : 'FEV1') + ' above the ULN';
    add(t + volPhrase() + bdClause() + '.');
  } else if (haveVol) {
    const lead = volOnlyLead(f);
    add(lead.replace(/^Lung volumes indicate /, '').replace(/^There is a /, '').replace(/^There is no evidence of a restrictive ventilatory defect \(TLC is not reduced\)$/, 'No restriction (TLC not reduced)').replace(/^TLC is /, 'TLC ') .replace(/^(.)/, (m) => m.toUpperCase()) + '.');
  }
  // the diffusing capacity, with the causes that fit the pattern
  if (haveDl && !(context === 'normal' && !f.dl.dlco.low && !f.dl.dlco.high)) add(minDlcoImpr(f, context));
  else if (haveDl && context === 'normal' && f.dl.dlco.bl) add('DLCO close to the LLN.');
  // clinician-selected wording and differentials
  const rv = reviewAdditions(f);
  rv.filter(r => r.section !== 'followup' && r.section !== 'serial' && r.section !== 'local_end').forEach(r => add(r.text));
  differentialText(f.dx || []).sentences.forEach(add);
  // curve and adjunct tests
  if (by.fvl) by.fvl.impr.forEach(add);
  ['raw', 'osc', 'mip', 'post', 'feno', 'bronch', 'six', 'cpet', 'gas'].forEach(k => { if (by[k]) by[k].impr.forEach(add); });
  rv.filter(r => r.section === 'serial').forEach(r => add(r.text));
  rv.filter(r => r.section === 'followup').forEach(r => add(r.text));
  (f.studies || []).forEach(t => add(suggestLine(t)));
  rv.filter(r => r.section === 'local_end').forEach(r => add(r.text));
  if (f.on.vol && f.vol.any && f.vol.qc === 'inv' && !haveSp) add('Lung volumes not interpretable.');
  return out.filter(Boolean).map(sentence);
}
