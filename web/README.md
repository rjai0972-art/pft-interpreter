# PFT Interpreter — web source

The app is one self-contained HTML page (`vendor/three.min.js`, three.js r147 under the MIT license, is inlined for the 3D airway model in Learn). `src/` holds the engine (four parts plus the generated phrase catalog), the
interface, the glossary, the Learn text (`education.js` for the PFT area, `anatomy.js` for the anatomy and bronchoscopy area with the bronchial tree, its 3D skeleton, the nodal stations and the segment table behind `ui_4b_anatomy.js` and `ui_4c_tree3d.js`, `ecg.js` for the conduction model and its scenarios behind `ui_4d_ecg.js`, `nodules.js` for the nodule guidelines, the probability models and the advisor behind `ui_4e_nodules.js`) and the worked examples; `build.js` assembles `dist/PFT_Interpreter_standalone.html`
and `build_desktop.js` copies it to `../app/index.html`, which GitHub Pages serves and the desktop app loads.

```
node build_catalog.js   # catalog/pft_phrases.json -> src/engine_1a_catalog.js (run after changing the catalog)
node build.js           # dist/engine.js, dist/ui.js, dist/PFT_Interpreter_standalone.html
node build_desktop.js   # ../app/index.html
node tests/engine.test.js && node tests/catalog.test.js      # engine rules, handoff fixtures
node tests/e2e6.js; node tests/e2e7.js; node tests/e2e2.js; node tests/e2e3.js; node tests/e2e4.js; node tests/e2e_fuzz.js   # browser (Playwright)
```

## How the interpretation is built

1. **Measurement states first.** Every index is read with its documented reliability (separate FEV1/FVC grades,
   documented limitations, per-domain quality) and classified against its own reference: LLN at z = −1.645, ULN at
   +1.645, three-level impairment grade (mild −1.645 to −2.5, moderate below −2.5 to −4.0, severe below −4.0) applied
   to FEV1, FVC and DLCO. Unknown never becomes normal; an invalid component drives no pattern.
2. **Patterns from reliable states only** (`src/engine_2_facts.js`): obstruction, obstruction with preserved FEV1,
   low FVC with restriction unconfirmed, nonspecific (needs a normal TLC), restriction (TLC), simple/complex/mixed,
   air trapping vs hyperinflation vs large lungs, DLCO with VA/KCO and the hemoglobin basis, muscle, posture,
   challenge states (positive / negative / incomplete / indeterminate / diluent response), FeNO, serial comparability.
