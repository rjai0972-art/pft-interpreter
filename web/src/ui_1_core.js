/* PFT Interpreter — interface. Everything on screen is generated from PFT.SCHEMA; the engine does the reasoning. */
(function () {
'use strict';
const P = window.PFT, X = window.PFT_EXAMPLES;
const pad2 = (n) => (n < 10 ? '0' : '') + n;
const toISO = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const todayISO = () => toISO(new Date());
function freshState() { const st = P.defaultState(); st.ctx.date = todayISO(); return st; }
function shiftMonths(iso, m) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? new Date(iso + 'T00:00:00') : new Date();
  if (isNaN(d.getTime())) return '';
  const day = d.getDate(); d.setMonth(d.getMonth() - m); if (d.getDate() !== day) d.setDate(0);
  return toISO(d);
}
let S = freshState();
let R = P.interpret(S);
let step = 'tests';
let mode = 'case';           // 'case' | 'learn' | 'bank'
let learnTopic = 'basics', learnTerm = '';
let widgets = [];            // paint callbacks for the currently rendered step
let toastTimer = null, newTimer = null, newArmed = false;

const SECKEY = { sixmw: 'six' };
const SHORT = { spiro: 'Spirometry', bd: 'Bronchodilator', fvl: 'Flow–volume loop', vol: 'Lung volumes', dlco: 'DLCO', raw: 'Resistance', osc: 'Oscillometry',
  mip: 'MIP / MEP', post: 'Upright / supine', feno: 'FeNO', bronch: 'Provocation', sixmw: '6MWT', cpet: 'CPET', gas: 'ABG', prior: 'Prior PFTs' };
const LVL = { alert: 'Alert', caution: 'Caution', note: 'Note', tip: 'Look for' };
const $ = (id) => document.getElementById(id);
const uniq = (a) => a.filter((x, i) => a.indexOf(x) === i);

/* --------------------------------------------------------------- DOM helper */
function h(tag, a, kids) {
  const el = document.createElement(tag);
  if (a) Object.keys(a).forEach(k => {
    const v = a[k];
    if (v === null || v === undefined || v === false) return;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else if (k === 'selected') el.selected = !!v;
    else if (k === 'style') String(v).split(';').forEach(d => { const i = d.indexOf(':'); if (i > 0) el.style.setProperty(d.slice(0, i).trim(), d.slice(i + 1).trim()); });
    else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  });
  (function add(list) {
    if (list === null || list === undefined || list === false) return;
    if (Array.isArray(list)) { list.forEach(add); return; }
    el.appendChild(typeof list === 'string' || typeof list === 'number' ? document.createTextNode(String(list)) : list);
  })(kids);
  return el;
}
let uidN = 0; const uid = (p) => (p || 'f') + (++uidN);
const hasNum = (v) => { const n = P.num(v); return typeof n === 'number' && isFinite(n); };
const plural = (n, w, ws) => n + ' ' + (n === 1 ? w : (ws || w + 's'));
const cap = (t) => t ? t.charAt(0).toUpperCase() + t.slice(1) : t;

/* ------------------------------------------------------------------- toast */
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* --------------------------------------------------------- clipboard (safe) */
function legacyCopy(text) {
  const ta = h('textarea', { 'aria-hidden': 'true', tabindex: '-1', style: 'position:fixed;left:-9999px;top:0;opacity:0', value: text });
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove(); return ok;
}
function showFallback(text) {
  const box = $('fallback'); if (!box) return;
  box.textContent = '';
  const ta = h('textarea', { class: 'case', readonly: true, rows: '8', 'aria-label': 'Text to copy', value: text });
  box.appendChild(h('p', { class: 'fine', text: 'Automatic copying is blocked here. The text is selected below: press Ctrl/Cmd + C.' }));
  box.appendChild(ta); ta.focus(); ta.select();
}
function copyText(text, okMsg) {
  const ok = () => toast(okMsg || 'Copied');
  const fb = () => { if (legacyCopy(text)) ok(); else { showFallback(text); toast('Copy blocked: text selected below'); } };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fb);
    else fb();
  } catch (e) { fb(); }
}

/* ------------------------------------------------------------- case codes */
function encodeCase() { return 'PFT1:' + btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
function decodeCase(s) {
  s = String(s || '').trim(); if (!s) return null;
  try {
    const m = /^PFT1:([A-Za-z0-9+/=]+)$/.exec(s);
    const json = m ? decodeURIComponent(escape(atob(m[1]))) : s;
    const o = JSON.parse(json);
    return (o && typeof o === 'object') ? P.normalizeState(o) : null;
  } catch (e) { return null; }
}

/* -------------------------------------------------------------------- steps */
function stepList() {
  const l = [{ id: 'tests', name: 'Tests' }, { id: 'ctx', name: 'Details' }];
  P.TESTS.forEach(t => { if (S.tests[t.key]) l.push({ id: t.key, name: SHORT[t.key] || t.name }); });
  l.push({ id: 'report', name: 'Report' });
  return l;
}
function secFor(mod) { return R.sections.filter(s => s.key === (SECKEY[mod] || mod))[0]; }
function stepHasData(id) {
  if (id === 'tests') return false;
  if (id === 'ctx') { const c = S.ctx; return !!(c.age || c.sex || c.ht || c.indication || (c.indic && c.indic.length)); }
  if (id === 'report') return R.anyData;
  const s = secFor(id); return !!(s && !s.empty);
}
function goto(id) {
  mode = 'case'; step = id; render();
  window.scrollTo(0, 0);
  const m = $('main'); if (m) m.focus({ preventScroll: true });
}
function neighbour(dir) {
  const l = stepList(); let i = -1;
  l.forEach((x, k) => { if (x.id === step) i = k; });
  return l[i + dir] || null;
}
function renderSteps() {
  const nav = $('steps'); const prevScroll = nav.scrollLeft; nav.textContent = '';
  nav.hidden = mode !== 'case';
  if (mode !== 'case') return;
  stepList().forEach(s => {
    const cls = ['pill'];
    if (stepHasData(s.id)) cls.push('has');
    if (s.id === 'report' && R.counts.alert > 0) cls.push('warn');
    const b = h('button', { type: 'button', class: cls.join(' '), 'data-step': s.id, 'aria-current': s.id === step ? 'step' : null, onclick: () => goto(s.id) },
      [h('span', { class: 'dot', 'aria-hidden': 'true' }), s.name]);
    nav.appendChild(b);
  });
  nav.scrollLeft = prevScroll;
  const cur = nav.querySelector('[aria-current="step"]');
  if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* ignore */ } }
}
function renderHeaderChip() {
  const c = R.counts, total = c.alert + c.caution + c.note + c.tip, box = $('hu-chip');
  box.textContent = '';
  if (!total) return;
  const lvl = c.alert ? 'alert' : (c.caution ? 'caution' : 'note');
  const bits = [];
  if (c.alert) bits.push(c.alert + ' alert'); if (c.caution) bits.push(c.caution + ' caution'); if (c.tip) bits.push(c.tip + ' look-for'); if (c.note) bits.push(c.note + ' note');
  box.appendChild(h('button', { type: 'button', class: 'chip ' + lvl, title: 'Open the heads-up list', 'aria-label': 'Heads-up: ' + bits.join(', ') + '. Open report.',
    onclick: () => { goto('report'); const hu = $('headsup'); if (hu && hu.scrollIntoView) hu.scrollIntoView({ block: 'start' }); } },
    ['Heads-up · ' + bits.join(' · ')]));
}

