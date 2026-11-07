/* ========================================================================== Learn: ICU infusions
   The drug reference cards, the dose ↔ rate calculator with its pump and titration ladder, and the bedside scenarios. */
const DR = window.PFT_DRIPS;
const DRS = { open: {}, calc: { drug: 'norepi', conc: 0, kg: 80, dose: null, custom: null }, vis: { norepi: 0.3, epi: 0, phenyl: 0, dopa: 0, vaso: 0.03, angio: 0 }, cases: {}, caseOpen: '' };

/* ---- the reference cards ---- */
function drDoseStrip(d) {
  const f = (x) => typeof x === 'number' ? String(x) : x;
  const cells = [['Start', f(d.dose.start) + ' ' + d.unit], ['Titrate', d.dose.step ? '± ' + f(d.dose.step) + ' every ' + d.dose.interval : (d.dose.interval || 'fixed')], ['Usual', d.dose.usual + (d.dose.usual.indexOf(d.unit) < 0 && /\d$/.test(d.dose.usual) ? ' ' + d.unit : '')], ['Max', f(d.dose.max) + ' ' + d.unit]];
  return h('div', { class: 'dr-dose' }, cells.map(c => h('div', { class: 'vs-cell', 'data-dr-cell': c[0] }, [h('span', { class: 'lbl', text: c[0] }), h('b', { text: c[1] })])));
}
function drCard(d, open) {
  const key = d.id;
  const isOpen = DRS.open[key] === undefined ? !!open : DRS.open[key];
  const list = (title, items, cls) => items && items.length ? h('div', { class: 'dr-sec' + (cls ? ' ' + cls : '') }, [h('h5', { text: title }), h('ul', { class: 'edu-ul' }, items.map(t => h('li', { text: t })))]) : null;
  const body = !isOpen ? null : h('div', { class: 'dr-body' }, [
    drDoseStrip(d),
    h('p', { class: 'fine dr-ceiling' }, [h('b', { text: 'Ceiling and notes: ' }), d.dose.ceiling]),
    d.dose.bolus ? h('p', { class: 'fine' }, [h('b', { text: 'Bolus: ' }), d.dose.bolus]) : null,
    h('p', { class: 'fine' }, [h('b', { text: 'Onset / half-life: ' }), d.onset, ' · ', h('b', { text: 'Concentrations: ' }), d.conc.map(c => c[0]).join('; ')]),
    h('div', { class: 'dr-grid' }, [list('Indications', d.ind, 'ind'), list('Monitor', d.mon, 'mon'), list('Contraindications', d.contra, 'contra'), list('Limitations', d.limits, 'lim')]),
    d.trials && d.trials.length ? h('div', { class: 'dr-sec dr-trials' }, [h('h5', { text: 'The evidence' }), h('ul', { class: 'edu-ul' }, d.trials.map(t => h('li', {}, [h('b', { text: t[0] + ' (' + t[1] + '). ' }), t[2]])))]) : null,
    h('div', { class: 'ec-labbtns' }, [h('button', { type: 'button', class: 'btn sm', 'data-dr-calc': d.id, text: 'Open in the calculator →', onclick: () => { DRS.calc.drug = d.id; DRS.calc.conc = 0; DRS.calc.dose = null; DRS.calc.custom = null; setMode('learn', { topic: 'drips_calc' }); } })])
  ]);
  return h('article', { class: 'dr-card' + (isOpen ? ' open' : ''), 'data-dr-card': d.id }, [
    h('button', { type: 'button', class: 'dr-head', 'aria-expanded': String(isOpen), 'data-dr-toggle': d.id, onclick: () => { DRS.open[key] = !isOpen; render(); } }, [
      h('span', { class: 'dr-name', text: d.name }), h('span', { class: 'dr-rec', text: d.rec }),
      h('span', { class: 'dr-sum', text: d.dose.usual + ' ' + d.unit + (d.dose.max ? ' · max ' + d.dose.max : '') }),
      h('span', { class: 'dr-chev', 'aria-hidden': 'true', text: isOpen ? '−' : '+' })]),
    body]);
}
function dripRefFig(cls) {
  const drugs = DR.DRUGS.filter(d => d.cls === cls);
  const title = (DR.CLASSES.filter(c => c[0] === cls)[0] || [])[1] || '';
  return h('figure', { class: 'an-fig dr-fig', 'data-dripref': cls }, [
    h('div', { class: 'dr-tools' }, [h('span', { class: 'fine', text: drugs.length + ' drugs · tap a name to open it' }), h('button', { type: 'button', class: 'lnk', 'data-dr-all': '1', text: 'Open all', onclick: () => { drugs.forEach(d => { DRS.open[d.id] = true; }); render(); } }), h('button', { type: 'button', class: 'lnk', 'data-dr-none': '1', text: 'Close all', onclick: () => { drugs.forEach(d => { DRS.open[d.id] = false; }); render(); } })]),
    h('div', { class: 'dr-cards' }, drugs.map((d, i) => drCard(d, i === 0))),
    h('figcaption', { text: title + ': the usual adult infusion ranges; pump libraries and concentrations differ between hospitals — the numbers here are the common ones, your protocol governs.' })
  ]);
}

