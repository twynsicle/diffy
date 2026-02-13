import { contextBridge, ipcRenderer } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'
import type { DiffyApi } from '@shared/ipc'

const api: DiffyApi = {
  getLastRepo: () => ipcRenderer.invoke(IPC_CHANNELS.REPO_GET_LAST),
  selectFolder: () => ipcRenderer.invoke(IPC_CHANNELS.REPO_SELECT_FOLDER),
  openRepo: (folderPath) => ipcRenderer.invoke(IPC_CHANNELS.REPO_OPEN, folderPath),
  getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_STATUS),
  stageFile: (path) => ipcRenderer.invoke(IPC_CHANNELS.GIT_STAGE_FILE, path),
  unstageFile: (path) => ipcRenderer.invoke(IPC_CHANNELS.GIT_UNSTAGE_FILE, path),
  stageAll: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_STAGE_ALL),
  unstageAll: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_UNSTAGE_ALL),
  onStatusChanged: (callback) => {
    const listener = (): void => {
      callback()
    }
    ipcRenderer.on(IPC_CHANNELS.WATCHER_STATUS_CHANGED, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.WATCHER_STATUS_CHANGED, listener)
    }
  },
}

contextBridge.exposeInMainWorld('api', api)
