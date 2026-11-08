/* ========================================================================== Learn: the conduction system, element by element (v8.4)
   The bench: a heart whose conduction paths and walls are clickable, a panel of dials for the selected element, the
   twelve leads written from the computed activation (the paper, dial and frame loop are the ECG lab's), a panel that
   draws every region's contribution to one lead and their sum, and a reading made from the traces. Model in conduction.js. */
const CD = window.PFT_COND || { topics: {}, groups: [], PRESETS: [], REGIONS: [] };
const CDS = { cfg: null, sel: 'rbb', lead: 'V1', preset: 'normal', pending: 0, st: null };
const CD_ELEMENTS = [
  ['sa', 'Sinus node and rhythm'], ['atria', 'Atria and Bachmann’s bundle'], ['av', 'AV node'], ['his', 'Bundle of His'], ['rbb', 'Right bundle branch'], ['lbb', 'Left bundle branch'], ['laf', 'Left anterior fascicle'], ['lpf', 'Left posterior fascicle'], ['purk', 'Purkinje network'], ['ap', 'Accessory pathway'], ['focus', 'Ectopic focus / pacemaker'], ['escape', 'Escape pacemakers'], ['repol', 'Repolarisation and potassium'],
  ['sep', 'Wall: septum'], ['apex', 'Wall: apex and anterior'], ['rv', 'Wall: right ventricle'], ['lva', 'Wall: anterolateral'], ['lvl', 'Wall: lateral'], ['lvi', 'Wall: inferoposterior'], ['base', 'Wall: posterobasal']
];
const CD_PATH2EL = { sa: 'sa', bach: 'atria', internodal: 'atria', av: 'av', his: 'his', rbb: 'rbb', lbb: 'lbb', laf: 'laf', lpf: 'lpf', ap: 'ap' };
const CD_REG2EL = { ra: 'atria', la: 'atria', pre: 'ap', sep: 'sep', apex: 'apex', rv: 'rv', lva: 'lva', lvl: 'lvl', lvi: 'lvi', base: 'base' };
const CD_SHORT = { ra: 'Right atrium', la: 'Left atrium', pre: 'Pre-excited wall', sep: 'Septum', apex: 'Apex & anterior wall', rv: 'RV free wall', lva: 'Anterolateral wall', lvl: 'Lateral wall', lvi: 'Inferoposterior wall', base: 'Posterobasal wall' };
const CD_COL = { ra: '#9c6b3f', la: '#c08a4e', pre: '#7b4fa3', sep: '#b3261e', apex: '#e4572e', rv: '#2b6cb0', lva: '#c2410c', lvl: '#d97706', lvi: '#15803d', base: '#6d28d9' };
/* the classic lesions' teaching texts live in the ECG lab; the rest are short notes */
const CD_NOTES = {
  irbbb: 'The right bundle conducts, late: the right ventricle is still reached through it, so the terminal forces are only a little delayed and the QRS sits between 100 and 120 ms — an r′ in V1 that is narrower than the complete block’s. Push the dial past 95% and the muscle route takes over.',
  bifasc: 'Right bundle and anterior fascicle both out: the rSR′ of the right bundle plus the left axis of the fascicle. Two of the three fascicles gone — the third is what stands between this patient and complete block.',
  trifasc: 'The old name for a bifascicular block with a long PR. The PR here is nodal in most patients, so it is not truly a third fascicle, but the combination still earns a pacemaker conversation when there is syncope.',
  wpwb: 'A right-sided pathway pre-excites the right ventricle: the delta wave is negative in V1 (a left-bundle-like shape), positive in the lateral leads. Compare the left lateral pathway, whose delta is positive in V1.',
  chb_j: 'Complete block at the node: nothing reaches the His, which escapes at 40–60/min with a narrow QRS, and the P waves walk through unrelated. Atropine and the junction’s own rate decide how stable this is.',
  chb_v: 'Complete block below the His: the escape comes from the ventricle, wide and slow (20–40/min), and unreliable. This is the pacemaker-today kind.',
  af: 'No organised atrial activation: a fibrillating baseline and an AV node admitting impulses at random, so the ventricular rhythm is irregularly irregular. The QRS is whatever the ventricles do with a normal conduction system.',
  flutter: 'A macro-re-entrant circuit in the right atrium at about 300/min writes a sawtooth without an isoelectric baseline, negative in II, III and aVF for the common counter-clockwise loop; the node lets every second (or third, or fourth) one through.',
  pvc: 'A focus in the outflow tract fires after every sinus beat: the wide complex is shaped like a left bundle branch block with an inferior axis because the wavefront leaves the right ventricle and travels down — the signature of an RVOT origin.',
  vt: 'A ventricular focus at 165/min captures the ventricles while the sinus node keeps the atria: wide complexes, P waves marching through (AV dissociation), a right-bundle-like shape because the origin is left-sided. Dissociation is the strongest argument for VT in a wide-complex tachycardia.',
  paced: 'A lead in the right ventricular apex: the spike, then a wide left-bundle-like complex with a superior axis because the wavefront starts at the bottom of the heart and travels up and to the left.',
  stemi_inf: 'A transmural injury current from the inferior wall points at II, III and aVF (ST elevation) and away from aVL (reciprocal depression). III higher than II and depression in I point at the right coronary; a right-sided lead would ask about the right ventricle.',
  stemi_ant: 'Injury in the septum and the anterior wall lifts the ST in V1–V4 (and V5 when the lateral wall joins); the reciprocal changes sit in the inferior leads when the vector tilts up.',
  old_inf: 'The inferior wall no longer depolarises: the forces that pointed at III and aVF are gone, the unopposed anterosuperior forces write Q waves in their place, and the axis drifts up. An old infarct is read from the first 40 ms.',
  old_ant: 'Septum and apex gone: the r that should grow across V1–V3 does not (poor R-wave progression, or a QS), because the forces that faced those leads are missing.',
  isch: 'Subendocardial ischaemia of the lateral wall: the injury vector points away from the leads facing it, so the ST sags in I, aVL, V5–6 and the T inverts there. No reciprocal elevation except in aVR, which looks at the cavity.',
  lvh: 'A thick left ventricle writes big voltages (S in V1 + R in V5/V6 ≥ 3.5 mV) and, as the wall outgrows its blood supply, a strain pattern: ST depression and T inversion in the leads that see the tallest R.',
  rvh: 'A thick right ventricle pushes the mean vector right and forward: a dominant R in V1, a right axis, often with a little conduction delay through the thickened wall.',
  hyperk: 'Potassium first peaks and narrows the T (the repolarising current speeds up), then flattens the P and slows conduction through the whole ventricle until the QRS widens into the sine wave of the pre-arrest heart. The dial moves all three at once.',
  lqt: 'The T comes late: a long QT. Drugs, hypokalaemia, hypomagnesaemia and the channelopathies lengthen repolarisation; the risk is torsades, which starts on the T of a long cycle.'
};
function cdCfg() { if (!CDS.cfg) CDS.cfg = CD.preset(CDS.preset); return CDS.cfg; }
function cdCompute() { const st = CD.strip(cdCfg(), ECG_ST.strip / 1000); st.reading = CD.interpret(st); CDS.st = st; return st; }
function cdFirstBeat(st) { const b = st.bts.filter(x => x.q !== null && x.q !== undefined); return b.filter(x => x.kind === 'conducted')[0] || b[0] || null; }
/* ---- the dials of one element ---- */
function cdRange(label, get, set, min, max, step, fmt, attrs) {
  const id = uid('cd'), val = h('span', { class: 'odc-val', text: fmt ? fmt(get()) : String(get()) });
  return h('label', Object.assign({ class: 'odc-sl', for: id }, attrs || {}), [h('span', { class: 'nod-l', text: label }), h('input', { type: 'range', id: id, min: String(min), max: String(max), step: String(step), value: String(get()), oninput: (e) => { set(+e.target.value); val.textContent = fmt ? fmt(+e.target.value) : e.target.value; CDS.touched = true; cdRefresh(); } }), val]);
}
function cdSelect(label, get, set, options, attrs) {
  const id = uid('cd');
  return h('label', Object.assign({ class: 'nod-f', for: id }, attrs || {}), [h('span', { class: 'nod-l', text: label }), h('select', { id: id, onchange: (e) => { set(e.target.value); CDS.touched = true; cdRefresh(true); } }, options.map(o => h('option', { value: o[0], selected: String(get()) === o[0], text: o[1] })))]);
}
function cdCheck(label, get, set, attrs) {
  const id = uid('cd');
  return h('label', Object.assign({ class: 'chk-inline', for: id }, attrs || {}), [h('input', { type: 'checkbox', id: id, checked: !!get(), onchange: (e) => { set(e.target.checked); CDS.touched = true; cdRefresh(true); } }), label]);
}
const cdPct = (v) => Math.round(v * 100) + '%';
const cdBlockFmt = (v) => v >= 0.95 ? 'blocked' : (v <= 0.02 ? 'open' : 'conducting with ' + Math.round(v * 60) + ' ms of delay');
function cdPanel(sel) {
  const cfg = cdCfg(), rows = [];
  const title = (CD_ELEMENTS.filter(e => e[0] === sel)[0] || [sel, sel])[1];
  if (sel === 'sa') {
    rows.push(cdSelect('Rhythm', () => cfg.sa.mode, (v) => { cfg.sa.mode = v; }, [['sinus', 'Sinus rhythm'], ['af', 'Atrial fibrillation'], ['flutter', 'Atrial flutter'], ['arrest', 'Sinus arrest (no P waves)']], { 'data-cd-samode': '1' }));
    if (cfg.sa.mode === 'sinus') rows.push(cdRange('Sinus rate (/min)', () => cfg.sa.rate, (v) => { cfg.sa.rate = v; }, 30, 180, 1, null, { 'data-cd-row': 'rate' }));
    if (cfg.sa.mode === 'af') rows.push(cdRange('Ventricular response (/min)', () => cfg.sa.afRate, (v) => { cfg.sa.afRate = v; }, 50, 180, 5));
    if (cfg.sa.mode === 'flutter') rows.push(cdSelect('Conduction ratio', () => cfg.sa.flutterRatio, (v) => { cfg.sa.flutterRatio = +v; }, [['2', '2:1 (150/min)'], ['3', '3:1 (100/min)'], ['4', '4:1 (75/min)']]));
    rows.push(h('p', { class: 'fine', text: 'The sinus node sets the rate; fibrillation and flutter replace the P wave with a baseline of their own and hand the node a different problem.' }));
  } else if (sel === 'atria') {
    rows.push(cdRange('Bachmann’s bundle: interatrial delay', () => cfg.atria.bach, (v) => { cfg.atria.bach = v; }, 0, 1, 0.05, (v) => v > 0.5 ? 'interatrial block (+' + Math.round(v * 60) + ' ms)' : (v > 0 ? '+' + Math.round(v * 60) + ' ms' : 'normal')));
    rows.push(cdCheck('Right atrial enlargement (P pulmonale)', () => cfg.atria.rae, (v) => { cfg.atria.rae = v; }));
    rows.push(cdCheck('Left atrial enlargement (P mitrale)', () => cfg.atria.lae, (v) => { cfg.atria.lae = v; }));
    rows.push(h('p', { class: 'fine', text: 'The right atrium writes the first half of the P, the left atrium the second; a slow Bachmann’s bundle separates them (a broad, notched P); a big right atrium makes the P tall, a big left one makes it long.' }));
  } else if (sel === 'av') {
    rows.push(cdSelect('Behaviour', () => cfg.av.mode, (v) => { cfg.av.mode = v; }, [['normal', 'Conducts every beat'], ['wenck', 'Mobitz I (Wenckebach)'], ['mobitz2', 'Mobitz II'], ['complete', 'Complete block']], { 'data-cd-avmode': '1' }));
    if (cfg.av.mode !== 'complete') rows.push(cdRange('Nodal delay (PR = 80 ms + this)', () => cfg.av.delay, (v) => { cfg.av.delay = v; }, 40, 320, 10, (v) => (80 + v) + ' ms PR', { 'data-cd-row': 'avdelay' }));
    if (cfg.av.mode === 'wenck') rows.push(cdSelect('Cycle', () => cfg.av.wenck, (v) => { cfg.av.wenck = +v; }, [['3', '3:2'], ['4', '4:3'], ['5', '5:4'], ['6', '6:5']]));
    if (cfg.av.mode === 'mobitz2') rows.push(cdSelect('Dropped beat every', () => cfg.av.ratio, (v) => { cfg.av.ratio = +v; }, [['2', '2:1'], ['3', '3:2'], ['4', '4:3']]));
    rows.push(h('p', { class: 'fine', text: 'The node is the delay: first-degree block lengthens it, Wenckebach lengthens it a little more each beat until one fails, Mobitz II fails without warning (the disease is usually below the node), complete block hands the ventricles to an escape pacemaker.' }));
  } else if (/^(his|rbb|lbb|laf|lpf)$/.test(sel)) {
    rows.push(cdRange('Conduction', () => cfg[sel].block, (v) => { cfg[sel].block = v; }, 0, 1, 0.05, cdBlockFmt, { 'data-cd-row': 'block' }));
    rows.push(h('p', { class: 'fine', text: sel === 'his' ? 'Block in the His bundle is complete heart block with a ventricular escape: nothing below it is reached from above.' : 'Up to 95% the element still delivers its wall, late — the wall activates slower and the QRS widens a little (an incomplete block). Past that, the wall is reached from its neighbours: late, slow, and pointing from there.' }));
  } else if (sel === 'purk') {
    rows.push(cdRange('Conduction speed of the network and the muscle', () => cfg.purk.speed, (v) => { cfg.purk.speed = v; }, 0.5, 1.2, 0.05, (v) => Math.round(v * 100) + '% of normal'));
    rows.push(h('p', { class: 'fine', text: 'Sodium-channel blockade (class I drugs, tricyclics), hyperkalaemia and ischaemia slow every path at once: the QRS widens without a bundle-branch shape.' }));
  } else if (sel === 'ap') {
    rows.push(cdCheck('Accessory pathway present', () => cfg.ap.on, (v) => { cfg.ap.on = v; }, { 'data-cd-ap': '1' }));
    rows.push(cdSelect('Where it inserts', () => cfg.ap.site, (v) => { cfg.ap.site = v; }, Object.keys(CD.AP_SITES).map(k => [k, CD.AP_SITES[k].name])));
    rows.push(cdRange('Share of the ventricle it captures', () => cfg.ap.share, (v) => { cfg.ap.share = v; }, 0.05, 1, 0.05, cdPct));
    rows.push(h('p', { class: 'fine', text: 'A bundle of Kent skips the node: the wall beside it starts early (short PR, delta wave), the rest arrives through the normal system, and the QRS is the fusion of the two. The delta’s direction locates the pathway.' }));
  } else if (sel === 'focus') {
    rows.push(cdSelect('Behaviour', () => cfg.focus.mode, (v) => { cfg.focus.mode = v; }, [['off', 'Quiet'], ['pvc', 'Premature beats (PVCs)'], ['paced', 'Pacemaker (ventricular pacing)'], ['vt', 'Ventricular tachycardia']], { 'data-cd-focusmode': '1' }));
    rows.push(cdSelect('Site', () => cfg.focus.site, (v) => { cfg.focus.site = v; }, Object.keys(CD.FOCI).map(k => [k, CD.FOCI[k].name])));
    if (cfg.focus.mode === 'pvc') { rows.push(cdSelect('Every', () => cfg.focus.every, (v) => { cfg.focus.every = +v; }, [['2', '2nd beat (bigeminy)'], ['3', '3rd beat (trigeminy)'], ['4', '4th beat'], ['6', '6th beat']])); rows.push(cdRange('Coupling (fraction of the RR)', () => cfg.focus.coupling, (v) => { cfg.focus.coupling = v; }, 0.35, 0.85, 0.05, cdPct)); }
    if (cfg.focus.mode === 'paced' || cfg.focus.mode === 'vt') rows.push(cdRange('Rate (/min)', () => cfg.focus.rate, (v) => { cfg.focus.rate = v; }, 40, 220, 5));
    rows.push(h('p', { class: 'fine', text: 'A beat that starts in a wall spreads muscle to muscle from there: wide, and shaped by where it began — right-sided origins look like LBBB, left-sided like RBBB; an apical origin has a superior axis, an outflow-tract origin an inferior one.' }));
  } else if (sel === 'escape') {
    rows.push(cdRange('Junctional escape rate (/min)', () => cfg.escape.junctional, (v) => { cfg.escape.junctional = v; }, 20, 70, 1));
    rows.push(cdRange('Ventricular escape rate (/min)', () => cfg.escape.ventricular, (v) => { cfg.escape.ventricular = v; }, 15, 50, 1));
    rows.push(h('p', { class: 'fine', text: 'Whenever nothing arrives for an escape interval, the next pacemaker down fires: the junction (narrow) if the His is intact, a ventricular focus (wide) if it is not.' }));
  } else if (sel === 'repol') {
    rows.push(cdRange('QT (repolarisation time)', () => cfg.repol.qt, (v) => { cfg.repol.qt = v; }, 0.7, 1.6, 0.05, (v) => Math.round(v * 100) + '% of normal'));
    rows.push(cdRange('Hyperkalaemia', () => cfg.repol.k, (v) => { cfg.repol.k = v; }, 0, 1, 0.05, (v) => v === 0 ? 'normal potassium' : (v < 0.35 ? 'mild: peaked T' : (v < 0.7 ? 'moderate: P flattening, QRS widening' : 'severe: toward the sine wave'))));
    rows.push(h('p', { class: 'fine', text: 'Repolarisation is drawn as a bump after each wall’s activation; its timing is the QT, its shape the T. Potassium changes the T first, then the P and the QRS.' }));
  } else if (cfg.myo[sel]) {
    const m = cfg.myo[sel];
    rows.push(cdRange('Mass (0 = infarcted, 1 = normal, 2 = hypertrophied)', () => m.mass, (v) => { m.mass = v; }, 0, 2.5, 0.05, (v) => v < 0.3 ? 'infarct (' + Math.round(v * 100) + '%)' : (v > 1.3 ? 'hypertrophy ×' + v.toFixed(2) : '×' + v.toFixed(2)), { 'data-cd-row': 'mass' }));
    rows.push(cdRange('Subendocardial ischaemia', () => m.isch, (v) => { m.isch = v; }, 0, 1, 0.05, cdPct, { 'data-cd-row': 'isch' }));
    rows.push(cdRange('Transmural injury (acute)', () => m.injury, (v) => { m.injury = v; }, 0, 1, 0.05, cdPct, { 'data-cd-row': 'injury' }));
    rows.push(h('p', { class: 'fine', text: 'Mass scales the wall’s forces (an infarct removes them and the opposite forces write a Q; hypertrophy enlarges them and strains the T). Ischaemia sags the ST and inverts the T in the leads that face the wall; a transmural injury current lifts the ST in those leads and lowers it in the opposite ones.' }));
  }
  return h('div', { class: 'cd-panel', 'data-cd-panel': sel }, [h('h5', { text: title })].concat(rows));
}
/* ---- the heart: clickable, with the state of every element drawn on it ---- */
function cdHeart(st) {
  const heart = heartFig(st.seq);
  Object.keys(heart.paths).forEach(id => { const el = CD_PATH2EL[id]; if (!el) return; heart.paths[id].style.cursor = 'pointer'; heart.paths[id].setAttribute('data-cd-pick', el); heart.paths[id].addEventListener('click', () => { CDS.sel = el; cdRefresh(true); }); });
  Object.keys(heart.regions).forEach(id => { const el = CD_REG2EL[id]; if (!el) return; heart.regions[id].style.cursor = 'pointer'; heart.regions[id].setAttribute('data-cd-pick', el); heart.regions[id].addEventListener('click', () => { CDS.sel = el; cdRefresh(true); }); });
  cdPaintStates(heart);
  return heart;
}
function cdPaintStates(heart) {
  const cfg = cdCfg(), es = CD.elementStates(cfg);
  Object.keys(heart.blocks).forEach(id => { heart.blocks[id].style.display = es[id] === 'blocked' ? '' : 'none'; });
  Object.keys(heart.paths).forEach(id => { const p = heart.paths[id]; p.classList.toggle('blocked', es[id] === 'blocked'); p.classList.toggle('delayed', es[id] === 'delayed'); p.classList.toggle('picked', CD_PATH2EL[id] === CDS.sel); });
  heart.paths.ap.style.display = cfg.ap.on ? '' : 'none'; heart.regions.pre.style.display = cfg.ap.on ? '' : 'none';
  Object.keys(heart.regions).forEach(id => { const r = heart.regions[id]; r.classList.toggle('picked', CD_REG2EL[id] === CDS.sel); const m = cfg.myo[id]; r.classList.toggle('infarct', !!(m && m.mass < 0.3)); r.classList.toggle('injured', !!(m && m.injury > 0.3)); r.classList.toggle('isch', !!(m && m.isch > 0.3)); });
}
/* ---- a lead is a sum of its parts ---- */
function cdParts(st, lead) {
  const b = cdFirstBeat(st);
  const W = 660, rowH = 30, left = 172, top = 14, t0 = -90, t1 = 470, mvPx = 22;
  const rows = [];
  if (b) {
    const regs = b.seq.S.vent.slice().sort((a, c) => a.t0 - c.t0).map(x => x.id);
    const pRows = st.cfg.sa.mode === 'sinus' && b.p !== null && b.p !== undefined ? ['ra', 'la'] : [];
    pRows.concat(regs).forEach(id => rows.push(id));
  }
  const H = top + (rows.length + 1) * rowH + 24;
  const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'cd-parts-svg', role: 'img', 'aria-label': 'Each region’s contribution to lead ' + lead + ' and their sum' });
  svg.appendChild(sv('rect', { x: 0, y: 0, width: W, height: H, class: 'cd-parts-bg' }));
  if (!b) { svg.appendChild(svt(left, 30, 'No ventricular beat on the strip', { class: 'ecg-ll' })); return svg; }
  const xOf = (t) => left + (t - t0) / (t1 - t0) * (W - left - 10);
  const names = {}; b.seq.S.vent.forEach(x => { names[x.id] = x; }); st.seq.S.atria.forEach(x => { names[x.id] = x; });
  // sample once, keeping the parts
  const samples = [];
  for (let t = t0; t <= t1; t += 3) { const parts = {}; const v = CD.voltageAt(lead, st, b.q + t, parts); samples.push({ t: t, v: v, parts: parts }); }
  // the QRS window and the time rule
  svg.appendChild(sv('rect', { x: xOf(b.seq.qrsStart), y: top, width: xOf(b.seq.qrsEnd) - xOf(b.seq.qrsStart), height: (rows.length + 1) * rowH, class: 'cd-qrs' }));
  [0, 100, 200, 300, 400].forEach(ms => { svg.appendChild(sv('line', { x1: xOf(ms), y1: top, x2: xOf(ms), y2: top + (rows.length + 1) * rowH, class: 'cd-tick' })); svg.appendChild(svt(xOf(ms), H - 8, ms + ' ms', { class: 'ecg-ll', 'text-anchor': 'middle' })); });
  rows.forEach((id, i) => {
    const y0 = top + i * rowH + rowH * 0.6, x = names[id] || {};
    let d = '';
    samples.forEach(s => { const v = s.parts[id] || 0; d += (d ? ' L' : 'M') + xOf(s.t).toFixed(1) + ' ' + (y0 - v * mvPx).toFixed(1); });
    svg.appendChild(sv('line', { x1: left, y1: y0, x2: W - 10, y2: y0, class: 'cd-base' }));
    svg.appendChild(sv('path', { d: d, class: 'cd-part', stroke: CD_COL[id] || '#888', 'data-cd-part': id }));
    const label = CD_SHORT[id] || (x.name || id).replace(/ \(.*\)$/, '');
    svg.appendChild(svt(6, y0 + 4, label, { class: 'cd-lab', fill: CD_COL[id] || '#888' }));
    if (x.via) svg.appendChild(svt(6, y0 + 13, (x.via === 'muscle' ? 'muscle, from ' + ((names[x.from] || {}).name || x.from || '').split(' ')[0].toLowerCase() : (x.via === 'focus' ? 'the focus' : (x.via === 'ap' ? 'accessory pathway' : 'via ' + x.via.toUpperCase()))) + (x.t0 !== undefined && id !== 'ra' && id !== 'la' ? ' · ' + Math.round(x.t0) + ' ms' : ''), { class: 'cd-sub' }));
  });
  // the sum
  const ys = top + rows.length * rowH + rowH * 0.6;
  let d = ''; samples.forEach(s => { d += (d ? ' L' : 'M') + xOf(s.t).toFixed(1) + ' ' + (ys - s.v * mvPx).toFixed(1); });
  svg.appendChild(sv('line', { x1: left, y1: ys, x2: W - 10, y2: ys, class: 'cd-base' }));
  svg.appendChild(sv('path', { d: d, class: 'cd-sum', 'data-cd-sum': lead }));
  svg.appendChild(svt(6, ys + 4, '= lead ' + lead, { class: 'cd-lab strong' }));
  svg.appendChild(sv('path', { d: 'M' + (left + 4) + ' ' + ys + ' l0 -' + mvPx + ' l6 0 l0 ' + mvPx, class: 'ecg-cal' }));
  return svg;
}
/* ---- the reading, from the traces ---- */
function cdReading(st) {
  const rd = st.reading;
  return h('div', { class: 'cd-reading', 'data-cd-reading': '1' }, [h('h5', { text: 'The reading (made from the traces)' })].concat(rd.lines.map(l => h('p', { class: 'cd-line', 'data-cd-line': l[0] }, [h('b', { text: l[0] + '. ' }), l[1]]))));
}
function cdReads(st) {
  const b = cdFirstBeat(st), s = b ? b.seq : st.seq, cfg = st.cfg;
  const rate = cfg.sa.mode === 'sinus' && st.vRate === cfg.sa.rate ? cfg.sa.rate + '/min' : (cfg.sa.mode === 'sinus' ? 'atrial ' + cfg.sa.rate + ', ventricular ' + st.vRate + '/min' : 'ventricular ' + st.vRate + '/min');
  return h('div', { class: 'ecg-reads', 'data-cd-reads': '1' }, [
    h('span', { class: 'ecg-read' }, [h('b', { text: 'Rate ' }), rate]),
    h('span', { class: 'ecg-read' }, [h('b', { text: 'PR ' }), (b && b.kind === 'conducted' && cfg.sa.mode === 'sinus' ? (cfg.av.mode === 'wenck' ? 'lengthening' : s.pr + ' ms') : '—')]),
    h('span', { class: 'ecg-read', 'data-cd-qrs': String(s.qrs) }, [h('b', { text: 'QRS ' }), s.qrs + ' ms']),
    h('span', { class: 'ecg-read', 'data-cd-axis': String(s.axis) }, [h('b', { text: 'Axis ' }), s.axis + '°'])
  ]);
}
/* ---- the lab ---- */
function cdRefresh(full) {
  if (CDS.pending) return; CDS.pending = requestAnimationFrame(() => { CDS.pending = 0; cdApply(full); });
}
function cdApply(full) {
  const root = document.querySelector('[data-condlab]'); if (!root) return;
  const st = cdCompute(), v = ECG_ST.view;
  if (full) { const slot = root.querySelector('[data-cd-panelslot]'); if (slot) { slot.textContent = ''; slot.appendChild(cdPanel(CDS.sel)); } const es = root.querySelector('[data-cd-el]'); if (es && es.value !== CDS.sel) es.value = CDS.sel; }
  if (v && v.heart) cdPaintStates(v.heart);
  const b = cdFirstBeat(st), seq = b ? b.seq : st.seq;
  const paper = ecgPaper(seq, st.bts, (lead, T) => CD.voltageAt(lead, st, T));
  const pw = root.querySelector('[data-cd-paper]'); if (pw) { pw.textContent = ''; pw.appendChild(paper.svg); }
  const dial = vectorDial(seq);
  const dw = root.querySelector('[data-cd-dial]'); if (dw) { dw.textContent = ''; dw.appendChild(dial.svg); }
  const rw = root.querySelector('[data-cd-readsslot]'); if (rw) { rw.textContent = ''; rw.appendChild(cdReads(st)); }
  const parts = root.querySelector('[data-cd-partsslot]'); if (parts) { parts.textContent = ''; parts.appendChild(cdParts(st, CDS.lead)); }
  const rd = root.querySelector('[data-cd-readingslot]'); if (rd) { rd.textContent = ''; rd.appendChild(cdReading(st)); }
  const note = root.querySelector('[data-cd-note]'); if (note) note.textContent = cdNote();
  if (v) { v.paper = paper; v.dial = dial; v.seq = seq; v.bts = st.bts; v.keepAv = st.cfg.av.mode === 'complete'; v.stateAt = (t) => CD.stateAt(st, t); v.vecAt = (t) => { const bb = st.bts.filter(x => x.q !== null && x.q !== undefined && x.q - 80 <= t && t < x.q + 520)[0]; return bb ? CD.dipole(bb.seq.S, t - bb.q, st.cfg) : [0, 0, 0]; }; v.curBeat = () => null; }
  root.setAttribute('data-cd-preset', CDS.preset);
}
function cdNote() {
  const scn = (window.PFT_ECG && PFT_ECG.SCENARIOS || []).filter(x => x.id === ({ wenck: 'mobitz1', chb_j: 'chb' })[CDS.preset] || x.id === CDS.preset)[0];
  const base = CD_NOTES[CDS.preset] || (scn ? scn.mech : '');
  const name = (CD.PRESETS.filter(p => p.id === CDS.preset)[0] || {}).name || '';
  return CDS.touched ? 'Your own settings, started from “' + name + '”. ' + base : base;
}
function conductionLab() {
  const st = cdCompute(), b = cdFirstBeat(st), seq = b ? b.seq : st.seq;
  const heart = cdHeart(st), paper = ecgPaper(seq, st.bts, (lead, T) => CD.voltageAt(lead, st, T)), dial = vectorDial(seq);
  const presetSel = h('select', { 'aria-label': 'Preset', 'data-cd-presetsel': '1', onchange: (e) => { CDS.preset = e.target.value; CDS.cfg = CD.preset(CDS.preset); CDS.touched = false; ECG_ST.t = 0; cdRefresh(true); } }, CD.PRESETS.map(p => h('option', { value: p.id, selected: p.id === CDS.preset, text: p.name })));
  const elSel = h('select', { 'aria-label': 'Element', 'data-cd-el': '1', onchange: (e) => { CDS.sel = e.target.value; cdRefresh(true); } }, CD_ELEMENTS.map(e => h('option', { value: e[0], selected: e[0] === CDS.sel, text: e[1] })));
  const leadSel = h('select', { 'aria-label': 'Lead', 'data-cd-lead': '1', onchange: (e) => { CDS.lead = e.target.value; cdRefresh(); } }, (window.PFT_ECG ? PFT_ECG.LEADS : []).map(l => h('option', { value: l[0], selected: l[0] === CDS.lead, text: l[0] })));
  const playBtn = h('button', { type: 'button', class: 'btn sm', 'data-ecg-play': '1', 'aria-pressed': String(ECG_ST.playing), text: ECG_ST.playing ? '❚❚ Pause' : '▶ Play', onclick: () => ecgPlay(!ECG_ST.playing) });
  const speed = h('select', { 'aria-label': 'Playback speed', 'data-ecg-speed': '1', onchange: (e) => { ECG_ST.speed = +e.target.value; } }, [[0.1, '1/10 speed'], [0.25, '1/4 speed'], [0.5, '1/2 speed'], [1, 'real time']].map(o => h('option', { value: String(o[0]), selected: ECG_ST.speed === o[0], text: o[1] })));
  const range = h('input', { type: 'range', class: 'ecg-scrub', min: '0', max: String(ECG_ST.strip), step: '4', value: String(Math.round(ECG_ST.t)), 'data-ecg-t': '1', 'aria-label': 'Time on the strip', oninput: (e) => { ECG_ST.t = +e.target.value; if (!ECG_ST.raf) ECG_ST.raf = requestAnimationFrame(ecgFrame); } });
  const timeEl = h('span', { class: 'ecg-time', 'data-ecg-time': '1' });
  const legend = h('div', { class: 'ecg-legend' }, [h('span', { class: 'ecg-lg rest' }, [h('i'), 'resting']), h('span', { class: 'ecg-lg act' }, [h('i'), 'depolarising']), h('span', { class: 'ecg-lg dep' }, [h('i'), 'depolarised']), h('span', { class: 'ecg-lg path' }, [h('i'), 'conducting']), h('span', { class: 'ecg-lg dly' }, [h('i'), 'delayed']), h('span', { class: 'ecg-lg blk' }, [h('i'), 'blocked'])]);
  const root = h('div', { class: 'ecg-lab cd-lab', 'data-condlab': '1', 'data-cd-preset': CDS.preset }, [
    h('div', { class: 'ecg-ctl' }, [h('label', { class: 'ecg-pick' }, [h('span', { class: 'lbl', text: 'Start from ' }), presetSel]), h('label', { class: 'ecg-pick' }, [h('span', { class: 'lbl', text: 'Element ' }), elSel]), h('button', { type: 'button', class: 'lnk', 'data-cd-reset': '1', text: 'Reset to normal', onclick: () => { CDS.preset = 'normal'; CDS.cfg = CD.preset('normal'); CDS.touched = false; cdRefresh(true); } })]),
    h('div', { class: 'ecg-ctl' }, [playBtn, speed, range, timeEl]),
    h('div', { class: 'ecg-top cd-top' }, [
      h('figure', { class: 'an-fig ecg-heartfig' }, [heart.svg, legend, h('figcaption', { text: 'Click a path or a wall to select it; its dials appear on the right. Blocked paths are crossed, delayed ones dashed; infarcted walls are grey, injured ones outlined.' })]),
      h('div', { class: 'ecg-side cd-side' }, [h('div', { 'data-cd-panelslot': '1' }, [cdPanel(CDS.sel)]), h('div', { 'data-cd-readsslot': '1' }, [cdReads(st)]), h('figure', { class: 'an-fig ecg-dialfig' }, [h('div', { 'data-cd-dial': '1' }, [dial.svg]), h('figcaption', { text: 'Frontal plane: the QRS loop, the mean axis and the vector at the cursor.' })])])
    ]),
    h('div', { class: 'ecg-wrap', 'data-cd-paper': '1' }, [paper.svg]),
    h('p', { class: 'fine cd-note', 'data-cd-note': '1', text: cdNote() }),
    h('div', { class: 'cd-partsbox' }, [h('div', { class: 'ecg-ctl' }, [h('h5', { text: 'A lead is a sum of its parts' }), h('label', { class: 'ecg-pick' }, [h('span', { class: 'lbl', text: 'Lead ' }), leadSel])]), h('div', { class: 'cd-parts', 'data-cd-partsslot': '1' }, [cdParts(st, CDS.lead)]), h('p', { class: 'fine', text: 'The first beat of the strip: each region’s dipole projected onto the lead (activation, then its ST and T), and the sum, which is the trace on the paper. A region reached muscle to muscle says so, with where it came from.' })]),
    h('div', { 'data-cd-readingslot': '1' }, [cdReading(st)])
  ]);
  ECG_ST.view = { root: root, paper: paper, heart: heart, dial: dial, seq: seq, bts: st.bts, range: range, timeEl: timeEl, playBtn: playBtn, curBeat: () => null, keepAv: st.cfg.av.mode === 'complete',
    stateAt: (t) => CD.stateAt(CDS.st, t), vecAt: (t) => { const S = CDS.st; const bb = S.bts.filter(x => x.q !== null && x.q !== undefined && x.q - 80 <= t && t < x.q + 520)[0]; return bb ? CD.dipole(bb.seq.S, t - bb.q, S.cfg) : [0, 0, 0]; } };
  if (!ECG_ST.raf) ECG_ST.raf = requestAnimationFrame(ecgFrame);
  return root;
}
function condWidget(kind) { return kind === 'conduction' ? conductionLab() : null; }
