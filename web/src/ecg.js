/* PFT Interpreter — Learn: cardiac conduction and the ECG.
   A teaching model of how the activation sequence writes the 12-lead ECG. The heart is a handful of regions, each
   activated at a time, for a duration, with a mean wavefront direction and a weight; the signal in a lead is the sum of
   the regions' dipoles projected onto the lead's direction. Conduction disorders change the timing and direction of the
   regions (a blocked bundle branch delays and slows its ventricle; a blocked fascicle tilts the axis; an accessory
   pathway starts a ventricle early), so the traces change for the reason they do in a patient. The shapes are the
   textbook ones; the model is for understanding, not for reading real tracings.
   Frame: x toward the patient's left, y inferior (down), z anterior. Times in ms, amplitudes in mV (roughly). */
(function (root) {
'use strict';
const d2r = Math.PI / 180;
const LEADS = [
  ['I', [1, 0, 0]], ['II', [Math.cos(60 * d2r), Math.sin(60 * d2r), 0]], ['III', [Math.cos(120 * d2r), Math.sin(120 * d2r), 0]],
  ['aVR', [Math.cos(-150 * d2r), Math.sin(-150 * d2r), 0]], ['aVL', [Math.cos(-30 * d2r), Math.sin(-30 * d2r), 0]], ['aVF', [0, 1, 0]],
  ['V1', [-0.5, 0.05, 0.86]], ['V2', [-0.15, 0.08, 0.98]], ['V3', [0.3, 0.15, 0.94]], ['V4', [0.62, 0.22, 0.75]], ['V5', [0.86, 0.22, 0.45]], ['V6', [0.97, 0.18, 0.15]]
];
const LAYOUT = [['I', 'aVR', 'V1', 'V4'], ['II', 'aVL', 'V2', 'V5'], ['III', 'aVF', 'V3', 'V6']];

/* the regions of the ventricles in order of normal activation (t0 after the start of the QRS) and the atria (after the
   start of the P). `via` names the conduction path that brings the wavefront; `pic` the shape on the heart drawing. */
function normalSegments() {
  return {
    atria: [
      { id: 'ra', name: 'Right atrium', t0: 0, dur: 55, dir: [0.25, 0.8, 0.4], mag: 0.11, via: 'sa' },
      { id: 'la', name: 'Left atrium', t0: 28, dur: 58, dir: [0.8, 0.5, -0.3], mag: 0.11, via: 'bach' }
    ],
    vent: [
      { id: 'sep', name: 'Septum (left to right)', t0: 0, dur: 26, dir: [-0.55, -0.15, 0.65], mag: 0.42, via: 'lbb' },
      { id: 'apex', name: 'Apex and anterior wall', t0: 12, dur: 30, dir: [0.3, 0.8, 0.45], mag: 0.7, via: 'lbb' },
      { id: 'rv', name: 'Right ventricular free wall', t0: 16, dur: 30, dir: [-0.55, 0.25, 0.75], mag: 0.5, via: 'rbb' },
      { id: 'lva', name: 'Anterolateral wall (anterior fascicle)', t0: 22, dur: 34, dir: [0.85, -0.2, -0.15], mag: 0.85, via: 'laf' },
      { id: 'lvi', name: 'Inferoposterior wall (posterior fascicle)', t0: 24, dur: 34, dir: [0.3, 0.9, -0.3], mag: 0.85, via: 'lpf' },
      { id: 'lvl', name: 'Lateral wall', t0: 30, dur: 32, dir: [0.95, 0.3, -0.1], mag: 0.8, via: 'lbb' },
      { id: 'base', name: 'Posterobasal left ventricle', t0: 50, dur: 26, dir: [-0.3, -0.55, -0.75], mag: 0.4, via: 'lbb' }
    ]
  };
}

/* ------------------------------------------------------------ the scenarios
   Each applies a degree (0–1) to the normal sequence and sets the rhythm: how the P waves and the QRS complexes fall
   over a 10-second strip. `pr` is the P-onset-to-QRS-onset interval for conducted beats. */
const SCENARIOS = [
  { id: 'normal', name: 'Normal conduction', param: null,
    mech: 'The sinus node fires; the atria depolarise right then left (P wave). The impulse waits in the AV node (PR segment), then runs down the His bundle and both bundle branches so that the septum goes first, left to right (the small septal q in V6, r in V1), then the apex, the right ventricle and the thick left ventricle almost together (the big R in V5–6, the deep S in V1), and the posterobasal wall last (the small terminal s in V6). Because the two ventricles are activated at the same time, the QRS is narrow.',
    ecg: 'PR 120–200 ms; QRS under 100 ms (narrow) with a normal axis (−30° to +90°); T waves follow the QRS direction.' },
  { id: 'rbbb', name: 'Right bundle branch block', param: { label: 'Degree of block in the right bundle', min: 0, max: 1, step: 0.05, value: 1, fmt: (v) => v < 0.35 ? 'conducting with delay (incomplete)' : (v < 0.7 ? 'incomplete block' : 'complete block') },
    apply: (S, g) => { const rv = S.vent.filter(x => x.id === 'rv')[0]; rv.t0 += 54 * g; rv.dur += 54 * g; rv.mag *= 1 + 0.6 * g; rv.late = 54 * g; rv.blocked = g > 0.1; },
    mech: 'The right bundle no longer carries the impulse, so the left ventricle is activated normally and on time through the left bundle, and the right ventricle is reached late, muscle to muscle, across the septum. Early forces are unchanged (normal septal q and R). The terminal forces are the late, slow right ventricular wavefront pointing right and forward, and nothing opposes them: a broad terminal R′ in V1 (rSR′, the M shape) and a broad slurred S in I, aVL and V5–6. The late-activated ventricle repolarises late, so the T wave turns away from the delayed forces (inverted in V1–V2). Drag the slider: a mild conduction delay only widens the terminal part (incomplete block, QRS 100–120 ms); a complete block gives a QRS of 120 ms or more.',
    ecg: 'QRS ≥ 120 ms (complete) or 100–119 ms (incomplete); rSR′ in V1–V2; wide S in I and V6; secondary ST-T changes in V1–V3; axis usually normal.' },
  { id: 'lbbb', name: 'Left bundle branch block', param: { label: 'Degree of block in the left bundle', min: 0, max: 1, step: 0.05, value: 1, fmt: (v) => v < 0.35 ? 'conduction delay' : (v < 0.7 ? 'incomplete block' : 'complete block') },
    apply: (S, g) => {
      const sep = S.vent.filter(x => x.id === 'sep')[0], rv = S.vent.filter(x => x.id === 'rv')[0];
      sep.dir = [-0.55 + 1.15 * g, -0.15, 0.65 - 1.05 * g]; sep.mag *= 1 - 0.3 * g; sep.name = g > 0.5 ? 'Septum (right to left)' : sep.name; sep.via = g > 0.5 ? 'rbb' : 'lbb'; sep.dur += 10 * g;
      rv.mag *= 1 - 0.5 * g;
      S.vent.forEach(x => { if (/^(apex|lva|lvi|lvl|base)$/.test(x.id)) { x.t0 += (x.id === 'apex' ? 30 : 44) * g; x.dur += 40 * g; x.late = 44 * g; x.blocked = g > 0.1; x.via = g > 0.5 ? 'rbb' : x.via; } });
    },
    mech: 'With the left bundle blocked the whole sequence reverses: the impulse comes down the right bundle, activates the right ventricle, then crosses the septum from right to left (the normal septal q disappears — no q in I, aVL, V5–6) and spreads slowly through the left ventricular muscle. The left ventricle, the dominant mass, is activated late and slowly, so the broad leftward forces write a wide, notched or plateaued R in I, aVL and V5–6 and a deep QS or rS in V1–V2. Repolarisation is discordant: the T wave points away from the QRS in every lead. The slider shows how a delay in the left bundle thickens the R and removes the q before the block is complete.',
    ecg: 'QRS ≥ 120 ms; broad notched R in I, aVL, V5–6 without q; QS or rS in V1–V3; discordant ST-T; an underlying infarct is hard to read.' },
  { id: 'lafb', name: 'Left anterior fascicular block', param: { label: 'Block in the anterior fascicle', min: 0, max: 1, step: 0.05, value: 1, fmt: (v) => v < 0.5 ? 'partial' : 'complete' },
    apply: (S, g) => { const a = S.vent.filter(x => x.id === 'lva')[0], i = S.vent.filter(x => x.id === 'lvi')[0], l = S.vent.filter(x => x.id === 'lvl')[0], ap = S.vent.filter(x => x.id === 'apex')[0];
      a.t0 += 30 * g; a.dur += 12 * g; a.dir = [0.6, -0.2 - 1.0 * g, -0.15]; a.mag *= 1 + 0.5 * g; a.late = 30 * g; a.blocked = g > 0.1;
      i.t0 -= 6 * g; i.mag *= 1 - 0.35 * g; l.dir = [0.95, 0.3 - 0.3 * g, -0.1]; ap.dir = [0.3, 0.8 - 0.3 * g, 0.45]; },
    mech: 'The anterior fascicle supplies the anterosuperior wall of the left ventricle. When it is blocked that wall is reached late through the posterior fascicle, so activation starts inferiorly (a small r in II, III and aVF, a small q in I and aVL) and ends superiorly and to the left (a tall R in aVL and I, deep S in II, III, aVF). The mean QRS vector swings up and to the left: left axis deviation, with little widening because the delay is short.',
    ecg: 'Axis −45° to −90°; qR in I and aVL, rS in II, III, aVF; QRS under 120 ms; no other cause of left axis (inferior infarct, LVH, WPW).' },
  { id: 'lpfb', name: 'Left posterior fascicular block', param: { label: 'Block in the posterior fascicle', min: 0, max: 1, step: 0.05, value: 1, fmt: (v) => v < 0.5 ? 'partial' : 'complete' },
    apply: (S, g) => { const a = S.vent.filter(x => x.id === 'lva')[0], i = S.vent.filter(x => x.id === 'lvi')[0], l = S.vent.filter(x => x.id === 'lvl')[0];
      i.t0 += 30 * g; i.dur += 12 * g; i.dir = [0.3 - 1.0 * g, 0.9 + 0.2 * g, -0.3]; i.mag *= 1 + 0.5 * g; i.late = 30 * g; i.blocked = g > 0.1;
      a.t0 -= 6 * g; a.mag *= 1 - 0.4 * g; l.dir = [0.95 - 0.5 * g, 0.3 + 0.4 * g, -0.1]; },
    mech: 'The posterior fascicle supplies the inferoposterior wall. With it blocked, activation starts superiorly and to the left (small r in I and aVL, q in III) and ends inferiorly and to the right: right axis deviation. It is rare on its own because the fascicle is broad and well supplied, so a right axis is first explained by right ventricular disease, a tall thin chest or a lateral infarct.',
    ecg: 'Axis +90° to +180°; rS in I and aVL, qR in III and aVF; QRS under 120 ms; a diagnosis of exclusion.' },
  { id: 'wpw', name: 'Pre-excitation (WPW)', param: { label: 'Share of the ventricle reached through the accessory pathway', min: 0, max: 1, step: 0.05, value: 0.6, fmt: (v) => v < 0.3 ? 'subtle delta wave' : (v < 0.7 ? 'clear pre-excitation' : 'mostly pre-excited') },
    apply: (S, g, R) => { S.vent.unshift({ id: 'pre', name: 'Pre-excited base (left lateral pathway)', t0: -45 * g, dur: 50, dir: [-0.35, 0.55, 0.55], mag: 0.55 * g, via: 'ap' }); S.vent.forEach(x => { if (x.id !== 'pre') { x.t0 += 6 * g; x.mag *= 1 - 0.3 * g; } }); R.pr = 160 - 45 * g; },
    mech: 'An accessory pathway (a bundle of Kent) connects atrium to ventricle outside the AV node, here on the left lateral wall. It has no AV-nodal delay, so the ventricle beside it starts to depolarise before the normal wavefront arrives: the PR is short and the QRS begins with a slurred upstroke, the delta wave, whose direction is that of the pre-excited muscle (positive in V1 for a left-sided pathway). The rest of the ventricle is then reached through the normal system, so the QRS is a fusion of the two; the more muscle the pathway captures, the wider the QRS and the larger the delta. The pathway is also the re-entrant limb of the tachycardias these patients get.',
    ecg: 'PR under 120 ms; delta wave; QRS over 110 ms; secondary ST-T changes; the delta polarity locates the pathway.' },
  { id: 'avb1', name: 'First-degree AV block', param: { label: 'PR interval', min: 200, max: 360, step: 10, value: 260, unit: 'ms', fmt: (v) => v + ' ms' },
    apply: (S, g, R) => { R.pr = g; },
    mech: 'Every atrial impulse reaches the ventricles, but conduction through the AV node (occasionally the His–Purkinje system) is slow, so the gap between P and QRS lengthens. The QRS itself is unchanged. The slider sets the PR interval.',
    ecg: 'PR > 200 ms, constant; every P followed by a QRS.' },
  { id: 'mobitz1', name: 'Second-degree AV block, Mobitz I (Wenckebach)', param: null,
    rhythm: 'wenck',
    mech: 'The AV node tires with each beat: the PR lengthens from beat to beat (the increments shrinking) until one P is not conducted at all, then the cycle restarts with a short PR. The dropped beat makes a pause shorter than two P–P intervals. The block is in the node, so the QRS is narrow and the condition is usually benign.',
    ecg: 'Progressive PR prolongation then a dropped QRS (here 4:3); grouped beating; narrow QRS.' },
  { id: 'mobitz2', name: 'Second-degree AV block, Mobitz II', param: null,
    rhythm: 'mobitz2',
    mech: 'Conduction fails abruptly below the AV node, in the His–Purkinje system: the PR is constant on the conducted beats and then a P is simply dropped, without warning. Because the disease is infranodal the QRS is often wide (here with a right bundle branch block) and progression to complete block is likely: this pattern usually needs a pacemaker.',
    ecg: 'Constant PR with intermittent non-conducted P waves (here 3:2); QRS often wide.' },
  { id: 'chb', name: 'Third-degree (complete) AV block', param: null,
    rhythm: 'chb',
    mech: 'No atrial impulse reaches the ventricles. The atria keep the sinus rate; the ventricles are driven by an escape pacemaker below the block, slower and independent, so the P waves march through the QRS complexes without any relation (AV dissociation with a ventricular rate slower than the atrial rate). A junctional escape (block at the node) gives a narrow QRS at 40–60/min; a ventricular escape (block below the His) gives a wide QRS at 20–40/min, as drawn here.',
    ecg: 'P and QRS independent; atrial rate faster than the ventricular rate; a regular escape rhythm, wide and slow when ventricular.' }
];

/* ------------------------------------------------------------ the beat
   The dipole at time t (ms from the start of the QRS) and the ECG from it. A smooth bump sin²(πu) stands for the
   activating wavefront; repolarisation is a wider, lower bump later, pointed the normal way (concordant) for muscle
   activated on time and the opposite way for muscle activated late. */
function bump(u) { return (u <= 0 || u >= 1) ? 0 : Math.pow(Math.sin(Math.PI * u), 2); }
function dipole(S, t, opts) {
  const v = [0, 0, 0];
  const add = (dir, w) => { v[0] += dir[0] * w; v[1] += dir[1] * w; v[2] += dir[2] * w; };
  S.vent.forEach(x => {
    add(x.dir, x.mag * bump((t - x.t0) / x.dur));
    // repolarisation: 240–360 ms after activation, concordant unless the region was reached late
    const late = x.late || 0, conc = 1 - 1.9 * Math.min(1, late / 44);
    add(x.dir, x.mag * 0.26 * conc * bump((t - (x.t0 + 220 + x.dur * 0.6)) / 170));
  });
  if (opts && opts.p !== undefined) S.atria.forEach(x => { add(x.dir, x.mag * bump((t - opts.p - x.t0) / x.dur)); add(x.dir, -x.mag * 0.25 * bump((t - opts.p - x.t0 - 60) / 90)); });   // atrial repolarisation, small and opposite
  return v;
}
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function leadVec(name) { return LEADS.filter(l => l[0] === name)[0][1]; }

/* the sequence for a scenario at a degree: adjusted segments, PR and the measurements that follow from them */
function sequence(scn, g) {
  const S = normalSegments(), R = { pr: 160, rate: 72 };
  if (scn && scn.apply) scn.apply(S, g, R);
  const qrsEnd = Math.max.apply(null, S.vent.map(x => x.t0 + x.dur)), qrsStart = Math.min.apply(null, S.vent.map(x => x.t0));
  // the mean QRS vector in the frontal plane: integrate the dipole over the QRS
  let fx = 0, fy = 0; for (let t = qrsStart; t <= qrsEnd; t += 2) { const d = dipole(S, t); fx += d[0]; fy += d[1]; }
  const axis = Math.round(Math.atan2(fy, fx) / d2r);
  return { S: S, R: R, qrs: Math.round(qrsEnd - qrsStart), qrsStart: qrsStart, qrsEnd: qrsEnd, pr: Math.round(R.pr + qrsStart), axis: axis, pDur: 86 };
}

/* ------------------------------------------------------------ the strip
   Beats over `secs` seconds: for each, the P onset and the QRS onset (null when the P is not conducted). */
function beats(scn, seq, secs) {
  const out = [], rate = seq.R.rate, pp = 60000 / rate, pr = seq.R.pr, rhythm = scn && scn.rhythm;
  if (rhythm === 'chb') {
    for (let t = 120; t < secs * 1000; t += pp) out.push({ p: t, q: null });
    for (let t = 420; t < secs * 1000; t += 60000 / 34) out.push({ p: null, q: t, escape: true });
    return out.sort((a, b) => (a.p !== null ? a.p : a.q) - (b.p !== null ? b.p : b.q));
  }
  let i = 0;
  for (let t = 120; t < secs * 1000; t += pp, i++) {
    if (rhythm === 'wenck') { const k = i % 4; out.push({ p: t, q: k === 3 ? null : t + [160, 240, 300][k] }); }
    else if (rhythm === 'mobitz2') { out.push({ p: t, q: i % 3 === 2 ? null : t + pr }); }
    else out.push({ p: t, q: t + pr });
  }
  return out;
}
/* the voltage of a lead at time T (ms into the strip) */
function voltageAt(leadName, seq, bts, T) {
  const L = leadVec(leadName); let v = 0;
  for (let i = 0; i < bts.length; i++) {
    const b = bts[i];
    if (b.q !== null && T >= b.q - 80 && T < b.q + 520) v += dot(dipole(seq.S, T - b.q), L);
    if (b.p !== null && T >= b.p - 10 && T < b.p + 260) { const S = seq.S; let w = 0; S.atria.forEach(x => { w += dot(x.dir, L) * x.mag * bump((T - b.p - x.t0) / x.dur); w += dot(x.dir, L) * -x.mag * 0.25 * bump((T - b.p - x.t0 - 60) / 90); }); v += w; }
  }
  return v;
}
/* which regions and paths are active at time T of the strip (for the heart drawing): 0 resting, 0–1 depolarising
   (the front), 1 depolarised, 1–2 repolarising back to rest */
function stateAt(seq, bts, T) {
  const st = { regions: {}, paths: {}, phase: 'rest' };
  const S = seq.S;
  bts.forEach(b => {
    if (b.p !== null) S.atria.forEach(x => { const u = (T - b.p - x.t0) / x.dur, r = (T - b.p - x.t0 - 60) / 90; if (u > 0 && u < 1) { st.regions[x.id] = Math.max(st.regions[x.id] || 0, u); st.paths[x.via] = 1; } else if (u >= 1 && r < 1) st.regions[x.id] = Math.max(st.regions[x.id] || 0, r > 0 ? 1 + r : 1); });
    if (b.p !== null && b.q !== null && T > b.p + 60 && T < b.q) { st.paths.av = 1; st.phase = 'av'; }
    if (b.p !== null && b.q === null && T > b.p + 60 && T < b.p + 260) { st.paths.avblock = 1; }
    if (b.q !== null) S.vent.forEach(x => {
      const u = (T - b.q - x.t0) / x.dur, r = (T - b.q - (x.t0 + 220 + x.dur * 0.6)) / 170;
      if (u > 0 && u < 1) { st.regions[x.id] = Math.max(st.regions[x.id] || 0, u); st.paths[x.via] = 1; if (!b.escape) { st.paths.his = 1; } }
      else if (u >= 1 && r < 1) st.regions[x.id] = Math.max(st.regions[x.id] || 0, r > 0 ? 1 + r : 1);
    });
  });
  return st;
}

/* ------------------------------------------------------------ topics */
const T = {};
T.ecglab = { title: 'How conduction writes the ECG', kicker: 'Watch the wavefront, read the leads', blocks: [
  { p: 'Pick a conduction disorder and play the beat. The heart on the left lights up region by region as the wavefront passes, the twelve leads on the right are written by the same wavefront — each lead sees the mean electrical vector projected onto its own direction — and the dial shows that vector swinging round in the frontal plane. Drag the slider to make a block partial or complete and watch the complexes change shape for the reason they do in a patient.' },
  { widget: 'ecg' },
  { h: 'The rule behind every trace', ul: [
    'A wavefront moving toward a lead writes a positive deflection, away from it a negative one; the size follows the mass of muscle depolarising and how squarely it faces the lead.',
    'The ventricles are activated in a fixed order through the His–Purkinje system in about 80 ms: septum (left to right), apex and anterior wall, right ventricle and left ventricle together, posterobasal wall last. That order is why V1 is rS and V6 is qR, and why the QRS is narrow.',
    'Anything that takes a region out of the Purkinje system — a blocked bundle, a blocked fascicle, an accessory pathway, a ventricular focus — makes that region depolarise muscle to muscle: late, slow and unopposed. The QRS widens and gains a slurred or notched part pointing at the region that was left behind.',
    'Muscle activated late also repolarises late, so the T wave turns away from the delayed forces (secondary ST-T changes, discordant to the terminal QRS). A T wave that stays concordant in a bundle branch block is itself abnormal.',
    'The PR interval is AV-nodal time. First-degree block lengthens it; Wenckebach lengthens it progressively until a beat drops; Mobitz II drops beats with a constant PR because the failure is below the node; complete block divorces P from QRS.'] },
  { h: 'Where the model stops', p: 'This is a dipole model with seven ventricular regions and the textbook lead directions: good for the shapes and the reasons, not for measuring a patient. Real hearts rotate, chests vary, infarcts remove muscle and drugs slow conduction; the criteria quoted beside each scenario are the ones to read a tracing by.' },
  { src: ['Surawicz B, Childers R, Deal BJ, et al. AHA/ACCF/HRS recommendations for the standardization and interpretation of the electrocardiogram, part III: intraventricular conduction disturbances. Circulation 2009;119:e235–40.', 'Kusumoto FM, et al. 2018 ACC/AHA/HRS guideline on the evaluation and management of patients with bradycardia and cardiac conduction delay. Circulation 2019;140:e382–482.', 'Durrer D, et al. Total excitation of the isolated human heart. Circulation 1970;41:899–912 (the activation sequence).'] }
] };

const GROUPS = [{ title: 'Conduction and the ECG', ids: ['ecglab'] }];
root.PFT_ECG = { topics: T, groups: GROUPS, LEADS: LEADS, LAYOUT: LAYOUT, SCENARIOS: SCENARIOS, normalSegments: normalSegments, sequence: sequence, beats: beats, voltageAt: voltageAt, stateAt: stateAt, dipole: dipole, leadVec: leadVec };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PFT_ECG;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
