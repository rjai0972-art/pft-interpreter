/* ==========================================================================
   PFT Interpreter engine — part 1c: differential considerations and
   additional studies, offered per finding and included only when tapped.
   Each group is keyed to a verified finding. The lists name the physiologic
   causes the standards and reviews associate with the pattern (ERS/ATS 2022
   §classification; ERS/ATS 2017 DLCO; ERS 2019 respiratory muscle; Kaminsky
   2018). None is ever inserted automatically; the clinician chooses which
   fit the patient, and the sentence always says the PFT alone does not
   distinguish them. Study ids are shared across groups, so a study chosen
   for one finding is listed once.
   ========================================================================== */

const STUDIES = {
  'study.volumes': 'lung volumes by plethysmography (TLC, RV/TLC) to confirm or exclude restriction',
  'study.pleth': 'plethysmographic lung volumes (gas dilution can underestimate TLC when gas mixing is impaired)',
  'study.dlco': 'DLCO with VA and KCO',
  'study.bd': 'post-bronchodilator spirometry',
  'study.hb': 'hemoglobin (to adjust the DLCO) and carboxyhemoglobin',
  'study.dlco_repeat': 'repeat DLCO after smoking abstinence, or with carboxyhemoglobin correction',
  'study.hrct': 'high-resolution CT of the chest',
  'study.hrct_exp': 'high-resolution CT of the chest with expiratory images (air trapping, small-airway disease)',
  'study.echo': 'echocardiogram for right-heart pressures (with a bubble study if a shunt is suspected)',
  'study.sixmwt': '6-minute walk test with continuous oximetry',
  'study.cpet': 'cardiopulmonary exercise test',
  'study.mip': 'respiratory muscle pressures (MIP/MEP or SNIP) with an upright–supine vital capacity',
  'study.diaph': 'diaphragm ultrasound or fluoroscopic sniff test',
  'study.neuro': 'neurology evaluation with electrodiagnostic testing',
  'study.abg': 'arterial blood gas (hypoventilation, A–a gradient)',
  'study.overnight': 'overnight oximetry or transcutaneous capnography for nocturnal hypoventilation',
  'study.ctd': 'connective-tissue disease serologies and an exposure and occupational history',
  'study.a1at': 'alpha-1 antitrypsin level',
  'study.feno': 'FeNO and blood eosinophils',
  'study.eos': 'blood eosinophil count',
  'study.allergy': 'allergy evaluation (skin testing or specific IgE)',
  'study.mch': 'bronchoprovocation (methacholine) if asthma remains a question with normal spirometry',
  'study.ics_trial': 'therapeutic trial of inhaled corticosteroid with repeat assessment',
  'study.laryngo': 'laryngoscopy during symptoms and dynamic inspiratory–expiratory airway CT; bronchoscopy if a fixed lesion is suspected',
  'study.repeat': 'repeat spirometry with attention to effort, inspiration and end of test',
  'study.osc': 'oscillometry or airway resistance (airway mechanics when spirometry is nonspecific)',
  'study.cxr': 'chest radiograph or CT for pleural, chest-wall or parenchymal disease',
  'study.cbc': 'complete blood count (polycythemia)',
  'study.sleep': 'sleep study if sleep-disordered breathing is suspected'
};

