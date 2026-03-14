import type { Insight, NarrativeReview, PrData, ResolvedDiffHunk, Result } from '@shared/types'

import { buildNarrativePrompt } from './narrative-prompt'
import type { DiffHunkIndex } from './diff-hunk-catalog'
import { narrativeDebugLog } from './narrative-debug'
import { getExcludedFilePatterns } from './persisted-state'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 16_000
const TIMEOUT_MS = 120_000
const RETRY_WAIT_MS = 15_000

function parseHttpError(status: number): string {
  switch (status) {
    case 401:
      return 'Invalid API key. Check your Anthropic API key in Settings.'
    case 429:
      return 'Rate limited by the Anthropic API. Please wait a moment and try again.'
    case 529:
      return 'Anthropic API is temporarily overloaded. Please try again later.'
    default:
      return `Anthropic API returned HTTP ${String(status)}`
  }
}

function extractHunksFromHunkIds(
  chunk: Record<string, unknown>,
  hunkIndex: DiffHunkIndex | undefined,
  chapterId: string,
): ResolvedDiffHunk[] {
  if (!hunkIndex) return []
  if (!Array.isArray(chunk['hunkIds'])) return []

  const filename = typeof chunk['filename'] === 'string' ? chunk['filename'] : ''
  const hunkIds = (chunk['hunkIds'] as unknown[]).filter(
    (id): id is string => typeof id === 'string',
  )
  const dedupedHunks = new Map<string, ResolvedDiffHunk>()

  for (const hunkId of hunkIds) {
    const hunk = hunkIndex.byId[hunkId]
    if (!hunk) {
      narrativeDebugLog('unknown hunk id in response', { chapterId, filename, hunkId })
      continue
    }
    if (hunk.filename !== filename) {
      narrativeDebugLog('hunk id filename mismatch', {
        chapterId,
        filename,
        hunkId,
        hunkFilename: hunk.filename,
      })
      continue
    }
    dedupedHunks.set(hunk.id, {
      id: hunk.id,
      fileOrder: hunk.fileOrder,
      original: { ...hunk.original },
      modified: { ...hunk.modified },
    })
  }

  return [...dedupedHunks.values()].sort((a, b) => a.fileOrder - b.fileOrder)
}

export function parseNarrativeReview(
  text: string,
  hunkIndex?: DiffHunkIndex,
): Result<NarrativeReview> {
  const startTag = '<narrative_review>'
  const endTag = '</narrative_review>'
  const startIdx = text.indexOf(startTag)
  const endIdx = text.indexOf(endTag)

  if (startIdx === -1 || endIdx === -1) {
    return { ok: false, error: 'Response did not contain expected <narrative_review> tags' }
  }

  const jsonStr = text.slice(startIdx + startTag.length, endIdx).trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    return { ok: false, error: 'Failed to parse narrative review JSON from response' }
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as NarrativeReview).prTitle !== 'string' ||
    typeof (parsed as NarrativeReview).overviewSummary !== 'string' ||
    !Array.isArray((parsed as NarrativeReview).chapters)
  ) {
    return { ok: false, error: 'Narrative review JSON is missing required fields' }
  }

  // Validate and normalize each chapter — parsed JSON may have missing/malformed fields
  type RawChapter = Record<string, unknown> & { summary?: string }
  const rawChapters = (parsed as { chapters: RawChapter[] }).chapters

  for (let i = 0; i < rawChapters.length; i++) {
    const ch = rawChapters[i]
    const chapterId = typeof ch['id'] === 'string' ? ch['id'] : `chapter-${String(i + 1)}`

    // Ensure id and title
    if (typeof ch['id'] !== 'string' || ch['id'].length === 0) {
      ch['id'] = `chapter-${String(i + 1)}`
    }
    if (typeof ch['title'] !== 'string' || ch['title'].length === 0) {
      ch['title'] = `Chapter ${String(i + 1)}`
    }

    // Backward-compat: summary → insights
    if (!Array.isArray(ch['insights']) && typeof ch.summary === 'string') {
      ch['insights'] = [{ type: 'context', text: ch.summary } satisfies Insight]
      delete ch.summary
    }

    // Ensure insights is an array and filter invalid entries
    if (!Array.isArray(ch['insights'])) {
      ch['insights'] = []
    }
    ch['insights'] = (ch['insights'] as unknown[]).filter(
      (ins) =>
        typeof ins === 'object' &&
        ins !== null &&
        typeof (ins as Record<string, unknown>)['type'] === 'string' &&
        typeof (ins as Record<string, unknown>)['text'] === 'string',
    )

    // Ensure diffChunks is an array and filter invalid entries
    if (!Array.isArray(ch['diffChunks'])) {
      ch['diffChunks'] = []
    }
    ch['diffChunks'] = (ch['diffChunks'] as unknown[]).filter(
      (chunk) =>
        typeof chunk === 'object' &&
        chunk !== null &&
        typeof (chunk as Record<string, unknown>)['filename'] === 'string',
    )

    // Resolve hunk IDs on valid chunks.
    for (const chunk of ch['diffChunks'] as Record<string, unknown>[]) {
      if (typeof chunk['language'] !== 'string') {
        chunk['language'] = 'plaintext'
      }

      const resolvedHunks = extractHunksFromHunkIds(chunk, hunkIndex, chapterId)
      chunk['hunks'] = resolvedHunks

      narrativeDebugLog('normalized chunk hunks', {
        chapterId,
        filename: chunk['filename'],
        hunkIdCount: Array.isArray(chunk['hunkIds']) ? chunk['hunkIds'].length : 0,
        resolvedHunkCount: resolvedHunks.length,
        fileOrders: resolvedHunks.map((hunk) => hunk.fileOrder),
      })
    }

    // Filter out chunks with no valid hunks.
    const beforeFilterCount = (ch['diffChunks'] as Record<string, unknown>[]).length
    ch['diffChunks'] = (ch['diffChunks'] as Record<string, unknown>[]).filter(
      (chunk) => Array.isArray(chunk['hunks']) && (chunk['hunks'] as ResolvedDiffHunk[]).length > 0,
    )
    const afterFilterCount = (ch['diffChunks'] as Record<string, unknown>[]).length
    if (afterFilterCount < beforeFilterCount) {
      narrativeDebugLog('dropped chunks with empty hunks', {
        chapterId,
        dropped: beforeFilterCount - afterFilterCount,
      })
    }
  }

  narrativeDebugLog('parsed narrative review', {
    chapterCount: (parsed as NarrativeReview).chapters.length,
  })

  return { ok: true, data: parsed as NarrativeReview }
}

