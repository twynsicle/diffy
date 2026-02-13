import { spawn } from 'node:child_process'
import { normalize, resolve } from 'node:path'

import type { Result } from '@shared/types'

const DEFAULT_TIMEOUT_MS = 10_000

type RunGitOptions = {
  repoRoot: string
  args: string[]
  timeoutMs?: number
}

export function runGit({
  repoRoot,
  args,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: RunGitOptions): Promise<Result<string>> {
  return new Promise((res) => {
    const child = spawn('git', ['-C', repoRoot, ...args])

    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        child.kill('SIGTERM')
        res({ ok: false, error: `Git command timed out after ${String(timeoutMs)}ms` })
      }
    }, timeoutMs)

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk)
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk)
    })

    child.on('error', (err) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        res({ ok: false, error: err.message })
      }
    })

    child.on('close', (code) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        if (code === 0) {
          res({ ok: true, data: Buffer.concat(stdoutChunks).toString('utf-8') })
        } else {
          const stderr = Buffer.concat(stderrChunks).toString('utf-8').trim()
          res({ ok: false, error: stderr || `Git exited with code ${String(code)}` })
        }
      }
    })
  })
}

export function isPathInsideRepo(repoRoot: string, targetPath: string): boolean {
  const normalizedRoot = normalize(resolve(repoRoot))
  const normalizedTarget = normalize(resolve(repoRoot, targetPath))
  return normalizedTarget.startsWith(normalizedRoot)
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
