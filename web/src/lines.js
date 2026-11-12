/* Lines and waveforms (v8.8): the patterns worth recognising on the arterial, venous, pulmonary artery and wedge traces; the cases of the
   troubleshooting lab; the scenes of the drawn vascular scanner; and the topics (reading the traces, real recordings, fixing a line, ultrasound
   for access, putting in an arterial line, putting in a central line). The waveforms come from waves.js. Block types as education.js. */
(function (root) {
  const W = root.PFT_WAVES || (typeof require === 'function' ? require('./waves.js') : null);

  /* ================================================================ the arterial patterns */
  /* cfg: what waves.series draws; look: what to see; means: why; act: what to do with it */
  const ART = [
    { id: 'normal', group: 'The normal trace', label: 'Normal radial trace', cfg: { hr: 72, sbp: 122, dbp: 70 },
      look: 'A steep upstroke that starts 160–180 ms after the R wave, a single systolic peak, a notch a third of the way down, a small dicrotic wave, then a smooth run-off to the next foot.',
      means: 'The upstroke is ejection (its slope follows stroke volume and, loosely, contractility). The sharp incisura of aortic valve closure is only seen at the aortic root and has faded 35–40 cm down the aorta; the notch in a peripheral artery is a reflected wave that arrives at about the same time. The run-off is the vessels emptying through the resistance: steep when the resistance is low.',
      act: 'Read the mean off the monitor (it is the area under the curve and survives damping); read the systolic and the diastolic only after a fast-flush test says the system is faithful.' },
    { id: 'sites', group: 'The normal trace', label: 'The same beat at five sites', cfg: { hr: 72, sbp: 122, dbp: 70 }, sites: true,
      look: 'From the aortic root to the foot the upstroke gets steeper, the systolic peak higher and narrower, the notch later and lower, and the diastolic a little lower. The mean barely moves (it falls 1–2 mm Hg).',
      means: 'Distal pulse amplification: the forward wave meets its own reflections sooner in a small, stiff artery. A dorsalis pedis systolic can sit 10–20 mm Hg above the aortic one in a healthy young adult.',
      act: 'Compare sites by the mean. Titrate vasopressors to the mean. A systolic target (dissection, stroke) set from a foot or radial line overstates the central systolic.' },
    { id: 'stiff', group: 'What the vessels are doing', label: 'Stiff arteries: the late systolic peak', cfg: { hr: 68, sbp: 172, dbp: 76, shape: 'stiff' },
      look: 'A shoulder on the upstroke, then the peak late in systole; a high notch; a wide pulse pressure with a diastolic that is not low.',
      means: 'In a stiff aorta the reflected wave returns during systole instead of diastole and adds to the peak (augmentation). Age, hypertension, vasoconstrictors.',
      act: 'The systolic load on the ventricle is real. Nothing is wrong with the line: the flush test is normal.' },
    { id: 'vasodilated', group: 'What the vessels are doing', label: 'Vasodilated: the low notch', cfg: { hr: 112, sbp: 92, dbp: 40, shape: 'vasodilated' },
      look: 'A narrow systolic spike, a steep fall, a notch low on the downslope close to the diastolic pressure, and a prominent dicrotic wave after it.',
      means: 'Low systemic resistance: the vessels empty fast, so the pressure has already fallen a long way by the end of ejection. Septic shock, liver failure, anaphylaxis, vasodilator drugs, a spinal.',
      act: 'A low diastolic with a wide pulse pressure points at tone, not volume or pump: this patient needs a vasopressor. A diastolic below about 40–45 mm Hg also threatens coronary perfusion.' },
    { id: 'lowsv', group: 'What the heart is doing', label: 'Low stroke volume: the small, narrow pulse', cfg: { hr: 112, sbp: 84, dbp: 62, shape: 'lowsv' },
      look: 'A small pulse pressure (less than a quarter of the systolic), a slow upstroke, a narrow systolic wave, and a dicrotic wave that can be nearly as tall as the pulse itself.',
      means: 'Little is being ejected into a constricted tree: hypovolaemia, cardiogenic shock, tamponade, massive embolism, severe stenosis. The preserved diastolic is the vasoconstriction.',
      act: 'Pulse pressure is the stroke volume’s shadow. A narrow pulse pressure with cold limbs is a flow problem: look at the heart (echo) and the filling before adding a pressor.' },
    { id: 'as', group: 'What the heart is doing', label: 'Aortic stenosis: slow and late', cfg: { hr: 70, sbp: 104, dbp: 68, shape: 'as', lvetK: 1.15 },
      look: 'A slow upstroke with a shoulder (the anacrotic notch), a late, rounded peak, a small pulse pressure and a notch that is hard to find: pulsus parvus et tardus.',
      means: 'Ejection through a fixed obstruction is slow and prolonged. More obvious centrally; a stiff peripheral tree in the elderly can hide it at the radial artery.',
      act: 'Do not confuse it with an overdamped line: the flush test is normal and the ECG-to-peak time is long. This patient depends on diastolic pressure and sinus rhythm: avoid vasodilatation and tachycardia.' },
    { id: 'ar', group: 'What the heart is doing', label: 'Aortic regurgitation: bisferiens, wide and collapsing', cfg: { hr: 82, sbp: 162, dbp: 44, shape: 'ar' },
      look: 'A very fast upstroke, two systolic peaks with a dip between them (pulsus bisferiens), a wide pulse pressure, a low diastolic, and a run-off that collapses. The notch is low or absent.',
      means: 'A large stroke volume ejected fast, and a tree that empties backwards into the ventricle in diastole.',
      act: 'The low diastolic is the lesion, not a reason for a pressor by itself. Bradycardia lengthens diastole and worsens the leak. A balloon pump is contraindicated.' },
    { id: 'hocm', group: 'What the heart is doing', label: 'Obstructive cardiomyopathy: spike and dome', cfg: { hr: 72, sbp: 118, dbp: 66, shape: 'hocm' },
      look: 'A rapid early peak, a mid-systolic dip, then a second, lower dome. After an ectopic beat the pulse pressure falls instead of rising (Brockenbrough–Braunwald–Morrow).', alt: { label: 'With ectopics', cfg: { hr: 72, sbp: 118, dbp: 66, shape: 'hocm', rhythm: 'pvc', brock: 1 } },
      means: 'Early ejection is unobstructed; then the outflow tract narrows (systolic anterior motion) and flow drops in mid-systole. More contractility after the pause means more obstruction.',
      act: 'Inotropes, vasodilators and hypovolaemia all worsen it. Give volume, slow the heart, raise the afterload with phenylephrine or vasopressin.' },
    { id: 'alternans', group: 'What the heart is doing', label: 'Pulsus alternans', cfg: { hr: 104, sbp: 96, dbp: 64, shape: 'lowsv', alternans: 0.38 },
      look: 'A strong beat, a weak beat, a strong beat — at a perfectly regular rhythm. The ECG is the same every beat.',
      means: 'A failing left ventricle that cannot restore its calcium between beats: severe systolic dysfunction. (Electrical alternans with a swinging heart is tamponade, and the ECG changes.)',
      act: 'It is a sign of a ventricle at its limit. Check that the rhythm is truly regular (bigeminy looks similar: there the ECG alternates too).' },
    { id: 'paradoxus', group: 'What the breath is doing', label: 'Pulsus paradoxus (breathing spontaneously)', cfg: { hr: 112, sbp: 100, dbp: 70, shape: 'lowsv', vent: 'spont', rr: 22, paradox: 22, cvp: 'tamponade' },
      look: 'The systolic falls by more than 10 mm Hg in inspiration and returns in expiration; the pulse pressure narrows with it.',
      means: 'An exaggeration of the normal: in inspiration the right heart fills at the expense of the left. Tamponade (the septum is the only wall that can move), severe asthma or COPD (huge pleural swings), a large embolism, a tension pneumothorax, hypovolaemia.',
      act: 'Measure it on the trace: the highest systolic in expiration minus the lowest in inspiration. Above 10 mm Hg with a raised venous pressure and a quiet heart, echo now.' },
    { id: 'ppv', group: 'What the breath is doing', label: 'Respiratory variation on the ventilator', cfg: { hr: 104, sbp: 102, dbp: 58, vent: 'ppv', rr: 14, ppv: 22, cvp: 'hypovol' },
      look: 'On positive pressure the systolic and the pulse pressure rise in early inspiration and fall a few beats later (reverse pulsus paradoxus). Pulse-pressure variation = (PPmax − PPmin) / mean of the two, over one breath.',
      means: 'Each breath squeezes the venous return; if both ventricles are on the steep part of their function curves the stroke volume swings with it.',
      act: 'Above about 13% predicts a response to fluid; below about 9% predicts none; between is a grey zone. It only means that when the patient is passive on the ventilator, at a tidal volume of 8 mL/kg or more, in a regular rhythm, with a closed chest, no severe right heart failure and a compliance above 30. Otherwise use a tidal-volume challenge, an end-expiratory occlusion or a passive leg raise.' },
    { id: 'af', group: 'What the rhythm is doing', label: 'Atrial fibrillation', cfg: { hr: 108, sbp: 114, dbp: 66, rhythm: 'af', cvp: 'af' },
      look: 'Every beat a different height: a long pause is followed by a big pulse, a short one by a small pulse or none (a pulse deficit).',
      means: 'Filling time and restitution change beat to beat. The variation is the rhythm, not the breath.',
      act: 'Pulse-pressure variation and stroke-volume variation are uninterpretable. Average the pressure over 10–15 s. Count the mechanical rate from the pressure trace, not the ECG.' },
    { id: 'pvc', group: 'What the rhythm is doing', label: 'Ventricular ectopics', cfg: { hr: 72, sbp: 124, dbp: 70, rhythm: 'pvc', cvp: 'pvc' },
      look: 'A wide early complex with a tiny pulse or none, a pause, then a beat larger than its neighbours (post-ectopic potentiation).',
      means: 'The ectopic beat ejects an unfilled ventricle; the beat after the pause is both better filled and more forceful.',
      act: 'In bigeminy the monitor may count half the heart rate from the pressure: the perfusing rate is the pulse rate. If the beat after the pause is smaller, think of outflow obstruction.' },
    { id: 'iabp', group: 'The balloon pump', label: 'Balloon pump, 1:2, timed correctly', cfg: { hr: 80, sbp: 104, dbp: 62, site: 'aorta', refSite: 'aorta', iabp: { ratio: 2 } },
      look: 'After the unassisted beat’s notch the pressure rises again to a peak above the systolic (diastolic augmentation); it then falls below the unassisted end-diastolic pressure just before the next upstroke, and the systole that follows is a little lower.',
      means: 'Inflation at aortic valve closure raises coronary and mean pressure; deflation just before ejection drops the afterload. Read in 1:2 so that assisted and unassisted beats sit side by side.',
      act: 'Check four things: inflation at the notch (a sharp V), augmentation at or above the unassisted systolic, an assisted end-diastolic below the unassisted one, an assisted systolic below the unassisted one.',
      variants: [
        { id: 'ok', label: 'Correct', iabp: { ratio: 2 } },
        { id: 'ei', label: 'Early inflation', iabp: { ratio: 2, inflate: -0.09 }, note: 'The balloon inflates before the notch, against the ejecting ventricle: the augmentation runs into the systolic peak. The aortic valve closes early; stroke volume falls, wall stress and regurgitation rise. Move inflation later.' },
        { id: 'li', label: 'Late inflation', iabp: { ratio: 2, inflate: 0.12, aug: 0.5 }, note: 'The notch and a dicrotic wave are visible before the augmentation, which is small: coronary perfusion is being left on the table. Move inflation earlier.' },
        { id: 'ed', label: 'Early deflation', iabp: { ratio: 2, deflate: -0.2 }, note: 'The pressure falls sharply after the augmentation and has time to climb back before systole: the assisted end-diastolic equals the unassisted, and the next systolic is not reduced. No afterload reduction. Move deflation later.' },
        { id: 'ld', label: 'Late deflation', iabp: { ratio: 2, deflate: 0.09 }, note: 'The balloon is still up when the ventricle starts to eject: the assisted end-diastolic is at or above the unassisted, and the next upstroke is slow. Afterload and oxygen demand rise — the most harmful of the four. Move deflation earlier.' }] },
    { id: 'under', group: 'What the line is doing', label: 'Underdamped (resonant) line', cfg: { hr: 84, sbp: 128, dbp: 70 }, sys: { fn: 5, zeta: 0.12 },
      look: 'A tall, peaked systolic with extra oscillations on the downslope, a deep, exaggerated notch, and a diastolic that undershoots. The flush test rings: three or more oscillations.',
      means: 'The system’s natural frequency is too close to the frequencies in the pulse and there is too little damping: long or compliant tubing, many stopcocks, small bubbles, a hyperdynamic circulation. The systolic is overstated by 10–30 mm Hg and the diastolic understated; the mean is right.',
      act: 'Use the mean. Shorten the tubing, remove extra stopcocks, flush out small bubbles. Do not treat the systolic.' },
    { id: 'over', group: 'What the line is doing', label: 'Overdamped line', cfg: { hr: 84, sbp: 128, dbp: 70 }, sys: { fn: 3.5, zeta: 1.4 },
      look: 'A slurred upstroke, a rounded top, no notch, a narrow pulse pressure. The flush test returns slowly with no oscillation.',
      means: 'Energy is being lost on the way: a bubble, a clot at the tip, a kink, a soft pressure bag, a loose connection, a catheter against the wall. The systolic is understated and the diastolic overstated; the mean is close to right until the line is nearly blocked.',
      act: 'Before treating a low systolic: look at the patient, do a flush test, check the cuff. Then aspirate and flush, clear bubbles, check the bag and every connection, reposition the limb.' }
  ];

  /* ================================================================ the venous patterns */
  const CVPTXT = {
    normal: { look: 'Three peaks and two descents each beat: a (atrial contraction, just after the P wave), c (the tricuspid valve bulging at the start of systole, at the end of the QRS), x descent (the atrium relaxing and its floor pulled down in mid-systole), v (the atrium filling against a closed valve, peaking at the end of the T wave), y descent (the valve opening).', means: 'Read the number at end-expiration, at the base of the c wave (the z point, just before the tricuspid valve closes — on the strip, at the R wave) or as the mean of the a wave. That is the pressure filling the ventricle at end-diastole.', act: 'A normal trace means a normal rhythm, a competent valve and a pericardium that is not in the way. The number says where the heart and the venous return have met — not whether fluid will help.' },
    af: { look: 'No a wave. The c wave is more obvious and runs into the v wave; the x descent is shallow.', means: 'No atrial contraction, no atrial relaxation. The irregular rhythm changes each beat’s v wave.', act: 'Measure at the R wave, averaged over several beats at end-expiration.' },
    chb: { look: 'a waves march through at their own rate. Now and then one lands in ventricular systole and towers over the rest: a cannon wave.', means: 'The atrium contracts against a closed tricuspid valve whenever a P wave falls between the QRS and the end of the T wave. Irregular cannon waves = AV dissociation: complete heart block, ventricular tachycardia, a ventricular pacemaker.', act: 'A wide-complex tachycardia with irregular cannon waves is ventricular tachycardia until proved otherwise. Losing the atrial kick can cost a quarter of the output in a stiff ventricle: restore AV synchrony.' },
    junctional: { look: 'A cannon wave with every beat, regular, right after the QRS; no a wave before it.', means: 'Atria and ventricles are activated together (junctional rhythm, AV nodal re-entry, a ventricular pacemaker with retrograde conduction), so every atrial contraction meets a closed valve.', act: 'Common after cardiac surgery and with volatile agents; the blood pressure often falls with it. Atrial or dual-chamber pacing restores the kick.' },
    pvc: { look: 'A normal trace, then one tall wave where the ectopic beat is.', means: 'The sinus P wave still fires on time, into a ventricle that is already contracting.', act: 'An occasional cannon wave with a normal pulse otherwise is ectopy; nothing to do with the line.' },
    gianta: { look: 'A tall a wave before every QRS, twice the height of the v wave.', means: 'The atrium is pushing into a stiff or pressure-loaded right ventricle (pulmonary hypertension, pulmonary stenosis, RV hypertrophy) or through a narrowed valve (tricuspid stenosis: there the y descent is slow as well).', act: 'The mean overstates the filling of the ventricle less than the a-wave peak does; use the base of the c wave. The right ventricle here depends on its atrial kick.' },
    firstdeg: { look: 'The a wave stands well clear of the c wave.', means: 'A long PR interval separates atrial from ventricular events, so a, c and v are easy to name — a good trace to learn on.', act: 'Nothing to treat. With a very long PR the a wave can fall in the previous systole and become a cannon wave.' },
    tr: { look: 'No x descent. A broad systolic wave rises through systole to a tall peak (the c and v waves fused), then a steep y descent. The trace looks like a small ventricle.', means: 'The right ventricle ejects backwards into the atrium. The monitor’s mean overstates the end-diastolic pressure.', act: 'Read the pressure just before the systolic wave (at the R wave). Thermodilution output is unreliable. A sudden change to this pattern in a sick right heart means the ventricle has dilated.' },
    tamponade: { look: 'A high pressure, a sharp x descent, and almost no y descent: one dip per beat.', means: 'The heart can only fill when it is ejecting (blood leaves the pericardial space in systole). In early diastole the pressure around it stops the atrium emptying.', act: 'A high venous pressure, a small pulse with paradox, and equal diastolic pressures: echo now and drain. Do not intubate or sedate first if it can be avoided.' },
    constriction: { look: 'A high pressure with two steep descents each beat — the M or W — the y deeper than the x, ending abruptly in a plateau. In inspiration the pressure does not fall (Kussmaul’s sign).', means: 'A rigid shell: filling is fast and early, then stops dead. The pleural swing does not reach the heart, so inspiration cannot draw the venous pressure down.', act: 'The same picture in the right ventricle is the dip and plateau (square-root sign). Restrictive cardiomyopathy and a right ventricular infarct look alike; the echo and the respiratory behaviour of the two ventricles separate them.' },
    rvmi: { look: 'A high pressure, a prominent a wave, a steep y descent, a pressure that rises with inspiration, and clear lungs.', means: 'A stiff, ischaemic right ventricle: a non-compliant pattern, with the right atrium working hard. The venous pressure equals or exceeds the wedge.', act: 'Keep it filled and in sinus rhythm, avoid nitrates and high airway pressures, reperfuse. A right atrial pressure above 10 and within 5 of the wedge suggests it.' },
    hypovol: { look: 'A low pressure whose waves are hard to see, swinging widely with a hard-working breath; it dips below zero in inspiration.', means: 'An empty, compliant system with a patient pulling hard.', act: 'Read at end-expiration; the monitor’s mean follows the breath. A venous pressure that falls further with each inspiration and a climbing heart rate: find the volume loss.' }
  };
  const WEDGETXT = {
    normal: { look: 'A low-amplitude trace with an a wave and a v wave, both arriving late: the a wave after the QRS, the v wave after the T wave. Lower than the pulmonary artery diastolic by 1–4 mm Hg.', means: 'The wedged catheter looks through the pulmonary capillaries at the left atrium, 140 ms or so away: every left atrial event is delayed.', act: 'Read at end-expiration, as the mean of the a wave. Confirm a true wedge: an atrial waveform, a mean at or below the PA diastolic, and (if in doubt) blood from the tip that is more saturated than arterial blood.' },
    mr: { look: 'A giant v wave, taller than the pulmonary artery diastolic, peaking after the T wave. The pulmonary artery trace itself has two humps (the v wave shows through), and the trace hardly seems to change when the balloon goes up.', means: 'Regurgitation into a small, stiff left atrium: acute mitral regurgitation (papillary muscle, chordal rupture). Also a ventricular septal defect or any stiff, overfilled atrium.', act: 'Do not report the mean: the pressure that fills the ventricle is the a wave, or the trace just before the v wave begins. Do not mistake the wedge for a pulmonary artery trace and advance further. Reduce afterload; call the surgeon.' },
    stiff: { look: 'A tall a wave just after the QRS on a raised baseline; a smaller v wave.', means: 'The atrium contracting into a stiff ventricle: ischaemia (it can appear before the ST segment moves), hypertrophy, aortic stenosis.', act: 'The a-wave peak approximates the end-diastolic pressure. A new tall a wave during a wean or an episode of chest pain is ischaemia.' },
    af: { look: 'No a wave; a v wave whose size changes from beat to beat.', means: 'No atrial contraction; filling time varies.', act: 'Average several beats at end-expiration, measured at the QRS.' },
    ms: { look: 'A high pressure with a tall a wave (in sinus rhythm) and a y descent that drags.', means: 'The atrium cannot empty through a narrow valve: the wedge overstates the left ventricular end-diastolic pressure by the gradient across the valve.', act: 'The wedge here is the pulmonary capillary pressure (the lungs’ problem), not the ventricle’s preload. Slow the heart.' }
  };

  /* ================================================================ the troubleshooting lab */
  const ACTIONS = [
    ['patient', 'Look at the patient and check a cuff', 'Pulse, skin, mentation, the cuff on the other arm: is the patient in the number?'],
    ['flush', 'Fast-flush (square-wave) test', 'Pull the flush tab for a second and let go: count the oscillations and watch how fast the trace returns.'],
    ['zero', 'Re-zero the transducer', 'Stopcock off to the patient and open to air, press zero, close it again.'],
    ['level', 'Re-level the transducer', 'The air–fluid interface of the zeroing stopcock at the phlebostatic axis: 4th intercostal space, mid-axillary line.'],
    ['bubble', 'Clear the bubbles', 'Inspect the tubing, the stopcocks and the transducer dome; aspirate and flush every bubble out through a stopcock, away from the patient.'],
    ['bag', 'Check the pressure bag', 'Fluid in the bag, the bag at 300 mm Hg, the drip chamber running.'],
    ['tubing', 'Simplify the tubing', 'Shortest stiff tubing that reaches; take out extension sets and extra stopcocks.'],
    ['connect', 'Tighten connections, check cable and scale', 'Every Luer connection, the transducer cable, the pressure scale and label on the monitor.'],
    ['position', 'Reposition the limb, look at the site', 'Wrist extended on a board, dressing off the catheter, no kink at the skin.'],
    ['aspirate', 'Aspirate, then flush gently', 'Draw back until blood comes freely (discard a clot), then flush by hand with 2–3 mL, slowly.'],
    ['site', 'Measure at a central site', 'A femoral or axillary line, or the mean from a properly sized cuff.'],
    ['endexp', 'Freeze the strip: read at end-expiration', 'On the frozen trace, find end-expiration and read at the base of the c wave (at the R wave).'],
    ['balloon', 'Deflate the balloon, pull back', 'Balloon down, withdraw until a pulmonary artery trace returns; never leave it wedged.'],
    ['pressor', 'Turn up the vasopressor', 'Treat the number on the screen.'],
    ['fluid', 'Give a fluid bolus or a diuretic', 'Treat the number on the screen.']
  ];
  /* truth: the patient; fault: what the line is doing to it; fix: the actions that cure it (all needed); each act → what you find */
  const CASES = [
    { id: 'bubble', ch: 'art', title: 'The pressure fell after the blood gas', story: 'Septic shock, norepinephrine 0.12 µg/kg/min. Ten minutes after an arterial sample the monitor reads 101/69 (86), down from a systolic of 124, and the nurse asks whether to turn the pressor up. The radial pulse is easy to feel.',
      truth: { hr: 96, sbp: 122, dbp: 62 }, fault: { fn: 3.2, zeta: 1.5 }, cuff: '124/64 (84)', fix: ['bubble'],
      acts: { patient: 'Warm hands, a full pulse, alert. The cuff on the other arm reads 124/64 (84).', flush: 'The square wave comes down slowly, like a ramp, with no bounce at all: overdamped.', zero: 'Zero was correct: nothing changes.', level: 'Already at the axis: nothing changes.', bubble: 'A 3 mm bubble sits in the sampling stopcock. Flushed out through the side port: the upstroke sharpens and the notch returns.', bag: 'The bag is at 300 mm Hg and dripping.', tubing: 'Standard tubing; nothing to remove.', connect: 'All tight.', position: 'The wrist is fine.', aspirate: 'Blood draws back freely; no clot. The trace is unchanged until the bubble is cleared.', pressor: 'The mean climbs to 96 by cuff. You have treated a bubble with norepinephrine.' },
      teach: 'A slurred trace with a narrow pulse pressure after any sampling or disconnection is a bubble or a clot until a flush test says otherwise. The mean was right all along (86): the systolic and the diastolic were not.' },
    { id: 'whip', ch: 'art', title: 'A systolic of 195 in a comfortable patient', story: 'Day 2 after a subarachnoid haemorrhage, systolic target below 160. The line reads 195/57 (99) with a spiky trace; a nicardipine infusion is about to be started.',
      truth: { hr: 92, sbp: 152, dbp: 66 }, fault: { fn: 5, zeta: 0.1 }, cuff: '150/68 (95)', fix: ['tubing'],
      acts: { patient: 'Comfortable, no headache. The cuff reads 150/68 (95).', flush: 'After the square wave the trace rings on and on: eight or more oscillations before it settles. Underdamped.', zero: 'No change.', level: 'No change.', bubble: 'A few tiny bubbles in an extension set; clearing them helps a little.', bag: 'Normal.', tubing: 'Two extension sets and three stopcocks had been added for sampling. With them removed the flush test shows one and a half oscillations, and the trace reads 153/66.', connect: 'Tight.', position: 'Fine.', aspirate: 'Free flow.', pressor: 'Not indicated.', fluid: 'Not indicated.' },
      teach: 'An underdamped line overstates the systolic and understates the diastolic by 10–40 mm Hg; the mean is right. When the target is a systolic, the fidelity of the line matters: test it before treating. If the tubing cannot be simplified, trust the mean and the cuff.' },
    { id: 'level', ch: 'art', title: 'The pressure rose when the bed went up', story: 'The bed was raised 20 cm for a procedure; the transducer is on a pole. The arterial pressure reads 148/87 (110), up from 133/72, and the CVP 19, up from 4. The trace looks normal.',
      truth: { hr: 78, sbp: 132, dbp: 72 }, fault: { fn: 22, zeta: 0.55, offset: 15 }, cuff: '130/74 (93)', fix: ['level'],
      acts: { patient: 'Unchanged. The cuff reads 130/74 (93).', flush: 'One and a half oscillations: the dynamic response is fine.', zero: 'Zeroing where it sits changes nothing: zero removes atmospheric pressure, not height.', level: 'The transducer is 20 cm below the right atrium. Raised to the phlebostatic axis: 133/72 (95), and the CVP reads 4.', bubble: 'None.', bag: 'Normal.', tubing: 'Normal.', connect: 'Tight.', position: 'Fine.', aspirate: 'Free flow.', fluid: 'A diuretic for a CVP of 19 that was really 4 would be an error.' },
      teach: 'Every 10 cm of height is 7.4 mm Hg. A transducer below the heart over-reads every pressure by the same amount; the shape does not change. It matters little for an arterial pressure of 90 and decides everything for a CVP of 8. Re-level whenever the bed or the patient moves.' },
    { id: 'zero', ch: 'art', title: 'A mean of 56 after the scanner', story: 'Back from CT: the line reads 85/38 (56) and the norepinephrine has been doubled on the way up. The trace looks crisp. The transducer was disconnected from its cable for the transfer.',
      truth: { hr: 88, sbp: 102, dbp: 56 }, fault: { fn: 22, zeta: 0.55, offset: -18 }, cuff: '104/58 (73)', fix: ['zero'],
      acts: { patient: 'Warm, making urine. The cuff reads 104/58 (73).', flush: 'A good square wave with one and a half oscillations.', zero: 'Open to air, the monitor shows −18 instead of 0. Zeroed: the trace reads 103/56 (74).', level: 'At the axis.', bubble: 'None.', bag: 'Normal.', tubing: 'Normal.', connect: 'The cable had been reconnected to a different module without re-zeroing.', position: 'Fine.', aspirate: 'Free flow.', pressor: 'The true mean is now 95. The pressor was treating an offset.' },
      teach: 'A normal-looking trace that disagrees with the patient by a fixed amount is a zero or a level error. Open the stopcock to air: the monitor must read 0. Re-zero after every disconnection, cable change or monitor change.' },
    { id: 'softbag', ch: 'art', title: 'Flatter by the hour, blood in the tubing', story: 'The trace has lost its notch over the afternoon and now reads 112/70. Blood has tracked 10 cm back up the tubing.',
      truth: { hr: 82, sbp: 128, dbp: 66 }, fault: { fn: 3.6, zeta: 1.3 }, cuff: '126/68 (87)', fix: ['bag', 'aspirate'],
      acts: { patient: 'Well perfused. The cuff reads 126/68 (87).', flush: 'A sluggish flush: the square wave barely reaches the top and falls slowly.', zero: 'No change.', level: 'No change.', bubble: 'No bubbles; there is blood in the line.', bag: 'The pressure bag reads 60 mm Hg and the flush bag is nearly empty: no continuous flush, so blood is backing up and clotting. New bag, inflated to 300.', tubing: 'Normal.', connect: 'Tight.', position: 'Fine.', aspirate: 'A small clot comes back, then free flow. A gentle 2 mL flush clears the tubing.' },
      teach: 'The flush device delivers about 3 mL/h only when the bag is at 300 mm Hg. Check the bag every time you pass the bed. Aspirate a clot out — never flush it in — and flush by hand in small, slow volumes: a fast flush of a radial line can send air or clot back to the cerebral circulation.' },
    { id: 'positional', ch: 'art', title: 'It flattens when he bends his wrist', story: 'The trace swings between 127/68 and a flat, narrow trace around 101/81, and the alarm sounds every few minutes. The patient is awake and moving the hand.',
      truth: { hr: 80, sbp: 126, dbp: 68 }, fault: { fn: 6, zeta: 1.5, kink: 0.55 }, cuff: '124/70 (88)', fix: ['position'],
      acts: { patient: 'Fine. The cuff reads 124/70 (88).', flush: 'With the wrist flexed the flush hardly registers; with it extended the flush is brisk with one bounce.', zero: 'No change.', level: 'No change.', bubble: 'None.', bag: 'Normal.', tubing: 'Normal.', connect: 'Tight.', position: 'The catheter kinks at the skin when the wrist flexes. An arm board in slight extension and a dressing that does not bend the hub: a steady 127/68.', aspirate: 'Free flow with the wrist extended only.' },
      teach: 'A trace that comes and goes with position is a kink or a tip against the wall. Fix the position before trusting the alarm — or the lack of one. A line that stays positional should be replaced, with a longer catheter or at another site.' },
    { id: 'gradient', ch: 'art', title: 'High-dose norepinephrine and a radial mean of 56', story: 'Refractory septic shock, norepinephrine 0.9 µg/kg/min and vasopressin. The radial line reads 79/42 (56); the hands are cold and mottled. The team is about to add a third agent.',
      truth: { hr: 118, sbp: 78, dbp: 42, shape: 'lowsv' }, fault: { fn: 20, zeta: 0.55 }, central: { hr: 118, sbp: 104, dbp: 52, site: 'femoral', refSite: 'femoral' }, cuff: 'arm cuff fails to read', fix: ['site'],
      acts: { patient: 'Cold, mottled hands; the femoral pulse is surprisingly strong. The arm cuff will not read.', flush: 'A clean square wave with one and a half oscillations: the line is faithful to the radial artery.', zero: 'Correct.', level: 'Correct.', bubble: 'None.', bag: 'Normal.', tubing: 'Normal.', connect: 'Tight.', position: 'Fine.', aspirate: 'Free flow.', site: 'A femoral line reads 105/52 (72): the mean is 16 mm Hg higher centrally.', pressor: 'More vasoconstrictor narrows the radial artery further and widens the gap. The limb and the gut pay for it.' },
      teach: 'In severe vasoconstriction (high-dose vasopressors, after bypass, deep hypothermia) the radial pressure can read well below the central pressure: a gradient of 5 mm Hg or more in the mean is common on high-dose norepinephrine. A faithful line can still be at the wrong place: measure centrally (femoral or axillary) before escalating.' },
    { id: 'cvpexp', ch: 'cvp', title: 'A CVP charted as 22 in a breathless patient', story: 'Exacerbation of COPD on high-flow oxygen, using the abdominal muscles to breathe out. The venous trace climbs to 22 mm Hg with every breath out; 22 has been charted and furosemide suggested. The jugular veins fill in expiration and empty in inspiration.',
      truth: { hr: 104, cvp: { label: '', base: 7, a: 3, c: 1.2, x: 2.6, v: 2.6, y: 2.2 }, vent: 'spont', rr: 26, swing: -1, forced: 14 }, fault: {}, cuff: '', fix: ['endexp'],
      acts: { patient: 'Working hard, pushing each breath out. Warm, with dry mucous membranes.', flush: 'The venous flush test is brisk.', zero: 'Correct.', level: 'Correct.', bubble: 'None.', bag: 'Normal.', connect: 'Tight; the scale is 0–30.', endexp: 'The trace swings 14 mm Hg with every breath. The monitor’s number is the average of the whole breath, including the forced expiration. The peaks are the patient pushing, not the heart filling. At the end of a relaxed expiration, at the R wave, it reads about 7.', fluid: 'A diuretic for a venous pressure of 7 would dry out a patient who is already dry.' },
      teach: 'The monitor averages over time; the heart sees the pressure across its wall. Read every central pressure (CVP, pulmonary artery, wedge) from a frozen strip at end-expiration. With active expiration even that overstates it: look for the lowest stable point between the push and the next breath, or use an oesophageal balloon.' },
    { id: 'overwedge', ch: 'pa', title: 'The pulmonary artery trace went flat', story: 'Two hours after the last wedge measurement the pulmonary artery channel shows a low, flat trace at 14 mm Hg with small waves. The syringe is in place with 1.5 mL in it.',
      truth: { hr: 86, pas: 38, pad: 18, wedge: { label: '', base: 14, a: 3, c: 0, x: 2, v: 3.5, y: 2.4 } }, fault: { wedged: 1 }, cuff: '', fix: ['balloon'],
      acts: { patient: 'Stable; no haemoptysis.', flush: 'The flush is brisk: the line is patent.', zero: 'Correct.', level: 'Correct.', bubble: 'None.', connect: 'Tight.', balloon: 'The balloon was left inflated. Deflated passively: a pulmonary artery trace returns, 38/18. If it had stayed wedged with the balloon down, the catheter has migrated: pull back 2–3 cm until the pulmonary artery trace is back.', endexp: 'It is an atrial waveform, not a damped arterial one: this is a wedge trace.' },
      teach: 'A persistent wedge infarcts the lung behind it and, if the balloon is then re-inflated in a small branch, can rupture the artery. Never leave the balloon up; keep the pulmonary artery trace on continuous display; inflate slowly and stop as soon as the trace changes; if it wedges with less than 1 mL, the catheter is too far in.' }
  ];

  /* ================================================================ the drawn scanner: four places to put a line */
  /* A scene is a function of where the probe is along the vessel (s: 0 proximal … 1 distal) and an option; it returns the structures in the beam
     (x: 0…1 across the screen, y and radii in cm of depth) and what that level means for the needle. */
  const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
  const SCENES = {
    femoral: { label: 'Femoral vessels', sub: 'right groin, probe across the leg', depth: 5, width: 5, left: 'lateral', right: 'medial', opt: ['Leg turned out', 'Frog-leg: hip abducted and externally rotated'], slide: ['Inguinal ligament', '6 cm down the thigh'],
      build: function (s, o) {
        const bif = 0.58, st = [], dist = Math.max(0, (s - 0.5) / 0.5);
        st.push({ k: 'layer', y0: 0, y1: 1.15, e: 0.3, tex: 'fat' }, { k: 'fascia', y: 1.15, e: 0.85 }, { k: 'layer', y0: 1.15, y1: 5, e: 0.34, tex: 'muscle' });
        if (s < 0.1) st.push({ k: 'band', y: 0.85, x0: 0.05, x1: 0.95, e: 0.8, id: 'lig', label: 'Inguinal ligament' });
        st.push({ k: 'nerve', id: 'fn', x: 0.2, y: 1.75, rx: 0.42, ry: 0.2, label: 'Femoral nerve' });
        if (s < bif) st.push({ k: 'vessel', t: 'a', id: 'cfa', x: 0.42, y: 2.0, rx: 0.42, ry: 0.42, label: 'Common femoral artery' });
        else { const d = (s - bif) / (1 - bif); st.push({ k: 'vessel', t: 'a', id: 'sfa', x: 0.45, y: 1.9, rx: 0.33, ry: 0.33, label: 'Superficial femoral artery' }, { k: 'vessel', t: 'a', id: 'pfa', x: 0.36 - 0.1 * d, y: 2.45 + 1.3 * d, rx: 0.27, ry: 0.27, label: 'Profunda femoris artery' }); }
        const vx = lerp(0.64, 0.5, dist) + (o ? 0.07 * dist + 0.02 : 0), vy = lerp(2.12, 2.72, dist);
        st.push({ k: 'vessel', t: 'v', id: 'cfv', x: vx, y: vy, rx: 0.56, ry: 0.42, label: s < bif ? 'Common femoral vein' : 'Femoral vein' });
        if (s > 0.16 && s < 0.5) { const j = (s - 0.16) / 0.34; st.push({ k: 'vessel', t: 'v', id: 'gsv', x: lerp(0.7, 0.82, j), y: lerp(1.72, 1.2, j), rx: lerp(0.3, 0.2, j), ry: lerp(0.24, 0.15, j), label: 'Great saphenous vein' }); }
        if (s > 0.04 && s < 0.5) st.push({ k: 'bone', id: 'head', x: 0.44, y: 3.7, r: 2.6, w: 0.5, label: 'Femoral head' });
        let zone, ok = 0;
        if (s < 0.1) zone = 'At or above the inguinal ligament: this is the external iliac artery. A hole here cannot be compressed against bone and bleeds into the retroperitoneum.';
        else if (s < 0.5) { ok = 1; zone = 'The target: the common femoral artery over the femoral head, below the ligament and above the bifurcation, with the vein beside it, not behind it.' + (s > 0.16 ? ' The saphenous vein joining the femoral vein on the medial side with the artery on the other gives the “Mickey Mouse” view.' : ''); }
        else if (s < 0.72) zone = 'The bifurcation: two arteries. A puncture here or below has more pseudoaneurysms, haematomas and arteriovenous fistulas, and nothing firm to compress against.';
        else zone = 'Too low: the vein now lies behind the superficial femoral artery. A needle aimed at the vein goes through the artery first.' + (o ? ' Turning the leg out has moved the vein partly clear.' : ' Turning the leg out (frog-leg) uncovers it.');
        return { st: st, zone: zone, ok: ok };
      } },
    axillary: { label: 'Axillary vessels', sub: 'below the right clavicle, probe along the body', depth: 5.5, width: 5, left: 'head', right: 'feet', opt: ['Arm abducted', 'Arm abducted 90°: the vessels straighten and come up'], slide: ['Medial (mid-clavicular)', 'Lateral (deltopectoral groove)'],
      build: function (s, o) {
        const st = [], up = o ? 0.35 : 0;
        st.push({ k: 'layer', y0: 0, y1: 0.55, e: 0.3, tex: 'fat' }, { k: 'fascia', y: 0.55, e: 0.8 }, { k: 'layer', y0: 0.55, y1: 1.9, e: 0.33, tex: 'muscle', id: 'pmaj', label: 'Pectoralis major', lx: 0.72, ly: 1.2 }, { k: 'fascia', y: 1.9, e: 0.8 });
        if (s > 0.28) st.push({ k: 'layer', y0: 1.95, y1: 2.5, e: 0.36, tex: 'muscle', id: 'pmin', label: 'Pectoralis minor', lx: 0.74, ly: 2.22 }, { k: 'fascia', y: 2.5, e: 0.75 });
        st.push({ k: 'layer', y0: s > 0.28 ? 2.5 : 1.9, y1: 5.5, e: 0.3, tex: 'deep' });
        if (s < 0.22) st.push({ k: 'bone', id: 'clav', x: 0.06, y: 1.0, r: 0.6, w: 0.12, label: 'Clavicle' });
        const ay = 3.0 + 0.55 * s - up, vy = 3.15 + 0.5 * s - up;
        st.push({ k: 'vessel', t: 'a', id: 'aa', x: 0.4, y: ay, rx: 0.38, ry: 0.38, label: 'Axillary artery' }, { k: 'vessel', t: 'v', id: 'av', x: 0.63, y: vy, rx: 0.52, ry: 0.4, label: 'Axillary vein', resp: 1 });
        if (s > 0.35) st.push({ k: 'nerve', id: 'lc', x: 0.3, y: ay - 0.42, rx: 0.2, ry: 0.14, label: 'Lateral cord' }, { k: 'nerve', id: 'pc', x: 0.4, y: ay + 0.6, rx: 0.2, ry: 0.14, label: 'Posterior cord' }, { k: 'nerve', id: 'mc', x: 0.515, y: ay + 0.22, rx: 0.13, ry: 0.11, label: 'Medial cord' });
        if (s > 0.5 && s < 0.8) st.push({ k: 'vessel', t: 'v', id: 'ceph', x: 0.66, y: 1.95, rx: 0.16, ry: 0.11, label: 'Cephalic vein' });
        const pl = 4.25 + 1.9 * s - up * 0.4;
        if (pl < 5.4) st.push({ k: 'pleura', id: 'pl', y: pl, x0: 0.3, x1: 1, label: 'Pleura', lx: 0.42 });
        if (s < 0.45) st.push({ k: 'bone', id: 'rib', x: 0.78, y: pl - 0.5, r: 0.55, w: 0.75, label: 'Second rib' });
        let zone, ok = 0;
        if (s < 0.3) zone = 'Medial: the vein is large here but the pleura lies less than a centimetre behind it and the clavicle crowds the probe. A needle that overshoots finds lung.';
        else if (s < 0.75) { ok = 1; zone = 'The working level: artery towards the head, vein towards the feet and a little shallower, both under the pectoral muscles with the pleura well clear. Come in-plane from the head end so that the whole needle is seen all the way to the vessel.'; }
        else zone = 'Lateral: the vessels are deeper under both pectoral muscles and the cords of the plexus wrap the artery. Safe from the pleura, but a steep, long needle path and nerves beside the artery.';
        return { st: st, zone: zone, ok: ok };
      } },
    neck: { label: 'Internal jugular vein', sub: 'right side of the neck, probe across', depth: 4, width: 4.5, left: 'lateral', right: 'medial', opt: ['Head turned', 'Head turned fully to the left: the vein rolls over the artery'], slide: ['Just above the clavicle', 'High in the neck'],
      build: function (s, o) {
        const st = [], ov = o ? 0.15 : 0.02, vr = lerp(0.72, 0.4, s);
        st.push({ k: 'layer', y0: 0, y1: 0.45, e: 0.3, tex: 'fat' }, { k: 'fascia', y: 0.45, e: 0.8 }, { k: 'layer', y0: 0.45, y1: 1.25, e: 0.34, tex: 'muscle', id: 'scm', label: 'Sternocleidomastoid', lx: 0.3, ly: 0.85, x1: 0.78 }, { k: 'fascia', y: 1.25, e: 0.8 }, { k: 'layer', y0: 1.25, y1: 4, e: 0.3, tex: 'deep' });
        st.push({ k: 'vessel', t: 'v', id: 'ijv', x: 0.4 + ov, y: 1.9, rx: vr, ry: vr * 0.68, label: 'Internal jugular vein', resp: 1 });
        if (s < 0.78) st.push({ k: 'vessel', t: 'a', id: 'cca', x: 0.6, y: 2.35, rx: 0.36, ry: 0.36, label: 'Common carotid artery' });
        else st.push({ k: 'vessel', t: 'a', id: 'ica', x: 0.55, y: 2.4, rx: 0.27, ry: 0.27, label: 'Internal carotid artery' }, { k: 'vessel', t: 'a', id: 'eca', x: 0.68, y: 2.2, rx: 0.2, ry: 0.2, label: 'External carotid artery' });
        st.push({ k: 'nerve', id: 'vagus', x: 0.52, y: 2.72, rx: 0.1, ry: 0.08, label: 'Vagus nerve' });
        if (s < 0.75) st.push({ k: 'gland', id: 'thy', x: 0.84, y: 2.0, rx: 0.5, ry: 0.42, label: 'Thyroid' });
        st.push({ k: 'air', id: 'tr', x: 1.02, y: 1.9, r: 0.75, label: 'Trachea' }, { k: 'bone', id: 'tp', x: 0.42, y: 3.5, r: 0.8, w: 0.55, label: 'Transverse process' });
        if (s < 0.14) st.push({ k: 'vessel', t: 'a', id: 'sca', x: 0.3, y: 3.05, rx: 0.3, ry: 0.26, label: 'Subclavian artery' });
        let zone, ok = 0;
        if (s < 0.14) zone = 'Very low: the vein is at its widest, but the subclavian artery and the dome of the pleura are just behind it. Keep the needle shallow or move up.';
        else if (s < 0.65) { ok = 1; zone = 'The working level: the vein lateral to and in front of the carotid, under the sternocleidomastoid.' + (o ? ' With the head turned far over, the vein sits on top of the artery: a needle through its back wall is in the carotid. Bring the head back towards the midline.' : ' Keep the head near the midline so that the vein stays beside the artery rather than on top of it.'); }
        else zone = 'High: the vein is smaller and the carotid is dividing. Lower is easier and safer.';
        return { st: st, zone: zone, ok: ok };
      } },
    radial: { label: 'Radial artery', sub: 'right wrist, palm up, probe across', depth: 2, width: 3, left: 'thumb side', right: 'ulnar side', opt: ['Wrist extended', 'Wrist extended 30–45° over a roll: the artery comes up and stops rolling'], slide: ['Wrist crease', '5 cm up the forearm'],
      build: function (s, o) {
        const st = [], ay = lerp(0.42, 0.85, s) - (o ? 0.08 : 0), r = lerp(0.125, 0.14, s);
        st.push({ k: 'layer', y0: 0, y1: 0.28, e: 0.3, tex: 'fat' }, { k: 'fascia', y: 0.28, e: 0.85 }, { k: 'layer', y0: 0.28, y1: 2, e: 0.33, tex: 'muscle' });
        st.push({ k: 'vessel', t: 'a', id: 'ra', x: 0.42, y: ay, rx: r, ry: r, label: 'Radial artery' }, { k: 'vessel', t: 'v', id: 'vc1', x: 0.42 - 0.075, y: ay + 0.01, rx: 0.06, ry: 0.05, label: 'Venae comitantes' }, { k: 'vessel', t: 'v', id: 'vc2', x: 0.42 + 0.075, y: ay + 0.02, rx: 0.06, ry: 0.05, label: '' });
        if (s < 0.6) st.push({ k: 'tendon', id: 'fcr', x: 0.64, y: 0.5, rx: 0.22, ry: 0.13, label: 'Flexor carpi radialis tendon' });
        st.push({ k: 'bone', id: 'rad', x: 0.4, y: lerp(1.25, 1.75, s), r: 1.6, w: 0.42, label: 'Radius' });
        if (s > 0.5) st.push({ k: 'nerve', id: 'med', x: 0.8, y: 0.95, rx: 0.2, ry: 0.11, label: 'Median nerve' });
        let zone, ok = 0;
        if (s < 0.12) zone = 'At the crease the artery is superficial but tortuous and already dividing; a catheter here kinks with every wrist movement.';
        else if (s < 0.6) { ok = 1; zone = 'The working level, 2–4 cm above the crease: a 2–3 mm artery about 4 mm deep with a small vein on either side, lateral to the flexor carpi radialis tendon. Rest the probe with almost no pressure — the artery itself flattens.'; }
        else zone = 'Further up the artery is deeper, under brachioradialis, but larger and straighter: the place to go after failed attempts at the wrist, with a longer catheter.';
        return { st: st, zone: zone, ok: ok };
      } }
  };
  /* the needle seen across its length (out of plane): where the beam cuts it. Returns what the screen shows and what is true. */
  function needleOOP(o) {
    /* o: angle (deg), entry (cm from the beam, along the vessel), adv (cm of needle in), depth (cm, vessel centre), r (cm, vessel radius) */
    const th = o.angle * Math.PI / 180, tipX = o.adv * Math.cos(th), tipY = o.adv * Math.sin(th), crossY = o.entry * Math.tan(th), reached = tipX >= o.entry - 0.03, beyond = tipX - o.entry;
    const front = o.depth - o.r, back = o.depth + o.r; let say, state;
    if (!reached) { state = 'short'; say = 'Nothing on the screen: the tip has not reached the beam (' + (o.entry - tipX).toFixed(1) + ' cm to go). Tissue moves, but there is no dot. Do not advance blind: slide the probe back towards the needle until the dot appears.'; }
    else if (beyond < 0.12) { state = 'tip'; say = crossY < front - 0.05 ? 'A bright dot above the vessel: this is the tip, ' + (front - crossY).toFixed(1) + ' cm short of the front wall. Slide the probe a few millimetres ahead, advance until the dot reappears, and repeat.' : crossY <= back ? 'The dot is inside the lumen and it is the tip: the target sign. Lower the needle angle, check the flash, and pass the wire.' : 'The tip is below the back wall.'; }
    else { state = 'shaft'; say = 'There is a dot at ' + crossY.toFixed(1) + ' cm — but it is the shaft. The tip is ' + beyond.toFixed(1) + ' cm beyond the beam and ' + tipY.toFixed(1) + ' cm deep' + (tipY > back ? ': through the back wall.' : tipY >= front ? ': it may already be in the vessel, or beside it.' : '.') + ' The dot looks the same whether it is tip or shaft; only moving the probe tells them apart.'; }
    return { tipX: tipX, tipY: tipY, crossY: reached ? crossY : null, state: state, say: say, inLumen: tipY >= front && tipY <= back && Math.abs(beyond) < 0.6 };
  }

  /* ================================================================ the topics */
  const T = {};
  T.ln_art_patterns = { title: 'Reading the arterial trace: patterns and pearls', kicker: 'The shape carries the diagnosis: what the heart, the vessels, the breath, the rhythm and the tubing each do to it', blocks: [
    { p: 'The arterial trace is drawn here from one model in which every landmark has a time in milliseconds: the upstroke begins about 90 ms after the R wave at the aortic root and about 175 ms after it at the wrist; ejection lasts 413 − 1.7 × heart rate ms; the notch follows. Those numbers, and the shape of the radial and pulmonary artery beats, were set against real recordings — the next-but-one topic puts the two side by side.' },
    { h: 'Five questions for any arterial trace', ol: [
      'Is it the patient or the line? A flush test and a cuff answer this before anything else.',
      'The upstroke: steep (a good ventricle, or a vasodilated or regurgitant one) or slow (a poor ventricle, a stenosed valve, an overdamped line)?',
      'The pulse pressure: wide (stiff vessels, vasodilatation with a low diastolic, aortic regurgitation) or narrow (low stroke volume)?',
      'The notch and the run-off: a low notch and a fast run-off mean low resistance; a high notch means high resistance or a stiff tree.',
      'Beat to beat: does it vary with the breath (preload dependence, tamponade, asthma), with the rhythm (fibrillation, ectopics), or in strict alternation (a failing ventricle)?'] },
    { widget: 'ln_art', cls: 'full' },
    { h: 'Numbers to carry', table: { head: ['Measurement', 'Normal', 'Meaning'], rows: [
      ['R wave to radial upstroke', '160–220 ms', 'Longer with a long pre-ejection period (a poor ventricle) or a slow pulse wave; much shorter means the trace is not the radial artery — or the channels are not aligned'],
      ['Upstroke (foot to peak), radial', '100–180 ms', 'Longer than 200 ms: aortic stenosis, severe LV failure, overdamping'],
      ['Foot to notch', '≈ ejection time: 250–350 ms', 'Short: hypovolaemia, tachycardia. Long: aortic stenosis'],
      ['Pulse pressure / systolic', '> 25%', 'Below 25%: a low stroke volume'],
      ['Diastolic', '> 50 mm Hg', 'Below 40–45: vasodilatation or aortic regurgitation; coronary perfusion at risk'],
      ['Pulse-pressure variation', '< 9% no response; > 13% response', 'Only under its validity conditions (see the pattern)'],
      ['Pulsus paradoxus', '< 10 mm Hg', 'More: tamponade, severe airflow obstruction, embolism']] } },
    { links: [['Deranged Physiology — Normal arterial line waveforms', 'https://derangedphysiology.com/main/cicm-primary-exam/cardiovascular-system/Chapter-760/normal-arterial-line-waveforms', 'Alex Yartsev’s chapter, with real traces from the aortic root to the periphery; the neighbouring chapters cover dynamic response testing and the abnormal waveforms']] },
    { src: ['Yartsev A. Normal arterial line waveforms. Deranged Physiology (CICM primary exam, cardiovascular system, chapter 760), updated 2026.', 'Mark JB. Atlas of Cardiovascular Monitoring. Churchill Livingstone, 1998.', 'Pittman JAL, Ping JS, Mark JB. Arterial and central venous pressure monitoring. Int Anesthesiol Clin 2004;42:13–30.', 'O’Rourke MF, Pauca A, Jiang XJ. Pulse wave analysis. Br J Clin Pharmacol 2001;51:507–22.', 'Weissler AM, Harris WS, Schoenfeld CD. Systolic time intervals in heart failure in man. Circulation 1968;37:149–59.', 'Michard F, Teboul JL. Using heart–lung interactions to assess fluid responsiveness during mechanical ventilation. Crit Care 2000;4:282–9.', 'Teboul JL, Monnet X, Chemla D, Michard F. Arterial pulse pressure variation with mechanical ventilation. Am J Respir Crit Care Med 2019;199:22–31.', 'Trost JC, Hillis LD. Intra-aortic balloon counterpulsation. Am J Cardiol 2006;97:1391–8.', 'Saugel B, Kouz K, Meidert AS, Schulte-Uentrop L, Romagnoli S. How to measure blood pressure using an arterial catheter: a systematic 5-step approach. Crit Care 2020;24:172.'] }
  ] };
  T.ln_cvp_patterns = { title: 'Reading the venous trace: a, c, x, v and y', kicker: 'Name the waves from the ECG, read the number at end-expiration, and let the shape tell you about the rhythm, the valve and the pericardium', blocks: [
    { p: 'A central venous trace is small (a few mm Hg) and slow, so it survives a fluid-filled line well; what ruins it is the breath and the place it is read. Run the ECG above it: the a wave follows the P wave, the c wave follows the QRS, the v wave peaks as the T wave ends.' },
    { h: 'How to read it', ol: [
      'Level the transducer at the phlebostatic axis and zero it; a 10 cm error is 7 mm Hg, which is the whole normal range.',
      'Freeze a strip with the ECG. Find end-expiration: the lowest part of the trace on a ventilator’s exhalation, the highest in a patient breathing quietly alone.',
      'Name the waves from the ECG, then measure at the base of the c wave (at the R wave) or the mean of the a wave.',
      'Then look at the shape: is there an a wave? A cannon wave? Is the x descent there? Is the y descent steep, or missing?'] },
    { widget: 'ln_cvp', cls: 'full' },
    { h: 'One line each', table: { head: ['Finding', 'Think of'], rows: [
      ['No a wave', 'Atrial fibrillation'],
      ['Irregular cannon a waves', 'AV dissociation: complete heart block, ventricular tachycardia, ventricular pacing'],
      ['Regular cannon a waves', 'Junctional rhythm, AV nodal re-entry, retrograde conduction from a ventricular pacemaker'],
      ['Giant a waves', 'Pulmonary hypertension, RV hypertrophy, pulmonary stenosis, tricuspid stenosis'],
      ['Large systolic (cv) wave, no x descent', 'Tricuspid regurgitation'],
      ['High pressure, x descent kept, y descent lost', 'Tamponade'],
      ['High pressure, steep x and y (M or W), Kussmaul', 'Constriction; restriction; right ventricular infarction'],
      ['Pressure rises with inspiration (Kussmaul)', 'Constriction, RV infarction, severe RV failure, massive embolism'],
      ['Low pressure with huge swings', 'Hypovolaemia with respiratory effort; or a number read off the mean instead of the strip']] } },
    { src: ['Magder S. Central venous pressure: a useful but not so simple measurement. Crit Care Med 2006;34:2224–7.', 'Magder S. Understanding central venous pressure: not a preload index? Curr Opin Crit Care 2015;21:369–75.', 'Mark JB. Central venous pressure monitoring: clinical insights beyond the numbers. J Cardiothorac Vasc Anesth 1991;5:163–73.', 'Pittman JAL, Ping JS, Mark JB. Int Anesthesiol Clin 2004;42:13–30.', 'Kinch JW, Ryan TJ. Right ventricular infarction. N Engl J Med 1994;330:1211–7.'] }
  ] };
  T.ln_pa_patterns = { title: 'The pulmonary artery catheter: knowing where the tip is', kicker: 'Right atrium, right ventricle, pulmonary artery, wedge: four traces told apart by their diastole — and a wedge that arrives late', blocks: [
    { p: 'Floating a catheter is waveform recognition. The systolic pressure steps up on entering the ventricle; the diastolic pressure steps up on entering the pulmonary artery; the pulsatile trace gives way to an atrial one on wedging. The traces here are timed against the ECG the way a real strip is.' },
    { widget: 'ln_pa', cls: 'full' },
    { h: 'Telling the chambers apart', table: { head: ['Chamber', 'Pressure', 'What marks it', 'From the right internal jugular'], rows: [
      ['Right atrium', '2–8 mean', 'a, c and v waves; falls with a spontaneous breath', '15–20 cm'],
      ['Right ventricle', '15–30 / 0–8', 'A tall systolic wave whose diastole starts near zero and rises towards the next beat; no notch; ectopics', '25–35 cm'],
      ['Pulmonary artery', '15–30 / 6–12', 'Same systolic, a higher diastolic that falls through diastole, and a notch on the downslope', '40–50 cm'],
      ['Wedge', '6–12 mean', 'An atrial trace again, lower than the PA diastolic, with a and v waves about 140 ms later than on the venous trace', '45–55 cm']] } },
    { note: 'Add 5–10 cm from the left internal jugular or the subclavian veins, 10–15 cm from the antecubital fossa and about 15 cm from a femoral vein. If the right ventricle has not been reached by 40 cm or the pulmonary artery within 15 cm of entering the ventricle, the catheter is coiling: deflate, pull back, start again.' },
    { h: 'Pearls', ul: [
      'Right ventricle or pulmonary artery? Look at diastole. In the ventricle it rises (the chamber is filling); in the artery it falls (the vessel is emptying), and there is a notch.',
      'The pulmonary artery upstroke coincides with the T wave; the wedge v wave comes after it. A tall v wave on a wedge trace can make it look like a pulmonary artery trace: compare each with the ECG.',
      'The wedge cannot be higher than the pulmonary artery diastolic. If it is, the tip is not in a zone 3 region, the patient is breathing out actively, or there are large v waves.',
      'Read every pressure at end-expiration from a strip. On PEEP above 10, or with large respiratory swings, the wedge follows the alveolar pressure more than the atrial one.',
      'An overwedged trace climbs steadily to a high, flat line: the balloon has herniated over the tip or is pressed against the wall. Deflate and pull back.',
      'Catheter whip in a large, hyperdynamic pulmonary artery adds spikes to the trace: trust the mean.'] },
    { src: ['Swan HJC, Ganz W, Forrester J, et al. Catheterization of the heart in man with use of a flow-directed balloon-tipped catheter. N Engl J Med 1970;283:447–51.', 'Mark JB. Atlas of Cardiovascular Monitoring. 1998.', 'O’Quin R, Marini JJ. Pulmonary artery occlusion pressure: clinical physiology, measurement, and interpretation. Am Rev Respir Dis 1983;128:319–26.', 'Summerhill EM, Baram M. Principles of pulmonary artery catheterization in the critically ill. Lung 2005;183:209–19.', 'Pinsky MR. Pulmonary artery occlusion pressure. Intensive Care Med 2003;29:19–22.'] }
  ] };
  T.ln_real = { title: 'Real recordings: checking the drawings against patients', kicker: 'Strips from real intensive care monitors — a line being zeroed and flushed, a radial trace, a pulmonary artery trace — with the model drawn over them', blocks: [
    { p: 'Every other trace in this area is drawn by a model. These are not: they are short strips from open physiological databases, recorded at 125 samples a second from bedside monitors. They are here for two reasons — so that you see what a real zero, a real flush and a real pulmonary artery trace look like, and so that the model can be held against them.' },
    { widget: 'ln_real', cls: 'full' },
    { h: 'What the comparison showed', table: { head: ['Feature', 'Real radial trace (68 /min, 157/82)', 'Model at the same rate and pressure'], rows: [
      ['Upstroke, foot to peak', '160 ms', '140 ms'], ['Foot to notch', '368 ms', '352 ms'], ['Notch height (fraction of the pulse pressure)', '0.42', '0.43'], ['(Mean − diastolic) / pulse pressure', '0.40', '0.36']] } },
    { table: { head: ['Feature', 'Real pulmonary artery trace (95 /min, 28/12)', 'Model'], rows: [
      ['R wave to the foot', '90 ms', '85 ms'], ['Upstroke', '208 ms', '204 ms'], ['Foot to notch', '344 ms', '314 ms'], ['Notch height', '0.62', '0.67'], ['R wave to the systemic (radial) foot in the same patient', '175 ms', '175 ms']] } },
    { h: 'What was corrected because of it', ul: [
      'The arterial upstroke used to take 8% of the cycle — 60 ms at 80 /min, twice as fast as any real pulse. It is now 110–140 ms at every heart rate.',
      'The notch used to sit at 42% of the cycle, so it came too early in a tachycardia and too late in a bradycardia. It now follows the ejection time.',
      'The Swan–Ganz traces of the haemodynamics lab fell all the way to the diastolic pressure at the end of systole and then jumped back up. The pulmonary artery, right ventricular, atrial, wedge and arterial traces there are now drawn by this engine.',
      'The venous trace was laid out in fractions of the cycle; its waves now keep their distance from the ECG when the rate changes, and a P wave that lands in systole makes its own cannon wave.'] },
    { note: 'The two channels of the radial strip are not aligned in time to better than about 100 ms in this database (a known property of it), so the delay from the R wave to the upstroke is taken from the other record, where arterial and pulmonary artery pressures were recorded together. No real central venous trace with an open licence could be found: the venous patterns rest on the timing in the references alone.' },
    { src: ['Goldberger AL, Amaral LAN, Glass L, et al. PhysioBank, PhysioToolkit, and PhysioNet. Circulation 2000;101:e215–20.', 'Moody GB, Mark RG. A database to support development and evaluation of intelligent intensive care monitoring. Comput Cardiol 1996;23:657–60 (the MIMIC Database).', 'Johnson AEW, Pollard TJ, Shen L, et al. MIMIC-III, a freely accessible critical care database. Sci Data 2016;3:160035.', 'Heldt T, Oefinger MB, Hoshiyama M, Mark RG. Circulatory response to passive and active changes in posture. Comput Cardiol 2003;30:263–6.', 'Xie C, McCullum L, Johnson A, Pollard T, Gow B, Moody B. Waveform Database Software Package (WFDB) for Python. PhysioNet (sample records, MIT licence).'] }
  ] };
  T.ln_fix = { title: 'Fix the line: a troubleshooting lab', kicker: 'A number that does not fit the patient. Work from the patient outwards, find the fault, and correct it before anyone treats the screen', blocks: [
    { p: 'Each case shows what the monitor shows. Choose what to check; each check tells you what you find. The case ends when the fault is fixed — and it counts against you if the screen was treated first.' },
    { widget: 'ln_fix', cls: 'full' },
    { h: 'The order to work in', ol: [
      'The patient: pulse, perfusion, mentation, a cuff. A real change shows in the patient.',
      'The trace: has the shape changed, or has it only moved up or down? A changed shape is damping or resonance; a shift with a normal shape is level or zero.',
      'The fast-flush test: a brisk square wave with one or two oscillations is a faithful system. None = overdamped; three or more = underdamped.',
      'From the patient outwards: the site and the limb, the catheter (aspirate), each stopcock (bubbles, position), the tubing (length, kinks), the transducer (level, zero), the bag (300 mm Hg), the cable and the monitor (scale, label).',
      'If the line is faithful and still disagrees with the patient: the site (a peripheral artery in a vasoconstricted patient) or the cuff is wrong.'] },
    { h: 'Fault, finding and fix', table: { head: ['The trace', 'The flush test', 'Likely fault', 'Fix'], rows: [
      ['Slurred, no notch, narrow pulse pressure', 'Slow return, no oscillation', 'Bubble, clot, kink, soft bag, loose connection, tip against the wall', 'Clear bubbles; aspirate then flush; reposition; bag to 300; tighten'],
      ['Spiky systolic, deep notch, extra waves', 'Three or more oscillations', 'Long or soft tubing, extra stopcocks, tiny bubbles', 'Shorten and simplify; use the mean meanwhile'],
      ['Normal shape, every pressure up or down together', 'Normal', 'Transducer below or above the heart; not zeroed', 'Re-level (10 cm = 7.4 mm Hg); re-zero'],
      ['Comes and goes with movement', 'Varies with position', 'Kink at the skin; catheter too short', 'Arm board, re-dress, or replace'],
      ['Flat line, ECG still running', '—', 'Stopcock off to the patient, disconnection, transducer cable out', 'Look at the patient first, then the stopcocks and the cable'],
      ['Faithful trace well below a central pressure or the cuff', 'Normal', 'Peripheral vasoconstriction: a radial-to-central gradient', 'Measure at the femoral or axillary artery'],
      ['Blood in the tubing', 'Sluggish', 'Bag below 300, empty flush bag, open stopcock', 'New bag, 300 mm Hg, aspirate and flush'],
      ['Venous pressure swings with the breath', 'Normal', 'Read off the mean instead of the strip', 'Freeze, read at end-expiration at the R wave'],
      ['Pulmonary artery trace becomes atrial or flat', 'Normal', 'Balloon left up, or the catheter has migrated', 'Deflate; pull back to a pulmonary artery trace']] } },
    { src: ['Gardner RM. Direct blood pressure measurement — dynamic response requirements. Anesthesiology 1981;54:227–36.', 'Kleinman B, Powell S, Kumar P, Gardner RM. The fast flush test measures the dynamic response of the entire blood pressure monitoring system. Anesthesiology 1992;77:1215–20.', 'Romagnoli S, Ricci Z, Quattrone D, et al. Accuracy of invasive arterial pressure monitoring in cardiovascular patients. Crit Care 2014;18:644.', 'Saugel B, et al. How to measure blood pressure using an arterial catheter: a systematic 5-step approach. Crit Care 2020;24:172.', 'Kim WY, Jun JH, Huh JW, et al. Radial to femoral arterial blood pressure differences in septic shock patients receiving high-dose norepinephrine therapy. Shock 2013;40:527–31.', 'Dorman T, Breslow MJ, Lipsett PA, et al. Radial artery pressure monitoring underestimates central arterial pressure during vasopressor therapy in critically ill surgical patients. Crit Care Med 1998;26:1646–9.', 'Lowenstein E, Little JW, Lo HH. Prevention of cerebral embolization from flushing radial-artery cannulas. N Engl J Med 1971;285:1414–5.', 'Evans DC, Doraiswamy VA, Prosciak MP, et al. Complications associated with pulmonary artery catheters. Scand J Surg 2009;98:199–208.'] }
  ] };
  T.ln_us = { title: 'Ultrasound for vascular access', kicker: 'Tell the artery from the vein, find the level, and know where the tip of the needle is — the three things the probe is for', blocks: [
    { p: 'Real-time ultrasound cuts failed attempts and arterial punctures by more than half for the internal jugular vein, and raises first-pass success for arterial lines. It only does so if the operator can do three things: identify the vessels, choose the level, and follow the tip rather than the shaft.' },
    { h: 'Artery or vein?', table: { head: ['', 'Artery', 'Vein'], rows: [
      ['Shape', 'Round', 'Oval, changes with position and breathing'],
      ['Wall', 'Thick, bright', 'Thin'],
      ['Light pressure', 'Stays round; needs firm pressure to deform', 'Collapses completely (if it does not, think thrombus — do not puncture)'],
      ['Movement', 'Pulses with each beat', 'Phasic with breathing; fills with a Valsalva or head-down tilt'],
      ['Colour Doppler', 'Pulsatile', 'Continuous, phasic; augments when the limb is squeezed'],
      ['Pulsed Doppler', 'Sharp systolic peaks', 'A low, undulating signal']] } },
    { note: 'Colour is direction relative to the probe, not red for artery: tilt the probe or flip the colour map and the colours swap. In a patient in arrest, deeply hypotensive or on ECMO or a continuous-flow pump, the artery may not pulse and the vein may: compressibility and anatomy decide.' },
    { h: 'Real images', p: 'Five real scans of a neck artery — short axis, long axis and with colour — to learn what a vessel wall, a lumen and the artefacts around them look like before the needle is in the picture.' },
    { widget: 'ln_usreal', cls: 'full' },
    { h: 'The drawn scanner', p: 'Four sites, drawn rather than scanned (no openly licensed scans of the femoral or axillary vessels could be embedded): slide the probe along the vessel, press, turn on colour, change the position of the limb — and watch what the level means for the needle. Each site has a slot for a scan of your own.' },
    { widget: 'ln_ussim', cls: 'full' },
    { h: 'Following the needle', p: 'Across the vessel (short axis, out of plane) you see both vessels side by side but only a dot of needle — and the dot looks the same whether it is the tip or the shaft. Along the vessel (long axis, in plane) you see the whole needle, but the beam is a millimetre thick and it is easy to slide off the vessel onto its neighbour.' },
    { widget: 'ln_needle', cls: 'full' },
    { h: 'A routine for every line', ol: [
      'Scan before preparing the skin: both sides, patency (compress), size, depth, what lies behind. Choose the site and the level then, not with the needle in your hand.',
      'Set the machine: linear probe, depth so that the vessel is in the middle third, gain so that the lumen is black, the screen in your line of sight beyond the needle.',
      'Orient the probe: tap one end and check which side of the screen moves. Left on the screen must be left of the probe.',
      'Sterile: probe cover with gel inside, sterile gel outside, full barrier precautions for central lines.',
      'Enter the skin a distance back from the probe equal to the depth of the vessel, at 45°; find the tip as soon as it is under the skin; walk it down by moving the probe ahead and bringing the needle to it.',
      'Watch the front wall tent and the tip enter the lumen. Flatten the needle, confirm free aspiration, pass the wire with no resistance.',
      'See the wire in the vessel in two planes — and, for a central vein, see that it is in the vein and not the artery — before dilating.'] },
    { src: ['Lamperti M, Biasucci DG, Disma N, et al. European Society of Anaesthesiology guidelines on peri-operative use of ultrasound-guided for vascular access (PERSEUS vascular access). Eur J Anaesthesiol 2020;37:344–76.', 'Franco-Sadud R, Schnobrich D, Mathews BK, et al. Recommendations on the use of ultrasound guidance for central and peripheral vascular access in adults: a position statement of the Society of Hospital Medicine. J Hosp Med 2019;14:E1–22.', 'Troianos CA, Hartman GS, Glas KE, et al. Guidelines for performing ultrasound guided vascular cannulation. J Am Soc Echocardiogr 2011;24:1291–318.', 'Brass P, Hellmich M, Kolodziej L, Schick G, Smith AF. Ultrasound guidance versus anatomical landmarks for internal jugular vein catheterization. Cochrane Database Syst Rev 2015;1:CD006962.', 'Clemmesen L, Knudsen L, Sloth E, Bendtsen T. Dynamic needle tip positioning — ultrasound guidance for peripheral vascular access. Ultraschall Med 2012;33:E321–5.', 'Images: Kostelanský M. Localization and segmentation of in-vivo ultrasound carotid artery images. Czech Technical University in Prague; sample data of github.com/kostelansky17/carotids (MIT licence).'] },
    { links: [['The POCUS Atlas — vascular access', 'https://www.thepocusatlas.com/', 'real clips of vessels, needles and wires (CC BY-NC)'], ['PERSEUS vascular access guideline (open access)', 'https://journals.lww.com/ejanaesthesiology/fulltext/2020/05000/european_society_of_anaesthesiology_guidelines_on.2.aspx', 'the European guideline, with figures of each site'], ['Society of Hospital Medicine position statement', 'https://www.journalofhospitalmedicine.com/jhospmed/article/208025/hospital-medicine/recommendations-use-ultrasound-guidance-central-and', 'recommendations with their evidence']] }
  ] };
  T.ln_artline = { title: 'Putting in an arterial line: radial, femoral, axillary', kicker: 'Choose the site for the patient, see the artery, see the tip, and connect it to a system that tells the truth', blocks: [
    { p: 'An arterial line is the commonest invasive monitor in the unit and the one most often placed in a hurry. The steps below follow the systematic approach of Saugel and colleagues and the vascular access guidelines; local policy on consent, time-out, kit and dressings applies over anything written here.' },
    { h: 'Which artery', table: { head: ['Site', 'For', 'Against', 'Catheter'], rows: [
      ['Radial', 'Superficial, dual supply to the hand, easy to compress and to nurse; lowest infection rate', 'Small (2–3 mm): fails in shock and spasm; under-reads central pressure on high-dose vasopressors; kinks with the wrist', '20 G, 3–5 cm'],
      ['Femoral', 'Large and palpable in shock and arrest; reads central pressure; complication rate comparable to radial', 'Groin: more contamination, harder to nurse and to mobilise; a high puncture bleeds into the retroperitoneum; avoid through a graft or with severe iliofemoral disease', '18–20 G, 12–16 cm, over a wire'],
      ['Axillary', 'Central pressure, clean site, arm stays mobile; good collateral supply; an option when radial has failed and the groin is unsuitable', 'Deeper; beside the cords of the brachial plexus and the vein; a flush can reach the carotids — the left side is usually preferred', '18–20 G, 12–16 cm, over a wire'],
      ['Brachial', 'Larger than the radial', 'No collaterals at the elbow; next to the median nerve; kinks with the elbow. Used where it is the unit’s practice', '20 G, 8–12 cm'],
      ['Dorsalis pedis', 'Away from the field in some operations', 'Absent in a tenth of people; the most amplified systolic; avoid in vascular disease and diabetes', '20–22 G, short']] } },
    { note: 'The modified Allen test does not predict hand ischaemia and is no longer recommended as a screen. Ischaemia after radial cannulation is rare (well under 1 in 1000); look at the hand afterwards instead. Do not cannulate a limb with a fistula, a graft, lymphoedema, infection or burns at the site, or known severe disease of that artery.' },
    { h: 'Before any of them', ol: [
      'Indication, consent where possible, and a pause: right patient, right side, allergies, anticoagulation (correct what is reasonable; a radial line is the lowest-risk site in coagulopathy because it can be compressed).',
      'Prime the system first: 500 mL of 0.9% saline in a pressure bag at 300 mm Hg, short stiff tubing, every bubble out of the transducer and stopcocks, transducer zeroed and fixed at the phlebostatic axis.',
      'Scan: both sides if needed. Confirm the artery (round, thick-walled, pulsing, not compressible), measure its depth and diameter, look for calcification, a high bifurcation, a neighbouring vein.',
      'Asepsis: hand hygiene, chlorhexidine in alcohol left to dry, cap, mask, sterile gloves, a fenestrated drape, a sterile probe cover. For the femoral and axillary arteries use full barrier precautions as for a central line: cap, mask, gown, large drape.',
      'Local anaesthetic to the skin and around (not into) the artery in an awake patient: it also reduces spasm.'] },
    { h: 'Radial artery', ol: [
      'Wrist extended 30–45° over a small roll, hand taped; over-extension flattens the artery.',
      'Probe across the wrist 2–4 cm above the crease, resting with almost no pressure. Centre the artery; note its depth (usually 3–5 mm).',
      'Needle at 30–45°, entering a few millimetres back from the probe. Find the tip, then walk it down: probe forward a millimetre or two, needle forward until the dot reappears, until the dot sits in the middle of the lumen.',
      'Drop the angle to 10–20°, advance 1–2 mm more so that the catheter (not just the needle bevel) is inside, then slide the catheter off, or pass the wire and then the catheter. The wire must run without any resistance.',
      'Connect, check for a brisk flash and a pulsatile trace, flush gently by hand (2–3 mL), secure, apply a sterile transparent dressing, and do a fast-flush test.'] },
    { h: 'Femoral artery', ol: [
      'Supine, hip slightly abducted and externally rotated; retract a pannus with tape. Find the inguinal ligament (anterior superior iliac spine to pubic tubercle) — not the skin crease, which lies lower.',
      'Probe across the vessels just below the ligament. Lateral to medial: nerve, artery, vein. Slide down until the artery divides, then come back up: the target is the common femoral artery over the femoral head, 1–2 cm above the bifurcation.',
      'Needle at 45°, out of plane, tip walked down to the front wall at the 12 o’clock position; a single-wall puncture.',
      'Pulsatile flash. Wire in without resistance (if it stops, do not push: flatten the needle, rotate the J tip, re-image). See the wire in the artery in long axis.',
      'A small nick, the catheter over the wire, wire out, connect, secure with a suture or a securement device, dress.'] },
    { note: 'Too high (above the ligament, into the external iliac artery) risks retroperitoneal bleeding that cannot be compressed: unexplained hypotension, flank or back pain or a falling haemoglobin after a femoral puncture is this until a CT says otherwise. Too low (at or below the bifurcation) risks pseudoaneurysm, arteriovenous fistula and limb ischaemia.' },
    { h: 'Axillary artery', ol: [
      'Two approaches. In the axilla: arm abducted 90° and externally rotated, probe high in the axilla across the arm; the artery is superficial (1–2 cm) with the median, ulnar and radial nerves around it and the veins on its medial side. Below the clavicle: probe in the deltopectoral groove along the body; the artery lies under the pectoral muscles, towards the head from the vein, with the pleura deep and medial.',
      'Identify artery, vein (compress), nerves (bright, honeycombed) and — below the clavicle — the pleura. Choose the level where the artery is clear of the vein and the pleura is furthest.',
      'In plane is preferred below the clavicle: the whole needle is seen from skin to artery, entering from the head end of the probe. In the axilla either plane works; keep the needle on the superficial surface of the artery, away from the nerves.',
      'Stop if the patient reports a shooting pain or a muscle twitches: the tip is at a nerve. Withdraw and redirect.',
      'Wire without resistance, catheter over the wire (12–16 cm), connect and secure. Flush this line slowly and in small volumes, and prefer the left side: a forceful flush of an axillary catheter can reach the vertebral and carotid arteries.'] },
    { h: 'When it does not go', table: { head: ['Problem', 'What is happening', 'What to do'], rows: [
      ['Flash, then the wire will not pass', 'The bevel is only partly in the lumen, or against the far wall, or the artery is in spasm or diseased', 'Do not force. Lower the angle; withdraw or advance 1 mm with the probe on; rotate the needle; re-image. A wire forced into the wall dissects it'],
      ['The artery rolls away or flattens', 'Too much probe pressure; wrist over-extended; a mobile artery', 'Lighten the probe; fix the skin; a quicker, shorter puncture'],
      ['Flash, but the catheter will not thread', 'Only the needle tip is inside', 'Advance needle and catheter together 1–2 mm at a flat angle before sliding; or use a wire'],
      ['The pulse has gone after two attempts', 'Spasm or a haematoma', 'Stop, hold pressure, move proximally or to another site. More attempts at the same point fail'],
      ['Dark, non-pulsatile blood', 'A vein — or a shocked, hypoxaemic artery', 'Transduce it or send a gas before deciding; look again with ultrasound'],
      ['Damped trace from the start', 'Kinked catheter, tip against the wall, a bubble', 'Check the system, then withdraw the catheter 1–2 mm; replace over a wire if it is kinked']] } },
    { h: 'Afterwards', ul: [
      'Fast-flush test; level and zero; compare once with a cuff. Label the line as arterial and never inject into it.',
      'Look at the limb every shift: colour, capillary refill, temperature, sensation; a white or painful hand or foot means the line comes out and vascular surgery is called.',
      'Site inspection daily, chlorhexidine dressing as the unit uses for central lines if femoral or axillary. Do not change the line routinely; remove it the day it is no longer needed.',
      'On removal: firm pressure for at least 5 minutes at the wrist and 10–15 at the groin or axilla (longer if anticoagulated), then check for a haematoma and a pulse.'] },
    { src: ['Saugel B, Kouz K, Meidert AS, Schulte-Uentrop L, Romagnoli S. How to measure blood pressure using an arterial catheter: a systematic 5-step approach. Crit Care 2020;24:172.', 'Scheer BV, Perel A, Pfeiffer UJ. Clinical review: complications and risk factors of peripheral arterial catheters used for haemodynamic monitoring in anaesthesia and intensive care medicine. Crit Care 2002;6:199–204.', 'Lamperti M, et al. PERSEUS vascular access. Eur J Anaesthesiol 2020;37:344–76.', 'Seto AH, Abu-Fadel MS, Sparling JM, et al. Real-time ultrasound guidance facilitates femoral arterial access and reduces vascular complications (FAUST). JACC Cardiovasc Interv 2010;3:751–8.', 'Htet N, Vaughn J, Adigopula S, Hennessey E, Mihm F. Needle-guided ultrasound technique for axillary artery catheter placement in critically ill patients: a case series and technique description. J Crit Care 2017;41:194–7.', 'Shiloh AL, Savel RH, Paulin LM, Eisen LA. Ultrasound-guided catheterization of the radial artery: a systematic review and meta-analysis of randomized controlled trials. Chest 2011;139:524–9.', 'O’Grady NP, Alexander M, Burns LA, et al. Guidelines for the prevention of intravascular catheter-related infections. Clin Infect Dis 2011;52:e162–93.', 'Barone JE, Madlinger RV. Should an Allen test be performed before radial artery cannulation? J Trauma 2006;61:468–70.'] }
  ] };
  T.ln_cvc = { title: 'Putting in a central line: internal jugular, subclavian–axillary, femoral', kicker: 'The site is a trade between infection, thrombosis and mechanical harm; the technique is the same at all three — and the wire is confirmed in the vein before anything dilates', blocks: [
    { p: 'The steps follow the 2020 practice guidelines of the American Society of Anesthesiologists, the ultrasound guidelines and the 2022 infection-prevention compendium. Local policy on consent, checklists, kit, confirmation and who may dilate applies over anything written here.' },
    { h: 'Which vein', table: { head: ['Site', 'For', 'Against'], rows: [
      ['Subclavian / axillary', 'Fewest infections and thromboses (3SITES); comfortable; the site preferred in the ICU for infection', 'Most pneumothoraces (about 1.5%); cannot be compressed — avoid in coagulopathy; avoid if dialysis access may ever be needed on that side (stenosis); harder under ultrasound unless approached as the axillary vein below the clavicle'],
      ['Internal jugular (right first)', 'Straight path to the right atrium; easy with ultrasound; compressible; preferred for dialysis catheters and pulmonary artery catheters', 'More infection and thrombosis than subclavian; carotid beside it; uncomfortable; dressings near the mouth and a tracheostomy'],
      ['Femoral', 'Fast, compressible, away from the airway and the chest: arrests, severe coagulopathy, a patient who cannot lie flat', 'Most thrombosis; more infection in the obese; no CVP or central venous saturation of the upper body; limits mobility. Any line placed in an emergency without full precautions is replaced within 48 hours']] } },
    { h: 'Every central line', ol: [
      'Is it needed? Could peripheral or midline access do? Which lumens, for what, for how long?',
      'Consent and a time-out; check platelets, INR and anticoagulants (ultrasound and a compressible site matter more than chasing numbers); check for a pacemaker, a filter, known thrombosis or stenosis, previous lines.',
      'Position: 10–15° head-down for neck and chest sites (fills the vein and guards against air); reverse it for the groin. Monitor ECG, saturation and pressure.',
      'Scan before preparing: patency and size on both sides, the artery’s position relative to the vein, the pleura.',
      'Maximal barrier precautions: hand hygiene, cap, mask, sterile gown and gloves, a full-body drape; chlorhexidine in alcohol, left to dry; a sterile probe cover. Use an all-in-one kit and a checklist with an observer empowered to stop the procedure.',
      'Flush every lumen and clamp or cap all but the distal one before starting.',
      'Real-time ultrasound puncture with the tip in view; aspirate dark, non-pulsatile blood; pass the wire with no resistance, never beyond 20 cm (ectopics mean it is in the heart: pull back). Keep hold of the wire at all times.',
      'Before dilating, prove the wire is in the vein: see it in the vein in short and long axis down to where the vein leaves the picture, and see that the artery is empty. If there is any doubt, connect tubing to the needle or a small catheter for manometry or a transduced waveform. Colour and pulsatility of the blood are not reliable.',
      'Small skin nick; dilate only through skin and subcutaneous tissue to the vein — not to the hilt; catheter over the wire, wire out, aspirate and flush every lumen, cap them.',
      'Secure, apply a chlorhexidine-impregnated dressing, document depth at the skin. Confirm the tip and exclude a pneumothorax before use (film, or ultrasound: lung sliding on both sides and a saline flush seen in the right atrium within 2 seconds).'] },
    { h: 'Internal jugular vein', ol: [
      'Head near the midline, turned no more than 30°: further rotation rolls the vein on top of the carotid.',
      'Probe across the neck at the level of the cricoid, between the heads of sternocleidomastoid. The vein is lateral to and in front of the carotid, compressible, and fills with a Valsalva or with the head down.',
      'Needle at 45°, out of plane or in plane, aimed away from the carotid; stop as soon as the tip is in the lumen — the back wall and what lies behind it (carotid, vertebral artery, pleura low in the neck) are the hazards.',
      'Depth at the skin: right side 13–16 cm in an adult (height in cm ÷ 10), left side 17–20 cm (height ÷ 10, plus 4).'] },
    { h: 'Subclavian / axillary vein', ol: [
      'A roll between the shoulders is optional; arm by the side or abducted. Head-down.',
      'By landmarks: enter 1–2 cm below the clavicle at the junction of its medial and middle thirds, aim at the sternal notch, needle flat to the chest and under the clavicle. Bevel towards the feet as the wire goes in, to turn it down.',
      'By ultrasound (preferred where the skill exists): the axillary vein below the lateral clavicle, long axis and in plane, entering from the lateral end of the probe so that the whole needle is seen with the rib or pleura beneath it. The vein is towards the feet from the artery and collapses with inspiration.',
      'Depth: right about height ÷ 10 minus 2 cm; left about height ÷ 10 plus 2 cm.',
      'A wire that meets resistance or runs up the neck: look with the probe at the internal jugular vein before going further.'] },
    { h: 'Femoral vein', ol: [
      'Supine or slightly head-up; hip abducted and externally rotated (frog-leg), which moves the vein out from behind the artery; retract a pannus.',
      'Probe across the vessels just below the inguinal ligament. Lateral to medial: nerve, artery, vein. The vein is medial, oval, and collapses with light pressure; confirm that it does (a vein that will not collapse holds thrombus).',
      'Puncture the common femoral vein where it lies beside the artery, 1–2 cm below the ligament and above the saphenous junction; further down it slides behind the artery.',
      'Needle at 45°, medial to the arterial pulse, tip in view. Dark non-pulsatile blood; wire with no resistance; see the wire in the vein and follow it upwards.',
      'Use a catheter of at least 20 cm (24 cm or more for a dialysis catheter) so that the tip lies in the inferior vena cava; a short catheter ends in the iliac vein, recirculates and clots.'] },
    { h: 'Where the tip should be', table: { head: ['Line', 'Tip', 'On the film'], rows: [
      ['Neck or chest', 'Lower third of the superior vena cava, at or just above the cavo-atrial junction, parallel to the wall', 'About two vertebral bodies below the carina; not above the carina on the left (it abuts the wall), not in the right atrium for a soft multilumen line'],
      ['Dialysis catheter (neck)', 'Cavo-atrial junction or upper right atrium', 'Right internal jugular 15–16 cm, left 19–20 cm'],
      ['Femoral', 'Inferior vena cava', 'Dialysis: 24–25 cm or longer']] } },
    { h: 'When it goes wrong', table: { head: ['Event', 'Recognise it by', 'Do'], rows: [
      ['Arterial puncture with the needle', 'Bright, pulsatile blood — unless shocked or hypoxaemic; manometry rises; ultrasound', 'Needle out, press for 5–10 min (neck, groin), watch for a haematoma; choose another site'],
      ['Dilator or catheter in an artery', 'A pulsatile trace, arterial gas, a line that crosses the midline on the film', 'Leave it in place. Do not pull it and press. Call vascular surgery or interventional radiology: removal from a carotid or subclavian artery needs a repair'],
      ['Wire will not pass', 'Resistance', 'Never force. Check the flash, flatten the needle, rotate the J; if the wire will not come back through the needle, remove both together'],
      ['Ectopics or a run of tachycardia', 'The monitor', 'Pull the wire back to under 20 cm'],
      ['Air embolism', 'Sudden breathlessness, hypoxaemia, hypotension, a mill-wheel murmur, a fall in end-tidal CO2', 'Occlude the hub, head-down and left side down, 100% oxygen, aspirate from the line, support the circulation'],
      ['Pneumothorax', 'Breathlessness, rising airway pressures, absent lung sliding; may appear hours later', 'Ultrasound, film; drain if large, symptomatic or on positive pressure'],
      ['Wire lost in the patient', 'It is gone', 'Hold pressure at the site, do not move the limb, film, interventional radiology'],
      ['Malposition', 'Tip up the neck, across the midline, in the atrium, against the wall', 'Reposition over a wire with full precautions, or replace']] } },
    { h: 'Taking it out', ul: [
      'Review the need every day; a line no longer needed is the commonest avoidable cause of infection.',
      'For a neck or chest line: patient flat or head-down, remove during expiration or a Valsalva, press, and cover with an airtight dressing for 24 hours. Air embolism through the track after removal is rare and lethal.',
      'Do not exchange a line over a wire when infection at the site or bloodstream infection is suspected.'] },
    { src: ['Practice guidelines for central venous access 2020: an updated report by the American Society of Anesthesiologists Task Force on Central Venous Access. Anesthesiology 2020;132:8–43.', 'Buetti N, Marschall J, Drees M, et al. Strategies to prevent central line-associated bloodstream infections in acute-care hospitals: 2022 update. Infect Control Hosp Epidemiol 2022;43:553–69.', 'Parienti JJ, Mongardon N, Mégarbane B, et al. Intravascular complications of central venous catheterization by insertion site (3SITES). N Engl J Med 2015;373:1220–9.', 'Lamperti M, et al. PERSEUS vascular access. Eur J Anaesthesiol 2020;37:344–76.', 'Franco-Sadud R, et al. Society of Hospital Medicine position statement. J Hosp Med 2019;14:E1–22.', 'Peres PW. Positioning central venous catheters — a prospective survey. Anaesth Intensive Care 1990;18:536–9.', 'Bodenham A, Babu S, Bennett J, et al. Association of Anaesthetists of Great Britain and Ireland: safe vascular access 2016. Anaesthesia 2016;71:573–85.', 'Vezzani A, Brusasco C, Palermo S, et al. Ultrasound localization of central vein catheter and detection of postprocedural pneumothorax. Crit Care Med 2010;38:533–8.', 'Brass P, et al. Ultrasound guidance versus anatomical landmarks for subclavian or femoral vein catheterization. Cochrane Database Syst Rev 2015;1:CD011447.'] }
  ] };

  const GROUPS = [
    { title: 'Waveforms: read and fix', ids: ['ln_art_patterns', 'ln_cvp_patterns', 'ln_pa_patterns', 'ln_real', 'ln_fix'] },
    { title: 'Lines: putting them in', ids: ['ln_us', 'ln_artline', 'ln_cvc'] }
  ];
  /* join the monitoring area */
  const M = root.PFT_MONITOR;
  if (M && M.topics && !M.topics.ln_fix) { Object.keys(T).forEach(k => { M.topics[k] = T[k]; }); M.groups.splice(2, 0, GROUPS[0], GROUPS[1]); }

  root.PFT_LINES = { ART: ART, CVPTXT: CVPTXT, WEDGETXT: WEDGETXT, ACTIONS: ACTIONS, CASES: CASES, SCENES: SCENES, needleOOP: needleOOP, topics: T, groups: GROUPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PFT_LINES;
})(typeof window !== 'undefined' ? window : globalThis);
