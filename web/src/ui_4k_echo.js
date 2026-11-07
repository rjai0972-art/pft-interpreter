/* ========================================================================== Learn: echo & POCUS
   The views atlas (rendered from the model, with slots for your own images), the scanning lab (a probe on a modelled
   chest, the B-mode sector, labels, a target view with a score and hints), and the quiz. */
const EH = window.PFT_ECHO;
const EHS = { win: 'psl', rot: 135, tilt: 0, rock: -10, dx: -0.5, dz: 1, depth: 16, path: 'normal', target: 'plax', labels: true, beating: true, model: null, anim: { raf: 0, t0: 0 }, canvas: null, lastRegs: [], own: {} };
const EHQ = { round: null, step: 0, picks: [], score: 0, n: 0 };
const EH_W = 256, EH_H = 208;
const EH_COL = { 12: '#ff7a7a', 13: '#7fb2ff', 14: '#ffc266', 15: '#8ee89a', 16: '#ff8cff', 17: '#7ff2f2', 18: '#fff27a', 19: '#cfa3ff', 20: '#b8ffb8', 6: '#59d3ff', 21: '#5aa9e0', 7: '#ffffff', 8: '#d8c8b0', 10: '#c9b49a', 11: '#ffffff', 5: '#ffffff', 4: '#d0d0d0' };
function ehModel() { if (!EHS.model || EHS.model.pathId !== EHS.path) { EHS.model = EH.build(EHS.path); EHS.model.pathId = EHS.path; } return EHS.model; }
function ehParams(over) { return Object.assign({ win: EHS.win, rot: EHS.rot, tilt: EHS.tilt, rock: EHS.rock, dx: EHS.dx, dz: EHS.dz, depth: EHS.depth, model: ehModel() }, over || {}); }
/* paint a render into a canvas (upscaled), with optional labels and an outlined structure */
function ehPaint(cv, res, W, H, opts) {
  opts = opts || {};
  const ctx = cv.getContext('2d');
  const off = ehPaint.off || (ehPaint.off = document.createElement('canvas'));
  off.width = W; off.height = H;
  const octx = off.getContext('2d'), data = octx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) { const g = res.img[i]; data.data[i * 4] = g; data.data[i * 4 + 1] = g; data.data[i * 4 + 2] = g; data.data[i * 4 + 3] = 255; }
  octx.putImageData(data, 0, 0);
  const dpr = Math.min(2, window.devicePixelRatio || 1), cw = cv.clientWidth || 512, ch = Math.round(cw * H / W);
  if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(off, 0, 0, cw, ch);
  const sx = cw / W, sy = ch / H;
  if (opts.outline !== undefined && opts.outline !== null) {
    ctx.fillStyle = opts.outlineColor || '#59d3ff';
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) { const idx = j * W + i; if (res.ids[idx] !== opts.outline) continue; if (res.ids[idx - 1] !== opts.outline || res.ids[idx + 1] !== opts.outline || res.ids[idx - W] !== opts.outline || res.ids[idx + W] !== opts.outline) ctx.fillRect(i * sx - 1, j * sy - 1, 2.5, 2.5); }
  }
  if (opts.labels) {
    const regs = EH.regions(res, W, H).filter(r => r.frac > (r.id === 19 || r.id === 18 || r.id === 17 ? 0.0015 : 0.003));
    ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    regs.forEach(r => { if (r.id === 4 || r.id === 5 || r.id === 7 || r.id === 8 || r.id === 11) return; const x = r.x * sx, y = r.y * sy; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(r.name, x, y); ctx.fillStyle = EH_COL[r.id] || '#fff'; ctx.fillText(r.name, x, y); });
    // the thin structures get a small tag at their centroid too
    regs.filter(r => r.id === 7 || r.id === 8 || r.id === 11).forEach(r => { const x = r.x * sx, y = r.y * sy; ctx.font = '600 10px system-ui, sans-serif'; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(r.name, x, y); ctx.fillStyle = EH_COL[r.id] || '#fff'; ctx.fillText(r.name, x, y); ctx.font = '600 12px system-ui, sans-serif'; });
    return regs;
  }
  return null;
}
/* the sector's overlay text (depth marks, the orientation marker) */
function ehSectorChrome(cv, depth, title) {
  const ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), cw = cv.width / dpr, ch = cv.height / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#8fa7b8'; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const scale = (ch - 10 * ch / EH_H) / depth;
  for (let d = 5; d < depth; d += 5) { ctx.fillText(d + ' cm', 6, 6 * ch / EH_H + d * scale + 3); ctx.fillRect(2, 6 * ch / EH_H + d * scale, 3, 1); }
  ctx.fillStyle = '#7bd389'; ctx.beginPath(); ctx.arc(cw / 2 + 6 * cw / EH_W, 5, 3, 0, Math.PI * 2); ctx.fill();
  if (title) { ctx.fillStyle = '#f6efd6'; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(title, cw - 6, ch - 6); }
}