/* --------------------------------------------------------------- sync/paint */
function sync() {
  R = P.interpret(S);
  widgets.forEach(w => w());
  renderSteps(); renderHeaderChip(); renderViews();
}
function renderViews() {
  document.querySelectorAll('.vw').forEach(b => { if (b.getAttribute('data-view') === mode) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  const n = $('bank-n'); if (n) { const c = bankCount(); n.textContent = c ? String(c) : ''; n.hidden = !c; }
}
function setMode(m, opts) {
  mode = m; opts = opts || {};
  if (m === 'learn') { if (opts.topic) learnTopic = opts.topic; learnTerm = opts.term || ''; }
  render(); window.scrollTo(0, 0);
  const mm = $('main'); if (mm) mm.focus({ preventScroll: true });
  if (m === 'learn' && learnTerm) { const el = document.getElementById('term-' + learnTerm); if (el) { if (el.tagName === 'DETAILS') el.open = true; el.scrollIntoView({ block: 'start' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600); } }
}
function openLearn(topic, term) { closePop(); setMode('learn', { topic: topic, term: term }); }
function loadState(st, to, msg) {
  S = P.normalizeState(st); R = P.interpret(S); mode = 'case'; caseTok = rnd();
  const l = stepList(); step = l.some(x => x.id === to) ? to : 'tests';
  render(); window.scrollTo(0, 0);
  const m = $('main'); if (m) m.focus({ preventScroll: true });
  if (msg) toast(msg);
}

/* ------------------------------------------------------------ field widgets */
function optLabel(kind, cat) {
  const o = (P.KIND_OPTS[kind] || []).filter(x => x[0] === cat)[0];
  if (o) return o[1];
  return cat === 'high' ? 'Above ULN ↑' : (cat === 'wnl' ? 'WNL' : cat);
}
function prmLabel(mod, f) { return h('span', { class: 'prm-lw' }, [h('span', { class: 'prm-l', text: f.label }), info(glossKey(mod, f.id))]); }
function paramRow(mod, f) {
  const opts = P.KIND_OPTS[f.kind];
  const zid = uid('z');
  let zopen = S[mod][f.id].z !== '';
  const btns = opts.map(o => h('button', { type: 'button', class: 'sg', 'data-v': o[0], 'aria-pressed': 'false', text: o[1],
    onclick: () => { S[mod][f.id] = { c: o[0], z: '' }; zin.value = ''; sync(); } }));
  const st = h('span', { class: 'st' });
  const zin = h('input', { type: 'text', class: 'num', id: zid, inputmode: 'decimal', autocomplete: 'off', placeholder: 'z-score', 'aria-label': f.label + ' z-score', value: S[mod][f.id].z,
    oninput: (e) => {
      const v = e.target.value; S[mod][f.id].z = v;
      if (hasNum(v)) S[mod][f.id].c = P.res({ c: S[mod][f.id].c, z: v }, f.kind).cat;
      sync();
    } });
  const zbox = h('span', { class: 'zbox' }, [zin, st]);
  const zbtn = h('button', { type: 'button', class: 'zlink', 'aria-label': 'Type a z-score for ' + f.label, text: 'type z', 'aria-expanded': 'false',
    onclick: () => { zopen = !zopen; sync(); if (zopen) zin.focus(); } });
  const row = h('div', { class: 'prm', 'data-field': mod + '.' + f.id }, [
    h('div', { class: 'prm-top' }, [prmLabel(mod, f), f.hint ? h('span', { class: 'hint', text: f.hint }) : null]),
    h('div', { class: 'prm-row' }, [
      h('div', { class: 'seg', role: 'group', 'aria-label': f.label + ' category' }, btns),
      h('div', { class: 'zwrap' }, [zbtn, zbox])
    ])
  ]);
  widgets.push(() => {
    const p = S[mod][f.id], r = P.res(p, f.kind);
    btns.forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === r.cat)));
    const show = zopen || p.z !== '';
    zbox.hidden = !show; zbtn.hidden = show; zbtn.setAttribute('aria-expanded', String(show));
    zin.classList.toggle('bad', p.z !== '' && !hasNum(p.z));
    st.textContent = '';
    if (p.z !== '' && !hasNum(p.z)) st.textContent = 'not a number';
    else if (r.z !== null) st.appendChild(h('span', {}, ['→ ', h('b', { text: optLabel(f.kind, r.cat) })]));
  });
  return row;
}
function numField(mod, f) {
  const id = uid('n');
  const inp = h('input', { type: 'text', class: 'num', id: id, inputmode: 'decimal', autocomplete: 'off', placeholder: f.ph || '', value: S[mod][f.id],
    oninput: (e) => { S[mod][f.id] = e.target.value; sync(); } });
  widgets.push(() => { const v = S[mod][f.id]; inp.classList.toggle('bad', v !== '' && !hasNum(v)); if (document.activeElement !== inp && inp.value !== String(v)) inp.value = v; });
  return h('div', { class: 'fld' }, [
    h('div', { class: 'lab-row' }, [h('label', { for: id, text: f.label }), info(glossKey(mod, f.id))]),
    h('div', { class: 'inwrap' }, [inp, f.unit ? h('span', { class: 'unit', text: f.unit }) : null]),
    f.hint ? h('div', { class: 'hint', text: f.hint }) : null
  ]);
}
/* A "sel" field is shown as a row of tap buttons. A leading "Not …" option is not drawn: nothing pressed means not entered,
   and tapping the pressed button again clears it. */
function choiceRow(mod, f) {
  const blank = f.opts[0][0] === '' && /^Not /.test(f.opts[0][1]);
  const shown = blank ? f.opts.slice(1) : f.opts;
  const stack = !!f.stack || shown.reduce((m, o) => Math.max(m, o[1].length), 0) > 34;
  const btns = shown.map(o => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-v': o[0], 'aria-checked': 'false', text: o[1],
    onclick: () => { const cur = S[mod][f.id]; S[mod][f.id] = (cur === o[0] && blank) ? '' : o[0]; sync(); } }));
  widgets.push(() => btns.forEach(b => b.setAttribute('aria-checked', String(b.getAttribute('data-v') === S[mod][f.id]))));
  return h('div', { class: 'prm ch-row', 'data-field': mod + '.' + f.id }, [
    h('div', { class: 'prm-top' }, [prmLabel(mod, f), f.hint ? h('span', { class: 'hint', text: f.hint }) : null]),
    h('div', { class: 'seg' + (stack ? ' stack' : ''), role: 'radiogroup', 'aria-label': f.label }, btns)
  ]);
}
function multiField(mod, f) {
  const chips = {};
  const count = h('span', { class: 'hint' });
  const blocks = f.groups.map(g => h('div', { class: 'chip-group' }, [
    h('h4', { text: g.title }),
    h('div', { class: 'chips' }, g.opts.map(o => {
      const b = h('button', { type: 'button', class: 'cp', 'aria-pressed': 'false', 'data-v': o[0], text: o[1],
        onclick: () => { const a = S[mod][f.id], i = a.indexOf(o[0]); if (i >= 0) a.splice(i, 1); else a.push(o[0]); sync(); } });
      chips[o[0]] = b; return b;
    }))
  ]));
  widgets.push(() => {
    const a = S[mod][f.id];
    Object.keys(chips).forEach(k => chips[k].setAttribute('aria-pressed', String(a.indexOf(k) >= 0)));
    const n = a.filter(k => chips[k]).length;
    count.textContent = n ? n + ' selected' : 'none selected';
  });
  return h('div', { class: 'prm multi', 'data-field': mod + '.' + f.id }, [h('div', { class: 'prm-top' }, [prmLabel(mod, f), count]), blocks]);
}
function chkField(mod, f) {
  const id = uid('c');
  return h('div', { class: 'chkrow' }, [
    h('input', { type: 'checkbox', id: id, checked: !!S[mod][f.id], onchange: (e) => { S[mod][f.id] = e.target.checked; sync(); } }),
    h('label', { for: id, text: f.label })
  ]);
}
function txtField(mod, f, type) {
  const id = uid('t');
  return h('div', { class: 'fld' + (type === 'date' ? '' : ' wide') }, [
    h('label', { for: id, text: f.label }),
    h('input', { type: type === 'date' ? 'date' : 'text', id: id, autocomplete: 'off', placeholder: f.ph || '', value: S[mod][f.id],
      oninput: (e) => { S[mod][f.id] = e.target.value; sync(); } }),
    f.hint ? h('div', { class: 'hint', text: f.hint }) : null
  ]);
}

