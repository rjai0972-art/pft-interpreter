
/* ========================================================================== Learn: the 3D airway
   A navigable three-dimensional model of the same tree (three.js, inlined; MIT). Two views share one WebGL canvas:
   "outside" — the whole tree, orbit with a drag, zoom with the wheel or a pinch, tap a branch to go there;
   "inside" — the bronchoscopist's view from the current airway, built on the fly by marching cubes over the union of
   the airway capsules around that node, so the openings ahead are real holes in the wall; drag to look around,
   tap an opening to advance. A procedural model from standard dimensions, not a patient's CT. */
const MC_EDGE = [0,265,515,778,1030,1295,1541,1804,2060,2309,2575,2822,3082,3331,3593,3840,400,153,915,666,1430,1183,1941,1692,2460,2197,2975,2710,3482,3219,3993,3728,560,825,51,314,1590,1855,1077,1340,2620,2869,2111,2358,3642,3891,3129,3376,928,681,419,170,1958,1711,1445,1196,2988,2725,2479,2214,4010,3747,3497,3232,1120,1385,1635,1898,102,367,613,876,3180,3429,3695,3942,2154,2403,2665,2912,1520,1273,2035,1786,502,255,1013,764,3580,3317,4095,3830,2554,2291,3065,2800,1616,1881,1107,1370,598,863,85,348,3676,3925,3167,3414,2650,2899,2137,2384,1984,1737,1475,1226,966,719,453,204,4044,3781,3535,3270,3018,2755,2505,2240,2240,2505,2755,3018,3270,3535,3781,4044,204,453,719,966,1226,1475,1737,1984,2384,2137,2899,2650,3414,3167,3925,3676,348,85,863,598,1370,1107,1881,1616,2800,3065,2291,2554,3830,4095,3317,3580,764,1013,255,502,1786,2035,1273,1520,2912,2665,2403,2154,3942,3695,3429,3180,876,613,367,102,1898,1635,1385,1120,3232,3497,3747,4010,2214,2479,2725,2988,1196,1445,1711,1958,170,419,681,928,3376,3129,3891,3642,2358,2111,2869,2620,1340,1077,1855,1590,314,51,825,560,3728,3993,3219,3482,2710,2975,2197,2460,1692,1941,1183,1430,666,915,153,400,3840,3593,3331,3082,2822,2575,2309,2060,1804,1541,1295,1030,778,515,265,0];
const MC_TRI = [[],[0,8,3],[0,1,9],[1,8,3,9,8,1],[1,2,10],[0,8,3,1,2,10],[9,2,10,0,2,9],[2,8,3,2,10,8,10,9,8],[3,11,2],[0,11,2,8,11,0],[1,9,0,2,3,11],[1,11,2,1,9,11,9,8,11],[3,10,1,11,10,3],[0,10,1,0,8,10,8,11,10],[3,9,0,3,11,9,11,10,9],[9,8,10,10,8,11],[4,7,8],[4,3,0,7,3,4],[0,1,9,8,4,7],[4,1,9,4,7,1,7,3,1],[1,2,10,8,4,7],[3,4,7,3,0,4,1,2,10],[9,2,10,9,0,2,8,4,7],[2,10,9,2,9,7,2,7,3,7,9,4],[8,4,7,3,11,2],[11,4,7,11,2,4,2,0,4],[9,0,1,8,4,7,2,3,11],[4,7,11,9,4,11,9,11,2,9,2,1],[3,10,1,3,11,10,7,8,4],[1,11,10,1,4,11,1,0,4,7,11,4],[4,7,8,9,0,11,9,11,10,11,0,3],[4,7,11,4,11,9,9,11,10],[9,5,4],[9,5,4,0,8,3],[0,5,4,1,5,0],[8,5,4,8,3,5,3,1,5],[1,2,10,9,5,4],[3,0,8,1,2,10,4,9,5],[5,2,10,5,4,2,4,0,2],[2,10,5,3,2,5,3,5,4,3,4,8],[9,5,4,2,3,11],[0,11,2,0,8,11,4,9,5],[0,5,4,0,1,5,2,3,11],[2,1,5,2,5,8,2,8,11,4,8,5],[10,3,11,10,1,3,9,5,4],[4,9,5,0,8,1,8,10,1,8,11,10],[5,4,0,5,0,11,5,11,10,11,0,3],[5,4,8,5,8,10,10,8,11],[9,7,8,5,7,9],[9,3,0,9,5,3,5,7,3],[0,7,8,0,1,7,1,5,7],[1,5,3,3,5,7],[9,7,8,9,5,7,10,1,2],[10,1,2,9,5,0,5,3,0,5,7,3],[8,0,2,8,2,5,8,5,7,10,5,2],[2,10,5,2,5,3,3,5,7],[7,9,5,7,8,9,3,11,2],[9,5,7,9,7,2,9,2,0,2,7,11],[2,3,11,0,1,8,1,7,8,1,5,7],[11,2,1,11,1,7,7,1,5],[9,5,8,8,5,7,10,1,3,10,3,11],[5,7,0,5,0,9,7,11,0,1,0,10,11,10,0],[11,10,0,11,0,3,10,5,0,8,0,7,5,7,0],[11,10,5,7,11,5],[10,6,5],[0,8,3,5,10,6],[9,0,1,5,10,6],[1,8,3,1,9,8,5,10,6],[1,6,5,2,6,1],[1,6,5,1,2,6,3,0,8],[9,6,5,9,0,6,0,2,6],[5,9,8,5,8,2,5,2,6,3,2,8],[2,3,11,10,6,5],[11,0,8,11,2,0,10,6,5],[0,1,9,2,3,11,5,10,6],[5,10,6,1,9,2,9,11,2,9,8,11],[6,3,11,6,5,3,5,1,3],[0,8,11,0,11,5,0,5,1,5,11,6],[3,11,6,0,3,6,0,6,5,0,5,9],[6,5,9,6,9,11,11,9,8],[5,10,6,4,7,8],[4,3,0,4,7,3,6,5,10],[1,9,0,5,10,6,8,4,7],[10,6,5,1,9,7,1,7,3,7,9,4],[6,1,2,6,5,1,4,7,8],[1,2,5,5,2,6,3,0,4,3,4,7],[8,4,7,9,0,5,0,6,5,0,2,6],[7,3,9,7,9,4,3,2,9,5,9,6,2,6,9],[3,11,2,7,8,4,10,6,5],[5,10,6,4,7,2,4,2,0,2,7,11],[0,1,9,4,7,8,2,3,11,5,10,6],[9,2,1,9,11,2,9,4,11,7,11,4,5,10,6],[8,4,7,3,11,5,3,5,1,5,11,6],[5,1,11,5,11,6,1,0,11,7,11,4,0,4,11],[0,5,9,0,6,5,0,3,6,11,6,3,8,4,7],[6,5,9,6,9,11,4,7,9,7,11,9],[10,4,9,6,4,10],[4,10,6,4,9,10,0,8,3],[10,0,1,10,6,0,6,4,0],[8,3,1,8,1,6,8,6,4,6,1,10],[1,4,9,1,2,4,2,6,4],[3,0,8,1,2,9,2,4,9,2,6,4],[0,2,4,4,2,6],[8,3,2,8,2,4,4,2,6],[10,4,9,10,6,4,11,2,3],[0,8,2,2,8,11,4,9,10,4,10,6],[3,11,2,0,1,6,0,6,4,6,1,10],[6,4,1,6,1,10,4,8,1,2,1,11,8,11,1],[9,6,4,9,3,6,9,1,3,11,6,3],[8,11,1,8,1,0,11,6,1,9,1,4,6,4,1],[3,11,6,3,6,0,0,6,4],[6,4,8,11,6,8],[7,10,6,7,8,10,8,9,10],[0,7,3,0,10,7,0,9,10,6,7,10],[10,6,7,1,10,7,1,7,8,1,8,0],[10,6,7,10,7,1,1,7,3],[1,2,6,1,6,8,1,8,9,8,6,7],[2,6,9,2,9,1,6,7,9,0,9,3,7,3,9],[7,8,0,7,0,6,6,0,2],[7,3,2,6,7,2],[2,3,11,10,6,8,10,8,9,8,6,7],[2,0,7,2,7,11,0,9,7,6,7,10,9,10,7],[1,8,0,1,7,8,1,10,7,6,7,10,2,3,11],[11,2,1,11,1,7,10,6,1,6,7,1],[8,9,6,8,6,7,9,1,6,11,6,3,1,3,6],[0,9,1,11,6,7],[7,8,0,7,0,6,3,11,0,11,6,0],[7,11,6],[7,6,11],[3,0,8,11,7,6],[0,1,9,11,7,6],[8,1,9,8,3,1,11,7,6],[10,1,2,6,11,7],[1,2,10,3,0,8,6,11,7],[2,9,0,2,10,9,6,11,7],[6,11,7,2,10,3,10,8,3,10,9,8],[7,2,3,6,2,7],[7,0,8,7,6,0,6,2,0],[2,7,6,2,3,7,0,1,9],[1,6,2,1,8,6,1,9,8,8,7,6],[10,7,6,10,1,7,1,3,7],[10,7,6,1,7,10,1,8,7,1,0,8],[0,3,7,0,7,10,0,10,9,6,10,7],[7,6,10,7,10,8,8,10,9],[6,8,4,11,8,6],[3,6,11,3,0,6,0,4,6],[8,6,11,8,4,6,9,0,1],[9,4,6,9,6,3,9,3,1,11,3,6],[6,8,4,6,11,8,2,10,1],[1,2,10,3,0,11,0,6,11,0,4,6],[4,11,8,4,6,11,0,2,9,2,10,9],[10,9,3,10,3,2,9,4,3,11,3,6,4,6,3],[8,2,3,8,4,2,4,6,2],[0,4,2,4,6,2],[1,9,0,2,3,4,2,4,6,4,3,8],[1,9,4,1,4,2,2,4,6],[8,1,3,8,6,1,8,4,6,6,10,1],[10,1,0,10,0,6,6,0,4],[4,6,3,4,3,8,6,10,3,0,3,9,10,9,3],[10,9,4,6,10,4],[4,9,5,7,6,11],[0,8,3,4,9,5,11,7,6],[5,0,1,5,4,0,7,6,11],[11,7,6,8,3,4,3,5,4,3,1,5],[9,5,4,10,1,2,7,6,11],[6,11,7,1,2,10,0,8,3,4,9,5],[7,6,11,5,4,10,4,2,10,4,0,2],[3,4,8,3,5,4,3,2,5,10,5,2,11,7,6],[7,2,3,7,6,2,5,4,9],[9,5,4,0,8,6,0,6,2,6,8,7],[3,6,2,3,7,6,1,5,0,5,4,0],[6,2,8,6,8,7,2,1,8,4,8,5,1,5,8],[9,5,4,10,1,6,1,7,6,1,3,7],[1,6,10,1,7,6,1,0,7,8,7,0,9,5,4],[4,0,10,4,10,5,0,3,10,6,10,7,3,7,10],[7,6,10,7,10,8,5,4,10,4,8,10],[6,9,5,6,11,9,11,8,9],[3,6,11,0,6,3,0,5,6,0,9,5],[0,11,8,0,5,11,0,1,5,5,6,11],[6,11,3,6,3,5,5,3,1],[1,2,10,9,5,11,9,11,8,11,5,6],[0,11,3,0,6,11,0,9,6,5,6,9,1,2,10],[11,8,5,11,5,6,8,0,5,10,5,2,0,2,5],[6,11,3,6,3,5,2,10,3,10,5,3],[5,8,9,5,2,8,5,6,2,3,8,2],[9,5,6,9,6,0,0,6,2],[1,5,8,1,8,0,5,6,8,3,8,2,6,2,8],[1,5,6,2,1,6],[1,3,6,1,6,10,3,8,6,5,6,9,8,9,6],[10,1,0,10,0,6,9,5,0,5,6,0],[0,3,8,5,6,10],[10,5,6],[11,5,10,7,5,11],[11,5,10,11,7,5,8,3,0],[5,11,7,5,10,11,1,9,0],[10,7,5,10,11,7,9,8,1,8,3,1],[11,1,2,11,7,1,7,5,1],[0,8,3,1,2,7,1,7,5,7,2,11],[9,7,5,9,2,7,9,0,2,2,11,7],[7,5,2,7,2,11,5,9,2,3,2,8,9,8,2],[2,5,10,2,3,5,3,7,5],[8,2,0,8,5,2,8,7,5,10,2,5],[9,0,1,5,10,3,5,3,7,3,10,2],[9,8,2,9,2,1,8,7,2,10,2,5,7,5,2],[1,3,5,3,7,5],[0,8,7,0,7,1,1,7,5],[9,0,3,9,3,5,5,3,7],[9,8,7,5,9,7],[5,8,4,5,10,8,10,11,8],[5,0,4,5,11,0,5,10,11,11,3,0],[0,1,9,8,4,10,8,10,11,10,4,5],[10,11,4,10,4,5,11,3,4,9,4,1,3,1,4],[2,5,1,2,8,5,2,11,8,4,5,8],[0,4,11,0,11,3,4,5,11,2,11,1,5,1,11],[0,2,5,0,5,9,2,11,5,4,5,8,11,8,5],[9,4,5,2,11,3],[2,5,10,3,5,2,3,4,5,3,8,4],[5,10,2,5,2,4,4,2,0],[3,10,2,3,5,10,3,8,5,4,5,8,0,1,9],[5,10,2,5,2,4,1,9,2,9,4,2],[8,4,5,8,5,3,3,5,1],[0,4,5,1,0,5],[8,4,5,8,5,3,9,0,5,0,3,5],[9,4,5],[4,11,7,4,9,11,9,10,11],[0,8,3,4,9,7,9,11,7,9,10,11],[1,10,11,1,11,4,1,4,0,7,4,11],[3,1,4,3,4,8,1,10,4,7,4,11,10,11,4],[4,11,7,9,11,4,9,2,11,9,1,2],[9,7,4,9,11,7,9,1,11,2,11,1,0,8,3],[11,7,4,11,4,2,2,4,0],[11,7,4,11,4,2,8,3,4,3,2,4],[2,9,10,2,7,9,2,3,7,7,4,9],[9,10,7,9,7,4,10,2,7,8,7,0,2,0,7],[3,7,10,3,10,2,7,4,10,1,10,0,4,0,10],[1,10,2,8,7,4],[4,9,1,4,1,7,7,1,3],[4,9,1,4,1,7,0,8,1,8,7,1],[4,0,3,7,4,3],[4,8,7],[9,10,8,10,11,8],[3,0,9,3,9,11,11,9,10],[0,1,10,0,10,8,8,10,11],[3,1,10,11,3,10],[1,2,11,1,11,9,9,11,8],[3,0,9,3,9,11,1,2,9,2,11,9],[0,2,11,8,0,11],[3,2,11],[2,3,8,2,8,10,10,8,9],[9,10,2,0,9,2],[2,3,8,2,8,10,0,1,8,1,10,8],[1,10,2],[1,3,8,9,1,8],[0,9,1],[0,3,8],[]];
const T3 = { mode: 'out', renderer: null, canvas: null, out: null, med: null, inn: null, innFor: '', raf: 0, size: [0, 0], drag: null, yaw: 0, pitch: 0, orbit: { th: 0.5, ph: 1.25, d: 330 }, orbitMed: { th: 0.4, ph: 1.35, d: 430 }, tween: null, depth: 6, depthFor: '', labels: true };
function t3Orbit() { return T3.mode === 'med' ? T3.orbitMed : T3.orbit; }
/* ---- position along the current airway, in millimetres from its start (real lengths: trachea 11 cm, RMB 2.4 cm, LMB 4.6 cm …) */
function t3Len(id) { const s = t3Seg(id); return s.a.distanceTo(s.b); }
function t3Depth() { if (T3.depthFor !== treeAt) { T3.depthFor = treeAt; T3.depth = Math.min(6, t3Len(treeAt) * 0.4); } return T3.depth; }
function t3MaxDepth(id) { const len = t3Len(id); return AN.TREE[id].kids.length > 1 ? Math.max(0, len - 10) : len; }   // the tip is held a centimetre back from a carina to see both openings
function t3SetDepth(mm) {
  T3.depthFor = treeAt; T3.depth = Math.max(0, Math.min(t3MaxDepth(treeAt), mm));
  if (treeAt === 'trachea') treeLevel = T3.depth < 60 ? 'upper' : 'lower';   // the scope view's ring follows the level
}
/* advance or pull back by `mm`; past the end the openings must be chosen, before the start the scope is back in the parent */
function t3Move(mm) {
  const T = AN.TREE, n = T[treeAt], d = t3Depth(), len = t3Len(treeAt);
  if (mm < 0 && d <= 10 && n.parent) { T3.refocus = true; t3Enter(n.parent, Math.max(0, t3MaxDepth(n.parent) - 4)); return; }
  if (mm > 0 && d >= t3MaxDepth(treeAt) - 0.5 && n.kids.length === 1) { T3.refocus = true; t3Enter(n.kids[0], 4); return; }
  t3SetDepth(d + mm); render();
}
/* go to another airway with the scope at a given depth in it (the depth is set before the page re-renders) */
function t3Enter(id, mm) {
  T3.depthFor = id; T3.depth = Math.max(0, Math.min(t3MaxDepth(id), mm));
  if (id === 'trachea') treeLevel = T3.depth < 60 ? 'upper' : 'lower';
  treeGo(id, true);
}
/* the distance readout: into this airway, to the next branching, and from the vocal cords along the whole path */
function t3DepthText() {
  const T = AN.TREE, n = T[treeAt], d = t3Depth(), len = t3Len(treeAt), path = treePath(treeAt);
  if (treeAt === 'larynx') return 'At the larynx: the vocal cords are the start of the measured path.';
  let fromCords = 0; path.forEach(k => { if (k !== 'larynx' && k !== treeAt) fromCords += t3Len(k); }); fromCords += d;
  const cm = (v) => (v / 10).toFixed(1) + ' cm';
  const next = AN.NEXT_BRANCH[treeAt] || (n.kids.length ? 'the next branching' : 'the end of the navigable airway');
  const rest = len - d, atEnd = d >= t3MaxDepth(treeAt) - 0.5;
  return cm(d) + ' into the ' + n.name.toLowerCase().replace(/ \(.*\)$/, '') + ' (' + cm(len) + ' long) · ' + (atEnd ? (n.kids.length > 1 ? cm(rest) + ' to ' + next + ', tip held back to see it: choose an opening' : (n.kids.length ? 'at ' + next : 'end of the navigable airway')) : cm(rest) + ' to ' + next) + ' · ' + cm(fromCords) + ' from the vocal cords';
}
function t3Available() { return typeof THREE !== 'undefined' && (function () { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } })(); }
const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
/* three.js is y-up and right-handed; the model is z-up with x toward the patient's left and y anterior: map (x, y, z) model →
   (x, z, y) scene, so the scene's +z is anterior (facing the default camera) and the patient's left is the viewer's right,
   the anterior view of a chest film. (Negating any one axis would mirror the anatomy.) */
