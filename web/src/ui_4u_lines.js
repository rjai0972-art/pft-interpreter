/* Lines and waveforms (v8.8): the pattern galleries (arterial, venous, pulmonary artery and wedge), the real recordings beside the model, the
   troubleshooting lab, the real ultrasound frames, the drawn scanner and the needle. Models: waves.js, lines.js. */
const LN = window.PFT_LINES, WV = window.PFT_WAVES, WR = window.PFT_WAVEREAL, USR = window.PFT_USREAL;
const LNS = { art: 'normal', artVar: 'ok', artAlt: false, cvp: 'normal', cvpVent: 'spont', pa: 'float', wedge: 'normal', real: 'flush', us: 'sax1', usLabels: true,
  fix: { id: 'bubble', done: [], fixed: [], harm: 0, flush: false, results: {} }, sim: { scene: 'femoral', s: 0.3, c: 0, colour: false, labels: true, opt: 0 }, nd: { angle: 45, adv: 1.0, probe: 1.5 } };
const LN_COL = { ecg: '#5fd08a', art: '#ff6b6b', cvp: '#6fb4ff', pa: '#f2c744', paop: '#f2c744', rv: '#f2c744', resp: '#7fd6d6', ghost: '#7d93a3' };

/* ---------------------------------------------------------------- a still strip: lanes of traces on a monitor ground, with a reading cursor */
/* lanes: [{ h, label, unit, range: [lo, hi] | null, ticks, series: [{ y, fs, color, width, dash }] }]; opts: dur, spans [{ t0, t1, label, lane }],
   notes [{ t, lane, v, text, up }], vlines [{ t, label }], rTimes */
function lnStrip(cv, lanes, opts) {
  opts = opts || {}; const W = cv.width, H = cv.height, ctx = cv.getContext('2d'), dur = opts.dur || 8, padL = 34, padR = 6, tot = lanes.reduce((s, l) => s + (l.h || 1), 0);
  const X = t => padL + t / dur * (W - padL - padR); let y0 = 0;
  lanes.forEach(l => {
    l.y0 = y0; l.hpx = (l.h || 1) / tot * H; y0 += l.hpx;
    if (!l.range) { let lo = 1e9, hi = -1e9; l.series.forEach(s => { for (let i = 0; i < s.y.length; i++) { const v = s.y[i]; if (v < lo) lo = v; if (v > hi) hi = v; } }); const p = (hi - lo) * 0.1 || 1; l.range = [lo - p, hi + p * 1.6]; }
    l.Y = v => l.y0 + l.hpx - 5 - (Math.max(l.range[0], Math.min(l.range[1], v)) - l.range[0]) / (l.range[1] - l.range[0]) * (l.hpx - 12);
  });
  ctx.fillStyle = '#0b1620'; ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 1;
  for (let t = 0; t <= dur + 1e-6; t += 0.2) { const major = Math.abs(t - Math.round(t)) < 1e-6; ctx.strokeStyle = major ? '#1c3a4c' : '#12283a'; ctx.beginPath(); ctx.moveTo(X(t), 0); ctx.lineTo(X(t), H); ctx.stroke(); }
  ctx.font = '10px system-ui, sans-serif';
  (opts.spans || []).forEach(sp => { const l = sp.lane === undefined ? null : lanes[sp.lane], ya = l ? l.y0 : 0, hb = l ? l.hpx : H; ctx.fillStyle = sp.color || 'rgba(120, 190, 255, 0.10)'; ctx.fillRect(X(sp.t0), ya, X(sp.t1) - X(sp.t0), hb); if (sp.label) { ctx.fillStyle = '#a9c4d6'; ctx.textAlign = 'center'; ctx.fillText(sp.label, (X(sp.t0) + X(sp.t1)) / 2, ya + hb - 6); } });
  lanes.forEach((l, li) => {
    if (li) { ctx.strokeStyle = '#1f3a4c'; ctx.beginPath(); ctx.moveTo(0, l.y0); ctx.lineTo(W, l.y0); ctx.stroke(); }
    ctx.fillStyle = '#7d93a3'; ctx.textAlign = 'right';
    (l.ticks || []).forEach(v => { const y = l.Y(v); ctx.fillText(String(v), padL - 5, y + 3); ctx.fillStyle = '#16303f'; ctx.fillRect(padL, y, W - padL - padR, 1); ctx.fillStyle = '#7d93a3'; });
    l.series.forEach(s => {
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 1.7; ctx.setLineDash(s.dash || []); ctx.beginPath();
      const n = Math.min(s.y.length, Math.round(dur * s.fs)), step = Math.max(1, Math.floor(n / (W * 2)));
      for (let i = 0; i < n; i += step) { const x = X(i / s.fs), y = l.Y(s.y[i]); if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke(); ctx.setLineDash([]);
    });
    if (l.label) { ctx.fillStyle = l.series[0] ? l.series[0].color : '#fff'; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(l.label, W - 8, l.y0 + 13); ctx.font = '10px system-ui, sans-serif'; }
  });
  (opts.vlines || []).forEach(v => { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(v.t), 0); ctx.lineTo(X(v.t), H); ctx.stroke(); ctx.setLineDash([]); if (v.label) { ctx.fillStyle = '#d7e3ec'; ctx.textAlign = 'left'; ctx.fillText(v.label, X(v.t) + 3, 11); } });
  (opts.notes || []).forEach(nt => {
    const l = lanes[nt.lane || 0], x = X(nt.t), y = l.Y(nt.v), up = nt.up !== false, ty = up ? Math.max(l.y0 + 11, y - 13) : Math.min(l.y0 + l.hpx - 4, y + 19);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + (up ? -3 : 3)); ctx.lineTo(x, ty + (up ? 3 : -10)); ctx.stroke();
    ctx.font = '600 11px system-ui, sans-serif'; const w = ctx.measureText(nt.text).width + 8, tx = Math.max(padL + w / 2 + 2, Math.min(W - w / 2 - 2, x + (nt.dx || 0)));
    ctx.fillStyle = 'rgba(11, 22, 32, 0.85)'; ctx.fillRect(tx - w / 2, ty - 10, w, 14); ctx.fillStyle = '#f1f6fa'; ctx.textAlign = 'center'; ctx.fillText(nt.text, tx, ty + 1); ctx.font = '10px system-ui, sans-serif';
  });
  ctx.fillStyle = '#5f7686'; ctx.textAlign = 'center'; for (let t = 1; t < dur; t++) ctx.fillText(t + ' s', X(t), H - 2);
  /* the reading cursor */
  let base = null; try { base = ctx.getImageData(0, 0, W, H); } catch (e) { base = null; }
  const read = (clientX) => {
    if (!base) return; const r = cv.getBoundingClientRect(), px = (clientX - r.left) / r.width * W, t = (px - padL) / (W - padL - padR) * dur; ctx.putImageData(base, 0, 0);
    if (t < 0 || t > dur) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
    let lines = []; const rt = (opts.rTimes || []).filter(x => x <= t).pop();
    if (rt !== undefined) lines.push(Math.round((t - rt) * 1000) + ' ms after R'); else lines.push(t.toFixed(2) + ' s');
    lanes.forEach(l => { if (!l.unit) return; const s = l.series[0], i = Math.min(s.y.length - 1, Math.round(t * s.fs)); const v = s.y[i]; lines.push((l.short || l.label || '') + ' ' + (Math.abs(v) < 20 ? v.toFixed(1) : Math.round(v)) + ' ' + l.unit); ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(px, l.Y(v), 3, 0, 6.3); ctx.fill(); });
    ctx.font = '600 11px system-ui, sans-serif'; const w = Math.max.apply(null, lines.map(s => ctx.measureText(s).width)) + 10, bx = px + 8 + w > W ? px - 8 - w : px + 8;
    ctx.fillStyle = 'rgba(8, 16, 24, 0.9)'; ctx.fillRect(bx, 16, w, lines.length * 14 + 6); ctx.fillStyle = '#f1f6fa'; ctx.textAlign = 'left'; lines.forEach((s, i) => ctx.fillText(s, bx + 5, 30 + i * 14));
    cv.setAttribute('data-ln-read', lines.join(' · '));
  };
  cv.onmousemove = e => read(e.clientX); cv.onmouseleave = () => { if (base) ctx.putImageData(base, 0, 0); };
  cv.ontouchstart = cv.ontouchmove = e => { if (e.touches[0]) read(e.touches[0].clientX); };
  cv.lnRead = (t) => { const r = cv.getBoundingClientRect(); read(r.left + (padL + t / dur * (W - padL - padR)) / W * r.width); };
}
function lnCanvas(wpx, hpx, attrs) { return h('canvas', Object.assign({ class: 'ln-cv', width: wpx, height: hpx, role: 'img' }, attrs || {})); }
function lnTile(k, v, u, cls) { return h('div', { class: 'vsc-tile' + (cls ? ' ' + cls : ''), 'data-ln-tile': k }, [h('span', { class: 'vsc-k', text: k }), h('span', { class: 'vsc-v', text: v }), h('span', { class: 'vsc-u', text: u || '' })]); }
function lnPicker(items, cur, attr, onpick, grouped) {
  const sel = h('select', { [attr]: '1', 'aria-label': 'Pattern', onchange: (e) => onpick(e.target.value) });
  if (grouped) { const gs = []; items.forEach(p => { if (gs.indexOf(p.group) < 0) gs.push(p.group); }); gs.forEach(gn => sel.appendChild(h('optgroup', { label: gn }, items.filter(p => p.group === gn).map(p => h('option', { value: p.id, text: p.label, selected: p.id === cur }))))); }
  else items.forEach(p => sel.appendChild(h('option', { value: p.id, text: p.label, selected: p.id === cur })));
  sel.value = cur; return sel;
}
function lnText(o, extra) { return h('div', { class: 'ln-text', 'data-ln-text': '1' }, [h('p', {}, [h('b', { text: 'Look for. ' }), o.look]), h('p', {}, [h('b', { text: 'Why. ' }), o.means]), h('p', {}, [h('b', { text: 'At the bedside. ' }), o.act]), extra || null]); }
function lnStep(list, cur, dir) { const i = list.indexOf(cur); return list[(i + dir + list.length) % list.length]; }
function lnNav(ids, cur, attr, set) { return h('span', { class: 'ln-nav' }, [h('button', { type: 'button', class: 'btn sm quiet', [attr + '-prev']: '1', 'aria-label': 'Previous', text: '‹', onclick: () => set(lnStep(ids, cur, -1)) }), h('button', { type: 'button', class: 'btn sm quiet', [attr + '-next']: '1', 'aria-label': 'Next', text: '›', onclick: () => set(lnStep(ids, cur, 1)) })]); }