/* ---- the torso with the probe ---- */
function ehTorso(params, opts) {
  opts = opts || {};
  const sc = 7, ox = 110, oz = 95;   // 1 cm = 7 px; origin at the mid-sternum, 4th interspace
  const X = (x) => ox + x * sc, Z = (z) => oz - z * sc;
  const svg = sv('svg', { viewBox: '0 0 220 230', class: 'eh-torso', role: 'img', 'aria-label': 'The chest with the probe position' });
  svg.appendChild(sv('path', { d: 'M40 10 C 40 40 20 50 14 90 L 14 215 L 206 215 L 206 90 C 200 50 180 40 180 10 Z', class: 'eh-skin' }));
  svg.appendChild(sv('path', { d: 'M110 20 L110 110', class: 'eh-sternum' }));
  for (let i = 0; i < 6; i++) { const z = 7 - i * 2.5; svg.appendChild(sv('path', { d: 'M' + X(-0.9) + ' ' + Z(z) + ' C ' + X(-6) + ' ' + (Z(z) + 6) + ' ' + X(-10) + ' ' + (Z(z) + 14) + ' ' + X(-13) + ' ' + (Z(z) + 22), class: 'eh-rib' })); svg.appendChild(sv('path', { d: 'M' + X(0.9) + ' ' + Z(z) + ' C ' + X(6) + ' ' + (Z(z) + 6) + ' ' + X(10) + ' ' + (Z(z) + 14) + ' ' + X(13) + ' ' + (Z(z) + 22), class: 'eh-rib' })); }
  svg.appendChild(sv('circle', { cx: X(-8.5), cy: Z(-3.5), r: 3, class: 'eh-nipple' })); svg.appendChild(sv('circle', { cx: X(8.5), cy: Z(-3.5), r: 3, class: 'eh-nipple' }));
  svg.appendChild(sv('path', { d: 'M' + X(-0.8) + ' ' + Z(-7.5) + ' L' + X(0) + ' ' + Z(-9.5) + ' L' + X(0.8) + ' ' + Z(-7.5), class: 'eh-sternum' }));   // xiphoid
  // the heart's silhouette for orientation
  svg.appendChild(sv('path', { d: 'M' + X(-2) + ' ' + Z(3) + ' C ' + X(-5) + ' ' + Z(0) + ' ' + X(-3) + ' ' + Z(-6) + ' ' + X(2) + ' ' + Z(-6) + ' C ' + X(6) + ' ' + Z(-7) + ' ' + X(10) + ' ' + Z(-5) + ' ' + X(9) + ' ' + Z(-2) + ' C ' + X(8) + ' ' + Z(1) + ' ' + X(3) + ' ' + Z(4) + ' ' + X(-2) + ' ' + Z(3) + ' Z', class: 'eh-heart' }));
  // windows
  Object.keys(EH.WINDOWS).forEach(k => { const w = EH.WINDOWS[k]; svg.appendChild(sv('circle', { cx: X(w.pos[0]), cy: Z(w.pos[2]), r: 4, class: 'eh-win' + (k === params.win ? ' on' : ''), 'data-eh-winmark': k })); svg.appendChild(svt(X(w.pos[0]) + (k === 'ssn' ? 8 : 7), Z(w.pos[2]) + (k === 'subcostal' ? 12 : 4), w.title, { class: 'eh-winlbl' })); });
  // the probe and its marker
  const w = EH.WINDOWS[params.win] || EH.WINDOWS.psl, px = w.pos[0] + (params.dx || 0), pz = w.pos[2] + (params.dz || 0);
  const ang = (params.rot || 0) * Math.PI / 180;
  const g = sv('g', { transform: 'translate(' + X(px) + ' ' + Z(pz) + ') rotate(' + (-(params.rot || 0)) + ')', 'data-eh-probe': '1' });
  g.appendChild(sv('rect', { x: -14, y: -6, width: 28, height: 12, rx: 4, class: 'eh-probe' }));
  g.appendChild(sv('circle', { cx: 11, cy: 0, r: 2.5, class: 'eh-marker' }));
  svg.appendChild(g);
  svg.appendChild(sv('path', { d: 'M' + X(px) + ' ' + Z(pz) + ' L' + (X(px) + 24 * Math.cos(ang)) + ' ' + (Z(pz) - 24 * Math.sin(ang)), class: 'eh-markerline' }));
  svt(X(px) + 28 * Math.cos(ang), Z(pz) - 28 * Math.sin(ang), '', {});
  svg.appendChild(svt(16, 226, 'Patient’s right', { class: 'eh-winlbl' })); svg.appendChild(svt(160, 226, 'Patient’s left', { class: 'eh-winlbl' }));
  if (opts.caption) svg.appendChild(svt(110, 14, opts.caption, { class: 'eh-cap', 'text-anchor': 'middle' }));
  return svg;
}

