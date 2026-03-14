import { describe, expect, it } from 'vitest'

import { spawnRunner } from '../spawn-runner'

describe('spawnRunner', () => {
  it('returns stdout on success', async () => {
    const result = await spawnRunner({
      command: 'echo',
      args: ['hello world'],
      timeoutMs: 5_000,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.exitCode).toBe(0)
    expect(result.data.stdout.trim()).toBe('hello world')
    expect(result.data.stderr).toBe('')
  })

  it('returns non-zero exit code without failing', async () => {
    const result = await spawnRunner({
      command: 'sh',
      args: ['-c', 'echo err >&2; exit 42'],
      timeoutMs: 5_000,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.exitCode).toBe(42)
    expect(result.data.stderr.trim()).toBe('err')
  })

  it('returns error for ENOENT with custom message', async () => {
    const result = await spawnRunner({
      command: 'nonexistent-binary-12345',
      args: [],
      timeoutMs: 5_000,
      enoentError: 'NOT_FOUND',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('NOT_FOUND')
  })

  it('returns generic error for ENOENT without custom message', async () => {
    const result = await spawnRunner({
      command: 'nonexistent-binary-12345',
      args: [],
      timeoutMs: 5_000,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('ENOENT')
  })

  it('times out and kills the process', async () => {
    const result = await spawnRunner({
      command: 'sleep',
      args: ['10'],
      timeoutMs: 100,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('timed out')
  })

  it('uses custom timeout error message', async () => {
    const result = await spawnRunner({
      command: 'sleep',
      args: ['10'],
      timeoutMs: 100,
      timeoutError: 'Too slow!',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('Too slow!')
  })

  it('pipes stdin to the process', async () => {
    const result = await spawnRunner({
      command: 'cat',
      args: [],
      timeoutMs: 5_000,
      stdin: 'piped input',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.stdout).toBe('piped input')
  })

  it('streams stdout via onStdout callback', async () => {
    const chunks: string[] = []
    const result = await spawnRunner({
      command: 'echo',
      args: ['streamed'],
      timeoutMs: 5_000,
      onStdout: (chunk) => {
        chunks.push(chunk)
      },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // stdout should be empty when onStdout is used (not buffered)
    expect(result.data.stdout).toBe('')
    expect(chunks.join('').trim()).toBe('streamed')
  })

  it('aborts via AbortSignal', async () => {
    const controller = new AbortController()
    // Abort after a short delay
    setTimeout(() => {
      controller.abort()
    }, 50)

    const result = await spawnRunner({
      command: 'sleep',
      args: ['10'],
      timeoutMs: 30_000,
      signal: controller.signal,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('Aborted')
  })

  it('returns aborted immediately if signal already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    const result = await spawnRunner({
      command: 'echo',
      args: ['should not run'],
      timeoutMs: 5_000,
      signal: controller.signal,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('Aborted')
  })
})
