// v8.8: the waveform engine (timing, sites, shapes, rhythms, the breath, the venous and right-sided traces, the tubing), held against real
// recordings; the patterns, the troubleshooting cases, the scanner scenes and the needle; the real strips and images. Only failures print.
global.window = global;
const W = require('../src/waves.js');
require('../src/physio.js');
const M = require('../src/monitor.js');
const L = require('../src/lines.js');
const R = require('../src/wave_real.js');
const U = require('../src/us_real.js');
const H = require('../src/hemo.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, t) => Math.abs(a - b) <= t;
const fs = 250;
const at = (y, t, f) => y[Math.max(0, Math.min(y.length - 1, Math.round(t * (f || fs))))];
const maxIn = (y, t0, t1, f) => { let m = -1e9; for (let i = Math.round(t0 * (f || fs)); i <= Math.round(t1 * (f || fs)); i++) m = Math.max(m, y[i]); return m; };
const minIn = (y, t0, t1, f) => { let m = 1e9; for (let i = Math.round(t0 * (f || fs)); i <= Math.round(t1 * (f || fs)); i++) m = Math.min(m, y[i]); return m; };
const finite = (y) => { for (let i = 0; i < y.length; i++) if (!isFinite(y[i])) return false; return true; };

// ---- timing
const t60 = W.timing(60), t80 = W.timing(80), t120 = W.timing(120);
ok(near(t60.lvet, 0.311, 0.002) && near(t80.lvet, 0.277, 0.002) && near(t120.lvet, 0.209, 0.002) && t80.pep === 0.09, 'ejection time follows Weissler (311, 277, 209 ms at 60, 80, 120 /min); pre-ejection 90 ms');
ok((t60.T - t60.lvet) / t60.T > (t120.T - t120.lvet) / t120.T + 0.08, 'a faster heart shortens diastole far more than systole');

// ---- the radial beat against the real one
const real = R.strip('radial'), rf = W.featureSummary(real.art, real.fs);
const model = W.series({ hr: rf.hr, sbp: rf.sbp, dbp: rf.dbp, swing: 0 }, 10, 500), mf = W.featureSummary(model.art, 500);
ok(rf.n >= 8 && near(rf.hr, 68, 3) && near(rf.sbp, 157, 6) && near(rf.dbp, 82, 5), 'the real radial strip: about 68 /min, 157/82 (' + rf.hr.toFixed(0) + ', ' + rf.sbp.toFixed(0) + '/' + rf.dbp.toFixed(0) + ')');
ok(near(mf.up, rf.up, 0.05) && near(mf.tn, rf.tn, 0.04) && near(mf.hn, rf.hn, 0.08) && near(mf.ff, rf.ff, 0.07), 'the model’s radial beat matches the real one: upstroke ' + (mf.up * 1000).toFixed(0) + ' vs ' + (rf.up * 1000).toFixed(0) + ' ms, notch at ' + (mf.tn * 1000).toFixed(0) + ' vs ' + (rf.tn * 1000).toFixed(0) + ' ms, notch height ' + mf.hn.toFixed(2) + ' vs ' + rf.hn.toFixed(2) + ', form factor ' + mf.ff.toFixed(2) + ' vs ' + rf.ff.toFixed(2));
ok(mf.up > 0.1 && mf.up < 0.18 && mf.ff > 0.33 && mf.ff < 0.42, 'a radial upstroke of 100–180 ms and a mean a little over a third of the way up');

// ---- the pulmonary artery beat, and the delays after the R wave, against the real record
const pa = R.strip('pa'), pf = W.featureSummary(pa.pa, pa.fs), af = W.featureSummary(pa.art, pa.fs);
const rpk = (e, f) => { const med = Array.from(e).sort((a, b) => a - b)[Math.floor(e.length / 2)], x = Array.from(e).map(v => Math.abs(v - med)), mx = Math.max.apply(null, x), out = []; let last = -1e9; for (let i = 1; i < x.length - 1; i++) if (x[i] > 0.5 * mx && x[i] >= x[i - 1] && x[i] >= x[i + 1] && i - last > 0.3 * f) { out.push(i / f); last = i; } return out; };
const delay = (y, f, rt) => { const d = W.features(y, f).map(b => { const p = rt.filter(r => r < b.foot + 0.02).pop(); return p === undefined ? NaN : b.foot - p; }).filter(v => v > 0.02 && v < 0.45).sort((a, b) => a - b); return d[Math.floor(d.length / 2)]; };
const rt = rpk(pa.ecg, pa.fs), dPa = delay(pa.pa, pa.fs, rt), dArt = delay(pa.art, pa.fs, rt);
const mpa = W.series({ hr: pf.hr, pas: pf.sbp, pad: pf.dbp, sbp: af.sbp, dbp: af.dbp, swing: 0 }, 10, 500), mpf = W.featureSummary(mpa.pa, 500), mrt = mpa.beats.v.map(b => b.tR).filter(t => t >= 0), mdPa = delay(mpa.pa, 500, mrt), mdArt = delay(mpa.art, 500, mrt);
ok(near(dPa, 0.09, 0.03) && near(dArt, 0.175, 0.035), 'real: the pulmonary artery upstroke ' + (dPa * 1000).toFixed(0) + ' ms after the R wave, the radial one ' + (dArt * 1000).toFixed(0) + ' ms');
ok(near(mdPa, dPa, 0.03) && near(mdArt, dArt, 0.03), 'the model: ' + (mdPa * 1000).toFixed(0) + ' and ' + (mdArt * 1000).toFixed(0) + ' ms');
ok(near(mpf.up, pf.up, 0.05) && near(mpf.hn, pf.hn, 0.12) && near(mpf.tn, pf.tn, 0.05) && mpf.up > mf.up, 'the pulmonary artery beat is slower and rounder than the radial, like the real one (upstroke ' + (mpf.up * 1000).toFixed(0) + ' vs ' + (pf.up * 1000).toFixed(0) + ' ms, notch ' + mpf.hn.toFixed(2) + ' vs ' + pf.hn.toFixed(2) + ')');

// ---- the real strips themselves
const fl = R.strip('flush'), zr = R.strip('zero'), fg = R.strip('finger');
ok(R.ids.length === 5 && [fl, zr, fg, pa, real].every(s => s && s.art.length === s.n && s.ecg.length > 0 && finite(s.art)), 'five real strips decode');
ok(Math.abs(maxIn(fl.art, 0.5, 7, 125)) < 4 && maxIn(fl.art, 7.7, 8.7, 125) >= 265 && maxIn(fl.art, 12, 19, 125) - minIn(fl.art, 12, 19, 125) > 40, 'the flush strip: zero, a square wave to the top, then a pulse');
ok(minIn(fl.art, 10.2, 10.5, 125) < 20 && maxIn(fl.art, 10.3, 10.9, 125) > 90, 'after the release the real trace dives and bounces');
ok(maxIn(zr.art, 1, 6, 125) > 120 && Math.abs(maxIn(zr.art, 10, 15, 125)) < 5 && maxIn(zr.ecg, 10, 15, 125) - minIn(zr.ecg, 10, 15, 125) > 0.3 * (maxIn(zr.ecg, 1, 6, 125) - minIn(zr.ecg, 1, 6, 125)), 'the zero strip: the pressure goes to zero and the ECG carries on');
ok(/WFDB/.test(R.credit) && /MIT/.test(R.credit), 'the recordings are credited');

// ---- the arterial tree
const sites = Object.keys(W.SITES).map(k => { const s = W.series({ hr: 75, sbp: 120, dbp: 70, site: k, swing: 0 }, 8, 500); return { k: k, st: W.stats(s.art, 500, 1, 7), f: W.featureSummary(s.art, 500), d: delay(s.art, 500, s.beats.v.map(b => b.tR).filter(t => t >= 0)) }; });
const by = k => sites.filter(s => s.k === k)[0];
ok(sites.every(s => near(s.st.map, by('radial').st.map, 1)), 'one mean pressure at every site (' + sites.map(s => s.st.map.toFixed(0)).join(', ') + ')');
ok(by('aorta').st.sbp < by('femoral').st.sbp && by('femoral').st.sbp < by('radial').st.sbp && by('radial').st.sbp < by('dp').st.sbp && by('dp').st.sbp - by('aorta').st.sbp > 8 && by('aorta').st.dbp > by('dp').st.dbp, 'the systolic rises and the diastolic falls a little from the aortic root to the foot (' + sites.map(s => s.st.sbp.toFixed(0) + '/' + s.st.dbp.toFixed(0)).join(', ') + ')');
ok(by('aorta').d < by('femoral').d && by('femoral').d < by('radial').d && by('radial').d < by('dp').d && near(by('radial').d, 0.175, 0.02) && near(by('aorta').d, 0.09, 0.02), 'the pulse arrives later the further out it is measured');
ok(by('aorta').f.hn > by('radial').f.hn && by('radial').f.hn > by('dp').f.hn && by('aorta').f.tn < by('radial').f.tn, 'the notch comes later and lower going distally');
ok(near(by('radial').st.sbp, 120, 1.5) && near(by('radial').st.dbp, 70, 1.5), 'the reference site reproduces the pressures asked for');

// ---- the shapes
const shape = (cfg) => { const s = W.series(Object.assign({ swing: 0 }, cfg), 8, 500); return { s: s, f: W.featureSummary(s.art, 500), st: W.stats(s.art, 500, 1, 7) }; };
const peaks = (s) => { const m = s.marks.filter(q => q.foot > 1.5)[0], y = s.art, a = Math.round(m.foot * 500), b = Math.round(m.notch * 500); let n = 0; for (let i = a + 3; i < b - 3; i++) if (y[i] > y[i - 3] && y[i] >= y[i + 3] && y[i] > y[i - 1] - 1e-9 && y[i - 1] <= y[i] && y[i] > y[i + 1]) n++; return n; };
const nrm = shape({ hr: 72, sbp: 122, dbp: 70 }), as = shape(L.ART.filter(p => p.id === 'as')[0].cfg), ar = shape(L.ART.filter(p => p.id === 'ar')[0].cfg), hc = shape(L.ART.filter(p => p.id === 'hocm')[0].cfg), vd = shape(L.ART.filter(p => p.id === 'vasodilated')[0].cfg), stf = shape(L.ART.filter(p => p.id === 'stiff')[0].cfg), lsv = shape(L.ART.filter(p => p.id === 'lowsv')[0].cfg);
ok(as.f.up > 0.2 && as.f.up > nrm.f.up + 0.08 && as.st.sbp - as.st.dbp < 45, 'aortic stenosis: a slow, late peak and a small pulse (' + (as.f.up * 1000).toFixed(0) + ' ms)');
ok(peaks(ar.s) === 2 && ar.st.sbp - ar.st.dbp > 100 && ar.st.dbp < 50, 'aortic regurgitation: two systolic peaks, a wide pulse pressure, a low diastolic');
ok(peaks(hc.s) === 2 && peaks(nrm.s) === 1, 'obstructive cardiomyopathy: spike and dome; the normal beat has one peak');
ok(vd.f.hn < 0.28 && vd.f.hn < nrm.f.hn - 0.12, 'vasodilated: a low notch (' + vd.f.hn.toFixed(2) + ' against ' + nrm.f.hn.toFixed(2) + ')');
ok(stf.f.up > nrm.f.up + 0.03 && stf.f.hn > nrm.f.hn, 'stiff arteries: the peak comes late and the notch is high');
ok((lsv.st.sbp - lsv.st.dbp) / lsv.st.sbp < 0.3, 'low stroke volume: a pulse pressure under a third of the systolic');
ok(L.ART.every(p => { const s = W.series(Object.assign({}, p.cfg, p.variants ? { iabp: p.variants[0].iabp } : {}), 8, 250); return finite(s.art) && finite(s.ecg) && finite(s.cvp) && finite(s.pa) && finite(s.paop) && finite(s.rv); }), 'every pattern draws without a hole');

// ---- rhythm
const afs = W.series({ hr: 108, sbp: 114, dbp: 66, rhythm: 'af', cvp: 'af', swing: 0 }, 16, 250), rrs = afs.beats.v.map(b => b.rr), mrr = rrs.reduce((a, b) => a + b, 0) / rrs.length, cv = Math.sqrt(rrs.reduce((a, b) => a + (b - mrr) * (b - mrr), 0) / rrs.length) / mrr, amps = afs.marks.map(m => m.amp);
ok(cv > 0.15 && afs.beats.a.length === 0 && Math.max.apply(null, amps) / Math.min.apply(null, amps) > 1.5, 'fibrillation: irregular intervals, no P waves, pulses of every size');
const pv = W.series({ hr: 72, sbp: 124, dbp: 70, rhythm: 'pvc', swing: 0 }, 16, 250), ect = pv.marks.filter(m => m.pvc), post = pv.marks.filter((m, i) => i && pv.marks[i - 1].pvc), ordinary = pv.marks.filter((m, i) => !m.pvc && !(i && pv.marks[i - 1].pvc));
ok(ect.length >= 3 && ect.every(m => m.amp < 0.5) && post.every(m => m.amp > 1.1) && ordinary.every(m => near(m.amp, 1, 0.01)), 'an ectopic beat ejects little; the beat after the pause ejects more');
const bk = W.series({ hr: 72, sbp: 118, dbp: 66, shape: 'hocm', rhythm: 'pvc', brock: 1, swing: 0 }, 16, 250);
ok(bk.marks.filter((m, i) => i && bk.marks[i - 1].pvc).every(m => m.amp < 0.8), 'with outflow obstruction the beat after the pause is smaller (Brockenbrough)');
const al = W.series({ hr: 104, sbp: 96, dbp: 64, alternans: 0.38, swing: 0 }, 8, 250), am = al.marks.map(m => m.amp);
ok(am.every((a, i) => !i || !near(a, am[i - 1], 0.2)) && near(Math.min.apply(null, am), 0.62, 0.01), 'alternans: strong, weak, strong');

// ---- the breath
const ppvS = W.series({ hr: 104, sbp: 102, dbp: 58, vent: 'ppv', rr: 14, ppv: 22 }, 16, 250), pps = W.features(ppvS.art, 250).filter(q => q.foot > 1).map(q => q.pp), ppv = (Math.max.apply(null, pps) - Math.min.apply(null, pps)) / ((Math.max.apply(null, pps) + Math.min.apply(null, pps)) / 2) * 100;
ok(ppv > 14 && ppv < 32, 'a pulse-pressure variation of about 22% is what the strip measures (' + ppv.toFixed(0) + '%)');
const pxS = W.series({ hr: 112, sbp: 100, dbp: 70, shape: 'lowsv', vent: 'spont', rr: 22, paradox: 22, cvp: 'tamponade' }, 16, 250), sb = W.features(pxS.art, 250).filter(q => q.foot > 1).map(q => q.sbp), px = Math.max.apply(null, sb) - Math.min.apply(null, sb);
ok(px > 12 && px < 30, 'pulsus paradoxus: the systolic falls ' + px.toFixed(0) + ' mm Hg with inspiration');
const corr = (a, b) => { let ma = 0, mb = 0; for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; } ma /= a.length; mb /= a.length; let n = 0, da = 0, db = 0; for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) * (a[i] - ma); db += (b[i] - mb) * (b[i] - mb); } return n / Math.sqrt(da * db); };
const cs = W.series({ cvp: 'normal', vent: 'spont', rr: 14 }, 16, 250), cvn = W.series({ cvp: 'normal', vent: 'ppv', rr: 14 }, 16, 250), ck = W.series({ cvp: 'constriction', vent: 'spont', rr: 14 }, 16, 250);
ok(corr(cs.cvp, cs.resp) < -0.2 && corr(cvn.cvp, cvn.resp) > 0.2 && corr(ck.cvp, ck.resp) > 0, 'the venous pressure falls with a spontaneous breath, rises with the ventilator, and rises with inspiration in constriction (Kussmaul)');

