/* ==========================================================================
   PFT Interpreter engine — part 4: synthesized interpretation, heads-up
   (discordance) rules, report text, public API
   The INTERPRETATION is one synthesis: the ventilatory pattern, lung volumes
   and gas transfer are read together, then the bronchodilator response, the
   adjunct tests, the serial comparison, and what would clarify the picture.
   Every sentence is conditioned on the verified facts in F; review-only
   wording appears only when the clinician has selected it.
   ========================================================================== */

const SEV_CAP = { mild: 'Mild', moderate: 'Moderate', severe: 'Severe' };
function sevOf(r) { return r && r.sev ? r.sev : null; }
function dlcoWord(f) {
  const d = f.dl, D = d.dlco;
  if (!(f.on.dlco && d.any && D.measured) || D.invalid) return '';
  const lab = d.reportedAdjusted ? 'hemoglobin-adjusted DLCO' : 'DLCO';
  const z = D.z !== null ? ' (z ' + fz(D.z) + ')' : '';
  if (D.low) return 'a ' + (D.sev ? SEV_ADV[D.sev] + ' reduced ' : 'reduced ') + lab + z;
  if (D.high) return 'an increased ' + lab + z;
  if (D.bl) return 'a ' + lab + ' within normal limits but near the LLN' + z;
  return 'a ' + lab + ' within normal limits' + z;
}
/* standalone sentence when no ventilatory lead carries the DLCO: "DLCO is moderately reduced (z -3.0)." */
function dlcoSentence(f) {
  const d = f.dl, D = d.dlco;
  if (!(f.on.dlco && d.any && D.measured) || D.invalid) return '';
  const lab = d.reportedAdjusted ? 'Hemoglobin-adjusted DLCO' : 'DLCO';
  const z = D.z !== null ? ' (z ' + fz(D.z) + ')' : '';
  if (D.low) return lab + ' is ' + (D.sev ? SEV_ADV[D.sev] + ' reduced' : 'reduced') + z + '.';
  if (D.high) return lab + ' is increased' + z + '.';
  if (D.bl) return lab + ' is within normal limits but near the LLN' + z + '.';
  return lab + ' is within normal limits' + z + '.';
}
function withDlco(lead, f) { const w = dlcoWord(f); if (!w) return lead; return lead + (/ with /.test(lead) ? ' and ' : ' with ') + w; }
/* short z for inline use: "z -3.4" */
function zs(r) { return r && r.z !== null ? ' z ' + fz(r.z) : ''; }
function zc(label, r) { return r && r.z !== null ? label + ' z ' + fz(r.z) : label; }
function volClause(f) {
  const v = f.vol, vp = v.pat;
  if (!(f.on.vol && v.any) || v.qc === 'inv' || !v.tlc.measured) return '';
  if (vp.hyperTlc) return ' with hyperinflation and air trapping (TLC and RV/TLC above the ULN' + (v.frctlc.high || v.frc.high ? ', resting volume elevated' : '') + ')';
  if (vp.hyperinflation) return ' with hyperinflation (elevated RV/TLC and ' + (v.frctlc.high ? 'FRC/TLC' : 'FRC') + ', TLC within limits)';
  if (vp.airTrapping) return ' with air trapping (RV/TLC above the ULN' + (v.tlc.high ? ' and TLC above the ULN' : ', TLC not reduced') + ')';
  if (vp.normal) return ' without air trapping or hyperinflation on lung volumes';
  if (vp.fractionsMissing && v.tlc.wnl) return ' (TLC within limits; RV/TLC not entered, so air trapping is not assessed)';
  return '';
}

/* -------------------------------------------------------- ventilatory core */
function ventCore(f) {
  const s = f.sp, R = s.ratio, A = s.fev1, B = s.fvc, sp = s.pat, v = f.vol, vp = v.pat, T = v.tlc, d = f.dl;
  const out = [];
  const haveSp = f.on.spiro && s.any, haveVol = f.on.vol && v.any;
  if (!haveSp && !haveVol) return out;
  const sevA = sevOf(A), sevB = sevOf(B);
  const bmiNote = f.ctx.obese ? ' With a BMI of ' + fmt(f.ctx.bmi, 1) + ', obesity may contribute to the restrictive pattern.' : '';

  if (!haveSp) {
    out.push(withDlco(volOnlyLead(f), f) + '.');
    return out;
  }

  /* pattern cannot be classified */
  if (sp.indeterminate) {
    if (s.fvcUnder && R.measured && !R.low) out.push('FEV1/FVC is preserved, but early termination may have underestimated FVC and raised the ratio, so the spirometric pattern (normal versus nonspecific or restrictive) cannot be reliably classified; repeat testing is advised if the result would change management.' + (T.low ? ' TLC is below the LLN, which confirms restriction independently of the spirometry.' : ''));
    else out.push('The spirometric pattern cannot be classified because ' + sp.reason + '.');
    const w = dlcoSentence(f); if (w) out.push(w);
    return out;
  }
  if (sp.kind === 'noratio') {
    out.push('FEV1/FVC was not entered, so airflow obstruction cannot be assessed' + ((A.low || B.low) ? '; the reduced ' + (A.low && B.low ? 'FEV1 and FVC' : (A.low ? 'FEV1' : 'FVC')) + ' cannot be classified without the ratio' : '') + '.');
    if (haveVol && vp.restriction) out.push(withDlco(volOnlyLead(f), f) + '.');
    else { const w = dlcoSentence(f); if (w) out.push(w); }
    return out;
  }

  /* obstruction */
  if (R.low) {
    if (sp.kind === 'effort' && !T.low) {
      out.push('Low FEV1/FVC with a reduced FVC; submaximal effort (or muscle weakness) is a likely explanation for the reduced spirometric values. Repeat testing if clinically needed.');
      const w = dlcoSentence(f); if (w) out.push(w);
      return out;
    }
    if (sp.mixed) {
      let t = 'Mixed obstructive and restrictive ventilatory impairment (' + zc('FEV1/FVC', R) + ' and ' + zc('TLC', T) + ' are both below the LLN)';
      const q = [];
      if (sevA) q.push('a ' + sevA + ' reduction in FEV1 (z ' + fz(A.z) + ')'.replace(' (z null)', '')); else if (A.measured && !A.invalid && A.wnl) q.push('a preserved FEV1');
      if (vp.sev) q.push('a ' + vp.sev + ' reduction in TLC');
      if (q.length) t += ', with ' + q.join(' and ');
      if (v.rvtlc.high) t += '; RV/TLC is elevated, which in restriction partly reflects the lower TLC and does not by itself establish air trapping';
      out.push(withDlco(t, f) + '.' + bmiNote);
      if (sp.kind === 'effort') out.push('Submaximal effort or respiratory-muscle weakness is a likely contributor to the reduced spirometric values (no sharp peak flow); the low TLC is independent of the forced maneuver.');
      return out;
    }
    let lead;
    if (sp.preservedFev1) lead = 'Obstructive ventilatory impairment with a preserved FEV1 (' + zc('FEV1/FVC', R) + ' below the LLN' + (A.z !== null ? '; FEV1 z ' + fz(A.z) : '') + ')';
    else if (sevA) lead = SEV_CAP[sevA] + ' obstructive ventilatory impairment (' + zc('FEV1/FVC', R) + ' below the LLN' + (A.z !== null ? '; FEV1 z ' + fz(A.z) : '') + ')';
    else lead = 'Obstructive ventilatory impairment (' + zc('FEV1/FVC', R) + ' below the LLN); the severity is not graded because FEV1 ' + (A.invalid ? 'is not interpretable' : 'was not entered');
    if (sp.kind === 'dysanapsis') lead += ', with ' + (B.high ? 'an FVC' : 'an FEV1') + ' above the ULN';
    lead += volClause(f);
    out.push(withDlco(lead, f) + '.');
    if (B.low && !B.invalid) {
      if (T.measured && !T.invalid && !T.low) out.push('The reduced FVC' + (B.z !== null ? ' (z ' + fz(B.z) + ')' : '') + ' is not explained by restriction (TLC not reduced) and may relate to airway closure or incomplete emptying rather than a restrictive component.');
      else if (!T.measured || T.invalid) out.push('FVC is reduced' + (B.z !== null ? ' (z ' + fz(B.z) + ')' : '') + '; a coexisting restrictive component is unconfirmed without lung volumes. Consider obtaining lung volumes.');
    } else if (B.measured && B.wnl && !(T.measured && !T.invalid)) out.push('FVC is within normal limits, arguing against restrictive impairment.');
    return out;
  }

  /* ratio preserved */
  if (sp.kind === 'effort' && !vp.restriction) {
    out.push('Reduced FEV1 and FVC with a preserved FEV1/FVC; submaximal effort (or muscle weakness) is a likely explanation for the reduced spirometric values. Repeat testing if clinically needed.');
    const w = dlcoSentence(f); if (w) out.push(w);
    return out;
  }
  if (vp.restriction) {
    let lead = (vp.sev ? SEV_CAP[vp.sev] + ' r' : 'R') + 'estrictive ventilatory impairment (' + zc('TLC', T) + ' below the LLN' + (vp.sev ? ', graded by TLC z-score' : '') + ')';
    if (vp.simple) lead += ', simple pattern (RV/TLC' + (v.frctlc.measured || v.frc.measured ? ' and resting volume' : '') + ' not elevated)';
    else if (vp.complex) lead += ', complex pattern (RV/TLC above the ULN with a preserved FEV1/FVC; reduced thoracic expansion, respiratory-muscle weakness or airway closure are possible contributors)';
    if (sevB) lead += ', with a ' + sevB + ' reduction in FVC' + (B.z !== null ? ' (z ' + fz(B.z) + ')' : '');
    out.push(withDlco(lead, f) + '.' + bmiNote);
    if (R.high) out.push('FEV1/FVC is above the ULN, which can accompany restriction.');
    if (sp.kind === 'effort') out.push('Submaximal effort or respiratory-muscle weakness is a likely contributor to the reduced spirometric values (no sharp peak flow); the low TLC is independent of the forced maneuver' + (vp.complex ? ', and the complex pattern (retained RV) is the volume distribution seen with weakness or chest-wall limitation' : '') + '.');
    return out;
  }
  if (sp.nonspecific) {
    const which = A.low && B.low ? 'FEV1 and FVC' : (A.low ? 'FEV1' : 'FVC');
    let t = 'Nonspecific ventilatory pattern: reduced ' + which + ' with a preserved FEV1/FVC and a TLC within reference limits' + (T.z !== null ? ' (z ' + fz(T.z) + ')' : '') + '; restriction is not demonstrated';
    t = withDlco(t, f) + '.';
    out.push(t + ' A bronchodilator response and airway resistance may help clarify the cause (ERS/ATS 2022).');
    if (vp.airTrapping) out.push('RV/TLC is above the ULN with a TLC within limits, supporting air trapping as a contributor.');
    return out;
  }
  if (sp.highTlcReview) {
    out.push('Reduced ' + (A.low && B.low ? 'FEV1 and FVC' : (A.low ? 'FEV1' : 'FVC')) + ' with a preserved FEV1/FVC and a TLC above the ULN' + (T.z !== null ? ' (z ' + fz(T.z) + ')' : '') + '. This does not fit the nonspecific pattern (which requires a normal TLC) or restriction; review effort, the vital-capacity maneuvers and the lung-volume method.' + (dlcoWord(f) ? ' There is ' + dlcoWord(f) + '.' : ''));
    return out;
  }
  if (sp.lowFvcUnconfirmed) {
    let t;
    if (A.low && B.low) t = cap(sevA || 'reduced') + ' reduction in FEV1' + (A.z !== null ? ' (z ' + fz(A.z) + ')' : '') + ' and ' + (sevB || 'reduced') + ' reduction in FVC' + (B.z !== null ? ' (z ' + fz(B.z) + ')' : '') + ' with a preserved FEV1/FVC, which is suggestive of restriction, but cannot definitively assess given no lung volumes; consider obtaining lung volumes. This may also reflect mild obstructive impairment with air trapping.';
    else t = cap(sevB || 'reduced') + ' reduction in FVC which is suggestive of restriction, but cannot definitively assess given no lung volumes; consider obtaining lung volumes.';
    out.push(t);
    if (R.high) out.push('FEV1/FVC is above the ULN, which can accompany restriction.');
    const w = dlcoSentence(f); if (w) out.push(w);
    return out;
  }
  if (sp.kind === 'isolatedFEV1') {
    out.push('Isolated ' + (sevA || 'reduced') + ' reduction in FEV1' + (A.z !== null ? ' (z ' + fz(A.z) + ')' : '') + ' with a preserved FEV1/FVC and FVC' + (T.measured && T.low ? '; TLC is below the LLN' : '') + '; this may represent an early ventilatory impairment.');
    const w = dlcoSentence(f); if (w) out.push(w);
    return out;
  }
  if (sp.normal) {
    const F = f.F, dl = f.dl.dlco, haveDl = f.on.dlco && f.dl.any && dl.measured && !dl.invalid;
    if (F['integrated.all_normal']) { out.push('Normal spirometry, lung volumes and DLCO.' + (sp.kind === 'borderline' ? ' One or more spirometric values lie near the LLN; significance is uncertain and this may be a normal variant.' : '')); return out; }
    if (F['patterns.isolated_low_dlco']) {
      out.push('Isolated ' + (dl.sev || 'reduced') + ' reduction in DLCO' + (dl.z !== null ? ' (z ' + fz(dl.z) + ')' : '') + ' with normal spirometry and lung volumes. The gas-transfer deficit points to the alveolar–capillary unit rather than the airways or lung volumes; PFTs alone do not distinguish its causes.');
      return out;
    }
    let t = 'Normal spirometry';
    if (sp.kind === 'borderline') t = 'Spirometric values are within normal limits but near the LLN; significance is uncertain (a very mild ventilatory impairment or a normal variant)';
    else if (sp.kind === 'concave') t = 'Spirometric indices are within normal limits, but concavity of the flow-volume loop could suggest mild obstructive impairment at low lung volumes or loss of elastic recoil';
    if (haveVol && !T.invalid) {
      if (vp.normal) t += (sp.kind === 'normal' ? ' and lung volumes' : '; lung volumes are within reference limits');
      else if (vp.airTrapping) t += '; lung volumes show air trapping (RV/TLC above the ULN with a preserved FEV1/FVC), which can be an early sign of small-airway involvement';
      else if (vp.hyperinflation || vp.hyperTlc) t += '; lung volumes show hyperinflation (elevated RV/TLC and resting volume' + (vp.hyperTlc ? ' with an increased TLC' : '') + ') with a preserved FEV1/FVC';
      else if (vp.largeLungs) t += '; TLC is above the ULN with preserved RV/TLC and FRC/TLC, which may represent constitutionally large lungs rather than disease-related hyperinflation';
      else if (vp.lowRV) t += '; RV is below the LLN with a normal TLC (isolated low RV), which in the 1987 series was a clinically significant finding usually associated with pulmonary or chest-wall disease';
      else if (vp.unclassified) t += '; TLC is above the ULN but the volume fractions are not entered, so large lungs cannot be distinguished from hyperinflation';
      else if (vp.rvHighFractionNormal) t += '; RV is increased with a preserved RV/TLC, which does not independently establish air trapping';
      else if (vp.kind === 'borderline') t += '; TLC is within normal limits but near the LLN';
      else if (vp.kind === 'rvHighNoFraction') t += '; RV is above the ULN but RV/TLC is not entered, so air trapping cannot be classified';
    }
    t = withDlco(t, f);
    if (!haveVol && !f.on.vol && !f.on.dlco) t += '. FVC is within normal limits, arguing against restrictive impairment; lung volumes and DLCO were not performed, so gas transfer is not assessed';
    else if (!haveVol && !f.on.vol) t += '. FVC is within normal limits, arguing against restrictive impairment (lung volumes not performed)';
    else if (!haveDl && !f.on.dlco) t += '; DLCO was not performed';
    out.push(t + '.');
    return out;
  }
  // partial: one index missing, or FVC/FEV1 above the ULN with a preserved ratio
  let t = 'No obstructive impairment demonstrated (FEV1/FVC preserved' + zs(R) + ')';
  if (A.measured && A.wnl && !B.measured) t += '; FVC was not entered, so restriction cannot be assessed from spirometry';
  else if (B.measured && B.wnl && !A.measured) t += '; FEV1 was not entered';
  else if (B.high || A.high) t += '; ' + (B.high ? 'FVC' : 'FEV1') + ' is above the ULN (large lungs may be a normal variant)';
  if (haveVol && vp.restriction) { out.push(withDlco(volOnlyLead(f), f) + '.'); return out; }
  out.push(withDlco(t + volClause(f), f) + '.');
  return out;
}
function volOnlyLead(f) {
  const v = f.vol, vp = v.pat, T = v.tlc;
  if (v.qc === 'inv') return 'The lung-volume measurements are not interpretable';
  if (!T.measured) return vp.kind === 'trapNoTLC' ? 'RV/TLC is above the ULN; TLC was not entered, so restriction and the volume pattern cannot be classified' : 'Lung volumes: TLC was not entered';
  if (vp.restriction) {
    let t = (vp.sev ? SEV_CAP[vp.sev] + ' r' : 'R') + 'estrictive ventilatory impairment on lung volumes (' + zc('TLC', T) + ' below the LLN' + (vp.sev ? ', graded by TLC z-score' : '') + ')';
    if (vp.mixed) t = 'Mixed obstructive and restrictive ventilatory impairment (FEV1/FVC and ' + zc('TLC', T) + ' below the LLN)';
    else if (vp.simple) t += ', simple pattern'; else if (vp.complex) t += ', complex pattern (RV/TLC above the ULN)';
    if (!f.sp.ratio.measured) t += '; FEV1/FVC was not entered, so a coexisting obstructive component cannot be excluded';
    return t;
  }
  if (vp.hyperTlc) return 'Lung volumes show hyperinflation with an increased TLC';
  if (vp.hyperinflation) return 'Lung volumes show hyperinflation (elevated RV/TLC and resting volume, TLC within limits)';
  if (vp.airTrapping) return 'Lung volumes show air trapping (RV/TLC above the ULN, TLC not reduced)';
  if (vp.largeLungs) return 'TLC is above the ULN with preserved volume fractions (large lungs, possibly a normal variant)';
  if (vp.unclassified) return 'TLC is above the ULN; the volume fractions are needed to distinguish large lungs from hyperinflation';
  if (vp.normal) return 'Lung volumes are within reference limits; no restriction demonstrated';
  if (vp.kind === 'borderline') return 'TLC is within normal limits but near the LLN; significance uncertain';
  return 'Lung volumes: no restriction demonstrated (TLC not reduced)';
}

