const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

/**
 * After electron-builder creates the unpacked directory,
 * install server production dependencies using npm (flat node_modules).
 * pnpm's symlink-based node_modules doesn't survive packaging.
 */
exports.default = async function (context) {
  const appDir = path.join(context.appOutDir, 'resources', 'app');

  if (!existsSync(appDir)) {
    console.log('[afterPack] No app dir found, skipping dependency install');
    return;
  }

  const installProdDeps = (targetDir, label) => {
    console.log(`[afterPack] Installing ${label} production dependencies in:`, targetDir);
    try {
      execSync('npm install --omit=dev --ignore-scripts', {
        cwd: targetDir,
        stdio: 'inherit',
        timeout: 120000,
      });
      console.log(`[afterPack] ${label} dependencies installed successfully`);
    } catch (err) {
      console.error(`[afterPack] npm install failed for ${label}:`, err.message);
      execSync('npm install --omit=dev --no-optional --ignore-scripts', {
        cwd: targetDir,
        stdio: 'inherit',
        timeout: 120000,
      });
      console.log(`[afterPack] ${label} dependencies installed (without optional)`);
    }
  };

  // Install root app deps first (electron-updater/electron-log run in main process).
  if (!existsSync(path.join(appDir, 'package.json'))) {
    console.log('[afterPack] No root package.json found, skipping root dependency install');
  } else {
    installProdDeps(appDir, 'root app');
  }

  // Install deps inside server/ using its own package.json.
  const serverDir = path.join(appDir, 'server');

  if (!existsSync(path.join(serverDir, 'package.json'))) {
    console.log('[afterPack] No server/package.json found, skipping');
    return;
  }

  installProdDeps(serverDir, 'server');
};
