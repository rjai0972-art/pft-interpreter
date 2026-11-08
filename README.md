# PulmCrit Daddy: desktop app for Windows and Mac

The same interpreter you have been using in the browser (ERS/ATS 2022, z-score / LLN, Learn pages, 6MWD trend, case bank),
in its own window. It runs fully offline and never contacts the internet. Your case bank stays on the computer it was saved on.

Added by the desktop version: **File > Print** and **File > Save as PDF** print the report alone on white paper
(Learn pages print without the navigation), and **Help > Where is my data kept?** shows the storage folder.

## Use it in a browser instead (no install)

Once this repository is **public** and GitHub Pages is switched on, the app is a normal web page, the same app as the desktop one:
**https://rjai0972-art.github.io/pft-interpreter/**

One-time setup, three clicks in the repository on github.com:
1. **Settings** (top row of tabs) > scroll to the bottom, **Danger Zone** > **Change visibility** > **Make public**.
2. **Settings > Pages** > under **Build and deployment**, set **Source** to **GitHub Actions**.
3. **Actions** tab > **Publish web app** > **Run workflow**. About a minute later the address above works. After that every update to `app/index.html` republishes it by itself.

The page runs entirely in the visitor's browser. It stores nothing on GitHub and sends nothing anywhere; cases saved in the case bank stay in that browser on that device (use Case bank > Export and Import to move them). Anyone with the address can open it and read the code.

## Step 1. Get the installers (pick one way)

**A. Let GitHub build both, with nothing to install on your computer (recommended)**

1. Make a free GitHub account and a new **private** repository.
2. Upload everything in this folder to it. The easiest way is to drag the folder's contents onto the repository page
   ("uploading an existing file"). The folder named `.github` is hidden in Finder and File Explorer. If the **Actions** tab shows no
   "Build desktop apps" workflow afterwards, use **Add file > Create new file**, type `.github/workflows/build-desktop.yml` as the name,
   paste in the contents of `build-on-github.yml` from this folder, and commit.
3. Open the **Actions** tab, choose **Build desktop apps**, then **Run workflow**.
4. After about 10 minutes the run turns green and the repository's front page shows a new entry under **Releases** (right-hand side).
   Open it and download the files you need, for example `PulmCrit-Daddy-3.0.0-mac-arm64.dmg` and `PulmCrit-Daddy-Setup-3.0.0-win-x64.exe`.
   The release notes also hold the build machines' self-test of each app (it launches the built app, checks it loads, stores data and
   blocks network access, and prints a PDF).

**B. Build on your own computer** (needs Node.js, a free one-time install from https://nodejs.org, choose "LTS")

- Mac: double-click `build-mac.command`. If macOS refuses, open Terminal in this folder and run
  `chmod +x build-mac.command`, or run the three commands at the end of this list.
- Windows: double-click `build-windows.bat`.
- Either one, from a terminal in this folder: `npm install`, then `npm test`, then `npm run dist:mac` (on a Mac) or `npm run dist:win` (on Windows).

The Mac app has to be built on a Mac (or on GitHub), and the Windows app on Windows (or on GitHub). The finished files land in the `dist` folder.

**C. Just try it** with `npm install` then `npm start`.

## Step 2. Install

**Windows.** Two files come out. Use whichever suits the computer.
- `PulmCrit-Daddy-Setup-...exe` installs for your own user account only, so it does not need administrator rights. It adds Start menu and desktop shortcuts.
- `PulmCrit-Daddy-Portable-...exe` is a single file you can run from anywhere, including a USB drive. Nothing is installed.

The first time, Windows SmartScreen may say "Windows protected your PC" because the app is not code-signed. Choose **More info**, then **Run anyway**.

**Mac.** Open the `.dmg` and drag **PulmCrit Daddy** into **Applications**.
- Choose `...-mac-arm64.dmg` for Macs with Apple silicon (M1 or later) and `...-mac-x64.dmg` for Intel Macs. Apple menu > About This Mac shows which you have.
- The app is not notarized by Apple (that needs a paid Apple developer account), so the first launch is blocked. Fix it once.
  On macOS 15 (Sequoia) and later: double-click the app, click **Done** on the warning, then open **System Settings > Privacy & Security**,
  scroll down and click **Open Anyway** next to PulmCrit Daddy, and confirm. On macOS 14 and earlier: right-click the app, choose **Open**, then **Open** again.
- If macOS says the app "is damaged", run this once in Terminal and open it again:
  `xattr -cr "/Applications/PulmCrit Daddy.app"`

Hospital or other managed computers may block unsigned installers. In that case the portable Windows file may still run,
and the single-file browser version (`PulmCritDaddy_standalone.html`) always works.

## Your data

- The case bank, reviews, heads-up ratings and window size are stored on this computer in the app's data folder
  (Mac: `~/Library/Application Support/PulmCrit Daddy`, Windows: `%APPDATA%\PulmCrit Daddy`).
- Uninstalling does not delete it. Installing a newer version over the old one keeps it.
- It is separate from the browser version: cases saved in the browser are not visible here. In the browser use Case bank > Export, then here use Case bank > Import.
- Back up with Case bank > Export now and then. Do not type patient identifiers into free-text fields.

## For whoever maintains this

- `app/index.html` is the whole application (one self-contained page). To update it, replace that file with the newest standalone
  build and delete its two Google Fonts `<link>` lines. The desktop copy uses the system fonts and makes no network requests.
- `main.js` is the shell: one window, a fixed `pft://app` address so stored data never moves, a Content-Security-Policy that blocks all network access,
  a locked-down renderer (sandbox, context isolation, no Node), links opening in the normal browser, and the menu and print commands.
- `npm test` checks the shell's logic without needing a screen.
- Code signing is optional and not set up. For Windows add a signing certificate to the build; for Mac add an Apple Developer ID and notarization.
  Until then the first-launch steps above are needed.

## How the reading is built (version 8.5)

The rules layer computes every measurement state before any wording is chosen (ERS/ATS 2022 z-scores and the LLN;
a reviewed adult phrase catalog anchored to the ERS/ATS 2022, ATS/ERS 2019, ERS/ATS 2023, ERS/ATS 2017, ERS 2019 and
ERS 2017 standards sits underneath for the optional wording, the detailed level and the Learn section). Unknown never
counts as normal; a component that failed quality criteria drives no pattern or severity statement; a low FVC is
"restriction unconfirmed" until TLC is known; a preserved KCO never cancels a low DLCO; the hemoglobin basis is
stated, not assumed.

The report follows the reading room's standard language and format (the attendings' PFT reading template), every
heading with a colon, and says each thing once. Three wording levels, chosen in the settings and remembered:

- **Minimal** (the default) — findings only, one or two sentences a section, no numbers line (the lab report has the
  numbers), the bronchodilator verdict and the change since the prior study inside the section of the index they belong
  to, and an interpretation of a sentence or two: "SPIROMETRY: FEV1/FVC below the LLN with moderate reduction in FEV1
  and FVC. Significant bronchodilator response in FEV1 (+38% of predicted; ERS/ATS 2022). Since the prior study (Jul
  2026), significant increase in FEV1 (+30%) and FVC (+33%)." / "LUNG VOLUMES: Hyperinflation (TLC above the ULN)
  with air trapping (RV/TLC above the ULN)." / "DIFFUSING CAPACITY: Moderately reduced (not corrected for
  hemoglobin)." / "INTERPRETATION: Moderate obstructive defect with hyperinflation and air trapping and a significant
  bronchodilator response. Diffusing capacity moderately impaired, which can be seen in emphysema, pulmonary vascular
  disease, anemia, or smoking before the study." The causes listed after a reduced DLCO follow the pattern (emphysema
  first with obstruction, interstitial disease first with restriction, the template's list when spirometry and volumes
  are normal); anemia appears only when the value is not corrected for hemoglobin.
- **Standard** — the numbers line, then the findings; the bronchodilator numbers in one sentence ("After
  bronchodilator: FEV1 1.55 to 1.95 L (+400 mL, +12.4% of predicted); FVC 3.10 to 3.30 L (+200 mL, +5.5% of
  predicted)."); PAST TESTING COMPARISON as its own section with one sentence per prior study; the fuller
  interpretation ("There is a moderate obstructive ventilatory defect with hyperinflation and a moderately reduced
  diffusing capacity, consistent with emphysema. …").
- **Detailed** — adds the header (date, demographics, BMI, reference set), the INTERPRETABILITY section and the
  catalog's caveats.

Grades come from z-scores rather than the template's percent cut-offs; the bronchodilator criterion is the ERS/ATS 2022
one (the 2005 result is quoted when the two disagree); the "significant change" margin on past testing is a setting
(ERS/ATS or the reading-room template). Tapped suggestions become "Suggest …" sentences; the attestation line, "no
prior studies" and the clinical-response caveat after a negative bronchodilator test are offered as taps. Changes are
written "1.85 to 1.55 L", never with arrows.

The interface is one page, kept compact so that a whole test fits on a tablet screen. At the top: one row with the
study date, age, sex, smoking, height and weight (BMI), then the tests. Spirometry, lung volumes and DLCO are on the
page from the start; the other tests live in an "Additional studies" list, where each has a tick to put it on the
page and a second tick to make it a default (remembered on the device). Then two slim lines for the indications and
the settings. Each test is a collapsible section beneath, in test order, with the test-quality grading as a link on
the title line, the (i) at the side, and the "Bronchodilator", "Prior study" and "Values" toggles on the group
header. By default an index is one line: its label and its category chips — one chip size, in aligned columns (WNL,
Near LLN, Mild or Low, Moderate, Severe, High) so the rows of a section line up; no value boxes. The boxes appear as one
comparison table when a toggle asks for them — a row per index, a column group per study: this study (z-score, value,
% predicted), post-bronchodilator (value and change), and one column per prior study with the study's date in the
column header ("+ older" adds another); a typed z-score sets the category, and a typed value sets it where a threshold
exists. Every box can be typed in the unit on the report (tap the unit); the choice is remembered. When a pattern
makes one more value useful, the section asks for it, and a prompt for a number opens the table at that box. The
report builds on the right as values are entered (below the form on narrower screens), with the copy buttons, the
optional wording, differentials, prompts and the heads-up list beneath it. Two themes, linen and charcoal, in neutral
tones.

The app opens on a home page: a tile for each area (Interpret, the case bank, and every Learn area) with its topics and the labs as chips, a resume link to the page last visited, and the version. Learn has ten areas, chosen from a dropdown above the topic list. "PFT interpretation" is the reading-room curriculum
(the logic, each test, reference equations, change over time, the phrase catalog and worked examples). "Anatomy,
physiology & bronchoscopy" runs like a course and opens with a start page that maps it. Anatomy first: the lungs
(lobes, fissures, the hilum and RALS, the pleura and where a needle is safe, the diaphragm and its openings, the two
circulations, lymphatics and nerves, development in a paragraph); then the airway wall level by level — an
interactive ladder from the trachea to the alveoli that draws each generation's tube (cartilage rings, plates, muscle,
alveoli) and its epithelium (ciliated columnar, goblet, basal, club, cuboidal, squamous, type I and II, macrophage) with
the cells and their jobs on tap, labels that hide and a find-the-level quiz, and a cell table with the pearls
(Kartagener, the Reid index, club cells and P-450, surfactant, the barrier); then lungs, lobes and segments with a lobe
map and the Boyden numbering; a bronchial-tree navigator: an
anterior-view map with the great vessels and the nodal stations as layers that switch on and off and the scope tip as
a yellow dot moving along the airway, and beside it the scope simulator (three.js, inlined, MIT) — the endoscopic
picture (vignetted, the mucosa mottled with vessels), a steering pad and keys to aim, advance and withdraw along
airways of real length (trachea 11 cm, right main 2.4 cm, left main 4.6 cm, bronchus intermedius 2.8 cm, upper lobe
bronchus 1.2 cm, middle lobe 2 cm …), the openings labelled on the picture, the scope entering whichever opening it is
aimed at and bumping into a carina when driven straight, a see-through overlay of the vessels, the oesophagus and the
nodal stations against the wall being crossed, translucent and labelled, fading with distance, in the clock positions
of an EBUS atlas, and a readout of the depth, the distance to the next carina and the distance from the vocal cords;
beneath them the atlas ring of what lies against the airway at that level (arteries, veins, the oesophagus and the
nodal stations in their usual clock positions, two levels for the trachea, following the scope's depth), the
landmarks, the pitfalls and the EBUS stations on that wall, and a drill that hides the labels and asks for a segment
from the carina. Tapping a nodal station anywhere — in the simulator's overlay, on the ring, on the tree map, on the
CT — opens its EBUS card: the schematic EBUS picture laid out as on the Olympus/IASLC teaching poster (the transducer
at the top, the node under the wall, the vessels where they appear on the screen; 11s and 11i each with their own
picture), grey scale by default with a colour-Doppler switch that shows why a vessel and a node must be told apart
before the needle, a small ring with the probe on the wall (the yellow dot, as on an endoscopic inset) seen from the
airway it is sampled from, the probe position, three or four pearls per station (boundaries, Doppler, the sampling
order, pitfalls), a button that takes the simulator there and one that opens the station on the IASLC map. Below the
navigator a second model: orbit the whole tree, or the mediastinum — the great vessels, the oesophagus, the spine, the
heart and the nodal stations around the tree, with a ring marking where the scope is — and download the tree as a
binary STL (a hollow wall 1.5 mm each side of the lumen, in millimetres) for printing a model to drive a real scope
through; a procedural model from standard dimensions, not a patient's CT, plus links to CT-derived models and a
virtual-bronchoscopy simulator on their own sites. CT anatomy of the chest: axial sections through the same procedural
thorax, drawn in Hounsfield units and shown through the lung, mediastinal or bone window — chest wall, ribs sloping
through the slice, sternum, clavicles and scapulae, the vertebra with its canal and the discs, the lungs with their
vessels and the oblique fissures (the lobes labelled on each side of them), the great vessels filled with contrast,
the heart with its chambers, the airways as true cylinder sections, the oesophagus, the thyroid at the inlet, the
liver, spleen and stomach under the domes — scrolled with a slider, presets (inlet, arch, aortopulmonary window,
carina, pulmonary arteries, left atrium, ventricles, domes, bases), the wheel or the keys while the blue plane moves on
the 3D mediastinum beside it; labels in the margins with leader lines the way an atlas prints them (numbered markers
on a phone), switchable layers for the nodal stations and the segmental bronchi, hover or tap to name a structure and
light it on the model, labels that hide, and a find-the-structure quiz; the IASLC nodal-station map (borders,
N category, which of EBUS, EUS and mediastinoscopy reaches each station, where to put the transducer, the schematic
EBUS picture and a tap-the-station quiz; a photo of your own can be pinned to any airway view or station and stays in
that browser, since published atlas photographs are copyrighted and none are built in). Physiology next, in the order
the gas travels and following West, Levitzky, the Physeo workbook and First Aid's respiratory chapter as the outline:
mechanics (the pressures of a breath drawn as four traces, compliance, surface tension and surfactant, the work of
breathing), airflow and resistance (laminar and turbulent flow, where the resistance lives, the equal pressure point
and the flow–volume loop, time constants and auto-PEEP), ventilation and dead space (an interactive spirogram of the
volumes and capacities, the equations, an alveolar-gas and A–a gradient calculator that reads the result), diffusion
(perfusion- and diffusion-limited gases, the DLCO and KCO), ventilation and perfusion (the existing sandbox and West's
zones), oxygen and carbon dioxide in the blood (a dissociation-curve lab with sliders for pH, temperature, CO2,
2,3-DPG, carbon monoxide, haemoglobin and the arterial and venous points, with P50, saturations, contents and delivery
read out; CO2 transport; the systematic approach to hypoxaemia; altitude and exercise), control of breathing (the
generators, the sensors, the responses and the patterns), and the heart–lung lab: the Campbell diagram (lung and
chest wall curves, FRC, the loop of a breath, elastic and resistive work as shaded areas, the muscle pressure or the
plateau and the respiratory-system curve on a ventilator) joined to the Guyton diagram (venous return from the mean
systemic pressure to the collapse plateau, the cardiac function curve starting at the pleural pressure, the operating
point and the transmural pressure) — animated breath by breath with a strip of cardiac output and pleural pressure,
sliders for lung and chest wall compliance, chest wall load, airway resistance, tidal volume, rate, PEEP or CPAP, mean
systemic pressure, contractility and pulmonary vascular tone, a spontaneous or ventilator breath, and presets (COPD
exacerbation with auto-PEEP, asthma, cardiogenic oedema, ARDS on PEEP, obesity and ascites, hypovolaemia,
pulmonary hypertension, a ventilated normal lung), after Kenny's open-access An Approach to Mechanical Heart-Lung
Interaction; then (a one-alveolus sandbox along the V/Q line on air or 100% oxygen, West's zones, the
causes of hypoxaemia); and the bronchoscopy essentials distilled from the BTS 2013 guideline, the ACCP 2011 sedation
statement, the 2017 antithrombotic review, the ATS 2012 BAL guideline and the local BAL protocol (indications and
risk, the pre-procedure checklist, sedation and topical anaesthesia with a lidocaine running total, antiplatelets and
anticoagulants, BAL technique and cell counts, biopsy numbers and bleeding management, infection and ICU bronchoscopy,
EBUS-TBNA). "Cardiac conduction & ECG" is a lab: a heart drawn with its conduction system whose regions light up as
the wavefront passes, the twelve leads written by the same wavefront (a dipole model of seven ventricular regions
projected onto the lead directions), a frontal-plane dial with the QRS loop and the moving vector, and a scrubber with
play; pick a scenario — normal, right or left bundle branch block, either fascicular block, pre-excitation, first-,
second- (Wenckebach, Mobitz II) and third-degree AV block — and drag the degree of block from a conduction delay to a
complete block to watch the complexes widen, the axis swing and the T waves turn, with the mechanism and the ECG
criteria beside it. A teaching model for the shapes and the reasons, not a reader of real tracings. "Lung nodules &
cancer screening" is three guideline pages: lung nodules (description and measurement, growth and doubling time, the
probability models — Mayo, VA, Herder, Brock, PKUPH, TREAT, BIMC — with working Mayo, VA and Brock calculators, the
Fleischner 2017 tables for incidental solid and subsolid nodules with the CHEST 2013 and BTS 2015 differences, the
Lung-RADS v2022 table, an advisor that returns the guideline's step for a given nodule in either setting, the three
roads for a solid nodule over 8 mm, biopsy choice, referral and communication); lung cancer screening (NLST, NELSON,
the USPSTF 2021, CMS, ACS 2023, NCCN and CHEST 2021 criteria side by side, running a programme and the VHA
demonstration project); and other abnormalities on chest CT (interstitial lung abnormalities per Fleischner 2020,
emphysema, airway and pleural findings, cysts, nodes, coronary calcification and the ACR incidental-findings guidance).
Source code and tests: `web/`; the catalog and its rule specification: `web/catalog/`. "Mechanical ventilation" is the fifth area: how a ventilator breathes (the equation of
motion; trigger, target and cycle; volume against pressure; a first setting after intubation; protective ventilation
in one list) with a trigger/target/cycle matrix of nine modes; the settings one by one — a searchable glossary of
two dozen settings and measurements with their aliases, typical values and what moves when each is turned up or
down, from tidal volume and PEEP to cycle-off, rise time, auto-PEEP, driving pressure, IPAP/EPAP and high-flow;
non-invasive support (who, how, when it is failing: CPAP, bilevel, high-flow, the ROX and HACOR scores, the ERS/ATS
guideline); waveforms and asynchrony — a viewer that draws pressure, flow and volume against time from the equation
of motion for fourteen patterns (volume and pressure control, pressure support, high resistance, low compliance,
auto-PEEP, the stress index, flow starvation, double and ineffective triggering, delayed and premature cycling, leak,
secretions) with what you see and what to do; and a simulator of eight patients in respiratory failure (COPD
exacerbation, ARDS, near-fatal asthma, DKA with aspiration, cardiogenic oedema, opioid overdose, brain injury, obesity
hypoventilation): read the presentation and the gases, triage the level of support (oxygen, high-flow, NIV, the tube)
and get the verdict with its reasoning, set the mask or the ventilator (mode, volume, rate, flow or Ti, PEEP, FiO2,
inspiratory pressure or support, sedation) and read the arterial and venous gases an hour later and a day later
(alveolar ventilation and dead space set the PaCO2, the bicarbonate and the kidney the pH, shunt and V/Q and PEEP the
PaO2, time constants the auto-PEEP, the pressure in the chest the cardiac output), with an acid–base reading in words,
the mechanics and the circulation, the case's own targets grading the plan with advice, and a chart of the gases you
record as the plan changes. Everything updates live as a setting is changed, on a ventilator screen beside the
settings: the pressure, flow and volume of the current breaths sweep across it from the equation of motion (a square
flow with its peak-to-plateau gap in volume control, a square pressure with a decelerating flow in pressure modes, the
expiratory flow that never reaches zero when gas is trapped), with the numbers a ventilator shows (peak, plateau, set
and auto-PEEP, mean pressure, expired volume and minute volume, total and spontaneous rate, I:E, FiO2, SpO2, EtCO2,
static compliance) and its alarms (high pressure, plateau over 30, auto-PEEP, low minute volume, apnoea, desaturation,
hypotension); on oxygen or high-flow the screen is a bedside monitor with the patient's own effort instead of an airway
pressure. Below it a pair of lungs breathes with the traces — the diaphragm descends, the bases fill, the colour follows
the saturation — and wears the disease: hatching as the compliance falls, airless patches for the shunt (fewer as PEEP
recruits), thick spastic bronchi for the resistance, a hyperinflated chest in emphysema, a tube, a mask or a cannula at
the top; a pressure–volume panel shows where the breath sits on the respiratory system's sigmoid curve (the breath from
PEEP to the plateau, red past the upper inflection); and a patient panel with sliders for the lungs themselves —
compliance, resistance, shunt, recruitability, alveolar dead space, bicarbonate, drive, a stiff chest wall — so the
disease can be changed under the same settings and the screen, the lungs and the gases followed (stiffen the lung and
the plateau climbs; narrow the airway and the time constant lengthens; add shunt and the PaO2 falls whatever the FiO2). "ECMO" is the sixth area: what extracorporeal support is and is not (the history, the vocabulary, VV against VA,
the trials — CESAR, EOLIA, PRONECMO, REST, ECLS-SHOCK, ARREST/INCEPTION, LEVOECMO, RATE — and the ELSO, ESICM and ATS
guidance); the circuit part by part, drawn on a patient with the blood coloured by its saturation and the flow moving
through the tubing, with the pressures (drainage, pre- and post-membrane, ΔP) and the oxygenator check; the cannulation
configurations (femoro-jugular, dual-lumen, femoro-femoral, peripheral VA with the distal perfusion catheter, axillary and
central return, V-AV, V-PA) with sizes, flows and tip positions; VV physiology (the flow-to-output ratio, recirculation
and its signs, the hypoxaemia algorithm, sweep and CO2, lung rest, targets); VA physiology (afterload, pulse pressure, LV
distension and venting, the mixing zone and Harlequin syndrome, the first hour, targets); selection (EOLIA/ELSO criteria,
contraindications, RESP and SAVE, cardiogenic shock, ECPR and accidental hypothermia); daily management (anticoagulation
targets and monitoring, product thresholds, the labs and what they mean, the rest of the patient, the rounds checklist);
complications and the rehearsed emergencies (air, pump failure, decannulation, suck-down, oxygenator failure, tamponade,
limb ischaemia, ICH); liberation (the VV sweep-off trial and the VA flow-down trial with the Aissaoui echo criteria, and
the two mistakes); a circuit lab — a model of an adult on VV or VA ECMO in which the pump speed earns a flow against what
the drainage gives, the membrane sets the post-oxygenator gas, the ratio of circuit flow to cardiac output and the
recirculation set the arterial saturation, the sweep sets the PaCO2, and on VA the retrograde flow meets the native
ejection in the aorta so the right radial and the femoral gases differ and the ventricle pays for the afterload (sliders
for the circuit and the patient, a console with the pressures and alarms, gas panels at the drainage, after the membrane
and in the patient, twelve presets); and fourteen bedside troubleshooting scenarios (chatter, recirculation, high-output
hypoxaemia, a failing membrane, air in the line, Harlequin, LV distension, the cold leg, VA and VV weaning, bleeding, a
stopped pump, haemolysis, referral) with four options each, a verdict with the physiology, the sequence the team would
follow, and a button that loads the problem and then the fix into the lab. Inside the lab, ten guided scenarios go the
other way round: a patient's presentation, the gases the lab computes from that state, and the question of the next best
step (recirculation, chatter, a hyperdynamic patient, a failing membrane, a CO2 problem, Harlequin, LV distension, the
cold leg, VA and VV weaning), several steps deep; the move chosen actually turns the dials — the circuit, the console
and the gas panels answer, a before/after table marks what moved, and a wrong turn can be undone and the best move
applied instead. "Haemodynamics & the right heart" is the seventh area: pressure, flow and resistance (Guyton's venous
return, Ohm's law for the two circulations), the pulmonary artery catheter (ports, the route, each chamber's waveform and
what the wedge really measures, the waves and their diseases, thermodilution and Fick, the evidence), preload,
afterload, contractility and rate (the pressure–volume loop, Ees/Ea coupling), the derived numbers with their thresholds
(CI, SVR, PVR, TPG, DPG, PAPi, CPO, RAP:PAOP, SvO2, DO2/VO2), the pulmonary circulation and the ESC/ERS 2022 PH
classes, shock by the numbers (the signatures of each type, Forrester, SCAI), the right ventricle (RV–PA coupling,
TAPSE, TAPSE/PASP, RV:LV, RV infarct, massive PE, the vasoactive drugs table), echo as the haemodynamic monitor; a
Swan–Ganz lab — a model of the whole circulation (venous return, two ventricles with end-diastolic and end-systolic
relations, the pericardium, the valves, the two vascular beds, the devices) drawn as a heart with the catheter threaded
from the jugular through the right heart into a branch of the pulmonary artery, with pressure tags on every chamber, a
bedside monitor that plays the selected port's waveform with the ECG and the respiratory swing, sliders for the heart,
the circulation, the valves, the blood and the ventilator, treatment buttons that apply what each drug or device does,
fifteen presets, and a panel that computes everything the sheet would and names the signature; and eleven bedside shock
scenarios (name the shock, see the catheter numbers, choose the first move, and watch the model recompute the numbers
after your move and after the best one). "ICU infusions: pressors, sedation, paralysis" is the eighth area: the
receptors and the rules of titration (units, the arithmetic, the norepinephrine-equivalent dose, access and
extravasation, the order of questions at the bedside); then a reference card for every drip — vasopressors
(norepinephrine, epinephrine, vasopressin, phenylephrine, dopamine, angiotensin II, methylene blue), inotropes
(dobutamine, milrinone, isoproterenol, levosimendan), vasodilators and antiarrhythmics (nitroglycerin, nitroprusside,
nicardipine, clevidipine, esmolol, labetalol, amiodarone), sedatives (propofol, dexmedetomidine, midazolam, ketamine,
lorazepam), analgesics (fentanyl, hydromorphone, morphine, remifentanil), neuromuscular blockers (cisatracurium,
rocuronium, vecuronium, succinylcholine) and the other drips (insulin, heparin, bicarbonate, tranexamic acid) — each
with its receptors, start / titration / usual / maximum dose and ceiling, bolus, onset and half-life, concentrations,
indications, monitoring, contraindications, limitations and the landmark trials (SOAP II, VASST, VANISH, ATHOS-3,
SEPSISPAM, the 65 trial, CENSER, CLOVERS/CLASSIC, ANDROMEDA-SHOCK-2, OptimaCC, DOREMI, LeoPARDS, SPICE III, MENDS2,
MIDEX/PRODEX, SEDCOM, DahLIA, A2B, ABC, NONSEDA, ACURASYS, ROSE, NICE-SUGAR, BICAR-ICU, CRASH-2, HALT-IT, STRESS-L …)
and the guidelines (SSC 2026, PADIS 2018, SCCM NMB 2016); a drip calculator (dose ↔ rate with the arithmetic shown, a
drawn infusion pump, the titration ladder, a norepinephrine-equivalent dose panel); and eleven bedside scenarios. "Echo
& POCUS" is the ninth: the machine and the probe, the windows and the eleven standard views (PLAX, PSAX at the aortic,
mitral and papillary levels, A4C/A5C/A2C/A3C, subcostal four-chamber and IVC, suprasternal) each with how to obtain it,
what is in it, what to measure and the pitfalls, the anatomy on the screen, the assessments (LV, RV, pericardium, IVC,
valves) with their numbers, echo in shock (RUSH), lung ultrasound (BLUE); a scanning lab — a three-dimensional model of
the heart, great vessels, pericardium, liver and caval veins in a curved chest, scanned by a probe you slide, rotate,
tilt and rock from four windows, painted as a B-mode sector with speckle and the beating cycle, with labels for every
structure, eight hearts (normal, dilated LV, dilated RV, effusion, tamponade, hypovolaemia, LVH, pleural effusion), a
target view with a score and movement hints; a views atlas rendered from the same model with a slot on each card for
your own de-identified image (kept in the browser only); and a quiz that draws new pictures every round (which view,
which structure, what is wrong). Version 8.2 adds the real thing beside the drawn: under each apical and
short-axis atlas card runs a loop cut from a real three-dimensional transthoracic acquisition (the SlicerHeart
"Mitral" sample volume, nine phases of the cycle, resliced in the browser along any plane), with labels; the scanning
lab gains a real-volume mode (rotate the marker through the four-, two- and three-chamber planes, tilt into the
five-chamber, or cut across the beam at any depth for the short axes, with the same scoring and hints); and the CT
anatomy topic gains a stack of real anonymised slices — the 3D Slicer CT-chest (non-contrast, 59 axial slices from
the lung bases to the thoracic inlet) and CTA-cardio (contrast, 28 slices) sample data sets plus coronal and sagittal
reformats — windowed in the browser from the real pixels (lung, mediastinal, bone), scrollable, with hand-placed
labels on key levels, hover-to-name and a find-the-structure quiz. Version 8.3 makes the real loops sharp — the
volume is stored at the acquisition's full resolution (224 × 176 × 208 voxels, WebP mosaics) and the plane goes
through the scanner's display processing (an unsharp mask, a noise floor, a little gain; a "Processed" switch shows
the raw interpolation) — and adds the heart in three dimensions: the model's chambers, walls, valves, great vessels,
caval veins, liver and any effusion meshed by marching cubes for twelve phases of the cycle, beating, with the probe
on the chest, the beam's outline, the echo picture painted onto the scan plane and the half of the heart between you
and the plane cut away (solid cut faces), so the cross-section you are looking at is the one on the screen; drag to
turn, wheel to zoom, "Screen up" to hold the picture the way the screen does or head-up for the patient's frame. In
the views atlas the panel stays at the top and its plane follows the card you scroll to (or "Show in 3-D" on any
card); in the scanning lab it follows the sliders and the live picture; in the real-volume lab the real picture is
painted on the plane you have cut through the model heart. Each atlas card now links to The POCUS Atlas
(thepocusatlas.com, CC BY-NC 4.0) and its "Add your own image or clip" slot takes a GIF, MP4 or WebM as well as a
still, with a credit line — so a clip saved from the Atlas (or your own de-identified loop) sits under the view it
shows, kept on the device only. Version 8.4 reframes the front door as a fellow's guide through PCCM
fellowship — the areas grouped by where the fellow stands (clinic, bronchoscopy suite, ICU, the probe, the record),
a "where you are" strip with the resume link, the case bank, the echo logbook's counters against the 150 TTE / 50
TEE targets and the next NBE CCEeXAM date, and a boards-and-certificates tile — and adds two labs. The conduction
bench (Cardiac conduction & ECG → "The conduction system, element by element") makes every element of the system a
dial — sinus node and rhythm (sinus, AF, flutter, arrest), the atria and Bachmann's bundle, the AV node and its four
behaviours, the His bundle, the right bundle, the left bundle and its two fascicles (open, delayed, blocked), the
Purkinje speed, an accessory pathway with three insertion sites, an ectopic focus (PVCs, pacing, VT) at four sites,
the escape pacemakers, the QT and the potassium — and every wall of the ventricles a mass (infarct to hypertrophy),
an ischaemia and an injury; the activation is computed from what still conducts (a wall whose path is blocked is
reached muscle to muscle from its neighbours, late and slow, with the wavefront pointing from there), the twelve leads
are written from that sequence, a panel draws every region's contribution to any lead and their sum, and the
reading at the bottom — rhythm, PR, QRS width and bundle-branch morphology from V1 and V6, axis and the fascicular
blocks, ST shifts and Q waves by territory, voltage criteria, T waves, QT, hyperkalaemia — is made from the traces,
not the settings; twenty-nine presets start it. The ECMO circuit lab gains vasoactive drips with titration —
norepinephrine, vasopressin, epinephrine, phenylephrine, dopamine, dobutamine, milrinone, angiotensin II, inhaled
nitric oxide, nitroprusside — each acting through a dose–response on the systemic resistance, the contractility, the
heart rate, the venous tone and the pulmonary resistance before the circuit runs, with the norepinephrine-equivalent
dose, the heart rate, the MAP (now on VV too) and the right ventricle's load against the PVR on the console, and six
new presets (the pressor that shuts the valve, the inodilator that opens it, vasoplegia and vasopressin, dobutamine
on VV, RV failure and its rescue with iNO and milrinone). The echo area also gets a case logbook for the
boards: each study with a random case code (no identifiers), the date, the setting and the clinical question, your
role (performed, interpreted, supervised), a practice flag that excludes it from the counts, the views obtained and
the components not obtainable, twenty-one measurements with stroke volume, cardiac output and index, RVSP, E/A, E/e′,
the IVC indices and the passive-leg-raise change computed as you type, findings, limitations, diagnosis and clinical
integration, the reviewer and the feedback, a linked repeat study, and de-identified images (resized, stored in
IndexedDB); a dashboard (all scans, this month, TTE candidates / 150, TEE / 50); a searchable, filterable review log
with edit and soft delete; and exports — CSV, the NBE candidate lists, a JSON backup that restores by merging, and a
printable packet with signature fields. "Bedside monitoring" is the tenth area: what a number is worth; the arterial
line (set-up, zero and level, the fast-flush test, natural frequency and damping, the waveform, PPV/SPV and the
tidal-volume challenge, the vasoconstriction trap, troubleshooting) with a lab that passes a true pressure through
a modelled catheter–tubing–transducer system (seven states of the line, the fast flush, a build-your-own ζ and fn, a
diagnose-the-line quiz); CVP and its waves (a, c, v, x, y against the ECG; TR, cannon waves, tamponade, constriction,
Kussmaul) with a waveform lab and quiz; the pulmonary artery catheter's pitfalls; oesophageal, bladder and airway
pressures; ICP (EVD and microtransducers, the P1/P2/P3 waveform, Lundberg waves, the open drain) with a lab and a
30-minute trend; pulse-contour devices (FloTrac/Vigileo and the HemoSphere with HPI, PiCCO and transpulmonary
thermodilution, LiDCO, the finger cuff, bioreactance, oesophageal Doppler — set-up, every number on the screen,
when each lies, troubleshooting) with a haemodynamic-screen lab of seven scenarios (early sepsis, AF, spontaneous
breathing, low tidal volume, RV failure, a pressor change, the resuscitated patient) that lets you run a passive leg
raise, a bolus or a tidal-volume challenge before choosing; venous oximetry, lactate and the CO2 gap; pulse oximetry
(the physics, the dyshaemoglobins, skin pigmentation, the plethysmogram); NIRS; capnography (the phases, the shapes —
shark fin, curare cleft, rebreathing, cardiogenic oscillations, oesophageal intubation, loss of output, ROSC — CPR,
the gradient) with a lab of twelve patterns and a quiz; and processed EEG and train-of-four. Version 8.5 works
on three things. The real echo loop goes through five revisions in a row — full-resolution sampling at the screen's
size, depth-gain normalisation with a bilateral speckle smoothing that keeps the walls' edges, single acquired frames
with light persistence instead of blends, a clinical display (an S-curve grey map, gain and dynamic-range sliders,
the sector's outline, centimetre ticks, a phase bar with the cycle's trace and cursor, click-to-zoom that re-samples
the volume at twice the scale) and, in the scanning lab, a "turn the probe" strip of live reslices showing what the
picture becomes after each manoeuvre from where you are (marker toward the hip or the shoulder, tail down or up, the
plane shallower or deeper, across the beam) that you click to make the move, with the slider ends named in the hand's
words and the 3-D heart beside the loop on wide screens — and the canvas is finally isotropic (the earlier aspect
squashed the heart). The ECG area gets "Where the leads go": a torso with the ten electrodes (the ribs, the angle of
Louis, the mid-clavicular and axillary lines, a strip round the back for V7–V9), each draggable; click one for where
it goes and which leads it feeds (lit on the paper), let it fall off, or swap its cable with another; eighteen
ready-made mishaps — every limb-cable swap, electrodes off (the right leg, which hums on all twelve), V1/V2 swapped,
the chest cables reversed, V1–V2 too high, V4–V6 too low, Mason–Likar torso placement, right-sided and posterior
leads on purpose, dextrocardia as the look-alike; the twelve leads are built from the electrodes' potentials (I = LA −
RA, the Wilson terminal for the chest leads, so a limb electrode off spoils the chest leads too), the source heart is
any of the conduction bench's presets, a reading made from the traces names the clue (a positive P in aVR, a flat
lead II, a P taller in I than in II, a backward step in the R progression…) and a lead-by-lead comparison against
the correct placement shows what changed. The nodule area gets real nodules: six crops cut from the real chest CT at
full resolution (four true nodules of 4–10 mm and two vessels that pass for one on a single slice), each a 17-slice
stack to scroll, window and probe, with calipers for the long and short axis, the call (nodule or vessel), the
attenuation and the risk, the Fleischner plan from your numbers and a check against the voxel-measured reference;
then a hunt for the same four on the whole axial series. `extras/` holds a reworked Anki deck
(`ECMO_Anki_Deck_v2.apkg`, 103 notes / 237 cards, cloze and basic, tagged by topic, built by `build_ecmo_anki.py` with no
dependencies) and a bedside reference PDF generated from the same content (`build_ecmo_reference.js`).