/* -------------------------------------------------------- DLCO mechanism */
function dlcoMechanism(f) {
  const d = f.dl, pat = d.pat, D = d.dlco, out = [];
  if (!(f.on.dlco && d.any) || !D.measured || D.invalid) return out;
  const co = (has(d.cohb) && d.cohb >= 2) || d.cohbcat === 'hi' ? ' Carboxyhemoglobin lowers the measured DLCO (about 1% per 1% COHb).' : '';
  if (D.high) {
    let t = 'The increased DLCO is ' + (pat.hb === 'explained' ? 'accounted for by the hemoglobin adjustment' : (pat.hb === 'unexplained' || pat.hb === 'adjustedHigh' ? 'not explained by hemoglobin' : (pat.hb === 'unknownBasis' ? 'of unstated adjustment basis' : 'of uncertain basis (hemoglobin adjustment not available)'))) + '; an increased DLCO may occur with increased pulmonary blood volume, elevated hemoglobin, asthma or alveolar hemorrhage and is not independently diagnostic of any of these.';
    out.push(t + co); return out;
  }
  if (!D.low) { if (pat.mech === 'incompleteWNL') out.push('DLCO is within reference limits; the low VA with a high KCO suggests incomplete lung expansion during the maneuver.'); if (co) out.push(co.trim()); return out; }
  const bits = [];
  if (pat.hb === 'full') bits.push('The reduction is accounted for by the hemoglobin adjustment: the hemoglobin-adjusted DLCO is within reference limits.');
  else if (pat.hb === 'partial') bits.push('The hemoglobin-adjusted DLCO remains below the LLN, so the gas-transfer deficit is not explained by hemoglobin alone.');
  else if (pat.hb === 'adjustedLow') bits.push('The value is hemoglobin-adjusted, so the deficit is not explained by hemoglobin.');
  else if (pat.hb === 'none') bits.push('Hemoglobin is not available; a low hemoglobin can lower the unadjusted DLCO.');
  else if (pat.hb === 'noadj' && d.anemic === true) bits.push('The value is not hemoglobin-adjusted and anemia is documented, so the deficit may partly reflect reduced hemoglobin rather than only pulmonary pathology.');
  else if (pat.hb === 'noadj' && d.anemic === false) bits.push('Hemoglobin is normal, so the deficit is not explained by anemia.');
  else if (pat.hb === 'unknownBasis') bits.push('Whether the reported value is hemoglobin-adjusted is not stated, so it is not described as corrected or uncorrected' + (d.anemic === true ? '; the documented low hemoglobin would lower an unadjusted value, but the value may already be adjusted, so no attribution is made' : (!d.hbKnown ? '; hemoglobin is not available either' : '')) + '.');
  const mech = {
    lowVA_highKCO: 'The low VA with an increased KCO may accompany incomplete expansion or a reduced accessible lung volume rather than loss of the gas-transfer surface; it does not establish normal overall gas transfer.',
    lowVA_normalKCO: 'VA is reduced while KCO is within reference limits; a preserved KCO does not negate the reduced DLCO, and the smaller sampled volume should be read with inspiration, TLC and ventilation distribution in mind.',
    lowVA_lowKCO: 'Both VA and KCO are reduced, so the low DLCO is not explained only by a smaller sampled volume; the transfer coefficient itself is impaired.',
    normalVA_lowKCO: 'VA is preserved and KCO is reduced, supporting reduced transfer efficiency per unit of sampled volume; the PFT does not identify its cause.',
    allNormalExceptDLCO: 'VA and KCO are within reference limits; correlate with hemoglobin and the clinical context.',
    vaOnly: 'VA is reduced and KCO was not entered; KCO is needed to separate incomplete expansion from loss of transfer efficiency.',
    discordantK: 'A low DLCO with a high KCO and a normal VA is an unusual combination; check VA, the DLCO and the breath-hold quality.',
    kOnly: 'KCO was entered without VA, so the mechanism of the reduced DLCO cannot be characterised.'
  }[pat.mech];
  if (mech) bits.push(mech);
  if (d.vatlcLow) bits.push('VA/TLC is below the 0.85 convention, which can indicate incomplete sampling or ventilation maldistribution; poor inspiration and method differences must also be considered.');
  if (bits.length) out.push(bits.join(' ') + co); else if (co) out.push(co.trim());
  return out;
}

/* -------------------------------------------------------- bronchodilator */
function bdImpression(f) {
  const b = f.bd, out = [];
  if (!(f.on.bd && b.any)) return out;
  const F = f.F, resp = F['bronchodilator.response'];
  const parts = [];
  if (resp === 'both' || resp === 'fev1' || resp === 'fvc') {
    parts.push('Significant bronchodilator response in ' + (resp === 'both' ? 'FEV1 and FVC' : resp.toUpperCase()) + ' (increase of more than 10% of the predicted value)');
    if (F['patterns.normal_baseline_bd_positive']) parts.push('despite baseline spirometry within reference limits; the measured response is compatible with variable airway physiology but does not by itself establish a clinical diagnosis of asthma');
    if (resp === 'fvc') parts.push('a predominant FVC response may reflect reduced airway closure or improved emptying, provided the maneuvers are matched in quality');
  } else if (resp === 'negative') {
    parts.push('No significant bronchodilator response (neither FEV1 nor FVC increased by more than 10% of the predicted value)');
    if (f.sp.ratio.low) parts.push('this does not exclude symptomatic benefit from bronchodilator therapy');
    if (b.subthreshold) parts.push('there is a measured increase below the threshold');
  } else if (resp === 'indeterminate') {
    parts.push('Bronchodilator response is indeterminate' + (b.rel === 'invalid' ? ' (post-bronchodilator maneuvers not interpretable)' : (!(b.assessedF && b.assessedV) && b.resp !== 'ind' ? ((b.assessedF || b.assessedV) ? ' (only ' + (b.assessedF ? 'FEV1' : 'FVC') + ' could be assessed, so the absence of a response cannot be established)' : ' (no pre- and post-bronchodilator FEV1 or FVC change was entered)') : '')));
  }
  if (b.obstructionStatus === 'persistent') parts.push((resp === 'both' || resp === 'fev1' || resp === 'fvc') ? 'obstruction persists after bronchodilator (post-bronchodilator FEV1/FVC below the LLN), which can coexist with a significant response' : 'obstruction persists after bronchodilator (post-bronchodilator FEV1/FVC below the LLN)');
  else if (b.obstructionStatus === 'normalized') parts.push('post-bronchodilator FEV1/FVC is no longer below the LLN, so obstruction is not demonstrated after bronchodilator' + (resp === 'negative' ? ' (ratio normalisation and a qualifying volume response are independent findings)' : ''));
  if (b.discordant) parts.push('the current criterion and the legacy 2005 profile disagree for this study');
  if (b.held === 'n') parts.push('recent bronchodilator use may have blunted the measured response');
  if (b.drop) parts.push('FEV1 or FVC fell after bronchodilator, which warrants review of effort, technique and timing before a physiologic explanation is assigned');
  if (parts.length) out.push(sentence(parts[0] + (parts.length > 1 ? '; ' + parts.slice(1).join('; ') : '')));
  return out;
}