// ---- the venous trace against the ECG
const cn = W.series({ hr: 75, cvp: 'normal', swing: 0 }, 8, 500), b0 = cn.beats.v.filter(b => b.tR > 2)[0].tR, tm = cn.tm, tV = b0 + tm.pep + tm.lvet + 0.05;
const pkT = (y, t0, t1) => { let bi = Math.round(t0 * 500); for (let i = bi; i <= Math.round(t1 * 500); i++) if (y[i] > y[bi]) bi = i; return bi / 500; };
const aT = pkT(cn.cvp, b0 - 0.16, b0 + 0.02), vT = pkT(cn.cvp, b0 + 0.3, b0 + 0.55), xDepth = at(cn.cvp, aT, 500) - minIn(cn.cvp, b0 + 0.1, b0 + 0.3, 500), yDepthN = at(cn.cvp, vT, 500) - minIn(cn.cvp, vT, vT + 0.2, 500);
ok(near(aT, b0 - 0.06, 0.03) && near(vT, tV, 0.04) && xDepth > 2 && yDepthN > 1.5, 'normal: a just before the R wave, x in systole, v at the end of the T wave (' + ((vT - b0) * 1000).toFixed(0) + ' ms after R), then y');
const yD = (id) => { const s = W.series({ hr: 75, cvp: id, swing: 0 }, 8, 500), b = s.beats.v.filter(q => q.tR > 2)[0].tR, v = b + s.tm.pep + s.tm.lvet + 0.05; return { y: at(s.cvp, v, 500) - minIn(s.cvp, v, v + 0.2, 500), x: at(s.cvp, b - 0.06, 500) - minIn(s.cvp, b + 0.1, b + 0.3, 500), sysRise: at(s.cvp, b + 0.25, 500) - at(s.cvp, b + 0.02, 500), a: at(s.cvp, b - 0.06, 500) - at(s.cvp, b - 0.2, 500), mean: W.stats(s.cvp, 500, 1, 7).map }; };
const tam = yD('tamponade'), con = yD('constriction'), trg = yD('tr'), ga = yD('gianta'), nd = yD('normal'), afd = yD('af');
ok(tam.y < 2 && tam.y < nd.y - 2.5 && tam.x > 3 && tam.mean > 14, 'tamponade: high, the x descent kept, the y descent lost');
ok(con.y > 6 && con.x > 3 && con.y > con.x - 1, 'constriction: two steep descents, the y at least as deep');
ok(trg.sysRise > 4 && nd.sysRise < 0, 'tricuspid regurgitation: the pressure rises through systole where it should fall');
ok(ga.a > nd.a + 3, 'a giant a wave before the QRS');
const afc = W.series({ hr: 90, cvp: 'af', rhythm: 'af', swing: 0 }, 8, 500); ok(afc.beats.a.length === 0, 'fibrillation: no atrial contraction, no a wave');
const chb = W.series({ cvp: 'chb', rhythm: 'chb', swing: 0 }, 24, 250), base = W.CVP.chb.base, big = [], small = [];
chb.beats.a.filter(t => t > 0.5 && t < 23).forEach(tp => { const v = maxIn(chb.cvp, tp + 0.05, tp + 0.16); (v > base + 8 ? big : small).push(v); });
ok(big.length >= 3 && small.length >= 5 && chb.beats.v.every(b => b.wide), 'complete heart block: most a waves ordinary, a cannon wave whenever a P wave lands in systole (' + big.length + ' of ' + (big.length + small.length) + ')');
const jn = W.series({ hr: 58, cvp: 'junctional', rhythm: 'junctional', swing: 0 }, 12, 250);
ok(jn.beats.v.filter(b => b.tR > 0.5 && b.tR < 11).every(b => maxIn(jn.cvp, b.tR + 0.05, b.tR + 0.25) > W.CVP.junctional.base + 8), 'junctional rhythm: a cannon wave with every beat');
const fd = W.series({ hr: 70, cvp: 'firstdeg', pr: 0.32, swing: 0 }, 8, 500), fb = fd.beats.v.filter(b => b.tR > 2)[0].tR;
ok(near(pkT(fd.cvp, fb - 0.32, fb - 0.1), fb - 0.22, 0.03), 'a long PR interval moves the a wave away from the c wave');

