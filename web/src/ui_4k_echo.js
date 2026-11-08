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
/* v8.3: a still or a clip (GIF, MP4, WebM) per view, with its credit — kept in IndexedDB (the logbook's store) with the old
   localStorage still as a fallback; so a clip saved from The POCUS Atlas can sit under the view it shows */
const EH_OWN_MAX = 14 * 1024 * 1024;
function ehOwnRec(view, cb) {
  const legacy = ehOwnGet(view.id);
  if (typeof elImgGet !== 'function') return cb(legacy ? { data: legacy, kind: 'image' } : null);
  elImgGet('atlas:' + view.id, rec => cb(rec || (legacy ? { data: legacy, kind: 'image' } : null)));
}
function ehOwnStore(view, rec) {
  if (typeof elImgPut === 'function') { const full = Object.assign({ id: 'atlas:' + view.id }, rec); try { ELS.imgs[full.id] = full; } catch (e) { /* the logbook's cache is optional */ } elImgPut(full, () => { ehOwnSet(view.id, null); render(); }); }
  else { ehOwnSet(view.id, rec.kind === 'image' ? rec.data : null); render(); }
}
function ehOwnSlot(view) {
  const holder = h('div', { class: 'eh-own', 'data-eh-own': view.id }, []);
  const show = (cur) => {
    holder.textContent = '';
    const id = uid('eh');
    if (cur) {
      if (cur.kind === 'video') { const vd = h('video', { src: cur.data, class: 'eh-ownimg eh-ownclip', autoplay: true, loop: true, muted: true, playsinline: true, controls: true, 'aria-label': 'Your clip for ' + view.title }); vd.muted = true; holder.appendChild(vd); }
      else holder.appendChild(h('img', { src: cur.data, alt: 'Your image for ' + view.title, class: 'eh-ownimg' }));
      const cid = uid('ehc');
      holder.appendChild(h('label', { class: 'nod-f eh-credit', for: cid }, [h('span', { class: 'nod-l', text: 'Credit / source' }), h('input', { type: 'text', id: cid, value: cur.credit || '', placeholder: 'e.g. The POCUS Atlas (CC BY-NC 4.0)', 'data-eh-credit': view.id, onchange: (e) => { ehOwnStore(view, Object.assign({}, cur, { credit: e.target.value.trim() })); } })]));
      if (cur.credit) holder.appendChild(h('p', { class: 'fine eh-creditline', 'data-eh-creditline': view.id, text: cur.credit }));
    }
    const input = h('input', { type: 'file', id: id, accept: 'image/*,video/mp4,video/webm,.gif', class: 'eh-file', 'data-eh-file': view.id, onchange: (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      if (f.size > EH_OWN_MAX) { toast('That file is ' + (f.size / 1048576).toFixed(0) + ' MB; keep clips under 14 MB'); return; }
      const isVideo = /^video\//.test(f.type), isGif = /gif$/i.test(f.type) || /\.gif$/i.test(f.name);
      const rd = new FileReader();
      rd.onload = () => {
        if (isVideo || isGif) { ehOwnStore(view, { data: rd.result, kind: isVideo ? 'video' : 'image', name: f.name, credit: cur ? cur.credit || '' : '' }); return; }
        const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); const s = Math.min(1, 900 / Math.max(im.width, im.height)); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ehOwnStore(view, { data: c.toDataURL('image/jpeg', 0.85), kind: 'image', name: f.name, credit: cur ? cur.credit || '' : '' }); }; im.src = rd.result;
      };
      rd.readAsDataURL(f);
    } });
    holder.appendChild(h('div', { class: 'eh-ownctl' }, [h('label', { class: 'btn sm', for: id, text: cur ? 'Replace it' : 'Add your own image or clip' }), input,
      cur ? h('button', { type: 'button', class: 'lnk', 'data-eh-clear': view.id, text: 'Remove', onclick: () => { ehOwnSet(view.id, null); if (typeof elImgDel === 'function') elImgDel('atlas:' + view.id); render(); } }) : h('span', { class: 'fine', text: 'A de-identified still or clip (JPEG, PNG, GIF, MP4, WebM) from your own scans or an open library; kept on this device only.' }),
      h('a', { class: 'lnk fine', href: 'https://www.thepocusatlas.com/echocardiography-2', target: '_blank', rel: 'noopener noreferrer', 'data-eh-atlaslink': view.id, text: 'Real clips: The POCUS Atlas ↗' })]));
  };
  show(null);
  ehOwnRec(view, rec => { if (rec) show(rec); });
  return holder;
}
/* v8.3: the atlas's 3-D heart — a sticky panel whose plane follows the card you are reading */
function ehAtlasShow(id, animate) {
  const A = EHS.atlas3d; if (!A || !A.inst || !A.inst.alive) return;
  const v = EH.view(id); if (!v || A.current === id) return;
  A.current = id;
  const i = EH.VIEWS.indexOf(v);
  h3SetProbe(A.inst, Object.assign(EH.viewParams(id), { model: A.model, title: (i + 1) + '. ' + v.title }), animate, true);
  const box = document.querySelector('[data-h3-atlas]'); if (box) box.setAttribute('data-h3-current', id);
  document.querySelectorAll('.eh-card').forEach(c => c.classList.toggle('h3-on', c.getAttribute('data-eh-view') === id));
}
function ehAtlasWatch(fig) {
  if (typeof IntersectionObserver === 'undefined') return;
  const io = new IntersectionObserver((entries) => {
    let best = null;
    entries.forEach(e => { if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) best = e; });
    if (best) ehAtlasShow(best.target.getAttribute('data-eh-view'), true);
  }, { rootMargin: '-38% 0px -42% 0px', threshold: [0, 0.1, 0.25, 0.5] });
  fig.querySelectorAll('.eh-card').forEach(c => io.observe(c));
  EHS.atlas3d.io = io;
}
function echoAtlasFig() {
  const m = EH.build('normal');
  const panel = heart3dPanel({ ownImage: true, model: 'normal', maxH: 330, settings: { spin: false } });
  EHS.atlas3d = { inst: panel.inst || null, model: m, current: null, io: null };
  const sticky = h('div', { class: 'h3-sticky', 'data-h3-atlas': '1' }, [panel, h('p', { class: 'fine h3-caption', text: 'The model heart with the probe and the scan plane of the view you are reading; the picture on the plane is the one in the card. Scroll, or press “Show in 3-D” on a card.' })]);
  const cards = EH.VIEWS.map((v, i) => {
    const cv = h('canvas', { class: 'eh-canvas eh-atlascv', width: 320, height: 260, 'aria-label': v.title + ', rendered from the model with labels' });
    const p = Object.assign(EH.viewParams(v.id), { model: m });
    requestAnimationFrame(() => { if (!cv.isConnected) return; const res = EH.render(p, EH_W, EH_H, 0.72, {}); ehPaint(cv, res, EH_W, EH_H, { labels: true }); ehSectorChrome(cv, p.depth, ''); });
    const list = (t, items) => h('div', { class: 'eh-sec' }, [h('h5', { text: t }), h('ul', { class: 'edu-ul' }, items.map(x => h('li', { text: x })))]);
    return h('article', { class: 'eh-card', 'data-eh-view': v.id }, [
      h('h4', { class: 'eh-title', text: (i + 1) + '. ' + v.title }),
      h('div', { class: 'eh-card-grid' }, [
        h('div', { class: 'eh-card-torso' }, [ehTorso(EH.viewParams(v.id), { caption: EH.WINDOWS[v.win].title + ' window' }), h('p', { class: 'fine', text: 'Marker ' + v.rot + '°' + (v.tilt ? ', tilt ' + v.tilt + '°' : '') + (v.rock ? ', rock ' + v.rock + '°' : '') + '; depth ' + v.depth + ' cm' })]),
        h('div', { class: 'eh-card-img' }, [cv, ehrAtlasSlot(v), ehOwnSlot(v)]),
        h('div', { class: 'eh-card-text' }, [h('p', { class: 'eh-how' }, [h('b', { text: 'How: ' }), v.how]), list('What is in it', v.see), list('What to measure', v.measure), list('Pitfalls', v.pitfalls),
          h('div', { class: 'ec-labbtns' }, [h('button', { type: 'button', class: 'btn sm', 'data-eh-open': v.id, text: 'Obtain it in the lab →', onclick: () => { EHS.target = v.id; const q = EH.viewParams(v.id); Object.assign(EHS, { win: q.win, rot: q.rot + 35, tilt: q.tilt + 12, rock: q.rock, dx: q.dx, dz: q.dz, depth: q.depth }); setMode('learn', { topic: 'echo_lab' }); } }),
            h('button', { type: 'button', class: 'btn sm quiet', 'data-eh-3d': v.id, text: 'Show in 3-D', onclick: () => { ehAtlasShow(v.id, true); const box = document.querySelector('[data-h3-atlas]'); if (box && box.scrollIntoView) box.scrollIntoView({ block: 'start', behavior: 'smooth' }); } })])])
      ])
    ]);
  });
  const fig = h('figure', { class: 'an-fig eh-fig', 'data-echoatlas': String(EH.VIEWS.length) }, [sticky].concat(cards, [h('figcaption', { text: 'The pictures are the simulator’s: the geometry is the point, the speckle is synthetic. The torso shows the probe on the window with the marker direction; the angles are the lab’s. Your own images are stored in this browser only and never leave the device.' })]));
  requestAnimationFrame(() => { if (!fig.isConnected) return; ehAtlasShow(EH.VIEWS[0].id, false); ehAtlasWatch(fig); });
  return fig;
}

