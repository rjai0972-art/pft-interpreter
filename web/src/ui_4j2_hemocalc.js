/* ========================================================================== Learn: the hemos calculator
   The sheet a unit keeps for its catheterised patients, as a page: the chart's ten inputs in the chart's order on the left,
   the results on the right (the chart's seven first, by the chart's formulas, then the rest), each with a bar against its
   normal range, the band an assumed VO2 puts around it, and what the number cannot tell you. Entries are checked as they are
   typed; only the results panel is redrawn, so the caret stays where it is. Nothing is stored. */
const HC = window.PFT_HEMOCALC;
const HCS = { raw: {}, opt: { vo2: 'kg', sex: '', venous: 'cv', co: 'fick', ctx: {} }, prev: null, open: {}, all: false, more: false, ex: null, res: null };
function hcCompute() { HCS.res = HC.compute(HCS.raw, HCS.opt); return HCS.res; }
function hcReset() { HCS.raw = {}; HCS.opt = { vo2: 'kg', sex: '', venous: 'cv', co: 'fick', ctx: {} }; HCS.prev = null; HCS.ex = null; HCS.open = {}; HCS.more = false; }
function hcLoad(L) {
  hcReset();
  HCS.raw = Object.assign({}, L.raw); HCS.opt.venous = L.venous || 'mv'; HCS.opt.ctx = Object.assign({}, L.ctx || {}); HCS.ex = L; HCS.more = true;
}
function hcLoadExample(id) { const L = HC.example(id); if (L) hcLoad(L); }
/* the Swan–Ganz lab's current patient, typed into the sheet */
function hcFromLab() {
  const L = HC.fromLab(HMS.out);
  L.venous = 'mv'; L.id = 'lab'; L.title = (HMS.title || 'The lab patient') + ' (from the Swan–Ganz lab)'; L.say = 'The numbers on the lab’s monitor, as they would be copied onto the sheet.'; L.truth.svo2 = Math.round(HMS.out.svo2 * 100); L.truth.bsa = HMS.out.p.bsa;
  hcLoad(L);
}

