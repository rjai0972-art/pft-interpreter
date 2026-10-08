// Concatenate the engine parts into one IIFE (dist/engine.js)
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'src');
const parts = ['engine_1_core.js', 'engine_1a_catalog.js', 'engine_1b_phrases.js', 'engine_1c_differentials.js', 'engine_2_facts.js', 'engine_3_sections.js', 'engine_4_report.js'];
const out = parts.map(p => fs.readFileSync(path.join(dir, p), 'utf8')).join('\n');
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'engine.js'), out);
console.log('engine.js', out.length, 'bytes');
