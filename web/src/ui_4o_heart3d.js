/* ========================================================================== v8.3: the heart in three dimensions
   The echo model's structures meshed by marching cubes from PFT_ECHO.fields() — one mesh set per cardiac phase, built in
   the background — with the probe on the chest, the scan plane carrying the picture, and a cut-away (stencil caps) so the
   cross-section the plane makes is the one on the screen. Three users: the views atlas (the plane follows the card you are
   reading), the scanning lab (the plane follows the sliders) and the real-volume lab (the real picture on the model plane). */
const H3 = { K: 12, period: 0.9, cell: 0.22, zMin: -12, builds: {}, insts: [], order: [0, 6, 3, 9, 1, 2, 4, 5, 7, 8, 10, 11],
  /* v8.7: the colours of the thing itself — myocardium, the thinner darker atria, the great arteries and veins, fat in the grooves, bone */
  COL: { lv: 0x9a3a30, rv: 0xa14438, la: 0xab564c, ra: 0x97505a, ao: 0xc7604f, pa: 0x6f88ba, cavae: 0x52679f, eff: 0xd8c27a, liver: 0x6b3a2a,
    coronary: 0xb8231b, artery: 0xc7604f, pv: 0xc0665c, fat: 0xd6b26a, valve: 0xf1e3d0, bone: 0xe9dfcc, skin: 0xe6c4ae, endo: 0xd9a096 },
  LABEL: { lv: 'LV', rv: 'RV', la: 'LA', ra: 'RA', ao: 'Aorta', pa: 'PA', cavae: 'IVC', eff: 'Effusion', liver: 'Liver' },
  SHORT: { 12: 'LV', 13: 'RV', 14: 'LA', 15: 'RA', 16: 'Ao', 17: 'PA', 18: 'IVC', 19: 'DAo', 20: 'SVC', 6: 'Effusion', 21: 'Pleural' } };
const h3Col = (hex) => new THREE.Color(hex).convertSRGBToLinear();
/* a software rasteriser (a headless browser, a machine without a GPU) gets the plain materials and no shadows; window.__h3Quality forces either */
function h3Quality(renderer) {
  if (window.__h3Quality) return window.__h3Quality;
  try { const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'), name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''; if (/swiftshader|llvmpipe|software|softpipe/i.test(name)) return 'lite'; } catch (e) { /* unknown: assume a real one */ }
  return 'full';
}
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
  while (Object.keys(H3.builds).length >= 3 && keys.length) { const k = keys.shift(), old = H3.builds[k]; old.dead = true; old.phases.forEach(set => { if (set) Object.keys(set).forEach(id => set[id].dispose()); }); old.decor.forEach(set => { if (set) Object.keys(set).forEach(id => set[id].dispose()); }); Object.keys(old.statics).forEach(id => old.statics[id].dispose()); delete H3.builds[k]; }
  const F0 = PFT_ECHO.fields(model, 0, { zMin: H3.zMin });
  const B = { key: key, parts: F0.parts.map(p => ({ id: p.id, name: p.name, kind: p.kind, static: p.static })), phases: new Array(H3.K).fill(null), rings: new Array(H3.K).fill(null), decor: new Array(H3.K).fill(null), statics: {}, done: 0, model: model, running: false, queue: H3.order.slice(), used: performance.now() };
  F0.parts.filter(p => p.static).forEach(p => { B.statics[p.id] = h3March(p.f, p.box.lo, p.box.hi, H3.cell * 1.6); });
  H3.builds[key] = B;
  // one part per tick, so the page stays responsive while the cycle is meshed
  let cur = null;
  const step = () => {
    if (B.dead) return;
    if (!cur) { if (!B.queue.length) { B.running = false; return; } const ph = B.queue.shift(); cur = { ph: ph, F: PFT_ECHO.fields(model, ph / H3.K, { zMin: H3.zMin }), i: 0, set: {} }; }
    const tick0 = performance.now();
    do {
      while (cur.i < cur.F.parts.length && cur.F.parts[cur.i].static) cur.i++;
      if (cur.i < cur.F.parts.length) { const p = cur.F.parts[cur.i++]; cur.set[p.id] = h3March(p.f, p.box.lo, p.box.hi, H3.cell); }
    } while (cur.i < cur.F.parts.length && performance.now() - tick0 < 20);
    if (cur.i >= cur.F.parts.length) { B.phases[cur.ph] = cur.set; B.rings[cur.ph] = cur.F.rings; B.decor[cur.ph] = h3Decor(cur.F.decor || []); B.done++; H3.insts.forEach(inst => { if (inst.build === B) h3Status(inst); }); cur = null; }
    setTimeout(step, 4);
  };
  B.running = true; setTimeout(step, 0);
  return B;
}
/* ---- a tube along a path (body coordinates), tapering from r0 to r1, closed at both ends: coronaries, branches, ribs, the cable ---- */
function h3Tube(path, r0, r1, radial, scene) {
  const pts = scene ? path : path.map(h3V);
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), segs = Math.max(6, (pts.length - 1) * 5), R = radial || 8;
  const fr = curve.computeFrenetFrames(segs, false), pos = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const q = i / segs, P = curve.getPointAt(q), N = fr.normals[i], Bn = fr.binormals[i], r = r0 + ((r1 === undefined ? r0 : r1) - r0) * q;
    for (let j = 0; j < R; j++) { const a = 2 * Math.PI * j / R, c = Math.cos(a) * r, sn = Math.sin(a) * r; pos.push(P.x + N.x * c + Bn.x * sn, P.y + N.y * c + Bn.y * sn, P.z + N.z * c + Bn.z * sn); }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < R; j++) { const a0 = i * R + j, a1 = i * R + (j + 1) % R, b0 = a0 + R, b1 = a1 + R; idx.push(a0, b0, a1, a1, b0, b1); }
  const c0 = pos.length / 3; { const P = curve.getPointAt(0); pos.push(P.x, P.y, P.z); } for (let j = 0; j < R; j++) idx.push(c0, j, (j + 1) % R);
  const c1 = pos.length / 3; { const P = curve.getPointAt(1); pos.push(P.x, P.y, P.z); } for (let j = 0; j < R; j++) idx.push(c1, segs * R + (j + 1) % R, segs * R + j);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/* the tubes of one phase: each coronary also lays a bed of fat in its groove */
