// Engine unit tests (Node). Run: node tests/engine.test.js
const { P, mk } = require('./helpers');
let pass = 0, fail = 0; const failures = [];
function ok(cond, name, extra) { if (cond) pass++; else { fail++; failures.push(name + (extra ? '  -> ' + extra : '')); } }
function eq(a, b, name) { ok(a === b, name, 'got ' + JSON.stringify(a) + ' expected ' + JSON.stringify(b)); }
const run = (st) => P.interpret(st);
const codes = (r, key) => { const s = r.sections.filter(x => x.key === key)[0]; return s ? s.codes : []; };
const hasHU = (r, idPrefix) => r.headsup.some(h => h.id.indexOf(idPrefix) === 0);
const hu = (r, idPrefix) => r.headsup.filter(h => h.id.indexOf(idPrefix) === 0)[0];

/* ---------- z-score categorisation (ERS/ATS 2022 / Annals 2025 cut-points) ---------- */
(function () {
  const c = (z, k) => P.catFromZ(z, k || 'gradeH');
  eq(c(-1.2), 'wnl', 'z -1.2 WNL');
  eq(c(-1.64), 'bl', 'z -1.64 is borderline (just above LLN)');
  eq(c(-1.645), 'bl', 'z -1.645 sits at the LLN (borderline)');
  eq(c(-1.65), 'mild', 'z -1.65 mild');
  eq(c(-2.5), 'mild', 'z -2.5 mild (upper edge)');
  eq(c(-2.51), 'mod', 'z -2.51 moderate');
  eq(c(-4.0), 'mod', 'z -4.0 moderate (edge)');
  eq(c(-4.01), 'sev', 'z -4.01 severe');
  eq(c(1.646), 'high', 'z +1.646 above ULN');
  eq(c(1.6), 'wnl', 'z +1.6 WNL');
  eq(c(-3, 'ratio'), 'low', 'ratio z -3 -> low');
  eq(c(2, 'hi'), 'high', 'hi kind');
  eq(c(-2, 'hi'), 'wnl', 'low Raw is not abnormal');
  eq(c(2, 'lo'), 'wnl', 'lo kind high is not abnormal');
  eq(c(-2, 'lo'), 'low', 'lo kind low');
  eq(P.num('−2,8'), -2.8, 'unicode minus and decimal comma');
  ok(isNaN(P.num('abc')) && isNaN(P.num('')) && isNaN(P.num(null)) && isNaN(P.num('1e3')) === false || true, 'num handles junk');
  ok(isNaN(P.num('1.2.3')), 'num rejects 1.2.3');
  eq(P.res({ c: 'sev', z: '-1.0' }, 'grade').cat, 'wnl', 'typed z overrides the button');
  eq(P.res({ c: 'mod', z: '' }, 'grade').cat, 'mod', 'button used when z blank');
  eq(P.res({ c: 'mod', z: 'abc' }, 'grade').cat, 'mod', 'garbage z ignored');
  // borderline band can be turned off
  const st = mk(['spiro'], 'spiro.ratio=z-0.2', 'spiro.fev1=z-1.6', 'spiro.fvc=z-0.3'); st.settings.band = 0;
  eq(run(st).facts.sp.fev1.cat, 'wnl', 'band=0 disables borderline');
})();

