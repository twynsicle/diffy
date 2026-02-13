import type { BrowserWindow } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'

const POLL_INTERVAL_MS = 1000

let pollTimer: ReturnType<typeof setInterval> | null = null

export function startWatching(_repoRoot: string, mainWindow: BrowserWindow): void {
  stopWatching()

  pollTimer = setInterval(() => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.WATCHER_STATUS_CHANGED)
    }
  }, POLL_INTERVAL_MS)
}

export function stopWatching(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}
