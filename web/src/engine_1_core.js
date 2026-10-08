/* ==========================================================================
   PFT Interpreter engine — part 1: constants, helpers, schema, state
   Spine: ERS/ATS 2022 technical standard on interpretive strategies
          (z-scores / LLN), the adult PFT phrase catalog v1.0.0 (handed over
          with PFT_Rules_and_Integration.txt; original wording anchored to the
          2022/2019/2023/2017 standards), Annals ATS 2025 codes (S/V/D),
          ATS/ERS 2019 spirometry grading, Kaminsky 2018 (muscle, challenge,
          6MWT, CPET) and Owens 1987 (isolated low RV).
   Rule of the engine: a measurement state is computed before any wording is
   chosen; unknown never becomes normal; quality gates classification.
   ========================================================================== */
(function (root) {
'use strict';

const Z_LLN = -1.645, Z_ULN = 1.645;
const CFG = { band: 0.25 };          // "near LLN" review flag = within this many SD above the LLN (a local convention, never a category)
const STYLES = ['concise', 'standard', 'expanded', 'numeric'];   // wording levels of the phrase catalog

/* ------------------------------------------------------------------ utils */
function num(v) {
  if (v === null || v === undefined || v === '') return NaN;
  if (typeof v === 'number') return isFinite(v) ? v : NaN;
  let s = String(v).trim().replace(/[−‒–—]/g, '-').replace(/\s+/g, '');
  if (s === '' || s === '-' || s === '.' || s === '+') return NaN;
  s = s.replace(',', '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  const n = Number(s);
  return isFinite(n) ? n : NaN;
}
const has = (x) => typeof x === 'number' && isFinite(x);
function r1(x) { return Math.round(x * 10) / 10; }
function fmt(x, d) {
  if (!has(x)) return '';
  const k = (d === undefined) ? 1 : d;
  let s = x.toFixed(k);
  if (/^-0(\.0*)?$/.test(s)) s = s.slice(1);
  return s;
}
function fz(z) { const s = fmt(z, 1); return (z > 0 && s !== '0.0') ? '+' + s : s; }
function fsign(x, d) { const s = fmt(x, d); return (x > 0 && !/^0(\.0*)?$/.test(s)) ? '+' + s : s; }
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function sentence(s) {
  s = String(s || '').trim();
  if (!s) return '';
  if (!/^[a-z][A-Z]/.test(s)) s = cap(s);      // keep "pH", "mL" etc. as written
  return /[.!?]$/.test(s) ? s : s + '.';
}
function ageInterp(lo, hi, age, a0, a1) { // linear interpolation helper
  if (age <= a0) return lo;
  if (age >= a1) return hi;
  return lo + (hi - lo) * (age - a0) / (a1 - a0);
}

/* ---------------------------------------------------- category machinery */
function sevFromZ(z) { return z >= -2.5 ? 'mild' : (z >= -4.0 ? 'mod' : 'sev'); }

function catFromZ(z, kind) {
  const hasBL = (kind === 'grade' || kind === 'gradeH' || kind === 'ratio');
  if (z > Z_ULN) return (kind === 'lo') ? 'wnl' : 'high';
  if (z >= Z_LLN) {
    if (hasBL && CFG.band > 0 && z < Z_LLN + CFG.band) return 'bl';
    return 'wnl';
  }
  if (kind === 'hi') return 'wnl';
  if (kind === 'grade' || kind === 'gradeH') return sevFromZ(z);
  return 'low';
}

/* Resolve a parameter state {c, z} -> fact object. A numeric z always overrides the button.
   rel is the documented reliability of that measurement: 'ok' | 'limited' | 'invalid'. An invalid measurement keeps
   its number for display but has state 'invalid' and never drives a pattern. Unknown ('nm') is never normal. */
function res(p, kind, rel) {
  p = p || {};
  const z = num(p.z);
  let cat = (p.c && p.c !== '') ? p.c : 'nm';
  const hz = has(z);
  if (hz) cat = catFromZ(z, kind);
  rel = rel || 'ok';
  const measured = cat !== 'nm';
  const invalid = measured && rel === 'invalid';
  const low = !invalid && (cat === 'mild' || cat === 'mod' || cat === 'sev' || cat === 'low');
  const sev = invalid ? null : (cat === 'mild' ? 'mild' : cat === 'mod' ? 'moderate' : cat === 'sev' ? 'severe' : null);
  const state = !measured ? 'not_measured' : (invalid ? 'invalid' : (low ? 'low' : (cat === 'high' ? 'high' : 'normal')));
  return {
    kind: kind, cat: invalid ? 'inv' : cat, raw: cat, z: hz ? z : null, measured: measured, rel: rel, limited: measured && rel === 'limited',
    state: state, invalid: invalid,
    low: low, high: !invalid && cat === 'high', bl: !invalid && cat === 'bl', wnl: !invalid && (cat === 'wnl' || cat === 'bl'),
    grade: invalid ? 0 : (({ mild: 1, mod: 2, sev: 3 })[cat] || 0), sev: sev,
    sevState: !measured || invalid ? 'unknown' : (sev || ((kind === 'grade' || kind === 'gradeH') ? 'preserved' : 'unknown')),
    zTxt: hz ? 'z = ' + fz(z) : ''
  };
}
function zp(r) { return r && r.zTxt ? ' (' + r.zTxt + ')' : ''; }

/* "FEV1 is moderately reduced (z = -3.1)" */
function describe(name, r) {
  if (!r || !r.measured) return '';
  let t;
  if (r.invalid) return name + ' is not interpretable (the maneuver did not meet quality criteria)' + zp(r);
  if (r.cat === 'wnl') t = 'is within normal limits';
  else if (r.cat === 'bl') t = 'is within normal limits but borderline (close to the LLN)';
  else if (r.cat === 'mild') t = 'is mildly reduced';
  else if (r.cat === 'mod') t = 'is moderately reduced';
  else if (r.cat === 'sev') t = 'is severely reduced';
  else if (r.cat === 'low') t = 'is below the LLN';
  else if (r.cat === 'high') t = 'is above the ULN';
  else t = 'is recorded';
  return name + ' ' + t + zp(r);
}
function sevWord(r) { return r && r.sev ? r.sev : (r && r.low ? 'reduced' : ''); }

/* ----------------------------------------------------------------- schema
   Field types: param(kind) | num | sel | chk | txt | date
   Kinds: grade (nm,wnl,bl,mild,mod,sev) | gradeH (+high) | ratio (nm,wnl,bl,low,high)
          both (nm,low,wnl,high) | hi (nm,wnl,high) | lo (nm,wnl,low)                     */
const KIND_OPTS = {
  grade:  [['nm', 'Not measured'], ['wnl', 'WNL'], ['bl', 'Near LLN'], ['mild', 'Mild ↓'], ['mod', 'Moderate ↓'], ['sev', 'Severe ↓']],
  gradeH: [['nm', 'Not measured'], ['wnl', 'WNL'], ['bl', 'Near LLN'], ['mild', 'Mild ↓'], ['mod', 'Moderate ↓'], ['sev', 'Severe ↓'], ['high', 'Above ULN ↑']],
  ratio:  [['nm', 'Not measured'], ['wnl', 'WNL'], ['bl', 'Near LLN'], ['low', 'Below LLN ↓'], ['high', 'Above ULN ↑']],
  both:   [['nm', 'Not measured'], ['low', 'Below LLN ↓'], ['wnl', 'WNL'], ['high', 'Above ULN ↑']],
  hi:     [['nm', 'Not measured'], ['wnl', 'WNL'], ['high', 'Above ULN ↑']],
  lo:     [['nm', 'Not measured'], ['wnl', 'WNL'], ['low', 'Below LLN ↓']]
};

/* Test catalogue (first screen) */
const TESTS = [
  { key: 'spiro',  group: 'Spirometry',            name: 'Spirometry',                       desc: 'FEV1, FVC, FEV1/FVC, quality grade' },
  { key: 'bd',     group: 'Spirometry',            name: 'Bronchodilator response',          desc: 'Pre/post FEV1 and FVC' },
  { key: 'fvl',    group: 'Spirometry',            name: 'Flow–volume loop',                 desc: 'Loop shape, PEF, FEV1/PEF, FIF50/FEF50' },
  { key: 'vol',    group: 'Volumes & gas transfer', name: 'Lung volumes',                    desc: 'TLC, RV, RV/TLC, FRC, SVC' },
  { key: 'dlco',   group: 'Volumes & gas transfer', name: 'DLCO / KCO / VA',                 desc: 'Single-breath diffusing capacity, Hb adjustment' },
  { key: 'raw',    group: 'Volumes & gas transfer', name: 'Airway resistance (Raw / sGaw)',  desc: 'Plethysmographic resistance' },
  { key: 'osc',    group: 'Volumes & gas transfer', name: 'Oscillometry (FOT / IOS)',        desc: 'R5, R5–R20, X5, AX, Fres' },
  { key: 'mip',    group: 'Muscle & posture',      name: 'MIP / MEP / SNIP',                 desc: 'Respiratory muscle strength, cough peak flow, MVV' },
  { key: 'post',   group: 'Muscle & posture',      name: 'Upright vs. supine',               desc: 'Postural FVC change, orthodeoxia' },
  { key: 'feno',   group: 'Airway biomarkers',     name: 'FeNO',                             desc: 'Fractional exhaled nitric oxide' },
  { key: 'bronch', group: 'Airway biomarkers',     name: 'Bronchoprovocation',               desc: 'Methacholine, mannitol, exercise, EVH' },
  { key: 'sixmw',  group: 'Exercise & gas exchange', name: '6-minute walk test',             desc: 'Distance, desaturation, HR recovery' },
  { key: 'cpet',   group: 'Exercise & gas exchange', name: 'Cardiopulmonary exercise test',  desc: 'Peak VO2, reserves, gas-exchange pattern' },
  { key: 'gas',    group: 'Exercise & gas exchange', name: 'Arterial blood gas',             desc: 'pH, PaCO2, PaO2, A–a gradient' },
  { key: 'prior',  group: 'Comparison',            name: 'Comparison with prior PFT(s)',     desc: '% change, annualised decline, thresholds' }
];

const PRESETS = [
  { name: 'Full PFT',                    tests: ['spiro', 'fvl', 'vol', 'dlco'] },
  { name: 'Spirometry only',             tests: ['spiro', 'fvl'] },
  { name: 'Spirometry + BD',             tests: ['spiro', 'fvl', 'bd'] },
  { name: 'Spiro + BD + volumes + FeNO', tests: ['spiro', 'fvl', 'bd', 'vol', 'feno'] },
  { name: 'ILD work-up',                 tests: ['spiro', 'fvl', 'vol', 'dlco', 'sixmw', 'prior'] },
  { name: 'Neuromuscular',               tests: ['spiro', 'fvl', 'vol', 'mip', 'post'] },
  { name: 'Asthma: spiro + BD + FeNO',   tests: ['spiro', 'fvl', 'bd', 'feno'] },
  { name: 'Methacholine challenge',      tests: ['spiro', 'fvl', 'bronch'] },
  { name: 'Pre-op: spiro + DLCO',        tests: ['spiro', 'fvl', 'dlco'] },
  { name: 'Exercise: 6MWT + CPET',       tests: ['sixmw', 'cpet'] }
];

const P = (id, label, kind, extra) => Object.assign({ id: id, label: label, type: 'param', kind: kind }, extra || {});
const N = (id, label, unit, extra) => Object.assign({ id: id, label: label, type: 'num', unit: unit || '' }, extra || {});
const S = (id, label, opts, extra) => Object.assign({ id: id, label: label, type: 'sel', opts: opts }, extra || {});
const C = (id, label, extra) => Object.assign({ id: id, label: label, type: 'chk' }, extra || {});
const T = (id, label, extra) => Object.assign({ id: id, label: label, type: 'txt' }, extra || {});
const M = (id, label, groups, extra) => Object.assign({ id: id, label: label, type: 'multi', groups: groups, opts: groups.reduce((a, g) => a.concat(g.opts), []) }, extra || {});
const NR = ['', 'Not entered'];      // blank first option

/* Common reasons PFTs are ordered (tap to select; anything else goes in the free-text box) */
const INDICATIONS = [
  { title: 'Most common reasons', opts: [
    ['dyspnea', 'Dyspnea'], ['cough', 'Chronic cough'], ['wheeze', 'Wheeze / chest tightness'], ['asthma', 'Asthma'], ['copd', 'COPD / emphysema'],
    ['ild', 'Interstitial lung disease'], ['preop', 'Pre-operative evaluation'], ['fu', 'Follow-up of known lung disease']] },
  { title: 'Other symptoms and findings', opts: [
    ['hypox', 'Unexplained hypoxemia'], ['imaging', 'Abnormal chest imaging'], ['postcovid', 'Post-COVID / post-infection']] },
  { title: 'Other known or suspected disease', opts: [
    ['sarc', 'Sarcoidosis'], ['ctd', 'Connective-tissue disease'], ['cf', 'Cystic fibrosis'], ['bronchiectasis', 'Bronchiectasis'],
    ['ph', 'Pulmonary hypertension'], ['nmd', 'Neuromuscular disease'], ['chestwall', 'Chest wall / obesity / kyphoscoliosis']] },
  { title: 'Risk, monitoring and other', opts: [
    ['drug', 'Drug-toxicity monitoring'], ['occ', 'Occupational / environmental exposure'], ['tx', 'Lung transplant evaluation / follow-up'],
    ['onc', 'Before / after chemotherapy or radiation'], ['screen', 'Smoking-related risk / lung-cancer screening'], ['disab', 'Impairment / disability evaluation']] }
];

/* Flow–volume loop gallery (drawn in the interface). Keys are stored in fvl.loop. Elements: key, name, teaching caption, plain visual description (used in the report). */
const LOOPS = [
  ['normal',  'Normal',                            'Sharp early peak, then a near-straight descent; smooth rounded inspiratory limb.', 'Rapid rise to a sharp peak, a near-straight descending limb and a smooth, rounded inspiratory limb'],
  ['concave', 'Obstruction (mild–moderate)',       'Concave, “scooped” descent after the peak: airflow obstruction, small-airway dysfunction or loss of elastic recoil.', 'Concave (scooped) descending limb of the expiratory curve after the peak'],
  ['sevobs',  'Severe obstruction / emphysema',    'Low early peak, marked scooping and a long low-flow tail; usually with air trapping.', 'Low early peak with marked scooping of the expiratory limb and a long low-flow tail'],
  ['convex',  'Restriction pattern',               'Small, tall, narrow loop: flows preserved or relatively high for a small volume (convex-upward limb).', 'Small, tall, narrow loop with a steep, convex-upward expiratory limb; flows are relatively preserved for the volume'],
  ['effort',  'Submaximal effort',                 'Rounded, late or blunted peak with an irregular curve; efforts do not reproduce.', 'Blunted or late peak with an irregular curve; the efforts do not reproduce'],
  ['slow',    'Hesitant (slow) start',             'Gradual rise to a late, low, rounded peak: the maneuver started slowly, so FEV1 and PEF are underestimated; check the back-extrapolated volume.', 'Slow rise to a late, low, rounded peak (hesitant start)'],
  ['weak',    'Muscle weakness',                   'Low rounded peak and a weak inspiratory limb: both limbs reduced, no sharp PEF.', 'Low rounded peak flow with a reduced inspiratory limb and no sharp peak'],
  ['expflat', 'Variable intrathoracic obstruction', 'Expiratory plateau (flow capped) with a normal inspiratory limb: tracheal tumor, tracheomalacia.', 'Plateau (flat top) of the expiratory limb with a preserved inspiratory limb'],
  ['inspflat', 'Variable extrathoracic obstruction', 'Inspiratory plateau with a preserved expiratory limb: vocal-cord dysfunction or paralysis, goiter.', 'Plateau (flat top) of the inspiratory limb with a preserved expiratory limb'],
  ['bothflat', 'Fixed upper-airway obstruction',   'Both limbs plateau, giving a box-like loop: tracheal stenosis or another fixed lesion.', 'Plateau of both limbs, giving a box-like loop'],
  ['saw',     'Saw-tooth',                         'Rapid oscillations on a limb: floppy airway wall, tremor, neuromuscular disease or sleep apnea.', 'Saw-tooth oscillations on a limb'],
  ['unilat',  'Biphasic expiration',               'Two-phase expiratory limb: unilateral main-bronchus obstruction or single-lung transplant.', 'Biphasic (two-phase) expiratory limb'],
  ['cough',   'Cough artifact',                    'Sharp spike or notch early in expiration; can lower FEV1 falsely, so repeat the maneuver.', 'Sharp spike or notch early in expiration'],
  ['early',   'Early termination',                 'Exhalation stops while flow is still high; FVC and FEV1/FVC are then unreliable.', 'Exhalation ends while flow is still high, with no plateau at the end']
];

const Q_OPTS = [['', 'Not graded'], ['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D'], ['E', 'E'], ['U', 'U'], ['F', 'F']];
const QC_OPTS = [['', 'Acceptable'], ['limited', 'Technical factors reduce confidence'], ['inv', 'Not interpretable']];
/* Documented maneuver limitations (ATS/ERS 2019 acceptability criteria). Each one limits a named component; none is inferred from a number. */
const LIMITS = [
  { title: 'Documented limitations (tap what the lab or the tracing shows)', opts: [
    ['repeat', 'Repeatability not met (FEV1 or FVC differ by more than 150 mL)'], ['early', 'Early termination (FVC may be underestimated)'],
    ['cough', 'Cough in the first second (FEV1 affected)'], ['insp', 'Incomplete inspiration (volumes underestimated)'], ['slow', 'Slow or hesitant start'],
    ['leak', 'Mouth leak'], ['glottic', 'Glottic closure'], ['varef', 'Variable effort between maneuvers'], ['fatigue', 'Testing limited by fatigue'], ['symptom', 'Testing limited by symptoms']] }
];
const HB_BASIS = [['', 'Not stated on the report'], ['un', 'Not adjusted for hemoglobin'], ['adj', 'Hemoglobin-adjusted']];
const HELD_OPTS = [['', 'Not recorded'], ['y', 'Withheld as required'], ['n', 'Not withheld']];
const ICS_OPTS = [['', 'Not recorded'], ['y', 'On corticosteroids'], ['n', 'Not on corticosteroids']];

const SCHEMA = {
  ctx: {
    title: 'Study details', src: 'ATS 2023 and ERS/ATS 2022 reference-set recommendations. No patient identifiers are collected.',
    groups: [
      { title: 'Study', fields: [
        { id: 'date', label: 'Date of study', type: 'date' },
        M('indic', 'Indication(s): tap all that apply', INDICATIONS),
        T('indication', 'Other indication (type only if not listed above)', { ph: 'e.g. recurrent pneumonia, pre-bariatric surgery' })
      ] },
      { title: 'Patient', fields: [
        N('age', 'Age', 'years', { min: 0, max: 120, step: 1 }),
        S('sex', 'Sex (as used for reference values)', [['', 'Not entered'], ['M', 'Male'], ['F', 'Female']]),
        S('smoke', 'Smoking status', [['', 'Not entered'], ['never', 'Never'], ['former', 'Former'], ['current', 'Current']])
      ] },
      { title: 'Height and weight (optional, for BMI)', opt: true, fields: [
        N('ht', 'Height', 'cm', { min: 50, max: 230, step: 0.5 }),
        N('wt', 'Weight', 'kg', { min: 5, max: 400, step: 0.5 })
      ] },
      { title: 'Reference equations (the recommended option is already selected)', opt: true, fields: [
        S('ref_spiro', 'Spirometry reference set', [['global', 'GLI Global, race-neutral (recommended, ATS 2023)'], ['gli2012', 'GLI-2012 (race-specific)'], ['other', 'Other / lab-specific']], { stack: true, hint: 'ATS 2023: race-neutral GLI Global replaces race-specific sets; the lab report decides which set produced the z-scores you enter' }),
        S('ref_vol', 'Lung-volume reference set', [['gli2021', 'GLI-2021 (recommended)'], ['other', 'Other / lab-specific']], { stack: true, hint: 'ERS/ATS 2022 recommends GLI-2021 volumes; no race adjustment (ATS 2023)' }),
        S('ref_dlco', 'DLCO reference set', [['gli2017', 'GLI-2017 (recommended)'], ['other', 'Other / lab-specific']], { stack: true, hint: 'ERS/ATS 2022 recommends GLI-2017 DLCO' }),
        S('hrmax_eq', 'Predicted maximal heart rate (6MWT and CPET)', [['tanaka', 'Tanaka: 208 − 0.7 × age (recommended)'], ['fox', '220 − age']], { stack: true, hint: 'Tanaka (meta-analysis of 351 studies, 18,712 subjects) fits better than 220 − age, which overestimates in older adults' }),
        S('aa_eq', 'Expected upper limit of the A–a gradient on room air', [['q4', 'Age/4 + 4'], ['p10', '(Age + 10)/4']], { stack: true, hint: 'Both are in clinical use; no single equation is clearly the better validated one, so borderline values are flagged' })
      ] }
    ]
  },

  spiro: {
    title: 'Spirometry', src: 'ERS/ATS 2022 Fig 8 & Table 5; Annals ATS 2025 Table 1 (S-codes); ATS/ERS 2019 quality grades.',
    intro: 'Tap a category for each index (or type a z-score in the small box). Order of reasoning: FEV1/FVC against the LLN, then the FEV1 z-score for severity, then the FVC for other pathology.',
    groups: [
      { title: 'Indices vs. reference (pre-bronchodilator)', quick: ['ratio', 'fev1', 'fvc'], fields: [
        P('ratio', 'FEV1/FVC', 'ratio', { hint: 'Below the LLN (z < −1.645) = airflow obstruction' }),
        P('fev1', 'FEV1', 'grade', { hint: 'z-score sets the severity of the impairment' }),
        P('fvc', 'FVC', 'gradeH', { hint: 'Low FVC with a low ratio = air trapping or coexisting restriction; needs lung volumes' }),
        P('fef', 'FEF25–75% (informational)', 'both', { hint: 'Not used to define obstruction or severity (ERS/ATS 2022)' })
      ] },
      { title: 'Quality (graded separately for FEV1 and FVC)', fields: [
        S('qual_fev1', 'FEV1 grade', Q_OPTS, { hint: 'ATS/ERS 2019: A–B good; C–E usable, reduced confidence; U usable only; F not usable' }),
        S('qual_fvc', 'FVC grade', Q_OPTS, { hint: 'A cough in the first second can spoil FEV1 while FVC stays usable, and early termination spoils FVC while FEV1 stays usable' }),
        S('effort', 'Effort / cooperation', [['', 'Adequate'], ['poor', 'Submaximal effort'], ['weak', 'Weakness suspected']]),
        M('limits', 'Limitations noted on the report', LIMITS, { hint: 'Only tap what is documented; the interpretation states which component each limitation affects' })
      ] },
      { title: 'Measured values (optional)', opt: true, fields: [
        N('fev1_abs', 'FEV1', 'L', { min: 0, max: 8, step: 0.01 }),
        N('fvc_abs', 'FVC', 'L', { min: 0, max: 10, step: 0.01 }),
        N('fev1_pct', 'FEV1', '% pred', { min: 0, max: 200, step: 1 }),
        N('fvc_pct', 'FVC', '% pred', { min: 0, max: 200, step: 1 })
      ] }
    ]
  },

  bd: {
    title: 'Bronchodilator response', src: 'ERS/ATS 2022 Box 1 (response = change > 10% of the predicted value in FEV1 and/or FVC); Annals ATS 2025 S61/S62.',
    intro: 'Tap what the lab report states. Typed pre/post values (under “optional”) are only needed if you want the change calculated.',
    groups: [
      { title: 'Response', fields: [
        S('resp', 'Significant response (> 10% of predicted)?', [['', 'Not entered'], ['none', 'No response in FEV1 or FVC'], ['fev1', 'FEV1 responded'], ['fvc', 'FVC responded'], ['both', 'FEV1 and FVC responded'], ['ind', 'Could not be assessed']], { hint: '"No response" means both FEV1 and FVC were assessed and neither rose by more than 10% of predicted' }),
        S('qc', 'Post-bronchodilator maneuver quality', QC_OPTS),
        P('post_ratio', 'Post-BD FEV1/FVC', 'ratio', { hint: 'Persistently below the LLN after the bronchodilator = persistent airflow obstruction' }),
        P('post_fev1', 'Post-BD FEV1', 'grade')
      ] },
      { title: 'Administration', fields: [
        S('agent', 'Bronchodilator given', [['', 'Not recorded'], ['albuterol 400 mcg', 'Albuterol 400 mcg'], ['albuterol plus ipratropium', 'Albuterol + ipratropium'], ['another bronchodilator', 'Other']]),
        S('held', 'Home bronchodilators', HELD_OPTS)
      ] },
      { title: 'Volumes in litres (optional, calculates the change)', opt: true, fields: [
        N('fev1_pre', 'FEV1 pre', 'L', { step: 0.01 }), N('fev1_post', 'FEV1 post', 'L', { step: 0.01 }), N('fev1_pred', 'FEV1 predicted', 'L', { step: 0.01 }),
        N('fvc_pre', 'FVC pre', 'L', { step: 0.01 }), N('fvc_post', 'FVC post', 'L', { step: 0.01 }), N('fvc_pred', 'FVC predicted', 'L', { step: 0.01 })
      ] },
      { title: 'Or the change as reported (optional)', opt: true, fields: [
        N('dfev1_pp', 'Δ FEV1', '% of predicted', { step: 0.1, hint: 'positive = increase' }),
        N('dfvc_pp', 'Δ FVC', '% of predicted', { step: 0.1 })
      ] }
    ]
  },

  fvl: {
    title: 'Flow–volume loop', src: 'ERS/ATS 2022 Fig 8, Table 5 and Table 6 (PEF, FEV1/PEF > 8 mL/L/min, FIF50/FEF50); Annals ATS 2025 S10 and S51–S53; ATS/ERS 2019 acceptability criteria.',
    intro: 'Tap the shape that best matches the loop on the report, then add the flow indices if they were printed. The loop is read as an observation here; what it means is synthesised in the interpretation.',
    groups: [
      { title: 'Loop shape: tap the closest match', fields: [
        { id: 'loop', label: 'Loop shape', type: 'sel', ui: 'loop', opts: [['', 'Not described']].concat(LOOPS.map(l => [l[0], l[1]])) },
        C('loop_repro', 'Flattening or plateau is reproducible on repeat maneuvers')
      ] },
      { title: 'Flow indices', fields: [
        P('pef', 'PEF', 'lo', { hint: 'Below the LLN is expected with central/upper-airway obstruction, weakness or poor effort' }),
        S('fevpef', 'FEV1/PEF (mL/L/min)', [NR, ['hi', 'Above 8'], ['ok', '8 or below']], { hint: 'Above 8 suggests central or upper-airway obstruction' }),
        S('fifratio', 'FIF50/FEF50', [NR, ['lt', 'Below 1'], ['eq', 'About 1'], ['gt', 'Above 1']], { hint: 'ERS/ATS 2022 Table 6: < 1 variable extrathoracic; ≈ 1 fixed; > 1 variable intrathoracic' }),
        P('fif50c', 'FIF50% vs. reference', 'lo')
      ] },
      { title: 'Measured values (optional, calculates the ratios)', opt: true, fields: [
        N('pef_lmin', 'PEF', 'L/min', { step: 1, hint: 'FEV1/PEF also needs FEV1 in L on the Spirometry step' }),
        N('fef50', 'FEF50% (expiratory)', 'L/s', { step: 0.01 }),
        N('fif50', 'FIF50% (inspiratory)', 'L/s', { step: 0.01 })
      ] }
    ]
  },

  vol: {
    title: 'Lung volumes', src: 'ERS/ATS 2022 Fig 10 & Table 8; Annals ATS 2025 Table 2 (V-codes); Owens 1987 (isolated low RV).',
    intro: 'TLC defines restriction; a high RV/TLC defines air trapping. With a low ratio on spirometry, a low TLC means a mixed pattern.',
    groups: [
      { title: 'Method', fields: [
        S('method', 'Technique', [['', 'Not recorded'], ['pleth', 'Plethysmography'], ['n2', 'N2 washout'], ['he', 'Helium dilution'], ['sb', 'Single-breath']]),
        S('qc', 'Test quality', QC_OPTS)
      ] },
      { title: 'Indices vs. reference', quick: ['tlc', 'rvtlc'], fields: [
        P('tlc', 'TLC', 'gradeH', { hint: 'Low = restriction; high = hyperinflation or large lungs' }),
        P('rvtlc', 'RV/TLC', 'both', { hint: 'High = air trapping; with a low ratio on spirometry, hyperinflation with air trapping' }),
        P('rv', 'RV', 'both', { hint: 'Isolated low RV with otherwise normal tests is a clinically significant finding (Owens 1987)' }),
        P('frc', 'FRC', 'both'),
        P('frctlc', 'FRC/TLC', 'both'),
        P('svc', 'SVC (slow vital capacity)', 'gradeH', { hint: 'Volumes are referenced to SVC, not FVC' }),
        P('erv', 'ERV', 'both', { hint: 'Low ERV is typical of obesity' }),
        P('ic', 'IC', 'both')
      ] },
      { title: 'Measured values (optional)', opt: true, fields: [
        N('tlc_abs', 'TLC', 'L', { step: 0.01 }), N('rv_abs', 'RV', 'L', { step: 0.01 }),
        N('frc_abs', 'FRC', 'L', { step: 0.01 }), N('svc_abs', 'SVC', 'L', { step: 0.01 })
      ] }
    ]
  },

  dlco: {
    title: 'DLCO / KCO / VA', src: 'ERS/ATS 2022 Fig 11; Annals ATS 2025 Table 3 (D-codes); ERS/ATS 2017 DLCO standard (Hb reference 14.6 g/dL men, 13.4 women and children).',
    intro: 'Stratify DLCO by z-score. Read KCO only together with VA: a normal KCO does not exclude parenchymal or vascular loss when VA is low.',
    groups: [
      { title: 'Indices vs. reference', quick: ['dlco', 'va', 'kco'], fields: [
        P('dlco', 'DLCO as reported', 'gradeH'),
        S('basis', 'Is that DLCO hemoglobin-adjusted?', HB_BASIS, { hint: 'The adjustment basis changes what a low value means; when the report does not say, the interpretation says so rather than assuming' }),
        P('dlco_adj', 'Hb-adjusted DLCO (if the report shows both values)', 'gradeH', { hint: 'Leave blank unless the lab prints an adjusted value next to the unadjusted one' }),
        P('va', 'VA', 'both'),
        P('kco', 'KCO (DLCO/VA)', 'both')
      ] },
      { title: 'Blood and quality', fields: [
        S('hbcat', 'Hemoglobin', [NR, ['low', 'Low (anemia)'], ['nl', 'Normal'], ['high', 'High']]),
        S('cohbcat', 'Carboxyhemoglobin', [['', 'Not recorded'], ['nl', 'Below 2%'], ['hi', '2% or higher']], { hint: 'Raised COHb lowers DLCO by about 1% per 1%' }),
        S('vatlc', 'VA/TLC', [NR, ['ok', '0.85 or higher'], ['low', 'Below 0.85']], { hint: '0.85 is the Annals ATS 2025 convention, not a universal cut-off' }),
        S('qc', 'Test quality', QC_OPTS, { hint: 'Standard reporting needs two grade-A maneuvers within 2 mL/min/mmHg; a single usable maneuver is a limitation' }),
        S('single', 'Number of usable maneuvers', [['', 'Two or more'], ['one', 'Only one usable maneuver']])
      ] },
      { title: 'Measured values (optional)', opt: true, fields: [
        N('hb', 'Hemoglobin', 'g/dL', { step: 0.1, min: 3, max: 25 }),
        N('cohb', 'Carboxyhemoglobin', '%', { step: 0.1, min: 0, max: 40 }),
        N('dlco_abs', 'DLCO measured', 'mL/min/mmHg', { step: 0.1 }),
        N('dlco_pct', 'DLCO (not adjusted)', '% pred', { step: 1, hint: 'Enables an Hb-adjusted % predicted estimate' }),
        N('va_abs', 'VA', 'L', { step: 0.01, hint: 'With TLC on the Lung volumes step this gives VA/TLC' })
      ] }
    ]
  },

  raw: {
    title: 'Airway resistance', src: 'ERS/ATS 2022 Table 5 comments (Raw helps with a non-specific pattern); Kaminsky 2018 ch. 7.',
    intro: 'Plethysmographic resistance. Elevated Raw / sRaw or reduced sGaw indicates airway narrowing.',
    groups: [
      { title: 'Indices vs. reference', fields: [
        P('raw', 'Raw', 'hi'), P('sraw', 'sRaw', 'hi'), P('sgaw', 'sGaw', 'lo'),
        S('bd', 'Change after bronchodilator', [['', 'Not done'], ['imp', 'Improved'], ['none', 'No meaningful change']])
      ] }
    ]
  },

  osc: {
    title: 'Oscillometry', src: 'ERS technical standard on oscillometry (2020); categorical use: apply your lab’s reference equations.',
    intro: 'Tap a category or type a z-score from your lab’s reference set. For X5, “below LLN” means a more negative reactance than expected.',
    groups: [
      { title: 'Indices vs. reference', fields: [
        P('r5', 'R5', 'hi'), P('r520', 'R5–R20', 'hi'), P('x5', 'X5', 'lo'), P('ax', 'AX (reactance area)', 'hi'), P('fres', 'Fres', 'hi'),
        S('bdr', 'Bronchodilator response (per lab criteria)', [['', 'Not done'], ['pos', 'Significant response'], ['neg', 'No significant response']])
      ] }
    ]
  },

  mip: {
    title: 'Respiratory muscle strength', src: 'Kaminsky 2018 ch. 8 (MIP, MEP, SNIP thresholds); ERS/ATS 2022 Table 5 (muscle weakness pattern).',
    intro: 'Tap how each pressure compares with the reference. Typed pressures (optional) are compared with sex-specific thresholds when no category is chosen.',
    groups: [
      { title: 'Strength vs. reference', fields: [
        P('mip', 'MIP (maximal inspiratory pressure)', 'lo'), P('mep', 'MEP (maximal expiratory pressure)', 'lo'), P('snip', 'SNIP (sniff nasal pressure)', 'lo'),
        S('p01', 'P0.1 (respiratory drive)', [['', 'Not done'], ['low', 'Low'], ['wnl', 'Normal'], ['high', 'Elevated']]),
        S('cpfcat', 'Cough peak flow', [['', 'Not done'], ['ok', '270 L/min or more'], ['low', '161–269 L/min'], ['vlow', '160 L/min or less']], { hint: 'Below 270 L/min: reduced cough effectiveness; 160 or less: ineffective cough' }),
        S('effort', 'Effort and technique', [['', 'Adequate'], ['poor', 'Submaximal effort suspected'], ['bulbar', 'Mouth seal / bulbar limitation'], ['inv', 'Not interpretable']])
      ] },
      { title: 'Measured values (optional)', opt: true, fields: [
        N('mip_v', 'MIP (enter as a magnitude)', 'cmH2O', { step: 1, min: 0, hint: 'A negative sign is ignored: −60 is weaker than −100' }),
        N('mip_lln', 'MIP lower limit from the lab (magnitude)', 'cmH2O', { step: 1, min: 0, hint: 'If blank, commonly cited screening thresholds are used and named as such' }),
        N('mep_v', 'MEP', 'cmH2O', { step: 1, min: 0 }),
        N('mep_lln', 'MEP lower limit from the lab', 'cmH2O', { step: 1, min: 0 }),
        N('snip_v', 'SNIP', 'cmH2O', { step: 1, min: 0 }),
        N('snip_lln', 'SNIP lower limit from the lab', 'cmH2O', { step: 1, min: 0 }),
        N('cpf', 'Cough peak flow', 'L/min', { step: 1 }),
        N('mvv', 'MVV', 'L/min', { step: 1 })
      ] }
    ]
  },

  post: {
    title: 'Upright vs. supine', src: 'Postural VC fall bands (commonly used ATS/ERS respiratory-muscle thresholds); orthodeoxia definition (SpO2 ↓ ≥ 5 points or PaO2 ↓ > 4 mmHg).',
    intro: 'Seated/upright vs. supine vital capacity. A fall is expected to be small in healthy people.',
    groups: [
      { title: 'Result', fields: [
        S('which', 'Measured as', [['fvc', 'FVC'], ['svc', 'SVC']]),
        S('fall', 'Fall in VC from upright to supine', [NR, ['lt10', 'Under 10%'], ['b10_20', '10–19%'], ['b20_30', '20–29%'], ['ge30', '30% or more']], { hint: 'Under 10% expected; 20% or more suggests diaphragm weakness; 30% or more suggests bilateral weakness' }),
        S('orthodeox', 'Oxygen saturation on standing', [['', 'Not assessed'], ['no', 'No orthodeoxia'], ['yes', 'Orthodeoxia (fall of 5 points or more)']]),
        C('orthop', 'Orthopnea reported'), C('platyp', 'Platypnea reported'),
        C('limited', 'Postural comparison was incomplete or technically limited')
      ] },
      { title: 'Measured values (optional)', opt: true, fields: [
        N('up', 'VC upright / seated', 'L', { step: 0.01 }), N('sup', 'VC supine', 'L', { step: 0.01 }),
        N('spo2_sup', 'SpO2 supine', '%', { step: 1 }), N('spo2_up', 'SpO2 upright', '%', { step: 1 }),
        N('pao2_sup', 'PaO2 supine', 'mmHg', { step: 1 }), N('pao2_up', 'PaO2 upright', 'mmHg', { step: 1 })
      ] }
    ]
  },

  feno: {
    title: 'FeNO', src: 'ATS 2011 clinical practice guideline on FeNO interpretation (cut-points; significant change).',
    intro: 'Cut-points: adults < 25 / 25–50 / > 50 ppb; children (< 12 y) < 20 / 20–35 / > 35 ppb.',
    groups: [
      { title: 'Result', fields: [
        S('band', 'FeNO level', [NR, ['low', 'Low'], ['int', 'Intermediate'], ['high', 'High']], { hint: 'Adult: low < 25, intermediate 25–50, high > 50 ppb' }),
        S('ics', 'Corticosteroid therapy', ICS_OPTS),
        C('confound', 'Possible confounder (recent exercise, spirometry, nitrate-rich food, viral infection)')
      ] },
      { title: 'Measured value (optional)', opt: true, fields: [N('val', 'FeNO', 'ppb', { step: 1, min: 0 })] }
    ]
  },

  bronch: {
    title: 'Bronchoprovocation', src: 'Kaminsky 2018 ch. 9 (PC20/PD20 categories, safety threshold); mannitol 15% fall (cumulative ≤ 635 mg); ATS 2013 exercise/EVH ≥ 10% fall.',
    intro: 'Choose the challenge, then tap the result.',
    groups: [
      { title: 'Challenge', fields: [
        S('type', 'Type', [['mch', 'Methacholine'], ['man', 'Mannitol'], ['ex', 'Exercise'], ['evh', 'Eucapnic hyperpnea']]),
        S('base_ok', 'Baseline FEV1 before the challenge', [NR, ['ok', 'Above 60% predicted and 1.5 L or more'], ['low', '60% predicted or less, or under 1.5 L']], { hint: 'Safety threshold for methacholine' }),
        S('ics', 'Corticosteroid therapy', ICS_OPTS)
      ] },
      { title: 'Methacholine result', when: { f: 'type', is: ['mch'] }, fields: [
        S('mch_cat', 'Result as categorised by the lab', [NR, ['neg', 'Negative'], ['bl', 'Borderline'], ['mild', 'Mild'], ['mod', 'Moderate'], ['marked', 'Marked']], { hint: 'ERS 2017: PC20 > 16 normal; 4–16 borderline; 1–4 mild; 0.25–1 moderate; < 0.25 marked (mg/mL); PD20 > 400, 100–400, 25–100, 6–25, < 6 µg' }),
        S('complete', 'Protocol', [['', 'Completion not recorded'], ['y', 'Completed to the planned maximum'], ['n', 'Stopped before the planned maximum']], { hint: 'A study stopped early is incomplete, not negative' }),
        S('held', 'Relevant medications', [['', 'Not recorded'], ['y', 'Withheld per protocol'], ['n', 'Not withheld']]),
        C('diluent', 'FEV1 fell substantially after diluent, or the baseline was unstable'),
        C('indet', 'Technically indeterminate (unreliable serial FEV1 measurements)')
      ] },
      { title: 'Mannitol result', when: { f: 'type', is: ['man'] }, fields: [
        S('man_res', 'Result', [NR, ['pos', 'Positive'], ['neg', 'Negative']], { hint: 'Positive: 15% fall by a cumulative 635 mg, or a 10% incremental fall' }),
        C('man_incr', '10% or greater incremental fall between consecutive doses')
      ] },
      { title: 'Exercise / EVH result', when: { f: 'type', is: ['ex', 'evh'] }, fields: [
        S('ex_res', 'Result', [NR, ['neg', 'Negative (fall < 10%)'], ['mild', 'Mild (10–24%)'], ['mod', 'Moderate (25–49%)'], ['sev', 'Severe (50% or more)'], ['ind', 'Single time point only']]),
        C('ex_consec', 'Fall of 10% or more at two consecutive time points')
      ] },
      { title: 'After challenge', fields: [
        S('rev', 'Reversal with bronchodilator', [['', 'Not recorded'], ['y', 'Reversed'], ['n', 'Did not reverse']])
      ] },
      { title: 'Methacholine values (optional)', opt: true, when: { f: 'type', is: ['mch'] }, fields: [
        S('unit', 'Endpoint reported as', [['pc20', 'PC20 (mg/mL)'], ['pd20', 'PD20 (µg)']], { hint: 'PD20 needs the delivered dose; PC20 categories apply to the documented concentration protocol' }),
        S('protocol', 'Protocol (for PC20)', [['', 'Not stated'], ['wright2', 'English Wright 2-minute tidal breathing'], ['other', 'Other protocol']], { stack: true }),
        N('mch_val', 'PC20 / PD20', '', { step: 0.01, min: 0 }),
        C('mch_neg', 'No 20% fall in FEV1 at the highest dose or concentration'),
        N('mch_max', 'Highest dose or concentration delivered', '', { step: 0.01, min: 0, hint: 'Reported as "PD20/PC20 greater than" this value when no 20% fall occurred' }),
        N('mch_fall', 'Largest fall in FEV1', '%', { step: 0.1 }),
        N('rec_pct', 'FEV1 after bronchodilator, % of challenge baseline', '%', { step: 1 })
      ] },
      { title: 'Mannitol values (optional)', opt: true, when: { f: 'type', is: ['man'] }, fields: [
        N('man_fall', 'Largest fall in FEV1', '%', { step: 0.1 }),
        N('man_dose', 'Cumulative dose at the 15% fall', 'mg', { step: 1 })
      ] },
      { title: 'Exercise / EVH values (optional)', opt: true, when: { f: 'type', is: ['ex', 'evh'] }, fields: [
        N('ex_fall', 'Largest fall in FEV1', '%', { step: 0.1 })
      ] },
      { title: 'Baseline FEV1 values (optional)', opt: true, fields: [
        N('base_pct', 'Baseline FEV1', '% pred', { step: 1 }), N('base_L', 'Baseline FEV1', 'L', { step: 0.01 })
      ] }
    ]
  },

  sixmw: {
    title: '6-minute walk test', src: 'Kaminsky 2018 ch. 10 (MID 30 m, DSP ≤ 200 m% in IPF, 1-min HR recovery ≤ 13–18 bpm abnormal).',
    intro: 'Room-air values unless oxygen was used.',
    groups: [
      { title: 'Findings', fields: [
        S('dist_cat', 'Distance walked', [NR, ['wnl', 'Within normal limits'], ['low', 'Below the LLN']]),
        S('desat', 'Desaturation', [NR, ['none', 'None significant'], ['fall', 'Fall of 4 points or more, nadir above 88%'], ['le88', 'Nadir 88% or lower']]),
        S('hrr', 'Heart-rate recovery at 1 minute', [NR, ['nl', 'Normal'], ['abn', 'Abnormal (13–18 bpm or less)']]),
        S('o2', 'Oxygen', [['', 'Room air'], ['o2', 'Supplemental oxygen']]),
        S('stop', 'Completion', [['', 'Completed 6 minutes'], ['early', 'Stopped early']])
      ] },
      { title: 'Measured values (optional)', opt: true, fields: [
        N('dist', '6MWD', 'm', { step: 1 }), N('pred', 'Predicted', 'm', { step: 1 }), N('lln', 'LLN', 'm', { step: 1 }), N('pct', '% predicted', '%', { step: 1 }),
        S('eq', 'Reference equation', [['', 'Not stated'], ['Enright & Sherrill 1998', 'Enright & Sherrill 1998'], ['Casanova 2011', 'Casanova 2011'], ['Troosters 1999', 'Troosters 1999'], ['another equation', 'Other']], { stack: true }),
        N('spo2_base', 'SpO2 baseline', '%', { step: 1 }), N('spo2_nadir', 'SpO2 nadir', '%', { step: 1 }), N('spo2_end', 'SpO2 end', '%', { step: 1 }),
        N('hr_base', 'HR baseline', 'bpm', { step: 1 }), N('hr_peak', 'HR peak', 'bpm', { step: 1 }), N('hr_1min', 'HR at 1 min recovery', 'bpm', { step: 1 }),
        N('borg_base', 'Borg dyspnea baseline', '0–10', { step: 0.5 }), N('borg_end', 'Borg dyspnea end', '0–10', { step: 0.5 }),
        N('o2_flow', 'Oxygen flow', 'L/min', { step: 0.5 }),
        T('o2_desc', 'Oxygen device and setting (e.g. nasal cannula 2 L/min continuous, pulse-dose setting 3)'),
        N('time_min', 'Minutes walked (if stopped early)', 'min', { step: 0.5, min: 0, max: 6 }),
        T('stop_why', 'Reason (if stopped early)')
      ] }
    ]
  },

  cpet: {
    title: 'Cardiopulmonary exercise test', src: 'Kaminsky 2018 ch. 11, Tables 11.2 and 11.3 (age- and sex-based cut-offs, interpolated between the 20/40/60/80-year columns).',
    intro: 'Tap the finding for each variable. The cut-offs behind each choice are shown beside it; typed values (optional) are compared with Table 11.3 using age and sex.',
    groups: [
      { title: 'Capacity and effort', fields: [
        S('mode', 'Mode', [['', 'Not recorded'], ['cycle', 'Cycle'], ['tm', 'Treadmill']]),
        S('effort', 'Effort judged by the testing team', [['', 'Not stated'], ['max', 'Maximal'], ['sub', 'Submaximal']]),
        S('vo2_c', 'Peak VO2', [NR, ['nl', 'Normal (above 83% predicted)'], ['low', 'Reduced (83% or less)']]),
        S('lt_c', 'VO2 at the lactate threshold', [NR, ['nl', 'Normal'], ['low', 'Low']]),
        S('rer_c', 'Peak RER', [NR, ['ok', '1.00 or higher'], ['lo', 'Below 1.00']]),
        S('stop', 'Reason for stopping', [['', 'Not recorded'], ['dysp', 'Dyspnea'], ['leg', 'Leg fatigue'], ['both', 'Both'], ['cp', 'Chest pain'], ['ecg', 'ECG / arrhythmia'], ['bp', 'Blood pressure'], ['other', 'Other']])
      ] },
      { title: 'Cardiovascular', fields: [
        S('hr_c', 'Peak heart rate', [NR, ['nl', 'Reached 85% of predicted or more'], ['low', 'Below 85% of predicted']]),
        S('o2p_c', 'Peak O2 pulse', [NR, ['nl', 'Normal'], ['low', 'Low']]),
        S('hrr_c', 'Heart-rate recovery at 1 minute', [NR, ['nl', 'Normal'], ['abn', 'Abnormal (12 bpm or less)']])
      ] },
      { title: 'Ventilatory and gas exchange', fields: [
        S('vent_c', 'Ventilatory reserve (peak VE/MVV)', [NR, ['nl', 'Preserved'], ['low', 'Exhausted (VE/MVV above 0.80 men, 0.75 women)']]),
        S('slope_c', 'VE/VCO2 slope or nadir', [NR, ['nl', 'Normal'], ['high', 'Elevated']]),
        S('petco2_c', 'PETCO2 at the lactate threshold', [NR, ['nl', 'Normal'], ['low', 'Low']]),
        S('desat_c', 'Oxygen saturation', [NR, ['nl', 'No desaturation'], ['abn', 'Desaturation (fall of 5 or more, or below 93%)']])
      ] },
      { title: 'Measured values (optional)', opt: true, fields: [
        N('vo2_pct', 'Peak VO2', '% pred', { step: 1 }), N('vo2_abs', 'Peak VO2', 'mL/kg/min', { step: 0.1 }),
        N('lt_pct', 'VO2 at lactate threshold', '% of pred peak', { step: 1 }),
        N('hr_peak', 'Peak HR', 'bpm', { step: 1 }), N('hr_pct', 'Peak HR', '% pred max', { step: 1, hint: 'Blank = from the peak HR and age' }),
        N('o2p', 'Peak O2 pulse', 'mL/beat', { step: 0.1 }), N('hrr1', '1-min HR recovery', 'bpm', { step: 1 }),
        N('ve_mvv', 'Peak VE / MVV', 'ratio', { step: 0.01 }),
        N('vevco2', 'VE/VCO2 slope', '', { step: 0.1 }), N('vevco2_nadir', 'VE/VCO2 nadir', '', { step: 0.1 }),
        N('petco2', 'PETCO2 at LT', 'mmHg', { step: 0.5 }), N('vtic', 'Peak VT/IC', 'ratio', { step: 0.01 }),
        N('spo2_rest', 'SpO2 rest', '%', { step: 1 }), N('spo2_peak', 'SpO2 peak/nadir', '%', { step: 1 }),
        N('rer', 'Peak RER', '', { step: 0.01 }),
        N('borg_d', 'Borg dyspnea at peak', '0–10', { step: 0.5 }), N('borg_l', 'Borg leg effort at peak', '0–10', { step: 0.5 }),
        N('lactate', 'Peak lactate', 'mEq/L', { step: 0.1 })
      ] }
    ]
  },

  gas: {
    title: 'Arterial blood gas', src: 'Standard acid–base and alveolar-gas equations; expected A–a upper limit by the equation chosen on the Details step (room air).',
    intro: 'Tap each result. Typed values (optional) refine the interpretation: acute vs. chronic compensation and the A–a gradient.',
    groups: [
      { title: 'Results', fields: [
        S('ph_c', 'pH', [NR, ['acid', 'Acidemic (below 7.35)'], ['nl', 'Normal'], ['alk', 'Alkalemic (above 7.45)']]),
        S('co2_c', 'PaCO2', [NR, ['hypo', 'Low (below 35)'], ['nl', 'Normal'], ['hyper', 'High (above 45)']]),
        S('hco3_c', 'HCO3', [NR, ['lo', 'Low (below 22)'], ['nl', 'Normal'], ['hi', 'High (above 26)']]),
        S('o2_c', 'PaO2', [NR, ['nl', 'Normal'], ['mild', 'Mildly low (60–79)'], ['hyp', 'Hypoxemic (below 60)']]),
        S('fio2_c', 'Inspired oxygen', [['', 'Room air'], ['o2', 'Supplemental oxygen']]),
        S('aa_c', 'A–a gradient (room air)', [['', 'Not assessed'], ['nl', 'Normal for age'], ['wide', 'Widened']])
      ] },
      { title: 'Measured values (optional)', opt: true, fields: [
        N('ph', 'pH', '', { step: 0.01 }), N('paco2', 'PaCO2', 'mmHg', { step: 0.5 }), N('pao2', 'PaO2', 'mmHg', { step: 0.5 }),
        N('hco3', 'HCO3', 'mEq/L', { step: 0.5 }), N('sao2', 'SaO2', '%', { step: 0.5 }),
        N('fio2', 'FiO2', 'fraction', { step: 0.01, min: 0.21, max: 1 }), N('patm', 'Barometric pressure', 'mmHg', { step: 1 }),
        N('cohb', 'COHb', '%', { step: 0.1 })
      ] }
    ]
  }
};

const PRIOR_FIELDS = [
  { id: 'date',     label: 'Date',                  type: 'date' },
  { id: 'fev1',     label: 'FEV1',                  unit: 'L' },
  { id: 'fvc',      label: 'FVC',                   unit: 'L' },
  { id: 'fev1_pct', label: 'FEV1',                  unit: '% pred' },
  { id: 'fvc_pct',  label: 'FVC',                   unit: '% pred' },
  { id: 'fev1_z',   label: 'FEV1 z-score',          unit: 'z' },
  { id: 'tlc',      label: 'TLC',                   unit: 'L' },
  { id: 'dlco',     label: 'DLCO',                  unit: 'mL/min/mmHg' },
  { id: 'dlco_pct', label: 'DLCO (Hb-adjusted if available)', unit: '% pred' },
  { id: 'six',      label: '6MWD',                  unit: 'm' },
  { id: 'feno',     label: 'FeNO',                  unit: 'ppb' },
  { id: 'ref_diff',    label: 'Different reference equations from this study', type: 'chk' },
  { id: 'bd_diff',     label: 'Different bronchodilator state (pre vs. post)', type: 'chk' },
  { id: 'method_diff', label: 'Different lab, equipment or lung-volume method', type: 'chk' },
  { id: 'hb_diff',     label: 'Different hemoglobin-adjustment basis for DLCO', type: 'chk' },
  { id: 'qual_diff',   label: 'Quality differed between the two studies', type: 'chk' }
];
const CUR_FIELDS = [   // overrides for "current" values (blank = taken from this study)
  { id: 'fev1',     label: 'FEV1',                  unit: 'L' },
  { id: 'fvc',      label: 'FVC',                   unit: 'L' },
  { id: 'fev1_pct', label: 'FEV1',                  unit: '% pred' },
  { id: 'fvc_pct',  label: 'FVC',                   unit: '% pred' },
  { id: 'tlc',      label: 'TLC',                   unit: 'L' },
  { id: 'dlco',     label: 'DLCO',                  unit: 'mL/min/mmHg' },
  { id: 'dlco_pct', label: 'DLCO (Hb-adjusted if available)', unit: '% pred' },
  { id: 'six',      label: '6MWD',                  unit: 'm' },
  { id: 'feno',     label: 'FeNO',                  unit: 'ppb' }
];
const MAX_PRIORS = 4;
const MAX_TREND = 24;   // saved 6MWD points per case

function blankField(f) {
  if (f.type === 'param') return { c: 'nm', z: '' };
  if (f.type === 'chk') return false;
  if (f.type === 'multi') return [];
  if (f.type === 'sel') return f.opts[0][0];
  return '';
}
function blankModule(key) {
  const m = SCHEMA[key], o = {};
  m.groups.forEach(g => g.fields.forEach(f => { o[f.id] = blankField(f); }));
  return o;
}
function blankPrior() { const o = {}; PRIOR_FIELDS.forEach(f => { o[f.id] = f.type === 'chk' ? false : ''; }); return o; }
function blankTrendRow() { return { date: '', dist: '', nadir: '', o2: '' }; }

function defaultState() {
  const st = { v: 3, tests: {}, settings: { band: CFG.band, headsupInCopy: false, style: 'standard' }, review: {}, prior: { cur: {}, list: [blankPrior()] }, trend6: { list: [blankTrendRow()] } };
  TESTS.forEach(t => { st.tests[t.key] = (t.key === 'spiro' || t.key === 'fvl'); });
  Object.keys(SCHEMA).forEach(k => { st[k] = blankModule(k); });
  CUR_FIELDS.forEach(f => { st.prior.cur[f.id] = ''; });
  return st;
}

/* Merge an arbitrary (possibly older / hand-edited) state onto defaults so the engine never sees holes. */
function normalizeState(raw) {
  const st = defaultState();
  if (!raw || typeof raw !== 'object') return st;
  if (raw.tests && typeof raw.tests === 'object') Object.keys(st.tests).forEach(k => { if (k in raw.tests) st.tests[k] = !!raw.tests[k]; });
  if (raw.settings && typeof raw.settings === 'object') {
    if (has(num(raw.settings.band))) st.settings.band = Math.max(0, Math.min(1, num(raw.settings.band)));
    st.settings.headsupInCopy = !!raw.settings.headsupInCopy;
    if (STYLES.indexOf(raw.settings.style) >= 0) st.settings.style = raw.settings.style;
  }
  if (raw.review && typeof raw.review === 'object') Object.keys(raw.review).forEach(k => { if (raw.review[k] && /^[a-z0-9_.]+$/.test(k)) st.review[k] = true; });
  // v2 states had one spirometry grade (the lower of the two); v3 grades FEV1 and FVC separately
  if (raw.spiro && typeof raw.spiro === 'object' && raw.spiro.qual && !raw.spiro.qual_fev1 && !raw.spiro.qual_fvc) {
    raw = Object.assign({}, raw, { spiro: Object.assign({}, raw.spiro, { qual_fev1: raw.spiro.qual, qual_fvc: raw.spiro.qual }) });
  }
  // v2 states entered an unadjusted DLCO and optionally an adjusted one; v3 records the basis explicitly
  if (raw.dlco && typeof raw.dlco === 'object' && raw.dlco.basis === undefined && raw.dlco.dlco && typeof raw.dlco.dlco === 'object') {
    const entered = (p) => p && typeof p === 'object' && ((p.c && p.c !== 'nm') || (p.z !== undefined && p.z !== null && String(p.z) !== ''));
    if (entered(raw.dlco.dlco)) raw = Object.assign({}, raw, { dlco: Object.assign({}, raw.dlco, { basis: 'un' }) });
    else if (entered(raw.dlco.dlco_adj)) raw = Object.assign({}, raw, { dlco: Object.assign({}, raw.dlco, { dlco: raw.dlco.dlco_adj, dlco_adj: { c: 'nm', z: '' }, basis: 'adj' }) });
  }
  if (raw.spiro && typeof raw.spiro === 'object' && raw.spiro.loop && !(raw.fvl && raw.fvl.loop)) {   // v2 states kept the loop under spirometry
    raw = Object.assign({}, raw, { fvl: Object.assign({}, raw.fvl || {}, { loop: raw.spiro.loop, loop_repro: raw.spiro.loop_repro }) });
    st.tests.fvl = true;
  }
  Object.keys(SCHEMA).forEach(k => {
    const src = raw[k]; if (!src || typeof src !== 'object') return;
    SCHEMA[k].groups.forEach(g => g.fields.forEach(f => {
      if (!(f.id in src)) return;
      const v = src[f.id];
      if (f.type === 'param') {
        if (v && typeof v === 'object') st[k][f.id] = { c: String(v.c || 'nm'), z: (v.z === null || v.z === undefined) ? '' : String(v.z) };
      } else if (f.type === 'chk') st[k][f.id] = !!v;
      else if (f.type === 'multi') st[k][f.id] = Array.isArray(v) ? f.opts.map(o => o[0]).filter(x => v.indexOf(x) >= 0) : [];
      else if (f.type === 'sel') {
        const ok = f.opts.some(o => o[0] === v); st[k][f.id] = ok ? v : f.opts[0][0];
      } else st[k][f.id] = (v === null || v === undefined) ? '' : String(v);
    }));
  });
  if (raw.prior && typeof raw.prior === 'object') {
    if (raw.prior.cur && typeof raw.prior.cur === 'object') CUR_FIELDS.forEach(f => { if (f.id in raw.prior.cur) st.prior.cur[f.id] = String(raw.prior.cur[f.id] === null ? '' : raw.prior.cur[f.id]); });
    if (Array.isArray(raw.prior.list) && raw.prior.list.length) {
      st.prior.list = raw.prior.list.slice(0, MAX_PRIORS).map(p => {
        const b = blankPrior();
        PRIOR_FIELDS.forEach(f => { if (p && f.id in p) b[f.id] = f.type === 'chk' ? !!p[f.id] : ((p[f.id] === null || p[f.id] === undefined) ? '' : String(p[f.id])); });
        return b;
      });
    }
  }
  if (raw.trend6 && typeof raw.trend6 === 'object' && Array.isArray(raw.trend6.list) && raw.trend6.list.length) {
    st.trend6.list = raw.trend6.list.slice(0, MAX_TREND).map(r => {
      const b = blankTrendRow(); if (!r || typeof r !== 'object') return b;
      ['date', 'dist', 'nadir'].forEach(k => { b[k] = (r[k] === null || r[k] === undefined) ? '' : String(r[k]); });
      b.o2 = r.o2 === 'o2' ? 'o2' : '';
      return b;
    });
  }
  return st;
}
