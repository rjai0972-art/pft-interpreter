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

## How the reading is built (version 5.0)

The rules layer computes every measurement state before any wording is chosen (ERS/ATS 2022 z-scores and the LLN;
a reviewed adult phrase catalog anchored to the ERS/ATS 2022, ATS/ERS 2019, ERS/ATS 2023, ERS/ATS 2017, ERS 2019 and
ERS 2017 standards sits underneath for the optional wording, the detailed level and the Learn section). Unknown never
counts as normal; a component that failed quality criteria drives no pattern or severity statement; a low FVC is
"restriction unconfirmed" until TLC is known; a preserved KCO never cancels a low DLCO; the hemoglobin basis is
stated, not assumed.

The report follows the reading room's standard language and format (the attendings' PFT reading template), every
heading with a colon: FLOW-VOLUME CURVE, SPIROMETRY ("Moderate obstructive impairment present (FEV1/FVC below the LLN;
FEV1 z −3.1)." / "Mildly reduced FVC suggests possible restrictive impairment." and, inside the same section, the
bronchodilator response: "After bronchodilator: FEV1 1.55 → 1.95 L (60% predicted), a change of +400 mL (+12.4% of
predicted). Spirometry significantly improved after bronchodilator administration (FEV1)."), LUNG VOLUMES ("Reduced
Total Lung Capacity (TLC) is consistent with moderate restrictive impairment." / "Lung volumes indicate air
trapping."), RESPIRATORY FORCES, DIFFUSING CAPACITY ("Moderately reduced; the value is not corrected for hemoglobin
(Hgb 10.0 g/dL, low). Corrected for the anemia the DLCO is 58% predicted." / "Moderately reduced; the value is
corrected for hemoglobin."), PAST TESTING COMPARISON ("Since last testing (3/1/2024): FEV1 has changed by −16% & −300
mL. This change is likely to be significant given testing margin of error of ~15%."), 6MWT ("Exertional hypoxemia
evidenced by a 10-point decline in oxygen saturation." / "Reduced walking distance given the predicted normal
range…") and INTERPRETATION ("There is a moderate obstructive ventilatory defect with hyperinflation. Pattern is
consistent with moderate COPD. In the presence of an obstructive ventilatory defect the decreased diffusing capacity
suggests pulmonary emphysema." / "The diffusion capacity is moderately impaired which can be seen in restrictive lung
disease before FVC falls, pulmonary arterial disease (i.e. PE, PH), anemia, smoking before testing. Clinical
correlation recommended." — anemia is listed, and offered as a differential, only when the value is not corrected for
hemoglobin). The grades come from z-scores rather than the template's percent cut-offs, the bronchodilator criterion
is the ERS/ATS 2022 one (the 2005 result is quoted when the two disagree), and the "significant change" margin on past
testing is a setting: ERS/ATS (FEV1 and FVC 15%, DLCO 10%) or the reading-room template (10% and 20%). Tapped
suggestions become "Suggest …" sentences at the end of the interpretation; the attestation line and "There are no
prior studies available for comparison." are offered as taps. Lung volumes or a DLCO that were not ticked print as
"not performed", as in the template.

What is copied is the sections and the INTERPRETATION. The header (date, demographics, BMI, reference set) and the
INTERPRETABILITY section are added only when "With header" is chosen in the settings.

The interface: the entry form on the left and the report, as it will read, building on the right in real time. Each
index is one row — category buttons, then the z-score, value and % predicted boxes beside them; a typed z-score sets
the category, and a typed value sets it where a threshold exists (6MWD against the LLN, SpO2 nadir, heart-rate
recovery, hemoglobin, FeNO). Only the essentials are shown (FEV1/FVC, FEV1, FVC; TLC, RV, RV/TLC; DLCO, its hemoglobin
correction, VA, KCO) and the rest sits under "+ More". Every value box can be typed in the unit on the report (tap the
unit: cm/in, kg/lb, m/ft, mL/min/mmHg or mmol/min/kPa); the choice applies to that quantity everywhere and is
remembered. "Compare with a prior study" sits at the top of the step and adds a column of prior boxes beside this
study's values (several priors add several columns); "Bronchodilator given" adds post-bronchodilator boxes beside the
pre values and the change is calculated from them. When a pattern makes one more value useful, the step asks for it
(a restrictive pattern with a normal DLCO asks for the ERV; a reduced DLCO asks for its hemoglobin basis, the
hemoglobin and VA/KCO; obstruction asks for post-bronchodilator values); nothing is assumed from an unanswered prompt.
Quick sets on the first screen can be edited and new ones saved from the current selection; none of the built-in sets
picks the flow–volume loop. Two themes (paper and slate) are selectable in the header.
Source code and tests: `web/`; the catalog and its rule specification: `web/catalog/`.
