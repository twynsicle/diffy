import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'
import type {
  DiffContent,
  DiffRequest,
  FileAtRefRequest,
  FileAtRefResult,
  Result,
} from '@shared/types'

import { isBinary } from '../detect-binary'
import { isPathInsideRepo, runGit } from '../git-runner'
import { detectLanguage } from '../language-map'
import { buildBranchDiff, buildUncommittedDiff } from '../local-diff-builder'
import { narrativeDebugLog } from '../narrative-debug'
import { getCurrentRepoRoot } from '../repo-state'

type GitShowResult = {
  content: string
  exists: boolean
  error?: string
}

async function gitShow(repoRoot: string, ref: string): Promise<GitShowResult> {
  const result = await runGit({ repoRoot, args: ['show', ref] })
  if (!result.ok) {
    // New file or deleted at this ref; keep moving, but surface details in debug mode.
    narrativeDebugLog('git show failed', { repoRoot, ref, error: result.error })
    return { content: '', exists: false, error: result.error }
  }
  return { content: result.data, exists: true }
}

function countLines(text: string): number {
  if (text.length === 0) return 0
  return text.split('\n').length
}

export function registerDiffHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.GIT_GET_DIFF_CONTENT,
    async (_event, request: DiffRequest): Promise<Result<DiffContent>> => {
      const currentRepoRoot = getCurrentRepoRoot()
      if (!currentRepoRoot) {
        return { ok: false, error: 'No repository open' }
      }
      if (!isPathInsideRepo(currentRepoRoot, request.path)) {
        return { ok: false, error: 'Path is outside repository' }
      }

      const language = detectLanguage(request.path)
      let original: string
      let modified: string
      const origPath = request.origPath ?? request.path

      if (request.baseRef) {
        narrativeDebugLog('getDiffContent ref-based request', {
          path: request.path,
          origPath,
          baseRef: request.baseRef,
          headRef: request.headRef ?? 'HEAD',
        })
        // Verify refs exist locally before attempting diff
        const refsToCheck = [request.baseRef, request.headRef].filter(
          (r): r is string => r !== undefined && r !== 'HEAD' && r !== 'WORKTREE',
        )
        for (const ref of refsToCheck) {
          const exists = await runGit({
            repoRoot: currentRepoRoot,
            args: ['rev-parse', '--verify', ref],
          })
          if (!exists.ok) {
            return { ok: false, error: `Ref "${ref}" not found locally. Try: git fetch origin` }
          }
        }

        // Ref-based diff for narrative review
        const originalResult = await gitShow(currentRepoRoot, `${request.baseRef}:${origPath}`)
        original = originalResult.content

        if (request.headRef === 'WORKTREE') {
          try {
            modified = await readFile(join(currentRepoRoot, request.path), 'utf-8')
          } catch {
            modified = ''
          }
        } else {
          const headRef = request.headRef ?? 'HEAD'
          const modifiedResult = await gitShow(currentRepoRoot, `${headRef}:${request.path}`)
          modified = modifiedResult.content
        }
      } else if (request.section === 'unstaged') {
        // Unstaged: original = index, modified = worktree
        const indexResult = await gitShow(currentRepoRoot, `:${origPath}`)
        original = indexResult.content

        try {
          modified = await readFile(join(currentRepoRoot, request.path), 'utf-8')
        } catch {
          // File deleted from worktree
          modified = ''
        }
      } else {
        // Staged: original = HEAD, modified = index
        const headResult = await gitShow(currentRepoRoot, `HEAD:${origPath}`)
        original = headResult.content

        const indexResult = await gitShow(currentRepoRoot, `:${request.path}`)
        modified = indexResult.content
      }

      if (isBinary(original) || isBinary(modified)) {
        narrativeDebugLog('getDiffContent binary file', {
          path: request.path,
          baseRef: request.baseRef,
          headRef: request.headRef,
        })
        return { ok: true, data: { original: '', modified: '', language, isBinary: true } }
      }

      if (request.baseRef) {
        narrativeDebugLog('getDiffContent ref-based result', {
          path: request.path,
          originalLineCount: countLines(original),
          modifiedLineCount: countLines(modified),
        })
      }

      return { ok: true, data: { original, modified, language, isBinary: false } }
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.GIT_GET_FILE_AT_REF,
    async (_event, request: FileAtRefRequest): Promise<Result<FileAtRefResult>> => {
      narrativeDebugLog('getFileAtRef request', {
        path: request.path,
        baseRef: request.baseRef,
        headRef: request.headRef,
      })
      const currentRepoRoot = getCurrentRepoRoot()
      if (!currentRepoRoot) {
        return { ok: false, error: 'No repository open' }
      }
      if (!isPathInsideRepo(currentRepoRoot, request.path)) {
        return { ok: false, error: 'Path is outside repository' }
      }

      const language = detectLanguage(request.path)

      // Verify refs exist locally
      const refsToCheck = [request.baseRef, request.headRef].filter(
        (r) => r !== 'HEAD' && r !== 'WORKTREE',
      )
      for (const ref of refsToCheck) {
        const exists = await runGit({
          repoRoot: currentRepoRoot,
          args: ['rev-parse', '--verify', ref],
        })
        if (!exists.ok) {
          return { ok: false, error: `Ref "${ref}" not found locally. Try: git fetch origin` }
        }
      }

      const originalResult = await gitShow(currentRepoRoot, `${request.baseRef}:${request.path}`)
      const original = originalResult.content

      let modified: string
      let modifiedFound = true
      let modifiedError: string | undefined
      if (request.headRef === 'WORKTREE') {
        try {
          modified = await readFile(join(currentRepoRoot, request.path), 'utf-8')
        } catch {
          modified = ''
          modifiedFound = false
          modifiedError = 'Worktree file could not be read'
        }
      } else {
        const modifiedResult = await gitShow(currentRepoRoot, `${request.headRef}:${request.path}`)
        modified = modifiedResult.content
        modifiedFound = modifiedResult.exists
        modifiedError = modifiedResult.error
      }

      if (!originalResult.exists || !modifiedFound) {
        narrativeDebugLog('getFileAtRef missing blob(s)', {
          path: request.path,
          baseRef: request.baseRef,
          headRef: request.headRef,
          originalFound: originalResult.exists,
          modifiedFound,
          originalError: originalResult.error,
          modifiedError,
        })
      }

      if (isBinary(original) || isBinary(modified)) {
        narrativeDebugLog('getFileAtRef binary file', { path: request.path })
        return { ok: false, error: 'Binary file — cannot display diff' }
      }

      const originalLineCount = countLines(original)
      const modifiedLineCount = countLines(modified)
      narrativeDebugLog('getFileAtRef result', {
        path: request.path,
        originalLineCount,
        modifiedLineCount,
      })

      return {
        ok: true,
        data: {
          original,
          modified,
          language,
          originalLineCount,
          modifiedLineCount,
        },
      }
    },
  )

  ipcMain.handle(IPC_CHANNELS.GIT_GET_BRANCH_DIFF, async () => {
    const currentRepoRoot = getCurrentRepoRoot()
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }
    return buildBranchDiff(currentRepoRoot)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_GET_UNCOMMITTED_DIFF, async () => {
    const currentRepoRoot = getCurrentRepoRoot()
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }
    return buildUncommittedDiff(currentRepoRoot)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_GET_BRANCH, async (): Promise<Result<string>> => {
    const currentRepoRoot = getCurrentRepoRoot()
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' }
    }
    return runGit({ repoRoot: currentRepoRoot, args: ['branch', '--show-current'] }).then((r) =>
      r.ok ? { ok: true, data: r.data.trim() } : r,
    )
  })

  ipcMain.handle(IPC_CHANNELS.GIT_FETCH_ORIGIN, async (): Promise<Result<void>> => {
    const currentRepoRoot = getCurrentRepoRoot()
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' }
    }
    const result = await runGit({ repoRoot: currentRepoRoot, args: ['fetch', 'origin'] })
    return result.ok ? { ok: true, data: undefined } : result
  })
}
