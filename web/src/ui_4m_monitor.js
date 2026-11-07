
/* ========================================================================== Bedside monitoring (v8.2)
   Five labs on the models in monitor.js: the arterial line and its fluid column, capnography, the CVP trace, ICP, and a pulse-contour screen. */
const MON = window.PFT_MONITOR;
const MNS = { art: { fault: 'stiffshort', zeta: 0.62, fn: 28, custom: false, reveal: false, flush: false, quiz: null, hr: 80, sbp: 120, dbp: 70 }, capno: { shape: 'normal', quiz: null }, cvp: { shape: 'normal', vent: true, quiz: null }, icp: { shape: 'normal', map: 85, quiz: null }, screen: { open: null, answers: {}, test: null } };
/* a scrolling monitor trace: fn(t) → value; drawn every ~60 ms while the canvas is connected */
function monTrace(cv, fns, opts) {
  opts = opts || {};
  const W = cv.width, H = cv.height, win = opts.window || 6, ctx = cv.getContext('2d');
  const state = { t0: performance.now(), timer: 0 };
  const draw = () => {
    if (!cv.isConnected) { if (state.started) return; } else state.started = true;
    const now = (performance.now() - state.t0) / 1000;
    ctx.fillStyle = '#0b1620'; ctx.fillRect(0, 0, W, H);
    const lanes = fns.length, lh = H / lanes;
    fns.forEach((f, li) => {
      const y0 = li * lh, lo = f.range[0], hi = f.range[1];
      // grid
      ctx.strokeStyle = '#17303f'; ctx.lineWidth = 1; ctx.beginPath();
      for (let s = 0; s <= win; s++) { const x = s / win * W; ctx.moveTo(x, y0); ctx.lineTo(x, y0 + lh); }
      ctx.stroke();
      if (f.ticks) { ctx.fillStyle = '#6f8798'; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left'; f.ticks.forEach(v => { const y = y0 + lh - (v - lo) / (hi - lo) * (lh - 8) - 4; ctx.fillText(String(v), 3, y + 3); ctx.fillRect(0, y, 4, 1); }); }
      // the trace: the sweep position is now mod win; draw from the left edge up to the sweep, then the older part after a gap
      const sweep = (now % win) / win * W, gap = 14;
      ctx.strokeStyle = f.color || '#ff6b6b'; ctx.lineWidth = f.width || 1.6; ctx.beginPath();
      let started = false;
      for (let x = 0; x < W; x++) {
        if (x > sweep && x < sweep + gap) { started = false; continue; }
        const tAt = now - ((sweep - x + (x > sweep ? W : 0)) / W) * win;
        if (tAt < 0) { started = false; continue; }
        const v = f.fn(tAt); const y = y0 + lh - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * (lh - 8) - 4;
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (f.label) { ctx.fillStyle = f.color || '#ff6b6b'; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(f.label, W - 6, y0 + 13); }
    });
    if (opts.after) opts.after(ctx, now);
    state.timer = setTimeout(draw, 60);
  };
  draw();
  cv.monStop = () => clearTimeout(state.timer);
  return state;
}
function monTile(k, v, u, cls) { return h('div', { class: 'vsc-tile' + (cls ? ' ' + cls : ''), 'data-ms-tile': k }, [h('span', { class: 'vsc-k', text: k }), h('span', { class: 'vsc-v', text: v }), h('span', { class: 'vsc-u', text: u || '' })]); }
function monShapeTabs(shapes, cur, attr, onpick) { return h('div', { class: 'seg stack mon-shapes', role: 'tablist' }, Object.keys(shapes).map(k => h('button', { type: 'button', class: 'ch', role: 'tab', [attr]: k, 'aria-selected': String(k === cur), text: shapes[k].label, onclick: () => onpick(k) }))); }
/* a generic "name the pattern" quiz over a dictionary of shapes */
function monQuiz(st, shapes, attr, prefix, onpick) {
  const keys = Object.keys(shapes);
  if (!st.quiz) return h('button', { type: 'button', class: 'btn sm', ['data-' + prefix + '-quiz']: '1', text: 'Quiz: name the pattern', onclick: () => { st.quiz = { n: 0, score: 0 }; monQuizNext(st, shapes); onpick(st.quiz.target, true); } });
  const q = st.quiz;
  const opts = q.options.map(k => h('button', { type: 'button', class: 'ec-opt' + (q.chosen ? (k === q.chosen ? ' chosen ' + (k === q.target ? 'best' : 'wrong') : (k === q.target ? ' isbest' : ' dim')) : ''), ['data-' + prefix + '-opt']: k, disabled: !!q.chosen, onclick: () => { q.chosen = k; if (k === q.target) q.score++; render(); } }, [h('span', { class: 'ec-opt-t', text: shapes[k].label })]));
  return h('div', { class: 'an-drill on mon-quiz', ['data-' + prefix + '-q']: q.chosen ? (q.chosen === q.target ? 'right' : 'wrong') : 'on' }, [
    h('p', {}, [h('b', { text: 'Which pattern is this? ' }), h('span', { class: 'fine', text: 'Question ' + q.n + ' · score ' + q.score })]),
    h('div', { class: 'ec-options' }, opts),
    q.chosen ? h('div', { class: 'vs-verdict ' + (q.chosen === q.target ? 'best' : 'wrong'), ['data-' + prefix + '-verdict']: '1' }, [h('b', { text: q.chosen === q.target ? 'Right. ' : 'No — this is ' + shapes[q.target].label.toLowerCase() + '. ' }), shapes[q.target].note]) : null,
    h('div', { class: 'an-drill-acts' }, [h('button', { type: 'button', class: 'btn sm', ['data-' + prefix + '-next']: '1', text: q.chosen ? 'Next' : 'Skip', onclick: () => { monQuizNext(st, shapes); onpick(st.quiz.target, true); } }), h('button', { type: 'button', class: 'btn sm quiet', ['data-' + prefix + '-stop']: '1', text: 'Stop the quiz', onclick: () => { st.quiz = null; render(); } })])
  ]);
}
function monQuizNext(st, shapes) {
  const keys = Object.keys(shapes), q = st.quiz; let t; do { t = keys[Math.floor(Math.random() * keys.length)]; } while (keys.length > 1 && t === q.last);
  const pool = keys.filter(k => k !== t).sort(() => Math.random() - 0.5).slice(0, 3).concat([t]).sort(() => Math.random() - 0.5);
  q.target = t; q.last = t; q.options = pool; q.chosen = null; q.n++;
}

/* ---- 1. the arterial line ---- */
function monArtFig() {
  const st = MNS.art, f = MON.ART_FAULTS[st.fault];
  const zeta = st.custom ? st.zeta : f.zeta, fn = st.custom ? st.fn : f.fn;
  const p = { sbp: st.sbp, dbp: st.dbp, hr: st.hr, zeta: zeta, fn: fn };
  const sig = MON.artMeasured(p, { dur: 8, flushAt: st.flush ? 3.2 : undefined, flushDur: 0.5 });
  const meas = MON.artStats(sig, 0.5, 3.0), verdict = MON.artVerdict(zeta, fn), fa = MON.flushAnalysis(zeta, fn);
  const cv = h('canvas', { class: 'vsc-canvas mon-cv', width: 720, height: 240, 'aria-label': 'Arterial pressure trace' });
  const trueFn = (t) => MON.artTrue(t, p);
  const lanes = [{ fn: (t) => { const i = Math.round((t % 8) / sig.dt); return sig.y[Math.min(sig.y.length - 1, i)]; }, range: [0, st.flush ? 320 : 180], color: '#ff6b6b', label: 'ABP', ticks: st.flush ? [0, 100, 200, 300] : [0, 50, 100, 150] }];
  if (st.reveal) lanes.push({ fn: trueFn, range: [0, 180], color: '#7bd389', label: 'True (aortic root)', ticks: [0, 50, 100, 150] });
  requestAnimationFrame(() => { if (cv.isConnected) monTrace(cv, lanes, { window: 8 }); });
  const screen = h('div', { class: 'vent-screen mon-screen' }, [h('div', { class: 'vsc-head' }, [h('span', { class: 'vsc-mode', text: 'Radial arterial line · ' + (st.flush ? 'fast-flush test running' : 'continuous') }), h('span', { class: 'vsc-brand', text: 'PulmCrit Daddy monitor' })]),
    cv, h('div', { class: 'vsc-grid mon-tiles' }, [monTile('ABP', Math.round(meas.sbp) + '/' + Math.round(meas.dbp), 'mmHg · as displayed', verdict !== 'optimal' ? 'alarm' : ''), monTile('MAP', String(Math.round(meas.map)), 'mmHg'), monTile('HR', String(st.hr), '/min'), monTile('True', st.reveal ? st.sbp + '/' + st.dbp + ' (' + Math.round(st.dbp + (st.sbp - st.dbp) / 3) + ')' : '— — / — —', st.reveal ? 'aortic root' : 'hidden')])]);
  const faults = h('div', { class: 'seg stack', role: 'radiogroup', 'aria-label': 'The state of the line' }, Object.keys(MON.ART_FAULTS).map(k => h('button', { type: 'button', class: 'ch', role: 'radio', 'data-ma-fault': k, 'aria-checked': String(!st.custom && st.fault === k), text: MON.ART_FAULTS[k].label, onclick: () => { st.fault = k; st.custom = false; st.flush = false; st.zeta = MON.ART_FAULTS[k].zeta; st.fn = MON.ART_FAULTS[k].fn; render(); } })));
  const sl = (key, label, min, max, step, unit) => { const id = uid('ma'); const val = h('span', { class: 'odc-val', text: st[key] + unit }); return h('label', { class: 'odc-sl', for: id }, [h('span', { class: 'nod-l', text: label }), h('input', { type: 'range', id: id, min: min, max: max, step: step, value: st[key], ['data-ma-' + key]: '1', oninput: (e) => { st[key] = +e.target.value; if (key === 'zeta' || key === 'fn') st.custom = true; val.textContent = st[key] + unit; render(); } }), val]); };
  const analysis = h('div', { class: 'mon-analysis', 'data-ma-verdict': verdict }, [
    h('p', {}, [h('b', { text: { optimal: 'Optimal dynamics. ', underdamped: 'Underdamped. ', overdamped: 'Overdamped. ' }[verdict] }), { optimal: 'Natural frequency ' + fn + ' Hz, damping coefficient ' + zeta + ': the trace reproduces the pressure; one or two oscillations after a flush, then it settles.', underdamped: 'Damping coefficient ' + zeta + ' at ' + fn + ' Hz: the system rings. Systolic reads ' + (meas.sbp - st.sbp > 0 ? '+' : '') + Math.round(meas.sbp - st.sbp) + ' mmHg above the truth, the trace is spiky, the mean is right. Shorten the tubing, remove stopcocks, consider a damping device.', overdamped: 'Damping coefficient ' + zeta + ' at ' + fn + ' Hz: the trace is slurred, the dicrotic notch is gone, systolic reads ' + Math.abs(Math.round(meas.sbp - st.sbp)) + ' mmHg low and diastolic ' + Math.abs(Math.round(meas.dbp - st.dbp)) + ' high; the mean is nearly right. Look for air, clot, kinks, a loose connection, a soft pressure bag.' }[verdict]]),
    h('p', { class: 'fine', text: 'After a fast flush expect ' + (fa.oscillations === 0 ? 'no oscillation at all — the trace creeps back (overdamped).' : fa.oscillations + ' visible oscillation' + (fa.oscillations > 1 ? 's' : '') + ' at about ' + fa.damped.toFixed(0) + ' Hz, each ' + Math.round(fa.ratio * 100) + '% of the one before' + (fa.oscillations >= 4 ? ' — ringing (underdamped).' : ' (optimal is 1–2 oscillations with a ratio near 30%).')) })]);
  const ctrls = h('div', { class: 'odc-ctrls' }, [h('div', { class: 'ec-labbtns' }, [
      h('button', { type: 'button', class: 'btn sm', 'data-ma-flush': '1', text: st.flush ? 'Stop the flush test' : 'Fast-flush test', onclick: () => { st.flush = !st.flush; render(); } }),
      h('button', { type: 'button', class: 'btn sm quiet', 'data-ma-reveal': '1', text: st.reveal ? 'Hide the true pressure' : 'Reveal the true pressure', onclick: () => { st.reveal = !st.reveal; render(); } })]),
    sl('zeta', 'Damping coefficient ζ (build your own)', 0.05, 2, 0.05, ''), sl('fn', 'Natural frequency fn', 3, 40, 1, ' Hz'), sl('hr', 'Heart rate', 40, 160, 5, ' /min')]);
  const quiz = monArtQuiz();
  return h('figure', { class: 'an-fig ec-fig mon-lab', 'data-monart': '1' }, [
    h('div', { class: 'mon-grid' }, [h('div', { class: 'mon-left' }, [screen, analysis]), h('div', { class: 'ec-right' }, [h('h5', { text: 'The state of the line' }), faults, ctrls, quiz])]),
    h('figcaption', { text: 'A true aortic-root pressure (120/70 at 80/min here) passed through a catheter–tubing–transducer system modelled as a second-order oscillator with the natural frequency and damping of the fault you choose. The displayed numbers are what the monitor would show; reveal the truth to see the error. Run the fast-flush test and count the oscillations.' })]);
}
function monArtQuiz() {
  const st = MNS.art;
  if (!st.quiz) return h('button', { type: 'button', class: 'btn sm', 'data-ma-quiz': '1', text: 'Quiz: diagnose the line', onclick: () => { st.quiz = { n: 0, score: 0 }; monArtQuizNext(); } });
  const q = st.quiz, V = { optimal: 'Optimal', underdamped: 'Underdamped (ringing)', overdamped: 'Overdamped (slurred)' };
  return h('div', { class: 'an-drill on mon-quiz', 'data-ma-q': q.chosen ? (q.chosen === q.truth ? 'right' : 'wrong') : 'on' }, [
    h('p', {}, [h('b', { text: 'Look at the trace (run the flush test if you like): what are its dynamics? ' }), h('span', { class: 'fine', text: 'Question ' + q.n + ' · score ' + q.score })]),
    h('div', { class: 'ec-options' }, ['optimal', 'underdamped', 'overdamped'].map(k => h('button', { type: 'button', class: 'ec-opt' + (q.chosen ? (k === q.chosen ? ' chosen ' + (k === q.truth ? 'best' : 'wrong') : (k === q.truth ? ' isbest' : ' dim')) : ''), 'data-ma-ans': k, disabled: !!q.chosen, onclick: () => { q.chosen = k; if (k === q.truth) q.score++; st.reveal = true; render(); } }, [h('span', { class: 'ec-opt-t', text: V[k] })]))),
    q.chosen ? h('div', { class: 'vs-verdict ' + (q.chosen === q.truth ? 'best' : 'wrong'), 'data-ma-result': '1' }, [h('b', { text: (q.chosen === q.truth ? 'Right: ' : 'No — ') + V[q.truth].toLowerCase() + '. ' }), 'The line was: ' + MON.ART_FAULTS[st.fault].label.toLowerCase() + '.']) : null,
    h('div', { class: 'an-drill-acts' }, [h('button', { type: 'button', class: 'btn sm', 'data-ma-next': '1', text: q.chosen ? 'Next' : 'Skip', onclick: monArtQuizNext }), h('button', { type: 'button', class: 'btn sm quiet', 'data-ma-stop': '1', text: 'Stop the quiz', onclick: () => { st.quiz = null; render(); } })])]);
}
function monArtQuizNext() {
  const st = MNS.art, keys = Object.keys(MON.ART_FAULTS); let k; do { k = keys[Math.floor(Math.random() * keys.length)]; } while (keys.length > 1 && k === st.quiz.last);
  st.fault = k; st.custom = false; st.reveal = false; st.flush = false; st.zeta = MON.ART_FAULTS[k].zeta; st.fn = MON.ART_FAULTS[k].fn; st.quiz.last = k; st.quiz.truth = MON.artVerdict(MON.ART_FAULTS[k].zeta, MON.ART_FAULTS[k].fn); st.quiz.chosen = null; st.quiz.n++;
  render();
}

/* ---- 2. capnography ---- */
function monCapnoFig() {
  const st = MNS.capno, s = MON.CAPNO_SHAPES[st.shape];
  const cv = h('canvas', { class: 'vsc-canvas mon-cv', width: 720, height: 220, 'aria-label': 'Capnogram' });
  requestAnimationFrame(() => { if (cv.isConnected) monTrace(cv, [{ fn: (t) => MON.capno(t, s), range: [0, 60], color: '#ffd166', label: 'CO2 mmHg', ticks: [0, 20, 40, 60] }], { window: 14 }); });
  const et = s.stopAt !== undefined ? 0 : s.rampTo ? s.rampTo : s.dropTo !== undefined ? s.dropTo : s.riseTo !== undefined ? s.riseTo : s.et;
  const screen = h('div', { class: 'vent-screen mon-screen' }, [h('div', { class: 'vsc-head' }, [h('span', { class: 'vsc-mode', text: 'Capnography · sidestream' }), h('span', { class: 'vsc-brand', text: 'PulmCrit Daddy monitor' })]), cv,
    h('div', { class: 'vsc-grid mon-tiles' }, [monTile('EtCO2', st.quiz && !st.quiz.chosen ? '—' : String(Math.round(et)), 'mmHg', et < 10 || et > 55 ? 'alarm' : ''), monTile('RR', String(s.rr), '/min'), monTile('FiCO2', String(s.base || 0), 'mmHg', s.base ? 'alarm' : ''), monTile('I:E', '1:2', '')])]);
  const tabs = st.quiz && !st.quiz.chosen ? null : monShapeTabs(MON.CAPNO_SHAPES, st.shape, 'data-mc-shape', (k) => { st.shape = k; render(); });
  const note = st.quiz && !st.quiz.chosen ? null : h('div', { class: 'mon-analysis', 'data-mc-note': st.shape }, [h('p', {}, [h('b', { text: s.label + '. ' }), s.note])]);
  const quiz = monQuiz(st, MON.CAPNO_SHAPES, 'data-mc-opt', 'mc', (k) => { st.shape = k; render(); });
  return h('figure', { class: 'an-fig ec-fig mon-lab', 'data-moncapno': '1' }, [
    h('div', { class: 'mon-grid' }, [h('div', { class: 'mon-left' }, [screen, note]), h('div', { class: 'ec-right' }, [tabs, quiz])]),
    h('figcaption', { text: 'A time capnogram drawn from a model of the breath: phase I (the dead-space baseline), II (the upstroke), III (the alveolar plateau, EtCO2 at its end) and the inspiratory fall. Pick a pattern to see it, or let the quiz choose one and name it.' })]);
}

/* ---- 3. the CVP trace ---- */
function monCvpFig() {
  const st = MNS.cvp, s = MON.CVP_SHAPES[st.shape];
  const cv = h('canvas', { class: 'vsc-canvas mon-cv', width: 720, height: 260, 'aria-label': 'ECG and central venous pressure' });
  const hr = 75, T0 = 60 / hr;
  requestAnimationFrame(() => { if (cv.isConnected) monTrace(cv, [
    { fn: (t) => { const k = Math.floor(t / T0); let ph = t / T0 - k; if (s.irregular) { const j = ((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1; const T1 = T0 * (0.7 + 0.6 * j); ph = ((t - k * T0) / T1) % 1; } return s.irregular && ph < 0.06 ? 0 : MON.ecgAt(ph); }, range: [-0.5, 1.3], color: '#7bd389', label: 'ECG', width: 1.3 },
    { fn: (t) => MON.cvp(t, s, { hr: hr, vent: st.vent }), range: [-2, 26], color: '#59a9ff', label: 'CVP mmHg', ticks: [0, 10, 20] }], { window: 5 }); });
  const screen = h('div', { class: 'vent-screen mon-screen' }, [h('div', { class: 'vsc-head' }, [h('span', { class: 'vsc-mode', text: 'Central venous pressure · ' + (st.vent ? 'positive-pressure ventilation' : 'spontaneous breathing') }), h('span', { class: 'vsc-brand', text: 'PulmCrit Daddy monitor' })]), cv,
    h('div', { class: 'vsc-grid mon-tiles' }, [monTile('CVP', st.quiz && !st.quiz.chosen ? '—' : String(Math.round(s.base)), 'mmHg at end-expiration', s.base >= 15 ? 'alarm' : ''), monTile('HR', String(hr), '/min'), monTile('a wave', st.quiz && !st.quiz.chosen ? '—' : (s.irregular ? 'absent' : s.cannon ? 'cannon' : s.a >= 8 ? 'tall' : 'normal'), ''), monTile('y descent', st.quiz && !st.quiz.chosen ? '—' : (Math.abs(s.y) < 1 ? 'absent' : Math.abs(s.y) >= 5 ? 'steep' : 'normal'), '')])]);
  const tabs = st.quiz && !st.quiz.chosen ? null : monShapeTabs(MON.CVP_SHAPES, st.shape, 'data-mv-shape', (k) => { st.shape = k; render(); });
  const ventId = uid('mv');
  const vent = h('label', { class: 'chk-inline', for: ventId }, [h('input', { type: 'checkbox', id: ventId, checked: st.vent, 'data-mv-vent': '1', onchange: (e) => { st.vent = e.target.checked; render(); } }), 'Positive-pressure ventilation']);
  const note = st.quiz && !st.quiz.chosen ? null : h('div', { class: 'mon-analysis', 'data-mv-note': st.shape }, [h('p', {}, [h('b', { text: s.label + '. ' }), s.note])]);
  const quiz = monQuiz(st, MON.CVP_SHAPES, 'data-mv-opt', 'mv', (k) => { st.shape = k; render(); });
  return h('figure', { class: 'an-fig ec-fig mon-lab', 'data-moncvp': '1' }, [
    h('div', { class: 'mon-grid' }, [h('div', { class: 'mon-left' }, [screen, note]), h('div', { class: 'ec-right' }, [tabs, vent, quiz])]),
    h('figcaption', { text: 'The ECG above the venous trace: a follows the P wave, c the QRS, v the T wave; x and y are the descents. The respiratory swing is drawn for a ventilated patient (up with the breath) or a spontaneous one (down with the breath); constriction reverses it (Kussmaul).' })]);
}

/* ---- 4. intracranial pressure ---- */
function monIcpFig() {
  const st = MNS.icp, s = MON.ICP_SHAPES[st.shape];
  const cv = h('canvas', { class: 'vsc-canvas mon-cv', width: 720, height: 200, 'aria-label': 'Intracranial pressure waveform' });
  const tr = h('canvas', { class: 'vsc-canvas mon-cv mon-trend', width: 720, height: 120, 'aria-label': 'ICP trend over 30 minutes' });
  requestAnimationFrame(() => { if (cv.isConnected) monTrace(cv, [{ fn: (t) => MON.icp(t, s), range: [0, s.mean > 35 ? 70 : 40], color: '#c9a3ff', label: 'ICP mmHg', ticks: s.mean > 35 ? [0, 20, 40, 60] : [0, 10, 20, 30] }], { window: 4 }); });
  requestAnimationFrame(() => { if (!tr.isConnected) return; const ctx = tr.getContext('2d'), W = tr.width, H = tr.height; ctx.fillStyle = '#0b1620'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#17303f'; ctx.beginPath(); for (let m = 0; m <= 30; m += 5) { ctx.moveTo(m / 30 * W, 0); ctx.lineTo(m / 30 * W, H); } ctx.stroke(); ctx.fillStyle = '#6f8798'; ctx.font = '10px system-ui, sans-serif'; [0, 20, 40, 60].forEach(v => { const y = H - v / 80 * (H - 8) - 4; ctx.fillText(String(v), 3, y + 3); }); ctx.strokeStyle = '#c9a3ff'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let x = 0; x < W; x++) { const m = x / W * 30, v = MON.icpTrend(m, s) + (s.damped ? 0 : 0); const y = H - Math.max(0, Math.min(80, v)) / 80 * (H - 8) - 4; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); ctx.fillStyle = '#c9a3ff'; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('30-minute trend', W - 6, 13); ctx.strokeStyle = '#d04a3f'; ctx.setLineDash([4, 4]); ctx.beginPath(); const y22 = H - 22 / 80 * (H - 8) - 4; ctx.moveTo(0, y22); ctx.lineTo(W, y22); ctx.stroke(); ctx.setLineDash([]); });
  const cpp = st.map - s.mean;
  const screen = h('div', { class: 'vent-screen mon-screen' }, [h('div', { class: 'vsc-head' }, [h('span', { class: 'vsc-mode', text: 'Intracranial pressure · ' + (s.damped ? 'check the system' : 'intraparenchymal / closed EVD') }), h('span', { class: 'vsc-brand', text: 'PulmCrit Daddy monitor' })]), cv, tr,
    h('div', { class: 'vsc-grid mon-tiles' }, [monTile('ICP', st.quiz && !st.quiz.chosen ? '—' : String(Math.round(s.mean)), 'mmHg', s.mean > 22 ? 'alarm' : ''), monTile('MAP', String(st.map), 'mmHg'), monTile('CPP', st.quiz && !st.quiz.chosen ? '—' : String(Math.round(cpp)), 'MAP − ICP', cpp < 60 ? 'alarm' : ''), monTile('P2 : P1', st.quiz && !st.quiz.chosen ? '—' : (s.p1 ? (s.p2 / s.p1).toFixed(1) : '—'), s.p1 && s.p2 > s.p1 ? 'compliance lost' : '')])]);
  const tabs = st.quiz && !st.quiz.chosen ? null : monShapeTabs(MON.ICP_SHAPES, st.shape, 'data-mi-shape', (k) => { st.shape = k; render(); });
  const mapId = uid('mi'); const mapVal = h('span', { class: 'odc-val', text: st.map + ' mmHg' });
  const mapSl = h('label', { class: 'odc-sl', for: mapId }, [h('span', { class: 'nod-l', text: 'Mean arterial pressure (at the tragus)' }), h('input', { type: 'range', id: mapId, min: 50, max: 130, step: 1, value: st.map, 'data-mi-map': '1', oninput: (e) => { st.map = +e.target.value; mapVal.textContent = st.map + ' mmHg'; const t = document.querySelector('[data-ms-tile="CPP"] .vsc-v'); if (t) t.textContent = String(Math.round(st.map - s.mean)); const tm = document.querySelector('[data-ms-tile="MAP"] .vsc-v'); if (tm) tm.textContent = String(st.map); } }), mapVal]);
  const note = st.quiz && !st.quiz.chosen ? null : h('div', { class: 'mon-analysis', 'data-mi-note': st.shape }, [h('p', {}, [h('b', { text: s.label + '. ' }), s.note])]);
  const quiz = monQuiz(st, MON.ICP_SHAPES, 'data-mi-opt', 'mi', (k) => { st.shape = k; render(); });
  return h('figure', { class: 'an-fig ec-fig mon-lab', 'data-monicp': '1' }, [
    h('div', { class: 'mon-grid' }, [h('div', { class: 'mon-left' }, [screen, note]), h('div', { class: 'ec-right' }, [tabs, mapSl, quiz])]),
    h('figcaption', { text: 'The beat-to-beat waveform (P1 percussion, P2 tidal, P3 dicrotic) above a 30-minute trend with the 22 mmHg treatment line; the CPP tile follows the MAP slider. Pick a pattern, or let the quiz choose one.' })]);
}

/* ---- 5. the haemodynamic screen ---- */
function monScreenFig() {
  const st = MNS.screen, list = MON.PC_SCENARIOS;
  if (!st.open) st.open = list[0].id;
  const sc = list.filter(x => x.id === st.open)[0];
  const VERD = { best: 'Best', reasonable: 'Reasonable', poor: 'Poor', wrong: 'Wrong' };
  const answered = Object.keys(st.answers).length, best = list.filter(x => { const a = st.answers[x.id]; return a && x.opts.filter(o => o[0] === a)[0][2] === 'best'; }).length;
  const m = MON.pcModel(sc, {}), probs = MON.pcValidity(sc), valid = probs.length === 0;
  const tabs = h('div', { class: 'seg stack ec-case-tabs', role: 'tablist', 'aria-label': 'Scenario' }, list.map((x, i) => { const a = st.answers[x.id]; const v = a ? x.opts.filter(o => o[0] === a)[0][2] : ''; return h('button', { type: 'button', class: 'ch' + (v ? ' ec-done ' + v : ''), role: 'tab', 'data-ms-case': x.id, 'aria-selected': String(x.id === sc.id), onclick: () => { st.open = x.id; st.test = null; render(); } }, [h('span', { class: 'ec-case-n', text: String(i + 1) }), h('span', { text: x.title })]); }));
  // the arterial trace with the respiratory variation the scenario implies
  const cv = h('canvas', { class: 'vsc-canvas mon-cv', width: 720, height: 170, 'aria-label': 'Arterial pressure with respiratory variation' });
  const pp = Math.max(25, Math.round(m.sv * 0.55)), sbp = Math.round(m.map + pp * 0.6), dbp = sbp - pp;
  const ap = { sbp: sbp, dbp: dbp, hr: sc.hr, ppv: sc.rhythm === 'af' ? 0 : m.svv * 1.1, rr: sc.vt < 8 ? 28 : 16 };
  const irregular = sc.rhythm === 'af';
  requestAnimationFrame(() => { if (cv.isConnected) monTrace(cv, [{ fn: (t) => { if (!irregular) return MON.artTrue(t, ap); const T0 = 60 / sc.hr; const k = Math.floor(t / T0); const j = ((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1; const T1 = T0 * (0.6 + 0.8 * j); const ph = ((t - k * T0) / T1) % 1; const ppk = pp * (0.7 + 0.6 * j); return dbp + ppk * (ph < 0.08 ? 1 - Math.pow(1 - ph / 0.08, 2.4) : ph < 0.42 ? 1 - 0.55 * Math.pow((ph - 0.08) / 0.34, 1.3) : 0.45 * Math.exp(-2.5 * (ph - 0.42) / 0.58)); }, range: [20, 140], color: '#ff6b6b', label: 'ABP', ticks: [50, 100] }], { window: 8 }); });
  const tileCls = (k) => ({ SVV: !valid ? 'alarm' : '', HPI: m.hpi >= 85 ? 'alarm' : '', MAP: m.map < 65 ? 'alarm' : '' }[k] || '');
  const tiles = h('div', { class: 'vsc-grid mon-tiles mon-tiles-4' }, [
    monTile('CI', m.shownCi.toFixed(1), 'L/min/m²'), monTile('SV', String(Math.round(m.shownSv)), 'mL'), monTile('SVV', String(Math.round(m.svv)) + '%', valid ? 'conditions met' : 'see conditions', tileCls('SVV')), monTile('MAP', String(Math.round(m.map)), 'mmHg', tileCls('MAP')),
    monTile('HR', String(sc.hr), sc.rhythm === 'af' ? 'AF' : 'sinus'), monTile('SVR', String(Math.round(m.svr)), 'dyn·s/cm⁵'), monTile('Ea dyn', m.eadyn.toFixed(1), 'PPV/SVV'), monTile('HPI', String(m.hpi), 'hypotension index', tileCls('HPI'))]);
  const screen = h('div', { class: 'vent-screen mon-screen', 'data-ms-valid': String(valid) }, [h('div', { class: 'vsc-head' }, [h('span', { class: 'vsc-mode', text: 'Pulse-contour monitor · radial sensor · 20 s average' }), h('span', { class: 'vsc-brand', text: 'PulmCrit Daddy monitor' })]), cv, tiles,
    h('div', { class: 'vsc-alarms' + (valid ? '' : ' on'), 'data-ms-cond': '1', text: valid ? 'Dynamic indices: sinus rhythm, controlled ventilation ' + sc.vt + ' mL/kg, no spontaneous effort, closed chest — conditions met' : 'Dynamic indices not interpretable: ' + probs.join('; ') })]);
  const chosen = st.answers[sc.id];
  const rot = list.indexOf(sc) % sc.opts.length, opts = sc.opts.slice(rot).concat(sc.opts.slice(0, rot));
  const optionsEl = h('div', { class: 'ec-options' }, opts.map(op => h('button', { type: 'button', class: 'ec-opt' + (chosen ? (op[0] === chosen ? ' chosen ' + op[2] : (op[2] === 'best' ? ' isbest' : ' dim')) : ''), 'data-ms-opt': op[0], disabled: !!chosen, onclick: () => { st.answers[sc.id] = op[0]; render(); } }, [h('span', { class: 'ec-opt-t', text: op[1] }), chosen ? h('span', { class: 'ec-opt-v', text: VERD[op[2]] }) : null])));
  const verdictEl = chosen ? (() => { const op = sc.opts.filter(x => x[0] === chosen)[0], bestOp = sc.opts.filter(x => x[2] === 'best')[0]; return h('div', { class: 'vs-verdict ' + op[2], 'data-ms-verdict': op[2] }, [h('b', { text: VERD[op[2]] + '. ' }), op[3], op[2] !== 'best' ? h('p', { class: 'ec-best' }, [h('b', { text: 'The best move: ' }), bestOp[1] + ' — ' + bestOp[3]]) : null]); })() : null;
  const tests = h('div', { class: 'ec-labbtns' }, [['plr', 'Passive leg raise'], ['bolus', '500 mL bolus'], ['vtc', 'Tidal-volume challenge']].map(t => h('button', { type: 'button', class: 'btn sm' + (st.test === t[0] ? ' primary' : ''), 'data-ms-test': t[0], text: t[1], onclick: () => { st.test = t[0]; render(); } })));
  const res = st.test ? MON.pcTest(sc, st.test) : null;
  const resultEl = res ? h('div', { class: 'vs-verdict ' + ((res.dSV !== undefined && res.dSV >= 10) || (res.dSVV !== undefined && res.dSVV >= 3.5) ? 'best' : 'reasonable'), 'data-ms-result': st.test }, [h('b', { text: 'The test: ' }), res.text]) : null;
  const card = h('div', { class: 'ec-case', 'data-ms-open': sc.id }, [h('p', { class: 'ec-who' }, [h('b', { text: sc.title + '. ' }), sc.who]), h('p', { class: 'ec-q', text: sc.q }), h('p', { class: 'fine', text: 'Run a test first if you want to:' }), tests, resultEl, optionsEl, verdictEl]);
  return h('figure', { class: 'an-fig ec-fig mon-lab', 'data-monscreen': '1' }, [
    h('p', { class: 'ec-score', 'data-ms-score': best + '/' + answered, text: answered ? answered + ' of ' + list.length + ' answered, ' + best + ' with the best move' : list.length + ' scenarios' }),
    tabs, h('div', { class: 'mon-grid' }, [h('div', { class: 'mon-left' }, [screen]), h('div', { class: 'ec-right' }, [card])]),
    h('figcaption', { text: 'The screen is drawn from a small model: a Starling curve, a vascular tone the uncalibrated device assumes constant, an SVV that needs a regular rhythm, a controlled breath of 8 mL/kg and no effort. The alarm bar lists the conditions that are not met. The tests move the patient along the curve and show the real change in stroke volume.' })]);
}
function monWidget(kind) {
  if (kind === 'mon_art') return monArtFig();
  if (kind === 'mon_capno') return monCapnoFig();
  if (kind === 'mon_cvp') return monCvpFig();
  if (kind === 'mon_icp') return monIcpFig();
  if (kind === 'mon_screen') return monScreenFig();
  return null;
}
