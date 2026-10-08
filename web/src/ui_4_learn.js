
/* ========================================================================== Learn
   A reading section: topics from window.PFT_EDU, each ending with the glossary entries that belong to it. */
const EDU = window.PFT_EDU || { topics: {}, groups: [] };

function eduFig(kind) {
  if (kind === 'zscale') return zKey();
  if (kind === 'loopLegend') return loopLegend();
  if (kind === 'loops') {
    return h('div', { class: 'lp-grid learn-loops' }, P.LOOPS.map(l => h('figure', { class: 'lp-tile static', 'data-loop': l[0] }, [loopSvg(l[0]), h('figcaption', {}, [h('span', { class: 'lp-name', text: l[1] }), h('span', { class: 'lp-cap', text: l[2] })])])));
  }
  return null;
}
function eduTable(t) {
  return h('div', { class: 'tbl-wrap' }, [h('table', { class: 'edu-tbl' }, [
    h('thead', {}, [h('tr', {}, t.head.map(x => h('th', { text: x })))]),
    h('tbody', {}, t.rows.map(r => h('tr', {}, r.map((c, i) => h(i === 0 ? 'th' : 'td', { scope: i === 0 ? 'row' : null, text: c })))))])]);
}
function eduTerms(topicId) {
  const keys = Object.keys(GL.terms).filter(k => GL.terms[k].t === topicId && k.indexOf('code.') !== 0 && k.indexOf('test.') !== 0);
  const codes = Object.keys(GL.terms).filter(k => GL.terms[k].t === topicId && k.indexOf('code.') === 0);
  const out = [];
  if (keys.length) {
    out.push(h('h3', { text: 'Terms and measures in this topic' }));
    out.push(h('div', { class: 'terms' }, keys.map(k => {
      const t = GL.terms[k];
      return h('details', { class: 'term', id: 'term-' + k }, [
        h('summary', {}, [h('b', { text: t.n }), t.f && t.f !== t.n ? h('span', { class: 'tf', text: t.f }) : null]),
        h('div', { class: 'tb' }, [t.w ? h('p', { text: t.w }) : null,
          t.r ? h('p', {}, [h('span', { class: 'lbl', text: 'How to read it. ' }), t.r]) : null,
          t.l ? h('p', {}, [h('span', { class: 'lbl', text: 'Watch for. ' }), t.l]) : null])]);
    })));
  }
  if (codes.length) {
    out.push(h('h3', { text: 'Annals ATS 2025 codes used here' }));
    out.push(h('div', { class: 'tbl-wrap' }, [h('table', { class: 'edu-tbl codes-tbl' }, [
      h('thead', {}, [h('tr', {}, ['Code', 'Meaning', 'Detail'].map(x => h('th', { text: x })))]),
      h('tbody', {}, codes.map(k => { const t = GL.terms[k]; return h('tr', {}, [h('th', { scope: 'row' }, [h('span', { class: 'code', text: t.n })]), h('td', { text: t.f }), h('td', { text: t.w || '' })]); }))])]));
  }
  return out;
}
/* The phrase catalog, browsable by section, with the primary sources it anchors to. Source keys live here, never in the report. */
const MODE_LABEL = { automatic: 'automatic', documented_observation: 'documented observation', review: 'clinician review' };
function catalogBrowser() {
  const C = P.CATALOG, out = [];
  out.push(h('p', { class: 'fine', text: 'Catalog ' + C.version + ' (reviewed ' + C.reviewed + '): ' + C.phrases.length + ' findings in ' + Object.keys(C.sections).length + ' sections. "Automatic" wording is offered when the computed measurement states support it; "documented observation" needs the lab or tracing to show it; "clinician review" wording appears only when tapped on the Report step.' }));
  Object.keys(C.sections).forEach(k => {
    const sec = C.sections[k], ph = C.phrases.filter(p => p.sec === k);
    if (!ph.length) return;
    out.push(h('details', { class: 'plain cat-sec', 'data-sec': k }, [
      h('summary', {}, [h('b', { text: sec.title }), h('span', { class: 'tf', text: ph.length + ' findings' })]),
      h('p', { class: 'fine', text: sec.note }),
      h('div', { class: 'terms' }, ph.map(p => h('details', { class: 'term cat-ph', id: 'ph-' + p.id.replace(/\./g, '-') }, [
        h('summary', {}, [h('b', { text: p.label }), h('span', { class: 'tf mode-' + p.mode, text: MODE_LABEL[p.mode] || p.mode })]),
        h('div', { class: 'tb' }, [
          h('p', {}, [h('span', { class: 'lbl', text: 'Concise. ' }), p.t.concise]),
          h('p', {}, [h('span', { class: 'lbl', text: 'Standard. ' }), p.t.standard]),
          h('p', {}, [h('span', { class: 'lbl', text: 'Detailed. ' }), p.t.expanded]),
          p.t.numeric ? h('p', {}, [h('span', { class: 'lbl', text: 'With numbers. ' }), p.t.numeric]) : null,
          p.notes && p.notes.length ? h('p', { class: 'fine' }, [h('span', { class: 'lbl', text: 'Rule. ' }), p.notes.join(' ')]) : null,
          h('p', { class: 'fine', text: 'Condition: ' + p.fact + ' = ' + String(p.value) + (p.group ? ' · exclusive group ' + p.group : '') + ' · sources ' + p.src.join(', ') })
        ])])))
    ]));
  });
  out.push(h('h3', { text: 'Primary sources' }));
  out.push(h('ul', { class: 'srcs' }, C.sources.map(x => h('li', {}, [h('b', { text: x.id + ' ' }), x.title + ' (' + x.year + '). ' + x.role + ' ', h('a', { href: x.url, target: '_blank', rel: 'noopener', text: x.url })]))));
  return out;
}
function eduBlocks(id, topic) {
  const out = [];
  topic.blocks.forEach(b => {
    if (b.terms) { eduTerms(id).forEach(x => out.push(x)); return; }
    if (b.catalog) { catalogBrowser().forEach(x => out.push(x)); return; }
    if (b.src) { out.push(h('h3', { text: 'Sources' })); out.push(h('ul', { class: 'srcs' }, b.src.map(x => h('li', { text: x })))); return; }
    if (b.h) out.push(h('h3', { text: b.h }));
    if (b.p) out.push(h('p', { text: b.p }));
    if (b.ol) out.push(h('ol', { class: 'edu-ol' }, b.ol.map(x => h('li', { text: x }))));
    if (b.ul) out.push(h('ul', { class: 'edu-ul' }, b.ul.map(x => h('li', { text: x }))));
    if (b.table) { out.push(eduTable(b.table)); }
    if (b.note) out.push(h('p', { class: 'fine', text: b.note }));
    if (b.fig) { const f = eduFig(b.fig); if (f) out.push(f); }
  });
  return out;
}
function stepLearn() {
  const topics = EDU.topics;
  if (!topics[learnTopic]) learnTopic = 'basics';
  const t = topics[learnTopic];
  const nav = h('nav', { class: 'learn-nav', id: 'learn-nav', 'aria-label': 'Learn topics' }, EDU.groups.map(g => h('div', { class: 'ln-group' }, [
    h('h3', { text: g.title }),
    h('ul', {}, g.ids.filter(id => topics[id]).map(id => h('li', {}, [h('button', { type: 'button', class: 'ln-btn', 'data-topic': id, 'aria-current': id === learnTopic ? 'true' : null, text: topics[id].title,
      onclick: () => { learnTerm = ''; setMode('learn', { topic: id }); } })])))])));
  const toggle = h('button', { type: 'button', class: 'btn sm learn-toggle', 'aria-expanded': 'false', 'aria-controls': 'learn-nav', text: 'Topics ▾', onclick: () => { const o = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(o)); } });
  const lead = GL.terms['test.' + learnTopic];
  const idx = EDU.groups.reduce((a, g) => a.concat(g.ids), []).filter(id => topics[id]), pos = idx.indexOf(learnTopic);
  const prev = pos > 0 ? idx[pos - 1] : null, next = pos < idx.length - 1 ? idx[pos + 1] : null;
  const article = h('article', { class: 'card learn-body', 'data-topic': learnTopic }, [
    h('div', { class: 'step-head' }, [h('p', { class: 'kicker', text: t.kicker || '' }), h('h2', { text: t.title }), lead && lead.w ? h('p', { class: 'intro', text: lead.w }) : null]),
    eduBlocks(learnTopic, t),
    S.tests[learnTopic] ? h('div', { class: 'learn-go' }, [h('button', { type: 'button', class: 'btn sm', text: 'Go to this test in the current case →', onclick: () => goto(learnTopic) })]) : null,
    h('div', { class: 'nav' }, [
      prev ? h('button', { type: 'button', class: 'btn', text: '← ' + topics[prev].title, onclick: () => setMode('learn', { topic: prev }) }) : h('span'),
      next ? h('button', { type: 'button', class: 'btn primary', text: topics[next].title + ' →', onclick: () => setMode('learn', { topic: next }) }) : null])
  ]);
  $('main').appendChild(h('div', { class: 'learn' }, [h('div', { class: 'learn-side' }, [toggle, nav]), article]));
}
