/* ========================================================================== Home
   The front door: what is in here and where to click. A hero with the name, the resume link, and a tile for each
   resource — the interpreter, every Learn area with its labs and scenarios, the case bank. */
const LAST_KEY = 'pft.last.v1';
function lastVisited() { try { const v = JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); return v && v.topic ? v : null; } catch (e) { return null; } }
function rememberVisit(topic) {
  try { const cat = learnCatOf(topic); const t = cat.topics[topic]; if (t) localStorage.setItem(LAST_KEY, JSON.stringify({ topic: topic, title: t.title, cat: cat.title })); } catch (e) { /* storage is a convenience */ }
}
/* the featured links of each area: topic ids (missing ones are skipped) */
const HOME_AREAS = [
  { id: 'airway', icon: 'lungs', sub: 'From the cells of the airway to the Campbell diagram; the bronchial tree in 3D, CT anatomy, EBUS stations, bronchoscopy practice', links: [['start', 'Syllabus'], ['tree', 'Bronchial tree 3D'], ['ct', 'CT anatomy'], ['stations', 'EBUS stations'], ['heartlung', 'Heart–lung lab'], ['transport', 'Oxygen lab']] },
  { id: 'vent', icon: 'vent', sub: 'Invasive and non-invasive support, every setting on the ventilator, the waveforms, and a simulator with a screen and breathing lungs', links: [['vent_basics', 'Modes'], ['vent_settings', 'Settings'], ['vent_waves', 'Waveforms'], ['vent_sim', 'Simulator']] },
  { id: 'ecmo', icon: 'circuit', sub: 'VV and VA: the circuit, the physiology, selection, anticoagulation, emergencies, liberation — a circuit lab with guided scenarios, and fourteen bedside scenarios', links: [['ecmo_circuit', 'The circuit'], ['ecmo_vv', 'VV physiology'], ['ecmo_va', 'VA physiology'], ['ecmo_lab', 'Circuit lab'], ['ecmo_cases', 'Scenarios']] },
  { id: 'hemo', icon: 'heart', sub: 'Filling pressures and gradients, the pulmonary artery catheter on a beating heart, the numbers (TPG, DPG, PAPi, CPO), shock and the right ventricle', links: [['hemo_swan', 'The catheter'], ['hemo_numbers', 'The numbers'], ['hemo_shock', 'Shock'], ['hemo_lab', 'Swan–Ganz lab'], ['hemo_cases', 'Shock scenarios']] },
  { id: 'drips', icon: 'drip', sub: 'Pressors, inotropes, vasodilators, sedation, analgesia and paralysis: indications, dosing and titration, monitoring, contraindications, and the trials — with a drip calculator', links: [['drips_vaso', 'Vasopressors'], ['drips_sed', 'Sedation'], ['drips_nmb', 'Paralysis'], ['drips_calc', 'Drip calculator'], ['drips_cases', 'Scenarios']] },
  { id: 'echo', icon: 'probe', sub: 'Point-of-care echo: the windows and views, the anatomy on the screen, LV/RV/pericardium/IVC, RUSH and lung ultrasound — with a scanning simulator and a quiz', links: [['echo_views', 'The views'], ['echo_assess', 'Assessments'], ['echo_lab', 'Scanning lab'], ['echo_quiz', 'Quiz']] },
  { id: 'ecg', icon: 'ecg', sub: 'How conduction writes the twelve leads — watch the wavefront', links: [['ecglab', 'ECG lab']] },
  { id: 'cancer', icon: 'nodule', sub: 'Nodules, incidental findings and screening: Fleischner, Lung-RADS, the risk models, the VA programme', links: [['nodules', 'Nodules'], ['screening', 'Screening'], ['incidentals', 'Incidentals']] },
  { id: 'pft', icon: 'loop', sub: 'How a study is read: z-scores, patterns, DLCO, volumes, challenge tests, the phrasing — with the examples', links: [] }
];
function homeIcon(kind) {
  const svg = sv('svg', { viewBox: '0 0 64 48', class: 'ht-icon', 'aria-hidden': 'true' });
  const p = (d, cls) => svg.appendChild(sv('path', { d: d, class: cls || 'hi-line' }));
  if (kind === 'loop') { p('M8 40 L8 8', 'hi-axis'); p('M8 40 L58 40', 'hi-axis'); p('M12 40 C 14 12 30 6 44 14 C 52 20 56 34 56 40 C 48 44 20 44 12 40 Z', 'hi-fill'); p('M12 40 C 14 12 30 6 44 14 C 52 20 56 34 56 40', 'hi-line hi-anim'); }
  if (kind === 'lungs') { p('M32 6 L32 20', 'hi-line'); p('M32 20 L22 28 M32 20 L42 28', 'hi-line'); p('M28 22 C 14 22 8 34 10 44 L26 44 C 30 44 30 36 28 22 Z', 'hi-fill'); p('M36 22 C 50 22 56 34 54 44 L38 44 C 34 44 34 36 36 22 Z', 'hi-fill'); }
  if (kind === 'vent') { p('M6 36 L14 36 L14 12 L26 12 L26 36 L40 36 C 46 36 48 30 48 24', 'hi-line hi-anim'); p('M6 44 L58 44', 'hi-axis'); p('M50 36 L58 36', 'hi-line'); }
  if (kind === 'circuit') { p('M18 10 C 10 10 10 38 18 38 L34 38', 'hi-line hi-anim'); p('M34 38 L46 38 C 54 38 54 10 46 10 L18 10', 'hi-line hi-anim2'); svg.appendChild(sv('rect', { x: 40, y: 16, width: 12, height: 16, rx: 2, class: 'hi-fill' })); svg.appendChild(sv('circle', { cx: 18, cy: 38, r: 5, class: 'hi-fill' })); }
  if (kind === 'heart') { p('M32 44 C 10 30 6 16 16 10 C 24 6 30 12 32 16 C 34 12 40 6 48 10 C 58 16 54 30 32 44 Z', 'hi-fill'); p('M8 26 L22 26 L26 18 L30 34 L34 22 L38 26 L56 26', 'hi-line hi-anim'); }
  if (kind === 'ecg') { p('M4 28 L16 28 L20 20 L24 36 L28 10 L32 40 L36 28 L60 28', 'hi-line hi-anim'); }
  if (kind === 'drip') { svg.appendChild(sv('rect', { x: 22, y: 4, width: 20, height: 26, rx: 4, class: 'hi-fill' })); p('M22 14 L42 14 M32 30 L32 44', 'hi-line'); svg.appendChild(sv('circle', { cx: 32, cy: 36, r: 2.5, class: 'hi-dot' })); p('M26 22 L38 22', 'hi-line hi-anim'); }
  if (kind === 'probe') { p('M32 8 L12 42 L52 42 Z', 'hi-fill'); svg.appendChild(sv('rect', { x: 26, y: 2, width: 12, height: 8, rx: 2, class: 'hi-line' })); p('M24 24 C 28 20 36 20 40 24 M20 32 C 27 26 37 26 44 32', 'hi-line hi-anim'); }
  if (kind === 'nodule') { svg.appendChild(sv('circle', { cx: 32, cy: 24, r: 20, class: 'hi-fill' })); svg.appendChild(sv('circle', { cx: 32, cy: 24, r: 20, class: 'hi-line' })); svg.appendChild(sv('circle', { cx: 40, cy: 18, r: 5, class: 'hi-dot' })); p('M14 24 C 20 14 44 14 50 24', 'hi-line'); }
  if (kind === 'bank') { svg.appendChild(sv('rect', { x: 10, y: 10, width: 44, height: 30, rx: 3, class: 'hi-fill' })); p('M10 18 L54 18 M18 26 L46 26 M18 32 L38 32', 'hi-line'); }
  if (kind === 'tool') { p('M10 40 L10 8 L54 8 L54 40 Z', 'hi-fill'); p('M16 32 L22 22 L28 28 L34 16 L40 26 L48 18', 'hi-line hi-anim'); }
  return svg;
}
function homeTile(o) {
  const links = o.links && o.links.length ? h('div', { class: 'ht-links' }, o.links.map(l => h('button', { type: 'button', class: 'lnk ht-link', 'data-home-link': l[0], text: l[1], onclick: (e) => { e.stopPropagation(); l[2](); } }))) : null;
  const tile = h('div', { class: 'ht' + (o.kind ? ' ' + o.kind : ''), 'data-home-tile': o.id, role: 'link', tabindex: '0',
    onclick: () => o.go(), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.go(); } } }, [
    h('div', { class: 'ht-head' }, [homeIcon(o.icon), h('div', {}, [h('h3', { text: o.title }), o.badge ? h('span', { class: 'ht-badge', text: o.badge }) : null])]),
    h('p', { class: 'ht-sub', text: o.sub }), links,
    h('span', { class: 'ht-go', text: o.cta || 'Open →' })
  ]);
  return tile;
}
function stepHome() {
  const last = lastVisited();
  const goLearn = (topic) => () => { learnTerm = ''; setMode('learn', { topic: topic }); };
  const goCase = () => { mode = 'case'; render(); window.scrollTo(0, 0); const mm = $('main'); if (mm) mm.focus({ preventScroll: true }); };
  const tiles = [];
  tiles.push(homeTile({ id: 'interpret', kind: 'tool', icon: 'loop', title: 'PFT interpreter', sub: 'Enter a study — spirometry, lung volumes, DLCO, challenge tests, 6MWD — and get a clinic-ready reading in the ERS/ATS 2022 language, with the prior for comparison.', cta: 'Interpret →', go: goCase,
    links: [['case', 'New case', () => { priorAdded = false; loadState(freshState(), 'ctx'); }], ['examples', 'Worked examples', goLearn('examples')], ['bank', 'Case bank', () => setMode('bank')]] }));
  HOME_AREAS.forEach(a => {
    const cat = LEARN_CATS.filter(c => c.id === a.id)[0]; if (!cat) return;
    const first = cat.groups[0].ids[0];
    const links = a.links.filter(l => cat.topics[l[0]]).map(l => [l[0], l[1], goLearn(l[0])]);
    if (!links.length) cat.groups[0].ids.slice(0, 4).forEach(id => { if (cat.topics[id]) links.push([id, cat.topics[id].title, goLearn(id)]); });
    const n = cat.groups.reduce((s, g) => s + g.ids.filter(id => cat.topics[id]).length, 0);
    tiles.push(homeTile({ id: a.id, kind: 'learn', icon: a.icon, title: cat.title, badge: n + (n === 1 ? ' topic' : ' topics'), sub: a.sub, cta: 'Learn →', go: goLearn(first), links: links }));
  });
  tiles.push(homeTile({ id: 'bank', kind: 'tool', icon: 'bank', title: 'Case bank', badge: bankCount() ? bankCount() + ' saved' : null, sub: 'Cases saved on this computer with their readings, review notes and ratings. Export a backup before moving machines.', cta: 'Open →', go: () => setMode('bank'), links: [] }));
  const hero = h('section', { class: 'home-hero' }, [
    h('div', { class: 'home-hero-text' }, [
      h('p', { class: 'kicker', text: 'Pulmonary & critical care' }),
      h('h2', { text: 'PulmCrit Daddy' }),
      h('p', { class: 'home-lead', text: 'Interpret a lung function study. Learn the anatomy, the physiology and the procedures. Run the ventilator, the ECMO circuit and the catheterised heart until the numbers make sense.' }),
      h('div', { class: 'home-cta' }, [
        h('button', { type: 'button', class: 'btn primary', 'data-home-cta': 'case', text: 'Interpret a PFT', onclick: goCase }),
        h('button', { type: 'button', class: 'btn', 'data-home-cta': 'learn', text: 'Browse the Learn areas', onclick: () => { const el = document.querySelector('[data-home-tile="airway"]'); if (el) { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); el.focus(); } } }),
        last ? h('button', { type: 'button', class: 'btn quiet', 'data-home-resume': last.topic, text: 'Resume: ' + last.cat + ' › ' + last.title, onclick: goLearn(last.topic) }) : null
      ])
    ]),
    h('div', { class: 'home-hero-art', 'aria-hidden': 'true' }, [homeArt()])
  ]);
  const labs = h('section', { class: 'home-labs' }, [h('h3', { text: 'Interactive labs and scenarios' }), h('div', { class: 'home-chips' }, [
    ['heartlung', 'Heart–lung lab'], ['transport', 'Oxygen-dissociation lab'], ['ventilation', 'Spirometer & A–a'], ['tree', 'Bronchial tree 3D'], ['ct', 'CT anatomy'], ['stations', 'EBUS stations'], ['vent_waves', 'Ventilator waveforms'], ['vent_sim', 'Ventilator simulator'], ['ecmo_lab', 'ECMO circuit lab'], ['ecmo_cases', 'ECMO scenarios'], ['hemo_lab', 'Swan–Ganz lab'], ['hemo_cases', 'Shock scenarios'], ['drips_calc', 'Drip calculator'], ['drips_cases', 'Drip scenarios'], ['echo_lab', 'Echo scanning lab'], ['echo_quiz', 'Echo quiz'], ['ecglab', 'ECG lab'], ['nodules', 'Nodule advisor'], ['histo', 'Airway quiz']
  ].filter(x => LEARN_CATS.some(c => c.topics[x[0]])).map(x => h('button', { type: 'button', class: 'ch home-chip', 'data-home-lab': x[0], text: x[1], onclick: goLearn(x[0]) })))]);
  $('main').appendChild(h('div', { class: 'home', 'data-home': '1' }, [hero, h('div', { class: 'home-grid' }, tiles), labs,
    h('p', { class: 'fine home-foot', text: 'Everything runs on this device; nothing is sent anywhere. Teaching models throughout: the directions are right, the numbers are illustrative, the local protocol governs care. Formerly PFT Interpreter.' })]));
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
