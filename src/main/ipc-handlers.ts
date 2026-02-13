import { basename } from 'node:path'

import { BrowserWindow, dialog, ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'
import type { Result } from '@shared/types'

import { startWatching, stopWatching } from './file-watcher'
import { getRepoRoot, isPathInsideRepo, runGit } from './git-runner'
import { parseStatus } from './parse-status'
import { getLastRepoPath, setLastRepoPath } from './persisted-state'

let currentRepoRoot: string | null = null

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
}

export function cleanup(): void {
  stopWatching()
  currentRepoRoot = null
}
