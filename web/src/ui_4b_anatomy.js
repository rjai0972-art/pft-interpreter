
/* ========================================================================== Learn: anatomy and bronchoscopy widgets
   Interactive pictures for the anatomy topics (data in anatomy.js): the bronchial tree navigator with its scope view and
   drill, the nodal-station map with its quiz, the V/Q sandbox, the lidocaine dose calculator and two static figures. */
const AN = window.PFT_ANAT || { topics: {}, groups: [], TREE: {}, STATIONS: [], SEGMENTS: [] };
const MIRROR_KEY = 'pft.anat.mirror.v1', LAND_KEY = 'pft.anat.land.v1';
let treeAt = 'trachea', treeDrill = null, treeMirror = !!prefGet(MIRROR_KEY), treeLand = prefGet(LAND_KEY) !== false;
/* the ring of structures around the scope view (vessels, nodes, oesophagus) is drawn when switched on, the level has
   data, and no drill is hiding the labels */
function landOn() { return treeLand && !!(AN.LANDMARKS && AN.LANDMARKS[treeAt]) && !(treeDrill && !treeDrill.done); }
/* the layers of the tree map (vessels, nodal stations), remembered */
const MAP_KEY = 'pft.anat.map.v1';
let mapLayers = Object.assign({ vessels: true, nodes: true }, prefGet(MAP_KEY) || {});
/* one structure highlighted everywhere at once: the ring, the tree map, the station map and the 3D mediastinum.
   `station` is an IASLC id, `vessel` the id of a MEDIASTINUM vessel. */
const anatHl = { station: '', vessel: '' };
function anatHover(station, vessel) {
  anatHl.station = station || ''; anatHl.vessel = vessel || '';
  if (typeof T3 !== 'undefined') T3.hl = anatHl;
  document.querySelectorAll('[data-station], [data-med]').forEach(el => {
    const on = (anatHl.station && el.getAttribute('data-station') === anatHl.station) || (anatHl.vessel && el.getAttribute('data-med') === anatHl.vessel);
    el.classList.toggle('hl', !!on);
  });
}
function hoverable(el, station, vessel) {
  const on = () => anatHover(station, vessel), off = () => { if (anatHl.station === (station || '') && anatHl.vessel === (vessel || '')) anatHover('', ''); };
  el.addEventListener('mouseenter', on); el.addEventListener('mouseleave', off); el.addEventListener('focus', on); el.addEventListener('blur', off);
  return el;
}
let stationSel = '4R', stationQuiz = null;

