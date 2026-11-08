
/* ========================================================================== Learn: where the leads go (v8.5)
   A torso with the ten electrodes, draggable; two cables can be swapped and an electrode detached; the twelve leads
   on paper written from the electrodes; a reading made from the traces that names the clues to the error, and a
   lead-by-lead comparison with the correct placement. Model in leads.js (PFT_LEADS), source dipole from the bench. */
const LD = window.PFT_LEADS || null;
const LDS = { s: null, mishap: 'ok', src: 'normal', sel: null, swapWith: null, st: null, cache: null, drag: null };
function ldSource() {
  const C = window.PFT_COND; if (!C) return null;
  let cfg;
  if (LDS.src === 'stemi_inf_rv') { cfg = C.preset('stemi_inf'); cfg.myo.rv.injury = 1.0; }
  else cfg = C.preset(LDS.src);
  return C.strip(cfg, 10);
}
/* the dipole of the strip, cached at 2 ms, so the paper and the readings can call the leads thousands of times */
function ldCache(st) {
  const N = Math.ceil(10000 / 2) + 1, D = new Float32Array(N * 3), spike = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const d = LD.dipoleAt(st, i * 2); D[i * 3] = d.D[0]; D[i * 3 + 1] = d.D[1]; D[i * 3 + 2] = d.D[2]; spike[i] = d.spike ? 1 : 0; }
  return { D: D, spike: spike, N: N };
}
function ldVfn() {
  const s = LDS.s, st = LDS.st, c = LDS.cache, vecs = LD.cableVecs(s); let lastT = -1, last = null;
  return (lead, T) => {
    if (T === lastT) return last[lead];
    const i = Math.max(0, Math.min(c.N - 1, Math.round(T / 2))), D = s.mirror ? [-c.D[i * 3], c.D[i * 3 + 1], c.D[i * 3 + 2]] : [c.D[i * 3], c.D[i * 3 + 1], c.D[i * 3 + 2]];
    const phi = LD.potentials(s, vecs, D, T), L = LD.leadsFrom(phi);
    if (c.spike[i]) LD.LEAD_NAMES.forEach(k => { L[k] += 0.9; });
    if (s.off[s.cables.RL]) LD.LEAD_NAMES.forEach(k => { L[k] += 0.12 * Math.sin(2 * Math.PI * 60 * T / 1000) + 0.04 * Math.sin(2 * Math.PI * 0.4 * T / 1000); });
    lastT = T; last = L; return L[lead];
  };
}
function ldElectrode(id) { return LD.ELECTRODES.filter(e => e.id === id)[0]; }
function ldCableOf(eid) { return Object.keys(LDS.s.cables).filter(c => LDS.s.cables[c] === eid)[0]; }