// ---- the right ventricle, the pulmonary artery, the wedge
const rs = W.series({ hr: 78, pas: 25, pad: 10, rvedp: 5, wedge: 'normal', swing: 0 }, 8, 500), rb = rs.beats.v.filter(b => b.tR > 2)[0].tR, T = rs.tm.T;
ok(near(maxIn(rs.rv, rb, rb + T, 500), 25, 1.5) && minIn(rs.rv, rb, rb + T, 500) < 3 && at(rs.rv, rb + T - 0.15, 500) > at(rs.rv, rb + 0.5, 500) && near(at(rs.rv, rb + T - 0.01, 500), 5, 1.2), 'the right ventricle: a peak at the pulmonary artery systolic, a diastole that starts near zero and climbs to the end-diastolic pressure');
ok(near(maxIn(rs.pa, rb, rb + T, 500), 25, 1) && near(minIn(rs.pa, rb + 0.1, rb + T + 0.08, 500), 10, 1) && at(rs.pa, rb + 0.5, 500) > at(rs.pa, rb + T - 0.05, 500) + 2, 'the pulmonary artery: the same systolic, a diastole that starts high and falls');
const wa = pkT(rs.paop, rb - 0.1, rb + 0.2), ra = pkT(rs.cvp, rb - 0.16, rb + 0.02);
ok(near(wa - ra, 0.14, 0.03) && wa > rb, 'the wedge a wave arrives about 140 ms after the right atrial one — after the QRS');
const mr = W.series({ hr: 78, pas: 52, pad: 26, wedge: 'mr', paV: 9, swing: 0 }, 8, 500), mb = mr.beats.v.filter(b => b.tR > 2)[0].tR, vpk = pkT(mr.paop, mb + 0.2, mb + T);
ok(maxIn(mr.paop, mb, mb + T, 500) > W.WEDGE.mr.base + 15 && vpk > mb + mr.tm.qt - 0.04 && maxIn(mr.paop, mb, mb + T, 500) > 26, 'mitral regurgitation: a giant v wave after the T wave, taller than the pulmonary artery diastolic');
ok(W.stats(W.series({ wedge: 'normal', pas: 25, pad: 10, swing: 0 }, 8, 250).paop, 250, 1, 7).map < 10.5, 'a normal wedge sits at or below the pulmonary artery diastolic');