function svt(x, y, text, a) { const t = sv('text', Object.assign({ x: x, y: y }, a || {})); t.textContent = text; return t; }
function treePath(id) { const out = []; let k = id; while (k) { out.unshift(k); k = AN.TREE[k] && AN.TREE[k].parent; } return out; }
function treeDepth(id) { return treePath(id).length - 1; }
function treeGo(id, byUser) {
  if (!AN.TREE[id]) return;
  treeAt = id;
  if (treeDrill && byUser && !treeDrill.done) { treeDrill.moves++; if (id === treeDrill.target) treeDrill.done = true; }
  render();
}
function clockXY(cx, cy, R, hour, r) {
  const th = (hour / 12) * Math.PI * 2, sx = treeMirror ? -1 : 1;
  return [cx + sx * R * r * Math.sin(th), cy - R * r * Math.cos(th)];
}
/* the anterior-view map: every branch, the path to the current node highlighted */
function treeMap() {
  const T = AN.TREE, path = treePath(treeAt);
  const svg = sv('svg', { viewBox: '0 0 400 380', class: 'an-map', role: 'img', 'aria-label': 'Bronchial tree map' });
  // faint lungs
  svg.appendChild(sv('path', { class: 'an-lung', d: 'M172 60 C120 70 70 130 62 220 C56 290 80 350 120 362 C150 370 170 350 178 300 L182 120 Z' }));
  svg.appendChild(sv('path', { class: 'an-lung', d: 'M228 60 C280 70 330 130 338 220 C344 290 320 350 282 362 C252 370 232 350 224 300 L220 120 Z' }));
  svg.appendChild(svt(72, 376, "Patient's right", { class: 'an-side' }));
  svg.appendChild(svt(328, 376, "Patient's left", { class: 'an-side', 'text-anchor': 'end' }));
  if (mapLayers.vessels && !(treeDrill && !treeDrill.done)) svg.appendChild(mapVessels());
  const startOf = (k) => (T[k].line ? T[k].line[1] : T[k].xy);
  const w = (k) => T[k].big ? (T[k].parent && T[T[k].parent].big && !T[k].lobe ? 7 : 5) : 2.6;
  Object.keys(T).forEach(k => {
    const n = T[k]; if (!n.parent) return;
    const a = startOf(n.parent), b = n.xy, on = path.indexOf(k) >= 0;
    if (n.line) svg.appendChild(sv('line', { x1: n.line[0][0], y1: n.line[0][1], x2: n.line[1][0], y2: n.line[1][1], class: 'an-br' + (on ? ' on' : ''), 'stroke-width': 9, 'stroke-linecap': 'round' }));
    else svg.appendChild(sv('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'an-br' + (on ? ' on' : ''), 'stroke-width': w(k), 'stroke-linecap': 'round' }));
  });
  Object.keys(T).forEach(k => {
    const n = T[k], cur = k === treeAt, on = path.indexOf(k) >= 0;
    const g = sv('g', { class: 'an-node' + (cur ? ' cur' : '') + (on ? ' on' : ''), 'data-node': k, tabindex: '0', role: 'button' });
    g.appendChild(sv('title', {})).textContent = n.name;
    g.appendChild(sv('circle', { cx: n.xy[0], cy: n.xy[1], r: n.big ? 7 : 5 }));
    if (cur) g.appendChild(sv('circle', { cx: n.xy[0], cy: n.xy[1], r: 12, class: 'an-halo' }));
    g.addEventListener('click', () => treeGo(k, true));
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); treeGo(k, true); } });
    svg.appendChild(g);
  });
  // segment numbers beside the nodes (outside the buttons so each button's hit area is its circle)
  if (!(treeDrill && !treeDrill.done)) Object.keys(T).forEach(k => { const n = T[k]; if (!n.b) return; const left = n.la ? n.la === 'end' : n.side === 'R'; svg.appendChild(svt(n.xy[0] + (left ? -8 : 8), n.xy[1] + 3, n.b, { class: 'an-bl', 'text-anchor': left ? 'end' : 'start' })); });
  if (mapLayers.nodes && !(treeDrill && !treeDrill.done)) svg.appendChild(mapStations());
  return svg;
}
/* the station map's coordinates on the tree map: the two airways are drawn to nearly the same scale */
const mx = (x) => x - 10, my = (y) => 172 + (y - 190) * 0.9;
/* the great vessels and the oesophagus on the tree map (the same courses as on the station map) */
function mapVessels() {
  const g = sv('g', { class: 'an-mapv', 'data-map-layer': 'vessels' });
  const P = (x, y) => mx(x) + ' ' + my(y);
  const add = (d, cls, id, label) => { const p = sv('path', { d: d, class: cls + ' an-mv', 'data-med': id }); p.appendChild(sv('title', {})).textContent = label; hoverable(p, '', id); g.appendChild(p); return p; };
  g.appendChild(sv('line', { x1: mx(222), y1: my(60), x2: mx(226), y2: my(370), class: 'an-eso an-mv', 'data-med': 'eso' }));
  add('M' + P(120, 48) + ' L' + P(160, 74) + ' L' + P(160, 182), 'an-vein', 'svc', 'SVC');
  add('M' + P(296, 44) + ' L' + P(160, 74), 'an-vein', 'lbcv', 'left brachiocephalic (innominate) vein');
  add('M' + P(160, 182) + ' Q' + P(172, 190) + ' ' + P(186, 184) + ' Q' + P(200, 178) + ' ' + P(206, 190), 'an-vein thin', 'azy', 'azygos arch');
  add('M' + P(248, 250) + ' C' + P(250, 190) + ' ' + P(258, 150) + ' ' + P(290, 150) + ' C' + P(318, 150) + ' ' + P(318, 190) + ' ' + P(300, 212), 'an-art', 'arch', 'ascending aorta and arch');
  add('M' + P(300, 212) + ' L' + P(292, 236) + ' L' + P(286, 300), 'an-art thin', 'dao', 'descending aorta');
  add('M' + P(236, 258) + ' C' + P(240, 232) + ' ' + P(262, 222) + ' ' + P(288, 230), 'an-art pa', 'lpa', 'left pulmonary artery');
  add('M' + P(236, 258) + ' C' + P(222, 246) + ' ' + P(196, 240) + ' ' + P(168, 246), 'an-art pa', 'rpa', 'right pulmonary artery');
  [[146, 128, 'SVC'], [170, 203, 'azygos'], [306, 146, 'aortic arch'], [252, 226, 'left PA'], [160, 262, 'right PA'], [232, 366, 'oesophagus']].forEach(l => g.appendChild(svt(mx(l[0]), my(l[1]), l[2], { class: 'an-sl' })));
  return g;
}
/* the nodal stations on the tree map: tap one to open it on the station map; hovering lights it up in the 3D mediastinum */
function mapStations() {
  const g = sv('g', { class: 'an-maps', 'data-map-layer': 'nodes' });
  AN.STATIONS.forEach(st => st.xy.forEach((p, i) => {
    const id = st.id, sid = st.xy.length > 1 && /^(1|9)$/.test(id) ? id + (i ? 'L' : 'R') : id;
    const m = sv('g', { class: 'an-st mini ' + (ZONE_CLASS[st.zone] || '') + (st.dashed ? ' dashed' : ''), 'data-station': sid, tabindex: '0', role: 'button' });
    m.appendChild(sv('title', {})).textContent = 'Station ' + id + ' — ' + st.name + ' (tap to open on the station map)';
    m.appendChild(sv('circle', { cx: mx(p[0]), cy: my(p[1]), r: 7.5 }));
    m.appendChild(svt(mx(p[0]), my(p[1]) + 2.6, id.length > 3 ? id.replace('–', '-') : id, { 'text-anchor': 'middle', class: 'an-stl tiny' }));
    const go = () => { stationSel = id; setMode('learn', { topic: 'stations' }); };
    m.addEventListener('click', go); m.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    hoverable(m, sid, '');
    g.appendChild(m);
  }));
  return g;
}
/* a small copy of the tree map with a dot at the scope's position, for the corner of the inside view */
function miniMap(depthFrac) {
  const T = AN.TREE, path = treePath(treeAt), n = T[treeAt];
  const svg = sv('svg', { viewBox: '40 0 320 380', class: 'an-mini', 'aria-label': 'Where the scope is' });
  const startOf = (k) => (T[k].line ? T[k].line[1] : T[k].xy);
  Object.keys(T).forEach(k => {
    const x = T[k]; if (!x.parent) return;
    const a = startOf(x.parent), b = x.xy, on = path.indexOf(k) >= 0;
    if (x.line) svg.appendChild(sv('line', { x1: x.line[0][0], y1: x.line[0][1], x2: x.line[1][0], y2: x.line[1][1], class: 'an-br' + (on ? ' on' : ''), 'stroke-width': 7, 'stroke-linecap': 'round' }));
    else svg.appendChild(sv('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'an-br' + (on ? ' on' : ''), 'stroke-width': x.big ? 4 : 2, 'stroke-linecap': 'round' }));
  });
  const a = n.line ? n.line[0] : (n.parent ? startOf(n.parent) : n.xy), b = n.line ? n.line[1] : n.xy, f = Math.max(0, Math.min(1, depthFrac || 0));
  const px = a[0] + (b[0] - a[0]) * f, py = a[1] + (b[1] - a[1]) * f;
  svg.appendChild(sv('circle', { cx: px, cy: py, r: 11, class: 'an-mini-halo' }));
  svg.appendChild(sv('circle', { cx: px, cy: py, r: 6, class: 'an-mini-dot' }));
  return svg;
}
/* what the scope sees from the current node: the lumen, the posterior membrane, the openings ahead */
function scopeView() {
  const T = AN.TREE, n = T[treeAt], land = landOn(), R = land ? 70 : 86, cx = 100, cy = 100;
  const svg = sv('svg', { class: 'an-scope' + (land ? ' land' : ''), role: 'img', 'aria-label': 'Scope view from ' + n.name + (land ? ' with the structures around the airway' : '') });
  let vb = { x0: 0, y0: 0, x1: 200, y1: 200 };
  if (land) { const ring = landRing(cx, cy, R); svg.appendChild(ring.g); const b = ring.box; vb = { x0: Math.min(0, b.x0 - 4), y0: Math.min(0, b.y0 - 12), x1: Math.max(200, b.x1 + 4), y1: Math.max(200, b.y1 + 12) }; }
  svg.setAttribute('viewBox', vb.x0 + ' ' + vb.y0 + ' ' + (vb.x1 - vb.x0) + ' ' + (vb.y1 - vb.y0));
  svg.appendChild(sv('circle', { cx: cx, cy: cy, r: R + 8, class: 'an-wall' }));
  svg.appendChild(sv('circle', { cx: cx, cy: cy, r: R, class: 'an-lumen' }));
  if (!n.free && treeAt !== 'larynx') {
    // cartilage rings in front, the flat posterior membrane behind
    for (let i = 1; i <= 3; i++) { const rr = R * (1 - i * 0.14); svg.appendChild(sv('path', { d: 'M' + (cx - rr) + ' ' + (cy + 6) + ' A' + rr + ' ' + rr + ' 0 0 1 ' + (cx + rr) + ' ' + (cy + 6), class: 'an-ring' })); }
    svg.appendChild(sv('path', { d: 'M' + (cx - R * 0.72) + ' ' + (cy + R * 0.62) + ' Q' + cx + ' ' + (cy + R * 0.5) + ' ' + (cx + R * 0.72) + ' ' + (cy + R * 0.62), class: 'an-memb' }));
    for (let i = -2; i <= 2; i++) svg.appendChild(sv('line', { x1: cx + i * 9, y1: cy + R * 0.56 + Math.abs(i) * 2, x2: cx + i * 12, y2: cy + R * 0.92 - Math.abs(i) * 4, class: 'an-fold' }));
  }
  const openings = [];
  if (treeAt === 'larynx') {
    const g = sv('g', { class: 'an-open', 'data-open': 'trachea', tabindex: '0', role: 'button' });
    g.appendChild(sv('title', {})).textContent = 'Glottis → trachea';
    g.appendChild(sv('path', { d: 'M100 48 L82 150 Q100 162 118 150 Z', class: 'an-hole' }));
    g.appendChild(sv('path', { d: 'M100 48 L82 150', class: 'an-cord' })); g.appendChild(sv('path', { d: 'M100 48 L118 150', class: 'an-cord' }));
    g.appendChild(svt(100, 176, 'vocal cords · glottis', { class: 'an-ol', 'text-anchor': 'middle' }));
    g.addEventListener('click', () => treeGo('trachea', true));
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); treeGo('trachea', true); } });
    svg.appendChild(g);
    svg.appendChild(svt(100, 30, 'epiglottis', { class: 'an-ol', 'text-anchor': 'middle' }));
  } else if (n.kids.length) {
    n.kids.forEach(k => {
      const pos = (n.kidPos && n.kidPos[k]) || [12, 0.5], size = (n.kidSize && n.kidSize[k]) || 0.19;
      const p = clockXY(cx, cy, R, pos[0], pos[1]), rr = R * size;
      const g = sv('g', { class: 'an-open', 'data-open': k, tabindex: '0', role: 'button' });
      g.appendChild(sv('title', {})).textContent = T[k].name;
      g.appendChild(sv('ellipse', { cx: p[0], cy: p[1], rx: rr, ry: rr * 0.86, class: 'an-hole' }));
      g.appendChild(sv('ellipse', { cx: p[0], cy: p[1] + rr * 0.08, rx: rr * 0.62, ry: rr * 0.5, class: 'an-deep' }));
      g.addEventListener('click', () => treeGo(k, true));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); treeGo(k, true); } });
      openings.push(g);
      if (!(treeDrill && !treeDrill.done)) {
        const lab = T[k].b || T[k].name.replace(/ bronchus$/, '').replace('Bronchus intermedius', 'B. intermedius').replace(/^(Right|Left) /, '').replace('Upper division (LUL)', 'Upper division');
        const ly = p[1] + (pos[1] > 0.45 && pos[0] > 3 && pos[0] < 9 ? rr + 9 : -rr - 4);
        // an opening far to one side carries its label toward that side, so two labels on one line do not collide
        const dx = p[0] - cx, side = dx > R * 0.4 ? 'start' : (dx < -R * 0.4 ? 'end' : 'middle');
        openings.push(svt(side === 'start' ? p[0] - rr * 0.9 : (side === 'end' ? p[0] + rr * 0.9 : p[0]), ly, lab, { class: 'an-ol', 'text-anchor': side }));
      }
    });
  } else {
    [[12, 0.42], [4.5, 0.42], [7.5, 0.42]].forEach(pos => { const p = clockXY(cx, cy, R, pos[0], pos[1]); svg.appendChild(sv('ellipse', { cx: p[0], cy: p[1], rx: 13, ry: 11, class: 'an-hole dim' })); });
    svg.appendChild(svt(100, 186, 'subsegmental bronchi (a, b, c)', { class: 'an-ol dim', 'text-anchor': 'middle' }));
  }
  if (treeAt === 'trachea') svg.appendChild(sv('path', { d: 'M100 ' + (cy - 30) + ' L100 ' + (cy + 34), class: 'an-carina' }));   // the carina: a sagittal keel between the main bronchi
  openings.forEach(g => svg.appendChild(g));
  // compass
  const L = treeMirror ? ['R', 'L'] : ['L', 'R'];
  svg.appendChild(svt(100, vb.y0 + 9, 'anterior', { class: 'an-cp', 'text-anchor': 'middle' }));
  svg.appendChild(svt(100, vb.y1 - 1, 'posterior', { class: 'an-cp', 'text-anchor': 'middle' }));
  svg.appendChild(svt(vb.x0 + 4, 104, L[0], { class: 'an-cp' })); svg.appendChild(svt(vb.x1 - 4, 104, L[1], { class: 'an-cp', 'text-anchor': 'end' }));
  return svg;
}
/* the structures around the airway at this level, in their usual clock positions outside the wall (schematic).
   Returns the group and the box it needs, so the picture can grow around the lumen without clipping a label. */
