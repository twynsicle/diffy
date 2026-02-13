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
}

export type DiffContent = {
  original: string
  modified: string
  language: string
  isBinary: boolean
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export type AppMode = 'diff-review' | 'narrative-review'

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
