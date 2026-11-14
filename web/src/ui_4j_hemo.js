/* ========================================================================== Learn: haemodynamics
   The catheterised heart (a drawing with the pulmonary artery catheter and its ports), the monitor that plays each
   port's waveform with the ECG and the breath, the lab (the model in hemo.js with its sliders, treatments and the derived
   numbers), and the shock scenarios. */
const HM = window.PFT_HEMO;
const HMS = { p: null, out: null, pos: 'pa', title: '', note: '', anim: { raf: 0, t0: 0 }, canvas: null, cases: {}, open: '' };
function hmInit(id) { const pr = HM.preset(id || 'normal'); HMS.p = pr.p; HMS.title = pr.title; HMS.note = pr.note; }
function hmCompute() { if (!HMS.p) hmInit('normal'); HMS.out = HM.run(HMS.p); return HMS.out; }
const HM_POS = [['ra', 'Right atrium', 'RA'], ['rv', 'Right ventricle', 'RV'], ['pa', 'Pulmonary artery', 'PA'], ['paop', 'Wedge (PAOP)', 'PAOP'], ['art', 'Arterial line', 'Art']];
function hmPosLabel(o, pos) {
  const f0 = (x) => x.toFixed(0);
  if (pos === 'ra') return f0(o.rap);
  if (pos === 'rv') return f0(o.rvsys) + '/' + f0(o.rvedp);
  if (pos === 'pa') return f0(o.pas) + '/' + f0(o.pad) + ' (' + f0(o.mpap) + ')';
  if (pos === 'paop') return f0(o.paop) + (o.paopV - o.paop > 8 ? ' (v ' + f0(o.paopV) + ')' : '');
  return f0(o.sbp) + '/' + f0(o.dbp) + ' (' + f0(o.map) + ')';
}

