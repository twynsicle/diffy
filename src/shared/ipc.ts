import type {
  AiProvider,
  DiffContent,
  DiffRequest,
  FileAtRefRequest,
  FileAtRefResult,
  NarrativeCacheLookup,
  NarrativeGenerationRequest,
  NarrativeReview,
  NarrativeReviewCacheEntry,
  PrData,
  PrReference,
  Result,
} from './types'

export const IPC_CHANNELS = {
  REPO_GET_LAST: 'repo.getLast',
  REPO_SELECT_FOLDER: 'repo.selectFolder',
  REPO_OPEN: 'repo.open',
  GIT_GET_DIFF_CONTENT: 'git.getDiffContent',
  SHORTCUT_OPEN_REPO: 'shortcut.openRepo',
  SHORTCUT_OPEN_SETTINGS: 'shortcut.openSettings',
  SETTINGS_SET_API_KEY: 'settings.setApiKey',
  SETTINGS_HAS_API_KEY: 'settings.hasApiKey',
  SETTINGS_CLEAR_API_KEY: 'settings.clearApiKey',
  GH_CHECK_INSTALLED: 'gh.checkInstalled',
  GH_FETCH_PR: 'gh.fetchPr',
  LLM_GENERATE_NARRATIVE: 'llm.generateNarrative',
  LLM_GET_CACHED_NARRATIVE_REVIEW: 'llm.getCachedNarrativeReview',
  LLM_STREAM_CHUNK: 'llm.streamChunk',
  LLM_STREAM_COMPLETE: 'llm.streamComplete',
  LLM_STREAM_ERROR: 'llm.streamError',
  LLM_CANCEL_GENERATION: 'llm.cancelGeneration',
  LLM_TRUNCATION_WARNING: 'llm.truncationWarning',
  SETTINGS_GET_LAST_PR_URL: 'settings.getLastPrUrl',
  SETTINGS_SET_LAST_PR_URL: 'settings.setLastPrUrl',
  SETTINGS_GET_EXCLUDED_PATTERNS: 'settings.getExcludedPatterns',
  SETTINGS_SET_EXCLUDED_PATTERNS: 'settings.setExcludedPatterns',
  SETTINGS_GET_AI_PROVIDER: 'settings.getAiProvider',
  SETTINGS_SET_AI_PROVIDER: 'settings.setAiProvider',
  SETTINGS_GET_CLI_MODEL: 'settings.getCliModel',
  SETTINGS_SET_CLI_MODEL: 'settings.setCliModel',
  CLAUDE_CLI_CHECK_INSTALLED: 'claudeCli.checkInstalled',
  GIT_GET_BRANCH_DIFF: 'git.getBranchDiff',
  GIT_GET_UNCOMMITTED_DIFF: 'git.getUncommittedDiff',
  GIT_GET_FILE_AT_REF: 'git.getFileAtRef',
  GIT_FETCH_ORIGIN: 'git.fetchOrigin',
  GIT_GET_BRANCH: 'git.getBranch',
} as const

export type RepoOpenResult = {
  repoRoot: string
  displayName: string
}

export type DiffyApi = {
  getLastRepo: () => Promise<string | null>
  selectFolder: () => Promise<string | null>
  openRepo: (folderPath: string) => Promise<Result<RepoOpenResult>>
  getDiffContent: (request: DiffRequest) => Promise<Result<DiffContent>>
  onShortcutOpenRepo: (callback: () => void) => () => void
  onShortcutOpenSettings: (callback: () => void) => () => void
  setApiKey: (key: string) => Promise<Result<void>>
  hasApiKey: () => Promise<Result<boolean>>
  clearApiKey: () => Promise<Result<void>>
  checkGhInstalled: () => Promise<Result<boolean>>
  fetchPr: (ref: PrReference) => Promise<Result<PrData>>
  generateNarrative: (request: NarrativeGenerationRequest) => Promise<Result<string>>
  getCachedNarrativeReview: (
    lookup: NarrativeCacheLookup,
  ) => Promise<Result<NarrativeReviewCacheEntry | null>>
  onNarrativeStreamChunk: (callback: (requestId: string, chunk: string) => void) => () => void
  onNarrativeStreamComplete: (
    callback: (requestId: string, review: NarrativeReview) => void,
  ) => () => void
  onNarrativeStreamError: (callback: (requestId: string, error: string) => void) => () => void
  cancelGeneration: (requestId?: string) => Promise<Result<void>>
  getLastPrUrl: () => Promise<string | null>
  setLastPrUrl: (url: string) => Promise<Result<void>>
  onNarrativeTruncationWarning: (callback: (requestId: string) => void) => () => void
  getExcludedPatterns: () => Promise<Result<string[]>>
  setExcludedPatterns: (patterns: string[]) => Promise<Result<void>>
  getAiProvider: () => Promise<Result<AiProvider>>
  setAiProvider: (provider: AiProvider) => Promise<Result<void>>
  getCliModel: () => Promise<Result<string>>
  setCliModel: (model: string) => Promise<Result<void>>
  checkClaudeCliInstalled: () => Promise<Result<boolean>>
  getBranchDiff: () => Promise<Result<PrData>>
  getUncommittedDiff: () => Promise<Result<PrData>>
  getFileAtRef: (request: FileAtRefRequest) => Promise<Result<FileAtRefResult>>
  fetchOrigin: () => Promise<Result<void>>
  getBranch: () => Promise<Result<string>>
}