export type NarrativeResult = Result<NarrativeReview> & { wasTruncated?: boolean; rawText?: string }

async function doStreamRequest(
  system: string,
  user: string,
  apiKey: string,
  onChunk: (text: string) => void,
  externalSignal?: AbortSignal,
): Promise<{ accumulated: string; error?: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, TIMEOUT_MS)

  if (externalSignal) {
    const onAbort = (): void => {
      controller.abort()
    }
    externalSignal.addEventListener('abort', onAbort, { once: true })
    // Clean up if we finish before external abort
    controller.signal.addEventListener(
      'abort',
      () => {
        externalSignal.removeEventListener('abort', onAbort)
      },
      { once: true },
    )
  }

  let response: Response
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        stream: true,
        system,
        messages: [{ role: 'user' as const, content: user }],
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof Error && err.name === 'AbortError') {
      if (externalSignal?.aborted) {
        return { accumulated: '', error: 'Generation cancelled' }
      }
      return { accumulated: '', error: 'Request timed out after 2 minutes' }
    }
    const msg = err instanceof Error ? err.message : 'Network error'
    return { accumulated: '', error: `Failed to connect to Anthropic API: ${msg}` }
  }

  if (!response.ok) {
    clearTimeout(timeout)
    // Return status for 529 retry handling
    if (response.status === 529) {
      return { accumulated: '', error: `529` }
    }
    return { accumulated: '', error: parseHttpError(response.status) }
  }

  const body = response.body
  if (!body) {
    clearTimeout(timeout)
    return { accumulated: '', error: 'Response body is empty' }
  }

  let accumulated = ''
  let lineBuffer = ''
  const reader = body.getReader()
  const decoder = new TextDecoder()

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      lineBuffer += decoder.decode(value, { stream: true })
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') continue

        let event: unknown
        try {
          event = JSON.parse(data)
        } catch {
          continue
        }

        if (
          typeof event === 'object' &&
          event !== null &&
          (event as { type: string }).type === 'content_block_delta'
        ) {
          const text = (event as { delta?: { text?: string } }).delta?.text
          if (text !== undefined) {
            accumulated += text
            onChunk(text)
          }
        }
      }
    }
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof Error && err.name === 'AbortError') {
      if (externalSignal?.aborted) {
        return { accumulated, error: 'Generation cancelled' }
      }
      return { accumulated, error: 'Request timed out after 2 minutes' }
    }
    const msg = err instanceof Error ? err.message : 'Stream read error'
    return { accumulated, error: `Error reading response stream: ${msg}` }
  }

  clearTimeout(timeout)
  return { accumulated }
}

export async function generateNarrative(
  prData: PrData,
  apiKey: string,
  onChunk: (text: string) => void,
  externalSignal?: AbortSignal,
): Promise<NarrativeResult> {
  const userPatterns = getExcludedFilePatterns()
  const { system, user, wasTruncated, hunkIndex } = buildNarrativePrompt(prData, userPatterns)

  let streamResult = await doStreamRequest(system, user, apiKey, onChunk, externalSignal)

  // 529 retry: wait 15s with countdown, then retry once
  if (streamResult.error === '529') {
    const totalSeconds = Math.ceil(RETRY_WAIT_MS / 1000)
    for (let s = totalSeconds; s > 0; s--) {
      if (externalSignal?.aborted) {
        return { ok: false, error: 'Generation cancelled' }
      }
      onChunk(`\n[API busy — retrying in ${String(s)}s...]\n`)
      await new Promise((resolve) => {
        setTimeout(resolve, 1000)
      })
    }
    streamResult = await doStreamRequest(system, user, apiKey, onChunk, externalSignal)
    if (streamResult.error === '529') {
      return { ok: false, error: parseHttpError(529), wasTruncated }
    }
  }

  if (streamResult.error) {
    return {
      ok: false,
      error: streamResult.error,
      wasTruncated,
      rawText: streamResult.accumulated || undefined,
    }
  }

  const parseResult = parseNarrativeReview(streamResult.accumulated, hunkIndex)

  if (!parseResult.ok) {
    return { ...parseResult, wasTruncated, rawText: streamResult.accumulated }
  }

  return { ...parseResult, wasTruncated }
}