/* ---- the heart with the catheter ---- */
function hmHeartSvg(o, opts) {
  opts = opts || {};
  const p = o ? o.p : HM.PATIENT;
  const svg = sv('svg', { viewBox: '0 0 520 440', class: 'hm-heart', role: 'img', 'aria-label': 'The heart with a pulmonary artery catheter through the right atrium and ventricle into the pulmonary artery' });
  const lvScale = o ? Math.sqrt(Math.max(60, o.lvedv) / 122) : 1, rvScale = o ? Math.sqrt(Math.max(60, o.rvedv) / 137) : 1;
  const pperi = p.pperi || 0;
  // pericardium (a halo that thickens with pressure or constriction)
  svg.appendChild(sv('path', { d: 'M150 90 C 60 110 40 260 120 360 C 190 430 340 430 410 360 C 480 290 470 120 370 92 C 300 72 220 72 150 90 Z', class: 'hm-peri' + (pperi > 8 ? ' tamp' : '') + (p.constrict ? ' con' : ''), style: pperi > 8 ? 'stroke-width:' + (6 + pperi / 2) + 'px' : null }));
  // great veins and arteries
  svg.appendChild(sv('path', { d: 'M150 20 L150 120', class: 'hm-vein', 'stroke-width': 22 }));                 // SVC
  svg.appendChild(sv('path', { d: 'M150 330 L150 420', class: 'hm-vein', 'stroke-width': 22 }));                // IVC
  svg.appendChild(sv('path', { d: 'M232 150 C 232 110 238 80 260 60 L260 40', class: 'hm-pa', 'stroke-width': 24 }));   // main PA up
  svg.appendChild(sv('path', { d: 'M260 60 C 230 50 190 50 130 60 M260 60 C 300 48 350 50 410 62', class: 'hm-pa', 'stroke-width': 16 }));   // right and left PA
  svg.appendChild(sv('path', { d: 'M130 60 C 110 62 96 66 84 72 M130 60 C 118 70 108 78 100 90', class: 'hm-pa', 'stroke-width': 7 }));    // right PA branches (where the tip wedges)
  svg.appendChild(sv('path', { d: 'M330 140 C 330 100 330 70 300 44 C 280 26 300 10 330 14 C 380 20 420 40 440 70', class: 'hm-aorta', 'stroke-width': 24 }));   // aorta
  svg.appendChild(sv('path', { d: 'M450 120 L395 150 M450 170 L400 172', class: 'hm-pv', 'stroke-width': 10 }));   // pulmonary veins into the LA
  // chambers
  const ra = sv('path', { d: 'M110 120 C 90 130 86 180 96 220 C 108 250 150 250 170 230 C 184 214 186 160 176 136 C 168 118 130 112 110 120 Z', class: 'hm-ch hm-ra', 'data-pos': 'ra' });
  const rv = sv('g', { transform: 'translate(150 300) scale(' + rvScale.toFixed(3) + ') translate(-150 -300)' });
  rv.appendChild(sv('path', { d: 'M96 232 C 80 280 100 340 150 368 C 200 390 240 350 236 300 C 234 270 226 240 210 232 C 190 236 150 240 96 232 Z', class: 'hm-ch hm-rv', 'data-pos': 'rv' }));
  const la = sv('path', { d: 'M330 150 C 300 150 290 190 300 220 C 314 246 370 246 390 226 C 406 206 404 164 388 150 C 372 140 348 142 330 150 Z', class: 'hm-ch hm-la', 'data-pos': 'la' });
  const lv = sv('g', { transform: 'translate(340 300) scale(' + lvScale.toFixed(3) + ') translate(-340 -300)' });
  lv.appendChild(sv('path', { d: 'M296 236 C 250 270 254 350 300 380 C 350 410 420 380 430 320 C 436 280 420 244 392 236 C 360 246 320 246 296 236 Z', class: 'hm-ch hm-lv', 'data-pos': 'art' }));
  svg.appendChild(ra); svg.appendChild(rv); svg.appendChild(la); svg.appendChild(lv);
  // septum and valves
  svg.appendChild(sv('path', { d: 'M236 236 C 256 280 258 330 250 372', class: 'hm-septum' }));
  svg.appendChild(sv('path', { d: 'M150 238 L182 230', class: 'hm-valve' + (p.tr >= 2 ? ' leak' : '') }));      // tricuspid
  svg.appendChild(sv('path', { d: 'M222 158 L244 150', class: 'hm-valve' }));                                   // pulmonary
  svg.appendChild(sv('path', { d: 'M312 236 L352 236', class: 'hm-valve' + (p.mr >= 2 ? ' leak' : '') }));      // mitral
  svg.appendChild(sv('path', { d: 'M318 146 L342 142', class: 'hm-valve' + (o && o.pp < 10 && p.ecmo > 0 ? ' shut' : '') }));   // aortic
  if (p.mr >= 2) svg.appendChild(svt(332, 228, '← MR', { class: 'hm-small warn' }));
  if (p.tr >= 2) svg.appendChild(svt(140, 254, 'TR', { class: 'hm-small warn' }));
  // the catheter: SVC → RA → tricuspid → RV → pulmonary valve → main PA → right PA → a wedge branch
  const path = 'M150 20 L150 150 C 150 190 150 220 165 234 C 185 250 200 290 190 320 C 186 335 200 330 214 300 C 228 260 232 200 232 150 C 232 110 240 80 258 62 C 240 54 200 52 150 56 C 130 58 112 64 100 80';
  const cath = sv('path', { d: path, class: 'hm-cath-shadow' }); svg.appendChild(cath);
  const live = sv('path', { d: path, class: 'hm-cath', 'data-cath': '1', pathLength: '100' }); svg.appendChild(live);
  const posLen = { ra: 34, rv: 56, pa: 78, paop: 100, art: 100 };
  const posPt = { ra: [152, 170], rv: [190, 318], pa: [234, 120], paop: [100, 80] };
  const pos = opts.pos || 'pa';
  const len = posLen[pos] || 100;
  live.setAttribute('stroke-dasharray', len + ' 100');
  const tip = posPt[pos] || posPt.pa;
  svg.appendChild(sv('circle', { cx: tip[0], cy: tip[1], r: pos === 'paop' ? 7 : 4, class: 'hm-balloon' + (pos === 'paop' ? ' up' : ''), 'data-tip': pos }));
  // the arterial line
  svg.appendChild(sv('path', { d: 'M440 70 L500 96', class: 'hm-artline' + (pos === 'art' ? ' on' : '') }));
  // IABP, Impella, ECMO
  if (p.iabp) svg.appendChild(sv('ellipse', { cx: 466, cy: 110, rx: 7, ry: 26, class: 'hm-iabp', transform: 'rotate(-55 466 110)' }));
  if (p.impella) svg.appendChild(sv('path', { d: 'M420 46 C 380 90 356 150 340 300', class: 'hm-impella' }));
  if (p.ecmo) { svg.appendChild(sv('path', { d: 'M150 400 L40 400 L40 160', class: 'hm-ecmo-drain' })); svg.appendChild(sv('path', { d: 'M40 160 L40 40 L440 40', class: 'hm-ecmo-ret' })); svg.appendChild(svt(44, 150, 'VA ECMO', { class: 'hm-small' })); }
  // labels
  const L = (x, y, t, cls) => svg.appendChild(svt(x, y, t, { class: 'hm-lbl' + (cls ? ' ' + cls : '') }));
  L(156, 16, 'SVC', 'hm-small'); L(156, 432, 'IVC', 'hm-small'); L(262, 32, 'PA', 'hm-small'); L(444, 92, 'aorta', 'hm-small');
  L(110, 172, 'RA'); L(140, 318, 'RV'); L(336, 198, 'LA'); L(350, 322, 'LV');
  if (opts.labels !== false) { L(60, 108, 'wedge', 'hm-small'); L(232, 182, 'catheter', 'hm-small'); }
  // pressure tags
  if (o && opts.tags !== false) {
    const tag = (x, y, t, k, w) => { const g = sv('g', { class: 'hm-tag' + (pos === k ? ' on' : ''), 'data-tag': k, role: 'button', tabindex: '0' }); g.appendChild(sv('rect', { x: x, y: y - 12, width: w || 86, height: 17, rx: 4 })); g.appendChild(svt(x + (w || 86) / 2, y, t, { 'text-anchor': 'middle' })); svg.appendChild(g); return g; };
    tag(8, 206, 'RA ' + hmPosLabel(o, 'ra'), 'ra', 60);
    tag(60, 388, 'RV ' + hmPosLabel(o, 'rv'), 'rv', 76);
    tag(270, 96, 'PA ' + hmPosLabel(o, 'pa'), 'pa', 104);
    tag(8, 60, 'PAOP ' + hmPosLabel(o, 'paop'), 'paop', 96);
    tag(404, 130, 'Art ' + hmPosLabel(o, 'art'), 'art', 110);
    tag(404, 214, 'LA ≈ ' + o.lap.toFixed(0), 'la', 60);
    tag(404, 350, 'LVEDP ' + o.lvedp.toFixed(0), 'lv', 86);
  }
  return svg;
}