/* -------------------------------------------------------- review additions */
function reviewAdditions(f) {
  const out = [];
  (f.suggest || []).forEach(sg => {
    if (!sg.on || sg.superseded) return;
    const t = ptext(sg.id, f.style === 'concise' ? 'standard' : 'expanded', f.vals) || ptext(sg.id, 'standard', f.vals) || sg.text;
    if (t) out.push({ id: sg.id, section: sg.section, text: t });
  });
  return out;
}

function buildImpression(f, secs) {
  const out = [];
  const add = (s) => { if (s) out.push(s); };
  const by = {}; secs.forEach(s => { by[s.key] = s; });
  // 1. quality that changes the read
  const sp = f.sp;
  if (f.on.spiro && sp.any) {
    const q = [];
    if (sp.relF === 'invalid' && sp.relV === 'invalid') q.push('spirometry is not interpretable (no usable FEV1 or FVC)');
    else if (sp.relF === 'invalid') q.push('FEV1 is not interpretable');
    else if (sp.relV === 'invalid') q.push('FVC is not interpretable');
    else if (sp.relF === 'limited' || sp.relV === 'limited') q.push('technical factors reduce confidence in ' + (sp.relF === 'limited' && sp.relV === 'limited' ? 'the spirometric values' : (sp.relF === 'limited' ? 'FEV1' : 'FVC')) + ', especially near the reference limits');
    if (q.length) add(cap(q.join('; ')) + '.');
  }
  // 2. ventilatory core with volumes and gas transfer
  const core = ventCore(f);
  core.forEach(add);
  if (!core.length) {
    const w = dlcoSentence(f);
    if (w) add(w.replace(/\.$/, '') + (f.dl.dlco.low && !(f.on.spiro && sp.any) ? '; spirometry' + (f.on.vol && f.vol.any ? '' : ' and lung volumes') + ' were not entered, so the reduction cannot be called isolated' : '') + '.');
  }
  // 3. gas-transfer mechanism
  dlcoMechanism(f).forEach(add);
  // 4. bronchodilator
  bdImpression(f).forEach(add);
  // 5. clinician-selected review wording (interpretive context)
  const rv = reviewAdditions(f);
  rv.filter(r => r.section !== 'followup' && r.section !== 'serial').forEach(r => add(r.text));
  // 5b. clinician-selected differential considerations, one sentence per finding
  differentialText(f.dx || []).sentences.forEach(add);
  // 6. loop and adjunct tests
  if (by.fvl) by.fvl.impr.forEach(add);
  ['raw', 'osc', 'mip', 'post', 'feno', 'bronch', 'six', 'cpet', 'gas'].forEach(k => { if (by[k]) by[k].impr.forEach(add); });
  // 7. serial comparison
  if (by.prior) by.prior.impr.forEach(add);
  rv.filter(r => r.section === 'serial').forEach(r => add(r.text));
  // 8. follow-up wording the clinician selected
  rv.filter(r => r.section === 'followup').forEach(r => add(r.text));
  // 9. volumes / DLCO absent when they would change the read
  if (f.on.vol && f.vol.any && f.vol.qc === 'inv' && !(f.on.spiro && sp.any)) add('The lung-volume measurements are not interpretable.');
  return out.filter(Boolean).map(sentence);
}