const toScene = (a) => new THREE.Vector3(a[0], a[2], a[1]);
function t3Seg(id) { const n = AN.TREE3D[id]; return { a: toScene(n.a), b: toScene(n.b), r: n.r, rings: !!n.rings }; }
/* a text label that always faces the camera (a sprite drawn on a small canvas), sized in millimetres */
function t3Label(text, opts) {
  opts = opts || {};
  const px = 28, cv = document.createElement('canvas'), c0 = cv.getContext('2d');
  c0.font = '600 ' + px + 'px system-ui, sans-serif';
  const w = Math.ceil(c0.measureText(text).width) + 20, hh = px + 16;
  cv.width = w; cv.height = hh;
  const c = cv.getContext('2d');
  c.font = '600 ' + px + 'px system-ui, sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'center';
  c.lineJoin = 'round'; c.lineWidth = 7; c.strokeStyle = opts.halo || 'rgba(255,255,255,0.92)'; c.strokeText(text, w / 2, hh / 2);
  c.fillStyle = opts.color || '#2b2520'; c.fillText(text, w / 2, hh / 2);
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  const hmm = opts.h || 7; sp.scale.set(hmm * w / hh, hmm, 1); sp.renderOrder = 10;
  return sp;
}
/* ---- the outside scene: a capsule per airway */
function t3BuildOut() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4ec, 0x5a4a44, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 0.7); sun.position.set(120, 200, 160); scene.add(sun);
  const meshes = {}, group = new THREE.Group();
  Object.keys(AN.TREE3D).forEach(id => {
    const s = t3Seg(id), dir = s.b.clone().sub(s.a), len = dir.length();
    const geo = new THREE.CylinderGeometry(s.r, s.r * (AN.TREE[id].kids.length ? 1 : 0.85), len, 20, 1, true);
    const mat = new THREE.MeshStandardMaterial({ color: 0xd9a49c, roughness: 0.55, metalness: 0.02 });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(s.a).add(dir.clone().multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    m.userData.id = id; group.add(m); meshes[id] = m;
    const j = new THREE.Mesh(new THREE.SphereGeometry(s.r, 16, 12), mat); j.position.copy(s.b); j.userData.id = id; group.add(j); meshes[id + '.j'] = j;
  });
  scene.add(group);
  const cam = new THREE.PerspectiveCamera(38, 1, 1, 2000);
  return { scene: scene, camera: cam, meshes: meshes, group: group };
}
/* ---- the mediastinum: the same tree with the vessels, the oesophagus, the spine, the heart and the nodal stations around it */
const MED_COL = { a: 0xd3534a, v: 0x4b78cc, e: 0xb9b0a4, o: 0xd9d2c6, n: 0x8ea33e, h: 0xe0a0a0 };
function t3BuildMed() {
  const v = t3BuildOut(), M = AN.MEDIASTINUM, grp = new THREE.Group(), labels = new THREE.Group();
  const mat = (k, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: MED_COL[k], roughness: 0.55, metalness: 0.02 }, extra || {}));
  (M.vessels || []).forEach(x => {
    const pts = x.pts.map(toScene), curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    const m = x.k === 'o' ? mat('o', { transparent: true, opacity: 0.55 }) : (x.k === 'e' ? mat('e', { transparent: true, opacity: 0.92 }) : mat(x.k));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, pts.length * 10), x.r, 14, false), m);
    tube.userData.lm = x.l; grp.add(tube);
    [pts[0], pts[pts.length - 1]].forEach(p => { const cap = new THREE.Mesh(new THREE.SphereGeometry(x.r, 12, 10), m); cap.position.copy(p); cap.userData.lm = x.l; grp.add(cap); });
    if (!x.nl) { const lp = pts[Math.min(pts.length - 1, x.lp || 0)], lab = t3Label(x.sl || x.l, { h: 9 }); lab.position.copy(lp).add(new THREE.Vector3(0, x.r + 6, x.r + 2)); labels.add(lab); }
  });
  (M.blobs || []).forEach(b => {
    const ghost = b.k === 'h';
    const m = mat(b.k, ghost ? { transparent: true, opacity: 0.13, depthWrite: false } : { transparent: true, opacity: 0.85 });
    const e = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), m);
    e.position.copy(toScene(b.c)); e.scale.set(b.s[0], b.s[2], b.s[1]); e.userData.lm = b.l; if (ghost) e.renderOrder = -1; grp.add(e);
    const lab = t3Label(b.l, { h: 9 }); lab.position.copy(toScene(b.c)).add(new THREE.Vector3(0, ghost ? -b.s[2] - 8 : 0, b.s[1] + 2)); labels.add(lab);
  });
  const nm = mat('n', { roughness: 0.6 });
  (M.nodes || []).forEach(nd => {
    const sph = new THREE.Mesh(new THREE.SphereGeometry(4, 14, 10), nm); sph.position.copy(toScene(nd.p)); sph.userData.lm = 'station ' + nd.id; sph.userData.station = nd.id; grp.add(sph);
    const lab = t3Label(nd.id, { h: 6.5, color: '#2f3a0e', halo: 'rgba(240,244,220,0.95)' }); lab.position.copy(toScene(nd.p)).add(new THREE.Vector3(0, 6.5, 3)); labels.add(lab);
  });
  v.scene.add(grp); v.scene.add(labels); v.med = grp; v.labels = labels;
  // the cross-section marker: a ring around the airway at the scope's position with a tick at 12 o'clock (anterior)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.11, 10, 48), new THREE.MeshStandardMaterial({ color: 0x2f6fbf, emissive: 0x1a4a8a, roughness: 0.35 }));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x5f8fd0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  const tick = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf2c14e, emissive: 0x8a5a00 }));
  const mk = new THREE.Group(); mk.add(ring); mk.add(disc); mk.add(tick); v.scene.add(mk); v.marker = mk; v.tick = tick;
  return v;
}
function t3Marker(v) {
  const s = t3Seg(treeAt), dir = s.b.clone().sub(s.a).normalize(), len = s.a.distanceTo(s.b), d = Math.max(0, Math.min(len, t3Depth()));
  const p = s.a.clone().add(dir.clone().multiplyScalar(d)), R = s.r * 2.4;
  v.marker.position.copy(p); v.marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir); v.marker.scale.set(R, R, R);
  // the anterior tick: the scene's +z projected onto the section plane
  const ant = new THREE.Vector3(0, 0, 1).sub(dir.clone().multiplyScalar(dir.z)).normalize();
  const local = ant.clone().applyQuaternion(v.marker.quaternion.clone().invert());
  v.tick.position.copy(local.multiplyScalar(1));
  v.labels.visible = !!T3.labels;
}
function t3PaintOut(view) {
  const o = view || T3.out, path = treePath(treeAt);
  if (!T3.mats) T3.mats = { n: new THREE.MeshStandardMaterial({ color: 0xd9a49c, roughness: 0.55 }), on: new THREE.MeshStandardMaterial({ color: 0xa7c1d6, roughness: 0.55 }), cur: new THREE.MeshStandardMaterial({ color: 0x6f93b3, roughness: 0.5, emissive: 0x203040 }) };
  Object.keys(o.meshes).forEach(k => {
    const id = k.replace(/\.j$/, ''), m = id === treeAt ? T3.mats.cur : (path.indexOf(id) >= 0 ? T3.mats.on : T3.mats.n);
    if (o.meshes[k].material !== m) o.meshes[k].material = m;
  });
  const ob = o === T3.med ? T3.orbitMed : T3.orbit, c = o.camera, target = new THREE.Vector3(0, o === T3.med ? 2 : -5, 0);
  c.position.set(target.x + ob.d * Math.sin(ob.ph) * Math.sin(ob.th), target.y + ob.d * Math.cos(ob.ph), target.z + ob.d * Math.sin(ob.ph) * Math.cos(ob.th));
  c.lookAt(target);
}
/* ---- the inside scene: marching cubes over the capsules around the current node */
/* signed distance from (x, y, z) to a capsule, scalar arithmetic (called a few hundred thousand times per build) */
function capPrep(s) {
  const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y, dz = s.b.z - s.a.z, len2 = dx * dx + dy * dy + dz * dz;
  return { ax: s.a.x, ay: s.a.y, az: s.a.z, dx: dx, dy: dy, dz: dz, len2: len2, len: Math.sqrt(len2), r: s.r, rings: s.rings };
}
function capSdf(x, y, z, c) {
  let t = ((x - c.ax) * c.dx + (y - c.ay) * c.dy + (z - c.az) * c.dz) / c.len2; t = t < 0 ? 0 : (t > 1 ? 1 : t);
  const qx = c.ax + c.dx * t, qy = c.ay + c.dy * t, qz = c.az + c.dz * t;
  const rx = x - qx, ry = y - qy, rz = z - qz, dist = Math.sqrt(rx * rx + ry * ry + rz * rz);
  let r = c.r;
  if (c.rings) { // cartilage rings every 4.5 mm in front and at the sides, a flatter membrane behind (the scene's +z is anterior)
    const ant = rz / (dist || 1);
    if (ant > -0.45) r -= 0.8 * (0.5 + 0.5 * Math.cos(t * c.len / 5 * Math.PI * 2));
    else r -= 0.9 * Math.min(1, (-0.45 - ant) / 0.55);
  }
  return dist - r;
}
function t3Capsules(id) {
  const T = AN.TREE, ids = [id];
  if (T[id].parent) ids.push(T[id].parent);
  T[id].kids.forEach(k => { ids.push(k); T[k].kids.forEach(g => ids.push(g)); });
  if (T[id].parent) T[T[id].parent].kids.forEach(sib => { if (ids.indexOf(sib) < 0) ids.push(sib); });
  return ids.map(k => Object.assign({ id: k }, t3Seg(k)));
}
function marchingCubes(fn, lo, hi, n) {
  const nx = n[0], ny = n[1], nz = n[2], hx = (hi.x - lo.x) / nx, hy = (hi.y - lo.y) / ny, hz = (hi.z - lo.z) / nz;
  const vals = new Float32Array((nx + 1) * (ny + 1) * (nz + 1));
  const at = (i, j, k) => i + (nx + 1) * (j + (ny + 1) * k);
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) vals[at(i, j, k)] = fn(lo.x + i * hx, lo.y + j * hy, lo.z + k * hz);
  const pos = [];
  const cornerOff = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Array(8), cp = new Array(8), ev = new Array(12);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let idx = 0;
    for (let c = 0; c < 8; c++) { const o = cornerOff[c]; cv[c] = vals[at(i + o[0], j + o[1], k + o[2])]; cp[c] = [lo.x + (i + o[0]) * hx, lo.y + (j + o[1]) * hy, lo.z + (k + o[2]) * hz]; if (cv[c] < 0) idx |= 1 << c; }
    const em = MC_EDGE[idx]; if (!em) continue;
    for (let e = 0; e < 12; e++) if (em & (1 << e)) {
      const a = edges[e][0], b = edges[e][1], va = cv[a], vb = cv[b], t = (vb - va) !== 0 ? va / (va - vb) : 0.5;
      ev[e] = [cp[a][0] + (cp[b][0] - cp[a][0]) * t, cp[a][1] + (cp[b][1] - cp[a][1]) * t, cp[a][2] + (cp[b][2] - cp[a][2]) * t];
    }
    const tri = MC_TRI[idx];
    for (let t = 0; t < tri.length; t += 3) { const p0 = ev[tri[t]], p1 = ev[tri[t + 1]], p2 = ev[tri[t + 2]]; pos.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]); }
  }
  // weld coincident vertices so the normals are smooth
  const key = {}, index = [], uniq = [];
  for (let v = 0; v < pos.length; v += 3) {
    const kk = Math.round(pos[v] * 50) + '_' + Math.round(pos[v + 1] * 50) + '_' + Math.round(pos[v + 2] * 50);
    let ix = key[kk]; if (ix === undefined) { ix = uniq.length / 3; key[kk] = ix; uniq.push(pos[v], pos[v + 1], pos[v + 2]); }
    index.push(ix);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(uniq, 3)); geo.setIndex(index); geo.computeVertexNormals();
  return geo;
}
function t3BuildIn(id) {
  const caps = t3Capsules(id), cur = caps[0];
  const lo = new THREE.Vector3(Infinity, Infinity, Infinity), hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  caps.forEach(s => { [s.a, s.b].forEach(p => { lo.min(p.clone().subScalar(s.r + 3)); hi.max(p.clone().addScalar(s.r + 3)); }); });
  // keep the volume to the neighbourhood: clip the box to 70 mm around the current airway's midpoint along each axis
  const mid = cur.a.clone().add(cur.b).multiplyScalar(0.5), reach = Math.max(40, cur.a.distanceTo(cur.b) * 0.9 + 30);
  lo.max(mid.clone().subScalar(reach)); hi.min(mid.clone().addScalar(reach));
  const ext = hi.clone().sub(lo), cell = Math.max(1.2, Math.max(ext.x, ext.y, ext.z) / 128);
  const n = [Math.ceil(ext.x / cell), Math.ceil(ext.y / cell), Math.ceil(ext.z / cell)];
  const pre = caps.map(capPrep);
  const geo = marchingCubes((x, y, z) => { let d = Infinity; for (let i = 0; i < pre.length; i++) { const v = capSdf(x, y, z, pre[i]); if (v < d) d = v; } return d; }, lo, hi, n);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x2a1210, 30, 170);
  scene.add(new THREE.AmbientLight(0xffe4dc, 0.35));
  const mat = new THREE.MeshStandardMaterial({ color: 0xd9a49c, roughness: 0.4, metalness: 0.0, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat); scene.add(mesh);
  const cam = new THREE.PerspectiveCamera(80, 1, 0.5, 400);
  const lamp = new THREE.PointLight(0xfff1e6, 0.75, 220, 1.1); lamp.position.set(0, 0, -4); cam.add(lamp); scene.add(cam);
  return { scene: scene, camera: cam, mesh: mesh, caps: caps, id: id };
}
/* the camera sits on the axis of the current airway at the scope's depth, looking down the axis; anterior up */
function t3PoseIn(id) {
  const s = t3Seg(id), dir = s.b.clone().sub(s.a).normalize(), len = s.a.distanceTo(s.b);
  const eye = s.a.clone().add(dir.clone().multiplyScalar(Math.max(0.5, Math.min(len - 0.5, t3Depth()))));
  return { eye: eye, dir: dir };
}
function t3LookIn(inn, pose) {
  const c = inn.camera, dir = pose.dir.clone();
  const up0 = new THREE.Vector3(0, 0, 1);   // anterior
  const right = dir.clone().cross(up0).normalize(); if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  const up = right.clone().cross(dir).normalize();
  const look = dir.clone().multiplyScalar(Math.cos(T3.pitch)).add(up.clone().multiplyScalar(Math.sin(T3.pitch)));
  const q = new THREE.Quaternion().setFromAxisAngle(up, -T3.yaw); look.applyQuaternion(q);
  c.position.copy(pose.eye); c.up.copy(up); c.lookAt(pose.eye.clone().add(look));
}
/* ---- the canvas, shared by both views */
function t3Ensure() {
  if (T3.renderer) return true;
  if (!t3Available()) return false;
  T3.canvas = document.createElement('canvas'); T3.canvas.className = 'an-3d'; T3.canvas.setAttribute('aria-label', '3D airway model'); T3.canvas.tabIndex = 0;
  try { T3.renderer = new THREE.WebGLRenderer({ canvas: T3.canvas, antialias: true, alpha: false }); } catch (e) { return false; }
  T3.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  T3.renderer.toneMapping = THREE.ACESFilmicToneMapping; T3.renderer.toneMappingExposure = 0.95;
  T3.renderer.setClearColor(0xefe9e1);
  T3.out = t3BuildOut();
  const cv = T3.canvas;
  cv.addEventListener('pointerdown', (e) => { if (!T3.drag) T3.drag = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId, pts: {} }; T3.drag.pts[e.pointerId] = [e.clientX, e.clientY]; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } });
  cv.addEventListener('pointermove', (e) => {
    const d = T3.drag; if (!d) return;
    if (d.pts[e.pointerId]) d.pts[e.pointerId] = [e.clientX, e.clientY];
    const ids = Object.keys(d.pts);
    if (ids.length >= 2) {   // pinch: zoom the outside view
      const p0 = d.pts[ids[0]], p1 = d.pts[ids[1]], dist = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]);
      if (d.pinch && T3.mode !== 'in') t3Orbit().d = Math.max(80, Math.min(900, t3Orbit().d * d.pinch / dist));
      d.pinch = dist; d.moved = true; return;
    }
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (T3.mode !== 'in') { const ob = t3Orbit(); ob.th -= dx * 0.008; ob.ph = Math.max(0.15, Math.min(3.0, ob.ph - dy * 0.008)); }
    else { T3.yaw = Math.max(-1.3, Math.min(1.3, T3.yaw - dx * 0.006)); T3.pitch = Math.max(-1.0, Math.min(1.0, T3.pitch + dy * 0.006)); }
    d.x = e.clientX; d.y = e.clientY;
  });
  const end = (e) => { const d = T3.drag; if (!d) return; delete d.pts[e.pointerId]; if (Object.keys(d.pts).length) return; T3.drag = null; if (!d.moved) t3Pick(e); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', () => { T3.drag = null; });
  cv.addEventListener('wheel', (e) => { if (T3.mode === 'in') return; e.preventDefault(); const ob = t3Orbit(); ob.d = Math.max(80, Math.min(900, ob.d * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: false });
  cv.addEventListener('keydown', (e) => {
    const T = AN.TREE, n = T[treeAt];
    if (e.key === 'ArrowUp' || e.key === 'Backspace') { e.preventDefault(); T3.refocus = true; t3Move(-10); }
    else if (e.key === 'ArrowDown' || e.key === 'w' || e.key === '+' || e.key === '=') { e.preventDefault(); T3.refocus = true; t3Move(10); }
    else if (/^[1-9]$/.test(e.key)) { const k = n.kids[+e.key - 1]; if (k) { e.preventDefault(); T3.refocus = true; t3Enter(k, 4); } }
    else if (e.key === 'ArrowLeft') { T3.yaw += 0.15; } else if (e.key === 'ArrowRight') { T3.yaw -= 0.15; }
  });
  return true;
}
/* a tap: outside, the branch under the pointer; inside, the opening whose airway the ray enters */
function t3Pick(e) {
  const rect = T3.canvas.getBoundingClientRect(), x = ((e.clientX - rect.left) / rect.width) * 2 - 1, y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  const rc = new THREE.Raycaster();
  if (T3.mode === 'out' || T3.mode === 'med') {
    const v = T3.mode === 'med' ? T3.med : T3.out;
    rc.setFromCamera(new THREE.Vector2(x, y), v.camera);
    const hits = rc.intersectObjects(v.group.children.concat(v.med ? v.med.children : []), false);
    const hit = hits.filter(hh => hh.object.userData.id || hh.object.userData.lm)[0];
    if (!hit) return;
    if (hit.object.userData.id) treeGo(hit.object.userData.id, true);
    else if (hit.object.userData.station) { toast('Station ' + hit.object.userData.station + ' — open the station map for its borders and the EBUS picture'); }
    else toast(hit.object.userData.lm);
  } else if (T3.inn) {
    rc.setFromCamera(new THREE.Vector2(x, y), T3.inn.camera);
    const ray = rc.ray, kids = AN.TREE[treeAt].kids;
    let best = null;
    kids.forEach(k => {
      const s = t3Seg(k), steps = 24;
      for (let i = 0; i <= steps; i++) { const p = s.a.clone().lerp(s.b, i / steps); const d = ray.distanceToPoint(p); const along = p.clone().sub(ray.origin).dot(ray.direction); if (d < s.r * 1.5 && along > 2 && (!best || d / s.r < best.score)) best = { id: k, along: along, score: d / s.r }; }
    });
    if (best) treeGo(best.id, true);
  }
}
function t3Resize(w) {
  const hgt = Math.round(Math.max(240, Math.min(440, w * 0.78)));
  if (T3.size[0] === w && T3.size[1] === hgt) return;
  T3.size = [w, hgt]; T3.renderer.setSize(w, hgt, false); T3.canvas.style.width = '100%'; T3.canvas.style.height = hgt + 'px';
  [T3.out, T3.med, T3.inn].forEach(v => { if (v) { v.camera.aspect = w / hgt; v.camera.updateProjectionMatrix(); } });
}
function t3Frame() {
  T3.raf = 0;
  if (!T3.canvas || !T3.canvas.isConnected) return;
  const w = Math.max(200, Math.floor(T3.canvas.parentElement.getBoundingClientRect().width));
  t3Resize(w);
  if (T3.mode === 'out') { T3.renderer.setClearColor(0xefe9e1); t3PaintOut(T3.out); T3.renderer.render(T3.out.scene, T3.out.camera); }
  else if (T3.mode === 'med' && T3.med) { T3.renderer.setClearColor(0xefe9e1); t3PaintOut(T3.med); t3Marker(T3.med); T3.renderer.render(T3.med.scene, T3.med.camera); }
  else if (T3.inn) {
    T3.renderer.setClearColor(0x2a1210);
    const pose = t3PoseIn(treeAt);
    if (T3.tween) { const k = Math.min(1, (performance.now() - T3.tween.t0) / 650); const e = k * k * (3 - 2 * k); pose.eye = T3.tween.from.clone().lerp(pose.eye, e); if (k >= 1) T3.tween = null; }
    t3LookIn(T3.inn, pose); T3.renderer.render(T3.inn.scene, T3.inn.camera);
  }
  T3.raf = requestAnimationFrame(t3Frame);
}
/* the figure on the tree topic */
function tree3dFig() {
  if (!t3Ensure()) return h('figure', { class: 'an-fig' }, [h('div', { class: 'an-3d-none', text: '3D view needs WebGL, which this browser or view does not provide.' }), h('figcaption', { text: '3D airway model' })]);
  const labId = uid('l3');
  const modes = h('div', { class: 'an-3d-modes' }, [[['out', 'Outside'], ['in', 'Inside (scope)'], ['med', 'Mediastinum']].map(m => h('button', { type: 'button', class: 'ch', role: 'radio', 'aria-checked': String(T3.mode === m[0]), 'data-3d-mode': m[0], text: m[1], onclick: () => { T3.mode = m[0]; render(); } })),
    T3.mode === 'med' ? h('label', { class: 'chk-inline', for: labId }, [h('input', { type: 'checkbox', id: labId, checked: T3.labels, 'data-3d-labels': '1', onchange: (e) => { T3.labels = e.target.checked; } }), 'Labels']) : null,
    h('button', { type: 'button', class: 'lnk', text: 'Reset view', onclick: () => { T3.orbit = { th: 0.5, ph: 1.25, d: 330 }; T3.orbitMed = { th: 0.4, ph: 1.35, d: 430 }; T3.yaw = 0; T3.pitch = 0; } })]);
  if (T3.mode === 'med' && !T3.med) { T3.med = t3BuildMed(); T3.med.camera.aspect = T3.size[0] / (T3.size[1] || 1); T3.med.camera.updateProjectionMatrix(); }
  if (T3.mode === 'in') {
    if (!T3.inn || T3.inn.id !== treeAt) {
      const prevEye = T3.inn ? T3.inn.camera.position.clone() : null;
      T3.inn = t3BuildIn(treeAt); T3.yaw = 0; T3.pitch = 0;
      if (prevEye) T3.tween = { from: prevEye, t0: performance.now() };
      T3.inn.camera.aspect = T3.size[0] / (T3.size[1] || 1); T3.inn.camera.updateProjectionMatrix();
    }
  }
  const wrap = h('div', { class: 'an-3d-wrap' }, [T3.canvas]);
  const n = AN.TREE[treeAt];
  // the scope's position along the airway, at real lengths: a centimetre at a time
  const nav = T3.mode === 'out' ? null : h('div', { class: 'an-3d-nav' }, [
    h('button', { type: 'button', class: 'btn sm quiet', 'data-3d-back': '1', title: 'Pull back 1 cm (↑)', text: '◀ 1 cm', onclick: () => t3Move(-10) }),
    h('button', { type: 'button', class: 'btn sm quiet', 'data-3d-fwd': '1', title: 'Advance 1 cm (↓)', text: '1 cm ▶', onclick: () => t3Move(10) }),
    h('span', { class: 'an-3d-depth', 'data-3d-depth': '1', text: t3DepthText() })
  ]);
  const cap = T3.mode === 'out' ? 'Outside: drag to orbit, wheel or pinch to zoom, tap a branch to go there (the current path is blue).'
    : (T3.mode === 'med' ? 'Mediastinum: the tree with the great vessels, the oesophagus, the spine behind, the heart (faint) and the nodal stations (olive). The blue ring is where the scope is, its yellow dot at 12 o’clock (anterior) — the scope view above shows that level in cross-section. Drag to orbit, tap a branch to go there, tap a structure for its name.'
    : 'Inside the ' + n.name.toLowerCase() + ': drag to look around, tap an opening to advance; keys 1–' + Math.max(1, n.kids.length) + ' advance, ↓ a centimetre deeper, ↑ a centimetre back (and out to the parent). Rings in front, the flat membrane behind.');
  const fig = h('figure', { class: 'an-fig an-fig-3d' }, [modes, wrap, nav, h('figcaption', { text: cap + ' Procedural model from standard dimensions, not a patient.' })]);
  if (!T3.raf) T3.raf = requestAnimationFrame(t3Frame);
  if (T3.refocus) { T3.refocus = false; setTimeout(() => { try { T3.canvas.focus({ preventScroll: true }); } catch (x) { /* ignore */ } }, 0); }   // keyboard navigation keeps the canvas focused across re-renders
  return fig;
}
