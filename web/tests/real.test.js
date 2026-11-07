// The real images: the CT stack, the echo volume, and the logbook logic, in node
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const g = {}; const load = (f) => { const src = fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'); new Function('globalThis', src)(g); };
load('ct_real.js'); load('echo_real.js');
const CT = g.PFT_CTREAL, ER = g.PFT_ECHOREAL;
// ---- the CT stack
ok(CT && CT.series.length === 4 && CT.series.map(s => s.id).join() === 'chest,cta,cor,sag', 'four CT series: chest, cardiac CTA, coronal, sagittal');
const chest = CT.series[0], cta = CT.series[1];
ok(chest.slices.length >= 50 && cta.slices.length >= 25 && chest.plane === 'axial' && chest.w === 448 && chest.h > 300, 'the chest stack has 50+ axial slices at 448 px');
ok(chest.slices.every(s => /^data:image\/jpeg;base64,/.test(s.img) && typeof s.mm === 'number') && chest.slices.some(s => s.mm === 0 && /Carina/.test(s.level)), 'every slice is a JPEG data URL with its level from the carina; the carina slice is labelled');
const labelled = chest.slices.filter(s => s.labels);
ok(labelled.length >= 11 && labelled.every(s => s.labels.length >= 8 && s.labels.every(L => L.length === 4 && L[1] >= 0 && L[1] <= chest.w && L[2] >= 0 && L[2] <= chest.h && L[3] > 0)), 'eleven or more labelled chest levels, each with 8+ labels inside the picture');
const names = [].concat.apply([], labelled.map(s => s.labels.map(L => L[0])));
ok(['Trachea', 'Ascending aorta', 'Descending aorta', 'Main pulmonary artery', 'Superior vena cava', 'Left atrium', 'Right ventricle', 'Oesophagus', 'Liver', 'Aortic arch'].every(n => names.indexOf(n) >= 0), 'the landmarks are among the labels');
ok(cta.slices.filter(s => s.labels).length >= 7 && CT.series[2].slices.filter(s => s.labels).length >= 2 && CT.series[3].slices.filter(s => s.labels).length >= 2, 'the CTA and the reformats carry labelled levels');
const total = JSON.stringify(CT).length; ok(total < 3.2e6, 'the CT stack stays under 3.2 MB (' + (total / 1e6).toFixed(2) + ')');
ok(/Slicer/.test(CT.credit) && /licen/i.test(CT.credit), 'the credit names 3D Slicer and the licence');
ok(chest.slices.map(s => s.z).every((z, i, a) => i === 0 || z > a[i - 1]), 'slices are in ascending order');
// ---- the echo volume
ok(ER && ER.frames.length === 9 && ER.phases === 9 && ER.dims.length === 3 && ER.frames.every(f => /^data:image\/jpeg;base64,/.test(f)), 'nine phases of the real volume as JPEG mosaics');
ok(ER.dims[0] === 149 && ER.dims[1] === 117 && ER.dims[2] === 139 && ER.cols * ER.rows >= ER.dims[2] && Math.abs(ER.period - 0.86) < 0.03, 'the volume dimensions, the mosaic layout and the cardiac period');
ok(ER.views.length === 7 && ER.views.every(v => v.labels.length >= 2 && v.note.length > 40) && ER.views.filter(v => v.c !== undefined).length === 3 && ER.views.filter(v => v.phi !== undefined).length === 4, 'seven real views: four long axes and three short axes, each labelled and explained');
ok(JSON.stringify(ER).length < 1.8e6 && /SlicerHeart/.test(ER.credit), 'the echo volume stays under 1.8 MB and credits SlicerHeart');
// ---- the logbook logic
const E = require('../src/echo.js'), L = E.LOG;
ok(Object.keys(E.topics).length === 9 && E.groups[2].ids.indexOf('echo_log') >= 0 && E.topics.echo_log.blocks.some(b => b.widget === 'echolog'), 'the logbook topic sits in the practice group');
const d = L.derive({ lvotD: 2.0, lvotVti: 20, hr: 80, trv: 3, rap: 8, e: 80, a: 60, eprime: 8, ivcMax: 2.2, ivcMin: 1.1, vtiBefore: 18, vtiAfter: 21, height: 175, weight: 80, lvidd: 5, lvids: 3.5 });
ok(Math.abs(d.csa - 3.14) < 0.01 && Math.abs(d.sv - 62.8) < 0.1 && Math.abs(d.co - 5.03) < 0.01 && Math.abs(d.ci - 2.55) < 0.01, 'SV = CSA × VTI: D 2.0 → 3.14 cm², VTI 20 → 62.8 mL, HR 80 → 5.03 L/min (the atlas example)');
ok(d.rvsp === 44 && Math.abs(d.ea - 1.333) < 0.01 && d.ee === 10 && d.ivcCollapse === 50 && d.ivcDistend === 100 && Math.abs(d.plrDelta - 16.67) < 0.01 && d.fs === 30, 'RVSP, E/A, E/e′, the IVC indices, the PLR change and fractional shortening');
ok(Object.keys(L.derive({})).length === 0 && L.derive({ lvotD: 'x' }).csa === undefined, 'nothing derived from nothing');
const r = L.blank('2026-11-07'); r.indication = 'shock';
const r2 = Object.assign(L.blank('2026-10-02'), { type: 'TEE', synthetic: true }), r3 = Object.assign(L.blank('2026-11-01'), { type: 'TEE' }), r4 = Object.assign(L.blank('2026-11-03'), { interpreted: false }), r5 = Object.assign(L.blank('2026-09-03'), { deleted: true });
ok(/^EC-[A-Z2-9]{5}$/.test(r.code) && r.performed && r.interpreted && r.complete && !r.synthetic, 'a blank record has a random code and counts by default');
const q = L.qualifies(r2); ok(!q.ok && q.why[0] === 'practice / synthetic' && L.qualifies(r).tte && L.qualifies(r3).tee && !L.qualifies(r4).ok && /interpreted/.test(L.qualifies(r4).why[0]) && !L.qualifies(r5).ok, 'qualification: real, performed, interpreted, complete, not deleted');
const c = L.counters([r, r2, r3, r4, r5], new Date('2026-11-07T12:00:00Z'));
ok(c.all === 3 && c.month === 3 && c.tte === 1 && c.tee === 1 && c.practice === 1 && c.deleted === 1 && c.targetTte === 150 && c.targetTee === 50, 'the dashboard counters');
const csv = L.csv([r, r3]).split('\n'); ok(csv.length === 3 && csv[0].split(',').length === L.CSV_COLS.length + L.FIELDS.length && csv[1].indexOf('11/07/2026') > 0 && csv[1].indexOf(r.code) === 0, 'the CSV: a header, one row per study, dates as MM/DD/YYYY');
ok(L.candidates([r, r2, r3, r4], 'TTE').length === 1 && L.candidates([r, r2, r3, r4], 'TEE').length === 1 && L.candidateCsv([r, r3], 'TEE').split('\n').length === 2, 'the NBE candidate lists hold only the qualifying studies');
const html = L.packetHtml([r, r2], { title: 't' }); ok(/<!doctype html>/.test(html) && html.indexOf(r.code) > 0 && /Trainee signature/.test(html) && /PRACTICE/.test(html) && html.indexOf('<script') < 0, 'the packet has a page per study with signature fields and flags practice studies');
const m = L.merge([r], [Object.assign({}, r, { updated: r.updated + 5, findings: 'newer' }), r3]); ok(m.added === 1 && m.updated === 1 && m.list.length === 2 && m.list.filter(x => x.code === r.code)[0].findings === 'newer', 'restoring merges by code and keeps the newer version');
ok(L.search([r, r2, r3, r5], { q: 'shock' }).length === 1 && L.search([r, r2, r3, r5], {}).length === 3 && L.search([r, r2, r3, r5], { deleted: true }).length === 4 && L.search([r, r2, r3], { type: 'TEE' }).length === 2 && L.search([r, r2, r3], { practice: 'real' }).length === 2 && L.search([r, r2, r3], { month: '2026-10' }).length === 1, 'search and filters');
ok(/26 January 2027/.test(L.CERT.nbe) && /22 December 2026/.test(L.CERT.nbe) && /150/.test(L.CERT.nbe) && /fellowship/.test(L.CERT.elso), 'the certification notes carry the dates and the targets');
console.log('real ' + pass + ' passed, ' + fail + ' failed');
