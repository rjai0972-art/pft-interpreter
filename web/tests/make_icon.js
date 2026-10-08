const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..', 'desktop');
(async () => {
  const svg = fs.readFileSync(path.join(D, 'build/icon.svg'), 'utf8');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  await p.setContent('<html><body style="margin:0;background:transparent">' + svg + '</body></html>');
  await p.screenshot({ path: path.join(D, 'build/icon.png'), omitBackground: true, clip: { x: 0, y: 0, width: 1024, height: 1024 } });
  await b.close();
})();
