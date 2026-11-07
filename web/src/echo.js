/* Echo & POCUS: the windows and views, how to obtain them, the anatomy on the screen, the measurements, the protocols —
   and a scanning simulator: a 3-D model of the heart, great vessels, liver and IVC in the chest, a probe with a position,
   a rotation, a tilt and a rock, and a sector renderer that paints the slice as a B-mode image with speckle.
   Loads standalone; testable in node (the renderer writes into typed arrays). */
(function (root) {
  'use strict';
  const T = {};
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const D2R = Math.PI / 180;
  /* ---------- vectors ---------- */
  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]),
    unit: (a) => { const l = V.len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    rot: (v, axis, ang) => { const c = Math.cos(ang), s = Math.sin(ang), k = V.unit(axis); return V.add(V.add(V.mul(v, c), V.mul(V.cross(k, v), s)), V.mul(k, V.dot(k, v) * (1 - c))); }
  };
  /* body frame (cm): x = patient's left, y = depth into the body from the anterior chest wall, z = superior. Origin: mid-sternum at the 4th interspace. */

  /* ================================================================== the model ================================================================== */
  const S = { AIR: 0, WALL: 1, TISSUE: 2, BLOOD: 3, MYO: 4, PERI: 5, FLUID: 6, VALVE: 7, PAP: 8, VESSEL: 9, LIVER: 10, DIAPH: 11, LVB: 12, RVB: 13, LAB: 14, RAB: 15, AOB: 16, PAB: 17, IVCB: 18, DAOB: 19, SVCB: 20, PLEFF: 21 };
  const NAMES = { 12: 'LV', 13: 'RV', 14: 'LA', 15: 'RA', 16: 'Ao', 17: 'PA', 18: 'IVC', 19: 'DAo', 20: 'SVC', 4: 'myocardium', 5: 'pericardium', 6: 'effusion', 7: 'valve', 8: 'papillary', 10: 'liver', 11: 'diaphragm', 21: 'pleural effusion' };
  const INTENSITY = { 0: 0, 1: 0.42, 2: 0.3, 3: 0.05, 4: 0.58, 5: 1.0, 6: 0.02, 7: 0.95, 8: 0.62, 9: 0.85, 10: 0.5, 11: 0.98, 12: 0.05, 13: 0.05, 14: 0.05, 15: 0.05, 16: 0.05, 17: 0.05, 18: 0.05, 19: 0.05, 20: 0.05, 21: 0.02 };
  const PATHOLOGY = [
    { id: 'normal', title: 'Normal heart', p: {} , note: 'A normal adult: LV 4.8 cm, walls 0.9 cm, EF ~60%, RV smaller than the LV, IVC 1.6 cm collapsing with the breath, no fluid.' },
    { id: 'dcm', title: 'Dilated LV, poor function', p: { lvScale: 1.35, contr: 0.25, laScale: 1.2, ivc: 1.3, ivcCol: 0.1 }, note: 'A big, round, barely moving left ventricle: EPSS wide, fractional shortening small, the mitral leaflets far from the septum; a full IVC.' },
    { id: 'rv', title: 'Dilated RV (acute PE)', p: { rvScale: 1.9, rvContr: 0.4, lvScale: 0.85, ivc: 1.3, ivcCol: 0.1 }, note: 'RV:LV > 1 in the four-chamber view, the septum pushed over, TAPSE small, a plethoric IVC — the picture of acute pressure overload.' },
    { id: 'eff', title: 'Pericardial effusion', p: { effusion: 1.4 }, note: 'An echo-free band around the heart, largest posteriorly and at the apex; the heart swings; look for RA and RV collapse and the IVC.' },
    { id: 'tamp', title: 'Tamponade', p: { effusion: 1.8, rvCollapse: 1, ivc: 1.4, ivcCol: 0.05, contr: 0.8 }, note: 'A large circumferential effusion with diastolic collapse of the RV free wall, a plethoric IVC that does not collapse, a small underfilled LV.' },
    { id: 'hypo', title: 'Hypovolaemia', p: { lvScale: 0.82, contr: 1.3, ivc: 0.5, ivcCol: 0.9 }, note: 'A small hyperdynamic LV whose walls nearly touch in systole (“kissing walls”), a slit-like IVC that collapses completely.' },
    { id: 'lvh', title: 'Concentric LVH', p: { wall: 1.6, lvScale: 0.9 }, note: 'Thick walls (> 1.2 cm) around a small cavity; hypertensive heart disease, aortic stenosis, HCM, infiltrative disease.' },
    { id: 'pleff', title: 'Left pleural effusion', p: { pleural: 1 }, note: 'Fluid posterior to the descending aorta in the parasternal long axis (a pericardial effusion stays anterior to it) and in the costophrenic angle on the lung scan.' }
  ];
  function build(pathOrId) {
    const pr = typeof pathOrId === 'string' ? (PATHOLOGY.filter(x => x.id === pathOrId)[0] || PATHOLOGY[0]).p : (pathOrId || {});
    const o = Object.assign({ lvScale: 1, rvScale: 1, laScale: 1, raScale: 1, contr: 1, rvContr: 1, wall: 1, effusion: 0, ivc: 1, ivcCol: 0.55, rvCollapse: 0, pleural: 0 }, pr);
    // the heart frame: the long axis a (base → apex), n1 toward the RV (anterior-right), n2 = a × n1
    const apex = [9.2, 4.6, -5.4], base = [2.0, 8.6, 1.4];
    const a = V.unit(V.sub(apex, base));
    let n1 = V.unit([-0.55, -1, 0.15]); n1 = V.unit(V.sub(n1, V.mul(a, V.dot(n1, a))));
    const n2 = V.unit(V.cross(a, n1));
    const lvc = V.add(base, V.mul(a, 4.6));
    const m = { o: o, a: a, n1: n1, n2: n2, lvc: lvc, apex: apex, base: base,
      lv: { ra: 4.3, rc: 2.35 * o.lvScale, wall: 0.9 * o.wall, ann: -3.5, annR: 1.45 },
      rv: { c: [3.0 + 0.6 * (o.rvScale - 1), 0.8], psi: 15 * D2R, ra: 3.7, rb: 2.0 * o.rvScale, rc: 4.2 * (0.8 + 0.2 * o.rvScale), wall: 0.4, ann: -2.9, annR: 1.6 },
      la: { c: [-5.7, -0.3, 0.1], r: [2.4 * o.laScale, 2.25 * o.laScale, 2.45 * o.laScale], wall: 0.25 },
      ra: { c: [-5.2, 1.1, 2.7], r: [2.2 * o.raScale, 2.0 * o.raScale, 2.2 * o.raScale], wall: 0.25 },
      ao: { r: 1.5 }, pa: { r: 1.2 }, ivc: { r: 1.0 * o.ivc, col: o.ivcCol }, dao: { c: [1.0, 12.2], r: 1.15, z: [-16, 2.5] },
      liver: { c: [-1, 5.5, -12], r: [12, 6.5, 7] }
    };
    // tubes in body coordinates: the aortic root → ascending → arch → descending; the PA; the IVC and the SVC
    const H2B = (u, v, w) => V.add(V.add(V.add(lvc, V.mul(a, u)), V.mul(n1, v)), V.mul(n2, w));
    m.h2b = H2B;
    const rootC = H2B(-3.2, 2.0, 0.55);
    const e = V.unit(V.add(V.add(V.mul(a, -0.45), [-0.1, -0.35, 0.95]), V.mul(n1, 0.2)));
    m.ao.root = rootC; m.ao.e = e;
    const asc = [rootC, V.add(rootC, V.mul(e, 2.0)), V.add(rootC, V.mul(e, 4.0))];
    const top = V.add(rootC, V.mul(e, 4.0)), des0 = [m.dao.c[0], m.dao.c[1], 2.5];
    const arch = []; for (let i = 1; i <= 6; i++) { const t = i / 6, ang = Math.PI * t; const mid = V.mul(V.add(top, des0), 0.5), rad = V.len(V.sub(des0, top)) / 2; arch.push([mid[0] + (top[0] - mid[0]) * Math.cos(ang) + 0.4 * Math.sin(ang), mid[1] + (top[1] - mid[1]) * Math.cos(ang), mid[2] + (top[2] - mid[2]) * Math.cos(ang) + rad * 0.75 * Math.sin(ang)]); }
    m.aortaPath = asc.concat(arch); m.aortaR = [1.5, 1.45, 1.4, 1.3, 1.25, 1.2, 1.2, 1.15, 1.15];
    const rvot = H2B(-2.4, 2.6, -1.8);
    const pe = V.unit(V.add(V.add(V.mul(a, -0.5), [0.3, 0.15, 0.85]), V.mul(n2, -0.15)));
    m.paPath = [rvot, V.add(rvot, V.mul(pe, 1.8)), V.add(rvot, V.mul(pe, 3.6)), V.add(V.add(rvot, V.mul(pe, 3.6)), [1.6, 1.4, 0.6])];
    const rac = H2B(m.ra.c[0], m.ra.c[1], m.ra.c[2]);
    m.ra.cb = rac;
    m.ivcPath = [[rac[0] - 0.4, rac[1] + 0.6, rac[2] - 1.6], [rac[0] - 0.9, rac[1] + 1.2, rac[2] - 5], [rac[0] - 1.3, rac[1] + 1.6, rac[2] - 19]];
    m.hvPath = [[rac[0] - 1.0, rac[1] + 1.3, rac[2] - 5.6], [rac[0] - 4.2, rac[1] + 3.6, rac[2] - 8.5]];
    m.svcPath = [[rac[0] - 0.2, rac[1] - 0.2, rac[2] + 2.4], [rac[0] - 0.6, rac[1] - 0.4, rac[2] + 6.5]];
    return m;
  }
  /* distance from a point to a polyline (returns the distance and the parameter along the path) */
  function tubeDist(p, path) {
    let best = 1e9, bi = 0, bt = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const A = path[i], B = path[i + 1], AB = V.sub(B, A), AP = V.sub(p, A);
      const t = clamp(V.dot(AP, AB) / (V.dot(AB, AB) || 1), 0, 1);
      const q = V.add(A, V.mul(AB, t)), d = V.len(V.sub(p, q));
      if (d < best) { best = d; bi = i; bt = t; }
    }
    return { d: best, i: bi, t: bt };
  }
  const ell = (u, v, w, ra, rb, rc) => (u * u) / (ra * ra) + (v * v) / (rb * rb) + (w * w) / (rc * rc);
  /* the cycle: k = contraction (0 diastole → 1 end-systole), phase 0 at the R wave */
  function cycle(t) { t = ((t % 1) + 1) % 1; const k = t < 0.36 ? Math.sin(Math.PI * t / 0.36 * 0.5) : (t < 0.6 ? Math.cos(Math.PI * (t - 0.36) / 0.24 * 0.5) : 0); return clamp(k, 0, 1); }
  /* funnel leaflets: the segment from the annulus hinge toward the cavity, in the (axial, radial) half-plane; angle depends on opening */
  function leaflet(u, rho, azim, annU, annR, open, dir) {
    // dir = +1: leaflets point toward +u (into a ventricle whose cavity is at u > annU); azim: 0 = the anterior (long) leaflet
    const L = 1.45 + 0.75 * Math.max(0, Math.cos(azim));
    const beta = (6 + 68 * open) * D2R;
    const ux = annU + dir * L * Math.cos(beta), rx = annR - L * Math.sin(beta);
    // distance from (u, rho) to the segment (annU, annR) → (ux, rx)
    const dx = ux - annU, dy = rx - annR, px = u - annU, py = rho - annR;
    const t = clamp((px * dx + py * dy) / (dx * dx + dy * dy || 1), 0, 1);
    const qx = annU + dx * t, qy = annR + dy * t;
    return Math.hypot(u - qx, rho - qy) < 0.13 && rho <= annR + 0.05;
  }
  const skinY = (x) => 0.035 * x * x;   // the chest curves away laterally: the skin is deeper at the apex than at the sternum
  function classify(m, x, y, z, t) {
    const sk = skinY(x);
    if (y < sk) return S.AIR;
    if (y < sk + 1.3) return S.WALL;
    const o = m.o, k = cycle(t);
    // heart frame
    const hx = x - m.lvc[0], hy = y - m.lvc[1], hz = z - m.lvc[2];
    const u = hx * m.a[0] + hy * m.a[1] + hz * m.a[2], v = hx * m.n1[0] + hy * m.n1[1] + hz * m.n1[2], w = hx * m.n2[0] + hy * m.n2[1] + hz * m.n2[2];
    const lv = m.lv, rv = m.rv;
    const lvK = k * o.contr, rvK = k * o.rvContr;
    const lvRa = lv.ra * (1 - 0.1 * lvK), lvRc = lv.rc * (1 - 0.3 * lvK);
    const epiRa = lv.ra + lv.wall * 0.9, epiRc = lv.rc + lv.wall + 0.25 * lvK;
    const rho = Math.sqrt(v * v + w * w), azim = Math.atan2(w, v);
    // ---- the left heart
    const inLvCav = ell(u, v, w, lvRa, lvRc, lvRc) < 1 && u > lv.ann - 0.2;
    const inLvEpi = ell(u, v, w, epiRa, epiRc, epiRc) < 1 && u > lv.ann - 1.2;
    const la = m.la, laR = la.r.map((r, i) => r * (i === 0 ? 1 + 0.06 * k : 1 + 0.08 * k));
    const inLaCav = ell(u - la.c[0], v - la.c[1], w - la.c[2], laR[0], laR[1], laR[2]) < 1;
    const inLaOut = ell(u - la.c[0], v - la.c[1], w - la.c[2], laR[0] + la.wall, laR[1] + la.wall, laR[2] + la.wall) < 1;
    // mitral valve: a funnel from the annulus into the LV; open in diastole
    if (!inLvCav || rho > 0.4) { if (u > lv.ann - 0.5 && u < lv.ann + 2.6 && rho < lv.annR + 0.1 && leaflet(u, rho, azim, lv.ann, lv.annR, 1 - lvK, +1)) return S.VALVE; }
    else if (leaflet(u, rho, azim, lv.ann, lv.annR, 1 - lvK, +1)) return S.VALVE;
    if (inLvCav) {
      // papillary muscles
      for (let i = 0; i < 2; i++) { const ang = (i === 0 ? 118 : 242) * D2R, pr = lvRc * 0.62; const pv = pr * Math.cos(ang), pw = pr * Math.sin(ang); if (ell(u - 0.6, v - pv, w - pw, 1.5, 0.5, 0.5) < 1) return S.PAP; }
      return S.LVB;
    }
    // ---- the right heart (a crescent: the RV ellipsoid minus the LV epicardium)
    const rvC = [rv.c[0], rv.c[1]], cps = Math.cos(rv.psi), sps = Math.sin(rv.psi);
    const rvV = (v - rvC[0]) * cps + (w - rvC[1]) * sps, rvW = -(v - rvC[0]) * sps + (w - rvC[1]) * cps;   // radial, tangential
    const rvRb = rv.rb * (1 - 0.25 * rvK) * (o.rvCollapse ? (1 - 0.35 * (1 - k)) : 1), rvRc = rv.rc * (1 - 0.1 * rvK), rvRa = rv.ra * (1 - 0.08 * rvK);
    const inRvCav = ell(u - 0.2, rvV, rvW, rvRa, rvRb, rvRc) < 1 && !inLvEpi && u > rv.ann - 0.2;
    const inRvOut = ell(u - 0.2, rvV, rvW, rvRa + rv.wall, rvRb + rv.wall, rvRc + rv.wall) < 1 && u > rv.ann - 0.9;
    // tricuspid valve
    const rvRho = Math.sqrt(rvV * rvV + rvW * rvW), rvAz = Math.atan2(rvW, rvV);
    if (u > rv.ann - 0.5 && u < rv.ann + 2.4 && rvRho < rv.annR + 0.1 && !inLvEpi && leaflet(u, rvRho, rvAz + 2.2, rv.ann, rv.annR, 1 - rvK, +1)) return S.VALVE;
    if (inRvCav) {
      // moderator band near the apex
      const bA = [1.7, (lv.rc + 0.6) * Math.cos(rv.psi + 0.5), (lv.rc + 0.6) * Math.sin(rv.psi + 0.5)], bB = [1.7, (rvC[0] + rvRb * 0.9) * 1.0, rvC[1] + 1.2];
      const AB = [bB[0] - bA[0], bB[1] - bA[1], bB[2] - bA[2]], AP = [u - bA[0], v - bA[1], w - bA[2]];
      const tt = clamp((AP[0] * AB[0] + AP[1] * AB[1] + AP[2] * AB[2]) / (AB[0] * AB[0] + AB[1] * AB[1] + AB[2] * AB[2]), 0, 1);
      const q = [bA[0] + AB[0] * tt, bA[1] + AB[1] * tt, bA[2] + AB[2] * tt];
      if (Math.hypot(u - q[0], v - q[1], w - q[2]) < 0.22) return S.PAP;
      return S.RVB;
    }
    const ra = m.ra, raR = ra.r.map((r) => r * (1 + 0.07 * k) * (o.rvCollapse ? (1 - 0.3 * k) : 1));
    const inRaCav = ell(u - ra.c[0], v - ra.c[1], w - ra.c[2], raR[0], raR[1], raR[2]) < 1;
    const inRaOut = ell(u - ra.c[0], v - ra.c[1], w - ra.c[2], raR[0] + ra.wall, raR[1] + ra.wall, raR[2] + ra.wall) < 1;
    // ---- the aorta (root, ascending, arch, descending) and the aortic valve
    const p = [x, y, z];
    const aoD = tubeDist(p, m.aortaPath);
    const aoR = m.aortaR[Math.min(m.aortaR.length - 1, aoD.i)];
    if (aoD.d < aoR) {
      // valve: a plane 0.35 cm along the root axis
      const s = V.dot(V.sub(p, m.ao.root), m.ao.e);
      if (s > 0.25 && s < 0.5) {
        const rad = V.sub(V.sub(p, m.ao.root), V.mul(m.ao.e, s)), rr = V.len(rad);
        const ref = V.unit(V.cross(m.ao.e, m.a)), ref2 = V.cross(m.ao.e, ref);
        const ang = Math.atan2(V.dot(rad, ref2), V.dot(rad, ref));
        const open = lvK;   // open in systole
        if (open < 0.5) { const am = ((ang % (2 * Math.PI / 3)) + 2 * Math.PI / 3) % (2 * Math.PI / 3); if (rr < 0.3 || Math.abs(am - Math.PI / 3) > Math.PI / 3 - 0.3) return S.VALVE; }
        else if (rr > aoR - 0.35) return S.VALVE;
      }
      return S.AOB;
    }
    if (aoD.d < aoR + 0.18) return S.VESSEL;
    // descending aorta (straight down, posterior to the LA)
    const dd = Math.hypot(x - m.dao.c[0], y - m.dao.c[1]);
    if (z > m.dao.z[0] && z < m.dao.z[1]) { if (dd < m.dao.r) return S.DAOB; if (dd < m.dao.r + 0.18) return S.VESSEL; }
    // pulmonary artery
    const paD = tubeDist(p, m.paPath);
    if (paD.d < m.pa.r && !inRvCav) return S.PAB;
    if (paD.d < m.pa.r + 0.15 && !inRvCav && !inRvOut) return S.VESSEL;
    // atria
    if (inLaCav) return S.LAB;
    if (inRaCav) return S.RAB;
    // the caval veins
    const breath = o.ivcCol * Math.max(0, Math.sin(2 * Math.PI * ((t * 0.27) % 1)));   // the IVC narrows with inspiration (a slower cycle)
    const ivcD = tubeDist(p, m.ivcPath), ivcR = m.ivc.r * (1 - 0.8 * breath);
    if (ivcD.d < ivcR) return S.IVCB;
    if (ivcD.d < ivcR + 0.15) return S.VESSEL;
    const hvD = tubeDist(p, m.hvPath); if (hvD.d < 0.4) return S.IVCB; if (hvD.d < 0.52) return S.VESSEL;
    const svD = tubeDist(p, m.svcPath); if (svD.d < 0.9) return S.SVCB; if (svD.d < 1.05) return S.VESSEL;
    // ---- walls
    if (inLvEpi || (inRvOut && !inRvCav) || (inLaOut && !inLaCav) || (inRaOut && !inRaCav)) return S.MYO;
    // ---- the pericardium and an effusion: a band outside the epicardial union
    const effu = o.effusion;
    const bandIn = (d) => ell(u, v, w, epiRa + d, epiRc + d, epiRc + d) < 1 && u > lv.ann - 1.2 - d || ell(u - 0.2, rvV, rvW, rvRa + rv.wall + d, rvRb + rv.wall + d, rvRc + rv.wall + d) < 1 && u > rv.ann - 0.9 - d || ell(u - la.c[0], v - la.c[1], w - la.c[2], laR[0] + la.wall + d, laR[1] + la.wall + d, laR[2] + la.wall + d) < 1 || ell(u - ra.c[0], v - ra.c[1], w - ra.c[2], raR[0] + ra.wall + d, raR[1] + ra.wall + d, raR[2] + ra.wall + d) < 1;
    if (effu > 0) { if (bandIn(effu * (u > 0 ? 1 : 0.7))) return S.FLUID; if (bandIn(effu * (u > 0 ? 1 : 0.7) + 0.2)) return S.PERI; }
    else if (bandIn(0.22)) return S.PERI;
    // ---- the liver, the diaphragm, a pleural effusion
    const lv2 = m.liver;
    const le = ell(x - lv2.c[0], y - lv2.c[1], z - lv2.c[2], lv2.r[0], lv2.r[1], lv2.r[2]);
    if (le < 1) return S.LIVER;
    if (le < 1.09 && z > lv2.c[2] + 1) return S.DIAPH;
    if (o.pleural && ell(x - 7, y - 14.5, z + 6, 5.5, 3.6, 7.5) < 1) return S.PLEFF;
    return S.TISSUE;
  }

  /* ================================================================== the probe ================================================================== */
  const WINDOWS = {
    psl: { title: 'Parasternal', pos: [2.6, 0, 0.2], d: [0, 1, 0], note: 'Left sternal border, 3rd–4th interspace, patient in the left lateral decubitus.' },
    apical: { title: 'Apical', pos: [9.4, 0, -5.6], d: null, note: 'The point of maximal impulse, 5th interspace near the mid-clavicular line, patient left lateral; aim toward the right shoulder.' },
    subcostal: { title: 'Subcostal', pos: [0.8, 0, -9.2], d: null, note: 'Just below the xiphoid, patient supine with knees bent, the probe nearly flat on the abdomen, aimed at the left shoulder; the liver is the window.' },
    ssn: { title: 'Suprasternal', pos: [0, 0, 8.5], d: [0.05, 0.8, -0.6], note: 'The suprasternal notch, neck extended, aimed down into the chest toward the heart.' }
  };
  function probe(params) {
    const win = WINDOWS[params.win] || WINDOWS.psl;
    const m = params.model;
    const px = win.pos[0] + (params.dx || 0);
    const P = [px, skinY(px), win.pos[2] + (params.dz || 0)];
    let d0 = win.d;
    if (!d0) {
      if (params.win === 'apical') d0 = V.unit(V.sub(m.base, [P[0], P[1], P[2]]));
      else d0 = V.unit(V.sub(V.add(m.lvc, [0, 0, 1.2]), P));
    }
    // tangent basis: t1 toward the patient's left, t2 toward the head
    let t1 = V.unit(V.sub([1, 0, 0], V.mul(d0, V.dot([1, 0, 0], d0))));
    let t2 = V.unit(V.sub(V.sub([0, 0, 1], V.mul(d0, V.dot([0, 0, 1], d0))), V.mul(t1, V.dot([0, 0, 1], t1))));
    const th = (params.rot || 0) * D2R;
    let l = V.unit(V.add(V.mul(t1, Math.cos(th)), V.mul(t2, Math.sin(th))));
    let d = d0;
    let n = V.unit(V.cross(d, l));
    // tilt (fan across the plane: rotate the beam about the lateral axis)
    d = V.unit(V.rot(d, l, (params.tilt || 0) * D2R));
    n = V.unit(V.cross(d, l));
    // rock (within the plane: rotate the beam about the plane normal)
    const rk = (params.rock || 0) * D2R;
    d = V.unit(V.rot(d, n, rk)); l = V.unit(V.rot(l, n, rk));
    return { P: P, d: d, l: l, n: n, win: win };
  }
  /* the sector: width W, height H in pixels, depth cm, apex at the top centre; returns ids + intensities */
  const sectorCache = {};
  function sector(W, H, depth) {
    const key = W + 'x' + H + 'x' + depth;
    if (sectorCache[key]) return sectorCache[key];
    const top = 6, scale = (H - top - 4) / depth, cx = W / 2, half = 45 * D2R;
    const r = new Float32Array(W * H), c = new Float32Array(W * H), s = new Float32Array(W * H), inside = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const dx = i + 0.5 - cx, dy = j + 0.5 - top; const rr = Math.sqrt(dx * dx + dy * dy) / scale, phi = Math.atan2(dx, dy);
      const idx = j * W + i; r[idx] = rr; c[idx] = Math.cos(phi); s[idx] = Math.sin(phi);
      inside[idx] = (dy > 0 && Math.abs(phi) <= half && rr <= depth && rr >= 0.25) ? 1 : 0;
    }
    return (sectorCache[key] = { r: r, c: c, s: s, inside: inside, scale: scale, top: top });
  }
  function hash(i, j, seed) { let h = (i * 374761393 + j * 668265263 + seed * 2246822519) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function render(params, W, H, t, opts) {
    opts = opts || {};
    const m = params.model, depth = params.depth || 16, pr = probe(params), sec = sector(W, H, depth);
    const ids = new Uint8Array(W * H), img = new Uint8ClampedArray(W * H);
    const gain = opts.gain === undefined ? 1 : opts.gain;
    const P = pr.P, d = pr.d, l = pr.l;
    for (let idx = 0; idx < W * H; idx++) {
      if (!sec.inside[idx]) { ids[idx] = S.AIR; img[idx] = 0; continue; }
      const r = sec.r[idx], cr = sec.c[idx] * r, sr = sec.s[idx] * r;
      const x = P[0] + cr * d[0] + sr * l[0], y = P[1] + cr * d[1] + sr * l[1], z = P[2] + cr * d[2] + sr * l[2];
      const id = classify(m, x, y, z, t);
      ids[idx] = id;
      let I = INTENSITY[id];
      const i = idx % W, j = (idx / W) | 0;
      if (id === S.AIR) { img[idx] = 0; continue; }
      // speckle: fine and coarse grains
      const n1 = hash(i, j, 7), n2 = hash(i >> 1, j >> 1, 11), n3 = hash(i >> 2, j >> 2, 13);
      const grain = 0.45 + 0.55 * (0.45 * n1 + 0.35 * n2 + 0.2 * n3);
      if (I > 0.1) I *= grain * (id === S.PERI || id === S.VALVE || id === S.DIAPH ? 1.15 : 1);
      else I = I * 0.6 + 0.06 * n1 * n2;
      // depth attenuation with time-gain compensation (mild), near-field haze
      I *= gain * (1.05 - 0.3 * (r / depth)) + (r < 1.2 ? 0.12 * (1.2 - r) : 0);
      // beam blur: a touch of lateral averaging would cost a second pass; a lateral dependence of speckle is enough here
      img[idx] = clamp(Math.round(I * 255), 0, 255);
    }
    return { ids: ids, img: img, probe: pr, sector: sec };
  }
  /* which structures are on the screen, where (centroids in pixels) and how big */
  function regions(res, W, H) {
    const acc = {};
    for (let idx = 0; idx < W * H; idx++) { const id = res.ids[idx]; if (!NAMES[id]) continue; const r = acc[id] || (acc[id] = { id: id, n: 0, x: 0, y: 0 }); r.n++; r.x += idx % W; r.y += (idx / W) | 0; }
    return Object.keys(acc).map(k => { const r = acc[k]; return { id: r.id, name: NAMES[r.id], n: r.n, x: r.x / r.n, y: r.y / r.n, frac: r.n / (W * H) }; }).sort((p, q) => q.n - p.n);
  }

  /* ================================================================== the views ================================================================== */
  const VIEWS = [
    { id: 'plax', title: 'Parasternal long axis (PLAX)', win: 'psl', rot: 135, tilt: 0, rock: -10, dx: -0.5, dz: 1, depth: 16, tol: { rot: 12, tilt: 10, rock: 10, pos: 1.2 },
      how: 'Probe at the left sternal border in the 3rd or 4th interspace, marker to the right shoulder (10–11 o’clock), beam perpendicular to the chest. The LV long axis runs across the screen with the apex to the left (off screen) and the base to the right; the RV outflow sits on top, the LA below the aortic root, the descending aorta behind the LA.',
      see: ['RV (anterior, top)', 'Interventricular septum and LV cavity', 'Mitral valve: anterior leaflet in continuity with the aortic root, posterior leaflet', 'LVOT and aortic valve (two cusps: right coronary anterior, non-coronary posterior)', 'LA posterior to the root', 'Descending aorta (a circle behind the LA) — the landmark separating pericardial from pleural fluid', 'Pericardium: the bright posterior line'],
      measure: ['LVIDd and LVIDs at the leaflet tips → fractional shortening (25–45%)', 'Septal and posterior wall thickness (0.6–1.1 cm)', 'EPSS (E-point septal separation): < 7 mm normal; > 7 mm suggests EF < 50% (> 13 mm, EF < 30%)', 'Aortic root (< 3.7 cm), LA (< 4 cm) at end-systole', 'Pericardial effusion: posterior, anterior to the descending aorta'],
      pitfalls: ['Off-axis (foreshortened) LV: the apex appears to round into the image — slide one space down or rotate', 'Angled through the RV outflow makes the RV look large', 'The aortic valve not opening fully in the plane: tilt slightly'] },
    { id: 'psax_av', title: 'Parasternal short axis — aortic valve level', win: 'psl', rot: 45, tilt: 20, rock: 0, dx: 0, dz: 0, depth: 14, tol: { rot: 12, tilt: 8, rock: 10, pos: 1.2 },
      how: 'From the PLAX rotate the marker 90° clockwise to the left shoulder (1–2 o’clock); tilt the tail down (beam toward the base and the right shoulder) until the aortic valve is a circle in the centre: the “Mercedes-Benz” sign of the three cusps, the RA–tricuspid–RV–RVOT–pulmonary valve wrapping around it from 7 to 2 o’clock, the LA behind.',
      see: ['Aortic valve, three cusps (right coronary anterior, left coronary posterior-left, non-coronary posterior-right)', 'RVOT and pulmonary valve (top, wrapping left)', 'RA and tricuspid valve (left)', 'LA (bottom) and the interatrial septum', 'Main pulmonary artery'],
      measure: ['Aortic valve opening and calcification; bicuspid valve', 'RVOT diameter, RVOT VTI (stroke volume alternative)', 'Pulmonary artery pressure from the pulmonary regurgitation jet'],
      pitfalls: ['Too much tilt: the aorta becomes a long axis', 'Cusps mimicked by the valve plane when off-axis'] },
    { id: 'psax_mv', title: 'Parasternal short axis — mitral valve level', win: 'psl', rot: 45, tilt: -4, rock: 0, dx: 0, dz: 0, depth: 14, tol: { rot: 12, tilt: 7, rock: 10, pos: 1.2 },
      how: 'From the aortic valve level, tilt toward the apex until the mitral leaflets appear as the “fish mouth” opening and closing inside the circular LV; the crescent of the RV lies anterior.',
      see: ['Circular LV with the mitral leaflets (anterior above, posterior below)', 'RV crescent anterior-right', 'Septum between them'],
      measure: ['Mitral valve area by planimetry (stenosis)', 'Qualitative LV size and function'],
      pitfalls: ['Oblique cut makes the LV oval and the leaflets asymmetric'] },
    { id: 'psax_pm', title: 'Parasternal short axis — papillary muscle level', win: 'psl', rot: 45, tilt: -18, rock: 0, dx: 0, dz: 0, depth: 14, tol: { rot: 12, tilt: 7, rock: 10, pos: 1.2 },
      how: 'Tilt further toward the apex: the circular LV with the two papillary muscles at 4 and 8 o’clock (anterolateral and posteromedial) and the RV crescent. The standard level for LV function and the septal shape.',
      see: ['LV: a circle in cross-section with the two papillary muscles', 'RV crescent (anterior)', 'Septum: round in a normal heart; flattened (“D”) with RV pressure or volume overload'],
      measure: ['Fractional area change, wall motion by segment (anterior, lateral, inferior, septal)', 'Eccentricity index (D-sign)', 'Wall thickness; pericardial fluid'],
      pitfalls: ['Mistaking the papillary muscles for masses', 'An oval LV from an oblique cut'] },
    { id: 'a4c', title: 'Apical four-chamber (A4C)', win: 'apical', rot: 0, tilt: 0, rock: 0, dx: 0, dz: 0, depth: 16, tol: { rot: 12, tilt: 8, rock: 8, pos: 1.2 },
      how: 'Probe at the apex (the PMI, 5th interspace, patient on the left side), marker to the patient’s left (3 o’clock), beam aimed toward the right shoulder. The apex is at the top, the LV on the right of the screen, the RV on the left, the atria below, the mitral and tricuspid valves across the middle.',
      see: ['LV (right) and RV (left): the RV should be no more than two thirds of the LV', 'Interventricular septum', 'Mitral valve (right) and tricuspid valve (left, inserted slightly nearer the apex)', 'LA and RA with the interatrial septum', 'Moderator band in the RV apex'],
      measure: ['LVEF by eyeball or biplane Simpson', 'RV:LV end-diastolic ratio (> 0.6 dilated; > 1 severe)', 'TAPSE (M-mode through the lateral tricuspid annulus; < 17 mm abnormal), S′', 'MAPSE (< 8 mm low EF)', 'E/e′ (lateral and septal) for filling pressures', 'RV FAC (< 35% abnormal)'],
      pitfalls: ['Foreshortening: a round apex with a short LV — slide down an interspace and lateral', 'Tilting anteriorly brings in the LVOT (A5C); posteriorly the coronary sinus', 'Too medial a window makes the RV look big'] },
    { id: 'a5c', title: 'Apical five-chamber (A5C)', win: 'apical', rot: 0, tilt: 10, rock: 0, dx: 0, dz: 0, depth: 16, tol: { rot: 12, tilt: 7, rock: 8, pos: 1.2 },
      how: 'From the A4C tilt the probe anteriorly (the tail down toward the bed) until the LVOT and the aortic valve open up between the mitral valve and the septum: the fifth chamber.',
      see: ['The four chambers plus the LVOT and aortic valve'],
      measure: ['LVOT VTI (18–22 cm normal; < 15 low stroke volume) by pulsed-wave Doppler 0.5 cm below the valve; stroke volume = LVOT area × VTI', 'Aortic valve gradient (continuous-wave)'],
      pitfalls: ['The Doppler angle: keep the beam parallel to the LVOT flow'] },
    { id: 'a2c', title: 'Apical two-chamber (A2C)', win: 'apical', rot: 60, tilt: 0, rock: 0, dx: 0, dz: 0, depth: 16, tol: { rot: 12, tilt: 8, rock: 8, pos: 1.2 },
      how: 'From the A4C rotate the marker 60° counter-clockwise (toward the left shoulder / 1 o’clock) until the RV disappears: the LV and LA alone, the anterior wall on the right and the inferior wall on the left.',
      see: ['LV: anterior wall (right) and inferior wall (left)', 'LA and mitral valve', 'Left atrial appendage (sometimes)'],
      measure: ['Biplane Simpson EF with the A4C', 'Inferior and anterior wall motion'],
      pitfalls: ['A sliver of RV means the rotation is incomplete'] },
    { id: 'a3c', title: 'Apical three-chamber / long axis (A3C)', win: 'apical', rot: 120, tilt: 0, rock: -5, dx: 0, dz: 0, depth: 16, tol: { rot: 12, tilt: 8, rock: 8, pos: 1.2 },
      how: 'Rotate another 60° counter-clockwise (marker toward the right shoulder): the parasternal long axis seen from the apex — LV, LA, mitral valve, LVOT and the aortic root.',
      see: ['LV, LVOT, aortic valve and root', 'LA and mitral valve', 'Anteroseptal and inferolateral walls'],
      measure: ['LVOT Doppler (an alternative to the A5C)', 'Aortic regurgitation'],
      pitfalls: ['Easily confused with the A5C: in the A3C there is no RV'] },
    { id: 'sc4', title: 'Subcostal four-chamber', win: 'subcostal', rot: 10, tilt: 0, rock: -25, dx: 1, dz: -1.5, depth: 20, tol: { rot: 12, tilt: 10, rock: 10, pos: 1.5 },
      how: 'Probe flat below the xiphoid, marker to the patient’s left, beam aimed up at the left shoulder through the liver: the liver in the near field, then the RA and RV nearest the probe, the LV and LA deeper. The view of choice in the supine, ventilated, hyperinflated or arrested patient and for pericardial fluid.',
      see: ['Liver (near field)', 'RA and RV (nearest the probe), the diaphragm and pericardium between liver and heart', 'LV and LA deeper', 'Interatrial and interventricular septa'],
      measure: ['Pericardial effusion and RV/RA collapse (tamponade)', 'Gross LV/RV size and function', 'Interatrial septal bowing'],
      pitfalls: ['Gastric air blocks the window: more pressure, bend the knees, exhale', 'Epicardial fat anteriorly mimics an effusion (it is echogenic and does not move independently)'] },
    { id: 'ivc', title: 'Subcostal IVC (long axis)', win: 'subcostal', rot: 80, tilt: 24, rock: -30, dx: -1, dz: -2, depth: 20, tol: { rot: 12, tilt: 10, rock: 10, pos: 1.5 },
      how: 'From the subcostal four-chamber, rotate the marker to the head (12 o’clock) and tilt the beam toward the patient’s right until the IVC runs into the RA as a long tube through the liver, with a hepatic vein joining it. Measure 2 cm from the RA junction.',
      see: ['IVC entering the RA', 'Hepatic vein', 'Liver', 'The diaphragm'],
      measure: ['IVC diameter and collapsibility (spontaneous breathing): ≤ 2.1 cm and > 50% collapse → RAP ~3 (0–5); > 2.1 cm and < 50% → RAP ~15 (10–20); otherwise ~8 (5–10) (ASE)', 'Distensibility on positive pressure (> 18% suggests fluid responsiveness; many caveats)'],
      pitfalls: ['The aorta mistaken for the IVC: the aorta is left of the spine, pulsatile, thick-walled, with no hepatic vein; the IVC enters the RA', 'Measuring off-axis underestimates the diameter', 'The IVC is unreliable on high PEEP, in RV failure, tamponade, PH and after liver surgery'] },
    { id: 'ssn', title: 'Suprasternal (aortic arch)', win: 'ssn', rot: 90, tilt: 0, rock: 0, dx: 0, dz: 0, depth: 12, tol: { rot: 15, tilt: 10, rock: 10, pos: 1.5 },
      how: 'Probe in the suprasternal notch with the neck extended, marker toward the head and left shoulder (12–1 o’clock), beam aimed down and back into the chest: the arch of the aorta as a candy cane with the ascending aorta on the left, the arch vessels on top, the descending aorta on the right, and the right pulmonary artery beneath the arch.',
      see: ['Ascending aorta, arch (brachiocephalic, left carotid, left subclavian origins), descending aorta', 'Right pulmonary artery in cross-section under the arch'],
      measure: ['Aortic dissection flap, coarctation gradient, aortic regurgitation flow reversal'],
      pitfalls: ['Difficult in the ventilated patient; a small window'] }
  ];
  function view(id) { return VIEWS.filter(v => v.id === id)[0] || null; }
  function angDiff(a, b) { let d = (a - b) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; }
  function score(params, viewId) {
    const v = view(viewId); if (!v) return null;
    const hints = [];
    let penalty = 0;
    if (params.win !== v.win) { penalty += 60; hints.push('Move to the ' + WINDOWS[v.win].title.toLowerCase() + ' window'); }
    const dr = angDiff(params.rot || 0, v.rot), dt = (params.tilt || 0) - v.tilt, dk = (params.rock || 0) - v.rock;
    const dx = (params.dx || 0) - v.dx, dz = (params.dz || 0) - v.dz, dp = Math.hypot(dx, dz);
    penalty += Math.max(0, Math.abs(dr) - 3) * 0.6 + Math.max(0, Math.abs(dt) - 2) * 1.6 + Math.max(0, Math.abs(dk) - 2) * 1.6 + Math.max(0, dp - 0.3) * 14;
    const parts = [[Math.abs(dr) / v.tol.rot, dr > 0 ? 'Rotate the marker ' + Math.round(Math.abs(dr)) + '° clockwise' : 'Rotate the marker ' + Math.round(Math.abs(dr)) + '° counter-clockwise'], [Math.abs(dt) / v.tol.tilt, dt > 0 ? 'Tilt back (fan the beam the other way) by ' + Math.round(Math.abs(dt)) + '°' : 'Tilt forward (fan the beam further) by ' + Math.round(Math.abs(dt)) + '°'], [Math.abs(dk) / v.tol.rock, 'Rock the probe ' + Math.round(Math.abs(dk)) + '° ' + (dk > 0 ? 'back toward centre' : 'the other way')], [dp / v.tol.pos, 'Slide the probe ' + (Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'medially' : 'laterally') : (dz > 0 ? 'down one space' : 'up one space')) + ' (' + dp.toFixed(1) + ' cm off)']];
    parts.filter(p => p[0] > 1).sort((p, q) => q[0] - p[0]).forEach(p => hints.push(p[1]));
    const sc = clamp(Math.round(100 - penalty), 0, 100);
    return { score: sc, obtained: params.win === v.win && Math.abs(dr) <= v.tol.rot && Math.abs(dt) <= v.tol.tilt && Math.abs(dk) <= v.tol.rock && dp <= v.tol.pos, hints: hints };
  }
  function viewParams(id) { const v = view(id); return v ? { win: v.win, rot: v.rot, tilt: v.tilt, rock: v.rock, dx: v.dx, dz: v.dz, depth: v.depth } : null; }

  /* ================================================================== the content ================================================================== */
  T.echo_intro = { title: 'Point-of-care echo: the machine, the probe, the picture', kicker: 'Five windows, a handful of views, and the questions they answer in a minute at the bedside', blocks: [
    { p: 'Focused cardiac ultrasound answers binary questions at the bedside — is the left ventricle grossly failing, is the right ventricle dilated, is there a pericardial effusion, is the IVC full or empty, is there a gross valve problem — in a few views, in a few minutes, by the clinician treating the patient. It is not a comprehensive echocardiogram: no chamber quantification to the millimetre, no full valve assessment, no diastology; when the focused scan raises a question, the full study answers it. The five windows (parasternal, apical, subcostal, suprasternal, and the lungs and the IVC that belong to them) are the vocabulary; the rest of this area is how to get them, what is in them, and what to measure.' },
    { h: 'The probe and the knobs', ul: [
      'Phased-array (cardiac) probe, 1–5 MHz, a small footprint that fits between ribs; a curvilinear probe will do for the subcostal views and the IVC; the linear probe for the pleura and vessels.',
      'Cardiac preset: the orientation marker is on the right of the screen (the opposite of abdominal imaging) — so with the marker to the patient’s left in the apical window, the LV is on the right of the screen. Depth 14–18 cm for the heart, 20+ for the subcostal; gain so that blood is black and myocardium grey; time-gain compensation flat; frame rate high (narrow the sector, reduce the depth) for moving valves.',
      'The four movements: slide (move the footprint across the skin), rotate (around the beam axis, turning the plane), tilt (fan: angle the plane across the heart, the probe face stays in the same place), rock (angle within the plane, moving the image sideways). Small movements: a few millimetres and a few degrees change the view.',
      'Modes: B-mode for anatomy; M-mode for TAPSE, EPSS, the IVC and the lung; colour Doppler for gross regurgitation and shunts; pulsed-wave Doppler for the LVOT VTI and mitral inflow; continuous-wave for the tricuspid regurgitation jet (RV systolic pressure = 4v² + RAP) and aortic stenosis; tissue Doppler for S′ and e′.'] },
    { h: 'The patient', ul: [
      'Left lateral decubitus brings the heart to the chest wall for the parasternal and apical windows; supine with the knees bent for the subcostal; the arms up for the lateral chest in lung scanning.',
      'In the ventilated or hyperinflated patient (COPD, high PEEP) the parasternal and apical windows shrink and the subcostal window is often the only one; ask for a breath-hold at end-expiration from a cooperative patient, or time the frame to the ventilator.',
      'Obesity, chest tubes, dressings, surgical emphysema and lung in between are the usual reasons for a poor window: change the window before changing the gain.'] },
    { h: 'What a focused scan answers (and the measurement that backs it)', table: { head: ['Question', 'View', 'Eyeball sign', 'Number'], rows: [
      ['Is the LV failing?', 'PLAX, PSAX, A4C', 'Walls barely thickening, the mitral leaflet far from the septum', 'EPSS > 7 mm; FS < 25%; MAPSE < 8 mm; eyeball EF < 30 / 30–50 / > 50'],
      ['Is the RV dilated or failing?', 'A4C, PSAX, subcostal', 'RV as big as or bigger than the LV, a D-shaped septum, the apex taken by the RV', 'RV:LV > 0.6 (dilated), > 1 (severe); TAPSE < 17 mm; S′ < 9.5 cm/s; FAC < 35%'],
      ['Is there a pericardial effusion? Tamponade?', 'Subcostal, PLAX, A4C', 'Echo-free band; RA systolic and RV diastolic collapse; swinging heart', '< 1 cm small, 1–2 moderate, > 2 large; IVC plethora; mitral inflow variation > 30%'],
      ['Is the patient full or empty?', 'Subcostal IVC, PSAX', 'Kissing walls; a slit IVC that collapses; or a round IVC that does not', 'IVC ≤ 2.1 cm with > 50% collapse → RAP ~3; > 2.1 and < 50% → ~15'],
      ['Is the stroke volume adequate?', 'A5C', '—', 'LVOT VTI 18–22 cm normal; < 15 low; passive leg raise ΔVTI > 12% = fluid responsive'],
      ['Is there a gross valve problem?', 'PLAX, A4C, A5C', 'Flail leaflet, big colour jet, a thick immobile valve', 'Beyond the focused scan: the full study'],
      ['Is the lung wet, dry, collapsed, or has it a pneumothorax?', 'Lung zones', 'B-lines, A-lines with sliding, consolidation, absent sliding with a lung point', 'BLUE protocol']] } },
    { src: ['Spencer KT, et al. Focused cardiac ultrasound: recommendations from the American Society of Echocardiography. J Am Soc Echocardiogr 2013;26:567–81.', 'Via G, et al. International evidence-based recommendations for focused cardiac ultrasound. J Am Soc Echocardiogr 2014;27:683.e1–33.', 'Lang RM, et al. Recommendations for cardiac chamber quantification by echocardiography in adults. J Am Soc Echocardiogr 2015;28:1–39.', 'Rudski LG, et al. Guidelines for the echocardiographic assessment of the right heart in adults. J Am Soc Echocardiogr 2010;23:685–713.', 'Mitchell C, et al. Guidelines for performing a comprehensive transthoracic echocardiographic examination in adults (ASE). J Am Soc Echocardiogr 2019;32:1–64.'] }
  ] };

  T.echo_views = { title: 'The windows and the views', kicker: 'Where the probe goes, which way the marker points, what fills the screen, and what to measure in it', blocks: [
    { p: 'Each card below is one standard view: the probe position and marker direction, the picture the simulator makes at that position with the structures labelled, the anatomy to find, the measurements the view is used for, and the mistakes that make it unreadable. The pictures are rendered from the same model as the scanning lab, so what you obtain there should look like what you see here. Add your own de-identified clips or stills to any card: they are kept on this device only.' },
    { widget: 'echoatlas' },
    { h: 'The sequence of a focused scan', ol: ['Parasternal long axis: LV size and function, the mitral and aortic valves, the LA, a posterior effusion.', 'Parasternal short axis at the papillary level: LV function by segment, the septal shape, the RV crescent.', 'Apical four-chamber: the four chambers, RV:LV, TAPSE, the valves on colour.', 'Subcostal four-chamber: the effusion, RA/RV collapse, the patient who has no other window.', 'Subcostal IVC: size and collapse.', 'Then the lungs (anterior and lateral zones) and, if the question needs it, the A5C for the LVOT VTI and the suprasternal for the arch.'] },
    { src: ['Mitchell C, et al. ASE comprehensive TTE examination guideline. J Am Soc Echocardiogr 2019;32:1–64.', 'Levitov A, et al. Guidelines for the appropriate use of bedside general and cardiac ultrasonography in the evaluation of critically ill patients — part II: cardiac ultrasonography (SCCM). Crit Care Med 2016;44:1206–27.'] }
  ] };

  T.echo_anatomy = { title: 'Anatomy on the screen', kicker: 'How the heart sits in the chest, and why each window shows what it shows', blocks: [
    { p: 'The heart lies in the mediastinum with its long axis pointing from the base (right-posterior-superior, under the sternum at the 3rd interspace) to the apex (left-anterior-inferior, at the 5th interspace in the mid-clavicular line). The right ventricle is anterior, wrapped around the left ventricle as a crescent from the sternum to the right; the left atrium is the most posterior chamber, against the oesophagus and the descending aorta; the aorta rises from the centre of the heart between the right atrium and the pulmonary trunk. Each ultrasound window is a plane through this oblique heart: the parasternal long axis contains the long axis and the anterior direction (RV outflow on top), the short axis cuts across it (the LV as a circle with the RV crescent anterior), the apical views look along the long axis from the apex, the subcostal view comes in from below through the liver.' },
    { h: 'The chambers and what tells them apart', table: { head: ['Structure', 'Where it sits', 'How to recognise it', 'Normal size'], rows: [
      ['Left ventricle', 'Posterior-left, thick-walled, bullet-shaped', 'Walls 0.6–1.1 cm; two papillary muscles; smooth apex; mitral valve with two leaflets', 'LVIDd 3.9–5.3 cm (women) / 4.2–5.9 (men)'],
      ['Right ventricle', 'Anterior, a crescent on the LV', 'Thin free wall (≤ 0.5 cm), coarse trabeculae, moderator band, tricuspid valve inserted nearer the apex than the mitral', 'Basal diameter < 4.1 cm; RV:LV < 0.6 in A4C'],
      ['Left atrium', 'Most posterior, midline', 'Behind the aortic root (PLAX); the pulmonary veins enter it; the descending aorta behind it', '< 4 cm (PLAX); area < 20 cm²'],
      ['Right atrium', 'Right-anterior of the LA', 'Receives the IVC and SVC; the Eustachian valve; the interatrial septum between them', 'Area < 18 cm²'],
      ['Aorta', 'Central, from the LVOT upward and to the right, then the arch leftward and posterior, descending left of the spine', 'A thick-walled pulsatile tube with three cusps at its root; the descending aorta is the circle behind the LA in PLAX', 'Root < 3.7 cm'],
      ['Pulmonary artery', 'From the RVOT, anterior-superior, crossing the aorta', 'Wraps around the aortic valve in the PSAX-AV view; bifurcates under the arch', '< 2.5 cm'],
      ['IVC', 'Right of the spine, through the liver into the RA', 'Thin-walled, enters the RA, hepatic vein joins it, changes with breathing', '1.5–2.1 cm'],
      ['Pericardium', 'Around the heart to the great vessels', 'The brightest line on the image; fluid between it and the epicardium is black', 'Physiological fluid < 0.5 cm']] } },
    { h: 'The orientation rule', ul: ['Cardiac preset: the marker is on the right of the screen. The probe face is at the top; depth increases downward. What is nearest the probe is at the top: the RV in the parasternal views, the apex in the apical views, the liver in the subcostal.', 'PLAX: marker to the right shoulder → base of the heart (LA, aorta) on the right of the screen, apex off to the left. PSAX: marker to the left shoulder → the RV crescent on the left and top, the posterior wall at the bottom. A4C: marker to the patient’s left → LV on the right, RV on the left (some labs display the reverse, “RV on the right”). Subcostal: marker to the left → the same layout as the A4C rotated, with the liver on top.'] },
    { note: 'The lab draws every structure in a fixed colour code when labels are on; the quiz page asks you to name them unlabelled.' },
    { src: ['Netter FH. Atlas of Human Anatomy, plates of the heart in situ.', 'Otto CM. Textbook of Clinical Echocardiography, 6th ed. Chapter 2: normal anatomy and examination.'] }
  ] };

  T.echo_assess = { title: 'The assessments: LV, RV, pericardium, IVC, valves', kicker: 'The eyeball, then the number that backs it up', blocks: [
    { h: 'Left ventricular systolic function', ul: [
      'Eyeball EF in three bins (< 30%, 30–50%, > 50%) from the PLAX, PSAX and A4C — the endocardium moving toward the centre and the walls thickening in systole; trained clinicians agree with the formal EF within 10%.',
      'EPSS (PLAX, M-mode through the anterior mitral leaflet tip): the distance between the leaflet’s E point and the septum; < 7 mm normal, > 7 mm EF < 50% likely (> 13 mm, EF < 30%). Invalid in mitral stenosis, severe aortic regurgitation, and a dilated septum.',
      'Fractional shortening (PLAX, M-mode at the chordal level): (LVIDd − LVIDs)/LVIDd, 25–45% normal; EF ≈ FS × 1.7 in a symmetric ventricle.',
      'MAPSE (A4C, M-mode through the lateral mitral annulus): the annulus moves toward the apex > 10 mm normally; < 8 mm suggests EF < 50%.',
      'LVOT VTI (A5C, pulsed-wave Doppler): 18–22 cm normal; stroke volume = π(LVOT diameter/2)² × VTI; < 15 cm a low stroke volume; the change after a passive leg raise (> 12%) predicts fluid responsiveness.',
      'Regional wall motion in the PSAX (anterior, lateral, inferior, septal) and the apical views: the territories of the LAD (anterior, apex, septum), circumflex (lateral), RCA (inferior, RV).'] },
    { h: 'The right ventricle', ul: [
      'Size: RV:LV end-diastolic diameter ratio in the A4C (< 0.6 normal, 0.6–1 moderate, > 1 severe dilatation); the apex formed by the RV instead of the LV; a dilated RA.',
      'Septum: flattened in systole (pressure overload) or diastole (volume overload) — the D-sign in the PSAX; eccentricity index > 1.1.',
      'Function: TAPSE (M-mode through the lateral tricuspid annulus in the A4C) < 17 mm abnormal; S′ (tissue Doppler at the same place) < 9.5 cm/s; FAC (end-diastolic − end-systolic area)/end-diastolic area < 35%; TAPSE/PASP < 0.31 mm/mm Hg uncoupled.',
      'Pressure: RVSP = 4 × (TR velocity)² + RAP; > 35–40 mm Hg raised; the acute RV cannot generate > 60.',
      'McConnell sign (akinetic mid-free wall with a hyperkinetic apex) in acute PE; the 60/60 sign (PA acceleration time < 60 ms with a TR gradient < 60 mm Hg); a clot in transit in the RA.',
      'Chronic vs acute overload: a thick RV free wall (> 0.5 cm) means chronic pressure overload (PH, COPD); a thin dilated RV with a normal wall is acute (PE).'] },
    { h: 'The pericardium', ul: [
      'Effusion: an echo-free space between the epicardium and the pericardium that persists through the cycle; small < 1 cm, moderate 1–2, large > 2 cm (end-diastole); posterior first, circumferential when large. Epicardial fat is echogenic, anterior only and moves with the heart; a left pleural effusion lies posterior to the descending aorta in the PLAX, a pericardial effusion anterior to it.',
      'Tamponade is a clinical diagnosis supported by: RA collapse lasting > one third of systole (sensitive), RV free-wall collapse in early diastole (specific), a plethoric IVC (> 2.1 cm, < 50% collapse — sensitive, 97%), mitral inflow E-wave variation > 30% and tricuspid > 60% with respiration, a swinging heart. A loculated post-surgical effusion can tamponade a single chamber with none of the classic signs — the subcostal and the clinical picture decide.',
      'Pericardiocentesis under ultrasound: the largest pocket nearest the probe (often apical or subcostal), the needle in-plane, agitated saline to confirm.'] },
    { h: 'The IVC and volume', ul: [
      'Long axis in the subcostal window, measured 2 cm from the RA junction (just caudal to the hepatic vein), M-mode through the breath. Spontaneous breathing: ≤ 2.1 cm and > 50% collapse → RAP 3 (0–5); > 2.1 cm and < 50% → RAP 15 (10–20); otherwise 8 (5–10). A sniff exaggerates the collapse.',
      'On positive-pressure ventilation the IVC distends with the breath: a distensibility index > 18% (Barbier) or > 12% (Feissel) predicts fluid responsiveness in deeply sedated, passive patients at 8 mL/kg tidal volume — most ICU patients are not.',
      'The IVC does not say the patient needs fluid; it says what the right atrial pressure is. A plethoric IVC with a failing RV, tamponade or high PEEP needs no fluid; a collapsing IVC in a bleeding patient does. Use it with the heart, the lungs and the clinical picture; the passive leg raise with a VTI change is the more reliable test.'] },
    { h: 'Valves at a glance', ul: ['Aortic stenosis: a thick, calcified valve that opens little in PLAX/PSAX, LVH; the gradient by continuous-wave is the full study’s job. Severe AS with a low-output state changes the pressor plan (phenylephrine, avoid vasodilators).', 'Mitral regurgitation: colour jet into the LA; flail leaflet or papillary rupture after MI (acute MR: a hyperdynamic LV with pulmonary oedema).', 'Endocarditis: a mobile mass on a valve in a bacteraemic patient — the TOE question.', 'Prosthetic valves and mechanical valves need the full study.'] },
    { src: ['Lang RM, et al. ASE chamber quantification. J Am Soc Echocardiogr 2015.', 'Rudski LG, et al. Right heart assessment. J Am Soc Echocardiogr 2010.', 'McKaigney CJ, et al. E-point septal separation: a bedside tool for emergency physician assessment of left ventricular ejection fraction. Am J Emerg Med 2014;32:493–7.', 'Barbier C, et al. Respiratory changes in inferior vena cava diameter are helpful in predicting fluid responsiveness in ventilated septic patients. Intensive Care Med 2004;30:1740–6.', 'Monnet X, Teboul JL. Passive leg raising: five rules, not a drop of fluid! Crit Care 2015;19:18.', 'Klein AL, et al. ASE recommendations for multimodality imaging of pericardial disease. J Am Soc Echocardiogr 2013;26:965–1012.'] }
  ] };

  T.echo_shock = { title: 'Echo in shock: RUSH and the pump, the tank, the pipes', kicker: 'A protocol for the undifferentiated hypotensive patient, and how each shock type looks', blocks: [
    { p: 'The RUSH exam (Rapid Ultrasound in SHock, Perera 2010) runs the probe through the pump (the heart: effusion, LV contractility, RV size), the tank (IVC, the lungs for B-lines and effusions, the abdomen for free fluid and the pleura for pneumothorax) and the pipes (the aorta for aneurysm or dissection, the femoral and popliteal veins for DVT), in a few minutes, to sort shock into cardiogenic, hypovolaemic, obstructive and distributive — and it links straight to the haemodynamics area, where the catheter numbers and the treatment live.' },
    { h: 'The pattern by shock type', table: { head: ['Shock', 'Pump', 'Tank (IVC)', 'Other findings', 'First move'], rows: [
      ['Hypovolaemic / haemorrhagic', 'Small, hyperdynamic LV (kissing walls)', 'Slit-like, > 50% collapse', 'Free fluid in the abdomen, a pleural effusion (haemothorax), an aneurysm', 'Volume and blood; find the bleeding'],
      ['Cardiogenic', 'Dilated, poorly contracting LV (or RV); EPSS wide; B-lines in the lungs', 'Plethoric', 'Regional wall motion (MI), a mechanical complication (VSD, MR), a thick valve', 'Pressure then inotrope; the shock team'],
      ['Obstructive — tamponade', 'Effusion with RA/RV collapse, swinging heart', 'Plethoric, no collapse', 'Small chambers', 'Drain'],
      ['Obstructive — massive PE', 'Dilated RV, D-septum, McConnell, small LV', 'Plethoric', 'DVT in the legs, clot in transit', 'Lysis / embolectomy; no fluid'],
      ['Obstructive — tension pneumothorax', 'Compressed, hard to see', 'Plethoric', 'Absent sliding, a lung point, no B-lines on that side', 'Decompress'],
      ['Distributive — sepsis', 'Hyperdynamic (early) or a depressed LV (septic cardiomyopathy)', 'Small or normal, collapsing early; full later', 'A source (effusion, abscess, hydronephrosis)', 'Fluid and norepinephrine; the source']] } },
    { h: 'Fluid responsiveness at the bedside', ul: ['Passive leg raise with the LVOT VTI (or the cardiac output monitor): a rise > 12% within 60–90 s predicts a response to a bolus (no fluid given, works in spontaneous breathing and arrhythmia).', 'An end-expiratory occlusion test, pulse-pressure variation (> 12% on 8 mL/kg controlled ventilation in sinus rhythm), the IVC distensibility index — each with conditions that most ICU patients fail.', 'The mini-fluid challenge (100 mL with a VTI change > 10%).', 'Static numbers (CVP, the IVC diameter alone, a PAOP) do not predict responsiveness; the lungs (B-lines appearing) tell you when to stop.'] },
    { h: 'Evidence', ul: ['Perera P, et al. The RUSH exam (Emerg Med Clin North Am 2010).', 'SHoC-ED (Atkinson 2018): point-of-care ultrasound in undifferentiated shock in the ED did not change survival, but it changed diagnoses and fluids — the exam informs, the treatment decides.', 'Lichtenstein’s FALLS protocol (fluid administration limited by lung sonography) uses the appearance of B-lines as the stop signal.', 'ANDROMEDA-SHOCK-2 (2025) built echo into its CRT-targeted algorithm after the fluid and pressor tests, with a dobutamine test for the depressed LV.'] },
    { src: ['Perera P, et al. The RUSH exam: rapid ultrasound in shock in the evaluation of the critically ill. Emerg Med Clin North Am 2010;28:29–56.', 'Atkinson PR, et al. Does point-of-care ultrasonography improve clinical outcomes in emergency department patients with undifferentiated hypotension? (SHoC-ED). Ann Emerg Med 2018;72:478–89.', 'Lichtenstein D. FALLS-protocol: lung ultrasound in hemodynamic assessment of shock. Heart Lung Vessel 2013;5:142–7.', 'Monnet X, et al. Prediction of fluid responsiveness: an update. Ann Intensive Care 2016;6:111.'] }
  ] };

  T.echo_lung = { title: 'Lung ultrasound in a page', kicker: 'A-lines, B-lines, sliding, consolidation, effusion — and the BLUE protocol', blocks: [
    { p: 'The lung is the organ ultrasound was not supposed to see, and the artefacts it makes are the signs. The pleural line slides with breathing (lung sliding); beneath a normally aerated lung the beam reverberates between the probe and the pleura as horizontal A-lines; interstitial fluid (oedema, inflammation, fibrosis) makes vertical, laser-like, pleura-to-bottom B-lines that move with sliding and erase the A-lines; consolidated lung looks like liver (tissue-like, with air bronchograms); an effusion is an anechoic space between the lung and the diaphragm with the lung flapping in it (the quad and sinusoid signs). Three or more B-lines in a space is a positive space; bilateral anterior B-lines are the B profile of pulmonary oedema.' },
    { h: 'The BLUE protocol (Lichtenstein 2008) for acute respiratory failure', table: { head: ['Profile', 'Anterior findings', 'Plus', 'Diagnosis (and accuracy)'], rows: [
      ['A profile', 'A-lines with sliding, bilateral', 'DVT on the venous scan', 'Pulmonary embolism (81% sens, 99% spec with DVT)'],
      ['A profile', 'A-lines with sliding', 'PLAPS (posterolateral alveolar/pleural syndrome)', 'Pneumonia'],
      ['A profile', 'A-lines with sliding', 'No DVT, no PLAPS', 'COPD or asthma (89% sens, 97% spec)'],
      ['B profile', 'Bilateral anterior B-lines with sliding', '—', 'Pulmonary oedema (97% sens, 95% spec)'],
      ['B′ profile', 'B-lines without sliding', '—', 'Pneumonia (ARDS, consolidation)'],
      ['A/B or C profile', 'Asymmetric B-lines, or anterior consolidation', '—', 'Pneumonia'],
      ['A′ profile', 'A-lines without sliding', 'Lung point', 'Pneumothorax (lung point 100% specific)']] } },
    { h: 'Pleural effusion and pneumothorax', ul: ['Effusion: posterolateral scan at the diaphragm; estimate the volume (lateral decubitus distance × 20 mL per mm at the base, roughly); septations and echogenicity suggest exudate or empyema; guide the drain in real time above the rib.', 'Pneumothorax: absent sliding (also absent in apnoea, mainstem intubation, pleurodesis, ARDS), absent B-lines, the lung point (the border where sliding resumes) is diagnostic; M-mode: the seashore sign (normal) versus the barcode/stratosphere sign (no sliding).', 'Guiding procedures: thoracentesis and chest drains under ultrasound halve the pneumothorax rate (BTS); mark, then insert without moving the patient.'] },
    { src: ['Lichtenstein DA, Mezière GA. Relevance of lung ultrasound in the diagnosis of acute respiratory failure: the BLUE protocol. Chest 2008;134:117–25.', 'Volpicelli G, et al. International evidence-based recommendations for point-of-care lung ultrasound. Intensive Care Med 2012;38:577–91.', 'Havelock T, et al. Pleural procedures and thoracic ultrasound: BTS pleural disease guideline. Thorax 2010;65(Suppl 2):ii61–76.'] }
  ] };

  T.echo_lab = { title: 'The scanning lab', kicker: 'A probe on a modelled chest: slide, rotate, tilt and rock until the view appears — then name what you see', blocks: [
    { p: 'A three-dimensional model of the heart in the chest — two ventricles, two atria, the valves, the aorta from root to descending, the pulmonary artery, the caval veins through the liver, the pericardium — scanned by a probe you control: choose the window, slide the footprint, rotate the marker, tilt the beam across the heart and rock it within the plane. The sector is painted as a B-mode image with speckle, the heart beats, the IVC breathes, and the labels can be switched on to name every structure. Pick a target view and the score tells you how close you are, with a hint for the movement that would get you there; pick a pathology to see what a dilated ventricle, an effusion or an empty IVC look like from every window.' },
    { widget: 'echolab' },
    { note: 'A model, not a patient: the anatomy is simplified (no coronary sinus, no pulmonary veins, no ribs or lung shadowing), the speckle is synthetic, and the probe movements are idealised. What transfers is the geometry — which way to turn, which way to tilt, what should appear where — and the labelled anatomy.' }
  ] };

  T.echo_quiz = { title: 'Name the view, name the structure', kicker: 'Unlabelled pictures from the lab: which view is this, what is this structure, what is wrong with this heart', blocks: [
    { p: 'Each round draws a view from the lab, sometimes slightly off-axis and sometimes with one of the pathologies, and asks three questions: which view, which structure is outlined, and whether the heart is normal or what is abnormal. The pictures are new every time.' },
    { widget: 'echoquiz' }
  ] };

  const GROUPS = [
    { title: 'Start', ids: ['echo_intro', 'echo_views', 'echo_anatomy'] },
    { title: 'Reading it', ids: ['echo_assess', 'echo_shock', 'echo_lung'] },
    { title: 'Practice', ids: ['echo_lab', 'echo_quiz'] }
  ];

  root.PFT_ECHO = { topics: T, groups: GROUPS, S: S, NAMES: NAMES, INTENSITY: INTENSITY, PATHOLOGY: PATHOLOGY, WINDOWS: WINDOWS, VIEWS: VIEWS, build: build, classify: classify, probe: probe, sector: sector, render: render, regions: regions, cycle: cycle, view: view, viewParams: viewParams, score: score, V: V };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PFT_ECHO;
})(typeof window !== 'undefined' ? window : globalThis);
