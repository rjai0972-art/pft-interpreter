// Tiny DSL for building states in tests:  mk(['spiro','vol'], 'spiro.ratio=low', 'spiro.fev1=z-3.1', 'ctx.age=62')
const P = require('../dist/engine.js');
function mk(tests) {
  const st = P.defaultState();
  Object.keys(st.tests).forEach(k => { st.tests[k] = false; });
  tests.forEach(t => { st.tests[t] = true; });
  const specs = Array.prototype.slice.call(arguments, 1);
  if (specs.some(s => typeof s === 'string' && /^fvl\./.test(s))) st.tests.fvl = true;
  specs.forEach(s => {
    if (typeof s === 'object') { Object.assign(st, s); return; }
    const eq = s.indexOf('=');
    const path = s.slice(0, eq), val = s.slice(eq + 1);
    const dot = path.indexOf('.'); const mod = path.slice(0, dot), id = path.slice(dot + 1);
    if (mod === 'prior') {
      const m = /^(\d+)\.(.+)$/.exec(id);
      if (m) { while (st.prior.list.length < +m[1]) st.prior.list.push(P.blankPrior()); st.prior.list[+m[1] - 1][m[2]] = val; }
      else st.prior.cur[id] = val;
      return;
    }
    if (mod === 'spiro' && id === 'qual') { st.spiro.qual_fev1 = val; st.spiro.qual_fvc = val; return; }   // legacy single grade
    const field = P.SCHEMA[mod].groups.reduce((a, g) => a.concat(g.fields), []).filter(f => f.id === id)[0];
    if (!field) throw new Error('unknown field ' + path);
    if (field.type === 'param') {
      if (/^z/.test(val)) st[mod][id] = { c: 'nm', z: val.slice(1) }; else st[mod][id] = { c: val, z: '' };
    } else if (field.type === 'chk') st[mod][id] = (val === '1' || val === 'true');
    else if (field.type === 'multi') st[mod][id] = val ? val.split(',') : [];
    else st[mod][id] = val;
  });
  return st;
}
module.exports = { P, mk };