/* ---- the calculator ---- */
function drFmt(x, dp) { if (!isFinite(x)) return '—'; const a = Math.abs(x); const d = dp !== undefined ? dp : (a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3); return x.toFixed(d).replace(/\.?0+$/, ''); }
function drConc(d) { const c = DRS.calc; if (c.custom !== null && c.custom > 0) return c.custom; return d.conc[Math.min(c.conc, d.conc.length - 1)][1]; }
function drLadder(d, kg, conc) {
  const steps = [];
  let dose = d.dose.start; const max = d.dose.max, step = d.dose.step;
  if (!step) return [{ dose: dose, rate: DR.rateFor(dose, d.unit, kg, conc) }];
  for (let i = 0; i < 200 && dose <= max + 1e-9; i++) { steps.push({ dose: dose, rate: DR.rateFor(dose, d.unit, kg, conc), n: i }); dose = +(dose + step).toFixed(4); }
  if (steps[steps.length - 1].dose < max) steps.push({ dose: max, rate: DR.rateFor(max, d.unit, kg, conc), n: steps.length });
  if (steps.length > 13) { const every = Math.ceil((steps.length - 2) / 11); const kept = steps.filter((x, i) => i === 0 || i === steps.length - 1 || i % every === 0); return kept; }
  return steps;
}
function drPump(d, dose, rate, conc, kg) {
  const u = DR.unitInfo(d.unit);
  return h('div', { class: 'vent-screen dr-pump', 'data-dr-pump': '1' }, [
    h('div', { class: 'vsc-head' }, [h('span', { class: 'vsc-mode', text: d.name.toUpperCase() }), h('span', { class: 'vsc-brand', text: 'Infusion pump' })]),
    h('div', { class: 'dr-pump-grid' }, [
      h('div', { class: 'dr-pump-big' }, [h('span', { class: 'lbl', text: 'RATE' }), h('b', { 'data-dr-rate': '1', text: drFmt(rate, rate >= 10 ? 1 : 2) }), h('span', { class: 'unit', text: 'mL/h' })]),
      h('div', { class: 'dr-pump-big' }, [h('span', { class: 'lbl', text: 'DOSE' }), h('b', { 'data-dr-dose': '1', text: drFmt(dose) }), h('span', { class: 'unit', text: d.unit })]),
      h('div', { class: 'dr-pump-small' }, [h('span', { class: 'lbl', text: 'CONC' }), h('b', { text: drFmt(conc) + ' ' + u.base + '/mL' })]),
      h('div', { class: 'dr-pump-small' }, [h('span', { class: 'lbl', text: 'WEIGHT' }), h('b', { text: u.wb ? kg + ' kg' : '—' })]),
      h('div', { class: 'dr-pump-small' }, [h('span', { class: 'lbl', text: 'VTBI / 24 h' }), h('b', { text: drFmt(rate * 24, 0) + ' mL' })]),
      h('div', { class: 'dr-pump-small' + (dose > d.dose.max ? ' alarm' : '') }, [h('span', { class: 'lbl', text: 'LIMIT' }), h('b', { text: dose > d.dose.max ? 'ABOVE MAX ' + d.dose.max : 'within ' + d.dose.max + ' ' + d.unit })])
    ])
  ]);
}
function dripCalcFig() {
  const c = DRS.calc, d = DR.drug(c.drug) || DR.DRUGS[0];
  const u = DR.unitInfo(d.unit), conc = drConc(d), kg = c.kg;
  if (c.dose === null) c.dose = d.dose.start;
  const rate = DR.rateFor(c.dose, d.unit, kg, conc);
  const idDrug = uid('dr'), idConc = uid('dr'), idKg = uid('dr'), idDose = uid('dr'), idRate = uid('dr'), idCustom = uid('dr');
  const drugSel = h('label', { class: 'nod-f', for: idDrug }, [h('span', { class: 'nod-l', text: 'Drug' }), h('select', { id: idDrug, 'data-dr-drug': '1', onchange: (e) => { c.drug = e.target.value; c.conc = 0; c.custom = null; c.dose = null; render(); } },
    DR.CLASSES.map(cl => h('optgroup', { label: cl[1] }, DR.DRUGS.filter(x => x.cls === cl[0]).map(x => h('option', { value: x.id, selected: x.id === d.id, text: x.name + ' (' + x.unit + ')' })))))]);
  const concSel = h('label', { class: 'nod-f', for: idConc }, [h('span', { class: 'nod-l', text: 'Bag' }), h('select', { id: idConc, 'data-dr-conc': '1', onchange: (e) => { c.conc = +e.target.value; c.custom = null; render(); } }, d.conc.map((x, i) => h('option', { value: String(i), selected: i === c.conc && c.custom === null, text: x[0] + ' = ' + drFmt(x[1]) + ' ' + u.base + '/mL' })))]);
  const custom = h('label', { class: 'nod-f', for: idCustom }, [h('span', { class: 'nod-l', text: 'or concentration (' + u.base + '/mL)' }), h('input', { type: 'number', id: idCustom, step: 'any', min: 0, 'data-dr-custom': '1', value: c.custom !== null ? c.custom : '', placeholder: String(conc), onchange: (e) => { c.custom = e.target.value === '' ? null : +e.target.value; render(); } })]);
  const kgIn = h('label', { class: 'nod-f', for: idKg }, [h('span', { class: 'nod-l', text: 'Weight (kg)' + (u.wb ? '' : ' — not used for this drug') }), h('input', { type: 'number', id: idKg, min: 20, max: 300, step: 1, value: kg, 'data-dr-kg': '1', disabled: !u.wb, onchange: (e) => { c.kg = Math.max(20, Math.min(300, +e.target.value || 80)); render(); } })]);
  const doseIn = h('label', { class: 'nod-f', for: idDose }, [h('span', { class: 'nod-l', text: 'Dose (' + d.unit + ')' }), h('input', { type: 'number', id: idDose, step: 'any', min: 0, value: drFmt(c.dose), 'data-dr-dosein': '1', onchange: (e) => { c.dose = Math.max(0, +e.target.value || 0); render(); } })]);
  const rateIn = h('label', { class: 'nod-f', for: idRate }, [h('span', { class: 'nod-l', text: 'Rate (mL/h)' }), h('input', { type: 'number', id: idRate, step: 'any', min: 0, value: drFmt(rate, rate >= 10 ? 1 : 2), 'data-dr-ratein': '1', onchange: (e) => { c.dose = DR.doseFor(Math.max(0, +e.target.value || 0), d.unit, kg, conc); render(); } })]);
  const ladder = drLadder(d, kg, conc);
  const ladderEl = h('div', { class: 'tbl-wrap' }, [h('table', { class: 'edu-tbl dr-ladder', 'data-dr-ladder': String(ladder.length) }, [h('thead', {}, [h('tr', {}, [h('th', { text: 'Step' }), h('th', { text: 'Dose (' + d.unit + ')' }), h('th', { text: 'mL/h' }), h('th', { text: 'Reached by' })])]),
    h('tbody', {}, ladder.map((s, i) => h('tr', { class: (i === 0 ? c.dose <= s.dose : (c.dose > ladder[i - 1].dose && c.dose <= s.dose)) ? 'dr-now' : '' }, [h('th', { scope: 'row', text: i === 0 ? 'start' : (i === ladder.length - 1 && s.dose >= d.dose.max ? 'max' : 'step ' + s.n) }), h('td', { text: drFmt(s.dose) }), h('td', { text: drFmt(s.rate, s.rate >= 10 ? 1 : 2) }), h('td', { text: i === 0 ? '—' : (d.dose.step ? s.n + ' × ' + d.dose.interval : '') })])))])]);
  const formula = u.wb ? drFmt(c.dose) + ' × ' + kg + ' kg' + (u.perMin ? ' × 60 min' : '') + ' ÷ ' + drFmt(conc) + ' ' + u.base + '/mL = ' + drFmt(rate, 2) + ' mL/h' : drFmt(c.dose) + (u.perMin ? ' × 60 min' : '') + ' ÷ ' + drFmt(conc) + ' ' + u.base + '/mL = ' + drFmt(rate, 2) + ' mL/h';
  // the vasopressor load
  const visRows = Object.keys(DR.VIS).map(k => { const dd = DR.drug(k), id = uid('dr'); return h('label', { class: 'nod-f', for: id }, [h('span', { class: 'nod-l', text: dd.name + ' (' + DR.VIS[k] + ')' }), h('input', { type: 'number', id: id, step: 'any', min: 0, value: DRS.vis[k], 'data-dr-vis': k, onchange: (e) => { DRS.vis[k] = Math.max(0, +e.target.value || 0); render(); } })]); });
  const neeV = DR.nee(DRS.vis);
  const neeEl = h('div', { class: 'dr-nee', 'data-dr-nee': neeV.toFixed(2) }, [h('h5', { text: 'Vasopressor load: norepinephrine-equivalent dose' }), h('div', { class: 'nod-grid' }, visRows),
    h('p', { class: 'dr-nee-v' }, [h('b', { text: 'NEE ' + neeV.toFixed(2) + ' mcg/kg/min' }), ' — ' + (neeV < 0.1 ? 'low-dose support' : neeV < 0.25 ? 'moderate support' : neeV < 0.5 ? 'high-dose support: add the second mechanism (vasopressin), steroids, and ask why' : neeV < 1 ? 'very high: refractory shock — source, tamponade, bleeding, adrenal, acidosis, calcium; angiotensin II, methylene blue, mechanical support?' : 'above 1 mcg/kg/min: the question is the cause, and the goals of care')]),
    h('p', { class: 'fine', text: 'NEE = norepinephrine + epinephrine + phenylephrine ÷ 10 + dopamine ÷ 100 + vasopressin (U/min) × 2.5 + angiotensin II (ng/kg/min) ÷ 10 (Kotani 2023).' })]);
  return h('figure', { class: 'an-fig dr-fig dr-calc', 'data-dripcalc': d.id }, [
    h('div', { class: 'dr-calc-grid' }, [
      h('div', { class: 'odc-ctrls' }, [drugSel, concSel, custom, kgIn, h('div', { class: 'nod-grid' }, [doseIn, rateIn]), h('p', { class: 'fine', 'data-dr-formula': '1', text: formula }),
        h('p', { class: 'fine' }, [h('b', { text: d.name + ': ' }), d.dose.usual + ' ' + d.unit + '; max ' + d.dose.max + '. ' + d.dose.ceiling])]),
      h('div', {}, [drPump(d, c.dose, rate, conc, kg), h('h5', { class: 'dr-h5', text: 'Titration ladder' }), ladderEl])
    ]),
    neeEl,
    h('figcaption', { text: 'Rate = dose × weight (if weight-based) × 60 (if per minute) ÷ concentration. Change the bag to your library’s; the ladder uses the drug’s usual step and interval.' })
  ]);
}

