
/* ========================================================================== Learn: conduction and the ECG
   The lab: a heart drawing whose regions light up as the wavefront passes, the twelve leads written by the same
   wavefront, a dial with the frontal-plane vector, a scrubber and a play button. Model and text in ecg.js. */
const ECG = window.PFT_ECG || { topics: {}, groups: [], SCENARIOS: [], LEADS: [], LAYOUT: [] };
const ECG_ST = { scn: 'normal', deg: {}, t: 0, playing: false, speed: 0.25, raf: 0, last: 0, strip: 10000, view: null, loop: true };
const ECG_PX = 3;   // pixels per millimetre of paper (25 mm/s, 10 mm/mV)
function ecgScenario() { return ECG.SCENARIOS.filter(s => s.id === ECG_ST.scn)[0] || ECG.SCENARIOS[0]; }
function ecgDeg(scn) { const p = scn.param; if (!p) return 0; const v = ECG_ST.deg[scn.id]; return v === undefined ? p.value : v; }

/* ---- the twelve leads on paper: 3 × 4 at 2.5 s a column, then a 10-second strip of lead II */
function ecgPaper(seq, bts) {
  const colW = 2.5 * 25 * ECG_PX, rowH = 32 * ECG_PX, left = 6, top = 6, W = left * 2 + 4 * colW, H = top * 2 + 4 * rowH;
  const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'ecg-paper', width: W, height: H, role: 'img', 'aria-label': 'Twelve-lead ECG written by the model' });
  const pid = uid('eg');
  const defs = sv('defs', {});
  const small = sv('pattern', { id: pid + 's', width: ECG_PX, height: ECG_PX, patternUnits: 'userSpaceOnUse' });
  small.appendChild(sv('path', { d: 'M ' + ECG_PX + ' 0 L 0 0 0 ' + ECG_PX, class: 'ecg-g1' })); defs.appendChild(small);
  const big = sv('pattern', { id: pid + 'b', width: ECG_PX * 5, height: ECG_PX * 5, patternUnits: 'userSpaceOnUse' });
  big.appendChild(sv('rect', { width: ECG_PX * 5, height: ECG_PX * 5, fill: 'url(#' + pid + 's)' })); big.appendChild(sv('path', { d: 'M ' + ECG_PX * 5 + ' 0 L 0 0 0 ' + ECG_PX * 5, class: 'ecg-g5' })); defs.appendChild(big);
  svg.appendChild(defs);
  svg.appendChild(sv('rect', { x: 0, y: 0, width: W, height: H, class: 'ecg-bg' }));
  svg.appendChild(sv('rect', { x: left, y: top, width: 4 * colW, height: 4 * rowH, fill: 'url(#' + pid + 'b)' }));
  const xOf = (ms) => left + ms / 1000 * 25 * ECG_PX;
  const trace = (lead, t0, t1, baseY) => {
    let d = ''; const step = 4;
    for (let t = t0; t <= t1; t += step) { const v = ECG.voltageAt(lead, seq, bts, t); const x = xOf(t), y = baseY - v * 10 * ECG_PX; d += (d ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
    return sv('path', { d: d, class: 'ecg-tr', 'data-lead': lead });
  };
  ECG.LAYOUT.forEach((row, r) => {
    const baseY = top + r * rowH + rowH * 0.62;
    // calibration: 1 mV for 200 ms at the start of the row
    svg.appendChild(sv('path', { d: 'M' + (left + 2) + ' ' + baseY + ' l0 -' + 10 * ECG_PX + ' l' + 5 * ECG_PX + ' 0 l0 ' + 10 * ECG_PX, class: 'ecg-cal' }));
    row.forEach((lead, c) => {
      const t0 = c * 2500 + (c === 0 ? 260 : 0), t1 = (c + 1) * 2500;
      svg.appendChild(trace(lead, t0, t1, baseY));
      svg.appendChild(svt(left + c * colW + 10 * ECG_PX, top + r * rowH + 14, lead, { class: 'ecg-ll' }));
      if (c) svg.appendChild(sv('line', { x1: left + c * colW, y1: top + r * rowH + 6, x2: left + c * colW, y2: top + r * rowH + rowH - 6, class: 'ecg-sep' }));
    });
  });
  const stripY = top + 3 * rowH + rowH * 0.62;
  svg.appendChild(sv('path', { d: 'M' + (left + 2) + ' ' + stripY + ' l0 -' + 10 * ECG_PX + ' l' + 5 * ECG_PX + ' 0 l0 ' + 10 * ECG_PX, class: 'ecg-cal' }));
  svg.appendChild(trace('II', 260, ECG_ST.strip, stripY));
  svg.appendChild(svt(left + 10 * ECG_PX, top + 3 * rowH + 14, 'II (rhythm strip)', { class: 'ecg-ll' }));
  const cur = sv('line', { x1: xOf(ECG_ST.t), y1: top, x2: xOf(ECG_ST.t), y2: top + 4 * rowH, class: 'ecg-cursor', 'data-ecg-cursor': '1' });
  svg.appendChild(cur);
  return { svg: svg, cursor: cur, xOf: xOf };
}

/* ---- the heart: an anterior view with the chambers, the conduction system and the regions of the model */
const HEART_REGIONS = {
  ra: 'M78 96 C62 70 86 46 116 52 C140 56 150 76 146 96 L146 150 C120 158 92 150 78 128 Z',
  la: 'M206 92 C210 62 236 44 266 52 C296 60 306 90 294 116 L282 150 C258 160 226 158 206 148 Z',
  rv: 'M80 150 C66 190 80 236 118 268 C136 284 154 292 170 300 L166 240 L148 150 Z',
  sep: 'M148 150 L166 240 L170 300 C182 292 190 286 196 282 L192 236 L186 150 Z',
  apex: 'M150 290 C168 312 190 322 212 318 C226 314 232 302 232 292 C218 300 200 304 184 296 C172 292 160 292 150 290 Z',
  lva: 'M186 150 L192 236 L206 236 C232 236 256 220 266 196 C270 180 272 166 270 152 Z',
  lvl: 'M206 236 L196 282 C214 290 232 294 240 288 C262 278 276 254 282 232 C272 240 240 240 206 236 Z',
  lvi: 'M232 292 C256 294 280 278 290 252 C296 236 298 226 296 214 C292 236 282 258 268 270 C256 280 244 288 232 292 Z',
  base: 'M270 152 C286 156 296 170 298 190 C300 204 298 214 296 214 C290 190 284 170 282 150 Z'
};
const HEART_PATHS = {
  sa: { d: 'M118 64 C114 60 108 60 104 64', w: 6, name: 'Sinus node' },
  bach: { d: 'M118 64 C160 56 200 54 236 64', w: 2, dash: '3 3', name: 'Bachmann’s bundle to the left atrium' },
  internodal: { d: 'M118 64 C128 100 140 130 162 150', w: 2, dash: '3 3', name: 'Internodal pathways to the AV node' },
  av: { d: 'M158 150 C162 144 170 144 174 150', w: 7, name: 'AV node (the delay)' },
  his: { d: 'M168 152 L172 174', w: 4, name: 'Bundle of His' },
  rbb: { d: 'M172 174 C170 210 168 250 172 290 C176 300 164 300 150 294', w: 3, name: 'Right bundle branch' },
  lbb: { d: 'M172 174 C178 184 184 192 190 198', w: 4, name: 'Left bundle branch' },
  laf: { d: 'M190 198 C214 196 240 186 262 170', w: 3, name: 'Left anterior fascicle' },
  lpf: { d: 'M190 198 C210 228 240 256 270 266', w: 3, name: 'Left posterior fascicle' },
  ap: { d: 'M282 150 C290 160 292 172 288 186', w: 4, name: 'Accessory pathway (bundle of Kent)', hidden: true }
};
const REGION_NAMES = { ra: 'Right atrium', la: 'Left atrium', rv: 'Right ventricle', sep: 'Septum', apex: 'Apex', lva: 'Anterolateral wall', lvl: 'Lateral wall', lvi: 'Inferoposterior wall', base: 'Posterobasal wall', pre: 'Pre-excited base' };
function heartFig(seq) {
  const svg = sv('svg', { viewBox: '40 30 290 310', class: 'ecg-heart', role: 'img', 'aria-label': 'The heart with its conduction system; regions light up as they depolarise' });
  svg.appendChild(sv('path', { d: 'M64 96 C40 140 54 230 120 292 C150 318 190 332 222 318 C280 296 316 240 302 170 C298 140 300 90 272 54 C244 40 212 60 200 92 C176 60 130 40 100 56 C78 66 70 80 64 96 Z', class: 'ecg-hull' }));
  const regions = {};
  Object.keys(HEART_REGIONS).forEach(id => {
    const p = sv('path', { d: HEART_REGIONS[id], class: 'ecg-reg', 'data-region': id }); p.appendChild(sv('title', {})).textContent = REGION_NAMES[id];
    svg.appendChild(p); regions[id] = p;
  });
  // a left lateral pathway pre-excites the base: the pre region is drawn over the base
  regions.pre = sv('path', { d: HEART_REGIONS.base, class: 'ecg-reg', 'data-region': 'pre', style: 'display:none' }); svg.appendChild(regions.pre);
  const paths = {};
  Object.keys(HEART_PATHS).forEach(id => {
    const x = HEART_PATHS[id];
    const p = sv('path', { d: x.d, class: 'ecg-path' + (x.dash ? ' thin' : ''), 'data-path': id, 'stroke-width': x.w, 'stroke-dasharray': x.dash || null, style: x.hidden ? 'display:none' : null });
    p.appendChild(sv('title', {})).textContent = x.name;
    svg.appendChild(p); paths[id] = p;
  });
  // block marks: a cross on the blocked path
  const blocks = {};
  const blockAt = { rbb: [170, 214], lbb: [181, 186], laf: [226, 190], lpf: [222, 240], av: [166, 148] };
  Object.keys(blockAt).forEach(id => { const q = blockAt[id]; const g = sv('g', { class: 'ecg-block', 'data-block': id, style: 'display:none' }); g.appendChild(sv('line', { x1: q[0] - 6, y1: q[1] - 6, x2: q[0] + 6, y2: q[1] + 6 })); g.appendChild(sv('line', { x1: q[0] - 6, y1: q[1] + 6, x2: q[0] + 6, y2: q[1] - 6 })); svg.appendChild(g); blocks[id] = g; });
  // labels
  [[100, 92, 'RA'], [262, 88, 'LA'], [104, 214, 'RV'], [246, 214, 'LV'], [120, 58, 'SA'], [150, 140, 'AV'], [182, 316, 'apex'], [66, 318, "patient's right"]].forEach(l => svg.appendChild(svt(l[0], l[1], l[2], { class: 'ecg-hl' + (l[2].length > 5 ? ' side' : '') })));
  return { svg: svg, regions: regions, paths: paths, blocks: blocks };
}
/* the frontal-plane dial: the lead axes, the QRS loop, the moving vector and the mean axis */
function vectorDial(seq) {
  const R = 64, cx = 80, cy = 80;
  const svg = sv('svg', { viewBox: '0 0 160 160', class: 'ecg-dial', role: 'img', 'aria-label': 'Frontal-plane vector' });
  svg.appendChild(sv('circle', { cx: cx, cy: cy, r: R, class: 'ecg-dial-ring' }));
  [['I', 0], ['II', 60], ['III', 120], ['aVF', 90], ['aVL', -30], ['aVR', -150]].forEach(a => {
    const th = a[1] * Math.PI / 180, x2 = cx + R * Math.cos(th), y2 = cy + R * Math.sin(th);
    svg.appendChild(sv('line', { x1: cx - R * Math.cos(th) * 0.9, y1: cy - R * Math.sin(th) * 0.9, x2: x2, y2: y2, class: 'ecg-dial-ax' }));
    svg.appendChild(svt(cx + (R + 10) * Math.cos(th), cy + (R + 10) * Math.sin(th) + 3, a[0], { class: 'ecg-dial-l', 'text-anchor': 'middle' }));
  });
  // the QRS loop
  let d = ''; const sc = R / 2.4;
  for (let t = seq.qrsStart; t <= seq.qrsEnd; t += 2) { const v = ECG.dipole(seq.S, t); d += (d ? ' L' : 'M') + (cx + v[0] * sc).toFixed(1) + ' ' + (cy + v[1] * sc).toFixed(1); }
  svg.appendChild(sv('path', { d: d + ' Z', class: 'ecg-loop' }));
  const th = seq.axis * Math.PI / 180;
  svg.appendChild(sv('line', { x1: cx, y1: cy, x2: cx + R * 0.95 * Math.cos(th), y2: cy + R * 0.95 * Math.sin(th), class: 'ecg-axis' }));
  const arrow = sv('line', { x1: cx, y1: cy, x2: cx, y2: cy, class: 'ecg-vec', 'data-ecg-vec': '1' }); svg.appendChild(arrow);
  svg.appendChild(svt(4, 12, 'QRS axis ' + seq.axis + '°', { class: 'ecg-dial-l strong' }));
  return { svg: svg, arrow: arrow, cx: cx, cy: cy, sc: sc };
}

/* the colour of a region between resting and depolarised */
const ECG_REST = [241, 220, 212], ECG_ACT = [228, 87, 46], ECG_DEP = [201, 128, 111];
/* 0–1: resting to the bright front; 1: depolarised (a calmer red); 1–2: back to resting as the region repolarises */
function ecgMix(s) {
  const a = s <= 1 ? ECG_REST : ECG_DEP, b = s <= 1 ? ECG_ACT : ECG_REST, k = s <= 1 ? s : s - 1;
  const c = a.map((r, i) => Math.round(r + (b[i] - r) * k)); return 'rgb(' + c.join(',') + ')';
}
/* ---- the frame: cursor, heart state, vector; cheap enough for every animation frame */
function ecgFrame() {
  const v = ECG_ST.view; if (!v || !v.root.isConnected) { ECG_ST.raf = 0; ECG_ST.playing = false; return; }
  const now = performance.now();
  if (ECG_ST.playing) { const dt = Math.min(80, now - (ECG_ST.last || now)); ECG_ST.t += dt * ECG_ST.speed; if (ECG_ST.t >= ECG_ST.strip) ECG_ST.t = ECG_ST.loop ? 0 : ECG_ST.strip; }
  ECG_ST.last = now;
  const t = ECG_ST.t, x = v.paper.xOf(t);
  v.paper.cursor.setAttribute('x1', x); v.paper.cursor.setAttribute('x2', x);
  if (v.range && document.activeElement !== v.range) v.range.value = Math.round(t);
  const st = ECG.stateAt(v.seq, v.bts, t);
  Object.keys(v.heart.regions).forEach(id => {
    const s = st.regions[id] || 0, el = v.heart.regions[id];
    el.style.fill = s <= 0 ? '' : (s === 1 ? 'rgb(' + ECG_DEP.join(',') + ')' : ecgMix(Math.min(2, s)));
    el.classList.toggle('front', s > 0 && s < 1);
  });
  Object.keys(v.heart.paths).forEach(id => v.heart.paths[id].classList.toggle('on', !!st.paths[id]));
  if (v.heart.blocks.av) v.heart.blocks.av.style.display = st.paths.avblock ? '' : 'none';
  const d = ECG.dipole(v.seq.S, t - (v.curBeat(t) || -1e9));
  v.dial.arrow.setAttribute('x2', v.dial.cx + d[0] * v.dial.sc); v.dial.arrow.setAttribute('y2', v.dial.cy + d[1] * v.dial.sc);
  v.timeEl.textContent = (t / 1000).toFixed(2) + ' s' + (st.paths.av ? ' · in the AV node' : (Object.keys(st.regions).some(k => st.regions[k] > 0 && st.regions[k] < 1) ? ' · depolarising' : ''));
  if (v.playBtn) { v.playBtn.textContent = ECG_ST.playing ? '❚❚ Pause' : '▶ Play'; v.playBtn.setAttribute('aria-pressed', String(ECG_ST.playing)); }
  ECG_ST.raf = requestAnimationFrame(ecgFrame);
}
function ecgPlay(on) { ECG_ST.playing = on; ECG_ST.last = performance.now(); if (!ECG_ST.raf) ECG_ST.raf = requestAnimationFrame(ecgFrame); }

/* ---- the lab */
function ecgLab() {
  const scn = ecgScenario(), g = ecgDeg(scn), seq = ECG.sequence(scn, g), bts = ECG.beats(scn, seq, ECG_ST.strip / 1000);
  const paper = ecgPaper(seq, bts), heart = heartFig(seq), dial = vectorDial(seq);
  // blocked paths marked on the drawing
  const blocked = {};
  seq.S.vent.forEach(x => { if (x.blocked) { if (scn.id === 'rbbb') blocked.rbb = 1; if (scn.id === 'lbbb') blocked.lbb = 1; if (scn.id === 'lafb') blocked.laf = 1; if (scn.id === 'lpfb') blocked.lpf = 1; } });
  Object.keys(heart.blocks).forEach(id => { if (id !== 'av') heart.blocks[id].style.display = blocked[id] ? '' : 'none'; });
  Object.keys(blocked).forEach(id => heart.paths[id].classList.add('blocked'));
  if (scn.id === 'wpw') { heart.paths.ap.style.display = ''; heart.regions.pre.style.display = ''; }
  const sel = h('select', { id: 'ecg-scn', 'aria-label': 'Conduction scenario', onchange: (e) => { ECG_ST.scn = e.target.value; ECG_ST.t = 0; render(); } }, ECG.SCENARIOS.map(s => h('option', { value: s.id, selected: s.id === scn.id, text: s.name })));
  let slider = null;
  if (scn.param) {
    const p = scn.param, out = h('span', { class: 'ecg-degv', text: p.fmt ? p.fmt(g) : String(g) });
    const inp = h('input', { type: 'range', min: String(p.min), max: String(p.max), step: String(p.step), value: String(g), 'data-ecg-deg': '1', 'aria-label': p.label, oninput: (e) => { ECG_ST.deg[scn.id] = +e.target.value; out.textContent = p.fmt ? p.fmt(+e.target.value) : e.target.value; }, onchange: () => render() });
    slider = h('label', { class: 'ecg-slider' }, [h('span', { class: 'lbl', text: p.label + ': ' }), out, inp]);
  }
  const playBtn = h('button', { type: 'button', class: 'btn sm', 'data-ecg-play': '1', 'aria-pressed': String(ECG_ST.playing), text: ECG_ST.playing ? '❚❚ Pause' : '▶ Play', onclick: () => ecgPlay(!ECG_ST.playing) });
  const speed = h('select', { 'aria-label': 'Playback speed', 'data-ecg-speed': '1', onchange: (e) => { ECG_ST.speed = +e.target.value; } }, [[0.1, '1/10 speed'], [0.25, '1/4 speed'], [0.5, '1/2 speed'], [1, 'real time']].map(o => h('option', { value: String(o[0]), selected: ECG_ST.speed === o[0], text: o[1] })));
  const range = h('input', { type: 'range', class: 'ecg-scrub', min: '0', max: String(ECG_ST.strip), step: '4', value: String(Math.round(ECG_ST.t)), 'data-ecg-t': '1', 'aria-label': 'Time on the strip', oninput: (e) => { ECG_ST.t = +e.target.value; if (!ECG_ST.raf) ECG_ST.raf = requestAnimationFrame(ecgFrame); } });
  const timeEl = h('span', { class: 'ecg-time', 'data-ecg-time': '1' });
  const reads = h('div', { class: 'ecg-reads' }, [
    h('span', { class: 'ecg-read' }, [h('b', { text: 'PR ' }), (scn.rhythm === 'chb' ? '—' : (scn.rhythm === 'wenck' ? 'lengthening' : seq.pr + ' ms'))]),
    h('span', { class: 'ecg-read', 'data-ecg-qrs': '1' }, [h('b', { text: 'QRS ' }), seq.qrs + ' ms']),
    h('span', { class: 'ecg-read', 'data-ecg-axis': '1' }, [h('b', { text: 'Axis ' }), seq.axis + '°']),
    h('span', { class: 'ecg-read' }, [h('b', { text: 'Rate ' }), (scn.rhythm === 'chb' ? 'atrial 72, ventricular 34' : (scn.rhythm ? 'sinus 72 (with dropped beats)' : '72')) + '/min'])
  ]);
  const legend = h('div', { class: 'ecg-legend' }, [h('span', { class: 'ecg-lg rest' }, [h('i'), 'resting']), h('span', { class: 'ecg-lg act' }, [h('i'), 'depolarising (the front)']), h('span', { class: 'ecg-lg dep' }, [h('i'), 'depolarised']), h('span', { class: 'ecg-lg path' }, [h('i'), 'conducting']), h('span', { class: 'ecg-lg blk' }, [h('i'), 'blocked'])]);
  const root = h('div', { class: 'ecg-lab', 'data-ecg': scn.id }, [
    h('div', { class: 'ecg-ctl' }, [h('label', { class: 'ecg-pick' }, [h('span', { class: 'lbl', text: 'Scenario ' }), sel]), slider]),
    h('div', { class: 'ecg-ctl' }, [playBtn, speed, range, timeEl]),
    h('div', { class: 'ecg-top' }, [
      h('figure', { class: 'an-fig ecg-heartfig' }, [heart.svg, legend, h('figcaption', { text: 'Anterior view, the patient facing you: the sinus node, the AV node, the His bundle, both bundle branches and the two fascicles of the left bundle. Hover a region or a path for its name.' })]),
      h('div', { class: 'ecg-side' }, [h('figure', { class: 'an-fig ecg-dialfig' }, [dial.svg, h('figcaption', { text: 'Frontal plane: the QRS loop (grey), the mean axis (dashed) and the vector at the cursor (orange).' })]), reads])
    ]),
    h('div', { class: 'ecg-wrap' }, [paper.svg]),
    h('p', { class: 'fine', text: '25 mm/s, 10 mm/mV; the calibration pulse is 1 mV. Three rows of 2.5 s, then a 10-second rhythm strip of lead II. The cursor runs through all four rows at once because the rows are consecutive seconds of the same strip.' }),
    h('div', { class: 'ecg-text' }, [h('h3', { text: scn.name }), h('p', {}, [h('span', { class: 'lbl', text: 'What happens. ' }), scn.mech]), h('p', {}, [h('span', { class: 'lbl', text: 'On the ECG. ' }), scn.ecg])])
  ]);
  // which beat the cursor belongs to (for the vector)
  const curBeat = (t) => { let q = null; bts.forEach(b => { if (b.q !== null && b.q - 80 <= t && t < b.q + 520) q = b.q; }); return q; };
  ECG_ST.view = { root: root, paper: paper, heart: heart, dial: dial, seq: seq, bts: bts, range: range, timeEl: timeEl, playBtn: playBtn, curBeat: curBeat };
  if (!ECG_ST.raf) ECG_ST.raf = requestAnimationFrame(ecgFrame);
  return root;
}
function ecgWidget(kind) { return kind === 'ecg' ? ecgLab() : null; }