function h3Decor(list) {
  const out = {};
  list.forEach(d => {
    if (d.path.length < 2) return;
    out[d.id] = h3Tube(d.path, d.r, d.taper !== undefined ? d.r * d.taper : (d.kind === 'coronary' ? d.r * 0.55 : d.r), d.kind === 'coronary' ? 7 : 12);
    if (d.kind === 'coronary' && d.r >= 0.14) out['fat_' + d.id] = h3Tube(d.path, d.r * 1.9, d.r * 1.1, 8);
  });
  return out;
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
  const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.78, metalness: 0.0, stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp });
  const cap = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat);
  cap.renderOrder = order; cap.onAfterRender = (renderer) => { renderer.clearStencil(); };
  return cap;
}
/* ---- the light of a small studio, baked once per renderer: a bright soft box above and in front, a weaker one to the side, a dark floor.
   It is what gives wet tissue its highlights. ---- */
function h3Env(renderer) {
  const sc = new THREE.Scene(), g = new THREE.SphereGeometry(60, 32, 16), col = [], P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const t = Math.pow(Math.max(0, Math.min(1, (P.getY(i) / 60 + 1) / 2)), 1.6), v = 0.05 + 0.75 * t; col.push(v * 1.0, v * 0.97, v * 0.93); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  sc.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, toneMapped: false })));
  const box = (x, y, z, w, hh, k) => { const mm = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k * 0.98, k * 0.94), side: THREE.DoubleSide, toneMapped: false })); mm.position.set(x, y, z); mm.lookAt(0, 0, 0); sc.add(mm); };
  box(-22, 34, 30, 34, 22, 5.5); box(34, 12, 24, 14, 26, 2.4); box(0, 8, -46, 44, 14, 1.4);
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(sc, 0.035); pm.dispose(); g.dispose();
  return rt.texture;
}
/* the probe: a phased-array transducer — a small rubber face, a flaring head, a waisted grip, a strain relief and a cable; the marker is a ridge on one side */
function h3Probe() {
  const g = new THREE.Group();
  const shell = h3Phys({ color: h3Col(0xe9ebee), roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const rubber = new THREE.MeshStandardMaterial({ color: h3Col(0x2b2e36), roughness: 0.75 });
  const prof = [[0.02, 0.0], [1.18, 0.0], [1.3, 0.12], [1.34, 0.5], [1.25, 1.1], [0.98, 1.9], [0.82, 2.8], [0.86, 3.8], [0.92, 4.8], [0.8, 5.6], [0.5, 6.1], [0.3, 6.5], [0.26, 7.2]].map(q => new THREE.Vector2(q[0], q[1]));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), shell); body.scale.set(1, 1, 0.52); g.add(body);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.28, 0.28, 28), rubber); face.scale.set(1, 1, 0.5); face.position.y = 0.1; g.add(face);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.34, 0.9, 16), rubber); collar.position.y = 6.3; collar.scale.set(1, 1, 0.8); g.add(collar);
  const cable = new THREE.Mesh(h3Tube([new THREE.Vector3(0, 6.7, 0), new THREE.Vector3(0.1, 9, 0.3), new THREE.Vector3(1.2, 11.5, 1.2), new THREE.Vector3(3.5, 12.8, 2.5), new THREE.Vector3(7, 12.6, 3.5)], 0.22, 0.22, 8, true), rubber); g.add(cable);
  const ridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 1.5, 4, 8), new THREE.MeshStandardMaterial({ color: h3Col(0x55e070), emissive: h3Col(0x2fae4a), emissiveIntensity: 0.9, roughness: 0.4 })); ridge.position.set(1.22, 1.15, 0); ridge.rotation.z = 0.1; g.add(ridge);
  return g;
}
/* the chest in front of the heart: a glass skin, the sternum, seven ribs a side with their cartilages running down to the costal margin, the clavicles.
   The windows sit where they do on a patient: the 3rd–4th space at the left sternal border, the 5th space at the apex, below the xiphoid, the notch. */