/* ---- the monitor: ECG and the selected port's trace, sweeping ---- */
const HM_SCALES = { ra: [-5, 30], rv: [-5, 60], pa: [-5, 60], paop: [-5, 40], art: [0, 200] };
function hmScaleFor(o, pos) {
  const s = HM_SCALES[pos].slice();
  const peak = pos === 'ra' ? Math.max(o.rap + 8, 12) : pos === 'rv' ? o.rvsys + 8 : pos === 'pa' ? o.pas + 8 : pos === 'paop' ? Math.max(o.paopV + 8, 15) : o.sbp + 20;
  s[1] = Math.max(s[1] > 100 ? 120 : 20, Math.ceil(peak / 10) * 10);
  return s;
}
function hmDrawMonitor(now) {
  const cv = HMS.canvas, o = HMS.out; if (!cv || !cv.isConnected || !o) return;
  const dpr = Math.min(3, window.devicePixelRatio || 1), W = Math.max(240, cv.clientWidth || 600), H = Math.round(W * 0.42);
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0b1620'; ctx.fillRect(0, 0, W, H);
  const win = 4, left = 40, right = W - 8, pos = HMS.pos;
  const T = 60 / o.hr, breathT = 60 / (o.p.vent === 'ppv' ? 16 : 18);
  const t = (now - HMS.anim.t0) / 1000, cursorT = t % win, cx = left + (right - left) * cursorT / win;
  // ECG strip
  const eY0 = 6, eH = H * 0.22;
  ctx.strokeStyle = '#1e3140'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, eY0 + eH); ctx.lineTo(right, eY0 + eH); ctx.stroke();
  ctx.fillStyle = '#7bd389'; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('ECG  ' + o.hr + '/min', left + 4, eY0 + 11);
  const draw = (fn, y0, hgt, lo, hi, col, from, to, alpha) => {
    const Y = (v) => y0 + hgt - (v - lo) / (hi - lo) * hgt;
    ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.beginPath(); let first = true;
    for (let x = from; x <= to; x += 0.25) { const tt = (x - left) / (right - left) * win; const v = fn(tt); const y = Math.max(y0, Math.min(y0 + hgt, Y(v))); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); }
    ctx.stroke(); ctx.globalAlpha = 1;
  };
  const gap = (right - left) * 0.05;
  const ecg = (tt) => HM.trace(o, 'ecg', (tt % T) / T);
  draw(ecg, eY0, eH, -4, 12, '#7bd389', left, Math.max(left, cx - 1), 1); if (cx + gap < right) draw(ecg, eY0, eH, -4, 12, '#7bd389', cx + gap, right, 0.35);
  // the pressure trace
  const sc = hmScaleFor(o, pos), pY0 = eY0 + eH + 24, pH = H - pY0 - 14;
  const Y = (v) => pY0 + pH - (v - sc[0]) / (sc[1] - sc[0]) * pH;
  ctx.strokeStyle = '#1e3140'; ctx.lineWidth = 1;
  const step = sc[1] > 100 ? 50 : (sc[1] > 40 ? 20 : 10);
  ctx.fillStyle = '#8fa7b8'; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'right';
  for (let v = 0; v <= sc[1]; v += step) { ctx.beginPath(); ctx.moveTo(left, Y(v)); ctx.lineTo(right, Y(v)); ctx.stroke(); ctx.fillText(String(v), left - 4, Y(v) + 3); }
  const col = pos === 'art' ? '#ff6b6b' : (pos === 'pa' ? '#f2c14e' : (pos === 'paop' ? '#c9a7ff' : '#6fb7ff'));
  const name = HM_POS.filter(x => x[0] === pos)[0];
  ctx.fillStyle = col; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(name[1] + '  ' + hmPosLabel(o, pos) + ' mm Hg', left + 4, pY0 - 6);
  const para = o.p.pperi > 8 ? 0.4 : (o.p.constrict ? 0.12 : 0.07);   // the inspiratory fall of the pulse: pulsus paradoxus in tamponade
  const pres = (tt) => { if (pos === 'art') { const insp = Math.max(0, Math.sin(2 * Math.PI * ((tt % breathT) / breathT))) * (o.p.vent === 'ppv' ? -0.5 : 1); return o.dbp + (HM.trace(o, pos, (tt % T) / T) - o.dbp) * (1 - para * insp); } return HM.trace(o, pos, (tt % T) / T) + HM.breath(o.p, (tt % breathT) / breathT); };
  draw(pres, pY0, pH, sc[0], sc[1], col, left, Math.max(left, cx - 1), 1); if (cx + gap < right) draw(pres, pY0, pH, sc[0], sc[1], col, cx + gap, right, 0.35);
  // end-expiration markers (the breath's zero crossing from expiration into inspiration)
  ctx.fillStyle = '#8fa7b8'; ctx.font = '9.5px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (let k = 0; k * breathT < win; k++) { const x = left + (right - left) * (k * breathT) / win; ctx.fillRect(x, pY0 + pH - 6, 1, 6); if (k === 0) ctx.fillText('end-exp', x + 22, pY0 + pH - 8); }
  ctx.fillStyle = '#f6efd6'; ctx.fillRect(cx, 4, 1.5, H - 8);
  ctx.fillStyle = '#8fa7b8'; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillText((o.p.vent === 'ppv' ? 'ventilated, PEEP ' + o.p.peep : 'breathing spontaneously') + ' · ' + win + ' s', right, H - 3);
}
function hmFrame(now) {
  HMS.anim.raf = 0;
  const mon = document.querySelector('[data-hm-monitor]'); if (!mon || !mon.isConnected) return;
  hmDrawMonitor(now);
  HMS.anim.raf = requestAnimationFrame(hmFrame);
}
function hmMonitor() {
  const cv = h('canvas', { class: 'vsc-canvas hm-canvas', width: 600, height: 252, 'aria-label': 'Monitor: ECG and the pressure waveform at the selected port' });
  HMS.canvas = cv;
  const o = HMS.out;
  const seg = h('div', { class: 'seg hm-pos', role: 'tablist', 'aria-label': 'Catheter position' }, HM_POS.map(x => h('button', { type: 'button', class: 'ch', role: 'tab', 'data-hm-pos': x[0], 'aria-selected': String(HMS.pos === x[0]), onclick: () => { HMS.pos = x[0]; hmRefresh(); } }, [h('b', { text: x[2] }), h('span', { class: 'hm-posv', text: hmPosLabel(o, x[0]) })])));
  return h('div', { class: 'vent-screen hm-screen', 'data-hm-monitor': '1' }, [h('div', { class: 'vsc-head' }, [h('span', { class: 'vsc-mode', text: HMS.title }), h('span', { class: 'vsc-brand', text: 'Bedside monitor' })]), seg, cv]);
}

