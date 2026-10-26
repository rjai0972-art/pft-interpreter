/* ------------------------------------------------------------------ foundations: the figures and labs of the anatomy and physiology topics
   syllabus (the map of the area), ladder (the airway wall level by level), cycle (pressures over a breath), spiro (volumes
   and capacities), aa (alveolar gas calculator), odc (the oxygen dissociation curve lab), hl (the Campbell + Guyton lab). */
const PH = window.PFT_PHYS, HL = window.PFT_HL;
function svHide(el, on) { if (on) el.setAttribute('hidden', ''); else el.removeAttribute('hidden'); return el; }

/* ---- the map of the area: a card per topic in course order ---- */
function syllabusFig() {
  const cat = (typeof learnCatOf === 'function') ? learnCatOf('start') : null;
  const groups = PH.groups.filter(g => g.title !== 'Start');
  const topicsOf = (id) => (cat && cat.topics[id]) || PH.topics[id] || AN.topics[id];
  return h('div', { class: 'syl', 'data-syllabus': '1' }, groups.map(g => h('div', { class: 'syl-group' }, [
    h('h4', { text: g.title }),
    h('ol', { class: 'syl-list' }, g.ids.map(id => { const t = topicsOf(id); return t ? h('li', {}, [h('button', { type: 'button', class: 'lnk', 'data-syl': id, text: t.title, onclick: () => setMode('learn', { topic: id }) }), h('span', { class: 'fine', text: ' — ' + (t.kicker || '') })]) : null; }))
  ])));
}

