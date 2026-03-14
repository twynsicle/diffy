import type { PrData, PrFileChange, PrReference, Result } from '@shared/types'

import { spawnRunner } from './spawn-runner'

const DEFAULT_TIMEOUT_MS = 30_000

async function runGh(
  args: string[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Result<string>> {
  const result = await spawnRunner({
    command: 'gh',
    args,
    timeoutMs,
    enoentError: 'ENOENT',
  })
  if (!result.ok) return result
  const { exitCode, stdout, stderr } = result.data
  if (exitCode === 0) return { ok: true, data: stdout }
  return { ok: false, error: stderr.trim() || `gh exited with code ${String(exitCode)}` }
}

async function runGhWithRetry(
  args: string[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Result<string>> {
  const result = await runGh(args, timeoutMs)
  if (!result.ok && result.error.includes('timed out')) {
    return runGh(args, timeoutMs * 2)
  }
  return result
}

export async function checkGhInstalled(): Promise<Result<boolean>> {
  const result = await runGh(['--version'])
  if (!result.ok) {
    if (result.error === 'ENOENT') {
      return { ok: true, data: false }
    }
    return { ok: true, data: false }
  }
  return { ok: true, data: true }
}

export async function fetchPrData(ref: PrReference): Promise<Result<PrData>> {
  const repoFlag = `${ref.owner}/${ref.repo}`
  const prNum = String(ref.number)

  // 1. Fetch PR metadata
  const metaResult = await runGhWithRetry([
    'pr',
    'view',
    prNum,
    '--repo',
    repoFlag,
    '--json',
    'title,body,author,baseRefName,headRefName',
  ])
  if (!metaResult.ok) return metaResult

  let meta: {
    title: string
    body: string
    author: { login: string }
    baseRefName: string
    headRefName: string
  }
  try {
    meta = JSON.parse(metaResult.data) as typeof meta
  } catch {
    return { ok: false, error: 'Failed to parse PR metadata JSON' }
  }

  // 2. Fetch PR files
  const filesResult = await runGhWithRetry([
    'api',
    `repos/${repoFlag}/pulls/${prNum}/files`,
    '--paginate',
  ])
  if (!filesResult.ok) return filesResult

  let rawFiles: Array<{
    filename: string
    status: string
    additions: number
    deletions: number
    patch?: string
  }>
  try {
    // gh api --paginate may concatenate JSON arrays as [...][...] in some versions
    const text = filesResult.data.trim()
    if (text.startsWith('[') && text.includes('][')) {
      const fixed = text.replace(/\]\s*\[/g, ',')
      rawFiles = JSON.parse(fixed) as typeof rawFiles
    } else {
      rawFiles = JSON.parse(text) as typeof rawFiles
    }
  } catch {
    return { ok: false, error: 'Failed to parse PR files JSON' }
  }

  const files: PrFileChange[] = rawFiles.map((f) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch,
  }))

  // 3. Fetch PR diff
  const diffResult = await runGhWithRetry(['pr', 'diff', prNum, '--repo', repoFlag])
  if (!diffResult.ok) return diffResult

  return {
    ok: true,
    data: {
      title: meta.title,
      body: meta.body,
      author: meta.author.login,
      baseRefName: meta.baseRefName,
      headRefName: meta.headRefName,
      files,
      diff: diffResult.data,
    },
  }
}