/* ---- the entries ---- */
function hcField(F) {
  const id = uid('hc'), st = HCS.res.fields[F.k];
  const inp = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', class: 'num', id: id, 'data-hc': F.k, value: HCS.raw[F.k] || '', placeholder: 'e.g. ' + F.eg, 'aria-describedby': id + 'm', 'aria-invalid': st.state === 'bad' ? 'true' : null,
    oninput: (e) => { HCS.raw[F.k] = e.target.value; if (HCS.ex) { HCS.ex = null; const sel = document.querySelector('[data-hc-example]'); if (sel) sel.value = ''; } hcRefresh(); } });
  return h('label', { class: 'nod-f hc-f', for: id, 'data-hc-f': F.k, 'data-state': st.state, title: F.unlocks ? 'Opens: ' + F.unlocks : null }, [
    h('span', { class: 'nod-l' }, [F.label, h('span', { class: 'hc-unit', text: ' ' + F.unit })]), inp, h('span', { class: 'hc-msg', id: id + 'm', 'data-hc-msg': F.k, text: st.msg })]);
}
function hcSeg(label, name, list, cur, pick) {
  return h('div', { class: 'seg hc-seg', role: 'radiogroup', 'aria-label': label }, list.map(x => h('button', { type: 'button', class: 'ch', role: 'radio', 'aria-checked': String(x[0] === cur), ['data-hc-' + name]: x[0], onclick: () => pick(x[0]) }, [x[1], x[2] ? h('span', { class: 'hc-sub', text: ' ' + x[2] }) : null])));
}
function hcInputs() {
  const o = HCS.opt, chart = HC.FIELDS.filter(F => F.set === 'chart'), more = HC.FIELDS.filter(F => F.set === 'more');
  const det = h('details', { class: 'hc-more', 'data-hc-more': '1', ontoggle: (e) => { HCS.more = e.target.open; } }, [
    h('summary', { text: 'More inputs (optional)' }),
    h('p', { class: 'fine hc-p', text: 'Heart rate opens the per-beat numbers; a blood pressure the pulse indices; the rest let a measurement stand in for an assumption.' }),
    h('div', { class: 'hc-fields' }, more.map(hcField)),
    h('span', { class: 'nod-l hc-lab', text: 'Sex (for LaFarge)' }), hcSeg('Sex', 'sex', [['m', 'Male'], ['f', 'Female']], o.sex, (k) => { o.sex = o.sex === k ? '' : k; render(); }),
    h('span', { class: 'nod-l hc-lab', text: 'Derive the other numbers from' }), hcSeg('Output used', 'co', [['fick', 'The Fick'], ['td', 'Thermodilution', 'if typed']], o.co, (k) => { o.co = k; render(); })
  ]);
  if (HCS.more) det.setAttribute('open', '');
  return h('div', { class: 'hc-in deck', 'data-hc-in': '1' }, [
    h('h5', { text: 'From the chart' }),
    h('div', { class: 'hc-fields' }, chart.map(hcField)),
    h('h5', { text: 'Venous sample from' }),
    hcSeg('Venous sample', 'venous', [['cv', 'Central line', 'ScvO2'], ['mv', 'PA catheter', 'SvO2']], o.venous, (k) => { o.venous = k; render(); }),
    h('h5', { text: 'Oxygen consumption' }),
    hcSeg('Oxygen consumption', 'vo2', HC.VO2_METHODS, o.vo2, (k) => { o.vo2 = k; if (k === 'lafarge' || k === 'measured') HCS.more = true; render(); }),
    det,
    h('h5', { text: 'Circumstances' }),
    h('div', { class: 'seg hc-seg', role: 'group', 'aria-label': 'Circumstances' }, HC.CONTEXT.map(c => h('button', { type: 'button', class: 'ch', role: 'checkbox', 'aria-checked': String(!!o.ctx[c[0]]), 'data-hc-ctx': c[0], text: c[1], onclick: () => { o.ctx[c[0]] = !o.ctx[c[0]]; render(); } }))),
    h('p', { class: 'fine hc-p', text: 'Each one adds what it does to the numbers it affects.' })
  ]);
}

