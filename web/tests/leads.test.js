// v8.5: the lead-placement model, in node — the electrodes write the bench's leads, the swaps permute them, an electrode off
// puts noise where it should, and the reading finds the clue in the traces
global.window = undefined;
const E = require('../src/ecg.js'); globalThis.PFT_ECG = E;
const C = require('../src/conduction.js'); globalThis.PFT_COND = C;
const L = require('../src/leads.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const st = C.strip(C.preset('normal'), 10);
const flagsOf = (id, src) => { const S = src || st; return L.read(L.voltageFn(L.mishap(id), S), S).flags.map(f => f.id); };

// the standard set-up reproduces the bench exactly for the bipolar and chest leads, and 0.866× for the augmented (Goldberger from Einthoven's triangle)
{
  const v = L.voltageFn(L.setup(), st); let d = 0, a = 0;
  for (let T = 0; T < 4000; T += 4) { ['I', 'II', 'III', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'].forEach(k => { d = Math.max(d, Math.abs(v(k, T) - C.voltageAt(k, st, T))); }); ['aVR', 'aVL', 'aVF'].forEach(k => { a = Math.max(a, Math.abs(v(k, T) - Math.sqrt(3) / 2 * C.voltageAt(k, st, T))); }); }
  ok(d < 1e-6, 'standard set-up = bench, bipolar and chest: ' + d); ok(a < 1e-6, 'augmented = 0.866 × bench: ' + a);
  const vecs = L.cableVecs(L.setup()); ok(Math.abs(vecs.RA[0] + vecs.LA[0] + vecs.LL[0]) < 1e-9 && Math.abs(vecs.RA[1] + vecs.LA[1] + vecs.LL[1]) < 1e-9, 'Einthoven triangle sums to zero: the Wilson terminal is zero');
  L.ELECTRODES.forEach(e => { const w = L.vecAt(e, e.torso); ok(Math.hypot(w[0] - e.vec[0], w[1] - e.vec[1], w[2] - e.vec[2]) < 1e-9, 'standard spot gives the canonical vector: ' + e.id); });
}
// the algebra of the swaps
{
  const v0 = L.voltageFn(L.setup(), st), T = 1100;
  const s1 = L.voltageFn(L.mishap('ra_la'), st); ok(Math.abs(s1('I', T) + v0('I', T)) < 1e-9 && Math.abs(s1('II', T) - v0('III', T)) < 1e-9 && Math.abs(s1('aVR', T) - v0('aVL', T)) < 1e-9 && Math.abs(s1('aVF', T) - v0('aVF', T)) < 1e-9 && Math.abs(s1('V3', T) - v0('V3', T)) < 1e-9, 'RA/LA: I inverted, II↔III, aVR↔aVL, aVF and V unchanged');
  const s2 = L.voltageFn(L.mishap('la_ll'), st); ok(Math.abs(s2('I', T) - v0('II', T)) < 1e-9 && Math.abs(s2('III', T) + v0('III', T)) < 1e-9 && Math.abs(s2('aVR', T) - v0('aVR', T)) < 1e-9, 'LA/LL: I↔II, III inverted, aVR unchanged');
  const s3 = L.voltageFn(L.mishap('ra_rl'), st); let mx = 0; for (let t = 0; t < 3000; t += 4) mx = Math.max(mx, Math.abs(s3('II', t))); ok(mx < 1e-9, 'RA/RL: lead II flat');
  const s4 = L.voltageFn(L.mishap('la_rl'), st); mx = 0; for (let t = 0; t < 3000; t += 4) mx = Math.max(mx, Math.abs(s4('III', t))); ok(mx < 1e-9, 'LA/RL: lead III flat');
  const s5 = L.voltageFn(L.mishap('v_rev'), st); ok(Math.abs(s5('V1', T) - v0('V6', T)) < 1e-9 && Math.abs(s5('V3', T) - v0('V4', T)) < 1e-9, 'chest cables reversed');
  const s6 = L.voltageFn(L.mishap('dextro'), st); ok(Math.abs(s6('I', T) + v0('I', T)) < 1e-9 && Math.abs(s6('aVF', T) - v0('aVF', T)) < 1e-9, 'dextrocardia mirrors x: I inverted, aVF kept');
}
// an electrode off: noise in the leads that use it, through the terminal into the chest leads; the right leg hums everywhere
{
  const m = L.measure(L.voltageFn(L.mishap('off_ra'), st), st);
  ok(m.noise.I > 0.04 && m.noise.II > 0.04 && m.noise.III < 0.02 && m.noise.V3 > 0.04, 'RA off: noise in I, II and V3, III clean');
  const m2 = L.measure(L.voltageFn(L.mishap('off_v3'), st), st); ok(m2.noise.V3 > 0.04 && m2.noise.V2 < 0.02 && m2.noise.I < 0.02, 'V3 off: only V3 noisy');
  const m3 = L.measure(L.voltageFn(L.mishap('off_rl'), st), st); ok(L.LEAD_NAMES.every(k => m3.noise[k] > 0.04), 'RL off: hum on every lead');
}
// the reading finds the clue
ok(flagsOf('ok').join() === 'none', 'correct: none');
ok(flagsOf('ra_la').indexOf('p_avr') >= 0, 'RA/LA read from the P in aVR');
ok(flagsOf('ra_rl').indexOf('flat_ii') >= 0, 'RA/RL read from the flat II');
ok(flagsOf('la_rl').indexOf('flat_iii') >= 0, 'LA/RL read from the flat III');
ok(flagsOf('la_ll').indexOf('p_i_ii') >= 0, 'LA/LL read from P in I > II with inverted P in III');
ok(flagsOf('ra_ll').indexOf('p_avr') >= 0, 'RA/LL read');
ok(flagsOf('off_ra').join() === 'off_limb', 'RA off read as a limb electrode');
ok(flagsOf('off_rl').join() === 'hum_all', 'RL off read as hum everywhere');
ok(flagsOf('off_v3').join() === 'off_chest', 'V3 off read as a chest electrode');
ok(flagsOf('v1_v2').indexOf('v1v2') >= 0, 'V1/V2 swap read from the R progression');
ok(flagsOf('v_rev').indexOf('v_rev') >= 0, 'reversed chest cables read');
ok(flagsOf('v12_high').indexOf('v12_high') >= 0, 'V1–V2 too high read from the P and the small R');
ok(flagsOf('v456_low').indexOf('v456_low') >= 0, 'V4–V6 too low read from the small lateral R');
ok(flagsOf('right').indexOf('v456_right') >= 0, 'right-sided leads read as small rS laterally');
ok(flagsOf('dextro').indexOf('p_avr') >= 0 && /dextrocardia, and here/.test(L.read(L.voltageFn(L.mishap('dextro'), st), st).flags[0].text), 'dextrocardia: the positive P in aVR with the lost R progression');
// the comparison
{
  const c = L.compare(L.mishap('ra_la'), st); ok(c.leads.I.inv && c.leads.aVR.inv && c.leads.aVF.what === 'same' && c.leads.V4.what === 'same', 'compare RA/LA: I and aVR inverted, aVF and V4 same');
  const c2 = L.compare(L.mishap('mason'), st); ok(c2.axis1 > c2.axis0 + 20 && c2.leads.I.ratio < 0.8 && c2.leads.aVF.ratio > 1.3, 'Mason–Likar: the axis turns rightward, I shrinks, aVF grows');
  const c3 = L.compare(L.mishap('ra_rl'), st); ok(c3.leads.II.flat, 'compare: II flat');
}
// the moved electrode: a higher V1 looks down at the atria (negative P), a lower V4 is smaller
{
  const e = L.ELECTRODES.filter(x => x.id === 'V1')[0], hi = L.vecAt(e, [183, 210]); ok(hi[1] < 0 && Math.hypot(hi[0], hi[1], hi[2]) < 1, 'V1 two spaces up looks superiorly and is a little farther');
  const e4 = L.ELECTRODES.filter(x => x.id === 'V4')[0], lo = L.vecAt(e4, [256, 332]); ok(lo[1] > e4.vec[1] && Math.hypot(lo[0], lo[1], lo[2]) < 0.8, 'V4 low looks inferiorly and is weaker');
  const ra = L.ELECTRODES.filter(x => x.id === 'RA')[0], tor = L.vecAt(ra, [112, 150]); ok(tor[1] < ra.vec[1], 'RA on the torso sees the heart from higher up');
  // a posterior spot is behind the heart
  const v6 = L.ELECTRODES.filter(x => x.id === 'V6')[0], post = L.vecAt(v6, [385, 282]); ok(post[2] < 0, 'V9 looks from behind');
}
// inferior STEMI with RV involvement through right-sided leads: ST up in V4R
{
  const cfg = C.preset('stemi_inf'); cfg.myo.rv.injury = 1.0; const s2 = C.strip(cfg, 10);
  const m = L.measure(L.voltageFn(L.mishap('right'), s2), s2), m0 = L.measure(L.voltageFn(L.setup(), s2), s2);
  ok(m.st.V4 > 0.04 && m.st.V4 > m0.st.V4, 'RV injury: ST elevation in V4R, more than in V4');
}
// the topic and the mishaps are complete
ok(L.topics.leads && L.topics.leads.blocks.some(b => b.widget === 'leads'), 'topic with the widget');
ok(L.MISHAPS.length >= 17 && L.MISHAPS.every(m => m.teach && m.name && m.group), 'mishaps complete');
ok(L.ELECTRODES.every(e => e.where && e.vec && e.torso), 'electrodes complete');
console.log('leads ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
