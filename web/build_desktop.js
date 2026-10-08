// Copies the finished standalone page into ../app/index.html: the file GitHub Pages serves and the desktop app loads.
// The copy never touches the network: the Google Fonts links are removed and the page uses the system font stack.
const fs = require('fs'), path = require('path');
const root = __dirname, dst = path.join(root, '..', 'app');
fs.mkdirSync(dst, { recursive: true });
let html = fs.readFileSync(path.join(root, 'dist', 'PFT_Interpreter_standalone.html'), 'utf8');
const before = html.length;
html = html.replace(/<link\b[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\s*/g, '');
html = html.replace('<title>PFT Interpreter</title>', '<title>PFT Interpreter</title>\n<link rel="icon" type="image/png" href="icon.png">');
if (/fonts\.(googleapis|gstatic)\.com/.test(html)) throw new Error('a Google Fonts reference is still in the page');
fs.writeFileSync(path.join(dst, 'index.html'), html);
console.log('app/index.html', html.length, 'bytes (removed ' + (before - html.length) + ' bytes of font links)');
