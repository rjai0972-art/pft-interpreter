// Serves the desktop page exactly as the desktop app will (same CSP header) so the browser suites can prove
// nothing in the app is blocked by it. Violations are reported to /__csp and printed.
const http = require('http'), fs = require('fs'), path = require('path');
const { loadMain } = require('../desktop/test/mock-electron.js');
const CSP = loadMain({ platform: 'linux' }).main.CSP + "; report-uri /__csp";
const page = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'app', 'index.html'));
const viol = [];
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/__csp') { let b = ''; req.on('data', (d) => { b += d; }); req.on('end', () => { viol.push(b); console.log('CSP VIOLATION', b.slice(0, 300)); res.writeHead(204); res.end(); }); return; }
  if (req.url === '/__violations') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(viol)); return; }
  if (req.url === '/' || req.url === '/index.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': CSP, 'cache-control': 'no-store' }); res.end(page); return; }
  res.writeHead(404); res.end('nope');
});
srv.listen(+process.env.PORT || 8765, '127.0.0.1', () => console.log('csp server up'));
