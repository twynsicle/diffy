import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PrData } from '@shared/types'

const { spawnRunnerMock } = vi.hoisted(() => ({
  spawnRunnerMock: vi.fn(),
}))

vi.mock('./persisted-state', () => ({
  getExcludedFilePatterns: () => [],
}))

vi.mock('./spawn-runner', () => ({
  spawnRunner: spawnRunnerMock,
}))

import { generateNarrativeCli } from './claude-cli-client'

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

describe('generateNarrativeCli', () => {
  beforeEach(() => {
    spawnRunnerMock.mockReset()
  })

  it('returns a parsed review if the CLI times out after already printing a full response', async () => {
    spawnRunnerMock.mockImplementation(async (options: { onStdout?: (chunk: string) => void }) => {
      options.onStdout?.(
        '<narrative_review>{"prTitle":"Test PR","overviewSummary":"Summary","chapters":[]}</narrative_review>',
      )
      return { ok: false, error: 'CLI generation timed out after 3 minutes of inactivity' }
    })

    const result = await generateNarrativeCli(createPrData(), () => {})

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.prTitle).toBe('Test PR')
    expect(result.data.overviewSummary).toBe('Summary')
  })

  it('returns partial raw text when the CLI times out before finishing the response', async () => {
    spawnRunnerMock.mockImplementation(async (options: { onStdout?: (chunk: string) => void }) => {
      options.onStdout?.('<narrative_review>{"prTitle":"Test PR",')
      return { ok: false, error: 'CLI generation timed out after 3 minutes of inactivity' }
    })

    const result = await generateNarrativeCli(createPrData(), () => {})

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error).toContain('3 minutes of inactivity')
    expect(result.rawText).toContain('<narrative_review>')
  })
})