/* ---------------------------------------------------------------- the arterial gallery */
function lnArtFig() {
  const pat = LN.ART.filter(p => p.id === LNS.art)[0] || LN.ART[0], dur = 8, fs = 250; let cfg = Object.assign({}, pat.cfg), vnote = null;
  if (pat.variants) { const v = pat.variants.filter(x => x.id === LNS.artVar)[0] || pat.variants[0]; cfg.iabp = v.iabp; vnote = v.note || null; }
  if (pat.alt && LNS.artAlt) cfg = Object.assign({}, pat.alt.cfg);
  const s = WV.series(cfg, dur, fs), set = (id) => { LNS.art = id; LNS.artVar = 'ok'; LNS.artAlt = false; render(); };
  const cv = lnCanvas(920, 330, { 'data-ln-artcv': pat.id, 'aria-label': 'ECG and arterial pressure: ' + pat.label });
  let shown = s.art; const artLane = { h: 3.2, label: 'ART', short: 'ART', unit: 'mm Hg', series: [] }, notes = [], tiles = [];
  const rT = s.beats.v.map(b => b.tR).filter(t => t >= 0 && t < dur);
  if (pat.sites) {
    const cols = { aorta: '#9aa9ff', axillary: '#7fd6d6', femoral: '#5fd08a', radial: '#ff6b6b', dp: '#f2c744' }, rows = [];
    Object.keys(WV.SITES).forEach(k => { const sk = WV.series(Object.assign({}, cfg, { site: k }), dur, fs), st = WV.stats(sk.art, fs, 1, dur - 0.5); artLane.series.push({ y: sk.art, fs: fs, color: cols[k], width: k === 'radial' ? 2 : 1.4 }); rows.push([WV.SITES[k].label, Math.round(st.sbp) + '/' + Math.round(st.dbp), String(Math.round(st.map)), Math.round(WV.SITES[k].delay * 1000 + 90) + ' ms', cols[k]]); });
    artLane.series.reverse(); artLane.unit = '';
    tiles.push(h('table', { class: 'ln-sites', 'data-ln-sites': '1' }, [h('thead', {}, [h('tr', {}, ['Site', 'Systolic / diastolic', 'Mean', 'Upstroke after R'].map(x => h('th', { text: x })))]), h('tbody', {}, rows.map(r => h('tr', {}, [h('td', {}, [h('span', { class: 'ln-sw', style: 'background:' + r[4] }), r[0]]), h('td', { text: r[1] }), h('td', { text: r[2] }), h('td', { text: r[3] })])))]));
  } else {
    if (pat.sys) { shown = WV.measure(s.art, fs, Object.assign({ flushAt: 4.3, flushDur: 0.8 }, pat.sys)); artLane.series.push({ y: shown, fs: fs, color: LN_COL.art, width: 1.9 }, { y: s.art, fs: fs, color: LN_COL.ghost, width: 1, dash: [4, 3] }); artLane.range = [Math.min(30, s.nums.dbp - 30), 310]; artLane.ticks = [50, 100, 150, 200, 300]; notes.push({ t: 4.7, lane: 1, v: 300, text: 'fast flush', up: false }); }
    else artLane.series.push({ y: shown, fs: fs, color: LN_COL.art, width: 1.9 });
    const st = WV.stats(shown, fs, pat.sys ? 0.4 : 1, pat.sys ? 4.2 : dur - 0.3), tr = pat.sys ? WV.stats(s.art, fs, 0.4, 4.2) : null;
    tiles.push(lnTile(pat.sys ? 'Displayed' : 'Pressure', Math.round(st.sbp) + '/' + Math.round(st.dbp), 'mm Hg'), lnTile('Mean', String(Math.round(st.map)), 'mm Hg'), lnTile('Pulse pressure', String(Math.round(st.sbp - st.dbp)), 'mm Hg'));
    if (tr) { const fr = WV.flushRead(pat.sys.fn, pat.sys.zeta); tiles.push(lnTile('True', Math.round(tr.sbp) + '/' + Math.round(tr.dbp), 'mean ' + Math.round(tr.map)), lnTile('Flush test', fr.oscillations ? fr.oscillations + ' oscillations' : 'no bounce', fr.verdict)); }
    else if (cfg.ppv || cfg.paradox) { const f = WV.features(shown, fs).filter(q => q.foot > 0.5), pps = f.map(q => q.pp), sb = f.map(q => q.sbp), mx = Math.max.apply(null, pps), mn = Math.min.apply(null, pps); tiles.push(cfg.paradox ? lnTile('Paradox', String(Math.round(Math.max.apply(null, sb) - Math.min.apply(null, sb))), 'mm Hg fall in inspiration') : lnTile('PP variation', String(Math.round((mx - mn) / ((mx + mn) / 2) * 100)), '%')); }
    else tiles.push(lnTile('Heart rate', String(Math.round(60 / s.tm.T)), '/min'));
    const m = s.marks.filter(q => q.foot > 1.2 && !q.pvc)[0], val = (t) => shown[Math.min(shown.length - 1, Math.round(t * fs))];
    if (pat.id === 'normal' && m) notes.push({ t: m.foot, lane: 1, v: val(m.foot), text: 'foot', up: false }, { t: m.peak, lane: 1, v: val(m.peak), text: 'systolic peak' }, { t: m.notch, lane: 1, v: val(m.notch), text: 'notch', up: false, dx: 4 }, { t: m.notch + 0.07, lane: 1, v: val(m.notch + 0.07), text: 'dicrotic wave', dx: 44 }, { t: m.notch + 0.3, lane: 1, v: val(m.notch + 0.3), text: 'run-off', dx: 30 });
    if (pat.id === 'iabp') { const a = s.marks.filter(q => q.assisted && q.foot > 0.8)[0], nx = a && s.marks.filter(q => q.foot > a.foot + 0.1)[0]; if (a && nx) notes.push({ t: a.peak, lane: 1, v: val(a.peak), text: 'unassisted systole', dx: -52 }, { t: a.notch + 0.13, lane: 1, v: val(a.notch + 0.13), text: 'augmentation', dx: 40 }, { t: nx.foot, lane: 1, v: val(nx.foot), text: 'assisted end-diastole', up: false }, { t: nx.peak, lane: 1, v: val(nx.peak), text: 'assisted systole', dx: 46 }); }
    if (pat.id === 'as' && m) notes.push({ t: m.foot + 0.07, lane: 1, v: val(m.foot + 0.07), text: 'anacrotic shoulder', up: false, dx: 30 });
    if (pat.id === 'ar' && m) notes.push({ t: m.peak + 0.06, lane: 1, v: val(m.peak + 0.06), text: 'two peaks' });
    if (pat.id === 'pvc') { const q = s.marks.filter(z => z.pvc && z.foot > 0.6)[0]; if (q) { const nx = s.marks.filter(z => z.foot > q.foot + 0.05)[0]; notes.push({ t: q.peak, lane: 1, v: val(q.peak), text: 'ectopic: little ejected' }); if (nx) notes.push({ t: nx.peak, lane: 1, v: val(nx.peak), text: cfg.brock ? 'smaller after the pause' : 'larger after the pause', dx: 40 }); } }
  }
  const lanes = [{ h: 1, label: 'ECG', series: [{ y: s.ecg, fs: fs, color: LN_COL.ecg, width: 1.2 }], range: [-0.6, 1.3] }, artLane];
  if (cfg.ppv || cfg.paradox) lanes.push({ h: 0.5, label: cfg.vent === 'spont' ? 'breath (in ↑), spontaneous' : 'breath (in ↑), ventilator', series: [{ y: s.resp, fs: fs, color: LN_COL.resp, width: 1.2 }], range: [-0.2, 1.4] });
  const fig = h('figure', { class: 'an-fig ec-fig ec-lab ln-fig', 'data-ln-art': pat.id }, [
    h('div', { class: 'ec-bar ln-bar' }, [h('label', { class: 'nod-f' }, [h('span', { class: 'nod-l', text: 'Arterial pattern' }), lnPicker(LN.ART, pat.id, 'data-ln-artsel', set, true)]), lnNav(LN.ART.map(p => p.id), pat.id, 'data-ln-art', set),
      pat.variants ? h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Timing' }, pat.variants.map(v => h('button', { type: 'button', class: 'ch', role: 'radio', 'aria-checked': String(v.id === LNS.artVar), 'data-ln-var': v.id, text: v.label, onclick: () => { LNS.artVar = v.id; render(); } }))) : null,
      pat.alt ? h('label', { class: 'chk' }, [h('input', { type: 'checkbox', 'data-ln-alt': '1', checked: LNS.artAlt, onchange: (e) => { LNS.artAlt = e.target.checked; render(); } }), pat.alt.label]) : null,
      tipI('Move the pointer over the strip to read the time after the R wave and the pressure at that instant. The dashed grey trace, where there is one, is the true pressure in the artery.', 'Reading the strip')]),
    h('div', { class: 'ec-main ln-main' }, [h('div', { class: 'ln-left' }, [cv, h('div', { class: 'vsc-tiles ln-tiles' }, tiles)]), lnText(pat, vnote ? h('p', { class: 'ln-var', 'data-ln-varnote': '1' }, [h('b', { text: 'This timing. ' }), vnote]) : null)]),
    h('figcaption', { text: 'Drawn by the waveform model (waves.js): each landmark is placed in milliseconds from the R wave and the trace scaled to the pressures shown. ' + LN.ART.length + ' patterns.' })
  ]);
  setTimeout(() => lnStrip(cv, lanes, { dur: dur, notes: notes, rTimes: rT }), 0);
  return fig;
}

