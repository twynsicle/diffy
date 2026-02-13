import { contextBridge, ipcRenderer } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'
import type { DiffyApi } from '@shared/ipc'
import type { DiffRequest } from '@shared/types'

const api: DiffyApi = {
  getLastRepo: () => ipcRenderer.invoke(IPC_CHANNELS.REPO_GET_LAST),
  selectFolder: () => ipcRenderer.invoke(IPC_CHANNELS.REPO_SELECT_FOLDER),
  openRepo: (folderPath) => ipcRenderer.invoke(IPC_CHANNELS.REPO_OPEN, folderPath),
  getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_STATUS),
  stageFile: (path) => ipcRenderer.invoke(IPC_CHANNELS.GIT_STAGE_FILE, path),
  unstageFile: (path) => ipcRenderer.invoke(IPC_CHANNELS.GIT_UNSTAGE_FILE, path),
  stageAll: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_STAGE_ALL),
  unstageAll: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_UNSTAGE_ALL),
  getDiffContent: (request: DiffRequest) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_DIFF_CONTENT, request),
  discardFile: (path) => ipcRenderer.invoke(IPC_CHANNELS.GIT_DISCARD_FILE, path),
  deleteFile: (path) => ipcRenderer.invoke(IPC_CHANNELS.GIT_DELETE_FILE, path),
  onStatusChanged: (callback) => {
    const listener = (): void => {
      callback()
    }
    ipcRenderer.on(IPC_CHANNELS.WATCHER_STATUS_CHANGED, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.WATCHER_STATUS_CHANGED, listener)
    }
  },
  onShortcutOpenRepo: (callback) => {
    const listener = (): void => {
      callback()
    }
    ipcRenderer.on(IPC_CHANNELS.SHORTCUT_OPEN_REPO, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SHORTCUT_OPEN_REPO, listener)
    }
  },
  onShortcutRefresh: (callback) => {
    const listener = (): void => {
      callback()
    }
    ipcRenderer.on(IPC_CHANNELS.SHORTCUT_REFRESH, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SHORTCUT_REFRESH, listener)
    }
  },
}

contextBridge.exposeInMainWorld('api', api)