/* --------------------------------------------------------------- heads-up */
const LVL_RANK = { alert: 0, caution: 1, tip: 2, note: 3 };
function buildHeadsUp(f, secs) {
  const out = [];
  const H = (id, lvl, cat, title, text, look) => out.push({ id: id, lvl: lvl, cat: cat, title: title, text: text, look: look || [] });
  const sp = f.sp, R = sp.ratio, A = sp.fev1, B = sp.fvc, v = f.vol, T = v.tlc, d = f.dl, vp = v.pat, spp = sp.pat, F = f.F;
  const spOn = f.on.spiro && sp.any, volOn = f.on.vol && v.any, dlOn = f.on.dlco && d.any;
  const ctx = f.ctx;
  const normalSpiro = spOn && spp.normal && !spp.indeterminate;
  const volNormal = !volOn || vp.normal;
  const Dm = d.dlco;

  /* ---------- data entry ---------- */
  if (spOn && has(sp.fev1L) && has(sp.fvcL) && sp.fev1L > sp.fvcL + 0.05)
    H('DE1', 'alert', 'Data entry', 'FEV1 is larger than FVC', 'FEV1 ' + fmt(sp.fev1L, 2) + ' L exceeds FVC ' + fmt(sp.fvcL, 2) + ' L, which is physiologically impossible; check the entries.');
  if (spOn && R.low && A.measured && B.measured) {
    if ((has(A.z) && has(B.z) && B.z < A.z - 0.2) || (!(has(A.z) && has(B.z)) && B.grade > A.grade))
      H('DE2', 'alert', 'Data entry', 'Ratio below the LLN but FVC is lower than FEV1', 'A low FEV1/FVC means FEV1 is reduced more than FVC. The FVC entry (' + (B.zTxt || B.cat) + ') is worse than the FEV1 entry (' + (A.zTxt || A.cat) + '); check which value was entered where.');
  }
  if (spOn && !R.measured && (A.measured || B.measured))
    H('DE3', 'caution', 'Missing data', 'FEV1/FVC not entered', 'Without the ratio, the pattern (obstruction vs. restriction vs. nonspecific) cannot be classified.');
  if (spOn && R.wnl && has(R.z) && has(A.z) && has(B.z) && (B.z - A.z) >= 1.5)
    H('DE4', 'caution', 'Data entry', 'FEV1 z-score is much lower than FVC z-score, yet the ratio is normal', 'FEV1 z ' + fz(A.z) + ' vs FVC z ' + fz(B.z) + ' would usually give a low FEV1/FVC (z ' + fz(R.z) + ' entered); double-check the ratio.');
  if (spOn && has(sp.ratioCalc) && R.measured && ((sp.ratioCalc < 0.70 && F['spirometry.fixed_ratio_discordance'] === 'fixed_only') || F['spirometry.fixed_ratio_discordance'] === 'lln_only'))
    H('DE21', 'note', 'Physiology', 'Fixed ratio (0.70) and LLN classifications differ', 'Measured FEV1/FVC ' + fmt(sp.ratioCalc, 2) + ' is ' + (F['spirometry.fixed_ratio_discordance'] === 'fixed_only' ? 'below 0.70 but not below the age-adjusted LLN; the LLN governs here and this does not by itself diagnose COPD.' : 'at or above 0.70 but below the age-adjusted LLN; the LLN comparison supports obstruction even though the fixed-ratio threshold is not crossed.'));
  const extremes = [['FEV1/FVC', R], ['FEV1', A], ['FVC', B], ['TLC', T], ['RV', v.rv], ['RV/TLC', v.rvtlc], ['KCO', d.kco], ['VA', d.va]];
  extremes.forEach(e => { if (e[1].z !== null && Math.abs(e[1].z) > 7) H('DE5-' + e[0], 'caution', 'Data entry', e[0] + ' z-score is unusually extreme', 'z = ' + fz(e[1].z) + '; check for a typing or unit error.'); });
  if (dlOn) [['DLCO', d.dlco], ['Hb-adjusted DLCO', d.adj]].forEach(e => { if (e[1].z !== null && Math.abs(e[1].z) > 10) H('DE5-D' + e[0], 'caution', 'Data entry', e[0] + ' z-score is unusually extreme', 'z = ' + fz(e[1].z) + '; check for a typing or unit error.'); });
  if (volOn && has(v.tlcL) && has(sp.fvcL) && v.tlcL < sp.fvcL) H('DE6', 'alert', 'Data entry', 'TLC is smaller than FVC', 'TLC ' + fmt(v.tlcL, 2) + ' L cannot be less than FVC ' + fmt(sp.fvcL, 2) + ' L; check the entries.');
  if (volOn && has(v.tlcL) && has(v.svcL) && v.tlcL < v.svcL) H('DE7', 'alert', 'Data entry', 'TLC is smaller than SVC', 'TLC ' + fmt(v.tlcL, 2) + ' L cannot be less than SVC ' + fmt(v.svcL, 2) + ' L; check the entries.');
  if (volOn && has(v.rvL) && has(v.tlcL) && v.rvL > v.tlcL) H('DE8', 'alert', 'Data entry', 'RV is larger than TLC', 'Check the RV and TLC entries.');
  if (dlOn && has(d.hb) && (d.hb < 5 || d.hb > 20)) H('DE9', 'alert', 'Data entry', 'Hemoglobin value is implausible', 'Hb ' + fmt(d.hb, 1) + ' g/dL; check the units (g/dL expected).');
  if (dlOn && has(d.vatlc) && d.vatlc > 1.05) H('DE10', 'caution', 'Data entry', 'VA exceeds TLC', 'VA/TLC is ' + fmt(d.vatlc, 2) + '. VA is derived from the single-breath maneuver and TLC from a different method; check the entries and the TLC method.');
  if (dlOn && d.reportedAdjusted && d.adj.measured) H('DE22', 'caution', 'Data entry', 'Two hemoglobin-adjusted DLCO values entered', 'The reported DLCO is marked as hemoglobin-adjusted and a second adjusted value was also entered; the second is ignored. Mark the first as "not adjusted" if the lab printed both.');
  [['FEV1', spOn ? sp.fev1pct : NaN, A], ['FVC', spOn ? sp.fvcpct : NaN, B]].forEach(e => {
    const pc = e[1], r = e[2];
    if (!has(pc) || !r.measured || r.invalid) return;
    if (pc >= 100 && r.low) H('DE11-' + e[0], 'alert', 'Data entry', e[0] + ': % predicted and z-score disagree', e[0] + ' ' + Math.round(pc) + '% predicted cannot be below the LLN (' + (r.zTxt || r.cat) + '); check the entries.');
    else if (pc < 55 && r.wnl) H('DE11-' + e[0], 'alert', 'Data entry', e[0] + ': % predicted and z-score disagree', e[0] + ' ' + Math.round(pc) + '% predicted would be below the LLN, but the category/z entered is within normal limits.');
    else if (pc < 60 && r.wnl) H('DE11-' + e[0], 'caution', 'Data entry', e[0] + ': % predicted looks low for a normal z-score', e[0] + ' ' + Math.round(pc) + '% predicted with a within-normal-limits z-score; verify.');
  });
  if (f.on.sixmw && has(f.six.s0) && has(f.six.sn) && f.six.sn > f.six.s0) H('DE12', 'alert', 'Data entry', '6MWT: nadir SpO2 is higher than baseline', 'Check the SpO2 entries.');
  [['6MWT SpO2', [f.six.s0, f.six.sn, f.six.se]], ['Blood-gas SaO2', [f.gas.sao2]], ['CPET SpO2', [f.cp.s0, f.cp.sp]], ['Postural SpO2', [f.post.spo2s, f.post.spo2u]]].forEach(e => {
    if (e[1].some(x => has(x) && (x > 100 || x < 50))) H('DE13-' + e[0], 'alert', 'Data entry', e[0] + ' value is out of range', 'Saturations must lie between 50 and 100%.');
  });
  if (f.on.gas && has(f.gas.ph) && has(f.gas.pco2) && has(f.gas.hco3) && f.gas.pco2 > 0) {
    const calc = 6.1 + Math.log10(f.gas.hco3 / (0.0307 * f.gas.pco2));
    if (Math.abs(calc - f.gas.ph) > 0.1) H('DE14', 'caution', 'Data entry', 'Blood-gas values are internally inconsistent', 'pH ' + fmt(f.gas.ph, 2) + ' does not match PaCO2 ' + fmt(f.gas.pco2, 0) + ' / HCO3 ' + fmt(f.gas.hco3, 0) + ' (Henderson–Hasselbalch gives about ' + fmt(calc, 2) + '). Check the sample and the entries.');
  }
  if (f.on.mip && ((has(f.mp.mipV) && f.mp.mipV > 250) || (has(f.mp.mepV) && f.mp.mepV > 350))) H('DE15', 'caution', 'Data entry', 'Respiratory pressure looks implausibly high', 'Pressures are entered as magnitudes in cmH2O; check units (kPa/mmHg).');
  if (f.on.bronch && f.br.type === 'man' && f.br.any && has(f.br.manFall) && f.br.manFall >= 15 && has(f.br.manDose) && f.br.manDose > 635)
    H('DE16', 'alert', 'Data entry', 'Mannitol dose exceeds the protocol maximum', 'The cumulative dose cannot exceed 635 mg; check the entries.');
  f.priors.forEach(p => p.flags.forEach(fl => H('DE17-' + p.idx, fl.lvl, 'Data entry', 'Prior study date', fl.t)));
  if (f.on.prior && f.priors.some(p => p.metrics.length && !p.dateOk)) H('DE18', 'note', 'Missing data', 'Prior study date missing or invalid', 'Annualised rates need a valid date for both the prior and the current study.');
  if (f.on.prior && f.priors.some(p => p.metrics.length && has(p.years) && p.years > 0 && p.years < 0.25)) H('DE19', 'note', 'Test quality', 'Short interval between studies', 'The interval is under 3 months; annualised rates are not calculated because they exaggerate short-term variability.');
  if (f.on.post && f.post.supineHigher) H('DE20', 'caution', 'Data entry', 'Supine vital capacity is higher than upright', 'A supine increase is not a postural decrease; check which value was entered where.');

  /* ---------- test quality & technique ---------- */
  if (f.on.spiro) {
    const g1 = sp.qual1, g2 = sp.qual2;
    if (g1 === 'F' || g2 === 'F') H('TQ1', 'alert', 'Test quality', 'Spirometry grade F for ' + (g1 === 'F' && g2 === 'F' ? 'FEV1 and FVC' : (g1 === 'F' ? 'FEV1' : 'FVC')), 'No usable maneuver for that component; its value is reported as not interpretable and drives no pattern or severity statement. Consider repeat testing.');
    else if (g1 === 'U' || g2 === 'U') H('TQ1', 'caution', 'Test quality', 'Spirometry grade U', 'Usable but not acceptable maneuvers: values may still reflect the patient if effort was maximal and reproducible; the report states the confidence limitation.');
    else if ([g1, g2].some(g => g === 'C' || g === 'D' || g === 'E')) H('TQ1', 'caution', 'Test quality', 'Spirometry grade ' + [g1, g2].filter(g => g === 'C' || g === 'D' || g === 'E').join('/'), 'Acceptable and usable, but technical factors reduce confidence; values near the LLN should not be over-interpreted.');
    if (spOn && !g1 && !g2) H('TQ0', 'note', 'Missing data', 'Spirometry quality not graded', 'ATS/ERS 2019 grades FEV1 and FVC separately; enter the grades so the report can state test quality.');
    if (f.poorEffort) H('TQ2', 'caution', 'Test quality', 'Effort or muscle weakness is flagged', 'Submaximal effort or respiratory-muscle weakness can lower FEV1 and FVC and blunt the PEF (ERS/ATS 2022 Table 5). Consider repeat testing and MIP/MEP.');
    if (sp.fvcUnder) H('TQ20', 'caution', 'Test quality', 'Early termination: FVC may be underestimated', 'An underestimated FVC artificially raises FEV1/FVC, so a preserved ratio cannot be relied on; normal, nonspecific and restriction-suggestive conclusions are withheld until a maneuver with an acceptable end of test is available. A low ratio despite early termination still counts as obstruction.');
    if (sp.limits.indexOf('cough') >= 0 || sp.loop === 'cough') H('TQ21', 'caution', 'Test quality', 'Cough in the first second', 'FEV1 from that maneuver is unreliable while FVC may remain usable; confirm the reported FEV1 comes from a maneuver without cough.');
    if ((sp.loop === 'expflat' || sp.loop === 'inspflat' || sp.loop === 'bothflat') && !sp.repro) H('TQ3', 'caution', 'Test quality', 'Loop flattening is not reproducible', 'Reproducible flattening is required before suggesting upper/central airway obstruction (Annals ATS 2025 S51–S53).');
    if (f.bd.held === 'n' && f.on.bd) H('TQ4', 'caution', 'Test quality', 'Bronchodilators were not withheld', 'Recent bronchodilator use can blunt the response; consider repeating off bronchodilators for a diagnostic response test.');
  }
  if (volOn) {
    if (v.qc === 'limited') H('TQ5', 'caution', 'Test quality', 'Lung-volume quality is limited', 'Technical factors (for example unlinked FRC and SVC, leak, poor panting) reduce confidence; values near the LLN should not be over-interpreted.');
    if (v.qc === 'inv') H('TQ22', 'alert', 'Test quality', 'Lung volumes not interpretable', 'No restriction, hyperinflation or air-trapping statement is made from these values.');
    if (v.dilution && (R.low || (A.measured && A.grade >= 2)))
      H('TQ6', 'caution', 'Technique', 'Gas-dilution volumes in airflow obstruction', 'Nitrogen washout, helium dilution and single-breath TLC can be markedly lower than plethysmographic values when gas mixing is impaired. A low TLC or normal RV/TLC here may be an underestimate; plethysmography would confirm. A method difference is not an automatic quantification of trapped gas.');
    if (v.method === 'pleth' && A.cat === 'sev' && (vp.airTrapping || vp.hyperinflation))
      H('TQ7', 'note', 'Technique', 'Plethysmography in severe obstruction', 'Plethysmography can overestimate FRC in severe obstruction because alveolar and mouth pressures are discordant (Annals ATS 2025).');
    if (v.method === '' && (R.low || T.low)) H('TQ8', 'note', 'Missing data', 'Lung-volume technique not recorded', 'The method matters for reading TLC and RV/TLC in obstruction; record it if available.');
    if (vp.fractionsMissing && T.measured && !T.invalid) H('TQ25', 'note', 'Missing data', 'RV/TLC (or FRC/TLC) not entered', T.low ? 'Simple versus complex restriction needs RV/TLC; the report states restriction without that qualifier.' : (T.high ? 'Large lungs versus hyperinflation needs RV/TLC and FRC/TLC; the report states only that TLC is increased.' : 'Air trapping and hyperinflation need RV/TLC; the report does not claim their absence.'));
  }
  if (dlOn) {
    if (d.qc === 'limited') H('TQ9', 'caution', 'Test quality', 'DLCO quality is limited', 'Technical factors (for example reduced inspired volume or breath-hold) reduce confidence in the measurement.');
    if (d.qc === 'inv') H('TQ23', 'alert', 'Test quality', 'DLCO not interpretable', 'No gas-transfer classification is made.');
    if (d.single) H('TQ24', 'note', 'Test quality', 'Single DLCO maneuver', 'Within-session repeatability (two grade-A maneuvers within 2 mL/min/mmHg) could not be established.');
    if (d.cohbHigh) H('TQ10', 'note', 'Technique', 'Elevated carboxyhemoglobin', (has(d.cohb) ? 'COHb ' + fmt(d.cohb, 1) + '%' : 'Raised COHb') + ' lowers DLCO by roughly 1% per 1% COHb; the interpretation should account for it (current smokers).');
    if (ctx.smoke === 'current' && !d.cohbKnown && Dm.low) H('TQ11', 'note', 'Missing data', 'Current smoker without COHb', 'A reduced DLCO in a current smoker may be partly from COHb; a COHb level allows correction.');
    if (Dm.measured && (Dm.low || Dm.high) && !d.basisKnown) H('TQ19', 'caution', 'Missing data', 'Hemoglobin-adjustment basis not stated', 'The report does not say whether the DLCO is hemoglobin-adjusted. The interpretation says so rather than assuming; check the lab printout and mark the basis.');
  }
  if (f.on.feno && f.feno.any) {
    if (f.feno.ics === 'y') H('TQ12', 'note', 'Technique', 'FeNO on corticosteroids', 'Corticosteroids suppress FeNO; a low value may not exclude eosinophilic inflammation off treatment.');
    if (ctx.smoke === 'current') H('TQ13', 'note', 'Technique', 'FeNO in a current smoker', 'Smoking lowers FeNO; a low value may under-represent eosinophilic inflammation.');
    if (f.feno.confound) H('TQ14', 'caution', 'Technique', 'FeNO confounder recorded', 'Recent exercise, spirometry, nitrate-rich food or viral infection can shift FeNO; consider repeating.');
  }
  if (f.on.mip && f.mp.any) {
    H('TQ15', 'note', 'Technique', 'MIP and MEP are effort-dependent', 'Low values can come from submaximal effort, hyperinflation or neuromuscular disease; three maneuvers are usually needed to show a maximal effort, and SNIP adds information for inspiratory strength. MIP is not an anatomic diaphragm test and MEP is not a complete cough assessment.');
    if (f.mp.effort === 'poor') H('TQ16', 'caution', 'Test quality', 'Submaximal respiratory-pressure effort suspected', 'Interpret low MIP/MEP with caution; repeat with coaching or use SNIP.');
    if ((f.mp.mip === 'low' || f.mp.mep === 'low') && [f.mp.thrSrc.mip, f.mp.thrSrc.mep].some(x => x === 'screen') && (has(f.mp.mipV) || has(f.mp.mepV)) && !(f.mp.mipC.measured && f.mp.mepC.measured))
      H('TQ26', 'note', 'Technique', 'Pressure compared with a screening threshold', 'No laboratory lower limit was entered, so the commonly cited screening values were used and are named in the report. Enter the lab LLN (magnitude) for a reference-based statement.');
  }
  if (has(ctx.age)) {
    const o = [];
    if (spOn && (ctx.age < 3 || ctx.age > 95)) o.push('spirometry (GLI: 3–95 years)');
    if (volOn && (ctx.age < 5 || ctx.age > 80)) o.push('static lung volumes (GLI-2021: 5–80 years)');
    if (dlOn && (ctx.age < 5 || ctx.age > 85)) o.push('DLCO (GLI: about 5–85 years)');
    if (o.length) H('TQ17', 'caution', 'Technique', 'Age outside the reference range', 'This age lies outside the range of the GLI equations for ' + o.join('; ') + '; interpretation is an extrapolation and carries more uncertainty.');
    else if (ctx.age >= 80) H('TQ17', 'note', 'Technique', 'Older age', 'Interpretation at the extremes of age and height carries more uncertainty (ERS/ATS 2022).');
  }

  /* ---------- physiologic discordance ---------- */
  if (spOn && volOn) {
    if (!R.low && B.low && T.measured && T.wnl)
      H('PH1', 'caution', 'Physiology', 'Low FVC with a normal TLC', 'Restriction is not confirmed (nonspecific pattern). Consider submaximal effort or weakness, obesity, air trapping (check RV/TLC), FVC-versus-SVC differences, or a gas-dilution TLC that underestimates. Such discordance is usually seen when values are only mildly reduced.');
    if (B.wnl && T.low && !R.low)
      H('PH2', 'caution', 'Physiology', 'Normal FVC with a low TLC', 'Spirometry and volumes disagree; a normal FVC and FEV1/FVC are usually reliable at ruling out restriction (ERS/ATS 2022). Check the TLC method and quality before accepting restriction.');
    if (T.wnl && !R.low && vp.airTrapping)
      H('PH3', 'note', 'Physiology', 'Air trapping with a preserved FEV1/FVC', 'RV/TLC is elevated although the ratio is normal; this can be an early sign of small-airway disease. A bronchodilator test, airway resistance or oscillometry may add information.');
    if (R.low && T.measured && T.wnl && vp.normal)
      H('PH4', 'note', 'Physiology', 'Airflow obstruction without air trapping or hyperinflation', 'Volumes add little in obstruction (ERS/ATS 2022), but a plethysmographic RV/TLC within limits with a low ratio is worth confirming against the technique used.');
    if (has(sp.fvcL) && has(v.svcL) && (v.svcL - sp.fvcL) * 1000 > 100)
      H('PH5', 'note', 'Physiology', 'SVC exceeds FVC by more than 100 mL', 'May reflect dynamic airway closure during the forced maneuver after quality and consistency review; no disease-defining difference exists. Volumes are referenced to the SVC.');
    if (spp.highTlcReview) H('PH47', 'caution', 'Physiology', 'Reduced spirometric volumes with a TLC above the ULN', 'This does not fit the nonspecific pattern (normal TLC required) or restriction; review effort, the vital-capacity maneuvers and the lung-volume method.');
    if (T.low && v.rvtlc.high && !R.low) H('PH48', 'note', 'Physiology', 'Elevated RV/TLC with a low TLC', 'In restriction the elevated RV/TLC can partly reflect the lower TLC (complex restriction); it is not automatically air trapping. Neuromuscular weakness, chest-wall restriction and occult small-airway disease are the usual contributors.');
  }
  if (spOn && R.low && A.wnl && B.wnl) H('PH6', 'note', 'Physiology', 'Low ratio with preserved FEV1 and FVC', 'Reported as obstruction with a preserved FEV1 (Annals ATS 2025 labels it mild obstruction, S21). ERS/ATS 2022 notes that dysanapsis can produce the pattern, especially in tall young adults with a high FVC; it is not dismissed as a normal variant automatically. If you judge it so, add the dysanapsis wording on the Report step.');
  if (spOn && R.low && B.high) H('PH7', 'note', 'Physiology', 'Low ratio with a high FVC', 'A high FVC with a preserved FEV1 and low ratio can reflect dysanapsis. Whether this is obstruction depends on pretest probability and additional tests (BDR, DLCO, exercise testing).');
  if (spOn && spp.kind === 'concave') H('PH8', 'note', 'Physiology', 'Concave flow-volume loop with normal indices', 'FEF25–75% is not specific for small-airway disease; oscillometry, multiple-breath washout and imaging may add information (ERS/ATS 2022).');
  if (spOn && sp.fef.low && normalSpiro) H('PH9', 'note', 'Physiology', 'Isolated low FEF25–75%', 'ERS/ATS 2022 does not recommend using mid-flows to define small-airway dysfunction or obstruction when the other indices are normal.');
  if (spOn && R.measured && !R.low && A.low && B.low && !f.hasTLC)
    H('PH10', 'caution', 'Missing data', 'Reduced FEV1 and FVC with a preserved ratio, no lung volumes', 'The nonspecific pattern can only be named once TLC is known to be normal; without TLC this is a low FVC with restriction unconfirmed. In smokers the fixed-ratio/80% version of this pattern is called PRISm (a named phenotype with its own definition).');

  if (dlOn) {
    if (F['patterns.isolated_low_dlco'])
      H('PH11', 'caution', 'Physiology', 'Low DLCO with normal spirometry and lung volumes', 'Isolated gas-transfer reduction. Check hemoglobin and COHb; the differential (pulmonary vascular disease, early parenchymal disease, emphysema with preserved volumes, anemia, recent smoking) and the studies that sort it out can be itemized under Differentials and additional studies on the Report step. Exertional oximetry/6MWT, CPET and imaging or echocardiography can follow, as clinically appropriate.');
    if (Dm.low && R.low && (vp.airTrapping || vp.hyperinflation))
      H('PH12', 'note', 'Physiology', 'Obstruction with hyperinflation or trapping and reduced gas transfer', 'Loss of gas transfer on top of obstruction and hyperinflation is the physiology seen with emphysema; the wording "compatible with emphysema in the appropriate setting" is available as a reviewed addition once imaging and history support it.');
    if (Dm.wnl && R.low && (vp.airTrapping || vp.hyperinflation) && A.grade >= 2)
      H('PH13', 'note', 'Physiology', 'Marked obstruction with a preserved DLCO', 'Preserved gas transfer despite significant obstruction and gas trapping argues for an airway-predominant process over parenchymal destruction.');
    if (Dm.low && d.pat.mech === 'discordantK')
      H('PH14', 'caution', 'Physiology', 'Low DLCO with high KCO and normal VA', 'This combination is unusual; KCO limits are derived from subjects with normal VA. Check the VA, the DLCO and the breath-hold quality.');
    if (Dm.low && d.anemic === true && d.pat.hb !== 'full' && !d.reportedAdjusted)
      H('PH15', 'note', 'Physiology', 'Low hemoglobin contributes to a low DLCO', (has(d.hb) ? 'Hb ' + fmt(d.hb, 1) + ' g/dL' : 'A low hemoglobin') + ' lowers the unadjusted DLCO; interpret the adjusted value (' + (d.adj.measured ? 'entered' : 'not entered') + ').');
    if (Dm.low && !volOn && !has(d.vatlc))
      H('PH16', 'note', 'Missing data', 'DLCO without lung volumes', 'VA/TLC cannot be calculated; lung volumes help separate loss of expansion from loss of gas-transfer surface, and an "isolated" DLCO reduction cannot be claimed without them.');
    if (Dm.low && !d.hbKnown && !d.hasAdj) H('PH17', 'note', 'Missing data', 'Hemoglobin not entered', 'A low hemoglobin can reduce DLCO independent of lung function (Annals ATS 2025 D31); obtain the Hb to adjust.');
    if (d.pat.mech === 'lowVA_normalKCO') H('PH18', 'note', 'Physiology', 'Normal KCO with low VA', 'Normal limits for KCO come from subjects with normal alveolar volumes; a normal KCO in the setting of a low VA should not be taken as normal gas transfer, and a normal KCO does not rule out interstitial lung disease.');
  }

  if (f.on.mip && f.mp.any) {
    const lowIE = f.mp.mip === 'low' || f.mp.mep === 'low' || f.mp.snip === 'low';
    if (lowIE && (B.low || T.low)) H('PH19', 'note', 'Physiology', 'Weak respiratory muscles with a restrictive-type pattern', 'Reduced strength with a low FVC/TLC fits a neuromuscular or chest-wall restrictive pattern (complex restriction with raised RV/TLC supports this). The "muscle contribution to restriction" wording is a reviewed addition on the Report step. Check the upright-to-supine fall, an ABG for hypoventilation, and a DLCO with VA/KCO.');
    if (lowIE && normalSpiro && (!volOn || T.wnl)) H('PH20', 'caution', 'Physiology', 'Low respiratory-muscle pressures with normal spirometry and volumes', 'MIP/MEP depend on effort and technique. Confirm with repeat maneuvers or SNIP; if symptoms suggest weakness, consider supine VC and neurophysiology.');
    if (lowIE && (vp.hyperinflation || (R.low && vp.airTrapping))) H('PH21', 'note', 'Physiology', 'Hyperinflation can lower MIP and MEP', 'Reduced pressures in the presence of hyperinflation do not by themselves establish muscle weakness.');
    if (!lowIE && (f.mp.mip === 'normal' || f.mp.snip === 'normal') && f.on.post && f.post.ge20)
      H('PH22', 'caution', 'Physiology', 'Marked supine fall with normal inspiratory strength', 'A supine VC fall of 20% or more with normal MIP/SNIP is discordant; recheck the maneuvers and consider diaphragm imaging if symptoms persist.');
  }
  if (f.on.post && f.post.ge20 && !f.on.mip) H('PH23', 'note', 'Missing data', 'Postural fall without MIP/MEP', 'A supine fall of 20% or more raises concern for diaphragm weakness; MIP/SNIP would add information.');
  if (f.on.gas && f.gas.any) {
    if (f.gas.hyperC && normalSpiro && volNormal && (!f.on.mip || f.mp.mip !== 'low'))
      H('PH24', 'caution', 'Physiology', 'Hypercapnia with normal spirometry and volumes', 'Unexplained by the ventilatory pump tests entered; consider central hypoventilation, obesity hypoventilation, early neuromuscular disease or sleep-disordered breathing, and check respiratory-muscle strength.');
    const g = abgEval(f);
    if (g.aaHigh && normalSpiro && volNormal && (!dlOn || Dm.wnl))
      H('PH25', 'caution', 'Physiology', 'Widened A–a gradient with normal spirometry, volumes and DLCO', 'Consider shunt (DLCO is often normal), V/Q mismatch or pulmonary vascular disease; correlate with echocardiography, imaging and exertional testing.');
    if (f.gas.hypoxC && f.gas.hyperC) H('PH26', 'note', 'Physiology', 'Hypoxemia with hypercapnia', 'Hypoventilation explains part of the hypoxemia when the A–a gradient is normal; supplemental oxygen can worsen hypercapnia in chronic ventilatory failure.');
    if (has(f.gas.cohb) && f.gas.cohb >= 3) H('PH27', 'note', 'Technique', 'Elevated COHb on the blood gas', 'SpO2 overestimates saturation when COHb is raised; also lowers DLCO.');
  }
  if (f.on.sixmw && f.six.any) {
    if (f.six.desat && normalSpiro && volNormal && (!dlOn || Dm.wnl))
      H('PH28', 'caution', 'Physiology', 'Exertional desaturation with normal resting tests', 'Consider pulmonary vascular disease, a right-to-left shunt (for example PFO), early interstitial disease, or an oximetry/probe artifact; CPET and further cardiac assessment can clarify.');
    if (f.six.lowDist && normalSpiro && volNormal && (!dlOn || Dm.wnl))
      H('PH29', 'note', 'Physiology', 'Reduced 6MWD with normal resting PFTs', 'A reduced walk distance with normal pulmonary function points outside the airways and parenchyma (cardiac, muscular, deconditioning, motivation); CPET can discriminate.');
    if (f.six.onO2) H('PH30', 'note', 'Technique', '6MWT performed on oxygen', 'Saturations reflect ' + f.six.o2text + '; "no desaturation" on oxygen does not demonstrate normal room-air oxygenation. Repeat on room air to assess the oxygen requirement.');
    if (has(f.six.dist) && !has(f.six.pred) && !has(f.six.pct) && !has(f.six.lln) && f.six.distCat === '') H('PH31', 'note', 'Missing data', 'No reference for the 6MWD', 'Enter the predicted distance, % predicted or the LLN, and name the reference equation; a distance can only be called reduced against a valid reference.');
    if (f.six.stop === 'early') H('PH49', 'note', 'Technique', 'Walk stopped before six minutes', 'The achieved time and distance are reported; they are not a completed six-minute result and are not compared with the predicted 6MWD.');
  }
  if (f.on.cpet && f.cp.any) {
    const e = cpetEval(f);
    if (!e.ready) H('PH32', 'note', 'Missing data', 'CPET cut-offs need age and sex', 'Sex- and age-based cut-offs (Kaminsky Table 11.3) could not be applied to every variable.');
    if (e.vent && normalSpiro) H('PH33', 'caution', 'Physiology', 'CPET ventilatory limitation with normal spirometry', 'MVV may overestimate the ventilatory ceiling and VE/MVV can be high from a high drive; check the MVV effort and the breathing pattern (tidal loop).');
    if (e.submax) H('PH34', 'caution', 'Test quality', 'CPET effort may be submaximal', 'Markers: ' + e.eff.join(', ') + '. A reduced peak VO2 may then underestimate capacity.');
    if (e.vo2ok && (e.circ || e.gx)) H('PH35', 'note', 'Physiology', 'Preserved peak VO2 with an abnormal submaximal response', 'A normal peak VO2 does not exclude a substantial loss of aerobic capacity in someone whose prior value was supranormal; trajectories matter.');
  }
  if (f.on.feno && f.feno.any) {
    const b = fenoBand(f);
    if (b.cat === 'high' && normalSpiro && (!f.on.bd || !f.bd.sig)) H('PH36', 'note', 'Physiology', 'High FeNO with normal spirometry', 'Eosinophilic airway inflammation can be present with normal spirometry; correlate with symptoms, variability and challenge testing. FeNO alone does not diagnose asthma.');
    if (b.cat === 'low' && f.on.bd && f.bd.sig) H('PH37', 'note', 'Physiology', 'Bronchodilator response with a low FeNO', 'Variable airflow limitation with low FeNO can reflect non-type-2 disease or corticosteroid suppression.');
    if (b.cat === 'high' && f.on.bronch && f.br.any && f.br.type === 'mch' && f.br.mch.state === 'negative') H('PH38', 'caution', 'Physiology', 'High FeNO with a negative methacholine challenge', 'Discordant; consider eosinophilic bronchitis, steroid effect on challenge, or a technical issue.');
  }
  if (f.on.bronch && f.br.any) {
    let basePct = f.br.basePct, baseL = f.br.baseL;
    if (!has(basePct) && spOn) basePct = sp.fev1pct;
    if (!has(baseL) && spOn) baseL = sp.fev1L;
    if (f.br.type === 'mch' && (f.br.baseOk === 'low' || (has(basePct) && basePct < 60) || (has(baseL) && baseL < 1.5) || (spOn && A.grade >= 2 && !has(basePct) && !has(baseL) && f.br.baseOk !== 'ok')))
      H('PH39', 'alert', 'Safety', 'Methacholine with a low baseline FEV1', 'The generally accepted safety threshold is a pre-bronchodilator FEV1 above 60% predicted or 1.5 L; direct challenge can provoke severe bronchoconstriction in significant airflow limitation.');
    if (f.br.type === 'mch' && f.br.ics === 'y') H('PH40', 'note', 'Technique', 'Corticosteroids and methacholine', 'ICS lower sensitivity by about 1.2 doubling doses; 4–8 weeks off treatment are needed to remove this effect (less relevant if symptomatic).');
    if (spOn && R.low && A.grade >= 1) H('PH41', 'note', 'Physiology', 'Bronchoprovocation with baseline obstruction', 'Hyperresponsiveness is common with established airflow obstruction (COPD), so a positive result is less specific.');
    if (f.br.type === 'mch' && f.br.mch.boundary) H('PH50', 'caution', 'Technique', 'PD20/PC20 sits exactly on a category boundary', 'ERS 2017 ranges share printed endpoints (' + f.br.mch.boundary.between.join(' / ') + '). No category is auto-assigned; use the laboratory category policy and tap the lab result above.');
    if (f.br.type === 'mch' && (f.br.mchNeg || f.br.mchCat === 'neg') && f.br.complete === '') H('PH51', 'note', 'Missing data', 'Challenge completion not recorded', 'A negative result assumes the planned maximum dose or concentration was delivered; if the study was stopped early it is incomplete, not negative. Record the completion status.');
    if (f.br.type === 'mch' && f.br.mchNeg && !has(f.br.mchMax)) H('PH52', 'note', 'Missing data', 'Maximum dose or concentration not entered', 'A censored result is reported as PD20/PC20 greater than the maximum delivered; enter that maximum so the report can state it.');
    if (f.br.type === 'mch' && f.br.unit === 'pc20' && has(f.br.mchVal) && f.br.protocol !== 'wright2' && f.br.mch.cat && f.br.mch.catSrc === 'auto') H('PH53', 'note', 'Technique', 'PC20 category without the documented protocol', 'The ERS 2017 PC20 ranges apply to the English Wright two-minute tidal-breathing protocol; for other protocols PD20 (delivered dose) or the laboratory category is preferred.');
  }
  if (f.on.bd && f.bd.any && F['bronchodilator.response'] === 'indeterminate' && !(f.bd.assessedF && f.bd.assessedV) && f.bd.rel !== 'invalid' && f.bd.resp !== 'ind')
    H('PH54', 'caution', 'Missing data', 'Bronchodilator response: one metric missing', 'A negative response needs both FEV1 and FVC assessed; with one missing the result is indeterminate (a positive response in the available metric would still count). Enter the other metric or tap the lab\'s verdict.');
  if (f.on.bd && f.bd.any && f.bd.discordant) H('PH55', 'note', 'Physiology', 'Current and legacy response criteria disagree', 'The ERS/ATS 2022 criterion (> 10% of predicted) is the default; the 2005 profile (≥ 12% and ≥ 200 mL from baseline) is shown for reference only and the two are never merged.');
  if (f.on.raw && f.raw.any && spOn) {
    if ((f.raw.raw.high || f.raw.sraw.high || f.raw.sgaw.low) && !R.low) H('PH42', 'note', 'Physiology', 'Raised airway resistance without spirometric obstruction', 'Raw can detect airway narrowing when spirometry is non-specific or normal (ERS/ATS 2022 Table 5), but is not an independent diagnostic criterion.');
    if (R.low && A.grade >= 2 && f.raw.raw.wnl && f.raw.sraw.wnl) H('PH43', 'caution', 'Physiology', 'Normal airway resistance with moderate-to-severe obstruction', 'Resistance can be normal in emphysema or when obstruction is peripheral, but verify the panting technique.');
  }
  if (f.on.osc && f.osc.any && normalSpiro) {
    if (f.osc.r5.high || f.osc.x5.low || f.osc.ax.high || f.osc.r520.high) H('PH44', 'note', 'Physiology', 'Abnormal oscillometry with normal spirometry', 'Oscillometry can show altered mechanics when FEV1/FVC is normal (ERS/ATS 2022); correlate with symptoms and BDR. No universal device-independent cut-offs exist.');
  }
  if (f.on.fvl && f.fvl.any && f.fvl.pef.low && !(R.low || A.low) && B.wnl) H('PH45', 'caution', 'Physiology', 'Reduced PEF with preserved FEV1 and FVC', 'PEF can fall before FEV1 and FVC in central or upper-airway obstruction (ERS/ATS 2022), but is also reduced by poor initial effort. Review inspiratory and expiratory loops.');
  if (f.on.fvl && f.fvl.any && f.fvl.fevPefHi === true && sp.loop === 'normal') H('PH46', 'caution', 'Physiology', 'FEV1/PEF above 8 with a normal-looking loop', 'The loop description and the index disagree; recheck the loop or the numeric entries.');

  /* ---------- 6MWD trend ---------- */
  if (f.on.sixmw) {
    const tr = f.trend6;
    if (tr.skipped) H('TR1', 'note', 'Missing data', tr.skipped + (tr.skipped === 1 ? ' trend entry was' : ' trend entries were') + ' not used', 'A walk needs both a valid date and a distance to be plotted.');
    if (tr.curMissingDate && tr.any) H('TR2', 'note', 'Missing data', 'Today’s walk is not in the trend', 'Enter the study date on the Details step so the current 6MWD can join the saved walks.');
    if (tr.futureDate) H('TR3', 'caution', 'Data entry', 'A saved walk is dated after the study date', 'Check the dates of the saved walks and of this study.');
    if (tr.dupDates) H('TR4', 'note', 'Data entry', 'Two walks share the same date', 'Two entries with the same date but different distances; the best of two walks done on one day is the usual reported value.');
    if (tr.multi) {
      const c = tr.vsPrev;
      if (c.cls === 'down') H('TR5', 'caution', 'Trend', '6MWD fell by ' + fmt(Math.abs(c.dAbs), 0) + ' m since the previous walk', 'This exceeds the 30 m minimal important difference (ERS/ATS 2014). Before ascribing it to disease progression, check that the protocol matched the earlier walk and look for intercurrent illness, pain, deconditioning or a change in oxygen use; a repeat walk helps confirm it.');
      if (c.cls === 'up') H('TR6', 'note', 'Trend', '6MWD rose by ' + fmt(c.dAbs, 0) + ' m since the previous walk', 'This exceeds the 30 m minimal important difference. A rise can reflect treatment effect or recovery, but also a learning effect (the second walk averages about 26 m longer), more encouragement, a shorter-track difference or supplemental oxygen.');
      if (tr.ipf && f.ctx.hasInd('ild')) H('TR7', 'caution', 'Trend', 'Fall of more than 50 m over about 6 months', 'In the IPF cohort of du Bois et al. (2011, n = 822) a fall of more than 50 m over 24 weeks was associated with a several-fold higher risk of death within the next year (hazard ratio 4.27). Read it with the FVC and DLCO trends and the physiologic progression criteria.');
      if (tr.nadir && tr.nadir.d <= -4) H('TR8', 'caution', 'Trend', 'Nadir SpO2 fell by ' + fmt(Math.abs(tr.nadir.d), 0) + ' points since the previous walk', 'Exertional desaturation can worsen while the distance is preserved; the distance–saturation product (distance × nadir SpO2) combines both. Confirm a good pulse-oximetry signal and the same oxygen use.');
      if (tr.o2mix) H('TR9', 'caution', 'Technique', 'Oxygen use differs between walks', 'Supplemental oxygen lengthens the 6MWD (12–59 m in the ERS/ATS 2014 review), so distances on and off oxygen are not directly comparable.');
      H('TR10', 'note', 'Technique', 'Trend compares absolute distances from possibly different protocols', 'Walks are comparable only if done the same way (ERS/ATS 2014): the second of two tests averages about 26 m longer, a 10 m rather than a 30 m track shortens the distance by roughly 50 m, standard encouragement adds about 30 m, and a wheeled walker adds about 6%. The utility of % predicted for tracking change has not been established, so distances in metres are compared.');
    }
  }

  /* ---------- comparison ---------- */
  if (f.on.prior && f.prior.any) {
    const usesPct = f.priors.some(p => p.metrics.some(m => m.pp));
    if (usesPct && !f.priors.some(p => p.cmp.ref)) H('PR1', 'note', 'Comparison', 'Compare like with like', '% predicted values from different reference equations (for example a GLI update or race-specific equations) are not interchangeable; if the prior used another set, tick "different reference equations" on the prior and compare measured values.');
    f.priors.forEach(p => {
      if (p.cmp.ref) H('PR0-' + p.idx, 'caution', 'Comparison', 'Reference equations differ (prior #' + p.idx + ')', 'Part of any percent-predicted change may reflect the equation change; measured values are compared and the percent-predicted change is reported with that caveat. Recomputation on a common reference is the clean solution.');
      p.metrics.forEach(m => {
        if (!m.comparable) return;
        if (m.k === 'fev1' || m.k === 'fvc') {
          if (m.dPct <= -15) H('PR2-' + p.idx + m.k, 'caution', 'Comparison', m.name + ' fell by ' + fmt(Math.abs(m.dPct), 1) + '% since prior study #' + p.idx, 'This is at or beyond the 15% change that ERS/ATS 2022 describes as exceeding expected variability; it is not a universal progression criterion. Review technique, acute illness and adherence.');
          else if (has(m.pctPerYear) && m.pctPerYear <= -8) H('PR3-' + p.idx + m.k, 'caution', 'Comparison', m.name + ' decline of ' + fmt(Math.abs(m.pctPerYear), 1) + '%/yr', 'Meets the 8%/yr rapid-decline marker.');
          if (m.k === 'fev1' && m.dPct <= -10 && m.dPct > -15) H('PR4-' + p.idx, 'note', 'Comparison', 'FEV1 fell by about ' + fmt(Math.abs(m.dPct), 0) + '% from the prior value', 'A fall of 10% or more from the previous value is commonly used to flag a possible pulmonary exacerbation in cystic fibrosis.');
          if (m.dPct >= 15) H('PR5-' + p.idx + m.k, 'note', 'Comparison', m.name + ' rose by ' + fmt(m.dPct, 1) + '%', 'An improvement beyond 15% exceeds expected variability; consider treatment effect, recovery from an acute process, or technique differences.');
        }
        if (m.k === 'dlco_pct' && m.dAbs <= -10) H('PR6-' + p.idx, 'caution', 'Comparison', 'DLCO fell by ' + fmt(Math.abs(m.dAbs), 0) + ' points of predicted', 'In a non-IPF fibrotic ILD an absolute fall of 10 points within a year is the DLCO component of the physiologic progression criterion (ATS/ERS/JRS/ALAT 2022); FVC and DLCO form one domain, and PPF needs a second domain.');
        if (m.k === 'fvc_pct' && m.dAbs <= -5) H('PR7-' + p.idx, 'caution', 'Comparison', 'FVC fell by ' + fmt(Math.abs(m.dAbs), 0) + ' points of predicted', 'In a non-IPF fibrotic ILD an absolute fall of 5 points within a year is the FVC component of the physiologic progression criterion (ATS/ERS/JRS/ALAT 2022); an isolated threshold crossing is not PPF.');
        if (m.k === 'six' && m.dAbs <= -30 && !f.trend6.multi) H('PR8-' + p.idx, 'note', 'Comparison', '6MWD fell by ' + fmt(Math.abs(m.dAbs), 0) + ' m', 'Exceeds the 30 m minimal important difference.');
      });
      if (has(p.ccs) && Math.abs(p.ccs) > 1.96) H('PR9-' + p.idx, 'caution', 'Comparison', 'Conditional change score outside ±1.96', 'FEV1 changed more than expected for a child or young person (score ' + fz(p.ccs) + ').');
      const fm = p.metrics.filter(m => m.k === 'fev1')[0], vm = p.metrics.filter(m => m.k === 'fvc')[0];
      if (fm && vm && fm.dPct > 5 && vm.dPct < -5) H('PR10-' + p.idx, 'note', 'Comparison', 'FEV1 and FVC moved in opposite directions', 'Check technique and the ratio; air-trapping changes can raise FEV1 while lowering FVC.');
    });
    if (has(ctx.age) && ctx.age < 18 && f.priors.some(p => p.metrics.some(m => m.q0 !== undefined))) H('PR11', 'note', 'Comparison', 'FEV1Q is not valid in children', 'FEV1Q applies to adults only; use the conditional change score for children.');
  }

  /* ---------- flow-volume loop shape vs. numeric indices ---------- */
  if (f.on.fvl && sp.loop) {
    if (sp.loop === 'cough' || sp.loop === 'early' || sp.loop === 'slow') H('TQ18', 'caution', 'Test quality', sp.loop === 'cough' ? 'Cough artifact on the loop' : (sp.loop === 'slow' ? 'Hesitant start on the loop' : 'Early termination on the loop'), sp.loop === 'slow' ? 'A slow start lowers the PEF and can lower FEV1; the ATS/ERS 2019 acceptability criterion is a back-extrapolated volume under 5% of FVC (or 0.100 L). Confirm it was met or repeat with a faster start.' : sp.loop === 'cough' ? 'A cough in the first second can lower FEV1 falsely; confirm that the reported values come from maneuvers without it.' : 'Exhalation that stops before a plateau makes FVC and the ratio unreliable (and can falsely raise the ratio); check the end-of-test criteria.');
    if (sp.loop === 'normal' && R.low) H('LP1', 'note', 'Loop vs. indices', 'Loop looks normal but FEV1/FVC is below the LLN', 'Mild obstruction can look near-normal on the loop; confirm the selection against the tracing.');
    if ((sp.loop === 'sevobs' || sp.loop === 'concave') && R.wnl && A.wnl && B.wnl && spp.kind !== 'concave') H('LP2', 'caution', 'Loop vs. indices', 'Obstructive-looking loop with normal indices', 'A scooped loop with a normal ratio and FEV1 is discordant (apart from mild concavity, Annals ATS 2025 S10); re-check the loop and the entries.');
    if (sp.loop === 'sevobs' && A.measured && !(A.cat === 'sev' || A.cat === 'mod') && !A.wnl) H('LP3', 'note', 'Loop vs. indices', 'Severe-obstruction loop but FEV1 is only mildly reduced', 'The loop shape and the FEV1 z-score disagree; confirm which is right.');
    if (sp.loop === 'convex' && R.low) H('LP4', 'note', 'Loop vs. indices', 'Restriction-type loop with a low FEV1/FVC', 'A small loop with obstruction suggests mixed disease; lung volumes would resolve this.');
    if (sp.loop === 'convex' && T.measured && T.wnl) H('LP5', 'note', 'Loop vs. indices', 'Restriction-type loop but TLC is normal', 'A small, steep loop is not specific for restriction; the normal TLC argues against it.');
    if (sp.loop === 'convex' && !f.hasTLC && !f.on.vol) H('LP6', 'note', 'Missing data', 'Restriction-type loop without lung volumes', 'Lung volumes are needed to confirm restriction.');
    if ((sp.loop === 'expflat' || sp.loop === 'inspflat' || sp.loop === 'bothflat') && sp.repro && !(f.fvl.pef.measured || has(f.fvl.pefL) || f.fvl.fevpefSel || f.fvl.fifSel || f.fvl.fif50c.measured)) H('LP7', 'note', 'Missing data', 'Upper-airway pattern without flow indices', 'FEV1/PEF, FEF50/FIF50 and the inspiratory flows (ERS/ATS 2022 Table 6) can support the pattern; consider laryngoscopy or airway imaging if clinically suspected.');
    if (sp.loop === 'saw') H('LP8', 'note', 'Loop vs. indices', 'Saw-tooth pattern', 'Oscillations can reflect floppy upper-airway tissue (including sleep apnea), neuromuscular disease, tremor or poor technique; correlate clinically.');
    if (sp.loop === 'unilat') H('LP9', 'note', 'Loop vs. indices', 'Biphasic expiratory flow', 'Consider unilateral main-bronchus obstruction or a single-lung transplant; imaging or bronchoscopy follows if unexplained.');
    if (sp.loop === 'weak' && f.on.spiro && !f.on.mip) H('LP10', 'note', 'Missing data', 'Weakness-type loop without MIP/MEP', 'Respiratory-muscle strength testing (MIP/MEP/SNIP) and a supine VC would clarify.');
  }

  /* ---------- reference equations ---------- */
  const eq = ctx.eq;
  if (f.on.spiro && eq.spiro === 'gli2012') H('EQ1', 'note', 'Equations', 'Race-specific spirometry equations were used', 'ATS 2023 recommends the race-neutral GLI Global equations; z-scores from race-specific sets differ, so compare like with like when a prior used another set. Historical values are not converted by an improvised factor.');
  if ((f.on.spiro && eq.spiro === 'other') || (f.on.vol && eq.vol === 'other') || (f.on.dlco && eq.dlco === 'other')) H('EQ2', 'note', 'Equations', 'Non-GLI reference equations in use', 'ERS/ATS 2022 recommends GLI equations. The z-scores entered are taken at face value; do not mix z-scores from different reference sets when comparing studies.');
  if ((f.on.sixmw || f.on.cpet) && eq.hrmax === 'fox' && has(ctx.age)) H('EQ3', 'note', 'Equations', 'Predicted HRmax uses 220 − age', 'This overestimates HRmax in older adults and underestimates it in young people; Tanaka (208 − 0.7 × age, meta-analysis of 351 studies) is the default. A peak HR near 85% of predicted may be classed differently.');
  if (f.on.gas && f.gas.any && has(f.gas.aa) && !f.gas.onO2 && has(ctx.age)) {
    const lim1 = ctx.age / 4 + 4, lim2 = (ctx.age + 10) / 4, lo = Math.min(lim1, lim2), hi = Math.max(lim1, lim2);
    if (f.gas.aa > lo && f.gas.aa <= hi) H('EQ4', 'note', 'Equations', 'A–a gradient lies between the two common upper limits', 'Age/4 + 4 gives ' + fmt(lim1, 1) + ' and (age + 10)/4 gives ' + fmt(lim2, 1) + ' mmHg; the gradient (' + fmt(f.gas.aa, 0) + ') is borderline by the equation used.');
  }

  /* ---------- tests suggested by the indication ---------- */
  if (ctx.indic.length) {
    const I = (k) => ctx.hasInd(k), anyI = (a) => a.some(I);
    if (anyI(['asthma', 'wheeze', 'cough']) && spOn && normalSpiro && !f.on.bd && !f.on.bronch && !f.on.feno)
      H('IN1', 'note', 'Indication', 'Asthma-type symptoms with normal baseline spirometry', 'Normal spirometry does not exclude asthma; a bronchodilator response, FeNO or a bronchoprovocation challenge could help.');
    if (I('asthma') && R.low && !f.on.bd) H('IN2', 'note', 'Indication', 'Asthma with obstruction and no bronchodilator test', 'Reversibility (an increase of more than 10% of predicted in FEV1 or FVC) helps document variable airflow limitation.');
    if (anyI(['ild', 'sarc', 'ctd', 'drug', 'postcovid', 'ph', 'onc', 'occ', 'hypox']) && !f.on.dlco)
      H('IN3', 'note', 'Indication', 'No DLCO for this indication', 'DLCO is usually the most sensitive test for parenchymal and pulmonary vascular disease and for drug toxicity.');
    if (anyI(['ild', 'ctd', 'sarc', 'postcovid']) && !f.on.vol && spOn && (B.low || !R.low)) H('IN4', 'note', 'Indication', 'Interstitial indication without lung volumes', 'TLC is the physiologic criterion for restriction; a low FVC alone is only suggestive.');
    if (I('nmd') && !f.on.mip) H('IN5', 'note', 'Indication', 'Neuromuscular disease without respiratory-pressure testing', 'MIP/MEP (or SNIP) and a supine versus upright VC are the usual measures of respiratory-muscle strength.');
    if (I('nmd') && f.on.mip && !f.on.post) H('IN6', 'note', 'Indication', 'Neuromuscular disease without a postural VC', 'A fall in VC of 20% or more supine suggests diaphragm weakness and is a sensitive screen.');
    if (I('copd') && R.low && (!f.on.bd || !f.bd.postRatio.measured)) H('IN7', 'note', 'Indication', 'COPD requires a post-bronchodilator FEV1/FVC', 'Persistent airflow limitation after a bronchodilator (ratio below the LLN) is needed to confirm COPD; record the post-bronchodilator ratio.');
    if (I('cf') && !f.on.prior) H('IN8', 'note', 'Indication', 'Cystic fibrosis without a prior comparison', 'Change in FEV1 from the patient’s own best or previous values is central in CF; add the prior study to see the percentage change.');
    if (anyI(['fu', 'drug', 'tx', 'ild', 'copd']) && !f.on.prior) H('IN9', 'note', 'Indication', 'Follow-up indication without a prior study', 'Serial change is more informative than a single value; consider adding the prior FEV1/FVC/DLCO to compare.');
    if (I('hypox') && !f.on.gas && !f.on.sixmw) H('IN10', 'note', 'Indication', 'Unexplained hypoxemia without a blood gas or exertional oximetry', 'An ABG (A–a gradient) and a walk test help separate hypoventilation, V/Q mismatch, shunt and exertional desaturation.');
    if (I('dyspnea') && !f.on.cpet && spOn && normalSpiro && volNormal && (!dlOn || (Dm.wnl || Dm.bl))) H('IN11', 'note', 'Indication', 'Dyspnea with normal resting tests', 'Cardiopulmonary exercise testing can separate deconditioning, cardiac, ventilatory, gas-exchange and dysfunctional-breathing causes.');
    if (I('preop') && spOn && A.measured && A.grade >= 2 && !f.on.dlco) H('IN12', 'note', 'Indication', 'Pre-operative evaluation with reduced FEV1 and no DLCO', 'FEV1 and DLCO together are used for risk stratification in lung-resection candidates.');
    if (I('chestwall') && !f.on.mip && (T.low || B.low)) H('IN13', 'note', 'Indication', 'Chest-wall or obesity indication with restriction and no respiratory-pressure testing', 'MIP/MEP and a postural VC help separate muscle weakness from mechanical restriction.');
    if (I('ph') && dlOn && Dm.low && !f.on.sixmw) H('IN14', 'note', 'Indication', 'Pulmonary hypertension with a low DLCO and no exercise test', 'A walk test with oximetry adds prognostic information and screens for exertional desaturation.');
    if (I('copd') && spOn && R.wnl && !f.on.bd) H('IN15', 'note', 'Indication', 'COPD indication with a normal pre-bronchodilator ratio', 'A normal ratio makes COPD unlikely by spirometry; consider imaging, DLCO or oscillometry if emphysema or small-airway disease is suspected.');
  }

  /* ---------- what to look for: waveform and next-step suggestions ---------- */
  {
    const LK = (k, cp) => ({ k: k, cap: cp });
    const NORM = LK('normal', 'Normal loop, for comparison');
    const loopSel = sp.loop, flat = (loopSel === 'expflat' || loopSel === 'inspflat' || loopSel === 'bothflat');
    const restr = (volOn && T.low) || (spOn && spp.restrictionSuggested && !f.poorEffort) || (spOn && !R.low && B.low && f.ctx.hasInd('ild'));
    if (restr) {
      const confirmed = volOn && T.low;
      H('TIP1', 'tip', 'Look for', 'Restriction: look for a restrictive waveform',
        (confirmed ? 'TLC is reduced. ' : 'A low FVC with a preserved FEV1/FVC is only suggestive of restriction. ') +
        'On the flow–volume loop, restriction gives a small, tall, narrow loop: the volume axis is shortened while flows stay normal or relatively high, so the expiratory limb is steep and straight or convex rather than scooped, and the inspiratory limb is small too. ' +
        'A near-normal loop does not exclude restriction, and the shape alone is not specific. ' +
        (confirmed ? 'Use the DLCO with VA and KCO to characterise the physiology: a low KCO points to the alveolar–capillary unit, a preserved or high KCO with low VA to limited expansion (chest wall, neuromuscular, pleural, effort); neither identifies a diagnosis on its own.' : 'Confirm with lung volumes (TLC below the LLN); if none were done, consider obtaining them.'),
        [LK('convex', 'Restriction: small, tall, narrow loop with a steep expiratory limb'), NORM]);
    }
    if (spOn && R.low) {
      H('TIP2', 'tip', 'Look for', 'Obstruction: look for a scooped expiratory limb',
        'Airflow obstruction gives a concave (scooped) descending limb: flow drops quickly after the peak and then trails off at low volumes. With emphysema the early peak is lower and the low-flow tail longer. ' +
        'The curvature can be visible before FEV1/FVC crosses the LLN (Annals ATS 2025 S10 allows a concave loop with normal indices to be commented on). ' +
        'If a post-bronchodilator loop is available, compare the curvature and the peak flow, and check RV/TLC for air trapping.',
        [LK('concave', 'Mild–moderate obstruction: concave (scooped) limb'), LK('sevobs', 'Severe obstruction / emphysema: low peak, long tail')]);
    }
    if (R.low && volOn && T.low) {
      H('TIP3', 'tip', 'Look for', 'Mixed pattern: a scooped limb on a small loop',
        'A low FEV1/FVC with a low TLC is a mixed obstructive and restrictive pattern. On the loop, expect a reduced-volume loop whose expiratory limb is still concave rather than steep and straight; confirm that the TLC measurement method (plethysmography) can reach trapped gas.',
        [LK('concave', 'Scooped limb (obstructive component)'), LK('convex', 'Small, steep loop (restrictive component)')]);
    }
    const flowsOff = f.fvl.pef.low || f.fvl.fevPefHi === true || (f.fvl.fifCat && f.fvl.fifCat !== '' && (f.fvl.pef.low || f.fvl.fif50c.low));
    const wheezy = f.ctx.hasInd('wheeze') || f.ctx.hasInd('cough');
    if (flat || flowsOff || (wheezy && normalSpiro)) {
      H('TIP4', 'tip', 'Look for', 'Dynamic (variable) upper-airway obstruction: what the loop should show',
        (flat || flowsOff ? 'The flow indices or loop raise the question of central or upper-airway obstruction. ' : 'Wheeze or cough with normal spirometry can come from a dynamic upper-airway problem that spirometry numbers miss. ') +
        'Check the inspiratory and expiratory limbs on at least three reproducible maneuvers: ' +
        '(1) variable extrathoracic lesion (vocal-cord dysfunction or paralysis, goiter): the inspiratory limb is flattened or truncated, the expiratory limb is preserved, FIF50/FEF50 is below 1; ' +
        '(2) variable intrathoracic lesion (tracheomalacia, intrathoracic tracheal tumor): an early expiratory peak followed by a plateau, with a preserved inspiratory limb and FIF50/FEF50 above 1; ' +
        '(3) fixed obstruction (tracheal stenosis, fixed lesion): both limbs flattened into a box-like loop, FIF50/FEF50 about 1 and FEV1/PEF above 8. ' +
        'Poor effort can mimic these, so flattening only counts if it reproduces. Laryngoscopy during symptoms, dynamic airway CT or bronchoscopy are the usual next steps.',
        [LK('inspflat', 'Variable extrathoracic: inspiratory plateau'), LK('expflat', 'Variable intrathoracic: expiratory plateau'), LK('bothflat', 'Fixed: both limbs flattened')]);
    }
    const weak = loopSel === 'weak' || (f.on.mip && f.mp.any && (f.mp.mip === 'low' || f.mp.mep === 'low' || f.mp.snip === 'low')) || (f.on.post && f.post.any && f.post.ge20) || (volOn && vp.complex);
    if (weak) {
      H('TIP5', 'tip', 'Look for', 'Respiratory-muscle weakness: what the loop and tests should show',
        'Weakness lowers the peak flow and flattens it into a low, rounded peak, and the inspiratory limb is reduced as well; expiratory flows at low volumes are relatively preserved. Look for a restrictive pattern with a raised RV/TLC, low MIP, MEP or SNIP, and a supine fall in vital capacity (15% is the ERS 2019 screening clue; 20% or more is often cited for diaphragm weakness, 30% or more when bilateral). ' +
        (f.on.mip ? '' : 'MIP/MEP/SNIP have not been entered; they are the direct test. ') +
        (f.on.post ? '' : 'An upright versus supine vital capacity adds to the evaluation of the diaphragm.'),
        [LK('weak', 'Weakness: low rounded peak, reduced inspiratory limb'), NORM]);
    }
    const art = (loopSel === 'effort' || loopSel === 'slow' || loopSel === 'cough' || loopSel === 'early');
    if (art || sp.effort === 'poor' || sp.relF !== 'ok' || sp.relV !== 'ok') {
      H('TIP6', 'tip', 'Look for', 'Effort and technique: artifacts that change the numbers',
        'Before trusting a low FEV1 or FVC, look at the loop for a late or blunted peak (submaximal effort), a slow start (back-extrapolated volume under 5% of FVC or 0.100 L), an early cough spike (lowers FEV1) and exhalation that stops while flow is still high (unreliable FVC and ratio). Efforts that do not overlap are a sign that the values are not reproducible.',
        [LK(art ? loopSel : 'effort', art ? 'The artifact selected on this loop' : 'Submaximal effort: late, blunted, irregular peak'), LK('slow', 'Hesitant start: slow rise to a late, low peak'), LK('cough', 'Cough: early spike or notch'), LK('early', 'Early termination: ends while flow is still high')].filter((x, i, a) => a.findIndex(y => y.k === x.k) === i));
    }
  }

  /* ---------- missing information that would change the read ---------- */
  if (spOn) {
    if (R.low && B.low && !f.hasTLC && !f.poorEffort) H('MD1', 'note', 'Missing data', 'Lung volumes would clarify a low ratio with a low FVC', 'Needed to separate air trapping from coexisting restriction (mixed disorder). Consider obtaining lung volumes.');
    if (R.measured && !R.low && B.low && !A.low && !f.hasTLC && !f.poorEffort) H('MD2', 'note', 'Missing data', 'Lung volumes needed to confirm restriction', 'A low FVC with a preserved ratio is suggestive of restriction but cannot be confirmed without TLC. Consider obtaining lung volumes.');
    if (R.low && !f.on.bd) H('MD3', 'note', 'Missing data', 'No bronchodilator response recorded', 'Baseline obstruction is present; a post-bronchodilator assessment would show reversibility and whether obstruction persists.');
    if (R.low && !dlOn && !f.on.dlco) H('MD4', 'note', 'Missing data', 'No DLCO with airflow obstruction', 'DLCO helps separate airway-predominant from parenchymal (emphysematous) disease.');
  }
  if (volOn && vp.complex && !f.on.mip) H('MD5', 'note', 'Missing data', 'Complex restriction without respiratory-muscle testing', 'A low TLC with elevated RV/TLC often accompanies weakness or chest-wall disease; consider MIP/MEP/SNIP and supine VC.');
  if (volOn && vp.restriction && dlOn && !f.on.mip && (d.pat.mech === 'lowVA_highKCO' || d.pat.mech === 'incompleteWNL')) H('MD6', 'note', 'Missing data', 'Restriction with high KCO: limited expansion likely', 'Low VA with a high KCO points to incomplete expansion; respiratory-muscle strength and chest-wall assessment would help.');
  const needAge = (f.on.cpet && f.cp.any) || (f.on.feno && f.feno.any) || (f.on.gas && f.gas.any);
  if (needAge && !has(ctx.age)) H('MD7', 'note', 'Missing data', 'Age not entered', 'Age is used for CPET cut-offs, FeNO cut-points (< 12 years) and the expected A–a gradient.');
  if (((f.on.mip && f.mp.any) || (f.on.cpet && f.cp.any) || (dlOn && d.hbKnown) || (f.on.prior && f.prior.any)) && !ctx.sex) H('MD8', 'note', 'Missing data', 'Sex not entered', 'Sex sets the screening MIP/MEP thresholds, CPET cut-offs, the Hb reference and FEV1Q.');
  if (spOn && (has(sp.fev1L) && !A.measured)) H('MD9', 'note', 'Missing data', 'FEV1 entered in litres without a z-score or category', 'The FEV1 value cannot be classified without its z-score or category; the interpretation above ignores it.');
  if (spOn && (has(sp.fvcL) && !B.measured)) H('MD10', 'note', 'Missing data', 'FVC entered in litres without a z-score or category', 'The FVC value cannot be classified without its z-score or category; the interpretation above ignores it.');
  if (volOn && has(v.tlcL) && !T.measured) H('MD11', 'note', 'Missing data', 'TLC entered in litres without a z-score or category', 'TLC cannot be classified (restriction vs. normal vs. hyperinflation) without its z-score or category.');
  if (volOn && has(v.rvL) && !v.rv.measured && !v.rvtlc.measured) H('MD12', 'note', 'Missing data', 'RV entered in litres without a z-score or category', 'RV and RV/TLC cannot be classified without their z-scores or categories.');
  const idx = new Map(); out.forEach((h, i) => idx.set(h, i));
  out.sort((a, b) => (LVL_RANK[a.lvl] - LVL_RANK[b.lvl]) || (idx.get(a) - idx.get(b)));
  const seen = {}; return out.filter(h => { if (seen[h.id]) return false; seen[h.id] = 1; return true; });
}