/* ------------------------------------------- typical flow–volume loops (gallery) */
const SVGNS = 'http://www.w3.org/2000/svg';
function sv(tag, a) { const el = document.createElementNS(SVGNS, tag); Object.keys(a || {}).forEach(k => el.setAttribute(k, a[k])); return el; }
/* All shapes share one frame: volume left to right (0 = TLC), flow up = expiration, down = inspiration, zero flow at y = 44. */
function sawExp() {
  let d = 'M10 44 C12 26 17 8 26 6'; const n = 14;
  for (let k = 1; k <= n; k++) { const t = k / n, x = 26 + 78 * t, y = 6 + 38 * t + (k < n ? (k % 2 ? -3.4 : 3.4) : 0); d += ' L' + x.toFixed(1) + ' ' + y.toFixed(1); }
  return d;
}
const LOOP_NORM = { e: 'M10 44 C12 26 17 8 26 6 L104 44', i: 'M104 44 C102 76 14 76 10 44' };
const LOOP_SHAPE = {
  normal:   LOOP_NORM,
  concave:  { e: 'M10 44 C12 30 17 14 26 12 Q 40 38 104 44', i: LOOP_NORM.i },
  sevobs:   { e: 'M10 44 C12 40 17 32 24 31 Q 30 41 48 42.5 Q 72 43.5 100 44', i: 'M100 44 C98 74 14 74 10 44' },
  convex:   { e: 'M10 44 C12 26 16 8 24 6 Q 58 8 72 44', i: 'M72 44 C70 74 16 74 10 44' },
  effort:   { e: 'M10 44 C16 38 24 28 34 24 C42 20 48 26 54 28 L62 30 L68 35 L80 38 L104 44', i: 'M104 44 C100 62 86 68 70 64 C56 60 44 70 30 62 C20 57 12 52 10 44' },
  slow:     { e: 'M10 44 C22 42 34 34 44 26 C50 21 58 21 64 25 L104 44', i: LOOP_NORM.i },
  weak:     { e: 'M10 44 C16 38 24 26 34 22 L104 44', i: 'M104 44 C102 60 20 60 10 44' },
  expflat:  { e: 'M10 44 C12 28 16 21 22 20 L64 20 Q 72 20 78 30 L104 44', i: LOOP_NORM.i },
  inspflat: { e: LOOP_NORM.e, i: 'M104 44 C102 58 98 64 88 64 L36 64 C24 64 12 56 10 44' },
  bothflat: { e: 'M10 44 C12 28 16 21 22 20 L84 20 L104 44', i: 'M104 44 C102 58 98 64 88 64 L36 64 C24 64 12 56 10 44' },
  saw:      { e: sawExp(), i: LOOP_NORM.i },
  unilat:   { e: 'M10 44 C12 26 17 12 24 10 L46 30 C54 24 66 24 76 30 L104 44', i: LOOP_NORM.i },
  cough:    { e: 'M10 44 C12 28 17 12 25 10 L31 28 L35 4 L40 26 L104 44', i: LOOP_NORM.i },
  early:    { e: 'M10 44 C12 26 17 8 26 6 L62 24 L62 44', i: 'M62 44 C60 74 18 74 10 44' }
};
function loopSvg(key) {
  const sh = LOOP_SHAPE[key] || LOOP_NORM;
  const svg = sv('svg', { viewBox: '0 0 120 84', class: 'lp', 'aria-hidden': 'true', focusable: 'false' });
  svg.appendChild(sv('line', { x1: '6', y1: '44', x2: '114', y2: '44', class: 'lp-ax' }));
  if (key !== 'normal') ['e', 'i'].forEach(k => svg.appendChild(sv('path', { d: LOOP_NORM[k], class: 'lp-ref', fill: 'none' })));
  ['e', 'i'].forEach(k => svg.appendChild(sv('path', { d: sh[k], class: 'lp-cur', fill: 'none' })));
  return svg;
}
function loopLegend() {
  const svg = sv('svg', { viewBox: '0 0 400 232', class: 'lp-big', role: 'img', 'aria-label': 'Labelled normal flow–volume loop: expiratory limb above the axis with the peak flow early, inspiratory limb below' });
  const T = (x, y, txt, cls, anchor) => { const t = sv('text', { x: x, y: y, class: 'lp-t' + (cls ? ' ' + cls : ''), 'text-anchor': anchor || 'start' }); t.textContent = txt; svg.appendChild(t); };
  svg.appendChild(sv('line', { x1: '40', y1: '120', x2: '362', y2: '120', class: 'lp-ax' }));
  svg.appendChild(sv('path', { d: 'M70 120 C74 78 86 30 112 26 L330 120', class: 'lp-cur', fill: 'none' }));
  svg.appendChild(sv('path', { d: 'M330 120 C324 205 76 205 70 120', class: 'lp-cur', fill: 'none' }));
  [[112, 26], [200, 64], [200, 184]].forEach(p => svg.appendChild(sv('circle', { cx: p[0], cy: p[1], r: '4', class: 'lp-dot' })));
  T(124, 24, 'PEF: sharp peak early in expiration'); T(212, 58, 'FEF50: mid-volume flow'); T(200, 208, 'FIF50: mid-volume inspiratory flow', '', 'middle');
  T(62, 112, 'TLC', 'm', 'end'); T(338, 112, 'RV', 'm');
  T(6, 14, 'Flow ↑ expiration', 'm'); T(6, 226, 'Flow ↓ inspiration', 'm'); T(394, 226, 'Volume exhaled →', 'm', 'end');
  return svg;
}
function loopGallery(mod, f) {
  const tiles = {};
  P.LOOPS.forEach(l => {
    tiles[l[0]] = h('button', { type: 'button', class: 'lp-tile', role: 'radio', 'aria-checked': 'false', 'data-loop': l[0],
      onclick: () => { S[mod][f.id] = (S[mod][f.id] === l[0]) ? '' : l[0]; sync(); } },
      [loopSvg(l[0]), h('span', { class: 'lp-name', text: l[1] }), h('span', { class: 'lp-cap', text: l[2] })]);
  });
  widgets.push(() => Object.keys(tiles).forEach(k => tiles[k].setAttribute('aria-checked', String(S[mod][f.id] === k))));
  return h('div', { class: 'prm lp-wrap', 'data-field': mod + '.' + f.id }, [
    h('p', { class: 'fine', text: 'Flow is plotted against volume: expiration is above the line (reading left to right), inspiration below. Each tile draws the pattern as a solid line over a dashed typical normal loop. Hold the lab’s tracing next to these and tap the closest match; tap it again to clear.' }),
    h('details', { class: 'plain lp-how' }, [h('summary', { text: 'How to read a loop (labelled normal example)' }), loopLegend()]),
    h('div', { class: 'lp-grid', role: 'radiogroup', 'aria-label': 'Flow–volume loop shape' }, P.LOOPS.map(l => tiles[l[0]]))
  ]);
}

