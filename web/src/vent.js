/* ------------------------------------------------------------------ mechanical ventilation: the settings, the modes, the waveforms, and a case simulator
   Content for the Learn area (invasive and non-invasive support, nomenclature, waveform patterns and asynchronies) and a
   teaching model of a ventilated patient: lung mechanics → pressures and auto-PEEP; alveolar ventilation → PaCO2 and pH
   (with the bicarbonate as the metabolic side and renal compensation over a day); shunt and V/Q → PaO2 and SpO2 at a given
   FiO2 and PEEP; the circulation under PEEP; and the venous gas beside the arterial. Textbook numbers and shapes; the point
   is which way things move and why. Pure functions: usable in node for the tests. */
(function (root) {
  'use strict';
  const PH = root.PFT_PHYS;
  const T = {};

  /* ================================================================== the settings, one by one ================================================================== */
  const SETTINGS = [
    { id: 'mode', cat: 'The breath', name: 'Mode', aka: 'VC-AC, PC-AC, PRVC, SIMV, PSV, CPAP, APRV…', what: 'The rules the ventilator follows to start a breath (trigger), to shape it (the target: a flow and volume, or a pressure) and to end it (cycle). Everything else is a number inside those rules.', typical: 'Volume control–assist control for most intubated patients; pressure support for weaning', up: '', down: '' },
    { id: 'vt', cat: 'The breath', name: 'Tidal volume (VT)', aka: 'set volume · delivered volume · VTe (expired)', what: 'The volume of each mandatory breath in a volume-targeted mode; in a pressure-targeted mode the volume is a result, not a setting, and is read as the expired tidal volume.', typical: '6–8 mL/kg of predicted body weight (height and sex, not actual weight); 6 mL/kg in ARDS, 4–8 by plateau pressure', up: 'More alveolar ventilation (PaCO2 falls), a higher plateau and driving pressure, more stretch; over 8 mL/kg or a plateau over 30 injures the lung', down: 'Less ventilation (PaCO2 rises), less stretch; too low raises the dead-space fraction and may fail to meet the patient’s demand (air hunger, double triggering)' },
    { id: 'rr', cat: 'The breath', name: 'Respiratory rate (f)', aka: 'set rate · backup rate · total rate (set plus patient-triggered)', what: 'The number of mandatory breaths a minute. The patient can trigger more in assist-control (each a full breath) and in SIMV (supported breaths). The total rate is what matters for the gases.', typical: '12–20; 20–35 in ARDS at low tidal volume; 10–14 in asthma and COPD to lengthen expiration', up: 'More minute ventilation and a lower PaCO2 — until expiratory time is too short: auto-PEEP, trapping, a rising PaCO2 from dead space', down: 'A higher PaCO2; a longer expiration (less auto-PEEP); in a patient with drive the total rate may not fall at all' },
    { id: 'peep', cat: 'The breath', name: 'PEEP', aka: 'positive end-expiratory pressure · extrinsic PEEP · EPAP on NIV · total PEEP = set + auto', what: 'The pressure the ventilator keeps in the circuit at end-expiration. It keeps recruitable alveoli open between breaths (oxygenation, less atelectrauma), raises the lung volume, and raises the pressure around the heart.', typical: '5 for most; 8–16 in ARDS by the FiO2 table or the best compliance; 0–5 in asthma; up to 80% of the auto-PEEP in a triggering COPD patient', up: 'Better oxygenation when there is recruitable lung; a higher plateau and mean airway pressure; less venous return (hypotension in the hypovolaemic); overdistension and more dead space beyond the recruitable range', down: 'Derecruitment and a falling PaO2 in ARDS; easier triggering lost in COPD' },
    { id: 'fio2', cat: 'The breath', name: 'FiO2', aka: 'fraction of inspired oxygen, 0.21–1.0', what: 'The oxygen concentration delivered. Raises the alveolar PO2 and so the PaO2 for every mechanism except a true shunt, where the response is small.', typical: 'Start at 1.0 after intubation, then the lowest that keeps SpO2 88–95% (COPD 88–92%)', up: 'A higher PaO2 unless the problem is shunt; above 0.6 for days, oxygen toxicity and absorption atelectasis', down: 'Hypoxaemia; a falling SpO2 on a low FiO2 says the shunt or V/Q mismatch is large' },
    { id: 'ti', cat: 'Timing', name: 'Inspiratory time (Ti)', aka: 'set directly in pressure control; a result of flow and volume in volume control', what: 'How long inspiration lasts. With the rate it fixes the expiratory time: Te = 60/f − Ti.', typical: '0.8–1.2 s; short (0.7–0.9) in obstruction to lengthen expiration', up: 'A longer inspiration and a higher mean airway pressure (oxygenation); a shorter expiration (auto-PEEP in obstruction); in PC a fuller delivered volume', down: 'More time to exhale; in PC a smaller volume if the lung has not finished filling' },
    { id: 'ie', cat: 'Timing', name: 'I:E ratio', aka: 'inspiratory to expiratory time', what: 'The same information as Ti and the rate written as a ratio. Normal breathing is about 1:2.', typical: '1:2 to 1:3; 1:4 or longer in asthma and COPD; inverse ratios (2:1) only in APRV-type strategies', up: '', down: '' },
    { id: 'flow', cat: 'Timing', name: 'Inspiratory flow', aka: 'peak flow · flow rate (volume control only)', what: 'How fast the volume is delivered in a volume-targeted breath. Volume / flow = inspiratory time, so flow sets Ti in VC.', typical: '40–60 L/min; 60–100 L/min in obstruction (a short Ti, a long Te); match it to the patient’s demand or they will “flow-starve”', up: 'A shorter Ti, a longer Te, a higher peak pressure (the resistive part), comfort in a patient with high drive', down: 'A longer Ti and higher mean pressure; a scooped pressure curve and air hunger if the patient wants more' },
    { id: 'pattern', cat: 'Timing', name: 'Flow pattern', aka: 'square (constant) · decelerating (ramp)', what: 'The shape of the flow in volume control. Constant flow gives the clean pressure ramp used to read resistance and compliance; a decelerating ramp lowers the peak pressure and feels more natural.', typical: 'Square for mechanics measurements; decelerating for comfort', up: '', down: '' },
    { id: 'pinsp', cat: 'Pressure targets', name: 'Inspiratory pressure (Pinsp)', aka: 'pressure control level · ΔP above PEEP (some ventilators set the absolute peak instead)', what: 'The pressure held for the inspiratory time in a pressure-targeted breath. The volume that results depends on compliance, resistance, Ti and the patient’s effort.', typical: '12–20 cm H2O above PEEP; set to give 6–8 mL/kg', up: 'A larger volume (until the lung is full within Ti), more stretch', down: 'A smaller volume; the patient may pull more if awake' },
    { id: 'ps', cat: 'Pressure targets', name: 'Pressure support (PS)', aka: 'inspiratory pressure in a spontaneous mode · IPAP − EPAP on NIV', what: 'A pressure added on top of PEEP for every patient-triggered breath, held until the flow falls to the cycle-off threshold. The patient sets the rate and the timing; the support sets how much of the work the machine does.', typical: '5–8 cm H2O to overcome the tube (a spontaneous breathing trial); 10–20 for support', up: 'Larger breaths and less work for the patient; too much and the patient over-breathes, cycles late, or stops driving', down: 'Smaller breaths, more work: the rapid shallow pattern of a failing trial' },
    { id: 'rise', cat: 'Pressure targets', name: 'Rise time', aka: 'inspiratory rise · slope · flow acceleration (%)', what: 'How quickly the pressure climbs to the target at the start of a pressure-targeted breath.', typical: 'Fast (0.1–0.2 s) for high drive; slower if the pressure overshoots', up: 'Faster rise: more initial flow, comfort in air hunger; an overshoot spike if too fast', down: 'A gentler start; a scooped early breath if the patient wants more' },
    { id: 'cycle', cat: 'Pressure targets', name: 'Cycle-off (expiratory trigger sensitivity)', aka: 'ETS · flow cycle %', what: 'In pressure support, the percentage of the peak inspiratory flow at which the breath ends. The patient’s own inspiratory time is matched by moving it.', typical: '25% (default); 40–60% in COPD and leak to end the breath sooner; 10–15% in a stiff lung to lengthen it', up: 'A shorter breath (helps the obstructed patient and leaks); too high and the breath is cut short (premature cycling, double triggering)', down: 'A longer breath; too low in COPD or a leak and the breath runs on into the patient’s expiration (delayed cycling)' },
    { id: 'trigger', cat: 'Triggering', name: 'Trigger sensitivity', aka: 'flow trigger (L/min) · pressure trigger (cm H2O below PEEP)', what: 'The effort the patient must make to start a breath: a flow deflection of 1–3 L/min or a pressure drop of 1–2 cm H2O. Auto-PEEP sits on top of this threshold: the patient must first pull the alveolar pressure down to the circuit pressure.', typical: 'Flow 1–3 L/min (more sensitive); pressure −1 to −2 cm H2O', up: 'Harder to trigger (less sensitive): ineffective efforts, more work', down: 'Easier to trigger; too sensitive and the circuit auto-triggers (leaks, cardiac oscillations, water in the tubing)' },
    { id: 'backup', cat: 'Triggering', name: 'Backup (apnoea) ventilation', aka: 'apnoea rate · apnoea interval', what: 'In spontaneous modes, the mandatory breaths that start if the patient stops triggering for the set interval (15–20 s).', typical: 'Rate 10–12 with a volume or pressure near the support level', up: '', down: '' },
    { id: 'pmax', cat: 'Alarms and limits', name: 'High pressure limit (Pmax)', aka: 'peak pressure alarm · pressure limit', what: 'The peak pressure at which the breath is cut and the alarm sounds. In volume control it is a safety valve; in pressure-regulated modes it caps what the ventilator will use.', typical: '10 cm H2O above the usual peak; 35–40 in most patients', up: '', down: '' },
    { id: 'plateau', cat: 'Measurements', name: 'Plateau pressure (Pplat)', aka: 'inspiratory hold · static pressure · end-inspiratory pause', what: 'The airway pressure during a 0.5–1 s pause at end-inspiration, when there is no flow: the alveolar pressure, and the stress the respiratory system sees. Peak minus plateau is the resistive pressure.', typical: 'Keep ≤ 30 cm H2O (lower is better); ≤ 25–28 when the chest wall is normal', up: '', down: '' },
    { id: 'dp', cat: 'Measurements', name: 'Driving pressure (ΔP)', aka: 'plateau − total PEEP = VT / Crs', what: 'The pressure that produces the tidal volume: the tidal strain the lung sees. The strongest ventilator variable associated with survival in ARDS.', typical: '≤ 15 cm H2O; a VT that keeps it under 15 is the right VT', up: '', down: '' },
    { id: 'autopeep', cat: 'Measurements', name: 'Auto-PEEP', aka: 'intrinsic PEEP · occult PEEP · PEEPi; measured by an expiratory hold', what: 'Pressure left in the alveoli at end-expiration because they have not emptied: long time constants (resistance × compliance) and short expiratory times. It adds to the set PEEP for the plateau and the heart, and is a threshold the patient must overcome to trigger.', typical: '0 normally; 5–15 in a tight asthmatic or a fast-breathing COPD patient', up: '', down: '' },
    { id: 'mv', cat: 'Measurements', name: 'Minute ventilation (V̇E)', aka: 'VT × total rate; expired minute volume', what: 'The volume moved per minute. The PaCO2 depends on the alveolar part of it: (VT − dead space) × rate.', typical: '6–8 L/min at rest; 10–15 in sepsis, acidosis, high dead space', up: '', down: '' },
    { id: 'mean', cat: 'Measurements', name: 'Mean airway pressure', aka: 'Paw mean', what: 'The pressure averaged over the whole cycle: the lever on oxygenation (PEEP, Ti, Pinsp all raise it) and on venous return.', typical: '10–20 cm H2O; over 25–30 pushes on the circulation', up: '', down: '' },
    { id: 'crs', cat: 'Measurements', name: 'Compliance and resistance', aka: 'Crs = VT / (Pplat − PEEPtot) · Raw = (Ppeak − Pplat) / flow', what: 'Read from a constant-flow breath with an inspiratory hold. Crs 50–100 mL/cm H2O ventilated normal; 20–40 in ARDS. Raw under 10 cm H2O/L/s through a tube; 15–30 in bronchospasm.', typical: '', up: '', down: '' },
    { id: 'ipap', cat: 'Non-invasive', name: 'IPAP / EPAP', aka: 'inspiratory and expiratory positive airway pressure (BiPAP); the difference is the pressure support', what: 'The two pressures of bilevel NIV: EPAP is the PEEP (recruitment, splinting the upper airway, offsetting auto-PEEP); IPAP − EPAP is the support that unloads the muscles and raises the tidal volume.', typical: 'IPAP 10–12 to start, up to 20–25; EPAP 4–5 (8–10 in obesity hypoventilation or oedema); a backup rate of 12–15 in S/T', up: 'More IPAP: larger breaths, a lower PaCO2, more leak and gastric insufflation; more EPAP: better oxygenation, easier triggering against auto-PEEP, less support unless IPAP rises with it', down: '' },
    { id: 'hfnc', cat: 'Non-invasive', name: 'High-flow nasal oxygen', aka: 'HFNC · flow (L/min), FiO2, temperature', what: 'Heated, humidified gas at 30–60 L/min through large nasal prongs: a reliable FiO2 (the flow exceeds the patient’s), a few cm H2O of PEEP with the mouth closed, washout of the nasopharyngeal dead space, and comfort.', typical: 'Flow 40–60 L/min, FiO2 to target, 34–37 °C', up: 'More flow: more PEEP effect and washout, better matching of a high inspiratory demand', down: '' },
    { id: 'leak', cat: 'Non-invasive', name: 'Leak', aka: 'intentional (exhalation port) and unintentional (mask)', what: 'NIV always leaks. The ventilator compensates for the intentional leak; an unintentional leak steals volume, delays cycling and causes auto-triggering.', typical: 'Under 20–25 L/min unintentional', up: '', down: '' },
    { id: 'phigh', cat: 'Other modes', name: 'P-high / P-low / T-high / T-low', aka: 'APRV settings', what: 'Airway pressure release ventilation: a high CPAP held most of the cycle (P-high for T-high, 4–6 s) with brief releases to P-low (0–5) for T-low (0.5–0.8 s, ended at 75% of the peak expiratory flow); the patient breathes spontaneously throughout.', typical: 'P-high 25–30, P-low 0, T-high 4–6 s, T-low 0.5–0.8 s', up: '', down: '' },
    { id: 'prvc', cat: 'Other modes', name: 'Target volume (PRVC / VC+ / AutoFlow)', aka: 'pressure-regulated volume control · adaptive pressure control', what: 'A pressure-targeted breath whose pressure the ventilator adjusts breath by breath to deliver a set volume: the comfort of pressure control with a guaranteed volume. The trap: a patient who pulls hard gets a large volume at a low pressure, and the ventilator lowers its support further.', typical: 'Set the volume as in VC; watch the pressure it needs', up: '', down: '' },
    { id: 'atc', cat: 'Other modes', name: 'Automatic tube compensation', aka: 'ATC · TC', what: 'Extra pressure proportional to flow to cancel the resistance of the endotracheal tube, so a breathing trial reflects the lungs and not the tube.', typical: 'On, 100%, with the tube size entered', up: '', down: '' },
    { id: 'humid', cat: 'Other', name: 'Humidification', aka: 'heated humidifier · HME (heat and moisture exchanger)', what: 'The tube bypasses the nose; without humidification secretions dry and the tube blocks. An HME adds 50–90 mL of dead space and resistance — a heated humidifier is better in hypercapnia and in asthma.', typical: '', up: '', down: '' }
  ];

  /* ================================================================== the modes ================================================================== */
  const MODES = [
    { id: 'vcac', name: 'Volume control – assist control', aka: 'VC-AC · CMV · A/C volume', trigger: 'Time (the set rate) or patient (flow/pressure)', target: 'Flow, and so volume', cycle: 'Volume delivered', breaths: 'Every breath, set or triggered, is the full set volume', pros: 'A guaranteed minute ventilation; the clearest mechanics (constant flow + hold gives Pplat, Crs, Raw); the default for a sick patient', cons: 'Pressure is whatever it takes: watch the plateau; a fixed flow can starve a patient with high drive; every trigger gives a full breath (hyperventilation, breath stacking)', when: 'ARDS, shock, most intubations, anyone who must have a known volume' },
    { id: 'pcac', name: 'Pressure control – assist control', aka: 'PC-AC · PCV', trigger: 'Time or patient', target: 'Pressure (Pinsp) for the inspiratory time', cycle: 'Time (Ti)', breaths: 'Every breath holds the set pressure for Ti; the volume varies with mechanics and effort', pros: 'The pressure is capped by design; decelerating flow matches demand; comfortable', cons: 'No guaranteed volume — a change in compliance, resistance or auto-PEEP changes the minute ventilation silently; needs volume alarms', when: 'When the pressure must be limited (ARDS once the plateau is known), air leaks, patients who fight constant flow' },
    { id: 'prvc', name: 'Pressure-regulated volume control', aka: 'PRVC · VC+ · AutoFlow · APV', trigger: 'Time or patient', target: 'Pressure, adjusted each breath to hit a set volume', cycle: 'Time', breaths: 'Pressure-shaped breaths; the ventilator raises or lowers the pressure (within Pmax) until the expired volume equals the target', pros: 'Volume guaranteed at the lowest pressure that achieves it', cons: 'In a patient with strong drive the machine withdraws support as the patient works harder (the volume is met by effort); large breaths slip in if the patient pulls', when: 'Stable patients; not the best choice for a patient with high, variable drive' },
    { id: 'simv', name: 'Synchronised intermittent mandatory ventilation', aka: 'SIMV (VC or PC) + PS', trigger: 'Mandatory breaths at the set rate, synchronised to effort; spontaneous breaths between them', target: 'Mandatory: volume or pressure; spontaneous: pressure support', cycle: 'Mandatory as above; spontaneous by flow', breaths: 'Two kinds in one minute: full mandatory breaths, and smaller supported ones', pros: 'Historically a weaning mode; keeps a floor of mandatory breaths', cons: 'Two breath types confuse the patient; weaning by lowering the rate increases the work of breathing; no better than AC + daily trials', when: 'Rarely needed; many units have retired it' },
    { id: 'psv', name: 'Pressure support', aka: 'PSV · CPAP + PS · spontaneous mode', trigger: 'Patient only (with a backup for apnoea)', target: 'Pressure (PS above PEEP)', cycle: 'Flow (at a percentage of peak flow, default 25%)', breaths: 'The patient sets the rate, the Ti and, with the support, the volume', pros: 'Comfort and synchrony; the mode of weaning and of spontaneous breathing trials (PS 5–8)', cons: 'No guaranteed rate or volume; depends on drive; leaks and COPD cause delayed cycling; a sedated patient under-breathes', when: 'Awake, breathing patients; weaning; NIV is the same breath through a mask' },
    { id: 'cpap', name: 'CPAP', aka: 'continuous positive airway pressure · PEEP alone', trigger: 'No breaths are delivered', target: 'A constant pressure', cycle: '—', breaths: 'All the patient’s own', pros: 'Recruits and splints; the simplest spontaneous breathing trial; cardiogenic oedema and sleep apnoea', cons: 'Does no ventilatory work', when: 'Hypoxaemia with intact drive; oedema; the final step before extubation' },
    { id: 'aprv', name: 'Airway pressure release ventilation', aka: 'APRV · BiLevel · Bi-Vent', trigger: 'Time (releases); the patient breathes freely at P-high', target: 'Two pressures: a long P-high and a brief P-low', cycle: 'Time (T-high, T-low)', breaths: 'Spontaneous breaths at P-high plus the volume released each drop', pros: 'A high mean airway pressure (oxygenation) with spontaneous breathing preserved; some recruit with it', cons: 'The released volume is uncontrolled (can be large); risky in obstruction (the short T-low traps); no mortality benefit shown over low-VT ventilation', when: 'Refractory hypoxaemia in ARDS in experienced hands' },
    { id: 'nava', name: 'Proportional modes', aka: 'PAV+ · NAVA', trigger: 'Effort (airway pressure/flow, or the diaphragm’s electrical signal)', target: 'A pressure proportional to the patient’s effort', cycle: 'When the effort ends', breaths: 'All the patient’s, amplified', pros: 'Synchrony by design; the patient keeps control of volume and timing', cons: 'Need drive; NAVA needs a special oesophageal catheter; unfamiliar', when: 'Difficult synchrony in a patient with intact drive' },
    { id: 'hfov', name: 'High-frequency oscillation', aka: 'HFOV', trigger: '—', target: 'A mean airway pressure with oscillations of a few mL at 3–10 Hz', cycle: '—', breaths: 'None in the usual sense', pros: 'The lung is held open at a constant volume', cons: 'No benefit and possible harm in adult ARDS (OSCAR, OSCILLATE); heavy sedation; obscured examination', when: 'Rescue only; neonates' }
  ];

  /* ================================================================== waveforms ================================================================== */
  /* each pattern builds three traces (airway pressure, flow, volume) over a few breaths from a few mechanics numbers.
     The breath generator is the same equation of motion as the simulator: Paw = V/C + flow·R + PEEPtot (+ what the patient does). */
  const WAVES = [
    { id: 'vc_normal', name: 'Volume control, constant flow (normal lungs)', group: 'The modes', what: 'Flow is a square; pressure jumps by R × flow at the start, climbs along the compliance (slope = flow/Crs) to the peak, then falls to the plateau during the pause and to PEEP on expiration; volume is a ramp up and an exponential down.', look: 'The pressure ramp is straight when compliance is constant. Peak − plateau is the resistive pressure; plateau − PEEP the elastic.' },
    { id: 'pc_normal', name: 'Pressure control (normal lungs)', group: 'The modes', what: 'Pressure is the square now; flow starts high and decelerates as the alveolar pressure rises toward the set pressure; the volume is whatever that flow adds up to within Ti.', look: 'Flow reaching zero before the end of Ti means the lung is full — a longer Ti adds nothing. Flow still high at the end of Ti means volume was left on the table (a short Ti, a long time constant).' },
    { id: 'psv', name: 'Pressure support', group: 'The modes', what: 'The patient triggers (a small dip in pressure or flow before each breath), the pressure rises to PEEP + PS, flow decelerates, and the breath ends when flow falls to the cycle-off percentage of its peak — so the patient sets the timing.', look: 'Breath to breath the volumes differ with effort. A dip before each breath is the trigger work.' },
    { id: 'high_raw', name: 'High resistance (bronchospasm, secretions, a kinked tube)', group: 'Mechanics', what: 'In volume control the peak rises while the plateau does not: the gap between them (R × flow) is the resistance. Expiratory flow is slow and prolonged.', look: 'Peak − plateau over 10 cm H2O at a flow of 60 L/min. Treat the airway, not the ventilator: bronchodilator, suction, check the tube.' },
    { id: 'low_crs', name: 'Low compliance (ARDS, oedema, consolidation)', group: 'Mechanics', what: 'Peak and plateau rise together: the whole ramp is steep because each millilitre costs more pressure. The driving pressure (plateau − PEEP) is high for the volume.', look: 'A small peak − plateau gap with a high plateau. Lower the volume until the driving pressure is under 15; raise PEEP only if it recruits (compliance improves).' },
    { id: 'autopeep', name: 'Auto-PEEP (dynamic hyperinflation)', group: 'Mechanics', what: 'Expiratory flow has not returned to zero when the next breath starts; each breath begins from a higher volume. An expiratory hold reads the pressure left behind.', look: 'The flow trace is cut off below the baseline at every breath. Lengthen expiration: lower the rate, shorten Ti (raise the flow), lower the volume; treat the obstruction; in a triggering patient add extrinsic PEEP up to about 80% of the auto-PEEP.' },
    { id: 'starve', name: 'Flow starvation (air hunger in volume control)', group: 'Asynchrony', what: 'The patient wants more flow than the fixed square delivers: the pressure curve is scooped (concave) during inspiration because the effort pulls the circuit pressure down.', look: 'A concave pressure ramp, a patient straining at the tube. Raise the flow, switch to a decelerating pattern or to pressure control, treat the cause of the drive (pain, acidosis, fever).' },
    { id: 'double', name: 'Double triggering (breath stacking)', group: 'Asynchrony', what: 'The patient’s neural inspiration outlasts the ventilator’s breath, so the continuing effort triggers a second breath on top of the first: two breaths with no expiration between, a doubled volume.', look: 'Two stacked pressure peaks, a volume twice the set one. Lengthen the breath (more Ti, more volume, or pressure support with a lower cycle-off), sedate if the drive is pathological.' },
    { id: 'ineffective', name: 'Ineffective triggering (missed efforts)', group: 'Asynchrony', what: 'The patient tries but the ventilator does not notice: small dips in pressure and humps in the expiratory flow with no breath delivered. The usual causes are auto-PEEP (the effort is spent reaching the trigger threshold), weak muscles, over-support with large volumes, deep sedation.', look: 'Notches in the expiratory flow. The true respiratory rate is higher than the ventilator’s. Treat the auto-PEEP, lower the support, make the trigger more sensitive, add PEEP to offset the auto-PEEP.' },
    { id: 'delayed', name: 'Delayed cycling (in pressure support)', group: 'Asynchrony', what: 'The breath runs on after the patient has stopped breathing in: the flow decays slowly (COPD) or never reaches the cycle threshold (a leak), the patient starts to exhale against the support, and the pressure bumps up at the end of the breath.', look: 'A pressure hump at the end of inspiration, a long Ti. Raise the cycle-off percentage (40–60%), fix the leak, shorten the rise, lower the support.' },
    { id: 'premature', name: 'Premature cycling (in pressure support)', group: 'Asynchrony', what: 'The breath ends before the patient has finished inhaling (a high cycle-off or a stiff lung with fast-decaying flow): the effort continues and may trigger again — a short breath followed by a second.', look: 'A short Ti, a flow that reverses then dips back toward inspiration, often a double trigger. Lower the cycle-off percentage, raise the support.' },
    { id: 'leak', name: 'Leak (NIV, a cuff leak, a chest drain)', group: 'Asynchrony', what: 'Inspired volume exceeds expired; the volume trace does not come back to baseline; in pressure support the inspiratory flow never falls enough to cycle (delayed cycling) and the machine may auto-trigger.', look: 'Expired volume well below inspired; the volume baseline climbing. Fit the mask, check the cuff, use a time-cycled backup or a higher cycle-off.' },
    { id: 'secretions', name: 'Secretions or water in the circuit', group: 'Asynchrony', what: 'A sawtooth on the flow (and pressure) trace from gas bubbling through liquid; auto-triggering from the oscillations.', look: 'A jagged expiratory flow. Suction; drain the tubing.' },
    { id: 'stress', name: 'Stress index (volume control, constant flow)', group: 'Mechanics', what: 'The shape of the pressure ramp during constant-flow inspiration: straight means compliance is constant; concave upward (steepening) means overdistension is beginning at end-inspiration; convex (flattening) means recruitment is still happening as the breath proceeds.', look: 'Upward concavity: lower the volume or PEEP. Downward convexity: more PEEP may recruit.' }
  ];
  function wave(id) {
    // mechanics for the pattern
    const m = { peep: 5, crs: 60, raw: 8, vt: 500, flow: 60, ti: 1.0, rr: 15, pause: 0.3, mode: 'vc', ps: 10, pinsp: 15, cyc: 0.25, effort: 0, drive: 0, leak: 0, saw: 0, stackAt: -1, missed: false, delayed: false, premature: false, stress: 0, autoRR: 0 };
    const o = {
      vc_normal: {}, pc_normal: { mode: 'pc' }, psv: { mode: 'ps', drive: 1 }, high_raw: { raw: 25 }, low_crs: { crs: 25, vt: 420 }, autopeep: { raw: 20, crs: 70, rr: 24, ti: 1.0 },
      starve: { effort: 1, flow: 40, ti: 1.5 }, double: { stackAt: 1, ti: 0.7, flow: 60, vt: 350 }, ineffective: { missed: true, raw: 20, crs: 70, rr: 12 }, delayed: { mode: 'ps', drive: 1, delayed: true, raw: 20, crs: 70 },
      premature: { mode: 'ps', drive: 1, premature: true, crs: 30 }, leak: { mode: 'ps', drive: 1, leak: 1 }, secretions: { saw: 1 }, stress: { stress: 1, crs: 45 }
    }[id] || {};
    Object.assign(m, o);
    const dt = 0.01, T = 60 / m.rr, N = Math.round(3.2 * T / dt);
    const t = [], paw = [], flow = [], vol = [];
    const tau = m.raw * m.crs / 1000;
    const tiVC = m.vt / (m.flow * 1000 / 60);
    const psTi = m.delayed ? 2.2 : (m.premature ? 0.45 : 0.9);
    // when the breaths start: on the clock, plus a stacked breath right after each one when the patient double-triggers
    const starts = [];
    for (let k = 0; k < 5; k++) { starts.push(k * T); if (m.stackAt >= 0 && k >= 1) starts.push(k * T + tiVC + m.pause + 0.08); }
    const ended = {};
    let V = 0, auto = 0;
    for (let i = 0; i < N; i++) {
      const tt = i * dt; t.push(tt);
      let bi = 0; for (let k = 0; k < starts.length; k++) if (starts[k] <= tt + 1e-9) bi = k;
      const s = tt - starts[bi];
      let f = 0, p = m.peep, inInsp = false;
      if (!ended[bi]) {
        if (m.mode === 'vc') {
          if (s < tiVC) { inInsp = true; f = m.flow / 60; }
          else if (s < tiVC + m.pause) { inInsp = true; f = 0; }
          else ended[bi] = true;
          if (inInsp) {
            const effortP = m.effort ? -6 * Math.sin(Math.PI * Math.min(1, s / tiVC)) : 0;
            const stressP = m.stress ? 6 * Math.pow(Math.min(1, s / tiVC), 3) : 0;
            p = m.peep + auto + V / m.crs * 1000 + f * m.raw + (s < tiVC ? effortP + stressP : 0);
          }
        } else {
          const target = m.mode === 'pc' ? m.pinsp : m.ps, pAlv = auto + V / m.crs * 1000;
          f = Math.max(0, (target - pAlv) / m.raw) * (1 - Math.exp(-s / 0.08));
          if (m.leak) f += 0.15;
          const peakF = Math.max(0.05, (target - auto) / m.raw);
          const end = m.mode === 'pc' ? s >= m.ti : (m.leak ? s >= 2.4 : ((f <= m.cyc * peakF + 0.001 && s > 0.2) || s >= psTi));
          if (end) { ended[bi] = true; f = 0; }
          else { inInsp = true; p = m.peep + target * Math.min(1, s / 0.1); if (m.delayed && s > 1.4) p += 4 * Math.sin(Math.PI * Math.min(1, (s - 1.4) / 0.8)); }
        }
        if (inInsp) V += f * dt;
      }
      if (!inInsp) {
        const fe = -V / tau;
        const sawt = m.saw ? 0.25 * Math.sin(tt * 90) * Math.exp(-Math.max(0, s - tiVC - m.pause) / 0.6) : 0;
        f = fe + sawt;
        if (m.leak && f < 0) f *= 0.75;
        V = Math.max(0, V + fe * dt);
        p = m.peep + (m.saw ? 0.8 * Math.sin(tt * 90) : 0);
        if (m.missed) { const ph = (s - tiVC - m.pause) % 1.3; if (ph > 0.5 && ph < 1.0 && s > tiVC + m.pause) { const k = Math.sin(Math.PI * (ph - 0.5) / 0.5); p -= 1.5 * k; f += 0.12 * k; } }
        if (m.drive && m.mode === 'ps') { const toNext = (starts[bi + 1] !== undefined ? starts[bi + 1] : Infinity) - tt; if (toNext > 0 && toNext < 0.15) { p -= 1.2; f += 0.05; } }   // the trigger dip before the next breath
      }
      if (id === 'autopeep' || id === 'ineffective') auto = Math.max(0, V / m.crs * 1000);
      paw.push(p); flow.push(f * 60); vol.push(V * 1000);
    }
    return { t: t, paw: paw, flow: flow, vol: vol, m: m };
  }

  /* ================================================================== the simulator ================================================================== */
  const PBW = (sex, cm) => (sex === 'f' ? 45.5 : 50) + 0.91 * (cm - 152.4);
  const CASES = [
    { id: 'copd', title: 'COPD exacerbation', who: '68-year-old man, 174 cm, known COPD on home oxygen 2 L, three days of purulent sputum and breathlessness, now drowsy. RR 30, HR 112, BP 150/90, SpO2 84% on 6 L by mask, using his neck muscles, prolonged wheezy expiration.',
      abg: 'ABG on 6 L: pH 7.24 · PaCO2 78 · PaO2 55 · HCO3 32. VBG: pH 7.20 · PvCO2 86 · HCO3 33.',
      p: { sex: 'm', cm: 174, crs: 70, raw: 18, shunt: 0.05, vq: 0.2, vdAlv: 0.18, fatigue: 0.4, rrMax: 32, driveExtra: 0.2, vco2: 240, vo2: 270, hco3: 32, paco2Set: 58, rrBase: 22, driveK: 1, recruit: 0.05, hb: 15, co: 5.2, hypovol: 0, obstructive: true },
      triage: [['o2', 'More oxygen by mask and observe', 'wrong', 'He is already hypercapnic and drowsy: more oxygen alone will raise the PaCO2 (V/Q worsening, the Haldane effect, less drive) and he will arrest. Aim for SpO2 88–92% and support the ventilation.'], ['hfnc', 'High-flow nasal oxygen', 'poor', 'HFNC washes out some dead space and is comfortable, but it does not unload the muscles; in a drowsy hypercapnic COPD patient it is not the evidence-based choice. NIV is.'], ['niv', 'Non-invasive ventilation (BiPAP)', 'best', 'The strongest indication for NIV there is: a COPD exacerbation with pH < 7.35 and PaCO2 > 45. It halves intubation and mortality. Drowsiness from CO2 is not a contraindication if he protects his airway and you can watch him; reassess at 1–2 hours.'], ['tube', 'Intubate and ventilate', 'reasonable', 'Correct if NIV fails or he cannot protect his airway (vomiting, GCS falling further, agitation). Many would try NIV first with the intubation kit at the bedside. On the ventilator: a slow rate, a short Ti, a long expiration, accept his usual PaCO2.']],
      targets: [
        ['SpO2 88–92% (PaO2 55–70)', o => o.spo2pct >= 88 && o.spo2pct <= 93, 'Lower the FiO2 — he is a chronic retainer and 100% is not the target.', 'Raise the FiO2 a little.'],
        ['pH ≥ 7.30 — ventilate to the pH, not to a normal PaCO2', o => o.ph >= 7.30, 'The pH is still acidaemic: more alveolar ventilation (volume before rate, since rate shortens expiration), or wait for the bicarbonate.', ''],
        ['PaCO2 near his baseline (50–65), not 40', o => o.paco2 >= 48 && o.paco2 <= 68, 'Over-ventilating a chronic retainer wastes his bicarbonate (post-hypercapnic alkalosis) and makes weaning harder: aim for his usual CO2.', ''],
        ['Auto-PEEP under 5 cm H2O', o => o.autoPeep < 5, 'Trapping: lower the rate, shorten the inspiratory time (raise the flow), lower the tidal volume; treat the bronchospasm.', ''],
        ['Plateau ≤ 30 and driving pressure ≤ 15', o => o.pplat <= 30 && o.dp <= 15, 'Too much stretch: lower the tidal volume.', '', 'support'],
        ['Expiratory time ≥ 3 s (I:E 1:3 or longer)', o => o.te >= 3, 'Lengthen expiration: a lower rate or a higher inspiratory flow.', '', 'tube'],
        ['Set PEEP about 80% of the auto-PEEP if he is triggering', o => !(o.spontRR > 0 && o.autoPeep > 4 && o.peep < 0.6 * o.autoPeep), 'He is triggering against his auto-PEEP: match the set PEEP to about 80% of it so that the effort to trigger is small.', '', 'tube'],
        ['Mean BP holding (cardiac output over 3.5 L/min)', o => o.co >= 3.5, 'The high intrathoracic pressure is limiting venous return: fluids, lower the PEEP, and above all lengthen the expiration.', '']
      ],
      niv: { ipap: 14, epap: 5, fio2: 0.35, rr: 14 }, vent: { mode: 'vcac', vt: 480, rr: 12, peep: 5, fio2: 0.4, ti: 0.8, flow: 70, pinsp: 15, ps: 12, sed: 'light' } },
    { id: 'ards', title: 'ARDS from pneumonia', who: '45-year-old woman, 165 cm, 72 kg, influenza pneumonia; two days of worsening breathlessness. RR 36, HR 125, BP 105/60, SpO2 86% on a non-rebreather, bilateral infiltrates, no oedema on echo.',
      abg: 'ABG on 15 L: pH 7.46 · PaCO2 31 · PaO2 54 · HCO3 22. VBG: pH 7.42 · PvCO2 38.',
      p: { sex: 'f', cm: 165, crs: 28, raw: 8, shunt: 0.38, vq: 0.08, vdAlv: 0.18, fatigue: 0.6, rrMax: 40, driveExtra: 0.6, vco2: 260, vo2: 300, hco3: 22, paco2Set: 38, rrBase: 28, driveK: 1.3, recruit: 0.55, hb: 12, co: 5.5, hypovol: 0.5 },
      triage: [['o2', 'More oxygen by mask and observe', 'wrong', 'She is on a non-rebreather at 86% with a shunt of a third of her output: there is no more oxygen to give by mask, and the work of breathing at 36 a minute will exhaust her.'], ['hfnc', 'High-flow nasal oxygen', 'reasonable', 'A fair first step in hypoxaemic failure without hypercapnia (FLORALI): 60 L/min and FiO2 1.0, with a ROX index checked at 2, 6 and 12 hours. But a PaO2/FiO2 near 60 with this respiratory rate predicts failure; have the tube ready and do not let her tire.'], ['niv', 'Non-invasive ventilation (BiPAP)', 'poor', 'NIV in de novo hypoxaemic failure has a high failure rate and large tidal volumes under NIV are themselves injurious; delayed intubation after failed NIV raises mortality. Use it only briefly, with a helmet, or not at all.'], ['tube', 'Intubate and ventilate', 'best', 'Severe ARDS (P/F about 60) with exhaustion: intubate, then lung-protective ventilation — 6 mL/kg of predicted weight, plateau ≤ 30, driving pressure ≤ 15, PEEP from the table, and prone her.']],
      targets: [
        ['Tidal volume 6 mL/kg PBW (4–8): about ' + Math.round(6 * PBW('f', 165)) + ' mL', o => o.vtKg >= 4 && o.vtKg <= 8, 'Too large for her predicted weight (57 kg): lower the tidal volume.', 'Too small: the dead-space fraction climbs; 6 mL/kg is the aim.', 'support'],
        ['Plateau ≤ 30 cm H2O', o => o.pplat <= 30, 'Lower the tidal volume (then the PEEP if it is not recruiting).', '', 'support'],
        ['Driving pressure ≤ 15', o => o.dp <= 15, 'The strain is too high: lower the volume; if compliance improved with PEEP keep it, if not lower the PEEP.', '', 'support'],
        ['SpO2 88–95% (PaO2 55–80)', o => o.spo2pct >= 88 && o.spo2pct <= 96, 'Raise the PEEP (recruitable lung) and the FiO2; prone position.', 'Lower the FiO2 — above 0.6 for long is toxic.'],
        ['PEEP matched to the FiO2 (lower table: FiO2 0.5 → 8–10, 0.7 → 10–14, 0.9 → 14–18)', o => o.peep >= ({ 0.3: 5, 0.4: 5, 0.5: 8, 0.6: 10, 0.7: 10, 0.8: 14, 0.9: 14, 1: 18 }[o.fio2Key] || 5) - 1, 'The FiO2 is doing work the PEEP should do: raise the PEEP (she has recruitable lung) and bring the FiO2 down.', '', 'support'],
        ['pH ≥ 7.25 (permissive hypercapnia is fine)', o => o.ph >= 7.25, 'Raise the rate (to 30–35) before raising the volume.', ''],
        ['Rate ≤ 35 and expiratory flow reaching zero (no auto-PEEP)', o => o.rrSet <= 35 && o.autoPeep < 3, 'At this rate the breath stacks: lower it a little or shorten Ti.', '', 'tube'],
        ['Cardiac output over 3.5 L/min (PEEP is tolerated)', o => o.co >= 3.5, 'The PEEP is limiting venous return in a patient who is intravascularly dry: fluid, then reassess the PEEP.', '']
      ],
      niv: { ipap: 12, epap: 8, fio2: 1.0, rr: 16 }, vent: { mode: 'vcac', vt: 340, rr: 28, peep: 12, fio2: 0.7, ti: 0.9, flow: 50, pinsp: 14, ps: 12, sed: 'deep' } },
    { id: 'asthma', title: 'Near-fatal asthma', who: '24-year-old man, 180 cm, asthma since childhood, two previous ICU admissions; an hour of continuous nebulisers, magnesium and steroids. He is now unable to speak, silent chest, RR 34, HR 140, BP 100/60 with a pulsus paradoxus, SpO2 89% on 15 L, becoming drowsy.',
      abg: 'ABG: pH 7.18 · PaCO2 66 · PaO2 62 · HCO3 24. VBG: pH 7.14 · PvCO2 74.',
      p: { sex: 'm', cm: 180, crs: 65, raw: 35, shunt: 0.06, vq: 0.15, vdAlv: 0.15, fatigue: 0.65, rrMax: 36, driveExtra: 0.2, vco2: 280, vo2: 320, hco3: 24, paco2Set: 40, rrBase: 26, driveK: 1.2, recruit: 0, hb: 14, co: 4.8, hypovol: 0.6, obstructive: true },
      triage: [['o2', 'More oxygen by mask and observe', 'wrong', 'A rising PaCO2 in asthma is exhaustion: the silent chest and drowsiness mean he is minutes from arrest.'], ['hfnc', 'High-flow nasal oxygen', 'wrong', 'Does nothing for the ventilatory failure of a tiring asthmatic.'], ['niv', 'Non-invasive ventilation (BiPAP)', 'poor', 'Evidence in asthma is thin; a short trial in a cooperative patient with mild hypercapnia is defensible, but he is drowsy with a silent chest — do not delay the tube.'], ['tube', 'Intubate and ventilate', 'best', 'Yes — by the most experienced person, with ketamine, a large tube, fluid running and a vasopressor drawn up, because the positive pressure on top of his trapping will drop his blood pressure. Then ventilate to let him exhale: a low rate, a small volume, a high flow, a long expiratory time, minimal PEEP, and accept the CO2.']],
      targets: [
        ['Rate 10–14 and expiratory time ≥ 3.5 s', o => o.rrSet <= 14 && o.te >= 3.5, 'The rate is the enemy: he cannot exhale in time. Lower it and accept the CO2.', '', 'tube'],
        ['Tidal volume 6–8 mL/kg PBW (' + Math.round(6 * PBW('m', 180)) + '–' + Math.round(8 * PBW('m', 180)) + ' mL)', o => o.vtKg >= 5 && o.vtKg <= 8.5, 'Smaller breaths empty in time.', '', 'support'],
        ['Inspiratory flow ≥ 60 L/min (Ti ≤ 1 s)', o => o.ti <= 1.0, 'A fast inspiration leaves the time for expiration.', '', 'tube'],
        ['Auto-PEEP under 8 and plateau ≤ 30', o => o.autoPeep < 8 && o.pplat <= 30, 'Trapping: lower the rate first, then the volume; check with an expiratory hold; if he deteriorates, disconnect and squeeze the chest.', ''],
        ['Set PEEP ≤ 5 while paralysed', o => o.peep <= 5, 'In a paralysed asthmatic extrinsic PEEP adds to the trapping; keep it minimal (it only helps triggering when he is breathing).', '', 'tube'],
        ['pH ≥ 7.20 — permissive hypercapnia (PaCO2 up to 80–90 is acceptable)', o => o.ph >= 7.20, 'The acidaemia is severe: a little more volume (not rate), and sedation and paralysis to cut his CO2 production; bicarbonate is a last resort.', ''],
        ['SpO2 ≥ 90%', o => o.spo2pct >= 90, 'Raise the FiO2; his problem is not oxygen.', ''],
        ['Blood pressure holding (cardiac output over 3.5)', o => o.co >= 3.5, 'Hypotension after intubation in asthma is auto-PEEP until proven otherwise: disconnect the circuit and let him exhale, fluid, lower the rate.', '']
      ],
      niv: { ipap: 12, epap: 3, fio2: 0.5, rr: 12 }, vent: { mode: 'vcac', vt: 450, rr: 12, peep: 3, fio2: 0.6, ti: 0.8, flow: 80, pinsp: 16, ps: 10, sed: 'paralysed' } },
    { id: 'dka', title: 'Diabetic ketoacidosis with aspiration', who: '31-year-old woman, 160 cm, type 1 diabetes, vomiting for two days, now confused; Kussmaul breathing at 32 a minute, HR 130, BP 90/50, SpO2 93% on air, right lower lobe crackles after a witnessed vomit. Glucose 34 mmol/L, ketones 6.',
      abg: 'ABG: pH 7.17 · PaCO2 20 · PaO2 70 · HCO3 7. VBG: pH 7.13 · PvCO2 26.',
      p: { sex: 'f', cm: 160, crs: 55, raw: 9, shunt: 0.12, vq: 0.1, vdAlv: 0.1, fatigue: 0.9, rrMax: 36, driveExtra: 0.8, vco2: 280, vo2: 320, hco3: 7, hco3Day: 17, paco2Set: 20, rrBase: 32, driveK: 1.5, recruit: 0.3, hb: 14, co: 5.5, hypovol: 0.8 },
      triage: [['o2', 'Oxygen, fluids, insulin, and protect the airway position; observe closely', 'best', 'Her breathing is the treatment: the Kussmaul ventilation holds her pH up. Insulin, fluid and potassium fix the acid. Intubate only if she cannot protect her airway or tires — and if you must, you must match her minute ventilation.'], ['hfnc', 'High-flow nasal oxygen', 'reasonable', 'Harmless and comfortable; it does not address the real issue, which is airway protection and the metabolic acidosis.'], ['niv', 'Non-invasive ventilation (BiPAP)', 'wrong', 'A vomiting, confused patient under a tight mask aspirates. Not here.'], ['tube', 'Intubate and ventilate', 'poor', 'Only if the airway is unprotected or she is exhausted. The danger: a “normal” ventilator rate of 12–14 after intubation drops her minute ventilation from 15 L/min to 6, the PaCO2 climbs from 20 to 40, and the pH falls from 7.17 to below 6.95 — cardiac arrest. If you intubate, set a rate of 28–30, a volume of 8 mL/kg, and watch the pH every 20 minutes.']],
      targets: [
        ['Minute ventilation ≥ 13 L/min (match what she was doing herself)', o => o.mv >= 12.5, 'Her compensation has been taken away: raise the rate to 28–30 and the volume to 8 mL/kg.', '', 'support'],
        ['PaCO2 ≤ 25 while the bicarbonate is single figures', o => o.paco2 <= 25, 'Expected PaCO2 for this bicarbonate (Winters: 1.5 × HCO3 + 8) is about 18; any higher and the pH collapses.', ''],
        ['pH ≥ 7.10', o => o.ph >= 7.10, 'Ventilate harder (rate first) and push the insulin and fluids; bicarbonate only below 6.9.', ''],
        ['Auto-PEEP under 3 at this rate (short Ti, high flow)', o => o.autoPeep < 3, 'At 30 breaths a minute keep the inspiratory time short so that she can exhale.', '', 'tube'],
        ['Plateau ≤ 30', o => o.pplat <= 30, 'Lower the tidal volume a little and take the ventilation with rate.', '', 'support'],
        ['SpO2 ≥ 92%', o => o.spo2pct >= 92, 'Aspiration pneumonitis: more PEEP (8) and FiO2.', ''],
        ['Cardiac output over 3.5 (she is 6 L down)', o => o.co >= 3.5, 'Dry and now on positive pressure: fluid first, keep the PEEP modest.', '']
      ],
      niv: { ipap: 10, epap: 5, fio2: 0.4, rr: 14 }, vent: { mode: 'vcac', vt: 460, rr: 28, peep: 6, fio2: 0.5, ti: 0.7, flow: 70, pinsp: 14, ps: 12, sed: 'light' } },
    { id: 'chf', title: 'Acute cardiogenic pulmonary oedema', who: '74-year-old woman, 158 cm, ischaemic cardiomyopathy, woke at 3 a.m. drowning. RR 32, HR 118 in sinus, BP 185/105, SpO2 85% on 15 L, pink froth, crackles to the apices, JVP up.',
      abg: 'ABG on 15 L: pH 7.28 · PaCO2 52 · PaO2 58 · HCO3 24. VBG: pH 7.24 · PvCO2 60.',
      p: { sex: 'f', cm: 158, crs: 35, raw: 12, shunt: 0.25, vq: 0.15, vdAlv: 0.12, fatigue: 0.35, rrMax: 36, driveExtra: 0.6, vco2: 230, vo2: 260, hco3: 24, paco2Set: 40, rrBase: 26, driveK: 1.2, recruit: 0.6, hb: 11, co: 3.8, hypovol: -0.6, lvFail: true },
      triage: [['o2', 'Oxygen, nitrates, diuretic; observe', 'poor', 'The drugs are right, but she is hypercapnic and hypoxaemic on 15 L: she needs positive pressure now, and it treats the heart as well as the lung.'], ['hfnc', 'High-flow nasal oxygen', 'poor', 'Some PEEP effect, but CPAP or bilevel NIV is the proven therapy in oedema (fewer intubations, lower mortality).'], ['niv', 'CPAP or bilevel NIV', 'best', 'CPAP 8–10 (or BiPAP 12/8) with nitrates: positive pressure recruits the flooded lung, lowers the LV afterload (the pressure the ventricle pumps against falls with the intrathoracic pressure), lowers the venous return, and unloads the muscles. Expect her to turn the corner within 30–60 minutes.'], ['tube', 'Intubate and ventilate', 'reasonable', 'If she is exhausted, hypotensive or obtunded. The same physiology applies on the ventilator — PEEP is treatment here — but the induction drugs in a failing heart are their own hazard.']],
      targets: [
        ['SpO2 ≥ 92%', o => o.spo2pct >= 92, 'More PEEP (recruitable, flooded lung) before more FiO2.', ''],
        ['PEEP (or EPAP) 8–12', o => o.peep >= 8 && o.peep <= 14, 'PEEP is the drug: it recruits the oedematous lung and unloads the left ventricle.', 'More than this adds little and begins to cut the output.', 'support'],
        ['pH ≥ 7.30 and PaCO2 falling toward 45', o => o.ph >= 7.30 && o.paco2 <= 50, 'More support (pressure support / tidal volume) to unload the muscles and clear the CO2.', ''],
        ['Driving pressure ≤ 15', o => o.dp <= 15, 'Her lung is stiff with water: a smaller volume.', '', 'support'],
        ['Cardiac output ≥ 3.5 L/min', o => o.co >= 3.5, 'Her failing ventricle is preload-dependent too: if the pressure drops, lower the PEEP a little and hold the nitrate.', '']
      ],
      niv: { ipap: 12, epap: 8, fio2: 0.6, rr: 14 }, vent: { mode: 'vcac', vt: 380, rr: 18, peep: 10, fio2: 0.6, ti: 1.0, flow: 50, pinsp: 14, ps: 10, sed: 'light' } },
    { id: 'od', title: 'Opioid overdose', who: '27-year-old man, 176 cm, found with a syringe beside him; RR 5, pinpoint pupils, SpO2 78% on air, GCS 6, snoring. One dose of naloxone brought the rate to 10 for a few minutes before he drifted off again. Chest clear.',
      abg: 'ABG on air: pH 7.17 · PaCO2 80 · PaO2 45 · HCO3 28. VBG: pH 7.13 · PvCO2 88.',
      p: { sex: 'm', cm: 176, crs: 75, raw: 6, shunt: 0.08, vq: 0.08, vdAlv: 0.08, fatigue: 1, rrMax: 12, driveExtra: 0, vco2: 200, vo2: 230, hco3: 28, paco2Set: 40, rrBase: 12, driveK: 0.15, recruit: 0.3, hb: 15, co: 5.0, hypovol: 0.2 },
      triage: [['o2', 'Bag-mask, naloxone infusion, airway positioning; observe', 'best', 'Pure hypoventilation with a normal lung: the gradient is normal and the lung is fine. Naloxone by infusion (the heroin outlasts the bolus), an airway adjunct, bag-mask support and oxygen, with a low threshold to intubate if he cannot be kept awake or aspirates.'], ['hfnc', 'High-flow nasal oxygen', 'wrong', 'Oxygen without ventilation corrects the SpO2 and hides a PaCO2 that keeps climbing.'], ['niv', 'Non-invasive ventilation (BiPAP)', 'wrong', 'GCS 6 with a full stomach and no airway reflexes: a contraindication.'], ['tube', 'Intubate and ventilate', 'reasonable', 'If naloxone fails or cannot be given continuously, or if he aspirated. Simple settings: 8 mL/kg, rate 14, PEEP 5, FiO2 0.4, and he will be extubatable as the drug wears off.']],
      targets: [
        ['PaCO2 40–50 (normal lungs: do not over-correct the chronic-looking bicarbonate)', o => o.paco2 >= 36 && o.paco2 <= 52, 'Adjust the minute ventilation: a normal lung needs about 6–7 L/min.', ''],
        ['pH 7.35–7.45', o => o.ph >= 7.33 && o.ph <= 7.47, '', ''],
        ['SpO2 94–98% on FiO2 ≤ 0.4', o => o.spo2pct >= 94 && o.fio2 <= 0.45, 'A normal lung on this FiO2 should be well oxygenated; if not, he has aspirated — add PEEP.', 'Turn the oxygen down.'],
        ['Plateau ≤ 25 (normal lungs)', o => o.pplat <= 25, '', '', 'support']
      ],
      niv: { ipap: 12, epap: 5, fio2: 0.4, rr: 14 }, vent: { mode: 'vcac', vt: 560, rr: 14, peep: 5, fio2: 0.4, ti: 1.0, flow: 50, pinsp: 12, ps: 10, sed: 'deep' } },
    { id: 'tbi', title: 'Traumatic brain injury', who: '35-year-old man, 182 cm, motorcycle crash, GCS 7 with a blown right pupil, CT shows a subdural with midline shift; intubated in the department. Chest clear, haemodynamically stable after 1 L of fluid.',
      abg: 'ABG after intubation on FiO2 1.0: pH 7.38 · PaCO2 42 · PaO2 380 · HCO3 24. VBG: pH 7.34 · PvCO2 48.',
      p: { sex: 'm', cm: 182, crs: 80, raw: 7, shunt: 0.06, vq: 0.06, vdAlv: 0.08, fatigue: 1, rrMax: 20, driveExtra: 0, vco2: 230, vo2: 250, hco3: 24, paco2Set: 40, rrBase: 14, driveK: 0, recruit: 0.3, hb: 13, co: 5.5, hypovol: 0.3, brain: true },
      triage: [['o2', 'Oxygen and observe', 'wrong', 'GCS 7 with a blown pupil: the airway is already gone and the brain needs a controlled PaCO2.'], ['hfnc', 'High-flow nasal oxygen', 'wrong', 'Not an airway.'], ['niv', 'Non-invasive ventilation (BiPAP)', 'wrong', 'GCS 7 is a contraindication; and NIV cannot control the PaCO2 to the number the brain needs.'], ['tube', 'Intubate and ventilate (already done): set the ventilator for the brain', 'best', 'Normocapnia (PaCO2 35–40), normoxia (PaO2 80–120, not 380), PEEP ≤ 10 is fine, head up 30°, avoid coughing and hypotension. Brief hyperventilation (PaCO2 30–35) only as a bridge to the operating theatre for herniation, never prophylactically.']],
      targets: [
        ['PaCO2 35–40 (hyperventilate to 30–35 only as a short bridge to surgery)', o => o.paco2 >= 34 && o.paco2 <= 41, 'Hypercapnia dilates the cerebral vessels and raises the ICP; hypocapnia constricts them and starves the injured brain. Hit 35–40.', ''],
        ['PaO2 80–150 (FiO2 down from 1.0)', o => o.pao2 >= 80 && o.pao2 <= 160, 'Hyperoxia is not a target: bring the FiO2 down to 0.3–0.4.', 'Hypoxia is the worst secondary insult: raise the FiO2.'],
        ['pH 7.35–7.45', o => o.ph >= 7.35 && o.ph <= 7.45, '', ''],
        ['PEEP ≤ 10 and plateau ≤ 25', o => o.peep <= 10 && o.pplat <= 25, 'High intrathoracic pressure impedes cerebral venous drainage; keep it modest.', '', 'support'],
        ['Cardiac output ≥ 4 (perfusion pressure)', o => o.co >= 4, 'The brain needs the pressure: fluid, pressor, less PEEP.', '']
      ],
      niv: { ipap: 10, epap: 5, fio2: 0.3, rr: 14 }, vent: { mode: 'vcac', vt: 540, rr: 14, peep: 5, fio2: 0.4, ti: 1.0, flow: 50, pinsp: 12, ps: 10, sed: 'deep' } },
    { id: 'ohs', title: 'Obesity hypoventilation with a chest infection', who: '52-year-old man, 170 cm, 160 kg, untreated sleep apnoea, a week of cough and fever; drowsy by day, headaches, oedema to the thighs. RR 22, SpO2 82% on air, 90% on 4 L, HR 100, BP 150/95.',
      abg: 'ABG on 4 L: pH 7.30 · PaCO2 72 · PaO2 60 · HCO3 35. VBG: pH 7.27 · PvCO2 79.',
      p: { sex: 'm', cm: 170, crs: 40, raw: 12, shunt: 0.14, vq: 0.1, vdAlv: 0.12, fatigue: 0.45, rrMax: 28, driveExtra: 0.2, vco2: 300, vo2: 330, hco3: 35, paco2Set: 62, rrBase: 20, driveK: 0.5, recruit: 0.7, hb: 17, co: 5.5, hypovol: -0.2, cwStiff: true },
      triage: [['o2', 'Controlled oxygen and observe', 'poor', 'Chronic hypercapnia with an acute acidaemia: he needs ventilation, and sleep will deepen the hypoventilation.'], ['hfnc', 'High-flow nasal oxygen', 'poor', 'Comfortable and some dead-space washout, but the obstructed, loaded upper airway and the hypoventilation need pressure.'], ['niv', 'Bilevel NIV with a high EPAP', 'best', 'Obesity hypoventilation decompensated by infection: NIV with an EPAP high enough to hold the upper airway open (8–10) and an IPAP 8–12 above it, a backup rate, and a sitting position. Aim for SpO2 88–92% and the pH; the PaCO2 will settle near his baseline.'], ['tube', 'Intubate and ventilate', 'reasonable', 'If NIV fails or he cannot protect the airway. Expect a stiff chest wall: the plateau overstates the lung stress, and he will need a higher PEEP than his lungs alone would ask for.']],
      targets: [
        ['SpO2 88–92%', o => o.spo2pct >= 88 && o.spo2pct <= 93, 'More PEEP/EPAP (atelectatic bases under the chest wall) before FiO2.', 'Less oxygen: he retains.'],
        ['pH ≥ 7.30', o => o.ph >= 7.30, 'More support: more pressure support / tidal volume, a backup rate he cannot fall below.', ''],
        ['PaCO2 heading to his baseline (55–65), not 40', o => o.paco2 >= 50 && o.paco2 <= 70, 'Do not normalise the CO2 of a chronic retainer in a night; his bicarbonate is 35.', ''],
        ['PEEP/EPAP 8–12 (a loaded chest wall and an obstructed upper airway)', o => o.peep >= 8, 'A heavy chest wall and abdomen push the FRC down; it takes 8–12 to hold the bases open.', '', 'support'],
        ['Plateau ≤ 32 (the chest wall takes a share) and driving pressure ≤ 15', o => o.pplat <= 32 && o.dp <= 15, 'The plateau includes the chest wall; an oesophageal balloon would show the lung is less stressed than it looks — but keep the driving pressure down.', '', 'support']
      ],
      niv: { ipap: 18, epap: 9, fio2: 0.35, rr: 14 }, vent: { mode: 'vcac', vt: 450, rr: 16, peep: 10, fio2: 0.4, ti: 1.0, flow: 50, pinsp: 16, ps: 12, sed: 'light' } }
  ];

  /* ---- the model ---- */
  const SED = { none: 1, light: 0.6, deep: 0.15, paralysed: 0 };
  const SUPPORTED = { o2: false, hfnc: false, niv: true, vcac: true, pcac: true, psv: true };
  function mech(p, s) {
    const T = 60 / Math.max(1, s.rrTot || s.rr || 12);
    const own = s.mode === 'o2' || s.mode === 'hfnc';
    const ti = s.mode === 'vcac' ? s.vt / (s.flow * 1000 / 60) : (own ? Math.max(0.5, Math.min(1.2, T * 0.36)) : s.ti), te = Math.max(0.2, T - ti);
    const tau = p.raw * p.crs / 1000;
    const e = Math.exp(-te / tau);
    const ap0 = s.autoPeepGuess || 0;
    let vt = s.vt;
    if (s.mode !== 'vcac') {
      // pressure-driven breaths (the ventilator's pressure, the patient's muscles, or both) fill what the pressure can within Ti
      const press = s.mode === 'pcac' ? s.pinsp + (s.pmus || 0) : (s.mode === 'psv' || s.mode === 'niv' ? s.ps + (s.pmus || 0) : (s.pmus || 0));
      vt = Math.max(0, (press - ap0) * p.crs * (1 - Math.exp(-ti / tau)));
      if (s.mode === 'niv') vt *= 0.85;   // the leak
      if (own && s.pbw) vt = Math.min(vt, 12 * s.pbw);
    }
    const trappedMl = e > 1e-6 ? Math.min(1500, vt * e / (1 - e)) : 0;
    const autoPeep = trappedMl / p.crs;
    const peep = s.mode === 'hfnc' ? Math.min(5, (s.flow || 50) / 15) : (s.mode === 'o2' ? 0 : s.peep);
    const peepTot = peep + autoPeep;
    const pplat = peepTot + vt / p.crs + (p.cwStiff ? 3 : 0);
    const flowLs = s.mode === 'vcac' ? s.flow / 60 : vt / 1000 / Math.max(0.2, ti) * 1.6;
    // volume control: the peak is the plateau plus the resistive pressure of the set flow; pressure modes: the peak is the pressure set
    const setPress = s.mode === 'pcac' ? s.pinsp : (s.mode === 'psv' || s.mode === 'niv' ? s.ps : 0);
    const ppeak = s.mode === 'vcac' || own ? pplat + p.raw * flowLs : peep + setPress;   // with a strong effort the alveolar plateau can exceed the airway pressure: the patient adds the stretch
    return { vt: vt, ti: ti, te: te, tau: tau, autoPeep: autoPeep, peepTot: peepTot, peepSet: peep, pplat: pplat, ppeak: ppeak, dp: vt / p.crs, trappedMl: trappedMl };
  }
  function invertSat(S, p50v) { let lo = 10, hi = 700; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (PH.sat(m, p50v) < S) lo = m; else hi = m; } return (lo + hi) / 2; }
  /* the gas exchange and the circulation for a set of settings; opts.day = 1 after a day of renal (and metabolic) compensation */
  function gas(p, s, opts) {
    opts = opts || {};
    const pbw = PBW(p.sex, p.cm);
    const sed = s.sed === undefined ? 1 : (SED[s.sed] === undefined ? 1 : SED[s.sed]);
    const own = s.mode === 'o2' || s.mode === 'hfnc', supported = !!SUPPORTED[s.mode];
    const vco2 = p.vco2 * (s.sed === 'paralysed' ? 0.8 : (s.sed === 'deep' ? 0.9 : 1));
    let paco2 = 45, ph = 7.3, pao2 = 80, rrTot = s.rr || 12, m = null, spont = 0, pmus = 0, iter, apGuess = 0, fio2 = s.fio2;
    const hco3 = opts.day ? (p.hco3Day !== undefined ? p.hco3Day : null) : p.hco3;
    const oxy = (mm, pc, phh, circ0) => {
      const f2 = s.mode === 'hfnc' ? Math.max(0.21, s.fio2 - 0.15 * (1 - s.fio2) * Math.max(0, (rrTot - 25) / 15)) : (s.mode === 'o2' ? Math.min(0.85, s.fio2) : s.fio2);
      const pA = Math.max(10, f2 * (760 - 47) - pc / 0.8);
      const sh = p.shunt * (1 - p.recruit * (1 - Math.exp(-mm.peepTot / 7))) + (mm.pplat > 32 ? 0.04 : 0);
      const vq = p.vq * Math.pow((1 - f2) / 0.79, 1.3);
      const sF = Math.min(0.85, sh + vq), p50v = PH.p50({ ph: phh, pco2: pc });
      const cc = 1.34 * p.hb * PH.sat(pA, p50v) + 0.003 * pA, avD = p.vo2 / (10 * Math.max(1.5, circ0.co));
      const ca = Math.max(2, cc - sF * avD / (1 - sF));
      let lo = 15, hi = 700; for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; const c = 1.34 * p.hb * PH.sat(mid, p50v) + 0.003 * mid; if (c < ca) lo = mid; else hi = mid; }
      const pa = (lo + hi) / 2;
      return { fio2: f2, pao2A: pA, shuntEff: sh, vqEff: vq, p50: p50v, caO2: ca, avD: avD, pao2: pa, sao2: PH.sat(pa, p50v) };
    };
    let ox = null;
    for (iter = 0; iter < 30; iter++) {
      // the patient's own drive: CO2 and pH, hypoxia, the disease (a stiff lung, ketoacids), scaled by sedation; a tiring patient without support cannot keep it up
      let chem = Math.max(0.35, Math.min(2.4, 1 + 0.05 * (paco2 - p.paco2Set) + 2.0 * Math.max(0, 7.33 - ph) + 1.5 * Math.max(0, (65 - pao2) / 30) + (p.driveExtra || 0)));
      if (paco2 > p.paco2Set + 35) chem *= Math.max(0.3, 1 - 0.02 * (paco2 - p.paco2Set - 35));   // CO2 narcosis: the drive fades as the CO2 climbs
      const driveOn = sed * p.driveK > 0.02;
      const target = driveOn ? Math.max(6, Math.min(p.rrMax || 40, p.rrBase * (0.6 + 0.4 * chem) * Math.min(1, sed * p.driveK * (0.5 + 0.5 * chem)))) : 0;
      spont = iter ? spont + 0.5 * (target - spont) : target;
      const fat = p.fatigue === undefined ? 1 : p.fatigue;
      pmus = driveOn ? Math.min(30, (supported ? (3 + 3 * chem) : (6 + 7 * chem) * fat) * sed * p.driveK) : 0;
      if (own) rrTot = Math.max(4, spont);
      else if (s.mode === 'psv' || s.mode === 'niv') rrTot = Math.max(spont, s.rr || 0);   // the backup rate is a floor
      else rrTot = Math.max(s.rr, spont * 0.8);
      m = mech(p, Object.assign({}, s, { rrTot: rrTot, pmus: pmus, autoPeepGuess: apGuess, pbw: pbw }));
      apGuess = 0.5 * (apGuess + m.autoPeep);
      // dead space: anatomic (2.2 mL/kg; the tube bypasses half of it; high flow washes some out) + alveolar (the disease) + overdistension + low flow
      const circ0 = circulation(p, m, s);
      const vdAnat = own || s.mode === 'niv' ? 2.0 * pbw - (s.mode === 'hfnc' ? 70 : 0) : 1.2 * pbw + 40;
      const vdFrac = Math.min(0.8, vdAnat / Math.max(50, m.vt) + p.vdAlv + 0.15 * Math.max(0, Math.min(1, (m.pplat - 28) / 10)) + 0.1 * Math.max(0, 1 - circ0.co / 4));
      const va = Math.max(0.3, rrTot * m.vt * (1 - vdFrac) / 1000);   // L/min
      const next = Math.min(150, 0.863 * vco2 / va);
      paco2 = paco2 + 0.5 * (next - paco2);
      // the bicarbonate: as it is now, or after a day of kidney (and treatment)
      const bic = hco3 !== null ? hco3 : (p.hco3 + 0.6 * ((paco2 > 40 ? 24 + 0.35 * (paco2 - 40) : 24 - 0.5 * (40 - paco2)) - p.hco3));
      ph = 6.1 + Math.log10(bic / (0.03 * paco2));
      ox = oxy(m, paco2, ph, circ0); pao2 = ox.pao2;
      m.vdFrac = vdFrac; m.va = va; m.bic = bic;
    }
    const circ = circulation(p, m, s);
    fio2 = ox.fio2;
    const pao2A = ox.pao2A, shuntEff = ox.shuntEff, vqEff = ox.vqEff, p50v = ox.p50, caO2 = ox.caO2, avD = ox.avD, sao2 = ox.sao2;
    pao2 = ox.pao2;
    const cvO2 = Math.max(1, caO2 - avD), svO2 = Math.max(0.05, Math.min(0.99, (cvO2 - 0.003 * 40) / (1.34 * p.hb)));
    const pvo2 = invertSat(svO2, p50v);
    const gap = 5 + 8 * Math.max(0, 1 - circ.co / 4.5);
    const pvco2 = paco2 + gap, phv = 6.1 + Math.log10((m.bic + 1) / (0.03 * pvco2));
    const fio2Key = Math.round(fio2 * 10) / 10;
    return Object.assign({}, m, { paco2: paco2, ph: ph, hco3: m.bic, pao2: pao2, sao2: sao2, spo2: sao2, spo2pct: Math.round(sao2 * 100), pao2A: pao2A, aa: pao2A - pao2, pf: pao2 / fio2, shuntEff: shuntEff, vqEff: vqEff, caO2: caO2, cvO2: cvO2, svO2: svO2, pvo2: pvo2, pvco2: pvco2, phv: phv, hco3v: m.bic + 1, rrTot: rrTot, rrSet: s.rr, spontRR: spont, pmus: pmus, mv: rrTot * m.vt / 1000, vtKg: m.vt / pbw, pbw: pbw, co: circ.co, map: circ.map, peep: m.peepSet, fio2: fio2, fio2Key: fio2Key, mode: s.mode, winters: 1.5 * m.bic + 8, expectedHco3: paco2 > 40 ? 24 + 0.35 * (paco2 - 40) : 24 - 0.5 * (40 - paco2), supported: supported });
  }
  function circulation(p, m, s) {
    // venous return falls with the pressure in the chest, more when the patient is dry; the mean pressure follows
    const press = m.peepTot + 0.3 * m.dp;
    const sens = 0.02 * (1 + Math.max(0, p.hypovol) * 1.6) * (p.lvFail ? 0.4 : 1);
    let co = p.co * (1 - sens * Math.max(0, press - 5));
    if (p.lvFail) co = p.co * (1 + 0.03 * Math.min(10, Math.max(0, press - 3)));   // the failing left ventricle likes positive pressure (afterload falls)
    co = Math.max(1.5, co);
    return { co: co, map: Math.round(65 + 7 * (co - 4)) };
  }
  /* a reading of the gas: the primary disorder and the state of compensation */
  function acidBase(o) {
    const ph = o.ph, pc = o.paco2, b = o.hco3;
    const parts = [];
    const d = pc - 40;
    if (ph < 7.35) {
      const resp = pc > 45, met = b < 22;
      if (resp && met) parts.push('a mixed respiratory and metabolic acidosis (pH ' + ph.toFixed(2) + ': the PaCO2 is high and the bicarbonate low)');
      else if (resp) {
        const acute = 24 + 0.1 * d, chronic = 24 + 0.35 * d;
        parts.push('a respiratory acidosis' + (b >= chronic - 2 ? ' with chronic (renal) compensation — the bicarbonate of ' + b.toFixed(0) + ' matches the ' + chronic.toFixed(0) + ' expected for a long-standing PaCO2 of ' + pc.toFixed(0) : (b >= acute + 2 ? ', partly compensated (bicarbonate ' + b.toFixed(0) + ', between the acute ' + acute.toFixed(0) + ' and chronic ' + chronic.toFixed(0) + ' expectations: an acute rise on a chronic retainer)' : ', acute and uncompensated (bicarbonate ' + b.toFixed(0) + ' ≈ the ' + acute.toFixed(0) + ' expected acutely)')));
      } else if (met) {
        const w = 1.5 * b + 8;
        parts.push('a metabolic acidosis with ' + (Math.abs(pc - w) <= 2 ? 'appropriate respiratory compensation (PaCO2 ' + pc.toFixed(0) + ' against a Winters expectation of ' + w.toFixed(0) + ' ± 2)' : (pc > w + 2 ? 'inadequate respiratory compensation — the PaCO2 of ' + pc.toFixed(0) + ' should be ' + w.toFixed(0) + ': the ventilation is not keeping up with the acid' : 'more hyperventilation than compensation needs (PaCO2 ' + pc.toFixed(0) + ' below the expected ' + w.toFixed(0) + ')')));
      } else parts.push('a mild acidaemia from a PaCO2 at the top of normal (' + pc.toFixed(0) + ') and a bicarbonate at the bottom (' + b.toFixed(0) + ') — a little respiratory and a little metabolic');
    } else if (ph > 7.45) {
      if (pc < 35 && b <= 26) parts.push('a respiratory alkalosis (hyperventilation; PaCO2 ' + pc.toFixed(0) + ')' + (b < 22 ? ', with some renal compensation' : ''));
      else if (b > 26) parts.push('a post-hypercapnic (metabolic) alkalosis: a chronic retainer ventilated to a PaCO2 of ' + pc.toFixed(0) + ' is left holding a bicarbonate of ' + b.toFixed(0) + ' — aim for his usual PaCO2 instead');
      else parts.push('alkalaemia');
    } else {
      if (pc > 45 && b > 26) parts.push('a compensated respiratory acidosis: the pH is normal because the kidney has matched the chronic PaCO2 with bicarbonate');
      else if (pc < 35 && b < 22) parts.push('a compensated respiratory alkalosis, or a metabolic acidosis with full respiratory compensation');
      else if (b < 22 && pc <= 40) parts.push('a metabolic acidosis fully compensated by ventilation');
      else parts.push('a normal acid–base state');
    }
    const ox = o.pao2 < 60 ? 'Hypoxaemia (PaO2 ' + o.pao2.toFixed(0) + ', SpO2 ' + Math.round(o.spo2 * 100) + '%) with an A–a gradient of ' + Math.max(0, o.aa).toFixed(0) + ' on FiO2 ' + o.fio2.toFixed(2) + (o.aa > 25 ? ': the lung (shunt or V/Q)' : ': hypoventilation or the inspired oxygen') + '.' : (o.pao2 > 150 ? 'Hyperoxia (PaO2 ' + o.pao2.toFixed(0) + '): the FiO2 can come down.' : 'Oxygenation adequate (PaO2 ' + o.pao2.toFixed(0) + ', SpO2 ' + Math.round(o.spo2 * 100) + '%; PaO2/FiO2 ' + o.pf.toFixed(0) + ').');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + '. ' + ox;
  }
  /* ---- one cycle of the ventilator screen (or the monitor) for the case's mechanics, the settings and the model's result ---- */
  function traces(p, s, o) {
    const T = 60 / Math.max(2, o.rrTot), dt = 0.01, N = Math.round(T / dt);
    const own = s.mode === 'o2' || s.mode === 'hfnc', tau = p.raw * p.crs / 1000;
    const peep = o.peepSet, V0 = o.trappedMl / 1000, vtL = o.vt / 1000, ti = o.ti;
    const t = [], paw = [], flow = [], vol = [], pmus = [];
    const trig = o.spontRR > 0 && !own;   // the patient pulls the trigger
    let V = V0;
    for (let i = 0; i < N; i++) {
      const tt = i * dt; t.push(tt);
      let f = 0, pa = peep, pm = 0;
      if (tt < ti) {
        const u = tt / ti;
        if (s.mode === 'vcac') { f = vtL / ti; pa = peep + o.autoPeep + (V - V0) / p.crs * 1000 + f * p.raw + (o.autoPeep > 0 && u < 0.25 ? 0 : 0); if (trig && u < 0.08) pa -= 1.5 * (1 - u / 0.08); }
        else if (own) { pm = -o.pmus * Math.sin(Math.PI * u); const palv = o.autoPeep + (V - V0) / p.crs * 1000 - (-pm); f = Math.max(0, (-pm - (o.autoPeep + (V - V0) / p.crs * 1000)) / p.raw); pa = peep; }
        else {
          const target = (s.mode === 'pcac' ? s.pinsp : s.ps) + peep;
          const palv = peep + o.autoPeep + (V - V0) / p.crs * 1000;
          f = Math.max(0, (target + (o.pmus || 0) * Math.sin(Math.PI * u) - palv) / p.raw) * (1 - Math.exp(-tt / 0.07));
          pa = peep + (target - peep) * Math.min(1, tt / 0.12); if (trig && u < 0.06) pa -= 1.2 * (1 - u / 0.06);
          pm = -(o.pmus || 0) * Math.sin(Math.PI * u);
        }
        V += f * dt;
        if (V - V0 > vtL) { V = V0 + vtL; }
      } else {
        const fe = -(V - 0) / tau; f = fe; V = Math.max(0, V + fe * dt);
        pa = peep + (s.mode === 'vcac' || s.mode === 'pcac' || s.mode === 'psv' || s.mode === 'niv' ? 0 : 0);
        if (own) pa = peep;
      }
      paw.push(pa); flow.push(f * 60); vol.push(V * 1000); pmus.push(pm);
    }
    const pmean = paw.reduce((a, b) => a + b, 0) / paw.length;
    return { T: T, t: t, paw: paw, flow: flow, vol: vol, pmus: pmus, pmean: pmean, own: own };
  }
  /* the static pressure–volume curve of the respiratory system for the lungs panel: a sigmoid whose middle slope is the compliance */
  function pvCurve(p) {
    const vmax = p.crs * 32, k = 8, p0 = 18;   // the upper inflection near 28 cm H2O, where the plateau limit comes from
    const f = (P) => vmax / (1 + Math.exp(-(P - p0) / k)) - vmax / (1 + Math.exp(p0 / k));
    return { f: f, vmax: vmax, lip: p0 - 1.3 * k, uip: p0 + 1.3 * k };
  }
  function grade(c, out) {
    const tube = out.mode === 'vcac' || out.mode === 'pcac' || out.mode === 'psv', sup = tube || out.mode === 'niv';
    return c.targets.filter(t => !t[4] || (t[4] === 'tube' ? tube : sup)).map(t => { const okk = !!t[1](out); return { name: t[0], ok: okk, advice: okk ? '' : (t[2] || t[3] || '') }; });
  }
  function verdict(c, out) {
    const g = grade(c, out), n = g.filter(x => x.ok).length;
    const dead = out.ph < 6.95 || out.spo2 < 0.75 || out.co < 2.2;
    const left = g.length - n;
    const summary = dead ? 'Peri-arrest: ' + (out.ph < 6.95 ? 'the pH is ' + out.ph.toFixed(2) : (out.spo2 < 0.75 ? 'SpO2 ' + Math.round(out.spo2 * 100) + '%' : 'the output has collapsed on this intrathoracic pressure')) + '. Change the plan now.' : (left === 0 ? 'All targets met: a sound plan for the hour. Reassess with a gas in 30 minutes.' : (left === 1 ? 'Nearly there — one target left.' : left + ' targets unmet; read the advice and change one thing at a time.'));
    return { checks: g, met: n, total: g.length, dead: dead, summary: summary };
  }

  /* ================================================================== topics ================================================================== */
  T.vent_basics = { title: 'How a ventilator breathes', kicker: 'The equation of motion · trigger, target, cycle · volume against pressure', blocks: [
    { p: 'A ventilator does one thing: it raises the pressure at the airway opening so that gas moves into the lung, and then lets it fall so that recoil pushes the gas out. Everything about a breath follows from the equation of motion — the pressure needed is the volume divided by the compliance, plus the flow times the resistance, plus whatever pressure is already in the alveoli — and from three questions: what starts the breath, what shapes it, and what ends it.' },
    { h: 'The equation of motion', ul: [
      'Paw + Pmus = V/Crs + Flow × Raw + PEEPtotal. The ventilator (Paw) and the patient (Pmus) share the left side; the right side is the load. A passive patient on volume control: the ventilator pays all of it. A patient on pressure support: the ventilator pays a fixed share and the patient the rest.',
      'Read it on the screen: in volume control with constant flow, the pressure jumps by Flow × Raw at the start (the resistive step), climbs along V/Crs, peaks, and falls to the plateau when flow stops (the pause). Peak − plateau is resistance × flow; plateau − PEEP is volume / compliance. Those two numbers are the whole of bedside mechanics.',
      'The same volume through a stiffer lung (lower Crs) needs more pressure; the same volume through a narrower airway (higher Raw) needs more pressure only while gas is flowing. A high peak with a normal plateau is an airway problem (bronchospasm, secretions, the tube); a high plateau is a lung or chest wall problem.'] },
    { h: 'Trigger, target, cycle', table: { head: ['Phase', 'The question', 'The options', 'The setting'], rows: [
      ['Trigger', 'What starts the breath?', 'Time (the set rate) or the patient (a flow or pressure deflection)', 'Rate; trigger sensitivity'],
      ['Target (limit)', 'What does the ventilator hold constant during the breath?', 'Flow — and so volume (volume control) · pressure (pressure control, pressure support)', 'VT and flow; Pinsp or PS'],
      ['Cycle', 'What ends the breath?', 'Volume delivered (VC) · time elapsed (PC) · flow fallen to a fraction of its peak (PS)', 'VT; Ti; cycle-off %'],
      ['Baseline', 'What is held between breaths?', 'PEEP', 'PEEP']] } },
    { widget: 'ventmodes' },
    { h: 'Volume or pressure?', ul: [
      'Volume control guarantees the minute ventilation and makes the mechanics legible; the pressure is the result and must be watched (plateau ≤ 30, driving pressure ≤ 15). Pressure control caps the pressure by design and gives a decelerating flow that matches demand; the volume is the result and must be watched (alarms on low and high expired volume).',
      'In a passive patient the two are interchangeable: the same volume and the same pressures, just reached in a different order. They differ when the patient breathes: in VC a strong effort does not change the volume (the patient “flow-starves”); in PC a strong effort adds volume (the patient gets what they pull).',
      'Pressure-regulated volume control (PRVC, VC+, AutoFlow) is pressure control with a volume target: the machine adjusts the pressure breath by breath. It is comfortable when the patient is passive and treacherous when the patient pulls — the machine lowers its support exactly when the patient works hardest.'] },
    { h: 'After intubation: a first setting', ol: [
      'Mode: volume control–assist control. Tidal volume 6–8 mL/kg of predicted body weight (height and sex; 6 mL/kg if the lung is injured). Rate 14–18 (higher if the patient needs the minute ventilation — acidosis, sepsis). PEEP 5. FiO2 1.0, then down to SpO2 92–96% within the hour.',
      'Inspiratory flow 50–60 L/min (Ti about 1 s); in obstruction 70–100. Trigger: flow 2 L/min. Alarms: high pressure 35–40; low minute volume.',
      'Within 15 minutes: an inspiratory hold (plateau), an expiratory hold (auto-PEEP), a gas. Then set the ventilator to the patient: the lung (protective ventilation), the airway (time to exhale), the brain (the PaCO2 it needs), the acid (the minute ventilation it was doing for itself).',
      'Every day: wake, breathe (a spontaneous breathing trial on PS 5–8 or CPAP, 30–120 minutes), and ask whether the tube is still needed.'] },
    { h: 'Protective ventilation in one list', ul: [
      'Tidal volume 6 mL/kg PBW (4–8), plateau ≤ 30, driving pressure ≤ 15, PEEP enough to keep the lung open and no more, FiO2 enough for SpO2 88–95%, permissive hypercapnia to a pH of 7.20–7.25, prone for 16 hours a day when the PaO2/FiO2 is under 150, neuromuscular blockade for the first 48 hours only when asynchrony or the pressures demand it.',
      'Why: the lung in ARDS is small (the “baby lung”), not stiff; a normal tidal volume overstretches what is open. ARDSNet (2000): 6 against 12 mL/kg cut mortality from 40% to 31%. Driving pressure (Amato 2015) is the variable that tracks survival across trials.',
      'Mechanical power — the energy delivered per minute (pressure, volume, flow and rate together) — is the current frame for lung injury; the rate counts too.'] },
    { src: ['Tobin MJ (ed). Principles and Practice of Mechanical Ventilation, 3rd ed. McGraw Hill 2013.', 'Acute Respiratory Distress Syndrome Network. Ventilation with lower tidal volumes as compared with traditional tidal volumes for ALI and ARDS. N Engl J Med 2000;342:1301–8.', 'Amato MBP, et al. Driving pressure and survival in the acute respiratory distress syndrome. N Engl J Med 2015;372:747–55.', 'Chatburn RL, El-Khatib M, Mireles-Cabodevila E. A taxonomy for mechanical ventilation: 10 fundamental maxims. Respir Care 2014;59:1747–63.', 'Kenny JE. An Approach to Mechanical Heart-Lung Interaction, 2020, chapters 1 and 9.'] }
  ] };

  T.vent_settings = { title: 'The settings, one by one', kicker: 'Nomenclature: what each knob does, what it is called, what happens when it moves', blocks: [
    { p: 'Every ventilator screen shows the same two dozen things under a dozen different names. Below they are grouped by what they do — the breath, its timing, the pressure targets, the triggers, the alarms, and the numbers the ventilator measures rather than sets — with typical values and what moves when each is turned up or down. Search by name or by alias.' },
    { widget: 'ventsettings' },
    { h: 'Reading the numbers back', ul: [
      'Peak pressure: the highest airway pressure of the breath; resistance and compliance together. Plateau: the alveolar pressure, read on an inspiratory hold. Total PEEP: set PEEP plus auto-PEEP, read on an expiratory hold. Driving pressure = plateau − total PEEP. Compliance = VT / driving pressure. Resistance = (peak − plateau) / flow.',
      'A sudden high-pressure alarm in volume control: peak up with plateau up is the lung or the chest (pneumothorax, a mainstem intubation, oedema, abdominal pressure, fighting the ventilator); peak up with plateau unchanged is the airway (a kink, a bite, a plug, bronchospasm). Disconnect and bag if in doubt: DOPES — Displacement, Obstruction, Pneumothorax, Equipment, Stacking.',
      'A sudden low pressure or low volume alarm: a disconnection, a cuff leak, a chest drain leak, a circuit crack.'] },
    { h: 'Predicted body weight', note: 'Men: 50 + 0.91 × (height in cm − 152.4). Women: 45.5 + 0.91 × (height − 152.4). A 165 cm woman is 57 kg for the ventilator whatever she weighs; 6 mL/kg is 340 mL.' },
    { src: ['Chatburn RL. Classification of ventilator modes: update and proposal for implementation. Respir Care 2007;52:301–23.', 'Hess DR, Kacmarek RM. Essentials of Mechanical Ventilation, 4th ed. McGraw Hill 2019.', 'ARDS Clinical Network. Mechanical ventilation protocol summary (the PEEP/FiO2 tables).'] }
  ] };

  T.vent_niv = { title: 'Non-invasive support', kicker: 'CPAP · bilevel NIV · high-flow nasal oxygen: who, how, and when it is failing', blocks: [
    { p: 'Three ways to help without a tube. CPAP holds one pressure and does no breathing for the patient: it recruits, splints the upper airway and unloads the left ventricle. Bilevel NIV adds a pressure support above the PEEP for every breath: it unloads the muscles and raises the tidal volume, so it treats hypercapnia. High-flow nasal oxygen delivers a reliable FiO2 with a little PEEP and dead-space washout, and is comfortable for hours. The evidence is strongest where the physiology is simplest: hypercapnic COPD and cardiogenic oedema for NIV, de novo hypoxaemia for high flow.' },
    { h: 'Who', table: { head: ['Situation', 'First choice', 'Evidence', 'Notes'], rows: [
      ['COPD exacerbation, pH < 7.35, PaCO2 > 45', 'Bilevel NIV', 'Strong: intubation and mortality roughly halved', 'The best-proven use. Start within the hour; reassess at 1–2 h'],
      ['Cardiogenic pulmonary oedema', 'CPAP 8–10 or bilevel', 'Strong: fewer intubations, lower mortality', 'With nitrates; most turn the corner in an hour'],
      ['Obesity hypoventilation, decompensated', 'Bilevel with a high EPAP (8–10) and a backup rate', 'Good', 'Home NIV afterwards'],
      ['Neuromuscular weakness, chest wall disease', 'Bilevel', 'Good', 'Cough assistance matters as much'],
      ['Immunocompromised hypoxaemic failure', 'High flow or NIV (helmet)', 'Moderate', 'Avoid intubation if possible, but do not delay it'],
      ['Post-extubation, high risk (COPD, obese, hypercapnic)', 'NIV prophylaxis (or high flow)', 'Good', 'Prophylaxis works; rescue NIV after failure delays reintubation and harms'],
      ['De novo hypoxaemic failure (pneumonia, early ARDS)', 'High-flow nasal oxygen', 'Moderate (FLORALI)', 'NIV with a face mask does worse (large tidal volumes); watch the ROX index'],
      ['Asthma', 'Cautious trial at most', 'Thin', 'Do not delay the tube in a tiring patient'],
      ['Palliative dyspnoea', 'High flow or NIV for comfort', 'Moderate', 'With a plan for stopping']] } },
    { h: 'When not to', ul: [
      'Respiratory or cardiac arrest, or the need to secure the airway now; an airway the patient cannot protect (coma, bulbar weakness, vomiting, upper GI bleeding, copious secretions); facial trauma, burns or surgery that the mask cannot fit; an untreated pneumothorax; haemodynamic instability or an arrhythmia; severe agitation; a pH under 7.20–7.25 with a falling conscious level is relative — try, with the tube at the bedside.',
      'Drowsiness from CO2 alone (GCS 10–14) is not a contraindication in COPD if the patient is watched: it often clears within the hour.'] },
    { h: 'How', ul: [
      'Mask: oronasal first; a helmet for long runs and hypoxaemic failure; a nasal mask for the chronic patient. Sitting up. Explain, hold the mask on by hand for the first minutes, then strap it.',
      'Bilevel: EPAP 4–5 (8–10 in obesity hypoventilation and oedema), IPAP 10–12 to start and up by 2–3 every 10–15 minutes to 20–25 until the tidal volume is 6–8 mL/kg and the rate is falling; a backup rate of 12–15 in S/T; a rise time of 0.1–0.3 s; a cycle-off of 40–60% if there is a leak or COPD; FiO2 to SpO2 88–92% in retainers, 92–96% otherwise. Humidify.',
      'CPAP: 5–10 cm H2O; in oedema 8–10.',
      'High flow: start 40–60 L/min and FiO2 to target, 34–37 °C; wean the FiO2 before the flow.'] },
    { h: 'Is it working? (1–2 hours)', ul: [
      'Better: the rate falling, the accessory muscles resting, the pH rising, the PaCO2 falling, the patient more awake and talking. Worse: the same or more work, a pH still under 7.25 after an hour, a rising PaCO2, confusion, a leaking mask, intolerance, secretions — intubate before the arrest, not after it.',
      'Scores: HACOR (heart rate, acidosis, consciousness, oxygenation, respiratory rate) over 5 at 1 h predicts NIV failure; the ROX index (SpO2/FiO2 divided by the respiratory rate) under 3.85 at 12 h on high flow predicts intubation, over 4.88 success.',
      'The trap: NIV that “works” on the numbers while the patient breathes 500–800 mL breaths at a rate of 35 is injuring the lung; watch the expired tidal volume as well as the gas.'] },
    { src: ['Rochwerg B, et al. Official ERS/ATS clinical practice guidelines: noninvasive ventilation for acute respiratory failure. Eur Respir J 2017;50:1602426.', 'Frat JP, et al. High-flow oxygen through nasal cannula in acute hypoxemic respiratory failure (FLORALI). N Engl J Med 2015;372:2185–96.', 'Roca O, et al. An index combining respiratory rate and oxygenation to predict outcome of nasal high-flow therapy (ROX). Am J Respir Crit Care Med 2019;199:1368–76.', 'Duan J, et al. Assessment of heart rate, acidosis, consciousness, oxygenation, and respiratory rate to predict noninvasive ventilation failure (HACOR). Intensive Care Med 2017;43:192–9.', 'Davidson AC, et al. BTS/ICS guideline for the ventilatory management of acute hypercapnic respiratory failure in adults. Thorax 2016;71(Suppl 2):ii1–35.'] }
  ] };

  T.vent_waves = { title: 'Waveforms and asynchrony', kicker: 'Pressure, flow and volume against time · what the shapes mean · the asynchronies', blocks: [
    { p: 'The three traces on the screen — airway pressure, flow and volume against time — are the ventilator’s own account of each breath. The mode decides which trace is the square (flow in volume control, pressure in pressure control); the mechanics decide the heights and the slopes; the patient’s efforts show as dips, humps and scoops wherever they fight or miss the machine. Pick a pattern to see it drawn and what to do about it.' },
    { widget: 'ventwaves' },
    { h: 'The loops', ul: [
      'Pressure–volume: the slope is compliance; a lower inflection point marks recruitment at the start of the breath (set PEEP above it), an upper inflection point with a “beak” at the top marks overdistension (lower the volume). Hysteresis between the limbs is normal; a loop that opens to the right is a leak.',
      'Flow–volume: expiratory flow that does not reach zero before the next breath is auto-PEEP; a scooped expiratory limb is obstruction; a sawtooth is secretions; a limb that does not close is a leak.'] },
    { h: 'A checklist for asynchrony', ol: [
      'Count the patient’s efforts (the chest, the neck, the pressure dips) and compare with the ventilator’s rate: a difference is missed triggers.',
      'Look at the end of inspiration: a pressure hump is delayed cycling; a flow that reverses then dips back is premature cycling; a second breath on top of the first is double triggering.',
      'Look at inspiration in volume control: a scoop is flow starvation.',
      'Look at expiration: flow not reaching zero is auto-PEEP; notches are missed efforts.',
      'Then fix the cause rather than the sedation: flow, Ti, cycle-off, PEEP against auto-PEEP, the mode, pain, acidosis, fever; sedate or paralyse only when the drive itself is the injury.'] },
    { src: ['Dhand R. Ventilator graphics and respiratory mechanics in the patient with obstructive lung disease. Respir Care 2005;50:246–61.', 'Thille AW, et al. Patient–ventilator asynchrony during assisted mechanical ventilation. Intensive Care Med 2006;32:1515–22.', 'Gilstrap D, MacIntyre N. Patient–ventilator interactions: implications for clinical management. Am J Respir Crit Care Med 2013;188:1058–68.', 'Hess DR. Ventilator waveforms and the physiology of pressure support ventilation. Respir Care 2005;50:166–86.'] }
  ] };

  T.vent_sim = { title: 'The ventilation simulator', kicker: 'Triage a patient, set the support, read the ABG and VBG, meet the targets', blocks: [
    { p: 'Eight patients in respiratory failure. For each: read the presentation and the gases, choose the level of support (oxygen and observation, high-flow, NIV, or the tube), set the ventilator or the mask, and apply it. Twenty minutes later the arterial and venous gases, the pressures and the circulation are what your settings made them; a day later the kidney has had its say. The case’s own targets grade the plan and say what to change. The physiology underneath is the one taught in the area: alveolar ventilation sets the PaCO2 and the pH with the bicarbonate; shunt, V/Q and PEEP set the PaO2; time constants set the auto-PEEP; and the pressure in the chest sets the venous return.' },
    { widget: 'ventsim' },
    { h: 'The rules the simulator plays by', ul: [
      'PaCO2 = 0.863 × V̇CO2 / V̇A, where V̇A = (VT − VD) × rate: dead space is the anatomic 2.2 mL/kg plus the disease’s alveolar dead space, more with overdistension (a plateau above 28) and a low cardiac output. pH from Henderson–Hasselbalch with the bicarbonate the patient brought; after a day the kidney moves it toward the expected compensation (0.35 mmol/L per mm Hg of chronic hypercapnia) — or the ketoacidosis clears with insulin.',
      'PaO2 from the shunt equation: a true shunt that PEEP recruits (as far as the lung is recruitable) and a low-V/Q admixture that FiO2 overcomes; the mixed venous content falls when the cardiac output does, which drags the PaO2 down with it. The VBG sits 5–6 mm Hg of CO2 above the arterial (more with a low output) and 0.03–0.05 pH units below.',
      'Mechanics: plateau = total PEEP + VT/Crs; auto-PEEP from the time constant and the expiratory time; pressure-targeted breaths deliver what the pressure can fill within Ti; the patient’s own drive adds breaths (in assist-control each a full breath) and, in pressure support and NIV, sets the rate and part of the volume — scaled by the sedation. Venous return falls with the pressure in the chest, more in the dry patient; a failing left ventricle, on the other hand, likes positive pressure.',
      'A model, not a patient: the directions and the orders of magnitude are right; the exact numbers are a teaching fiction.'] },
    { src: ['Marino PL. The ICU Book, 4th ed. Wolters Kluwer 2014 (chapters on mechanical ventilation, acid–base and blood gases).', 'West JB, Luks AM. West’s Respiratory Physiology, 11th ed. (chapters 2, 5 and 6).', 'Leatherman J. Mechanical ventilation for severe asthma. Chest 2015;147:1671–80.', 'Fan E, et al. ATS/ESICM/SCCM guideline: mechanical ventilation in adult patients with ARDS. Am J Respir Crit Care Med 2017;195:1253–63.', 'Byrne AL, et al. Peripheral venous and arterial blood gas analysis in adults: are they comparable? Respirology 2014;19:168–75.'] }
  ] };

  const GROUPS = [
    { title: 'The breath', ids: ['vent_basics', 'vent_settings'] },
    { title: 'Without a tube', ids: ['vent_niv'] },
    { title: 'Reading the screen', ids: ['vent_waves'] },
    { title: 'Practice', ids: ['vent_sim'] }
  ];
  root.PFT_VENT = { topics: T, groups: GROUPS, SETTINGS: SETTINGS, MODES: MODES, WAVES: WAVES, wave: wave, CASES: CASES, PBW: PBW, mech: mech, gas: gas, grade: grade, verdict: verdict, acidBase: acidBase, traces: traces, pvCurve: pvCurve, SED: SED, SUPPORTED: SUPPORTED };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PFT_VENT;
})(typeof window !== 'undefined' ? window : globalThis);