function h3Chest(clip) {
  const chest = new THREE.Group(), skinY = PFT_ECHO.skinY;
  const bone = h3Phys({ color: h3Col(H3.COL.bone), roughness: 0.6, clearcoat: 0.15, transparent: true, opacity: 0.34, depthWrite: false, clippingPlanes: clip ? [clip] : [] });
  const xs = 28, zs = 28, pos = [], idx = [];
  for (let j = 0; j <= zs; j++) for (let i = 0; i <= xs; i++) { const x = -14 + 28 * i / xs, z = -13.5 + 27 * j / zs, v = h3V([x, skinY(x), z]); pos.push(v.x, v.y, v.z); }
  for (let j = 0; j < zs; j++) for (let i = 0; i < xs; i++) { const a0 = i + (xs + 1) * j, b0 = a0 + 1, c0 = a0 + xs + 1, d0 = c0 + 1; idx.push(a0, c0, b0, b0, c0, d0); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setIndex(idx); sg.computeVertexNormals();
  const skin = new THREE.Mesh(sg, h3Phys({ color: h3Col(H3.COL.skin), transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, roughness: 0.55, clearcoat: 0.3 })); skin.renderOrder = 31; chest.add(skin);
  const add = (geo) => { const mm = new THREE.Mesh(geo, bone); mm.renderOrder = 30; chest.add(mm); return mm; };
  const at = (x, z, d) => [x, skinY(x) + (d === undefined ? 0.75 : d), z];
  // the sternum: manubrium, body, xiphoid
  add(h3Tube([at(0, 8.2, 0.7), at(0, 5.0, 0.7)], 1.15, 0.9, 10)); add(h3Tube([at(0, 4.8, 0.7), at(0, -7.2, 0.7)], 0.8, 0.9, 10)); add(h3Tube([at(0, -7.2, 0.75), at(0, -8.8, 0.8)], 0.55, 0.2, 8));
  // ribs 1–7: out from the sternum, the cartilage dipping to the costochondral junction, then rising round the side
  const zi = [7.2, 4.6, 2.2, -0.2, -2.6, -4.9, -6.9], drop = [0, 0.3, 0.8, 1.4, 2.0, 2.6, 3.1];
  [-1, 1].forEach(sd => {
    zi.forEach((z0, i) => { const pts = []; for (let X = 1.0; X <= 13.6; X += 1.4) { const q = Math.min(1, X / 9); pts.push(at(sd * X, z0 - drop[i] * Math.pow(Math.sin(q * Math.PI / 2), 1.3) + (X > 8 ? 0.55 * (X - 8) : 0))); } add(h3Tube(pts, 0.34, 0.34, 8)); });
    add(h3Tube([at(sd * 1.2, -7.4), at(sd * 4, -9.6), at(sd * 8, -11.4), at(sd * 12.5, -12.6)], 0.4, 0.36, 8));   // the costal margin
    add(h3Tube([at(sd * 1.3, 8.2, 0.5), at(sd * 6, 9.0, 0.3), at(sd * 13.5, 10.2, 1.4)], 0.5, 0.45, 8));          // the clavicle
  });
  [['Head', [0, 2.5, 15.5]], ['Left', [16.5, 4, 0]], ['Right', [-16.5, 4, 0]], ['Feet', [0, 2.5, -15.5]]].forEach(L => { const sp = h3Label(L[0], 1.15, '#aab3c2'); sp.position.copy(h3V(L[1])); chest.add(sp); });
  chest.bone = bone;
  return chest;
}
function h3Label(text, hgt, color) { const sp = t3Label(text, { h: hgt || 1.6, color: color || '#ffffff', halo: 'rgba(0,0,0,0.6)' }); sp.material.map.encoding = THREE.sRGBEncoding; sp.material.toneMapped = false; sp.renderOrder = 50; return sp; }
/* ---- one instance: a canvas, a scene, controls ---- */
function h3Create(opts) {
  opts = opts || {};
  const inst = { id: uid('h3'), opts: Object.assign({ cut: true, image: true, beating: true, labels: true, spin: false, chest: true, screen: true }, opts.settings || {}), own: !!opts.ownImage, params: null, model: opts.model || 'normal', build: null, meshes: {}, decor: {}, valves: {}, labels: [], planeLabels: {}, regs: null, rings: {}, phaseShown: -1, t0: performance.now(), extT: null, tween: null, raf: 0, size: [0, 0], orbit: { th: opts.th === undefined ? 0.5 : opts.th, ph: opts.ph === undefined ? 1.25 : opts.ph, d: opts.dist || 38 }, aimTween: null, drag: null, clipSign: 1, lastImg: 0, title: '', alive: true };
  const cv = document.createElement('canvas'); cv.className = 'h3-canvas'; cv.setAttribute('aria-label', 'The heart in three dimensions with the scan plane'); cv.tabIndex = 0;
  let r; try { r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, stencil: true }); } catch (e) { r = null; }
  if (!r) return null;
  inst.quality = h3Quality(r); const full = inst.quality === 'full'; H3.lite = !full;
  r.setPixelRatio(full ? Math.min(2, window.devicePixelRatio || 1) : 1); r.localClippingEnabled = true; r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.setClearColor(0x14171d);
  r.shadowMap.enabled = full; r.shadowMap.type = THREE.PCFSoftShadowMap;
  inst.cv = cv; inst.renderer = r;
  const scene = new THREE.Scene(); inst.scene = scene;
  if (full) { try { scene.environment = h3Env(r); } catch (e) { /* without the studio the lamps below still light it */ } }
  // a quiet backdrop: darker toward the corners
  (function () { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d'), g = x.createRadialGradient(128, 110, 10, 128, 128, 190); g.addColorStop(0, '#2b313c'); g.addColorStop(1, '#0f1116'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; scene.background = t; })();
  scene.add(new THREE.HemisphereLight(0xfff0e6, 0x2a2224, full ? 0.35 : 0.8));
  const sun = new THREE.DirectionalLight(0xfff4ea, full ? 1.1 : 0.9); sun.position.set(-26, 48, 62); sun.castShadow = full; sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -18; sun.shadow.camera.right = 18; sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18; sun.shadow.camera.near = 20; sun.shadow.camera.far = 160; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.08; sun.shadow.radius = 4;
  scene.add(sun); inst.sun = sun;
  const rim = new THREE.DirectionalLight(0xbcd0ff, 0.55); rim.position.set(40, 10, -50); scene.add(rim);
  inst.camera = new THREE.PerspectiveCamera(30, 1, 1, 600);
  inst.clip = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  inst.chest = h3Chest(inst.clip); scene.add(inst.chest);
  inst.heart = new THREE.Group(); scene.add(inst.heart);
  inst.caps = new THREE.Group(); scene.add(inst.caps);
  // the probe, the beam outline and the picture plane
  inst.probe = h3Probe(); scene.add(inst.probe);
  inst.outline = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x8fe6ee, transparent: true, opacity: 0.95, depthTest: false })); inst.outline.renderOrder = 45; scene.add(inst.outline);
  inst.imgCanvas = document.createElement('canvas'); inst.imgCanvas.width = 8; inst.imgCanvas.height = 8;
  inst.tex = new THREE.CanvasTexture(inst.imgCanvas); inst.tex.minFilter = THREE.LinearFilter; inst.tex.magFilter = THREE.LinearFilter; inst.tex.encoding = THREE.sRGBEncoding;
  inst.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: inst.tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.95, toneMapped: false })); inst.plane.renderOrder = 35; inst.plane.visible = false; scene.add(inst.plane);
  inst.planeLabelGroup = new THREE.Group(); scene.add(inst.planeLabelGroup);
  // the frame
  const wrap = h('div', { class: 'h3-panel', 'data-h3': inst.id }, [
    h('div', { class: 'h3-head' }, [h('span', { class: 'h3-title', 'data-h3-title': '1', text: '' }), h('span', { class: 'h3-status', 'data-h3-status': '1', text: '' })]),
    cv,
    h('div', { class: 'h3-ctl' }, [
      h3Check(inst, 'cut', 'Cut away', 'Remove the half of the heart between you and the plane, so the cut face is what the screen shows. Off: the whole heart, with the picture seen through it.'),
      h3Check(inst, 'image', 'Picture', 'Paint the echo picture onto the scan plane'),
      h3Check(inst, 'screen', 'Screen up', 'Hold the picture the way the screen shows it, probe at the top; off keeps the patient’s head up'),
      h3Check(inst, 'chest', 'Ribs', 'The sternum, the ribs and the clavicles in front of the heart'),
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
  return h('label', { class: 'chk-inline', for: id, title: title }, [h('input', { type: 'checkbox', id: id, checked: inst.opts[key], 'data-h3-opt': key, onchange: (e) => { inst.opts[key] = e.target.checked; if (key === 'cut') h3ApplyCut(inst); if (key === 'beating') inst.t0 = performance.now() - 0.72 * H3.period * 1000; if (key === 'screen') h3Aim(inst, true); } }), label]);
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
    if (ids.length >= 2) { const p0 = d.pts[ids[0]], p1 = d.pts[ids[1]], dist = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]); if (d.pinch) inst.orbit.d = Math.max(16, Math.min(130, inst.orbit.d * d.pinch / dist)); d.pinch = dist; return; }
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    inst.orbit.th -= dx * 0.008; inst.orbit.ph = Math.max(0.15, Math.min(3.0, inst.orbit.ph - dy * 0.008));
    d.x = e.clientX; d.y = e.clientY; inst.userTurned = true;
  });
  const end = (e) => { const d = inst.drag; if (!d) return; delete d.pts[e.pointerId]; if (!Object.keys(d.pts).length) inst.drag = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', () => { inst.drag = null; });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); inst.orbit.d = Math.max(16, Math.min(130, inst.orbit.d * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: false });
  cv.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') inst.orbit.th += 0.12; else if (e.key === 'ArrowRight') inst.orbit.th -= 0.12; else if (e.key === 'ArrowUp') inst.orbit.ph = Math.max(0.15, inst.orbit.ph - 0.12); else if (e.key === 'ArrowDown') inst.orbit.ph = Math.min(3.0, inst.orbit.ph + 0.12); else return; e.preventDefault(); });
}
/* ---- the heart: materials per part, one mesh + a stencil pair + a cap each; geometry swapped per phase ---- */
/* tissue: a clear-coated surface (wet), mottled, with the grain of muscle running obliquely round the ventricles, and a paler lining where the
   inside of a chamber shows. The grain and the mottle are computed in the shader from the position, so they need no texture and no seams. */
