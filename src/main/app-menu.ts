import { BrowserWindow, Menu, app } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'

export function buildAppMenu(): Menu {
  const viewSubmenu: Electron.MenuItemConstructorOptions[] = []

  if (!app.isPackaged) {
    viewSubmenu.push(
      { role: 'toggleDevTools' },
      { role: 'reload' },
      { role: 'forceReload' },
    )
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Diffy',
      submenu: [
        { role: 'about' },
        {
          label: 'Settings...',
          accelerator: 'CmdOrCtrl+,',
          click: (): void => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.send(IPC_CHANNELS.SHORTCUT_OPEN_SETTINGS)
          },
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Repository...',
          accelerator: 'CmdOrCtrl+O',
          click: (): void => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.send(IPC_CHANNELS.SHORTCUT_OPEN_REPO)
          },
        },
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
        { role: 'selectAll' },
      ],
    },
    ...(viewSubmenu.length > 0
      ? [{ label: 'View', submenu: viewSubmenu }]
      : []),
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }],
    },
  ]

  return Menu.buildFromTemplate(template)
}