/* Each group: key, when(f) -> boolean, title (used in "Differential considerations for <title>"), dx: [[id, text]], studies: [study id] */
const DX_GROUPS = [
  { key: 'dlco_isolated', title: 'the isolated reduction in DLCO',
    when: (f) => f.F['patterns.isolated_low_dlco'] === true,
    dx: [['pvd', 'pulmonary vascular disease (pulmonary arterial hypertension, chronic thromboembolic disease)'],
         ['ild_early', 'early interstitial lung disease (gas transfer can fall before FVC or TLC)'],
         ['emph_preserved', 'emphysema with preserved spirometry and lung volumes'],
         ['anemia', 'anemia (when the value is not hemoglobin-adjusted)'],
         ['cohb', 'recent smoking or elevated carboxyhemoglobin before the test'],
         ['hps', 'intrapulmonary shunting (hepatopulmonary syndrome) in liver disease']],
    studies: ['study.hb', 'study.hrct', 'study.echo', 'study.sixmwt', 'study.cpet', 'study.dlco_repeat'] },
  { key: 'dlco_low_obstruction', title: 'the reduced DLCO with airflow obstruction',
    when: (f) => f.F['patterns.obstruction'] === true && !f.F['patterns.mixed'] && f.on.dlco && f.dl.dlco.low,
    dx: [['emph', 'emphysema (parenchymal destruction) rather than airway-predominant disease'],
         ['cpfe', 'combined pulmonary fibrosis and emphysema when lung volumes are relatively preserved'],
         ['pvd', 'pulmonary vascular disease out of proportion to the airflow limitation'],
         ['anemia', 'anemia (when the value is not hemoglobin-adjusted)'],
         ['cohb', 'recent smoking or elevated carboxyhemoglobin before the test']],
    studies: ['study.hrct', 'study.hb', 'study.a1at', 'study.echo', 'study.sixmwt'] },
  { key: 'dlco_low_restriction', title: 'the reduced DLCO with restriction',
    when: (f) => f.on.vol && f.vol.pat.restriction && !f.F['patterns.obstruction'] && f.on.dlco && f.dl.dlco.low,
    dx: [['ild', 'interstitial lung disease (idiopathic, connective-tissue disease–associated, hypersensitivity pneumonitis, sarcoidosis, pneumoconiosis)'],
         ['drug', 'drug- or radiation-induced lung injury'],
         ['chf', 'chronic heart failure with pulmonary venous congestion'],
         ['resection', 'prior lung resection'],
         ['anemia', 'anemia contributing to the gas-transfer reduction (when the value is not hemoglobin-adjusted)']],
    studies: ['study.hrct', 'study.ctd', 'study.echo', 'study.sixmwt', 'study.hb'] },
  { key: 'dlco_low_other', title: 'the reduced DLCO',
    when: (f) => f.on.dlco && f.dl.dlco.low && f.F['patterns.isolated_low_dlco'] !== true && !(f.F['patterns.obstruction'] === true && !f.F['patterns.mixed']) && !(f.on.vol && f.vol.pat.restriction && !f.F['patterns.obstruction']),
    dx: [['ild_early', 'interstitial lung disease, including early disease (gas transfer can fall before FVC or TLC)'],
         ['pvd', 'pulmonary vascular disease (pulmonary arterial hypertension, chronic thromboembolic disease)'],
         ['emph', 'emphysema'],
         ['anemia', 'anemia (when the value is not hemoglobin-adjusted)'],
         ['cohb', 'recent smoking or elevated carboxyhemoglobin before the test'],
         ['chf', 'heart failure with pulmonary venous congestion']],
    studies: ['study.hb', 'study.hrct', 'study.echo', 'study.sixmwt', 'study.dlco_repeat'] },
  { key: 'restriction_preserved_dlco', title: 'the restriction with preserved gas transfer',
    when: (f) => f.on.vol && f.vol.pat.restriction && !f.F['patterns.obstruction'] && f.on.dlco && f.dl.dlco.measured && !f.dl.dlco.invalid && (f.dl.dlco.wnl || f.dl.dlco.high || f.dl.kco.high),
    dx: [['nmd', 'respiratory-muscle weakness (neuromuscular disease, diaphragm dysfunction)'],
         ['chestwall', 'chest-wall disease (kyphoscoliosis, ankylosing spondylitis)'],
         ['obesity', 'obesity (TLC falls mainly at very high BMI; ERV falls first)'],
         ['pleural', 'pleural disease (effusion, fibrothorax)'],
         ['effort', 'incomplete inspiration or submaximal effort'],
         ['resection', 'prior lung resection with preserved transfer per unit volume']],
    studies: ['study.mip', 'study.cxr', 'study.diaph', 'study.abg', 'study.overnight'] },
  { key: 'restriction_no_dlco', title: 'the restriction',
    when: (f) => f.on.vol && f.vol.pat.restriction && !f.F['patterns.obstruction'] && !(f.on.dlco && f.dl.dlco.measured),
    dx: [['parenchymal', 'parenchymal disease (interstitial lung disease, pneumoconiosis, drug or radiation injury)'],
         ['nmd', 'respiratory-muscle weakness or diaphragm dysfunction'],
         ['chestwall', 'chest-wall or pleural disease'],
         ['obesity', 'obesity'],
         ['effort', 'incomplete inspiration or submaximal effort']],
    studies: ['study.dlco', 'study.hrct', 'study.mip'] },
  { key: 'low_fvc_unconfirmed', title: 'the reduced FVC with a preserved ratio',
    when: (f) => f.sp.pat.lowFvcUnconfirmed,
    dx: [['restr_early', 'early restriction (parenchymal or extrapulmonary)'],
         ['effort', 'submaximal effort or incomplete inspiration'],
         ['obesity', 'obesity'],
         ['trapping', 'air trapping from small-airway disease (a nonspecific pattern once TLC is known to be normal)'],
         ['nmd', 'respiratory-muscle weakness']],
    studies: ['study.volumes', 'study.dlco', 'study.bd', 'study.repeat', 'study.mip'] },
  { key: 'nonspecific', title: 'the nonspecific pattern',
    when: (f) => f.sp.pat.nonspecific,
    dx: [['obesity', 'obesity'],
         ['effort', 'suboptimal effort or incomplete inspiration'],
         ['small_airway', 'early or occult small-airway disease with air trapping'],
         ['nmd', 'respiratory-muscle weakness'],
         ['restr_early', 'early restrictive disease not yet reducing TLC']],
    studies: ['study.bd', 'study.osc', 'study.dlco', 'study.repeat', 'study.mip'] },
  { key: 'obstruction', title: 'the airflow obstruction',
    when: (f) => f.F['patterns.obstruction'] === true && !f.F['patterns.mixed'],
    dx: [['asthma', 'asthma'],
         ['copd', 'COPD (chronic bronchitis, emphysema)'],
         ['bronchiectasis', 'bronchiectasis'],
         ['bronchiolitis', 'bronchiolitis (constrictive or obliterative)'],
         ['central', 'central or upper-airway obstruction (review the loop contour)'],
         ['cf', 'cystic fibrosis in the appropriate clinical setting']],
    studies: (f) => ['study.bd', 'study.dlco', 'study.volumes', 'study.hrct_exp', 'study.feno', 'study.a1at'].filter(id => !((id === 'study.bd' && f.on.bd) || (id === 'study.dlco' && f.on.dlco) || (id === 'study.volumes' && f.on.vol))) },
  { key: 'mixed', title: 'the mixed pattern',
    when: (f) => f.F['patterns.mixed'] === true,
    dx: (f) => [['combined', 'combined obstructive and restrictive disease (COPD with interstitial lung disease; combined pulmonary fibrosis and emphysema)'],
         ['sarcoid', 'sarcoidosis'],
         ['bronchiectasis_fibrosis', 'bronchiectasis with fibrosis'],
         ['obesity_obstruction', 'obesity with airflow obstruction'],
         ['chf_airway', 'heart failure with airway disease']].concat(f.vol.dilution ? [['dilution', 'TLC underestimated by gas dilution in obstruction (not true restriction)']] : []),
    studies: (f) => ['study.hrct', 'study.dlco', 'study.echo'].concat(f.vol.dilution ? ['study.pleth'] : []).filter(id => !(id === 'study.dlco' && f.on.dlco)) },
  { key: 'airtrap_preserved_ratio', title: 'the air trapping with a preserved FEV1/FVC',
    when: (f) => f.on.vol && f.vol.pat.airTrapping && !f.F['patterns.obstruction'] && f.sp.ratio.measured && !f.sp.ratio.invalid,
    dx: [['small_airway', 'early small-airway disease (asthma, early COPD)'],
         ['bronchiolitis', 'bronchiolitis'],
         ['exp_weak', 'incomplete emptying from expiratory-muscle weakness']],
    studies: ['study.bd', 'study.osc', 'study.hrct_exp', 'study.mip'] },
  { key: 'upper_airway', title: 'the central or upper-airway pattern',
    when: (f) => f.on.fvl && ((/^(expflat|inspflat|bothflat)$/.test(f.fvl.loop) && f.fvl.repro) || f.fvl.fevPefHi === true),
    dx: (f) => {
      const L = f.fvl.loop;
      const ex = ['extrathoracic', 'variable extrathoracic obstruction (inducible laryngeal obstruction / vocal-cord dysfunction, vocal-cord paralysis, goiter)'];
      const inr = ['intrathoracic', 'variable intrathoracic obstruction (tracheomalacia, intrathoracic tracheal tumour)'];
      const fx = ['fixed', 'fixed obstruction (post-intubation tracheal stenosis, fixed tumour, bilateral vocal-cord paralysis)'];
      return L === 'inspflat' ? [ex, inr, fx] : (L === 'expflat' ? [inr, ex, fx] : (L === 'bothflat' ? [fx, ex, inr] : [ex, inr, fx]));
    },
    studies: ['study.laryngo'] },
  { key: 'dlco_high', title: 'the increased DLCO',
    when: (f) => f.on.dlco && f.dl.dlco.high,
    dx: [['asthma', 'asthma'],
         ['obesity', 'obesity'],
         ['polycythemia', 'polycythemia or elevated hemoglobin'],
         ['flow', 'increased pulmonary blood flow (left-to-right shunt, exercise shortly before the test, supine position)'],
         ['hemorrhage', 'alveolar hemorrhage']],
    studies: ['study.cbc', 'study.echo', 'study.hrct'] },
  { key: 'muscle_low', title: 'the reduced respiratory pressures',
    when: (f) => f.on.mip && (f.mp.mip === 'low' || f.mp.mep === 'low' || f.mp.snip === 'low'),
    dx: [['nmd', 'neuromuscular disease (motor neuron disease, myopathy, neuromuscular-junction disorders)'],
         ['diaphragm', 'diaphragm paralysis or dysfunction'],
         ['hyperinflation', 'hyperinflation (mechanical disadvantage of the inspiratory muscles)'],
         ['effort', 'submaximal effort, poor mouth seal or bulbar weakness'],
         ['deconditioning', 'deconditioning or critical-illness myopathy']],
    studies: (f) => ['study.mip', 'study.diaph', 'study.abg', 'study.overnight', 'study.neuro'].filter(id => !(id === 'study.mip' && f.on.post && f.post.any)) },
  { key: 'desat_normal_rest', title: 'the exertional desaturation with normal resting tests',
    when: (f) => f.on.sixmw && f.six.desat && f.sp.pat.normal && (!f.on.vol || f.vol.pat.normal) && (!f.on.dlco || !f.dl.dlco.low),
    dx: [['pvd', 'pulmonary vascular disease'],
         ['shunt', 'right-to-left shunt (patent foramen ovale, hepatopulmonary syndrome)'],
         ['ild_early', 'early interstitial disease below the sensitivity of resting tests'],
         ['artifact', 'oximetry artifact (motion, poor signal)']],
    studies: ['study.echo', 'study.cpet', 'study.hrct', 'study.abg'] },
  { key: 'mch_positive', title: 'the airway hyperresponsiveness',
    when: (f) => f.on.bronch && f.br.type === 'mch' && f.br.mch.state === 'positive',
    dx: [['asthma', 'asthma'],
         ['rhinitis', 'allergic rhinitis'],
         ['postinfectious', 'post-infectious hyperresponsiveness'],
         ['copd', 'COPD'],
         ['bronchiectasis', 'bronchiectasis'],
         ['chf', 'heart failure']],
    studies: ['study.feno', 'study.allergy', 'study.ics_trial'] },
  { key: 'feno_high', title: 'the elevated FeNO',
    when: (f) => f.on.feno && f.feno.any && fenoBand(f).cat === 'high' && !f.feno.confound,
    dx: [['eos_asthma', 'eosinophilic asthma'],
         ['atopy', 'allergic rhinitis or atopy'],
         ['neb', 'non-asthmatic eosinophilic bronchitis']],
    studies: ['study.eos', 'study.allergy'] },
  { key: 'normal_symptomatic', title: 'the normal study in a symptomatic patient',
    when: (f) => f.sp.pat.normal && !f.sp.pat.indeterminate && (!f.on.vol || f.vol.pat.normal) && (!f.on.dlco || (f.dl.dlco.measured && f.dl.dlco.wnl)) && (f.ctx.hasInd('dyspnea') || f.ctx.hasInd('cough') || f.ctx.hasInd('wheeze')),
    dx: [['asthma_variable', 'asthma with normal baseline spirometry (variable airflow)'],
         ['dysfunctional', 'dysfunctional breathing'],
         ['deconditioning', 'deconditioning'],
         ['cardiac', 'cardiac disease'],
         ['laryngeal', 'inducible laryngeal obstruction'],
         ['early', 'early parenchymal or pulmonary vascular disease below the sensitivity of resting tests']],
    studies: (f) => ['study.bd', 'study.mch', 'study.feno', 'study.dlco', 'study.volumes', 'study.cpet', 'study.echo'].filter(id => !((id === 'study.bd' && f.on.bd) || (id === 'study.mch' && f.on.bronch) || (id === 'study.feno' && f.on.feno) || (id === 'study.dlco' && f.on.dlco) || (id === 'study.volumes' && f.on.vol) || (id === 'study.cpet' && f.on.cpet))) },
  { key: 'low_rv_isolated', title: 'the isolated low RV',
    when: (f) => f.on.vol && f.vol.pat.lowRV,
    dx: [['chestwall', 'chest-wall or pleural disease limiting the end-expiratory position'],
         ['parenchymal', 'parenchymal disease with increased recoil'],
         ['effort', 'maximal expiratory effort beyond the usual end point (technical)']],
    studies: ['study.cxr'] }
];

