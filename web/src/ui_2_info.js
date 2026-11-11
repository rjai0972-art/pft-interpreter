
/* ================================================================== (i) info pop-ups
   Any element with data-gloss="<key>" opens a pop-up built from PFT_GLOSS.terms[key].
   Hover or keyboard focus previews it; a click or tap pins it; Esc, an outside click or another pin closes it. */
const GL = window.PFT_GLOSS || { terms: {}, field: {} };
function glossKey(mod, id) { const k = GL.field[mod + '.' + id]; return (k && GL.terms[k]) ? k : ''; }
/* v8.7: the hover definitions. The ICU terms (PFT_TERMS) join the glossary under 't.<id>'; any element with data-tip (and an
   optional data-tip-title) shows free text the same way; a native title inside the page becomes one the first time it is hovered. */
const TM = window.PFT_TERMS || { terms: {}, ICU: [] };
Object.keys(TM.terms).forEach(k => { const t = TM.terms[k]; GL.terms['t.' + k] = { n: t.n, f: t.f || '', w: t.w, t: t.t }; });
/* a word that carries its definition: term('pms') or term('pms', 'mean systemic pressure') */
function term(key, text) {
  const t = TM.terms[key]; if (!t) return document.createTextNode(text || key);
  return h('span', { class: 'gt', 'data-gloss': 't.' + key, tabindex: '0', role: 'button', 'aria-label': (text || t.n) + ': definition', text: text || t.n });
}
/* free text on hover: tip(el, 'text', 'Title') marks an element; tipI('text', 'Title') makes a small (i) */
function tip(el, text, title) { if (el && text) { el.setAttribute('data-tip', text); if (title) el.setAttribute('data-tip-title', title); } return el; }
function tipI(text, title) { return h('button', { type: 'button', class: 'ib', 'data-tip': text, 'data-tip-title': title || null, 'aria-label': (title ? title + ': ' : '') + text, text: 'i' }); }
/* the matcher for running text: longest spelling first; a spelling with a capital is exact, a lower-case one matches any case */
const TERM_RE = (function () {
  const map = {}, alts = [];
  Object.keys(TM.terms).forEach(k => (TM.terms[k].m || []).forEach(m => { map[m.toLowerCase()] = { key: k, exact: m !== m.toLowerCase() ? m : null }; alts.push(m); }));
  alts.sort((a, b) => b.length - a.length);
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return { map: map, re: alts.length ? new RegExp('(^|[^A-Za-z0-9])(' + alts.map(esc).join('|') + ')(?![A-Za-z0-9])', 'gi') : null };
})();
/* a long caption under a figure is held to one line; the whole of it is in the hover (and on focus, and on a tap) */
function compactCaptions(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll('figure > figcaption').forEach(c => {
    const tx = c.textContent || ''; if (tx.length < 150 || c.hasAttribute('data-tip') || c.children.length) return;
    c.classList.add('cap-clamp'); c.setAttribute('tabindex', '0'); tip(c, tx, 'About this figure');
  });
}
/* wrap the first mention of each term in the reading text of a topic (paragraphs, lists, table cells — not figures, headings or controls) */
function annotateTerms(rootEl, catId) {
  if (!TERM_RE.re || !rootEl) return 0;
  const seen = {}; let n = 0;
  const blocks = rootEl.querySelectorAll('p, li, td, dd');
  for (let b = 0; b < blocks.length; b++) {
    const el = blocks[b];
    if (el.closest('figure, .nav, .srcs, .edu-links, button, a, label, summary, svg, [data-noterms], .step-head .kicker')) continue;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [];
    while (walker.nextNode()) { const nd = walker.currentNode; if (nd.parentNode && nd.parentNode.closest && !nd.parentNode.closest('.gt, button, a, [data-gloss], [data-tip]')) nodes.push(nd); }
    nodes.forEach(nd => {
      const txt = nd.nodeValue; if (!txt || txt.length < 3) return;
      TERM_RE.re.lastIndex = 0; let m, last = 0, frag = null;
      while ((m = TERM_RE.re.exec(txt))) {
        const hit = TERM_RE.map[m[2].toLowerCase()]; if (!hit) continue;
        const T = TM.terms[hit.key];
        if (seen[hit.key] || (hit.exact && hit.exact !== m[2]) || (T.c && T.c.indexOf(catId) < 0) || (!T.c && TM.ICU.indexOf(catId) < 0)) continue;
        seen[hit.key] = true; n++;
        const start = m.index + m[1].length;
        if (!frag) frag = document.createDocumentFragment();
        frag.appendChild(document.createTextNode(txt.slice(last, start)));
        frag.appendChild(term(hit.key, m[2]));
        last = start + m[2].length;
      }
      if (frag) { frag.appendChild(document.createTextNode(txt.slice(last))); nd.parentNode.replaceChild(frag, nd); }
    });
  }
  return n;
}
function info(key) {
  const t = key && GL.terms[key]; if (!t) return null;
  return h('button', { type: 'button', class: 'ib', 'data-gloss': key, 'aria-label': 'About ' + t.n + ': ' + t.f, 'aria-haspopup': 'dialog', 'aria-expanded': 'false', text: 'i' });
}
function codeChip(c) {
  const t = GL.terms['code.' + c];
  if (!t) return h('span', { class: 'code', text: c });
  return h('button', { type: 'button', class: 'code code-btn', 'data-gloss': 'code.' + c, 'data-code': c, 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-label': 'Code ' + c + ': ' + t.f, text: c });
}

let popEl = null, popFor = null, popPinned = false, popShowT = null, popHideT = null;
function popBox() { if (!popEl) popEl = $('pop'); return popEl; }
function popBuildTip(el) {
  const box = popBox(), title = el.getAttribute('data-tip-title'), text = el.getAttribute('data-tip');
  box.textContent = '';
  if (title) box.appendChild(h('div', { class: 'pop-h' }, [h('b', { text: title })]));
  String(text).split('\n').forEach(line => { if (line) box.appendChild(h('p', { class: 'pop-w', text: line })); });
  box.setAttribute('aria-label', title || 'Note');
}
function popBuild(key) {
  const t = GL.terms[key]; const box = popBox();
  box.textContent = '';
  box.appendChild(h('div', { class: 'pop-h' }, [h('b', { text: t.n }), t.f && t.f !== t.n ? h('span', { text: t.f }) : null]));
  if (t.w) box.appendChild(h('p', { class: 'pop-w', text: t.w }));
  const dl = h('dl', {});
  if (t.r) { dl.appendChild(h('dt', { text: 'How to read it' })); dl.appendChild(h('dd', { text: t.r })); }
  if (t.l) { dl.appendChild(h('dt', { text: 'Watch for' })); dl.appendChild(h('dd', { text: t.l })); }
  if (dl.childNodes.length) box.appendChild(dl);
  if (t.t && !(key.indexOf('t.') === 0 && mode === 'learn' && learnTopic === t.t)) box.appendChild(h('button', { type: 'button', class: 'pop-more', 'data-learn': t.t, text: 'Learn more →', onclick: () => openLearn(t.t, key.indexOf('code.') === 0 || key.indexOf('t.') === 0 ? '' : key) }));
  box.setAttribute('aria-label', t.n + ': ' + t.f);
}
function popPlace() {
  const box = popBox(); if (!popFor || box.hidden) return;
  const r = popFor.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const w = box.offsetWidth, hgt = box.offsetHeight;
  let left = r.left + r.width / 2 - w / 2; left = Math.max(8, Math.min(left, vw - w - 8));
  let top = r.bottom + 8;
  if (top + hgt > vh - 8 && r.top - 8 - hgt >= 8) top = r.top - 8 - hgt;
  top = Math.max(8, Math.min(top, vh - hgt - 8));
  box.style.left = Math.round(left) + 'px'; box.style.top = Math.round(top) + 'px';
}
function popOpen(el, pin, focusIn) {
  const key = el.getAttribute('data-gloss'), isTip = !key && el.hasAttribute('data-tip'); if (!isTip && !GL.terms[key]) return;
  clearTimeout(popShowT); clearTimeout(popHideT);
  const box = popBox();
  if (popFor && popFor !== el) popFor.setAttribute('aria-expanded', 'false');
  if (popFor !== el || box.hidden) { if (isTip) popBuildTip(el); else popBuild(key); }
  box.classList.toggle('tip', isTip);
  popFor = el; popPinned = !!pin;
  box.hidden = false; box.classList.toggle('pinned', !!pin);
  el.setAttribute('aria-expanded', 'true');
  popPlace();
  if (pin && focusIn) { box.setAttribute('tabindex', '-1'); box.focus({ preventScroll: true }); }
}
function closePop(refocus) {
  clearTimeout(popShowT); clearTimeout(popHideT);
  const box = popBox(); if (!box) return;
  const was = popFor;
  if (!box.hidden) box.hidden = true;
  if (was) { was.setAttribute('aria-expanded', 'false'); if (refocus && was.isConnected) { try { was.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } }
  popFor = null; popPinned = false;
}
function popSchedHide() { clearTimeout(popHideT); popHideT = setTimeout(() => { if (!popPinned) closePop(); }, 220); }
function wirePop() {
  const gl = (n) => (n && n.closest) ? n.closest('[data-gloss], [data-tip]') : null;
  const inPop = (n) => !!(n && n.closest && n.closest('#pop'));
  /* a native title inside the page (not the header) is adopted as a tip, so every explanation looks and behaves the same */
  const adopt = (n) => { const el = (n && n.closest) ? n.closest('#main [title]') : null; if (el && !el.hasAttribute('data-gloss') && !el.closest('svg')) { const tx = el.getAttribute('title'); el.removeAttribute('title'); if (tx && !el.hasAttribute('data-tip')) el.setAttribute('data-tip', tx); } };
  /* a tip on something that is itself a control (a slider's label, a button, a tile) previews on hover and focus but never swallows the click */
  const passive = (g) => !g.hasAttribute('data-gloss') && (g.matches('label, button:not(.ib), a, input, select, [role="link"], [role="radio"], [role="tab"]') || !!g.querySelector('input, select, button, a'));
  document.addEventListener('mouseover', (e) => {
    adopt(e.target);
    const g = gl(e.target);
    if (g) { clearTimeout(popHideT); if (popFor === g || popPinned) return; clearTimeout(popShowT); popShowT = setTimeout(() => popOpen(g, false), 140); }
    else if (inPop(e.target)) clearTimeout(popHideT);
  });
  document.addEventListener('mouseout', (e) => {
    const g = gl(e.target), inside = inPop(e.target);
    if (!g && !inside) return;
    const to = e.relatedTarget;
    if (to && (gl(to) === g && g || (inPop(to)))) return;
    clearTimeout(popShowT);
    if (!popPinned) popSchedHide();
  });
  document.addEventListener('focusin', (e) => { adopt(e.target); const g = gl(e.target); if (g && !popPinned) popOpen(g, false); });
  document.addEventListener('focusout', (e) => {
    const g = gl(e.target); if (!g || popPinned) return;
    const to = e.relatedTarget; if (inPop(to)) return;
    popSchedHide();
  });
  document.addEventListener('click', (e) => {
    const g = gl(e.target);
    if (g && passive(g)) { if (popPinned) closePop(); return; }
    if (g) {
      e.preventDefault();
      if (popFor === g && popPinned) closePop(); else popOpen(g, true, e.detail === 0);
      return;
    }
    if (!inPop(e.target)) closePop();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popFor) { e.stopPropagation(); closePop(true); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('gt')) { e.preventDefault(); if (popFor === e.target && popPinned) closePop(); else popOpen(e.target, true, false); }
  });
  let tick = null;
  const again = () => { if (tick) return; tick = requestAnimationFrame(() => { tick = null; popPlace(); }); };
  window.addEventListener('scroll', again, { passive: true });
  window.addEventListener('resize', again);
}
