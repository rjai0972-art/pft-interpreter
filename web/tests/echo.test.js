// Echo & POCUS: the content, the model, the probe, the renderer, the views and the scoring, in node
const E = require('../src/echo.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const W = 256, H = 208;
const regs = (view, path, over) => { const p = Object.assign(E.viewParams(view), over || {}, { model: E.build(path || 'normal') }); const r = E.render(p, W, H, 0.7, {}); const o = {}; E.regions(r, W, H).forEach(x => { o[x.name] = x; }); return o; };
const f = (o, n) => o[n] ? o[n].frac * 100 : 0;
// ---- content
ok(Object.keys(E.topics).length === 8 && E.groups.length === 3 && E.groups.reduce((n, g) => n + g.ids.length, 0) === 8, 'eight topics in three groups');
ok(['echo_intro', 'echo_views', 'echo_anatomy', 'echo_assess', 'echo_shock', 'echo_lung', 'echo_lab', 'echo_quiz'].every(id => E.topics[id] && E.topics[id].blocks.length > 0), 'every topic has blocks');
ok(E.topics.echo_views.blocks.some(b => b.widget === 'echoatlas') && E.topics.echo_lab.blocks.some(b => b.widget === 'echolab') && E.topics.echo_quiz.blocks.some(b => b.widget === 'echoquiz'), 'the three widgets sit in their topics');
const txt = JSON.stringify(E.topics) + JSON.stringify(E.VIEWS);
ok(/EPSS/.test(txt) && /TAPSE/.test(txt) && /RUSH/.test(txt) && /BLUE/.test(txt) && /2\.1 cm/.test(txt) && /LVOT VTI/.test(txt) && /McConnell/.test(txt) && /SHoC-ED/.test(txt) && /Mercedes/.test(txt), 'the measurements, the protocols and the signs are in the text');
ok(E.VIEWS.length === 11 && E.VIEWS.every(v => v.how.length > 80 && v.see.length >= 1 && v.measure.length >= 1 && v.pitfalls.length >= 1 && E.WINDOWS[v.win] && v.tol), 'eleven views, each with how/see/measure/pitfalls on a known window');
ok(E.PATHOLOGY.length === 8 && E.PATHOLOGY.every(p => p.note && E.build(p.id)), 'eight hearts to scan, each buildable with a note');
// ---- the probe
const m = E.build('normal');
const pr = E.probe({ win: 'psl', rot: 135, model: m });
ok(Math.abs(E.V.len(pr.d) - 1) < 1e-6 && Math.abs(E.V.len(pr.l) - 1) < 1e-6 && Math.abs(E.V.dot(pr.d, pr.l)) < 1e-6 && pr.P[1] < 0.5, 'unit beam and lateral vectors, perpendicular, on the skin');
ok(pr.l[0] < 0 && pr.l[2] > 0, 'marker 135° at the parasternal window points to the right shoulder');
const pa = E.probe({ win: 'apical', rot: 0, model: m });
ok(E.V.dot(pa.d, E.V.unit(E.V.sub(m.base, pa.P))) > 0.99 && pa.l[0] > 0.6, 'the apical beam looks along the long axis toward the base; marker 0° to the patient’s left');
const pt = E.probe({ win: 'psl', rot: 45, tilt: 20, model: m }), pt0 = E.probe({ win: 'psl', rot: 45, tilt: 0, model: m });
ok(Math.abs(Math.acos(E.V.dot(pt.d, pt0.d)) * 180 / Math.PI - 20) < 0.01 && Math.abs(E.V.dot(pt.l, pt0.l) - 1) < 1e-6, 'tilt turns the beam 20° about the lateral axis and leaves the marker direction');
// ---- the renderer
const sec = E.sector(W, H, 16);
ok(sec.inside[0] === 0 && sec.inside[Math.floor(H * 0.6) * W + W / 2] === 1 && sec.inside[(H - 1) * W] === 0, 'the sector: the corners are outside, the middle is inside');
const res = E.render(Object.assign(E.viewParams('plax'), { model: m }), W, H, 0.7, {});
ok(res.img.length === W * H && res.ids.length === W * H && res.img.some(v => v > 180) && res.img.some(v => v > 0 && v < 40), 'a render has bright and dark pixels');
const t1 = Date.now(); for (let i = 0; i < 5; i++) E.render(Object.assign(E.viewParams('a4c'), { model: m }), W, H, i / 5, {}); const dt = (Date.now() - t1) / 5;
ok(dt < 120, 'a frame renders in under 120 ms (' + dt.toFixed(0) + ' ms)');
// ---- the views show what they should
const plax = regs('plax');
ok(f(plax, 'LV') > 5 && f(plax, 'RV') > 1 && f(plax, 'LA') > 2 && f(plax, 'Ao') > 2 && f(plax, 'DAo') > 0.1 && plax.LV.x < plax.Ao.x && plax.RV.y < plax.LV.y && plax.LA.y > plax.Ao.y && plax.DAo.y > plax.LA.y, 'PLAX: LV left of the aorta, RV on top, LA under the root, descending aorta behind the LA');
const pm = regs('psax_pm');
ok(f(pm, 'LV') > 4 && f(pm, 'RV') > 2 && f(pm, 'papillary') > 0.05 && f(pm, 'LA') < 0.5 && f(pm, 'Ao') < 0.5 && pm.RV.y < pm.LV.y, 'PSAX papillary level: a round LV with papillary muscles, the RV crescent anterior, no atria');
const av = regs('psax_av');
ok(f(av, 'Ao') > 3 && f(av, 'LA') > 2 && f(av, 'RA') > 1 && f(av, 'PA') > 1 && f(av, 'LV') < 0.5 && f(av, 'valve') > 0.02 && av.LA.y > av.Ao.y, 'PSAX aortic valve level: the aorta with its cusps, LA behind, RA and PA around');
const a4c = regs('a4c');
ok(f(a4c, 'LV') > 5 && f(a4c, 'RV') > 2.5 && f(a4c, 'LA') > 3 && f(a4c, 'RA') > 1.5 && a4c.LV.x > a4c.RV.x + 20 && a4c.LA.y > a4c.LV.y + 40 && a4c.RA.x < a4c.LA.x && f(a4c, 'Ao') < 2.5, 'A4C: LV right, RV left, atria below, RV:LV under 1');
ok(a4c.RV.n / a4c.LV.n < 0.7 && regs('a4c', 'rv').RV.n / regs('a4c', 'rv').LV.n > 0.85, 'the RV is under 0.7 of the LV normally and near 1 with the PE heart');
const a5c = regs('a5c'); ok(f(a5c, 'Ao') > 2 && f(a5c, 'LV') > 3 && f(a5c, 'RV') > 2, 'A5C: the aorta joins the four chambers');
const a2c = regs('a2c'); ok(f(a2c, 'LV') > 6 && f(a2c, 'LA') > 3 && f(a2c, 'RV') < 0.5 && f(a2c, 'RA') < 0.5, 'A2C: LV and LA, no right heart');
const a3c = regs('a3c'); ok(f(a3c, 'LV') > 6 && f(a3c, 'Ao') > 3 && f(a3c, 'LA') > 3, 'A3C: LV, LA and the aorta');
const sc4 = regs('sc4');
ok(f(sc4, 'liver') > 5 && sc4.liver.y < sc4.LV.y && f(sc4, 'RV') > 1.5 && f(sc4, 'RA') > 1 && f(sc4, 'LV') > 3 && f(sc4, 'LA') > 2 && sc4.RV.y < sc4.LV.y, 'subcostal: liver in the near field, the right heart nearest the probe');
const ivc = regs('ivc'); ok(f(ivc, 'IVC') > 1 && f(ivc, 'RA') > 1 && f(ivc, 'liver') > 5, 'IVC view: the cava through the liver into the RA');
const ssn = regs('ssn'); ok(f(ssn, 'Ao') > 8 && f(ssn, 'LV') < 2, 'suprasternal: the arch, not the ventricle');
// ---- the pathologies
ok(regs('a4c', 'dcm').LV.n > a4c.LV.n * 1.3 && regs('a4c', 'hypo').LV.n < a4c.LV.n * 0.8, 'a dilated LV is bigger, a hypovolaemic one smaller');
ok(f(regs('sc4', 'eff'), 'effusion') > 3 && f(regs('sc4', 'tamp'), 'effusion') > f(regs('sc4', 'eff'), 'effusion') && f(sc4, 'effusion') === 0, 'an effusion appears as a band around the heart, bigger in tamponade, absent normally');
ok(regs('psax_pm', 'lvh').myocardium.n > pm.myocardium.n * 1.25, 'LVH thickens the walls');
ok(f(regs('plax', 'pleff'), 'pleural effusion') > 3 && regs('plax', 'pleff')['pleural effusion'].y > regs('plax', 'pleff').DAo.y, 'a pleural effusion lies posterior to the descending aorta');
const ivcH = regs('ivc', 'hypo'), ivcN = ivc; ok(ivcH.IVC && ivcH.IVC.n < ivcN.IVC.n * 0.7, 'a hypovolaemic IVC is a slit');
// ---- the cycle
const sys = E.render(Object.assign(E.viewParams('psax_pm'), { model: m }), W, H, 0.3, {}), dia = E.render(Object.assign(E.viewParams('psax_pm'), { model: m }), W, H, 0.85, {});
const cnt = (r, id) => { let n = 0; for (let i = 0; i < r.ids.length; i++) if (r.ids[i] === id) n++; return n; };
ok(cnt(sys, E.S.LVB) < cnt(dia, E.S.LVB) * 0.8 && E.cycle(0.3) > 0.9 && E.cycle(0.85) === 0, 'the LV cavity is smaller in systole');
// ---- scoring
E.VIEWS.forEach(v => { const sc = E.score(E.viewParams(v.id), v.id); ok(sc.score === 100 && sc.obtained && sc.hints.length === 0, v.id + ': the canonical probe scores 100'); });
const off = E.score(Object.assign(E.viewParams('a4c'), { rot: 30 }), 'a4c'); ok(!off.obtained && off.score < 95 && /counter-clockwise|clockwise/.test(off.hints[0]), 'off by 30° of rotation: not obtained, a rotation hint');
const far = E.score(Object.assign(E.viewParams('a4c'), { win: 'psl' }), 'a4c'); ok(!far.obtained && far.score < 60 && /apical window/.test(far.hints[0]), 'the wrong window is the first hint');
const tl = E.score(Object.assign(E.viewParams('plax'), { tilt: 15 }), 'plax'); ok(!tl.obtained && /Tilt/.test(tl.hints[0]), 'a tilt error gives a tilt hint');
const nearly = E.score(Object.assign(E.viewParams('plax'), { rot: 140, tilt: 3 }), 'plax'); ok(nearly.obtained && nearly.score >= 90, 'within tolerance counts as obtained');
console.log('echo ' + pass + ' passed, ' + fail + ' failed');