/* ------------------------------------------------------------ report text */
function studyHeader(f) {
  const bits = [];
  const c = f.ctx;
  if (has(c.age)) bits.push(fmt(c.age, 0) + '-year-old');
  if (c.sex) bits.push(c.sex === 'M' ? 'male' : 'female');
  if (has(c.ht)) bits.push('height ' + fmt(c.ht, 0) + ' cm');
  if (has(c.bmi)) bits.push('BMI ' + fmt(c.bmi, 1));
  if (c.smoke) bits.push(c.smoke + ' smoker');
  return bits.join(', ');
}
function testsPerformed(f) {
  const names = [];
  TESTS.forEach(t => {
    if (!f.on[t.key]) return;
    let n = t.name;
    if (t.key === 'vol') { const m = { pleth: 'body plethysmography', n2: 'nitrogen washout', he: 'helium dilution', sb: 'single-breath' }[f.vol.method]; if (m) n += ' (' + m + ')'; }
    names.push(n);
  });
  return names;
}
function referenceLine(f) {
  const e = f.ctx.eq, on = f.on, parts = [];
  if (on.spiro || on.bd || on.fvl) parts.push('spirometry ' + ({ global: 'GLI Global (race-neutral)', gli2012: 'GLI-2012', other: 'per laboratory' })[e.spiro]);
  if (on.vol) parts.push('lung volumes ' + ({ gli2021: 'GLI-2021', other: 'per laboratory' })[e.vol]);
  if (on.dlco) parts.push('DLCO ' + ({ gli2017: 'GLI-2017', other: 'per laboratory' })[e.dlco]);
  return parts.length ? parts.join('; ') : 'not applicable';
}
const GRADING_LINE = 'Impairment is graded by z-score (ERS/ATS 2022): LLN at z = −1.645; mild from −1.645 down to −2.5; moderate below −2.5 down to −4.0; severe below −4.0. The grade describes the measurement, not disease severity.';
function buildText(f, secs, impression, headsup, withHeadsup) {
  const L = [];
  L.push('PULMONARY FUNCTION TEST REPORT');
  const hdr = [];
  if (f.st.ctx.date) hdr.push('Date: ' + f.st.ctx.date);
  const sh = studyHeader(f); if (sh) hdr.push(sh);
  if (hdr.length) L.push(hdr.join(' | '));
  const ind = f.ctx.indicLabels.slice(); if (f.ctx.indication) ind.push(f.ctx.indication);
  if (ind.length) L.push('Indication: ' + ind.map((x, i) => i === 0 ? cap(x) : x).join('; '));
  L.push('Tests performed: ' + (testsPerformed(f).join('; ') || 'none selected'));
  L.push('Reference: ' + referenceLine(f) + '. ' + GRADING_LINE + (f.on.vol && f.vol.pat.restriction && f.vol.pat.sev ? ' Restriction severity is graded by the TLC z-score (Annals ATS 2025 convention).' : ''));
  L.push('');
  secs.forEach(s => { L.push(s.title + ': ' + s.lines.join(' ')); L.push(''); });
  L.push('INTERPRETATION:');
  if (impression.length) impression.forEach((s, i) => L.push((i + 1) + '. ' + s));
  else L.push('No interpretable data entered.');
  const studies = f.studies || [];
  if (studies.length) { L.push(''); L.push('ADDITIONAL STUDIES TO CONSIDER: ' + cap(studies.join('; ')) + '.'); }
  if (withHeadsup && headsup.length) {
    L.push('');
    L.push('HEADS-UP FOR THE INTERPRETER (not part of the final report):');
    headsup.forEach(h => L.push('- [' + h.lvl.toUpperCase() + '] ' + h.title + ': ' + h.text));
  }
  return L.join('\n');
}

