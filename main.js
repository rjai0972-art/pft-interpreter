'use strict';
/* PFT Interpreter desktop shell.
   The whole app is one offline page (app/index.html). This file only gives it a window, a stable address for its
   stored data, a menu, printing and a few guard rails. Nothing here talks to the network. */
const { app, BrowserWindow, Menu, shell, dialog, protocol, session, nativeTheme, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const SCHEME = 'pft';
const HOST = 'app';
const APP_DIR = path.join(__dirname, 'app');
const START_URL = SCHEME + '://' + HOST + '/index.html';
const IS_MAC = process.platform === 'darwin';

/* The page ships its own scripts and styles inline, so those are allowed; everything else is shut. No network. */
const CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "base-uri 'none'",
  "form-action 'none'"
].join('; ');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};

/* A fixed, standard, secure origin (pft://app) so the case bank in local storage stays put wherever the app is installed.
   Must be registered before the app is ready. */
protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

/* Self-test used by the build machines: when PFT_SMOKE_OUT names a file, the app loads its page, checks a few things,
   writes the result there and quits. It does nothing at all otherwise. */
const SMOKE_OUT = process.env.PFT_SMOKE_OUT || '';

let win = null;

/* ------------------------------------------------------------------ files served to the page */
function resolveAppFile(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch (e) { return { status: 400 }; }
  if (u.protocol !== SCHEME + ':' || u.hostname !== HOST) return { status: 404 };
  let rel;
  try { rel = decodeURIComponent(u.pathname); } catch (e) { return { status: 400 }; }
  if (rel.indexOf('\0') !== -1) return { status: 400 };
  if (rel === '' || rel === '/') rel = '/index.html';
  const file = path.resolve(APP_DIR, '.' + rel);
  if (file !== APP_DIR && file.indexOf(APP_DIR + path.sep) !== 0) return { status: 403 };
  return { status: 200, file: file };
}

