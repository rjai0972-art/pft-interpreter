
/* ========================================================================== Learn: lung nodules — the calculators
   The probability models (Mayo, VA, Brock), the volume-doubling-time calculator, the management advisor (Fleischner
   2017 for incidental nodules, Lung-RADS v2022 for screening) and a schematic of nodule types. Data and equations in
   nodules.js. Each widget keeps its own inputs and recomputes in place. */
const NOD = window.PFT_NOD || { topics: {}, groups: [] };
const NOD_ST = { risk: { age: 64, female: false, smoker: true, quitYears: 0, cancer: false, famhx: false, emph: false, size: 9, type: 'solid', spic: false, upper: true, count: 1 },
  adv: { setting: 'incidental', type: 'solid', size: 7, solid: 3, status: 'baseline', multiple: false, risk: 'high', benign: false }, vdt: { d1: 6, d2: 8, days: 180 } };

function nodField(label, input, hint) { return h('label', { class: 'nod-f' }, [h('span', { class: 'nod-l', text: label }), input, hint ? h('span', { class: 'fine', text: hint }) : null]); }
function nodNum(st, key, opts, onChange) { return h('input', Object.assign({ type: 'number', class: 'num', inputmode: 'decimal', value: String(st[key]), oninput: (e) => { st[key] = e.target.value === '' ? 0 : +e.target.value; onChange(); } }, opts || {})); }
function nodChk(st, key, text, onChange, attr) { const id = uid('nc'); return h('label', { class: 'chk-inline', for: id }, [h('input', Object.assign({ type: 'checkbox', id: id, checked: !!st[key], onchange: (e) => { st[key] = e.target.checked; onChange(); } }, attr || {})), text]); }
function nodSel(st, key, opts, onChange, attr) { return h('select', Object.assign({ onchange: (e) => { st[key] = e.target.value; onChange(); } }, attr || {}), opts.map(o => h('option', { value: o[0], selected: st[key] === o[0], text: o[1] }))); }
function pct(p) { return p < 0.01 ? '< 1%' : (p > 0.99 ? '> 99%' : Math.round(p * 100) + '%'); }
function chestBand(p) { return p < 0.05 ? 'low (< 5%): CT surveillance' : (p <= 0.65 ? 'intermediate (5–65%): PET/CT, then biopsy or surveillance by the result' : 'high (> 65%): surgical diagnosis after staging'); }

