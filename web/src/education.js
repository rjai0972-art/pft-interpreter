/* PFT Interpreter — Learn section.
   Each topic is a list of blocks drawn by the Learn page:
     { h, p } paragraph · { h, ul } bullets · { h, ol } numbered steps · { h, table:{head,rows}, note } table
     { h, fig:'zscale'|'loopLegend'|'loops' } picture · { terms:true } glossary entries for this topic · { src:[...] } sources
   Glossary terms (the (i) pop-ups) with the same topic id are listed at the bottom of each topic automatically. */
(function (root) {
'use strict';

const T = {};

T.basics = { title: 'Reading a PFT: the logic', kicker: 'Start here', blocks: [
  { p: 'A pulmonary function report is read in a fixed order, and each step narrows what the next one means. The order below is the one ERS/ATS 2022 recommends and the one this app follows.' },
  { h: 'The order of reasoning', ol: [
    'FEV1/FVC against the lower limit of normal (LLN). A ratio below the LLN is airflow obstruction, and nothing else defines it.',
    'If the ratio is low: the FEV1 z-score sets the severity. The FVC then points to other pathology (a low FVC with obstruction means air trapping, coexisting restriction, or a short exhalation).',
    'Total lung capacity (TLC): low = restriction, normal, or high = hyperinflation. Only the TLC can confirm restriction.',
    'RV and RV/TLC: high with obstruction = air trapping and hyperinflation. Low TLC with a high RV/TLC = complex restriction (think weakness or chest wall).',
    'DLCO, graded by its z-score and always read with VA and KCO, with the hemoglobin (and carboxyhemoglobin) in mind.',
    'Then the extras: bronchodilator response, loop shape, muscle strength, FeNO, challenge testing, exercise tests, blood gas.',
    'Compare with prior studies, then put pattern, severity, gas transfer and the clinical question together in the interpretation.'] },
  { h: 'z-scores and the lower limit of normal', p: 'A z-score says how many standard deviations a result sits from the average of healthy people of the same age, sex and height. Zero is average. The LLN is −1.645 (the 5th percentile) and the ULN is +1.645. Because the spread of healthy values changes with age and height, a z-score is fair across the whole age range, where a fixed percentage of predicted is not.', fig: 'zscale' },
  { h: 'Severity bands (ERS/ATS 2022)', table: { head: ['z-score', 'Label'], rows: [['−1.645 to −2.5', 'Mild'], ['−2.51 to −4.0', 'Moderate'], ['below −4.0', 'Severe'], ['above +1.645', 'Above the upper limit of normal']] },
    note: 'The same bands are used for FEV1, FVC, TLC, DLCO and the other indices. Severity here describes the physiological impairment, not how the patient feels or functions.' },
  { h: 'Why not 80% of predicted, or a fixed ratio of 0.70?', p: 'Fixed cut-offs are easy to remember but misclassify. FEV1/FVC falls with age, so a fixed 0.70 over-calls obstruction in older adults and under-calls it in the young. A fixed 80% of predicted does the same with height and age. The LLN moves with the person. This app uses the LLN, as ERS/ATS 2022 recommends.' },
  { h: 'Borderline values', p: '1 in 20 healthy people falls below the LLN on any single measure by definition. A value just above the LLN can still be meaningful, for example in a patient with symptoms, a falling trend, or a family history. The Details step has a setting for how close to the LLN a value must be to be called borderline.' },
  { h: 'Limits to keep in mind', ul: [
    'A z-score is only as good as the equation behind it and the quality of the maneuver behind that.',
    'PFTs describe physiology. They rarely make a diagnosis alone; the interpretation has to be put beside the history, imaging and exam.',
    'With many measurements on one report, a healthy person has a high chance of one value falling below the LLN by chance. A single borderline-low number in an otherwise normal study is rarely meaningful.'] },
  { terms: true },
  { src: ['Stanojevic S, et al. ERS/ATS technical standard on interpretive strategies for routine lung function tests. Eur Respir J 2022;60:2101499.', 'Annals ATS 2025 (standardized phraseology and codes).'] }
] };

T.spiro = { title: 'Spirometry', kicker: 'FEV1 · FVC · FEV1/FVC', blocks: [
  { h: 'What it is for', ul: [
    'Detects and grades airflow obstruction (asthma, COPD, bronchiectasis, cystic fibrosis, bronchiolitis).',
    'Shows a pattern that suggests restriction (low FVC, preserved ratio), which the lung volumes then confirm or refute.',
    'The standard way to follow disease: FEV1 and FVC over time in obstructive disease, ILD, cystic fibrosis, transplant.',
    'First-line test for cough, dyspnea, wheeze, and before many procedures.'] },
  { h: 'What good technique looks like (ATS/ERS 2019)', ul: [
    'Maximal inhalation, a fast, forceful blast out, and continued exhalation to a plateau or at least 6 seconds in adults.',
    'A sharp start: back-extrapolated volume under 5% of the FVC or 0.100 L, whichever is greater.',
    'No cough in the first second, no early termination, no leak, no obstruction of the mouthpiece.',
    'At least 3 acceptable maneuvers; the two largest FEV1 values and the two largest FVC values within 0.150 L of each other.'] },
  { h: 'Quality grades', table: { head: ['Grade', 'What it means'], rows: [
      ['A', '3 or more acceptable maneuvers, repeatable within 0.150 L'],
      ['B', '2 acceptable, repeatable within 0.150 L'],
      ['C', '2 or more acceptable, repeatable within 0.200 L'],
      ['D', '2 or more acceptable, repeatable within 0.250 L'],
      ['E', 'Only 1 acceptable, or 2 or more that do not repeat within 0.250 L'],
      ['U', 'No acceptable maneuver but at least one usable'],
      ['F', 'No acceptable or usable maneuver']] },
    note: 'Grades describe the maneuvers, not the patient. Grades A and B support interpretation with confidence; C to E carry a technical caveat; F should generally not be reported.' },
  { h: 'How to read it', ol: [
    'Look at the FEV1/FVC z-score. Below the LLN = obstruction.',
    'If low, grade the obstruction by the FEV1 z-score (mild −1.65 to −2.5; moderate −2.51 to −4.0; severe below −4.0).',
    'Check the FVC. Low FVC with a low ratio: air trapping, coexisting restriction, or an incomplete exhalation. Lung volumes separate them.',
    'If the ratio is normal and the FVC is low: the pattern suggests restriction, but only the TLC confirms it. Many patients with this pattern turn out to have a normal TLC.',
    'Look at the loop. A scooped (concave) limb can precede a low ratio. A flat-topped or truncated limb should raise the question of upper-airway obstruction.',
    'FEF25–75% is not used to define obstruction or its severity (ERS/ATS 2022).'] },
  { h: 'Patterns at a glance', table: { head: ['FEV1/FVC', 'FEV1', 'FVC', 'Reading'], rows: [
      ['Low', 'Low', 'Normal', 'Obstruction, graded by the FEV1 z-score'],
      ['Low', 'Low', 'Low', 'Obstruction with a low FVC: air trapping, coexisting restriction or short exhalation; get lung volumes'],
      ['Low', 'Normal', 'High', 'Possible obstruction in a dysanaptic (large airways relative to lung size) normal variant'],
      ['Normal', 'Low', 'Low', 'Suggests restriction; confirm with TLC. If effort was poor, say so'],
      ['Normal', 'Normal', 'Normal', 'No obstruction; look at the loop for early concavity'],
      ['Normal', 'Low or normal', 'Low or normal', 'Isolated low FEV1 or FVC with a normal ratio: recheck effort and technique before interpreting']] } },
  { h: 'Limitations', ul: [
    'Effort dependent. A submaximal effort lowers every value and can mimic restriction or weakness.',
    'A normal spirometry does not exclude asthma, early emphysema, small-airway disease or mild interstitial lung disease.',
    'Not informative about gas exchange; add DLCO.',
    'Values depend on the reference set. A different set shifts the z-scores and can change the label, especially in older, taller, shorter and non-European-ancestry patients.',
    'A single study reports one day; day-to-day variation of FEV1 in a stable person is about 5%.'] },
  { terms: true },
  { src: ['Graham BL, et al. Standardization of spirometry 2019 update. ATS/ERS. Am J Respir Crit Care Med 2019;200:e70.', 'Stanojevic S, et al. Eur Respir J 2022 (interpretive strategies).'] }
] };

T.loops = { title: 'Flow–volume loops', kicker: 'Shape, peak flow, FIF50/FEF50', blocks: [
  { h: 'What it is for', ul: [
    'Quick check of effort and technique: a good loop has a sharp peak early and a smooth, complete exhalation.',
    'Shows the type of obstruction: scooped limbs for intrathoracic airflow obstruction; plateaus for central or upper-airway obstruction.',
    'Looks for patterns that the numbers can miss: dynamic (variable) upper-airway obstruction, vocal-cord dysfunction, tracheomalacia, weakness.'] },
  { h: 'How to read the axes', p: 'The vertical axis is flow; the horizontal axis is volume. Expiration plots above the line (read left to right, from TLC to RV), inspiration below. The peak expiratory flow comes early; the descending limb is roughly straight in a healthy adult.', fig: 'loopLegend' },
  { h: 'A systematic look', ol: [
    'Is the loop complete and reproducible? Overlay at least three efforts. Flattening only counts if it reproduces.',
    'Is the start sharp, with a peak flow in the first part of the exhalation? A late, rounded peak means submaximal effort or weakness.',
    'Is the expiratory limb straight, scooped (concave) or flat-topped?',
    'Is the inspiratory limb a full, smooth half-circle? A flat inspiratory limb is easy to miss on a report that prints only the expiratory part.',
    'Do the flows agree with the numbers? Compare the shape with the FEV1/FVC, the PEF, FEV1/PEF and FIF50/FEF50.'] },
  { h: 'Upper-airway obstruction: what the loop should show', table: { head: ['Lesion', 'Expiratory limb', 'Inspiratory limb', 'Indices'], rows: [
      ['Variable extrathoracic (vocal-cord dysfunction or paralysis, goiter, extrathoracic mass)', 'Preserved', 'Flattened or truncated', 'FIF50/FEF50 below 1'],
      ['Variable intrathoracic (tracheomalacia, intrathoracic tracheal tumor)', 'Early peak then plateau', 'Preserved', 'FIF50/FEF50 above 1'],
      ['Fixed (tracheal stenosis, fixed lesion)', 'Flattened', 'Flattened (box-like loop)', 'FIF50/FEF50 about 1; FEV1/PEF above 8']] },
    note: 'Confirm with laryngoscopy during symptoms, dynamic airway CT or bronchoscopy. Poor effort can imitate each of these, so look for reproducibility.' },
  { h: 'Typical loops: the gallery', fig: 'loops' },
  { h: 'Limitations', ul: [
    'The shape supports, but does not replace, the numbers and the clinical picture.',
    'Many shapes are not specific: a small tall loop can be restriction, effort or weakness; a flat limb can be a lesion or poor effort.',
    'Needs a full inspiratory maneuver to read the inspiratory limb. If inspiration was not maximal, do not interpret it.',
    'Printed loops are often small and tell little about reproducibility; review the labs’ overlays when you can.'] },
  { terms: true },
  { src: ['Stanojevic S, et al. ERS/ATS 2022 (Table of flow–volume loop patterns and the FIF50/FEF50 and FEV1/PEF indices).', 'Annals ATS 2025 (S10, S51–S53 phrases).'] }
] };

T.bd = { title: 'Bronchodilator response', kicker: 'Reversibility', blocks: [
  { h: 'What it is for', ul: [
    'Shows how much of the obstruction reverses with an inhaled short-acting bronchodilator.',
    'Documents whether obstruction persists after treatment, which matters for how the disease is classified and followed.',
    'A significant response supports asthma-like physiology; a lack of response does not exclude asthma.'] },
  { h: 'How the test is done', p: 'Baseline spirometry, a short-acting bronchodilator (for example albuterol 400 µg by metered-dose inhaler and spacer), a 10 to 15 minute wait, then repeat spirometry. Bronchodilators should be withheld beforehand according to the lab’s protocol; if they were not, the measured response is smaller.' },
  { h: 'How to read it', ol: [
    'Compute the change in FEV1 and in FVC, each as a percentage of its predicted value: (post − pre) ÷ predicted × 100.',
    'A change above 10% of the predicted value in FEV1 and/or FVC is a significant response (ERS/ATS 2022). This replaced the older 12% and 200 mL of baseline rule.',
    'Look at the post-bronchodilator ratio. If it is still below the LLN, obstruction persists.',
    'Look at the post-bronchodilator loop. A flat or scooped limb that does not change is information too.'] },
  { h: 'Limitations', ul: [
    'The response varies from visit to visit. A negative test on one day does not make airway lability impossible.',
    'Big changes in the FVC with little change in the FEV1 reflect gas trapping that released, not necessarily large-airway reversibility.',
    'Someone with normal baseline spirometry and a normal ratio can still have asthma; a bronchodilator response is not required for the diagnosis.'] },
  { terms: true },
  { src: ['Stanojevic S, et al. Eur Respir J 2022;60:2101499 (bronchodilator responsiveness: > 10% of predicted).'] }
] };

T.vol = { title: 'Lung volumes', kicker: 'TLC · RV · RV/TLC · FRC', blocks: [
  { h: 'What it is for', ul: [
    'Confirms or excludes restriction (only the TLC can).',
    'Measures hyperinflation and air trapping in obstructive disease.',
    'Separates mixed disorders, and clarifies a low FVC when the ratio is normal or low.',
    'Raises the question of weakness or chest-wall disease when the TLC is low and the RV/TLC is high.'] },
  { h: 'Methods', table: { head: ['Method', 'What it measures', 'Strength', 'Weakness'], rows: [
      ['Body plethysmography', 'All gas in the thorax, including trapped gas', 'Accurate in obstruction', 'Panting technique; claustrophobia; effort'],
      ['Nitrogen washout / helium dilution', 'Gas that mixes with the inspired gas', 'Easy, can be done at the bedside', 'Under-reads TLC and RV when there is trapped or poorly ventilated gas (obstruction, bullae)'],
      ['Single-breath (VA from DLCO)', 'Alveolar volume during the breath-hold', 'No extra test', 'Least accurate; under-reads in obstruction'],
      ['Imaging (CT volumes)', 'Anatomical lung volume', 'Independent of effort', 'Not a physiological test; inspiratory CT lung volume is not the same as TLC']] } },
  { h: 'How to read it', ol: [
    'TLC below the LLN = restriction. A low FVC with a normal TLC is not restriction.',
    'TLC above the ULN = hyperinflation (with obstruction) or large lungs (normal variant) if the ratio is normal.',
    'RV/TLC above the ULN = air trapping.',
    'Low TLC and a high RV/TLC = complex restriction: ask about respiratory muscle weakness and chest-wall disease; measure MIP/MEP and the supine fall in vital capacity.',
    'Obstruction with a low TLC = mixed disorder (a low TLC with a low ratio, confirmed by plethysmography).'] },
  { h: 'Patterns', table: { head: ['TLC', 'RV/TLC', 'Pattern'], rows: [
      ['Low', 'Normal', 'Simple restriction (ILD, pleural disease, obesity, resection)'],
      ['Low', 'High', 'Complex restriction (weakness, chest wall, advanced fibrosis with trapping)'],
      ['Normal', 'High', 'Air trapping (obstructive or small-airway disease)'],
      ['High', 'High', 'Hyperinflation with air trapping (emphysema, severe asthma)'],
      ['Normal', 'Normal', 'Normal volumes']] } },
  { h: 'Limitations', ul: [
    'Dilution methods can under-read TLC in obstruction and so overcall restriction. Check which method was used.',
    'Obesity lowers FRC and ERV; the TLC is often only mildly reduced or normal.',
    'The GLI-2021 volume equations cover ages 5 to 80 and European ancestry; use other groups with caution.',
    'An RV/TLC a little over the ULN can reflect a small TLC (a ratio, not a volume).'] },
  { terms: true },
  { src: ['Stanojevic S, et al. ERS/ATS 2022 (Figure: interpreting lung volumes).', 'Hall GL, et al. GLI-2021 lung volumes. Eur Respir J 2021;57:2000289.'] }
] };

T.dlco = { title: 'DLCO and gas transfer', kicker: 'DLCO · VA · KCO · hemoglobin', blocks: [
  { h: 'What it is for', ul: [
    'Measures the lung’s ability to transfer gas from alveolus to red cell.',
    'Separates airway-predominant from parenchymal or pulmonary-vascular disease.',
    'A sensitive early marker in ILD, emphysema, pulmonary hypertension and drug toxicity (amiodarone, bleomycin, checkpoint inhibitors); used for monitoring.',
    'Helps explain hypoxemia, and a low TLC with a normal or high KCO points to an extraparenchymal cause.'] },
  { h: 'How the test is done', p: 'The patient exhales fully, inhales a gas mix containing a trace of carbon monoxide to full inspiration, holds the breath for about 10 seconds, then exhales. The CO taken up, per unit of driving pressure, is the DLCO. The dilution of the tracer gas gives the alveolar volume (VA). KCO is DLCO divided by VA.' },
  { h: 'How to read it', ol: [
    'Grade the DLCO by its z-score with the same bands as other measures.',
    'Check hemoglobin. Anemia lowers the DLCO; the hemoglobin-adjusted DLCO shows whether the lung contributes beyond that. Polycythemia raises it.',
    'Check carboxyhemoglobin. A smoker with a high COHb will read low.',
    'Look at the VA. A low VA with a preserved or high KCO suggests incomplete expansion (weakness, chest wall, poor effort, resection).',
    'A low DLCO with preserved VA and a low KCO suggests alveolar–capillary or vascular disease.'] },
  { h: 'Patterns', table: { head: ['DLCO', 'VA', 'KCO', 'Think of'], rows: [
      ['Low', 'Normal', 'Low', 'Emphysema, ILD, pulmonary vascular disease, anemia (check Hb)'],
      ['Low', 'Low', 'Low or normal', 'Loss of gas-transfer surface: ILD, resection, extensive emphysema'],
      ['Low', 'Low', 'High', 'Incomplete expansion: weakness, chest wall, pleural disease, poor effort'],
      ['Normal', 'Any', 'Any', 'Normal. A normal DLCO can mask emphysema plus fibrosis, which pull in opposite directions'],
      ['High', 'Any', 'Any', 'Polycythemia, pulmonary hemorrhage, left-to-right shunt, obesity, asthma, exercise or supine posture before the test']] } },
  { h: 'Hemoglobin adjustment', p: 'DLCO is corrected to a standard hemoglobin (ERS/ATS 2017): adjusted DLCO = measured DLCO × (10.22 + Hb) ÷ (1.7 × Hb) for adult men and children over 15; × (9.38 + Hb) ÷ (1.7 × Hb) for women and children under 15. Hb in g/dL. Each percentage point of carboxyhemoglobin lowers the DLCO by roughly 1%, and many labs correct for it.' },
  { h: 'Limitations', ul: [
    'KCO does not scale linearly with VA, so a normal KCO with a low VA does not mean normal gas transfer.',
    'Needs a good effort: inspired volume at least 85% of the largest vital capacity, a 9 to 11 second breath-hold, and repeat values within about 2 units.',
    'Altitude, recent exercise, supine posture, smoking and the time of day all shift the result.',
    'GLI-2017 DLCO equations are for European ancestry; a hemoglobin-based reference is needed for many clinical questions.'] },
  { terms: true },
  { src: ['Graham BL, et al. ERS/ATS standardization of the single-breath DLCO 2017. Eur Respir J 2017;49:1600016.', 'Stanojevic S, et al. GLI-2017 TLCO. Eur Respir J 2017;50:1700010.'] }
] };

T.raw = { title: 'Airway resistance', kicker: 'Raw · sRaw · sGaw', blocks: [
  { h: 'What it is for', ul: [
    'Measures resistance to airflow during tidal breathing in the body box, without a forced maneuver.',
    'Helps when forced maneuvers are hard or misleading (central airway obstruction, vocal-cord dysfunction, poor cooperation).',
    'A response to bronchodilator can be shown in resistance when the FEV1 does not change.'] },
  { h: 'How to read it', ol: [
    'Raw (resistance) is high, and sGaw (specific conductance) is low, in airflow obstruction.',
    'sRaw is Raw multiplied by the thoracic gas volume at which it was measured; it adjusts for lung size.',
    'Look at the resistance loop: a shallow slope and a widely open loop suggest obstruction.',
    'Interpret against the lab’s reference values or the z-scores they report.'] },
  { h: 'Limitations', ul: [
    'Panting frequency matters; very rapid panting can distort the measurement.',
    'Upper-airway resistance contributes; nasal breathing or a closed glottis changes the result.',
    'Reference equations are less standardized than for spirometry.'] },
  { terms: true },
  { src: ['Criée CP, et al. Body plethysmography: its principles and clinical use. Respir Med 2011;105:959.', 'ERS/ATS 2022 (interpretive strategies).'] }
] };

T.osc = { title: 'Oscillometry', kicker: 'R5 · R5–R20 · X5 · AX · Fres', blocks: [
  { h: 'What it is for', ul: [
    'Measures the mechanical impedance of the respiratory system during quiet breathing, with small pressure oscillations at the mouth.',
    'No forced maneuver, so it works in young children, the elderly and in patients who cannot do spirometry well.',
    'Sensitive to small-airway disease and to bronchodilator and bronchoprovocation responses.'] },
  { h: 'How to read it', ol: [
    'R5 (resistance at 5 Hz) reflects total airway resistance; R20 reflects the large airways. R5–R20 is the frequency dependence of resistance and is thought to reflect small-airway disease.',
    'X5 (reactance at 5 Hz) becomes more negative when peripheral lung is stiff or obstructed. AX (area of reactance) and Fres (resonant frequency) rise in the same conditions.',
    'A bronchodilator response is judged by the lab’s criterion (often a fall in R5 or a rise in X5 beyond the within-subject variability).'] },
  { h: 'Limitations', ul: [
    'Devices differ, and reference equations differ between devices. This app takes the lab’s categories rather than recalculating them.',
    'Upper-airway shunt (cheek and tongue movement) lowers the apparent resistance. Hold the cheeks and avoid swallowing.',
    'Oscillometry has not replaced spirometry for diagnosing obstruction or grading severity.'] },
  { terms: true },
  { src: ['King GG, et al. Technical standards for respiratory oscillometry. Eur Respir J 2020;55:1900753.'] }
] };

T.mip = { title: 'Respiratory muscle strength', kicker: 'MIP · MEP · SNIP · cough peak flow', blocks: [
  { h: 'What it is for', ul: [
    'Detects weakness of the inspiratory muscles (diaphragm) and expiratory muscles when the lung volumes show a low TLC with a high RV/TLC, or when there is unexplained dyspnea, hypercapnia or orthopnea.',
    'Used in ALS, myasthenia gravis, Guillain–Barré, muscular dystrophies, diaphragm paralysis, spinal cord injury and critical illness.',
    'Cough peak flow estimates whether a patient can clear secretions.'] },
  { h: 'How to read it', ol: [
    'MIP is measured at residual volume; MEP at total lung capacity; SNIP is a nasal sniff from FRC. All are reported as magnitudes in cmH2O.',
    'This app flags a low MIP below 75 (men) or 50 (women) cmH2O, a low MEP below 100 or 80, and a low SNIP below 40, as screening thresholds from Kaminsky 2018. A lab’s own reference values take priority.',
    'A normal MIP largely excludes clinically important inspiratory weakness. A low value is only convincing when the effort was maximal and reproducible.',
    'Low MIP and MEP together, with a low TLC and a high RV/TLC, indicate generalized weakness.',
    'Cough peak flow: 270 L/min or more is adequate; below 270 reduced; 160 or less an ineffective cough.'] },
  { h: 'Limitations', ul: [
    'Effort and learning dependent. A low value with a poor effort is not weakness.',
    'Hyperinflation lowers the MIP because the diaphragm starts from a shortened length.',
    'Cheek and lip leaks and blocked nostrils (for SNIP) cause false-low readings.',
    'MIP does not distinguish central from peripheral causes of weakness.'] },
  { terms: true },
  { src: ['Laveneziana P, et al. ERS statement on respiratory muscle testing at rest and during exercise. Eur Respir J 2019;53:1801214.', 'Kaminsky DA, et al. ATS Pulmonary function testing interpretation, 2018.'] }
] };

T.post = { title: 'Upright vs. supine testing', kicker: 'Supine fall in vital capacity · orthodeoxia', blocks: [
  { h: 'What it is for', ul: [
    'Supine vital capacity looks for diaphragm weakness in a patient with orthopnea or unexplained restriction.',
    'Upright versus supine oxygenation looks for orthodeoxia in platypnea–orthodeoxia (PFO or other shunts, hepatopulmonary syndrome, basal lung disease).'] },
  { h: 'How to read it', ol: [
    'Measure the FVC (or SVC) sitting, wait a few minutes supine, and repeat.',
    'A fall of 10% is the usual upper limit of normal; 20% or more suggests diaphragm weakness, and 30% or more bilateral diaphragm weakness.',
    'For oxygenation, a fall in SpO2 of 5 points or more, or in PaO2 of more than 4 mmHg, from supine to upright is orthodeoxia.'] },
  { h: 'Limitations', ul: [
    'Obesity, ascites, and pregnancy lower the supine value too.',
    'A single measurement can be affected by effort; repeat when the numbers are borderline.',
    'Platypnea–orthodeoxia can be intermittent; a normal study on one day does not exclude it.'] },
  { terms: true },
  { src: ['Kaminsky DA, et al. ATS Pulmonary function testing interpretation, 2018.', 'Laveneziana P, et al. Eur Respir J 2019.'] }
] };

T.feno = { title: 'Exhaled nitric oxide', kicker: 'FeNO', blocks: [
  { h: 'What it is for', ul: [
    'A noninvasive marker of type-2 (eosinophilic) airway inflammation.',
    'Supports a diagnosis of asthma in a patient with compatible symptoms, predicts steroid responsiveness, and helps monitor adherence.',
    'Helps in chronic cough: a high FeNO supports eosinophilic bronchitis or cough-variant asthma.'] },
  { h: 'How to read it', table: { head: ['', 'Low', 'Intermediate', 'High'], rows: [['Adults', 'below 25 ppb', '25–50 ppb', 'above 50 ppb'], ['Children under 12', 'below 20 ppb', '20–35 ppb', 'above 35 ppb']] },
    note: 'ATS 2011 cut-points. A high value in a symptomatic patient predicts a response to inhaled corticosteroids; a low value makes a response less likely. Use trend (a change of 20% or more above 50 ppb, or 10 ppb below it) rather than single values when monitoring.' },
  { h: 'Limitations', ul: [
    'Lowered by smoking and by corticosteroids; raised by recent nitrate-rich food and by some infections and by allergen exposure.',
    'A normal FeNO does not exclude asthma, especially non-eosinophilic asthma.',
    'Not specific: a high value occurs in eosinophilic bronchitis, atopy and allergic rhinitis without asthma.'] },
  { terms: true },
  { src: ['Dweik RA, et al. An official ATS clinical practice guideline: interpretation of exhaled nitric oxide levels (FeNO) for clinical applications. Am J Respir Crit Care Med 2011;184:602.'] }
] };

T.bronch = { title: 'Bronchoprovocation testing', kicker: 'Methacholine · mannitol · exercise/EVH', blocks: [
  { h: 'What it is for', ul: [
    'Tests for airway hyperresponsiveness when asthma is suspected but spirometry is normal.',
    'A negative methacholine test in a patient with current symptoms and no controller therapy makes current asthma unlikely.',
    'Indirect challenges (mannitol, exercise, eucapnic voluntary hyperventilation) are more specific for the inflammation of asthma and are used for exercise-induced bronchoconstriction.'] },
  { h: 'How to read it', ol: [
    'Methacholine: PC20 or PD20 is the dose that lowers FEV1 by 20%. Above 16 mg/mL is negative, 4 to 16 borderline, below 4 positive.',
    'Mannitol: positive with a fall of 15% from baseline at a cumulative dose of 635 mg or less, or an incremental fall of 10% or more between consecutive doses.',
    'Exercise or EVH: positive with a fall in FEV1 of 10% or more at two consecutive time points after the challenge.',
    'Report the reversal with a bronchodilator when the FEV1 fell by 20% or more (or by the lab’s stopping criterion).'] },
  { h: 'Limitations', ul: [
    'Sensitive but not specific: a positive methacholine test also occurs in COPD, allergic rhinitis, heart failure and after viral infection.',
    'Inhaled corticosteroids and recent bronchodilators lower the response and cause false-negatives. Follow the lab’s hold times.',
    'A low baseline FEV1 (roughly under 60 to 70% of predicted) is a relative contraindication; follow the lab’s criteria.',
    'Not a screening test in healthy people.'] },
  { terms: true },
  { src: ['Coates AL, et al. ERS technical standard on bronchial challenge testing: general considerations and performance of methacholine challenge tests. Eur Respir J 2017;49:1601526.', 'Parsons JP, et al. ATS clinical practice guideline: exercise-induced bronchoconstriction. Am J Respir Crit Care Med 2013;187:1016.'] }
] };

T.sixmw = { title: 'The 6-minute walk test', kicker: 'Distance · desaturation · trend', blocks: [
  { h: 'What it is for', ul: [
    'Measures functional capacity for activities of daily living and its change with disease or treatment.',
    'Prognostic in pulmonary hypertension, ILD, COPD, heart failure and before transplant.',
    'Detects exertional desaturation and helps titrate oxygen.',
    'Follows response to treatment and rehabilitation over time. The trend section of this app is built for this.'] },
  { h: 'How the test is done', p: 'The patient walks as far as possible in 6 minutes along a flat, straight corridor, with standard encouragement every minute, and may slow or rest. SpO2, heart rate and Borg dyspnea are recorded at baseline and at the end, and heart-rate recovery at 1 minute. Keep the track, the encouragement script, the oxygen delivery and the walking aid the same on every visit so the distances can be compared.' },
  { h: 'How to read the distance', ol: [
    'Compare with a reference equation (distance versus the predicted value and its LLN). The equation matters: see Reference equations.',
    'Judge change by the minimal important difference of about 30 m (25 to 33 m, ERS/ATS 2014), not by a single figure.',
    'In IPF a fall of more than 50 m over about 24 weeks predicted mortality (du Bois 2011).',
    'Disease-specific anchors exist: in COPD the BODE index scores a 6MWD of 350 m or more as best and 149 m or less as worst; in pulmonary arterial hypertension, ESC/ERS 2022 risk bands are above 440 m (low), 165 to 440 m (intermediate) and below 165 m (high).'] },
  { h: 'How to read the saturation, heart rate and effort', ul: [
    'Desaturation: a nadir at or below 88%, or a fall of 4 points or more, is clinically relevant; at or below 88% is the range used to qualify for supplemental oxygen in many guidelines.',
    'The distance–saturation product (distance × nadir SpO2 as a fraction) below 200 m% predicted 12-month mortality in IPF (Lettieri 2006).',
    'Heart-rate recovery at 1 minute below about 13 to 18 bpm is abnormal.',
    'Heart rate and Borg scores at the end describe effort. A walk that ends at a low heart rate and a low Borg score may not have been maximal.'] },
  { h: 'Reading the trend', ol: [
    'Look at the change from the previous walk and from the first walk, in meters and percent, and over the time between them.',
    'A change smaller than 30 m is within the minimal important difference. The shaded band on the chart shows ±30 m around the previous walk.',
    'A fall larger than the MID counts only if the conditions matched. Check the track, the encouragement, oxygen use, walking aid, time of day and intercurrent illness.',
    'The first walk often reads low (a learning effect of roughly 25 m in several studies). If a practice walk was done, use the longer distance.',
    'Annualised rates need an interval of at least 3 months; shorter intervals exaggerate the rate.'] },
  { h: 'Limitations', ul: [
    'Sensitive to technique: track length, encouragement and walking aids (a walker lowers the distance by roughly 6%). Supplemental oxygen can increase the distance by 12 to 59 m.',
    'Reference equations disagree by 100 m or more for the same patient. Name the one used.',
    'Ceiling effect: a fit patient will walk a normal distance with an abnormal CPET; use CPET when the question is exercise limitation.',
    'The 6MWT says how far, not why. Pair it with the other tests.'] },
  { terms: true },
  { src: ['Holland AE, et al. ERS/ATS technical standard: field walking tests in chronic respiratory disease. Eur Respir J 2014;44:1428.', 'du Bois RM, et al. 6-minute-walk test in idiopathic pulmonary fibrosis. Am J Respir Crit Care Med 2011;183:1231.', 'Lettieri CJ, et al. Prognostic role of the 6-minute walk test and the distance–saturation product in idiopathic pulmonary fibrosis. Chest 2006.', 'Kaminsky DA, et al. ATS Pulmonary function testing interpretation, 2018.'] }
] };

T.cpet = { title: 'Cardiopulmonary exercise testing', kicker: 'VO2 · lactate threshold · O2 pulse · VE/VCO2', blocks: [
  { h: 'What it is for', ul: [
    'Separates the cause of exercise limitation: cardiac, ventilatory, gas-exchange, vascular, deconditioning, obesity, poor effort or symptoms without a physiological limit.',
    'Quantifies peak aerobic capacity before surgery or transplant, and in heart failure and pulmonary hypertension.',
    'Evaluates unexplained dyspnea when the resting tests are normal.'] },
  { h: 'How to read it', ol: [
    'Effort first: a peak respiratory exchange ratio (RER) of 1.0 or more (many labs require 1.10) and a peak heart rate that reaches 85% of predicted suggest a maximal effort.',
    'Peak VO2: normal above about 83% predicted. Low peak VO2 prompts the next question: why?',
    'Lactate threshold and O2 pulse: an early threshold and a low, flattening O2 pulse point to cardiac limitation or deconditioning.',
    'Ventilatory reserve (peak VE/MVV): above about 0.8 means ventilation is exhausted, as in lung disease.',
    'VE/VCO2 slope and nadir and PETCO2: high VE/VCO2 and low PETCO2 point to ventilation–perfusion inefficiency (pulmonary vascular disease, heart failure).',
    'Oxygen saturation: a fall of 5 points or more, or below 93%, is exercise-induced hypoxemia.',
    'Heart-rate recovery: 12 bpm or less at 1 minute is abnormal.'] },
  { h: 'Patterns', table: { head: ['Finding', 'Points to'], rows: [
      ['Low VO2, low O2 pulse, early threshold, preserved ventilatory reserve', 'Cardiac limitation or deconditioning'],
      ['Low VO2, exhausted ventilatory reserve, normal heart-rate reserve', 'Ventilatory limitation (lung disease, chest wall)'],
      ['Low VO2, high VE/VCO2, low PETCO2, desaturation', 'Pulmonary vascular disease or severe ILD'],
      ['Low VO2 with early stopping, no physiological limit, low RER', 'Submaximal effort or a symptom-limited test']] } },
  { h: 'Limitations', ul: [
    'Needs maximal effort and a skilled team; a submaximal test is hard to interpret.',
    'Reference values differ by population and protocol; this app uses age- and sex-based cut-offs from Kaminsky 2018.',
    'Obesity lowers VO2 per kilogram and can mimic cardiac limitation when expressed that way.'] },
  { terms: true },
  { src: ['Kaminsky DA, et al. ATS Pulmonary function testing interpretation, 2018, ch. 11.', 'Guazzi M, et al. Clinical recommendations for cardiopulmonary exercise testing data assessment. Circulation 2012;126:2261.'] }
] };

T.gas = { title: 'Arterial blood gas', kicker: 'pH · PaCO2 · HCO3 · PaO2 · A–a', blocks: [
  { h: 'What it is for', ul: ['Measures oxygenation and ventilation directly. Identifies hypoxemia, hypercapnia and acid–base disorders, and gauges how well the lung exchanges gas (A–a gradient).'] },
  { h: 'A systematic read', ol: [
    'pH: acidemia below 7.35, alkalemia above 7.45.',
    'Primary disturbance: PaCO2 explains a respiratory change; HCO3 explains a metabolic one.',
    'Compensation: acute respiratory acidosis raises HCO3 by about 1 mEq/L per 10 mmHg rise in PaCO2; chronic raises it by about 3.5 to 4. In metabolic acidosis, expected PaCO2 = 1.5 × HCO3 + 8 (± 2).',
    'Oxygenation: PaO2 and SaO2, with the FiO2. The P/F ratio below 300 is impaired.',
    'A–a gradient: alveolar PO2 = FiO2 × (Patm − 47) − PaCO2 ÷ 0.8; A–a = alveolar PO2 − PaO2. A raised gradient means V/Q mismatch, shunt or diffusion limitation; a normal gradient with hypoxemia means hypoventilation.'] },
  { h: 'Limitations', ul: [
    'The upper limit of the A–a gradient rises with age (age ÷ 4 + 4, or (age + 10) ÷ 4) and with supplemental oxygen.',
    'Venous or mixed samples, air bubbles and delays change the values.',
    'The oximeter and the blood gas can disagree in carbon monoxide poisoning and methemoglobinemia.'] },
  { terms: true },
  { src: ['Standard acid–base physiology and the alveolar gas equation; Kaminsky 2018.'] }
] };

T.prior = { title: 'Comparing with prior studies', kicker: 'Change · rate of decline · progression criteria', blocks: [
  { h: 'What it is for', p: 'A single study is a snapshot. Change over time answers the questions that matter in ILD, cystic fibrosis, transplant, COPD and asthma: is the patient stable, improving or declining, and how fast?' },
  { h: 'How to read it', ol: [
    'Use the same reference equations on both studies, or compare absolute values. A switch of equation (for example from a race-specific set to GLI Global) shifts the predicted values and z-scores without any change in the patient.',
    'Calculate the change in absolute value, the percent change, and the annualised rate. Interval under 3 months: do not annualise.',
    'A change in FEV1 or FVC of 15% or more is outside typical biological variability. A decline of 8% per year is rapid.',
    'In cystic fibrosis, a 10% fall in FEV1 from the previous value flags a possible exacerbation.',
    'In fibrosing ILD the 2022 progression criteria are a fall in FVC of 5% of predicted or more within a year, or a fall in hemoglobin-corrected DLCO of 10% of predicted or more within a year, with other evidence of progression.',
    'In children, use the conditional change score for FEV1 z-scores; in adults, the FEV1Q (units of 0.5 L for men, 0.4 L for women) lets decline be compared across people.'] },
  { h: 'Limitations', ul: [
    'Regression to the mean: an unusually low study is likely to be followed by a higher one.',
    'Effort and quality differ between studies; check the quality grades before calling a change real.',
    'Growth and age: in children and young adults a stable z-score means growth is keeping up; a stable absolute value is a decline.'] },
  { terms: true },
  { src: ['Stanojevic S, et al. Eur Respir J 2022 (change over time).', 'Raghu G, et al. ATS/ERS/JRS/ALAT clinical practice guideline: idiopathic pulmonary fibrosis and progressive pulmonary fibrosis in adults. Am J Respir Crit Care Med 2022;205:e18.'] }
] };

T.equations = { title: 'Reference equations', kicker: 'Which set, why, and what changes', blocks: [
  { p: 'A reference equation predicts what a healthy person of the same age, sex and height would measure, and the spread around it. The z-score and the LLN come from it. This app does not calculate predicted values: it takes the lab’s z-scores or categories and records which equation set produced them.' },
  { h: 'The sets in use', table: { head: ['Measure', 'Recommended', 'Covers', 'Notes'], rows: [
      ['Spirometry', 'GLI Global (race-neutral); ATS 2023', 'About 3 to 95 years', 'Replaces race-specific equations in ATS 2023 guidance'],
      ['Spirometry (older)', 'GLI-2012 (race-specific)', '3 to 95 years', 'Four ancestry groups plus an average for mixed or other; widely used until now'],
      ['Spirometry (legacy, US)', 'NHANES III (Hankinson 1999)', '8 to 80 years', 'Race-specific; not recommended going forward'],
      ['Lung volumes', 'GLI-2021', '5 to 80 years', 'European ancestry only; use other groups with caution'],
      ['DLCO', 'GLI-2017', 'About 5 to 85 years', 'European ancestry; adjust for hemoglobin'],
      ['6MWD', 'Enright & Sherrill 1998; Casanova 2011; Troosters 1999', 'Adult populations of various ages', 'Differ by 100 m or more; locally derived equations are preferred'],
      ['Maximal heart rate', 'Tanaka 2001 (recommended)', 'Adults', '208 − 0.7 × age; 220 − age (Fox) overestimates in older adults'],
      ['A–a gradient (upper limit)', 'Age ÷ 4 + 4, or (age + 10) ÷ 4', 'Adults, room air', 'Rises with age and with FiO2']] } },
  { h: 'Formulas worth knowing', ul: [
    'Enright & Sherrill (1998), men: 6MWD = 7.57 × height (cm) − 5.02 × age − 1.76 × weight (kg) − 309 m; LLN = predicted − 153 m.',
    'Enright & Sherrill (1998), women: 6MWD = 2.11 × height (cm) − 2.29 × weight (kg) − 5.78 × age + 667 m; LLN = predicted − 139 m.',
    'Troosters (1999): 6MWD = 218 + 5.14 × height (cm) − 5.32 × age − 1.80 × weight (kg) + 51.31 × sex (male = 1, female = 0).',
    'Maximal heart rate: Tanaka = 208 − 0.7 × age; Fox = 220 − age.',
    'Alveolar gas: PAO2 = FiO2 × (Patm − 47) − PaCO2 ÷ 0.8.',
    'Hemoglobin-adjusted DLCO = measured × (10.22 + Hb) ÷ (1.7 × Hb) for men; × (9.38 + Hb) ÷ (1.7 × Hb) for women.'] },
  { h: 'What changes when the equation changes', ul: [
    'The predicted value, the LLN and every z-score shift. A patient can move across the LLN without any change in physiology.',
    'Race-specific equations assume lower values in Black and Asian patients, which can hide disease. Race-neutral equations (GLI Global) avoid that assumption but flag more impairment in some patients.',
    'When you compare two studies, check that both used the same set. If they did not, compare absolute values, not z-scores or % predicted.',
    'Outside the age range of an equation set, extrapolation is unreliable. This app warns when the age is outside the range for a test.'] },
  { src: ['Quanjer PH, et al. GLI-2012. Eur Respir J 2012;40:1324.', 'Bowerman C, et al. GLI Global. Am J Respir Crit Care Med 2023;207:768.', 'Bhakta NR, et al. ATS 2023 race and ethnicity in PFT interpretation. Am J Respir Crit Care Med 2023;207:978.', 'Hall GL, et al. Eur Respir J 2021;57:2000289.', 'Stanojevic S, et al. Eur Respir J 2017;50:1700010.', 'Enright PL, Sherrill DL. Am J Respir Crit Care Med 1998;158:1384.', 'Troosters T, et al. Eur Respir J 1999;14:270.', 'Casanova C, et al. Eur Respir J 2011;37:150.', 'Tanaka H, et al. J Am Coll Cardiol 2001;37:153.'] }
] };

T.limits = { title: 'Limitations and pitfalls', kicker: 'What this can and cannot tell you', blocks: [
  { h: 'In the test', ul: [
    'Effort and technique drive most of the error. A poor effort lowers FEV1, FVC, MIP, MEP and the 6MWD, and raises FEV1/PEF.',
    'Missing tests change the reading. A low FVC with a normal ratio is only suggestive of restriction until a TLC is measured, and about half of those patients have a normal TLC.',
    'Method matters: dilution methods under-read volumes in obstruction; DLCO needs a good breath-hold.',
    'Recent bronchodilators, steroids, smoking, meals and exercise change FeNO, challenge tests and gas transfer.'] },
  { h: 'In the numbers', ul: [
    'The LLN is the 5th percentile: 1 in 20 healthy people falls below it on any one measure.',
    'z-scores depend on the equation. A different set shifts the answer.',
    'Reference sets do not exist for every population, and values at the age extremes are less reliable.',
    'A correct z-score does not equal a correct diagnosis: PFTs describe physiology.'] },
  { h: 'In this app', ul: [
    'It reasons from the z-scores and categories you enter; it does not recalculate predicted values. Check the numbers against the lab report.',
    'The wording follows ERS/ATS 2022 and Annals ATS 2025. Where those documents do not give a threshold, the source is named (Kaminsky 2018, ATS FeNO 2011, ERS/ATS 2014 for walking tests, and so on).',
    'The heads-up box looks for internal inconsistency and prompts what to look for on the tracing; it is a second reader, not an authority.',
    'The typical flow–volume loops are teaching drawings of the usual shapes, not tracings from a patient.'] }
] };

T.app = { title: 'About this app and the case bank', kicker: 'How the reading works, and what saving does', blocks: [
  { h: 'How the interpretation is built', ol: [
    'Each test section reports facts only: what was entered, its reliability, and what it is relative to the LLN, in the wording level you choose.',
    'The Interpretation synthesizes: the ventilatory pattern, lung volumes and gas transfer are read together in one statement, then the bronchodilator response, the adjunct tests, the comparison with prior studies, and what would clarify the picture. Interpretive context that needs judgement is offered as suggested additions and included only when tapped.',
    'The heads-up box compares tests with each other and with the tracing: alerts and cautions for inconsistency and data-entry problems, look-for tips with example loops, and notes for missing tests that would change the reading.',
    'Annals ATS 2025 S, V and D codes appear with the interpretation; tap one for its meaning.'] },
  { h: 'The case bank', ul: [
    'Saving a case stores its entries in this browser only. Nothing is sent anywhere. Do not type patient names, MRNs or dates of birth; the free-text fields can be left out when saving.',
    'The bank shows the most similar saved cases when you read a new one, with how you judged them.',
    'Marking an interpretation as correct or as needing changes, and which section was wrong, builds a review log. The bank summarizes agreement and which sections you correct most.',
    'Rating a heads-up item as useful or not useful tunes only the notes and look-for tips. After repeated "not useful" ratings an item is tucked into a quieter list. Alerts and cautions are never hidden.'] },
  { h: 'What the bank does not do', p: 'The bank does not rewrite the clinical rules by itself. There is no ground truth in the bank other than your own review, and a rule that silently changed from unverified cases could drift without anyone noticing. Instead the review log is an input to deliberate changes: export it, look at where the app was corrected, and change the thresholds or wording on purpose.' }
] };

T.phrases = { title: 'Phrase catalog and sources', kicker: 'The wording the report is built from', blocks: [
  { p: 'Every sentence the report can produce comes from a reviewed phrase catalog (original wording anchored to the ERS/ATS, ATS and ERS standards listed at the bottom) or from a computed statement of the entered numbers. A sentence is eligible only when the measurement states behind it are reliable and established; an unknown value never counts as normal, absent or negative.' },
  { h: 'Three kinds of wording', ul: [
    'Automatic: offered when the computed states support it (for example "FEV1/FVC is reduced" once a reliable ratio is below the LLN).',
    'Documented observation: needs the lab or the tracing to show it (quality grades, a loop shape, a method difference). It is never inferred from a number.',
    'Clinician review: interpretive context such as "compatible with emphysema in the appropriate setting" or "an extrapulmonary contribution is possible". The app offers it on the Report step when the findings make it relevant; it enters the report only when you tap it.'] },
  { h: 'Conflicts the assembly avoids', ul: [
    'A normal statement is never made for a domain that was not tested; "normal spirometry" is not "normal lung function".',
    'Mixed impairment replaces separate obstruction and restriction conclusions; nonspecific pattern requires a normal TLC; restriction unconfirmed is never said once TLC is known.',
    'A preserved KCO never cancels a low DLCO; the hemoglobin basis is stated, not assumed.',
    'A positive bronchodilator response and persistent obstruction can coexist; ratio normalisation and a qualifying volume response are independent.',
    'Early termination withholds normal, nonspecific and restriction-suggestive conclusions because an underestimated FVC inflates the ratio; a low ratio despite it still counts as obstruction.'] },
  { catalog: true }
] };

const GROUPS = [
  { title: 'Foundations', ids: ['basics', 'equations', 'limits'] },
  { title: 'Spirometry and loops', ids: ['spiro', 'loops', 'bd'] },
  { title: 'Volumes and gas transfer', ids: ['vol', 'dlco'] },
  { title: 'Resistance, muscle, posture', ids: ['raw', 'osc', 'mip', 'post'] },
  { title: 'Challenge and inflammation', ids: ['feno', 'bronch'] },
  { title: 'Exercise and gases', ids: ['sixmw', 'cpet', 'gas'] },
  { title: 'Over time', ids: ['prior'] },
  { title: 'This app', ids: ['app', 'phrases'] }
];

root.PFT_EDU = { topics: T, groups: GROUPS };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PFT_EDU;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
