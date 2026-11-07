
/* ========================================================================== The echo case logbook (v8.2)
   Records in localStorage (pcd.echolog.v1), images in IndexedDB (pcd-echolog / images) with a localStorage fallback; the logic is PFT_ECHO.LOG. */
const ELOG = (window.PFT_ECHO || {}).LOG;
const EL_KEY = 'pcd.echolog.v1', EL_IMG_KEY = 'pcd.echolog.img.v1';
const ELS = { tab: 'new', list: null, draft: null, editing: null, filter: { q: '', type: 'all', month: '', practice: 'all', deleted: false }, imgs: {}, msg: '', view: null, db: null, dbTried: false };
function elLoad() { if (ELS.list) return ELS.list; try { const v = JSON.parse(localStorage.getItem(EL_KEY) || '[]'); ELS.list = Array.isArray(v) ? v : []; } catch (e) { ELS.list = []; } return ELS.list; }
function elSave() { try { localStorage.setItem(EL_KEY, JSON.stringify(ELS.list || [])); return true; } catch (e) { ELS.msg = 'Could not save: this browser’s storage is full or blocked. Export a backup now.'; return false; } }
/* ---- images: IndexedDB when it exists, localStorage otherwise ---- */
function elDb(cb) {
  if (ELS.db) return cb(ELS.db);
  if (ELS.dbTried || typeof indexedDB === 'undefined') return cb(null);
  ELS.dbTried = true;
  try {
    const req = indexedDB.open('pcd-echolog', 1);
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'id' }); };
    req.onsuccess = () => { ELS.db = req.result; cb(ELS.db); };
    req.onerror = () => cb(null);
  } catch (e) { cb(null); }
}
function elImgPut(rec, cb) {
  elDb(db => {
    if (db) { try { const tx = db.transaction('images', 'readwrite'); tx.objectStore('images').put(rec); tx.oncomplete = () => cb(true); tx.onerror = () => cb(false); return; } catch (e) { /* fall through */ } }
    try { const all = JSON.parse(localStorage.getItem(EL_IMG_KEY) || '{}'); all[rec.id] = rec; localStorage.setItem(EL_IMG_KEY, JSON.stringify(all)); cb(true); } catch (e) { cb(false); }
  });
}
function elImgGet(id, cb) {
  if (ELS.imgs[id]) return cb(ELS.imgs[id]);
  elDb(db => {
    if (db) { try { const tx = db.transaction('images', 'readonly'), rq = tx.objectStore('images').get(id); rq.onsuccess = () => { const r = rq.result; if (r) ELS.imgs[id] = r; cb(r || null); }; rq.onerror = () => cb(null); return; } catch (e) { /* fall through */ } }
    try { const all = JSON.parse(localStorage.getItem(EL_IMG_KEY) || '{}'); if (all[id]) ELS.imgs[id] = all[id]; cb(all[id] || null); } catch (e) { cb(null); }
  });
}
function elImgDel(id) { delete ELS.imgs[id]; elDb(db => { if (db) { try { db.transaction('images', 'readwrite').objectStore('images').delete(id); } catch (e) { } } try { const all = JSON.parse(localStorage.getItem(EL_IMG_KEY) || '{}'); if (all[id]) { delete all[id]; localStorage.setItem(EL_IMG_KEY, JSON.stringify(all)); } } catch (e) { } }); }
function elImgAll(ids, cb) { const out = {}; let n = 0; if (!ids.length) return cb(out); ids.forEach(id => elImgGet(id, r => { if (r) out[id] = r.data; n++; if (n === ids.length) cb(out); })); }
/* ---- helpers ---- */
function elToday() { return new Date().toISOString().slice(0, 10); }
function elDraft() { if (!ELS.draft) ELS.draft = ELOG.blank(elToday()); return ELS.draft; }
function elDownload(name, text, mime) {
  try { const blob = new Blob([text], { type: mime || 'text/plain' }); const url = URL.createObjectURL(blob); const a = h('a', { href: url, download: name, text: name }); document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000); ELS.msg = 'Exported ' + name + ' (if nothing downloaded, this viewer blocks downloads — use the desktop app or the web page).'; }
  catch (e) { ELS.msg = 'Export failed: ' + e.message; }
}
function elNum(v, d) { return v === undefined || v === null || !isFinite(v) ? '—' : (Math.round(v * Math.pow(10, d || 1)) / Math.pow(10, d || 1)).toString(); }
function elNote(t) { ELS.msg = t; }
/* ---- the dashboard ---- */
function elDashboard(list) {
  const c = ELOG.counters(list);
  const tile = (k, v, sub, pct) => h('div', { class: 'el-tile', 'data-el-count': k }, [h('span', { class: 'el-k', text: sub }), h('span', { class: 'el-v', text: String(v) }), pct !== undefined ? h('div', { class: 'el-bar' }, [h('div', { class: 'el-barfill', style: 'width:' + Math.min(100, pct) + '%' })]) : null]);
  return h('div', { class: 'el-dash', 'data-el-dash': '1' }, [tile('all', c.all, 'All real scans'), tile('month', c.month, 'This month'), tile('tte', c.tte + ' / ' + c.targetTte, 'TTE candidates (performed and interpreted)', c.tte / c.targetTte * 100), tile('tee', c.tee + ' / ' + c.targetTee, 'TEE candidates', c.tee / c.targetTee * 100), tile('practice', c.practice, 'Practice / synthetic (not counted)')]);
}
/* ---- the form ---- */
function elField(label, input, hint) { return h('label', { class: 'el-field' }, [h('span', { class: 'el-lab', text: label }), input, hint ? h('span', { class: 'fine', text: hint }) : null]); }
function elText(d, key, attrs) { return h('input', Object.assign({ type: 'text', value: d[key] || '', 'data-el': key, oninput: (e) => { d[key] = e.target.value; } }, attrs || {})); }
function elArea(d, key, rows) { return h('textarea', { rows: rows || 2, 'data-el': key, oninput: (e) => { d[key] = e.target.value; } }, [d[key] || '']); }
function elCheck(d, key, label) { const id = uid('el'); return h('label', { class: 'chk-inline', for: id }, [h('input', { type: 'checkbox', id: id, checked: !!d[key], 'data-el': key, onchange: (e) => { d[key] = e.target.checked; elRefreshDerived(); } }), label]); }
function elRefreshDerived() {
  const d = elDraft(), dv = ELOG.derive(d.m), box = document.querySelector('[data-el-derived]'); if (!box) return;
  box.textContent = '';
  const items = [['Stroke volume', dv.sv, 'mL', 'sv'], ['Cardiac output', dv.co, 'L/min', 'co'], ['Cardiac index', dv.ci, 'L/min/m²', 'ci'], ['RVSP', dv.rvsp, 'mmHg', 'rvsp'], ['E/A', dv.ea, '', 'ea'], ['E/e′', dv.ee, '', 'ee'], ['IVC collapsibility', dv.ivcCollapse, '%', 'ivcc'], ['IVC distensibility', dv.ivcDistend, '%', 'ivcd'], ['PLR ΔVTI', dv.plrDelta, '%', 'plr'], ['Fractional shortening', dv.fs, '%', 'fs'], ['EF (Teichholz)', dv.efTeich, '%', 'ef']];
  items.forEach(it => { if (it[1] === undefined) return; box.appendChild(h('div', { class: 'el-der', 'data-el-der': it[3] }, [h('span', { class: 'el-k', text: it[0] }), h('span', { class: 'el-v', text: elNum(it[1], it[3] === 'ea' || it[3] === 'ee' ? 2 : 1) + (it[2] ? ' ' + it[2] : '') })])); });
  if (!box.children.length) box.appendChild(h('p', { class: 'fine', text: 'Derived values appear here as you enter the measurements (LVOT diameter + VTI + heart rate → stroke volume and output; TR Vmax + RAP → RVSP; E, A, e′; IVC maximum and minimum; VTI before and after a leg raise).' }));
  const q = ELOG.qualifies(d), flag = document.querySelector('[data-el-qual]'); if (flag) { flag.textContent = q.ok ? 'This study will count toward the ' + d.type + ' target.' : 'Will not count: ' + q.why.join(', ') + '.'; flag.className = 'el-qual ' + (q.ok ? 'ok' : 'no'); }
}
function elImageSlot(d) {
  const id = uid('elimg');
  const holder = h('div', { class: 'el-images', 'data-el-images': String((d.images || []).length) });
  (d.images || []).forEach(imgId => {
    const fig = h('figure', { class: 'el-img', 'data-el-img': imgId }, [h('div', { class: 'el-imgbox', text: 'loading…' }), h('button', { type: 'button', class: 'lnk', text: 'Remove', onclick: () => { d.images = d.images.filter(x => x !== imgId); elImgDel(imgId); render(); } })]);
    elImgGet(imgId, r => { const box = fig.querySelector('.el-imgbox'); if (!box) return; box.textContent = ''; if (r) { box.appendChild(h('img', { src: r.data, alt: r.caption || 'study image' })); if (r.caption) box.appendChild(h('span', { class: 'fine', text: r.caption })); } else box.textContent = 'image not found'; });
    holder.appendChild(fig);
  });
  const input = h('input', { type: 'file', id: id, accept: 'image/*', multiple: true, class: 'eh-file', 'data-el-file': '1', onchange: (e) => {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    let left = files.length;
    files.forEach(f => { const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); const s = Math.min(1, 900 / Math.max(im.width, im.height)); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); const rec = { id: 'img-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), data: c.toDataURL('image/jpeg', 0.8), caption: '', added: Date.now() }; elImgPut(rec, ok => { if (ok) { ELS.imgs[rec.id] = rec; d.images = (d.images || []).concat([rec.id]); } else elNote('The image could not be stored.'); if (--left === 0) render(); }); }; im.src = rd.result; }; rd.readAsDataURL(f); });
  } });
  holder.appendChild(h('div', { class: 'eh-ownctl' }, [h('label', { class: 'btn sm', for: id, text: 'Add images' }), input, h('span', { class: 'fine', text: 'De-identified stills only — crop out names, record numbers and dates. Resized to 900 px and kept on this device.' })]));
  return holder;
}
function elForm() {
  const d = elDraft(), list = elLoad();
  const viewsBox = h('div', { class: 'el-views' }, ELOG.VIEWS.map(v => { const id = uid('elv'); return h('label', { class: 'chk-inline', for: id }, [h('input', { type: 'checkbox', id: id, checked: (d.views || []).indexOf(v[1]) >= 0, 'data-el-view': v[0], onchange: (e) => { d.views = (d.views || []).filter(x => x !== v[1]); if (e.target.checked) d.views.push(v[1]); } }), v[1]]); }));
  const mBox = h('div', { class: 'el-mgrid' }, ELOG.FIELDS.map(f => elField(f[1] + (f[2] ? ' (' + f[2] + ')' : ''), h('input', { type: 'number', step: 'any', inputmode: 'decimal', value: d.m[f[0]] === undefined ? '' : d.m[f[0]], 'data-el-m': f[0], oninput: (e) => { d.m[f[0]] = e.target.value === '' ? undefined : e.target.value; elRefreshDerived(); } }), f[3])));
  const linkSel = h('select', { 'data-el': 'linkedTo', onchange: (e) => { d.linkedTo = e.target.value; } }, [h('option', { value: '', text: '— none —', selected: !d.linkedTo })].concat(list.filter(r => !r.deleted && r.code !== d.code).map(r => h('option', { value: r.code, text: r.code + ' · ' + ELOG.fmtDate(r.performedDate) + ' · ' + (r.indication || '').slice(0, 40), selected: d.linkedTo === r.code }))));
  const save = () => {
    if (!d.indication.trim()) { elNote('Give the study an indication or clinical question before saving.'); render(); return; }
    d.updated = Date.now(); const i = list.findIndex(r => r.code === d.code); if (i >= 0) list[i] = d; else list.push(d);
    if (elSave()) { elNote('Saved ' + d.code + '.'); ELS.draft = null; ELS.editing = null; ELS.tab = 'log'; }
    render();
  };
  return h('div', { class: 'el-form', 'data-el-form': d.code }, [
    h('div', { class: 'el-row' }, [
      elField('Case code (random; the only identifier)', h('input', { type: 'text', value: d.code, readonly: true, 'data-el': 'code' })),
      elField('Study type', h('select', { 'data-el': 'type', onchange: (e) => { d.type = e.target.value; elRefreshDerived(); } }, ['TTE', 'TEE'].map(t => h('option', { value: t, text: t, selected: d.type === t })))),
      elField('Date performed', h('input', { type: 'date', value: d.performedDate, 'data-el': 'performedDate', onchange: (e) => { d.performedDate = e.target.value; } })),
      elField('Setting', h('select', { 'data-el': 'setting', onchange: (e) => { d.setting = e.target.value; } }, ELOG.SETTINGS.map(t => h('option', { value: t, text: t, selected: d.setting === t }))))]),
    elField('Critical-care indication / clinical question', elText(d, 'indication', { placeholder: 'e.g. undifferentiated shock on norepinephrine — fluid responsive? LV function?' })),
    h('div', { class: 'el-row el-roles' }, [elCheck(d, 'performed', 'I performed the acquisition'), elCheck(d, 'interpreted', 'I interpreted it'), elCheck(d, 'supervised', 'Directly supervised'), elCheck(d, 'complete', 'Complete study (all required components obtained)'), elCheck(d, 'synthetic', 'Practice / simulated / synthetic — do not count')]),
    h('p', { class: 'el-qual', 'data-el-qual': '1' }),
    h('h5', { text: 'Views obtained' }), viewsBox,
    elField('Components not obtainable (and why)', elText(d, 'unobtainable', { placeholder: 'e.g. no subcostal window (dressings); TR jet not measurable' })),
    h('h5', { text: 'Measurements' }), mBox,
    h('div', { class: 'el-derived', 'data-el-derived': '1' }),
    h('h5', { text: 'Interpretation' }),
    elField('Findings (the numbers and the pictures)', elArea(d, 'findings', 3)),
    elField('Limitations', elText(d, 'limitations')),
    elField('Diagnosis and clinical integration (what changed because of the scan)', elArea(d, 'diagnosis', 2)),
    elField('Response to intervention (repeat study, if any)', elText(d, 'response')),
    elField('Linked repeat of an earlier study (one qualifying repeat per patient)', linkSel),
    h('h5', { text: 'Review' }),
    h('div', { class: 'el-row' }, [elField('Qualified reviewer', elText(d, 'reviewer', { placeholder: 'reviewer’s name or initials' })), elField('Date reviewed', h('input', { type: 'date', value: d.reviewDate || '', 'data-el': 'reviewDate', onchange: (e) => { d.reviewDate = e.target.value; } }))]),
    elField('Reviewer feedback', elArea(d, 'feedback', 2)),
    h('h5', { text: 'Images' }), elImageSlot(d),
    h('div', { class: 'ec-labbtns el-acts' }, [h('button', { type: 'button', class: 'btn primary', 'data-el-save': '1', text: ELS.editing ? 'Save changes' : 'Save the study', onclick: save }), h('button', { type: 'button', class: 'btn sm quiet', 'data-el-cancel': '1', text: ELS.editing ? 'Cancel' : 'Clear', onclick: () => { ELS.draft = null; ELS.editing = null; if (ELS.tab === 'new' && list.length) ELS.tab = 'log'; render(); } })])
  ]);
}
/* ---- the review log ---- */
function elLogTable() {
  const list = elLoad(), f = ELS.filter, rows = ELOG.search(list, f);
  const months = Array.from(new Set(list.map(r => (r.performedDate || '').slice(0, 7)).filter(Boolean))).sort().reverse();
  const bar = h('div', { class: 'el-filter' }, [
    h('input', { type: 'search', placeholder: 'Search code, indication, findings, diagnosis, reviewer…', value: f.q, 'data-el-q': '1', oninput: (e) => { f.q = e.target.value; const t = document.querySelector('[data-el-table]'); if (t) t.replaceWith(elLogRows()); } }),
    h('select', { 'data-el-ftype': '1', onchange: (e) => { f.type = e.target.value; render(); } }, [['all', 'TTE and TEE'], ['TTE', 'TTE'], ['TEE', 'TEE']].map(o => h('option', { value: o[0], text: o[1], selected: f.type === o[0] }))),
    h('select', { 'data-el-fmonth': '1', onchange: (e) => { f.month = e.target.value; render(); } }, [h('option', { value: '', text: 'All months', selected: !f.month })].concat(months.map(m => h('option', { value: m, text: m, selected: f.month === m })))),
    h('select', { 'data-el-fpractice': '1', onchange: (e) => { f.practice = e.target.value; render(); } }, [['all', 'Real and practice'], ['real', 'Real only'], ['practice', 'Practice only']].map(o => h('option', { value: o[0], text: o[1], selected: f.practice === o[0] }))),
    (() => { const id = uid('eld'); return h('label', { class: 'chk-inline', for: id }, [h('input', { type: 'checkbox', id: id, checked: f.deleted, 'data-el-fdeleted': '1', onchange: (e) => { f.deleted = e.target.checked; render(); } }), 'Show deleted']); })()
  ]);
  return h('div', { class: 'el-log' }, [bar, elLogRows()]);
}
function elLogRows() {
  const list = elLoad(), rows = ELOG.search(list, ELS.filter);
  if (!list.length) return h('p', { class: 'fine', 'data-el-table': '0', text: 'No studies yet — add the first one under “New study”.' });
  if (!rows.length) return h('p', { class: 'fine', 'data-el-table': '0', text: 'Nothing matches the filter.' });
  const tbl = h('table', { class: 'edu-tbl el-tbl' }, [h('thead', {}, [h('tr', {}, ['Code', 'Date', 'Type', 'Indication', 'Diagnosis', 'Counts?', 'Reviewed', ''].map(x => h('th', { text: x })))]),
    h('tbody', {}, rows.map(r => { const q = ELOG.qualifies(r); return h('tr', { class: (r.deleted ? 'el-del' : '') + (r.synthetic ? ' el-syn' : ''), 'data-el-row': r.code }, [
      h('td', {}, [h('button', { type: 'button', class: 'lnk', 'data-el-open': r.code, text: r.code, onclick: () => { ELS.view = r.code; render(); } })]), h('td', { text: ELOG.fmtDate(r.performedDate) }), h('td', { text: r.type + (r.synthetic ? ' · practice' : '') }), h('td', { text: (r.indication || '').slice(0, 60) }), h('td', { text: (r.diagnosis || '').slice(0, 60) }),
      h('td', { text: q.ok ? 'yes' : 'no', title: q.why.join(', ') }), h('td', { text: r.reviewer ? (r.reviewer + (r.reviewDate ? ' · ' + ELOG.fmtDate(r.reviewDate) : '')) : '—' }),
      h('td', { class: 'el-rowacts' }, [h('button', { type: 'button', class: 'lnk', 'data-el-edit': r.code, text: 'Edit', onclick: () => { ELS.draft = JSON.parse(JSON.stringify(r)); ELS.editing = r.code; ELS.tab = 'new'; render(); } }),
        r.deleted ? h('button', { type: 'button', class: 'lnk', 'data-el-restore': r.code, text: 'Restore', onclick: () => { r.deleted = false; r.updated = Date.now(); elSave(); render(); } }) : h('button', { type: 'button', class: 'lnk', 'data-el-delete': r.code, text: 'Delete', onclick: () => { r.deleted = true; r.updated = Date.now(); elSave(); elNote(r.code + ' moved to deleted (it can be restored; show deleted to see it).'); render(); } })])]); }))]);
  return h('div', { class: 'tbl-wrap', 'data-el-table': String(rows.length) }, [tbl]);
}
function elViewCard(code) {
  const r = elLoad().filter(x => x.code === code)[0]; if (!r) return null;
  const dv = ELOG.derive(r.m), q = ELOG.qualifies(r);
  const kv = (k, v) => v ? h('div', { class: 'el-kv' }, [h('span', { class: 'el-k', text: k }), h('span', { text: v })]) : null;
  const imgs = h('div', { class: 'el-images' }); (r.images || []).forEach(id => { const fig = h('figure', { class: 'el-img' }, [h('div', { class: 'el-imgbox', text: 'loading…' })]); elImgGet(id, rec => { const box = fig.querySelector('.el-imgbox'); if (!box) return; box.textContent = ''; if (rec) box.appendChild(h('img', { src: rec.data, alt: 'study image' })); else box.textContent = 'image not found'; }); imgs.appendChild(fig); });
  return h('div', { class: 'el-view', 'data-el-view': r.code }, [
    h('div', { class: 'el-viewhead' }, [h('h4', { text: r.code + ' · ' + r.type + ' · ' + ELOG.fmtDate(r.performedDate) + (r.synthetic ? ' · practice' : '') }), h('button', { type: 'button', class: 'btn sm quiet', text: 'Close', 'data-el-close': '1', onclick: () => { ELS.view = null; render(); } })]),
    h('p', { class: 'el-qual ' + (q.ok ? 'ok' : 'no'), text: q.ok ? 'Counts toward the ' + r.type + ' target.' : 'Does not count: ' + q.why.join(', ') + '.' }),
    kv('Setting', r.setting), kv('Indication', r.indication), kv('Role', (r.performed ? 'performed' : '') + (r.performed && r.interpreted ? ' and ' : '') + (r.interpreted ? 'interpreted' : '') + (r.supervised ? ' (supervised)' : '')), kv('Views', (r.views || []).join(', ')), kv('Unobtainable', r.unobtainable),
    kv('Measurements', ELOG.FIELDS.filter(f => r.m && r.m[f[0]] !== undefined && r.m[f[0]] !== '').map(f => f[1] + ' ' + r.m[f[0]] + (f[2] ? ' ' + f[2] : '')).join(' · ')),
    kv('Derived', [['SV', dv.sv, 'mL'], ['CO', dv.co, 'L/min'], ['CI', dv.ci, 'L/min/m²'], ['RVSP', dv.rvsp, 'mmHg'], ['E/A', dv.ea, ''], ['E/e′', dv.ee, ''], ['IVC collapsibility', dv.ivcCollapse, '%'], ['PLR ΔVTI', dv.plrDelta, '%']].filter(x => x[1] !== undefined).map(x => x[0] + ' ' + elNum(x[1], x[0] === 'E/A' || x[0] === 'E/e′' ? 2 : 1) + (x[2] ? ' ' + x[2] : '')).join(' · ')),
    kv('Findings', r.findings), kv('Limitations', r.limitations), kv('Diagnosis', r.diagnosis), kv('Response', r.response), kv('Linked repeat of', r.linkedTo), kv('Reviewer', r.reviewer ? r.reviewer + (r.reviewDate ? ' · ' + ELOG.fmtDate(r.reviewDate) : '') : ''), kv('Feedback', r.feedback),
    (r.images || []).length ? imgs : null,
    h('div', { class: 'ec-labbtns' }, [h('button', { type: 'button', class: 'btn sm', text: 'Edit', onclick: () => { ELS.draft = JSON.parse(JSON.stringify(r)); ELS.editing = r.code; ELS.view = null; ELS.tab = 'new'; render(); } }), h('button', { type: 'button', class: 'btn sm quiet', text: 'Printable page for this study', 'data-el-packet1': r.code, onclick: () => { elImgAll(r.images || [], imgs => elPacket([r], imgs, r.code)); } })])
  ]);
}
/* ---- exports ---- */
function elPacket(list, imgs, title) {
  const html = ELOG.packetHtml(list, { images: imgs, title: title });
  let opened = null; try { const blob = new Blob([html], { type: 'text/html' }); const url = URL.createObjectURL(blob); opened = window.open(url, '_blank'); if (opened) { elNote('The packet opened in a new tab — print it from there (' + list.length + ' stud' + (list.length === 1 ? 'y' : 'ies') + ').'); render(); return; } } catch (e) { /* fall through */ }
  elDownload('echo-logbook-packet.html', html, 'text/html'); render();
}
function elExports() {
  const list = elLoad(), c = ELOG.counters(list);
  const restoreId = uid('elr');
  const restore = h('input', { type: 'file', id: restoreId, accept: 'application/json,.json', class: 'eh-file', 'data-el-restore-file': '1', onchange: (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const rd = new FileReader(); rd.onload = () => { try { const data = JSON.parse(rd.result); const recs = Array.isArray(data) ? data : (data.records || []); const m = ELOG.merge(list, recs); ELS.list = m.list; elSave(); let imgN = 0; const imgs = data.images || {}; Object.keys(imgs).forEach(id => { elImgPut(imgs[id], () => { }); imgN++; }); elNote('Restored: ' + m.added + ' new, ' + m.updated + ' updated' + (imgN ? ', ' + imgN + ' images' : '') + '.'); } catch (err) { elNote('That file is not a logbook backup (' + err.message + ').'); } render(); }; rd.readAsText(f);
  } });
  return h('div', { class: 'el-exports' }, [
    h('div', { class: 'el-exgrid' }, [
      h('div', { class: 'el-ex' }, [h('h5', { text: 'CSV of everything' }), h('p', { class: 'fine', text: 'Every study with every field and the derived numbers; opens in a spreadsheet.' }), h('button', { type: 'button', class: 'btn sm', 'data-el-csv': '1', text: 'Download CSV', onclick: () => { elDownload('echo-logbook.csv', ELOG.csv(list.filter(r => !r.deleted)), 'text/csv'); render(); } })]),
      h('div', { class: 'el-ex' }, [h('h5', { text: 'NBE candidate lists' }), h('p', { class: 'fine', text: c.tte + ' TTE and ' + c.tee + ' TEE studies qualify (real, performed and interpreted, complete).' }), h('div', { class: 'ec-labbtns' }, [h('button', { type: 'button', class: 'btn sm', 'data-el-nbe': 'TTE', text: 'TTE list (CSV)', onclick: () => { elDownload('nbe-tte-candidates.csv', ELOG.candidateCsv(list, 'TTE'), 'text/csv'); render(); } }), h('button', { type: 'button', class: 'btn sm', 'data-el-nbe': 'TEE', text: 'TEE list (CSV)', onclick: () => { elDownload('nbe-tee-candidates.csv', ELOG.candidateCsv(list, 'TEE'), 'text/csv'); render(); } })])]),
      h('div', { class: 'el-ex' }, [h('h5', { text: 'Printable packet' }), h('p', { class: 'fine', text: 'One page per study with blank signature fields for you and the reviewer; images included.' }), h('button', { type: 'button', class: 'btn sm', 'data-el-packet': '1', text: 'Open the packet', onclick: () => { const live = list.filter(r => !r.deleted); const ids = []; live.forEach(r => (r.images || []).forEach(i => ids.push(i))); elImgAll(ids, imgs => elPacket(live, imgs, 'all studies')); } })]),
      h('div', { class: 'el-ex' }, [h('h5', { text: 'Backup and restore' }), h('p', { class: 'fine', text: 'A JSON file with every record and image. Restoring merges by case code (the newer version of a study wins) — safe to run on another device.' }), h('div', { class: 'ec-labbtns' }, [h('button', { type: 'button', class: 'btn sm', 'data-el-backup': '1', text: 'Download backup', onclick: () => { const ids = []; list.forEach(r => (r.images || []).forEach(i => ids.push(i))); elImgAll(ids, imgs => { const full = {}; Object.keys(imgs).forEach(id => { full[id] = ELS.imgs[id]; }); elDownload('echo-logbook-backup-' + elToday() + '.json', JSON.stringify({ version: 1, exported: new Date().toISOString(), records: list, images: full }), 'application/json'); render(); }); } }), h('label', { class: 'btn sm quiet', for: restoreId, text: 'Restore from backup' }), restore])])
    ]),
    h('div', { class: 'el-cert' }, [h('h5', { text: 'Certification notes' }), h('p', { text: ELOG.CERT.nbe }), h('p', { text: ELOG.CERT.elso }), h('p', { class: 'fine', text: ELOG.CERT.discipline })])
  ]);
}
/* ---- the figure ---- */
function echoLogFig() {
  if (!ELOG) return h('figure', { class: 'an-fig', 'data-echolog': '1' }, [h('p', { class: 'fine', text: 'The logbook did not load.' })]);
  const list = elLoad();
  if (!ELS.rendered) { ELS.rendered = true; if (list.length && !ELS.draft) ELS.tab = 'log'; }
  const tabs = h('div', { class: 'seg el-tabs', role: 'tablist' }, [['new', ELS.editing ? 'Editing ' + ELS.editing : 'New study'], ['log', 'Review log (' + list.filter(r => !r.deleted).length + ')'], ['export', 'Export · backup · certification']].map(t => h('button', { type: 'button', class: 'ch', role: 'tab', 'data-el-tab': t[0], 'aria-selected': String(ELS.tab === t[0]), text: t[1], onclick: () => { ELS.tab = t[0]; ELS.view = null; render(); } })));
  const msg = ELS.msg ? h('p', { class: 'el-msg', 'data-el-msg': '1', text: ELS.msg }) : null; ELS.msg = '';
  let body;
  if (ELS.tab === 'new') body = elForm(); else if (ELS.tab === 'log') body = ELS.view ? elViewCard(ELS.view) || elLogTable() : elLogTable(); else body = elExports();
  const fig = h('figure', { class: 'an-fig el-fig', 'data-echolog': String(list.length) }, [
    h('p', { class: 'el-privacy', text: 'No names, initials, record numbers, dates of birth or identifiable images. The case code is the only identifier.' }),
    elDashboard(list), tabs, msg, body,
    h('figcaption', { text: 'Stored in this browser (or this copy of the desktop app) only: nothing is uploaded anywhere. Back it up regularly from the export tab; a backup restores onto another device by merging.' })]);
  if (ELS.tab === 'new') setTimeout(elRefreshDerived, 0);
  return fig;
}
