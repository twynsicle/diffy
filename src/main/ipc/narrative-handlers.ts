import { BrowserWindow, ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'
import type { PrData, Result } from '@shared/types'

import { generateNarrative } from '../anthropic-client'
import { checkClaudeCliInstalled, generateNarrativeCli } from '../claude-cli-client'
import { narrativeDebugLog } from '../narrative-debug'
import { getAiProvider, getCliModel } from '../persisted-state'
import { getApiKey } from '../secure-storage'

const activeGenerations = new Map<string, AbortController>()
let narrativeRequestId = 0

export function registerNarrativeHandlers(mainWindow: BrowserWindow): { cleanup: () => void } {
  ipcMain.handle(IPC_CHANNELS.LLM_GENERATE_NARRATIVE, (_event, prData: unknown) => {
    if (
      typeof prData !== 'object' ||
      prData === null ||
      typeof (prData as PrData).title !== 'string' ||
      typeof (prData as PrData).diff !== 'string' ||
      !Array.isArray((prData as PrData).files)
    ) {
      return { ok: false, error: 'Invalid PR data' } satisfies Result<never>
    }

    const provider = getAiProvider()

    if (provider === 'api') {
      const apiKey = getApiKey()
      if (!apiKey) {
        return { ok: false, error: 'No API key configured' } satisfies Result<never>
      }
    }

    narrativeRequestId += 1
    const requestId = String(narrativeRequestId)
    narrativeDebugLog('generation requested', {
      requestId,
      provider,
      title: (prData as PrData).title,
      fileCount: (prData as PrData).files.length,
      baseRefName: (prData as PrData).baseRefName,
      headRefName: (prData as PrData).headRefName,
    })

    const controller = new AbortController()
    activeGenerations.set(requestId, controller)

    void (async (): Promise<void> => {
      const onChunk = (chunk: string): void => {
        mainWindow.webContents.send(IPC_CHANNELS.LLM_STREAM_CHUNK, requestId, chunk)
      }

      const result = provider === 'cli'
        ? await generateNarrativeCli(
          prData as PrData,
          onChunk,
          controller.signal,
          getCliModel() || undefined,
        )
        : await generateNarrative(
          prData as PrData,
          getApiKey(),
          onChunk,
          controller.signal,
        )

      activeGenerations.delete(requestId)

      if (result.wasTruncated) {
        mainWindow.webContents.send(IPC_CHANNELS.LLM_TRUNCATION_WARNING, requestId)
      }

      if (result.ok) {
        narrativeDebugLog('generation completed', {
          requestId,
          chapterCount: result.data.chapters.length,
          wasTruncated: result.wasTruncated === true,
        })
        mainWindow.webContents.send(IPC_CHANNELS.LLM_STREAM_COMPLETE, requestId, result.data)
      } else {
        narrativeDebugLog('generation failed', {
          requestId,
          error: result.error,
          wasTruncated: result.wasTruncated === true,
        })
        mainWindow.webContents.send(IPC_CHANNELS.LLM_STREAM_ERROR, requestId, result.error)
      }
    })()

    return { ok: true, data: requestId } satisfies Result<string>
  })

  ipcMain.handle(IPC_CHANNELS.LLM_CANCEL_GENERATION, (_event, targetRequestId?: string) => {
    narrativeDebugLog('cancel requested', { targetRequestId })
    if (targetRequestId) {
      const controller = activeGenerations.get(targetRequestId)
      if (controller) {
        controller.abort()
        activeGenerations.delete(targetRequestId)
      }
    } else {
      for (const controller of activeGenerations.values()) {
        controller.abort()
      }
      activeGenerations.clear()
    }
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.CLAUDE_CLI_CHECK_INSTALLED, async () => {
    return checkClaudeCliInstalled()
  })

  function cleanup(): void {
    for (const controller of activeGenerations.values()) {
      controller.abort()
    }
    activeGenerations.clear()
  }

  return { cleanup }
}