/* ------------------------------------------------------------- public API */
function interpret(raw) {
  const st = normalizeState(raw);
  const f = buildFacts(st);
  f.vals = placeholderValues(f);
  const secs = [];
  const add = (key, fn) => {
    if (!f.on[key]) return;
    const sec = fn(f);
    if (!sec.lines.length) sec.lines.push('The values entered are incomplete, so no statement can be made.');
    secs.push(sec);
  };
  add('spiro', secSpiro); add('fvl', secFvl); add('bd', secBD); add('vol', secVol); add('dlco', secDlco);
  add('raw', secRaw); add('osc', secOsc); add('mip', secMip); add('post', secPost); add('feno', secFeno);
  add('bronch', secBronch); add('sixmw', secSix); add('cpet', secCpet); add('gas', secGas); add('prior', secPrior);
  f.dx = differentialGroups(f);
  markSuperseded(f.suggest, f.dx);
  f.studies = differentialText(f.dx).studies;
  const impression = buildImpression(f, secs);
  const headsup = buildHeadsUp(f, secs);
  const counts = { alert: 0, caution: 0, note: 0, tip: 0 };
  headsup.forEach(h => { counts[h.lvl]++; });
  const anyData = secs.some(s => !s.empty);
  return {
    state: st, facts: f, F: f.F, suggestions: f.suggest, differentials: f.dx, studies: f.studies, style: f.style, sections: secs, impression: impression, headsup: headsup, counts: counts, anyData: anyData,
    text: buildText(f, secs, impression, headsup, false),
    textWithHeadsup: buildText(f, secs, impression, headsup, true)
  };
}