/* ---- the atlas ---- */
function ehOwnKey(id) { return 'pcd.echo.own.' + id; }
function ehOwnGet(id) { try { return localStorage.getItem(ehOwnKey(id)); } catch (e) { return null; } }
function ehOwnSet(id, v) { try { if (v) localStorage.setItem(ehOwnKey(id), v); else localStorage.removeItem(ehOwnKey(id)); } catch (e) {} }
function ehOwnSlot(view) {
  const cur = ehOwnGet(view.id);
  const id = uid('eh');
  const holder = h('div', { class: 'eh-own', 'data-eh-own': view.id }, []);
  if (cur) holder.appendChild(h('img', { src: cur, alt: 'Your image for ' + view.title, class: 'eh-ownimg' }));
  const input = h('input', { type: 'file', id: id, accept: 'image/*', class: 'eh-file', 'data-eh-file': view.id, onchange: (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); const s = Math.min(1, 640 / Math.max(im.width, im.height)); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ehOwnSet(view.id, c.toDataURL('image/jpeg', 0.82)); render(); }; im.src = rd.result; }; rd.readAsDataURL(f);
  } });
  holder.appendChild(h('div', { class: 'eh-ownctl' }, [h('label', { class: 'btn sm', for: id, text: cur ? 'Replace your image' : 'Add your own image' }), input, cur ? h('button', { type: 'button', class: 'lnk', 'data-eh-clear': view.id, text: 'Remove', onclick: () => { ehOwnSet(view.id, null); render(); } }) : h('span', { class: 'fine', text: 'A de-identified still from your own scans; kept on this device only.' })]));
  return holder;
}
function echoAtlasFig() {
  const m = EH.build('normal');
  const cards = EH.VIEWS.map((v, i) => {
    const cv = h('canvas', { class: 'eh-canvas eh-atlascv', width: 320, height: 260, 'aria-label': v.title + ', rendered from the model with labels' });
    const p = Object.assign(EH.viewParams(v.id), { model: m });
    requestAnimationFrame(() => { if (!cv.isConnected) return; const res = EH.render(p, EH_W, EH_H, 0.72, {}); ehPaint(cv, res, EH_W, EH_H, { labels: true }); ehSectorChrome(cv, p.depth, ''); });
    const list = (t, items) => h('div', { class: 'eh-sec' }, [h('h5', { text: t }), h('ul', { class: 'edu-ul' }, items.map(x => h('li', { text: x })))]);
    return h('article', { class: 'eh-card', 'data-eh-view': v.id }, [
      h('h4', { class: 'eh-title', text: (i + 1) + '. ' + v.title }),
      h('div', { class: 'eh-card-grid' }, [
        h('div', { class: 'eh-card-torso' }, [ehTorso(EH.viewParams(v.id), { caption: EH.WINDOWS[v.win].title + ' window' }), h('p', { class: 'fine', text: 'Marker ' + v.rot + '°' + (v.tilt ? ', tilt ' + v.tilt + '°' : '') + (v.rock ? ', rock ' + v.rock + '°' : '') + '; depth ' + v.depth + ' cm' })]),
        h('div', { class: 'eh-card-img' }, [cv, ehOwnSlot(v)]),
        h('div', { class: 'eh-card-text' }, [h('p', { class: 'eh-how' }, [h('b', { text: 'How: ' }), v.how]), list('What is in it', v.see), list('What to measure', v.measure), list('Pitfalls', v.pitfalls),
          h('div', { class: 'ec-labbtns' }, [h('button', { type: 'button', class: 'btn sm', 'data-eh-open': v.id, text: 'Obtain it in the lab →', onclick: () => { EHS.target = v.id; const q = EH.viewParams(v.id); Object.assign(EHS, { win: q.win, rot: q.rot + 35, tilt: q.tilt + 12, rock: q.rock, dx: q.dx, dz: q.dz, depth: q.depth }); setMode('learn', { topic: 'echo_lab' }); } })])])
      ])
    ]);
  });
  return h('figure', { class: 'an-fig eh-fig', 'data-echoatlas': String(EH.VIEWS.length) }, cards.concat([h('figcaption', { text: 'The pictures are the simulator’s: the geometry is the point, the speckle is synthetic. The torso shows the probe on the window with the marker direction; the angles are the lab’s. Your own images are stored in this browser only and never leave the device.' })]));
}