3. **The findings map `F`** uses the exact fact keys of the phrase catalog; the catalog is matched by strict equality.
4. **Sections** report facts at the chosen level (concise / standard / detailed) in the reading physician's voice
   (`valuesLine`, `findingSentences`, `metricBlock` in `engine_3_sections.js`): the numbers line first, then one
   sentence that groups the indices by state with the defining index leading when abnormal ("FEV1/FVC is reduced,
   with a moderately reduced FEV1 and a normal FVC"); invalid indices keep their own sentence; the detailed level
   appends the catalog's caveats. Prior studies are compared inside their own section (`priorLines`, `serialVerdict`)
   with the percent change and a significance verdict; `priorImpression` writes the serial sentences of the
   interpretation. The interpretation is a paragraph, not a numbered list.
   At the minimal wording level (`engine_3b_minimal.js`, the interface's default) the spirometry, lung-volume, DLCO
   and 6MWT sections are rewritten as one or two sentences each without the numbers line, the bronchodilator verdict
   and the change since the prior study are folded into the section of their index, and there is no past-testing or
   quality section; `minimalImpression` writes the one- or two-sentence interpretation.
5. **The Interpretation** is one synthesis: ventilatory pattern, lung volumes and gas transfer in one statement, then
   the gas-transfer mechanism, bronchodilator response, adjunct tests, serial change, and what would clarify the picture.
   Review-only wording (disease context, differentials, follow-up) is offered as *suggested additions* and included
   only when tapped.
6. **Differentials and additional studies** (`engine_1c_differentials.js`): each verified finding has a group with
   the physiologic causes that produce it and the studies that sort them out. Groups are offered on the Report step
   and stored by id in `state.review` (`dx.<group>.<item>`, `study.<id>`); tapped differentials become one
   Interpretation sentence per finding, tapped studies one deduplicated "Additional studies to consider" line. A
   generic catalog phrase that says the same thing (for example `followup.hb` once `study.hb` is chosen) is withheld
   so nothing is stated twice.

The 6MWT facts include the Enright & Sherrill 1998 predicted distance (`enrightSherrill` in `engine_2_facts.js`,
the MDCalc calculator): used when no predicted value was reported, LLN derived when the reported equation is Enright &
Sherrill, never overriding a reported value; `six.predUse`, `six.llnUse`, `six.predSrc` and `six.llnSrc` say which.

Interface notes (`src/ui_1_core.js`): spirometry, lung volumes and DLCO are the default tests (`pft.defaults.v1`,
editable from the "Additional studies" list); the value boxes of a grid section are hidden until "Bronchodilator",
"Prior study" or "Values" is on, when `compareTable` draws one table per section (this study's z / value / % predicted,
the post-bronchodilator value and change, one column per prior study with the date in its header); `revealField` opens
that table when a prompt asks for a number. The anatomy area (`src/ui_4b_anatomy.js`, data in `src/anatomy.js`):
`LANDMARKS` lists the structures around each airway level by clock position (anterior 12, patient's right 3; the
trachea has `trachea_upper` and `trachea`) and `landRing` draws them around the scope view, growing the picture to fit
every label; `MEDIASTINUM` lists the vessels (tubes through points), blobs and stations around the tree for the 3D mediastinum view
and `NEXT_BRANCH` names the next carina for the depth readout; `SONO` describes the EBUS picture of each reachable
station and `sonoFig` draws it; `picsBlock` keeps the
user's own photos per view or station in `localStorage` (`pft.anat.pics.v1`, scaled to about 900 px) — nothing is
uploaded and no published atlas image is bundled. The 3D module (`src/ui_4c_tree3d.js`) maps the model frame (x toward
the patient's left, y anterior, z superior) to the scene as (x, z, y) — a right-handed mapping; negating an axis would
mirror the anatomy — and keeps the scope's depth along the current airway (`T3.depth`, millimetres; `t3Move`,
`t3Enter`, `t3DepthText`), held a centimetre back from any carina so both openings stay in view.

The ECG lab (`src/ecg.js`, testable in node): `normalSegments()` lists the atrial and ventricular regions with their
activation time, duration, mean wavefront direction (x left, y inferior, z anterior) and weight; a scenario's
`apply(S, degree, R)` delays, slows, redirects or adds regions and sets the PR; `sequence()` returns the adjusted
regions with the QRS duration and the frontal axis; `beats()` lays the P and QRS onsets over the strip (Wenckebach,
Mobitz II and complete block live here); `voltageAt(lead, seq, beats, t)` sums the regions' dipoles projected onto
the lead, with repolarisation concordant for muscle activated on time and discordant for muscle activated late;
`stateAt()` tells the drawing which regions and paths are active. `ui_4d_ecg.js` draws the paper (25 mm/s,
10 mm/mV), the heart with its paths and block marks, the vector dial and the player.

The scope simulator (`src/ui_4c_tree3d.js`, inside mode): `t3MedParts()` builds the mediastinal geometries once for the
mediastinum view and for the see-through overlay (`t3Overlay`: opacity by distance from the scope tip to each part's
sample points, labels as sprites); `t3Advance` drives along the airway and, at a carina, into the opening the scope is
aimed at (`t3AimedKid`: within 0.6 rad of an opening, but a look within 0.12 rad of the axis bumps into the keel);
`t3Pad` is the steering pad, `t3ViewLabels` projects the openings' names onto the picture; keys W/S or ↑/↓ drive,
← →/A D and Q E aim, R F roll when "Keep anterior up" is off, 1–9 pick an opening, Backspace backs out, Home restarts.
The simulator now sits beside the tree map in the navigator (`simFig`, its own renderer and canvas `an-3d-scope`;
`t3Frame` draws both canvases in one loop) with the atlas ring folded beneath it; `mapTip` moves the scope-tip dot along
the current airway of the map without redrawing the page. `ebusPop(stationId)` (`src/ui_4b_anatomy.js`) is the EBUS
card: `SONO[station]` gives the poster layout (`near` positions L/R/D/DL/DR/DDL/DDR/SL/SR, `views` for 11Rs/11Ri, `at`
the ring it is sampled from, `pearls`), `sonoFig` draws it (grey scale, `sonoDoppler` toggles the colour), `probeRing`
draws the small ring with the probe dot from `LANDMARKS`; `closeEbus` closes it (Escape, the backdrop, the button).
`t3ExportSTL` runs marching cubes over the capsule union at 1 mm with the surface at |d| − 1.5 (a hollow wall) and
writes a binary STL in the model frame. The CT lab (`src/ui_4f_ct.js`): `ctDraw` paints one axial section in
Hounsfield units at `CT.z` (mm from the carina, +up) through `ctGray` (the window), from `ctBody` (the chest wall
ellipse by level), `ctLungF` (the lung ellipsoids), `ctLungDots` (seeded vessel spheres), the `MEDIASTINUM` vessels
and blobs (`ctTube` samples each tube and draws a disc where the slice cuts it), the `TREE3D` airways (true cylinder
sections), the nodes, and the bones (ribs sloping through the slice, sternum, clavicles, scapulae, the vertebra and
its disc spaces); every structure registers a hit ellipse in `CT.shapes` (with `med`, `station` or `tree` ids for
the 3D highlight and the EBUS card) and `ctLabels` prints the margins with leader lines (`names`) or numbered markers
(`numbers`, below 430 px, with the picture zoomed); `ctSetZ` moves the slider, the plane on the mediastinum model
(`T3.ctZ`) and the quiz. The foundations (`src/physio.js`, testable in node): the topics of the anatomy → physiology →
bronchoscopy area in course order (`groups`), `LEVELS` (the airway wall level by level), `p50`/`sat`/`o2content`
(a Severinghaus-style dissociation curve with the P50 moved by pH, temperature, PCO2 and 2,3-DPG), `pao2`/`aaNormal`.
The heart–lung model (`src/heartlung.js`, testable in node): `ptpOf` (the lung's static curve, V = 100·(1 − e^(−Ptp/τ)),
τ = 11.6/compliance), `cwPpl` (the passive chest wall, zero at 60% VC), `rsPaw` (Rahn: their sum), `frcOf` (the
crossing), `breath` (a half-sine inspiration and an exponential expiration cut by the next breath — the end-expiratory
volume above FRC is dynamic hyperinflation and its pressure auto-PEEP; the pleural pressure follows the lung curve
minus the resistive pressure on a spontaneous breath, with post-inspiratory braking on expiration, and the chest wall
curve on a passive ventilator breath; elastic and resistive work from the areas), `circ` (venous return from the mean
systemic pressure to the collapse plateau, a cardiac function curve starting at the pleural pressure with its slope set
by the pulmonary vascular tone and the lung volume's distance from FRC, the operating point by bisection) and `run`
(the whole cycle); `PRESETS` are the clinical scenes. `ui_4g_physio.js` draws the syllabus, the ladder (`ladderFig`),
the breath cycle, the spirogram, the A–a calculator, the dissociation-curve lab (`odcLab`) and the heart–lung lab
(`hlLab`: the Campbell and Guyton SVGs redrawn each animation frame from `HLS.run`). Mechanical ventilation
(`src/vent.js`, testable in node): `SETTINGS` (the glossary), `MODES` (trigger/target/cycle), `WAVES` and `wave(id)`
(pressure, flow and volume traces from the equation of motion for each pattern, with a schedule of breath starts so that
double triggering stacks), `CASES` (each with the patient's mechanics and gas-exchange parameters, the triage options with
verdicts, the starting NIV and ventilator settings, and the targets with advice — a fifth element scopes a target to the
ventilator or to any supported mode), `mech` (pressures, auto-PEEP, delivered volume for pressure-driven breaths), `gas`
(a fixed-point iteration of the patient's drive, the delivered breaths, dead space, PaCO2, pH with the bicarbonate now or
after a day, oxygenation from a recruitable shunt plus a V/Q admixture, the venous gas, the circulation under PEEP),
`acidBase` (the reading in words), `grade`/`verdict`. `ui_4h_vent.js` draws the mode matrix, the glossary, the waveform
viewer and the simulator (`VS` holds the case, the plan, the settings and the chart). The nodule module (`src/nodules.js`, testable in node): `mayo`, `va`, `brock` are the published equations; `vdt` the
doubling time; `fleischner(q)` and `lungRads(q)` return the guideline's step for a nodule described by setting, type,
mean diameter, solid component, status (baseline / new / growing / stable), multiplicity and patient risk.

`catalog/` holds the handoff package: the phrase catalog (source of truth), its schema, the rules specification, the
human-readable reference and the test vectors. `PFT_Rules_and_Integration.txt` is the rule specification the engine
implements; the decisions that go beyond it are documented in comments where they are made (restriction severity by
TLC z-score is the Annals ATS 2025 convention and is named as such in the report; an FRC above its ULN is accepted as
an elevated resting volume alongside FRC/TLC).
