export type AiProvider = 'api' | 'cli'

export type Section = 'staged' | 'unstaged'

export type FileChange = {
  path: string
  origPath?: string
  displayPath: string
  X?: string
  Y?: string
  isUntracked: boolean
  isRenamed: boolean
  isDeleted: boolean
  section: Section
}

export type RepoStatus = {
  staged: FileChange[]
  unstaged: FileChange[]
}

export type DiffRequest = {
  path: string
  section: Section
  origPath?: string
  /** When set, use ref-based diff instead of section-based logic. */
  baseRef?: string
  /** Ref for the modified side. Special value 'WORKTREE' means read from filesystem. */
  headRef?: string
}

export type DiffContent = {
  original: string
  modified: string
  language: string
  isBinary: boolean
}

export type FileAtRefRequest = {
  path: string
  baseRef: string
  headRef: string
}

export type FileAtRefResult = {
  original: string
  modified: string
  language: string
  originalLineCount: number
  modifiedLineCount: number
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export type AppMode = 'workspace' | 'narrative-review'

export type NarrativeSource = 'github-pr' | 'branch-diff' | 'uncommitted'

export type PrReference = {
  owner: string
  repo: string
  number: number
}

export type PrFileChange = {
  filename: string
  status: string
  additions: number
  deletions: number
  patch?: string
}

export type PrData = {
  title: string
  body: string
  author: string
  baseRefName: string
  headRefName: string
  files: PrFileChange[]
  diff: string
}

export type DiffRange = {
  startLine: number
  endLine: number
}

export type DiffChunk = {
  filename: string
  language: string
  ranges: DiffRange[]
}

export type InsightType = 'context' | 'rationale' | 'highlight' | 'reference'

export type Insight = {
  type: InsightType
  text: string
}

export const SUMMARY_SECTION_ID = '__summary__'

export type NarrativeChapter = {
  id: string
  title: string
  insights: Insight[]
  diffChunks: DiffChunk[]
}

export type NarrativeReview = {
  prTitle: string
  overviewSummary: string
  chapters: NarrativeChapter[]
}