/* ---- the lab ---- */
function ehRenderLive(now) {
  const cv = EHS.canvas; if (!cv || !cv.isConnected) return;
  const t = EHS.beating ? ((now - EHS.anim.t0) / 1000 / 0.9) % 1 : 0.72;
  const res = EH.render(ehParams(), EH_W, EH_H, t, {});
  const i3 = EHS.inst3d; if (i3 && i3.alive && i3.cv.isConnected) { h3SetImage(i3, res.img, EH_W, EH_H, res.sector.inside); i3.extT = t; }
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
  if (EHS.inst3d && EHS.inst3d.alive) h3SetProbe(EHS.inst3d, Object.assign(ehParams(), { title: (EH.view(EHS.target) || {}).title || '' }), false);
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
  const panel3d = heart3dPanel({ ownImage: false, model: EHS.path, maxH: 360 });
  EHS.inst3d = panel3d.inst || null;
  if (EHS.inst3d) h3SetProbe(EHS.inst3d, Object.assign(ehParams(), { title: (EH.view(EHS.target) || {}).title || '' }), false, true);
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
        h('p', { class: 'fine' }, [h('b', { text: 'On the screen: ' }), h('span', { 'data-eh-seen': '1', text: '' })]),
        h('div', { class: 'eh-3dslot', 'data-eh-3d': '1' }, [h('h5', { text: 'The plane in the chest' }), panel3d, h('p', { class: 'fine', text: 'The same heart, the probe where you put it, and the plane the beam makes — cut open along the plane so the cross-section is the picture above.' })])]),
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

