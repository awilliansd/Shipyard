import { app, Menu, type MenuItemConstructorOptions } from 'electron';
import { checkForAppUpdates } from './updater';
import { getMainWindow } from './window';

export function createAppMenu() {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        } as MenuItemConstructorOptions]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: async () => {
            getMainWindow()?.webContents.send('menu-event', 'navigate-settings');
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [
                  { role: 'startSpeaking' },
                  { role: 'stopSpeaking' },
                ],
              },
            ] as MenuItemConstructorOptions[]
          : [
              { role: 'delete' },
              { type: 'separator' },
              { role: 'selectAll' },
            ] as MenuItemConstructorOptions[]),
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' },
            ] as MenuItemConstructorOptions[]
          : [
              { role: 'close' },
            ] as MenuItemConstructorOptions[]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Check for Updates',
          click: async () => {
            await checkForAppUpdates(true);
          },
        },
        { type: 'separator' },
        {
          label: 'Documentation',
          click: async () => {
            getMainWindow()?.webContents.send('menu-event', 'navigate-help');
          },
        },
        {
          label: 'About',
          click: async () => {
            getMainWindow()?.webContents.send('menu-event', 'show-about');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}