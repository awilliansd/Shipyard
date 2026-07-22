import { app } from 'electron';
import { join, resolve } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';

export const isDev = !app.isPackaged;

const DEV_ROOT = (() => {
  const candidates = [
    resolve(__dirname, '..', '..'),
    resolve(__dirname, '..'),
  ];
  for (const c of candidates) {
    if (existsSync(join(c, 'package.json')) && existsSync(join(c, 'client')) && existsSync(join(c, 'server'))) {
      return c;
    }
  }
  return resolve(__dirname, '..');
})();

export const ROOT_DIR = isDev
  ? DEV_ROOT
  : resolve(process.resourcesPath);

export const CLIENT_DIST = isDev
  ? resolve(ROOT_DIR, 'client', 'dist')
  : resolve(process.resourcesPath, 'app', 'client', 'dist');

export const SERVER_ENTRY = isDev
  ? resolve(ROOT_DIR, 'server', 'src', 'index.ts')
  : resolve(process.resourcesPath, 'app', 'server', 'dist', 'index.js');

export const ICON_PATH = isDev
  ? resolve(ROOT_DIR, 'assets', 'icon.png')
  : resolve(process.resourcesPath, 'icon.png');

export const DATA_DIR = isDev
  ? resolve(ROOT_DIR, 'data')
  : resolve(app.getPath('userData'), 'data');

export function ensureDataDirs() {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(join(DATA_DIR, 'tasks'), { recursive: true });
}

export const APP_VERSION = (() => {
  try {
    const pkgPath = resolve(ROOT_DIR, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
})();

export const WINDOW_TITLE = `Dockyard - v${APP_VERSION}`;

export const PORT = isDev ? 5420 : 5430;