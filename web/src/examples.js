/* Worked example cases for the first screen.  Spec syntax:  'module.field=value'
   param fields:  'spiro.fev1=z-3.1' (numeric z)  |  'spiro.ratio=low' (category)
   prior studies: 'prior.1.date=2024-03-01'  |  current-value override: 'prior.fev1=1.5'      */
(function (root) {
'use strict';
const EXAMPLES = [
  { name: 'COPD with a decline on prior', desc: 'Obstruction, hyperinflation, low DLCO, FEV1 down 16% in a year',
    tests: ['spiro', 'fvl', 'bd', 'vol', 'dlco', 'prior'],
    specs: ['ctx.age=68', 'ctx.sex=M', 'ctx.ht=176', 'ctx.date=2025-03-05', 'ctx.smoke=former', 'ctx.indic=copd,dyspnea,fu',
      'spiro.qual=B', 'spiro.ratio=z-3.4', 'spiro.fev1=z-3.1', 'spiro.fvc=z-0.9', 'fvl.loop=sevobs', 'spiro.fev1_abs=1.55', 'spiro.fvc_abs=3.2',
      'bd.resp=none', 'bd.post_ratio=low', 'bd.agent=albuterol 400 mcg', 'bd.held=y',
      'vol.method=pleth', 'vol.tlc=z1.0', 'vol.rvtlc=high', 'vol.rv=high', 'vol.frc=high',
      'dlco.dlco=z-3.0', 'dlco.basis=un', 'dlco.va=wnl', 'dlco.kco=low', 'dlco.hbcat=nl', 'dlco.dlco_adj=z-2.9',
      'prior.1.date=2024-03-01', 'prior.1.fev1=1.85', 'prior.1.fvc=3.3'] },

  { name: 'ILD follow-up', desc: 'Restriction, severe low DLCO, desaturation, worse than two prior years (% predicted)',
    tests: ['spiro', 'fvl', 'vol', 'dlco', 'sixmw', 'prior'],
    specs: ['ctx.age=58', 'ctx.sex=F', 'ctx.ht=162', 'ctx.date=2025-06-10', 'ctx.indic=ild,fu', 'spiro.qual=A', 'spiro.ratio=wnl', 'spiro.fev1=z-2.9', 'spiro.fvc=z-3.2', 'fvl.loop=convex', 'spiro.fev1_pct=64', 'spiro.fvc_pct=61',
      'vol.method=pleth', 'vol.tlc=z-2.8', 'vol.rvtlc=wnl',
      'dlco.dlco=z-4.4', 'dlco.basis=un', 'dlco.va=low', 'dlco.kco=low', 'dlco.hbcat=low', 'dlco.dlco_adj=z-4.1', 'dlco.dlco_pct=42',
      'sixmw.dist_cat=low', 'sixmw.desat=le88', 'sixmw.hrr=abn', 'sixmw.dist=380', 'sixmw.pred=500', 'sixmw.lln=410', 'sixmw.spo2_base=95', 'sixmw.spo2_nadir=85', 'sixmw.spo2_end=88', 'sixmw.hr_base=82', 'sixmw.hr_peak=128', 'sixmw.hr_1min=118',
      'prior.1.date=2024-06-05', 'prior.1.fev1_pct=74', 'prior.1.fvc_pct=72', 'prior.1.dlco_pct=52', 'prior.1.six=430',
      'prior.2.date=2023-06-01', 'prior.2.fev1_pct=78', 'prior.2.fvc_pct=77', 'prior.2.dlco_pct=58'] },

  { name: 'Low FVC, no lung volumes', desc: 'Normal ratio, mildly low FEV1 and FVC: restriction cannot be confirmed',
    tests: ['spiro'],
    specs: ['ctx.age=60', 'ctx.sex=M', 'ctx.indic=dyspnea', 'spiro.qual=B', 'spiro.ratio=wnl', 'spiro.fev1=mild', 'spiro.fvc=mild'] },

  { name: 'Neuromuscular weakness', desc: 'Low FVC, low TLC with high RV/TLC, low MIP/MEP, postural fall in VC',
    tests: ['spiro', 'fvl', 'vol', 'dlco', 'mip', 'post'],
    specs: ['ctx.age=40', 'ctx.sex=M', 'ctx.ht=180', 'ctx.indic=nmd,dyspnea', 'spiro.ratio=high', 'spiro.fev1=mod', 'spiro.fvc=mod', 'fvl.loop=weak',
      'vol.method=pleth', 'vol.tlc=mod', 'vol.rvtlc=high', 'dlco.dlco=mild', 'dlco.basis=adj', 'dlco.va=low', 'dlco.kco=high',
      'mip.mip=low', 'mip.mep=low', 'mip.cpfcat=vlow', 'post.which=fvc', 'post.fall=ge30', 'post.orthodeox=no', 'post.orthop=1'] },

  { name: 'Asthma work-up (taps only)', desc: 'Spirometry with bronchodilator response, lung volumes and FeNO, entered with taps alone',
    tests: ['spiro', 'fvl', 'bd', 'vol', 'feno'],
    specs: ['ctx.age=29', 'ctx.sex=F', 'ctx.ht=165', 'ctx.indic=asthma,wheeze', 'spiro.qual=A', 'spiro.ratio=low', 'spiro.fev1=mild', 'spiro.fvc=wnl', 'fvl.loop=concave',
      'bd.resp=fev1', 'bd.post_ratio=wnl', 'bd.agent=albuterol 400 mcg', 'bd.held=y',
      'vol.method=pleth', 'vol.tlc=wnl', 'vol.rvtlc=high', 'feno.band=high', 'feno.ics=n'] },

  { name: 'Upper-airway obstruction', desc: 'Normal volumes, inspiratory plateau on the loop, low PEF',
    tests: ['spiro', 'fvl'],
    specs: ['ctx.age=52', 'ctx.sex=F', 'ctx.indic=dyspnea,cough', 'spiro.qual=B', 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'fvl.loop=inspflat', 'fvl.loop_repro=1',
      'fvl.pef=low', 'fvl.fevpef=hi', 'fvl.fifratio=lt'] },

  { name: 'Unexplained exertional dyspnea', desc: 'Normal resting spirometry; 6MWT, CPET and blood gas entered with taps',
    tests: ['spiro', 'fvl', 'sixmw', 'cpet', 'gas'],
    specs: ['ctx.age=47', 'ctx.sex=F', 'ctx.indic=dyspnea', 'spiro.qual=A', 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'fvl.loop=normal',
      'sixmw.dist_cat=wnl', 'sixmw.desat=fall', 'sixmw.hrr=nl',
      'cpet.effort=max', 'cpet.vo2_c=nl', 'cpet.hr_c=nl', 'cpet.vent_c=nl', 'cpet.slope_c=high', 'cpet.petco2_c=low', 'cpet.desat_c=abn',
      'gas.ph_c=nl', 'gas.co2_c=nl', 'gas.hco3_c=nl', 'gas.o2_c=mild', 'gas.aa_c=wide'] },

  { name: 'Heads-up demo (discordant)', desc: 'Values that do not fit together; shows what the final section flags',
    tests: ['spiro', 'fvl', 'vol', 'dlco', 'mip'],
    specs: ['ctx.age=63', 'ctx.sex=M', 'ctx.indic=copd', 'spiro.qual=D', 'spiro.ratio=low', 'spiro.fev1=mild', 'spiro.fvc=sev', 'spiro.fev1_abs=3.5', 'spiro.fvc_abs=3.1', 'spiro.effort=poor', 'fvl.loop=normal',
      'vol.tlc=high', 'vol.rvtlc=wnl', 'vol.tlc_abs=2.8', 'dlco.dlco=wnl', 'dlco.basis=un', 'dlco.va=low', 'dlco.kco=wnl', 'dlco.hb=8.9', 'mip.mip_v=95', 'mip.mep_v=60'] }
];

/* Build a state from a test list and a list of 'module.field=value' specs. */
function buildExample(P, ex) {
  const st = P.defaultState();
  Object.keys(st.tests).forEach(k => { st.tests[k] = false; });
  ex.tests.forEach(t => { st.tests[t] = true; });
  ex.specs.forEach(s => {
    const eq = s.indexOf('='), path = s.slice(0, eq), val = s.slice(eq + 1);
    const dot = path.indexOf('.'), mod = path.slice(0, dot), id = path.slice(dot + 1);
    if (mod === 'prior') {
      const m = /^(\d+)\.(.+)$/.exec(id);
      if (m) { while (st.prior.list.length < +m[1]) st.prior.list.push(P.blankPrior()); st.prior.list[+m[1] - 1][m[2]] = val; }
      else st.prior.cur[id] = val;
      return;
    }
    if (mod === 'spiro' && id === 'qual') { st.spiro.qual_fev1 = val; st.spiro.qual_fvc = val; return; }
    const field = P.SCHEMA[mod].groups.reduce((a, g) => a.concat(g.fields), []).filter(f => f.id === id)[0];
    if (!field) throw new Error('unknown example field ' + path);
    if (field.type === 'param') st[mod][id] = /^z/.test(val) ? { c: 'nm', z: val.slice(1) } : { c: val, z: '' };
    else if (field.type === 'chk') st[mod][id] = (val === '1' || val === 'true');
    else if (field.type === 'multi') st[mod][id] = val ? val.split(',') : [];
    else st[mod][id] = val;
  });
  return P.normalizeState(st);
}

const API = { EXAMPLES: EXAMPLES, buildExample: buildExample };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
root.PFT_EXAMPLES = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