/* ---- the airway wall, level by level ---- */
const LADDER_Q = [
  ['The last level that has cartilage in its wall', ['bronchi']], ['The last level with goblet cells and glands', ['bronchi']], ['The first level with club cells', ['bronchioles']],
  ['The end of the conducting zone (the anatomic dead space ends here)', ['terminal']], ['The first level where gas is exchanged', ['respiratory']], ['Where the cilia stop', ['respiratory']],
  ['The level that carries most of the resistance to airflow', ['bronchi']], ['The home of the type II pneumocyte', ['alveoli']], ['The epithelium becomes simple cuboidal here', ['terminal']],
  ['Rings of C-shaped cartilage with a muscle behind', ['trachea']], ['Centrilobular emphysema starts here', ['respiratory']], ['Corridors walled by alveolar openings', ['ducts']]
];
let ladderSel = '', ladderLabels = true, ladderQuiz = null;
function ladderFig() {
  const L = PH.LEVELS, W = 740, RH = 58, Y0 = 34, H = Y0 + RH * L.length + 8;
  const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'an-ladder', role: 'img', 'aria-label': 'The airway wall level by level' });
  const zoneCol = (z) => (/respiratory/.test(z) ? 'resp' : 'cond');
  // column heads
  svg.appendChild(svt(80, 18, 'the tube', { class: 'ld-head', 'text-anchor': 'middle' }));
  svg.appendChild(svt(170, 18, 'level', { class: 'ld-head' }));
  svg.appendChild(svt(390, 18, 'epithelium', { class: 'ld-head' }));
  svg.appendChild(svt(560, 18, 'wall', { class: 'ld-head' }));
  L.forEach((lv, i) => {
    const y = Y0 + i * RH, mid = y + RH / 2, hidden = !ladderLabels;
    const g = sv('g', { class: 'ld-row ' + zoneCol(lv.zone) + (ladderSel === lv.id ? ' on' : ''), 'data-level': lv.id, tabindex: '0', role: 'button' });
    g.appendChild(sv('rect', { x: 4, y: y, width: W - 8, height: RH - 2, rx: 8, class: 'ld-bg' }));
    // the tube: a band that narrows and thins, with the wall's components
    const th = [26, 20, 14, 10, 8, 7, 0][i], wall = [4, 3.5, 2.5, 1.6, 1, 0.8, 0][i];
    if (th > 0) {
      g.appendChild(sv('rect', { x: 20, y: mid - th / 2 - wall, width: 120, height: th + 2 * wall, rx: 4, class: 'ld-wall' }));
      g.appendChild(sv('rect', { x: 20, y: mid - th / 2, width: 120, height: th, rx: 3, class: 'ld-lumen' }));
      if (lv.id === 'trachea') for (let k = 0; k < 6; k++) g.appendChild(sv('path', { d: 'M' + (28 + k * 20) + ' ' + (mid - th / 2 - wall + 1) + ' a6 ' + (th / 2 + wall - 1) + ' 0 0 0 0 ' + (th + 2 * wall - 2), class: 'ld-cart' }));
      if (lv.id === 'bronchi') for (let k = 0; k < 5; k++) g.appendChild(sv('rect', { x: 26 + k * 23, y: (k % 2 ? mid + th / 2 : mid - th / 2 - wall) , width: 12, height: wall, rx: 1.5, class: 'ld-cart' }));
      if (/bronchi|terminal|respiratory/.test(lv.id)) { g.appendChild(sv('rect', { x: 20, y: mid - th / 2 - wall, width: 120, height: Math.max(1.2, wall * 0.6), class: 'ld-sm' })); g.appendChild(sv('rect', { x: 20, y: mid + th / 2 + wall * 0.4, width: 120, height: Math.max(1.2, wall * 0.6), class: 'ld-sm' })); }
      if (lv.id === 'respiratory') [40, 80, 120].forEach(x => g.appendChild(sv('circle', { cx: x, cy: mid + th / 2 + 7, r: 5, class: 'ld-alv' })));
      if (lv.id === 'ducts') [30, 55, 80, 105, 130].forEach(x => { g.appendChild(sv('circle', { cx: x, cy: mid - th / 2 - 7, r: 5.5, class: 'ld-alv' })); g.appendChild(sv('circle', { cx: x, cy: mid + th / 2 + 7, r: 5.5, class: 'ld-alv' })); });
    } else {
      [[40, mid - 8], [66, mid + 9], [92, mid - 9], [118, mid + 7], [60, mid - 12], [100, mid + 14]].forEach((c, k) => g.appendChild(sv('circle', { cx: c[0], cy: c[1], r: k < 4 ? 11 : 7, class: 'ld-alv' })));
      g.appendChild(sv('path', { d: 'M28 ' + (mid + 20) + ' q20 -6 40 0 t40 0 t40 0', class: 'ld-cap' }));
    }
    // the name
    const tx = 160;
    g.appendChild(svt(tx, mid - 6, hidden ? '?' : lv.name, { class: 'ld-name' }));
    g.appendChild(svt(tx, mid + 9, hidden ? '' : lv.gen + ' · ' + lv.dia, { class: 'ld-sub' }));
    g.appendChild(svt(tx, mid + 22, hidden ? '' : (zoneCol(lv.zone) === 'resp' ? 'respiratory zone' : 'conducting zone'), { class: 'ld-zone ' + zoneCol(lv.zone) }));
    // the epithelium: cells on a basement membrane
    const bx = 380, bw = 150, base = mid + 16;
    g.appendChild(sv('line', { x1: bx, y1: base, x2: bx + bw, y2: base, class: 'ld-bm' }));
    const kind = [ 'pscc', 'pscc', 'scc', 'cub', 'cubsq', 'sq', 'alv' ][i];
    if (kind === 'pscc' || kind === 'scc') {
      const n = kind === 'pscc' ? 9 : 8, cw = bw / n, ch = kind === 'pscc' ? 26 : 18;
      for (let k = 0; k < n; k++) {
        const x = bx + k * cw, gob = kind === 'pscc' && (k === 2 || k === 6), club = kind === 'scc' && (k === 2 || k === 5);
        if (gob) { g.appendChild(sv('path', { d: 'M' + (x + 1) + ' ' + base + ' L' + (x + 1) + ' ' + (base - ch * 0.5) + ' Q' + (x + cw / 2) + ' ' + (base - ch - 4) + ' ' + (x + cw - 1) + ' ' + (base - ch * 0.5) + ' L' + (x + cw - 1) + ' ' + base + ' Z', class: 'ld-cell goblet' })); }
        else if (club) { g.appendChild(sv('path', { d: 'M' + (x + 1) + ' ' + base + ' L' + (x + 1) + ' ' + (base - ch * 0.7) + ' Q' + (x + cw / 2) + ' ' + (base - ch - 6) + ' ' + (x + cw - 1) + ' ' + (base - ch * 0.7) + ' L' + (x + cw - 1) + ' ' + base + ' Z', class: 'ld-cell club' })); }
        else { g.appendChild(sv('rect', { x: x + 1, y: base - ch, width: cw - 2, height: ch, class: 'ld-cell col' })); for (let c = 0; c < 4; c++) g.appendChild(sv('line', { x1: x + 3 + c * (cw - 6) / 3, y1: base - ch, x2: x + 3 + c * (cw - 6) / 3 + (c % 2 ? 1.5 : -1.5), y2: base - ch - 6, class: 'ld-cil' })); }
        if (kind === 'pscc' && k % 3 === 1) g.appendChild(sv('ellipse', { cx: x + cw / 2, cy: base - 4, rx: 3, ry: 2.6, class: 'ld-basal' }));
      }
    } else if (kind === 'cub' || kind === 'cubsq') {
      const n = 9, cw = bw / n;
      for (let k = 0; k < n; k++) {
        const x = bx + k * cw, club = (k === 3 || k === 7), sq = kind === 'cubsq' && k >= 5 && !club;
        if (club) g.appendChild(sv('path', { d: 'M' + (x + 1) + ' ' + base + ' L' + (x + 1) + ' ' + (base - 9) + ' Q' + (x + cw / 2) + ' ' + (base - 18) + ' ' + (x + cw - 1) + ' ' + (base - 9) + ' L' + (x + cw - 1) + ' ' + base + ' Z', class: 'ld-cell club' }));
        else { g.appendChild(sv('rect', { x: x + 1, y: base - (sq ? 4 : 12), width: cw - 2, height: sq ? 4 : 12, class: 'ld-cell ' + (sq ? 'sq' : 'cub') })); if (!sq && kind === 'cub') for (let c = 0; c < 3; c++) g.appendChild(sv('line', { x1: x + 4 + c * 5, y1: base - 12, x2: x + 4 + c * 5, y2: base - 16, class: 'ld-cil' })); }
      }
    } else if (kind === 'sq') {
      for (let k = 0; k < 5; k++) g.appendChild(sv('rect', { x: bx + k * 30 + 1, y: base - 4, width: 28, height: 4, class: 'ld-cell sq' }));
      g.appendChild(sv('rect', { x: bx + 62, y: base - 12, width: 12, height: 12, class: 'ld-cell t2' }));
    } else {
      for (let k = 0; k < 5; k++) g.appendChild(sv('rect', { x: bx + k * 30 + 1, y: base - 3, width: 28, height: 3, class: 'ld-cell sq' }));
      g.appendChild(sv('rect', { x: bx + 32, y: base - 12, width: 12, height: 12, class: 'ld-cell t2' })); g.appendChild(sv('rect', { x: bx + 110, y: base - 12, width: 12, height: 12, class: 'ld-cell t2' }));
      g.appendChild(sv('circle', { cx: bx + 78, cy: base - 20, r: 7, class: 'ld-mac' }));
      g.appendChild(sv('rect', { x: bx, y: base + 2, width: bw, height: 6, rx: 3, class: 'ld-capb' }));
    }
    g.appendChild(svt(bx, mid - 17, hidden ? '' : lv.ep, { class: 'ld-ep' }));
    // the wall in words
    const wtext = hidden ? '' : lv.wall;
    const lines = []; let cur = '';
    wtext.split(' ').forEach(w => { if ((cur + ' ' + w).length > 34) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }); if (cur) lines.push(cur);
    lines.slice(0, 3).forEach((ln, k) => g.appendChild(svt(560, mid - 10 + k * 12, ln + (k === 2 && lines.length > 3 ? ' …' : ''), { class: 'ld-wtext' })));
    const pick = () => { if (ladderQuiz && !ladderQuiz.done) { ladderAnswer(lv.id); return; } ladderSel = ladderSel === lv.id ? '' : lv.id; render(); };
    g.addEventListener('click', pick); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    g.appendChild(sv('title', {})).textContent = hidden ? 'Tap to answer' : lv.name + ' — ' + lv.ep;
    svg.appendChild(g);
  });
  const sel = L.filter(x => x.id === ladderSel)[0];
  const detail = sel ? h('div', { class: 'ld-detail', 'data-level-detail': sel.id }, [
    h('p', { class: 'an-name' }, [h('b', { text: sel.name }), h('span', { class: 'tf', text: sel.gen }), h('span', { class: 'tf', text: sel.dia })]),
    h('p', {}, [h('span', { class: 'lbl', text: 'Epithelium. ' }), sel.ep + '.']),
    h('p', {}, [h('span', { class: 'lbl', text: 'Cells. ' }), sel.cells.join(', ') + '.']),
    h('p', {}, [h('span', { class: 'lbl', text: 'Wall. ' }), sel.wall + '.']),
    h('p', {}, [h('span', { class: 'lbl', text: 'Note. ' }), sel.note])
  ]) : h('p', { class: 'fine', text: 'Tap a level for its cells and what they do.' });
  const labId = uid('ldl');
  const opts = h('div', { class: 'an-3d-modes' }, [
    h('label', { class: 'chk-inline', for: labId }, [h('input', { type: 'checkbox', id: labId, checked: ladderLabels, 'data-ladder-labels': '1', onchange: (e) => { ladderLabels = e.target.checked; render(); } }), 'Labels']),
    ladderQuiz ? null : h('button', { type: 'button', class: 'btn sm', 'data-ldq-start': '1', text: 'Quiz: find the level', onclick: () => { ladderQuiz = { n: 0, score: 0, done: false }; ladderNext(); } })
  ]);
  let quiz = null;
  if (ladderQuiz) {
    const q = ladderQuiz;
    quiz = h('div', { class: 'an-drill on', 'data-ldq': q.done ? 'done' : 'on' }, [
      h('p', {}, [h('span', { class: 'lbl', text: 'Tap the level: ' }), h('b', { text: q.q[0] }), ' ', h('span', { class: 'fine', text: 'Question ' + q.n + ' · score ' + q.score })]),
      q.done ? h('p', { class: 'an-found', text: 'Correct — ' + L.filter(x => x.id === q.q[1][0])[0].name + (q.tries > 1 ? ' (after ' + q.tries + ' taps).' : '.') }) : (q.wrong ? h('p', { class: 'an-wrong', text: 'That is the ' + L.filter(x => x.id === q.wrong)[0].name.toLowerCase() + '. Try again.' }) : null),
      h('div', { class: 'an-drill-acts' }, [h('button', { type: 'button', class: 'btn sm', 'data-ldq-next': '1', text: q.done ? 'Next' : 'Skip', onclick: ladderNext }), h('button', { type: 'button', class: 'btn sm quiet', 'data-ldq-stop': '1', text: 'Stop the quiz', onclick: () => { ladderQuiz = null; render(); } })])
    ]);
  }
  const legend = h('div', { class: 'an-lgd' }, [['col', 'ciliated columnar'], ['goblet', 'goblet'], ['club', 'club'], ['cub', 'cuboidal'], ['sq', 'squamous / type I'], ['t2', 'type II'], ['mac', 'macrophage'], ['cart', 'cartilage'], ['sm', 'smooth muscle']].map(x => h('span', { class: 'an-lg ld-' + x[0] }, [h('i'), x[1]])));
  return h('figure', { class: 'an-fig an-ladder-fig', 'data-ladder': '1' }, [opts, svg, legend, quiz, detail,
    h('figcaption', { text: 'The respiratory tree from the trachea (generation 0) to the alveoli (about generation 23): the tube narrows and its wall loses cartilage, then glands and goblet cells, then cilia and muscle, while the lining flattens from pseudostratified columnar to squamous. Drawn to teach, not to scale.' })]);
}
function ladderNext() {
  const q = ladderQuiz; if (!q) return;
  let pick; do { pick = LADDER_Q[Math.floor(Math.random() * LADDER_Q.length)]; } while (q.q && pick === q.q);
  q.q = pick; q.n++; q.tries = 0; q.done = false; q.wrong = ''; ladderSel = ''; render();
}
function ladderAnswer(id) {
  const q = ladderQuiz; q.tries++;
  if (q.q[1].indexOf(id) >= 0) { q.done = true; if (q.tries === 1) q.score++; q.wrong = ''; ladderSel = id; } else q.wrong = id;
  render();
}

