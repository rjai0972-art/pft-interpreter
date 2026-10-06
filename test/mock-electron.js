'use strict';
// A stand-in for the `electron` module so main.js can be exercised with plain Node (no window, no GPU).
// It records what main.js asks Electron to do. It is not a substitute for launching the real app.
const Module = require('module'), os = require('os'), fs = require('fs'), path = require('path');

function makeMock(opts) {
  opts = opts || {};
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'pft-userdata-'));
  const calls = { schemes: null, protocolHandler: null, windows: [], menu: null, opened: [], dialogs: [], quits: 0, perm: {}, aboutPanel: null };
  const listeners = {};
  let readyResolve; const ready = new Promise(function (r) { readyResolve = r; });
  class FakeWC {
    constructor() { this.handlers = {}; this.printed = []; this.pdfs = 0; }
    setWindowOpenHandler(fn) { this.openHandler = fn; }
    on(ev, fn) { this.handlers[ev] = fn; }
    print(o) { this.printed.push(o); }
    async printToPDF(o) { this.pdfs++; this.pdfOpts = o; return Buffer.from('%PDF-fake'); }
  }
  class BrowserWindow {
    constructor(o) { this.options = o; this.webContents = new FakeWC(); this.ev = {}; this.maximizedFlag = false; this.destroyed = false; BrowserWindow._all.push(this); calls.windows.push(this); }
    once(ev, fn) { this.ev[ev] = fn; } on(ev, fn) { this.ev[ev] = fn; }
    loadURL(u) { this.url = u; } show() { this.shown = true; } maximize() { this.maximizedFlag = true; }
    isMaximized() { return this.maximizedFlag; } isMinimized() { return false; } isDestroyed() { return this.destroyed; }
    restore() {} focus() { this.focused = true; }
    getNormalBounds() { return { x: 50, y: 60, width: 1111, height: 777 }; }
    static getAllWindows() { return BrowserWindow._all.filter(function (w) { return !w.destroyed; }); }
  }
  BrowserWindow._all = [];
  const sessionListeners = {};
  const electron = {
    app: {
      name: 'PFT Interpreter', isPackaged: !!opts.packaged, dock: opts.mac ? { setIcon() {} } : undefined,
      getVersion() { return '3.0.0'; }, getPath(n) { return n === 'userData' ? userData : os.tmpdir(); },
      requestSingleInstanceLock() { return opts.noLock ? false : true; },
      quit() { calls.quits++; }, whenReady() { return ready; },
      on(ev, fn) { listeners[ev] = fn; }, setAboutPanelOptions(o) { calls.aboutPanel = o; }
    },
    BrowserWindow: BrowserWindow,
    Menu: { buildFromTemplate(t) { return { template: t }; }, setApplicationMenu(m) { calls.menu = m; } },
    shell: { openExternal(u) { calls.opened.push(u); }, openPath(p) { calls.opened.push('path:' + p); } },
    dialog: {
      showMessageBox() { calls.dialogs.push('message'); return Promise.resolve({ response: 0 }); },
      showErrorBox(t) { calls.dialogs.push('error:' + t); },
      showSaveDialog() { calls.dialogs.push('save'); return Promise.resolve({ canceled: true }); }
    },
    protocol: { registerSchemesAsPrivileged(s) { calls.schemes = s; }, handle(scheme, fn) { calls.protocolHandler = { scheme: scheme, fn: fn }; } },
    session: { defaultSession: {
      setPermissionRequestHandler(fn) { calls.perm.request = fn; }, setPermissionCheckHandler(fn) { calls.perm.check = fn; },
      on(ev, fn) { sessionListeners[ev] = fn; }
    } },
    nativeTheme: { shouldUseDarkColors: false },
    screen: { getAllDisplays() { return [{ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }]; } }
  };
  return { electron, calls, listeners, sessionListeners, userData, whenReady: function () { readyResolve(); return ready; } };
}

// Load ../main.js against a fresh mock. `platform` lets a test pretend to be mac/win/linux.
function loadMain(opts) {
  opts = opts || {};
  const m = makeMock(opts);
  const orig = Module._load;
  const realPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
  if (opts.platform) Object.defineProperty(process, 'platform', { value: opts.platform });
  Module._load = function (request) { if (request === 'electron') return m.electron; return orig.apply(this, arguments); };
  const file = path.join(__dirname, '..', 'main.js');
  delete require.cache[require.resolve(file)];
  let exp;
  try { exp = require(file); } finally { Module._load = orig; if (opts.platform) Object.defineProperty(process, 'platform', realPlatform); }
  return Object.assign({ main: exp }, m);
}
module.exports = { loadMain };