function fieldEl(mod, f) {
  if (f.type === 'param') return paramRow(mod, f);
  if (f.type === 'num') return numField(mod, f);
  if (f.type === 'sel') return f.ui === 'loop' ? loopGallery(mod, f) : choiceRow(mod, f);
  if (f.type === 'multi') return multiField(mod, f);
  if (f.type === 'chk') return chkField(mod, f);
  if (f.type === 'date') return txtField(mod, f, 'date');
  return txtField(mod, f, 'txt');
}
function isFilled(mod, f) {
  const v = S[mod][f.id];
  if (f.type === 'param') return v.c !== 'nm' || v.z !== '';
  if (f.type === 'chk') return !!v;
  if (f.type === 'multi') return v.length > 0;
  if (f.type === 'sel') return v !== f.opts[0][0];
  return String(v) !== '';
}
function groupEl(mod, g) {
  const fields = h('div', { class: 'fields' }, g.fields.map(f => fieldEl(mod, f)));
  let el;
  if (g.opt) {
    const isEq = mod === 'ctx' && /^Reference equations/.test(g.title);
    const tag = h('span', { class: 'tag' });
    el = h('details', { class: 'optgrp' + (isEq ? ' eq' : ''), 'data-group': isEq ? 'equations' : null, open: g.fields.some(f => isFilled(mod, f)) }, [
      h('summary', {}, [h('span', { class: 't', text: isEq ? 'Reference equations' : g.title }), tag]),
      isEq ? h('p', { class: 'fine', text: 'The z-scores come from the lab report; these choices record which reference set the lab used and set the maximal-heart-rate and A–a formulas. The recommended option is already selected in each row.' }) : null,
      fields
    ]);
    widgets.push(() => {
      const n = g.fields.filter(f => isFilled(mod, f)).length;
      if (isEq) { tag.textContent = n ? n + ' changed from the recommended set' : 'recommended set selected'; tag.classList.toggle('chg', n > 0); }
      else { tag.textContent = n ? n + ' entered' : ''; tag.hidden = !n; }
    });
  } else {
    const head = h('div', { class: 'grp-head' }, [h('h3', { text: g.title })]);
    if (g.quick) {
      const names = g.quick.map(id => g.fields.filter(f => f.id === id)[0].label).join(', ');
      head.appendChild(h('button', { type: 'button', class: 'btn sm quiet quick', text: 'Set unselected to normal', title: 'Marks ' + names + ' as within normal limits wherever nothing is selected yet',
        onclick: () => { g.quick.forEach(id => { const p = S[mod][id]; if (p.c === 'nm' && p.z === '') p.c = 'wnl'; }); sync(); } }));
    }
    el = h('section', { class: 'grp' }, [head, fields]);
  }
  if (g.when) widgets.push(() => { el.hidden = g.when.is.indexOf(S[mod][g.when.f]) < 0; });
  return el;
}
function liveBox(mod) {
  const body = h('div', { class: 'live-body' });
  const box = h('div', { class: 'live', 'aria-live': 'polite' }, [h('h3', {}, ['Findings as entered']), body]);
  widgets.push(() => {
    body.textContent = '';
    if (mod === 'ctx') {
      const c = R.facts.ctx, bits = [];
      if (c.age !== undefined && isFinite(c.age)) bits.push(Math.round(c.age) + '-year-old');
      if (c.sex) bits.push(c.sex === 'M' ? 'male' : 'female');
      if (isFinite(c.ht)) bits.push('height ' + Math.round(c.ht) + ' cm');
      if (isFinite(c.bmi)) bits.push('BMI ' + c.bmi.toFixed(1));
      if (c.smoke) bits.push(c.smoke + ' smoker');
      const ind = c.indicLabels.slice(); if (c.indication) ind.push(c.indication);
      if (bits.length) body.appendChild(h('p', { text: bits.join(', ') + '.' }));
      if (ind.length) body.appendChild(h('p', { text: 'Indication: ' + ind.join('; ') + '.' }));
      if (!bits.length && !ind.length) body.appendChild(h('p', { class: 'empty', text: 'Nothing entered yet.' }));
      return;
    }
    const s = secFor(mod);
    if (!s || s.empty) { body.appendChild(h('p', { class: 'empty', text: 'Nothing entered yet. The statement for this test appears here as you go.' })); return; }
    body.appendChild(h('p', { text: s.lines.join(' ') }));
  });
  return box;
}
function navRow() {
  const prev = neighbour(-1), next = neighbour(1);
  return h('div', { class: 'nav' }, [
    prev ? h('button', { type: 'button', class: 'btn', onclick: () => goto(prev.id), text: '← ' + prev.name }) : h('span'),
    next ? h('button', { type: 'button', class: 'btn primary', onclick: () => goto(next.id), text: (next.id === 'report' ? 'View report' : 'Next: ' + next.name) + ' →' }) : null
  ]);
}
function stepHead(title, intro, src, gkey) {
  return h('div', { class: 'step-head' }, [h('div', { class: 'sh-title' }, [h('h2', { text: title }), gkey ? info(gkey) : null]), intro ? h('p', { class: 'intro', text: intro }) : null, src ? h('p', { class: 'src', text: 'Basis: ' + src }) : null]);
}

/* ------------------------------------------------------------- step: tests */
const ZKEY = [['s', 'Sev', 1, '< −4.0'], ['m', 'Mod', 1.5, '−4.0 to −2.5'], ['l', 'Mild', 0.855, '−2.5 to −1.645'], ['n', 'Normal', 3.29, '−1.645 to +1.645'], ['h', 'High', 1.855, '> +1.645']];
function zKey() {
  const lo = -5, hi = 3.5, span = hi - lo;
  const pos = (z) => ((z - lo) / span * 100).toFixed(2) + '%';
  const bar = h('div', { class: 'zbar', role: 'img', 'aria-label': 'z-score scale: severe below −4, moderate −4 to −2.5, mild −2.5 to −1.645, normal −1.645 to +1.645, above ULN over +1.645' },
    ZKEY.map(k => h('span', { class: k[0], style: 'flex:' + k[2] + ' 1 0', title: k[3], text: k[1] })));
  const tick = (z, label, row) => h('span', { class: 't ' + row, style: 'left:' + pos(z), text: label });
  return h('div', { class: 'zkey' }, [bar, h('div', { class: 'zticks' }, [tick(-4, '−4', 'a'), tick(-2.5, '−2.5', 'a'), tick(-1.645, 'LLN −1.645', 'b'), tick(1.645, 'ULN +1.645', 'b')]),
    h('p', { class: 'fine' }, ['Bands follow ERS/ATS 2022.', info('severity'), ' Typing a z-score always overrides the category buttons.'])]);
}
function stepTests() {
  const main = $('main');
  const groups = []; P.TESTS.forEach(t => { if (groups.indexOf(t.group) < 0) groups.push(t.group); });
  const count = h('span', { class: 'count' });
  const cont = h('button', { type: 'button', class: 'btn primary', text: 'Continue →', onclick: () => goto('ctx') });
  const rows = {};
  const selBlock = groups.map(g => h('div', { class: 'sel-group' }, [
    h('h3', { text: g }),
    h('div', { class: 'tgrid' }, P.TESTS.filter(t => t.group === g).map(t => {
      const id = uid('tt');
      const cb = h('input', { type: 'checkbox', id: id, 'data-test': t.key, checked: !!S.tests[t.key],
        onchange: (e) => { S.tests[t.key] = e.target.checked; sync(); } });
      const lab = h('label', { class: 'tt', for: id }, [cb, h('span', {}, [h('span', { class: 'nm', text: t.name }), h('span', { class: 'ds', text: t.desc })])]);
      rows[t.key] = { lab: lab, cb: cb };
      return h('div', { class: 'ttw' }, [lab, info('test.' + t.key)]);
    }))
  ]));
  widgets.push(() => {
    let n = 0;
    P.TESTS.forEach(t => { const r = rows[t.key]; r.cb.checked = !!S.tests[t.key]; r.lab.classList.toggle('on', !!S.tests[t.key]); if (S.tests[t.key]) n++; });
    count.textContent = n ? plural(n, 'test') + ' selected' : 'Select at least one test';
    cont.disabled = !n;
  });
  const presets = h('div', { class: 'presets' }, P.PRESETS.map(p => h('button', { type: 'button', class: 'chip', text: p.name,
    onclick: () => { Object.keys(S.tests).forEach(k => { S.tests[k] = p.tests.indexOf(k) >= 0; }); sync(); } })));
  const left = h('div', { class: 'card' }, [
    stepHead('Which tests were performed?', 'Tick everything done at this visit. Each ticked test becomes one step; the report lists only those tests. For a second visit, start a new case.'),
    h('div', { class: 'sel-group' }, [h('h3', { text: 'Quick sets' }), presets]),
    selBlock,
    h('div', { class: 'start-row' }, [cont, count])
  ]);
  const ex = h('div', { class: 'card side-card' }, [
    h('h3', { text: 'Worked examples' }),
    h('div', { class: 'ex-list' }, X.EXAMPLES.map(e => h('button', { type: 'button', class: 'ex', 'data-example': e.name,
      onclick: () => { const st = X.buildExample(P, e); if (!st.ctx.date) st.ctx.date = todayISO(); loadState(st, 'report', 'Loaded example: ' + e.name + '. Use the steps above to see the inputs.'); } },
      [h('b', { text: e.name }), h('span', { text: e.desc })]))),
    h('h3', {}, ['z-score key', info('z')]), zKey(),
    methodNote()
  ]);
  main.appendChild(h('div', { class: 'grid-2 side' }, [left, ex]));
}
function methodNote() {
  const li = (t) => h('li', { text: t });
  return h('details', { class: 'method' }, [h('summary', { text: 'Method and sources' }), h('div', { class: 'mbody' }, [
    h('p', { text: 'Reading order follows ERS/ATS 2022 (z-scores and the lower limit of normal, not fixed % cut-offs):' }),
    h('ul', {}, [
      li('FEV1/FVC against the LLN. If low, FEV1 z-score grades the obstruction; FVC points to other pathology.'),
      li('TLC for restriction or hyperinflation; RV and RV/TLC for air trapping.'),
      li('DLCO stratified by z-score and read with VA and KCO; hemoglobin noted.'),
      li('Bronchodilator response: change > 10% of the predicted value in FEV1 and/or FVC.'),
      li('Prior studies: % change and annualised change, with the ≥ 15% (ATS/ERS) and ≥ 8%/yr (rapid decline) markers.')
    ]),
    h('p', { text: 'Phrases and codes follow Annals ATS 2025 (S, V, D codes); spirometry grades follow ATS/ERS 2019; muscle strength, challenge, 6MWT and CPET follow Kaminsky 2018; isolated low RV follows Owens 1987.' }),
    h('p', { text: 'Reference equations: the recommended set is preselected (GLI Global race-neutral spirometry per ATS 2023; GLI-2021 volumes; GLI-2017 DLCO; Tanaka maximal heart rate). Predicted values are not computed here: the z-scores or categories come from the lab report, and the selection records which set produced them.' }),
    h('p', { text: 'Outside the supplied documents: postural VC fall bands, cough peak flow, FeNO cut-points (ATS 2011), ILD progression criteria (ATS/ERS/JRS/ALAT 2022), the typical-loop gallery (descriptive teaching shapes). Oscillometry is categorical.' })
  ])]);
}

