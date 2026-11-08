// v8.4: the conduction bench model, in node — the activation from the elements, the strip, the reading from the traces
global.window = undefined;
const E = require('../src/ecg.js'); globalThis.PFT_ECG = E;
const C = require('../src/conduction.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const read = (id) => { const st = C.strip(C.preset(id), 10); return { st: st, rd: C.interpret(st), s: st.seq }; };
const line = (rd, k) => (rd.lines.filter(l => l[0] === k)[0] || ['', ''])[1];
// ---- content and shape
ok(C.topics.conduction && C.topics.conduction.blocks.some(b => b.widget === 'conduction') && C.groups.length === 1, 'the topic carries the bench widget');
ok(C.REGIONS.length === 7 && C.ATRIA.length === 2 && C.PRESETS.length === 29 && C.PRESETS.every(p => p.id && p.name && p.set), 'seven ventricular regions, two atria, twenty-nine presets');
ok(C.EDGES.every(e => C.REGIONS.some(r => r.id === e[0]) && C.REGIONS.some(r => r.id === e[1]) && e[2] > 0 && /^(muscle|network)$/.test(e[3])), 'every spread edge joins two regions with a delay and a kind');
const d = C.defaults();
ok(d.sa.rate === 72 && d.av.mode === 'normal' && d.rbb.block === 0 && Object.keys(d.myo).length === 7 && d.myo.sep.mass === 1 && d.focus.mode === 'off', 'defaults: sinus 72, everything open, every wall normal');
// ---- the normal activation
const N = read('normal');
ok(N.s.qrs >= 70 && N.s.qrs <= 95 && N.s.axis > 0 && N.s.axis < 60 && N.s.pr === 160 && N.s.S.vent.map(x => x.id).join(',') === 'sep,apex,rv,lva,lvi,lvl,base' && N.s.S.vent.every(x => x.via !== 'muscle'), 'normal: septum first, basal wall last, every wall through its Purkinje path, QRS 70–95 ms, axis 0–60°, PR 160');
ok(/Sinus rhythm 72/.test(line(N.rd, 'Rhythm')) && /narrow/.test(line(N.rd, 'QRS')) && /normal axis/.test(line(N.rd, 'Axis')) && !N.rd.lines.some(l => /Q waves|ST elevation|ST depression/.test(l[0])), 'normal: the reading is clean');
ok(N.rd.leads.V1.r > 0.2 && N.rd.leads.V1.s < -0.8 && N.rd.leads.V6.r > 1.2 && N.rd.leads.V6.q === 0, 'normal: rS in V1, a tall R in V6');
// ---- bundle branches and fascicles
const R = read('rbbb'), IR = read('irbbb'), L = read('lbbb'), A = read('lafb'), P = read('lpfb'), B = read('bifasc');
ok(R.s.qrs >= 120 && /complete right bundle/.test(line(R.rd, 'QRS')) && R.s.S.vent.filter(x => x.id === 'rv')[0].via === 'muscle' && R.rd.leads.V1.terminal > 0 && R.rd.leads.V6.s < -0.2, 'RBBB: the right ventricle is reached through muscle, QRS ≥ 120, rSR′ in V1, broad S in V6');
ok(IR.s.qrs >= 100 && IR.s.qrs < 120 && /incomplete right bundle/.test(line(IR.rd, 'QRS')) && IR.s.S.vent.filter(x => x.id === 'rv')[0].via === 'rbb', 'half a block: the right bundle still delivers, late — incomplete RBBB 100–119 ms');
ok(L.s.qrs >= 130 && /left bundle branch block pattern/.test(line(L.rd, 'QRS')) && L.s.S.vent[0].id === 'rv' && L.s.S.vent.filter(x => x.id === 'sep')[0].from === 'rv' && L.rd.leads.V6.q === 0 && L.rd.leads.V1.s < -2 && /inverted in .*V6/.test(line(L.rd, 'T waves')), 'LBBB: right ventricle first, septum from the right, no q in V6, deep S in V1, discordant T');
ok(A.s.axis <= -45 && A.s.qrs < 120 && /left anterior fascicular block/.test(line(A.rd, 'Axis')) && A.s.S.vent.filter(x => x.id === 'lva')[0].from === 'lvi', 'LAFB: the anterosuperior wall is reached from the inferior wall, the axis swings past −45°');
ok(P.s.axis > N.s.axis + 25 && P.s.S.vent.filter(x => x.id === 'lvi')[0].from === 'lva', 'LPFB: the inferior wall is reached from the anterior one and the axis swings right');
ok(B.s.axis <= -45 && /right bundle/.test(line(B.rd, 'QRS')) && /left axis/.test(line(B.rd, 'Axis')), 'bifascicular: the RBBB shape with the left axis');
ok(read('trifasc').s.pr > 200 && /first-degree/.test(line(read('trifasc').rd, 'PR')), 'with a long PR as well');
// ---- the accessory pathway and the foci
const W = read('wpw'), WB = read('wpwb');
ok(W.s.pr < 120 && W.s.pre && /pre-excitation/.test(line(W.rd, 'PR')) && W.s.S.vent[0].id === 'pre' && W.s.S.vent[0].via === 'ap' && /secondary to the pre-excitation/.test(line(W.rd, 'ST-T')), 'WPW: short PR, the pre-excited wall first through the pathway, the ST-T read as secondary');
const delta = (X) => { const b = X.st.bts.filter(x => x.kind === 'conducted')[0]; return C.voltageAt('V1', X.st, b.q - 15) - C.voltageAt('V1', X.st, b.q - 70); };
ok(delta(W) > 0.15 && delta(WB) < 0, 'a left-sided pathway writes a positive delta in V1, a right-sided one a negative delta');
const VT = read('vt'), PC = read('paced'), PV = read('pvc');
ok(VT.st.vRate >= 160 && /ventricular tachycardia with AV dissociation/.test(line(VT.rd, 'Rhythm')) && VT.st.bts.some(b => b.pOnly) && VT.st.bts.filter(b => b.kind === 'vt').every(b => b.seq.qrs >= 120), 'VT: a focus at 165/min, wide, with the sinus P waves still written');
ok(PC.st.bts.filter(b => b.kind === 'paced').length >= 11 && PC.st.bts.filter(b => b.kind === 'paced')[0].spike && /LBBB-like/.test(line(PC.rd, 'QRS')), 'pacing from the RV apex: spikes and a left-bundle-like complex');
ok(PV.st.bts.filter(b => b.kind === 'pvc').length >= 4 && /bigeminy/.test(line(PV.rd, 'Rhythm')) && PV.st.bts.filter(b => b.kind === 'pvc')[0].seq.S.vent[0].id === 'rv', 'bigeminy from the RVOT: every second beat starts in the right ventricle');
// ---- the node and the escapes
const W1 = read('wenck'), M2 = read('mobitz2'), CJ = read('chb_j'), CV = read('chb_v'), AF = read('af'), FL = read('flutter');
const prs = W1.st.bts.filter(b => b.kind === 'conducted').slice(0, 3).map(b => Math.round(b.q - b.p));
ok(prs[0] < prs[1] && prs[1] < prs[2] && W1.st.bts.filter(b => b.pOnly).length > W1.st.bts.filter(b => b.kind === 'conducted').length && /Wenckebach/.test(line(W1.rd, 'Rhythm')), 'Wenckebach: the PR lengthens and a P is dropped');
ok(M2.st.bts.filter(b => b.kind === 'conducted').every(b => Math.round(b.q - b.p) === M2.s.pr) && /Mobitz II/.test(line(M2.rd, 'Rhythm')) && /right bundle/.test(line(M2.rd, 'QRS')), 'Mobitz II: a constant PR, dropped beats, the wide QRS of infranodal disease');
ok(CJ.st.bts.filter(b => b.kind === 'junctional').length >= 5 && CJ.st.bts.every(b => b.kind !== 'conducted') && CJ.st.vRate < 50 && /junctional escape/.test(line(CJ.rd, 'Rhythm')) && CJ.st.bts.filter(b => b.kind === 'junctional')[0].seq.qrs < 100, 'complete block at the node: a narrow junctional escape, slower than the atria');
ok(CV.st.bts.filter(b => b.kind === 'ventricular').length >= 4 && CV.st.vRate < 40 && /ventricular escape \(wide\)/.test(line(CV.rd, 'Rhythm')) && CV.st.bts.filter(b => b.kind === 'ventricular')[0].seq.qrs >= 120, 'block below the His: a wide ventricular escape at 20–40');
const rr = AF.st.bts.filter(b => b.kind === 'conducted').map((b, i, a) => i ? b.q - a[i - 1].q : null).filter(x => x !== null);
ok(!AF.st.bts.some(b => b.pOnly) && Math.max.apply(null, rr) - Math.min.apply(null, rr) > 150 && /irregularly irregular/.test(line(AF.rd, 'Rhythm')), 'atrial fibrillation: no P, irregular RR');
ok(FL.st.vRate === 150 && /2:1/.test(line(FL.rd, 'Rhythm')) && C.voltageAt('II', FL.st, 50) !== C.voltageAt('II', FL.st, 150), 'flutter 2:1 at 150 with a sawtooth in II');
// ---- the walls
const SI = read('stemi_inf'), SA = read('stemi_ant'), OI = read('old_inf'), OA = read('old_ant'), IS = read('isch'), LV = read('lvh'), RV = read('rvh'), HK = read('hyperk'), LQ = read('lqt');
ok(/II, III, aVF \(inferior\)/.test(line(SI.rd, 'ST elevation')) && /reciprocal depression in .*aVL/.test(line(SI.rd, 'ST elevation')) && SI.rd.leads.III.st > 0.1 && SI.rd.leads.aVL.st < -0.05, 'inferior STEMI: ST up in II, III, aVF, down in aVL');
ok(/V2, V3, V4/.test(line(SA.rd, 'ST elevation')) && /anterior/.test(line(SA.rd, 'ST elevation')) && SA.rd.leads.V3.st > 0.2, 'anterior STEMI: ST up across the anterior leads');
ok(/III, aVF/.test(line(OI.rd, 'Q waves')) && /inferior/.test(line(OI.rd, 'Q waves')) && OI.rd.leads.III.q < -0.3 && OI.s.axis < N.s.axis - 20, 'old inferior infarct: Q waves in III and aVF, the axis drifts up');
ok(OA.rd.leads.V2.r < 0.3 && OA.rd.leads.V3.r < 0.3 && OA.rd.leads.V4.r > OA.rd.leads.V3.r, 'old anteroseptal infarct: the R fails to grow across V1–V3');
ok(/I, aVL, V6 \(lateral\)/.test(line(IS.rd, 'ST depression')) && /ischaemia/.test(line(IS.rd, 'ST depression')) && !IS.rd.lines.some(l => l[0] === 'ST elevation'), 'lateral subendocardial ischaemia: ST down in the lateral leads, no elevation');
ok(/Sokolow/.test(line(LV.rd, 'Voltage')) && /strain/.test(line(LV.rd, 'T waves')) && Math.abs(LV.rd.leads.V1.s) + LV.rd.leads.V5.r > 3.5, 'LVH: voltage criteria met, strain in the lateral leads');
ok(/right ventricular hypertrophy/.test(line(RV.rd, 'Voltage')) && RV.rd.leads.V1.r > RV.rd.leads.V1.s * -1 && RV.s.axis > 85, 'RVH: dominant R in V1 and a rightward axis');
ok(/hyperkalaemia/.test(line(HK.rd, 'T waves')) && HK.s.qrs > N.s.qrs + 15 && /diffusely widened/.test(line(HK.rd, 'QRS')) && HK.s.S.atria[0].mag < N.s.S.atria[0].mag, 'hyperkalaemia: peaked T, a wider QRS, a flatter P');
ok(/prolonged/.test(line(LQ.rd, 'QT')) && LQ.s.qrs === N.s.qrs, 'long QT: the T comes late, the QRS unchanged');
// ---- the parts add up
(function () {
  const st = C.strip(C.preset('rbbb'), 10), b = st.bts.filter(x => x.kind === 'conducted')[0];
  let worst = 0; for (let t = -60; t < 450; t += 6) { const parts = {}; const v = C.voltageAt('V1', st, b.q + t, parts); const sum = Object.keys(parts).reduce((a, k) => a + parts[k], 0); worst = Math.max(worst, Math.abs(v - sum)); }
  ok(worst < 1e-9, 'a lead is exactly the sum of its parts');
})();
ok(C.elementStates(C.preset('rbbb')).rbb === 'blocked' && C.elementStates(C.preset('irbbb')).rbb === 'delayed' && C.elementStates(C.preset('chb_j')).av === 'blocked' && C.elementStates(C.preset('wpw')).ap === 'ok' && C.elementStates(C.preset('af')).sa === 'blocked', 'the element states for the drawing');
console.log('cond ' + pass + ' passed, ' + fail + ' failed');
