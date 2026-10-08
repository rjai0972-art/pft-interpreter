# PFT Interpreter — web source

The app is one self-contained HTML page. `src/` holds the engine (four parts plus the generated phrase catalog), the
interface, the glossary, the Learn text and the worked examples; `build.js` assembles `dist/PFT_Interpreter_standalone.html`
and `build_desktop.js` copies it to `../app/index.html`, which GitHub Pages serves and the desktop app loads.

```
node build_catalog.js   # catalog/pft_phrases.json -> src/engine_1a_catalog.js (run after changing the catalog)
node build.js           # dist/engine.js, dist/ui.js, dist/PFT_Interpreter_standalone.html
node build_desktop.js   # ../app/index.html
node tests/engine.test.js && node tests/catalog.test.js      # engine rules, handoff fixtures
node tests/e2e.js; node tests/e2e2.js; node tests/e2e3.js; node tests/e2e4.js; node tests/e2e_fuzz.js   # browser (Playwright)
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
4. **Sections** report facts at the chosen level (concise / standard / detailed / with numbers). The metrics of a
   section are composed into one sentence by state (`metricGroup` in `engine_3_sections.js`): same-state metrics are
   grouped with their z-scores, abnormal groups lead (the defining measurement first), the normal group closes the
   sentence, invalid metrics keep their own sentence; the detailed level appends the catalog's caveats and the numeric
   level prints the measured values inline. Qualifiers (quality, limitations, basis, hemoglobin) keep catalog wording.
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

`catalog/` holds the handoff package: the phrase catalog (source of truth), its schema, the rules specification, the
human-readable reference and the test vectors. `PFT_Rules_and_Integration.txt` is the rule specification the engine
implements; the decisions that go beyond it are documented in comments where they are made (restriction severity by
TLC z-score is the Annals ATS 2025 convention and is named as such in the report; an FRC above its ULN is accepted as
an elevated resting volume alongside FRC/TLC).