// ---- the tubing
const tr = W.series({ hr: 84, sbp: 128, dbp: 70, swing: 0 }, 8, 250), t0s = W.stats(tr.art, 250, 1, 7), good = W.stats(W.measure(tr.art, 250, { fn: 25, zeta: 0.6 }), 250, 1, 7), over = W.stats(W.measure(tr.art, 250, { fn: 3.5, zeta: 1.4 }), 250, 1, 7), under = W.stats(W.measure(tr.art, 250, { fn: 5, zeta: 0.12 }), 250, 1, 7), off = W.stats(W.measure(tr.art, 250, { fn: 25, zeta: 0.6, offset: 15 }), 250, 1, 7);
ok(near(good.sbp, t0s.sbp, 2) && near(good.dbp, t0s.dbp, 1.5), 'a good line reproduces the pressure');
ok(over.sbp < t0s.sbp - 10 && over.dbp > t0s.dbp + 2 && near(over.map, t0s.map, 1.5), 'overdamped: systolic down ' + (t0s.sbp - over.sbp).toFixed(0) + ', diastolic up, the mean spared');
ok(under.sbp > t0s.sbp + 12 && under.dbp < t0s.dbp && near(under.map, t0s.map, 1.5), 'underdamped: systolic up ' + (under.sbp - t0s.sbp).toFixed(0) + ', diastolic down, the mean spared');
ok(near(off.sbp - good.sbp, 15, 0.5) && near(off.dbp - good.dbp, 15, 0.5) && near(off.map - good.map, 15, 0.5), 'a transducer 20 cm low adds 15 mm Hg to everything');
const fr = W.flushRead(25, 0.6), fo = W.flushRead(4, 1.4), fu = W.flushRead(5, 0.12);
ok(fr.oscillations >= 1 && fr.oscillations <= 2 && fr.verdict === 'adequate' && fo.oscillations === 0 && fo.verdict === 'overdamped' && fu.oscillations >= 5 && fu.verdict === 'underdamped', 'the flush test: one or two bounces when adequate, none when overdamped, many when underdamped');
ok(near(W.zetaFromRatio(fu.ratio), 0.12, 0.005) && near(W.zetaFromRatio(fr.ratio), 0.6, 0.01), 'the damping coefficient comes back from the ratio of two successive peaks');
const flu = W.measure(tr.art, 250, { fn: 25, zeta: 0.6, flushAt: 3, flushDur: 0.8 });
ok(maxIn(flu, 3.3, 3.8) > 290 && near(at(flu, 5.5), at(tr.art, 5.5), 4), 'the flush pegs the trace at 300 and the pulse returns');

