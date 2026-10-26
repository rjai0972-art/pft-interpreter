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
const VS = { caseId: 'copd', plan: '', triaged: '', s: null, out: null, day: 0, log: [] };
const O2DEV = [['nc2', 'Nasal cannula 2 L/min', 0.28], ['nc4', 'Nasal cannula 4 L/min', 0.36], ['mask6', 'Simple mask 6 L/min', 0.45], ['mask10', 'Mask 10 L/min', 0.6], ['nrb', 'Non-rebreather 15 L/min', 0.85]];
function vsCase() { return VT.CASES.filter(c => c.id === VS.caseId)[0]; }
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
function vsApply(day) {
  const c = vsCase(), s = vsSettings(); if (!s) return;
  VS.day = day;
  VS.out = VT.gas(c.p, s, { day: day });
  const o = VS.out;
  VS.log.push({ when: day ? 'a day later' : 'an hour later', mode: s.mode, set: vsSummary(s), ph: o.ph, paco2: o.paco2, pao2: o.pao2, spo2: o.spo2, hco3: o.hco3 });
  if (VS.log.length > 8) VS.log.shift();
  render();
}
function vsSummary(s) {
  if (s.mode === 'o2') return (O2DEV.filter(d => d[0] === s.dev)[0] || O2DEV[2])[1];
  if (s.mode === 'hfnc') return 'HFNC ' + s.flow + ' L/min, FiO2 ' + s.fio2.toFixed(2);
  if (s.mode === 'niv') return 'BiPAP ' + s.ipap + '/' + s.epap + ', FiO2 ' + s.fio2.toFixed(2) + ', backup ' + s.rr;
  const nm = { vcac: 'VC-AC', pcac: 'PC-AC', psv: 'PSV' }[s.mode];
  return nm + ' ' + (s.mode === 'vcac' ? 'VT ' + s.vt + ' × ' + s.rr + ', flow ' + s.flow : (s.mode === 'pcac' ? 'Pinsp ' + s.pinsp + ' × ' + s.rr + ', Ti ' + s.ti : 'PS ' + s.ps + ', backup ' + s.rr)) + ', PEEP ' + s.peep + ', FiO2 ' + s.fio2.toFixed(2) + ', ' + s.sed;
}
function ventSimFig() {
  const c = vsCase();
  if (!VS.s) VS.s = vsDefaults(VS.plan || 'tube');
  const tabs = h('div', { class: 'seg vs-cases', role: 'tablist', 'aria-label': 'Case' }, VT.CASES.map(x => h('button', { type: 'button', class: 'ch', role: 'tab', 'data-case': x.id, 'aria-selected': String(x.id === c.id), text: x.title, onclick: () => { VS.caseId = x.id; VS.plan = ''; VS.triaged = ''; VS.s = null; VS.out = null; VS.log = []; render(); } })));
  const present = h('div', { class: 'vs-present', 'data-case-present': c.id }, [h('p', {}, [h('b', { text: c.title + '. ' }), c.who]), h('p', { class: 'vs-abg0' }, [h('span', { class: 'lbl', text: 'Gases at presentation. ' }), c.abg]), h('p', { class: 'fine', text: 'Predicted body weight ' + VT.PBW(c.p.sex, c.p.cm).toFixed(0) + ' kg (6 mL/kg = ' + Math.round(6 * VT.PBW(c.p.sex, c.p.cm)) + ' mL, 8 mL/kg = ' + Math.round(8 * VT.PBW(c.p.sex, c.p.cm)) + ' mL).' })]);
  // step 1: triage
  const VERD = { best: 'Best choice', reasonable: 'Reasonable', poor: 'Poor choice', wrong: 'Wrong' };
  const triage = h('div', { class: 'vs-step', 'data-step': 'triage' }, [h('h4', { text: '1 · Triage: what level of support?' }),
    h('div', { class: 'vs-options' }, c.triage.map(t => h('button', { type: 'button', class: 'btn sm' + (VS.triaged === t[0] ? ' on' : ''), 'data-triage': t[0], text: t[1], onclick: () => { VS.triaged = t[0]; render(); } }))),
    VS.triaged ? (() => { const t = c.triage.filter(x => x[0] === VS.triaged)[0]; return h('div', { class: 'vs-verdict ' + t[2], 'data-triage-verdict': t[2] }, [h('b', { text: VERD[t[2]] + '. ' }), t[3], ' ', h('button', { type: 'button', class: 'lnk', 'data-triage-go': t[0], text: 'Proceed with this →', onclick: () => { VS.plan = t[0]; VS.s = vsDefaults(t[0]); VS.out = null; render(); } })]); })() : h('p', { class: 'fine', text: 'Pick one; the verdict and the reasoning follow, then set the support.' })
  ]);
  // step 2: settings
  const s = VS.s, plan = VS.plan || '';
  const planSeg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Support' }, [['o2', 'Oxygen'], ['hfnc', 'High flow'], ['niv', 'NIV'], ['tube', 'Ventilator']].map(x => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-plan': x[0], 'aria-checked': String(plan === x[0]), text: x[1], onclick: () => { VS.plan = x[0]; VS.s = vsDefaults(x[0]); VS.out = null; render(); } })));
  const num = (key, label, min, max, step, unit, title) => { const id = uid('vs'); return h('label', { class: 'nod-f vs-f', for: id, title: title || null }, [h('span', { class: 'nod-l', text: label + (unit ? ' (' + unit + ')' : '') }), h('input', { type: 'number', class: 'num', id: id, 'data-vs': key, min: min, max: max, step: step, value: VS.s[key], oninput: (e) => { const v = +e.target.value; if (isFinite(v)) VS.s[key] = v; } })]); };
  const sel = (key, label, opts) => { const id = uid('vs'); return h('label', { class: 'nod-f vs-f', for: id }, [h('span', { class: 'nod-l', text: label }), h('select', { id: id, 'data-vs': key, onchange: (e) => { VS.s[key] = e.target.value; if (key === 'mode') { const d = vsDefaults('tube'); VS.s = Object.assign(d, { mode: e.target.value, sed: VS.s.sed }); render(); } } }, opts.map(o => h('option', { value: o[0], selected: VS.s[key] === o[0], text: o[1] })))]); };
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
  const apply = h('div', { class: 'vs-apply' }, [
    h('button', { type: 'button', class: 'btn sm', 'data-vs-apply': '1', text: 'Apply — an hour later', onclick: () => vsApply(0), disabled: !plan }),
    h('button', { type: 'button', class: 'btn sm quiet', 'data-vs-day': '1', text: 'Then a day later', title: 'The kidney compensates; treatment of the cause has had a day', onclick: () => vsApply(1), disabled: !plan }),
    h('span', { class: 'fine', text: plan ? 'The patient’s own breathing is in the model: an awake patient triggers breaths above the set rate.' : 'Choose a level of support (or follow the triage verdict).' })
  ]);
  const settings = h('div', { class: 'vs-step', 'data-step': 'settings' }, [h('h4', { text: '2 · Set the support' }), planSeg, panel, apply]);
  // step 3: results
  let results = null;
  if (VS.out) {
    const o = VS.out, v = VT.verdict(c, o);
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
    const log = VS.log.length > 1 ? h('div', { class: 'tbl-wrap' }, [h('table', { class: 'edu-tbl vs-log', 'data-vs-log': '1' }, [h('thead', {}, [h('tr', {}, ['When', 'Support', 'pH', 'PaCO2', 'PaO2', 'SpO2', 'HCO3'].map(x => h('th', { text: x })))]), h('tbody', {}, VS.log.map(r => h('tr', {}, [h('td', { text: r.when }), h('td', { text: r.set }), h('td', { text: r.ph.toFixed(2) }), h('td', { text: r.paco2.toFixed(0) }), h('td', { text: r.pao2.toFixed(0) }), h('td', { text: Math.round(r.spo2 * 100) + '%' }), h('td', { text: r.hco3.toFixed(0) })])))])]) : null;
    results = h('div', { class: 'vs-step', 'data-step': 'results' }, [h('h4', { text: '3 · What the settings made' }), h('div', { class: 'vs-gases' }, [abg, vbg]), read, mech, checks, log]);
  }
  return h('figure', { class: 'an-fig vs-fig', 'data-ventsim': '1' }, [tabs, present, triage, settings, results, h('figcaption', { text: 'A teaching model (see the rules below the simulator): typical mechanics and gas exchange for each diagnosis, the patient’s own drive scaled by sedation, renal compensation after a day. The directions are right; the numbers are illustrative.' })]);
}
function ventWidget(kind) {
  if (kind === 'ventmodes') return ventModesFig();
  if (kind === 'ventsettings') return ventSettingsFig();
  if (kind === 'ventwaves') return ventWavesFig();
  if (kind === 'ventsim') return ventSimFig();
  return null;
}
