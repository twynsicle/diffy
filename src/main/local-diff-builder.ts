import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { PrData, PrFileChange, Result } from '@shared/types'

import { isBinary } from './detect-binary'
import { runGit } from './git-runner'

const DIFF_TIMEOUT_MS = 30_000
const MAX_UNTRACKED_FILE_SIZE = 100 * 1024

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf-8').digest('hex')
}

type NameStatusEntry = {
  status: string
  filename: string
  oldFilename?: string
}

function parseNameStatus(raw: string): NameStatusEntry[] {
  const entries: NameStatusEntry[] = []
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split('\t')
    if (parts.length < 2) continue
    const rawStatus = parts[0]
    const status = rawStatus[0]

    if ((status === 'R' || status === 'C') && parts.length >= 3) {
      entries.push({ status, filename: parts[2], oldFilename: parts[1] })
    } else {
      entries.push({ status, filename: parts[1] })
    }
  }
  return entries
}

type NumStatEntry = {
  filename: string
  additions: number
  deletions: number
}

function parseNumStat(raw: string): NumStatEntry[] {
  const entries: NumStatEntry[] = []
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split('\t')
    if (parts.length >= 3) {
      const additions = parts[0] === '-' ? 0 : Number(parts[0])
      const deletions = parts[1] === '-' ? 0 : Number(parts[1])
      entries.push({ filename: parts[2], additions, deletions })
    }
  }
  return entries
}

function mergeFileStats(nameStatus: NameStatusEntry[], numStat: NumStatEntry[]): PrFileChange[] {
  const numStatMap = new Map<string, NumStatEntry>()
  for (const entry of numStat) {
    numStatMap.set(entry.filename, entry)
  }

  return nameStatus.map((ns) => {
    const stats = numStatMap.get(ns.filename)
    return {
      filename: ns.filename,
      status: ns.status,
      additions: stats?.additions ?? 0,
      deletions: stats?.deletions ?? 0,
    }
  })
}

async function detectDefaultBranch(repoRoot: string): Promise<string> {
  const candidates = ['main', 'master', 'origin/main', 'origin/master']
  for (const candidate of candidates) {
    const result = await runGit({
      repoRoot,
      args: ['rev-parse', '--verify', candidate],
    })
    if (result.ok) return candidate
  }
  return 'main'
}

function buildSyntheticPatch(filename: string, content: string): string {
  const lines = content.split('\n')
  const header = [
    `diff --git a/${filename} b/${filename}`,
    'new file mode 100644',
    '--- /dev/null',
    `+++ b/${filename}`,
    `@@ -0,0 +1,${String(lines.length)} @@`,
  ]
  const body = lines.map((line) => `+${line}`)
  return [...header, ...body].join('\n')
}

export async function buildBranchDiff(repoRoot: string): Promise<Result<PrData>> {
  const branchResult = await runGit({
    repoRoot,
    args: ['rev-parse', '--abbrev-ref', 'HEAD'],
  })
  if (!branchResult.ok) {
    return { ok: false, error: `Failed to get current branch: ${branchResult.error}` }
  }
  const branch = branchResult.data.trim()

  const base = await detectDefaultBranch(repoRoot)

  const [
    diffResult,
    nameStatusResult,
    numStatResult,
    logResult,
    authorResult,
    headShaResult,
    baseShaResult,
  ] = await Promise.all([
    runGit({
      repoRoot,
      args: ['diff', `${base}...HEAD`],
      timeoutMs: DIFF_TIMEOUT_MS,
    }),
    runGit({
      repoRoot,
      args: ['diff', '--name-status', `${base}...HEAD`],
    }),
    runGit({
      repoRoot,
      args: ['diff', '--numstat', `${base}...HEAD`],
    }),
    runGit({
      repoRoot,
      args: ['log', '--oneline', `${base}..HEAD`],
    }),
    runGit({
      repoRoot,
      args: ['config', 'user.name'],
    }),
    runGit({
      repoRoot,
      args: ['rev-parse', 'HEAD'],
    }),
    runGit({
      repoRoot,
      args: ['rev-parse', base],
    }),
  ])

  if (!diffResult.ok) {
    return { ok: false, error: `Failed to get branch diff: ${diffResult.error}` }
  }

  const nameStatus = nameStatusResult.ok ? parseNameStatus(nameStatusResult.data) : []
  const numStat = numStatResult.ok ? parseNumStat(numStatResult.data) : []
  const files = mergeFileStats(nameStatus, numStat)
  const body = logResult.ok ? logResult.data.trim() : ''
  const author = authorResult.ok ? authorResult.data.trim() : 'Unknown'
  const headSha = headShaResult.ok ? headShaResult.data.trim() : ''
  const baseSha = baseShaResult.ok ? baseShaResult.data.trim() : ''

  return {
    ok: true,
    data: {
      title: `Branch: ${branch} vs ${base}`,
      body,
      author,
      baseRefName: base,
      headRefName: branch,
      files,
      diff: diffResult.data,
      cacheMetadata:
        headSha && baseSha
          ? {
              source: 'branch-diff',
              branchName: branch,
              headSha,
              baseSha,
            }
          : undefined,
    },
  }
}

