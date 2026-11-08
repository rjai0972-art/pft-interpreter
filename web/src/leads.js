/* PulmCrit Daddy — Learn: where the leads go, and what a wrong or missing electrode does to the tracing (v8.5).
   The twelve leads are not twelve wires: ten electrodes give ten potentials, and the machine makes the leads out of them.
   Each electrode sees the heart's dipole from where it sits — its potential is the dipole projected onto the direction
   from the heart to the electrode — and the leads are differences: I = LA − RA, II = LL − RA, III = LL − LA; the
   augmented leads compare one limb with the mean of the other two; every chest lead compares its electrode with the
   Wilson central terminal, the mean of the three limb electrodes. So swapping two cables permutes the potentials before
   the subtraction, an electrode that is off puts noise into every lead that uses it (the chest leads too, through the
   terminal), and an electrode in the wrong place sees the heart from the wrong angle. The source of the dipole is the
   conduction bench's model (conduction.js), so any of its presets can be looked at through a wrong set of electrodes.
   Frame: x toward the patient's left, y inferior, z anterior. Positions are unit vectors from the heart's centre. */
(function (root) {
'use strict';
const C = root.PFT_COND || (typeof require === 'function' ? require('./conduction.js') : null);
const E = root.PFT_ECG || (typeof require === 'function' ? require('./ecg.js') : null);
const SQ3 = Math.sqrt(3);

/* ---- the electrodes: where each one goes, in words, and the direction it sees the heart from when it is there.
   The limb electrodes stand at the corners of Einthoven's triangle (so the Wilson terminal is zero for a correct set);
   the chest electrodes carry the textbook lead directions. `torso` is the drawing position (0–360 × 0–470). */
const ELECTRODES = [
  { id: 'RA', name: 'Right arm', colour: '#e6e6e6', where: 'Right arm — anywhere on the limb (wrist or upper arm), never on the trunk. Colour code: white (AHA) / red (IEC).', vec: [-0.5, -1 / (2 * SQ3), 0], torso: [40, 215], limb: true },
  { id: 'LA', name: 'Left arm', colour: '#1a1a1a', where: 'Left arm — the matching point on the other limb. Black (AHA) / yellow (IEC).', vec: [0.5, -1 / (2 * SQ3), 0], torso: [380, 215], limb: true },
  { id: 'LL', name: 'Left leg', colour: '#d43a3a', where: 'Left leg — ankle or thigh; the positive pole of II, III and aVF. Red (AHA) / green (IEC).', vec: [0, 1 / SQ3, 0], torso: [245, 458], limb: true },
  { id: 'RL', name: 'Right leg', colour: '#3a9a4a', where: 'Right leg — the reference (“ground”): it drives the common-mode voltage out of the other nine and writes no lead itself. Green (AHA) / black (IEC).', vec: [0, 1 / SQ3, 0], torso: [155, 458], limb: true, ground: true },
  { id: 'V1', name: 'V1', colour: '#d43a3a', where: '4th intercostal space at the right sternal border. Find the angle of Louis (the sternal angle, where the 2nd rib joins); the space below the 2nd rib is the 2nd interspace; count down two.', vec: [-0.5, 0.05, 0.86], torso: [183, 246] },
  { id: 'V2', name: 'V2', colour: '#e8c02a', where: '4th intercostal space at the left sternal border, directly opposite V1.', vec: [-0.15, 0.08, 0.98], torso: [217, 246] },
  { id: 'V3', name: 'V3', colour: '#3a9a4a', where: 'Midway between V2 and V4 — place V4 first.', vec: [0.3, 0.15, 0.94], torso: [233, 264] },
  { id: 'V4', name: 'V4', colour: '#3a7ad4', where: '5th intercostal space in the mid-clavicular line (not the nipple: the nipple moves, the line does not).', vec: [0.62, 0.22, 0.75], torso: [250, 282] },
  { id: 'V5', name: 'V5', colour: '#c9622e', where: 'Anterior axillary line at the level of V4 — horizontally level, not following the rib space downward.', vec: [0.86, 0.22, 0.45], torso: [275, 282] },
  { id: 'V6', name: 'V6', colour: '#7a3ad4', where: 'Mid-axillary line at the level of V4.', vec: [0.97, 0.18, 0.15], torso: [300, 282] }
];
const CHEST = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const LEAD_NAMES = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
/* which electrodes each lead is made from (for the highlights) */
const LEAD_USES = { I: ['LA', 'RA'], II: ['LL', 'RA'], III: ['LL', 'LA'], aVR: ['RA', 'LA', 'LL'], aVL: ['LA', 'RA', 'LL'], aVF: ['LL', 'RA', 'LA'], V1: ['V1', 'RA', 'LA', 'LL'], V2: ['V2', 'RA', 'LA', 'LL'], V3: ['V3', 'RA', 'LA', 'LL'], V4: ['V4', 'RA', 'LA', 'LL'], V5: ['V5', 'RA', 'LA', 'LL'], V6: ['V6', 'RA', 'LA', 'LL'] };

/* ---- the drawing's geometry, so a dragged electrode gets a direction. The chest is a cylinder (radius CW px about the
   midline CX) unrolled on the drawing: the angle round the chest grows linearly with the distance from the midline,
   90° at the silhouette's edge (the mid-axillary line) and on round the back beyond it, so V7–V9 can be placed. The
   heart's centre sits a little left of the sternum and a third of the way back. A limb electrode is a point in the
   frontal plane. The direction of a moved electrode is the canonical direction turned by the angle it has moved
   through as seen from the heart, scaled by how much nearer or farther it is — the standard spots give the textbook
   directions exactly. (viewBox 0 0 420 480) */
const GEO = { CX: 200, CW: 100, HX: 220, HY: 255, HZ: 38 };
function surface(x, y, flat) {
  if (flat) return [x - GEO.CX, y, 0];
  const u = Math.max(-2, Math.min(2, (x - GEO.CX) / GEO.CW)), th = u * Math.PI / 2;
  return [Math.sin(th) * GEO.CW, y, Math.cos(th) * GEO.CW];                     // x left, y down, z anterior
}
function fromHeart(p, flat) { const d = [p[0] - (GEO.HX - GEO.CX), p[1] - GEO.HY, p[2] - (flat ? 0 : GEO.HZ)]; const n = Math.hypot(d[0], d[1], d[2]) || 1; return { u: [d[0] / n, d[1] / n, d[2] / n], r: n }; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function rotateTo(v, a, b) {   // rotate v by the rotation that takes unit a to unit b (Rodrigues)
  const k = cross(a, b), s = Math.hypot(k[0], k[1], k[2]), c = dot(a, b);
  if (s < 1e-6) return c > 0 ? v.slice() : [-v[0], -v[1], -v[2]];
  const kk = [k[0] / s, k[1] / s, k[2] / s], kv = cross(kk, v), kd = dot(kk, v);
  return [v[0] * c + kv[0] * s + kk[0] * kd * (1 - c), v[1] * c + kv[1] * s + kk[1] * kd * (1 - c), v[2] * c + kv[2] * s + kk[2] * kd * (1 - c)];
}
/* the direction (and gain) an electrode sees from a drawing position */
function vecAt(e, pos) {
  const std = fromHeart(surface(e.torso[0], e.torso[1], e.limb), e.limb), now = fromHeart(surface(pos[0], pos[1], e.limb), e.limb);
  const v = rotateTo(e.vec, std.u, now.u), g = e.limb ? Math.pow(std.r / now.r, 1.0) : Math.pow(std.r / now.r, 2.0);   // a dipole's potential falls with the square of the distance; a limb is an extension of the torso, so its electrode is gentler
  return [v[0] * g, v[1] * g, v[2] * g];
}

/* ---- a set-up: for each cable (the socket on the machine), which electrode is on it, where that electrode sits,
   and whether it is attached. `swap` exchanges two cables; `off` detaches one; `move` moves one. */
function setup() {
  const s = { cables: {}, pos: {}, off: {}, mirror: false, hum: 0 };
  ELECTRODES.forEach(e => { s.cables[e.id] = e.id; s.pos[e.id] = e.torso.slice(); });
  return s;
}
function clone(s) { return { cables: Object.assign({}, s.cables), pos: Object.keys(s.pos).reduce((o, k) => { o[k] = s.pos[k].slice(); return o; }, {}), off: Object.assign({}, s.off), mirror: s.mirror, hum: s.hum }; }
function swap(s, a, b) { const t = s.cables[a]; s.cables[a] = s.cables[b]; s.cables[b] = t; return s; }
/* the direction each CABLE sees: the electrode plugged into it, where that electrode is */
function cableVecs(s) {
  const out = {};
  Object.keys(s.cables).forEach(cable => {
    const eid = s.cables[cable], e = ELECTRODES.filter(x => x.id === eid)[0];
    out[cable] = vecAt(e, s.pos[eid]);
  });
  return out;
}

/* ---- the twelve leads from the ten potentials.
   `D` is the heart's dipole (mV·direction), `noise(id, T)` the potential of an electrode that is off. */
const NOISE = { amp: 0.9 };
function noiseAt(id, T) {   // what a floating input writes: mains hum, baseline wander, a little hiss — different per electrode
  const seed = id.charCodeAt(0) * 7 + id.charCodeAt(id.length - 1);
  return NOISE.amp * (0.45 * Math.sin(2 * Math.PI * 60 * T / 1000 + seed) + 0.5 * Math.sin(2 * Math.PI * 0.35 * T / 1000 + seed * 0.7) + 0.25 * Math.sin(2 * Math.PI * 1.9 * T / 1000 + seed * 1.3) + 0.12 * Math.sin(T * 1.7 + seed));
}
function potentials(s, vecs, D, T) {
  const phi = {};
  ['RA', 'LA', 'LL', 'RL'].concat(CHEST).forEach(cable => {
    const eid = s.cables[cable];
    phi[cable] = s.off[eid] ? noiseAt(eid, T) : dot(D, vecs[cable]);
  });
  return phi;
}
function leadsFrom(phi) {
  const wct = (phi.RA + phi.LA + phi.LL) / 3;
  const out = { I: phi.LA - phi.RA, II: phi.LL - phi.RA, III: phi.LL - phi.LA, aVR: phi.RA - (phi.LA + phi.LL) / 2, aVL: phi.LA - (phi.RA + phi.LL) / 2, aVF: phi.LL - (phi.RA + phi.LA) / 2 };
  CHEST.forEach(v => { out[v] = phi[v] - wct; });
  return out;
}

/* ---- the dipole of the bench's strip at time T (the same sum conduction.js projects onto a lead), with the extras */
function dipoleAt(st, T) {
  const cfg = st.cfg, D = [0, 0, 0]; let spike = 0;
  for (let i = 0; i < st.bts.length; i++) {
    const b = st.bts[i];
    if (b.q !== null && b.q !== undefined && T >= b.q - 80 && T < b.q + 620) { const d = C.dipole(b.seq.S, T - b.q, cfg); D[0] += d[0]; D[1] += d[1]; D[2] += d[2]; if (b.spike && T >= b.q - 2 && T < b.q + 2) spike = 0.9; }
    if (b.p !== null && b.p !== undefined && T >= b.p - 10 && T < b.p + 300) { const d = C.dipoleP(st.seq.S, T - b.p); D[0] += d[0]; D[1] += d[1]; D[2] += d[2]; }
  }
  if (cfg.sa.mode === 'af') { const f = 0.035 * (Math.sin(T / 31) + Math.sin(T / 47 + 1) + 0.6 * Math.sin(T / 19 + 2)); D[0] += 0.3 * f; D[1] += 0.5 * f; D[2] += 0.4 * f; }
  if (cfg.sa.mode === 'flutter') { const ph = ((T - 100) % 200) / 200, f = 0.16 * (ph < 0.8 ? 1 - 2 * ph / 0.8 : -1 + 2 * (ph - 0.8) / 0.2); D[0] += -0.1 * f; D[1] += -0.9 * f; D[2] += 0.2 * f; }
  return { D: D, spike: spike };
}
/* the twelve leads at T for a set-up */
function tracesAt(s, vecs, st, T) {
  const d = dipoleAt(st, T), D = s.mirror ? [-d.D[0], d.D[1], d.D[2]] : d.D;
  const phi = potentials(s, vecs, D, T), L = leadsFrom(phi);
  if (d.spike) LEAD_NAMES.forEach(k => { L[k] += d.spike; });
  if (s.hum) LEAD_NAMES.forEach(k => { L[k] += s.hum * Math.sin(2 * Math.PI * 60 * T / 1000); });
  if (s.off[s.cables.RL]) LEAD_NAMES.forEach(k => { L[k] += 0.12 * Math.sin(2 * Math.PI * 60 * T / 1000) + 0.04 * Math.sin(2 * Math.PI * 0.4 * T / 1000); });
  return L;
}
/* a voltage function for the paper: lead name and T → mV */
function voltageFn(s, st) { const vecs = cableVecs(s); return (lead, T) => tracesAt(s, vecs, st, T)[lead]; }

/* ---- the mishaps, as the user would make them */
const MISHAPS = [
  { id: 'ok', name: 'Correct placement', group: 'Correct', apply: (s) => s, teach: 'Ten electrodes, twelve leads. Each lead is a difference of potentials, so the picture is only as good as the electrodes behind it.' },
  { id: 'ra_la', name: 'RA ↔ LA reversed', group: 'Limb cables swapped', apply: (s) => swap(s, 'RA', 'LA'), teach: 'The commonest error. Lead I turns upside down, II and III trade places, aVR and aVL trade places, aVF and the chest leads are untouched (the Wilson terminal is the same three electrodes in any order). The give-away: a positive P wave in aVR with a negative P in I. Dextrocardia does the same to the limb leads — but there the chest leads lose their R-wave progression too; here they are normal.' },
  { id: 'ra_rl', name: 'RA ↔ RL reversed', group: 'Limb cables swapped', apply: (s) => swap(s, 'RA', 'RL'), teach: 'The right-arm socket now reads the right leg, which sits at almost the same potential as the left leg. Lead II (LL − “RA”) collapses to a near-flat line, lead I becomes the mirror of III, and aVR and aVF look alike. A flat lead II with everything else of normal size is this reversal.' },
  { id: 'la_ll', name: 'LA ↔ LL reversed', group: 'Limb cables swapped', apply: (s) => swap(s, 'LA', 'LL'), teach: 'The subtle one. Leads I and II trade places, III turns upside down, aVL and aVF trade places, aVR is unchanged. Easy to miss when the axis is near +45°; the clue is a P wave in I taller than in II (normally II has the tallest P), or an isolated inverted P in III.' },
  { id: 'ra_ll', name: 'RA ↔ LL reversed', group: 'Limb cables swapped', apply: (s) => swap(s, 'RA', 'LL'), teach: 'Leads I, II and III all invert (I and III trade and invert; II inverts), aVR and aVF trade places. The whole frontal plane turns over: P, QRS and T inverted in II with a positive P in aVR.' },
  { id: 'la_rl', name: 'LA ↔ RL reversed', group: 'Limb cables swapped', apply: (s) => swap(s, 'LA', 'RL'), teach: 'The left-arm socket reads the right leg, which matches the left leg: lead III (LL − “LA”) goes nearly flat; lead I becomes a copy of II; aVL and aVF look alike.' },
  { id: 'off_ra', name: 'RA fell off', group: 'An electrode off', apply: (s) => { s.off.RA = true; return s; }, teach: 'A floating input writes mains hum and wander. RA is in I, II and aVR directly, in aVL and aVF through the averaged pair, and in every chest lead through the Wilson terminal: one electrode takes the whole tracing with it, which is why the machine says “lead off” rather than letting you read the rest.' },
  { id: 'off_ll', name: 'LL fell off', group: 'An electrode off', apply: (s) => { s.off.LL = true; return s; }, teach: 'II, III and aVF carry the noise directly; I is spared (LA − RA), aVR and aVL a little, the chest leads through the terminal.' },
  { id: 'off_rl', name: 'RL fell off', group: 'An electrode off', apply: (s) => { s.off.RL = true; return s; }, teach: 'The right leg writes no lead, so no lead disappears — but it is the reference that cancels the body’s common-mode mains pick-up, and without it every lead carries a 50/60 Hz hum. A fine regular fuzz on all twelve leads at once is the ground, not the heart.' },
  { id: 'off_v3', name: 'V3 fell off', group: 'An electrode off', apply: (s) => { s.off.V3 = true; return s; }, teach: 'A chest electrode is only in its own lead: V3 is noise, the other eleven are fine. One bad lead among good ones is that lead’s own electrode.' },
  { id: 'v1_v2', name: 'V1 ↔ V2 reversed', group: 'Chest cables', apply: (s) => swap(s, 'V1', 'V2'), teach: 'The R wave is taller in V1 than in V2 and the step in R-wave progression goes backward for one lead. Any non-monotonic R progression between neighbours (V1 > V2, or V3 < V2 < V4) is a swapped pair until proved otherwise.' },
  { id: 'v_rev', name: 'V1–V6 reversed', group: 'Chest cables', apply: (s) => { swap(s, 'V1', 'V6'); swap(s, 'V2', 'V5'); swap(s, 'V3', 'V4'); return s; }, teach: 'Reverse R-wave progression: a tall R in “V1” falling to an rS in “V6”. Looks like dextrocardia, but the limb leads are normal.' },
  { id: 'v12_high', name: 'V1 and V2 two spaces too high', group: 'Chest electrodes misplaced', apply: (s) => { s.pos.V1 = [183, 210]; s.pos.V2 = [217, 210]; return s; }, teach: 'The commonest misplacement: the electrodes go on the 2nd interspace (just below the clavicle) instead of the 4th. From up there the electrode looks down at the heart: the P wave in V1 turns negative or biphasic, a terminal r′ appears in V1 (an incomplete-RBBB look, or a Brugada-like pattern), and the R in V2 shrinks (a pseudo-anteroseptal infarct). Count down from the angle of Louis.' },
  { id: 'v456_low', name: 'V4–V6 too low and lateral', group: 'Chest electrodes misplaced', apply: (s) => { s.pos.V4 = [256, 332]; s.pos.V5 = [282, 326]; s.pos.V6 = [306, 320]; return s; }, teach: 'Placed under the breast or down the rib space instead of level with V4 in the 5th interspace. The electrodes are farther from the ventricles and see them from below: the R in V4–V6 is smaller, R-wave progression looks poor or late, the inferior-lateral T may flatten. Lift the breast and place under it, level.' },
  { id: 'mason', name: 'Limb electrodes on the torso (Mason–Likar)', group: 'Limb electrodes misplaced', apply: (s) => { s.pos.RA = [112, 150]; s.pos.LA = [288, 150]; s.pos.LL = [252, 372]; s.pos.RL = [148, 372]; return s; }, teach: 'Monitoring and exercise systems put the arm electrodes under the clavicles and the leg electrodes on the lower abdomen. The leads are still made the same way, but the electrodes see the heart from a different angle: the axis moves rightward, R in I and aVL shrinks (an inferior-lead Q may appear or vanish), the inferior voltages grow. A 12-lead taken this way is not interchangeable with a standard one — compare like with like.' },
  { id: 'right', name: 'Right-sided chest leads V3R–V6R (on purpose)', group: 'Extra leads', apply: (s) => { s.pos.V3 = [167, 264]; s.pos.V4 = [150, 282]; s.pos.V5 = [125, 282]; s.pos.V6 = [100, 282]; return s; }, teach: 'Mirror the chest leads onto the right side when an inferior infarct could involve the right ventricle: ST elevation of 1 mm in V4R is the sign (choose the inferior STEMI source). On a normal heart the right-sided leads just show small rS complexes.' },
  { id: 'posterior', name: 'Posterior leads V7–V9 (on purpose)', group: 'Extra leads', apply: (s) => { s.pos.V4 = [330, 282]; s.pos.V5 = [356, 282]; s.pos.V6 = [385, 282]; return s; }, teach: 'V7 at the posterior axillary line, V8 at the tip of the scapula, V9 beside the spine, all level with V6. ST elevation of 0.5 mm there confirms a posterior infarct whose only anterior sign was ST depression with tall R in V1–V3.' },
  { id: 'dextro', name: 'Dextrocardia (not an error — the look-alike)', group: 'Look-alikes', apply: (s) => { s.mirror = true; return s; }, teach: 'The heart is the mirror image: positive P in aVR and inverted I like an RA/LA reversal, but the chest leads lose their R progression too (the heart is moving away from V6). Right-sided chest leads with the limb cables kept as they are give the readable tracing.' }
];
function mishap(id) { const m = MISHAPS.filter(x => x.id === id)[0] || MISHAPS[0]; const s = setup(); return m.apply(s); }

/* ---- reading the traces for the clues: measured from the tracing, not from the set-up */
function measure(vfn, st) {
  const beats = st.bts.filter(b => b.q !== null && b.q !== undefined && b.p !== null && b.p !== undefined), b = beats[1] || beats[0] || st.bts.filter(b => b.q !== null && b.q !== undefined)[1];
  const out = { p: {}, qrs: {}, r: {}, noise: {}, st: {}, flat: {} };
  if (!b) return out;
  const q = b.q, p = b.p, s = b.seq;
  LEAD_NAMES.forEach(L => {
    const base = vfn(L, q - 70);
    let pk = 0; if (p !== null && p !== undefined) for (let t = p + 10; t < p + 110; t += 4) { const v = vfn(L, t) - base; if (Math.abs(v) > Math.abs(pk)) pk = v; }
    let mx = -9, mn = 9; for (let t = q + s.qrsStart; t <= q + s.qrsEnd; t += 2) { const v = vfn(L, t) - base; if (v > mx) mx = v; if (v < mn) mn = v; }
    let hf = 0, n = 0; for (let t = q - 300; t < q - 100; t += 2) { hf += Math.abs(vfn(L, t) - vfn(L, t - 2)); n++; }
    out.p[L] = +pk.toFixed(3); out.qrs[L] = +(mx - mn).toFixed(3); out.r[L] = +Math.max(0, mx).toFixed(3); out.noise[L] = +(hf / n).toFixed(4); out.st[L] = +(vfn(L, q + s.qrsEnd + 60) - base).toFixed(3);
  });
  return out;
}
function read(vfn, st) {
  const m = measure(vfn, st), flags = [], noisy = LEAD_NAMES.filter(L => m.noise[L] > 0.04);
  const hasP = Object.keys(m.p).length && st.cfg.sa.mode === 'sinus';
  if (noisy.length) {
    const nz = noisy.map(L => m.noise[L]), uniform = Math.max.apply(null, nz) < 2.2 * Math.min.apply(null, nz);
    const quiet = ['I', 'II', 'III'].filter(L => noisy.indexOf(L) < 0), chest = CHEST.filter(L => noisy.indexOf(L) >= 0), limb = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'].filter(L => noisy.indexOf(L) >= 0);
    if (noisy.length === 12 && uniform) flags.push({ id: 'hum_all', text: 'A regular fuzz of the same size on every lead at once: the reference (right leg) electrode is off or poorly attached, or there is mains interference — not the heart, and not one of the nine recording electrodes.' });
    else if (chest.length === 1 && !limb.length) flags.push({ id: 'off_chest', text: 'Noise in ' + chest[0] + ' alone: that electrode is off or dry. The other eleven leads can be read.' });
    else if (limb.length) {
      const which = quiet.length === 1 ? { III: 'RA', I: 'LL', II: 'LA' }[quiet[0]] : null;
      flags.push({ id: 'off_limb', text: 'Noise in ' + limb.join(', ') + (chest.length ? ' and in the chest leads' : '') + (quiet.length === 1 ? ', with ' + quiet[0] + ' clean' : '') + ': a limb electrode is off' + (which ? ' — the one the clean bipolar lead does not use, ' + which : '') + '. The chest leads carry a third of it through the Wilson terminal.' });
    }
    else flags.push({ id: 'noise', text: 'Noise in ' + noisy.join(', ') + '.' });
    return { flags: flags, m: m };
  }
  // flat leads: a bipolar lead reading the two legs
  const flatII = m.qrs.II < 0.12 && m.qrs.I > 0.3 && m.qrs.III > 0.3, flatIII = m.qrs.III < 0.12 && m.qrs.I > 0.3 && m.qrs.II > 0.3;
  if (flatII) flags.push({ id: 'flat_ii', text: 'Lead II is nearly flat while I and III are of normal size: the right-arm cable is on the right leg (RA/RL reversal) — lead II is reading the two legs against each other.' });
  if (flatIII) flags.push({ id: 'flat_iii', text: 'Lead III is nearly flat while I and II are of normal size: the left-arm cable is on the right leg (LA/RL reversal).' });
  // the P waves
  if (hasP && !flatII && !flatIII) {
    const pAVR = m.p.aVR, pI = m.p.I, pII = m.p.II, pIII = m.p.III;
    const rProg = CHEST.map(L => m.r[L]), falling = rProg[0] > rProg[5] + 0.3 && rProg[1] > rProg[4];
    if (pAVR > 0.04 && pI < -0.02) flags.push({ id: 'p_avr', text: 'Positive P in aVR with a negative P in I: the arm cables are reversed (RA/LA)' + (falling ? ' — or dextrocardia, and here the chest leads lose their R-wave progression too, which a cable swap never does.' : '; the chest leads keep their normal R-wave progression, which rules out dextrocardia.') });
    else if (pI > pII + 0.02 && pII > 0 && pIII < -0.02) flags.push({ id: 'p_i_ii', text: 'P taller in I than in II and inverted in III: the left-arm and left-leg cables are reversed (LA/LL). Lead I is really II and lead III is upside down.' });
    else if (pII < -0.04 && pAVR > 0.04) flags.push({ id: 'p_inv', text: 'P, QRS and T inverted in II with a positive P in aVR: the right-arm and left-leg cables are reversed (RA/LL) — the whole frontal plane is turned over.' });
  }
  // the chest leads
  const r = CHEST.map(L => m.r[L]);
  if (r[0] > r[5] + 0.3 && r[0] > r[1] && r[1] > r[2]) { if (!flags.some(f => f.id === 'p_avr')) flags.push({ id: 'v_rev', text: 'Reverse R-wave progression (tall R in V1 falling to V6) with normal limb leads: the chest cables are in reverse order.' }); }
  else if (r[0] > r[1] + 0.05 && r[1] < r[2]) flags.push({ id: 'v1v2', text: 'R taller in V1 than in V2, then rising again: V1 and V2 are swapped. R-wave progression should never step backward between neighbours.' });
  else if (r[2] < r[1] - 0.05 && r[2] < r[3] - 0.05) flags.push({ id: 'v3', text: 'A dip in R-wave progression at V3: V3 is swapped with a neighbour or misplaced.' });
  if (hasP && m.p.V1 < -0.04 && m.p.V2 < -0.05 && r[1] < 0.3 && r[1] < r[2] - 0.2) flags.push({ id: 'v12_high', text: 'Negative P in V1 and V2 with a small R in V2 (and often a terminal r′ in V1): V1–V2 are too high on the chest, looking down at the atria. Count the interspaces from the angle of Louis before calling an anteroseptal infarct, incomplete RBBB or Brugada.' });
  if (m.r.I > 0.4 && r[5] < 0.3 * m.r.I && r[4] < 0.3 * m.r.I && r[3] < 0.3 * m.r.I && !flags.some(f => /v_rev|p_avr/.test(f.id))) flags.push({ id: 'v456_right', text: 'Small rS complexes in V4–V6 with a normal lead I: the lateral chest electrodes are not over the left ventricle — deliberately on the right side (V4R–V6R), or far off their marks.' });
  else if (m.r.I > 0.4 && r[5] < 0.85 * m.r.I && r[4] < 1.1 * m.r.I && r[2] >= r[1] - 0.05 && !flags.some(f => /v_rev|p_avr|v1v2|v3/.test(f.id))) flags.push({ id: 'v456_low', text: 'R in V5–V6 smaller than the R in lead I, with the rest of the progression normal: the lateral chest electrodes are too low or too far round (under the breast, or down the rib space), seeing the ventricle from below and farther away. Place them level with V4 in the 5th interspace.' });
  // Mason–Likar: a rightward axis with a small aVL

  if (!flags.length) flags.push({ id: 'none', text: 'Nothing in the tracing points at the electrodes: P upright in I and II, negative in aVR, R-wave progression rising from V1 to V5.' });
  return { flags: flags, m: m };
}

/* ---- versus the correct placement: the same heart through the standard electrodes, lead by lead */
function axisOf(vfn, st) {
  const b = st.bts.filter(x => x.q !== null && x.q !== undefined)[1] || st.bts.filter(x => x.q !== null && x.q !== undefined)[0]; if (!b) return null;
  let sI = 0, sF = 0; const bI = vfn('I', b.q - 70), bF = vfn('aVF', b.q - 70);
  for (let t = b.q + b.seq.qrsStart; t <= b.q + b.seq.qrsEnd; t += 2) { sI += vfn('I', t) - bI; sF += vfn('aVF', t) - bF; }
  return Math.round(Math.atan2(sF, sI) * 180 / Math.PI);
}
function compare(s, st) {
  const v0 = voltageFn(setup(), st), v1 = voltageFn(s, st), m0 = measure(v0, st), m1 = measure(v1, st), out = { leads: {}, axis0: axisOf(v0, st), axis1: axisOf(v1, st), changed: [] };
  LEAD_NAMES.forEach(L => {
    const a0 = m0.qrs[L] || 0.001, a1 = m1.qrs[L], ratio = a1 / a0;
    // inverted: the main QRS deflection changed sign (the net area over the QRS)
    const b = st.bts.filter(x => x.q !== null && x.q !== undefined)[1] || st.bts[0]; let n0 = 0, n1 = 0;
    if (b && b.q !== null && b.q !== undefined) for (let t = b.q + b.seq.qrsStart; t <= b.q + b.seq.qrsEnd; t += 2) { n0 += v0(L, t) - v0(L, b.q - 70); n1 += v1(L, t) - v1(L, b.q - 70); }
    const inv = n0 * n1 < 0 && Math.abs(n1) > 0.3 * Math.abs(n0), flat = a1 < 0.12 && a0 > 0.3, noisy = m1.noise[L] > 0.04;
    let what = noisy ? 'noise' : flat ? 'flat' : inv ? 'inverted' : ratio > 1.25 ? 'larger (×' + ratio.toFixed(1) + ')' : ratio < 0.8 ? 'smaller (×' + ratio.toFixed(2) + ')' : (Math.abs(m1.p[L] - m0.p[L]) > 0.08 || Math.abs(m1.r[L] - m0.r[L]) > 0.25 ? 'changed shape' : 'same');
    out.leads[L] = { what: what, ratio: +ratio.toFixed(2), inv: inv, flat: flat, noisy: noisy };
    if (what !== 'same') out.changed.push(L);
  });
  return out;
}
/* ---- topic */
const T = {};
T.leads = { title: 'Where the leads go', kicker: 'Ten electrodes, twelve leads — and what a wrong or missing one does to the tracing', blocks: [
  { p: 'A 12-lead is made from ten electrodes: four on the limbs and six across the chest. The machine subtracts their potentials to write the leads, so an electrode in the wrong place sees the heart from the wrong angle, two cables swapped permute the leads, and an electrode that falls off puts noise into every lead that uses it — including, for a limb electrode, all six chest leads through the Wilson central terminal. Drag an electrode, swap two cables, or pick a mishap, and read the twelve leads it writes; the reading beside the paper names the clues the tracing gives.' },
  { widget: 'leads' },
  { h: 'The placement rules', ul: [
    'Limb electrodes: anywhere on the limb, the same place on both sides; distal (wrists and ankles) is the standard. On the trunk (the monitoring, Mason–Likar position) the axis and the voltages change — a tracing taken that way is not a standard 12-lead.',
    'The right leg is the reference: it writes no lead but cancels the mains pick-up for all of them. Hum on all twelve leads at once is the right-leg electrode, not the patient.',
    'Find the angle of Louis (the sternal angle): the 2nd rib joins the sternum there, the space just below it is the 2nd interspace. Count down to the 4th for V1 (right sternal border) and V2 (left sternal border).',
    'V4 goes in the 5th interspace in the mid-clavicular line — then V3 halfway between V2 and V4, V5 in the anterior axillary line and V6 in the mid-axillary line, both horizontally level with V4 (not following the interspace downward). In women, place V4–V6 under the breast, level.',
    'Clues to a swap: a positive P in aVR (RA/LA), a flat lead II (RA/RL) or III (LA/RL), a P in I taller than in II (LA/LL), R-wave progression that steps backward (V1/V2) or runs in reverse (V1–V6 reversed, or dextrocardia if the limb leads are odd too).',
    'Clues to a misplacement: a negative P in V1–V2 with a small R in V2 and an r′ in V1 means V1–V2 are too high; small lateral R waves with normal limb leads mean V4–V6 are too low or too lateral.'] },
  { h: 'Why one limb electrode spoils the chest leads', p: 'Each chest lead is its electrode minus the Wilson central terminal — the average of RA, LA and LL. A swap of RA and LA leaves the terminal unchanged (the same three potentials averaged), which is why RA/LA reversal spares the chest leads. An electrode that is off, though, puts noise into the average, so all six chest leads carry a third of it. And since the right leg is not in the terminal, the RA/RL swap does not spoil the chest leads at all — only lead II goes flat.' },
  { src: ['Kligfield P, et al. AHA/ACCF/HRS recommendations for the standardization and interpretation of the electrocardiogram, part I: the electrocardiogram and its technology. Circulation 2007;115:1306–24.', 'Batchvarov VN, Malik M, Camm AJ. Incorrect electrode cable connection during electrocardiographic recording. Europace 2007;9:1081–90.', 'García-Niebla J, et al. Technical mistakes during the acquisition of the electrocardiogram. Ann Noninvasive Electrocardiol 2009;14:389–403.', 'Rautaharju PM, et al. Comparison of 12-lead ECGs from torso and limb electrodes (Mason–Likar). Am Heart J 1980 (the effect of torso placement).'] }
] };
const GROUPS = [{ title: 'The electrodes', ids: ['leads'] }];
root.PFT_LEADS = { topics: T, groups: GROUPS, ELECTRODES: ELECTRODES, CHEST: CHEST, LEAD_NAMES: LEAD_NAMES, LEAD_USES: LEAD_USES, MISHAPS: MISHAPS, GEO: GEO, setup: setup, clone: clone, swap: swap, mishap: mishap, vecAt: vecAt, cableVecs: cableVecs, potentials: potentials, leadsFrom: leadsFrom, dipoleAt: dipoleAt, tracesAt: tracesAt, voltageFn: voltageFn, measure: measure, read: read, compare: compare, axisOf: axisOf, noiseAt: noiseAt, surface: surface, fromHeart: fromHeart };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PFT_LEADS;
})(typeof window !== 'undefined' ? window : globalThis);
