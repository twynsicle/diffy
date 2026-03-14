import { BrowserWindow, ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'
import type {
  NarrativeCacheContext,
  NarrativeGenerationRequest,
  NarrativeSource,
  PrData,
  PrReference,
  Result,
} from '@shared/types'

import { generateNarrative } from '../anthropic-client'
import { checkClaudeCliInstalled, generateNarrativeCli } from '../claude-cli-client'
import { narrativeDebugLog } from '../narrative-debug'
import {
  getAiProvider,
  getCachedNarrativeReview,
  getCliModel,
  setCachedNarrativeReview,
} from '../persisted-state'
import { getApiKey } from '../secure-storage'

const activeGenerations = new Map<string, AbortController>()
let narrativeRequestId = 0

type NormalizedNarrativeGenerationRequest = {
  prData: PrData
  source: NarrativeSource | null
  prRef?: PrReference
  cacheContext?: NarrativeCacheContext
}

function isPrData(value: unknown): value is PrData {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PrData).title === 'string' &&
    typeof (value as PrData).diff === 'string' &&
    !Number.isNaN(Array.isArray((value as PrData).files) ? 0 : Number.NaN) &&
    Array.isArray((value as PrData).files)
  )
}

function validateCacheContext(
  source: NarrativeSource,
  cacheContext: unknown,
): { ok: true; data: NarrativeCacheContext } | { ok: false; error: string } {
  if (typeof cacheContext !== 'object' || cacheContext === null) {
    return { ok: false, error: 'missing request.cacheContext' }
  }

  if ((cacheContext as { source?: unknown }).source !== source) {
    return { ok: false, error: 'request.cacheContext.source does not match request.source' }
  }

  if (source === 'github-pr') {
    return { ok: true, data: cacheContext as NarrativeCacheContext }
  }

  if (
    source === 'branch-diff' &&
    typeof (cacheContext as { branchName?: unknown }).branchName === 'string' &&
    typeof (cacheContext as { headSha?: unknown }).headSha === 'string' &&
    typeof (cacheContext as { baseSha?: unknown }).baseSha === 'string'
  ) {
    return { ok: true, data: cacheContext as NarrativeCacheContext }
  }

  if (
    source === 'uncommitted' &&
    typeof (cacheContext as { headSha?: unknown }).headSha === 'string' &&
    typeof (cacheContext as { diffHash?: unknown }).diffHash === 'string'
  ) {
    return { ok: true, data: cacheContext as NarrativeCacheContext }
  }

  return { ok: false, error: `request.cacheContext is invalid for source "${source}"` }
}

function normalizeNarrativeGenerationRequest(
  request: unknown,
): Result<NormalizedNarrativeGenerationRequest> {
  if (isPrData(request)) {
    return {
      ok: true,
      data: {
        prData: request,
        source: null,
      },
    }
  }

  if (typeof request !== 'object' || request === null) {
    return { ok: false, error: 'request must be an object' }
  }

  const payload = request as Partial<NarrativeGenerationRequest>

  if (
    payload.source !== 'github-pr' &&
    payload.source !== 'branch-diff' &&
    payload.source !== 'uncommitted'
  ) {
    return {
      ok: false,
      error: 'request.source must be one of github-pr, branch-diff, or uncommitted',
    }
  }

  if (!isPrData(payload.prData)) {
    return { ok: false, error: 'request.prData must contain title, diff, and files[]' }
  }

  const cacheContextResult = validateCacheContext(payload.source, payload.cacheContext)
  if (!cacheContextResult.ok) {
    return cacheContextResult
  }

  return {
    ok: true,
    data: {
      prData: payload.prData,
      source: payload.source,
      prRef: payload.prRef,
      cacheContext: cacheContextResult.data,
    },
  }
}

export function registerNarrativeHandlers(mainWindow: BrowserWindow): { cleanup: () => void } {
  ipcMain.handle(IPC_CHANNELS.LLM_GENERATE_NARRATIVE, (_event, request: unknown) => {
    const normalized = normalizeNarrativeGenerationRequest(request)
    if (!normalized.ok) {
      narrativeDebugLog('generation rejected: invalid request', {
        error: normalized.error,
        requestType: typeof request,
        requestKeys: typeof request === 'object' && request !== null ? Object.keys(request) : [],
      })
      return {
        ok: false,
        error: `Invalid narrative generation request: ${normalized.error}`,
      } satisfies Result<never>
    }

    const { prData, source, prRef, cacheContext } = normalized.data
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
      title: prData.title,
      fileCount: prData.files.length,
      baseRefName: prData.baseRefName,
      headRefName: prData.headRefName,
      source,
    })

    const controller = new AbortController()
    activeGenerations.set(requestId, controller)

    void (async (): Promise<void> => {
      const onChunk = (chunk: string): void => {
        mainWindow.webContents.send(IPC_CHANNELS.LLM_STREAM_CHUNK, requestId, chunk)
      }

      const result =
        provider === 'cli'
          ? await generateNarrativeCli(
              prData,
              onChunk,
              controller.signal,
              getCliModel() || undefined,
            )
          : await generateNarrative(prData, getApiKey(), onChunk, controller.signal)

      activeGenerations.delete(requestId)

      if (result.wasTruncated) {
        mainWindow.webContents.send(IPC_CHANNELS.LLM_TRUNCATION_WARNING, requestId)
      }

      if (result.ok) {
        if (source && cacheContext) {
          setCachedNarrativeReview({
            source,
            prRef,
            prData,
            review: result.data,
            cacheContext,
            cachedAt: new Date().toISOString(),
          })
        }
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

  ipcMain.handle(IPC_CHANNELS.LLM_GET_CACHED_NARRATIVE_REVIEW, (_event, lookup: unknown) => {
    if (
      typeof lookup !== 'object' ||
      lookup === null ||
      typeof (lookup as { source?: unknown }).source !== 'string'
    ) {
      return { ok: false, error: 'Invalid cache lookup' } satisfies Result<never>
    }

    return {
      ok: true,
      data: getCachedNarrativeReview(lookup as Parameters<typeof getCachedNarrativeReview>[0]),
    }
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
