/* ========================================================================== Home
   The front door: the fellow's guide through the fellowship — a hero, a progress strip (resume, the case bank, the echo
   logbook, the next exam), then the areas grouped by where the fellow stands: clinic, bronchoscopy suite, ICU, the probe,
   the record — each a tile with its featured topics and labs. */
const LAST_KEY = 'pft.last.v1';
function lastVisited() { try { const v = JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); return v && v.topic ? v : null; } catch (e) { return null; } }
function rememberVisit(topic) {
  try { const cat = learnCatOf(topic); const t = cat.topics[topic]; if (t) localStorage.setItem(LAST_KEY, JSON.stringify({ topic: topic, title: t.title, cat: cat.title })); } catch (e) { /* storage is a convenience */ }
}
/* the featured links of each area: topic ids (missing ones are skipped) */
const HOME_AREAS = [
  { id: 'airway', title: 'Anatomy & bronchoscopy', icon: 'lungs', sub: 'From the cells of the airway to the Campbell diagram; the bronchial tree in 3D, CT anatomy (drawn and real scans), EBUS stations, bronchoscopy practice', links: [['start', 'Syllabus'], ['tree', 'Bronchial tree 3D'], ['ct', 'CT anatomy'], ['stations', 'EBUS stations'], ['heartlung', 'Heart–lung lab'], ['transport', 'Oxygen lab']] },
  { id: 'vent', icon: 'vent', sub: 'Invasive and non-invasive support, every setting on the ventilator, the waveforms, and a simulator with a screen and breathing lungs', links: [['vent_basics', 'Modes'], ['vent_settings', 'Settings'], ['vent_waves', 'Waveforms'], ['vent_sim', 'Simulator']] },
  { id: 'ecmo', icon: 'circuit', sub: 'VV and VA: the circuit, the physiology, selection, anticoagulation, emergencies, liberation — a circuit lab with guided scenarios, and fourteen bedside scenarios', links: [['ecmo_lab', 'Circuit lab'], ['ecmo_cases', 'Scenarios'], ['ecmo_vv', 'VV physiology'], ['ecmo_va', 'VA physiology']] },
  { id: 'hl', title: 'Heart–lung interaction', icon: 'hl', sub: 'Kenny’s approach to mechanical heart–lung interaction: the bag, the box and the tube; the Campbell diagram and the work of breathing; the Guyton diagram; the two on one axis, animated through a breath in health and in sickness (auto-PEEP, pulmonary oedema, the two ARDS, cirrhosis, weaning)', links: [['hl_start', 'The approach'], ['hl_campbell', 'Campbell diagram'], ['hl_guyton', 'Guyton diagram'], ['hl_union', 'On one axis'], ['hl_sick', 'In sickness']] },
  { id: 'hemo', title: 'Haemodynamics', icon: 'heart', sub: 'Filling pressures and gradients, the pulmonary artery catheter on a beating heart, the numbers (TPG, DPG, PAPi, CPO), shock and the right ventricle', links: [['hemo_lab', 'Swan–Ganz lab'], ['hemo_cases', 'Shock scenarios'], ['hemo_numbers', 'The numbers'], ['hemo_shock', 'Shock']] },
  { id: 'drips', title: 'ICU infusions', icon: 'drip', sub: 'Pressors, inotropes, vasodilators, sedation, analgesia and paralysis: indications, dosing and titration, monitoring, contraindications, and the trials — with a drip calculator', links: [['drips_vaso', 'Vasopressors'], ['drips_sed', 'Sedation'], ['drips_calc', 'Drip calculator'], ['drips_cases', 'Scenarios']] },
  { id: 'echo', icon: 'probe', sub: 'Point-of-care echo: the windows and views (drawn and real), the anatomy on the screen, LV/RV/pericardium/IVC, RUSH and lung ultrasound — with a scanning simulator on a model and on a real volume, a quiz, and your case logbook for the boards', links: [['echo_views', 'The views'], ['echo_lab', 'Scanning lab'], ['echo_quiz', 'Quiz'], ['echo_log', 'Logbook']] },
  { id: 'monitor', icon: 'monitor', sub: 'The arterial line and its fluid column, CVP and its waves, pulse-contour devices (FloTrac, HemoSphere, PiCCO), capnography, oximetry, NIRS, ICP, oesophageal and bladder pressures — set-up, pitfalls, troubleshooting, waveforms', links: [['mon_art', 'Arterial line'], ['mon_pulse', 'Pulse contour'], ['mon_capno', 'Capnography'], ['mon_screen', 'Screen scenarios'], ['mon_icp', 'ICP']] },
  { id: 'ecg', title: 'Conduction & ECG', icon: 'ecg', sub: 'How conduction writes the twelve leads — the classic lesions played, and a bench where every element of the system and every wall is a dial, each lead is shown as the sum of its parts, and the reading is made from the traces', links: [['ecglab', 'ECG lab'], ['conduction', 'Conduction bench'], ['leads', 'Lead placement']] },
  { id: 'cancer', title: 'Nodules & screening', icon: 'nodule', sub: 'Nodules, incidental findings and screening: Fleischner, Lung-RADS, the risk models, the VA programme', links: [['nodules', 'Nodules'], ['screening', 'Screening'], ['incidentals', 'Incidentals']] },
  { id: 'pft', icon: 'loop', sub: 'How a study is read: z-scores, patterns, DLCO, volumes, challenge tests, the phrasing — with the examples', links: [['basics', 'Reading a PFT'], ['spiro', 'Spirometry'], ['vol', 'Lung volumes'], ['dlco', 'DLCO']] }
];
function homeIcon(kind) {
  const svg = sv('svg', { viewBox: '0 0 64 48', class: 'ht-icon', 'aria-hidden': 'true' });
  const p = (d, cls) => svg.appendChild(sv('path', { d: d, class: cls || 'hi-line' }));
  if (kind === 'loop') { p('M8 40 L8 8', 'hi-axis'); p('M8 40 L58 40', 'hi-axis'); p('M12 40 C 14 12 30 6 44 14 C 52 20 56 34 56 40 C 48 44 20 44 12 40 Z', 'hi-fill'); p('M12 40 C 14 12 30 6 44 14 C 52 20 56 34 56 40', 'hi-line hi-anim'); }
  if (kind === 'lungs') { p('M32 6 L32 20', 'hi-line'); p('M32 20 L22 28 M32 20 L42 28', 'hi-line'); p('M28 22 C 14 22 8 34 10 44 L26 44 C 30 44 30 36 28 22 Z', 'hi-fill'); p('M36 22 C 50 22 56 34 54 44 L38 44 C 34 44 34 36 36 22 Z', 'hi-fill'); }
  if (kind === 'vent') { p('M6 36 L14 36 L14 12 L26 12 L26 36 L40 36 C 46 36 48 30 48 24', 'hi-line hi-anim'); p('M6 44 L58 44', 'hi-axis'); p('M50 36 L58 36', 'hi-line'); }
  if (kind === 'circuit') { p('M18 10 C 10 10 10 38 18 38 L34 38', 'hi-line hi-anim'); p('M34 38 L46 38 C 54 38 54 10 46 10 L18 10', 'hi-line hi-anim2'); svg.appendChild(sv('rect', { x: 40, y: 16, width: 12, height: 16, rx: 2, class: 'hi-fill' })); svg.appendChild(sv('circle', { cx: 18, cy: 38, r: 5, class: 'hi-fill' })); }
  if (kind === 'hl') { p('M8 40 L8 8', 'hi-axis'); p('M8 40 L58 40', 'hi-axis'); p('M12 12 C 20 30 30 36 56 38', 'hi-line'); p('M12 38 C 24 36 34 24 40 10', 'hi-line hi-anim'); p('M14 30 L30 18 L50 14', 'hi-axis'); svg.appendChild(sv('circle', { cx: 31, cy: 29, r: 3.5, class: 'hi-fill' })); }
  if (kind === 'heart') { p('M32 44 C 10 30 6 16 16 10 C 24 6 30 12 32 16 C 34 12 40 6 48 10 C 58 16 54 30 32 44 Z', 'hi-fill'); p('M8 26 L22 26 L26 18 L30 34 L34 22 L38 26 L56 26', 'hi-line hi-anim'); }
  if (kind === 'ecg') { p('M4 28 L16 28 L20 20 L24 36 L28 10 L32 40 L36 28 L60 28', 'hi-line hi-anim'); }
  if (kind === 'drip') { svg.appendChild(sv('rect', { x: 22, y: 4, width: 20, height: 26, rx: 4, class: 'hi-fill' })); p('M22 14 L42 14 M32 30 L32 44', 'hi-line'); svg.appendChild(sv('circle', { cx: 32, cy: 36, r: 2.5, class: 'hi-dot' })); p('M26 22 L38 22', 'hi-line hi-anim'); }
  if (kind === 'monitor') { svg.appendChild(sv('rect', { x: 6, y: 6, width: 52, height: 36, rx: 4, class: 'hi-fill' })); p('M10 30 L18 30 L22 14 L26 34 L30 24 L34 30 L54 30', 'hi-line hi-anim'); p('M10 36 L54 36', 'hi-axis'); }
  if (kind === 'probe') { p('M32 8 L12 42 L52 42 Z', 'hi-fill'); svg.appendChild(sv('rect', { x: 26, y: 2, width: 12, height: 8, rx: 2, class: 'hi-line' })); p('M24 24 C 28 20 36 20 40 24 M20 32 C 27 26 37 26 44 32', 'hi-line hi-anim'); }
  if (kind === 'nodule') { svg.appendChild(sv('circle', { cx: 32, cy: 24, r: 20, class: 'hi-fill' })); svg.appendChild(sv('circle', { cx: 32, cy: 24, r: 20, class: 'hi-line' })); svg.appendChild(sv('circle', { cx: 40, cy: 18, r: 5, class: 'hi-dot' })); p('M14 24 C 20 14 44 14 50 24', 'hi-line'); }
  if (kind === 'bank') { svg.appendChild(sv('rect', { x: 10, y: 10, width: 44, height: 30, rx: 3, class: 'hi-fill' })); p('M10 18 L54 18 M18 26 L46 26 M18 32 L38 32', 'hi-line'); }
  if (kind === 'tool') { p('M10 40 L10 8 L54 8 L54 40 Z', 'hi-fill'); p('M16 32 L22 22 L28 28 L34 16 L40 26 L48 18', 'hi-line hi-anim'); }
  return svg;
}
/* v8.7: one balanced grid. Twelve equal tiles (the interpreter and the eleven areas) — four, three, two or one to a row, every row
   full — each with its setting, its icon and name, two lines of what is inside (the whole description on hover) and four doors;
   then the record as three equal tiles, and the labs as chips. */
