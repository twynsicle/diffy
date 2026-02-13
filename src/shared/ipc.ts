import type { RepoStatus, Result } from './types'

export const IPC_CHANNELS = {
  REPO_GET_LAST: 'repo.getLast',
  REPO_SELECT_FOLDER: 'repo.selectFolder',
  REPO_OPEN: 'repo.open',
  GIT_GET_STATUS: 'git.getStatus',
  GIT_STAGE_FILE: 'git.stageFile',
  GIT_UNSTAGE_FILE: 'git.unstageFile',
  GIT_STAGE_ALL: 'git.stageAll',
  GIT_UNSTAGE_ALL: 'git.unstageAll',
  WATCHER_STATUS_CHANGED: 'watcher.statusChanged',
} as const

export type RepoOpenResult = {
  repoRoot: string
  displayName: string
}

export type DiffyApi = {
  getLastRepo: () => Promise<string | null>
  selectFolder: () => Promise<string | null>
  openRepo: (folderPath: string) => Promise<Result<RepoOpenResult>>
  getStatus: () => Promise<Result<RepoStatus>>
  stageFile: (path: string) => Promise<Result<void>>
  unstageFile: (path: string) => Promise<Result<void>>
  stageAll: () => Promise<Result<void>>
  unstageAll: () => Promise<Result<void>>
  onStatusChanged: (callback: () => void) => () => void
}
