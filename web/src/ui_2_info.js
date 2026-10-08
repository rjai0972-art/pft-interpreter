
/* ================================================================== (i) info pop-ups
   Any element with data-gloss="<key>" opens a pop-up built from PFT_GLOSS.terms[key].
   Hover or keyboard focus previews it; a click or tap pins it; Esc, an outside click or another pin closes it. */
const GL = window.PFT_GLOSS || { terms: {}, field: {} };
function glossKey(mod, id) { const k = GL.field[mod + '.' + id]; return (k && GL.terms[k]) ? k : ''; }
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
function popBuild(key) {
  const t = GL.terms[key]; const box = popBox();
  box.textContent = '';
  box.appendChild(h('div', { class: 'pop-h' }, [h('b', { text: t.n }), t.f && t.f !== t.n ? h('span', { text: t.f }) : null]));
  if (t.w) box.appendChild(h('p', { class: 'pop-w', text: t.w }));
  const dl = h('dl', {});
  if (t.r) { dl.appendChild(h('dt', { text: 'How to read it' })); dl.appendChild(h('dd', { text: t.r })); }
  if (t.l) { dl.appendChild(h('dt', { text: 'Watch for' })); dl.appendChild(h('dd', { text: t.l })); }
  if (dl.childNodes.length) box.appendChild(dl);
  if (t.t) box.appendChild(h('button', { type: 'button', class: 'pop-more', 'data-learn': t.t, text: 'Learn more →', onclick: () => openLearn(t.t, key.indexOf('code.') === 0 ? '' : key) }));
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
  const key = el.getAttribute('data-gloss'); if (!GL.terms[key]) return;
  clearTimeout(popShowT); clearTimeout(popHideT);
  const box = popBox();
  if (popFor && popFor !== el) popFor.setAttribute('aria-expanded', 'false');
  if (popFor !== el || box.hidden) popBuild(key);
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
  const gl = (n) => (n && n.closest) ? n.closest('[data-gloss]') : null;
  const inPop = (n) => !!(n && n.closest && n.closest('#pop'));
  document.addEventListener('mouseover', (e) => {
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
  document.addEventListener('focusin', (e) => { const g = gl(e.target); if (g && !popPinned) popOpen(g, false); });
  document.addEventListener('focusout', (e) => {
    const g = gl(e.target); if (!g || popPinned) return;
    const to = e.relatedTarget; if (inPop(to)) return;
    popSchedHide();
  });
  document.addEventListener('click', (e) => {
    const g = gl(e.target);
    if (g) {
      e.preventDefault();
      if (popFor === g && popPinned) closePop(); else popOpen(g, true, e.detail === 0);
      return;
    }
    if (!inPop(e.target)) closePop();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && popFor) { e.stopPropagation(); closePop(true); } });
  let tick = null;
  const again = () => { if (tick) return; tick = requestAnimationFrame(() => { tick = null; popPlace(); }); };
  window.addEventListener('scroll', again, { passive: true });
  window.addEventListener('resize', again);
}
