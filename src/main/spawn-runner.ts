import { spawn } from 'node:child_process'

import type { Result } from '@shared/types'

export type SpawnRunnerOptions = {
  command: string
  args: string[]
  timeoutMs: number
  stdin?: string
  signal?: AbortSignal
  onStdout?: (chunk: string) => void
  enoentError?: string
  timeoutError?: string
}

export type SpawnResult = {
  stdout: string
  stderr: string
  exitCode: number | null
}

export function spawnRunner(options: SpawnRunnerOptions): Promise<Result<SpawnResult>> {
  const {
    command,
    args,
    timeoutMs,
    stdin,
    signal,
    onStdout,
    enoentError,
    timeoutError,
  } = options

  return new Promise((res) => {
    const child = spawn(command, args)

    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    let settled = false

    function settle(result: Result<SpawnResult>): void {
      if (settled) return
      settled = true
      clearTimeout(timer)
      res(result)
    }

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      settle({
        ok: false,
        error: timeoutError ?? `${command} command timed out after ${String(timeoutMs)}ms`,
      })
    }, timeoutMs)

    if (signal) {
      const onAbort = (): void => {
        child.kill('SIGTERM')
        settle({ ok: false, error: 'Aborted' })
      }
      if (signal.aborted) {
        child.kill('SIGTERM')
        settle({ ok: false, error: 'Aborted' })
        return
      }
      signal.addEventListener('abort', onAbort, { once: true })
    }

    child.stdout.on('data', (chunk: Buffer) => {
      if (onStdout) {
        onStdout(chunk.toString('utf-8'))
      } else {
        stdoutChunks.push(chunk)
      }
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk)
    })

    child.on('error', (err) => {
      if ('code' in err && err.code === 'ENOENT' && enoentError !== undefined) {
        settle({ ok: false, error: enoentError })
      } else {
        settle({ ok: false, error: err.message })
      }
    })

    child.on('close', (code) => {
      const stdout = onStdout ? '' : Buffer.concat(stdoutChunks).toString('utf-8')
      const stderr = Buffer.concat(stderrChunks).toString('utf-8')
      settle({ ok: true, data: { stdout, stderr, exitCode: code } })
    })

    if (stdin !== undefined) {
      child.stdin.write(stdin)
      child.stdin.end()
    }
  })
}