/* ---- pressures over one quiet breath ---- */
function cycleFig() {
  const W = 560, H = 330, x0 = 40, x1 = 540, T = 4, ti = 1.6, tau = 0.5, VT = 0.5, R = 2;
  const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'ph-cycle', role: 'img', 'aria-label': 'Volume, flow, alveolar and pleural pressure over a quiet breath' });
  const xs = (t) => x0 + (x1 - x0) * t / T;
  // volume: a half-cosine in, a smooth exponential out (zero flow at the turn); flow is its derivative; alveolar pressure = flow × resistance; pleural = −5 − recoil(volume) + alveolar
  const vol = (t) => t < ti ? VT * (1 - Math.cos(Math.PI * t / ti)) / 2 : VT * Math.exp(-Math.pow((t - ti) / tau, 1.4));
  const flow = (t) => (vol(t + 0.004) - vol(t - 0.004)) / 0.008;
  const palv = (t) => -R * flow(t);
  const ppl = (t) => -5 - vol(t) * 5 + palv(t);
  const rows = [
    { name: 'Volume (L above FRC)', y0: 30, hgt: 50, lo: 0, hi: 0.5, f: vol, ticks: [0, 0.5], cls: 'vol' },
    { name: 'Flow (L/s)', y0: 100, hgt: 56, lo: -0.8, hi: 0.8, f: flow, ticks: [-0.5, 0, 0.5], cls: 'flow' },
    { name: 'Alveolar pressure (cm H2O)', y0: 176, hgt: 50, lo: -1.6, hi: 1.6, f: palv, ticks: [-1, 0, 1], cls: 'palv' },
    { name: 'Pleural pressure (cm H2O)', y0: 246, hgt: 60, lo: -9, hi: -4, f: ppl, ticks: [-8, -5], cls: 'ppl' }
  ];
  svg.appendChild(sv('rect', { x: xs(0), y: 18, width: xs(ti) - xs(0), height: H - 30, class: 'ph-insp' }));
  svg.appendChild(svt((xs(0) + xs(ti)) / 2, 14, 'inspiration', { class: 'ph-ph', 'text-anchor': 'middle' }));
  svg.appendChild(svt((xs(ti) + xs(T)) / 2, 14, 'expiration', { class: 'ph-ph', 'text-anchor': 'middle' }));
  rows.forEach(r => {
    const ys = (v) => r.y0 + r.hgt - (v - r.lo) / (r.hi - r.lo) * r.hgt;
    r.ticks.forEach(tk => { svg.appendChild(sv('line', { x1: x0, y1: ys(tk), x2: x1, y2: ys(tk), class: 'ph-grid' + (tk === 0 || tk === -5 ? ' zero' : '') })); svg.appendChild(svt(x0 - 4, ys(tk) + 3, String(tk), { class: 'ph-tick', 'text-anchor': 'end' })); });
    let d = ''; for (let i = 0; i <= 240; i++) { const t = 0.004 + (T - 0.008) * i / 240; d += (i ? ' L' : 'M') + xs(t).toFixed(1) + ' ' + ys(r.f(t)).toFixed(1); }
    svg.appendChild(sv('path', { d: d, class: 'ph-tr ' + r.cls }));
    svg.appendChild(svt(x1 - 2, r.y0 + 9, r.name, { class: 'ph-rl ' + r.cls, 'text-anchor': 'end' }));
  });
  [0, 1, 2, 3, 4].forEach(t => svg.appendChild(svt(xs(t), H - 6, t + ' s', { class: 'ph-tick', 'text-anchor': 'middle' })));
  return h('figure', { class: 'an-fig ph-cycle-fig', 'data-cycle': '1' }, [svg, h('figcaption', { text: 'A quiet breath. The muscles pull the pleural pressure down from −5; alveolar pressure follows it below the mouth and gas flows in until, at end-inspiration, alveolar pressure is back to zero and the whole fall in pleural pressure is transpulmonary (holding the extra half litre). Expiration is passive: recoil raises the alveolar pressure above the mouth and the lung empties along its time constant. The part of the pleural swing that is spent on flow (the dip at mid-inspiration) is the resistive work; the part that holds volume is the elastic work.' })]);
}

/* ---- the spirogram with the volumes and the capacities ---- */
const SPIRO_NOTE = {
  TV: 'Tidal volume: a quiet breath, about 500 mL (6–8 mL/kg).', IRV: 'Inspiratory reserve volume: what can still be inhaled after a quiet breath, about 3 L.', ERV: 'Expiratory reserve volume: what can still be exhaled after a quiet breath, about 1.2 L; the first to go with obesity, pregnancy and lying down.',
  RV: 'Residual volume: what stays after a full exhalation, about 1.2 L (20–25% of TLC); not measurable by spirometry.', IC: 'Inspiratory capacity = VT + IRV, about 3.5 L; falls with hyperinflation and is the volume that shrinks on exercise in COPD.', FRC: 'Functional residual capacity = ERV + RV, about 2.5–3 L: the resting volume where the recoils balance; the oxygen store during apnoea.',
  VC: 'Vital capacity = IRV + VT + ERV, about 4.5 L: everything that can be moved; forced (FVC) when exhaled fast.', TLC: 'Total lung capacity = VC + RV, about 6 L; low in restriction, high in emphysema.'
};
let spiroSel = '';
function spiroFig() {
  const W = 590, H = 300, x0 = 20, x1 = 410, y0 = 20, y1 = 280, L = (v) => y1 - (y1 - y0) * v / 6;
  const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'ph-spiro', role: 'img', 'aria-label': 'Spirogram with the lung volumes and capacities' });
  const bands = [['IRV', 3.0, 6.0], ['TV', 2.5, 3.0], ['ERV', 1.2, 2.5], ['RV', 0, 1.2]];
  bands.forEach(b => { const g = sv('g', { class: 'sp-band' + (spiroSel === b[0] ? ' on' : ''), 'data-vol': b[0], tabindex: '0' }); g.appendChild(sv('rect', { x: x0, y: L(b[2]), width: x1 - x0, height: L(b[1]) - L(b[2]), class: 'sp-' + b[0] })); g.appendChild(svt(b[0] === 'TV' ? x1 - 8 : x0 + 6, (L(b[1]) + L(b[2])) / 2 + 4, b[0], { class: 'sp-lab', 'text-anchor': b[0] === 'TV' ? 'end' : 'start' })); g.appendChild(sv('title', {})).textContent = SPIRO_NOTE[b[0]]; const on = () => { spiroSel = b[0]; spiroNote(); }; g.addEventListener('mouseenter', on); g.addEventListener('focus', on); g.addEventListener('click', on); svg.appendChild(g); });
  // the trace: quiet breaths, a maximal inspiration, a maximal expiration, quiet breaths
  let d = '', t = 0; const pts = [];
  const seg = (fn, dur, n) => { for (let i = 0; i <= n; i++) { const u = i / n; pts.push([t + dur * u, fn(u)]); } t += dur; };
  for (let k = 0; k < 3; k++) seg(u => 2.5 + 0.5 * (1 - Math.cos(2 * Math.PI * u)) / 2, 1, 24);
  seg(u => 2.5 + 3.5 * (1 - Math.cos(Math.PI * u)) / 2, 1.4, 30);
  seg(u => 6 - 4.8 * (1 - Math.cos(Math.PI * u)) / 2, 1.8, 30);
  seg(u => 1.2 + 1.3 * (1 - Math.cos(Math.PI * u)) / 2, 0.8, 20);
  for (let k = 0; k < 2; k++) seg(u => 2.5 + 0.5 * (1 - Math.cos(2 * Math.PI * u)) / 2, 1, 24);
  pts.forEach((p, i) => { d += (i ? ' L' : 'M') + (x0 + (x1 - x0) * p[0] / t).toFixed(1) + ' ' + L(p[1]).toFixed(1); });
  svg.appendChild(sv('path', { d: d, class: 'sp-trace' }));
  // the capacities as brackets on the right
  const caps = [['IC', 2.5, 6.0, 462], ['FRC', 0, 2.5, 462], ['VC', 1.2, 6.0, 506], ['TLC', 0, 6.0, 548]];
  caps.forEach(c => { const g = sv('g', { class: 'sp-cap' + (spiroSel === c[0] ? ' on' : ''), 'data-vol': c[0], tabindex: '0' }); g.appendChild(sv('line', { x1: c[3], y1: L(c[1]), x2: c[3], y2: L(c[2]), class: 'sp-br' })); g.appendChild(sv('line', { x1: c[3] - 5, y1: L(c[1]), x2: c[3] + 5, y2: L(c[1]), class: 'sp-br' })); g.appendChild(sv('line', { x1: c[3] - 5, y1: L(c[2]), x2: c[3] + 5, y2: L(c[2]), class: 'sp-br' })); g.appendChild(svt(c[3] + 8, (L(c[1]) + L(c[2])) / 2 + 4, c[0], { class: 'sp-lab' })); g.appendChild(sv('title', {})).textContent = SPIRO_NOTE[c[0]]; const on = () => { spiroSel = c[0]; spiroNote(); }; g.addEventListener('mouseenter', on); g.addEventListener('focus', on); g.addEventListener('click', on); svg.appendChild(g); });
  [0, 1, 2, 3, 4, 5, 6].forEach(v => svg.appendChild(svt(x1 + 4, L(v) + 3, v + ' L', { class: 'ph-tick' })));
  const note = h('p', { class: 'fine sp-note', 'data-spiro-note': '1', text: spiroSel ? SPIRO_NOTE[spiroSel] : 'Hover or tap a volume or a capacity.' });
  function spiroNote() { note.textContent = SPIRO_NOTE[spiroSel] || ''; svg.querySelectorAll('[data-vol]').forEach(el => el.classList.toggle('on', el.getAttribute('data-vol') === spiroSel)); }
  return h('figure', { class: 'an-fig ph-spiro-fig', 'data-spiro': '1' }, [svg, note, h('figcaption', { text: 'Three quiet breaths, a maximal inspiration to TLC, a maximal expiration to RV, and back to quiet breathing. The four volumes do not overlap; the four capacities are sums of them. Everything that includes the residual volume — FRC and TLC — is beyond the spirometer and needs gas dilution or the body box.' })]);
}

