import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'
import type { Result } from '@shared/types'

import { isPathInsideRepo, runGit } from '../git-runner'
import { parseStatus } from '../parse-status'
import { getCurrentRepoRoot } from '../repo-state'

async function isTracked(repoRoot: string, filePath: string): Promise<boolean> {
  const result = await runGit({
    repoRoot,
    args: ['ls-files', '--error-unmatch', '--', filePath],
  })
  return result.ok
}

export function registerGitHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GIT_GET_STATUS, async () => {
    const currentRepoRoot = getCurrentRepoRoot()
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
    const currentRepoRoot = getCurrentRepoRoot()
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
    const currentRepoRoot = getCurrentRepoRoot()
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
    const currentRepoRoot = getCurrentRepoRoot()
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
    const currentRepoRoot = getCurrentRepoRoot()
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

  ipcMain.handle(IPC_CHANNELS.GIT_DISCARD_FILE, async (_event, filePath: string) => {
    const currentRepoRoot = getCurrentRepoRoot()
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
    const currentRepoRoot = getCurrentRepoRoot()
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

  ipcMain.handle(IPC_CHANNELS.GIT_COMMIT, async (_event, message: string) => {
    const currentRepoRoot = getCurrentRepoRoot()
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }
    if (typeof message !== 'string' || message.trim().length === 0) {
      return {
        ok: false,
        error: 'Commit message must be a non-empty string',
      } satisfies Result<never>
    }

    const result = await runGit({
      repoRoot: currentRepoRoot,
      args: ['commit', '-m', message],
    })

    if (!result.ok) return result
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.GIT_GET_BRANCH, async () => {
    const currentRepoRoot = getCurrentRepoRoot()
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }

    const result = await runGit({
      repoRoot: currentRepoRoot,
      args: ['rev-parse', '--abbrev-ref', 'HEAD'],
    })

    if (!result.ok) return result
    return { ok: true, data: result.data.trim() }
  })

  ipcMain.handle(IPC_CHANNELS.GIT_FETCH_ORIGIN, async () => {
    const currentRepoRoot = getCurrentRepoRoot()
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }

    const result = await runGit({
      repoRoot: currentRepoRoot,
      args: ['fetch', 'origin'],
      timeoutMs: 30_000,
    })

    if (!result.ok) return result
    return { ok: true, data: undefined }
  })
}