const API = {
  version: '2.1.0',
  catalogVersion: CATALOG.version,
  Z_LLN: Z_LLN, Z_ULN: Z_ULN, STYLES: STYLES,
  TESTS: TESTS, PRESETS: PRESETS, SCHEMA: SCHEMA, LOOPS: LOOPS, INDICATIONS: INDICATIONS, KIND_OPTS: KIND_OPTS, PRIOR_FIELDS: PRIOR_FIELDS, CUR_FIELDS: CUR_FIELDS, MAX_PRIORS: MAX_PRIORS, MAX_TREND: MAX_TREND,
  CATALOG: CATALOG, REVIEW_PHRASES: REVIEW_PHRASES.map(r => r.id), STUDIES: STUDIES, DX_GROUPS: DX_GROUPS.map(g => ({ key: g.key, title: g.title })),
  defaultState: defaultState, normalizeState: normalizeState, blankPrior: blankPrior, blankTrendRow: blankTrendRow,
  interpret: interpret, res: res, num: num, catFromZ: catFromZ, fz: fz,
  phrase: phrase, eligiblePhrases: eligiblePhrases, factMatches: factMatches, catPhrase: catPhrase,
  _internal: { spiroPattern: spiroPattern, volPattern: volPattern, dlcoPattern: dlcoPattern, buildFacts: buildFacts, deriveFacts: deriveFacts, cpetEval: cpetEval, abgEval: abgEval, mchCategory: mchCategory, methacholineFacts: methacholineFacts, mchAutoCategory: mchAutoCategory, fenoBand: fenoBand, exerciseState: exerciseState, placeholderValues: placeholderValues, differentialGroups: differentialGroups, differentialText: differentialText, CFG: CFG }
};

if (typeof module !== 'undefined' && module.exports) module.exports = API;
root.PFT = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