/* ===== v8.2: the real volume — a 3-D apical acquisition resliced in the browser ===== */
const EHR = { vol: null, loading: false, cbs: [], W: 300, H: 360, C: 260, half: 80, depth: 160, loops: [], sharpen: true };
const EHR_MAP = { a4c: 'a4c', a5c: 'a5c', a2c: 'a2c', a3c: 'a3c', psax_mv: 'sax_mv', psax_pm: 'sax_pm' };
function ehrData() { return typeof PFT_ECHOREAL !== 'undefined' ? PFT_ECHOREAL : window.PFT_ECHOREAL; }
function ehrView(id) { const d = ehrData(); return d ? d.views.filter(v => v.id === id)[0] : null; }
/* decode the mosaics into one Uint8Array per phase (x fastest, then y, then z) */
function ehrLoad(cb) {
  const d = ehrData(); if (!d) return;
  if (EHR.vol) { if (cb) cb(); return; }
  if (cb) EHR.cbs.push(cb);
  if (EHR.loading) return; EHR.loading = true;
  const X = d.dims[0], Y = d.dims[1], Z = d.dims[2], vols = [];
  let n = 0;
  d.frames.forEach((src, k) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const px = x.getImageData(0, 0, im.width, im.height).data, v = new Uint8Array(X * Y * Z);
      for (let z = 0; z < Z; z++) { const tx = (z % d.cols) * X, ty = Math.floor(z / d.cols) * Y; for (let y = 0; y < Y; y++) { const row = ((ty + y) * im.width + tx) * 4, o = (z * Y + y) * X; for (let i = 0; i < X; i++) v[o + i] = px[row + i * 4]; } }
      vols[k] = v; n++;
      if (n === d.frames.length) { EHR.vol = vols; EHR.loading = false; const cbs = EHR.cbs; EHR.cbs = []; cbs.forEach(f => f()); }
    };
    im.src = src;
  });
}
/* one plane of the volume at a fractional phase: a rectangular (lateral, depth) grid masked to the pyramid; or a C-plane (x, y) at depth c */
function ehrPlane(p, phaseF, W, H) {
  const d = ehrData(), vols = EHR.vol, out = new Uint8ClampedArray(W * H), mask = new Uint8Array(W * H); out.mask = mask; if (!d || !vols) return out;
  const X = d.dims[0], Y = d.dims[1], Z = d.dims[2], sx = d.sp[0], sy = d.sp[1], sz = d.sp[2], ax = d.apex[0], ay = d.apex[1], az = d.apex[2];
  const nP = vols.length, f0 = Math.floor(phaseF) % nP, f1 = (f0 + 1) % nP, w1 = phaseF - Math.floor(phaseF), w0 = 1 - w1, v0 = vols[f0], v1 = vols[f1];
  const tanA = Math.tan((d.halfAngle || 36) * Math.PI / 180);
  const samp = (vx, vy, vz) => {
    if (vx < 0 || vy < 0 || vz < 0 || vx >= X - 1 || vy >= Y - 1 || vz >= Z - 1) return 0;
    const x0 = vx | 0, y0 = vy | 0, z0 = vz | 0, fx = vx - x0, fy = vy - y0, fz = vz - z0;
    const i000 = (z0 * Y + y0) * X + x0, i100 = i000 + 1, i010 = i000 + X, i110 = i010 + 1, i001 = i000 + X * Y, i101 = i001 + 1, i011 = i001 + X, i111 = i011 + 1;
    const tri = (v) => ((v[i000] * (1 - fx) + v[i100] * fx) * (1 - fy) + (v[i010] * (1 - fx) + v[i110] * fx) * fy) * (1 - fz) + ((v[i001] * (1 - fx) + v[i101] * fx) * (1 - fy) + (v[i011] * (1 - fx) + v[i111] * fx) * fy) * fz;
    return w1 ? tri(v0) * w0 + tri(v1) * w1 : tri(v0);
  };
  if (p.c !== undefined) {
    const half = p.half || 75;
    for (let j = 0; j < H; j++) { const my = -half + 2 * half * j / (H - 1); for (let i = 0; i < W; i++) { const mx = -half + 2 * half * i / (W - 1); out[j * W + i] = samp((ax + mx) / sx, (ay + my) / sy, (az + p.c) / sz); mask[j * W + i] = 1; } }
    return out;
  }
  const phi = (p.phi || 0) * Math.PI / 180, tau = (p.tau || 0) * Math.PI / 180, depth = p.depth || EHR.depth, half = p.half || EHR.half;
  const ux = Math.cos(phi), uy = Math.sin(phi), wx = -Math.sin(phi) * Math.sin(tau), wy = Math.cos(phi) * Math.sin(tau), wz = Math.cos(tau);
  for (let j = 0; j < H; j++) {
    const dd = depth * j / (H - 1), lim = dd * tanA + 1;
    for (let i = 0; i < W; i++) {
      const l = -half + 2 * half * i / (W - 1); if (Math.abs(l) > lim) { out[j * W + i] = 0; continue; }
      out[j * W + i] = samp((ax + l * ux + dd * wx) / sx, (ay + l * uy + dd * wy) / sy, (az + dd * wz) / sz); mask[j * W + i] = 1;
    }
  }
  return out;
}
/* v8.3: the display processing a scanner does after the beamformer — an unsharp mask (the interpolated plane is softer
   than the voxels), a noise floor, a little gain and a gentle gamma; applied in place and cached as a 256-entry curve */
