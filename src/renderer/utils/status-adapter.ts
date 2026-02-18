import type { FileChange, PrFileChange } from '@shared/types'

export function prStatusToCode(status: string): string {
  // Normalize git status codes like "R100" or "C095" to just the letter
  const normalized = /^[A-Z]\d+$/.test(status) ? status[0] : status

  switch (normalized) {
    // GitHub API status strings
    case 'added':
      return 'A'
    case 'modified':
      return 'M'
    case 'removed':
      return 'D'
    case 'renamed':
      return 'R'
    // Git single-letter status codes (from local diff sources)
    case 'A':
    case 'M':
    case 'D':
    case 'R':
    case 'C':
    case 'T':
      return normalized
    default:
      return '?'
  }
}

export function prFileToFileChange(pf: PrFileChange): FileChange {
  const code = prStatusToCode(pf.status)
  return {
    path: pf.filename,
    displayPath: pf.filename,
    isUntracked: code === 'A',
    isRenamed: code === 'R',
    isDeleted: code === 'D',
    X: code,
    Y: code,
    section: 'unstaged',
  }
}
