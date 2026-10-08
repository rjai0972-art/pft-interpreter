// Runs the handoff fixtures (catalog/pft_test_vectors.json) against the real engine, plus catalog integrity checks.
// Run: node tests/catalog.test.js
const fs = require('fs'), path = require('path');
const { P, mk } = require('./helpers');
const VEC = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'catalog', 'pft_test_vectors.json'), 'utf8'));
const CAT = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'catalog', 'pft_phrases.json'), 'utf8'));
let pass = 0, fail = 0; const failures = [];
function ok(cond, name, extra) { if (cond) pass++; else { fail++; failures.push(name + (extra ? '  -> ' + extra : '')); } }
function eq(a, b, name) { ok(a === b, name, 'got ' + JSON.stringify(a) + ' expected ' + JSON.stringify(b)); }
const run = (st) => P.interpret(st);
const eligibleIds = (r) => P.eligiblePhrases(r.F).map(p => p.id);
const autoIds = (r) => P.eligiblePhrases(r.F, 'automatic').map(p => p.id);

/* ---------- catalog integrity: every phrase in the JSON is in the engine, and the engine matches the schema expectations ---------- */
(function () {
  eq(P.CATALOG.phrases.length, CAT.phrases.length, 'all catalog phrases embedded');
  eq(P.catalogVersion, CAT.catalog_version, 'catalog version');
  const ids = new Set(); CAT.phrases.forEach(p => ids.add(p.id));
  eq(ids.size, CAT.phrases.length, 'phrase ids unique');
  CAT.phrases.forEach(p => { ok(!!CAT.sections[p.section], 'section exists: ' + p.id); p.source_ids.forEach(s => ok(CAT.sources.some(x => x.id === s), 'source exists: ' + s + ' in ' + p.id)); });
  // every variant renders with complete sample values and never with incomplete ones
  CAT.phrases.forEach(p => {
    Object.keys(p.templates).forEach(k => {
      const req = (p.required_placeholders && p.required_placeholders[k]) || [];
      const vals = {}; req.forEach(r => { vals[r] = 'X'; });
      const r = P.phrase(p.id, k, vals);
      ok(r && r.variant === k && r.text.indexOf('{') < 0, 'renders ' + p.id + ' ' + k);
      if (req.length) { const short = Object.assign({}, vals); delete short[req[0]]; const r2 = P.phrase(p.id, k, short); ok(!r2 || r2.variant !== k, 'does not render ' + p.id + ' ' + k + ' without ' + req[0]); }
    });
  });
  // review-mode phrases are never eligible from measurements alone
  const full = run(mk(['spiro', 'bd', 'vol', 'dlco', 'mip', 'post', 'feno', 'bronch', 'sixmw', 'prior'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=wnl', 'vol.tlc=wnl', 'vol.rvtlc=high', 'vol.frctlc=high', 'dlco.dlco=mod', 'dlco.va=low', 'dlco.kco=wnl', 'bd.resp=none', 'bd.post_ratio=low'));
  const rev = P.eligiblePhrases(full.F, 'review');
  eq(rev.length, 0, 'no review phrase eligible without a clinician selection', rev.map(p => p.id).join(','));
  // selecting a suggestion makes exactly that review phrase eligible
  const st = mk(['spiro', 'vol', 'dlco'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=wnl', 'vol.tlc=wnl', 'vol.rvtlc=high', 'vol.frctlc=high', 'dlco.dlco=mod');
  st.review = { 'impression.emphysema_context': true };
  const r2 = run(st);
  ok(P.eligiblePhrases(r2.F, 'review').map(p => p.id).join(',') === 'impression.emphysema_context', 'selected review phrase eligible');
  ok(r2.impression.some(t => /compatible with emphysema/i.test(t)), 'selected review phrase appears in the interpretation');
  ok(!run(mk(['spiro', 'vol', 'dlco'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=wnl', 'vol.tlc=wnl', 'vol.rvtlc=high', 'vol.frctlc=high', 'dlco.dlco=mod')).impression.some(t => /emphysema/i.test(t)), 'no disease name without selection');
  // no source keys, placeholders or fact paths in the copy-ready report
  [full, r2].forEach(r => {
    ok(!/\{[a-z0-9_]+\}/i.test(r.text), 'no placeholder printed');
    ok(!/\b(I22|S19|L23|D17|R17|M19|M02|B17|B18|E13|F11|O20|W14|P22|RN23|I05)\b/.test(r.text), 'no source key printed');
    ok(!/observations\.|patterns\.|volume_patterns\./.test(r.text), 'no fact path printed');
    ok(!/\bNone\b|\bnull\b|\bundefined\b|NaN/.test(r.text), 'no None/null/NaN printed');
  });
})();

/* ---------- machine-checkable fixtures ---------- */
const stateMap = { normal: 'wnl', low: 'mild', high: 'high' };
function spiroState(inp, extra) {
  const tests = ['spiro']; if (inp.tlc !== null && inp.tlc !== undefined) tests.push('vol');
  const specs = [];
  if (inp.ratio === 'invalid') { specs.push('spiro.ratio=low', 'spiro.qual_fvc=F'); } else specs.push('spiro.ratio=' + ({ normal: 'wnl', low: 'low', high: 'high' })[inp.ratio]);
  specs.push('spiro.fev1=' + stateMap[inp.fev1], 'spiro.fvc=' + stateMap[inp.fvc]);
  if (inp.tlc !== null && inp.tlc !== undefined) specs.push('vol.tlc=' + stateMap[inp.tlc]);
  return run(mk.apply(null, [tests].concat(specs, extra || [])));
}
function volState(inp) {
  const specs = ['spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl'];
  if (inp.tlc !== null) specs.push('vol.tlc=' + stateMap[inp.tlc]);
  if (inp.rv_tlc !== null) specs.push('vol.rvtlc=' + (inp.rv_tlc === 'high' ? 'high' : 'wnl'));
  if (inp.frc_tlc !== null) specs.push('vol.frctlc=' + (inp.frc_tlc === 'high' ? 'high' : 'wnl'));
  return run(mk.apply(null, [['spiro', 'vol']].concat(specs)));
}
VEC.machine_checkable_fixtures.forEach(fx => {
  const name = 'fixture ' + fx.id;
  const inp = fx.inputs, exp = fx.expected;
  let r = null;
  try {
    if (fx.kind === 'z_state') {
      const res = P.res({ c: '', z: inp.z === null ? '' : String(inp.z) }, 'gradeH', inp.reliable === false ? 'invalid' : 'ok');
      const st = res.state === 'not_measured' ? 'unknown' : res.state;
      eq(st, exp.state, name + ' state');
      eq(res.sevState, exp.severity, name + ' severity');
    } else if (fx.kind === 'pattern') {
      r = spiroState(inp);
      const sp = r.facts.sp.pat, F = r.F;
      const got = sp.indeterminate ? 'indeterminate' : (sp.highTlcReview ? 'low_volumes_high_tlc_review' : (F['patterns.mixed'] ? 'mixed' : (F['patterns.obstruction_low_fvc_unconfirmed'] ? 'obstruction_low_fvc_unconfirmed' : (F['patterns.obstruction_low_fvc_no_restriction'] ? 'obstruction_low_fvc_no_restriction' : (F['patterns.obstruction_preserved_fev1'] ? 'obstruction_preserved_fev1' : (F['patterns.obstruction'] ? 'obstruction' : (F['patterns.restriction'] ? 'restriction' : (F['patterns.nonspecific'] ? 'nonspecific' : (F['patterns.low_fvc_unconfirmed'] ? 'low_fvc_unconfirmed' : (F['patterns.normal'] ? 'normal' : 'other'))))))))));
      eq(got, exp.pattern, name + ' pattern');
      const restr = F['patterns.restriction'] === true ? 'confirmed' : (r.facts.hasTLC ? 'not_demonstrated' : 'unconfirmed');
      eq(restr, exp.restriction, name + ' restriction');
    } else if (fx.kind === 'bd') {
      const specs = ['spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=wnl'];
      if (inp.fev1) { specs.push('bd.fev1_pre=' + inp.fev1.pre, 'bd.fev1_post=' + inp.fev1.post); if (inp.fev1.predicted !== null) specs.push('bd.fev1_pred=' + inp.fev1.predicted); if (inp.fev1.reliable === false) specs.push('bd.qc=inv'); }
      if (inp.fvc) { specs.push('bd.fvc_pre=' + inp.fvc.pre, 'bd.fvc_post=' + inp.fvc.post); if (inp.fvc.predicted !== null) specs.push('bd.fvc_pred=' + inp.fvc.predicted); if (inp.fvc.reliable === false) specs.push('bd.qc=inv'); }
      r = run(mk.apply(null, [['spiro', 'bd']].concat(specs)));
      eq(r.F['bronchodilator.response'], exp.response, name + ' response');
      if (exp.fev1_pred_pct !== undefined) ok(Math.abs(r.facts.bd.dF - exp.fev1_pred_pct) < 0.01, name + ' FEV1 % pred', String(r.facts.bd.dF));
      if (exp.fvc_pred_pct !== undefined) ok(Math.abs(r.facts.bd.dV - exp.fvc_pred_pct) < 0.01, name + ' FVC % pred', String(r.facts.bd.dV));
      if (exp.fev1_baseline_pct !== undefined) ok(Math.abs(r.facts.bd.dFbase - exp.fev1_baseline_pct) < 0.01, name + ' FEV1 % baseline');
      if (exp.legacy_ge_200_profile) { ok(r.facts.bd.legacy === true, name + ' legacy profile met'); ok(r.facts.bd.discordant, name + ' discordance flagged'); }
    } else if (fx.kind === 'volume_pattern') {
      r = volState(inp);
      const F = r.F;
      const got = F['volume_patterns.hyperinflation_tlc'] ? 'hyperinflation_tlc' : (F['volume_patterns.hyperinflation'] ? 'hyperinflation' : (F['volume_patterns.air_trapping'] ? 'air_trapping' : (F['volume_patterns.large_lungs'] ? 'large_lungs' : (F['volume_patterns.low_tlc_high_ratio'] ? 'low_tlc_high_ratio' : (F['volume_patterns.normal'] ? 'normal' : 'unclassified')))));
      eq(got, exp.volume_pattern, name + ' volume pattern');
    } else if (fx.kind === 'diffusion_pattern') {
      const specs = ['dlco.dlco=' + stateMap[inp.dlco]];
      if (inp.va !== null) specs.push('dlco.va=' + ({ normal: 'wnl', low: 'low', high: 'high' })[inp.va]);
      if (inp.kco !== null) specs.push('dlco.kco=' + ({ normal: 'wnl', low: 'low', high: 'high' })[inp.kco]);
      r = run(mk.apply(null, [['dlco']].concat(specs)));
      const F = r.F, keys = ['low_dlco_normal_va_low_kco', 'low_dlco_low_va_low_kco', 'low_dlco_low_va_normal_kco', 'low_dlco_low_va_high_kco'];
      const got = keys.filter(k => F['diffusion_patterns.' + k] === true)[0] || 'unclassified';
      eq(got, exp.diffusion_pattern, name + ' diffusion pattern');
    } else if (fx.kind === 'pressure') {
      r = run(mk(['mip'], 'ctx.sex=M', 'mip.mip_v=' + inp.value, 'mip.mip_lln=' + inp.magnitude_lln, 'mip.effort=' + (inp.reliable === false ? 'inv' : '')));
      eq(r.facts.mp.mip, exp.state, name + ' state');
      if (exp.magnitude !== undefined) eq(r.facts.mp.mipV, exp.magnitude, name + ' magnitude');
    } else if (fx.kind === 'supine_vc') {
      const specs = ['post.up=' + inp.upright]; if (inp.supine !== null) specs.push('post.sup=' + inp.supine);
      r = run(mk.apply(null, [['post']].concat(specs)));
      if (exp.drop_pct === null) ok(!isFinite(r.facts.post.drop), name + ' no drop'); else ok(Math.abs(r.facts.post.drop - exp.drop_pct) < 1e-9, name + ' drop %', String(r.facts.post.drop));
      eq(!!r.F['muscle.supine_drop_computable'], exp.decrease_template_eligible, name + ' template eligible');
    } else if (fx.kind === 'feno') {
      r = run(mk(['feno'], 'feno.val=' + inp.ppb, 'ctx.age=' + inp.age_years));
      eq(r.F['feno.adult_category'] === undefined ? 'unknown' : r.F['feno.adult_category'], exp.category, name + ' category');
    } else if (fx.kind === 'serial_math') {
      r = run(mk(['spiro', 'prior'], 'spiro.fvc_pct=' + inp.current_pct_pred, 'prior.1.fvc_pct=' + inp.prior_pct_pred, 'prior.1.date=2024-01-01', 'ctx.date=2025-01-01'));
      const m = r.facts.priors[0].metrics.filter(x => x.k === 'fvc_pct')[0];
      ok(m && Math.abs(m.dAbs - exp.signed_pp_change) < 1e-9, name + ' percentage points', m && String(m.dAbs));
      ok(m && Math.abs(m.relOfPct - exp.relative_pct_change_of_pct_pred) < 1e-9, name + ' relative change of % predicted', m && String(m.relOfPct));
    } else if (fx.kind === 'fact_match') {
      const p = P.catPhrase(inp.phrase_id);
      eq(P.factMatches(inp.facts, p.fact, p.value), exp.match, name);
    } else if (fx.kind === 'selection_gate') {
      // a review phrase with its fact asserted by data but not by the clinician must not be eligible: the engine writes review facts only from st.review
      const st = mk(['dlco'], 'dlco.dlco=mod');
      r = run(st);
      ok(eligibleIds(r).indexOf(inp.phrase_id) < 0, name + ' not eligible without selection');
    } else if (fx.kind === 'render_gate') {
      const out = P.phrase(inp.phrase_id, inp.variant, inp.values);
      eq(!!(out && out.variant === inp.variant), exp.renderable, name);
    } else ok(false, name + ' unknown kind ' + fx.kind);
    if (r) {
      const auto = autoIds(r), all = eligibleIds(r);
      (fx.eligible_phrase_ids || []).forEach(id => ok(auto.indexOf(id) >= 0 || all.indexOf(id) >= 0, name + ' offers ' + id, 'eligible: ' + auto.join(',')));
      (fx.blocked_phrase_ids || []).forEach(id => ok(all.indexOf(id) < 0, name + ' blocks ' + id));
    }
  } catch (e) { ok(false, name + ' threw ' + e.message + '\n' + e.stack.split('\n').slice(1, 3).join('\n')); }
});

/* ---------- review and integration fixtures ---------- */
(function () {
  let r;
  // methacholine_incomplete_not_negative
  r = run(mk(['bronch'], 'bronch.type=mch', 'bronch.mch_neg=1', 'bronch.complete=n'));
  ok(autoIds(r).indexOf('methacholine.incomplete') >= 0 && autoIds(r).indexOf('methacholine.negative') < 0, 'methacholine incomplete is not negative');
  // methacholine_censored_pd20
  r = run(mk(['bronch'], 'bronch.type=mch', 'bronch.unit=pd20', 'bronch.mch_neg=1', 'bronch.mch_max=400', 'bronch.complete=y'));
  ok(autoIds(r).indexOf('methacholine.pd20_not_reached') >= 0, 'censored PD20 offered');
  ok(/PD20 exceeds 400 µg|not reached through 400 µg/.test(r.text) && !/PD20 is 400/.test(r.text), 'censored PD20 printed as greater than', r.text);
  // metha_shared_category_endpoint
  r = run(mk(['bronch'], 'bronch.type=mch', 'bronch.unit=pd20', 'bronch.mch_val=100'));
  ok(r.F['observations.methacholine_ahr_category'] === undefined, 'shared endpoint not auto-categorised');
  ok(r.headsup.some(h => h.id === 'PH50'), 'shared endpoint flagged');
  ok(/boundary/.test(r.text), 'boundary stated in the report');
  eq(P._internal.mchAutoCategory('pd20', 99).cat, 'mild', 'PD20 99 mild'); eq(P._internal.mchAutoCategory('pd20', 101).cat, 'borderline', 'PD20 101 borderline');
  eq(P._internal.mchAutoCategory('pc20', 16).cat, null, 'PC20 16 boundary'); eq(P._internal.mchAutoCategory('pc20', 0.25).cat, null, 'PC20 0.25 boundary');
  // mixed_with_normal_fractions
  r = run(mk(['spiro', 'vol'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=mild', 'vol.tlc=mild', 'vol.rvtlc=wnl', 'vol.frctlc=wnl'));
  ok(autoIds(r).indexOf('pattern.mixed') >= 0, 'mixed offered with normal fractions');
  // ratio_normalizes_without_significant_bdr
  r = run(mk(['spiro', 'bd'], 'spiro.ratio=low', 'spiro.fev1=mild', 'spiro.fvc=wnl', 'bd.resp=none', 'bd.post_ratio=wnl'));
  ok(autoIds(r).indexOf('bd.normalized') >= 0 && autoIds(r).indexOf('bd.negative') >= 0, 'normalised ratio with negative response both offered');
  // positive_bdr_persistent_obstruction
  r = run(mk(['spiro', 'bd'], 'spiro.ratio=low', 'spiro.fev1=mild', 'spiro.fvc=wnl', 'bd.resp=fev1', 'bd.post_ratio=low'));
  ok(autoIds(r).indexOf('bd.fev1') >= 0 && autoIds(r).indexOf('bd.persistent') >= 0, 'positive response with persistent obstruction both offered');
  ok(/can coexist/.test(r.impression.join(' ')), 'coexistence stated');
  // reference_change_serial
  r = run(mk(['spiro', 'prior'], 'spiro.fev1_abs=2.0', 'spiro.fev1_pct=74', 'prior.1.fev1=2.0', 'prior.1.fev1_pct=80', 'prior.1.date=2024-01-01', 'prior.1.ref_diff=1', 'ctx.date=2025-01-01'));
  ok(autoIds(r).concat(eligibleIds(r)).indexOf('serial.reference_changed') >= 0, 'reference change offered');
  ok(eligibleIds(r).indexOf('serial.fev1_down') < 0, 'no measured decline from a reference change');
  ok(/comparison limited: different reference equations/.test(r.impression.join(' ')), 'percent-predicted change carries the caveat');
  // ppf_two_physiologic_metrics_one_domain
  r = run(mk(['spiro', 'dlco', 'prior'], 'ctx.indic=ild', 'ctx.date=2025-06-01', 'spiro.fvc_pct=70', 'dlco.dlco_pct=48', 'dlco.basis=adj', 'prior.1.date=2024-07-01', 'prior.1.fvc_pct=76', 'prior.1.dlco_pct=60'));
  const txt = r.impression.join(' ');
  ok(/one domain only|same physiologic domain/.test(txt) && !/progressive pulmonary fibrosis is (present|established)/i.test(txt), 'FVC and DLCO thresholds reported as one domain, never as PPF', txt);
  // anemia_adjustment_unknown
  r = run(mk(['dlco'], 'dlco.dlco=mod', 'dlco.hb=9'));
  ok(r.F['observations.dlco.hb_unknown'] === true && r.F['observations.dlco.anemia'] === undefined, 'unknown basis: no automatic anemia attribution');
  ok(/not described as corrected or uncorrected|not stated/.test(r.impression.join(' ')), 'unknown basis stated');
  r = run(mk(['dlco'], 'dlco.dlco=mod', 'dlco.hb=9', 'dlco.basis=un', 'ctx.sex=M'));
  ok(r.F['observations.dlco.anemia'] === true, 'unadjusted basis with documented anemia: contribution stated');
  // room_air_not_tested
  r = run(mk(['sixmw'], 'sixmw.o2=o2', 'sixmw.o2_flow=2', 'sixmw.spo2_base=96', 'sixmw.spo2_nadir=94'));
  ok(/does not establish room-air oxygenation/.test(r.impression.join(' ')), 'no desaturation on oxygen does not assert room-air oxygenation');
  // early_termination_high_ratio
  r = run(mk(['spiro'], 'spiro.ratio=z0.5', 'spiro.fev1=wnl', 'spiro.fvc=mild', 'spiro.limits=early'));
  ok(r.F['observations.quality.early_termination'] === true, 'early termination observed');
  ok(eligibleIds(r).indexOf('pattern.normal') < 0 && eligibleIds(r).indexOf('pattern.nonspecific') < 0 && eligibleIds(r).indexOf('pattern.low_fvc_unconfirmed') < 0, 'no pattern conclusion with an underestimated FVC');
  ok(/cannot be reliably classified/.test(r.impression.join(' ')), 'indeterminate stated');
  r = run(mk(['spiro'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=mild', 'spiro.limits=early'));
  ok(r.F['patterns.obstruction'] === true, 'a low ratio despite early termination is still obstruction');
})();

console.log('catalog fixtures: ' + pass + ' passed, ' + fail + ' failed');
failures.forEach(x => console.log('  FAIL ' + x));
process.exit(fail ? 1 : 0);
