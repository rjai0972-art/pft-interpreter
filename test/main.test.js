'use strict';
// Checks the desktop shell's own logic against a stand-in for Electron (see mock-electron.js).
const assert = require('assert'), fs = require('fs'), path = require('path');
const { loadMain } = require('./mock-electron.js');
let pass = 0, fail = 0;
async function t(name, fn) { try { await fn(); pass++; } catch (e) { fail++; console.log('FAIL', name, '\n   ', e && e.message); } }
const rq = (u) => ({ url: u });

(async () => {
  const L = loadMain({ platform: 'linux' });
  await L.whenReady(); await new Promise((r) => setTimeout(r, 20));
  const w = L.calls.windows[0];

  await t('page file is shipped', () => { assert(fs.existsSync(path.join(__dirname, '..', 'app', 'index.html'))); });
  await t('scheme pft is standard and secure', () => {
    const s = L.calls.schemes[0]; assert.strictEqual(s.scheme, 'pft'); assert(s.privileges.standard && s.privileges.secure);
  });
  await t('protocol handler registered for pft', () => { assert.strictEqual(L.calls.protocolHandler.scheme, 'pft'); });
  await t('window loads the app address', () => { assert.strictEqual(w.url, 'pft://app/index.html'); });
  await t('window is locked down', () => {
    const p = w.options.webPreferences;
    assert.strictEqual(p.contextIsolation, true); assert.strictEqual(p.nodeIntegration, false); assert.strictEqual(p.sandbox, true);
    assert.strictEqual(p.spellcheck, false); assert.strictEqual(p.webSecurity, true);
  });
  await t('window shows only when ready', () => { assert(!w.shown); w.ev['ready-to-show'](); assert(w.shown); });
  await t('dev tools only in development', async () => {
    assert.strictEqual(w.options.webPreferences.devTools, true);
    const P = loadMain({ packaged: true, platform: 'linux' }); await P.whenReady(); await new Promise((r) => setTimeout(r, 20));
    assert.strictEqual(P.calls.windows[0].options.webPreferences.devTools, false);
  });

  const handler = L.calls.protocolHandler.fn;
  await t('serves index.html with CSP and no-store', async () => {
    const r = await handler(rq('pft://app/index.html'));
    assert.strictEqual(r.status, 200); assert(/text\/html/.test(r.headers.get('content-type')));
    assert(/default-src 'none'/.test(r.headers.get('content-security-policy'))); assert.strictEqual(r.headers.get('cache-control'), 'no-store');
    const body = await r.text(); assert(/<title>PFT Interpreter<\/title>/.test(body)); assert(body.length > 300000);
  });
  await t('root path serves the page', async () => { const r = await handler(rq('pft://app/')); assert.strictEqual(r.status, 200); });
  await t('missing file is 404', async () => { const r = await handler(rq('pft://app/nope.js')); assert.strictEqual(r.status, 404); });
  await t('path traversal is refused (encoded dots)', async () => {
    for (const u of ['pft://app/%2e%2e/main.js', 'pft://app/..%2fmain.js', 'pft://app/%2e%2e%2f%2e%2e%2fpackage.json', 'pft://app/a/../../main.js']) {
      const r = await handler(rq(u)); assert([403, 404].includes(r.status), u + ' -> ' + r.status);
      const txt = await r.text(); assert(!/require\('electron'\)/.test(txt), 'leaked ' + u);
    }
  });
  await t('other hosts and schemes are refused', async () => {
    assert.strictEqual((await handler(rq('pft://evil/index.html'))).status, 404);
    assert.strictEqual((await handler(rq('https://example.com/'))).status, 404);
    assert.strictEqual((await handler(rq('pft://app/%00'))).status, 400);
    assert.strictEqual((await handler(rq('not a url'))).status, 400);
  });

  await t('new windows never open in the app; https goes to the browser', () => {
    const wc = w.webContents;
    assert.deepStrictEqual(wc.openHandler({ url: 'https://pubmed.ncbi.nlm.nih.gov/1/' }), { action: 'deny' });
    assert.deepStrictEqual(wc.openHandler({ url: 'http://insecure.example/' }), { action: 'deny' });
    assert.deepStrictEqual(wc.openHandler({ url: 'file:///etc/passwd' }), { action: 'deny' });
    assert.deepStrictEqual(wc.openHandler({ url: 'javascript:alert(1)' }), { action: 'deny' });
    assert.deepStrictEqual(L.calls.opened, ['https://pubmed.ncbi.nlm.nih.gov/1/']);
  });
  await t('navigation away from the app is blocked', () => {
    const wc = w.webContents; let prevented = 0; const ev = { preventDefault() { prevented++; } };
    wc.handlers['will-navigate'](ev, 'https://example.com/x'); wc.handlers['will-navigate'](ev, 'file:///C:/x.html');
    assert.strictEqual(prevented, 2);
    wc.handlers['will-navigate'](ev, 'pft://app/index.html'); assert.strictEqual(prevented, 2);
  });
  await t('permissions: clipboard write only', () => {
    let got; L.calls.perm.request(null, 'media', (v) => { got = v; }); assert.strictEqual(got, false);
    L.calls.perm.request(null, 'geolocation', (v) => { got = v; }); assert.strictEqual(got, false);
    L.calls.perm.request(null, 'clipboard-sanitized-write', (v) => { got = v; }); assert.strictEqual(got, true);
    assert.strictEqual(L.calls.perm.check(null, 'notifications'), false);
  });
  await t('downloads get a Save dialog starting in Downloads', () => {
    let opts; const item = { getFilename: () => '../../etc/pft-case-bank.json', setSaveDialogOptions: (o) => { opts = o; } };
    L.sessionListeners['will-download']({}, item);
    assert.strictEqual(path.basename(opts.defaultPath), 'pft-case-bank.json'); assert.strictEqual(opts.title, 'Save file');
  });

  await t('menu has File/Edit/View/Window/Help and print shortcuts', () => {
    const tpl = L.calls.menu.template; const labels = tpl.map((m) => m.label || m.role);
    assert.deepStrictEqual(labels, ['File', 'editMenu', 'View', 'windowMenu', 'help']);
    const file = tpl[0].submenu; assert(file.some((i) => i.accelerator === 'CmdOrCtrl+P')); assert(file.some((i) => i.role === 'quit'));
    const help = tpl[4].submenu; assert(help.some((i) => /About/.test(i.label || '')));
    assert(tpl[2].submenu.some((i) => i.role === 'toggleDevTools'), 'dev menu in development');
  });
  await t('print and PDF go through the page (uses @media print)', async () => {
    const file = L.calls.menu.template[0].submenu;
    file.find((i) => i.accelerator === 'CmdOrCtrl+P').click(); assert.strictEqual(w.webContents.printed.length, 1); assert.strictEqual(w.webContents.printed[0].printBackground, true);
    await file.find((i) => i.accelerator === 'CmdOrCtrl+Shift+P').click(); assert.strictEqual(w.webContents.pdfs, 1);
    assert.strictEqual(w.webContents.pdfOpts.preferCSSPageSize, true); assert(L.calls.dialogs.includes('save'));
  });
  await t('mac menu leads with the app menu and has no extra About item', () => {
    const M = loadMain({ platform: 'darwin', mac: true, packaged: true }); M.whenReady();
    return new Promise((r) => setTimeout(r, 20)).then(() => {
      const tpl = M.calls.menu.template; assert.strictEqual(tpl[0].label, 'PFT Interpreter'); assert(tpl[0].submenu.some((i) => i.role === 'about'));
      assert(!tpl.find((m) => m.label === 'View').submenu.some((i) => i.role === 'toggleDevTools'), 'no dev tools when packaged');
      assert(!tpl[tpl.length - 1].submenu.some((i) => /About/.test(i.label || '')));
      assert.strictEqual(M.calls.windows[0].options.icon, undefined);
    });
  });

  await t('window state is saved on close and restored', async () => {
    w.ev['close']();
    const f = path.join(L.userData, 'window-state.json'); const s = JSON.parse(fs.readFileSync(f, 'utf8'));
    assert.deepStrictEqual([s.x, s.y, s.width, s.height, s.maximized], [50, 60, 1111, 777, false]);
    const L2 = loadMain({ platform: 'linux' });
    fs.writeFileSync(path.join(L2.userData, 'window-state.json'), JSON.stringify({ x: 70, y: 80, width: 1000, height: 700, maximized: true }));
    await L2.whenReady(); await new Promise((r) => setTimeout(r, 20));
    const o = L2.calls.windows[0].options; assert.deepStrictEqual([o.x, o.y, o.width, o.height], [70, 80, 1000, 700]); assert(L2.calls.windows[0].maximizedFlag);
  });
  await t('bad or off-screen window state falls back safely', async () => {
    const A = loadMain({ platform: 'linux' }); fs.writeFileSync(path.join(A.userData, 'window-state.json'), '{not json');
    await A.whenReady(); await new Promise((r) => setTimeout(r, 20));
    let o = A.calls.windows[0].options; assert.strictEqual(o.width, 1280); assert.strictEqual(o.x, undefined);
    const B = loadMain({ platform: 'linux' }); fs.writeFileSync(path.join(B.userData, 'window-state.json'), JSON.stringify({ x: 9000, y: 9000, width: 99999, height: 1 }));
    await B.whenReady(); await new Promise((r) => setTimeout(r, 20));
    o = B.calls.windows[0].options; assert.strictEqual(o.x, undefined); assert.strictEqual(o.width, 6000); assert.strictEqual(o.height, 520);
  });
  await t('a second copy of the app quits instead of opening twice', () => { const N = loadMain({ noLock: true, platform: 'linux' }); assert.strictEqual(N.calls.quits, 1); });
  await t('second-instance focuses the existing window', () => { L.listeners['second-instance'](); assert(w.focused); });
  await t('closing the last window quits on Windows/Linux only', () => {
    const before = L.calls.quits; L.listeners['window-all-closed'](); assert.strictEqual(L.calls.quits, before + 1);
    const M = loadMain({ platform: 'darwin', mac: true }); M.listeners['window-all-closed'](); assert.strictEqual(M.calls.quits, 0);
  });

  await t('no self-test unless asked for', () => { assert.strictEqual(w.webContents.handlers['did-finish-load'], undefined); });
  await t('self-test mode loads, checks, writes a result and exits 0', async () => {
    const out = path.join(L.userData, 'smoke.json'); process.env.PFT_SMOKE_OUT = out;
    const S = loadMain({ platform: 'linux' }); delete process.env.PFT_SMOKE_OUT;
    await S.whenReady(); await new Promise((r) => setTimeout(r, 20));
    await S.calls.windows[0].webContents.handlers['did-finish-load']();
    const j = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.strictEqual(j.ok, true); assert.strictEqual(j.url, 'pft://app/index.html'); assert(/^blocked by policy/.test(j.externalRequest));
    assert.strictEqual(j.pdfHeader, '%PDF-'); assert.strictEqual(S.calls.exitCode, 0);
    assert(fs.existsSync(path.join(S.userData, 'window-state.json')), 'window state saved on the way out');
  });

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
