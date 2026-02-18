import type { BrowserWindow } from 'electron'

import { stopWatching } from './file-watcher'
import { registerDiffHandlers } from './ipc/diff-handlers'
import { registerGitHandlers } from './ipc/git-handlers'
import { registerGithubHandlers } from './ipc/github-handlers'
import { registerNarrativeHandlers } from './ipc/narrative-handlers'
import { registerRepoHandlers } from './ipc/repo-handlers'
import { registerSettingsHandlers } from './ipc/settings-handlers'
import { setCurrentRepoRoot } from './repo-state'

let narrativeCleanup: (() => void) | null = null

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  registerRepoHandlers(mainWindow)
  registerGitHandlers()
  registerDiffHandlers()
  registerSettingsHandlers()
  registerGithubHandlers()
  const narrative = registerNarrativeHandlers(mainWindow)
  narrativeCleanup = narrative.cleanup
}

export function cleanup(): void {
  stopWatching()
  narrativeCleanup?.()
  narrativeCleanup = null
  setCurrentRepoRoot(null)
}
