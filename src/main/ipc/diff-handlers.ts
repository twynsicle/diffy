import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'
import type { DiffContent, DiffRequest, Result } from '@shared/types'

import { isBinary } from '../detect-binary'
import { isPathInsideRepo, runGit } from '../git-runner'
import { detectLanguage } from '../language-map'
import { buildBranchDiff, buildUncommittedDiff } from '../local-diff-builder'
import { getCurrentRepoRoot } from '../repo-state'

async function gitShow(repoRoot: string, ref: string): Promise<string> {
  const result = await runGit({ repoRoot, args: ['show', ref] })
  if (!result.ok) {
    // New file or deleted — no content at this ref
    return ''
  }
  return result.data
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
        // Verify refs exist locally before attempting diff
        const refsToCheck = [request.baseRef, request.headRef].filter(
          (r): r is string => r !== undefined && r !== 'HEAD' && r !== 'WORKTREE',
        )
        for (const ref of refsToCheck) {
          const exists = await runGit({ repoRoot: currentRepoRoot, args: ['rev-parse', '--verify', ref] })
          if (!exists.ok) {
            return { ok: false, error: `Ref "${ref}" not found locally. Try: git fetch origin` }
          }
        }

        // Ref-based diff for narrative review
        original = await gitShow(currentRepoRoot, `${request.baseRef}:${origPath}`)

        if (request.headRef === 'WORKTREE') {
          try {
            modified = await readFile(join(currentRepoRoot, request.path), 'utf-8')
          } catch {
            modified = ''
          }
        } else {
          const headRef = request.headRef ?? 'HEAD'
          modified = await gitShow(currentRepoRoot, `${headRef}:${request.path}`)
        }
      } else if (request.section === 'unstaged') {
        // Unstaged: original = index, modified = worktree
        const indexResult = await gitShow(currentRepoRoot, `:${origPath}`)
        original = indexResult

        try {
          modified = await readFile(join(currentRepoRoot, request.path), 'utf-8')
        } catch {
          // File deleted from worktree
          modified = ''
        }
      } else {
        // Staged: original = HEAD, modified = index
        const headResult = await gitShow(currentRepoRoot, `HEAD:${origPath}`)
        original = headResult

        const indexResult = await gitShow(currentRepoRoot, `:${request.path}`)
        modified = indexResult
      }

      if (isBinary(original) || isBinary(modified)) {
        return { ok: true, data: { original: '', modified: '', language, isBinary: true } }
      }

      return { ok: true, data: { original, modified, language, isBinary: false } }
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
}