const H3_GLSL = 'varying vec3 vH3P;\nfloat h3h(vec3 p){p=fract(p*0.3183099+vec3(0.1,0.2,0.3));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}\nfloat h3n(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);return mix(mix(mix(h3h(i),h3h(i+vec3(1,0,0)),f.x),mix(h3h(i+vec3(0,1,0)),h3h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3h(i+vec3(0,0,1)),h3h(i+vec3(1,0,1)),f.x),mix(h3h(i+vec3(0,1,1)),h3h(i+vec3(1,1,1)),f.x),f.y),f.z);}\n';
/* on a software rasteriser: the plain material (no clear coat), and only the lining tint from the shader */
function h3Phys(o) { if (!H3.lite) return new THREE.MeshPhysicalMaterial(o); const q = Object.assign({}, o); delete q.clearcoat; delete q.clearcoatRoughness; delete q.envMapIntensity; return new THREE.MeshStandardMaterial(q); }
function h3Tissue(mat, fibre, bump, lining) {
  mat.defines = Object.assign({}, mat.defines || {}, { H3_FIB: fibre.toFixed(2), H3_BUMP: bump.toFixed(2), H3_LIN: lining.toFixed(2) });
  if (H3.lite) { mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n\tif (!gl_FrontFacing) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.70, 0.33, 0.29), H3_LIN) * 0.82;'); }; return mat; }
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vH3P;').replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvH3P = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + H3_GLSL)
      .replace('#include <color_fragment>', '#include <color_fragment>\n\t{ vec3 q = vH3P; float fib = h3n(vec3(dot(q, vec3(0.62, 0.55, 0.56)) * 0.8, dot(q, vec3(-0.71, 0.70, 0.10)) * 6.5, dot(q, vec3(-0.33, -0.46, 0.82)) * 6.5)); float mot = h3n(q * 1.3) * 0.6 + h3n(q * 3.1) * 0.4;\n\tdiffuseColor.rgb *= (1.0 - 0.22 * H3_FIB * (1.0 - fib)) * (0.9 + 0.2 * mot);\n\tif (!gl_FrontFacing) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.70, 0.33, 0.29), H3_LIN) * 0.82; }')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n\t{ vec3 q = vH3P * 4.5; normal = normalize(normal + H3_BUMP * (vec3(h3n(q), h3n(q + 7.3), h3n(q + 13.1)) - 0.5)); }');
  };
  return mat;
}
function h3Material(id, kind) {
  const col = h3Col(H3.COL[id] || H3.COL[kind] || 0xaaaaaa);
  if (kind === 'fluid') return h3Phys({ color: col, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, roughness: 0.12, clearcoat: 0.8 });
  if (kind === 'organ') return h3Phys({ color: col, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, roughness: 0.6, clearcoat: 0.3 });
  if (kind === 'fat') return h3Tissue(h3Phys({ color: col, roughness: 0.55, clearcoat: 0.45, clearcoatRoughness: 0.4 }), 0.0, 0.45, 0.0);
  if (kind === 'coronary') return h3Phys({ color: col, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  if (kind === 'valve') return h3Phys({ color: col, roughness: 0.5, clearcoat: 0.3, side: THREE.DoubleSide });
  const vessel = kind === 'vessel' || kind === 'artery' || kind === 'pa' || kind === 'pv';
  const m = h3Phys({ color: col, roughness: vessel ? 0.4 : 0.5, metalness: 0.0, clearcoat: vessel ? 0.55 : 0.5, clearcoatRoughness: 0.32, side: THREE.DoubleSide, envMapIntensity: 0.9, clipShadows: true });
  return h3Tissue(m, vessel ? 0.25 : 1.0, vessel ? 0.1 : 0.22, vessel ? 0.25 : 0.6);
}
const H3_DECOR_KIND = { la: 'wall', ra: 'wall' };
function h3SetModel(inst, pathId) {
  const model = PFT_ECHO.build(pathId || 'normal');
  inst.model = pathId || 'normal';
  inst.build = h3Build(inst.model, model);
  // rebuild the meshes for this build's parts
  Object.keys(inst.meshes).forEach(id => { const M = inst.meshes[id]; inst.heart.remove(M.mesh); inst.heart.remove(M.stencil); inst.caps.remove(M.cap); });
  Object.keys(inst.decor).forEach(id => inst.heart.remove(inst.decor[id].mesh)); inst.decor = {};
  Object.keys(inst.valves).forEach(id => inst.heart.remove(inst.valves[id])); inst.valves = {};
  inst.meshes = {}; inst.labels.forEach(s => inst.heart.remove(s)); inst.labels = [];
  const B = inst.build;
  B.parts.forEach((p, i) => {
    const geo = p.static ? B.statics[p.id] : (B.phases[h3Nearest(B, 0)] || {})[p.id] || new THREE.BufferGeometry();
    const mat = h3Material(p.id, p.kind); mat.clippingPlanes = inst.opts.cut ? [inst.clip] : [];
    const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 20 + i; mesh.userData.id = p.id; inst.heart.add(mesh);
    const solid = p.kind === 'wall' || p.kind === 'vessel';
    mesh.castShadow = solid; mesh.receiveShadow = solid;
    const capCol = h3Col(H3.COL[p.id] || 0xaaaaaa).multiplyScalar(p.kind === 'wall' ? 1.12 : 0.95);
    const stencil = h3StencilGroup(geo, inst.clip, 1 + i), cap = h3Cap(capCol, 1.1 + i);
    stencil.visible = solid && inst.opts.cut; cap.visible = solid && inst.opts.cut;
    inst.heart.add(stencil); inst.caps.add(cap);
    inst.meshes[p.id] = { mesh: mesh, stencil: stencil, cap: cap, mat: mat, solid: solid, kind: p.kind };
    const lp = h3LabelPos(model, p.id);
    if (H3.LABEL[p.id] && lp) { const sp = h3Label(H3.LABEL[p.id], 1.7); sp.visible = false; sp.userData.id = p.id; sp.userData.home = lp; sp.position.copy(lp); inst.heart.add(sp); inst.labels.push(sp); }
  });
  // the valve annuli (thin rings) and the leaflets (their geometry is recomputed every frame)
  Object.keys(inst.rings).forEach(k => inst.heart.remove(inst.rings[k])); inst.rings = {};
  const valveMat = h3Material('valve', 'valve'); valveMat.clippingPlanes = inst.opts.cut ? [inst.clip] : []; inst.valveMat = valveMat;
  ['mv', 'tv', 'av'].forEach(id => { const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.055, 8, 48), valveMat); ring.renderOrder = 28; inst.heart.add(ring); inst.rings[id] = ring; });
  PFT_ECHO.valves3d(model, 0.72).forEach(v => {
    const n = v.n, idx = []; for (let i = 0; i < n - 1; i++) idx.push(i, n + i, i + 1, i + 1, n + i, n + i + 1);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * n * 3), 3)); g.setIndex(idx);
    const mesh = new THREE.Mesh(g, valveMat); mesh.renderOrder = 29; mesh.frustumCulled = false; inst.heart.add(mesh); inst.valves[v.id] = mesh;
  });
  inst.valveT = -1; inst.modelObj = model;
  const c = model.lvc; inst.centre = h3V([c[0] - 1.2, c[1] + 1.0, c[2] + 0.4]);
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
  const planes = inst.opts.cut ? [inst.clip] : [];
  Object.keys(inst.meshes).forEach(id => {
    const M = inst.meshes[id];
    M.mat.clippingPlanes = planes; M.mat.needsUpdate = true;
    M.stencil.visible = M.solid && inst.opts.cut; M.cap.visible = M.solid && inst.opts.cut;
  });
  Object.keys(inst.decor).forEach(id => { inst.decor[id].mesh.material.clippingPlanes = planes; inst.decor[id].mesh.material.needsUpdate = true; });
  if (inst.valveMat) { inst.valveMat.clippingPlanes = planes; inst.valveMat.needsUpdate = true; }
  if (inst.chest && inst.chest.bone) { inst.chest.bone.clippingPlanes = planes; inst.chest.bone.needsUpdate = true; }
}
/* the phase on show: nearest built geometry swapped into the meshes, the tubes of that phase, the valve rings placed and sized */
function h3ShowPhase(inst, ph) {
  const B = inst.build; if (!B) return;
  const use = h3Nearest(B, ph); if (use < 0 || use === inst.phaseShown) return;
  const set = B.phases[use];
  Object.keys(inst.meshes).forEach(id => { const M = inst.meshes[id], g = set[id]; if (!g) return; M.mesh.geometry = g; M.stencil.meshes.forEach(s => { s.geometry = g; }); });
  const dec = B.decor[use] || {};
  Object.keys(dec).forEach(id => {
    let D = inst.decor[id];
    if (!D) {
      const src = (PFT_ECHO.fields(inst.modelObj, 0, { zMin: H3.zMin }).decor || []).filter(d => d.id === id.replace('fat_', ''))[0] || {};
      const kind = id.indexOf('fat_') === 0 ? 'fat' : (H3_DECOR_KIND[src.kind] || src.kind || 'vessel');
      const mat = h3Material(src.kind === 'la' ? 'la' : (src.kind === 'ra' ? 'ra' : (src.kind === 'pa' ? 'pa' : kind)), kind); mat.clippingPlanes = inst.opts.cut ? [inst.clip] : [];
      const mesh = new THREE.Mesh(dec[id], mat); mesh.renderOrder = kind === 'fat' ? 26 : 27; mesh.castShadow = kind !== 'fat'; mesh.receiveShadow = true; inst.heart.add(mesh);
      D = inst.decor[id] = { mesh: mesh };
    }
    D.mesh.geometry = dec[id];
  });
  (B.rings[use] || []).forEach(R => {
    const ring = inst.rings[R.id]; if (!ring) return;
    ring.position.copy(h3V(R.c)); const ax = h3V(R.axis).normalize(); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ax); ring.scale.setScalar(R.r);
  });
  inst.phaseShown = use;
}
/* the leaflets move with the time itself, not with the twelve meshed phases: they are the quickest thing in the heart */
function h3Valves(inst, t) {
  if (Math.abs(t - inst.valveT) < (H3.lite ? 0.08 : 0.03)) return;
  inst.valveT = t;
  PFT_ECHO.valves3d(inst.modelObj, t).forEach(v => {
    const mesh = inst.valves[v.id]; if (!mesh) return;
    const P = mesh.geometry.attributes.position.array, src = v.pos;
    for (let i = 0; i < src.length; i += 3) { P[i] = src[i]; P[i + 1] = src[i + 2]; P[i + 2] = -src[i + 1]; }
    mesh.geometry.attributes.position.needsUpdate = true; mesh.geometry.computeVertexNormals();
  });
}
/* ---- the plane: from probe parameters (the lab and the atlas) or given directly (the real lab) ---- */
function h3PlaneFromParams(params) {
  const pr = PFT_ECHO.probe(params.model ? params : Object.assign({ model: PFT_ECHO.build(params.path || 'normal') }, params));
  const depth = params.depth || 16, top = 6, H = EH_H, W = EH_W, scale = (H - top - 4) / depth;
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
function h3SetImage(inst, gray, W, H, mask, regs) {
  if (inst.visible === false && inst.hasImage) return;   // nothing to paint for while the panel is off the screen
  inst.regs = regs ? { W: W, H: H, list: regs } : null;
  const c = inst.imgCanvas;
  if (c.width !== W || c.height !== H) {   // a texture's storage is sized once: a new size means a new texture
    c.width = W; c.height = H;
    if (inst.tex) inst.tex.dispose();
    inst.tex = new THREE.CanvasTexture(c); inst.tex.minFilter = THREE.LinearFilter; inst.tex.magFilter = THREE.LinearFilter; inst.tex.encoding = THREE.sRGBEncoding;
    inst.plane.material.map = inst.tex; inst.plane.material.needsUpdate = true;
  }
  const ctx = c.getContext('2d'), data = inst.imgData && inst.imgData.width === W && inst.imgData.height === H ? inst.imgData : (inst.imgData = ctx.createImageData(W, H));
  const px = data.data;
  for (let i = 0, n = W * H; i < n; i++) { const g = gray[i], o = i * 4; px[o] = g; px[o + 1] = g; px[o + 2] = g; px[o + 3] = (mask && !mask[i]) ? 0 : Math.min(255, 70 + g * 3.2); }
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
  inst.plane.visible = inst.opts.image && inst.hasImage; inst.plane.material.opacity = inst.opts.cut ? 1 : 0.62;
  if (inst.plane.material.depthTest !== !!inst.opts.cut) { inst.plane.material.depthTest = !!inst.opts.cut; inst.plane.material.needsUpdate = true; }   // whole heart: the picture is seen through it
  // the cut: remove the half between the camera and the plane (with a little hysteresis at the crossing)
  const cam = inst.camera.position.clone().sub(P), s = cam.dot(n);
  if (Math.abs(s) > 0.8) inst.clipSign = s > 0 ? 1 : -1;
  const ncam = n.clone().multiplyScalar(inst.clipSign);
  inst.clip.setFromNormalAndCoplanarPoint(ncam.clone().negate(), P);
  Object.keys(inst.meshes).forEach(id => { const M = inst.meshes[id]; if (!M.cap.visible) return; inst.clip.coplanarPoint(M.cap.position); M.cap.lookAt(M.cap.position.x - inst.clip.normal.x, M.cap.position.y - inst.clip.normal.y, M.cap.position.z - inst.clip.normal.z); });
}
/* the names: on the cut face they sit where the structures are in the picture; on the whole heart they sit on the chambers, and any that would
   overprint a more important one is dropped for that frame */
function h3Labels(inst, S) {
  const show = inst.opts.labels, onPlane = show && inst.opts.cut && inst.regs && S;
  inst.labels.forEach(sp => { sp.visible = false; });
  const used = {};
  if (onPlane) {
    const R = inst.regs, P = h3V(S.P), d = h3V(S.d), l = h3V(S.l), n = h3V(S.n).multiplyScalar(inst.clipSign || 1);
    const a0 = S.rect.along[0], a1 = S.rect.along[1], b0 = S.rect.across[0], b1 = S.rect.across[1];
    const placed = [], w = inst.size[0], hgt = inst.size[1], v = new THREE.Vector3();
    R.list.slice().sort((p, q) => (q.n || 0) - (p.n || 0)).forEach(rg => {   // the larger structures claim their place first
      const name = H3.SHORT[rg.id]; if (!name || (rg.frac !== undefined && rg.frac < 0.006)) return;
      let sp = inst.planeLabels[name]; if (!sp) { sp = inst.planeLabels[name] = h3Label(name, 1.35); inst.planeLabelGroup.add(sp); }
      sp.position.copy(P).addScaledVector(d, a0 + (rg.y / R.H) * (a1 - a0)).addScaledVector(l, b0 + (rg.x / R.W) * (b1 - b0)).addScaledVector(n, 0.25);
      v.copy(sp.position).project(inst.camera); const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * hgt;
      if (placed.some(q => Math.abs(q[0] - x) < 40 && Math.abs(q[1] - y) < 16)) return;
      placed.push([x, y]); sp.visible = true; used[name] = 1;
    });
  } else if (show) {
    const placed = [], w = inst.size[0], hgt = inst.size[1], v = new THREE.Vector3();
    const near = inst.opts.cut && S && inst.clip;   // cut open with no picture regions (the real lab): name only what the plane passes through
    inst.labels.forEach(sp => {
      if (near && Math.abs(inst.clip.distanceToPoint(sp.userData.home)) > 1.6) return;
      v.copy(sp.userData.home).project(inst.camera); if (v.z > 1) return;
      const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * hgt;
      if (placed.some(q => Math.abs(q[0] - x) < 58 && Math.abs(q[1] - y) < 20)) return;
      placed.push([x, y]); sp.visible = true;
    });
  }
  Object.keys(inst.planeLabels).forEach(k => { if (!used[k]) inst.planeLabels[k].visible = false; });
}
function h3Resize(inst) {
  const cv = inst.cv, w = Math.max(200, Math.floor(cv.parentElement.getBoundingClientRect().width));
  let hgt = Math.round(Math.max(260, Math.min(inst.maxH || 440, w * 0.7)));
  /* beside a neighbour (inst.matchEl, the echo screen in the lab): take its height, so the two columns end on one line */
  const mt = inst.matchEl;
  if (mt && mt.isConnected && inst.el) {
    const a = mt.getBoundingClientRect(), b = inst.el.getBoundingClientRect();
    if (a.height > 200 && Math.abs(a.top - b.top) < 14 && Math.abs(a.left - b.left) > 40) hgt = Math.round(Math.max(260, Math.min(640, a.height - (b.height - cv.getBoundingClientRect().height))));
  }
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
    if (inst.own && inst.params && inst.opts.image && now - inst.lastImg > 110) { inst.lastImg = now; const res = PFT_ECHO.render(Object.assign({ model: inst.build.model }, inst.params), EH_W, EH_H, t, {}); h3SetImage(inst, res.img, EH_W, EH_H, res.sector.inside, PFT_ECHO.regions(res, EH_W, EH_H).filter(q => q.frac > 0.004)); }
    h3Valves(inst, t);
    // the camera
    if (inst.aimTween) { if (inst.drag) inst.aimTween = null; else { const A = inst.aimTween, k = Math.min(1, (now - A.t0) / A.dur), e = k * k * (3 - 2 * k); inst.orbit.th = A.th0 + (A.th1 - A.th0) * e; inst.orbit.ph = A.ph0 + (A.ph1 - A.ph0) * e; if (k >= 1) inst.aimTween = null; } }
    if (inst.opts.spin && !inst.drag) inst.orbit.th += 0.0035;
    const o = inst.orbit, c = inst.centre || new THREE.Vector3();
    inst.camera.position.set(c.x + o.d * Math.sin(o.ph) * Math.sin(o.th), c.y + o.d * Math.cos(o.ph), c.z + o.d * Math.sin(o.ph) * Math.cos(o.th));
    inst.camera.up.copy(inst.opts.screen && inst.planeSpec ? h3V(inst.planeSpec.d).negate().normalize() : new THREE.Vector3(0, 1, 0));
    inst.camera.lookAt(c);
    const S = inst.planeSpec;
    const sig = [inst.phaseShown, inst.valveT.toFixed(3), o.th.toFixed(4), o.ph.toFixed(4), o.d.toFixed(2), inst.size[0], inst.size[1], inst.tex ? inst.tex.version : 0, inst.build ? inst.build.done : 0, S ? S.P.concat(S.d, S.l).map(x => x.toFixed(3)).join() : '', Object.keys(inst.opts).map(k => inst.opts[k] ? 1 : 0).join(''), inst.regs ? inst.regs.list.length : -1].join('|');
    if (sig !== inst.sig) {
      inst.sig = sig;
      if (S) h3Place(inst, S);
      inst.chest.visible = inst.opts.chest;
      h3Labels(inst, S);
      inst.renderer.render(inst.scene, inst.camera);
      inst.frames = (inst.frames || 0) + 1;
    }
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