/* ---------------------------------------------------------------- the venous gallery */
function lnCvpFig() {
  const ids = Object.keys(WV.CVP), id = WV.CVP[LNS.cvp] ? LNS.cvp : 'normal', c = WV.CVP[id], tx = LN.CVPTXT[id], dur = 8, fs = 250, spont = LNS.cvpVent === 'spont';
  const cfg = { hr: c.hr || 74, cvp: id, rhythm: c.rhythm || 'sinus', pr: c.pr, vent: LNS.cvpVent, rr: 13, seed: 11 }, s = WV.series(cfg, dur, fs), set = (k) => { LNS.cvp = k; render(); };
  const cv = lnCanvas(920, 330, { 'data-ln-cvpcv': id, 'aria-label': 'ECG and central venous pressure: ' + c.label });
  const val = (t) => s.cvp[Math.max(0, Math.min(s.cvp.length - 1, Math.round(t * fs)))], notes = [], spans = [];
  /* end-expiration: on a ventilator the lowest stretch, breathing alone the highest; mark it and read there, at the R wave */
  let t0 = null; const ee = [];
  for (let i = 0; i < s.resp.length; i++) { const on = s.resp[i] < 0.06; if (on && t0 === null) t0 = i / fs; if ((!on || i === s.resp.length - 1) && t0 !== null) { if (i / fs - t0 > 0.5) ee.push([t0, i / fs]); t0 = null; } }
  ee.forEach((e, i) => spans.push({ t0: e[0], t1: e[1], lane: 1, label: i === 0 ? 'end-expiration' : '' }));
  const rT = s.beats.v.map(b => b.tR).filter(t => t >= 0.05 && t < dur), zs = rT.filter(t => ee.some(e => t >= e[0] && t <= e[1])).map(val), z = zs.length ? zs.reduce((a, b) => a + b, 0) / zs.length : val(rT[0] || 1), mean = WV.stats(s.cvp, fs, 0, dur).map;
  const b = s.beats.v.filter(q => q.tR > 1.6 && !q.pvc && ee.every(e => q.tR < e[0] - 0.9 || q.tR > e[0] - 0.2))[0] || s.beats.v.filter(q => q.tR > 1.2)[0];
  if (b) {
    const R = b.tR, tV = R + s.tm.pep + s.tm.lvet + 0.05, P = (cfg.pr || 0.16);
    const add = (t, text, up) => notes.push({ t: t, lane: 1, v: val(t), text: text, up: up });
    if (id === 'af') { add(R + 0.07, 'c', true); add(tV, 'v', true); add(tV + 0.115, 'y', false); }
    else if (id === 'tr') { add(tV - 0.02, 'c–v', true); add(tV + 0.115, 'y', false); add(R - P + 0.1, 'a', true); }
    else if (id === 'chb' || id === 'junctional' || id === 'pvc') { let best = -1, bv = -1e9; for (let i = Math.round(0.5 * fs); i < s.cvp.length - 10; i++) if (s.cvp[i] > bv) { bv = s.cvp[i]; best = i; } add(best / fs, 'cannon a', true); }
    else { add(R - P + 0.1, 'a', true); if (c.c > 1 && id !== 'tamponade') add(R + 0.07, 'c', true); add(R + 0.2, 'x', false); add(tV, 'v', true); add(tV + 0.115, id === 'tamponade' ? 'no y' : 'y', false); }
  }
  const lanes = [{ h: 1, label: 'ECG', series: [{ y: s.ecg, fs: fs, color: LN_COL.ecg, width: 1.2 }], range: [-0.6, 1.3] }, { h: 3, label: 'CVP', short: 'CVP', unit: 'mm Hg', series: [{ y: s.cvp, fs: fs, color: LN_COL.cvp, width: 1.9 }] }, { h: 0.5, label: spont ? 'breath (in ↑), spontaneous' : 'breath (in ↑), ventilator', series: [{ y: s.resp, fs: fs, color: LN_COL.resp, width: 1.2 }], range: [-0.2, 1.4] }];
  const fig = h('figure', { class: 'an-fig ec-fig ec-lab ln-fig', 'data-ln-cvp': id }, [
    h('div', { class: 'ec-bar ln-bar' }, [h('label', { class: 'nod-f' }, [h('span', { class: 'nod-l', text: 'Venous pattern' }), lnPicker(ids.map(k => ({ id: k, label: WV.CVP[k].label })), id, 'data-ln-cvpsel', set)]), lnNav(ids, id, 'data-ln-cvp', set),
      h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Breathing' }, [['spont', 'Breathing alone'], ['ppv', 'On the ventilator']].map(v => h('button', { type: 'button', class: 'ch', role: 'radio', 'aria-checked': String(v[0] === LNS.cvpVent), 'data-ln-vent': v[0], text: v[1], onclick: () => { LNS.cvpVent = v[0]; render(); } }))),
      tipI('The shaded stretches are end-expiration. The number to report is read there, at the R wave (the base of the c wave). The monitor’s number is the average of everything.', 'Where to read')]),
    h('div', { class: 'ec-main ln-main' }, [h('div', { class: 'ln-left' }, [cv, h('div', { class: 'vsc-tiles ln-tiles' }, [lnTile('At end-expiration', z.toFixed(0), 'mm Hg, at the R wave'), lnTile('Monitor mean', mean.toFixed(0), 'mm Hg'), lnTile('Rhythm', cfg.rhythm === 'sinus' ? 'sinus ' + cfg.hr : cfg.rhythm === 'af' ? 'fibrillation' : cfg.rhythm === 'chb' ? 'complete block' : cfg.rhythm, ''), lnTile('With inspiration', c.kussmaul && spont ? 'rises' : spont ? 'falls' : 'rises', c.kussmaul && spont ? 'Kussmaul’s sign' : spont ? 'normal' : 'pushed up by the ventilator')])]), lnText(tx)]),
    h('figcaption', { text: 'Drawn by the waveform model: a 100 ms after the start of the P wave, c at the end of the QRS, x in mid-systole, v at the end of the T wave, y after it. A P wave that lands in systole draws its own cannon wave.' })
  ]);
  setTimeout(() => lnStrip(cv, lanes, { dur: dur, notes: notes, spans: spans, rTimes: rT }), 0);
  return fig;
}