function ehrEnhance(gray, W, H, opts) {
  opts = opts || {};
  const amount = opts.amount === undefined ? 1.1 : opts.amount, floor = opts.floor === undefined ? 16 : opts.floor, gain = opts.gain === undefined ? 1.18 : opts.gain, gamma = opts.gamma === undefined ? 0.93 : opts.gamma;
  const key = amount + '/' + floor + '/' + gain + '/' + gamma;
  if (!ehrEnhance.lut || ehrEnhance.key !== key) { const lut = new Uint8ClampedArray(256); for (let v = 0; v < 256; v++) { const a = Math.min(1, Math.max(0, (v - floor) / (255 - floor)) * gain); lut[v] = Math.round(Math.pow(a, gamma) * 255); } ehrEnhance.lut = lut; ehrEnhance.key = key; }
  const lut = ehrEnhance.lut;
  if (amount > 0) {
    // a separable 3-tap blur (1 2 1) is the low-pass; out = x + amount·(x − blur)
    const tmp = ehrEnhance.tmp && ehrEnhance.tmp.length === W * H ? ehrEnhance.tmp : (ehrEnhance.tmp = new Float32Array(W * H));
    for (let j = 0; j < H; j++) { const o = j * W; tmp[o] = gray[o]; tmp[o + W - 1] = gray[o + W - 1]; for (let i = 1; i < W - 1; i++) tmp[o + i] = (gray[o + i - 1] + 2 * gray[o + i] + gray[o + i + 1]) * 0.25; }
    for (let i = 0; i < W; i++) {
      let prev = tmp[i];
      for (let j = 1; j < H - 1; j++) { const idx = j * W + i, cur = tmp[idx], b = (prev + 2 * cur + tmp[idx + W]) * 0.25; prev = cur; const x = gray[idx]; gray[idx] = lut[Math.max(0, Math.min(255, Math.round(x + amount * (x - b))))]; }
      gray[i] = lut[gray[i]]; gray[(H - 1) * W + i] = lut[gray[(H - 1) * W + i]];
    }
  } else for (let i = 0; i < W * H; i++) gray[i] = lut[gray[i]];
  return gray;
}
function ehrPaint(cv, gray, W, H, opts) {
  opts = opts || {};
  if (EHR.sharpen && !opts.raw) ehrEnhance(gray, W, H);
  const ctx = cv.getContext('2d'), off = ehrPaint.off || (ehrPaint.off = document.createElement('canvas'));
  off.width = W; off.height = H; const octx = off.getContext('2d'), data = octx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) { const g = gray[i]; data.data[i * 4] = g; data.data[i * 4 + 1] = g; data.data[i * 4 + 2] = g; data.data[i * 4 + 3] = 255; }
  octx.putImageData(data, 0, 0);
  const dpr = Math.min(2, window.devicePixelRatio || 1), cw = cv.clientWidth || 320, ch = Math.round(cw * H / W);
  if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch); ctx.drawImage(off, 0, 0, cw, ch);
  const sx = cw / W, sy = ch / H;
  if (opts.labels && opts.view && opts.view.labels) {
    ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    opts.view.labels.forEach(L => {
      let x, y;
      if (opts.view.c !== undefined) { const half = opts.view.half || 75; x = (L[1] + half) / (2 * half) * (W - 1) * sx; y = (L[2] + half) / (2 * half) * (H - 1) * sy; }
      else { x = (L[1] + EHR.half) / (2 * EHR.half) * (W - 1) * sx; y = L[2] / EHR.depth * (H - 1) * sy; }
      ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(L[0], x, y); ctx.fillStyle = '#ffe28a'; ctx.fillText(L[0], x, y);
    });
  }
  // the chrome: depth marks for a B-plane, a scale for a C-plane, the title
  ctx.fillStyle = '#8fa7b8'; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  if (opts.view && opts.view.c !== undefined) { const half = opts.view.half || 75; const pxcm = 10 / (2 * half) * (W - 1) * sx; ctx.fillRect(6, ch - 10, pxcm * 2, 2); ctx.fillText('2 cm', 6, ch - 14); ctx.fillText('C-plane at ' + opts.view.c + ' mm', 6, 12); }
  else { for (let dcm = 5; dcm * 10 < EHR.depth; dcm += 5) { const y = dcm * 10 / EHR.depth * (H - 1) * sy; ctx.fillText(dcm + ' cm', 6, y + 3); ctx.fillRect(2, y, 3, 1); } }
  if (opts.title) { ctx.fillStyle = '#f6efd6'; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(opts.title, cw - 6, ch - 6); }
  if (opts.phaseText) { ctx.fillStyle = '#8fa7b8'; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(opts.phaseText, cw - 6, 12); }
}
/* a self-contained real loop: a canvas, play/pause, a frame scrubber; `getView` returns the plane to draw each frame */
function ehrLoop(getView, opts) {
  opts = opts || {};
  const d = ehrData(), W = opts.W || EHR.W, H = opts.H || EHR.H;
  const cv = h('canvas', { class: 'eh-canvas ehr-canvas', width: 320, height: Math.round(320 * H / W), 'aria-label': opts.aria || 'Real echo loop' });
  const st = { playing: opts.playing !== false, t0: performance.now(), frame: 0, timer: 0, labels: opts.labels !== false, alive: true };
  const scrub = h('input', { type: 'range', min: 0, max: 100, step: 1, value: 0, class: 'ehr-scrub', 'aria-label': 'Frame', oninput: (e) => { st.playing = false; play.textContent = '▶'; st.frame = +e.target.value / 100; draw(); } });
  const play = h('button', { type: 'button', class: 'btn sm', 'data-ehr-play': '1', text: st.playing ? '❚❚' : '▶', onclick: () => { st.playing = !st.playing; play.textContent = st.playing ? '❚❚' : '▶'; if (st.playing) { st.t0 = performance.now() - st.frame * d.period * 1000; tick(); } } });
  const labId = uid('ehrl');
  const lab = h('label', { class: 'chk-inline', for: labId }, [h('input', { type: 'checkbox', id: labId, checked: st.labels, 'data-ehr-labels': '1', onchange: (e) => { st.labels = e.target.checked; draw(); } }), 'Labels']);
  const shId = uid('ehrs');
  const sharp = h('label', { class: 'chk-inline', for: shId, title: 'The scanner’s display processing: an unsharp mask, a noise floor and a little gain. Off shows the interpolated plane as it comes out of the volume.' }, [h('input', { type: 'checkbox', id: shId, checked: EHR.sharpen, 'data-ehr-sharp': '1', onchange: (e) => { EHR.sharpen = e.target.checked; draw(); } }), 'Processed']);
  const draw = () => {
    if (!cv.isConnected && st.started) { st.alive = false; return; }
    const view = getView(); if (!view) return;
    if (!EHR.vol) { const ctx = cv.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.fillStyle = '#9aa0a8'; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('loading the real volume…', cv.width / 2, cv.height / 2); return; }
    const phaseF = st.frame * d.phases, Wv = view.c !== undefined ? EHR.C : W, Hv = view.c !== undefined ? EHR.C : H;
    const gray = ehrPlane(view, phaseF, Wv, Hv);
    ehrPaint(cv, gray, Wv, Hv, { labels: st.labels, view: view, title: opts.title === undefined ? (view.name || '') : opts.title, phaseText: Math.round(st.frame * 100) + '% of the cycle' });
    if (opts.onFrame) opts.onFrame(gray, Wv, Hv, view, gray.mask, st.frame);
  };
  const tick = () => {
    if (!st.alive) return;
    if (!cv.isConnected) { if (st.started) { st.alive = false; return; } }
    else st.started = true;
    if (st.playing) { st.frame = ((performance.now() - st.t0) / 1000 / d.period) % 1; scrub.value = String(Math.round(st.frame * 100)); draw(); }
    st.timer = setTimeout(tick, 70);
  };
  ehrLoad(() => draw());
  const wrap = h('div', { class: 'ehr-loop', 'data-ehr-loop': opts.id || '1' }, [cv, h('div', { class: 'ehr-ctl' }, [play, scrub, lab, sharp])]);
  requestAnimationFrame(() => { draw(); tick(); });
  wrap.ehr = { draw: draw, state: st };
  return wrap;
}
/* the atlas card's real picture for a view, if the volume holds it */
function ehrAtlasSlot(view) {
  const rid = EHR_MAP[view.id], d = ehrData();
  if (!d || !rid) return h('p', { class: 'fine ehr-none', 'data-ehr-none': view.id, text: 'No real loop for this view: the real volume is an apical acquisition, and this window is not inside it. Add your own still above.' });
  const rv = ehrView(rid);
  return h('div', { class: 'ehr-slot', 'data-ehr-slot': view.id }, [h('h5', { text: 'The real thing' }), ehrLoop(() => rv, { id: view.id, aria: rv.name + ', a real loop' }), h('p', { class: 'fine', text: rv.note })]);
}
/* the real scanning lab: rotate and tilt a plane through the volume, or a C-plane at a chosen depth, against a target view */
const EHRL = { phi: 25, tau: 0, c: 72, mode: 'b', target: 'a4c', loop: null };
function ehrPhiHint(dphi) { return Math.abs(dphi) <= 10 ? '' : 'Rotate ' + Math.abs(Math.round(dphi)) + '° ' + (dphi > 0 ? 'counter-clockwise' : 'clockwise') + ' (the marker ' + (dphi > 0 ? 'toward the left shoulder' : 'toward the right hip') + ').'; }
function ehrScore() {
  const t = ehrView(EHRL.target); if (!t) return { score: 0, obtained: false, hints: [] };
  if (t.c !== undefined) {
    if (EHRL.mode !== 'c') return { score: 20, obtained: false, hints: ['A short axis is a C-plane across the beam: switch the plane to “across the beam” and set the depth.'] };
    const dc = t.c - EHRL.c, sc = Math.max(0, Math.round(100 - Math.abs(dc) * 2.5));
    return { score: sc, obtained: Math.abs(dc) <= 6, hints: Math.abs(dc) <= 6 ? [] : ['Move the plane ' + Math.abs(dc) + ' mm ' + (dc > 0 ? 'deeper (toward the base)' : 'shallower (toward the apex)') + '.'] };
  }
  if (EHRL.mode !== 'b') return { score: 20, obtained: false, hints: ['A long-axis view is a plane along the beam: switch the plane to “along the beam”, then rotate.'] };
  let dphi = ((t.phi - EHRL.phi) % 180 + 270) % 180 - 90; const dtau = t.tau - EHRL.tau;
  const sc = Math.max(0, Math.round(100 - Math.abs(dphi) * 1.2 - Math.abs(dtau) * 2.5));
  const hints = []; const hp = ehrPhiHint(dphi); if (hp) hints.push(hp);
  if (Math.abs(dtau) > 5) hints.push('Tilt ' + Math.abs(Math.round(dtau)) + '° ' + (dtau < 0 ? 'anteriorly (the tail down, toward the bed)' : 'posteriorly (the tail up)') + '.');
  return { score: sc, obtained: Math.abs(dphi) <= 10 && Math.abs(dtau) <= 5, hints: hints };
}
function ehrLabRefresh() {
  const box = document.querySelector('[data-ehr-score]'); if (!box) return;
  const sc = ehrScore(), t = ehrView(EHRL.target);
  box.textContent = ''; box.className = 'eh-score' + (sc.obtained ? ' got' : ''); box.setAttribute('data-ehr-got', String(sc.obtained)); box.setAttribute('data-ehr-scoreval', String(sc.score));
  box.appendChild(h('div', { class: 'eh-score-n', text: sc.score + ' / 100' }));
  box.appendChild(h('div', { class: 'eh-score-t', text: sc.obtained ? 'Obtained: ' + t.name : 'Target: ' + t.name }));
  if (sc.hints.length) box.appendChild(h('ul', { class: 'eh-hints' }, sc.hints.map(x => h('li', { 'data-ehr-hint': '1', text: x }))));
  const rd = document.querySelector('[data-ehr-readout]'); if (rd) rd.textContent = EHRL.mode === 'b' ? 'Plane along the beam · rotation ' + EHRL.phi + '° · tilt ' + EHRL.tau + '°' : 'Plane across the beam at ' + EHRL.c + ' mm';
  document.querySelectorAll('[data-ehr-mode]').forEach(b => b.setAttribute('aria-checked', String(b.getAttribute('data-ehr-mode') === EHRL.mode)));
  if (EHRL.loop && EHRL.loop.ehr) EHRL.loop.ehr.draw();
  ehrSync3d();
}
function ehrCurrentView() {
  const t = ehrView(EHRL.target);
  if (EHRL.mode === 'c') return { c: EHRL.c, name: '', labels: t && t.c !== undefined && Math.abs(t.c - EHRL.c) <= 6 ? t.labels : null, half: 75 };
  const near = (ehrData().views || []).filter(v => v.c === undefined && Math.abs((((v.phi - EHRL.phi) % 180) + 270) % 180 - 90) <= 10 && Math.abs(v.tau - EHRL.tau) <= 6)[0];
  return { phi: EHRL.phi, tau: EHRL.tau, name: near ? near.name : '', labels: near ? near.labels : null };
}
/* v8.3: the real lab's plane on the model heart. The real volume's rotation φ and the model's marker angle differ (different
   hearts), so φ is mapped through the views both have: A4C 0 → 0, A2C 100 → 60, A3C 135 → 120, 180 → 180; tilt scales by the
   A5C pair. A short axis is a square across the beam at its depth. */