// ---- the balloon pump
const ib = (o) => { const s = W.series({ hr: 80, sbp: 104, dbp: 62, site: 'aorta', refSite: 'aorta', iabp: Object.assign({ ratio: 2 }, o), swing: 0 }, 8, 500), a = s.marks.filter(m => m.assisted && m.foot > 1)[0], i = s.marks.indexOf(a), nx = s.marks[i + 1], n2 = s.marks[i + 2]; return { s: s, a: a, un: at(s.art, a.peak, 500), aug: maxIn(s.art, a.notch, nx.foot - 0.02, 500), aedp: at(s.art, nx.foot, 500), uedp: at(s.art, n2.foot, 500), asys: maxIn(s.art, nx.foot, nx.notch, 500), preNotch: at(s.art, a.notch - 0.05, 500) }; };
const i0 = ib({}), iei = ib({ inflate: -0.09 }), ild = ib({ deflate: 0.09 }), ied = ib({ deflate: -0.2 }), ili = ib({ inflate: 0.12, aug: 0.5 });
ok(i0.aug > i0.un && i0.aedp < i0.uedp - 3 && i0.asys < i0.un, 'correct timing: augmentation above the unassisted systolic, an assisted end-diastolic below the unassisted, a lower assisted systole');
ok(iei.preNotch > i0.preNotch + 3, 'early inflation climbs before the notch');
ok(ili.aug < i0.aug - 5, 'late inflation: a smaller augmentation');
ok(ild.aedp >= ild.uedp - 1, 'late deflation: the assisted end-diastolic is not below the unassisted');
ok(near(ied.aedp, ied.uedp, 3), 'early deflation: the pressure is back at the unassisted level before systole');