/* ---- the numbers ---- */
function hmCell(label, value, unit, cls, title) { return h('div', { class: 'vs-cell' + (cls ? ' ' + cls : ''), 'data-hm-cell': label, title: title || null }, [h('span', { class: 'lbl', text: label }), h('b', { text: value }), unit ? h('span', { class: 'ec-unit', text: unit }) : null]); }
function hmNumbers() {
  const o = HMS.out, f0 = (x) => x.toFixed(0), f1 = (x) => x.toFixed(1), f2 = (x) => x.toFixed(2);
  const bad = (k) => o.flags.some(f => f.k === k) ? 'bad' : '';
  const press = h('div', { class: 'vs-gas ec-gas', 'data-hm-gas': 'pressures' }, [h('h5', { text: 'Pressures (mm Hg)' }), h('div', { class: 'vs-gasgrid' }, [
    hmCell('RA', f0(o.rap), '', bad('rap')), hmCell('RV', f0(o.rvsys) + '/' + f0(o.rvedp)), hmCell('PA', f0(o.pas) + '/' + f0(o.pad)), hmCell('mPAP', f0(o.mpap), '', o.mpap > 20 ? 'warn' : ''),
    hmCell('PAOP', f0(o.paop), '', bad('paop')), hmCell('PAOP v wave', f0(o.paopV), '', bad('vwave')), hmCell('BP', f0(o.sbp) + '/' + f0(o.dbp)), hmCell('MAP', f0(o.map), '', bad('map'))])]);
  const flow = h('div', { class: 'vs-gas ec-gas', 'data-hm-gas': 'flow' }, [h('h5', { text: 'Flow and resistance' }), h('div', { class: 'vs-gasgrid' }, [
    hmCell('CO', f1(o.co), 'L/min'), hmCell('CI', f1(o.ci), 'L/min/m²', bad('ci')), hmCell('SV / SVI', f0(o.sv) + ' / ' + f0(o.svi), 'mL'), hmCell('HR', f0(o.hr), '/min'),
    hmCell('SVR', f0(o.svrDyn) + ' (' + f1(o.svr) + ' WU)', 'dyn·s/cm⁵', bad('svr')), hmCell('PVR', f0(o.pvrDyn) + ' (' + f1(o.pvr) + ' WU)', 'dyn·s/cm⁵', o.pvr > 2 ? 'warn' : ''), hmCell('CPO', f2(o.cpo), 'W', bad('cpo')), hmCell('Pulse pressure', f0(o.pp), 'mm Hg', bad('pp'))])]);
  const grad = h('div', { class: 'vs-gas ec-gas', 'data-hm-gas': 'gradients' }, [h('h5', { text: 'Gradients and the right heart' }), h('div', { class: 'vs-gasgrid' }, [
    hmCell('TPG', f0(o.tpg), 'mm Hg', o.tpg > 12 ? 'warn' : ''), hmCell('DPG', f0(o.dpg), 'mm Hg', bad('dpg')), hmCell('PAPi', f2(o.papi), '', bad('papi')), hmCell('RA : PAOP', f2(o.raPaop), '', bad('ratio')),
    hmCell('TAPSE', f0(o.tapse), 'mm', bad('tapse')), hmCell('TAPSE/PASP', f2(o.tapsePasp), 'mm/mm Hg', bad('coupling')), hmCell('RV : LV', f2(o.rvlv), '', bad('rvlv')), hmCell('RVEF', f0(o.rvef * 100), '%', o.rvef < 0.4 ? 'warn' : '')])]);
  const lvx = h('div', { class: 'vs-gas ec-gas', 'data-hm-gas': 'lv' }, [h('h5', { text: 'Left ventricle and oxygen' }), h('div', { class: 'vs-gasgrid' }, [
    hmCell('LVEDV / ESV', f0(o.lvedv) + ' / ' + f0(o.lvesv), 'mL'), hmCell('LVEF', f0(o.lvef * 100), '%', o.lvef < 0.4 ? 'warn' : ''), hmCell('LVOT VTI', f0(o.lvotVti), 'cm', o.lvotVti < 15 ? 'warn' : ''), hmCell('Ea / Ees', f2(o.coupling), '', o.coupling > 1.5 ? 'warn' : ''),
    hmCell('SvO2', f0(o.svo2 * 100), '%', bad('svo2')), hmCell('DO2', f0(o.do2), 'mL/min'), hmCell('DO2 : VO2', f1(o.do2vo2), '', o.do2vo2 < 2.5 ? 'bad' : ''), hmCell('Lactate', o.lactate)])]);
  const sig = h('div', { class: 'hm-sig', 'data-hm-sig': o.signature.id }, [h('h5', { text: 'Signature' }), h('p', { class: 'hm-sig-t' }, [h('b', { text: o.signature.t })]), h('p', { class: 'fine', text: o.signature.why }),
    h('p', { class: 'hm-sig-q' }, [h('span', { class: 'lbl', text: 'Forrester ' }), o.forrester.quadrant, h('span', { class: 'lbl', text: ' · ' }), o.ph]),
    o.flags.length ? h('ul', { class: 'hm-flags' }, o.flags.map(f => h('li', { 'data-hm-flag': f.k, text: f.t }))) : h('p', { class: 'fine', text: 'No threshold crossed.' })]);
  return h('div', { class: 'ec-gases' }, [press, flow, grad, lvx, sig]);
}

