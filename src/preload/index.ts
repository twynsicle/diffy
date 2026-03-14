import { contextBridge, ipcRenderer } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'
import type { DiffyApi } from '@shared/ipc'
import type {
  AiProvider,
  DiffRequest,
  FileAtRefRequest,
  NarrativeCacheLookup,
  NarrativeGenerationRequest,
  NarrativeReview,
  PrReference,
} from '@shared/types'

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
  setApiKey: (key) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_API_KEY, key),
  hasApiKey: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_HAS_API_KEY),
  clearApiKey: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_CLEAR_API_KEY),
  checkGhInstalled: () => ipcRenderer.invoke(IPC_CHANNELS.GH_CHECK_INSTALLED),
  fetchPr: (ref: PrReference) => ipcRenderer.invoke(IPC_CHANNELS.GH_FETCH_PR, ref),
  generateNarrative: (request: NarrativeGenerationRequest) =>
    ipcRenderer.invoke(IPC_CHANNELS.LLM_GENERATE_NARRATIVE, request),
  getCachedNarrativeReview: (lookup: NarrativeCacheLookup) =>
    ipcRenderer.invoke(IPC_CHANNELS.LLM_GET_CACHED_NARRATIVE_REVIEW, lookup),
  onNarrativeStreamChunk: (callback: (requestId: string, chunk: string) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      requestId: string,
      chunk: string,
    ): void => {
      callback(requestId, chunk)
    }
    ipcRenderer.on(IPC_CHANNELS.LLM_STREAM_CHUNK, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.LLM_STREAM_CHUNK, listener)
    }
  },
  onNarrativeStreamComplete: (callback: (requestId: string, review: NarrativeReview) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      requestId: string,
      review: NarrativeReview,
    ): void => {
      callback(requestId, review)
    }
    ipcRenderer.on(IPC_CHANNELS.LLM_STREAM_COMPLETE, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.LLM_STREAM_COMPLETE, listener)
    }
  },
  onNarrativeStreamError: (callback: (requestId: string, error: string) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      requestId: string,
      error: string,
    ): void => {
      callback(requestId, error)
    }
    ipcRenderer.on(IPC_CHANNELS.LLM_STREAM_ERROR, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.LLM_STREAM_ERROR, listener)
    }
  },
  cancelGeneration: (requestId?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.LLM_CANCEL_GENERATION, requestId),
  getLastPrUrl: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_LAST_PR_URL),
  setLastPrUrl: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_LAST_PR_URL, url),
  getExcludedPatterns: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_EXCLUDED_PATTERNS),
  setExcludedPatterns: (patterns: string[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_EXCLUDED_PATTERNS, patterns),
  getAiProvider: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_AI_PROVIDER),
  setAiProvider: (provider: AiProvider) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_AI_PROVIDER, provider),
  getCliModel: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_CLI_MODEL),
  setCliModel: (model: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_CLI_MODEL, model),
  checkClaudeCliInstalled: () => ipcRenderer.invoke(IPC_CHANNELS.CLAUDE_CLI_CHECK_INSTALLED),
  getFileAtRef: (request: FileAtRefRequest) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_FILE_AT_REF, request),
  getBranchDiff: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_BRANCH_DIFF),
  getUncommittedDiff: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_UNCOMMITTED_DIFF),
  fetchOrigin: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_FETCH_ORIGIN),
  commit: (message: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_COMMIT, message),
  getBranch: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_BRANCH),
  getCommitPanelVisible: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_COMMIT_PANEL_VISIBLE),
  setCommitPanelVisible: (visible: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_COMMIT_PANEL_VISIBLE, visible),
  onToggleCommitPanel: (callback: () => void) => {
    const listener = (): void => {
      callback()
    }
    ipcRenderer.on(IPC_CHANNELS.SHORTCUT_TOGGLE_COMMIT_PANEL, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SHORTCUT_TOGGLE_COMMIT_PANEL, listener)
    }
  },
  onNarrativeTruncationWarning: (callback: (requestId: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, requestId: string): void => {
      callback(requestId)
    }
    ipcRenderer.on(IPC_CHANNELS.LLM_TRUNCATION_WARNING, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.LLM_TRUNCATION_WARNING, listener)
    }
  },
}

contextBridge.exposeInMainWorld('api', api)