const LAND_KIND = { a: 'artery', v: 'vein', n: 'node', e: 'oesophagus', o: 'other' };
let treeLevel = 'lower';   // the trachea has two rings: upper (arch vessels, 2R/2L) and lower (carina: 4R/4L/7)
function landKey() { return treeAt === 'trachea' && treeLevel === 'upper' ? 'trachea_upper' : treeAt; }
function landRing(cx, cy, R) {
  const g = sv('g', { class: 'an-land', 'data-land': landKey() });
  const box = { x0: cx - R - 8, y0: cy - R - 8, x1: cx + R + 8, y1: cy + R + 8 };
  const grow = (x0, y0, x1, y1) => { box.x0 = Math.min(box.x0, x0); box.y0 = Math.min(box.y0, y0); box.x1 = Math.max(box.x1, x1); box.y1 = Math.max(box.y1, y1); };
  const CW = 3.75;   // about one character of the 7.6px label
  // a label of one or two lines; the box it takes is recorded
  const label = (x, y, text, anchor, cls) => {
    let lines = [text];
    if (text.length > 14 && / /.test(text)) { const i = text.lastIndexOf(' ', Math.ceil(text.length / 2) + 2); if (i > 3) lines = [text.slice(0, i), text.slice(i + 1)]; }
    const t = sv('text', { x: x, y: y, class: 'an-lmt' + (cls ? ' ' + cls : ''), 'text-anchor': anchor });
    lines.forEach((ln, i) => { const ts = sv('tspan', { x: x, dy: i ? 8 : 0 }); ts.textContent = ln; t.appendChild(ts); });
    const w = Math.max.apply(null, lines.map(l => l.length)) * CW, hgt = 8 * lines.length;
    const x0 = anchor === 'start' ? x : (anchor === 'end' ? x - w : x - w / 2);
    grow(x0 - 1, y - 7, x0 + w + 1, y - 7 + hgt + 1);
    return t;
  };
  (AN.LANDMARKS[landKey()] || []).forEach(it => {
    const p = clockXY(cx, cy, R, it.h, it.d), r = R * it.s;
    const item = sv('g', { class: 'an-lm ' + it.k, 'data-lm': it.l, tabindex: '0' });
    if (it.k === 'n') item.setAttribute('data-station', it.l); else if (it.m) item.setAttribute('data-med', it.m);
    hoverable(item, it.k === 'n' ? it.l : '', it.k === 'n' ? '' : it.m);
    item.appendChild(sv('title', {})).textContent = it.l + ' — ' + LAND_KIND[it.k] + (it.t ? '. ' + it.t : '');
    let rx, ry;
    if (it.k === 'n') {
      rx = ry = r;
      item.appendChild(sv('circle', { cx: p[0], cy: p[1], r: r }));
      item.appendChild(svt(p[0], p[1] + 2.4, it.l, { class: 'an-lmt in', 'text-anchor': 'middle' }));
    } else if (it.k === 'e') {
      rx = r * 1.5; ry = r * 0.55;
      item.appendChild(sv('ellipse', { cx: p[0], cy: p[1], rx: rx, ry: ry }));
      item.appendChild(sv('ellipse', { cx: p[0], cy: p[1], rx: r * 0.9, ry: r * 0.2, class: 'an-lm-slit' }));
    } else {
      rx = r * (it.w || 1.45); ry = r * 0.8;
      item.appendChild(sv('ellipse', { cx: p[0], cy: p[1], rx: rx, ry: ry }));
      if (it.k === 'a') item.appendChild(sv('ellipse', { cx: p[0], cy: p[1], rx: rx * 0.8, ry: ry * 0.72, class: 'an-lm-wall' }));
    }
    grow(p[0] - rx - 1, p[1] - ry - 1, p[0] + rx + 1, p[1] + ry + 1);
    if (it.k !== 'n') {
      if (it.l.length * 3.5 <= 2 * rx - 4) item.appendChild(svt(p[0], p[1] + 2.4, it.l, { class: 'an-lmt in', 'text-anchor': 'middle' }));
      else {
        // the label beyond the shape, on the ray from the centre of the lumen
        const dx = p[0] - cx, dy = p[1] - cy, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
        const ext = rx * Math.abs(ux) + ry * Math.abs(uy) + 5;
        const qx = p[0] + ux * ext, qy = p[1] + uy * ext;
        const anchor = Math.abs(ux) < 0.3 ? 'middle' : (ux > 0 ? 'start' : 'end');
        item.appendChild(label(qx, qy + (anchor === 'middle' ? (uy < 0 ? -1 : 7) : 2.6), it.l, anchor));
      }
    }
    g.appendChild(item);
  });
  return { g: g, box: box };
}
function landLegend() {
  return h('div', { class: 'an-lgd', 'data-land-legend': '1' }, [['a', 'artery'], ['v', 'vein'], ['n', 'nodal station'], ['e', 'oesophagus']].map(x => h('span', { class: 'an-lg ' + x[0] }, [h('i'), x[1]])).concat([h('span', { class: 'fine', text: 'usual positions at this level, drawn to teach, not to scale' })]));
}
const DRILL_TARGETS = Object.keys(AN.TREE).filter(k => AN.TREE[k].b || /^(rml|ling|lud|rul|lll|lul)$/.test(k));
function startDrill() {
  let t; do { t = DRILL_TARGETS[Math.floor(Math.random() * DRILL_TARGETS.length)]; } while (treeDrill && t === treeDrill.target && DRILL_TARGETS.length > 1);
  treeDrill = { target: t, moves: 0, done: false, min: treeDepth(t) - treeDepth('trachea') };
  treeAt = 'trachea'; render();
}
function treeNav() {
  const T = AN.TREE, n = T[treeAt], path = treePath(treeAt);
  const crumbs = h('nav', { class: 'an-crumbs', 'aria-label': 'Position' }, path.map((k, i) => [i ? h('span', { class: 'sep', text: '›' }) : null,
    k === treeAt ? h('b', { text: T[k].name }) : h('button', { type: 'button', class: 'lnk', 'data-crumb': k, text: T[k].name.replace(/ bronchus$/, ''), onclick: () => treeGo(k, true) })]));
  const moves = h('div', { class: 'an-moves' }, [
    n.parent ? h('button', { type: 'button', class: 'btn sm', 'data-tree-back': '1', text: '↑ Pull back to ' + T[n.parent].name.replace(/ bronchus$/, ''), onclick: () => treeGo(n.parent, true) }) : null,
    n.kids.length ? h('span', { class: 'an-adv' }, [h('span', { class: 'fine', text: 'Advance into:' }), n.kids.map(k => h('button', { type: 'button', class: 'btn sm quiet', 'data-tree-go': k, text: T[k].b ? T[k].b + ' ' + T[k].name.replace(/ \(.*\)$/, '') : T[k].name.replace(/ bronchus$/, ''), onclick: () => treeGo(k, true) }))]) : h('span', { class: 'fine', text: 'End of the navigable tree.' })
  ]);
  const mirrorId = uid('mir'), landId = uid('lnd');
  const mirror = h('div', { class: 'an-switches' }, [
    h('label', { class: 'an-mirror', for: landId }, [h('input', { type: 'checkbox', id: landId, checked: treeLand, 'data-landmarks': '1', onchange: (e) => { treeLand = e.target.checked; prefSet(LAND_KEY, treeLand); render(); } }), 'Landmarks around the airway (vessels, nodes, oesophagus)']),
    h('label', { class: 'an-mirror', for: mirrorId }, [h('input', { type: 'checkbox', id: mirrorId, checked: treeMirror, 'data-mirror': '1', onchange: (e) => { treeMirror = e.target.checked; prefSet(MIRROR_KEY, treeMirror); render(); } }), 'Mirror the picture (patient’s right on the left, as seen facing the patient)'])
  ]);
  const notes = h('div', { class: 'an-notes' }, [
    h('h3', { text: 'Where you are' }),
    h('p', { class: 'an-name' }, [h('b', { text: n.name }), n.lobe ? h('span', { class: 'tf', text: n.lobe }) : null]),
    n.see ? h('p', {}, [h('span', { class: 'lbl', text: 'What you see. ' }), n.see]) : null,
    n.land ? h('p', {}, [h('span', { class: 'lbl', text: 'Landmarks. ' }), n.land]) : null,
    n.tip ? h('p', {}, [h('span', { class: 'lbl', text: 'Tip. ' }), n.tip]) : null,
    n.ebus ? h('p', {}, [h('span', { class: 'lbl', text: 'EBUS stations on this wall. ' }), n.ebus, ' ', h('button', { type: 'button', class: 'lnk', text: 'Open the station map →', onclick: () => setMode('learn', { topic: 'stations' }) })]) : null
  ]);
  let drill;
  if (!treeDrill) drill = h('div', { class: 'an-drill' }, [h('button', { type: 'button', class: 'btn sm', 'data-drill-start': '1', text: 'Navigation drill: find a segment from the carina', onclick: startDrill })]);
  else {
    const t = T[treeDrill.target];
    drill = h('div', { class: 'an-drill on', 'data-drill': treeDrill.done ? 'done' : 'on' }, [
      h('p', {}, [h('span', { class: 'lbl', text: 'Find: ' }), h('b', { text: t.name + (t.lobe ? ' of the ' + t.lobe.replace('LUL (lingula)', 'lingula').replace(/^R/, 'right ').replace(/^L/, 'left ').replace('UL', 'upper lobe').replace('ML', 'middle lobe').replace('LL', 'lower lobe') : '') }),
        ' — labels are hidden; steer by position. ', h('span', { class: 'fine', text: 'Moves: ' + treeDrill.moves + ' (shortest ' + treeDrill.min + ')' })]),
      treeDrill.done ? h('p', { class: 'an-found', text: 'Found in ' + treeDrill.moves + (treeDrill.moves === treeDrill.min ? ' moves — the shortest route.' : ' moves (shortest ' + treeDrill.min + ').') }) : null,
      h('div', { class: 'an-drill-acts' }, [
        h('button', { type: 'button', class: 'btn sm', 'data-drill-next': '1', text: treeDrill.done ? 'Next target' : 'New target', onclick: startDrill }),
        h('button', { type: 'button', class: 'btn sm quiet', 'data-drill-stop': '1', text: 'Stop the drill', onclick: () => { treeDrill = null; render(); } })])
    ]);
  }
  return h('div', { class: 'an-tree', 'data-at': treeAt }, [
    h('div', { class: 'an-pics' }, [
      h('figure', { class: 'an-fig' }, [treeMap(), h('div', { class: 'an-layers' }, [['vessels', 'Vessels'], ['nodes', 'Nodal stations']].map(l => { const id = uid('ly'); return h('label', { class: 'chk-inline', for: id }, [h('input', { type: 'checkbox', id: id, checked: !!mapLayers[l[0]], ['data-map-' + l[0]]: '1', onchange: (e) => { mapLayers[l[0]] = e.target.checked; prefSet(MAP_KEY, mapLayers); render(); } }), l[1]]); })),
        h('figcaption', { text: 'Anterior view — tap any branch' + (mapLayers.nodes ? '; tap a station to open it on the station map' : '') })]),
      h('figure', { class: 'an-fig' }, [scopeView(),
        landOn() && treeAt === 'trachea' ? h('div', { class: 'seg an-level', role: 'radiogroup', 'aria-label': 'Level of the trachea' }, [['upper', 'Upper trachea'], ['lower', 'Lower trachea and carina']].map(o => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-level': o[0], 'aria-checked': String(treeLevel === o[0]), text: o[1], onclick: () => { treeLevel = o[0]; if (typeof THREE !== 'undefined') t3SetDepth(o[0] === 'upper' ? 30 : 95); render(); } }))) : null,
        landOn() ? landLegend() : null,
        h('figcaption', { text: 'Scope view from the ' + n.name.toLowerCase() + ' — tap an opening to advance' + (landOn() ? '; the ring shows what lies against the wall at this level (hover or tap a structure for its note)' : '') })])
    ]),
    crumbs, moves, mirror, drill, notes, picsBlock('tree:' + treeAt, 'this view')
  ]);
}

/* ------------------------------------------------------------------ nodal station map */
const ZONE_CLASS = { 'Supraclavicular': 'z1', 'Upper (superior mediastinal)': 'z2', 'Aortopulmonary': 'z3', 'Subcarinal': 'z4', 'Lower (inferior mediastinal)': 'z5', 'Hilar': 'z6', 'Peripheral': 'z7' };
function stationSvg() {
  const svg = sv('svg', { viewBox: '0 0 420 380', class: 'an-smap', role: 'img', 'aria-label': 'Mediastinal lymph node map' });
  // lungs, airway, vessels
  svg.appendChild(sv('path', { class: 'an-lung', d: 'M178 70 C120 78 64 140 58 230 C54 300 80 352 120 362 C152 370 176 350 182 300 L186 130 Z' }));
  svg.appendChild(sv('path', { class: 'an-lung', d: 'M242 70 C300 78 356 140 362 230 C366 300 340 352 300 362 C268 370 244 350 238 300 L234 130 Z' }));
  svg.appendChild(sv('line', { x1: 222, y1: 60, x2: 226, y2: 370, class: 'an-eso' }));
  svg.appendChild(svt(232, 366, 'oesophagus', { class: 'an-sl' }));
  // SVC and brachiocephalic veins (patient's right = viewer's left), azygos arch
  svg.appendChild(sv('path', { d: 'M120 48 L160 74 L160 182', class: 'an-vein' })); svg.appendChild(sv('path', { d: 'M296 44 L160 74', class: 'an-vein' }));
  svg.appendChild(sv('path', { d: 'M160 182 Q172 190 186 184 Q200 178 206 190', class: 'an-vein thin' }));
  svg.appendChild(svt(146, 128, 'SVC', { class: 'an-sl' })); svg.appendChild(svt(170, 203, 'azygos', { class: 'an-sl' })); svg.appendChild(svt(200, 60, 'innominate v.', { class: 'an-sl', 'text-anchor': 'middle' }));
  // aorta: ascending, arch over the left main bronchus, descending; left pulmonary artery
  svg.appendChild(sv('path', { d: 'M248 250 C250 190 258 150 290 150 C318 150 318 190 300 212', class: 'an-art' }));
  svg.appendChild(sv('path', { d: 'M300 212 L292 236 L286 300', class: 'an-art thin' }));
  svg.appendChild(svt(306, 146, 'aortic arch', { class: 'an-sl' }));
  svg.appendChild(sv('path', { d: 'M236 258 C240 232 262 222 288 230', class: 'an-art pa' })); svg.appendChild(svt(252, 226, 'left PA', { class: 'an-sl' }));
  svg.appendChild(sv('path', { d: 'M236 258 C222 246 196 240 168 246', class: 'an-art pa' })); svg.appendChild(svt(160, 262, 'right PA', { class: 'an-sl' }));
  // airway
  const air = (d, w) => sv('path', { d: d, class: 'an-air', 'stroke-width': w || 5 });
  svg.appendChild(air('M210 30 L210 190', 11)); for (let y = 42; y < 186; y += 12) svg.appendChild(sv('line', { x1: 204, y1: y, x2: 216, y2: y, class: 'an-ringl' }));
  svg.appendChild(air('M210 190 L166 216 L152 262 L150 300', 7)); svg.appendChild(air('M166 214 L128 196', 4.5)); svg.appendChild(air('M152 262 L122 288', 4)); svg.appendChild(air('M150 300 L134 334', 4)); svg.appendChild(air('M150 300 L170 336', 4));
  svg.appendChild(air('M210 190 L264 226 L280 262 L286 300', 7)); svg.appendChild(air('M264 226 L298 204', 4.5)); svg.appendChild(air('M298 204 L312 232', 3.5)); svg.appendChild(air('M286 300 L302 334', 4)); svg.appendChild(air('M286 300 L268 336', 4));
  svg.appendChild(svt(210, 24, 'trachea', { class: 'an-sl', 'text-anchor': 'middle' }));
  svg.appendChild(svt(120, 376, "Patient's right", { class: 'an-side' })); svg.appendChild(svt(300, 376, "Patient's left", { class: 'an-side', 'text-anchor': 'end' }));
  AN.STATIONS.forEach(s => {
    s.xy.forEach((p, i) => {
      const g = sv('g', { class: 'an-st ' + (ZONE_CLASS[s.zone] || '') + (s.id === stationSel ? ' cur' : '') + (s.dashed ? ' dashed' : ''), 'data-station': s.id, tabindex: '0', role: 'button' });
      g.appendChild(sv('title', {})).textContent = s.id + ' ' + s.name;
      g.appendChild(sv('circle', { cx: p[0], cy: p[1], r: s.id.length > 2 ? 11 : 10 }));
      g.appendChild(svt(p[0], p[1] + 3.5, s.id.length > 3 ? s.id.replace('–', '-') : s.id, { 'text-anchor': 'middle', class: 'an-stl' + (s.id.length > 3 ? ' small' : '') }));
      const pick = () => {
        if (stationQuiz && !stationQuiz.done) { stationQuiz.tries++; if (s.id === stationQuiz.target) { stationQuiz.done = true; stationQuiz.score++; } else stationQuiz.wrong = s.id; }
        stationSel = s.id; render();
      };
      g.addEventListener('click', pick);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      svg.appendChild(g);
    });
  });
  return svg;
}
function startStationQuiz() {
  const pool = AN.STATIONS.map(s => s.id);
  let t; do { t = pool[Math.floor(Math.random() * pool.length)]; } while (stationQuiz && t === stationQuiz.target);
  stationQuiz = { target: t, tries: 0, done: false, wrong: null, score: stationQuiz ? stationQuiz.score : 0, n: stationQuiz ? stationQuiz.n + 1 : 1 };
  stationSel = ''; render();
}
function stationMap() {
  const s = AN.STATIONS.filter(x => x.id === stationSel)[0];
  const reach = s ? [['EBUS-TBNA', s.reach.ebus], ['EUS(-B)-FNA', s.reach.eus], ['Mediastinoscopy', s.reach.med]] : [];
  const card = h('div', { class: 'an-stcard', 'data-station-card': s ? s.id : '' }, s ? [
    h('p', { class: 'an-name' }, [h('b', { text: 'Station ' + s.id + ' — ' + s.name }), h('span', { class: 'tf ' + (ZONE_CLASS[s.zone] || ''), text: s.zone + ' zone' })]),
    h('p', {}, [h('span', { class: 'lbl', text: 'Stage. ' }), s.n]),
    h('p', {}, [h('span', { class: 'lbl', text: 'Upper border. ' }), s.upper]),
    s.lower ? h('p', {}, [h('span', { class: 'lbl', text: 'Lower border. ' }), s.lower]) : null,
    h('div', { class: 'an-reach' }, reach.map(r => h('span', { class: 'ch static ' + (r[1] ? 'yes' : 'no'), text: (r[1] ? '✓ ' : '✗ ') + r[0] })).concat(s.reach.other ? [h('span', { class: 'fine', text: s.reach.other })] : [])),
    h('p', {}, [h('span', { class: 'lbl', text: 'From the airway. ' }), s.where]),
    sonoFig(s),
    picsBlock('station:' + s.id, 'station ' + s.id)
  ] : [h('p', { class: 'fine', text: 'Tap a station on the map.' })]);
  const legend = h('div', { class: 'an-legend' }, Object.keys(ZONE_CLASS).map(z => h('span', { class: 'an-lg ' + ZONE_CLASS[z] }, [h('i'), z.replace(/ \(.*\)/, '')])));
  let quiz;
  if (!stationQuiz) quiz = h('div', { class: 'an-drill' }, [h('button', { type: 'button', class: 'btn sm', 'data-stq-start': '1', text: 'Quiz: find the station on the map', onclick: startStationQuiz })]);
  else {
    const t = AN.STATIONS.filter(x => x.id === stationQuiz.target)[0];
    quiz = h('div', { class: 'an-drill on', 'data-stq': stationQuiz.done ? 'done' : 'on' }, [
      h('p', {}, [h('span', { class: 'lbl', text: 'Tap: ' }), h('b', { text: t.name + ' (' + t.zone.replace(/ \(.*\)/, '') + ' zone)' }), ' ', h('span', { class: 'fine', text: 'Question ' + stationQuiz.n + ' · score ' + stationQuiz.score })]),
      stationQuiz.done ? h('p', { class: 'an-found', text: 'Correct — station ' + t.id + (stationQuiz.tries > 1 ? ' (after ' + stationQuiz.tries + ' taps).' : '.') }) : (stationQuiz.wrong ? h('p', { class: 'an-wrong', text: 'That is station ' + stationQuiz.wrong + '. Try again.' }) : null),
      h('div', { class: 'an-drill-acts' }, [h('button', { type: 'button', class: 'btn sm', 'data-stq-next': '1', text: stationQuiz.done ? 'Next station' : 'Skip', onclick: startStationQuiz }), h('button', { type: 'button', class: 'btn sm quiet', text: 'Stop the quiz', onclick: () => { stationQuiz = null; render(); } })])
    ]);
  }
  return h('div', { class: 'an-stations' }, [h('figure', { class: 'an-fig wide' }, [stationSvg(), legend, h('figcaption', { text: 'IASLC 2009 map, anterior view (patient’s right on the left). Dashed = behind the trachea.' })]), quiz, card]);
}

/* ------------------------------------------------------------------ schematic EBUS picture of a station
   The sector of a convex probe: the airway wall under the transducer, the node below it (hypoechoic, with a rim), the
   vessels that sit beside or beyond it (anechoic, coloured by type here — on the screen colour follows the direction of
   flow), the needle path. A drawing to learn the layout from, not an image. */
const SONO_POS = { L: [96, 104, 20, 16], R: [204, 104, 20, 16], D: [150, 162, 34, 20], DL: [90, 152, 28, 18], DR: [210, 152, 28, 18], SL: [106, 58, 22, 13], SR: [194, 58, 22, 13] };
function sonoFig(s) {
  const spec = AN.SONO && AN.SONO[s.id];
  if (!spec) return s.reach && s.reach.ebus ? null : h('p', { class: 'fine', 'data-sono': 'none', text: 'Not an EBUS station: no endobronchial picture to learn.' });
  const W = 300, H = 212, ax = 150, ay = 6, rad = 200, half = 34 * Math.PI / 180;
  const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'an-sono', role: 'img', 'aria-label': 'Schematic EBUS picture of station ' + s.id });
  const fid = uid('sp');
  const defs = sv('defs', {});
  const flt = sv('filter', { id: fid + 'n', x: '0', y: '0', width: '100%', height: '100%' });
  flt.appendChild(sv('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: '2', seed: '7', result: 'n' }));
  flt.appendChild(sv('feColorMatrix', { in: 'n', type: 'matrix', values: '0 0 0 0 0.75  0 0 0 0 0.75  0 0 0 0 0.72  0 0 0 0.55 0' }));
  defs.appendChild(flt);
  const grad = sv('radialGradient', { id: fid + 'g', cx: '0.5', cy: '0', r: '1' });
  grad.appendChild(sv('stop', { offset: '0', 'stop-color': '#5a5e63' })); grad.appendChild(sv('stop', { offset: '1', 'stop-color': '#17191d' }));
  defs.appendChild(grad);
  svg.appendChild(defs);
  svg.appendChild(sv('rect', { x: 0, y: 0, width: W, height: H, class: 'an-sono-bg' }));
  const px = (a, r) => [ax + r * Math.sin(a), ay + r * Math.cos(a)];
  const e1 = px(-half, rad), e2 = px(half, rad);
  const fan = 'M' + ax + ' ' + ay + ' L' + e1[0].toFixed(1) + ' ' + e1[1].toFixed(1) + ' A' + rad + ' ' + rad + ' 0 0 0 ' + e2[0].toFixed(1) + ' ' + e2[1].toFixed(1) + ' Z';
  const clip = sv('clipPath', { id: fid + 'c' }); clip.appendChild(sv('path', { d: fan })); defs.appendChild(clip);
  svg.appendChild(sv('path', { d: fan, fill: 'url(#' + fid + 'g)' }));
  svg.appendChild(sv('path', { d: fan, filter: 'url(#' + fid + 'n)', opacity: '0.5' }));
  const scene = sv('g', { 'clip-path': 'url(#' + fid + 'c)' }); svg.appendChild(scene);
  // the airway wall under the transducer: a bright band
  const w1 = px(-half, 16), w2 = px(half, 16), w3 = px(half, 26), w4 = px(-half, 26);
  svg.appendChild(sv('path', { d: 'M' + w1[0] + ' ' + w1[1] + ' A16 16 0 0 0 ' + w2[0] + ' ' + w2[1] + ' L' + w3[0] + ' ' + w3[1] + ' A26 26 0 0 1 ' + w4[0] + ' ' + w4[1] + ' Z', class: 'an-sono-wall' }));
  svg.appendChild(svt(ax + 72, 22, 'airway wall', { class: 'an-sono-t', 'text-anchor': 'start' }));
  // neighbours
  (spec.near || []).forEach(v => {
    const q = SONO_POS[v[2]] || SONO_POS.D;
    const g = sv('g', { class: 'an-sono-v ' + v[1], 'data-sono-v': v[0] });
    g.appendChild(sv('title', {})).textContent = v[0];
    if (v[1] === 'e') { g.appendChild(sv('ellipse', { cx: q[0], cy: q[1], rx: q[2], ry: q[3] })); g.appendChild(sv('ellipse', { cx: q[0], cy: q[1], rx: q[2] * 0.55, ry: q[3] * 0.4, class: 'an-sono-eso' })); }
    else if (v[1] === 'o') { g.appendChild(sv('path', { d: 'M' + (q[0] - q[2]) + ' ' + q[1] + ' Q' + q[0] + ' ' + (q[1] - q[3]) + ' ' + (q[0] + q[2]) + ' ' + q[1], class: 'an-sono-bone' })); g.appendChild(sv('path', { d: 'M' + (q[0] - q[2] + 4) + ' ' + (q[1] + 1) + ' L' + (q[0] + q[2] - 4) + ' ' + (q[1] + 1) + ' L' + (q[0] + q[2] + 6) + ' ' + (H - 2) + ' L' + (q[0] - q[2] - 6) + ' ' + (H - 2) + ' Z', class: 'an-sono-shadow' })); }
    else { g.appendChild(sv('ellipse', { cx: q[0], cy: q[1], rx: q[2], ry: q[3] })); g.appendChild(sv('ellipse', { cx: q[0], cy: q[1], rx: q[2] * 0.82, ry: q[3] * 0.78, class: 'an-sono-flow' })); }
    scene.appendChild(g);
    svg.appendChild(svt(q[0], q[1] + q[3] + 9, v[0], { class: 'an-sono-t', 'text-anchor': 'middle' }));
  });
  // the node: hypoechoic, oval, a thin brighter rim
  scene.appendChild(sv('ellipse', { cx: 150, cy: 100, rx: 33, ry: 24, class: 'an-sono-node' }));
  scene.appendChild(sv('ellipse', { cx: 150, cy: 100, rx: 28, ry: 19, class: 'an-sono-node-in' }));
  svg.appendChild(svt(150, 98, 'node ' + s.id, { class: 'an-sono-t big', 'text-anchor': 'middle' }));
  svg.appendChild(svt(150, 109, 'hypoechoic', { class: 'an-sono-t dim', 'text-anchor': 'middle' }));
  // needle path, from the transducer at a shallow angle into the node
  scene.appendChild(sv('line', { x1: 136, y1: 26, x2: 150, y2: 96, class: 'an-sono-needle' }));
  svg.appendChild(svt(118, 44, 'needle', { class: 'an-sono-t', 'text-anchor': 'end' }));
  // depth marks, 1 cm apart
  for (let i = 1; i <= 4; i++) { const y = ay + i * 44; svg.appendChild(sv('line', { x1: W - 12, y1: y, x2: W - 4, y2: y, class: 'an-sono-tick' })); svg.appendChild(svt(W - 14, y + 3, i + ' cm', { class: 'an-sono-t dim', 'text-anchor': 'end' })); }
  const legend = h('div', { class: 'an-lgd' }, [['a', 'artery'], ['v', 'vein'], ['n', 'node'], ['e', 'oesophagus']].map(x => h('span', { class: 'an-lg ' + x[0] }, [h('i'), x[1]])));
  return h('figure', { class: 'an-fig an-sono-fig', 'data-sono': s.id }, [svg, legend,
    h('figcaption', {}, [h('b', { text: 'Schematic EBUS picture, not a photograph. ' }), 'Probe on the ' + spec.probe + '. ' + (spec.near || []).map(v => v[0]).join(', ') + ' around the node' + (spec.note ? '. ' + spec.note : '.') + ' Vessels are coloured by type here; on the screen Doppler colour follows the direction of flow.'])]);
}

/* ------------------------------------------------------------------ your own pictures
   A photo of your own (an atlas page you are allowed to copy, a frame from a procedure) pinned to an airway view or a
   station. Kept in this browser only (localStorage, scaled down to about 900 px); nothing is uploaded anywhere. */
const PICS_KEY = 'pft.anat.pics.v1';
let picsCache = null, picsBig = null;
function picsAll() { if (!picsCache) { const v = prefGet(PICS_KEY); picsCache = (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; } return picsCache; }
function picsSave() { try { window.localStorage.setItem(PICS_KEY, JSON.stringify(picsAll())); return true; } catch (e) { return false; } }
function picsAdd(key, file, done) {
  const rd = new FileReader();
  rd.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 900, sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      let url; try { url = c.toDataURL('image/jpeg', 0.82); } catch (e) { url = rd.result; }
      const all = picsAll(); (all[key] = all[key] || []).push({ src: url, name: (file.name || '').replace(/\.[^.]+$/, '').slice(0, 60), t: Date.now() });
      if (!picsSave()) { all[key].pop(); done(false); return; }
      done(true);
    };
    img.onerror = () => done(false);
    img.src = rd.result;
  };
  rd.onerror = () => done(false);
  rd.readAsDataURL(file);
}
function picsBlock(key, label) {
  const list = picsAll()[key] || [];
  const inId = uid('pic');
  const input = h('input', { type: 'file', accept: 'image/*', id: inId, 'data-pic-add': key, hidden: true, onchange: (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    picsAdd(key, f, (okk) => { if (okk) { toast('Photo kept on this device'); render(); } else toast('Could not keep that photo (storage full or not an image)'); });
  } });
  const thumbs = list.map((p, i) => h('figure', { class: 'an-pic' + (picsBig === key + ':' + i ? ' big' : ''), 'data-pic': key }, [
    h('img', { src: p.src, alt: p.name || ('Photo ' + (i + 1) + ' for ' + label), loading: 'lazy', onclick: () => { picsBig = picsBig === key + ':' + i ? null : key + ':' + i; render(); } }),
    h('figcaption', {}, [p.name ? h('span', { text: p.name }) : null, h('button', { type: 'button', class: 'lnk', 'data-pic-remove': String(i), text: 'remove', onclick: () => { picsAll()[key].splice(i, 1); if (!picsAll()[key].length) delete picsAll()[key]; picsSave(); picsBig = null; render(); } })])
  ]));
  return h('div', { class: 'an-pics-own', 'data-pics': key }, [
    h('div', { class: 'an-pics-row' }, thumbs),
    h('div', { class: 'an-pics-add' }, [input, h('label', { class: 'btn sm quiet', for: inId, text: (list.length ? 'Add another photo' : 'Add your own photo') + ' of ' + label }),
      h('span', { class: 'fine', text: 'An atlas page you own or a frame from a case; it stays in this browser only. Published atlas photographs are copyrighted, so none are built in.' })])
  ]);
}

/* ------------------------------------------------------------------ V/Q sandbox
   One alveolar unit with fixed mixed-venous blood (PvO2 40, PvCO2 46, Hb 15): the alveolar gas that mass balance allows
   for a given VA/Q, on air or 100% oxygen. The CO2 dissociation curve is taken as linear (0.6 mL/dL per mm Hg), the O2
   curve from the Hill equation (P50 26.8, n 2.7). Teaching model, not a calculator for patients. */
const VQ = { Hb: 15, PvO2: 40, PvCO2: 46, P50: 26.8, nH: 2.7 };
function sat(p) { const a = Math.pow(Math.max(p, 0), VQ.nH); return a / (a + Math.pow(VQ.P50, VQ.nH)); }
function o2Content(p) { return 1.34 * VQ.Hb * sat(p) + 0.003 * p; }
function vqSolve(r, fio2) {
  const PIO2 = fio2 * 713, CvO2 = o2Content(VQ.PvO2), CvCO2 = 48 + 0.6 * (VQ.PvCO2 - 40);
  if (!isFinite(r)) return { po2: PIO2, pco2: 0, so2: sat(PIO2) };
  if (r <= 0) return { po2: VQ.PvO2, pco2: VQ.PvCO2, so2: sat(VQ.PvO2) };
  const K = 863;   // mL STPD of gas per L BTPS of ventilation per mm Hg
  const pco2 = K * (CvCO2 - 24) / (100 * r + K * 0.6);
  let lo = VQ.PvO2, hi = PIO2;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2, f = r * (PIO2 - mid) / K - (o2Content(mid) - CvO2) / 100; if (f > 0) lo = mid; else hi = mid; }
  const po2 = (lo + hi) / 2;
  return { po2: po2, pco2: pco2, so2: sat(po2) };
}
let vqPos = 50, vqO2 = false;
function vqRatio(pos) { if (pos <= 0) return 0; if (pos >= 100) return Infinity; return Math.exp(Math.log(0.05) + (Math.log(20) - Math.log(0.05)) * (pos / 100)); }
function vqSandbox() {
  const r = vqRatio(vqPos), fio2 = vqO2 ? 1 : 0.21, g = vqSolve(r, fio2);
  const rTxt = r === 0 ? '0 (shunt)' : (!isFinite(r) ? '∞ (dead space)' : r.toFixed(2));
  const W = 320, H = 200, xmax = vqO2 ? 720 : 160, X = (p) => 36 + (p / xmax) * (W - 48), Y = (p) => H - 24 - (p / 50) * (H - 40);
  const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'an-vqd', role: 'img', 'aria-label': 'Oxygen–carbon dioxide diagram' });
  svg.appendChild(sv('line', { x1: 36, y1: H - 24, x2: W - 12, y2: H - 24, class: 'an-ax' })); svg.appendChild(sv('line', { x1: 36, y1: 8, x2: 36, y2: H - 24, class: 'an-ax' }));
  (vqO2 ? [0, 200, 400, 600] : [0, 40, 80, 120, 150]).forEach(v => { svg.appendChild(svt(X(v), H - 10, String(v), { class: 'an-tk', 'text-anchor': 'middle' })); });
  [0, 20, 40].forEach(v => svg.appendChild(svt(30, Y(v) + 3, String(v), { class: 'an-tk', 'text-anchor': 'end' })));
  svg.appendChild(svt(W - 12, H - 1, 'PO2 (mm Hg)', { class: 'an-tk', 'text-anchor': 'end' })); svg.appendChild(svt(40, 10, 'PCO2', { class: 'an-tk' }));
  let d = '';
  for (let i = 0; i <= 100; i++) { const q = vqSolve(vqRatio(i), fio2); d += (i ? ' L' : 'M') + X(q.po2).toFixed(1) + ' ' + Y(q.pco2).toFixed(1); }
  svg.appendChild(sv('path', { d: d, class: 'an-vqline' }));
  const vq0 = vqSolve(0, fio2), vqi = vqSolve(Infinity, fio2);
  svg.appendChild(svt(X(vq0.po2) + 4, Y(vq0.pco2) - 6, 'v̄ (shunt)', { class: 'an-tk' }));
  svg.appendChild(svt(X(vqi.po2) - 4, Y(vqi.pco2) - 6, 'I (dead space)', { class: 'an-tk', 'text-anchor': 'end' }));
  svg.appendChild(sv('circle', { cx: X(g.po2), cy: Y(g.pco2), r: 6, class: 'an-vqpt' }));
  const unit = sv('svg', { viewBox: '0 0 120 120', class: 'an-unit', 'aria-hidden': 'true' });
  const vw = r === 0 ? 2 : Math.max(3, Math.min(26, 8 + 6 * Math.log(Math.min(isFinite(r) ? r : 20, 20) + 1)));
  const qw = !isFinite(r) ? 2 : Math.max(3, Math.min(26, 8 + 6 * Math.log(1 / Math.max(r, 0.05) + 1)));
  unit.appendChild(sv('rect', { x: 60 - vw / 2, y: 4, width: vw, height: 40, rx: 3, class: 'an-vent' }));
  unit.appendChild(sv('circle', { cx: 60, cy: 70, r: 30, class: 'an-alv' }));
  unit.appendChild(sv('path', { d: 'M6 100 Q60 ' + (100 + qw * 0.4) + ' 114 100', class: 'an-cap', 'stroke-width': qw, style: 'stroke: ' + (g.so2 > 0.9 ? 'var(--c-sev-soft, #d98c8c)' : 'var(--accent)') }));
  unit.appendChild(sv('path', { d: 'M6 100 Q60 ' + (100 + qw * 0.4) + ' 114 100', class: 'an-blood', 'stroke-width': Math.max(1, qw - 2), style: 'stroke: ' + 'hsl(' + Math.round(220 - 220 * Math.max(0, (g.so2 - 0.6) / 0.4)) + ', 70%, 50%)' }));
  unit.appendChild(svt(60, 74, 'V̇A/Q̇', { class: 'an-tk', 'text-anchor': 'middle' }));
  const sliderId = uid('vq');
  const slider = h('input', { type: 'range', id: sliderId, min: '0', max: '100', step: '1', value: String(vqPos), 'data-vq': '1', 'aria-label': 'Ventilation–perfusion ratio', oninput: (e) => { vqPos = +e.target.value; render(); } });
  const fio = h('div', { class: 'an-fio' }, [[0.21, 'Room air (FiO2 0.21)'], [1, '100% oxygen']].map(o => h('button', { type: 'button', class: 'ch', role: 'radio', 'aria-checked': String(vqO2 === (o[0] === 1)), 'data-fio2': String(o[0]), text: o[1], onclick: () => { vqO2 = o[0] === 1; render(); } })));
  const verdict = r === 0 ? 'Shunt: the blood leaves with mixed-venous gas whatever the inspired oxygen — oxygen therapy cannot reach it.'
    : (!isFinite(r) ? 'Dead space: the gas never meets blood; this ventilation is wasted and the unit contributes no gas exchange.'
    : (r < 0.3 ? 'Low V/Q: PO2 falls steeply while PCO2 rises only a little' + (vqO2 ? ' — on 100% oxygen the alveolar PO2 climbs and the blood leaves fully saturated: this is why oxygen fixes V/Q mismatch.' : '; switch to 100% oxygen to see the PO2 recover.')
    : (r > 3 ? 'High V/Q: alveolar gas drifts toward inspired gas; the blood is well oxygenated but the extra ventilation adds little oxygen content (the saturation curve is flat here) — the apex of the upright lung.' : 'Near the whole-lung average (about 0.8–1): the familiar alveolar gas of 100 and 40 mm Hg.')));
  const out = h('div', { class: 'an-vqout' }, [
    h('div', { class: 'an-kv' }, [h('span', { text: 'V̇A/Q̇' }), h('b', { 'data-vq-r': '1', text: rTxt })]),
    h('div', { class: 'an-kv' }, [h('span', { text: 'Alveolar PO2' }), h('b', { 'data-vq-po2': '1', text: Math.round(g.po2) + ' mm Hg' })]),
    h('div', { class: 'an-kv' }, [h('span', { text: 'Alveolar PCO2' }), h('b', { text: Math.round(g.pco2) + ' mm Hg' })]),
    h('div', { class: 'an-kv' }, [h('span', { text: 'End-capillary SO2' }), h('b', { text: Math.round(g.so2 * 100) + '%' })])
  ]);
  return h('div', { class: 'an-vq' }, [
    h('div', { class: 'an-vqtop' }, [h('figure', { class: 'an-fig' }, [svg, h('figcaption', { text: 'The ventilation–perfusion line: every possible alveolar gas for this inspired mixture and mixed-venous blood' })]), h('div', { class: 'an-vqside' }, [unit, out])]),
    h('div', { class: 'an-vqctl' }, [h('label', { for: sliderId, class: 'fine', text: 'Shunt (0) ← V̇A/Q̇ → dead space (∞)' }), slider, fio]),
    h('p', { class: 'an-verdict', text: verdict })
  ]);
}

