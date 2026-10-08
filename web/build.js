// Builds dist/engine.js, the page fragment (for Artifact) and a standalone HTML document.
const fs = require('fs'), path = require('path');
require('./build_engine.js');
require('./build_ui.js');
const rd = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const safe = (js) => js.replace(/<\/script/gi, '<\\/script');
const tpl = rd('src/template.html');
const frag = tpl
  .replace('/*CSS*/', () => rd('src/style.css'))
  .replace('/*ENGINE*/', () => safe(rd('dist/engine.js')))
  .replace('/*GLOSSARY*/', () => safe(rd('src/glossary.js')))
  .replace('/*EDUCATION*/', () => safe(rd('src/education.js')))
  .replace('/*EXAMPLES*/', () => safe(rd('src/examples.js')))
  .replace('/*UI*/', () => safe(rd('dist/ui.js')));
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist/pft_interpreter.page.html'), frag);
const standalone = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<meta name="color-scheme" content="light dark">\n' + frag.replace(/^<title>/, '<title>') + '\n</head>\n<body>\n</body>\n</html>\n';
// The fragment starts with <title>, <link>, <style> (valid in head) followed by body content. Split for a proper document.
const i = frag.indexOf('</style>') + '</style>'.length;
const headPart = frag.slice(0, i), bodyPart = frag.slice(i);
const doc = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="color-scheme" content="light dark">\n' +
  headPart + '\n</head>\n<body>\n' + bodyPart + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(__dirname, 'dist/PFT_Interpreter_standalone.html'), doc);
console.log('fragment', frag.length, 'standalone', doc.length);
