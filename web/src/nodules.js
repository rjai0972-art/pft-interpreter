/* PFT Interpreter — Learn: lung nodules, abnormalities on chest imaging and lung cancer screening.
   Content distilled from the Fleischner Society 2017 guideline (MacMahon), ACR Lung-RADS v2022, the CHEST 2013 nodule
   guideline (Gould) and the CHEST 2021 screening guideline (Mazzone), the BTS 2015 nodule guideline (Callister), the
   USPSTF 2021 and ACS 2023 screening recommendations, NLST and NELSON, the Choi/Mazzone 2018 review of probability
   models, the 2023 AFP review (Langan), the 2021 ATS core curriculum (Ha and Holden; Patel and Baptiste), the VHA
   screening demonstration project (Kinsinger 2017), CALGB 140503 (Altorki 2023) and the Fleischner 2020 position paper
   on interstitial lung abnormalities. The calculators implement the published equations; the advisor applies the
   published tables. Teaching material, not a substitute for the documents or for judgement. */
(function (root) {
'use strict';
const lg = (x) => 1 / (1 + Math.exp(-x));

/* ------------------------------------------------------------ probability of malignancy
   Mayo (Swensen 1997): age, smoking (ever), extrathoracic cancer ≥5 years before, diameter (mm), spiculation, upper lobe.
   VA (Gould 2007): smoking (ever), age, diameter, years since quitting. Brock / PanCan (McWilliams 2013, full model with
   spiculation): age, sex, family history, emphysema, size, type, upper lobe, nodule count, spiculation. */
function mayo(p) {
  const x = -6.8272 + 0.0391 * p.age + 0.7917 * (p.smoker ? 1 : 0) + 1.3388 * (p.cancer ? 1 : 0) + 0.1274 * p.size + 1.0407 * (p.spic ? 1 : 0) + 0.7838 * (p.upper ? 1 : 0);
  return lg(x);
}
function va(p) {
  const x = -8.404 + 2.061 * (p.smoker ? 1 : 0) + 0.779 * (p.age / 10) + 0.112 * p.size - 0.567 * ((p.smoker && p.quitYears > 0 ? p.quitYears : 0) / 10);
  return lg(x);
}
function brock(p) {
  const type = p.type === 'part' ? 0.377 : (p.type === 'ggn' ? -0.1276 : 0);
  const x = -6.7892 + 0.0287 * (p.age - 62) + 0.6011 * (p.female ? 1 : 0) + 0.2961 * (p.famhx ? 1 : 0) + 0.2953 * (p.emph ? 1 : 0)
    - 5.3854 * (Math.pow(p.size / 10, -0.5) - 1.58113883) + type + 0.6581 * (p.upper ? 1 : 0) - 0.0824 * ((p.count || 1) - 4) + 0.7729 * (p.spic ? 1 : 0);
  return lg(x);
}
/* volume doubling time from two diameters (mm) a number of days apart: VDT = t·ln2 / (3·ln(d2/d1)) */
function vdt(d1, d2, days) { if (!(d1 > 0 && d2 > 0 && days > 0) || d2 === d1) return null; return days * Math.LN2 / (3 * Math.log(d2 / d1)); }

/* ------------------------------------------------------------ the advisor: what the guideline tables say
   q: { setting: 'incidental'|'screen', type: 'solid'|'part'|'ggn'|'peri', size (mean diameter, mm), solid (mm, part-solid),
        multiple: bool, risk: 'low'|'high' (incidental), status: 'baseline'|'new'|'growing'|'stable' (screening),
        benign: bool (benign calcification or fat) } */
function fleischner(q) {
  if (q.benign) return { rule: 'Benign pattern', text: 'A nodule with a benign pattern of calcification (central, laminated, diffuse, popcorn) or with fat needs no follow-up.' };
  const sz = q.size, hi = q.risk === 'high', multi = !!q.multiple;
  if (q.type === 'peri') return { rule: 'Perifissural nodule', text: sz < 10 ? 'A solid, smooth, oval, lentiform or triangular nodule under 10 mm on or near a fissure is an intrapulmonary lymph node: no follow-up is needed (Fleischner; Lung-RADS 2).' : 'Larger than the usual intrapulmonary lymph node: manage as a solid nodule of this size.' };
  if (q.type === 'solid') {
    if (!multi) {
      if (sz < 6) return { rule: 'Single solid < 6 mm (< 100 mm³)', text: hi ? 'Optional CT at 12 months (high-risk patient, or suspicious morphology or upper-lobe location); otherwise no routine follow-up.' : 'No routine follow-up.' };
      if (sz <= 8) return { rule: 'Single solid 6–8 mm (100–250 mm³)', text: hi ? 'CT at 6–12 months, then CT at 18–24 months.' : 'CT at 6–12 months, then consider CT at 18–24 months.' };
      return { rule: 'Single solid > 8 mm (> 250 mm³)', text: 'Consider CT at 3 months, PET/CT, or tissue sampling — the choice follows the probability of cancer (CHEST: < 5% surveillance, 5–65% PET/CT then biopsy or surveillance, > 65% surgical diagnosis after staging; BTS: Brock < 10% surveillance, ≥ 10% PET/CT and Herder).' };
    }
    if (sz < 6) return { rule: 'Multiple solid < 6 mm', text: hi ? 'Optional CT at 12 months.' : 'No routine follow-up.' };
    if (sz <= 8) return { rule: 'Multiple solid 6–8 mm', text: hi ? 'CT at 3–6 months, then CT at 18–24 months.' : 'CT at 3–6 months, then consider CT at 18–24 months.' };
    return { rule: 'Multiple solid > 8 mm', text: 'CT at 3–6 months, then consider CT at 18–24 months; manage by the most suspicious nodule, and think of metastases and of infection (more than six new nodules in a short interval favours an infectious or inflammatory cause).' };
  }
  // subsolid
  if (multi) {
    if (sz < 6) return { rule: 'Multiple subsolid < 6 mm', text: 'CT at 3–6 months; if stable, consider CT at 2 and 4 years.' };
    return { rule: 'Multiple subsolid ≥ 6 mm', text: 'CT at 3–6 months; subsequent management by the most suspicious nodule(s). Multiple ground-glass nodules are often multifocal adenocarcinoma spectrum (AAH, AIS) and are followed, not all resected.' };
  }
  if (q.type === 'ggn') {
    if (sz < 6) return { rule: 'Single ground-glass < 6 mm', text: 'No routine follow-up (consider CT at 2 and 4 years when the morphology is suspicious or the patient is at high risk).' };
    return { rule: 'Single ground-glass ≥ 6 mm', text: 'CT at 6–12 months to confirm persistence, then CT every 2 years until 5 years. Growth or a new solid component changes the plan; PET/CT is unreliable for pure ground-glass nodules.' };
  }
  if (sz < 6) return { rule: 'Single part-solid < 6 mm', text: 'No routine follow-up.' };
  if (q.solid >= 6) return { rule: 'Single part-solid ≥ 6 mm with a solid component ≥ 6 mm', text: 'Highly suspicious: CT at 3–6 months to confirm persistence is reasonable, then PET/CT, biopsy or resection; a persistent solid component of 6 mm or more is treated as an invasive adenocarcinoma until proven otherwise.' };
  return { rule: 'Single part-solid ≥ 6 mm, solid component < 6 mm', text: 'CT at 3–6 months to confirm persistence; if unchanged and the solid component stays under 6 mm, annual CT for 5 years.' };
}
function lungRads(q) {
  const sz = q.size, st = q.status || 'baseline', solid = q.solid || 0, N = st === 'new', G = st === 'growing';
  const cat = (c, f, m) => ({ cat: c, finding: f, mgmt: m });
  const M = { 1: '12-month screening LDCT', 2: '12-month screening LDCT', 3: '6-month LDCT', '4A': '3-month LDCT; PET/CT may be considered when there is a solid nodule or solid component ≥ 8 mm', '4B': 'Diagnostic chest CT with or without contrast; PET/CT may be considered when there is a solid component ≥ 8 mm; tissue sampling and/or referral for further clinical evaluation — management follows the probability of malignancy (Brock), comorbidity and preference' };
  if (q.benign) return cat('1', 'Nodule with benign features: complete, central, popcorn or concentric calcification, or fat', M[1]);
  if (q.type === 'peri') return sz < 10 ? cat('2', 'Juxtapleural nodule < 10 mm mean diameter, solid, smooth, oval, lentiform or triangular', M[2]) : lungRads(Object.assign({}, q, { type: 'solid' }));
  if (q.type === 'ggn') {
    if (sz >= 30 && (st === 'baseline' || N)) return cat('3', 'Non-solid (ground-glass) nodule ≥ 30 mm at baseline or new', M[3]);
    return cat('2', 'Non-solid (ground-glass) nodule < 30 mm, or ≥ 30 mm and stable or slow-growing', M[2]);
  }
  if (q.type === 'part') {
    if (st === 'baseline') {
      if (sz < 6) return cat('2', 'Part-solid nodule < 6 mm total mean diameter at baseline', M[2]);
      if (solid < 6) return cat('3', 'Part-solid nodule ≥ 6 mm with a solid component < 6 mm at baseline', M[3]);
      if (solid < 8) return cat('4A', 'Part-solid nodule ≥ 6 mm with a solid component 6 to < 8 mm at baseline', M['4A']);
      return cat('4B', 'Part-solid nodule with a solid component ≥ 8 mm at baseline', M['4B']);
    }
    if (N && sz < 6) return cat('3', 'New part-solid nodule < 6 mm total mean diameter', M[3]);
    if (solid < 4) return cat('4A', 'New or growing part-solid nodule with a solid component < 4 mm', M['4A']);
    return cat('4B', 'New or growing solid component ≥ 4 mm', M['4B']);
  }
  // solid
  if (st === 'baseline' || st === 'stable') {
    if (sz < 6) return cat('2', 'Solid nodule < 6 mm at baseline', M[2]);
    if (sz < 8) return cat('3', 'Solid nodule 6 to < 8 mm at baseline', M[3]);
    if (sz < 15) return cat('4A', 'Solid nodule 8 to < 15 mm at baseline', M['4A']);
    return cat('4B', 'Solid nodule ≥ 15 mm at baseline', M['4B']);
  }
  if (N) {
    if (sz < 4) return cat('2', 'New solid nodule < 4 mm', M[2]);
    if (sz < 6) return cat('3', 'New solid nodule 4 to < 6 mm', M[3]);
    if (sz < 8) return cat('4A', 'New solid nodule 6 to < 8 mm', M['4A']);
    return cat('4B', 'New solid nodule ≥ 8 mm', M['4B']);
  }
  if (sz < 8) return cat('4A', 'Growing solid nodule < 8 mm (growth = > 1.5 mm in mean diameter within 12 months)', M['4A']);
  return cat('4B', 'Growing solid nodule ≥ 8 mm', M['4B']);
}

/* ------------------------------------------------------------ topics */
const T = {};
T.nodules = { title: 'Lung nodules: evaluation and management', kicker: 'Fleischner 2017 · CHEST 2013 · BTS 2015 · Lung-RADS 2022', blocks: [
  { p: 'A pulmonary nodule is a rounded opacity up to 3 cm across, surrounded by lung; larger than that it is a mass and is presumed malignant until proven otherwise. About 1.5 million nodules are found incidentally in the United States each year and roughly 5% are cancer; in a screening programme about a quarter of scans show a nodule and about 1% of people screened have lung cancer. The job is to find the few cancers early without harming the many with benign nodules, and the whole approach runs on one number: the probability that this nodule, in this patient, is malignant.' },
  { h: 'Describe the nodule first', ul: [
    'Attenuation: solid; part-solid (a ground-glass nodule with a solid component); non-solid or pure ground-glass (a hazy opacity through which vessels and bronchi are still seen). Subsolid nodules are more often malignant than solid ones but grow slowly — the adenocarcinoma spectrum of atypical adenomatous hyperplasia, adenocarcinoma in situ, minimally invasive and invasive adenocarcinoma.',
    'Size: the mean of the long and short axis on the same image (Fleischner, to the nearest millimetre; Lung-RADS to 0.1 mm), or a volume from software. Thin-section CT (≤ 1.5 mm) with lung windows; a chest radiograph cannot size or characterise a nodule, so an indeterminate nodule on a film gets a CT.',
    'Margin: smooth and well defined (favours benign); lobulated; spiculated (the corona radiata of a carcinoma, the single strongest morphologic predictor of cancer); irregular.',
    'Calcification: central, laminated (concentric), diffuse and popcorn patterns are benign (granuloma; popcorn in a hamartoma). Eccentric, stippled or amorphous calcification does not exclude cancer. Intranodular fat means hamartoma.',
    'Location: upper lobes carry more cancers (and tuberculosis); a solid, smooth, oval or triangular nodule under 10 mm on a fissure or against the pleura is an intrapulmonary lymph node and needs nothing.',
    'Other features: cavitation with a thick (> 15 mm) irregular wall suggests cancer, a thin (< 4 mm) wall a benign cause; air bronchograms or bubble-like lucencies within a subsolid nodule favour adenocarcinoma; a feeding artery and draining vein mean an arteriovenous malformation; a nodule next to a bronchus with mucus plugging may be an endobronchial lesion.',
    'Number: a dominant nodule among several is managed on its own merits; many small nodules without a dominant one are more often granulomatous (old infection, sarcoidosis) or, in a patient with a known cancer, metastatic.'] },
  { widget: 'nodtypes' },
  { h: 'Growth is the behaviour that decides', ul: [
    'Volume doubling time (VDT) of most solid cancers is 20–400 days; subsolid cancers double in 400–800 days or longer. A VDT under 20–30 days points to infection or inflammation, over 400 days (solid) to a benign nodule — but slow-growing adenocarcinomas are the exception, which is why ground-glass nodules are followed for years.',
    'A 2-mm increase in diameter is a 73% increase in volume for a 6-mm nodule: growth is easier to see in volume. Fleischner counts growth as ≥ 2 mm in diameter (measurement error is about 1.5 mm); Lung-RADS as > 1.5 mm in mean diameter within 12 months; BTS as ≥ 25% in volume.',
    'Stability of a solid nodule for 2 years (Fleischner: 18–24 months for 6–8 mm; CHEST) is accepted as benign; subsolid nodules need 5 years. Decrease in size or resolution ends the follow-up.',
    'Significant growth is presumptive evidence of malignancy: it moves the nodule to PET/CT, biopsy or resection regardless of the starting probability.'] },
  { widget: 'nodvdt' },
  { h: 'The probability of malignancy', p: 'Every guideline asks for a pretest probability before deciding between surveillance, PET/CT, biopsy and resection. It can be a clinician’s estimate or a validated model; the models combine age, smoking, cancer history, nodule size, spiculation, upper-lobe location and, in the screening model, sex, family history, emphysema, nodule type and count. CHEST uses three bands — low (< 5%), intermediate (5–65%) and high (> 65%); BTS uses the Brock model with 10% as the line for PET/CT and then the Herder model (Brock plus FDG uptake) with 10% and 70% as the lines for biopsy and for excision.' },
  { table: { head: ['Model', 'Built from', 'Variables', 'AUC', 'Use it for'], rows: [
    ['Mayo (Swensen 1997)', '629 incidental nodules on chest radiographs, 4–30 mm, 23% malignant', 'Age, ever-smoking, extrathoracic cancer ≥ 5 years before, diameter, spiculation, upper lobe', '0.80 (0.83 derivation)', 'Incidental nodules in low-to-moderate-risk populations; the most externally validated'],
    ['VA (Gould 2007)', '375 veterans, 7–30 mm, 54% malignant', 'Age, ever-smoking, years since quitting, diameter', '0.79', 'Male smokers; accuracy lower than Mayo and Brock in comparisons'],
    ['Herder (2005)', '106 nodules referred for FDG-PET, 57% malignant', 'Mayo probability plus FDG uptake (none, faint, moderate, intense)', '0.92', 'When a PET result is available (BTS second step)'],
    ['Brock / PanCan (McWilliams 2013)', '1,871 screening participants (PanCan), 5.5% malignant, validated in BCCA', 'Age, sex, family history, emphysema, size, type, upper lobe, nodule count, spiculation', '0.94 (0.90 for > 4 mm in validation)', 'Screen-detected nodules (BTS, Lung-RADS 4B), and it holds up for incidental nodules too'],
    ['PKUPH (2012)', '371 resected nodules, China, 9–28 mm', 'Age, diameter, border, calcification, spiculation, family history', '0.87', 'High-prevalence surgical populations; needs validation elsewhere'],
    ['TREAT (2014) · BIMC (2015)', 'Surgical referrals · mixed with PET and growth', 'Add FEV1, BMI, hemoptysis, growth, PET avidity, contrast enhancement', '0.87–0.89', 'Pre-surgical evaluation; less widely validated']
  ] }, note: 'Accuracy depends on how like the derivation cohort the patient is: Mayo under-calls in high-prevalence surgical series, Brock holds up across settings. All of them beat chance; in head-to-head studies they are at best modestly better than an experienced clinician, and none replaces judgement about growth, prior imaging or an exposure history.' },
  { widget: 'nodrisk' },
  { h: 'Incidental solid nodules (Fleischner 2017)', p: 'For adults of 35 and over who are not immunocompromised and have no known cancer. "High risk" means an estimated probability above about 5%: older age, heavy smoking, emphysema or fibrosis, family history, a larger nodule, spiculation or an upper-lobe location; "low risk" is a young never-smoker with a small smooth nodule away from the apices. Sizes are mean diameters (volumes in brackets).' },
  { table: { head: ['Nodule', 'Low risk', 'High risk'], rows: [
    ['Single solid < 6 mm (< 100 mm³)', 'No routine follow-up', 'Optional CT at 12 months'],
    ['Single solid 6–8 mm (100–250 mm³)', 'CT at 6–12 months, then consider CT at 18–24 months', 'CT at 6–12 months, then CT at 18–24 months'],
    ['Single solid > 8 mm (> 250 mm³)', 'Consider CT at 3 months, PET/CT or tissue sampling', 'Consider CT at 3 months, PET/CT or tissue sampling'],
    ['Multiple solid < 6 mm', 'No routine follow-up', 'Optional CT at 12 months'],
    ['Multiple solid 6–8 mm', 'CT at 3–6 months, then consider CT at 18–24 months', 'CT at 3–6 months, then CT at 18–24 months'],
    ['Multiple solid > 8 mm', 'CT at 3–6 months, then consider CT at 18–24 months', 'CT at 3–6 months, then consider CT at 18–24 months']
  ] }, note: 'CHEST 2013 differs at the edges: ≤ 4 mm with no risk factors needs no follow-up, 4–6 mm a CT at 12 months, 6–8 mm CTs at 6–12 and 18–24 months (3–6, 9–12 and 24 months with risk factors); above 8 mm it manages by probability. BTS 2015 uses 5 mm or 80 mm³ as the floor, CT at 12 months for 5–6 mm, CT at 3 months then VDT for 6–8 mm, and Brock at 8 mm or 300 mm³.' },
  { h: 'Incidental subsolid nodules (Fleischner 2017)', table: { head: ['Nodule', 'Management'], rows: [
    ['Single ground-glass < 6 mm', 'No routine follow-up (consider CT at 2 and 4 years if suspicious or high risk)'],
    ['Single ground-glass ≥ 6 mm', 'CT at 6–12 months to confirm persistence, then every 2 years until 5 years'],
    ['Single part-solid < 6 mm', 'No routine follow-up'],
    ['Single part-solid ≥ 6 mm, solid part < 6 mm', 'CT at 3–6 months to confirm persistence; if unchanged, annual CT for 5 years'],
    ['Single part-solid, solid part ≥ 6 mm', 'Highly suspicious: PET/CT, biopsy or resection once persistence is confirmed'],
    ['Multiple subsolid < 6 mm', 'CT at 3–6 months; if stable, consider CT at 2 and 4 years'],
    ['Multiple subsolid ≥ 6 mm', 'CT at 3–6 months; then by the most suspicious nodule']
  ] }, note: 'Many subsolid opacities are transient (infection, haemorrhage, focal fibrosis), hence the first CT to confirm persistence. A persistent ground-glass nodule that grows or develops a solid component is adenocarcinoma until proven otherwise; the solid component is the invasive part and predicts behaviour. PET/CT is unreliable below 8 mm and in pure ground-glass lesions, and needle biopsy of a ground-glass nodule is low-yield, so these are diagnosed by resection — sublobar resection is adequate for small peripheral lesions (CALGB 140503, JCOG0802).' },
  { h: 'Screen-detected nodules: Lung-RADS v2022', p: 'Lung-RADS codes each screening CT by its most suspicious finding and fixes the next step; the interval is counted from the scan being read. Growth means > 1.5 mm in mean diameter within 12 months. A category 3 nodule that is stable at 6 months becomes category 2; a 4A nodule stable at 3 months becomes 3; nodules that resolve are reclassified by the next finding.' },
  { table: { head: ['Category', 'Findings', 'Management'], rows: [
    ['0 Incomplete', 'Prior CT awaited; lungs not fully evaluated; findings suggesting infection or inflammation', 'Compare with the prior; additional imaging; 1–3-month LDCT'],
    ['1 Negative', 'No nodules, or benign calcification or fat', '12-month screening LDCT'],
    ['2 Benign', 'Juxtapleural nodule < 10 mm (solid, smooth, oval/lentiform/triangular); solid < 6 mm at baseline or new < 4 mm; part-solid < 6 mm; ground-glass < 30 mm (any) or ≥ 30 mm stable or slow-growing; subsegmental airway nodule; a category 3 stable at 6 months or 4A stable at 3 months', '12-month screening LDCT'],
    ['3 Probably benign', 'Solid 6 to < 8 mm at baseline or new 4 to < 6 mm; part-solid ≥ 6 mm with solid part < 6 mm, or new < 6 mm; ground-glass ≥ 30 mm at baseline or new; growing thick-walled cyst', '6-month LDCT'],
    ['4A Suspicious', 'Solid 8 to < 15 mm at baseline, growing < 8 mm, or new 6 to < 8 mm; part-solid ≥ 6 mm with solid part 6 to < 8 mm, or new/growing solid part < 4 mm; segmental or more proximal airway nodule; thick-walled or multilocular cyst', '3-month LDCT; PET/CT may be considered for a solid component ≥ 8 mm'],
    ['4B Very suspicious', 'Solid ≥ 15 mm at baseline, or new/growing ≥ 8 mm; solid part ≥ 8 mm, or new/growing ≥ 4 mm; airway nodule stable or growing at 3 months; cyst with growing wall or nodularity; slow-growing solid or part-solid nodule over several rounds', 'Diagnostic chest CT ± contrast; PET/CT for a solid part ≥ 8 mm; tissue sampling and/or referral — by probability (Brock), comorbidity and preference'],
    ['4X', 'A category 3 or 4 nodule with features that raise suspicion: spiculation, lymphadenopathy, metastases, a ground-glass nodule doubling in a year', 'As 4B'],
    ['S', 'Modifier for a clinically significant finding unrelated to lung cancer (coronary calcification, aneurysm, emphysema, interstitial abnormality, other organs)', 'Per the ACR incidental-findings guidance']
  ] }, note: 'Categories 1–2 are a negative screen (about 84% of exams), 3 and 4 a positive one (about 15%). About 1% of 4B/4X nodules are cancer in the first round in some series and far more in others; the tool is designed so that fewer than one in ten positive screens leads to an invasive procedure.' },
  { widget: 'nodadvisor' },
  { h: 'Solid nodules above 8 mm: the three roads', ul: [
    'Low probability (< 5%; BTS Brock < 10%): CT surveillance (CHEST: 3–6, 9–12 and 18–24 months), because biopsy of a nodule that is almost certainly benign does harm for no gain.',
    'Intermediate probability (5–65%): FDG PET/CT to refine the probability and stage at the same time. Sensitivity is about 89% and specificity 75%; false positives in infection, granulomatous disease and sarcoidosis, false negatives in nodules under 8 mm, ground-glass lesions, carcinoid and mucinous adenocarcinoma. A non-avid solid nodule over 8–10 mm is followed, not dismissed. Non-surgical biopsy when the probability and the imaging disagree, when the probability is 10–60%, when a benign diagnosis that needs specific treatment is suspected (tuberculosis, fungus) or when the patient wants proof before surgery.',
    'High probability (> 65%; BTS > 70%): surgical diagnosis and treatment after staging (PET/CT, mediastinal staging when indicated) in a patient fit for resection; VATS wedge with frozen section proceeding to lobectomy or, for peripheral tumours ≤ 2 cm, segmentectomy. Stereotactic radiotherapy or ablation when the operative risk is prohibitive, with or without a tissue diagnosis.',
    'Choosing the biopsy: CT-guided transthoracic needle biopsy for peripheral nodules (yield about 90%; pneumothorax in 15–25%, a chest tube in about 5%); bronchoscopy for central lesions and lesions with a bronchus sign — radial EBUS, electromagnetic or robotic navigation reach peripheral nodules with yields of 70–80% and pneumothorax under 3%. EBUS-TBNA stages the mediastinum in the same session.'] },
  { h: 'When to refer, and what to tell the patient', ul: [
    'Refer (pulmonology, interventional radiology or thoracic surgery) for a solid nodule ≥ 15 mm, a new or growing nodule ≥ 8 mm, a part-solid nodule with a solid component ≥ 8 mm (or ≥ 4 mm and new or growing), any mass, any nodule in a patient with a known cancer or who is immunocompromised, and when the picture is not clear.',
    'Most nodules are not cancer. Say what was found, what it probably is, that a follow-up CT is the test that answers the question, when it is due, and that a nodule that does not grow over the surveillance period is benign. Write the plan into the record and into the radiology report; only about half of nodules outside screening programmes get guideline-concordant care, and tracking systems, templated reports and direct communication are what close the gap.',
    'Keep the whole picture in view: a person with a 6-mm nodule and a 20-pack-year history belongs in a screening programme, which will follow the nodule as part of annual LDCT; smoking cessation is the single most useful intervention at any of these visits.'] },
  { src: ['MacMahon H, Naidich DP, Goo JM, et al. Guidelines for management of incidental pulmonary nodules detected on CT images: from the Fleischner Society 2017. Radiology 2017;284:228–43.', 'American College of Radiology. Lung-RADS v2022 assessment categories (November 2022).', 'Gould MK, Donington J, Lynch WR, et al. Evaluation of individuals with pulmonary nodules: when is it lung cancer? CHEST guideline, 3rd ed. Chest 2013;143(5 Suppl):e93S–e120S.', 'Callister MEJ, Baldwin DR, Akram AR, et al. BTS guidelines for the investigation and management of pulmonary nodules. Thorax 2015;70(Suppl 2):ii1–ii54.', 'Choi HK, Ghobrial M, Mazzone PJ. Models to estimate the probability of malignancy in patients with pulmonary nodules. Ann Am Thorac Soc 2018;15:1117–26.', 'Mazzone PJ, Lam L. Evaluating the patient with a pulmonary nodule: a review. JAMA 2022;327:264–73.', 'Langan RC, Goodbred AJ. Pulmonary nodules: common questions and answers. Am Fam Physician 2023;107:282–91.', 'Ha N-T, Holden VK. Current approach to lung nodules. In: ATS core curriculum 2021 — lung cancer. ATS Scholar 2021.', 'Swensen SJ, et al. The probability of malignancy in solitary pulmonary nodules. Arch Intern Med 1997;157:849–55. Gould MK, et al. Chest 2007;131:383–8. McWilliams A, et al. N Engl J Med 2013;369:910–9. Herder GJ, et al. Chest 2005;128:2490–6.', 'Altorki N, et al. Lobar or sublobar resection for peripheral stage IA non–small-cell lung cancer. N Engl J Med 2023;388:489–98.'] }
] };

T.screening = { title: 'Lung cancer screening', kicker: 'USPSTF 2021 · ACS 2023 · NCCN · CMS · the VA programme', blocks: [
  { p: 'Lung cancer kills more people than any other cancer because it is usually found late; stage I disease is cured in 70–90% of cases, all-stage survival is under 20%. Annual low-dose CT in people at high risk finds it earlier and lowers lung-cancer death — the only screening test for lung cancer that does. The work is in choosing the right people, handling the many nodules it finds without harm, and keeping people coming back every year.' },
  { h: 'The evidence', ul: [
    'NLST (2011): 53,454 current or former heavy smokers aged 55–74 (≥ 30 pack-years, quit within 15 years) randomised to three annual LDCTs or chest radiographs; after 6.5 years lung-cancer mortality fell by 20% and all-cause mortality by 6.7%. About 320 people had to be screened to prevent one lung-cancer death. 24% of LDCTs were positive and 96% of those were false positives, most resolved by follow-up imaging.',
    'NELSON (2020): 15,792 people in the Netherlands and Belgium, volume-based nodule management with doubling times; at 10 years lung-cancer mortality was 24% lower in men and 33% lower in women, with a far lower false-positive rate (positive screens about 2% with the volume protocol).',
    'A meta-analysis of 96,000 participants puts the absolute reduction in lung-cancer death at about 0.4% over 5–10 years, with no proven change in all-cause mortality. Harms: false positives, invasive procedures for benign disease (about 1–2% of those screened), overdiagnosis (perhaps 10% of screen-detected cancers, more for indolent adenocarcinomas), incidental findings in up to 40%, radiation (about 1.5 mSv per LDCT, 6 mSv for a diagnostic chest CT, 20+ mSv for PET/CT), and the anxiety of a positive screen.'] },
  { h: 'Who to screen', table: { head: ['Guideline', 'Age', 'Smoking', 'Years since quitting', 'Notes'], rows: [
    ['USPSTF 2021 (grade B)', '50–80', '≥ 20 pack-years', '≤ 15', 'Annual LDCT. Stop once the person has not smoked for 15 years, or develops a condition that substantially limits life expectancy or the ability or willingness to have curative treatment'],
    ['CMS 2022 (Medicare)', '50–77', '≥ 20 pack-years', '≤ 15', 'Asymptomatic; a shared decision-making visit before the first scan; counselling on smoking cessation'],
    ['American Cancer Society 2023', '50–80', '≥ 20 pack-years', 'Any', 'Current or former smokers regardless of how long ago they quit; reasonably good health'],
    ['NCCN', '≥ 50', '≥ 20 pack-years', 'Any', 'No upper age; also offers risk-model eligibility (PLCOm2012 6-year risk ≥ 1.3%); accounts for radon, occupational exposures, cancer history, family history, COPD and fibrosis'],
    ['CHEST 2021', '50–80', '≥ 20 pack-years', '≤ 15', 'Also 55–77 with ≥ 30 pack-years as in NLST; suggests not screening when comorbidity limits life expectancy or the acceptance of treatment'],
    ['NLST (trial entry)', '55–74', '≥ 30 pack-years', '≤ 15', 'The population in which the mortality benefit was shown']
  ] }, note: 'The 2021 lowering of the thresholds to 50 years and 20 pack-years roughly doubled the eligible population and brought in more women and Black Americans, who develop lung cancer with less exposure. Risk models (PLCOm2012, Bach, LCRAT) select a higher-risk group than the age-and-pack-year rules; the NCCN accepts them. Screening is for people who would accept and tolerate treatment of a cancer found: it is a conversation, not a tick box.' },
  { h: 'Running a programme', ul: [
    'Shared decision-making before the first scan: the benefit (a 20% lower chance of dying of lung cancer), the chance of a positive scan (about one in seven in the first round with Lung-RADS, mostly benign), the plan for follow-up, radiation, incidental findings and overdiagnosis, and that annual screening continues until the stopping rules apply. Cessation counselling at every visit — screening is the best teachable moment there is.',
    'The scan: low-dose (about 1.5 mSv), thin-section, read by a radiologist using Lung-RADS, with the category and the next step in the report; a registry (ACR) and a tracking system so that no positive scan is lost. The nodule page gives the Lung-RADS categories and the advisor.',
    'Adherence is the weak point: in practice only about half of people return for the next annual scan, and far fewer than half of the eligible are screened at all. Navigators, reminders, and keeping the first conversation honest about what follow-up means all help.',
    'The Veterans Health Administration demonstration project (eight academic VA hospitals, 2013–2015): of 93,033 primary-care patients assessed, 4,246 met NLST-era criteria, 57.7% agreed and 2,106 were screened. 59.7% had a nodule and 56.2% needed tracking; 2.0% needed further evaluation for findings that were not cancer; 1.5% had lung cancer (most early stage); 40.7% had incidental findings — emphysema, other lung abnormalities, coronary calcification. Nearly 900,000 of 6.7 million VHA patients were estimated to be eligible: the lesson was that screening needs coordinators, tracking databases and the time to handle what it finds, not just a scanner.'] },
  { h: 'What a positive screen means for the patient', p: 'A Lung-RADS 3 or 4 scan is not a diagnosis of cancer: most are benign and most are settled by a repeat LDCT at 3 or 6 months. The conversation that follows should name the category, the probability, the plan and the date. Once a cancer is diagnosed the person leaves the screening pathway for staging (PET/CT, mediastinal staging, brain imaging where indicated) and treatment; after curative treatment, surveillance CT continues, and the screening eligibility of the other lung does not go away.' },
  { src: ['US Preventive Services Task Force. Screening for lung cancer: recommendation statement. JAMA 2021;325:962–70.', 'Wolf AMD, et al. Screening for lung cancer: 2023 guideline update from the American Cancer Society. CA Cancer J Clin 2024;74:50–81.', 'Mazzone PJ, et al. Screening for lung cancer: CHEST guideline and expert panel report. Chest 2021;160:e427–94.', 'National Lung Screening Trial Research Team. Reduced lung-cancer mortality with low-dose CT screening. N Engl J Med 2011;365:395–409.', 'de Koning HJ, et al. Reduced lung-cancer mortality with volume CT screening in a randomized trial (NELSON). N Engl J Med 2020;382:503–13.', 'Kinsinger LS, Anderson C, Kim J, et al. Implementation of lung cancer screening in the Veterans Health Administration. JAMA Intern Med 2017;177:399–406.', 'Patel S, Baptiste JV. Lung cancer screening. In: ATS core curriculum 2021 — lung cancer. ATS Scholar 2021.', 'American Thoracic Society patient education: lung cancer screening and what a nodule means.'] }
] };

T.incidentals = { title: 'Other abnormalities on chest CT', kicker: 'What else the scan shows, and what to do with it', blocks: [
  { p: 'Four in ten screening CTs and a good share of all chest CTs show something other than a nodule that needs a decision. Most of it needs nothing or a note; a few findings change management, and some are the reason the person was imaged in the first place. Lung-RADS flags them with an S modifier and defers to the ACR incidental-findings guidance; this page keeps the ones a pulmonologist is asked about.' },
  { h: 'Lung', ul: [
    'Interstitial lung abnormalities (Fleischner 2020): incidental ground-glass, reticulation, traction bronchiectasis or honeycombing involving at least 5% of a lung zone in a person without known interstitial lung disease, found in 4–9% of smokers and 2–7% of non-smokers. Non-subpleural and non-fibrotic patterns are usually followed by CT in 12–24 months; subpleural fibrotic ILA (reticulation with traction bronchiectasis or honeycombing in the lower zones) progresses in about half within 2–3 years and carries a higher mortality — pulmonary function with DLCO, a history for exposures and connective tissue disease, and referral to an interstitial lung disease clinic. Dependent atelectasis and centrilobular nodularity of smoking are not ILA.',
    'Emphysema: present on about a third of screening scans; it is a risk factor for lung cancer (and a Brock variable), and a reason for spirometry and smoking cessation even when the person has no diagnosis of COPD. Paraseptal blebs and bullae are noted; a giant bulla is a surgical question.',
    'Bronchiectasis, tree-in-bud opacities and mucus plugging suggest infection — non-tuberculous mycobacteria in the middle lobe and lingula of older women, aspiration in the dependent segments; cultures and a CT in 1–3 months rather than a nodule pathway. Segmental or lobar consolidation and clusters of new nodules (more than six) are managed as infection first (Lung-RADS 0, repeat LDCT in 1–3 months).',
    'Cysts: a thin-walled (< 2 mm) unilocular cyst is benign and not followed; a thick-walled, multilocular or growing cyst, or a cyst with a nodule, is handled as a lung cancer risk (Lung-RADS atypical cyst, 3–4B). Many cysts raise the question of lymphangioleiomyomatosis, Langerhans cell histiocytosis or Birt–Hogg–Dubé.',
    'An airway nodule that is segmental or more proximal is Lung-RADS 4A and, if it persists at 3 months, 4B with bronchoscopy; subsegmental and tubular airway opacities are secretions.',
    'Pleura: plaques (asbestos exposure; no follow-up needed, but a history and spirometry); an effusion or nodular pleural thickening needs an explanation; a pneumothorax is reported urgently.'] },
  { h: 'Mediastinum, heart and the rest', ul: [
    'Mediastinal or hilar lymph nodes over 10 mm in short axis: in a smoker with a nodule they are the staging question (EBUS-TBNA); bilateral symmetric hilar nodes point to sarcoidosis; calcified nodes to old granulomatous disease. The nodal station map and the EBUS pages cover the sampling.',
    'Coronary artery calcification: predicts cardiovascular events independently of risk scores and is the commonest S-modifier finding; report it, estimate ASCVD risk and discuss a statin; extensive calcification or a mass-like density in the heart goes to cardiology. Aortic aneurysm (ascending > 4.5 cm, descending > 4 cm) and valve calcification are reported.',
    'Thyroid nodules (ACR: 1.5 cm or more, or 1 cm with suspicious features, gets an ultrasound), adrenal nodules (under 4 cm with an attenuation under 10 HU are adenomas), liver and renal lesions, breast masses and, on the bones, lytic or sclerotic lesions all follow the ACR white papers; a vertebral compression fracture is an osteoporosis diagnosis.',
    'The oesophagus (a dilated oesophagus, a hiatal hernia), the chest wall and the thyroid are the usual incidental soft-tissue findings.'] },
  { h: 'Keeping it proportionate', p: 'The point of an incidental finding is the next step, not the list. Note what matters to the patient (cardiac risk, a treatable lung disease, a cancer elsewhere), hand off what belongs to another service, and avoid a second cascade of tests for findings that are benign by their imaging features. Document the plan in the same note as the nodule plan so the two are not lost separately.' },
  { src: ['Hatabu H, Hunninghake GM, Richeldi L, et al. Interstitial lung abnormalities detected incidentally on CT: a position paper from the Fleischner Society. Lancet Respir Med 2020;8:726–37.', 'American College of Radiology. Lung-RADS v2022; ACR Lung Cancer Screening CT Incidental Findings Quick Reference Guide; ACR Incidental Findings white papers.', 'Kinsinger LS, et al. Implementation of lung cancer screening in the Veterans Health Administration. JAMA Intern Med 2017;177:399–406.'] }
] };

const GROUPS = [{ title: 'Nodules and screening', ids: ['nodules', 'screening', 'incidentals'] }];
root.PFT_NOD = { topics: T, groups: GROUPS, mayo: mayo, va: va, brock: brock, vdt: vdt, fleischner: fleischner, lungRads: lungRads };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PFT_NOD;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
