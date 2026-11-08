/* PulmCrit Daddy — Learn: the conduction system, element by element (v8.4).
   The ECG lab in ecg.js plays scripted scenarios. This model is the general case: every element of the conduction
   system is a dial — the sinus node and the atria, the AV node and its modes, the His bundle, the right bundle, the left
   bundle and its two fascicles, the Purkinje network, an accessory pathway, an ectopic focus or a pacemaker — and every
   wall of the ventricles has a mass, an ischaemia and an injury. The activation sequence is computed from what still
   conducts: a region is reached through its Purkinje path if that path is open, otherwise muscle to muscle from the
   nearest region already depolarised, late and slow, with the wavefront pointing from there. Each lead is then the sum
   of the regions' dipoles projected onto its own direction — and the reading at the end is made from the traces the
   model wrote, not from the settings, so the lesion → trace → reading loop closes. Frame as ecg.js: x to the patient's
   left, y inferior, z anterior; ms and mV. Pure functions, usable in node for the tests. */
(function (root) {
'use strict';
const E = root.PFT_ECG;
const d2r = Math.PI / 180;
const bump = (u) => (u <= 0 || u >= 1) ? 0 : Math.pow(Math.sin(Math.PI * u), 2);
const unit = (v) => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* ------------------------------------------------------------ the heart: regions with a centre (cm), the direction a Purkinje-driven wavefront takes
   through them, the time their Purkinje path normally delivers the impulse (ms after the onset of the QRS), a duration and a weight */
const REGIONS = [
  { id: 'sep', name: 'Septum', c: [-0.5, 1.0, 0.5], dir: [-0.55, -0.3, 0.65], t0: 0, dur: 26, mag: 0.32, via: 'lbb', group: 'septal' },
  { id: 'apex', name: 'Apex and anterior wall', c: [1.5, 5.5, 2.0], dir: [0.35, 0.65, 0.6], t0: 12, dur: 30, mag: 0.7, via: 'lpf', group: 'anterior' },
  { id: 'rv', name: 'Right ventricular free wall', c: [-3.0, 2.0, 3.0], dir: [-0.6, 0.1, 0.75], t0: 16, dur: 30, mag: 0.32, via: 'rbb', group: 'right' },
  { id: 'lva', name: 'Anterolateral (anterosuperior) wall', c: [3.5, -0.5, 1.5], dir: [0.8, -0.42, -0.15], t0: 22, dur: 34, mag: 1.0, via: 'laf', group: 'lateral' },
  { id: 'lvi', name: 'Inferoposterior wall', c: [2.0, 4.5, -2.0], dir: [0.25, 0.87, -0.42], t0: 24, dur: 34, mag: 1.0, via: 'lpf', group: 'inferior' },
  { id: 'lvl', name: 'Lateral wall', c: [5.0, 0.5, -0.5], dir: [0.95, 0.3, -0.1], t0: 30, dur: 32, mag: 0.7, via: 'laf', group: 'lateral' },
  { id: 'base', name: 'Posterobasal wall', c: [2.0, -2.0, -3.0], dir: [-0.3, -0.55, -0.75], t0: 50, dur: 26, mag: 0.4, via: 'lbb', group: 'posterior' }
];
/* the ST vector of an injured wall points at the leads that face it (and away from them when the ischaemia is subendocardial) */
const INJ = { sep: [-0.4, 0.1, 0.9], apex: [0.05, 0.3, 0.95], rv: [-0.8, 0.3, 0.5], lva: [0.7, -0.5, 0.5], lvi: [0.1, 0.9, -0.4], lvl: [0.9, 0.1, 0.2], base: [0.2, 0.3, -0.95] };
const ATRIA = [
  { id: 'ra', name: 'Right atrium', t0: 0, dur: 55, dir: [0.25, 0.8, 0.4], mag: 0.11, via: 'sa' },
  { id: 'la', name: 'Left atrium', t0: 28, dur: 58, dir: [0.8, 0.5, -0.3], mag: 0.11, via: 'bach' }
];
/* muscle-to-muscle crossings between neighbouring regions (ms, on top of the time the wavefront takes to leave the source) */
const EDGES = [   // [from, to, ms, kind] — directed, because crossing the septum from its left surface to the right ventricle is a longer road than the reverse
  ['sep', 'rv', 48, 'muscle'], ['rv', 'sep', 14, 'muscle'], ['sep', 'apex', 22, 'muscle'], ['apex', 'sep', 22, 'muscle'], ['sep', 'lva', 60, 'muscle'], ['lva', 'sep', 36, 'muscle'], ['sep', 'lvi', 60, 'muscle'], ['lvi', 'sep', 36, 'muscle'],
  ['apex', 'rv', 36, 'muscle'], ['rv', 'apex', 40, 'muscle'], ['rv', 'lva', 44, 'muscle'], ['lva', 'rv', 40, 'muscle'],
  ['apex', 'lva', 36, 'network'], ['lva', 'apex', 36, 'network'], ['apex', 'lvi', 36, 'network'], ['lvi', 'apex', 36, 'network'], ['apex', 'lvl', 30, 'network'], ['lvl', 'apex', 30, 'network'],
  ['lva', 'lvl', 18, 'network'], ['lvl', 'lva', 18, 'network'], ['lvl', 'lvi', 20, 'network'], ['lvi', 'lvl', 20, 'network'], ['lvi', 'lva', 22, 'network'], ['lva', 'lvi', 22, 'network'],
  ['lvl', 'base', 24, 'network'], ['base', 'lvl', 24, 'network'], ['lvi', 'base', 22, 'network'], ['base', 'lvi', 22, 'network'], ['lva', 'base', 30, 'muscle'], ['base', 'lva', 30, 'muscle']];
/* a wall reached muscle to muscle takes 2.3× as long and, unopposed, writes 1.3× the voltage; between the left fascicles' territories the
   Purkinje network still carries the front (1.5× as long), and nothing opposes it either (1.5×) */
const SPREAD = { muscle: { dur: 2.3, mag: 1.9, blend: 0.75 }, network: { dur: 1.5, mag: 2.0, blend: 0.9 } };
/* the Purkinje tree: which elements an impulse passes to reach each region's Purkinje entry */
const TREE = { sep: ['his', 'lbb'], apex: ['his', 'lbb', 'lpf'], lvl: ['his', 'lbb', 'laf'], base: ['his', 'lbb'], lva: ['his', 'lbb', 'laf'], lvi: ['his', 'lbb', 'lpf'], rv: ['his', 'rbb'] };
const ELEMENT_DELAY = 60;        // ms a fully delayed (but not blocked) element adds
const MUSCLE_DUR = 2.3, MUSCLE_MAG = 1.3;
const FOCI = { rvapex: { name: 'Right ventricular apex (the paced site)', region: 'rv', dir: [-0.2, -0.75, 0.3] }, rvot: { name: 'Right ventricular outflow tract', region: 'rv', dir: [0.3, 0.9, -0.1] }, lvlat: { name: 'Left ventricular lateral wall', region: 'lvl', dir: [-0.8, 0.3, 0.4] }, lvinf: { name: 'Left ventricular inferior wall', region: 'lvi', dir: [0.1, -0.9, 0.3] } };
const AP_SITES = { ll: { name: 'Left lateral (type A)', regions: ['base', 'lvl'], dir: [-0.35, 0.55, 0.55] }, rfw: { name: 'Right free wall (type B)', regions: ['rv'], dir: [0.55, 0.6, -0.35] }, ps: { name: 'Posteroseptal', regions: ['lvi', 'base'], dir: [0.2, -0.65, 0.6] } };

/* ------------------------------------------------------------ the settings: one object, every dial */
function defaults() {
  const myo = {}; REGIONS.forEach(r => { myo[r.id] = { mass: 1, isch: 0, injury: 0 }; });
  return {
    sa: { mode: 'sinus', rate: 72, afRate: 110, flutterRatio: 2 },                  // sinus | af | flutter | arrest
    atria: { bach: 0, rae: false, lae: false },
    av: { mode: 'normal', delay: 80, wenck: 4, ratio: 3 },                          // normal | wenck | mobitz2 | complete
    his: { block: 0 }, rbb: { block: 0 }, lbb: { block: 0 }, laf: { block: 0 }, lpf: { block: 0 },
    purk: { speed: 1 },
    ap: { on: false, site: 'll', share: 0.6 },
    focus: { mode: 'off', site: 'rvapex', every: 3, coupling: 0.6, rate: 70 },      // off | pvc | paced | vt
    escape: { junctional: 40, ventricular: 32 },
    myo: myo,
    repol: { qt: 1, k: 0 }
  };
}
const clone = (o) => JSON.parse(JSON.stringify(o));

/* ------------------------------------------------------------ the activation of one beat
   origin: 'his' (an impulse arriving from above), or a focus id (an ectopic or paced beat) */
function activate(cfg, origin) {
  const speed = clamp(cfg.purk.speed * (1 - 0.45 * cfg.repol.k), 0.3, 1.3);
  const blocked = (el) => cfg[el].block >= 0.95;
  const elDelay = (el) => ELEMENT_DELAY * clamp(cfg[el].block, 0, 1);
  const R = {}; REGIONS.forEach(r => { R[r.id] = { id: r.id, name: r.name, c: r.c, dir0: r.dir, t0: Infinity, dur: r.dur, mag: r.mag * cfg.myo[r.id].mass, via: null, from: null, normalT0: r.t0 }; });
  // Purkinje delivery
  if (origin === 'his' && !blocked('his')) REGIONS.forEach(r => {
    const path = TREE[r.id];
    if (path.some(blocked)) return;
    let g = 0; path.forEach(el => { g = Math.max(g, clamp(cfg[el].block, 0, 1)); });
    const extra = path.reduce((s, el) => s + elDelay(el), 0);
    const q = R[r.id]; q.t0 = (r.t0 + extra) / speed; q.via = path[path.length - 1]; q.dur = r.dur * (1 + 1.6 * g) / Math.sqrt(speed); q.dir = r.dir; q.g = g;
  });
  // an ectopic or paced beat starts in a region
  if (origin !== 'his') { const F = FOCI[origin] || FOCI.rvapex; const q = R[F.region]; q.t0 = 0; q.via = 'focus'; q.dur = REGIONS.filter(r => r.id === F.region)[0].dur * MUSCLE_DUR / Math.sqrt(speed); q.dir = F.dir; q.mag *= MUSCLE_MAG; }
  // the accessory pathway pre-excites its wall before anything else arrives
  let pre = null;
  if (origin === 'his' && cfg.ap.on && cfg.ap.share > 0) {
    const site = AP_SITES[cfg.ap.site] || AP_SITES.ll, share = clamp(cfg.ap.share, 0, 1);
    pre = { id: 'pre', name: 'Pre-excited wall (' + site.name + ')', t0: -70 * share, dur: 55 / Math.sqrt(speed), dir: site.dir, mag: 0.55 * share, via: 'ap', c: REGIONS.filter(r => r.id === site.regions[0])[0].c, late: 0 };
    site.regions.forEach(id => { R[id].mag *= 1 - 0.35 * share; });
  }
  // muscle to muscle: relax until nothing improves
  for (let it = 0; it < 10; it++) {
    let changed = false;
    EDGES.forEach(e => {
      const a = R[e[0]], b = R[e[1]]; if (!isFinite(a.t0)) return;
      const t = a.t0 + 0.25 * a.dur + e[2] / speed;
      if (t < b.t0 - 1e-9) { b.t0 = t; b.via = 'muscle'; b.from = a.id; b.kind = e[3]; changed = true; }
    });
    if (!changed) break;
  }
  // the pre-excited wall also feeds its neighbours (so a large share widens the QRS)
  if (pre) { const site = AP_SITES[cfg.ap.site] || AP_SITES.ll; site.regions.forEach(id => { const t = pre.t0 + 18 + 12 / speed; if (t < R[id].t0) { R[id].t0 = t; R[id].via = 'muscle'; R[id].from = 'pre'; R[id].kind = 'muscle'; } }); }
  const vent = [];
  REGIONS.forEach(r => {
    const q = R[r.id]; if (!isFinite(q.t0)) return;
    if (q.via === 'muscle') {
      const src = q.from === 'pre' ? pre : R[q.from];
      const spread = unit(sub(q.c, src.c));
      const sp = SPREAD[q.kind] || SPREAD.muscle, w = sp.blend;
      q.dir = unit([w * spread[0] + (1 - w) * q.dir0[0], w * spread[1] + (1 - w) * q.dir0[1], w * spread[2] + (1 - w) * q.dir0[2]]);
      q.dur = r.dur * sp.dur / Math.sqrt(speed); q.mag *= sp.mag;
    }
    q.late = Math.max(0, q.t0 - r.t0);
    const m = cfg.myo[r.id];
    vent.push({ id: r.id, name: r.name, t0: q.t0, dur: q.dur, dir: q.dir, mag: q.mag, via: q.via, from: q.from, late: q.late, blocked: q.via === 'muscle', isch: m.isch, injury: m.injury, mass: m.mass, group: r.group });
  });
  if (pre) vent.unshift(pre);
  vent.sort((a, b) => a.t0 - b.t0);
  // the atria
  const atria = ATRIA.map(a => {
    const x = Object.assign({}, a);
    if (a.id === 'la') { x.t0 += 60 * cfg.atria.bach; x.dur += 20 * cfg.atria.bach; if (cfg.atria.lae) { x.mag *= 1.5; x.dur += 30; } }
    if (a.id === 'ra' && cfg.atria.rae) x.mag *= 1.9;
    x.mag *= 1 - 0.7 * cfg.repol.k;
    return x;
  });
  const S = { vent: vent, atria: atria };
  const alive = vent.filter(x => x.mag > 0.01);
  const qrsStart = alive.length ? Math.min.apply(null, alive.map(x => x.t0)) : 0, qrsEnd = alive.length ? Math.max.apply(null, alive.map(x => x.t0 + x.dur)) : 0;
  let fx = 0, fy = 0; for (let t = qrsStart; t <= qrsEnd; t += 2) { const d = dipole(S, t, cfg); fx += d[0]; fy += d[1]; }
  const axis = Math.round(Math.atan2(fy, fx) / d2r);
  const pDur = Math.round(Math.max.apply(null, atria.map(a => a.t0 + a.dur)));
  const pr = origin === 'his' ? Math.round(50 + cfg.av.delay + 30 + ELEMENT_DELAY * clamp(cfg.his.block, 0, 1) + qrsStart) : null;
  return { S: S, R: { pr: pr || 160, rate: cfg.sa.rate }, origin: origin, qrs: Math.round(qrsEnd - qrsStart), qrsStart: qrsStart, qrsEnd: qrsEnd, pr: pr, axis: axis, pDur: pDur, pre: !!pre };
}

/* ------------------------------------------------------------ the dipole of a beat at t (ms from the QRS onset): activation, the ST plateau (injury, ischaemia), the T */
function dipole(S, t, cfg, parts) {
  const v = [0, 0, 0];
  const qt = cfg ? cfg.repol.qt : 1, k = cfg ? cfg.repol.k : 0;
  const add = (dir, w, id) => { v[0] += dir[0] * w; v[1] += dir[1] * w; v[2] += dir[2] * w; if (parts) parts[id] = (parts[id] || 0) + w; };
  S.vent.forEach(x => {
    if (x.mag <= 0) return;
    add(x.dir, x.mag * bump((t - x.t0) / x.dur), x.id);
    const tEnd = x.t0 + x.dur, tT = x.t0 + (220 + x.dur * 0.6) * qt, tDur = 170 * qt * (1 - 0.35 * k);
    // the plateau: an injury current from a transmurally injured wall points at the leads facing it; subendocardial ischaemia away
    const inj = (x.injury || 0), isc = (x.isch || 0);
    if (inj > 0 || isc > 0) {
      const ramp = clamp((t - tEnd) / 20, 0, 1) * clamp((tT + tDur * 0.3 - t) / 40, 0, 1);
      add(INJ[x.id] || x.dir, (0.26 * inj - 0.09 * isc) * Math.min(1.5, x.mass || 1) * ramp, x.id);
    }
    // repolarisation: concordant unless the wall was reached late, ischaemic or hypertrophied (strain)
    const conc = (1 - 1.9 * Math.min(1, (x.late || 0) / 44)) * (1 - 1.6 * isc) * Math.max(-0.9, 1 - 1.6 * Math.max(0, (x.mass || 1) - 1));
    add(x.dir, x.mag * 0.26 * conc * (1 + 0.9 * k) * (1 + 0.5 * inj) * bump((t - tT) / tDur), x.id);
  });
  return v;
}
function dipoleP(S, t, parts) {
  const v = [0, 0, 0];
  S.atria.forEach(x => { const w = x.mag * bump((t - x.t0) / x.dur) - x.mag * 0.25 * bump((t - x.t0 - 60) / 90); v[0] += x.dir[0] * w; v[1] += x.dir[1] * w; v[2] += x.dir[2] * w; if (parts) parts[x.id] = (parts[x.id] || 0) + w; });
  return v;
}

/* ------------------------------------------------------------ the strip: ten seconds of beats, each with its own activation */
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function strip(cfg, secs) {
  secs = secs || 10;
  const T = secs * 1000, rnd = mulberry(7);
  const conducted = activate(cfg, 'his');
  const seqs = { his: conducted };
  const focusSeq = (site) => { if (!seqs[site]) seqs[site] = activate(cfg, site); return seqs[site]; };
  const bts = [];
  const hisOpen = cfg.his.block < 0.95;
  const pr = conducted.pr;
  // --- atrial events
  const Ps = [];
  if (cfg.sa.mode === 'sinus') { const pp = 60000 / cfg.sa.rate; for (let t = 120; t < T; t += pp) Ps.push(t); }
  // --- which atrial events conduct
  const vb = [];   // ventricular beats {q, kind, seq, p}
  if (cfg.sa.mode === 'sinus') {
    let n = 0, lastQ = -1e9;
    Ps.forEach((p) => {
      let q = null;
      if (cfg.av.mode === 'normal') q = p + pr;
      else if (cfg.av.mode === 'wenck') { const W = Math.max(2, cfg.av.wenck), k = n % W; q = k === W - 1 ? null : p + pr + [0, 70, 110, 135, 150, 160, 168][Math.min(6, k)]; }
      else if (cfg.av.mode === 'mobitz2') { const r = Math.max(2, cfg.av.ratio); q = n % r === r - 1 ? null : p + pr; }
      n++;
      if (q !== null && hisOpen && q - lastQ > 240) { vb.push({ q: q, kind: 'conducted', seq: conducted, p: p }); lastQ = q; }
      bts.push({ p: p, q: null, pOnly: true });
    });
  } else if (cfg.sa.mode === 'af') {
    const meanRR = 60000 / cfg.sa.afRate; let t = 160;
    while (t < T) { if (hisOpen && cfg.av.mode !== 'complete') vb.push({ q: t, kind: 'conducted', seq: conducted, p: null }); t += meanRR * (0.55 + 0.9 * rnd()); }
  } else if (cfg.sa.mode === 'flutter') {
    const ff = 200, r = Math.max(2, cfg.sa.flutterRatio); let i = 0;
    for (let t = 100; t < T; t += ff, i++) if (i % r === 0 && hisOpen && cfg.av.mode !== 'complete') vb.push({ q: t + 120, kind: 'conducted', seq: conducted, p: null });
  }
  // --- a ventricular rhythm of its own: pacing or VT takes over; PVCs intrude
  if (cfg.focus.mode === 'paced' || cfg.focus.mode === 'vt') {
    vb.length = 0;
    const rr = 60000 / cfg.focus.rate, sq = focusSeq(cfg.focus.site);
    for (let t = 200; t < T; t += rr) vb.push({ q: t, kind: cfg.focus.mode, seq: sq, p: null, spike: cfg.focus.mode === 'paced' });
  } else if (cfg.focus.mode === 'pvc' && vb.length) {
    const every = Math.max(1, cfg.focus.every), sq = focusSeq(cfg.focus.site), add = [];
    const rr = vb.length > 1 ? vb[1].q - vb[0].q : 800;
    vb.forEach((b, i) => { if ((i + 1) % every === 0) add.push({ q: b.q + cfg.focus.coupling * rr, kind: 'pvc', seq: sq, p: null }); });
    add.forEach(x => { for (let i = vb.length - 1; i >= 0; i--) if (vb[i].q > x.q - 150 && vb[i].q < x.q + 360) vb.splice(i, 1); vb.push(x); });
    vb.sort((a, b) => a.q - b.q);
  }
  // --- escape: whenever nothing has come for an escape interval
  const escRate = hisOpen ? cfg.escape.junctional : cfg.escape.ventricular, escRR = 60000 / Math.max(15, escRate);
  if (!(cfg.focus.mode === 'paced' || cfg.focus.mode === 'vt')) {
    const escSeq = hisOpen ? conducted : focusSeq('rvapex');
    let last = 300 - escRR * 0.5, i = 0; const out = [];
    vb.sort((a, b) => a.q - b.q);
    while (true) {
      const next = i < vb.length ? vb[i] : null;
      const due = last + escRR * 1.15;   // a beat from above resets the escape pacemaker (overdrive suppression)
      if (next && next.q <= due) { out.push(next); last = next.q; i++; continue; }
      if (due >= T) break;
      out.push({ q: due, kind: hisOpen ? 'junctional' : 'ventricular', seq: escSeq, p: null, escape: true }); last = due;
    }
    vb.length = 0; out.forEach(x => vb.push(x));
  }
  vb.forEach(b => bts.push(b));
  const vRate = vb.length > 1 ? Math.round(60000 * (vb.length - 1) / (vb[vb.length - 1].q - vb[0].q)) : (vb.length ? 60 : 0);
  const aRate = cfg.sa.mode === 'sinus' ? cfg.sa.rate : (cfg.sa.mode === 'flutter' ? 300 : (cfg.sa.mode === 'af' ? null : 0));
  return { cfg: cfg, seq: conducted, seqs: seqs, bts: bts, vRate: vRate, aRate: aRate, secs: secs };
}

/* the voltage of a lead at time T of the strip, with the parts that make it when asked */
function voltageAt(leadName, st, T, parts) {
  const L = E.leadVec(leadName), cfg = st.cfg; let v = 0;
  for (let i = 0; i < st.bts.length; i++) {
    const b = st.bts[i];
    if (b.q !== null && b.q !== undefined && T >= b.q - 80 && T < b.q + 620) {
      const pp = parts ? {} : null;
      const d = dipole(b.seq.S, T - b.q, cfg, pp); v += dot(d, L);
      if (parts) Object.keys(pp).forEach(id => { const x = b.seq.S.vent.filter(y => y.id === id)[0]; if (x) parts[id] = (parts[id] || 0) + dot(x.dir, L) * pp[id]; });
      if (b.spike && T >= b.q - 2 && T < b.q + 2) v += 0.9;
    }
    if (b.p !== null && b.p !== undefined && T >= b.p - 10 && T < b.p + 300) { const pp = parts ? {} : null; const d = dipoleP(st.seq.S, T - b.p, pp); v += dot(d, L); if (parts) Object.keys(pp).forEach(id => { const x = st.seq.S.atria.filter(y => y.id === id)[0]; parts[id] = (parts[id] || 0) + dot(x.dir, L) * pp[id]; }); }
  }
  // fibrillation and flutter write their own baseline
  if (cfg.sa.mode === 'af') v += 0.035 * (Math.sin(T / 31) + Math.sin(T / 47 + 1) + 0.6 * Math.sin(T / 19 + 2)) * dot([0.3, 0.5, 0.4], L);
  if (cfg.sa.mode === 'flutter') { const ph = ((T - 100) % 200) / 200; v += 0.16 * (ph < 0.8 ? 1 - 2 * ph / 0.8 : -1 + 2 * (ph - 0.8) / 0.2) * dot([-0.1, -0.9, 0.2], L); }
  return v;
}
/* which regions and paths are active at T (for the drawing): 0–1 the front, 1 depolarised, 1–2 repolarising */
function stateAt(st, T) {
  const out = { regions: {}, paths: {}, phase: 'rest' };
  st.bts.forEach(b => {
    if (b.p !== null && b.p !== undefined) st.seq.S.atria.forEach(x => { const u = (T - b.p - x.t0) / x.dur, r = (T - b.p - x.t0 - 60) / 90; if (u > 0 && u < 1) { out.regions[x.id] = Math.max(out.regions[x.id] || 0, u); out.paths[x.via] = 1; } else if (u >= 1 && r < 1) out.regions[x.id] = Math.max(out.regions[x.id] || 0, r > 0 ? 1 + r : 1); });
    if (b.p !== null && b.p !== undefined && b.pOnly) {
      const mine = st.bts.filter(c => c.kind === 'conducted' && c.p === b.p)[0];
      if (mine && T > b.p + 60 && T < mine.q) { out.paths.av = 1; out.phase = 'av'; }
      if (!mine && T > b.p + 60 && T < b.p + 260) out.paths.avblock = 1;
    }
    if (b.q !== null && b.q !== undefined) b.seq.S.vent.forEach(x => {
      const u = (T - b.q - x.t0) / x.dur, r = (T - b.q - (x.t0 + 220 + x.dur * 0.6)) / 170;
      if (u > 0 && u < 1) { out.regions[x.id] = Math.max(out.regions[x.id] || 0, u); if (x.via && x.via !== 'muscle' && x.via !== 'focus') { out.paths[x.via] = 1; out.paths.his = 1; if (x.via === 'laf' || x.via === 'lpf') out.paths.lbb = 1; } }
      else if (u >= 1 && r < 1) out.regions[x.id] = Math.max(out.regions[x.id] || 0, r > 0 ? 1 + r : 1);
    });
  });
  return out;
}

/* ------------------------------------------------------------ reading the traces the model wrote */
function measureLead(st, lead, b) {
  const q = b.q, s = b.seq;
  const at = (t) => voltageAt(lead, st, q + t);
  const base = at(-70);
  // Q wave: the QRS opens with a negative deflection — pathological when it is deep (≥ 0.1 mV and a quarter of the R) or wide (≥ 30 ms)
  let qDepth = 0, qWidth = 0, first = 0;
  for (let t = s.qrsStart; t < s.qrsEnd; t += 2) { const v = at(t) - base; if (!first && Math.abs(v) > 0.1) first = v > 0 ? 1 : -1; if (first < 0) { if (v < qDepth) qDepth = v; if (v < -0.02) qWidth += 2; else break; } else if (first > 0) break; }
  let rMax = 0, sMin = 0, terminal = 0; const q40 = s.qrsEnd - 40;
  for (let t = s.qrsStart; t <= s.qrsEnd; t += 2) { const v = at(t) - base; if (v > rMax) rMax = v; if (v < sMin) sMin = v; if (t >= q40) terminal += v; }
  const j = s.qrsEnd, stDev = at(j + 60) - base, tPeak = (function () { let m = 0; for (let t = j + 80; t < j + 320; t += 4) { const v = at(t) - base; if (Math.abs(v) > Math.abs(m)) m = v; } return m; })();
  let minEarly = 0; for (let t = s.qrsStart; t < s.qrsStart + 40; t += 2) { const v = at(t) - base; if (v < minEarly) minEarly = v; }
  const path = first < 0 && ((qDepth <= -0.1 && (qWidth >= 30 || -qDepth >= 0.25 * rMax)) || (minEarly <= -0.15 && rMax < 0.6));
  return { lead: lead, q: path ? Math.min(qDepth, minEarly) : 0, qWidth: qWidth, r: rMax, s: sMin, terminal: terminal, st: stDev, t: tPeak };
}
const GROUPS_L = { inferior: ['II', 'III', 'aVF'], lateral: ['I', 'aVL', 'V5', 'V6'], anterior: ['V1', 'V2', 'V3', 'V4'], septal: ['V1', 'V2'] };
function interpret(st) {
  const cfg = st.cfg, lines = [], flags = [];
  const beats = st.bts.filter(b => b.q !== null && b.q !== undefined);
  const first = beats.filter(b => b.kind === 'conducted')[0] || beats[0];
  // rhythm
  const vr = st.vRate;
  let rhythm;
  if (cfg.focus.mode === 'vt') rhythm = 'Wide-complex tachycardia at ' + vr + '/min with the sinus P waves marching through — ventricular tachycardia with AV dissociation';
  else if (cfg.focus.mode === 'paced') rhythm = 'Ventricular paced rhythm at ' + cfg.focus.rate + '/min (spike before every wide QRS)';
  else if (cfg.sa.mode === 'af') rhythm = 'Atrial fibrillation, irregularly irregular, ventricular rate about ' + vr + '/min, no P waves';
  else if (cfg.sa.mode === 'flutter') rhythm = 'Atrial flutter (sawtooth F waves at 300/min, negative in II, III, aVF) with ' + cfg.sa.flutterRatio + ':1 conduction, ventricular rate ' + vr + '/min';
  else if (cfg.sa.mode === 'arrest') rhythm = beats.length ? 'No P waves (sinus arrest): ' + (beats[0].kind === 'junctional' ? 'junctional escape rhythm, narrow, ' : 'ventricular escape rhythm, wide, ') + vr + '/min' : 'Asystole';
  else if (cfg.av.mode === 'complete' || cfg.his.block >= 0.95) rhythm = 'Sinus rhythm ' + cfg.sa.rate + '/min with complete heart block: ' + (cfg.his.block >= 0.95 ? 'ventricular escape (wide) at ' : 'junctional escape (narrow) at ') + vr + '/min, P and QRS independent';
  else if (cfg.av.mode === 'wenck') rhythm = 'Sinus ' + cfg.sa.rate + '/min with Mobitz I (Wenckebach) ' + cfg.av.wenck + ':' + (cfg.av.wenck - 1) + ' block — the PR lengthens until a P is dropped';
  else if (cfg.av.mode === 'mobitz2') rhythm = 'Sinus ' + cfg.sa.rate + '/min with Mobitz II ' + cfg.av.ratio + ':' + (cfg.av.ratio - 1) + ' block — a constant PR, then a dropped beat';
  else rhythm = (cfg.sa.rate < 60 ? 'Sinus bradycardia ' : (cfg.sa.rate > 100 ? 'Sinus tachycardia ' : 'Sinus rhythm ')) + cfg.sa.rate + '/min';
  if (cfg.focus.mode === 'pvc') rhythm += (cfg.focus.every === 2 ? ' with ventricular bigeminy' : (cfg.focus.every === 3 ? ' with ventricular trigeminy' : ' with premature ventricular complexes every ' + cfg.focus.every + ' beats')) + ' (wide, ' + (cfg.focus.site.indexOf('rv') === 0 ? 'LBBB-like: from the right ventricle' : 'RBBB-like: from the left ventricle') + ')';
  if (beats.some(b => b.escape) && cfg.sa.mode === 'sinus' && cfg.av.mode !== 'complete' && cfg.his.block < 0.95) rhythm += '; escape beats fill the pauses';
  lines.push(['Rhythm', rhythm]);
  if (!first) return { lines: lines, flags: flags, leads: {} };
  const s = first.seq, m = {}; E.LEADS.forEach(l => { m[l[0]] = measureLead(st, l[0], first); });
  // intervals
  const prTxt = cfg.sa.mode !== 'sinus' || first.kind !== 'conducted' ? '—' : (cfg.av.mode === 'wenck' ? 'lengthening (' + s.pr + ' ms on the first beat)' : s.pr + ' ms');
  const prFlag = cfg.sa.mode === 'sinus' && first.kind === 'conducted' && cfg.av.mode !== 'wenck' ? (s.pr > 200 ? ' — first-degree AV block' : (s.pr < 120 ? (s.pre ? ' — short with a delta wave: pre-excitation' : ' — short') : '')) : '';
  lines.push(['PR', prTxt + prFlag]);
  const qrs = s.qrs, wide = qrs >= 120, mid = qrs >= 100 && qrs < 120;
  const v1 = m.V1, v6 = m.V6, I = m.I;
  let morph = '';
  const ax = s.axis;
  const lafb = ax < -45 && !wide && m.I.r > 0.3 && m.aVL.q < 0 && m.II.s < -0.3, lpfb = ax > 100 && !wide && m.III.r > 0.6 && m.I.s < -0.3 && m.III.q < 0;
  if (first.kind === 'conducted' || first.kind === 'junctional') {
    if (wide || mid) {
      if (cfg.repol.k > 0.3 || cfg.purk.speed < 0.8) morph = 'diffusely widened: conduction is slowed through the whole ventricle' + (cfg.repol.k > 0.3 ? ' (hyperkalaemia)' : ' (a sodium-channel blocker, or the potassium)');
      else if (v1.terminal > 0.4 && v1.r > 0.3 && (v6.s < -0.25 || I.s < -0.2 || m.aVL.s < -0.2)) morph = (wide ? 'complete' : 'incomplete') + ' right bundle branch block pattern (rSR′ in V1, broad S in I and V6)';
      else if (v1.r < 0.6 && v1.terminal < 0 && v6.r > 1.4 && v1.s < -1.4 && v6.q > -0.25 && I.r > 0.8 && wide) morph = 'left bundle branch block pattern (broad notched R in I, aVL, V5–6 without q; rS or QS in V1; discordant T)';
      else if (v1.r < 0.6 && v1.terminal < 0 && v6.r > 1.3 && v1.s < -1.2 && v6.q > -0.25 && I.r > 0.8) morph = 'incomplete left bundle branch block pattern (the septal q is gone, the R thickened)';
      else if ((lafb || lpfb) && mid) morph = 'slightly widened by the fascicular block';
      else if (s.pre) morph = 'widened by a delta wave (pre-excitation)';
      else morph = 'non-specific intraventricular conduction delay';
    }
  } else morph = first.kind === 'paced' || first.kind === 'vt' || first.kind === 'ventricular' ? 'wide, of ventricular origin (' + (cfg.focus.site.indexOf('rv') === 0 || first.kind === 'ventricular' ? 'LBBB-like' : 'RBBB-like') + ')' : '';
  lines.push(['QRS', qrs + ' ms' + (morph ? ' — ' + morph : (qrs < 100 ? ' (narrow)' : ''))]);
  let axTxt = ax + '° — ' + (ax < -90 ? 'extreme (north-west) axis' : (ax < -30 ? 'left axis deviation' : (ax <= 90 ? 'normal axis' : 'right axis deviation')));
  if (lafb) axTxt += ' with qR in aVL and rS in II, III, aVF: left anterior fascicular block';
  else if (lpfb) axTxt += ' with rS in I and qR in III: left posterior fascicular block (if the right ventricle is normal)';
  lines.push(['Axis', axTxt]);
  // ST and Q waves and T by territory
  const ste = E.LEADS.map(l => l[0]).filter(l => m[l].st >= 0.1), std = E.LEADS.map(l => l[0]).filter(l => m[l].st <= -0.08), qw = E.LEADS.map(l => l[0]).filter(l => m[l].q < 0 && !/aVR/.test(l)), tinv = E.LEADS.map(l => l[0]).filter(l => m[l].t < -0.15 && !/aVR|V1/.test(l) && m[l].r > 0.3);
  const terr = (leads) => Object.keys(GROUPS_L).filter(g => GROUPS_L[g].filter(l => leads.indexOf(l) >= 0).length >= 2).join(', ');
  const ste2 = ste.filter(l => l !== 'aVR'), steT = terr(ste2), qwT = terr(qw);
  if (s.pre && first.kind === 'conducted') lines.push(['ST-T', 'secondary to the pre-excitation (and pseudo-infarct Q waves where the delta is negative) — not ischaemia']);
  else if (steT && (first.kind === 'conducted')) { const t = steT; lines.push(['ST elevation', ste2.join(', ') + (t ? ' (' + t + ')' : '') + (std.length ? ' with reciprocal depression in ' + std.join(', ') : '') + (cfg.myo && Object.keys(cfg.myo).some(k => cfg.myo[k].injury > 0.3) ? ' — acute transmural injury' : '')]); flags.push('ste'); }
  else if (std.length && first.kind === 'conducted' && !wide && !s.pre) { lines.push(['ST depression', std.join(', ') + ' (' + (terr(std) || 'scattered') + ')' + (Object.keys(cfg.myo).some(k => cfg.myo[k].isch > 0.3) ? ' — subendocardial ischaemia' : ' — secondary to the conduction change')]); flags.push('std'); }
  if (qwT && first.kind === 'conducted' && !wide && !s.pre) { const dead = Object.keys(cfg.myo).filter(k => cfg.myo[k].mass < 0.3); lines.push(['Q waves', qw.join(', ') + ' (' + qwT + ')' + (dead.length ? ' — loss of forces from the infarcted ' + dead.map(k => REGIONS.filter(r => r.id === k)[0].name.toLowerCase()).join(' and ') : '')]); flags.push('q'); }
  if (tinv.length && !s.pre) lines.push(['T waves', 'inverted in ' + tinv.join(', ') + (wide ? ' (discordant to a wide QRS: secondary)' : (Object.keys(cfg.myo).some(k => cfg.myo[k].isch > 0.3) ? ' — ischaemia' : (Object.keys(cfg.myo).some(k => cfg.myo[k].mass > 1.3) ? ' — strain pattern' : '')))]);
  if (cfg.repol.k > 0.3) lines.push(['T waves', 'tall, narrow and peaked' + (cfg.repol.k > 0.6 ? '; P waves flattening and the QRS widening — hyperkalaemia' : ' — early hyperkalaemia')]);
  const sv1 = Math.abs(m.V1.s), rv5 = Math.max(m.V5.r, m.V6.r);
  if (sv1 + rv5 > 3.5 && !wide && first.kind === 'conducted') lines.push(['Voltage', 'S in V1 + R in V5/V6 = ' + (sv1 + rv5).toFixed(1) + ' mV — left ventricular hypertrophy by Sokolow–Lyon' + (Object.keys(cfg.myo).some(k => cfg.myo[k].mass > 1.3 && cfg.myo[k].mass < 3) ? ' (with strain if the T waves invert laterally)' : '')]);
  if (((m.V1.r > 0.7 && m.V1.r > -m.V1.s) || (m.V1.r > 0.5 && ax > 100)) && !wide && first.kind === 'conducted' && !/right bundle/.test(morph)) lines.push(['Voltage', 'Dominant R in V1 (R > S)' + (ax > 90 ? ' with a right axis' : '') + ' — right ventricular hypertrophy (or a posterior infarct, or a right-sided pathway)']);
  if (cfg.atria.bach > 0.5 || cfg.atria.lae) lines.push(['P wave', (s.pDur >= 120 ? 'broad (' + s.pDur + ' ms), notched in II' : 'notched') + (cfg.atria.lae ? ', with a deep terminal force in V1 — left atrial enlargement' : ' — interatrial block')]);
  if (cfg.atria.rae) lines.push(['P wave', 'tall and peaked in II (P pulmonale) — right atrial enlargement']);
  if (cfg.repol.qt > 1.2 && !wide) lines.push(['QT', 'prolonged (the T comes ' + Math.round((cfg.repol.qt - 1) * 100) + '% later than it should)']);
  return { lines: lines, flags: flags, leads: m, beat: first };
}

/* ------------------------------------------------------------ presets: the classic lesions as settings of the general model */
const PRESETS = [
  { id: 'normal', name: 'Normal conduction', set: {} },
  { id: 'rbbb', name: 'Right bundle branch block', set: { rbb: { block: 1 } } },
  { id: 'irbbb', name: 'Incomplete RBBB', set: { rbb: { block: 0.55 } } },
  { id: 'lbbb', name: 'Left bundle branch block', set: { lbb: { block: 1 } } },
  { id: 'lafb', name: 'Left anterior fascicular block', set: { laf: { block: 1 } } },
  { id: 'lpfb', name: 'Left posterior fascicular block', set: { lpf: { block: 1 } } },
  { id: 'bifasc', name: 'Bifascicular block (RBBB + LAFB)', set: { rbb: { block: 1 }, laf: { block: 1 } } },
  { id: 'trifasc', name: '“Trifascicular”: RBBB + LAFB + first-degree block', set: { rbb: { block: 1 }, laf: { block: 1 }, av: { delay: 180 } } },
  { id: 'wpw', name: 'Pre-excitation, left lateral pathway', set: { ap: { on: true, site: 'll', share: 0.6 } } },
  { id: 'wpwb', name: 'Pre-excitation, right free-wall pathway', set: { ap: { on: true, site: 'rfw', share: 0.6 } } },
  { id: 'avb1', name: 'First-degree AV block', set: { av: { delay: 180 } } },
  { id: 'wenck', name: 'Mobitz I (Wenckebach)', set: { av: { mode: 'wenck', wenck: 4 } } },
  { id: 'mobitz2', name: 'Mobitz II with RBBB', set: { av: { mode: 'mobitz2', ratio: 3 }, rbb: { block: 1 } } },
  { id: 'chb_j', name: 'Complete block, junctional escape', set: { av: { mode: 'complete' } } },
  { id: 'chb_v', name: 'Complete block below the His, ventricular escape', set: { his: { block: 1 } } },
  { id: 'af', name: 'Atrial fibrillation', set: { sa: { mode: 'af', afRate: 120 } } },
  { id: 'flutter', name: 'Atrial flutter 2:1', set: { sa: { mode: 'flutter', flutterRatio: 2 } } },
  { id: 'pvc', name: 'Ventricular bigeminy from the RV outflow tract', set: { focus: { mode: 'pvc', site: 'rvot', every: 2 } } },
  { id: 'vt', name: 'Ventricular tachycardia (left ventricular focus)', set: { focus: { mode: 'vt', site: 'lvlat', rate: 165 } } },
  { id: 'paced', name: 'RV apical pacing', set: { focus: { mode: 'paced', site: 'rvapex', rate: 70 }, av: { mode: 'complete' } } },
  { id: 'stemi_inf', name: 'Inferior STEMI', set: { myo: { lvi: { injury: 0.8 } } } },
  { id: 'stemi_ant', name: 'Anterior STEMI', set: { myo: { apex: { injury: 0.7 }, sep: { injury: 0.45 }, lva: { injury: 0.15 } } } },
  { id: 'old_inf', name: 'Old inferior (inferoapical) infarct', set: { myo: { lvi: { mass: 0.05 }, apex: { mass: 0.1 } } } },
  { id: 'old_ant', name: 'Old anteroseptal infarct', set: { myo: { apex: { mass: 0.05 }, sep: { mass: 0.05 }, lva: { mass: 0.5 } } } },
  { id: 'isch', name: 'Subendocardial ischaemia (lateral)', set: { myo: { lvl: { isch: 0.8 }, lva: { isch: 0.6 } } } },
  { id: 'lvh', name: 'Left ventricular hypertrophy with strain', set: { myo: { lva: { mass: 1.7 }, lvl: { mass: 1.7 }, lvi: { mass: 1.6 }, apex: { mass: 1.5 }, base: { mass: 1.5 } } } },
  { id: 'rvh', name: 'Right ventricular hypertrophy', set: { myo: { rv: { mass: 6 } }, rbb: { block: 0.45 } } },
  { id: 'hyperk', name: 'Hyperkalaemia', set: { repol: { k: 0.7 } } },
  { id: 'lqt', name: 'Long QT', set: { repol: { qt: 1.35 } } }
];
function preset(id) {
  const p = PRESETS.filter(x => x.id === id)[0]; if (!p) return defaults();
  const cfg = defaults();
  Object.keys(p.set).forEach(k => { if (k === 'myo') Object.keys(p.set.myo).forEach(r => Object.assign(cfg.myo[r], p.set.myo[r])); else Object.assign(cfg[k], p.set[k]); });
  return cfg;
}
/* which elements are blocked or delayed, for the drawing */
function elementStates(cfg) {
  const st = {};
  ['his', 'rbb', 'lbb', 'laf', 'lpf'].forEach(el => { st[el] = cfg[el].block >= 0.95 ? 'blocked' : (cfg[el].block > 0.05 ? 'delayed' : 'ok'); });
  st.av = cfg.av.mode === 'complete' ? 'blocked' : (cfg.av.mode !== 'normal' || cfg.av.delay > 120 ? 'delayed' : 'ok');
  st.sa = cfg.sa.mode === 'sinus' ? 'ok' : 'blocked';
  st.bach = cfg.atria.bach > 0.5 ? 'delayed' : 'ok';
  st.ap = cfg.ap.on ? 'ok' : 'off';
  return st;
}

/* ------------------------------------------------------------ the topic */
const T = {};
T.conduction = { title: 'The conduction system, element by element', kicker: 'Open or close each part of the system, change each wall, and read what the twelve leads write', blocks: [
  { p: 'The ECG lab plays the classic lesions. This bench is the general case. Every element of the conduction system is a dial — the sinus node and the atria, the AV node and its ways of failing, the His bundle, the right bundle, the left bundle and its two fascicles, the speed of the Purkinje network, an accessory pathway, an ectopic focus or a pacemaker — and every wall of the ventricles has a mass (hypertrophy up, infarction down), an ischaemia and an injury. Nothing is scripted: the model works out which region is reached through which path and when, and which has to wait for muscle-to-muscle spread from a neighbour; the leads are written from that sequence; and the reading at the bottom is made from the traces, not from the settings — so you can see whether what you did to the system shows, and how.' },
  { widget: 'conduction' },
  { h: 'How to use it', ul: [
    'Click an element on the heart (or pick it in the list) and move its dial. A bundle at 50% conducts late; at 95% or more it is blocked and its wall is reached from the nearest wall already depolarised — late, slowly, and with the wavefront pointing from there, which is the whole story of bundle branch block.',
    'Click a wall to change its mass (0 = an old infarct: its forces are gone and the opposite forces write a Q; 1.5–2 = hypertrophy: tall voltages and a strain pattern), its ischaemia (the ST sags and the T inverts in the leads that face it) or its injury (the ST rises in those leads and falls in the ones opposite).',
    'Pick a lead in “A lead is a sum of its parts” and see every region’s contribution drawn separately, then added: the septum writes the q, the free walls the R, the late wall the slurred end.',
    'The reading is made from the traces: intervals, axis, bundle-branch morphology from V1 and V6, ST shifts and Q waves by territory, voltage criteria. Set something and check that the reading changes for the reason you expect — and when it does not, ask why (a block that is hidden by another, a wall that no lead faces well).'] },
  { h: 'The rules the model obeys', ul: [
    'Purkinje delivery is fast and fixed in order: septum, apex, right ventricle, the two left fascicle territories, lateral wall, posterobasal wall. Muscle-to-muscle spread costs 20–45 ms per crossing and doubles the time a wall takes to depolarise.',
    'A wall reached late repolarises late: its T turns away from its QRS (secondary ST-T changes). A wall reached on time but ischaemic turns its T the other way for a different reason; a wall injured through its whole thickness carries an injury current through the plateau.',
    'The AV node sets the PR; its failures are delay, progressive delay with a dropped beat (Wenckebach), abrupt dropping (Mobitz II, usually with a wide QRS because the disease is below the node) and complete block, after which the escape pacemaker below the lesion drives the ventricles: narrow and 40–60/min from the junction, wide and 20–40/min from the ventricle.',
    'An accessory pathway starts a wall before the node has finished its delay: short PR, a delta wave whose direction is that of the pre-excited wall. A focus in a ventricle, whether a PVC, pacing or VT, writes a wide QRS whose shape says where it started: a right-sided origin looks like LBBB, a left-sided one like RBBB.'] },
  { h: 'Where the model stops', p: 'Seven ventricular regions, textbook lead directions, a dipole per region. It explains the shapes and their reasons; it does not read real tracings, and real hearts rotate, chests vary, and drugs and electrolytes change more than one dial at a time. The criteria in the reading are the ones used at the bedside; the numbers the model gives are illustrative.' },
  { src: ['Surawicz B, Childers R, Deal BJ, et al. AHA/ACCF/HRS recommendations for the standardization and interpretation of the electrocardiogram, part III: intraventricular conduction disturbances. Circulation 2009;119:e235–40.', 'Wagner GS, et al. AHA/ACCF/HRS recommendations, part VI: acute ischemia/infarction. Circulation 2009;119:e262–70.', 'Hancock EW, et al. AHA/ACCF/HRS recommendations, part V: electrocardiogram changes associated with cardiac chamber hypertrophy. Circulation 2009;119:e251–61.', 'Durrer D, et al. Total excitation of the isolated human heart. Circulation 1970;41:899–912.'] }
] };
const GROUPS = [{ title: 'The bench', ids: ['conduction'] }];

root.PFT_COND = { topics: T, groups: GROUPS, REGIONS: REGIONS, ATRIA: ATRIA, EDGES: EDGES, TREE: TREE, FOCI: FOCI, AP_SITES: AP_SITES, PRESETS: PRESETS, defaults: defaults, preset: preset, clone: clone, activate: activate, dipole: dipole, dipoleP: dipoleP, strip: strip, voltageAt: voltageAt, stateAt: stateAt, interpret: interpret, measureLead: measureLead, elementStates: elementStates };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PFT_COND;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