function ehrMapPhi(phi) { const k = [[0, 0], [100, 60], [135, 120], [180, 180]]; for (let i = 1; i < k.length; i++) if (phi <= k[i][0]) return k[i - 1][1] + (phi - k[i - 1][0]) / (k[i][0] - k[i - 1][0]) * (k[i][1] - k[i - 1][1]); return 180; }
function ehrSync3d() {
  const inst = EHRL.inst3d; if (!inst || !inst.alive) return;
  const cur = ehrCurrentView(), V = EH.V, m = EH.build('normal'), aim = inst.lastMode !== EHRL.mode; inst.lastMode = EHRL.mode;
  if (EHRL.mode === 'c') {
    const pr = EH.probe({ win: 'apical', rot: 0, tilt: 0, rock: 0, dx: 0, dz: 0, model: m }), c = EHRL.c / 10, half = 7.5;
    h3SetPlaneSpec(inst, { P: V.add(pr.P, V.mul(pr.d, c)), d: pr.n, l: pr.l, depth: 0, fan: 0, rect: { along: [-half, half], across: [-half, half] }, square: true, title: cur.name || ('Short axis at ' + EHRL.c + ' mm') }, true, aim);
  } else {
    const pr = EH.probe({ win: 'apical', rot: ehrMapPhi(EHRL.phi), tilt: -EHRL.tau * 10 / 12, rock: 0, dx: 0, dz: 0, model: m });
    h3SetPlaneSpec(inst, { P: pr.P, d: pr.d, l: pr.l, depth: 16, fan: 36, rect: { along: [0, 16], across: [-8, 8] }, title: cur.name || ('Rotation ' + EHRL.phi + '°, tilt ' + EHRL.tau + '°') }, true, aim);
  }
}
function echoRealLabFig() {
  const d = ehrData();
  if (!d) return h('figure', { class: 'an-fig', 'data-echoreal': '1' }, [h('p', { class: 'fine', text: 'The real volume did not load in this build.' })]);
  const panel3d = heart3dPanel({ ownImage: false, model: 'normal', maxH: 330, settings: { beating: false } });
  EHRL.inst3d = panel3d.inst || null;
  const loop = ehrLoop(ehrCurrentView, { id: 'lab', title: '', aria: 'The real volume, resliced', onFrame: (gray, W, H, view, mask, frame) => { const i3 = EHRL.inst3d; if (i3 && i3.alive) { h3SetImage(i3, gray, W, H, mask); i3.extT = frame; } } }); EHRL.loop = loop;
  const sl = (key, label, min, max, step, unit) => { const id = uid('ehr'); const val = h('span', { class: 'odc-val', text: EHRL[key] + unit }); return h('label', { class: 'odc-sl', for: id, 'data-ehr-row': key }, [h('span', { class: 'nod-l', text: label }), h('input', { type: 'range', id: id, min: min, max: max, step: step, value: EHRL[key], 'data-ehr': key, oninput: (e) => { EHRL[key] = +e.target.value; val.textContent = EHRL[key] + unit; ehrLabRefresh(); } }), val]); };
  const modes = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Plane' }, [['b', 'Along the beam (long axes)'], ['c', 'Across the beam (short axes)']].map(m => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-ehr-mode': m[0], 'aria-checked': String(EHRL.mode === m[0]), text: m[1], onclick: () => { EHRL.mode = m[0]; ehrLabRefresh(); } })));
  const targets = h('select', { 'data-ehr-target': '1', 'aria-label': 'Target view', onchange: (e) => { EHRL.target = e.target.value; ehrLabRefresh(); } }, d.views.map(v => h('option', { value: v.id, text: v.name, selected: v.id === EHRL.target })));
  const controls = h('div', { class: 'odc-ctrls ehr-ctrls' }, [modes, sl('phi', 'Rotate the marker', 0, 179, 1, '°'), sl('tau', 'Tilt the beam', -20, 20, 1, '°'), sl('c', 'Depth of the short-axis plane', 40, 120, 1, ' mm'),
    h('div', { class: 'ec-labbtns' }, [h('button', { type: 'button', class: 'btn sm', 'data-ehr-scramble': '1', text: 'Scramble', onclick: () => { EHRL.phi = Math.floor(Math.random() * 180); EHRL.tau = Math.round(Math.random() * 24 - 12); EHRL.c = 40 + Math.floor(Math.random() * 80); EHRL.mode = Math.random() < 0.5 ? 'b' : 'c'; const f = document.querySelector('[data-echoreal]'); if (f) f.replaceWith(echoRealLabFig()); } }),
      h('button', { type: 'button', class: 'btn sm quiet', 'data-ehr-snap': '1', text: 'Snap to the target', onclick: () => { const t = ehrView(EHRL.target); if (t.c !== undefined) { EHRL.mode = 'c'; EHRL.c = t.c; } else { EHRL.mode = 'b'; EHRL.phi = t.phi; EHRL.tau = t.tau; } const f = document.querySelector('[data-echoreal]'); if (f) f.replaceWith(echoRealLabFig()); } })])]);
  const score = h('div', { class: 'eh-score', 'data-ehr-score': '1' });
  const fig = h('figure', { class: 'an-fig eh-fig ehr-lab', 'data-echoreal': '1' }, [
    h('div', { class: 'ehr-grid' }, [h('div', { class: 'ehr-left' }, [loop, h('p', { class: 'fine', 'data-ehr-readout': '1' }), h('div', { class: 'eh-3dslot', 'data-ehr-3d': '1' }, [h('h5', { text: 'Where the plane is' }), panel3d, h('p', { class: 'fine', text: 'The model heart stands in for the real one: the real picture is painted on the plane you have cut, in the place that plane has in the chest.' })])]), h('div', { class: 'ec-right' }, [h('label', { class: 'ehr-tgt' }, ['Target view ', targets]), score, controls])]),
    h('figcaption', { text: d.credit + ' The probe is fixed at the apex (that is where the volume was acquired), so there is no window to choose and no sliding: rotate the marker and tilt the beam for the long axes, or cut across the beam at a depth for the short axes.' })
  ]);
  setTimeout(ehrLabRefresh, 0);
  return fig;
}

function echoWidget(kind) {
  if (kind === 'echoatlas') return echoAtlasFig();
  if (kind === 'echolab') return echoLabFig();
  if (kind === 'echoquiz') return echoQuizFig();
  if (kind === 'echoreal') return echoRealLabFig();
  if (kind === 'echolog') return typeof echoLogFig === 'function' ? echoLogFig() : null;
  return null;
}