// ---- the patterns, the cases, the scenes, the needle
ok(L.ART.length === 16 && L.ART.every(p => p.look.length > 60 && p.means.length > 60 && p.act.length > 40 && p.group) && Object.keys(W.CVP).every(k => L.CVPTXT[k] && L.CVPTXT[k].look.length > 40) && Object.keys(W.WEDGE).every(k => L.WEDGETXT[k]), 'sixteen arterial, twelve venous and five wedge patterns, each with what to see, why, and what to do');
const actIds = L.ACTIONS.map(a => a[0]);
ok(L.CASES.length === 9 && L.CASES.every(c => c.story.length > 80 && c.teach.length > 80 && c.fix.length && c.fix.every(a => actIds.indexOf(a) >= 0 && c.acts[a]) && Object.keys(c.acts).every(a => actIds.indexOf(a) >= 0) && c.acts.patient), 'nine cases: a story, a lesson, a fix that is one of the checks, and the patient among them');
L.CASES.filter(c => c.ch === 'art').forEach(c => {
  const s = W.series(c.truth, 8, 250), tru = W.stats(s.art, 250, 1, 7), sys = { fn: c.fault.fn, zeta: c.fault.zeta, offset: c.fault.offset || 0 }; if (c.fault.kink) { sys.kink = c.fault.kink; sys.kinkMean = tru.map; }
  const shown = W.stats(W.measure(s.art, 250, sys), 250, 1, 7), m = c.story.match(/reads (\d+)\/(\d+)/) || c.story.match(/around (\d+)\/(\d+)/);
  ok(m && near(+m[1], shown.sbp, 3) && near(+m[2], shown.dbp, 3), c.id + ': the story’s numbers are what the model displays (' + shown.sbp.toFixed(0) + '/' + shown.dbp.toFixed(0) + ')');
  if (c.id !== 'gradient') ok(Math.abs(shown.sbp - tru.sbp) > 8 || Math.abs(shown.map - tru.map) > 8, c.id + ': the display is wrong until the fault is fixed');
});
{ const c = L.CASES.filter(x => x.id === 'gradient')[0], r = W.stats(W.series(c.truth, 8, 250).art, 250, 1, 7), f = W.stats(W.series(c.central, 8, 250).art, 250, 1, 7); ok(f.map - r.map > 10 && W.verdict(c.fault.fn, c.fault.zeta) === 'adequate', 'the gradient case: a faithful radial line reading ' + (f.map - r.map).toFixed(0) + ' mm Hg below the femoral mean'); }
const S = L.SCENES, get = (b, id) => b.st.filter(o => o.id === id)[0];
ok(Object.keys(S).length === 4 && Object.keys(S).every(k => [0, 0.25, 0.5, 0.75, 1].every(s => [0, 1].every(o => { const b = S[k].build(s, o); return b.st.length >= 5 && b.zone.length > 40 && b.st.filter(x => x.k === 'vessel').every(v => v.x > 0 && v.x < 1.05 && v.y > 0 && v.y < S[k].depth); }))) && Object.keys(S).every(k => [0.25, 0.35, 0.45].some(s => S[k].build(s, 0).ok) && !S[k].build(0, 0).ok && !S[k].build(1, 0).ok), 'four sites: a working level in the middle, a warning at each end');
const f3 = S.femoral.build(0.3, 0), f9 = S.femoral.build(0.92, 0), f9r = S.femoral.build(0.92, 1);
ok(get(f3, 'cfa') && get(f3, 'cfv').x > get(f3, 'cfa').x + 0.15 && get(f3, 'gsv') && get(f3, 'head') && get(f3, 'fn').x < get(f3, 'cfa').x, 'groin: nerve, artery, vein from lateral to medial over the femoral head, with the saphenous vein joining');
ok(get(f9, 'sfa') && get(f9, 'pfa') && get(f9, 'cfv').y > get(f9, 'sfa').y + 0.5 && Math.abs(get(f9, 'cfv').x - get(f9, 'sfa').x) < 0.1 && get(f9r, 'cfv').x > get(f9, 'cfv').x, 'down the thigh: two arteries, the vein behind the superficial one; turning the leg out uncovers it');
const a1 = S.axillary.build(0.1, 0), a6 = S.axillary.build(0.6, 0);
ok(get(a1, 'pl').y - get(a1, 'av').y < 1.5 && (!get(a6, 'pl') || get(a6, 'pl').y - get(a6, 'av').y > 1.5) && get(a6, 'aa').x < get(a6, 'av').x && get(a6, 'lc'), 'below the clavicle: the pleura is close behind the vein medially and well clear laterally; artery towards the head, cords around it');
const n0 = S.neck.build(0.4, 0), n1 = S.neck.build(0.4, 1);
ok(get(n0, 'ijv').x < get(n0, 'cca').x && get(n0, 'ijv').y < get(n0, 'cca').y && Math.abs(get(n1, 'ijv').x - get(n1, 'cca').x) < Math.abs(get(n0, 'ijv').x - get(n0, 'cca').x) - 0.1, 'neck: the vein lateral to and in front of the carotid; turning the head rolls it over the artery');
ok(get(S.radial.build(0.3, 0), 'ra').rx < 0.16 && get(S.radial.build(0.3, 0), 'ra').y < 0.8, 'wrist: a 2–3 mm artery a few millimetres deep');
const nA = L.needleOOP({ angle: 45, entry: 1.5, adv: 1.0, depth: 1.5, r: 0.42 }), nB = L.needleOOP({ angle: 45, entry: 1.5, adv: 2.13, depth: 1.5, r: 0.42 }), nC = L.needleOOP({ angle: 45, entry: 1.5, adv: 3.3, depth: 1.5, r: 0.42 });
ok(nA.state === 'short' && nA.crossY === null && nB.state === 'tip' && nB.inLumen && near(nB.crossY, 1.5, 0.05) && nC.state === 'shaft' && near(nC.crossY, 1.5, 0.05) && nC.tipY > 1.92 && /shaft/.test(nC.say), 'the needle: nothing before the beam, the tip at it, the same dot from the shaft when the tip has gone through the back wall');

