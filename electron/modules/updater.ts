import { app, dialog, BrowserWindow, type MessageBoxOptions, type MessageBoxReturnValue } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { isDev } from './paths';

let updateCheckInterval: NodeJS.Timeout | null = null;

function showMessageBoxSafe(options: MessageBoxOptions): Promise<MessageBoxReturnValue> {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    return dialog.showMessageBox(mainWindow, options);
  }
  return dialog.showMessageBox(options);
}

let getMainWindow: () => BrowserWindow | null = () => null;

export function setMainWindowGetter(fn: () => BrowserWindow | null) {
  getMainWindow = fn;
}

export async function checkForAppUpdates(userInitiated = false) {
  if (!app.isPackaged || isDev) {
    if (userInitiated) {
      await showMessageBoxSafe({
        type: 'info',
        title: 'Updates unavailable',
        message: 'Update checks are available only in packaged builds.',
      });
    }
    return;
  }

  try {
    await autoUpdater.checkForUpdates();
    log.info('[auto-update] Manual/automatic check executed.');
  } catch (error) {
    log.error('[auto-update] Failed to check for updates:', error);
    if (userInitiated) {
      await showMessageBoxSafe({
        type: 'error',
        title: 'Update check failed',
        message: 'Could not check for updates right now.',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export function setupAutoUpdater() {
  if (!app.isPackaged || isDev) return;

  log.transports.file.level = 'info';
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    log.info('[auto-update] Checking for updates...');
  });

  autoUpdater.on('update-available', (info: { version?: string }) => {
    log.info('[auto-update] Update available:', info?.version);
  });

  autoUpdater.on('update-not-available', (info: { version?: string }) => {
    log.info('[auto-update] No update available:', info?.version);
  });

  autoUpdater.on('download-progress', (progress: { percent?: number }) => {
    log.info('[auto-update] Download progress:', Number(progress.percent ?? 0).toFixed(2) + '%');
  });

  autoUpdater.on('error', (error: unknown) => {
    log.error('[auto-update] Updater error:', error);
  });

  autoUpdater.on('update-downloaded', async (info: { version?: string }) => {
    const result = await showMessageBoxSafe({
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: `Version ${info?.version ?? 'latest'} is ready to install.`,
      detail: 'Restart Dockyard to finish applying the update.',
    });
    if (result.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });

  setTimeout(() => {
    checkForAppUpdates(false).catch((error) => {
      log.error('[auto-update] Initial update check failed:', error);
    });
  }, 10000);

  updateCheckInterval = setInterval(() => {
    checkForAppUpdates(false).catch((error) => {
      log.error('[auto-update] Scheduled update check failed:', error);
    });
  }, 6 * 60 * 60 * 1000);
}

export function stopUpdateCheck() {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
}