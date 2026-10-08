
/* ====================================================================== 6MWD trend
   Earlier walks are typed once (date + distance, optional nadir SpO2 and oxygen); today's walk is entered in the same card
   and shares its state with the 6MWT fields above. The engine does the arithmetic; this draws it. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function isoParts(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
function fmtDay(iso) { const p = isoParts(iso); return p ? p.d + ' ' + MONTHS[p.m - 1] + ' ' + p.y : String(iso || ''); }
function fmtMon(ms, longSpan) { const d = new Date(ms); return longSpan ? MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear() : d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()]; }
const signed = (n, dp) => (n > 0 ? '+' : (n < 0 ? '−' : '')) + Math.abs(n).toFixed(dp || 0);
const MID6 = 30;

function trendRowEl(r, i, repaintRows) {
  const idd = uid('trd'), idm = uid('trm'), idn = uid('trn');
  const date = h('input', { type: 'date', id: idd, value: r.date, oninput: (e) => { r.date = e.target.value; sync(); } });
  const dist = h('input', { type: 'text', class: 'num', id: idm, inputmode: 'decimal', autocomplete: 'off', placeholder: 'e.g. 412', value: r.dist, oninput: (e) => { r.dist = e.target.value; sync(); } });
  const nad = h('input', { type: 'text', class: 'num', id: idn, inputmode: 'decimal', autocomplete: 'off', placeholder: 'optional', value: r.nadir, oninput: (e) => { r.nadir = e.target.value; sync(); } });
  const o2 = h('button', { type: 'button', class: 'cp', 'aria-pressed': String(r.o2 === 'o2'), text: 'On oxygen', onclick: () => { r.o2 = r.o2 === 'o2' ? '' : 'o2'; o2.setAttribute('aria-pressed', String(r.o2 === 'o2')); sync(); } });
  const INTERVALS = [['3 mo', 3], ['6 mo', 6], ['1 yr', 12], ['2 yr', 24], ['3 yr', 36]];
  const quick = h('div', { class: 'qdates' }, [h('span', { class: 'hint', text: 'Date: this study minus' })].concat(INTERVALS.map(iv =>
    h('button', { type: 'button', class: 'cp', 'data-months': String(iv[1]), text: iv[0], onclick: () => { r.date = shiftMonths(S.ctx.date, iv[1]); date.value = r.date; sync(); } }))));
  widgets.push(() => {
    dist.classList.toggle('bad', r.dist !== '' && !hasNum(r.dist));
    nad.classList.toggle('bad', r.nadir !== '' && !hasNum(r.nadir));
  });
  return h('div', { class: 'tr-row', 'data-trow': String(i + 1) }, [
    h('div', { class: 'tr-cells' }, [
      h('div', { class: 'fld' }, [h('label', { for: idd, text: 'Date of walk ' + (i + 1) }), date]),
      h('div', { class: 'fld' }, [h('label', { for: idm, text: '6MWD' }), h('div', { class: 'inwrap' }, [dist, h('span', { class: 'unit', text: 'm' })])]),
      h('div', { class: 'fld' }, [h('label', { for: idn, text: 'Nadir SpO2' }), h('div', { class: 'inwrap' }, [nad, h('span', { class: 'unit', text: '%' })])]),
      h('div', { class: 'fld tr-o2' }, [h('span', { class: 'lab', text: 'Oxygen' }), o2]),
      h('div', { class: 'fld tr-del' }, [h('button', { type: 'button', class: 'btn sm quiet', 'aria-label': 'Remove walk ' + (i + 1), text: 'Remove', onclick: () => {
        S.trend6.list.splice(i, 1); if (!S.trend6.list.length) S.trend6.list.push(P.blankTrendRow()); repaintRows(); sync(); } })])
    ]),
    quick
  ]);
}

function trendTodayRow() {
  const idm = uid('tmd'), idn = uid('tmn');
  const dist = h('input', { type: 'text', class: 'num', id: idm, inputmode: 'decimal', autocomplete: 'off', placeholder: 'e.g. 365', value: S.sixmw.dist, oninput: (e) => { S.sixmw.dist = e.target.value; sync(); } });
  const nad = h('input', { type: 'text', class: 'num', id: idn, inputmode: 'decimal', autocomplete: 'off', placeholder: 'optional', value: S.sixmw.spo2_nadir, oninput: (e) => { S.sixmw.spo2_nadir = e.target.value; sync(); } });
  const o2 = h('button', { type: 'button', class: 'cp', 'aria-pressed': String(S.sixmw.o2 === 'o2'), text: 'On oxygen', onclick: () => { S.sixmw.o2 = S.sixmw.o2 === 'o2' ? '' : 'o2'; sync(); } });
  const dt = h('span', { class: 'tr-date' });
  widgets.push(() => {
    dt.textContent = S.ctx.date ? fmtDay(S.ctx.date) : 'date not set (Details step)';
    dt.classList.toggle('missing', !S.ctx.date);
    if (document.activeElement !== dist && dist.value !== String(S.sixmw.dist)) dist.value = S.sixmw.dist;
    if (document.activeElement !== nad && nad.value !== String(S.sixmw.spo2_nadir)) nad.value = S.sixmw.spo2_nadir;
    o2.setAttribute('aria-pressed', String(S.sixmw.o2 === 'o2'));
    dist.classList.toggle('bad', S.sixmw.dist !== '' && !hasNum(S.sixmw.dist));
    nad.classList.toggle('bad', S.sixmw.spo2_nadir !== '' && !hasNum(S.sixmw.spo2_nadir));
  });
  return h('div', { class: 'tr-row today', 'data-trow': 'today' }, [
    h('div', { class: 'tr-cells' }, [
      h('div', { class: 'fld' }, [h('span', { class: 'lab', text: 'This study' }), dt]),
      h('div', { class: 'fld' }, [h('label', { for: idm, text: '6MWD today' }), h('div', { class: 'inwrap' }, [dist, h('span', { class: 'unit', text: 'm' })])]),
      h('div', { class: 'fld' }, [h('label', { for: idn, text: 'Nadir SpO2' }), h('div', { class: 'inwrap' }, [nad, h('span', { class: 'unit', text: '%' })])]),
      h('div', { class: 'fld tr-o2' }, [h('span', { class: 'lab', text: 'Oxygen' }), o2])
    ])
  ]);
}

/* ------------------------------------------------------------------ the chart */
function trendSvg(t, f) {
  const pts = t.pts, n = pts.length;
  const W = 640, H = 276, L = 48, RM = 22, T = 24, B = 38, pw = W - L - RM, ph = H - T - B;
  const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'tr-svg', role: 'img', tabindex: '0',
    'aria-label': '6-minute walk distance over time: ' + pts.map(p => Math.round(p.dist) + ' m on ' + fmtDay(p.ds)).join('; ') + '. Use the left and right arrow keys to step through the walks; a table view is below.' });
  const TX = (x, y, txt, cls, anchor) => { const e = sv('text', { x: x, y: y, class: 'tr-t' + (cls ? ' ' + cls : ''), 'text-anchor': anchor || 'start' }); e.textContent = txt; svg.appendChild(e); return e; };
  let t0 = Math.min.apply(null, pts.map(p => p.date.getTime())), t1 = Math.max.apply(null, pts.map(p => p.date.getTime()));
  const spanDays = (t1 - t0) / 86400000;
  if (t1 === t0) { t0 -= 20 * 86400000; t1 += 20 * 86400000; } else { const pad = (t1 - t0) * 0.04; t0 -= pad; t1 += pad; }
  let lo = Math.min.apply(null, pts.map(p => p.dist)), hi = Math.max.apply(null, pts.map(p => p.dist));
  const lln = f.six.llnUse;
  const llnOn = typeof lln === 'number' && isFinite(lln) && lln > lo - 160 && lln < hi + 160;
  if (llnOn) { lo = Math.min(lo, lln); hi = Math.max(hi, lln); }
  const prev = n >= 2 ? pts[n - 2] : null;
  if (prev) { lo = Math.min(lo, prev.dist - MID6); hi = Math.max(hi, prev.dist + MID6); }
  const span = Math.max(hi - lo, 60);
  const step = span <= 100 ? 20 : (span <= 260 ? 50 : (span <= 600 ? 100 : 200));
  const y0 = Math.max(0, Math.floor((lo - span * 0.14) / step) * step), y1 = Math.ceil((hi + span * 0.18) / step) * step;
  const sx = (ms) => L + (ms - t0) / (t1 - t0) * pw, sy = (v) => T + (1 - (v - y0) / (y1 - y0)) * ph;
  // grid and y ticks
  for (let v = y0; v <= y1 + 1e-6; v += step) {
    svg.appendChild(sv('line', { x1: L, x2: W - RM, y1: sy(v).toFixed(1), y2: sy(v).toFixed(1), class: 'tr-grid' }));
    TX(L - 8, sy(v) + 4, String(v), 'tick', 'end');
  }
  TX(4, 12, 'meters', 'axis', 'start');
  // x ticks
  const long = spanDays > 400, nt = Math.max(2, Math.min(6, Math.floor(pw / 112)));
  for (let k = 0; k < nt; k++) {
    const ms = t0 + (t1 - t0) * k / (nt - 1), x = sx(ms);
    svg.appendChild(sv('line', { x1: x.toFixed(1), x2: x.toFixed(1), y1: H - B, y2: H - B + 4, class: 'tr-axis' }));
    TX(x, H - B + 18, fmtMon(ms, long), 'tick', k === 0 ? 'start' : (k === nt - 1 ? 'end' : 'middle'));
  }
  svg.appendChild(sv('line', { x1: L, x2: W - RM, y1: H - B, y2: H - B, class: 'tr-axis' }));
  // minimal-important-difference band around the previous walk
  if (prev) svg.appendChild(sv('rect', { x: sx(prev.date.getTime()).toFixed(1), y: sy(prev.dist + MID6).toFixed(1), width: (W - RM - sx(prev.date.getTime())).toFixed(1), height: (sy(prev.dist - MID6) - sy(prev.dist + MID6)).toFixed(1), class: 'tr-band' }));
  // LLN
  if (llnOn) { svg.appendChild(sv('line', { x1: L, x2: W - RM, y1: sy(lln).toFixed(1), y2: sy(lln).toFixed(1), class: 'tr-lln' })); TX(W - RM - 2, sy(lln) - 5, 'LLN ' + Math.round(lln) + ' m', 'muted', 'end'); }
  // line
  if (n >= 2) svg.appendChild(sv('polyline', { points: pts.map(p => sx(p.date.getTime()).toFixed(1) + ',' + sy(p.dist).toFixed(1)).join(' '), class: 'tr-line', fill: 'none' }));
  // markers
  const hl = sv('circle', { r: '10', class: 'tr-hl', cx: '0', cy: '0' }); hl.style.display = 'none';
  const cross = sv('line', { class: 'tr-cross', y1: T, y2: H - B }); cross.style.display = 'none';
  svg.appendChild(cross);
  pts.forEach((p, i) => {
    const x = sx(p.date.getTime()), y = sy(p.dist);
    if (p.src === 'current') svg.appendChild(sv('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: '10', class: 'tr-cur', fill: 'none' }));
    svg.appendChild(p.o2 ? sv('rect', { x: (x - 5).toFixed(1), y: (y - 5).toFixed(1), width: '10', height: '10', rx: '2', class: 'tr-pt', 'data-i': i })
                         : sv('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: '5', class: 'tr-pt', 'data-i': i }));
  });
  svg.appendChild(hl);
  // direct labels: all when few, otherwise first, last and best
  const label = n <= 5 ? pts.map((p, i) => i) : uniq([0, n - 1, pts.indexOf(t.best)]).sort((a, b) => a - b);
  let lastX = -1e9, lastAbove = false;
  label.forEach(i => {
    const p = pts[i], x = sx(p.date.getTime()), y = sy(p.dist);
    const below = (x - lastX < 38) && lastAbove;
    const anchor = x > W - RM - 26 ? 'end' : (x < L + 26 ? 'start' : 'middle');
    TX(anchor === 'end' ? x + 4 : (anchor === 'start' ? x - 4 : x), below ? y + 22 : y - 12, Math.round(p.dist) + ' m', 'val', anchor);
    lastAbove = !below; lastX = x;
  });
  // hit layer
  const hit = sv('rect', { x: L, y: T, width: pw, height: ph, class: 'tr-hit', fill: 'transparent' });
  svg.appendChild(hit);
  svg._geom = { sx: sx, sy: sy, W: W, H: H, hl: hl, cross: cross, hit: hit };
  return svg;
}

function trendChartBlock() {
  const wrap = h('div', { class: 'tr-chartwrap' });
  const tip = h('div', { class: 'tr-tip', role: 'status', hidden: true });
  let svg = null, idx = -1;
  function showTip(i) {
    const t = R.facts.trend6; if (!svg || i < 0 || i >= t.pts.length) return hideTip();
    idx = i; const p = t.pts[i], g = svg._geom, x = g.sx(p.date.getTime()), y = g.sy(p.dist);
    g.hl.setAttribute('cx', x.toFixed(1)); g.hl.setAttribute('cy', y.toFixed(1)); g.hl.style.display = '';
    g.cross.setAttribute('x1', x.toFixed(1)); g.cross.setAttribute('x2', x.toFixed(1)); g.cross.style.display = '';
    const prevP = i > 0 ? t.pts[i - 1] : null;
    tip.textContent = '';
    tip.appendChild(h('b', { text: fmtDay(p.ds) + (p.src === 'current' ? ' · this study' : '') }));
    tip.appendChild(h('span', { text: Math.round(p.dist) + ' m' + (isFinite(p.nadir) ? ' · nadir SpO2 ' + Math.round(p.nadir) + '%' : '') + (p.o2 ? ' · on oxygen' : '') }));
    if (prevP) { const d = p.dist - prevP.dist; tip.appendChild(h('span', { class: 'mut', text: signed(d) + ' m (' + signed(d / prevP.dist * 100, 1) + '%) vs ' + fmtDay(prevP.ds) })); }
    tip.hidden = false;
    const r = svg.getBoundingClientRect(), k = r.width / g.W;
    const tw = tip.offsetWidth; let left = x * k - tw / 2; left = Math.max(0, Math.min(left, r.width - tw));
    tip.style.left = Math.round(left) + 'px'; tip.style.top = Math.max(0, Math.round(y * k - tip.offsetHeight - 14)) + 'px';
  }
  function hideTip() { idx = -1; tip.hidden = true; if (svg && svg._geom) { svg._geom.hl.style.display = 'none'; svg._geom.cross.style.display = 'none'; } }
  function nearest(ev) {
    const t = R.facts.trend6, g = svg._geom, r = svg.getBoundingClientRect(), mx = (ev.clientX - r.left) / r.width * g.W;
    let best = -1, bd = 1e9; t.pts.forEach((p, i) => { const d = Math.abs(g.sx(p.date.getTime()) - mx); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function paint() {
    const t = R.facts.trend6; wrap.textContent = ''; tip.hidden = true; svg = null;
    if (t.n < 2) {
      wrap.appendChild(h('p', { class: 'tr-empty', text: t.n === 1 ? 'One walk so far. Add at least one more walk (with a date) to draw the trend.' : 'No walks with both a date and a distance yet. Enter earlier walks above; today\'s walk counts once its distance and the study date are set.' }));
      return;
    }
    svg = trendSvg(t, R.facts);
    const g = svg._geom;
    g.hit.addEventListener('pointermove', (e) => showTip(nearest(e)));
    g.hit.addEventListener('pointerdown', (e) => showTip(nearest(e)));
    g.hit.addEventListener('pointerleave', hideTip);
    svg.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); const nn = t.pts.length; const next = idx < 0 ? (e.key === 'ArrowLeft' ? nn - 1 : 0) : Math.max(0, Math.min(nn - 1, idx + (e.key === 'ArrowLeft' ? -1 : 1)));
      showTip(next);
    });
    svg.addEventListener('blur', hideTip);
    wrap.appendChild(svg); wrap.appendChild(tip);
  }
  return { el: wrap, paint: paint };
}

function trendTable(t) {
  const rows = t.pts.map((p, i) => {
    const q = i > 0 ? t.pts[i - 1] : null, d = q ? p.dist - q.dist : null;
    return h('tr', {}, [h('td', { text: fmtDay(p.ds) }), h('td', { class: 'n', text: String(Math.round(p.dist)) }),
      h('td', { class: 'n', text: q ? signed(d) + ' (' + signed(d / q.dist * 100, 1) + '%)' : '—' }),
      h('td', { class: 'n', text: isFinite(p.nadir) ? String(Math.round(p.nadir)) : '—' }), h('td', { text: p.o2 ? 'Oxygen' : 'Room air' }), h('td', { text: p.src === 'current' ? 'This study' : 'Saved' })]);
  });
  return h('div', { class: 'tr-tbl-wrap' }, [h('table', { class: 'tr-tbl' }, [
    h('thead', {}, [h('tr', {}, ['Date', '6MWD (m)', 'Change vs previous', 'Nadir SpO2 (%)', 'Oxygen', 'Source'].map((x, i) => h('th', { class: i === 1 || i === 2 || i === 3 ? 'n' : '', text: x })))]),
    h('tbody', {}, rows)])]);
}

/* Predicted 6MWD by Enright & Sherrill 1998 (the MDCalc 6-minute walk distance calculator), from the Details step. The
   laboratory's own predicted value, when entered below, takes precedence; this card shows what the equation gives. */
function predCalcBlock() {
  const has = (v) => typeof v === 'number' && isFinite(v), fmt = (v, d) => has(v) ? v.toFixed(d) : '?';
  const vals = h('div', { class: 'stats es-stats' });
  const body = h('p', { class: 'fine es-body' });
  const goBtn = h('button', { type: 'button', class: 'btn sm', 'data-es-go': '1', text: 'Enter them on the Details step →', onclick: () => goto('ctx') });
  const t6 = (label, value, sub) => h('div', { class: 'stat' }, [h('div', { class: 'sv', text: String(value) }), h('div', { class: 'sl', text: label }), sub ? h('div', { class: 'ss', text: sub }) : null]);
  const card = h('section', { class: 'grp es-card', 'data-es': '1', 'aria-labelledby': 'es-h' }, [
    h('div', { class: 'grp-head' }, [h('h3', { id: 'es-h', text: 'Predicted 6MWD calculator (Enright & Sherrill 1998, as on MDCalc)' })]),
    vals, body
  ]);
  widgets.push(() => {
    const x = R.facts.six, es = x.es, c = R.facts.ctx;
    vals.textContent = ''; body.textContent = '';
    if (!es || !es.ok) {
      body.appendChild(h('span', { text: 'Needs ' + (es ? es.missing.join(', ') : 'age, sex, height and weight') + ' to calculate the predicted distance and the LLN. ' }));
      body.appendChild(goBtn);
      card.setAttribute('data-es-state', 'missing');
      return;
    }
    const pct = has(x.dist) && x.stop !== 'early' ? x.dist / es.pred * 100 : NaN;
    vals.appendChild(t6('Predicted 6MWD', Math.round(es.pred) + ' m', (es.sex === 'M' ? 'Men' : 'Women') + ', age ' + fmt(c.age, 0) + ', ' + fmt(c.ht, 0) + ' cm, ' + fmt(c.wt, 0) + ' kg'));
    vals.appendChild(t6('LLN', Math.round(es.lln) + ' m', 'predicted − ' + es.sub + ' m'));
    vals.appendChild(t6('% predicted', has(pct) ? Math.round(pct) + '%' : '—', has(x.dist) ? (x.stop === 'early' ? 'not applied: walk stopped early' : (x.dist < es.lln ? 'below the LLN' : 'at or above the LLN')) : 'enter the distance walked'));
    const eqTxt = es.sex === 'M' ? '7.57 × height (cm) − 5.02 × age − 1.76 × weight (kg) − 309 m; LLN = predicted − 153 m' : '2.11 × height (cm) − 2.29 × weight (kg) − 5.78 × age + 667 m; LLN = predicted − 139 m';
    let note = 'Equation (' + (es.sex === 'M' ? 'men' : 'women') + '): ' + eqTxt + '. Derived in healthy adults aged 40–80 (Am J Respir Crit Care Med 1998;158:1384–7); it explains about 40% of the variance in distance, so a locally derived or laboratory reference is preferred when one exists. ';
    if (es.ageOut) note += 'Age ' + fmt(c.age, 0) + ' is outside the 40–80 range of the equation, so these are extrapolations. ';
    note += x.predSrc === 'lab' ? 'The laboratory-reported predicted value entered below is used in the report; this calculation is shown for comparison' + (has(x.predDiff) && Math.abs(x.predDiff) > 5 ? ' (it differs by ' + fmt(Math.abs(x.predDiff), 0) + '%)' : '') + '.' : 'These values are used in the report because no laboratory predicted value was entered; enter one below to override.';
    body.textContent = note;
    card.setAttribute('data-es-state', x.predSrc === 'lab' ? 'lab' : 'calc');
  });
  return card;
}

function trendBlock() {
  const rowsBox = h('div', { class: 'tr-rows', 'data-trend-rows': '1' });
  const addBtn = h('button', { type: 'button', class: 'btn', id: 'tr-add', text: '+ Add an earlier walk', onclick: () => { S.trend6.list.push(P.blankTrendRow()); paintRows(); sync(); const last = rowsBox.querySelector('.tr-row:last-child input[type=date]'); if (last) last.focus(); } });
  function paintRows() {
    rowsBox.textContent = '';
    S.trend6.list.forEach((r, i) => rowsBox.appendChild(trendRowEl(r, i, paintRows)));
    addBtn.hidden = S.trend6.list.length >= P.MAX_TREND;
  }
  paintRows();
  const chart = trendChartBlock();
  const sum = h('div', { class: 'tr-sum', 'aria-live': 'polite' });
  const legend = h('div', { class: 'tr-legend' });
  const tblBox = h('div', { class: 'tr-tbl-box', hidden: true });
  let tblOn = false;
  const toggle = h('button', { type: 'button', class: 'btn sm quiet', id: 'tr-table', 'aria-pressed': 'false', text: 'Show as table', onclick: () => { tblOn = !tblOn; toggle.textContent = tblOn ? 'Hide table' : 'Show as table'; toggle.setAttribute('aria-pressed', String(tblOn)); paint(); } });
  function paint() {
    const t = R.facts.trend6, sec = secFor('sixmw');
    chart.paint();
    sum.textContent = ''; legend.textContent = ''; tblBox.textContent = '';
    toggle.hidden = t.n < 1; tblBox.hidden = !(tblOn && t.n >= 1);
    if (!tblBox.hidden) tblBox.appendChild(trendTable(t));
    if (t.multi) {
      const c = t.vsPrev, cls = c.cls === 'down' ? 'caution' : (c.cls === 'up' ? 'ok' : 'note');
      const glyph = c.cls === 'down' ? '▼ ' : (c.cls === 'up' ? '▲ ' : '● ');
      const words = c.cls === 'stable' ? 'within the ' + MID6 + ' m minimal important difference' : (c.cls === 'down' ? 'beyond the ' + MID6 + ' m minimal important difference (a fall)' : 'beyond the ' + MID6 + ' m minimal important difference (a gain)');
      sum.appendChild(h('div', { class: 'tr-main' }, [h('span', { class: 'chip ' + cls, text: glyph + signed(c.dAbs) + ' m (' + signed(c.dPct, 1) + '%) vs previous walk' }), h('span', { class: 'tr-w', text: words })]));
      if (t.ipf) sum.appendChild(h('div', { class: 'tr-main' }, [h('span', { class: 'chip alert', text: '▼ ' + signed(t.ipf.dAbs) + ' m in ' + Math.round(t.ipf.days / 7) + ' weeks' }), h('span', { class: 'tr-w', text: 'a fall of more than 50 m over about 24 weeks was prognostic in IPF (du Bois 2011)' })]));
    }
    if (sec && sec.trend && sec.trend.length) sum.appendChild(h('ul', { class: 'tr-lines' }, sec.trend.slice(1).map(l => h('li', { text: l }))));
    if (t.n >= 2) {
      const L_ = [['dot', 'Room air'], t.pts.some(p => p.o2) ? ['sq', 'On oxygen'] : null, t.pts.some(p => p.src === 'current') ? ['ring', 'This study'] : null, ['band', '±' + MID6 + ' m around the previous walk (MID)'], (typeof R.facts.six.llnUse === 'number' && isFinite(R.facts.six.llnUse)) ? ['lln', 'LLN'] : null].filter(Boolean);
      L_.forEach(k => legend.appendChild(h('span', { class: 'lg' }, [h('i', { class: 'lg-' + k[0], 'aria-hidden': 'true' }), k[1]])));
    }
  }
  widgets.push(paint);
  return h('section', { class: 'grp tr-block', 'data-trend': '1', 'aria-label': 'Six-minute walk distance trend' }, [
    h('div', { class: 'grp-head' }, [h('h3', {}, ['Walk distance over time', info('mid')]), h('div', { class: 'tr-actions' }, [toggle])]),
    h('p', { class: 'fine', text: 'Add earlier walks to see the change. Today\'s walk shares its entries with the 6MWD, SpO2 and oxygen fields above. Keep the track, encouragement and oxygen the same across walks so the distances are comparable.' }),
    rowsBox, h('div', { class: 'tr-add' }, [addBtn]),
    trendTodayRow(),
    sum, chart.el, legend, tblBox
  ]);
}
