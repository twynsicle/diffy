import { BrowserWindow, Menu } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'

export function buildAppMenu(): Menu {
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
        {
          label: 'Refresh',
          accelerator: 'CmdOrCtrl+R',
          click: (): void => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.send(IPC_CHANNELS.SHORTCUT_REFRESH)
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
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ]

  return Menu.buildFromTemplate(template)
}
