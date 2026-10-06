// electron-builder hook. On macOS the app is re-signed ad hoc (no Apple Developer account needed) so that
// Apple Silicon Macs accept it. Without any signature an arm64 app is refused outright.
const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const appPath = path.join(context.appOutDir, context.packager.appInfo.productFilename + '.app');
  try {
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });
    console.log('  • ad hoc signed ' + appPath);
  } catch (e) {
    console.warn('  • ad hoc signing skipped: ' + (e && e.message ? e.message : e));
  }
};
