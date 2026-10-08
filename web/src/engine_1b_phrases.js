/* ==========================================================================
   PFT Interpreter engine — part 1b: phrase-catalog helpers
   The catalog (engine_1a_catalog.js, generated from catalog/pft_phrases.json)
   is matched against the normalized findings object F with an exact equality
   test. Unknown facts fail. A template is rendered only when every placeholder
   its variant requires is present; otherwise the next plainer variant is used.
   No value is ever invented, and no placeholder is ever printed.
   ========================================================================== */

const STYLE_FALLBACK = { numeric: ['numeric', 'standard', 'concise'], expanded: ['expanded', 'standard', 'concise'], standard: ['standard', 'concise'], concise: ['concise', 'standard'] };

function catPhrase(id) { return CAT_BY_ID[id] || null; }

/* Strict equality against the findings map: booleans must be booleans, strings strings. "False" is not false. */
function factMatches(F, fact, value) {
  if (!F || !Object.prototype.hasOwnProperty.call(F, fact)) return false;
  const v = F[fact];
  if (v === null || v === undefined) return false;
  if (typeof v !== typeof value) return false;
  return v === value;
}

function fillTemplate(tpl, vals) {
  let missing = false;
  const out = tpl.replace(/\{([A-Za-z0-9_]+)\}/g, (m, k) => {
    const v = vals ? vals[k] : undefined;
    if (v === undefined || v === null || v === '') { missing = true; return m; }
    return String(v);
  });
  return missing ? null : out;
}

/* Render one catalog phrase at the requested wording level. Returns { id, variant, text } or null. */
function phrase(id, style, vals) {
  const p = catPhrase(id); if (!p) return null;
  const order = STYLE_FALLBACK[style] || STYLE_FALLBACK.standard;
  for (let i = 0; i < order.length; i++) {
    const k = order[i], tpl = p.t[k]; if (!tpl) continue;
    const req = p.req[k] || [];
    if (req.some(r => !vals || vals[r] === undefined || vals[r] === null || vals[r] === '')) continue;
    const text = fillTemplate(tpl, vals);
    if (text !== null) return { id: id, variant: k, text: text };
  }
  return null;
}
const ptext = (id, style, vals) => { const r = phrase(id, style, vals); return r ? r.text : ''; };

/* All catalog entries whose condition holds in F. Mode filter: 'automatic' | 'documented_observation' | 'review' | undefined (all). */
function eligiblePhrases(F, mode) {
  return CATALOG.phrases.filter(p => (!mode || p.mode === mode) && factMatches(F, p.fact, p.value));
}

/* Apply the catalog's exclusive groups: keep the first phrase in each group (callers pass phrases in priority order). */
function dedupeGroups(list) {
  const seen = {}; const out = [];
  list.forEach(p => { if (p.group) { if (seen[p.group]) return; seen[p.group] = true; } out.push(p); });
  return out;
}
