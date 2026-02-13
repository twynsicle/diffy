import type { DiffContent, DiffRequest, NarrativeReview, PrData, PrReference, RepoStatus, Result } from './types'

export const IPC_CHANNELS = {
  REPO_GET_LAST: 'repo.getLast',
  REPO_SELECT_FOLDER: 'repo.selectFolder',
  REPO_OPEN: 'repo.open',
  GIT_GET_STATUS: 'git.getStatus',
  GIT_STAGE_FILE: 'git.stageFile',
  GIT_UNSTAGE_FILE: 'git.unstageFile',
  GIT_STAGE_ALL: 'git.stageAll',
  GIT_UNSTAGE_ALL: 'git.unstageAll',
  GIT_GET_DIFF_CONTENT: 'git.getDiffContent',
  GIT_DISCARD_FILE: 'git.discardFile',
  GIT_DELETE_FILE: 'git.deleteFile',
  WATCHER_STATUS_CHANGED: 'watcher.statusChanged',
  SHORTCUT_OPEN_REPO: 'shortcut.openRepo',
  SHORTCUT_REFRESH: 'shortcut.refresh',
  SHORTCUT_OPEN_SETTINGS: 'shortcut.openSettings',
  SETTINGS_GET_API_KEY: 'settings.getApiKey',
  SETTINGS_SET_API_KEY: 'settings.setApiKey',
  SETTINGS_HAS_API_KEY: 'settings.hasApiKey',
  SETTINGS_CLEAR_API_KEY: 'settings.clearApiKey',
  GH_CHECK_INSTALLED: 'gh.checkInstalled',
  GH_FETCH_PR: 'gh.fetchPr',
  LLM_GENERATE_NARRATIVE: 'llm.generateNarrative',
  LLM_STREAM_CHUNK: 'llm.streamChunk',
  LLM_STREAM_COMPLETE: 'llm.streamComplete',
  LLM_STREAM_ERROR: 'llm.streamError',
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
  getDiffContent: (request: DiffRequest) => Promise<Result<DiffContent>>
  discardFile: (path: string) => Promise<Result<void>>
  deleteFile: (path: string) => Promise<Result<void>>
  onStatusChanged: (callback: () => void) => () => void
  onShortcutOpenRepo: (callback: () => void) => () => void
  onShortcutRefresh: (callback: () => void) => () => void
  onShortcutOpenSettings: (callback: () => void) => () => void
  getApiKey: () => Promise<Result<string>>
  setApiKey: (key: string) => Promise<Result<void>>
  hasApiKey: () => Promise<Result<boolean>>
  clearApiKey: () => Promise<Result<void>>
  checkGhInstalled: () => Promise<Result<boolean>>
  fetchPr: (ref: PrReference) => Promise<Result<PrData>>
  generateNarrative: (prData: PrData) => Promise<Result<string>>
  onNarrativeStreamChunk: (callback: (chunk: string) => void) => () => void
  onNarrativeStreamComplete: (callback: (review: NarrativeReview) => void) => () => void
  onNarrativeStreamError: (callback: (error: string) => void) => () => void
}
