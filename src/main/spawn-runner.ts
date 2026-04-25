import { spawn } from 'node:child_process'

import type { Result } from '@shared/types'

export type SpawnRunnerOptions = {
  command: string
  args: string[]
  timeoutMs: number
  firstTokenTimeoutMs?: number
  resetTimeoutOnOutput?: boolean
  stdin?: string
  signal?: AbortSignal
  onStdout?: (chunk: string) => void
  onStderr?: (chunk: string) => void
  enoentError?: string
  timeoutError?: string
  firstTokenTimeoutError?: string
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
    firstTokenTimeoutMs,
    resetTimeoutOnOutput,
    stdin,
    signal,
    onStdout,
    onStderr,
    enoentError,
    timeoutError,
    firstTokenTimeoutError,
  } = options

  return new Promise((res) => {
    const child = spawn(command, args)

    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    let settled = false
    let timer: ReturnType<typeof setTimeout>
    let firstTokenTimer: ReturnType<typeof setTimeout> | undefined
    let firstTokenReceived = false
    let lastOutputAt = Date.now()

    function armTimeout(): void {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const idleSecs = ((Date.now() - lastOutputAt) / 1000).toFixed(1)
        console.log(
          `[spawn-runner] ${command} timed out — no output for ${idleSecs}s (limit: ${timeoutMs / 1000}s)`,
        )
        child.kill('SIGTERM')
        settle({
          ok: false,
          error: timeoutError ?? `${command} command timed out after ${String(timeoutMs)}ms`,
        })
      }, timeoutMs)
    }

    function settle(result: Result<SpawnResult>): void {
      if (settled) return
      settled = true
      clearTimeout(timer)
      clearTimeout(firstTokenTimer)
      res(result)
    }

    if (firstTokenTimeoutMs !== undefined) {
      firstTokenTimer = setTimeout(() => {
        console.log(
          `[spawn-runner] ${command} timed out waiting for first token after ${firstTokenTimeoutMs / 1000}s`,
        )
        child.kill('SIGTERM')
        settle({
          ok: false,
          error:
            firstTokenTimeoutError ??
            `${command} timed out waiting for first response after ${String(firstTokenTimeoutMs)}ms`,
        })
      }, firstTokenTimeoutMs)
    } else {
      armTimeout()
    }

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
      lastOutputAt = Date.now()
      if (!firstTokenReceived) {
        firstTokenReceived = true
        clearTimeout(firstTokenTimer)
        armTimeout()
      } else if (resetTimeoutOnOutput) {
        armTimeout()
      }
      if (onStdout) {
        onStdout(chunk.toString('utf-8'))
      } else {
        stdoutChunks.push(chunk)
      }
    })

    child.stderr.on('data', (chunk: Buffer) => {
      lastOutputAt = Date.now()
      if (resetTimeoutOnOutput) {
        armTimeout()
      }
      const text = chunk.toString('utf-8')
      if (onStderr) {
        onStderr(text)
      }
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