/* ---- the controls ---- */
const HM_SLIDERS = [
  ['heart', 'hr', 'Heart rate', 40, 160, 1, '/min', 'Output = stroke volume × rate, until diastole is too short to fill'],
  ['heart', 'lvContr', 'LV contractility', 0.1, 1.6, 0.02, '', 'The slope of the end-systolic relation (Ees); 1 is normal'],
  ['heart', 'lvStiff', 'LV diastolic stiffness', 0.5, 3, 0.1, '', 'How much pressure each millilitre of filling costs; HFpEF, ischaemia, hypertrophy'],
  ['heart', 'rvContr', 'RV contractility', 0.1, 1.6, 0.02, '', 'RV infarct, sepsis, post-cardiotomy; the trained RV of chronic PH is above 1'],
  ['heart', 'rvStiff', 'RV diastolic stiffness', 0.5, 3, 0.1, '', 'Hypertrophy, restriction'],
  ['circ', 'pms', 'Volume status (mean systemic pressure)', 1, 24, 0.5, 'mm Hg', 'What the veins hold under tone: fluids and venoconstriction raise it, bleeding and venodilators lower it'],
  ['circ', 'rvr', 'Venous resistance', 0.5, 3, 0.1, 'mm Hg·min/L', 'The resistance to venous return; vasodilation lowers it'],
  ['circ', 'svr', 'Systemic vascular resistance', 4, 36, 0.5, 'WU', 'Afterload of the LV; × 80 for dyn·s/cm⁵'],
  ['circ', 'pvr', 'Pulmonary vascular resistance', 0.3, 14, 0.1, 'WU', 'Afterload of the RV: PE, PH, hypoxia, acidosis, high lung volumes'],
  ['valve', 'mr', 'Mitral regurgitation', 0, 3, 0.5, '', 'Big v waves on the wedge; forward output falls'],
  ['valve', 'tr', 'Tricuspid regurgitation', 0, 3, 0.5, '', 'Ventricularised RA trace; thermodilution unreliable'],
  ['valve', 'pperi', 'Pericardial pressure', 0, 24, 1, 'mm Hg', 'Tamponade: the chambers fill only above it'],
  ['blood', 'hb', 'Haemoglobin', 6, 17, 0.5, 'g/dL', 'Content per litre'],
  ['blood', 'vo2', 'Oxygen consumption (VO2)', 120, 450, 10, 'mL/min', 'Fever, shivering, agitation, sepsis'],
  ['blood', 'sao2', 'Arterial saturation', 0.7, 1, 0.01, '', 'What the lungs deliver'],
  ['vent', 'peep', 'PEEP (ventilated)', 0, 20, 1, 'cm H2O', 'A third is read by the catheter; venous return falls']
];
function hmFmt(k, v) { if (k === 'sao2') return Math.round(v * 100) + '%'; if (k === 'lvContr' || k === 'rvContr' || k === 'lvStiff' || k === 'rvStiff' || k === 'rvr') return (+v).toFixed(2).replace(/0$/, ''); return String(v); }
function hmSlider(sl) {
  const p = HMS.p, id = uid('hm');
  const val = h('span', { class: 'odc-val', text: hmFmt(sl[1], p[sl[1]]) });
  return h('label', { class: 'odc-sl', for: id, title: sl[7], 'data-hm-row': sl[1] }, [h('span', { class: 'nod-l', text: sl[2] + (sl[6] ? ' (' + sl[6] + ')' : '') }), h('input', { type: 'range', id: id, min: sl[3], max: sl[4], step: sl[5], value: p[sl[1]], 'data-hm': sl[1], oninput: (e) => { p[sl[1]] = +e.target.value; val.textContent = hmFmt(sl[1], p[sl[1]]); hmRefresh(); } }), val]);
}
function hmControls() {
  const p = HMS.p;
  const presetId = uid('hm');
  const presetSel = h('label', { class: 'nod-f', for: presetId }, [h('span', { class: 'nod-l', text: 'Patient' }), h('select', { id: presetId, 'data-hm-preset': '1', onchange: (e) => { if (e.target.value) { hmInit(e.target.value); render(); } } }, [h('option', { value: '', text: '— load a patient —' })].concat(HM.PRESETS.map(pr => h('option', { value: pr.id, selected: HMS.title === pr.title, text: pr.title }))))]);
  const group = (key, title) => h('div', { class: 'odc-ctrls' }, HM_SLIDERS.filter(s => s[0] === key).map(hmSlider));
  const ventId = uid('hm'), conId = uid('hm');
  const ventSeg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Breathing' }, [['spont', 'Breathing spontaneously'], ['ppv', 'Ventilated']].map(x => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-hm-vent': x[0], 'aria-checked': String(p.vent === x[0]), text: x[1], onclick: () => { p.vent = x[0]; if (x[0] === 'ppv' && !p.peep) p.peep = 5; render(); } })));
  const constrict = h('label', { class: 'chk-inline', for: conId }, [h('input', { type: 'checkbox', id: conId, checked: !!p.constrict, 'data-hm-constrict': '1', onchange: (e) => { p.constrict = e.target.checked ? 1 : 0; hmRefresh(); } }), 'Constrictive pericardium']);
  const dev = h('div', { class: 'hm-devices' }, [['iabp', 'IABP'], ['impella', 'Impella 3 L/min'], ['ecmo', 'VA ECMO 4 L/min']].map(d => h('button', { type: 'button', class: 'btn sm' + (p[d[0]] ? ' on' : ''), 'data-hm-device': d[0], 'aria-pressed': String(!!p[d[0]]), text: d[1], onclick: () => { HMS.p = HM.apply(p, d[0]); render(); } })));
  const treat = h('div', { class: 'hm-treat' }, HM.INTERVENTIONS.filter(it => ['iabp', 'impella', 'ecmo'].indexOf(it[0]) < 0).map(it => h('button', { type: 'button', class: 'ch hm-tx', 'data-hm-tx': it[0], title: it[3], text: it[1], onclick: () => { HMS.p = HM.apply(HMS.p, it[0]); HMS.note = it[1] + ': ' + it[3]; render(); } })));
  return h('div', { class: 'ec-controls hm-controls deck' }, [
    presetSel, h('p', { class: 'fine ec-note', 'data-hm-note': '1', text: HMS.note }),
    h('h5', { text: 'Treat' }), treat, h('p', { class: 'fine', text: 'Each button applies what the drug or the device does to the sliders below; press again for another dose.' }),
    h('h5', { text: 'The heart' }), group('heart'),
    h('h5', { text: 'The circulation' }), group('circ'),
    h('h5', { text: 'Valves and pericardium' }), group('valve'), constrict,
    h('h5', { text: 'Blood and demand' }), group('blood'),
    h('h5', { text: 'Ventilation' }), ventSeg, p.vent === 'ppv' ? group('vent') : null,
    h('h5', { text: 'Devices' }), dev,
    h('button', { type: 'button', class: 'lnk', 'data-hm-reset': '1', text: 'Reset to a normal patient', onclick: () => { hmInit('normal'); render(); } })
  ]);
}
function hmRefresh() {
  hmCompute();
  const fig = document.querySelector('[data-hemolab]'); if (!fig) return;
  const heart = fig.querySelector('[data-hm-heart]'); if (heart) { heart.textContent = ''; heart.appendChild(hmHeartSvg(HMS.out, { pos: HMS.pos })); hmWireHeart(heart); }
  const mon = fig.querySelector('[data-hm-monslot]'); if (mon) { mon.textContent = ''; mon.appendChild(hmMonitor()); }
  const num = fig.querySelector('[data-hm-numslot]'); if (num) { num.textContent = ''; num.appendChild(hmNumbers()); }
}
function hmWireHeart(holder) {
  holder.querySelectorAll('[data-pos], [data-tag]').forEach(el => {
    const k = el.getAttribute('data-pos') || el.getAttribute('data-tag');
    const pos = k === 'la' || k === 'lv' ? 'paop' : k;
    if (!HM_POS.some(x => x[0] === pos)) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => { HMS.pos = pos; hmRefresh(); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); HMS.pos = pos; hmRefresh(); } });
  });
}
function hemoLabFig() {
  hmCompute();
  const heart = h('div', { class: 'hm-heartbox', 'data-hm-heart': '1' }, [hmHeartSvg(HMS.out, { pos: HMS.pos })]);
  hmWireHeart(heart);
  const fig = h('figure', { class: 'an-fig ec-fig ec-lab hm-lab', 'data-hemolab': '1' }, [
    h('div', { class: 'ec-lab-grid hm-grid' }, [
      hmControls(),
      h('div', { class: 'hm-centre' }, [heart, h('div', { 'data-hm-monslot': '1' }, [hmMonitor()]), h('p', { class: 'fine', text: 'Click a chamber, a pressure tag or a port button to move the catheter; the monitor plays that port with the ECG for timing and the breath moving the baseline — read at end-expiration.' }),
        h('div', { class: 'ec-labbtns' }, [tip(h('button', { type: 'button', class: 'btn sm', 'data-hm-tocalc': '1', text: 'Work these numbers through the hemos sheet →', onclick: () => { hcFromLab(); setMode('learn', { topic: 'hemo_calc' }); } }), 'Copies this patient’s pressures and saturations onto the calculator, and shows how far the sheet’s estimated Fick lands from the output the model really has.', 'The hemos sheet')])]),
      h('div', { class: 'ec-right', 'data-hm-numslot': '1' }, [hmNumbers()])
    ]),
    h('figcaption', { text: 'Pressures in mm Hg; flows in L/min; resistances in dyn·s/cm⁵ and Wood units. Red cells cross a threshold from the numbers page. The chambers scale with their end-diastolic volumes; a leaking valve and a shut aortic valve are marked; the pericardium thickens with its pressure.' })
  ]);
  HMS.anim.t0 = performance.now(); if (!HMS.anim.raf) HMS.anim.raf = requestAnimationFrame(hmFrame);
  return fig;
}

