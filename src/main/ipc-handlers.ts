import { readFile, rm } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { BrowserWindow, dialog, ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'
import type { DiffContent, DiffRequest, Result } from '@shared/types'

import { isBinary } from './detect-binary'
import { startWatching, stopWatching } from './file-watcher'
import { getRepoRoot, isPathInsideRepo, runGit } from './git-runner'
import { detectLanguage } from './language-map'
import { parseStatus } from './parse-status'
import { getLastRepoPath, setLastRepoPath } from './persisted-state'
import {
  clearApiKey,
  getApiKey,
  hasApiKey,
  setApiKey,
} from './secure-storage'

let currentRepoRoot: string | null = null

async function isTracked(repoRoot: string, filePath: string): Promise<boolean> {
  const result = await runGit({
    repoRoot,
    args: ['ls-files', '--error-unmatch', '--', filePath],
  })
  return result.ok
}

async function gitShow(repoRoot: string, ref: string): Promise<string> {
  const result = await runGit({ repoRoot, args: ['show', ref] })
  if (!result.ok) {
    // New file or deleted — no content at this ref
    return ''
  }
  return result.data
}

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle(IPC_CHANNELS.REPO_GET_LAST, () => {
    return getLastRepoPath()
  })

  ipcMain.handle(IPC_CHANNELS.REPO_SELECT_FOLDER, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.REPO_OPEN, async (_event, folderPath: string) => {
    const rootResult = await getRepoRoot(folderPath)
    if (!rootResult.ok) {
      return { ok: false, error: `Not a git repository: ${folderPath}` } satisfies Result<never>
    }

    currentRepoRoot = rootResult.data
    startWatching(currentRepoRoot, mainWindow)
    setLastRepoPath(currentRepoRoot)

    return {
      ok: true,
      data: {
        repoRoot: currentRepoRoot,
        displayName: basename(currentRepoRoot),
      },
    }
  })

  ipcMain.handle(IPC_CHANNELS.GIT_GET_STATUS, async () => {
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }

    const result = await runGit({
      repoRoot: currentRepoRoot,
      args: ['status', '--porcelain=v2', '-z'],
    })

    if (!result.ok) {
      return result
    }

    return { ok: true, data: parseStatus(result.data) }
  })

  ipcMain.handle(IPC_CHANNELS.GIT_STAGE_FILE, async (_event, filePath: string) => {
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }
    if (!isPathInsideRepo(currentRepoRoot, filePath)) {
      return { ok: false, error: 'Path is outside repository' } satisfies Result<never>
    }

    const result = await runGit({
      repoRoot: currentRepoRoot,
      args: ['add', '--', filePath],
    })

    if (!result.ok) return result
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.GIT_UNSTAGE_FILE, async (_event, filePath: string) => {
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }
    if (!isPathInsideRepo(currentRepoRoot, filePath)) {
      return { ok: false, error: 'Path is outside repository' } satisfies Result<never>
    }

    const result = await runGit({
      repoRoot: currentRepoRoot,
      args: ['reset', 'HEAD', '--', filePath],
    })

    if (!result.ok) return result
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.GIT_STAGE_ALL, async () => {
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }

    const result = await runGit({
      repoRoot: currentRepoRoot,
      args: ['add', '-A'],
    })

    if (!result.ok) return result
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.GIT_UNSTAGE_ALL, async () => {
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }

    const result = await runGit({
      repoRoot: currentRepoRoot,
      args: ['reset', 'HEAD'],
    })

    if (!result.ok) return result
    return { ok: true, data: undefined }
  })

  ipcMain.handle(
    IPC_CHANNELS.GIT_GET_DIFF_CONTENT,
    async (_event, request: DiffRequest): Promise<Result<DiffContent>> => {
      if (!currentRepoRoot) {
        return { ok: false, error: 'No repository open' }
      }
      if (!isPathInsideRepo(currentRepoRoot, request.path)) {
        return { ok: false, error: 'Path is outside repository' }
      }

      const language = detectLanguage(request.path)
      let original: string
      let modified: string

      if (request.section === 'unstaged') {
        // Unstaged: original = index, modified = worktree
        const origPath = request.origPath ?? request.path
        const indexResult = await gitShow(currentRepoRoot, `:${origPath}`)
        original = indexResult

        try {
          modified = await readFile(join(currentRepoRoot, request.path), 'utf-8')
        } catch {
          // File deleted from worktree
          modified = ''
        }
      } else {
        // Staged: original = HEAD, modified = index
        const origPath = request.origPath ?? request.path
        const headResult = await gitShow(currentRepoRoot, `HEAD:${origPath}`)
        original = headResult

        const indexResult = await gitShow(currentRepoRoot, `:${request.path}`)
        modified = indexResult
      }

      if (isBinary(original) || isBinary(modified)) {
        return { ok: true, data: { original: '', modified: '', language, isBinary: true } }
      }

      return { ok: true, data: { original, modified, language, isBinary: false } }
    },
  )

  ipcMain.handle(IPC_CHANNELS.GIT_DISCARD_FILE, async (_event, filePath: string) => {
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }
    if (!isPathInsideRepo(currentRepoRoot, filePath)) {
      return { ok: false, error: 'Path is outside repository' } satisfies Result<never>
    }

    const tracked = await isTracked(currentRepoRoot, filePath)
    if (tracked) {
      const result = await runGit({
        repoRoot: currentRepoRoot,
        args: ['restore', '--', filePath],
      })
      if (!result.ok) return result
    } else {
      try {
        await rm(join(currentRepoRoot, filePath), { recursive: true, force: true })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to remove file'
        return { ok: false, error: msg } satisfies Result<never>
      }
    }
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.GIT_DELETE_FILE, async (_event, filePath: string) => {
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }
    if (!isPathInsideRepo(currentRepoRoot, filePath)) {
      return { ok: false, error: 'Path is outside repository' } satisfies Result<never>
    }

    const tracked = await isTracked(currentRepoRoot, filePath)
    if (tracked) {
      const result = await runGit({
        repoRoot: currentRepoRoot,
        args: ['rm', '-f', '--', filePath],
      })
      if (!result.ok) return result
    } else {
      try {
        await rm(join(currentRepoRoot, filePath), { recursive: true, force: true })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to remove file'
        return { ok: false, error: msg } satisfies Result<never>
      }
    }
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_API_KEY, () => {
    try {
      return { ok: true, data: getApiKey() }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get API key'
      return { ok: false, error: msg }
    }
  })

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
}

export function cleanup(): void {
  stopWatching()
  currentRepoRoot = null
}
