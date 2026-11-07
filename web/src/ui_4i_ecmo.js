/* ========================================================================== Learn: ECMO
   The circuit drawn on a patient, a gallery of cannulation configurations, the circuit lab (the model in ecmo.js with
   its dials, the console, the gas panels and the alarms) and the troubleshooting scenarios. */
const EC = window.PFT_ECMO;
/* the lab's state: the patient, the circuit, the preset note */
const ECS = { p: null, s: null, out: null, note: '', title: '', answers: {}, open: '', guide: { id: '', step: 0, chosen: [], snap: null, done: false, results: {} } };
function ecGuideClear() { ECS.guide = Object.assign({}, ECS.guide, { id: '', step: 0, chosen: [], snap: null, done: false }); }
function ecInit(mode) {
  const pr = EC.preset(mode === 'va' ? 'va_shock' : 'vv_run');
  ECS.p = pr.p; ECS.s = pr.s; ECS.note = pr.note; ECS.title = pr.title; ecGuideClear();
}
function ecLoad(id) { const pr = EC.preset(id); if (!pr) return; ECS.p = pr.p; ECS.s = pr.s; ECS.note = pr.note; ECS.title = pr.title; ecGuideClear(); }
function ecCompute() { if (!ECS.s) ecInit('vv'); ECS.p.vco2 = Math.round(ECS.p.vo2 * 0.82); ECS.out = EC.run(ECS.p, ECS.s); return ECS.out; }

/* ---- colours: blood by its saturation, from venous purple to arterial red ---- */
function ecBlood(sat) {
  const t = Math.max(0, Math.min(1, (sat - 0.35) / 0.65));
  const a = [86, 52, 120], b = [226, 46, 38];   // deoxygenated → oxygenated
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * Math.pow(t, 1.3)));
  return 'rgb(' + c.join(',') + ')';
}

