import type { FileChange, RepoStatus, Section } from '@shared/types'

/**
 * Status code to human label mapping.
 * X = index (staged), Y = worktree (unstaged).
 */
const STATUS_MAP: Record<string, string> = {
  M: 'M',
  A: 'A',
  D: 'D',
  R: 'R',
  C: 'C',
  T: 'T',
}

function makeFileChange(
  path: string,
  section: Section,
  statusCode: string,
  opts?: { origPath?: string; isUntracked?: boolean },
): FileChange {
  return {
    path,
    origPath: opts?.origPath,
    displayPath: opts?.origPath ? `${opts.origPath} → ${path}` : path,
    X: section === 'staged' ? statusCode : undefined,
    Y: section === 'unstaged' ? statusCode : undefined,
    isUntracked: opts?.isUntracked ?? false,
    isRenamed: statusCode === 'R' || statusCode === 'C',
    isDeleted: statusCode === 'D',
    section,
  }
}

export function parseStatus(raw: string): RepoStatus {
  const staged: FileChange[] = []
  const unstaged: FileChange[] = []

  if (!raw) {
    return { staged, unstaged }
  }

  const tokens = raw.split('\0')
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]
    if (!token) {
      i++
      continue
    }

    const recordType = token[0]

    if (recordType === '#' || recordType === '!') {
      // Header or ignored — skip
      i++
      continue
    }

    if (recordType === '?') {
      // Untracked: ? <path>
      const path = token.substring(2).replace(/\/$/, '')
      unstaged.push(makeFileChange(path, 'unstaged', 'A', { isUntracked: true }))
      i++
      continue
    }

    if (recordType === '1') {
      // Ordinary changed entry: 1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>
      // Fields are space-separated; there are 8 fields before the path
      const xy = token.substring(2, 4)
      const x = xy[0]
      const y = xy[1]

      // Count 8 space-separated fields, remainder is path
      const path = extractPathAfterFields(token, 8)

      if (x !== '.' && STATUS_MAP[x]) {
        staged.push(makeFileChange(path, 'staged', STATUS_MAP[x]))
      }
      if (y !== '.' && STATUS_MAP[y]) {
        unstaged.push(makeFileChange(path, 'unstaged', STATUS_MAP[y]))
      }

      i++
      continue
    }

    if (recordType === '2') {
      // Rename/copy entry: 2 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <X-score> <path>\0<origPath>
      // 9 fields before the path, then origPath is next NUL-separated token
      const xy = token.substring(2, 4)
      const x = xy[0]
      const y = xy[1]

      const path = extractPathAfterFields(token, 9)
      const origPath = tokens[i + 1] ?? ''

      if (x !== '.' && STATUS_MAP[x]) {
        staged.push(makeFileChange(path, 'staged', STATUS_MAP[x], { origPath }))
      }
      if (y !== '.' && STATUS_MAP[y]) {
        unstaged.push(makeFileChange(path, 'unstaged', STATUS_MAP[y], { origPath }))
      }

      i += 2 // consume path token + origPath token
      continue
    }

    if (recordType === 'u') {
      // Unmerged entry: u <XY> <sub> <m1> <m2> <m3> <mW> <h1> <h2> <h3> <path>
      // 10 fields before the path — treat as unstaged modified
      const path = extractPathAfterFields(token, 10)
      unstaged.push(makeFileChange(path, 'unstaged', 'M'))
      i++
      continue
    }

    // Unknown record type — skip
    i++
  }

  return { staged, unstaged }
}

function extractPathAfterFields(line: string, fieldCount: number): string {
  let pos = 0
  for (let f = 0; f < fieldCount; f++) {
    pos = line.indexOf(' ', pos)
    if (pos === -1) return ''
    pos++ // skip the space
  }
  return line.substring(pos)
}
