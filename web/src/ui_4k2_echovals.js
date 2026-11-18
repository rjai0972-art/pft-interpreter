/* ========================================================================== Learn: echo, the introduction and the full study
   The introduction is six question cards and four probe movements, nothing else. The full-study pages each carry one tool:
   chamber sizes placed against their ranges, the diastolic algorithm, the valves with their calculators and criteria, and the
   venous Doppler traces. Entries are checked as they are typed and only the results are redrawn, so the caret stays where it
   is. Nothing typed is stored, and there is no field for a name. */
const EV = window.PFT_ECHOVALS;
const EVS = { ch: { raw: {}, sex: 'm' }, di: { raw: {}, mode: 'sinus', age: '' }, va: { id: 'as', raw: {}, mild: {}, severe: {}, wilkins: {} }, ve: { kind: 'pv', pv: 'normal', hv: 'normal' } };

/* ---- shared pieces ---- */
function evFill(el, kids) { const tmp = h('div', {}, kids); el.textContent = ''; while (tmp.firstChild) el.appendChild(tmp.firstChild); }
function evChip(cls, text) { return h('span', { class: 'ev-chip ' + cls, text: text }); }
function evField(F, raw, bad, onin) {
  const id = uid('ev');
  const inp = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', class: 'num', id: id, 'data-ev': F.k, value: raw[F.k] || '', placeholder: 'e.g. ' + F.eg, 'aria-describedby': id + 'm', 'aria-invalid': bad[F.k] ? 'true' : null,
    oninput: (e) => { raw[F.k] = e.target.value; onin(); } });
  return h('label', { class: 'nod-f hc-f ev-f', for: id, 'data-ev-f': F.k, 'data-state': bad[F.k] ? 'bad' : 'ok' }, [
    h('span', { class: 'nod-l' }, [F.label, F.unit ? h('span', { class: 'hc-unit', text: ' ' + F.unit }) : null]), inp, h('span', { class: 'hc-msg', id: id + 'm', 'data-ev-msg': F.k, text: bad[F.k] || '' })]);
}
function evSync(root, bad) {
  root.querySelectorAll('[data-ev-f]').forEach(el => {
    const k = el.getAttribute('data-ev-f'), m = bad[k] || '', msg = el.querySelector('[data-ev-msg]'), inp = el.querySelector('input');
    el.setAttribute('data-state', m ? 'bad' : 'ok'); if (msg) msg.textContent = m;
    if (inp) { if (m) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid'); }
  });
}
function evSeg(label, attr, list, cur, pick) {
  return h('div', { class: 'seg ev-seg', role: 'radiogroup', 'aria-label': label }, list.map(x => h('button', { type: 'button', class: 'ch', role: 'radio', 'aria-checked': String(x[0] === cur), [attr]: x[0], title: x[2] || null, text: x[1], onclick: () => pick(x[0]) })));
}
function evChecks(list) { return list && list.length ? h('ul', { class: 'hc-checks ev-checks', 'data-ev-checks': '1' }, list.map(q => h('li', { class: 'warn', text: q.t }))) : null; }
function evTools(onEx, onClear) {
  return h('div', { class: 'ev-tools' }, [
    h('button', { type: 'button', class: 'btn sm', 'data-ev-ex': '1', text: 'Load an example', onclick: onEx }),
    h('button', { type: 'button', class: 'btn sm quiet', 'data-ev-clear': '1', text: 'Clear', onclick: onClear }),
    h('span', { class: 'fine ev-priv', text: 'Nothing typed here is stored.' })]);
}
function evVisible(raw, keys) { const o = {}; keys.forEach(k => { if (raw[k] !== undefined) o[k] = raw[k]; }); return o; }

/* ================================================================== the introduction */
function evProbe(side) {            /* drawn about its footprint: the origin is where it meets the skin */
  const g = sv('g', { class: 'ev-probe' });
  if (side) { g.appendChild(sv('rect', { x: -5, y: -44, width: 10, height: 33, rx: 4 })); g.appendChild(sv('path', { d: 'M-5 -12 L5 -12 L6.5 0 L-6.5 0 Z' })); }
  else { g.appendChild(sv('rect', { x: -9, y: -44, width: 18, height: 33, rx: 5 })); g.appendChild(sv('path', { d: 'M-9.5 -12 L9.5 -12 L12 0 L-12 0 Z' })); g.appendChild(sv('circle', { cx: 9, cy: -37, r: 2.4, class: 'ev-mark' })); }
  return g;
}
function evUnit(side, x, rot, ghost) {
  const g = sv('g', { transform: 'translate(' + x + ' 56)' + (rot ? ' rotate(' + rot + ')' : ''), class: ghost ? 'ev-ghost' : 'ev-solid' });
  g.appendChild(side ? sv('path', { class: 'ev-beam-l', d: 'M0 2 V36' }) : sv('path', { class: 'ev-beam', d: 'M0 1 L-15 31 A34 34 0 0 0 15 31 Z' }));
  g.appendChild(evProbe(side)); return g;
}
function evHead(x, y, dx, dy) {
  const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, a = 7, b = 3.2, f = (n) => n.toFixed(1);
  return sv('path', { class: 'ev-ah', d: 'M' + f(x) + ' ' + f(y) + ' L' + f(x - ux * a - uy * b) + ' ' + f(y - uy * a + ux * b) + ' L' + f(x - ux * a + uy * b) + ' ' + f(y - uy * a - ux * b) + ' Z' });
}
function evCurve(s, x1, y1, cx, cy, x2, y2, both) {
  s.appendChild(sv('path', { class: 'ev-arrow', d: 'M' + x1 + ' ' + y1 + ' Q' + cx + ' ' + cy + ' ' + x2 + ' ' + y2 }));
  s.appendChild(evHead(x2, y2, x2 - cx, y2 - cy)); if (both) s.appendChild(evHead(x1, y1, x1 - cx, y1 - cy));
}
function evMoveSvg(id) {
  const s = sv('svg', { viewBox: '0 0 120 96', class: 'ev-move-svg', 'aria-hidden': 'true', focusable: 'false' });
  s.appendChild(sv('path', { class: 'ev-skin', d: 'M6 56 H114' }));
  if (id === 'slide') { s.appendChild(evUnit(false, 38, 0, true)); s.appendChild(evUnit(false, 82, 0)); evCurve(s, 44, 5, 60, 5, 76, 5); }
  else if (id === 'rotate') { s.appendChild(sv('path', { class: 'ev-arrow ev-back', d: 'M83 25 Q60 13 37 25' })); s.appendChild(evUnit(false, 60, 0)); evCurve(s, 37, 29, 60, 43, 83, 29); }
  else if (id === 'tilt') { s.appendChild(evUnit(true, 60, -24, true)); s.appendChild(evUnit(true, 60, 24)); evCurve(s, 47, 8, 60, 3, 73, 8, true); }
  else { s.appendChild(evUnit(false, 60, -17, true)); s.appendChild(evUnit(false, 60, 17)); evCurve(s, 49, 7, 60, 3, 71, 7, true); }
  return s;
}
function echoStartFig() {
  return h('div', { class: 'ev-fig ev-start', 'data-ev-start': '1' }, [
    h('h4', { class: 'ev-h', text: 'Six questions a focused scan answers' }),
    h('div', { class: 'ev-qs' }, EV.START.map(c => h('button', { type: 'button', class: 'ev-q', 'data-ev-q': c.id, onclick: () => setMode('learn', { topic: c.go }) }, [
      h('span', { class: 'ev-q-views', text: c.views }), h('span', { class: 'ev-q-q', text: c.q }), h('span', { class: 'ev-q-sign', text: c.sign }),
      h('span', { class: 'ev-q-foot' }, [h('span', { class: 'ev-q-n', text: c.number }), h('span', { class: 'ev-q-go', 'aria-hidden': 'true', text: '→' })])]))),
    h('h4', { class: 'ev-h', text: 'Four ways to move the probe' }),
    h('div', { class: 'ev-moves' }, EV.MOVES.map(m => h('div', { class: 'ev-move', 'data-ev-move': m.id }, [evMoveSvg(m.id),
      h('div', { class: 'ev-move-t' }, [h('b', {}, [m.name, m.id === 'tilt' ? h('span', { class: 'ev-tag', text: 'seen from the side' }) : null]), h('span', { text: m.say })])])))
  ]);
}

/* ================================================================== chamber sizes */
const EV_CH_GROUPS = [['body', 'Body size'], ['lv', 'Left ventricle'], ['atria', 'Atria'], ['rv', 'Right ventricle'], ['aorta', 'Aorta']];
const EV_CH_EX = { ht: '175', wt: '80', lvidd: '5.9', lvids: '4.2', ivs: '1.3', pw: '1.2', lavi: '44', raArea: '21', rvBasal: '45', aoSinus: '4.2' };
const EV_GCLS = { '-1': 'lo', 0: 'g0', 1: 'g1', 2: 'g2', 3: 'g3' };
const EV_GEO = [['conc_rem', 'Concentric remodelling', 15, 7.5], ['conc_hyp', 'Concentric hypertrophy', 19, 10], ['normal', 'Normal geometry', 15, 10.5], ['ecc_hyp', 'Eccentric hypertrophy', 19, 14.5]];
function evRangeLine(r) {
  if (r.kind !== 'graded') return 'Normal ' + r.normal;
  const G = EV.GRADED[r.id], dp = G ? G.dp : 1, p = r.parts, f = (v) => EV.fmt(v, dp);
  return 'Normal ' + r.normal + ' · mild to ' + f(p[2]) + ' · moderate to ' + f(p[3]) + ' · severe above ' + f(p[3]);
}
function evBar(r) {
  let a, b, segs;
  if (r.kind === 'graded') { const p = r.parts, lo = p[0], hi = p[1], step = (p[3] - p[2]) || (hi - (lo || 0)) * 0.2; a = lo === null ? 0 : lo - (hi - lo) * 0.3; b = p[3] + step * 1.6; segs = [[lo === null ? a : lo, hi, 'g0'], [hi, p[2], 'g1'], [p[2], p[3], 'g2'], [p[3], b, 'g3']]; }
  else if (r.kind === 'range') { const lo = r.parts[0], hi = r.parts[1], w = hi - (lo === null ? 0 : lo); a = lo === null ? 0 : lo - w * 0.4; b = hi + w * 0.8; segs = [[lo === null ? a : lo, hi, 'g0']]; }
  else { const lo = r.mean - 2 * r.sd, hi = r.upper, w = hi - lo; a = lo - w * 0.4; b = hi + w * 0.8; segs = [[lo, hi, 'g0']]; }
  a = Math.max(0, a); const pos = (v) => Math.max(0, Math.min(100, (v - a) / (b - a) * 100));
  return h('div', { class: 'ev-bar', 'aria-hidden': 'true' }, segs.map(g => h('span', { class: 'ev-bar-s ' + g[2], style: 'left:' + pos(g[0]).toFixed(1) + '%;width:' + (pos(g[1]) - pos(g[0])).toFixed(1) + '%' }))
    .concat([h('span', { class: 'ev-bar-m ' + (EV_GCLS[r.grade] || 'g0'), style: 'left:' + pos(r.value).toFixed(1) + '%' })]));
}
function evChRow(r) {
  return h('div', { class: 'ev-row', 'data-ev-row': r.id, 'data-grade': String(r.grade) }, [
    h('div', { class: 'ev-row-h' }, [h('span', { class: 'ev-name' }, [r.name, r.derived ? h('span', { class: 'ev-tag', text: 'calculated' }) : null]),
      h('span', { class: 'ev-val' }, [h('b', { text: r.text }), h('span', { class: 'hc-u', text: ' ' + r.unit })]), evChip(EV_GCLS[r.grade] || 'gn', r.word)]),
    evBar(r), h('div', { class: 'ev-meta', text: evRangeLine(r) }),
    r.indexed ? h('div', { class: 'ev-meta', text: 'Indexed to BSA: ' + r.indexed.text + ' ' + r.unit + '/m² (normal ' + r.indexed.normal + ')' + (r.indexed.grade ? ', above the upper limit' : '') }) : null,
    r.worked ? h('div', { class: 'ev-worked', text: r.worked }) : null]);
}
function evGeom(res) {
  const cur = res.geometry ? res.geometry.id : '', lim = res.sex === 'f' ? 95 : 115, num = (v) => typeof v === 'number';
  const ring = (R, r) => { const s = sv('svg', { viewBox: '0 0 44 44', class: 'ev-ring', 'aria-hidden': 'true', focusable: 'false' }); s.appendChild(sv('circle', { cx: 22, cy: 22, r: R, class: 'ev-ring-w' })); s.appendChild(sv('circle', { cx: 22, cy: 22, r: r, class: 'ev-ring-c' })); return s; };
  const say = res.geometry ? res.geometry.label + ': relative wall thickness ' + EV.fmt(res.rwt, 2) + ', LV mass index ' + EV.fmt(res.lvmi, 0) + ' g/m². ' + res.geometry.say
    : num(res.rwt) ? 'Relative wall thickness ' + EV.fmt(res.rwt, 2) + '. Add the septum, height and weight for the mass index, and the ventricle takes its place in the grid.'
    : 'Relative wall thickness = 2 × posterior wall ÷ LVIDd. With LVIDd, both walls, height and weight the ventricle takes its place in the grid.';
  return h('div', { class: 'ev-geo', 'data-ev-geo': cur }, [
    h('h5', { class: 'ev-h5', text: 'LV geometry' }),
    h('div', { class: 'ev-geo-box' }, [
      h('div', { class: 'ev-geo-y', 'aria-hidden': 'true' }, [h('span', { text: 'RWT > 0.42' }), h('span', { text: 'RWT ≤ 0.42' })]),
      h('div', { class: 'ev-geo-grid' }, EV_GEO.map(g => h('div', { class: 'ev-geo-c' + (g[0] === cur ? ' on' : ''), 'data-ev-geo-c': g[0], 'aria-current': g[0] === cur ? 'true' : null }, [ring(g[2], g[3]), h('span', { text: g[1] })]))),
      h('div', { class: 'ev-geo-x', 'aria-hidden': 'true' }, [h('span', { text: 'Mass index ≤ ' + lim + ' g/m²' }), h('span', { text: '> ' + lim + ' g/m²' })])]),
    h('p', { class: 'ev-say', 'data-ev-geo-say': '1', text: say })]);
}
function evChOut(res) {
  const out = [evChecks(res.checks)], num = (v) => typeof v === 'number';
  if (!res.rows.length) out.push(h('p', { class: 'hc-empty ev-say', 'data-ev-empty': '1', text: 'Type any measurement. Each is placed against the range for ' + (res.sex === 'f' ? 'women' : 'men') + ' as you type; height and weight add the indexed values and the LV mass index.' }));
  else {
    const facts = []; if (num(res.bsa)) facts.push('BSA ' + EV.fmt(res.bsa, 2) + ' m²'); if (num(res.rwt)) facts.push('relative wall thickness ' + EV.fmt(res.rwt, 2)); if (num(res.fs)) facts.push('fractional shortening ' + EV.fmt(res.fs, 0) + '%');
    if (facts.length) out.push(h('p', { class: 'ev-facts', 'data-ev-facts': '1', text: facts.join(' · ') }));
    EV_CH_GROUPS.slice(1).forEach(g => { const rows = res.rows.filter(r => r.group === g[0]); if (rows.length) out.push(h('div', { class: 'hc-group ev-group', 'data-ev-group': g[0] }, [h('h5', { text: g[1] })].concat(rows.map(evChRow)))); });
  }
  out.push(evGeom(res)); return out;
}
function echoChamberFig() {
  const S = EVS.ch, run = () => EV.chambers(S.raw, S.sex); let res = run();
  const out = h('div', { class: 'ev-out', 'data-ev-chout': '1', 'aria-live': 'polite' }, evChOut(res));
  const root = h('div', { class: 'ev-fig', 'data-ev-chambers': S.sex }, []);
  const refresh = () => { res = run(); evFill(out, evChOut(res)); evSync(root, res.bad); };
  const sets = []; EV_CH_GROUPS.forEach(g => { sets.push(h('h5', { text: g[1] })); if (g[0] === 'body') sets.push(evSeg('Sex', 'data-ev-sex', [['m', 'Men'], ['f', 'Women']], S.sex, (k) => { S.sex = k; render(); })); sets.push(h('div', { class: 'hc-fields' }, EV.CH_FIELDS.filter(F => F.group === g[0]).map(F => evField(F, S.raw, res.bad, refresh)))); });
  evFill(root, [h('div', { class: 'ev-main' }, [
    h('div', { class: 'hc-in deck ev-in', 'data-ev-in': '1' }, [evTools(() => { S.raw = Object.assign({}, EV_CH_EX); S.sex = 'm'; render(); }, () => { S.raw = {}; render(); })].concat(sets)), out])]);
  return root;
}

/* ================================================================== diastolic function */
const EV_DI_SETS = {
  sinus: [['The three variables', ['es', 'el', 'E', 'A', 'tr', 'pasp']], ['Second tier, when they disagree', ['svd', 'lars', 'lavi', 'ivrt']]],
  af: [['The four variables', ['E', 'es', 'tr', 'pasp', 'dt']], ['Second step, when two are positive', ['lars', 'svd', 'bmi']]],
  mac: [['Mitral inflow', ['E', 'A', 'ivrt']]] };
const EV_DI_EX = { sinus: { es: '5', el: '7.5', E: '95', A: '68', tr: '3.1' }, af: { E: '110', es: '7', tr: '3.0', dt: '150' }, mac: { E: '100', A: '80', ivrt: '70' } };
function evDiOut(res) {
  const out = [evChecks(res.checks)], cls = res.lap === 'increased' ? 'v2' : res.lap === 'normal' ? 'v0' : res.lap === 'indeterminate' ? 'v1' : 'vn';
  const lapWord = (o) => (o.lap === 'increased' ? 'increased LA pressure' : o.lap === 'normal' ? 'normal LA pressure' : 'not determined without a second-tier marker') + (o.grade ? ' (grade ' + o.grade + ')' : '');
  const need = res.need && res.need.length ? 'Still needed: ' + res.need.join('; ') + '.' : '';
  if (res.label) out.push(h('div', { class: 'ev-verdict ' + cls, 'data-ev-verdict': res.lap || '' }, [h('b', { text: res.label }), res.via ? h('span', { text: 'By: ' + res.via + '.' }) : null, need ? h('span', { text: need }) : null]));
  else if (res.depends) out.push(h('div', { class: 'ev-verdict v1', 'data-ev-verdict': 'depends' }, [h('b', { text: 'It turns on the TR velocity' }), h('span', { text: 'Under 2.8 m/s: ' + lapWord(res.depends.low) + '. At 2.8 m/s or more: ' + lapWord(res.depends.high) + '.' }), need ? h('span', { text: need }) : null]));
  else out.push(h('div', { class: 'ev-verdict vn', 'data-ev-verdict': '' }, [h('b', { text: 'Not enough to say yet' }), need ? h('span', { text: need }) : null]));
  out.push(h('div', { class: 'ev-vars' }, res.vars.map(v => h('div', { class: 'ev-var ' + (v.abnormal === true ? 'on' : v.abnormal === false ? 'off' : 'na'), 'data-ev-var': v.k, 'data-abn': String(v.abnormal) }, [
    h('span', { class: 'ev-var-n', text: v.name }), h('b', { text: v.word }), v.value ? h('span', { class: 'ev-var-v', text: v.value }) : null, h('span', { class: 'ev-var-r', text: v.rule })]))));
  if (res.sec && res.sec.length) out.push(h('div', { class: 'ev-sec', 'data-ev-sec': '1' }, [h('span', { class: 'ev-lbl', text: res.mode === 'af' ? 'Second step' : 'Second tier' })].concat(res.sec.map(q => evChip(q.present ? 'g3' : 'g0', q.name + ' ' + q.value + (q.present ? ': meets ' : ': does not meet ') + q.rule)))));
  if (res.path && res.path.length) { out.push(h('h5', { class: 'ev-h5', text: 'How it got there' })); out.push(h('ol', { class: 'ev-path', 'data-ev-path': '1' }, res.path.map(t => h('li', { text: t })))); }
  if (res.notes && res.notes.length) out.push(h('ul', { class: 'ev-notes' }, res.notes.map(t => h('li', { text: t }))));
  return out;
}
function echoDiastFig() {
  const S = EVS.di, sets = EV_DI_SETS[S.mode], keys = [].concat.apply([], sets.map(g => g[1])), byK = {}; EV.DI_FIELDS.forEach(F => { byK[F.k] = F; });
  const run = () => EV.diast(evVisible(S.raw, keys), { mode: S.mode, age: S.mode === 'sinus' ? S.age : '' }); let res = run();
  const out = h('div', { class: 'ev-out', 'data-ev-dout': S.mode, 'aria-live': 'polite' }, evDiOut(res));
  const root = h('div', { class: 'ev-fig', 'data-ev-diast': S.mode }, []);
  const refresh = () => { res = run(); evFill(out, evDiOut(res)); evSync(root, res.bad); };
  const ages = [['', 'Fixed cut-offs']].concat(Object.keys(EV.E_PRIME_AGE).map(k => [k, EV.E_PRIME_AGE[k].label]));
  const kids = [evTools(() => { S.raw = Object.assign({}, EV_DI_EX[S.mode]); render(); }, () => { S.raw = {}; render(); })];
  sets.forEach(g => { kids.push(h('h5', { text: g[0] })); kids.push(h('div', { class: 'hc-fields' }, g[1].map(k => evField(byK[k], S.raw, res.bad, refresh)))); });
  if (S.mode === 'sinus') { kids.push(h('h5', { text: 'Lower limit of e′ by age' })); kids.push(evSeg('Lower limit of e′ by age', 'data-ev-age', ages, S.age, (k) => { S.age = k; render(); })); }
  evFill(root, [
    evSeg('Which algorithm', 'data-ev-mode', [['sinus', 'Sinus rhythm'], ['af', 'Atrial fibrillation'], ['mac', 'Annular calcification']], S.mode, (k) => { S.mode = k; render(); }),
    h('div', { class: 'ev-main' }, [h('div', { class: 'hc-in deck ev-in', 'data-ev-in': '1' }, kids), out])]);
  return root;
}

/* ================================================================== the valves */
const EV_VA_SETS = {
  as: [['The jet', ['vmax', 'mg']], ['Continuity', ['lvotD', 'lvotVti', 'avVti']], ['Flow and body size', ['ef', 'ht', 'wt', 'aoD']]],
  ar: [['PISA', ['r', 'va', 'vp', 'vti']], ['LVOT, for the fraction', ['lvotD', 'lvotVti']]],
  ms: [['Doppler', ['pht', 'mg', 'pasp']], ['Continuity', ['lvotD', 'lvotVti', 'mvVti']], ['PISA', ['r', 'va', 'vp', 'alpha']]],
  mr: [['PISA', ['r', 'va', 'vp', 'vti']], ['LVOT, for the fraction', ['lvotD', 'lvotVti']]],
  tr: [['Regurgitation', ['vcw', 'r', 'va', 'vp', 'vti', 'rap']], ['Inflow, for stenosis', ['tsMg', 'tsPht', 'tsVti']]],
  pr: [['The jet', ['prDur', 'diaDur', 'pht', 'jw', 'ann']], ['Stroke volumes, for the fraction', ['rvotD', 'rvotVti', 'lvotD', 'lvotVti']]] };
const EV_VA_EX = {
  as: { vmax: '3.4', mg: '28', lvotD: '2.0', lvotVti: '14', avVti: '62', ef: '60', ht: '175', wt: '80' },
  ar: { r: '0.7', va: '38', vp: '4.5', vti: '190', lvotD: '2.2', lvotVti: '30' },
  ms: { pht: '180', mg: '8', pasp: '42', lvotD: '2.0', lvotVti: '20', mvVti: '50' },
  mr: { r: '1.0', va: '38', vp: '5.0', vti: '150', lvotD: '2.0', lvotVti: '16' },
  tr: { vcw: '0.8', r: '1.0', va: '28', vp: '2.2', vti: '80', rap: '15' },
  pr: { prDur: '250', diaDur: '450', pht: '90', jw: '1.8', ann: '2.4', rvotD: '2.8', rvotVti: '24', lvotD: '2.0', lvotVti: '20' } };
function evVaRow(id, o) {
  const four = (id === 'ar' || id === 'mr') && (o.k === 'eroa' || o.k === 'rvol' || o.k === 'rf'), graded = typeof o.grade === 'number';
  const cls = graded ? ((four ? ['gn', 'g1', 'g2', 'g3'] : ['gn', 'g1', 'g3'])[o.grade] || 'gn') : o.hit === true ? 'g3' : 'gn';
  return h('div', { class: 'ev-row', 'data-ev-out': o.k }, [
    h('div', { class: 'ev-row-h' }, [h('span', { class: 'ev-name', text: o.name }), h('span', { class: 'ev-val' }, [h('b', { text: o.text }), o.unit ? h('span', { class: 'hc-u', text: ' ' + o.unit }) : null]), o.word ? evChip(cls, o.word) : null]),
    o.worked ? h('div', { class: 'ev-worked', text: o.worked }) : null]);
}
function evVaOut(id, res) {
  const out = [evChecks(res.checks)], cls = res.sev === 2 ? 'v2' : res.sev === 1 ? 'v1' : res.sev === 0 ? 'v0' : 'vi';
  const need = res.need && res.need.length ? 'Enter ' + res.need.join('; ') + '.' : '';
  out.push(h('div', { class: 'ev-verdict ' + (res.verdict ? cls : 'vn'), 'data-ev-verdict': res.verdict ? String(res.sev) : '' }, [h('b', { text: res.verdict || 'Nothing to grade yet' }), need ? h('span', { text: need }) : null]));
  if (res.out.length) out.push(h('div', { class: 'hc-group ev-group', 'data-ev-outs': id }, [h('h5', { text: 'The numbers' })].concat(res.out.map(o => evVaRow(id, o)))));
  if (res.steps && res.steps.length) { out.push(h('h5', { class: 'ev-h5', text: 'The reading, step by step' })); out.push(h('ol', { class: 'ev-path', 'data-ev-steps': '1' }, res.steps.map(t => h('li', { text: t })))); }
  if (res.notes && res.notes.length) out.push(h('ul', { class: 'ev-notes', 'data-ev-notes': '1' }, res.notes.map(t => h('li', { text: t }))));
  return out;
}
function echoValveFig() {
  const S = EVS.va, id = S.id, W = EV.VALVES[id], raw = S.raw[id] || (S.raw[id] = {}), mild = S.mild[id] || (S.mild[id] = []), severe = S.severe[id] || (S.severe[id] = []), byK = {}; W.fields.forEach(F => { byK[F.k] = F; });
  const run = () => EV.valve(id, raw, { mild: mild, severe: severe, wilkins: S.wilkins }); let res = run();
  const out = h('div', { class: 'ev-out', 'data-ev-vout': id, 'aria-live': 'polite' }, evVaOut(id, res));
  const root = h('div', { class: 'ev-fig', 'data-ev-valves': id }, []);
  const refresh = () => { res = run(); evFill(out, evVaOut(id, res)); evSync(root, res.bad); };
  const kids = [evTools(() => { S.raw[id] = Object.assign({}, EV_VA_EX[id]); render(); }, () => { S.raw[id] = {}; S.mild[id] = []; S.severe[id] = []; if (id === 'ms') S.wilkins = {}; render(); })];
  EV_VA_SETS[id].forEach(g => { kids.push(h('h5', { text: g[0] })); kids.push(h('div', { class: 'hc-fields' }, g[1].map(k => evField(byK[k], raw, res.bad, refresh)))); });
  const ticks = (name, list, arr) => h('fieldset', { class: 'ev-ticks', 'data-ev-ticks': name }, [h('legend', { text: name === 'mild' ? 'Specific for mild' : 'Specific for severe' })].concat(list.map((t, i) => {
    const cid = uid('evt'); return h('label', { class: 'chk ev-tick', for: cid }, [h('input', { type: 'checkbox', id: cid, checked: !!arr[i], 'data-ev-tick': name + i, onchange: (e) => { arr[i] = e.target.checked; refresh(); } }), h('span', { text: t })]); })));
  if (W.mild) { kids.push(h('h5', { text: 'Specific criteria (four or more settle it)' })); kids.push(h('div', { class: 'ev-tickbox' }, [ticks('mild', W.mild, mild), ticks('severe', W.severe, severe)])); }
  if (W.wilkins) {
    kids.push(h('h5', { text: 'Wilkins score, before a balloon valvotomy' }));
    kids.push(h('div', { class: 'ev-wilkins', 'data-ev-wilkins': '1' }, W.wilkins.map(q => { const sid = uid('evw');
      return h('label', { class: 'nod-f', for: sid }, [h('span', { class: 'nod-l', text: q.name }), h('select', { id: sid, 'data-ev-wil': q.k, onchange: (e) => { if (e.target.value) S.wilkins[q.k] = Number(e.target.value); else delete S.wilkins[q.k]; refresh(); } },
        [h('option', { value: '', text: 'Not scored' })].concat(q.steps.map((t, i) => h('option', { value: String(i + 1), text: (i + 1) + ' · ' + t, selected: S.wilkins[q.k] === i + 1 }))))]); })));
  }
  evFill(root, [
    evSeg('Which valve lesion', 'data-ev-valve', EV.VALVE_ORDER.map(k => [k, EV.VALVES[k].short, EV.VALVES[k].title]), id, (k) => { S.id = k; render(); }),
    h('h4', { class: 'ev-title', 'data-ev-vtitle': '1', text: W.title }),
    h('div', { class: 'ev-main' }, [h('div', { class: 'hc-in deck ev-in', 'data-ev-in': '1' }, kids), out]),
    eduFold('ev-' + id + '-table', 'Grading table', [eduTable(W.table), W.mech ? h('ul', { class: 'ev-mech' }, W.mech.map(m => h('li', {}, [h('b', { text: m[0] + '. ' }), m[1]]))) : null], true),
    eduFold('ev-' + id + '-cav', 'Before you trust the number (' + W.caveats.length + ')', [h('ul', { class: 'ev-cav' }, W.caveats.map(t => h('li', { text: t })))], false)]);
  return root;
}

/* ================================================================== venous Doppler */
function evVeinDraw(cv, kind, id) {
  if (!cv.isConnected) return;
  const cw = Math.max(280, Math.round(cv.clientWidth || 920)), narrow = cw < 560, dur = narrow ? 3.6 : 6, Hc = narrow ? 290 : 340, dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(cw * dpr); cv.height = Math.round(Hc * dpr);
  const s = EV.veinSeries(kind, id, { dur: dur }), ctx = cv.getContext('2d'), fs = s.fs, n = s.v.length;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const padL = 38, padR = 8, pw = cw - padL - padR, X = (t) => padL + t / dur * pw;
  const eH = 54, rH = s.hasResp ? 40 : 0, dTop = eH + rH + 6, dBot = Hc - 8, sign = kind === 'pv' ? 1 : -1, uMax = kind === 'pv' ? 92 : 64, uMin = kind === 'pv' ? -58 : -72;
  const Y = (u) => dTop + (uMax - u) / (uMax - uMin) * (dBot - dTop), at = (t) => { const i = Math.max(0, Math.min(n - 1, Math.round(t * fs))); return s.v[i] * sign; };
  ctx.fillStyle = '#0b1620'; ctx.fillRect(0, 0, cw, Hc);
  ctx.lineWidth = 1;
  for (let k = 0; k * 0.2 <= dur + 1e-6; k++) { ctx.strokeStyle = k % 5 === 0 ? '#1c3a4c' : '#12283a'; ctx.beginPath(); ctx.moveTo(X(k * 0.2), 0); ctx.lineTo(X(k * 0.2), Hc); ctx.stroke(); }
  ctx.strokeStyle = '#1f3a4c'; (rH ? [eH, eH + rH] : [eH]).forEach(y => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke(); });
  /* the velocity scale: toward the probe is up */
  ctx.font = '10px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
  /* inspiration shaded through the breath and Doppler lanes, when the pattern turns on it */
  if (s.hasResp) {
    let t0 = null; const spans = [];
    for (let i = 0; i <= n; i++) { const on = i < n && s.resp[i] > 0.12; if (on && t0 === null) t0 = i / fs; if (!on && t0 !== null) { spans.push([t0, Math.min(dur, i / fs)]); t0 = null; } }
    ctx.textAlign = 'left'; ctx.font = '10px system-ui, sans-serif';
    spans.forEach(sp => { ctx.fillStyle = 'rgba(120, 190, 255, 0.08)'; ctx.fillRect(X(sp[0]), eH, X(sp[1]) - X(sp[0]), Hc - eH); });
    let prev = 0; spans.concat([[dur, dur]]).forEach(sp => { ctx.fillStyle = '#8fd0ff'; if (X(sp[1]) - X(sp[0]) > 62) ctx.fillText('inspiration', X(sp[0]) + 4, dBot - 2); ctx.fillStyle = '#8fa7b8'; if (X(sp[0]) - X(prev) > 62) ctx.fillText('expiration', X(prev) + 4, dBot - 2); prev = sp[1]; });
    ctx.textAlign = 'right';
  }
  for (let u = Math.ceil(uMin / 20) * 20; u <= uMax; u += 20) { if (Y(u) < dTop + 16 || Y(u) > dBot - 12) continue; ctx.strokeStyle = u === 0 ? '#6f8a9c' : '#173244'; ctx.beginPath(); ctx.moveTo(padL, Y(u)); ctx.lineTo(cw - padR, Y(u)); ctx.stroke(); ctx.fillStyle = '#8fa7b8'; ctx.fillText(String(u), padL - 5, Y(u)); }
  /* the spectral envelope: a filled band, brightest at its edge */
  const y0 = Y(0);
  for (let px = 0; px <= pw; px++) {
    const u = at(px / pw * dur), ye = Y(u), x = padL + px;
    if (Math.abs(ye - y0) < 1) continue;
    const band = (f0, f1, alpha) => { ctx.strokeStyle = 'rgba(226, 236, 242, ' + alpha + ')'; ctx.beginPath(); ctx.moveTo(x + 0.5, y0 + (ye - y0) * f0); ctx.lineTo(x + 0.5, y0 + (ye - y0) * f1); ctx.stroke(); };
    band(0, 0.5, 0.12); band(0.5, 0.82, 0.3); band(0.82, 1, 0.62);
  }
  ctx.strokeStyle = '#f2f6f9'; ctx.lineWidth = 1.4; ctx.beginPath();
  for (let px = 0; px <= pw; px++) { const ye = Y(at(px / pw * dur)); if (px) ctx.lineTo(padL + px, ye); else ctx.moveTo(padL + px, ye); }
  ctx.stroke();
  /* the ECG, and the breath when the pattern turns on it */
  const lane = (arr, top, hgt, lo, hi, color) => { ctx.strokeStyle = color; ctx.lineWidth = 1.3; ctx.beginPath(); for (let px = 0; px <= pw; px++) { const i = Math.max(0, Math.min(n - 1, Math.round(px / pw * dur * fs))), y = top + hgt - 5 - (Math.max(lo, Math.min(hi, arr[i])) - lo) / (hi - lo) * (hgt - 11); if (px) ctx.lineTo(padL + px, y); else ctx.moveTo(padL + px, y); } ctx.stroke(); };
  lane(s.ecg, 0, eH, -0.35, 1.25, '#7fe08a');
  if (s.hasResp) lane(s.resp, eH, rH, -0.1, 1.1, '#8fd0ff');
  ctx.textAlign = 'left'; ctx.fillStyle = '#8fa7b8'; ctx.fillText('ECG', 6, 12); if (s.hasResp) ctx.fillText('Breath', 4, eH + 11); ctx.fillText('cm/s', 6, dTop + 6);
  /* name the waves on the beats that fit */
  ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd28a';
  const put = (t, text) => { if (t < 0.05 || t > dur - 0.05) return; const u = at(t), y = Y(u) + (u >= 0 ? -9 : 10); ctx.fillText(text, X(t), Math.max(dTop + 8, Math.min(dBot - (s.hasResp ? 16 : 6), y))); };
  s.marks.forEach(m => {
    const uS = at(m.sC), uD = at(m.dC), uA = at(m.aC), back = (u) => (kind === 'pv' ? u < -5 : u > 5);
    if (Math.abs(uS) > 5) put(m.sC, back(uS) ? 'S rev' : 'S');
    if (Math.abs(uD) > 5) put(m.dC, 'D');
    if (back(uA)) put(m.aC, kind === 'pv' ? 'Ar' : 'A');
    if (kind === 'hv' && m.drC !== undefined && at(m.drC) > 9 && Math.abs(m.drC - m.aC) > 0.07) put(m.drC, 'DR');
  });
}
function echoVeinFig() {
  const S = EVS.ve, pv = S.kind === 'pv', list = pv ? EV.PV : EV.HV, pat = list.filter(p => p.id === S[S.kind])[0] || list[0], pk = EV.veinSeries(S.kind, pat.id, { dur: 6 }).peaks, f0 = (v) => EV.fmt(v, 0);
  const cv = h('canvas', { class: 'ln-cv ev-cv', width: 920, height: 340, role: 'img', 'data-ev-veincv': S.kind + ':' + pat.id, 'aria-label': (pv ? 'Pulmonary' : 'Hepatic') + ' vein Doppler under the ECG, ' + pat.label + '. ' + pat.look });
  setTimeout(() => evVeinDraw(cv, S.kind, pat.id), 0);
  const tile = (k, v, u, cls) => h('div', { class: 'ev-tile' + (cls ? ' ' + cls : ''), 'data-ev-tile': k }, [h('span', { class: 'ev-tile-k', text: k }), h('b', { text: v }), h('span', { class: 'ev-tile-u', text: u || '' })]);
  const tiles = [];
  if (pk.sReversed) tiles.push(tile('Systolic reversal', f0(pk.sRev), 'cm/s', 'on')); else tiles.push(tile('S', f0(pk.S), 'cm/s'));
  tiles.push(tile('D', f0(pk.D), 'cm/s'));
  if (!pk.sReversed) { tiles.push(tile('S/D', EV.fmt(pk.sd, 2), pv ? 'raised LA pressure at 0.67 or less' : 'under 1: blunted', (pv ? pk.sd <= 0.67 : pk.sd < 1) ? 'on' : '')); tiles.push(tile('Systolic fraction', f0(pk.sff) + '%', pv ? 'low at 40% or less' : 'low under 55%', (pv ? pk.sff <= 40 : pk.sff < 55) ? 'on' : '')); }
  tiles.push(tile(pv ? 'Ar' : 'A reversal', pk.A > 0 ? f0(pk.A) : 'none', pk.A > 0 ? 'cm/s' : 'no atrial contraction', pv && pk.A > 35 ? 'on' : ''));
  if (typeof pk.drRatio === 'number') tiles.push(tile('Expiratory reversal ÷ forward', EV.fmt(pk.drRatio, 2), 'constriction at 0.8 or more', pk.drRatio >= 0.8 ? 'on' : ''));
  return h('div', { class: 'ev-fig', 'data-ev-veins': S.kind + ':' + pat.id }, [
    evSeg('Which vein', 'data-ev-vein', [['pv', 'Pulmonary vein'], ['hv', 'Hepatic vein']], S.kind, (k) => { S.kind = k; render(); }),
    evSeg('Pattern', 'data-ev-pat', list.map(p => [p.id, p.label]), pat.id, (k) => { S[S.kind] = k; render(); }),
    cv,
    h('div', { class: 'ev-tiles' }, tiles),
    h('div', { class: 'ev-text', 'data-ev-text': '1' }, [h('p', {}, [h('b', { text: 'Look for. ' }), pat.look]), h('p', {}, [h('b', { text: 'Why. ' }), pat.means]), h('p', {}, [h('b', { text: 'At the bedside. ' }), pat.use])]),
    h('p', { class: 'fine', text: 'Drawn from a model, not recorded. Flow toward the probe is above the baseline: pulmonary venous flow enters the atrium toward an apical probe, and hepatic venous flow leaves a subcostal probe, so its forward waves point down.' })]);
}