/* ---- the drawing: a patient and the circuit, coloured by the model ---- */
function ecSvg(o, s, p, opts) {
  opts = opts || {};
  const vv = s.mode === 'vv', cfg = s.config;
  const W = 600, H = 560;
  const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'ec-svg', role: 'img', 'aria-label': (vv ? 'Venovenous' : 'Venoarterial') + ' ECMO circuit on a patient' });
  const Q = o ? o.flow : 4, rpm = s.rpm || 3000;
  const flowDur = (2.2 / Math.max(0.25, Q)).toFixed(2) + 's', pumpDur = (1800 / Math.max(800, rpm)).toFixed(2) + 's';
  const venCol = ecBlood(o ? (vv ? o.svo2 : o.svo2) : 0.65), preCol = ecBlood(o ? o.preSat : 0.65), postCol = ecBlood(o ? o.postSat : 0.99);
  const upCol = ecBlood(o ? (vv ? o.sao2 : o.rrSat) : 0.95), lowCol = ecBlood(o ? (vv ? o.sao2 : o.femSat) : 0.95), corCol = ecBlood(o ? (vv ? o.sao2 : o.corSat) : 0.95);
  const lungK = p ? Math.max(0, Math.min(1, (p.shunt - 0.1) / 0.7)) : 0.3;
  const lungFill = 'rgb(' + [Math.round(243 - 95 * lungK), Math.round(190 - 55 * lungK), Math.round(185 - 30 * lungK)].join(',') + ')';
  // the body
  const body = sv('g', { class: 'ec-body' });
  body.appendChild(sv('circle', { cx: 170, cy: 42, r: 26, class: 'ec-skin' }));
  body.appendChild(sv('path', { d: 'M156 66 L156 84 L184 84 L184 66 Z', class: 'ec-skin' }));
  body.appendChild(sv('path', { d: 'M110 92 C 100 92 92 100 92 112 L92 350 C 92 372 110 380 130 380 L210 380 C 230 380 248 372 248 350 L248 112 C 248 100 240 92 230 92 Z', class: 'ec-skin' }));
  body.appendChild(sv('path', { d: 'M86 98 C 70 110 60 150 60 200 L62 250 C 62 262 76 264 80 252 L88 160 Z', class: 'ec-skin' }));   // right arm (patient's right = viewer's left)
  body.appendChild(sv('path', { d: 'M254 98 C 270 110 280 150 280 200 L278 250 C 278 262 264 264 260 252 L252 160 Z', class: 'ec-skin' }));
  body.appendChild(sv('path', { d: 'M118 380 L112 540 L156 540 L164 380 Z', class: 'ec-skin' }));   // right leg
  body.appendChild(sv('path', { d: 'M176 380 L184 540 L228 540 L222 380 Z', class: 'ec-skin' }));
  svg.appendChild(body);
  // lungs
  svg.appendChild(sv('path', { d: 'M150 120 C 120 118 104 150 104 190 C 104 230 118 262 150 262 Z', class: 'ec-lung', fill: lungFill }));
  svg.appendChild(sv('path', { d: 'M190 120 C 220 118 236 150 236 190 C 236 230 222 262 190 262 Z', class: 'ec-lung', fill: lungFill }));
  if (o && !vv && o.oedema) [[122, 230], [138, 246], [202, 246], [218, 230], [128, 206]].forEach(c => svg.appendChild(sv('circle', { cx: c[0], cy: c[1], r: 6, class: 'ec-oedema' })));
  // vessels: SVC, IVC, RA/RV, PA, LV, aorta
  svg.appendChild(sv('path', { d: 'M178 84 L178 150', class: 'ec-vessel', stroke: venCol, 'stroke-width': 9 }));                 // SVC
  svg.appendChild(sv('path', { d: 'M178 210 L178 372 M178 372 L150 384 M178 372 L206 384', class: 'ec-vessel', stroke: venCol, 'stroke-width': 9 }));  // IVC and iliac veins
  const lvR = o && !vv ? 14 + 0.45 * Math.max(0, o.lvedp - 8) : 16;
  svg.appendChild(sv('ellipse', { cx: 178, cy: 180, rx: 14, ry: 30, class: 'ec-ra', fill: venCol }));                           // right atrium + ventricle
  svg.appendChild(sv('ellipse', { cx: 150, cy: 168, rx: 8, ry: 16, class: 'ec-pa', fill: venCol }));                            // pulmonary artery to the left lung
  svg.appendChild(sv('ellipse', { cx: 208, cy: 190, rx: lvR, ry: 22 + 0.4 * (lvR - 14), class: 'ec-lv', fill: o && !vv ? ecBlood(o.cn ? EC.satOf(o.nativePaO2) : 0.95) : upCol }));   // left ventricle
  // aorta: from the LV up to the arch, branches, then down the left side to the femorals
  const aortaUp = 'M208 168 C 208 140 200 118 186 112', arch = 'M186 112 C 200 100 224 100 232 118', desc = 'M232 118 C 240 150 236 250 236 330 L236 372', fem = 'M236 372 L212 386 L212 400 M236 372 L252 390';
  svg.appendChild(sv('path', { d: aortaUp, class: 'ec-vessel', stroke: corCol, 'stroke-width': 8 }));
  svg.appendChild(sv('path', { d: arch, class: 'ec-vessel', stroke: upCol, 'stroke-width': 8 }));
  svg.appendChild(sv('path', { d: 'M192 104 L186 86 L170 72 M192 104 L172 90 L120 118 L72 170', class: 'ec-vessel', stroke: upCol, 'stroke-width': 4 }));   // innominate → right carotid, right subclavian
  svg.appendChild(sv('path', { d: 'M210 100 L214 70 M222 104 L256 124 L270 170', class: 'ec-vessel', stroke: upCol, 'stroke-width': 4 }));              // left carotid, left subclavian
  svg.appendChild(sv('path', { d: desc, class: 'ec-vessel', stroke: lowCol, 'stroke-width': 8 }));
  svg.appendChild(sv('path', { d: fem, class: 'ec-vessel', stroke: lowCol, 'stroke-width': 6 }));
  svg.appendChild(sv('circle', { cx: 196, cy: 172, r: 4, fill: corCol, class: 'ec-cor' }));   // coronary ostium
  // the mixing zone on VA peripheral
  if (o && !vv && o.mixing !== null && o.mixing !== undefined) {
    const stops = [[196, 170], [192, 104], [214, 100], [232, 120], [236, 330], [236, 372]];
    const i = Math.min(stops.length - 2, Math.floor(o.mixing)), f = o.mixing - Math.floor(o.mixing);
    const x = stops[i][0] + (stops[i + 1][0] - stops[i][0]) * f, y = stops[i][1] + (stops[i + 1][1] - stops[i][1]) * f;
    const g = sv('g', { class: 'ec-mix', 'data-mix': o.mixing.toFixed(2) });
    g.appendChild(sv('path', { d: 'M' + (x - 14) + ' ' + y + ' q 4 -5 8 0 t 8 0 t 8 0 t 6 0', class: 'ec-mixline' }));
    g.appendChild(svt(x + 20, y + 4, 'mixing zone', { class: 'ec-lbl' }));
    svg.appendChild(g);
  }
  // the circuit: cannulas in the patient and the tubing outside
  const circuit = sv('g', { class: 'ec-circuit' });
  const tube = (d, col, cls, extra) => {
    circuit.appendChild(sv('path', Object.assign({ d: d, class: 'ec-tube ' + (cls || ''), stroke: col, 'stroke-width': 7 }, extra || {})));
    const f = sv('path', { d: d, class: 'ec-flow', style: 'animation-duration:' + flowDur + (o && o.flow < 0.2 ? ';animation-play-state:paused' : '') }); circuit.appendChild(f);
  };
  // drainage: femoral vein (tip near the RA) → out at the groin → down and right to the pump
  const drainIn = cfg === 'dl' ? 'M178 86 L178 152' : 'M150 384 L178 362 L178 200';
  const drainOut = cfg === 'dl' ? 'M178 86 L196 60 L330 60 L330 470 L400 470' : 'M150 384 L150 470 L400 470';
  circuit.appendChild(sv('path', { d: drainIn, class: 'ec-cannula', stroke: preCol }));
  tube(drainOut, preCol, 'ec-drain' + (o && o.pump.chatter ? ' ec-chatter' : ''), { 'data-drain': '1' });
  // the pump
  const pump = sv('g', { class: 'ec-pump', transform: 'translate(420 470)' });
  pump.appendChild(sv('circle', { r: 22, class: 'ec-pumpbody' }));
  const imp = sv('g', { class: 'ec-impeller', style: 'animation-duration:' + pumpDur + (rpm < 900 ? ';animation-play-state:paused' : '') });
  for (let k = 0; k < 6; k++) imp.appendChild(sv('path', { d: 'M0 0 Q 8 -6 16 0', transform: 'rotate(' + (k * 60) + ')', class: 'ec-vane' }));
  pump.appendChild(imp); pump.appendChild(sv('circle', { r: 3, class: 'ec-hub' }));
  circuit.appendChild(pump);
  // pump → membrane lung (inlet at the bottom), membrane → return
  tube('M442 470 L480 470 L480 330', preCol, 'ec-prepump');
  const ox = sv('g', { class: 'ec-oxy', transform: 'translate(452 220)' });
  ox.appendChild(sv('rect', { x: 0, y: 0, width: 56, height: 110, rx: 8, class: 'ec-oxybody' }));
  for (let k = 0; k < 9; k++) ox.appendChild(sv('line', { x1: 8, y1: 10 + k * 11, x2: 48, y2: 10 + k * 11, class: 'ec-fibre', opacity: (0.35 + 0.65 * (s.oxy === undefined ? 1 : s.oxy)).toFixed(2) }));
  if (s.oxy !== undefined && s.oxy < 0.7) for (let k = 0; k < Math.round((0.7 - s.oxy) * 10); k++) ox.appendChild(sv('circle', { cx: 10 + ((k * 37) % 36), cy: 14 + ((k * 23) % 86), r: 3.5, class: 'ec-clot' }));
  ox.appendChild(sv('path', { d: 'M28 -18 L28 0', class: 'ec-gas' })); ox.appendChild(sv('path', { d: 'M28 110 L28 128', class: 'ec-gas ec-gasout' }));
  circuit.appendChild(ox);
  // the return: VV to the jugular (RA) or the other femoral vein; VA to the femoral artery (retrograde), the axillary artery, or the ascending aorta
  let retOut, retIn, retLabelAt;
  if (vv) {
    if (cfg === 'fj') { retOut = 'M480 220 L480 60 L240 60 L202 72'; retIn = 'M202 72 L186 84 L178 150'; retLabelAt = [300, 54]; }
    else if (cfg === 'dl') { retOut = 'M480 220 L480 100 L330 100 L330 76 L206 76'; retIn = 'M206 76 L182 94 L178 150'; retLabelAt = [340, 94]; }
    else { retOut = 'M480 220 L480 140 L300 140 L300 500 L206 500 L206 400'; retIn = 'M206 400 L178 372 L178 212'; retLabelAt = [310, 134]; }
  } else {
    if (cfg === 'pf') { retOut = 'M480 220 L480 140 L300 140 L300 500 L252 500 L252 400'; retIn = 'M252 400 L236 372 L236 340'; retLabelAt = [310, 134]; }
    else if (cfg === 'ax') { retOut = 'M480 220 L480 100 L330 100 L330 150 L282 150'; retIn = 'M282 150 L262 128 L232 118'; retLabelAt = [340, 94]; }
    else { retOut = 'M480 220 L480 60 L260 60 L222 100'; retIn = 'M222 100 L212 116'; retLabelAt = [300, 54]; }
  }
  tube(retOut, postCol, 'ec-return', { 'data-return': '1' });
  circuit.appendChild(sv('path', { d: retIn, class: 'ec-cannula', stroke: postCol }));
  // VA extras: distal perfusion catheter, Impella, IABP, septostomy, V-AV limb
  if (!vv) {
    if (cfg === 'pf' && s.dpc) circuit.appendChild(sv('path', { d: 'M252 400 L256 470', class: 'ec-dpc', stroke: postCol }));
    if (s.unload === 'impella') circuit.appendChild(sv('path', { d: 'M232 118 C 226 150 222 170 206 186', class: 'ec-impella' }));
    if (s.unload === 'iabp') circuit.appendChild(sv('ellipse', { cx: 236, cy: 240, rx: 6, ry: 28, class: 'ec-iabp' }));
    if (s.unload === 'septostomy') circuit.appendChild(sv('path', { d: 'M192 182 L196 182', class: 'ec-sept' }));
  }
  svg.appendChild(circuit);
  // labels
  if (opts.labels !== false) {
    const L = (x, y, t, cls) => svg.appendChild(svt(x, y, t, { class: 'ec-lbl' + (cls ? ' ' + cls : '') }));
    L(392, 512, 'centrifugal pump'); L(516, 268, 'membrane'); L(516, 282, 'lung'); L(486, 196, 'sweep gas in', 'ec-small'); L(486, 362, 'exhaust', 'ec-small');
    L(cfg === 'dl' && vv ? 240 : 190, cfg === 'dl' && vv ? 48 : 488, 'drainage'); L(retLabelAt[0], retLabelAt[1], 'return');
    if (!vv && cfg === 'pf' && s.dpc) L(262, 482, 'distal perfusion', 'ec-small');
    if (!vv && s.unload === 'impella') L(150, 300, 'Impella', 'ec-small');
    if (!vv && s.unload === 'iabp') L(248, 244, 'IABP', 'ec-small');
    L(40, 160, 'right arm', 'ec-small'); L(118, 520, 'legs', 'ec-small');
  }
  // live numbers on the drawing: pressures at their sites
  if (o && opts.numbers !== false) {
    const tag = (x, y, t) => { const g = sv('g', { class: 'ec-tag' }); g.appendChild(sv('rect', { x: x, y: y - 11, width: 74, height: 15, rx: 3 })); g.appendChild(svt(x + 37, y, t, { 'text-anchor': 'middle' })); svg.appendChild(g); };
    tag(330, 456, 'P drain ' + o.pump.pDrain.toFixed(0));
    tag(516, 410, 'P pre ' + o.pump.pPre.toFixed(0));
    tag(516, 176, 'P post ' + o.pump.pPost.toFixed(0));
    tag(380, 240, 'ΔP ' + o.pump.dP.toFixed(0));
    tag(380, 300, Q.toFixed(1) + ' L/min');
    if (!vv) { tag(10, 90, 'R radial ' + Math.round(o.rrSat * 100) + '%'); tag(10, 540, 'femoral ' + Math.round(o.femSat * 100) + '%'); }
    else tag(10, 90, 'SaO2 ' + o.spo2 + '%');
    tag(10, 420, 'SvO2 ' + Math.round(o.svo2 * 100) + '%');
  }
  return svg;
}