/* ------------------------------------------------------------------ lidocaine running total */
const LIDO_PREPS = [
  ['1% solution, 2 mL bolus (spray-as-you-go)', 20], ['2% solution, 1 mL syringe', 20], ['2% gargle, 5 mL', 100], ['2% atomiser, 10 mL', 200],
  ['4% solution, 1 mL', 40], ['4% atomiser, 10 mL', 400], ['2% gel, 6 mL (nose)', 120], ['10% spray, one actuation', 10]
];
let lidoWt = '', lidoLb = false, lidoCounts = LIDO_PREPS.map(() => 0);
function lidoCalc() {
  const kg = P.num(lidoWt) * (lidoLb ? 0.4536 : 1), total = LIDO_PREPS.reduce((a, p, i) => a + p[1] * lidoCounts[i], 0);
  const perKg = kg > 0 ? total / kg : NaN;
  const lim = [[7, 'ACCP 2011'], [8, 'local protocol'], [9.6, 'BTS: subjective toxicity common beyond']];
  const wtIn = h('input', { type: 'text', class: 'num', inputmode: 'decimal', value: lidoWt, placeholder: lidoLb ? '154' : '70', 'aria-label': 'Body weight', 'data-lido-wt': '1', oninput: (e) => { lidoWt = e.target.value; sync(); } });
  const totalEl = h('b', { 'data-lido-total': '1' }), perEl = h('b', { 'data-lido-perkg': '1' }), bar = h('div', { class: 'an-lbar' }, [h('i')]), limEl = h('div', { class: 'an-lims' });
  const rows = LIDO_PREPS.map((p, i) => {
    const cnt = h('b', { class: 'an-cnt', text: String(lidoCounts[i]) });
    return h('div', { class: 'an-lrow', 'data-lido-row': String(i) }, [
      h('span', { class: 'an-lname', text: p[0] }), h('span', { class: 'fine', text: p[1] + ' mg' }),
      h('span', { class: 'an-lacts' }, [h('button', { type: 'button', class: 'btn sm quiet', 'aria-label': 'Remove one ' + p[0], text: '−', onclick: () => { if (lidoCounts[i] > 0) lidoCounts[i]--; cnt.textContent = String(lidoCounts[i]); upd(); } }), cnt,
        h('button', { type: 'button', class: 'btn sm', 'data-lido-add': String(i), 'aria-label': 'Add one ' + p[0], text: '+', onclick: () => { lidoCounts[i]++; cnt.textContent = String(lidoCounts[i]); upd(); } })])]);
  });
  function upd() {
    const kg2 = P.num(lidoWt) * (lidoLb ? 0.4536 : 1), tot = LIDO_PREPS.reduce((a, p, i) => a + p[1] * lidoCounts[i], 0), pk = kg2 > 0 ? tot / kg2 : NaN;
    totalEl.textContent = tot + ' mg'; perEl.textContent = isFinite(pk) ? pk.toFixed(1) + ' mg/kg' : '— (enter the weight)';
    const frac = isFinite(pk) ? Math.min(1, pk / 10) : 0;
    bar.firstChild.style.width = (frac * 100).toFixed(1) + '%';
    bar.className = 'an-lbar' + (isFinite(pk) ? (pk >= 9.6 ? ' over' : (pk >= 7 ? ' warn' : ' ok')) : '');
    limEl.textContent = ''; lim.forEach(l => limEl.appendChild(h('span', { class: 'an-lim' + (l[0] >= 5 ? ' r' : ''), style: (l[0] >= 5 ? 'right:' + (100 - l[0] / 10 * 100) + '%' : 'left:' + (l[0] / 10 * 100) + '%'), text: l[0] + ' mg/kg · ' + l[1] + (kg2 > 0 ? ' = ' + Math.round(l[0] * kg2) + ' mg' : '') })));
  }
  widgets.push(upd);
  return h('div', { class: 'an-lido card-ish', 'data-lido': '1' }, [
    h('h3', { text: 'Lidocaine running total' }),
    h('div', { class: 'an-lhead' }, [h('label', {}, ['Weight ', wtIn]), h('span', { class: 'ch-row' }, [['kg', false], ['lb', true]].map(u => h('button', { type: 'button', class: 'ch', role: 'radio', 'aria-checked': String(lidoLb === u[1]), text: u[0], onclick: () => { lidoLb = u[1]; render(); } }))),
      h('button', { type: 'button', class: 'lnk', text: 'Reset', onclick: () => { lidoCounts = LIDO_PREPS.map(() => 0); render(); } })]),
    h('div', { class: 'an-lrows' }, rows),
    h('div', { class: 'an-ltot' }, [h('span', {}, ['Total ', totalEl]), h('span', {}, ['Per kg ', perEl])]),
    h('div', { class: 'an-lbarwrap' }, [bar, limEl]),
    h('p', { class: 'fine', text: 'Percent means grams per 100 mL: 1% = 10 mg/mL, 2% = 20 mg/mL, 4% = 40 mg/mL. Peak absorption 20–45 minutes after application; liver disease, heart failure and age raise the risk. A teaching aid — follow the local protocol and the drug chart.' })
  ]);
}

