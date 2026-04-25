import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PrData } from '@shared/types'

vi.mock('./persisted-state', () => ({
  getExcludedFilePatterns: () => [],
}))

import { generateNarrative } from './anthropic-client'

function createPrData(): PrData {
  return {
    title: 'Test PR',
    body: 'Body',
    author: 'Test Author',
    baseRefName: 'main',
    headRefName: 'feature/test',
    files: [],
    diff: '',
  }
}

function createSseResponse(chunks: readonly string[]): Response {
  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk))
        }
        controller.close()
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
      },
    },
  )
}

describe('generateNarrative Anthropic streaming', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('parses a response when the final SSE line has no trailing newline', async () => {
    const responseText =
      '<narrative_review>{"prTitle":"Test PR","overviewSummary":"Summary","chapters":[]}</narrative_review>'

    globalThis.fetch = vi.fn().mockResolvedValue(
      createSseResponse([
        `data: ${JSON.stringify({
          type: 'content_block_delta',
          delta: { text: responseText },
        })}`,
      ]),
    ) as typeof fetch

    const result = await generateNarrative(createPrData(), 'test-api-key', () => {})

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.prTitle).toBe('Test PR')
    expect(result.data.overviewSummary).toBe('Summary')
  })

  it('returns an explicit output-limit error when Anthropic stops at max_tokens', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      createSseResponse([
        `data: ${JSON.stringify({
          type: 'content_block_delta',
          delta: { text: '<narrative_review>{"prTitle":"Test PR",' },
        })}\n\n`,
        `data: ${JSON.stringify({
          type: 'message_delta',
          delta: { stop_reason: 'max_tokens' },
        })}\n\n`,
      ]),
    ) as typeof fetch

    const result = await generateNarrative(createPrData(), 'test-api-key', () => {})

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error).toContain('model output limit')
    expect(result.error).toContain('</narrative_review>')
    expect(result.rawText).toContain('<narrative_review>')
  })
})
