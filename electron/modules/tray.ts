import { app, Tray, Menu, nativeImage } from 'electron';
import { existsSync } from 'fs';
import { ICON_PATH } from './paths';
import { showMainWindow } from './window';

let tray: Tray | null = null;

export function createTray() {
  const icon = existsSync(ICON_PATH)
    ? nativeImage.createFromPath(ICON_PATH).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('Dockyard');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Dockyard',
      click: () => {
        showMainWindow();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    showMainWindow();
  });

  return tray;
}

export function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}