/* ------------------------------------------------------------------ static figures */
function lobesFig() {
  const svg = sv('svg', { viewBox: '0 0 420 300', class: 'an-lobes', role: 'img', 'aria-label': 'Lobes and fissures, anterior view' });
  const lobe = (d, cls, label, x, y) => { svg.appendChild(sv('path', { d: d, class: 'an-lobe ' + cls })); svg.appendChild(svt(x, y, label, { class: 'an-ll', 'text-anchor': 'middle' })); };
  // right lung (viewer's left): the horizontal fissure at the 4th rib, the oblique fissure from the lateral chest wall to the 6th costal cartilage
  lobe('M178 36 C120 44 70 110 62 152 L178 152 Z', 'l-rul', 'RUL', 124, 108);
  lobe('M178 152 L62 152 L178 234 Z', 'l-rml', 'RML', 146, 182);
  lobe('M62 152 C58 200 74 258 116 276 C150 288 176 268 178 234 Z', 'l-rll', 'RLL', 104, 246);
  svg.appendChild(svt(70, 146, 'horizontal fissure', { class: 'an-sl' }));
  svg.appendChild(svt(98, 214, 'oblique fissure', { class: 'an-sl', transform: 'rotate(35 98 214)' }));
  // left lung: the oblique fissure from the lateral chest wall to the 6th costal cartilage; the lingula is the lower, medial part of the upper lobe
  lobe('M242 36 C300 44 350 110 358 152 L242 234 Z', 'l-lul', 'LUL', 296, 108);
  lobe('M358 152 C360 200 344 258 300 276 C266 288 244 268 242 234 Z', 'l-lll', 'LLL', 318, 246);
  svg.appendChild(sv('path', { d: 'M242 160 L346 160', class: 'an-fiss', 'stroke-dasharray': '3 3' })); svg.appendChild(svt(252, 190, 'lingula', { class: 'an-ll small' }));
  svg.appendChild(svt(322, 214, 'oblique fissure', { class: 'an-sl', transform: 'rotate(-35 322 214)', 'text-anchor': 'middle' }));
  svg.appendChild(sv('path', { d: 'M200 60 L200 140 L178 152 M200 140 L242 152', class: 'an-air', 'stroke-width': 6 }));
  svg.appendChild(sv('path', { d: 'M178 226 C190 262 230 264 242 234', class: 'an-heart' })); svg.appendChild(svt(210, 254, 'heart', { class: 'an-sl', 'text-anchor': 'middle' }));
  svg.appendChild(svt(62, 22, "Patient's right", { class: 'an-side' })); svg.appendChild(svt(358, 22, "Patient's left", { class: 'an-side', 'text-anchor': 'end' }));
  return h('figure', { class: 'an-fig wide' }, [svg, h('figcaption', { text: 'Lobes and fissures from the front: the middle lobe and the lingula lie against the heart, the lower lobes against the diaphragm and the back. The lingula has no fissure of its own.' })]);
}
function zonesFig() {
  const svg = sv('svg', { viewBox: '0 0 420 230', class: 'an-zones', role: 'img', 'aria-label': 'West zones of the upright lung' });
  svg.appendChild(sv('path', { d: 'M120 16 C60 40 40 120 48 190 C52 214 70 222 110 220 L200 216 L200 30 Z', class: 'an-lung solid' }));
  const bands = [[16, 80, 'Zone 1', 'PA > Pa > Pv — no flow (only with positive pressure, PEEP or haemorrhage)', 'V/Q ≈ 3 at the apex: PO2 ≈ 130, PCO2 ≈ 28'], [80, 148, 'Zone 2', 'Pa > PA > Pv — flow set by the arterial–alveolar difference (waterfall)', 'V/Q ≈ 1'], [148, 216, 'Zone 3', 'Pa > Pv > PA — flow set by the arterial–venous difference', 'V/Q ≈ 0.6 at the base: PO2 ≈ 90, PCO2 ≈ 42']];
  bands.forEach((b, i) => {
    svg.appendChild(sv('rect', { x: 44, y: b[0], width: 156, height: b[1] - b[0], class: 'an-band b' + (i + 1) }));
    svg.appendChild(svt(214, b[0] + 18, b[2], { class: 'an-zl' })); svg.appendChild(svt(214, b[0] + 34, b[3], { class: 'an-zt' })); svg.appendChild(svt(214, b[0] + 50, b[4], { class: 'an-zt' }));
  });
  svg.appendChild(sv('path', { d: 'M24 30 L24 206', class: 'an-ax' })); svg.appendChild(sv('path', { d: 'M24 206 L19 196 M24 206 L29 196', class: 'an-ax' }));
  svg.appendChild(svt(12, 120, 'flow ↑  ventilation ↑  (flow more)', { class: 'an-tk', transform: 'rotate(-90 12 120)', 'text-anchor': 'middle' }));
  return h('figure', { class: 'an-fig wide' }, [svg, h('figcaption', { text: 'West’s zones: the pressures that govern flow at each level of the upright lung, and the resulting V/Q gradient.' })]);
}
function anatWidget(kind) {
  if (kind === 'tree') return treeNav();
  if (kind === 'tree3d') return tree3dFig();
  if (kind === 'stations') return stationMap();
  if (kind === 'vq') return vqSandbox();
  if (kind === 'lido') return lidoCalc();
  if (kind === 'lobes') return lobesFig();
  if (kind === 'zones') return zonesFig();
  return null;
}