/* Offered groups for this study: each with its differential items and study items and whether each is selected. */
function differentialGroups(f) {
  const rv = f.review || {}, out = [];
  DX_GROUPS.forEach(g => {
    let on = false; try { on = !!g.when(f); } catch (e) { on = false; }
    if (!on) return;
    const dxList = (typeof g.dx === 'function' ? g.dx(f) : g.dx).map(d => ({ id: 'dx.' + g.key + '.' + d[0], text: d[1], on: !!rv['dx.' + g.key + '.' + d[0]] }));
    const stList = (typeof g.studies === 'function' ? g.studies(f) : g.studies).filter(id => STUDIES[id]).map(id => ({ id: id, text: STUDIES[id], on: !!rv[id] }));
    out.push({ key: g.key, title: g.title, dx: dxList, studies: stList });
  });
  return out;
}
/* Sentences for the interpretation (one per group with a selected differential) and the deduplicated study list. */
function differentialText(groups) {
  const sentences = [], studies = [], seen = {};
  groups.forEach(g => {
    const on = g.dx.filter(d => d.on).map(d => d.text);
    if (on.length) sentences.push('Differential considerations for ' + g.title + ' include ' + joinList(on) + ', which the physiologic pattern alone does not distinguish.');
    g.studies.forEach(s => { if (s.on && !seen[s.id]) { seen[s.id] = 1; studies.push(s.text); } });
  });
  return { sentences: sentences, studies: studies };
}
function joinList(items) {
  if (items.length <= 1) return items.join('');
  // items may carry commas inside parentheses, so the list is joined with semicolons when any item has one
  const semi = items.some(t => /,/.test(t));
  if (items.length === 2) return items[0] + (semi ? '; and ' : ' and ') + items[1];
  const sep = semi ? '; ' : ', ';
  return items.slice(0, -1).join(sep) + sep + 'and ' + items[items.length - 1];
}