/* ---- the circuit page: the drawing with a key ---- */
function ecmoCircuitFig() {
  const pr = EC.preset('vv_run'); const o = EC.run(pr.p, pr.s);
  const parts = [['1', 'Drainage cannula', 'in the IVC through the femoral vein; the limb to the pump is under suction'], ['2', 'Centrifugal pump', 'speed set, flow earned'], ['3', 'Membrane lung', 'blood outside the fibres, sweep gas inside; heat exchanger built in'], ['4', 'Return cannula', 'into the right atrium through the jugular (VV) or an artery (VA)'], ['5', 'Pressures', 'drainage (negative), pre-membrane, post-membrane; ΔP across the membrane'], ['6', 'Sweep and FdO2', 'from the blender into the gas side; exhaust to air']];
  const svg = ecSvg(o, pr.s, pr.p, { numbers: true });
  [[150, 455, '1'], [392, 445, '2'], [452, 208, '3'], [252, 44, '4'], [372, 470, '5'], [470, 184, '6']].forEach(n => { const g = sv('g', { class: 'ec-num' }); g.appendChild(sv('circle', { cx: n[0], cy: n[1], r: 9 })); g.appendChild(svt(n[0], n[1] + 4, n[2], { 'text-anchor': 'middle' })); svg.appendChild(g); });
  return h('figure', { class: 'an-fig ec-fig', 'data-ecmocircuit': '1' }, [
    h('div', { class: 'ec-circuit-grid' }, [svg, h('ol', { class: 'ec-key' }, parts.map(x => h('li', {}, [h('b', { text: x[1] + '. ' }), x[2]])))]),
    h('figcaption', { text: 'A femoro-jugular VV circuit on a patient with severe ARDS, drawn from the lab’s model: the blood is coloured by its saturation (purple venous, red after the membrane), the dashes move with the flow, the impeller turns with the speed. Pressures in mm Hg.' })
  ]);
}

/* ---- the configurations gallery ---- */
function ecCfgSvg(id) {
  const svg = sv('svg', { viewBox: '0 0 160 220', class: 'ec-cfg' });
  svg.appendChild(sv('circle', { cx: 80, cy: 20, r: 12, class: 'ec-skin' }));
  svg.appendChild(sv('path', { d: 'M52 40 L108 40 L112 130 L48 130 Z', class: 'ec-skin' }));
  svg.appendChild(sv('path', { d: 'M56 130 L52 210 L74 210 L78 130 Z M82 130 L86 210 L108 210 L104 130 Z', class: 'ec-skin' }));
  svg.appendChild(sv('ellipse', { cx: 80, cy: 78, rx: 12, ry: 16, class: 'ec-heartmini' }));
  svg.appendChild(sv('path', { d: 'M74 38 L74 64 M74 92 L74 130 L66 140', class: 'ec-vmini' }));          // SVC/IVC
  svg.appendChild(sv('path', { d: 'M86 62 C 86 50 96 48 100 56 L102 130 L94 140', class: 'ec-amini' }));   // aorta
  const V = '#6a4fa0', A = '#d93a2f', G = '#2f7f5e';
  const line = (d, col, dash) => svg.appendChild(sv('path', { d: d, stroke: col, class: 'ec-cfgline', 'stroke-dasharray': dash ? '4 3' : null }));
  const dot = (x, y, col) => svg.appendChild(sv('circle', { cx: x, cy: y, r: 3.5, fill: col, class: 'ec-cfgdot' }));
  if (id === 'fj') { line('M66 140 L74 128 L74 96', V); dot(66, 140, V); line('M86 40 L74 50 L74 66', A); dot(86, 40, A); }
  if (id === 'dl') { line('M86 40 L74 52 L74 126', V); line('M74 78 L80 78', A, true); dot(86, 40, V); }
  if (id === 'ff') { line('M66 140 L74 128 L74 100', V); dot(66, 140, V); line('M94 140 L80 126 L74 92', A); dot(94, 140, A); }
  if (id === 'pf') { line('M66 140 L74 128 L74 92', V); dot(66, 140, V); line('M94 140 L100 126 L102 96', A); dot(94, 140, A); line('M94 140 L96 170', A, true); }
  if (id === 'ax') { line('M66 140 L74 128 L74 92', V); dot(66, 140, V); line('M40 58 L60 56 L88 54', A); dot(40, 58, A); }
  if (id === 'ce') { line('M74 76 L74 92', V); dot(74, 76, V); line('M98 46 L96 56', A); dot(98, 46, A); }
  if (id === 'vav') { line('M66 140 L74 128 L74 92', V); dot(66, 140, V); line('M94 140 L100 126 L102 96', A); dot(94, 140, A); line('M86 40 L74 50 L74 66', A); dot(86, 40, A); }
  if (id === 'vpa') { line('M86 40 L74 52 L74 84', V); dot(86, 40, V); line('M74 70 L62 64 L56 70', G, true); }
  return svg;
}
function ecmoConfigsFig() {
  const items = [['fj', 'V-V femoro-jugular', 'Drain IVC, return RA'], ['dl', 'V-V dual-lumen', 'One jugular cannula; jet to the tricuspid'], ['ff', 'V-V femoro-femoral', 'Drain IVC, return RA from the other groin'], ['pf', 'V-A peripheral', 'Drain RA, return femoral artery + distal perfusion'], ['ax', 'V-A axillary return', 'Antegrade into the arch'], ['ce', 'V-A central', 'RA to ascending aorta'], ['vav', 'V-AV hybrid', 'Arterial and jugular return'], ['vpa', 'V-PA (oxy-RVAD)', 'RA to pulmonary artery']];
  return h('figure', { class: 'an-fig ec-fig', 'data-ecmoconfigs': '1' }, [
    h('div', { class: 'ec-cfg-grid' }, items.map(it => h('div', { class: 'ec-cfg-item', 'data-cfg': it[0] }, [ecCfgSvg(it[0]), h('b', { text: it[1] }), h('span', { class: 'fine', text: it[2] })]))),
    h('figcaption', { text: 'Purple: drainage. Red: oxygenated return. Dashed red: a distal perfusion catheter or the return jet of a dual-lumen cannula. Green dashed: pulmonary-artery return.' })
  ]);
}

