# PulmCrit Daddy — web source

The app is one self-contained HTML page (`vendor/three.min.js`, three.js r147 under the MIT license, is inlined for the 3D airway model in Learn). `src/` holds the engine (four parts plus the generated phrase catalog), the
interface, the glossary, the Learn text (`education.js` for the PFT area, `anatomy.js` for the anatomy and bronchoscopy area with the bronchial tree, its 3D skeleton, the nodal stations and the segment table behind `ui_4b_anatomy.js` and `ui_4c_tree3d.js`, `ecg.js` for the conduction model and its scenarios behind `ui_4d_ecg.js`, `nodules.js` for the nodule guidelines, the probability models and the advisor behind `ui_4e_nodules.js`) and the worked examples; `build.js` assembles `dist/PulmCritDaddy_standalone.html`
and `build_desktop.js` copies it to `../app/index.html`, which GitHub Pages serves and the desktop app loads.

```
node build_catalog.js   # catalog/pft_phrases.json -> src/engine_1a_catalog.js (run after changing the catalog)
node build.js           # dist/engine.js, dist/ui.js, dist/PulmCritDaddy_standalone.html
node build_desktop.js   # ../app/index.html
node tests/engine.test.js && node tests/catalog.test.js      # engine rules, handoff fixtures
node tests/physio.test.js; node tests/vent.test.js; node tests/ecmo.test.js; node tests/drips.test.js; node tests/echo.test.js; node tests/monitor.test.js; node tests/real.test.js   # the Learn models (hemo.test.js needs physio.js required first)
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
`acidBase` (the reading in words), `grade`/`verdict`, `traces(p, s, out)` (one cycle of pressure, flow, volume and muscle
pressure for the screen, from the equation of motion with the model's rate, auto-PEEP and effort) and `pvCurve(p)` (the
respiratory system's sigmoid static curve with the compliance as its mid-slope and inflections near 8 and 28 cm H2O).
`ui_4h_vent.js` draws the mode matrix, the glossary, the waveform viewer and the simulator (`VS` holds the case, the plan,
the settings, the patient overrides `pOver` from the sliders, the model output and the chart; `vsRefresh` recomputes the
gases, the tiles, the lungs and the P–V panel on any change without rebuilding the inputs; `vsDrawScreen` paints the
canvas each animation frame at the displayed size — the cycle repeated across an 8 s window behind a sweeping cursor —
and `vsAnimateLungs` scales the lung pair about the apices by the volume above FRC and drops the diaphragm with it; the
frame loop stops when the screen leaves the document). ECMO (`src/ecmo.js`, testable in node, loads after physio.js): the topics and groups, `CONFIGS`,
`DRAIN`/`RETURN` (cannula capacities), `pump(p, s)` (the flow a speed earns against the drainage, suck-down and chatter,
the three pressures and ΔP), `membrane(p, s, preO2, preCO2)` (post-membrane PO2 and PCO2 from the FdO2, the sweep-to-flow
ratio and the membrane's condition, with a transfer cap), `runVV` (recirculation, the effective-flow mix into the
pulmonary artery, the native lung's shunt, a Fick iteration for the venous content, a CO2 balance between the membrane
and the native alveolar ventilation), `runVA` (native ejection against the afterload of the circuit's pressure, MAP from
the SVR, LVEDP and distension, a branch-by-branch mixing zone along the aorta so each territory has its own gas, limb
risk), `alarms`, `PRESETS`/`preset(id)` and `SCENARIOS`. `ui_4i_ecmo.js` draws the circuit on a patient (`ecSvg`: blood
coloured by saturation, CSS-animated flow and impeller, chatter, clots, the mixing zone, the devices), the configurations
gallery, the lab (`ECS` state; `ecRefresh` redraws the drawing, the console and the gas panels on any change) and the
scenarios (`ECS.answers`). `extras/build_ecmo_anki.py` writes the Anki deck straight into the collection.anki2 schema;
`extras/build_ecmo_reference.js` renders chosen blocks of `ecmo.js` to a PDF with Playwright. `LABCASES` in `ecmo.js` are
the guided lab scenarios: each has a starting patient and circuit (`p`, `s` over `PATIENT`/`SETTINGS`), the presentation,
a `look` line, `steps` of four options `[id, label, verdict, reason, do(p, s)]` where `do` mutates the lab state, and a
closing line; `ecGuide()` in `ui_4i_ecmo.js` renders them above the lab grid (`ECS.guide` holds the case, the step, the
moves taken with their before/after tables, a snapshot to undo a non-best move, and the per-case results). Haemodynamics
(`src/hemo.js`, testable in node after physio.js): `PATIENT` (Pms, venous resistance, each ventricle's contractility and
stiffness, SVR, PVR, MR/TR grades, pericardial pressure, constriction, Hb, VO2, SaO2, BSA, ventilation and PEEP, the
devices), `run(p)` (an outer bisection on RAP so that venous return (Pms − RAP)/Rv equals what the right heart and a
circuit carry, an inner bisection on LVEDP so that the left heart passes what the right heart sends, and inside `loop`
a bisection on MAP against the SVR and on PA systolic against the pulmonary compliance; the ventricles use an
exponential EDPVR and a linear ESPVR with Ees, dilating as they fail; the pericardium subtracts from the transmural
filling pressure; MR's regurgitant fraction grows with the pressure the ventricle ejects against; PEEP is read in part
by the catheter and taken in part from the venous return; Fick for the SvO2) returning pressures, flows, SVR/PVR, TPG,
DPG, PAPi, CPO, the ratios, the echo surrogates (TAPSE, RV:LV, TAPSE/PASP, LVOT VTI, Ea/Ees), `flags`, `signature`
(the shock type), `forrester` and the PH class; `trace(o, pos, t)` synthesises the ECG, RA, RV, PA, wedge and arterial
waveforms for a phase of the cycle (a, c, v waves, x and y descents, lost y in tamponade, dip-and-plateau in
constriction, big v waves in MR/TR, IABP augmentation) and `breath(p, phase)` the respiratory swing; `INTERVENTIONS`
(`[id, label, fn, note]`) and `apply(p, id)`; `PRESETS`/`preset(id)`; `SCENARIOS` (preset, story, the diagnosis
question and the first-move question with verdicts). `ui_4j_hemo.js`: `hmHeartSvg` (the heart with the catheter path
dashed to the selected port, pressure tags, the devices, chambers scaled by their volumes), `hmDrawMonitor` (a canvas
sweep of the ECG and the selected port with the breath, pulsus paradoxus on the arterial trace in tamponade),
`hmControls`/`hmNumbers`, `hemoSwanFig` (the static catheter page with four labelled traces), `hemoLabFig` (`HMS`
state; `hmRefresh` redraws the heart, the monitor and the numbers) and `hemoCasesFig` (`HMS.cases`). ICU infusions
(`src/drips.js`, standalone, testable in node): `DRUGS` (id, name, cls, rec, unit, wb, conc [[label, units/mL]],
dose {start, step, interval, usual, max, ceiling, bolus}, onset, ind, mon, contra, limits, trials [[name, year,
message]]), `CLASSES`, `drug(id)`, `rateFor(dose, unit, kg, concPerMl)` / `doseFor(rate, …)` / `unitInfo(unit)`,
`nee(doses)` (the norepinephrine-equivalent dose), `SCENARIOS`; `ui_4l_drips.js`: `dripRefFig(cls)` (expandable cards;
`DRS.open`), `dripCalcFig` (`DRS.calc`: drug, bag, custom concentration, weight, dose ↔ rate, the pump, the ladder;
`DRS.vis` for the NEE panel) and `dripCasesFig` (`DRS.cases`). Echo (`src/echo.js`, standalone, testable in node):
`build(pathologyId | overrides)` makes the model (the heart frame a/n1/n2 from an apex and a base in body coordinates
x = left, y = depth, z = superior; the LV as cavity + epicardial ellipsoids with an annulus; the RV as an in-plane-rotated
ellipsoid minus the LV epicardium — a crescent from the outflow to the inflow; the atria; funnel-shaped mitral and
tricuspid leaflets that open with the cycle; the aortic root with its three cusps, the ascending aorta, arch and
descending aorta as a tube path; the pulmonary artery, IVC with a hepatic vein, SVC; the pericardium as a band around
the epicardial union, with an effusion; a liver ellipsoid with a diaphragm band; a curved chest wall `skinY(x)`);
`classify(m, x, y, z, t)` returns the structure at a point for a phase of the cycle (`cycle(t)`); `probe(params)` turns
{win, dx, dz, rot, tilt, rock} into a position and a beam/lateral/normal frame (rot about the beam from a tangent basis
toward the patient's left, tilt about the lateral axis, rock about the plane normal); `sector(W, H, depth)` caches the
per-pixel polar grid; `render(params, W, H, t)` paints intensities with hashed speckle and depth attenuation into typed
arrays and returns the ids; `regions(res, W, H)` gives each structure's pixel count and centroid; `VIEWS` holds the
eleven canonical probe parameters with tolerances and the teaching text; `score(params, viewId)` returns a 0–100
closeness with movement hints. `ui_4k_echo.js`: `ehPaint` (upscales a render into a canvas, draws labels at centroids
and an outline around one structure), `ehTorso` (the chest with the windows, the probe and its marker), `echoAtlasFig`
(a card per view with a render, the torso, the text and an own-image slot in localStorage `pcd.echo.own.<view>`),
`echoLabFig` (`EHS` state; a frame loop at ~10 fps while beating; `ehRefresh` redraws the torso and the score) and
`echoQuizFig` (`EHQ`: a random view ± a few degrees, a random heart, three questions). v8.2: `src/echo_real.js` is
generated (scratch script `echo_build.py`) from the SlicerHeart "Mitral" 4-D volume — nine phases (v8.3: at the
acquisition's full 224 × 176 × 208 resolution, each a WebP mosaic of its 208 depth slices; v8.2 stored them
downsampled 1.5× as JPEG), with the volume dimensions, spacing, apex position, period and `views`
(plane parameters φ/τ for the long axes, a depth `c` for the C-plane short axes, labels in plane millimetres);
`ui_4k_echo.js` decodes the mosaics into `Uint8Array` volumes (`ehrLoad`), reslices any plane with trilinear
sampling and phase blending (`ehrPlane`), paints it with labels and chrome (`ehrPaint`), runs a loop with play/scrub
(`ehrLoop`; v8.3: planes are sampled at 300 × 360 (C-planes 260²), `ehrEnhance` applies an unsharp mask, a noise
floor, gain and gamma through a cached LUT, toggled by `EHR.sharpen` / `[data-ehr-sharp]`, and `ehrPlane` returns
the pyramid mask as `out.mask`), adds a real slot to the atlas cards (`ehrAtlasSlot`, `EHR_MAP` from model view ids to
real view ids) and the real lab (`echoRealLabFig`, state `EHRL`, scoring `ehrScore`). v8.3, the heart in 3-D:
`PFT_ECHO.fields(model, t, opts)` writes the same geometry as `classify()` as implicit fields (negative inside), one
part per structure (`lv` wall with papillary muscles, `rv` free wall, `la`, `ra`, `ao` with the descending aorta,
`pa`, `cavae` with the hepatic vein and SVC, `eff` when there is an effusion, the static `liver`), each with its
bounding box, plus the three valve rings (`mv`, `tv`, `av`: centre, axis, radius, opening); thin walls are thickened
to `opts.minWall` (0.42 cm) so a mesh can hold them, and nothing is inside the chest wall. `ui_4o_heart3d.js`:
`h3March` (marching cubes with shared edge vertices → an indexed `BufferGeometry` in scene coordinates, x right, y up,
z toward the viewer = body x, z, −y), `h3Build` (a phase cache per heart, `H3.K` = 12 phases built in the background
coarse-first, `H3.cell` 0.24 cm), `h3Create` (renderer with stencil, lights, the chest sheet and orientation labels,
the probe with its marker, the beam outline, the picture plane as a `CanvasTexture` rebuilt when its size changes),
`h3SetModel`, `h3SetProbe(inst, params, animate, aim)` (the plane from `PFT_ECHO.probe`; the canvas rectangle maps
linearly onto the plane: pixel (i, j) ↔ P + ((j − 6)/scale)·d + ((i − W/2)/scale)·l), `h3SetPlaneSpec` (a plane given
directly: P, d, l, rect, fan or a square), `h3SetImage(inst, gray, W, H, mask)`, `h3Aim` (camera on the +n side with
up = −d when "Screen up", else the anterior side head-up), `h3Place` (the cut: a clipping plane that removes the half
on the camera's side with hysteresis; stencil caps `h3StencilGroup`/`h3Cap` paint the cut faces of the solid parts;
ghost mode when the cut is off), `h3Frame` (phase = nearest built, tweens for the plane and the aim, own picture at ~9
fps when `ownImage`), `heart3dPanel(opts)` (the figure; `.inst` on the element). Hooks: the atlas (`EHS.atlas3d`,
`ehAtlasShow`, `ehAtlasWatch` with an IntersectionObserver band in the middle of the viewport, `[data-h3-atlas]`
`[data-h3-current]` `[data-eh-3d]`), the lab (`EHS.inst3d`; `ehRenderLive` hands over `res.img` + the sector mask
and the phase as `inst.extT`; `ehRefresh` sets the probe), the real lab (`EHRL.inst3d`; `ehrSync3d` maps φ → the
model's marker angle through the shared views (0→0, 100→60, 135→120, 180→180) and τ by the A5C pair; `ehrLoop`'s
`onFrame`). Selectors `[data-h3] [data-h3-title] [data-h3-status] [data-h3-opt=screen|cut|image|beating|labels|spin]
[data-eh-3d] [data-ehr-3d]`. The own-image slot (`ehOwnSlot`) now takes stills and clips (GIF, MP4, WebM ≤ 14 MB)
with a credit, stored through the logbook's IndexedDB helpers under `atlas:<view>` (legacy localStorage still read),
and links to The POCUS Atlas (`[data-eh-file] [data-eh-credit] [data-eh-creditline] [data-eh-clear] [data-eh-atlaslink]`).

v8.4, the conduction bench: `src/conduction.js` (`PFT_COND`, node-testable; `tests/cond.test.js`) holds the general
model — `REGIONS` (seven ventricular walls with a centre, a Purkinje direction, delivery time, duration, weight and the
path that delivers them: `TREE`), `ATRIA`, directed spread `EDGES` (`muscle` crossings and the left `network` between
the fascicle territories, with `SPREAD` factors for duration, magnitude and how much of the wavefront follows the
spread direction), `INJ` (the ST vector of each wall), `FOCI`, `AP_SITES`; `defaults()` (every dial), `preset(id)`
(29 presets as settings), `activate(cfg, origin)` (Purkinje delivery through the open elements with `ELEMENT_DELAY`
60 ms per fully delayed element, blocked at ≥ 0.95; then relaxation over the edges, each region keeping its earliest
route; the accessory pathway's `pre` region; the result in the shape ecg.js uses — `S.vent/atria` with t0, dur, dir,
mag, via, from, late, isch, injury, mass — plus qrs, axis, pr, pre), `dipole(S, t, cfg, parts)` (activation, the ST
plateau from injury/ischaemia, the T with lateness, ischaemia and strain), `strip(cfg, secs)` (the beats: sinus / AF /
flutter / arrest, the AV modes, PVCs with a compensatory pause, pacing and VT taking over, escapes with overdrive
suppression; each beat carries its own `seq`), `voltageAt(lead, st, T, parts)`, `stateAt(st, T)`, `measureLead` (Q
by first deflection or a deep early negativity with a small R, R, S, terminal 40 ms, ST at J+60, T peak),
`interpret(st)` (the reading lines and the per-lead measurements) and `elementStates(cfg)`. `ui_4q_conduct.js`:
`CDS` state, `cdPanel(sel)` (the dials of the selected element; `[data-cd-panel=id] [data-cd-row=…]
[data-cd-samode] [data-cd-avmode] [data-cd-focusmode] [data-cd-ap]`), `cdHeart` (the ECG lab's `heartFig` made
clickable: `[data-cd-pick=element]`, with `.blocked .delayed .picked .infarct .injured .isch` states), `cdParts(st,
lead)` (the stacked contributions, `[data-cd-part=id] [data-cd-sum=lead]`), `cdReading`, `cdReads`, `cdRefresh`
(rAF-throttled recompute; `cdApply` swaps the paper, dial, reads, parts and reading in place), `conductionLab()`
(`[data-condlab] [data-cd-presetsel] [data-cd-el] [data-cd-lead] [data-cd-reset] [data-cd-note] [data-cd-line=…]`).
`ecgPaper(seq, bts, vfn)` and `ecgFrame` (`view.stateAt`, `view.vecAt`, `view.keepAv`) took optional callbacks so the
ECG lab's paper, dial and animation serve both labs. The ECG Learn area merges `PFT_ECG` and `PFT_COND` topics.

v8.4, drips on the circuit: `ecmo.js` `DRIPS` (ten agents: dose range, step, receptors and `fx` as `[Emax, ED50,
Hill]` per effect — `svr`, `dil`, `contr`, `hr`, `ven`, `pvr` — plus lactate, arrhythmia and NEE weights),
`vasoactive(drugs)` (the combined multipliers: constrictors multiply the SVR, dilators divide it; inotropy saturates
through tanh; chronotropy adds; NEE = norepinephrine-equivalent), `applyDrugs(p, s)` (the patient the circuit sees:
svr, contr ≤ 1.3, hr, cvp, pvr, and on VV the native output `coEff` = co × rate × contractility × afterload × an RV
factor against the PVR). `runVV`/`runVA` take the raw patient and apply the drips first; outputs gain `hr`, `map`
(VV too), `svr`, `pvr`, `cvp`, `coSet`, `fx`. `PATIENT` has `hr` 95 and `pvr` 1; VV presets start at `svr` 11; settings
carry `drugs: {}`; six presets with drips; `alarms` read the heart rate, the arrhythmia risk, the VV MAP and the NEE.
`ui_4i_ecmo.js`: `ecDripSlider`, `ecDoseFmt`, `ecDripReadout` (`[data-ec-drips] [data-ec-drip=id] [data-ec-dose=id]
[data-ec-dripread] [data-ec-dripsoff]`), patient sliders `hr`, `pvr` (VV) and `svr` in both modes, MAP and HR tiles,
MAP / heart rate / cardiac output / CVP cells on the VV patient panel.

v8.4, the home: `HOME_SECTIONS` (clinic, bronch, icu, probe, record; `[data-home-section=id]`), `homeProgress`
(`[data-home-progress] [data-home-prog=bank|log|nbe]` — the logbook counters through `ELOG.counters(elLoad())`),
tiles `interpret`, `bank`, `log`, `boards` (`[data-home-tile=…]`), single-tile sections get `.home-grid.one`. `src/ct_real.js` is generated (`ct_build.py`) from
the 3D Slicer CT-chest and CTA-cardio NRRDs: HU encoded piecewise into 8 bits (−1000…−200 → 0…60, −200…300 →
60…235, 300…1500 → 235…255), each slice a JPEG data URL with its level from the carina and hand-placed labels
`[name, x, y, r]` in picture pixels; `ui_4f_ct.js` decodes a slice into grey values once (`crPixels`), windows it
through a 256-entry LUT per draw (`crLut`, `crDecode`), draws leader-line labels in side margins or numbers on
narrow screens, and runs the quiz (`CR` state; selectors `[data-ctreal] [data-cr-series] [data-cr-win] [data-cr-z]
[data-cr-preset] [data-cr-item] [data-cr-hover] [data-crq-start]`). The logbook logic lives in `src/echo.js` as
`PFT_ECHO.LOG` (`derive`, `qualifies`, `counters`, `csv`, `candidateCsv`, `packetHtml`, `merge`, `search`, `blank`,
`CERT`), tested in node; `ui_4n_echolog.js` keeps records in localStorage `pcd.echolog.v1` and images in IndexedDB
`pcd-echolog` (store `images`, localStorage fallback `pcd.echolog.img.v1`), state `ELS`, selectors `[data-echolog]
[data-el-tab] [data-el-form] [data-el=…] [data-el-m=…] [data-el-der=…] [data-el-qual] [data-el-save] [data-el-table]
[data-el-row] [data-el-open] [data-el-edit] [data-el-delete] [data-el-restore] [data-el-count] [data-el-csv]
[data-el-nbe] [data-el-packet] [data-el-backup]`. Bedside monitoring (`src/monitor.js`, standalone, testable in
node): thirteen topics in four groups; the models — `artTrue` (a radial waveform from SBP/DBP/HR with a PPV
modulation), `artMeasured` (a second-order oscillator with natural frequency `fn` and damping `zeta`, semi-implicit
Euler at 1 ms, an optional fast flush to 300 mmHg), `artStats`, `ART_FAULTS`, `artVerdict`, `flushAnalysis`; `capno`
with `CAPNO_SHAPES` (twelve patterns); `cvp` with `CVP_SHAPES` and `ecgAt`; `icp`, `icpTrend` with `ICP_SHAPES`;
and the pulse-contour screen (`PC_SCENARIOS`, `pcModel` — a Starling curve, an SVV that depends on the tidal volume
and the rhythm, a device bias after a tone change — `pcTest` for PLR/bolus/tidal-volume challenge, `pcValidity`).
`ui_4m_monitor.js`: `monTrace` (a sweeping monitor trace from value functions), the five labs (`monArtFig`,
`monCapnoFig`, `monCvpFig`, `monIcpFig`, `monScreenFig`; state `MNS`; selectors `[data-monart] [data-ma-fault]
[data-ma-flush] [data-ma-reveal] [data-ma-verdict] [data-ma-quiz] [data-ma-ans] [data-moncapno] [data-mc-shape]
[data-mc-quiz] [data-mc-opt] [data-moncvp] [data-mv-shape] [data-mv-vent] [data-monicp] [data-mi-shape] [data-mi-map]
[data-monscreen] [data-ms-case] [data-ms-test] [data-ms-result] [data-ms-opt] [data-ms-verdict] [data-ms-tile]
[data-ms-cond]`). The nodule module (`src/nodules.js`, testable in node): `mayo`, `va`, `brock` are the published equations; `vdt` the
doubling time; `fleischner(q)` and `lungRads(q)` return the guideline's step for a nodule described by setting, type,
mean diameter, solid component, status (baseline / new / growing / stable), multiplicity and patient risk.

`catalog/` holds the handoff package: the phrase catalog (source of truth), its schema, the rules specification, the
human-readable reference and the test vectors. `PFT_Rules_and_Integration.txt` is the rule specification the engine
implements; the decisions that go beyond it are documented in comments where they are made (restriction severity by
TLC z-score is the Annals ATS 2025 convention and is named as such in the report; an FRC above its ULN is accepted as
an elevated resting volume alongside FRC/TLC).

v8.5, the echo revisions: `ehrSize` samples a square grid (160 × 160 mm sector, 150 mm C-plane) at the canvas's
device pixels (320–560), `ehrPlane` takes the nearest acquired frame when the volume is dense (≥ 12 phases) and
honours `view.zoom` through `ehrWindow` (a true re-sampling of a 2× window); `ehrPaint` runs `ehrTgc` (depth-gain
normalisation, 0.8–1.35), `ehrSmooth` (3 × 3 bilateral), `ehrEnhance` (unsharp passes; `EHR.gain`, `EHR.dr`), 25 %
persistence keyed by loop (`opts.key`, off when still), `ehrMap` (clinical S-curve / linear / sepia), then the chrome
(sector outline, cm ticks, readout, title) and a 22 px phase bar (`opts.frame`, `opts.fr`); `.ehr-canvas` has
`aspect-ratio: auto`. `ehrLoop` adds click-to-zoom (`st.zoom`, `wrap.ehr.frame()`) and a folded display row
(`[data-ehr-more] [data-ehr-moretoggle] [data-ehr-gain] [data-ehr-dr] [data-ehr-map] [data-ehr-smooth]
[data-ehr-tgc] [data-ehr-persist]`). The real lab: `ehrMoves` / `ehrMoveView` / `ehrMovesRender` paint the
"turn the probe" strip (`[data-ehr-moves] .ehr-move[data-ehr-move=phi-|phi+|tau-|tau+|c-|c+|mode]`, 112 px
reslices at the loop's frame), `ehrLabRefresh` hides the slider rows that do not apply (`[data-ehr-row]`), the
sliders carry `.ehr-ends`, and `.ehr-grid3` lays out loop | 3-D | controls at ≥ 1180 px (3-D under the controls at
820–1180). `echo_real.js` carries 18 phases.

v8.5, where the leads go: `src/leads.js` (`PFT_LEADS`, node-testable; `tests/leads.test.js`) — `ELECTRODES` (id,
colour, `where`, canonical `vec`, drawing `torso` position), `LEAD_USES`, the torso geometry (`GEO`, `surface`:
the chest unrolled, 90° at the silhouette's edge and on round the back; `fromHeart`; `vecAt` turns the canonical
direction by the angle moved as seen from the heart and scales by distance — 2.0 power for chest electrodes, 1.0
for limbs), a set-up (`setup`, `clone`, `swap`, `cables`, `pos`, `off`, `mirror`), `potentials` → `leadsFrom`
(I = LA − RA, Goldberger augmented from Einthoven's triangle, chest = electrode − Wilson terminal), `dipoleAt` (the
bench's strip as a vector), `tracesAt` / `voltageFn`, `noiseAt` for an electrode off, `MISHAPS` (18, each with
`apply` and `teach`), `measure` / `read` (flags from the traces: `hum_all`, `off_limb`, `off_chest`, `flat_ii`,
`flat_iii`, `p_avr`, `p_i_ii`, `p_inv`, `v_rev`, `v1v2`, `v3`, `v12_high`, `v456_low`, `v456_right`, `none`),
`compare` / `axisOf` (lead by lead against the standard set-up). `ui_4r_leads.js`: `LDS` state, the dipole cached
at 2 ms (`ldCache`) so the paper redraws during a drag, `ldTorso` (SVG, pointer drag in viewBox units, click to
select, Enter/Space), `ldElPanel` (`[data-ld-elpanel] [data-ld-uses] [data-ld-off] [data-ld-swap] [data-ld-home]`),
`ldPaper` (ecgPaper with the leads of the selected electrode `.ld-hi`), `ldReading` (`[data-ld-flag=id]`,
`[data-ld-axis]`, chips `[data-ld-chip=lead]` same/chg/inv/flat/noise); selectors `[data-leadslab]
[data-ld-state=mishap|custom] [data-ld-mishap] [data-ld-src] [data-ld-reset] [data-ld-el=id]`. Topic `leads` in the
ECG area; the home links it.

v8.5, real nodules: `src/nod_real.js` (`PFT_NODREAL`, generated by `nod_build.py` from the Slicer CT-chest volume)
— six cases (`kind` nodule | vessel, `name`, 96 px crops at 0.7617 mm/px, 17 slices at 2.5 mm, PNG lossless with the
CT area's HU LUT, `measure` {long, short, hu, solidHu, solidFrac} from the voxels, `hunt` {x, y, z, mm} in the chest
series' pixels); `ct_real.js` carries the extra slices through the nodules (z 51, 71, 97). `ui_4s_nodreal.js`: `NR`
state, `nrDraw` (LUT per window, calipers with labels, HU probe, the reference ring once checked), drag to measure
(long then short; `nrMean`), `nrRefresh` (plan from `NOD.fleischner` with the user's size/type/risk), `nrVerdict`
(the truth, the reference measurement within 1.5 mm, the density class `nrClass`, the multiple-nodule plan), and the
hunt `nhLab` on the chest series (`nhClick` within 14 px and ±2 slices; `[data-nodhunt] [data-nh-i] [data-nh-win]
[data-nh-status] [data-nh-hint] [data-nh-reset]`); selectors `[data-nodreal] [data-nr-case=i] [data-nr-k]
[data-nr-win] [data-nr-zoom] [data-nr-what] [data-nr-size] [data-nr-type] [data-nr-risk] [data-nr-plan]
[data-nr-checkbtn] [data-nr-clear] [data-nr-check] [data-nr-score] [data-nr-measure]`. Tests: `tests/nodreal.test.js`,
`tests/e2e8.js` (the three features end to end).

v8.6, heart–lung interaction (Kenny): `src/heartlung.js` (`PFT_HL`, node-testable; `tests/heartlung.test.js`) is the
model. The thorax: `lungP(v, p)`, `cwP(v, p)`, `rsP` (exponential lung, cubic chest wall, both scaled by `cl`/`ccw`
and the wall shifted by `shift`), `frc(p, peep)`, `compliances(p, v)`, `transmission(pplat, peep, cl, ccw)`;
`breath(p)` integrates one cycle of `RESP_DEFAULT`-shaped parameters (`mode` spont | passive | assist | hold, `ri`,
`re`, `vt`, `rr`, `tiFrac`, `peep`, `ps`, `pmusMax`, `pexp`) into traces `t v flow ppl palv paw pmus ptp` and the
measures `m` (FRC, Vee, trapped, autoPEEP, pplEE/EI/Min/Max, ptpEI, pplat, ppeak, drivingP, crsMeasured, `comp`,
`wob` {elastic, resistive, threshold, expiratory, total, perMin, perL}, `who`). The circulation: `CV_DEFAULT`
(`pms rvr pcrit pmax k p0 contr aft`), `venousReturn`, `cardiacFn`, `operate(c)` → {pra, co, ptm, collapsed},
`cvCurves`. The union: `couple(b, cv, hl)` runs the breath through the circulation (`HL_DEFAULT`: `zone` for the
abdominal/pleural share, `kPab`, `strain`, `kPms`, `kRvr`, `kPcrit`, `aftSens`, `ppc`) → series and the mean and
swing; `SCENARIOS` (20, `scenario(id)`, `runScenario(id)` → {s, b, c}). The framework (Kenny 2023, Kenny & Werner
Moller 2025): `GEOM_DEFAULT`, `geom(g)` → {q, pra, ppc, regime, qU, qC, qV, ptm}, `praVsPmsf`, `praCurve`; the
bedside: `fitContr(cv, praTarget)`, `pqPressure(q, pc)` / `pqFlow(p, pc)` (ΔP = r·Qⁿ above a closing pressure),
`strainStress(vt, baby, raiser)`. `topics` (14) and `groups` (6) feed the learn index (`LEARN_CATS` id `hl`).
`src/ui_4t_heartlung.js` draws them (`hk` prefix; `hkChart` kit, `hkSlider` with `[data-hk-sl=key]`, `hkSeg`,
`hkLoop` for the animations): `hkBagFig` `[data-hkbag]` (`[data-hk-bagmode]`, `[data-hk-eq]`, `[data-hk-bagread]`,
`[data-hk-play]`), `hkCampbellFig` `[data-hkcampbell]` (`[data-hk-campreset]`, `[data-hk-cammode]`,
`[data-hk-camview]`, `[data-hk-camread]`, `HK_CAM_PRESETS`), `hkPtransFig` `[data-hkptrans]` (`[data-hk-tpre]`,
`[data-hk-tbar]`, `[data-hk-tread]`), `hkGuytonFig` `[data-hkguyton]` (`[data-hk-guypreset]`, `[data-hk-ghost]`,
`[data-hk-guyread]`, `HK_GUY_PRESETS`), `hkUnionFig({key, start, groups})` `[data-hkunion=key]` (the oblique
three-axis drawing `[data-hk-union]`, `[data-hk-uniscen]`, `[data-hk-uniplay]`, `[data-hk-unispeed]`,
`[data-hk-uninote]`, `[data-hk-uniread]`, the knobs; `fig.hk.frame(f)`), `hkPvrFig` `[data-hkpvr]`, `hkCvp3Fig`
`[data-hkcvp3]` (`[data-hk-cvp3]`), `hkPvrIllusionFig` `[data-hkpq]` (`[data-hk-pq]`, `[data-hk-pqread]`),
`hkTwoStressFig` `[data-hktwostress]` (`[data-hk-tspat]`, `[data-hk-tsstress]`, `[data-hk-tsread]`), `hkStrainFig`
`[data-hkstrain]` (`[data-hk-strainread]`), `hkGeomFig` `[data-hkgeom]` (`[data-hk-geompat]`, `[data-hk-prone]`,
`[data-hk-geomread]`, `[data-hk-geom2]`); `hkWidget(kind)` maps the topics' widget ids. Presets mutate the state
object in place so the sliders bound to it keep working. The earlier compact lab moved to `src/heartlung_lab.js`
(`PFT_HLL`; the physiology area's `heartlung` topic, `ui_4g_physio.js`). Build placeholders `/*HEARTLUNGLAB*/` and
`/*HEARTLUNG*/`. Styles: the `.hk-*` block at the end of `style.css`. Tests: `tests/heartlung.test.js` (111),
`tests/e2e9.js` (every diagram, the index, the home tile, phone width). The lecture list at heart-lung.org could not
be fetched from the build environment, so topics link the lectures page as a whole.

v8.7, the unifying pass (layout, hover definitions, ECMO gas rounds, the echo review, the 3-D renderer).
*Hover definitions.* `src/terms.js` (`PFT_TERMS = { terms, ICU }`, build placeholder `/*TERMS*/`): 122 entries
`{ n, f, w, t (topic id), m: [spellings], c?: [LEARN_CATS ids] }`; a spelling with a capital matches exactly, a
lower-case one any case; without `c` a term applies in the `ICU` areas. `ui_2_info.js` merges them into the glossary
as `t.<key>` and adds `term(key, text)` (a `span.gt[data-gloss]`), `tip(el, text, title)` (`data-tip`,
`data-tip-title`), `tipI(text, title)` (an (i) button), `annotateTerms(root, catId)` (first mention of each term in
`p, li, td, dd`, never inside figures, headings or controls) and `compactCaptions(root)` (`figure > figcaption` of 150
characters or more → `.cap-clamp`, one line, the whole of it in its tip). The one pop-up (`#pop`; class `tip` for free
text, `pinned` after a click or Enter) serves `[data-gloss]` and `[data-tip]`; a native `title` inside `#main` is
adopted as a tip on first hover; labels, buttons and controls with tips preview on hover and focus without swallowing
the click. `ui_4_learn.js`: `eduLead(id, text)` clamps a lead paragraph of 240 characters or more before the first
widget to two lines (`.edu-lead.clamp`, `.open`, `[data-lead-more]`).
*Home.* `ui_8_home.js`: `HOME_ORDER` (twelve tiles, `[data-home-grid] > [data-home-tile][data-home-setting]`, links
`[data-home-link]`), `[data-home-record]` (bank, log, boards), `[data-home-cta]`, `[data-home-prog]`,
`[data-home-lab]`; `[data-home-section]` is gone.
*The lab pattern* (style.css, “v8.7: the unifying pass”): `.ec-bar` (toolbar), `.ec-main` (two equal columns from
980 px), `.ec-deck.deck` with `.ec-col` sections; inside `.deck`, `.odc-sl` puts the name and the value on one line
with the track beneath. Used by the ECMO lab, the haemodynamics lab (`.hm-controls.deck`), the echo lab and the
real-volume lab (`.ehr-bar`, `.ehr-main`, `.ehr-deck`). Tokens `--s1…--s5`, `--r`, `--r-sm`, `--shadow`.
*ECMO.* `ecmo.js`: the membrane's capacity factor is `0.8 + 0.2·FdO2` (post-membrane PO2 ≈ FdO2 × 485). Gas rounds:
`R_ORDERS` ([key, label, unit, why] for rpm, sweep, fdo2, hb, vo2, fio2, va, cvp), `R_ACTIONS` (reposition,
membrane, kink: `modes, tip, why, nothing, applies(p, s), apply(p, s)`), `ROUNDS` (ten: `{ id, mode, level, title,
who, p, s, par, pace?, targets: [[label, test(o, p, s, hist), now()]], expert: [[say, fn(p, s), why]], teach }`),
`round(id)`, `roundStart(id)`, `roundDraw(p, s)` → `{ p, s, out }`, `roundCheck(c, hist)`, `roundOrders(a, b)`,
`roundHazards(c, prev, cur)`, `roundRows(mode)`, `roundExpert(id)`. `ui_4i_ecmo.js`: `ECS.rounds = { id, hist, fb,
results, revealed }`; one scenario list `[data-ec-scenario]` (also `[data-ec-preset] [data-ec-guide]
[data-ec-round]`; optgroups gas rounds / next best step / presets), `[data-ec-mode]`, `[data-ec-reset]`, the free-play
hint `[data-ec-guide-panel="free"][data-ec-gscore][data-ec-rscore]`; the deck `[data-ec-deck]` (`.orders` in
rounds, sliders `[data-ec=key]` in `[data-ec-row=key]`, `[data-ec-action=id]`); gases by site
`[data-ec-gas=pre|post|pt|fem] [data-ec-cell]`; the round `[data-ec-round-panel=id]`, `[data-ec-targets="n/m"]`,
`[data-ec-target]`, `[data-ec-fb=n]` (every step when revealed), `[data-ec-hazard]`, `[data-ec-broken]`,
`[data-ec-solved=n|revealed]`, `[data-ec-pending=n]`, `[data-ec-order=key]`, `[data-ec-send]`, `[data-ec-undo]`,
`[data-ec-rrestart] [data-ec-rreveal] [data-ec-rnext]`, the flowsheet `[data-ec-sheet-table=columns]
td[data-ec-sheet=row]`. In rounds the dials write orders only; nothing is recomputed until the gases are sent.
*Echo.* `echo.js`: `avOpen(t)` (mitral and tricuspid opening through the cycle; the leaflets had been inverted),
`m.archBranches`, `m.paBranches`, the closure under the chest wall in `classify` and `fields`, `render()` with the
polish pass (`opts.polish === false` skips it), `fields()` also returns `decor` (tubes `{ id, name, kind, r, taper?,
path }`: coronaries, arch vessels, branch PAs, pulmonary veins, appendages), `valves3d(m, t)` (leaflet grids `mv`,
`tv`, `av0–2`). `ui_4k_echo.js`: the picture is `EH_W × EH_H` = 320 × 260; the atlas is a picker
(`figure[data-echoatlas]`, `[data-eh-pick=id][data-eh-3d=id]`, one `article.eh-card[data-eh-view]`, `[data-eh-text]`,
`details.eh-more[data-eh-more]` holding the real loop and the own-image slot, `[data-eh-prev] [data-eh-open]
[data-eh-next]`; state `EHS.atlasView`, `EHS.atlasMore`); the lab is `.eh-toolbar`, `.eh-main` (screen | 3-D),
`.eh-deck`. `ui_4o_heart3d.js` (same API): quality `lite` when the WebGL renderer is software (SwiftShader,
llvmpipe), else `full` (`window.__h3Quality = 'full'` forces it); a time-budgeted build, rendering on demand, sRGB and
ACES; `inst.valves`, `inst.decor`, `inst.chest`; options `cut image screen chest beating labels spin`
(`[data-h3-opt]`); `inst.matchEl` makes the panel take a neighbour's height; with the cut off the whole heart is
opaque and the picture shows through it.
Tests: `tests/v87.test.js` (129: every gas round unsolved on arrival and solved by its expert without hazards, pace,
actions, the FdO2 model, the terms, the echo additions), `tests/e2e10.js` (81: the home grid, hover definitions,
clamps, the ECMO layout and the gas rounds end to end, the atlas picker painting all eleven views, the echo lab, the
3-D parts, phone width, dark theme); `e2e7.js` and `e2e8.js` follow the new DOM.