/* ---- the three probability models side by side */
function nodRisk() {
  const st = NOD_ST.risk, out = h('div', { class: 'nod-out', 'data-nod-risk-out': '1' });
  const bar = (name, p, note) => h('div', { class: 'nod-bar' }, [h('span', { class: 'nod-bn', text: name }), h('span', { class: 'nod-bt' }, [h('i', { style: 'width:' + Math.round(Math.max(1, Math.min(100, p * 100))) + '%' })]), h('b', { class: 'nod-bv', 'data-model': name.split(' ')[0].toLowerCase(), text: pct(p) }), h('span', { class: 'fine', text: note })]);
  const update = () => {
    out.textContent = '';
    const pm = NOD.mayo(st), pv = NOD.va(st), pb = NOD.brock(st);
    const vaNote = st.female ? 'derived in male veterans' : 'veterans, 7–30 mm';
    out.appendChild(bar('Mayo (incidental)', pm, 'incidental nodule on a film or CT'));
    out.appendChild(bar('VA', pv, vaNote));
    out.appendChild(bar('Brock (screening)', pb, 'screen-detected; the BTS and Lung-RADS 4B model'));
    out.appendChild(h('p', { class: 'nod-band' }, [h('span', { class: 'lbl', text: 'CHEST band by the Mayo estimate: ' }), chestBand(pm), '. ', h('span', { class: 'lbl', text: 'BTS: ' }), pb < 0.1 ? 'Brock under 10%: CT surveillance.' : 'Brock 10% or more: PET/CT, then the Herder model (Mayo plus FDG uptake — faint, moderate or intense raises the probability steeply) with 10% and 70% as the lines for biopsy and for excision.']));
    if (st.size < 4 || st.size > 30) out.appendChild(h('p', { class: 'fine', text: 'The models were built from nodules of roughly 4–30 mm (Brock 1–86 mm); outside that range read the estimate loosely.' }));
    if (st.type !== 'solid') out.appendChild(h('p', { class: 'fine', text: 'Mayo and VA were derived from solid nodules; for a subsolid nodule only Brock carries the attenuation.' }));
  };
  const grid = h('div', { class: 'nod-grid' }, [
    nodField('Age', nodNum(st, 'age', { min: '18', max: '100', step: '1', 'data-nod': 'age' }, update)),
    nodField('Nodule size (mm)', nodNum(st, 'size', { min: '1', max: '80', step: '0.5', 'data-nod': 'size' }, update), 'mean of long and short axis'),
    nodField('Attenuation', nodSel(st, 'type', [['solid', 'Solid'], ['part', 'Part-solid'], ['ggn', 'Ground-glass']], update, { 'data-nod': 'type' })),
    nodField('Nodules on the scan', nodNum(st, 'count', { min: '1', max: '20', step: '1' }, update), 'Brock: more nodules, less risk each'),
    nodField('Years since quitting', nodNum(st, 'quitYears', { min: '0', max: '60', step: '1', 'data-nod': 'quit' }, update), '0 if smoking or never smoked (VA)')
  ]);
  const flags = h('div', { class: 'nod-flags' }, [
    nodChk(st, 'smoker', 'Ever smoked', update, { 'data-nod': 'smoker' }), nodChk(st, 'female', 'Female', update, { 'data-nod': 'female' }), nodChk(st, 'spic', 'Spiculated', update, { 'data-nod': 'spic' }), nodChk(st, 'upper', 'Upper lobe', update, { 'data-nod': 'upper' }),
    nodChk(st, 'cancer', 'Extrathoracic cancer ≥ 5 years ago', update), nodChk(st, 'famhx', 'Family history of lung cancer', update), nodChk(st, 'emph', 'Emphysema on the CT', update)
  ]);
  update();
  return h('div', { class: 'nod-calc', 'data-nod-risk': '1' }, [h('h3', { text: 'Probability of malignancy — the three models' }), grid, flags, out,
    h('p', { class: 'fine', text: 'Mayo: Swensen 1997 (x = −6.8272 + 0.0391·age + 0.7917·smoker + 1.3388·cancer + 0.1274·diameter + 1.0407·spiculation + 0.7838·upper lobe). VA: Gould 2007. Brock: McWilliams 2013, full model with spiculation. Probability = eˣ / (1 + eˣ). Teaching calculators: the published equations, applied as published.' })]);
}

/* ---- volume doubling time */
function nodVdt() {
  const st = NOD_ST.vdt, out = h('p', { class: 'nod-band', 'data-nod-vdt-out': '1' });
  const update = () => {
    const v = NOD.vdt(st.d1, st.d2, st.days);
    out.textContent = '';
    if (v === null) { out.textContent = 'Enter two different diameters and the days between the scans.'; return; }
    if (v < 0) { out.appendChild(h('span', { text: 'The nodule is shrinking (volume halving time about ' + Math.round(-v) + ' days): resolving infection, inflammation or haemorrhage — not a cancer pattern.' })); return; }
    const growth = Math.pow(st.d2 / st.d1, 3) - 1;
    let read;
    if (v < 20) read = 'Faster than cancer usually grows: infection, inflammation or haemorrhage first.';
    else if (v <= 400) read = 'In the range of a solid lung cancer (20–400 days): presumptive evidence of malignancy — PET/CT, biopsy or resection, not another interval.';
    else if (v <= 800) read = 'Slow: typical of an adenocarcinoma spectrum lesion (subsolid cancers double in 400–800 days), or a benign nodule — keep following.';
    else read = 'Very slow (> 800 days): usually benign; a persistent subsolid nodule can still be an indolent adenocarcinoma, so subsolid nodules are followed to 5 years.';
    out.appendChild(h('span', {}, [h('b', { text: 'VDT ' + Math.round(v) + ' days' }), ' (volume +' + Math.round(growth * 100) + '%, diameter +' + (st.d2 - st.d1).toFixed(1) + ' mm' + ((st.d2 - st.d1) < 1.5 ? ', within measurement error' : '') + '). ' + read]));
  };
  const grid = h('div', { class: 'nod-grid' }, [
    nodField('Diameter then (mm)', nodNum(st, 'd1', { min: '1', max: '60', step: '0.1', 'data-nod': 'd1' }, update)),
    nodField('Diameter now (mm)', nodNum(st, 'd2', { min: '1', max: '60', step: '0.1', 'data-nod': 'd2' }, update)),
    nodField('Days between', nodNum(st, 'days', { min: '1', max: '3650', step: '1', 'data-nod': 'days' }, update))
  ]);
  update();
  return h('div', { class: 'nod-calc', 'data-nod-vdt': '1' }, [h('h3', { text: 'Volume doubling time' }), grid, out, h('p', { class: 'fine', text: 'VDT = t · ln 2 / (3 · ln(d₂/d₁)) for a spherical nodule measured in the same way on both scans. A change under 1.5–2 mm is within the error of measurement; software volumes are better than diameters for small nodules.' })]);
}