/* ---- the catheter page: the drawing with the normal numbers and the four traces ---- */
function hemoSwanFig() {
  const o = HM.run({});
  const svg = hmHeartSvg(o, { pos: 'pa' });
  const traces = h('div', { class: 'hm-traces' }, HM_POS.filter(x => x[0] !== 'art').map(x => {
    const W = 260, H = 110, sc = hmScaleFor(o, x[0]), T = 1;
    const s = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'hm-trace', 'data-trace': x[0] });
    const Y = (v) => H - 14 - (v - sc[0]) / (sc[1] - sc[0]) * (H - 36), X = (t) => 30 + t / 2 * (W - 36);
    [0, Math.round(sc[1] / 2), sc[1]].forEach(v => { s.appendChild(sv('line', { x1: 30, y1: Y(v), x2: W - 6, y2: Y(v), class: 'ph-grid' })); s.appendChild(svt(26, Y(v) + 3, String(v), { class: 'ph-tick', 'text-anchor': 'end' })); });
    let d = ''; for (let i = 0; i <= 200; i++) { const t = i / 100; d += (i ? ' L' : 'M') + X(t).toFixed(1) + ' ' + Y(HM.trace(o, x[0], t % T)).toFixed(1); }
    s.appendChild(sv('path', { d: d, class: 'hm-tracepath ' + x[0] }));
    let e = ''; for (let i = 0; i <= 200; i++) { const t = i / 100; e += (i ? ' L' : 'M') + X(t).toFixed(1) + ' ' + (12 - HM.trace(o, 'ecg', t % T) * 0.7).toFixed(1); }
    s.appendChild(sv('path', { d: e, class: 'hm-ecgpath' }));
    s.appendChild(svt(32, H - 3, x[1] + ' ' + hmPosLabel(o, x[0]) + ' mm Hg', { class: 'ph-tick' }));
    const mark = (t, txt, above) => { const v = HM.trace(o, x[0], t % T); s.appendChild(svt(X(t), Y(v) + (above ? -5 : 11), txt, { class: 'ph-tick hm-wave', 'text-anchor': 'middle' })); };
    if (x[0] === 'ra') { mark(0.9, 'a', true); mark(0.06, 'c', true); mark(0.18, 'x', false); mark(0.42, 'v', true); mark(0.56, 'y', false); }
    if (x[0] === 'paop') { mark(0.98, 'a', true); mark(0.26, 'x', false); mark(0.5, 'v', true); mark(0.68, 'y', false); }
    if (x[0] === 'pa') { mark(0.43, 'notch', false); mark(0.22, 'systole', true); mark(0.8, 'diastole', true); }
    if (x[0] === 'rv') { mark(0.2, 'systole', true); mark(0.95, 'EDP', true); }
    return h('figure', { class: 'hm-tracefig' }, [s]);
  }));
  return h('figure', { class: 'an-fig ec-fig', 'data-hemoswan': '1' }, [
    h('div', { class: 'hm-swan-grid' }, [svg, h('div', {}, [h('p', { class: 'fine', text: 'The route: superior vena cava → right atrium (15–20 cm from the right internal jugular) → tricuspid valve → right ventricle (30–35 cm) → pulmonary valve → main pulmonary artery (40–45 cm) → a right or left branch where the balloon wedges (45–55 cm). The normal numbers are on the tags; two cardiac cycles of each port are below, with the ECG for timing.' }), traces])]),
    h('figcaption', { text: 'RA: a wave after the P wave, c with the tricuspid closing, x descent, v wave as the atrium fills against the closed valve, y descent as it empties. RV: a systolic peak with a low early-diastolic pressure climbing to the end-diastolic. PA: the same systolic, a dicrotic notch, a diastolic that never falls to the RV’s. Wedge: an atrial trace again, delayed, lower than the PA diastolic.' })
  ]);
}

