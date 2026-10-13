/* PFT Interpreter — interface. Everything on screen is generated from PFT.SCHEMA; the engine does the reasoning.
   Layout: the entry form on the left, the report as it will read on the right, building in real time. */
(function () {
'use strict';
const P = window.PFT, X = window.PFT_EXAMPLES;
const pad2 = (n) => (n < 10 ? '0' : '') + n;
const toISO = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const todayISO = () => toISO(new Date());
function freshState() { const st = P.defaultState(); st.ctx.date = todayISO(); st.units = Object.assign(st.units, unitPrefs()); return st; }
function shiftMonths(iso, m) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? new Date(iso + 'T00:00:00') : new Date();
  if (isNaN(d.getTime())) return '';
  const day = d.getDate(); d.setMonth(d.getMonth() - m); if (d.getDate() !== day) d.setDate(0);
  return toISO(d);
}
/* per-browser conveniences (never the case itself): theme, unit choices, quick sets, open folds */
function prefGet(k) { try { const v = window.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function prefSet(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage may be unavailable */ } }
function unitPrefs() { const u = prefGet('pft.units.v1'); const out = {}; if (u && typeof u === 'object') Object.keys(P.UNITS).forEach(q => { if (P.UNITS[q].f[u[q]] !== undefined) out[q] = u[q]; }); return out; }

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
const isNum = (v) => typeof v === 'number' && isFinite(v);

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
  P.TESTS.forEach(t => { if (S.tests[t.key] && !t.hidden) l.push({ id: t.key, name: SHORT[t.key] || t.name }); });
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
  const promptSteps = {}; (R.prompts || []).forEach(p => { promptSteps[p.mod] = (promptSteps[p.mod] || 0) + 1; });
  stepList().forEach(s => {
    const cls = ['pill'];
    if (stepHasData(s.id)) cls.push('has');
    if (s.id === 'report' && R.counts.alert > 0) cls.push('warn');
    const b = h('button', { type: 'button', class: cls.join(' '), 'data-step': s.id, 'aria-current': s.id === step ? 'step' : null, onclick: () => goto(s.id) },
      [h('span', { class: 'dot', 'aria-hidden': 'true' }), s.name, promptSteps[s.id] ? h('span', { class: 'ask', title: plural(promptSteps[s.id], 'value') + ' would help on this step', text: '?' }) : null]);
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

/* --------------------------------------------------------- field lookups */
function fieldDef(mod, id) {
  const m = P.SCHEMA[mod]; let out = null;
  m.groups.forEach(g => g.fields.forEach(f => { if (f.id === id) out = f; }));
  return out;
}
function isFilled(mod, f) {
  const v = S[mod][f.id];
  if (f.type === 'param') return v.c !== 'nm' || v.z !== '';
  if (f.type === 'chk') return !!v;
  if (f.type === 'multi') return v.length > 0;
  if (f.type === 'sel') return v !== f.opts[0][0];
  return String(v) !== '';
}
/* ids of the value boxes drawn inside other rows of a module */
function inlineIds(mod) {
  const ids = {};
  P.SCHEMA[mod].groups.forEach(g => g.fields.forEach(f => { if (f.cols) Object.keys(f.cols).forEach(k => { ids[f.cols[k]] = 1; }); }));
  return ids;
}

/* ------------------------------------------------------------ field widgets */
function optLabel(kind, cat) {
  const o = (P.KIND_OPTS[kind] || []).filter(x => x[0] === cat)[0];
  if (o) return o[1];
  return cat === 'high' ? 'Above ULN ↑' : (cat === 'wnl' ? 'WNL' : cat);
}
/* short button labels for the category buttons (the full names stay in the accessible name) */
const SHORT_OPT = { 'WNL': 'WNL', 'Near LLN': 'Near LLN', 'Mild ↓': 'Mild', 'Moderate ↓': 'Moderate', 'Severe ↓': 'Severe', 'Above ULN ↑': 'High', 'Below LLN ↓': 'Low' };
const U_SHORT = { 'mL/min/mmHg': 'mL', 'mmol/min/kPa': 'SI', '% pred': '%', '% of predicted': '%', 'cmH2O': 'cmH2O' };
function prmLabel(mod, f, text) { return h('span', { class: 'prm-lw' }, [h('span', { class: 'prm-l', text: text || f.label }), info(glossKey(mod, f.id))]); }
/* a unit button beside a value box: tap to switch the unit for that quantity everywhere */
function unitBtn(q) {
  const u = P.UNITS[q];
  const b = h('button', { type: 'button', class: 'ubtn', 'data-unit': q, title: 'Switch unit (' + u.opts.map(o => o[1]).join(' / ') + ')', 'aria-label': u.label + ' unit: ' + P.unitLabel(S, q) + '. Tap to switch.',
    onclick: () => { const cur = P.unitOf(S, q); const i = u.opts.findIndex(o => o[0] === cur); S.units[q] = u.opts[(i + 1) % u.opts.length][0]; prefSet('pft.units.v1', S.units); sync(); } });
  widgets.push(() => { const l = P.unitLabel(S, q); b.textContent = U_SHORT[l] || l; b.title = 'Unit: ' + l + ' (tap to switch: ' + u.opts.map(o => o[1]).join(' / ') + ')'; b.setAttribute('aria-label', u.label + ' unit: ' + l + '. Tap to switch.'); });
  return b;
}
/* one value box (a num field) as a cell: input + unit; `get/set` default to the module field */
function numCell(mod, f, opts) {
  opts = opts || {};
  const get = opts.get || (() => S[mod][f.id]), set = opts.set || ((v) => { S[mod][f.id] = v; });
  const id = uid('n');
  const inp = h('input', { type: 'text', class: 'num', id: id, inputmode: 'decimal', autocomplete: 'off', placeholder: opts.ph !== undefined ? opts.ph : (f.ph || ''), 'aria-label': opts.aria || (f.label + (f.unit ? ' (' + f.unit + ')' : '')), value: get(),
    oninput: (e) => { set(e.target.value); sync(); } });
  const ut = opts.unit || f.unit;
  const unitEl = f.units ? unitBtn(f.units) : ((ut || opts.grid) ? h('span', { class: 'u', title: ut || null, text: ut ? (U_SHORT[ut] || ut) : '' }) : null);
  widgets.push(() => { const v = get(); inp.classList.toggle('bad', v !== '' && !hasNum(v)); if (document.activeElement !== inp && inp.value !== String(v)) inp.value = v; });
  return h('span', { class: 'ix-c' + (opts.cls ? ' ' + opts.cls : ''), 'data-cell': mod + '.' + f.id }, [inp, unitEl]);
}
function blankCell() { return h('span', { class: 'ix-c ph', 'aria-hidden': 'true' }, [h('span', { class: 'u' })]); }
function textCell(cls) { return h('span', { class: 'ix-c txt' + (cls ? ' ' + cls : '') }); }

/* the z-score box of a param row */
function zCell(mod, f) {
  const zid = uid('z');
  const zin = h('input', { type: 'text', class: 'num z', id: zid, inputmode: 'decimal', autocomplete: 'off', placeholder: 'z', 'aria-label': f.label + ' z-score', value: S[mod][f.id].z,
    oninput: (e) => {
      const v = e.target.value; S[mod][f.id].z = v;
      if (hasNum(v)) S[mod][f.id].c = P.res({ c: S[mod][f.id].c, z: v }, f.kind).cat;
      sync();
    } });
  widgets.push(() => { const p = S[mod][f.id]; zin.classList.toggle('bad', p.z !== '' && !hasNum(p.z)); if (document.activeElement !== zin && zin.value !== String(p.z)) zin.value = p.z; });
  return h('span', { class: 'ix-c zc', 'data-cell': mod + '.' + f.id + '.z' }, [zin]);
}

/* What the typed values imply for a category row (sel fields with `auto`): the chips show it and are locked while it applies. */
const AUTO = {
  sixDist: (f) => { const x = f.six; return (isNum(x.dist) && isNum(x.llnUse)) ? (x.dist < x.llnUse ? 'low' : 'wnl') : ''; },
  sixDesat: (f) => { const x = f.six; if (!isNum(x.sn)) return ''; if (x.sn <= 88) return 'le88'; if (isNum(x.drop)) return x.drop >= 4 ? 'fall' : 'none'; return 'none'; },
  sixHrr: (f) => { const x = f.six; return isNum(x.hrr1) ? (x.hrr1 <= 18 ? 'abn' : 'nl') : ''; },
  hb: (f) => { const d = f.dl; return isNum(d.hb) ? d.hbCatUse : ''; },
  cohb: (f) => { const d = f.dl; return isNum(d.cohb) ? (d.cohb >= 2 ? 'hi' : 'nl') : ''; },
  feno: (f) => { const v = f.feno.v; if (!isNum(v)) return ''; const lo = f.feno.child ? 20 : 25, hi = f.feno.child ? 35 : 50; return v < lo ? 'low' : (v > hi ? 'high' : 'int'); }
};
function autoCat(f) { const fn = f.auto && AUTO[f.auto]; if (!fn) return ''; try { return fn(R.facts) || ''; } catch (e) { return ''; } }

/* One row of a step: label, category buttons, then the value boxes (z, value, % predicted, prior study, post-bronchodilator).
   `ctx.columns` lists the shared columns of the step (grid steps keep every row the same width so the boxes line up);
   `ctx.priors` / `ctx.bd` add the comparison and post-bronchodilator cells. */
function indexRow(mod, f, ctx) {
  ctx = ctx || {};
  if (f.type === 'num') {   // a value on a row of its own (Details step): label | box
    const extra = textCell('note');
    if (mod === 'ctx' && f.id === 'wt') widgets.push(() => { const b = R.facts.ctx.bmi; extra.textContent = isNum(b) ? 'BMI ' + b.toFixed(1) : ''; });
    return h('div', { class: 'ix', 'data-field': mod + '.' + f.id }, [h('div', { class: 'ix-l' }, [prmLabel(mod, f)]), h('div', { class: 'ix-seg' }), h('div', { class: 'ix-vals' }, [numCell(mod, f, { aria: f.label }), extra])]);
  }
  const isParam = f.type === 'param';
  const opts = isParam ? P.KIND_OPTS[f.kind].filter(o => o[0] !== 'nm') : (f.opts[0][0] === '' && /^Not /.test(f.opts[0][1]) ? f.opts.slice(1) : f.opts);
  const blank = !isParam && f.opts[0][0] === '' && /^Not /.test(f.opts[0][1]);
  const btns = opts.map(o => h('button', { type: 'button', class: isParam ? 'sg' : 'ch', 'data-v': o[0], role: isParam ? null : 'radio', 'aria-pressed': isParam ? 'false' : null, 'aria-checked': isParam ? null : 'false', text: isParam ? (SHORT_OPT[o[1]] || o[1]) : o[1], 'aria-label': isParam && SHORT_OPT[o[1]] && SHORT_OPT[o[1]] !== o[1] ? o[1] : null,
    onclick: () => {
      if (isParam) { const cur = S[mod][f.id]; S[mod][f.id] = (cur.c === o[0] && cur.z === '') ? { c: 'nm', z: '' } : { c: o[0], z: '' }; }
      else { const cur = S[mod][f.id]; S[mod][f.id] = (cur === o[0] && blank) ? '' : o[0]; }
      sync();
    } }));
  const cells = [];
  const cols = ctx.columns || (f.cols ? Object.keys(f.cols) : []);
  if (isParam && (!ctx.columns || ctx.columns.indexOf('z') >= 0)) cells.push(zCell(mod, f));
  else if (ctx.columns && ctx.columns.indexOf('z') >= 0) cells.push(blankCell());
  cols.filter(k => k !== 'z').forEach(k => {
    const nid = f.cols && f.cols[k];
    const nf = nid ? fieldDef(mod, nid) : null;
    if (nf && nf.type === 'num') cells.push(numCell(mod, nf, { grid: !!ctx.columns, ph: nf.ph || (ctx.columns ? '' : nf.label.replace(/^.*?\b(rest|nadir|peak|1 min|flow|min)\b.*$/, '$1')) }));
    else if (ctx.columns) cells.push(blankCell());
  });
  // prior studies: the same quantities for each earlier study
  if (ctx.priors && ctx.priors.length) {
    const pr = PRIOR_MAP[mod], defs = (pr && pr.fields[f.id]) || [];
    ctx.priors.forEach(p => {
      defs.forEach(d => { const pf = P.PRIOR_FIELDS.filter(x => x.id === d[0])[0]; cells.push(numCell('prior', { id: d[0], label: 'Prior ' + (pf ? pf.label : d[0]), unit: d[1] === 'walk' || d[1] === 'dlco' ? '' : d[1], units: d[1] === 'walk' || d[1] === 'dlco' ? d[1] : null }, { get: () => p[d[0]], set: (v) => { p[d[0]] = v; }, cls: 'pri', grid: true })); });
      for (let i = defs.length; i < pr.n; i++) cells.push(blankCell());
    });
  }
  // post-bronchodilator: the post value and the change as % of predicted
  if (ctx.bd) {
    const bdf = { ratio: 'post_ratio_abs', fev1: 'fev1_post', fvc: 'fvc_post' }[f.id];
    if (bdf) {
      const nf = fieldDef('bd', bdf);
      cells.push(numCell('bd', nf, { cls: 'post', grid: true, ph: f.id === 'ratio' ? '0.72' : '', aria: 'Post-bronchodilator ' + f.label + (nf.unit ? ' (' + nf.unit + ')' : '') }));
      const d = textCell('delta');
      widgets.push(() => {
        const b = R.facts.bd; let t = '';
        if (f.id === 'fev1' || f.id === 'fvc') {
          const dpp = f.id === 'fev1' ? b.dF : b.dV, dml = f.id === 'fev1' ? b.dFmL : b.dVmL;
          if (isNum(dpp)) t = (dpp > 0 ? '+' : '') + dpp.toFixed(1) + '% pred';
          else if (isNum(dml)) t = (dml > 0 ? '+' : '') + Math.round(dml) + ' mL';
        } else if (isNum(b.postRatioV) && isNum(R.facts.sp.ratioV)) { const dd = (b.postRatioV - R.facts.sp.ratioV) * 100; t = (dd > 0 ? '+' : '') + dd.toFixed(0) + ' pts'; }
        d.textContent = t; d.classList.toggle('sig', /% pred/.test(t) && parseFloat(t) > 10);
      });
      cells.push(d);
    } else { cells.push(blankCell()); cells.push(blankCell()); }
  }
  const autoTag = h('span', { class: 'auto-tag', hidden: true, text: 'from the values' });
  const row = h('div', { class: 'ix' + (f.more ? ' more' : ''), 'data-field': mod + '.' + f.id }, [
    h('div', { class: 'ix-l' }, [prmLabel(mod, f, ctx.label), autoTag]),
    h('div', { class: 'ix-seg', role: isParam ? 'group' : 'radiogroup', 'aria-label': f.label + ' category' }, btns),
    cells.length ? h('div', { class: 'ix-vals' }, cells) : null
  ]);
  widgets.push(() => {
    if (isParam) {
      const r = P.res(S[mod][f.id], f.kind);
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === r.cat)));
    } else {
      const a = autoCat(f), v = a || S[mod][f.id];
      btns.forEach(b => { b.setAttribute('aria-checked', String(b.getAttribute('data-v') === v)); b.classList.toggle('auto', !!a); b.disabled = !!a; });
      autoTag.hidden = !a;
    }
    if (f.more) row.hidden = !(moreOpen[mod] || isFilled(mod, f) || (f.cols && Object.keys(f.cols).some(k => String(S[mod][f.cols[k]]) !== '')));
  });
  return row;
}
const moreOpen = {};
/* "+ More" toggle for the rows marked `more` */
function moreToggle(mod, rows, label) {
  if (!rows.length) return null;
  const b = h('button', { type: 'button', class: 'lnk more-btn', 'data-more': mod, 'aria-expanded': 'false', onclick: () => { moreOpen[mod] = !moreOpen[mod]; sync(); } });
  widgets.push(() => { const open = !!moreOpen[mod]; b.setAttribute('aria-expanded', String(open)); b.textContent = open ? '− Fewer' : '+ ' + (label || 'More') + ' (' + rows.map(f => f.label.replace(/ \(.*$/, '')).join(', ') + ')'; });
  return h('div', { class: 'ix-more' }, [b]);
}
/* header row of a grid step: the column titles above the value boxes */
function gridHead(mod, ctx) {
  const cells = [];
  const hd = (text, cls, unit) => h('span', { class: 'ix-c hd' + (cls ? ' ' + cls : ''), text: text }, unit ? [h('span', { class: 'u' })] : null);   // the empty unit span keeps the header cell as wide as the boxes below it
  (ctx.columns || []).forEach(k => cells.push(k === 'z' ? h('span', { class: 'ix-c hd zc', text: 'z-score' }) : hd(ctx.colLabels[k] || k, '', true)));
  if (ctx.priors) ctx.priors.forEach((p, i) => { const pr = PRIOR_MAP[mod]; for (let j = 0; j < pr.n; j++) cells.push(hd(j === 0 ? 'Prior' + (ctx.priors.length > 1 ? ' ' + (i + 1) : '') : '', 'pri', true)); });
  if (ctx.bd) { cells.push(hd('Post-BD', 'post', true)); cells.push(h('span', { class: 'ix-c hd txt', text: 'Δ' })); }
  return h('div', { class: 'ix ix-head', 'aria-hidden': 'true' }, [h('div', { class: 'ix-l' }), h('div', { class: 'ix-seg' }), h('div', { class: 'ix-vals' }, cells)]);
}
/* how many value boxes a grid row carries; past four the boxes go on a line of their own under the buttons */
function gridCells(mod, ctx) { return (ctx.columns ? ctx.columns.length : 0) + (ctx.priors ? ctx.priors.length * PRIOR_MAP[mod].n : 0) + (ctx.bd ? 2 : 0); }

function numField(mod, f) {
  const id = uid('n');
  const inp = h('input', { type: 'text', class: 'num', id: id, inputmode: 'decimal', autocomplete: 'off', placeholder: f.ph || '', value: S[mod][f.id],
    oninput: (e) => { S[mod][f.id] = e.target.value; sync(); } });
  const unitEl = f.units ? unitBtn(f.units) : (f.unit ? h('span', { class: 'unit', text: f.unit }) : null);
  const extra = h('span', { class: 'fine fld-extra' });
  widgets.push(() => {
    const v = S[mod][f.id]; inp.classList.toggle('bad', v !== '' && !hasNum(v)); if (document.activeElement !== inp && inp.value !== String(v)) inp.value = v;
    if (mod === 'ctx' && f.id === 'wt') { const b = R.facts.ctx.bmi; extra.textContent = isNum(b) ? 'BMI ' + b.toFixed(1) : ''; }
  });
  return h('div', { class: 'fld', 'data-field': mod + '.' + f.id }, [
    h('div', { class: 'lab-row' }, [h('label', { for: id, text: f.label }), info(glossKey(mod, f.id))]),
    h('div', { class: 'inwrap' }, [inp, unitEl, extra])
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
    h('div', { class: 'prm-top' }, [prmLabel(mod, f)]),
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
  return h('div', { class: 'chkrow', 'data-field': mod + '.' + f.id }, [
    h('input', { type: 'checkbox', id: id, checked: !!S[mod][f.id], onchange: (e) => { S[mod][f.id] = e.target.checked; sync(); } }),
    h('label', { for: id, text: f.label })
  ]);
}
function txtField(mod, f, type) {
  const id = uid('t');
  return h('div', { class: 'fld' + (type === 'date' ? '' : ' wide'), 'data-field': mod + '.' + f.id }, [
    h('label', { for: id, text: f.label }),
    h('input', { type: type === 'date' ? 'date' : 'text', id: id, autocomplete: 'off', placeholder: f.ph || '', value: S[mod][f.id],
      oninput: (e) => { S[mod][f.id] = e.target.value; sync(); } })
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
  if (f.type === 'param') return indexRow(mod, f);
  if (f.type === 'num') return numField(mod, f);
  if (f.type === 'sel') return f.ui === 'loop' ? loopGallery(mod, f) : (f.cols ? indexRow(mod, f) : choiceRow(mod, f));
  if (f.type === 'multi') return multiField(mod, f);
  if (f.type === 'chk') return chkField(mod, f);
  if (f.type === 'date') return txtField(mod, f, 'date');
  return txtField(mod, f, 'txt');
}
/* a group of a step: the index rows (grid), a fold, an optional typing block, or plain fields */
function groupEl(mod, g, ctx) {
  if (g.legacy) return null;
  ctx = ctx || {};
  if (g.inline) {
    // value boxes not drawn inside any row are offered under "+ More values"
    const used = inlineIds(mod);
    const rest = g.fields.filter(f => !used[f.id]);
    if (!rest.length) return null;
    const fields = h('div', { class: 'fields' }, rest.map(f => fieldEl(mod, f)));
    const tag = h('span', { class: 'tag' });
    const el = h('details', { class: 'optgrp fold', 'data-group': 'values', open: rest.some(f => isFilled(mod, f)) }, [h('summary', {}, [h('span', { class: 't', text: 'More values' }), tag]), fields]);
    widgets.push(() => { const n = rest.filter(f => isFilled(mod, f)).length; tag.textContent = n ? n + ' entered' : ''; tag.hidden = !n; });
    return el;
  }
  if (g.rows) {
    const rows = g.fields.map(f => (f.type === 'num' || f.type === 'param' || (f.type === 'sel' && !f.ui)) ? indexRow(mod, f, { columns: null }) : fieldEl(mod, f));
    return h('section', { class: 'grp ixg rows' }, [h('div', { class: 'grp-head' }, [h('h3', { text: g.title })]), rows]);
  }
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
  } else if (g.fold) {
    const tag = h('span', { class: 'tag' });
    el = h('details', { class: 'optgrp fold', 'data-group': g.title.toLowerCase().replace(/[^a-z]+/g, '-'), open: g.fields.some(f => isFilled(mod, f)) }, [h('summary', {}, [h('span', { class: 't', text: g.title }), tag]), fields]);
    widgets.push(() => { const n = g.fields.filter(f => isFilled(mod, f)).length; tag.textContent = n ? n + ' entered' : ''; tag.hidden = !n; });
  } else {
    const head = h('div', { class: 'grp-head' }, [h('h3', { text: g.title })]);
    if (g.quick) {
      const names = g.quick.map(id => g.fields.filter(f => f.id === id)[0].label).join(', ');
      head.appendChild(h('button', { type: 'button', class: 'btn sm quiet quick', text: 'Unselected = normal', title: 'Marks ' + names + ' as within normal limits wherever nothing is selected yet',
        onclick: () => { g.quick.forEach(id => { const p = S[mod][id]; if (p.c === 'nm' && p.z === '') p.c = 'wnl'; }); sync(); } }));
    }
    el = h('section', { class: 'grp' }, [head, fields]);
  }
  if (g.when) widgets.push(() => { el.hidden = g.when.is.indexOf(S[mod][g.when.f]) < 0; });
  return el;
}
function navRow() {
  const prev = neighbour(-1), next = neighbour(1);
  return h('div', { class: 'nav' }, [
    prev ? h('button', { type: 'button', class: 'btn', onclick: () => goto(prev.id), text: '← ' + prev.name }) : h('span'),
    next ? h('button', { type: 'button', class: 'btn primary', onclick: () => goto(next.id), text: (next.id === 'report' ? 'View report' : 'Next: ' + next.name) + ' →' }) : null
  ]);
}
function stepHead(title, intro, src, gkey, keepIntro) {
  return h('div', { class: 'step-head' }, [h('div', { class: 'sh-title' }, [h('h2', { text: title }), gkey ? info(gkey) : null]), keepIntro && intro ? h('p', { class: 'intro', text: intro }) : null]);
}
/* Pattern-triggered prompts for this step: one line each, with a button that reveals or focuses the field (or adds the test). */
function promptStrip(mod) {
  const box = h('div', { class: 'prompts', 'data-prompts': mod });
  widgets.push(() => {
    const list = (R.prompts || []).filter(p => p.mod === mod);
    box.textContent = ''; box.hidden = !list.length;
    list.forEach(p => box.appendChild(h('div', { class: 'prompt', 'data-prompt': p.id }, [
      h('span', { class: 'prompt-t', text: p.text }),
      p.test ? h('button', { type: 'button', class: 'btn sm', text: 'Add ' + (SHORT[p.test] || p.test), onclick: () => { S.tests[p.test] = true; sync(); toast((SHORT[p.test] || p.test) + ' added as a step'); } }) :
      (p.field ? h('button', { type: 'button', class: 'btn sm', text: p.field === 'bd' ? 'Bronchodilator' : 'Show', onclick: () => revealField(mod, p.field) }) : null)
    ])));
  });
  return box;
}
function revealField(mod, id) {
  if (id === 'bd') { S.tests.bd = true; render(); const el = document.querySelector('[data-cell="bd.fev1_post"] input'); if (el) el.focus(); return; }
  const f = fieldDef(mod, id);
  if (f && f.more) { moreOpen[mod] = true; sync(); }
  const el = document.querySelector('[data-field="' + mod + '.' + id + '"]');
  if (el) {
    const det = el.closest('details'); if (det) det.open = true;
    el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600);
    const inp = el.querySelector('input, button'); if (inp) inp.focus({ preventScroll: true });
  }
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
/* quick sets: the built-in ones until the user edits them; then the user's own list (kept in this browser) */
const QS_KEY = 'pft.quicksets.v1';
function quickSets() {
  const v = prefGet(QS_KEY);
  if (Array.isArray(v)) return v.filter(q => q && typeof q.name === 'string' && Array.isArray(q.tests)).map(q => ({ name: q.name.slice(0, 48), tests: q.tests.filter(t => P.TESTS.some(x => x.key === t)) }));
  return P.PRESETS.map(p => ({ name: p.name, tests: p.tests.slice() }));
}
function saveQuickSets(list) { prefSet(QS_KEY, list); }
let qsEdit = false;
function stepTests() {
  const main = $('main');
  const shown = P.TESTS.filter(t => !t.hidden);
  const groups = []; shown.forEach(t => { if (groups.indexOf(t.group) < 0) groups.push(t.group); });
  const count = h('span', { class: 'count' });
  const cont = h('button', { type: 'button', class: 'btn primary', text: 'Continue →', onclick: () => goto('ctx') });
  const rows = {};
  const selBlock = groups.map(g => h('div', { class: 'sel-group' }, [
    h('h3', { text: g }),
    h('div', { class: 'tgrid' }, shown.filter(t => t.group === g).map(t => {
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
    shown.forEach(t => { const r = rows[t.key]; r.cb.checked = !!S.tests[t.key]; r.lab.classList.toggle('on', !!S.tests[t.key]); if (S.tests[t.key]) n++; });
    count.textContent = n ? plural(n, 'test') + ' selected' : 'Select at least one test';
    cont.disabled = !n;
  });
  // quick sets, editable
  const qsBox = h('div', { class: 'presets', 'data-quicksets': '1' });
  const editBtn = h('button', { type: 'button', class: 'lnk', 'data-qs-edit': '1', text: 'Edit', onclick: () => { qsEdit = !qsEdit; paintQs(); } });
  const selectedTests = () => Object.keys(S.tests).filter(k => S.tests[k]);
  function paintQs() {
    const list = quickSets();
    qsBox.textContent = '';
    editBtn.textContent = qsEdit ? 'Done' : 'Edit';
    if (!qsEdit) {
      list.forEach(q => qsBox.appendChild(h('button', { type: 'button', class: 'chip qs', 'data-qs': q.name, title: q.tests.map(k => SHORT[k] || k).join(', '), text: q.name,
        onclick: () => { Object.keys(S.tests).forEach(k => { S.tests[k] = q.tests.indexOf(k) >= 0; }); sync(); } })));
      return;
    }
    const ed = h('div', { class: 'qs-edit' });
    list.forEach((q, i) => {
      const nameIn = h('input', { type: 'text', value: q.name, 'aria-label': 'Quick set name', maxlength: '48', oninput: (e) => { const l = quickSets(); l[i].name = e.target.value; saveQuickSets(l); } });
      ed.appendChild(h('div', { class: 'qs-row', 'data-qs-row': q.name }, [
        nameIn,
        h('span', { class: 'fine qs-tests', text: q.tests.map(k => SHORT[k] || k).join(', ') || 'no tests' }),
        h('span', { class: 'qs-acts' }, [
          h('button', { type: 'button', class: 'btn sm quiet', text: 'Set to current selection', title: 'Replace this quick set\'s tests with the tests ticked below', onclick: () => { const l = quickSets(); l[i].tests = selectedTests(); saveQuickSets(l); paintQs(); toast('Quick set updated'); } }),
          h('button', { type: 'button', class: 'btn sm quiet danger', text: 'Delete', onclick: () => { const l = quickSets(); l.splice(i, 1); saveQuickSets(l); paintQs(); } })
        ])
      ]));
    });
    const newName = h('input', { type: 'text', placeholder: 'Name for the current selection', 'aria-label': 'New quick set name', maxlength: '48' });
    ed.appendChild(h('div', { class: 'qs-row qs-new' }, [newName, h('button', { type: 'button', class: 'btn sm', 'data-qs-add': '1', text: '+ Save current selection', onclick: () => {
      const nm = newName.value.trim(); const ts = selectedTests();
      if (!nm) { toast('Give the quick set a name'); newName.focus(); return; }
      if (!ts.length) { toast('Tick the tests first'); return; }
      const l = quickSets(); l.push({ name: nm, tests: ts }); saveQuickSets(l); newName.value = ''; paintQs(); toast('Quick set saved');
    } })]));
    ed.appendChild(h('div', { class: 'qs-row' }, [h('button', { type: 'button', class: 'lnk', 'data-qs-reset': '1', text: 'Restore the built-in quick sets', onclick: () => { saveQuickSets(P.PRESETS.map(p => ({ name: p.name, tests: p.tests.slice() }))); paintQs(); } })]));
    qsBox.appendChild(ed);
  }
  paintQs();
  main.appendChild(h('div', { class: 'card' }, [
    stepHead('Which tests were performed?', 'Tick what was done; each test becomes one step. The bronchodilator response is entered inside Spirometry.', null, null, true),
    promptStrip('tests'),
    h('div', { class: 'sel-group' }, [h('div', { class: 'grp-head' }, [h('h3', { text: 'Quick sets' }), editBtn]), qsBox]),
    selBlock,
    h('div', { class: 'start-row' }, [cont, count])
  ]));
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
    stepHead(m.title, '', m.src),
    promptStrip('ctx'),
    m.groups.map(g => groupEl('ctx', g)),
    h('details', { class: 'optgrp fold', 'data-group': 'settings' }, [h('summary', {}, [h('span', { class: 't', text: 'Settings: thresholds, wording level, what the copy includes' })]), h('div', { class: 'fields' }, [
      serialRow(),
      h('div', { class: 'prm ch-row', 'data-field': 'settings.band' }, [
        h('div', { class: 'prm-top' }, [h('span', { class: 'prm-l', text: 'Near-LLN review flag' }), h('span', { class: 'hint', text: 'A value this close above the LLN is marked "near the LLN". It stays within normal limits; this is a local review convention, not a category' })]),
        h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Near-LLN review flag' }, bb)
      ]),
      styleRow(),
      copyRow()
    ])]),
    navRow()
  ]);
  main.appendChild(card);
}

/* -------------------------------------------------------------- step: module */
function stepModule(key) {
  const m = P.SCHEMA[key];
  const extra = [];
  if (key === 'fvl') extra.push(h('div', { class: 'learn-link' }, [h('button', { type: 'button', class: 'btn sm quiet', 'data-learn': 'loops', text: 'Learn: how to read a flow–volume loop and what each pattern means →', onclick: () => openLearn('loops') })]));
  if (key === 'sixmw') { extra.push(predCalcBlock()); extra.push(trendBlock()); }
  const ctx = { columns: m.columns ? m.columns.map(c => c[0]) : null, colLabels: {} };
  (m.columns || []).forEach(c => { ctx.colLabels[c[0]] = c[1]; });
  const pr = PRIOR_MAP[key] ? priorBlock(key, ctx) : null;
  if (key === 'spiro' && (S.tests.bd || P.bdEntered(S.bd))) ctx.bd = true;
  const body = [];
  m.groups.forEach((g, gi) => {
    if (g.legacy) return;
    const isGrid = !!(m.columns && gi === 0 && !g.inline && !g.fold && !g.opt);
    const isRows = !isGrid && !g.inline && !g.fold && !g.opt && !g.when && g.fields.some(f => f.type === 'param' || (f.type === 'sel' && !f.ui));
    if (isGrid || isRows) {
      const head = h('div', { class: 'grp-head' }, [h('h3', { text: g.title })]);
      if (g.quick) {
        const names = g.quick.map(id => g.fields.filter(f => f.id === id)[0].label).join(', ');
        head.appendChild(h('button', { type: 'button', class: 'btn sm quiet quick', text: 'Unselected = normal', title: 'Marks ' + names + ' as within normal limits wherever nothing is selected yet',
          onclick: () => { g.quick.forEach(id => { const p = S[key][id]; if (p.c === 'nm' && p.z === '') p.c = 'wnl'; }); sync(); } }));
      }
      const rows = g.fields.map(f => (f.type === 'param' || (f.type === 'sel' && !f.ui)) ? indexRow(key, f, isGrid ? ctx : { priors: ctx.priors }) : fieldEl(key, f));
      const moreRows = g.fields.filter(f => f.more);
      body.push(h('section', { class: 'grp ixg' + (isGrid ? ' grid' : '') + (isGrid && gridCells(key, ctx) > 4 ? ' stack' : ''), 'data-grid': key }, [head, isGrid ? gridHead(key, ctx) : null, rows, moreToggle(key, moreRows)]));
    } else {
      const el = groupEl(key, g, ctx); if (el) body.push(el);
    }
  });
  const bd = key === 'spiro' ? bdBlock(ctx) : null;
  // order: prompts, prior toggle (top), grid, bronchodilator, more values, folds (quality lower), extras
  const folds = body.filter(x => x.tagName === 'DETAILS'), mains = body.filter(x => x.tagName !== 'DETAILS');
  $('main').appendChild(h('div', { class: 'card' }, [
    stepHead(m.title, m.intro, m.src, 'test.' + key),
    promptStrip(key),
    pr ? pr.top : null,
    extra.filter(x => x.getAttribute('data-trend') !== '1' && x.getAttribute('data-es') !== '1'),
    mains, bd, pr ? pr.foot : null, folds,
    extra.filter(x => x.getAttribute('data-es') === '1'),
    extra.filter(x => x.getAttribute('data-trend') === '1'),
    navRow()
  ]));
}

/* ------------------------------------------------- bronchodilator, inside the spirometry step */
function bdBlock(ctx) {
  const id = uid('bd');
  const on = !!(S.tests.bd || P.bdEntered(S.bd));
  const cb = h('input', { type: 'checkbox', id: id, checked: on, 'data-bd-toggle': '1', onchange: (e) => {
    if (e.target.checked) { S.tests.bd = true; }
    else { S.tests.bd = false; S.bd = P.normalizeState({}).bd; }
    render();
  } });
  const m = P.SCHEMA.bd;
  const kids = [];
  if (on) {
    m.groups.forEach(g => {
      if (g.legacy || g.inline) return;
      if (g.fold) { kids.push(groupEl('bd', g)); return; }
      const rows = g.fields.map(f => (f.type === 'param' || (f.type === 'sel' && !f.ui)) ? indexRow('bd', f, { columns: null }) : fieldEl('bd', f));
      kids.push(h('section', { class: 'grp ixg', 'data-grid': 'bd' }, [rows, moreToggle('bd', g.fields.filter(f => f.more), 'More')]));
    });
  }
  return h('section', { class: 'grp bd-block', 'data-bd': String(on) }, [
    h('div', { class: 'chkrow big' }, [cb, h('label', { for: id, text: 'Bronchodilator given' }), on ? h('span', { class: 'fine', text: 'Type the post values beside the pre values; the change is calculated.' }) : null]),
    kids
  ]);
}

/* ------------------------------------------------- prior study, inline on the test step */
/* Per step: which rows get prior cells (prior field id, unit) and the comparability flags. The prior value switches the
   comparison on by itself. */
const PRIOR_MAP = {
  spiro: { fields: { fev1: [['fev1', 'L'], ['fev1_pct', '%']], fvc: [['fvc', 'L'], ['fvc_pct', '%']] }, n: 2, cmp: ['ref_diff', 'bd_diff', 'qual_diff'] },
  vol: { fields: { tlc: [['tlc', 'L']] }, n: 1, cmp: ['method_diff', 'ref_diff'] },
  dlco: { fields: { dlco: [['dlco', 'dlco'], ['dlco_pct', '%']] }, n: 2, cmp: ['hb_diff', 'ref_diff'] },
  feno: { fields: { band: [['feno', 'ppb']] }, n: 1, cmp: [] }
};
const priorOpen = {};
function priorHasValues(key) { const def = PRIOR_MAP[key]; const ids = []; Object.keys(def.fields).forEach(k => def.fields[k].forEach(d => ids.push(d[0]))); return S.prior.list.some(p => ids.some(id => String(p[id] || '').trim() !== '')); }
function priorBlock(key, ctx) {
  const def = PRIOR_MAP[key];
  const INTERVALS = [['3 mo', 3], ['6 mo', 6], ['1 yr', 12], ['2 yr', 24], ['3 yr', 36]];
  const open = priorOpen[key] || priorHasValues(key);
  if (open) ctx.priors = S.prior.list;
  const cbId = uid('pc');
  const cb = h('input', { type: 'checkbox', id: cbId, checked: open, 'data-prior-toggle': key, onchange: (e) => {
    priorOpen[key] = e.target.checked;
    if (!e.target.checked) { const ids = []; Object.keys(def.fields).forEach(k => def.fields[k].forEach(d => ids.push(d[0]))); S.prior.list.forEach(p => ids.forEach(id => { p[id] = ''; })); }
    render();
  } });
  const dates = h('div', { class: 'pr-dates' });
  if (open) {
    S.prior.list.forEach((p, i) => {
      const inp = h('input', { type: 'date', value: p.date, 'aria-label': 'Date of prior study ' + (i + 1), oninput: (e) => { p.date = e.target.value; sync(); } });
      widgets.push(() => { if (document.activeElement !== inp && inp.value !== p.date) inp.value = p.date; });
      dates.appendChild(h('div', { class: 'pr-date' }, [
        h('span', { class: 'pr-l', text: S.prior.list.length > 1 ? 'Prior ' + (i + 1) : 'Prior study' }), inp,
        h('span', { class: 'qd' }, INTERVALS.map(iv => h('button', { type: 'button', class: 'lnk', 'data-months': String(iv[1]), text: iv[0], title: iv[0] + ' before this study', onclick: () => { p.date = shiftMonths(S.ctx.date, iv[1]); sync(); } }))),
        S.prior.list.length > 1 ? h('button', { type: 'button', class: 'lnk', text: 'remove', onclick: () => { S.prior.list.splice(i, 1); render(); } }) : null
      ]));
    });
    if (S.prior.list.length < P.MAX_PRIORS) dates.appendChild(h('button', { type: 'button', class: 'lnk', 'data-prior-add': '1', text: '+ older study', onclick: () => { S.prior.list.push(P.blankPrior()); render(); } }));
  }
  const top = h('section', { class: 'grp prior-inline', 'data-prior-block': key }, [
    h('div', { class: 'chkrow big' }, [cb, h('label', { for: cbId, text: 'Compare with a prior study' }), open ? h('span', { class: 'fine', text: 'Prior values go in the columns beside this study\'s values.' }) : null]),
    open ? dates : null
  ]);
  let foot = null;
  if (open && def.cmp.length) {
    const flags = def.cmp.map(id => P.PRIOR_FIELDS.filter(f => f.id === id)[0]).filter(Boolean);
    foot = h('details', { class: 'plain pr-cmp', 'data-group': 'cmp' }, [h('summary', { text: 'Prior study not directly comparable? (different equations, bronchodilator state, method…)' }),
      h('div', {}, S.prior.list.map((p, i) => h('div', { class: 'pr-cmpcol' }, [S.prior.list.length > 1 ? h('b', { text: 'Prior ' + (i + 1) }) : null].concat(flags.map(f => { const id = uid('pf'); return h('div', { class: 'chkrow' }, [h('input', { type: 'checkbox', id: id, checked: !!p[f.id], onchange: (e) => { p[f.id] = e.target.checked; sync(); } }), h('label', { for: id, text: f.label })]); })))))]);
  }
  return { top: top, foot: foot };
}
function dateShort(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso); return m ? (+m[2]) + '/' + (+m[3]) + '/' + m[1] : iso; }

/* ------------------------------------------------------------- settings rows */
const SERIAL_OPTS = [['ers', 'ERS/ATS: FEV1 and FVC 15%, DLCO 10%'], ['local', 'Reading-room template: FEV1 and FVC 10%, DLCO 20%']];
function serialRow() {
  const btns = SERIAL_OPTS.map(o => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-v': o[0], 'aria-checked': 'false', text: o[1], onclick: () => { S.settings.serial = o[0]; sync(); } }));
  widgets.push(() => btns.forEach(b => b.setAttribute('aria-checked', String((S.settings.serial || 'ers') === b.getAttribute('data-v')))));
  return h('div', { class: 'prm ch-row', 'data-field': 'settings.serial' }, [
    h('div', { class: 'prm-top' }, [h('span', { class: 'prm-l', text: 'Significant change on past testing' }), h('span', { class: 'hint', text: 'The margin of error quoted in the PAST TESTING COMPARISON section' })]),
    h('div', { class: 'seg stack', role: 'radiogroup', 'aria-label': 'Significant change thresholds' }, btns)
  ]);
}
const STYLE_OPTS = [['concise', 'Concise'], ['standard', 'Standard'], ['expanded', 'Detailed']];
function styleRow() {
  const btns = STYLE_OPTS.map(o => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-v': o[0], 'aria-checked': 'false', text: o[1], onclick: () => { S.settings.style = o[0]; sync(); } }));
  widgets.push(() => btns.forEach(b => b.setAttribute('aria-checked', String(S.settings.style === b.getAttribute('data-v')))));
  return h('div', { class: 'prm ch-row', 'data-field': 'settings.style' }, [
    h('div', { class: 'prm-top' }, [h('span', { class: 'prm-l', text: 'Wording level' }), h('span', { class: 'hint', text: 'Concise: findings only. Standard: numbers, then findings. Detailed: adds the caveats.' })]),
    h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Wording level' }, btns)
  ]);
}
const COPY_OPTS = [['lean', 'Sections and interpretation only'], ['full', 'With header: date, demographics, BMI, reference set, interpretability']];
function copyRow() {
  const btns = COPY_OPTS.map(o => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-v': o[0], 'aria-checked': 'false', text: o[1], onclick: () => { S.settings.copy = o[0]; sync(); } }));
  widgets.push(() => btns.forEach(b => b.setAttribute('aria-checked', String((S.settings.copy || 'lean') === b.getAttribute('data-v')))));
  return h('div', { class: 'prm ch-row', 'data-field': 'settings.copy' }, [
    h('div', { class: 'prm-top' }, [h('span', { class: 'prm-l', text: 'What the copied report includes' })]),
    h('div', { class: 'seg stack', role: 'radiogroup', 'aria-label': 'Copied report contents' }, btns)
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
  return h('details', { class: 'card sugs fold-card', id: 'suggest', open: n > 0 || foldOpen.suggest, ontoggle: (e) => { foldOpen.suggest = e.target.open; } }, [
    h('summary', { class: 'hu-head' }, [h('h2', { id: 'sg-h', text: 'Optional wording' }), h('span', { class: 'chip ' + (n ? 'ok' : 'note'), text: n ? n + ' included' : plural(list.length, 'suggestion') })]),
    h('p', { class: 'fine', text: 'Interpretive sentences the numbers make relevant. Tap to add one to the interpretation; tap again to remove.' }),
    h('div', { class: 'sug-list' }, chips)
  ]);
}
const foldOpen = { suggest: false, dx: false, hu: false };

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
  const sum = h('span', { class: 'chip ' + (nDx || nSt ? 'ok' : 'note'), text: nDx || nSt ? [nDx ? plural(nDx, 'differential') : '', nSt ? plural(nSt, 'study', 'studies') : ''].filter(Boolean).join(', ') + ' included' : 'for ' + plural(groups.length, 'finding') });
  const card = h('details', { class: 'card dxs fold-card', id: 'differentials', open: nDx + nSt > 0 || foldOpen.dx, ontoggle: (e) => { foldOpen.dx = e.target.open; } }, [
    h('summary', { class: 'hu-head' }, [h('h2', { id: 'dx-h', text: 'Differentials and additional studies' }), sum]),
    h('p', { class: 'fine', text: 'Tap a differential to add it to the interpretation (one sentence per finding) and a study to list it under "Additional studies to consider". Tap again to remove.' })
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
function reportText() { return (S.settings.copy === 'full') ? R.textFull : R.textLean; }
function reportDoc() {
  const full = S.settings.copy === 'full';
  const doc = h('article', { class: 'doc', id: 'doc' }, [
    h('div', { class: 'dt', text: 'Pulmonary function test report' }),
    full ? h('div', { class: 'meta' }, (R.header || []).map(t => h('span', { text: t }))) : null
  ]);
  R.sections.forEach(s => { if (!full && s.key === 'qual') return; doc.appendChild(h('div', { class: 'sec', 'data-sec': s.key }, [
    h('h3', { text: s.title + ':' }),
    h('p', { text: s.lines.join(' ') })
  ])); });
  const codes = uniq(R.sections.reduce((a, s) => a.concat(s.codes || []), []));
  doc.appendChild(h('div', { class: 'interp' }, [h('h3', { text: 'INTERPRETATION:' }),
    R.impression.length ? h('p', { class: 'impr-p' }, R.impression.map(t => h('span', { class: 'impr-s', text: t + ' ' }))) : h('p', { class: 'fine', text: 'No interpretable data entered.' }),
    codes.length ? h('div', { class: 'codes-row', 'data-codes': codes.join(',') }, [h('span', { class: 'fine' }, ['Annals ATS 2025 codes', h('span', { class: 'noprint', text: ' (tap for meaning)' })]), h('span', { class: 'codes' }, codes.map(codeChip))]) : null]));
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
  return h('details', { class: 'hu-item', 'data-lvl': x.lvl, 'data-id': x.id, open: x.lvl === 'alert' }, [
    h('summary', {}, [h('span', { class: 'chip ' + x.lvl, text: LVL[x.lvl] || x.lvl }), h('span', { class: 'hu-t', text: x.title })]),
    h('div', { class: 'hu-b' }, [h('span', { class: 'cat', text: x.cat }), h('p', { text: x.text }), x.look && x.look.length ? lookFigures(x.look) : null, canRate ? rate : null])
  ]);
}
function headsupCard() {
  const rank = { alert: 0, caution: 1, tip: 2, note: 3 };
  const all = R.headsup.map((x, i) => ({ x: x, i: i })).sort((a, b) => (rank[a.x.lvl] - rank[b.x.lvl]) || (a.i - b.i)).map(o => o.x);
  const quiet = all.filter(x => fbQuiet(x)), items = all.filter(x => !fbQuiet(x));
  const c = R.counts;
  const sum = h('div', { class: 'hu-sum' }, ['alert', 'caution', 'tip', 'note'].filter(k => c[k]).map(k => h('span', { class: 'chip ' + k, text: c[k] + ' ' + (k === 'tip' ? 'look-for' : k) })));
  const card = h('section', { class: 'card hu', id: 'headsup', 'aria-labelledby': 'hu-h' }, [
    h('div', { class: 'hu-head' }, [h('h2', { id: 'hu-h', text: 'Heads-up' }), sum]),
    h('p', { class: 'fine', text: 'For you, not the report: discordance, data-entry checks, technique, what to look for on the tracing, and missing tests that would change the reading. Tap an item to open it.' })
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
/* prompts from every step, listed on the report so nothing useful is left unasked */
function promptsCard() {
  const list = R.prompts || [];
  if (!list.length) return null;
  return h('section', { class: 'card prompts-card', id: 'prompts' }, [
    h('div', { class: 'hu-head' }, [h('h2', { text: 'Values that would help' }), h('span', { class: 'chip note', text: String(list.length) })]),
    h('div', { class: 'prompts' }, list.map(p => h('div', { class: 'prompt', 'data-prompt': p.id }, [h('span', { class: 'prompt-t', text: p.text }),
      h('button', { type: 'button', class: 'btn sm', text: p.test ? 'Add ' + (SHORT[p.test] || p.test) : 'Go to ' + (p.mod === 'ctx' ? 'Details' : (SHORT[p.mod] || p.mod)), onclick: () => { if (p.test) { S.tests[p.test] = true; goto(p.test); } else { goto(p.mod); setTimeout(() => revealField(p.mod, p.field), 30); } } })])))
  ]);
}
function stepReport() {
  const main = $('main');
  const caseBox = h('textarea', { class: 'case', id: 'case-box', rows: '3', placeholder: 'Paste a case code here to load it', 'aria-label': 'Case code' });
  main.appendChild(h('div', { class: 'card' }, [
    h('div', { class: 'bar' }, [h('h2', { text: 'Report', class: 'h2s' }), h('div', { class: 'btns' }, [
      h('button', { type: 'button', class: 'btn primary', id: 'copy-report', text: 'Copy report', onclick: () => copyText(reportText(), 'Report copied') }),
      h('button', { type: 'button', class: 'btn', id: 'copy-all', text: 'Copy with heads-up', onclick: () => copyText(R.textWithHeadsup, 'Report and heads-up copied') }),
      h('button', { type: 'button', class: 'btn', id: 'save-bank', text: 'Save to case bank', onclick: () => { const pn = $('bank-save'); if (pn) { pn.hidden = !pn.hidden; if (!pn.hidden) { const i = pn.querySelector('input[type=text]'); if (i) i.focus(); } } } })
    ])]),
    bankSavePanel(),
    h('div', { id: 'fallback', class: 'fallback' }),
    h('div', { class: 'style-inline' }, [copyRow(), styleRow()])
  ]));
  // the report, the suggested additions and the heads-up repaint whenever the result changes (wording level, a tapped suggestion)
  const live = h('div', { id: 'report-live' });
  let liveKey = null;
  widgets.push(() => {
    const dxKey = (R.differentials || []).map(g => g.key + ':' + g.dx.concat(g.studies).map(x => x.on ? '1' : '0').join('')).join(',');
    const key = R.textFull + '|' + (R.suggestions || []).map(x => x.id + (x.on ? '1' : '0') + (x.superseded ? 's' : '')).join(',') + '|' + dxKey + '|' + R.headsup.map(x => x.id).join(',') + '|' + S.settings.copy + '|' + (R.prompts || []).map(p => p.id).join(',');
    if (key === liveKey) return;
    liveKey = key;
    live.textContent = '';
    live.appendChild(reportDoc());
    const sc = suggestCard(); if (sc) live.appendChild(sc);
    const dc = dxCard(); if (dc) live.appendChild(dc);
    const pc = promptsCard(); if (pc) live.appendChild(pc);
    live.appendChild(headsupCard());
    const pl = $('plain'); if (pl) pl.textContent = reportText();
  });
  main.appendChild(live);
  const sim = similarCard(); if (sim) main.appendChild(sim);
  main.appendChild(h('div', { class: 'card' }, [
    h('details', { class: 'plain' }, [h('summary', { text: 'Plain-text version' }), h('pre', { class: 'plain', id: 'plain', text: reportText() })]),
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

/* ------------------------------------------------- running report (right-hand column) */
/* While the forms are being clicked through, the report as it will read builds on the right in real time. It is the same
   text as the Report step; the section for the current step is marked and anything that just changed flashes once. */
let pvPrev = null, pvScrollTo = true;
function pvShown() { return mode === 'case' && step !== 'report'; }
function paintPreview() {
  const pv = $('pv'); if (!pv) return;
  const cur = SECKEY[step] || step, prev = pvPrev || {}, next = { sec: {}, impr: [] };
  const full = S.settings.copy === 'full';
  const doc = h('div', { class: 'doc pv-doc' }, [
    h('div', { class: 'dt', text: 'Report' }),
    full ? h('div', { class: 'meta' }, (R.header || []).map(t => h('span', { text: t }))) : null
  ]);
  R.sections.forEach(s => {
    if (!full && s.key === 'qual') return;
    const txt = s.empty ? '' : s.lines.join(' ');
    next.sec[s.key] = txt;
    const changed = !!txt && prev.sec && prev.sec[s.key] !== undefined && prev.sec[s.key] !== txt;
    doc.appendChild(h('div', { class: 'sec' + (s.key === cur ? ' cur' : '') + (changed ? ' chg' : ''), 'data-sec': s.key }, [
      h('h3', { text: s.title + ':' }),
      txt ? h('p', { text: txt }) : h('p', { class: 'pv-empty', text: s.key === cur ? 'Waiting for values on this step.' : 'Not entered yet.' })
    ]));
  });
  next.impr = R.impression.slice();
  const codes = uniq(R.sections.reduce((a, s) => a.concat(s.codes || []), []));
  const had = prev.impr || [];
  doc.appendChild(h('div', { class: 'interp' }, [h('h3', { text: 'INTERPRETATION:' }),
    R.impression.length
      ? h('p', { class: 'impr-p' }, R.impression.map(t => h('span', { class: 'impr-s' + (prev.impr && had.indexOf(t) < 0 ? ' chg' : ''), text: t + ' ' })))
      : h('p', { class: 'pv-empty', text: 'The interpretation appears here as values are entered.' }),
    codes.length ? h('div', { class: 'codes-row' }, [h('span', { class: 'fine', text: 'Annals ATS 2025 codes' }), h('span', { class: 'codes' }, codes.map(codeChip))]) : null]));
  const oldDoc = pv.querySelector('.pv-doc'), keepTop = oldDoc ? oldDoc.scrollTop : 0;
  pv.textContent = '';
  pv.appendChild(h('div', { class: 'pv-head' }, [
    h('h2', { text: 'Running report' }),
    h('div', { class: 'pv-btns' }, [
      h('button', { type: 'button', class: 'btn sm', id: 'pv-copy', text: 'Copy', onclick: () => copyText(reportText(), 'Report copied') }),
      h('button', { type: 'button', class: 'btn sm', id: 'pv-open', text: 'Full report', onclick: () => goto('report') })
    ])
  ]));
  const nSug = (R.suggestions || []).filter(x => !x.superseded).length, nOn = (R.suggestions || []).filter(x => x.on && !x.superseded).length;
  const nGrp = (R.differentials || []).length;
  const notes = [];
  if (nSug) notes.push((nOn ? nOn + ' of ' : '') + plural(nSug, 'optional sentence'));
  if (nGrp) notes.push('differentials and studies for ' + plural(nGrp, 'finding'));
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
  if (!$('work').classList.contains('has-pv') || window.innerWidth < 900) { pv.style.height = ''; return; }
  const work = $('work').getBoundingClientRect();
  const stick = parseFloat(getComputedStyle(pv).top) || 0;
  const top = Math.max(stick, work.top);
  const avail = Math.min(window.innerHeight - top - 16, work.bottom - top);
  pv.style.height = Math.max(240, avail) + 'px';
}
function queueFit() { if (!fitQueued) { fitQueued = true; requestAnimationFrame(fitPreview); } }
function wirePreview() { window.addEventListener('scroll', queueFit, { passive: true }); window.addEventListener('resize', queueFit); }
function measureSteps() { const n = $('steps'); if (n && n.offsetHeight) document.documentElement.style.setProperty('--steps-h', n.offsetHeight + 'px'); }

/* ---------------------------------------------------------------- theme */
const THEME_KEY = 'pft.theme.v1';
function applyTheme(t) {
  const root = document.documentElement;
  if (t === 'dark' || t === 'light') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
  const b = $('theme'); if (b) { const dark = (t === 'dark') || (t !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); b.textContent = dark ? 'Light theme' : 'Dark theme'; b.setAttribute('aria-pressed', String(dark)); }
}
function wireTheme() {
  const saved = prefGet(THEME_KEY);
  applyTheme(saved === 'dark' || saved === 'light' ? saved : '');
  const b = $('theme'); if (!b) return;
  b.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const dark = cur === 'dark' || (cur !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = dark ? 'light' : 'dark';
    prefSet(THEME_KEY, next); applyTheme(next);
  });
}

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
  wireTheme();
}