async function serveApp(request) {
  const r = resolveAppFile(request.url);
  if (r.status !== 200) return new Response('Not allowed', { status: r.status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  try {
    const data = await fs.promises.readFile(r.file);
    return new Response(data, {
      status: 200,
      headers: {
        'content-type': MIME[path.extname(r.file).toLowerCase()] || 'application/octet-stream',
        'content-security-policy': CSP,
        'x-content-type-options': 'nosniff',
        'cache-control': 'no-store'
      }
    });
  } catch (e) {
    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
}

function isAppUrl(url) { return typeof url === 'string' && url.indexOf(SCHEME + '://' + HOST + '/') === 0; }

/* Links that leave the app open in the normal browser, and only if they are plain https. */
function openExternalSafe(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'https:') { shell.openExternal(u.toString()); return true; }
  } catch (e) { /* not a URL */ }
  return false;
}

/* ------------------------------------------------------------------ window size and place */
function stateFile() { return path.join(app.getPath('userData'), 'window-state.json'); }
function clampNum(v, lo, hi, dflt) { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : dflt; }
function onSomeDisplay(b) {
  try {
    return screen.getAllDisplays().some(function (d) {
      const w = d.workArea;
      return b.x < w.x + w.width - 40 && b.x + b.width > w.x + 40 && b.y >= w.y - 10 && b.y < w.y + w.height - 40;
    });
  } catch (e) { return false; }
}
function loadWindowState() {
  const out = { width: 1280, height: 860, maximized: false };
  try {
    const s = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    out.width = clampNum(s.width, 420, 6000, out.width);
    out.height = clampNum(s.height, 520, 4000, out.height);
    out.maximized = !!s.maximized;
    if (Number.isFinite(s.x) && Number.isFinite(s.y) && onSomeDisplay({ x: s.x, y: s.y, width: out.width, height: out.height })) { out.x = s.x; out.y = s.y; }
  } catch (e) { /* first run, or an unreadable file: use the defaults */ }
  return out;
}
function saveWindowState() {
  if (!win || win.isDestroyed()) return;
  try {
    const b = win.getNormalBounds();
    fs.writeFileSync(stateFile(), JSON.stringify({ x: b.x, y: b.y, width: b.width, height: b.height, maximized: win.isMaximized() }));
  } catch (e) { /* not worth interrupting the user */ }
}

/* ------------------------------------------------------------------ printing */
function printCurrent() { if (win && !win.isDestroyed()) win.webContents.print({ printBackground: true }); }
async function savePdf() {
  if (!win || win.isDestroyed()) return;
  try {
    const data = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });
    const r = await dialog.showSaveDialog(win, {
      title: 'Save as PDF',
      defaultPath: path.join(app.getPath('documents'), 'PFT report.pdf'),
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (!r.canceled && r.filePath) await fs.promises.writeFile(r.filePath, data);
  } catch (e) {
    dialog.showErrorBox('Could not save the PDF', String(e && e.message ? e.message : e));
  }
}

/* ------------------------------------------------------------------ menu */
function showStorageInfo() {
  dialog.showMessageBox(win || undefined, {
    type: 'info',
    title: 'Where your data is kept',
    message: 'Everything stays on this computer.',
    detail: 'The case bank, review notes and ratings are stored in:\n\n' + app.getPath('userData') +
      '\n\nNothing is sent anywhere. Use Case bank > Export to keep a backup file, especially before moving to a new computer or clearing app data.',
    buttons: ['OK', 'Open that folder'],
    defaultId: 0
  }).then(function (r) { if (r && r.response === 1) shell.openPath(app.getPath('userData')); }).catch(function () { /* ignore */ });
}
function showAbout() {
  dialog.showMessageBox(win || undefined, {
    type: 'info',
    title: 'About PFT Interpreter',
    message: 'PFT Interpreter ' + app.getVersion(),
    detail: 'Pulmonary function test interpretation using the ERS/ATS 2022 z-score and lower-limit-of-normal approach, ' +
      'with Annals ATS 2025 phrasing and GLI reference equations.\n\nRuns fully offline.',
    buttons: ['OK']
  }).catch(function () { /* ignore */ });
}
function buildMenu() {
  const template = [];
  if (IS_MAC) {
    template.push({ label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'services' }, { type: 'separator' },
      { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] });
  }
  template.push({ label: 'File', submenu: [
    { label: 'Print…', accelerator: 'CmdOrCtrl+P', click: printCurrent },
    { label: 'Save as PDF…', accelerator: 'CmdOrCtrl+Shift+P', click: savePdf },
    { type: 'separator' },
    IS_MAC ? { role: 'close' } : { role: 'quit' }
  ] });
  template.push({ role: 'editMenu' });
  const view = [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }];
  if (!app.isPackaged) view.push({ type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' });
  template.push({ label: 'View', submenu: view });
  template.push({ role: 'windowMenu' });
  const help = [{ label: 'Where is my data kept?', click: showStorageInfo }];
  if (!IS_MAC) help.push({ type: 'separator' }, { label: 'About PFT Interpreter', click: showAbout });
  template.push({ role: 'help', submenu: help });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ------------------------------------------------------------------ self-test (build machines only) */
function runSmoke(w) {
  const out = { platform: process.platform, arch: process.arch, electron: process.versions.electron, chrome: process.versions.chrome,
    packaged: app.isPackaged, windowStateFileBefore: fs.existsSync(stateFile()) };
  let done = false;
  function finish(code) {
    if (done) return;
    done = true;
    try { fs.writeFileSync(SMOKE_OUT, JSON.stringify(out, null, 2)); } catch (e) { /* nothing more can be done */ }
    saveWindowState();
    app.exit(code);
  }
  setTimeout(function () { out.error = out.error || 'timed out'; finish(2); }, 90000);
  w.webContents.on('did-finish-load', async function () {
    try {
      const wc = w.webContents;
      out.url = wc.getURL();
      out.page = await wc.executeJavaScript('(function(){' +
        "var r={title:document.title,h1:(document.querySelector('h1')||{}).textContent||'',tiles:document.querySelectorAll('.tgrid > *').length," +
        "origin:location.origin,secureContext:window.isSecureContext,engine:typeof window.PFT,education:typeof window.PFT_EDU};" +
        "try{var k='pft.smoke',prev=localStorage.getItem(k);localStorage.setItem(k,String(Date.now()));r.storagePrevious=prev;r.storageOk=true;}" +
        "catch(e){r.storageOk=false;r.storageError=String(e);}" +
        'return r;})()');
      out.externalRequest = await wc.executeJavaScript("new Promise(function(res){" +
        "document.addEventListener('securitypolicyviolation',function(e){res('blocked by policy: '+e.violatedDirective);},{once:true});" +
        "fetch('https://example.com/',{mode:'no-cors'}).then(function(){res('ALLOWED');},function(){setTimeout(function(){res('failed without a policy event');},800);});})");
      await wc.executeJavaScript("(function(){var b=document.querySelector('.ex');if(b)b.click();return !!b;})()");
      await new Promise(function (r) { setTimeout(r, 1200); });
      out.reportShown = await wc.executeJavaScript("!!document.querySelector('#doc')");
      out.interpretationLines = await wc.executeJavaScript("document.querySelectorAll('#doc .interp li').length");
      const pdf = await wc.printToPDF({ printBackground: true, preferCSSPageSize: true });
      out.pdfBytes = pdf.length;
      out.pdfHeader = pdf.slice(0, 5).toString();
      out.ok = out.url === START_URL && !!out.page && out.page.tiles > 0 && out.page.storageOk === true &&
        /^blocked by policy/.test(out.externalRequest) && out.reportShown === true && out.interpretationLines > 0 && out.pdfHeader === '%PDF-';
    } catch (e) { out.error = String((e && e.stack) || e); }
    finish(out.ok ? 0 : 1);
  });
}

/* ------------------------------------------------------------------ window */
function createWindow() {
  const st = loadWindowState();
  const opts = {
    width: st.width, height: st.height, minWidth: 420, minHeight: 520, show: false,
    title: 'PFT Interpreter',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0D171C' : '#EDF1F2',
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false,
      webSecurity: true, allowRunningInsecureContent: false, devTools: !app.isPackaged
    }
  };
  if (st.x !== undefined) { opts.x = st.x; opts.y = st.y; }
  if (!IS_MAC && fs.existsSync(path.join(APP_DIR, 'icon.png'))) opts.icon = path.join(APP_DIR, 'icon.png');
  win = new BrowserWindow(opts);
  if (st.maximized) win.maximize();
  win.once('ready-to-show', function () { win.show(); });
  win.on('close', saveWindowState);
  win.on('closed', function () { win = null; });

  win.webContents.setWindowOpenHandler(function (details) { openExternalSafe(details.url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', function (event, url) {
    if (!isAppUrl(url)) { event.preventDefault(); openExternalSafe(url); }
  });
  win.webContents.on('did-fail-load', function (_e, code, desc, url, isMainFrame) {
    if (isMainFrame && code !== -3) dialog.showErrorBox('PFT Interpreter could not load', desc + ' (' + code + ')\n' + url);
  });
  if (SMOKE_OUT) runSmoke(win);
  win.loadURL(START_URL);
}

function hardenSession() {
  const ses = session.defaultSession;
  // Only copying text to the clipboard is allowed; no camera, location, notifications, and so on.
  ses.setPermissionRequestHandler(function (_wc, permission, callback) { callback(permission === 'clipboard-sanitized-write'); });
  ses.setPermissionCheckHandler(function (_wc, permission) { return permission === 'clipboard-sanitized-write'; });
  // Exports (case bank, CSV) are saved through a normal Save dialog that starts in Downloads.
  ses.on('will-download', function (_event, item) {
    const name = path.basename(item.getFilename() || 'download');
    item.setSaveDialogOptions({ title: 'Save file', defaultPath: path.join(app.getPath('downloads'), name) });
  });
}

function start() {
  protocol.handle(SCHEME, serveApp);
  hardenSession();
  app.setAboutPanelOptions({
    applicationName: 'PFT Interpreter', applicationVersion: app.getVersion(), version: '',
    copyright: 'ERS/ATS 2022 z-score / LLN interpretation. Runs fully offline.'
  });
  if (IS_MAC && app.dock && !app.isPackaged && fs.existsSync(path.join(APP_DIR, 'icon.png'))) {
    try { app.dock.setIcon(path.join(APP_DIR, 'icon.png')); } catch (e) { /* development nicety only */ }
  }
  buildMenu();
  createWindow();
  app.on('activate', function () { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', function () {
    if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.on('window-all-closed', function () { if (!IS_MAC) app.quit(); });
  app.whenReady().then(start);
}

module.exports = { resolveAppFile, serveApp, isAppUrl, openExternalSafe, loadWindowState, CSP, START_URL };