/* ---- the advisor: Fleischner for an incidental nodule, Lung-RADS for a screening nodule */
function nodAdvisor() {
  const st = NOD_ST.adv, out = h('div', { class: 'nod-out', 'data-nod-adv-out': '1' });
  let grid;
  const update = () => {
    out.textContent = '';
    const q = Object.assign({}, st, { size: +st.size, solid: +st.solid });
    if (st.setting === 'screen') {
      const r = NOD.lungRads(q);
      out.appendChild(h('div', { class: 'nod-rec', 'data-lungrads': r.cat }, [h('span', { class: 'nod-cat', text: 'Lung-RADS ' + r.cat }), h('p', {}, [h('span', { class: 'lbl', text: 'Finding. ' }), r.finding]), h('p', {}, [h('span', { class: 'lbl', text: 'Management. ' }), r.mgmt])]));
      if (/^4/.test(r.cat)) out.appendChild(h('p', { class: 'fine', text: 'Spiculation, lymphadenopathy, metastases or a ground-glass nodule that doubles in a year make it 4X. For a 4B nodule the Brock probability (calculator above), comorbidity and the patient’s preference decide between PET/CT, biopsy and surgery.' }));
    } else {
      const r = NOD.fleischner(q);
      out.appendChild(h('div', { class: 'nod-rec', 'data-fleischner': '1' }, [h('span', { class: 'nod-cat', text: r.rule }), h('p', {}, [h('span', { class: 'lbl', text: 'Fleischner 2017. ' }), r.text])]));
      if (st.type === 'solid' && +st.size > 8 && !st.multiple && !st.benign) out.appendChild(h('p', { class: 'fine', text: 'Use the probability calculator above: CHEST follows a solid nodule with a probability under 5% (CT at 3–6, 9–12 and 18–24 months), takes 5–65% to PET/CT, and above 65% to surgical diagnosis after staging.' }));
      out.appendChild(h('p', { class: 'fine', text: 'Fleischner applies to adults of 35 and over who are not immunocompromised and have no known cancer; a nodule in a patient with a cancer or immunosuppression, or any mass, is referred.' }));
    }
    grid.querySelectorAll('[data-only]').forEach(el => { const w = el.getAttribute('data-only'); el.hidden = (w === 'part' && st.type !== 'part') || (w === 'screen' && st.setting !== 'screen') || (w === 'incidental' && st.setting !== 'incidental'); });
  };
  grid = h('div', { class: 'nod-grid' }, [
    nodField('Setting', nodSel(st, 'setting', [['incidental', 'Incidental (Fleischner 2017)'], ['screen', 'Screening LDCT (Lung-RADS 2022)']], update, { 'data-nod': 'setting' })),
    nodField('Nodule', nodSel(st, 'type', [['solid', 'Solid'], ['part', 'Part-solid'], ['ggn', 'Ground-glass (non-solid)'], ['peri', 'Perifissural / juxtapleural, smooth']], update, { 'data-nod': 'advtype' })),
    nodField('Mean diameter (mm)', nodNum(st, 'size', { min: '1', max: '60', step: '0.5', 'data-nod': 'advsize' }, update)),
    h('div', { 'data-only': 'part' }, [nodField('Solid component (mm)', nodNum(st, 'solid', { min: '0', max: '40', step: '0.5', 'data-nod': 'advsolid' }, update))]),
    h('div', { 'data-only': 'screen' }, [nodField('On this scan', nodSel(st, 'status', [['baseline', 'Baseline (first seen)'], ['stable', 'Stable from the prior'], ['new', 'New since the prior'], ['growing', 'Growing (> 1.5 mm / 12 months)']], update, { 'data-nod': 'status' }))]),
    h('div', { 'data-only': 'incidental' }, [nodField('Patient risk', nodSel(st, 'risk', [['low', 'Low (young, never-smoker, smooth, not apical)'], ['high', 'High (age, smoking, emphysema, family history, spiculation, upper lobe)']], update, { 'data-nod': 'risk' }))])
  ]);
  const flags = h('div', { class: 'nod-flags' }, [nodChk(st, 'multiple', 'Multiple nodules', update, { 'data-nod': 'multiple' }), nodChk(st, 'benign', 'Benign calcification or fat', update, { 'data-nod': 'benign' })]);
  update();
  return h('div', { class: 'nod-calc', 'data-nod-adv': '1' }, [h('h3', { text: 'What the guideline says for this nodule' }), grid, flags, out]);
}