/* ---- the alveolar gas equation and the A–a gradient ---- */
function aaCalc() {
  const st = { fio2: 21, pb: 760, paco2: 40, pao2: 90, age: 40, rq: 0.8 };
  const out = h('div', { class: 'nod-out', 'data-aa-out': '1' });
  const fld = (key, label, min, max, step) => { const id = uid('aa'); return h('label', { class: 'nod-f', for: id }, [h('span', { class: 'nod-l', text: label }), h('input', { type: 'number', class: 'num', id: id, 'data-aa': key, min: min, max: max, step: step, value: st[key], oninput: (e) => { const v = +e.target.value; if (isFinite(v)) { st[key] = v; calc(); } } })]); };
  function calc() {
    const PA = PH.pao2(st.fio2 / 100, st.pb, st.paco2, st.rq), aa = PA - st.pao2, norm = PH.aaNormal(st.age), pf = st.pao2 / (st.fio2 / 100);
    const expOnAir = st.fio2 <= 21.5 ? '' : ' On this FiO2 the gradient widens even in health (roughly 5–7 mm Hg per 10% of FiO2), so judge by the PaO2/FiO2 ratio as well.';
    let read;
    if (st.pao2 >= 80 && st.fio2 <= 21.5) read = 'No hypoxaemia on air.';
    else if (aa <= norm + 5) read = 'Hypoxaemia with a normal gradient: hypoventilation (the PaCO2 says how much) or a low inspired oxygen pressure — the lung itself is transferring gas normally.';
    else read = 'A wide gradient: the lung is the problem — V/Q mismatch, shunt or diffusion limitation. If oxygen fails to raise the PaO2, shunt; if the fall is worst on exercise, diffusion.';
    out.textContent = '';
    out.appendChild(h('div', { class: 'aa-grid' }, [
      h('div', {}, [h('span', { class: 'lbl', text: 'PIO2 ' }), (st.fio2 / 100 * (st.pb - 47)).toFixed(0) + ' mm Hg']),
      h('div', {}, [h('span', { class: 'lbl', text: 'PAO2 ' }), PA.toFixed(0) + ' mm Hg']),
      h('div', {}, [h('span', { class: 'lbl', text: 'A–a ' }), h('b', { 'data-aa-val': '1', text: aa.toFixed(0) + ' mm Hg' }), ' (normal for age ≤ ' + norm.toFixed(0) + ')']),
      h('div', {}, [h('span', { class: 'lbl', text: 'PaO2/FiO2 ' }), pf.toFixed(0)])
    ]));
    out.appendChild(h('p', { 'data-aa-read': '1', text: read + expOnAir }));
  }
  calc();
  return h('div', { class: 'nod-calc', 'data-aa-calc': '1' }, [h('h3', { text: 'Alveolar gas and the A–a gradient' }),
    h('div', { class: 'nod-grid' }, [fld('fio2', 'FiO2 (%)', 21, 100, 1), fld('pb', 'Barometric pressure (mm Hg)', 300, 800, 1), fld('paco2', 'PaCO2 (mm Hg)', 10, 120, 1), fld('pao2', 'PaO2 (mm Hg)', 20, 600, 1), fld('age', 'Age (years)', 1, 100, 1), fld('rq', 'Respiratory quotient', 0.7, 1.0, 0.05)]),
    out, h('p', { class: 'fine', text: 'PAO2 = FiO2 × (PB − 47) − PaCO2/RQ; A–a = PAO2 − PaO2; the normal gradient grows with age (≈ 2.5 + 0.21 × age). Denver sits at 630 mm Hg, Everest base camp at 400.' })]);
}

