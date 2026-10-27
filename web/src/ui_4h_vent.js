/* ------------------------------------------------------------------ mechanical ventilation: the figures and the simulator
   ventmodes (trigger / target / cycle for each mode), ventsettings (the glossary, searchable), ventwaves (the waveform
   viewer), ventsim (triage a case, set the support, read the gases). */
const VT = window.PFT_VENT;

/* ---- the modes: a matrix and a card per mode ---- */
let modeSel = 'vcac';
function ventModesFig() {
  const M = VT.MODES, sel = M.filter(m => m.id === modeSel)[0] || M[0];
  const table = h('div', { class: 'tbl-wrap' }, [h('table', { class: 'edu-tbl vm-tbl' }, [
    h('thead', {}, [h('tr', {}, ['Mode', 'Trigger', 'Target', 'Cycle'].map(x => h('th', { text: x })))]),
    h('tbody', {}, M.map(m => h('tr', { class: m.id === sel.id ? 'on' : '', 'data-mode-row': m.id, tabindex: '0', onclick: () => { modeSel = m.id; render(); }, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); modeSel = m.id; render(); } } }, [
      h('th', { scope: 'row' }, [h('b', { text: m.name }), h('span', { class: 'fine', text: ' ' + m.aka })]), h('td', { text: m.trigger }), h('td', { text: m.target }), h('td', { text: m.cycle })])))])]);
  const card = h('div', { class: 'vm-card', 'data-mode-card': sel.id }, [
    h('p', { class: 'an-name' }, [h('b', { text: sel.name }), h('span', { class: 'tf', text: sel.aka })]),
    h('p', {}, [h('span', { class: 'lbl', text: 'Breaths. ' }), sel.breaths]),
    h('p', {}, [h('span', { class: 'lbl', text: 'For. ' }), sel.pros]),
    h('p', {}, [h('span', { class: 'lbl', text: 'Against. ' }), sel.cons]),
    h('p', {}, [h('span', { class: 'lbl', text: 'When. ' }), sel.when])
  ]);
  return h('figure', { class: 'an-fig vm-fig', 'data-ventmodes': '1' }, [table, card, h('figcaption', { text: 'Every mode is a rule for the trigger (what starts the breath), the target (what the ventilator holds during it) and the cycle (what ends it). Tap a row.' })]);
}