// ---- the topics, the older labs on the new engine, the images
const TT = M.topics, txt = JSON.stringify(L.topics);
ok(Object.keys(L.topics).length === 8 && Object.keys(L.topics).every(k => TT[k]) && M.groups.some(g => /Lines/.test(g.title)) && M.groups.some(g => /Waveforms/.test(g.title)), 'eight topics join the monitoring area in two groups');
ok(/phlebostatic/.test(txt) && /inguinal ligament/.test(txt) && /femoral head/.test(txt) && /manometry/.test(txt) && /Leave it in place/.test(txt) && /height ÷ 10/.test(txt) && /chlorhexidine/.test(txt) && /3SITES/.test(txt) && /left side/.test(txt), 'the protocols carry their landmarks, the wire check, the arterial-dilation rule, the depth formulae and the bundle');
ok(/Saugel/.test(txt) && /Gardner/.test(txt) && /Parienti/.test(txt) && /Buetti/.test(txt) && /Lamperti/.test(txt) && /Magder/.test(txt) && /Yartsev/.test(txt), 'the sources are named');
ok(near(M.artTrue(0, { sbp: 120, dbp: 70, hr: 80 }), 70, 0.6) && M.artTrue(0.14, { sbp: 120, dbp: 70, hr: 80 }) > 118 && typeof M.cvpStrip('tamp', false).cvp(1.2) === 'number', 'the arterial line lab and the CVP screen draw from the engine');
{ const n = H.run(H.preset('normal').p), pa2 = []; for (let i = 0; i < 200; i++) pa2.push(H.trace(n, 'pa', i / 200)); let j = 0; for (let i = 1; i < 200; i++) j = Math.max(j, Math.abs(pa2[i] - pa2[i - 1])); ok(j < 1.2, 'the Swan–Ganz traces of the haemodynamics lab are continuous (largest step ' + j.toFixed(2) + ' mm Hg)'); }
ok(U.order.length === 5 && U.order.every(k => { const im = U.images[k]; return /^data:image\/jpeg;base64,/.test(im.data) && im.data.length > 15000 && im.w === 520 && im.marks.length >= 3 && im.marks.every(m => m[0] > 0 && m[0] < im.w && m[1] > 0 && m[1] < im.h && m[2].length > 3) && im.say.length > 80 && im.pearl.length > 40; }) && /MIT/.test(U.credit), 'five real ultrasound frames, labelled and credited');
console.log('waves ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
