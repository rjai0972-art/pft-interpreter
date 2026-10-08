// Concatenates the interface parts into dist/ui.js (one closure shared by all parts).
const fs = require('fs'), path = require('path');
const parts = ['ui_1_core.js', 'ui_2_info.js', 'ui_3_trend.js', 'ui_4_learn.js', 'ui_5_bank.js', 'ui_9_boot.js'];
const out = parts.map(f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8')).join('\n');
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist/ui.js'), out);
try { new Function(out); console.log('ui.js', out.length, 'bytes, syntax ok'); } catch (e) { console.error('SYNTAX ERROR in ui.js:', e.message); process.exit(1); }