/* ---- the schematic: nodule types and the calcification patterns */
function nodTypes() {
  const svg = sv('svg', { viewBox: '0 0 560 150', class: 'nod-types', role: 'img', 'aria-label': 'Nodule types and calcification patterns' });
  const tile = (x, label, sub, draw) => { const g = sv('g', { transform: 'translate(' + x + ' 0)' }); g.appendChild(sv('rect', { x: 6, y: 6, width: 96, height: 96, rx: 8, class: 'nod-lung' })); draw(g); g.appendChild(svt(54, 122, label, { class: 'nod-tl', 'text-anchor': 'middle' })); if (sub) g.appendChild(svt(54, 136, sub, { class: 'nod-ts', 'text-anchor': 'middle' })); svg.appendChild(g); };
  tile(0, 'Solid', 'obscures vessels', g => g.appendChild(sv('circle', { cx: 54, cy: 54, r: 18, class: 'nod-solid' })));
  tile(112, 'Part-solid', 'solid part is what matters', g => { g.appendChild(sv('circle', { cx: 54, cy: 54, r: 24, class: 'nod-ggo' })); g.appendChild(sv('circle', { cx: 58, cy: 56, r: 9, class: 'nod-solid' })); });
  tile(224, 'Ground-glass', 'vessels seen through it', g => { g.appendChild(sv('circle', { cx: 54, cy: 54, r: 24, class: 'nod-ggo' })); g.appendChild(sv('path', { d: 'M30 60 C40 50 60 58 78 46', class: 'nod-vessel' })); });
  tile(336, 'Spiculated', 'corona radiata', g => { g.appendChild(sv('circle', { cx: 54, cy: 54, r: 15, class: 'nod-solid' })); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r1 = 15, r2 = 24 + (i % 3) * 4; g.appendChild(sv('line', { x1: 54 + r1 * Math.cos(a), y1: 54 + r1 * Math.sin(a), x2: 54 + r2 * Math.cos(a), y2: 54 + r2 * Math.sin(a), class: 'nod-spic' })); } });
  tile(448, 'Benign calcification', 'central · laminated · popcorn', g => { g.appendChild(sv('circle', { cx: 32, cy: 36, r: 12, class: 'nod-solid' })); g.appendChild(sv('circle', { cx: 32, cy: 36, r: 4, class: 'nod-calc' })); g.appendChild(sv('circle', { cx: 74, cy: 36, r: 12, class: 'nod-solid' })); g.appendChild(sv('circle', { cx: 74, cy: 36, r: 8, class: 'nod-ring' })); g.appendChild(sv('circle', { cx: 74, cy: 36, r: 4, class: 'nod-ring' })); g.appendChild(sv('circle', { cx: 32, cy: 74, r: 12, class: 'nod-solid' })); [[-4, -3], [3, -5], [5, 3], [-3, 4], [0, 0]].forEach(d => g.appendChild(sv('circle', { cx: 32 + d[0], cy: 74 + d[1], r: 2.6, class: 'nod-calc' }))); g.appendChild(sv('circle', { cx: 74, cy: 74, r: 12, class: 'nod-calc' })); });
  return h('figure', { class: 'an-fig nod-fig' }, [svg, h('figcaption', { text: 'Attenuation, margin and calcification: the three things a report must say. Eccentric or stippled calcification does not make a nodule benign; fat does (hamartoma).' })]);
}
function nodWidget(kind) {
  if (kind === 'nodrisk') return nodRisk();
  if (kind === 'nodvdt') return nodVdt();
  if (kind === 'nodadvisor') return nodAdvisor();
  if (kind === 'nodtypes') return nodTypes();
  return null;
}
