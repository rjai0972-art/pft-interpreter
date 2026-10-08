// Print reports for a set of clinical scenarios so they can be read by a human.
const { P, mk } = require('./helpers');
const SC = {
  normal: mk(['spiro', 'vol', 'dlco'], 'spiro.ratio=z-0.4', 'spiro.fev1=z-0.6', 'spiro.fvc=z-0.5', 'vol.tlc=z0.1', 'vol.rvtlc=wnl', 'dlco.dlco=z-0.8', 'dlco.va=wnl', 'dlco.kco=wnl', 'spiro.qual=A', 'ctx.age=45', 'ctx.sex=M'),
  copd: mk(['spiro', 'bd', 'vol', 'dlco', 'prior'], 'ctx.age=68', 'ctx.sex=M', 'ctx.date=2025-03-05', 'spiro.qual=B', 'spiro.ratio=z-3.4', 'spiro.fev1=z-3.1', 'spiro.fvc=z-0.9', 'spiro.fev1_abs=1.55', 'spiro.fvc_abs=3.2',
          'bd.fev1_pre=1.55', 'bd.fev1_post=1.62', 'bd.fev1_pred=2.9', 'bd.fvc_pre=3.2', 'bd.fvc_post=3.3', 'bd.fvc_pred=4.1', 'bd.post_ratio=low',
          'vol.method=pleth', 'vol.tlc=z1.0', 'vol.rvtlc=high', 'vol.rv=high', 'vol.frc=high',
          'dlco.dlco=z-3.0', 'dlco.basis=un', 'dlco.va=wnl', 'dlco.kco=low', 'dlco.hb=14.2', 'dlco.dlco_adj=z-2.9',
          'prior.1.date=2024-03-01', 'prior.1.fev1=1.85', 'prior.1.fvc=3.3'),
  userExample: mk(['spiro'], 'spiro.ratio=wnl', 'spiro.fev1=mild', 'spiro.fvc=mild'),
  userExample2: mk(['spiro'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=mild'),
  restriction: mk(['spiro', 'vol', 'dlco'], 'ctx.age=58', 'ctx.sex=F', 'spiro.ratio=wnl', 'spiro.fev1=mod', 'spiro.fvc=mod', 'vol.tlc=mod', 'vol.rvtlc=wnl', 'dlco.dlco=sev', 'dlco.basis=un', 'dlco.va=low', 'dlco.kco=low', 'dlco.hb=12.5', 'dlco.dlco_adj=sev'),
  extrapulm: mk(['spiro', 'vol', 'dlco', 'mip', 'post'], 'ctx.age=40', 'ctx.sex=M', 'spiro.ratio=high', 'spiro.fev1=mod', 'spiro.fvc=mod', 'vol.tlc=mod', 'vol.rvtlc=high', 'dlco.dlco=mild', 'dlco.va=low', 'dlco.kco=high',
          'mip.mip_v=32', 'mip.mep_v=45', 'post.up=2.8', 'post.sup=1.9'),
  mixed: mk(['spiro', 'vol'], 'spiro.ratio=low', 'spiro.fev1=sev', 'spiro.fvc=sev', 'vol.tlc=mild', 'vol.rvtlc=high'),
  nonspecific: mk(['spiro', 'vol'], 'spiro.ratio=wnl', 'spiro.fev1=mild', 'spiro.fvc=mild', 'vol.tlc=wnl', 'vol.rvtlc=wnl'),
  pft2: mk(['spiro', 'bd', 'vol', 'feno'], 'ctx.age=29', 'ctx.sex=F', 'spiro.ratio=low', 'spiro.fev1=mild', 'spiro.fvc=wnl', 'bd.fev1_pre=2.4', 'bd.fev1_post=2.75', 'bd.fev1_pred=3.3', 'bd.fvc_pre=3.6', 'bd.fvc_post=3.7', 'bd.fvc_pred=3.9',
          'vol.tlc=wnl', 'vol.rvtlc=high', 'feno.val=62'),
  upper: mk(['spiro', 'fvl'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'fvl.loop=inspflat', 'fvl.loop_repro=1', 'fvl.pef=low', 'fvl.pef_lmin=180', 'spiro.fev1_abs=2.9', 'fvl.fef50=4.1', 'fvl.fif50=1.8'),
  badEntry: mk(['spiro', 'vol'], 'spiro.ratio=low', 'spiro.fev1=mild', 'spiro.fvc=sev', 'spiro.fev1_abs=3.5', 'spiro.fvc_abs=3.1', 'vol.tlc_abs=2.8'),
  exercise: mk(['sixmw', 'cpet', 'gas'], 'ctx.age=62', 'ctx.sex=M', 'sixmw.dist=360', 'sixmw.pred=520', 'sixmw.lln=430', 'sixmw.spo2_base=96', 'sixmw.spo2_nadir=86', 'sixmw.hr_peak=128', 'sixmw.hr_1min=118',
          'cpet.vo2_pct=62', 'cpet.o2p=7.2', 'cpet.ve_mvv=0.92', 'cpet.vevco2=38', 'cpet.spo2_rest=96', 'cpet.spo2_peak=90', 'cpet.rer=1.12', 'cpet.hr_peak=140',
          'gas.ph=7.31', 'gas.paco2=58', 'gas.pao2=58', 'gas.hco3=29', 'gas.sao2=88'),
  bronch: mk(['spiro', 'bronch', 'feno'], 'spiro.ratio=wnl', 'spiro.fev1=wnl', 'spiro.fvc=wnl', 'bronch.type=mch', 'bronch.mch_val=1.8', 'feno.val=18', 'bronch.base_pct=92')
};
const only = process.argv[2];
Object.keys(SC).forEach(k => {
  if (only && only !== k) return;
  const r = P.interpret(SC[k]);
  console.log('\n================ ' + k + ' ================');
  console.log(r.text);
  console.log('\n--- headsup (' + r.headsup.length + ') ---');
  r.headsup.forEach(h => console.log('[' + h.lvl + '/' + h.cat + '] ' + h.title + ': ' + h.text));
});
