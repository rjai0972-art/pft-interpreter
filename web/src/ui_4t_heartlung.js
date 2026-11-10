
/* ========================================================================== Learn: heart–lung interaction (v8.6)
   The book's diagrams made to move (model in heartlung.js, PFT_HL): the bag-box-tube, the Campbell diagram with its
   loop and its areas, the transmission of a plateau pressure, the Guyton diagram, the two on one axis (the heart–lung
   interaction diagram, animated through a breath, with the chapters' scenarios), and lung volume against "PVR". */
const HK = window.PFT_HL || null;
const HKS = { bag: { mode: 'spont', cl: 1, ccw: 1, ri: 2, vt: 0.5, peep: 0, play: true }, cam: { preset: 'normal', p: null, view: 'campbell', play: true }, guy: { c: null, ghost: null, preset: 'normal' }, uni: {} , raf: 0, t0: 0 };
/* ---- a small chart kit: a box with linear scales and a few primitives */
function hkChart(W, H, pad, xr, yr) {
  const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'hk-chart' });
  const x = (v) => pad.l + (v - xr[0]) / (xr[1] - xr[0]) * (W - pad.l - pad.r), y = (v) => H - pad.b - (v - yr[0]) / (yr[1] - yr[0]) * (H - pad.t - pad.b);
  const path = (pts, attrs) => { let d = ''; pts.forEach((p, i) => { if (!isFinite(p[0]) || !isFinite(p[1])) return; d += (d ? ' L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1); }); const el = sv('path', Object.assign({ d: d, fill: 'none' }, attrs || {})); svg.appendChild(el); return el; };
  const area = (pts, attrs) => { let d = ''; pts.forEach(p => { d += (d ? ' L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1); }); const el = sv('path', Object.assign({ d: d + ' Z' }, attrs || {})); svg.appendChild(el); return el; };
  const text = (px, py, s, attrs) => { const el = svt(px, py, s, Object.assign({ class: 'hk-lab' }, attrs || {})); svg.appendChild(el); return el; };
  const line = (x1, y1, x2, y2, attrs) => { const el = sv('line', Object.assign({ x1: x1, y1: y1, x2: x2, y2: y2 }, attrs || {})); svg.appendChild(el); return el; };
  const dot = (px, py, r, attrs) => { const el = sv('circle', Object.assign({ cx: px, cy: py, r: r || 4 }, attrs || {})); svg.appendChild(el); return el; };
  return { svg: svg, x: x, y: y, path: path, area: area, text: text, line: line, dot: dot, W: W, H: H, pad: pad, xr: xr, yr: yr };
}
function hkSlider(label, key, obj, min, max, step, unit, onInput, fmt) {
  const id = uid('hk'), f = fmt || ((v) => (step < 1 ? (+v).toFixed(step < 0.1 ? 2 : 1) : String(Math.round(v))) + (unit || ''));
  const val = h('span', { class: 'odc-val', text: f(obj[key]) });
  const inp = h('input', { type: 'range', id: id, min: min, max: max, step: step, value: obj[key], 'data-hk-sl': key, oninput: (e) => { obj[key] = +e.target.value; val.textContent = f(obj[key]); onInput(); } });
  return h('label', { class: 'odc-sl hk-sl', for: id }, [h('span', { class: 'nod-l', text: label }), inp, val]);
}
function hkSeg(opts, cur, onPick, attr) {
  const seg = h('div', { class: 'seg', role: 'radiogroup' });
  opts.forEach(o => seg.appendChild(h('button', { type: 'button', class: 'ch' + (o[0] === cur ? ' on' : ''), role: 'radio', 'aria-checked': String(o[0] === cur), [attr || 'data-hk-opt']: o[0], text: o[1], onclick: () => { seg.querySelectorAll('.ch').forEach(b => { const on = b.getAttribute(attr || 'data-hk-opt') === o[0]; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }); onPick(o[0]); } })));
  return seg;
}
function hkLoop(fn) { const tick = (now) => { fn(now); HKS.raf = requestAnimationFrame(tick); }; if (HKS.raf) cancelAnimationFrame(HKS.raf); HKS.raf = requestAnimationFrame(tick); }
function hkSample(b, frac) { const i = Math.max(0, Math.min(b.t.length - 1, Math.floor(frac * b.t.length))); return { i: i, t: b.t[i], v: b.v[i], flow: b.flow[i], ppl: b.ppl[i], palv: b.palv[i], paw: b.paw[i], pmus: b.pmus[i], ptp: b.ptp[i] }; }
const HK_PCT = (v) => v / HK.VC * 100;

/* ================================================================ 1. the bag, the box and the tube */
function hkBagFig() {
  const S = HKS.bag; let b = null;
  const recompute = () => { b = HK.breath({ mode: S.mode === 'spont' ? 'spont' : 'passive', cl: S.cl, ccw: S.ccw, ri: S.ri, re: S.ri * 1.2, vt: S.vt, rr: 14, peep: S.mode === 'peep' ? S.peep : 0 }); };
  recompute();
  const scene = sv('svg', { viewBox: '0 0 420 340', class: 'hk-scene', 'aria-label': 'The bag, the box and the tube' });
  const box = sv('rect', { x: 60, y: 70, width: 300, height: 250, rx: 14, class: 'hk-box' }); scene.appendChild(box);
  const pleura = sv('rect', { x: 68, y: 78, width: 284, height: 234, rx: 10, class: 'hk-pleura' }); scene.appendChild(pleura);
  const tube = sv('path', { d: 'M210 10 L210 150', class: 'hk-tube' }); scene.appendChild(tube);
  const bag = sv('ellipse', { cx: 210, cy: 215, rx: 70, ry: 60, class: 'hk-bag' }); scene.appendChild(bag);
  const flowArrow = sv('path', { d: 'M210 30 L210 120', class: 'hk-flow', 'marker-end': 'url(#hkArrow)' });
  const defs = sv('defs', {}); const mk = sv('marker', { id: 'hkArrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }); mk.appendChild(sv('path', { d: 'M0 0 L10 5 L0 10 Z', class: 'hk-arrowhead' })); defs.appendChild(mk); scene.appendChild(defs); scene.appendChild(flowArrow);
  const tpArrow = sv('path', { d: 'M140 215 L280 215', class: 'hk-tp', 'marker-end': 'url(#hkArrow)', 'marker-start': 'url(#hkArrow)' }); scene.appendChild(tpArrow);
  const L = {};
  const lab = (k, x, y, cls) => { L[k] = svt(x, y, '', { class: 'hk-sc-lab ' + (cls || '') }); scene.appendChild(L[k]); };
  lab('pbs', 30, 30, 'left'); lab('pao', 222, 22); lab('palv', 210, 220, 'mid'); lab('ppl', 90, 300, 'left'); lab('tp', 210, 170, 'mid'); lab('dyn', 222, 92); lab('mode', 210, 335, 'mid fine');
  const eq = h('div', { class: 'hk-eq', 'data-hk-eq': '1' });
  // the strips: pleural and alveolar pressure, flow, volume through the cycle
  const strips = h('div', { class: 'hk-strips' }); const stripSvgs = {};
  const mkStrip = (key, title, yr, unit) => { const c = hkChart(420, 90, { l: 44, r: 8, t: 14, b: 16 }, [0, 1], yr); c.text(44, 10, title, { class: 'hk-lab bold' }); c.line(c.x(0), c.y(0), c.x(1), c.y(0), { class: 'hk-axis zero' }); stripSvgs[key] = { c: c, unit: unit }; strips.appendChild(c.svg); };
  mkStrip('p', 'Pleural (blue) and alveolar (red) pressure, cm H2O', [-16, 16]); mkStrip('f', 'Flow, L/s (in is up)', [-1.2, 1.2]); mkStrip('v', 'Volume, % VC', [20, 70]);
  const drawStrips = () => {
    Object.keys(stripSvgs).forEach(k => { const c = stripSvgs[k].c; Array.from(c.svg.querySelectorAll('[data-dyn]')).forEach(e => e.remove()); });
    const T = b.T, pts = (arr) => arr.map((v, i) => [b.t[i] / T, v]);
    const cp = stripSvgs.p.c; cp.path(pts(b.ppl), { class: 'hk-tr ppl', 'data-dyn': 1 }); cp.path(pts(b.palv), { class: 'hk-tr palv', 'data-dyn': 1 }); if (S.mode !== 'spont') cp.path(pts(b.paw), { class: 'hk-tr paw', 'data-dyn': 1 });
    stripSvgs.f.c.path(pts(b.flow), { class: 'hk-tr flow', 'data-dyn': 1 });
    stripSvgs.v.c.path(pts(b.v.map(HK_PCT)), { class: 'hk-tr vol', 'data-dyn': 1 });
    Object.keys(stripSvgs).forEach(k => { const c = stripSvgs[k].c; c.line(c.x(0), c.y(c.yr[0]), c.x(0), c.y(c.yr[1]), { class: 'hk-cursor', 'data-dyn': 1, 'data-hk-cursor': k }); });
  };
  drawStrips();
  const readout = h('p', { class: 'fine', 'data-hk-bagread': '1' });
  const frame = (frac) => {
    const s = hkSample(b, frac), pct = HK_PCT(s.v), r = 44 + (pct - 20) * 1.1;
    bag.setAttribute('rx', r * 1.15); bag.setAttribute('ry', r);
    const dyn = s.paw - s.palv, tp = s.ptp;
    L.pbs.textContent = 'P body surface 0'; L.pao.textContent = 'P mouth ' + s.paw.toFixed(1); L.palv.textContent = 'P alv ' + s.palv.toFixed(1); L.ppl.textContent = 'P pleural ' + s.ppl.toFixed(1);
    L.tp.textContent = 'static: transpulmonary ' + tp.toFixed(1) + ' = Palv − Ppl'; L.dyn.textContent = 'dynamic: ' + dyn.toFixed(1) + ' = flow × R';
    L.mode.textContent = (S.mode === 'spont' ? 'spontaneous breath' : S.mode === 'peep' ? 'ventilator breath on PEEP ' + S.peep : 'passive ventilator breath') + ' · ' + (s.flow >= 0 ? 'inspiration' : 'expiration') + ' · ' + pct.toFixed(0) + ' % VC';
    flowArrow.setAttribute('d', s.flow >= 0 ? 'M210 30 L210 120' : 'M210 120 L210 30'); flowArrow.style.opacity = Math.min(1, Math.abs(s.flow) / 0.3);
    pleura.style.fill = s.ppl < 0 ? 'rgba(70,120,200,' + Math.min(0.35, 0.05 + Math.abs(s.ppl) / 40) + ')' : 'rgba(220,90,60,' + Math.min(0.35, 0.05 + s.ppl / 40) + ')';
    tpArrow.setAttribute('d', 'M' + (210 - r * 1.15 + 8) + ' 215 L' + (210 + r * 1.15 - 8) + ' 215');
    const elastic = HK.rsP(s.v, b.p) - HK.rsP(b.m.Vee, b.p), resist = Math.abs(dyn), drive = S.mode === 'spont' ? s.pmus : (s.paw - b.p.peep);
    eq.textContent = 'Equation of motion — ' + (S.mode === 'spont' ? 'the muscles’ pressure ' : 'the ventilator’s pressure above PEEP ') + drive.toFixed(1) + ' = elastic ' + elastic.toFixed(1) + ' (volume above the start ÷ C rs) + resistive ' + resist.toFixed(1) + ' (flow ' + Math.abs(s.flow).toFixed(2) + ' L/s × R ' + S.ri + ')' + (s.flow < 0 ? '   — expiration: the recoil pays' : '') + '   [cm H2O]';
    Object.keys(stripSvgs).forEach(k => { const c = stripSvgs[k].c, cur = c.svg.querySelector('[data-hk-cursor]'); if (cur) { cur.setAttribute('x1', c.x(frac)); cur.setAttribute('x2', c.x(frac)); } });
    const m = b.m; readout.textContent = 'This breath: pleural pressure ' + m.pplEE.toFixed(1) + ' → ' + m.pplEI.toFixed(1) + ' cm H2O (' + (m.pplMin).toFixed(1) + ' at its lowest); transpulmonary ' + m.ptpEI.toFixed(1) + ' at end-inspiration; compliances lung ' + Math.round(m.comp.cl * 1000) + ', chest wall ' + Math.round(m.comp.ccw * 1000) + ', system ' + Math.round(m.comp.crs * 1000) + ' mL/cm H2O' + (m.pplat !== null ? '; plateau ' + m.pplat.toFixed(1) + ', peak ' + m.ppeak.toFixed(1) + ', ' + Math.round(m.transmission * 100) + ' % of the plateau reaches the pleural space' : '') + '.';
  };
  const ctl = h('div', { class: 'hk-ctl' }, [
    hkSeg([['spont', 'Spontaneous breath'], ['passive', 'Ventilator breath'], ['peep', 'Ventilator + PEEP']], S.mode, (v) => { S.mode = v; recompute(); drawStrips(); }, 'data-hk-bagmode'),
    h('div', { class: 'hk-sliders' }, [
      hkSlider('Lung compliance', 'cl', S, 0.3, 2, 0.05, '×', () => { recompute(); drawStrips(); }),
      hkSlider('Chest wall compliance', 'ccw', S, 0.3, 2, 0.05, '×', () => { recompute(); drawStrips(); }),
      hkSlider('Airway resistance', 'ri', S, 1, 30, 1, ' cm H2O/L/s', () => { recompute(); drawStrips(); }),
      hkSlider('Tidal volume', 'vt', S, 0.2, 1.5, 0.05, ' L', () => { recompute(); drawStrips(); }),
      hkSlider('PEEP (ventilator + PEEP)', 'peep', S, 0, 20, 1, ' cm H2O', () => { recompute(); drawStrips(); })
    ])
  ]);
  const play = h('button', { type: 'button', class: 'btn sm', 'data-hk-play': '1', text: '❚❚', 'aria-label': 'Pause', onclick: () => { S.play = !S.play; play.textContent = S.play ? '❚❚' : '▶'; } });
  const fig = h('figure', { class: 'an-fig hk-fig', 'data-hkbag': '1' }, [
    h('div', { class: 'hk-grid2' }, [h('div', {}, [scene, eq, h('div', { class: 'ecg-ctl' }, [play, readout])]), h('div', {}, [strips, ctl])]),
    h('figcaption', { text: 'The bag (the lung) sits in the box (the chest); the tube (the airway) opens to the body surface. The static pressure across the bag’s wall — alveolar minus pleural, the transpulmonary pressure — sets its volume through its compliance; the dynamic pressure along the tube — mouth minus alveolar — is flow times resistance. Blue in the box is a sub-atmospheric pleural pressure, red a positive one. After Kenny, chapter 1, figure 1.' })
  ]);
  fig.hk = { recompute: recompute, breath: () => b };
  let phase = 0, last = 0;
  hkLoop((now) => { if (!fig.isConnected) return; if (S.play) { const dt = last ? (now - last) / 1000 : 0; phase = (phase + dt / b.T) % 1; } last = now; frame(phase); });
  return fig;
}

/* ================================================================ 2. the Campbell diagram */
const HK_CAM_PRESETS = [
  { id: 'normal', name: 'Normal, quiet breathing', p: {} },
  { id: 'emph', name: 'Emphysema (compliant lung, slow emptying)', p: { cl: 1.6, ri: 8, re: 16, rr: 20 } },
  { id: 'asthma', name: 'Acute asthma (airway resistance both ways)', p: { ri: 22, re: 30, vt: 0.55, rr: 26, pexp: 8 } },
  { id: 'oedema', name: 'Pulmonary oedema (stiff, wet lung)', p: { cl: 0.45, ri: 9, re: 10, vt: 0.4, rr: 28 } },
  { id: 'fibrosis', name: 'Fibrosis / ARDS lung (stiff lung)', p: { cl: 0.4, vt: 0.35, rr: 30 } },
  { id: 'obese', name: 'Obesity (chest wall shifted right)', p: { shift: 5, ccw: 0.8 } },
  { id: 'ascites', name: 'Tense ascites / abdominal hypertension', p: { shift: 8, ccw: 0.5, cl: 0.7, vt: 0.3, rr: 28 } },
  { id: 'rsb', name: 'Rapid shallow breathing on stiff lungs', p: { cl: 0.4, ccw: 0.7, vt: 0.25, rr: 36 } },
  { id: 'vent', name: 'Passive ventilator breath (the Rahn view)', p: { mode: 'passive', ri: 6, vt: 0.5, rr: 14 } },
  { id: 'ventpeep', name: 'Passive breath on PEEP 10', p: { mode: 'passive', ri: 6, vt: 0.5, rr: 14, peep: 10 } },
  { id: 'ventards', name: 'Pulmonary ARDS on the ventilator', p: { mode: 'passive', cl: 0.35, vt: 0.4, rr: 22, peep: 10, ri: 7 } },
  { id: 'ventext', name: 'Extra-pulmonary ARDS on the ventilator', p: { mode: 'passive', cl: 0.75, ccw: 0.45, shift: 5, vt: 0.4, rr: 22, peep: 10, ri: 7 } },
  { id: 'ventcopd', name: 'COPD ventilated too fast (auto-PEEP)', p: { mode: 'passive', cl: 1.6, ri: 12, re: 24, vt: 0.5, rr: 24 } },
  { id: 'assist', name: 'Pressure support 10 / PEEP 5 with effort', p: { mode: 'assist', peep: 5, ps: 10, pmusMax: 6, ri: 6, rr: 18 } }
];
function hkCampbellDraw(S, b) {
  const p = b.p, vent = p.mode === 'passive' || p.mode === 'assist', rahn = S.view === 'rahn' && vent;
  const xr = rahn ? [-12, 42] : [-34, 34], c = hkChart(560, 420, { l: 48, r: 12, t: 16, b: 34 }, xr, [0, 100]);
  // grid, axes
  for (let v = 0; v <= 100; v += 10) c.line(c.x(xr[0]), c.y(v), c.x(xr[1]), c.y(v), { class: 'ph-grid' });
  for (let x = Math.ceil(xr[0] / 10) * 10; x <= xr[1]; x += 10) { c.line(c.x(x), c.y(0), c.x(x), c.y(100), { class: 'ph-grid' + (x === 0 ? ' zero' : '') }); c.text(c.x(x), c.H - 18, String(x), { class: 'hk-lab', 'text-anchor': 'middle' }); }
  [20, 40, 60, 80].forEach(v => c.text(c.pad.l - 6, c.y(v) + 4, v + '%', { class: 'hk-lab', 'text-anchor': 'end' }));
  c.text(c.W / 2, c.H - 4, rahn ? 'Airway pressure, cm H2O (the Rahn view: lung and chest wall added)' : 'Pleural pressure, cm H2O (the Campbell view)', { class: 'hk-lab', 'text-anchor': 'middle' });
  c.text(14, 12, 'Volume, % VC', { class: 'hk-lab' });
  const cv = HK.curves(p, 90), toPct = (pt) => [pt[0], HK_PCT(pt[1])];
  if (rahn) {
    c.path(cv.rs.map(toPct), { class: 'hk-curve rs' }); c.path(cv.lung.map(pt => [-pt[0], HK_PCT(pt[1])]), { class: 'hk-curve lung thin' }); c.path(cv.cw.map(toPct), { class: 'hk-curve cw thin' });
    c.text(c.x(Math.min(xr[1] - 4, HK.rsP(3.6, p))), c.y(80) - 6, 'C rs (lung + chest wall)', { class: 'hk-lab rs' });
  } else {
    c.path(cv.lung.map(toPct), { class: 'hk-curve lung' }); c.path(cv.cw.map(toPct), { class: 'hk-curve cw' });
    if (vent) c.path(cv.rs.map(toPct), { class: 'hk-curve rs thin' });
    c.text(c.x(-HK.lungP(3.9, p)) - 4, c.y(86), 'C lung', { class: 'hk-lab lung', 'text-anchor': 'end' }); c.text(c.x(HK.cwP(3.9, p)) + 4, c.y(86), 'C chest wall', { class: 'hk-lab cw' });
    if (vent) c.text(c.x(Math.min(xr[1] - 2, HK.rsP(3.9, p))), c.y(86) + 14, 'C rs', { class: 'hk-lab rs' });
  }
  // the loop and the areas
  const m = b.m, frcPct = HK_PCT(m.FRC), veePct = HK_PCT(m.Vee), eiPct = HK_PCT(m.vmax);
  const xOf = (i) => rahn ? b.paw[i] : b.ppl[i];
  const loop = b.t.map((t, i) => [xOf(i), HK_PCT(b.v[i])]);
  if (!rahn) {
    // elastic work: between the two static curves over the tidal range (above FRC only)
    const el = []; for (let v = Math.max(m.Vee, m.FRC); v <= m.vmax; v += 0.02) el.push([-HK.lungP(v, p), HK_PCT(v)]); for (let v = m.vmax; v >= Math.max(m.Vee, m.FRC); v -= 0.02) el.push([HK.cwP(v, p), HK_PCT(v)]);
    if (el.length > 2) c.area(el, { class: 'hk-area elastic' });
    // threshold (auto-PEEP): the rectangle between the alveolar pressure at end-expiration and the lung curve
    if (m.autoPEEP > 0.3 && p.mode === 'spont') { const thr = []; for (let v = m.Vee; v <= m.vmax; v += 0.02) thr.push([-HK.lungP(v, p), HK_PCT(v)]); for (let v = m.vmax; v >= m.Vee; v -= 0.02) thr.push([-HK.lungP(v, p) + HK.rsP(m.Vee, p), HK_PCT(v)]); c.area(thr, { class: 'hk-area threshold' }); }
    // resistive work: between the inspiratory limb and the lung curve
    const res = []; for (let i = 0; i <= m.iEI; i++) res.push([b.ppl[i], HK_PCT(b.v[i])]); for (let i = m.iEI; i >= 0; i--) res.push([-HK.lungP(b.v[i], p), HK_PCT(b.v[i])]); c.area(res, { class: 'hk-area resistive' });
    if (p.pexp > 0) { const ex = []; for (let i = m.iEI; i < b.t.length; i++) ex.push([b.ppl[i], HK_PCT(b.v[i])]); for (let i = b.t.length - 1; i >= m.iEI; i--) ex.push([HK.cwP(b.v[i], p), HK_PCT(b.v[i])]); c.area(ex, { class: 'hk-area expiratory' }); }
  } else {
    const el = []; for (let v = m.Vee; v <= m.vmax; v += 0.02) el.push([p.peep, HK_PCT(v)]); for (let v = m.vmax; v >= m.Vee; v -= 0.02) el.push([HK.rsP(v, p), HK_PCT(v)]); c.area(el, { class: 'hk-area elastic' });
    const res = []; for (let i = 0; i <= m.iEI; i++) res.push([b.paw[i], HK_PCT(b.v[i])]); for (let i = m.iEI; i >= 0; i--) res.push([HK.rsP(b.v[i], p), HK_PCT(b.v[i])]); c.area(res, { class: 'hk-area resistive' });
  }
  c.path(loop.slice(0, m.iEI + 1), { class: 'hk-loop insp' }); c.path(loop.slice(m.iEI), { class: 'hk-loop exp' });
  // markers: FRC, the end-expiratory volume, Pmus or Paw at end-inspiration
  c.line(c.x(xr[0]), c.y(frcPct), c.x(xr[1]), c.y(frcPct), { class: 'hk-mark frc' }); c.text(c.x(xr[1]) - 4, c.y(frcPct) - 4, 'FRC ' + frcPct.toFixed(0) + '%', { class: 'hk-lab frc', 'text-anchor': 'end' });
  if (m.trapped > 0.05) { c.line(c.x(xr[0]), c.y(veePct), c.x(xr[1]), c.y(veePct), { class: 'hk-mark vee' }); c.text(c.x(xr[1]) - 4, c.y(veePct) - 4, 'end-expiration ' + veePct.toFixed(0) + '% (auto-PEEP ' + m.autoPEEP.toFixed(1) + ')', { class: 'hk-lab vee', 'text-anchor': 'end' }); }
  if (!rahn) {
    const xa = -HK.lungP(m.vmax, p), xb = HK.cwP(m.vmax, p); c.line(c.x(xa), c.y(eiPct), c.x(xb), c.y(eiPct), { class: 'hk-pmus' }); c.text((c.x(xa) + c.x(xb)) / 2, c.y(eiPct) - 6, (vent ? 'P aw static ' : 'P mus ') + (xb - xa).toFixed(1), { class: 'hk-lab pmus', 'text-anchor': 'middle' });
  } else { c.line(c.x(m.pplat), c.y(0), c.x(m.pplat), c.y(eiPct), { class: 'hk-mark plat' }); c.text(c.x(m.pplat), c.y(eiPct) - 8, 'plateau ' + m.pplat.toFixed(1), { class: 'hk-lab plat', 'text-anchor': 'middle' }); if (m.ppeak > m.pplat + 0.5) { c.line(c.x(m.ppeak), c.y(0), c.x(m.ppeak), c.y(eiPct), { class: 'hk-mark peak' }); c.text(c.x(m.ppeak) + 4, c.y(eiPct / 2), 'peak ' + m.ppeak.toFixed(1), { class: 'hk-lab peak' }); } }
  const cursor = c.dot(c.x(loop[0][0]), c.y(loop[0][1]), 5, { class: 'hk-cursor-dot', 'data-hk-camdot': '1' });
  c.svg.hkFrame = (frac) => { const s = hkSample(b, frac); cursor.setAttribute('cx', c.x(rahn ? s.paw : s.ppl)); cursor.setAttribute('cy', c.y(HK_PCT(s.v))); };
  return c.svg;
}
function hkCampbellRead(b) {
  const m = b.m, p = b.p, w = m.wob, vent = p.mode !== 'spont' && p.mode !== 'hold';
  const rows = [['FRC', m.pctFRC.toFixed(0) + ' % VC'], ['End-expiratory volume', m.pctEE.toFixed(0) + ' % VC' + (m.trapped > 0.05 ? ' (' + Math.round(m.trapped * 1000) + ' mL trapped)' : '')], ['Auto-PEEP', m.autoPEEP.toFixed(1) + ' cm H2O'], ['Tidal volume', Math.round(m.vt * 1000) + ' mL'], ['Pleural pressure', m.pplEE.toFixed(1) + ' → ' + m.pplEI.toFixed(1) + ' (range ' + m.pplMin.toFixed(1) + ' to ' + m.pplMax.toFixed(1) + ')'], ['Transpulmonary at end-inspiration', m.ptpEI.toFixed(1) + ' cm H2O']];
  if (vent) rows.push(['Plateau / peak', m.pplat.toFixed(1) + ' / ' + m.ppeak.toFixed(1) + ' cm H2O'], ['Driving pressure', m.drivingP.toFixed(1) + ' cm H2O → C rs ' + Math.round(m.crsMeasured * 1000) + ' mL/cm H2O'], ['Plateau reaching the pleura', Math.round(m.transmission * 100) + ' % (lung ' + Math.round(m.comp.cl * 1000) + ' / chest wall ' + Math.round(m.comp.ccw * 1000) + ' mL/cm H2O)']);
  rows.push(['Work of breathing (' + m.who + ')', w.total.toFixed(2) + ' J per breath · ' + w.perMin.toFixed(1) + ' J/min · ' + w.perL.toFixed(2) + ' J/L'], ['— elastic / resistive / threshold / expiratory', w.elastic.toFixed(2) + ' / ' + w.resistive.toFixed(2) + ' / ' + w.threshold.toFixed(2) + ' / ' + w.expiratory.toFixed(2) + ' J']);
  return h('dl', { class: 'hk-read', 'data-hk-camread': '1' }, rows.map(r => h('div', {}, [h('dt', { text: r[0] }), h('dd', { text: r[1] })])));
}
function hkCampbellFig() {
  const S = HKS.cam; if (!S.p) S.p = Object.assign({}, HK.RESP_DEFAULT);
  let b = HK.breath(S.p);
  const slot = h('div', { 'data-hk-camslot': '1' }), readSlot = h('div', { 'data-hk-camreadslot': '1' });
  const redraw = () => { b = HK.breath(S.p); slot.textContent = ''; slot.appendChild(hkCampbellDraw(S, b)); readSlot.textContent = ''; readSlot.appendChild(hkCampbellRead(b)); const rv = fig.querySelector('[data-hk-view]'); if (rv) rv.hidden = S.p.mode === 'spont' || S.p.mode === 'hold'; };
  const applyPreset = (id) => { const pr = HK_CAM_PRESETS.filter(x => x.id === id)[0]; S.preset = id; Object.keys(S.p).forEach(k => { delete S.p[k]; }); Object.assign(S.p, HK.RESP_DEFAULT, pr.p); fig.querySelectorAll('[data-hk-sl]').forEach(inp => { const k = inp.getAttribute('data-hk-sl'); if (S.p[k] !== undefined) { inp.value = S.p[k]; inp.dispatchEvent(new Event('refresh')); } }); const ms = fig.querySelector('[data-hk-cammode]'); if (ms) ms.value = S.p.mode; redraw(); };
  const presetSel = h('select', { 'aria-label': 'Preset', 'data-hk-campreset': '1', onchange: (e) => applyPreset(e.target.value) }, HK_CAM_PRESETS.map(x => h('option', { value: x.id, selected: x.id === S.preset, text: x.name })));
  const modeSel = h('select', { 'aria-label': 'Breath', 'data-hk-cammode': '1', onchange: (e) => { S.p.mode = e.target.value; S.preset = 'custom'; redraw(); } }, [['spont', 'Spontaneous'], ['passive', 'Passive ventilator breath'], ['assist', 'Pressure support with effort']].map(o => h('option', { value: o[0], selected: S.p.mode === o[0], text: o[1] })));
  const viewSeg = h('div', { 'data-hk-view': '1', hidden: S.p.mode === 'spont' }, [hkSeg([['campbell', 'Campbell view (pleural pressure)'], ['rahn', 'Rahn view (airway pressure)']], S.view, (v) => { S.view = v; redraw(); }, 'data-hk-camview')]);
  const sl = (label, key, min, max, step, unit) => { const el = hkSlider(label, key, S.p, min, max, step, unit, () => { S.preset = 'custom'; presetSel.value = 'normal'; redraw(); }); const inp = el.querySelector('input'); inp.addEventListener('refresh', () => { el.querySelector('.odc-val').textContent = (step < 1 ? (+inp.value).toFixed(step < 0.1 ? 2 : 1) : String(Math.round(+inp.value))) + (unit || ''); }); return el; };
  const sliders = h('div', { class: 'hk-sliders two' }, [
    sl('Lung compliance', 'cl', 0.25, 2.2, 0.05, '×'), sl('Chest wall compliance', 'ccw', 0.3, 2, 0.05, '×'), sl('Chest wall shift (load)', 'shift', 0, 12, 1, ' cm H2O'),
    sl('Inspiratory resistance', 'ri', 1, 30, 1, ''), sl('Expiratory resistance', 're', 1, 40, 1, ''), sl('Tidal volume', 'vt', 0.15, 1.5, 0.05, ' L'), sl('Rate', 'rr', 6, 40, 1, '/min'),
    sl('Expiratory effort', 'pexp', 0, 15, 1, ' cm H2O'), sl('PEEP (ventilator)', 'peep', 0, 20, 1, ' cm H2O'), sl('Pressure support', 'ps', 0, 20, 1, ' cm H2O')
  ]);
  const play = h('button', { type: 'button', class: 'btn sm', text: '❚❚', 'aria-label': 'Pause', onclick: () => { S.play = !S.play; play.textContent = S.play ? '❚❚' : '▶'; } });
  const fig = h('figure', { class: 'an-fig hk-fig', 'data-hkcampbell': '1' }, [
    h('div', { class: 'ecg-ctl' }, [h('label', { class: 'ecg-pick' }, [h('span', { class: 'lbl', text: 'Preset ' }), presetSel]), h('label', { class: 'ecg-pick' }, [h('span', { class: 'lbl', text: 'Breath ' }), modeSel]), viewSeg, play]),
    h('div', { class: 'hk-grid2 wide' }, [slot, h('div', {}, [readSlot, sliders])]),
    h('div', { class: 'hk-legend' }, [h('span', { class: 'lg lung', text: 'lung' }), h('span', { class: 'lg cw', text: 'chest wall' }), h('span', { class: 'lg rs', text: 'respiratory system' }), h('span', { class: 'lg insp', text: 'inspiration' }), h('span', { class: 'lg exp', text: 'expiration' }), h('span', { class: 'lg a-el', text: 'elastic work' }), h('span', { class: 'lg a-res', text: 'resistive work' }), h('span', { class: 'lg a-thr', text: 'threshold (auto-PEEP)' }), h('span', { class: 'lg a-exp', text: 'expiratory work' })]),
    h('figcaption', { text: 'Volume against pleural pressure. The lung curve runs down to the right, the passive chest wall up to the right; they cross at FRC. The loop is one breath: inspiration to the left of the lung curve by flow × resistance, passive expiration to its right inside the envelope. The shaded areas are the work. In the ventilator views the respiratory-system curve (light blue) is the series of plateau pressures. After Kenny, chapter 1, figures 4–14.' })
  ]);
  redraw();
  let phase = 0, last = 0;
  hkLoop((now) => { if (!fig.isConnected) return; if (S.play) { const dt = last ? (now - last) / 1000 : 0; phase = (phase + dt / b.T) % 1; } last = now; const svg = slot.querySelector('svg'); if (svg && svg.hkFrame) svg.hkFrame(phase); });
  fig.hk = { state: S, breath: () => b, redraw: redraw };
  return fig;
}

/* ================================================================ 3. what a plateau pressure does to the pleura */
function hkPtransFig() {
  const S = { pplat: 28, peep: 10, cl: 200, ccw: 150 };
  const PRE = [['health', 'Health', { cl: 200, ccw: 150 }], ['ardsp', 'Pulmonary ARDS', { cl: 50, ccw: 150 }], ['ardse', 'Extra-pulmonary ARDS', { cl: 120, ccw: 50 }], ['obese', 'Obesity / ascites', { cl: 150, ccw: 60 }], ['emph', 'Emphysema', { cl: 350, ccw: 150 }]];
  const bar = h('div', { class: 'hk-tbar', 'data-hk-tbar': '1' }), read = h('p', { class: 'fine', 'data-hk-tread': '1' });
  const draw = () => {
    const t = HK.transmission(S.pplat, S.peep, S.cl, S.ccw), dp = S.pplat - S.peep;
    bar.textContent = '';
    bar.appendChild(h('div', { class: 'hk-tseg pleura', style: 'flex:' + Math.max(0.02, t.frac), text: 'to the pleura (the heart): ' + t.dPpl.toFixed(1) }));
    bar.appendChild(h('div', { class: 'hk-tseg lung', style: 'flex:' + Math.max(0.02, 1 - t.frac), text: 'across the lung (transpulmonary): ' + t.ptp.toFixed(1) }));
    read.textContent = 'Driving pressure ' + dp.toFixed(0) + ' cm H2O (plateau ' + S.pplat + ' − PEEP ' + S.peep + '). The pleural pressure rises by ' + t.dPpl.toFixed(1) + ' (' + Math.round(t.frac * 100) + ' %: lung ' + S.cl + ' over lung + chest wall ' + (S.cl + S.ccw) + '); the lung takes ' + t.ptp.toFixed(1) + '. ' + (t.frac > 0.6 ? 'Most of the plateau is spent lifting the chest wall: the heart feels it, the lung is spared — and the plateau overstates the lung stress.' : t.frac < 0.4 ? 'Most of the plateau is spent across a stiff lung: the lung feels it, the heart little — the plateau is a fair surrogate for the lung stress, and the right ventricle is afterloaded by it.' : 'About half and half, as in health.');
  };
  const sl = (label, key, min, max, step, unit) => hkSlider(label, key, S, min, max, step, unit, draw);
  const fig = h('figure', { class: 'an-fig hk-fig', 'data-hkptrans': '1' }, [
    h('div', { class: 'ecg-ctl' }, [h('span', { class: 'lbl', text: 'Patient' }), hkSeg(PRE.map(x => [x[0], x[1]]), 'health', (id) => { const pr = PRE.filter(x => x[0] === id)[0][2]; Object.assign(S, pr); fig.querySelectorAll('[data-hk-sl]').forEach(inp => { const k = inp.getAttribute('data-hk-sl'); inp.value = S[k]; inp.parentNode.querySelector('.odc-val').textContent = S[k] + (k === 'cl' || k === 'ccw' ? ' mL/cm H2O' : ' cm H2O'); }); draw(); }, 'data-hk-tpre')]),
    bar, read,
    h('div', { class: 'hk-sliders two' }, [sl('Plateau pressure', 'pplat', 10, 45, 1, ' cm H2O'), sl('PEEP', 'peep', 0, 24, 1, ' cm H2O'), sl('Lung compliance', 'cl', 20, 400, 10, ' mL/cm H2O'), sl('Chest wall compliance', 'ccw', 20, 300, 10, ' mL/cm H2O')]),
    h('figcaption', { text: 'Equation 12 of chapter 1: the change in pleural pressure is the plateau (above PEEP) times the lung’s compliance over the sum of the two. The passive patient’s pleural pressure follows the chest wall curve, so a stiff chest wall sends the ventilator’s pressure to the heart and a stiff lung keeps it in the lung.' })
  ]);
  draw();
  return fig;
}

/* ================================================================ 4. the Guyton diagram */
const HK_GUY_PRESETS = [
  { id: 'normal', name: 'Normal', c: {} },
  { id: 'hypo', name: 'Hypovolaemia (Pms 4)', c: { pms: 4 } },
  { id: 'bolus', name: 'A fluid bolus (Pms 10)', c: { pms: 10 } },
  { id: 'sepsis', name: 'Sepsis (low resistance, lost stressed volume, depressed heart)', c: { pms: 5.5, rvr: 0.55, contr: 0.7 } },
  { id: 'hf', name: 'Systolic heart failure, volume overloaded', c: { pms: 13, contr: 0.45, aft: 0.3 } },
  { id: 'norepi', name: 'Norepinephrine (stressed volume up, resistance up)', c: { pms: 9.5, rvr: 1.25 } },
  { id: 'nitro', name: 'Venodilator / furosemide (Pms down)', c: { pms: 5 } },
  { id: 'rvload', name: 'Right-ventricular afterload (PE, PEEP, ARDS)', c: { aft: 1.2 } },
  { id: 'tamp', name: 'Pericardial constraint / tamponade', c: { p0: 6, contr: 0.8 } },
  { id: 'insp', name: 'Spontaneous inspiration (pleural −12 cm H2O)', c: { p0: -8.8 } },
  { id: 'ppv', name: 'Positive pressure (pleural +8 cm H2O)', c: { p0: 5.9 } },
  { id: 'iah', name: 'Abdominal hypertension (collapse pressure up, resistance up)', c: { pcrit: 5, rvr: 1.5, pms: 9 } }
];
function hkGuytonDraw(c0, ghost) {
  const cv = HK.cvCurves(c0, 80), op = cv.op, cc = cv.op.c, xr = [-10, 20], yr = [0, 13];
  const c = hkChart(560, 380, { l: 44, r: 12, t: 16, b: 58 }, xr, yr);
  for (let v = 0; v <= 12; v += 2) c.line(c.x(xr[0]), c.y(v), c.x(xr[1]), c.y(v), { class: 'ph-grid' });
  for (let x = -10; x <= 20; x += 5) { c.line(c.x(x), c.y(0), c.x(x), c.y(yr[1]), { class: 'ph-grid' + (x === 0 ? ' zero' : '') }); c.text(c.x(x), c.y(0) + 14, String(x), { class: 'hk-lab', 'text-anchor': 'middle' }); }
  [2, 4, 6, 8, 10, 12].forEach(v => c.text(c.pad.l - 6, c.y(v) + 4, String(v), { class: 'hk-lab', 'text-anchor': 'end' }));
  c.text(c.W / 2, c.y(0) + 28, 'Right atrial pressure, mmHg', { class: 'hk-lab', 'text-anchor': 'middle' }); c.text(12, 12, 'Blood flow, L/min', { class: 'hk-lab' });
  if (ghost) { const g = HK.cvCurves(ghost, 80); c.path(g.vr, { class: 'hk-curve vr ghost' }); c.path(g.cf, { class: 'hk-curve cf ghost' }); c.dot(c.x(g.op.pra), c.y(g.op.co), 4, { class: 'hk-op ghost' }); }
  c.path(cv.vr, { class: 'hk-curve vr' }); c.path(cv.cf, { class: 'hk-curve cf' });
  c.text(c.x(cc.pms) + 4, c.y(0) - 6, 'Pms ' + cc.pms.toFixed(1), { class: 'hk-lab vr' }); c.dot(c.x(cc.pms), c.y(0), 3.5, { class: 'hk-dot vr' });
  c.text(c.x(cc.p0) - 4, c.y(0) - 6, 'P around the heart ' + cc.p0.toFixed(1), { class: 'hk-lab cf', 'text-anchor': 'end' }); c.dot(c.x(cc.p0), c.y(0), 3.5, { class: 'hk-dot cf' });
  if (cc.pcrit > xr[0]) { c.line(c.x(cc.pcrit), c.y(0), c.x(cc.pcrit), c.y(HK.venousReturn(cc.pcrit, cc)), { class: 'hk-mark pcrit' }); c.text(c.x(cc.pcrit), c.y(HK.venousReturn(cc.pcrit, cc)) - 6, 'collapse ' + cc.pcrit.toFixed(1), { class: 'hk-lab vr', 'text-anchor': 'middle' }); }
  c.text(c.x(xr[1]) - 4, c.y(cv.op.vrMax) - 4, 'maximal venous return ' + cv.op.vrMax.toFixed(1), { class: 'hk-lab vr', 'text-anchor': 'end' });
  // the operating point and the dumbbell
  c.line(c.x(op.pra), c.y(0), c.x(op.pra), c.y(op.co), { class: 'hk-mark op' }); c.line(c.x(xr[0]), c.y(op.co), c.x(op.pra), c.y(op.co), { class: 'hk-mark op' });
  c.dot(c.x(op.pra), c.y(op.co), 6, { class: 'hk-op', 'data-hk-op': '1' });
  c.text(c.x(op.pra) + 8, c.y(op.co) - 8, 'Pra ' + op.pra.toFixed(1) + ' · ' + op.co.toFixed(1) + ' L/min', { class: 'hk-lab bold' });
  const yd = c.y(0) + 42; c.line(c.x(cc.p0), yd, c.x(op.pra), yd, { class: 'hk-dumb' }); c.dot(c.x(cc.p0), yd, 4, { class: 'hk-dumb-end' }); c.dot(c.x(op.pra), yd, 4, { class: 'hk-dumb-end' }); c.text((c.x(cc.p0) + c.x(op.pra)) / 2, yd - 6, 'transmural ' + op.ptm.toFixed(1), { class: 'hk-lab dumb', 'text-anchor': 'middle' });
  c.svg.setAttribute('data-hk-guyton', '1');
  return c.svg;
}
function hkGuytonFig() {
  const S = HKS.guy; if (!S.c) S.c = Object.assign({}, HK.CV_DEFAULT); if (!S.ghost) S.ghost = Object.assign({}, HK.CV_DEFAULT);
  const slot = h('div', { 'data-hk-guyslot': '1' }), read = h('div', { 'data-hk-guyread': '1' });
  const redraw = () => { slot.textContent = ''; slot.appendChild(hkGuytonDraw(S.c, S.showGhost ? S.ghost : null)); const op = HK.operate(S.c); read.textContent = ''; read.appendChild(h('dl', { class: 'hk-read' }, [['Right atrial pressure', op.pra.toFixed(1) + ' mmHg'], ['Cardiac output = venous return', op.co.toFixed(1) + ' L/min'], ['Transmural (distending) pressure', op.ptm.toFixed(1) + ' mmHg'], ['Gradient for venous return (Pms − Pra)', op.gradient.toFixed(1) + ' mmHg'], ['Maximal venous return (the plateau)', op.vrMax.toFixed(1) + ' L/min' + (op.collapsed ? ' — the great veins are collapsing' : '')]].map(r => h('div', {}, [h('dt', { text: r[0] }), h('dd', { text: r[1] })])))); };
  const presetSel = h('select', { 'aria-label': 'Preset', 'data-hk-guypreset': '1', onchange: (e) => { const pr = HK_GUY_PRESETS.filter(x => x.id === e.target.value)[0]; S.preset = pr.id; Object.keys(S.c).forEach(k => { delete S.c[k]; }); Object.assign(S.c, HK.CV_DEFAULT, pr.c); fig.querySelectorAll('[data-hk-sl]').forEach(inp => { const k = inp.getAttribute('data-hk-sl'); inp.value = S.c[k]; inp.dispatchEvent(new Event('refresh')); }); redraw(); } }, HK_GUY_PRESETS.map(x => h('option', { value: x.id, selected: x.id === S.preset, text: x.name })));
  const sl = (label, key, min, max, step, unit) => { const el = hkSlider(label, key, S.c, min, max, step, unit, redraw); const inp = el.querySelector('input'); inp.addEventListener('refresh', () => { el.querySelector('.odc-val').textContent = (step < 1 ? (+inp.value).toFixed(step < 0.1 ? 2 : 1) : String(Math.round(+inp.value))) + (unit || ''); }); return el; };
  const ghostChk = (() => { const id = uid('hkg'); return h('label', { class: 'chk-inline', for: id }, [h('input', { type: 'checkbox', id: id, 'data-hk-ghost': '1', onchange: (e) => { S.showGhost = e.target.checked; redraw(); } }), 'Show the normal curves behind']); })();
  const fig = h('figure', { class: 'an-fig hk-fig', 'data-hkguyton': '1' }, [
    h('div', { class: 'ecg-ctl' }, [h('label', { class: 'ecg-pick' }, [h('span', { class: 'lbl', text: 'Preset ' }), presetSel]), ghostChk]),
    h('div', { class: 'hk-grid2 wide' }, [slot, h('div', {}, [read, h('div', { class: 'hk-sliders two' }, [
      sl('Mean systemic pressure (stressed volume)', 'pms', 2, 20, 0.5, ' mmHg'), sl('Resistance to venous return', 'rvr', 0.4, 2.5, 0.05, ''), sl('Collapse pressure of the great veins', 'pcrit', -6, 10, 0.5, ' mmHg'),
      sl('Contractility', 'contr', 0.3, 1.8, 0.05, '×'), sl('Right-ventricular afterload', 'aft', 0, 2.5, 0.1, ''), sl('Pressure around the heart (pleural + pericardial)', 'p0', -15, 15, 0.5, ' mmHg')])])]),
    h('figcaption', { text: 'Venous return (orange) falls as the right atrial pressure rises, from the mean systemic pressure down to the plateau where the great veins collapse; cardiac output (blue) rises with the right atrial pressure from an intercept that is the pressure around the heart. The crossing is the operating point; the dumbbell beneath is the transmural pressure. After Kenny, chapter 2, figures 2, 6, 13 and 14.' })
  ]);
  redraw();
  fig.hk = { state: S, redraw: redraw };
  return fig;
}

/* ================================================================ 5. the heart–lung interaction diagram */
function hkUnionDraw(run, frac, opts) {
  const b = run.b, c = run.c, s = hkSample(b, frac), i = s.i, MM = HK.CM_PER_MMHG;
  const W = 760, H = 430, X0 = 330, Y0 = 330, XS = 14, YS = 18;   // x: mmHg → px, y: L/min → px
  const zx = -0.62, zy = -0.5, ZS = 2.2;   // the z axis (lung volume, % VC) drawn into the page: up and to the left
  const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'hk-chart hk-union', 'data-hk-union': '1' });
  const P = (x, y, z) => [X0 + x * XS + (z || 0) * ZS * zx, Y0 - y * YS + (z || 0) * ZS * zy];
  const path = (pts, attrs) => { let d = ''; pts.forEach((p, k) => { d += (k ? ' L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }); const el = sv('path', Object.assign({ d: d, fill: 'none' }, attrs)); svg.appendChild(el); return el; };
  const text = (pt, str, attrs) => { const el = svt(pt[0], pt[1], str, Object.assign({ class: 'hk-lab' }, attrs || {})); svg.appendChild(el); return el; };
  // the floor of the Campbell plane and the three axes
  path([P(-23, 0, 0), P(-23, 0, 100), P(22, 0, 100), P(22, 0, 0)], { class: 'hk-plane' });
  path([P(-23, 0), P(26, 0)], { class: 'hk-axis3', 'marker-end': 'url(#hkAx)' }); path([P(0, 0), P(0, 13)], { class: 'hk-axis3' }); path([P(0, 0, 0), P(0, 0, 100)], { class: 'hk-axis3' });
  const defs = sv('defs', {}); const mk = sv('marker', { id: 'hkAx', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }); mk.appendChild(sv('path', { d: 'M0 0 L10 5 L0 10 Z', class: 'hk-arrowhead' })); defs.appendChild(mk); svg.appendChild(defs);
  for (let x = -20; x <= 20; x += 5) { const q = P(x, 0); text([q[0], q[1] + 14], String(x), { 'text-anchor': 'middle' }); }
  text([P(26, 0)[0] - 4, Y0 + 30], 'pressure, mmHg (pleural ÷ 1.36 · right atrial)', { 'text-anchor': 'end' }); text([P(0, 13)[0] + 6, P(0, 13)[1] + 4], 'blood flow, L/min', {}); text([P(0, 0, 100)[0] - 150, P(0, 0, 100)[1] - 8], 'lung volume, % VC (into the page)', {}); [25, 50, 75].forEach(z => { const q = P(0, 0, z); text([q[0] - 6, q[1] + 4], z + '%', { 'text-anchor': 'end', class: 'hk-lab frc' }); });
  // the Campbell plane: lung and chest wall curves, the loop, the current point
  const cv = HK.curves(b.p, 70), lungPts = cv.lung.map(pt => P(pt[0] / MM, 0, HK_PCT(pt[1]))), cwPts = cv.cw.map(pt => P(pt[0] / MM, 0, HK_PCT(pt[1])));
  path(lungPts, { class: 'hk-curve lung' }); path(cwPts, { class: 'hk-curve cw' });
  if (b.p.mode === 'passive' || b.p.mode === 'assist') path(cv.rs.map(pt => P(pt[0] / MM, 0, HK_PCT(pt[1]))), { class: 'hk-curve rs thin' });
  path(b.t.map((t, k) => P(b.ppl[k] / MM, 0, HK_PCT(b.v[k]))), { class: 'hk-loop insp thin' });
  const frcPt = P(HK.cwP(b.FRC, b.p) / MM, 0, HK_PCT(b.FRC)); text([frcPt[0] + 6, frcPt[1] + 4], 'FRC', { class: 'hk-lab frc' });
  const cur = P(s.ppl / MM, 0, HK_PCT(s.v)), foot = P(s.ppl / MM, 0, 0);
  path([cur, foot], { class: 'hk-drop' }); svg.appendChild(sv('circle', { cx: cur[0], cy: cur[1], r: 5, class: 'hk-cursor-dot' }));
  // the Guyton plane at this instant (and the resting curves as ghosts)
  const cc = Object.assign({}, c.cv, { p0: c.series.p0[i], pms: c.series.pms[i], pcrit: c.series.pcrit[i], aft: c.series.aft[i] });
  const g = HK.cvCurves(c.base.c, 60); path(g.vr.map(pt => P(pt[0], pt[1])), { class: 'hk-curve vr ghost' }); path(g.cf.map(pt => P(pt[0], pt[1])), { class: 'hk-curve cf ghost' });
  const now = HK.cvCurves(cc, 60); path(now.vr.map(pt => P(pt[0], pt[1])), { class: 'hk-curve vr' }); path(now.cf.map(pt => P(pt[0], pt[1])), { class: 'hk-curve cf' });
  const op = now.op, opPt = P(op.pra, op.co);
  path([P(op.pra, 0), opPt], { class: 'hk-mark op' }); path([P(-23, op.co), opPt], { class: 'hk-mark op' });
  svg.appendChild(sv('circle', { cx: opPt[0], cy: opPt[1], r: 6, class: 'hk-op', 'data-hk-uop': '1' }));
  text([opPt[0] + 9, opPt[1] - 8], 'Pra ' + op.pra.toFixed(1) + ' · ' + op.co.toFixed(1) + ' L/min', { class: 'hk-lab bold' });
  const pmsPt = P(cc.pms, 0); text([pmsPt[0] + 4, pmsPt[1] - 6], 'Pms ' + cc.pms.toFixed(1), { class: 'hk-lab vr' }); svg.appendChild(sv('circle', { cx: pmsPt[0], cy: pmsPt[1], r: 3.5, class: 'hk-dot vr' }));
  const p0Pt = P(cc.p0, 0); svg.appendChild(sv('circle', { cx: p0Pt[0], cy: p0Pt[1], r: 3.5, class: 'hk-dot cf' })); text([p0Pt[0], p0Pt[1] + 26], 'Ppl ' + s.ppl.toFixed(1) + ' cm H2O', { class: 'hk-lab cf', 'text-anchor': 'middle' });
  if (cc.pcrit > -23) path([P(cc.pcrit, 0), P(cc.pcrit, HK.venousReturn(cc.pcrit, cc))], { class: 'hk-mark pcrit' });
  const yd = Y0 + 44; path([[p0Pt[0], yd], [P(op.pra, 0)[0], yd]], { class: 'hk-dumb' }); svg.appendChild(sv('circle', { cx: p0Pt[0], cy: yd, r: 4, class: 'hk-dumb-end' })); svg.appendChild(sv('circle', { cx: P(op.pra, 0)[0], cy: yd, r: 4, class: 'hk-dumb-end' })); text([(p0Pt[0] + P(op.pra, 0)[0]) / 2, yd + 16], 'transmural ' + op.ptm.toFixed(1), { class: 'hk-lab dumb', 'text-anchor': 'middle' });
  // the phase and the instant's numbers
  text([W - 10, 16], (s.flow > 0.005 ? 'inspiration' : s.flow < -0.005 ? 'expiration' : 'pause') + ' · ' + HK_PCT(s.v).toFixed(0) + ' % VC · Ptp ' + s.ptp.toFixed(1), { 'text-anchor': 'end', class: 'hk-lab bold' });
  return svg;
}
function hkUnionStrips(run, W) {
  const b = run.b, c = run.c, T = b.T, box = h('div', { class: 'hk-strips' }), strips = [];
  const mk = (title, arrs, yr) => { const ch = hkChart(W || 420, 76, { l: 40, r: 8, t: 14, b: 12 }, [0, 1], yr); ch.text(40, 10, title, { class: 'hk-lab bold' }); ch.line(ch.x(0), ch.y(Math.max(yr[0], Math.min(yr[1], 0))), ch.x(1), ch.y(Math.max(yr[0], Math.min(yr[1], 0))), { class: 'hk-axis zero' }); arrs.forEach(a => ch.path(a[0].map((v, k) => [b.t[k] / T, v]), { class: 'hk-tr ' + a[1] })); const cur = ch.line(ch.x(0), ch.y(yr[0]), ch.x(0), ch.y(yr[1]), { class: 'hk-cursor' }); strips.push({ ch: ch, cur: cur }); box.appendChild(ch.svg); };
  const lo = (a) => Math.floor(Math.min.apply(null, a) - 1), hi = (a) => Math.ceil(Math.max.apply(null, a) + 1);
  mk('Pleural pressure, cm H2O', [[b.ppl, 'ppl']], [Math.min(-10, lo(b.ppl)), Math.max(5, hi(b.ppl))]);
  mk('Right atrial pressure (blue) and its transmural pressure (green), mmHg', [[c.series.pra, 'pra'], [c.series.ptm, 'ptm']], [Math.min(-2, lo(c.series.pra)), Math.max(8, hi(c.series.ptm), hi(c.series.pra))]);
  mk('Right-heart output = venous return, L/min', [[c.series.co, 'co']], [0, Math.max(6, hi(c.series.co))]);
  box.hkFrame = (frac) => strips.forEach(s => { s.cur.setAttribute('x1', s.ch.x(frac)); s.cur.setAttribute('x2', s.ch.x(frac)); });
  return box;
}
function hkUnionFig(opts) {
  opts = opts || {}; const key = opts.key || 'main', S = HKS.uni[key] || (HKS.uni[key] = { id: opts.start || 'quiet', play: true, speed: 1, over: {} });
  const groups = opts.groups || null, list = HK.SCENARIOS.filter(x => !groups || groups.indexOf(x.group) >= 0);
  if (!list.some(x => x.id === S.id)) S.id = list[0].id;
  let run = null;
  const compute = () => { const sc = HK.scenario(S.id), resp = Object.assign({}, sc.resp, S.over.resp || {}), cv = Object.assign({}, sc.cv, S.over.cv || {}), hl = Object.assign({}, sc.hl, S.over.hl || {}); const b = HK.breath(resp); run = { s: sc, b: b, c: HK.couple(b, cv, hl) }; };
  compute();
  const slot = h('div', { 'data-hk-unislot': '1' }), stripSlot = h('div', { 'data-hk-unistrips': '1' }), note = h('p', { class: 'hk-note', 'data-hk-uninote': '1' }), read = h('div', { 'data-hk-uniread': '1' });
  let phase = 0;
  const redraw = () => { compute(); stripSlot.textContent = ''; stripSlot.appendChild(hkUnionStrips(run, 420)); note.textContent = run.s.note; const m = run.b.m, c = run.c; read.textContent = ''; read.appendChild(h('dl', { class: 'hk-read' }, [['Over the cycle', 'output ' + c.mean.co.toFixed(1) + ' L/min (' + c.base.co.toFixed(1) + ' at rest), swinging ' + c.swing.pct.toFixed(0) + ' %'], ['Right atrial pressure', c.mean.pra.toFixed(1) + ' mmHg · transmural ' + c.mean.ptm.toFixed(1)], ['Pleural pressure', m.pplMin.toFixed(1) + ' to ' + m.pplMax.toFixed(1) + ' cm H2O'], ['Lung volume', m.pctEE.toFixed(0) + ' → ' + m.pctEI.toFixed(0) + ' % VC' + (m.autoPEEP > 0.3 ? ' · auto-PEEP ' + m.autoPEEP.toFixed(1) : '') + (m.pplat !== null ? ' · plateau ' + m.pplat.toFixed(0) + ' · Ptp ' + m.ptpEI.toFixed(0) : '')], ['Work of breathing', m.wob.perMin.toFixed(1) + ' J/min (' + m.who + ')']].map(r => h('div', {}, [h('dt', { text: r[0] }), h('dd', { text: r[1] })])))); frame(phase); };
  const frame = (fr) => { slot.textContent = ''; slot.appendChild(hkUnionDraw(run, fr)); if (stripSlot.firstChild && stripSlot.firstChild.hkFrame) stripSlot.firstChild.hkFrame(fr); };
  const groupsOf = Array.from(new Set(list.map(x => x.group)));
  const sel = h('select', { 'aria-label': 'Scenario', 'data-hk-uniscen': '1', onchange: (e) => { S.id = e.target.value; S.over = {}; syncSliders(); redraw(); } }, groupsOf.map(g => h('optgroup', { label: g }, list.filter(x => x.group === g).map(x => h('option', { value: x.id, selected: x.id === S.id, text: x.name })))));
  const play = h('button', { type: 'button', class: 'btn sm', 'data-hk-uniplay': '1', text: '❚❚', 'aria-label': 'Pause', onclick: () => { S.play = !S.play; play.textContent = S.play ? '❚❚' : '▶'; } });
  const speed = hkSeg([['0.5', '½×'], ['1', '1×'], ['2', '2×']], String(S.speed), (v) => { S.speed = +v; }, 'data-hk-unispeed');
  // the knobs: a few overrides on top of the scenario
  const K = { pms: null, zone: null, vt: null, rr: null, peep: null, aftSens: null };
  const knobObj = { pms: 7, zone: 0.7, vt: 0.5, rr: 14, peep: 0, aftSens: 0.15 };
  const syncSliders = () => { const sc = HK.scenario(S.id), b = run.b; knobObj.pms = (S.over.cv && S.over.cv.pms) || sc.cv.pms || HK.CV_DEFAULT.pms; knobObj.zone = (S.over.hl && S.over.hl.zone !== undefined) ? S.over.hl.zone : (sc.hl.zone !== undefined ? sc.hl.zone : HK.HL_DEFAULT.zone); knobObj.vt = b.p.vt; knobObj.rr = b.p.rr; knobObj.peep = b.p.peep; knobObj.aftSens = (S.over.hl && S.over.hl.aftSens) || sc.hl.aftSens || HK.HL_DEFAULT.aftSens; fig.querySelectorAll('[data-hk-sl]').forEach(inp => { const k = inp.getAttribute('data-hk-sl'); inp.value = knobObj[k]; inp.dispatchEvent(new Event('refresh')); }); };
  const onKnob = (k) => () => { S.over.resp = S.over.resp || {}; S.over.cv = S.over.cv || {}; S.over.hl = S.over.hl || {}; if (k === 'pms') S.over.cv.pms = knobObj.pms; if (k === 'zone') S.over.hl.zone = knobObj.zone; if (k === 'aftSens') S.over.hl.aftSens = knobObj.aftSens; if (k === 'vt') S.over.resp.vt = knobObj.vt; if (k === 'rr') S.over.resp.rr = knobObj.rr; if (k === 'peep') S.over.resp.peep = knobObj.peep; redraw(); };
  const sl = (label, key, min, max, step, unit) => { const el = hkSlider(label, key, knobObj, min, max, step, unit, onKnob(key)); const inp = el.querySelector('input'); inp.addEventListener('refresh', () => { el.querySelector('.odc-val').textContent = (step < 1 ? (+inp.value).toFixed(step < 0.1 ? 2 : 1) : String(Math.round(+inp.value))) + (unit || ''); }); return el; };
  const knobs = h('details', { class: 'hk-knobs' }, [h('summary', { text: 'Adjust the scenario' }), h('div', { class: 'hk-sliders two' }, [sl('Mean systemic pressure', 'pms', 2, 20, 0.5, ' mmHg'), sl('Volume status (0 = zone I, 1 = zone III)', 'zone', 0, 1, 0.1, ''), sl('Tidal volume', 'vt', 0.15, 1.5, 0.05, ' L'), sl('Rate', 'rr', 6, 40, 1, '/min'), sl('PEEP (ventilator scenarios)', 'peep', 0, 20, 1, ' cm H2O'), sl('RV afterload sensitivity to lung volume', 'aftSens', 0, 1.2, 0.05, '')])]);
  const fig = h('figure', { class: 'an-fig hk-fig', 'data-hkunion': key }, [
    h('div', { class: 'ecg-ctl' }, [h('label', { class: 'ecg-pick' }, [h('span', { class: 'lbl', text: 'Scenario ' }), sel]), play, speed]),
    h('div', { class: 'hk-grid2 wide' }, [slot, h('div', {}, [stripSlot, read])]),
    note, knobs,
    h('div', { class: 'hk-legend' }, [h('span', { class: 'lg lung', text: 'lung curve' }), h('span', { class: 'lg cw', text: 'chest wall curve' }), h('span', { class: 'lg insp', text: 'the breath (loop)' }), h('span', { class: 'lg vr', text: 'venous return' }), h('span', { class: 'lg cf', text: 'cardiac function' }), h('span', { class: 'lg ghost', text: 'at rest (ghost)' }), h('span', { class: 'lg dumb', text: 'transmural pressure' })]),
    h('figcaption', { text: 'The Guyton diagram stands in the page (pressure across, blood flow up); the Campbell diagram is laid into it (pressure across, lung volume into the depth). The breath moves along the loop; its pleural pressure, dropped onto the shared axis, is the foot of the cardiac-function curve, and the lung volume works on the venous-return curve (abdomen) and on the slope (right-ventricular afterload). After Kenny, chapter 2 figure 15 and chapters 3–4. The right-heart output drawn is the venous return of that instant; the left ventricle’s output is buffered by the pulmonary bed and varies less.' })
  ]);
  syncSliders(); redraw();
  let last = 0;
  hkLoop((now) => { if (!fig.isConnected) return; if (S.play) { const dt = last ? (now - last) / 1000 : 0; phase = (phase + dt * S.speed / run.b.T) % 1; } last = now; if (S.play) frame(phase); });
  fig.hk = { state: S, run: () => run, redraw: redraw, frame: (f) => { phase = f; frame(f); } };
  return fig;
}

/* ================================================================ 6. lung volume against "PVR" */
function hkPvrFig() {
  const S = { vol: 35 };
  const left = () => {
    const c = hkChart(420, 260, { l: 44, r: 12, t: 16, b: 34 }, [0, 100], [0, 10]);
    c.text(c.W / 2, c.H - 6, 'Lung volume, % VC', { class: 'hk-lab', 'text-anchor': 'middle' }); c.text(10, 12, 'calculated PVR', { class: 'hk-lab' });
    const extra = [], alv = [], tot = []; for (let v = 0; v <= 100; v += 2) { const e = 1.2 + 4 * Math.exp(-v / 18), a = 0.8 + 0.0012 * Math.pow(Math.max(0, v - 25), 2); extra.push([v, e]); alv.push([v, a]); tot.push([v, e + a]); }
    c.path(extra, { class: 'hk-curve vr' }); c.path(alv, { class: 'hk-curve cf' }); c.path(tot, { class: 'hk-curve rs' });
    c.text(c.x(8), c.y(5.6), 'extra-alveolar vessels', { class: 'hk-lab vr' }); c.text(c.x(70), c.y(3.9), 'alveolar vessels', { class: 'hk-lab cf' }); c.text(c.x(62), c.y(7.4), 'total', { class: 'hk-lab rs' });
    c.line(c.x(35), c.y(0), c.x(35), c.y(10), { class: 'hk-mark frc' }); c.text(c.x(35), 12, 'FRC', { class: 'hk-lab frc', 'text-anchor': 'middle' });
    c.line(c.x(S.vol), c.y(0), c.x(S.vol), c.y(10), { class: 'hk-cursor' });
    return c.svg;
  };
  const right = () => {
    const c = hkChart(420, 260, { l: 44, r: 12, t: 16, b: 34 }, [0, 40], [0, 10]);
    c.text(c.W / 2, c.H - 6, 'Pulmonary artery pressure, mmHg', { class: 'hk-lab', 'text-anchor': 'middle' }); c.text(10, 12, 'flow, L/min', { class: 'hk-lab' });
    const pla = 8, close = 8 + Math.max(0, (S.vol - 35)) * 0.3;   // the closing pressure rises with lung volume above FRC
    const curve = (p0) => { const pts = []; for (let p = 0; p <= 40; p += 1) pts.push([p, p <= p0 ? 0 : 5 * (1 - Math.exp(-(p - p0) / 6)) + (p - p0) * 0.12]); return pts; };
    c.path(curve(pla), { class: 'hk-curve vr ghost' }); c.path(curve(close), { class: 'hk-curve vr' });
    c.text(c.x(pla), c.y(0) + 14, 'Pla ' + pla, { class: 'hk-lab', 'text-anchor': 'middle' }); if (close > pla + 0.5) c.text(c.x(close), c.y(0) - 6, 'closing ' + close.toFixed(0), { class: 'hk-lab vr', 'text-anchor': 'middle' });
    // the operating point at 5 L/min and the "calculated resistance" line through Pla
    const pts = curve(close); let pOp = 40; for (let k = 0; k < pts.length; k++) if (pts[k][1] >= 5) { pOp = pts[k][0]; break; }
    c.path([[pla, 0], [pOp, 5]], { class: 'hk-mark op' }); c.dot(c.x(pOp), c.y(5), 5, { class: 'hk-op' });
    c.text(c.x(pOp) + 8, c.y(5) - 6, 'calculated PVR = (' + pOp + ' − ' + pla + ') / 5 = ' + ((pOp - pla) / 5 * 80).toFixed(0) + ' dyn·s/cm⁵', { class: 'hk-lab bold' });
    return c.svg;
  };
  const slotL = h('div', {}, [left()]), slotR = h('div', {}, [right()]), read = h('p', { class: 'fine', 'data-hk-pvrread': '1' });
  const draw = () => { slotL.textContent = ''; slotL.appendChild(left()); slotR.textContent = ''; slotR.appendChild(right()); read.textContent = S.vol < 30 ? 'Below FRC: the extra-alveolar vessels are untethered and tortuous and collapsed alveoli vasoconstrict; inflation opens both — the calculated resistance falls.' : S.vol <= 40 ? 'At FRC the calculated resistance is at its lowest and the pulmonary capacitance at its highest.' : 'Above FRC: the alveolar pressure rises above the pressure around the heart and becomes the pressure the right ventricle ejects against — a higher closing pressure, a Starling resistor, the vascular waterfall (Permutt). The pressure–flow curve shifts right along the pressure axis; the calculated resistance (a line through the left atrial pressure) rises and overstates the true change, which is not a narrowing of the vessels.'; };
  const fig = h('figure', { class: 'an-fig hk-fig', 'data-hkpvr': '1' }, [
    h('div', { class: 'hk-grid2' }, [slotL, slotR]),
    h('div', { class: 'hk-sliders' }, [hkSlider('Lung volume', 'vol', S, 5, 95, 1, ' % VC', draw)]), read,
    h('figcaption', { text: 'Left: the textbook biphasic curve of calculated pulmonary vascular resistance against lung volume. Right: why it is biphasic above FRC — not Poiseuille narrowing but a higher closing pressure (a Starling resistor), which shifts the pressure–flow relation along the pressure axis; a resistance calculated as a ratio through the left atrial pressure misreads it. After Kenny, chapter 3 figure 4 and chapter 2 figure 11.' })
  ]);
  draw();
  return fig;
}

/* ================================================================ 7. the same CVP, three patients (chapter 6) */
function hkCvp3Fig() {
  const PATIENTS = [
    { id: 'full', name: 'Full and strong', cv: { pms: 10 }, who: 'Hypervolaemic with a strong heart: a high Pms met by a steep curve.' },
    { id: 'eu', name: 'Euvolaemic, normal', cv: { pms: 7 }, who: 'The ordinary patient: Pms 7, a normal heart.' },
    { id: 'dry', name: 'Empty and weak', cv: { pms: 4.5 }, who: 'Hypovolaemic with a weak heart: a low Pms met by a flat curve.' }
  ];
  const S = { id: 'eu' };
  const slot = h('div', { 'data-hk-cvp3slot': '1' }), read = h('div', { 'data-hk-cvp3read': '1' });
  const draw = () => {
    const pt = PATIENTS.filter(x => x.id === S.id)[0], contr = HK.fitContr(pt.cv, 2), c = Object.assign({}, HK.CV_DEFAULT, pt.cv, { contr: contr }), op = HK.operate(c);
    const bolus = HK.operate(Object.assign({}, c, { pms: c.pms + 2 })), gain = (bolus.co - op.co) / op.co * 100;
    slot.textContent = ''; slot.appendChild(hkGuytonDraw(c, null));
    read.textContent = ''; read.appendChild(h('dl', { class: 'hk-read' }, [['CVP (right atrial pressure)', op.pra.toFixed(1) + ' mmHg — the same in all three'], ['Cardiac output', op.co.toFixed(1) + ' L/min'], ['Mean systemic pressure', c.pms.toFixed(1) + ' mmHg'], ['Contractility (fitted)', contr.toFixed(2) + ' × normal'], ['A 2 mmHg rise in Pms (a bolus) would give', '+' + gain.toFixed(0) + ' % output → ' + (gain >= 10 ? 'responsive' : 'not responsive')]].map(r => h('div', {}, [h('dt', { text: r[0] }), h('dd', { text: r[1] })]))));
    read.appendChild(h('p', { class: 'fine', text: pt.who }));
  };
  const fig = h('figure', { class: 'an-fig hk-fig', 'data-hkcvp3': '1' }, [
    h('div', { class: 'ecg-ctl' }, [h('span', { class: 'lbl', text: 'Three patients, one CVP of 2 mmHg' }), hkSeg(PATIENTS.map(x => [x.id, x.name]), S.id, (id) => { S.id = id; draw(); }, 'data-hk-cvp3')]),
    h('div', { class: 'hk-grid2 wide' }, [slot, read]),
    h('figcaption', { text: 'The same right atrial pressure from three different crossings: the CVP is read “within the context of cardiac output”, and the heart’s curve is fitted so that all three sit at 2 mmHg. After Kenny, chapter 6, figures 4 and 5.' })
  ]);
  draw();
  return fig;
}

/* ================================================================ 8. the PVR illusion (chapters 7 and 10) */
function hkPvrIllusionFig() {
  const S = { state: 'base' };
  const STATES = { base: { pc: 0, q: 5, name: 'Baseline', text: 'Flow 5 L/min on the curve; the calculated PVR is the slope of the chord from the left atrial pressure to the operating point.' }, valsalva: { pc: 0, q: 3, name: 'Valsalva', text: 'The strain lowers the venous return and the flow slides down the same curve: the vessels are unchanged, the PA transmural pressure falls — and the calculated PVR rises, because the denominator fell. Charlier’s group read this as a rise in impedance; it is a fall in preload.' }, pe: { pc: 10, q: 5, name: 'Pulmonary embolism', text: 'The embolus raises the closing pressure: the whole curve shifts right. At the same flow the pressure is higher and the calculated PVR rises — by about as much as in the Valsalva, for the opposite reason. The right ventricle is truly loaded.' }, ne: { pc: 10, q: 7, name: 'PE + norepinephrine', text: 'Norepinephrine raises the flow along the shifted curve: the calculated PVR falls, but the closing pressure — the load lifted by the RV — is unchanged. The ratio fell because it is referenced to the wedge.' }, lysis: { pc: 2, q: 5, name: 'PE + thrombolysis', text: 'Lysis lowers the closing pressure and the curve moves back: the calculated PVR falls, and this time the load really is lower. “Only the latter truly lowers the lifted load.”' } };
  const slot = h('div', { 'data-hk-pqslot': '1', style: 'max-width: 720px' }), read = h('p', { class: 'hk-note', 'data-hk-pqread': '1' });
  const draw = () => {
    const st = STATES[S.state], c = hkChart(560, 320, { l: 48, r: 12, t: 16, b: 34 }, [0, 36], [0, 9]);
    [2, 4, 6, 8].forEach(v => { c.line(c.x(0), c.y(v), c.x(36), c.y(v), { class: 'ph-grid' }); c.text(c.pad.l - 6, c.y(v) + 4, String(v), { class: 'hk-lab', 'text-anchor': 'end' }); });
    [0, 10, 20, 30].forEach(x => { c.line(c.x(x), c.y(0), c.x(x), c.y(9), { class: 'ph-grid' + (x === 0 ? ' zero' : '') }); c.text(c.x(x), c.H - 18, String(x), { class: 'hk-lab', 'text-anchor': 'middle' }); });
    c.text(c.W / 2, c.H - 4, 'mean PA pressure − wedge, mmHg (the transmural driving pressure)', { class: 'hk-lab', 'text-anchor': 'middle' }); c.text(12, 12, 'flow, L/min', { class: 'hk-lab' });
    const curve = (pc) => { const pts = []; for (let p = 0; p <= 36; p += 0.25) { const q = HK.pqFlow(p, pc); if (q > 9) break; pts.push([p, q]); } return pts; };
    c.path(curve(0), { class: 'hk-curve vr ghost' }); if (st.pc > 0) c.path(curve(st.pc), { class: 'hk-curve vr' }); else c.path(curve(0), { class: 'hk-curve vr' });
    const pOp = HK.pqPressure(st.q, st.pc), p0 = HK.pqPressure(5, 0);
    c.path([[0, 0], [p0, 5]], { class: 'hk-mark op ghost' }); c.dot(c.x(p0), c.y(5), 4, { class: 'hk-op ghost' });
    c.path([[0, 0], [pOp, st.q]], { class: 'hk-mark op' }); c.dot(c.x(pOp), c.y(st.q), 6, { class: 'hk-op', 'data-hk-pqop': '1' });
    if (st.pc > 0) c.text(c.x(st.pc), c.y(0) - 6, 'closing pressure ' + st.pc, { class: 'hk-lab vr', 'text-anchor': 'middle' });
    const pvr = (pOp / st.q * 80), pvr0 = p0 / 5 * 80;
    c.text(c.x(pOp) + 8, c.y(st.q) - 8, 'calculated PVR ' + pvr.toFixed(0) + ' (baseline ' + pvr0.toFixed(0) + ') dyn·s/cm⁵', { class: 'hk-lab bold' });
    slot.textContent = ''; slot.appendChild(c.svg); read.textContent = st.text + ' Calculated PVR ' + pvr.toFixed(0) + ' vs ' + pvr0.toFixed(0) + ' at baseline; closing pressure ' + st.pc + ' mmHg; flow ' + st.q + ' L/min.';
  };
  const fig = h('figure', { class: 'an-fig hk-fig', 'data-hkpq': '1' }, [
    h('div', { class: 'ecg-ctl' }, [hkSeg(Object.keys(STATES).map(k => [k, STATES[k].name]), S.state, (k) => { S.state = k; draw(); }, 'data-hk-pq')]),
    slot, read,
    h('figcaption', { text: 'Flow against the transmural driving pressure of the pulmonary circulation: nothing flows below a closing pressure, and above it the pressure rises less and less steeply with flow as vessels distend and recruit. A calculated resistance is the chord from the origin, so it rises when the flow falls (Valsalva) and when the closing pressure rises (embolism) alike, and falls with norepinephrine though the load is unchanged. After Kenny, chapter 7 figure 3 and chapter 10 figures 40–43.' })
  ]);
  draw();
  return fig;
}

/* ================================================================ 9. two stresses, one diagram (chapter 8) */
function hkTwoStressFig() {
  const S = { patient: 'resp', stress: 'none' };
  const PAT = { resp: { name: 'Preload-responsive (on the slope)', cv: {} }, nonresp: { name: 'Not responsive (on the plateau)', cv: { pms: 15, contr: 0.55 } }, rvload: { name: 'RV afterload-sensitive (ARDS)', cv: { pms: 12, aft: 1.0 } } };
  const STRESS = { none: { name: 'No stress', d: {} }, breath: { name: 'A mechanical breath (+4 mmHg around the heart)', d: { p0: 4 } }, spont: { name: 'A spontaneous breath (−3 mmHg)', d: { p0: -3 } }, plr: { name: 'Passive leg raise (+2 mmHg Pms)', d: { pms: 2 } }, eeo: { name: 'End-expiratory occlusion (−2 around the heart)', d: { p0: -2 } } };
  const slot = h('div', { 'data-hk-tsslot': '1' }), read = h('div', { 'data-hk-tsread': '1' });
  const draw = () => {
    const base = Object.assign({}, HK.CV_DEFAULT, PAT[S.patient].cv), d = STRESS[S.stress].d, now = Object.assign({}, base, { p0: base.p0 + (d.p0 || 0), pms: base.pms + (d.pms || 0) });
    if (S.stress === 'breath' && S.patient === 'rvload') now.aft = base.aft + 0.6;
    const o0 = HK.operate(base), o1 = HK.operate(now), dco = (o1.co - o0.co) / o0.co * 100;
    slot.textContent = ''; slot.appendChild(hkGuytonDraw(now, base));
    read.textContent = ''; read.appendChild(h('dl', { class: 'hk-read' }, [['Output', o0.co.toFixed(1) + ' → ' + o1.co.toFixed(1) + ' L/min (' + (dco >= 0 ? '+' : '') + dco.toFixed(0) + ' %)'], ['Right atrial pressure', o0.pra.toFixed(1) + ' → ' + o1.pra.toFixed(1) + ' mmHg'], ['Transmural pressure', o0.ptm.toFixed(1) + ' → ' + o1.ptm.toFixed(1) + ' mmHg']].map(r => h('div', {}, [h('dt', { text: r[0] }), h('dd', { text: r[1] })]))));
    let v = '';
    if (S.stress === 'none') v = 'Pick a stress. A mechanical breath moves the cardiac-function curve; a leg raise moves the venous-return curve. Both ask the same question — is the crossing on the slope? — with different caveats.';
    else if (S.stress === 'breath') v = S.patient === 'rvload' ? 'The breath shifts the curve and bends it (lung volume above FRC afterloads the RV): the output varies although the patient is on the plateau — a false positive for fluid.' : (Math.abs(dco) >= 10 ? 'The output varies with the breath: the crossing is on the slope — a responder, provided the dose was the standard one (passive, 8–10 mL/kg, sinus rhythm).' : 'Little variation: the crossing is on the plateau. (A small tidal volume or a spontaneous effort would also give little, for the wrong reason.)');
    else if (S.stress === 'plr') v = Math.abs(dco) >= 10 ? 'The leg raise shifts the venous-return curve and the output rises: a responder — read with a flow measurement, and it works in spontaneous breathing and arrhythmia.' : 'The venous-return curve shifts but the output barely moves: the crossing is on the plateau.';
    else v = Math.abs(dco) >= 5 ? 'A fall in the pressure around the heart slides the curve left along the venous return: the output rises — the crossing is on the slope.' : 'The curve slides but the output does not follow: the plateau.';
    read.appendChild(h('p', { class: 'hk-note', text: v }));
  };
  const fig = h('figure', { class: 'an-fig hk-fig', 'data-hktwostress': '1' }, [
    h('div', { class: 'ecg-ctl' }, [h('label', { class: 'ecg-pick' }, [h('span', { class: 'lbl', text: 'Patient ' }), h('select', { 'data-hk-tspat': '1', 'aria-label': 'Patient', onchange: (e) => { S.patient = e.target.value; draw(); } }, Object.keys(PAT).map(k => h('option', { value: k, selected: k === S.patient, text: PAT[k].name })))]), h('label', { class: 'ecg-pick' }, [h('span', { class: 'lbl', text: 'Stress ' }), h('select', { 'data-hk-tsstress': '1', 'aria-label': 'Stress', onchange: (e) => { S.stress = e.target.value; draw(); } }, Object.keys(STRESS).map(k => h('option', { value: k, selected: k === S.stress, text: STRESS[k].name })))])]),
    h('div', { class: 'hk-grid2 wide' }, [slot, read]),
    h('figcaption', { text: 'Functional haemodynamic monitoring on the Guyton diagram: the ghost curves are the patient at rest, the solid ones under the stress. A ventilator breath moves the cardiac-function curve (and bends it when the RV is afterload-sensitive); a leg raise moves the venous-return curve. After Kenny, chapter 8, figures 3, 8 and 13.' })
  ]);
  draw();
  return fig;
}

/* ================================================================ 10. strain and stress (chapter 9) */
function hkStrainFig() {
  const S = { vt: 400, baby: 400, raiser: 2 };
  const slot = h('div', { 'data-hk-strainslot': '1', style: 'max-width: 760px' }), read = h('p', { class: 'fine', 'data-hk-strainread': '1' });
  const draw = () => {
    const r = HK.strainStress(S.vt, S.baby, S.raiser), c = hkChart(640, 150, { l: 24, r: 40, t: 24, b: 30 }, [0, 3.3], [0, 1]);
    [0.5, 1, 1.5, 2, 2.5, 3].forEach(x => { c.line(c.x(x), c.y(0), c.x(x), c.y(1), { class: 'ph-grid' }); c.text(c.x(x), c.H - 14, x.toFixed(1), { class: 'hk-lab', 'text-anchor': 'middle' }); c.text(c.x(x), 12, Math.round(12 * x) + ' cm H2O', { class: 'hk-lab', 'text-anchor': 'middle' }); });
    c.text(c.W / 2, c.H - 2, 'strain (tidal volume ÷ the open lung) — above: the stress it makes, ≈ 12 cm H2O per unit', { class: 'hk-lab', 'text-anchor': 'middle' });
    c.area([[0, 0.3], [1.5, 0.3], [1.5, 0.7], [0, 0.7]], { class: 'hk-area elastic', style: 'fill: rgba(46,154,90,0.18)' }); c.area([[1.5, 0.3], [2.5, 0.3], [2.5, 0.7], [1.5, 0.7]], { class: 'hk-area threshold' }); c.area([[2.5, 0.3], [3.3, 0.3], [3.3, 0.7], [2.5, 0.7]], { class: 'hk-area elastic' });
    c.text(c.x(0.75), c.y(0.5) + 4, 'safe-ish', { class: 'hk-lab', 'text-anchor': 'middle' }); c.text(c.x(2.0), c.y(0.5) + 4, 'collagen fully distended (21 cm H2O)', { class: 'hk-lab', 'text-anchor': 'middle' }); c.text(c.x(2.9), c.y(0.5) + 4, 'beyond TLC', { class: 'hk-lab', 'text-anchor': 'middle' });
    const xs = Math.min(3.3, r.strain), xl = Math.min(3.3, r.local / 12);
    c.line(c.x(xs), c.y(0.1), c.x(xs), c.y(0.9), { class: 'hk-cursor' }); c.text(c.x(xs) + (xs > 2.4 ? -4 : 4), c.y(0.86), 'global strain ' + r.strain.toFixed(2), { class: 'hk-lab bold', 'text-anchor': xs > 2.4 ? 'end' : 'start' });
    c.line(c.x(xl), c.y(0.1), c.x(xl), c.y(0.9), { class: 'hk-mark vee' }); c.text(c.x(xl) + (xl > 2.4 ? -4 : 4), c.y(0.14), 'at a stress raiser: ' + r.local.toFixed(0) + ' cm H2O', { class: 'hk-lab vee', 'text-anchor': xl > 2.4 ? 'end' : 'start' });
    slot.textContent = ''; slot.appendChild(c.svg);
    read.textContent = S.vt + ' mL into ' + S.baby + ' mL of open lung is a strain of ' + r.strain.toFixed(2) + ' and a stress of about ' + r.stress.toFixed(0) + ' cm H2O of transpulmonary pressure; at an interface with a stress raiser of ×' + S.raiser + ' the local stress is ' + r.local.toFixed(0) + ' cm H2O' + (r.local > 30 ? ' — beyond TLC locally' : r.local > 21 ? ' — the collagen is fully distended there' : '') + '. The same ' + S.vt + ' mL into a healthy 2,000 mL FRC would be a strain of ' + (S.vt / 2000).toFixed(2) + '.';
  };
  const fig = h('figure', { class: 'an-fig hk-fig', 'data-hkstrain': '1' }, [
    slot, read,
    h('div', { class: 'hk-sliders two' }, [hkSlider('Tidal volume', 'vt', S, 100, 1000, 10, ' mL', draw), hkSlider('Open (“baby”) lung at end-expiration', 'baby', S, 100, 2500, 50, ' mL', draw), hkSlider('Stress raiser at the interfaces', 'raiser', S, 1, 4.6, 0.1, '×', draw)]),
    h('figcaption', { text: 'Strain is the tidal volume relative to the lung that is open; stress (the fibre tension, ≈ the transpulmonary pressure) is about 12 cm H2O per unit of strain. The ARDS lung is small, not stiff, and its inhomogeneity multiplies the local stress. After Kenny, chapter 9 (strain and stress, stress raisers).' })
  ]);
  draw();
  return fig;
}

/* ================================================================ 11. the geometrical framework (Kenny 2023) */
function hkGeomFig() {
  const S = { g: Object.assign({}, HK.GEOM_DEFAULT), prone: false, patient: 'resp' };
  const PAT = { resp: { name: 'Preload-responsive (unlimited)', g: {} }, nonresp: { name: 'Preload-unresponsive (cardiac-limited)', g: { praPlat: 2.5, rcard: 0.7 } }, venous: { name: 'Venous-limited (great veins collapsing)', g: { pcrit: 3, pmsf: 7 } } };
  const PRONE = { pmsf: 4, rvr: 0.3, rcard: -0.1, ecw: 0.2 };
  const slot = h('div', { 'data-hk-geomslot': '1' }), read = h('div', { 'data-hk-geomread': '1' }), slot2 = h('div', { 'data-hk-geom2': '1', style: 'max-width: 720px' });
  const current = () => { const g = Object.assign({}, S.g); if (S.prone) { g.pmsf += PRONE.pmsf; g.rvr += PRONE.rvr; g.rcard = Math.max(0.1, g.rcard + PRONE.rcard); g.ecw += PRONE.ecw; } return g; };
  const draw = () => {
    const g = current(), r = HK.geom(g), r0 = HK.geom(S.g), xr = [-6, 26], yr = [0, 14];
    const c = hkChart(560, 360, { l: 44, r: 12, t: 16, b: 54 }, xr, yr);
    for (let v = 2; v <= 14; v += 2) c.line(c.x(xr[0]), c.y(v), c.x(xr[1]), c.y(v), { class: 'ph-grid' });
    for (let x = -5; x <= 25; x += 5) { c.line(c.x(x), c.y(0), c.x(x), c.y(yr[1]), { class: 'ph-grid' + (x === 0 ? ' zero' : '') }); c.text(c.x(x), c.y(0) + 14, String(x), { class: 'hk-lab', 'text-anchor': 'middle' }); }
    [2, 4, 6, 8, 10, 12].forEach(v => c.text(c.pad.l - 6, c.y(v) + 4, String(v), { class: 'hk-lab', 'text-anchor': 'end' }));
    c.text(c.W / 2, c.y(0) + 28, 'right atrial pressure, mmHg', { class: 'hk-lab', 'text-anchor': 'middle' }); c.text(12, 12, 'Q circulatory, L/min', { class: 'hk-lab' });
    const tri = (gg, cls) => { const rr = HK.geom(gg); const praPlatY = Math.max(0, (gg.praPlat - rr.ppc) / gg.rcard); const cf = praPlatY <= yr[1] ? [[rr.ppc, 0], [gg.praPlat, praPlatY], [xr[1], praPlatY]] : [[rr.ppc, 0], [rr.ppc + gg.rcard * yr[1], yr[1]]]; c.path(cf, { class: 'hk-curve cf ' + cls }); const vMax = Math.min(yr[1], (gg.pmsf - gg.pcrit) / gg.rvr), pStart = vMax < (gg.pmsf - gg.pcrit) / gg.rvr ? gg.pmsf - vMax * gg.rvr : gg.pcrit; c.path([[xr[0], vMax], [pStart, vMax], [gg.pmsf, 0]], { class: 'hk-curve vr ' + cls }); c.dot(c.x(rr.pra), c.y(rr.q), cls ? 4 : 6, { class: 'hk-op ' + cls }); return rr; };
    if (S.prone) tri(S.g, 'ghost'); tri(g, '');
    c.line(c.x(r.ppc), c.y(0), c.x(r.pra), c.y(0), { class: 'hk-dumb' }); c.text(c.x(r.ppc) - 4, c.y(0.6), 'Ppc ' + r.ppc.toFixed(1), { class: 'hk-lab cf', 'text-anchor': 'end' }); c.text(c.x(g.pmsf) + 4, c.y(0.6), 'Pms ' + g.pmsf.toFixed(1), { class: 'hk-lab vr' });
    c.text(c.x(r.pra) + 8, c.y(r.q) - 8, 'Q ' + r.q.toFixed(1) + ' · Pra ' + r.pra.toFixed(1) + ' · ' + r.regime, { class: 'hk-lab bold' });
    slot.textContent = ''; slot.appendChild(c.svg);
    read.textContent = ''; read.appendChild(h('dl', { class: 'hk-read' }, [['Regime', r.regime], ['Q circulatory', r.q.toFixed(1) + ' L/min' + (S.prone ? ' (supine ' + r0.q.toFixed(1) + ')' : '')], ['Right atrial pressure', r.pra.toFixed(1) + ' mmHg' + (S.prone ? ' (supine ' + r0.pra.toFixed(1) + ')' : '')], ['Ppc = Ppl + Paw × Ecw/Ers + pericardium', r.ppc.toFixed(1) + ' mmHg'], ['Transmural Pra (preload)', r.ptm.toFixed(1) + ' mmHg'], ['Cardiac plateau (Praplat − Ppc)/Rcardiac', r.qC.toFixed(1) + ' L/min'], ['Venous plateau (Pms − Pcrit)/RVR', r.qV.toFixed(1) + ' L/min']].map(x => h('div', {}, [h('dt', { text: x[0] }), h('dd', { text: x[1] })]))));
    read.appendChild(h('p', { class: 'hk-note', text: r.regime === 'cardiac-limited' ? 'Cardiac-limited: Q = (Praplat − Ppc)/Rcardiac. Raising Pms or lowering RVR changes only the right atrial pressure — fluid goes into congestion.' : r.regime === 'venous-limited' ? 'Venous-limited: Q = (Pms − Pcrit)/RVR. The heart and the pressure around it change only the Pra; the great veins are collapsing.' : r.regime === 'dual limitation' ? 'Both plateaus at once: the flow is fixed and the Pra is indeterminate between Pcrit and Praplat.' : 'Unlimited: Q = (Pms − Ppc)/(Rcardiac + RVR). Every term moves both the flow and the Pra — this is the preload-responsive patient.' }));
    // the 2025 letter: Pra against Pms for the responsive and the unresponsive
    const c2 = hkChart(560, 200, { l: 44, r: 12, t: 16, b: 30 }, [0, 20], [0, 16]), ratio = g.rvr / g.rcard;
    [0, 5, 10, 15, 20].forEach(x => { c2.line(c2.x(x), c2.y(0), c2.x(x), c2.y(16), { class: 'ph-grid' }); c2.text(c2.x(x), c2.H - 14, String(x), { class: 'hk-lab', 'text-anchor': 'middle' }); });
    [4, 8, 12, 16].forEach(v => c2.text(c2.pad.l - 6, c2.y(v) + 4, String(v), { class: 'hk-lab', 'text-anchor': 'end' }));
    c2.text(c2.W / 2, c2.H - 2, 'mean systemic filling pressure, mmHg', { class: 'hk-lab', 'text-anchor': 'middle' }); c2.text(12, 12, 'right atrial pressure, mmHg — the 2025 letter', { class: 'hk-lab' });
    const weakPlat = Math.max(r.ppc + 0.5, g.praPlat * 0.45), cl = (v) => Math.max(0, Math.min(16, v));
    const pr = [], strong = [], weak = []; for (let p = 0; p <= 20; p += 0.25) { pr.push([p, cl(HK.praVsPmsf(p, ratio, g.praPlat, true, r.ppc))]); strong.push([p, cl(HK.praCurve(p, ratio, g.praPlat, r.ppc))]); weak.push([p, cl(HK.praCurve(p, ratio, weakPlat, r.ppc))]); }
    c2.path(pr, { class: 'hk-curve cf ghost' }); c2.path(strong, { class: 'hk-curve cf' }); c2.path(weak, { class: 'hk-curve vr' });
    const kneeS = r.ppc + (g.praPlat - r.ppc) * (ratio + 1), kneeW = r.ppc + (weakPlat - r.ppc) * (ratio + 1);
    c2.dot(c2.x(g.pmsf), c2.y(cl(HK.praCurve(g.pmsf, ratio, g.praPlat, r.ppc))), 5, { class: 'hk-op' });
    const endS = cl(HK.praCurve(20, ratio, g.praPlat, r.ppc)), endW = cl(HK.praCurve(20, ratio, weakPlat, r.ppc)), endG = cl(HK.praVsPmsf(20, ratio, g.praPlat, true, r.ppc));
    c2.text(c2.x(20) - 4, c2.y(endS) - 6, 'this heart', { class: 'hk-lab cf', 'text-anchor': 'end' });
    c2.text(c2.x(20) - 4, c2.y(endW) + (endW >= 15.5 ? 14 : -6), 'a weak heart', { class: 'hk-lab vr', 'text-anchor': 'end' });
    c2.text(c2.x(20) - 4, c2.y(endG) + 13, 'if it never plateaued', { class: 'hk-lab', 'text-anchor': 'end' });
    slot2.textContent = ''; slot2.appendChild(c2.svg);
    slot2.appendChild(h('p', { class: 'fine', 'data-hk-geom2read': '1', text: 'While the heart is on its slope the right atrial pressure rises by Rcardiac/(Rcardiac + RVR) = ' + (1 / (ratio + 1)).toFixed(2) + ' mmHg per mmHg of Pms — most of a bolus goes into flow. This heart reaches its plateau at Pms ≈ ' + kneeS.toFixed(0) + ' mmHg; beyond it, every mmHg of Pms goes into the right atrium (1 : 1). A weak heart (plateau at Pra ' + weakPlat.toFixed(1) + ') is congested from Pms ≈ ' + kneeW.toFixed(0) + ' mmHg: fluid raises its CVP and little else. The dot is the current Pms.' }));
  };
  const sl = (label, key, min, max, step, unit) => hkSlider(label, key, S.g, min, max, step, unit, draw);
  const fig = h('figure', { class: 'an-fig hk-fig', 'data-hkgeom': '1' }, [
    h('div', { class: 'ecg-ctl' }, [h('label', { class: 'ecg-pick' }, [h('span', { class: 'lbl', text: 'Patient ' }), h('select', { 'data-hk-geompat': '1', 'aria-label': 'Patient', onchange: (e) => { S.patient = e.target.value; Object.keys(S.g).forEach(k => { delete S.g[k]; }); Object.assign(S.g, HK.GEOM_DEFAULT, PAT[S.patient].g); fig.querySelectorAll('[data-hk-sl]').forEach(inp => { const k = inp.getAttribute('data-hk-sl'); if (S.g[k] !== undefined) { inp.value = S.g[k]; inp.parentNode.querySelector('.odc-val').textContent = (+inp.value).toFixed(k === 'ecw' || k === 'rcard' || k === 'rvr' ? 2 : 1); } }); draw(); } }, Object.keys(PAT).map(k => h('option', { value: k, selected: k === S.patient, text: PAT[k].name })))]),
      (() => { const id = uid('hkp'); return h('label', { class: 'chk-inline', for: id }, [h('input', { type: 'checkbox', id: id, 'data-hk-prone': '1', onchange: (e) => { S.prone = e.target.checked; draw(); } }), 'Turn prone (Pms +4, RVR +0.3, Rcardiac −0.1, Ecw/Ers +0.2)']); })()]),
    h('div', { class: 'hk-grid2 wide' }, [slot, h('div', {}, [read, h('div', { class: 'hk-sliders two' }, [sl('Mean systemic filling pressure', 'pmsf', 2, 20, 0.5, ''), sl('Pleural pressure (mmHg)', 'ppl', -10, 10, 0.5, ''), sl('Mean airway pressure (mmHg)', 'paw', 0, 20, 0.5, ''), sl('Ecw/Ers (chest wall share)', 'ecw', 0.05, 0.9, 0.05, ''), sl('Pericardial recoil', 'ppcel', 0, 8, 0.5, ''), sl('Rcardiac (mmHg per L/min)', 'rcard', 0.1, 2, 0.05, ''), sl('RVR (mmHg per L/min)', 'rvr', 0.3, 3, 0.05, ''), sl('Pra at the cardiac plateau', 'praPlat', 0, 15, 0.5, ''), sl('Collapse pressure Pcrit', 'pcrit', -5, 8, 0.5, '')])])]),
    slot2,
    h('figcaption', { text: 'Two right triangles with the operating point as their apex: the cardiac line rises from Ppc with slope 1/Rcardiac to its plateau; the venous line falls from Pms with slope 1/RVR from its plateau below the collapse pressure. Q = (Pms − Ppc)/(Rcardiac + RVR) until a plateau takes over. Below: the same geometry solved for the right atrial pressure against Pms (Kenny & Werner Moller 2025). After Kenny 2023, figures 7–10.' })
  ]);
  draw();
  return fig;
}

function hkWidget(kind) {
  if (!HK) return null;
  if (kind === 'hl_bag') return hkBagFig();
  if (kind === 'hl_campbell') return hkCampbellFig();
  if (kind === 'hl_ptrans') return hkPtransFig();
  if (kind === 'hl_guyton') return hkGuytonFig();
  if (kind === 'hl_union') return hkUnionFig({ key: 'main', start: 'quiet' });
  if (kind === 'hl_sickpick') return hkUnionFig({ key: 'sick', start: 'copd_sp', groups: ['In sickness', 'Weaning'] });
  if (kind === 'hl_pvr') return hkPvrFig();
  if (kind === 'hl_wean') return hkUnionFig({ key: 'wean', start: 'wean', groups: ['Weaning', 'In sickness'] });
  if (kind === 'hl_cvp3') return hkCvp3Fig();
  if (kind === 'hl_pvrillusion') return hkPvrIllusionFig();
  if (kind === 'hl_twostress') return hkTwoStressFig();
  if (kind === 'hl_strain') return hkStrainFig();
  if (kind === 'hl_geom') return hkGeomFig();
  return null;
}