/* ---- the scenarios ---- */
function hmNumRow(o) {
  const f0 = (x) => x.toFixed(0), f1 = (x) => x.toFixed(1), f2 = (x) => x.toFixed(2);
  return { 'RA': f0(o.rap), 'PA': f0(o.pas) + '/' + f0(o.pad), 'PAOP': f0(o.paop) + (o.paopV - o.paop > 8 ? ' (v ' + f0(o.paopV) + ')' : ''), 'BP / MAP': f0(o.sbp) + '/' + f0(o.dbp) + ' (' + f0(o.map) + ')', 'HR': f0(o.hr), 'CI': f1(o.ci), 'SVR': f0(o.svrDyn), 'PVR (WU)': f1(o.pvr), 'PAPi': f1(o.papi), 'CPO': f2(o.cpo), 'SvO2': f0(o.svo2 * 100) + '%', 'TAPSE': f0(o.tapse), 'Lactate': o.lactate };
}
function hemoCasesFig() {
  const list = HM.SCENARIOS;
  if (!HMS.open) HMS.open = list[0].id;
  const sc = list.filter(x => x.id === HMS.open)[0];
  const st = HMS.cases[sc.id] || (HMS.cases[sc.id] = { a1: '', a2: '' });
  const VERD = { best: 'Best', reasonable: 'Reasonable', poor: 'Poor', wrong: 'Wrong' };
  const done = list.filter(x => HMS.cases[x.id] && HMS.cases[x.id].a2).length, best = list.filter(x => { const s = HMS.cases[x.id]; return s && s.a2 && x.a2.filter(a => a[0] === s.a2)[0][1] === 'best'; }).length;
  const tabs = h('div', { class: 'seg stack ec-case-tabs', role: 'tablist', 'aria-label': 'Case' }, list.map((x, i) => { const s = HMS.cases[x.id]; const v = s && s.a2 ? x.a2.filter(a => a[0] === s.a2)[0][1] : ''; return h('button', { type: 'button', class: 'ch' + (v ? ' ec-done ' + v : ''), role: 'tab', 'data-hm-case': x.id, 'aria-selected': String(x.id === sc.id), onclick: () => { HMS.open = x.id; render(); } }, [h('span', { class: 'ec-case-n', text: String(i + 1) }), h('span', { text: x.title })]); }));
  const pr = HM.preset(sc.preset), o0 = HM.run(pr.p);
  const rot1 = list.indexOf(sc) % sc.a1.length, opts1 = sc.a1.slice(rot1).concat(sc.a1.slice(0, rot1));
  const q1 = h('div', { class: 'hm-q' }, [h('p', { class: 'ec-q', text: '1 · ' + sc.q1 }), h('div', { class: 'ec-options' }, opts1.map(op => h('button', { type: 'button', class: 'ec-opt' + (st.a1 ? (op[0] === st.a1 ? ' chosen ' + op[2] : (op[2] === 'best' ? ' isbest' : ' dim')) : ''), 'data-hm-a1': op[0], disabled: !!st.a1, onclick: () => { st.a1 = op[0]; render(); } }, [h('span', { class: 'ec-opt-t', text: op[1] }), st.a1 ? h('span', { class: 'ec-opt-v', text: VERD[op[2]] }) : null]))),
    st.a1 ? (() => { const op = sc.a1.filter(x => x[0] === st.a1)[0]; return h('div', { class: 'vs-verdict ' + op[2], 'data-hm-v1': op[2] }, [h('b', { text: VERD[op[2]] + '. ' }), op[3]]); })() : null]);
  let reveal = null, q2 = null;
  if (st.a1) {
    const row = hmNumRow(o0);
    reveal = h('div', { class: 'hm-reveal', 'data-hm-reveal': '1' }, [h('h5', { text: 'The catheter' }), h('div', { class: 'hm-numrow' }, Object.keys(row).map(k => h('div', { class: 'vs-cell', 'data-hm-rev': k }, [h('span', { class: 'lbl', text: k }), h('b', { text: row[k] })]))), h('p', { class: 'fine' }, [h('b', { text: o0.signature.t + '. ' }), o0.forrester.quadrant + '; ' + o0.ph + '.'])]);
    const names = {}; HM.INTERVENTIONS.forEach(it => { names[it[0]] = it[1]; });
    const rot2 = (list.indexOf(sc) + 1) % sc.a2.length, opts2 = sc.a2.slice(rot2).concat(sc.a2.slice(0, rot2));
    q2 = h('div', { class: 'hm-q' }, [h('p', { class: 'ec-q', text: '2 · ' + sc.q2 }), h('div', { class: 'ec-options' }, opts2.map(op => h('button', { type: 'button', class: 'ec-opt' + (st.a2 ? (op[0] === st.a2 ? ' chosen ' + op[1] : (op[1] === 'best' ? ' isbest' : ' dim')) : ''), 'data-hm-a2': op[0], disabled: !!st.a2, onclick: () => { st.a2 = op[0]; render(); } }, [h('span', { class: 'ec-opt-t', text: names[op[0]] || op[0] }), st.a2 ? h('span', { class: 'ec-opt-v', text: VERD[op[1]] }) : null])))]);
    if (st.a2) {
      const op = sc.a2.filter(x => x[0] === st.a2)[0], bestOp = sc.a2.filter(x => x[1] === 'best')[0];
      const oMine = HM.run(HM.apply(pr.p, st.a2)), oBest = HM.run(HM.apply(pr.p, bestOp[0]));
      const r0 = hmNumRow(o0), rm = hmNumRow(oMine), rb = hmNumRow(oBest);
      const keys = ['RA', 'PA', 'PAOP', 'BP / MAP', 'HR', 'CI', 'SVR', 'PAPi', 'CPO', 'SvO2', 'Lactate'];
      q2.appendChild(h('div', { class: 'vs-verdict ' + op[1], 'data-hm-v2': op[1] }, [h('b', { text: VERD[op[1]] + '. ' }), op[2], op[1] !== 'best' ? h('p', { class: 'ec-best' }, [h('b', { text: 'The best move — ' + names[bestOp[0]] + ': ' }), bestOp[2]]) : null]));
      q2.appendChild(h('div', { class: 'tbl-wrap' }, [h('table', { class: 'edu-tbl hm-after', 'data-hm-after': '1' }, [h('thead', {}, [h('tr', {}, [h('th', { text: '' }), h('th', { text: 'Now' }), h('th', { text: 'After ' + names[st.a2] }), st.a2 !== bestOp[0] ? h('th', { text: 'After ' + names[bestOp[0]] }) : null])]),
        h('tbody', {}, keys.map(k => h('tr', {}, [h('th', { scope: 'row', text: k }), h('td', { text: r0[k] }), h('td', { class: rm[k] !== r0[k] ? 'hm-moved' : '', text: rm[k] }), st.a2 !== bestOp[0] ? h('td', { class: rb[k] !== r0[k] ? 'hm-moved' : '', text: rb[k] }) : null])))])]));
      q2.appendChild(h('p', { class: 'fine' }, [h('b', { text: 'After your move: ' }), oMine.signature.t + '. ', st.a2 !== bestOp[0] ? h('span', {}, [h('b', { text: 'After the best move: ' }), oBest.signature.t + '.']) : null]));
      q2.appendChild(h('div', { class: 'ec-labbtns' }, [h('button', { type: 'button', class: 'btn sm', 'data-hm-showlab': sc.preset, text: 'Open this patient in the Swan–Ganz lab →', onclick: () => { hmInit(sc.preset); HMS.note = sc.title + ': ' + pr.note; setMode('learn', { topic: 'hemo_lab' }); } })]));
    }
  }
  const card = h('div', { class: 'ec-case', 'data-hm-open': sc.id }, [h('p', { class: 'ec-who' }, [h('b', { text: sc.title + '. ' }), sc.who]), q1, reveal, q2]);
  return h('figure', { class: 'an-fig ec-fig', 'data-hemocases': '1' }, [
    h('p', { class: 'ec-score', 'data-hm-score': best + '/' + done, text: done ? done + ' of ' + list.length + ' worked, ' + best + ' with the best move' : list.length + ' patients' }),
    tabs, card,
    h('figcaption', { text: 'The numbers after each move are the model’s, from the same circulation as the lab: a bolus raises the mean systemic pressure, a pressor the resistance and the venous tone, an inotrope the end-systolic slope, a dilator the opposite. Verdicts follow the SCAI, AHA/ACC, ESC and ESICM guidance on the other pages.' })
  ]);
}
function hemoWidget(kind) {
  if (kind === 'hemoswan') return hemoSwanFig();
  if (kind === 'hemolab') return hemoLabFig();
  if (kind === 'hemocases') return hemoCasesFig();
  if (kind === 'hemocalc') return hemoCalcFig();
  return null;
}
