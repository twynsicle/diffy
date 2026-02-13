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

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }
