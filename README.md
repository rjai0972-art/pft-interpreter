# PFT Interpreter: desktop app for Windows and Mac

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
   Open it and download the files you need, for example `PFT-Interpreter-3.0.0-mac-arm64.dmg` and `PFT-Interpreter-Setup-3.0.0-win-x64.exe`.
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
- `PFT-Interpreter-Setup-...exe` installs for your own user account only, so it does not need administrator rights. It adds Start menu and desktop shortcuts.
- `PFT-Interpreter-Portable-...exe` is a single file you can run from anywhere, including a USB drive. Nothing is installed.

The first time, Windows SmartScreen may say "Windows protected your PC" because the app is not code-signed. Choose **More info**, then **Run anyway**.

**Mac.** Open the `.dmg` and drag **PFT Interpreter** into **Applications**.
- Choose `...-mac-arm64.dmg` for Macs with Apple silicon (M1 or later) and `...-mac-x64.dmg` for Intel Macs. Apple menu > About This Mac shows which you have.
- The app is not notarized by Apple (that needs a paid Apple developer account), so the first launch is blocked. Fix it once.
  On macOS 15 (Sequoia) and later: double-click the app, click **Done** on the warning, then open **System Settings > Privacy & Security**,
  scroll down and click **Open Anyway** next to PFT Interpreter, and confirm. On macOS 14 and earlier: right-click the app, choose **Open**, then **Open** again.
- If macOS says the app "is damaged", run this once in Terminal and open it again:
  `xattr -cr "/Applications/PFT Interpreter.app"`

Hospital or other managed computers may block unsigned installers. In that case the portable Windows file may still run,
and the single-file browser version (`PFT_Interpreter_standalone.html`) always works.

## Your data

- The case bank, reviews, heads-up ratings and window size are stored on this computer in the app's data folder
  (Mac: `~/Library/Application Support/PFT Interpreter`, Windows: `%APPDATA%\PFT Interpreter`).
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

## How the reading is built (version 7.7)

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

Learn has four areas, chosen from a dropdown above the topic list. "PFT interpretation" is the reading-room curriculum
(the logic, each test, reference equations, change over time, the phrase catalog and worked examples). "Anatomy &
bronchoscopy" adds: lungs, lobes and segments with a lobe map and the Boyden numbering; a bronchial-tree navigator: an
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
that browser, since published atlas photographs are copyrighted and none are built in); ventilation and perfusion (a one-alveolus sandbox along the V/Q line on air or 100% oxygen, West's zones, the
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
Source code and tests: `web/`; the catalog and its rule specification: `web/catalog/`.
