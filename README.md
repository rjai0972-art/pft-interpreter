# PFT Interpreter: desktop app for Windows and Mac

The same interpreter you have been using in the browser (ERS/ATS 2022, z-score / LLN, Learn pages, 6MWD trend, case bank),
in its own window. It runs fully offline and never contacts the internet. Your case bank stays on the computer it was saved on.

Added by the desktop version: **File > Print** and **File > Save as PDF** print the report alone on white paper
(Learn pages print without the navigation), and **Help > Where is my data kept?** shows the storage folder.

## Step 1. Get the installers (pick one way)

**A. Let GitHub build both, with nothing to install on your computer (recommended)**

1. Make a free GitHub account and a new **private** repository.
2. Upload everything in this folder to it. The easiest way is to drag the folder's contents onto the repository page
   ("uploading an existing file"). The folder named `.github` is hidden in Finder and File Explorer. If the **Actions** tab shows no
   "Build desktop apps" workflow afterwards, use **Add file > Create new file**, type `.github/workflows/build-desktop.yml` as the name,
   paste in the contents of `build-on-github.yml` from this folder, and commit.
3. Open the **Actions** tab, choose **Build desktop apps**, then **Run workflow**.
4. After about 5 to 10 minutes both jobs turn green. Open the run and download **PFT-Interpreter-Mac** and **PFT-Interpreter-Windows**
   from the **Artifacts** section at the bottom.

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
- The app is not notarized by Apple (that needs a paid Apple developer account), so the first launch is blocked. Fix it once:
  right-click the app, choose **Open**, then **Open** again. On newer macOS, if there is no Open button, go to
  **System Settings > Privacy & Security**, scroll down, and click **Open Anyway** next to PFT Interpreter.
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