/* ---- the oxygen dissociation curve lab ---- */
const ODC = { ph: 7.4, temp: 37, pco2: 40, dpg: 1, cohb: 0, hb: 15, myo: false, pao2: 95, pvo2: 40 };
function odcLab() {
  const W = 520, H = 330, x0 = 48, x1 = 500, y0 = 16, y1 = 290;
  const X = (p) => x0 + (x1 - x0) * p / 100, Y = (s) => y1 - (y1 - y0) * s;
  const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'ph-odc', role: 'img', 'aria-label': 'Oxygen–haemoglobin dissociation curve' });
  for (let p = 0; p <= 100; p += 20) { svg.appendChild(sv('line', { x1: X(p), y1: y0, x2: X(p), y2: y1, class: 'ph-grid' })); svg.appendChild(svt(X(p), y1 + 14, String(p), { class: 'ph-tick', 'text-anchor': 'middle' })); }
  for (let s = 0; s <= 1; s += 0.25) { svg.appendChild(sv('line', { x1: x0, y1: Y(s), x2: x1, y2: Y(s), class: 'ph-grid' })); svg.appendChild(svt(x0 - 4, Y(s) + 3, Math.round(s * 100) + '%', { class: 'ph-tick', 'text-anchor': 'end' })); }
  svg.appendChild(svt((x0 + x1) / 2, H - 4, 'PO2 (mm Hg)', { class: 'ph-tick', 'text-anchor': 'middle' }));
  const norm = sv('path', { class: 'odc-norm' }), cur = sv('path', { class: 'odc-cur' }), myo = svHide(sv('path', { class: 'odc-myo' }), true);
  const artP = sv('circle', { r: 5, class: 'odc-pt art' }), venP = sv('circle', { r: 5, class: 'odc-pt ven' }), p50L = sv('line', { class: 'odc-p50' }), p50T = svt(0, 0, '', { class: 'ph-tick odc-p50t' });
  const artT = svt(0, 0, 'arterial', { class: 'odc-lab' }), venT = svt(0, 0, 'venous', { class: 'odc-lab' });
  [norm, myo, cur, p50L, p50T, artP, venP, artT, venT].forEach(e => svg.appendChild(e));
  const read = h('div', { class: 'odc-read', 'data-odc-read': '1' });
  const curve = (p50v) => { let d = ''; for (let i = 0; i <= 100; i++) { const p = i; d += (i ? ' L' : 'M') + X(p).toFixed(1) + ' ' + Y(PH.sat(p, p50v)).toFixed(1); } return d; };
  norm.setAttribute('d', curve(26.8));
  { let d = ''; for (let i = 0; i <= 100; i++) d += (i ? ' L' : 'M') + X(i).toFixed(1) + ' ' + Y(i / (i + 2.8)).toFixed(1); myo.setAttribute('d', d); }
  function draw() {
    const p50v = PH.p50(ODC) * (1 - 0.55 * ODC.cohb / 100);   // CO binds some sites and makes the rest hold tighter
    cur.setAttribute('d', curve(p50v));
    svHide(myo, !ODC.myo);
    const sa = PH.sat(ODC.pao2, p50v), svv = PH.sat(ODC.pvo2, p50v), avail = ODC.hb * (1 - ODC.cohb / 100);
    const ca = PH.o2content(avail, sa, ODC.pao2), cv = PH.o2content(avail, svv, ODC.pvo2);
    artP.setAttribute('cx', X(ODC.pao2)); artP.setAttribute('cy', Y(sa)); venP.setAttribute('cx', X(ODC.pvo2)); venP.setAttribute('cy', Y(svv));
    artT.setAttribute('x', X(ODC.pao2) + 8); artT.setAttribute('y', Y(sa) + 14); venT.setAttribute('x', X(ODC.pvo2) + 8); venT.setAttribute('y', Y(svv) + 14);
    p50L.setAttribute('x1', X(p50v)); p50L.setAttribute('x2', X(p50v)); p50L.setAttribute('y1', Y(0.5)); p50L.setAttribute('y2', y1);
    p50T.setAttribute('x', X(p50v) + 3); p50T.setAttribute('y', Y(0.5) - 4); p50T.textContent = 'P50 ' + p50v.toFixed(1);
    const shift = p50v > 28 ? 'right shift (easier unloading)' : (p50v < 25.5 ? 'left shift (tighter binding)' : 'no shift');
    read.textContent = '';
    read.appendChild(h('div', { class: 'aa-grid' }, [
      h('div', {}, [h('span', { class: 'lbl', text: 'P50 ' }), h('b', { 'data-odc-p50': '1', text: p50v.toFixed(1) + ' mm Hg' }), ' — ' + shift]),
      h('div', {}, [h('span', { class: 'lbl', text: 'SaO2 at PaO2 ' + ODC.pao2 + ': ' }), h('b', { 'data-odc-sa': '1', text: (sa * 100).toFixed(1) + '%' })]),
      h('div', {}, [h('span', { class: 'lbl', text: 'SvO2 at PvO2 ' + ODC.pvo2 + ': ' }), (svv * 100).toFixed(1) + '%']),
      h('div', {}, [h('span', { class: 'lbl', text: 'Arterial content ' }), h('b', { 'data-odc-ca': '1', text: ca.toFixed(1) + ' mL/dL' }), ODC.cohb ? ' (' + ODC.cohb + '% of the haemoglobin carries CO)' : '']),
      h('div', {}, [h('span', { class: 'lbl', text: 'Venous content ' }), cv.toFixed(1) + ' mL/dL — ' + (ca - cv).toFixed(1) + ' mL/dL extracted']),
      h('div', {}, [h('span', { class: 'lbl', text: 'Delivery at 5 L/min ' }), (ca * 50).toFixed(0) + ' mL/min'])
    ]));
  }
  const sl = (key, label, min, max, step, fmt) => { const id = uid('od'); const inp = h('input', { type: 'range', id: id, min: min, max: max, step: step, value: ODC[key], 'data-odc': key, oninput: (e) => { ODC[key] = +e.target.value; val.textContent = fmt(ODC[key]); draw(); } }); const val = h('span', { class: 'odc-val', text: fmt(ODC[key]) }); return h('label', { class: 'odc-sl', for: id }, [h('span', { class: 'nod-l', text: label }), inp, val]); };
  const myoId = uid('my');
  const ctrls = h('div', { class: 'odc-ctrls' }, [
    sl('ph', 'pH', 6.9, 7.7, 0.02, v => v.toFixed(2)), sl('temp', 'Temperature (°C)', 30, 42, 0.5, v => v.toFixed(1)), sl('pco2', 'PCO2 (mm Hg)', 20, 80, 1, v => String(v)), sl('dpg', '2,3-DPG (× normal)', 0, 2, 0.1, v => v.toFixed(1) + '×'),
    sl('cohb', 'Carboxyhaemoglobin (%)', 0, 60, 1, v => v + '%'), sl('hb', 'Haemoglobin (g/dL)', 5, 20, 0.5, v => v.toFixed(1)), sl('pao2', 'PaO2 (mm Hg)', 30, 100, 1, v => String(v)), sl('pvo2', 'PvO2 (mm Hg)', 15, 60, 1, v => String(v)),
    h('label', { class: 'chk-inline', for: myoId }, [h('input', { type: 'checkbox', id: myoId, checked: ODC.myo, 'data-odc-myo': '1', onchange: (e) => { ODC.myo = e.target.checked; draw(); } }), 'Show myoglobin']),
    h('button', { type: 'button', class: 'lnk', 'data-odc-reset': '1', text: 'Reset', onclick: () => { Object.assign(ODC, { ph: 7.4, temp: 37, pco2: 40, dpg: 1, cohb: 0, hb: 15, myo: false, pao2: 95, pvo2: 40 }); render(); } })
  ]);
  draw();
  return h('figure', { class: 'an-fig ph-odc-fig', 'data-odc': '1' }, [h('div', { class: 'odc-grid' }, [svg, ctrls]), read,
    h('figcaption', { text: 'The grey curve is normal (P50 26.8 mm Hg); the coloured one is yours. Acid, carbon dioxide, heat and 2,3-DPG push it right and the tissues get more at the same PO2; alkali, cold, low DPG, carbon monoxide and fetal haemoglobin pull it left. Carbon monoxide also takes sites, so the content falls like anaemia while the saturation of what remains looks normal to a pulse oximeter. Myoglobin, a monomer, is the hyperbola far to the left.' })]);
}

