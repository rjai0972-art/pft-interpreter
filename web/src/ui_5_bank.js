
/* ========================================================================= case bank
   Saved cases live in this browser (localStorage, with an in-memory fallback). The bank gives: saved cases to reopen,
   a clinician review (agrees / needs changes, which section, what it should say), similar-case lookup by pattern,
   heads-up usefulness ratings, an accuracy summary, and exports. It never rewrites the clinical rules by itself. */
const BANK_KEY = 'pft.bank.v1', FB_KEY = 'pft.feedback.v1', BANK_CAP = 500;
let bankMem = null, fbMem = null, storeOK = true;
const rnd = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
let caseTok = rnd();

function lsGet(k) { try { const v = window.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { storeOK = false; return null; } }
function lsSet(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { storeOK = false; return false; } }
function bankLoad() { if (!bankMem) { const v = lsGet(BANK_KEY); bankMem = Array.isArray(v) ? v : []; } return bankMem; }
function bankPersist() { return lsSet(BANK_KEY, bankMem || []); }
function bankCount() { return bankLoad().length; }
function fbLoad() { if (!fbMem) { const v = lsGet(FB_KEY); fbMem = (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; } return fbMem; }
function fbPersist() { return lsSet(FB_KEY, fbMem || {}); }
function fbCounts(id) { const e = fbLoad()[id]; let u = 0, n = 0; if (e && e.by) Object.keys(e.by).forEach(k => { if (e.by[k] === 'u') u++; else if (e.by[k] === 'n') n++; }); return { u: u, n: n }; }
function fbGet(id) { const e = fbLoad()[id]; return (e && e.by && e.by[caseTok]) || ''; }
function fbSet(id, title, val) {
  const all = fbLoad(); const e = all[id] || (all[id] = { title: title, by: {} });
  e.title = title;
  if (val) e.by[caseTok] = val; else delete e.by[caseTok];
  const ks = Object.keys(e.by); if (ks.length > 300) delete e.by[ks[0]];
  fbPersist();
}
/* Only notes and look-for tips can be quieted, and only after repeated "not useful" ratings with few "useful" ones. */
function fbQuiet(x) {
  if (x.lvl !== 'note' && x.lvl !== 'tip') return false;
  if (fbGet(x.id) === 'u') return false;
  const c = fbCounts(x.id); return c.n >= 3 && c.n > 2 * c.u;
}

/* ------------------------------------------------------------------- signature */
function signature(res) {
  const tok = {}, f = res.facts;
  const add = (t, w) => { if (!tok[t] || tok[t] < w) tok[t] = w; };
  res.sections.forEach(s => (s.codes || []).forEach(c => add('c:' + c, 3)));
  if (f.on.spiro && f.sp.pat && f.sp.pat.kind !== 'none') add('sp:' + f.sp.pat.kind, 2);
  if (f.on.vol && f.vol.pat && f.vol.pat.kind !== 'none') add('vol:' + f.vol.pat.kind, 2);
  if (f.on.dlco && f.dl.pat && f.dl.pat.kind !== 'none') add('dl:' + f.dl.pat.kind, 2);
  if (f.on.fvl && f.fvl.loop) add('loop:' + f.fvl.loop, 1);
  Object.keys(f.on).forEach(k => { if (f.on[k]) add('t:' + k, 0.5); });
  (f.ctx.indic || []).forEach(k => add('ind:' + k, 0.5));
  res.headsup.forEach(x => { if (x.lvl === 'alert' || x.lvl === 'caution') add('h:' + x.id, 1); });
  return tok;
}
function similarity(a, b) {
  let mn = 0, mx = 0; const keys = {}; Object.keys(a).forEach(k => { keys[k] = 1; }); Object.keys(b).forEach(k => { keys[k] = 1; });
  Object.keys(keys).forEach(k => { const x = a[k] || 0, y = b[k] || 0; mn += Math.min(x, y); mx += Math.max(x, y); });
  return mx ? mn / mx : 0;
}
const REVIEW_PARTS = [['spiro', 'Spirometry'], ['fvl', 'Flow–volume loop'], ['bd', 'Bronchodilator'], ['vol', 'Lung volumes'], ['dlco', 'DLCO'], ['other', 'Other tests'], ['interp', 'Interpretation wording'], ['headsup', 'Heads-up']];
const partName = (k) => (REVIEW_PARTS.filter(p => p[0] === k)[0] || [k, k])[1];

/* ------------------------------------------------------------------ saving */
function freeTextPaths() {
  const out = [['ctx', 'indication']];
  Object.keys(P.SCHEMA).forEach(m => (P.SCHEMA[m].groups || []).forEach(g => g.fields.forEach(f => { if (f.type === 'txt') out.push([m, f.id]); })));
  return out;
}
function caseRecord(label, dropText) {
  const st = JSON.parse(JSON.stringify(S));
  if (dropText) freeTextPaths().forEach(p => { if (st[p[0]] && typeof st[p[0]][p[1]] === 'string') st[p[0]][p[1]] = ''; });
  const res = P.interpret(st);
  const codes = uniq(res.sections.reduce((a, s) => a.concat(s.codes || []), []));
  return { id: rnd(), savedAt: new Date().toISOString(), label: (label || '').trim().slice(0, 60), state: st, sig: signature(res), codes: codes,
    summary: res.impression[0] || '', impression: res.impression.slice(0, 12), tests: Object.keys(st.tests).filter(k => st.tests[k]),
    headsup: res.headsup.filter(x => x.lvl !== 'note').map(x => ({ id: x.id, lvl: x.lvl, title: x.title })).slice(0, 20), review: { status: '', sections: [], note: '', at: '' } };
}
function addCase(rec) {
  const b = bankLoad(); b.unshift(rec); if (b.length > BANK_CAP) b.length = BANK_CAP;
  return bankPersist();
}
function bankSavePanel() {
  const lab = h('input', { type: 'text', id: 'bank-label', maxlength: '60', placeholder: 'Optional, no names or record numbers (for example "ILD follow-up 3")', 'aria-label': 'Case label' });
  const drop = h('input', { type: 'checkbox', id: 'bank-drop', checked: true });
  const panel = h('div', { class: 'bank-save', id: 'bank-save', hidden: true }, [
    h('div', { class: 'fld wide' }, [h('label', { for: 'bank-label', text: 'Label' }), lab]),
    h('div', { class: 'chkrow' }, [drop, h('label', { for: 'bank-drop', text: 'Leave out free-text fields (other indication, reason for stopping)' })]),
    h('p', { class: 'fine', text: 'Stored in this browser only; nothing is sent anywhere. Do not type names, record numbers or birth dates. The study dates are kept because the trend needs them.' }),
    h('div', { class: 'btns', style: 'display:flex;flex-wrap:wrap;gap:8px' }, [
      h('button', { type: 'button', class: 'btn primary', id: 'bank-save-go', text: 'Save case', onclick: () => {
        const ok = addCase(caseRecord(lab.value, drop.checked));
        panel.hidden = true; lab.value = ''; sync();
        toast(ok ? 'Saved to the case bank (' + plural(bankCount(), 'case') + ')' : 'Saved for this session only: browser storage is blocked here. Export the bank to keep it.');
      } }),
      h('button', { type: 'button', class: 'btn', text: 'Cancel', onclick: () => { panel.hidden = true; } })])
  ]);
  return panel;
}

/* ------------------------------------------------------------ similar cases */
function similarCard() {
  const b = bankLoad(); if (!b.length || !R.anyData) return null;
  const cur = signature(R), now = JSON.stringify(S);
  const list = b.filter(c => JSON.stringify(c.state) !== now).map(c => ({ c: c, s: similarity(cur, c.sig || {}) })).filter(x => x.s >= 0.45).sort((a, b2) => b2.s - a.s).slice(0, 3);
  if (!list.length) return null;
  const rev = list.filter(x => x.c.review && x.c.review.status), edits = rev.filter(x => x.c.review.status === 'edit');
  const parts = {}; edits.forEach(x => (x.c.review.sections || []).forEach(k => { parts[k] = (parts[k] || 0) + 1; }));
  const topPart = Object.keys(parts).sort((a, b2) => parts[b2] - parts[a])[0];
  const kases = (n) => n + ' ' + (n === 1 ? 'case' : 'cases');
  const msg = rev.length
    ? (edits.length ? 'You marked ' + edits.length + ' of ' + kases(rev.length) + ' reviewed among these as needing changes' + (topPart ? ', most often in ' + partName(topPart).toLowerCase() : '') + '. Worth a second look at that part here.'
                    : 'You agreed with the interpretation in all ' + kases(rev.length) + ' reviewed among these.')
    : 'None of these has been reviewed yet.';
  return h('section', { class: 'card sim', id: 'similar', 'aria-labelledby': 'sim-h' }, [
    h('h2', { id: 'sim-h', text: 'Similar saved cases' }),
    h('p', { class: 'fine', text: 'Matched on pattern codes, loop, tests done and heads-up findings. These are your own saved cases; they do not change the report.' }),
    h('p', { class: 'sim-msg', text: msg }),
    h('div', { class: 'sim-list' }, list.map(x => h('div', { class: 'sim-item', 'data-case': x.c.id }, [
      h('div', { class: 'sim-top' }, [h('b', { text: x.c.label || 'Saved case' }), h('span', { class: 'fine', text: Math.round(x.s * 100) + '% match · ' + fmtDay((x.c.savedAt || '').slice(0, 10)) }), reviewChip(x.c)]),
      h('div', { class: 'codes' }, (x.c.codes || []).map(codeChip)),
      x.c.summary ? h('p', { class: 'sim-sum', text: x.c.summary }) : null,
      x.c.review && x.c.review.note ? h('p', { class: 'sim-note' }, [h('span', { class: 'lbl', text: 'Your note: ' }), x.c.review.note]) : null,
      h('button', { type: 'button', class: 'btn sm', text: 'Open this case', onclick: () => loadState(x.c.state, 'report', 'Opened a saved case') })])))
  ]);
}
function reviewChip(c) {
  const s = c.review && c.review.status;
  return h('span', { class: 'chip ' + (s === 'agree' ? 'ok' : (s === 'edit' ? 'caution' : '')), text: s === 'agree' ? 'Agreed' : (s === 'edit' ? 'Needs changes' : 'Not reviewed') });
}

/* ------------------------------------------------------------------ files */
async function saveFile(name, text, mime) {
  try {
    if (window.claude && typeof window.claude.use === 'function') {
      const d = await window.claude.use('downloads');
      if (d && typeof d.save === 'function') {
        try { await d.save({ filename: name, data: text }); toast('Saved ' + name); return; }
        catch (e) { if (e && (e.code === 'declined' || e.code === 'rate_limited')) { toast(e.code === 'declined' ? 'Save cancelled' : 'Try again in a moment'); return; } }
      }
    }
  } catch (e) { /* fall through */ }
  try {
    const url = URL.createObjectURL(new Blob([text], { type: mime || 'text/plain' }));
    const a = h('a', { href: url, download: name, style: 'display:none' }); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000); toast('Downloading ' + name); return;
  } catch (e) { /* fall through */ }
  showFallback(text);
}
function csvCell(v) { const s = String(v === null || v === undefined ? '' : v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function reviewLogCsv() {
  const rows = [['case_id', 'label', 'saved_at', 'tests', 'codes', 'review_status', 'sections_to_change', 'note', 'reviewed_at', 'first_interpretation_line']];
  bankLoad().forEach(c => { const r = c.review || {}; rows.push([c.id, c.label, c.savedAt, (c.tests || []).join(' '), (c.codes || []).join(' '), r.status || '', (r.sections || []).join(' '), r.note || '', r.at || '', c.summary || '']); });
  return rows.map(r => r.map(csvCell).join(',')).join('\n');
}
function importBank(text) {
  let o; try { o = JSON.parse(text); } catch (e) { return { ok: false, msg: 'That is not valid JSON.' }; }
  const arr = Array.isArray(o) ? o : (o && Array.isArray(o.cases) ? o.cases : null);
  if (!arr) return { ok: false, msg: 'No cases found in that file.' };
  const b = bankLoad(), have = {}; b.forEach(c => { have[c.id] = 1; });
  let added = 0, skipped = 0;
  arr.forEach(c => {
    if (!c || typeof c !== 'object' || !c.state || typeof c.state !== 'object') { skipped++; return; }
    const id = typeof c.id === 'string' && c.id ? c.id.slice(0, 40) : rnd();
    if (have[id]) { skipped++; return; }
    const st = P.normalizeState(c.state), res = P.interpret(st);
    const rv = c.review && typeof c.review === 'object' ? c.review : {};
    const rec = { id: id, savedAt: typeof c.savedAt === 'string' ? c.savedAt.slice(0, 40) : new Date().toISOString(), label: String(c.label || '').slice(0, 60), state: st, sig: signature(res),
      codes: uniq(res.sections.reduce((a, s) => a.concat(s.codes || []), [])), summary: res.impression[0] || '', impression: res.impression.slice(0, 12), tests: Object.keys(st.tests).filter(k => st.tests[k]),
      headsup: res.headsup.filter(x => x.lvl !== 'note').map(x => ({ id: x.id, lvl: x.lvl, title: x.title })).slice(0, 20),
      review: { status: (rv.status === 'agree' || rv.status === 'edit') ? rv.status : '', sections: Array.isArray(rv.sections) ? rv.sections.filter(k => REVIEW_PARTS.some(p => p[0] === k)) : [], note: String(rv.note || '').slice(0, 600), at: String(rv.at || '').slice(0, 40) } };
    b.push(rec); have[id] = 1; added++;
  });
  if (b.length > BANK_CAP) b.length = BANK_CAP;
  if (o && o.feedback && typeof o.feedback === 'object' && !Array.isArray(o.feedback)) {
    const all = fbLoad();
    Object.keys(o.feedback).forEach(id => {
      const e = o.feedback[id]; if (!e || typeof e !== 'object' || !e.by || typeof e.by !== 'object') return;
      const t = all[id] || (all[id] = { title: String(e.title || id).slice(0, 120), by: {} });
      Object.keys(e.by).slice(0, 300).forEach(k => { if ((e.by[k] === 'u' || e.by[k] === 'n') && !(k in t.by)) t.by[k] = e.by[k]; });
    });
    fbPersist();
  }
  bankPersist();
  return { ok: true, msg: 'Added ' + plural(added, 'case') + (skipped ? ', skipped ' + skipped + ' (duplicates or unreadable)' : '') + '.' };
}

/* ------------------------------------------------------------------ bank page */
function bankStats() {
  const b = bankLoad(), rev = b.filter(c => c.review && c.review.status);
  const agree = rev.filter(c => c.review.status === 'agree').length, edit = rev.length - agree;
  const parts = {}, byCode = {};
  rev.forEach(c => {
    (c.codes || []).forEach(k => { const e = byCode[k] || (byCode[k] = { n: 0, edit: 0 }); e.n++; if (c.review.status === 'edit') e.edit++; });
    if (c.review.status === 'edit') (c.review.sections || []).forEach(k => { parts[k] = (parts[k] || 0) + 1; });
  });
  return { n: b.length, rev: rev.length, agree: agree, edit: edit, parts: parts, byCode: byCode };
}
function tile(label, value, sub) { return h('div', { class: 'stat' }, [h('div', { class: 'sv', text: String(value) }), h('div', { class: 'sl', text: label }), sub ? h('div', { class: 'ss', text: sub }) : null]); }
function barRows(entries, max) {
  return h('div', { class: 'bars' }, entries.map(e => h('div', { class: 'bar-row' }, [
    h('span', { class: 'bl', text: e[0] }),
    h('span', { class: 'bt' }, [h('span', { class: 'bf', style: 'width:' + Math.max(3, Math.round(e[1] / max * 100)) + '%' })]),
    h('span', { class: 'bv', text: e[2] })])));
}
let bankFilter = 'all';
function refreshBank() { const y = window.scrollY; render(); window.scrollTo(0, y); }
function stepBank() {
  const st = bankStats(), main = $('main');
  const sub = st.rev ? Math.round(st.agree / st.rev * 100) + '% agreed' : 'no reviews yet';
  const intro = h('div', { class: 'card' }, [
    h('div', { class: 'step-head' }, [h('h2', { text: 'Case bank' }),
      h('p', { class: 'intro', text: 'Save finished cases here to build a personal reference set. Reviewing them tells the bank where the interpretation matches your own reading and where it does not.' })]),
    h('div', { class: 'stats' }, [tile('Saved cases', st.n), tile('Reviewed', st.rev, sub), tile('Agreed', st.agree), tile('Needs changes', st.edit)]),
    h('details', { class: 'plain', open: !st.n }, [h('summary', { text: 'How the bank helps, and what it does not do' }), h('div', { class: 'mbody learn-inline' }, [
      h('ul', {}, [
        h('li', { text: 'When you read a new case, the bank lists the most similar saved cases and how you judged them, so a pattern you have corrected before is flagged again.' }),
        h('li', { text: 'Reviews build an agreement rate and show which sections you correct most, and for which patterns.' }),
        h('li', { text: 'Rating heads-up items tunes only the notes and look-for tips: after repeated “not useful” ratings an item moves to a quieter list. Alerts and cautions are never hidden.' }),
        h('li', { text: 'The bank does not rewrite the clinical rules on its own. There is no ground truth other than your review, and rules that changed silently could drift without anyone noticing. Export the review log and change thresholds or wording deliberately.' })]),
      h('p', { class: 'fine', text: storeOK ? 'Cases are stored in this browser only. Clearing site data or using a private window removes them: export a backup now and then.' : 'Browser storage is blocked here, so saved cases last only until this page closes. Use the export to keep them.' })])])
  ]);
  main.appendChild(intro);

  if (st.rev) {
    const partE = Object.keys(st.parts).sort((a, b) => st.parts[b] - st.parts[a]).map(k => [partName(k), st.parts[k], String(st.parts[k])]);
    const codeE = Object.keys(st.byCode).filter(k => st.byCode[k].n >= 2).sort((a, b) => (st.byCode[b].edit / st.byCode[b].n) - (st.byCode[a].edit / st.byCode[a].n) || st.byCode[b].n - st.byCode[a].n).slice(0, 8).map(k => [k, st.byCode[k].edit / st.byCode[k].n, st.byCode[k].edit + ' of ' + st.byCode[k].n]);
    main.appendChild(h('div', { class: 'card' }, [h('h2', { class: 'h2s', text: 'Where the interpretation needed changes' }),
      h('div', { class: 'two' }, [
        h('div', {}, [h('h3', { class: 'h3s', text: 'Sections you corrected' }), partE.length ? barRows(partE, partE[0][1]) : h('p', { class: 'fine', text: 'No corrections marked yet.' })]),
        h('div', {}, [h('h3', { class: 'h3s', text: 'Patterns with the most corrections' }), codeE.length ? barRows(codeE, 1) : h('p', { class: 'fine', text: 'Appears once a pattern has two or more reviewed cases.' })])])]));
  }
  const fb = fbLoad(), ids = Object.keys(fb).filter(k => { const c = fbCounts(k); return c.u + c.n > 0; });
  if (ids.length) {
    const rows = ids.map(k => { const c = fbCounts(k); return { id: k, title: fb[k].title, u: c.u, n: c.n }; }).sort((a, b) => (b.u + b.n) - (a.u + a.n)).slice(0, 12);
    main.appendChild(h('div', { class: 'card' }, [h('h2', { class: 'h2s', text: 'Heads-up ratings' }),
      h('div', { class: 'tbl-wrap' }, [h('table', { class: 'edu-tbl' }, [h('thead', {}, [h('tr', {}, ['Item', 'Useful', 'Not useful', 'Shown as'].map(x => h('th', { text: x })))]),
        h('tbody', {}, rows.map(r => h('tr', {}, [h('th', { scope: 'row', text: r.title }), h('td', { class: 'n', text: String(r.u) }), h('td', { class: 'n', text: String(r.n) }),
          h('td', { text: (r.n >= 3 && r.n > 2 * r.u) ? 'Quieter (notes and tips only)' : 'Normal' })])))])])]));
  }

  // list
  const filters = [['all', 'All'], ['todo', 'Not reviewed'], ['agree', 'Agreed'], ['edit', 'Needs changes']];
  const listBox = h('div', { class: 'bank-list', id: 'bank-list' });
  const fbtn = {};
  const bar = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter cases' }, filters.map(f => { const b = h('button', { type: 'button', class: 'cp', 'data-filter': f[0], 'aria-pressed': String(bankFilter === f[0]), text: f[1], onclick: () => { bankFilter = f[0]; Object.keys(fbtn).forEach(k => fbtn[k].setAttribute('aria-pressed', String(k === bankFilter))); paintList(); } }); fbtn[f[0]] = b; return b; }));
  function paintList() {
    listBox.textContent = '';
    const all = bankLoad();
    const items = all.filter(c => bankFilter === 'all' || (bankFilter === 'todo' ? !(c.review && c.review.status) : (c.review && c.review.status === bankFilter)));
    if (!all.length) { listBox.appendChild(h('p', { class: 'empty-note', text: 'No saved cases yet. Finish a case, open the Report step and choose “Save to case bank”.' })); return; }
    if (!items.length) { listBox.appendChild(h('p', { class: 'empty-note', text: 'No cases match this filter.' })); return; }
    items.forEach(c => listBox.appendChild(bankCaseEl(c, refreshBank)));
  }
  paintList();
  main.appendChild(h('div', { class: 'card' }, [h('div', { class: 'bar' }, [h('h2', { class: 'h2s', text: 'Saved cases' }), bar]), listBox]));

  // backup
  const imp = h('textarea', { class: 'case', id: 'bank-import', rows: '4', placeholder: 'Paste an exported bank (JSON) here to merge it into this browser', 'aria-label': 'Import bank JSON' });
  main.appendChild(h('div', { class: 'card' }, [
    h('h2', { class: 'h2s', text: 'Backup and review log' }),
    h('p', { class: 'fine', text: 'The bank JSON holds every saved case with its review and the heads-up ratings, and can be pasted back in on another browser. The review log (CSV) lists each case with its patterns, your verdict and your notes: the thing to use when deciding what the rules should change.' }),
    h('div', { class: 'btns', style: 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px' }, [
      h('button', { type: 'button', class: 'btn', id: 'bank-export', text: 'Export bank (JSON)', disabled: !st.n, onclick: () => saveFile('pft-case-bank.json', JSON.stringify({ format: 'pft-case-bank', version: 1, exported: new Date().toISOString(), cases: bankLoad(), feedback: fbLoad() }, null, 1), 'application/json') }),
      h('button', { type: 'button', class: 'btn', id: 'bank-log', text: 'Export review log (CSV)', disabled: !st.n, onclick: () => saveFile('pft-review-log.csv', reviewLogCsv(), 'text/csv') })]),
    h('div', { id: 'fallback', class: 'fallback' }),
    h('div', { class: 'fld wide', style: 'margin-top:14px' }, [imp, h('div', { style: 'margin-top:8px' }, [h('button', { type: 'button', class: 'btn sm', id: 'bank-import-go', text: 'Import', onclick: () => {
      const r = importBank(imp.value); toast(r.msg); if (r.ok) { imp.value = ''; render(); } } })])])
  ]));
}

function bankCaseEl(c, repaint) {
  const rv = c.review || (c.review = { status: '', sections: [], note: '', at: '' });
  let armed = false, armT = null;
  const del = h('button', { type: 'button', class: 'btn sm quiet', 'data-act': 'delete', text: 'Delete', onclick: () => {
    if (!armed) { armed = true; del.textContent = 'Click again to delete'; del.classList.add('danger'); clearTimeout(armT); armT = setTimeout(() => { armed = false; del.textContent = 'Delete'; del.classList.remove('danger'); }, 3500); return; }
    const b = bankLoad(), i = b.indexOf(c); if (i >= 0) b.splice(i, 1); bankPersist(); toast('Case deleted'); render();
  } });
  const status = h('div', { class: 'rv-status', role: 'group', 'aria-label': 'Does the interpretation read the way you would?' }, [
    h('span', { class: 'fine', text: 'Does the interpretation read the way you would?' }),
    h('button', { type: 'button', class: 'cp', 'data-review': 'agree', 'aria-pressed': String(rv.status === 'agree'), text: 'Yes, it agrees', onclick: () => { rv.status = rv.status === 'agree' ? '' : 'agree'; if (rv.status) { rv.sections = []; } rv.at = rv.status ? new Date().toISOString() : ''; bankPersist(); repaint(); } }),
    h('button', { type: 'button', class: 'cp', 'data-review': 'edit', 'aria-pressed': String(rv.status === 'edit'), text: 'Needs changes', onclick: () => { rv.status = rv.status === 'edit' ? '' : 'edit'; rv.at = rv.status ? new Date().toISOString() : ''; bankPersist(); repaint(); } })]);
  const detail = h('div', { class: 'rv-detail', hidden: rv.status !== 'edit' }, [
    h('div', { class: 'fine', text: 'Which part needs changing? (tap all that apply)' }),
    h('div', { class: 'chips' }, REVIEW_PARTS.map(p => h('button', { type: 'button', class: 'cp', 'data-part': p[0], 'aria-pressed': String(rv.sections.indexOf(p[0]) >= 0), text: p[1],
      onclick: (e) => { const i = rv.sections.indexOf(p[0]); if (i >= 0) rv.sections.splice(i, 1); else rv.sections.push(p[0]); e.currentTarget.setAttribute('aria-pressed', String(i < 0)); bankPersist(); repaint(); } }))),
    h('div', { class: 'fld wide' }, [h('label', { for: 'rvn-' + c.id, text: 'What it should have said (optional)' }), h('textarea', { class: 'case', id: 'rvn-' + c.id, rows: '2', maxlength: '600', value: rv.note, placeholder: 'For example: this is mixed disease; the TLC should have been read as low.',
      onchange: (e) => { rv.note = e.target.value; bankPersist(); } })])]);
  return h('article', { class: 'bank-case', 'data-case': c.id }, [
    h('div', { class: 'bc-top' }, [h('b', { text: c.label || 'Saved case' }), h('span', { class: 'fine', text: fmtDay((c.savedAt || '').slice(0, 10)) }), reviewChip(c)]),
    h('div', { class: 'codes' }, (c.codes || []).map(codeChip)),
    c.summary ? h('p', { class: 'bc-sum', text: c.summary }) : null,
    h('div', { class: 'bc-acts' }, [h('button', { type: 'button', class: 'btn sm primary', 'data-act': 'open', text: 'Open', onclick: () => loadState(c.state, 'report', 'Opened a saved case') }), del]),
    h('div', { class: 'rv' }, [status, detail])
  ]);
}