/* ---- one result ---- */
function hcGauge(r) {
  const g = r.gauge; if (!g || r.value === null) return null;
  const a = g[0], b = g[3], pos = (v) => Math.max(0, Math.min(100, (v - a) / (b - a) * 100));
  const l = pos(g[1] === null ? a : g[1]), rr = pos(g[2] === null ? b : g[2]);
  const kids = [h('span', { class: 'hc-band', style: 'left:' + l.toFixed(1) + '%;width:' + (rr - l).toFixed(1) + '%' })];
  if (r.range) kids.push(h('span', { class: 'hc-rng', 'data-hc-rng': r.id, style: 'left:' + pos(r.range.lo).toFixed(1) + '%;width:' + Math.max(1, pos(r.range.hi) - pos(r.range.lo)).toFixed(1) + '%' }));
  kids.push(h('span', { class: 'hc-mark' + (r.sev === 2 ? ' s2' : r.sev === 1 ? ' s1' : ''), style: 'left:' + pos(r.value).toFixed(1) + '%' }));
  const tk = (v) => String(+v.toFixed(2)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (g[1] !== null && g[1] > a) kids.push(h('span', { class: 'hc-tick', style: 'left:' + l.toFixed(1) + '%', text: tk(g[1]) }));
  if (g[2] !== null && g[2] < b) kids.push(h('span', { class: 'hc-tick', style: 'left:' + rr.toFixed(1) + '%', text: tk(g[2]) }));
  return h('div', { class: 'hc-gauge', role: 'img', 'data-hc-gauge': r.id, 'aria-label': r.name + ' ' + r.text + (r.unit ? ' ' + r.unit : '') + (r.normal ? '; normal ' + r.normal : '') + (r.range ? '; ' + r.range.text + ' ' + r.range.basis : '') }, kids);
}
const HC_CHIP = { ok: 'in range', low: 'low', high: 'high', na: 'not interpretable' };
const hcLow = (t) => /^[A-Z][a-z]+(\s|$)/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;   // "Weight" → "weight"; "ScvO2", "PA systolic", "CVP" stay
function hcRow(r, dd) {
  const open = HCS.all || !!HCS.open[r.id], has = r.value !== null, d = dd && dd[r.id];
  const chip = has && HC_CHIP[r.st] ? h('span', { class: 'hc-chip ' + (r.st === 'ok' ? 'ok' : r.st === 'na' ? 'na' : 's' + r.sev), 'data-hc-chip': r.id, text: r.say || HC_CHIP[r.st] }) : null;
  const head = h('button', { type: 'button', class: 'hc-head', 'aria-expanded': String(open), 'data-hc-toggle': r.id, onclick: () => { HCS.open[r.id] = !HCS.open[r.id]; hcRefresh(); const again = document.querySelector('[data-hc-toggle="' + r.id + '"]'); if (again) again.focus(); } }, [
    h('span', { class: 'hc-name' }, [r.name, h('span', { class: 'hc-abbr', text: r.abbr })]),
    h('span', { class: 'hc-val' }, [h('b', { 'data-hc-v': r.id, text: r.text }), has && r.unit ? h('span', { class: 'hc-u', text: ' ' + r.unit }) : null])]);
  const meta = [];
  if (r.normal) meta.push(h('span', { text: 'Normal ' + r.normalFull }));
  if (has && r.sub) meta.push(h('span', { 'data-hc-sub': r.id, text: r.sub }));
  if (has && r.range) meta.push(h('span', { class: 'hc-band-t', 'data-hc-range': r.id, text: r.range.text + ' ' + r.range.basis }));
  const body = [head, has || r.normal ? h('div', { class: 'hc-meta' }, [chip].concat(meta)) : null, hcGauge(r)];
  if (d && !d.same) body.push(h('p', { class: 'hc-was', 'data-hc-was': r.id }, [h('span', { class: 'lbl', text: 'Earlier ' }), d.from + ' → ' + d.to + ' (' + (d.pct > 0 ? '+' : '') + d.pct + '%)', d.noise ? h('span', { class: 'hc-noise', text: ' · within what the method can resolve' }) : null]));
  if (!has && r.err) body.push(h('p', { class: 'hc-err', 'data-hc-err': r.id, text: r.err }));
  else if (!has && r.need.length) body.push(h('p', { class: 'hc-need', 'data-hc-need': r.id }, [h('span', { class: 'lbl', text: 'Needs ' }), r.need.map(hcLow).join(', ')]));
  if (r.hint) body.push(h('p', { class: 'hc-need', 'data-hc-hint': r.id, text: r.hint }));
  body.push(h('p', { class: 'hc-limit', 'data-hc-limit': r.id }, [h('span', { class: 'lbl', text: 'Limit ' }), r.limit]));
  if (open) {
    const kids = [h('p', { class: 'hc-formula' }, [h('span', { class: 'lbl', text: 'Formula ' }), r.formula, r.worked ? h('span', { class: 'hc-worked', 'data-hc-worked': r.id, text: r.worked }) : null])];
    if (r.here.length) kids.push(h('div', { class: 'hc-here', 'data-hc-here': r.id }, [h('h6', { text: 'For these numbers' }), h('ul', {}, r.here.map(t => h('li', { text: t })))]));
    if (r.alts.length) kids.push(h('div', { class: 'hc-alts', 'data-hc-alts': r.id }, [h('h6', { text: 'Another way' }), h('ul', {}, r.alts.map(a => h('li', {}, [a.label + ': ', h('b', { text: a.text })])))]));
    kids.push(h('div', { class: 'hc-always', 'data-hc-always': r.id }, [h('h6', { text: 'Always true of this number' }), h('ul', {}, r.limits.map(t => h('li', { text: t })))]));
    body.push(h('div', { class: 'hc-detail', 'data-hc-detail': r.id }, kids));
  }
  return h('div', { class: 'hc-row' + (has ? '' : ' empty') + (open ? ' open' : ''), 'data-hc-row': r.id, 'data-st': has ? r.st : 'none', 'data-sev': String(r.sev) }, body);
}

/* ---- the reading at the top ---- */
function hcRead(res) {
  const kids = [];
  if (HCS.ex) {
    const E = HCS.ex, co = res.by.co, ci = res.by.ci, tci = E.truth.co / E.truth.bsa;
    const off = co.value !== null ? Math.round((co.value - E.truth.co) / E.truth.co * 100) : null;
    kids.push(h('div', { class: 'hc-truth', 'data-hc-truth': E.id }, [h('p', {}, [h('b', { text: E.title + '. ' }), E.say]),
      h('p', {}, [h('span', { class: 'lbl', text: 'What the model knows: ' }), 'the real ' + (E.truth.pump > 0 ? 'total flow' : 'output') + ' is ' + HC.fmt(E.truth.co, 1) + ' L/min (index ' + HC.fmt(tci, 1) + ')' + (E.truth.pump > 0 ? ', of which the pump carries ' + HC.fmt(E.truth.pump, 1) : '') + ', on an oxygen consumption of ' + E.truth.vo2 + ' mL/min and a mixed venous saturation of ' + E.truth.svo2 + '%. ',
        co.value !== null ? h('b', { 'data-hc-off': String(off), text: 'The sheet reads ' + co.text + ' (index ' + ci.text + '): ' + (Math.abs(off) < 8 ? 'close.' : Math.abs(off) + '% ' + (off > 0 ? 'high.' : 'low.')) }) : null])]));
  }
  if (!res.read.filled && !res.checks.length) kids.push(h('p', { class: 'hc-empty', 'data-hc-empty': '1', text: 'Nothing typed yet. Each row below shows its formula’s limit and what it is waiting for; results appear as the numbers they need arrive. Or load an example.' }));
  if (res.checks.length) kids.push(h('ul', { class: 'hc-checks', 'data-hc-checks': String(res.checks.length) }, res.checks.map(c => h('li', { class: c.level, 'data-hc-check': c.k }, [h('b', { text: c.level === 'bad' ? 'Check: ' : c.level === 'warn' ? 'Query: ' : 'Note: ' }), c.t]))));
  return h('div', { class: 'hc-read', 'data-hc-top': '1' }, kids);
}
function hcSay(res) {
  if (!res.read.lines.length) return null;
  return h('section', { class: 'hc-group hc-say', 'data-hc-read': '1' }, [h('h5', {}, [h('span', { text: 'What the numbers say' }), h('span', { class: 'hc-gsub', text: 'By the usual lines' })]),
    h('ul', { class: 'hc-lines', 'data-hc-lines': String(res.read.lines.length) }, res.read.lines.map(l => h('li', { class: 's' + l.sev, 'data-hc-line': l.k, text: l.t }))),
    res.by.co.value !== null ? h('p', { class: 'fine hc-p hc-method', 'data-hc-method': res.read.method, text: 'Output by ' + res.read.method + (res.assumed && !res.useTd ? ': an assumed oxygen consumption, commonly a quarter out either way. Read every flow-based number as a range.' : '.') }) : null]);
}
function hcOut() {
  const res = HCS.res, dd = HCS.prev ? HC.diff(HCS.prev, res) : null;
  const groups = HC.GROUPS.map(g => h('section', { class: 'hc-group', 'data-hc-group': g.id }, [h('h5', {}, [h('span', { text: g.title }), h('span', { class: 'hc-gsub', text: g.sub })])].concat(res.rows.filter(r => r.group === g.id).map(r => hcRow(r, dd)))));
  return [hcRead(res), groups[0], hcSay(res)].concat(groups.slice(1)).filter(Boolean);
}
function hcBar() {
  const res = HCS.res, any = res.rows.some(r => r.value !== null);
  return h('div', { class: 'ec-bar hc-bar', 'data-hc-bar': '1' }, [
    h('label', { class: 'nod-f' }, [h('span', { class: 'nod-l', text: 'Example patient' }), h('select', { 'data-hc-example': '1', onchange: (e) => { if (e.target.value) hcLoadExample(e.target.value); else hcReset(); render(); } },
      [h('option', { value: '', text: '— your own numbers —' })].concat(HCS.ex && HCS.ex.id === 'lab' ? [h('option', { value: 'lab', selected: true, text: HCS.ex.title })] : []).concat(HC.EXAMPLES.map(E => h('option', { value: E.id, selected: !!(HCS.ex && HCS.ex.id === E.id), text: E.title }))))]),
    h('button', { type: 'button', class: 'btn sm', 'data-hc-copy': '1', disabled: !any, text: 'Copy for the note', onclick: () => copyText(HC.note(HCS.res), 'Hemos line copied') }),
    h('button', { type: 'button', class: 'btn sm', 'data-hc-keep': '1', disabled: !any, text: HCS.prev ? 'Replace the earlier set' : 'Keep as the earlier set', onclick: () => { HCS.prev = HCS.res; toast('Held. Type the next set to see what moved.'); render(); } }),
    HCS.prev ? h('button', { type: 'button', class: 'lnk', 'data-hc-drop': '1', text: 'Drop the earlier set', onclick: () => { HCS.prev = null; render(); } }) : null,
    h('label', { class: 'chk' }, [h('input', { type: 'checkbox', 'data-hc-all': '1', checked: HCS.all, onchange: (e) => { HCS.all = e.target.checked; hcRefresh(); } }), 'Open every row']),
    h('button', { type: 'button', class: 'lnk', 'data-hc-clear': '1', text: 'Clear', onclick: () => { hcReset(); render(); } })
  ]);
}
/* redraw what depends on the numbers, leaving the inputs (and the caret) alone */
function hcRefresh() {
  hcCompute();
  const fig = document.querySelector('[data-hemocalc]'); if (!fig) return;
  const out = fig.querySelector('[data-hc-out]'); if (out) { out.textContent = ''; hcOut().forEach(n => out.appendChild(n)); }
  fig.querySelectorAll('[data-hc-f]').forEach(lab => {
    const k = lab.getAttribute('data-hc-f'), st = HCS.res.fields[k];
    lab.setAttribute('data-state', st.state);
    const m = lab.querySelector('[data-hc-msg]'); if (m) m.textContent = st.msg;
    const i = lab.querySelector('input'); if (i) { if (st.state === 'bad') i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); }
  });
  const any = HCS.res.rows.some(r => r.value !== null);
  fig.querySelectorAll('[data-hc-copy], [data-hc-keep]').forEach(b => { b.disabled = !any; });
  fig.setAttribute('data-hc-filled', String(HCS.res.read.filled));
}
function hemoCalcFig() {
  hcCompute();
  return h('figure', { class: 'an-fig ec-fig ec-lab hc-fig', 'data-hemocalc': '1', 'data-hc-filled': String(HCS.res.read.filled) }, [
    hcBar(),
    HCS.prev ? h('p', { class: 'fine hc-p', 'data-hc-held': '1', text: 'An earlier set is held: rows that moved show the change. Two estimated-Fick values compare fairly only if the oxygen consumption did not change between them.' }) : null,
    h('div', { class: 'hc-main' }, [hcInputs(), h('div', { class: 'hc-out', 'data-hc-out': '1', 'aria-live': 'polite' }, hcOut())]),
    h('figcaption', { text: 'The first seven results follow the chart’s formulas exactly. On each bar the green band is the normal range, the mark the result, and the blue band where the result would lie if the true oxygen consumption were 25% below or above the assumed one. Click a row for its arithmetic and the full list of limits. Nothing typed here is stored or sent.' })
  ]);
}
