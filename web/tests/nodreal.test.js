// v8.5: the real nodule stacks — six cases from the Slicer CT-chest volume, lossless, measured from the voxels, placed in the chest series
global.window = undefined;
const N = require('../src/nod_real.js');
require('../src/ct_real.js'); const CT = globalThis.PFT_CTREAL;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
ok(N && N.cases.length === 6 && N.cases.filter(c => c.kind === 'nodule').length === 4 && N.cases.filter(c => c.kind === 'vessel').length === 2, 'six cases: four nodules, two vessels');
ok(/Slicer/.test(N.credit) && /HU/.test(N.lut), 'credit and LUT');
N.cases.forEach(c => {
  ok(c.slices.length === 17 && c.slices[c.index].dz === 0 && c.slices.every(s => /^data:image\/png;base64,/.test(s.img)), c.id + ': 17 lossless slices with the index in the middle');
  ok(c.size === 96 && Math.abs(c.mmpx - 0.7617) < 0.001 && c.step === 2.5 && c.centre[0] === 48, c.id + ': 96 px crops at full resolution');
  ok(c.hunt && c.hunt.x > 0 && c.hunt.x < 448 && c.hunt.y > 0 && c.hunt.y < 326 && typeof c.hunt.mm === 'number', c.id + ': placed in the chest series');
  ok(c.measure && typeof c.measure.long === 'number' && typeof c.measure.hu === 'number', c.id + ': measured');
});
const n1 = N.cases[0], n4 = N.cases[3], m2 = N.cases[5];
ok(n1.measure.long >= 9 && n1.measure.long <= 11.5 && n1.measure.solidHu > -60 && n1.side === 'left', 'n1: ~10 mm solid, left');
ok(n4.measure.long <= 4.5 && n4.side === 'right', 'n4: the tiny one, right');
ok(m2.measure.long > 15, 'the branching vessel is not round: long axis well over the nodules');
// the chest series carries the slices through the nodules
const chest = CT.series[0];
N.cases.filter(c => c.kind === 'nodule').forEach(c => ok(chest.slices.some(s => s.z === c.hunt.z), c.id + ': its slice is in the chest series'));
ok(chest.slices.length >= 60, 'chest series grew with the nodule slices');
console.log('nodreal ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
