import { realpathSync } from 'node:fs'
import { isAbsolute, normalize, resolve, sep } from 'node:path'

import type { Result } from '@shared/types'

import { spawnRunner } from './spawn-runner'

const DEFAULT_TIMEOUT_MS = 10_000
const INDEX_LOCK_RETRIES = 3
const INDEX_LOCK_DELAY_MS = 200

type RunGitOptions = {
  repoRoot: string
  args: string[]
  timeoutMs?: number
}

function isIndexLockError(stderr: string): boolean {
  return stderr.includes('index.lock') && stderr.includes('File exists')
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function runGit({
  repoRoot,
  args,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: RunGitOptions): Promise<Result<string>> {
  for (let attempt = 0; attempt <= INDEX_LOCK_RETRIES; attempt++) {
    const result = await spawnRunner({
      command: 'git',
      args: ['-C', repoRoot, ...args],
      timeoutMs,
    })
    if (!result.ok) return result
    const { exitCode, stdout, stderr } = result.data
    if (exitCode === 0) return { ok: true, data: stdout }

    if (isIndexLockError(stderr) && attempt < INDEX_LOCK_RETRIES) {
      await delay(INDEX_LOCK_DELAY_MS)
      continue
    }

    return { ok: false, error: stderr.trim() || `Git exited with code ${String(exitCode)}` }
  }

  return { ok: false, error: 'Git index.lock retry attempts exhausted' }
}

export function isPathInsideRepo(repoRoot: string, targetPath: string): boolean {
  if (isAbsolute(targetPath)) return false

  // Resolve symlinks on root if possible; fall back to normalize for synthetic/test paths
  let realRoot: string
  try {
    realRoot = realpathSync(repoRoot)
  } catch {
    realRoot = normalize(resolve(repoRoot))
  }

  const normalizedRoot = normalize(realRoot) + sep
  const normalizedTarget = normalize(resolve(realRoot, targetPath))

  // Exact root match (e.g. targetPath = "." or "")
  if (normalizedTarget + sep === normalizedRoot) return true

  // Resolve symlinks if file exists; fall back to normalized path for new files
  let resolvedTarget: string
  try {
    resolvedTarget = realpathSync(resolve(realRoot, targetPath))
  } catch {
    resolvedTarget = normalizedTarget
  }

  return resolvedTarget.startsWith(normalizedRoot)
}

export async function getRepoRoot(folderPath: string): Promise<Result<string>> {
  const result = await runGit({
    repoRoot: folderPath,
    args: ['rev-parse', '--show-toplevel'],
  })
  if (result.ok) {
    return { ok: true, data: result.data.trim() }
  }
  return result
}
