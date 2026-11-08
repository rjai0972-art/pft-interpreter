/* ========================================================================== v8.3: the heart in three dimensions
   The echo model's structures meshed by marching cubes from PFT_ECHO.fields() — one mesh set per cardiac phase, built in
   the background — with the probe on the chest, the scan plane carrying the picture, and a cut-away (stencil caps) so the
   cross-section the plane makes is the one on the screen. Three users: the views atlas (the plane follows the card you are
   reading), the scanning lab (the plane follows the sliders) and the real-volume lab (the real picture on the model plane). */
const H3 = { K: 12, period: 0.9, cell: 0.24, zMin: -12, builds: {}, insts: [], order: [0, 6, 3, 9, 1, 2, 4, 5, 7, 8, 10, 11],
  COL: { lv: 0xc4564b, rv: 0xb9675b, la: 0xd49a86, ra: 0xcc9f93, ao: 0xd6473a, pa: 0x4b7bd4, cavae: 0x3f66b8, eff: 0x58c6f2, liver: 0x8e5a3c },
  LABEL: { lv: 'LV', rv: 'RV', la: 'LA', ra: 'RA', ao: 'Aorta', pa: 'PA', cavae: 'IVC', eff: 'Effusion', liver: 'Liver' } };
function h3Available() { return typeof t3Available === 'function' && t3Available() && typeof PFT_ECHO !== 'undefined' && typeof PFT_ECHO.fields === 'function'; }
/* body (x left, y posterior, z superior; cm) → scene (x right, y up, z toward the viewer): the patient faces the camera */
const h3V = (p) => new THREE.Vector3(p[0], p[2], -p[1]);
/* ---- marching cubes with shared edge vertices (an indexed mesh with smooth normals, no welding pass) ---- */
function h3March(f, lo, hi, cell) {
  const nx = Math.max(1, Math.ceil((hi[0] - lo[0]) / cell)), ny = Math.max(1, Math.ceil((hi[1] - lo[1]) / cell)), nz = Math.max(1, Math.ceil((hi[2] - lo[2]) / cell));
  const NX = nx + 1, NY = ny + 1, NZ = nz + 1, N = NX * NY * NZ, vals = new Float32Array(N);
  for (let k = 0; k < NZ; k++) { const z = lo[2] + k * cell; for (let j = 0; j < NY; j++) { const y = lo[1] + j * cell, row = NX * (j + NY * k); for (let i = 0; i < NX; i++) vals[row + i] = f(lo[0] + i * cell, y, z); } }
  const ex = new Int32Array(N).fill(-1), ey = new Int32Array(N).fill(-1), ez = new Int32Array(N).fill(-1);
  const EDEF = [[ex, 0, 0, 0, 0], [ey, 1, 0, 0, 1], [ex, 0, 1, 0, 0], [ey, 0, 0, 0, 1], [ex, 0, 0, 1, 0], [ey, 1, 0, 1, 1], [ex, 0, 1, 1, 0], [ey, 0, 0, 1, 1], [ez, 0, 0, 0, 2], [ez, 1, 0, 0, 2], [ez, 1, 1, 0, 2], [ez, 0, 1, 0, 2]];
  const step = [1, NX, NX * NY], pos = [], idx = [], ev = new Int32Array(12);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const b = i + NX * (j + NY * k), b4 = b + NX * NY;
    let c = 0; if (vals[b] < 0) c |= 1; if (vals[b + 1] < 0) c |= 2; if (vals[b + 1 + NX] < 0) c |= 4; if (vals[b + NX] < 0) c |= 8; if (vals[b4] < 0) c |= 16; if (vals[b4 + 1] < 0) c |= 32; if (vals[b4 + 1 + NX] < 0) c |= 64; if (vals[b4 + NX] < 0) c |= 128;
    const em = MC_EDGE[c]; if (!em) continue;
    for (let e = 0; e < 12; e++) {
      if (!(em & (1 << e))) continue;
      const d = EDEF[e], cache = d[0], gi = i + d[1], gj = j + d[2], gk = k + d[3], ax = d[4], g = gi + NX * (gj + NY * gk);
      let vi = cache[g];
      if (vi < 0) { const va = vals[g], vb = vals[g + step[ax]], t = (vb - va) !== 0 ? va / (va - vb) : 0.5; vi = pos.length / 3; cache[g] = vi; pos.push(lo[0] + (gi + (ax === 0 ? t : 0)) * cell, lo[1] + (gj + (ax === 1 ? t : 0)) * cell, lo[2] + (gk + (ax === 2 ? t : 0)) * cell); }
      ev[e] = vi;
    }
    const tri = MC_TRI[c];
    for (let t = 0; t < tri.length; t += 3) idx.push(ev[tri[t]], ev[tri[t + 2]], ev[tri[t + 1]]);   // the tables wind inward; swapped so the normals face out
  }
  // to scene coordinates
  const P = new Float32Array(pos.length);
  for (let v = 0; v < pos.length; v += 3) { P[v] = pos[v]; P[v + 1] = pos[v + 2]; P[v + 2] = -pos[v + 1]; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setIndex(new THREE.BufferAttribute(idx.length > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), 1));
  geo.computeVertexNormals(); geo.computeBoundingSphere();
  return geo;
}
/* ---- the phase cache for one heart: built in the background, coarse phases first ---- */
function h3Build(pathId, model) {
  const key = pathId || 'normal';
  if (H3.builds[key]) { H3.builds[key].used = performance.now(); return H3.builds[key]; }
  // keep three hearts at most: the oldest one no panel is showing goes, geometry and all
  const keys = Object.keys(H3.builds).filter(k => !H3.insts.some(i => i.build === H3.builds[k])).sort((a, b) => H3.builds[a].used - H3.builds[b].used);
  while (Object.keys(H3.builds).length >= 3 && keys.length) { const k = keys.shift(), old = H3.builds[k]; old.dead = true; old.phases.forEach(set => { if (set) Object.keys(set).forEach(id => set[id].dispose()); }); Object.keys(old.statics).forEach(id => old.statics[id].dispose()); delete H3.builds[k]; }
  const F0 = PFT_ECHO.fields(model, 0, { zMin: H3.zMin });
  const B = { key: key, parts: F0.parts.map(p => ({ id: p.id, name: p.name, kind: p.kind, static: p.static })), phases: new Array(H3.K).fill(null), rings: new Array(H3.K).fill(null), statics: {}, done: 0, model: model, running: false, queue: H3.order.slice(), used: performance.now() };
  F0.parts.filter(p => p.static).forEach(p => { B.statics[p.id] = h3March(p.f, p.box.lo, p.box.hi, H3.cell * 1.6); });
  H3.builds[key] = B;
  // one part per tick, so the page stays responsive while the cycle is meshed
  let cur = null;
  const step = () => {
    if (B.dead) return;
    if (!cur) { if (!B.queue.length) { B.running = false; return; } const ph = B.queue.shift(); cur = { ph: ph, F: PFT_ECHO.fields(model, ph / H3.K, { zMin: H3.zMin }), i: 0, set: {} }; }
    while (cur.i < cur.F.parts.length && cur.F.parts[cur.i].static) cur.i++;
    if (cur.i < cur.F.parts.length) { const p = cur.F.parts[cur.i++]; cur.set[p.id] = h3March(p.f, p.box.lo, p.box.hi, H3.cell); }
    if (cur.i >= cur.F.parts.length) { B.phases[cur.ph] = cur.set; B.rings[cur.ph] = cur.F.rings; B.done++; H3.insts.forEach(inst => { if (inst.build === B) h3Status(inst); }); cur = null; }
    setTimeout(step, 16);
  };
  B.running = true; setTimeout(step, 0);
  return B;
}
function h3Nearest(B, ph) { if (B.phases[ph]) return ph; for (let d = 1; d < H3.K; d++) { if (B.phases[(ph + d) % H3.K]) return (ph + d) % H3.K; if (B.phases[(ph - d + H3.K) % H3.K]) return (ph - d + H3.K) % H3.K; } return -1; }
/* ---- stencil caps: the cut face of a closed mesh painted solid, so a clipped wall reads as a slice and not a shell ---- */
function h3StencilGroup(geo, plane, order) {
  const base = new THREE.MeshBasicMaterial({ depthWrite: false, depthTest: false, colorWrite: false, stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc });
  const m0 = base.clone(); m0.side = THREE.BackSide; m0.clippingPlanes = [plane]; m0.stencilFail = THREE.IncrementWrapStencilOp; m0.stencilZFail = THREE.IncrementWrapStencilOp; m0.stencilZPass = THREE.IncrementWrapStencilOp;
  const m1 = base.clone(); m1.side = THREE.FrontSide; m1.clippingPlanes = [plane]; m1.stencilFail = THREE.DecrementWrapStencilOp; m1.stencilZFail = THREE.DecrementWrapStencilOp; m1.stencilZPass = THREE.DecrementWrapStencilOp;
  const g = new THREE.Group(), a = new THREE.Mesh(geo, m0), b = new THREE.Mesh(geo, m1);
  a.renderOrder = order; b.renderOrder = order; g.add(a); g.add(b); g.meshes = [a, b];
  return g;
}
function h3Cap(color, order) {
  const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7, metalness: 0.0, stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp });
  const cap = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat);
  cap.renderOrder = order; cap.onAfterRender = (renderer) => { renderer.clearStencil(); };
  return cap;
}
/* ---- one instance: a canvas, a scene, controls ---- */
function h3Create(opts) {
  opts = opts || {};
  const inst = { id: uid('h3'), opts: Object.assign({ cut: true, image: true, beating: true, labels: true, spin: false, chest: true, screen: true }, opts.settings || {}), own: !!opts.ownImage, params: null, model: opts.model || 'normal', build: null, meshes: {}, labels: [], rings: {}, phaseShown: -1, t0: performance.now(), extT: null, tween: null, raf: 0, size: [0, 0], orbit: { th: opts.th === undefined ? 0.5 : opts.th, ph: opts.ph === undefined ? 1.25 : opts.ph, d: opts.dist || 34 }, aimTween: null, drag: null, clipSign: 1, lastImg: 0, title: '', alive: true };
  const cv = document.createElement('canvas'); cv.className = 'h3-canvas'; cv.setAttribute('aria-label', 'The heart in three dimensions with the scan plane'); cv.tabIndex = 0;
  let r; try { r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, stencil: true }); } catch (e) { r = null; }
  if (!r) return null;
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.localClippingEnabled = true; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0; r.setClearColor(0x1a1d24);
  inst.cv = cv; inst.renderer = r;
  const scene = new THREE.Scene(); inst.scene = scene;
  scene.add(new THREE.HemisphereLight(0xfff2e8, 0x3a3030, 0.85));
  const sun = new THREE.DirectionalLight(0xffffff, 0.75); sun.position.set(-30, 60, 80); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.35); fill.position.set(50, -20, -40); scene.add(fill);
  inst.camera = new THREE.PerspectiveCamera(36, 1, 1, 600);
  inst.clip = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  // the chest: a translucent sheet on the skin, and the orientation labels
  const chest = new THREE.Group(); inst.chest = chest;
  (function () {
    const xs = 25, zs = 25, pos = [], idx = [];
    for (let j = 0; j <= zs; j++) for (let i = 0; i <= xs; i++) { const x = -13 + 26 * i / xs, z = -13 + 26 * j / zs, y = PFT_ECHO.skinY(x); const v = h3V([x, y, z]); pos.push(v.x, v.y, v.z); }
    for (let j = 0; j < zs; j++) for (let i = 0; i < xs; i++) { const a = i + (xs + 1) * j, b = a + 1, c = a + xs + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const sk = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xe9c9b4, transparent: true, opacity: 0.11, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9 })); sk.renderOrder = 30; chest.add(sk);
    const st = new THREE.Mesh(new THREE.BoxGeometry(2.2, 14, 0.6), new THREE.MeshStandardMaterial({ color: 0xf1e2d6, transparent: true, opacity: 0.22, depthWrite: false })); st.position.copy(h3V([0, 0.9, 2])); st.renderOrder = 30; chest.add(st);
    [['Head', [0, 3, 16]], ['Patient’s left', [17, 3, 0]], ['Right', [-16, 3, 0]], ['Feet', [0, 3, -16]]].forEach(L => { const s = t3Label(L[0], { h: 1.9, color: '#b9c0cc', halo: 'rgba(0,0,0,0.45)' }); s.position.copy(h3V(L[1])); chest.add(s); });
  })();
  scene.add(chest);
  inst.heart = new THREE.Group(); scene.add(inst.heart);
  inst.caps = new THREE.Group(); scene.add(inst.caps);
  // the probe, the beam outline and the picture plane
  inst.probe = new THREE.Group(); scene.add(inst.probe);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.2, 1.3), new THREE.MeshStandardMaterial({ color: 0x3b4150, roughness: 0.45 })); body.position.set(0, 1.6, 0); inst.probe.add(body);
  const face = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, 1.1), new THREE.MeshStandardMaterial({ color: 0x8aa2c8, roughness: 0.3 })); face.position.set(0, 0.1, 0); inst.probe.add(face);
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), new THREE.MeshStandardMaterial({ color: 0x66e07a, emissive: 0x2a8a3a, roughness: 0.4 })); marker.position.set(1.35, 1.2, 0); inst.probe.add(marker);
  inst.outline = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x7fe0ea, transparent: true, opacity: 0.9 })); inst.outline.renderOrder = 40; scene.add(inst.outline);
  inst.imgCanvas = document.createElement('canvas'); inst.imgCanvas.width = 8; inst.imgCanvas.height = 8;
  inst.tex = new THREE.CanvasTexture(inst.imgCanvas); inst.tex.minFilter = THREE.LinearFilter; inst.tex.magFilter = THREE.LinearFilter;
  inst.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: inst.tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.92 })); inst.plane.renderOrder = 35; inst.plane.visible = false; scene.add(inst.plane);
  // the frame
  const wrap = h('div', { class: 'h3-panel', 'data-h3': inst.id }, [
    h('div', { class: 'h3-head' }, [h('span', { class: 'h3-title', 'data-h3-title': '1', text: '' }), h('span', { class: 'h3-status', 'data-h3-status': '1', text: '' })]),
    cv,
    h('div', { class: 'h3-ctl' }, [
      h3Check(inst, 'screen', 'Screen up', 'Hold the picture the way the screen shows it, probe at the top; off keeps the patient’s head up'),
      h3Check(inst, 'cut', 'Cut away', 'Remove the half of the heart between you and the plane, so the cut face is what the screen shows'),
      h3Check(inst, 'image', 'Picture on the plane', 'Paint the echo picture onto the scan plane'),
      h3Check(inst, 'beating', 'Beating', 'Animate the cardiac cycle'),
      h3Check(inst, 'labels', 'Labels', 'Name the chambers and vessels'),
      h3Check(inst, 'spin', 'Spin', 'Turn the model slowly'),
      h('span', { class: 'fine h3-hint', text: 'Drag to turn · wheel to zoom' })])
  ]);
  inst.el = wrap;
  inst.visible = true;
  if (typeof IntersectionObserver !== 'undefined') { try { new IntersectionObserver((es) => { inst.visible = es.some(e => e.isIntersecting); }).observe(cv); } catch (e) { /* ignore */ } }
  h3Wire(inst);
  h3SetModel(inst, inst.model);
  H3.insts.push(inst);
  requestAnimationFrame(() => h3Frame(inst));
  return inst;
}
function h3Check(inst, key, label, title) {
  const id = uid('h3c');
  return h('label', { class: 'chk-inline', for: id, title: title }, [h('input', { type: 'checkbox', id: id, checked: inst.opts[key], 'data-h3-opt': key, onchange: (e) => { inst.opts[key] = e.target.checked; if (key === 'cut') h3ApplyCut(inst); if (key === 'labels') inst.labels.forEach(s => { s.visible = inst.opts.labels; }); if (key === 'beating') inst.t0 = performance.now() - 0.72 * H3.period * 1000; if (key === 'screen') h3Aim(inst, true); } }), label]);
}
function h3Status(inst) {
  const el = inst.el.querySelector('[data-h3-status]'); if (!el) return;
  const B = inst.build; const txt = B && B.done < H3.K ? 'building the cycle… ' + B.done + ' / ' + H3.K : '';
  if (el.textContent !== txt) el.textContent = txt;
}
function h3Wire(inst) {
  const cv = inst.cv;
  cv.addEventListener('pointerdown', (e) => { inst.drag = { x: e.clientX, y: e.clientY, pts: {} }; inst.drag.pts[e.pointerId] = [e.clientX, e.clientY]; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } });
  cv.addEventListener('pointermove', (e) => {
    const d = inst.drag; if (!d) return;
    if (d.pts[e.pointerId]) d.pts[e.pointerId] = [e.clientX, e.clientY];
    const ids = Object.keys(d.pts);
    if (ids.length >= 2) { const p0 = d.pts[ids[0]], p1 = d.pts[ids[1]], dist = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]); if (d.pinch) inst.orbit.d = Math.max(18, Math.min(120, inst.orbit.d * d.pinch / dist)); d.pinch = dist; return; }
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    inst.orbit.th -= dx * 0.008; inst.orbit.ph = Math.max(0.15, Math.min(3.0, inst.orbit.ph - dy * 0.008));
    d.x = e.clientX; d.y = e.clientY; inst.userTurned = true;
  });
  const end = (e) => { const d = inst.drag; if (!d) return; delete d.pts[e.pointerId]; if (!Object.keys(d.pts).length) inst.drag = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', () => { inst.drag = null; });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); inst.orbit.d = Math.max(18, Math.min(120, inst.orbit.d * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: false });
  cv.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') inst.orbit.th += 0.12; else if (e.key === 'ArrowRight') inst.orbit.th -= 0.12; else if (e.key === 'ArrowUp') inst.orbit.ph = Math.max(0.15, inst.orbit.ph - 0.12); else if (e.key === 'ArrowDown') inst.orbit.ph = Math.min(3.0, inst.orbit.ph + 0.12); else return; e.preventDefault(); });
}
/* ---- the heart: materials per part, one mesh + a stencil pair + a cap each; geometry swapped per phase ---- */
function h3Material(id, kind) {
  const col = H3.COL[id] || 0xaaaaaa;
  if (kind === 'fluid') return new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false, roughness: 0.25 });
  if (kind === 'organ') return new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, roughness: 0.8 });
  const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.52, metalness: 0.02, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n\tif (!gl_FrontFacing) diffuseColor.rgb *= 0.62;'); };
  return m;
}
function h3SetModel(inst, pathId) {
  const model = PFT_ECHO.build(pathId || 'normal');
  inst.model = pathId || 'normal';
  inst.build = h3Build(inst.model, model);
  // rebuild the meshes for this build's parts
  Object.keys(inst.meshes).forEach(id => { const M = inst.meshes[id]; inst.heart.remove(M.mesh); inst.heart.remove(M.stencil); inst.caps.remove(M.cap); });
  inst.meshes = {}; inst.labels.forEach(s => inst.heart.remove(s)); inst.labels = [];
  const B = inst.build;
  B.parts.forEach((p, i) => {
    const geo = p.static ? B.statics[p.id] : (B.phases[h3Nearest(B, 0)] || {})[p.id] || new THREE.BufferGeometry();
    const mat = h3Material(p.id, p.kind); mat.clippingPlanes = inst.opts.cut ? [inst.clip] : [];
    const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 20 + i; mesh.userData.id = p.id; inst.heart.add(mesh);
    const solid = p.kind === 'wall' || p.kind === 'vessel';
    const stencil = h3StencilGroup(geo, inst.clip, 1 + i), cap = h3Cap(new THREE.Color(H3.COL[p.id] || 0xaaaaaa).multiplyScalar(0.82), 1.1 + i);
    stencil.visible = solid && inst.opts.cut; cap.visible = solid && inst.opts.cut;
    inst.heart.add(stencil); inst.caps.add(cap);
    inst.meshes[p.id] = { mesh: mesh, stencil: stencil, cap: cap, mat: mat, solid: solid, kind: p.kind };
    const lp = h3LabelPos(model, p.id);
    if (H3.LABEL[p.id] && lp) { const s = t3Label(H3.LABEL[p.id], { h: 2.2, color: '#ffffff', halo: 'rgba(0,0,0,0.55)' }); s.renderOrder = 50; s.visible = inst.opts.labels; s.userData.id = p.id; s.position.copy(lp); inst.heart.add(s); inst.labels.push(s); }
  });
  // valve rings
  Object.keys(inst.rings).forEach(k => inst.heart.remove(inst.rings[k])); inst.rings = {};
  [['mv', 0xfff1c2], ['tv', 0xfff1c2], ['av', 0xffe0a0]].forEach(R => { const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.09, 8, 40), new THREE.MeshStandardMaterial({ color: R[1], emissive: 0x6a5a20, roughness: 0.5 })); ring.renderOrder = 28; inst.heart.add(ring); inst.rings[R[0]] = ring; });
  const c = model.lvc; inst.centre = h3V([c[0], c[1] + 1.0, c[2] - 1.0]);
  inst.phaseShown = -1; h3Status(inst);
  if (typeof inst.onModel === 'function') inst.onModel();
}
function h3LabelPos(m, id) {
  const V = PFT_ECHO.V;
  if (id === 'lv') return h3V(m.h2b(1.2, 0, 0));
  if (id === 'rv') return h3V(m.h2b(0.6, m.rv.c[0] + 0.6, m.rv.c[1]));
  if (id === 'la') return h3V(m.h2b(m.la.c[0], m.la.c[1], m.la.c[2]));
  if (id === 'ra') return h3V(m.h2b(m.ra.c[0], m.ra.c[1], m.ra.c[2]));
  if (id === 'ao') return h3V(V.add(m.aortaPath[3], [0, 0, 1.2]));
  if (id === 'pa') return h3V(m.paPath[2]);
  if (id === 'cavae') return h3V(m.ivcPath[1]);
  if (id === 'eff') return h3V(V.add(m.apex, [0.5, 1.5, -1.5]));
  return null;
}
function h3ApplyCut(inst) {
  Object.keys(inst.meshes).forEach(id => {
    const M = inst.meshes[id], ghost = !inst.opts.cut && M.solid;
    M.mat.clippingPlanes = inst.opts.cut ? [inst.clip] : [];
    if (M.solid) { M.mat.transparent = ghost; M.mat.opacity = ghost ? 0.38 : 1; M.mat.depthWrite = !ghost; M.mat.needsUpdate = true; }
    M.stencil.visible = M.solid && inst.opts.cut; M.cap.visible = M.solid && inst.opts.cut;
  });
}
/* the phase on show: nearest built geometry swapped into the meshes, the valve rings placed and sized */
function h3ShowPhase(inst, ph) {
  const B = inst.build; if (!B) return;
  const use = h3Nearest(B, ph); if (use < 0 || use === inst.phaseShown) return;
  const set = B.phases[use];
  Object.keys(inst.meshes).forEach(id => { const M = inst.meshes[id], g = set[id]; if (!g) return; M.mesh.geometry = g; M.stencil.meshes.forEach(s => { s.geometry = g; }); });
  (B.rings[use] || []).forEach(R => {
    const ring = inst.rings[R.id]; if (!ring) return;
    ring.position.copy(h3V(R.c)); const ax = h3V(R.axis).normalize(); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ax); ring.scale.setScalar(R.r);
    ring.material.emissiveIntensity = 0.3 + 0.7 * R.open;
  });
  inst.phaseShown = use;
}
/* ---- the plane: from probe parameters (the lab and the atlas) or given directly (the real lab) ---- */
function h3PlaneFromParams(params) {
  const pr = PFT_ECHO.probe(params.model ? params : Object.assign({ model: PFT_ECHO.build(params.path || 'normal') }, params));
  const depth = params.depth || 16, top = 6, H = 208, W = 256, scale = (H - top - 4) / depth;
  return { P: pr.P, d: pr.d, l: pr.l, n: pr.n, depth: depth, fan: 45, rect: { along: [-top / scale, (H - top) / scale], across: [-(W / 2) / scale, (W / 2) / scale] } };
}
function h3SetProbe(inst, params, animate, aim) {
  const to = h3PlaneFromParams(params);
  to.title = params.title || '';
  inst.params = params;
  if (animate && inst.planeSpec) inst.tween = { from: inst.planeSpec, to: to, t0: performance.now(), dur: 700 };
  else { inst.tween = null; inst.planeSpec = to; }
  inst.target = to;
  if (aim) h3Aim(inst, animate);
  const tt = inst.el.querySelector('[data-h3-title]'); if (tt && tt.textContent !== (to.title || '')) tt.textContent = to.title || '';
}
/* a plane given directly: P, d (beam), l (lateral), rect {along:[a0,a1], across:[b0,b1]} in cm along d and l; fan = half-angle in degrees or 0 for a rectangle */
function h3SetPlaneSpec(inst, spec, animate, aim) {
  const V = PFT_ECHO.V; spec.n = spec.n || V.unit(V.cross(spec.d, spec.l));
  if (animate && inst.planeSpec) inst.tween = { from: inst.planeSpec, to: spec, t0: performance.now(), dur: 500 }; else { inst.tween = null; inst.planeSpec = spec; }
  inst.target = spec; inst.params = null;
  if (aim) h3Aim(inst, animate);
  const tt = inst.el.querySelector('[data-h3-title]'); if (tt && tt.textContent !== (spec.title || '')) tt.textContent = spec.title || '';
}
/* aim the camera at the plane from its anterior side, a little above and to the side, so the cut face reads like the screen */
function h3Aim(inst, animate) {
  const S = inst.target; if (!S) return;
  const n = h3V(S.n).normalize(); if (!inst.opts.screen && n.z < 0) n.negate();   // screen up: the marker side on the right means the +n side; head up: the anterior side
  const up = inst.opts.screen ? h3V(S.d).negate().normalize() : new THREE.Vector3(0, 1, 0), right = new THREE.Vector3().crossVectors(up, n).normalize();
  const dir = n.clone().addScaledVector(up, 0.42).addScaledVector(right, 0.28).normalize();
  const th = Math.atan2(dir.x, dir.z), ph = Math.acos(Math.max(-1, Math.min(1, dir.y)));
  if (!animate) { inst.orbit.th = th; inst.orbit.ph = ph; inst.aimTween = null; return; }
  let dth = th - inst.orbit.th; dth = ((dth + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  inst.aimTween = { th0: inst.orbit.th, ph0: inst.orbit.ph, th1: inst.orbit.th + dth, ph1: ph, t0: performance.now(), dur: 800 };
}
function h3LerpSpec(a, b, k) {
  const V = PFT_ECHO.V, e = k * k * (3 - 2 * k), L = (p, q) => V.add(V.mul(p, 1 - e), V.mul(q, e));
  const d = V.unit(L(a.d, b.d)); let l = L(a.l, b.l); l = V.unit(V.sub(l, V.mul(d, V.dot(l, d))));
  const r = (x, y) => x + (y - x) * e;
  return { P: L(a.P, b.P), d: d, l: l, n: V.unit(V.cross(d, l)), depth: r(a.depth, b.depth), fan: k < 0.5 ? (a.fan || 0) : (b.fan || 0), rect: { along: [r(a.rect.along[0], b.rect.along[0]), r(a.rect.along[1], b.rect.along[1])], across: [r(a.rect.across[0], b.rect.across[0]), r(a.rect.across[1], b.rect.across[1])] }, title: b.title, square: b.square };
}
/* the picture: a grey image with a mask (1 = inside the sector), painted into the plane's texture */
function h3SetImage(inst, gray, W, H, mask) {
  if (inst.visible === false && inst.hasImage) return;   // nothing to paint for while the panel is off the screen
  const c = inst.imgCanvas;
  if (c.width !== W || c.height !== H) {   // a texture's storage is sized once: a new size means a new texture
    c.width = W; c.height = H;
    if (inst.tex) inst.tex.dispose();
    inst.tex = new THREE.CanvasTexture(c); inst.tex.minFilter = THREE.LinearFilter; inst.tex.magFilter = THREE.LinearFilter;
    inst.plane.material.map = inst.tex; inst.plane.material.needsUpdate = true;
  }
  const ctx = c.getContext('2d'), data = inst.imgData && inst.imgData.width === W && inst.imgData.height === H ? inst.imgData : (inst.imgData = ctx.createImageData(W, H));
  const px = data.data;
  for (let i = 0, n = W * H; i < n; i++) { const g = gray[i], o = i * 4; px[o] = g; px[o + 1] = g; px[o + 2] = g; px[o + 3] = mask ? (mask[i] ? 255 : 0) : 255; }
  ctx.putImageData(data, 0, 0); inst.tex.needsUpdate = true; inst.hasImage = true;
}
/* ---- per frame ---- */
function h3Place(inst, S) {
  const V = PFT_ECHO.V, P = h3V(S.P), d = h3V(S.d), l = h3V(S.l), n = h3V(S.n);
  // the probe: local y points out of the body (−d), x along the marker (l)
  const mtx = new THREE.Matrix4().makeBasis(l, d.clone().negate(), n);
  inst.probe.position.copy(P); inst.probe.quaternion.setFromRotationMatrix(mtx);
  // the outline of the beam in the plane
  const pts = [];
  if (S.fan) { const half = S.fan * Math.PI / 180, R = S.depth; pts.push(P.clone()); for (let i = 0; i <= 24; i++) { const a = -half + 2 * half * i / 24; pts.push(P.clone().addScaledVector(d, R * Math.cos(a)).addScaledVector(l, R * Math.sin(a))); } pts.push(P.clone()); }
  else { const a0 = S.rect.along[0], a1 = S.rect.along[1], b0 = S.rect.across[0], b1 = S.rect.across[1]; [[a0, b0], [a0, b1], [a1, b1], [a1, b0], [a0, b0]].forEach(q => pts.push(P.clone().addScaledVector(d, q[0]).addScaledVector(l, q[1]))); }
  inst.outline.geometry.dispose(); inst.outline.geometry = new THREE.BufferGeometry().setFromPoints(pts);
  // the picture plane: the canvas rectangle in the plane (image top = along[0], image left = across[0])
  const a0 = S.rect.along[0], a1 = S.rect.along[1], b0 = S.rect.across[0], b1 = S.rect.across[1];
  const centre = P.clone().addScaledVector(d, (a0 + a1) / 2).addScaledVector(l, (b0 + b1) / 2);
  // keep the picture a hair on the camera's side of the cut so it never fights the caps
  const side = inst.clipSign || 1;
  inst.plane.position.copy(centre).addScaledVector(n, 0.06 * side);
  inst.plane.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(l, d.clone().negate(), n));
  inst.plane.scale.set(b1 - b0, a1 - a0, 1);
  inst.plane.visible = inst.opts.image && inst.hasImage; inst.plane.material.opacity = inst.opts.cut ? 0.92 : 0.72;
  // the cut: remove the half between the camera and the plane (with a little hysteresis at the crossing)
  const cam = inst.camera.position.clone().sub(P), s = cam.dot(n);
  if (Math.abs(s) > 0.8) inst.clipSign = s > 0 ? 1 : -1;
  const ncam = n.clone().multiplyScalar(inst.clipSign);
  inst.clip.setFromNormalAndCoplanarPoint(ncam.clone().negate(), P);
  Object.keys(inst.meshes).forEach(id => { const M = inst.meshes[id]; if (!M.cap.visible) return; inst.clip.coplanarPoint(M.cap.position); M.cap.lookAt(M.cap.position.x - inst.clip.normal.x, M.cap.position.y - inst.clip.normal.y, M.cap.position.z - inst.clip.normal.z); });
}
function h3Resize(inst) {
  const cv = inst.cv, w = Math.max(200, Math.floor(cv.parentElement.getBoundingClientRect().width)), hgt = Math.round(Math.max(240, Math.min(inst.maxH || 400, w * 0.62)));
  if (inst.size[0] === w && inst.size[1] === hgt) return;
  inst.size = [w, hgt]; inst.renderer.setSize(w, hgt, false); cv.style.width = '100%'; cv.style.height = hgt + 'px'; inst.camera.aspect = w / hgt; inst.camera.updateProjectionMatrix();
}
function h3Frame(inst) {
  inst.raf = 0;
  if (!inst.alive) return;
  if (!inst.cv.isConnected) { if (inst.started) { h3Dispose(inst); return; } }
  else inst.started = true;
  if (inst.cv.isConnected && inst.visible) {
    h3Resize(inst);
    const now = performance.now();
    // the phase
    const t = inst.extT !== null ? inst.extT : (inst.opts.beating ? ((now - inst.t0) / 1000 / H3.period) % 1 : 0.72);
    const ph = Math.round(t * H3.K) % H3.K;
    h3ShowPhase(inst, ph);
    // the plane (tweening if asked)
    if (inst.tween) { const k = Math.min(1, (now - inst.tween.t0) / inst.tween.dur); inst.planeSpec = h3LerpSpec(inst.tween.from, inst.tween.to, k); if (k >= 1) { inst.planeSpec = inst.tween.to; inst.tween = null; } }
    // the picture, rendered here when nobody else supplies it
    if (inst.own && inst.params && inst.opts.image && now - inst.lastImg > 110) { inst.lastImg = now; const res = PFT_ECHO.render(Object.assign({ model: inst.build.model }, inst.params), EH_W, EH_H, t, {}); h3SetImage(inst, res.img, EH_W, EH_H, res.sector.inside); }
    // the camera
    if (inst.aimTween) { if (inst.drag) inst.aimTween = null; else { const A = inst.aimTween, k = Math.min(1, (now - A.t0) / A.dur), e = k * k * (3 - 2 * k); inst.orbit.th = A.th0 + (A.th1 - A.th0) * e; inst.orbit.ph = A.ph0 + (A.ph1 - A.ph0) * e; if (k >= 1) inst.aimTween = null; } }
    if (inst.opts.spin && !inst.drag) inst.orbit.th += 0.0035;
    const o = inst.orbit, c = inst.centre || new THREE.Vector3();
    inst.camera.position.set(c.x + o.d * Math.sin(o.ph) * Math.sin(o.th), c.y + o.d * Math.cos(o.ph), c.z + o.d * Math.sin(o.ph) * Math.cos(o.th));
    inst.camera.up.copy(inst.opts.screen && inst.planeSpec ? h3V(inst.planeSpec.d).negate().normalize() : new THREE.Vector3(0, 1, 0));
    inst.camera.lookAt(c);
    if (inst.planeSpec) h3Place(inst, inst.planeSpec);
    inst.chest.visible = inst.opts.chest;
    inst.renderer.render(inst.scene, inst.camera);
  }
  inst.raf = requestAnimationFrame(() => h3Frame(inst));
}
function h3Dispose(inst) {
  inst.alive = false;
  try { inst.renderer.dispose(); inst.renderer.forceContextLoss(); } catch (e) { /* ignore */ }
  const i = H3.insts.indexOf(inst); if (i >= 0) H3.insts.splice(i, 1);
}
/* ---- the panel as a figure element, for the three places it lives ---- */
function heart3dPanel(opts) {
  if (!h3Available()) return h('div', { class: 'h3-panel h3-none', 'data-h3-none': '1' }, [h('p', { class: 'fine', text: 'The 3-D heart needs WebGL, which this browser is not offering.' })]);
  const inst = h3Create(opts);
  if (!inst) return h('div', { class: 'h3-panel h3-none', 'data-h3-none': '1' }, [h('p', { class: 'fine', text: 'The 3-D heart could not start a WebGL canvas here.' })]);
  inst.el.inst = inst;
  if (opts && opts.maxH) inst.maxH = opts.maxH;
  return inst.el;
}
