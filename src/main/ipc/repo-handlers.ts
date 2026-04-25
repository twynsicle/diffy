import { basename } from 'node:path'

import { BrowserWindow, dialog, ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'
import type { Result } from '@shared/types'

import { getRepoRoot } from '../git-runner'
import { getLastRepoPath, setLastRepoPath } from '../persisted-state'
import { setCurrentRepoRoot } from '../repo-state'

export function registerRepoHandlers(mainWindow: BrowserWindow): void {
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

    const currentRepoRoot = rootResult.data
    setCurrentRepoRoot(currentRepoRoot)
    setLastRepoPath(currentRepoRoot)

    return {
      ok: true,
      data: {
        repoRoot: currentRepoRoot,
        displayName: basename(currentRepoRoot),
      },
    }
  })
}
