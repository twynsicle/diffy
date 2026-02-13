import { spawn } from 'node:child_process'

import type { PrData, Result } from '@shared/types'

import { parseNarrativeReview, type NarrativeResult } from './anthropic-client'
import { buildNarrativePrompt } from './narrative-prompt'
import { getExcludedFilePatterns } from './persisted-state'

const TIMEOUT_MS = 180_000

export async function checkClaudeCliInstalled(): Promise<Result<boolean>> {
  return new Promise((resolve) => {
    const child = spawn('claude', ['--version'])

    let settled = false

    child.on('error', (err) => {
      if (!settled) {
        settled = true
        if ('code' in err && err.code === 'ENOENT') {
          resolve({ ok: true, data: false })
        } else {
          resolve({ ok: true, data: false })
        }
      }
    })

    child.on('close', (code) => {
      if (!settled) {
        settled = true
        resolve({ ok: true, data: code === 0 })
      }
    })
  })
}

export async function generateNarrativeCli(
  prData: PrData,
  onChunk: (text: string) => void,
  externalSignal?: AbortSignal,
  model?: string,
): Promise<NarrativeResult> {
  const userPatterns = getExcludedFilePatterns()
  const { system, user, wasTruncated } = buildNarrativePrompt(prData, userPatterns)

  const args = ['-p', '--system-prompt', system, '--tools', '']
  if (model) {
    args.push('--model', model)
  }

  return new Promise((resolve) => {
    const child = spawn('claude', args)

    let settled = false
    let accumulated = ''

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        child.kill('SIGTERM')
        resolve({ ok: false, error: 'CLI generation timed out after 3 minutes', wasTruncated })
      }
    }, TIMEOUT_MS)

    if (externalSignal) {
      const onAbort = (): void => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          child.kill('SIGTERM')
          resolve({ ok: false, error: 'Generation cancelled', wasTruncated })
        }
      }
      if (externalSignal.aborted) {
        onAbort()
        return
      }
      externalSignal.addEventListener('abort', onAbort, { once: true })
    }

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8')
      accumulated += text
      onChunk(text)
    })

    const stderrChunks: Buffer[] = []
    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk)
    })

    child.on('error', (err) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        if ('code' in err && err.code === 'ENOENT') {
          resolve({
            ok: false,
            error: 'Claude CLI not found. Install Claude Code from https://docs.anthropic.com/en/docs/claude-code',
            wasTruncated,
          })
        } else {
          resolve({ ok: false, error: `CLI error: ${err.message}`, wasTruncated })
        }
      }
    })

    child.on('close', (code) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)

        if (code !== 0) {
          const stderr = Buffer.concat(stderrChunks).toString('utf-8').trim()
          resolve({
            ok: false,
            error: stderr || `claude exited with code ${String(code)}`,
            wasTruncated,
            rawText: accumulated || undefined,
          })
          return
        }

        const parseResult = parseNarrativeReview(accumulated)
        if (!parseResult.ok) {
          resolve({ ...parseResult, wasTruncated, rawText: accumulated })
          return
        }

        resolve({ ...parseResult, wasTruncated })
      }
    })

    // Pipe user message via stdin to avoid OS arg length limits
    child.stdin.write(user)
    child.stdin.end()
  })
}
