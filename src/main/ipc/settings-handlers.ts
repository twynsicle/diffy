import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'
import type { AiProvider, Result } from '@shared/types'

import {
  getAiProvider,
  getCliModel,
  getCommitPanelVisible,
  getExcludedFilePatterns,
  getLastPrUrl,
  setAiProvider,
  setCliModel,
  setCommitPanelVisible,
  setExcludedFilePatterns,
  setLastPrUrl,
} from '../persisted-state'
import {
  clearApiKey,
  hasApiKey,
  setApiKey,
} from '../secure-storage'

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_API_KEY, (_event, key: string) => {
    if (typeof key !== 'string' || key.trim().length === 0) {
      return { ok: false, error: 'API key must be a non-empty string' }
    }
    try {
      setApiKey(key.trim())
      return { ok: true, data: undefined }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save API key'
      return { ok: false, error: msg }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_HAS_API_KEY, () => {
    try {
      return { ok: true, data: hasApiKey() }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to check API key'
      return { ok: false, error: msg }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_CLEAR_API_KEY, () => {
    try {
      clearApiKey()
      return { ok: true, data: undefined }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to clear API key'
      return { ok: false, error: msg }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_LAST_PR_URL, () => {
    return getLastPrUrl()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_LAST_PR_URL, (_event, url: unknown) => {
    if (typeof url !== 'string' || url.trim().length === 0) {
      return { ok: false, error: 'URL must be a non-empty string' } satisfies Result<never>
    }
    setLastPrUrl(url.trim())
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_AI_PROVIDER, () => {
    return { ok: true, data: getAiProvider() }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_AI_PROVIDER, (_event, provider: unknown) => {
    if (provider !== 'api' && provider !== 'cli') {
      return { ok: false, error: 'Invalid AI provider' } satisfies Result<never>
    }
    setAiProvider(provider as AiProvider)
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_CLI_MODEL, () => {
    return { ok: true, data: getCliModel() }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_CLI_MODEL, (_event, model: unknown) => {
    if (typeof model !== 'string') {
      return { ok: false, error: 'Model must be a string' } satisfies Result<never>
    }
    setCliModel(model.trim())
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_EXCLUDED_PATTERNS, () => {
    try {
      return { ok: true, data: getExcludedFilePatterns() }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get excluded patterns'
      return { ok: false, error: msg }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_EXCLUDED_PATTERNS, (_event, patterns: unknown) => {
    if (!Array.isArray(patterns) || !patterns.every((p) => typeof p === 'string')) {
      return { ok: false, error: 'Patterns must be an array of strings' } satisfies Result<never>
    }
    try {
      setExcludedFilePatterns(patterns)
      return { ok: true, data: undefined }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save excluded patterns'
      return { ok: false, error: msg }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_COMMIT_PANEL_VISIBLE, () => {
    return getCommitPanelVisible()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_COMMIT_PANEL_VISIBLE, (_event, visible: unknown) => {
    if (typeof visible !== 'boolean') {
      return { ok: false, error: 'Visibility must be a boolean' } satisfies Result<never>
    }
    setCommitPanelVisible(visible)
    return { ok: true, data: undefined }
  })
}