/* ---- the lab ---- */
function ehRenderLive(now) {
  const cv = EHS.canvas; if (!cv || !cv.isConnected) return;
  const t = EHS.beating ? ((now - EHS.anim.t0) / 1000 / 0.9) % 1 : 0.72;
  const res = EH.render(ehParams(), EH_W, EH_H, t, {});
  const regs = ehPaint(cv, res, EH_W, EH_H, { labels: EHS.labels }) || EH.regions(res, EH_W, EH_H).filter(r => r.frac > 0.003);
  ehSectorChrome(cv, EHS.depth, (EH.view(EHS.target) || {}).title || '');
  EHS.lastRegs = regs;
  const seen = document.querySelector('[data-eh-seen]');
  if (seen) { const txt = regs.filter(r => r.id !== 4 && r.id !== 5).map(r => r.name).join(' · '); if (seen.textContent !== txt) seen.textContent = txt; }
}
function ehFrame(now) {
  EHS.anim.raf = 0;
  const lab = document.querySelector('[data-echolab]'); if (!lab || !lab.isConnected) return;
  ehRenderLive(now);
  if (EHS.beating) EHS.anim.raf = requestAnimationFrame((n) => { setTimeout(() => ehFrame(n + 90), 90); });
}
function ehKick() { if (!EHS.anim.raf) { EHS.anim.t0 = performance.now(); EHS.anim.raf = requestAnimationFrame(ehFrame); } }
function ehScoreEl() {
  const sc = EH.score(ehParams(), EHS.target), v = EH.view(EHS.target);
  const el = h('div', { class: 'eh-score' + (sc.obtained ? ' got' : ''), 'data-eh-score': String(sc.score), 'data-eh-got': String(sc.obtained) }, [
    h('div', { class: 'eh-score-head' }, [h('span', { class: 'lbl', text: 'Target: ' + v.title }), h('b', { text: sc.obtained ? 'Obtained ✓' : sc.score + ' / 100' })]),
    h('div', { class: 'eh-bar' }, [h('div', { class: 'eh-bar-fill', style: 'width:' + sc.score + '%' })]),
    sc.obtained ? h('p', { class: 'fine', text: 'That is the view. ' + v.see[0] + ' — now toggle the labels off and name the structures, or pick the next target.' }) : h('ul', { class: 'eh-hints' }, (sc.hints.length ? sc.hints : ['Fine adjustments: small tilts and rotations']).slice(0, 3).map(x => h('li', { 'data-eh-hint': '1', text: x })))
  ]);
  return el;
}
function ehRefresh() {
  const lab = document.querySelector('[data-echolab]'); if (!lab) return;
  const tor = lab.querySelector('[data-eh-torsoslot]'); if (tor) { tor.textContent = ''; tor.appendChild(ehTorso(ehParams())); }
  const scs = lab.querySelector('[data-eh-scoreslot]'); if (scs) { scs.textContent = ''; scs.appendChild(ehScoreEl()); }
  if (!EHS.beating) ehRenderLive(performance.now());
}
function ehSlider(key, label, min, max, step, unit, title) {
  const id = uid('eh');
  const val = h('span', { class: 'odc-val', text: EHS[key] + (unit || '') });
  return h('label', { class: 'odc-sl', for: id, title: title || null, 'data-eh-row': key }, [h('span', { class: 'nod-l', text: label }), h('input', { type: 'range', id: id, min: min, max: max, step: step, value: EHS[key], 'data-eh': key, oninput: (e) => { EHS[key] = +e.target.value; val.textContent = EHS[key] + (unit || ''); ehRefresh(); } }), val]);
}
function echoLabFig() {
  const cv = h('canvas', { class: 'eh-canvas', width: 512, height: 416, 'aria-label': 'The ultrasound sector' });
  EHS.canvas = cv;
  const winSeg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Window' }, Object.keys(EH.WINDOWS).map(k => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-eh-win': k, 'aria-checked': String(EHS.win === k), text: EH.WINDOWS[k].title, onclick: () => { EHS.win = k; EHS.dx = 0; EHS.dz = 0; EHS.rot = k === 'ssn' ? 90 : (k === 'psl' ? 135 : 0); EHS.tilt = 0; EHS.rock = 0; EHS.depth = k === 'subcostal' ? 20 : (k === 'ssn' ? 12 : 16); render(); } })));
  const tId = uid('eh'), pId = uid('eh');
  const targetSel = h('label', { class: 'nod-f', for: tId }, [h('span', { class: 'nod-l', text: 'Target view' }), h('select', { id: tId, 'data-eh-target': '1', onchange: (e) => { EHS.target = e.target.value; render(); } }, EH.VIEWS.map(v => h('option', { value: v.id, selected: v.id === EHS.target, text: v.title })))]);
  const pathSel = h('label', { class: 'nod-f', for: pId }, [h('span', { class: 'nod-l', text: 'The heart' }), h('select', { id: pId, 'data-eh-path': '1', onchange: (e) => { EHS.path = e.target.value; EHS.model = null; render(); } }, EH.PATHOLOGY.map(x => h('option', { value: x.id, selected: x.id === EHS.path, text: x.title })))]);
  const pathNote = h('p', { class: 'fine', 'data-eh-pathnote': '1', text: (EH.PATHOLOGY.filter(x => x.id === EHS.path)[0] || {}).note || '' });
  const lblId = uid('eh'), beatId = uid('eh');
  const toggles = h('div', { class: 'eh-toggles' }, [
    h('label', { class: 'chk-inline', for: lblId }, [h('input', { type: 'checkbox', id: lblId, checked: EHS.labels, 'data-eh-labels': '1', onchange: (e) => { EHS.labels = e.target.checked; ehRefresh(); if (!EHS.beating) ehRenderLive(performance.now()); } }), 'Labels']),
    h('label', { class: 'chk-inline', for: beatId }, [h('input', { type: 'checkbox', id: beatId, checked: EHS.beating, 'data-eh-beat': '1', onchange: (e) => { EHS.beating = e.target.checked; if (EHS.beating) ehKick(); else ehRenderLive(performance.now()); } }), 'Beating'])
  ]);
  const btns = h('div', { class: 'ec-labbtns' }, [
    h('button', { type: 'button', class: 'btn sm', 'data-eh-snap': '1', text: 'Show me the target', onclick: () => { const q = EH.viewParams(EHS.target); Object.assign(EHS, { win: q.win, rot: q.rot, tilt: q.tilt, rock: q.rock, dx: q.dx, dz: q.dz, depth: q.depth }); render(); } }),
    h('button', { type: 'button', class: 'btn sm', 'data-eh-scramble': '1', text: 'Scramble the probe', onclick: () => { const q = EH.viewParams(EHS.target); const r = (a) => (Math.random() * 2 - 1) * a; Object.assign(EHS, { win: q.win, rot: Math.round(q.rot + r(50)), tilt: Math.round(q.tilt + r(25)), rock: Math.round(q.rock + r(20)), dx: Math.round((q.dx + r(1.5)) * 2) / 2, dz: Math.round((q.dz + r(1.5)) * 2) / 2, depth: q.depth }); render(); } }),
    h('button', { type: 'button', class: 'lnk', 'data-eh-reset': '1', text: 'Reset', onclick: () => { Object.assign(EHS, { win: 'psl', rot: 135, tilt: 0, rock: -10, dx: -0.5, dz: 1, depth: 16, path: 'normal', model: null, target: 'plax' }); render(); } })
  ]);
  const controls = h('div', { class: 'ec-controls eh-controls' }, [
    h('h5', { text: 'Window' }), winSeg, h('p', { class: 'fine', text: EH.WINDOWS[EHS.win].note }),
    h('h5', { text: 'The probe' }), h('div', { class: 'odc-ctrls' }, [
      ehSlider('rot', 'Rotate (marker direction)', -180, 180, 5, '°', '0° = marker to the patient’s left, 90° = toward the head, 135° = the right shoulder'),
      ehSlider('tilt', 'Tilt (fan across the heart)', -45, 45, 1, '°', 'Angle the beam across the plane without moving the footprint'),
      ehSlider('rock', 'Rock (angle within the plane)', -40, 40, 5, '°', 'Angle the beam within the plane: moves the picture sideways'),
      ehSlider('dx', 'Slide left ↔ right', -3, 3, 0.5, ' cm', 'Positive = toward the patient’s left'),
      ehSlider('dz', 'Slide up ↔ down', -4, 4, 0.5, ' cm', 'Positive = toward the head'),
      ehSlider('depth', 'Depth', 10, 24, 1, ' cm', '')]),
    h('h5', { text: 'The task' }), targetSel, btns,
    h('h5', { text: 'The patient' }), pathSel, pathNote, toggles
  ]);
  const fig = h('figure', { class: 'an-fig ec-fig ec-lab eh-lab', 'data-echolab': '1' }, [
    h('div', { class: 'ec-lab-grid eh-grid' }, [
      controls,
      h('div', { class: 'eh-centre' }, [h('div', { class: 'vent-screen eh-screen' }, [h('div', { class: 'vsc-head' }, [h('span', { class: 'vsc-mode', text: EH.WINDOWS[EHS.win].title + ' · ' + (EH.PATHOLOGY.filter(x => x.id === EHS.path)[0] || {}).title }), h('span', { class: 'vsc-brand', text: 'Cardiac preset · marker on the right' })]), cv]),
        h('p', { class: 'fine' }, [h('b', { text: 'On the screen: ' }), h('span', { 'data-eh-seen': '1', text: '' })])]),
      h('div', { class: 'ec-right eh-right' }, [h('div', { 'data-eh-scoreslot': '1' }, [ehScoreEl()]), h('div', { class: 'eh-torsoslot', 'data-eh-torsoslot': '1' }, [ehTorso(ehParams())]),
        h('div', { class: 'eh-legend' }, [h('h5', { text: 'Colours of the labels' }), h('div', { class: 'eh-leg' }, [[12, 'LV'], [13, 'RV'], [14, 'LA'], [15, 'RA'], [16, 'Aorta'], [17, 'Pulmonary artery'], [18, 'IVC'], [19, 'Descending aorta'], [6, 'Effusion']].map(x => h('span', { class: 'eh-legi' }, [h('i', { style: 'background:' + EH_COL[x[0]] }), x[1]])))])])
    ]),
    h('figcaption', { text: 'A model of the heart in the chest and a probe you move: the sector is painted from the plane the probe makes, with speckle, depth attenuation and the cardiac cycle. Score and hints compare your probe with the target view’s. Labels name every structure in the plane; turn them off to test yourself.' })
  ]);
  EHS.anim.t0 = performance.now();
  requestAnimationFrame(() => { ehRenderLive(performance.now()); if (EHS.beating) ehKick(); });
  return fig;
}