/* ---- the lab ---- */
const EC_SLIDERS = {
  circuit: [
    ['rpm', 'Pump speed', 1200, 4600, 50, 'rpm', 'Speed is set; flow is what the drainage allows. Past the drainage’s ceiling more speed only sucks harder.'],
    ['sweep', 'Sweep gas', 0, 10, 0.5, 'L/min', 'The CO2 dial. Zero is the VV weaning trial; never zero on VA.'],
    ['fdo2', 'FdO2', 0.21, 1, 0.01, '', 'Oxygen fraction of the sweep gas; sets the post-membrane PO2.'],
    ['oxy', 'Membrane condition', 0, 1, 0.05, '', '1 = new; toward 0 = clotting: ΔP rises, transfer falls.'],
    ['recirc', 'Recirculation', 0, 0.6, 0.05, '', 'VV only: the fraction of the returned blood drawn straight back into the drainage.']
  ],
  patient: [
    ['hb', 'Haemoglobin', 6, 15, 0.5, 'g/dL', 'Content per litre: 1.34 mL per gram.'],
    ['vo2', 'Oxygen consumption (VO2)', 150, 450, 10, 'mL/min', 'Fever, shivering, agitation, sepsis raise it; the CO2 production follows (RQ 0.82).'],
    ['co', 'Cardiac output', 2, 12, 0.25, 'L/min', 'VV: what the heart pumps; the circuit sees only a fraction of it.'],
    ['contr', 'LV contractility', 0, 1, 0.05, '', 'VA: 1 is a normal ventricle (5 L/min unloaded), 0 is none.'],
    ['shunt', 'Native lung shunt', 0, 0.9, 0.05, '', 'Blood through the native lung that gets no oxygen.'],
    ['fio2', 'Ventilator FiO2', 0.21, 1, 0.05, '', 'What the native lung’s open alveoli breathe.'],
    ['va', 'Native alveolar ventilation', 0, 6, 0.25, 'L/min', 'Lung-rest settings give 1–2 L/min; a weaning ventilator 4–5.'],
    ['cvp', 'Venous filling (CVP)', 1, 20, 1, 'mm Hg', 'The drainage’s reservoir: empty veins collapse around the cannula.'],
    ['hco3', 'Bicarbonate', 10, 40, 1, 'mmol/L', 'The metabolic side of the pH.'],
    ['svr', 'Systemic vascular resistance', 8, 30, 1, 'mm Hg·min/L', 'VA: MAP = total flow × SVR (vasoplegia low, vasoconstriction high).']
  ]
};
function ecFmt(k, v) {
  if (k === 'fdo2' || k === 'fio2') return (+v).toFixed(2);
  if (k === 'recirc' || k === 'shunt' || k === 'oxy' || k === 'contr') return Math.round(v * 100) + '%';
  if (k === 'sweep' || k === 'co' || k === 'va') return (+v).toFixed(2).replace(/\.?0+$/, '');
  return String(v);
}
function ecSlider(group, sl) {
  const isS = group === 'circuit', src = isS ? ECS.s : ECS.p, id = uid('ec');
  const val = h('span', { class: 'odc-val', text: ecFmt(sl[0], src[sl[0]]) });
  return h('label', { class: 'odc-sl', for: id, title: sl[6], 'data-ec-row': sl[0] }, [h('span', { class: 'nod-l', text: sl[1] + (sl[5] ? ' (' + sl[5] + ')' : '') }), h('input', { type: 'range', id: id, min: sl[2], max: sl[3], step: sl[4], value: src[sl[0]], 'data-ec': sl[0], oninput: (e) => { src[sl[0]] = +e.target.value; val.textContent = ecFmt(sl[0], src[sl[0]]); ecRefresh(); } }), val]);
}
function ecControls() {
  const s = ECS.s, vv = s.mode === 'vv';
  const modeSeg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Mode' }, [['vv', 'VV'], ['va', 'VA']].map(m => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-ec-mode': m[0], 'aria-checked': String(s.mode === m[0]), text: m[1], onclick: () => { ecInit(m[0]); render(); } })));
  const cfgId = uid('ec');
  const cfgSel = h('label', { class: 'nod-f', for: cfgId }, [h('span', { class: 'nod-l', text: 'Configuration' }), h('select', { id: cfgId, 'data-ec-config': '1', onchange: (e) => { s.config = e.target.value; if (!vv) s.ret = s.config === 'pf' ? 17 : 21; if (vv && s.config === 'dl') s.recirc = Math.min(s.recirc, 0.1); render(); } }, EC.CONFIGS[s.mode].map(c => h('option', { value: c[0], selected: c[0] === s.config, text: c[1] })))]);
  const cfgNote = h('p', { class: 'fine', text: (EC.CONFIGS[s.mode].filter(c => c[0] === s.config)[0] || [])[2] || '' });
  const presetId = uid('ec');
  const presetSel = h('label', { class: 'nod-f', for: presetId }, [h('span', { class: 'nod-l', text: 'Preset' }), h('select', { id: presetId, 'data-ec-preset': '1', onchange: (e) => { if (e.target.value) { ecLoad(e.target.value); render(); } } }, [h('option', { value: '', text: '— load a situation —' })].concat(EC.PRESETS.map(pr => h('option', { value: pr.id, selected: ECS.title === pr.title, text: pr.title }))))]);
  const drainId = uid('ec'), retId = uid('ec');
  const drainSel = h('label', { class: 'nod-f', for: drainId }, [h('span', { class: 'nod-l', text: 'Drainage cannula' }), h('select', { id: drainId, 'data-ec-drain': '1', onchange: (e) => { s.drain = +e.target.value; ecRefresh(); } }, Object.keys(EC.DRAIN).map(k => h('option', { value: k, selected: +k === s.drain, text: k + ' Fr (≈ ' + EC.DRAIN[k] + ' L/min)' })))]);
  const retSizes = vv ? [19, 21, 23] : [15, 17, 19, 21];
  const retSel = h('label', { class: 'nod-f', for: retId }, [h('span', { class: 'nod-l', text: (vv ? 'Return' : 'Arterial') + ' cannula' }), h('select', { id: retId, 'data-ec-ret': '1', onchange: (e) => { s.ret = +e.target.value; ecRefresh(); } }, retSizes.map(k => h('option', { value: k, selected: k === s.ret, text: k + ' Fr' })))]);
  const kinkId = uid('ec');
  const kink = h('label', { class: 'chk-inline', for: kinkId }, [h('input', { type: 'checkbox', id: kinkId, checked: !!s.kink, 'data-ec-kink': '1', onchange: (e) => { s.kink = e.target.checked; ecRefresh(); } }), 'Drainage kinked or tip malpositioned']);
  const circuitSliders = EC_SLIDERS.circuit.filter(sl => vv || sl[0] !== 'recirc').map(sl => ecSlider('circuit', sl));
  const patientSliders = EC_SLIDERS.patient.filter(sl => (vv ? sl[0] !== 'contr' && sl[0] !== 'svr' : sl[0] !== 'co')).map(sl => ecSlider('patient', sl));
  const vaExtras = [];
  if (!vv) {
    const unId = uid('ec');
    vaExtras.push(h('label', { class: 'nod-f', for: unId }, [h('span', { class: 'nod-l', text: 'LV unloading' }), h('select', { id: unId, 'data-ec-unload': '1', onchange: (e) => { s.unload = e.target.value; ecRefresh(); } }, [['none', 'None'], ['iabp', 'IABP'], ['impella', 'Impella (ECPELLA)'], ['septostomy', 'Atrial septostomy / LA vent']].map(x => h('option', { value: x[0], selected: s.unload === x[0], text: x[1] })))]));
    const dpcId = uid('ec');
    vaExtras.push(h('label', { class: 'chk-inline', for: dpcId }, [h('input', { type: 'checkbox', id: dpcId, checked: !!s.dpc, 'data-ec-dpc': '1', onchange: (e) => { s.dpc = e.target.checked; ecRefresh(); } }), 'Distal perfusion catheter']));
  }
  return h('div', { class: 'ec-controls' }, [
    h('div', { class: 'ec-ctl-head' }, [modeSeg, presetSel]),
    h('p', { class: 'fine ec-note', 'data-ec-note': '1', text: ECS.note }),
    h('h5', { text: 'The circuit' }), h('div', { class: 'odc-ctrls' }, [cfgSel, cfgNote].concat(circuitSliders, [h('div', { class: 'nod-grid' }, [drainSel, retSel]), kink], vaExtras)),
    h('h5', { text: 'The patient' }), h('div', { class: 'odc-ctrls' }, patientSliders),
    h('button', { type: 'button', class: 'lnk', 'data-ec-reset': '1', text: 'Reset to the default ' + (vv ? 'VV' : 'VA') + ' run', onclick: () => { ecInit(s.mode); render(); } })
  ]);
}
function ecCell(label, value, unit, cls) { return h('div', { class: 'vs-cell' + (cls ? ' ' + cls : ''), 'data-ec-cell': label }, [h('span', { class: 'lbl', text: label }), h('b', { text: value }), unit ? h('span', { class: 'ec-unit', text: unit }) : null]); }
function ecConsole() {
  const o = ECS.out, s = ECS.s, pm = o.pump;
  const f0 = (x) => x.toFixed(0), f1 = (x) => x.toFixed(1);
  const al = EC.alarms(o, s);
  const tiles = [['Flow', f1(o.flow), 'L/min', pm.chatter ? 'alarm' : ''], ['Speed', f0(s.rpm), 'rpm', ''], ['Sweep', ecFmt('sweep', s.sweep), 'L/min', ''], ['FdO2', s.fdo2.toFixed(2), '', ''],
    ['P drain', f0(pm.pDrain), 'mm Hg', pm.pDrain < -100 ? 'alarm' : ''], ['P pre', f0(pm.pPre), 'mm Hg', pm.pPre > 300 ? 'alarm' : ''], ['P post', f0(pm.pPost), 'mm Hg', pm.pPost > 300 ? 'alarm' : ''], ['ΔP', f0(pm.dP), 'mm Hg', pm.dP > 60 ? 'alarm' : ''],
    ['SvO2 (drainage)', f0(o.preSat * 100), '%', o.mode === 'vv' && o.preSat > 0.75 && s.recirc > 0.2 ? 'alarm' : ''], ['O2 transfer', f0(o.transfer), 'mL/min', s.sweep > 0 && o.transfer < 100 ? 'alarm' : ''], ['Temp', '37.0', '°C', ''], [o.mode === 'vv' ? 'Qeff / CO' : 'Native output', o.mode === 'vv' ? f0(o.flowRatio * 100) + '%' : f1(o.qn) + ' L/min', '', o.mode === 'vv' && o.flowRatio < 0.55 ? 'alarm' : (o.mode === 'va' && o.distension ? 'alarm' : '')]];
  return h('div', { class: 'vent-screen ec-console', 'data-ec-console': '1' }, [
    h('div', { class: 'vsc-head' }, [h('span', { class: 'vsc-mode', text: (o.mode === 'vv' ? 'V-V ' : 'V-A ') + (EC.CONFIGS[s.mode].filter(c => c[0] === s.config)[0] || [])[1] }), h('span', { class: 'vsc-brand', text: 'ECMO console' })]),
    h('div', { class: 'vsc-alarms' + (al.length ? ' on' : ''), 'data-ec-alarms': al.length }, [h('span', { text: al.length ? '⚠ ' + al.map(a => a.t).join(' · ') : 'No alarms' })]),
    h('div', { class: 'vsc-grid ec-grid' }, tiles.map(t => h('div', { class: 'vsc-tile' + (t[3] ? ' ' + t[3] : ''), 'data-tile': t[0] }, [h('span', { class: 'vsc-k', text: t[0] }), h('b', { class: 'vsc-v', text: t[1] }), h('span', { class: 'vsc-u', text: t[2] })])))
  ]);
}
function ecGases() {
  const o = ECS.out, p = ECS.p, s = ECS.s, vv = o.mode === 'vv';
  const f0 = (x) => x.toFixed(0), pc = (x) => Math.round(x * 100) + '%';
  const pre = h('div', { class: 'vs-gas ec-gas', 'data-ec-gas': 'pre' }, [h('h5', { text: 'Drainage (pre-membrane)' }), h('div', { class: 'vs-gasgrid' }, [ecCell('PO2', f0(o.preO2), 'mm Hg'), ecCell('SO2', pc(o.preSat)), ecCell('PCO2', f0(o.preCO2), 'mm Hg')])]);
  const post = h('div', { class: 'vs-gas ec-gas', 'data-ec-gas': 'post' }, [h('h5', { text: 'Post-membrane' }), h('div', { class: 'vs-gasgrid' }, [ecCell('PO2', f0(o.postO2), 'mm Hg', s.sweep > 0 && s.fdo2 > 0.9 && o.postO2 < 200 ? 'bad' : ''), ecCell('SO2', pc(o.postSat)), ecCell('PCO2', f0(o.postCO2), 'mm Hg'), ecCell('O2 transfer', f0(o.transfer), 'mL/min'), ecCell('CO2 removed', f0(o.vco2Membrane || (o.pump ? (o.preCO2 - o.postCO2) * o.flow * 4.5 : 0)), 'mL/min')])]);
  let pt;
  if (vv) pt = h('div', { class: 'vs-gas ec-gas', 'data-ec-gas': 'pt' }, [h('h5', { text: 'Patient — arterial' }), h('div', { class: 'vs-gasgrid' }, [ecCell('PaO2', f0(o.pao2), 'mm Hg', o.pao2 < 55 ? 'bad' : ''), ecCell('SaO2', o.spo2 + '%', '', o.spo2 < 85 ? 'bad' : ''), ecCell('PaCO2', f0(o.paco2), 'mm Hg'), ecCell('pH', o.ph.toFixed(2), '', o.ph < 7.25 || o.ph > 7.55 ? 'bad' : ''), ecCell('SvO2', pc(o.svo2)), ecCell('DO2', f0(o.do2), 'mL/min'), ecCell('DO2 : VO2', o.do2vo2.toFixed(1), '', o.do2vo2 < 2.5 ? 'bad' : ''), ecCell('Lactate', o.lactate)]),
    h('p', { class: 'fine', text: 'Effective flow ' + o.qeff.toFixed(1) + ' L/min = ' + Math.round(o.flowRatio * 100) + '% of a cardiac output of ' + p.co + ' (recirculation ' + Math.round(o.recirc * 100) + '%). The membrane removes ' + f0(o.vco2Membrane) + ' mL/min of CO2 and the native lung ' + f0(o.vco2Lung) + ' of the ' + p.vco2 + ' produced.' })]);
  else pt = h('div', { class: 'vs-gas ec-gas', 'data-ec-gas': 'pt' }, [h('h5', { text: 'Patient — where the blood came from' }), h('div', { class: 'vs-gasgrid' }, [
    ecCell('Right radial PaO2', f0(o.rrO2), 'mm Hg', o.rrO2 < 60 ? 'bad' : (o.rrO2 > 300 ? 'warn' : '')), ecCell('Right radial SaO2', pc(o.rrSat), '', o.rrSat < 0.88 ? 'bad' : ''), ecCell('Right radial PaCO2', f0(o.paco2RR), 'mm Hg'), ecCell('Right radial pH', o.phRR.toFixed(2)),
    ecCell('Femoral PaO2', f0(o.femO2), 'mm Hg', o.femO2 > 300 ? 'warn' : ''), ecCell('Femoral PaCO2', f0(o.paco2Fem), 'mm Hg'), ecCell('Coronary PO2', f0(o.corO2), 'mm Hg', o.corO2 < 60 ? 'bad' : ''), ecCell('SvO2', pc(o.svo2)),
    ecCell('MAP', f0(o.map), 'mm Hg', o.map < 60 ? 'bad' : ''), ecCell('Pulse pressure', f0(o.pp), 'mm Hg', o.pp < 10 ? 'bad' : ''), ecCell('Native output', o.qn.toFixed(1) + (o.qnTot > o.qn + 0.1 ? ' + ' + (o.qnTot - o.qn).toFixed(1) + ' device' : ''), 'L/min'), ecCell('Total flow', o.qt.toFixed(1), 'L/min'),
    ecCell('LVEDP', f0(o.lvedp), 'mm Hg', o.distension ? 'bad' : (o.lvedp > 18 ? 'warn' : '')), ecCell('Aortic valve', o.avOpens ? 'opens' : 'closed', '', o.avOpens ? '' : 'bad'), ecCell('DO2 : VO2', o.do2vo2.toFixed(1), '', o.do2vo2 < 2.5 ? 'bad' : ''), ecCell('Lactate', o.lactate)]),
    h('p', { class: 'fine', text: (o.central ? 'Antegrade return: the branches share one mixture. ' : 'The mixing zone sits ' + (o.mixing < 1 ? 'at the aortic root: the whole aorta is circuit blood. ' : (o.mixing < 2 ? 'at the innominate: the coronaries get native blood, the right arm a mixture. ' : (o.mixing < 4 ? 'in the arch: head and arms native, the descending aorta circuit blood. ' : 'low in the descending aorta: nearly everything native. ')))) + (o.harlequin ? 'Differential hypoxaemia. ' : '') + (o.distension ? 'The ventricle is distended behind a closed valve' + (o.oedema ? ' and the lung is flooding' : '') + '. ' : (o.oedema ? 'Pulmonary oedema from a high left-sided filling pressure. ' : '')) + 'Limb risk ' + o.limbRisk + '.' })]);
  return h('div', { class: 'ec-gases' }, [pre, post, pt]);
}
function ecRefresh() {
  ecCompute();
  const fig = document.querySelector('[data-ecmolab]'); if (!fig) return;
  const draw = fig.querySelector('[data-ec-draw]'); if (draw) { draw.textContent = ''; draw.appendChild(ecSvg(ECS.out, ECS.s, ECS.p)); }
  const con = fig.querySelector('[data-ec-conslot]'); if (con) { con.textContent = ''; con.appendChild(ecConsole()); }
  const gas = fig.querySelector('[data-ec-gasslot]'); if (gas) { gas.textContent = ''; gas.appendChild(ecGases()); }
}
/* ---- the guided scenarios inside the lab: a presentation, the gases the model makes, the next best step — and the chosen move turns the dials ---- */
function ecGuideCase() { return EC.LABCASES.filter(c => c.id === ECS.guide.id)[0] || null; }
function ecGuideLoad(id) {
  const c = EC.LABCASES.filter(x => x.id === id)[0];
  ECS.guide = { id: id, step: 0, chosen: [], snap: null, done: false, results: ECS.guide.results || {} };
  if (!c) return;
  ECS.p = Object.assign({}, EC.PATIENT, c.p); ECS.s = Object.assign({}, EC.SETTINGS[c.mode], c.s);
  ECS.title = c.title; ECS.note = c.look;
}
function ecSnap() { return { p: Object.assign({}, ECS.p), s: Object.assign({}, ECS.s), out: ECS.out }; }
function ecGuideKeys(vv) {
  return vv ? [['Flow', (o) => o.flow.toFixed(1) + ' L/min'], ['Drainage P', (o) => o.pump.pDrain.toFixed(0)], ['ΔP', (o) => o.pump.dP.toFixed(0)], ['Pre-membrane SO2', (o) => Math.round(o.preSat * 100) + '%'], ['Post-membrane PO2', (o) => o.postO2.toFixed(0)], ['PaO2 / SpO2', (o) => o.pao2.toFixed(0) + ' / ' + o.spo2 + '%'], ['PaCO2', (o) => o.paco2.toFixed(0)], ['pH', (o) => o.ph.toFixed(2)], ['SvO2', (o) => Math.round(o.svo2 * 100) + '%'], ['Effective flow', (o) => Math.round(o.flowRatio * 100) + '% of CO'], ['Lactate', (o) => o.lactate]]
    : [['Flow', (o) => o.flow.toFixed(1) + ' L/min'], ['Drainage P', (o) => o.pump.pDrain.toFixed(0)], ['Pre-membrane SO2', (o) => Math.round(o.preSat * 100) + '%'], ['Post-membrane PO2', (o) => o.postO2.toFixed(0)], ['Right radial PaO2', (o) => o.rrO2.toFixed(0)], ['Femoral PaO2', (o) => o.femO2.toFixed(0)], ['PaCO2 (radial)', (o) => o.paco2RR.toFixed(0)], ['MAP', (o) => String(o.map)], ['Pulse pressure', (o) => String(o.pp)], ['LVEDP', (o) => String(o.lvedp)], ['Aortic valve', (o) => o.avOpens ? 'opens' : 'closed'], ['Limb', (o) => o.limbRisk + ' risk'], ['SvO2', (o) => Math.round(o.svo2 * 100) + '%'], ['Lactate', (o) => o.lactate]];
}
function ecGuideApply(c, step, op) {
  const pp = Object.assign({}, ECS.p), ss = Object.assign({}, ECS.s);
  op[4](pp, ss); ECS.p = pp; ECS.s = ss; ECS.note = op[1]; ecCompute();
}
function ecGuide() {
  const g = ECS.guide, c = ecGuideCase();
  const selId = uid('ec');
  const sel = h('label', { class: 'nod-f', for: selId }, [h('span', { class: 'nod-l', text: 'Guided scenario' }), h('select', { id: selId, 'data-ec-guide': '1', onchange: (e) => { if (e.target.value) { ecGuideLoad(e.target.value); } else { ecGuideClear(); } render(); } },
    [h('option', { value: '', text: '— free play: turn the dials yourself —' })].concat(EC.LABCASES.map(x => h('option', { value: x.id, selected: x.id === g.id, text: (g.results[x.id] ? (g.results[x.id] === 'best' ? '✓ ' : '• ') : '') + (x.mode === 'vv' ? 'VV · ' : 'VA · ') + x.title }))))]);
  const done = Object.keys(g.results).length, best = Object.keys(g.results).filter(k => g.results[k] === 'best').length;
  const score = h('p', { class: 'ec-score', 'data-ec-gscore': best + '/' + done, text: done ? done + ' of ' + EC.LABCASES.length + ' worked, ' + best + ' with every move best' : EC.LABCASES.length + ' guided scenarios: a patient, the gases the lab computes, and the next best step — your choice turns the dials' });
  if (!c) return h('div', { class: 'ec-guide', 'data-ec-guide-panel': 'free' }, [h('div', { class: 'ec-guide-head' }, [sel, score])]);
  const VERD = { best: 'Best', reasonable: 'Reasonable', poor: 'Poor', wrong: 'Wrong' };
  const vv = c.mode === 'vv';
  const kids = [h('div', { class: 'ec-guide-head' }, [sel, score]),
    h('p', { class: 'ec-who' }, [h('b', { text: c.title + '. ' }), c.who]),
    h('p', { class: 'ec-look' }, [h('b', { text: 'Read the lab: ' }), c.look])];
  // the steps already taken
  g.chosen.forEach((ch, i) => {
    const st = c.steps[i], op = st.options.filter(o => o[0] === ch.id)[0], bestOp = st.options.filter(o => o[2] === 'best')[0];
    kids.push(h('div', { class: 'ec-gstep done', 'data-ec-gstep': String(i) }, [h('p', { class: 'ec-q', text: (i + 1) + ' · ' + st.q }),
      h('div', { class: 'vs-verdict ' + op[2], 'data-ec-gverdict': op[2] }, [h('b', { text: VERD[op[2]] + ' — ' + op[1] + '. ' }), op[3], op[2] !== 'best' ? h('p', { class: 'ec-best' }, [h('b', { text: 'The best move — ' + bestOp[1] + ': ' }), bestOp[3]]) : null]),
      ch.table]));
  });
  if (g.done) {
    kids.push(h('div', { class: 'ec-gdone', 'data-ec-gdone': '1' }, [h('p', {}, [h('b', { text: 'Done. ' }), c.done]), h('div', { class: 'ec-labbtns' }, [
      h('button', { type: 'button', class: 'btn sm', 'data-ec-gnext': '1', text: 'Next scenario →', onclick: () => { const i = EC.LABCASES.indexOf(c); ecGuideLoad(EC.LABCASES[(i + 1) % EC.LABCASES.length].id); render(); } }),
      h('button', { type: 'button', class: 'lnk', 'data-ec-grestart': '1', text: 'Start this one again', onclick: () => { ecGuideLoad(c.id); render(); } }),
      h('span', { class: 'fine', text: 'The dials stay where the scenario left them: keep turning them.' })])]));
  } else {
    const st = c.steps[g.step], i = g.step;
    const rot = (EC.LABCASES.indexOf(c) + i) % st.options.length, opts = st.options.slice(rot).concat(st.options.slice(0, rot));
    const pending = g.snap;   // a move chosen but not yet resolved (not best): show its result and the way forward
    if (!pending) {
      kids.push(h('div', { class: 'ec-gstep', 'data-ec-gstep': String(i) }, [h('p', { class: 'ec-q', text: (i + 1) + ' · ' + st.q }),
        h('div', { class: 'ec-options' }, opts.map(op => h('button', { type: 'button', class: 'ec-opt', 'data-ec-gopt': op[0], onclick: () => {
          const before = ecSnap(); ecGuideApply(c, st, op);
          const after = ECS.out, keys = ecGuideKeys(vv);
          const table = h('div', { class: 'tbl-wrap' }, [h('table', { class: 'edu-tbl hm-after', 'data-ec-gafter': op[2] }, [h('thead', {}, [h('tr', {}, [h('th', { text: '' }), h('th', { text: 'Before' }), h('th', { text: 'After: ' + op[1].split(':')[0].slice(0, 48) })])]),
            h('tbody', {}, keys.map(k => { const a = k[1](before.out), b = k[1](after); return h('tr', {}, [h('th', { scope: 'row', text: k[0] }), h('td', { text: a }), h('td', { class: a !== b ? 'hm-moved' : '', text: b })]); }))])]);
          g.chosen.push({ id: op[0], table: table });
          if (op[2] === 'best') { g.step += 1; if (g.step >= c.steps.length) { g.done = true; g.results[c.id] = g.chosen.every(x => c.steps[g.chosen.indexOf(x)].options.filter(o => o[0] === x.id)[0][2] === 'best') ? 'best' : 'done'; } }
          else g.snap = before;
          render();
        } }, [h('span', { class: 'ec-opt-t', text: op[1] })])))]));
    } else {
      const bestOp = st.options.filter(o => o[2] === 'best')[0];
      kids.push(h('div', { class: 'ec-labbtns ec-gresolve' }, [
        h('button', { type: 'button', class: 'btn sm', 'data-ec-gbest': '1', text: 'Undo, apply the best move (' + bestOp[1].split(':')[0].slice(0, 40) + ') and continue →', onclick: () => {
          ECS.p = pending.p; ECS.s = pending.s; ecCompute(); const before = ecSnap(); ecGuideApply(c, st, bestOp);
          const keys = ecGuideKeys(vv), after = ECS.out;
          const table = h('div', { class: 'tbl-wrap' }, [h('table', { class: 'edu-tbl hm-after', 'data-ec-gafter': 'best' }, [h('thead', {}, [h('tr', {}, [h('th', { text: '' }), h('th', { text: 'Before' }), h('th', { text: 'After: ' + bestOp[1].split(':')[0].slice(0, 48) })])]),
            h('tbody', {}, keys.map(k => { const a = k[1](before.out), b = k[1](after); return h('tr', {}, [h('th', { scope: 'row', text: k[0] }), h('td', { text: a }), h('td', { class: a !== b ? 'hm-moved' : '', text: b })]); }))])]);
          g.chosen[g.chosen.length - 1].bestTable = table;
          g.chosen[g.chosen.length - 1].table.appendChild(h('p', { class: 'fine', text: 'And after the best move instead:' })); g.chosen[g.chosen.length - 1].table.appendChild(table);
          g.snap = null; g.step += 1; if (g.step >= c.steps.length) { g.done = true; g.results[c.id] = 'done'; }
          render();
        } }),
        h('span', { class: 'fine', text: 'The lab shows your move’s result now; the best move replaces it when you continue.' })]));
    }
  }
  return h('div', { class: 'ec-guide', 'data-ec-guide-panel': c.id }, kids);
}
function ecmoLabFig() {
  ecCompute();
  const fig = h('figure', { class: 'an-fig ec-fig ec-lab', 'data-ecmolab': '1' }, [
    ecGuide(),
    h('div', { class: 'ec-lab-grid' }, [
      ecControls(),
      h('div', { class: 'ec-draw', 'data-ec-draw': '1' }, [ecSvg(ECS.out, ECS.s, ECS.p)]),
      h('div', { class: 'ec-right' }, [h('div', { 'data-ec-conslot': '1' }, [ecConsole()]), h('div', { 'data-ec-gasslot': '1' }, [ecGases()])])
    ]),
    h('figcaption', { text: 'Blood coloured by saturation; dashes move with the flow; the impeller with the speed; a shaking drainage line is chatter; clots appear in the membrane as it fails; on VA the mixing zone is marked on the aorta and the ventricle swells with its filling pressure. Pressures in mm Hg; gases in mm Hg.' })
  ]);
  return fig;
}