/* ------------------------------------------------------------ step: details */
function stepCtx() {
  const main = $('main'), m = P.SCHEMA.ctx;
  const BANDS = [['0', 'Off'], ['0.25', '0.25 SD (default)'], ['0.5', '0.5 SD']];
  const bb = BANDS.map(o => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-v': o[0], 'aria-checked': 'false', text: o[1], onclick: () => { S.settings.band = o[0]; sync(); } }));
  widgets.push(() => bb.forEach(b => b.setAttribute('aria-checked', String(Number(S.settings.band) === Number(b.getAttribute('data-v'))))));
  const card = h('div', { class: 'card' }, [
    stepHead(m.title, 'The date is today by default. Tap the indications that apply; use the box underneath only for a reason that is not listed. Age, sex and height drive sex- and age-specific thresholds, BMI, annualised change and CPET cut-offs.', m.src),
    m.groups.map(g => groupEl('ctx', g)),
    h('section', { class: 'grp' }, [h('div', { class: 'grp-head' }, [h('h3', { text: 'Interpretation settings' })]), h('div', { class: 'fields' }, [
      h('div', { class: 'prm ch-row', 'data-field': 'settings.band' }, [
        h('div', { class: 'prm-top' }, [h('span', { class: 'prm-l', text: 'Near-LLN review flag' }), h('span', { class: 'hint', text: 'A value this close above the LLN is marked "near the LLN". It stays within normal limits; this is a local review convention, not a category' })]),
        h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Near-LLN review flag' }, bb)
      ]),
      styleRow()
    ])]),
    liveBox('ctx'),
    navRow()
  ]);
  main.appendChild(card);
}

/* -------------------------------------------------------------- step: module */
function stepModule(key) {
  const m = P.SCHEMA[key];
  const extra = [];
  if (key === 'fvl') extra.push(h('div', { class: 'learn-link' }, [h('button', { type: 'button', class: 'btn sm quiet', 'data-learn': 'loops', text: 'Learn: how to read a flow–volume loop and what each pattern means →', onclick: () => openLearn('loops') })]));
  if (key === 'sixmw') extra.push(trendBlock());
  $('main').appendChild(h('div', { class: 'card' }, [stepHead(m.title, m.intro, m.src, 'test.' + key), h('p', { class: 'fine tapnote', text: 'Tap a choice to select it; tap it again to clear it. Typed values are optional and sit under the collapsed panels.' }), extra.filter(function (x) { return x.getAttribute('data-trend') !== '1'; }), m.groups.map(g => groupEl(key, g)), extra.filter(function (x) { return x.getAttribute('data-trend') === '1'; }), liveBox(key), navRow()]));
}

/* --------------------------------------------------------------- step: prior */
function curPlaceholder(id) {
  const f = R.facts, v = ({ fev1: f.sp.fev1L, fvc: f.sp.fvcL, fev1_pct: f.sp.fev1pct, fvc_pct: f.sp.fvcpct, tlc: f.vol.tlcL, dlco: f.dl.abs,
    dlco_pct: (isFinite(f.dl.adjPct) ? f.dl.adjPct : f.dl.pct), six: f.six.dist, feno: f.feno.v })[id];
  return (typeof v === 'number' && isFinite(v)) ? String(Math.round(v * 100) / 100) : '';
}
function stepPrior() {
  const main = $('main');
  const m = { title: 'Comparison with prior PFT(s)', intro: 'Pick how long ago the prior study was, then enter whatever values it has. The report gives absolute, % and annualised change with the threshold markers. Use % predicted only when both studies used the same reference equations; otherwise compare absolute values.',
    src: 'ERS/ATS 2022 (change thresholds, FEV1Q, conditional change score for children); ATS/ERS/JRS/ALAT 2022 (progression criteria in fibrosing ILD); annualised decline marker ≥ 8%/yr.' };
  const warn = h('p', { class: 'warn-line', text: 'The date of this study is not entered (Details step), so changes cannot be annualised.' });
  widgets.push(() => { warn.hidden = !!S.ctx.date; });
  const curInputs = P.CUR_FIELDS.map(f => {
    const id = uid('cur');
    const inp = h('input', { type: 'text', class: 'num', id: id, inputmode: 'decimal', autocomplete: 'off', value: S.prior.cur[f.id], oninput: (e) => { S.prior.cur[f.id] = e.target.value; sync(); } });
    widgets.push(() => { const ph = curPlaceholder(f.id); inp.placeholder = ph ? 'from this study: ' + ph : 'not entered'; });
    return h('div', { class: 'fld' }, [h('label', { for: id, text: f.label }), h('div', { class: 'inwrap' }, [inp, h('span', { class: 'unit', text: f.unit })])]);
  });
  const curTag = h('span', { class: 'tag' });
  widgets.push(() => { const n = P.CUR_FIELDS.filter(f => S.prior.cur[f.id] !== '').length; curTag.textContent = n ? n + ' entered' : ''; curTag.hidden = !n; });
  const PRIMARY = ['date', 'fev1', 'fvc', 'fev1_pct', 'fvc_pct'];
  const cards = h('div', { 'data-priors': '1' });
  function priorInput(p, f) {
    const id = uid('pr');
    if (f.type === 'chk') {
      return h('div', { class: 'chkrow' }, [h('input', { type: 'checkbox', id: id, checked: !!p[f.id], onchange: (e) => { p[f.id] = e.target.checked; sync(); } }), h('label', { for: id, text: f.label })]);
    }
    const inp = h('input', { type: f.type === 'date' ? 'date' : 'text', class: f.type === 'date' ? null : 'num', id: id, inputmode: f.type === 'date' ? null : 'decimal', autocomplete: 'off', value: p[f.id],
      oninput: (e) => { p[f.id] = e.target.value; sync(); } });
    return h('div', { class: 'fld' }, [h('label', { for: id, text: f.label }), f.type === 'date' ? inp : h('div', { class: 'inwrap' }, [inp, h('span', { class: 'unit', text: f.unit })])]);
  }
  function paintCards() {
    cards.textContent = '';
    S.prior.list.forEach((p, i) => {
      const prim = P.PRIOR_FIELDS.filter(f => PRIMARY.indexOf(f.id) >= 0), more = P.PRIOR_FIELDS.filter(f => PRIMARY.indexOf(f.id) < 0 && f.type !== 'chk'), cmp = P.PRIOR_FIELDS.filter(f => f.type === 'chk');
      const moreOpen = more.some(f => p[f.id] !== '') || ['vol', 'dlco', 'sixmw', 'feno'].some(k => S.tests[k]);
      const cmpOpen = cmp.some(f => !!p[f.id]);
      const INTERVALS = [['3 months', 3], ['6 months', 6], ['1 year', 12], ['2 years', 24], ['3 years', 36], ['5 years', 60]];
      const quick = h('div', { class: 'qdates' }, [h('span', { class: 'hint', text: 'Prior study was about' })].concat(INTERVALS.map(iv =>
        h('button', { type: 'button', class: 'cp', 'data-months': String(iv[1]), text: iv[0] + ' before',
          onclick: () => { p.date = shiftMonths(S.ctx.date, iv[1]); paintCards(); sync(); } }))));
      cards.appendChild(h('div', { class: 'prior-card', 'data-prior': String(i + 1) }, [
        h('div', { class: 'ph' }, [h('b', { text: 'Prior study #' + (i + 1) }),
          S.prior.list.length > 1 ? h('button', { type: 'button', class: 'btn sm quiet', text: 'Remove', onclick: () => { S.prior.list.splice(i, 1); paintCards(); sync(); } }) : null]),
        quick,
        h('div', { class: 'fields' }, prim.map(f => priorInput(p, f))),
        h('details', { class: 'optgrp', open: moreOpen }, [h('summary', {}, [h('span', { class: 't', text: 'More measures: FEV1 z-score, TLC, DLCO, 6MWD, FeNO' })]), h('div', { class: 'fields' }, more.map(f => priorInput(p, f)))]),
        h('details', { class: 'optgrp', open: cmpOpen, 'data-group': 'cmp' }, [h('summary', {}, [h('span', { class: 't', text: 'Comparability: tick anything that differs between the two studies' })]),
          h('p', { class: 'fine', text: 'A percent-predicted change on different reference equations, a DLCO change on a different hemoglobin basis, or spirometry in a different bronchodilator state is reported with that caveat and is not read as a physiologic change.' }),
          h('div', { class: 'fields' }, cmp.map(f => priorInput(p, f)))])
      ]));
    });
    addBtn.hidden = S.prior.list.length >= P.MAX_PRIORS;
  }
  const addBtn = h('button', { type: 'button', class: 'btn', text: '+ Add another prior study', onclick: () => { S.prior.list.push(P.blankPrior()); paintCards(); sync(); } });
  paintCards();
  main.appendChild(h('div', { class: 'card' }, [
    stepHead(m.title, m.intro, m.src, 'test.prior'),
    h('section', { class: 'grp' }, [h('div', { class: 'grp-head' }, [h('h3', { text: 'Prior studies, most recent first' })]), warn, cards, h('div', { style: 'margin-top:12px' }, [addBtn])]),
    h('details', { class: 'optgrp', 'data-group': 'current', open: P.CUR_FIELDS.some(f => S.prior.cur[f.id] !== '') }, [
      h('summary', {}, [h('span', { class: 't', text: 'Override the current values (optional): blank means taken from this study' }), curTag]),
      h('div', { class: 'fields' }, curInputs)]),
    liveBox('prior'),
    navRow()
  ]));
}

/* ------------------------------------------------------------- wording level */
const STYLE_OPTS = [['concise', 'Concise'], ['standard', 'Standard'], ['expanded', 'Detailed'], ['numeric', 'With numbers']];
function styleRow() {
  const btns = STYLE_OPTS.map(o => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-v': o[0], 'aria-checked': 'false', text: o[1], onclick: () => { S.settings.style = o[0]; sync(); } }));
  widgets.push(() => btns.forEach(b => b.setAttribute('aria-checked', String(S.settings.style === b.getAttribute('data-v')))));
  return h('div', { class: 'prm ch-row', 'data-field': 'settings.style' }, [
    h('div', { class: 'prm-top' }, [h('span', { class: 'prm-l', text: 'Wording level' }), h('span', { class: 'hint', text: 'How each finding is phrased in the test sections: concise sentences, standard, detailed with the caveat, or with the measured numbers when they were entered' })]),
    h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Wording level' }, btns)
  ]);
}
/* Review-only catalog wording: offered when the findings make it relevant, included only when tapped. */
function suggestCard() {
  const list = (R.suggestions || []).filter(sg => !sg.superseded);
  if (!list.length) return null;
  const chips = list.map(sg => h('button', { type: 'button', class: 'sug' + (sg.on ? ' on' : ''), 'aria-pressed': String(sg.on), 'data-sug': sg.id,
    onclick: () => { if (S.review[sg.id]) delete S.review[sg.id]; else S.review[sg.id] = true; sync(); } },
    [h('span', { class: 'sug-l', text: sg.label }), h('span', { class: 'sug-t', text: sg.text })]));
  const n = list.filter(x => x.on).length;
  return h('section', { class: 'card sugs', id: 'suggest', 'aria-labelledby': 'sg-h' }, [
    h('div', { class: 'hu-head' }, [h('h2', { id: 'sg-h', text: 'Suggested additions (tap to include)' }), h('span', { class: 'chip ' + (n ? 'ok' : 'note'), text: n ? n + ' included' : 'none included' })]),
    h('p', { class: 'fine', text: 'Interpretive wording that needs your judgement: the numbers make it relevant, but it is never inserted on its own. Tapped sentences join the Interpretation; tap again to remove.' }),
    h('div', { class: 'sug-list' }, chips)
  ]);
}

/* Differential considerations and additional studies, offered per verified finding and included only when tapped. */
function dxToggle(id) { if (S.review[id]) delete S.review[id]; else S.review[id] = true; sync(); }
function dxSet(ids, on) { ids.forEach(id => { if (on) S.review[id] = true; else delete S.review[id]; }); sync(); }
function dxRow(label, items, kind, gkey) {
  const ids = items.map(x => x.id), nOn = items.filter(x => x.on).length;
  return h('div', { class: 'dx-row', 'data-kind': kind }, [
    h('div', { class: 'dx-row-head' }, [
      h('span', { class: 'dx-l', text: label }),
      h('span', { class: 'dx-tools' }, [
        h('button', { type: 'button', class: 'lnk', 'data-dx-all': gkey + ':' + kind, text: 'All', disabled: nOn === items.length ? 'true' : null, onclick: () => dxSet(ids, true) }),
        h('button', { type: 'button', class: 'lnk', 'data-dx-none': gkey + ':' + kind, text: 'None', disabled: nOn === 0 ? 'true' : null, onclick: () => dxSet(ids, false) })
      ])
    ]),
    h('div', { class: 'dx-chips' }, items.map(x => h('button', { type: 'button', class: 'dx' + (x.on ? ' on' : ''), 'aria-pressed': String(x.on), 'data-dx': x.id, text: x.text, onclick: () => dxToggle(x.id) })))
  ]);
}
function dxCard() {
  const groups = R.differentials || [];
  if (!groups.length) return null;
  const nDx = groups.reduce((a, g) => a + g.dx.filter(x => x.on).length, 0);
  const nSt = (R.studies || []).length;
  const sum = h('span', { class: 'chip ' + (nDx || nSt ? 'ok' : 'note'), text: nDx || nSt ? [nDx ? plural(nDx, 'differential') : '', nSt ? plural(nSt, 'study', 'studies') : ''].filter(Boolean).join(', ') + ' included' : 'none included' });
  const card = h('section', { class: 'card dxs', id: 'differentials', 'aria-labelledby': 'dx-h' }, [
    h('div', { class: 'hu-head' }, [h('h2', { id: 'dx-h', text: 'Differentials and additional studies (tap to include)' }), sum]),
    h('p', { class: 'fine', text: 'For each verified finding: the physiologic causes that produce it and the studies that sort them out. Nothing is inserted on its own. Tapped differentials join the Interpretation as one sentence per finding; tapped studies are listed once under "Additional studies to consider". Tap again to remove.' })
  ]);
  groups.forEach(g => card.appendChild(h('div', { class: 'dx-group', 'data-dx-group': g.key }, [
    h('h3', { text: 'For ' + g.title }),
    g.dx.length ? dxRow('Differential considerations', g.dx, 'dx', g.key) : null,
    g.studies.length ? dxRow('Additional studies', g.studies, 'study', g.key) : null
  ])));
  return card;
}
function studiesBlock(cls) {
  const st = R.studies || [];
  if (!st.length) return null;
  return h('div', { class: 'studies' + (cls ? ' ' + cls : ''), 'data-studies': String(st.length) }, [h('h3', { text: 'Additional studies to consider' }), h('p', { text: cap(st.join('; ')) + '.' })]);
}

/* ------------------------------------------------------------- step: report */
function reportDoc() {
  const lines = R.text.split('\n'); const meta = [];
  for (let i = 1; i < lines.length && lines[i] !== ''; i++) meta.push(lines[i]);
  const doc = h('article', { class: 'doc', id: 'doc' }, [
    h('div', { class: 'dt', text: 'Pulmonary function test report' }),
    h('div', { class: 'meta' }, meta.map(t => h('span', { text: t })))
  ]);
  R.sections.forEach(s => doc.appendChild(h('div', { class: 'sec', 'data-sec': s.key }, [
    h('h3', { text: s.title }),
    h('p', { text: s.lines.join(' ') })
  ])));
  const codes = uniq(R.sections.reduce((a, s) => a.concat(s.codes || []), []));
  doc.appendChild(h('div', { class: 'interp' }, [h('h3', { text: 'Interpretation' }),
    R.impression.length ? h('ol', {}, R.impression.map(t => h('li', { text: t }))) : h('p', { class: 'fine', text: 'No interpretable data entered.' }),
    codes.length ? h('div', { class: 'codes-row', 'data-codes': codes.join(',') }, [h('span', { class: 'fine' }, ['Annals ATS 2025 codes', h('span', { class: 'noprint', text: ' (tap for meaning)' })]), h('span', { class: 'codes' }, codes.map(codeChip))]) : null]));
  const sb = studiesBlock(); if (sb) doc.appendChild(sb);
  return doc;
}
/* A small picture of each loop named in a "look for" tip, drawn with the same shapes as the gallery. */
function lookFigures(look) {
  return h('div', { class: 'look-figs' }, (look || []).map(l => h('figure', { class: 'look-fig', 'data-loop': l.k }, [loopSvg(l.k), h('figcaption', { text: l.cap })])));
}
function huItem(x) {
  const fbk = fbGet(x.id), canRate = true;
  const rate = h('div', { class: 'hu-rate' }, [
    h('span', { class: 'fine', text: 'Was this useful?' }),
    h('button', { type: 'button', class: 'rt', 'aria-pressed': String(fbk === 'u'), 'data-rate': 'u', text: 'Useful', onclick: () => { fbSet(x.id, x.title, fbGet(x.id) === 'u' ? '' : 'u'); repaintRate(); } }),
    h('button', { type: 'button', class: 'rt', 'aria-pressed': String(fbk === 'n'), 'data-rate': 'n', text: 'Not useful', onclick: () => { fbSet(x.id, x.title, fbGet(x.id) === 'n' ? '' : 'n'); repaintRate(); } })
  ]);
  function repaintRate() { rate.querySelectorAll('.rt').forEach(b => b.setAttribute('aria-pressed', String(fbGet(x.id) === b.getAttribute('data-rate')))); }
  return h('div', { class: 'hu-item', 'data-lvl': x.lvl, 'data-id': x.id }, [
    h('div', { class: 'lv' }, [h('span', { class: 'chip ' + x.lvl, text: LVL[x.lvl] || x.lvl }), h('span', { class: 'cat', text: x.cat })]),
    h('div', {}, [h('h4', { text: x.title }), h('p', { text: x.text }), x.look && x.look.length ? lookFigures(x.look) : null, canRate ? rate : null])
  ]);
}
function headsupCard() {
  const rank = { alert: 0, caution: 1, tip: 2, note: 3 };
  const all = R.headsup.map((x, i) => ({ x: x, i: i })).sort((a, b) => (rank[a.x.lvl] - rank[b.x.lvl]) || (a.i - b.i)).map(o => o.x);
  const quiet = all.filter(x => fbQuiet(x)), items = all.filter(x => !fbQuiet(x));
  const c = R.counts;
  const sum = h('div', { class: 'hu-sum' }, ['alert', 'caution', 'tip', 'note'].filter(k => c[k]).map(k => h('span', { class: 'chip ' + k, text: c[k] + ' ' + (k === 'tip' ? 'look-for' : k) })));
  const card = h('section', { class: 'card hu', id: 'headsup', 'aria-labelledby': 'hu-h' }, [
    h('div', { class: 'hu-head' }, [h('h2', { id: 'hu-h', text: 'Heads-up: discordance and what to look for' }), sum]),
    h('p', { class: 'fine', text: 'For the interpreter, not part of the report: internal inconsistencies, data-entry problems, technique and quality issues, the waveform to check on the tracing, missing tests that would change the reading, and changes on prior studies.' })
  ]);
  if (!all.length) {
    card.appendChild(h('div', { class: 'hu-empty' }, [h('span', { class: 'chip ok', text: R.anyData ? 'Clear' : 'Waiting' }),
      h('span', { text: R.anyData ? 'No discordance detected among the values entered.' : 'Enter values to check them for discordance.' })]));
  }
  items.forEach(x => card.appendChild(huItem(x)));
  if (quiet.length) {
    card.appendChild(h('details', { class: 'plain hu-quiet' }, [h('summary', { text: plural(quiet.length, 'quieter item') + ' (you rated these not useful)' }),
      h('div', {}, quiet.map(huItem)), h('p', { class: 'fine', text: 'Only notes and look-for tips are ever quieted. Alerts and cautions always stay visible. Change the rating to bring an item back.' })]));
  }
  return card;
}
function stepReport() {
  const main = $('main');
  const caseBox = h('textarea', { class: 'case', id: 'case-box', rows: '3', placeholder: 'Paste a case code here to load it', 'aria-label': 'Case code' });
  main.appendChild(h('div', { class: 'card' }, [
    h('div', { class: 'bar' }, [h('h2', { text: 'Report', style: 'font-size:22px;font-weight:650' }), h('div', { class: 'btns' }, [
      h('button', { type: 'button', class: 'btn primary', id: 'copy-report', text: 'Copy report', onclick: () => copyText(R.text, 'Report copied') }),
      h('button', { type: 'button', class: 'btn', id: 'copy-all', text: 'Copy with heads-up', onclick: () => copyText(R.textWithHeadsup, 'Report and heads-up copied') }),
      h('button', { type: 'button', class: 'btn', id: 'save-bank', text: 'Save to case bank', onclick: () => { const pn = $('bank-save'); if (pn) { pn.hidden = !pn.hidden; if (!pn.hidden) { const i = pn.querySelector('input[type=text]'); if (i) i.focus(); } } } })
    ])]),
    bankSavePanel(),
    h('div', { id: 'fallback', class: 'fallback' })
  ]));
  main.appendChild(h('div', { class: 'card' }, [styleRow()]));
  // the report, the suggested additions and the heads-up repaint whenever the result changes (wording level, a tapped suggestion)
  const live = h('div', { id: 'report-live' });
  let liveKey = null;
  widgets.push(() => {
    const dxKey = (R.differentials || []).map(g => g.key + ':' + g.dx.concat(g.studies).map(x => x.on ? '1' : '0').join('')).join(',');
    const key = R.text + '|' + (R.suggestions || []).map(x => x.id + (x.on ? '1' : '0') + (x.superseded ? 's' : '')).join(',') + '|' + dxKey + '|' + R.headsup.map(x => x.id).join(',');
    if (key === liveKey) return;
    liveKey = key;
    live.textContent = '';
    live.appendChild(reportDoc());
    const sc = suggestCard(); if (sc) live.appendChild(sc);
    const dc = dxCard(); if (dc) live.appendChild(dc);
    live.appendChild(headsupCard());
    const pl = $('plain'); if (pl) pl.textContent = R.text;
  });
  main.appendChild(live);
  const sim = similarCard(); if (sim) main.appendChild(sim);
  main.appendChild(h('div', { class: 'card' }, [
    h('details', { class: 'plain' }, [h('summary', { text: 'Plain-text version' }), h('pre', { class: 'plain', id: 'plain', text: R.text })]),
    h('details', { class: 'plain' }, [h('summary', { text: 'Save or load a case' }), h('div', { class: 'fallback' }, [
      h('p', { class: 'fine', text: 'A case code holds every entry on this page so the case can be reopened later. It contains no patient identifiers unless you typed some into a free-text field.' }),
      caseBox,
      h('div', { class: 'btns', style: 'display:flex;flex-wrap:wrap;gap:8px' }, [
        h('button', { type: 'button', class: 'btn sm', id: 'copy-case', text: 'Copy case code', onclick: () => copyText(encodeCase(), 'Case code copied') }),
        h('button', { type: 'button', class: 'btn sm', id: 'load-case', text: 'Load from box', onclick: () => {
          const st = decodeCase(caseBox.value);
          if (st) loadState(st, 'report', 'Case loaded'); else toast('That is not a valid case code');
        } })
      ])
    ])]),
    h('div', { class: 'nav' }, [h('button', { type: 'button', class: 'btn', text: '← Back to the last step', onclick: () => { const p = neighbour(-1); goto(p ? p.id : 'tests'); } })])
  ]));
}

/* ------------------------------------------------- live report preview (right-hand panel) */
/* While the forms are being clicked through, the report as it will read builds on the right. It is the same text as the
   Report step (facts per test, then the synthesized Interpretation); the section for the current step is marked and
   anything that just changed flashes once. Narrow screens keep the per-step "Findings as entered" box instead. */
let pvPrev = null, pvScrollTo = true;
function pvShown() { return mode === 'case' && step !== 'report'; }
function reportMeta() {
  const lines = R.text.split('\n'), meta = [];
  for (let i = 1; i < lines.length && lines[i] !== ''; i++) meta.push(lines[i]);
  return meta;
}
function paintPreview() {
  const pv = $('pv'); if (!pv) return;
  const cur = SECKEY[step] || step, prev = pvPrev || {}, next = { sec: {}, impr: [] };
  const doc = h('div', { class: 'doc pv-doc' }, [
    h('div', { class: 'dt', text: 'Pulmonary function test report' }),
    h('div', { class: 'meta' }, reportMeta().map(t => h('span', { text: t })))
  ]);
  R.sections.forEach(s => {
    const txt = s.empty ? '' : s.lines.join(' ');
    next.sec[s.key] = txt;
    const changed = !!txt && prev.sec && prev.sec[s.key] !== undefined && prev.sec[s.key] !== txt;
    doc.appendChild(h('div', { class: 'sec' + (s.key === cur ? ' cur' : '') + (changed ? ' chg' : ''), 'data-sec': s.key }, [
      h('h3', { text: s.title }),
      txt ? h('p', { text: txt }) : h('p', { class: 'pv-empty', text: s.key === cur ? 'Waiting for values on this step.' : 'Not entered yet.' })
    ]));
  });
  next.impr = R.impression.slice();
  const codes = uniq(R.sections.reduce((a, s) => a.concat(s.codes || []), []));
  const had = prev.impr || [];
  doc.appendChild(h('div', { class: 'interp' }, [h('h3', { text: 'Interpretation' }),
    R.impression.length
      ? h('ol', {}, R.impression.map(t => h('li', { class: prev.impr && had.indexOf(t) < 0 ? 'chg' : '', text: t })))
      : h('p', { class: 'pv-empty', text: 'The synthesis appears here once values are entered.' }),
    codes.length ? h('div', { class: 'codes-row' }, [h('span', { class: 'fine', text: 'Annals ATS 2025 codes' }), h('span', { class: 'codes' }, codes.map(codeChip))]) : null]));
  const sbp = studiesBlock(); if (sbp) doc.appendChild(sbp);
  const oldDoc = pv.querySelector('.pv-doc'), keepTop = oldDoc ? oldDoc.scrollTop : 0;
  pv.textContent = '';
  pv.appendChild(h('div', { class: 'pv-head' }, [
    h('h2', { text: 'Report preview' }),
    h('div', { class: 'pv-btns' }, [
      h('button', { type: 'button', class: 'btn sm', id: 'pv-copy', text: 'Copy', onclick: () => copyText(R.text, 'Report copied') }),
      h('button', { type: 'button', class: 'btn sm', id: 'pv-open', text: 'Full report', onclick: () => goto('report') })
    ])
  ]));
  const nSug = (R.suggestions || []).filter(x => !x.superseded).length, nOn = (R.suggestions || []).filter(x => x.on && !x.superseded).length;
  const nGrp = (R.differentials || []).length;
  const notes = [];
  if (nSug) notes.push((nOn ? nOn + ' of ' : '') + plural(nSug, 'suggested addition'));
  if (nGrp) notes.push('differentials and additional studies for ' + plural(nGrp, 'finding'));
  if (notes.length) doc.appendChild(h('p', { class: 'fine pv-sug', text: cap(notes.join('; ')) + ' on the Report step (tap to include).' }));
  pv.appendChild(doc);
  pvPrev = next;
  if (pvScrollTo) {
    pvScrollTo = false;
    const el = doc.querySelector('.sec.cur');
    doc.scrollTop = el ? Math.max(0, el.offsetTop - 70) : 0;
  } else doc.scrollTop = keepTop;
}
function renderPreview() {
  const pv = $('pv'), work = $('work');
  const show = pvShown();
  pv.hidden = !show; work.classList.toggle('has-pv', show);
  if (!show) { pv.textContent = ''; pvPrev = null; return; }
  pvScrollTo = true;
  widgets.push(paintPreview);
}
/* The panel is sticky; give it the height that is actually left on screen so it never runs off the bottom. */
let fitQueued = false;
function fitPreview() {
  fitQueued = false;
  const pv = $('pv'); if (!pv || pv.hidden || !pv.offsetParent) return;
  // the panel is sticky inside #work: its top is the sticky offset once the page has scrolled past the top of #work,
  // and it can never extend below the end of #work (where the browser would otherwise push it upward)
  const work = $('work').getBoundingClientRect();
  const stick = parseFloat(getComputedStyle(pv).top) || 0;
  const top = Math.max(stick, work.top);
  const avail = Math.min(window.innerHeight - top - 16, work.bottom - top);
  pv.style.height = Math.max(240, avail) + 'px';
}
function queueFit() { if (!fitQueued) { fitQueued = true; requestAnimationFrame(fitPreview); } }
function wirePreview() { window.addEventListener('scroll', queueFit, { passive: true }); window.addEventListener('resize', queueFit); }
function measureSteps() { const n = $('steps'); if (n && n.offsetHeight) document.documentElement.style.setProperty('--steps-h', n.offsetHeight + 'px'); }

/* ---------------------------------------------------------------- dispatcher */
function render() {
  if (!stepList().some(x => x.id === step)) step = 'tests';
  closePop();
  widgets = [];
  const main = $('main'); main.textContent = '';
  if (mode === 'learn') stepLearn();
  else if (mode === 'bank') stepBank();
  else if (step === 'tests') stepTests();
  else if (step === 'ctx') stepCtx();
  else if (step === 'prior') stepPrior();
  else if (step === 'report') stepReport();
  else stepModule(step);
  renderPreview();
  sync();
  measureSteps();
  fitPreview();
}

/* ------------------------------------------------------------------ new case */
function wireHeader() {
  const b = $('new-case');
  b.addEventListener('click', () => {
    if (!newArmed) {
      newArmed = true; b.textContent = 'Click again to clear'; b.classList.add('danger');
      clearTimeout(newTimer); newTimer = setTimeout(() => { newArmed = false; b.textContent = 'New case'; b.classList.remove('danger'); }, 3500);
      return;
    }
    clearTimeout(newTimer); newArmed = false; b.textContent = 'New case'; b.classList.remove('danger');
    loadState(freshState(), 'tests', 'Cleared');
  });
  document.querySelectorAll('.vw').forEach(v => v.addEventListener('click', () => {
    const m = v.getAttribute('data-view');
    if (m === 'case') { mode = 'case'; render(); window.scrollTo(0, 0); const mm = $('main'); if (mm) mm.focus({ preventScroll: true }); }
    else setMode(m, m === 'learn' ? { topic: learnTopic } : {});
  }));
}