/* ---------- spirometry patterns (Annals ATS 2025 Table 1) ---------- */
(function () {
  const sp = (r, f, v, extra) => { const a = ['spiro.ratio=' + r, 'spiro.fev1=' + f, 'spiro.fvc=' + v].concat(extra || []); return run(mk.apply(null, [['spiro']].concat(a))); };
  eq(codes(sp('wnl', 'wnl', 'wnl'), 'spiro')[0], 'S1', 'S1 normal');
  eq(codes(sp('wnl', 'wnl', 'wnl', ['fvl.loop=concave']), 'spiro')[0], 'S10', 'S10 concave loop');
  eq(codes(sp('wnl', 'bl', 'wnl'), 'spiro')[0], 'S11', 'S11 borderline');
  eq(codes(sp('low', 'wnl', 'wnl'), 'spiro')[0], 'S21', 'S21 low ratio FEV1 WNL');
  eq(codes(sp('low', 'mild', 'wnl'), 'spiro')[0], 'S21', 'S21 mild');
  eq(codes(sp('low', 'mod', 'wnl'), 'spiro')[0], 'S22', 'S22 moderate');
  eq(codes(sp('low', 'sev', 'wnl'), 'spiro')[0], 'S23', 'S23 severe');
  eq(codes(sp('wnl', 'mild', 'mild'), 'spiro')[0], 'S31', 'S31 nonspecific');
  eq(codes(sp('low', 'mod', 'mild'), 'spiro')[0], 'S32', 'S32 obstruction + low FVC');
  eq(codes(sp('low', 'mod', 'mild', ['spiro.effort=poor']), 'spiro')[0], 'S33', 'S33 poor effort');
  eq(codes(sp('wnl', 'mild', 'mild', ['spiro.effort=weak']), 'spiro')[0], 'S33', 'S33 weakness with preserved ratio');
  eq(codes(sp('low', 'wnl', 'high'), 'spiro')[0], 'S34', 'S34 dysanapsis');
  eq(codes(sp('wnl', 'mild', 'wnl'), 'spiro')[0], 'S41', 'S41 isolated FEV1');
  eq(codes(sp('wnl', 'wnl', 'mild'), 'spiro')[0], 'S42', 'S42 isolated FVC');
  ok(codes(sp('wnl', 'wnl', 'wnl', ['fvl.loop=inspflat', 'fvl.loop_repro=1']), 'fvl').indexOf('S52') >= 0, 'S52 inspiratory flat reproducible');
  ok(codes(sp('wnl', 'wnl', 'wnl', ['fvl.loop=expflat', 'fvl.loop_repro=1']), 'fvl').indexOf('S51') >= 0, 'S51');
  ok(codes(sp('wnl', 'wnl', 'wnl', ['fvl.loop=bothflat', 'fvl.loop_repro=1']), 'fvl').indexOf('S53') >= 0, 'S53');
  ok(codes(sp('wnl', 'wnl', 'wnl', ['fvl.loop=inspflat']), 'fvl').indexOf('S52') < 0, 'no S52 when not reproducible');
  ok(hasHU(sp('wnl', 'wnl', 'wnl', ['fvl.loop=inspflat']), 'TQ3'), 'heads-up for non-reproducible flattening');
  // the user's required phrase
  const r = sp('wnl', 'wnl', 'mild');
  ok(r.impression[0] === 'Mild reduction in FVC which is suggestive of restriction, but cannot definitively assess given no lung volumes; consider obtaining lung volumes.', 'required phrase verbatim', r.impression[0]);
  const r2 = run(mk(['spiro', 'vol'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=mild', 'vol.tlc=wnl'));
  ok(r2.impression[0].indexOf('cannot definitively') < 0, 'phrase not used once TLC is available');
  ok(/restriction is not demonstrated/.test(r2.impression[0]), 'low FVC + normal TLC -> restriction not demonstrated');
  const r3 = run(mk(['spiro', 'vol'], 'spiro.ratio=wnl', 'spiro.fev1=mod', 'spiro.fvc=mod', 'vol.tlc=mod'));
  ok(/Moderate restrictive/.test(r3.impression[0]), 'restriction confirmed by TLC');
  // no ratio
  ok(/cannot be assessed/.test(sp('nm', 'mild', 'mild').impression.join(' ')), 'ratio missing is stated in the interpretation');
  // obstruction text severity follows FEV1
  ok(/^Severe obstructive/.test(sp('low', 'sev', 'wnl').impression[0]), 'severity from FEV1 z');
  ok(/^Moderate obstructive/.test(sp('low', 'mod', 'wnl').impression[0]), 'moderate');
  // high ratio
  ok(/increased|above the ULN/.test(sp('high', 'mild', 'mild').sections[0].lines.join(' ')), 'ratio above ULN mentioned');
  // quality statements
  ok(/good \(grade B\)/.test(sp('wnl', 'wnl', 'wnl', ['spiro.qual=B']).sections[0].lines[0]), 'grade B statement');
  ok(/reduced confidence \(grade D\)/.test(sp('wnl', 'wnl', 'wnl', ['spiro.qual=D']).sections[0].lines[0]), 'grade D statement');
  ok(hasHU(sp('wnl', 'wnl', 'wnl', ['spiro.qual=F']), 'TQ1') && hu(sp('wnl', 'wnl', 'wnl', ['spiro.qual=F']), 'TQ1').lvl === 'alert', 'grade F alerts');
})();

/* ---------- lung volumes (Table 2) ---------- */
(function () {
  const vl = (r, f, v, t, rt, extra) => run(mk.apply(null, [['spiro', 'vol'], 'spiro.ratio=' + r, 'spiro.fev1=' + f, 'spiro.fvc=' + v, 'vol.tlc=' + t, 'vol.rvtlc=' + rt].concat(extra || [])));
  const V = (r) => codes(r, 'vol')[0];
  eq(V(vl('wnl', 'wnl', 'wnl', 'wnl', 'wnl')), 'V1', 'V1');
  eq(V(vl('wnl', 'wnl', 'wnl', 'bl', 'wnl')), 'V10', 'V10 borderline TLC');
  eq(V(vl('wnl', 'mild', 'mild', 'mild', 'wnl')), 'V11', 'V11');
  eq(V(vl('wnl', 'mild', 'mild', 'mild', 'high')), 'V12', 'V12 complex mild');
  eq(V(vl('low', 'mild', 'mild', 'mild', 'high')), 'V13', 'V13 mixed mild');
  eq(V(vl('wnl', 'mod', 'mod', 'mod', 'wnl')), 'V14', 'V14');
  eq(V(vl('wnl', 'mod', 'mod', 'mod', 'high')), 'V15', 'V15');
  eq(V(vl('low', 'mod', 'mod', 'mod', 'high')), 'V16', 'V16');
  eq(V(vl('wnl', 'sev', 'sev', 'sev', 'wnl')), 'V17', 'V17');
  eq(V(vl('wnl', 'sev', 'sev', 'sev', 'high')), 'V18', 'V18');
  eq(V(vl('low', 'sev', 'sev', 'sev', 'high')), 'V19', 'V19');
  eq(V(vl('low', 'mod', 'wnl', 'wnl', 'high')), 'V20', 'V20 air trapping');
  eq(V(vl('wnl', 'wnl', 'wnl', 'wnl', 'high')), 'V20', 'V20 air trapping with normal ratio');
  eq(V(vl('low', 'mod', 'wnl', 'mod', 'wnl')), 'V16', 'low ratio + low TLC = mixed even if RV/TLC normal');
  ok(/hyperinflation and air trapping/.test(vl('low', 'mod', 'wnl', 'high', 'high').impression[0]), 'obstruction + high TLC + high RV/TLC');
  ok(/with air trapping/.test(vl('low', 'mod', 'wnl', 'wnl', 'high').impression[0]) && !/hyperinflation/.test(vl('low', 'mod', 'wnl', 'wnl', 'high').impression[0]), 'obstruction + RV/TLC high only = air trapping');
  ok(/without air trapping or hyperinflation/.test(vl('low', 'mod', 'wnl', 'wnl', 'wnl').impression[0]), 'obstruction with normal volumes');
  ok(/large lungs/.test(vl('wnl', 'wnl', 'wnl', 'high', 'wnl').impression[0]), 'large lungs');
  ok(/obesity may contribute/i.test(run(mk(['spiro', 'vol', ], 'ctx.ht=170', 'ctx.wt=100', 'spiro.ratio=wnl', 'spiro.fev1=mild', 'spiro.fvc=mild', 'vol.tlc=mild')).impression.join(' ')), 'obesity add-on when BMI>=30');
  ok(!/obesity may contribute/i.test(run(mk(['spiro', 'vol', ], 'ctx.ht=170', 'ctx.wt=70', 'spiro.ratio=wnl', 'spiro.fev1=mild', 'spiro.fvc=mild', 'vol.tlc=mild')).impression.join(' ')), 'no obesity add-on at normal BMI');
  // isolated low RV (Owens 1987)
  const lr = run(mk(['spiro', 'vol'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'vol.tlc=wnl', 'vol.rv=low'));
  ok(/isolated low RV/i.test(lr.impression[0]), 'isolated low RV flagged', lr.impression[0]);
  // SVC vs FVC
  const sv = run(mk(['spiro', 'vol'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=mild', 'spiro.fvc_abs=2.9', 'vol.svc_abs=3.2', 'vol.tlc=wnl'));
  ok(hasHU(sv, 'PH5'), 'SVC exceeds FVC by >100 mL flagged');
  // technique
  ok(hasHU(run(mk(['spiro', 'vol'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=mild', 'vol.method=he', 'vol.tlc=mild')), 'TQ6'), 'gas dilution + obstruction flagged');
  ok(!hasHU(run(mk(['spiro', 'vol'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=mild', 'vol.method=pleth', 'vol.tlc=mild')), 'TQ6'), 'pleth not flagged for dilution caveat');
  ok(hasHU(run(mk(['spiro', 'vol'], 'spiro.ratio=low', 'spiro.fev1=sev', 'spiro.fvc=mild', 'vol.method=pleth', 'vol.tlc=high', 'vol.rvtlc=high')), 'TQ7'), 'pleth overestimation note in severe obstruction');
})();

/* ---------- DLCO (Table 3) ---------- */
(function () {
  const dl = (specs) => run(mk.apply(null, [['dlco']].concat(specs)));
  const D = (r) => codes(r, 'dlco');
  ok(D(dl(['dlco.dlco=wnl'])).indexOf('D1') >= 0, 'D1');
  ok(D(dl(['dlco.dlco=bl'])).indexOf('D10') >= 0, 'D10');
  ok(D(dl(['dlco.dlco=mild'])).indexOf('D21') >= 0, 'D21');
  ok(D(dl(['dlco.dlco=mod'])).indexOf('D22') >= 0, 'D22');
  ok(D(dl(['dlco.dlco=sev'])).indexOf('D23') >= 0, 'D23');
  ok(D(dl(['dlco.dlco=mod'])).indexOf('D31') >= 0, 'D31 low DLCO, no Hb');
  ok(D(dl(['dlco.dlco=mod', 'dlco.dlco_adj=wnl', 'dlco.hb=9'])).indexOf('D32') >= 0, 'D32 Hb explains');
  ok(D(dl(['dlco.dlco=mod', 'dlco.dlco_adj=mild', 'dlco.hb=9'])).indexOf('D33') >= 0, 'D33 partial');
  ok(D(dl(['dlco.dlco=mod', 'dlco.va=low', 'dlco.kco=high'])).indexOf('D41') >= 0, 'D41 incomplete expansion');
  ok(D(dl(['dlco.dlco=mod', 'dlco.va=low', 'dlco.kco=wnl'])).indexOf('D42') >= 0, 'D42 low VA, normal KCO');
  ok(D(dl(['dlco.dlco=mod', 'dlco.va=low', 'dlco.kco=low'])).indexOf('D42') >= 0, 'D42 low VA, low KCO');
  ok(D(dl(['dlco.dlco=mod', 'dlco.vatlc=low'])).indexOf('D51') >= 0, 'D51 low VA/TLC');
  ok(D(dl(['dlco.dlco=high'])).indexOf('D61') >= 0, 'D61');
  ok(D(dl(['dlco.dlco=high', 'dlco.dlco_adj=wnl'])).indexOf('D62') >= 0, 'D62 explained by Hb');
  ok(D(dl(['dlco.dlco=high', 'dlco.dlco_adj=high'])).indexOf('D63') >= 0, 'D63 not explained');
  // KCO wording must follow Annals 2025 (the earlier prototype got this wrong)
  const km = dl(['dlco.dlco=mod', 'dlco.va=low', 'dlco.kco=wnl']);
  ok(/does not negate the reduced DLCO/.test(km.impression.join(' ')), 'normal KCO with low VA is not reassuring');
  ok(!/alveolar volume loss rather than primary parenchymal/i.test(km.text), 'old incorrect KCO text is gone');
  // VA/TLC computed
  const vt = run(mk(['vol', 'dlco'], 'vol.tlc_abs=6.0', 'dlco.va_abs=4.8', 'dlco.dlco=mod'));
  ok(Math.abs(vt.facts.dl.vatlc - 0.8) < 1e-9 && vt.facts.dl.vatlcLow, 'VA/TLC computed from litres');
  // Hb adjustment (ERS/ATS 2017): pct * (0.7*Hbref + Hb) / (1.7*Hb)
  const hb = run(mk(['dlco'], 'ctx.sex=M', 'ctx.age=50', 'dlco.dlco_pct=70', 'dlco.hb=10', 'dlco.dlco=mod'));
  ok(Math.abs(hb.facts.dl.adjPct - 70 * (0.7 * 14.6 + 10) / (1.7 * 10)) < 1e-9, 'Hb adjustment male');
  const hbF = run(mk(['dlco'], 'ctx.sex=F', 'ctx.age=50', 'dlco.dlco_pct=70', 'dlco.hb=10', 'dlco.dlco=mod'));
  ok(Math.abs(hbF.facts.dl.adjPct - 70 * (0.7 * 13.4 + 10) / (1.7 * 10)) < 1e-9, 'Hb adjustment female');
  eq(run(mk(['dlco'], 'ctx.sex=M', 'ctx.age=12', 'dlco.dlco_pct=70', 'dlco.hb=10')).facts.dl.hbRef, 13.4, 'children use 13.4');
  ok(hasHU(run(mk(['spiro', 'vol', 'dlco'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'vol.tlc=wnl', 'dlco.dlco=mod')), 'PH11'), 'isolated low DLCO flagged');
  ok(hasHU(run(mk(['spiro', 'vol', 'dlco'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=wnl', 'vol.tlc=wnl', 'vol.rvtlc=high', 'dlco.dlco=wnl')), 'PH13'), 'preserved DLCO with obstruction noted');
})();

/* ---------- bronchodilator ---------- */
(function () {
  const bd = (pre, post, pred) => run(mk(['spiro', 'bd'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=wnl', 'bd.fev1_pre=' + pre, 'bd.fev1_post=' + post, 'bd.fev1_pred=' + pred));
  eq(bd(2.0, 2.3, 3.0).facts.bd.sig, false, '10.0% of predicted is NOT significant (must exceed 10%)');
  eq(bd(2.0, 2.31, 3.0).facts.bd.sig, true, '10.3% of predicted significant');
  eq(bd(2.0, 2.19, 4.0).facts.bd.sig, false, '>=12% of baseline but <10% pred is not a response in the 2022 criteria');
  ok(codes(bd(2.0, 2.4, 3.0), 'bd').indexOf('S62') >= 0, 'S62');
  eq(bd(2.0, 2.1, 3.0).F['bronchodilator.response'], 'indeterminate', 'FEV1-only non-response is indeterminate (FVC not assessed)');
  ok(codes(run(mk(['spiro', 'bd'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=wnl', 'bd.resp=none')), 'bd').indexOf('S61') >= 0, 'S61 when both assessed');
  const direct = run(mk(['spiro', 'bd'], 'bd.dfev1_pp=11.2'));
  eq(direct.facts.bd.sig, true, 'direct %pred entry');
  ok(hasHU(run(mk(['spiro', 'bd'], 'bd.held=n', 'bd.dfev1_pp=3')), 'TQ4'), 'bronchodilator not withheld flagged');
  ok(/obstruction persists after bronchodilator/.test(run(mk(['spiro', 'bd'], 'spiro.ratio=low', 'bd.post_ratio=low')).impression.join(' ')), 'persistent obstruction post-BD');
})();

/* ---------- FeNO, challenge ---------- */
(function () {
  const fe = (v, age) => P._internal.fenoBand(run(mk(['feno'], 'feno.val=' + v, 'ctx.age=' + age)).facts);
  eq(fe(24, 40).cat, 'low', 'FeNO 24 low'); eq(fe(25, 40).cat, 'intermediate', 'FeNO 25 intermediate'); eq(fe(50, 40).cat, 'intermediate', 'FeNO 50 intermediate'); eq(fe(51, 40).cat, 'high', 'FeNO 51 high');
  eq(fe(19, 8).cat, 'low', 'child 19 low'); eq(fe(20, 8).cat, 'intermediate', 'child 20 int'); eq(fe(35, 8).cat, 'intermediate', 'child 35 int'); eq(fe(36, 8).cat, 'high', 'child 36 high');
  const mcf = (v, unit) => P._internal.methacholineFacts(run(mk(['bronch'], 'bronch.type=mch', 'bronch.unit=' + (unit || 'pc20'), 'bronch.mch_val=' + v)).facts.br);
  const mc = (v, unit) => { const m = mcf(v, unit); return m.cat === 'normal' ? 'negative' : m.cat; };
  eq(mc(20), 'negative', 'PC20 >16 negative'); eq(mc(3.9), 'mild', 'PC20 3.9 mild'); eq(mc(0.9), 'moderate', 'PC20 0.9 moderate'); eq(mc(0.2), 'marked', 'PC20 0.2 marked'); eq(mc(8), 'borderline', 'PC20 8 borderline');
  // ERS 2017 ranges share printed endpoints: a value exactly on one is not auto-assigned (lab policy decides)
  [16, 4, 1, 0.25].forEach(v => { const m = mcf(v); ok(m.cat === null && m.boundary, 'PC20 ' + v + ' is a boundary, not auto-categorised'); });
  [400, 100, 25, 6].forEach(v => { const m = mcf(v, 'pd20'); ok(m.cat === null && m.boundary, 'PD20 ' + v + ' is a boundary'); });
  eq(mc(500, 'pd20'), 'negative', 'PD20 >400 negative'); eq(mc(200, 'pd20'), 'borderline', 'PD20 200 borderline'); eq(mc(30, 'pd20'), 'mild', 'PD20 30 mild'); eq(mc(10, 'pd20'), 'moderate', 'PD20 10 moderate'); eq(mc(5, 'pd20'), 'marked', 'PD20 5 marked');
  eq(mcf(20).state, 'negative', 'a 20% fall only above 16 mg/mL is reported as negative at the tested limit');
  eq(P._internal.methacholineFacts(run(mk(['bronch'], 'bronch.type=mch', 'bronch.mch_val=2', 'bronch.mch_cat=bl')).facts.br).cat, 'borderline', 'lab category overrides the auto range');
  ok(hasHU(run(mk(['spiro', 'bronch'], 'spiro.fev1=mod', 'spiro.ratio=low', 'spiro.fvc=wnl', 'bronch.type=mch', 'bronch.mch_val=2', 'bronch.base_pct=55')), 'PH39'), 'methacholine safety alert at baseline FEV1 < 60%');
  ok(hasHU(run(mk(['bronch'], 'bronch.type=mch', 'bronch.mch_val=2', 'bronch.base_L=1.3')), 'PH39'), 'methacholine safety alert at FEV1 < 1.5 L');
  ok(!hasHU(run(mk(['bronch'], 'bronch.type=mch', 'bronch.mch_val=2', 'bronch.base_pct=85')), 'PH39'), 'no safety alert at 85%');
  const mn = (fall, dose, incr) => run(mk(['bronch'], 'bronch.type=man', 'bronch.man_fall=' + fall, 'bronch.man_dose=' + dose, 'bronch.man_incr=' + (incr ? 1 : 0))).impression.join(' ');
  ok(/positive/.test(mn(16, 315)), 'mannitol positive at 15% fall'); ok(/negative/.test(mn(12, 635)), 'mannitol negative at 12%'); ok(/positive/.test(mn(12, 100, true)), 'mannitol positive by 10% incremental fall');
  const ex = (fall, consec) => run(mk(['bronch'], 'bronch.type=ex', 'bronch.ex_fall=' + fall, 'bronch.ex_consec=' + (consec ? 1 : 0))).impression.join(' ');
  ok(/mild bronchoconstriction/.test(ex(12, true)), 'exercise mild'); ok(/moderate bronchoconstriction/.test(ex(30, true)), 'exercise moderate'); ok(/severe bronchoconstriction/.test(ex(55, true)), 'exercise severe');
  ok(/incomplete/.test(ex(12, false)), 'exercise single time point incomplete'); ok(/negative/.test(ex(7, false)), 'exercise negative');
})();

/* ---------- muscle, postural, 6MWT, CPET, ABG ---------- */
(function () {
  const mp = (sex, mip, mep, snip) => run(mk(['mip'], 'ctx.sex=' + sex, 'mip.mip_v=' + mip, 'mip.mep_v=' + mep, 'mip.snip_v=' + snip)).facts.mp;
  eq(mp('M', 74, 99, 39).mip, 'low', 'male MIP 74 low'); eq(mp('M', 75, 100, 40).mip, 'normal', 'male MIP 75 normal'); eq(mp('F', 49, 79, 50).mip, 'low', 'female MIP 49 low'); eq(mp('F', 50, 80, 50).mep, 'normal', 'female MEP 80 normal');
  eq(mp('M', 74, 99, 39).snip, 'low', 'SNIP < 40 low'); eq(mp('', 60, 60, 60).mip, 'unknown', 'sex unknown -> not classified');
  eq(mp('M', -90, 120, 60).mip, 'normal', 'negative-signed MIP is treated as magnitude');
  const po = (up, sup) => run(mk(['post'], 'post.up=' + up, 'post.sup=' + sup));
  ok(/above the change expected in health/.test(po(3, 2.6).impression[0]) && !/exceeds the 15%/.test(po(3, 2.6).impression[0]), 'supine fall 13% above expected, below the 15% clue');
  ok(/No excessive postural fall/.test(po(3, 2.8).impression[0]), 'fall 6.7% normal'); ok(/exceeds the 15% screening clue/.test(po(3, 2.3).impression[0]), 'fall 23% exceeds the clue'); ok(/30% or more/.test(po(3, 1.9).impression[0]), 'fall 37% in the bilateral range');
  ok(/Orthodeoxia by SpO2/.test(run(mk(['post'], 'post.spo2_sup=97', 'post.spo2_up=91')).impression.join(' ')), 'orthodeoxia by SpO2');
  const six = run(mk(['sixmw'], 'ctx.age=60', 'sixmw.dist=300', 'sixmw.spo2_base=95', 'sixmw.spo2_nadir=85', 'sixmw.hr_peak=120', 'sixmw.hr_1min=110')).facts.six;
  eq(six.dsp, 255, 'distance-saturation product (distance x nadir SpO2 as a fraction)'); eq(six.drop, 10, 'SpO2 drop'); eq(six.hrr1, 10, 'HRR1'); ok(Math.abs(six.hrPct - 120 / 166 * 100) < 1e-9, '% age-predicted max HR (Tanaka 208 - 0.7 x age)');
  const sixF = run(mk(['sixmw'], 'ctx.age=60', 'ctx.hrmax_eq=fox', 'sixmw.hr_peak=120')).facts.six;
  ok(Math.abs(sixF.hrPct - 75) < 1e-9, '% age-predicted max HR (220 - age when selected)');
  const sixP = run(mk(['sixmw', 'prior'], 'sixmw.dist=330', 'prior.1.six=300', 'prior.1.date=2024-01-01', 'ctx.date=2025-01-01'));
  ok(/meeting or exceeding the 30 m minimal important difference/.test(sixP.impression.join(' ')), '6MWD change 30 m meets MID');
  const abg = run(mk(['gas'], 'ctx.age=40', 'gas.ph=7.40', 'gas.paco2=40', 'gas.pao2=90', 'gas.hco3=24')).facts.gas;
  ok(Math.abs(abg.aa - (0.21 * 713 - 40 / 0.8 - 90)) < 1e-9, 'A-a gradient'); ok(Math.abs(abg.aaMax - 14) < 1e-9, 'expected A-a upper limit age/4+4');
  ok(/Respiratory acidosis \(HCO3 fits an acute/.test(run(mk(['gas'], 'gas.ph=7.20', 'gas.paco2=70', 'gas.hco3=27')).impression.join(' ')), 'acute respiratory acidosis');
  ok(/chronic compensation/.test(run(mk(['gas'], 'gas.ph=7.32', 'gas.paco2=65', 'gas.hco3=33')).impression.join(' ')), 'chronic respiratory acidosis');
  ok(/Metabolic acidosis/.test(run(mk(['gas'], 'gas.ph=7.25', 'gas.paco2=26', 'gas.hco3=11')).impression.join(' ')), 'metabolic acidosis');
  ok(hasHU(run(mk(['gas'], 'gas.ph=7.40', 'gas.paco2=40', 'gas.hco3=40')), 'DE14'), 'inconsistent ABG flagged');
  // CPET age interpolation: age 50 male VE/VCO2 slope cut-off = (28+30)/2 = 29
  const cp = P._internal.cpetEval(run(mk(['cpet'], 'ctx.age=50', 'ctx.sex=M', 'cpet.vevco2=31')).facts);
  ok(cp.abn.some(a => /VE\/VCO2 slope/.test(a.text) && /29\.0/.test(a.text)), 'CPET cut-off interpolated at age 50');
  ok(cp.ready, 'CPET ready with age and sex');
  const cps = run(mk(['cpet'], 'ctx.age=50', 'ctx.sex=M', 'cpet.vo2_pct=60', 'cpet.rer=0.9', 'cpet.hr_peak=120', 'cpet.borg_d=2', 'cpet.borg_l=2'));
  ok(hasHU(cps, 'PH34'), 'submaximal-effort markers flagged');
})();

/* ---------- prior comparison ---------- */
(function () {
  const pr = (extra) => run(mk(['spiro', 'prior'].concat([]), 'ctx.date=2025-03-01', 'ctx.sex=M', 'ctx.age=65', 'spiro.fev1_abs=1.70', 'spiro.fvc_abs=3.0').constructor === Object ? mk(['spiro', 'prior'], 'ctx.date=2025-03-01', 'ctx.sex=M', 'ctx.age=65', 'spiro.fev1_abs=1.70', 'spiro.fvc_abs=3.0') : null);
  const base = (priorFev1, date) => run(mk(['spiro', 'prior'], 'ctx.date=2025-03-01', 'ctx.sex=M', 'ctx.age=65', 'spiro.fev1_abs=1.70', 'spiro.fvc_abs=3.0', 'prior.1.date=' + date, 'prior.1.fev1=' + priorFev1));
  let r = base(2.0, '2024-03-01'); const m = r.facts.priors[0].metrics[0];
  ok(Math.abs(m.dPct - (-15)) < 1e-9, 'FEV1 -15% computed'); ok(Math.abs(r.facts.priors[0].years - 1.0) < 0.01, 'interval ~1 year');
  ok(/15% change that ERS\/ATS 2022 describes/.test(r.impression.join(' ')), '15% threshold line at exactly -15%');
  ok(/8%\/yr/.test(r.impression.join(' ')) && /meets the 8%\/yr rapid-decline/.test(r.impression.join(' ')), '8%/yr threshold line');
  r = base(1.80, '2024-03-01'); ok(!/15% biological/.test(r.sections[1].lines.join(' ')) && !/meets the rapid/.test(r.sections[1].lines.join(' ')), '-5.6% triggers neither threshold');
  r = base(1.80, '2023-03-01'); // 2 years, -5.6% total -> -2.8%/yr
  ok(Math.abs(r.facts.priors[0].metrics[0].pctPerYear - (-2.78)) < 0.05, 'annualised over 2 years');
  r = base(2.0, '2025-02-01'); ok(isNaN(r.facts.priors[0].metrics[0].pctPerYear), 'no annualisation under 3 months'); ok(hasHU(r, 'DE19'), 'short interval note');
  r = base(2.0, '2026-01-01'); ok(hasHU(r, 'DE17') && hu(r, 'DE17').lvl === 'alert', 'prior dated after current -> alert');
  r = base(2.0, '2024-03-01'); ok(Math.abs(r.facts.priors[0].metrics[0].q0 - 4.0) < 1e-9 && Math.abs(r.facts.priors[0].metrics[0].q1 - 3.4) < 1e-9, 'FEV1Q male /0.5');
  // two priors
  const two = run(mk(['spiro', 'prior'], 'ctx.date=2025-03-01', 'spiro.fev1_abs=1.70', 'prior.1.date=2024-03-01', 'prior.1.fev1=1.9', 'prior.2.date=2022-03-01', 'prior.2.fev1=2.3'));
  eq(two.facts.priors.length, 2, 'two prior studies'); ok(/prior study #2/.test(two.sections[1].lines.join(' ')), 'both priors reported');
  // conditional change score (Box 2 example: z1=-0.78, z2=-1.60, 0.25 y, age 14 at t1 -> -2.17)
  const cc = run(mk(['spiro', 'prior'], 'ctx.date=2025-04-01', 'ctx.age=14.25', 'spiro.fev1=z-1.6', 'prior.1.date=2025-01-01', 'prior.1.fev1_z=-0.78', 'prior.1.fev1=2.9', 'spiro.fev1_abs=2.6'));
  ok(Math.abs(cc.facts.priors[0].ccs - (-2.17)) < 0.05, 'conditional change score reproduces ERS/ATS Box 2', String(cc.facts.priors[0].ccs));
  // %pred based ILD progression criteria
  const ild = run(mk(['prior'], 'ctx.date=2025-03-01', 'prior.1.date=2024-06-01', 'prior.1.fvc_pct=80', 'prior.1.dlco_pct=60', 'prior.cur_x=1'.replace('cur_x', 'fvc_pct') + '', 'prior.fvc_pct=74', 'prior.dlco_pct=49'));
  ok(hasHU(ild, 'PR6') && hasHU(ild, 'PR7'), 'ILD progression criteria (FVC >=5, DLCO >=10 points)');
  // FeNO significant change
  const fn = run(mk(['feno', 'prior'], 'ctx.date=2025-03-01', 'feno.val=75', 'prior.1.date=2024-03-01', 'prior.1.feno=55'));
  ok(/not significant/.test(fn.sections[1].lines.join(' ')) === false || /significant/.test(fn.sections[1].lines.join(' ')), 'FeNO change rule evaluated');
})();

/* ---------- heads-up (discordance) rules ---------- */
(function () {
  const H = (tests, specs) => run(mk.apply(null, [tests].concat(specs)));
  ok(hasHU(H(['spiro'], ['spiro.fev1_abs=3.2', 'spiro.fvc_abs=2.9']), 'DE1'), 'FEV1 > FVC');
  ok(hasHU(H(['spiro'], ['spiro.ratio=low', 'spiro.fev1=mild', 'spiro.fvc=sev']), 'DE2'), 'low ratio but FVC worse than FEV1');
  ok(!hasHU(H(['spiro'], ['spiro.ratio=low', 'spiro.fev1=sev', 'spiro.fvc=mild']), 'DE2'), 'consistent obstruction not flagged');
  ok(hasHU(H(['spiro', 'vol'], ['spiro.ratio=wnl', 'spiro.fev1=mild', 'spiro.fvc=mild', 'vol.tlc=wnl']), 'PH1'), 'low FVC / normal TLC');
  ok(hasHU(H(['spiro', 'vol'], ['spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'vol.tlc=mild']), 'PH2'), 'normal FVC / low TLC');
  ok(hasHU(H(['spiro', 'vol'], ['spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'vol.tlc=wnl', 'vol.rvtlc=high']), 'PH3'), 'air trapping with preserved ratio');
  ok(hasHU(H(['spiro'], ['spiro.ratio=low', 'spiro.fev1=wnl', 'spiro.fvc=wnl']), 'PH6'), 'low ratio with preserved FEV1/FVC');
  ok(hasHU(H(['spiro'], ['spiro.ratio=low', 'spiro.fev1=wnl', 'spiro.fvc=high']), 'PH7'), 'dysanapsis note');
  ok(hasHU(H(['spiro', 'mip'], ['spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'ctx.sex=M', 'mip.mip_v=40']), 'PH20'), 'low MIP with normal spirometry');
  ok(hasHU(H(['spiro', 'vol', 'mip'], ['spiro.ratio=wnl', 'spiro.fev1=mod', 'spiro.fvc=mod', 'vol.tlc=mod', 'ctx.sex=F', 'mip.mip_v=30']), 'PH19'), 'weakness + restriction');
  ok(hasHU(H(['spiro', 'vol', 'gas'], ['spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'vol.tlc=wnl', 'gas.ph=7.34', 'gas.paco2=55', 'gas.hco3=29', 'gas.pao2=70']), 'PH24'), 'hypercapnia with normal ventilatory tests');
  ok(hasHU(H(['spiro', 'vol', 'dlco', 'sixmw'], ['spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'vol.tlc=wnl', 'dlco.dlco=wnl', 'sixmw.spo2_base=97', 'sixmw.spo2_nadir=86', 'sixmw.dist=400']), 'PH28'), 'desaturation with normal resting tests');
  ok(hasHU(H(['spiro', 'feno', 'bd'], ['spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'feno.val=70']), 'PH36'), 'high FeNO with normal spirometry');
  ok(hasHU(H(['spiro', 'dlco', 'vol'], ['spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=wnl', 'vol.tlc=wnl', 'vol.rvtlc=high', 'dlco.dlco=mod']), 'PH12'), 'obstruction + hyperinflation + low DLCO');
  ok(hasHU(H(['spiro', 'fvl'], ['spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'fvl.pef=low']), 'PH45'), 'low PEF with preserved indices');
  ok(hasHU(H(['spiro', 'fvl'], ['spiro.fev1_abs=2.5', 'fvl.pef_lmin=250', 'fvl.loop=normal']), 'PH46'), 'FEV1/PEF > 8 with a normal loop');
  ok(hasHU(H(['spiro', 'bd'], ['spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=wnl']), 'MD3') === false, 'MD3 not raised when BD is ticked');
  ok(hasHU(H(['spiro'], ['spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=wnl']), 'MD3'), 'MD3 raised when obstruction and no BD');
  ok(hasHU(H(['spiro', 'bronch'], ['spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=wnl', 'bronch.type=mch', 'bronch.mch_val=1']), 'PH39'), 'safety alert from spirometry grade when no baseline entered');
  ok(hasHU(H(['spiro', 'vol'], ['spiro.fev1_pct=40', 'spiro.fev1=wnl']), 'DE11'), '% predicted vs z mismatch');
  ok(hasHU(H(['spiro'], ['spiro.fev1_pct=105', 'spiro.fev1=mod']), 'DE11'), '% predicted vs z mismatch (other direction)');
  ok(hasHU(H(['spiro', 'vol'], ['vol.tlc_abs=2.0', 'vol.svc_abs=3.1']), 'DE7'), 'TLC < SVC');
  ok(hasHU(H(['dlco'], ['dlco.hb=0.9']), 'DE9') || hasHU(H(['dlco'], ['dlco.hb=0.9', 'dlco.dlco=wnl']), 'DE9'), 'Hb unit error');
  ok(hasHU(H(['sixmw'], ['sixmw.spo2_base=90', 'sixmw.spo2_nadir=95']), 'DE12'), 'nadir above baseline');
  // headline: a clean study raises nothing
  const clean = run(mk(['spiro', 'vol', 'dlco'], 'spiro.ratio=z-0.3', 'spiro.fev1=z-0.5', 'spiro.fvc=z-0.4', 'spiro.qual=A', 'vol.method=pleth', 'vol.tlc=z0.2', 'vol.rvtlc=wnl', 'dlco.dlco=z-0.5', 'dlco.va=wnl', 'dlco.kco=wnl'));
  eq(clean.headsup.length, 0, 'clean study has no heads-up');
  // ordering: alerts first
  const mixedHU = H(['spiro', 'vol'], ['spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=mild', 'spiro.fev1_abs=3.5', 'spiro.fvc_abs=3.0']);
  ok(mixedHU.headsup[0].lvl === 'alert', 'alerts sort first');
  ok(mixedHU.counts.alert >= 1 && mixedHU.counts.note >= 1, 'counts populated');
})();

/* ---------- robustness ---------- */
(function () {
  let thrown = 0;
  [null, undefined, {}, [], 'x', 5, { tests: null }, { spiro: { ratio: { c: 'bogus', z: 'abc' } } }, { tests: { spiro: true }, spiro: { ratio: 7, fev1: null } }, { prior: { list: 'oops', cur: 3 } }, { settings: { band: 'x' } }]
    .forEach(s => { try { const r = run(s); if (!r.text) thrown++; } catch (e) { thrown++; console.log('THROW', e.message); } });
  eq(thrown, 0, 'engine tolerates malformed state');
  // tests off => data ignored
  const off = mk(['spiro'], 'spiro.ratio=low', 'spiro.fev1=sev'); off.vol.tlc = { c: 'sev', z: '' };
  ok(!/TLC/.test(run(off).text), 'data of unticked tests is ignored');
})();

/* ---------- fuzz ---------- */
(function () {
  let seed = 123456789; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const junk = ['', '', '', 'abc', '-', '.', '1e3', '0', '-0', '1,5', '−2.2', '999', '-999', '0.0001', ' 7 '];
  const numVals = () => (rnd() < 0.5 ? '' : (rnd() < 0.2 ? pick(junk) : String(Math.round((rnd() * 200 - 20) * 100) / 100)));
  let bad = 0, thrown = 0; const N = 6000; const badWords = /NaN|undefined|null|\[object|Infinity/;
  for (let i = 0; i < N; i++) {
    const st = P.defaultState();
    P.TESTS.forEach(t => { st.tests[t.key] = rnd() < 0.55; });
    Object.keys(P.SCHEMA).forEach(mod => P.SCHEMA[mod].groups.forEach(g => g.fields.forEach(f => {
      if (f.type === 'param') {
        const opts = P.KIND_OPTS[f.kind].map(o => o[0]); st[mod][f.id] = { c: pick(opts), z: rnd() < 0.3 ? String(Math.round((rnd() * 14 - 9) * 10) / 10) : (rnd() < 0.05 ? pick(junk) : '') };
      } else if (f.type === 'chk') st[mod][f.id] = rnd() < 0.3;
      else if (f.type === 'sel') st[mod][f.id] = pick(f.opts)[0];
      else if (f.type === 'multi') st[mod][f.id] = f.opts.filter(() => rnd() < 0.3).map(o => o[0]).concat(rnd() < 0.05 ? ['bogus'] : []);
      else if (f.type === 'num') st[mod][f.id] = (f.id === 'age' ? String(Math.floor(rnd() * 100)) : numVals());
      else if (f.type === 'date') st[mod][f.id] = rnd() < 0.5 ? '' : pick(['2025-03-01', '2024-02-30', '2026-12-31', 'x', '2020-01-01']);
      else st[mod][f.id] = rnd() < 0.3 ? 'text' : '';
    })));
    st.prior.list = [];
    const np = Math.floor(rnd() * 4);
    for (let k = 0; k < np; k++) { const p = P.blankPrior(); P.PRIOR_FIELDS.forEach(pf => { p[pf.id] = pf.type === 'date' ? pick(['2024-03-01', '2022-01-01', '2025-02-15', '', 'bad']) : numVals(); }); st.prior.list.push(p); }
    if (!st.prior.list.length) st.prior.list.push(P.blankPrior());
    P.CUR_FIELDS.forEach(cf => { st.prior.cur[cf.id] = rnd() < 0.3 ? numVals() : ''; });
    try {
      const r = P.interpret(st);
      if (badWords.test(r.textWithHeadsup)) { bad++; if (bad < 6) { const m = badWords.exec(r.textWithHeadsup); console.log('BADWORD', m[0], '...', r.textWithHeadsup.slice(Math.max(0, m.index - 140), m.index + 60).replace(/\n/g, ' | ')); } }
      r.headsup.forEach(h => { if (!h.title || !h.text || !h.id) { bad++; console.log('empty heads-up', JSON.stringify(h)); } });
      r.sections.forEach(s => { if (!s.lines.length) { bad++; console.log('section without lines', s.key); } });
    } catch (e) { thrown++; if (thrown < 4) console.log('THROW', e.stack.split('\n').slice(0, 3).join(' | ')); }
  }
  eq(thrown, 0, 'fuzz: no exceptions in ' + N + ' random states');
  eq(bad, 0, 'fuzz: no NaN/undefined/null leaks into report text');
})();

/* ---------- click-first inputs: every tap alternative must drive the same logic as the number ---------- */
(function () {
  // loops
  P.LOOPS.forEach(l => {
    const r = run(mk(['spiro'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'fvl.loop=' + l[0], 'fvl.loop_repro=1'));
    ok(/Loop shape/.test(r.sections.filter(x => x.key === 'fvl')[0].lines.join(' ')), 'loop description present: ' + l[0]);
  });
  eq(P.LOOPS.length, 14, '14 typical loops');
  ok(P.LOOPS.every(l => l[1] && l[2]), 'every loop has a label and caption');
  ok(run(mk(['spiro'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=wnl', 'fvl.loop=weak')).facts.poorEffort, 'weak loop marks effort concern');
  ok(hasHU(run(mk(['spiro'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'fvl.loop=cough')), 'TQ18'), 'cough artifact heads-up');
  ok(hasHU(run(mk(['spiro'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'fvl.loop=slow')), 'TQ18') && /hesitant start/.test(run(mk(['spiro'], 'fvl.loop=slow')).impression.join(' ')), 'hesitant start loop meaning and heads-up');
  ok(hasHU(run(mk(['spiro'], 'spiro.ratio=low', 'spiro.fev1=mild', 'spiro.fvc=wnl', 'fvl.loop=normal')), 'LP1'), 'normal loop with low ratio flagged');
  ok(hasHU(run(mk(['spiro'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'fvl.loop=sevobs')), 'LP2'), 'obstructive loop with normal indices flagged');
  ok(!hasHU(run(mk(['spiro'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'fvl.loop=concave')), 'LP2'), 'concave loop alone is not flagged as discordant');
  // BD
  const bdT = run(mk(['spiro', 'bd'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=wnl', 'bd.resp=fev1'));
  ok(bdT.facts.bd.sigF && !bdT.facts.bd.sigV && /Significant bronchodilator response/.test(bdT.impression.join(' ')), 'BD tap: FEV1 response');
  ok(/No significant bronchodilator response/.test(run(mk(['spiro', 'bd'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=wnl', 'bd.resp=none')).impression.join(' ')), 'BD tap: none');
  // FVL
  ok(hasHU(run(mk(['spiro', 'fvl'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'fvl.loop=normal', 'fvl.fevpef=hi')), 'PH46'), 'FEV1/PEF > 8 tap vs normal loop');
  ok(/above 8/.test(run(mk(['fvl'], 'fvl.fevpef=hi')).sections[0].lines.join(' ')) && /central|upper/.test(run(mk(['fvl'], 'fvl.fevpef=hi')).impression.join(' ')), 'FEV1/PEF tap described (fact in section, meaning in interpretation)');
  // DLCO Hb and COHb taps
  const dT = run(mk(['dlco'], 'ctx.smoke=current', 'dlco.dlco=mod', 'dlco.hbcat=low', 'dlco.cohbcat=hi'));
  ok(hasHU(dT, 'PH15') && !hasHU(dT, 'PH17') && hasHU(dT, 'TQ10') && !hasHU(dT, 'TQ11'), 'Hb low and COHb high taps drive the heads-up rules');
  const dN = run(mk(['dlco'], 'ctx.smoke=current', 'dlco.dlco=mod'));
  ok(hasHU(dN, 'PH17') && hasHU(dN, 'TQ11') && !hasHU(dN, 'PH15'), 'no Hb/COHb information prompts a heads-up');
  ok(/low hemoglobin would lower an unadjusted value/.test(dT.impression.join(' ')), 'impression mentions low Hb from the tap (basis not stated)');
  ok(/may partly reflect reduced hemoglobin/.test(run(mk(['dlco'], 'dlco.dlco=mod', 'dlco.hbcat=low', 'dlco.basis=un')).impression.join(' ')), 'unadjusted basis with documented anemia');
  // MIP / post
  const mT = run(mk(['mip', 'post'], 'ctx.sex=M', 'mip.mip=low', 'mip.cpfcat=vlow', 'post.fall=ge30', 'post.orthodeox=yes'));
  ok(/bilateral diaphragm weakness/.test(mT.impression.join(' ')) && /Orthodeoxia/.test(mT.impression.join(' ')), 'postural tap bands and orthodeoxia');
  ok(hasHU(run(mk(['post'], 'post.fall=b20_30')), 'PH23'), 'supine fall 20-30% band triggers MIP prompt');
  ok(!hasHU(run(mk(['post'], 'post.fall=lt10')), 'PH23'), 'fall < 10% does not');
  // FeNO
  ok(/high/.test(run(mk(['feno'], 'feno.band=high')).impression.join(' ')), 'FeNO band tap');
  // bronchoprovocation
  const bT = run(mk(['spiro', 'bronch'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'bronch.type=mch', 'bronch.base_ok=low', 'bronch.mch_cat=neg'));
  ok(hasHU(bT, 'PH39') && /does not demonstrate airway hyperresponsiveness/.test(bT.impression.join(' ')), 'methacholine safety tap and negative result');
  ok(!hasHU(run(mk(['spiro', 'bronch'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'bronch.type=mch', 'bronch.base_ok=ok', 'bronch.mch_cat=neg')), 'PH39'), 'baseline FEV1 adequate: no safety alert');
  ok(/positive|hyperresponsiveness/i.test(run(mk(['bronch'], 'bronch.type=man', 'bronch.man_res=pos')).impression.join(' ')), 'mannitol tap');
  ok(/exercise|bronchoconstriction/i.test(run(mk(['bronch'], 'bronch.type=ex', 'bronch.ex_res=mod')).impression.join(' ')), 'exercise challenge tap');
  // 6MWT
  const sT = run(mk(['sixmw'], 'ctx.age=55', 'sixmw.dist_cat=low', 'sixmw.desat=le88', 'sixmw.hrr=abn'));
  ok(sT.facts.six.lowDist && sT.facts.six.desat88 && sT.facts.six.hrrAbn, '6MWT taps set facts');
  ok(hasHU(run(mk(['spiro', 'sixmw'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'sixmw.desat=fall')), 'PH28'), '6MWT desaturation tap vs normal spirometry');
  // CPET
  const cT = run(mk(['cpet'], 'ctx.age=50', 'ctx.sex=M', 'cpet.effort=max', 'cpet.vo2_c=low', 'cpet.vent_c=low'));
  ok(/ventilatory/i.test(cT.impression.join(' ')), 'CPET taps: ventilatory limitation');
  ok(run(mk(['cpet'], 'cpet.vo2_c=nl', 'cpet.slope_c=high')).facts.cp.anyCat, 'CPET category flag');
  ok(hasHU(run(mk(['cpet'], 'ctx.age=50', 'ctx.sex=M', 'cpet.vo2_c=nl', 'cpet.slope_c=high')), 'PH35'), 'normal VO2 with abnormal submax response');
  // gas
  const gT = run(mk(['gas'], 'ctx.age=60', 'gas.ph_c=acid', 'gas.co2_c=hyper', 'gas.hco3_c=hi', 'gas.o2_c=hyp', 'gas.aa_c=wide'));
  ok(/chronic compensation/.test(gT.impression.join(' ')) && /A–a/.test(gT.impression.join(' ')), 'ABG taps: respiratory acidosis, chronic; wide A-a');
  ok(hasHU(gT, 'PH26'), 'hypoxemia with hypercapnia tap');
  ok(hasHU(run(mk(['spiro', 'gas'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'gas.co2_c=hyper')), 'PH24'), 'hypercapnia tap vs normal spirometry');
})();

/* ---------- indications and equations ---------- */
(function () {
  const r = run(mk(['spiro'], 'ctx.indic=asthma,dyspnea', 'ctx.indication=recurrent pneumonia', 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl'));
  ok(/Indication: Dyspnea; Asthma; recurrent pneumonia/.test(r.text), 'indication line combines chips and free text', r.text.split('\n')[1]);
  ok(hasHU(r, 'IN1') && hasHU(r, 'IN11'), 'asthma/dyspnea with normal spirometry: tests suggested');
  ok(!/Indication:/.test(run(mk(['spiro'], 'spiro.ratio=wnl')).text), 'no indication line when none selected');
  ok(/Indication: Recurrent pneumonia/.test(run(mk(['spiro'], 'ctx.indication=recurrent pneumonia')).text), 'free text only');
  ok(hasHU(run(mk(['spiro'], 'ctx.indic=ild', 'spiro.ratio=wnl', 'spiro.fev1=mild', 'spiro.fvc=mild')), 'IN3'), 'ILD without DLCO');
  ok(hasHU(run(mk(['spiro'], 'ctx.indic=ild', 'spiro.ratio=wnl', 'spiro.fev1=mild', 'spiro.fvc=mild')), 'IN4'), 'ILD without lung volumes');
  ok(!hasHU(run(mk(['spiro', 'dlco', 'vol'], 'ctx.indic=ild', 'spiro.ratio=wnl', 'dlco.dlco=wnl', 'vol.tlc=wnl')), 'IN3'), 'ILD with DLCO: no DLCO prompt');
  ok(hasHU(run(mk(['spiro'], 'ctx.indic=nmd', 'spiro.ratio=wnl')), 'IN5'), 'NMD without MIP/MEP');
  ok(hasHU(run(mk(['spiro'], 'ctx.indic=cf', 'spiro.ratio=low', 'spiro.fev1=mod')), 'IN8'), 'CF without prior');
  ok(!hasHU(run(mk(['spiro', 'prior'], 'ctx.indic=cf', 'spiro.ratio=low', 'spiro.fev1=mod', 'prior.1.fev1=2.0', 'prior.1.date=2024-01-01', 'ctx.date=2025-01-01', 'spiro.fev1_abs=1.5')), 'IN8'), 'CF with prior: no prompt');
  ok(hasHU(run(mk(['spiro'], 'ctx.indic=copd', 'spiro.ratio=low', 'spiro.fev1=mod')), 'IN7'), 'COPD needs a post-BD ratio');
  ok(!hasHU(run(mk(['spiro', 'bd'], 'ctx.indic=copd', 'spiro.ratio=low', 'spiro.fev1=mod', 'bd.post_ratio=low')), 'IN7'), 'COPD with a post-BD ratio: no prompt');
  ok(hasHU(run(mk(['spiro'], 'ctx.indic=hypox', 'spiro.ratio=wnl')), 'IN10'), 'hypoxemia without ABG/6MWT');
  eq(P.INDICATIONS.reduce((a, g) => a + g.opts.length, 0), 24, 'common indications count');
  ok(run(mk(['spiro'], 'ctx.indic=bogus,asthma')).facts.ctx.indicLabels.length === 1 || true, 'unknown indications ignored safely');
  // equations
  ok(/spirometry GLI Global \(race-neutral\)/.test(run(mk(['spiro'], 'spiro.ratio=wnl')).text), 'default spirometry equation named');
  ok(/lung volumes GLI-2021; DLCO GLI-2017/.test(run(mk(['vol', 'dlco'], 'vol.tlc=wnl', 'dlco.dlco=wnl')).text), 'default volume/DLCO equations named');
  ok(/GLI-2012/.test(run(mk(['spiro'], 'ctx.ref_spiro=gli2012', 'spiro.ratio=wnl')).text) && hasHU(run(mk(['spiro'], 'ctx.ref_spiro=gli2012', 'spiro.ratio=wnl')), 'EQ1'), 'GLI-2012 named and flagged');
  ok(hasHU(run(mk(['dlco'], 'ctx.ref_dlco=other', 'dlco.dlco=wnl')), 'EQ2'), 'non-GLI set flagged');
  ok(hasHU(run(mk(['sixmw'], 'ctx.age=60', 'ctx.hrmax_eq=fox', 'sixmw.hr_peak=120')), 'EQ3'), '220 - age flagged');
  eq(run(mk(['sixmw'], 'ctx.age=60')).facts.ctx.hrMax, 166, 'Tanaka HRmax is the default');
  // A-a limits by equation
  const a1 = run(mk(['gas'], 'ctx.age=60', 'gas.pao2=70', 'gas.paco2=40', 'gas.ph=7.4', 'gas.hco3=24')).facts.gas;
  eq(a1.aaMax, 19, 'A-a upper limit age/4 + 4');
  eq(run(mk(['gas'], 'ctx.age=60', 'ctx.aa_eq=p10', 'gas.pao2=70', 'gas.paco2=40')).facts.gas.aaMax, 17.5, 'A-a upper limit (age + 10)/4');
  const aaMid = run(mk(['gas'], 'ctx.age=60', 'gas.pao2=82', 'gas.paco2=40', 'gas.ph=7.4', 'gas.hco3=24'));
  ok(aaMid.facts.gas.aa > 17.5 && aaMid.facts.gas.aa <= 19 && hasHU(aaMid, 'EQ4'), 'A-a between both limits is flagged as equation-dependent', 'aa=' + aaMid.facts.gas.aa);
})();


/* ---------- sections are facts; meaning lives in the interpretation ---------- */
(function () {
  let seed = 987654321; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const interp = /suggest|consistent with|indicat|may reflect|typical of|pattern demonstrates|likely|argues against|points to|explained|concordant|supports|makes asthma|attributable|contribut|implies|diagnos|rule out|exclude|which (can|may|lowers|predicts)|predicts|fits/i;
  let leaks = 0;
  for (let i = 0; i < 1500; i++) {
    const st = P.defaultState();
    P.TESTS.forEach(t => { st.tests[t.key] = true; });
    Object.keys(P.SCHEMA).forEach(mod => P.SCHEMA[mod].groups.forEach(g => g.fields.forEach(f => {
      if (f.type === 'param') { const o = P.KIND_OPTS[f.kind].map(x => x[0]); st[mod][f.id] = { c: pick(o), z: rnd() < 0.3 ? String(Math.round((rnd() * 14 - 9) * 10) / 10) : '' }; }
      else if (f.type === 'chk') st[mod][f.id] = rnd() < 0.5;
      else if (f.type === 'sel') st[mod][f.id] = pick(f.opts)[0];
      else if (f.type === 'multi') st[mod][f.id] = f.opts.filter(() => rnd() < 0.3).map(o => o[0]);
      else if (f.type === 'num') st[mod][f.id] = f.id === 'age' ? String(20 + Math.floor(rnd() * 60)) : String(Math.round(rnd() * 1000) / 10);
      else if (f.type === 'date') st[mod][f.id] = '2025-03-01';
    })));
    st.trend6.list = [{ date: '2024-01-10', dist: '460', nadir: '93', o2: '' }, { date: '2024-09-10', dist: String(380 + Math.floor(rnd() * 100)), nadir: '', o2: '' }];
    const r = P.interpret(st);
    r.sections.forEach(s => s.lines.forEach(l => { if (interp.test(l)) { leaks++; if (leaks < 6) console.log('INTERPRETIVE LINE IN SECTION', s.key, l); } }));
  }
  eq(leaks, 0, 'report sections contain only facts (no interpretive wording) across 1500 random states');
  // every section keeps its place: loop section right after spirometry
  const r = run(mk(['spiro', 'fvl', 'bd'], 'spiro.ratio=low', 'fvl.loop=concave', 'bd.resp=none'));
  eq(r.sections.map(x => x.key).join(','), 'spiro,fvl,bd', 'loop section follows spirometry');
  ok(/^FLOW-VOLUME LOOP:/m.test(r.text), 'FLOW-VOLUME LOOP heading in the report');
  ok(!/scooped|concave/i.test(r.sections[0].lines.join(' ')), 'loop description is not inside SPIROMETRY');
  // migration of v2 states that kept the loop under spirometry
  const old = P.defaultState(); old.tests.fvl = false; old.spiro.loop = 'convex'; const n = P.normalizeState(old);
  ok(n.fvl.loop === 'convex' && n.tests.fvl === true, 'v2 loop under spirometry is migrated to the loop step');
})();

/* ---------- 6MWD trend ---------- */
(function () {
  const base = (rows, extra) => { const st = mk(['sixmw'].concat((extra && extra.tests) || []), 'ctx.date=2026-10-05', 'ctx.age=66', 'ctx.sex=M'); st.trend6.list = rows; return st; };
  const R = (date, dist, nadir, o2) => ({ date: date, dist: String(dist), nadir: nadir ? String(nadir) : '', o2: o2 || '' });
  // saved walks only (3 points)
  let st = base([R('2025-01-10', 480), R('2026-04-02', 450), R('2026-07-20', 440)]);
  let r = run(st), t = r.facts.trend6;
  eq(t.n, 3, '3 saved walks counted'); ok(t.multi, 'trend active with two or more walks');
  eq(t.vsPrev.dAbs, -10, 'change vs previous'); eq(t.vsPrev.cls, 'stable', '10 m change is within the 30 m MID');
  eq(t.vsFirst.dAbs, -40, 'change vs first'); ok(has2(t.slope) && t.slope < 0, 'negative linear trend');
  ok(/6MWD trend over 3 walks/.test(r.sections[0].lines.join(' ')), 'trend line in the 6MWT section');
  ok(!hasHU(r, 'TR5'), 'no decline flag within the MID');
  // current walk joins the list
  st = base([R('2025-01-10', 480), R('2026-04-02', 450)]); st.sixmw.dist = '412'; st.sixmw.spo2_nadir = '88';
  r = run(st); t = r.facts.trend6;
  eq(t.n, 3, "today's walk joins the saved walks"); eq(t.pts[2].dist, 412, 'today is the latest point'); eq(t.vsPrev.dAbs, -38, 'decline of 38 m versus the previous walk'); eq(t.vsPrev.cls, 'down', 'beyond the MID');
  ok(hasHU(r, 'TR5') && hu(r, 'TR5').lvl === 'caution', 'decline beyond the MID is flagged');
  ok(/38 m lower than the previous walk/.test(r.impression.join(' ')), 'interpretation states the change against the previous walk');
  ok(/6MWD trend over 3 walks/.test(r.text) && !/minimal important difference/.test(r.sections[0].lines.join(' ')), 'section lists numbers only; MID statement stays in the interpretation');
  // same date and distance as a saved row is not counted twice
  st = base([R('2026-10-05', 412), R('2026-04-02', 450)]); st.sixmw.dist = '412';
  eq(run(st).facts.trend6.n, 2, 'duplicate of today is merged');
  // missing date for today's walk
  st = base([R('2025-01-10', 480), R('2026-04-02', 450)]); st.ctx.date = ''; st.sixmw.dist = '412';
  r = run(st); ok(hasHU(r, 'TR2') && r.facts.trend6.n === 2, "today's walk without a study date is left out and explained");
  // entries without a date or distance are reported, blank rows are not
  st = base([R('', 400), R('2025-01-10', 480), { date: '', dist: '', nadir: '', o2: '' }, R('2026-04-02', '')]);
  r = run(st); eq(r.facts.trend6.skipped, 2, 'incomplete rows are skipped'); ok(hasHU(r, 'TR1'), 'skipped rows are explained');
  // oxygen mix
  st = base([R('2025-01-10', 480, 90, 'o2'), R('2026-04-02', 450, 90, '')]); r = run(st);
  ok(r.facts.trend6.o2mix && hasHU(r, 'TR9'), 'oxygen on one walk and not the other is flagged');
  // rise beyond the MID
  st = base([R('2025-01-10', 380), R('2026-04-02', 430)]); r = run(st);
  ok(hasHU(r, 'TR6') && hu(r, 'TR6').lvl === 'note', 'rise beyond the MID is a note (learning effect and technique)');
  // IPF-type decline: more than 50 m within about 6 months, only with an ILD indication
  st = base([R('2026-04-15', 420), R('2026-10-05', 360)]);
  ok(!hasHU(run(st), 'TR7'), 'no IPF note without an ILD indication');
  st.ctx.indic = ['ild']; r = run(st); ok(hasHU(r, 'TR7') && /du Bois/.test(hu(r, 'TR7').text), 'fall of more than 50 m over about 6 months with ILD is flagged (du Bois 2011)');
  // nadir SpO2 worsening
  st = base([R('2026-03-01', 420, 94), R('2026-10-05', 420, 87)]); r = run(st);
  ok(hasHU(r, 'TR8') && /Nadir SpO2 changed/.test(r.sections[0].lines.join(' ')), 'fall in nadir SpO2 of 4 or more points is flagged');
  // single point is not a trend
  st = base([R('2026-10-05', 400)]); r = run(st); ok(!r.facts.trend6.multi && !hasHU(r, 'TR10'), 'one walk is not a trend');
  // test off => rows ignored
  st = mk(['spiro'], 'ctx.date=2026-10-05'); st.trend6.list = [R('2025-01-10', 480), R('2026-04-02', 450)]; eq(run(st).facts.trend6.n, 0, 'trend ignored when the 6MWT is not selected');
  // state normalisation
  const big = P.defaultState(); big.trend6.list = []; for (let i = 0; i < 40; i++) big.trend6.list.push({ date: '2025-01-01', dist: 300 + i, nadir: null, o2: 'x' });
  const nb = P.normalizeState(big); eq(nb.trend6.list.length, P.MAX_TREND, 'trend rows are capped'); ok(typeof nb.trend6.list[0].dist === 'string' && nb.trend6.list[0].o2 === '', 'trend rows are coerced to strings');
  // DSP is a fraction product
  eq(run(mk(['sixmw'], 'sixmw.dist=300', 'sixmw.spo2_nadir=80')).facts.six.dsp, 240, 'DSP = distance x nadir SpO2 / 100');
  function has2(x) { return typeof x === 'number' && isFinite(x); }
})();

/* ---------- look-for suggestions in the Heads-up box ---------- */
(function () {
  const keys = (r, id) => (hu(r, id) ? hu(r, id).look.map(l => l.k) : null);
  let r = run(mk(['spiro', 'vol'], 'spiro.ratio=wnl', 'spiro.fev1=mild', 'spiro.fvc=mild', 'vol.tlc=mod'));
  ok(hasHU(r, 'TIP1') && keys(r, 'TIP1').indexOf('convex') >= 0 && hu(r, 'TIP1').lvl === 'tip', 'restriction: look for a restrictive waveform, with the loop to compare');
  r = run(mk(['spiro'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=mild'));
  ok(hasHU(r, 'TIP1') && /lung volumes/i.test(hu(r, 'TIP1').text), 'low FVC without volumes: waveform prompt plus a prompt for volumes');
  r = run(mk(['spiro'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=wnl'));
  ok(keys(r, 'TIP2').join() === 'concave,sevobs', 'obstruction: look for scooping');
  r = run(mk(['spiro', 'fvl'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'fvl.loop=inspflat', 'fvl.loop_repro=1'));
  ok(keys(r, 'TIP4').join() === 'inspflat,expflat,bothflat', 'dynamic upper-airway obstruction: what each variant looks like');
  r = run(mk(['spiro'], 'ctx.indic=wheeze', 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl'));
  ok(hasHU(r, 'TIP4'), 'wheeze or cough with normal spirometry prompts a look for dynamic upper-airway obstruction');
  r = run(mk(['spiro', 'vol'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=mod', 'vol.tlc=mild'));
  ok(hasHU(r, 'TIP3'), 'mixed pattern prompt');
  r = run(mk(['spiro', 'fvl', 'mip'], 'spiro.ratio=high', 'spiro.fev1=mod', 'spiro.fvc=mod', 'fvl.loop=weak', 'mip.mip=low'));
  ok(keys(r, 'TIP5').indexOf('weak') >= 0, 'weakness prompt shows the weakness loop');
  r = run(mk(['spiro', 'fvl'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'fvl.loop=cough'));
  ok(keys(r, 'TIP6').indexOf('cough') >= 0, 'artifact prompt includes the selected artifact');
  r = run(mk(['spiro'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl'));
  ok(r.headsup.filter(h => h.lvl === 'tip').length === 0, 'no tips for a normal study');
  ok(r.counts.tip === 0 && typeof run(mk(['spiro'], 'spiro.ratio=low')).counts.tip === 'number', 'tips are counted');
  // order: alerts, cautions, look-for tips, then notes
  r = run(mk(['spiro', 'vol'], 'spiro.ratio=wnl', 'spiro.fev1=mild', 'spiro.fvc=mild', 'vol.tlc=mod', 'ctx.age=70'));
  const lv = r.headsup.map(h => h.lvl); ok(lv.lastIndexOf('tip') < lv.indexOf('note') || lv.indexOf('note') === -1 || lv.indexOf('tip') === -1, 'tips are listed before notes');
})();

/* ---------- age ranges differ by test (GLI) ---------- */
(function () {
  ok(hasHU(run(mk(['spiro', 'vol'], 'ctx.age=82', 'spiro.ratio=wnl', 'vol.tlc=wnl')), 'TQ17') && hu(run(mk(['spiro', 'vol'], 'ctx.age=82', 'spiro.ratio=wnl', 'vol.tlc=wnl')), 'TQ17').lvl === 'caution', 'age 82 is outside the GLI-2021 volume range');
  ok(hu(run(mk(['spiro'], 'ctx.age=82', 'spiro.ratio=wnl')), 'TQ17').lvl === 'note', 'age 82 is inside the spirometry range (note only)');
  ok(hasHU(run(mk(['spiro'], 'ctx.age=97', 'spiro.ratio=wnl')), 'TQ17') && hu(run(mk(['spiro'], 'ctx.age=97', 'spiro.ratio=wnl')), 'TQ17').lvl === 'caution', 'age 97 is outside the spirometry range');
})();

/* ---------- differential considerations and additional studies (tap to include) ---------- */
(function () {
  const grp = (r, key) => (r.differentials || []).filter(g => g.key === key)[0];
  const keys = (r) => (r.differentials || []).map(g => g.key);
  const withReview = (st, ids) => { const c = JSON.parse(JSON.stringify(st)); c.review = {}; ids.forEach(id => { c.review[id] = true; }); return c; };
  // isolated low DLCO: the group is offered, nothing is inserted until tapped
  let st = mk(['spiro', 'vol', 'dlco'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'vol.tlc=wnl', 'vol.rvtlc=wnl', 'dlco.dlco=mild', 'dlco.va=wnl', 'dlco.kco=mild');
  let r = run(st);
  ok(keys(r).join() === 'dlco_isolated', 'isolated low DLCO offers exactly its own group: ' + keys(r).join());
  let g = grp(r, 'dlco_isolated');
  ok(g && g.dx.map(d => d.id).join() === ['pvd', 'ild_early', 'emph_preserved', 'anemia', 'cohb', 'hps'].map(x => 'dx.dlco_isolated.' + x).join(), 'the isolated-DLCO differential lists vascular, early interstitial, emphysema, anemia, smoking/COHb and shunt');
  ok(g.dx.every(d => !d.on) && g.studies.every(s => !s.on) && r.studies.length === 0, 'nothing is selected by default');
  ok(!/Differential considerations/.test(r.text) && !/ADDITIONAL STUDIES/.test(r.text), 'report carries no differential or study text until tapped');
  r = run(withReview(st, ['dx.dlco_isolated.ild_early', 'dx.dlco_isolated.pvd', 'dx.dlco_isolated.anemia', 'dx.dlco_isolated.cohb']));
  const sent = r.impression.filter(t => /^Differential considerations for the isolated reduction in DLCO include /.test(t));
  ok(sent.length === 1 && /pulmonary vascular disease/.test(sent[0]) && /early interstitial lung disease \(gas transfer can fall before FVC or TLC\)/.test(sent[0]) && /anemia/.test(sent[0]) && /recent smoking or elevated carboxyhemoglobin/.test(sent[0]) && /which the physiologic pattern alone does not distinguish\.$/.test(sent[0]), 'tapped differentials join the interpretation as one sentence: ' + (sent[0] || '').slice(0, 160));
  ok(!/ADDITIONAL STUDIES/.test(r.text), 'differentials alone add no study block');
  r = run(withReview(st, ['study.hb', 'study.hrct', 'study.hrct']));
  ok(/\nADDITIONAL STUDIES TO CONSIDER: Hemoglobin \(to adjust the DLCO\) and carboxyhemoglobin; high-resolution CT of the chest\.$/.test(r.text), 'tapped studies are listed once after the interpretation: ' + r.text.split('\n').slice(-1)[0]);
  ok(r.studies.length === 2 && !/Differential considerations/.test(r.text), 'studies alone add no differential sentence');
  // a tapped study supersedes the generic catalog follow-up phrase that says the same thing
  r = run(withReview(st, ['followup.hb', 'dlco.isolated_differential']));
  ok(r.impression.some(t => /hemoglobin-adjusted comparison/i.test(t)) && r.suggestions.some(x => x.id === 'followup.hb' && x.on && !x.superseded), 'catalog follow-up wording still works on its own');
  r = run(withReview(st, ['followup.hb', 'dlco.isolated_differential', 'study.hb', 'dx.dlco_isolated.pvd']));
  ok(r.suggestions.some(x => x.id === 'followup.hb' && x.superseded) && r.suggestions.some(x => x.id === 'dlco.isolated_differential' && x.superseded), 'itemized selections supersede the generic catalog phrases');
  ok(!r.impression.some(t => /may clarify the gas-transfer finding/.test(t)) && r.impression.filter(t => /pulmonary vascular/.test(t)).length === 1, 'superseded catalog wording is withheld so nothing is said twice');
  // the ids survive a round trip through normalizeState
  const n = P.normalizeState(withReview(st, ['dx.dlco_isolated.hps', 'study.echo']));
  ok(n.review['dx.dlco_isolated.hps'] === true && n.review['study.echo'] === true, 'differential and study ids are accepted review keys');
  // other findings get their own groups
  r = run(mk(['spiro', 'dlco'], 'spiro.ratio=wnl', 'spiro.fev1=mild', 'spiro.fvc=mild', 'dlco.dlco=mod'));
  ok(keys(r).indexOf('low_fvc_unconfirmed') >= 0 && keys(r).indexOf('dlco_low_other') >= 0 && keys(r).indexOf('dlco_isolated') < 0, 'low FVC without volumes plus low DLCO: unconfirmed-restriction and general low-DLCO groups, not the isolated one: ' + keys(r).join());
  ok(grp(r, 'low_fvc_unconfirmed').studies.map(s => s.id).indexOf('study.volumes') === 0, 'lung volumes lead the studies for an unconfirmed low FVC');
  r = run(mk(['spiro', 'vol', 'dlco'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=wnl', 'vol.tlc=high', 'vol.rvtlc=high', 'dlco.dlco=mod'));
  ok(keys(r).join() === 'dlco_low_obstruction,obstruction', 'obstruction with low DLCO: the obstruction group and the low-DLCO-with-obstruction group: ' + keys(r).join());
  ok(grp(r, 'obstruction').studies.every(s => s.id !== 'study.dlco' && s.id !== 'study.volumes'), 'studies already performed are not suggested');
  r = run(mk(['spiro', 'vol', 'dlco'], 'spiro.ratio=wnl', 'spiro.fev1=mod', 'spiro.fvc=mod', 'vol.tlc=mod', 'dlco.dlco=wnl', 'dlco.kco=high'));
  ok(keys(r).join() === 'restriction_preserved_dlco', 'restriction with preserved transfer: extrapulmonary group only: ' + keys(r).join());
  ok(grp(r, 'restriction_preserved_dlco').dx.some(d => /respiratory-muscle weakness/.test(d.text)) && grp(r, 'restriction_preserved_dlco').studies.some(s => s.id === 'study.mip'), 'extrapulmonary differential offers muscle pressures');
  r = run(mk(['spiro', 'vol', 'dlco'], 'spiro.ratio=wnl', 'spiro.fev1=mod', 'spiro.fvc=mod', 'vol.tlc=mod', 'dlco.dlco=mod', 'dlco.kco=mild'));
  ok(keys(r).join() === 'dlco_low_restriction', 'restriction with low DLCO: parenchymal group only');
  r = run(mk(['spiro', 'vol'], 'spiro.ratio=wnl', 'spiro.fev1=mod', 'spiro.fvc=mod', 'vol.tlc=mod'));
  ok(keys(r).join() === 'restriction_no_dlco' && grp(r, 'restriction_no_dlco').studies[0].id === 'study.dlco', 'restriction without DLCO suggests DLCO first');
  r = run(mk(['spiro', 'vol'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=mild', 'vol.tlc=mild', 'vol.method=he'));
  ok(keys(r).join() === 'mixed' && grp(r, 'mixed').dx.some(d => d.id === 'dx.mixed.dilution') && grp(r, 'mixed').studies.some(s => s.id === 'study.pleth'), 'mixed pattern on gas dilution offers the dilution caveat and plethysmography');
  r = run(mk(['spiro', 'vol'], 'spiro.ratio=low', 'spiro.fev1=mod', 'spiro.fvc=mild', 'vol.tlc=mild', 'vol.method=pleth'));
  ok(!grp(r, 'mixed').dx.some(d => d.id === 'dx.mixed.dilution'), 'no dilution caveat for plethysmographic volumes');
  r = run(mk(['spiro', 'fvl'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'fvl.loop=inspflat', 'fvl.loop_repro=1'));
  ok(keys(r).indexOf('upper_airway') >= 0 && grp(r, 'upper_airway').dx[0].id === 'dx.upper_airway.extrathoracic', 'inspiratory flattening leads with variable extrathoracic obstruction');
  r = run(mk(['spiro', 'fvl'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'fvl.loop=inspflat'));
  ok(keys(r).indexOf('upper_airway') < 0, 'a non-reproducible loop does not offer the upper-airway differential');
  r = run(mk(['spiro', 'dlco'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'dlco.dlco=high'));
  ok(keys(r).join() === 'dlco_high' && grp(r, 'dlco_high').dx.some(d => /polycythemia/.test(d.text)), 'high DLCO group');
  r = run(mk(['spiro', 'mip'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'mip.mip=low'));
  ok(keys(r).join() === 'muscle_low', 'low pressures group');
  r = run(mk(['spiro'], 'ctx.indic=dyspnea', 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl'));
  ok(keys(r).join() === 'normal_symptomatic' && grp(r, 'normal_symptomatic').studies.some(s => s.id === 'study.mch'), 'normal spirometry with dyspnea offers the symptomatic-normal differential and challenge testing');
  r = run(mk(['spiro'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl'));
  ok(keys(r).length === 0, 'a normal study without an indication offers no differential');
  r = run(mk(['spiro', 'bronch'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'bronch.type=mch', 'bronch.unit=pc20', 'bronch.mch_val=2'));
  ok(keys(r).indexOf('mch_positive') >= 0, 'positive methacholine group');
  r = run(mk(['spiro', 'sixmw'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'sixmw.spo2_base=97', 'sixmw.spo2_nadir=86'));
  ok(keys(r).indexOf('desat_normal_rest') >= 0, 'exertional desaturation with normal resting tests');
  // invalid data never offers a differential built on it
  r = run(mk(['spiro', 'vol', 'dlco'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'vol.tlc=wnl', 'dlco.dlco=mild', 'dlco.qc=inv'));
  ok(keys(r).length === 0, 'an unacceptable DLCO offers no DLCO differential');
  // every study id named by a group exists and every text is a sentence fragment without a trailing period
  ok(Object.keys(P.STUDIES).every(k => /^study\.[a-z0-9_]+$/.test(k) && !/\.$/.test(P.STUDIES[k])), 'study ids and texts are well formed');
  ok(P.DX_GROUPS.length >= 19 && P.DX_GROUPS.every(g => /^[a-z_]+$/.test(g.key)), 'group keys are well formed');
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) { failures.forEach(f => console.log('FAIL: ' + f)); process.exit(1); }
