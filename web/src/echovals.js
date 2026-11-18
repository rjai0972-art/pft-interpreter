/* ------------------------------------------------------------------ the full study by the numbers
   What a comprehensive echo report is graded against, as pure functions and tables: chamber sizes with their severity
   partitions, LV mass and geometry; diastolic function and left atrial pressure by the 2025 ASE algorithm (with the separate
   routes for atrial fibrillation and mitral annular calcification); each valve lesion with its grading table, the specific
   criteria for mild and severe, the calculators behind the numbers (continuity, PISA, pressure half-time, regurgitant volume
   and fraction, the Wilkins score, the energy-loss correction) and what misleads each of them; and the pulmonary and hepatic
   vein Doppler patterns as drawn traces timed to the ECG. Values are graded from the number as displayed, so a result shown
   as 5.8 is never called above 5.8. Nothing here stores anything. */
(function (root) {
  'use strict';
  const ECHO = root.PFT_ECHO, WV = root.PFT_WAVES;
  /* '' or null → null (not entered); a number → the number; anything else → NaN (entered, not a number) */
  const num = (v) => { if (v === null || v === undefined) return null; if (typeof v === 'number') return isFinite(v) ? v : NaN; const s = String(v).trim().replace(',', '.'); if (s === '') return null; return /^-?(\d+(\.\d*)?|\.\d+)$/.test(s) ? parseFloat(s) : NaN; };
  const ok = (v) => v !== null && v !== undefined && isFinite(v);
  const pos = (v) => ok(v) && v > 0;
  const fmt = (v, dp) => { if (!ok(v)) return '—'; let s = v.toFixed(dp === undefined ? 1 : dp); if (/^-0(\.0+)?$/.test(s)) s = s.slice(1); return s; };
  const rd = (v, dp) => +v.toFixed(dp);
  const GRADE_WORD = ['normal', 'mildly abnormal', 'moderately abnormal', 'severely abnormal'];
  const bsaOf = (ht, wt) => pos(ht) && pos(wt) ? Math.sqrt(ht * wt / 3600) : null;

  /* ================================================================== chambers ================================================================== */
  /* graded: [normal from, normal to, mildly abnormal to, moderately abnormal to]; above the last is severely abnormal */
  const GRADED = {
    lvidd: { name: 'LV diastolic diameter', abbr: 'LVIDd', unit: 'cm', dp: 1, m: [4.2, 5.8, 6.3, 6.8], f: [3.8, 5.2, 5.6, 6.1], group: 'lv' },
    lviddI: { name: 'LV diastolic diameter / BSA', abbr: 'LVIDd index', unit: 'cm/m²', dp: 1, m: [2.2, 3.0, 3.3, 3.6], f: [2.3, 3.1, 3.4, 3.7], group: 'lv' },
    lvids: { name: 'LV systolic diameter', abbr: 'LVIDs', unit: 'cm', dp: 1, m: [2.5, 4.0, 4.3, 4.5], f: [2.2, 3.5, 3.8, 4.1], group: 'lv' },
    lvidsI: { name: 'LV systolic diameter / BSA', abbr: 'LVIDs index', unit: 'cm/m²', dp: 1, m: [1.3, 2.1, 2.3, 2.5], f: [1.3, 2.1, 2.3, 2.6], group: 'lv' },
    ivs: { name: 'Septal wall thickness', abbr: 'IVSd', unit: 'cm', dp: 1, m: [0.6, 1.0, 1.3, 1.6], f: [0.6, 0.9, 1.2, 1.5], group: 'lv' },
    pw: { name: 'Posterior wall thickness', abbr: 'PWd', unit: 'cm', dp: 1, m: [0.6, 1.0, 1.3, 1.6], f: [0.6, 0.9, 1.2, 1.5], group: 'lv' },
    lvmass: { name: 'LV mass (linear method)', abbr: 'LV mass', unit: 'g', dp: 0, m: [88, 224, 258, 292], f: [67, 162, 186, 210], group: 'lv' },
    lvmassI: { name: 'LV mass / BSA', abbr: 'LV mass index', unit: 'g/m²', dp: 0, m: [49, 115, 131, 148], f: [43, 95, 108, 121], group: 'lv' },
    lavi: { name: 'LA volume / BSA', abbr: 'LAVi', unit: 'mL/m²', dp: 0, m: [16, 34, 41, 48], f: [16, 34, 41, 48], group: 'atria' },
    laArea: { name: 'LA area', abbr: 'LA area', unit: 'cm²', dp: 0, m: [null, 20, 30, 40], f: [null, 20, 30, 40], group: 'atria' }
  };
  /* a normal range without severity partitions: [from, to] (null: no lower limit) */
  const RANGES = {
    laD: { name: 'LA antero-posterior diameter', abbr: 'LA diameter', unit: 'cm', dp: 1, m: [3.0, 4.0], f: [2.7, 3.8], group: 'atria' },
    laDI: { name: 'LA diameter / BSA', abbr: 'LA diameter index', unit: 'cm/m²', dp: 1, m: [1.5, 2.3], f: [1.5, 2.3], group: 'atria' },
    raArea: { name: 'RA area', abbr: 'RA area', unit: 'cm²', dp: 0, m: [null, 18], f: [null, 18], group: 'atria' },
    rvBasal: { name: 'RV basal diameter', abbr: 'RV base', unit: 'mm', dp: 0, m: [25, 41], f: [25, 41], group: 'rv' },
    rvMid: { name: 'RV mid diameter', abbr: 'RV mid', unit: 'mm', dp: 0, m: [19, 35], f: [19, 35], group: 'rv' },
    rvLong: { name: 'RV longitudinal diameter', abbr: 'RV length', unit: 'mm', dp: 0, m: [59, 83], f: [59, 83], group: 'rv' },
    rvotPlax: { name: 'RVOT, parasternal long axis', abbr: 'RVOT PLAX', unit: 'mm', dp: 0, m: [20, 30], f: [20, 30], group: 'rv' },
    rvotProx: { name: 'RVOT proximal', abbr: 'RVOT proximal', unit: 'mm', dp: 0, m: [21, 35], f: [21, 35], group: 'rv' },
    rvotDist: { name: 'RVOT distal', abbr: 'RVOT distal', unit: 'mm', dp: 0, m: [17, 27], f: [17, 27], group: 'rv' },
    rvWall: { name: 'RV wall thickness', abbr: 'RV wall', unit: 'mm', dp: 0, m: [1, 5], f: [1, 5], group: 'rv' },
    rvEda: { name: 'RV end-diastolic area', abbr: 'RV EDA', unit: 'cm²', dp: 0, m: [10, 24], f: [8, 20], group: 'rv' },
    rvEdaI: { name: 'RV end-diastolic area / BSA', abbr: 'RV EDA index', unit: 'cm²/m²', dp: 1, m: [5, 12.6], f: [4.5, 11.5], group: 'rv' },
    rvEsa: { name: 'RV end-systolic area', abbr: 'RV ESA', unit: 'cm²', dp: 0, m: [3, 15], f: [3, 11], group: 'rv' },
    rvEsaI: { name: 'RV end-systolic area / BSA', abbr: 'RV ESA index', unit: 'cm²/m²', dp: 1, m: [2.0, 7.4], f: [1.6, 6.4], group: 'rv' },
    rvEdvI: { name: 'RV end-diastolic volume / BSA', abbr: 'RV EDV index', unit: 'mL/m²', dp: 0, m: [35, 87], f: [32, 74], group: 'rv' },
    rvEsvI: { name: 'RV end-systolic volume / BSA', abbr: 'RV ESV index', unit: 'mL/m²', dp: 0, m: [10, 44], f: [8, 36], group: 'rv' }
  };
  /* mean and SD by sex (absolute, then indexed to BSA where the table gives it); two SD above the mean is the upper limit */
  const MEANSD = {
    aoAnn: { name: 'Aortic annulus', abbr: 'Annulus', unit: 'cm', dp: 1, m: [2.6, 0.3], f: [2.3, 0.2], mi: [1.3, 0.1], fi: [1.3, 0.1], group: 'aorta' },
    aoSinus: { name: 'Sinuses of Valsalva', abbr: 'Sinuses', unit: 'cm', dp: 1, m: [3.4, 0.3], f: [3.0, 0.3], mi: [1.7, 0.2], fi: [1.8, 0.2], group: 'aorta' },
    aoStj: { name: 'Sinotubular junction', abbr: 'STJ', unit: 'cm', dp: 1, m: [2.9, 0.3], f: [2.6, 0.3], mi: [1.5, 0.2], fi: [1.5, 0.2], group: 'aorta' },
    aoAsc: { name: 'Proximal ascending aorta', abbr: 'Ascending aorta', unit: 'cm', dp: 1, m: [3.0, 0.4], f: [2.7, 0.4], mi: [1.5, 0.2], fi: [1.6, 0.3], group: 'aorta' },
    raMinorI: { name: 'RA minor axis / BSA', abbr: 'RA minor axis index', unit: 'cm/m²', dp: 1, m: [1.9, 0.3], f: [1.9, 0.3], group: 'atria' },
    raMajorI: { name: 'RA major axis / BSA', abbr: 'RA major axis index', unit: 'cm/m²', dp: 1, m: [2.4, 0.3], f: [2.5, 0.3], group: 'atria' },
    raVolI: { name: 'RA volume / BSA (2D)', abbr: 'RA volume index', unit: 'mL/m²', dp: 0, m: [25, 7], f: [21, 6], group: 'atria' }
  };
  const rangeText = (p, dp) => (p[0] === null ? '≤ ' + fmt(p[1], dp) : fmt(p[0], dp) + '–' + fmt(p[1], dp));
  /* a graded measure against its partitions: −1 below the normal range, 0 normal, 1–3 mildly to severely abnormal */
  function grade(id, sex, v) {
    const D = GRADED[id]; if (!D || !ok(v)) return null;
    const p = D[sex === 'f' ? 'f' : 'm'], x = rd(v, D.dp);
    const g = (p[0] !== null && x < p[0]) ? -1 : x <= p[1] ? 0 : x <= p[2] ? 1 : x <= p[3] ? 2 : 3;
    return { id: id, grade: g, word: g < 0 ? 'below the normal range' : GRADE_WORD[g], normal: rangeText(p, D.dp), parts: p, text: fmt(v, D.dp) };
  }
  function inRange(id, sex, v) {
    const D = RANGES[id]; if (!D || !ok(v)) return null;
    const p = D[sex === 'f' ? 'f' : 'm'], x = rd(v, D.dp);
    const g = (p[0] !== null && x < p[0]) ? -1 : x <= p[1] ? 0 : 1;
    return { id: id, grade: g, word: g < 0 ? 'below the normal range' : g ? 'above the normal range' : 'normal', normal: rangeText(p, D.dp), parts: p, text: fmt(v, D.dp) };
  }
  function zOf(id, sex, v, indexed) {
    const D = MEANSD[id]; if (!D || !ok(v)) return null;
    const p = D[(sex === 'f' ? 'f' : 'm') + (indexed ? 'i' : '')]; if (!p) return null;
    const z = (v - p[0]) / p[1], hi = p[0] + 2 * p[1], g = rd(v, D.dp) > rd(hi, D.dp) ? 1 : 0;
    return { id: id, grade: g, z: z, word: g ? 'above the upper limit' : 'within two SD of the mean', normal: fmt(p[0], D.dp) + ' ± ' + fmt(p[1], D.dp) + ' (upper limit ' + fmt(hi, D.dp) + ')', mean: p[0], sd: p[1], upper: hi, text: fmt(v, D.dp) };
  }
  /* LV mass by the cube formula, relative wall thickness and the geometry they define */
  function lvMass(lvidd, ivs, pw) { return pos(lvidd) && pos(ivs) && pos(pw) ? 0.8 * 1.04 * (Math.pow(lvidd + ivs + pw, 3) - Math.pow(lvidd, 3)) + 0.6 : null; }
  function geometry(rwt, lvmi, sex) {
    if (!ok(rwt) || !ok(lvmi)) return null;
    const lim = sex === 'f' ? 95 : 115, thick = rd(rwt, 2) > 0.42, heavy = rd(lvmi, 0) > lim;
    const id = thick ? (heavy ? 'conc_hyp' : 'conc_rem') : (heavy ? 'ecc_hyp' : 'normal');
    return { id: id, label: { normal: 'Normal geometry', conc_rem: 'Concentric remodelling', conc_hyp: 'Concentric hypertrophy', ecc_hyp: 'Eccentric hypertrophy' }[id], limit: lim, thick: thick, heavy: heavy,
      say: { normal: 'Normal mass and normal relative wall thickness.', conc_rem: 'Thick walls for the cavity with a normal mass: the pattern of pressure load before the mass rises.', conc_hyp: 'Thick walls and a raised mass: pressure overload (hypertension, aortic stenosis) or an infiltrative or hypertrophic cardiomyopathy.', ecc_hyp: 'A raised mass with walls thin for the cavity: volume overload (regurgitation) or a dilated ventricle.' }[id] };
  }
  const CH_FIELDS = [
    { k: 'ht', label: 'Height', unit: 'cm', eg: 175, lo: 100, hi: 230, group: 'body' }, { k: 'wt', label: 'Weight', unit: 'kg', eg: 80, lo: 25, hi: 350, group: 'body' },
    { k: 'lvidd', label: 'LVIDd', unit: 'cm', eg: 4.8, lo: 2, hi: 10, group: 'lv' }, { k: 'lvids', label: 'LVIDs', unit: 'cm', eg: 3.2, lo: 1, hi: 9, group: 'lv' },
    { k: 'ivs', label: 'Septum (IVSd)', unit: 'cm', eg: 0.9, lo: 0.3, hi: 4, group: 'lv' }, { k: 'pw', label: 'Posterior wall (PWd)', unit: 'cm', eg: 0.9, lo: 0.3, hi: 4, group: 'lv' },
    { k: 'lavi', label: 'LA volume index', unit: 'mL/m²', eg: 28, lo: 5, hi: 200, group: 'atria' }, { k: 'laArea', label: 'LA area', unit: 'cm²', eg: 18, lo: 5, hi: 80, group: 'atria' }, { k: 'raArea', label: 'RA area', unit: 'cm²', eg: 15, lo: 5, hi: 80, group: 'atria' },
    { k: 'rvBasal', label: 'RV basal diameter', unit: 'mm', eg: 36, lo: 10, hi: 90, group: 'rv' }, { k: 'rvMid', label: 'RV mid diameter', unit: 'mm', eg: 28, lo: 8, hi: 80, group: 'rv' }, { k: 'rvWall', label: 'RV wall thickness', unit: 'mm', eg: 4, lo: 1, hi: 20, group: 'rv' },
    { k: 'aoSinus', label: 'Aortic root (sinuses)', unit: 'cm', eg: 3.3, lo: 1.5, hi: 9, group: 'aorta' }, { k: 'aoAsc', label: 'Ascending aorta', unit: 'cm', eg: 3.1, lo: 1.5, hi: 9, group: 'aorta' }
  ];
  /* an entry: null (empty), a number inside what an adult heart can measure, or flagged as an entry to check (wrong unit, a typo) */
  function entries(raw, fields) {
    const x = {}, bad = {};
    fields.forEach(F => { const v = num(raw ? raw[F.k] : null); if (v === null) return; if (!ok(v)) { bad[F.k] = 'Not a number.'; return; } if (v < F.lo || v > F.hi) { bad[F.k] = F.label + ' ' + v + ' ' + F.unit + ' is outside ' + F.lo + '–' + F.hi + ': check the entry and its unit.'; return; } x[F.k] = v; });
    return { x: x, bad: bad };
  }
  function chambers(raw, sex) {
    sex = sex === 'f' ? 'f' : 'm';
    const e = entries(raw, CH_FIELDS), x = e.x, rows = [], bsa = bsaOf(x.ht, x.wt);
    const add = (id, kind, v, extra) => {
      const D = (kind === 'graded' ? GRADED : kind === 'range' ? RANGES : MEANSD)[id];
      const r = kind === 'graded' ? grade(id, sex, v) : kind === 'range' ? inRange(id, sex, v) : zOf(id, sex, v, false);
      rows.push(Object.assign({ id: id, kind: kind, group: D.group, name: D.name, abbr: D.abbr, unit: D.unit, value: v }, r, extra || {}));
    };
    if (ok(x.lvidd)) { add('lvidd', 'graded', x.lvidd); if (bsa) add('lviddI', 'graded', x.lvidd / bsa, { derived: true }); }
    if (ok(x.lvids)) { add('lvids', 'graded', x.lvids); if (bsa) add('lvidsI', 'graded', x.lvids / bsa, { derived: true }); }
    if (ok(x.ivs)) add('ivs', 'graded', x.ivs);
    if (ok(x.pw)) add('pw', 'graded', x.pw);
    const mass = lvMass(x.lvidd, x.ivs, x.pw), lvmi = mass !== null && bsa ? mass / bsa : null, rwt = pos(x.lvidd) && pos(x.pw) ? 2 * x.pw / x.lvidd : null;
    if (mass !== null) { add('lvmass', 'graded', mass, { derived: true, worked: '0.8 × 1.04 × ((' + x.lvidd + ' + ' + x.ivs + ' + ' + x.pw + ')³ − ' + x.lvidd + '³) + 0.6 = ' + fmt(mass, 0) + ' g' }); if (lvmi !== null) add('lvmassI', 'graded', lvmi, { derived: true }); }
    const fs = pos(x.lvidd) && ok(x.lvids) && x.lvids < x.lvidd ? (x.lvidd - x.lvids) / x.lvidd * 100 : null;
    const geo = geometry(rwt, lvmi, sex);
    if (ok(x.lavi)) add('lavi', 'graded', x.lavi);
    if (ok(x.laArea)) add('laArea', 'graded', x.laArea);
    if (ok(x.raArea)) add('raArea', 'range', x.raArea);
    ['rvBasal', 'rvMid', 'rvWall'].forEach(k => { if (ok(x[k])) add(k, 'range', x[k]); });
    ['aoSinus', 'aoAsc'].forEach(k => { if (ok(x[k])) { add(k, 'meansd', x[k]); if (bsa) { const zi = zOf(k, sex, x[k] / bsa, true); rows[rows.length - 1].indexed = { text: fmt(x[k] / bsa, 1), normal: zi.normal, grade: zi.grade }; } } });
    const checks = Object.keys(e.bad).map(k => ({ k: k, t: e.bad[k] }));
    if (ok(x.lvids) && ok(x.lvidd) && x.lvids >= x.lvidd) checks.push({ k: 'lvids', t: 'The systolic diameter (' + x.lvids + ') is not below the diastolic (' + x.lvidd + '): are the two swapped?' });
    if (ok(x.lvidd) && x.lvidd > 10) checks.push({ k: 'lvidd', t: 'Is the diameter in millimetres? This sheet takes centimetres.' });
    return { sex: sex, x: x, bad: e.bad, checks: checks, bsa: bsa, rows: rows, mass: mass, lvmi: lvmi, rwt: rwt, fs: fs, geometry: geo };
  }

  /* ================================================================== diastolic function and LA pressure ================================================================== */
  const DI_FIELDS = [
    { k: 'es', label: 'e′ septal', unit: 'cm/s', eg: 8, lo: 1, hi: 25 }, { k: 'el', label: 'e′ lateral', unit: 'cm/s', eg: 11, lo: 1, hi: 30 },
    { k: 'E', label: 'Mitral E', unit: 'cm/s', eg: 75, lo: 15, hi: 250 }, { k: 'A', label: 'Mitral A', unit: 'cm/s', eg: 65, lo: 10, hi: 250 },
    { k: 'tr', label: 'TR velocity', unit: 'm/s', eg: 2.4, lo: 0.5, hi: 6 }, { k: 'pasp', label: 'PASP', unit: 'mm Hg', eg: 28, lo: 8, hi: 150 },
    { k: 'svd', label: 'Pulmonary vein S/D', unit: '', eg: 1.2, lo: 0.1, hi: 4 }, { k: 'lars', label: 'LA reservoir strain', unit: '%', eg: 32, lo: 2, hi: 70 },
    { k: 'lavi', label: 'LA volume index', unit: 'mL/m²', eg: 28, lo: 5, hi: 200 }, { k: 'ivrt', label: 'IVRT', unit: 'ms', eg: 90, lo: 20, hi: 250 },
    { k: 'dt', label: 'E deceleration time', unit: 'ms', eg: 190, lo: 50, hi: 500 }, { k: 'bmi', label: 'BMI', unit: 'kg/m²', eg: 27, lo: 12, hi: 80 }
  ];
  /* lower limits of normal e′ by age (below these: impaired relaxation); the algorithm's own cut-offs are the last row with ≤ */
  const E_PRIME_AGE = { y: { label: '20–39 years', s: 7, l: 10, a: 9 }, m: { label: '40–65 years', s: 6, l: 8, a: 7 }, o: { label: 'over 65', s: 6, l: 7, a: 6.5 } };
  const DI_EXCEPT = ['moderate or severe mitral annular calcification', 'severe primary mitral regurgitation', 'any mitral stenosis', 'a mitral repair, replacement or edge-to-edge clip', 'atrial fibrillation', 'an LVAD', 'pulmonary hypertension that is not from the left heart', 'a transplanted heart', 'pericardial constriction'];
  const DI_SUPPLEMENT = ['a pulmonary regurgitation end-diastolic velocity of 2 m/s or more', 'a PA diastolic pressure of 16 mm Hg or more', 'a mitral L wave of 50 cm/s or more', 'pulmonary vein Ar lasting more than 30 ms longer than the mitral A wave', 'a fall in E/A of 50% or more with the Valsalva manoeuvre'];
  const LAP_WORD = { normal: 'Normal LA pressure', increased: 'Increased LA pressure', indeterminate: 'LA pressure cannot be determined' };
  function diastSinus(x, opt) {
    const age = E_PRIME_AGE[opt.age] || null, vars = [], path = [], need = [];
    const avgE = ok(x.es) && ok(x.el) ? (x.es + x.el) / 2 : null;
    /* 1: e′ */
    let a = null;
    if (ok(x.es) || ok(x.el)) {
      const hit = [];
      if (age) { if (ok(x.es) && x.es < age.s) hit.push('septal ' + fmt(x.es, 1) + ' < ' + age.s); if (ok(x.el) && x.el < age.l) hit.push('lateral ' + fmt(x.el, 1) + ' < ' + age.l); if (avgE !== null && avgE < age.a) hit.push('average ' + fmt(avgE, 1) + ' < ' + age.a); }
      else { if (ok(x.es) && x.es <= 6) hit.push('septal ' + fmt(x.es, 1) + ' ≤ 6'); if (ok(x.el) && x.el <= 7) hit.push('lateral ' + fmt(x.el, 1) + ' ≤ 7'); if (avgE !== null && avgE <= 6.5) hit.push('average ' + fmt(avgE, 1) + ' ≤ 6.5'); }
      a = hit.length > 0;
      vars.push({ k: 'e', name: 'e′ velocity', abnormal: a, word: a ? 'reduced' : 'not reduced', value: [ok(x.es) ? 'septal ' + fmt(x.es, 1) : '', ok(x.el) ? 'lateral ' + fmt(x.el, 1) : '', avgE !== null ? 'average ' + fmt(avgE, 1) : ''].filter(Boolean).join(', ') + ' cm/s', why: hit.join('; '), rule: age ? 'reduced if septal < ' + age.s + ', lateral < ' + age.l + ' or average < ' + age.a + ' cm/s (' + age.label + ')' : 'reduced if septal ≤ 6, lateral ≤ 7 or average ≤ 6.5 cm/s' });
    } else { vars.push({ k: 'e', name: 'e′ velocity', abnormal: null, word: 'not entered', value: '', why: '', rule: 'reduced if septal ≤ 6, lateral ≤ 7 or average ≤ 6.5 cm/s' }); need.push('an e′ velocity'); }
    /* 2: E/e′ */
    let b = null;
    const rs = pos(x.E) && pos(x.es) ? x.E / x.es : null, rl = pos(x.E) && pos(x.el) ? x.E / x.el : null, ra = pos(x.E) && avgE ? x.E / avgE : null;
    if (rs !== null || rl !== null) {
      const hit = [];
      if (rs !== null && rd(rs, 1) >= 15) hit.push('septal ' + fmt(rs, 1) + ' ≥ 15'); if (rl !== null && rd(rl, 1) >= 13) hit.push('lateral ' + fmt(rl, 1) + ' ≥ 13'); if (ra !== null && rd(ra, 1) >= 14) hit.push('average ' + fmt(ra, 1) + ' ≥ 14');
      b = hit.length > 0;
      vars.push({ k: 'ee', name: 'E/e′', abnormal: b, word: b ? 'increased' : 'not increased', value: [rs !== null ? 'septal ' + fmt(rs, 1) : '', rl !== null ? 'lateral ' + fmt(rl, 1) : '', ra !== null ? 'average ' + fmt(ra, 1) : ''].filter(Boolean).join(', '), why: hit.join('; '), rule: 'increased if septal ≥ 15, lateral ≥ 13 or average ≥ 14' });
    } else { vars.push({ k: 'ee', name: 'E/e′', abnormal: null, word: 'not entered', value: '', why: '', rule: 'increased if septal ≥ 15, lateral ≥ 13 or average ≥ 14' }); need.push(ok(x.E) ? 'an e′ velocity' : 'the mitral E velocity'); }
    /* 3: TR velocity or PASP */
    let c = null;
    if (ok(x.tr) || ok(x.pasp)) {
      const hit = []; if (ok(x.tr) && rd(x.tr, 1) >= 2.8) hit.push('TR ' + fmt(x.tr, 1) + ' ≥ 2.8 m/s'); if (ok(x.pasp) && rd(x.pasp, 0) >= 35) hit.push('PASP ' + fmt(x.pasp, 0) + ' ≥ 35 mm Hg');
      c = hit.length > 0;
      vars.push({ k: 'tr', name: 'TR velocity or PASP', abnormal: c, word: c ? 'increased' : 'not increased', value: [ok(x.tr) ? fmt(x.tr, 1) + ' m/s' : '', ok(x.pasp) ? fmt(x.pasp, 0) + ' mm Hg' : ''].filter(Boolean).join(', '), why: hit.join('; '), rule: 'increased if TR velocity ≥ 2.8 m/s or PASP ≥ 35 mm Hg' });
    } else vars.push({ k: 'tr', name: 'TR velocity or PASP', abnormal: null, word: 'not entered', value: '', why: '', rule: 'increased if TR velocity ≥ 2.8 m/s or PASP ≥ 35 mm Hg' });
    const ea = pos(x.E) && pos(x.A) ? x.E / x.A : null;
    /* the second tier: any one present supports a raised LA pressure */
    const sec = [];
    if (ok(x.svd)) sec.push({ k: 'svd', name: 'Pulmonary vein S/D', value: fmt(x.svd, 2), present: rd(x.svd, 2) <= 0.67, rule: '≤ 0.67' });
    if (ok(x.lars)) sec.push({ k: 'lars', name: 'LA reservoir strain', value: fmt(x.lars, 0) + '%', present: rd(x.lars, 0) <= 18, rule: '≤ 18%' });
    if (ok(x.lavi)) sec.push({ k: 'lavi', name: 'LA volume index', value: fmt(x.lavi, 0) + ' mL/m²', present: rd(x.lavi, 0) > 34, rule: '> 34 mL/m²' });
    if (ok(x.ivrt)) sec.push({ k: 'ivrt', name: 'IVRT', value: fmt(x.ivrt, 0) + ' ms', present: rd(x.ivrt, 0) <= 70, rule: '≤ 70 ms', alt: true });
    const secState = !sec.length ? 'na' : sec.some(s => s.present) ? 'pos' : 'neg';
    const gradeByEa = () => ea === null ? null : (rd(ea, 2) >= 2 ? 3 : 2);
    /* one pass of the algorithm for a given state of the three variables */
    const decide = (A1, B1, C1) => {
      const n = (A1 ? 1 : 0) + (B1 ? 1 : 0) + (C1 ? 1 : 0);
      if (n === 0) return { lap: 'normal', grade: 0, via: 'all three normal' };
      if (n === 3) return { lap: 'increased', grade: gradeByEa(), via: 'all three abnormal' };
      if (n === 1 && A1) {
        if (ea === null) return { lap: null, grade: null, via: 'reduced e′ only', wants: 'E/A' };
        if (rd(ea, 2) <= 0.8) return { lap: 'normal', grade: 1, via: 'reduced e′ only, E/A ≤ 0.8' };
      }
      const how = n === 1 ? (A1 ? 'reduced e′ only, E/A > 0.8' : B1 ? 'increased E/e′ only' : 'increased TR velocity or PASP only') : 'two of the three abnormal';
      if (secState === 'pos') return { lap: 'increased', grade: gradeByEa(), via: how + ', a second-tier marker present', second: true };
      if (secState === 'neg') return { lap: 'normal', grade: A1 ? 1 : 0, via: how + ', no second-tier marker', second: true };
      return { lap: 'indeterminate', grade: null, via: how + ', no second-tier marker measured', second: true, wants: 'second' };
    };
    let res, depends = null;
    if (a === null || b === null) res = { lap: null, grade: null, via: '' };
    else if (c !== null) res = decide(a, b, c);
    else {
      const r0 = decide(a, b, false), r1 = decide(a, b, true);
      if (r0.lap === r1.lap && r0.grade === r1.grade) res = Object.assign({}, r0, { via: r0.via + ' (the TR velocity would not change this)' });
      else { res = { lap: null, grade: null, via: '' }; depends = { low: r0, high: r1 }; need.push('a TR velocity or PASP'); }
    }
    if (res.wants === 'E/A') need.push('the mitral A velocity (for E/A)');
    if (res.lap === 'increased' && res.grade === null) need.push('the mitral A velocity (E/A separates grade 2 from grade 3)');
    const nAbn = [a, b, c].filter(v => v === true).length;
    path.push('Three variables: ' + vars.map(v => v.name + ' ' + v.word).join('; ') + '.');
    if (res.second) path.push(sec.length ? 'Second tier: ' + sec.map(s => s.name + ' ' + s.value + (s.present ? ' (meets ' + s.rule + ')' : ' (does not meet ' + s.rule + ')')).join('; ') + '.' : 'Second tier needed: pulmonary vein S/D ≤ 0.67, LA reservoir strain ≤ 18%, LA volume index > 34 mL/m², or IVRT ≤ 70 ms. None is entered.');
    if (res.lap === 'increased') path.push(ea === null ? 'LA pressure is increased; E/A decides between grade 2 and grade 3.' : 'E/A ' + fmt(ea, 2) + (rd(ea, 2) >= 2 ? ' is 2 or more: grade 3.' : ' is under 2: grade 2.'));
    const label = res.lap === null ? '' : res.grade === 0 ? (res.lap === 'normal' && nAbn ? 'Normal LA pressure; no diastolic dysfunction by e′' : 'Normal diastolic function') : res.grade === 1 ? 'Grade 1 diastolic dysfunction, normal LA pressure' : res.grade === 2 ? 'Grade 2 diastolic dysfunction, mildly or moderately increased LA pressure' : res.grade === 3 ? 'Grade 3 diastolic dysfunction, markedly increased LA pressure' : LAP_WORD[res.lap];
    const notes = [];
    if (res.grade === 1) notes.push('If the patient is breathless on exertion, a diastolic exercise echo is the next test.');
    if (res.lap === 'normal' && c === true && !a && !b) notes.push('An isolated raised TR velocity with a normal LA pressure points away from the left heart: look for a pulmonary or pulmonary vascular cause.');
    if (res.lap === 'indeterminate') notes.push('With none of the second-tier markers, the guideline falls back on supplemental signs: ' + DI_SUPPLEMENT.join('; ') + '.');
    if (a === false && nAbn === 0 && ok(x.lavi) && rd(x.lavi, 0) > 34) notes.push('The LA is enlarged with otherwise normal findings: a large LA records pressure over months (and athletes, anaemia, atrial arrhythmia and mitral disease enlarge it too).');
    return { mode: 'sinus', vars: vars, sec: sec, ea: ea, avgE: avgE, ratios: { septal: rs, lateral: rl, average: ra }, nAbn: nAbn, lap: res.lap, grade: res.grade, via: res.via, label: label, depends: depends, need: need, path: path, notes: notes };
  }
  function diastAf(x) {
    const vars = [];
    const put = (k, name, have, abn, value, rule) => vars.push({ k: k, name: name, abnormal: have ? abn : null, word: have ? (abn ? 'positive' : 'negative') : 'not entered', value: have ? value : '', rule: rule });
    put('E', 'Mitral E velocity', ok(x.E), ok(x.E) && rd(x.E, 0) >= 100, fmt(x.E, 0) + ' cm/s', '≥ 100 cm/s');
    const rs = pos(x.E) && pos(x.es) ? x.E / x.es : null;
    put('ee', 'Septal E/e′', rs !== null, rs !== null && rd(rs, 1) > 11, fmt(rs, 1), '> 11');
    put('tr', 'TR velocity or PASP', ok(x.tr) || ok(x.pasp), (ok(x.tr) && rd(x.tr, 1) > 2.8) || (ok(x.pasp) && rd(x.pasp, 0) > 35), [ok(x.tr) ? fmt(x.tr, 1) + ' m/s' : '', ok(x.pasp) ? fmt(x.pasp, 0) + ' mm Hg' : ''].filter(Boolean).join(', '), '> 2.8 m/s or > 35 mm Hg');
    put('dt', 'E deceleration time', ok(x.dt), ok(x.dt) && rd(x.dt, 0) <= 160, fmt(x.dt, 0) + ' ms', '≤ 160 ms');
    const p = vars.filter(v => v.abnormal === true).length, u = vars.filter(v => v.abnormal === null).length;
    const sec = [];
    if (ok(x.lars)) sec.push({ k: 'lars', name: 'LA reservoir strain', value: fmt(x.lars, 0) + '%', present: rd(x.lars, 0) < 18, rule: '< 18%' });
    if (ok(x.svd)) sec.push({ k: 'svd', name: 'Pulmonary vein S/D', value: fmt(x.svd, 2), present: rd(x.svd, 2) < 1, rule: '< 1' });
    if (ok(x.bmi)) sec.push({ k: 'bmi', name: 'BMI', value: fmt(x.bmi, 0) + ' kg/m²', present: rd(x.bmi, 0) > 30, rule: '> 30 kg/m²' });
    let lap = null, via = '', second = false; const need = [], path = [];
    if (p >= 3) { lap = 'increased'; via = p + ' of the four positive'; }
    else if (p + u <= 1) { lap = 'normal'; via = (p ? 'one' : 'none') + ' of the four positive'; }
    else if (p === 2 && u === 0) {
      second = true; const sp = sec.filter(s => s.present).length;
      if (sp >= 2) { lap = 'increased'; via = 'two of the four positive, ' + sp + ' of the three second-step findings present'; }
      else if (sec.length === 3 && sp === 0) { lap = 'normal'; via = 'two of the four positive, none of the three second-step findings present'; }
      else { lap = 'indeterminate'; via = sec.length < 3 && sp < 2 ? 'two of the four positive; the second step is incomplete' : 'two of the four positive, one second-step finding only'; if (sec.length < 3) need.push(['LA reservoir strain', 'pulmonary vein S/D', 'BMI'].filter((n, i) => !sec.some(s => s.k === ['lars', 'svd', 'bmi'][i])).join(', ')); }
    } else need.push(vars.filter(v => v.abnormal === null).map(v => v.name).join(', '));
    path.push('Four variables: ' + vars.map(v => v.name + ' ' + (v.value ? v.value + ' (' + v.word + ')' : v.word)).join('; ') + '.');
    if (second) path.push(sec.length ? 'Second step: ' + sec.map(s => s.name + ' ' + s.value + (s.present ? ' (meets ' + s.rule + ')' : ' (does not meet ' + s.rule + ')')).join('; ') + '.' : 'Second step needed: LA reservoir strain < 18%, pulmonary vein S/D < 1, BMI > 30 kg/m². None is entered.');
    return { mode: 'af', vars: vars, sec: sec, nPos: p, nUnk: u, lap: lap, grade: null, via: via, label: lap ? LAP_WORD[lap] : '', need: need, path: path, depends: null,
      notes: ['In atrial fibrillation the pressure is estimated but the dysfunction is not graded. Average the measurements over several beats of similar cycle length (the guideline suggests cycles close to a rate of 60–80), and avoid the beat after a long pause.'] };
  }
  function diastMac(x) {
    const ea = pos(x.E) && pos(x.A) ? x.E / x.A : null, path = [], need = [];
    let lap = null, via = '';
    if (ea === null) need.push('mitral E and A velocities');
    else if (rd(ea, 2) < 0.8) { lap = 'normal'; via = 'E/A ' + fmt(ea, 2) + ' is under 0.8'; }
    else if (rd(ea, 2) > 1.8) { lap = 'increased'; via = 'E/A ' + fmt(ea, 2) + ' is above 1.8'; }
    else if (!ok(x.ivrt)) { need.push('the IVRT (E/A ' + fmt(ea, 2) + ' lies between 0.8 and 1.8)'); }
    else if (rd(x.ivrt, 0) >= 80) { lap = 'normal'; via = 'E/A ' + fmt(ea, 2) + ' between 0.8 and 1.8, IVRT ' + fmt(x.ivrt, 0) + ' ms is 80 or more'; }
    else { lap = 'increased'; via = 'E/A ' + fmt(ea, 2) + ' between 0.8 and 1.8, IVRT ' + fmt(x.ivrt, 0) + ' ms is under 80'; }
    if (ea !== null) path.push('E/A ' + fmt(ea, 2) + ': under 0.8 is a normal LA pressure, above 1.8 a raised one, in between the IVRT decides (80 ms or more normal, under 80 raised).');
    return { mode: 'mac', vars: [{ k: 'ea', name: 'Mitral E/A', abnormal: ea === null ? null : rd(ea, 2) > 1.8 ? true : rd(ea, 2) < 0.8 ? false : null, word: ea === null ? 'not entered' : rd(ea, 2) > 1.8 ? 'raised range' : rd(ea, 2) < 0.8 ? 'normal range' : 'in between', value: ea === null ? '' : fmt(ea, 2), rule: 'under 0.8 normal; above 1.8 raised; 0.8–1.8: the IVRT decides' }], sec: [], ea: ea, lap: lap, grade: null, via: via, label: lap ? LAP_WORD[lap] : '', need: need, path: path, depends: null,
      notes: ['Calcium in the annulus lowers e′ and raises E by narrowing the orifice, so E/e′ no longer tracks the pressure. That is why this route uses the inflow pattern and the IVRT alone.'] };
  }
  function diast(raw, opt) {
    opt = Object.assign({ mode: 'sinus', age: '' }, opt || {});
    const e = entries(raw, DI_FIELDS), x = e.x;
    const r = opt.mode === 'af' ? diastAf(x) : opt.mode === 'mac' ? diastMac(x) : diastSinus(x, opt);
    r.x = x; r.bad = e.bad; r.checks = Object.keys(e.bad).map(k => ({ k: k, t: e.bad[k] }));
    if (ok(x.E) && x.E < 10) r.checks.push({ k: 'E', t: 'Is E in m/s? This sheet takes cm/s.' });
    if (ok(x.tr) && ok(x.pasp) && Math.abs(4 * x.tr * x.tr - x.pasp) > 25) r.checks.push({ k: 'pasp', t: 'A TR velocity of ' + x.tr + ' m/s is a gradient of ' + fmt(4 * x.tr * x.tr, 0) + ' mm Hg, which does not fit a PASP of ' + x.pasp + '.' });
    r.opt = opt;
    return r;
  }

  /* ================================================================== the valves ================================================================== */
  const circle = (d) => pos(d) ? Math.PI * d * d / 4 : null;
  /* a three-step table: which column a value falls in (0 mild … 2 severe); cuts: [mild|moderate, moderate|severe], dir 1 = higher is worse */
  const step3 = (v, cuts, dir, dp) => { if (!ok(v)) return null; const x = rd(v, dp === undefined ? 2 : dp); return dir > 0 ? (x < cuts[0] ? 0 : x < cuts[1] ? 1 : 2) : (x > cuts[0] ? 0 : x >= cuts[1] ? 1 : 2); };
  const SEV = ['mild', 'moderate', 'severe'];
  const GRADES4 = ['I (mild)', 'II (moderate)', 'III (moderate to severe)', 'IV (severe)'];
  const VALVES = {
    as: { title: 'Aortic stenosis', short: 'AS',
      table: { head: ['', 'Sclerosis', 'Mild', 'Moderate', 'Severe'], rows: [
        ['Peak velocity (m/s)', '≤ 2.5', '2.6–2.9', '3.0–4.0', '≥ 4.0'], ['Mean gradient (mm Hg)', '—', '< 20', '20–40', '≥ 40'], ['Valve area (cm²)', '—', '> 1.5', '1.0–1.5', '< 1.0'],
        ['Indexed valve area (cm²/m²)', '—', '> 0.85', '0.60–0.85', '< 0.6'], ['Velocity ratio (LVOT/AV)', '—', '> 0.50', '0.25–0.50', '< 0.25']] },
      fields: [
        { k: 'vmax', label: 'Peak AV velocity', unit: 'm/s', eg: 4.2, lo: 0.5, hi: 8 }, { k: 'mg', label: 'Mean gradient', unit: 'mm Hg', eg: 45, lo: 1, hi: 150 },
        { k: 'lvotD', label: 'LVOT diameter', unit: 'cm', eg: 2.0, lo: 1.2, hi: 3.5 }, { k: 'lvotVti', label: 'LVOT VTI', unit: 'cm', eg: 20, lo: 4, hi: 50 }, { k: 'avVti', label: 'AV VTI', unit: 'cm', eg: 95, lo: 10, hi: 250 },
        { k: 'ef', label: 'LVEF', unit: '%', eg: 55, lo: 5, hi: 85 }, { k: 'ht', label: 'Height', unit: 'cm', eg: 175, lo: 100, hi: 230 }, { k: 'wt', label: 'Weight', unit: 'kg', eg: 80, lo: 25, hi: 350 },
        { k: 'aoD', label: 'Aorta at the sinotubular junction', unit: 'cm', eg: 2.8, lo: 1.5, hi: 7 }],
      caveats: [
        'Start from the valve: a thick, calcified valve with restricted opening is what makes a gradient mean stenosis.',
        'A high-flow state (anaemia, fever, sepsis, thyrotoxicosis, an arteriovenous fistula, aortic regurgitation) raises the velocity and the gradient with a normal valve area. Look for it before calling a high gradient severe.',
        'A low-flow state does the opposite: a small stroke volume gives a low gradient across a severely narrowed valve, and can also leave a moderately narrowed valve half-open (pseudo-severe).',
        'The LVOT diameter is squared, so a 2 mm under-measurement is a valve area about 20% too small. It is the commonest reason for a small area with a low gradient.',
        'A high blood pressure at the time of the study lowers the gradient and the flow: re-measure once it is controlled.',
        'Take the highest velocity from every window (apical, right parasternal, suprasternal); a beam off-axis under-reads.',
        'The catheter (Gorlin) area is larger than the Doppler area, because pressure recovers beyond the valve; the difference matters when the ascending aorta is under about 3 cm. The energy-loss correction, AVA × Aa / (Aa − AVA), estimates the catheter value.'] },
    ar: { title: 'Aortic regurgitation', short: 'AR',
      table: { head: ['', 'Grade I (mild)', 'Grade II', 'Grade III', 'Grade IV (severe)'], rows: [['Regurgitant volume (mL)', '< 30', '30–44', '45–59', '≥ 60'], ['Regurgitant fraction (%)', '< 30', '30–39', '40–49', '≥ 50'], ['EROA (cm²)', '< 0.10', '0.10–0.19', '0.20–0.29', '≥ 0.30']] },
      mild: ['Vena contracta under 0.3 cm', 'Central jet under 25% of the LVOT width', 'Small or no flow convergence', 'Soft or incomplete jet on CW', 'Pressure half-time over 500 ms', 'Normal LV size'],
      severe: ['Flail cusp', 'Vena contracta over 0.6 cm', 'Central jet 65% or more of the LVOT width', 'Large flow convergence', 'Pressure half-time under 200 ms', 'Holodiastolic flow reversal in the descending aorta', 'Enlarged LV with normal function'],
      mech: [['Type I', 'Normal cusp motion: a dilated root or ascending aorta pulling the cusps apart, or a cusp perforation'], ['Type II', 'Cusp prolapse'], ['Type III', 'Cusp restriction (thickened, calcified or rheumatic cusps)']],
      fields: [
        { k: 'r', label: 'PISA radius', unit: 'cm', eg: 0.6, lo: 0.1, hi: 2.5 }, { k: 'va', label: 'Aliasing velocity', unit: 'cm/s', eg: 38, lo: 10, hi: 100 }, { k: 'vp', label: 'Peak AR velocity', unit: 'm/s', eg: 4.5, lo: 1, hi: 7 }, { k: 'vti', label: 'AR jet VTI', unit: 'cm', eg: 180, lo: 20, hi: 400 },
        { k: 'lvotD', label: 'LVOT diameter', unit: 'cm', eg: 2.2, lo: 1.2, hi: 3.5 }, { k: 'lvotVti', label: 'LVOT VTI', unit: 'cm', eg: 28, lo: 4, hi: 60 }],
      caveats: [
        'The pressure half-time shortens when the LV diastolic pressure is high (acute regurgitation, a stiff ventricle), with vasodilators and with a dilated compliant aorta, and lengthens as the ventricle adapts to chronic regurgitation. It grades the pressure difference as much as the leak.',
        'Colour jet length and area depend on the driving pressure and the settings. Use the width at its origin and the vena contracta, and distrust both in an eccentric jet.',
        'Brief early diastolic flow reversal in the descending aorta is normal; reversal through the whole of diastole is the severe sign (it also appears with a stiff aorta in the elderly).',
        'Acute severe regurgitation has a normal-sized ventricle, a short half-time, early mitral closure and often an unimpressive colour jet in a tachycardic, hypotensive patient.',
        'The regurgitant fraction here divides by the LVOT stroke volume, which contains the regurgitant volume. With significant mitral regurgitation the forward flow has to come from another site.'] },
    ms: { title: 'Mitral stenosis', short: 'MS',
      table: { head: ['', 'Mild', 'Moderate', 'Severe'], rows: [['Valve area (cm²)', '> 1.5', '1.0–1.5', '< 1.0'], ['Mean gradient (mm Hg)', '< 5', '5–10', '> 10'], ['PA systolic pressure (mm Hg)', '< 30', '30–50', '> 50']] },
      fields: [
        { k: 'pht', label: 'Pressure half-time', unit: 'ms', eg: 180, lo: 30, hi: 600 }, { k: 'mg', label: 'Mean gradient', unit: 'mm Hg', eg: 8, lo: 0.5, hi: 40 }, { k: 'pasp', label: 'PASP', unit: 'mm Hg', eg: 42, lo: 10, hi: 150 },
        { k: 'lvotD', label: 'LVOT diameter', unit: 'cm', eg: 2.0, lo: 1.2, hi: 3.5 }, { k: 'lvotVti', label: 'LVOT VTI', unit: 'cm', eg: 20, lo: 4, hi: 50 }, { k: 'mvVti', label: 'Mitral VTI', unit: 'cm', eg: 50, lo: 10, hi: 200 },
        { k: 'r', label: 'PISA radius', unit: 'cm', eg: 1.0, lo: 0.1, hi: 3 }, { k: 'va', label: 'Aliasing velocity', unit: 'cm/s', eg: 30, lo: 10, hi: 100 }, { k: 'vp', label: 'Peak mitral velocity', unit: 'cm/s', eg: 200, lo: 50, hi: 400 }, { k: 'alpha', label: 'Leaflet angle α', unit: '°', eg: 120, lo: 60, hi: 180 }],
      wilkins: [
        { k: 'mob', name: 'Mobility', steps: ['Only the leaflet tips restricted', 'Mid and base of the leaflets move normally', 'The valve moves forward in diastole mainly from the base', 'No or minimal forward movement'] },
        { k: 'thick', name: 'Thickening', steps: ['Near normal (4–5 mm)', 'Thick margins (5–8 mm), mid-leaflet normal', 'The whole leaflet (5–8 mm)', 'All leaflet tissue markedly thick (over 8–10 mm)'] },
        { k: 'calc', name: 'Calcification', steps: ['A single bright area', 'Scattered bright areas at the margins', 'Brightness into the mid-leaflets', 'Bright through most of the leaflet'] },
        { k: 'sub', name: 'Subvalvular thickening', steps: ['Minimal, just below the leaflets', 'Chordae thick for a third of their length', 'Thickening to the distal third of the chordae', 'Thick, shortened chordae down to the papillary muscles'] }],
      caveats: [
        'Planimetry of the orifice in short axis at the leaflet tips is the reference when the image allows. The other methods are estimates of it.',
        '220 ÷ pressure half-time assumes normal atrial and ventricular compliance: it misleads just after balloon valvotomy, with significant aortic regurgitation, a stiff ventricle or an atrial septal defect.',
        'The mean gradient depends on heart rate and flow: quote the rate with it, and in atrial fibrillation average five cycles.',
        'The continuity equation is invalid with more than mild aortic or mitral regurgitation, and unreliable in atrial fibrillation.',
        'The table is the 2009 European/American echo grading. The ACC/AHA valve guideline calls a valve area of 1.5 cm² or less severe (half-time 150 ms or more) and 1.0 cm² or less very severe.',
        'A Wilkins score of 8 or less, with no more than mild regurgitation and no left atrial thrombus, favours balloon valvotomy.'] },
    mr: { title: 'Mitral regurgitation', short: 'MR',
      table: { head: ['', 'Grade I (mild)', 'Grade II', 'Grade III', 'Grade IV (severe)'], rows: [['EROA (cm²)', '< 0.20', '0.20–0.29', '0.30–0.39', '≥ 0.40'], ['Regurgitant volume (mL)', '< 30', '30–44', '45–59', '≥ 60'], ['Regurgitant fraction (%)', '< 30', '30–39', '40–49', '≥ 50']] },
      mild: ['Small, narrow central jet', 'Vena contracta 0.3 cm or less', 'PISA radius absent or 0.3 cm or less (Nyquist 30–40 cm/s)', 'A-wave dominant mitral inflow', 'Soft or incomplete jet on CW', 'Normal LV and LA size'],
      severe: ['Flail leaflet', 'Vena contracta 0.7 cm or more (or its area 0.5 cm² or more)', 'PISA radius 1.0 cm or more (Nyquist 30–40 cm/s)', 'Central jet over 50% of the LA area', 'Pulmonary vein systolic flow reversal', 'Enlarged LV with normal function'],
      fields: [
        { k: 'r', label: 'PISA radius', unit: 'cm', eg: 0.9, lo: 0.1, hi: 2.5 }, { k: 'va', label: 'Aliasing velocity', unit: 'cm/s', eg: 38, lo: 10, hi: 100 }, { k: 'vp', label: 'Peak MR velocity', unit: 'm/s', eg: 5.0, lo: 2, hi: 8 }, { k: 'vti', label: 'MR jet VTI', unit: 'cm', eg: 150, lo: 20, hi: 350 },
        { k: 'lvotD', label: 'LVOT diameter', unit: 'cm', eg: 2.0, lo: 1.2, hi: 3.5 }, { k: 'lvotVti', label: 'LVOT VTI', unit: 'cm', eg: 16, lo: 4, hi: 50 }],
      caveats: [
        'An eccentric jet hugging the atrial wall looks smaller than a central jet of the same volume. Do not grade it by its area: quantify it.',
        'A single-frame PISA, vena contracta width or area assumes the leak lasts the whole of systole. In late-systolic regurgitation (prolapse) they overestimate.',
        'The regurgitant volume of severe regurgitation is lower in a low-flow state: a small ventricle or a low output can have severe regurgitation under 60 mL.',
        'An E wave over 1.2 m/s supports severe regurgitation; an A-wave dominant inflow all but excludes it.',
        'Regurgitant fraction here is regurgitant volume ÷ (regurgitant volume + LVOT stroke volume), valid without significant aortic regurgitation.',
        'Blood pressure and loading change the leak: an anaesthetised or vasodilated patient under-reads, a hypertensive one over-reads.'] },
    tr: { title: 'Tricuspid regurgitation and stenosis', short: 'TR',
      table: { head: ['', 'Mild', 'Moderate', 'Severe'], rows: [
        ['Vena contracta width (cm)', '< 0.3', '0.3–0.69', '≥ 0.7'], ['PISA radius (cm, Nyquist 28 cm/s)', '≤ 0.5', '0.6–0.9', '> 0.9'], ['EROA (cm²)', '< 0.20', '0.20–0.39', '≥ 0.40'], ['Regurgitant volume (mL)', '< 30', '30–44', '≥ 45'],
        ['Hepatic vein flow', 'Systolic dominance', 'Systolic blunting', 'Systolic reversal'], ['Tricuspid inflow', 'A-wave dominant', 'Variable', 'E over 1.0 m/s'], ['CW jet', 'Faint, parabolic', 'Dense, parabolic or triangular', 'Dense, triangular, early peaking'], ['IVC diameter (cm)', '< 2', '2.1–2.5', '> 2.5']] },
      mild: ['Thin, small central colour jet', 'Vena contracta under 0.3 cm', 'PISA radius under 0.4 cm (Nyquist 30–40 cm/s)', 'Incomplete or faint CW jet', 'Systolic-dominant hepatic vein flow', 'A-wave dominant tricuspid inflow', 'Normal RV and RA'],
      severe: ['Dilated annulus with no coaptation, or a flail leaflet', 'Central jet over 50% of the RA', 'Vena contracta 0.7 cm or more', 'PISA radius over 0.9 cm (Nyquist 30–40 cm/s)', 'Dense, triangular CW jet or a sine-wave pattern', 'Systolic reversal of hepatic vein flow', 'Dilated RV with preserved function'],
      fields: [
        { k: 'vcw', label: 'Vena contracta width', unit: 'cm', eg: 0.5, lo: 0.05, hi: 3 }, { k: 'r', label: 'PISA radius', unit: 'cm', eg: 0.7, lo: 0.1, hi: 2.5 }, { k: 'va', label: 'Aliasing velocity', unit: 'cm/s', eg: 28, lo: 10, hi: 100 }, { k: 'vp', label: 'Peak TR velocity', unit: 'm/s', eg: 2.8, lo: 0.5, hi: 6 }, { k: 'vti', label: 'TR jet VTI', unit: 'cm', eg: 90, lo: 10, hi: 250 },
        { k: 'rap', label: 'RA pressure', unit: 'mm Hg', eg: 8, lo: 0, hi: 30 }, { k: 'tsMg', label: 'Inflow mean gradient', unit: 'mm Hg', eg: 2, lo: 0.2, hi: 25 }, { k: 'tsPht', label: 'Inflow pressure half-time', unit: 'ms', eg: 90, lo: 20, hi: 500 }, { k: 'tsVti', label: 'Inflow VTI', unit: 'cm', eg: 30, lo: 5, hi: 150 }],
      caveats: [
        'Trace or mild regurgitation is a normal finding. Name the mechanism when it is more: a diseased valve, or a dilated annulus from the right ventricle or atrium.',
        'In wide-open regurgitation the ventricle and atrium behave as one chamber: the jet is slow (around 2 m/s), laminar and hard to see on colour, and 4v² + RA pressure badly under-reads the RV systolic pressure.',
        'Hepatic vein flow and the inflow pattern are altered by atrial fibrillation, RV diastolic function and the RA pressure whatever the valve does.',
        'Chronic severe regurgitation almost always dilates the right heart: normal chamber sizes argue against it, except when it is acute.',
        'There is much less experience quantifying this valve by PISA than the mitral or aortic valve.',
        'Tricuspid stenosis is significant with an inflow mean gradient of 5 mm Hg or more, an inflow VTI over 60 cm, a pressure half-time of 190 ms or more, or a valve area of 1 cm² or less.'] },
    pr: { title: 'Pulmonary regurgitation', short: 'PR',
      table: { head: ['', 'Mild', 'Moderate', 'Severe'], rows: [
        ['Jet on colour', 'Thin (under 10 mm long), narrow origin', 'Intermediate', 'Broad origin'], ['Jet width / annulus', '—', '—', '> 0.7'], ['CW jet', 'Soft', 'Dense', 'Dense, ends early in diastole'],
        ['Deceleration time (ms)', '—', '—', '< 260'], ['Pressure half-time (ms)', '—', '—', '< 100'], ['PR index', '—', '< 0.77', '< 0.77'], ['Regurgitant fraction (%)', '< 20', '20–40', '> 40'], ['RV size', 'Normal', 'Normal or dilated', 'Dilated']] },
      mild: ['Small jet with a narrow width', 'Soft or faint CW jet', 'Slow deceleration', 'Normal RV size'],
      severe: ['Jet width 70% or more of the annulus', 'Dense jet with a pressure half-time under 100 ms', 'Regurgitant flow ending early in diastole', 'Diastolic flow reversal in the branch pulmonary arteries', 'Dilated RV with normal function'],
      fields: [
        { k: 'prDur', label: 'PR duration (A)', unit: 'ms', eg: 300, lo: 50, hi: 900 }, { k: 'diaDur', label: 'Diastole (B)', unit: 'ms', eg: 450, lo: 100, hi: 1200 }, { k: 'pht', label: 'Pressure half-time', unit: 'ms', eg: 140, lo: 20, hi: 500 }, { k: 'jw', label: 'Jet width', unit: 'cm', eg: 0.9, lo: 0.1, hi: 4 }, { k: 'ann', label: 'Pulmonary annulus', unit: 'cm', eg: 2.4, lo: 1, hi: 5 },
        { k: 'rvotD', label: 'RVOT diameter', unit: 'cm', eg: 2.6, lo: 1.2, hi: 5 }, { k: 'rvotVti', label: 'RVOT VTI', unit: 'cm', eg: 22, lo: 4, hi: 60 }, { k: 'lvotD', label: 'LVOT diameter', unit: 'cm', eg: 2.0, lo: 1.2, hi: 3.5 }, { k: 'lvotVti', label: 'LVOT VTI', unit: 'cm', eg: 20, lo: 4, hi: 50 }],
      caveats: [
        'Trivial regurgitation is normal. In severe regurgitation the jet is wide and laminar and can be missed on colour: look at the spectral trace.',
        'A short half-time and an early end to the flow mean the PA and RV diastolic pressures have equalised. A stiff ventricle with a high diastolic pressure does the same with less regurgitation.',
        'The PR index is the duration of the regurgitant signal over the duration of diastole: under 0.77 means the flow stops early.',
        'The regurgitant fraction needs an RVOT diameter, the least reliable diameter in the heart. Experience and validation are sparse, and the cut-offs come mostly from cardiac MRI.',
        'With aortic regurgitation as well, the LVOT is no longer the forward flow: use the mitral annulus.'] }
  };
  const VALVE_ORDER = ['as', 'ar', 'ms', 'mr', 'tr', 'pr'];
  const pisa = (r, va, vp) => pos(r) && pos(va) && pos(vp) ? 2 * Math.PI * r * r * va / vp : null;   // cm, cm/s, cm/s → cm²
  const grade4 = (v, cuts, dp) => { if (!ok(v)) return null; const x = rd(v, dp); return x < cuts[0] ? 0 : x < cuts[1] ? 1 : x < cuts[2] ? 2 : 3; };
  const worst = (a) => { const b = a.filter(v => v !== null && v !== undefined); return b.length ? Math.max.apply(null, b) : null; };
  function valve(id, raw, opt) {
    const V = VALVES[id]; if (!V) return null;
    opt = opt || {};
    const e = entries(raw, V.fields), x = e.x, out = [], steps = [], notes = [];
    const checks = Object.keys(e.bad).map(k => ({ k: k, t: e.bad[k] }));
    const put = (k, name, v, unit, dp, extra) => { if (ok(v)) out.push(Object.assign({ k: k, name: name, value: v, text: fmt(v, dp), unit: unit }, extra || {})); };
    const res = { id: id, title: V.title, x: x, bad: e.bad, checks: checks, out: out, steps: steps, notes: notes, verdict: '', sev: null };
    if (id === 'as') {
      const bsa = bsaOf(x.ht, x.wt), a0 = circle(x.lvotD), sv = a0 && pos(x.lvotVti) ? a0 * x.lvotVti : null, svi = sv && bsa ? sv / bsa : null;
      const ava = sv && pos(x.avVti) ? sv / x.avVti : null, avai = ava && bsa ? ava / bsa : null, dvi = pos(x.lvotVti) && pos(x.avVti) ? x.lvotVti / x.avVti : null;
      const gV = ok(x.vmax) ? (rd(x.vmax, 1) <= 2.5 ? -1 : rd(x.vmax, 1) < 3 ? 0 : rd(x.vmax, 1) < 4 ? 1 : 2) : null, gM = step3(x.mg, [20, 40], 1, 0), gA = ok(ava) ? (rd(ava, 2) > 1.5 ? 0 : rd(ava, 2) >= 1 ? 1 : 2) : null;
      const gI = ok(avai) ? (rd(avai, 2) > 0.85 ? 0 : rd(avai, 2) >= 0.6 ? 1 : 2) : null, gD = ok(dvi) ? (rd(dvi, 2) > 0.5 ? 0 : rd(dvi, 2) >= 0.25 ? 1 : 2) : null;
      const word = (g) => g === null ? '' : g < 0 ? 'sclerosis range' : SEV[g];
      put('vmax', 'Peak velocity', x.vmax, 'm/s', 1, { grade: gV, word: word(gV) }); if (ok(x.vmax)) put('pg', 'Peak gradient (4v²)', 4 * x.vmax * x.vmax, 'mm Hg', 0);
      put('mg', 'Mean gradient', x.mg, 'mm Hg', 0, { grade: gM, word: word(gM) });
      put('lvotA', 'LVOT area', a0, 'cm²', 2, { worked: a0 ? 'π × (' + x.lvotD + ' ÷ 2)² = ' + fmt(a0, 2) : '' }); put('sv', 'Stroke volume', sv, 'mL', 0, { worked: sv ? fmt(a0, 2) + ' × ' + x.lvotVti + ' = ' + fmt(sv, 0) : '' });
      put('svi', 'Stroke volume index', svi, 'mL/m²', 0, { word: ok(svi) ? (rd(svi, 0) <= 35 ? 'low flow (35 or less)' : 'normal flow') : '' });
      put('ava', 'Valve area (continuity)', ava, 'cm²', 2, { grade: gA, word: word(gA), worked: ava ? fmt(a0, 2) + ' × ' + x.lvotVti + ' ÷ ' + x.avVti + ' = ' + fmt(ava, 2) : '' });
      put('avai', 'Indexed valve area', avai, 'cm²/m²', 2, { grade: gI, word: word(gI) }); put('dvi', 'Velocity ratio', dvi, '', 2, { grade: gD, word: word(gD) });
      const aa = circle(x.aoD);
      if (ava && aa && aa > ava) { const el = ava * aa / (aa - ava); put('elco', 'Energy-loss (catheter-equivalent) area', el, 'cm²', 2, { worked: fmt(ava, 2) + ' × ' + fmt(aa, 2) + ' ÷ (' + fmt(aa, 2) + ' − ' + fmt(ava, 2) + ') = ' + fmt(el, 2), word: x.aoD < 3 ? 'aorta under 3 cm: pressure recovery matters' : 'aorta 3 cm or more: little pressure recovery' }); if (bsa) put('eli', 'Energy-loss index', el / bsa, 'cm²/m²', 2); }
      res.vals = { bsa: bsa, lvotA: a0, sv: sv, svi: svi, ava: ava, avai: avai, dvi: dvi };
      /* the stepwise reading */
      const hasG = ok(x.vmax) || ok(x.mg), high = (ok(x.vmax) && rd(x.vmax, 1) >= 4) || (ok(x.mg) && rd(x.mg, 0) >= 40);
      if (!hasG) { res.verdict = ''; res.need = ['the peak velocity or mean gradient']; }
      else if (high) {
        steps.push('A peak velocity of 4 m/s or more, or a mean gradient of 40 mm Hg or more: high-gradient stenosis.');
        steps.push('Exclude a high-flow state (anaemia, fever, sepsis, thyrotoxicosis, a fistula, aortic regurgitation).' + (ok(svi) && rd(svi, 0) > 54 ? ' The stroke volume index of ' + fmt(svi, 0) + ' mL/m² is above the usual upper limit of normal flow.' : ''));
        steps.push('No high-flow state, or one that cannot be reversed: severe aortic stenosis, whatever the flow and the ejection fraction. A reversible one: re-assess when the flow is back to normal.');
        res.verdict = 'High-gradient aortic stenosis: severe once a high-flow state is excluded'; res.sev = 2; res.cls = 'high';
        if (ok(ava) && rd(ava, 2) > 1.0) notes.push('The valve area of ' + fmt(ava, 2) + ' cm² is above 1.0 with a high gradient: think of a high flow, a large LVOT, or a measurement error in the area.');
      } else {
        steps.push('Peak velocity under 4 m/s and mean gradient under 40 mm Hg: low-gradient.');
        if (!ok(ava)) { res.verdict = 'Low gradient: the valve area decides the next step'; res.need = ['LVOT diameter, LVOT VTI and AV VTI (for the valve area)']; res.cls = 'low'; res.sev = worst([gV, gM]); }
        else if (rd(ava, 2) > 1.0) {
          steps.push('The valve area is ' + fmt(ava, 2) + ' cm², above 1.0: not severe.');
          const g = worst([gV, gM, gA]); res.sev = g === null ? null : Math.min(1, Math.max(0, g)); res.cls = 'concordant';
          res.verdict = gV === -1 && (gM === null || gM === 0) && gA === 0 ? 'Aortic sclerosis or no significant stenosis' : (res.sev === 1 ? 'Moderate aortic stenosis' : 'Mild aortic stenosis');
        } else {
          steps.push('The valve area is ' + fmt(ava, 2) + ' cm², 1.0 or less, with a low gradient: the two disagree.');
          steps.push('Exclude measurement error first, above all an LVOT diameter measured too small (it is squared), and a blood pressure that was high during the study.');
          if (!ok(svi)) { res.verdict = 'Low gradient with a small valve area: the flow decides'; res.need = ['height and weight (for the stroke volume index)']; res.cls = 'discordant'; res.sev = null; }
          else if (rd(svi, 0) > 35) { steps.push('Stroke volume index ' + fmt(svi, 0) + ' mL/m², above 35: normal flow. Severe stenosis is unlikely; a small body or a small LVOT measurement is the usual explanation.'); res.verdict = 'Normal-flow, low-gradient: severe stenosis unlikely'; res.cls = 'nflg'; res.sev = 1; }
          else {
            steps.push('Stroke volume index ' + fmt(svi, 0) + ' mL/m², 35 or less: low flow.');
            if (!ok(x.ef)) { res.verdict = 'Low-flow, low-gradient: the ejection fraction picks the test'; res.need = ['the LVEF']; res.cls = 'lflg'; res.sev = null; }
            else if (rd(x.ef, 0) < 50) {
              steps.push('LVEF ' + fmt(x.ef, 0) + '%, under 50: classical low-flow, low-gradient stenosis.');
              steps.push('Low-dose dobutamine echo. With flow reserve (stroke volume up by 20% or more): a mean gradient reaching 40 mm Hg with the area still 1.0 cm² or less is true severe stenosis; an area opening above 1.0 cm² is pseudo-severe. Without flow reserve: the CT calcium score.');
              res.verdict = 'Classical low-flow, low-gradient stenosis: dobutamine echo'; res.cls = 'lflg_ref'; res.sev = null;
            } else {
              steps.push('LVEF ' + fmt(x.ef, 0) + '%, 50 or more: paradoxical low-flow, low-gradient stenosis (a small, thick-walled ventricle with a small stroke volume).');
              steps.push('The integrated approach, with the CT calcium score: severe stenosis likely at 2,000 units or more in men and 1,200 in women (very likely at 3,000 and 1,600; unlikely under 1,600 and 800).');
              res.verdict = 'Paradoxical low-flow, low-gradient stenosis: CT calcium score'; res.cls = 'lflg_pef'; res.sev = null;
            }
          }
        }
      }
      if (ok(ava) && ok(avai) && rd(ava, 2) <= 1.0 && rd(avai, 2) >= 0.6) notes.push('The indexed area of ' + fmt(avai, 2) + ' cm²/m² is not in the severe range: in a small patient a small absolute area can be moderate stenosis.');
      if (ok(ava) && ok(avai) && rd(ava, 2) > 1.0 && rd(avai, 2) < 0.6) notes.push('The indexed area of ' + fmt(avai, 2) + ' cm²/m² is in the severe range with an absolute area above 1.0: indexing over-calls stenosis in the obese.');
      if (ok(x.lvotD) && (x.lvotD < 1.7 || x.lvotD > 2.6)) notes.push('An LVOT diameter of ' + x.lvotD + ' cm is outside the usual 1.8–2.5: re-measure it (zoomed, mid-systole, inner edge to inner edge), since the area and the stroke volume depend on its square.');
    } else if (id === 'ar' || id === 'mr') {
      const er = pisa(x.r, x.va, pos(x.vp) ? x.vp * 100 : null), rvol = er && pos(x.vti) ? er * x.vti : null, a0 = circle(x.lvotD), svL = a0 && pos(x.lvotVti) ? a0 * x.lvotVti : null;
      const rf = rvol && svL ? (id === 'ar' ? rvol / svL : rvol / (rvol + svL)) * 100 : null;
      const cutE = id === 'ar' ? [0.10, 0.20, 0.30] : [0.20, 0.30, 0.40];
      const gE = grade4(er, cutE, 2), gR = grade4(rvol, [30, 45, 60], 0), gF = grade4(rf, [30, 40, 50], 0);
      put('eroa', 'EROA (PISA)', er, 'cm²', 2, { grade: gE, word: gE === null ? '' : 'grade ' + GRADES4[gE], worked: er ? '2π × ' + x.r + '² × ' + x.va + ' ÷ ' + fmt(x.vp * 100, 0) + ' = ' + fmt(er, 2) : '' });
      put('rvol', 'Regurgitant volume', rvol, 'mL', 0, { grade: gR, word: gR === null ? '' : 'grade ' + GRADES4[gR], worked: rvol ? fmt(er, 2) + ' × ' + x.vti + ' = ' + fmt(rvol, 0) : '' });
      put('sv', 'LVOT stroke volume', svL, 'mL', 0);
      put('rf', 'Regurgitant fraction', rf, '%', 0, { grade: gF, word: gF === null ? '' : 'grade ' + GRADES4[gF], worked: rf ? (id === 'ar' ? fmt(rvol, 0) + ' ÷ ' + fmt(svL, 0) : fmt(rvol, 0) + ' ÷ (' + fmt(rvol, 0) + ' + ' + fmt(svL, 0) + ')') + ' = ' + fmt(rf, 0) + '%' : '' });
      if (rf !== null && rf >= 100) { checks.push({ k: 'vti', t: 'A regurgitant volume larger than the LVOT stroke volume cannot be: re-check the PISA radius, the aliasing velocity and the two VTIs.' }); }
      const nm = (opt.mild || []).filter(Boolean).length, ns = (opt.severe || []).filter(Boolean).length;
      /* the three measures can land in different grades, and the guideline gives no rule for that: take the grade two of three
         agree on; with no majority report the span, and never let the single worst measure set the grade by itself */
      const gs = [gE, gR, gF].filter(v => v !== null), gLo = gs.length ? Math.min.apply(null, gs) : null, gHi = gs.length ? Math.max.apply(null, gs) : null;
      const gMode = gs.length === 3 ? (gs[0] === gs[1] || gs[0] === gs[2] ? gs[0] : gs[1] === gs[2] ? gs[1] : null) : null;
      const g = gs.length ? (gLo === gHi ? gLo : gMode !== null ? gMode : gLo) : null, split = gs.length > 1 && gLo !== gHi, ROM = ['I', 'II', 'III', 'IV'];
      res.vals = { eroa: er, rvol: rvol, rf: rf, svLvot: svL }; res.nMild = nm; res.nSevere = ns; res.grade4 = g;
      steps.push('Specific criteria ticked: ' + nm + ' for mild, ' + ns + ' for severe (four or more of either settles it).');
      if (nm >= 4 && ns < 4) { res.verdict = 'Definitely mild ' + V.title.toLowerCase(); res.sev = 0; steps.push('Four or more mild criteria: mild, and quantitation is not needed.'); }
      else if (ns >= 4 && nm < 4) { res.verdict = 'Definitely severe ' + V.title.toLowerCase(); res.sev = 2; steps.push('Four or more severe criteria: severe (it may still be quantified).'); }
      else if (g !== null) {
        steps.push('Quantitative grade: ' + [gE !== null ? 'EROA ' + fmt(er, 2) + ' cm² (' + GRADES4[gE] + ')' : '', gR !== null ? 'regurgitant volume ' + fmt(rvol, 0) + ' mL (' + GRADES4[gR] + ')' : '', gF !== null ? 'fraction ' + fmt(rf, 0) + '% (' + GRADES4[gF] + ')' : ''].filter(Boolean).join(', ') + '.');
        const spread = [gE, gR, gF].filter(v => v !== null);
        if (Math.max.apply(null, spread) - Math.min.apply(null, spread) >= 2) notes.push('The quantitative measures disagree by two grades or more: re-check the measurements before settling on a grade, and consider TEE or cardiac MRI.');
        const loose = split && (gMode === null || gHi - gLo >= 2);
        if (split && !loose) steps.push('Two of the three measures agree on grade ' + ROM[gMode] + ' and the third reads grade ' + ROM[gs.filter(v => v !== gMode)[0]] + ': the grade follows the two that agree. Weigh the one with the better data.');
        if (loose) steps.push('The measures span grades ' + ROM[gLo] + ' to ' + ROM[gHi] + (gMode === null ? ' with no two in agreement' : '') + ': find the weaker measurement before settling on a grade' + (gHi === 3 ? ', and do not dismiss the one in the severe range' : '') + '.');
        res.split = split ? { lo: gLo, hi: gHi, mode: gMode, loose: loose } : null;
        if (loose && !(gLo === 2 && ns >= 3)) { res.verdict = V.title + ', grade ' + ROM[gLo] + ' to ' + ROM[gHi] + ': the measures disagree'; res.sev = gLo >= 1 || gHi >= 2 ? 1 : 0; }
        else if (g === 3) { res.verdict = 'Severe ' + V.title.toLowerCase() + ' (grade IV)'; res.sev = 2; }
        else if (g === 2 && ns >= 3) { res.verdict = 'Severe ' + V.title.toLowerCase() + ' (grade III with three severe criteria)'; res.sev = 2; steps.push('Grade III with three specific criteria for severe: severe.'); }
        else if (g >= 1) { res.verdict = 'Moderate ' + V.title.toLowerCase() + ' (grade ' + (g === 2 ? 'III' : 'II') + ')'; res.sev = 1; }
        else { res.verdict = 'Mild ' + V.title.toLowerCase() + ' (grade I)'; res.sev = 0; }
      } else if (nm + ns > 0) { res.verdict = 'Probably moderate: quantify'; res.sev = 1; steps.push('Two or three criteria, or a mixture: probably moderate. Measure the EROA, regurgitant volume and fraction.'); res.need = ['PISA radius, aliasing velocity, peak velocity and jet VTI']; }
      else res.need = ['the specific criteria, or the PISA measurements'];
    } else if (id === 'ms') {
      const mvaP = pos(x.pht) ? 220 / x.pht : null, a0 = circle(x.lvotD), mvaC = a0 && pos(x.lvotVti) && pos(x.mvVti) ? a0 * x.lvotVti / x.mvVti : null;
      const mvaI = pos(x.r) && pos(x.va) && pos(x.vp) ? 2 * Math.PI * x.r * x.r * (x.va / x.vp) * ((ok(x.alpha) ? x.alpha : 180) / 180) : null;
      const gOf = (a) => ok(a) ? (rd(a, 1) > 1.5 ? 0 : rd(a, 1) >= 1 ? 1 : 2) : null;
      const gM = ok(x.mg) ? (rd(x.mg, 0) < 5 ? 0 : rd(x.mg, 0) <= 10 ? 1 : 2) : null, gP = ok(x.pasp) ? (rd(x.pasp, 0) < 30 ? 0 : rd(x.pasp, 0) <= 50 ? 1 : 2) : null;
      put('mvaPht', 'Valve area by half-time', mvaP, 'cm²', 1, { grade: gOf(mvaP), word: gOf(mvaP) === null ? '' : SEV[gOf(mvaP)], worked: mvaP ? '220 ÷ ' + x.pht + ' = ' + fmt(mvaP, 1) : '' });
      put('mvaCont', 'Valve area by continuity', mvaC, 'cm²', 1, { grade: gOf(mvaC), word: gOf(mvaC) === null ? '' : SEV[gOf(mvaC)], worked: mvaC ? fmt(a0, 2) + ' × ' + x.lvotVti + ' ÷ ' + x.mvVti + ' = ' + fmt(mvaC, 1) : '' });
      put('mvaPisa', 'Valve area by PISA', mvaI, 'cm²', 1, { grade: gOf(mvaI), word: gOf(mvaI) === null ? '' : SEV[gOf(mvaI)], worked: mvaI ? '2π × ' + x.r + '² × ' + x.va + ' ÷ ' + x.vp + ' × ' + (ok(x.alpha) ? x.alpha : 180) + ' ÷ 180 = ' + fmt(mvaI, 1) : '' });
      put('mg', 'Mean gradient', x.mg, 'mm Hg', 0, { grade: gM, word: gM === null ? '' : SEV[gM] + ' range (supportive)' }); put('pasp', 'PA systolic pressure', x.pasp, 'mm Hg', 0, { grade: gP, word: gP === null ? '' : SEV[gP] + ' range (supportive)' });
      const meth = [['half-time', mvaP], ['continuity', mvaC], ['PISA', mvaI]].filter(q => ok(q[1])), areas = meth.map(q => q[1]);
      res.vals = { mvaPht: mvaP, mvaCont: mvaC, mvaPisa: mvaI };
      if (areas.length) {
        const gA = gOf(meth[0][1]), differ = meth.some(q => gOf(q[1]) !== gA);
        res.sev = gA; res.by = meth[0][0]; res.verdict = SEV[gA].charAt(0).toUpperCase() + SEV[gA].slice(1) + ' mitral stenosis by valve area (' + meth[0][0] + ')';
        steps.push('Valve area: over 1.5 cm² mild, 1.0–1.5 moderate, under 1.0 severe. The gradient and the PA pressure support the grade; they do not set it.');
        if (differ) notes.push('The methods give different grades (' + meth.map(q => q[0] + ' ' + fmt(q[1], 1) + ' cm², ' + SEV[gOf(q[1])]).join('; ') + '). Planimetry, if the image allows, is the one to trust; then look at what each method assumes.');
        else if (areas.length > 1 && Math.max.apply(null, areas) - Math.min.apply(null, areas) > 0.4) notes.push('The methods differ by more than 0.4 cm²: planimetry, if the image allows, is the one to trust.');
        const amin = Math.min.apply(null, areas); if (rd(amin, 1) <= 1.5) notes.push('By the ACC/AHA valve guideline an area of 1.5 cm² or less is already severe (1.0 or less very severe).');
      } else if (gM !== null || gP !== null) { res.verdict = 'A valve area is needed to grade'; res.need = ['a pressure half-time, or the continuity or PISA measurements']; }
      else res.need = ['a pressure half-time, or the continuity or PISA measurements'];
      const w = opt.wilkins || {}, ws = VALVES.ms.wilkins.map(q => num(w[q.k])).filter(v => ok(v) && v >= 1 && v <= 4);
      if (ws.length === 4) { const tot = ws.reduce((s, v) => s + v, 0); res.wilkins = { total: tot, favourable: tot <= 8 }; steps.push('Wilkins score ' + tot + ' of 16: ' + (tot <= 8 ? '8 or less, a valve that suits balloon valvotomy.' : 'above 8, a less favourable valve for the balloon.')); }
    } else if (id === 'tr') {
      const er = pisa(x.r, x.va, pos(x.vp) ? x.vp * 100 : null), rvol = er && pos(x.vti) ? er * x.vti : null;
      const gW = ok(x.vcw) ? (rd(x.vcw, 2) < 0.3 ? 0 : rd(x.vcw, 2) < 0.7 ? 1 : 2) : null, gE = ok(er) ? (rd(er, 2) < 0.2 ? 0 : rd(er, 2) < 0.4 ? 1 : 2) : null, gR = ok(rvol) ? (rd(rvol, 0) < 30 ? 0 : rd(rvol, 0) < 45 ? 1 : 2) : null;
      put('vcw', 'Vena contracta width', x.vcw, 'cm', 2, { grade: gW, word: gW === null ? '' : SEV[gW] });
      put('eroa', 'EROA (PISA)', er, 'cm²', 2, { grade: gE, word: gE === null ? '' : SEV[gE], worked: er ? '2π × ' + x.r + '² × ' + x.va + ' ÷ ' + fmt(x.vp * 100, 0) + ' = ' + fmt(er, 2) : '' });
      put('rvol', 'Regurgitant volume', rvol, 'mL', 0, { grade: gR, word: gR === null ? '' : SEV[gR], worked: rvol ? fmt(er, 2) + ' × ' + x.vti + ' = ' + fmt(rvol, 0) : '' });
      if (ok(x.vp)) put('rvsp', 'RV systolic pressure', 4 * x.vp * x.vp + (ok(x.rap) ? x.rap : 0), 'mm Hg', 0, { worked: '4 × ' + x.vp + '²' + (ok(x.rap) ? ' + ' + x.rap : ' (RA pressure not added)') + ' = ' + fmt(4 * x.vp * x.vp + (ok(x.rap) ? x.rap : 0), 0) });
      const nm = (opt.mild || []).filter(Boolean).length, ns = (opt.severe || []).filter(Boolean).length, g = worst([gW, gE, gR]);
      res.vals = { eroa: er, rvol: rvol }; res.nMild = nm; res.nSevere = ns;
      if (nm + ns) steps.push('Specific criteria ticked: ' + nm + ' for mild, ' + ns + ' for severe (most of either settles it).');
      if (ns >= 4 && nm < 4) { res.verdict = 'Severe tricuspid regurgitation'; res.sev = 2; }
      else if (nm >= 4 && ns < 4) { res.verdict = 'Mild tricuspid regurgitation'; res.sev = 0; }
      else if (g !== null) { res.sev = g; res.verdict = SEV[g].charAt(0).toUpperCase() + SEV[g].slice(1) + ' tricuspid regurgitation'; steps.push('Vena contracta under 0.3 cm mild, 0.3–0.69 moderate, 0.7 or more severe; EROA under 0.2, 0.2–0.39, 0.4 cm² or more; regurgitant volume under 30, 30–44, 45 mL or more.'); }
      else if (nm + ns) { res.verdict = 'Probably moderate: measure the vena contracta'; res.sev = 1; }
      else res.need = ['a vena contracta width, the PISA measurements, or the specific criteria'];
      if (g === 2 && ok(x.vp) && x.vp < 2.5) notes.push('Severe regurgitation with a jet of only ' + x.vp + ' m/s: the ventricle and atrium may be one chamber, and 4v² will under-read the RV pressure.');
      /* stenosis */
      const ts = [], tsA = pos(x.tsPht) ? 190 / x.tsPht : null;
      if (ok(x.tsMg)) ts.push({ name: 'mean gradient ' + fmt(x.tsMg, 0) + ' mm Hg', hit: rd(x.tsMg, 0) >= 5 }); if (ok(x.tsPht)) ts.push({ name: 'half-time ' + fmt(x.tsPht, 0) + ' ms', hit: rd(x.tsPht, 0) >= 190 }); if (ok(x.tsVti)) ts.push({ name: 'inflow VTI ' + fmt(x.tsVti, 0) + ' cm', hit: rd(x.tsVti, 0) > 60 });
      if (ts.length) { const hits = ts.filter(q => q.hit); res.ts = { any: hits.length > 0, items: ts, area: tsA }; steps.push('Tricuspid inflow: ' + ts.map(q => q.name + (q.hit ? ' (meets the criterion)' : '')).join(', ') + (hits.length ? ': significant tricuspid stenosis.' : ': no significant stenosis.')); if (tsA !== null) put('tsArea', 'Tricuspid valve area (190 ÷ half-time)', tsA, 'cm²', 1); }
    } else if (id === 'pr') {
      const idx = pos(x.prDur) && pos(x.diaDur) ? x.prDur / x.diaDur : null, ratio = pos(x.jw) && pos(x.ann) ? x.jw / x.ann : null;
      const svR = circle(x.rvotD) && pos(x.rvotVti) ? circle(x.rvotD) * x.rvotVti : null, svL = circle(x.lvotD) && pos(x.lvotVti) ? circle(x.lvotD) * x.lvotVti : null;
      const rvol = svR !== null && svL !== null ? svR - svL : null, rf = rvol !== null && svR > 0 ? rvol / svR * 100 : null;
      const gF = ok(rf) && rf >= 0 ? (rd(rf, 0) < 20 ? 0 : rd(rf, 0) <= 40 ? 1 : 2) : null;
      put('pri', 'PR index (A ÷ B)', idx, '', 2, { word: idx === null ? '' : rd(idx, 2) < 0.77 ? 'under 0.77: the flow ends early' : '0.77 or more', hit: idx !== null && rd(idx, 2) < 0.77, worked: idx ? x.prDur + ' ÷ ' + x.diaDur + ' = ' + fmt(idx, 2) : '' });
      put('pht', 'Pressure half-time', x.pht, 'ms', 0, { word: ok(x.pht) ? (rd(x.pht, 0) < 100 ? 'under 100: severe range' : '100 or more') : '', hit: ok(x.pht) && rd(x.pht, 0) < 100 });
      put('jwr', 'Jet width / annulus', ratio, '', 2, { word: ratio === null ? '' : rd(ratio, 2) > 0.7 ? 'over 0.7: severe range' : '0.7 or less', hit: ratio !== null && rd(ratio, 2) > 0.7 });
      put('svR', 'RVOT stroke volume', svR, 'mL', 0); put('svL', 'LVOT stroke volume', svL, 'mL', 0);
      if (rvol !== null && rvol < 0) checks.push({ k: 'rvotD', t: 'The RVOT stroke volume is below the LVOT stroke volume: no regurgitant volume can be calculated. Re-check the RVOT diameter.' });
      else { put('rvol', 'Regurgitant volume', rvol, 'mL', 0); put('rf', 'Regurgitant fraction', rf, '%', 0, { grade: gF, word: gF === null ? '' : SEV[gF], worked: rf !== null ? '(' + fmt(svR, 0) + ' − ' + fmt(svL, 0) + ') ÷ ' + fmt(svR, 0) + ' = ' + fmt(rf, 0) + '%' : '' }); }
      const nm = (opt.mild || []).filter(Boolean).length, ns = (opt.severe || []).filter(Boolean).length, hits = out.filter(o => o.hit).length;
      res.vals = { index: idx, ratio: ratio, rf: rf }; res.nMild = nm; res.nSevere = ns;
      if (nm + ns) steps.push('Specific criteria ticked: ' + nm + ' for mild, ' + ns + ' for severe (most of either settles it).');
      if (ns >= 3 && nm < 3) { res.verdict = 'Severe pulmonary regurgitation'; res.sev = 2; }
      else if (nm >= 3 && ns < 3) { res.verdict = 'Mild pulmonary regurgitation'; res.sev = 0; }
      else if (gF !== null) { res.sev = gF; res.verdict = SEV[gF].charAt(0).toUpperCase() + SEV[gF].slice(1) + ' pulmonary regurgitation by regurgitant fraction'; steps.push('Regurgitant fraction under 20% mild, 20–40% moderate, over 40% severe.'); }
      else if (hits >= 2) { res.verdict = 'Severe range on ' + hits + ' measures'; res.sev = 2; }
      else if (hits === 1) { res.verdict = 'One measure in the severe range: probably at least moderate'; res.sev = 1; }
      else if (out.length) { res.verdict = 'No measure in the severe range'; res.sev = 0; }
      else res.need = ['the PR and diastole durations, a half-time, the jet and annulus widths, or the specific criteria'];
    }
    return res;
  }

  /* ================================================================== venous Doppler ================================================================== */
  /* each pattern: peak velocities in cm/s (toward the heart positive for the description; the display flips the hepatic vein below
     the baseline as it is seen from the subcostal window). s1/s2: early and late systolic waves; d: diastolic; ar: atrial reversal;
     v: the end-systolic notch; resp: how the trace moves with breathing (fraction, sign); rhythm: sinus or af */
  const PV = [
    { id: 'normal', label: 'Normal adult', w: { s1: 34, s2: 58, d: 44, ar: 22, arW: 0.05 }, look: 'Two systolic waves (S1 as the atrium relaxes, S2 as the annulus descends) at least as tall as the diastolic wave, and a small, brief reversal after the P wave.', means: 'The atrium fills freely in systole: its pressure is not raised. S/D is 1 or more; Ar is under 35 cm/s and no longer than the mitral A wave.', use: 'The reference pattern. Sample 1–2 cm into the right upper pulmonary vein from the apical four-chamber view.' },
    { id: 'young', label: 'Young and healthy: D dominant', w: { s1: 30, s2: 42, d: 62, ar: 18, arW: 0.05 }, look: 'The diastolic wave is taller than the systolic, in someone with a vigorous early filling.', means: 'A fast-relaxing ventricle draws most of the filling in early diastole, so a dominant D wave is normal under about 40. It is the same picture as a raised atrial pressure, which is why age and e′ have to be read with it.', use: 'Do not call a raised LA pressure on S < D alone in a young patient with a normal e′.' },
    { id: 'relax', label: 'Impaired relaxation, normal pressure', w: { s1: 36, s2: 66, d: 30, ar: 26, arW: 0.055 }, look: 'A tall systolic wave and a small, slowly decelerating diastolic wave.', means: 'Early ventricular filling is slow, so the diastolic wave shrinks with the mitral E wave; the atrium fills in systole instead. Grade 1 diastolic dysfunction.', use: 'S/D well above 1: one of the findings that argues against a raised LA pressure.' },
    { id: 'lap', label: 'Raised LA pressure', w: { s1: 14, s2: 26, d: 68, ar: 38, arW: 0.085, dW: 0.07 }, look: 'A blunted systolic wave, a tall diastolic wave that decelerates fast, and a large, long atrial reversal.', means: 'A full, stiff atrium accepts little in systole (S/D of 0.67 or less, a systolic filling fraction of 40% or less). Ar over 35 cm/s, or lasting more than 30 ms longer than the mitral A wave, means the atrium is contracting against a high end-diastolic pressure.', use: 'S/D ≤ 0.67 is a second-tier marker of raised LA pressure in the 2025 algorithm. It is most reliable when the ejection fraction is reduced.' },
    { id: 'mr', label: 'Severe mitral regurgitation', w: { s1: 20, s2: -42, d: 78, ar: 24, arW: 0.05 }, look: 'The late systolic wave is reversed: flow leaves the atrium into the vein in mid to late systole.', means: 'The regurgitant jet pressurises the atrium in systole and pushes flow backwards. Systolic reversal is specific for severe regurgitation; blunting alone is not (a raised LA pressure and atrial fibrillation blunt it too).', use: 'Sample more than one vein: an eccentric jet reverses flow in the vein it is aimed at.' },
    { id: 'af', label: 'Atrial fibrillation', rhythm: 'af', w: { s1: 0, s2: 30, d: 58, ar: 0, arW: 0.05 }, look: 'No atrial reversal, no early systolic wave, a small late systolic wave and a dominant diastolic wave, changing beat to beat.', means: 'With no atrial contraction and relaxation, S1 and Ar disappear and the systolic wave is blunted whatever the pressure. S/D under 1 is used only in the second step of the atrial fibrillation algorithm.', use: 'Average several beats; the deceleration time of the D wave (220 ms or less) is the supplementary sign of a raised pressure.' }
  ];
  const HV = [
    { id: 'normal', label: 'Normal', w: { s: 46, v: 8, d: 30, a: 14 }, resp: 0.25, look: 'Forward flow in systole larger than in diastole, with two small reversals: V at end-systole and A after the P wave. Everything grows a little on inspiration.', means: 'The right atrium fills freely as the tricuspid annulus descends: its pressure is low. A systolic filling fraction above 55% goes with a normal RA pressure.', use: 'From the subcostal window, sample 1–2 cm into the middle hepatic vein, in line with the beam. Forward flow runs away from the probe, so it is drawn below the baseline.' },
    { id: 'rap', label: 'Raised RA pressure', w: { s: 18, v: 10, d: 40, a: 20 }, resp: 0.15, look: 'The systolic wave is blunted and smaller than the diastolic.', means: 'A full right atrium accepts little in systole. A systolic filling fraction under 55% is the most specific Doppler sign of a raised RA pressure; moderate tricuspid regurgitation, RV dysfunction and atrial fibrillation blunt S as well.', use: 'Read it with the IVC size and collapse; in the ventilated patient it is one of the few signs left.' },
    { id: 'tr', label: 'Severe tricuspid regurgitation', w: { s: -44, v: 0, d: 52, a: 12 }, resp: 0.2, look: 'Systolic flow is reversed: a tall wave above the baseline through systole, then forward flow only in diastole.', means: 'The regurgitant jet fills the atrium and the veins in systole. Holosystolic reversal is specific for severe regurgitation. A pulsatile liver and a pulsatile portal vein are the same event further upstream.', use: 'A fast regular tachycardia with the atrium contracting against a closed valve can also reverse systolic flow.' },
    { id: 'constr', label: 'Constrictive pericarditis', w: { s: 34, v: 8, d: 30, a: 12, dr: 23 }, resp: 0.35, rmode: 'constr', look: 'In expiration the diastolic forward wave is cut short and followed by a reversal; in inspiration forward flow returns.', means: 'In expiration the left heart fills at the expense of the right through the shifting septum, and the right atrium cannot empty into a ventricle boxed in by the pericardium. An expiratory end-diastolic reversal of 0.8 or more of the forward velocity is one of the Mayo criteria.', use: 'Record with a respirometer or mark the breath; pair it with a septal bounce and a septal e′ that is normal or high.' },
    { id: 'restr', label: 'Restrictive cardiomyopathy', w: { s: 14, v: 10, d: 44, a: 26, ir: 22 }, resp: 0.2, rmode: 'restr', look: 'A small systolic wave, a dominant diastolic wave, and reversals that grow on inspiration.', means: 'A stiff ventricle with a high filling pressure cannot take the extra venous return of inspiration, so it comes back. The reversals are inspiratory, the opposite of constriction, and the septal e′ is low (usually 5 cm/s or less).', use: 'Inspiratory reversal with a low e′ and thick walls: think of amyloid.' },
    { id: 'ph', label: 'Pulmonary hypertension or a stiff RV', w: { s: 40, v: 8, d: 24, a: 36 }, resp: 0.2, look: 'A tall atrial reversal after the P wave, as large as the forward waves, with systolic flow still dominant.', means: 'The atrium contracts against a non-compliant ventricle with a high end-diastolic pressure, and much of its stroke goes backwards into the veins.', use: 'A prominent A reversal with a dilated IVC and a D-shaped septum: the pressure-loaded right ventricle.' },
    { id: 'af', label: 'Atrial fibrillation', rhythm: 'af', w: { s: 16, v: 8, d: 40, a: 0 }, resp: 0.2, look: 'No A reversal, and a small systolic wave under a dominant diastolic one.', means: 'Without atrial relaxation the systolic wave is blunted whatever the RA pressure, so systolic blunting cannot be used to grade pressure or regurgitation in this rhythm. Systolic reversal still means severe regurgitation.', use: 'Average several beats, and do not read pressure or regurgitation from a blunted systolic wave in this rhythm.' }
  ];
  const AF_RR = [0.62, 0.94, 0.71, 1.08, 0.58, 0.86, 0.79, 1.02, 0.66, 0.9];
  const bump = (t, c, w) => { const z = (t - c) / w; return z < -3 || z > 3 ? 0 : Math.exp(-0.5 * z * z); };
  function veinSeries(kind, id, o) {
    o = o || {}; const list = kind === 'hv' ? HV : PV, P = list.filter(p => p.id === id)[0] || list[0], w = P.w;
    const hr = o.hr || 68, dur = o.dur || 5, fs = o.fs || 200, n = Math.round(dur * fs), rr = o.rr || 14, af = P.rhythm === 'af';
    const beats = []; let t0 = 0.28, i = 0;
    while (t0 < dur + 1) { const T = af ? AF_RR[i % AF_RR.length] : 60 / hr; beats.push({ r: t0, T: T }); t0 += T; i++; }
    const tm = (T) => { const q = WV ? WV.timing(60 / T) : { pep: 0.09, lvet: 0.3, pr: 0.16 }; return { pep: q.pep, lvet: q.lvet, pr: q.pr }; };
    const t = new Float32Array(n), v = new Float32Array(n), ecg = new Float32Array(n), resp = new Float32Array(n), marks = [];
    const insp = (tt) => { const ph = (tt % (60 / rr)) / (60 / rr); return ph < 0.4 ? Math.sin(Math.PI * ph / 0.4) : 0; };   // 0 at end-expiration, 1 at peak inspiration
    for (let k = 0; k < n; k++) {
      const tt = k / fs; t[k] = tt; resp[k] = insp(tt); let y = 0, e = 0;
      beats.forEach((b, bi) => {
        const m = tm(b.T), x = tt - b.r, T = b.T, nextP = T - m.pr + 0.1;
        const sEnd = m.pep + m.lvet, dC = sEnd + 0.17, in1 = insp(b.r + dC), ex1 = 1 - in1;
        /* the ECG: P, QRS, T */
        if (!af) e += 0.12 * bump(x, -m.pr + 0.04, 0.022);
        e += -0.12 * bump(x, -0.022, 0.008) + 1.0 * bump(x, 0, 0.011) - 0.22 * bump(x, 0.028, 0.01) + 0.26 * bump(x, m.pep + m.lvet * 0.78, 0.045);
        if (af) e += 0.03 * Math.sin(tt * 43) + 0.02 * Math.sin(tt * 67 + 1);
        if (kind === 'pv') {
          const dW = w.dW || 0.085;
          y += w.s1 * bump(x, 0.1, 0.04) + w.s2 * bump(x, m.pep + m.lvet * 0.62, 0.075) + w.d * bump(x, dC, dW);
          if (w.ar) y -= w.ar * bump(x, nextP, w.arW || 0.05);
        } else {
          const g = 1 + (P.resp || 0) * (in1 - 0.4);
          let s = w.s, d = w.d, a = w.a, dr = 0;
          if (P.rmode === 'constr') { d = w.d * (0.72 + 0.58 * in1); dr = w.dr * ex1; }
          if (P.rmode === 'restr') { a = w.a + w.ir * in1; }
          y += g * s * bump(x, m.pep + m.lvet * 0.5, 0.085) - w.v * bump(x, sEnd + 0.03, 0.03) + g * d * bump(x, dC + 0.02, 0.085);
          if (dr) y -= dr * bump(x, dC + 0.16, 0.045);
          if (P.rmode === 'restr') y -= w.ir * 0.6 * in1 * bump(x, sEnd + 0.03, 0.035);
          if (a) y -= a * bump(x, nextP, 0.05);
        }
        if (k === 0 && b.r + T < dur) marks.push({ beat: bi, r: b.r, T: T, sC: b.r + m.pep + m.lvet * (kind === 'pv' ? 0.62 : 0.5), s1C: b.r + 0.1, dC: b.r + dC + (kind === 'pv' ? 0 : 0.02), aC: b.r + nextP, vC: b.r + sEnd + 0.03, drC: b.r + dC + 0.16, insp: in1 });
      });
      v[k] = y; ecg[k] = e;
    }
    /* what the trace measures to: peaks over the beats shown */
    const pk = (c, sign) => { let m = 0; marks.forEach(q => { const j = Math.round(q[c] * fs); if (j >= 0 && j < n) m = Math.max(m, sign * v[j]); }); return m; };
    const S = kind === 'pv' ? Math.max(pk('sC', 1), pk('s1C', 1)) : pk('sC', 1), D = pk('dC', 1), sRev = pk('sC', -1);
    const sdr = D > 0 ? (S > 0 ? S / D : 0) : null;
    let drRatio = null, dRev = 0;
    marks.forEach(q => { const j = Math.round(q.drC * fs), jd = Math.round(q.dC * fs); if (j < n && jd < n && -v[j] > 3 && v[jd] > 1) { const r0 = -v[j] / v[jd]; if (drRatio === null || r0 > drRatio) { drRatio = r0; dRev = -v[j]; } } });
    return { kind: kind, id: P.id, pattern: P, t: t, v: v, ecg: ecg, resp: resp, fs: fs, dur: dur, beats: beats.filter(b => b.r < dur), marks: marks, af: af, hasResp: !!P.rmode,
      peaks: { S: S, D: D, A: pk('aC', -1), sRev: sRev, sReversed: sRev > 5, sd: sdr, sff: S > 0 && D > 0 ? S / (S + D) * 100 : (S <= 0 ? 0 : null), dRev: dRev, drRatio: kind === 'hv' ? drRatio : null } };
  }

  /* ================================================================== the introduction: what a focused scan answers ================================================================== */
  const START = [
    { id: 'lv', q: 'Is the LV failing?', views: 'PLAX · PSAX · A4C', sign: 'Walls barely thicken; the mitral leaflet stays far from the septum', number: 'EPSS over 7 mm', go: 'echo_assess' },
    { id: 'rv', q: 'Is the RV dilated?', views: 'A4C · PSAX', sign: 'RV as big as the LV; a D-shaped septum', number: 'RV:LV over 0.6 · TAPSE under 17 mm', go: 'echo_assess' },
    { id: 'eff', q: 'Is there an effusion?', views: 'Subcostal · PLAX', sign: 'A black band around the heart; a chamber wall that collapses', number: 'Over 2 cm is large', go: 'echo_assess' },
    { id: 'ivc', q: 'Full or empty?', views: 'Subcostal IVC', sign: 'A slit that collapses, or a round vein that does not', number: '2.1 cm and 50% collapse', go: 'echo_assess' },
    { id: 'sv', q: 'Is the stroke volume adequate?', views: 'A5C', sign: 'Pulsed Doppler in the LVOT', number: 'VTI 18–22 cm; under 15 is low', go: 'echo_assess' },
    { id: 'lung', q: 'Wet or dry lungs?', views: 'Anterior and lateral chest', sign: 'B-lines, or A-lines with sliding', number: 'Three or more B-lines in a zone', go: 'echo_lung' }
  ];
  const MOVES = [
    { id: 'slide', name: 'Slide', say: 'Move the footprint across the skin to a new window.' },
    { id: 'rotate', name: 'Rotate', say: 'Turn the probe about its own axis: long axis becomes short axis.' },
    { id: 'tilt', name: 'Tilt', say: 'Fan the plane through the heart; the footprint stays put.' },
    { id: 'rock', name: 'Rock', say: 'Angle within the plane to centre the structure on the screen.' }
  ];

  /* ================================================================== the pages ================================================================== */
  const SOURCES = [
    'Lang RM, et al. Recommendations for cardiac chamber quantification by echocardiography in adults: an update from the American Society of Echocardiography and the European Association of Cardiovascular Imaging. J Am Soc Echocardiogr 2015;28:1–39.',
    'Rudski LG, et al. Guidelines for the echocardiographic assessment of the right heart in adults. J Am Soc Echocardiogr 2010;23:685–713.',
    'Nagueh SF, et al. Recommendations for the evaluation of left ventricular diastolic function by echocardiography and for heart failure with preserved ejection fraction diagnosis: an update from the American Society of Echocardiography. J Am Soc Echocardiogr 2025;38:537–69.',
    'Baumgartner H, et al. Recommendations on the echocardiographic assessment of aortic valve stenosis: a focused update from the European Association of Cardiovascular Imaging and the American Society of Echocardiography. J Am Soc Echocardiogr 2017;30:372–92.',
    'Zoghbi WA, et al. Recommendations for noninvasive evaluation of native valvular regurgitation: a report from the American Society of Echocardiography developed in collaboration with the Society for Cardiovascular Magnetic Resonance. J Am Soc Echocardiogr 2017;30:303–71.',
    'Baumgartner H, et al. Echocardiographic assessment of valve stenosis: EAE/ASE recommendations for clinical practice. J Am Soc Echocardiogr 2009;22:1–23.',
    'Otto CM, et al. 2020 ACC/AHA guideline for the management of patients with valvular heart disease. Circulation 2021;143:e72–227. Vahanian A, et al. 2021 ESC/EACTS guidelines for the management of valvular heart disease. Eur Heart J 2022;43:561–632.',
    'Wilkins GT, et al. Percutaneous balloon dilatation of the mitral valve: an analysis of echocardiographic variables related to outcome and the mechanism of dilatation. Br Heart J 1988;60:299–308.',
    'Garcia D, et al. Assessment of aortic valve stenosis severity: a new index based on the energy loss concept. Circulation 2000;101:765–71.',
    'Welch TD, et al. Echocardiographic diagnosis of constrictive pericarditis: Mayo Clinic criteria. Circ Cardiovasc Imaging 2014;7:526–34.',
    'Fadel BM, et al. Spectral Doppler interrogation of the pulmonary veins for the diagnosis of cardiac disorders: a comprehensive review. J Am Soc Echocardiogr 2021;34:223–36. Nagueh SF, et al. Relation of mean right atrial pressure to echocardiographic and Doppler parameters of right atrial and right ventricular function. Circulation 1996;93:1160–9.'
  ];
  const partRow = (id, D) => [D.name, D.unit].concat(['m', 'f'].map(s => { const p = D[s]; return [rangeText(p, D.dp), fmt(p[1] + Math.pow(10, -D.dp), D.dp) + '–' + fmt(p[2], D.dp), fmt(p[2] + Math.pow(10, -D.dp), D.dp) + '–' + fmt(p[3], D.dp), '> ' + fmt(p[3], D.dp)].join(' · '); }));
  const topics = {};
  topics.echo_values = { title: 'Chamber sizes and their cut-offs', kicker: 'What a full study is graded against: normal ranges, the partitions for mild, moderate and severe, LV mass and geometry', blocks: [
    { p: 'A focused scan eyeballs; the full study measures and grades. Type the measurements from a report (or your own) and each is placed against its range for the patient’s sex. Wall thicknesses and the cavity give the LV mass and the geometry.' },
    { widget: 'echochambers' },
    { fold: 'Left ventricle: the full table', blocks: [{ table: { head: ['Measure', 'Unit', 'Men: normal · mild · moderate · severe', 'Women: normal · mild · moderate · severe'], rows: ['lvidd', 'lviddI', 'lvids', 'lvidsI', 'ivs', 'pw', 'lvmass', 'lvmassI'].map(id => partRow(id, GRADED[id])) } },
      { ul: ['LV mass (linear, cube formula) = 0.8 × 1.04 × [(LVIDd + IVSd + PWd)³ − LVIDd³] + 0.6 g, from the parasternal long axis at end-diastole.', 'Relative wall thickness = 2 × PWd ÷ LVIDd; above 0.42 the walls are thick for the cavity.', 'Geometry: a normal mass index (95 g/m² or less in women, 115 or less in men) with a relative wall thickness of 0.42 or less is normal; thick walls with a normal mass, concentric remodelling; thick walls with a raised mass, concentric hypertrophy; a raised mass with a wall thickness of 0.42 or less, eccentric hypertrophy.', 'The cube formula assumes a symmetric ventricle: a septal bulge, asymmetric hypertrophy or a regional scar makes it wrong, and a 1 mm error in a wall is cubed.'] }] },
    { fold: 'Atria: the full table', blocks: [{ table: { head: ['Measure', 'Normal', 'Mild', 'Moderate', 'Severe'], rows: [['LA volume / BSA (mL/m²)', '16–34', '35–41', '42–48', '> 48'], ['LA area (cm²)', '≤ 20', '21–30', '31–40', '≥ 41'], ['LA antero-posterior diameter (cm)', '3.0–4.0 men · 2.7–3.8 women', '', '', ''], ['LA diameter / BSA (cm/m²)', '1.5–2.3', '', '', ''], ['RA area (cm²)', '≤ 18', 'enlarged above 18', '', ''], ['RA volume / BSA, 2D (mL/m²)', '25 ± 7 men · 21 ± 6 women', '', '', ''], ['RA minor axis / BSA (cm/m²)', '1.9 ± 0.3', '', '', ''], ['RA major axis / BSA (cm/m²)', '2.4 ± 0.3 men · 2.5 ± 0.3 women', '', '', '']] } },
      { ul: ['The LA volume index (biplane, from the apical four- and two-chamber views at end-systole) is the measure to use: the antero-posterior diameter misses an atrium that enlarges lengthways.', 'A large LA is a record of pressure and volume over months. It also enlarges with atrial fibrillation, mitral disease, anaemia and in athletes.'] }] },
    { fold: 'Right ventricle: the full table', blocks: [{ table: { head: ['Measure', 'Unit', 'Men', 'Women'], rows: Object.keys(RANGES).filter(id => RANGES[id].group === 'rv').map(id => [RANGES[id].name, RANGES[id].unit, rangeText(RANGES[id].m, RANGES[id].dp), rangeText(RANGES[id].f, RANGES[id].dp)]) } },
      { ul: ['Measure the RV in an RV-focused apical four-chamber view; a foreshortened or rotated view changes the basal diameter by a centimetre.', 'A wall over 5 mm (subcostal or parasternal, end-diastole) means the pressure load is chronic.'] }] },
    { fold: 'Aortic root: the full table', blocks: [{ table: { head: ['Level', 'Men (cm)', 'Women (cm)', 'Men, indexed (cm/m²)', 'Women, indexed (cm/m²)'], rows: ['aoAnn', 'aoSinus', 'aoStj', 'aoAsc'].map(id => { const D = MEANSD[id]; const pm = (q) => fmt(q[0], 1) + ' ± ' + fmt(q[1], 1); return [D.name, pm(D.m), pm(D.f), pm(D.mi), pm(D.fi)]; }) } },
      { ul: ['Mean ± SD; two SD above the mean is the upper limit. Measured in the parasternal long axis: the annulus in mid-systole inner edge to inner edge, the rest at end-diastole leading edge to leading edge.', 'The root grows with body size and age: index it in the small and the large.'] }] },
    { go: [['echo_diastology', 'Diastolic function', 'e′, E/e′ and the LA pressure'], ['echo_valves', 'The valves by the numbers', 'grading and the calculators'], ['echo_log', 'Your logbook', 'record what you measured']] },
    { src: [SOURCES[0], SOURCES[1]] }
  ] };
  topics.echo_diastology = { title: 'Diastolic function and LA pressure', kicker: 'The 2025 ASE algorithm: three variables, a second tier, and separate routes for atrial fibrillation and a calcified annulus', blocks: [
    { p: 'Is the relaxation slow (e′), is the filling pressure pushing the E wave up against it (E/e′), and has the pressure reached the lungs (TR velocity)? Type what was measured and the sheet walks the algorithm, showing each step it took.' },
    { widget: 'echodiast' },
    { fold: 'The algorithm in words', blocks: [{ ol: [
      'Three variables. Reduced e′: septal 6 cm/s or less, lateral 7 or less, or their average 6.5 or less. Increased E/e′: septal 15 or more, lateral 13 or more, or average 14 or more. Increased TR velocity (2.8 m/s or more) or PA systolic pressure (35 mm Hg or more).',
      'All three normal: normal diastolic function.',
      'Only e′ reduced: with an E/A of 0.8 or less, grade 1 with a normal LA pressure; with an E/A above 0.8, go to the second tier.',
      'Only the TR velocity or only E/e′ raised, or any two of the three abnormal: go to the second tier.',
      'Second tier (any one is enough): pulmonary vein S/D of 0.67 or less, LA reservoir strain of 18% or less, LA volume index above 34 mL/m²; or, alternatively, an IVRT of 70 ms or less. None present: the LA pressure is normal. One or more: it is increased.',
      'All three abnormal, or the second tier positive: increased LA pressure. E/A under 2 is grade 2; 2 or more is grade 3.'] },
      { ul: ['Age-specific lower limits of e′ can be used in place of the fixed ones: under 7 septal, 10 lateral, 9 average at 20–39 years; under 6, 8 and 7 at 40–65; under 6, 7 and 6.5 over 65.', 'When no second-tier marker can be measured, the supplemental signs are ' + DI_SUPPLEMENT.join('; ') + '.', 'A grade 1 pattern in a breathless patient is the indication for a diastolic exercise echo.'] }] },
    { fold: 'When the algorithm does not apply', blocks: [{ p: 'It is for patients in sinus rhythm without: ' + DI_EXCEPT.join('; ') + '.' }, { table: { head: ['Situation', 'What to use instead'], rows: [
      ['Atrial fibrillation', 'Four variables: E 100 cm/s or more, septal E/e′ above 11, TR velocity above 2.8 m/s (or PASP above 35), deceleration time 160 ms or less. None or one: normal LA pressure. Three or more: raised. Two: LA reservoir strain under 18%, pulmonary vein S/D under 1, BMI above 30 — two or three raised, none normal, one indeterminate.'],
      ['Moderate or severe annular calcification', 'E/A under 0.8 normal, above 1.8 raised; between them an IVRT of 80 ms or more is normal and under 80 raised.'],
      ['Pulmonary hypertension', 'Use the lateral E/e′ (the septum is flattened): above 13 the LA pressure is raised, under 8 it is normal. An E/A of 0.8 or less favours a pre-capillary cause, 2 or more a post-capillary one.'],
      ['Transplanted heart', 'Average E/e′ under 7 normal, above 14 raised; in between, strain-based measures or the TR velocity.'],
      ['Constriction against restriction', 'Constriction: a septal bounce, respiratory variation of mitral inflow above 25%, a septal e′ that is normal or high (often above 7 cm/s, and higher than the lateral), expiratory diastolic reversal in the hepatic vein of 0.8 or more. Restriction: a septal e′ of 5 cm/s or less.'],
      ['Severe mitral regurgitation, normal ejection fraction', 'Pulmonary vein Ar lasting more than 30 ms longer than the mitral A wave; E/e′ only when the ejection fraction is reduced.']] } }] },
    { go: [['echo_veins', 'Pulmonary and hepatic vein Doppler', 'the S/D ratio drawn'], ['echo_values', 'Chamber sizes', 'the LA volume index'], ['hemo_calc', 'The hemos calculator', 'when the pressure is measured']] },
    { src: [SOURCES[2], SOURCES[9]] }
  ] };
  topics.echo_valves = { title: 'The valves by the numbers', kicker: 'For each lesion: the grading table, the criteria that settle mild or severe, the calculators, and what misleads them', blocks: [
    { p: 'Grading a valve is an integration: the valve’s appearance, a few specific signs, and the quantities worked out from Doppler. Pick the lesion; tick what you see, type what was measured, and the sheet shows the arithmetic and the reading.' },
    { widget: 'echovalves' },
    { fold: 'Formulas on one page', blocks: [{ table: { head: ['Quantity', 'Formula', 'Used for'], rows: [
      ['Area of an outflow tract', 'π × (diameter ÷ 2)² = 0.785 × d²', 'Every stroke volume'],
      ['Stroke volume', 'area × VTI', 'LVOT, RVOT, mitral annulus'],
      ['Continuity valve area', 'LVOT area × LVOT VTI ÷ valve VTI', 'Aortic and mitral stenosis'],
      ['Velocity ratio', 'LVOT VTI ÷ aortic valve VTI', 'Aortic stenosis when the LVOT diameter is in doubt'],
      ['Pressure gradient', '4 × velocity²', 'Peak gradients; RV systolic pressure with the RA pressure added'],
      ['Mitral valve area by half-time', '220 ÷ pressure half-time', 'Mitral stenosis (190 ÷ half-time for the tricuspid valve)'],
      ['PISA flow and EROA', 'EROA = 2π × radius² × aliasing velocity ÷ peak jet velocity', 'Mitral, aortic and tricuspid regurgitation'],
      ['PISA valve area in stenosis', '2π × radius² × aliasing velocity ÷ peak inflow velocity × (α ÷ 180)', 'Mitral stenosis; α is the angle between the leaflets'],
      ['Regurgitant volume', 'EROA × jet VTI, or the difference of two stroke volumes', 'All regurgitant lesions'],
      ['Regurgitant fraction', 'regurgitant volume ÷ the total stroke volume through the leaking valve', 'All regurgitant lesions'],
      ['Energy-loss area', 'AVA × aortic area ÷ (aortic area − AVA)', 'Aortic stenosis with an ascending aorta under 3 cm'],
      ['PR index', 'duration of the regurgitant signal ÷ duration of diastole', 'Pulmonary regurgitation']] } }] },
    { go: [['echo_veins', 'Pulmonary and hepatic vein Doppler', 'the upstream signs of severe regurgitation'], ['echo_values', 'Chamber sizes', 'the ventricle’s response to the lesion'], ['echo_assess', 'The focused assessments', 'valves at a glance']] },
    { src: [SOURCES[3], SOURCES[4], SOURCES[5], SOURCES[6], SOURCES[7], SOURCES[8]] }
  ] };
  topics.echo_veins = { title: 'Pulmonary and hepatic vein Doppler', kicker: 'The atria seen from upstream: what each wave is, and the patterns that pericardial disease, regurgitation and a raised pressure leave', blocks: [
    { p: 'Venous flow into an atrium has the same waves on both sides of the heart: forward in systole as the atrium relaxes and the annulus descends, forward in diastole as the ventricle fills, and briefly backwards when the atrium contracts. Whatever raises the atrial pressure or sends a jet into the atrium changes the balance between them.' },
    { widget: 'echoveins' },
    { fold: 'The cut-offs that go with the patterns', blocks: [{ table: { head: ['Finding', 'Cut-off', 'Means'], rows: [
      ['Pulmonary vein S/D', '0.67 or less (systolic filling fraction 40% or less)', 'Raised LA pressure (sinus rhythm); under 1 in the atrial fibrillation second step'],
      ['Pulmonary vein Ar velocity', 'over 35 cm/s', 'Raised LV end-diastolic pressure'],
      ['Ar duration − mitral A duration', 'more than 30 ms', 'Raised LV end-diastolic pressure, even when the mean LA pressure is still normal'],
      ['Pulmonary vein systolic flow reversal', 'present', 'Severe mitral regurgitation (specific; blunting is not)'],
      ['Hepatic vein systolic filling fraction', 'under 55%', 'Raised RA pressure'],
      ['Hepatic vein systolic flow reversal', 'present', 'Severe tricuspid regurgitation'],
      ['Hepatic vein expiratory diastolic reversal ÷ forward velocity', '0.8 or more', 'Constrictive pericarditis'],
      ['Reversals that grow on inspiration', 'present', 'Restrictive cardiomyopathy, a stiff right ventricle']] } },
      { ul: ['Both veins lose the atrial wave and most of the systolic wave in atrial fibrillation: a blunted S then means nothing by itself.', 'Tamponade: hepatic vein forward flow becomes confined to systole, and in expiration the diastolic wave disappears or reverses.', 'The pulmonary vein signal is the hardest of these to record, least of all in a ventilated patient; colour Doppler at a low scale helps to find the right upper vein beside the atrial septum.'] }] },
    { go: [['echo_diastology', 'Diastolic function', 'where the S/D ratio is used'], ['echo_valves', 'The valves by the numbers', 'mitral and tricuspid regurgitation'], ['mon_cvp', 'The CVP trace', 'the same waves as pressure']] },
    { src: [SOURCES[2], SOURCES[4], SOURCES[9], SOURCES[10]] }
  ] };
  if (ECHO) {
    Object.keys(topics).forEach(k => { ECHO.topics[k] = topics[k]; });
    if (!ECHO.groups.some(g => g.ids.indexOf('echo_values') >= 0)) { const at = ECHO.groups.findIndex(g => g.ids.indexOf('echo_assess') >= 0); ECHO.groups.splice(at + 1, 0, { title: 'The full study', ids: ['echo_values', 'echo_diastology', 'echo_valves', 'echo_veins'] }); }
  }

  root.PFT_ECHOVALS = { GRADED: GRADED, RANGES: RANGES, MEANSD: MEANSD, CH_FIELDS: CH_FIELDS, DI_FIELDS: DI_FIELDS, E_PRIME_AGE: E_PRIME_AGE, DI_EXCEPT: DI_EXCEPT, DI_SUPPLEMENT: DI_SUPPLEMENT, VALVES: VALVES, VALVE_ORDER: VALVE_ORDER, PV: PV, HV: HV, START: START, MOVES: MOVES, SOURCES: SOURCES, topics: topics, GRADE_WORD: GRADE_WORD, SEV: SEV,
    num: num, fmt: fmt, grade: grade, inRange: inRange, zOf: zOf, lvMass: lvMass, geometry: geometry, chambers: chambers, diast: diast, valve: valve, pisa: pisa, veinSeries: veinSeries, bsaOf: bsaOf, rangeText: rangeText };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PFT_ECHOVALS;
})(typeof window !== 'undefined' ? window : globalThis);