/* ---- the settings glossary ---- */
let setQ = '', setCat = '';
function ventSettingsFig() {
  const S = VT.SETTINGS, cats = []; S.forEach(x => { if (cats.indexOf(x.cat) < 0) cats.push(x.cat); });
  const q = setQ.trim().toLowerCase();
  const list = S.filter(x => (!setCat || x.cat === setCat) && (!q || (x.name + ' ' + x.aka + ' ' + x.what + ' ' + x.cat).toLowerCase().indexOf(q) >= 0));
  const box = h('div', { class: 'vs-list', 'data-settings-list': '1' });
  const draw = () => {
    box.textContent = '';
    const qq = setQ.trim().toLowerCase();
    const items = S.filter(x => (!setCat || x.cat === setCat) && (!qq || (x.name + ' ' + x.aka + ' ' + x.what + ' ' + x.cat).toLowerCase().indexOf(qq) >= 0));
    if (!items.length) { box.appendChild(h('p', { class: 'fine', text: 'Nothing matches.' })); return; }
    items.forEach(x => box.appendChild(h('details', { class: 'term vs-item', 'data-setting': x.id, open: items.length <= 4 }, [
      h('summary', {}, [h('b', { text: x.name }), h('span', { class: 'tf', text: x.cat }), x.aka ? h('span', { class: 'fine', text: ' ' + x.aka }) : null]),
      h('div', { class: 'tb' }, [
        h('p', {}, [h('span', { class: 'lbl', text: 'What it is. ' }), x.what]),
        x.typical ? h('p', {}, [h('span', { class: 'lbl', text: 'Typical. ' }), x.typical]) : null,
        x.up ? h('p', {}, [h('span', { class: 'lbl', text: 'Turn it up. ' }), x.up]) : null,
        x.down ? h('p', {}, [h('span', { class: 'lbl', text: 'Turn it down. ' }), x.down]) : null
      ])])));
  };
  const inp = h('input', { type: 'search', class: 'vs-search', placeholder: 'Search a setting or an alias (PEEP, I:E, cycle-off, plateau…)', value: setQ, 'data-settings-q': '1', 'aria-label': 'Search the settings', oninput: (e) => { setQ = e.target.value; draw(); } });
  const chips = h('div', { class: 'seg vs-cats', role: 'radiogroup', 'aria-label': 'Category' }, [['', 'All']].concat(cats.map(c => [c, c])).map(c => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-settings-cat': c[0], 'aria-checked': String(setCat === c[0]), text: c[1], onclick: (e) => { setCat = c[0]; e.target.parentElement.querySelectorAll('[data-settings-cat]').forEach(b => b.setAttribute('aria-checked', String(b.getAttribute('data-settings-cat') === setCat))); draw(); } })));
  draw();
  return h('div', { class: 'vs-glossary', 'data-ventsettings': '1' }, [inp, chips, box, h('p', { class: 'fine', text: list.length + ' of ' + S.length + ' settings shown.' })]);
}

/* ---- the waveform viewer ---- */
let waveSel = 'vc_normal';
function ventWavesFig() {
  const W = VT.WAVES, w = W.filter(x => x.id === waveSel)[0] || W[0], d = VT.wave(w.id);
  const groups = []; W.forEach(x => { if (groups.indexOf(x.group) < 0) groups.push(x.group); });
  const pick = h('div', { class: 'vw-pick' }, groups.map(g => h('div', { class: 'vw-group' }, [h('span', { class: 'lbl', text: g }), h('div', { class: 'seg' }, W.filter(x => x.group === g).map(x => h('button', { type: 'button', class: 'ch', 'data-wave': x.id, 'aria-pressed': String(x.id === w.id), text: x.name.replace(/ \(.*\)$/, ''), onclick: () => { waveSel = x.id; render(); } })))])));
  const SW = 760, SH = 330, x0 = 54, x1 = 750, tMax = d.t[d.t.length - 1];
  const svg = sv('svg', { viewBox: '0 0 ' + SW + ' ' + SH, class: 'vw-svg', role: 'img', 'aria-label': 'Airway pressure, flow and volume against time: ' + w.name });
  const X = (t) => x0 + (x1 - x0) * t / tMax;
  const rows = [
    { key: 'paw', name: 'Paw (cm H2O)', y0: 14, hgt: 90, lo: Math.min(0, Math.min.apply(null, d.paw) - 1), hi: Math.max.apply(null, d.paw) + 3, cls: 'paw', zero: d.m.peep },
    { key: 'flow', name: 'Flow (L/min)', y0: 124, hgt: 90, lo: Math.min.apply(null, d.flow) - 5, hi: Math.max.apply(null, d.flow) + 5, cls: 'flow', zero: 0 },
    { key: 'vol', name: 'Volume (mL)', y0: 234, hgt: 80, lo: 0, hi: Math.max.apply(null, d.vol) * 1.1 + 20, cls: 'vol', zero: 0 }
  ];
  rows.forEach(r => {
    const Y = (v) => r.y0 + r.hgt - (v - r.lo) / (r.hi - r.lo) * r.hgt;
    svg.appendChild(sv('rect', { x: x0, y: r.y0, width: x1 - x0, height: r.hgt, class: 'vw-bg' }));
    svg.appendChild(sv('line', { x1: x0, y1: Y(r.zero), x2: x1, y2: Y(r.zero), class: 'ph-grid zero' }));
    svg.appendChild(svt(x0 - 4, Y(r.zero) + 3, r.key === 'paw' ? 'PEEP ' + d.m.peep : '0', { class: 'ph-tick', 'text-anchor': 'end' }));
    if (r.key === 'paw') { [10, 20, 30].forEach(v => { if (v < r.hi) { svg.appendChild(sv('line', { x1: x0, y1: Y(v), x2: x1, y2: Y(v), class: 'ph-grid' })); svg.appendChild(svt(x0 - 4, Y(v) + 3, String(v), { class: 'ph-tick', 'text-anchor': 'end' })); } }); }
    if (r.key === 'flow') { [-60, -30, 30, 60].forEach(v => { if (v > r.lo && v < r.hi) { svg.appendChild(sv('line', { x1: x0, y1: Y(v), x2: x1, y2: Y(v), class: 'ph-grid' })); svg.appendChild(svt(x0 - 4, Y(v) + 3, String(v), { class: 'ph-tick', 'text-anchor': 'end' })); } }); }
    if (r.key === 'vol') { [250, 500, 750].forEach(v => { if (v < r.hi) { svg.appendChild(sv('line', { x1: x0, y1: Y(v), x2: x1, y2: Y(v), class: 'ph-grid' })); svg.appendChild(svt(x0 - 4, Y(v) + 3, String(v), { class: 'ph-tick', 'text-anchor': 'end' })); } }); }
    let path = ''; d.t.forEach((t, i) => { path += (i ? ' L' : 'M') + X(t).toFixed(1) + ' ' + Y(d[r.key][i]).toFixed(1); });
    svg.appendChild(sv('path', { d: path, class: 'vw-tr ' + r.cls }));
    svg.appendChild(svt(x0 + 4, r.y0 + 11, r.name, { class: 'ph-rl ' + r.cls }));
  });
  for (let t = 0; t <= tMax; t += 1) svg.appendChild(svt(X(t), SH - 6, t + ' s', { class: 'ph-tick', 'text-anchor': 'middle' }));
  const note = h('div', { class: 'vw-note', 'data-wave-note': w.id }, [
    h('p', { class: 'an-name' }, [h('b', { text: w.name }), h('span', { class: 'tf', text: w.group })]),
    h('p', {}, [h('span', { class: 'lbl', text: 'What you see. ' }), w.what]),
    h('p', {}, [h('span', { class: 'lbl', text: 'What to do. ' }), w.look])
  ]);
  const mech = h('p', { class: 'fine', text: 'Drawn with: compliance ' + d.m.crs + ' mL/cm H2O · resistance ' + d.m.raw + ' cm H2O/L/s · PEEP ' + d.m.peep + (d.m.mode === 'vc' ? ' · VT ' + d.m.vt + ' mL at ' + d.m.flow + ' L/min constant flow' : (d.m.mode === 'pc' ? ' · Pinsp ' + d.m.pinsp + ' for ' + d.m.ti + ' s' : ' · pressure support ' + d.m.ps + ', cycle-off ' + Math.round(d.m.cyc * 100) + '%')) + ' · rate ' + d.m.rr + '.' });
  return h('figure', { class: 'an-fig vw-fig', 'data-ventwaves': '1' }, [pick, svg, mech, note, h('figcaption', { text: 'Three breaths of airway pressure (top), flow (middle: inspiration up, expiration down) and volume (bottom) against time, generated from the equation of motion with the mechanics shown. Pick a pattern.' })]);
}

/* ---- the simulator ---- */
const VS = { caseId: 'copd', plan: '', triaged: '', s: null, out: null, tr: null, day: 0, log: [], pOver: {}, anim: { raf: 0, t0: 0 } };
const O2DEV = [['nc2', 'Nasal cannula 2 L/min', 0.28], ['nc4', 'Nasal cannula 4 L/min', 0.36], ['mask6', 'Simple mask 6 L/min', 0.45], ['mask10', 'Mask 10 L/min', 0.6], ['nrb', 'Non-rebreather 15 L/min', 0.85]];
const PATIENT_SLIDERS = [
  ['crs', 'Lung compliance (Crs)', 10, 120, 2, 'mL/cm H2O', 'How much volume each cm H2O buys. Low: ARDS, oedema, fibrosis, consolidation. High: emphysema'],
  ['raw', 'Airway resistance (Raw)', 2, 45, 1, 'cm H2O/L/s', 'Bronchospasm, secretions, a narrow tube. Resistance × compliance is the time constant'],
  ['shunt', 'Shunt fraction', 0, 0.5, 0.02, '', 'Blood passing airless lung: collapse, consolidation, flooding. Yields to PEEP as far as the lung is recruitable, not to FiO2'],
  ['recruit', 'Recruitability', 0, 0.8, 0.05, '', 'How much of the shunt PEEP can open: high in early ARDS and oedema, nil in emphysema'],
  ['vdAlv', 'Alveolar dead space', 0, 0.5, 0.02, 'fraction', 'Ventilated alveoli without flow: embolism, low output, overdistension, emphysema'],
  ['hco3', 'Bicarbonate (metabolic side)', 5, 40, 1, 'mmol/L', 'Low: ketoacids, lactate. High: a chronic retainer'],
  ['driveK', 'Respiratory drive', 0, 2, 0.1, '×', 'The patient’s own effort and rate for a given CO2 and pH; sedation scales it further']
];
function vsCase() { return VT.CASES.filter(c => c.id === VS.caseId)[0]; }
function vsPatient() { return Object.assign({}, vsCase().p, VS.pOver); }
function vsDefaults(plan) {
  const c = vsCase();
  if (plan === 'o2') return { mode: 'o2', dev: 'mask6', fio2: 0.45, sed: 'none' };
  if (plan === 'hfnc') return { mode: 'hfnc', flow: 50, fio2: 0.6, sed: 'none' };
  if (plan === 'niv') return { mode: 'niv', ipap: c.niv.ipap, epap: c.niv.epap, fio2: c.niv.fio2, rr: c.niv.rr, ti: 1.0, sed: 'none' };
  return Object.assign({}, c.vent);
}
function vsSettings() {
  const s = VS.s; if (!s) return null;
  if (s.mode === 'niv') return Object.assign({}, s, { ps: s.ipap - s.epap, peep: s.epap });
  if (s.mode === 'o2') return Object.assign({}, s, { fio2: (O2DEV.filter(d => d[0] === s.dev)[0] || O2DEV[2])[2] });
  return s;
}
/* the model for the current case, patient and settings; the screen traces with it */
function vsCompute() {
  const s = vsSettings(); if (!s) { VS.out = null; VS.tr = null; return; }
  const p = vsPatient();
  VS.out = VT.gas(p, s, { day: VS.day });
  VS.tr = VT.traces(p, s, VS.out);
}
function vsRecord() {
  const s = vsSettings(), o = VS.out; if (!s || !o) return;
  VS.log.push({ when: VS.day ? 'a day later' : 'an hour later', set: vsSummary(s), ph: o.ph, paco2: o.paco2, pao2: o.pao2, spo2: o.spo2, hco3: o.hco3 });
  if (VS.log.length > 8) VS.log.shift();
  vsRefresh();
}
function vsSummary(s) {
  if (s.mode === 'o2') return (O2DEV.filter(d => d[0] === s.dev)[0] || O2DEV[2])[1];
  if (s.mode === 'hfnc') return 'HFNC ' + s.flow + ' L/min, FiO2 ' + s.fio2.toFixed(2);
  if (s.mode === 'niv') return 'BiPAP ' + s.ipap + '/' + s.epap + ', FiO2 ' + s.fio2.toFixed(2) + ', backup ' + s.rr;
  const nm = { vcac: 'VC-AC', pcac: 'PC-AC', psv: 'PSV' }[s.mode];
  return nm + ' ' + (s.mode === 'vcac' ? 'VT ' + s.vt + ' × ' + s.rr + ', flow ' + s.flow : (s.mode === 'pcac' ? 'Pinsp ' + s.pinsp + ' × ' + s.rr + ', Ti ' + s.ti : 'PS ' + s.ps + ', backup ' + s.rr)) + ', PEEP ' + s.peep + ', FiO2 ' + s.fio2.toFixed(2) + ', ' + s.sed;
}
/* live refresh of everything that depends on the model, without rebuilding the inputs */
function vsRefresh() {
  vsCompute();
  const live = document.querySelector('[data-vs-live]'); if (!live) return;
  live.textContent = '';
  live.appendChild(vsLiveBlock());
  const mon = document.querySelector('[data-vs-monitor]'); if (mon) { mon.textContent = ''; mon.appendChild(vsScreenTiles()); }
  const lungs = document.querySelector('[data-vs-lungs-static]'); if (lungs) { lungs.textContent = ''; lungs.appendChild(vsLungsSvg()); }
  const pv = document.querySelector('[data-vs-pv]'); if (pv) { pv.textContent = ''; pv.appendChild(vsPvSvg()); }
}
/* ---------- the ventilator screen ---------- */
const SCR = { W: 720, H: 560, win: 8 };
function vsAlarms(o, s) {
  const a = [];
  if (!o) return a;
  const vent = s.mode === 'vcac' || s.mode === 'pcac' || s.mode === 'psv';
  if (vent && o.ppeak > 38) a.push('High pressure ' + o.ppeak.toFixed(0));
  if (vent && o.pplat > 30) a.push('Plateau ' + o.pplat.toFixed(0));
  if (o.autoPeep > 3) a.push('Auto-PEEP ' + o.autoPeep.toFixed(1));
  if ((vent || s.mode === 'niv') && o.mv < 4) a.push('Low minute volume');
  if (o.rrTot > 35) a.push('High rate');
  if (o.rrTot < 5) a.push('Apnoea');
  if (o.spo2pct < 88) a.push('SpO2 low ' + o.spo2pct + '%');
  if (o.co < 3.2) a.push('Hypotension');
  return a;
}
function vsScreenTiles() {
  const o = VS.out, s = vsSettings(), tr = VS.tr;
  if (!o) return h('div', { class: 'vsc-tiles' });
  const own = s.mode === 'o2' || s.mode === 'hfnc';
  const f0 = (x) => x.toFixed(0), f1 = (x) => x.toFixed(1);
  const etco2 = Math.max(5, o.paco2 - (2 + 25 * Math.max(0, o.vdFrac - 0.3)));
  const tiles = own ? [
    ['SpO2', o.spo2pct + '', '%', o.spo2pct < 88 ? 'alarm' : ''], ['RR', f0(o.rrTot), '/min', o.rrTot > 30 ? 'alarm' : ''], ['VT', f0(o.vt), 'mL', ''], ['MV', f1(o.mv), 'L/min', ''], ['EtCO2', f0(etco2), 'mm Hg', ''], ['FiO2', o.fio2.toFixed(2), '', ''], ['HR', f0(70 + 25 * Math.max(0, 1 - o.spo2) * 10 + 10 * Math.max(0, o.rrTot - 20) / 10), '/min', ''], ['MAP', o.map + '', 'mm Hg', o.co < 3.2 ? 'alarm' : '']
  ] : [
    ['Ppeak', f0(o.ppeak), 'cm H2O', o.ppeak > 38 ? 'alarm' : ''], ['Pplat', f0(o.pplat), 'end-insp alveolar', o.pplat > 30 ? 'alarm' : ''], ['PEEP', f0(o.peep) + (o.autoPeep > 0.5 ? ' (+' + f1(o.autoPeep) + ')' : ''), 'set (auto)', o.autoPeep > 3 ? 'alarm' : ''], ['Pmean', f0(tr ? tr.pmean : 0), 'cm H2O', ''],
    ['VTe', f0(s.mode === 'niv' ? o.vt * 0.9 : o.vt), 'mL', ''], ['MVe', f1(o.mv), 'L/min', o.mv < 4 ? 'alarm' : ''], ['f', f0(o.rrTot) + (o.spontRR > 0.5 ? ' (' + f0(Math.min(o.rrTot, o.spontRR)) + ')' : ''), 'total (spont)', o.rrTot > 35 ? 'alarm' : ''], ['I:E', '1:' + f1(o.te / Math.max(0.1, o.ti)), '', ''],
    ['FiO2', o.fio2.toFixed(2), '', ''], ['SpO2', o.spo2pct + '', '%', o.spo2pct < 88 ? 'alarm' : ''], ['EtCO2', f0(etco2), 'mm Hg', ''], ['Cstat', f0(o.vt / Math.max(1, o.dp)), 'mL/cm H2O', '']
  ];
  const alarms = vsAlarms(o, s);
  return h('div', { class: 'vsc-tiles', 'data-vs-tiles': '1' }, [
    h('div', { class: 'vsc-alarms' + (alarms.length ? ' on' : ''), 'data-vs-alarms': alarms.length }, [h('span', { text: alarms.length ? '⚠ ' + alarms.join(' · ') : (own ? 'Monitor' : 'No alarms') })]),
    h('div', { class: 'vsc-grid' }, tiles.map(t => h('div', { class: 'vsc-tile' + (t[3] ? ' ' + t[3] : ''), 'data-tile': t[0] }, [h('span', { class: 'vsc-k', text: t[0] }), h('b', { class: 'vsc-v', text: t[1] }), h('span', { class: 'vsc-u', text: t[2] })])))
  ]);
}
function vsScreen() {
  const s = vsSettings(), own = s && (s.mode === 'o2' || s.mode === 'hfnc');
  const cv = h('canvas', { class: 'vsc-canvas', width: SCR.W, height: SCR.H, 'aria-label': 'Ventilator waveforms: pressure, flow and volume against time' });
  VS.canvas = cv;
  const head = h('div', { class: 'vsc-head' }, [h('span', { class: 'vsc-mode', 'data-vs-screenmode': '1', text: s ? vsSummary(s) : '' }), h('span', { class: 'vsc-brand', text: own ? 'Bedside monitor' : 'Ventilator' })]);
  const mon = h('div', { 'data-vs-monitor': '1' }, [vsScreenTiles()]);
  return h('div', { class: 'vent-screen' + (own ? ' monitor' : ''), 'data-vs-screen': '1' }, [head, h('div', { class: 'vsc-body' }, [cv, mon])]);
}
/* draw one frame of the screen: the traces of the cycle repeated across an 8 s window with a sweeping cursor */
function vsDrawScreen(now) {
  const cv = VS.canvas, tr = VS.tr; if (!cv || !cv.isConnected) return;
  const dpr = Math.min(3, window.devicePixelRatio || 1), W = Math.max(200, cv.clientWidth || SCR.W), H = Math.round(W * SCR.H / SCR.W), win = SCR.win;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0b1620'; ctx.fillRect(0, 0, W, H);
  const rh = (H - 16) / 3;
  const rows = [
    { key: 'paw', name: tr && tr.own ? 'Effort (Pmus)  cm H2O' : 'Paw  cm H2O', col: '#f2c14e', y0: 6, hgt: rh - 4, lo: 0, hi: 40 },
    { key: 'flow', name: 'Flow  L/min', col: '#7bd389', y0: 6 + rh, hgt: rh - 4, lo: -100, hi: 100 },
    { key: 'vol', name: 'Volume  mL', col: '#6fb7ff', y0: 6 + 2 * rh, hgt: rh - 4, lo: 0, hi: 800 }
  ];
  const left = 44, right = W - 8;
  if (tr) {
    const pawArr = tr.own ? tr.pmus : tr.paw;
    rows[0].lo = Math.min(0, Math.floor(Math.min.apply(null, pawArr) / 5) * 5); rows[0].hi = Math.max(10, Math.ceil((Math.max.apply(null, pawArr) + 4) / 10) * 10);
    const fm = Math.max(20, Math.ceil((Math.max(Math.max.apply(null, tr.flow), -Math.min.apply(null, tr.flow)) + 10) / 20) * 20); rows[1].lo = -fm; rows[1].hi = fm;
    rows[2].hi = Math.max(200, Math.ceil((Math.max.apply(null, tr.vol) + 60) / 100) * 100);
  }
  const cursorT = ((now - VS.anim.t0) / 1000) % win, cx = left + (right - left) * cursorT / win;
  rows.forEach(r => {
    const Y = (v) => r.y0 + r.hgt - (v - r.lo) / (r.hi - r.lo) * r.hgt;
    ctx.strokeStyle = '#1e3140'; ctx.lineWidth = 1;
    [r.lo, (r.lo + r.hi) / 2, r.hi].forEach(v => { ctx.beginPath(); ctx.moveTo(left, Y(v)); ctx.lineTo(right, Y(v)); ctx.stroke(); });
    if (r.lo < 0 && r.hi > 0) { ctx.strokeStyle = '#2e4a5e'; ctx.beginPath(); ctx.moveTo(left, Y(0)); ctx.lineTo(right, Y(0)); ctx.stroke(); }
    ctx.fillStyle = '#8fa7b8'; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(String(r.hi), left - 4, r.y0 + 9); ctx.fillText(String(r.lo), left - 4, r.y0 + r.hgt - 1); if (r.lo < 0) ctx.fillText('0', left - 4, Y(0) + 3);
    ctx.textAlign = 'left'; ctx.fillStyle = r.col; ctx.font = '600 11px system-ui, sans-serif'; ctx.fillText(r.name, left + 4, r.y0 + 10);
    if (!tr) return;
    const arr = r.key === 'paw' && tr.own ? tr.pmus : tr[r.key], n = arr.length, T = tr.T;
    const at = (t) => arr[Math.min(n - 1, Math.floor(((t % T) + T) % T / T * n))];
    // the old trace (right of the cursor, dimmer) and the fresh trace (left of the cursor)
    const draw = (from, to, alpha) => {
      ctx.globalAlpha = alpha; ctx.strokeStyle = r.col; ctx.lineWidth = 1.8; ctx.beginPath();
      let first = true;
      for (let x = from; x <= to; x += 1) { const t = (x - left) / (right - left) * win; const v = at(t); const y = Math.max(r.y0, Math.min(r.y0 + r.hgt, Y(v))); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); }
      ctx.stroke(); ctx.globalAlpha = 1;
    };
    draw(left, Math.max(left, cx - 1), 1);
    const gap = (right - left) * 0.045;
    if (cx + gap < right) draw(cx + gap, right, 0.35);
  });
  ctx.fillStyle = '#f6efd6'; ctx.fillRect(cx, 4, 1.5, H - 8);
  ctx.fillStyle = '#8fa7b8'; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(win + ' s window', right, H - 4);
}
/* ---------- the lungs ---------- */
function vsLungsSvg() {
  const o = VS.out, p = vsPatient(), s = vsSettings();
  const svg = sv('svg', { viewBox: '0 0 320 330', class: 'vs-lungs', role: 'img', 'aria-label': 'The lungs breathing with the settings' });
  const sat = o ? o.spo2 : 0.97;
  const pink = [244, 181, 173], blue = [122, 140, 190], k = Math.max(0, Math.min(1, (0.98 - sat) / 0.25));
  const fill = 'rgb(' + pink.map((c, i) => Math.round(c + (blue[i] - c) * k)).join(',') + ')';
  // chest wall
  svg.appendChild(sv('path', { d: 'M160 28 C 60 28 28 110 30 200 C 32 270 90 318 160 318 C 230 318 288 270 290 200 C 292 110 260 28 160 28 Z', class: 'lg-wall' + (p.cwStiff ? ' stiff' : '') }));
  for (let i = 0; i < 6; i++) { const y = 70 + i * 36; svg.appendChild(sv('path', { d: 'M46 ' + y + ' Q 160 ' + (y + 26) + ' 274 ' + y, class: 'lg-rib' })); }
  // the lungs, scaled about the hilum by the volume (base inflation + the tidal breath); the diaphragm drops with them
  const g = sv('g', { class: 'lg-lungs', 'data-lungs': '1' });
  const lungPath = (side) => side < 0 ? 'M150 92 C 110 80 70 108 62 164 C 54 220 70 268 120 272 C 150 274 152 240 152 196 Z' : 'M170 92 C 210 80 250 108 258 164 C 266 220 250 268 200 272 C 170 274 168 240 168 196 Z';
  const lungs = sv('g', { class: 'lg-pair', 'data-lung-pair': '1' });
  [-1, 1].forEach(side => {
    lungs.appendChild(sv('path', { d: lungPath(side), class: 'lg-lung', fill: fill, 'data-lung': side < 0 ? 'r' : 'l' }));
    // stiffness: hatching that thickens as compliance falls
    if (p.crs < 45) { const op = Math.min(0.9, (45 - p.crs) / 35); const hg = sv('g', { class: 'lg-fib', opacity: op.toFixed(2) }); for (let i = 0; i < 9; i++) { const y = 110 + i * 20; hg.appendChild(sv('path', { d: side < 0 ? 'M70 ' + y + ' L146 ' + (y + 12) : 'M174 ' + (y + 12) + ' L250 ' + y, class: 'lg-hatch' })); } lungs.appendChild(hg); }
    // shunt: airless (consolidated, collapsed) patches, the dependent lung first; PEEP opens the recruitable ones
    const sh = o ? o.shuntEff : p.shunt, n = Math.max(0, Math.round(sh * 20) - 1) * 2;
    const spots = side < 0 ? [[100, 248], [128, 252], [82, 228], [116, 222], [94, 202], [128, 196], [78, 176], [112, 170], [100, 146], [130, 144], [88, 122]] : [[220, 248], [192, 252], [238, 228], [204, 222], [226, 202], [192, 196], [242, 176], [208, 170], [220, 146], [190, 144], [232, 122]];
    for (let i = 0; i < Math.min(spots.length, Math.ceil(n / 2) + (side < 0 && n % 2 ? 0 : 0)); i++) lungs.appendChild(sv('circle', { cx: spots[i][0], cy: spots[i][1], r: 9 + (i % 3) * 2, class: 'lg-cons' }));
  });
  g.appendChild(lungs);
  // the airway: thickens and narrows with resistance
  const rawK = Math.max(0, Math.min(1, (p.raw - 6) / 30));
  const tree = sv('g', { class: 'lg-tree' });
  tree.appendChild(sv('path', { d: 'M160 30 L160 100', class: 'lg-trachea', 'stroke-width': 11 }));
  tree.appendChild(sv('path', { d: 'M160 100 L128 134 M160 100 L192 134', class: 'lg-bronchus', 'stroke-width': (7 - 3 * rawK).toFixed(1) }));
  tree.appendChild(sv('path', { d: 'M128 134 L108 160 M128 134 L136 170 M192 134 L212 160 M192 134 L184 170', class: 'lg-bronchus', 'stroke-width': (4.5 - 2.5 * rawK).toFixed(1) }));
  if (rawK > 0.3) tree.appendChild(sv('path', { d: 'M128 134 L108 160 M192 134 L212 160', class: 'lg-spasm', opacity: rawK.toFixed(2), 'stroke-width': (8 + 4 * rawK).toFixed(1) }));
  g.appendChild(tree);
  const dia = sv('path', { class: 'lg-dia', 'data-dia': '1', d: 'M40 296 Q 160 236 280 296' }); g.appendChild(dia);
  svg.appendChild(g);
  // the ventilator or the mask or the cannula
  const dev = sv('g', { class: 'lg-dev' });
  if (s && (s.mode === 'vcac' || s.mode === 'pcac' || s.mode === 'psv')) { dev.appendChild(sv('rect', { x: 150, y: 2, width: 20, height: 40, rx: 4, class: 'lg-tube' })); dev.appendChild(sv('text', { x: 176, y: 20, class: 'lg-devt' })).textContent = 'tube'; }
  else if (s && s.mode === 'niv') { dev.appendChild(sv('path', { d: 'M130 4 L190 4 L178 30 L142 30 Z', class: 'lg-mask' })); dev.appendChild(sv('text', { x: 194, y: 20, class: 'lg-devt' })).textContent = 'mask'; }
  else if (s && s.mode === 'hfnc') { dev.appendChild(sv('path', { d: 'M148 6 L160 26 L172 6', class: 'lg-cannula' })); dev.appendChild(sv('text', { x: 176, y: 20, class: 'lg-devt' })).textContent = 'high-flow'; }
  const cap = sv('text', { x: 160, y: 326, class: 'lg-cap', 'text-anchor': 'middle' }); cap.textContent = o ? 'SpO2 ' + o.spo2pct + '% · Crs ' + p.crs + ' · Raw ' + p.raw + ' · shunt ' + Math.round((o.shuntEff) * 100) + '%' + (o.autoPeep > 0.5 ? ' · trapped ' + o.trappedMl.toFixed(0) + ' mL' : '') : '';
  svg.appendChild(dev); svg.appendChild(cap);
  return svg;
}
/* each frame: scale the lungs about the hilum by the volume in them, drop the diaphragm */
function vsAnimateLungs(now) {
  const tr = VS.tr, o = VS.out, p = vsPatient(); if (!tr || !o) return;
  const pair = document.querySelector('[data-lung-pair]'), dia = document.querySelector('[data-dia]'); if (!pair || !pair.isConnected) return;
  const T = tr.T, t = ((now - VS.anim.t0) / 1000) % T, i = Math.min(tr.vol.length - 1, Math.floor(t / T * tr.vol.length));
  // the volume above a normal FRC: what the PEEP holds, what is trapped, an emphysematous baseline, and the breath itself
  const base = (o.peepSet || 0) * p.crs + (p.obstructive ? 350 : 0), v = base + tr.vol[i];
  const sc = 0.9 + 0.00022 * Math.min(1300, v);
  pair.setAttribute('transform', 'translate(160 92) scale(' + sc.toFixed(4) + ') translate(-160 -92)');
  const lowest = 92 + 182 * sc, ctrl = 2 * (lowest + 5 - 148);
  dia.setAttribute('d', 'M40 296 Q 160 ' + ctrl.toFixed(1) + ' 280 296');
  VS.anim.vol = v;
}
/* ---------- the pressure–volume panel ---------- */
function vsPvSvg() {
  const o = VS.out, p = vsPatient(), pv = VT.pvCurve(p);
  const W = 320, H = 230, x0 = 40, x1 = 305, y0 = 14, y1 = 200, PMAX = 50, VMAX = Math.max(900, pv.vmax * 1.05);
  const X = (P) => x0 + (x1 - x0) * P / PMAX, Y = (V) => y1 - (y1 - y0) * V / VMAX;
  const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'vs-pv', role: 'img', 'aria-label': 'Pressure–volume curve of the respiratory system with the current breath' });
  for (let P = 0; P <= PMAX; P += 10) { svg.appendChild(sv('line', { x1: X(P), y1: y0, x2: X(P), y2: y1, class: 'ph-grid' })); svg.appendChild(svt(X(P), y1 + 12, String(P), { class: 'ph-tick', 'text-anchor': 'middle' })); }
  const vstep = VMAX > 1500 ? 600 : 300;
  for (let V = 0; V <= VMAX; V += vstep) { { svg.appendChild(sv('line', { x1: x0, y1: Y(V), x2: x1, y2: Y(V), class: 'ph-grid' })); svg.appendChild(svt(x0 - 3, Y(V) + 3, String(V), { class: 'ph-tick', 'text-anchor': 'end' })); } }
  svg.appendChild(svt((x0 + x1) / 2, H - 2, 'airway pressure (cm H2O)', { class: 'ph-tick', 'text-anchor': 'middle' }));
  svg.appendChild(svt(x0 + 2, y0 + 9, 'volume above FRC (mL)', { class: 'ph-tick' }));
  let d = ''; for (let i = 0; i <= 100; i++) { const P = PMAX * i / 100; d += (i ? ' L' : 'M') + X(P).toFixed(1) + ' ' + Y(Math.min(VMAX, pv.f(P))).toFixed(1); }
  svg.appendChild(sv('path', { d: d, class: 'pv-curve' }));
  svg.appendChild(sv('line', { x1: X(pv.uip), y1: y0, x2: X(pv.uip), y2: y1, class: 'pv-mark' })); svg.appendChild(svt(X(pv.uip) + 3, y0 + 20, 'upper inflection', { class: 'ph-tick' }));
  svg.appendChild(sv('line', { x1: X(pv.lip), y1: y0, x2: X(pv.lip), y2: y1, class: 'pv-mark' })); svg.appendChild(svt(X(pv.lip) + 3, y0 + 34, 'lower inflection', { class: 'ph-tick' }));
  if (o) {
    const vent = o.mode === 'vcac' || o.mode === 'pcac' || o.mode === 'psv' || o.mode === 'niv';
    const pA = o.peepTot, pB = Math.min(PMAX, o.pplat), vA = pv.f(pA), vB = Math.min(VMAX, vA + o.vt);
    const over = o.pplat > pv.uip;
    svg.appendChild(sv('line', { x1: X(pA), y1: Y(vA), x2: X(pB), y2: Y(vB), class: 'pv-breath' + (over ? ' over' : ''), 'data-pv-over': over ? '1' : '0' }));
    svg.appendChild(sv('circle', { cx: X(pA), cy: Y(vA), r: 4, class: 'pv-pt' })); svg.appendChild(sv('circle', { cx: X(pB), cy: Y(vB), r: 4, class: 'pv-pt' + (over ? ' over' : '') }));
    svg.appendChild(svt(X(pA) + 7, Y(vA) + 12, (vent ? 'PEEP ' : 'rest ') + pA.toFixed(0), { class: 'ph-tick' }));
    const endRight = X(pB) < x1 - 110;
    svg.appendChild(svt(X(pB) + (endRight ? 7 : -7), Y(vB) - 6, (vent ? 'plateau ' : 'end-insp ') + o.pplat.toFixed(0) + ' · ΔP ' + o.dp.toFixed(0), { class: 'ph-tick' + (over ? ' warn' : ''), 'text-anchor': endRight ? 'start' : 'end' }));
    if (over) svg.appendChild(svt(X(pB) + (endRight ? 7 : -7), Y(vB) + 12, 'overdistension', { class: 'ph-tick warn', 'text-anchor': endRight ? 'start' : 'end' }));
  }
  return svg;
}
/* ---------- the patient panel ---------- */
function vsPatientPanel() {
  const c = vsCase(), p = vsPatient();
  const rows = PATIENT_SLIDERS.map(sl => { const id = uid('vp'); const val = h('span', { class: 'odc-val', text: fmtP(sl[0], p[sl[0]]) }); return h('label', { class: 'odc-sl', for: id, title: sl[6] }, [h('span', { class: 'nod-l', text: sl[1] + (sl[5] ? ' (' + sl[5] + ')' : '') }), h('input', { type: 'range', id: id, min: sl[2], max: sl[3], step: sl[4], value: p[sl[0]], 'data-vp': sl[0], oninput: (e) => { VS.pOver[sl[0]] = +e.target.value; val.textContent = fmtP(sl[0], +e.target.value); vsRefresh(); } }), val]); });
  const cwId = uid('vp');
  rows.push(h('label', { class: 'chk-inline', for: cwId, title: 'Obesity, ascites, a burn: the chest wall takes a share of every pressure' }, [h('input', { type: 'checkbox', id: cwId, checked: !!p.cwStiff, 'data-vp': 'cwStiff', onchange: (e) => { VS.pOver.cwStiff = e.target.checked; vsRefresh(); } }), 'Stiff chest wall']));
  rows.push(h('button', { type: 'button', class: 'lnk', 'data-vp-reset': '1', text: 'Reset to the case', onclick: () => { VS.pOver = {}; render(); } }));
  return h('div', { class: 'vs-patient', 'data-vs-patient': '1' }, [h('h5', { text: 'The patient’s lungs (' + c.title + ')' }), h('div', { class: 'odc-ctrls' }, rows), h('p', { class: 'fine', text: 'Change the disease and watch the screen, the lungs and the gases follow: stiffen the lung and the plateau climbs; narrow the airway and the time constant lengthens; add shunt and the PaO2 falls whatever the FiO2.' })]);
}
function fmtP(k, v) { return k === 'shunt' || k === 'vdAlv' ? Math.round(v * 100) + '%' : (k === 'recruit' ? Math.round(v * 100) + '%' : (k === 'driveK' ? (+v).toFixed(1) + '×' : String(v))); }
/* ---------- the results (live) ---------- */
function vsLiveBlock() {
  const c = vsCase(), o = VS.out;
  if (!o) return h('p', { class: 'fine', text: 'Choose a level of support (or follow the triage verdict) to see the gases.' });
  const v = VT.verdict(c, o);
  const f1 = (x, d) => x.toFixed(d === undefined ? 0 : d);
  const abg = h('div', { class: 'vs-gas', 'data-vs-abg': '1' }, [h('h5', { text: 'Arterial gas' }), h('div', { class: 'vs-gasgrid' }, [['pH', f1(o.ph, 2)], ['PaCO2', f1(o.paco2) + ' mm Hg'], ['PaO2', f1(o.pao2) + ' mm Hg'], ['HCO3', f1(o.hco3) + ' mmol/L'], ['SaO2', f1(o.sao2 * 100) + '%'], ['A–a', f1(Math.max(0, o.aa))], ['PaO2/FiO2', f1(o.pf)], ['FiO2', o.fio2.toFixed(2)]].map(x => h('div', { class: 'vs-cell' }, [h('span', { class: 'lbl', text: x[0] }), h('b', { text: x[1] })])))]);
  const vbg = h('div', { class: 'vs-gas', 'data-vs-vbg': '1' }, [h('h5', { text: 'Venous gas' }), h('div', { class: 'vs-gasgrid' }, [['pH', f1(o.phv, 2)], ['PvCO2', f1(o.pvco2) + ' mm Hg'], ['PvO2', f1(o.pvo2) + ' mm Hg'], ['HCO3', f1(o.hco3v) + ' mmol/L'], ['SvO2', f1(o.svO2 * 100) + '%']].map(x => h('div', { class: 'vs-cell' }, [h('span', { class: 'lbl', text: x[0] }), h('b', { text: x[1] })]))), h('p', { class: 'fine', text: 'The venous gas tracks the arterial for pH and CO2 (about 0.03–0.05 and 5–6 mm Hg apart, more with a low output) and says nothing about the PaO2.' })]);
  const mechRows = [['Delivered VT', f1(o.vt) + ' mL (' + f1(o.vtKg, 1) + ' mL/kg PBW)'], ['Rate (total / patient)', f1(o.rrTot) + ' / ' + f1(o.spontRR)], ['Minute ventilation', f1(o.mv, 1) + ' L/min'], ['Dead-space fraction', f1(o.vdFrac, 2)], ['Alveolar ventilation', f1(o.va, 1) + ' L/min'], ['Inspiratory / expiratory time', f1(o.ti, 2) + ' / ' + f1(o.te, 1) + ' s'], ['Time constant', f1(o.tau, 2) + ' s'], ['Peak / plateau', f1(o.ppeak) + ' / ' + f1(o.pplat) + ' cm H2O'], ['PEEP set + auto', f1(o.peep) + ' + ' + f1(o.autoPeep, 1) + ' = ' + f1(o.peepTot, 1)], ['Driving pressure', f1(o.dp) + ' cm H2O'], ['Cardiac output / MAP', f1(o.co, 1) + ' L/min / ' + o.map + ' mm Hg']];
  const mech = h('div', { class: 'vs-gas', 'data-vs-mech': '1' }, [h('h5', { text: o.supported ? 'Mechanics and circulation' : 'Breathing and circulation' }), h('div', { class: 'hl-rg' }, mechRows.map(r => h('div', { class: 'hl-r' }, [h('span', { class: 'lbl', text: r[0] }), h('b', { text: r[1] })])))]);
  const read = h('p', { class: 'vs-read', 'data-vs-read': '1' }, [h('span', { class: 'lbl', text: 'Reading. ' }), VT.acidBase(o)]);
  const checks = h('div', { class: 'vs-checks', 'data-vs-verdict': v.dead ? 'dead' : (v.met === v.total ? 'all' : 'some') }, [
    h('p', { class: 'vs-sum' + (v.dead ? ' bad' : (v.met === v.total ? ' good' : '')) }, [h('b', { text: (VS.day ? 'A day later: ' : 'An hour later: ') }), v.summary + ' (' + v.met + ' of ' + v.total + ' targets)']),
    h('ul', { class: 'vs-targets' }, v.checks.map(k => h('li', { class: k.ok ? 'ok' : 'no', 'data-target': k.ok ? 'ok' : 'no' }, [h('span', { class: 'vs-mark', text: k.ok ? '✓' : '✗' }), h('span', {}, [h('b', { text: k.name }), k.advice ? h('span', { class: 'vs-adv', text: ' — ' + k.advice }) : null])])))
  ]);
  const log = VS.log.length ? h('div', { class: 'tbl-wrap' }, [h('table', { class: 'edu-tbl vs-log', 'data-vs-log': '1' }, [h('thead', {}, [h('tr', {}, ['When', 'Support', 'pH', 'PaCO2', 'PaO2', 'SpO2', 'HCO3'].map(x => h('th', { text: x })))]), h('tbody', {}, VS.log.map(r => h('tr', {}, [h('td', { text: r.when }), h('td', { text: r.set }), h('td', { text: r.ph.toFixed(2) }), h('td', { text: r.paco2.toFixed(0) }), h('td', { text: r.pao2.toFixed(0) }), h('td', { text: Math.round(r.spo2 * 100) + '%' }), h('td', { text: r.hco3.toFixed(0) })])))])]) : null;
  return h('div', { class: 'vs-results' }, [h('div', { class: 'vs-gases' }, [abg, vbg]), read, mech, checks, log]);
}
/* ---------- the animation loop ---------- */
function vsFrame(now) {
  VS.anim.raf = 0;
  const scr = document.querySelector('[data-vs-screen]'); if (!scr || !scr.isConnected) return;
  vsDrawScreen(now); vsAnimateLungs(now);
  VS.anim.raf = requestAnimationFrame(vsFrame);
}
function ventSimFig() {
  const c = vsCase();
  if (!VS.s) VS.s = vsDefaults(VS.plan || 'tube');
  vsCompute();
  const tabs = h('div', { class: 'seg vs-cases', role: 'tablist', 'aria-label': 'Case' }, VT.CASES.map(x => h('button', { type: 'button', class: 'ch', role: 'tab', 'data-case': x.id, 'aria-selected': String(x.id === c.id), text: x.title, onclick: () => { VS.caseId = x.id; VS.plan = ''; VS.triaged = ''; VS.s = null; VS.out = null; VS.log = []; VS.pOver = {}; VS.day = 0; render(); } })));
  const present = h('div', { class: 'vs-present', 'data-case-present': c.id }, [h('p', {}, [h('b', { text: c.title + '. ' }), c.who]), h('p', { class: 'vs-abg0' }, [h('span', { class: 'lbl', text: 'Gases at presentation. ' }), c.abg]), h('p', { class: 'fine', text: 'Predicted body weight ' + VT.PBW(c.p.sex, c.p.cm).toFixed(0) + ' kg (6 mL/kg = ' + Math.round(6 * VT.PBW(c.p.sex, c.p.cm)) + ' mL, 8 mL/kg = ' + Math.round(8 * VT.PBW(c.p.sex, c.p.cm)) + ' mL).' })]);
  const VERD = { best: 'Best choice', reasonable: 'Reasonable', poor: 'Poor choice', wrong: 'Wrong' };
  const triage = h('div', { class: 'vs-step', 'data-step': 'triage' }, [h('h4', { text: '1 · Triage: what level of support?' }),
    h('div', { class: 'vs-options' }, c.triage.map(t => h('button', { type: 'button', class: 'btn sm' + (VS.triaged === t[0] ? ' on' : ''), 'data-triage': t[0], text: t[1], onclick: () => { VS.triaged = t[0]; render(); } }))),
    VS.triaged ? (() => { const t = c.triage.filter(x => x[0] === VS.triaged)[0]; return h('div', { class: 'vs-verdict ' + t[2], 'data-triage-verdict': t[2] }, [h('b', { text: VERD[t[2]] + '. ' }), t[3], ' ', h('button', { type: 'button', class: 'lnk', 'data-triage-go': t[0], text: 'Proceed with this →', onclick: () => { VS.plan = t[0]; VS.s = vsDefaults(t[0]); VS.day = 0; render(); } })]); })() : h('p', { class: 'fine', text: 'Pick one; the verdict and the reasoning follow, then set the support.' })
  ]);
  const s = VS.s, plan = VS.plan || '';
  const planSeg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Support' }, [['o2', 'Oxygen'], ['hfnc', 'High flow'], ['niv', 'NIV'], ['tube', 'Ventilator']].map(x => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-plan': x[0], 'aria-checked': String(plan === x[0]), text: x[1], onclick: () => { VS.plan = x[0]; VS.s = vsDefaults(x[0]); VS.day = 0; render(); } })));
  const num = (key, label, min, max, step, unit, title) => { const id = uid('vs'); return h('label', { class: 'nod-f vs-f', for: id, title: title || null }, [h('span', { class: 'nod-l', text: label + (unit ? ' (' + unit + ')' : '') }), h('input', { type: 'number', class: 'num', id: id, 'data-vs': key, min: min, max: max, step: step, value: VS.s[key], oninput: (e) => { const v = +e.target.value; if (isFinite(v) && v >= min && v <= max) { VS.s[key] = v; vsRefresh(); const sm = document.querySelector('[data-vs-screenmode]'); if (sm) sm.textContent = vsSummary(vsSettings()); } } })]); };
  const sel = (key, label, opts) => { const id = uid('vs'); return h('label', { class: 'nod-f vs-f', for: id }, [h('span', { class: 'nod-l', text: label }), h('select', { id: id, 'data-vs': key, onchange: (e) => { VS.s[key] = e.target.value; if (key === 'mode') { const d = vsDefaults('tube'); VS.s = Object.assign(d, { mode: e.target.value, sed: VS.s.sed }); render(); } else { vsRefresh(); const sm = document.querySelector('[data-vs-screenmode]'); if (sm) sm.textContent = vsSummary(vsSettings()); } } }, opts.map(o => h('option', { value: o[0], selected: VS.s[key] === o[0], text: o[1] })))]); };
  let panel = null;
  if (plan === 'o2') panel = h('div', { class: 'nod-grid' }, [sel('dev', 'Device', O2DEV.map(d => [d[0], d[1] + ' (FiO2 ≈ ' + d[2] + ')']))]);
  else if (plan === 'hfnc') panel = h('div', { class: 'nod-grid' }, [num('flow', 'Flow', 20, 70, 5, 'L/min'), num('fio2', 'FiO2', 0.21, 1, 0.05, '')]);
  else if (plan === 'niv') panel = h('div', { class: 'nod-grid' }, [num('ipap', 'IPAP', 6, 30, 1, 'cm H2O', 'Pressure support = IPAP − EPAP'), num('epap', 'EPAP', 3, 15, 1, 'cm H2O'), num('fio2', 'FiO2', 0.21, 1, 0.05, ''), num('rr', 'Backup rate', 8, 25, 1, '/min'), num('ti', 'Inspiratory time (backup breaths)', 0.6, 1.6, 0.1, 's')]);
  else if (plan === 'tube') panel = h('div', { class: 'nod-grid' }, [
    sel('mode', 'Mode', [['vcac', 'Volume control – assist control'], ['pcac', 'Pressure control – assist control'], ['psv', 'Pressure support (with backup)']]),
    s.mode === 'vcac' ? num('vt', 'Tidal volume', 200, 900, 10, 'mL', 'Predicted body weight ' + VT.PBW(c.p.sex, c.p.cm).toFixed(0) + ' kg') : null,
    s.mode === 'pcac' ? num('pinsp', 'Inspiratory pressure above PEEP', 5, 35, 1, 'cm H2O') : null,
    s.mode === 'psv' ? num('ps', 'Pressure support', 4, 25, 1, 'cm H2O') : null,
    num('rr', s.mode === 'psv' ? 'Backup rate' : 'Rate', 6, 40, 1, '/min'),
    s.mode === 'vcac' ? num('flow', 'Inspiratory flow', 20, 120, 5, 'L/min', 'Ti = VT / flow') : num('ti', 'Inspiratory time', 0.5, 2.0, 0.1, 's'),
    num('peep', 'PEEP', 0, 24, 1, 'cm H2O'), num('fio2', 'FiO2', 0.21, 1, 0.05, ''),
    sel('sed', 'Sedation', [['none', 'Awake'], ['light', 'Light sedation'], ['deep', 'Deep sedation'], ['paralysed', 'Paralysed']])
  ]);
  const timeSeg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'When' }, [[0, 'An hour later'], [1, 'A day later']].map(x => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-vs-when': x[0], 'aria-checked': String(VS.day === x[0]), text: x[1], title: x[0] ? 'The kidney compensates; treatment of the cause has had a day' : '', onclick: (e) => { VS.day = x[0]; e.target.parentElement.querySelectorAll('[data-vs-when]').forEach(b => b.setAttribute('aria-checked', String(+b.getAttribute('data-vs-when') === VS.day))); vsRefresh(); } })));
  const apply = h('div', { class: 'vs-apply' }, [timeSeg, h('button', { type: 'button', class: 'btn sm', 'data-vs-record': '1', text: 'Record this gas to the chart', onclick: vsRecord, disabled: !plan }), h('span', { class: 'fine', text: plan ? 'Everything updates as you change a setting; the chart keeps the gases you record.' : 'Choose a level of support (or follow the triage verdict).' })]);
  const settings = h('div', { class: 'vs-step', 'data-step': 'settings' }, [h('h4', { text: '2 · Set the support — and watch the screen' }),
    h('div', { class: 'vs-set-grid' }, [h('div', { class: 'vs-set-left' }, [planSeg, panel, apply]), plan ? vsScreen() : h('div', { class: 'vent-screen off', 'data-vs-screen': '1' }, [h('p', { class: 'vsc-off', text: 'The screen lights up once a level of support is chosen.' })])]),
    plan ? h('div', { class: 'vs-lung-grid' }, [h('div', { class: 'vs-lungbox' }, [h('h5', { text: 'The lungs' }), h('div', { 'data-vs-lungs-static': '1' }, [vsLungsSvg()])]), h('div', { class: 'vs-lungbox' }, [h('h5', { text: 'Pressure–volume: where the breath sits on the curve' }), h('div', { 'data-vs-pv': '1' }, [vsPvSvg()]), h('p', { class: 'fine', text: 'The respiratory system’s static curve: steep in the middle (the compliance), flat above the upper inflection where more pressure buys little volume and stretches what is open. The breath is the segment from PEEP to the plateau; a breath that runs past the upper inflection is overdistending.' })]), vsPatientPanel()]) : null]);
  const results = h('div', { class: 'vs-step', 'data-step': 'results' }, [h('h4', { text: '3 · What the settings make' }), h('div', { 'data-vs-live': '1' }, [vsLiveBlock()])]);
  const fig = h('figure', { class: 'an-fig vs-fig', 'data-ventsim': '1' }, [tabs, present, triage, settings, results, h('figcaption', { text: 'A teaching model (see the rules below the simulator): typical mechanics and gas exchange for each diagnosis, the patient’s own drive scaled by sedation, renal compensation after a day. The directions are right; the numbers are illustrative. The screen draws the breaths of the current settings from the equation of motion; the lungs breathe with them and colour with the saturation.' })]);
  if (plan) { VS.anim.t0 = performance.now(); if (!VS.anim.raf) VS.anim.raf = requestAnimationFrame(vsFrame); }
  return fig;
}
function ventWidget(kind) {
  if (kind === 'ventmodes') return ventModesFig();
  if (kind === 'ventsettings') return ventSettingsFig();
  if (kind === 'ventwaves') return ventWavesFig();
  if (kind === 'ventsim') return ventSimFig();
  return null;
}
