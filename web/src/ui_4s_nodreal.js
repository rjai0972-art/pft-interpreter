
/* ========================================================================== Learn: real nodules (v8.5)
   Six small stacks cut from a real chest CT at full resolution (four nodules and two vessels that look like one on a
   single slice): scroll through, window, measure with calipers, probe the density, say what it is and what to do; then
   hunt the same four on the whole axial series. Data in nod_real.js (PFT_NODREAL); the HU decoding and the windows are
   the CT area's (crDecode, CR_WIN). */
const NR = { i: 0, k: -1, win: 'lung', zoom: 4, cal: { long: null, short: null, drag: null }, probe: null, imgs: {}, answers: {}, checked: {}, mode: 'measure', hunt: { i: 0, found: {}, marks: [], imgs: {}, win: 'lung' }, canvas: null, hcanvas: null };
function nrData() { return (typeof PFT_NODREAL !== 'undefined' ? PFT_NODREAL : (typeof window !== 'undefined' ? window.PFT_NODREAL : null)); }
function nrCase() { const d = nrData(); return d ? d.cases[Math.max(0, Math.min(d.cases.length - 1, NR.i))] : null; }
function nrSlice() { const c = nrCase(); return c ? c.slices[Math.max(0, Math.min(c.slices.length - 1, NR.k))] : null; }
function nrLut(win) {
  const k = 'nr:' + win; if (CR.cache[k]) return CR.cache[k];
  const w = CR_WIN[win], lo = w[0] - w[1] / 2, lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = Math.round(Math.max(0, Math.min(1, (crDecode(v) - lo) / w[1])) * 255);
  CR.cache[k] = lut; return lut;
}
/* decoded 8-bit values of a slice image (any series), kept once loaded */
function nrPixels(store, key, src, w, h, cb) {
  if (store[key]) return store[key];
  if (store['loading:' + key]) return null;
  store['loading:' + key] = true;
  const im = new Image();
  im.onload = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data; const g = new Uint8Array(w * h); for (let i = 0; i < g.length; i++) g[i] = d[i * 4]; store[key] = g; delete store['loading:' + key]; if (cb) cb(); };
  im.src = src; return null;
}
function nrHuAt(g, w, x, y, r) {   // mean HU in a disc of radius r px
  let s = 0, n = 0; const R = r || 0;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { if (dx * dx + dy * dy > R * R) continue; const xx = Math.round(x) + dx, yy = Math.round(y) + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= w) continue; s += crDecode(g[yy * w + xx]); n++; }
  return n ? s / n : null;
}
function nrDraw() {
  const cv = NR.canvas, c = nrCase(), sl = nrSlice(); if (!cv || !c || !sl) return;
  const ctx = cv.getContext('2d'), S = c.size, Z = NR.zoom, W = S * Z, H = S * Z;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const g = nrPixels(NR.imgs, c.id + ':' + sl.z, sl.img, S, S, () => { if (nrSlice() === sl) nrDraw(); });
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (!g) { ctx.fillStyle = '#9a9a9a'; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('loading…', W / 2, H / 2); return; }
  const lut = nrLut(NR.win), im = ctx.createImageData(S, S), d = im.data;
  for (let i = 0, j = 0; i < g.length; i++, j += 4) { const v = lut[g[i]]; d[j] = d[j + 1] = d[j + 2] = v; d[j + 3] = 255; }
  const off = NR.off || (NR.off = document.createElement('canvas')); off.width = S; off.height = S; off.getContext('2d').putImageData(im, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(off, 0, 0, W, H);
  // the calipers
  const line = (p, col, label, below) => { if (!p) return; ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p[0] * Z, p[1] * Z); ctx.lineTo(p[2] * Z, p[3] * Z); ctx.stroke(); [[p[0], p[1]], [p[2], p[3]]].forEach(q => { ctx.beginPath(); ctx.arc(q[0] * Z, q[1] * Z, 3, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); }); const mm = Math.hypot(p[2] - p[0], p[3] - p[1]) * c.mmpx; ctx.font = '600 11px system-ui, sans-serif'; ctx.fillStyle = col; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineJoin = 'round'; const tx = below ? (p[0] + p[2]) / 2 * Z + 6 : Math.max(p[0], p[2]) * Z + 6, ty = below ? Math.max(p[1], p[3]) * Z + 14 : Math.min(p[1], p[3]) * Z - 6; ctx.textAlign = 'left'; const t = label + ' ' + mm.toFixed(1) + ' mm'; ctx.strokeText(t, tx, ty); ctx.fillText(t, tx, ty); };
  line(NR.cal.long, '#ffd166', 'long', false); line(NR.cal.short, '#7fd3ff', 'short', true); if (NR.cal.drag) line(NR.cal.drag, NR.cal.long ? '#7fd3ff' : '#ffd166', '', !!NR.cal.long);
  // the probe
  if (NR.probe) { const hu = nrHuAt(g, S, NR.probe[0], NR.probe[1], 1); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(NR.probe[0] * Z, NR.probe[1] * Z, 1.5 * Z, 0, Math.PI * 2); ctx.stroke(); ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(Math.round(hu) + ' HU', NR.probe[0] * Z + 10, NR.probe[1] * Z - 8); }
  // the console: slice, window, scale
  ctx.font = '10.5px system-ui, sans-serif'; ctx.fillStyle = '#9aa0a8'; ctx.textAlign = 'left';
  ctx.fillText({ lung: 'Lung W1500 / L−600', med: 'Mediastinal W400 / L40', bone: 'Bone W1800 / L400' }[NR.win], 6, H - 6);
  ctx.textAlign = 'right'; ctx.fillText('slice ' + (sl.dz > 0 ? '+' : '') + sl.dz + ' · ' + (sl.dz * c.step > 0 ? '+' : '') + (sl.dz * c.step).toFixed(1) + ' mm', W - 6, 14);
  const px = 10 / c.mmpx * Z; ctx.strokeStyle = '#d9d2bb'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W - 8 - px, H - 10); ctx.lineTo(W - 8, H - 10); ctx.stroke(); ctx.fillStyle = '#d9d2bb'; ctx.fillText('1 cm', W - 8, H - 14);
  // the reference, once checked
  if (NR.checked[c.id]) { ctx.strokeStyle = 'rgba(242,193,78,0.9)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(c.centre[0] * Z, c.centre[1] * Z, Math.max(6, c.measure.long / 2 / c.mmpx) * Z + 4, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
}
function nrCalMm(p) { const c = nrCase(); return p ? Math.hypot(p[2] - p[0], p[3] - p[1]) * c.mmpx : 0; }
function nrMean() { const l = nrCalMm(NR.cal.long), s = nrCalMm(NR.cal.short); if (!l) return 0; return s ? (l + s) / 2 : l; }
function nrSet(k) { const c = nrCase(); if (!c) return; NR.k = Math.max(0, Math.min(c.slices.length - 1, k)); const sl = document.querySelector('[data-nr-k]'); if (sl && +sl.value !== NR.k) sl.value = NR.k; nrDraw(); }
function nrRefresh() {
  const root = document.querySelector('[data-nodreal]'); if (!root) return;
  const c = nrCase(); if (!c) return;
  root.querySelectorAll('[data-nr-case]').forEach(b => b.classList.toggle('on', +b.getAttribute('data-nr-case') === NR.i));
  root.querySelectorAll('[data-nr-win]').forEach(b => b.setAttribute('aria-checked', String(b.getAttribute('data-nr-win') === NR.win)));
  const sl = root.querySelector('[data-nr-k]'); if (sl) { sl.max = String(c.slices.length - 1); sl.value = String(NR.k); }
  const ms = root.querySelector('[data-nr-measure]'); if (ms) { const l = nrCalMm(NR.cal.long), s = nrCalMm(NR.cal.short); ms.textContent = !l ? 'Drag across the nodule for the long axis, then again for the short axis.' : (!s ? 'Long axis ' + l.toFixed(1) + ' mm — now drag the short axis, perpendicular to it.' : 'Long ' + l.toFixed(1) + ' × short ' + s.toFixed(1) + ' mm · mean ' + nrMean().toFixed(1) + ' mm (Fleischner rounds to ' + Math.round(nrMean()) + ' mm)'); }
  const a = NR.answers[c.id] || (NR.answers[c.id] = { what: '', type: 'solid', risk: 'low', size: 0 });
  if (nrMean() && !a.sizeTouched) a.size = Math.round(nrMean() * 10) / 10;
  const sz = root.querySelector('[data-nr-size]'); if (sz && +sz.value !== a.size) sz.value = a.size;
  const plan = root.querySelector('[data-nr-plan]'); if (plan) { plan.textContent = ''; if (a.what === 'vessel') plan.appendChild(h('p', { class: 'fine', text: 'A vessel needs no plan — but be sure: scroll through it.' })); else if (a.size > 0) { const f = NOD.fleischner({ size: a.size, type: a.type, risk: a.risk, multiple: false, solid: a.type === 'part' ? Math.min(a.size, 5) : 0 }); plan.appendChild(h('p', { class: 'nr-plan' }, [h('b', { text: f.rule + ': ' }), f.text])); } else plan.appendChild(h('p', { class: 'fine', text: 'Measure it, then the plan follows from the size, the attenuation and the risk.' })); }
  const ck = root.querySelector('[data-nr-check]'); if (ck) ck.textContent = ''; if (ck && NR.checked[c.id]) ck.appendChild(nrVerdict(c, a));
  const sc = root.querySelector('[data-nr-score]'); if (sc) { const n = Object.keys(NR.checked).length, g = Object.keys(NR.checked).filter(id => NR.checked[id].good).length; sc.textContent = n ? g + ' of ' + n + ' called right' : ''; }
  nrDraw();
}
function nrClass(m) { if (m.solidHu !== null && m.solidFrac >= 0.5) return 'solid'; if (m.solidHu !== null && m.solidFrac > 0.1) return 'part-solid'; return m.hu > -600 ? 'ground-glass (or a small nodule averaged with air: partial volume)' : 'faint'; }
function nrVerdict(c, a) {
  const m = c.measure, isN = c.kind === 'nodule', mean = (m.long + m.short) / 2, dm = a.size ? Math.abs(a.size - mean) : null;
  const good = (a.what === c.kind) && (!isN || (dm !== null && dm <= 1.5));
  NR.checked[c.id].good = good;
  const box = h('div', { class: 'nr-verdict' + (good ? ' good' : '') });
  box.appendChild(h('p', { class: 'nr-truth' }, [h('b', { text: c.name + '. ' }), isN ? 'A nodule: it is round on this slice and on the ones above and below, and it ends; a vessel runs on.' : 'A vessel: round on one slice, but scroll and it runs into its branch — a nodule stops.']));
  if (isN) {
    box.appendChild(h('p', { text: 'From the voxels: long ' + m.long + ' × short ' + m.short + ' mm, mean ' + mean.toFixed(1) + ' mm' + (a.size ? ' — you measured ' + a.size + ' mm' + (dm <= 1.5 ? ' (within the 1.5 mm measurement error).' : ' (more than 1.5 mm off: put the calipers edge to edge on the slice where it is largest).') : '.') }));
    box.appendChild(h('p', { text: 'Density: mean ' + m.hu + ' HU over the whole nodule' + (m.solidHu !== null ? ', ' + m.solidHu + ' HU in the solid part' : '') + ' → ' + nrClass(m) + (mean < 6.5 ? '. On 2.5 mm slices a 4–5 mm nodule is averaged with the air around it, so its number comes out low; thin sections are needed to call attenuation in small nodules.' : '.') }));
    const f = NOD.fleischner({ size: Math.round(mean), type: nrClass(m) === 'solid' ? 'solid' : (nrClass(m) === 'part-solid' ? 'part' : 'solid'), risk: a.risk, multiple: true, solid: 0 });
    box.appendChild(h('p', { text: 'This scan carries more than one nodule, so Fleischner’s multiple-nodule rows apply and the most suspicious one sets the plan (' + a.risk + '-risk patient): ' + f.rule + ' — ' + f.text }));
    box.appendChild(h('p', { class: 'fine', text: 'Where it is: ' + (c.side === 'left' ? 'left' : 'right') + ' lung, ' + (c.mm > 0 ? '+' : '') + c.mm + ' mm from the carina. Find it on the whole scan below.' }));
  } else box.appendChild(h('p', { class: 'fine', text: 'The giveaway is in the scrolling: a vessel seen end-on is round on one slice and elongated or branching on the next; a nodule is round on two or three slices and gone on either side. Lung window, thin section, and the adjacent slices before anything is called a nodule.' }));
  return box;
}
function nrViewer() {
  const c = nrCase();
  const cv = h('canvas', { class: 'nr-canvas', width: c.size * NR.zoom, height: c.size * NR.zoom, 'aria-label': 'Real CT, cropped around the finding', tabindex: '0' }); NR.canvas = cv;
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * c.size, (e.clientY - r.top) / r.height * c.size]; };
  cv.addEventListener('pointerdown', (e) => { if (NR.cal.long && NR.cal.short) { NR.cal = { long: null, short: null, drag: null }; } const p = pos(e); NR.cal.drag = [p[0], p[1], p[0], p[1]]; cv.setPointerCapture(e.pointerId); e.preventDefault(); });
  cv.addEventListener('pointermove', (e) => { const p = pos(e); if (NR.cal.drag) { NR.cal.drag[2] = p[0]; NR.cal.drag[3] = p[1]; } NR.probe = p; nrDraw(); });
  cv.addEventListener('pointerup', (e) => { const d = NR.cal.drag; NR.cal.drag = null; if (d && Math.hypot(d[2] - d[0], d[3] - d[1]) >= 1.5) { if (!NR.cal.long) NR.cal.long = d; else NR.cal.short = d; const a = NR.answers[nrCase().id]; if (a) a.sizeTouched = false; } nrRefresh(); });
  cv.addEventListener('pointerleave', () => { NR.probe = null; nrDraw(); });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); nrSet(NR.k + (e.deltaY > 0 ? 1 : -1)); }, { passive: false });
  cv.addEventListener('keydown', (e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); nrSet(NR.k - 1); } if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); nrSet(NR.k + 1); } });
  return cv;
}
function nrLab() {
  const d = nrData(); if (!d || typeof NOD === 'undefined') return h('p', { class: 'fine', text: 'The real nodules did not load in this build.' });
  const c = nrCase(); if (NR.k < 0) NR.k = c.index;
  const cases = h('div', { class: 'seg nr-cases', role: 'tablist' }, d.cases.map((x, i) => h('button', { type: 'button', class: 'ch' + (i === NR.i ? ' on' : ''), role: 'tab', 'data-nr-case': i, 'aria-selected': String(i === NR.i), text: 'Case ' + (i + 1), onclick: () => { NR.i = i; NR.k = d.cases[i].index; NR.cal = { long: null, short: null, drag: null }; const f = document.querySelector('[data-nodreal]'); if (f) f.replaceWith(nrLab()); } })));
  const wins = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Window' }, [['lung', 'Lung'], ['med', 'Mediastinal'], ['bone', 'Bone']].map(w => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-nr-win': w[0], 'aria-checked': String(NR.win === w[0]), text: w[1], onclick: () => { NR.win = w[0]; nrRefresh(); } })));
  const slider = h('input', { type: 'range', min: 0, max: c.slices.length - 1, step: 1, value: NR.k, 'data-nr-k': '1', 'aria-label': 'Slice', oninput: (e) => nrSet(+e.target.value) });
  const zoomSel = h('select', { 'aria-label': 'Zoom', 'data-nr-zoom': '1', onchange: (e) => { NR.zoom = +e.target.value; nrRefresh(); } }, [[2, '×2'], [3, '×3'], [4, '×4']].map(o => h('option', { value: o[0], selected: NR.zoom === o[0], text: o[1] })));
  const a = NR.answers[c.id] || (NR.answers[c.id] = { what: '', type: 'solid', risk: 'low', size: 0 });
  const what = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'What is it' }, [['nodule', 'A nodule'], ['vessel', 'A vessel']].map(w => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-nr-what': w[0], 'aria-checked': String(a.what === w[0]), text: w[1], onclick: () => { a.what = w[0]; what.querySelectorAll('[data-nr-what]').forEach(b => b.setAttribute('aria-checked', String(b.getAttribute('data-nr-what') === a.what))); nrRefresh(); } })));
  const typeSel = h('select', { 'aria-label': 'Attenuation', 'data-nr-type': '1', onchange: (e) => { a.type = e.target.value; nrRefresh(); } }, [['solid', 'Solid'], ['part', 'Part-solid'], ['ggn', 'Ground-glass']].map(o => h('option', { value: o[0], selected: a.type === o[0], text: o[1] })));
  const riskSel = h('select', { 'aria-label': 'Risk', 'data-nr-risk': '1', onchange: (e) => { a.risk = e.target.value; nrRefresh(); } }, [['low', 'Low-risk patient'], ['high', 'High-risk patient']].map(o => h('option', { value: o[0], selected: a.risk === o[0], text: o[1] })));
  const sizeIn = h('input', { type: 'number', class: 'num', step: 0.1, min: 0, max: 40, value: a.size, 'data-nr-size': '1', 'aria-label': 'Mean diameter, mm', oninput: (e) => { a.size = +e.target.value; a.sizeTouched = true; nrRefresh(); } });
  const check = h('button', { type: 'button', class: 'btn sm', 'data-nr-checkbtn': '1', text: 'Check', onclick: () => { if (!a.what) { toast('Say first whether it is a nodule or a vessel.'); return; } NR.checked[c.id] = { good: false }; nrRefresh(); } });
  const clear = h('button', { type: 'button', class: 'lnk', 'data-nr-clear': '1', text: 'Clear the calipers', onclick: () => { NR.cal = { long: null, short: null, drag: null }; nrRefresh(); } });
  const fig = h('figure', { class: 'an-fig nr-fig', 'data-nodreal': '1' }, [
    h('div', { class: 'ecg-ctl nr-top' }, [cases, h('span', { class: 'fine', 'data-nr-score': '1' })]),
    h('div', { class: 'nr-grid' }, [
      h('div', { class: 'nr-left' }, [h('div', { class: 'nr-view' }, [nrViewer()]), h('div', { class: 'ecg-ctl' }, [h('span', { class: 'lbl', text: 'Slice' }), slider, wins, zoomSel]), h('p', { class: 'fine', 'data-nr-measure': '1' }), h('p', { class: 'fine', text: 'Scroll or use the arrow keys to move through the slices; hover for the HU under the cursor; drag across the finding to measure.' })]),
      h('div', { class: 'ec-right nr-right' }, [
        h('h5', { text: 'Call it' }), what,
        h('label', { class: 'nod-f' }, [h('span', { class: 'nod-l', text: 'Mean diameter (long + short) / 2, mm' }), sizeIn]),
        h('label', { class: 'nod-f' }, [h('span', { class: 'nod-l', text: 'Attenuation' }), typeSel]),
        h('label', { class: 'nod-f' }, [h('span', { class: 'nod-l', text: 'The patient' }), riskSel]),
        h('div', { 'data-nr-plan': '1' }), h('div', { class: 'ec-labbtns' }, [check, clear]), h('div', { 'data-nr-check': '1' })
      ])
    ]),
    h('figcaption', { text: d.credit })
  ]);
  setTimeout(nrRefresh, 0);
  return fig;
}
/* ---- the hunt: the whole axial series, four nodules to find */
function nhSeries() { const D = crData(); return D ? D.series.filter(s => s.id === 'chest')[0] : null; }
function nhTargets() { const d = nrData(); return d ? d.cases.filter(c => c.kind === 'nodule') : []; }
function nhDraw() {
  const cv = NR.hcanvas, sr = nhSeries(); if (!cv || !sr) return;
  const sl = sr.slices[Math.max(0, Math.min(sr.slices.length - 1, NR.hunt.i))], ctx = cv.getContext('2d'), W = sr.w, H = sr.h;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const g = nrPixels(NR.hunt.imgs, 'chest:' + sl.z, sl.img, W, H, () => nhDraw());
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (!g) { ctx.fillStyle = '#9a9a9a'; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('loading…', W / 2, H / 2); return; }
  const lut = nrLut(NR.hunt.win), im = ctx.createImageData(W, H), d = im.data;
  for (let i = 0, j = 0; i < g.length; i++, j += 4) { const v = lut[g[i]]; d[j] = d[j + 1] = d[j + 2] = v; d[j + 3] = 255; }
  const off = NR.hoff || (NR.hoff = document.createElement('canvas')); off.width = W; off.height = H; off.getContext('2d').putImageData(im, 0, 0);
  ctx.drawImage(off, 0, 0);
  // the marks on this slice
  NR.hunt.marks.filter(m => m.z === sl.z).forEach(m => { ctx.strokeStyle = m.hit ? '#59c27a' : (m.vessel ? '#ffd166' : '#ff6b6b'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(m.x, m.y, 12, 0, Math.PI * 2); ctx.stroke(); });
  // the found nodules, when on their slice
  nhTargets().forEach(t => { if (NR.hunt.found[t.id] && Math.abs(t.hunt.z - sl.z) <= 1) { ctx.strokeStyle = '#59c27a'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(t.hunt.x, t.hunt.y, 14, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); } });
  ctx.font = '10.5px system-ui, sans-serif'; ctx.fillStyle = '#9aa0a8'; ctx.textAlign = 'right'; ctx.fillText((sl.mm > 0 ? '+' : sl.mm < 0 ? '−' : '') + Math.abs(sl.mm) + ' mm from the carina', W - 6, 14);
  ctx.textAlign = 'left'; ctx.fillText({ lung: 'Lung W1500 / L−600', med: 'Mediastinal W400 / L40' }[NR.hunt.win] || '', 6, H - 6);
}
function nhSet(i) { const sr = nhSeries(); if (!sr) return; NR.hunt.i = Math.max(0, Math.min(sr.slices.length - 1, i)); const sl = document.querySelector('[data-nh-i]'); if (sl && +sl.value !== NR.hunt.i) sl.value = NR.hunt.i; nhDraw(); }
function nhStatus() {
  const box = document.querySelector('[data-nh-status]'); if (!box) return;
  const T = nhTargets(), n = T.filter(t => NR.hunt.found[t.id]).length;
  box.textContent = n + ' of ' + T.length + ' found' + (NR.hunt.marks.length ? ' · ' + NR.hunt.marks.length + ' marks' : '') + (n === T.length ? ' — all four. The two vessels you may have marked are the ones that run on when you scroll.' : '');
}
function nhClick(x, y) {
  const sr = nhSeries(); if (!sr) return; const sl = sr.slices[NR.hunt.i], d = nrData();
  const near = (c) => Math.hypot(c.hunt.x - x, c.hunt.y - y) <= 14 && Math.abs(c.hunt.z - sl.z) <= 2;
  const hit = nhTargets().filter(near)[0], vessel = !hit && d.cases.filter(c => c.kind === 'vessel' && near(c))[0];
  const mark = { x: x, y: y, z: sl.z, hit: !!hit, vessel: !!vessel };
  NR.hunt.marks.push(mark);
  if (hit) { NR.hunt.found[hit.id] = true; toast('Found: ' + hit.name + '.'); } else if (vessel) toast('That is ' + vessel.name.toLowerCase() + ' — scroll up and down through it.'); else toast('Nothing there: keep scrolling.');
  nhStatus(); nhDraw();
}
function nhLab() {
  const sr = nhSeries(), d = nrData(); if (!sr || !d) return h('p', { class: 'fine', text: 'The chest series did not load in this build.' });
  if (!NR.hunt.started) { NR.hunt.started = true; NR.hunt.i = sr.slices.findIndex(s => s.mm === 0) || 0; }
  const cv = h('canvas', { class: 'nh-canvas', width: sr.w, height: sr.h, 'aria-label': 'The whole chest CT, to hunt the nodules', tabindex: '0' }); NR.hcanvas = cv;
  cv.addEventListener('click', (e) => { const r = cv.getBoundingClientRect(); nhClick((e.clientX - r.left) / r.width * sr.w, (e.clientY - r.top) / r.height * sr.h); });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); nhSet(NR.hunt.i + (e.deltaY > 0 ? 1 : -1)); }, { passive: false });
  cv.addEventListener('keydown', (e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); nhSet(NR.hunt.i - 1); } if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); nhSet(NR.hunt.i + 1); } });
  const slider = h('input', { type: 'range', min: 0, max: sr.slices.length - 1, step: 1, value: NR.hunt.i, 'data-nh-i': '1', 'aria-label': 'Slice', oninput: (e) => nhSet(+e.target.value) });
  const wins = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Window' }, [['lung', 'Lung'], ['med', 'Mediastinal']].map(w => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-nh-win': w[0], 'aria-checked': String(NR.hunt.win === w[0]), text: w[1], onclick: () => { NR.hunt.win = w[0]; wins.querySelectorAll('[data-nh-win]').forEach(b => b.setAttribute('aria-checked', String(b.getAttribute('data-nh-win') === NR.hunt.win))); nhDraw(); } })));
  const hint = h('button', { type: 'button', class: 'lnk', 'data-nh-hint': '1', text: 'Take me to one I have not found', onclick: () => { const t = nhTargets().filter(x => !NR.hunt.found[x.id])[0]; if (!t) { toast('All found.'); return; } const i = sr.slices.findIndex(s => s.z === t.hunt.z); if (i >= 0) nhSet(i); toast('This slice has one: ' + t.side + ' lung.'); } });
  const reset = h('button', { type: 'button', class: 'lnk', 'data-nh-reset': '1', text: 'Start again', onclick: () => { NR.hunt.found = {}; NR.hunt.marks = []; nhStatus(); nhDraw(); } });
  const fig = h('figure', { class: 'an-fig nh-fig', 'data-nodhunt': '1' }, [
    h('div', { class: 'nh-view' }, [cv]),
    h('div', { class: 'ecg-ctl' }, [h('span', { class: 'lbl', text: 'Slice' }), slider, wins]),
    h('div', { class: 'ecg-ctl' }, [h('span', { class: 'fine', 'data-nh-status': '1' }), hint, reset]),
    h('figcaption', { text: 'The same scan, every 5 mm (2.5 mm through the nodules). Four real nodules, 4–10 mm, are in it; click on one to mark it. Lung window, and scroll — a nodule is on two or three slices and gone, a vessel runs on.' })
  ]);
  setTimeout(() => { nhStatus(); nhDraw(); }, 0);
  return fig;
}
function nodRealWidget(kind) { if (kind === 'nodreal') return nrLab(); if (kind === 'nodhunt') return nhLab(); return null; }
