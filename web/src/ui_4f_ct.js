/* ------------------------------------------------------------------ the CT lab
   Axial sections through the same procedural thorax as the 3D model (anatomy.js: TREE3D, MEDIASTINUM), drawn in Hounsfield
   units and shown through a window like a scanner's console. Radiological convention: the patient's right on the left of the
   picture, anterior at the top. Labels in the margins with leader lines, or numbered markers on a narrow screen; the labels
   can be hidden and the structures asked for one at a time. The level slider moves the blue plane on the 3D model beside it,
   and a structure under the pointer lights up on the model. A drawing to learn the layout from, not a patient's scan. */
const CT = { z: 20, win: 'med', labels: true, quiz: null, hover: null, canvas: null, noise: null, shapes: [], labelsOn: [], mode: 'names', hl: '' };
const CT_WIN = { lung: [-600, 1500], med: [40, 400], bone: [400, 1800] };
const CT_WIN_NAME = { lung: 'Lung window (W 1500 / L −600)', med: 'Mediastinal window (W 400 / L 40)', bone: 'Bone window (W 1800 / L 400)' };
const CT_LEVELS = [[105, 'Thoracic inlet'], [88, 'Sternoclavicular joints'], [44, 'Aortic arch'], [20, 'Aortopulmonary window'], [-8, 'Carina'], [-16, 'Pulmonary arteries'], [-44, 'Left atrium'], [-72, 'Ventricles'], [-96, 'Domes of the diaphragm'], [-120, 'Lung bases']];
const CT_Z = [-130, 120];
const CT_S = 1.6, CT_W = 1000, CT_H = 560, CT_CY = 10;   // pixels per mm; canvas; the model y at the centre of the picture
let ctVesselPts = null;
function ctGray(hu) { const w = CT_WIN[CT.win], g = Math.max(0, Math.min(1, (hu - (w[0] - w[1] / 2)) / w[1])); const v = Math.round(g * 255); return 'rgb(' + v + ',' + v + ',' + v + ')'; }
function ctZoom() { return CT.mode === 'numbers' ? 1.5 : 1; }
function ctPx(x) { return CT_W / 2 + x * CT_S * ctZoom(); }
function ctPy(y) { return CT_H / 2 - (y - CT_CY) * CT_S * ctZoom(); }
/* a seeded generator, so the lung vessels are the same spheres every time the page is drawn */
function ctRand(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
/* the small vessels in the lungs: spheres scattered in each lung, larger near the hilum, kept across levels */
function ctLungDots() {
  if (ctVesselPts) return ctVesselPts;
  const rnd = ctRand(7), out = [];
  [-1, 1].forEach(side => {
    for (let i = 0; i < 1500; i++) {
      const u = rnd(), v = rnd(), w = rnd();
      const z = -150 + 250 * u, f = ctLungF(z, side); if (f <= 0.05) { i--; continue; }
      const ang = v * Math.PI * 2, rr = Math.sqrt(w);
      const x = side * (ctLungCx(z) + 60 * f * rr * Math.cos(ang)), y = 98 * f * rr * Math.sin(ang);
      const hil = Math.hypot(x - side * 34, y - 8, (z + 25) * 0.6);   // distance from the hilum
      const r = Math.max(0.5, 2.4 - hil / 40 + rnd() * 0.5);
      out.push({ x: x, y: y, z: z, r: r, side: side });
    }
  });
  ctVesselPts = out; return out;
}
/* the lungs: ellipsoids, the right a little shorter (the liver), both narrow at the apex */
function ctLungF(z, side) { const top = 102, bot = side < 0 ? -128 : -140, zc = -20; if (z > top || z < bot) return 0; const t = z > zc ? (z - zc) / (top - zc) : (z - zc) / (zc - bot); return Math.sqrt(Math.max(0, 1 - t * t)) * (z > 60 ? 0.6 + 0.4 * (102 - z) / 42 : 1); }
function ctLungCx(z) { return 78 - Math.max(0, z - 40) * 0.25; }
/* the chest wall ellipse at a level: wide at the shoulders, narrower at the top and the bottom of the chest */
function ctBody(z) {
  if (z >= 94) return { a: 205, b: 92, cy: 0 };
  const t = (z + 130) / 224;   // 0 at the bases, 1 at the inlet
  return { a: 150 + 20 * Math.sin(Math.PI * Math.min(1, t * 1.15)), b: 104 + 10 * Math.sin(Math.PI * t), cy: 8 };
}
function ctEllipse(c, x, y, rx, ry, hu, stroke, rot) {
  const k = CT_S * ctZoom();
  c.save(); c.translate(ctPx(x), ctPy(y)); if (rot) c.rotate(-rot); c.beginPath(); c.ellipse(0, 0, rx * k, ry * k, 0, 0, Math.PI * 2); c.restore();
  if (hu !== null && hu !== undefined) { c.fillStyle = ctGray(hu); c.fill(); }
  if (stroke) { c.lineWidth = stroke[1] * k; c.strokeStyle = ctGray(stroke[0]); c.stroke(); }
}
function ctAdd(id, name, x, y, rx, ry, extra) { const s = Object.assign({ id: id, name: name, x: x, y: y, rx: rx, ry: ry }, extra || {}); CT.shapes.push(s); return s; }
/* vessel and airway tubes: sample the polyline; wherever the slice cuts the tube within its radius, a disc */
function ctTube(c, pts, r, hu, z, wall) {
  const discs = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(1, Math.ceil(len / 1.5));
    for (let k = 0; k <= n; k++) { const t = k / n, zz = a[2] + (b[2] - a[2]) * t, dz = zz - z; if (Math.abs(dz) < r) discs.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.sqrt(r * r - dz * dz)]); }
  }
  if (!discs.length) return null;
  if (wall) discs.forEach(d => ctEllipse(c, d[0], d[1], d[2] + wall[1], d[2] + wall[1], wall[0]));
  discs.forEach(d => ctEllipse(c, d[0], d[1], d[2], d[2], hu));
  // the centre of what was drawn, for the label and the hit test
  let sx = 0, sy = 0, mr = 0; discs.forEach(d => { sx += d[0]; sy += d[1]; mr = Math.max(mr, d[2]); });
  const xs = discs.map(d => d[0]), ys = discs.map(d => d[1]);
  return { x: sx / discs.length, y: sy / discs.length, rx: Math.max(mr, (Math.max.apply(null, xs) - Math.min.apply(null, xs)) / 2 + mr * 0.6), ry: Math.max(mr, (Math.max.apply(null, ys) - Math.min.apply(null, ys)) / 2 + mr * 0.6) };
}
function ctDraw() {
  const cv = CT.canvas; if (!cv) return;
  const c = cv.getContext('2d'), z = CT.z, M = AN.MEDIASTINUM, body = ctBody(z);
  CT.shapes = [];
  const dpr = cv.width / CT_W; c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = '#000'; c.fillRect(0, 0, CT_W, CT_H);
  const neck = z >= 94, lowZ = z < -80;
  // ---- the chest wall: skin, fat, muscle
  ctEllipse(c, 0, body.cy, body.a, body.b, 40);                       // skin
  ctEllipse(c, 0, body.cy, body.a - 2, body.b - 2, -100);               // subcutaneous fat
  ctEllipse(c, 0, body.cy, body.a - 14, body.b - 14, 45);               // the muscle layer (pectoral, intercostal, paraspinal)
  ctEllipse(c, 0, body.cy, body.a - 26, body.b - 26, -95);              // a little extrapleural fat
  if (!neck) {
    ctAdd('wall', 'Chest wall (skin, fat, muscle)', 0, body.cy + body.b - 10, 40, 10);
    // breasts / pectoral bulk in front, the paraspinal muscles behind
    ctEllipse(c, 0, body.cy - body.b + 20, 44, 18, 50); ctAdd('para', 'Paraspinal muscles', 0, body.cy - body.b + 20, 44, 18);
  }
  // ---- the lungs
  const fL = ctLungF(z, 1), fR = ctLungF(z, -1), lcx = ctLungCx(z);
  const lung = (side, f) => { if (f <= 0) return; const rx = 62 * f + (neck ? 0 : 6), ry = 100 * f; ctEllipse(c, side * lcx, 2, rx, ry, -860); ctAdd(side < 0 ? 'rlung' : 'llung', side < 0 ? 'Right lung' : 'Left lung', side * lcx, 2, rx, ry, { lung: side }); };
  lung(-1, fR); lung(1, fL);
  // lung texture and the small vessels
  if (CT.noise) { c.save(); c.globalAlpha = CT.win === 'lung' ? 0.22 : 0.06; [[-1, fR], [1, fL]].forEach(s => { if (s[1] > 0) { c.beginPath(); c.ellipse(ctPx(s[0] * lcx), ctPy(2), (62 * s[1] + (neck ? 0 : 6)) * CT_S * ctZoom(), 100 * s[1] * CT_S * ctZoom(), 0, 0, Math.PI * 2); c.save(); c.clip(); c.drawImage(CT.noise, 0, 0, CT_W, CT_H); c.restore(); } }); c.restore(); }
  ctLungDots().forEach(d => { const dz = d.z - z; if (Math.abs(dz) < d.r) { const rr = Math.sqrt(d.r * d.r - dz * dz); ctEllipse(c, d.x, d.y, rr, rr, rr < 1.1 ? 120 : 210); } });
  // the oblique fissures: a faint line, posterior-superior to anterior-inferior; the minor fissure on the right about the level of the middle lobe bronchus
  const fy = -62 + (44 - z) * 1.0;
  [[-1, fR], [1, fL]].forEach(s => {
    if (s[1] <= 0.3 || z > 44 || z < -104) return;
    const cx = s[0] * lcx, rx = 62 * s[1] + 6, ry = 100 * s[1];
    if (Math.abs(fy - 2) < ry) {
      const hw = rx * Math.sqrt(1 - Math.pow((fy - 2) / ry, 2));
      c.beginPath(); c.moveTo(ctPx(cx - hw), ctPy(fy + 4)); c.quadraticCurveTo(ctPx(cx), ctPy(fy - 10), ctPx(cx + hw), ctPy(fy + 4)); c.strokeStyle = ctGray(-480); c.lineWidth = 1.3; c.stroke();
      const upper = s[0] < 0 ? (z < -24 ? ['rml', 'Right middle lobe'] : ['rul', 'Right upper lobe']) : (z < -44 ? ['ling', 'Lingula (LUL)'] : ['lul', 'Left upper lobe']);
      const lower = s[0] < 0 ? ['rll', 'Right lower lobe'] : ['lll', 'Left lower lobe'];
      ctAdd(upper[0], upper[1], cx, Math.min(2 + ry - 14, fy + 26), rx * 0.7, 12, { lobe: 1, after: true });
      ctAdd(lower[0], lower[1], cx, Math.max(2 - ry + 14, fy - 26), rx * 0.7, 12, { lobe: 1, after: true });
      if (s[0] < 0 && z < -18 && z > -34) { c.beginPath(); c.moveTo(ctPx(cx - rx * 0.9), ctPy(fy + 26)); c.lineTo(ctPx(cx + rx * 0.9), ctPy(fy + 30)); c.strokeStyle = ctGray(-520); c.lineWidth = 1; c.stroke(); }
    } else if (fy - 2 >= ry) {
      const only = s[0] < 0 ? ['rll', 'Right lower lobe'] : ['lll', 'Left lower lobe'];
      ctAdd(only[0], only[1], cx, 2, rx * 0.7, 12, { lobe: 1, after: true });
    } else {
      const only = s[0] < 0 ? ['rul', 'Right upper lobe'] : ['lul', 'Left upper lobe'];
      ctAdd(only[0], only[1], cx, 2, rx * 0.7, 12, { lobe: 1, after: true });
    }
  });
  // ---- under the domes: liver on the right, spleen and the stomach on the left
  if (z < -80) {
    const dome = (top, R, cx, cy, hu, id, name) => { const d = top - z; if (d <= 0) return; const r = Math.sqrt(Math.max(0, R * R - (R - d) * (R - d))) * 1.15; if (r < 2) return; ctEllipse(c, cx, cy, Math.min(r, 95), Math.min(r * 0.78, 80), hu); ctAdd(id, name, cx, cy, Math.min(r, 95), Math.min(r * 0.78, 80)); };
    dome(-80, 110, -74, 8, 60, 'liver', 'Liver (right hemidiaphragm)');
    dome(-94, 90, 92, -36, 50, 'spleen', 'Spleen');
    if (z < -98) { ctEllipse(c, 52, 22, 34, 24, 30); ctAdd('stomach', 'Stomach', 52, 22, 34, 24); ctEllipse(c, 50, 34, 16, 9, -980); }
  }
  // ---- the mediastinal fat and the structures in it
  if (!neck) { const mw = 36 + Math.max(0, -z) * 0.1, mh = Math.max(40, 64 - Math.abs(z) * 0.1); ctEllipse(c, 2, 14, mw, mh, -90); }
  else { ctEllipse(c, 0, 2, 52, 44, 40); ctAdd('neckm', 'Strap and scalene muscles', 0, 40, 30, 8); }
  // the heart, the left atrium, the chambers
  M.blobs.slice().sort((a, b) => (a.id === 'heart' ? -1 : 0) - (b.id === 'heart' ? -1 : 0)).forEach(b => {   // the heart first, the atrium on it
    const dz = (z - b.c[2]) / b.s[2]; if (Math.abs(dz) >= 1) return; const g = Math.sqrt(1 - dz * dz);
    const cx = b.id === 'heart' ? b.c[0] + 10 + (b.c[2] - z) * 0.25 : b.c[0], rx = (b.id === 'heart' ? b.s[0] + 10 : b.s[0]) * g, ry = b.s[1] * g;
    if (b.id === 'heart') {
      ctEllipse(c, cx, b.c[1], rx, ry, 95); ctAdd('heart', 'Heart (pericardium and myocardium)', cx, b.c[1], rx, ry, { med: 'heart' });
      if (z < -52 && g > 0.35) {   // the ventricles: the right in front and to the right, the left behind and to the left, the septum between
        ctEllipse(c, cx - rx * 0.32, b.c[1] + ry * 0.22, rx * 0.5, ry * 0.5, 190, null, 0.5); ctAdd('rv', 'Right ventricle', cx - rx * 0.32, b.c[1] + ry * 0.22, rx * 0.5, ry * 0.45);
        ctEllipse(c, cx + rx * 0.34, b.c[1] - ry * 0.2, rx * 0.42, ry * 0.46, 200, [70, 5]); ctAdd('lv', 'Left ventricle', cx + rx * 0.34, b.c[1] - ry * 0.2, rx * 0.42, ry * 0.46);
        c.beginPath(); c.moveTo(ctPx(cx + rx * 0.02), ctPy(b.c[1] + ry * 0.7)); c.lineTo(ctPx(cx - rx * 0.02), ctPy(b.c[1] - ry * 0.6)); c.strokeStyle = ctGray(70); c.lineWidth = 5 * CT_S * ctZoom(); c.stroke(); ctAdd('ivs', 'Interventricular septum', cx, b.c[1], 6, ry * 0.6);
      } else if (z >= -52) {
        ctEllipse(c, cx - rx * 0.3, b.c[1] + ry * 0.3, rx * 0.4, ry * 0.4, 190); ctAdd('rvot', 'Right ventricular outflow / right atrium', cx - rx * 0.3, b.c[1] + ry * 0.3, rx * 0.4, ry * 0.4);
        ctEllipse(c, cx + rx * 0.1, b.c[1], 13 * g, 13 * g, 290, [60, 1.5]); ctAdd('aroot', 'Aortic root', cx + rx * 0.1, b.c[1], 13 * g, 13 * g);
      }
    } else { ctEllipse(c, cx, b.c[1], rx, ry, 210); ctAdd('la', 'Left atrium', cx, b.c[1], rx, ry, { med: 'la' }); }
  });
  // vessels (and the oesophagus), in order so that the larger lie under the smaller
  const order = ['spine', 'dao', 'arch', 'aao', 'mpa', 'lpa', 'rpa', 'svc', 'lbcv', 'rbcv', 'bca', 'lcc', 'lsc', 'azy', 'rspv', 'ripv', 'lspv', 'lipv', 'eso'];
  const HU_K = { a: 300, v: 230, e: 45, o: 250 };
  order.forEach(id => {
    const v = M.vessels.filter(x => x.id === id)[0]; if (!v || id === 'spine') return;
    const wall = id === 'eso' ? [45, 0] : (v.k === 'a' ? [120, 1.2] : null);
    const hit = ctTube(c, v.pts, v.r, HU_K[v.k], z, wall);
    if (hit) { ctAdd(id, v.l, hit.x, hit.y, hit.rx, hit.ry, { med: id }); if (id === 'eso') ctEllipse(c, hit.x, hit.y, 3.2, 1.3, -600); }
  });
  // the thyroid above the inlet
  if (z > 96) { [-1, 1].forEach(s => { ctEllipse(c, s * 17, 6, 8, 9, 130); }); ctEllipse(c, 0, 12, 12, 3.5, 130); ctAdd('thy', 'Thyroid', 0, 6, 26, 10); }
  // ---- the airways: each a cylinder, so the section is an ellipse stretched along the direction of the bronchus; the wall first, then the lumen
  const T3D = AN.TREE3D, air = [];
  Object.keys(T3D).forEach(k => {
    const n = T3D[k]; if (k === 'larynx') return;
    const a = n.a, b = n.b, dz = b[2] - a[2]; if (Math.abs(dz) < 0.5) return;
    const t = (z - a[2]) / dz, tMin = /^[rl]mb$/.test(k) ? 0.25 : 0.08; if (t < tMin || t > 1) return;
    const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, len = Math.hypot(b[0] - a[0], b[1] - a[1], dz), cos = Math.abs(dz) / len;
    const rx = Math.min(n.r * 3, n.r / Math.max(cos, 0.2)), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    air.push({ id: k, x: x, y: y, rx: rx, ry: n.r, ang: ang });
  });
  air.forEach(a => ctEllipse(c, a.x, a.y, a.rx + 1.6, a.ry + 1.6, 60, null, a.ang));
  air.forEach(a => ctEllipse(c, a.x, a.y, a.rx, a.ry, -990, null, a.ang));
  air.forEach(a => ctAdd(a.id, AN.TREE[a.id] ? AN.TREE[a.id].name : a.id, a.x, a.y, Math.max(a.rx, a.ry) + 1.6, Math.max(a.rx, a.ry) + 1.6, { tree: a.id }));
  // the nodal stations: small normal nodes
  M.nodes.forEach(n => { const dz = z - n.p[2], r = 4.5; if (Math.abs(dz) >= r) return; const rr = Math.sqrt(r * r - dz * dz); ctEllipse(c, n.p[0], n.p[1], rr, rr, 55); ctAdd('st' + n.id, 'Station ' + n.id + ' node', n.p[0], n.p[1], Math.max(rr, 3), Math.max(rr, 3), { station: n.id }); });
  // ---- bone: vertebra, ribs, sternum, clavicles, scapulae
  const disc = ((z % 24) + 24) % 24 < 5;
  ctEllipse(c, 0, -52, 17, 13.5, disc ? 90 : 240, [disc ? 200 : 700, 1.6]); ctAdd('vb', disc ? 'Intervertebral disc' : 'Vertebral body', 0, -52, 17, 13.5);
  c.beginPath(); c.moveTo(ctPx(-14), ctPy(-62)); c.quadraticCurveTo(ctPx(-20), ctPy(-84), ctPx(0), ctPy(-96)); c.quadraticCurveTo(ctPx(20), ctPy(-84), ctPx(14), ctPy(-62)); c.strokeStyle = ctGray(550); c.lineWidth = 4 * CT_S * ctZoom(); c.stroke();
  ctEllipse(c, 0, -73, 7.5, 6.5, 25); ctAdd('canal', 'Spinal canal (cord and CSF)', 0, -73, 7.5, 6.5);
  ctAdd('spp', 'Spinous process and laminae', 0, -92, 10, 6);
  [-1, 1].forEach(s => { ctEllipse(c, s * 26, -66, 10, 3.5, 450); });
  if (!neck) {
    // ribs: each slopes down from the spine to the sternum, so a slice meets two or three of them per side at different points of their course
    for (let k = 0; k <= 12; k++) {
      const z0 = 104 - 20 * k, phi = (z0 - z) * Math.PI / 46; if (phi < 0 || phi > Math.PI) continue;
      [-1, 1].forEach(s => {
        const x = s * (body.a - 26) * Math.sin(phi), y = body.cy - (body.b - 26) * Math.cos(phi), cart = phi > 0.78 * Math.PI;
        ctEllipse(c, x, y, 7, 4.2, cart ? 110 : 420, cart ? null : [700, 1.2], Math.atan2(-(body.b - 26) * Math.sin(phi) * s, (body.a - 26) * Math.cos(phi) * s) * s);
        if (k === Math.max(0, Math.floor((104 - z) / 20))) ctAdd('rib', (cart ? 'Costal cartilage' : 'Rib') + ' (' + (s < 0 ? 'right' : 'left') + ')', x, y, 8, 6);
      });
    }
    if (z < 48 && z > -92) { const man = z > 26, w = man ? 28 : 16; ctEllipse(c, 0, body.cy + body.b - 32, w, 5, 260, [650, 1.2]); ctAdd('stern', man ? 'Manubrium' : 'Body of the sternum', 0, body.cy + body.b - 32, w, 5); }
    if (z < 44 && z > -74) [-1, 1].forEach(s => { const ph0 = 0.12 * Math.PI, ph1 = 0.42 * Math.PI; c.beginPath(); for (let i = 0; i <= 12; i++) { const ph = ph0 + (ph1 - ph0) * i / 12, x = s * (body.a - 16) * Math.sin(ph), y = body.cy - (body.b - 16) * Math.cos(ph); if (i) c.lineTo(ctPx(x), ctPy(y)); else c.moveTo(ctPx(x), ctPy(y)); } c.strokeStyle = ctGray(520); c.lineWidth = 2.5 * CT_S * ctZoom(); c.stroke(); const mid = 0.27 * Math.PI; ctAdd('scap', 'Scapula (' + (s < 0 ? 'right' : 'left') + ')', s * (body.a - 16) * Math.sin(mid), body.cy - (body.b - 16) * Math.cos(mid), 12, 16); });
  } else {
    [-1, 1].forEach(s => { c.beginPath(); c.moveTo(ctPx(s * 14), ctPy(body.cy + body.b - 26)); c.quadraticCurveTo(ctPx(s * 60), ctPy(body.cy + body.b - 10), ctPx(s * 120), ctPy(body.cy + body.b - 44)); c.strokeStyle = ctGray(600); c.lineWidth = 9 * CT_S * ctZoom(); c.stroke(); ctAdd('clav', 'Clavicle (' + (s < 0 ? 'right' : 'left') + ')', s * 62, body.cy + body.b - 24, 40, 9); ctEllipse(c, s * 150, body.cy - 20, 22, 22, 350, [700, 1.5]); ctAdd('hum', 'Humeral head (' + (s < 0 ? 'right' : 'left') + ')', s * 150, body.cy - 20, 22, 22); ctEllipse(c, s * 118, body.cy - 36, 10, 24, 500); });
  }
  // ---- the whole picture: a little noise everywhere, then the hover highlight, then the labels
  if (CT.noise) { c.save(); c.globalAlpha = 0.05; c.drawImage(CT.noise, 0, 0, CT_W, CT_H); c.restore(); }
  const hl = CT.shapes.filter(s => s.id === CT.hl)[0];
  if (hl) { c.save(); c.beginPath(); c.ellipse(ctPx(hl.x), ctPy(hl.y), (hl.rx + 1.5) * CT_S * ctZoom(), (hl.ry + 1.5) * CT_S * ctZoom(), 0, 0, Math.PI * 2); c.strokeStyle = '#f2c14e'; c.lineWidth = 2.2; c.setLineDash([5, 3]); c.stroke(); c.restore(); }
  ctLabels(c);
  // orientation marks
  const k = ctScale();
  c.fillStyle = '#9aa0a8'; c.font = '600 ' + (12 * k) + 'px system-ui, sans-serif'; c.textAlign = 'center';
  c.fillText('A', CT_W / 2, 14 * k); c.fillText('P', CT_W / 2, CT_H - 5 * k); c.textAlign = 'left'; c.fillText('R', 6, CT_H / 2 + 4 * k); c.textAlign = 'right'; c.fillText('L', CT_W - 6, CT_H / 2 + 4 * k);
  c.textAlign = 'left'; c.font = (10.5 * k) + 'px system-ui, sans-serif'; c.fillStyle = '#7a8088'; c.fillText(CT_WIN_NAME[CT.win], 6, CT_H - 6 * k);
  c.textAlign = 'right'; c.fillText('z ' + (z >= 0 ? '+' : '−') + Math.abs(z) + ' mm from the carina', CT_W - 6, 14 * k);
}
/* which structures get a label at this level (the big landmarks; the nodes and lobes when they are on) */
function ctLabelSet() {
  const seen = {}, keep = [];
  CT.shapes.forEach(s => { if (/^(wall|para|neckm|spp|hum)$/.test(s.id)) return; if (s.station && !CT.labelNodes) return; if (s.tree && /^[rl]b/.test(s.tree) && !CT.labelSeg) return; if (seen[s.name]) return; seen[s.name] = 1; keep.push(s); });
  return keep;
}
function ctScale() { const r = CT.canvas ? CT.canvas.getBoundingClientRect() : null; return r && r.width ? CT_W / r.width : 1; }
function ctLabels(c) {
  CT.labelsOn = [];
  const list = ctLabelSet(); if (!list.length) return;
  CT.labelsOn = list;
  if (!CT.labels || CT.quiz) return;
  if (CT.mode === 'numbers') {
    const k = ctScale();
    list.forEach((s, i) => { const x = ctPx(s.x), y = ctPy(s.y); c.beginPath(); c.arc(x, y, 8 * k, 0, Math.PI * 2); c.fillStyle = 'rgba(242,193,78,0.92)'; c.fill(); c.fillStyle = '#1a1200'; c.font = '700 ' + (10 * k) + 'px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText(String(i + 1), x, y + 3.6 * k); });
    return;
  }
  // names in the margins with leader lines: each side sorted by height, spread so they do not overlap
  const left = list.filter(s => s.x < 0).sort((a, b) => a.y > b.y ? -1 : 1), right = list.filter(s => s.x >= 0).sort((a, b) => a.y > b.y ? -1 : 1);
  const k = ctScale(), fs = 11.5 * k;
  const place = (arr, side) => {
    const step = fs * 1.25, ys = arr.map(s => ctPy(s.y));
    for (let i = 1; i < ys.length; i++) if (ys[i] < ys[i - 1] + step) ys[i] = ys[i - 1] + step;
    const over = ys.length ? ys[ys.length - 1] - (CT_H - 10) : 0; if (over > 0) for (let i = 0; i < ys.length; i++) ys[i] -= over;
    for (let i = ys.length - 2; i >= 0; i--) if (ys[i] > ys[i + 1] - step) ys[i] = ys[i + 1] - step;
    arr.forEach((s, i) => {
      const ax = ctPx(s.x), ay = ctPy(s.y), tx = side < 0 ? 8 : CT_W - 8;
      c.font = fs + 'px system-ui, sans-serif'; const tw = c.measureText(s.name).width;
      const ex = side < 0 ? Math.min(ax - 4, 12 + tw) : Math.max(ax + 4, CT_W - 12 - tw);
      c.beginPath(); c.moveTo(ex, ys[i] - fs * 0.35); c.lineTo(ax, ay); c.strokeStyle = 'rgba(242,193,78,0.75)'; c.lineWidth = Math.max(1, k * 0.8); c.stroke();
      c.beginPath(); c.arc(ax, ay, 2 * k, 0, Math.PI * 2); c.fillStyle = '#f2c14e'; c.fill();
      c.textAlign = side < 0 ? 'left' : 'right'; c.fillStyle = '#f6efd6';
      c.fillText(s.name, tx, ys[i]);
    });
  };
  place(left, -1); place(right, 1);
}
/* hit test in model coordinates: the topmost (last drawn, smallest) shape under the pointer */
function ctHit(x, y) {
  let best = null, bestA = 1e9;
  CT.shapes.forEach(s => { const dx = (x - s.x) / s.rx, dy = (y - s.y) / s.ry; if (dx * dx + dy * dy <= 1) { const a = s.rx * s.ry; if (a < bestA) { bestA = a; best = s; } } });
  return best;
}
function ctSetZ(z, keep) {
  CT.z = Math.max(CT_Z[0], Math.min(CT_Z[1], Math.round(z)));
  if (typeof T3 !== 'undefined') { T3.ctZ = CT.z; if (T3.med && T3.med.plane) T3.med.plane.position.set(0, CT.z, 0); }
  const sl = document.querySelector('[data-ct-z]'); if (sl && +sl.value !== CT.z) sl.value = CT.z;
  const rd = document.querySelector('[data-ct-level]'); if (rd) rd.textContent = ctLevelName();
  ctDraw();
  if (!keep) { const q = CT.quiz; if (q && !q.done && !CT.shapes.some(s => s.id === q.target)) { q.target = ''; } }
  ctListRefresh();
}
function ctLevelName() {
  let best = CT_LEVELS[0]; CT_LEVELS.forEach(l => { if (Math.abs(l[0] - CT.z) < Math.abs(best[0] - CT.z)) best = l; });
  return (Math.abs(best[0] - CT.z) <= 8 ? best[1] : (CT.z > 0 ? 'Above the carina' : 'Below the carina')) + ' · ' + (CT.z >= 0 ? '+' : '−') + Math.abs(CT.z) + ' mm';
}
function ctListRefresh() {
  const box = document.querySelector('[data-ct-list]'); if (!box) return;
  box.textContent = '';
  if (CT.quiz) { box.appendChild(ctQuizBox()); return; }
  if (!CT.labels) { box.appendChild(h('p', { class: 'fine', text: 'Labels hidden — hover or tap a structure to name it.' })); return; }
  const list = CT.labelsOn;
  box.appendChild(h('ol', { class: 'ct-list' + (CT.mode === 'numbers' ? ' num' : '') }, list.map(s => h('li', { 'data-ct-item': s.id, class: s.id === CT.hl ? 'hl' : '', text: s.name, onmouseenter: () => ctHover(s), onmouseleave: () => ctHover(null) }))));
}
function ctHover(s) {
  const id = s ? s.id : '';
  if (id === CT.hl) return;
  CT.hl = id; ctDraw();
  const rd = document.querySelector('[data-ct-hover]'); if (rd) rd.textContent = s ? s.name : '';
  document.querySelectorAll('[data-ct-item]').forEach(li => li.classList.toggle('hl', li.getAttribute('data-ct-item') === id));
  if (typeof anatHover === 'function') anatHover(s && s.station ? s.station : '', s && s.med ? s.med : '');
}
/* the quiz: find a named structure on the picture */
function ctQuizStart() {
  CT.quiz = { target: '', tries: 0, done: false, wrong: '', n: 0, score: 0 };
  ctQuizNext();
}
function ctQuizNext() {
  const q = CT.quiz; if (!q) return;
  const pool = ctLabelSet();
  if (!pool.length) { q.target = ''; ctListRefresh(); return; }
  let t; do { t = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && t.id === q.last);
  q.target = t.id; q.name = t.name; q.last = t.id; q.tries = 0; q.done = false; q.wrong = ''; q.n++;
  ctDraw(); ctListRefresh();
}
function ctQuizBox() {
  const q = CT.quiz, t = CT.shapes.filter(s => s.id === q.target)[0];
  return h('div', { class: 'an-drill on', 'data-ctq': q.done ? 'done' : (q.target ? 'on' : 'none') }, [
    t ? h('p', {}, [h('span', { class: 'lbl', text: 'Tap: ' }), h('b', { text: q.name }), ' ', h('span', { class: 'fine', text: 'Question ' + q.n + ' · score ' + q.score })]) : h('p', { class: 'fine', text: 'That structure is not on this level any more — next question.' }),
    q.done ? h('p', { class: 'an-found', text: 'Correct' + (q.tries > 1 ? ' (after ' + q.tries + ' taps).' : '.') }) : (q.wrong ? h('p', { class: 'an-wrong', text: 'That is the ' + q.wrong.toLowerCase() + '. Try again.' }) : null),
    h('div', { class: 'an-drill-acts' }, [h('button', { type: 'button', class: 'btn sm', 'data-ctq-next': '1', text: q.done || !t ? 'Next' : 'Skip', onclick: ctQuizNext }), h('button', { type: 'button', class: 'btn sm quiet', 'data-ctq-stop': '1', text: 'Stop the quiz', onclick: () => { CT.quiz = null; ctDraw(); ctListRefresh(); } })])
  ]);
}
function ctTap(s) {
  const q = CT.quiz; if (!q || q.done || !q.target) { if (s && s.station && typeof ebusPop === 'function' && !q) ebusPop(s.station); return; }
  q.tries++;
  if (s && s.id === q.target) { q.done = true; q.score += q.tries === 1 ? 1 : 0; q.wrong = ''; CT.hl = s.id; ctDraw(); }
  else q.wrong = s ? s.name : 'nothing';
  ctListRefresh();
}
function ctEnsureCanvas() {
  if (CT.canvas) return CT.canvas;
  const cv = document.createElement('canvas'); const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = CT_W * dpr; cv.height = CT_H * dpr; cv.className = 'ct-canvas'; cv.setAttribute('tabindex', '0'); cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Axial CT section (schematic)');
  // the noise texture, made once
  const n = document.createElement('canvas'); n.width = 400; n.height = 250; const nc = n.getContext('2d'), im = nc.createImageData(400, 250), rnd = ctRand(99);
  for (let i = 0; i < im.data.length; i += 4) { const v = 90 + Math.floor(rnd() * 150); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  nc.putImageData(im, 0, 0); CT.noise = n;
  const pos = (e) => { const r = cv.getBoundingClientRect(), k = CT_S * ctZoom(); const px = (e.clientX - r.left) * CT_W / r.width, py = (e.clientY - r.top) * CT_H / r.height; return [(px - CT_W / 2) / k, CT_CY - (py - CT_H / 2) / k]; };
  cv.addEventListener('pointermove', (e) => { const p = pos(e); ctHover(ctHit(p[0], p[1])); });
  cv.addEventListener('pointerleave', () => ctHover(null));
  cv.addEventListener('click', (e) => { const p = pos(e); ctTap(ctHit(p[0], p[1])); });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); ctSetZ(CT.z + (e.deltaY > 0 ? -4 : 4)); }, { passive: false });
  cv.addEventListener('keydown', (e) => { if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); ctSetZ(CT.z + (e.key === 'PageUp' ? 20 : 4)); } else if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); ctSetZ(CT.z - (e.key === 'PageDown' ? 20 : 4)); } });
  let rt = 0; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (!cv.isConnected) return; const r = cv.getBoundingClientRect(), m = r.width < 430 ? 'numbers' : 'names'; const was = CT.mode; CT.mode = m; ctDraw(); if (m !== was) ctListRefresh(); }, 120); });
  CT.canvas = cv; return cv;
}
function ctLab() {
  const cv = ctEnsureCanvas();
  const labId = uid('ctl'), nodId = uid('ctn'), segId = uid('cts');
  const wins = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Window' }, [['lung', 'Lung'], ['med', 'Mediastinal'], ['bone', 'Bone']].map(w => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-ct-win': w[0], 'aria-checked': String(CT.win === w[0]), text: w[1], onclick: (e) => { CT.win = w[0]; e.target.parentElement.querySelectorAll('[data-ct-win]').forEach(b => b.setAttribute('aria-checked', String(b.getAttribute('data-ct-win') === w[0]))); ctDraw(); } })));
  const opts = h('div', { class: 'an-3d-modes ct-opts' }, [wins,
    h('label', { class: 'chk-inline', for: labId }, [h('input', { type: 'checkbox', id: labId, checked: CT.labels, 'data-ct-labels': '1', onchange: (e) => { CT.labels = e.target.checked; ctDraw(); ctListRefresh(); } }), 'Labels']),
    h('label', { class: 'chk-inline', for: nodId }, [h('input', { type: 'checkbox', id: nodId, checked: !!CT.labelNodes, 'data-ct-nodes': '1', onchange: (e) => { CT.labelNodes = e.target.checked; ctDraw(); ctListRefresh(); } }), 'Nodal stations']),
    h('label', { class: 'chk-inline', for: segId }, [h('input', { type: 'checkbox', id: segId, checked: !!CT.labelSeg, 'data-ct-seg': '1', onchange: (e) => { CT.labelSeg = e.target.checked; ctDraw(); ctListRefresh(); } }), 'Segmental bronchi']),
    CT.quiz ? null : h('button', { type: 'button', class: 'btn sm', 'data-ctq-start': '1', text: 'Quiz: find the structure', onclick: () => { ctQuizStart(); } })]);
  const slider = h('input', { type: 'range', min: CT_Z[0], max: CT_Z[1], step: 2, value: CT.z, 'data-ct-z': '1', 'aria-label': 'Level (mm from the carina)', class: 'ct-slider', oninput: (e) => ctSetZ(+e.target.value) });
  const presets = h('div', { class: 'ct-presets' }, CT_LEVELS.map(l => h('button', { type: 'button', class: 'ch', 'data-ct-preset': l[0], text: l[1], onclick: () => ctSetZ(l[0]) })));
  const stage = h('div', { class: 'ct-stage' }, [cv, h('div', { class: 'ct-hover', 'data-ct-hover': '1' })]);
  const levelRow = h('div', { class: 'ct-level' }, [h('button', { type: 'button', class: 'btn sm quiet', 'data-ct-up': '1', title: 'Up (↑ on the picture, or the wheel)', text: '▲ Up', onclick: () => ctSetZ(CT.z + 4) }), slider, h('button', { type: 'button', class: 'btn sm quiet', 'data-ct-down': '1', text: '▼ Down', onclick: () => ctSetZ(CT.z - 4) }), h('span', { class: 'ct-levelname', 'data-ct-level': '1', text: ctLevelName() })]);
  const list = h('div', { class: 'ct-listbox', 'data-ct-list': '1' });
  const left = h('div', { class: 'ct-left' }, [opts, stage, levelRow, presets, list]);
  const right = h('div', { class: 'ct-right' }, [typeof tree3dFig === 'function' ? tree3dFig(true) : null]);
  const fig = h('figure', { class: 'an-fig ct-lab', 'data-ct': '1' }, [h('div', { class: 'ct-grid' }, [left, right]),
    h('figcaption', { text: 'A schematic axial CT, drawn from the same model as the 3D views (standard adult dimensions, contrast in the vessels) and shown through a window as on the console. Radiological convention: the patient’s right is on the left of the picture, anterior at the top. Scroll with the slider, the wheel or ↑ ↓; hover or tap a structure to name it and light it on the model; hide the labels or start the quiz to test yourself.' })]);
  CT.mode = 'names';
  setTimeout(() => { const r = cv.getBoundingClientRect(); CT.mode = r.width < 430 ? 'numbers' : 'names'; ctSetZ(CT.z, true); }, 0);
  ctSetZ(CT.z, true);
  return fig;
}
function ctWidget(kind) { return kind === 'ct' ? ctLab() : null; }