function homeTile(o) {
  const links = (o.links || []).slice(0, 4);
  const linkEls = links.length ? h('div', { class: 'ht-links' }, links.map(l => h('button', { type: 'button', class: 'ht-link', 'data-home-link': l[0], text: l[1], onclick: (e) => { e.stopPropagation(); l[2](); } }))) : null;
  const head = h('div', { class: 'ht-head' }, [homeIcon(o.icon), h('div', { class: 'ht-name' }, [h('h3', { text: o.title }), h('span', { class: 'ht-badge', text: [o.tag, o.badge].filter(Boolean).join(' · ') })])]);
  const sub = tip(h('p', { class: 'ht-sub', text: o.sub }), o.sub, o.title);
  return h('div', { class: 'ht' + (o.kind ? ' ' + o.kind : ''), 'data-home-tile': o.id, 'data-home-setting': o.setting || null, role: 'link', tabindex: '0', 'aria-label': o.title,
    onclick: () => o.go(), onkeydown: (e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); o.go(); } } }, [head, sub, linkEls]);
}
const HOME_ORDER = [['interpret', 'clinic'], ['pft', 'clinic'], ['cancer', 'clinic'], ['airway', 'bronch'], ['vent', 'icu'], ['ecmo', 'icu'], ['hemo', 'icu'], ['hl', 'icu'], ['drips', 'icu'], ['monitor', 'icu'], ['ecg', 'icu'], ['echo', 'probe']];
const HOME_SETTING = { clinic: 'Clinic', bronch: 'Bronchoscopy suite', icu: 'ICU', probe: 'With the probe', record: 'The record' };
function homeProgress(goLearn) {
  const chips = [];
  const last = lastVisited();
  if (last) chips.push(h('button', { type: 'button', class: 'ch home-chip hp-resume', 'data-home-resume': last.topic, text: 'Resume: ' + last.title, onclick: goLearn(last.topic) }));
  const n = bankCount(); chips.push(h('button', { type: 'button', class: 'ch home-chip', 'data-home-prog': 'bank', text: 'Case bank: ' + (n ? n + ' saved' : 'empty'), onclick: () => setMode('bank') }));
  try {
    if (typeof elLoad === 'function' && typeof ELOG !== 'undefined') {
      const c = ELOG.counters(elLoad(), new Date());
      chips.push(h('button', { type: 'button', class: 'ch home-chip', 'data-home-prog': 'log', text: 'Echo log: TTE ' + c.tte + '/150 · TEE ' + c.tee + '/50', onclick: goLearn('echo_log') }));
    }
  } catch (e) { /* the logbook is optional here */ }
  chips.push(tip(h('span', { class: 'home-chip static', 'data-home-prog': 'nbe', tabindex: '0', text: 'CCEeXAM 26 Jan 2027' }), 'NBE Examination of Special Competence in Critical Care Echocardiography: 26 January 2027; registration closes 22 December 2026. The logbook counts toward the 150 TTE and 50 TEE.', 'The next exam'));
  return h('div', { class: 'home-progress', 'data-home-progress': '1' }, chips);
}
function stepHome() {
  const goLearn = (topic) => () => { learnTerm = ''; setMode('learn', { topic: topic }); };
  const goCase = () => { mode = 'case'; render(); window.scrollTo(0, 0); const mm = $('main'); if (mm) mm.focus({ preventScroll: true }); };
  const areaTile = (id, setting) => {
    if (id === 'interpret') return homeTile({ id: 'interpret', setting: setting, tag: HOME_SETTING[setting], kind: 'tool', icon: 'loop', title: 'PFT interpreter', badge: 'tool', sub: 'Enter a study — spirometry, lung volumes, DLCO, challenge tests, 6MWD — and get a clinic-ready reading in the ERS/ATS 2022 language, with the prior for comparison.', go: goCase,
      links: [['case', 'New case', () => { priorAdded = false; loadState(freshState(), 'ctx'); }], ['examples', 'Worked examples', goLearn('examples')], ['bank', 'Case bank', () => setMode('bank')], ['basics', 'How it reads', goLearn('basics')]] });
    const a = HOME_AREAS.filter(x => x.id === id)[0]; if (!a) return null;
    const cat = LEARN_CATS.filter(c => c.id === a.id)[0]; if (!cat) return null;
    const first = cat.groups[0].ids[0];
    const links = a.links.filter(l => cat.topics[l[0]]).map(l => [l[0], l[1], goLearn(l[0])]);
    cat.groups.reduce((x, g) => x.concat(g.ids), []).forEach(tid => { if (links.length < 4 && cat.topics[tid] && !links.some(l => l[0] === tid)) links.push([tid, cat.topics[tid].short || cat.topics[tid].title.split(/[:—(]/)[0].trim(), goLearn(tid)]); });
    const n = cat.groups.reduce((x, g) => x + g.ids.filter(tid => cat.topics[tid]).length, 0);
    return homeTile({ id: a.id, setting: setting, tag: HOME_SETTING[setting], kind: 'learn', icon: a.icon, title: a.title || cat.title, badge: n + (n === 1 ? ' topic' : ' topics'), sub: a.sub, go: goLearn(first), links: links });
  };
  const hero = h('section', { class: 'home-hero' }, [
    h('div', { class: 'home-hero-text' }, [
      h('p', { class: 'kicker', text: 'A fellow’s guide through pulmonary & critical care fellowship' }),
      h('h2', { text: 'PulmCrit Daddy' }),
      h('p', { class: 'home-lead', text: 'Read the study, know the anatomy and the physiology, run the ventilator, the circuit and the drips, scan the heart — models you can turn the dials on, and a record of what you have done.' }),
      h('div', { class: 'home-cta' }, [
        h('button', { type: 'button', class: 'btn primary', 'data-home-cta': 'learn', text: 'Open the guide', onclick: () => { const el = document.querySelector('[data-home-grid]'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); } }),
        h('button', { type: 'button', class: 'btn', 'data-home-cta': 'case', text: 'Interpret a PFT', onclick: goCase })]),
      homeProgress(goLearn)
    ]),
    h('div', { class: 'home-hero-art', 'aria-hidden': 'true' }, [homeArt()])
  ]);
  const grid = h('section', { class: 'home-grid', 'data-home-grid': '1', 'aria-label': 'The guide' }, HOME_ORDER.map(x => areaTile(x[0], x[1])).filter(Boolean));
  const record = h('section', { class: 'home-record', 'data-home-record': '1', 'aria-label': 'Keeping the record' }, [
    homeTile({ id: 'bank', setting: 'record', tag: HOME_SETTING.record, kind: 'tool', icon: 'bank', title: 'Case bank', badge: bankCount() ? bankCount() + ' saved' : 'empty', sub: 'PFT cases saved on this computer with their readings, review notes and ratings. Export a backup before moving machines.', go: () => setMode('bank'), links: [] }),
    homeTile({ id: 'log', setting: 'record', tag: HOME_SETTING.record, kind: 'tool', icon: 'probe', title: 'Echo logbook', badge: '150 TTE · 50 TEE', sub: 'Your de-identified case log toward the echo boards: values, derived numbers, images, review, counters against the 150 TTE / 50 TEE targets, exports and a printable packet.', go: goLearn('echo_log'), links: [] }),
    homeTile({ id: 'boards', setting: 'record', tag: HOME_SETTING.record, kind: 'tool', icon: 'tool', title: 'Boards and certificates', badge: 'ABIM · NBE · ELSO', sub: 'ABIM Pulmonary Disease and Critical Care Medicine: the areas here map to the blueprint. NBE CCEeXAM (critical care echo): 26 January 2027, registration closes 22 December 2026; 150 TTE and 50 TEE in the logbook. ELSO adult ECMO certification counts hours outside fellowship — keep that log separately.', go: goLearn('echo_log'), links: [] })
  ]);
  const labs = h('section', { class: 'home-labs' }, [h('h3', { text: 'Labs and scenarios' }), h('div', { class: 'home-chips' }, [
    ['heartlung', 'Heart–lung lab'], ['transport', 'Oxygen-dissociation lab'], ['ventilation', 'Spirometer & A–a'], ['tree', 'Bronchial tree 3D'], ['ct', 'CT anatomy'], ['stations', 'EBUS stations'], ['vent_waves', 'Ventilator waveforms'], ['vent_sim', 'Ventilator simulator'], ['ecmo_lab', 'ECMO circuit lab'], ['ecmo_cases', 'ECMO scenarios'], ['hemo_lab', 'Swan–Ganz lab'], ['hemo_cases', 'Shock scenarios'], ['drips_calc', 'Drip calculator'], ['drips_cases', 'Drip scenarios'], ['echo_lab', 'Echo scanning lab'], ['echo_quiz', 'Echo quiz'], ['echo_log', 'Echo logbook'], ['mon_art', 'Arterial-line lab'], ['mon_screen', 'Haemodynamic screen'], ['mon_capno', 'Capnography lab'], ['ecglab', 'ECG lab'], ['conduction', 'Conduction bench'], ['leads', 'Lead placement'], ['nodules', 'Nodule advisor'], ['histo', 'Airway quiz'], ['hl_union', 'Heart–lung on one axis']
  ].filter(x => LEARN_CATS.some(c => c.topics[x[0]])).map(x => h('button', { type: 'button', class: 'ch home-chip', 'data-home-lab': x[0], text: x[1], onclick: goLearn(x[0]) })))]);
  $('main').appendChild(h('div', { class: 'home', 'data-home': '1' }, [hero, grid, record, labs,
    h('p', { class: 'fine home-foot', text: 'Everything runs on this device; nothing is sent anywhere. Teaching models throughout: the directions are right, the numbers are illustrative, the local protocol governs care.' })]));
}
/* the hero art: lungs breathing, a heart beating, a trace running — a hint of what is inside */
function homeArt() {
  const svg = sv('svg', { viewBox: '0 0 240 160', class: 'home-art' });
  const g = sv('g', { class: 'ha-lungs' });
  g.appendChild(sv('path', { d: 'M118 20 L118 52', class: 'ha-trachea' }));
  g.appendChild(sv('path', { d: 'M118 52 L100 70 M118 52 L136 70', class: 'ha-trachea' }));
  g.appendChild(sv('path', { d: 'M108 58 C 70 56 50 90 54 128 L100 128 C 110 128 112 100 108 58 Z', class: 'ha-lung' }));
  g.appendChild(sv('path', { d: 'M128 58 C 166 56 186 90 182 128 L136 128 C 126 128 124 100 128 58 Z', class: 'ha-lung' }));
  svg.appendChild(g);
  const heart = sv('path', { d: 'M118 118 C 100 106 96 94 104 90 C 110 87 115 92 118 96 C 121 92 126 87 132 90 C 140 94 136 106 118 118 Z', class: 'ha-heart' });
  svg.appendChild(heart);
  svg.appendChild(sv('path', { d: 'M8 146 L60 146 L66 136 L72 152 L78 122 L84 156 L90 146 L232 146', class: 'ha-trace' }));
  return svg;
}
