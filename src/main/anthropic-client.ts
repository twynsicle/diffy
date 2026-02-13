import type { NarrativeReview, PrData, Result } from '@shared/types'

import { buildNarrativePrompt } from './narrative-prompt'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 16_000
const TIMEOUT_MS = 120_000

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

function parseNarrativeReview(text: string): Result<NarrativeReview> {
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

  return { ok: true, data: parsed as NarrativeReview }
}

export async function generateNarrative(
  prData: PrData,
  apiKey: string,
  onChunk: (text: string) => void,
): Promise<Result<NarrativeReview>> {
  const { system, user } = buildNarrativePrompt(prData)

  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, TIMEOUT_MS)

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
      return { ok: false, error: 'Request timed out after 2 minutes' }
    }
    const msg = err instanceof Error ? err.message : 'Network error'
    return { ok: false, error: `Failed to connect to Anthropic API: ${msg}` }
  }

  if (!response.ok) {
    clearTimeout(timeout)
    return { ok: false, error: parseHttpError(response.status) }
  }

  const body = response.body
  if (!body) {
    clearTimeout(timeout)
    return { ok: false, error: 'Response body is empty' }
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
      return { ok: false, error: 'Request timed out after 2 minutes' }
    }
    const msg = err instanceof Error ? err.message : 'Stream read error'
    return { ok: false, error: `Error reading response stream: ${msg}` }
  }

  clearTimeout(timeout)
  return parseNarrativeReview(accumulated)
}
