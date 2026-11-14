/* ------------------------------------------------------------------ the hemos calculator
   A bedside "hemos" sheet as a set of pure functions: the ten numbers a unit's chart asks for (weight, height, haemoglobin,
   arterial and venous saturation, CVP, MAP, PA systolic and diastolic, wedge) go in; the chart's seven results come out by
   the chart's own formulas (estimated Fick output with 3.5 mL/kg/min, Mosteller BSA, index, SVR × 80, PAPi, CPO = MAP × CO
   / 451, PVR in Wood units from (PAs + 2 PAd) / 3), followed by the fuller set a pulmonary artery catheter allows.
   Every number carries three things besides its value: the normal range, what it cannot tell you (a fixed list, the same
   text as the reading page), and what that means for the numbers just typed (how far the answer moves if the assumed VO2
   is 25% off, if the ScvO2 runs 5 points above the SvO2, if the wedge or the CVP is 2–3 mm Hg out). Entries are checked
   before anything is calculated: a typo is reported as a typo, a division by zero as a reason, a negative resistance as a
   measurement error. Nothing here stores or sends anything. */
(function (root) {
  'use strict';
  const HEMO = root.PFT_HEMO;
  const fmt = (v, dp) => {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    let s = v.toFixed(dp === undefined ? 1 : dp);
    if (/^-0(\.0+)?$/.test(s)) s = s.slice(1);
    if (Math.abs(v) >= 1000) { const p = s.split('.'); s = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (p[1] ? '.' + p[1] : ''); }
    return s;
  };
  const pct = (a) => Math.round(a * 100);

  /* ================================================================== the inputs ================================================================== */
  /* hard: outside this the entry is rejected (it cannot be a real value in an adult); soft: outside this it is used but queried */
  const FIELDS = [
    { k: 'wt', label: 'Weight', unit: 'kg', set: 'chart', hard: [25, 350], soft: [40, 180], step: 0.1, eg: 80 },
    { k: 'ht', label: 'Height', unit: 'cm', set: 'chart', hard: [100, 230], soft: [140, 205], step: 0.5, eg: 175 },
    { k: 'hb', label: 'Haemoglobin', unit: 'g/dL', set: 'chart', hard: [3, 22], soft: [6, 18], step: 0.1, eg: 12 },
    { k: 'sao2', label: 'Arterial O2 saturation', unit: '%', set: 'chart', hard: [50, 100], soft: [88, 100], step: 0.1, eg: 96 },
    { k: 'svo2', label: 'ScvO2 or SvO2', unit: '%', set: 'chart', hard: [10, 99], soft: [35, 85], step: 0.1, eg: 60 },
    { k: 'cvp', label: 'CVP', unit: 'mm Hg', set: 'chart', hard: [-5, 45], soft: [0, 25], step: 1, eg: 10 },
    { k: 'map', label: 'MAP', unit: 'mm Hg', set: 'chart', hard: [25, 200], soft: [50, 120], step: 1, eg: 75 },
    { k: 'pas', label: 'PA systolic', unit: 'mm Hg', set: 'chart', hard: [8, 160], soft: [15, 100], step: 1, eg: 40 },
    { k: 'pad', label: 'PA diastolic', unit: 'mm Hg', set: 'chart', hard: [1, 90], soft: [4, 50], step: 1, eg: 20 },
    { k: 'pcwp', label: 'PCWP', unit: 'mm Hg', set: 'chart', hard: [1, 60], soft: [4, 35], step: 1, eg: 18 },
    { k: 'hr', label: 'Heart rate', unit: '/min', set: 'more', hard: [20, 250], soft: [40, 150], step: 1, eg: 90, unlocks: 'stroke volume and index, the stroke work indices, PA compliance' },
    { k: 'sbp', label: 'Systolic BP', unit: 'mm Hg', set: 'more', hard: [40, 300], soft: [70, 200], step: 1, eg: 105, unlocks: 'pulse pressure and the aortic pulsatility index; a MAP if none is typed' },
    { k: 'dbp', label: 'Diastolic BP', unit: 'mm Hg', set: 'more', hard: [15, 180], soft: [35, 110], step: 1, eg: 60, unlocks: '' },
    { k: 'mpapm', label: 'Mean PA, measured', unit: 'mm Hg', set: 'more', hard: [5, 110], soft: [8, 70], step: 1, eg: 27, unlocks: 'replaces the mean worked out from systolic and diastolic' },
    { k: 'pao2', label: 'PaO2', unit: 'mm Hg', set: 'more', hard: [25, 650], soft: [50, 500], step: 1, eg: 90, unlocks: 'what the dissolved oxygen left out of the formula is worth' },
    { k: 'age', label: 'Age', unit: 'years', set: 'more', hard: [16, 110], soft: [18, 95], step: 1, eg: 65, unlocks: 'the LaFarge estimate of VO2 (with sex and heart rate)' },
    { k: 'vo2m', label: 'VO2, measured', unit: 'mL/min', set: 'more', hard: [60, 900], soft: [120, 450], step: 1, eg: 230, unlocks: 'a direct Fick in place of the assumed VO2' },
    { k: 'tdco', label: 'Thermodilution CO', unit: 'L/min', set: 'more', hard: [0.5, 25], soft: [2, 12], step: 0.1, eg: 4.5, unlocks: 'a second measurement to hold against the Fick' }
  ];
  const FK = {}; FIELDS.forEach(F => { FK[F.k] = F; });

  /* the commonest slips: the wrong unit, a fraction for a percentage, a dropped digit */
  function hint(k, v) {
    if (k === 'hb' && v > 22 && v <= 250) return 'Haemoglobin is in g/dL here: ' + v + ' g/L is ' + (v / 10).toFixed(1) + '.';
    if (k === 'hb' && v > 0 && v < 3) return 'A haemoglobin under 3 g/dL is rarely a real value: a dropped digit?';
    if (k === 'ht' && v >= 1 && v <= 2.5) return 'Height is in centimetres: ' + v + ' m is ' + Math.round(v * 100) + '.';
    if (k === 'ht' && v >= 48 && v < 100) return 'Height is in centimetres: ' + v + ' in is ' + Math.round(v * 2.54) + ' cm (or are height and weight swapped?).';
    if ((k === 'sao2' || k === 'svo2') && v > 0 && v <= 1) return 'Enter a percentage: ' + v + ' is ' + Math.round(v * 100) + '.';
    if (k === 'sao2' && v > 100) return 'A saturation cannot be above 100%.';
    if (k === 'wt' && v > 350) return 'Weight is in kilograms: ' + v + ' lb is ' + Math.round(v / 2.2046) + ' kg.';
    if (k === 'tdco' && v > 25) return 'Cardiac output is in L/min.';
    return '';
  }
  function check(k, raw) {
    const F = FK[k];
    if (raw === null || raw === undefined || String(raw).trim() === '') return { state: 'empty', v: undefined, msg: '' };
    const s = String(raw).trim().replace(',', '.');
    if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(s)) return { state: 'bad', v: undefined, msg: 'Not a number.' };
    const v = parseFloat(s);
    if (v < F.hard[0] || v > F.hard[1]) return { state: 'bad', v: undefined, raw: v, msg: hint(k, v) || (F.label + ' ' + v + ' ' + F.unit + ' is outside ' + F.hard[0] + '–' + F.hard[1] + ': check the entry.') };
    if (v < F.soft[0] || v > F.soft[1]) return { state: 'warn', v: v, msg: hint(k, v) || ('Unusual (' + F.soft[0] + '–' + F.soft[1] + ' is the usual span): confirm it.') };
    return { state: 'ok', v: v, msg: '' };
  }

  /* ================================================================== what each number cannot tell you ================================================================== */
  /* head: the one line shown under the result; list: the full account (also the reading page) */
  const LIM = {
    co: { head: 'An estimate: an assumed oxygen consumption divided by the difference of two saturations.', list: [
      'Across more than 12,000 right heart catheterisations in the VA (VA CART), estimated-Fick and thermodilution indices differed by more than 20% in 38% of patients, with limits of agreement of ± 1.3 L/min/m². Thermodilution predicted death better, and the Fick ran higher than thermodilution when the index was low (Opotowsky 2017).',
      'Whatever error it has passes straight into every number built on it: the index, SVR, PVR, cardiac power, stroke volume, the work indices and oxygen delivery.',
      'It describes a steady state. Draw the two samples together, slowly, and not during a bolus, a drug change, suctioning, a turn or shivering.',
      'On VA ECMO it is not the heart’s output, and with an Impella or an LVAD it is the total flow rather than the ventricle’s own.',
      'With an intracardiac shunt the pulmonary and systemic flows differ and one venous sample cannot give both.'] },
    ci: { head: 'Carries all the uncertainty of the output, then divides by a body-size formula.', list: [
      'The 2.2 L/min/m² line comes from thermodilution in acute myocardial infarction (Forrester 1976). An estimated Fick close to it cannot place a patient on either side on its own.',
      'In VA CART a low thermodilution index carried more risk than a low estimated-Fick index: the same number means less when it is estimated.',
      'A normal index can be inadequate (sepsis, fever, anaemia, a high demand) and a low one adequate (sedated, cooled, hypothyroid). Read it with the lactate, the venous saturation, the urine output and the hands and feet.',
      'Indexing to BSA makes the output of a large patient look lower.'] },
    bsa: { head: 'A formula for an average-shaped adult; every indexed number inherits its error.', list: [
      'Mosteller and DuBois agree within a few percent in most adults and drift apart at the extremes of size.',
      'Use a measured weight from this admission. Oedema and ascites add surface area on paper that the metabolism does not have.',
      'Amputation, cachexia and pregnancy are outside what the formula was fitted to.'] },
    svr: { head: 'Calculated, never measured: two pressures over an estimated flow.', list: [
      'It moves opposite to the output’s error: a Fick that runs 25% high gives an SVR 20% low, and a “low SVR” is how a distributive picture gets diagnosed.',
      'MAP from an arterial line that is levelled, zeroed and neither damped nor whipping (or a cuff mean); CVP from the same zero, read at end-expiration.',
      'It treats the circulation as steady flow through one rigid tube. It is not afterload (that also depends on arterial stiffness and wall stress), and it falls with haemodilution without any change in vessel tone.',
      'A high SVR with a low output is usually the compensation, not the disease. Treat the patient, not the number.',
      'In cirrhosis, severe anaemia, thyrotoxicosis and an arteriovenous fistula a low SVR is the arithmetic of a high flow.',
      'On VA ECMO or another pump the flow underneath must be the total systemic flow, which a Fick from the patient’s own samples is not.'] },
    papi: { head: 'A ratio with the CVP underneath: it swings with the filling pressure as much as with the right ventricle.', list: [
      'At a low CVP it is not interpretable: dividing by 2–4 mm Hg gives a large number whatever the ventricle is doing, and a reading error of 2 mm Hg doubles or halves it.',
      'The top line is the PA pulse pressure, which is stroke volume divided by PA compliance. A stiff pulmonary bed widens it and flatters the ratio; a failing ventricle facing a compliant bed narrows it.',
      'The cut-offs belong to the populations they came from: below 0.9 in inferior infarction with RV involvement (Korabathina 2012), below 1.85 for RV failure after an LVAD (Morine 2016), other values in advanced heart failure and pulmonary hypertension. There is no single threshold (Lim and Gustafsson 2020).',
      'Severe tricuspid regurgitation raises the CVP and ventricularises its trace; whip on the PA trace exaggerates the pulse pressure; positive pressure and PEEP raise the measured CVP.',
      'With a right-sided support device or VA ECMO emptying the right heart, the pulse pressure is no longer the ventricle’s.'] },
    cpo: { head: 'Pressure × flow: with a MAP held up by a pressor and a flow that is estimated, both factors are soft.', list: [
      'The 0.53 W cut-off comes from 541 patients with cardiogenic shock after myocardial infarction (SHOCK registry, Fincke 2004); 0.6 W is the figure in use. It was not derived with an assumed-VO2 Fick.',
      'This is the common formula. The original definition subtracts the right atrial pressure: (MAP − RAP) × CO / 451. With a high CVP the common formula flatters the heart; in the ESCAPE data the corrected value was associated with outcome and the uncorrected one was not.',
      'A vasopressor raises the MAP and so the product without the heart doing any better: read it beside the doses.',
      'It is not indexed: a small patient has a lower value at the same adequacy. The cardiac power index (below 0.32 W/m²) is the size-adjusted form.',
      'On mechanical support the flow is not the heart’s own, so neither is the power.'] },
    pvr: { head: 'A small pressure difference over an estimated flow: the most fragile number on the sheet.', list: [
      'The wedge decides it. Read the mean at end-expiration from a true wedge trace; an error of 3 mm Hg on a gradient of 8 is an error of 40%.',
      'Large v waves (mitral regurgitation, a stiff left atrium) lift the mean wedge above the ventricle’s filling pressure and make the PVR look lower.',
      'PEEP, auto-PEEP and a catheter tip outside West zone 3 make the wedge read alveolar pressure.',
      'A wedge above the mean PA pressure is impossible in a steady state: a negative PVR is a measurement error, not a result.',
      'It depends on flow: vessels recruit and distend as the output rises, so a low output raises the calculated PVR and a high one (anaemia, cirrhosis, sepsis, a fistula) hides disease.',
      'An overestimated Fick underestimates it. Using estimated in place of measured VO2 moved 4–33% of 691 heart-failure patients under the 3 Wood unit line their measured value exceeded (Grafton 2019).',
      'The mean PA pressure here is worked out from systolic and diastolic unless a measured mean is typed.',
      'It is the steady part of the load only; the pulsatile part (PA compliance) is not in it.'] },
    vo2: { head: 'Assumed, not measured: the weakest number on the sheet.', list: [
      '3.5 mL/kg/min is one MET, a convention traced to the resting oxygen uptake of a single 70-kg, 40-year-old man. In 769 adults measured by indirect calorimetry the resting value averaged 2.6 mL/kg/min: the convention ran 35% high (Byrne 2005).',
      'Per kilogram of actual weight it grows with fat and oedema, which use little oxygen: the heavier the patient, the more it overestimates.',
      'The catheter-laboratory formulas missed the measured VO2 by more than 25% in 17–25% of 535 patients, more with a BMI above 40 (Narang 2014), and in 25–82% of 691 heart-failure patients depending on the formula (Grafton 2019). Resting VO2 falls as heart failure worsens.',
      'The ICU moves it in both directions: fever, shivering, agitation, the work of breathing and sepsis raise it; sedation, paralysis, hypothermia and full ventilatory support lower it.',
      'LaFarge was derived in children and young adults with congenital heart disease, and 125 mL/min/m² from a hundred or so adults at catheterisation.',
      'A measured VO2 (a metabolic cart, or the ventilator’s indirect calorimetry) turns the estimate into a direct Fick.'] },
    avd: { head: 'Two saturations subtracted: a small error in either is a large error in the difference.', list: [
      'Each point of saturation is one part in (SaO2 − SvO2) of the answer: 3% at a gap of 30 points, 8% at a gap of 12.',
      'Use co-oximeter saturations from blood drawn at the same time. Not a saturation calculated from a PO2, and not the pulse oximeter (± 2–4 points, worse with poor perfusion, dark skin, carboxy- and methaemoglobin).',
      'A central line samples the superior vena cava: it misses the coronary sinus and, in shock, the more desaturated blood from below the diaphragm. ScvO2 averaged 5 points above SvO2 (Chawla 2004), with limits of agreement of −5 to +19 points in shock (Ho 2010) and −12 to +16 in sepsis (van Beest 2010). The gap is then read too small and the output too high.',
      'With a PA catheter in place, draw the mixed venous sample from the distal port, slowly, balloon down. Drawn fast or wedged, it pulls back arterialised blood and reads high.',
      'A femoral venous sample stands in for neither.',
      'Dissolved oxygen (0.003 × PO2) is left out. On room air it is negligible; at a PaO2 of 300–400 mm Hg it adds about 1 mL/dL to the arterial side, and leaving it out overestimates the output by 10–25%.',
      'The haemoglobin must be from the same draw: bleeding, transfusion and dilution change it within hours.',
      '1.34 mL/g is one of three constants in use (1.34, 1.36, 1.39): a spread of 4%.'] },
    o2er: { head: 'With an ScvO2 the extraction is under-read in shock.', list: [
      'It needs no weight, no haemoglobin and no assumed VO2, so it is the sturdiest number here; its limits are those of the two saturations.',
      'A high venous saturation is not reassurance by itself: shunting, sepsis, cyanide, cirrhosis, hypothermia and a wedged sample all give one.',
      'It is global. A normal value does not exclude an ischaemic gut or limb.'] },
    cao2: { head: 'Bound oxygen only unless a PaO2 is typed.', list: [
      'Content, not tension: anaemia halves it at a perfect PaO2.',
      'Carboxy- and methaemoglobin carry no oxygen but can be counted as saturated by a pulse oximeter or a calculated saturation.'] },
    do2: { head: 'Not an independent number here: it is the assumed VO2 divided by the extraction ratio.', list: [
      'Output from the Fick times content cancels to VO2 ÷ extraction, so it restates the two saturations and the assumption and adds nothing they do not hold.',
      'It is global delivery; distribution and extraction decide what the tissues receive.',
      'Chasing supranormal targets with fluid and inotropes did not help the critically ill and harmed some (Hayes 1994, Gattinoni 1995).'] },
    sv: { head: 'Output divided by rate: the forward flow of an average beat.', list: [
      'In atrial fibrillation or with frequent ectopy no single beat has this stroke volume.',
      'With mitral or aortic regurgitation the ventricle ejects more than this; Fick and thermodilution see only the forward flow.',
      'The heart rate must be from the same minute as the samples.'] },
    svi: { head: 'The stroke volume’s limits, plus those of BSA.', list: [
      'It separates a low index caused by a small stroke from one hidden by tachycardia, but only as well as the output it is built on.'] },
    svri: { head: 'SVR multiplied by BSA: the same limits, with a body-size formula added.', list: [
      'It exists so that a small and a large patient can share one normal range; it does not make the underlying flow any better measured.'] },
    mpap: { head: 'Worked out from systolic and diastolic; the monitor’s integrated mean is the measurement.', list: [
      'The one-third, two-thirds rule assumes diastole takes two-thirds of the cycle. It drifts at fast rates.',
      'Whip inflates the systolic and deepens the diastolic; damping flattens both. Check the trace before the arithmetic.',
      'Read at end-expiration. On high PEEP or with large respiratory swings part of the pressure belongs to the chest.',
      'The definition of pulmonary hypertension (a mean above 20 mm Hg) is for a resting catheterisation in a stable patient, not a ventilated patient on vasopressors.'] },
    tpg: { head: 'Rises with flow and with the wedge itself, so it overcalls lung vessel disease when the left heart is congested.', list: [
      'Two pressures each read to within 2–3 mm Hg: a gradient of 12 and one of 15 are the same finding.',
      'Zero or negative means one of the two pressures is wrong.'] },
    dpg: { head: 'The difference of two pressures each uncertain by 2–3 mm Hg: it cannot be split finer than that.', list: [
      'The PA diastolic is the pressure most distorted by whip, and the wedge the one most often over-read (v waves, an incomplete wedge, a tip outside zone 3).',
      'Negative values are common and are measurement error, not physiology.',
      'It is less dependent on flow than the transpulmonary gradient, which is why it was proposed; its prognostic value has not held up consistently.'] },
    pac: { head: 'Stroke volume over the PA pulse pressure: an estimated flow over a trace that whips.', list: [
      'It needs the heart rate from the same minute, and inherits every limit of the output.',
      'It falls as the wedge rises even with healthy lung vessels, so in left heart disease it reads partly as congestion.'] },
    rapcwp: { head: 'Two filling pressures, each uncertain by 2–3 mm Hg; with both low the ratio means nothing.', list: [
      'It says the right side is congested out of proportion to the left. Tamponade, constriction and restriction equalise the two without the right ventricle having failed.',
      'Cut-offs differ by setting: above 0.63 for RV failure after an LVAD (Kormos 2010), above 0.86 in right ventricular infarction.',
      'Diuresis, PEEP and the respiratory phase of the reading move both terms.'] },
    rvswi: { head: 'Three measurements multiplied, so three errors compounded.', list: [
      'It uses mean pressures and forward flow: the work spent on tricuspid regurgitation and on pulsatile load is not in it.',
      'It is low when the right ventricle fails, and also when it simply has little to do (a low PA pressure).'] },
    lvswi: { head: 'Three measurements multiplied, so three errors compounded.', list: [
      'It uses mean pressures and forward flow: the work spent on mitral regurgitation is not in it.',
      'It falls with the afterload as well as with contractility.'] },
    cpoRap: { head: 'The original definition; the cut-offs in use were mostly derived without the correction.', list: [
      'It matters when the CVP is high. With a CVP under about 8 mm Hg the two forms agree closely.',
      'It shares every other limit of the common form: an estimated flow, and a MAP that a vasopressor can raise.'] },
    cpi: { head: 'Cardiac power with BSA’s limits added.', list: [
      'Below 0.32 W/m² is the accepted cut-off (0.28 for the form with RAP subtracted, Baldetti 2022); both come from cardiogenic shock cohorts.',
      'It shares every other limit of the cardiac power output.'] },
    ppp: { head: 'A bedside clue, validated in chronic heart failure before modern therapy.', list: [
      'Below 25% it pointed to a cardiac index under 2.2 in advanced chronic heart failure (Stevenson 1989).',
      'Stiff arteries in the elderly widen the pulse and aortic regurgitation widens it further; both hide a low stroke volume.',
      'A cuff in shock and a damped or whipping arterial line both misstate the pulse pressure.'] },
    api: { head: 'New and retrospective: two cohorts from one group.', list: [
      'Below 1.45 marked patients who needed inotropes, mechanical support or transplant, or died, at 30 days in a single-centre series; 2.9 was the cut-off in the ESCAPE trial data (Belkin 2021).',
      'The pulse pressure depends on arterial stiffness and aortic regurgitation as well as on stroke volume.',
      'The wedge underneath has all the limits listed for PVR.'] }
  };

  /* ================================================================== the numbers ================================================================== */
  /* gauge: [axis start, normal from, normal to, axis end] (null: the band runs to that end of the axis); read: (value as displayed) → [state, severity, words] */
  const DEF = {
    co: { group: 'chart', name: 'Cardiac output', abbr: 'CO', unit: 'L/min', dp: 1, formula: 'VO2 ÷ (1.34 × Hb × 10 × (SaO2 − SvO2) ÷ 100)', normal: '4–8', gauge: [0, 4, 8, 12],
      read: (v) => v < 4 ? ['low', 1, 'below 4'] : v > 8 ? ['high', 1, 'above 8'] : ['ok', 0, ''] },
    ci: { group: 'chart', name: 'Cardiac index', abbr: 'CI', unit: 'L/min/m²', dp: 1, formula: 'CO ÷ BSA', normal: '2.5–4.0', gauge: [0, 2.5, 4, 6],
      read: (v) => v < 1.8 ? ['low', 2, 'below 1.8'] : v < 2.2 ? ['low', 2, 'below 2.2'] : v < 2.5 ? ['low', 1, 'low-normal'] : v > 4 ? ['high', 1, 'above 4'] : ['ok', 0, ''] },
    bsa: { group: 'chart', name: 'Body surface area', abbr: 'BSA', unit: 'm²', dp: 2, formula: '√(height × weight ÷ 3600)', normal: '', gauge: null, read: null },
    svr: { group: 'chart', name: 'Systemic vascular resistance', abbr: 'SVR', unit: 'dyn·s/cm⁵', dp: 0, formula: '(MAP − CVP) ÷ CO × 80', normal: '800–1,200', gauge: [0, 800, 1200, 2400],
      read: (v) => v < 800 ? ['low', 1, 'below 800'] : v > 1600 ? ['high', 2, 'above 1,600'] : v > 1200 ? ['high', 1, 'above 1,200'] : ['ok', 0, ''] },
    papi: { group: 'chart', name: 'PA pulsatility index', abbr: 'PAPi', unit: '', dp: 2, formula: '(PA systolic − PA diastolic) ÷ CVP', normal: 'above 2 (usually 3–8)', gauge: [0, 2, null, 8],
      read: (v, x) => x.cvp < 5 ? ['na', 0, 'CVP under 5: not interpretable'] : v < 0.9 ? ['low', 2, 'below 0.9'] : v < 1.85 ? ['low', 1, 'below 1.85'] : v <= 2 ? ['low', 1, 'not above 2'] : ['ok', 0, ''] },
    cpo: { group: 'chart', name: 'Cardiac power output', abbr: 'CPO', unit: 'W', dp: 2, formula: 'MAP × CO ÷ 451', normal: '0.6 or more (about 1 at rest)', gauge: [0, 0.6, null, 1.6],
      read: (v) => v < 0.6 ? ['low', 2, 'below 0.6'] : ['ok', 0, ''] },
    pvr: { group: 'chart', name: 'Pulmonary vascular resistance', abbr: 'PVR', unit: 'Wood units', dp: 1, formula: '((PA systolic + 2 × PA diastolic) ÷ 3 − PCWP) ÷ CO', normal: '2 or less', gauge: [0, null, 2, 8],
      read: (v) => v > 5 ? ['high', 2, 'above 5'] : v > 3 ? ['high', 2, 'above 3'] : v > 2 ? ['high', 1, 'above 2'] : ['ok', 0, ''] },

    vo2: { group: 'fick', name: 'Oxygen consumption', abbr: 'VO2', unit: 'mL/min', dp: 0, formula: '3.5 mL/kg/min × weight', normal: '', gauge: null, read: null },
    avd: { group: 'fick', name: 'Arteriovenous O2 difference', abbr: 'C(a–v)O2', unit: 'mL/dL', dp: 1, formula: '1.34 × Hb × (SaO2 − SvO2) ÷ 100', normal: '4–6', gauge: [0, 4, 6, 10],
      read: (v) => v < 4 ? ['low', 1, 'narrow'] : v > 6 ? ['high', 1, 'wide'] : ['ok', 0, ''] },
    o2er: { group: 'fick', name: 'O2 extraction ratio', abbr: 'O2ER', unit: '%', dp: 0, formula: '(SaO2 − SvO2) ÷ SaO2', normal: '22–30', gauge: [0, 22, 30, 70],
      read: (v) => v > 50 ? ['high', 2, 'above 50'] : v > 30 ? ['high', 1, 'above 30'] : v < 22 ? ['low', 1, 'below 22'] : ['ok', 0, ''] },
    cao2: { group: 'fick', name: 'Arterial O2 content', abbr: 'CaO2', unit: 'mL/dL', dp: 1, formula: '1.34 × Hb × SaO2 ÷ 100', normal: '17–20', gauge: [5, 17, 20, 25],
      read: (v) => v < 17 ? ['low', 1, 'below 17'] : v > 20 ? ['high', 0, ''] : ['ok', 0, ''] },
    do2: { group: 'fick', name: 'O2 delivery', abbr: 'DO2', unit: 'mL/min', dp: 0, formula: 'CO × CaO2 × 10', normal: '950–1,150', gauge: [0, 950, 1150, 2000],
      read: (v) => v < 950 ? ['low', 1, 'below 950'] : v > 1150 ? ['high', 0, ''] : ['ok', 0, ''] },

    sv: { group: 'beat', name: 'Stroke volume', abbr: 'SV', unit: 'mL', dp: 0, formula: 'CO × 1000 ÷ heart rate', normal: '60–100', gauge: [0, 60, 100, 160],
      read: (v) => v < 60 ? ['low', 1, 'below 60'] : v > 100 ? ['high', 0, ''] : ['ok', 0, ''] },
    svi: { group: 'beat', name: 'Stroke volume index', abbr: 'SVI', unit: 'mL/m²', dp: 0, formula: 'SV ÷ BSA', normal: '33–47', gauge: [0, 33, 47, 80],
      read: (v) => v < 33 ? ['low', 1, 'below 33'] : v > 47 ? ['high', 0, ''] : ['ok', 0, ''] },
    cpoRap: { group: 'beat', name: 'Cardiac power, RAP subtracted', abbr: 'CPO−RAP', unit: 'W', dp: 2, formula: '(MAP − CVP) × CO ÷ 451', normal: '', gauge: [0, 0.6, null, 1.6], read: null },
    cpi: { group: 'beat', name: 'Cardiac power index', abbr: 'CPI', unit: 'W/m²', dp: 2, formula: 'MAP × CI ÷ 451', normal: '0.32 or more (0.5–0.7 at rest)', gauge: [0, 0.32, null, 0.9],
      read: (v) => v < 0.32 ? ['low', 2, 'below 0.32'] : ['ok', 0, ''] },
    lvswi: { group: 'beat', name: 'LV stroke work index', abbr: 'LVSWI', unit: 'g·m/m²', dp: 0, formula: 'SVI × (MAP − PCWP) × 0.0136', normal: '50–62', gauge: [0, 50, 62, 100],
      read: (v) => v < 50 ? ['low', 1, 'below 50'] : v > 62 ? ['high', 0, ''] : ['ok', 0, ''] },
    rvswi: { group: 'beat', name: 'RV stroke work index', abbr: 'RVSWI', unit: 'g·m/m²', dp: 1, formula: 'SVI × (mean PA − CVP) × 0.0136', normal: '5–10', gauge: [0, 5, 10, 20],
      read: (v) => v < 5 ? ['low', 1, 'below 5'] : v > 10 ? ['high', 0, ''] : ['ok', 0, ''] },

    mpap: { group: 'lung', name: 'Mean PA pressure', abbr: 'mPAP', unit: 'mm Hg', dp: 0, formula: '(PA systolic + 2 × PA diastolic) ÷ 3', normal: '20 or less', gauge: [0, null, 20, 70],
      read: (v) => v > 20 ? ['high', 1, 'above 20'] : ['ok', 0, ''] },
    tpg: { group: 'lung', name: 'Transpulmonary gradient', abbr: 'TPG', unit: 'mm Hg', dp: 0, formula: 'mean PA − PCWP', normal: '12 or less', gauge: [0, null, 12, 40],
      read: (v) => v > 12 ? ['high', 1, 'above 12'] : ['ok', 0, ''] },
    dpg: { group: 'lung', name: 'Diastolic pulmonary gradient', abbr: 'DPG', unit: 'mm Hg', dp: 0, formula: 'PA diastolic − PCWP', normal: 'under 7', gauge: [-5, null, 7, 25],
      read: (v) => v >= 7 ? ['high', 1, '7 or more'] : v < 0 ? ['na', 1, 'negative: a measurement error'] : ['ok', 0, ''] },
    pac: { group: 'lung', name: 'PA compliance', abbr: 'PAC', unit: 'mL/mm Hg', dp: 1, formula: 'SV ÷ (PA systolic − PA diastolic)', normal: 'above 2.5', gauge: [0, 2.5, null, 8],
      read: (v) => v < 2.15 ? ['low', 1, 'below 2.15'] : ['ok', 0, ''] },

    rapcwp: { group: 'balance', name: 'CVP : PCWP', abbr: 'RA:PCWP', unit: '', dp: 2, formula: 'CVP ÷ PCWP', normal: 'under 0.63', gauge: [0, null, 0.63, 1.5],
      read: (v, x) => (x.cvp < 6 && x.pcwp < 12) ? ['na', 0, 'both pressures low: not interpretable'] : v > 0.86 ? ['high', 2, 'above 0.86'] : v > 0.63 ? ['high', 1, 'above 0.63'] : ['ok', 0, ''] },
    svri: { group: 'balance', name: 'SVR index', abbr: 'SVRI', unit: 'dyn·s/cm⁵·m²', dp: 0, formula: '(MAP − CVP) ÷ CI × 80', normal: '1,970–2,390', gauge: [0, 1970, 2390, 4500],
      read: (v) => v < 1970 ? ['low', 1, 'below 1,970'] : v > 2390 ? ['high', 1, 'above 2,390'] : ['ok', 0, ''] },
    ppp: { group: 'balance', name: 'Proportional pulse pressure', abbr: 'PPP', unit: '%', dp: 0, formula: '(SBP − DBP) ÷ SBP', normal: '25 or more', gauge: [0, 25, null, 70],
      read: (v) => v < 25 ? ['low', 1, 'below 25'] : ['ok', 0, ''] },
    api: { group: 'balance', name: 'Aortic pulsatility index', abbr: 'API', unit: '', dp: 2, formula: '(SBP − DBP) ÷ PCWP', normal: '2.9 or more', gauge: [0, 2.9, null, 8],
      read: (v) => v < 1.45 ? ['low', 2, 'below 1.45'] : v < 2.9 ? ['low', 1, 'below 2.9'] : ['ok', 0, ''] }
  };
  /* the normal range with its unit: "4–8 L/min", "2 Wood units or less", "22–30%" */
  function normalFull(id) {
    const D = DEF[id]; if (!D.normal) return '';
    if (!D.unit) return D.normal;
    const u = D.unit === '%' ? '%' : ' ' + D.unit;
    if (/^[\d.,–]+$/.test(D.normal)) return D.normal + u;
    return D.normal.replace(/^(\D*)([\d.,]+)/, (m, pre, n) => pre + n + u);
  }
  const GROUPS = [
    { id: 'chart', title: 'The chart’s seven', sub: 'The same formulas, in the chart’s order' },
    { id: 'fick', title: 'What the Fick is made of', sub: 'The assumption and the two saturations' },
    { id: 'beat', title: 'Per beat, and the work', sub: 'Stroke volume needs the heart rate' },
    { id: 'lung', title: 'The pulmonary circuit', sub: 'Gradients across the lung' },
    { id: 'balance', title: 'Right against left, and the pulse', sub: 'Ratios and indexed resistance' }
  ];
  const ORDER = ['co', 'ci', 'bsa', 'svr', 'papi', 'cpo', 'pvr', 'vo2', 'avd', 'o2er', 'cao2', 'do2', 'sv', 'svi', 'cpoRap', 'cpi', 'lvswi', 'rvswi', 'mpap', 'tpg', 'dpg', 'pac', 'rapcwp', 'svri', 'ppp', 'api'];
  /* numbers with the output inside them: they share its uncertainty */
  const ON_CO = { co: 1, ci: 1, svr: -1, pvr: -1, cpo: 1, sv: 1, svi: 1, cpoRap: 1, cpi: 1, lvswi: 1, rvswi: 1, pac: 1, svri: -1, do2: 1 };
  const VO2_METHODS = [['kg', '3.5 mL/kg/min', 'the chart'], ['bsa', '125 mL/min/m²', 'Dehmer'], ['lafarge', 'LaFarge', 'age, sex, heart rate'], ['measured', 'Measured', 'direct Fick']];
  const CONTEXT = [
    ['pressor', 'On vasoactive drugs'], ['ppv', 'Ventilated with PEEP'], ['hifio2', 'High FiO2'], ['af', 'Irregular rhythm'],
    ['tr', 'Severe tricuspid regurgitation'], ['shunt', 'Intracardiac shunt'], ['mcs', 'Impella or LVAD'], ['ecmo', 'VA ECMO']
  ];

  /* the PO2 at a given saturation on a standard curve (Severinghaus), for the dissolved oxygen on the venous side */
  function po2At(sat) {
    const s = Math.max(1, Math.min(99.5, sat)) / 100; let lo = 1, hi = 700;
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (1 / (1 + 23400 / (m * m * m + 150 * m)) < s) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  function compute(raw, opt0) {
    const opt = Object.assign({ vo2: 'kg', sex: '', venous: 'cv', co: 'fick' }, opt0 || {});
    const ctx = Object.assign({}, opt.ctx || {});
    const f = {}, x = {}, checks = [];
    FIELDS.forEach(F => { const c = check(F.k, raw ? raw[F.k] : ''); f[F.k] = c; if (c.v !== undefined) x[F.k] = c.v; });
    const has = function () { for (let i = 0; i < arguments.length; i++) if (x[arguments[i]] === undefined) return false; return true; };
    const need = function () { const out = []; for (let i = 0; i < arguments.length; i++) { const k = arguments[i]; if (x[k] === undefined) out.push(FK[k].label + (f[k].state === 'bad' ? ' (check the entry)' : '')); } return out; };
    const flag = (level, k, fields, t) => checks.push({ level: level, k: k, fields: fields, t: t });
    const blocked = {};

    /* ---- the entries against each other ---- */
    FIELDS.forEach(F => { const c = f[F.k]; if (c.state === 'bad') flag('bad', 'entry-' + F.k, [F.k], c.msg.indexOf(F.label) === 0 ? c.msg : F.label + ': ' + c.msg.charAt(0).toLowerCase() + c.msg.slice(1)); else if (c.state === 'warn') flag('warn', 'entry-' + F.k, [F.k], F.label + ' ' + c.v + ' ' + F.unit + ': ' + c.msg.replace(/^Unusual/, 'unusual')); });
    if (has('pas', 'pad') && x.pad >= x.pas) { flag('bad', 'pa-order', ['pas', 'pad'], 'PA diastolic (' + x.pad + ') is not below PA systolic (' + x.pas + '): are the two swapped? Nothing built on the PA pressures is calculated.'); blocked.pa = 1; }
    if (has('sbp', 'dbp') && x.dbp >= x.sbp) { flag('bad', 'bp-order', ['sbp', 'dbp'], 'Diastolic BP (' + x.dbp + ') is not below systolic (' + x.sbp + '): are the two swapped?'); blocked.bp = 1; }
    let mapCalc = false;
    if (!has('map') && has('sbp', 'dbp') && !blocked.bp && f.map.state === 'empty') { x.map = x.dbp + (x.sbp - x.dbp) / 3; mapCalc = true; flag('note', 'map-calc', ['map'], 'No MAP typed: ' + fmt(x.map, 0) + ' is worked out as diastolic + one third of the pulse pressure. The monitor’s mean is better.'); }
    if (has('map', 'cvp') && x.cvp >= x.map) { flag('bad', 'map-cvp', ['map', 'cvp'], 'The CVP (' + x.cvp + ') is not below the MAP (' + fmt(x.map, 0) + '): one of them is wrong. SVR is not calculated.'); blocked.svr = 1; }
    if (has('map', 'pcwp') && x.pcwp >= x.map) flag('bad', 'map-pcwp', ['map', 'pcwp'], 'The wedge (' + x.pcwp + ') is not below the MAP (' + fmt(x.map, 0) + '): one of them is wrong.');
    if (has('sao2', 'svo2') && x.svo2 >= x.sao2) { flag('bad', 'no-gap', ['sao2', 'svo2'], 'The venous saturation (' + x.svo2 + ') is not below the arterial (' + x.sao2 + '): the Fick has nothing to divide by. Swapped samples, a wedged or arterial sample, or a left-to-right shunt.'); blocked.fick = 1; }
    else if (has('sao2', 'svo2') && x.sao2 - x.svo2 < 12) flag('warn', 'narrow-gap', ['sao2', 'svo2'], 'A saturation gap of only ' + fmt(x.sao2 - x.svo2, 0) + ' points: each point of error now moves the output by ' + pct(1 / (x.sao2 - x.svo2)) + '%. A wedged or arterialised sample, a shunt, or a true high-output state.');
    if (has('mpapm', 'pas', 'pad') && !blocked.pa && (x.mpapm >= x.pas || x.mpapm <= x.pad)) { flag('bad', 'mpap-order', ['mpapm'], 'The measured mean PA (' + x.mpapm + ') does not lie between the diastolic and the systolic: it is not used.'); delete x.mpapm; }
    let bmi = null;
    if (has('wt', 'ht')) {
      bmi = x.wt / Math.pow(x.ht / 100, 2);
      if (bmi > 100 || bmi < 11) { flag('bad', 'bmi', ['wt', 'ht'], 'Weight ' + x.wt + ' kg at ' + x.ht + ' cm is a BMI of ' + fmt(bmi, 0) + ': check both entries (pounds for kilograms, or the two swapped?). Nothing built on body size is calculated.'); blocked.size = 1; }
      else if (bmi > 60) flag('warn', 'bmi-high', ['wt', 'ht'], 'BMI ' + fmt(bmi, 0) + ': check the weight and the height. If they are right, 3.5 mL/kg/min of actual weight will overestimate the VO2, and with it the output, by a wide margin.');
      else if (bmi >= 35) flag('warn', 'bmi-high', ['wt'], 'BMI ' + fmt(bmi, 0) + ': per kilogram of actual weight the assumed VO2 probably overestimates, and with it the output.');
      else if (bmi < 16) flag('warn', 'bmi-low', ['wt', 'ht'], 'BMI ' + fmt(bmi, 0) + ': check the weight and the height.');
    }
    if (has('map', 'sbp', 'dbp') && !mapCalc && !blocked.bp && Math.abs(x.map - (x.dbp + (x.sbp - x.dbp) / 3)) > 12) flag('warn', 'map-fit', ['map', 'sbp', 'dbp'], 'The MAP (' + x.map + ') does not fit ' + x.sbp + '/' + x.dbp + ' (about ' + fmt(x.dbp + (x.sbp - x.dbp) / 3, 0) + '): different moments or different sources?');

    /* ---- body size and oxygen consumption ---- */
    const sizeOk = has('wt', 'ht') && !blocked.size;
    const bsa = sizeOk ? Math.sqrt(x.ht * x.wt / 3600) : null;
    const bsaDubois = sizeOk ? 0.007184 * Math.pow(x.wt, 0.425) * Math.pow(x.ht, 0.725) : null;
    const vo2s = {};
    if (has('wt') && !blocked.size) vo2s.kg = 3.5 * x.wt;
    if (bsa) vo2s.bsa = 125 * bsa;
    if (bsa && has('age', 'hr') && (opt.sex === 'm' || opt.sex === 'f')) vo2s.lafarge = bsa * (138.1 - (opt.sex === 'm' ? 11.49 : 17.04) * Math.log(x.age) + 0.378 * x.hr);
    if (has('vo2m')) vo2s.measured = x.vo2m;
    const vo2 = vo2s[opt.vo2] !== undefined ? vo2s[opt.vo2] : null;
    const vo2Need = opt.vo2 === 'kg' ? need('wt') : opt.vo2 === 'bsa' ? need('wt', 'ht') : opt.vo2 === 'measured' ? need('vo2m') : need('wt', 'ht', 'age', 'hr').concat(opt.sex ? [] : ['Sex']);
    const vo2Label = { kg: '3.5 mL/kg/min × weight', bsa: '125 mL/min/m² × BSA', lafarge: 'BSA × (138.1 − ' + (opt.sex === 'f' ? '17.04' : '11.49') + ' × ln age + 0.378 × heart rate)', measured: 'measured' }[opt.vo2];
    const assumed = opt.vo2 !== 'measured';

    /* ---- the Fick ---- */
    const gap = has('sao2', 'svo2') && !blocked.fick ? x.sao2 - x.svo2 : null;
    const avd = gap !== null && has('hb') ? 1.34 * x.hb * gap / 100 : null;
    const coFick = avd !== null && vo2 !== null ? vo2 / (avd * 10) : null;
    const useTd = opt.co === 'td' && has('tdco');
    const co = useTd ? x.tdco : coFick;
    const coBand = (!useTd && assumed && coFick !== null) ? 0.25 : 0;      // the share by which an assumed VO2 is commonly out
    let co5 = null, coDissolved = null;
    if (coFick !== null && opt.venous === 'cv') co5 = vo2 / (1.34 * x.hb * (gap + 5) / 100 * 10);
    if (coFick !== null && has('pao2')) coDissolved = vo2 / ((avd + 0.003 * Math.max(0, x.pao2 - po2At(x.svo2))) * 10);
    if (coFick !== null && (coFick > 15 || coFick < 1)) flag('bad', 'co-range', ['hb', 'sao2', 'svo2', 'wt'], 'A Fick of ' + fmt(coFick, 1) + ' L/min is outside what a resting adult can have: check the haemoglobin, both saturations and the weight before reading anything below.');
    else if (coFick !== null && (coFick > 11 || coFick < 1.8)) flag('warn', 'co-edge', ['hb', 'sao2', 'svo2', 'wt'], 'A Fick of ' + fmt(coFick, 1) + ' L/min is at the edge of what is seen: check the haemoglobin, both saturations and the weight.');
    if (has('tdco') && coFick !== null) { const d = Math.abs(coFick - x.tdco) / ((coFick + x.tdco) / 2); if (d > 0.2) flag('warn', 'fick-td', ['tdco'], 'Fick ' + fmt(coFick, 1) + ' and thermodilution ' + fmt(x.tdco, 1) + ' L/min are ' + pct(d) + '% apart: they cannot both be right. Thermodilution is the less reliable in severe tricuspid regurgitation, a shunt and a very low output; the Fick wherever the VO2 is not what was assumed.'); }
    const ci = co !== null && bsa ? co / bsa : null;

    /* ---- pressures ---- */
    const paOk = has('pas', 'pad') && !blocked.pa;
    const mpapCalc = paOk ? (x.pas + 2 * x.pad) / 3 : null;
    const mpap = has('mpapm') ? x.mpapm : mpapCalc;
    if (has('mpapm') && mpapCalc !== null && Math.abs(x.mpapm - mpapCalc) > 5) flag('note', 'mpap-fit', ['mpapm'], 'The measured mean PA (' + x.mpapm + ') and the one worked out from ' + x.pas + '/' + x.pad + ' (' + fmt(mpapCalc, 0) + ') are ' + fmt(Math.abs(x.mpapm - mpapCalc), 0) + ' mm Hg apart: a fast rate, or a trace that whips or is damped.');
    const tpg = mpap !== null && has('pcwp') ? mpap - x.pcwp : null;
    const dpg = paOk && has('pcwp') ? x.pad - x.pcwp : null;
    if (tpg !== null && tpg <= 0) flag('bad', 'wedge-high', ['pcwp', 'pas', 'pad'], 'The wedge (' + x.pcwp + ') is not below the mean PA pressure (' + fmt(mpap, 0) + '): impossible in a steady state. An over-wedged or incompletely wedged balloon, large v waves, a tip outside zone 3, or readings from different moments. PVR is not calculated.');
    else if (dpg !== null && dpg < 0) flag('warn', 'dpg-neg', ['pcwp', 'pad'], 'The wedge (' + x.pcwp + ') is above the PA diastolic (' + x.pad + '): a wedge that over-reads (v waves, incomplete wedge, PEEP) or whip on the PA trace.');
    if (has('cvp') && mpap !== null && x.cvp > mpap + 1) flag('warn', 'cvp-mpap', ['cvp'], 'The CVP (' + x.cvp + ') is above the mean PA pressure (' + fmt(mpap, 0) + '): a right ventricle adding no pressure at all, or a transducer levelled or zeroed wrongly. Check before reading the right-sided numbers.');
    const sv = co !== null && has('hr') ? co * 1000 / x.hr : null;
    const svi = sv !== null && bsa ? sv / bsa : null;
    const cao2 = has('hb', 'sao2') ? 1.34 * x.hb * x.sao2 / 100 + (has('pao2') ? 0.003 * x.pao2 : 0) : null;

    /* ---- the rows ---- */
    const rows = [];
    const add = (id, o) => {
      const D = DEF[id];
      const r = Object.assign({ id: id, group: D.group, name: D.name, abbr: D.abbr, unit: D.unit, dp: D.dp, formula: D.formula, normal: D.normal, normalFull: normalFull(id), gauge: D.gauge, limit: LIM[id].head, limits: LIM[id].list,
        value: null, text: '—', st: 'none', sev: 0, say: '', need: [], err: '', hint: '', here: [], range: null, alts: [], sub: '', worked: '' }, o || {});
      if (r.value !== null && isFinite(r.value)) {
        r.text = fmt(r.value, D.dp);
        if (D.read && r.st === 'none') { const rd = D.read(+r.value.toFixed(D.dp), x); r.st = rd[0]; r.sev = rd[1]; r.say = rd[2]; }
        else if (r.st === 'none') r.st = 'info';
        if (coBand && ON_CO[id] && !r.range) { const a = r.value * (1 - coBand), b = r.value * (1 + coBand), c = r.value / (1 + coBand), d = r.value / (1 - coBand); r.range = ON_CO[id] > 0 ? { lo: a, hi: b } : { lo: c, hi: d }; r.range.text = fmt(r.range.lo, D.dp) + '–' + fmt(r.range.hi, D.dp); r.range.basis = 'if the true VO2 is 25% below or above the assumed one'; }
      } else { r.value = null; }
      rows.push(r); return r;
    };
    const coWord = useTd ? 'thermodilution' : (assumed ? 'estimated Fick' : 'direct Fick');
    const coNeed = useTd ? [] : vo2Need.concat(need('hb', 'sao2', 'svo2')).filter((v, i, a) => a.indexOf(v) === i);

    /* cardiac output */
    {
      const r = add('co', { value: co, need: co === null ? coNeed : [], err: blocked.fick && !useTd ? 'The venous saturation is not below the arterial.' : '', sub: co !== null ? coWord : '',
        formula: useTd ? 'thermodilution, as typed' : 'VO2 ÷ (1.34 × Hb × 10 × (SaO2 − SvO2) ÷ 100), with VO2 = ' + vo2Label });
      if (useTd) { r.limit = 'A typed thermodilution value: check it is the mean of three injections that agree within 10%.'; r.limits = ['Thermodilution underestimates in severe tricuspid regurgitation and is unreliable with an intracardiac shunt and at a very low output.', 'Inject at end-expiration, the same volume and temperature each time; discard a curve with an irregular shape.', 'It measures the right heart’s flow through the pulmonary artery, averaged over a few beats.']; }
      if (coFick !== null) {
        if (!useTd) r.worked = fmt(vo2, 0) + ' ÷ (1.34 × ' + x.hb + ' × 10 × (' + x.sao2 + ' − ' + x.svo2 + ') ÷ 100) = ' + fmt(vo2, 0) + ' ÷ ' + fmt(avd * 10, 1) + ' = ' + fmt(coFick, 1);
        r.here.push('With a gap of ' + fmt(gap, 0) + ' points between the two saturations, one point of error in either moves the output by ' + pct(1 / gap) + '%.');
        if (co5 !== null) r.here.push('This is a central venous sample. If the true mixed venous saturation is 5 points lower, the Fick is ' + fmt(co5, 1) + ' rather than ' + fmt(coFick, 1) + ' L/min' + (bsa ? ' (index ' + fmt(co5 / bsa, 1) + ' rather than ' + fmt(coFick / bsa, 1) + ')' : '') + '.');
        if (vo2s.kg !== undefined && vo2s.bsa !== undefined && assumed) { const d = (vo2s.kg - vo2s.bsa) / vo2s.bsa; if (Math.abs(d) > 0.12) r.here.push('The two common assumptions disagree by ' + pct(Math.abs(d)) + '% at this body size: 3.5 mL/kg/min gives ' + fmt(vo2s.kg, 0) + ' mL/min, 125 mL/min/m² gives ' + fmt(vo2s.bsa, 0) + '.'); }
        if (coDissolved !== null && Math.abs(coDissolved - coFick) / coFick > 0.03) r.here.push('At a PaO2 of ' + x.pao2 + ' the dissolved oxygen the formula leaves out is worth ' + pct((coFick - coDissolved) / coFick) + '%: with it the Fick is ' + fmt(coDissolved, 1) + ' L/min.');
        ['kg', 'bsa', 'lafarge', 'measured'].forEach(m => { if (vo2s[m] !== undefined && m !== opt.vo2) r.alts.push({ label: 'Fick with ' + (m === 'measured' ? 'the measured VO2' : m === 'kg' ? '3.5 mL/kg/min' : m === 'bsa' ? '125 mL/min/m²' : 'LaFarge') + ' (' + fmt(vo2s[m], 0) + ' mL/min)', text: fmt(vo2s[m] / (avd * 10), 1) + ' L/min' }); });
        if (useTd) r.alts.push({ label: 'Fick with ' + (assumed ? 'the assumed' : 'the measured') + ' VO2 (' + fmt(vo2, 0) + ' mL/min)', text: fmt(coFick, 1) + ' L/min' });
      }
      if (has('tdco') && !useTd) r.alts.push({ label: 'Thermodilution, as typed', text: fmt(x.tdco, 1) + ' L/min' });
      if (has('tdco') && !useTd && co === null) r.hint = 'A thermodilution value of ' + fmt(x.tdco, 1) + ' L/min is typed: choose it under “Derive the other numbers from” to run the sheet on it.';
      if (ctx.hifio2 && !has('pao2') && !useTd) r.here.push('On a high FiO2 the dissolved oxygen left out of the formula can be worth 10–25% of the answer, always in the direction of overestimating. Type the PaO2 to see it.');
      if (ctx.ecmo) r.here.push('On VA ECMO this is not the heart’s output: the venous sample is blood the circuit is draining, the arterial saturation depends on where it is drawn, and the body’s flow is the heart plus the pump.');
      if (ctx.mcs) r.here.push('With an Impella or an LVAD the Fick gives the total systemic flow (pump plus anything ejected through the valve), not the ventricle’s own output.');
      if (ctx.shunt) r.here.push('With an intracardiac shunt one venous sample cannot stand for both circulations: a left-to-right shunt contaminates the PA sample with arterial blood, and the mixed venous value has to be built from caval samples.');
      if (ctx.tr && (useTd || has('tdco'))) r.here.push('Severe tricuspid regurgitation: the thermodilution value under-reads, and the Fick is the one to prefer.');
      if (ctx.ppv && !useTd && assumed) r.here.push('Sedated on full ventilatory support, the resting VO2 is usually below what the formulas assume, which makes this an overestimate.');
    }
    /* cardiac index */
    {
      const r = add('ci', { value: ci, need: ci === null ? coNeed.concat(need('wt', 'ht')).filter((v, i, a) => a.indexOf(v) === i) : [], worked: ci !== null ? fmt(co, 1) + ' ÷ ' + fmt(bsa, 2) + ' = ' + fmt(ci, 1) : '' });
      if (ci !== null && r.range && r.range.lo < 2.2 && r.range.hi >= 2.2) r.here.push('The band from an assumed VO2 (' + r.range.text + ') crosses 2.2: this estimate cannot say which side of the line the patient is on. Thermodilution, a measured VO2, or the clinical picture has to.');
      if (ci !== null && bmi !== null && bmi >= 35) r.here.push('At a BMI of ' + fmt(bmi, 0) + ' the BSA is large (' + fmt(bsa, 2) + ' m²) and the index is correspondingly low for the same flow.');
    }
    /* BSA */
    {
      const r = add('bsa', { value: bsa, need: bsa === null ? need('wt', 'ht') : [], err: blocked.size ? 'The weight and height do not fit each other.' : '', worked: bsa ? '√(' + x.ht + ' × ' + x.wt + ' ÷ 3600) = ' + fmt(bsa, 2) : '' });
      if (bsa) { r.alts.push({ label: 'DuBois', text: fmt(bsaDubois, 2) + ' m²' }); r.alts.push({ label: 'Body mass index', text: fmt(bmi, 1) + ' kg/m²' }); if (Math.abs(bsa - bsaDubois) / bsa > 0.04) r.here.push('Mosteller and DuBois differ by ' + pct(Math.abs(bsa - bsaDubois) / bsa) + '% at this body size, and so would every indexed number.'); }
    }
    /* SVR */
    {
      const ok = co !== null && has('map', 'cvp') && !blocked.svr, v = ok ? (x.map - x.cvp) / co * 80 : null;
      const r = add('svr', { value: v, need: ok ? [] : coNeed.concat(need('map', 'cvp')).filter((q, i, a) => a.indexOf(q) === i), err: blocked.svr ? 'The CVP is not below the MAP.' : '', sub: v !== null ? fmt(v / 80, 1) + ' Wood units' : '',
        worked: v !== null ? '(' + fmt(x.map, 0) + ' − ' + x.cvp + ') ÷ ' + fmt(co, 1) + ' × 80 = ' + fmt(v, 0) : '' });
      if (v !== null) {
        if (mapCalc) r.here.push('The MAP is worked out from ' + x.sbp + '/' + x.dbp + ', not measured.');
        if (ctx.pressor) r.here.push('On vasoactive drugs the SVR is partly the dose: a normal value on norepinephrine is not a normal vascular tone.');
        if (ctx.ecmo || ctx.mcs) r.here.push('With a pump in the circulation the flow underneath has to be the total systemic flow. This value divides by the Fick and is not usable as it stands.');
        if (ctx.ppv) r.here.push('On positive pressure the measured CVP includes part of the airway pressure, which lowers the SVR slightly.');
      }
    }
    /* PAPi */
    {
      const cvpOk = has('cvp') && x.cvp > 0, ok = paOk && cvpOk, v = ok ? (x.pas - x.pad) / x.cvp : null;
      const r = add('papi', { value: v, need: ok ? [] : (blocked.pa ? [] : need('pas', 'pad')).concat(need('cvp')), err: blocked.pa ? 'The PA diastolic is not below the systolic.' : (has('cvp') && x.cvp <= 0 ? 'A CVP of ' + x.cvp + ' cannot be divided by: the index does not exist at a filling pressure of zero or below.' : ''),
        worked: v !== null ? '(' + x.pas + ' − ' + x.pad + ') ÷ ' + x.cvp + ' = ' + fmt(v, 2) : '' });
      if (v !== null) {
        if (x.cvp < 5) r.here.push('CVP ' + x.cvp + ': the ratio is not interpretable at a filling pressure this low. One mm Hg either way gives ' + fmt((x.pas - x.pad) / (x.cvp + 1), 1) + ' or ' + (x.cvp > 1 ? fmt((x.pas - x.pad) / (x.cvp - 1), 1) : 'no number at all') + '.');
        else r.here.push('A reading error of 2 mm Hg in the CVP moves it between ' + fmt((x.pas - x.pad) / (x.cvp + 2), 2) + ' and ' + fmt((x.pas - x.pad) / (x.cvp - 2), 2) + '.');
        if (ctx.ppv) r.here.push('On positive pressure the measured CVP includes part of the airway pressure: the index reads lower than the ventricle deserves.');
        if (ctx.tr) r.here.push('Severe tricuspid regurgitation raises the CVP by itself and lowers the index without telling you how the ventricle contracts.');
        if (ctx.mcs || ctx.ecmo) r.here.push('With a device emptying or bypassing the right heart, the PA pulse pressure is not the ventricle’s.');
        if (mpap !== null && mpap > 35) r.here.push('With a mean PA pressure of ' + fmt(mpap, 0) + ' the pulse pressure is widened by a stiff pulmonary bed: the index can look acceptable while the ventricle is failing.');
      }
    }
    /* CPO */
    {
      const ok = co !== null && has('map'), v = ok ? x.map * co / 451 : null;
      const r = add('cpo', { value: v, need: ok ? [] : coNeed.concat(need('map')).filter((q, i, a) => a.indexOf(q) === i), worked: v !== null ? fmt(x.map, 0) + ' × ' + fmt(co, 1) + ' ÷ 451 = ' + fmt(v, 2) : '' });
      if (v !== null) {
        if (has('cvp') && x.cvp >= 8 && !blocked.svr) r.here.push('With the CVP of ' + x.cvp + ' subtracted, as in the original definition, it is ' + fmt((x.map - x.cvp) * co / 451, 2) + ' W.');
        if (ctx.pressor) r.here.push('On vasoactive drugs part of the MAP in this product is the drug’s.');
        if (ctx.ecmo || ctx.mcs) r.here.push('With a pump in the circulation neither the flow nor the pressure is the heart’s alone.');
        if (mapCalc) r.here.push('The MAP is worked out from ' + x.sbp + '/' + x.dbp + ', not measured.');
      }
    }
    /* PVR */
    {
      const ok = tpg !== null && tpg > 0 && co !== null, v = ok ? tpg / co : null;
      const r = add('pvr', { value: v, need: ok ? [] : (tpg !== null && tpg <= 0 ? [] : (blocked.pa ? [] : (has('mpapm') ? [] : need('pas', 'pad'))).concat(need('pcwp'))).concat(co === null ? coNeed : []).filter((q, i, a) => a.indexOf(q) === i),
        err: blocked.pa && !has('mpapm') ? 'The PA diastolic is not below the systolic.' : (tpg !== null && tpg <= 0 ? 'The wedge is not below the mean PA pressure: a measurement error, not a negative resistance.' : ''), sub: v !== null ? fmt(v * 80, 0) + ' dyn·s/cm⁵' : '',
        formula: has('mpapm') ? '(mean PA, measured − PCWP) ÷ CO' : DEF.pvr.formula,
        worked: v !== null ? (has('mpapm') ? '(' + x.mpapm + ' − ' + x.pcwp + ')' : '((' + x.pas + ' + 2 × ' + x.pad + ') ÷ 3 − ' + x.pcwp + ')') + ' ÷ ' + fmt(co, 1) + ' = ' + fmt(tpg, 1) + ' ÷ ' + fmt(co, 1) + ' = ' + fmt(v, 1) : '' });
      if (v !== null) {
        r.here.push('A reading error of 3 mm Hg in the wedge moves it between ' + fmt(Math.max(0, tpg - 3) / co, 1) + ' and ' + fmt((tpg + 3) / co, 1) + ' Wood units.');
        if (r.range && ((r.range.lo <= 2 && r.range.hi > 2) || (r.range.lo <= 3 && r.range.hi > 3))) r.here.push('The band from an assumed VO2 (' + r.range.text + ') crosses a decision line (2 or 3 Wood units).');
        if (ctx.ppv) r.here.push('On PEEP the wedge may be reading alveolar pressure: check the tip is in zone 3 and read at end-expiration.');
        if (ctx.shunt) r.here.push('With a shunt the flow through the lungs is not the flow through the body: this PVR uses the wrong one unless the pulmonary flow was calculated separately.');
        if (ctx.ecmo) r.here.push('On VA ECMO little of the flow crosses the lungs, and the Fick does not measure that part.');
      }
    }
    /* the Fick’s ingredients */
    {
      const r = add('vo2', { value: vo2, need: vo2 === null ? vo2Need : [], formula: vo2Label, st: vo2 === null ? 'none' : 'info', sub: vo2 !== null ? (has('wt') ? fmt(vo2 / x.wt, 1) + ' mL/kg/min' : '') + (bsa ? (has('wt') ? ' · ' : '') + fmt(vo2 / bsa, 0) + ' mL/min/m²' : '') : '',
        worked: vo2 !== null && opt.vo2 === 'kg' ? '3.5 × ' + x.wt + ' = ' + fmt(vo2, 0) : (vo2 !== null && opt.vo2 === 'bsa' ? '125 × ' + fmt(bsa, 2) + ' = ' + fmt(vo2, 0) : '') });
      if (!assumed) { r.name = 'Oxygen consumption, measured'; r.limit = 'Measured: the Fick is now direct, and its remaining limits are those of the two saturations.'; r.limits = ['Indirect calorimetry needs a steady state, no circuit leak and an FiO2 below about 0.6.', 'Measure it in the same minutes the samples are drawn.']; }
      ['kg', 'bsa', 'lafarge', 'measured'].forEach(m => { if (vo2s[m] !== undefined && m !== opt.vo2) r.alts.push({ label: m === 'measured' ? 'Measured' : m === 'kg' ? '3.5 mL/kg/min' : m === 'bsa' ? '125 mL/min/m²' : 'LaFarge', text: fmt(vo2s[m], 0) + ' mL/min' }); });
      if (vo2 !== null && assumed && bmi !== null && bmi >= 35 && opt.vo2 === 'kg') r.here.push('BMI ' + fmt(bmi, 0) + ': 3.5 mL/kg/min of actual weight assumes ' + fmt(vo2, 0) + ' mL/min (' + fmt(vo2 / bsa, 0) + ' mL/min/m²). Fat and oedema use little oxygen, so this probably overestimates.');
      if (vo2 !== null && assumed && bsa && (vo2 / bsa > 160 || vo2 / bsa < 95)) r.here.push('An assumed ' + fmt(vo2 / bsa, 0) + ' mL/min/m² is outside the 100–150 a resting adult usually has.');
      if (ctx.ppv && assumed) r.here.push('Sedated on full ventilatory support, resting VO2 is usually below the assumption.');
    }
    {
      const r = add('avd', { value: avd, need: avd === null ? need('hb', 'sao2', 'svo2') : [], err: blocked.fick ? 'The venous saturation is not below the arterial.' : '', worked: avd !== null ? '1.34 × ' + x.hb + ' × (' + x.sao2 + ' − ' + x.svo2 + ') ÷ 100 = ' + fmt(avd, 1) : '' });
      if (avd !== null) {
        r.here.push(opt.venous === 'cv' ? 'The venous sample is central (ScvO2): expect it to sit about 5 points above the mixed venous value, more in shock.' : 'The venous sample is mixed venous (SvO2) from the PA catheter: the right sample for a Fick.');
        if (has('pao2') && x.pao2 >= 150) r.here.push('With dissolved oxygen at a PaO2 of ' + x.pao2 + ' the difference is ' + fmt(avd + 0.003 * Math.max(0, x.pao2 - po2At(x.svo2)), 1) + ' mL/dL.');
        if (paOk && opt.venous === 'cv') r.here.push('PA pressures are typed, so a PA catheter is in: the distal port gives a true mixed venous sample.');
      }
    }
    {
      const v = gap !== null ? gap / x.sao2 * 100 : null;
      const r = add('o2er', { value: v, need: v === null ? need('sao2', 'svo2') : [], err: blocked.fick ? 'The venous saturation is not below the arterial.' : '', worked: v !== null ? '(' + x.sao2 + ' − ' + x.svo2 + ') ÷ ' + x.sao2 + ' = ' + fmt(v, 0) + '%' : '' });
      if (v !== null && opt.venous === 'cv') r.here.push('With a mixed venous saturation 5 points lower it would be ' + fmt((gap + 5) / x.sao2 * 100, 0) + '%.');
    }
    add('cao2', { value: cao2, need: cao2 === null ? need('hb', 'sao2') : [], formula: has('pao2') ? '1.34 × Hb × SaO2 ÷ 100 + 0.003 × PaO2' : DEF.cao2.formula, worked: cao2 !== null ? '1.34 × ' + x.hb + ' × ' + x.sao2 + ' ÷ 100' + (has('pao2') ? ' + 0.003 × ' + x.pao2 : '') + ' = ' + fmt(cao2, 1) : '' });
    {
      const v = co !== null && cao2 !== null ? co * cao2 * 10 : null;
      add('do2', { value: v, need: v === null ? coNeed.concat(need('hb', 'sao2')).filter((q, i, a) => a.indexOf(q) === i) : [], sub: v !== null && bsa ? fmt(v / bsa, 0) + ' mL/min/m² (normal 500–600)' : '', worked: v !== null ? fmt(co, 1) + ' × ' + fmt(cao2, 1) + ' × 10 = ' + fmt(v, 0) : '' });
    }
    /* per beat and work */
    {
      const r = add('sv', { value: sv, need: sv === null ? coNeed.concat(need('hr')).filter((q, i, a) => a.indexOf(q) === i) : [], worked: sv !== null ? fmt(co, 1) + ' × 1000 ÷ ' + x.hr + ' = ' + fmt(sv, 0) : '' });
      if (sv !== null && ctx.af) r.here.push('In an irregular rhythm this is an average no beat actually has.');
    }
    add('svi', { value: svi, need: svi === null ? coNeed.concat(need('hr', 'wt', 'ht')).filter((q, i, a) => a.indexOf(q) === i) : [], worked: svi !== null ? fmt(sv, 0) + ' ÷ ' + fmt(bsa, 2) + ' = ' + fmt(svi, 0) : '' });
    {
      const ok = co !== null && has('map', 'cvp') && !blocked.svr, v = ok ? (x.map - x.cvp) * co / 451 : null;
      const r = add('cpoRap', { value: v, need: ok ? [] : coNeed.concat(need('map', 'cvp')).filter((q, i, a) => a.indexOf(q) === i), worked: v !== null ? '(' + fmt(x.map, 0) + ' − ' + x.cvp + ') × ' + fmt(co, 1) + ' ÷ 451 = ' + fmt(v, 2) : '' });
      if (v !== null) { r.st = 'info'; r.here.push('The common form gives ' + fmt(x.map * co / 451, 2) + ' W: the CVP of ' + x.cvp + ' accounts for ' + pct(x.cvp / x.map) + '% of it.'); }
    }
    {
      const v = ci !== null && has('map') ? x.map * ci / 451 : null;
      add('cpi', { value: v, need: v === null ? coNeed.concat(need('map', 'wt', 'ht')).filter((q, i, a) => a.indexOf(q) === i) : [], worked: v !== null ? fmt(x.map, 0) + ' × ' + fmt(ci, 1) + ' ÷ 451 = ' + fmt(v, 2) : '' });
    }
    {
      const over = has('map', 'pcwp') && x.pcwp >= x.map, v = svi !== null && has('map', 'pcwp') && !over ? svi * (x.map - x.pcwp) * 0.0136 : null;
      add('lvswi', { value: v, need: v === null && !over ? coNeed.concat(need('hr', 'wt', 'ht', 'map', 'pcwp')).filter((q, i, a) => a.indexOf(q) === i) : [], err: over ? 'The wedge is not below the MAP.' : '', worked: v !== null ? fmt(svi, 0) + ' × (' + fmt(x.map, 0) + ' − ' + x.pcwp + ') × 0.0136 = ' + fmt(v, 0) : '' });
    }
    {
      const v = svi !== null && mpap !== null && has('cvp') && mpap > x.cvp ? svi * (mpap - x.cvp) * 0.0136 : null;
      add('rvswi', { value: v, need: v === null ? coNeed.concat(need('hr', 'wt', 'ht', 'cvp')).concat(mpap === null && !blocked.pa ? need('pas', 'pad') : []).filter((q, i, a) => a.indexOf(q) === i) : [], worked: v !== null ? fmt(svi, 0) + ' × (' + fmt(mpap, 0) + ' − ' + x.cvp + ') × 0.0136 = ' + fmt(v, 1) : '' });
    }
    /* the lung */
    {
      const r = add('mpap', { value: mpap, need: mpap === null && !blocked.pa ? need('pas', 'pad') : [], err: blocked.pa && mpap === null ? 'The PA diastolic is not below the systolic.' : '', formula: has('mpapm') ? 'measured, as typed' : DEF.mpap.formula,
        worked: mpap !== null && !has('mpapm') ? '(' + x.pas + ' + 2 × ' + x.pad + ') ÷ 3 = ' + fmt(mpap, 0) : '' });
      if (has('mpapm')) { r.limit = 'A typed, measured mean: check it was read at end-expiration from a trace that neither whips nor is damped.'; if (mpapCalc !== null) r.alts.push({ label: 'Worked out from ' + x.pas + '/' + x.pad, text: fmt(mpapCalc, 0) + ' mm Hg' }); }
      else if (mpap !== null) r.alts.push({ label: 'From the systolic alone (0.61 × PAs + 2)', text: fmt(0.61 * x.pas + 2, 0) + ' mm Hg' });
      if (mpap !== null && ctx.ppv) r.here.push('Ventilated: read at end-expiration; part of this pressure is PEEP.');
      if (mpap !== null && has('hr') && x.hr > 110 && !has('mpapm')) r.here.push('At ' + x.hr + '/min diastole is short and the one-third rule under-reads the mean.');
    }
    add('tpg', { value: tpg !== null && tpg > 0 ? tpg : null, need: tpg === null ? (mpap === null && !blocked.pa ? need('pas', 'pad') : []).concat(need('pcwp')) : [], err: tpg !== null && tpg <= 0 ? 'The wedge is not below the mean PA pressure.' : (blocked.pa && mpap === null ? 'The PA diastolic is not below the systolic.' : ''), worked: tpg !== null && tpg > 0 ? fmt(mpap, 0) + ' − ' + x.pcwp + ' = ' + fmt(tpg, 0) : '' });
    add('dpg', { value: dpg, need: dpg === null && !blocked.pa ? need('pad', 'pcwp') : [], err: blocked.pa ? 'The PA diastolic is not below the systolic.' : '', worked: dpg !== null ? x.pad + ' − ' + x.pcwp + ' = ' + fmt(dpg, 0) : '' });
    {
      const v = sv !== null && paOk ? sv / (x.pas - x.pad) : null;
      add('pac', { value: v, need: v === null ? coNeed.concat(need('hr')).concat(blocked.pa ? [] : need('pas', 'pad')).filter((q, i, a) => a.indexOf(q) === i) : [], worked: v !== null ? fmt(sv, 0) + ' ÷ (' + x.pas + ' − ' + x.pad + ') = ' + fmt(v, 1) : '' });
    }
    /* balance and pulse */
    {
      const ok = has('cvp', 'pcwp') && x.cvp > 0, v = ok ? x.cvp / x.pcwp : null;
      add('rapcwp', { value: v, need: v === null ? need('cvp', 'pcwp') : [], err: has('cvp', 'pcwp') && x.cvp <= 0 ? 'A CVP of zero or below gives no ratio.' : '', worked: v !== null ? x.cvp + ' ÷ ' + x.pcwp + ' = ' + fmt(v, 2) : '' });
    }
    {
      const ok = ci !== null && has('map', 'cvp') && !blocked.svr, v = ok ? (x.map - x.cvp) / ci * 80 : null;
      add('svri', { value: v, need: ok ? [] : coNeed.concat(need('wt', 'ht', 'map', 'cvp')).filter((q, i, a) => a.indexOf(q) === i), worked: v !== null ? '(' + fmt(x.map, 0) + ' − ' + x.cvp + ') ÷ ' + fmt(ci, 1) + ' × 80 = ' + fmt(v, 0) : '' });
    }
    {
      const ok = has('sbp', 'dbp') && !blocked.bp, v = ok ? (x.sbp - x.dbp) / x.sbp * 100 : null;
      add('ppp', { value: v, need: ok ? [] : (blocked.bp ? [] : need('sbp', 'dbp')), err: blocked.bp ? 'The diastolic is not below the systolic.' : '', sub: v !== null ? 'pulse pressure ' + fmt(x.sbp - x.dbp, 0) + ' mm Hg' : '', worked: v !== null ? '(' + x.sbp + ' − ' + x.dbp + ') ÷ ' + x.sbp + ' = ' + fmt(v, 0) + '%' : '' });
    }
    {
      const ok = has('sbp', 'dbp', 'pcwp') && !blocked.bp, v = ok ? (x.sbp - x.dbp) / x.pcwp : null;
      add('api', { value: v, need: ok ? [] : (blocked.bp ? [] : need('sbp', 'dbp')).concat(need('pcwp')), err: blocked.bp ? 'The diastolic is not below the systolic.' : '', worked: v !== null ? '(' + x.sbp + ' − ' + x.dbp + ') ÷ ' + x.pcwp + ' = ' + fmt(v, 2) : '' });
    }
    rows.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
    const by = {}; rows.forEach(r => { by[r.id] = r; });

    /* ---- the reading ---- */
    const lines = [];
    const ciR = by.ci, shown = (id) => by[id].value !== null ? +by[id].value.toFixed(DEF[id].dp) : null;
    const ciV = shown('ci');
    let perf = null;
    if (ciV !== null) {
      const cross = ciR.range && ciR.range.lo < 2.2 && ciR.range.hi >= 2.2;
      perf = ciV < 2.2 ? 'low' : 'ok';
      lines.push({ k: 'perf', sev: cross ? 1 : ciV < 2.2 ? 2 : 0, t: 'Cardiac index ' + ciR.text + (ciR.range ? ' (' + ciR.range.text + ' with the VO2 25% either way)' : '') + ': ' + (cross ? 'the estimate cannot place this patient on either side of 2.2.' : ciV < 1.8 ? 'low, under 1.8.' : ciV < 2.2 ? 'low, under 2.2.' : ciV > 4 ? 'high.' : 'not low by this ' + (useTd ? 'measurement' : 'estimate') + '.'), cross: !!cross });
      if (cross) perf = 'unsure';
    }
    let cong = null;
    if (has('pcwp') || has('cvp')) {
      const left = has('pcwp') ? x.pcwp > 18 : null, right = has('cvp') ? x.cvp > 12 : null;
      cong = left && right ? 'both' : left ? 'left' : right ? 'right' : (left === false && right === false ? 'none' : null);
      const nums = (has('pcwp') ? 'PCWP ' + x.pcwp : '') + (has('pcwp') && has('cvp') ? ', ' : '') + (has('cvp') ? 'CVP ' + x.cvp : '');
      if (cong) lines.push({ k: 'cong', sev: cong === 'none' ? 0 : cong === 'both' ? 2 : 1, t: nums + ': ' + { both: 'congested on both sides (PCWP above 18 and CVP above 12).', left: 'left-sided congestion (PCWP above 18)' + (right === false ? ', the right side not congested.' : '.'), right: 'right-sided congestion (CVP above 12)' + (left === false ? ' with a wedge that is not high: a right-ventricular or pre-capillary pattern.' : '.'), none: 'neither side congested by the usual lines (18 and 12).' }[cong] });
    }
    let forrester = null;
    if (ciV !== null && has('pcwp')) {
      const wet = x.pcwp > 18, cold = ciV < 2.2;
      forrester = cold ? (wet ? 'IV' : 'III') : (wet ? 'II' : 'I');
      lines.push({ k: 'forrester', sev: cold ? 2 : wet ? 1 : 0, t: 'Forrester ' + forrester + ': ' + (cold ? 'cold' : 'warm') + ' and ' + (wet ? 'wet' : 'dry') + (perf === 'unsure' ? ', as far as the estimated index can be trusted.' : '.') });
    }
    let ph = null;
    if (mpap !== null && has('pcwp') && tpg !== null && tpg > 0) {
      const m = +mpap.toFixed(0), pv = shown('pvr');
      if (m <= 20) ph = 'none';
      else if (pv === null) ph = x.pcwp > 15 ? 'post?' : 'pre?';
      else if (x.pcwp <= 15) ph = pv > 2 ? 'pre' : 'unclassified';
      else ph = pv > 2 ? 'cpc' : 'ipc';
      const say = { none: 'no pulmonary hypertension by the mean pressure.', 'post?': 'a raised mean with a wedge above 15; the PVR needs an output.', 'pre?': 'a raised mean with a wedge of 15 or less; the PVR needs an output.', pre: 'the numbers of pre-capillary pulmonary hypertension.', unclassified: 'a raised mean with a wedge of 15 or less and a PVR of 2 or less: unclassified (a high flow?).', cpc: 'the numbers of combined post- and pre-capillary pulmonary hypertension.', ipc: 'the numbers of isolated post-capillary pulmonary hypertension.' }[ph];
      lines.push({ k: 'ph', sev: ph === 'none' ? 0 : 1, t: 'Mean PA ' + m + ', PCWP ' + x.pcwp + (pv !== null ? ', PVR ' + by.pvr.text + ' WU' : '') + ': ' + say + (ph !== 'none' ? ' The 2022 ESC/ERS definitions are for a resting catheterisation in a stable patient.' : '') });
    }
    const papiV = shown('papi'), ratioV = shown('rapcwp');
    if (papiV !== null && has('cvp') && x.cvp >= 8 && (papiV < 1.85 || (ratioV !== null && ratioV > 0.63))) lines.push({ k: 'rv', sev: papiV < 0.9 || (ratioV !== null && ratioV > 0.86) ? 2 : 1, t: 'PAPi ' + by.papi.text + (ratioV !== null ? ', CVP:PCWP ' + by.rapcwp.text : '') + ' at a CVP of ' + x.cvp + ': the right ventricle is making little pulse for its filling pressure.' });
    const cpoV = shown('cpo');
    if (cpoV !== null && cpoV < 0.6) lines.push({ k: 'cpo', sev: 2, t: 'Cardiac power ' + by.cpo.text + ' W: under 0.6' + (by.cpoRap.value !== null && has('cvp') && x.cvp >= 8 ? ' (' + by.cpoRap.text + ' with the CVP subtracted).' : '.') });
    const svrV = shown('svr');
    if (svrV !== null && (svrV < 800 || svrV > 1200)) lines.push({ k: 'svr', sev: svrV > 1600 ? 2 : 1, t: 'SVR ' + by.svr.text + ': ' + (svrV < 800 ? 'low. Vasodilated, or an output that is overestimated.' : svrV > 1600 ? 'high. Vasoconstricted, usually in compensation for a low output.' : 'above the normal range.') });
    const o2V = shown('o2er');
    if (o2V !== null && o2V > 30) lines.push({ k: 'o2er', sev: o2V > 50 ? 2 : 1, t: 'Extraction ' + by.o2er.text + '%: ' + (o2V > 50 ? 'near the limit of what the tissues can take.' : 'the tissues are taking more than usual from each pass.') });
    const worst = checks.filter(c => c.level === 'bad').length;
    const filled = FIELDS.filter(F => F.set === 'chart' && f[F.k].state !== 'empty').length;
    const read = { perf: perf, cong: cong, forrester: forrester, ph: ph, lines: lines, method: coWord, complete: FIELDS.filter(F => F.set === 'chart').every(F => x[F.k] !== undefined) && worst === 0, filled: filled };
    return { opt: opt, ctx: ctx, fields: f, x: x, checks: checks, rows: rows, by: by, read: read, bmi: bmi, mapCalc: mapCalc, vo2s: vo2s, coFick: coFick, useTd: useTd, assumed: assumed };
  }

  /* a line for the note, in the chart's order, with the method stated */
  function note(res) {
    const b = res.by, v = (id) => b[id].value !== null ? b[id].text : '—', x = res.x;
    const method = res.useTd ? 'thermodilution CO' : (res.assumed ? 'estimated Fick, VO2 ' + (b.vo2.value !== null ? b.vo2.text + ' mL/min by ' : 'by ') + ({ kg: '3.5 mL/kg/min', bsa: '125 mL/min/m²', lafarge: 'LaFarge' }[res.opt.vo2]) : 'direct Fick, measured VO2 ' + b.vo2.text + ' mL/min');
    const venous = res.useTd ? '' : '; venous sample ' + (res.opt.venous === 'cv' ? 'ScvO2' : 'SvO2');
    let s = 'Hemos (' + method + venous + '): CO ' + v('co') + ' L/min, CI ' + v('ci') + ' L/min/m² (BSA ' + v('bsa') + ' m²), SVR ' + v('svr') + ' dyn·s/cm⁵, PAPi ' + v('papi') + ', CPO ' + v('cpo') + ' W, PVR ' + v('pvr') + ' WU.';
    const extra = [];
    if (b.mpap.value !== null) extra.push('mPAP ' + v('mpap') + (x.mpapm !== undefined ? '' : ' (calc)'));
    if (b.tpg.value !== null) extra.push('TPG ' + v('tpg'));
    if (b.dpg.value !== null) extra.push('DPG ' + v('dpg'));
    if (b.rapcwp.value !== null) extra.push('CVP:PCWP ' + v('rapcwp'));
    if (b.sv.value !== null) extra.push('SV ' + v('sv') + ' mL');
    if (b.o2er.value !== null) extra.push('O2ER ' + v('o2er') + '%');
    if (extra.length) s += ' ' + extra.join(', ') + '.';
    if (b.ci.range) s += ' CI ' + b.ci.range.text + ' if the VO2 is 25% off.';
    const bad = res.checks.filter(c => c.level === 'bad');
    if (bad.length) s += ' Entries to check: ' + bad.length + '.';
    return s;
  }

  /* two sets on one patient: what moved, and whether the method can resolve it */
  function diff(prev, now) {
    const out = {};
    now.rows.forEach(r => {
      const p = prev.by[r.id];
      if (!p || p.value === null || r.value === null) return;
      const d = r.value - p.value, rel = p.value !== 0 ? d / Math.abs(p.value) : 0;
      out[r.id] = { from: p.text, to: r.text, d: d, pct: Math.round(rel * 100), noise: !!ON_CO[r.id] && Math.abs(rel) < 0.15, same: p.text === r.text };
    });
    return out;
  }

  /* a patient from the Swan–Ganz lab as the sheet would be filled in for them, with what the model knows and the sheet does not */
  function fromLab(o) {
    const ht = 175, wt = Math.round(o.p.bsa * o.p.bsa * 3600 / ht);
    return { raw: { wt: String(wt), ht: String(ht), hb: String(Math.round(o.p.hb * 10) / 10), sao2: String(Math.round(o.p.sao2 * 100)), svo2: String(Math.round(o.svo2 * 100)), cvp: String(Math.max(1, Math.round(o.rap))), map: String(Math.round(o.map)),
      pas: String(Math.round(o.pas)), pad: String(Math.min(Math.round(o.pas) - 1, Math.round(o.pad))), pcwp: String(Math.max(1, Math.round(o.paop))), hr: String(Math.round(o.hr)), sbp: String(Math.round(o.sbp)), dbp: String(Math.round(o.dbp)) },
      truth: { co: o.co, vo2: o.p.vo2, pump: (o.p.ecmo || 0) + (o.p.impella || 0) }, ctx: { ecmo: o.p.ecmo > 0, mcs: o.p.impella > 0, ppv: o.p.vent === 'ppv' && o.p.peep > 0, tr: o.p.tr >= 3 } };
  }

  /* the examples: lab patients, several chosen because the sheet's assumptions do not hold for them */
  const EXAMPLES = [
    { id: 'normal', title: 'Normal', preset: 'normal', say: 'A resting adult of average size: the assumption is close and the sheet lands near the truth.' },
    { id: 'lv', title: 'Cardiogenic shock, LV', preset: 'lv', say: 'Cold and wet. The patient is awake and working to breathe; the assumed oxygen consumption is about right.' },
    { id: 'lvsed', title: 'The same shock, sedated and paralysed', preset: 'lv', p: { vo2: 185 }, ctx: { ppv: true, pressor: true }, say: 'Sedation and paralysis have cut the oxygen consumption by a quarter. The sheet still assumes 3.5 mL/kg/min.' },
    { id: 'lvcv', title: 'The same shock, sample from the central line', preset: 'lv', cv: 7, say: 'The venous sample comes from the central line, which in shock reads above the mixed venous value.' },
    { id: 'obese', title: 'Cardiogenic shock at 129 kg', preset: 'lv', p: { bsa: 2.5, vo2: 300 }, say: 'The weight is doing the work: 3.5 mL/kg/min of 129 kg assumes far more oxygen than this patient uses.' },
    { id: 'sepsis', title: 'Septic shock, febrile', preset: 'sepsis', p: { vo2: 340 }, ctx: { pressor: true }, say: 'Fever and sepsis have raised the oxygen consumption above the assumption, so the sheet under-reads a high output.' },
    { id: 'rvmi', title: 'RV infarction', preset: 'rvmi', say: 'The right atrial pressure rivals the wedge and PAPi collapses.' },
    { id: 'pah', title: 'Decompensated PAH', preset: 'pah', say: 'A very high PA pressure with a normal wedge: PVR and its error band both matter here.' },
    { id: 'hfpef', title: 'HFpEF with post-capillary PH', preset: 'hfpef', say: 'A high wedge with a preserved output: the PA pressure follows the wedge.' },
    { id: 'ecmodist', title: 'On VA ECMO', preset: 'ecmodist', say: 'The circuit carries most of the flow. The sheet’s arithmetic still runs, and most of it no longer means what the labels say.' }
  ];
  function example(id) {
    const E = EXAMPLES.filter(q => q.id === id)[0]; if (!E || !HEMO) return null;
    const o = HEMO.run(Object.assign({}, HEMO.preset(E.preset).p, E.p || {})), L = fromLab(o);
    if (E.cv) L.raw.svo2 = String(Math.round(o.svo2 * 100) + E.cv);
    L.ctx = Object.assign({}, L.ctx, E.ctx || {}); L.venous = E.cv ? 'cv' : 'mv'; L.title = E.title; L.say = E.say; L.id = E.id; L.truth.svo2 = Math.round(o.svo2 * 100); L.truth.bsa = o.p.bsa;
    return L;
  }

  /* ================================================================== the pages ================================================================== */
  const SOURCES = [
    'Opotowsky AR, et al. Thermodilution vs estimated Fick cardiac output measurement in clinical practice: an analysis of mortality from the Veterans Affairs Clinical Assessment, Reporting, and Tracking (VA CART) program and Vanderbilt University. JAMA Cardiol 2017;2:1090–9.',
    'Narang N, et al. Inaccuracy of estimated resting oxygen uptake in the clinical setting. Circulation 2014;129:203–10.',
    'Grafton G, et al. Resting oxygen consumption and heart failure: importance of measurement for determination of cardiac output using the Fick principle. J Card Fail 2019.',
    'Byrne NM, et al. Metabolic equivalent: one size does not fit all. J Appl Physiol 2005;99:1112–9.',
    'LaFarge CG, Miettinen OS. The estimation of oxygen consumption. Cardiovasc Res 1970;4:23–30. Dehmer GJ, Firth BG, Hillis LD. Oxygen consumption in adult patients during cardiac catheterization. Clin Cardiol 1982;5:436–40.',
    'Chawla LS, et al. Lack of equivalence between central and mixed venous oxygen saturation. Chest 2004;126:1891–6. Ho KM, et al. A comparison of central and mixed venous oxygen saturation in circulatory failure. J Cardiothorac Vasc Anesth 2010. van Beest PA, et al. No agreement of mixed venous and central venous saturation in sepsis, independent of sepsis origin. Crit Care 2010;14:R219.',
    'Mosteller RD. Simplified calculation of body-surface area. N Engl J Med 1987;317:1098.',
    'Fincke R, et al. Cardiac power is the strongest hemodynamic correlate of mortality in cardiogenic shock (SHOCK trial registry). J Am Coll Cardiol 2004;44:340–8. Lim HS. Cardiac power output revisited. Circ Heart Fail 2020;13:e007393. Improved prognostic performance of cardiac power output with right atrial pressure: a subanalysis of the ESCAPE trial. J Card Fail 2022;28:866–9. Baldetti L, et al. Prognostic value of right atrial pressure-corrected cardiac power index in cardiogenic shock. ESC Heart Fail 2022;9:3920–30.',
    'Lim HS, Gustafsson F. Pulmonary artery pulsatility index: physiological basis and clinical application. Eur J Heart Fail 2020;22:32–8. Korabathina R, et al. Catheter Cardiovasc Interv 2012;80:593–600. Morine KJ, et al. J Card Fail 2016;22:110–6. Kormos RL, et al. J Thorac Cardiovasc Surg 2010;139:1316–24.',
    'Humbert M, et al. 2022 ESC/ERS guidelines for the diagnosis and treatment of pulmonary hypertension. Eur Heart J 2022;43:3618–731. Dupont M, et al. Prognostic role of pulmonary arterial capacitance in advanced heart failure. Circ Heart Fail 2012;5:778–85.',
    'Belkin MN, et al. Aortic pulsatility index: a novel hemodynamic variable for evaluation of decompensated heart failure. J Card Fail 2021;27:1045–52; and ESC Heart Fail 2021;8:1522–30. Stevenson LW, Perloff JK. The limited reliability of physical signs for estimating hemodynamics in chronic heart failure. JAMA 1989;261:884–8.',
    'Forrester JS, et al. Medical therapy of acute myocardial infarction by application of hemodynamic subsets. N Engl J Med 1976;295:1356–62, 1404–13. Hayes MA, et al. N Engl J Med 1994;330:1717–22. Gattinoni L, et al. N Engl J Med 1995;333:1025–32.',
    'Edwards Lifesciences. Normal hemodynamic parameters and laboratory values (quick reference card).'
  ];
  const topics = {};
  topics.hemo_calc = { title: 'The hemos calculator', kicker: 'The chart’s ten numbers in, its seven results out, the rest of what a catheter allows, and what each one cannot tell you', blocks: [
    { p: 'Type the numbers in the order the chart asks for them. The first seven results use the chart’s own formulas, so the two agree to the decimal: an estimated Fick output with an oxygen consumption of 3.5 mL/kg/min, Mosteller’s body surface area, the index, SVR in dyn·s/cm⁵, PAPi, cardiac power as MAP × CO / 451, and PVR in Wood units from a mean PA pressure of (systolic + 2 × diastolic) / 3. Below them are the numbers the same ten inputs already hold, and a few more that open with the heart rate and a blood pressure.' },
    { widget: 'hemocalc' },
    { h: 'Reading it', ul: [
      'Every result shows where it sits against its normal range, and one line on what it cannot tell you. Open a row for the arithmetic with the patient’s numbers in it, the full list of limits, and what those limits mean for the numbers just typed.',
      'The shaded band on a bar is where the result would lie if the true oxygen consumption were 25% below or above the assumed one. That is how far measured and assumed VO2 commonly differ; it is not a confidence interval.',
      'An entry that cannot be right is reported as an entry to check and is left out of the arithmetic. A wedge above the mean PA pressure, a CVP of zero under a PAPi, or a venous saturation at or above the arterial are named for what they are rather than divided through.',
      '“Keep as the earlier set” holds the current results so the next set shows what moved. As a rule of thumb, a change in output under about 15% is within what neither Fick nor thermodilution can resolve, and two estimated-Fick values compare fairly only if the oxygen consumption did not change between them (sedation, fever, extubation and shivering all change it).',
      'The example patients come from the Swan–Ganz lab. The model knows their real output and oxygen consumption, so the page can show how far the sheet’s estimate lands from the truth, and why.'] },
    { go: [['hemo_limits', 'What each number cannot tell you', 'every limit on one page'], ['hemo_lab', 'The Swan–Ganz lab', 'send any lab patient to this sheet'], ['hemo_numbers', 'The derived numbers', 'thresholds and what each is for']] },
    { note: 'A teaching calculator and a check on arithmetic, not a medical device. Nothing typed here is stored or sent anywhere, and there is deliberately nowhere to type a name or a bed. The limits are general statements about the methods; the patient, the traces and your unit’s practice decide.' },
    { src: SOURCES }
  ] };
  const limRows = (ids) => ids.map(id => [DEF[id].name + ' (' + DEF[id].abbr + ')', DEF[id].formula, normalFull(id) || '—', LIM[id].head]);
  topics.hemo_limits = { title: 'What each number cannot tell you', kicker: 'The limits of every calculation on the hemos sheet, in one place', blocks: [
    { p: 'A hemos sheet turns ten measurements into two dozen results, and the results look more exact than the measurements were. Three things account for most of the error. The oxygen consumption is assumed, and the assumption is commonly a quarter out. The Fick divides by the difference of two saturations, so a point or two matters, and a central venous sample is not a mixed venous one. And the pulmonary numbers hang on a wedge pressure read to within 2–3 mm Hg. The tables give each number’s formula, normal range and its main limit; the lists below give the rest. The calculator shows the same text beside the patient’s own numbers.' },
    { h: 'The chart’s seven', table: { head: ['Number', 'Formula', 'Normal', 'Main limit'], rows: limRows(['co', 'ci', 'bsa', 'svr', 'papi', 'cpo', 'pvr']) } },
    { h: 'What the Fick is made of', table: { head: ['Number', 'Formula', 'Normal', 'Main limit'], rows: limRows(['vo2', 'avd', 'o2er', 'cao2', 'do2']) } },
    { h: 'Per beat, and the work', table: { head: ['Number', 'Formula', 'Normal', 'Main limit'], rows: limRows(['sv', 'svi', 'cpoRap', 'cpi', 'lvswi', 'rvswi']) } },
    { h: 'The pulmonary circuit, the balance of the two sides, and the pulse', table: { head: ['Number', 'Formula', 'Normal', 'Main limit'], rows: limRows(['mpap', 'tpg', 'dpg', 'pac', 'rapcwp', 'svri', 'ppp', 'api']) } }
  ].concat(['co', 'vo2', 'avd', 'ci', 'bsa', 'svr', 'papi', 'cpo', 'pvr', 'mpap', 'dpg', 'rapcwp', 'do2'].map(id => ({ h: DEF[id].name, ul: [LIM[id].head].concat(LIM[id].list) }))).concat([
    { h: 'Before the arithmetic', ul: [
      'Level and zero every transducer at the phlebostatic axis, and do a square-wave test on the arterial and PA lines. The waveform pages cover what whip and damping do to systolic and diastolic values.',
      'Read every pressure at end-expiration, from the trace rather than the digital display when the breathing swings are large.',
      'Take the pressures, the samples, the heart rate and the haemoglobin within the same few minutes, in a steady state.',
      'Send both saturations for co-oximetry. Check the haemoglobin, weight and height are the current, measured ones and in the units the sheet expects.',
      'When a result will decide something (an inotrope, a device, a listing), measure rather than assume: thermodilution in triplicate, a measured VO2, a mixed venous sample from the distal port.'] },
    { go: [['hemo_calc', 'Open the calculator', 'the same limits beside your patient’s numbers'], ['mon_art', 'The arterial line', 'what whip and damping do to the pressures that go in']] },
    { src: SOURCES }
  ]) };
  if (HEMO) {
    HEMO.topics.hemo_calc = topics.hemo_calc; HEMO.topics.hemo_limits = topics.hemo_limits;
    const g = HEMO.groups.filter(q => q.ids.indexOf('hemo_numbers') >= 0)[0];
    if (g && g.ids.indexOf('hemo_calc') < 0) g.ids.splice(g.ids.indexOf('hemo_numbers') + 1, 0, 'hemo_calc', 'hemo_limits');
  }

  root.PFT_HEMOCALC = { FIELDS: FIELDS, FK: FK, DEF: DEF, LIM: LIM, GROUPS: GROUPS, ORDER: ORDER, ON_CO: ON_CO, VO2_METHODS: VO2_METHODS, CONTEXT: CONTEXT, SOURCES: SOURCES, topics: topics,
    check: check, hint: hint, normalFull: normalFull, compute: compute, note: note, diff: diff, fromLab: fromLab, EXAMPLES: EXAMPLES, example: example, fmt: fmt, po2At: po2At };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PFT_HEMOCALC;
})(typeof window !== 'undefined' ? window : globalThis);
