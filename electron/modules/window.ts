import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { isDev, ICON_PATH, PORT } from './paths';
import { logElectron } from './logger';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let isQuitting = false;

export function setQuitting(value: boolean) {
  isQuitting = value;
}

export function getMainWindow() {
  return mainWindow;
}

export function showMainWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function closeSplashWindow() {
  if (splashWindow) {
    splashWindow.close();
    splashWindow = null;
  }
}

export function createSplashWindow() {
  if (splashWindow) return;

  let logoDataUrl = '';
  try {
    if (existsSync(ICON_PATH)) {
      const buf = readFileSync(ICON_PATH);
      logoDataUrl = `data:image/png;base64,${buf.toString('base64')}`;
    }
  } catch {
    // ignore logo load failures
  }

  splashWindow = new BrowserWindow({
    width: 520,
    height: 320,
    resizable: false,
    minimizable: false,
    maximizable: false,
    frame: false,
    show: true,
    backgroundColor: '#0b0b0f',
    alwaysOnTop: true,
    transparent: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
    },
  });

  const logoMarkup = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="Dockyard" style="width:64px;height:64px;margin:0 auto 8px;display:block;filter: drop-shadow(0 6px 18px rgba(0,0,0,0.5));" />`
    : '';

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Dockyard</title>
        <style>
          :root { color-scheme: dark; }
          body {
            margin: 0;
            background: #0b0b0f;
            color: #e5e7eb;
            font-family: "Segoe UI", system-ui, sans-serif;
            display: grid;
            place-items: center;
            height: 100vh;
          }
          .card {
            text-align: center;
            padding: 0;
            min-width: 0;
            border-radius: 0;
            background: transparent;
            box-shadow: none;
          }
          .logo {
            font-size: 20px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .spinner {
            width: 36px;
            height: 36px;
            border: 3px solid #2a2a36;
            border-top-color: #7dd3fc;
            border-radius: 50%;
            margin: 16px auto 4px;
            animation: spin 0.9s linear infinite;
          }
          .sub {
            font-size: 12px;
            color: #94a3b8;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card">
          ${logoMarkup}
          <div class="logo">Dockyard</div>
          <div class="spinner"></div>
          <div class="sub">Carregando...</div>
        </div>
      </body>
    </html>
  `;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function loadWindowWithRetry(win: BrowserWindow, url: string) {
  let shown = false;
  let retries = 0;
  const maxRetries = 12;

  const showOnce = () => {
    if (shown) return;
    shown = true;
    win.show();
    if (isDev) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
    closeSplashWindow();
  };

  const tryLoad = () => {
    win.loadURL(url).catch((err) => {
      console.warn('[Electron] loadURL failed:', err);
    });
  };

  win.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    if (validatedURL !== url) return;
    if (errorCode === -3) return;

    if (retries < maxRetries) {
      const delayMs = Math.min(2000, 200 + retries * 200);
      retries += 1;
      logElectron(`[Electron] Load failed (${errorDescription}). Retrying in ${delayMs}ms...`);
      setTimeout(tryLoad, delayMs);
    } else {
      logElectron('[Electron] Load failed too many times, showing window anyway.');
      showOnce();
    }
  });

  win.webContents.once('did-finish-load', () => {
    showOnce();
  });

  tryLoad();
}

export function createWindow(targetUrl: string, windowTitle: string) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: windowTitle,
    icon: existsSync(ICON_PATH) ? ICON_PATH : undefined,
    backgroundColor: '#09090b',
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  loadWindowWithRetry(mainWindow, targetUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentURL = mainWindow?.webContents.getURL() || '';
    const isSameOrigin = new URL(url).origin === new URL(currentURL).origin;
    if (!isSameOrigin && url.startsWith('http')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function getTargetUrl(viteDevServer?: string) {
  if (isDev && viteDevServer) {
    return viteDevServer;
  }
  return `http://127.0.0.1:${PORT}`;
}

export function reloadMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.reload();
    mainWindow.show();
  }
}