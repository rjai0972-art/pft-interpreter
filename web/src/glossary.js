/* PFT Interpreter — glossary behind the (i) buttons.
   n = short name, f = full name, w = what it is, r = how to read it, l = limits / pitfalls, t = Learn topic.
   Statements follow ERS/ATS 2022 (interpretation), ATS/ERS 2019 (spirometry quality), Annals ATS 2025 (phraseology),
   Kaminsky 2018 (muscle strength, challenge, 6MWT, CPET) and ERS/ATS 2014 (field walking tests). */
(function (root) {
'use strict';
const G = {
  /* ------------------------------------------------------------- reading the numbers */
  z:        { n: 'z-score', f: 'Standard deviation score', w: 'How many standard deviations a measurement lies from the average for a healthy person of the same age, sex and height (and ancestry, if the equation set uses it).',
              r: 'A z-score of 0 is average. The lower limit of normal (LLN) is −1.645 (5th percentile); the upper limit (ULN) is +1.645. Severity of an impairment is graded by how far below the LLN the value lies.',
              l: 'A z-score is only as valid as the reference equation behind it. It does not tell you the cause, and values just beyond the LLN are common in healthy people (5% by definition).', t: 'basics' },
  lln:      { n: 'LLN / ULN', f: 'Lower / upper limit of normal', w: 'The 5th and 95th percentiles of the reference population: z = −1.645 and +1.645.',
              r: 'Below the LLN is “reduced”; above the ULN is “elevated”. ERS/ATS 2022 uses the LLN, not a fixed 80% predicted or a fixed FEV1/FVC of 0.70.',
              l: 'About 1 in 20 healthy people fall outside either limit. Near the limit, interpret with the clinical context (this app calls values just above the LLN “borderline”).', t: 'basics' },
  severity: { n: 'Severity bands', f: 'ERS/ATS 2022 z-score bands', w: 'Mild: z −1.65 to −2.5. Moderate: −2.51 to −4.0. Severe: below −4.0.',
              r: 'Severity is graded from the FEV1 z-score when the ratio is low (obstruction) and from the TLC z-score for restriction. FVC, DLCO and other indices are graded by the same bands.',
              l: 'Severity from lung function is not the same as functional or symptomatic severity.', t: 'basics' },
  pctpred:  { n: '% predicted', f: 'Percent of the predicted mean', w: 'The measured value divided by the predicted mean for a person of the same size, age and sex.',
              r: 'Familiar, but a fixed cut-off (such as 80%) misclassifies tall, short, young and old people because the spread around the mean changes with age and height.',
              l: 'Prefer the z-score. Compare % predicted over time only when the same reference equations were used for both studies.', t: 'basics' },
  quality:  { n: 'Quality grade', f: 'ATS/ERS 2019 spirometry grade (A–F, U), separately for FEV1 and FVC', w: 'A grade for each of FEV1 and FVC based on how many acceptable maneuvers there were and how closely the two best repeat (within 150 mL). The two can differ: a cough in the first second spoils FEV1 but not FVC; early termination spoils FVC but not FEV1.',
              r: 'A and B: good, interpret with confidence. C to E: usable, but technical factors reduce confidence. U: usable only. F: not usable; that component is reported as not interpretable and drives no pattern or severity statement.',
              l: 'Quality grades describe the maneuvers, not the patient. A poor grade can hide or mimic disease. Documented limitations (early termination, cough, leak, variable effort) are entered as what the lab or tracing shows, never inferred from the numbers.', t: 'spiro' },

  /* ---------------------------------------------------------------------- spirometry */
  fev1:     { n: 'FEV1', f: 'Forced expiratory volume in 1 second', w: 'The volume blown out in the first second of a maximal forced exhalation.',
              r: 'With a low FEV1/FVC, the FEV1 z-score sets the severity of the obstruction. A low FEV1 with a normal ratio goes with a low FVC (restriction or a technical cause).',
              l: 'Depends on effort and technique. A hesitant start, cough or early termination lowers it. Falls in FEV1 over time are the standard way to follow obstructive disease.', t: 'spiro' },
  fvc:      { n: 'FVC', f: 'Forced vital capacity', w: 'The total volume blown out in a maximal, complete forced exhalation.',
              r: 'Low FVC with a normal or high ratio suggests restriction (TLC confirms it). Low FVC with a low ratio means air trapping, coexisting restriction, or a short exhalation; TLC and RV separate them.',
              l: 'A low FVC alone is not proof of restriction: about half of such patients have a normal TLC. Submaximal effort and early termination lower it too.', t: 'spiro' },
  ratio:    { n: 'FEV1/FVC', f: 'Ratio of FEV1 to FVC', w: 'The fraction of the vital capacity blown out in the first second. It is the first number to check.',
              r: 'Below the LLN (z < −1.645) defines airflow obstruction. A ratio above the ULN can accompany restriction (stiff lungs empty quickly).',
              l: 'ERS/ATS 2022 uses the LLN rather than a fixed 0.70, which over-calls obstruction in older adults and under-calls it in the young. The ratio can look normal early in disease if the FVC falls with the FEV1.', t: 'spiro' },
  fef:      { n: 'FEF25–75%', f: 'Forced expiratory flow, middle half of the FVC', w: 'The average flow between 25% and 75% of the exhaled volume.',
              r: 'Informational only. ERS/ATS 2022 does not use it to define obstruction or to grade severity; it is highly variable and depends on the FVC.',
              l: 'An isolated low FEF25–75% with a normal ratio and FEV1 is not an abnormal result on its own.', t: 'spiro' },
  effort:   { n: 'Effort / cooperation', f: 'Effort and muscle strength during the maneuver', w: 'Whether the testing team judged the maneuvers to be maximal.',
              r: 'Submaximal effort or weakness lowers FEV1 and FVC and blunts the PEF, mimicking a restrictive or mixed pattern (Annals ATS 2025 S33).',
              l: 'Poor effort can be hard to tell from true disease on one test; repeat testing and MIP/MEP help.', t: 'spiro' },
  pef:      { n: 'PEF', f: 'Peak expiratory flow', w: 'The highest flow reached at the start of a forced exhalation; it is the peak of the expiratory loop.',
              r: 'Low in central or upper-airway obstruction (it can fall before FEV1 and FVC do), in weakness and with poor initial effort. Normal in mild peripheral obstruction.',
              l: 'Very effort-dependent. Compare with the shape of the loop and with FEV1/PEF.', t: 'loops' },
  fevpef:   { n: 'FEV1/PEF', f: 'FEV1 (mL) divided by PEF (L/min)', w: 'A ratio that rises when the early peak flow is disproportionately low.',
              r: 'Above 8 suggests central or upper-airway obstruction (ERS/ATS 2022).', l: 'Poor initial effort also raises it, so confirm with reproducible flattening on the loop.', t: 'loops' },
  fif50:    { n: 'FIF50% / FEF50%', f: 'Inspiratory and expiratory flow at 50% of the FVC', w: 'Mid-volume flows on the inspiratory and expiratory limbs.',
              r: 'With reduced flows, FIF50/FEF50 below 1 fits a variable extrathoracic obstruction, about 1 a fixed obstruction, and above 1 a variable intrathoracic one (ERS/ATS 2022 Table 6).',
              l: 'Needs a full inspiratory maneuver; unreliable if the inspiratory limb was not maximal.', t: 'loops' },
  bd:       { n: 'Bronchodilator response', f: 'Change after an inhaled bronchodilator', w: 'Repeat spirometry after a short-acting bronchodilator.',
              r: 'A significant response is an increase of more than 10% of the predicted value in FEV1 and/or FVC (ERS/ATS 2022). A low ratio that returns to normal after the drug is reversible obstruction.',
              l: 'A response does not diagnose asthma and its absence does not exclude it. Bronchodilators should be withheld before testing; the change is smaller if they were not.', t: 'bd' },
  loop:     { n: 'Flow–volume loop', f: 'Plot of flow against volume', w: 'Expiration plots above the line and inspiration below. The shape shows effort, technique and the site and type of airway narrowing.',
              r: 'Scooped (concave) = obstruction; small, steep, narrow = restriction; plateaus = upper-airway obstruction; saw-tooth = unstable airway or tremor.',
              l: 'The shape supports, but does not replace, the numbers. Many shapes are not specific, and poor effort can imitate several of them.', t: 'loops' },

  /* ------------------------------------------------------------------- lung volumes */
  tlc:      { n: 'TLC', f: 'Total lung capacity', w: 'The volume of air in the lungs after a maximal inhalation.',
              r: 'Below the LLN defines restriction. Above the ULN suggests hyperinflation (or large lungs). With a low FEV1/FVC, a low TLC means a mixed pattern.',
              l: 'Gas dilution methods under-estimate TLC when airways are obstructed (poorly ventilated areas); plethysmography does not. Needs a patient who can cooperate.', t: 'vol' },
  rv:       { n: 'RV', f: 'Residual volume', w: 'The air left in the lungs after a maximal exhalation.',
              r: 'High RV = air trapping. An isolated low RV with otherwise normal tests was clinically significant in the Owens 1987 series (92% had an associated condition).',
              l: 'Often reported with RV/TLC, which is the better index of air trapping because RV rises with TLC.', t: 'vol' },
  rvtlc:    { n: 'RV/TLC', f: 'Residual volume as a fraction of TLC', w: 'How much of the total capacity cannot be emptied.',
              r: 'Above the ULN = air trapping. Raised with a normal or low TLC also occurs with weakness or chest-wall restriction (complex restriction).',
              l: 'A high RV/TLC is not specific for obstruction.', t: 'vol' },
  frc:      { n: 'FRC', f: 'Functional residual capacity', w: 'The volume in the lungs at the end of a normal quiet breath: where lung recoil and chest-wall recoil balance.',
              r: 'High with emphysema or hyperinflation; low with restriction, obesity or a stiff lung.', l: 'Reflects posture and the breathing pattern at the moment of measurement.', t: 'vol' },
  frctlc:   { n: 'FRC/TLC', f: 'FRC as a fraction of TLC', w: 'The resting position of the lung within its capacity.', r: 'Raised in hyperinflation.', l: 'Rarely used alone.', t: 'vol' },
  svc:      { n: 'SVC', f: 'Slow vital capacity', w: 'The volume from full inhalation to full exhalation without forcing.',
              r: 'Lung volumes are referenced to the SVC. An SVC larger than the FVC by more than 100 mL suggests airway collapse or air trapping during the forced maneuver.', l: 'The easier maneuver to perform for people with weakness or airway collapse.', t: 'vol' },
  erv:      { n: 'ERV', f: 'Expiratory reserve volume', w: 'The volume that can still be exhaled after a normal quiet breath out.', r: 'Low in obesity (with a preserved RV/TLC), abdominal distension and some chest-wall disease.', l: 'Highly dependent on body habitus and posture.', t: 'vol' },
  ic:       { n: 'IC', f: 'Inspiratory capacity', w: 'The volume that can be inhaled from the resting end-expiratory level (TLC minus FRC).', r: 'Low with hyperinflation (the lung sits close to TLC at rest), which limits exercise.', l: 'Changes with the breathing pattern.', t: 'vol' },
  voltech:  { n: 'Volume technique', f: 'Plethysmography, gas dilution or single-breath', w: 'How the lung volumes were measured.',
              r: 'Plethysmography measures all gas in the chest, including trapped gas. Nitrogen washout and helium dilution measure only gas that mixes; single-breath dilution (VA) is the least accurate.',
              l: 'In obstruction, dilution methods read lower TLC and RV than plethysmography; a restriction diagnosed this way needs caution.', t: 'vol' },

  /* ---------------------------------------------------------------------------- DLCO */
  dlco:     { n: 'DLCO', f: 'Diffusing capacity of the lung for carbon monoxide (TLCO)', w: 'How well carbon monoxide crosses from the alveoli into the blood in a single breath.',
              r: 'Graded by z-score. Reduced with loss of alveolar–capillary surface (emphysema, interstitial disease), pulmonary vascular disease, anemia and low lung volumes. Elevated with polycythemia, pulmonary hemorrhage, left-to-right shunt and obesity.',
              l: 'Always read with hemoglobin, VA and KCO. Smokers have a falsely low value if COHb is raised. Needs a full inspiration and a 10-second breath hold.', t: 'dlco' },
  dlcoadj:  { n: 'Hemoglobin adjustment', f: 'Whether the reported DLCO is compared on a hemoglobin-adjusted basis', w: 'Labs adjust the predicted DLCO (or the measured value) for the hemoglobin (ERS/ATS 2017). A low unadjusted value in anemia may partly reflect the hemoglobin; a low adjusted value is a gas-transfer deficit on that comparison.',
              r: 'Say which basis the report uses. If the lab prints both values, enter the reported one as "not adjusted" and the adjusted one beside it. If the report does not say, the interpretation states that the basis is not established rather than assuming either.',
              l: 'Never apply a second correction to a value that is already adjusted. The in-app estimate from the 2017 equation is labelled as an estimate; the laboratory adjustment is preferred.', t: 'dlco' },
  va:       { n: 'VA', f: 'Alveolar volume', w: 'The lung volume that took part in gas exchange, estimated from the tracer gas dilution in the DLCO breath.',
              r: 'Low VA means incomplete lung expansion or loss of lung units. VA is usually lower than the TLC, and a VA/TLC below about 0.85 points to uneven ventilation.',
              l: 'In obstruction VA underestimates TLC because gas does not mix into poorly ventilated areas.', t: 'dlco' },
  kco:      { n: 'KCO', f: 'DLCO per unit alveolar volume (DLCO/VA, Krogh factor)', w: 'The gas transfer corrected for the lung volume that was sampled.',
              r: 'Low VA with a high KCO suggests incomplete expansion (weakness, effort, chest wall, resection). Low VA with a low or normal KCO suggests loss of gas-transfer surface. Low DLCO with preserved VA and low KCO points to alveolar–capillary or vascular disease.',
              l: 'A normal KCO does not mean normal gas transfer when VA is low; KCO does not scale linearly with volume.', t: 'dlco' },
  vatlc:    { n: 'VA/TLC', f: 'Alveolar volume as a fraction of TLC', w: 'How much of the lung took part in the single breath.', r: 'Below about 0.85 reflects uneven ventilation, which lowers the measured DLCO.', l: 'Needs a reliable TLC.', t: 'dlco' },
  hb:       { n: 'Hemoglobin', f: 'Hemoglobin concentration', w: 'Oxygen-carrying protein in the blood; carbon monoxide binds to it.', r: 'Low Hb lowers DLCO; high Hb raises it. Use the Hb-adjusted DLCO to see how much of a change is explained.', l: 'Should be measured on the day of the test.', t: 'dlco' },
  cohb:     { n: 'COHb', f: 'Carboxyhemoglobin', w: 'Hemoglobin already bound to carbon monoxide, mainly from smoking.', r: 'Lowers the measured DLCO by about 1% per 1% COHb; also makes pulse-oximeter SpO2 over-read.', l: 'A recent smoker may need a correction or a delayed test.', t: 'dlco' },

  /* --------------------------------------------------------------- resistance, oscillometry */
  raw:      { n: 'Raw', f: 'Airway resistance (plethysmography)', w: 'The pressure needed to drive flow through the airways.', r: 'High Raw means narrowed airways (a high sRaw or a low sGaw says the same). It can add information when spirometry is normal or non-specific.', l: 'Panting technique matters; normal in emphysema or peripheral obstruction is possible.', t: 'raw' },
  sraw:     { n: 'sRaw', f: 'Specific airway resistance', w: 'Raw multiplied by the lung volume at which it was measured.', r: 'Raised with airway narrowing; accounts for the lung volume.', l: 'Less affected by volume than Raw, but still technique-dependent.', t: 'raw' },
  sgaw:     { n: 'sGaw', f: 'Specific airway conductance', w: 'The reciprocal of sRaw.', r: 'Lowered with airway narrowing.', l: 'See sRaw.', t: 'raw' },
  r5:       { n: 'R5', f: 'Resistance at 5 Hz (oscillometry)', w: 'Total respiratory-system resistance, including the small airways.', r: 'Raised with airway narrowing. Oscillometry needs only quiet breathing, so it works in young children and people who cannot do spirometry.', l: 'Reference values vary between devices. Interpret with laboratory criteria.', t: 'osc' },
  r520:     { n: 'R5–R20', f: 'Frequency dependence of resistance', w: 'The difference between resistance at 5 Hz (whole system) and 20 Hz (large airways).', r: 'A rise points to peripheral (small-airway) involvement.', l: 'Also rises with upper-airway shunt artifact; keep the cheeks supported.', t: 'osc' },
  x5:       { n: 'X5', f: 'Reactance at 5 Hz', w: 'The elastic and inertial properties of the respiratory system.', r: 'More negative X5 = stiffer lungs or peripheral airway closure.', l: 'Affected by lung volume and device.', t: 'osc' },
  ax:       { n: 'AX', f: 'Reactance area', w: 'The area under the reactance curve between X5 and the resonant frequency.', r: 'Raised in peripheral airway disease and in stiff lungs.', l: 'Device-dependent.', t: 'osc' },
  fres:     { n: 'Fres', f: 'Resonant frequency', w: 'The frequency at which reactance crosses zero.', r: 'Rises with peripheral airway or parenchymal abnormality.', l: 'Device-dependent.', t: 'osc' },

  /* --------------------------------------------------------------- muscle and posture */
  mip:      { n: 'MIP (PImax)', f: 'Maximal inspiratory pressure', w: 'The most negative mouth pressure the patient can generate against a closed airway after exhaling to RV.',
              r: 'Low in inspiratory-muscle weakness (diaphragm, neuromuscular disease). A normal MIP largely excludes clinically important inspiratory weakness.', l: 'Effort- and learning-dependent; hyperinflation lowers it. Report as a magnitude in cmH2O.', t: 'mip' },
  mep:      { n: 'MEP (PEmax)', f: 'Maximal expiratory pressure', w: 'The highest mouth pressure generated against a closed airway after inhaling to TLC.', r: 'Low in expiratory-muscle weakness, which impairs cough.', l: 'Cheek compliance and effort affect it.', t: 'mip' },
  snip:     { n: 'SNIP', f: 'Sniff nasal inspiratory pressure', w: 'The pressure generated in one nostril during a sniff.', r: 'A natural, easier maneuver than MIP; helpful when MIP is hard to perform. A low SNIP supports inspiratory weakness.', l: 'Blocked nostrils lower it.', t: 'mip' },
  p01:      { n: 'P0.1', f: 'Airway occlusion pressure at 100 ms', w: 'The pressure fall in the first 0.1 s of an inspiration against an occluded airway; it reflects central respiratory drive.', r: 'High drive with a low or normal pressure suggests load or weakness; low drive suggests blunted central output.', l: 'Specialized test.', t: 'mip' },
  cpf:      { n: 'Cough peak flow', f: 'Peak flow of a maximal cough', w: 'How effective the cough is at clearing secretions.', r: 'Below about 270 L/min suggests reduced effectiveness in neuromuscular disease; 160 L/min or less is ineffective.', l: 'Depends on bulbar function and the interface.', t: 'mip' },
  mvv:      { n: 'MVV', f: 'Maximal voluntary ventilation', w: 'The largest ventilation sustained for about 12 seconds.', r: 'Estimated from FEV1 × 35–40. Used as the denominator of CPET ventilatory reserve.', l: 'Highly effort-dependent.', t: 'mip' },
  supine:   { n: 'Supine fall in VC', f: 'Postural change in vital capacity', w: 'Vital capacity measured upright and supine.', r: 'A fall of 10% is the usual upper limit of normal; 20% or more suggests diaphragm weakness and 30% or more bilateral diaphragm weakness.', l: 'Obesity and ascites lower the supine value too.', t: 'post' },
  orthodeox:{ n: 'Orthodeoxia', f: 'Fall in oxygenation on standing', w: 'A fall in SpO2 of at least 5 points (or in PaO2 of more than 4 mmHg) from supine to upright.', r: 'Seen with intracardiac or intrapulmonary shunts (PFO, hepatopulmonary syndrome) and basal lung disease.', l: 'Needs a good oximetry signal in both positions.', t: 'post' },

  /* -------------------------------------------------------------------- airway biomarkers */
  feno:     { n: 'FeNO', f: 'Fractional exhaled nitric oxide', w: 'A breath marker of type-2 (eosinophilic) airway inflammation.',
              r: 'ATS 2011 cut-points, adults: below 25 ppb low, above 50 ppb high (children: below 20 and above 35). High means eosinophilic inflammation and a likely steroid response; low makes both less likely in a symptomatic patient.',
              l: 'Lowered by smoking and by corticosteroids; raised by recent nitrate-rich food and some infections.', t: 'feno' },
  pc20:     { n: 'PC20 / PD20', f: 'Provocative concentration or dose causing a 20% fall in FEV1', w: 'The methacholine dose that lowers FEV1 by 20%. A lower value means more reactive airways.',
              r: 'Above 16 mg/mL is negative; 4–16 borderline; below 4 positive. A negative test in a patient with current symptoms makes asthma unlikely; a positive one is sensitive but not specific.',
              l: 'Inhaled corticosteroids can lower sensitivity. Do not test with a low baseline FEV1.', t: 'bronch' },
  mannitol: { n: 'Mannitol challenge', f: 'Indirect bronchoprovocation', w: 'Inhaled dry powder that causes airway-smooth-muscle contraction through mast-cell mediators.', r: 'Positive: a 15% fall in FEV1 at a cumulative dose of 635 mg or less, or a 10% incremental fall between consecutive doses. Specific for asthma.', l: 'Less sensitive than methacholine; a negative test does not exclude asthma.', t: 'bronch' },
  exch:     { n: 'Exercise challenge / EVH', f: 'Exercise or eucapnic voluntary hyperpnea', w: 'A physical challenge used for exercise-induced bronchoconstriction.', r: 'Positive when FEV1 falls by 10% or more at two consecutive time points; mild 10–24%, moderate 25–49%, severe 50% or more.', l: 'Needs sufficient ventilation or dry air.', t: 'bronch' },

  /* ---------------------------------------------------------------------------- 6MWT */
  six:      { n: '6MWD', f: 'Six-minute walk distance', w: 'The distance walked in 6 minutes along a flat corridor.',
              r: 'Compared with a reference equation (LLN) and followed over time. The minimal important difference is about 30 m (25–33 m, ERS/ATS 2014); in IPF, 24–45 m.',
              l: 'Sensitive to technique: track length, encouragement, walking aids, oxygen and a learning effect (the second of two walks averages about 26 m longer). Reference equations disagree widely.', t: 'sixmw' },
  dsp:      { n: 'Distance–saturation product', f: 'Distance × nadir SpO2', w: 'A combined index of walk distance and desaturation.', r: 'Distance in meters multiplied by the lowest SpO2 as a fraction. Below 200 m% predicted 12-month mortality in IPF (Lettieri 2006).', l: 'Validated in IPF only; the nadir depends on the oximeter signal.', t: 'sixmw' },
  hrr:      { n: 'Heart-rate recovery', f: 'Fall in heart rate one minute after stopping', w: 'How quickly the heart rate falls after exercise.', r: 'A fall of 12–18 bpm or less (the exact limit varies by test) is abnormal and reflects reduced parasympathetic reactivation.', l: 'Depends on how the exercise was stopped.', t: 'sixmw' },
  borg:     { n: 'Borg scale', f: 'Borg dyspnea / leg-effort rating (0–10)', w: 'A patient-reported rating of breathlessness or leg effort.', r: 'Rising ratings at the same work rate suggest greater impairment; ratings at peak help judge effort.', l: 'Subjective; needs the same wording each time.', t: 'sixmw' },
  mid:      { n: 'MID', f: 'Minimal important difference', w: 'The smallest change that matters to patients or outcomes.', r: 'For the 6MWD, about 30 m.', l: 'Group estimate; applied to one person it is only a guide.', t: 'sixmw' },
  hrmax:    { n: 'Predicted maximal heart rate', f: 'Age-predicted peak HR', w: 'Used to judge whether a 6MWT or CPET reached a near-maximal heart rate.', r: 'Tanaka 208 − 0.7 × age is recommended; 220 − age overestimates in older adults.', l: 'Individual scatter is about ±10 bpm.', t: 'equations' },

  /* --------------------------------------------------------------------------- CPET */
  vo2:      { n: 'Peak VO2', f: 'Peak oxygen uptake', w: 'The highest rate of oxygen consumption reached; the best single index of exercise capacity.', r: 'Below about 83% predicted is reduced (Kaminsky 2018). The pattern of the other variables then points to the limiting system.', l: 'Depends on effort: check the RER and the peak heart rate.', t: 'cpet' },
  lt:       { n: 'Lactate threshold', f: 'Anaerobic / ventilatory threshold', w: 'The work rate at which lactate begins to accumulate.', r: 'Early threshold suggests deconditioning or impaired O2 delivery.', l: 'Estimated, not measured, in most labs.', t: 'cpet' },
  o2p:      { n: 'O2 pulse', f: 'VO2 per heartbeat', w: 'Oxygen uptake divided by heart rate: a surrogate for stroke volume.', r: 'A low or plateauing O2 pulse suggests reduced stroke volume or peripheral O2 extraction.', l: 'Anemia and beta-blockers change it.', t: 'cpet' },
  vevco2:   { n: 'VE/VCO2', f: 'Ventilatory equivalent for carbon dioxide', w: 'The breaths needed to clear a given amount of CO2.', r: 'A high slope or nadir signals ventilation–perfusion mismatch or hyperventilation (heart failure, pulmonary vascular disease, ILD, dysfunctional breathing).', l: 'Higher in older adults and women.', t: 'cpet' },
  petco2:   { n: 'PETCO2', f: 'End-tidal CO2', w: 'The CO2 at the end of exhalation; a surrogate for arterial CO2 and dead space.', r: 'Low at threshold with a high VE/VCO2 suggests hyperventilation or high dead space.', l: 'Needs a good breathing circuit.', t: 'cpet' },
  rer:      { n: 'RER', f: 'Respiratory exchange ratio (VCO2/VO2)', w: 'A marker of effort and substrate use.', r: 'A peak RER of 1.10 or more suggests a maximal effort; below 1.00 suggests a submaximal test.', l: 'Hyperventilation raises it independent of effort.', t: 'cpet' },
  vemvv:    { n: 'VE/MVV', f: 'Ventilatory reserve', w: 'Peak ventilation as a fraction of the maximal voluntary ventilation.', r: 'Above about 0.8 (men) or 0.75 (women) suggests mechanical-ventilatory limitation.', l: 'MVV is itself effort-dependent.', t: 'cpet' },
  vtic:     { n: 'VT/IC', f: 'Tidal volume to inspiratory capacity', w: 'How much of the inspiratory capacity is used at peak exercise.', r: 'A high ratio signals ventilatory constraint.', l: 'Needs a valid inspiratory capacity at rest.', t: 'cpet' },

  /* -------------------------------------------------------------------- blood gas */
  ph:       { n: 'pH', f: 'Arterial pH', w: 'Hydrogen-ion balance. 7.35–7.45 is normal.', r: 'Below 7.35 is acidemia; above 7.45 alkalemia. Read with PaCO2 and HCO3 to find the primary disorder.', l: 'Normal pH can hide a mixed disorder.', t: 'gas' },
  paco2:    { n: 'PaCO2', f: 'Arterial carbon dioxide tension', w: 'The balance between CO2 production and ventilation. 35–45 mmHg is normal.', r: 'High = hypoventilation (respiratory acidosis); low = hyperventilation.', l: 'An acute rise is not compensated; HCO3 shows how chronic it is.', t: 'gas' },
  pao2:     { n: 'PaO2', f: 'Arterial oxygen tension', w: 'The oxygen dissolved in arterial blood.', r: 'Below 60 mmHg on room air is hypoxemia. A normal A–a gradient with hypoxemia points to hypoventilation or low inspired oxygen.', l: 'Falls with age; interpret on room air.', t: 'gas' },
  hco3:     { n: 'HCO3', f: 'Bicarbonate', w: 'The metabolic part of acid–base balance. 22–26 mEq/L is normal.', r: 'Raised in chronic respiratory acidosis (renal compensation) and metabolic alkalosis.', l: 'Calculated from pH and PaCO2 on most analyzers.', t: 'gas' },
  aa:       { n: 'A–a gradient', f: 'Alveolar–arterial oxygen difference', w: 'The alveolar PO2 (from the alveolar gas equation) minus the arterial PO2.', r: 'A widened gradient means V/Q mismatch, shunt or diffusion limitation. A normal gradient with hypoxemia means hypoventilation.', l: 'The upper limit rises with age (age/4 + 4 or (age + 10)/4) and with supplemental oxygen.', t: 'gas' },
  pf:       { n: 'PaO2/FiO2', f: 'P/F ratio', w: 'Oxygenation relative to the inspired oxygen fraction.', r: 'Below 300 indicates impaired oxygenation.', l: 'Not linear at high FiO2.', t: 'gas' },
  sao2:     { n: 'SaO2', f: 'Arterial oxygen saturation', w: 'The fraction of hemoglobin carrying oxygen.', r: 'Compare with pulse-oximeter SpO2.', l: 'Pulse oximeters over-read with carbon monoxide and in darker skin pigmentation.', t: 'gas' },

  /* ----------------------------------------------------------------------- comparison */
  change:   { n: 'Change over time', f: 'Absolute, percent and annualised change', w: 'The difference between two studies, with the per-year rate.', r: 'ERS/ATS 2022: a change of 15% or more in FEV1 or FVC lies outside typical biological variability; a decline of 8%/yr is rapid. In CF, a 10% fall from the previous value flags an exacerbation.', l: 'Short intervals exaggerate rates, so annualised rates are not calculated under 3 months. Use the same reference equations.', t: 'prior' },
  fev1q:    { n: 'FEV1Q', f: 'FEV1 divided by a sex-specific constant', w: 'FEV1 expressed in units of 0.5 L (men) or 0.4 L (women) to compare decline across people.', r: 'Healthy adults lose about 1 unit every 18 years; smokers and the elderly about 1 per 10 years.', l: 'Adults only.', t: 'prior' },
  ccs:      { n: 'Conditional change score', f: 'z-score of the change in FEV1 in children', w: 'Compares an FEV1 z-score change with the change expected over the interval.', r: 'Outside ±1.96 is more change than expected in healthy children and young people.', l: 'Children and young adults only.', t: 'prior' },

  /* ------------------------------------------------------------------ reference equations */
  gli:      { n: 'GLI equations', f: 'Global Lung Function Initiative reference equations', w: 'Multi-ethnic reference sets for spirometry (2012), race-neutral spirometry (Global, 2022), static lung volumes (2021) and DLCO (2017).', r: 'The z-score is read directly against them. ERS/ATS 2022 recommends GLI; ATS 2023 recommends GLI Global instead of race-specific sets.', l: 'GLI-2021 volumes cover ages 5–80 and are European-ancestry only. GLI spirometry covers 3–95 years. Race-neutral equations are still under study.', t: 'equations' },

  /* ----------------------------------------------------------------------- tests */
  'test.spiro': { n: 'Spirometry', f: 'Forced spirometry', w: 'The core test: FEV1, FVC and FEV1/FVC. The loop has its own step.', r: 'Start with the ratio against the LLN, then FEV1 for severity, then FVC.', l: 'Effort-dependent; quality grade first.', t: 'spiro' },
  'test.bd': { n: 'Bronchodilator response', f: 'Post-bronchodilator spirometry', w: 'Tests reversibility.', r: 'Significant if FEV1 or FVC rises by more than 10% of predicted.', l: 'See Learn.', t: 'bd' },
  'test.fvl': { n: 'Flow–volume loop', f: 'Flow–volume loop and flow indices', w: 'Shape of the loop plus PEF, FEV1/PEF and FIF50/FEF50.', r: 'Look at both limbs and ask whether the shape fits the numbers.', l: 'Shape alone is not diagnostic.', t: 'loops' },
  'test.vol': { n: 'Lung volumes', f: 'Static lung volumes', w: 'TLC, RV, FRC and their ratios.', r: 'TLC defines restriction; RV/TLC defines air trapping.', l: 'Method matters.', t: 'vol' },
  'test.dlco': { n: 'DLCO / KCO / VA', f: 'Single-breath diffusing capacity', w: 'Gas transfer across the alveolar–capillary membrane.', r: 'Stratify by z-score; read with VA, KCO and hemoglobin.', l: 'Hb and COHb change it.', t: 'dlco' },
  'test.raw': { n: 'Airway resistance', f: 'Plethysmographic resistance', w: 'Raw and sRaw/sGaw.', r: 'Raised with airway narrowing.', l: 'Panting technique.', t: 'raw' },
  'test.osc': { n: 'Oscillometry', f: 'Forced oscillation technique', w: 'Resistance and reactance during quiet breathing.', r: 'Detects peripheral airway involvement.', l: 'Device-specific references.', t: 'osc' },
  'test.mip': { n: 'MIP / MEP / SNIP', f: 'Respiratory muscle strength', w: 'Maximal mouth and nasal pressures, with cough peak flow and MVV.', r: 'Low values support weakness when effort is good.', l: 'Effort-dependent.', t: 'mip' },
  'test.post': { n: 'Upright vs. supine', f: 'Postural vital capacity', w: 'Vital capacity upright and supine.', r: 'A fall of 20% or more suggests diaphragm weakness.', l: 'Obesity also lowers it.', t: 'post' },
  'test.feno': { n: 'FeNO', f: 'Exhaled nitric oxide', w: 'Marker of eosinophilic airway inflammation.', r: 'Above 50 ppb high; below 25 ppb low (adults).', l: 'Steroids and smoking lower it.', t: 'feno' },
  'test.bronch': { n: 'Bronchoprovocation', f: 'Methacholine, mannitol, exercise, EVH', w: 'Measures airway hyperresponsiveness.', r: 'Negative methacholine makes asthma unlikely.', l: 'Not for a low baseline FEV1.', t: 'bronch' },
  'test.sixmw': { n: '6-minute walk test', f: 'Field walk test', w: 'Distance, desaturation and recovery.', r: 'Follow the 6MWD over time; 30 m is the minimal important difference.', l: 'Protocol-sensitive.', t: 'sixmw' },
  'test.cpet': { n: 'Cardiopulmonary exercise test', f: 'Cardiopulmonary exercise test', w: 'Peak VO2 and the physiologic limit to exercise.', r: 'Use the pattern of reserves to find the limiting system.', l: 'Effort-dependent.', t: 'cpet' },
  'test.gas': { n: 'Arterial blood gas', f: 'Arterial blood gas', w: 'pH, PaCO2, PaO2, HCO3 and the A–a gradient.', r: 'Find the primary acid–base disorder, then the A–a gradient.', l: 'Interpret on room air.', t: 'gas' },
  'test.prior': { n: 'Comparison with prior', f: 'Serial comparison', w: 'Absolute, % and annualised change.', r: 'See Change over time.', l: 'Same equations.', t: 'prior' },

  /* ------------------------------------------------------------------ Annals ATS codes */
  'code.S1':  { n: 'S1', f: 'Normal spirometry', w: 'No obstructive impairment demonstrated.', r: '', l: '', t: 'spiro' },
  'code.S10': { n: 'S10', f: 'Normal indices with a concave loop', w: 'Indices are within normal limits but the loop is concave: possible mild obstruction at low lung volumes or loss of elastic recoil.', r: '', l: '', t: 'loops' },
  'code.S11': { n: 'S11', f: 'Borderline spirometry', w: 'Values are borderline low; may be a very mild impairment or a normal variant.', r: '', l: '', t: 'spiro' },
  'code.S21': { n: 'S21', f: 'Mild obstruction', w: 'Low FEV1/FVC with a mildly reduced (or normal) FEV1.', r: '', l: '', t: 'spiro' },
  'code.S22': { n: 'S22', f: 'Moderate obstruction', w: 'Low FEV1/FVC with a moderately reduced FEV1.', r: '', l: '', t: 'spiro' },
  'code.S23': { n: 'S23', f: 'Severe obstruction', w: 'Low FEV1/FVC with a severely reduced FEV1.', r: '', l: '', t: 'spiro' },
  'code.S2':  { n: 'S2', f: 'Obstruction, severity not graded', w: 'Low FEV1/FVC; FEV1 was not entered.', r: '', l: '', t: 'spiro' },
  'code.S31': { n: 'S31', f: 'Nonspecific pattern', w: 'Low FEV1 and FVC with a preserved ratio.', r: 'Restriction is not demonstrated without TLC.', l: '', t: 'spiro' },
  'code.S32': { n: 'S32', f: 'Obstruction with a low FVC', w: 'Air trapping or coexisting restriction; lung volumes needed.', r: '', l: '', t: 'spiro' },
  'code.S33': { n: 'S33', f: 'Effort or weakness', w: 'Submaximal effort or muscle weakness is a likely explanation for the reduced values.', r: '', l: '', t: 'spiro' },
  'code.S34': { n: 'S34', f: 'Possible dysanapsis', w: 'Low ratio with a preserved FEV1 and a high FVC: a normal variant or dysanaptic growth.', r: '', l: '', t: 'spiro' },
  'code.S41': { n: 'S41', f: 'Isolated low FEV1', w: 'Reduced FEV1 with a preserved ratio and FVC.', r: '', l: '', t: 'spiro' },
  'code.S42': { n: 'S42', f: 'Isolated low FVC', w: 'Reduced FVC with a preserved ratio and FEV1.', r: '', l: '', t: 'spiro' },
  'code.S51': { n: 'S51', f: 'Intrathoracic upper/central airway pattern', w: 'Reproducible flattening of the expiratory limb.', r: '', l: '', t: 'loops' },
  'code.S52': { n: 'S52', f: 'Extrathoracic upper airway pattern', w: 'Reproducible flattening of the inspiratory limb.', r: '', l: '', t: 'loops' },
  'code.S53': { n: 'S53', f: 'Fixed upper/central airway pattern', w: 'Reproducible flattening of both limbs.', r: '', l: '', t: 'loops' },
  'code.S61': { n: 'S61', f: 'No bronchodilator response', w: 'The change does not exceed 10% of the predicted value.', r: '', l: '', t: 'bd' },
  'code.S62': { n: 'S62', f: 'Bronchodilator response', w: 'Increase of more than 10% of the predicted value in FEV1 and/or FVC.', r: '', l: '', t: 'bd' },
  'code.V1':  { n: 'V1', f: 'Normal lung volumes', w: 'No restrictive impairment demonstrated.', r: '', l: '', t: 'vol' },
  'code.V10': { n: 'V10', f: 'Borderline low TLC', w: 'Significance uncertain.', r: '', l: '', t: 'vol' },
  'code.V11': { n: 'V11', f: 'Mild restriction', w: 'Mildly low TLC.', r: '', l: '', t: 'vol' },
  'code.V14': { n: 'V14', f: 'Moderate restriction', w: 'Moderately low TLC.', r: '', l: '', t: 'vol' },
  'code.V17': { n: 'V17', f: 'Severe restriction', w: 'Severely low TLC.', r: '', l: '', t: 'vol' },
  'code.V12': { n: 'V12', f: 'Mild complex restriction', w: 'Low TLC with a raised RV/TLC.', r: '', l: '', t: 'vol' },
  'code.V15': { n: 'V15', f: 'Moderate complex restriction', w: 'Low TLC with a raised RV/TLC.', r: '', l: '', t: 'vol' },
  'code.V18': { n: 'V18', f: 'Severe complex restriction', w: 'Low TLC with a raised RV/TLC.', r: '', l: '', t: 'vol' },
  'code.V13': { n: 'V13', f: 'Mild mixed disorder', w: 'Obstruction with a mildly low TLC.', r: '', l: '', t: 'vol' },
  'code.V16': { n: 'V16', f: 'Moderate mixed disorder', w: 'Obstruction with a moderately low TLC.', r: '', l: '', t: 'vol' },
  'code.V19': { n: 'V19', f: 'Severe mixed disorder', w: 'Obstruction with a severely low TLC.', r: '', l: '', t: 'vol' },
  'code.V20': { n: 'V20', f: 'Air trapping', w: 'Raised RV/TLC with a normal TLC.', r: '', l: '', t: 'vol' },
  'code.D1':  { n: 'D1', f: 'Normal diffusing capacity', w: '', r: '', l: '', t: 'dlco' },
  'code.D10': { n: 'D10', f: 'Borderline low DLCO', w: 'Significance uncertain.', r: '', l: '', t: 'dlco' },
  'code.D21': { n: 'D21', f: 'Mildly reduced DLCO', w: '', r: '', l: '', t: 'dlco' },
  'code.D22': { n: 'D22', f: 'Moderately reduced DLCO', w: '', r: '', l: '', t: 'dlco' },
  'code.D23': { n: 'D23', f: 'Severely reduced DLCO', w: '', r: '', l: '', t: 'dlco' },
  'code.D31': { n: 'D31', f: 'Low DLCO, hemoglobin unknown', w: 'A low hemoglobin can contribute.', r: '', l: '', t: 'dlco' },
  'code.D32': { n: 'D32', f: 'Low DLCO explained by hemoglobin', w: 'The Hb-adjusted DLCO is normal.', r: '', l: '', t: 'dlco' },
  'code.D33': { n: 'D33', f: 'Low DLCO partly explained by hemoglobin', w: 'The Hb-adjusted DLCO remains low.', r: '', l: '', t: 'dlco' },
  'code.D41': { n: 'D41', f: 'Low DLCO, low VA, high KCO', w: 'Incomplete lung expansion.', r: '', l: '', t: 'dlco' },
  'code.D42': { n: 'D42', f: 'Low DLCO, low VA, low or normal KCO', w: 'Loss of alveolar–capillary gas transfer.', r: '', l: '', t: 'dlco' },
  'code.D51': { n: 'D51', f: 'Low VA/TLC', w: 'Heterogeneous distribution of ventilation.', r: '', l: '', t: 'dlco' },
  'code.D61': { n: 'D61', f: 'High DLCO, hemoglobin unknown', w: '', r: '', l: '', t: 'dlco' },
  'code.D62': { n: 'D62', f: 'High DLCO explained by hemoglobin', w: '', r: '', l: '', t: 'dlco' },
  'code.D63': { n: 'D63', f: 'High DLCO not explained by hemoglobin', w: 'Pulmonary vascular engorgement or polycythemia.', r: '', l: '', t: 'dlco' }
};

/* Which glossary entry belongs to which input. Key: 'module.field'. */
const FIELD = {
  'spiro.ratio': 'ratio', 'spiro.fev1': 'fev1', 'spiro.fvc': 'fvc', 'spiro.fef': 'fef', 'spiro.qual_fev1': 'quality', 'spiro.qual_fvc': 'quality', 'spiro.effort': 'effort', 'spiro.limits': 'quality',
  'bd.resp': 'bd', 'bd.post_ratio': 'ratio', 'bd.post_fev1': 'fev1',
  'fvl.loop': 'loop', 'fvl.pef': 'pef', 'fvl.fevpef': 'fevpef', 'fvl.fifratio': 'fif50', 'fvl.fif50c': 'fif50',
  'vol.method': 'voltech', 'vol.tlc': 'tlc', 'vol.rvtlc': 'rvtlc', 'vol.rv': 'rv', 'vol.frc': 'frc', 'vol.frctlc': 'frctlc', 'vol.svc': 'svc', 'vol.erv': 'erv', 'vol.ic': 'ic',
  'dlco.dlco': 'dlco', 'dlco.basis': 'dlcoadj', 'dlco.dlco_adj': 'dlcoadj', 'dlco.va': 'va', 'dlco.kco': 'kco', 'dlco.hbcat': 'hb', 'dlco.cohbcat': 'cohb', 'dlco.vatlc': 'vatlc', 'dlco.hb': 'hb', 'dlco.cohb': 'cohb',
  'raw.raw': 'raw', 'raw.sraw': 'sraw', 'raw.sgaw': 'sgaw',
  'osc.r5': 'r5', 'osc.r520': 'r520', 'osc.x5': 'x5', 'osc.ax': 'ax', 'osc.fres': 'fres',
  'mip.mip': 'mip', 'mip.mep': 'mep', 'mip.snip': 'snip', 'mip.p01': 'p01', 'mip.cpfcat': 'cpf', 'mip.mip_v': 'mip', 'mip.mep_v': 'mep', 'mip.snip_v': 'snip', 'mip.cpf': 'cpf', 'mip.mvv': 'mvv',
  'post.fall': 'supine', 'post.orthodeox': 'orthodeox', 'post.up': 'supine', 'post.sup': 'supine',
  'feno.band': 'feno', 'feno.val': 'feno',
  'bronch.mch_cat': 'pc20', 'bronch.mch_val': 'pc20', 'bronch.man_res': 'mannitol', 'bronch.ex_res': 'exch',
  'sixmw.dist_cat': 'six', 'sixmw.dist': 'six', 'sixmw.hrr': 'hrr', 'sixmw.hr_1min': 'hrr', 'sixmw.borg_base': 'borg', 'sixmw.borg_end': 'borg', 'sixmw.eq': 'equations6', 'sixmw.spo2_nadir': 'dsp',
  'cpet.vo2_c': 'vo2', 'cpet.vo2_pct': 'vo2', 'cpet.vo2_abs': 'vo2', 'cpet.lt_c': 'lt', 'cpet.lt_pct': 'lt', 'cpet.rer_c': 'rer', 'cpet.rer': 'rer', 'cpet.o2p_c': 'o2p', 'cpet.o2p': 'o2p', 'cpet.hrr_c': 'hrr', 'cpet.hrr1': 'hrr',
  'cpet.vent_c': 'vemvv', 'cpet.ve_mvv': 'vemvv', 'cpet.slope_c': 'vevco2', 'cpet.vevco2': 'vevco2', 'cpet.vevco2_nadir': 'vevco2', 'cpet.petco2_c': 'petco2', 'cpet.petco2': 'petco2', 'cpet.vtic': 'vtic', 'cpet.hr_c': 'hrmax',
  'gas.ph_c': 'ph', 'gas.ph': 'ph', 'gas.co2_c': 'paco2', 'gas.paco2': 'paco2', 'gas.hco3_c': 'hco3', 'gas.hco3': 'hco3', 'gas.o2_c': 'pao2', 'gas.pao2': 'pao2', 'gas.aa_c': 'aa', 'gas.sao2': 'sao2', 'gas.cohb': 'cohb',
  'ctx.ref_spiro': 'gli', 'ctx.ref_vol': 'gli', 'ctx.ref_dlco': 'gli', 'ctx.hrmax_eq': 'hrmax', 'ctx.aa_eq': 'aa'
};


/* Sub-inputs share the entry of their parent measure. */
Object.assign(FIELD, {
  'spiro.fev1_abs': 'fev1', 'spiro.fev1_pct': 'fev1', 'spiro.fvc_abs': 'fvc', 'spiro.fvc_pct': 'fvc',
  'bd.fev1_pre': 'bd', 'bd.fev1_post': 'bd', 'bd.fev1_pred': 'bd', 'bd.fvc_pre': 'bd', 'bd.fvc_post': 'bd', 'bd.fvc_pred': 'bd', 'bd.dfev1_pp': 'bd', 'bd.dfvc_pp': 'bd',
  'fvl.loop_repro': 'loop', 'fvl.pef_lmin': 'pef', 'fvl.fef50': 'fif50', 'fvl.fif50': 'fif50',
  'vol.tlc_abs': 'tlc', 'vol.rv_abs': 'rv', 'vol.frc_abs': 'frc', 'vol.svc_abs': 'svc',
  'dlco.dlco_abs': 'dlco', 'dlco.dlco_pct': 'dlco', 'dlco.va_abs': 'va',
  'post.orthop': 'orthodeox', 'post.platyp': 'orthodeox', 'post.spo2_sup': 'orthodeox', 'post.spo2_up': 'orthodeox', 'post.pao2_sup': 'orthodeox', 'post.pao2_up': 'orthodeox',
  'bronch.mch_fall': 'pc20', 'bronch.mch_neg': 'pc20', 'bronch.man_fall': 'mannitol', 'bronch.man_dose': 'mannitol', 'bronch.man_incr': 'mannitol', 'bronch.ex_fall': 'exch', 'bronch.ex_consec': 'exch',
  'sixmw.desat': 'dsp', 'sixmw.spo2_base': 'dsp', 'sixmw.spo2_end': 'dsp', 'sixmw.hr_base': 'hrr', 'sixmw.hr_peak': 'hrmax', 'sixmw.pred': 'equations6', 'sixmw.lln': 'equations6', 'sixmw.pct': 'equations6',
  'cpet.hr_peak': 'hrmax', 'cpet.hr_pct': 'hrmax', 'cpet.borg_d': 'borg', 'cpet.borg_l': 'borg', 'cpet.lactate': 'lt', 'cpet.effort': 'rer',
  'gas.fio2': 'pf', 'gas.fio2_c': 'pf'
});

/* A few extra entries used by the six-minute walk equation field. */
G.equations6 = { n: '6MWD reference equation', f: 'Predicted six-minute walk distance', w: 'Enright & Sherrill 1998, Casanova 2011 and Troosters 1999 predict the distance from age, height, weight and sex. When the laboratory reports no predicted value, the app calculates it with Enright & Sherrill 1998 (the MDCalc 6-minute walk distance calculator) from the Details step: men 7.57 × height(cm) − 5.02 × age − 1.76 × weight(kg) − 309 m, LLN = predicted − 153 m; women 2.11 × height − 2.29 × weight − 5.78 × age + 667 m, LLN = predicted − 139 m.', r: 'The reference changes the % predicted and the LLN, sometimes by 100 m or more for the same patient.', l: 'ERS/ATS 2014: reference equations applied to individuals show substantial variation; locally derived equations are preferred. Name the equation used.', t: 'sixmw' };

root.PFT_GLOSS = { terms: G, field: FIELD };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PFT_GLOSS;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