/* ---- the torso */
const LD_TORSO = {
  body: 'M182 98 L182 116 C150 118 122 118 108 124 C100 128 100 140 100 160 L100 332 C104 356 108 376 116 396 L118 412 C140 420 180 424 200 424 C220 424 260 420 282 412 L284 396 C292 376 296 356 300 332 L300 160 C300 140 300 128 292 124 C278 118 250 118 218 116 L218 98 Z',
  head: 'M200 14 C222 14 232 34 230 54 C228 76 216 92 200 92 C184 92 172 76 170 54 C168 34 178 14 200 14 Z',
  armR: 'M108 128 L62 186 L30 246', armL: 'M292 128 L338 186 L370 246',
  legR: 'M150 420 L150 478', legL: 'M250 420 L250 478',
  ribs: [[[193, 200], [120, 214]], [[193, 218], [112, 236]], [[193, 236], [106, 258]], [[193, 254], [104, 280]], [[193, 272], [104, 302]], [[193, 290], [106, 324]]]
};
function ldTorso() {
  const svg = sv('svg', { viewBox: '0 0 420 480', class: 'ld-torso', role: 'img', 'aria-label': 'The torso with the ten electrodes', 'data-ld-torso': '1' });
  const g = (cls) => { const e = sv('g', { class: cls }); svg.appendChild(e); return e; };
  const body = g('ld-body');
  body.appendChild(sv('path', { d: LD_TORSO.head, class: 'ld-skin' }));
  body.appendChild(sv('path', { d: LD_TORSO.armR, class: 'ld-limb' })); body.appendChild(sv('path', { d: LD_TORSO.armL, class: 'ld-limb' }));
  body.appendChild(sv('path', { d: LD_TORSO.legR, class: 'ld-limb' })); body.appendChild(sv('path', { d: LD_TORSO.legL, class: 'ld-limb' }));
  body.appendChild(sv('path', { d: LD_TORSO.body, class: 'ld-skin' }));
  // the bones: clavicles, sternum with the angle of Louis, ribs sloping down and out, both sides
  const bones = g('ld-bones');
  bones.appendChild(sv('path', { d: 'M196 118 C170 112 140 116 116 128', class: 'ld-bone' })); bones.appendChild(sv('path', { d: 'M204 118 C230 112 260 116 284 128', class: 'ld-bone' }));
  bones.appendChild(sv('rect', { x: 193, y: 122, width: 14, height: 186, rx: 5, class: 'ld-sternum' }));
  bones.appendChild(sv('line', { x1: 186, y1: 184, x2: 214, y2: 184, class: 'ld-louis' })); bones.appendChild(svt(226, 180, 'angle of Louis', { class: 'ld-note' }));
  LD_TORSO.ribs.forEach((r, i) => {
    const a = r[0], b = r[1];
    bones.appendChild(sv('path', { d: 'M' + a[0] + ' ' + a[1] + ' C' + (a[0] - 30) + ' ' + (a[1] + 2) + ' ' + (b[0] + 20) + ' ' + (b[1] - 12) + ' ' + b[0] + ' ' + b[1], class: 'ld-rib' }));
    bones.appendChild(sv('path', { d: 'M' + (400 - a[0]) + ' ' + a[1] + ' C' + (400 - a[0] + 30) + ' ' + (a[1] + 2) + ' ' + (400 - b[0] - 20) + ' ' + (b[1] - 12) + ' ' + (400 - b[0]) + ' ' + b[1], class: 'ld-rib' }));
    if (i < 5) bones.appendChild(svt(176, a[1] + 12, ['2nd', '3rd', '4th', '5th', '6th'][i], { class: 'ld-ics', 'text-anchor': 'end' }));
  });
  // the lines of the chest and the heart
  const lines = g('ld-lines');
  [[250, 'mid-clavicular'], [275, 'anterior axillary'], [300, 'mid-axillary']].forEach(l => { lines.appendChild(sv('line', { x1: l[0], y1: 128, x2: l[0], y2: 340, class: 'ld-guide' })); lines.appendChild(svt(l[0] + 3, 348 + (l[0] - 250) / 25 * 11, l[1], { class: 'ld-note' })); });
  lines.appendChild(sv('circle', { cx: 150, cy: 262, r: 4, class: 'ld-nipple' })); lines.appendChild(sv('circle', { cx: 250, cy: 262, r: 4, class: 'ld-nipple' }));
  lines.appendChild(sv('ellipse', { cx: 222, cy: 254, rx: 50, ry: 38, transform: 'rotate(32 222 254)', class: 'ld-heart' }));
  lines.appendChild(svt(236, 262, 'heart', { class: 'ld-note' }));
  // round the back, beyond the left silhouette
  lines.appendChild(sv('rect', { x: 302, y: 236, width: 100, height: 64, rx: 8, class: 'ld-back' }));
  lines.appendChild(svt(352, 252, 'round the back →', { class: 'ld-note', 'text-anchor': 'middle' })); lines.appendChild(svt(352, 292, 'V7 · V8 · V9', { class: 'ld-note', 'text-anchor': 'middle' }));
  lines.appendChild(svt(62, 110, 'patient’s right', { class: 'ld-side' })); lines.appendChild(svt(338, 110, 'patient’s left', { class: 'ld-side', 'text-anchor': 'end' }));
  // the electrodes
  const el = g('ld-electrodes');
  LD.ELECTRODES.forEach(e => {
    const pos = LDS.s.pos[e.id], cable = ldCableOf(e.id), off = !!LDS.s.off[e.id];
    const grp = sv('g', { class: 'ld-el' + (off ? ' off' : '') + (LDS.sel === e.id ? ' sel' : '') + (e.limb ? ' limb' : ''), 'data-ld-el': e.id, transform: 'translate(' + pos[0] + ' ' + pos[1] + ')', tabindex: '0', role: 'button', 'aria-label': e.name + (cable !== e.id ? ', plugged into the ' + cable + ' cable' : '') + (off ? ', detached' : '') });
    if (off) grp.appendChild(sv('path', { d: 'M0 0 l10 16', class: 'ld-dangle' }));
    grp.appendChild(sv('circle', { r: 13, class: 'ld-ring' }));
    grp.appendChild(sv('circle', { r: 10, fill: e.colour, class: 'ld-dot' }));
    grp.appendChild(svt(0, 3.5, e.id, { class: 'ld-id', 'text-anchor': 'middle', fill: ['LA'].indexOf(e.id) >= 0 || e.id === 'V6' || e.id === 'V4' || e.id === 'LL' || e.id === 'V1' || e.id === 'V5' ? '#fff' : '#111' }));
    if (cable !== e.id) grp.appendChild(svt(0, 24, 'on ' + cable + ' cable', { class: 'ld-cable', 'text-anchor': 'middle' }));
    if (off) grp.appendChild(svt(0, 24, 'off', { class: 'ld-cable', 'text-anchor': 'middle' }));
    el.appendChild(grp);
  });
  svg.appendChild(svt(210, 470, 'Drag an electrode · click one for its place and its leads', { class: 'ld-note', 'text-anchor': 'middle' }));
  // dragging, in viewBox units
  const toView = (ev) => { const r = svg.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * 420, (ev.clientY - r.top) / r.height * 480]; };
  svg.addEventListener('pointerdown', (ev) => {
    const t = ev.target.closest('[data-ld-el]'); if (!t) return;
    const id = t.getAttribute('data-ld-el'), p = toView(ev); LDS.drag = { id: id, start: p, moved: false, x0: LDS.s.pos[id][0], y0: LDS.s.pos[id][1] };
    svg.setPointerCapture(ev.pointerId); ev.preventDefault();
  });
  svg.addEventListener('pointermove', (ev) => {
    const d = LDS.drag; if (!d) return; const p = toView(ev), dx = p[0] - d.start[0], dy = p[1] - d.start[1];
    if (!d.moved && Math.hypot(dx, dy) < 3) return; d.moved = true; LDS.mishap = 'custom';
    LDS.s.pos[d.id] = [Math.max(10, Math.min(410, d.x0 + dx)), Math.max(100, Math.min(478, d.y0 + dy))];
    const grp = svg.querySelector('[data-ld-el="' + d.id + '"]'); if (grp) grp.setAttribute('transform', 'translate(' + LDS.s.pos[d.id][0] + ' ' + LDS.s.pos[d.id][1] + ')');
    if (!LDS.raf) LDS.raf = requestAnimationFrame(() => { LDS.raf = 0; ldRefresh(false); });
  });
  const up = (ev) => { const d = LDS.drag; if (!d) return; LDS.drag = null; if (!d.moved) ldSelect(d.id); else ldRefresh(true); };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  svg.addEventListener('keydown', (ev) => { const t = ev.target.closest('[data-ld-el]'); if (!t) return; if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ldSelect(t.getAttribute('data-ld-el')); } });
  return svg;
}
function ldSelect(id) {
  if (LDS.swapWith && LDS.swapWith !== id) { const a = ldCableOf(LDS.swapWith), b = ldCableOf(id); LD.swap(LDS.s, a, b); LDS.swapWith = null; LDS.mishap = 'custom'; LDS.sel = id; ldRefresh(true); return; }
  LDS.sel = LDS.sel === id ? null : id; ldRefresh(true);
}
/* ---- the panel for the selected electrode */
function ldElPanel() {
  const e = LDS.sel ? ldElectrode(LDS.sel) : null;
  const box = h('div', { class: 'ld-elpanel', 'data-ld-elpanel': '1' });
  if (!e) { box.appendChild(h('p', { class: 'fine', text: 'Click an electrode to see where it goes and which leads it writes; drag it to move it.' })); return box; }
  const cable = ldCableOf(e.id), off = !!LDS.s.off[e.id], uses = LD.LEAD_NAMES.filter(L => LD.LEAD_USES[L].indexOf(cable) >= 0);
  box.appendChild(h('h5', { text: e.name + (e.id.length === 2 && !/^V/.test(e.id) ? ' (' + e.id + ')' : '') }));
  box.appendChild(h('p', { class: 'ld-where', text: e.where }));
  box.appendChild(h('p', { class: 'fine', 'data-ld-uses': '1', text: e.ground ? 'The reference: in no lead, under all of them.' : 'On the ' + cable + ' cable → in ' + uses.join(', ') + (/^V/.test(cable) ? ' (its own lead only)' : (cable === 'RL' ? '' : '; and in every chest lead through the Wilson terminal')) + '.' }));
  const row = h('div', { class: 'ec-labbtns' }, [
    h('button', { type: 'button', class: 'btn sm', 'data-ld-off': '1', text: off ? 'Put it back on' : 'Let it fall off', onclick: () => { if (off) delete LDS.s.off[e.id]; else LDS.s.off[e.id] = true; LDS.mishap = 'custom'; ldRefresh(true); } }),
    h('button', { type: 'button', class: 'btn sm quiet' + (LDS.swapWith === e.id ? ' on' : ''), 'data-ld-swap': '1', 'aria-pressed': String(LDS.swapWith === e.id), text: LDS.swapWith === e.id ? 'Now click the other electrode…' : 'Swap its cable with…', onclick: () => { LDS.swapWith = LDS.swapWith === e.id ? null : e.id; ldRefresh(true); } }),
    h('button', { type: 'button', class: 'lnk', 'data-ld-home': '1', text: 'Back to its spot', onclick: () => { LDS.s.pos[e.id] = e.torso.slice(); LDS.mishap = 'custom'; ldRefresh(true); } })
  ]);
  box.appendChild(row);
  return box;
}
/* ---- the reading and the comparison */
function ldReading() {
  const vfn = ldVfn(), rd = LD.read(vfn, LDS.st), cmp = LD.compare(LDS.s, LDS.st);
  const box = h('div', { class: 'cd-reading ld-reading', 'data-ld-reading': '1' }, [h('h5', { text: 'What the tracing says (read from the traces)' })]);
  rd.flags.forEach(f => box.appendChild(h('p', { class: 'cd-line', 'data-ld-flag': f.id, text: f.text })));
  const chips = h('div', { class: 'ld-chips', 'data-ld-compare': '1' });
  LD.LEAD_NAMES.forEach(L => { const c = cmp.leads[L]; chips.appendChild(h('span', { class: 'ld-chip ' + (c.what === 'same' ? 'same' : (c.noisy ? 'noise' : (c.flat ? 'flat' : (c.inv ? 'inv' : 'chg')))), 'data-ld-chip': L, text: L + ' ' + (c.what === 'same' ? '=' : c.what) })); });
  box.appendChild(h('h5', { text: 'Versus the correct placement' }));
  box.appendChild(h('p', { class: 'fine', 'data-ld-axis': '1', text: cmp.axis0 === null ? '' : 'Frontal axis ' + cmp.axis0 + '° → ' + cmp.axis1 + '°' + (Math.abs(cmp.axis1 - cmp.axis0) >= 15 ? ' (the axis reads differently from the same heart)' : '') + '. ' + (cmp.changed.length ? cmp.changed.length + ' of 12 leads changed.' : 'No lead changed.') }));
  box.appendChild(chips);
  return box;
}
function ldPaper() {
  const vfn = ldVfn(), paper = ecgPaper(null, null, vfn);
  if (LDS.sel) { const cable = ldCableOf(LDS.sel); LD.LEAD_NAMES.forEach(L => { if (LD.LEAD_USES[L].indexOf(cable) >= 0) paper.svg.querySelectorAll('[data-lead="' + L + '"]').forEach(p => p.classList.add('ld-hi')); }); }
  return paper.svg;
}
function ldRefresh(full) {
  const root = document.querySelector('[data-leadslab]'); if (!root) return;
  const ts = root.querySelector('[data-ld-torsoslot]'); if (ts && full) { ts.textContent = ''; ts.appendChild(ldTorso()); }
  const pw = root.querySelector('[data-ld-paper]'); if (pw) { pw.textContent = ''; pw.appendChild(ldPaper()); }
  const rs = root.querySelector('[data-ld-readingslot]'); if (rs) { rs.textContent = ''; rs.appendChild(ldReading()); }
  const ep = root.querySelector('[data-ld-elslot]'); if (ep && full) { ep.textContent = ''; ep.appendChild(ldElPanel()); }
  const ms = root.querySelector('[data-ld-mishap]'); if (ms && ms.value !== LDS.mishap) ms.value = LDS.mishap;
  const tn = root.querySelector('[data-ld-teach]'); if (tn) { const m = LD.MISHAPS.filter(x => x.id === LDS.mishap)[0]; tn.textContent = m ? m.teach : 'Your own set-up: read the tracing and the comparison.'; }
  root.setAttribute('data-ld-state', LDS.mishap);
}
function leadsLab() {
  if (!LD || !window.PFT_COND) return h('p', { class: 'fine', text: 'The lead model did not load in this build.' });
  if (!LDS.s) LDS.s = LD.setup();
  if (!LDS.st) { LDS.st = ldSource(); LDS.cache = ldCache(LDS.st); }
  const C = window.PFT_COND;
  const mishapSel = h('select', { 'aria-label': 'Mishap', 'data-ld-mishap': '1', onchange: (e) => { LDS.mishap = e.target.value; LDS.s = LDS.mishap === 'custom' ? LDS.s : LD.mishap(LDS.mishap); LDS.swapWith = null; ldRefresh(true); } },
    LD.MISHAPS.map(m => h('option', { value: m.id, selected: m.id === LDS.mishap, text: m.name })).concat([h('option', { value: 'custom', text: 'Your own set-up', selected: LDS.mishap === 'custom' })]));
  const srcOpts = [['normal', 'Normal conduction']].concat(C.PRESETS.filter(p => p.id !== 'normal').map(p => [p.id, p.name])).concat([['stemi_inf_rv', 'Inferior STEMI with RV involvement (for V4R)']]);
  const srcSel = h('select', { 'aria-label': 'The heart', 'data-ld-src': '1', onchange: (e) => { LDS.src = e.target.value; LDS.st = ldSource(); LDS.cache = ldCache(LDS.st); ldRefresh(true); } }, srcOpts.map(o => h('option', { value: o[0], selected: o[0] === LDS.src, text: o[1] })));
  const root = h('div', { class: 'ld-lab', 'data-leadslab': '1', 'data-ld-state': LDS.mishap }, [
    h('div', { class: 'ecg-ctl' }, [h('label', { class: 'ecg-pick' }, [h('span', { class: 'lbl', text: 'Mishap ' }), mishapSel]), h('label', { class: 'ecg-pick' }, [h('span', { class: 'lbl', text: 'The heart ' }), srcSel]), h('button', { type: 'button', class: 'lnk', 'data-ld-reset': '1', text: 'Correct placement', onclick: () => { LDS.mishap = 'ok'; LDS.s = LD.setup(); LDS.sel = null; LDS.swapWith = null; ldRefresh(true); } })]),
    h('div', { class: 'ld-grid' }, [
      h('div', { class: 'ld-left' }, [h('figure', { class: 'an-fig ld-fig' }, [h('div', { 'data-ld-torsoslot': '1' }, [ldTorso()]), h('figcaption', { text: 'Anterior view. The chest is drawn unrolled: the edge of the silhouette is the mid-axillary line, and the shaded strip beyond it goes round the back for V7–V9. Electrode colours are the AHA code.' })]), h('div', { 'data-ld-elslot': '1' }, [ldElPanel()])]),
      h('div', { class: 'ld-right' }, [h('div', { class: 'ecg-wrap', 'data-ld-paper': '1' }, [ldPaper()]), h('p', { class: 'fine ld-teach', 'data-ld-teach': '1', text: LD.MISHAPS[0].teach }), h('div', { 'data-ld-readingslot': '1' }, [ldReading()])])
    ])
  ]);
  return root;
}
function leadsWidget(kind) { return kind === 'leads' ? leadsLab() : null; }