/* ---- the scenarios ---- */
function ecmoCasesFig() {
  const list = EC.SCENARIOS;
  if (!ECS.open) ECS.open = list[0].id;
  const sc = list.filter(x => x.id === ECS.open)[0];
  const answered = Object.keys(ECS.answers).length, best = list.filter(x => { const a = ECS.answers[x.id]; return a && x.options.filter(op => op[0] === a)[0][2] === 'best'; }).length;
  const tabs = h('div', { class: 'seg stack ec-case-tabs', role: 'tablist', 'aria-label': 'Scenario' }, list.map((x, i) => { const a = ECS.answers[x.id]; const v = a ? x.options.filter(op => op[0] === a)[0][2] : ''; return h('button', { type: 'button', class: 'ch' + (v ? ' ec-done ' + v : ''), role: 'tab', 'data-ec-case': x.id, 'aria-selected': String(x.id === sc.id), onclick: () => { ECS.open = x.id; render(); } }, [h('span', { class: 'ec-case-n', text: String(i + 1) }), h('span', { text: x.title }), h('span', { class: 'ec-case-mode', text: x.mode.toUpperCase() })]); }));
  const VERD = { best: 'Best', reasonable: 'Reasonable', poor: 'Poor', wrong: 'Wrong' };
  const chosen = ECS.answers[sc.id];
  // show the options in a rotated order so the best is not always first
  const rot = list.indexOf(sc) % sc.options.length;
  const opts = sc.options.slice(rot).concat(sc.options.slice(0, rot));
  const optionsEl = h('div', { class: 'ec-options' }, opts.map(op => h('button', { type: 'button', class: 'ec-opt' + (chosen ? (op[0] === chosen ? ' chosen ' + op[2] : (op[2] === 'best' ? ' isbest' : ' dim')) : ''), 'data-ec-opt': op[0], 'data-verdict': chosen ? op[2] : null, disabled: !!chosen, onclick: () => { ECS.answers[sc.id] = op[0]; render(); } }, [h('span', { class: 'ec-opt-t', text: op[1] }), chosen ? h('span', { class: 'ec-opt-v', text: VERD[op[2]] }) : null])));
  const verdictEl = chosen ? (() => { const op = sc.options.filter(x => x[0] === chosen)[0]; return h('div', { class: 'vs-verdict ' + op[2], 'data-ec-verdict': op[2] }, [h('b', { text: VERD[op[2]] + '. ' }), op[3], op[2] !== 'best' ? h('p', { class: 'ec-best' }, [h('b', { text: 'The best move: ' }), sc.options.filter(x => x[2] === 'best')[0][3]]) : null]); })() : h('p', { class: 'fine', text: 'Choose one; the verdict explains the physiology.' });
  const fixEl = chosen ? h('div', { class: 'ec-fix' }, [h('h5', { text: 'The sequence' }), h('ol', { class: 'edu-ol' }, sc.fix.map(x => h('li', { text: x })))]) : null;
  const labBtns = (sc.before || sc.after) ? h('div', { class: 'ec-labbtns' }, [
    sc.before ? h('button', { type: 'button', class: 'btn sm', 'data-ec-showlab': sc.before, text: 'Show the problem in the lab →', onclick: () => { ecLoad(sc.before); setMode('learn', { topic: 'ecmo_lab' }); } }) : null,
    sc.after ? h('button', { type: 'button', class: 'btn sm', 'data-ec-showlab': sc.after, text: (sc.before ? 'and the fix →' : 'Show it in the lab →'), onclick: () => { ecLoad(sc.after); setMode('learn', { topic: 'ecmo_lab' }); } }) : null,
    sc.afterNote ? h('span', { class: 'fine', text: sc.afterNote }) : null]) : null;
  const card = h('div', { class: 'ec-case', 'data-ec-open': sc.id }, [
    h('p', { class: 'ec-who' }, [h('b', { text: sc.title + '. ' }), sc.who]),
    h('p', { class: 'ec-q', text: sc.q }), optionsEl, verdictEl, fixEl, labBtns,
    h('p', { class: 'fine ec-tags', text: 'Tags: ' + sc.tags.join(', ') })
  ]);
  return h('figure', { class: 'an-fig ec-fig', 'data-ecmocases': '1' }, [
    h('p', { class: 'ec-score', 'data-ec-score': best + '/' + answered, text: answered ? answered + ' of ' + list.length + ' answered, ' + best + ' with the best move' : list.length + ' scenarios' }),
    tabs, card,
    h('figcaption', { text: 'Verdicts: best, reasonable (right but not first, or part of the answer), poor (costly or misdirected), wrong (harmful). The sequences are the ELSO guidelines’ and the sources’; your centre’s protocol decides at the bedside.' })
  ]);
}

function ecmoWidget(kind) {
  if (kind === 'ecmocircuit') return ecmoCircuitFig();
  if (kind === 'ecmoconfigs') return ecmoConfigsFig();
  if (kind === 'ecmolab') return ecmoLabFig();
  if (kind === 'ecmocases') return ecmoCasesFig();
  return null;
}