/* Generic catalog wording that an itemized selection replaces: when any of the listed differential or study ids is
   selected, the catalog phrase is withheld from the interpretation so the same idea is not stated twice. */
const SUPERSEDED_BY = {
  'dlco.isolated_differential': (ids) => ids.some(id => /^dx\.dlco_isolated\./.test(id)),
  'dlco.elevated_context': (ids) => ids.some(id => /^dx\.dlco_high\./.test(id)),
  'followup.volumes': (ids) => ids.indexOf('study.volumes') >= 0 || ids.indexOf('study.pleth') >= 0,
  'followup.hb': (ids) => ids.indexOf('study.hb') >= 0,
  'followup.airway': (ids) => ids.indexOf('study.laryngo') >= 0,
  'followup.muscle': (ids) => ids.indexOf('study.mip') >= 0 || ids.indexOf('study.diaph') >= 0 || ids.indexOf('study.neuro') >= 0,
  'followup.challenge': (ids) => ids.indexOf('study.mch') >= 0
};
function markSuperseded(suggest, groups) {
  const ids = [];
  groups.forEach(g => { g.dx.forEach(d => { if (d.on) ids.push(d.id); }); g.studies.forEach(s => { if (s.on) ids.push(s.id); }); });
  (suggest || []).forEach(sg => { const t = SUPERSEDED_BY[sg.id]; sg.superseded = !!(t && t(ids)); });
  return ids;
}