/* ---- the heart–lung lab: the Campbell diagram beside the Guyton diagram ---- */
const HLS = { p: Object.assign({}, HL.DEF), run: null, phase: 0, playing: true, raf: 0, t0: 0, trace: [] };
function hlRun() { HLS.run = HL.run(HLS.p); return HLS.run; }
function hlLab() {
  const run = hlRun();
  const p = HLS.p;
  // ---------- the Campbell diagram ----------
  const CW = 420, CH = 340, cx0 = 52, cx1 = 408, cy0 = 14, cy1 = 300, PMIN = -32, PMAX = 36;
  const X = (pr) => cx0 + (cx1 - cx0) * (pr - PMIN) / (PMAX - PMIN), Y = (v) => cy1 - (cy1 - cy0) * v / 100;
  const camp = sv('svg', { viewBox: '0 0 ' + CW + ' ' + CH, class: 'hl-svg hl-camp', role: 'img', 'aria-label': 'Campbell diagram: lung volume against pleural pressure' });
  for (let pr = -30; pr <= 30; pr += 10) { camp.appendChild(sv('line', { x1: X(pr), y1: cy0, x2: X(pr), y2: cy1, class: 'ph-grid' + (pr === 0 ? ' zero' : '') })); camp.appendChild(svt(X(pr), cy1 + 13, String(pr), { class: 'ph-tick', 'text-anchor': 'middle' })); }
  for (let v = 0; v <= 100; v += 25) { camp.appendChild(sv('line', { x1: cx0, y1: Y(v), x2: cx1, y2: Y(v), class: 'ph-grid' })); camp.appendChild(svt(cx0 - 4, Y(v) + 3, v + '%', { class: 'ph-tick', 'text-anchor': 'end' })); }
  camp.appendChild(svt((cx0 + cx1) / 2, CH - 4, p.mode === 'vent' ? 'pressure (cm H2O): pleural for the lung and chest wall curves, airway for Crs' : 'pleural pressure (cm H2O)', { class: 'ph-tick', 'text-anchor': 'middle' }));
  camp.appendChild(svt(cx0 + 4, cy0 + 10, 'lung volume (% VC)', { class: 'ph-tick' }));
  const elastic = sv('path', { class: 'hl-wel' }), resist = sv('path', { class: 'hl-wres' }), lungC = sv('path', { class: 'hl-lung' }), cwC = sv('path', { class: 'hl-cw' }), rsC = svHide(sv('path', { class: 'hl-rs' }), p.mode !== 'vent'), loop = sv('path', { class: 'hl-loop' }), loopIn = sv('path', { class: 'hl-loop in' }), loopAw = svHide(sv('path', { class: 'hl-loop aw' }), p.mode !== 'vent');
  const frcL = sv('line', { class: 'hl-frc' }), frcT = svt(0, 0, 'FRC', { class: 'hl-t' }), veeL = sv('line', { class: 'hl-vee' }), veeT = svt(0, 0, '', { class: 'hl-t warn' });
  const dot = sv('circle', { r: 5, class: 'hl-dot' }), pmusL = sv('line', { class: 'hl-pmus' }), pmusT = svt(0, 0, '', { class: 'hl-t' });
  const lungT = svt(0, 0, 'lung', { class: 'hl-t lung' }), cwT = svt(0, 0, 'chest wall', { class: 'hl-t cw' }), rsT = svHide(svt(0, 0, 'Crs (airway pressure)', { class: 'hl-t rs' }), p.mode !== 'vent');
  [elastic, resist, lungC, cwC, rsC, loop, loopIn, loopAw, frcL, frcT, veeL, veeT, pmusL, pmusT, lungT, cwT, rsT, dot].forEach(e => camp.appendChild(e));
  // ---------- the Guyton diagram ----------
  const GW = 420, GH = 340, gx0 = 52, gx1 = 408, gy0 = 14, gy1 = 300, QMIN = -8, QMAX = 18, FMAX = 10;
  const GX = (pr) => gx0 + (gx1 - gx0) * (pr - QMIN) / (QMAX - QMIN), GY = (f) => gy1 - (gy1 - gy0) * f / FMAX;
  const guy = sv('svg', { viewBox: '0 0 ' + GW + ' ' + GH, class: 'hl-svg hl-guy', role: 'img', 'aria-label': 'Guyton diagram: venous return and cardiac function against right atrial pressure' });
  for (let pr = -5; pr <= 15; pr += 5) { guy.appendChild(sv('line', { x1: GX(pr), y1: gy0, x2: GX(pr), y2: gy1, class: 'ph-grid' + (pr === 0 ? ' zero' : '') })); guy.appendChild(svt(GX(pr), gy1 + 13, String(pr), { class: 'ph-tick', 'text-anchor': 'middle' })); }
  for (let f = 0; f <= FMAX; f += 2) { guy.appendChild(sv('line', { x1: gx0, y1: GY(f), x2: gx1, y2: GY(f), class: 'ph-grid' })); guy.appendChild(svt(gx0 - 4, GY(f) + 3, String(f), { class: 'ph-tick', 'text-anchor': 'end' })); }
  guy.appendChild(svt((gx0 + gx1) / 2, GH - 4, 'right atrial pressure (mm Hg)', { class: 'ph-tick', 'text-anchor': 'middle' }));
  guy.appendChild(svt(gx0 + 4, gy0 + 10, 'blood flow (L/min)', { class: 'ph-tick' }));
  const vrGhost = sv('path', { class: 'hl-vr ghost' }), cfGhost = sv('path', { class: 'hl-cf ghost' }), vrC = sv('path', { class: 'hl-vr' }), cfC = sv('path', { class: 'hl-cf' });
  const op = sv('circle', { r: 5.5, class: 'hl-op' }), tm = sv('line', { class: 'hl-tm' }), tmA = sv('circle', { r: 3, class: 'hl-tm-end' }), tmB = sv('circle', { r: 3, class: 'hl-tm-end' }), tmT = svt(0, 0, '', { class: 'hl-t' });
  const pmsT = svt(0, 0, 'Pms', { class: 'hl-t vr' }), pplT = svt(0, 0, 'Ppl', { class: 'hl-t cf' }), coT = svt(0, 0, '', { class: 'hl-t' }), vrT = svt(0, 0, 'venous return', { class: 'hl-t vr' }), cfT = svt(0, 0, 'cardiac function', { class: 'hl-t cf' });
  [vrGhost, cfGhost, vrC, cfC, tm, tmA, tmB, tmT, pmsT, pplT, vrT, cfT, coT, op].forEach(e => guy.appendChild(e));
  // ---------- the strip: cardiac output and pleural pressure over the last breaths ----------
  const SW = 860, SH = 120, sx0 = 50, sx1 = 850;
  const strip = sv('svg', { viewBox: '0 0 ' + SW + ' ' + SH, class: 'hl-svg hl-strip', role: 'img', 'aria-label': 'Cardiac output and pleural pressure over the breaths' });
  const coTr = sv('path', { class: 'hl-cotr' }), pplTr = sv('path', { class: 'hl-ppltr' });
  strip.appendChild(svt(sx0 - 4, 18, 'CO', { class: 'ph-tick hl-co', 'text-anchor': 'end' })); strip.appendChild(svt(sx0 - 4, SH - 22, 'Ppl', { class: 'ph-tick hl-ppl', 'text-anchor': 'end' }));
  strip.appendChild(coTr); strip.appendChild(pplTr);
  // ---------- readouts ----------
  const reads = h('div', { class: 'hl-reads', 'data-hl-reads': '1' });
  function pathOf(fn, from, to, n, xf, yf) { let d = ''; for (let i = 0; i <= n; i++) { const v = from + (to - from) * i / n; const pr = fn(v); if (!isFinite(pr)) continue; d += (d ? ' L' : 'M') + xf(pr).toFixed(1) + ' ' + yf(v).toFixed(1); } return d; }
  function drawStatic() {
    const r = HLS.run, b = r.br, pp = r.p;
    lungC.setAttribute('d', pathOf(v => HL.lungPpl(v, pp) + (pp.mode === 'spont' ? pp.peep : 0), 1, 99, 80, X, Y));
    cwC.setAttribute('d', pathOf(v => HL.cwPpl(v, pp), 1, 99, 80, X, Y));
    svHide(rsC, pp.mode !== 'vent'); svHide(rsT, pp.mode !== 'vent'); svHide(loopAw, pp.mode !== 'vent');
    if (pp.mode === 'vent') { rsC.setAttribute('d', pathOf(v => HL.rsPaw(v, pp), 1, 99, 80, X, Y)); let vEdge = 99; for (let v = 1; v <= 99; v++) { if (HL.rsPaw(v, pp) >= PMAX - 1) { vEdge = v; break; } } rsT.setAttribute('x', cx1 - 2); rsT.setAttribute('text-anchor', 'end'); rsT.setAttribute('y', Y(Math.min(vEdge, 99)) - 6); }
    lungT.setAttribute('x', X(HL.lungPpl(88, pp) + (pp.mode === 'spont' ? pp.peep : 0)) - 4); lungT.setAttribute('y', Y(88)); lungT.setAttribute('text-anchor', 'end');
    cwT.setAttribute('x', X(HL.cwPpl(88, pp)) + 4); cwT.setAttribute('y', Y(88));
    // the loop
    const pts = b.pts, xOf = (q) => X(pp.mode === 'vent' ? q.ppl : q.ppl);
    let d = ''; pts.forEach((q, i) => { d += (i ? ' L' : 'M') + xOf(q).toFixed(1) + ' ' + Y(q.V).toFixed(1); }); loop.setAttribute('d', d + ' Z');
    let di = ''; pts.slice(0, 61).forEach((q, i) => { di += (i ? ' L' : 'M') + xOf(q).toFixed(1) + ' ' + Y(q.V).toFixed(1); }); loopIn.setAttribute('d', di);
    if (pp.mode === 'vent') { let da = ''; pts.forEach((q, i) => { da += (i ? ' L' : 'M') + X(Math.min(PMAX, q.paw)).toFixed(1) + ' ' + Y(q.V).toFixed(1); }); loopAw.setAttribute('d', da + ' Z'); }
    // the areas: elastic between the curves over the tidal range; resistive between the inspiratory limb and the static lung curve
    let de = ''; for (let i = 0; i <= 30; i++) { const v = b.vee + (b.vei - b.vee) * i / 30; de += (i ? ' L' : 'M') + X(HL.cwPpl(v, pp)).toFixed(1) + ' ' + Y(v).toFixed(1); }
    for (let i = 30; i >= 0; i--) { const v = b.vee + (b.vei - b.vee) * i / 30; de += ' L' + X(HL.lungPpl(v, pp) + (pp.mode === 'spont' ? pp.peep : 0)).toFixed(1) + ' ' + Y(v).toFixed(1); }
    elastic.setAttribute('d', de + ' Z');
    if (pp.mode === 'spont') {
      let dr = ''; pts.slice(0, 61).forEach((q, i) => { dr += (i ? ' L' : 'M') + X(q.ppl).toFixed(1) + ' ' + Y(q.V).toFixed(1); });
      for (let i = 30; i >= 0; i--) { const v = b.vee + (b.vei - b.vee) * i / 30; dr += ' L' + X(HL.lungPpl(v, pp) + pp.peep).toFixed(1) + ' ' + Y(v).toFixed(1); }
      resist.setAttribute('d', dr + ' Z');
    } else resist.setAttribute('d', '');
    frcL.setAttribute('x1', cx0); frcL.setAttribute('x2', cx1); frcL.setAttribute('y1', Y(b.frc)); frcL.setAttribute('y2', Y(b.frc)); frcT.setAttribute('x', cx1 - 2); frcT.setAttribute('y', Y(b.frc) - 3); frcT.setAttribute('text-anchor', 'end');
    const hyper = b.vee > b.frc + 0.5;
    svHide(veeL, !hyper); svHide(veeT, !hyper);
    if (hyper) { veeL.setAttribute('x1', cx0); veeL.setAttribute('x2', cx1); veeL.setAttribute('y1', Y(b.vee)); veeL.setAttribute('y2', Y(b.vee)); veeT.setAttribute('x', cx1 - 2); veeT.setAttribute('y', Y(b.vee) - 3); veeT.setAttribute('text-anchor', 'end'); veeT.textContent = b.autoPeep > 0.3 ? 'end-expiration · auto-PEEP ' + b.autoPeep.toFixed(1) : (pp.peep > 0 ? 'end-expiration on PEEP ' + pp.peep : 'end-expiration'); }
    // the muscle pressure at end-inspiration (spontaneous) or the plateau pressure (ventilator)
    if (pp.mode === 'spont') { const vI = b.vei, a = HL.lungPpl(vI, pp) + pp.peep, c = HL.cwPpl(vI, pp); pmusL.setAttribute('x1', X(a)); pmusL.setAttribute('x2', X(c)); pmusL.setAttribute('y1', Y(vI)); pmusL.setAttribute('y2', Y(vI)); pmusT.setAttribute('x', (X(a) + X(c)) / 2); pmusT.setAttribute('y', Y(vI) - 9); pmusT.setAttribute('text-anchor', 'middle'); pmusT.textContent = 'Pmus ' + b.pmus.toFixed(0); }
    else { const vI = b.vei, c = HL.cwPpl(vI, pp), aw = HL.rsPaw(vI, pp); pmusL.setAttribute('x1', X(c)); pmusL.setAttribute('x2', X(Math.min(PMAX, aw))); pmusL.setAttribute('y1', Y(vI)); pmusL.setAttribute('y2', Y(vI)); pmusT.setAttribute('x', (X(c) + X(Math.min(PMAX, aw))) / 2); pmusT.setAttribute('y', Y(vI) - 5); pmusT.setAttribute('text-anchor', 'middle'); pmusT.textContent = 'Ptp ' + (aw - c).toFixed(0) + ' · plateau ' + aw.toFixed(0); }
    // the Guyton curves at rest (ghost) — the live ones are drawn each frame
    const c0 = r.rest;
    vrGhost.setAttribute('d', pathOf(pr => c0.vr(pr), QMIN, c0.pms, 60, GX, GY).replace(/M/, 'M')); // placeholder, redone below with x as pressure
    vrGhost.setAttribute('d', vrPath(c0)); cfGhost.setAttribute('d', cfPath(c0));
    // readouts
    const perMin = (b.wEl + b.wRes) * pp.rr;
    reads.textContent = '';
    const row = (k, v, cls) => h('div', { class: 'hl-r' + (cls ? ' ' + cls : '') }, [h('span', { class: 'lbl', text: k }), h('b', { text: v })]);
    reads.appendChild(h('div', { class: 'hl-rg' }, [
      row('FRC', b.frc.toFixed(0) + '% VC (' + (b.frc / 100 * pp.vc).toFixed(2) + ' L)'),
      row('End-expiratory volume', b.vee.toFixed(0) + '% VC' + (hyper ? (b.trapped > 0.5 ? ' — hyperinflated by ' : ' — held above FRC by ') + ((b.vee - b.frc) / 100 * pp.vc * 1000).toFixed(0) + ' mL' + (b.trapped > 0.5 ? ' (trapped)' : ' (PEEP)') : ''), hyper && b.trapped > 0.5 ? 'warn' : ''),
      row('Auto-PEEP', b.autoPeep.toFixed(1) + ' cm H2O', b.autoPeep > 2 ? 'warn' : ''),
      row('Time constant', b.tau.toFixed(2) + ' s (expiration ' + b.te.toFixed(1) + ' s)'),
      row('Compliance (lung / chest wall / system)', b.cl.toFixed(0) + ' / ' + b.ccw.toFixed(0) + ' / ' + b.crs.toFixed(0) + ' mL/cm H2O'),
      row(pp.mode === 'spont' ? 'Muscle pressure at end-inspiration' : 'Plateau pressure', pp.mode === 'spont' ? b.pmus.toFixed(1) + ' cm H2O' : HL.rsPaw(b.vei, pp).toFixed(1) + ' cm H2O (driving ' + (HL.rsPaw(b.vei, pp) - Math.max(pp.peep, HL.rsPaw(b.vee, pp))).toFixed(1) + ')'),
      row('Pleural pressure, end-expiration → end-inspiration', b.pts[0].ppl.toFixed(1) + ' → ' + b.pts[60].ppl.toFixed(1) + ' cm H2O'),
      row('Work per breath (elastic + resistive)', b.wEl.toFixed(2) + ' + ' + b.wRes.toFixed(2) + ' J = ' + (b.wEl + b.wRes).toFixed(2) + ' J · ' + perMin.toFixed(1) + ' J/min'),
      row('Mean systemic pressure / collapse pressure', c0.pms.toFixed(1) + ' / ' + c0.pcrit.toFixed(1) + ' mm Hg'),
      row('Right atrial pressure, end-expiration → end-inspiration', r.rest.pra.toFixed(1) + ' → ' + r.top.pra.toFixed(1) + ' mm Hg'),
      row('Transmural (filling) pressure', r.rest.ptm.toFixed(1) + ' → ' + r.top.ptm.toFixed(1) + ' mm Hg'),
      row('Cardiac output', r.rest.co.toFixed(2) + ' → ' + r.top.co.toFixed(2) + ' L/min · swing over the breath ' + (r.coVar * 100).toFixed(0) + '%', r.coVar > 0.25 ? 'warn' : '')
    ]));
  }
  function vrPath(c) { let d = ''; for (let i = 0; i <= 80; i++) { const pr = QMIN + (QMAX - QMIN) * i / 80; const f = c.vr(pr); d += (i ? ' L' : 'M') + GX(pr).toFixed(1) + ' ' + GY(Math.min(FMAX, f)).toFixed(1); } return d; }
  function cfPath(c) { let d = ''; for (let i = 0; i <= 80; i++) { const pr = QMIN + (QMAX - QMIN) * i / 80; const f = c.cf(pr); d += (i ? ' L' : 'M') + GX(pr).toFixed(1) + ' ' + GY(Math.min(FMAX, f)).toFixed(1); } return d; }
  function drawFrame(phase) {
    const r = HLS.run, b = r.br, pp = r.p, n = b.pts.length - 1, i = Math.max(0, Math.min(n, Math.round(phase * n)));
    const q = r.cyc[i], c = HL.circ(q.V, q.ppl, pp, b);
    dot.setAttribute('cx', X(q.ppl)); dot.setAttribute('cy', Y(q.V));
    vrC.setAttribute('d', vrPath(c)); cfC.setAttribute('d', cfPath(c));
    op.setAttribute('cx', GX(c.pra)); op.setAttribute('cy', GY(Math.min(FMAX, c.co)));
    tm.setAttribute('x1', GX(c.pplMm)); tm.setAttribute('x2', GX(c.pra)); tm.setAttribute('y1', GY(0) + 0); tm.setAttribute('y2', GY(0) + 0);
    tmA.setAttribute('cx', GX(c.pplMm)); tmA.setAttribute('cy', GY(0)); tmB.setAttribute('cx', GX(c.pra)); tmB.setAttribute('cy', GY(0));
    tmT.setAttribute('x', (GX(c.pplMm) + GX(c.pra)) / 2); tmT.setAttribute('y', GY(0) - 8); tmT.setAttribute('text-anchor', 'middle'); tmT.textContent = 'transmural ' + c.ptm.toFixed(1);
    pmsT.setAttribute('x', GX(c.pms)); pmsT.setAttribute('y', GY(0) + 24); pmsT.setAttribute('text-anchor', 'middle'); pmsT.textContent = 'Pms ' + c.pms.toFixed(1);
    pplT.setAttribute('x', GX(c.pplMm)); pplT.setAttribute('y', GY(0) + 24); pplT.setAttribute('text-anchor', 'middle'); pplT.textContent = 'Ppl ' + c.pplMm.toFixed(1);
    coT.setAttribute('x', GX(c.pra) + 9); coT.setAttribute('y', GY(Math.min(FMAX, c.co)) + 16); coT.textContent = 'CO ' + c.co.toFixed(1) + ' · Pra ' + c.pra.toFixed(1);
    vrT.setAttribute('x', GX((c.pms + c.pcrit) / 2) + 6); vrT.setAttribute('y', GY(c.vr((c.pms + c.pcrit) / 2)) - 6);
    cfT.setAttribute('x', GX(QMAX - 0.5)); cfT.setAttribute('y', GY(Math.min(FMAX, c.cf(QMAX - 0.5))) - 8); cfT.setAttribute('text-anchor', 'end');
    // the strip
    HLS.trace.push([q.co, q.ppl]); if (HLS.trace.length > 240) HLS.trace.shift();
    const tr = HLS.trace, cos = tr.map(t => t[0]), ppls = tr.map(t => t[1]);
    const cmin = Math.min.apply(null, cos) - 0.3, cmax = Math.max.apply(null, cos) + 0.3, pmin = Math.min.apply(null, ppls) - 1, pmax = Math.max.apply(null, ppls) + 1;
    let dc = '', dp = '';
    tr.forEach((t, k) => { const x = sx0 + (sx1 - sx0) * k / 239; dc += (k ? ' L' : 'M') + x.toFixed(1) + ' ' + (8 + 44 * (1 - (t[0] - cmin) / (cmax - cmin))).toFixed(1); dp += (k ? ' L' : 'M') + x.toFixed(1) + ' ' + (64 + 44 * (1 - (t[1] - pmin) / (pmax - pmin))).toFixed(1); });
    coTr.setAttribute('d', dc); pplTr.setAttribute('d', dp);
    const ph = document.querySelector('[data-hl-phase]'); if (ph && !HLS.scrub) ph.value = String(Math.round(phase * 1000));
  }
  function frame(now) {
    HLS.raf = 0;
    if (!camp.isConnected) return;
    if (HLS.playing) { const T = HLS.run.br.T * 1000; HLS.phase = ((now - HLS.t0) % T) / T; drawFrame(HLS.phase); }
    HLS.raf = requestAnimationFrame(frame);
  }
  // ---------- controls ----------
  const sl = (key, label, min, max, step, fmt, title) => { const id = uid('hl'); const val = h('span', { class: 'odc-val', text: fmt(p[key]) }); const inp = h('input', { type: 'range', id: id, min: min, max: max, step: step, value: p[key], 'data-hl': key, oninput: (e) => { p[key] = +e.target.value; val.textContent = fmt(p[key]); hlRun(); drawStatic(); drawFrame(HLS.phase); } }); return h('label', { class: 'odc-sl', for: id, title: title || null }, [h('span', { class: 'nod-l', text: label }), inp, val]); };
  const modes = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Who drives the breath' }, [['spont', 'Spontaneous breath'], ['vent', 'Ventilator (passive)']].map(m => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-hl-mode': m[0], 'aria-checked': String(p.mode === m[0]), text: m[1], onclick: () => { p.mode = m[0]; HLS.trace = []; render(); } })));
  const presetSel = h('select', { class: 'learn-cat', 'data-hl-preset': '1', 'aria-label': 'Preset', onchange: (e) => { const pr = HL.PRESETS.filter(x => x.id === e.target.value)[0]; if (!pr) return; Object.assign(HLS.p, HL.DEF, pr.set); HLS.trace = []; render(); } }, [h('option', { value: '', text: 'Presets…' })].concat(HL.PRESETS.map(pr => h('option', { value: pr.id, text: pr.name }))));
  const playBtn = h('button', { type: 'button', class: 'btn sm', 'data-hl-play': '1', text: HLS.playing ? '❚❚ Pause' : '▶ Play', onclick: () => { HLS.playing = !HLS.playing; playBtn.textContent = HLS.playing ? '❚❚ Pause' : '▶ Play'; if (HLS.playing) { HLS.t0 = performance.now() - HLS.phase * HLS.run.br.T * 1000; } } });
  const scrub = h('input', { type: 'range', min: 0, max: 1000, step: 1, value: Math.round(HLS.phase * 1000), 'data-hl-phase': '1', 'aria-label': 'Point in the breath', class: 'hl-scrub', oninput: (e) => { HLS.playing = false; playBtn.textContent = '▶ Play'; HLS.scrub = true; HLS.phase = +e.target.value / 1000; drawFrame(HLS.phase); HLS.scrub = false; } });
  const ctrls = h('div', { class: 'hl-ctrls' }, [
    h('div', { class: 'hl-ctrl-row' }, [modes, presetSel, playBtn, scrub]),
    h('div', { class: 'hl-sliders' }, [
      h('div', { class: 'hl-slgroup' }, [h('h4', { text: 'The lungs and the chest' }),
        sl('cl', 'Lung compliance (× normal)', 0.3, 2.2, 0.05, v => v.toFixed(2) + '×', 'Low: fibrosis, oedema, ARDS, pneumonia. High: emphysema'),
        sl('ccw', 'Chest wall compliance (× normal)', 0.3, 2, 0.05, v => v.toFixed(2) + '×', 'Low: obesity, ascites, kyphoscoliosis, burns'),
        sl('cwShift', 'Chest wall load (cm H2O)', 0, 12, 0.5, v => v.toFixed(1), 'Pushes the chest wall curve right: a tense abdomen, obesity'),
        sl('raw', 'Airway resistance (cm H2O/L/s)', 1, 30, 0.5, v => v.toFixed(1), 'Normal 1–3; asthma or COPD exacerbation 10–25')]),
      h('div', { class: 'hl-slgroup' }, [h('h4', { text: 'The breath' }),
        sl('vt', 'Tidal volume (% VC)', 4, 45, 1, v => v + '% (' + (v / 100 * p.vc * 1000).toFixed(0) + ' mL)'),
        sl('rr', 'Rate (breaths/min)', 6, 40, 1, v => String(v)),
        sl('peep', p.mode === 'vent' ? 'PEEP (cm H2O)' : 'CPAP (cm H2O)', 0, 20, 1, v => String(v))]),
      h('div', { class: 'hl-slgroup' }, [h('h4', { text: 'The circulation' }),
        sl('pms', 'Mean systemic pressure (mm Hg)', 3, 16, 0.5, v => v.toFixed(1), 'Volume status and venous tone: hypovolaemia 4–5, fluid overload 12+'),
        sl('contr', 'Contractility (× normal)', 0.3, 1.8, 0.05, v => v.toFixed(2) + '×'),
        sl('pvr', 'Pulmonary vascular tone (× normal)', 0.6, 3.5, 0.1, v => v.toFixed(1) + '×', 'Hypoxia, embolism, pulmonary hypertension: afterload on the right ventricle')])
    ])
  ]);
  const legend = h('div', { class: 'an-lgd hl-lgd' }, [['lung', 'lung (static)'], ['cw', 'chest wall'], ['rs', 'respiratory system (airway pressure)'], ['loop', 'the breath'], ['wel', 'elastic work'], ['wres', 'resistive work'], ['vr', 'venous return'], ['cf', 'cardiac function'], ['op', 'operating point']].map(x => h('span', { class: 'an-lg hl-' + x[0] }, [h('i'), x[1]])));
  const fig = h('figure', { class: 'an-fig hl-lab', 'data-hl': '1' }, [ctrls, h('div', { class: 'hl-grid' }, [h('div', { class: 'hl-pane' }, [h('h4', { text: 'Campbell: the chest' }), camp]), h('div', { class: 'hl-pane' }, [h('h4', { text: 'Guyton: the circulation' }), guy])]), strip, legend, reads,
    h('figcaption', { text: 'Left: lung volume against pleural pressure — the static lung curve (red) and chest wall curve (blue) cross at FRC; the loop is one breath (dark on inspiration); the shaded triangle is the elastic work, the sliver beside the inspiratory limb the resistive work; the horizontal bar at end-inspiration is the muscle pressure holding that volume (or, on the ventilator, the transpulmonary pressure out to the plateau on the light-blue respiratory-system curve). Right: blood flow against right atrial pressure — the venous return line falls from the mean systemic pressure to the collapse plateau; the cardiac function curve starts at the pleural pressure and slides along the axis with every breath; the dot is where the two meet, and the dumbbell under it is the transmural pressure the heart fills by. Below: cardiac output and pleural pressure over the last breaths.' })]);
  drawStatic(); drawFrame(HLS.phase);
  HLS.t0 = performance.now() - HLS.phase * run.br.T * 1000;
  if (!HLS.raf) HLS.raf = requestAnimationFrame(frame);
  return fig;
}
function physWidget(kind) {
  if (kind === 'syllabus') return syllabusFig();
  if (kind === 'ladder') return ladderFig();
  if (kind === 'cycle') return cycleFig();
  if (kind === 'spiro') return spiroFig();
  if (kind === 'aa') return aaCalc();
  if (kind === 'odc') return odcLab();
  if (kind === 'hl') return hlLab();
  return null;
}
