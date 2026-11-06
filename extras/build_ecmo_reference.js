/* Build the ECMO bedside reference (PDF) from the Learn area's content: node extras/build_ecmo_reference.js
   Renders selected blocks of src/ecmo.js to HTML, adds the circuit drawing (a screenshot from the app) and prints to PDF with Playwright. */
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
require('../web/src/physio.js'); const E = require('../web/src/ecmo.js');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const T = E.topics;
const block = (topicId, match) => { const b = T[topicId].blocks.filter(b => (b.h && match.test(b.h)) || (b.table && b.table.head && match.test(b.table.head[0])))[0]; if (!b) throw new Error('no block ' + topicId + ' ' + match); return b; };
const table = (b, cls) => '<table class="' + (cls || '') + '"><thead><tr>' + b.table.head.map(x => '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' + b.table.rows.map(r => '<tr>' + r.map((c, i) => (i ? '<td>' : '<th scope="row">') + esc(c) + (i ? '</td>' : '</th>')).join('') + '</tr>').join('') + '</tbody></table>';
const list = (b, tag) => '<' + tag + '>' + (b.ul || b.ol).map(x => '<li>' + esc(x) + '</li>').join('') + '</' + tag + '>';
const sec = (title, inner) => '<section><h2>' + esc(title) + '</h2>' + inner + '</section>';
const circuitPng = path.join(__dirname, 'ecmo_circuit.png');
const img = fs.existsSync(circuitPng) ? '<img class="circuit" src="data:image/png;base64,' + fs.readFileSync(circuitPng).toString('base64') + '" alt="The ECMO circuit on a patient">' : '';
const html = `<!doctype html><html><head><meta charset="utf-8"><title>ECMO bedside reference</title>
<style>
@page { size: A4; margin: 11mm 11mm 12mm; }
body { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 8.6px; line-height: 1.32; color: #182028; margin: 0; }
h1 { font-size: 17px; margin: 0 0 2px; letter-spacing: 0.01em; } .sub { color: #5a6b78; font-size: 8.5px; margin: 0 0 6px; }
h2 { font-size: 10px; margin: 7px 0 3px; color: #0f4c5c; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #c9d6de; padding-bottom: 1px; }
section { break-inside: avoid; }
table { border-collapse: collapse; width: 100%; margin: 2px 0 4px; } th, td { border: 1px solid #d5dee5; padding: 2px 4px; vertical-align: top; text-align: left; }
thead th { background: #0f4c5c; color: #fff; font-weight: 600; } tbody th { background: #f1f5f8; font-weight: 600; width: 19%; }
ul, ol { margin: 2px 0 4px 14px; padding: 0; } li { margin: 0 0 1.5px; }
.cols { column-count: 2; column-gap: 10px; } .cols section { break-inside: avoid-column; }
.circuit { width: 100%; max-width: 300px; display: block; border: 1px solid #d5dee5; border-radius: 6px; }
.two { display: grid; grid-template-columns: 300px 1fr; gap: 10px; align-items: start; }
.foot { font-size: 7.5px; color: #5a6b78; margin-top: 6px; border-top: 1px solid #c9d6de; padding-top: 3px; }
.pb { break-before: page; }
</style></head><body>
<h1>ECMO bedside reference</h1>
<p class="sub">VV and VA · circuit numbers · physiology · selection · anticoagulation · emergencies · liberation. After the ELSO guidelines (VV 2021, VA 2021, anticoagulation 2021/22, ECPR 2021, neurology 2024, hypothermia 2025) and the trials; companion to the PFT Interpreter’s ECMO Learn area (v7.11). Educational use — the ECMO team and the local protocol run the circuit.</p>
<div class="two">${img}<div>
${sec('The pressures', table(block('ecmo_circuit', /^Pressure$/), ''))}
${sec('Is the membrane working?', list(block('ecmo_circuit', /oxygenator check/), 'ul'))}
</div></div>
<div class="cols">
${sec('The two dials', list(block('ecmo_circuit', /two dials/), 'ul'))}
${sec('What sets the saturation on VV', '<ul>' + block('ecmo_vv', /equations/).ul.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>')}
${sec('Hypoxaemia on VV — the order', list(block('ecmo_vv', /algorithm/), 'ol'))}
${sec('Lungs at rest (ELSO 2021)', table(block('ecmo_vv', /^Setting$/), ''))}
${sec('VV targets', table(block('ecmo_vv', /^Variable$/), ''))}
${sec('VA haemodynamics', list(block('ecmo_va', /Haemodynamics/), 'ul'))}
${sec('LV distension', table(block('ecmo_va', /LV distension/), ''))}
${sec('Differential hypoxaemia (Harlequin)', table(block('ecmo_va', /Differential hypoxaemia/), ''))}
${sec('VA targets', table(block('ecmo_va', /^Variable$/), ''))}
</div>
<div class="pb"></div>
<div class="cols">
${sec('VV selection', table(block('ecmo_select', /^Criterion$/), ''))}
${sec('VA selection, ECPR, hypothermia', table(block('ecmo_select', /^Setting$/), ''))}
${sec('Anticoagulation', table(block('ecmo_daily', /Anticoagulation/), ''))}
${sec('Daily labs', table(block('ecmo_daily', /^Test$/), ''))}
${sec('The emergencies', table(block('ecmo_complications', /^Event$/), ''))}
${sec('Bleeding', list(block('ecmo_complications', /Bleeding/), 'ul'))}
${sec('VV: the sweep-off trial', table(block('ecmo_wean', /sweep-off/), ''))}
${sec('VA: the flow-down trial', table(block('ecmo_wean', /flow-down/), ''))}
${sec('The two mistakes', list(block('ecmo_wean', /two mistakes/), 'ul'))}
${sec('The rounds checklist', list(block('ecmo_daily', /rounds checklist/), 'ol'))}
</div>
<p class="foot">Sources: Tonna JE et al, ELSO adult VV guideline, ASAIO J 2021 · Lorusso R et al, ELSO interim VA guideline, ASAIO J 2021 · McMichael ABV et al, ELSO anticoagulation guidelines, ASAIO J 2022 · Richardson AS et al, ELSO ECPR consensus, ASAIO J 2021 · ELSO neurological monitoring consensus, ASAIO J 2024 · ELSO hypothermia narrative guideline 2025 · Combes (EOLIA 2018), Peek (CESAR 2009), Thiele (ECLS-SHOCK 2023), Schmidt (PRONECMO 2023), McNamee (REST 2021), Yannopoulos (ARREST 2020), Suverein (INCEPTION 2023), van Minnen (RATE 2026), Aissaoui (ICM 2011) · Farkas, IBCC: ECMO (2023).</p>
</body></html>`;
const out = path.join(__dirname, 'ECMO_Bedside_Reference_v2.pdf');
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log('wrote', out, fs.statSync(out).size, 'bytes');
})();
