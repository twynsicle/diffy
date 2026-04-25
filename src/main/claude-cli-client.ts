import type { PrData, Result } from '@shared/types'

import { parseNarrativeReview, type NarrativeResult } from './anthropic-client'
import { buildNarrativePrompt } from './narrative-prompt'
import { getExcludedFilePatterns } from './persisted-state'
import { spawnRunner } from './spawn-runner'

const FIRST_TOKEN_TIMEOUT_MS = 600_000
const IDLE_TIMEOUT_MS = 180_000

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

// Parse a stream-json line and extract the text delta.
// stream-json assistant events contain cumulative message content, so we track
// cumulativeTextLength and slice off only the new portion each time.
function parseStreamJsonLine(
  line: string,
  state: { cumulativeTextLength: number; stopReason: string | undefined; cliError: string | undefined },
): string | null {
  let event: unknown
  try {
    event = JSON.parse(line)
  } catch {
    return null
  }

  if (typeof event !== 'object' || event === null) return null
  const ev = event as Record<string, unknown>

  if (ev['type'] === 'result') {
    const isError = ev['is_error']
    if (isError === true) {
      const err = ev['error']
      state.cliError =
        typeof err === 'string'
          ? err
          : typeof err === 'object' && err !== null
            ? String((err as Record<string, unknown>)['message'] ?? 'CLI returned an error')
            : 'CLI returned an error'
    }
    return null
  }

  if (ev['type'] !== 'assistant') return null

  const msg = ev['message']
  if (typeof msg !== 'object' || msg === null) return null

  const reason = (msg as Record<string, unknown>)['stop_reason']
  if (typeof reason === 'string') {
    state.stopReason = reason
  }

  const content = (msg as Record<string, unknown>)['content']
  if (!Array.isArray(content)) return null

  const fullText = content
    .filter(
      (b): b is Record<string, unknown> =>
        typeof b === 'object' && b !== null && b['type'] === 'text',
    )
    .map((b) => b['text'] as string)
    .join('')

  const delta = fullText.slice(state.cumulativeTextLength)
  if (delta.length === 0) return null

  state.cumulativeTextLength = fullText.length
  return delta
}

export async function generateNarrativeCli(
  prData: PrData,
  onChunk: (text: string) => void,
  externalSignal?: AbortSignal,
  model?: string,
): Promise<NarrativeResult> {
  const userPatterns = getExcludedFilePatterns()
  const { system, user, wasTruncated, hunkIndex } = buildNarrativePrompt(prData, userPatterns)

  const args = [
    '-p',
    '--system-prompt',
    system,
    '--tools',
    '',
    '--output-format',
    'stream-json',
    '--include-partial-messages',
  ]
  if (model) {
    args.push('--model', model)
  }

  let accumulated = ''
  let chunkCount = 0
  const startTime = Date.now()

  let lineBuffer = ''
  const streamState = { cumulativeTextLength: 0, stopReason: undefined as string | undefined, cliError: undefined as string | undefined }

  console.log(
    `[claude-cli] Starting generation — model: ${model ?? 'default'}, system: ${system.length} chars, user: ${user.length} chars`,
  )

  const result = await spawnRunner({
    command: 'claude',
    args,
    timeoutMs: IDLE_TIMEOUT_MS,
    firstTokenTimeoutMs: FIRST_TOKEN_TIMEOUT_MS,
    resetTimeoutOnOutput: true,
    stdin: user,
    signal: externalSignal,
    timeoutError: 'CLI generation timed out after 3 minutes of inactivity',
    firstTokenTimeoutError: 'CLI generation timed out waiting for first response after 10 minutes',
    enoentError:
      'Claude CLI not found. Install Claude Code from https://docs.anthropic.com/en/docs/claude-code',
    onStdout: (chunk) => {
      lineBuffer += chunk
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        const delta = parseStreamJsonLine(line, streamState)
        if (delta === null) continue

        if (chunkCount === 0) {
          console.log(`[claude-cli] First token received after ${Date.now() - startTime}ms`)
        }
        chunkCount++
        accumulated += delta
        onChunk(delta)
      }
    },
    onStderr: (chunk) => {
      console.log(`[claude-cli] stderr: ${chunk.trimEnd()}`)
    },
  })

  const elapsedSecs = ((Date.now() - startTime) / 1000).toFixed(1)

  if (!result.ok) {
    console.log(
      `[claude-cli] Generation failed after ${elapsedSecs}s (${chunkCount} chunks received) — ${result.error}`,
    )
    if (result.error === 'Aborted') {
      return { ok: false, error: 'Generation cancelled', wasTruncated }
    }
    if (accumulated.length > 0) {
      const parseResult = parseNarrativeReview(accumulated, hunkIndex)
      if (parseResult.ok) {
        return { ...parseResult, wasTruncated, rawText: accumulated }
      }
    }
    return { ok: false, error: result.error, wasTruncated, rawText: accumulated || undefined }
  }

  const { exitCode, stderr } = result.data

  if (exitCode !== 0) {
    console.log(
      `[claude-cli] Process exited with code ${String(exitCode)} after ${elapsedSecs}s — stderr: ${stderr.trim() || '(empty)'}`,
    )
    return {
      ok: false,
      error: stderr.trim() || `claude exited with code ${String(exitCode)}`,
      wasTruncated,
      rawText: accumulated || undefined,
    }
  }

  if (streamState.cliError) {
    console.log(`[claude-cli] CLI error event after ${elapsedSecs}s — ${streamState.cliError}`)
    return { ok: false, error: streamState.cliError, wasTruncated, rawText: accumulated || undefined }
  }

  console.log(
    `[claude-cli] Generation complete in ${elapsedSecs}s — ${chunkCount} chunks, ${accumulated.length} chars, stop_reason: ${streamState.stopReason ?? 'unknown'}`,
  )

  const parseResult = parseNarrativeReview(accumulated, hunkIndex)
  if (!parseResult.ok) {
    const isTruncated =
      streamState.stopReason === 'max_tokens' ||
      (accumulated.includes('<narrative_review>') && !accumulated.includes('</narrative_review>'))
    if (isTruncated) {
      return {
        ok: false,
        error:
          'Narrative generation hit the model output limit before finishing. The response was cut off before the closing </narrative_review> tag.',
        wasTruncated,
        rawText: accumulated,
      }
    }
    return { ...parseResult, wasTruncated, rawText: accumulated }
  }

  return { ...parseResult, wasTruncated }
}