/* ---- the scenarios ---- */
function dripCasesFig() {
  const list = DR.SCENARIOS;
  if (!DRS.caseOpen) DRS.caseOpen = list[0].id;
  const sc = list.filter(x => x.id === DRS.caseOpen)[0];
  const VERD = { best: 'Best', reasonable: 'Reasonable', poor: 'Poor', wrong: 'Wrong' };
  const answered = Object.keys(DRS.cases).length, best = list.filter(x => { const a = DRS.cases[x.id]; return a && x.options.filter(o => o[0] === a)[0][2] === 'best'; }).length;
  const tabs = h('div', { class: 'seg stack ec-case-tabs', role: 'tablist', 'aria-label': 'Case' }, list.map((x, i) => { const a = DRS.cases[x.id]; const v = a ? x.options.filter(o => o[0] === a)[0][2] : ''; return h('button', { type: 'button', class: 'ch' + (v ? ' ec-done ' + v : ''), role: 'tab', 'data-dr-case': x.id, 'aria-selected': String(x.id === sc.id), onclick: () => { DRS.caseOpen = x.id; render(); } }, [h('span', { class: 'ec-case-n', text: String(i + 1) }), h('span', { text: x.title })]); }));
  const chosen = DRS.cases[sc.id];
  const rot = list.indexOf(sc) % sc.options.length, opts = sc.options.slice(rot).concat(sc.options.slice(0, rot));
  const optionsEl = h('div', { class: 'ec-options' }, opts.map(op => h('button', { type: 'button', class: 'ec-opt' + (chosen ? (op[0] === chosen ? ' chosen ' + op[2] : (op[2] === 'best' ? ' isbest' : ' dim')) : ''), 'data-dr-opt': op[0], disabled: !!chosen, onclick: () => { DRS.cases[sc.id] = op[0]; render(); } }, [h('span', { class: 'ec-opt-t', text: op[1] }), chosen ? h('span', { class: 'ec-opt-v', text: VERD[op[2]] }) : null])));
  const verdictEl = chosen ? (() => { const op = sc.options.filter(x => x[0] === chosen)[0], bestOp = sc.options.filter(x => x[2] === 'best')[0]; return h('div', { class: 'vs-verdict ' + op[2], 'data-dr-verdict': op[2] }, [h('b', { text: VERD[op[2]] + '. ' }), op[3], op[2] !== 'best' ? h('p', { class: 'ec-best' }, [h('b', { text: 'The best move: ' }), bestOp[1] + ' — ' + bestOp[3]]) : null, h('p', { class: 'ec-best' }, [h('b', { text: 'What happened: ' }), sc.after])]); })() : null;
  const card = h('div', { class: 'ec-case', 'data-dr-open': sc.id }, [h('p', { class: 'ec-who' }, [h('b', { text: sc.title + '. ' }), sc.who]), h('p', { class: 'ec-q', text: sc.q }), optionsEl, verdictEl]);
  return h('figure', { class: 'an-fig ec-fig', 'data-dripcases': '1' }, [
    h('p', { class: 'ec-score', 'data-dr-score': best + '/' + answered, text: answered ? answered + ' of ' + list.length + ' answered, ' + best + ' with the best move' : list.length + ' patients' }),
    tabs, card,
    h('figcaption', { text: 'Verdicts: best, reasonable (right but not first), poor (costly or misdirected), wrong (harmful). Doses are the usual adult ones; your protocol and the patient in front of you decide.' })
  ]);
}
function dripWidget(kind, block) {
  if (kind === 'dripref') return dripRefFig(block && block.cls ? block.cls : 'vaso');
  if (kind === 'dripcalc') return dripCalcFig();
  if (kind === 'dripcases') return dripCasesFig();
  return null;
}