export async function buildUncommittedDiff(repoRoot: string): Promise<Result<PrData>> {
  const [
    trackedDiffResult,
    nameStatusResult,
    numStatResult,
    untrackedResult,
    authorResult,
    headShaResult,
  ] = await Promise.all([
    runGit({
      repoRoot,
      args: ['diff', 'HEAD'],
      timeoutMs: DIFF_TIMEOUT_MS,
    }),
    runGit({
      repoRoot,
      args: ['diff', '--name-status', 'HEAD'],
    }),
    runGit({
      repoRoot,
      args: ['diff', '--numstat', 'HEAD'],
    }),
    runGit({
      repoRoot,
      args: ['ls-files', '--others', '--exclude-standard'],
    }),
    runGit({
      repoRoot,
      args: ['config', 'user.name'],
    }),
    runGit({
      repoRoot,
      args: ['rev-parse', 'HEAD'],
    }),
  ])

  if (!trackedDiffResult.ok) {
    return { ok: false, error: `Failed to get uncommitted diff: ${trackedDiffResult.error}` }
  }

  const nameStatus = nameStatusResult.ok ? parseNameStatus(nameStatusResult.data) : []
  const numStat = numStatResult.ok ? parseNumStat(numStatResult.data) : []
  const files = mergeFileStats(nameStatus, numStat)

  let fullDiff = trackedDiffResult.data
  const syntheticPatches: string[] = []

  if (untrackedResult.ok) {
    const untrackedFiles = untrackedResult.data
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0)

    for (const filename of untrackedFiles) {
      const filePath = join(repoRoot, filename)
      try {
        const content = await readFile(filePath, 'utf-8')

        if (isBinary(content) || content.length > MAX_UNTRACKED_FILE_SIZE) {
          files.push({
            filename,
            status: 'A',
            additions: 0,
            deletions: 0,
          })
          continue
        }

        const lines = content.split('\n')
        files.push({
          filename,
          status: 'A',
          additions: lines.length,
          deletions: 0,
        })
        syntheticPatches.push(buildSyntheticPatch(filename, content))
      } catch {
        // File unreadable — skip
      }
    }
  }

  if (syntheticPatches.length > 0) {
    fullDiff = fullDiff + '\n' + syntheticPatches.join('\n')
  }

  const author = authorResult.ok ? authorResult.data.trim() : 'Unknown'
  const headSha = headShaResult.ok ? headShaResult.data.trim() : ''
  const diffHash = sha256Hex(fullDiff)

  return {
    ok: true,
    data: {
      title: 'Uncommitted Changes',
      body: '',
      author,
      baseRefName: 'HEAD',
      headRefName: 'working tree',
      files,
      diff: fullDiff,
      cacheMetadata: headSha
        ? {
            source: 'uncommitted',
            headSha,
            diffHash,
          }
        : undefined,
    },
  }
}
