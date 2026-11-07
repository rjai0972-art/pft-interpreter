// ICU infusions: the drug table, the calculator arithmetic, the scenarios and the content, in node
const D = require('../src/drips.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, t) => Math.abs(a - b) <= t;
// ---- content
ok(Object.keys(D.topics).length === 10 && D.groups.length === 5 && D.groups.reduce((n, g) => n + g.ids.length, 0) === 10, 'ten topics in five groups');
ok(['drips_intro', 'drips_vaso', 'drips_ino', 'drips_vasodil', 'drips_sed', 'drips_analg', 'drips_nmb', 'drips_other', 'drips_calc', 'drips_cases'].every(id => D.topics[id] && D.topics[id].blocks.length > 0), 'every topic has blocks');
ok(['vaso', 'ino', 'vasodil', 'sed', 'analg', 'nmb', 'other'].every(c => Object.keys(D.topics).some(id => D.topics[id].blocks.some(b => b.widget === 'dripref' && b.cls === c))), 'each class has a reference widget on its page');
ok(D.topics.drips_calc.blocks.some(b => b.widget === 'dripcalc') && D.topics.drips_cases.blocks.some(b => b.widget === 'dripcases'), 'the calculator and the cases widgets sit in their topics');
const txt = JSON.stringify(D.topics) + JSON.stringify(D.DRUGS);
ok(/SOAP II/.test(txt) && /VASST/.test(txt) && /VANISH/.test(txt) && /ATHOS-3/.test(txt) && /SEPSISPAM/.test(txt) && /CLOVERS/.test(txt) && /ANDROMEDA-SHOCK-2/.test(txt) && /DOREMI/.test(txt) && /OptimaCC/.test(txt) && /SPICE III/.test(txt) && /MENDS2/.test(txt) && /A2B/.test(txt) && /ACURASYS/.test(txt) && /ROSE/.test(txt) && /NICE-SUGAR/.test(txt) && /BICAR-ICU/.test(txt) && /CRASH-2/.test(txt) && /PADIS/.test(txt) && /SSC 2026|Surviving Sepsis Campaign 2026/.test(txt), 'the landmark trials and the guidelines are in the text');
// ---- the drug table
ok(D.DRUGS.length === 35 && D.CLASSES.length === 7 && D.DRUGS.every(d => d.id && d.name && d.cls && d.unit && d.conc.length >= 1 && d.dose && typeof d.dose.start === 'number' && typeof d.dose.max === 'number' && d.dose.usual && d.dose.ceiling && d.ind.length && d.mon.length && d.contra.length && d.limits.length && d.trials.length), 'thirty-five drugs, each with dosing, indications, monitoring, contraindications, limitations and evidence');
ok(D.DRUGS.every(d => D.CLASSES.some(c => c[0] === d.cls)) && D.CLASSES.every(c => D.DRUGS.some(d => d.cls === c[0])), 'every drug in a class, every class populated');
ok(D.DRUGS.every(d => d.dose.start <= d.dose.max && d.trials.every(t => t.length === 3 && typeof t[1] === 'number' && t[2].length > 30)), 'start ≤ max; trials are [name, year, message]');
const n = D.drug('norepi'), v = D.drug('vaso'), p = D.drug('propofol'), c = D.drug('cis'), a = D.drug('angio');
ok(n.unit === 'mcg/kg/min' && n.dose.max === 1 && n.conc[0][1] === 16 && v.unit === 'U/min' && v.dose.max === 0.04 && !v.wb && p.dose.max === 80 && /4 mg\/kg\/h/.test(p.dose.ceiling) && c.dose.usual.indexOf('37.5') >= 0 && a.unit === 'ng/kg/min' && a.dose.max === 80, 'the key numbers: norepinephrine 16 mcg/mL and max 1; vasopressin fixed ≤ 0.04 U/min; propofol ≤ 4 mg/kg/h; cisatracurium 37.5 mg/h in ARDS; angiotensin II 20–80 ng/kg/min');
ok(D.drug('sux').dose.ceiling.indexOf('Never an infusion') >= 0 && D.drug('sux').contra.some(t => /72 h|immobilisation/.test(t)) && D.drug('dex').dose.max === 1.5 && D.drug('midaz').limits.some(t => /delirium/.test(t)), 'succinylcholine is a bolus-only drug with the ICU contraindications; dexmedetomidine to 1.5; benzodiazepines carry the delirium warning');
// ---- the arithmetic
ok(near(D.rateFor(0.1, 'mcg/kg/min', 80, 16), 30, 0.001) && near(D.doseFor(30, 'mcg/kg/min', 80, 16), 0.1, 1e-6), 'norepinephrine 0.1 mcg/kg/min, 80 kg, 16 mcg/mL = 30 mL/h and back');
ok(near(D.rateFor(0.03, 'U/min', 70, 0.2), 9, 0.001) && near(D.rateFor(5, 'mcg/min', 70, 4), 75, 0.001) && near(D.rateFor(0.7, 'mcg/kg/h', 80, 4), 14, 0.001) && near(D.rateFor(2, 'mcg/kg/min', 70, 2000), 4.2, 0.001) && near(D.rateFor(20, 'ng/kg/min', 70, 10000), 8.4, 0.001) && near(D.rateFor(10, 'mg/h', 70, 0.1), 100, 0.001) && near(D.rateFor(18, 'U/kg/h', 70, 100), 12.6, 0.001), 'vasopressin 9 mL/h; isoproterenol 5 mcg/min 75 mL/h; dexmedetomidine 14; cisatracurium 4.2; angiotensin II 8.4; nicardipine 100; heparin 12.6');
ok(D.unitInfo('mcg/kg/min').wb && D.unitInfo('mcg/kg/min').perMin && !D.unitInfo('mg/h').wb && !D.unitInfo('mg/h').perMin && D.unitInfo('U/min').base === 'U', 'unit parsing');
ok(near(D.nee({ norepi: 0.3, vaso: 0.04 }), 0.4, 1e-9) && near(D.nee({ epi: 0.1, phenyl: 1, dopa: 10, angio: 20 }), 0.1 + 0.1 + 0.1 + 2, 1e-9), 'norepinephrine-equivalent dose: vasopressin 0.04 ≈ 0.1, phenylephrine ÷ 10, dopamine ÷ 100, angiotensin II ÷ 10');
// ---- the scenarios
ok(D.SCENARIOS.length === 11 && D.SCENARIOS.every(s => s.who.length > 100 && s.q && s.options.length === 4 && s.options.filter(o => o[2] === 'best').length === 1 && s.options.every(o => ['best', 'reasonable', 'poor', 'wrong'].indexOf(o[2]) >= 0 && o[3].length > 40) && s.after), 'eleven scenarios, four options each, one best, every option reasoned, an outcome line');
ok(D.SCENARIOS.filter(s => s.id === 'ards')[0].options.filter(o => o[2] === 'best')[0][0] === 'cis' && D.SCENARIOS.filter(s => s.id === 'dissect')[0].options.filter(o => o[2] === 'best')[0][0] === 'esmolol' && D.SCENARIOS.filter(s => s.id === 'pris')[0].options.filter(o => o[2] === 'best')[0][0] === 'stop', 'the answers: paralysis for the fighting ARDS, rate control first in dissection, stop the propofol in PRIS');
console.log('drips ' + pass + ' passed, ' + fail + ' failed');