/* ---------------------------------------------------------------- floating the catheter; the wedge */
const LN_PA = { normal: [25, 10], mr: [52, 26], stiff: [46, 22], af: [38, 18], ms: [58, 26] };
function lnPaFig() {
  const wid = WV.WEDGE[LNS.wedge] ? LNS.wedge : 'normal', wd = WV.WEDGE[wid], pos = LNS.pa, dur = 10, fs = 250, pp = LN_PA[wid];
  const cfg = { hr: 78, pas: pp[0], pad: pp[1], cvp: 'normal', wedge: wid, rhythm: wd.rhythm || 'sinus', paV: wid === 'mr' ? 9 : 0, swing: 1.2, vent: 'spont', rr: 12, rvedp: 5 }, s = WV.series(cfg, dur, fs), n = s.t.length;
  const cv = lnCanvas(920, 330, { 'data-ln-pacv': pos, 'aria-label': 'ECG and the pressure at the catheter tip' }), tip = new Float32Array(n), spans = [], notes = [], rT = s.beats.v.map(b => b.tR).filter(t => t >= 0 && t < dur);
  const chans = { ra: s.cvp, rv: s.rv, pa: s.pa, wedge: s.paop }, names = { ra: 'Right atrium', rv: 'Right ventricle', pa: 'Pulmonary artery', wedge: 'Wedge' }, depth = { ra: '15–20 cm', rv: '25–35 cm', pa: '40–50 cm', wedge: '45–55 cm' };
  if (pos === 'float') { const seg = ['ra', 'rv', 'pa', 'wedge']; for (let i = 0; i < n; i++) { const k = Math.min(3, Math.floor(i / n * 4)); tip[i] = chans[seg[k]][i]; } seg.forEach((k, i) => spans.push({ t0: i * dur / 4, t1: (i + 1) * dur / 4, lane: 1, label: names[k] + ' · ' + depth[k], color: i % 2 ? 'rgba(120,190,255,0.07)' : 'rgba(120,190,255,0.0)' })); }
  else tip.set(chans[pos]);
  const val = (t) => tip[Math.min(n - 1, Math.round(t * fs))];
  if (pos === 'float') notes.push({ t: 2.7, lane: 1, v: val(2.7), text: 'systolic steps up', dx: 20 }, { t: 5.55, lane: 1, v: Math.min.apply(null, Array.from(tip.subarray(Math.round(5.1 * fs), Math.round(6 * fs)))), text: 'diastolic steps up', up: false, dx: 30 }, { t: 7.9, lane: 1, v: val(7.9), text: 'atrial trace again', dx: 20 });
  if (pos === 'wedge') { const b = s.beats.v.filter(q => q.tR > 1.5)[0]; if (b) { const tV = b.tR + s.tm.pep + s.tm.lvet + 0.05 + 0.14; if (wd.a) notes.push({ t: b.tR - 0.16 + 0.1 + 0.14, lane: 1, v: val(b.tR - 0.16 + 0.24), text: 'a (after the QRS)', dx: -10 }); notes.push({ t: tV, lane: 1, v: val(tV), text: 'v (after the T wave)', dx: 30 }); } }
  if (pos === 'rv') { const b = s.beats.v.filter(q => q.tR > 1.5)[0]; if (b) notes.push({ t: b.tR + 0.62, lane: 1, v: val(b.tR + 0.62), text: 'diastole rises', up: false }); }
  if (pos === 'pa') { const b = s.beats.v.filter(q => q.tR > 1.5)[0]; if (b) notes.push({ t: b.tR + 0.6, lane: 1, v: val(b.tR + 0.6), text: 'diastole falls', dx: 20 }, { t: b.tR + s.tm.pep + s.tm.rvet, lane: 1, v: val(b.tR + s.tm.pep + s.tm.rvet), text: 'notch', up: false }); }
  const lane = { h: 3, label: pos === 'float' ? 'CATHETER TIP' : names[pos].toUpperCase(), short: 'Tip', unit: 'mm Hg', series: [{ y: tip, fs: fs, color: LN_COL.pa, width: 1.9 }], range: [-3, Math.max(34, pp[0] + 12)], ticks: pp[0] > 40 ? [0, 20, 40, 60] : [0, 10, 20, 30] };
  if (pos === 'wedge') lane.series.push({ y: s.pa, fs: fs, color: LN_COL.ghost, width: 1, dash: [4, 3] });
  const st = WV.stats(pos === 'float' ? s.pa : tip, fs, 0.5, dur), ws = WV.stats(s.paop, fs, 0.5, dur), tx = pos === 'wedge' ? LN.WEDGETXT[wid] : null;
  const what = { float: ['One strip, four chambers', 'Advance with the balloon up and name each chamber as it arrives. Entering the ventricle the systolic pressure jumps and the diastolic falls to near zero; entering the pulmonary artery the systolic stays and the diastolic jumps; wedging, the pulse disappears and an atrial trace returns, at or below the pulmonary artery diastolic.', 'Balloon up before leaving the atrium; never withdraw with it inflated. Ectopics are expected in the ventricle: keep moving through.'],
    ra: ['Right atrium', 'a, c and v waves on a low mean, just like the venous trace of the previous topic — the catheter is one.', 'Inflate the balloon here (about 20 cm from the right internal jugular) and let the flow carry it.'],
    rv: ['Right ventricle', 'A tall systolic wave with no notch. Diastole begins near zero and climbs as the chamber fills, with a small atrial kick before the next beat.', 'Do not linger: ectopics and right bundle branch block happen here (in a patient with left bundle branch block, have pacing at hand).'],
    pa: ['Pulmonary artery', 'The same systolic pressure, but diastole now starts high and falls, with a notch on the downslope. The upstroke begins about 90 ms after the R wave.', 'This is where the tip lives. The diastolic pressure is 1–4 mm Hg above the wedge unless the pulmonary vascular resistance is raised.']
  }[pos];
  const fig = h('figure', { class: 'an-fig ec-fig ec-lab ln-fig', 'data-ln-pa': pos }, [
    h('div', { class: 'ec-bar ln-bar' }, [h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Where the tip is' }, [['float', 'Float it'], ['ra', 'Right atrium'], ['rv', 'Right ventricle'], ['pa', 'Pulmonary artery'], ['wedge', 'Wedge']].map(v => h('button', { type: 'button', class: 'ch', role: 'radio', 'aria-checked': String(v[0] === pos), 'data-ln-pos': v[0], text: v[1], onclick: () => { LNS.pa = v[0]; render(); } }))),
      h('label', { class: 'nod-f' }, [h('span', { class: 'nod-l', text: 'The left atrium' }), lnPicker(Object.keys(WV.WEDGE).map(k => ({ id: k, label: WV.WEDGE[k].label })), wid, 'data-ln-wedgesel', (k) => { LNS.wedge = k; if (LNS.pa !== 'float') LNS.pa = 'wedge'; render(); })]),
      tipI('Distances are from the right internal jugular vein. The dashed grey trace on the wedge view is the pulmonary artery pressure, for comparison.', 'Floating the catheter')]),
    h('div', { class: 'ec-main ln-main' }, [h('div', { class: 'ln-left' }, [cv, h('div', { class: 'vsc-tiles ln-tiles' }, [lnTile('Pulmonary artery', Math.round(WV.stats(s.pa, fs, 0.5, dur).sbp) + '/' + Math.round(WV.stats(s.pa, fs, 0.5, dur).dbp), 'mm Hg'), lnTile('Wedge (mean)', String(Math.round(ws.map)), 'mm Hg'), lnTile('Right atrium', String(Math.round(WV.stats(s.cvp, fs, 0.5, dur).map)), 'mm Hg'), lnTile('From the right IJ', pos === 'float' ? '15 → 55' : depth[pos].replace(' cm', ''), 'cm')])]),
      tx ? lnText(tx) : h('div', { class: 'ln-text', 'data-ln-text': '1' }, [h('p', {}, [h('b', { text: what[0] + '. ' }), what[1]]), h('p', {}, [h('b', { text: 'At the bedside. ' }), what[2]])])]),
    h('figcaption', { text: 'Drawn by the waveform model. The wedge trace carries left atrial events about 140 ms late; the pulmonary artery beat was shaped against a real recording (next topic).' })
  ]);
  setTimeout(() => lnStrip(cv, [{ h: 1, label: 'ECG', series: [{ y: s.ecg, fs: fs, color: LN_COL.ecg, width: 1.2 }], range: [-0.6, 1.3] }, lane], { dur: dur, notes: notes, spans: spans, rTimes: rT }), 0);
  return fig;
}

/* ---------------------------------------------------------------- real recordings, and the model held against them */
const LN_REAL = {
  flush: { label: 'A line is zeroed, then flushed', dur: 20, say: 'A radial arterial line at the start of monitoring. For the first seconds the transducer is open to air and the monitor is being zeroed: a flat line at 0 while the ECG runs on. Then the flush is pulled twice — the trace jumps to the top of the scale — and released. After the second release the pressure dives, bounces once and settles into the arterial trace: a fast-flush test with one to two oscillations, the response of a line that tells the truth.', pearl: 'Count the bounces after the square wave on your own monitor exactly as here. None, with a slow return: overdamped. Three or more: underdamped.',
    spans: [[0.2, 7.5, 'open to air: zero'], [7.75, 8.65, 'flush'], [9.45, 10.25, 'flush']], notes: [[10.33, 'release: dive and one bounce', false], [14.5, 'the arterial trace', true]] },
  radial: { label: 'A radial arterial trace', dur: 10, model: 'art', say: 'Ten seconds from the same line, about 157/82 at 68 /min. A brisk upstroke, a broad rounded peak, a notch a little under halfway down, a small dicrotic wave and a long run-off. The steps in the trace are the monitor’s 1 mm Hg resolution.', pearl: 'Below, the beats of this strip are averaged and the model’s beat at the same rate and pressures is laid over them (dashed): the upstroke, the place and height of the notch and the run-off agree; the real peak is a little broader.' },
  zero: { label: 'The trace falls to zero — the ECG does not', dur: 16, say: 'A normal arterial trace drops to zero between one beat and the next and stays there. The ECG is unchanged: the same rate, the same complexes.', pearl: 'A pressure of zero with an unchanged rhythm is a stopcock turned off to the patient, a disconnection, or someone zeroing — look at the patient and the pleth before calling for help, then at the stopcocks. A real arrest changes the ECG, the pleth and the patient together.', notes: [[8.4, 'stopcock turned: 0 mm Hg', true]] },
  pa: { label: 'Pulmonary artery, systemic artery and ECG together', dur: 16, model: 'pa', say: 'One patient, three pressures of the same beats: the systemic artery (84/42), the pulmonary artery (about 28/12) and the ECG, with the breath beneath. The pulmonary artery upstroke starts about 90 ms after the R wave and the radial one about 175 ms after it. The pulmonary beat is rounder, with a high notch. Its diastolic pressure swings by several mm Hg with each breath.', pearl: 'Which beat would you report? The pulmonary artery diastolic at end-expiration — read from a strip, never from the monitor’s running average.' },
  finger: { label: 'A finger-cuff pressure, calibrating itself', dur: 10, say: 'A continuous non-invasive pressure from a finger cuff (the volume-clamp method). In the middle the pulse is replaced by square steps for a few beats.', pearl: 'The steps are the device re-finding its set-point, not an arrhythmia or a cardiac arrest. Finger-cuff systems are reasonable in the operating room and are not recommended in shock, where the finger is vasoconstricted.' }
};
function lnBeatAvg(y, fs, feats, T) { const n = Math.round(T * fs), out = new Float32Array(n); let k = 0; feats.forEach(f => { const i0 = Math.round(f.foot * fs); if (i0 + n >= y.length) return; for (let i = 0; i < n; i++) out[i] += y[i0 + i]; k++; }); for (let i = 0; i < n; i++) out[i] /= Math.max(1, k); return out; }
function lnRealFig() {
  const id = LN_REAL[LNS.real] ? LNS.real : 'flush', R = LN_REAL[id], d = WR.strip(id), fs = d.fs, dur = R.dur, ids = Object.keys(LN_REAL), set = (k) => { LNS.real = k; render(); };
  const cv = lnCanvas(920, id === 'pa' ? 400 : 330, { 'data-ln-realcv': id, 'aria-label': 'A real recording: ' + R.label });
  const lanes = [{ h: 1, label: 'ECG', series: [{ y: d.ecg, fs: fs, color: LN_COL.ecg, width: 1.1 }] }, { h: 3, label: id === 'finger' ? 'FINGER CUFF' : 'ART', short: 'ART', unit: 'mm Hg', series: [{ y: d.art, fs: fs, color: LN_COL.art, width: 1.7 }] }];
  if (id === 'flush') { lanes[1].range = [-15, 285]; lanes[1].ticks = [0, 100, 200]; }
  if (d.pa) lanes.push({ h: 2.2, label: 'PA', short: 'PA', unit: 'mm Hg', series: [{ y: d.pa, fs: fs, color: LN_COL.pa, width: 1.7 }], ticks: [10, 20, 30] });
  if (d.resp) lanes.push({ h: 0.6, label: 'respiration', series: [{ y: d.resp, fs: fs, color: LN_COL.resp, width: 1.2 }] });
  const val = (t) => d.art[Math.min(d.art.length - 1, Math.round(t * fs))], spans = (R.spans || []).map(x => ({ t0: x[0], t1: x[1], lane: 1, label: x[2] })), notes = (R.notes || []).map(x => ({ t: x[0], lane: 1, v: val(x[0]), text: x[1], up: x[2] }));
  /* the model at the same rate and pressures */
  let cmp = null;
  if (R.model) {
    const y = R.model === 'pa' ? d.pa : d.art, f = WV.features(y, fs), fsum = WV.featureSummary(y, fs), cfg = R.model === 'pa' ? { hr: fsum.hr, pas: fsum.sbp, pad: fsum.dbp, sbp: 84, dbp: 42, swing: 0 } : { hr: fsum.hr, sbp: fsum.sbp, dbp: fsum.dbp, swing: 0 };
    const ms = WV.series(cfg, 8, 500), my = R.model === 'pa' ? ms.pa : ms.art, mf = WV.featureSummary(my, 500), T = 60 / fsum.hr, rb = lnBeatAvg(y, fs, f, T), mfe = WV.features(my, 500), mb = lnBeatAvg(my, 500, mfe.slice(1, 4), T);
    const row = (k, a, b, u) => h('tr', {}, [h('th', { scope: 'row', text: k }), h('td', { text: a + u }), h('td', { text: b + u })]);
    const bc = lnCanvas(420, 250, { 'data-ln-beatcv': id, 'aria-label': 'One real beat and the model’s beat' });
    cmp = h('div', { class: 'ln-cmp', 'data-ln-cmp': id }, [h('h5', { text: 'One averaged real beat and the model’s' }), h('div', { class: 'ln-cmpgrid' }, [bc,
      h('table', { class: 'ln-sites', 'data-ln-cmptable': '1' }, [h('thead', {}, [h('tr', {}, ['', 'Real', 'Model'].map(x => h('th', { text: x })))]), h('tbody', {}, [row('Upstroke', Math.round(fsum.up * 1000), Math.round(mf.up * 1000), ' ms'), row('Foot to notch', Math.round(fsum.tn * 1000), Math.round(mf.tn * 1000), ' ms'), row('Notch height', fsum.hn.toFixed(2), mf.hn.toFixed(2), ''), row('(Mean − diastolic) / pulse', fsum.ff.toFixed(2), mf.ff.toFixed(2), '')])])])]);
    setTimeout(() => lnStrip(bc, [{ h: 1, label: 'solid: real · dashed: model', unit: 'mm Hg', short: '', series: [{ y: rb, fs: fs, color: R.model === 'pa' ? LN_COL.pa : LN_COL.art, width: 2 }, { y: mb, fs: 500, color: '#e8eef3', width: 1.3, dash: [5, 4] }] }], { dur: T }), 0);
  }
  const fig = h('figure', { class: 'an-fig ec-fig ec-lab ln-fig', 'data-ln-real': id }, [
    h('div', { class: 'ec-bar ln-bar' }, [h('label', { class: 'nod-f' }, [h('span', { class: 'nod-l', text: 'Recording' }), lnPicker(ids.map(k => ({ id: k, label: LN_REAL[k].label })), id, 'data-ln-realsel', set)]), lnNav(ids, id, 'data-ln-real', set), h('span', { class: 'chip-mini', text: 'real · 125 Hz' })]),
    h('div', { class: 'ec-main ln-main' }, [h('div', { class: 'ln-left' }, [cv, cmp]), h('div', { class: 'ln-text', 'data-ln-text': '1' }, [h('p', {}, [h('b', { text: 'What you are looking at. ' }), R.say]), h('p', {}, [h('b', { text: 'Pearl. ' }), R.pearl])])]),
    h('figcaption', { text: WR.credit })
  ]);
  setTimeout(() => lnStrip(cv, lanes, { dur: dur, spans: spans, notes: notes }), 0);
  return fig;
}

