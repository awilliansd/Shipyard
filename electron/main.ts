import { app, ipcMain, dialog } from 'electron';
import { ensureDataDirs, isDev, WINDOW_TITLE } from './modules/paths';
import { logElectron } from './modules/logger';
import { startServer, stopServer, waitForServerReady, setQuitting } from './modules/serverProcess';
import { setupAutoUpdater, stopUpdateCheck, setMainWindowGetter } from './modules/updater';
import { createWindow, createSplashWindow, getMainWindow, getTargetUrl } from './modules/window';
import { createTray } from './modules/tray';
import { createAppMenu } from './modules/menu';

// Ensure data directory exists
ensureDataDirs();

// ── App lifecycle ──────────────────────────────────────────────────

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = getMainWindow();
    if (win) {
      win.show();
      win.focus();
    }
  });

  app.on('before-quit', () => {
    setQuitting(true);
    stopUpdateCheck();
    stopServer();
  });

  app.whenReady().then(async () => {
    ipcMain.handle('get-app-version', () => app.getVersion());
    setMainWindowGetter(() => getMainWindow());

    try {
      createSplashWindow();
      await startServer(() => {
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.reload();
          win.show();
        }
      });
      const targetUrl = getTargetUrl(process.env.VITE_DEV_SERVER);
      if (!isDev || !process.env.VITE_DEV_SERVER) {
        try {
          await waitForServerReady(targetUrl);
        } catch (err) {
          logElectron('[Electron] Server readiness check failed, will rely on load retries:', err);
        }
      }
      createAppMenu();
      createWindow(targetUrl, WINDOW_TITLE);
      createTray();
      setupAutoUpdater();
    } catch (err) {
      logElectron('[Electron] Failed to start:', err);
      dialog.showErrorBox(
        'Dockyard - Failed to Start',
        `Could not start the server.\n\n${err instanceof Error ? err.message : String(err)}`,
      );
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    // Keep running in tray on all platforms
  });

  app.on('activate', () => {
    if (getMainWindow() === null) {
      createAppMenu();
      const targetUrl = getTargetUrl(process.env.VITE_DEV_SERVER);
      createWindow(targetUrl, WINDOW_TITLE);
    } else {
      getMainWindow()?.show();
    }
  });
}