/* ---- the quiz ---- */
function ehNewRound() {
  const v = EH.VIEWS[Math.floor(Math.random() * EH.VIEWS.length)];
  const pathPool = ['normal', 'normal', 'dcm', 'rv', 'eff', 'hypo', 'lvh'];
  const path = pathPool[Math.floor(Math.random() * pathPool.length)];
  const r = (a) => (Math.random() * 2 - 1) * a;
  const p = Object.assign(EH.viewParams(v.id), { rot: EH.viewParams(v.id).rot + r(8), tilt: EH.viewParams(v.id).tilt + r(5), model: EH.build(path) });
  const res = EH.render(p, EH_W, EH_H, 0.7, {});
  const regs = EH.regions(res, EH_W, EH_H).filter(x => x.frac > 0.012 && [12, 13, 14, 15, 16, 17, 18, 19].indexOf(x.id) >= 0);
  const target = regs.length ? regs[Math.floor(Math.random() * regs.length)] : null;
  const others = EH.VIEWS.filter(x => x.id !== v.id).sort(() => Math.random() - 0.5).slice(0, 3);
  const q1 = [v].concat(others).sort(() => Math.random() - 0.5).map(x => [x.id, x.title]);
  const names = Object.keys(EH.NAMES).filter(k => [12, 13, 14, 15, 16, 17, 18, 19].indexOf(+k) >= 0).map(k => [+k, EH.NAMES[k]]);
  const q2 = target ? [[target.id, EH.NAMES[target.id]]].concat(names.filter(x => x[0] !== target.id).sort(() => Math.random() - 0.5).slice(0, 3)).sort(() => Math.random() - 0.5) : null;
  const pths = EH.PATHOLOGY.filter(x => ['normal', 'dcm', 'rv', 'eff', 'hypo', 'lvh'].indexOf(x.id) >= 0);
  const q3 = [pths.filter(x => x.id === path)[0]].concat(pths.filter(x => x.id !== path).sort(() => Math.random() - 0.5).slice(0, 3)).sort(() => Math.random() - 0.5).map(x => [x.id, x.title]);
  EHQ.round = { view: v, path: path, p: p, res: res, target: target, q1: q1, q2: q2, q3: q3 };
  EHQ.step = 0; EHQ.picks = [];
}
function echoQuizFig() {
  if (!EHQ.round) ehNewRound();
  const R = EHQ.round;
  const cv = h('canvas', { class: 'eh-canvas', width: 512, height: 416, 'aria-label': 'An unlabelled ultrasound picture' });
  requestAnimationFrame(() => { if (!cv.isConnected) return; ehPaint(cv, R.res, EH_W, EH_H, { labels: EHQ.step >= 3, outline: EHQ.step === 1 && R.target ? R.target.id : null }); ehSectorChrome(cv, R.p.depth, ''); });
  const qs = [['Which view is this?', R.q1, R.view.id, (id) => EH.view(id).title], ['Which structure is outlined?', R.q2, R.target ? R.target.id : null, (id) => EH.NAMES[id]], ['What is this heart?', R.q3, R.path, (id) => (EH.PATHOLOGY.filter(x => x.id === id)[0] || {}).title]];
  const steps = [];
  for (let i = 0; i < 3; i++) {
    const q = qs[i]; if (!q[1]) continue;
    const pick = EHQ.picks[i];
    if (i > EHQ.step) break;
    steps.push(h('div', { class: 'eh-q' + (pick !== undefined ? ' done' : ''), 'data-eh-q': String(i) }, [h('p', { class: 'ec-q', text: (i + 1) + ' · ' + q[0] }),
      h('div', { class: 'ec-options eh-opts' }, q[1].map(op => h('button', { type: 'button', class: 'ec-opt' + (pick !== undefined ? (op[0] === pick ? (pick === q[2] ? ' chosen best' : ' chosen wrong') : (op[0] === q[2] ? ' isbest' : ' dim')) : ''), 'data-eh-opt': String(op[0]), disabled: pick !== undefined, onclick: () => { EHQ.picks[i] = op[0]; EHQ.n++; if (op[0] === q[2]) EHQ.score++; EHQ.step = i + 1; while (EHQ.step < 3 && !qs[EHQ.step][1]) EHQ.step++; render(); } }, [h('span', { class: 'ec-opt-t', text: op[1] })]))),
      pick !== undefined ? h('div', { class: 'vs-verdict ' + (pick === q[2] ? 'best' : 'wrong'), 'data-eh-verdict': pick === q[2] ? 'right' : 'wrong' }, [h('b', { text: pick === q[2] ? 'Right. ' : 'No — ' }), q[3](q[2]) + (i === 0 ? '. ' + R.view.how : i === 2 ? '. ' + ((EH.PATHOLOGY.filter(x => x.id === R.path)[0] || {}).note || '') : '.')]) : null]));
  }
  const done = EHQ.step >= 3;
  return h('figure', { class: 'an-fig eh-fig', 'data-echoquiz': '1' }, [
    h('p', { class: 'ec-score', 'data-eh-qscore': EHQ.score + '/' + EHQ.n, text: EHQ.n ? EHQ.score + ' of ' + EHQ.n + ' right' : 'A new picture each round' }),
    h('div', { class: 'eh-quiz-grid' }, [h('div', { class: 'vent-screen eh-screen' }, [h('div', { class: 'vsc-head' }, [h('span', { class: 'vsc-mode', text: done ? R.view.title + ' · ' + (EH.PATHOLOGY.filter(x => x.id === R.path)[0] || {}).title : 'Unknown view' }), h('span', { class: 'vsc-brand', text: 'Cardiac preset' })]), cv]),
      h('div', { class: 'eh-qs' }, steps.concat([done ? h('div', { class: 'ec-labbtns' }, [h('button', { type: 'button', class: 'btn sm', 'data-eh-next': '1', text: 'Next picture →', onclick: () => { ehNewRound(); render(); } })]) : null]))]),
    h('figcaption', { text: 'Views are drawn slightly off-axis at random, as they are at the bedside; the outlined structure is one of the chambers or vessels; the heart may be normal or one of the lab’s pathologies.' })
  ]);
}
function echoWidget(kind) {
  if (kind === 'echoatlas') return echoAtlasFig();
  if (kind === 'echolab') return echoLabFig();
  if (kind === 'echoquiz') return echoQuizFig();
  return null;
}
