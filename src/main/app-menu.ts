import { BrowserWindow, Menu, app } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'

import { getCommitPanelVisible, setCommitPanelVisible } from './persisted-state'

export function buildAppMenu(): Menu {
  const viewSubmenu: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Show Commit Panel',
      type: 'checkbox',
      checked: getCommitPanelVisible(),
      click: (menuItem): void => {
        const visible = menuItem.checked
        setCommitPanelVisible(visible)
        const win = BrowserWindow.getFocusedWindow()
        win?.webContents.send(IPC_CHANNELS.SHORTCUT_TOGGLE_COMMIT_PANEL)
      },
    },
  ]

  if (!app.isPackaged) {
    viewSubmenu.push(
      { type: 'separator' },
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
      label: 'View',
      submenu: viewSubmenu,
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }],
    },
  ]

  return Menu.buildFromTemplate(template)
}