/* ---------------------------------------------------------------- the troubleshooting lab */
function lnFixCase() { return LN.CASES.filter(c => c.id === LNS.fix.id)[0] || LN.CASES[0]; }
function lnFixLoad(id) { LNS.fix = { id: id, done: [], fixed: [], harm: 0, flush: false, results: LNS.fix.results || {} }; }
function lnFixSolved(c) { return c.fix.every(a => LNS.fix.fixed.indexOf(a) >= 0); }
function lnFixDo(a) {
  const c = lnFixCase(), F = LNS.fix; if (F.done.indexOf(a) < 0) F.done.push(a);
  if (a === 'flush') F.flush = true;
  if (c.fix.indexOf(a) >= 0 && F.fixed.indexOf(a) < 0) F.fixed.push(a);
  if ((a === 'pressor' || a === 'fluid') && !lnFixSolved(c)) F.harm++;
  if (lnFixSolved(c) && !F.results[c.id]) F.results[c.id] = { checks: F.done.length, harm: F.harm };
  render();
}
function lnFixSignals(c, solved) {
  const fs = 250, dur = 8, F = LNS.fix, part = c.fix.length > 1 ? F.fixed.length / c.fix.length : (solved ? 1 : 0);
  if (c.ch === 'art') {
    const s = WV.series(c.truth, dur, fs), good = { fn: 22, zeta: 0.58 }, f = c.fault, sys = { fn: f.fn + (good.fn - f.fn) * part, zeta: f.zeta + (good.zeta - f.zeta) * part, offset: solved ? 0 : (f.offset || 0) };
    if (f.kink && !solved) { sys.kink = f.kink; sys.kinkMean = WV.stats(s.art, fs, 0, dur).map; }
    if (F.flush) { sys.flushAt = 4.4; sys.flushDur = 0.8; }
    const y = WV.measure(s.art, fs, sys), st = WV.stats(y, fs, 0.5, F.flush ? 4.3 : dur), lanes = [{ h: 1, label: 'ECG', series: [{ y: s.ecg, fs: fs, color: LN_COL.ecg, width: 1.2 }], range: [-0.6, 1.3] }, { h: 3, label: 'ART (radial)', short: 'ART', unit: 'mm Hg', series: [{ y: y, fs: fs, color: LN_COL.art, width: 1.9 }] }];
    if (F.flush) { lanes[1].range = [Math.min(20, st.dbp - 30), 310]; lanes[1].ticks = [50, 100, 150, 200, 300]; }
    const tiles = [lnTile('ART', Math.round(st.sbp) + '/' + Math.round(st.dbp), 'mm Hg'), lnTile('Mean', String(Math.round(st.map)), 'mm Hg'), lnTile('Heart rate', String(c.truth.hr), '/min')];
    if (c.central && F.done.indexOf('site') >= 0) { const sc = WV.series(c.central, dur, fs), cs = WV.stats(sc.art, fs, 0.5, dur); lanes[1].series.push({ y: sc.art, fs: fs, color: '#5fd08a', width: 1.5 }); lanes[1].range = null; tiles.push(lnTile('Femoral', Math.round(cs.sbp) + '/' + Math.round(cs.dbp), 'mean ' + Math.round(cs.map), 'ok')); }
    else if (F.done.indexOf('patient') >= 0 && c.cuff) tiles.push(lnTile('Cuff', c.cuff.replace(/ \(.*/, ''), (c.cuff.match(/\((\d+)\)/) || ['', ''])[1] ? 'mean ' + c.cuff.match(/\((\d+)\)/)[1] : ''));
    return { lanes: lanes, tiles: tiles, dur: dur, rT: s.beats.v.map(b => b.tR).filter(t => t >= 0 && t < dur), key: Math.round(st.sbp) + '/' + Math.round(st.dbp) };
  }
  if (c.ch === 'cvp') {
    const s = WV.series(c.truth, dur, fs), y = new Float32Array(s.cvp.length), Tb = 60 / c.truth.rr, spans = [], zs = [];
    for (let i = 0; i < y.length; i++) { let ph = (i / fs / Tb) % 1; const push = ph > 0.36 && ph < 0.86 ? Math.pow(Math.sin(Math.PI * (ph - 0.36) / 0.5), 1.3) : 0; y[i] = s.cvp[i] + c.truth.forced * push - 2.5 * s.resp[i]; }
    for (let k = 0; k * Tb < dur; k++) { const a = (k + 0.88) * Tb, b = (k + 0.99) * Tb; if (b < dur) { if (solved) spans.push({ t0: a, t1: b, lane: 1, label: k === 0 ? 'read here' : '' }); zs.push(y[Math.round((a + b) / 2 * fs)]); } }
    const mean = WV.stats(y, fs, 0, dur).map, z = zs.reduce((p, q) => p + q, 0) / Math.max(1, zs.length);
    return { lanes: [{ h: 1, label: 'ECG', series: [{ y: s.ecg, fs: fs, color: LN_COL.ecg, width: 1.2 }], range: [-0.6, 1.3] }, { h: 3, label: 'CVP', short: 'CVP', unit: 'mm Hg', series: [{ y: y, fs: fs, color: LN_COL.cvp, width: 1.9 }], ticks: [0, 10, 20] }, { h: 0.5, label: 'breath (in ↑)', series: [{ y: s.resp, fs: fs, color: LN_COL.resp, width: 1.2 }], range: [-0.2, 1.4] }], spans: spans,
      tiles: [lnTile('CVP (monitor)', String(Math.round(mean)), 'mm Hg, mean'), solved ? lnTile('End-expiration', String(Math.round(z)), 'mm Hg, at the R wave', 'ok') : lnTile('Swing', String(Math.round(c.truth.forced)), 'mm Hg per breath'), lnTile('Resp. rate', String(c.truth.rr), '/min')], dur: dur, rT: s.beats.v.map(b => b.tR).filter(t => t >= 0 && t < dur), key: String(Math.round(solved ? z : mean)) };
  }
  const s = WV.series(c.truth, dur, fs), y = solved ? s.pa : s.paop, st = WV.stats(y, fs, 0.5, dur);
  return { lanes: [{ h: 1, label: 'ECG', series: [{ y: s.ecg, fs: fs, color: LN_COL.ecg, width: 1.2 }], range: [-0.6, 1.3] }, { h: 3, label: 'PA channel', short: 'PA', unit: 'mm Hg', series: [{ y: y, fs: fs, color: LN_COL.pa, width: 1.9 }], range: [-2, 46], ticks: [0, 10, 20, 30, 40] }],
    tiles: [lnTile('PA', solved ? Math.round(st.sbp) + '/' + Math.round(st.dbp) : Math.round(st.sbp) + '/' + Math.round(st.dbp), solved ? 'mm Hg' : 'mm Hg: no pulse'), lnTile('Mean', String(Math.round(st.map)), 'mm Hg'), lnTile('Balloon', solved ? 'down' : 'up, 1.5 mL', '')], dur: dur, rT: s.beats.v.map(b => b.tR).filter(t => t >= 0 && t < dur), key: Math.round(st.sbp) + '/' + Math.round(st.dbp) };
}
function lnFixFig() {
  const c = lnFixCase(), F = LNS.fix, solved = lnFixSolved(c), sig = lnFixSignals(c, solved), nDone = Object.keys(F.results).length;
  const cv = lnCanvas(920, 320, { 'data-ln-fixcv': c.id, 'data-ln-fixkey': sig.key, 'aria-label': 'The monitor: ' + c.title });
  const acts = LN.ACTIONS.filter(a => c.acts[a[0]] !== undefined), last = F.done.length ? F.done[F.done.length - 1] : null;
  const log = F.done.map((a, i) => { const A = LN.ACTIONS.filter(x => x[0] === a)[0], fx = c.fix.indexOf(a) >= 0, bad = (a === 'pressor' || a === 'fluid'); return h('li', { class: fx ? 'ok' : bad ? 'bad' : '', 'data-ln-found': a }, [h('b', { text: A[1] + '. ' }), c.acts[a]]); });
  const fig = h('figure', { class: 'an-fig ec-fig ec-lab ln-fig ln-fix', 'data-ln-fix': c.id }, [
    h('div', { class: 'ec-bar ln-bar' }, [h('label', { class: 'nod-f' }, [h('span', { class: 'nod-l', text: 'Case' }), lnPicker(LN.CASES.map(x => ({ id: x.id, label: (F.results[x.id] ? '✓ ' : '') + x.title })), c.id, 'data-ln-fixsel', (k) => { lnFixLoad(k); render(); })]),
      h('button', { type: 'button', class: 'btn sm', 'data-ln-fixrestart': '1', text: 'Start again', onclick: () => { lnFixLoad(c.id); render(); } }),
      h('span', { class: 'ec-score', 'data-ln-fixscore': String(nDone), text: nDone + ' of ' + LN.CASES.length + ' fixed' })]),
    h('p', { class: 'ln-story', 'data-ln-story': '1', text: c.story }),
    h('div', { class: 'ec-main ln-main' }, [h('div', { class: 'ln-left' }, [cv, h('div', { class: 'vsc-tiles ln-tiles' }, sig.tiles)]),
      h('div', { class: 'ln-acts' }, [h('h5', { text: solved ? 'Fixed' : 'What will you check?' }),
        solved ? h('div', { class: 'ln-done', 'data-ln-solved': String(F.done.length) }, [h('p', {}, [h('b', { text: 'The fault is corrected in ' + F.done.length + ' step' + (F.done.length === 1 ? '' : 's') + (F.harm ? ', after the screen was treated ' + (F.harm === 1 ? 'once' : F.harm + ' times') + '. ' : '. ') }), c.teach]), h('button', { type: 'button', class: 'btn sm', 'data-ln-fixnext': '1', text: 'Next case', onclick: () => { const ids = LN.CASES.map(x => x.id); lnFixLoad(lnStep(ids, c.id, 1)); render(); } })])
          : h('div', { class: 'ln-actgrid', 'data-ln-actgrid': '1' }, acts.map(a => tip(h('button', { type: 'button', class: 'btn sm' + (F.done.indexOf(a[0]) >= 0 ? ' quiet' : ''), 'data-ln-act': a[0], text: a[1], onclick: () => lnFixDo(a[0]) }), a[2], a[1]))),
        log.length ? h('ol', { class: 'ln-log', 'data-ln-log': String(log.length) }, log) : h('p', { class: 'fine', text: 'Nothing checked yet. Start with the patient.' })])]),
    h('figcaption', { text: 'The patient’s true pressure is drawn by the waveform model and passed through a model of the tubing (natural frequency, damping, level, zero). Nine cases.' })
  ]);
  setTimeout(() => lnStrip(cv, sig.lanes, { dur: sig.dur, spans: sig.spans || [], rTimes: sig.rT, notes: F.flush && c.ch === 'art' ? [{ t: 4.8, lane: 1, v: 300, text: 'fast flush', up: false }] : [] }), 0);
  return fig;
}

/* ---------------------------------------------------------------- real ultrasound */
function lnUsRealFig() {
  const id = USR.images[LNS.us] ? LNS.us : USR.order[0], im = USR.images[id], set = (k) => { LNS.us = k; render(); };
  const svg = sv('svg', { viewBox: '0 0 ' + im.w + ' ' + im.h, class: 'ln-usmarks', 'aria-hidden': 'true' });
  if (LNS.usLabels) im.marks.forEach((m, i) => { svg.appendChild(sv('circle', { cx: m[0], cy: m[1], r: 11, class: 'ln-usdot' })); svg.appendChild(svt(m[0], m[1] + 4, String(i + 1), { class: 'ln-usnum', 'text-anchor': 'middle' })); });
  return h('figure', { class: 'an-fig ec-fig ec-lab ln-fig', 'data-ln-usreal': id }, [
    h('div', { class: 'ec-bar ln-bar' }, [h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Image' }, USR.order.map(k => h('button', { type: 'button', class: 'ch', role: 'radio', 'aria-checked': String(k === id), 'data-ln-uspick': k, text: USR.images[k].title.replace(/:.*/, '') + (k === 'sax2' || k === 'lax2' ? ' 2' : ''), onclick: () => set(k) }))),
      h('label', { class: 'chk' }, [h('input', { type: 'checkbox', 'data-ln-uslabels': '1', checked: LNS.usLabels, onchange: (e) => { LNS.usLabels = e.target.checked; render(); } }), 'Labels']), h('span', { class: 'chip-mini', text: 'real scan' })]),
    h('div', { class: 'ec-main ln-main' }, [h('div', { class: 'ln-usbox' }, [h('img', { src: im.data, alt: im.title + ' (real ultrasound image)', width: im.w, height: im.h, 'data-ln-usimg': id }), svg]),
      h('div', { class: 'ln-text', 'data-ln-text': '1' }, [h('h5', { text: im.title }), h('p', { text: im.say }), LNS.usLabels ? h('ol', { class: 'ln-uslist', 'data-ln-uslist': '1' }, im.marks.map(m => h('li', { text: m[2] }))) : null, h('p', {}, [h('b', { text: 'For the needle. ' }), im.pearl])])]),
    h('figcaption', { text: USR.credit + ' These are neck arteries; the appearances — wall, lumen, enhancement, edge shadow, colour — are the same at the groin, the chest wall and the wrist.' })
  ]);
}

/* ---------------------------------------------------------------- the drawn scanner */
const LN_US = { W: 300, H: 250, noise: null };
function lnNoise() { if (LN_US.noise) return LN_US.noise; const n = LN_US.W * LN_US.H, a = new Float32Array(n), b = new Float32Array(n); let s = 12345; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; for (let i = 0; i < n; i++) { a[i] = Math.sqrt(-2 * Math.log(1 - r() * 0.999)) * 0.8; b[i] = r(); } LN_US.noise = { a: a, b: b }; return LN_US.noise; }
/* paints a scene: structures in cm, compressed by c, with the pulse (0…1) and the breath (0…1); needle: { x (0…1), y (cm), tipOnly } */
function lnUsPaint(cv, scene, built, st) {
  const W = LN_US.W, H = LN_US.H; let off = cv.lnOff; if (!off) { off = cv.lnOff = document.createElement('canvas'); off.width = W; off.height = H; }
  const octx = off.getContext('2d'), img = octx.createImageData(W, H), px = img.data, N = lnNoise(), D = scene.depth, wcm = scene.width, c = st.c || 0, pulse = st.pulse || 0, insp = st.insp || 0;
  const S = built.st.map(o => { const q = Object.assign({}, o); if (q.y !== undefined) q.y = q.y * (1 - 0.1 * c); if (q.k === 'vessel') { if (q.t === 'v') { q.ry = q.ry * Math.max(0.03, 1 - 0.97 * Math.min(1, c * 1.5)) * (q.resp ? 1 - 0.22 * insp : 1); q.rx = q.rx * (1 + 0.12 * Math.min(1, c * 1.5)); } else { const k = Math.max(0, (c - 0.72) / 0.28); q.ry = q.ry * (1 - 0.4 * k) * (1 + 0.05 * pulse); q.rx = q.rx * (1 + 0.05 * pulse); } } return q; });
  const layers = S.filter(o => o.k === 'layer'), lines = S.filter(o => o.k === 'fascia' || o.k === 'band'), rest = S.filter(o => o.k !== 'layer' && o.k !== 'fascia' && o.k !== 'band');
  for (let j = 0; j < H; j++) {
    const Y = j / H * D;
    for (let i = 0; i < W; i++) {
      const X = i / W, xc = X * wcm, k = j * W + i; let e = 0.3, shade = 1, col = null;
      const wob = 0.035 * Math.sin(X * 9 + 1) + 0.02 * Math.sin(X * 23);
      for (let q = 0; q < layers.length; q++) { const L = layers[q]; if (Y >= L.y0 * (1 - 0.1 * c) + wob && Y < L.y1 * (1 - 0.1 * c) + wob && (L.x1 === undefined || X < L.x1)) { e = L.e; if (L.tex === 'fat') e += 0.22 * Math.max(0, Math.sin(Y * 21 + Math.sin(X * 7) * 2.2) - 0.82) * 5; else if (L.tex === 'muscle') e += 0.06 * Math.sin(Y * 33 + 3.2 * Math.sin(X * 9 + Y * 1.7) + X * 4) + 0.05; else e -= 0.04; } }
      for (let q = 0; q < lines.length; q++) { const L = lines[q], yy = L.y * (1 - 0.1 * c) + wob; if (L.k === 'band' ? (X > L.x0 && X < L.x1 && Math.abs(Y - yy) < 0.09) : Math.abs(Y - yy) < 0.028) e = Math.max(e, L.e); }
      for (let q = 0; q < rest.length; q++) {
        const o = rest[q], ox = o.x * wcm, dx = xc - ox, dy = Y - o.y;
        if (o.k === 'vessel') {
          const u = (dx * dx) / (o.rx * o.rx) + (dy * dy) / (o.ry * o.ry), wall = o.t === 'a' ? 0.34 : 0.16;
          if (u < 1) { e = 0.02; if (st.colour && X > 0.14 && X < 0.86 && o.ry > 0.05) { const core = 1 - u; col = o.t === 'a' ? [170 + 85 * pulse * core, 30 + 60 * pulse * core, 20, 0.45 + 0.55 * pulse * (0.4 + 0.6 * core)] : [20, 60 + 40 * core, 170 + 60 * core, 0.5 + 0.3 * core * (1 - 0.4 * insp)]; } }
          else if (u < 1 + wall) e = Math.max(e, o.t === 'a' ? 0.78 * (1 - Math.abs(dx) / (o.rx * 1.6)) + 0.12 : 0.5 * (1 - Math.abs(dx) / (o.rx * 1.5)) + 0.1);
          else if (dy > 0 && Math.abs(dx) < o.rx * 0.82 && o.ry > 0.08) e += 0.13 * Math.exp(-(dy - o.ry) / 1.1);                       // posterior enhancement
          else if (dy > 0 && Math.abs(Math.abs(dx) - o.rx) < 0.05 && o.ry > 0.15) shade *= 0.72;                                            // edge shadow
        } else if (o.k === 'nerve' || o.k === 'tendon') {
          const u = (dx * dx) / (o.rx * o.rx) + (dy * dy) / (o.ry * o.ry);
          if (u < 1) e = o.k === 'nerve' ? 0.62 - 0.34 * Math.max(0, Math.sin(dx * 46) * Math.sin(dy * 52)) : 0.7 + 0.12 * Math.sin(dx * 90);
        } else if (o.k === 'gland') { const u = (dx * dx) / (o.rx * o.rx) + (dy * dy) / (o.ry * o.ry); if (u < 1) e = 0.43; }
        else if (o.k === 'bone' || o.k === 'air') {
          const cy = o.y + o.r, rr = Math.sqrt(dx * dx + (Y - cy) * (Y - cy)), half = o.k === 'air' ? o.r * 0.95 : o.r * (o.w || 0.3);
          if (Math.abs(dx) < half) { if (Math.abs(rr - o.r) < 0.045 && Y < cy) e = 0.98; else if (rr < o.r || Y > cy) shade *= o.k === 'air' ? 0.3 + 0.25 * Math.max(0, Math.sin((Y - o.y) * 9)) : 0.12; }
        } else if (o.k === 'pleura') {
          if (X > o.x0 && X < o.x1) { if (Math.abs(Y - o.y) < 0.035) e = 0.95; else if (Y > o.y) { shade *= 0.45; e = 0.3 + 0.2 * Math.max(0, Math.sin((Y - o.y) * 6.3 / Math.max(0.4, o.y * 0.5))) + 0.1 * N.b[(k + Math.floor(st.frame * 7)) % N.b.length]; } }
        }
      }
      if (st.needle) {
        const nd = st.needle;
        if (nd.dot !== null && nd.dot !== undefined) { const ddx = xc - nd.x * wcm, ddy = Y - nd.dot; if (ddx * ddx + ddy * ddy < 0.0038) e = 1.2; else if (Math.abs(ddx) < 0.05 && ddy > 0 && ddy < 0.7 && nd.shaft) e += 0.35 * Math.exp(-ddy * 3) * (0.5 + 0.5 * Math.sin(ddy * 60)); }
        if (nd.line) { const tx = nd.line.x1 * wcm, ty = nd.line.y1, sx = nd.line.x0 * wcm, sy = nd.line.y0, vx = tx - sx, vy = ty - sy, L2 = vx * vx + vy * vy, tt = Math.max(0, Math.min(1, ((xc - sx) * vx + (Y - sy) * vy) / L2)), ex = xc - (sx + tt * vx), ey = Y - (sy + tt * vy); if (ex * ex + ey * ey < 0.0012) e = 1.15; }
      }
      const k2 = (k + (st.frame % 3) * 977) % (N.a.length - W - 2), spk = 0.45 * N.a[k2] + 0.3 * N.a[k2 + 1] + 0.25 * N.a[k2 + W];
      let v = e * shade * (1 - 0.3 * Y / D) * (0.52 + 0.66 * spk);
      v = Math.max(0, Math.min(1, v)); let g8 = Math.pow(v, 0.85) * 255, r = g8, gg = g8, b = g8;
      if (col) { r = r * (1 - col[3]) + col[0] * col[3]; gg = gg * (1 - col[3]) + col[1] * col[3]; b = b * (1 - col[3]) + col[2] * col[3]; }
      const p = k * 4; px[p] = r; px[p + 1] = gg; px[p + 2] = b; px[p + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  const ctx = cv.getContext('2d'), CW = cv.width, CH = cv.height; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(off, 0, 0, CW, CH);
  ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.textAlign = 'left'; if (scene.left) ctx.fillText('◀ ' + scene.left, 8, 16); ctx.textAlign = 'right'; if (scene.right) ctx.fillText(scene.right + ' ▶', CW - 8, 16);
  for (let d = 1; d < D; d++) { ctx.fillRect(CW - 9, d / D * CH, 9, 1); ctx.fillText(d + ' cm', CW - 13, d / D * CH + 4); }
  if (st.colour) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(0.14 * CW, 0.08 * CH, 0.72 * CW, 0.84 * CH); }
  if (st.labels) {
    ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    const SH = [['Common femoral', 'CF'], ['Superficial femoral', 'SF'], ['Profunda femoris', 'Profunda'], ['Great saphenous', 'Saphenous'], ['Internal jugular vein', 'IJ vein'], ['Common carotid artery', 'Carotid'], ['Internal carotid artery', 'ICA'], ['External carotid artery', 'ECA'], ['Flexor carpi radialis tendon', 'FCR tendon'], ['Sternocleidomastoid', 'SCM'], ['Transverse process', 'Bone'], ['Venae comitantes', 'vein'], [' artery', ' a.'], [' vein', ' v.']];
    S.forEach(o => {
      if (!o.label) return; let short = o.label; SH.forEach(r => { short = short.replace(r[0], r[1]); });
      const lx = (o.lx !== undefined ? o.lx : o.x) * CW, ly = (o.ly !== undefined ? o.ly * (1 - 0.1 * c) : o.k === 'bone' || o.k === 'air' ? o.y + 0.3 : o.k === 'pleura' ? o.y + 0.28 : o.k === 'band' ? o.y - 0.18 : o.k === 'nerve' || o.k === 'tendon' || (o.k === 'vessel' && o.ry < 0.2) ? o.y - o.ry - 0.14 : o.y) / D * CH;
      if (isNaN(lx)) return; const w = ctx.measureText(short).width + 8, xx = Math.max(w / 2 + 3, Math.min(CW - w / 2 - 40, lx));
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(xx - w / 2, ly - 10, w, 15); ctx.fillStyle = o.k === 'vessel' ? (o.t === 'a' ? '#ffb3aa' : '#a9d2ff') : '#fff3c4'; ctx.fillText(short, xx, ly + 1.5);
    });
  }
}
function lnUsSimFig() {
  const Sm = LNS.sim, sc = LN.SCENES[Sm.scene] || LN.SCENES.femoral, cv = h('canvas', { class: 'ln-uscv', width: LN_US.W * 2, height: LN_US.H * 2, 'data-ln-simcv': Sm.scene, role: 'img', 'aria-label': 'A drawn ultrasound view: ' + sc.label });
  const zone = h('p', { class: 'ln-zone', 'data-ln-zone': '1' }), t0 = performance.now(); let frame = 0, timer = 0;
  const draw = () => {
    if (!cv.isConnected && frame > 2) return; frame++;
    const t = (performance.now() - t0) / 1000, ph = (t * 1.2) % 1, pulse = ph < 0.12 ? ph / 0.12 : Math.exp(-(ph - 0.12) / 0.22), insp = 0.5 - 0.5 * Math.cos(2 * Math.PI * t / 4.5), b = sc.build(Sm.s, Sm.opt);
    lnUsPaint(cv, sc, b, { c: Sm.c, pulse: pulse, insp: insp, colour: Sm.colour, labels: Sm.labels, frame: frame });
    zone.textContent = (b.ok ? '✓ ' : '') + b.zone + (Sm.c > 0.55 ? ' With this pressure the vein is flat and the artery still round — the fastest way to tell them apart, and the reason to lighten your hand before the needle goes in.' : ''); zone.className = 'ln-zone' + (b.ok ? ' ok' : ''); cv.setAttribute('data-ln-ok', b.ok ? '1' : '0'); cv.setAttribute('data-ln-frame', String(frame));
    timer = setTimeout(draw, 130);
  };
  const sl = (label, key, tipText) => { const id = uid('ln'), o = h('output', { text: '' }), inp = h('input', { type: 'range', id: id, min: 0, max: 1, step: 0.02, value: Sm[key], 'data-ln-sim': key, oninput: (e) => { Sm[key] = +e.target.value; } }); return tip(h('label', { class: 'odc-sl', for: id }, [h('span', { class: 'nod-l', text: label }), o, inp]), tipText, label); };
  const own = typeof ehOwnSlot === 'function' ? ehOwnSlot({ id: 'line_' + Sm.scene, title: sc.label }) : null;
  const fig = h('figure', { class: 'an-fig ec-fig ec-lab ln-fig', 'data-ln-ussim': Sm.scene }, [
    h('div', { class: 'ec-bar ln-bar' }, [h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Site' }, Object.keys(LN.SCENES).map(k => h('button', { type: 'button', class: 'ch', role: 'radio', 'aria-checked': String(k === Sm.scene), 'data-ln-scene': k, text: LN.SCENES[k].label, onclick: () => { clearTimeout(timer); LNS.sim = { scene: k, s: 0.3, c: 0, colour: Sm.colour, labels: Sm.labels, opt: 0 }; render(); } }))),
      h('label', { class: 'chk' }, [h('input', { type: 'checkbox', 'data-ln-simcolour': '1', checked: Sm.colour, onchange: (e) => { Sm.colour = e.target.checked; } }), 'Colour']),
      h('label', { class: 'chk' }, [h('input', { type: 'checkbox', 'data-ln-simlabels': '1', checked: Sm.labels, onchange: (e) => { Sm.labels = e.target.checked; } }), 'Labels']),
      h('label', { class: 'chk' }, [h('input', { type: 'checkbox', 'data-ln-simopt': '1', checked: !!Sm.opt, onchange: (e) => { Sm.opt = e.target.checked ? 1 : 0; } }), sc.opt[0]]),
      h('span', { class: 'chip-mini', text: 'drawn, not a scan' })]),
    h('div', { class: 'ec-main ln-main' }, [h('div', { class: 'ln-usscreen' }, [cv, h('p', { class: 'fine', text: sc.sub + ' · ' + sc.opt[1] })]),
      h('div', { class: 'ln-text' }, [h('div', { class: 'deck ln-simdeck' }, [sl('Slide: ' + sc.slide[0] + ' → ' + sc.slide[1], 's', 'Move the probe along the vessel.'), sl('Press', 'c', 'Probe pressure. A vein collapses with the weight of the probe; an artery needs real force.')]), zone, own ? h('details', { class: 'plain eh-more', 'data-ln-own': Sm.scene }, [h('summary', { text: 'Add a scan of your own for this site' }), own]) : null])]),
    h('figcaption', { text: 'A drawing with the appearances of ultrasound, to practise the anatomy and the levels: not a recording of a patient. The real frames above show what tissue looks like.' })
  ]);
  setTimeout(draw, 0);
  return fig;
}

/* ---------------------------------------------------------------- the needle: tip or shaft? */
function lnNeedleFig() {
  const N = LNS.nd, depth = 1.5, r = 0.42, scene = { depth: 3.2, width: 3.6, left: '', right: '' }, cv = h('canvas', { class: 'ln-uscv', width: LN_US.W * 2, height: LN_US.H * 2, 'data-ln-ndcv': '1', role: 'img', 'aria-label': 'The out-of-plane view of a needle and a vessel' });
  const say = h('p', { class: 'ln-zone', 'data-ln-ndsay': '1' }), svgBox = h('div', { class: 'ln-ndside', 'data-ln-ndside': '1' }); let frame = 0, timer = 0;
  const built = { st: [{ k: 'layer', y0: 0, y1: 0.7, e: 0.3, tex: 'fat' }, { k: 'fascia', y: 0.7, e: 0.8 }, { k: 'layer', y0: 0.7, y1: 3.2, e: 0.33, tex: 'muscle' }, { k: 'vessel', t: 'v', id: 'v', x: 0.5, y: depth, rx: 0.5, ry: r, label: 'Vein', ly: depth + r + 0.2 }, { k: 'vessel', t: 'a', id: 'a', x: 0.8, y: depth + 0.25, rx: 0.3, ry: 0.3, label: 'Artery', ly: depth + 0.25 + 0.5 }] };
  const draw = () => {
    if (!cv.isConnected && frame > 2) return; frame++;
    const o = LN.needleOOP({ angle: N.angle, entry: N.probe, adv: N.adv, depth: depth, r: r }), th = N.angle * Math.PI / 180;
    lnUsPaint(cv, scene, built, { c: 0, pulse: 0, insp: 0, labels: true, frame: frame, needle: { x: 0.5, dot: o.crossY, shaft: o.state === 'shaft' } });
    say.textContent = o.say; say.className = 'ln-zone' + (o.state === 'tip' && o.inLumen ? ' ok' : o.state === 'shaft' ? ' warn' : ''); cv.setAttribute('data-ln-ndstate', o.state);
    /* the side view: the skin, the vessel along the page, the beam as a vertical slab, the needle */
    const Wv = 320, Hv = 170, kx = 62, ky = 46, ox = 26, oy = 22, svg = sv('svg', { viewBox: '0 0 ' + Wv + ' ' + Hv, class: 'ln-ndsvg', role: 'img', 'aria-label': 'Side view of the needle, the vessel and the beam' });
    svg.appendChild(sv('rect', { x: 0, y: oy, width: Wv, height: Hv - oy, class: 'ln-tissue' })); svg.appendChild(sv('rect', { x: 0, y: oy + (depth - r) * ky, width: Wv, height: 2 * r * ky, class: 'ln-vein' }));
    const bx = ox + N.probe * kx; svg.appendChild(sv('rect', { x: bx - 2.5, y: oy, width: 5, height: Hv - oy, class: 'ln-beam' })); svg.appendChild(sv('rect', { x: bx - 22, y: 2, width: 44, height: oy - 3, rx: 4, class: 'ln-probe' })); svg.appendChild(svt(bx, 14, 'probe', { class: 'ln-ndlab', 'text-anchor': 'middle' }));
    svg.appendChild(sv('line', { x1: ox - 14 * Math.cos(th), y1: oy - 14 * Math.sin(th), x2: ox + o.tipX * kx, y2: oy + o.tipY * ky, class: 'ln-needle' })); svg.appendChild(sv('circle', { cx: ox + o.tipX * kx, cy: oy + o.tipY * ky, r: 3, class: 'ln-tip' }));
    if (o.crossY !== null) svg.appendChild(sv('circle', { cx: bx, cy: oy + o.crossY * ky, r: 4.5, class: 'ln-cross' }));
    svg.appendChild(svt(Wv - 6, oy + depth * ky + 4, 'vein', { class: 'ln-ndlab', 'text-anchor': 'end' })); svg.appendChild(svt(6, Hv - 6, 'skin entry ← 1 cm →', { class: 'ln-ndlab' }));
    svgBox.textContent = ''; svgBox.appendChild(svg);
    timer = setTimeout(draw, 160);
  };
  const sl = (label, key, min, max, step, unit, tipText) => { const id = uid('ln'), inp = h('input', { type: 'range', id: id, min: min, max: max, step: step, value: N[key], 'data-ln-nd': key, oninput: (e) => { N[key] = +e.target.value; e.target.previousSibling.textContent = N[key] + unit; } }); return tip(h('label', { class: 'odc-sl', for: id }, [h('span', { class: 'nod-l', text: label }), h('output', { text: N[key] + unit }), inp]), tipText, label); };
  const fig = h('figure', { class: 'an-fig ec-fig ec-lab ln-fig', 'data-ln-needle': '1' }, [
    h('div', { class: 'ec-bar ln-bar' }, [h('span', { class: 'nod-l', text: 'Out of plane: is the dot the tip?' }),
      h('button', { type: 'button', class: 'btn sm', 'data-ln-ndwalk': '1', text: 'Walk the tip down', onclick: () => { clearTimeout(timer); const tgt = depth / Math.tan(N.angle * Math.PI / 180); let k = 0; N.adv = 0.5; N.probe = Math.max(0.3, tgt - 0.9); const step = () => { if (!cv.isConnected) return; if (k % 2 === 0) N.adv = Math.min((N.probe + 0.02) / Math.cos(N.angle * Math.PI / 180), 4); else N.probe = Math.min(tgt, N.probe + 0.3); k++; fig.querySelectorAll('[data-ln-nd]').forEach(i => { i.value = N[i.getAttribute('data-ln-nd')]; i.previousSibling.textContent = (+N[i.getAttribute('data-ln-nd')]).toFixed(i.getAttribute('data-ln-nd') === 'angle' ? 0 : 2) + (i.getAttribute('data-ln-nd') === 'angle' ? '°' : ' cm'); }); if (k < 10 && !(Math.abs(N.probe - tgt) < 0.01 && k % 2 === 1)) setTimeout(step, 900); }; step(); draw(); } }),
      tipI('The needle crosses the beam at one point, so the screen shows a single bright dot whether the beam is on the tip or anywhere along the shaft. The side view shows what is really happening.', 'Tip or shaft')]),
    h('div', { class: 'ec-main ln-main' }, [h('div', { class: 'ln-usscreen' }, [cv, h('p', { class: 'fine', text: 'What the screen shows' })]),
      h('div', { class: 'ln-text' }, [svgBox, h('div', { class: 'deck ln-simdeck' }, [sl('Needle in', 'adv', 0, 4, 0.05, ' cm', 'How far the needle has been advanced.'), sl('Probe from the skin entry', 'probe', 0.3, 3, 0.05, ' cm', 'Where the beam is, measured along the vessel from the point the needle entered.'), sl('Needle angle', 'angle', 30, 60, 5, '°', 'Steeper reaches depth sooner; flatter is easier to see and to thread.')]), say])]),
    h('figcaption', { text: 'Dynamic needle tip positioning: move the probe a little ahead of the dot, advance until the dot reappears, and repeat. The moment the dot appears it is the tip. Enter the skin as far back from the probe as the vessel is deep, at 45°, and the tip meets the beam at the vessel.' })
  ]);
  setTimeout(draw, 0);
  return fig;
}

function lnWidget(kind) {
  if (!LN || !WV) return null;
  if (kind === 'ln_art') return lnArtFig();
  if (kind === 'ln_cvp') return lnCvpFig();
  if (kind === 'ln_pa') return lnPaFig();
  if (kind === 'ln_real') return WR ? lnRealFig() : null;
  if (kind === 'ln_fix') return lnFixFig();
  if (kind === 'ln_usreal') return USR ? lnUsRealFig() : null;
  if (kind === 'ln_ussim') return lnUsSimFig();
  if (kind === 'ln_needle') return lnNeedleFig();
  return null;
}
