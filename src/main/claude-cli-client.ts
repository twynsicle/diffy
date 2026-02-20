import type { PrData, Result } from '@shared/types'

import { parseNarrativeReview, type NarrativeResult } from './anthropic-client'
import { buildNarrativePrompt } from './narrative-prompt'
import { getExcludedFilePatterns } from './persisted-state'
import { spawnRunner } from './spawn-runner'

const TIMEOUT_MS = 180_000

export async function checkClaudeCliInstalled(): Promise<Result<boolean>> {
  const result = await spawnRunner({
    command: 'claude',
    args: ['--version'],
    timeoutMs: 10_000,
    enoentError: 'NOT_FOUND',
  })
  if (!result.ok) return { ok: true, data: false }
  return { ok: true, data: result.data.exitCode === 0 }
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

  let accumulated = ''

  const result = await spawnRunner({
    command: 'claude',
    args,
    timeoutMs: TIMEOUT_MS,
    stdin: user,
    signal: externalSignal,
    timeoutError: 'CLI generation timed out after 3 minutes',
    enoentError: 'Claude CLI not found. Install Claude Code from https://docs.anthropic.com/en/docs/claude-code',
    onStdout: (chunk) => {
      accumulated += chunk
      onChunk(chunk)
    },
  })

  if (!result.ok) {
    if (result.error === 'Aborted') {
      return { ok: false, error: 'Generation cancelled', wasTruncated }
    }
    return { ok: false, error: result.error, wasTruncated }
  }

  const { exitCode, stderr } = result.data

  if (exitCode !== 0) {
    return {
      ok: false,
      error: stderr.trim() || `claude exited with code ${String(exitCode)}`,
      wasTruncated,
      rawText: accumulated || undefined,
    }
  }

  const parseResult = parseNarrativeReview(accumulated)
  if (!parseResult.ok) {
    return { ...parseResult, wasTruncated, rawText: accumulated }
  }

  return { ...parseResult, wasTruncated }
}
