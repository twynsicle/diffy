import { contextBridge, ipcRenderer } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'
import type { DiffyApi } from '@shared/ipc'
import type { DiffRequest, NarrativeReview, PrData, PrReference } from '@shared/types'

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
  onShortcutOpenSettings: (callback) => {
    const listener = (): void => {
      callback()
    }
    ipcRenderer.on(IPC_CHANNELS.SHORTCUT_OPEN_SETTINGS, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SHORTCUT_OPEN_SETTINGS, listener)
    }
  },
  getApiKey: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_API_KEY),
  setApiKey: (key) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_API_KEY, key),
  hasApiKey: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_HAS_API_KEY),
  clearApiKey: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_CLEAR_API_KEY),
  checkGhInstalled: () => ipcRenderer.invoke(IPC_CHANNELS.GH_CHECK_INSTALLED),
  fetchPr: (ref: PrReference) => ipcRenderer.invoke(IPC_CHANNELS.GH_FETCH_PR, ref),
  generateNarrative: (prData: PrData) =>
    ipcRenderer.invoke(IPC_CHANNELS.LLM_GENERATE_NARRATIVE, prData),
  onNarrativeStreamChunk: (callback: (chunk: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, chunk: string): void => {
      callback(chunk)
    }
    ipcRenderer.on(IPC_CHANNELS.LLM_STREAM_CHUNK, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.LLM_STREAM_CHUNK, listener)
    }
  },
  onNarrativeStreamComplete: (callback: (review: NarrativeReview) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, review: NarrativeReview): void => {
      callback(review)
    }
    ipcRenderer.on(IPC_CHANNELS.LLM_STREAM_COMPLETE, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.LLM_STREAM_COMPLETE, listener)
    }
  },
  onNarrativeStreamError: (callback: (error: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, error: string): void => {
      callback(error)
    }
    ipcRenderer.on(IPC_CHANNELS.LLM_STREAM_ERROR, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.LLM_STREAM_ERROR, listener)
    }
  },
  cancelGeneration: () => ipcRenderer.invoke(IPC_CHANNELS.LLM_CANCEL_GENERATION),
  getLastPrUrl: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_LAST_PR_URL),
  setLastPrUrl: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_LAST_PR_URL, url),
  onNarrativeTruncationWarning: (callback: () => void) => {
    const listener = (): void => {
      callback()
    }
    ipcRenderer.on(IPC_CHANNELS.LLM_TRUNCATION_WARNING, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.LLM_TRUNCATION_WARNING, listener)
    }
  },
}

contextBridge.exposeInMainWorld('api', api)
